import { createHmac, timingSafeEqual } from "node:crypto";
import {
  database,
  errorResponse,
  jsonResponse,
  readJsonBody,
  sha256,
} from "./_assessment-utils.mjs";
import { applyLeadHeatEvent } from "./_lead-heat.mjs";
import { getTelegramConfig } from "./_telegram-config.mjs";

const ACTIVE_MEMBER_STATUSES = new Set(["member", "administrator", "creator"]);
const DEPARTED_MEMBER_STATUSES = new Set(["left", "kicked"]);

export function secretMatches(submitted, expected) {
  const actualBuffer = Buffer.from(String(submitted || ""));
  const expectedBuffer = Buffer.from(String(expected || ""));
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export function telegramMemberHash(memberId, secret) {
  const normalizedId = String(memberId || "").trim();
  const normalizedSecret = String(secret || "").trim();
  if (!normalizedId || !normalizedSecret) return "";
  return createHmac("sha256", normalizedSecret).update(normalizedId).digest("hex");
}

export function telegramMembershipTransition(update, telegram) {
  const memberUpdate = update?.chat_member;
  const status = String(memberUpdate?.new_chat_member?.status || "");
  const member = memberUpdate?.new_chat_member?.user;
  const chatId = String(memberUpdate?.chat?.id || "");
  const active = ACTIVE_MEMBER_STATUSES.has(status)
    || (status === "restricted" && memberUpdate?.new_chat_member?.is_member === true);
  const departed = DEPARTED_MEMBER_STATUSES.has(status);
  const memberHash = telegramMemberHash(member?.id, telegram?.memberHashSecret);
  if (chatId !== telegram?.chatId || !memberHash || (!active && !departed)) return null;

  const occurredAt = Number.isFinite(Number(memberUpdate?.date))
    ? new Date(Number(memberUpdate.date) * 1000).toISOString()
    : new Date().toISOString();
  const inviteUrl = String(memberUpdate?.invite_link?.invite_link || "");
  return {
    active,
    status,
    memberHash,
    inviteHash: inviteUrl ? sha256(inviteUrl) : "",
    eventName: active ? "telegram_join_confirmed" : "telegram_left",
    occurredAt,
  };
}

async function latestAttributedInvite(db, memberHash) {
  const result = await db.pool.query(
    "SELECT invite_hash, assessment_id " +
      "FROM telegram_lead_invites " +
      "WHERE member_hash=$1 AND used_at IS NOT NULL " +
      "ORDER BY used_at DESC LIMIT 1",
    [memberHash]
  );
  return result.rows[0] || null;
}

export async function processTelegramMembershipUpdate(db, update, telegram, options = {}) {
  const transition = telegramMembershipTransition(update, telegram);
  if (!transition) return { processed: false, reason: "irrelevant_update" };

  let attributedInvite = null;
  if (transition.active && transition.inviteHash) {
    const claimed = await db.pool.query(
      "UPDATE telegram_lead_invites " +
        "SET used_at=COALESCE(used_at,$4), member_hash=$2, " +
        "membership_status=$3, left_at=NULL " +
        "WHERE invite_hash=$1 AND expires_at > $4 " +
        "RETURNING invite_hash, assessment_id",
      [transition.inviteHash, transition.memberHash, transition.status, transition.occurredAt]
    );
    attributedInvite = claimed.rows[0] || null;
  }

  if (!attributedInvite) {
    attributedInvite = await latestAttributedInvite(db, transition.memberHash);
    if (!attributedInvite) return { processed: false, reason: "unattributed_member" };
    await db.pool.query(
      "UPDATE telegram_lead_invites " +
        "SET membership_status=$2, " +
        "left_at=CASE WHEN $2 IN ('left','kicked') THEN $3::timestamptz ELSE NULL END " +
        "WHERE invite_hash=$1",
      [attributedInvite.invite_hash, transition.status, transition.occurredAt]
    );
  }

  const applyHeat = options.applyLeadHeatEvent || applyLeadHeatEvent;
  const outcome = await applyHeat(db, {
    assessmentId: attributedInvite.assessment_id,
    eventName: transition.eventName,
    source: "telegram_webhook",
    occurredAt: transition.occurredAt,
  }, { trusted: true, ...options.heatOptions });

  return {
    processed: outcome.status === "applied",
    status: outcome.status,
    eventName: transition.eventName,
  };
}

export default async (request) => {
  if (request.method !== "POST") return errorResponse("Method not allowed", 405);
  const telegram = getTelegramConfig();
  if (!telegram.webhookEnabled) return errorResponse("Webhook processing is unavailable", 503, "webhook_disabled");
  if (!secretMatches(request.headers.get("x-telegram-bot-api-secret-token"), telegram.webhookSecret)) {
    return errorResponse("Webhook authentication failed", 401, "webhook_unauthorized");
  }

  try {
    const update = await readJsonBody(request, 65536);
    const outcome = await processTelegramMembershipUpdate(database(), update, telegram);
    return jsonResponse({ ok: true, processed: outcome.processed });
  } catch {
    return errorResponse("Webhook processing should be retried", 429, "webhook_retry_later");
  }
};

export const config = {
  path: "/api/v1/telegram/webhook",
  rateLimit: { windowLimit: 600, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
