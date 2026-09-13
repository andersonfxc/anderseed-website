import { createHash, timingSafeEqual } from "node:crypto";
import { normalizeEmail } from "./_email-validation.mjs";
import { updateBrevoContactAttributes } from "./_brevo-client.mjs";
import { getBrevoConfig } from "./_brevo-config.mjs";

const EVENT_ALIASES = new Map([
  ["request", "sent"],
  ["sent", "sent"],
  ["delivered", "delivered"],
  ["deferred", "deferred"],
  ["softbounce", "soft_bounce"],
  ["hardbounce", "hard_bounce"],
  ["blocked", "blocked"],
  ["invalid", "invalid"],
  ["invalidemail", "invalid"],
  ["error", "error"],
  ["spam", "spam"],
  ["click", "click"],
  ["clicked", "click"],
  ["opened", "opened"],
  ["uniqueopened", "opened"],
  ["firstopening", "opened"],
  ["proxyopen", "opened"],
  ["uniqueproxyopen", "opened"],
  ["unsubscribed", "unsubscribed"],
]);

const PERMANENT_FAILURES = new Set(["hard_bounce", "invalid", "blocked", "spam"]);
const DELAYED_EVENTS = new Set(["soft_bounce", "deferred", "error"]);
const DELIVERED_EVENTS = new Set(["delivered", "opened", "click"]);

const SCORE_RULES = Object.freeze({
  click: { group: "roadmap_click", delta: 2 },
  hard_bounce: { group: "invalid_delivery", delta: -20 },
  invalid: { group: "invalid_delivery", delta: -20 },
  blocked: { group: "invalid_delivery", delta: -10 },
  spam: { group: "email_suppression", delta: -30 },
  unsubscribed: { group: "email_suppression", delta: -15 },
});

function clean(value, maxLength = 255) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function canonicalMessageId(value) {
  return clean(value).replace(/^<|>$/g, "").toLowerCase();
}

function eventTimestamp(payload) {
  const seconds = Number(payload.ts_event || payload.ts || 0);
  const epoch = Number(payload.ts_epoch || 0);
  const candidate = epoch > 1e12
    ? new Date(epoch)
    : seconds > 0
      ? new Date(seconds * 1000)
      : new Date(payload.date || Date.now());
  return Number.isNaN(candidate.getTime()) ? new Date().toISOString() : candidate.toISOString();
}

function eventKey(event) {
  return createHash("sha256")
    .update([
      event.name,
      event.messageId,
      event.timestamp,
      clean(event.sourceId, 80),
      clean(event.link, 500),
    ].join("|"))
    .digest("hex");
}

export function normalizeBrevoWebhookEvent(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const alias = clean(payload.event, 80).toLowerCase().replace(/[^a-z]/g, "");
  const name = EVENT_ALIASES.get(alias);
  const messageId = canonicalMessageId(payload["message-id"] || payload.messageId);
  const email = normalizeEmail(payload.email);
  if (!name || !messageId || !email) return null;

  const event = {
    name,
    messageId,
    email,
    timestamp: eventTimestamp(payload),
    sourceId: payload.id,
    link: payload.link || payload.url || "",
  };
  return Object.freeze({ ...event, key: eventKey(event) });
}

export function authenticateBrevoWebhook(request, config = getBrevoConfig()) {
  if (!config.webhookEnabled || !config.webhookSecret) return false;
  const submitted = clean(request.headers.get("authorization"), 1000);
  const expected = `Bearer ${config.webhookSecret}`;
  const actualBuffer = Buffer.from(submitted);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer);
}

export function leadTier(score) {
  if (score >= 90) return "Super Hot";
  if (score >= 70) return "Hot";
  if (score >= 35) return "Warm";
  return "Cold";
}

