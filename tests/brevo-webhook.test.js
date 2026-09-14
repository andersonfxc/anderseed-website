const test = require("node:test");
const assert = require("node:assert/strict");

let webhook;
let brevo;
let getBrevoConfig;

test.before(async () => {
  webhook = await import("../netlify/functions/_brevo-webhook.mjs");
  brevo = await import("../netlify/functions/_brevo-client.mjs");
  ({ getBrevoConfig } = await import("../netlify/functions/_brevo-config.mjs"));
});

const environment = {
  BREVO_INTEGRATION_ENABLED: "true",
  BREVO_ENVIRONMENT: "development",
  BREVO_API_KEY: "private-test-key",
  BREVO_SENDER_EMAIL: "sender@example.com",
  BREVO_TEST_RECIPIENTS: "owner@example.com",
  BREVO_WEBHOOK_ENABLED: "true",
  BREVO_WEBHOOK_SECRET: "a-dedicated-webhook-secret",
};

function payload(event = "delivered") {
  return {
    event,
    email: "owner@example.com",
    id: 26224,
    "message-id": "<MESSAGE-123>",
    ts_event: 1789231200,
    tags: ["ba-roadmap", "development"],
  };
}

test("webhook authentication requires the exact dedicated bearer secret", () => {
  const config = getBrevoConfig(environment);
  const accepted = new Request("https://example.com/api/v1/brevo/webhook", {
    headers: { authorization: "Bearer a-dedicated-webhook-secret" },
  });
  const rejected = new Request("https://example.com/api/v1/brevo/webhook", {
    headers: { authorization: "Bearer incorrect" },
  });

  assert.equal(webhook.authenticateBrevoWebhook(accepted, config), true);
  assert.equal(webhook.authenticateBrevoWebhook(rejected, config), false);
  assert.equal(webhook.authenticateBrevoWebhook(accepted, getBrevoConfig({})), false);
});

test("Brevo event variants normalize to a stable non-PII event key", () => {
  const first = webhook.normalizeBrevoWebhookEvent(payload("hardBounce"));
  const duplicate = webhook.normalizeBrevoWebhookEvent(payload("hard_bounce"));

  assert.equal(first.name, "hard_bounce");
  assert.equal(first.messageId, "message-123");
  assert.equal(first.key, duplicate.key);
  assert.equal(first.key.includes("owner@example.com"), false);
  assert.equal(webhook.normalizeBrevoWebhookEvent({ event: "unknown" }), null);
});

test("lead tier boundaries remain Cold, Warm, Hot and Super Hot", () => {
  assert.equal(webhook.leadTier(0), "Cold");
  assert.equal(webhook.leadTier(35), "Warm");
  assert.equal(webhook.leadTier(70), "Hot");
  assert.equal(webhook.leadTier(90), "Super Hot");
});

test("delivery state never treats temporary delay as permanent failure", () => {
  const pending = { roadmap_status: "sent", email_status: "pending" };
  const delayed = webhook.nextDeliveryState(pending, "soft_bounce");
  const delivered = webhook.nextDeliveryState(pending, "delivered");
  const failed = webhook.nextDeliveryState(pending, "invalid");

  assert.deepEqual(delayed, {
    roadmapStatus: "delayed",
    emailStatus: "delayed",
    retryEligible: true,
    delivered: false,
    failed: false,
  });
  assert.equal(delivered.roadmapStatus, "delivered");
  assert.equal(failed.roadmapStatus, "failed");
  assert.equal(failed.retryEligible, false);
});

test("contact attributes suppress invalid recipients without exposing PII", () => {
  const attributes = webhook.buildBrevoDeliveryAttributes("hard_bounce", {
    roadmapStatus: "failed",
    emailStatus: "hard_bounce",
    eventTimestamp: "2026-09-13T12:00:00.000Z",
    delivered: false,
    leadScore: 52,
    leadTier: "Warm",
    scoreDelta: -20,
  });

  assert.equal(attributes.ROADMAP_DELIVERY_STATUS, "Failed");
  assert.equal(attributes.EMAIL_DELIVERY_STATUS, "Hard Bounce");
  assert.equal(attributes.EMAIL_VALIDATION_STATUS, "Invalid");
  assert.equal(attributes.NURTURE_STATUS, "Suppressed");
  assert.equal(attributes.LEAD_SCORE, 52);
  assert.equal(JSON.stringify(attributes).includes("owner@example.com"), false);
});

