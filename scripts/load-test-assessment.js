const crypto = require("node:crypto");
const { performance } = require("node:perf_hooks");
const assessment = require("../content/pages/assessment.json");
const scoringConfig = require("../content/assessment-scoring.json");
const settings = require("../content/settings.json");

const baseUrl = String(process.env.BASE_URL || "http://127.0.0.1:8820").replace(/\/$/, "");
const scenario = String(process.env.SCENARIO || "page").toLowerCase();
const totalUsers = positiveInteger(process.env.TOTAL_USERS, 100);
const concurrency = Math.min(totalUsers, positiveInteger(process.env.CONCURRENCY, 20));
const timeoutMs = positiveInteger(process.env.REQUEST_TIMEOUT_MS, 30000);

const validScenarios = new Set(["page", "events", "complete", "journey", "journey-browser"]);
if (!validScenarios.has(scenario)) {
  throw new Error(`SCENARIO must be one of: ${[...validScenarios].join(", ")}`);
}

const answers = {
  analyticalProblemSolving: "root_cause",
  handlingAmbiguity: "clarify_need",
  transferableExperience: [
    "improve_process",
    "understand_needs",
    "data_reporting",
    "explain_complex",
    "solve_recurring",
    "structured_docs",
  ],
  problemFraming: "investigate_problem",
  careerPosition: "trained_not_ready",
  baExposure: "structured",
  primaryBarrier: "practical_experience",
  transitionTimeline: "asap",
};

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function percentile(sorted, value) {
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((value / 100) * sorted.length) - 1));
  return sorted[index];
}

function rounded(value) {
  return Number(value.toFixed(1));
}

function event(eventName, analyticsSessionId, question = null) {
  return {
    eventId: crypto.randomUUID(),
    analyticsSessionId,
    eventName,
    schemaVersion: assessment.schemaVersion,
    scoringVersion: scoringConfig.scoringVersion,
    questionId: question?.id || null,
    questionNumber: question?.number || null,
    clientTimestamp: new Date().toISOString(),
  };
}

function initialEvents(analyticsSessionId) {
  return [
    event("assessment_page_viewed", analyticsSessionId),
    event("assessment_started", analyticsSessionId),
    ...assessment.questions.flatMap((question, index) => {
      const context = { id: question.id, number: index + 1 };
      return [
        event("assessment_question_viewed", analyticsSessionId, context),
        event("assessment_question_answered", analyticsSessionId, context),
      ];
    }),
    event("assessment_completed", analyticsSessionId),
  ];
}

async function request(path, options, step, measurements) {
  const startedAt = performance.now();
  let response;
  let responseText = "";
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      signal: AbortSignal.timeout(timeoutMs),
    });
    responseText = await response.text();
  } catch (error) {
    measurements.push({ step, ok: false, status: 0, durationMs: performance.now() - startedAt, error: error.name || "RequestError" });
    throw error;
  }

  const durationMs = performance.now() - startedAt;
  measurements.push({ step, ok: response.ok, status: response.status, durationMs });
  let data = {};
  try { data = JSON.parse(responseText || "{}"); } catch {}
  if (!response.ok) {
    const error = new Error(data.message || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

function post(path, payload, step, measurements) {
  return request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(payload),
  }, step, measurements);
}

