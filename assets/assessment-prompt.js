(function () {
  "use strict";

  if (window.__anderseedAssessmentPromptInstalled) return;
  window.__anderseedAssessmentPromptInstalled = true;

  const prompt = document.querySelector("[data-assessment-prompt]");
  if (!prompt) return;

  const closeButton = prompt.querySelector("[data-assessment-prompt-close]");
  const cta = prompt.querySelector("[data-assessment-prompt-cta]");
  const dismissedKey = "anderseed.assessmentPrompt.dismissedUntil.v1";
  const startedKey = "anderseed.assessmentPrompt.started.v1";
  const shownKey = "anderseed.assessmentPrompt.shown.v1";
  const hostname = String(window.location.hostname || "").toLowerCase();
  const localHostname = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0" || hostname === "::1";
  const previewMode = localHostname && /(?:^|[?&])assessmentPromptPreview=1(?:&|$)/.test(String(window.location.search || ""));
  const standardDelayMs = 18000;
  const delayMs = previewMode ? 1200 : standardDelayMs;
  const scrollThreshold = 0.3;
  const dismissForMs = 14 * 24 * 60 * 60 * 1000;
  let delayTimer = 0;
  let eligibilityStarted = false;
  let pendingTrigger = "";
  let visible = false;

  function readStorage(storage, key) {
    try { return storage.getItem(key) || ""; } catch (_error) { return ""; }
  }

  function writeStorage(storage, key, value) {
    try { storage.setItem(key, value); } catch (_error) {}
  }

  function previouslyDismissed() {
    const dismissedUntil = Number(readStorage(window.localStorage, dismissedKey));
    return Number.isFinite(dismissedUntil) && dismissedUntil > Date.now();
  }

  function shouldSuppress() {
    return !previewMode && (readStorage(window.localStorage, startedKey) === "1"
      || readStorage(window.sessionStorage, shownKey) === "1"
      || previouslyDismissed());
  }

  function capture(name, properties) {
    if (previewMode) return;
    try {
      if (window.posthog && typeof window.posthog.capture === "function") {
        window.posthog.capture(name, Object.assign({
          environment: hostname.includes("deploy-preview") || hostname.includes("--") || hostname.includes("preview") || hostname.includes("staging") ? "test" : localHostname || !hostname || hostname.endsWith(".local") || hostname.endsWith(".test") ? "development" : "production",
          prompt_version: "v1",
          page_path: window.location.pathname,
        }, properties || {}));
      }
    } catch (_error) {}
  }

  function hidePrompt() {
    if (!visible) return;
    visible = false;
    prompt.classList.remove("is-visible");
    document.documentElement.classList.remove("assessment-prompt-visible");
    window.setTimeout(function () {
      if (!visible) prompt.hidden = true;
    }, 230);
  }

  function showPrompt(trigger) {
    if (visible || shouldSuppress()) return;
    if (document.visibilityState === "hidden") {
      pendingTrigger = trigger;
      return;
    }
    visible = true;
    pendingTrigger = "";
    if (!previewMode) writeStorage(window.sessionStorage, shownKey, "1");
    prompt.hidden = false;
    document.documentElement.classList.add("assessment-prompt-visible");
    window.requestAnimationFrame(function () { prompt.classList.add("is-visible"); });
    capture("assessment_prompt_shown", { trigger: trigger });
  }

  function scrollProgress() {
    const root = document.documentElement;
    const available = Math.max(1, root.scrollHeight - window.innerHeight);
    return Math.max(0, window.scrollY || window.pageYOffset || 0) / available;
  }

  function onScroll() {
    if (scrollProgress() < scrollThreshold) return;
    window.removeEventListener("scroll", onScroll);
    showPrompt("scroll");
  }

  function beginEligibility() {
    if (eligibilityStarted || shouldSuppress()) return;
    eligibilityStarted = true;
    window.addEventListener("scroll", onScroll, { passive: true });
    delayTimer = window.setTimeout(function () { showPrompt("delay"); }, delayMs);
    onScroll();
  }

  function dismissPrompt() {
    if (!previewMode) writeStorage(window.localStorage, dismissedKey, String(Date.now() + dismissForMs));
    capture("assessment_prompt_dismissed");
    hidePrompt();
  }

  closeButton?.addEventListener("click", dismissPrompt);
  cta?.addEventListener("click", function () {
    capture("assessment_prompt_clicked");
    hidePrompt();
  });

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "hidden" && pendingTrigger) showPrompt(pendingTrigger);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", beginEligibility, { once: true });
  } else {
    beginEligibility();
  }
}());