export function nextDeliveryState(previous, eventName) {
  const currentRoadmap = clean(previous.roadmap_status, 50).toLowerCase();
  const currentEmail = clean(previous.email_status, 50).toLowerCase();

  if (DELIVERED_EVENTS.has(eventName)) {
    return {
      roadmapStatus: "delivered",
      emailStatus: eventName === "click" ? "clicked" : eventName === "opened" ? "opened" : "delivered",
      retryEligible: false,
      delivered: true,
      failed: false,
    };
  }
  if (PERMANENT_FAILURES.has(eventName)) {
    return {
      roadmapStatus: "failed",
      emailStatus: eventName,
      retryEligible: false,
      delivered: false,
      failed: true,
    };
  }
  if (eventName === "unsubscribed") {
    return {
      roadmapStatus: currentRoadmap || "sent",
      emailStatus: "unsubscribed",
      retryEligible: false,
      delivered: currentRoadmap === "delivered",
      failed: false,
    };
  }
  if (DELAYED_EVENTS.has(eventName)) {
    if (["delivered", "failed"].includes(currentRoadmap)) {
      return {
        roadmapStatus: currentRoadmap,
        emailStatus: currentEmail,
        retryEligible: false,
        delivered: currentRoadmap === "delivered",
        failed: currentRoadmap === "failed",
      };
    }
    return {
      roadmapStatus: "delayed",
      emailStatus: "delayed",
      retryEligible: true,
      delivered: false,
      failed: false,
    };
  }
  return {
    roadmapStatus: ["delivered", "failed"].includes(currentRoadmap) ? currentRoadmap : "sent",
    emailStatus: ["delivered", "opened", "clicked", "hard_bounce", "invalid", "blocked", "spam"].includes(currentEmail)
      ? currentEmail
      : "sent",
    retryEligible: false,
    delivered: currentRoadmap === "delivered",
    failed: currentRoadmap === "failed",
  };
}

export function buildBrevoDeliveryAttributes(eventName, state) {
  const date = state.eventTimestamp.slice(0, 10);
  const attributes = {
    ROADMAP_DELIVERY_STATUS: state.roadmapStatus[0].toUpperCase() + state.roadmapStatus.slice(1),
    EMAIL_DELIVERY_STATUS: state.emailStatus.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase()),
    LAST_ENGAGEMENT_DATE: date,
  };
  if (state.delivered) attributes.ROADMAP_SENT_DATE = date;
  if (["hard_bounce", "invalid", "blocked"].includes(eventName)) {
    attributes.EMAIL_VALIDATION_STATUS = eventName === "blocked" ? "Blocked" : "Invalid";
    attributes.NURTURE_STATUS = "Suppressed";
  }
  if (["spam", "unsubscribed"].includes(eventName)) {
    attributes.MARKETING_CONSENT = false;
    attributes.NURTURE_STATUS = "Suppressed";
  }
  if (state.scoreDelta !== 0) {
    attributes.LEAD_SCORE = state.leadScore;
    attributes.LEAD_TIER = state.leadTier;
    attributes.LEAD_SCORE_DATE = date;
    attributes.LAST_SCORE_EVENT = eventName;
    attributes.LAST_SCORE_DELTA = state.scoreDelta;
  }
  return attributes;
}

async function markContactSync(database, key, outcome) {
  try {
    await database.pool.query(
      "UPDATE brevo_webhook_events SET contact_sync_status=$2, safe_error_code=$3, processed_at=NOW() WHERE event_key=$1",
      [key, outcome.status, outcome.errorCode]
    );
  } catch {
    return false;
  }
  return true;
}

