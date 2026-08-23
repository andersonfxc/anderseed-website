const test = require("node:test");
const assert = require("node:assert/strict");

const assessmentContent = require("../content/pages/assessment.json");
const scoringConfig = require("../content/assessment-scoring.json");
const {
  validateConfig,
  validateAnswers,
  calculateDimensions,
  calculateReadiness,
  scoreAssessment,
  buildLeadPayload,
} = require("../assets/assessment-scoring.js");

const questionShape = [
  ["analyticalProblemSolving", "single"],
  ["handlingAmbiguity", "single"],
  ["transferableExperience", "multiple"],
  ["problemFraming", "single"],
  ["careerPosition", "single"],
  ["baExposure", "single"],
  ["primaryBarrier", "single"],
  ["transitionTimeline", "single"],
];

const allTransferableExperience = [
  "improve_process",
  "understand_needs",
  "data_reporting",
  "explain_complex",
  "solve_recurring",
  "conflicting_priorities",
  "structured_docs",
  "coordinate_teams",
];

const fixtures = {
  seed: {
    answers: {
      analyticalProblemSolving: "escalate",
      handlingAmbiguity: "wait",
      transferableExperience: ["none"],
      problemFraming: "accept_solution",
      careerPosition: "exploring",
      baExposure: "none",
      primaryBarrier: "clarity",
      transitionTimeline: "exploring",
    },
    expected: {
      score: 2,
      stage: "Seed",
      profile: "seed",
      dimensions: {
        analyticalProblemSolving: 7,
        transferableExperience: 0,
        baDevelopment: 0,
        marketReadiness: 0,
      },
      leadScore: 5,
      temperature: "Cold",
      growthArea: "careerClarity",
      strongestArea: "analyticalProblemSolving",
    },
  },
  sprout: {
    answers: {
      analyticalProblemSolving: "quick_fix",
      handlingAmbiguity: "assume_and_start",
      transferableExperience: ["improve_process", "understand_needs", "data_reporting"],
      problemFraming: "compare_systems",
      careerPosition: "starting_learning",
      baExposure: "informal",
      primaryBarrier: "practical_experience",
      transitionTimeline: "three_to_six",
    },
    expected: {
      score: 31,
      stage: "Sprout",
      profile: "sprout",
      dimensions: {
        analyticalProblemSolving: 40,
        transferableExperience: 42,
        baDevelopment: 25,
        marketReadiness: 10,
      },
      leadScore: 43,
      temperature: "Warm",
      growthArea: "appliedExperience",
      strongestArea: "transferableExperience",
    },
  },
  growing: {
    answers: {
      analyticalProblemSolving: "root_cause",
      handlingAmbiguity: "clarify_need",
      transferableExperience: allTransferableExperience,
      problemFraming: "investigate_problem",
      careerPosition: "trained_not_ready",
      baExposure: "structured",
      primaryBarrier: "practical_experience",
      transitionTimeline: "asap",
    },
    expected: {
      score: 76,
      stage: "Growing",
      profile: "growing",
      dimensions: {
        analyticalProblemSolving: 100,
        transferableExperience: 100,
        baDevelopment: 56,
        marketReadiness: 35,
      },
      leadScore: 79,
      temperature: "Hot",
      growthArea: "appliedExperience",
      strongestArea: "analyticalProblemSolving",
    },
  },
  established: {
    answers: {
      analyticalProblemSolving: "root_cause",
      handlingAmbiguity: "clarify_need",
      transferableExperience: allTransferableExperience,
      problemFraming: "investigate_problem",
      careerPosition: "interviewing_no_offer",
      baExposure: "workplace",
      primaryBarrier: "interview_confidence",
      transitionTimeline: "asap",
    },
    expected: {
      score: 97,
      stage: "Established",
      profile: "established",
      dimensions: {
        analyticalProblemSolving: 100,
        transferableExperience: 100,
        baDevelopment: 95,
        marketReadiness: 90,
      },
      leadScore: 93,
      temperature: "Hot",
      growthArea: "interviewReadiness",
      strongestArea: "analyticalProblemSolving",
    },
  },
};

const clone = (value) => JSON.parse(JSON.stringify(value));

test("the V2 assessment has the required eight-question shape", () => {
  assert.equal(assessmentContent.schemaVersion, "ba-readiness-mvp-v2");
  assert.deepEqual(
    assessmentContent.questions.map(({ id, type }) => [id, type]),
    questionShape
  );
  assert.equal(assessmentContent.questions.length, 8);
  assert.equal(validateConfig(scoringConfig), true);
});

