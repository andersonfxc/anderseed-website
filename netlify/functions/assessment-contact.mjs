import { randomBytes, timingSafeEqual } from "node:crypto";
import { validateEmailDeliverability } from "./_email-validation.mjs";
import {
  recordAssessmentBrevoSync,
  syncAssessmentContactWithBrevo,
} from "./_brevo-client.mjs";
import { applyLeadHeatRule, recordLeadHeatSyncOutcome } from "./_lead-heat.mjs";
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
    const requestedMarketingOptIn = Boolean(body.marketingOptIn);
    if (consentVersion !== siteSettings.assessment.marketingConsentTextVersion) {
      return errorResponse("This form version is no longer current. Please refresh and try again.", 409);
    }

    const emailValidation = await validateEmailDeliverability(email);
    if (!emailValidation.valid) {
      return errorResponse(emailValidation.message, 422, emailValidation.code);
    }

    const engagementToken = randomBytes(32).toString("base64url");
    const engagementTokenHash = sha256(engagementToken);
    const db = database();
    const client = await db.pool.connect();
    let result;
    let transitionTimeline;
    let completedAt;
    let leadScore;
    let leadTier;
    let lastScoreEvent;
    let lastScoreDelta;
    let effectiveMarketingOptIn;
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        "SELECT completion_token_hash, result_json, contact_submitted_at, expires_at, transition_timeline, completed_at, initial_lead_score FROM assessment_runs WHERE assessment_id = $1 FOR UPDATE",
        [body.assessmentId]
      );
      const run = rows[0];
      if (!run || new Date(run.expires_at).getTime() <= Date.now() || !tokenMatches(body.completionToken, run.completion_token_hash)) {
        await client.query("ROLLBACK");
        return errorResponse("Your result link has expired. Please return to the assessment and try again.", 410);
      }
      result = run.result_json;
      transitionTimeline = run.transition_timeline;
      completedAt = run.completed_at;
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
      const previousConsent = await client.query(
        "SELECT opted_in FROM assessment_marketing_consents WHERE assessment_id=$1 FOR UPDATE",
        [body.assessmentId]
      );
      const wasOptedIn = previousConsent.rows[0]?.opted_in === true;
      const subscriptionEvent = requestedMarketingOptIn
        ? "email_subscribed"
        : wasOptedIn
          ? "email_unsubscribed"
          : "email_not_subscribed";
      const scoreChange = await applyLeadHeatRule(client, {
        assessmentId: body.assessmentId,
        eventName: subscriptionEvent,
        source: "assessment_contact",
      }, run.initial_lead_score);
      effectiveMarketingOptIn = scoreChange.appliedEventName === "email_subscribed";

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
             opted_in_at=CASE
               WHEN EXCLUDED.opted_in THEN COALESCE(assessment_marketing_consents.opted_in_at,NOW())
               ELSE assessment_marketing_consents.opted_in_at
             END,
             withdrawn_at=CASE
               WHEN EXCLUDED.opted_in THEN NULL
               WHEN assessment_marketing_consents.opted_in THEN COALESCE(assessment_marketing_consents.withdrawn_at,NOW())
               ELSE assessment_marketing_consents.withdrawn_at
             END
           RETURNING assessment_id
         )
         UPDATE assessment_runs SET
           contact_submitted_at=NOW(),engagement_token_hash=$7,engagement_expires_at=NOW() + INTERVAL '365 days',expires_at=NOW() + INTERVAL '365 days',updated_at=NOW()
         WHERE assessment_id=$1`,
        [body.assessmentId, firstName, email, emailHash, effectiveMarketingOptIn, consentVersion, engagementTokenHash]
      );
      leadScore = scoreChange.leadScore;
      leadTier = scoreChange.leadTier;
      lastScoreEvent = scoreChange.delta !== 0 ? subscriptionEvent : "assessment_completed";
      lastScoreDelta = scoreChange.delta !== 0 ? scoreChange.delta : Number(run.initial_lead_score || 0);
      await client.query(
        `INSERT INTO assessment_brevo_syncs (
           assessment_id, contact_status, roadmap_status, lead_score, lead_tier,
           last_score_event, last_score_delta, updated_at
         ) VALUES ($1,'pending','pending',$2,$3,$4,$5,NOW())
         ON CONFLICT (assessment_id) DO UPDATE SET
           lead_score=$2,
           lead_tier=$3,
           last_score_event=CASE WHEN $5 <> 0 THEN $4 ELSE assessment_brevo_syncs.last_score_event END,
           last_score_delta=$5,
           updated_at=NOW()`,
        [body.assessmentId, leadScore, leadTier, lastScoreEvent, lastScoreDelta]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    const brevoOutcome = await syncAssessmentContactWithBrevo({
      assessmentId: body.assessmentId,
      email,
      firstName,
      marketingOptIn: effectiveMarketingOptIn,
      consentVersion,
      result,
      transitionTimeline,
      completedAt,
      leadScore,
      leadTier,
      lastScoreEvent,
      lastScoreDelta,
    });
    await recordAssessmentBrevoSync(db, body.assessmentId, brevoOutcome);
    await recordLeadHeatSyncOutcome(db, body.assessmentId, "marketing_subscription", {
      status: brevoOutcome.contactStatus,
      errorCode: brevoOutcome.errorCode,
    });

    return jsonResponse({
      ok: true,
      assessmentId: body.assessmentId,
      engagementToken,
      persisted: true,
      result: publicResult(result),
      roadmapDelivery: brevoOutcome.roadmapStatus,
    }, 201);
  } catch {
    return errorResponse("We could not securely save your details. Your answers are still here—please try again.", 500);
  }
};

export const config = {
  path: "/api/v1/assessment/contact",
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
