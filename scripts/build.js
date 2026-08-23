const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

const favicon =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='30' fill='%231F6B52'/%3E%3Cpath d='M32 46 L32 24 M32 33 C24 26 20 18 26 13 C30 19 31 26 32 33 Z M32 29 C40 21 46 15 43 8 C37 14 34 21 32 29 Z' stroke='white' stroke-width='2.5' fill='white'/%3E%3C/svg%3E";

const posthogSnippet = `<style id="anderseed-analytics-consent-styles">
  .analytics-consent[hidden],.analytics-settings[hidden]{display:none!important}
  html.analytics-consent-required,html.analytics-consent-required body{overflow:hidden!important}
  .analytics-consent{position:fixed;z-index:2147483000;inset:0;display:grid;place-items:center;width:100%;height:100%;padding:24px;background:rgba(15,46,34,.9);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);color:#17231e;font-family:Arial,sans-serif;overscroll-behavior:contain;touch-action:none}
  .analytics-consent-card{width:min(100%,560px);max-height:min(720px,calc(100vh - 48px));overflow:auto;padding:36px;border:1px solid rgba(126,212,160,.55);border-top:4px solid #7ed4a0;border-radius:8px;background:#fff;box-shadow:0 28px 80px rgba(0,0,0,.32);touch-action:auto}
  .analytics-consent-brand{display:flex;align-items:center;gap:9px;margin-bottom:22px;color:#1f6b52;font-size:11px;font-weight:800;line-height:1.2;letter-spacing:0;text-transform:uppercase}
  .analytics-consent-brand-mark{display:inline-block;width:12px;height:18px;border-radius:100% 0 100% 0;background:#1f6b52;transform:rotate(-18deg)}
  .analytics-consent-copy strong{display:block;margin-bottom:12px;color:#0f2e22;font-size:28px;line-height:1.15;letter-spacing:0}
  .analytics-consent-copy p{margin:0;color:#52605a;font-size:15px;line-height:1.65}
  .analytics-consent-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:26px}
  .analytics-consent-action{min-height:50px;padding:12px 16px;border:1.5px solid #1f6b52;border-radius:6px;background:#fff;color:#174f3d;font:700 14px/1.2 Arial,sans-serif;cursor:pointer;white-space:normal}
  .analytics-consent-action:hover,.analytics-consent-action:focus-visible{background:#edf7f0;outline:3px solid rgba(126,212,160,.48);outline-offset:3px}
  .analytics-consent-action[data-consent-choice="accepted"]{background:#1f6b52;color:#fff;box-shadow:0 8px 20px rgba(31,107,82,.22)}
  .analytics-consent-action[data-consent-choice="accepted"]:hover,.analytics-consent-action[data-consent-choice="accepted"]:focus-visible{background:#174f3d}
  .analytics-consent-privacy{display:inline-block;margin-top:20px;color:#1f6b52;font-size:13px;font-weight:700;text-underline-offset:3px}
  .analytics-consent-privacy:hover,.analytics-consent-privacy:focus-visible{color:#0f2e22;outline:3px solid rgba(31,107,82,.18);outline-offset:3px}
  .analytics-settings{display:inline;padding:0;border:0;border-bottom:1px solid currentColor;border-radius:0;background:transparent;color:inherit;box-shadow:none;font:inherit;font-weight:700;line-height:inherit;cursor:pointer}
  .footer-links .analytics-settings{color:#ddd5c8;font-size:14px}
  footer>.analytics-settings{margin-left:8px}
  .analytics-settings:hover,.analytics-settings:focus-visible{color:#7ed4a0;outline:3px solid rgba(126,212,160,.28);outline-offset:3px}
  @media(max-width:680px){.analytics-consent{padding:16px}.analytics-consent-card{max-height:calc(100vh - 32px);padding:26px 20px}.analytics-consent-copy strong{font-size:24px}.analytics-consent-copy p{font-size:14px}.analytics-consent-actions{grid-template-columns:1fr}.analytics-consent-action{width:100%}}
  @media(prefers-reduced-motion:reduce){.analytics-consent,.analytics-consent *{scroll-behavior:auto!important}}
</style>
<script>
    /* Anderseed optional analytics consent */
    !function(){
        if(window.__anderseedAnalyticsConsentInstalled)return;
        window.__anderseedAnalyticsConsentInstalled=!0;
        var consentKey="anderseed.optionalAnalyticsConsent.v1";
        var accepted="accepted";
        var rejected="rejected";
        var banner=null;
        var settingsButton=null;
        var returnFocusTo=null;

        function readChoice(){
            try{return window.localStorage.getItem(consentKey)||""}catch(_error){return""}
        }

        function isDecided(choice){
            return choice===accepted||choice===rejected;
        }

        function setPageLocked(locked){
            document.documentElement.classList.toggle("analytics-consent-required",locked);
        }

        function focusPrimaryAction(){
            if(!banner||banner.hidden)return;
            var primaryAction=banner.querySelector('[data-consent-choice="accepted"]');
            if(primaryAction)primaryAction.focus();
        }

        function containDialogFocus(event){
            if(!banner||banner.hidden)return;
            if(event.key==="Escape"){
                event.preventDefault();
                return;
            }
            if(event.key!=="Tab")return;
            var focusable=Array.prototype.slice.call(banner.querySelectorAll('button:not([disabled]),a[href]'));
            if(!focusable.length){event.preventDefault();return}
            var first=focusable[0];
            var last=focusable[focusable.length-1];
            if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
            else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
            else if(!banner.contains(document.activeElement)){event.preventDefault();first.focus()}
        }

        function loadPostHog(){
            if(window.__anderseedPostHogLoadStarted)return;
            window.__anderseedPostHogLoadStarted=!0;
            !function(t,e){var o,n,p,r;e.__SV||(window.posthog && window.posthog.__loaded)||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}p||((p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",p.onerror=function(){p=null},(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r));var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="fo po init Fo Oo qo Zs Lo Bo Ro capture Do vo Go calculateEventProperties Vo register register_once register_for_session unregister unregister_for_session Ko Ao Zo getFeatureFlag getFeatureFlagPayload getFeatureFlagResult getAllFeatureFlags isFeatureEnabled reloadFeatureFlags updateFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSurveysLoaded onSessionId getSurveys getActiveMatchingSurveys renderSurvey displaySurvey cancelPendingSurvey canRenderSurvey canRenderSurveyAsync Yo identify setPersonProperties unsetPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset Xo shutdown setIdentity clearIdentity get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException addExceptionStep captureLog startExceptionAutocapture stopExceptionAutocapture loadToolbar get_property getSessionProperty Qo Uo createPersonProfile setInternalOrTestUser Jo Eo il opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing get_explicit_consent_status is_capturing clear_opt_in_out_capturing Ho debug Js mn getPageViewId captureTraceFeedback captureTraceMetric Co".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
            window.posthog.init('phc_xPv9uMsaKk5fSBsVeJjUByT6hzhskg5Lrj9AcyK2rsmf', {
                api_host: 'https://eu.i.posthog.com',
                defaults: '2026-05-30',
                person_profiles: 'identified_only'
            });
        }

        function activatePostHog(){
            loadPostHog();
            try{if(window.posthog&&typeof window.posthog.opt_in_capturing==="function")window.posthog.opt_in_capturing()}catch(_error){}
        }

        function syncControls(){
            var choice=readChoice();
            var decided=isDecided(choice);
            document.documentElement.setAttribute("data-analytics-consent",decided?choice:"pending");
            if(banner)banner.hidden=decided;
            if(settingsButton)settingsButton.hidden=!decided;
            setPageLocked(!decided);
            if(!decided)window.setTimeout(focusPrimaryAction,0);
        }

        function saveChoice(choice){
            if(!isDecided(choice))return;
            try{window.localStorage.setItem(consentKey,choice)}catch(_error){}
            if(choice===accepted){
                activatePostHog();
            }else{
                try{if(window.posthog&&typeof window.posthog.opt_out_capturing==="function")window.posthog.opt_out_capturing()}catch(_error){}
            }
            try{document.dispatchEvent(new CustomEvent("anderseed:analytics-consent-changed",{detail:{choice:choice}}))}catch(_error){}
            var focusTarget=returnFocusTo;
            syncControls();
            returnFocusTo=null;
            restorePageFocus(focusTarget);
        }

        function openPreferences(){
            if(!banner||!settingsButton)return;
            returnFocusTo=document.activeElement;
            banner.hidden=!1;
            settingsButton.hidden=!0;
            setPageLocked(!0);
            focusPrimaryAction();
        }

        function placeSettingsControl(){
            if(!settingsButton)return;
            var footerDestination=document.querySelector("footer .footer-links")||document.querySelector("footer");
            if(footerDestination)footerDestination.appendChild(settingsButton);
        }

        function restorePageFocus(focusTarget){
            if(focusTarget&&!focusTarget.hidden){
                focusTarget.focus();
                return;
            }
            var main=document.querySelector("main");
            if(!main)return;
            if(!main.hasAttribute("tabindex"))main.setAttribute("tabindex","-1");
            try{main.focus({preventScroll:!0})}catch(_error){main.focus()}
        }

        function bindControls(){
            banner=document.querySelector("aside[data-analytics-consent]");
            settingsButton=document.querySelector("[data-analytics-settings]");
            placeSettingsControl();
            if(banner){
                banner.querySelectorAll("[data-consent-choice]").forEach(function(button){
                    button.addEventListener("click",function(){saveChoice(button.getAttribute("data-consent-choice"))});
                });
                banner.addEventListener("keydown",containDialogFocus);
            }
            if(settingsButton)settingsButton.addEventListener("click",openPreferences);
            syncControls();
        }

        var initialChoice=readChoice();
        document.documentElement.setAttribute("data-analytics-consent",isDecided(initialChoice)?initialChoice:"pending");
        setPageLocked(!isDecided(initialChoice));
        window.__anderseedLoadOptionalAnalytics=activatePostHog;
        if(readChoice()===accepted)activatePostHog();
        if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bindControls,{once:!0});else bindControls();
    }();
    /* End Anderseed optional analytics consent */
    /* Anderseed PostHog assessment bridge */
    !function(){
        if(window.__anderseedPostHogAssessmentBridgeInstalled)return;
        window.__anderseedPostHogAssessmentBridgeInstalled=!0;
        var sentEventIds=new Set();
        var hostname=String(window.location&&window.location.hostname||"").toLowerCase();
        var environment=!hostname||hostname==="localhost"||hostname==="127.0.0.1"||hostname==="0.0.0.0"||hostname==="::1"||hostname.endsWith(".local")||hostname.endsWith(".test")?"development":hostname.includes("deploy-preview")||hostname.includes("--")||hostname.includes("preview")||hostname.includes("staging")?"test":"production";
        window.addEventListener("anderseed:analytics",function(event){
            try{
                var detail=event&&event.detail;
                if(!detail||typeof detail.eventName!=="string"||!detail.eventName||!window.posthog||typeof window.posthog.capture!=="function")return;
                var eventId=typeof detail.eventId==="string"?detail.eventId:"";
                if(eventId&&sentEventIds.has(eventId))return;
                var properties={environment:environment};
                var allowedProperties={
                    event_id:eventId,
                    assessment_version:detail.schemaVersion,
                    scoring_version:detail.scoringVersion,
                    analytics_session_id:detail.analyticsSessionId,
                    question_id:detail.questionId,
                    question_number:detail.questionNumber,
                    client_timestamp:detail.clientTimestamp
                };
                Object.keys(allowedProperties).forEach(function(key){
                    var value=allowedProperties[key];
                    if(value!==null&&value!==undefined&&value!=="")properties[key]=value;
                });
                window.posthog.capture(detail.eventName,properties);
                if(eventId)sentEventIds.add(eventId);
            }catch(_error){}
        });
    }();
    /* End Anderseed PostHog assessment bridge */
</script>`;

function analyticsConsentMarkup(privacyHref) {
  return `<aside class="analytics-consent" data-analytics-consent role="dialog" aria-modal="true" aria-labelledby="analyticsConsentTitle" aria-describedby="analyticsConsentDescription" hidden>
  <div class="analytics-consent-card">
    <div class="analytics-consent-brand" aria-hidden="true"><span class="analytics-consent-brand-mark"></span>Anderseed Consulting</div>
    <div class="analytics-consent-copy">
      <strong id="analyticsConsentTitle">Your privacy choices</strong>
      <p id="analyticsConsentDescription">We use optional analytics to understand how visitors use Anderseed and improve the experience. We will not load non-essential analytics unless you choose to accept them.</p>
    </div>
    <div class="analytics-consent-actions" aria-label="Analytics choices">
      <button class="analytics-consent-action" type="button" data-consent-choice="accepted">Accept analytics</button>
      <button class="analytics-consent-action" type="button" data-consent-choice="rejected">Reject non-essential</button>
    </div>
    <a class="analytics-consent-privacy" href="${privacyHref}">Read our privacy notice</a>
  </div>
</aside>
<button class="analytics-settings" type="button" data-analytics-settings hidden>Privacy choices</button>`;
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function injectPostHog(content, relativePath) {
  if (content.includes("phc_xPv9uMsaKk5fSBsVeJjUByT6hzhskg5Lrj9AcyK2rsmf")) return content;
  if (!content.includes("</head>")) throw new Error("Could not install PostHog because the generated page has no </head> tag.");
  if (!content.includes("</body>")) throw new Error("Could not install analytics consent because the generated page has no </body> tag.");
  const depth = path.dirname(relativePath).split(path.sep).filter((part) => part && part !== ".").length;
  const privacyHref = `${"../".repeat(depth)}privacy/index.html`;
  return content
    .replace("</head>", `${posthogSnippet}\n</head>`)
    .replace("</body>", `${analyticsConsentMarkup(privacyHref)}\n</body>`);
}

function writeFile(relativePath, content) {
  const target = path.join(dist, relativePath);
  ensureDir(target);
  const output = relativePath.endsWith(".html") ? injectPostHog(content, relativePath) : content;
  fs.writeFileSync(target, output, "utf8");
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value = "") {
  return escapeHtml(value);
}

function cleanDist() {
  fs.rmSync(dist, { recursive: true, force: true });
  fs.mkdirSync(dist, { recursive: true });
}

function copyDir(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (
      source === root &&
      ["content", "dist", "docs", "roadmap", "scripts", "tests", "node_modules", ".git", "README.md", "package.json", "package-lock.json", "netlify.toml"].includes(entry.name)
    ) {
      continue;
    }
    const src = path.join(source, entry.name);
    const dest = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDir(src, dest);
    } else {
      fs.copyFileSync(src, dest);
    }
  }
}

