(function () {
  "use strict";

  const configElement = document.getElementById("assessment-config");
  const app = document.querySelector("[data-assessment-app]");
  if (!configElement || !app || !window.AnderseedAssessmentScoring) return;

  const config = JSON.parse(configElement.textContent);
  const scoring = window.AnderseedAssessmentScoring;
  scoring.validateConfig(config.scoring);

  const draftKey = "anderseed.baReadiness.v2.draft";
  const analyticsKey = "anderseed.baReadiness.v2.analyticsSession";
  const analyticsQueueKey = `${analyticsKey}.pendingEvents`;
  const analyticsBatchSize = 20;
  const analyticsQueueLimit = 100;
  const createId = () => {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    const bytes = new Uint8Array(16);
    if (window.crypto?.getRandomValues) window.crypto.getRandomValues(bytes);
    else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
  };
  const state = {
    step: -1,
    answers: {},
    result: null,
    assessmentId: createId(),
    completionToken: null,
    completedQuestions: new Set(),
    assessmentCompleted: false,
    pendingReveal: "",
    phase: "landing",
  };

  const landing = app.querySelector("[data-assessment-landing]");
  const questionView = app.querySelector("[data-question-view]");
  const completionView = app.querySelector("[data-completion-view]");
  const gateView = app.querySelector("[data-gate-view]");
  const resultView = app.querySelector("[data-result-view]");
  const questionHost = app.querySelector("[data-question-host]");
  const progressText = app.querySelector("[data-progress-text]");
  const progressBar = app.querySelector("[data-progress-bar]");
  const growthProgress = app.querySelector("[data-growth-progress]");
  const growthCopy = app.querySelector("[data-growth-copy]");
  const microReveal = app.querySelector("[data-micro-reveal]");
  const resumeStatus = app.querySelector("[data-resume-status]");
  const assessmentStatus = app.querySelector("[data-assessment-status]");
  const completionStatus = app.querySelector("[data-completion-status]");
  const completionContinueButton = app.querySelector("[data-completion-continue]");
  const nextButton = app.querySelector("[data-next]");
  const backButton = app.querySelector("[data-back]");
  const gateBackButton = app.querySelector("[data-gate-back]");
  const leadForm = app.querySelector("[data-lead-form]");
  const storageStatus = app.querySelector("[data-storage-status]");
  const gateResumeStatus = app.querySelector("[data-gate-resume-status]");
  const landingTitle = app.querySelector("#assessmentLandingTitle");
  const completionTitle = app.querySelector("#assessmentCompletionTitle");
  const resultTitle = app.querySelector("#assessmentResultTitle");
  const exitDialog = app.querySelector("[data-exit-dialog]");
  const exitTitle = app.querySelector("[data-exit-title]");
  const exitMessage = app.querySelector("[data-exit-message]");
  const exitStorage = app.querySelector("[data-exit-storage]");
  const exitContinueButton = app.querySelector("[data-exit-continue]");
  const exitConfirmButton = app.querySelector("[data-exit-confirm]");
  const gateIntro = gateView?.querySelector(".assessment-gate-intro");
  const gateFormSheet = gateView?.querySelector(".assessment-gate-form-sheet");
  const gateLockedPreview = gateIntro?.querySelector(".assessment-locked-preview");
  const gateBenefits = gateIntro?.querySelector(".assessment-gate-benefits");
  const mobileGateQuery = typeof window.matchMedia === "function"
    ? window.matchMedia("(max-width: 680px)")
    : { matches: false };
  let gateValuePreview = null;
  const growthStages = [0, 1, 1, 2, 2, 3, 3, 4];
  const growthMessages = [
    "Your Growth Profile is beginning to take shape.",
    "Your profile is taking root as we connect how you approach problems.",
    "Your transferable experience is emerging more clearly.",
    "The picture is growing as we connect your experience with your current journey.",
    "Your Growth Profile is nearly complete.",
  ];
  let pendingExitAction = null;
  let exitReturnFocus = null;
  let allowExit = false;
  let beforeUnloadAttached = false;
  let draftRestoreStatus = "none";
  let resumeFromIntroduction = false;
  let analyticsQueue = readAnalyticsQueue();
  let analyticsInFlight = [];
  let analyticsFlushPromise = null;
  let analyticsRetryTimer = null;
  let analyticsRetryAttempt = 0;

  function focusViewHeading(element) {
    window.requestAnimationFrame(() => element?.focus({ preventScroll: true }));
  }

  function analyticsSessionId() {
    try {
      let id = window.sessionStorage.getItem(analyticsKey);
      if (!id) {
        id = createId();
        window.sessionStorage.setItem(analyticsKey, id);
      }
      return id;
    } catch {
      return createId();
    }
  }

  function readAnalyticsQueue() {
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(analyticsQueueKey) || "[]");
      if (!Array.isArray(saved)) return [];
      return saved.filter((item) => item && typeof item.eventId === "string").slice(-analyticsQueueLimit);
    } catch {
      return [];
    }
  }

  function pendingAnalyticsEvents() {
    const seen = new Set();
    return [...analyticsInFlight, ...analyticsQueue].filter((item) => {
      if (!item?.eventId || seen.has(item.eventId)) return false;
      seen.add(item.eventId);
      return true;
    }).slice(-analyticsQueueLimit);
  }

  function persistAnalyticsQueue() {
    try {
      const pending = pendingAnalyticsEvents();
      if (pending.length) window.sessionStorage.setItem(analyticsQueueKey, JSON.stringify(pending));
      else window.sessionStorage.removeItem(analyticsQueueKey);
    } catch {}
  }

  function scheduleAnalyticsRetry() {
    if (analyticsRetryTimer || !analyticsQueue.length) return;
    const delay = Math.min(30000, 1000 * (2 ** analyticsRetryAttempt));
    analyticsRetryTimer = window.setTimeout(() => {
      analyticsRetryTimer = null;
      analyticsRetryAttempt = Math.min(5, analyticsRetryAttempt + 1);
      void flushAnalytics();
    }, delay);
  }

  function requeueAnalyticsEvents(events) {
    const existing = new Set(analyticsQueue.map((item) => item.eventId));
    analyticsQueue = [
      ...events.filter((item) => !existing.has(item.eventId)),
      ...analyticsQueue,
    ].slice(-analyticsQueueLimit);
    persistAnalyticsQueue();
  }

  function flushAnalyticsWithBeacon() {
    const endpoint = config.endpoints?.events;
    if (!endpoint || typeof navigator.sendBeacon !== "function") return false;
    const pending = pendingAnalyticsEvents();
    if (!pending.length) return true;

    const acceptedIds = new Set();
    for (let index = 0; index < pending.length; index += analyticsBatchSize) {
      const batch = pending.slice(index, index + analyticsBatchSize);
      const body = JSON.stringify({ events: batch });
      const accepted = navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));
      if (!accepted) break;
      batch.forEach((item) => acceptedIds.add(item.eventId));
    }
    if (!acceptedIds.size) return false;
    analyticsQueue = analyticsQueue.filter((item) => !acceptedIds.has(item.eventId));
    analyticsInFlight = analyticsInFlight.filter((item) => !acceptedIds.has(item.eventId));
    persistAnalyticsQueue();
    return acceptedIds.size === pending.length;
  }

  function flushAnalytics(options = {}) {
    const endpoint = config.endpoints?.events;
    if (!endpoint) return Promise.resolve(false);
    if (options.useBeacon && flushAnalyticsWithBeacon()) return Promise.resolve(true);
    if (analyticsFlushPromise) return analyticsFlushPromise;
    if (!analyticsQueue.length) return Promise.resolve(true);

    const batch = analyticsQueue.splice(0, analyticsBatchSize);
    analyticsInFlight = batch;
    persistAnalyticsQueue();
    analyticsFlushPromise = window.fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ events: batch }),
      keepalive: true,
      credentials: "same-origin",
    }).then((response) => {
      if (!response.ok) throw new Error(`Analytics request failed with ${response.status}`);
      analyticsInFlight = [];
      analyticsRetryAttempt = 0;
      persistAnalyticsQueue();
      return true;
    }).catch(() => {
      requeueAnalyticsEvents(analyticsInFlight);
      analyticsInFlight = [];
      scheduleAnalyticsRetry();
      return false;
    }).finally(() => {
      analyticsFlushPromise = null;
      if (analyticsQueue.length >= analyticsBatchSize) void flushAnalytics();
    });
    return analyticsFlushPromise;
  }

  function queueAnalyticsEvent(detail) {
    if (!config.endpoints?.events) return;
    analyticsQueue.push(detail);
    analyticsQueue = analyticsQueue.slice(-analyticsQueueLimit);
    persistAnalyticsQueue();
    if (analyticsQueue.length >= analyticsBatchSize) void flushAnalytics();
  }

  function trackEvent(name, parameters) {
    const safeParameters = parameters || {};
    const detail = {
      eventId: createId(),
      analyticsSessionId: analyticsSessionId(),
      eventName: name,
      schemaVersion: config.schemaVersion,
      scoringVersion: config.scoring.scoringVersion,
      questionId: safeParameters.question_id || null,
      questionNumber: Number(safeParameters.question_number || 0) || null,
      clientTimestamp: new Date().toISOString(),
    };
    window.dispatchEvent(new CustomEvent("anderseed:analytics", { detail }));
    if (typeof window.gtag === "function") {
      window.gtag("event", name, {
        assessment_version: config.schemaVersion,
        question_id: detail.questionId,
        question_number: detail.questionNumber,
      });
    }
    queueAnalyticsEvent(detail);
  }

  function assessmentStartedSessionKey() {
    return `${analyticsKey}.assessmentStarted.${state.assessmentId}`;
  }

  function markAssessmentStartedInSession() {
    try { window.sessionStorage.setItem(assessmentStartedSessionKey(), "1"); } catch {}
  }

  function trackRestoredAssessmentStart() {
    try {
      if (window.sessionStorage.getItem(assessmentStartedSessionKey()) === "1") return;
    } catch {}
    const question = config.questions[state.step];
    trackEvent("assessment_started", {
      question_id: question?.id,
      question_number: state.step + 1,
    });
    markAssessmentStartedInSession();
  }

  function arrangeGateForViewport() {
    if (!gateIntro || !gateFormSheet || !gateLockedPreview || !gateBenefits) return;
    if (mobileGateQuery.matches) {
      if (!gateValuePreview) {
        gateValuePreview = document.createElement("div");
        gateValuePreview.className = "assessment-gate-intro assessment-gate-value-preview";
        gateValuePreview.setAttribute("aria-label", "What your personalised result includes");
      }
      gateValuePreview.append(gateLockedPreview, gateBenefits);
      gateFormSheet.insertAdjacentElement("afterend", gateValuePreview);
      return;
    }
    gateIntro.append(gateLockedPreview, gateBenefits);
    gateValuePreview?.remove();
  }

  function shouldProtectExit() {
    return !allowExit
      && state.step >= 0
      && (state.phase === "question" || state.phase === "completion" || state.phase === "gate");
  }

  function handleBeforeUnload(event) {
    if (!shouldProtectExit()) return;
    persistDraft();
    event.preventDefault();
    event.returnValue = "";
  }

  function updateExitProtection() {
    const shouldAttach = shouldProtectExit();
    if (shouldAttach && !beforeUnloadAttached) {
      window.addEventListener("beforeunload", handleBeforeUnload);
      beforeUnloadAttached = true;
    } else if (!shouldAttach && beforeUnloadAttached) {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      beforeUnloadAttached = false;
    }
  }

  function show(view) {
    if (view === gateView) arrangeGateForViewport();
    [landing, questionView, completionView, gateView, resultView].forEach((item) => {
      item.hidden = item !== view;
    });
    if (view === questionView) state.phase = "question";
    else if (view === completionView) state.phase = "completion";
    else if (view === gateView) state.phase = "gate";
    else if (view === resultView) state.phase = "result";
    else state.phase = "landing";
    updateExitProtection();
    view.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }

  function setStatus(element, message) {
    if (!element) return;
    element.textContent = message || "";
    element.hidden = !message;
  }

  function persistDraft() {
    if (state.step < 0) return false;
    try {
      const ttl = Math.max(1, Number(config.progressTtlHours || 24)) * 60 * 60 * 1000;
      const resultReady = Boolean(state.completionToken)
        && (state.phase === "completion" || state.phase === "gate");
      window.localStorage.setItem(draftKey, JSON.stringify({
        schemaVersion: config.schemaVersion,
        assessmentId: state.assessmentId,
        step: state.step,
        phase: resultReady ? "gate" : "question",
        completionToken: resultReady ? state.completionToken : null,
        answers: state.answers,
        completedQuestions: [...state.completedQuestions],
        expiresAt: Date.now() + ttl,
      }));
      return true;
    } catch {
      return false;
    }
  }

  function clearDraft() {
    try { window.localStorage.removeItem(draftKey); } catch {}
  }

  function restoreDraft() {
    draftRestoreStatus = "none";
    try {
      const saved = JSON.parse(window.localStorage.getItem(draftKey) || "null");
      if (!saved || saved.schemaVersion !== config.schemaVersion) {
        clearDraft();
        return false;
      }
      if (Number(saved.expiresAt || 0) <= Date.now()) {
        draftRestoreStatus = "expired";
        clearDraft();
        return false;
      }
      state.assessmentId = String(saved.assessmentId || createId());
      state.answers = saved.answers && typeof saved.answers === "object" ? saved.answers : {};
      state.step = Math.max(0, Math.min(config.questions.length - 1, Number(saved.step || 0)));
      state.completedQuestions = new Set(Array.isArray(saved.completedQuestions) ? saved.completedQuestions : []);
      state.phase = saved.phase === "gate" ? "gate" : "question";
      state.completionToken = state.phase === "gate" && typeof saved.completionToken === "string" ? saved.completionToken : null;
      state.assessmentCompleted = state.phase === "gate";
      if (state.phase === "question") trackRestoredAssessmentStart();
      draftRestoreStatus = "restored";
      return true;
    } catch {
      clearDraft();
      return false;
    }
  }

  function hasAnswer(question) {
    const answer = state.answers[question.id];
    return question.type === "multiple" ? Array.isArray(answer) && answer.length > 0 : Boolean(answer);
  }

  function updateGrowthProgress() {
    const current = growthStages[state.step] ?? 0;
    growthProgress?.querySelectorAll("[data-growth-node]").forEach((node) => {
      const index = Number(node.dataset.growthNode);
      node.classList.toggle("complete", index < current);
      node.classList.toggle("current", index === current);
    });
    if (growthCopy) growthCopy.textContent = growthMessages[current];
  }

  function createOption(question, option) {
    const wrapper = document.createElement("label");
    wrapper.className = "assessment-option";
    const input = document.createElement("input");
    input.type = question.type === "multiple" ? "checkbox" : "radio";
    input.name = question.id;
    input.value = option.value;
    input.checked = question.type === "multiple"
      ? (state.answers[question.id] || []).includes(option.value)
      : state.answers[question.id] === option.value;
    const control = document.createElement("span");
    control.className = "assessment-option-control";
    control.setAttribute("aria-hidden", "true");
    const text = document.createElement("span");
    text.className = "assessment-option-text";
    text.textContent = option.label;
    wrapper.append(input, control, text);

    input.addEventListener("change", () => {
      if (question.type === "multiple") {
        let values = [...(state.answers[question.id] || [])];
        if (option.exclusive && input.checked) {
          values = [option.value];
        } else {
          values = values.filter((value) => value !== "none" && value !== option.value);
          if (input.checked) values.push(option.value);
        }
        state.answers[question.id] = values;
        questionHost.querySelectorAll(`input[name="${question.id}"]`).forEach((optionInput) => {
          optionInput.checked = values.includes(optionInput.value);
        });
      } else {
        state.answers[question.id] = option.value;
      }
      nextButton.disabled = !hasAnswer(question);
      persistDraft();
      updateExitProtection();
      trackEvent("assessment_question_answered", { question_id: question.id, question_number: state.step + 1 });
    });
    return wrapper;
  }

  function renderQuestion() {
    const question = config.questions[state.step];
    setStatus(assessmentStatus, "");
    progressText.textContent = `Question ${state.step + 1} of ${config.questions.length}`;
    progressBar.style.width = `${((state.step + 1) / config.questions.length) * 100}%`;
    progressBar.parentElement.setAttribute("aria-valuenow", String(state.step + 1));
    progressBar.parentElement.setAttribute("aria-valuemax", String(config.questions.length));
    backButton.hidden = state.step === 0;
    nextButton.textContent = state.step === config.questions.length - 1 ? "Complete Assessment" : "Next Question";
    nextButton.disabled = !hasAnswer(question);
    updateGrowthProgress();

    if (state.pendingReveal) {
      microReveal.textContent = state.pendingReveal;
      microReveal.hidden = false;
      state.pendingReveal = "";
    } else {
      microReveal.textContent = "";
      microReveal.hidden = true;
    }

    const fieldset = document.createElement("fieldset");
    fieldset.className = "assessment-question";
    const legend = document.createElement("legend");
    legend.textContent = question.question;
    legend.tabIndex = -1;
    const help = document.createElement("p");
    help.className = "assessment-question-help";
    help.textContent = question.help;
    const options = document.createElement("div");
    options.className = "assessment-options";
    question.options.forEach((option) => options.appendChild(createOption(question, option)));
    fieldset.append(legend, help, options);
    questionHost.replaceChildren(fieldset);
    persistDraft();
    trackEvent("assessment_question_viewed", { question_id: question.id, question_number: state.step + 1 });
    window.setTimeout(() => legend.focus(), 0);
  }

  function beginAssessment() {
    allowExit = false;
    state.step = 0;
    state.answers = {};
    state.assessmentId = createId();
    state.completedQuestions = new Set();
    state.assessmentCompleted = false;
    state.phase = "question";
    setStatus(resumeStatus, "");
    show(questionView);
    trackEvent("assessment_started");
    markAssessmentStartedInSession();
    renderQuestion();
  }

  function retryDelay(attempt) {
    return 350 * (2 ** attempt);
  }

  function wait(delay) {
    return new Promise((resolve) => window.setTimeout(resolve, delay));
  }

  async function postJson(url, payload, maximumAttempts = 3) {
    let lastError;
    for (let attempt = 0; attempt < maximumAttempts; attempt += 1) {
      try {
        const response = await window.fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok && data.ok !== false) return data;
        const error = new Error(data.message || "We could not securely save your assessment. Please try again.");
        error.status = response.status;
        throw error;
      } catch (error) {
        lastError = error;
        const status = Number(error.status || 0);
        const retryable = status === 0 || [408, 425, 500, 502, 503, 504].includes(status);
        if (!retryable || attempt === maximumAttempts - 1) throw error;
        await wait(retryDelay(attempt));
      }
    }
    throw lastError;
  }

  async function completeAssessment() {
    const validation = scoring.validateAnswers(state.answers, config.questions);
    if (!validation.valid) {
      setStatus(assessmentStatus, "Please answer every question before completing the assessment.");
      return;
    }
    state.result = scoring.scoreAssessment(state.answers, config.scoring);
    if (!state.assessmentCompleted) {
      state.assessmentCompleted = true;
      trackEvent("assessment_completed");
    }
    nextButton.disabled = true;
    nextButton.textContent = "Preparing Your Growth Profile…";
    setStatus(assessmentStatus, "Securely preparing your personalised result…");
    completionContinueButton.disabled = true;
    completionContinueButton.dataset.action = "waiting";
    completionContinueButton.textContent = "Preparing Your Result…";
    setStatus(completionStatus, "Preparing your secure result…");
    show(completionView);
    focusViewHeading(completionTitle);
    try {
      const outcome = await postJson(config.endpoints.complete, {
        assessmentId: state.assessmentId,
        schemaVersion: config.schemaVersion,
        scoringVersion: config.scoring.scoringVersion,
        answers: state.answers,
      });
      state.completionToken = outcome.completionToken;
      state.result = outcome.result;
      setStatus(assessmentStatus, "");
      setStatus(gateResumeStatus, "");
      setStatus(completionStatus, "Next, enter your details to see your score and receive your free roadmap.");
      completionContinueButton.dataset.action = "continue";
      completionContinueButton.textContent = "See My Result →";
      completionContinueButton.disabled = false;
      persistDraft();
      void flushAnalytics();
    } catch (error) {
      completionContinueButton.dataset.action = "retry";
      completionContinueButton.textContent = "Try Preparing My Result Again";
      completionContinueButton.disabled = false;
      setStatus(completionStatus, error.message);
    }
  }

  function continueFromCompletion() {
    if (completionContinueButton.dataset.action === "retry") {
      completeAssessment();
      return;
    }
    if (!state.completionToken) return;
    setStatus(gateResumeStatus, "");
    show(gateView);
    persistDraft();
    trackEvent("email_gate_viewed");
    leadForm.querySelector("#assessmentFirstName")?.focus();
  }

  function advance() {
    const question = config.questions[state.step];
    if (!hasAnswer(question)) return;
    state.completedQuestions.add(question.id);
    if (state.step === config.questions.length - 1) {
      completeAssessment();
      return;
    }
    state.pendingReveal = question.revealAfter || "";
    state.step += 1;
    renderQuestion();
  }

  function goBack() {
    if (state.step <= 0) return;
    state.step -= 1;
    renderQuestion();
  }

  function exitPromptCopy(saved) {
    const questionNumber = Math.max(1, state.step + 1);
    const totalQuestions = config.questions.length;
    const ttlHours = Math.max(1, Number(config.progressTtlHours || 24));
    const ttlLabel = `${ttlHours} ${ttlHours === 1 ? "hour" : "hours"}`;
    const atCompletion = state.phase === "completion";
    const atGate = state.phase === "gate";
    const resultReady = atCompletion || atGate;
    return {
      title: "Leave before seeing your result?",
      message: resultReady
        ? "Your answers are complete. If you leave now, you won’t see your personalised BA Readiness Score and free BA Transition Roadmap yet."
        : `You’re on Question ${questionNumber} of ${totalQuestions}. If you leave now, you won’t see your personalised BA Readiness Score and free BA Transition Roadmap yet.`,
      storage: saved
        ? `We’ll save your place and answers on this device for ${ttlLabel}. Return within that time to continue where you stopped; after that, your saved progress expires.`
        : "This browser couldn’t save your progress, so leaving now means starting again next time.",
      continueLabel: atCompletion ? "Stay and See My Result" : atGate ? "Continue to See My Result" : "Continue My Assessment",
      leaveLabel: saved ? "Leave & Save My Progress" : "Leave Assessment",
    };
  }

  function closeExitDialog(restoreFocus = true) {
    const focusTarget = exitReturnFocus;
    pendingExitAction = null;
    exitReturnFocus = null;
    if (exitDialog?.open) exitDialog.close();
    document.body.classList.remove("assessment-exit-open");
    if (restoreFocus && focusTarget?.isConnected) {
      window.requestAnimationFrame(() => focusTarget.focus());
    }
  }

  function continueAssessmentFromDialog() {
    const atCompletion = state.phase === "completion";
    const atGate = state.phase === "gate";
    trackEvent("exit_cancelled");
    closeExitDialog(!atGate && !atCompletion);
    if (atGate) {
      window.requestAnimationFrame(() => leadForm.querySelector("#assessmentFirstName")?.focus());
    } else if (atCompletion) {
      window.requestAnimationFrame(() => completionContinueButton?.focus());
    }
  }

  function confirmAssessmentExit() {
    const action = pendingExitAction;
    trackEvent("exit_confirmed");
    persistDraft();
    allowExit = true;
    updateExitProtection();
    closeExitDialog(false);
    if (action) action();
    window.setTimeout(() => {
      allowExit = false;
      updateExitProtection();
    }, 1000);
  }

  function openExitDialog(action, trigger) {
    const copy = exitPromptCopy(persistDraft());
    pendingExitAction = action;
    exitReturnFocus = trigger || document.activeElement;
    trackEvent("exit_prompt_viewed");

    if (!exitDialog || typeof exitDialog.showModal !== "function") {
      const confirmed = window.confirm(`${copy.title}\n\n${copy.message}\n\n${copy.storage}`);
      if (confirmed) confirmAssessmentExit();
      else {
        trackEvent("exit_cancelled");
        pendingExitAction = null;
        exitReturnFocus = null;
      }
      return;
    }

    exitTitle.textContent = copy.title;
    exitMessage.textContent = copy.message;
    exitStorage.textContent = copy.storage;
    exitContinueButton.textContent = copy.continueLabel;
    exitConfirmButton.textContent = copy.leaveLabel;
    document.body.classList.add("assessment-exit-open");
    exitDialog.showModal();
    window.requestAnimationFrame(() => exitContinueButton.focus());
  }

  function handleProtectedLinkClick(event) {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (typeof event.button === "number" && event.button !== 0) return;
    const link = event.target?.closest?.("a[href]");
    if (!link || !shouldProtectExit() || link.hasAttribute("download")) return;
    const target = String(link.getAttribute("target") || "").toLowerCase();
    if (target && target !== "_self") return;
    const rawHref = String(link.getAttribute("href") || "").trim();
    if (!rawHref || rawHref.startsWith("#") || rawHref.toLowerCase().startsWith("javascript:")) return;

    let destination;
    let current;
    try {
      destination = new URL(link.href, window.location.href);
      current = new URL(window.location.href);
    } catch {
      return;
    }
    const sameDocument = destination.origin === current.origin
      && destination.pathname === current.pathname
      && destination.search === current.search;
    if (sameDocument && destination.hash) return;

    event.preventDefault();
    openExitDialog(() => window.location.assign(destination.href), link);
  }

  function keepFocusInsideExitDialog(event) {
    if (event.key !== "Tab" || !exitDialog?.open) return;
    const focusable = [...exitDialog.querySelectorAll("button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex='-1'])")];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function renderResult() {
    const result = state.result;
    resultView.dataset.stage = result.readinessProfile;
    resultView.querySelector("[data-result-stage]").textContent = result.readinessStage;
    resultView.querySelector("[data-result-score]").textContent = result.readinessScore;
    const scoreWrap = resultView.querySelector("[data-result-score-wrap]");
    scoreWrap.style.setProperty("--score", String(result.readinessScore));
    scoreWrap.setAttribute("aria-label", `BA Readiness Score ${result.readinessScore} out of 100`);

    resultView.querySelector("[data-result-title]").textContent = result.resultTitle;
    resultView.querySelector("[data-result-explanation]").textContent = result.explanation;
    resultView.querySelector("[data-result-strength-label]").textContent = result.strongestArea.label;
    resultView.querySelector("[data-result-strength]").textContent = result.strength;
    resultView.querySelector("[data-result-growth-label]").textContent = result.primaryGrowthArea;
    resultView.querySelector("[data-result-gap]").textContent = result.biggestGap;

    const dimensionAccents = {
      analyticalProblemSolving: "#c8a55a",
      transferableExperience: "#7ed4a0",
      baDevelopment: "#4ba8a2",
      marketReadiness: "#dc806f",
    };
    const dimensions = resultView.querySelector("[data-result-dimensions]");
    const dimensionCards = Object.entries(result.dimensions).map(([key, score]) => {
      const card = document.createElement("article");
      card.className = "result-dimension-card";
      card.dataset.dimension = key;
      card.style.setProperty("--dimension-accent", dimensionAccents[key] || "#1f6b52");

      const heading = document.createElement("div");
      const label = document.createElement("span");
      label.textContent = config.scoring.dimensionLabels[key] || key;
      const value = document.createElement("strong");
      value.textContent = String(score);
      const maximum = document.createElement("small");
      maximum.textContent = "/100";
      value.appendChild(maximum);
      heading.append(label, value);

      const status = document.createElement("p");
      status.textContent = result.dimensionStatuses[key];
      const track = document.createElement("div");
      track.className = "result-dimension-bar";
      track.setAttribute("aria-hidden", "true");
      const fill = document.createElement("i");
      fill.style.width = `${score}%`;
      track.appendChild(fill);
      card.append(heading, status, track);
      return card;
    });
    dimensions.replaceChildren(...dimensionCards);
  }

  async function submitLead(event) {
    event.preventDefault();
    if (!leadForm.reportValidity()) return;
    const formData = new FormData(leadForm);
    const firstName = String(formData.get("firstName") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const marketingOptIn = formData.get("marketingOptIn") === "yes";
    const submitButton = leadForm.querySelector("button[type='submit']");
    submitButton.disabled = true;
    submitButton.textContent = "Revealing Your Result…";
    setStatus(storageStatus, "");
    try {
      const outcome = await postJson(config.endpoints.contact, {
        assessmentId: state.assessmentId,
        completionToken: state.completionToken,
        firstName,
        email,
        marketingOptIn,
        marketingConsentTextVersion: config.marketingConsentTextVersion,
      });
      state.result = outcome.result;
      renderResult();
      clearDraft();
      show(resultView);
      focusViewHeading(resultTitle);
      trackEvent("contact_details_submitted");
      trackEvent("result_viewed");
      void flushAnalytics();
    } catch (error) {
      submitButton.disabled = false;
      submitButton.textContent = "Try Revealing My Results Again";
      setStatus(storageStatus, error.message);
    }
  }

  function restart() {
    allowExit = false;
    if (window.location.hash) {
      try {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.hash = "";
        window.history.replaceState(window.history.state, "", cleanUrl.href);
      } catch {}
    }
    clearDraft();
    state.step = -1;
    state.answers = {};
    state.result = null;
    state.assessmentId = createId();
    state.completionToken = null;
    state.completedQuestions = new Set();
    state.assessmentCompleted = false;
    state.pendingReveal = "";
    state.phase = "landing";
    leadForm.reset();
    const submitButton = leadForm.querySelector("button[type='submit']");
    submitButton.disabled = false;
    submitButton.textContent = "See My Result & Get My Free Roadmap →";
    setStatus(storageStatus, "");
    beginAssessment();
  }

  function resumeRestoredAssessment() {
    const resumeAtGate = state.phase === "gate";
    if (resumeAtGate && state.completionToken) {
      state.result = scoring.scoreAssessment(state.answers, config.scoring);
      show(gateView);
      persistDraft();
      setStatus(gateResumeStatus, "Welcome back — your completed answers are ready. Continue to see your personalised result.");
      leadForm.querySelector("#assessmentFirstName")?.focus();
    } else {
      show(questionView);
      renderQuestion();
    }
    if (resumeAtGate && !state.completionToken) {
      state.assessmentCompleted = false;
      trackRestoredAssessmentStart();
      setStatus(resumeStatus, "Welcome back — your answers have been restored. We’re preparing your result again now.");
      completeAssessment();
    } else if (!resumeAtGate) {
      setStatus(resumeStatus, `Welcome back — your progress has been restored at Question ${state.step + 1} of ${config.questions.length}.`);
    }
  }

  function startAssessmentFromLanding() {
    if (resumeFromIntroduction) {
      resumeFromIntroduction = false;
      resumeRestoredAssessment();
      return;
    }
    beginAssessment();
  }

  app.querySelectorAll("[data-start-assessment]").forEach((button) => button.addEventListener("click", startAssessmentFromLanding));
  nextButton.addEventListener("click", advance);
  backButton.addEventListener("click", goBack);
  completionContinueButton.addEventListener("click", continueFromCompletion);
  gateBackButton.addEventListener("click", () => {
    show(questionView);
    renderQuestion();
  });
  leadForm.addEventListener("submit", submitLead);
  const roadmapCta = app.querySelector("[data-roadmap-cta]");
  roadmapCta?.addEventListener("click", () => trackEvent("roadmap_cta_clicked"));
  app.querySelector("[data-programme-cta]").addEventListener("click", () => trackEvent("anderseed_programme_cta_clicked"));
  app.querySelector("[data-restart]").addEventListener("click", restart);
  exitContinueButton?.addEventListener("click", continueAssessmentFromDialog);
  exitConfirmButton?.addEventListener("click", confirmAssessmentExit);
  exitDialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    trackEvent("exit_cancelled");
    closeExitDialog(true);
  });
  exitDialog?.addEventListener("click", (event) => {
    if (event.target === exitDialog) {
      trackEvent("exit_cancelled");
      closeExitDialog(true);
    }
  });
  exitDialog?.addEventListener("keydown", keepFocusInsideExitDialog);
  document.addEventListener("click", handleProtectedLinkClick);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && state.step >= 0 && (state.phase === "question" || state.phase === "completion" || state.phase === "gate")) {
      persistDraft();
    }
    if (document.visibilityState === "hidden") void flushAnalytics({ useBeacon: true });
  });
  window.addEventListener("pagehide", () => {
    if (state.step >= 0 && (state.phase === "question" || state.phase === "completion" || state.phase === "gate")) persistDraft();
    void flushAnalytics({ useBeacon: true });
  });

  if (typeof mobileGateQuery.addEventListener === "function") {
    mobileGateQuery.addEventListener("change", arrangeGateForViewport);
  } else if (typeof mobileGateQuery.addListener === "function") {
    mobileGateQuery.addListener(arrangeGateForViewport);
  }

  trackEvent("assessment_page_viewed");
  if (analyticsQueue.length > 1) scheduleAnalyticsRetry();
  const routeParameters = new URLSearchParams(window.location.search);
  const forceIntroduction = routeParameters.get("intro") === "1";
  const restoredDraft = restoreDraft();
  if (restoredDraft) {
    trackEvent("assessment_restored");
    if (forceIntroduction) {
      resumeFromIntroduction = true;
      app.querySelectorAll("[data-start-assessment]").forEach((button) => {
        button.innerHTML = 'Continue My Assessment <span aria-hidden="true">→</span>';
      });
      show(landing);
      focusViewHeading(landingTitle);
    } else {
      resumeRestoredAssessment();
    }
  } else if (forceIntroduction) {
    if (draftRestoreStatus === "expired") trackEvent("draft_expired");
    show(landing);
    focusViewHeading(landingTitle);
  } else if (draftRestoreStatus === "expired") {
    trackEvent("draft_expired");
    beginAssessment();
    setStatus(resumeStatus, `Your saved progress expired after ${Math.max(1, Number(config.progressTtlHours || 24))} hours, so we’ve started a fresh assessment.`);
  } else if (routeParameters.get("start") === "1") {
    beginAssessment();
  } else {
    show(landing);
    focusViewHeading(landingTitle);
  }
})();
