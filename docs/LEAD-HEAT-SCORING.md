# Anderseed Lead Heat Scoring

Status: implemented locally, not deployed or activated
Rule version: `lead-heat-2026-09-14-v2`

## Score bands

| Score | Tier |
|---:|---|
| 0-34 | Cold |
| 35-69 | Warm |
| 70-89 | Hot |
| 90-100 | Super Hot |

Automated digital activity is clamped to 0-89. Super Hot remains reserved for a future approved commercial qualification such as consultation attendance or payment start, or an owner-set `MANUAL_TIER_OVERRIDE`. Clearing the override returns the contact to automatic score-based segmentation.

## Implemented score events

| Trigger | Points | Applied |
|---|---:|---|
| Assessment completed | +20 | Once per assessment |
| Q8: As soon as possible | +25 | Once, at completion |
| Q8: Within 1-3 months | +20 | Once, at completion |
| Q8: Within 3-6 months | +10 | Once, at completion |
| Q8: Within 6-12 months | +5 | Once, at completion |
| Q8: Exploring without a fixed timeline | 0 | Once, at completion |
| Personalised result genuinely viewed | +15 | Once per lead |
| Pricing section at least 50% visible for two seconds | +10 | Once per lead |
| Telegram link clicked by a known, consented lead | +5 | Once per lead |
| Currently a confirmed Telegram community member | +10 | Current Telegram membership state |
| Leaves or is removed from the Telegram community | 0 | Replaces the +10 membership state, producing an actual -10 movement |
| Rejoins through an attributed membership | +10 | Restores membership points without accumulating them |
| First roadmap email link click | +2 | Once per lead |
| Currently subscribed | +10 | Current marketing-subscription state |
| Never subscribed | 0 | Current marketing-subscription state |
| Unsubscribe | -15 | Replaces the current subscription state |
| Resubscribe | +10 | Restores subscribed state without accumulating points |
| Hard bounce or invalid email | -20 | Strongest invalid-delivery state |
| Blocked email | -10 | Applied only when no stronger invalid-delivery state exists |
| Spam complaint | -30 | Strongest marketing-suppression state; automatic recovery is blocked |

Assessment questions Q1-Q7 contribute zero lead-heat points. They continue to calculate the separate BA Readiness result.

## Controls

- Browser requests never choose their own score or delta; the server maps named events to the versioned rule catalogue.
- A random engagement token is returned only after verified contact submission. Only its SHA-256 hash is stored server-side.
- The browser stores the assessment ID and token, not the person's name or email.
- The canonical event ledger has one row per assessment and score group. Fixed activities cannot be repeated, while subscription and delivery rows are safely replaced when their current state changes.
- `lead_heat_change_audit` keeps the append-only previous score, new score, state change, source, rule version and timestamp without storing contact PII.
- Recalculation uses the full ledger after every change, so capped scores and later deductions remain mathematically correct.
- Database scoring is committed before downstream Brevo sync. Brevo failure cannot block an assessment result, pricing view, or Telegram action.
- Telegram join points require a valid one-person invite and an authenticated Telegram webhook for the configured community.
- Telegram member attribution stores only a keyed HMAC digest of the numeric member ID. Names and usernames are not stored.
- Telegram leave and removal updates replace the membership component with zero. Rejoining restores +10 without point farming.
- The registered Telegram webhook must include chat_member in allowed_updates, and the bot must remain a group administrator.
- Telegram integration and production use have separate environment switches and remain off by default.

## Deliberately pending

Points and automatic movement for Brevo Events registration/attendance, consultation booking/attendance/no-show, application activity, payment start/completion, inactivity decay, and manual staff adjustments require final approved values and operating rules before implementation.