test("Q3 permits multiple transferable experiences but keeps none mutually exclusive", () => {
  const q3 = assessmentContent.questions.find(({ id }) => id === "transferableExperience");
  assert.equal(q3.type, "multiple");
  assert.equal(q3.options.find(({ value }) => value === "none").exclusive, true);

  const noneOnly = clone(fixtures.seed.answers);
  assert.deepEqual(validateAnswers(noneOnly, assessmentContent.questions), { valid: true, errors: [] });

  const multipleRealExperiences = {
    ...noneOnly,
    transferableExperience: ["improve_process", "data_reporting", "coordinate_teams"],
  };
  assert.deepEqual(validateAnswers(multipleRealExperiences, assessmentContent.questions), { valid: true, errors: [] });

  const invalidCombination = {
    ...noneOnly,
    transferableExperience: ["none", "improve_process"],
  };
  const invalid = validateAnswers(invalidCombination, assessmentContent.questions);
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.some((message) => message.includes("cannot combine none")));
});

test("answer validation rejects omissions, unknown values and unknown question IDs", () => {
  const missing = clone(fixtures.seed.answers);
  delete missing.problemFraming;
  assert.equal(validateAnswers(missing, assessmentContent.questions).valid, false);

  const invalidValue = { ...fixtures.seed.answers, baExposure: "invented-value" };
  assert.equal(validateAnswers(invalidValue, assessmentContent.questions).valid, false);

  const extraQuestion = { ...fixtures.seed.answers, hiddenSalesQuestion: "yes" };
  const result = validateAnswers(extraQuestion, assessmentContent.questions);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((message) => message.includes("not a recognised question")));
});

for (const [name, fixture] of Object.entries(fixtures)) {
  test(`${name} fixture produces the exact documented readiness and lead outputs`, () => {
    const result = scoreAssessment(fixture.answers, scoringConfig);
    assert.equal(result.readinessScore, fixture.expected.score);
    assert.equal(result.readinessStage, fixture.expected.stage);
    assert.equal(result.readinessProfile, fixture.expected.profile);
    assert.deepEqual(result.dimensions, fixture.expected.dimensions);
    assert.equal(result.initialLeadScore, fixture.expected.leadScore);
    assert.equal(result.leadTemperature, fixture.expected.temperature);
    assert.equal(result.primaryGrowthAreaKey, fixture.expected.growthArea);
    assert.equal(result.strongestArea.key, fixture.expected.strongestArea);
    assert.equal(result.topPriorities.length, 3);
    assert.ok(result.topPriorities.every(({ title, text }) => title && text));
    assert.ok(result.programmeRecommendation.heading);
    assert.ok(result.programmeRecommendation.text);
    assert.ok(result.programmeRecommendation.cta);
  });
}

test("Q7 diagnosis and Q8 urgency never change BA readiness", () => {
  const baseline = fixtures.sprout.answers;
  const baselineResult = scoreAssessment(baseline, scoringConfig);
  const barriers = assessmentContent.questions.find(({ id }) => id === "primaryBarrier").options.map(({ value }) => value);
  const timelines = assessmentContent.questions.find(({ id }) => id === "transitionTimeline").options.map(({ value }) => value);

  for (const primaryBarrier of barriers) {
    for (const transitionTimeline of timelines) {
      const result = scoreAssessment({ ...baseline, primaryBarrier, transitionTimeline }, scoringConfig);
      assert.equal(result.readinessScore, baselineResult.readinessScore);
      assert.equal(result.readinessStage, baselineResult.readinessStage);
      assert.deepEqual(result.dimensions, baselineResult.dimensions);
    }
  }

  const lowIntent = scoreAssessment(
    { ...baseline, primaryBarrier: "no_barrier", transitionTimeline: "exploring" },
    scoringConfig
  );
  const highIntent = scoreAssessment(
    { ...baseline, primaryBarrier: "interview_confidence", transitionTimeline: "asap" },
    scoringConfig
  );
  assert.equal(lowIntent.readinessScore, highIntent.readinessScore);
  assert.ok(highIntent.initialLeadScore > lowIntent.initialLeadScore);
  assert.notEqual(highIntent.leadTemperature, lowIntent.leadTemperature);
  assert.notEqual(highIntent.primaryGrowthAreaKey, lowIntent.primaryGrowthAreaKey);
});

test("readiness uses only the four configured dimensions and their configured weights", () => {
  const dimensions = calculateDimensions(fixtures.sprout.answers, scoringConfig);
  assert.deepEqual(Object.keys(dimensions), [
    "analyticalProblemSolving",
    "transferableExperience",
    "baDevelopment",
    "marketReadiness",
  ]);
  assert.equal(calculateReadiness(dimensions, scoringConfig), 31);
  assert.deepEqual(scoringConfig.readiness.dimensionWeights, {
    analyticalProblemSolving: 0.3,
    transferableExperience: 0.25,
    baDevelopment: 0.25,
    marketReadiness: 0.2,
  });
});

