const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = path.resolve(__dirname, "..");
const distRoot = path.join(root, "dist");
const dataDirectory = path.join(root, ".local-data");
const dataFile = path.join(dataDirectory, "assessment-preview.json");
const assessment = require(path.join(root, "content/pages/assessment.json"));
const scoringConfig = require(path.join(root, "content/assessment-scoring.json"));
const settings = require(path.join(root, "content/settings.json"));
const scoring = require(path.join(root, "assets/assessment-scoring.js"));

const port = Number(process.env.ASSESSMENT_PREVIEW_PORT || 8792);
const host = "127.0.0.1";
const allowedEvents = new Set([
  "assessment_page_viewed",
  "assessment_started",
  "assessment_question_viewed",
  "assessment_question_answered",
  "assessment_completed",
  "email_gate_viewed",
  "contact_details_submitted",
  "result_viewed",
  "roadmap_cta_clicked",
  "anderseed_programme_cta_clicked",
  "exit_prompt_viewed",
  "exit_cancelled",
  "exit_confirmed",
  "assessment_restored",
  "draft_expired",
]);
const questionIds = new Set(assessment.questions.map((question) => question.id));
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function emptyStore() {
  return { runs: {}, contacts: {}, consents: {}, events: [] };
}

function readStore() {
  try {
    return { ...emptyStore(), ...JSON.parse(fs.readFileSync(dataFile, "utf8")) };
  } catch {
    return emptyStore();
  }
}

