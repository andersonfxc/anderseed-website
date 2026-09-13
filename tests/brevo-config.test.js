const test = require("node:test");
const assert = require("node:assert/strict");

let brevoContactAllowed;
let brevoRecipientAllowed;
let getBrevoConfig;
let safeBrevoConfigSummary;

test.before(async () => {
  ({
    brevoContactAllowed,
    brevoRecipientAllowed,
    getBrevoConfig,
    safeBrevoConfigSummary,
  } = await import("../netlify/functions/_brevo-config.mjs"));
});

const configuredEnvironment = {
  BREVO_INTEGRATION_ENABLED: "true",
  BREVO_API_KEY: "private-test-key",
  BREVO_SENDER_EMAIL: "sender@example.com",
};

test("Brevo is disabled by default", () => {
  const config = getBrevoConfig({});

  assert.equal(config.environment, "development");
  assert.equal(config.configured, false);
  assert.equal(config.sendingEnabled, false);
});

test("development sends are restricted to the explicit test allowlist", () => {
  const config = getBrevoConfig({
    ...configuredEnvironment,
    BREVO_ENVIRONMENT: "development",
    BREVO_TEST_RECIPIENTS: "owner@example.com, SECOND@example.com ",
  });

  assert.equal(config.sendingEnabled, true);
  assert.equal(brevoRecipientAllowed(config, "OWNER@example.com"), true);
  assert.equal(brevoRecipientAllowed(config, "visitor@example.com"), false);
});

test("contact sync does not require a sender but remains allowlisted", () => {
  const config = getBrevoConfig({
    BREVO_INTEGRATION_ENABLED: "true",
    BREVO_API_KEY: "private-test-key",
    BREVO_ENVIRONMENT: "test",
    BREVO_TEST_RECIPIENTS: "owner@example.com",
  });

  assert.equal(config.contactSyncEnabled, true);
  assert.equal(config.sendingEnabled, false);
  assert.equal(brevoContactAllowed(config, "owner@example.com"), true);
  assert.equal(brevoContactAllowed(config, "visitor@example.com"), false);
});

test("production requires its independent send switch", () => {
  const disabled = getBrevoConfig({
    ...configuredEnvironment,
    BREVO_ENVIRONMENT: "production",
  });
  const enabled = getBrevoConfig({
    ...configuredEnvironment,
    BREVO_ENVIRONMENT: "production",
    BREVO_PRODUCTION_SEND_ENABLED: "true",
  });

  assert.equal(disabled.sendingEnabled, false);
  assert.equal(enabled.sendingEnabled, true);
  assert.equal(brevoRecipientAllowed(enabled, "anyone@example.com"), true);
});

test("safe summary never exposes secrets or email addresses", () => {
  const config = getBrevoConfig({
    ...configuredEnvironment,
    BREVO_TEST_RECIPIENTS: "owner@example.com",
    BREVO_ROADMAP_TEMPLATE_ID: "42",
    BREVO_LIST_ALL_LEADS_ID: "8",
    BREVO_LIST_ROADMAP_ID: "not-an-id",
  });
  const summary = safeBrevoConfigSummary(config);
  const serialized = JSON.stringify(summary);

  assert.equal(summary.testRecipientCount, 1);
  assert.equal(summary.configuredListCount, 1);
  assert.equal(config.listIds.roadmap, null);
  assert.equal(summary.hasRoadmapTemplate, true);
  assert.equal(serialized.includes("private-test-key"), false);
  assert.equal(serialized.includes("owner@example.com"), false);
  assert.equal(serialized.includes("sender@example.com"), false);
});

test("an invalid environment fails closed", () => {
  const config = getBrevoConfig({
    ...configuredEnvironment,
    BREVO_ENVIRONMENT: "prodution",
    BREVO_PRODUCTION_SEND_ENABLED: "true",
    BREVO_TEST_RECIPIENTS: "owner@example.com",
  });

  assert.equal(config.environment, "invalid");
  assert.equal(config.sendingEnabled, false);
});
