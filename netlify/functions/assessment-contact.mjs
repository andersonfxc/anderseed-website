import { timingSafeEqual } from "node:crypto";
import { validateEmailDeliverability } from "./_email-validation.mjs";
import {
  database,
  enforceSameOrigin,
  errorResponse,
  jsonResponse,
  normalizeEmail,
  normalizeName,
  publicResult,
  readJsonBody,
  sha256,
  siteSettings,
  validUuid,
} from "./_assessment-utils.mjs";

function tokenMatches(submittedToken, storedHash) {
  const actual = Buffer.from(sha256(submittedToken));
  const expected = Buffer.from(String(storedHash || ""));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export default async (request) => {
  if (request.method !== "POST") return errorResponse("Method not allowed", 405);
  if (!enforceSameOrigin(request)) return errorResponse("Cross-origin submissions are not accepted", 403);

  try {
    const body = await readJsonBody(request, 16384);
    const firstName = normalizeName(body.firstName);
    const email = normalizeEmail(body.email);
    const consentVersion = String(body.marketingConsentTextVersion || "").slice(0, 100);
    if (!validUuid(body.assessmentId) || !String(body.completionToken || "")) return errorResponse("Your completed assessment could not be verified.");
    if (firstName.length < 1) return errorResponse("Please enter your first name.");
    if (!email) return errorResponse("Please enter a complete, valid email address.", 400, "email_invalid");
    if (typeof body.marketingOptIn !== "boolean") return errorResponse("Please record your marketing preference.");
    if (consentVersion !== siteSettings.assessment.marketingConsentTextVersion) {
      return errorResponse("This form version is no longer current. Please refresh and try again.", 409);
    }

    const emailValidation = await validateEmailDeliverability(email);
    if (!emailValidation.valid) {
      return errorResponse(emailValidation.message, 422, emailValidation.code);
    }

    const db = database();
    const client = await db.pool.connect();
    let result;
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        "SELECT completion_token_hash, result_json, contact_submitted_at, expires_at FROM assessment_runs WHERE assessment_id = $1 FOR UPDATE",
        [body.assessmentId]
      );
      const run = rows[0];
      if (!run || new Date(run.expires_at).getTime() <= Date.now() || !tokenMatches(body.completionToken, run.completion_token_hash)) {
        await client.query("ROLLBACK");
        return errorResponse("Your result link has expired. Please return to the assessment and try again.", 410);
      }
      result = run.result_json;
      const emailHash = sha256(email);
      const claim = await client.query(
        `INSERT INTO assessment_email_claims (email_hash, assessment_id, claimed_at)
         VALUES ($1,$2,NOW())
         ON CONFLICT DO NOTHING
         RETURNING assessment_id`,
        [emailHash, body.assessmentId]
      );
      if (claim.rowCount !== 1) {
        const existingClaim = await client.query(
          "SELECT assessment_id, email_hash FROM assessment_email_claims WHERE email_hash = $1 OR assessment_id = $2",
          [emailHash, body.assessmentId]
        );
        const isSameClaim = existingClaim.rows.some(
          (row) => row.assessment_id === body.assessmentId && row.email_hash === emailHash
        );
        if (!isSameClaim) {
          await client.query("ROLLBACK");
          return errorResponse(
            "This email has already been used for the BA Readiness Assessment. Please use your original result and roadmap, or contact Anderseed if you need help.",
            409,
            "assessment_email_already_used"
          );
        }
      }
      await client.query(
        `WITH contact_upsert AS (
           INSERT INTO assessment_contacts (assessment_id, first_name, email, email_hash, created_at, updated_at)
           VALUES ($1,$2,$3,$4,NOW(),NOW())
           ON CONFLICT (assessment_id) DO UPDATE SET
             first_name=EXCLUDED.first_name,email=EXCLUDED.email,email_hash=EXCLUDED.email_hash,updated_at=NOW()
           RETURNING assessment_id
         ), consent_upsert AS (
           INSERT INTO assessment_marketing_consents (assessment_id, opted_in, consent_text_version, decision_captured_at, opted_in_at)
           VALUES ($1,$5,$6,NOW(),CASE WHEN $5 THEN NOW() ELSE NULL END)
           ON CONFLICT (assessment_id) DO UPDATE SET
             opted_in=EXCLUDED.opted_in,
             consent_text_version=EXCLUDED.consent_text_version,
             decision_captured_at=NOW(),
             opted_in_at=CASE WHEN EXCLUDED.opted_in THEN COALESCE(assessment_marketing_consents.opted_in_at,NOW()) ELSE NULL END
           RETURNING assessment_id
         )
         UPDATE assessment_runs SET
           contact_submitted_at=NOW(),result_viewed_at=NOW(),expires_at=NOW() + INTERVAL '365 days',updated_at=NOW()
         WHERE assessment_id=$1`,
        [body.assessmentId, firstName, email, emailHash, Boolean(body.marketingOptIn), consentVersion]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return jsonResponse({ ok: true, assessmentId: body.assessmentId, persisted: true, result: publicResult(result) }, 201);
  } catch {
    return errorResponse("We could not securely save your details. Your answers are still here—please try again.", 500);
  }
};

export const config = {
  path: "/api/v1/assessment/contact",
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
