const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const manifest = JSON.parse(fs.readFileSync(
  path.join(__dirname, "../integrations/brevo/segments.json"),
  "utf8"
));

function conditionMatches(condition, contact) {
  if (condition.all) return condition.all.every((item) => conditionMatches(item, contact));
  if (condition.any) return condition.any.some((item) => conditionMatches(item, contact));
  const value = contact[condition.attribute];
  if (condition.operator === "is_empty") return value === undefined || value === null || value === "";
  if (condition.operator === "equals") return value === condition.value;
  if (condition.operator === "less_than") return Number(value) < condition.value;
  if (condition.operator === "greater_than_or_equal") return Number(value) >= condition.value;
  throw new Error(`Unknown operator ${condition.operator}`);
}

function segment(name) {
  return manifest.segments.find((item) => item.name === name);
}

function temperatureMatches(score, override = "") {
  return manifest.segments
    .slice(0, 4)
    .filter((item) => conditionMatches(item.conditions, {
      LEAD_SCORE: score,
      MANUAL_TIER_OVERRIDE: override,
    }))
    .map((item) => item.name);
}

test("Phase 7 defines the eight approved Day 1 segments", () => {
  assert.equal(manifest.segments.length, 8);
  assert.deepEqual(manifest.segments.map((item) => item.name), [
    "Anderseed - Cold Leads",
    "Anderseed - Warm Leads",
    "Anderseed - Hot Leads",
    "Anderseed - Super Hot Leads",
    "Anderseed - Service Only",
    "Anderseed - Invalid or Undeliverable Emails",
    "Anderseed - Suppressed",
    "Anderseed - Nurture Eligible",
  ]);
  assert.deepEqual(manifest.segments.map((item) => item.brevoId), [1, 2, 3, 4, 5, 6, 7, 8]);
});

test("every score from 0 to 100 belongs to exactly one temperature segment", () => {
  for (let score = 0; score <= 100; score += 1) {
    assert.equal(temperatureMatches(score).length, 1, `score ${score}`);
  }
});

test("temperature boundaries match the approved lead model", () => {
  assert.match(temperatureMatches(0)[0], /Cold/);
  assert.match(temperatureMatches(34)[0], /Cold/);
  assert.match(temperatureMatches(35)[0], /Warm/);
  assert.match(temperatureMatches(69)[0], /Warm/);
  assert.match(temperatureMatches(70)[0], /Hot Leads/);
  assert.match(temperatureMatches(89)[0], /Hot Leads/);
  assert.match(temperatureMatches(90)[0], /Super Hot/);
  assert.match(temperatureMatches(100)[0], /Super Hot/);
});

test("manual tier override takes priority over the calculated score", () => {
  assert.deepEqual(temperatureMatches(5, "Super Hot"), ["Anderseed - Super Hot Leads"]);
  assert.deepEqual(temperatureMatches(98, "Warm"), ["Anderseed - Warm Leads"]);
});

test("nurture eligibility requires consent, valid email and eligible status", () => {
  const eligible = segment("Anderseed - Nurture Eligible");
  assert.equal(conditionMatches(eligible.conditions, {
    MARKETING_CONSENT: true,
    NURTURE_STATUS: "Eligible",
    EMAIL_VALIDATION_STATUS: "Validated",
  }), true);
  assert.equal(conditionMatches(eligible.conditions, {
    MARKETING_CONSENT: false,
    NURTURE_STATUS: "Service only",
    EMAIL_VALIDATION_STATUS: "Validated",
  }), false);
});

test("suppressed and service-only contacts remain independently identifiable", () => {
  const suppressed = segment("Anderseed - Suppressed");
  const serviceOnly = segment("Anderseed - Service Only");
  assert.equal(conditionMatches(suppressed.conditions, {
    EMAIL_DELIVERY_STATUS: "Hard Bounce",
  }), true);
  assert.equal(conditionMatches(serviceOnly.conditions, {
    NURTURE_STATUS: "Service only",
  }), true);
});

test("invalid and undeliverable addresses have a focused data-quality segment", () => {
  const invalid = segment("Anderseed - Invalid or Undeliverable Emails");
  assert.equal(conditionMatches(invalid.conditions, {
    EMAIL_VALIDATION_STATUS: "Invalid",
  }), true);
  assert.equal(conditionMatches(invalid.conditions, {
    EMAIL_VALIDATION_STATUS: "Blocked",
  }), true);
  assert.equal(conditionMatches(invalid.conditions, {
    EMAIL_DELIVERY_STATUS: "Hard Bounce",
  }), true);
  assert.equal(conditionMatches(invalid.conditions, {
    EMAIL_DELIVERY_STATUS: "Soft Bounce",
  }), false);
});
