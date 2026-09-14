(function () {
  "use strict";

  if (window.AnderseedLeadActivity) return;
  const storageKey = "anderseed.leadEngagement.v1";
  const activityEndpoint = "/api/v1/lead/activity";
  const inviteEndpoint = "/api/v1/telegram/invite";
  const pending = new Set();

  function readIdentity() {
    try {
      const value = JSON.parse(window.localStorage.getItem(storageKey) || "null");
      if (!value || typeof value.assessmentId !== "string" || typeof value.engagementToken !== "string") return null;
      return value;
    } catch {
      return null;
    }
  }

  function setIdentity(identity) {
    if (!identity || typeof identity.assessmentId !== "string" || typeof identity.engagementToken !== "string") return false;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({
        assessmentId: identity.assessmentId,
        engagementToken: identity.engagementToken,
      }));
      return true;
    } catch {
      return false;
    }
  }

  function analyticsAccepted() {
    return document.documentElement.getAttribute("data-analytics-consent") === "accepted";
  }

  function emitAnalytics(eventName) {
    try {
      const eventId = window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
      window.dispatchEvent(new CustomEvent("anderseed:analytics", { detail: {
        eventName,
        eventId,
        clientTimestamp: new Date().toISOString(),
      } }));
    } catch {}
  }

  async function post(url, payload) {
    const response = await window.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      credentials: "same-origin",
      keepalive: true,
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("activity_request_failed");
    return response.json().catch(() => ({}));
  }

  async function record(eventName, options) {
    const identity = readIdentity();
    if (!identity || pending.has(eventName)) return false;
    pending.add(eventName);
    try {
      const result = await post(activityEndpoint, { ...identity, eventName });
      if (options?.emitAnalytics) emitAnalytics(eventName);
      return Boolean(result.recorded || result.duplicate);
    } catch {
      return false;
    } finally {
      pending.delete(eventName);
    }
  }

  function observePricing() {
    const pricing = document.getElementById("pricing");
    if (!pricing || typeof window.IntersectionObserver !== "function") return;
    let timer = null;
    let visible = false;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = null;
      if (!visible || !analyticsAccepted()) return;
      timer = window.setTimeout(async () => {
        timer = null;
        if (await record("pricing_section_viewed", { emitAnalytics: true })) observer.disconnect();
      }, 2000);
    };
    const observer = new window.IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5);
      schedule();
    }, { threshold: [0.5] });
    document.addEventListener("anderseed:analytics-consent-changed", schedule);
    observer.observe(pricing);
  }

  function telegramLink(target) {
    const link = target?.closest?.("a[href]");
    if (!link) return null;
    try {
      const url = new URL(link.href, window.location.href);
      return url.hostname === "t.me" || url.hostname === "telegram.me" ? link : null;
    } catch {
      return null;
    }
  }

  async function handleTelegramClick(event) {
    const link = telegramLink(event.target);
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const identity = readIdentity();
    if (!identity || !analyticsAccepted()) return;
    event.preventDefault();
    const fallback = link.href;
    emitAnalytics("telegram_link_clicked");
    try {
      const result = await post(inviteEndpoint, identity);
      window.location.assign(result.url || fallback);
    } catch {
      void record("telegram_link_clicked");
      window.location.assign(fallback);
    }
  }

  window.AnderseedLeadActivity = Object.freeze({ setIdentity, record, readIdentity });
  document.addEventListener("click", handleTelegramClick);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", observePricing, { once: true });
  else observePricing();
}());