function replaceFirst(html, pattern, replacement, label) {
  if (!pattern.test(html)) {
    throw new Error(`Could not update ${label}. The source HTML changed shape.`);
  }
  return html.replace(pattern, replacement);
}

function faqJsonLd(items) {
  return `<script type="application/ld+json">
${JSON.stringify(
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  },
  null,
  2
)}
</script>`;
}

function flattenFaqs(faqs) {
  return faqs.categories.flatMap((category) => category.items);
}

function logoImage(base = "") {
  return `<picture><source type="image/webp" srcset="${base}assets/anderseed-logo-header-232.webp 232w, ${base}assets/anderseed-logo-header-322.webp 322w, ${base}assets/anderseed-logo-header-464.webp 464w, ${base}assets/anderseed-logo-header-642.webp 642w" sizes="(max-width: 680px) 184px, 232px" /><img src="${base}assets/anderseed-logo-header.png" alt="Anderseed Consulting" width="642" height="220" decoding="async" /></picture>`;
}

function logo(base = "") {
  return `<a class="logo" href="${base}index.html" aria-label="Anderseed Consulting home">${logoImage(base)}</a>`;
}

function navigationItems(base = "") {
  return [
    ["Home", `${base}index.html`, "home"],
    ["About", `${base}about/index.html`, "about"],
    ["Pricing", `${base}index.html#pricing`, "pricing"],
    ["BA Assessment", `${base}assessment/index.html?intro=1`, "assessment"],
    ["Portfolio", `${base}index.html#portfolio`, "portfolio"],
    ["Blog", `${base}blog/index.html`, "blog"],
    ["FAQ", `${base}faq/index.html`, "faq"],
    ["Contact Us", `${base}index.html#contact`, "contact"],
  ];
}

function navigationLink(label, href, key, active) {
  const current = active === key;
  const classes = [];
  if (key === "assessment") classes.push("nav-assessment");
  if (current) classes.push("active");
  return `<a${classes.length ? ` class="${classes.join(" ")}"` : ""}${current ? ' aria-current="page"' : ""} href="${href}">${label}</a>`;
}

function nav(base = "", active = "") {
  const items = navigationItems(base);
  return `<nav class="nav-links" aria-label="Primary navigation">
      ${items.map(([label, href, key]) => navigationLink(label, href, key, active)).join("\n      ")}
    </nav>`;
}

function mobileNav(base = "", active = "") {
  const items = navigationItems(base);
  return `<button class="menu-toggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-navigation"><span></span></button>
  <nav class="mobile-panel" id="mobile-navigation" aria-label="Mobile navigation" hidden>
    ${items.map(([label, href, key]) => navigationLink(label, href, key, active)).join("\n    ")}
  </nav>`;
}

function mobileNavScript() {
  return `<script>
(() => {
  const button = document.querySelector(".menu-toggle");
  const panel = document.querySelector(".mobile-panel");
  if (!button || !panel) return;
  const setOpen = (open) => {
    document.body.classList.toggle("menu-open", open);
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    panel.hidden = !open;
    if (open) window.requestAnimationFrame(() => panel.querySelector("a")?.focus());
  };
  button.addEventListener("click", () => setOpen(button.getAttribute("aria-expanded") !== "true"));
  panel.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setOpen(false)));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && button.getAttribute("aria-expanded") === "true") {
      setOpen(false);
      button.focus();
      return;
    }
    if (event.key === "Tab" && button.getAttribute("aria-expanded") === "true") {
      const focusable = [button, ...panel.querySelectorAll("a")];
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
  });
  document.addEventListener("click", (event) => {
    if (button.getAttribute("aria-expanded") === "true" && !event.target.closest(".nav-inner")) setOpen(false);
  });
  const desktopNavigation = window.matchMedia("(min-width: 921px)");
  const resetForDesktop = (event) => {
    if (event.matches && button.getAttribute("aria-expanded") === "true") setOpen(false);
  };
  if (typeof desktopNavigation.addEventListener === "function") {
    desktopNavigation.addEventListener("change", resetForDesktop);
  } else if (typeof desktopNavigation.addListener === "function") {
    desktopNavigation.addListener(resetForDesktop);
  }
})();
</script>`;
}

function footer(base = "", settings) {
  return `<footer class="footer">
  <div class="footer-inner">
    <div><strong>${escapeHtml(settings.siteName)}</strong><p>${escapeHtml(settings.footerTagline)}</p></div>
    <div class="footer-links"><a href="${base}about/index.html">About</a><a href="${base}blog/index.html">Blog</a><a href="${base}assessment/index.html?intro=1">BA Assessment</a><a href="${base}faq/index.html">FAQ</a><a href="${base}privacy/index.html">Privacy</a><a href="${base}terms/index.html">Terms</a></div>
  </div>
</footer>`;
}

function telegramFloat(settings) {
  return `<a class="tg-float" href="${escapeAttr(settings.social.telegram)}" target="_blank" rel="noopener" aria-label="Join the free Anderseed Telegram community">
  <span class="tg-label">Join free BA community</span>
  <span class="tg-button" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M27.6 5.1 3.9 14.2c-1.6.6-1.6 1.5-.3 1.9l6.1 1.9 2.3 7.1c.3.9.2 1.3 1 1.3.7 0 1-.3 1.4-.7l3.4-3.3 7 5.2c1.3.7 2.2.3 2.5-1.2L31.8 7c.5-1.8-.7-2.6-2.1-2Zm-3.8 5.5L12.4 20.8l-.4 4.1-2.3-7.1 14.6-9.2c.6-.4 1.1-.2.5.4Z"/></svg></span>
</a>`;
}

function analyticsSnippet(settings) {
  const measurementId = String(settings.analytics?.googleMeasurementId || "").trim();
  if (!/^G-[A-Z0-9]+$/i.test(measurementId)) return "";
  return `<script>
!function(){
  var measurementId='${escapeAttr(measurementId)}';
  var consentKey='anderseed.optionalAnalyticsConsent.v1';
  var loaded=!1;
  function loadGoogleAnalytics(){
    if(loaded)return;
    loaded=!0;
    var script=document.createElement('script');
    script.async=!0;
    script.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(measurementId);
    document.head.appendChild(script);
    window.dataLayer=window.dataLayer||[];
    window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
    window.gtag('js',new Date());
    window.gtag('config',measurementId,{anonymize_ip:!0});
  }
  function hasConsent(){try{return window.localStorage.getItem(consentKey)==='accepted'}catch(_error){return!1}}
  if(hasConsent())loadGoogleAnalytics();
  document.addEventListener('anderseed:analytics-consent-changed',function(event){
    if(event&&event.detail&&event.detail.choice==='accepted')loadGoogleAnalytics();
  });
}();
</script>`;
}