test("contact delivery update uses PUT and remains development-allowlisted", async () => {
  const calls = [];
  const updated = await brevo.updateBrevoContactAttributes(
    "owner@example.com",
    { EMAIL_DELIVERY_STATUS: "Delivered" },
    {
      env: environment,
      fetchImpl: async (url, options) => {
        calls.push({ url, options, body: JSON.parse(options.body) });
        return { ok: true, status: 204, text: async () => "" };
      },
    }
  );
  const skipped = await brevo.updateBrevoContactAttributes(
    "visitor@example.com",
    { EMAIL_DELIVERY_STATUS: "Delivered" },
    { env: environment, fetchImpl: async () => { throw new Error("must not run"); } }
  );

  assert.equal(updated.status, "updated");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.method, "PUT");
  assert.match(calls[0].url, /\/v3\/contacts\/owner%40example\.com$/);
  assert.equal(skipped.status, "skipped");
});

function mockDatabase() {
  const state = {
    insertedKeys: new Set(),
    events: new Map([["baseline", { event_name: "baseline", score_delta: 72 }]]),
    currentScore: 72,
    syncUpdates: [],
    contactUpdates: [],
    changeAudits: [],
    consentUpdates: [],
  };
  const client = {
    async query(sql, values = []) {
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") return { rows: [], rowCount: 0 };
      if (sql.includes("FROM assessment_brevo_syncs AS sync")) {
        return {
          rows: [{
            assessment_id: "123e4567-e89b-42d3-a456-426614174000",
            roadmap_status: "sent",
            email_status: "pending",
            last_event_at: null,
            lead_score: state.currentScore,
          }],
          rowCount: 1,
        };
      }
      if (sql.includes("INSERT INTO brevo_webhook_events")) {
        if (state.insertedKeys.has(values[0])) return { rows: [], rowCount: 0 };
        state.insertedKeys.add(values[0]);
        return { rows: [{ event_key: values[0] }], rowCount: 1 };
      }
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
      if (sql.includes("UPDATE assessment_marketing_consents SET")) {
        state.consentUpdates.push(values);
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes("UPDATE assessment_brevo_syncs SET")) {
        state.currentScore = values[8];
        state.syncUpdates.push(values);
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes("UPDATE brevo_webhook_events SET processing_status")) {
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
          state.contactUpdates.push({ sql, values });
          return { rows: [], rowCount: 1 };
        },
      },
    },
  };
}
test("a retried click webhook is audited once and never scores twice", async () => {
  const { database, state } = mockDatabase();
  const options = {
    env: environment,
    fetchImpl: async () => ({ ok: true, status: 204, text: async () => "" }),
  };

  const first = await webhook.processBrevoWebhookEvent(database, payload("click"), options);
  const second = await webhook.processBrevoWebhookEvent(database, payload("click"), options);

  assert.equal(first.status, "processed");
  assert.equal(first.scoreDelta, 2);
  assert.equal(second.status, "duplicate");
  assert.equal(state.events.size, 2);
  assert.equal(state.syncUpdates.length, 1);
  assert.equal(state.syncUpdates[0][8], 74);
  assert.equal(state.syncUpdates[0][9], "Hot");
  assert.equal(state.contactUpdates.length, 1);
});


test("unsubscribe replaces subscription points and moves the lead backward", async () => {
  const { database, state } = mockDatabase();
  state.events = new Map([
    ["baseline", { event_name: "baseline", score_delta: 60 }],
    ["marketing_subscription", { event_name: "email_subscribed", score_delta: 10 }],
  ]);
  state.currentScore = 70;
  const options = {
    env: environment,
    fetchImpl: async () => ({ ok: true, status: 204, text: async () => "" }),
  };

  const result = await webhook.processBrevoWebhookEvent(database, payload("unsubscribed"), options);

  assert.equal(result.status, "processed");
  assert.equal(result.scoreDelta, -25);
  assert.equal(state.currentScore, 45);
  assert.equal(state.syncUpdates[0][9], "Warm");
  assert.equal(state.consentUpdates.length, 1);
  assert.deepEqual(state.events.get("marketing_subscription"), {
    event_name: "email_unsubscribed",
    score_delta: -15,
    occurred_at: "2026-09-12T16:40:00.000Z",
  });
});
