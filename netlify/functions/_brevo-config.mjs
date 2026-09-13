const ALLOWED_ENVIRONMENTS = new Set(["development", "test", "production"]);

function enabled(value) {
  return String(value || "").trim().toLowerCase() === "true";
}

function list(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function positiveInteger(value) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function getBrevoConfig(env = process.env) {
  const requestedEnvironment = String(env.BREVO_ENVIRONMENT || "development")
    .trim()
    .toLowerCase();
  const environment = ALLOWED_ENVIRONMENTS.has(requestedEnvironment)
    ? requestedEnvironment
    : "invalid";
  const integrationEnabled = enabled(env.BREVO_INTEGRATION_ENABLED);
  const productionSendEnabled = enabled(env.BREVO_PRODUCTION_SEND_ENABLED);
  const webhookEnabled = enabled(env.BREVO_WEBHOOK_ENABLED);
  const testRecipients = list(env.BREVO_TEST_RECIPIENTS);
  const apiConfigured = Boolean(String(env.BREVO_API_KEY || "").trim());
  const senderConfigured = Boolean(String(env.BREVO_SENDER_EMAIL || "").trim());
  const configured = apiConfigured && senderConfigured;
  const environmentAllowsSending =
    environment === "production"
      ? productionSendEnabled
      : (environment === "development" || environment === "test") &&
        testRecipients.length > 0;
  const sendingEnabled = integrationEnabled && configured && environmentAllowsSending;
  const contactSyncEnabled = integrationEnabled && apiConfigured && environmentAllowsSending;
  const roadmapAssetStatus = String(env.BREVO_ROADMAP_ASSET_STATUS || "placeholder")
    .trim()
    .toLowerCase();
  const productionRoadmapAllowed =
    environment !== "production" || roadmapAssetStatus === "final";

  return Object.freeze({
    environment,
    integrationEnabled,
    productionSendEnabled,
    apiKey: String(env.BREVO_API_KEY || "").trim(),
    webhookEnabled,
    webhookSecret: String(env.BREVO_WEBHOOK_SECRET || "").trim(),
    senderName: String(env.BREVO_SENDER_NAME || "Anderseed Consulting").trim(),
    senderEmail: String(env.BREVO_SENDER_EMAIL || "").trim(),
    testRecipients: Object.freeze(testRecipients),
    listIds: Object.freeze({
      allLeads: positiveInteger(env.BREVO_LIST_ALL_LEADS_ID),
      roadmap: positiveInteger(env.BREVO_LIST_ROADMAP_ID),
      assessment: positiveInteger(env.BREVO_LIST_ASSESSMENT_ID),
      applications: positiveInteger(env.BREVO_LIST_APPLICATIONS_ID),
      consultations: positiveInteger(env.BREVO_LIST_CONSULTATIONS_ID),
      events: positiveInteger(env.BREVO_LIST_EVENTS_ID),
      customers: positiveInteger(env.BREVO_LIST_CUSTOMERS_ID),
    }),
    roadmapTemplateId: String(env.BREVO_ROADMAP_TEMPLATE_ID || "").trim(),
    doubleOptInTemplateId: String(env.BREVO_DOUBLE_OPT_IN_TEMPLATE_ID || "").trim(),
    roadmapUrl: String(env.BREVO_ROADMAP_URL || "").trim(),
    roadmapAssetStatus,
    apiConfigured,
    senderConfigured,
    configured,
    contactSyncEnabled,
    sendingEnabled,
    roadmapDeliveryEnabled:
      sendingEnabled &&
      productionRoadmapAllowed &&
      Boolean(String(env.BREVO_ROADMAP_TEMPLATE_ID || "").trim()) &&
      Boolean(String(env.BREVO_ROADMAP_URL || "").trim()) &&
      Boolean(positiveInteger(env.BREVO_LIST_ROADMAP_ID)),
  });
}

export function brevoContactAllowed(config, email) {
  if (!config.contactSyncEnabled) return false;
  if (config.environment === "production") return true;
  return config.testRecipients.includes(String(email || "").trim().toLowerCase());
}

export function brevoRecipientAllowed(config, email) {
  if (!config.sendingEnabled) return false;
  if (config.environment === "production") return true;
  return config.testRecipients.includes(String(email || "").trim().toLowerCase());
}

export function safeBrevoConfigSummary(config) {
  return Object.freeze({
    environment: config.environment,
    integrationEnabled: config.integrationEnabled,
    productionSendEnabled: config.productionSendEnabled,
    configured: config.configured,
    apiConfigured: config.apiConfigured,
    senderConfigured: config.senderConfigured,
    contactSyncEnabled: config.contactSyncEnabled,
    sendingEnabled: config.sendingEnabled,
    roadmapDeliveryEnabled: config.roadmapDeliveryEnabled,
    webhookEnabled: config.webhookEnabled,
    webhookConfigured: Boolean(config.webhookSecret),
    roadmapAssetStatus: config.roadmapAssetStatus,
    testRecipientCount: config.testRecipients.length,
    configuredListCount: Object.values(config.listIds).filter(Boolean).length,
    hasRoadmapTemplate: Boolean(config.roadmapTemplateId),
    hasDoubleOptInTemplate: Boolean(config.doubleOptInTemplateId),
    hasRoadmapUrl: Boolean(config.roadmapUrl),
  });
}
