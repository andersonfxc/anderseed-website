const test = require("node:test");
const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test.before(() => {
  childProcess.execFileSync(process.execPath, ["scripts/build.js"], {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
  });
});

function embeddedAssessmentConfig(html) {
  const match = html.match(/<script id="assessment-config" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(match, "the generated assessment must embed its versioned configuration");
  return JSON.parse(match[1]);
}

function between(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0, `missing start marker: ${startMarker}`);
  assert.ok(end > start, `missing end marker: ${endMarker}`);
  return source.slice(start, end);
}

test("optional analytics remain opt-in without blocking generated public pages", () => {
  const publicPages = [
    "dist/index.html",
    "dist/about/index.html",
    "dist/assessment/index.html",
    "dist/blog/index.html",
    "dist/blog/ba-interview-questions/index.html",
    "dist/blog/business-analyst-cv-recruiters/index.html",
    "dist/blog/how-to-become-a-business-analyst-with-no-it-experience/index.html",
    "dist/blog/requirements-gathering-new-business-analysts/index.html",
    "dist/checkout/index.html",
    "dist/faq/index.html",
    "dist/privacy/index.html",
    "dist/roadmap/index.html",
    "dist/terms/index.html",
  ];

  for (const page of publicPages) {
    const html = read(page);
    const head = between(html, "<head>", "</head>");
    const posthogLoader = between(head, "function loadPostHog()", "function activatePostHog()");
    assert.equal((head.match(/posthog\.init\(/g) || []).length, 1, `${page} should initialise PostHog once`);
    assert.match(posthogLoader, /posthog\.init\(/, `${page} should keep PostHog inside the deferred loader`);
    assert.match(head, /if\(readChoice\(\)===accepted\)activatePostHog\(\)/, `${page} should load persisted opt-in choices only`);
    assert.match(head, /window\.localStorage\.setItem\(consentKey,choice\)/);
    assert.match(head, /window\.posthog\.opt_out_capturing\(\)/);
    assert.match(head, /phc_xPv9uMsaKk5fSBsVeJjUByT6hzhskg5Lrj9AcyK2rsmf/);
    assert.match(head, /api_host:\s*'https:\/\/eu\.i\.posthog\.com'/);
    assert.match(head, /defaults:\s*'2026-05-30'/);
    assert.match(head, /person_profiles:\s*'identified_only'/);
    assert.equal((head.match(/Anderseed PostHog assessment bridge/g) || []).length, 2);
    assert.equal((html.match(/<aside class="analytics-consent"/g) || []).length, 1, `${page} should show one consent panel`);
    assert.equal((html.match(/<button class="analytics-settings"/g) || []).length, 1, `${page} should provide one preferences control`);
    assert.match(html, /<aside class="analytics-consent"[^>]*role="region"/);
    assert.doesNotMatch(html, /aria-modal="true"/);
    assert.match(html, /aria-describedby="analyticsConsentDescription"/);
    assert.match(html, /<div class="analytics-consent-card">/);
    assert.match(head, /\.analytics-consent\{position:fixed;[^}]*bottom:/);
    assert.match(head, /html\.assessment-prompt-visible \.analytics-consent\{visibility:hidden;pointer-events:none/);
    assert.doesNotMatch(head, /analytics-consent-required|setPageLocked|containDialogFocus/);
    assert.match(head, /document\.querySelector\("aside\[data-analytics-consent\]"\)/);
    assert.match(head, /querySelector\('\[data-consent-choice="accepted"\]'\)/);
    assert.match(head, /document\.querySelector\("footer \.footer-links"\)\|\|document\.querySelector\("footer"\)/);
    assert.match(head, /footerDestination\.appendChild\(settingsButton\)/);
    assert.match(head, /restorePageFocus\(focusTarget\)/);
    assert.doesNotMatch(head, /\.analytics-settings\{position:fixed/);
    assert.match(html, /data-consent-choice="rejected">Reject non-essential</);
    assert.match(html, /data-consent-choice="accepted">Accept analytics</);
    const consentGate = between(html, '<aside class="analytics-consent"', "</aside>");
    assert.ok(
      consentGate.indexOf('data-consent-choice="accepted"') < consentGate.indexOf('data-consent-choice="rejected"'),
      `${page} should present Accept analytics as the primary action before Reject non-essential`
    );
    assert.doesNotMatch(html, /data-consent-close/);
  }
});

test("the delayed assessment prompt is central, selective, engagement-delayed, and accessible", () => {
  const eligiblePages = [
    ["dist/index.html", "assessment/index.html?intro=1", "assets/assessment-prompt"],
    ["dist/about/index.html", "../assessment/index.html?intro=1", "../assets/assessment-prompt"],
    ["dist/faq/index.html", "../assessment/index.html?intro=1", "../assets/assessment-prompt"],
    ["dist/blog/index.html", "../assessment/index.html?intro=1", "../assets/assessment-prompt"],
    ["dist/blog/ba-interview-questions/index.html", "../../assessment/index.html?intro=1", "../../assets/assessment-prompt"],
    ["dist/blog/business-analyst-cv-recruiters/index.html", "../../assessment/index.html?intro=1", "../../assets/assessment-prompt"],
    ["dist/blog/how-to-become-a-business-analyst-with-no-it-experience/index.html", "../../assessment/index.html?intro=1", "../../assets/assessment-prompt"],
    ["dist/blog/requirements-gathering-new-business-analysts/index.html", "../../assessment/index.html?intro=1", "../../assets/assessment-prompt"],
  ];
  const excludedPages = [
    "dist/assessment/index.html",
    "dist/checkout/index.html",
    "dist/privacy/index.html",
    "dist/terms/index.html",
    "dist/roadmap/index.html",
  ];

  for (const [page, assessmentHref, assetBase] of eligiblePages) {
    const html = read(page);
    assert.equal((html.match(/data-assessment-prompt(?:\s|>)/g) || []).length, 1, `${page} should contain one prompt`);
    assert.match(html, new RegExp(`href="${assessmentHref.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
    assert.match(html, new RegExp(`href="${assetBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.css"`));
    assert.match(html, new RegExp(`src="${assetBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.js" defer`));
    assert.match(html, /aria-label="Free BA readiness assessment"/);
    assert.match(html, /data-assessment-prompt-close aria-label="Dismiss assessment prompt"/);
    assert.match(html, /Discover your Business Analysis readiness/);
    assert.match(html, /Take the free 2–3 minute assessment\./);
    assert.match(html, />Start assessment <span aria-hidden="true">→<\/span><\/a>/);
  }

  for (const page of excludedPages) {
    const html = read(page);
    assert.doesNotMatch(html, /data-assessment-prompt(?:\s|>)/, `${page} should not contain the prompt`);
    assert.doesNotMatch(html, /assessment-prompt\.(?:css|js)/, `${page} should not load prompt assets`);
  }

  const script = read("assets/assessment-prompt.js");
  const styles = read("assets/assessment-prompt.css");
  assert.match(script, /const standardDelayMs = 18000/);
  assert.match(script, /const delayMs = previewMode \? 1200 : standardDelayMs/);
  assert.match(script, /localHostname && \/\(\?:\^\|\[\?&\]\)assessmentPromptPreview=1/);
  assert.match(script, /const scrollThreshold = 0\.3/);
  assert.match(script, /const dismissForMs = 14 \* 24 \* 60 \* 60 \* 1000/);
  assert.doesNotMatch(script, /consentDecided|data-analytics-consent|anderseed:analytics-consent-changed/);
  assert.match(script, /window\.sessionStorage, shownKey/);
  assert.match(script, /window\.localStorage, dismissedKey/);
  assert.match(script, /window\.localStorage, startedKey/);
  assert.match(script, /capture\("assessment_prompt_shown", \{ trigger: trigger \}\)/);
  assert.match(script, /capture\("assessment_prompt_clicked"\)/);
  assert.match(script, /capture\("assessment_prompt_dismissed"\)/);
  assert.equal((script.match(/capture\("assessment_prompt_shown"/g) || []).length, 1);
  assert.match(styles, /html\.assessment-prompt-visible \.tg-float/);
  assert.match(styles, /@media\(max-width:680px\)/);
  assert.match(styles, /env\(safe-area-inset-bottom,0px\)/);
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)/);
});

test("the assessment prompt replaces Telegram after engagement and restores it after dismissal", () => {
  const source = read("assets/assessment-prompt.js");
  const rootClasses = new Set();
  const promptClasses = new Set();
  const localValues = new Map();
  const sessionValues = new Map();
  const windowListeners = new Map();
  const documentListeners = new Map();
  const closeListeners = new Map();
  const ctaListeners = new Map();
  const timers = [];
  const captures = [];
  const classList = (values) => ({
    add: (...names) => names.forEach((name) => values.add(name)),
    remove: (...names) => names.forEach((name) => values.delete(name)),
  });
  const storage = (values) => ({
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, String(value)),
  });
  const closeButton = { addEventListener: (name, listener) => closeListeners.set(name, listener) };
  const cta = { addEventListener: (name, listener) => ctaListeners.set(name, listener) };
  const prompt = {
    hidden: true,
    classList: classList(promptClasses),
    querySelector: (selector) => selector.includes("close") ? closeButton : cta,
  };
  const documentElement = {
    scrollHeight: 1100,
    classList: classList(rootClasses),
  };
  const windowObject = {
    __anderseedAssessmentPromptInstalled: false,
    localStorage: storage(localValues),
    sessionStorage: storage(sessionValues),
    innerHeight: 100,
    scrollY: 0,
    pageYOffset: 0,
    location: { hostname: "www.anderseedconsulting.co.uk", pathname: "/", search: "" },
    posthog: { capture: (name, properties) => captures.push({ name, properties }) },
    addEventListener: (name, listener) => windowListeners.set(name, listener),
    removeEventListener: (name, listener) => {
      if (windowListeners.get(name) === listener) windowListeners.delete(name);
    },
    setTimeout: (listener, delay) => {
      timers.push({ listener, delay });
      return timers.length;
    },
    requestAnimationFrame: (listener) => listener(),
  };
  const documentObject = {
    readyState: "complete",
    visibilityState: "visible",
    documentElement,
    querySelector: (selector) => selector === "[data-assessment-prompt]" ? prompt : null,
    addEventListener: (name, listener) => documentListeners.set(name, listener),
  };

  vm.runInNewContext(source, {
    window: windowObject,
    document: documentObject,
    Date,
    Number,
    Object,
  });

  assert.equal(prompt.hidden, true, "the prompt should not appear before engagement");
  assert.equal(timers.filter(({ delay }) => delay === 18000).length, 1, "one delay trigger should be scheduled independently of analytics consent");
  windowObject.scrollY = 300;
  windowListeners.get("scroll")();
  assert.equal(prompt.hidden, false);
  assert.ok(promptClasses.has("is-visible"));
  assert.ok(rootClasses.has("assessment-prompt-visible"), "Telegram should be hidden while the prompt is visible");
  assert.equal(sessionValues.get("anderseed.assessmentPrompt.shown.v1"), "1");
  assert.deepEqual(captures.map(({ name }) => name), ["assessment_prompt_shown"]);

  closeListeners.get("click")();
  assert.ok(Number(localValues.get("anderseed.assessmentPrompt.dismissedUntil.v1")) > Date.now());
  assert.ok(!rootClasses.has("assessment-prompt-visible"), "Telegram should return immediately after dismissal");
  assert.deepEqual(captures.map(({ name }) => name), ["assessment_prompt_shown", "assessment_prompt_dismissed"]);
  timers.find(({ delay }) => delay === 230).listener();
  assert.equal(prompt.hidden, true);
});

test("the generated publish folder excludes private and development-only files", () => {
  for (const relativePath of [
    "dist/.local-data",
    "dist/netlify",
    "dist/.gitignore",
    "dist/ANDERSEED-COLOUR-INVENTORY.md",
    "dist/mobile-preview.html",
  ]) {
    assert.equal(fs.existsSync(path.join(root, relativePath)), false, `${relativePath} must not be published`);
  }
});

test("the About page presents the broader company without diluting or overstating talent development", () => {
  const html = read("dist/about/index.html");
  const about = JSON.parse(read("content/pages/about.json"));
  const cms = between(read("admin/config.yml"), '- label: "About page"', '- label: "Blog page"');
  const main = between(html, '<main id="main">', "</main>");
  const capabilities = between(
    html,
    '<section class="section company-capability-section" aria-labelledby="companyCapabilityTitle">',
    "</section>"
  );

  assert.equal(about.capabilityCards.length, 3);
  assert.equal(about.differenceCards.length, 6);
  assert.equal(about.audiences.length, 3);
  assert.match(html, /<h1>Business transformation and talent development, built around practical capability\.<\/h1>/);
  assert.match(html, /Anderseed Consulting is a business and technology consulting firm focused on Business Analysis, ERP, CRM and HCM transformation, and talent development\./);
  assert.match(html, /Our current flagship talent-development offering helps aspiring and developing Business Analysts/);
  assert.match(html, /<a class="btn btn-primary" href="\.\.\/index\.html#pricing">View premium mentorship<\/a>/);
  assert.match(html, /<a class="btn btn-secondary" href="\.\.\/assessment\/index\.html\?intro=1">Discover My BA Readiness<\/a>/);

  const differencePosition = main.indexOf("What makes Anderseed different");
  const capabilityPosition = main.indexOf("Where business transformation meets capability development.");
  const audiencePosition = main.indexOf("Who we help");
  assert.ok(differencePosition >= 0 && differencePosition < capabilityPosition, "company capability must follow the talent-development difference section");
  assert.ok(capabilityPosition < audiencePosition, "company capability must precede Who we help");

  assert.equal((capabilities.match(/<article class="info-card">/g) || []).length, 3);
  assert.match(capabilities, /<h3>Business Analysis<\/h3>/);
  assert.match(capabilities, /<h3>ERP, CRM &amp; HCM Transformation<\/h3>/);
  assert.match(capabilities, /<h3>Talent Development<\/h3>/);
  assert.doesNotMatch(capabilities, /<(?:a|button|form)\b/i, "the capability section must not become a consulting-sales funnel");

  assert.match(main, /Anderseed does not promise guaranteed jobs, interviews or salaries\./);
  assert.match(main, /If Business Analysis is the direction you are considering/);
  assert.match(main, /href="\.\.\/assessment\/index\.html\?intro=1">Discover My BA Readiness<\/a>/);
  assert.match(main, /href="https:\/\/t\.me\/anderseedconsulting"[^>]*>Join free community<\/a>/);
  assert.doesNotMatch(main, /Anderseed (?:clients|employees)|worked for Anderseed|client implementation|we guarantee (?:a )?(?:job|interview|salary)/i);

  for (const field of [
    "primaryCtaLabel",
    "secondaryCtaLabel",
    "sections",
    "differenceLabel",
    "differenceTitle",
    "differenceIntro",
    "differenceCards",
    "capabilityLabel",
    "capabilityTitle",
    "capabilityCards",
    "audienceLabel",
    "audienceTitle",
    "audienceIntro",
    "audiences",
    "trustLabel",
    "trustTitle",
    "trustBody",
    "nextStepLabel",
    "nextStepTitle",
    "nextStepBody",
    "nextStepPrimaryCtaLabel",
    "nextStepSecondaryCtaLabel",
  ]) {
    assert.match(cms, new RegExp(`name: "${field}"`), `${field} should be editable in Decap CMS`);
  }
});

test("starting the assessment suppresses future sticky prompts even without PostHog", () => {
  const html = read("dist/assessment/index.html");
  const bridge = between(html, "/* Anderseed PostHog assessment bridge */", "/* End Anderseed PostHog assessment bridge */");
  const markerPosition = bridge.indexOf('detail.eventName==="assessment_started"');
  const posthogGuardPosition = bridge.indexOf('if(!window.posthog||typeof window.posthog.capture!=="function")return');

  assert.ok(markerPosition >= 0, "the bridge should recognise assessment_started");
  assert.match(bridge, /window\.localStorage\.setItem\("anderseed\.assessmentPrompt\.started\.v1","1"\)/);
  assert.ok(markerPosition < posthogGuardPosition, "the started marker must be written before checking PostHog availability");
});

test("the deployed assessment CSP permits PostHog scripts and event delivery", () => {
  const netlify = read("netlify.toml");
  const assessmentHeaders = between(
    netlify,
    '[[headers]]\n  for = "/assessment/*"',
    '    X-Frame-Options = "DENY"'
  );

  assert.match(assessmentHeaders, /script-src[^\n"]*https:\/\/\*\.posthog\.com/);
  assert.match(assessmentHeaders, /connect-src[^\n"]*https:\/\/\*\.posthog\.com/);
  assert.match(assessmentHeaders, /worker-src[^\n"]*blob:[^\n"]*data:/);
});

test("the generated assessment uses the V2 positioning and exact eight-question configuration", () => {
  const html = read("dist/assessment/index.html");
  const content = JSON.parse(read("content/pages/assessment.json"));
  const scoring = JSON.parse(read("content/assessment-scoring.json"));
  const config = embeddedAssessmentConfig(html);
  const landingView = between(html, '<section class="assessment-view" data-assessment-landing hidden>', '<section class="assessment-view" data-question-view');

  assert.match(landingView, /Discover how ready you are for <span>Business Analysis<\/span>/i);
  assert.match(landingView, /data-start-assessment>Start My Assessment/i);
  assert.match(landingView, /Answer 8 questions in 2–3 minutes to receive your BA Readiness Stage, Score and FREE BA Career Roadmap by email\./i);
  assert.match(landingView, /No BA knowledge needed/);
  assert.match(landingView, /Immediate result/);
  assert.match(landingView, /Free career roadmap/);
  assert.match(landingView, /8 questions · 2–3 minutes/);
  assert.match(landingView, /class="assessment-start-card"/);
  assert.doesNotMatch(landingView, /assessment-profile-plate|Growth Profile includes|strength \+ growth diagnosis/i);
  assert.match(html, /data-completion-view/);
  assert.match(html, /Assessment Complete!/);
  assert.match(html, /Your FREE BA Career Roadmap by email/);

  assert.equal(config.schemaVersion, "ba-readiness-mvp-v2");
  assert.equal(config.questions.length, 8);
  assert.deepEqual(config.questions, content.questions);
  assert.deepEqual(config.scoring, scoring);
  assert.deepEqual(
    config.questions.map(({ id }) => id),
    [
      "analyticalProblemSolving",
      "handlingAmbiguity",
      "transferableExperience",
      "problemFraming",
      "careerPosition",
      "baExposure",
      "primaryBarrier",
      "transitionTimeline",
    ]
  );

  assert.match(config.questions[1].revealAfter, /unclear problems|analytical capability/i);
  assert.match(config.questions[2].revealAfter, /transferable Business Analysis experience/i);
  assert.equal(config.questions[2].options[0].value, "improve_process");
  assert.equal(config.questions[2].options[0].label, "Found a better way to do a task at work");
  assert.match(config.questions[6].revealAfter, /growth area/i);
  assert.match(config.questions[5].help, /not a BA knowledge test/i);
  assert.match(config.questions[7].help, /does not raise or lower your BA Readiness Score/i);
});

test("plant growth communicates progress without revealing the four result classifications", () => {
  const html = read("dist/assessment/index.html");
  const questionView = between(html, '<section class="assessment-view" data-question-view', '<section class="assessment-view" data-gate-view');
  const client = read("dist/assets/assessment.js");

  assert.equal((questionView.match(/data-growth-node="[0-4]"/g) || []).length, 5);
  assert.match(questionView, /role="progressbar"/);
  assert.match(questionView, /aria-valuemin="1"/);
  assert.match(questionView, /aria-valuemax="8"/);
  assert.match(questionView, /Question 1 of 8/);
  assert.doesNotMatch(questionView, />\s*(?:Seed|Sprout|Growing|Established)\s*</);
  assert.match(client, /const growthStages = \[0, 1, 1, 2, 2, 3, 3, 4\]/);
  assert.match(client, /pendingReveal/);
  assert.match(client, /microReveal\.textContent = state\.pendingReveal/);
});

test("the approved post-survey journey pauses at completion and reveals a tailored result", () => {
  const html = read("dist/assessment/index.html");
  const client = read("dist/assets/assessment.js");
  const completion = between(html, '<section class="assessment-view" data-completion-view', '<section class="assessment-view" data-gate-view');
  const gate = between(html, '<section class="assessment-view" data-gate-view', '<section class="assessment-view" data-result-view');
  const result = between(html, '<section class="assessment-view" data-result-view', "<noscript>");
  const completeFlow = between(client, "async function completeAssessment()", "function continueFromCompletion()");
  const completionFlow = between(client, "function continueFromCompletion()", "function advance()");
  const contactFlow = between(client, "async function submitLead(event)", "function restart()");
  const renderFlow = between(client, "function renderResult()", "async function submitLead(event)");
  const inputs = [...gate.matchAll(/<input\b[^>]*>/g)].map(([input]) => input);

  assert.match(completion, /Assessment Complete!/i);
  assert.match(completion, /Great work! You’ve answered all 8 questions\./i);
  assert.match(completion, /Your Anderseed Growth Profile is ready\./i);
  assert.match(completion, /data-completion-status/);
  assert.match(completion, /data-completion-continue disabled/);
  assert.match(completion, /Preparing Your Result…/);
  assert.match(gate, /Your Anderseed Growth Profile is ready\./i);
  assert.match(gate, /Enter your details to reveal your BA Readiness result and get your FREE BA Career Roadmap by email\./i);
  for (const valueItem of [
    "Your BA Readiness Stage",
    "Your BA Readiness Score",
    "Your FREE BA Career Roadmap by email",
  ]) {
    assert.match(gate, new RegExp(valueItem, "i"));
  }
  assert.doesNotMatch(gate, /strongest area|primary growth area|recommended next move|supporting scores/i);

  assert.equal(inputs.length, 3, "the gate should ask only for first name, email and optional marketing consent");
  assert.match(inputs[0], /name="firstName"/);
  assert.match(inputs[0], /autocomplete="given-name"/);
  assert.match(inputs[0], /\brequired\b/);
  assert.match(inputs[1], /name="email"/);
  assert.match(inputs[1], /type="email"/);
  assert.match(inputs[1], /autocomplete="email"/);
  assert.match(inputs[1], /\brequired\b/);
  assert.match(inputs[2], /name="marketingOptIn"/);
  assert.match(inputs[2], /type="checkbox"/);
  assert.doesNotMatch(inputs[2], /\brequired\b|aria-required|\bchecked\b/);
  assert.match(gate, /Yes — email me practical BA career tips, portfolio advice, Anderseed programme updates and occasional offers\. Unsubscribe anytime\./);
  assert.match(gate, /Privacy Notice/);
  assert.match(gate, /See My Result &amp; Get My Free Roadmap →/);
  assert.match(gate, /See your result/);
  assert.doesNotMatch(gate, /phone|salary|company|LinkedIn|budget/i);

  assert.ok(completeFlow.indexOf("validateAnswers") < completeFlow.indexOf("postJson(config.endpoints.complete"));
  assert.ok(completeFlow.indexOf('trackEvent("assessment_completed")') < completeFlow.indexOf("show(completionView)"));
  assert.doesNotMatch(completeFlow, /show\(gateView\)|setTimeout\([^)]*1600|completionMoment|trackEvent\("email_gate_viewed"\)/);
  assert.match(completeFlow, /Next, enter your details to see your score and receive your free roadmap\./);
  assert.match(completeFlow, /completionContinueButton\.textContent = "See My Result →"/);
  assert.match(completeFlow, /completionContinueButton\.disabled = false/);
  assert.match(completionFlow, /show\(gateView\)/);
  assert.match(completionFlow, /trackEvent\("email_gate_viewed"\)/);
  assert.equal((completionFlow.match(/trackEvent\("email_gate_viewed"\)/g) || []).length, 1);
  assert.match(client, /completionContinueButton\.addEventListener\("click", continueFromCompletion\)/);
  assert.doesNotMatch(completion + gate + client, /\bunlock\b/i);
  assert.doesNotMatch(completeFlow, /FormData|formData\.get\("(?:firstName|email)"\)/);
  assert.match(contactFlow, /postJson\(config\.endpoints\.contact/);
  assert.ok(contactFlow.indexOf("postJson(config.endpoints.contact") < contactFlow.indexOf("show(resultView)"));
  assert.doesNotMatch(contactFlow, /check your email|email has been sent/i);

  assert.match(result, /data-result-stage/);
  assert.match(result, /data-result-score/);
  assert.match(result, />\/100</);
  assert.match(result, /data-result-title/);
  assert.match(result, /data-result-explanation/);
  assert.match(result, /data-result-strength-label/);
  assert.match(result, /data-result-strength/);
  assert.match(result, /data-result-growth-label/);
  assert.match(result, /data-result-gap/);
  assert.match(result, /data-result-dimensions/);
  assert.match(result, /Strongest Area/);
  assert.match(result, /Primary Growth Area/);
  assert.match(result, /Your BA Readiness Breakdown/);
  assert.match(result, /Your next move/);
  assert.match(result, /Use your FREE BA Career Roadmap\./);
  assert.match(result, /It will be sent to the email address you provided/);
  assert.doesNotMatch(result, /has been sent|data-result-priorities|Your 3 Recommended Next Moves/i);
  assert.doesNotMatch(result, /data-roadmap-cta|\.pdf\b|\bdownload\b/i);
  assert.match(result, /How Anderseed Supports Your Journey/);
  assert.match(result, /8-Week Live Mentorship Cohort/);
  assert.match(result, /4-Week Guided Portfolio Project/);
  assert.match(result, /12-Week Anderseed BA Career Journey/);
  for (const stage of ["DISCOVERY", "REQUIREMENTS", "DESIGN", "TEST", "DEPLOY"]) {
    assert.match(result, new RegExp(stage, "i"));
  }
  for (const outcome of ["Portfolio", "CV", "Applications", "Interviews"]) {
    assert.match(result, new RegExp(outcome));
  }
  assert.match(result, /href="\.\.\/index\.html#pricing"[^>]*data-programme-cta/);
  assert.match(result, /href="https:\/\/t\.me\/anderseedconsulting"/);
  assert.match(result, /Explore The Programme &amp; Pricing →/);
  assert.match(result, /Join the Free BA Community →/);
  assert.match(renderFlow, /strongestArea|primaryGrowthArea|dimensionStatuses|dimensions/);
  assert.doesNotMatch(renderFlow, /topPriorities|recommendedNextMove|programmeRecommendation/);
  assert.match(client, /trackEvent\("roadmap_cta_clicked"\)/);
});

test("mobile, keyboard and reduced-motion requirements are explicit", () => {
  const html = read("dist/assessment/index.html");
  const css = read("dist/assets/assessment.css");
  const sharedCss = read("dist/assets/landing-pages.css");
  const client = read("dist/assets/assessment.js");
  const mobileFirstRules = css.slice(0, css.indexOf("@media(min-width:681px)"));

  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1\.0"/);
  assert.equal((html.match(/data-question-host/g) || []).length, 1, "there should be one primary question host");
  assert.match(client, /document\.createElement\("fieldset"\)/);
  assert.match(client, /document\.createElement\("legend"\)/);
  assert.match(client, /input\.type = question\.type === "multiple" \? "checkbox" : "radio"/);
  assert.match(client, /input\.checked = question\.type/);
  assert.match(mobileFirstRules, /\.assessment-option\{[^}]*min-height:62px/);
  assert.match(mobileFirstRules, /\.assessment-actions \.btn\{[^}]*min-height:50px/);
  assert.match(sharedCss, /\*\{box-sizing:border-box\}/);
  assert.match(sharedCss, /img\{max-width:100%/);
  assert.match(sharedCss + css, /:focus-visible/);
  assert.match(sharedCss + css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(html, /role="status" aria-live="polite"/);
  assert.match(html, /role="alert"/);
  assert.match(html, /data-result-view hidden role="region" aria-labelledby="assessmentResultTitle"/);
  assert.match(client, /focusViewHeading\(resultTitle\)/);
});

test("anonymous progress is temporary, restorable and cleared after a successful unlock", () => {
  const client = read("dist/assets/assessment.js");
  const config = embeddedAssessmentConfig(read("dist/assessment/index.html"));
  const persistence = between(client, "function persistDraft()", "function hasAnswer(question)");

  assert.equal(config.progressTtlHours, 24);
  assert.match(client, /anderseed\.baReadiness\.v2\.draft/);
  assert.match(persistence, /window\.localStorage\.setItem/);
  assert.match(persistence, /expiresAt: Date\.now\(\) \+ ttl/);
  assert.match(persistence, /window\.localStorage\.getItem/);
  assert.match(persistence, /saved\.expiresAt/);
  assert.match(persistence, /state\.answers = saved\.answers/);
  assert.match(persistence, /state\.completedQuestions = new Set/);
  assert.doesNotMatch(persistence, /firstName|email|marketingOptIn/);
  assert.match(client, /renderResult\(\);\s*clearDraft\(\);\s*show\(resultView\)/);
  assert.match(client, /function resumeRestoredAssessment\(\)[\s\S]*?show\(questionView\);\s*renderQuestion\(\)/);
  assert.match(client, /const restoredDraft = restoreDraft\(\);\s*if \(restoredDraft\)[\s\S]*?resumeRestoredAssessment\(\)/);
  assert.doesNotMatch(client, /document\.cookie|indexedDB/);
});

test("landing-page logos return home and unfinished assessments guard exits without trapping visitors", () => {
  const html = read("dist/assessment/index.html");
  const client = read("dist/assets/assessment.js");
  const css = read("dist/assets/assessment.css");
  const confirmExit = between(client, "function confirmAssessmentExit()", "function openExitDialog(action, trigger)");
  const generatedLandingPages = ["about", "blog", "faq", "privacy", "terms", "checkout"];

  assert.match(html, /<a class="logo conversion-logo" href="\.\.\/index\.html" aria-label="Anderseed Consulting home">/);
  assert.doesNotMatch(html, /<div class="logo conversion-logo"/);
  generatedLandingPages.forEach((page) => {
    assert.match(read(`dist/${page}/index.html`), /<a class="logo" href="\.\.\/index\.html(?:#home)?" aria-label="Anderseed Consulting home">/);
  });

  assert.match(html, /<dialog class="assessment-exit-dialog" data-exit-dialog aria-labelledby="assessmentExitTitle" aria-describedby="assessmentExitMessage assessmentExitStorage">/);
  assert.match(html, /Leave before seeing your result\?/);
  assert.match(html, /data-exit-continue>Continue My Assessment</);
  assert.match(html, /data-exit-confirm>Leave &amp; Save My Progress</);
  assert.match(css, /\.assessment-exit-dialog::backdrop/);
  assert.match(css, /\.assessment-exit-actions \.btn\{[^}]*min-height:52px/);

  assert.match(client, /function shouldProtectExit\(\)[\s\S]*?state\.step >= 0[\s\S]*?state\.phase === "question"[\s\S]*?state\.phase === "gate"/);
  assert.match(client, /window\.addEventListener\("beforeunload", handleBeforeUnload\)/);
  assert.match(client, /window\.removeEventListener\("beforeunload", handleBeforeUnload\)/);
  assert.match(client, /event\.preventDefault\(\);\s*event\.returnValue = ""/);
  assert.match(client, /document\.addEventListener\("visibilitychange"/);
  assert.match(client, /window\.addEventListener\("pagehide"/);
  assert.match(client, /event\.target\?\.closest\?\.\("a\[href\]"\)/);
  assert.match(client, /openExitDialog\(\(\) => window\.location\.assign\(destination\.href\), link\)/);
  assert.match(confirmExit, /persistDraft\(\)/);
  assert.match(confirmExit, /allowExit = true/);
  assert.doesNotMatch(confirmExit, /clearDraft|localStorage\.removeItem/);
});

test("checkout shows flexible payment choices without allowing payment before approval", () => {
  const checkout = read("dist/checkout/index.html");
  const homepage = read("dist/index.html");
  const faq = read("dist/faq/index.html");

  assert.match(checkout, /<title>Apply for Mentorship \| Anderseed Consulting<\/title>/);
  assert.match(checkout, /Mentorship application/);
  assert.match(checkout, /Apply for review/);
  assert.match(checkout, /Submit application for review/);
  assert.match(checkout, /No payment is taken on this page/);
  assert.match(checkout, /Flexible payment options/);
  assert.equal((checkout.match(/<article class="payment-method">/g) || []).length, 4);
  assert.match(checkout, /Card payment[\s\S]*£800 in full by debit or credit card[\s\S]*Stripe/);
  assert.match(checkout, /Klarna Pay in 3[\s\S]*£266\.67 × 3 instalments/);
  assert.match(checkout, /Clearpay Pay in 4[\s\S]*£200 × 4 instalments over 6 weeks/);
  assert.match(checkout, /Bank transfer[\s\S]*£800 in full after approval/);
  assert.match(checkout, /Apply[\s\S]*Approval[\s\S]*Choose &amp; pay/);
  assert.match(checkout, /Your place is confirmed only after approval and verified payment/);
  assert.match(checkout, /Klarna and Clearpay are subject to provider eligibility and terms/);
  assert.doesNotMatch(checkout, /YOUR-STRIPE-CHECKOUT-LINK|YOUR-KLARNA-CHECKOUT-LINK/);
  assert.doesNotMatch(checkout, /Continue to Stripe checkout|Continue with Klarna/);
  assert.doesNotMatch(checkout, /role="tablist"|role="tabpanel"|activatePaymentMethod/);

  assert.match(homepage, /Flexible payment options:[\s\S]*Clearpay Pay in 4/);
  assert.match(homepage, />Apply for a place<\/a>/);
  assert.match(faq, /Card, Klarna Pay in 3, Clearpay Pay in 4, and bank-transfer options/);
  assert.match(faq, /No payment is taken with the application/);
});

test("saved assessment progress resumes at the exact phase and expires after 24 hours", () => {
  const html = read("dist/assessment/index.html");
  const client = read("dist/assets/assessment.js");
  const config = embeddedAssessmentConfig(html);
  const persistence = between(client, "function persistDraft()", "function hasAnswer(question)");
  const resumeFlow = between(client, "function resumeRestoredAssessment()", "function startAssessmentFromLanding()");
  const initialization = client.slice(client.lastIndexOf('trackEvent("assessment_page_viewed")'));
  const privacy = read("dist/privacy/index.html");

  assert.equal(config.progressTtlHours, 24);
  assert.match(persistence, /const resultReady = Boolean\(state\.completionToken\)/);
  assert.match(persistence, /state\.phase === "completion" \|\| state\.phase === "gate"/);
  assert.match(persistence, /phase: resultReady \? "gate" : "question"/);
  assert.match(persistence, /completionToken: resultReady \? state\.completionToken : null/);
  assert.match(persistence, /state\.phase = saved\.phase === "gate" \? "gate" : "question"/);
  assert.match(persistence, /state\.completionToken = state\.phase === "gate"/);
  assert.match(resumeFlow, /const resumeAtGate = state\.phase === "gate"/);
  assert.match(resumeFlow, /Welcome back — your progress has been restored at Question/);
  assert.match(resumeFlow, /if \(resumeAtGate && state\.completionToken\)[\s\S]*?show\(gateView\)/);
  assert.match(resumeFlow, /if \(resumeAtGate && !state\.completionToken\)[\s\S]*?completeAssessment\(\)/);
  assert.match(initialization, /if \(forceIntroduction\)[\s\S]*?resumeFromIntroduction = true[\s\S]*?show\(landing\)/);
  assert.match(initialization, /draftRestoreStatus === "expired"[\s\S]*?started a fresh assessment/);
  assert.match(client, /Return within that time to continue where you stopped; after that, your saved progress expires\./);
  assert.match(client, /This browser couldn’t save your progress, so leaving now means starting again next time\./);
  assert.match(privacy, /opaque continuation token/i);
  assert.match(privacy, /does not include your name or email address/i);
  assert.match(privacy, /PostHog is optional and is not loaded until you choose ‘Accept analytics’/i);
  assert.match(privacy, /If you choose ‘Reject non-essential’, PostHog is not loaded/i);
  assert.match(privacy, /using the ‘Privacy choices’ control/i);
  assert.doesNotMatch(privacy, /No advertising pixels or third-party marketing cookies are configured/i);
  assert.doesNotMatch(persistence, /firstName|email|marketingOptIn/);
});

test("assessment start is emitted before Q1 is viewed", () => {
  const client = read("dist/assets/assessment.js");
  const begin = between(client, "function beginAssessment()", "async function postJson");
  assert.ok(
    begin.indexOf('trackEvent("assessment_started")') < begin.indexOf("renderQuestion()"),
    "assessment_started must precede the Q1 assessment_question_viewed event emitted by renderQuestion"
  );
});

test("the direct-start parameter remains available for the embedded homepage assessment CTA", () => {
  const html = read("dist/assessment/index.html");
  const client = read("dist/assets/assessment.js");
  const initialization = client.slice(client.lastIndexOf('trackEvent("assessment_page_viewed")'));

  assert.match(html, /<section class="assessment-view" data-assessment-landing hidden>/);
  assert.match(initialization, /const restoredDraft = restoreDraft\(\)/);
  assert.match(initialization, /const routeParameters = new URLSearchParams\(window\.location\.search\)/);
  assert.match(initialization, /const forceIntroduction = routeParameters\.get\("intro"\) === "1"/);
  assert.match(initialization, /if \(forceIntroduction\) \{[\s\S]*?Continue My Assessment[\s\S]*?show\(landing\)/);
  assert.match(initialization, /else if \(routeParameters\.get\("start"\) === "1"\) \{\s*beginAssessment\(\)/);
  assert.match(client, /function restart\(\)[\s\S]*?beginAssessment\(\);/);
  assert.match(client, /function startAssessmentFromLanding\(\)[\s\S]*?resumeRestoredAssessment\(\)[\s\S]*?beginAssessment\(\)/);
});

test("secondary assessment entry points open the brief introduction instead of skipping to Question 1", () => {
  const secondaryPages = [
    "dist/about/index.html",
    "dist/blog/index.html",
    "dist/blog/ba-interview-questions/index.html",
    "dist/faq/index.html",
    "dist/roadmap/index.html",
  ];

  for (const page of secondaryPages) {
    const html = read(page);
    assert.doesNotMatch(html, /assessment\/index\.html\?start=1/, `${page} must not bypass the introduction`);
    assert.match(html, /assessment\/index\.html\?intro=1/, `${page} should explicitly open the assessment introduction`);
  }
});

test("the ID fallback remains a UUID v4 when crypto.randomUUID is unavailable", () => {
  const client = read("dist/assets/assessment.js");
  const instrumented = client.replace(
    "  const state = {",
    "  globalThis.__assessmentCreateId = createId;\n  return;\n  const state = {"
  );
  assert.notEqual(instrumented, client, "could not instrument the assessment ID factory");

  const context = {
    document: {
      getElementById: () => ({ textContent: JSON.stringify({ scoring: {} }) }),
      querySelector: () => ({}),
    },
    window: {
      crypto: {},
      AnderseedAssessmentScoring: { validateConfig: () => true },
    },
  };
  vm.runInNewContext(instrumented, context);
  assert.equal(typeof context.__assessmentCreateId, "function");
  for (let index = 0; index < 25; index += 1) {
    assert.match(
      context.__assessmentCreateId(),
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  }
});

test("the public homepage defers CMS-only work and expensive below-the-fold rendering", () => {
  const homepage = read("dist/index.html");
  const admin = read("dist/admin/index.html");
  const portfolioJs = read("dist/assets/portfolio-experience.js");
  const originalLogoSize = fs.statSync(path.join(root, "dist/assets/anderseed-logo-header.png")).size;
  const responsiveLogoSize = fs.statSync(path.join(root, "dist/assets/anderseed-logo-header-464.webp")).size;

  assert.doesNotMatch(homepage, /<script src="https:\/\/identity\.netlify\.com\/v1\/netlify-identity-widget\.js"><\/script>/);
  assert.match(homepage, /invite_token\|recovery_token\|confirmation_token\|email_change_token/);
  assert.match(homepage, /document\.createElement\("script"\)/);
  assert.match(admin, /<script src="https:\/\/identity\.netlify\.com\/v1\/netlify-identity-widget\.js"><\/script>/);

  assert.match(homepage, /anderseed-logo-header-232\.webp 232w/);
  assert.match(homepage, /anderseed-logo-header-322\.webp 322w/);
  assert.match(homepage, /anderseed-logo-header-464\.webp 464w/);
  assert.match(homepage, /anderseed-logo-header-642\.webp 642w/);
  assert.ok(responsiveLogoSize < originalLogoSize, "the responsive WebP logo should be lighter than the PNG fallback");

  assert.match(homepage, /@supports\(content-visibility:auto\)/);
  assert.match(homepage, /initial-hash-navigation main>section\{content-visibility:visible\}/);
  assert.match(homepage, /const sectionObserver=new IntersectionObserver/);
  assert.doesNotMatch(homepage, /window\.addEventListener\("scroll",syncSectionNavigation/);
  assert.match(homepage, /rel="preload" href="assets\/portfolio-experience\.css" as="style"/);
  assert.match(homepage, /<script src="assets\/portfolio-experience\.js" defer><\/script>/);
  assert.match(portfolioJs, /rootMargin: "600px 0px"/);
  assert.match(portfolioJs, /initialisationObserver\.unobserve\(entry\.target\)/);
});

test("the homepage keeps the assessment dominant and presents a Salesforce-first portfolio experience", () => {
  const homepage = read("dist/index.html");
  const assessmentCss = read("dist/assets/assessment.css");
  const portfolioCss = read("dist/assets/portfolio-experience.css");
  const portfolioJs = read("dist/assets/portfolio-experience.js");
  const cms = read("admin/config.yml");
  const hero = between(homepage, '<section class="hero"', "</section>");
  const assessmentSection = between(homepage, '<section class="home-assessment-section"', "</section>");
  const assessmentLinks = [...homepage.matchAll(/href="([^"]*assessment\/index\.html[^"]*)"/g)].map((match) => match[1]);

  assert.match(hero, /From zero to BA/i);
  assert.match(hero, /No IT experience needed/i);
  assert.match(hero, /class="hero-visual"/);
  assert.match(hero, /href="#assessment"[^>]*>Discover My BA Readiness<\/a>/);
  assert.doesNotMatch(hero, /class="home-assessment-front"/);
  assert.match(assessmentSection, /class="home-assessment-front"/);
  assert.match(assessmentSection, /See how ready you already are for <span>Business Analysis<\/span>\./i);
  assert.match(assessmentSection, /class="assessment-profile-plate"/);
  assert.match(assessmentSection, /btn btn-primary[^>]+assessment\/index\.html\?start=1[^>]*>Discover My BA Readiness/);
  assert.doesNotMatch(homepage, /class="assessment-teaser"/);
  assert.ok(homepage.indexOf('class="home-assessment-section"') < homepage.indexOf('id="portfolio"'));
  assert.match(assessmentSection, /Your BA readiness stage \+ score/i);
  assert.match(assessmentSection, /FREE BA Career Roadmap by email/i);
  assert.doesNotMatch(assessmentSection, /strongest transferable strength/i);
  assert.doesNotMatch(assessmentSection, /assessment-assurances|assessment-delivery-note/);
  assert.doesNotMatch(assessmentSection, /Your name and email unlock your result after question 8/i);
  assert.match(assessmentCss, /\.home-assessment-section \.assessment-landing-copy\{/);
  assert.match(assessmentCss, /\.home-assessment-section \.home-assessment-front\{/);
  assert.match(assessmentCss, /\.home-assessment-section \.assessment-landing-grid\{gap:0;align-items:stretch\}/);
  assert.match(assessmentCss, /\.home-assessment-section \.assessment-profile-plate\{[^}]*border-radius:0;[^}]*box-shadow:none/);
  assert.match(assessmentCss, /\.home-assessment-section \.assessment-meta\{/);
  assert.match(assessmentCss, /\.home-assessment-section \.assessment-landing-copy>\.btn\{[^}]*background:#1f6b52/);
  assert.ok(assessmentLinks.length >= 4, "the homepage should retain its assessment entry points");
  assert.equal(assessmentLinks.filter((href) => href.endsWith("assessment/index.html?start=1")).length, 1);
  assert.ok(assessmentLinks.some((href) => href === "assessment/index.html?intro=1"));

  assert.match(homepage, /Build BA experience across a real delivery lifecycle\./);
  assert.match(homepage, /FLAGSHIP CONTINUOUS PROJECT/);
  assert.match(homepage, /Salesforce CRM Implementation/);
  assert.match(homepage, /Your role[\s\S]*Business Analyst/);
  assert.match(homepage, /Salesforce \+ Trailhead/);
  assert.equal((homepage.match(/data-portfolio-stage="(?:discovery|requirements|design|test|deploy)"/g) || []).length, 5);
  assert.equal((homepage.match(/data-portfolio-stage-panel="(?:discovery|requirements|design|test|deploy)"/g) || []).length, 5);
  assert.match(homepage, /role="tablist" aria-label="Salesforce CRM delivery lifecycle"/);
  assert.match(homepage, /aria-selected="true" tabindex="0" data-portfolio-stage="discovery"/);
  assert.match(homepage, /Swipe to see all five stages\. <strong>Tap a stage to open it\.<\/strong>/);
  assert.equal((homepage.match(/data-portfolio-next-stage=/g) || []).length, 5);
  assert.match(homepage, /class="px-stakeholder-map-mobile"/);
  assert.match(homepage, /px-map-mobile-empty" role="listitem"/);
  assert.match(homepage, /Higher influence ↑[\s\S]*Higher interest →/);
  assert.match(homepage, /One evidence thread[\s\S]*Discovery finding[\s\S]*Deployment readiness/);
  for (const evidence of [
    "Stakeholder Analysis",
    "AS-IS Lead Process",
    "Requirements Catalogue",
    "Jira-style User Story",
    "Data Mapping",
    "Requirement-to-Design Traceability",
    "UAT Scenario Table",
    "Defect Log",
    "Go-Live Readiness Checklist",
    "Post-Deployment Checks",
  ]) {
    assert.match(homepage, new RegExp(evidence));
  }
  assert.equal((homepage.match(/Sample project data/g) || []).length, 10);
  assert.match(homepage, /SIMULATION[\s\S]*REAL PLATFORMS[\s\S]*MENTOR GUIDANCE[\s\S]*PORTFOLIO EVIDENCE/);
  assert.match(homepage, /Then apply your skills in new business contexts\./);
  assert.match(homepage, /INDEPENDENT CHALLENGE[\s\S]*HCM Transformation/);
  assert.match(homepage, /OPTIONAL CAPSTONE[\s\S]*ERP Transformation/);
  assert.equal((homepage.match(/data-portfolio-secondary="(?:hcm|erp)"/g) || []).length, 2);
  assert.match(homepage, /12-Week BA Career Journey/);
  assert.match(homepage, /Weeks 1-8[\s\S]*Live Mentorship/);
  assert.match(homepage, /Weeks 9-12[\s\S]*Portfolio Project/);
  assert.match(homepage, /href="#portfolio"[^>]*>See Portfolio Project<\/a>/);
  assert.match(homepage, /\.cohort-badge:hover,\.cohort-badge:focus-visible\{transform:scale\(1\.07\)/);
  assert.doesNotMatch(homepage, /class="process-route"|class="process-card"|class="process-sequence"/);
  assert.equal((homepage.match(/class="process-step (?:start|training|action|confidence|hired|support)"/g) || []).length, 6);
  assert.match(homepage, /\.process-flow\{display:grid;grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(homepage, /\.process-step:after\{content:"";[^}]*height:2px;background:#829089/);
  assert.match(homepage, /Start Your Journey[\s\S]*15-minute welcome call[\s\S]*Learn by doing[\s\S]*Become BA-ready[\s\S]*Get hired[\s\S]*Lifetime career support/);
  assert.match(homepage, /@media\(max-width:1060px\)[\s\S]*\.process-flow\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)\}/);
  assert.match(cms, /name: "featuredBadgeUrl"/);
  assert.match(cms, /name: "featuredPhases"/);
  assert.match(cms, /name: "featuredOutcome"/);
  assert.match(homepage, /href="#pricing" data-portfolio-cta[\s\S]*Start Building My BA Experience/);
  assert.ok(homepage.indexOf('id="pricing"') < homepage.indexOf('id="faq"'));
  assert.ok(homepage.indexOf('id="faq"') < homepage.indexOf('id="contact"'));
  assert.ok(homepage.indexOf('id="contact"') < homepage.indexOf('Join the Anderseed community'));
  const primaryNavigation = homepage.match(/<nav class="nav-links"[\s\S]*?<\/nav>/)?.[0] || "";
  assert.ok(primaryNavigation.indexOf('href="#portfolio"') < primaryNavigation.indexOf('href="#pricing"'));
  assert.ok(primaryNavigation.indexOf('href="faq\/index.html"') < primaryNavigation.indexOf('href="#contact"'));
  assert.doesNotMatch(homepage, /data-case-type=|class="lab-case|assets\/portfolio-lab\.css/);
  assert.match(homepage, /assets\/portfolio-experience\.css/);
  assert.match(homepage, /assets\/portfolio-experience\.js/);

  assert.match(portfolioCss, /\.px-stage-panel\[hidden\]\{\s*display:none/);
  assert.match(portfolioCss, /@media\(max-width:760px\)/);
  assert.match(portfolioCss, /@media\(max-width:840px\)/);
  assert.match(portfolioCss, /overflow-x:auto/);
  assert.match(portfolioCss, /\.px-stage-tab:not\(\.is-active\) \.px-stage-current:before/);
  assert.match(portfolioCss, /\.px-stakeholder-map-mobile\{/);
  assert.match(portfolioCss, /\.px-next-stage\{/);
  assert.match(portfolioCss, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(portfolioCss, /min-height:52px/);
  assert.doesNotMatch(portfolioCss, /#21183a|#3b2a0f/);

  for (const event of [
    "portfolio_section_viewed",
    "portfolio_lifecycle_stage_selected",
    "portfolio_secondary_project_selected",
    "portfolio_cta_clicked",
  ]) {
    assert.match(portfolioJs, new RegExp(event));
  }
  assert.match(portfolioJs, /project: "salesforce_crm"/);
  assert.match(portfolioJs, /portfolio_version: version/);
  assert.match(portfolioJs, /ArrowRight[\s\S]*ArrowLeft[\s\S]*Home[\s\S]*End/);
  assert.match(portfolioJs, /data-portfolio-next-stage/);
  assert.match(portfolioJs, /nextPanel\.scrollIntoView/);
  assert.match(portfolioJs, /catch \(_error\)/);
});