function pageShell({ title, description, canonical, base, active, body, schema = "", focused = false }, settings) {
  const accessibleBody = body.replace(/<main(?![^>]*\bid=)/, '<main id="main"');
  const pageHeader = focused
    ? `<header class="nav conversion-nav">
  <div class="nav-inner">
    <a class="logo conversion-logo" href="${base}index.html" aria-label="Anderseed Consulting home">${logoImage(base)}</a>
    <div class="conversion-context" aria-label="Assessment details"><span>BA Readiness Profile</span><small>8 questions · 2–3 minutes</small></div>
  </div>
</header>`
    : `<header class="nav">
  <div class="nav-inner">
    ${logo(base)}
    ${nav(base, active)}
    ${mobileNav(base, active)}
  </div>
</header>`;
  const pageFooter = focused
    ? `<footer class="footer conversion-footer"><div class="footer-inner"><strong>${escapeHtml(settings.siteName)}</strong><div class="footer-links"><a href="${base}privacy/index.html" target="_blank" rel="noopener">Privacy</a><a href="${base}terms/index.html" target="_blank" rel="noopener">Terms</a></div></div></footer>`
    : footer(base, settings);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
<link rel="canonical" href="${escapeAttr(settings.siteUrl.replace(/\/$/, "") + canonical)}" />
<meta name="description" content="${escapeAttr(description)}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${escapeAttr(title)}" />
<meta property="og:description" content="${escapeAttr(description)}" />
<meta property="og:url" content="${escapeAttr(settings.siteUrl.replace(/\/$/, "") + canonical)}" />
<meta property="og:site_name" content="${escapeAttr(settings.siteName)}" />
<link rel="stylesheet" href="${base}assets/landing-pages.css" />
<link rel="icon" type="image/svg+xml" href="${favicon}" />
${schema}
</head>
<body${focused ? ' class="conversion-flow"' : ""}>
<a class="skip-link" href="#main">Skip to content</a>
${pageHeader}
${accessibleBody}
${pageFooter}
${focused ? "" : telegramFloat(settings)}
${focused ? "" : mobileNavScript()}
${analyticsSnippet(settings)}
</body>
</html>`;
}

function list(items) {
  return `<ul class="feature-list">
          ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n          ")}
        </ul>`;
}

function cards(items) {
  return `<div class="card-grid">
        ${items.map((item) => `<article class="info-card"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p></article>`).join("\n        ")}
      </div>`;
}

const iconMap = {
  cv: '<svg viewBox="0 0 24 24"><path d="M8 3h6l4 4v14H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v5h5"/><path d="m9.5 15 1.7 1.7 3.8-4.2"/></svg>',
  guide: '<svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z"/><path d="M8 7h7"/><path d="M8 11h8"/><path d="M8 15h5"/></svg>',
  counselling: '<svg viewBox="0 0 24 24"><path d="M21 11.5a7.5 6.2 0 0 1-7.5 6.2 8.7 8.7 0 0 1-2.3-.3L5 20l1.2-4.1A5.5 5.5 0 0 1 6 11.5a7.5 6.2 0 0 1 15 0Z"/><path d="M10 10h6"/><path d="M10 13h4"/></svg>',
  interview: '<svg viewBox="0 0 24 24"><rect x="7" y="3" width="10" height="12" rx="5"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/><path d="M9 21h6"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24"><path d="M5.2 8.9h3.2V19H5.2V8.9Zm1.6-5A1.85 1.85 0 1 1 6.8 7.6a1.85 1.85 0 0 1 0-3.7ZM10.4 8.9h3.1v1.4h.1a3.4 3.4 0 0 1 3.1-1.7c3.3 0 3.9 2.2 3.9 5V19h-3.2v-4.8c0-1.1 0-2.6-1.6-2.6s-1.9 1.2-1.9 2.5V19h-3.2V8.9Z"/></svg>',
  community: '<svg viewBox="0 0 24 24"><circle cx="8" cy="8" r="3"/><circle cx="17" cy="7" r="2.5"/><path d="M3.5 19v-1.2A4.5 4.5 0 0 1 8 13.3a4.5 4.5 0 0 1 4.5 4.5V19"/><path d="M15 12.8a4 4 0 0 1 5.5 3.7V19"/></svg>',
};

const artefactIconMap = {
  stakeholder: '<svg viewBox="0 0 24 24"><circle cx="7" cy="7" r="3"/><circle cx="17" cy="7" r="3"/><circle cx="12" cy="17" r="3"/><path d="M9.4 8.8 10.8 14"/><path d="M14.6 8.8 13.2 14"/><path d="M9.6 17h4.8"/></svg>',
  process: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="6" height="5" rx="1.2"/><rect x="15" y="4" width="6" height="5" rx="1.2"/><rect x="9" y="15" width="6" height="5" rx="1.2"/><path d="M9 6.5h6"/><path d="M18 9v2.5a3.5 3.5 0 0 1-3.5 3.5H14"/><path d="M6 9v2.5A3.5 3.5 0 0 0 9.5 15H10"/></svg>',
  stories: '<svg viewBox="0 0 24 24"><path d="M5 4h14v16H5z"/><path d="M8 8h8"/><path d="M8 12h8"/><path d="M8 16h5"/></svg>',
  prototype: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/><path d="M8 9h8"/><path d="M8 12h5"/></svg>',
  requirements: '<svg viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v5h5"/><path d="M8.5 12h7"/><path d="M8.5 16h5"/><path d="m9 20 1.3 1.3 3.2-3.6"/></svg>',
};

const journeyIconMap = {
  stakeholder: '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>',
  process: '<svg viewBox="0 0 24 24"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 6H14a4 4 0 0 1 4 4v5.5"/><path d="M6 8.5V13a3 3 0 0 0 3 3h6.5"/></svg>',
  stories: '<svg viewBox="0 0 24 24"><path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4"/><path d="M9 11h6"/><path d="M9 15h6"/><path d="M9 19h3"/></svg>',
  requirements: '<svg viewBox="0 0 24 24"><path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4"/><path d="M9 11h6"/><path d="M9 15h6"/><path d="M9 19h3"/></svg>',
  prototype: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="13" rx="2"/><path d="M8 20h8"/><path d="M12 17v3"/><path d="M8 13v-2"/><path d="M12 13V8"/><path d="M16 13v-4"/></svg>',
};

const socialIconMap = {
  telegram: '<svg viewBox="0 0 32 32"><path d="M27.6 5.1 3.9 14.2c-1.6.6-1.6 1.5-.3 1.9l6.1 1.9 2.3 7.1c.3.9.2 1.3 1 1.3.7 0 1-.3 1.4-.7l3.4-3.3 7 5.2c1.3.7 2.2.3 2.5-1.2L31.8 7c.5-1.8-.7-2.6-2.1-2Zm-3.8 5.5L12.4 20.8l-.4 4.1-2.3-7.1 14.6-9.2c.6-.4 1.1-.2.5.4Z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24"><path d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm0 2A3.8 3.8 0 0 0 4 7.8v8.4A3.8 3.8 0 0 0 7.8 20h8.4a3.8 3.8 0 0 0 3.8-3.8V7.8A3.8 3.8 0 0 0 16.2 4H7.8Zm4.2 3.3a4.7 4.7 0 1 1 0 9.4 4.7 4.7 0 0 1 0-9.4Zm0 2a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 0 0 0-5.4Zm5-2.2a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Z"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24"><path d="M17.6 6.2c-1.2-.8-2-2-2.2-3.4h-3.1v12.3a2.9 2.9 0 1 1-2.1-2.8V9.1a6.1 6.1 0 1 0 5.3 6V8.8c1.2.8 2.5 1.2 4 1.2V6.9c-.7 0-1.3-.2-1.9-.7Z"/></svg>',
  youtube: '<svg viewBox="0 0 24 24"><path d="M21.6 7.2s-.2-1.5-.8-2.1c-.8-.8-1.7-.8-2.1-.9C15.8 4 12 4 12 4s-3.8 0-6.7.2c-.4.1-1.3.1-2.1.9-.6.6-.8 2.1-.8 2.1S2.2 9 2.2 10.8v1.7c0 1.8.2 3.6.2 3.6s.2 1.5.8 2.1c.8.8 1.9.8 2.4.9 1.7.2 6.4.2 6.4.2s3.8 0 6.7-.2c.4-.1 1.3-.1 2.1-.9.6-.6.8-2.1.8-2.1s.2-1.8.2-3.6v-1.7c0-1.8-.2-3.6-.2-3.6ZM10.1 14.9V8.7l5.8 3.1-5.8 3.1Z"/></svg>',
};

function applyGlobalReplacements(html, settings, formKind = "roadmap") {
  const formEndpoint = formKind === "application" ? settings.forms.applicationEndpoint : settings.forms.roadmapEndpoint;
  return html
    .replaceAll("https://t.me/anderseedconsulting", settings.social.telegram)
    .replaceAll("https://instagram.com/YOUR-HANDLE", settings.social.instagram)
    .replaceAll("https://www.tiktok.com/@ba.transition?_r=1&_t=ZN-97tTUfgYvmY", settings.social.tiktok)
    .replaceAll("https://youtube.com/@YOUR-HANDLE", settings.social.youtube)
    .replaceAll("https://wa.me/447000000000", settings.contact.whatsappUrl)
    .replaceAll("tel:+447000000000", settings.contact.phoneHref)
    .replaceAll("+44 7000 000000", settings.contact.phone)
    .replaceAll("hello@anderseedconsulting.com", settings.contact.email)
    .replaceAll("https://YOUR-CRM-FORM-ENDPOINT", formEndpoint)
    .replaceAll("https://YOUR-STRIPE-CHECKOUT-LINK", settings.forms.stripeCheckoutUrl)
    .replaceAll("https://YOUR-KLARNA-CHECKOUT-LINK", settings.forms.klarnaCheckoutUrl);
}

function assessmentGrowthIcons() {
  return `<div class="growth-track" aria-hidden="true">
          <svg class="growth-stem" viewBox="0 0 620 86" preserveAspectRatio="none"><path d="M20 61C92 60 120 45 172 49s79 18 132 4 75-33 130-29 87 25 166 7"/><path class="growth-stem-accent" d="M20 61C92 60 120 45 172 49s79 18 132 4 75-33 130-29 87 25 166 7"/></svg>
          <span class="growth-node" data-growth-node="0"><svg viewBox="0 0 48 48"><ellipse cx="24" cy="29" rx="9" ry="7"/><path d="M18 27c3-5 8-7 13-6"/></svg></span>
          <span class="growth-node" data-growth-node="1"><svg viewBox="0 0 48 48"><ellipse cx="24" cy="18" rx="7" ry="5"/><path d="M24 23v15m0-8-7 7m7-3 6 5"/></svg></span>
          <span class="growth-node" data-growth-node="2"><svg viewBox="0 0 48 48"><path d="M24 39V17m0 8c-7-1-10-5-10-10 6 0 10 4 10 10Zm0 4c7-1 10-5 10-10-6 0-10 4-10 10Z"/></svg></span>
          <span class="growth-node" data-growth-node="3"><svg viewBox="0 0 48 48"><path d="M24 41V12m0 9c-8-1-12-5-12-11 7 0 12 4 12 11Zm0 8c8-1 12-5 12-11-7 0-12 4-12 11Zm0 7c-6-1-9-4-9-9 5 0 9 3 9 9Z"/></svg></span>
          <span class="growth-node" data-growth-node="4"><svg viewBox="0 0 48 48"><path d="M24 42V22"/><path d="M24 25c-10 0-16-6-16-14 9 0 15 5 16 14Zm0 5c10 0 16-6 16-14-9 0-15 5-16 14Z"/><path d="M13 42h22"/></svg></span>
        </div>`;
}

function assessmentSproutArt(className = "") {
  return `<svg class="${escapeAttr(className)}" viewBox="0 0 240 240" aria-hidden="true">
    <circle class="sprout-halo" cx="120" cy="120" r="103" />
    <ellipse class="sprout-soil sprout-soil-back" cx="120" cy="180" rx="76" ry="26" />
    <ellipse class="sprout-soil" cx="120" cy="190" rx="82" ry="27" />
    <path class="sprout-stem" d="M120 184V91" />
    <path class="sprout-leaf sprout-leaf-one" d="M119 130C86 128 67 111 64 82c31 1 52 18 55 48Z" />
    <path class="sprout-leaf sprout-leaf-two" d="M121 112c33-4 51-24 51-53-30 5-49 23-51 53Z" />
    <path class="sprout-leaf sprout-leaf-three" d="M120 155c-24-2-39-15-42-36 22 1 38 13 42 36Z" />
    <path class="sprout-leaf sprout-leaf-four" d="M121 148c24-3 38-17 39-39-22 3-37 17-39 39Z" />
  </svg>`;
}

function generateAssessmentFront(assessment) {
  const home = assessment.home || {};
  const headline = escapeHtml(home.title || assessment.headline).replace("Business Analysis", "<span>Business Analysis</span>");
  const label = home.label || assessment.eyebrow;
  const intro = home.intro || assessment.intro;
  const buttonLabel = home.buttonLabel || assessment.primaryButtonLabel;
  const proof = String(home.proof || assessment.timeLabel)
    .split("·")
    .map((item) => item.trim())
    .filter(Boolean);
  const growthIcons = assessmentGrowthIcons();
  return `<div class="home-assessment-front">
    <div class="assessment-landing-grid">
      <div class="assessment-landing-copy">
        <div class="eyebrow"><span class="leaf-dot" aria-hidden="true"></span>${escapeHtml(label)}</div>
        <h2 id="homepageAssessmentTitle">${headline}</h2>
        <p>${escapeHtml(intro)}</p>
        <a class="btn btn-primary" href="assessment/index.html?start=1">${escapeHtml(buttonLabel)} <span aria-hidden="true">→</span></a>
        <div class="assessment-meta" aria-label="Assessment details">${proof.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
      </div>
      <aside class="assessment-profile-plate" aria-label="What your free BA readiness result includes">
        <div class="profile-plate-top"><span>Your BA readiness result</span><span>After 8 questions</span></div>
        <div class="assessment-growth-preview" aria-label="Your assessment grows from a starting point into a complete profile">
          ${growthIcons}
          <p>See where you are now and take a clearer next step.</p>
        </div>
        <div class="profile-plate-index">
          <div><span>01</span><p><strong>Your BA readiness stage + score</strong></p></div>
          <div><span>02</span><p><strong>Immediate personalised result</strong></p></div>
          <div><span>03</span><p><strong>FREE BA Career Roadmap by email</strong></p></div>
        </div>
      </aside>
    </div>
  </div>`;
}

function generateHero(home, settings) {
  const hero = home.hero;
  const subline = escapeHtml(hero.subline).replace("grow.", "<span>grow.</span>");
  return `<div class="eyebrow"><span class="leaf-dot" aria-hidden="true"></span>${escapeHtml(hero.eyebrowText)} <strong>${escapeHtml(hero.eyebrowHighlight)}</strong><a class="eyebrow-link" href="#steps" aria-label="See the 90-day Business Analysis journey">${escapeHtml(hero.journeyButtonLabel || "See journey")} &rarr;</a></div>
          <h1>${escapeHtml(hero.headlinePrefix)} <span class="gold-text">${escapeHtml(hero.headlineHighlight)}</span></h1>
          <p class="hero-subline">${subline}</p>
          <p class="hero-copy">${escapeHtml(hero.body)}</p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="${escapeAttr(hero.primaryButtonUrl)}">${escapeHtml(hero.primaryButtonLabel)}</a>
            <a class="btn btn-secondary" href="${escapeAttr(hero.secondaryButtonUrl)}">${escapeHtml(hero.secondaryButtonLabel)}</a>
          </div>`;
}

function generateProgramme(home) {
  const programme = home.programme;
  const title = escapeHtml(programme.title).replace("BA-ready", "<span>BA-ready</span>");
  const cards = home.serviceCards
    .map((card, index) => {
      const classes = ["cohort-card"];
      if (index === 0) classes.push("highlight");
      if (card.wide) classes.push("wide");
      return `<article class="${classes.join(" ")}">
          <div class="cohort-icon ${escapeAttr(card.type)}" aria-hidden="true">${iconMap[card.type] || iconMap.cv}</div>
          <h3>${escapeHtml(card.title)}</h3>
          <p>${escapeHtml(card.text)}</p>
        </article>`;
    })
    .join("\n        ");
  return `<div class="section-head cohort-program-head">
        <div class="section-label">${escapeHtml(programme.label)}</div>
        <h2>${title}</h2>
        <p class="section-copy">${escapeHtml(programme.intro)}</p>
      </div>
      <div class="cohort-grid">
        <article class="cohort-card featured">
          <div class="cohort-card-head">
            <h3>${escapeHtml(programme.featuredTitle)}</h3>
            <a class="cohort-badge" href="#pricing">${escapeHtml(programme.featuredBadge)}</a>
          </div>
          <p>${escapeHtml(programme.featuredText)}</p>
        </article>
        ${cards}
      </div>`;
}

function projectAccentType(value = "") {
  const text = String(value).toLowerCase();
  if (text.includes("crm")) return "crm";
  if (text.includes("hcm")) return "hcm";
  if (text.includes("erp")) return "erp";
  return "ba";
}

function proofStage(item, index) {
  const stageMap = {
    stakeholder: "Analyse",
    process: "Map",
    stories: "Specify",
    requirements: "Specify",
    prototype: "Present",
  };
  return item.stage || stageMap[item.type] || `Step ${index + 1}`;
}

function proofCodeLine(type = "") {
  const codeMap = {
    stakeholder: "stakeholders.map(power, interest)",
    process: "process.draw(as_is, to_be)",
    stories: "stories.add(acceptanceCriteria)",
    requirements: "requirements.signOff(BRD)",
    prototype: "prototype.walkthrough(panel)",
  };
  return codeMap[type] || "artefacts.build(portfolioPack)";
}

function renderArtefactVisual(step = {}, caseType = "crm") {
  const type = step.type || "stakeholder";
  const visual = step.visual || {};
  const outputTitle = escapeHtml(visual.outputTitle || "Portfolio artefact preview");

  if (type === "process") {
    const lanes = visual.lanes || ["Business user", "Approver"];
    const task1 = visual.task1 || ["Capture", "request"];
    const task2 = visual.task2 || ["Review", "request"];
    const gateway = visual.gateway || ["Approved?", "Yes / No"];
    const task3 = visual.task3 || ["Update", "system"];
    const markerId = `process-v5-arrow-${caseType}`;
    return `<div class="artefact-visual process-output ${escapeAttr(caseType)}-output" aria-hidden="true">
            <div class="output-title">${outputTitle}</div>
            <svg class="artefact-svg process-svg-v5" viewBox="0 0 420 220" preserveAspectRatio="xMidYMid meet" shape-rendering="geometricPrecision">
              <defs><marker id="${escapeAttr(markerId)}" markerUnits="userSpaceOnUse" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#45514c"></path></marker></defs>
              <rect x="1" y="1" width="418" height="218" rx="12" class="svg-v5-board"></rect>
              <path d="M1 110 H419" class="svg-v5-divider"></path><path d="M64 1 V219" class="svg-v5-divider"></path>
              <rect x="1" y="1" width="63" height="109" rx="12" class="svg-v5-lane-bg sales"></rect><rect x="1" y="111" width="63" height="108" rx="12" class="svg-v5-lane-bg manager"></rect>
              <text x="32" y="58" text-anchor="middle" class="svg-v5-lane">${escapeHtml(lanes[0])}</text><text x="32" y="168" text-anchor="middle" class="svg-v5-lane">${escapeHtml(lanes[1])}</text>
              <circle cx="92" cy="55" r="14" class="svg-v5-start"></circle><text x="92" y="83" text-anchor="middle" class="svg-v5-note">${escapeHtml(visual.start || "Start")}</text>
              <rect x="122" y="38" width="76" height="34" rx="7" class="svg-v5-task"></rect><text x="160" y="52" text-anchor="middle" class="svg-v5-task-text">${escapeHtml(task1[0])}</text><text x="160" y="64" text-anchor="middle" class="svg-v5-task-text">${escapeHtml(task1[1])}</text>
              <rect x="122" y="148" width="76" height="34" rx="7" class="svg-v5-task"></rect><text x="160" y="162" text-anchor="middle" class="svg-v5-task-text">${escapeHtml(task2[0])}</text><text x="160" y="174" text-anchor="middle" class="svg-v5-task-text">${escapeHtml(task2[1])}</text>
              <polygon points="246,141 270,165 246,189 222,165" class="svg-v5-gateway"></polygon><text x="246" y="162" text-anchor="middle" class="svg-v5-gateway-text">${escapeHtml(gateway[0])}</text><text x="246" y="173" text-anchor="middle" class="svg-v5-gateway-text">${escapeHtml(gateway[1])}</text>
              <rect x="292" y="38" width="74" height="34" rx="7" class="svg-v5-task"></rect><text x="329" y="52" text-anchor="middle" class="svg-v5-task-text">${escapeHtml(task3[0])}</text><text x="329" y="64" text-anchor="middle" class="svg-v5-task-text">${escapeHtml(task3[1])}</text>
              <circle cx="396" cy="55" r="14" class="svg-v5-end"></circle><text x="396" y="83" text-anchor="middle" class="svg-v5-note">${escapeHtml(visual.success || "Complete")}</text>
              <circle cx="396" cy="165" r="14" class="svg-v5-end rejected"></circle><text x="396" y="193" text-anchor="middle" class="svg-v5-note">${escapeHtml(visual.failure || "Returned")}</text>
              <path class="svg-v5-arrow" style="marker-end:url(#${escapeAttr(markerId)})" d="M106 55 H122"></path><path class="svg-v5-arrow" style="marker-end:url(#${escapeAttr(markerId)})" d="M160 72 V148"></path><path class="svg-v5-arrow" style="marker-end:url(#${escapeAttr(markerId)})" d="M198 165 H222"></path><path class="svg-v5-arrow" style="marker-end:url(#${escapeAttr(markerId)})" d="M246 141 V55 H292"></path><path class="svg-v5-arrow" style="marker-end:url(#${escapeAttr(markerId)})" d="M366 55 H382"></path><path class="svg-v5-arrow" style="marker-end:url(#${escapeAttr(markerId)})" d="M270 165 H382"></path>
              <text x="255" y="97" class="svg-v5-path-label">YES</text><text x="316" y="157" class="svg-v5-path-label">NO</text>
            </svg>
          </div>`;
  }

  if (type === "requirements" || type === "stories") {
    const criteria = Array.isArray(visual.criteria) ? visual.criteria : [];
    const footerTags = Array.isArray(visual.footerTags) ? visual.footerTags : [];
    return `<div class="artefact-visual requirements-output ${escapeAttr(caseType)}-output" aria-hidden="true">
            <div class="output-title">${outputTitle}</div>
            <div class="story-output-card"><strong>User story</strong><p>${escapeHtml(visual.story || "Define the user need and business value.")}</p></div>
            <div class="acceptance-output-card"><strong>Acceptance criteria</strong>${criteria.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
            <div class="requirements-footer"><b>${escapeHtml(visual.footerLabel || "BRD")}</b>${footerTags.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
          </div>`;
  }

  if (type === "prototype") {
    const metrics = Array.isArray(visual.metrics) ? visual.metrics : [];
    const rows = Array.isArray(visual.rows) ? visual.rows : [];
    const walkthrough = Array.isArray(visual.walkthrough) ? visual.walkthrough : [];
    const middleVisual = caseType === "hcm"
      ? '<div class="prototype-readiness"><span><b>✓</b>HR checks complete</span><span><b>✓</b>Manager tasks assigned</span><span class="pending"><b>!</b>IT access pending</span></div>'
      : caseType === "erp"
        ? '<div class="prototype-approval-flow"><span>Requested</span><i></i><span>Finance review</span><i></i><span>PO ready</span></div>'
        : '<div class="prototype-chart crm-chart"><i></i><i></i><i></i><i></i></div>';
    return `<div class="artefact-visual prototype-output ${escapeAttr(caseType)}-output" aria-hidden="true">
            <div class="output-title">${outputTitle}</div>
            <div class="prototype-output-grid">
              <div class="prototype-window">
                <div class="prototype-sidebar"><span></span><span></span><span></span><small>${escapeHtml(visual.productLabel || caseType.toUpperCase())}</small></div>
                <div class="prototype-canvas">
                  ${metrics.slice(0, 2).map((metric, index) => `<div class="metric-card${index === 0 ? " primary" : ""}"><b>${escapeHtml(metric.value)}</b><span>${escapeHtml(metric.label)}</span></div>`).join("")}
                  ${middleVisual}
                  <div class="prototype-table">${rows.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
                </div>
              </div>
              <div class="walkthrough-panel"><strong>Interview story</strong>${walkthrough.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
            </div>
          </div>`;
  }

  const stakeholders = visual.stakeholders || {};
  const raci = Array.isArray(visual.raci) ? visual.raci : [];
  return `<div class="artefact-visual stakeholder-output ${escapeAttr(caseType)}-output" aria-hidden="true">
          <div class="output-title">${outputTitle}</div>
          <div class="stakeholder-output-grid">
            <div class="power-interest-output"><strong>Power / interest grid</strong><span class="matrix-x"></span><span class="matrix-y"></span><span class="stakeholder-pill it">${escapeHtml(stakeholders.it || "Technology")}</span><span class="stakeholder-pill sponsor">${escapeHtml(stakeholders.sponsor || "Sponsor")}</span><span class="stakeholder-pill users">${escapeHtml(stakeholders.users || "Users")}</span><span class="stakeholder-pill ops">${escapeHtml(stakeholders.ops || "Operations")}</span></div>
            <div class="raci-output"><strong>RACI snapshot</strong>${raci.map((item) => `<div><b>${escapeHtml(item.key)}</b><span>${escapeHtml(item.line1)}<br />${escapeHtml(item.line2)}</span></div>`).join("")}</div>
          </div>
        </div>`;
}

function renderTags(tags = []) {
  if (!Array.isArray(tags) || tags.length === 0) return "";
  return `<div class="proof-tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>`;
}

function generateLegacyArtefactsSection(home) {
  const artefacts = home.artefacts;
  if (!artefacts || !Array.isArray(artefacts.items) || artefacts.items.length === 0) {
    return "";
  }
  const project = artefacts.project || {};
  const systemList = Array.isArray(project.systems) && project.systems.length
    ? project.systems
    : [{ label: "CRM", number: "01", title: "Sales process case", text: "Pipeline + reporting", type: "crm" }];
  const caseButtons = systemList
    .map((system, index) => {
      const type = system.type || projectAccentType(system.label);
      return `<button class="lab-case ${escapeAttr(type)}${index === 0 ? " active" : ""}" type="button" data-case-label="${escapeAttr(system.label)}" data-case-number="${escapeAttr(system.number || `0${index + 1}`)}" data-case-title="${escapeAttr(system.title)}" data-case-text="${escapeAttr(system.text)}" data-case-type="${escapeAttr(type)}" aria-pressed="${index === 0 ? "true" : "false"}">
              <span class="lab-case-mark">${escapeHtml(system.label)}</span>
              <span><strong>${escapeHtml(system.title)}</strong><em>${escapeHtml(system.text)}</em></span>
            </button>`;
    })
    .join("\n              ");
  const stepButtons = artefacts.items
    .map((item, index) => {
      const tags = Array.isArray(item.tags) ? item.tags.join(" + ") : "";
      const type = item.type || "requirements";
      const stage = proofStage(item, index);
      return `<button class="lab-step${index === 0 ? " active" : ""}" type="button" data-step-stage="${escapeAttr(stage)}" data-step-title="${escapeAttr(item.title)}" data-step-text="${escapeAttr(item.text)}" data-step-tags="${escapeAttr(tags)}" data-step-type="${escapeAttr(type)}" data-step-code="${escapeAttr(proofCodeLine(type))}" aria-pressed="${index === 0 ? "true" : "false"}" aria-label="${escapeAttr(`${stage}: ${item.title}`)}">
              <span>${index + 1}</span><b>${escapeHtml(stage)}</b>
            </button>`;
    })
    .join("\n              ");
  const visualPanels = systemList
    .flatMap((system, systemIndex) => {
      const caseType = system.type || projectAccentType(system.label);
      const steps = Array.isArray(system.steps) && system.steps.length ? system.steps : artefacts.items;
      return steps.map((item, stepIndex) => {
        const type = item.type || "requirements";
        return `<div class="lab-visual-panel${systemIndex === 0 && stepIndex === 0 ? " active" : ""}" data-case-type="${escapeAttr(caseType)}" data-step-type="${escapeAttr(type)}">
                ${renderArtefactVisual(item, caseType)}
              </div>`;
      });
    })
    .join("\n                ");
  const headlineLead = artefacts.headline || artefacts.title || "Turn one business case into a portfolio";
  const headlineHighlight = artefacts.headlineHighlight || "employers can trust.";
  const outcome = artefacts.outcome || {};
  const defaultSystem = systemList[0];
  const defaultSteps = Array.isArray(defaultSystem.steps) && defaultSystem.steps.length ? defaultSystem.steps : artefacts.items;
  const defaultStep = defaultSteps[0];
  const defaultStepTags = Array.isArray(defaultStep.tags) ? defaultStep.tags.join(" + ") : "";
  const outcomeBenefits = Array.isArray(outcome.benefits)
    ? outcome.benefits.map((benefit) => `<span>${escapeHtml(benefit)}</span>`).join("")
    : "";

  return `<section class="section artefacts-section portfolio-case-section portfolio-lab-section" id="portfolio">
    <div class="section-inner">
      <div class="portfolio-lab">
        <div class="portfolio-lab-copy">
          <div class="section-label">${escapeHtml(artefacts.label)}</div>
          <h2 class="portfolio-lab-title">${escapeHtml(headlineLead)} <span>${escapeHtml(headlineHighlight)}</span></h2>
          <p class="portfolio-lab-intro">${escapeHtml(artefacts.intro)}</p>
          <div class="lab-case-list" aria-label="${escapeAttr(artefacts.caseLabel || "Choose your business case")}">
            <span class="lab-case-label">${escapeHtml(artefacts.caseLabel || "Choose your business case")}</span>
            ${caseButtons}
          </div>
          <p class="portfolio-lab-trust"><span aria-hidden="true">&check;</span>${escapeHtml(artefacts.trustText || "Realistic scenarios. Practical outcomes. Portfolio-ready.")}</p>
        </div>
        <div class="portfolio-lab-board" data-active-case="${escapeAttr(defaultSystem.type || projectAccentType(defaultSystem.label))}" data-active-step="${escapeAttr(defaultStep.type || "stakeholder")}">
          <div class="lab-board-head">
            <span>${escapeHtml(artefacts.journeyLabel || "A guided journey. Four steps. Real artefacts.")}</span>
            <strong class="lab-board-case">${escapeHtml(defaultSystem.label)} ${escapeHtml(defaultSystem.number || "01")}</strong>
          </div>
          <div class="lab-workspace">
            <div class="lab-case-summary">
              <span>Selected case</span>
              <h3 class="lab-case-title">${escapeHtml(defaultSystem.title)}</h3>
              <p class="lab-case-text">${escapeHtml(defaultSystem.text)}</p>
              <code class="lab-code-line">${escapeHtml(defaultStep.code || proofCodeLine(defaultStep.type || "stakeholder"))}</code>
            </div>
            <div class="lab-visual-shell">
              ${visualPanels}
            </div>
          </div>
          <div class="lab-step-area">
            <div class="lab-step-list" aria-label="Portfolio artefact journey">
              ${stepButtons}
            </div>
            <div class="lab-step-detail">
              <div class="lab-step-icon" aria-hidden="true">1</div>
              <div>
                <span class="lab-step-stage">${escapeHtml(proofStage(defaultStep, 0))}</span>
                <h3 class="lab-step-title">${escapeHtml(defaultStep.title)}</h3>
                <p class="lab-step-text">${escapeHtml(defaultStep.text)}</p>
                <strong class="lab-step-tags">${escapeHtml(defaultStepTags)}</strong>
              </div>
            </div>
          </div>
          <div class="lab-outcome">
            <strong>${escapeHtml(outcome.title || "From business problem to portfolio-ready project pack.")}</strong>
            <div>${outcomeBenefits}</div>
          </div>
          <p class="visually-hidden" role="status" aria-live="polite" aria-atomic="true" data-portfolio-status></p>
          <script type="application/json" class="lab-portfolio-data">${JSON.stringify(systemList.map((system) => ({ ...system, steps: Array.isArray(system.steps) && system.steps.length ? system.steps : artefacts.items }))).replaceAll("<", "\\u003c")}</script>
        </div>
      </div>
    </div>
  </section>`;
}

function portfolioStatusTone(value = "") {
  const status = String(value).toLowerCase();
  if (/(pass|ready|agreed|covered|confirmed)/.test(status)) return "positive";
  if (/(high|review|retest|open|monitor|fix|final check)/.test(status)) return "attention";
  return "neutral";
}

function renderPortfolioTable(title, rows = [], columns = []) {
  return `<div class="px-table-wrap">
    <table class="px-document-table">
      <caption class="visually-hidden">${escapeHtml(title)} using fictional sample project data</caption>
      <thead><tr>${columns.map((column) => `<th scope="col">${escapeHtml(column.label)}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((row) => `<tr>${columns.map((column) => {
        const value = row[column.key] || "";
        const statusCell = column.status === true;
        return `<td data-label="${escapeAttr(column.label)}">${statusCell ? `<span class="px-table-status ${portfolioStatusTone(value)}">${escapeHtml(value)}</span>` : escapeHtml(value)}</td>`;
      }).join("")}</tr>`).join("")}</tbody>
    </table>
  </div>`;
}

function renderPortfolioPreview(artefact = {}) {
  const kind = artefact.kind || "requirements-table";
  const preview = artefact.preview || {};
  let body = "";

  if (kind === "stakeholder-map") {
    const points = Array.isArray(preview.points) ? preview.points : [];
    const mobileQuadrants = [
      { id: "high-keep", label: "Keep satisfied", positions: [] },
      { id: "high-manage", label: "Manage closely", positions: ["high-high", "mid-high"] },
      { id: "low-monitor", label: "Monitor", positions: ["low-mid"] },
      { id: "low-inform", label: "Keep informed", positions: ["high-mid"] },
    ];
    const mobileMap = mobileQuadrants
      .map((quadrant) => {
        const quadrantPoints = points.filter((point) => quadrant.positions.includes(point.position));
        return `<div class="px-map-mobile-region ${escapeAttr(quadrant.id)}">
          <strong>${escapeHtml(quadrant.label)}</strong>
          <div class="px-map-mobile-points" role="list">${quadrantPoints.length
            ? quadrantPoints.map((point) => `<span class="px-map-mobile-point" role="listitem">${escapeHtml(point.name)}</span>`).join("")
            : '<span class="px-map-mobile-empty" role="listitem">No stakeholder currently</span>'}</div>
        </div>`;
      })
      .join("");
    body = `<div class="px-stakeholder-map" role="img" aria-label="Power and interest map showing the project stakeholder groups">
      <span class="px-map-quadrant high-manage">Manage closely</span>
      <span class="px-map-quadrant high-keep">Keep satisfied</span>
      <span class="px-map-quadrant low-inform">Keep informed</span>
      <span class="px-map-quadrant low-monitor">Monitor</span>
      <span class="px-map-axis axis-y">Influence</span>
      <span class="px-map-axis axis-x">Interest</span>
      ${points.map((point) => `<span class="px-map-point ${escapeAttr(String(point.position || "").replace(/[^a-z0-9-]/gi, ""))}">${escapeHtml(point.name)}</span>`).join("")}
    </div>
    <div class="px-stakeholder-map-mobile" role="group" aria-label="Power and interest map showing the project stakeholder groups">
      <div class="px-map-mobile-axis" aria-hidden="true"><span>Higher influence ↑</span><span>Higher interest →</span></div>
      <div class="px-map-mobile-grid">${mobileMap}</div>
    </div>`;
  } else if (kind === "process-flow") {
    const nodes = Array.isArray(preview.nodes) ? preview.nodes : [];
    body = `<div class="px-process-wrap">
      <div class="px-process-flow" role="img" aria-label="Current lead process from submission to sales follow-up">
        ${nodes.map((node, index) => `<span class="px-process-node">${escapeHtml(node)}</span>${index < nodes.length - 1 ? '<span class="px-process-arrow" aria-hidden="true">→</span>' : ""}`).join("")}
      </div>
      <div class="px-process-finding"><span>Finding</span><strong>${escapeHtml(preview.exception || "A business rule is missing")}</strong></div>
    </div>`;
  } else if (kind === "user-story") {
    const criteria = Array.isArray(preview.criteria) ? preview.criteria : [];
    body = `<div class="px-story-preview">
      <div class="px-story-key"><span>Story</span><strong>${escapeHtml(preview.key || "CRM-001")}</strong></div>
      <p>${escapeHtml(preview.story || "A clear user need with measurable business value.")}</p>
      <div class="px-criteria-preview"><strong>Acceptance criteria</strong><ol>${criteria.map((criterion) => `<li>${escapeHtml(criterion)}</li>`).join("")}</ol></div>
    </div>`;
  } else if (kind === "readiness-checklist") {
    const items = Array.isArray(preview.items) ? preview.items : [];
    body = `<ul class="px-readiness-list">${items.map((item) => `<li><span class="px-readiness-mark ${portfolioStatusTone(item.status)}" aria-hidden="true"></span><strong>${escapeHtml(item.task)}</strong><em>${escapeHtml(item.status)}</em></li>`).join("")}</ul>`;
  } else {
    const tableMap = {
      "requirements-table": [
        { key: "id", label: "ID" },
        { key: "requirement", label: "Requirement" },
        { key: "priority", label: "Priority", status: true },
        { key: "status", label: "Status", status: true },
      ],
      "data-mapping": [
        { key: "source", label: "Source" },
        { key: "target", label: "Salesforce target" },
        { key: "rule", label: "Business rule" },
      ],
      traceability: [
        { key: "requirement", label: "Requirement" },
        { key: "decision", label: "Design decision" },
        { key: "coverage", label: "Coverage", status: true },
      ],
      "test-table": [
        { key: "id", label: "ID" },
        { key: "scenario", label: "UAT scenario" },
        { key: "expected", label: "Expected outcome" },
        { key: "status", label: "Status", status: true },
      ],
      "defect-log": [
        { key: "id", label: "ID" },
        { key: "issue", label: "Issue" },
        { key: "severity", label: "Severity", status: true },
        { key: "status", label: "Status", status: true },
      ],
      "validation-table": [
        { key: "check", label: "Post-deployment check" },
        { key: "owner", label: "Owner" },
        { key: "status", label: "Status", status: true },
      ],
    };
    body = renderPortfolioTable(artefact.title || "BA artefact", Array.isArray(preview.rows) ? preview.rows : [], tableMap[kind] || tableMap["requirements-table"]);
  }

  return `<div class="px-document">
    <header class="px-document-head">
      <div><span>Sample project data</span><strong>${escapeHtml(artefact.title || "BA artefact")}</strong></div>
      <dl><div><dt>Status</dt><dd>Working draft</dd></div><div><dt>Revision</dt><dd>0.3</dd></div></dl>
    </header>
    <div class="px-document-body">${body}</div>
    <p class="px-document-caption">${escapeHtml(artefact.caption || "A realistic Business Analysis working artefact.")}</p>
  </div>`;
}

function generateArtefactsSection(home) {
  const artefacts = home.artefacts || {};
  const flagship = artefacts.flagship || {};
  const lifecycle = Array.isArray(flagship.lifecycle) ? flagship.lifecycle : [];
  if (!lifecycle.length) return "";

  const metadata = (flagship.metadata || [])
    .map((item) => `<div><dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value)}</dd></div>`)
    .join("");
  const stageTabs = lifecycle
    .map((stage, index) => `<button class="px-stage-tab${index === 0 ? " is-active" : ""}" type="button" role="tab" id="portfolio-tab-${escapeAttr(stage.id)}" aria-controls="portfolio-panel-${escapeAttr(stage.id)}" aria-selected="${index === 0 ? "true" : "false"}" tabindex="${index === 0 ? "0" : "-1"}" data-portfolio-stage="${escapeAttr(stage.id)}" data-stage-index="${index}">
      <span class="px-stage-node" aria-hidden="true">${escapeHtml(stage.number || String(index + 1).padStart(2, "0"))}</span>
      <span class="px-stage-title">${escapeHtml(stage.title)}</span>
      <span class="px-stage-current">${index === 0 ? "Current stage" : ""}</span>
    </button>`)
    .join("");
  const stagePanels = lifecycle
    .map((stage, stageIndex) => {
      const outputs = Array.isArray(stage.outputs) ? stage.outputs : [];
      const stageArtefacts = Array.isArray(stage.artefacts) ? stage.artefacts : [];
      const nextStage = lifecycle[(stageIndex + 1) % lifecycle.length];
      const isFinalStage = stageIndex === lifecycle.length - 1;
      const artefactTabs = stageArtefacts
        .map((artefact, artefactIndex) => `<button class="px-artefact-tab${artefactIndex === 0 ? " is-active" : ""}" type="button" aria-pressed="${artefactIndex === 0 ? "true" : "false"}" aria-controls="portfolio-artefact-${escapeAttr(stage.id)}-${artefactIndex}" data-portfolio-artefact="${artefactIndex}" data-portfolio-artefact-stage="${escapeAttr(stage.id)}">${escapeHtml(artefact.title)}</button>`)
        .join("");
      const artefactPanels = stageArtefacts
        .map((artefact, artefactIndex) => `<article class="px-artefact-panel${artefactIndex === 0 ? " is-active" : ""}" id="portfolio-artefact-${escapeAttr(stage.id)}-${artefactIndex}" data-portfolio-artefact-panel="${artefactIndex}"${artefactIndex === 0 ? "" : " hidden"} aria-label="${escapeAttr(artefact.title)} preview">
          ${renderPortfolioPreview(artefact)}
        </article>`)
        .join("");
      return `<section class="px-stage-panel${stageIndex === 0 ? " is-active" : ""}" role="tabpanel" id="portfolio-panel-${escapeAttr(stage.id)}" aria-labelledby="portfolio-tab-${escapeAttr(stage.id)}" data-portfolio-stage-panel="${escapeAttr(stage.id)}"${stageIndex === 0 ? "" : " hidden"} tabindex="0">
        <div class="px-stage-narrative">
          <span class="px-stage-count">Stage ${escapeHtml(stage.number || String(stageIndex + 1).padStart(2, "0"))} of ${String(lifecycle.length).padStart(2, "0")}</span>
          <h4>${escapeHtml(stage.title)}</h4>
          <p class="px-stage-description">${escapeHtml(stage.description)}</p>
          <p class="px-stage-continuity"><span aria-hidden="true">↳</span> ${escapeHtml(stage.continuity)}</p>
          <div class="px-output-list">
            <strong>Potential outputs</strong>
            <ul>${outputs.map((output) => `<li>${escapeHtml(output)}</li>`).join("")}</ul>
          </div>
        </div>
        <div class="px-evidence-workspace">
          <header class="px-evidence-head"><div><span>Professional BA evidence</span><strong>Explore the working artefacts</strong></div><span>Salesforce CRM · Sample</span></header>
          <div class="px-artefact-tabs" role="group" aria-label="Choose a ${escapeAttr(stage.title)} artefact preview">${artefactTabs}</div>
          <div class="px-artefact-panels">${artefactPanels}</div>
        </div>
        <button class="px-next-stage" type="button" data-portfolio-next-stage="${escapeAttr(nextStage.id)}">
          <span>${isFinalStage ? "Review the connected journey" : "Continue the connected journey"}</span>
          <strong>${isFinalStage ? `Return to ${escapeHtml(nextStage.title)}` : `Next stage: ${escapeHtml(nextStage.title)}`}</strong>
          <i aria-hidden="true">${isFinalStage ? "↺" : "→"}</i>
        </button>
      </section>`;
    })
    .join("");
  const delivery = (artefacts.delivery || [])
    .map((item, index) => `<div class="px-delivery-item"><span>0${index + 1}</span><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.text)}</p></div>`)
    .join("");
  const secondary = artefacts.secondary || {};
  const secondaryProjects = (secondary.projects || [])
    .map((project) => `<article class="px-secondary-project">
      <button type="button" aria-expanded="false" aria-controls="portfolio-secondary-${escapeAttr(project.id)}" data-portfolio-secondary="${escapeAttr(project.id)}">
        <span class="px-secondary-index">${escapeHtml(project.label)}</span>
        <span class="px-secondary-copy"><strong>${escapeHtml(project.title)}</strong><em>${escapeHtml(project.description)}</em></span>
        <span class="px-secondary-toggle" aria-hidden="true">+</span>
      </button>
      <div class="px-secondary-reveal" id="portfolio-secondary-${escapeAttr(project.id)}" hidden><p>${escapeHtml(project.reveal)}</p></div>
    </article>`)
    .join("");
  const cta = artefacts.cta || {};
  const version = artefacts.portfolioVersion || "v1.0";

  return `<section class="section artefacts-section portfolio-experience-section" id="portfolio" data-portfolio-version="${escapeAttr(version)}">
    <div class="section-inner portfolio-experience">
      <header class="px-intro">
        <div class="section-label">${escapeHtml(artefacts.label || "PORTFOLIO EXPERIENCE")}</div>
        <h2>${escapeHtml(artefacts.headline)}</h2>
        <p>${escapeHtml(artefacts.intro)}</p>
      </header>

      <article class="px-flagship" aria-labelledby="portfolio-flagship-title">
        <header class="px-project-masthead">
          <div class="px-project-copy">
            <span class="px-flagship-label"><i aria-hidden="true"></i>${escapeHtml(flagship.label)}</span>
            <h3 id="portfolio-flagship-title">${escapeHtml(flagship.title)}</h3>
            <p><strong>Project scenario</strong>${escapeHtml(flagship.scenario)}</p>
          </div>
          <aside class="px-role-stamp" aria-label="Your role in the flagship project">
            <span>Your role</span><strong>${escapeHtml(flagship.role)}</strong><p>${escapeHtml(flagship.roleNote)}</p>
          </aside>
        </header>
        <dl class="px-project-meta">${metadata}</dl>

        <div class="px-lifecycle-shell">
          <div class="px-lifecycle-heading"><div><span>ONE CONNECTED PROJECT</span><strong>From first finding to go-live evidence</strong></div><span data-portfolio-stage-count>Stage 1 of ${lifecycle.length}</span></div>
          <div class="px-lifecycle-scroll">
            <div class="px-lifecycle" role="tablist" aria-label="Salesforce CRM delivery lifecycle" aria-describedby="portfolio-lifecycle-instruction" style="--portfolio-progress:0%">
              <span class="px-lifecycle-track" aria-hidden="true"><i></i></span>
              ${stageTabs}
            </div>
          </div>
          <p class="px-lifecycle-instruction" id="portfolio-lifecycle-instruction"><span aria-hidden="true">↔</span><span>Swipe to see all five stages. <strong>Tap a stage to open it.</strong></span><span aria-hidden="true">→</span></p>
          <div class="px-stage-panels">${stagePanels}</div>
          <div class="px-evidence-thread" aria-label="One connected evidence thread">
            <strong>One evidence thread</strong>
            <ol><li>Discovery finding</li><li>Requirement</li><li>Design decision</li><li>UAT scenario</li><li>Deployment readiness</li></ol>
          </div>
        </div>
      </article>

      <section class="px-delivery" aria-labelledby="portfolio-delivery-title">
        <header><span>HOW THE EXPERIENCE WORKS</span><h3 id="portfolio-delivery-title">Practical by design.</h3></header>
        <div class="px-delivery-grid">${delivery}</div>
      </section>

      <section class="px-secondary" aria-labelledby="portfolio-secondary-title">
        <header><span>APPLY THE APPROACH</span><h3 id="portfolio-secondary-title">${escapeHtml(secondary.heading)}</h3></header>
        <div class="px-secondary-list">${secondaryProjects}</div>
      </section>

      <aside class="px-cta">
        <div><span>NEXT STEP</span><h3>${escapeHtml(cta.title)}</h3></div>
        <a class="btn px-cta-link" href="${escapeAttr(cta.url || "#pricing")}" data-portfolio-cta><span>${escapeHtml(cta.label)}</span><span aria-hidden="true">→</span></a>
      </aside>
      <p class="visually-hidden" role="status" aria-live="polite" aria-atomic="true" data-portfolio-status></p>
    </div>
  </section>`;
}

function generateStepsSection(home) {
  const process = home.process;
  const steps = process.steps
    .map(
      (step) =>
        `<article class="process-step ${escapeAttr(step.style)}"><div class="process-marker">${escapeHtml(step.marker)}</div><span class="process-time">${escapeHtml(step.time)}</span><h3>${escapeHtml(step.title)}</h3><p>${escapeHtml(step.text)}</p></article>`
    )
    .join("\n        ");
  const salary = home.salary;
  return `<section class="section" id="steps">
    <div class="section-inner">
      <div class="section-head center">
        <div class="section-label">${escapeHtml(process.label)}</div>
        <h2>${escapeHtml(process.title)}</h2>
        <p class="section-copy">${escapeHtml(process.intro)}</p>
      </div>
      <div class="process-flow" aria-label="Business Analysis mentorship process flow">
        ${steps}
      </div>
      <aside class="salary-strip" aria-label="Indicative UK Business Analysis salary ranges">
        <div class="salary-strip-text">
          <span class="salary-kicker">${escapeHtml(salary.label)}</span>
          <h3>${escapeHtml(salary.title)}</h3>
          <p>${escapeHtml(salary.intro)}</p>
        </div>
        <div class="salary-board">
          <div class="salary-range"><strong>${escapeHtml(salary.permanentLabel)}</strong><span>${escapeHtml(salary.permanentRange)}</span><em>${escapeHtml(salary.permanentNote)}</em></div>
          <div class="salary-range contract"><strong>${escapeHtml(salary.contractLabel)}</strong><span>${escapeHtml(salary.contractRange)}</span><em>${escapeHtml(salary.contractNote)}</em></div>
          <div class="salary-result"><strong>${escapeHtml(salary.studentLabel)}</strong><span>${escapeHtml(salary.studentRange)}</span></div>
        </div>
      </aside>
    </div>
  </section>`;
}

function generatePricingSection(pricing) {
  const services = pricing.services
    .map((service) => `<div class="service-row"><div><strong>${escapeHtml(service.name)}</strong><span>${escapeHtml(service.description)}</span></div><strong>${escapeHtml(service.price)}</strong></div>`)
    .join("\n            ");
  const features = pricing.bundle.features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join("\n            ");
  return `<section class="section" id="pricing">
    <div class="section-inner">
      <div class="section-head center">
        <div class="section-label">${escapeHtml(pricing.sectionLabel)}</div>
        <h2>${escapeHtml(pricing.sectionTitle)}</h2>
        <p class="section-copy">${escapeHtml(pricing.sectionIntro)}</p>
      </div>
      <div class="pricing-grid">
        <div>
          <h3>${escapeHtml(pricing.individualServicesTitle)}</h3>
          <div class="service-list">
            ${services}
          </div>
        </div>
        <article class="panel bundle">
          <div class="badge">${escapeHtml(pricing.bundle.badge)}</div>
          <h3 class="serif">${escapeHtml(pricing.bundle.title)}</h3>
          <div class="price"><span>£</span>${escapeHtml(pricing.bundle.price)}</div>
          <div class="was">${escapeHtml(pricing.bundle.was)}</div>
          <div class="save">${escapeHtml(pricing.bundle.save)}</div>
          <ul class="check-list">
            ${features}
          </ul>
          <a class="btn btn-primary" href="${escapeAttr(pricing.bundle.buttonUrl)}">${escapeHtml(pricing.bundle.buttonLabel)}</a>
          <p class="payment-note"><strong>Flexible payment options:</strong> ${escapeHtml(pricing.bundle.paymentNote)}</p>
        </article>
      </div>
    </div>
  </section>`;
}

function generateTestimonialsSection(testimonials) {
  if (testimonials.visible === false || !Array.isArray(testimonials.items) || testimonials.items.length === 0) {
    return "";
  }
  const items = testimonials.items
    .map((item, index) => `<article class="testimonial${index === 0 ? " active" : ""}"><div class="stars">★★★★★</div><p>"${escapeHtml(item.quote)}"</p><strong>${escapeHtml(item.name)}</strong></article>`)
    .join("\n        ");
  const dots = testimonials.items.map((_, index) => `<span class="testimonial-dot${index === 0 ? " active" : ""}"></span>`).join("");
  return `<section class="section" id="proof">
    <div class="section-inner">
      <div class="section-head center">
        <div class="section-label">${escapeHtml(testimonials.label)}</div>
        <h2>${escapeHtml(testimonials.title).replace("scratch", "<span>scratch</span>")}</h2>
        <p class="section-copy">${escapeHtml(testimonials.intro)}</p>
      </div>
      <div class="testimonials">
        ${items}
      </div>
      <div class="testimonial-dots" aria-hidden="true">${dots}</div>
    </div>
  </section>`;
}

function generateContactSection(home, settings) {
  const contact = home.contact;
  return `<section class="section alt" id="contact">
    <div class="section-inner">
      <div class="section-head center">
        <div class="section-label">${escapeHtml(contact.label)}</div>
        <h2>${escapeHtml(contact.title)}</h2>
        <p class="section-copy">${escapeHtml(contact.intro)}</p>
      </div>
      <div class="contact-grid">
        <div class="contact-card">
          <div class="contact-icon email" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 6h16v12H4z"/><path d="m4 7 8 6 8-6"/></svg></div>
          <div><span>Email</span><strong><a href="mailto:${escapeAttr(settings.contact.email)}">${escapeHtml(settings.contact.email)}</a></strong></div>
        </div>
        <div class="contact-card">
          <div class="contact-icon phone" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6.6 10.8a15.3 15.3 0 0 0 6.6 6.6l2.2-2.2a1.4 1.4 0 0 1 1.4-.34c1.54.5 3.12.76 4.7.76.82 0 1.5.68 1.5 1.5V21c0 .82-.68 1.5-1.5 1.5C10.46 22.5 1.5 13.54 1.5 2.5 1.5 1.68 2.18 1 3 1h3.9c.82 0 1.5.68 1.5 1.5 0 1.58.26 3.16.76 4.7.15.5.02 1.04-.34 1.4l-2.22 2.2Z"/></svg></div>
          <div><span>Phone</span><strong><a href="${escapeAttr(settings.contact.phoneHref)}">${escapeHtml(settings.contact.phone)}</a></strong></div>
        </div>
        <div class="contact-card">
          <div class="contact-icon whatsapp" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M16.02 3.2A12.66 12.66 0 0 0 5.1 22.25L3.6 28.8l6.68-1.45A12.67 12.67 0 1 0 16.02 3.2Zm0 22.9c-2 0-3.86-.58-5.43-1.58l-.38-.24-3.96.86.9-3.86-.25-.4a10.18 10.18 0 1 1 9.12 5.22Zm5.82-7.62c-.32-.16-1.88-.93-2.17-1.03-.29-.11-.5-.16-.72.16-.21.32-.82 1.03-1 1.24-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.58-.95-.85-1.59-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.72-1.73-.98-2.38-.26-.62-.52-.54-.72-.55h-.61c-.21 0-.56.08-.85.4-.29.32-1.11 1.08-1.11 2.64s1.14 3.06 1.3 3.27c.16.21 2.24 3.42 5.43 4.8.76.33 1.35.52 1.81.67.76.24 1.45.21 2 .13.61-.09 1.88-.77 2.15-1.51.27-.74.27-1.38.19-1.51-.08-.13-.29-.21-.61-.37Z"/></svg></div>
          <div><span>WhatsApp</span><strong><a href="${escapeAttr(settings.contact.whatsappUrl)}" target="_blank" rel="noopener">${escapeHtml(settings.contact.whatsappLabel)}</a></strong></div>
        </div>
      </div>
      <div class="contact-subhead center">
        <h3>${escapeHtml(contact.socialTitle)}</h3>
        <p>${escapeHtml(contact.socialIntro)}</p>
      </div>
      <div class="social-grid">
        <a class="social-link" href="${escapeAttr(settings.social.telegram)}" target="_blank" rel="noopener"><span class="telegram-icon">${socialIconMap.telegram}</span><div>Telegram<small>Free community</small></div></a>
        <a class="social-link" href="${escapeAttr(settings.social.instagram)}" target="_blank" rel="noopener"><span class="instagram-icon">${socialIconMap.instagram}</span><div>Instagram<small>BA content</small></div></a>
        <a class="social-link" href="${escapeAttr(settings.social.tiktok)}" target="_blank" rel="noopener"><span class="tiktok-icon">${socialIconMap.tiktok}</span><div>TikTok<small>Quick tips</small></div></a>
        <a class="social-link" href="${escapeAttr(settings.social.youtube)}" target="_blank" rel="noopener"><span class="youtube-icon">${socialIconMap.youtube}</span><div>YouTube<small>BA videos</small></div></a>
      </div>
    </div>
  </section>`;
}

function generateHomeAssessmentSection(assessment) {
  return `<section class="home-assessment-section" id="assessment" aria-labelledby="homepageAssessmentTitle">
  <div class="assessment-landing-inner">
    ${generateAssessmentFront(assessment)}
  </div>
</section>`;
}

function generateHomeFaqSection(faqs) {
  const all = flattenFaqs(faqs);
  const selected = faqs.homepageQuestions
    .map((question) => all.find((item) => item.question === question))
    .filter(Boolean);
  const faqItems = selected
    .map((item, index) => {
      const questionId = `homepage-faq-question-${index + 1}`;
      const answerId = `homepage-faq-answer-${index + 1}`;
      return `<article class="faq-item${index === 0 ? " open" : ""}"><button class="faq-question" id="${questionId}" type="button" aria-expanded="${index === 0 ? "true" : "false"}" aria-controls="${answerId}">${escapeHtml(item.question)}</button><div class="faq-answer" id="${answerId}" role="region" aria-labelledby="${questionId}">${escapeHtml(item.answer)}</div></article>`;
    })
    .join("\n        ");
  return `<section class="section" id="faq">
    <div class="section-inner">
      <div class="section-head center">
        <div class="section-label">FAQ</div>
        <h2>Quick answers before you join</h2>
        <p class="section-copy">${escapeHtml(faqs.homepageIntro)}</p>
      </div>
      <div class="faq-list">
        ${faqItems}
      </div>
      <div class="faq-more"><a class="btn btn-secondary" href="faq/index.html">View all FAQs</a></div>
    </div>
  </section>`;
}

function updateHomepage(settings, home, pricing, testimonials, faqs, assessment) {
  let html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const homeFaqItems = faqs.homepageQuestions
    .map((question) => flattenFaqs(faqs).find((item) => item.question === question))
    .filter(Boolean);

  html = replaceFirst(
    html,
    /<script type="application\/ld\+json">\s*\{[\s\S]*?"@type": "FAQPage"[\s\S]*?<\/script>/,
    faqJsonLd(homeFaqItems),
    "homepage FAQ schema"
  );
  html = replaceFirst(
    html,
    /<div class="eyebrow"><span class="leaf-dot" aria-hidden="true"><\/span>Business Analyst-ready in[\s\S]*?<\/div>\s*<h1>[\s\S]*?<\/h1>\s*<p class="hero-subline">[\s\S]*?<\/p>\s*<p class="hero-copy">[\s\S]*?<\/p>\s*<div class="hero-actions">[\s\S]*?<\/div>/,
    generateHero(home, settings),
    "homepage hero"
  );
  html = replaceFirst(
    html,
    /<div class="section-head cohort-program-head">[\s\S]*?<div class="cohort-grid">[\s\S]*?<\/div>\s*<\/div>\s*<\/section>/,
    `${generateProgramme(home)}
    </div>
  </section>`,
    "programme grid"
  );
  html = replaceFirst(
    html,
    /<section class="section(?: artefacts-section)?" id="portfolio">[\s\S]*?<\/section>\s*<section class="section" id="steps">|<section class="section" id="steps">/,
    `${generateHomeAssessmentSection(assessment)}

  ${generateArtefactsSection(home)}

  <section class="section" id="steps">`,
    "portfolio artefacts section"
  );
  html = replaceFirst(
    html,
    /<section class="section" id="steps">[\s\S]*?<\/section>\s*<section class="section" id="pricing">/,
    `${generateStepsSection(home)}

  <section class="section" id="pricing">`,
    "process section"
  );
  html = replaceFirst(
    html,
    /<section class="section" id="pricing">[\s\S]*?<\/section>\s*<section class="section" id="proof">/,
    `${generatePricingSection(pricing)}

  <section class="section" id="proof">`,
    "pricing section"
  );
  html = replaceFirst(
    html,
    /<section class="section" id="proof">[\s\S]*?<\/section>\s*<section class="section alt" id="contact">/,
    `${generateTestimonialsSection(testimonials)}

  <section class="section alt" id="contact">`,
    "testimonials"
  );
  html = replaceFirst(
    html,
    /<section class="section alt" id="contact">[\s\S]*?<\/section>\s*<section class="section" id="faq">/,
    `${generateContactSection(home, settings)}

  <section class="section" id="faq">`,
    "contact section"
  );
  html = replaceFirst(
    html,
    /<section class="section" id="faq">[\s\S]*?<\/section>\s*<section class="section alt">\s*<div class="section-inner">\s*<div class="community">/,
    `${generateHomeFaqSection(faqs)}

  <section class="section alt">
    <div class="section-inner">
      <div class="community">`,
    "homepage FAQ section"
  );
  if (!html.includes('assets/assessment.css')) {
    html = html.replace('</head>', '<link rel="stylesheet" href="assets/assessment.css" />\n</head>');
  }
  if (!html.includes('assets/portfolio-experience.css')) {
    html = html.replace('</head>', '<link rel="preload" href="assets/portfolio-experience.css" as="style" onload="this.onload=null;this.rel=\'stylesheet\'" />\n<noscript><link rel="stylesheet" href="assets/portfolio-experience.css" /></noscript>\n</head>');
  }
  if (!html.includes('assets/portfolio-experience.js')) {
    html = html.replace('</body>', '<script src="assets/portfolio-experience.js" defer></script>\n</body>');
  }
  html = html.replace(
    /\n\/\* Compact interactive portfolio lab \*\/[\s\S]*?\n@media\(max-width:360px\)/,
    '\n.visually-hidden{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}\n@media(max-width:360px)'
  );
  html = html.replace(
    /\ndocument\.querySelectorAll\("\.portfolio-lab"\)\.forEach\(lab=>\{[\s\S]*?\n\}\);\nconst navLinks=/,
    "\nconst navLinks="
  );
  html = applyGlobalReplacements(html, settings, "roadmap");
  html = html.replace(/[ \t]+$/gm, "");
  writeFile("index.html", html);
}

function generateAbout(settings, about) {
  const sectionPanels = about.sections
    .map((section) => {
      const panelClass = section.style === "dark" ? "dark-panel" : "panel panel-pad";
      return `<div class="${panelClass}">
        <div class="section-label">${escapeHtml(section.label)}</div>
        <h2>${escapeHtml(section.title)}</h2>
        <p${section.style === "dark" ? "" : ' class="section-copy"'}>${escapeHtml(section.body)}</p>
        ${list(section.points)}
      </div>`;
    })
    .join("\n      ");
  const body = `<main>
  <section class="hero">
    <div class="hero-inner">
      <div class="eyebrow"><span class="leaf-dot" aria-hidden="true"></span>${escapeHtml(about.eyebrow)}</div>
      <h1>${escapeHtml(about.headline)}</h1>
      <p class="hero-copy">${escapeHtml(about.intro)}</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="../index.html#pricing">View premium mentorship</a>
        <a class="btn btn-secondary" href="../assessment/index.html?intro=1">Discover My BA Readiness</a>
      </div>
    </div>
  </section>
  <section class="section">
    <div class="section-inner grid-2">
      ${sectionPanels}
    </div>
  </section>
  <section class="section alt">
    <div class="section-inner">
      <div class="section-head center">
        <div class="section-label">What makes Anderseed different</div>
        <h2>${escapeHtml(about.differenceTitle)}</h2>
        <p class="section-copy">${escapeHtml(about.differenceIntro)}</p>
      </div>
      ${cards(about.differenceCards)}
    </div>
  </section>
  <section class="section">
    <div class="section-inner">
      <div class="section-head center">
        <div class="section-label">Who we help</div>
        <h2>${escapeHtml(about.audienceTitle)}</h2>
        <p class="section-copy">${escapeHtml(about.audienceIntro)}</p>
      </div>
      ${cards(about.audiences)}
    </div>
  </section>
  <section class="section alt">
    <div class="section-inner grid-2">
      <div class="panel panel-pad">
        <div class="section-label">Trust</div>
        <h2>Honest support without false promises.</h2>
        <p class="section-copy">Anderseed does not promise guaranteed jobs, interviews, or salary outcomes. The promise is practical guidance, real effort, structured support, clearer positioning, and a community that helps learners keep moving.</p>
      </div>
      <div class="dark-panel">
        <div class="section-label">Next step</div>
        <h2>Start with clarity.</h2>
        <p>See your BA Readiness Stage and Score, join the free community, or move into the premium mentorship when you are ready for deeper support.</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="../assessment/index.html?intro=1">Discover My BA Readiness</a>
          <a class="btn btn-secondary" href="${escapeAttr(settings.social.telegram)}" target="_blank" rel="noopener">Join free community</a>
        </div>
      </div>
    </div>
  </section>
</main>`;
  const schema = `<script type="application/ld+json">
${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About Anderseed Consulting",
  description: about.seoDescription,
  publisher: {
    "@type": "Organization",
    name: settings.siteName,
    url: settings.siteUrl,
  },
})}
</script>`;
  writeFile(
    "about/index.html",
    pageShell({ title: about.seoTitle, description: about.seoDescription, canonical: "/about/", base: "../", active: "about", body, schema }, settings)
  );
}

function generateFaq(settings, faqs) {
  const items = flattenFaqs(faqs);
  const navLinks = faqs.categories.map((category) => `<a href="#${escapeAttr(category.id)}">${escapeHtml(category.label)}</a>`).join("\n        ");
  const categories = faqs.categories
    .map(
      (category, categoryIndex) => `<section class="faq-category" id="${escapeAttr(category.id)}">
        <div class="section-label">${escapeHtml(category.label)}</div>
        <h2>${escapeHtml(category.title)}</h2>
        <p>${escapeHtml(category.intro)}</p>
        <div class="faq-stack">
          ${category.items
            .map((item, itemIndex) => {
              const open = categoryIndex === 0 && itemIndex === 0 ? " open" : "";
              return `<details class="faq-detail"${open}><summary>${escapeHtml(item.question)}</summary><div>${escapeHtml(item.answer)}</div></details>`;
            })
            .join("\n          ")}
        </div>
      </section>`
    )
    .join("\n\n      ");
  const body = `<main>
  <section class="hero">
    <div class="hero-inner">
      <div class="eyebrow"><span class="leaf-dot" aria-hidden="true"></span>Frequently asked questions</div>
      <h1>Answers before you start your Business Analysis journey.</h1>
      <p class="hero-copy">Use this page to understand the Anderseed mentorship, free BA career assessment, career support, payment options, and what to expect before joining.</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="../index.html#pricing">View premium mentorship</a>
        <a class="btn btn-secondary" href="../assessment/index.html?intro=1">Discover My BA Readiness</a>
      </div>
    </div>
  </section>
  <section class="section">
    <div class="section-inner">
      <nav class="faq-nav" aria-label="FAQ categories">
        ${navLinks}
      </nav>
      ${categories}
      <div class="dark-panel">
        <div class="section-label">Still deciding?</div>
        <h2>Start with your BA Readiness.</h2>
        <p>Use the free assessment to see your current BA Readiness Stage and Score, then receive your FREE BA Career Roadmap by email.</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="../assessment/index.html?intro=1">Discover My BA Readiness</a>
          <a class="btn btn-secondary" href="../index.html#pricing">View premium mentorship</a>
        </div>
      </div>
    </div>
  </section>