function writeStore(store) {
  fs.mkdirSync(dataDirectory, { recursive: true });
  const temporaryFile = `${dataFile}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(store, null, 2));
  fs.renameSync(temporaryFile, dataFile);
}

function json(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(payload));
}

function publicResult(result) {
  const { initialLeadScore, leadTemperature, leadTemperatureKey, leadComponents, internalSegment, ...safe } = result;
  return safe;
}

async function body(request, limit = 32768) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw new Error("Request is too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function tokenHash(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function validEvent(event) {
  return Boolean(
    event &&
    uuidPattern.test(String(event.eventId || "")) &&
    uuidPattern.test(String(event.analyticsSessionId || "")) &&
    allowedEvents.has(event.eventName) &&
    event.schemaVersion === assessment.schemaVersion &&
    event.scoringVersion === scoringConfig.scoringVersion &&
    (event.questionId == null || questionIds.has(event.questionId)) &&
    (event.questionNumber == null || (Number.isInteger(event.questionNumber) && event.questionNumber >= 1 && event.questionNumber <= 8))
  );
}

async function complete(request, response) {
  const payload = await body(request);
  if (!uuidPattern.test(String(payload.assessmentId || ""))) return json(response, 400, { ok: false, message: "A valid assessment ID is required." });
  if (payload.schemaVersion !== assessment.schemaVersion || payload.scoringVersion !== scoringConfig.scoringVersion) {
    return json(response, 409, { ok: false, message: "This assessment version is no longer current. Please refresh and try again." });
  }
  const validation = scoring.validateAnswers(payload.answers, assessment.questions);
  if (!validation.valid) return json(response, 400, { ok: false, message: "Please complete all eight assessment questions." });

  const store = readStore();
  if (store.runs[payload.assessmentId]?.contactSubmittedAt) {
    return json(response, 409, { ok: false, message: "This assessment has already been securely completed." });
  }
  const result = scoring.scoreAssessment(payload.answers, scoringConfig);
  const completionToken = crypto.randomBytes(32).toString("base64url");
  store.runs[payload.assessmentId] = {
    assessmentId: payload.assessmentId,
    schemaVersion: assessment.schemaVersion,
    scoringVersion: scoringConfig.scoringVersion,
    answers: payload.answers,
    result,
    completionTokenHash: tokenHash(completionToken),
    completedAt: new Date().toISOString(),
    contactSubmittedAt: null,
    resultViewedAt: null,
  };
  writeStore(store);
  return json(response, 201, { ok: true, assessmentId: payload.assessmentId, completionToken, result: publicResult(result) });
}

async function contact(request, response) {
  const payload = await body(request, 16384);
  const firstName = String(payload.firstName || "").trim().replace(/\s+/g, " ").slice(0, 80);
  const email = String(payload.email || "").trim().toLowerCase().slice(0, 254);
  if (!firstName) return json(response, 400, { ok: false, message: "Please enter your first name." });
  if (!emailPattern.test(email)) return json(response, 400, { ok: false, message: "Please enter a valid email address." });
  if (typeof payload.marketingOptIn !== "boolean") return json(response, 400, { ok: false, message: "Please record your marketing preference." });
  if (payload.marketingConsentTextVersion !== settings.assessment.marketingConsentTextVersion) {
    return json(response, 409, { ok: false, message: "This form version is no longer current. Please refresh and try again." });
  }
  const store = readStore();
  const run = store.runs[payload.assessmentId];
  if (!run || tokenHash(payload.completionToken) !== run.completionTokenHash) {
    return json(response, 410, { ok: false, message: "Your result link has expired. Please return to the assessment and try again." });
  }
  const now = new Date().toISOString();
  store.contacts[payload.assessmentId] = { assessmentId: payload.assessmentId, firstName, email, capturedAt: now };
  store.consents[payload.assessmentId] = {
    assessmentId: payload.assessmentId,
    optedIn: payload.marketingOptIn,
    consentTextVersion: payload.marketingConsentTextVersion,
    decisionCapturedAt: now,
    optedInAt: payload.marketingOptIn ? now : null,
  };
  run.contactSubmittedAt = now;
  run.resultViewedAt = now;
  writeStore(store);
  return json(response, 201, { ok: true, assessmentId: payload.assessmentId, persisted: true, result: publicResult(run.result) });
}

async function events(request, response) {
  const payload = await body(request, 24576);
  const incoming = Array.isArray(payload.events) ? payload.events.slice(0, 20) : [];
  if (!incoming.length || incoming.some((event) => !validEvent(event))) {
    return json(response, 400, { ok: false, message: "One or more analytics events are invalid." });
  }
  const store = readStore();
  const known = new Set(store.events.map((event) => event.eventId));
  for (const event of incoming) {
    if (known.has(event.eventId)) continue;
    store.events.push({
      eventId: event.eventId,
      analyticsSessionId: event.analyticsSessionId,
      eventName: event.eventName,
      schemaVersion: event.schemaVersion,
      scoringVersion: event.scoringVersion,
      questionId: event.questionId || null,
      questionNumber: event.questionNumber || null,
      clientTimestamp: event.clientTimestamp || null,
      serverTimestamp: new Date().toISOString(),
    });
  }
  writeStore(store);
  return json(response, 202, { ok: true, accepted: incoming.length });
}

function percentage(numerator, denominator) {
  return denominator ? Number(((numerator / denominator) * 100).toFixed(1)) : 0;
}

function funnel(response, url) {
  const store = readStore();
  const definitions = [
    ["page_viewed", "Assessment page viewed", "assessment_page_viewed", null],
    ["started", "Assessment started", "assessment_started", null],
    ...Array.from({ length: 8 }, (_, index) => [`question_${index + 1}_viewed`, `Question ${index + 1} reached`, "assessment_question_viewed", index + 1]),
    ["completed", "Assessment completed", "assessment_completed", null],
    ["gate_viewed", "Lead-capture screen viewed", "email_gate_viewed", null],
    ["contact_submitted", "Contact details submitted", "contact_details_submitted", null],
    ["result_viewed", "Personalised result viewed", "result_viewed", null],
    ["programme_cta_clicked", "Anderseed programme CTA clicked", "anderseed_programme_cta_clicked", null],
  ];
  const reached = definitions.map(([id, label, eventName, questionNumber]) => {
    const sessions = new Set(store.events.filter((event) => event.eventName === eventName && (questionNumber == null || event.questionNumber === questionNumber)).map((event) => event.analyticsSessionId));
    return { id, label, eventName, questionNumber, reach: sessions.size };
  });
  const pageReach = reached[0].reach;
  const steps = reached.map((step, index) => {
    const previous = index > 0 ? reached[index - 1] : null;
    const next = index < reached.length - 1 ? reached[index + 1] : null;
    const exits = next ? Math.max(0, step.reach - next.reach) : null;
    return {
      ...step,
      conversionFromPreviousPct: previous ? percentage(Math.min(step.reach, previous.reach), previous.reach) : null,
      conversionFromEntryPct: percentage(Math.min(step.reach, pageReach), pageReach),
      exits,
      dropOff: exits,
      dropOffPct: next ? percentage(exits, step.reach) : null,
      conversionToNextPct: next ? percentage(Math.min(next.reach, step.reach), step.reach) : null,
      unmatchedNextStepReach: next ? Math.max(0, next.reach - step.reach) : 0,
    };
  });
  const count = (name) => reached.find((step) => step.eventName === name)?.reach || 0;
  const roadmapClicks = new Set(store.events.filter((event) => event.eventName === "roadmap_cta_clicked").map((event) => event.analyticsSessionId)).size;
  const pageViews = count("assessment_page_viewed");
  const started = count("assessment_started");
  const completed = count("assessment_completed");
  const contacts = count("contact_details_submitted");
  const results = count("result_viewed");
  const assessmentAbandoned = Math.max(0, started - completed);
  const leadAbandoned = Math.max(0, completed - contacts);
  const today = new Date().toISOString().slice(0, 10);
  const defaultStart = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
  return json(response, 200, {
    ok: true,
    generatedAt: new Date().toISOString(),
    mode: "local-preview",
    range: { start: url.searchParams.get("start") || defaultStart, end: url.searchParams.get("end") || today, inclusiveDays: 30, schemaVersion: null },
    metricBasis: { unit: "anonymous session reach", detail: "Local preview sessions are deduplicated at every funnel step.", rawEventRetentionDays: 7 },
    summary: {
      assessmentPageViews: pageViews,
      assessmentsStarted: started,
      assessmentsCompleted: completed,
      contactsSubmitted: contacts,
      resultsViewed: results,
      startRatePct: percentage(Math.min(started, pageViews), pageViews),
      assessmentCompletionRatePct: percentage(Math.min(completed, started), started),
      leadCaptureRatePct: percentage(Math.min(contacts, completed), completed),
      resultRevealRatePct: percentage(Math.min(results, contacts), contacts),
      roadmapCtaClicks: roadmapClicks,
      programmeCtaClicks: count("anderseed_programme_cta_clicked"),
    },
    abandonment: {
      assessment: { entered: started, progressed: completed, abandoned: assessmentAbandoned, abandonmentRatePct: percentage(assessmentAbandoned, started), progressionRatePct: percentage(Math.min(completed, started), started), unmatchedProgressions: Math.max(0, completed - started) },
      leadCapture: { entered: completed, progressed: contacts, abandoned: leadAbandoned, abandonmentRatePct: percentage(leadAbandoned, completed), progressionRatePct: percentage(Math.min(contacts, completed), completed), unmatchedProgressions: Math.max(0, contacts - completed) },
    },
    funnel: steps,
    dataFreshness: { latestRawEventAt: store.events.at(-1)?.serverTimestamp || null, latestRollupAt: null },
    privacy: { containsPersonalData: false, contactDetailsIncluded: false, answerValuesIncluded: false },
  });
}

function contentType(file) {
  return ({ ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml" })[path.extname(file).toLowerCase()] || "application/octet-stream";
}

function serveStatic(request, response, url) {
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { return json(response, 400, { ok: false, message: "Invalid path." }); }
  let file = path.resolve(distRoot, `.${pathname}`);
  if (!file.startsWith(`${distRoot}${path.sep}`) && file !== distRoot) return json(response, 403, { ok: false, message: "Forbidden." });
  if (pathname.endsWith("/")) file = path.join(file, "index.html");
  else if (!path.extname(file) && fs.existsSync(path.join(file, "index.html"))) file = path.join(file, "index.html");
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return json(response, 404, { ok: false, message: "Not found." });
  const headers = { "Content-Type": contentType(file), "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  if (pathname.startsWith("/assessment/")) {
    headers["Content-Security-Policy"] = "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
  }
  response.writeHead(200, headers);
  fs.createReadStream(file).pipe(response);
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || `${host}:${port}`}`);
  try {
    if (request.method === "POST" && url.pathname === "/api/v1/assessment/complete") return await complete(request, response);
    if (request.method === "POST" && url.pathname === "/api/v1/assessment/contact") return await contact(request, response);
    if (request.method === "POST" && url.pathname === "/api/v1/assessment/events") return await events(request, response);
    if (request.method === "GET" && url.pathname === "/api/v1/admin/assessment-funnel") return funnel(response, url);
    if (request.method !== "GET" && request.method !== "HEAD") return json(response, 405, { ok: false, message: "Method not allowed." });
    return serveStatic(request, response, url);
  } catch {
    return json(response, 500, { ok: false, message: "The local preview could not complete that request." });
  }
});

server.listen(port, host, () => {
  process.stdout.write(`Anderseed BA Readiness preview: http://${host}:${port}/assessment/\n`);
});