export async function processBrevoWebhookEvent(database, payload, options = {}) {
  const event = normalizeBrevoWebhookEvent(payload);
  if (!event) return { status: "invalid" };

  const client = await database.pool.connect();
  let state;
  try {
    await client.query("BEGIN");
    const match = await client.query(
      `SELECT sync.assessment_id, sync.roadmap_status, sync.email_status,
              sync.last_event_at, COALESCE(sync.lead_score, runs.initial_lead_score) AS lead_score
       FROM assessment_brevo_syncs AS sync
       JOIN assessment_runs AS runs ON runs.assessment_id = sync.assessment_id
       WHERE LOWER(TRIM(BOTH '<>' FROM sync.brevo_message_id)) = $1
       LIMIT 1
       FOR UPDATE OF sync`,
      [event.messageId]
    );
    const current = match.rows[0];

    const inserted = await client.query(
      `INSERT INTO brevo_webhook_events (
         event_key, assessment_id, event_name, brevo_message_id, event_timestamp,
         processing_status, contact_sync_status
       ) VALUES ($1,$2,$3,$4,$5,$6,'pending')
       ON CONFLICT (event_key) DO NOTHING
       RETURNING event_key`,
      [
        event.key,
        current?.assessment_id || null,
        event.name,
        event.messageId,
        event.timestamp,
        current ? "received" : "unmatched",
      ]
    );
    if (inserted.rowCount !== 1) {
      await client.query("COMMIT");
      return { status: "duplicate", eventName: event.name };
    }
    if (!current) {
      await client.query("COMMIT");
      return { status: "unmatched", eventName: event.name };
    }

    let scoreDelta = 0;
    const scoreRule = SCORE_RULES[event.name];
    if (scoreRule) {
      const scored = await client.query(
        `INSERT INTO brevo_lead_score_events (assessment_id, score_group, event_name, score_delta)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (assessment_id, score_group) DO NOTHING
         RETURNING score_delta`,
        [current.assessment_id, scoreRule.group, event.name, scoreRule.delta]
      );
      scoreDelta = Number(scored.rows[0]?.score_delta || 0);
    }

    const leadScore = Math.max(0, Math.min(100, Number(current.lead_score || 0) + scoreDelta));
    const staleEvent = current.last_event_at &&
      new Date(event.timestamp).getTime() < new Date(current.last_event_at).getTime();
    const delivery = staleEvent
      ? {
          roadmapStatus: current.roadmap_status,
          emailStatus: current.email_status,
          retryEligible: false,
          delivered: current.roadmap_status === "delivered",
          failed: current.roadmap_status === "failed",
        }
      : nextDeliveryState(current, event.name);
    state = {
      ...delivery,
      eventTimestamp: event.timestamp,
      leadScore,
      leadTier: leadTier(leadScore),
      scoreDelta,
    };

    await client.query(
      `UPDATE assessment_brevo_syncs SET
         roadmap_status=$2,
         email_status=$3,
         last_event=$4,
         last_event_at=$5,
         delivered_at=CASE WHEN $6 THEN COALESCE(delivered_at,$5) ELSE delivered_at END,
         failed_at=CASE WHEN $7 THEN $5 ELSE failed_at END,
         retry_eligible=$8,
         lead_score=$9,
         lead_tier=$10,
         last_score_event=CASE WHEN $11 <> 0 THEN $4 ELSE last_score_event END,
         last_score_delta=$11,
         updated_at=NOW()
       WHERE assessment_id=$1`,
      [
        current.assessment_id,
        state.roadmapStatus,
        state.emailStatus,
        event.name,
        event.timestamp,
        state.delivered,
        state.failed,
        state.retryEligible,
        state.leadScore,
        state.leadTier,
        state.scoreDelta,
      ]
    );
    await client.query(
      "UPDATE brevo_webhook_events SET processing_status='processed', score_delta=$2, processed_at=NOW() WHERE event_key=$1",
      [event.key, state.scoreDelta]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const attributes = buildBrevoDeliveryAttributes(event.name, state);
  const contactOutcome = await updateBrevoContactAttributes(event.email, attributes, options);
  await markContactSync(database, event.key, contactOutcome);

  return {
    status: contactOutcome.status === "failed" ? "processed_with_contact_sync_failure" : "processed",
    eventName: event.name,
    scoreDelta: state.scoreDelta,
  };
}

export async function processBrevoWebhookBatch(database, payloads, options = {}) {
  const results = [];
  for (const payload of payloads) {
    results.push(await processBrevoWebhookEvent(database, payload, options));
  }
  return results;
}
