const test = require("node:test");
const assert = require("node:assert/strict");

let telegramConfig;
let webhook;

test.before(async () => {
  telegramConfig = await import("../netlify/functions/_telegram-config.mjs");
  webhook = await import("../netlify/functions/telegram-webhook.mjs");
});

test("Telegram integration is disabled by default and requires an explicit production switch", () => {
  assert.equal(telegramConfig.getTelegramConfig({}).integrationEnabled, false);
  const common = {
    TELEGRAM_INTEGRATION_ENABLED: "true",
    TELEGRAM_BOT_TOKEN: "secret-token",
    TELEGRAM_CHAT_ID: "-1004330370012",
    TELEGRAM_WEBHOOK_SECRET: "webhook-secret",
  };
  assert.equal(telegramConfig.getTelegramConfig({ ...common, CONTEXT: "production" }).integrationEnabled, false);
  assert.equal(telegramConfig.getTelegramConfig({
    ...common,
    CONTEXT: "production",
    TELEGRAM_PRODUCTION_ENABLED: "true",
  }).webhookEnabled, true);
});

test("Telegram webhook secret comparison is exact", () => {
  assert.equal(webhook.secretMatches("correct", "correct"), true);
  assert.equal(webhook.secretMatches("incorrect", "correct"), false);
  assert.equal(webhook.secretMatches("", "correct"), false);
});


test("Telegram member attribution uses a keyed hash and ignores unrelated updates", () => {
  const config = { chatId: "-1004330370012", memberHashSecret: "member-secret" };
  const update = {
    chat_member: {
      date: 1789387200,
      chat: { id: -1004330370012 },
      invite_link: { invite_link: "https://t.me/+personal" },
      new_chat_member: { status: "member", user: { id: 123456789, first_name: "Private" } },
    },
  };
  const transition = webhook.telegramMembershipTransition(update, config);

  assert.equal(transition.eventName, "telegram_join_confirmed");
  assert.equal(transition.memberHash.length, 64);
  assert.equal(JSON.stringify(transition).includes("123456789"), false);
  assert.equal(JSON.stringify(transition).includes("Private"), false);
  assert.equal(webhook.telegramMembershipTransition({ my_chat_member: update.chat_member }, config), null);
});

test("Telegram departures resolve the attributed lead and emit a reversible leave event", async () => {
  const config = { chatId: "-1004330370012", memberHashSecret: "member-secret" };
  const assessmentId = "123e4567-e89b-42d3-a456-426614174000";
  const state = { invite: { invite_hash: "stored-invite", assessment_id: assessmentId }, updates: [], events: [] };
  const db = {
    pool: {
      async query(sql, values) {
        if (sql.includes("SET used_at=COALESCE")) {
          state.invite.invite_hash = values[0];
          state.invite.member_hash = values[1];
          state.invite.membership_status = values[2];
          return { rows: [{ invite_hash: values[0], assessment_id: assessmentId }] };
        }
        if (sql.includes("WHERE member_hash=$1")) {
          return state.invite.member_hash === values[0] ? { rows: [state.invite] } : { rows: [] };
        }
        if (sql.includes("SET membership_status=$2")) {
          state.invite.membership_status = values[1];
          state.invite.left_at = values[2];
          state.updates.push(values);
          return { rows: [] };
        }
        throw new Error("Unexpected query: " + sql);
      },
    },
  };
  const applyLeadHeatEvent = async (_db, input) => {
    state.events.push(input);
    return { status: "applied" };
  };
  const joinUpdate = {
    chat_member: {
      date: 1789387200,
      chat: { id: -1004330370012 },
      invite_link: { invite_link: "https://t.me/+personal" },
      new_chat_member: { status: "member", user: { id: 123456789 } },
    },
  };
  const leaveUpdate = {
    chat_member: {
      date: 1789390800,
      chat: { id: -1004330370012 },
      new_chat_member: { status: "left", user: { id: 123456789 } },
    },
  };

  const joined = await webhook.processTelegramMembershipUpdate(db, joinUpdate, config, { applyLeadHeatEvent });
  const left = await webhook.processTelegramMembershipUpdate(db, leaveUpdate, config, { applyLeadHeatEvent });

  assert.equal(joined.eventName, "telegram_join_confirmed");
  assert.equal(left.eventName, "telegram_left");
  assert.equal(state.invite.membership_status, "left");
  assert.equal(state.events[1].assessmentId, assessmentId);
  assert.equal(state.events[1].eventName, "telegram_left");
  assert.equal(JSON.stringify(state).includes("123456789"), false);
});

test("unattributed public-link departures do not change lead heat", async () => {
  const config = { chatId: "-1004330370012", memberHashSecret: "member-secret" };
  const db = { pool: { query: async () => ({ rows: [] }) } };
  let scoreCalls = 0;
  const outcome = await webhook.processTelegramMembershipUpdate(db, {
    chat_member: {
      date: 1789390800,
      chat: { id: -1004330370012 },
      new_chat_member: { status: "kicked", user: { id: 987654321 } },
    },
  }, config, { applyLeadHeatEvent: async () => { scoreCalls += 1; } });

  assert.equal(outcome.reason, "unattributed_member");
  assert.equal(scoreCalls, 0);
});
