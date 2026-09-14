import { timingSafeEqual } from "node:crypto";
import { createRequire } from "node:module";
import { updateBrevoContactAttributes } from "./_brevo-client.mjs";
import { sha256 } from "./_assessment-utils.mjs";

const require = createRequire(import.meta.url);
const scoringConfig = require("../../content/assessment-scoring.json");
const heatConfig = scoringConfig.leadIntent;

export const LEAD_HEAT_VERSION = heatConfig.scoringVersion;
export const browserScoreEvents = new Set([
  "result_viewed",
  "pricing_section_viewed",
  "telegram_link_clicked",
]);

export const DIGITAL_SCORE_CAP = Number(heatConfig.digitalScoreCap || 89);
const STATEFUL_SCORE_GROUPS = new Set(["marketing_subscription", "invalid_delivery", "telegram_join"]);

export function scoreRule(eventName) {
  const rule = heatConfig.events?.[eventName];
  return rule ? Object.freeze({ ...rule }) : null;
}

export function leadTier(score) {
  const normalized = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  const tier = heatConfig.temperatureThresholds.find(({ min, max }) => normalized >= min && normalized <= max);
  if (!tier) throw new Error(`No lead tier configured for score ${normalized}`);
  return tier.label;
}

export function engagementTokenMatches(submittedToken, storedHash) {
  const actual = Buffer.from(sha256(submittedToken));
  const expected = Buffer.from(String(storedHash || ""));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function automatedLeadScore(rawScore) {
  return Math.max(0, Math.min(DIGITAL_SCORE_CAP, Math.round(Number(rawScore) || 0)));
}

async function ledgerScore(client, assessmentId, fallbackScore = 0) {
  const result = await client.query(
    `SELECT COALESCE(SUM(score_delta), $2::bigint)::integer AS raw_score
     FROM lead_heat_events
     WHERE assessment_id=$1`,
    [assessmentId, Number(fallbackScore || 0)]
  );
  const rawScore = Number(result.rows[0]?.raw_score ?? fallbackScore ?? 0);
  return { rawScore, leadScore: automatedLeadScore(rawScore) };
}

function stateReplacementAllowed(group, existing, incoming) {
  if (!existing) return true;
  if (existing.event_name === incoming.eventName && Number(existing.score_delta) === incoming.delta) return false;
  if (group === "invalid_delivery") return incoming.delta < Number(existing.score_delta);
  if (group === "telegram_join") {
    if (existing.occurred_at && new Date(incoming.occurredAt).getTime() < new Date(existing.occurred_at).getTime()) return false;
  }
  if (group === "marketing_subscription") {
    if (existing.occurred_at && new Date(incoming.occurredAt).getTime() < new Date(existing.occurred_at).getTime()) return false;
    if (existing.event_name === "email_spam") return false;
  }
  return true;
}

async function auditScoreChange(client, change) {
  await client.query(
    `INSERT INTO lead_heat_change_audit (
       assessment_id, score_group, previous_event_name, event_name,
       previous_group_delta, group_delta, score_delta, previous_score,
       lead_score, source, scoring_version, occurred_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      change.assessmentId,
      change.group,
      change.previousEventName,
      change.eventName,
      change.previousGroupDelta,
      change.groupDelta,
      change.scoreDelta,
      change.previousScore,
      change.leadScore,
      change.source,
      LEAD_HEAT_VERSION,
      change.occurredAt,
    ]
  );
}

export async function applyLeadHeatRule(client, input, fallbackScore = 0) {
  const eventName = String(input?.eventName || "");
  const rule = scoreRule(eventName);
  if (!rule) return { status: "invalid_event" };

  const occurredAt = input.occurredAt || new Date().toISOString();
  const source = String(input.source || "website").slice(0, 80);
  const before = await ledgerScore(client, input.assessmentId, fallbackScore);
  const existingResult = await client.query(
    `SELECT event_name, score_delta, occurred_at
     FROM lead_heat_events
     WHERE assessment_id=$1 AND score_group=$2
     FOR UPDATE`,
    [input.assessmentId, rule.group]
  );
  const existing = existingResult.rows[0] || null;
  let changed = false;

  if (STATEFUL_SCORE_GROUPS.has(rule.group)) {
    if (stateReplacementAllowed(rule.group, existing, { eventName, delta: rule.delta, occurredAt })) {
      await client.query(
        `INSERT INTO lead_heat_events (
           assessment_id, score_group, event_name, score_delta, source,
           scoring_version, downstream_sync_status, occurred_at
         ) VALUES ($1,$2,$3,$4,$5,$6,'pending',$7)
         ON CONFLICT (assessment_id, score_group) DO UPDATE SET
           event_name=EXCLUDED.event_name,
           score_delta=EXCLUDED.score_delta,
           source=EXCLUDED.source,
           scoring_version=EXCLUDED.scoring_version,
           downstream_sync_status='pending',
           safe_error_code=NULL,
           occurred_at=EXCLUDED.occurred_at`,
        [input.assessmentId, rule.group, eventName, rule.delta, source, LEAD_HEAT_VERSION, occurredAt]
      );
      changed = true;
    }
  } else if (!existing) {
    await client.query(
      `INSERT INTO lead_heat_events (
         assessment_id, score_group, event_name, score_delta, source,
         scoring_version, downstream_sync_status, occurred_at
       ) VALUES ($1,$2,$3,$4,$5,$6,'pending',$7)`,
      [input.assessmentId, rule.group, eventName, rule.delta, source, LEAD_HEAT_VERSION, occurredAt]
    );
    changed = true;
  }

  const after = changed ? await ledgerScore(client, input.assessmentId, fallbackScore) : before;
  const scoreDelta = after.leadScore - before.leadScore;
  if (changed) {
    await auditScoreChange(client, {
      assessmentId: input.assessmentId,
      group: rule.group,
      previousEventName: existing?.event_name || null,
      eventName,
      previousGroupDelta: Number(existing?.score_delta || 0),
      groupDelta: rule.delta,
      scoreDelta,
      previousScore: before.leadScore,
      leadScore: after.leadScore,
      source,
      occurredAt,
    });
  }

  return {
    status: changed ? "applied" : "duplicate",
    eventName,
    appliedEventName: changed ? eventName : existing?.event_name || null,
    group: rule.group,
    ruleDelta: rule.delta,
    delta: scoreDelta,
    rawScore: after.rawScore,
    leadScore: after.leadScore,
    leadTier: leadTier(after.leadScore),
    occurredAt,
  };
}

function brevoAttributes(eventName, score, tier, delta, occurredAt) {
  const date = new Date(occurredAt || Date.now()).toISOString().slice(0, 10);
  return {
    LEAD_SCORE: score,
    LEAD_TIER: tier,
    LEAD_SCORE_DATE: date,
    LAST_SCORE_EVENT: eventName,
    LAST_SCORE_DELTA: delta,
    LAST_ENGAGEMENT_DATE: date,
  };
}

export async function recordLeadHeatSyncOutcome(database, assessmentId, group, outcome) {
  try {
    await database.pool.query(
      `UPDATE lead_heat_events
       SET downstream_sync_status=$3, safe_error_code=$4
       WHERE assessment_id=$1 AND score_group=$2`,
      [assessmentId, group, outcome.status, outcome.errorCode]
    );
  } catch {
    return false;
  }
  return true;
}

export async function applyLeadHeatEvent(database, input, options = {}) {
  const eventName = String(input?.eventName || "");
  const rule = scoreRule(eventName);
  if (!rule) return { status: "invalid_event" };

  const client = await database.pool.connect();
  let state;
  try {
    await client.query("BEGIN");
    const runResult = await client.query(
      `SELECT assessment_id, engagement_token_hash, engagement_expires_at,
              initial_lead_score, scoring_version
       FROM assessment_runs
       WHERE assessment_id=$1
       FOR UPDATE`,
      [input.assessmentId]
    );
    const run = runResult.rows[0];
    if (!run) {
      await client.query("ROLLBACK");
      return { status: "not_found" };
    }
    if (!options.trusted) {
      const expired = !run.engagement_expires_at || new Date(run.engagement_expires_at).getTime() <= Date.now();
      if (expired || !engagementTokenMatches(input.engagementToken, run.engagement_token_hash)) {
        await client.query("ROLLBACK");
        return { status: "unauthorized" };
      }
    }

    const contactResult = await client.query(
      "SELECT email FROM assessment_contacts WHERE assessment_id=$1",
      [input.assessmentId]
    );
    const scoreChange = await applyLeadHeatRule(client, input, run.initial_lead_score);
    const appliedDelta = scoreChange.delta;
    const leadScore = scoreChange.leadScore;
    const tier = scoreChange.leadTier;

    if (eventName === "result_viewed") {
      await client.query(
        "UPDATE assessment_runs SET result_viewed_at=COALESCE(result_viewed_at,NOW()), updated_at=NOW() WHERE assessment_id=$1",
        [input.assessmentId]
      );
    }

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
      [input.assessmentId, leadScore, tier, eventName, appliedDelta]
    );
    await client.query("COMMIT");
    state = {
      status: scoreChange.status,
      assessmentId: input.assessmentId,
      eventName,
      group: rule.group,
      delta: appliedDelta,
      leadScore,
      leadTier: tier,
      email: contactResult.rows[0]?.email || null,
      occurredAt: input.occurredAt || new Date().toISOString(),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  if (state.status === "applied" && state.email) {
    const outcome = await updateBrevoContactAttributes(
      state.email,
      brevoAttributes(state.eventName, state.leadScore, state.leadTier, state.delta, state.occurredAt),
      options
    );
    await recordLeadHeatSyncOutcome(database, state.assessmentId, state.group, outcome);
    state.brevoSyncStatus = outcome.status;
  }
  delete state.email;
  return state;
}
