(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.AnderseedAssessmentScoring = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const clamp = (value) => Math.max(0, Math.min(100, Math.round(value)));
  const rawClamp = (value) => Math.max(0, Math.min(100, Number(value) || 0));
  const dimensionOrder = ["analyticalProblemSolving", "transferableExperience", "baDevelopment", "marketReadiness"];

  function assertWeights(weights, label) {
    const total = Object.values(weights || {}).reduce((sum, value) => sum + Number(value || 0), 0);
    if (Math.abs(total - 1) > 0.000001) throw new Error(`${label} weights must total 1`);
  }

  function validateConfig(config) {
    if (!config || !config.schemaVersion || !config.scoringVersion) throw new Error("Assessment scoring configuration is missing or incomplete");
    assertWeights(config.readiness?.dimensionWeights, "Readiness");
    assertWeights(config.readiness?.analyticalQuestionWeights, "Analytical question");
    assertWeights(config.readiness?.developmentWeights, "Development");
    assertWeights(config.leadIntent?.weights, "Lead intent");
    if ((config.readiness?.stageThresholds || []).length !== 4) throw new Error("Four readiness stage thresholds are required");
    return true;
  }

  function validateAnswers(answers, questions) {
    const errors = [];
    if (!answers || typeof answers !== "object") return { valid: false, errors: ["Answers are required"] };
    for (const question of questions || []) {
      const allowed = new Set((question.options || []).map((option) => option.value));
      const answer = answers[question.id];
      if (question.type === "multiple") {
        if (!Array.isArray(answer) || answer.length === 0) {
          errors.push(`${question.id} requires at least one answer`);
          continue;
        }
        if (answer.some((value) => !allowed.has(value))) errors.push(`${question.id} contains an invalid answer`);
        if (answer.includes("none") && answer.length > 1) errors.push(`${question.id} cannot combine none with another answer`);
      } else if (typeof answer !== "string" || !allowed.has(answer)) {
        errors.push(`${question.id} requires one valid answer`);
      }
    }
    const knownIds = new Set((questions || []).map((question) => question.id));
    for (const key of Object.keys(answers)) if (!knownIds.has(key)) errors.push(`${key} is not a recognised question`);
    return { valid: errors.length === 0, errors };
  }

  function scoreFromMap(map, value) {
    return rawClamp(map?.[value]);
  }

  function calculateDimensions(answers, config) {
    validateConfig(config);
    const scores = config.answerScores;
    const analyticalWeights = config.readiness.analyticalQuestionWeights;
    const analyticalProblemSolving = rawClamp(
      scoreFromMap(scores.analyticalProblemSolving, answers.analyticalProblemSolving) * analyticalWeights.analyticalProblemSolving +
      scoreFromMap(scores.handlingAmbiguity, answers.handlingAmbiguity) * analyticalWeights.handlingAmbiguity +
      scoreFromMap(scores.problemFraming, answers.problemFraming) * analyticalWeights.problemFraming
    );

    const transferableExperience = rawClamp(
      (answers.transferableExperience || []).reduce((total, value) => total + Number(scores.transferableExperience?.[value] || 0), 0)
    );

    const career = scores.careerPosition?.[answers.careerPosition] || {};
    const exposure = scores.baExposure?.[answers.baExposure] || {};
    const developmentWeights = config.readiness.developmentWeights;
    const baDevelopment = rawClamp(
      Number(exposure.development || 0) * developmentWeights.baExposure +
      Number(career.development || 0) * developmentWeights.careerPosition
    );
    const marketReadiness = rawClamp(career.market || 0);

    return {
      analyticalProblemSolving: clamp(analyticalProblemSolving),
      transferableExperience: clamp(transferableExperience),
      baDevelopment: clamp(baDevelopment),
      marketReadiness: clamp(marketReadiness),
    };
  }

  function calculateReadiness(dimensions, config) {
    const weights = config.readiness.dimensionWeights;
    return clamp(dimensionOrder.reduce((total, key) => total + Number(dimensions[key] || 0) * Number(weights[key] || 0), 0));
  }

  function determineStage(readinessScore, config) {
    const stage = config.readiness.stageThresholds.find(({ min, max }) => readinessScore >= min && readinessScore <= max);
    if (!stage) throw new Error(`No readiness stage configured for score ${readinessScore}`);
    return { ...stage, ...(config.stageContent?.[stage.key] || {}) };
  }

  function calculateLeadIntent(answers, config) {
    const scores = config.answerScores;
    const weights = config.leadIntent.weights;
    const career = scores.careerPosition?.[answers.careerPosition] || {};
    const exposure = scores.baExposure?.[answers.baExposure] || {};
    const barrier = scores.primaryBarrier?.[answers.primaryBarrier] || {};
    const components = {
      urgency: scoreFromMap(scores.transitionTimeline, answers.transitionTimeline),
      careerActivity: rawClamp(career.leadActivity || 0),
      priorCommitment: rawClamp(exposure.leadCommitment || 0),
      pain: rawClamp(barrier.leadPain || 0),
    };
    const score = clamp(Object.entries(components).reduce((total, [key, value]) => total + value * Number(weights[key] || 0), 0));
    const temperature = config.leadIntent.temperatureThresholds.find(({ min, max }) => score >= min && score <= max);
    if (!temperature) throw new Error(`No lead temperature configured for score ${score}`);
    return { score, temperature: temperature.label, temperatureKey: temperature.key, components };
  }

  function lowestDimension(dimensions) {
    return [...dimensionOrder].sort((a, b) => dimensions[a] - dimensions[b] || dimensionOrder.indexOf(a) - dimensionOrder.indexOf(b))[0];
  }

  function determineGrowthArea(answers, dimensions, config) {
    const barrier = config.answerScores.primaryBarrier?.[answers.primaryBarrier] || {};
    if (barrier.growthArea === "conditional_clarity") return answers.careerPosition === "exploring" ? "careerClarity" : "baFoundations";
    if (barrier.growthArea && barrier.growthArea !== "diagnostic_fallback") return barrier.growthArea;

    if (answers.careerPosition === "interviewing_no_offer") return "interviewReadiness";
    if (answers.careerPosition === "applying_no_response") return "marketPositioning";
    if (answers.careerPosition === "trained_not_ready" || ["structured", "multiple_courses"].includes(answers.baExposure)) return "appliedExperience";
    if (answers.careerPosition === "exploring") return "careerClarity";
    if (dimensions.transferableExperience < 50) return "transferableEvidence";
    if (dimensions.baDevelopment < 60) return "baFoundations";
    const fallbackByDimension = {
      analyticalProblemSolving: "baFoundations",
      transferableExperience: "transferableEvidence",
      baDevelopment: "appliedExperience",
      marketReadiness: "marketPositioning",
    };
    return fallbackByDimension[lowestDimension(dimensions)];
  }

  function strongestArea(dimensions, config) {
    const key = [...dimensionOrder].sort((a, b) => dimensions[b] - dimensions[a] || dimensionOrder.indexOf(a) - dimensionOrder.indexOf(b))[0];
    const score = dimensions[key];
    const label = config.dimensionLabels[key];
    const messages = {
      analyticalProblemSolving: score >= 70
        ? "Your answers show a strong instinct for clarifying ambiguity, investigating evidence and framing the real problem before jumping to a solution."
        : "You already show an emerging instinct for looking beyond the immediate request and considering what needs to be understood first.",
      transferableExperience: score >= 70
        ? "Your existing experience contains several BA-relevant behaviours—including understanding needs, solving problems and bringing structure to work."
        : "Your experience already contains useful BA signals that can become stronger evidence when translated into the right language.",
      baDevelopment: score >= 70
        ? "You have already invested in meaningful BA development or used BA responsibilities in practice, giving you a strong base to refine."
        : "You have begun building BA exposure that can become more valuable when connected to consistent practice and evidence.",
      marketReadiness: score >= 70
        ? "Your current activity shows that you are already engaging with the BA market and have real evidence to position more deliberately."
        : "You have begun moving from interest towards action, which gives your next positioning decisions a clear purpose.",
    };
    return { key, label, score, explanation: messages[key] };
  }

  function dimensionStatus(score) {
    if (score >= 80) return "Strong signal";
    if (score >= 60) return "Meaningful capability";
    if (score >= 35) return "Developing";
    return "Priority to build";
  }

  function scoreAssessment(answers, config) {
    const dimensions = calculateDimensions(answers, config);
    const readinessScore = calculateReadiness(dimensions, config);
    const stage = determineStage(readinessScore, config);
    const leadIntent = calculateLeadIntent(answers, config);
    const growthAreaKey = determineGrowthArea(answers, dimensions, config);
    const growthArea = config.growthAreas[growthAreaKey];
    if (!growthArea) throw new Error(`No growth-area content configured for ${growthAreaKey}`);
    const strongest = strongestArea(dimensions, config);
    return {
      schemaVersion: config.schemaVersion,
      scoringVersion: config.scoringVersion,
      readinessScore,
      readinessProfile: stage.key,
      readinessStage: stage.label,
      readinessStageIcon: stage.icon,
      resultTitle: stage.title,
      focus: stage.focus,
      explanation: stage.explanation,
      dimensions,
      dimensionStatuses: Object.fromEntries(Object.entries(dimensions).map(([key, value]) => [key, dimensionStatus(value)])),
      strongestArea: strongest,
      strength: strongest.explanation,
      primaryGrowthAreaKey: growthAreaKey,
      primaryGrowthArea: growthArea.label,
      biggestGap: growthArea.explanation,
      recommendedNextMove: growthArea.nextSteps[0],
      topPriorities: growthArea.nextSteps.map((step, index) => ({ key: `${growthAreaKey}-${index + 1}`, ...step })),
      programmeRecommendation: {
        heading: growthArea.programmeHeading,
        text: growthArea.programmeText,
        cta: growthArea.cta,
      },
      initialLeadScore: leadIntent.score,
      leadTemperature: leadIntent.temperature,
      leadTemperatureKey: leadIntent.temperatureKey,
      leadComponents: leadIntent.components,
      internalSegment: `${stage.key}_${growthAreaKey}_${leadIntent.temperatureKey}`,
    };
  }

  function buildLeadPayload({ assessmentId, firstName, email, marketingOptIn, consentTextVersion, answers, result }) {
    const now = new Date().toISOString();
    return {
      schemaVersion: result.schemaVersion,
      scoringVersion: result.scoringVersion,
      assessmentId: String(assessmentId || ""),
      leadSource: "Anderseed BA Readiness Assessment",
      firstName: String(firstName || "").trim(),
      email: String(email || "").trim().toLowerCase(),
      marketingConsent: {
        optedIn: Boolean(marketingOptIn),
        textVersion: String(consentTextVersion || ""),
        capturedAt: marketingOptIn ? now : null,
        decisionCapturedAt: now,
      },
      clientSubmittedAt: now,
      readinessProfile: result.readinessProfile,
      readinessStage: result.readinessStage,
      readinessScore: result.readinessScore,
      supportingScores: { ...result.dimensions },
      strongestArea: result.strongestArea.key,
      primaryGrowthArea: result.primaryGrowthAreaKey,
      recommendedNextMove: result.recommendedNextMove.title,
      careerStage: answers.careerPosition,
      baExposure: answers.baExposure,
      transitionTimeline: answers.transitionTimeline,
      initialLeadScore: result.initialLeadScore,
      leadTemperature: result.leadTemperature,
      internalSegment: result.internalSegment,
      answers: {
        ...answers,
        transferableExperience: [...(answers.transferableExperience || [])],
      },
    };
  }

  return {
    validateConfig,
    validateAnswers,
    calculateDimensions,
    calculateReadiness,
    calculateLeadIntent,
    determineGrowthArea,
    scoreAssessment,
    buildLeadPayload,
  };
});