</main>`;
  writeFile(
    "faq/index.html",
    pageShell({
      title: "Business Analysis Mentorship FAQs | Anderseed Consulting",
      description: "Detailed answers about Anderseed Business Analysis mentorship for beginners worldwide, recorded sessions, practical projects, career outcomes, payments, refunds, privacy, and support.",
      canonical: "/faq/",
      base: "../",
      active: "faq",
      body,
      schema: faqJsonLd(items),
    }, settings)
  );
}

function generateRoadmapRedirect(settings) {
  writeFile(
    "roadmap/index.html",
    `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="refresh" content="0; url=../assessment/index.html?intro=1" />
<title>BA Readiness Assessment | Anderseed Consulting</title>
<meta name="description" content="Discover your BA Readiness Stage and Score, then receive your FREE BA Career Roadmap by email." />
<link rel="canonical" href="${escapeAttr(settings.siteUrl.replace(/\/$/, ""))}/assessment/" />
<link rel="stylesheet" href="../assets/landing-pages.css" />
<link rel="icon" type="image/svg+xml" href="${favicon}" />
</head>
<body>
<main class="section">
  <div class="section-inner center">
    <div class="section-label">Free BA assessment</div>
    <h1>Opening the BA Readiness Assessment.</h1>
    <p class="section-copy">Your personalised assessment is opening now.</p>
    <a class="btn btn-primary" href="../assessment/index.html?intro=1">Discover My BA Readiness</a>
  </div>
