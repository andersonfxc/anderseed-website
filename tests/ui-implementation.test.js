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

test("PostHog base tracking is installed once in every generated public page head", () => {
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
    assert.equal((head.match(/posthog\.init\(/g) || []).length, 1, `${page} should initialise PostHog once`);
    assert.match(head, /phc_xPv9uMsaKk5fSBsVeJjUByT6hzhskg5Lrj9AcyK2rsmf/);
    assert.match(head, /api_host:\s*'https:\/\/eu\.i\.posthog\.com'/);
    assert.match(head, /defaults:\s*'2026-05-30'/);
    assert.match(head, /person_profiles:\s*'identified_only'/);
    assert.doesNotMatch(html, /posthog\.capture\s*\(/);
  }
});

test("the generated assessment uses the V2 positioning and exact eight-question configuration", () => {
  const html = read("dist/assessment/index.html");
  const content = JSON.parse(read("content/pages/assessment.json"));
  const scoring = JSON.parse(read("content/assessment-scoring.json"));
  const config = embeddedAssessmentConfig(html);

  assert.match(html, /How close are you to a career in <span>Business Analysis<\/span>\?/i);
  assert.match(html, /data-start-assessment>Get My BA Score \+ Free Roadmap/i);
  assert.match(html, /discover your BA readiness score and receive a free BA transition roadmap/i);
  assert.match(html, /No BA knowledge required/);
  assert.match(html, /No specific career background required/);
  assert.match(html, /Free BA transition roadmap included/);
  assert.match(html, /8 questions · Approximately 2–3 minutes/);
  assert.match(html, /Immediate personalised result/);
  assert.match(html, /Your Free BA Transition Roadmap/);

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

test("contact details are requested only after completion and unlock an immediate on-screen result", () => {
  const html = read("dist/assessment/index.html");
  const client = read("dist/assets/assessment.js");
  const gate = between(html, '<section class="assessment-view" data-gate-view', '<section class="assessment-view" data-result-view');
  const result = between(html, '<section class="assessment-view" data-result-view', "<noscript>");
  const completeFlow = between(client, "async function completeAssessment()", "function advance()");
  const contactFlow = between(client, "async function submitLead(event)", "function restart()");
  const inputs = [...gate.matchAll(/<input\b[^>]*>/g)].map(([input]) => input);

  assert.match(gate, /Your Anderseed Growth Profile is ready\./i);
  for (const lockedOutput of [
    "Your BA Readiness Stage",
    "Your BA Readiness Score",
    "Your strongest area",
    "Your primary growth area",
    "Your recommended next move",
    "Your Free BA Transition Roadmap",
  ]) {
    assert.match(gate, new RegExp(lockedOutput, "i"));
  }

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
  assert.match(gate, /This is optional\./);
  assert.doesNotMatch(gate, /phone|salary|company|LinkedIn|budget/i);

  assert.ok(completeFlow.indexOf("validateAnswers") < completeFlow.indexOf("postJson(config.endpoints.complete"));
  assert.ok(completeFlow.indexOf("postJson(config.endpoints.complete") < completeFlow.indexOf("show(gateView)"));
  assert.doesNotMatch(completeFlow, /FormData|formData\.get\("(?:firstName|email)"\)/);
  assert.match(contactFlow, /postJson\(config\.endpoints\.contact/);
  assert.ok(contactFlow.indexOf("postJson(config.endpoints.contact") < contactFlow.indexOf("show(resultView)"));
  assert.doesNotMatch(contactFlow, /check your email|email has been sent/i);

  assert.match(result, /data-result-stage/);
  assert.match(result, /data-result-score/);
  assert.match(result, />\/100</);
  assert.match(result, /data-result-strength/);
  assert.match(result, /data-result-growth-label/);
  assert.match(result, /data-result-priorities/);
  assert.match(result, /Your Supporting Scores/);
  assert.match(result, /Why Anderseed is relevant/);
  assert.match(result, /data-programme-cta/);
  assert.match(client, /result\.topPriorities\.forEach/);
  assert.match(client, /Object\.entries\(config\.scoring\.dimensionLabels\)/);
  assert.match(client, /result\.programmeRecommendation\.text/);
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
  assert.match(client, /renderResult\(firstName\);\s*clearDraft\(\);\s*show\(resultView\)/);
  assert.match(client, /const restoredDraft = restoreDraft\(\);\s*if \(restoredDraft\)\s*\{[\s\S]*?show\(questionView\);\s*renderQuestion\(\)/);
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

test("saved assessment progress resumes at the exact phase and expires after 24 hours", () => {
  const html = read("dist/assessment/index.html");
  const client = read("dist/assets/assessment.js");
  const config = embeddedAssessmentConfig(html);
  const persistence = between(client, "function persistDraft()", "function hasAnswer(question)");
  const initialization = client.slice(client.lastIndexOf('trackEvent("assessment_page_viewed")'));
  const privacy = read("dist/privacy/index.html");

  assert.equal(config.progressTtlHours, 24);
  assert.match(persistence, /phase: state\.phase === "gate" \? "gate" : "question"/);
  assert.match(persistence, /completionToken: state\.phase === "gate" \? state\.completionToken : null/);
  assert.match(persistence, /state\.phase = saved\.phase === "gate" \? "gate" : "question"/);
  assert.match(persistence, /state\.completionToken = state\.phase === "gate"/);
  assert.match(initialization, /const resumeAtGate = state\.phase === "gate"/);
  assert.match(initialization, /Welcome back — your progress has been restored at Question/);
  assert.match(initialization, /if \(resumeAtGate && state\.completionToken\)[\s\S]*?show\(gateView\)/);
  assert.match(initialization, /if \(resumeAtGate && !state\.completionToken\)[\s\S]*?completeAssessment\(\)/);
  assert.match(initialization, /draftRestoreStatus === "expired"[\s\S]*?started a fresh assessment/);
  assert.match(client, /Return within that time to continue where you stopped; after that, your saved progress expires\./);
  assert.match(client, /This browser couldn’t save your progress, so leaving now means starting again next time\./);
  assert.match(privacy, /opaque continuation token/i);
  assert.match(privacy, /does not include your name or email address/i);
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

test("the homepage CTA bypasses the duplicate assessment introduction", () => {
  const html = read("dist/assessment/index.html");
  const client = read("dist/assets/assessment.js");
  const initialization = client.slice(client.lastIndexOf('trackEvent("assessment_page_viewed")'));

  assert.match(html, /<section class="assessment-view" data-assessment-landing hidden>/);
  assert.match(initialization, /const restoredDraft = restoreDraft\(\)/);
  assert.match(initialization, /new URLSearchParams\(window\.location\.search\)\.get\("start"\) === "1"/);
  assert.ok(initialization.indexOf("restoreDraft()") < initialization.indexOf("URLSearchParams"));
  assert.match(initialization, /else if \(new URLSearchParams\(window\.location\.search\)\.get\("start"\) === "1"\) \{\s*beginAssessment\(\)/);
  assert.match(client, /function restart\(\)[\s\S]*?beginAssessment\(\);/);
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

test("the homepage keeps the assessment dominant and presents a Salesforce-first portfolio experience", () => {
  const homepage = read("dist/index.html");
  const assessmentCss = read("dist/assets/assessment.css");
  const portfolioCss = read("dist/assets/portfolio-experience.css");
  const portfolioJs = read("dist/assets/portfolio-experience.js");
  const hero = between(homepage, '<section class="hero"', "</section>");
  const assessmentSection = between(homepage, '<section class="home-assessment-section"', "</section>");
  const assessmentLinks = [...homepage.matchAll(/href="([^"]*assessment\/index\.html[^"]*)"/g)].map((match) => match[1]);

  assert.match(hero, /From zero to BA/i);
  assert.match(hero, /No IT experience needed/i);
  assert.match(hero, /class="hero-visual"/);
  assert.doesNotMatch(hero, /class="home-assessment-front"/);
  assert.match(assessmentSection, /class="home-assessment-front"/);
  assert.match(assessmentSection, /See how ready you already are for <span>Business Analysis<\/span>\./i);
  assert.match(assessmentSection, /class="assessment-profile-plate"/);
  assert.match(assessmentSection, /btn btn-primary[^>]+assessment\/index\.html\?start=1[^>]*>Discover My BA Readiness/);
  assert.doesNotMatch(homepage, /class="assessment-teaser"/);
  assert.ok(homepage.indexOf('class="home-assessment-section"') < homepage.indexOf('id="portfolio"'));
  assert.match(assessmentSection, /Your BA readiness score/i);
  assert.match(assessmentSection, /Free BA transition roadmap/i);
  assert.doesNotMatch(assessmentSection, /assessment-assurances|assessment-delivery-note/);
  assert.doesNotMatch(assessmentSection, /Your name and email unlock your result after question 8/i);
  assert.match(assessmentCss, /\.home-assessment-section \.assessment-landing-copy\{/);
  assert.match(assessmentCss, /\.home-assessment-section \.home-assessment-front\{/);
  assert.match(assessmentCss, /\.home-assessment-section \.assessment-landing-grid\{gap:0;align-items:stretch\}/);
  assert.match(assessmentCss, /\.home-assessment-section \.assessment-profile-plate\{[^}]*border-radius:0;[^}]*box-shadow:none/);
  assert.match(assessmentCss, /\.home-assessment-section \.assessment-meta\{/);
  assert.match(assessmentCss, /\.home-assessment-section \.assessment-landing-copy>\.btn\{[^}]*background:#1f6b52/);
  assert.ok(assessmentLinks.length >= 4, "the homepage should retain its assessment entry points");
  assert.ok(assessmentLinks.every((href) => href.endsWith("assessment/index.html?start=1")));

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
  assert.match(homepage, /href="checkout\/index\.html" data-portfolio-cta[\s\S]*Start Building My BA Experience/);
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