test("all public readiness stage boundaries are inclusive and gap-free", () => {
  assert.deepEqual(
    scoringConfig.readiness.stageThresholds.map(({ key, label, min, max }) => ({ key, label, min, max })),
    [
      { key: "seed", label: "Seed", min: 0, max: 29 },
      { key: "sprout", label: "Sprout", min: 30, max: 59 },
      { key: "growing", label: "Growing", min: 60, max: 79 },
      { key: "established", label: "Established", min: 80, max: 100 },
    ]
  );

  function configProducingUniformScore(score) {
    const config = clone(scoringConfig);
    config.answerScores.analyticalProblemSolving.escalate = score;
    config.answerScores.handlingAmbiguity.wait = score;
    config.answerScores.problemFraming.accept_solution = score;
    config.answerScores.transferableExperience.none = score;
    config.answerScores.careerPosition.exploring.development = score;
    config.answerScores.careerPosition.exploring.market = score;
    config.answerScores.baExposure.none.development = score;
    return config;
  }

  for (const [score, expectedStage] of [
    [0, "Seed"],
    [29, "Seed"],
    [30, "Sprout"],
    [59, "Sprout"],
    [60, "Growing"],
    [79, "Growing"],
    [80, "Established"],
    [100, "Established"],
  ]) {
    const result = scoreAssessment(fixtures.seed.answers, configProducingUniformScore(score));
    assert.equal(result.readinessScore, score, `expected an exact score of ${score}`);
    assert.equal(result.readinessStage, expectedStage, `score ${score} should be ${expectedStage}`);
  }
});

test("configuration validation rejects incomplete versions and invalid weight totals", () => {
  const missingVersion = clone(scoringConfig);
  delete missingVersion.scoringVersion;
  assert.throws(() => validateConfig(missingVersion), /missing or incomplete/i);

  for (const mutate of [
    (config) => { config.readiness.dimensionWeights.marketReadiness = 0.5; },
    (config) => { config.readiness.analyticalQuestionWeights.problemFraming = 0; },
    (config) => { config.readiness.developmentWeights.careerPosition = 0.5; },
    (config) => { config.leadIntent.weights.pain = 0.5; },
  ]) {
    const invalid = clone(scoringConfig);
    mutate(invalid);
    assert.throws(() => validateConfig(invalid), /weights must total 1/i);
  }

  const wrongStageCount = clone(scoringConfig);
  wrongStageCount.readiness.stageThresholds.pop();
  assert.throws(() => validateConfig(wrongStageCount), /Four readiness stage thresholds/i);
});

test("lead payload is normalized, structured and keeps consent separate", () => {
  const result = scoreAssessment(fixtures.established.answers, scoringConfig);
  const payload = buildLeadPayload({
    assessmentId: "91f83188-1ef1-4d7e-9443-0c867ee696a6",
    firstName: "  Ada  ",
    email: " ADA@EXAMPLE.COM ",
    marketingOptIn: false,
    consentTextVersion: "assessment-marketing-2026-08-v2",
    answers: fixtures.established.answers,
    result,
  });

  assert.equal(payload.schemaVersion, "ba-readiness-mvp-v2");
  assert.equal(payload.scoringVersion, scoringConfig.scoringVersion);
  assert.equal(payload.firstName, "Ada");
  assert.equal(payload.email, "ada@example.com");
  assert.equal(payload.readinessStage, "Established");
  assert.equal(payload.readinessScore, 97);
  assert.equal(payload.careerStage, "interviewing_no_offer");
  assert.equal(payload.baExposure, "workplace");
  assert.equal(payload.transitionTimeline, "asap");
  assert.equal(payload.leadTemperature, "Hot");
  assert.equal(payload.initialLeadScore, 93);
  assert.deepEqual(Object.keys(payload.supportingScores), [
    "analyticalProblemSolving",
    "transferableExperience",
    "baDevelopment",
    "marketReadiness",
  ]);
  assert.deepEqual(payload.answers.transferableExperience, allTransferableExperience);
  assert.deepEqual(payload.marketingConsent.optedIn, false);
  assert.equal(payload.marketingConsent.textVersion, "assessment-marketing-2026-08-v2");
  assert.equal(payload.marketingConsent.capturedAt, null);
  assert.match(payload.marketingConsent.decisionCapturedAt, /^\d{4}-\d{2}-\d{2}T/);
});
