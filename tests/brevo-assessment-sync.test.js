const test = require("node:test");
const assert = require("node:assert/strict");

let brevo;
let getBrevoConfig;

test.before(async () => {
  brevo = await import("../netlify/functions/_brevo-client.mjs");
  ({ getBrevoConfig } = await import("../netlify/functions/_brevo-config.mjs"));
});

const assessmentInput = {
  assessmentId: "123e4567-e89b-42d3-a456-426614174000",
  email: "owner@example.com",
  firstName: "Anderson",
  marketingOptIn: false,
  consentVersion: "assessment-marketing-2026-08-v2",
  transitionTimeline: "one_to_three",
  completedAt: "2026-09-12T10:30:00.000Z",
  result: {
    schemaVersion: "ba-readiness-mvp-v2",
    scoringVersion: "2026-08-22-v1",
    readinessStage: "Growing",
    readinessScore: 68,
    strongestArea: { key: "analyticalProblemSolving", label: "Analytical Instinct" },
    primaryGrowthAreaKey: "appliedExperience",
    primaryGrowthArea: "Applied Experience",
    initialLeadScore: 72,
    leadTemperature: "Hot",
  },
};

const baseEnvironment = {
  BREVO_INTEGRATION_ENABLED: "true",
  BREVO_ENVIRONMENT: "development",
  BREVO_API_KEY: "private-test-key",
  BREVO_SENDER_NAME: "Anderseed Consulting",
  BREVO_SENDER_EMAIL: "sender@example.com",
  BREVO_TEST_RECIPIENTS: "owner@example.com",
  BREVO_LIST_ALL_LEADS_ID: "8",
  BREVO_LIST_ROADMAP_ID: "9",
  BREVO_LIST_ASSESSMENT_ID: "10",
  BREVO_ROADMAP_TEMPLATE_ID: "1",
  BREVO_ROADMAP_URL: "https://example.com/roadmap.pdf",
  BREVO_ROADMAP_ASSET_STATUS: "placeholder",
};

function successfulFetch(calls) {
  return async (url, options) => {
    calls.push({ url, options, body: JSON.parse(options.body) });
    return {
      ok: true,
      status: 201,
      text: async () => url.endsWith("/smtp/email")
        ? JSON.stringify({ messageId: "message-123" })
        : JSON.stringify({ id: 42 }),
    };
  };
}

test("assessment contact payload maps lifecycle data without raw answers", () => {
  const config = getBrevoConfig(baseEnvironment);
  const payload = brevo.buildAssessmentContactPayload({ ...assessmentInput, config });

  assert.equal(payload.email, "owner@example.com");
  assert.equal(payload.updateEnabled, true);
  assert.deepEqual(payload.listIds, [8, 9, 10]);
  assert.equal(payload.attributes.FIRSTNAME, "Anderson");
  assert.equal(payload.attributes.MARKETING_CONSENT, false);
  assert.equal(payload.attributes.CONSENT_DATE, undefined);
  assert.equal(payload.attributes.READINESS_SCORE, 68);
  assert.equal(payload.attributes.LEAD_SCORE, 72);
  assert.equal(payload.attributes.LEAD_TIER, "Hot");
  assert.equal(payload.attributes.START_TIMELINE, "one_to_three");
  assert.equal(payload.attributes.NURTURE_STATUS, "Service only");
  assert.equal("answers" in payload, false);
  assert.equal(JSON.stringify(payload).includes("completionToken"), false);
});

test("subscribed contacts receive the recalculated dynamic heat score", () => {
  const config = getBrevoConfig(baseEnvironment);
  const payload = brevo.buildAssessmentContactPayload({
    ...assessmentInput,
    marketingOptIn: true,
    leadScore: 70,
    leadTier: "Hot",
    lastScoreEvent: "email_subscribed",
    lastScoreDelta: 10,
    config,
  });

  assert.equal(payload.attributes.MARKETING_CONSENT, true);
  assert.equal(payload.attributes.LEAD_SCORE, 70);
  assert.equal(payload.attributes.LEAD_TIER, "Hot");
  assert.equal(payload.attributes.LAST_SCORE_EVENT, "email_subscribed");
  assert.equal(payload.attributes.LAST_SCORE_DELTA, 10);
  assert.equal(payload.attributes.NURTURE_STATUS, "Eligible");
});

