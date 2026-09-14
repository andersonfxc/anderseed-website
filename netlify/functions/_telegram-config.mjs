function truthy(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

export function getTelegramConfig(environment = process.env) {
  const siteEnvironment = String(environment.CONTEXT || environment.BREVO_ENVIRONMENT || "development").toLowerCase();
  const production = ["production", "prod"].includes(siteEnvironment);
  const token = String(environment.TELEGRAM_BOT_TOKEN || "").trim();
  const chatId = String(environment.TELEGRAM_CHAT_ID || "").trim();
  const webhookSecret = String(environment.TELEGRAM_WEBHOOK_SECRET || "").trim();
  const memberHashSecret = String(environment.TELEGRAM_MEMBER_HASH_SECRET || webhookSecret).trim();
  const publicUrl = String(environment.TELEGRAM_PUBLIC_URL || "https://t.me/anderseedconsulting").trim();
  const requested = truthy(environment.TELEGRAM_INTEGRATION_ENABLED);
  const productionAllowed = !production || truthy(environment.TELEGRAM_PRODUCTION_ENABLED);
  return Object.freeze({
    integrationEnabled: requested && productionAllowed && Boolean(token && chatId),
    webhookEnabled: requested && productionAllowed && Boolean(token && chatId && webhookSecret),
    production,
    token,
    chatId,
    webhookSecret,
    memberHashSecret,
    publicUrl,
  });
}
