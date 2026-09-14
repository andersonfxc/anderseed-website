const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

let heat;
let sha256;
const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test.before(async () => {
  heat = await import("../netlify/functions/_lead-heat.mjs");
  ({ sha256 } = await import("../netlify/functions/_assessment-utils.mjs"));
});

test("the versioned catalogue contains the approved points and four exact tiers", () => {
  assert.equal(heat.LEAD_HEAT_VERSION, "lead-heat-2026-09-14-v2");
  assert.equal(heat.DIGITAL_SCORE_CAP, 89);
  assert.deepEqual(heat.scoreRule("assessment_completed"), { group: "assessment_completion", delta: 20 });
  assert.deepEqual(heat.scoreRule("result_viewed"), { group: "result_view", delta: 15 });
  assert.deepEqual(heat.scoreRule("pricing_section_viewed"), { group: "pricing_view", delta: 10 });
  assert.deepEqual(heat.scoreRule("telegram_link_clicked"), { group: "telegram_click", delta: 5 });
  assert.deepEqual(heat.scoreRule("telegram_join_confirmed"), { group: "telegram_join", delta: 10 });
  assert.deepEqual(heat.scoreRule("telegram_left"), { group: "telegram_join", delta: 0 });
  assert.deepEqual(heat.scoreRule("email_not_subscribed"), { group: "marketing_subscription", delta: 0 });
  assert.deepEqual(heat.scoreRule("email_subscribed"), { group: "marketing_subscription", delta: 10 });
  assert.deepEqual(heat.scoreRule("email_unsubscribed"), { group: "marketing_subscription", delta: -15 });
  assert.equal(heat.leadTier(0), "Cold");
  assert.equal(heat.leadTier(34), "Cold");
  assert.equal(heat.leadTier(35), "Warm");
  assert.equal(heat.leadTier(69), "Warm");
  assert.equal(heat.leadTier(70), "Hot");
  assert.equal(heat.leadTier(89), "Hot");
  assert.equal(heat.leadTier(90), "Super Hot");
  assert.equal(heat.leadTier(100), "Super Hot");
});

function mockDatabase(token = "engagement-token", initialScore = 45) {
  const state = {
    leadScore: initialScore,
    events: new Map([["baseline", { event_name: "baseline", score_delta: initialScore }]]),
    syncUpdates: [],
    auditUpdates: [],
    changeAudits: [],
  };
  const client = {
    async query(sql, values = []) {
      if (["BEGIN", "COMMIT", "ROLLBACK"].includes(sql)) return { rows: [], rowCount: 0 };
      if (sql.includes("FROM assessment_runs")) return {
        rows: [{
          assessment_id: values[0],
          engagement_token_hash: sha256(token),
          engagement_expires_at: new Date(Date.now() + 60000).toISOString(),
          initial_lead_score: initialScore,
          scoring_version: "2026-09-14-v1",
        }],
        rowCount: 1,
      };
      if (sql.includes("FROM assessment_contacts")) return { rows: [{ email: "owner@example.com" }], rowCount: 1 };
      if (sql.includes("COALESCE(SUM(score_delta)")) {
        const raw_score = [...state.events.values()].reduce((total, event) => total + Number(event.score_delta), 0);
        return { rows: [{ raw_score }], rowCount: 1 };
      }
      if (sql.includes("SELECT event_name, score_delta") && sql.includes("FROM lead_heat_events")) {
        const event = state.events.get(values[1]);
        return { rows: event ? [event] : [], rowCount: event ? 1 : 0 };
      }
      if (sql.includes("INSERT INTO lead_heat_events")) {
        state.events.set(values[1], { event_name: values[2], score_delta: values[3], occurred_at: values[6] });
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes("INSERT INTO lead_heat_change_audit")) {
        state.changeAudits.push(values);
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes("UPDATE assessment_runs SET result_viewed_at")) {
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes("INSERT INTO assessment_brevo_syncs")) {
        state.leadScore = values[1];
        state.syncUpdates.push(values);
        return { rows: [], rowCount: 1 };
      }
      throw new Error("Unexpected query: " + sql);
    },
    release() {},
  };
  return {
    state,
    database: {
      pool: {
        connect: async () => client,
        query: async (sql, values) => {
          state.auditUpdates.push({ sql, values });
          return { rows: [], rowCount: 1 };
        },
      },
    },
  };
}
const identity = {
  assessmentId: "123e4567-e89b-42d3-a456-426614174000",
  engagementToken: "engagement-token",
};

