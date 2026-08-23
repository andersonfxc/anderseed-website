const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const expectedEvents = [
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
];

function tableDefinition(migration, tableName) {
  const match = migration.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${tableName} \\(([\\s\\S]*?)\\n\\);`));
  assert.ok(match, `missing ${tableName} table`);
  return match[1];
}

test("all required anonymous funnel events are emitted and accepted", () => {
  const client = read("assets/assessment.js");
  const backendUtils = read("netlify/functions/_assessment-utils.mjs");

  for (const eventName of expectedEvents) {
    assert.match(client, new RegExp(`trackEvent\\("${eventName}"`), `client does not emit ${eventName}`);
    assert.match(backendUtils, new RegExp(`"${eventName}"`), `backend does not allow ${eventName}`);
  }

  assert.match(
    client,
    /trackEvent\("assessment_question_viewed", \{ question_id: question\.id, question_number: state\.step \+ 1 \}\)/
  );
  assert.match(
    client,
    /trackEvent\("assessment_question_answered", \{ question_id: question\.id, question_number: state\.step \+ 1 \}\)/
  );
  assert.match(client, /window\.sessionStorage\.getItem\(analyticsKey\)/);
  assert.match(client, /window\.sessionStorage\.setItem\(analyticsKey, id\)/);
});

test("the actual analytics payload excludes identity, answers and contact consent", async () => {
  const client = read("assets/assessment.js");
  const instrumented = client.replace(
    "  function show(view) {",
    "  globalThis.__assessmentTrackEvent = trackEvent;\n  return;\n  function show(view) {"
  );
  assert.notEqual(instrumented, client, "could not instrument the analytics function");

  let fetchRequest;
  let gtagRequest;
  const session = new Map();
  const context = {
    Blob,
    CustomEvent: class CustomEvent {
      constructor(type, options) { this.type = type; this.detail = options.detail; }
    },
    document: {
      getElementById: () => ({
        textContent: JSON.stringify({
          schemaVersion: "ba-readiness-mvp-v2",
          scoring: { scoringVersion: "2026-08-22-v1" },
          endpoints: { events: "/api/v1/assessment/events" },
        }),
      }),
      querySelector: () => ({ querySelector: () => null }),
    },
    navigator: {},
    window: {
      crypto: { randomUUID: () => crypto.randomUUID() },
      AnderseedAssessmentScoring: { validateConfig: () => true },
      sessionStorage: {
        getItem: (key) => session.get(key) || null,
        setItem: (key, value) => session.set(key, value),
      },
      dispatchEvent: () => true,
      gtag: (...args) => { gtagRequest = args; },
      fetch: async (url, options) => {
        fetchRequest = { url, options };
        return { ok: true };
      },
    },
  };
  vm.runInNewContext(instrumented, context);

  context.__assessmentTrackEvent("assessment_question_viewed", {
    question_id: "handlingAmbiguity",
    question_number: 2,
    firstName: "Must not leave the browser",
    email: "private@example.com",
    answers: { handlingAmbiguity: "clarify_need" },
    marketingOptIn: true,
  });

  assert.equal(fetchRequest.url, "/api/v1/assessment/events");
  const payload = JSON.parse(fetchRequest.options.body);
  assert.equal(payload.events.length, 1);
  const event = payload.events[0];
  assert.deepEqual(Object.keys(event).sort(), [
    "analyticsSessionId",
    "clientTimestamp",
    "eventId",
    "eventName",
    "questionId",
    "questionNumber",
    "schemaVersion",
    "scoringVersion",
  ]);
  assert.equal(event.eventName, "assessment_question_viewed");
  assert.equal(event.questionId, "handlingAmbiguity");
  assert.equal(event.questionNumber, 2);
  assert.match(event.eventId, /^[0-9a-f-]{36}$/i);
  assert.match(event.analyticsSessionId, /^[0-9a-f-]{36}$/i);
  assert.doesNotMatch(JSON.stringify(payload), /private@example|Must not leave|clarify_need|marketingOptIn/i);
  assert.deepEqual(JSON.parse(JSON.stringify(gtagRequest)), [
    "event",
    "assessment_question_viewed",
    {
      assessment_version: "ba-readiness-mvp-v2",
      question_id: "handlingAmbiguity",
      question_number: 2,
    },
  ]);
});

test("the central PostHog bridge forwards each assessment event once with only approved non-PII properties", () => {
  const homepage = read("dist/index.html");
  const match = homepage.match(/\/\* Anderseed PostHog assessment bridge \*\/([\s\S]*?)\/\* End Anderseed PostHog assessment bridge \*\//);
  assert.ok(match, "the generated site must include the central PostHog assessment bridge");

  const runBridge = (hostname, captureImpl) => {
    const listeners = new Map();
    const captures = [];
    const window = {
      location: { hostname },
      posthog: {
        capture: (...args) => {
          captures.push(args);
          if (captureImpl) captureImpl(...args);
        },
      },
      addEventListener: (name, listener) => {
        assert.equal(name, "anderseed:analytics");
        assert.equal(listeners.has(name), false, "the bridge must install only one listener");
        listeners.set(name, listener);
      },
    };
    const context = vm.createContext({ window, Set, Object, String });
    vm.runInContext(match[1], context);
    vm.runInContext(match[1], context);
    return { captures, listener: listeners.get("anderseed:analytics") };
  };

  const production = runBridge("singular-cendol-c4edc0.netlify.app");
  const detail = {
    eventId: "a8a7ab56-1d30-4f45-b5e9-a9a8adc96f9a",
    analyticsSessionId: "a5bb2e3d-9d2a-48b4-8b41-3055116df8c2",
    eventName: "assessment_question_viewed",
    schemaVersion: "ba-readiness-mvp-v2",
    scoringVersion: "2026-08-22-v1",
    questionId: "handlingAmbiguity",
    questionNumber: 2,
    clientTimestamp: "2026-08-23T12:00:00.000Z",
    firstName: "Must not reach PostHog",
    email: "private@example.com",
    marketingOptIn: true,
    answers: { handlingAmbiguity: "clarify_need" },
    readinessScore: 82,
    personalisedResult: { stage: "Established" },
  };

  production.listener({ detail });
  production.listener({ detail });
  assert.equal(production.captures.length, 1, "the same assessment eventId must not be captured twice");
  assert.deepEqual(JSON.parse(JSON.stringify(production.captures[0])), [
    "assessment_question_viewed",
    {
      environment: "production",
      event_id: detail.eventId,
      assessment_version: detail.schemaVersion,
      scoring_version: detail.scoringVersion,
      analytics_session_id: detail.analyticsSessionId,
      question_id: detail.questionId,
      question_number: detail.questionNumber,
      client_timestamp: detail.clientTimestamp,
    },
  ]);
  assert.doesNotMatch(JSON.stringify(production.captures), /private@example|Must not reach|clarify_need|marketingOptIn|readinessScore|Established/i);

  const development = runBridge("localhost");
  development.listener({ detail: { ...detail, eventId: "b56b00c2-510f-43ca-bd17-1cb118323d6b" } });
  assert.equal(development.captures[0][1].environment, "development");

  const testTraffic = runBridge("deploy-preview-42--anderseed.netlify.app");
  testTraffic.listener({ detail: { ...detail, eventId: "35655f27-d3e4-4f98-b2aa-a4a7f7fb5df8" } });
  assert.equal(testTraffic.captures[0][1].environment, "test");

  const resilient = runBridge("localhost", () => { throw new Error("PostHog unavailable"); });
  assert.doesNotThrow(() => resilient.listener({ detail: { ...detail, eventId: "e4aeb370-f4ab-4efb-bf1d-664f28d962cc" } }));
});

test("assessment, contact, consent and analytics data are structurally separated", () => {
  const migration = read("netlify/database/migrations/20260822090000_create_assessment_mvp.sql");
  const runs = tableDefinition(migration, "assessment_runs");
  const answers = tableDefinition(migration, "assessment_answers");
  const contacts = tableDefinition(migration, "assessment_contacts");
  const consents = tableDefinition(migration, "assessment_marketing_consents");
  const events = tableDefinition(migration, "assessment_events");

  for (const column of [
    "assessment_id",
    "schema_version",
    "scoring_version",
    "answers_json",
    "readiness_score",
    "growth_stage",
    "analytical_score",
    "transferable_score",
    "development_score",
    "market_score",
    "primary_growth_area",
    "career_position",
    "ba_exposure",
    "transition_timeline",
    "initial_lead_score",
    "lead_temperature",
    "completed_at",
  ]) {
    assert.match(runs, new RegExp(`\\b${column}\\b`));
  }
  assert.match(answers, /question_id TEXT NOT NULL/);
  assert.match(answers, /answer_value TEXT NOT NULL/);
  assert.match(answers, /selection_order SMALLINT NOT NULL/);
  assert.match(contacts, /first_name TEXT NOT NULL/);
  assert.match(contacts, /email TEXT NOT NULL/);
  assert.match(consents, /opted_in BOOLEAN NOT NULL/);
  assert.match(consents, /consent_text_version TEXT NOT NULL/);

  assert.match(events, /analytics_session_id UUID NOT NULL/);
  assert.match(events, /event_name TEXT NOT NULL/);
  assert.match(events, /question_id TEXT/);
  assert.match(events, /question_number SMALLINT/);
  assert.doesNotMatch(events, /first_name|email|answers_json|assessment_id|marketing/i);
  assert.match(migration, /REFERENCES assessment_runs\(assessment_id\) ON DELETE CASCADE/g);
});

test("the completion API validates and recomputes results server-side, then stores every Q3 selection separately", () => {
  const complete = read("netlify/functions/assessment-complete.mjs");
  const contact = read("netlify/functions/assessment-contact.mjs");
  const events = read("netlify/functions/assessment-events.mjs");
  const helpers = read("netlify/functions/_assessment-utils.mjs");

  assert.match(complete, /scoring\.validateAnswers\(body\.answers, assessmentContent\.questions\)/);
  assert.match(complete, /scoring\.scoreAssessment\(body\.answers, scoringConfig\)/);
  assert.match(complete, /randomBytes\(32\)/);
  assert.match(complete, /completion_token_hash/);
  assert.match(complete, /const values = Array\.isArray\(body\.answers\[question\.id\]\)/);
  assert.match(complete, /INSERT INTO assessment_answers/);
  assert.match(complete, /values\[index\], index/);

  assert.match(contact, /normalizeName\(body\.firstName\)/);
  assert.match(contact, /normalizeEmail\(body\.email\)/);
  assert.match(contact, /tokenMatches\(body\.completionToken/);
  assert.match(contact, /INSERT INTO assessment_contacts/);
  assert.match(contact, /ON CONFLICT \(assessment_id\) DO UPDATE/);
  assert.match(contact, /INSERT INTO assessment_marketing_consents/);
  assert.match(contact, /Boolean\(body\.marketingOptIn\)/);
  assert.match(contact, /persisted: true/);

  assert.match(events, /COUNT|INSERT INTO assessment_events|accepted: events\.length/);
  assert.match(events, /event\.questionId/);
  assert.match(events, /event\.questionNumber/);
  assert.doesNotMatch(events, /firstName|normalizeEmail|answers_json|assessment_contacts/);
  assert.doesNotMatch(helpers, /Brevo/i);
  assert.doesNotMatch(complete + contact + events, /Brevo|brevo\.com/i);
});

test("assessment endpoints and retention are configured independently of Brevo", () => {
  const settings = JSON.parse(read("content/settings.json"));
  const maintenance = read("netlify/functions/assessment-funnel-maintenance.mjs");
  const migration = read("netlify/database/migrations/20260822090000_create_assessment_mvp.sql");

  assert.deepEqual(
    {
      complete: settings.assessment.completionEndpoint,
      contact: settings.assessment.contactEndpoint,
      events: settings.assessment.eventEndpoint,
      report: settings.assessment.reportEndpoint,
    },
    {
      complete: "/api/v1/assessment/complete",
      contact: "/api/v1/assessment/contact",
      events: "/api/v1/assessment/events",
      report: "/api/v1/admin/assessment-funnel",
    }
  );
  assert.equal(settings.assessment.progressTtlHours, 24);
  assert.equal(settings.assessment.marketingAutomationEnabled, false);
  assert.equal(settings.assessment.unclaimedAssessmentRetentionDays, 7);
  assert.equal(settings.assessment.rawEventRetentionDays, 7);
  assert.equal(settings.assessment.namedLeadRetentionMonths, 12);
  assert.match(maintenance, /schedule: "15 2 \* \* \*"/);
  assert.match(maintenance, /DELETE FROM assessment_events WHERE server_timestamp < NOW\(\) - INTERVAL '7 days'/);
  assert.match(maintenance, /DELETE FROM assessment_runs WHERE expires_at < NOW\(\)/);
  assert.match(migration, /expires_at TIMESTAMPTZ NOT NULL DEFAULT \(NOW\(\) \+ INTERVAL '7 days'\)/);
});

test("the anonymous funnel report calculates reach, exits, conversion and both abandonment types", async () => {
  const reporting = await import(pathToFileURL(path.join(root, "netlify/functions/_assessment-reporting-utils.mjs")).href);
  const row = (event_name, session_reach, question_number = 0) => ({
    schema_version: "ba-readiness-mvp-v2",
    event_name,
    question_id: question_number ? `q${question_number}` : "",
    question_number,
    session_reach,
  });
  const rows = [
    row("assessment_page_viewed", 100),
    row("assessment_started", 80),
    ...[78, 70, 65, 60, 55, 50, 45, 40].map((reach, index) => row("assessment_question_viewed", reach, index + 1)),
    row("assessment_completed", 38),
    row("email_gate_viewed", 38),
    row("contact_details_submitted", 24),
    row("result_viewed", 23),
    row("roadmap_cta_clicked", 12),
    row("anderseed_programme_cta_clicked", 10),
  ];
  const report = reporting.buildFunnelReport(rows, {
    start: "2026-08-01",
    end: "2026-08-31",
    inclusiveDays: 31,
    schemaVersion: "ba-readiness-mvp-v2",
    latestRawEventAt: "2026-08-31T12:00:00.000Z",
    latestRollupAt: "2026-08-31T02:15:00.000Z",
  });

  assert.equal(report.ok, true);
  assert.equal(report.metricBasis.unit, "anonymous session reach");
  assert.equal(report.funnel.length, 15);
  assert.deepEqual(report.funnel.slice(2, 10).map(({ id }) => id), [
    "question_1_viewed",
    "question_2_viewed",
    "question_3_viewed",
    "question_4_viewed",
    "question_5_viewed",
    "question_6_viewed",
    "question_7_viewed",
    "question_8_viewed",
  ]);
  assert.equal(report.funnel.at(-1).id, "programme_cta_clicked");
  assert.deepEqual(report.summary, {
    assessmentPageViews: 100,
    assessmentsStarted: 80,
    assessmentsCompleted: 38,
    contactsSubmitted: 24,
    resultsViewed: 23,
    startRatePct: 80,
    assessmentCompletionRatePct: 47.5,
    leadCaptureRatePct: 63.2,
    resultRevealRatePct: 95.8,
    roadmapCtaClicks: 12,
    programmeCtaClicks: 10,
  });
  assert.deepEqual(report.abandonment.assessment, {
    entered: 80,
    progressed: 38,
    abandoned: 42,
    abandonmentRatePct: 52.5,
    progressionRatePct: 47.5,
    unmatchedProgressions: 0,
  });
  assert.deepEqual(report.abandonment.leadCapture, {
    entered: 38,
    progressed: 24,
    abandoned: 14,
    abandonmentRatePct: 36.8,
    progressionRatePct: 63.2,
    unmatchedProgressions: 0,
  });
  assert.equal(report.funnel[0].exits, 20);
  assert.equal(report.funnel[0].dropOffPct, 20);
  assert.equal(report.funnel[1].conversionFromPreviousPct, 80);
  assert.equal(report.funnel[9].reach, 40);
  assert.equal(report.funnel[9].exits, 2);
  assert.deepEqual(report.privacy, {
    containsPersonalData: false,
    contactDetailsIncluded: false,
    answerValuesIncluded: false,
  });

  assert.deepEqual(
    reporting.parseReportRange(new URL("https://example.test/report?start=2026-08-01&end=2026-08-31&schemaVersion=ba-readiness-mvp-v2")),
    {
      ok: true,
      start: "2026-08-01",
      end: "2026-08-31",
      inclusiveDays: 31,
      schemaVersion: "ba-readiness-mvp-v2",
    }
  );
});

test("the funnel report is protected and its UI does not persist the admin token", () => {
  const endpoint = read("netlify/functions/assessment-funnel-report.mjs");
  const helpers = read("netlify/functions/_assessment-reporting-utils.mjs");
  const ui = read("admin/assessment-report/index.html");
  const uiScript = read("admin/assessment-report/report.js");
  const netlify = read("netlify.toml");

  assert.match(endpoint, /request\.method !== "GET"/);
  assert.match(endpoint, /authorizeReportingRequest\(request\)/);
  assert.match(endpoint, /COUNT\(DISTINCT analytics_session_id\)/);
  assert.match(endpoint, /path: "\/api\/v1\/admin\/assessment-funnel"/);
  assert.match(helpers, /ASSESSMENT_REPORTING_ADMIN_SECRET/);
  assert.match(helpers, /expected\.length < 32/);
  assert.match(helpers, /authorization\.match\(\/\^Bearer/);
  assert.match(helpers, /timingSafeEqual/);
  assert.match(ui, /BA Assessment Funnel/);
  assert.match(ui, /type="password" name="token"/);
  assert.match(ui, /Assessment abandonment/);
  assert.match(ui, /Lead-capture abandonment/);
  assert.match(ui, /Conversion and exits/);
  assert.match(uiScript, /Authorization: `Bearer \$\{token\}`/);
  assert.doesNotMatch(uiScript, /localStorage|sessionStorage|document\.cookie/);
  assert.match(netlify, /X-Robots-Tag = "noindex, nofollow, noarchive"/);
  assert.match(netlify, /Cache-Control = "no-store"/);
});