</main>
</body>
</html>`
  );
}

function generateAssessment(settings, assessment, scoringConfig) {
  const headline = escapeHtml(assessment.headline).replace("Business Analysis", "<span>Business Analysis</span>");
  const assessmentSettings = settings.assessment || {};
  const programmeUrl = assessmentSettings.programmeUrl || "https://anderseedconsulting.co.uk/#pricing";
  const telegramUrl = settings.social?.telegram || "https://t.me/anderseedconsulting";
  const configJson = JSON.stringify({
    schemaVersion: assessment.schemaVersion,
    questions: assessment.questions,
    scoring: scoringConfig,
    endpoints: {
      complete: assessmentSettings.completionEndpoint,
      contact: assessmentSettings.contactEndpoint,
      events: assessmentSettings.eventEndpoint,
    },
    progressTtlHours: assessmentSettings.progressTtlHours || 24,
    marketingConsentTextVersion: assessmentSettings.marketingConsentTextVersion,
  }).replaceAll("<", "\\u003c");
  const assurances = assessment.assurances.map((item) => `<span>${escapeHtml(item)}</span>`).join("");
  const lockedOutputs = assessment.gate.lockedOutputs.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n          ");
  const growthIcons = assessmentGrowthIcons();
  const body = `<main class="assessment-page" data-assessment-app>
  <section class="assessment-view" data-assessment-landing hidden>
    <div class="assessment-landing-inner assessment-start-inner">
      <div class="assessment-start-card">
        <div class="assessment-landing-copy">
          <div class="eyebrow"><span class="leaf-dot" aria-hidden="true"></span>${escapeHtml(assessment.eyebrow)}</div>
          <h1 id="assessmentLandingTitle" tabindex="-1">${headline}</h1>
          <p>${escapeHtml(assessment.intro)}</p>
          <button class="btn btn-primary" type="button" data-start-assessment>${escapeHtml(assessment.primaryButtonLabel)} <span aria-hidden="true">→</span></button>
          <div class="assessment-meta"><span>${escapeHtml(assessment.timeLabel)}</span></div>
          <div class="assessment-assurances" aria-label="Assessment details">${assurances}</div>
          <p class="assessment-delivery-note">First name and email are requested only after Question 8.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="assessment-view" data-question-view hidden>
    <div class="assessment-workspace">
      <div class="assessment-shell">
        <aside class="assessment-progress-rail">
          <div class="assessment-progress-head"><span data-progress-text>Question 1 of 8</span><span>Your Growth Profile</span></div>
          <div class="assessment-progress" role="progressbar" aria-label="Assessment progress" aria-valuemin="1" aria-valuenow="1" aria-valuemax="8"><span data-progress-bar></span></div>
          <div class="assessment-growth" data-growth-progress>
            ${growthIcons}
            <p data-growth-copy>Your Growth Profile is beginning to take shape.</p>
          </div>
        </aside>
        <div class="assessment-question-panel">
          <p class="assessment-resume-status" data-resume-status role="status" aria-live="polite" hidden></p>
          <div class="assessment-micro-reveal" data-micro-reveal role="status" aria-live="polite" hidden></div>
          <div data-question-host></div>
          <p class="assessment-status" data-assessment-status role="alert" hidden></p>
          <div class="assessment-actions">
            <button class="btn btn-secondary" type="button" data-back>Back</button>
            <button class="btn btn-primary" type="button" data-next disabled>Next Question</button>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="assessment-view" data-completion-view hidden aria-labelledby="assessmentCompletionTitle">
    <div class="assessment-workspace post-survey-workspace">
      <article class="assessment-complete-card">
        <div class="post-survey-brand"><span aria-hidden="true">◆</span> Anderseed</div>
        <div class="assessment-complete-body">
          <h1 id="assessmentCompletionTitle" tabindex="-1">Assessment Complete!</h1>
          <div class="assessment-complete-art">${assessmentSproutArt("assessment-complete-sprout")}</div>
          <p>Great work! You’ve answered all 8 questions.</p>
          <strong>Your Anderseed Growth Profile is ready.</strong>
        </div>
        <div class="assessment-complete-action">
          <p class="assessment-complete-status" data-completion-status role="status" aria-live="polite">Preparing your secure result…</p>
          <button class="btn btn-primary" type="button" data-completion-continue disabled>Preparing Your Result…</button>
        </div>
      </article>
    </div>
  </section>

  <section class="assessment-view" data-gate-view hidden>
    <div class="assessment-workspace post-survey-workspace">
      <div class="assessment-shell assessment-gate">
        <div class="assessment-gate-intro">
          <div class="post-survey-brand"><span aria-hidden="true">◆</span> Anderseed</div>
          <span class="assessment-form-kicker">See your result</span>
          <h1>${escapeHtml(assessment.gate.heading)}</h1>
          <p>${escapeHtml(assessment.gate.intro)}</p>
        </div>
        <div class="assessment-gate-form-sheet">
          <p class="assessment-resume-status" data-gate-resume-status role="status" aria-live="polite" hidden></p>
          <form class="assessment-lead-form" data-lead-form novalidate>
            <label class="assessment-field" for="assessmentFirstName">First name <span aria-hidden="true">*</span>
              <input id="assessmentFirstName" name="firstName" type="text" autocomplete="given-name" required maxlength="80" placeholder="Enter your first name" />
            </label>
            <label class="assessment-field" for="assessmentEmail">Email address <span aria-hidden="true">*</span>
              <input id="assessmentEmail" name="email" type="email" autocomplete="email" inputmode="email" required maxlength="254" placeholder="Enter your email address" />
            </label>
            <label class="assessment-marketing" for="assessmentMarketing">
              <input id="assessmentMarketing" name="marketingOptIn" value="yes" type="checkbox" />
              <span>Yes — email me practical BA career tips, portfolio advice, Anderseed programme updates and occasional offers. Unsubscribe anytime.</span>
            </label>
            <p class="assessment-privacy-link"><a href="../privacy/index.html" target="_blank" rel="noopener">Privacy Notice</a></p>
            <p class="assessment-storage-status" data-storage-status role="alert" hidden></p>
            <button class="btn btn-primary" type="submit">${escapeHtml(assessment.gate.buttonLabel)}</button>
          </form>
          <div class="assessment-gate-benefits-wrap">
            <span>Here’s what you’ll receive:</span>
            <ul class="assessment-gate-benefits" aria-label="What you will receive">
              ${lockedOutputs}
            </ul>
          </div>
          <button class="assessment-gate-back" type="button" data-gate-back>Back to my answers</button>
        </div>
      </div>
    </div>
  </section>

  <section class="assessment-view" data-result-view hidden role="region" aria-labelledby="assessmentResultTitle">
    <div class="assessment-result-wrap post-survey-result-wrap">
      <section class="result-ready-card" aria-label="Your BA Readiness result">
        <div class="post-survey-brand result-card-brand"><span aria-hidden="true">◆</span> Anderseed</div>
        <div class="result-score-panel">
          <div class="result-stage-summary">
            <small>Your BA Readiness Stage</small>
            <strong data-result-stage></strong>
            <div class="result-score-summary" data-result-score-wrap aria-label="BA Readiness Score">
              <small>BA Readiness Score</small>
              <div><strong data-result-score></strong><span>/100</span></div>
              <div class="result-score-scale" aria-hidden="true"><i></i></div>
            </div>
          </div>
          <div class="result-stage-art">${assessmentSproutArt("result-stage-plant")}</div>
        </div>
        <div class="result-profile-content">
          <header class="result-profile-intro">
            <span class="bridge-card-kicker">Your personalised result</span>
            <h1 id="assessmentResultTitle" data-result-title tabindex="-1"></h1>
            <p data-result-explanation></p>
          </header>

          <div class="result-personalised-grid">
            <article class="result-personalised-card result-strength-card">
              <span class="result-personalised-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3a5 5 0 0 0-4.8 3.6A4.5 4.5 0 0 0 6 15.4 5 5 0 0 0 15.8 17a4.5 4.5 0 0 0 1-8.7A5 5 0 0 0 12 3Z"/><path d="M9 8.5c1 1 1 2.2.2 3.4m5.8-4c-1 1.1-1.1 2.3-.3 3.5M8.5 15c1.2-.4 2.3 0 3 1m4-1.5c-1.2-.2-2.2.3-2.7 1.3M12 5v14"/></svg></span>
              <div><span>Strongest Area</span><h2 data-result-strength-label></h2><p data-result-strength></p></div>
            </article>
            <article class="result-personalised-card result-growth-card">
              <span class="result-personalised-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="m14.8 9.2 5.1-5.1m-2.8 0h2.8v2.8"/></svg></span>
              <div><span>Primary Growth Area</span><h2 data-result-growth-label></h2><p data-result-gap></p></div>
            </article>
          </div>

          <section class="result-breakdown-panel" aria-labelledby="resultBreakdownTitle">
            <div class="result-breakdown-heading"><span>How your score is built</span><h2 id="resultBreakdownTitle">Your BA Readiness Breakdown</h2></div>
            <div class="result-breakdown-grid" data-result-dimensions></div>
          </section>

          <aside class="result-roadmap-next">
            <span class="result-email-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg></span>
            <div><span>Your next move</span><strong>Use your FREE BA Career Roadmap.</strong><p>It will be sent to the email address you provided, with practical steps to help you act on this result.</p></div>
          </aside>
        </div>
      </section>

      <section class="result-bridge" aria-labelledby="anderseedBridgeTitle">
        <div class="result-bridge-heading">
          <span>How Anderseed bridges the gap</span>
          <h2 id="anderseedBridgeTitle">How Anderseed Supports Your Journey</h2>
          <p>Wherever you are starting from, the Anderseed BA Career Journey helps connect what you already know, strengthen what is still missing and turn it into evidence employers can understand.</p>
        </div>
        <div class="result-bridge-grid">
          <article class="anderseed-journey-card">
            <span class="bridge-card-kicker">One connected journey</span>
            <div class="journey-parts">
              <div class="journey-part">
                <span class="journey-part-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4m8-4v4M3 10h18"/></svg></span>
                <div><strong>8-Week Live Mentorship Cohort</strong><p>Live sessions, feedback, community and structured guidance to build your BA capability and confidence.</p></div>
              </div>
              <span class="journey-plus" aria-hidden="true">+</span>
              <div class="journey-part">
                <span class="journey-part-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3m-4 4v5m-3-2h6"/></svg></span>
                <div><strong>4-Week Guided Portfolio Project</strong><p>Guided workplace-style BA practice that helps you build a connected project story you can reference with confidence.</p></div>
              </div>
            </div>
            <div class="journey-summary"><strong>12-Week Anderseed BA Career Journey</strong><p>Bring what you already know. Anderseed helps connect it, strengthen what’s still missing and turn it into evidence employers understand.</p></div>
            <a class="btn btn-primary programme-pricing-cta" href="${escapeAttr(programmeUrl)}" data-programme-cta>Explore The Programme &amp; Pricing →</a>
          </article>

          <div class="result-bridge-side">
            <article class="portfolio-journey-card">
              <span class="bridge-card-kicker">Your Portfolio Project Journey</span>
              <h3>Turn Learning Into Career-Ready Evidence</h3>
              <div class="portfolio-lifecycle" aria-label="Discovery, Requirements, Design, Test and Deploy">
                <div class="portfolio-lifecycle-step"><span aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></svg></span><strong>Discovery</strong></div>
                <div class="portfolio-lifecycle-step"><span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 2h9l4 4v16H6z"/><path d="M14 2v5h5M9 12h7M9 16h7"/></svg></span><strong>Requirements</strong></div>
                <div class="portfolio-lifecycle-step"><span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m4 20 4.5-1 10-10-3.5-3.5-10 10zM13.5 7l3.5 3.5"/></svg></span><strong>Design</strong></div>
                <div class="portfolio-lifecycle-step"><span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg></span><strong>Test</strong></div>
                <div class="portfolio-lifecycle-step"><span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 18H5a3 3 0 0 1 0-6 7 7 0 0 1 13.6-2A4 4 0 0 1 19 18h-2"/><path d="m12 12 4 4m-4-4-4 4m4-4v10"/></svg></span><strong>Deploy</strong></div>
              </div>
              <p>Turn BA learning into evidence you can show, explain and defend.</p>
              <p>Build a connected BA project story you can reference on your CV, use in applications and talk through confidently in interviews.</p>
              <div class="portfolio-career-chain" aria-label="Portfolio to CV to applications to interviews"><span>Portfolio</span><i>→</i><span>CV</span><i>→</i><span>Applications</span><i>→</i><span>Interviews</span></div>
            </article>

            <article class="result-community-card">
              <div><span class="bridge-card-kicker">Want to stay connected?</span><h3>Join the Free BA Community</h3><p>Practical tips, resources and peer support on your BA career journey.</p><a href="${escapeAttr(telegramUrl)}" target="_blank" rel="noopener">Join the Free BA Community →</a></div>
              <span class="result-telegram-icon" aria-hidden="true">${socialIconMap.telegram}</span>
            </article>
          </div>
        </div>
        <aside class="result-next-strip">
          <span aria-hidden="true">i</span>
          <div><strong>What happens next?</strong><p>Your FREE BA Career Roadmap will be sent to the email you provided.</p><p>You’ll only receive ongoing BA career tips and programme updates if you chose to opt in.</p></div>
        </aside>
      </section>

      <button class="result-restart" type="button" data-restart>Retake the assessment</button>
      <p class="assessment-disclaimer">This assessment is a practical career-guidance tool based on your answers. It is not a psychometric test and does not determine whether you can become a Business Analyst.</p>
    </div>
  </section>

  <dialog class="assessment-exit-dialog" data-exit-dialog aria-labelledby="assessmentExitTitle" aria-describedby="assessmentExitMessage assessmentExitStorage">
    <div class="assessment-exit-panel">
      <span class="assessment-exit-kicker">Your progress matters</span>
      <h2 id="assessmentExitTitle" data-exit-title>Leave before seeing your result?</h2>
      <p id="assessmentExitMessage" data-exit-message>You have not reached your personalised result yet.</p>
      <p class="assessment-exit-storage" id="assessmentExitStorage" data-exit-storage>Your place and answers will be saved on this device for 24 hours.</p>
      <div class="assessment-exit-actions">
        <button class="btn btn-primary" type="button" data-exit-continue>Continue My Assessment</button>
        <button class="assessment-exit-confirm" type="button" data-exit-confirm>Leave &amp; Save My Progress</button>
      </div>
    </div>
  </dialog>
  <noscript><div class="assessment-workspace"><div class="assessment-shell">Please enable JavaScript to complete the BA Readiness Assessment.</div></div></noscript>
  <script id="assessment-config" type="application/json">${configJson}</script>
  <script src="../assets/assessment-scoring.js"></script>
  <script src="../assets/assessment.js"></script>