test("behavioural heat is idempotent, cumulative and returns no email address", async () => {
  const { database, state } = mockDatabase();
  const options = { env: {} };
  const first = await heat.applyLeadHeatEvent(database, { ...identity, eventName: "result_viewed" }, options);
  const duplicate = await heat.applyLeadHeatEvent(database, { ...identity, eventName: "result_viewed" }, options);
  const pricing = await heat.applyLeadHeatEvent(database, { ...identity, eventName: "pricing_section_viewed" }, options);

  assert.equal(first.status, "applied");
  assert.equal(first.delta, 15);
  assert.equal(first.leadScore, 60);
  assert.equal(first.leadTier, "Warm");
  assert.equal(duplicate.status, "duplicate");
  assert.equal(duplicate.delta, 0);
  assert.equal(pricing.leadScore, 70);
  assert.equal(pricing.leadTier, "Hot");
  assert.equal(state.events.size, 3);
  assert.equal(state.syncUpdates.length, 3);
  assert.equal(JSON.stringify([first, duplicate, pricing]).includes("owner@example.com"), false);
});


test("automated digital scores are bounded to 0-89", async () => {
  const high = mockDatabase("engagement-token", 95);
  const raised = await heat.applyLeadHeatEvent(high.database, {
    ...identity,
    eventName: "telegram_join_confirmed",
  }, { trusted: true, env: {} });
  assert.equal(raised.leadScore, 89);
  assert.equal(raised.leadTier, "Hot");

  const low = mockDatabase("engagement-token", 5);
  const reduced = await heat.applyLeadHeatEvent(low.database, {
    ...identity,
    eventName: "email_hard_bounce",
  }, { trusted: true, env: {} });
  assert.equal(reduced.leadScore, 0);
  assert.equal(reduced.leadTier, "Cold");
});

test("subscription state moves forward and backward without accumulating points", async () => {
  const { database, state } = mockDatabase("engagement-token", 60);
  const subscribed = await heat.applyLeadHeatEvent(database, {
    ...identity,
    eventName: "email_subscribed",
  }, { trusted: true, env: {} });
  const duplicate = await heat.applyLeadHeatEvent(database, {
    ...identity,
    eventName: "email_subscribed",
  }, { trusted: true, env: {} });
  const unsubscribed = await heat.applyLeadHeatEvent(database, {
    ...identity,
    eventName: "email_unsubscribed",
  }, { trusted: true, env: {} });
  const resubscribed = await heat.applyLeadHeatEvent(database, {
    ...identity,
    eventName: "email_subscribed",
  }, { trusted: true, env: {} });

  assert.equal(subscribed.leadScore, 70);
  assert.equal(subscribed.leadTier, "Hot");
  assert.equal(duplicate.status, "duplicate");
  assert.equal(unsubscribed.delta, -25);
  assert.equal(unsubscribed.leadScore, 45);
  assert.equal(unsubscribed.leadTier, "Warm");
  assert.equal(resubscribed.delta, 25);
  assert.equal(resubscribed.leadScore, 70);
  assert.equal(resubscribed.leadTier, "Hot");
  assert.equal(state.events.get("marketing_subscription").score_delta, 10);
});

test("an older subscription event cannot overwrite a newer consent state", async () => {
  const { database } = mockDatabase("engagement-token", 60);
  const subscribed = await heat.applyLeadHeatEvent(database, {
    ...identity,
    eventName: "email_subscribed",
    occurredAt: "2026-09-14T12:00:00.000Z",
  }, { trusted: true, env: {} });
  const staleUnsubscribe = await heat.applyLeadHeatEvent(database, {
    ...identity,
    eventName: "email_unsubscribed",
    occurredAt: "2026-09-14T11:00:00.000Z",
  }, { trusted: true, env: {} });

  assert.equal(subscribed.leadScore, 70);
  assert.equal(staleUnsubscribe.status, "duplicate");
  assert.equal(staleUnsubscribe.leadScore, 70);
});

