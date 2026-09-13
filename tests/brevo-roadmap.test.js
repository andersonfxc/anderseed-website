const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
let getBrevoConfig;

test.before(async () => {
  ({ getBrevoConfig } = await import("../netlify/functions/_brevo-config.mjs"));
});

const roadmapEnvironment = {
  BREVO_INTEGRATION_ENABLED: "true",
  BREVO_API_KEY: "private-test-key",
  BREVO_SENDER_EMAIL: "sender@example.com",
  BREVO_ROADMAP_TEMPLATE_ID: "123",
  BREVO_ROADMAP_URL: "https://example.com/roadmap.pdf",
  BREVO_LIST_ROADMAP_ID: "9",
};

test("placeholder roadmap delivery is available for allowlisted development testing", () => {
  const config = getBrevoConfig({
    ...roadmapEnvironment,
    BREVO_ENVIRONMENT: "development",
    BREVO_TEST_RECIPIENTS: "owner@example.com",
    BREVO_ROADMAP_ASSET_STATUS: "placeholder",
  });

  assert.equal(config.roadmapDeliveryEnabled, true);
});

test("a placeholder roadmap can never be enabled for production delivery", () => {
  const placeholder = getBrevoConfig({
    ...roadmapEnvironment,
    BREVO_ENVIRONMENT: "production",
    BREVO_PRODUCTION_SEND_ENABLED: "true",
    BREVO_ROADMAP_ASSET_STATUS: "placeholder",
  });
  const final = getBrevoConfig({
    ...roadmapEnvironment,
    BREVO_ENVIRONMENT: "production",
    BREVO_PRODUCTION_SEND_ENABLED: "true",
    BREVO_ROADMAP_ASSET_STATUS: "final",
  });

  assert.equal(placeholder.sendingEnabled, true);
  assert.equal(placeholder.roadmapDeliveryEnabled, false);
  assert.equal(final.roadmapDeliveryEnabled, true);
});

test("the tracked placeholder asset matches its manifest and is excluded from final approval", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, "integrations/brevo/template-manifest.json"), "utf8")
  ).roadmapDelivery;
  const asset = fs.readFileSync(path.join(root, manifest.assetPath));
  const sha256 = crypto.createHash("sha256").update(asset).digest("hex");

  assert.equal(manifest.assetStatus, "placeholder");
  assert.equal(manifest.status, "active");
  assert.equal(manifest.templateId, 1);
  assert.equal(sha256, manifest.assetSha256);
  assert.match(
    fs.readFileSync(path.join(root, "integrations/brevo/templates/free-ba-roadmap.html"), "utf8"),
    /\{\{ params\.roadmap_url \}\}/
  );
});
