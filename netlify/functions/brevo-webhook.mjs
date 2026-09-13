import { getBrevoConfig } from "./_brevo-config.mjs";
import {
  authenticateBrevoWebhook,
  processBrevoWebhookBatch,
} from "./_brevo-webhook.mjs";
import {
  database,
  errorResponse,
  jsonResponse,
  readJsonBody,
} from "./_assessment-utils.mjs";

export default async (request) => {
  if (request.method !== "POST") return errorResponse("Method not allowed", 405);

  const config = getBrevoConfig();
  if (!config.webhookEnabled || !config.webhookSecret) {
    return errorResponse("Webhook processing is unavailable", 503, "webhook_disabled");
  }
  if (!authenticateBrevoWebhook(request, config)) {
    return errorResponse("Webhook authentication failed", 401, "webhook_unauthorized");
  }

  try {
    const body = await readJsonBody(request, 262144);
    const payloads = Array.isArray(body) ? body : Array.isArray(body.events) ? body.events : [body];
    if (payloads.length < 1 || payloads.length > 100) {
      return errorResponse("Webhook batch size is invalid", 400, "webhook_batch_invalid");
    }

    const results = await processBrevoWebhookBatch(database(), payloads, { config });
    const counts = results.reduce((summary, result) => {
      summary[result.status] = (summary[result.status] || 0) + 1;
      return summary;
    }, {});
    return jsonResponse({ ok: true, received: payloads.length, counts });
  } catch {
    // Brevo retries 429 responses, while other 4xx/5xx responses can be discarded.
    return errorResponse("Webhook processing should be retried", 429, "webhook_retry_later");
  }
};

export const config = {
  path: "/api/v1/brevo/webhook",
  rateLimit: { windowLimit: 600, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
