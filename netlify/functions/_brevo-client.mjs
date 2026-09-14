import {
  brevoContactAllowed,
  brevoRecipientAllowed,
  getBrevoConfig,
} from "./_brevo-config.mjs";

const BREVO_API_BASE = "https://api.brevo.com/v3";
const REQUEST_TIMEOUT_MS = 4000;

function cleanText(value, maxLength = 200) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function dateOnly(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function configuredListIds(config) {
  return [
    config.listIds.allLeads,
    config.listIds.roadmap,
    config.listIds.assessment,
  ].filter(Boolean);
}

export function buildAssessmentContactPayload({
  config,
  email,
  firstName,
  marketingOptIn,
  consentVersion,
  result,
  transitionTimeline,
  completedAt,
  leadScore,
  leadTier,
  lastScoreEvent,
  lastScoreDelta,
}) {
  const assessmentDate = dateOnly(completedAt);
  const now = dateOnly();
  const attributes = {
    FIRSTNAME: cleanText(firstName, 80),
    LEAD_SOURCE: "Anderseed BA Readiness Assessment",
    ACQUISITION_DETAIL: "Assessment result and free roadmap",
    MARKETING_CONSENT: Boolean(marketingOptIn),
    EMAIL_VALIDATION_STATUS: "Validated",
    ASSESSMENT_VERSION: cleanText(result?.schemaVersion, 100),
    SCORING_VERSION: cleanText(result?.scoringVersion, 100),
    READINESS_STAGE: cleanText(result?.readinessStage, 100),
    READINESS_SCORE: Number(result?.readinessScore || 0),
    STRONGEST_AREA: cleanText(result?.strongestArea?.label || result?.strongestArea?.key),
    PRIMARY_GROWTH_AREA: cleanText(result?.primaryGrowthArea || result?.primaryGrowthAreaKey),
    START_TIMELINE: cleanText(transitionTimeline, 100),
    LEAD_SCORE: Number(leadScore ?? result?.initialLeadScore ?? 0),
    LEAD_TIER: cleanText(leadTier || result?.leadTemperature, 50),
    LEAD_SCORE_DATE: now,
    LAST_SCORE_EVENT: cleanText(lastScoreEvent || "assessment_completed", 100),
    LAST_SCORE_DELTA: Number(lastScoreDelta ?? result?.initialLeadScore ?? 0),
    NURTURE_STATUS: marketingOptIn ? "Eligible" : "Service only",
    LAST_ENGAGEMENT_DATE: now,
    ROADMAP_DELIVERY_STATUS: "Requested",
    EMAIL_DELIVERY_STATUS: "Pending",
  };

  if (assessmentDate) attributes.ASSESSMENT_DATE = assessmentDate;
  if (marketingOptIn && now) attributes.CONSENT_DATE = now;

  return {
    email: cleanText(email, 254).toLowerCase(),
    attributes,
    listIds: configuredListIds(config),
    updateEnabled: true,
  };
}

export function buildRoadmapEmailPayload({
  config,
  assessmentId,
  email,
  firstName,
}) {
  return {
    sender: {
      name: config.senderName,
      email: config.senderEmail,
    },
    to: [{
      email: cleanText(email, 254).toLowerCase(),
      name: cleanText(firstName, 80),
    }],
    templateId: Number(config.roadmapTemplateId),
    params: {
      roadmap_url: config.roadmapUrl,
    },
    headers: {
      "Idempotency-Key": `assessment-roadmap-${assessmentId}`,
    },
    tags: ["ba-roadmap", config.environment],
  };
}

class BrevoRequestError extends Error {
  constructor(code, status = null) {
    super(code);
    this.name = "BrevoRequestError";
    this.code = code;
    this.status = status;
  }
}

async function brevoRequest(path, body, config, fetchImpl, method = "POST") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(`${BREVO_API_BASE}${path}`, {
      method,
      headers: {
        accept: "application/json",
        "api-key": config.apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new BrevoRequestError(`brevo_http_${response.status}`, response.status);
    }
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  } catch (error) {
    if (error instanceof BrevoRequestError) throw error;
    if (error?.name === "AbortError") throw new BrevoRequestError("brevo_timeout");
    throw new BrevoRequestError("brevo_unavailable");
  } finally {
    clearTimeout(timeout);
  }
}

export async function updateBrevoContactAttributes(email, attributes, options = {}) {
  const config = options.config || getBrevoConfig(options.env);
  const fetchImpl = options.fetchImpl || fetch;
  if (!config.integrationEnabled || !config.apiConfigured) {
    return { status: "skipped", errorCode: "integration_disabled" };
  }
  if (!brevoContactAllowed(config, email)) {
    return { status: "skipped", errorCode: "recipient_not_allowlisted" };
  }

  try {
    await brevoRequest(
      "/contacts/" + encodeURIComponent(cleanText(email, 254).toLowerCase()),
      { attributes },
      config,
      fetchImpl,
      "PUT"
    );
    return { status: "updated", errorCode: null };
  } catch (error) {
    return {
      status: "failed",
      errorCode: error.code || "brevo_contact_update_failed",
    };
  }
}

export async function syncAssessmentContactWithBrevo(input, options = {}) {
  const config = options.config || getBrevoConfig(options.env);
  const fetchImpl = options.fetchImpl || fetch;
  const outcome = {
    contactStatus: "skipped",
    roadmapStatus: "skipped",
    errorCode: null,
    messageId: null,
  };

  if (!brevoContactAllowed(config, input.email)) {
    outcome.errorCode = config.contactSyncEnabled
      ? "recipient_not_allowlisted"
      : "integration_disabled";
    return outcome;
  }

  try {
    const contactPayload = buildAssessmentContactPayload({ ...input, config });
    await brevoRequest("/contacts", contactPayload, config, fetchImpl);
    outcome.contactStatus = "synced";
  } catch (error) {
    outcome.contactStatus = "failed";
    outcome.roadmapStatus = "deferred";
    outcome.errorCode = error.code || "brevo_contact_sync_failed";
    return outcome;
  }

  if (!config.roadmapDeliveryEnabled) {
    outcome.roadmapStatus = "deferred";
    outcome.errorCode = "roadmap_delivery_disabled";
    return outcome;
  }
  if (!brevoRecipientAllowed(config, input.email)) {
    outcome.roadmapStatus = "deferred";
    outcome.errorCode = "recipient_not_allowlisted";
    return outcome;
  }

  try {
    const emailPayload = buildRoadmapEmailPayload({ ...input, config });
    const emailResult = await brevoRequest("/smtp/email", emailPayload, config, fetchImpl);
    outcome.roadmapStatus = "sent";
    outcome.messageId = cleanText(emailResult.messageId, 255) || null;
    return outcome;
  } catch (error) {
    outcome.roadmapStatus = "failed";
    outcome.errorCode = error.code || "brevo_roadmap_send_failed";
    return outcome;
  }
}

export async function recordAssessmentBrevoSync(database, assessmentId, outcome) {
  try {
    await database.pool.query(
      `INSERT INTO assessment_brevo_syncs (
         assessment_id, contact_status, roadmap_status, attempts, last_error_code,
         brevo_message_id, last_attempt_at, synced_at, updated_at, lead_score, lead_tier
       ) VALUES (
         $1,$2,$3,1,$4,$5,NOW(),
         CASE WHEN $2 = 'synced' AND $3 = 'sent' THEN NOW() ELSE NULL END,
         NOW(),
         (SELECT initial_lead_score FROM assessment_runs WHERE assessment_id=$1),
         (SELECT lead_temperature FROM assessment_runs WHERE assessment_id=$1)
       )
       ON CONFLICT (assessment_id) DO UPDATE SET
         contact_status=EXCLUDED.contact_status,
         roadmap_status=EXCLUDED.roadmap_status,
         attempts=assessment_brevo_syncs.attempts + 1,
         last_error_code=EXCLUDED.last_error_code,
         brevo_message_id=COALESCE(EXCLUDED.brevo_message_id, assessment_brevo_syncs.brevo_message_id),
         lead_score=COALESCE(assessment_brevo_syncs.lead_score, EXCLUDED.lead_score),
         lead_tier=COALESCE(assessment_brevo_syncs.lead_tier, EXCLUDED.lead_tier),
         last_attempt_at=NOW(),
         synced_at=CASE
           WHEN EXCLUDED.contact_status = 'synced' AND EXCLUDED.roadmap_status = 'sent'
           THEN COALESCE(assessment_brevo_syncs.synced_at, NOW())
           ELSE assessment_brevo_syncs.synced_at
         END,
         updated_at=NOW()`,
      [
        assessmentId,
        outcome.contactStatus,
        outcome.roadmapStatus,
        outcome.errorCode,
        outcome.messageId,
      ]
    );
    return true;
  } catch {
    return false;
  }
}