</main>`;

  writeFile(
    "assessment/index.html",
    pageShell({
      title: assessment.seoTitle,
      description: assessment.seoDescription,
      canonical: "/assessment/",
      base: "../",
      active: "assessment",
      body,
      schema: '<link rel="stylesheet" href="../assets/assessment.css" />',
      focused: true,
    }, settings)
  );
}

function parseFrontMatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { data: {}, body: content };
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const item = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!item) continue;
    const key = item[1];
    let value = item[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (value === "true") data[key] = true;
    else if (value === "false") data[key] = false;
    else data[key] = value;
  }
  return { data, body: content.slice(match[0].length) };
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  let html = "";
  let paragraph = [];
  let inList = false;
  const flushParagraph = () => {
    if (!paragraph.length) return;
    html += `<p>${escapeHtml(paragraph.join(" "))}</p>\n`;
    paragraph = [];
  };
  const closeList = () => {
    if (!inList) return;
    html += "</ul>\n";
    inList = false;
  };
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }
    if (trimmed.startsWith("## ")) {
      flushParagraph();
      closeList();
      html += `<h2>${escapeHtml(trimmed.slice(3))}</h2>\n`;
      continue;
    }
    if (trimmed.startsWith("- ")) {
      flushParagraph();
      if (!inList) {
        html += "<ul>\n";
        inList = true;
      }
      html += `<li>${escapeHtml(trimmed.slice(2))}</li>\n`;
      continue;
    }
    closeList();
    paragraph.push(trimmed);
  }
  flushParagraph();
  closeList();
  return html;
}

function readPosts() {
  const blogDir = path.join(root, "content/blog");
  return fs
    .readdirSync(blogDir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const source = fs.readFileSync(path.join(blogDir, file), "utf8");
      const { data, body } = parseFrontMatter(source);
      return {
        slug: file.replace(/\.md$/, ""),
        title: data.title || file.replace(/\.md$/, ""),
        description: data.description || "",
        category: data.category || "Business Analysis",
        date: data.date || "",
        draft: Boolean(data.draft),
        body,
      };
    })
    .filter((post) => !post.draft)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function generateBlogIndex(settings, posts, blogPage) {
  const postCards = posts
    .map(
      (post) => `<article class="post-card">
          <div class="post-image"><span>${escapeHtml(post.category)}</span></div>
          <div class="post-content">
            <span class="meta">${escapeHtml(post.category)}</span>
            <h3>${escapeHtml(post.title)}</h3>
            <p>${escapeHtml(post.description)}</p>
            <a class="read-link" href="${escapeAttr(post.slug)}/index.html">Read article</a>
          </div>
        </article>`
    )
    .join("\n        ");
  const categoryCounts = posts.reduce((acc, post) => {
    acc[post.category] = (acc[post.category] || 0) + 1;
    return acc;
  }, {});
  const categoryList = Object.entries(categoryCounts)
    .map(([category, count]) => `<li><a href="index.html"><span>${escapeHtml(category)}</span><span>${count}</span></a></li>`)
    .join("\n            ");
  const body = `<main>
  <section class="hero">
    <div class="hero-inner">
      <div class="eyebrow"><span class="leaf-dot" aria-hidden="true"></span>${escapeHtml(blogPage.eyebrow)}</div>
      <h1>${escapeHtml(blogPage.headline)} <span>${escapeHtml(blogPage.headlineHighlight)}</span></h1>
      <p class="hero-copy">${escapeHtml(blogPage.intro)}</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="../assessment/index.html?intro=1">${escapeHtml(blogPage.primaryButtonLabel)}</a>
        <a class="btn btn-secondary" href="../index.html#pricing">${escapeHtml(blogPage.secondaryButtonLabel)}</a>
      </div>
    </div>
  </section>
  <section class="section">
    <div class="section-inner article-wrap">
      <div>
        <div class="section-head">
          <div class="section-label">${escapeHtml(blogPage.latestLabel)}</div>
          <h2>${escapeHtml(blogPage.latestTitle)}</h2>
          <p class="section-copy">${escapeHtml(blogPage.latestIntro)}</p>
        </div>
        <div class="post-grid">
        ${postCards}
        </div>
      </div>
      <aside class="sidebar">
        <div class="sidebar-card">
          <h3>${escapeHtml(blogPage.topicsTitle)}</h3>
          <ul class="topic-list">
            ${categoryList}
          </ul>
        </div>
        <div class="dark-panel">
          <div class="section-label">${escapeHtml(blogPage.resourceLabel)}</div>
          <h2>${escapeHtml(blogPage.resourceTitle)}</h2>
          <p>${escapeHtml(blogPage.resourceText)}</p>
          <a class="btn btn-primary" href="../assessment/index.html?intro=1">${escapeHtml(blogPage.resourceButtonLabel)}</a>
        </div>
        <div class="sidebar-card">
          <h3>${escapeHtml(blogPage.communityTitle)}</h3>
          <p>${escapeHtml(blogPage.communityText)}</p>
          <a class="btn btn-secondary" href="${escapeAttr(settings.social.telegram)}" target="_blank" rel="noopener">${escapeHtml(blogPage.communityButtonLabel)}</a>
        </div>
      </aside>
    </div>
  </section>
