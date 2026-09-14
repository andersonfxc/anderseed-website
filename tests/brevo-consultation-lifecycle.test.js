const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const lifecycle = JSON.parse(fs.readFileSync(
  path.join(__dirname, "../integrations/brevo/consultation-lifecycle.json"),
  "utf8"
));

function matches(condition, contact) {
  if (condition.all) return condition.all.every((item) => matches(item, contact));
  if (condition.any) return condition.any.some((item) => matches(item, contact));
  const value = contact[condition.attribute];
  if (condition.operator === "is_empty") return value === undefined || value === null || value === "";
  if (condition.operator === "equals") return value === condition.value;
  throw new Error(`Unknown operator: ${condition.operator}`);
}

test("Hot consultation invitation waits 24 hours and does not permit re-entry", () => {
  const workflow = lifecycle.invitationWorkflow;
  assert.deepEqual(workflow.delay, { value: 24, unit: "hours" });
  assert.equal(workflow.trigger.segment, "Anderseed - Hot Leads");
  assert.equal(workflow.trigger.reentryAllowed, false);
});

test("only consented, validated and never-invited contacts pass the final send gate", () => {
  const eligible = {
    MARKETING_CONSENT: true,
    NURTURE_STATUS: "Eligible",
    EMAIL_VALIDATION_STATUS: "Validated",
    CONSULTATION_INVITED_DATE: "",
    CONSULTATION_STATUS: "",
  };
  assert.equal(matches(lifecycle.invitationWorkflow.preSendChecks, eligible), true);
  assert.equal(matches(lifecycle.invitationWorkflow.preSendChecks, { ...eligible, CONSULTATION_INVITED_DATE: "2026-09-13" }), false);
  assert.equal(matches(lifecycle.invitationWorkflow.preSendChecks, { ...eligible, CONSULTATION_STATUS: "Booked" }), false);
  assert.equal(matches(lifecycle.invitationWorkflow.preSendChecks, { ...eligible, CONSULTATION_STATUS: "Attended" }), false);
  assert.equal(matches(lifecycle.invitationWorkflow.preSendChecks, { ...eligible, CONSULTATION_STATUS: "No-show" }), false);
  assert.equal(matches(lifecycle.invitationWorkflow.preSendChecks, { ...eligible, MARKETING_CONSENT: false }), false);
});

test("consultation lifecycle keeps booked, attended and no-show contacts distinguishable", () => {
  assert.equal(lifecycle.lifecycleStates.Booked.updates.CONSULTATION_STATUS, "Booked");
  assert.equal(lifecycle.lifecycleStates.Attended.updates.CONSULTATION_STATUS, "Attended");
  assert.equal(lifecycle.lifecycleStates.NoShow.updates.CONSULTATION_STATUS, "No-show");
  assert.equal(lifecycle.lifecycleStates.NoShow.updates.CONSULTATION_NO_SHOW, true);
  assert.equal(lifecycle.brevoViews.length, 4);
  assert.deepEqual(lifecycle.brevoViews.map(({ name }) => name), [
    "Anderseed - Consultation Invited",
    "Anderseed - Consultation Booked",
    "Anderseed - Consultation Attended",
    "Anderseed - Consultation No-show",
  ]);
});

test("the invitation remains inactive until copy, booking URL and tests are complete", () => {
  assert.equal(lifecycle.status, "inactive_pending_template_and_booking_link");
  assert.equal(lifecycle.invitationWorkflow.actions[0].status, "pending_content_approval");
  assert.ok(lifecycle.activationRequirements.length >= 5);
});

test("Brevo Standard day-one operations use a manual outcome review", () => {
  const operations = lifecycle.dayOneOperations;
  assert.equal(operations.status, "approved_for_brevo_standard");
  assert.equal(operations.consultationReport.source, "Conversations > Meetings > Planned Meetings");
  assert.equal(operations.ownerReviewTask.name, "Review completed consultations");
  assert.match(operations.ownerReviewTask.limitation, /does not create this task automatically/i);
  assert.match(operations.attendanceRule, /confirm attendance manually/i);
});