test("allowlisted development assessment sync upserts once and sends one roadmap email", async () => {
  const calls = [];
  const outcome = await brevo.syncAssessmentContactWithBrevo(assessmentInput, {
    env: baseEnvironment,
    fetchImpl: successfulFetch(calls),
  });

  assert.equal(outcome.contactStatus, "synced");
  assert.equal(outcome.roadmapStatus, "sent");
  assert.equal(outcome.messageId, "message-123");
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /\/v3\/contacts$/);
  assert.match(calls[1].url, /\/v3\/smtp\/email$/);
  assert.equal(calls[0].body.updateEnabled, true);
  assert.equal(calls[1].body.templateId, 1);
  assert.equal(calls[1].body.params.roadmap_url, "https://example.com/roadmap.pdf");
  assert.equal(
    calls[1].body.headers["Idempotency-Key"],
    `assessment-roadmap-${assessmentInput.assessmentId}`
  );
});

test("development never syncs or emails a recipient outside the allowlist", async () => {
  let requests = 0;
  const outcome = await brevo.syncAssessmentContactWithBrevo(
    { ...assessmentInput, email: "visitor@example.com" },
    {
      env: baseEnvironment,
      fetchImpl: async () => {
        requests += 1;
        throw new Error("must not be called");
      },
    }
  );

  assert.equal(requests, 0);
  assert.equal(outcome.contactStatus, "skipped");
  assert.equal(outcome.roadmapStatus, "skipped");
  assert.equal(outcome.errorCode, "recipient_not_allowlisted");
});

test("production can sync contacts but cannot send the placeholder roadmap", async () => {
  const calls = [];
  const outcome = await brevo.syncAssessmentContactWithBrevo(assessmentInput, {
    env: {
      ...baseEnvironment,
      BREVO_ENVIRONMENT: "production",
      BREVO_PRODUCTION_SEND_ENABLED: "true",
      BREVO_ROADMAP_ASSET_STATUS: "placeholder",
    },
    fetchImpl: successfulFetch(calls),
  });

  assert.equal(outcome.contactStatus, "synced");
  assert.equal(outcome.roadmapStatus, "deferred");
  assert.equal(outcome.errorCode, "roadmap_delivery_disabled");
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/v3\/contacts$/);
});

test("Brevo failure is contained and does not reject assessment completion", async () => {
  const outcome = await brevo.syncAssessmentContactWithBrevo(assessmentInput, {
    env: baseEnvironment,
    fetchImpl: async () => ({
      ok: false,
      status: 503,
      text: async () => JSON.stringify({
        message: "response containing owner@example.com must not be exposed",
      }),
    }),
  });

  assert.equal(outcome.contactStatus, "failed");
  assert.equal(outcome.roadmapStatus, "deferred");
  assert.equal(outcome.errorCode, "brevo_http_503");
  assert.equal(JSON.stringify(outcome).includes("owner@example.com"), false);
});

test("sync audit records operational status without contact PII", async () => {
  const queries = [];
  const database = {
    pool: {
      query: async (sql, values) => {
        queries.push({ sql, values });
      },
    },
  };
  const outcome = {
    contactStatus: "synced",
    roadmapStatus: "sent",
    errorCode: null,
    messageId: "message-123",
  };

  const recorded = await brevo.recordAssessmentBrevoSync(
    database,
    assessmentInput.assessmentId,
    outcome
  );

  assert.equal(recorded, true);
  assert.equal(queries.length, 1);
  assert.match(queries[0].sql, /assessment_brevo_syncs/);
  assert.deepEqual(queries[0].values, [
    assessmentInput.assessmentId,
    "synced",
    "sent",
    null,
    "message-123",
  ]);
  assert.equal(JSON.stringify(queries).includes(assessmentInput.email), false);
  assert.equal(JSON.stringify(queries).includes(assessmentInput.firstName), false);
});