</main>`;
  writeFile(
    "blog/index.html",
    pageShell({
      title: blogPage.seoTitle,
      description: blogPage.seoDescription,
      canonical: "/blog/",
      base: "../",
      active: "blog",
      body,
      schema: `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "Blog", name: blogPage.eyebrow, description: blogPage.seoDescription, publisher: { "@type": "Organization", name: settings.siteName } })}</script>`,
    }, settings)
  );
}

function generateBlogPosts(settings, posts) {
  for (const post of posts) {
    const body = `<main>
  <section class="hero">
    <div class="hero-inner">
      <div class="eyebrow"><span class="leaf-dot" aria-hidden="true"></span>${escapeHtml(post.category)}</div>
      <h1>${escapeHtml(post.title)}</h1>
      <p class="hero-copy">${escapeHtml(post.description)}</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="../../assessment/index.html?intro=1">Discover My BA Readiness</a>
        <a class="btn btn-secondary" href="../../index.html#pricing">View mentorship</a>
      </div>
    </div>
  </section>
  <section class="section">
    <div class="section-inner article-wrap">
      <article class="article">
        ${markdownToHtml(post.body)}
      </article>
      <aside class="sidebar">
        <div class="dark-panel">
          <div class="section-label">Free assessment</div>
          <h2>Discover your BA Readiness</h2>
          <p>Discover your BA Readiness Stage and Score, then receive your FREE BA Career Roadmap by email.</p>
          <a class="btn btn-primary" href="../../assessment/index.html?intro=1">Discover My BA Readiness</a>
        </div>
        <div class="sidebar-card">
          <h3>Need guided support?</h3>
          <p>Move from reading to practical mentorship, live project practice, CV support, and interview confidence.</p>
          <a class="btn btn-secondary" href="../../index.html#pricing">View mentorship</a>
        </div>
      </aside>
    </div>
  </section>