async function runUser(index, measurements) {
  const assessmentId = crypto.randomUUID();
  const analyticsSessionId = crypto.randomUUID();

  if (scenario === "page") {
    await request("/assessment/", { method: "GET" }, "assessment_page", measurements);
    return;
  }

  if (scenario === "events") {
    await post("/api/v1/assessment/events", {
      events: [...initialEvents(analyticsSessionId), event("email_gate_viewed", analyticsSessionId)],
    }, "analytics_batch", measurements);
    return;
  }

  if (scenario === "complete") {
    await post("/api/v1/assessment/complete", {
      assessmentId,
      schemaVersion: assessment.schemaVersion,
      scoringVersion: scoringConfig.scoringVersion,
      answers,
    }, "assessment_complete", measurements);
    return;
  }

  await request("/assessment/", { method: "GET" }, "assessment_page", measurements);
  const openingEvents = initialEvents(analyticsSessionId);
  if (scenario === "journey-browser") {
    for (const analyticsEvent of openingEvents) {
      await post("/api/v1/assessment/events", { events: [analyticsEvent] }, "analytics_event", measurements);
    }
  } else {
    await post("/api/v1/assessment/events", { events: openingEvents }, "analytics_initial", measurements);
  }
  const completion = await post("/api/v1/assessment/complete", {
    assessmentId,
    schemaVersion: assessment.schemaVersion,
    scoringVersion: scoringConfig.scoringVersion,
    answers,
  }, "assessment_complete", measurements);
  await post("/api/v1/assessment/events", {
    events: [event("email_gate_viewed", analyticsSessionId)],
  }, scenario === "journey-browser" ? "analytics_event" : "analytics_gate", measurements);
  await post("/api/v1/assessment/contact", {
    assessmentId,
    completionToken: completion.completionToken,
    firstName: `Load Test ${index + 1}`,
    email: `loadtest+${assessmentId}@example.test`,
    marketingOptIn: false,
    marketingConsentTextVersion: settings.assessment.marketingConsentTextVersion,
  }, "contact_submit", measurements);
  const closingEvents = [
    event("contact_details_submitted", analyticsSessionId),
    event("result_viewed", analyticsSessionId),
  ];
  if (scenario === "journey-browser") {
    for (const analyticsEvent of closingEvents) {
      await post("/api/v1/assessment/events", { events: [analyticsEvent] }, "analytics_event", measurements);
    }
  } else {
    await post("/api/v1/assessment/events", { events: closingEvents }, "analytics_final", measurements);
  }
}

async function runPool() {
  const measurements = [];
  const userDurations = [];
  const failures = [];
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= totalUsers) return;
      const startedAt = performance.now();
      try {
        await runUser(index, measurements);
      } catch (error) {
        failures.push({ user: index + 1, status: error.status || 0, error: error.message });
      } finally {
        userDurations.push(performance.now() - startedAt);
      }
    }
  }

  const startedAt = performance.now();
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const elapsedMs = performance.now() - startedAt;
  return { measurements, userDurations, failures, elapsedMs };
}

function latencySummary(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((total, value) => total + value, 0);
  return {
    minMs: rounded(sorted[0] || 0),
    averageMs: rounded(sorted.length ? sum / sorted.length : 0),
    p50Ms: rounded(percentile(sorted, 50)),
    p95Ms: rounded(percentile(sorted, 95)),
    p99Ms: rounded(percentile(sorted, 99)),
    maxMs: rounded(sorted.at(-1) || 0),
  };
}

function summarize({ measurements, userDurations, failures, elapsedMs }) {
  const steps = {};
  for (const measurement of measurements) {
    const group = steps[measurement.step] || { requests: 0, successes: 0, failures: 0, statuses: {}, durations: [] };
    group.requests += 1;
    group.successes += measurement.ok ? 1 : 0;
    group.failures += measurement.ok ? 0 : 1;
    group.statuses[measurement.status] = (group.statuses[measurement.status] || 0) + 1;
    group.durations.push(measurement.durationMs);
    steps[measurement.step] = group;
  }
  for (const group of Object.values(steps)) {
    Object.assign(group, latencySummary(group.durations));
    delete group.durations;
  }
  const completedUsers = totalUsers - failures.length;
  return {
    testedAt: new Date().toISOString(),
    target: baseUrl,
    scenario,
    totalUsers,
    concurrency,
    elapsedSeconds: rounded(elapsedMs / 1000),
    userThroughputPerSecond: rounded(totalUsers / (elapsedMs / 1000)),
    completedUsers,
    failedUsers: failures.length,
    successRatePct: rounded((completedUsers / totalUsers) * 100),
    userLatency: latencySummary(userDurations),
    steps,
    sampleFailures: failures.slice(0, 10),
  };
}

runPool()
  .then((result) => process.stdout.write(`${JSON.stringify(summarize(result), null, 2)}\n`))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
