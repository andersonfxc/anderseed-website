const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const assessment = require("../content/pages/assessment.json");
const scoringConfig = require("../content/assessment-scoring.json");
const settings = require("../content/settings.json");

const base = process.env.ASSESSMENT_PREVIEW_URL || "http://127.0.0.1:8792";
const assessmentId = crypto.randomUUID();
const analyticsSessionId = crypto.randomUUID();
const answers = {
  analyticalProblemSolving: "root_cause",
  handlingAmbiguity: "clarify_need",
  transferableExperience: ["improve_process", "understand_needs", "data_reporting", "explain_complex", "solve_recurring", "structured_docs"],
  problemFraming: "investigate_problem",
  careerPosition: "trained_not_ready",
  baExposure: "structured",
  primaryBarrier: "practical_experience",
  transitionTimeline: "asap",
};

async function readJson(response) {
  const data = await response.json();
  assert.equal(response.ok, true, data.message || `HTTP ${response.status}`);
  return data;
}

async function post(path, payload) {
  return readJson(await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(payload),
  }));
}

async function run() {
  const page = await fetch(`${base}/assessment/`);
  const html = await page.text();
  assert.equal(page.ok, true);
  assert.match(html, /Discover how ready you are for/);
  assert.match(html, /<span>Business Analysis<\/span>/);

  const events = [
    ["assessment_page_viewed", null],
    ["assessment_started", null],
    ...assessment.questions.map((question, index) => ["assessment_question_viewed", { id: question.id, number: index + 1 }]),
    ["assessment_completed", null],
    ["email_gate_viewed", null],
  ].map(([eventName, question]) => ({
    eventId: crypto.randomUUID(),
    analyticsSessionId,
    eventName,
    schemaVersion: assessment.schemaVersion,
    scoringVersion: scoringConfig.scoringVersion,
    questionId: question?.id || null,
    questionNumber: question?.number || null,
    clientTimestamp: new Date().toISOString(),
  }));
  await post("/api/v1/assessment/events", { events });

  const completion = await post("/api/v1/assessment/complete", {
    assessmentId,
    schemaVersion: assessment.schemaVersion,
    scoringVersion: scoringConfig.scoringVersion,
    answers,
  });
  assert.equal(typeof completion.result.readinessScore, "number");
  assert.equal(completion.result.primaryGrowthArea, "Applied Experience");
  assert.equal("leadTemperature" in completion.result, false, "internal lead temperature must not be public");

  const contact = await post("/api/v1/assessment/contact", {
    assessmentId,
    completionToken: completion.completionToken,
    firstName: "Preview",
    email: "preview@example.invalid",
    marketingOptIn: false,
    marketingConsentTextVersion: settings.assessment.marketingConsentTextVersion,
  });
  assert.equal(contact.persisted, true);

  await post("/api/v1/assessment/events", {
    events: ["contact_details_submitted", "result_viewed"].map((eventName) => ({
      eventId: crypto.randomUUID(),
      analyticsSessionId,
      eventName,
      schemaVersion: assessment.schemaVersion,
      scoringVersion: scoringConfig.scoringVersion,
      questionId: null,
      questionNumber: null,
      clientTimestamp: new Date().toISOString(),
    })),
  });

  const report = await readJson(await fetch(`${base}/api/v1/admin/assessment-funnel`));
  assert.ok(report.summary.assessmentCompletionRatePct >= 0);
  assert.equal(report.abandonment.leadCapture.abandoned, 0);
  process.stdout.write(`Smoke test passed: ${contact.result.readinessStage}, ${contact.result.readinessScore}/100, ${contact.result.primaryGrowthArea}.\n`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