</main>`;
    writeFile(
      `blog/${post.slug}/index.html`,
      pageShell({
        title: `${post.title} | Anderseed Consulting`,
        description: post.description,
        canonical: `/blog/${post.slug}/`,
        base: "../../",
        active: "blog",
        body,
        schema: `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title, description: post.description, datePublished: post.date, publisher: { "@type": "Organization", name: settings.siteName } })}</script>`,
      }, settings)
    );
  }
}

function renderLegalSections(sections = []) {
  return sections
    .map((section) => {
      const paragraphs = (section.paragraphs || [])
        .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
        .join("\n      ");
      const bullets = (section.bullets || []).length
        ? `<ul>\n${section.bullets.map((bullet) => `        <li>${escapeHtml(bullet)}</li>`).join("\n")}\n      </ul>`
        : "";
      const links = (section.links || [])
        .map((link) => {
          const external = /^https?:\/\//i.test(link.href || "");
          return `<p><a href="${escapeAttr(link.href)}"${external ? ' target="_blank" rel="noopener"' : ""}>${escapeHtml(link.label)}</a></p>`;
        })
        .join("\n      ");
      const content = [paragraphs, bullets, links].filter(Boolean).join("\n      ");
      return `<h2>${escapeHtml(section.title)}</h2>
      ${content}`;
    })
    .join("\n      ");
}

function generateLegalPage(settings, page, { output, canonical }) {
  const body = `<main>
  <section class="hero">
    <div class="hero-inner">
      <div class="eyebrow"><span class="leaf-dot" aria-hidden="true"></span>${escapeHtml(page.eyebrow)}</div>
      <h1>${escapeHtml(page.headline)}</h1>
      <p class="hero-copy">${escapeHtml(page.intro)}</p>
    </div>
  </section>
  <section class="section">
    <div class="legal">
      <p><strong>Last updated:</strong> ${escapeHtml(page.lastUpdated)}. ${escapeHtml(page.reviewNotice)}</p>
      ${renderLegalSections(page.sections)}
    </div>
  </section>
</main>`;

  writeFile(
    output,
    pageShell({
      title: page.seoTitle,
      description: page.seoDescription,
      canonical,
      base: "../",
      active: "",
      body,
    }, settings)
  );
}

function updateCheckout(settings) {
  const file = path.join(dist, "checkout/index.html");
  if (!fs.existsSync(file)) return;
  const html = applyGlobalReplacements(fs.readFileSync(file, "utf8"), settings, "application");
  writeFile("checkout/index.html", html);
}

function main() {
  const settings = readJson("content/settings.json");
  const home = readJson("content/pages/homepage.json");
  const pricing = readJson("content/pages/pricing.json");
  const testimonials = readJson("content/pages/testimonials.json");
  const faqs = readJson("content/pages/faqs.json");
  const about = readJson("content/pages/about.json");
  const assessment = readJson("content/pages/assessment.json");
  const assessmentScoring = readJson("content/assessment-scoring.json");
  const blogPage = readJson("content/pages/blog.json");
  const terms = readJson("content/pages/terms.json");
  const privacy = readJson("content/pages/privacy.json");
  const posts = readPosts();

  cleanDist();
  copyDir(root, dist);
  updateHomepage(settings, home, pricing, testimonials, faqs, assessment);
  generateAbout(settings, about);
  generateFaq(settings, faqs);
  generateAssessment(settings, assessment, assessmentScoring);
  generateRoadmapRedirect(settings);
  generateBlogIndex(settings, posts, blogPage);
  generateBlogPosts(settings, posts);
  generateLegalPage(settings, terms, { output: "terms/index.html", canonical: "/terms/" });
  generateLegalPage(settings, privacy, { output: "privacy/index.html", canonical: "/privacy/" });
  updateCheckout(settings);

  console.log(`Built Anderseed site into ${path.relative(root, dist)}`);
}

main();