test("spam and the strongest delivery failure cannot be weakened automatically", async () => {
  const { database } = mockDatabase("engagement-token", 80);
  const subscribed = await heat.applyLeadHeatEvent(database, {
    ...identity,
    eventName: "email_subscribed",
  }, { trusted: true, env: {} });
  const spam = await heat.applyLeadHeatEvent(database, {
    ...identity,
    eventName: "email_spam",
  }, { trusted: true, env: {} });
  const attemptedRecovery = await heat.applyLeadHeatEvent(database, {
    ...identity,
    eventName: "email_subscribed",
  }, { trusted: true, env: {} });
  const blocked = await heat.applyLeadHeatEvent(database, {
    ...identity,
    eventName: "email_blocked",
  }, { trusted: true, env: {} });
  const invalid = await heat.applyLeadHeatEvent(database, {
    ...identity,
    eventName: "email_invalid",
  }, { trusted: true, env: {} });
  const weakerBlocked = await heat.applyLeadHeatEvent(database, {
    ...identity,
    eventName: "email_blocked",
  }, { trusted: true, env: {} });

  assert.equal(subscribed.leadScore, 89);
  assert.equal(spam.leadScore, 50);
  assert.equal(attemptedRecovery.status, "duplicate");
  assert.equal(attemptedRecovery.leadScore, 50);
  assert.equal(blocked.leadScore, 40);
  assert.equal(invalid.leadScore, 30);
  assert.equal(weakerBlocked.status, "duplicate");
  assert.equal(weakerBlocked.leadScore, 30);
});

test("invalid engagement credentials cannot change a score", async () => {
  const { database, state } = mockDatabase();
  const result = await heat.applyLeadHeatEvent(database, {
    ...identity,
    engagementToken: "wrong-token",
    eventName: "result_viewed",
  });
  assert.equal(result.status, "unauthorized");
  assert.equal(state.events.size, 1);
  assert.equal(state.syncUpdates.length, 0);
});

test("browser scoring accepts named events only and does not accept a client delta", () => {
  const endpoint = read("netlify/functions/lead-activity.mjs");
  assert.match(endpoint, /browserScoreEvents\.has/);
  assert.doesNotMatch(endpoint, /body\.delta|body\.score|body\.email/);
  assert.match(endpoint, /activity_unauthorized/);
});

test("generated-page activity tracking requires a real pricing view and never stores PII", () => {
  const client = read("assets/lead-activity.js");
  assert.match(client, /intersectionRatio >= 0\.5/);
  assert.match(client, /2000/);
  assert.match(client, /data-analytics-consent/);
  assert.match(client, /telegram_link_clicked/);
  assert.doesNotMatch(client, /firstName|emailAddress|marketingOptIn/);
});

test("the migration adds token hashing, score audit metadata and Telegram invite attribution", () => {
  const migration = read("netlify/database/migrations/20260914120000_create_lead_heat_audit.sql");
  assert.match(migration, /engagement_token_hash TEXT/);
  assert.match(migration, /scoring_version TEXT/);
  assert.match(migration, /lead_heat_change_audit/);
  assert.match(migration, /previous_score SMALLINT/);
  assert.match(migration, /lead_score SMALLINT/);
  assert.match(migration, /telegram_lead_invites/);
  assert.doesNotMatch(migration, /telegram_user|username|first_name|email TEXT/);
  const membershipMigration = read("netlify/database/migrations/20260914150000_track_telegram_membership.sql");
  assert.match(membershipMigration, /member_hash TEXT/);
  assert.match(membershipMigration, /membership_status TEXT/);
  assert.doesNotMatch(membershipMigration, /telegram_user|username|first_name|email TEXT/);
});


test("Telegram membership points are removed on leave and restored on rejoin", async () => {
  const { database, state } = mockDatabase("engagement-token", 60);
  const joined = await heat.applyLeadHeatEvent(database, {
    ...identity,
    eventName: "telegram_join_confirmed",
    occurredAt: "2026-09-14T12:00:00.000Z",
  }, { trusted: true, env: {} });
  const left = await heat.applyLeadHeatEvent(database, {
    ...identity,
    eventName: "telegram_left",
    occurredAt: "2026-09-14T13:00:00.000Z",
  }, { trusted: true, env: {} });
  const duplicateLeave = await heat.applyLeadHeatEvent(database, {
    ...identity,
    eventName: "telegram_left",
    occurredAt: "2026-09-14T13:01:00.000Z",
  }, { trusted: true, env: {} });
  const rejoined = await heat.applyLeadHeatEvent(database, {
    ...identity,
    eventName: "telegram_join_confirmed",
    occurredAt: "2026-09-14T14:00:00.000Z",
  }, { trusted: true, env: {} });

  assert.equal(joined.leadScore, 70);
  assert.equal(left.delta, -10);
  assert.equal(left.leadScore, 60);
  assert.equal(duplicateLeave.status, "duplicate");
  assert.equal(duplicateLeave.leadScore, 60);
  assert.equal(rejoined.delta, 10);
  assert.equal(rejoined.leadScore, 70);
  assert.equal(state.events.get("telegram_join").score_delta, 10);
});
