import {
  database,
  enforceSameOrigin,
  errorResponse,
  jsonResponse,
  readJsonBody,
  sha256,
  validUuid,
} from "./_assessment-utils.mjs";
import { applyLeadHeatEvent } from "./_lead-heat.mjs";
import { getTelegramConfig } from "./_telegram-config.mjs";

async function telegramRequest(config, method, payload, fetchImpl = fetch) {
  const response = await fetchImpl(`https://api.telegram.org/bot${config.token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) throw new Error("telegram_request_failed");
  return result.result;
}

export default async (request) => {
  if (request.method !== "POST") return errorResponse("Method not allowed", 405);
  if (!enforceSameOrigin(request)) return errorResponse("Cross-origin submissions are not accepted", 403);

  const telegram = getTelegramConfig();
  try {
    const body = await readJsonBody(request, 4096);
    if (!validUuid(body.assessmentId) || !String(body.engagementToken || "")) {
      return jsonResponse({ ok: true, url: telegram.publicUrl, personalised: false });
    }
    const db = database();
    const scored = await applyLeadHeatEvent(db, {
      assessmentId: body.assessmentId,
      engagementToken: body.engagementToken,
      eventName: "telegram_link_clicked",
      source: "website",
    });
    if (["unauthorized", "not_found"].includes(scored.status) || !telegram.integrationEnabled) {
      return jsonResponse({ ok: true, url: telegram.publicUrl, personalised: false });
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const invite = await telegramRequest(telegram, "createChatInviteLink", {
      chat_id: telegram.chatId,
      name: `Anderseed lead ${String(body.assessmentId).slice(0, 8)}`,
      expire_date: Math.floor(expiresAt.getTime() / 1000),
      member_limit: 1,
    });
    await db.pool.query(
      `INSERT INTO telegram_lead_invites (invite_hash, assessment_id, expires_at)
       VALUES ($1,$2,$3)
       ON CONFLICT (invite_hash) DO NOTHING`,
      [sha256(invite.invite_link), body.assessmentId, expiresAt.toISOString()]
    );
    return jsonResponse({ ok: true, url: invite.invite_link, personalised: true });
  } catch {
    return jsonResponse({ ok: true, url: telegram.publicUrl, personalised: false });
  }
};

export const config = {
  path: "/api/v1/telegram/invite",
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
