const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

const favicon =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='30' fill='%23318A6E'/%3E%3Cpath d='M32 46 L32 24 M32 33 C24 26 20 18 26 13 C30 19 31 26 32 33 Z M32 29 C40 21 46 15 43 8 C37 14 34 21 32 29 Z' stroke='white' stroke-width='2.5' fill='white'/%3E%3C/svg%3E";

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeFile(relativePath, content) {
  const target = path.join(dist, relativePath);
  ensureDir(target);
  fs.writeFileSync(target, content, "utf8");
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
      ["content", "dist", "roadmap", "scripts", "node_modules", ".git", "README.md", "package.json", "package-lock.json", "netlify.toml"].includes(entry.name)
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

function logo(base = "") {
  return `<a class="logo" href="${base}index.html" aria-label="Anderseed Consulting home"><img src="${base}assets/anderseed-logo-header.png" alt="Anderseed Consulting" width="642" height="220" /></a>`;
}

function navigationItems(base = "") {
  return [
    ["Home", `${base}index.html`, "home"],
    ["About", `${base}about/index.html`, "about"],
    ["Pricing", `${base}index.html#pricing`, "pricing"],
    ["Free Roadmap", `${base}index.html#roadmap-landing`, "roadmap"],
    ["Portfolio", `${base}index.html#portfolio`, "portfolio"],
    ["Blog", `${base}blog/index.html`, "blog"],
    ["FAQ", `${base}faq/index.html`, "faq"],
    ["Contact Us", `${base}index.html#contact`, "contact"],
  ];
}

function navigationLink(label, href, key, active) {
  const current = active === key;
  return `<a${current ? ' class="active" aria-current="page"' : ""} href="${href}">${label}</a>`;
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
  };
  button.addEventListener("click", () => setOpen(button.getAttribute("aria-expanded") !== "true"));
  panel.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setOpen(false)));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && button.getAttribute("aria-expanded") === "true") {
      setOpen(false);
      button.focus();
    }
  });
  document.addEventListener("click", (event) => {
    if (button.getAttribute("aria-expanded") === "true" && !event.target.closest(".nav-inner")) setOpen(false);
  });
})();
</script>`;
}

function footer(base = "", settings) {
  return `<footer class="footer">
  <div class="footer-inner">
    <div><strong>${escapeHtml(settings.siteName)}</strong><p>${escapeHtml(settings.footerTagline)}</p></div>
    <div class="footer-links"><a href="${base}about/index.html">About</a><a href="${base}blog/index.html">Blog</a><a href="${base}index.html#roadmap-landing">Free Roadmap</a><a href="${base}faq/index.html">FAQ</a><a href="${base}privacy/index.html">Privacy</a><a href="${base}terms/index.html">Terms</a></div>
  </div>
</footer>`;
}

function telegramFloat(settings) {
  return `<a class="tg-float" href="${escapeAttr(settings.social.telegram)}" target="_blank" rel="noopener" aria-label="Join the free Anderseed Telegram community">
  <span class="tg-label">Join free BA community</span>
  <span class="tg-button" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M27.6 5.1 3.9 14.2c-1.6.6-1.6 1.5-.3 1.9l6.1 1.9 2.3 7.1c.3.9.2 1.3 1 1.3.7 0 1-.3 1.4-.7l3.4-3.3 7 5.2c1.3.7 2.2.3 2.5-1.2L31.8 7c.5-1.8-.7-2.6-2.1-2Zm-3.8 5.5L12.4 20.8l-.4 4.1-2.3-7.1 14.6-9.2c.6-.4 1.1-.2.5.4Z"/></svg></span>
</a>`;
}

function pageShell({ title, description, canonical, base, active, body, schema = "" }, settings) {
  const accessibleBody = body.replace(/<main(?![^>]*\bid=)/, '<main id="main"');
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
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="nav">
  <div class="nav-inner">
    ${logo(base)}
    ${nav(base, active)}
    ${mobileNav(base, active)}
  </div>
</header>
${accessibleBody}
${footer(base, settings)}
${telegramFloat(settings)}
${mobileNavScript()}
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
    .replaceAll("https://YOUR-KLARNA-CHECKOUT-LINK", settings.forms.klarnaCheckoutUrl)
    .replaceAll("Anderseed Consulting Ltd", settings.bank.payeeName)
    .replaceAll("Mettle Business Account", settings.bank.bankName)
    .replaceAll("04-03-33", settings.bank.sortCode)
    .replaceAll("69499865", settings.bank.accountNumber)
    .replaceAll("Your full name + BA Mentorship", settings.bank.reference);
}

function generateHero(home, settings) {
  const hero = home.hero;
  const subline = escapeHtml(hero.subline).replace("grow.", "<span>grow.</span>");
  return `<div class="eyebrow"><span class="leaf-dot" aria-hidden="true"></span>${escapeHtml(hero.eyebrowText)} <strong>${escapeHtml(hero.eyebrowHighlight)}</strong><a class="eyebrow-link" href="#steps" aria-label="See the 90-day Business Analysis journey">${escapeHtml(hero.journeyButtonLabel)} &rarr;</a></div>
          <h1>${escapeHtml(hero.headlinePrefix)} <span class="gold-text">${escapeHtml(hero.headlineHighlight)}</span></h1>
          <p class="hero-subline">${subline}</p>
          <p class="hero-copy">${escapeHtml(hero.body)}</p>
          <div class="hero-actions">
            <a class="btn btn-secondary" href="${escapeAttr(hero.secondaryButtonUrl)}">${escapeHtml(hero.secondaryButtonLabel)}</a>
            <a class="btn btn-primary" href="${escapeAttr(hero.primaryButtonUrl)}">${escapeHtml(hero.primaryButtonLabel)}</a>
            <a class="btn btn-secondary" href="${escapeAttr(settings.social.telegram)}" target="_blank" rel="noopener">${escapeHtml(hero.communityButtonLabel)}</a>
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

function renderArtefactVisual(type = "") {
  if (type === "process") {
    return `<div class="artefact-visual process-output" aria-hidden="true">
            <div class="output-title">BPMN 2.0 process map</div>
            <svg class="artefact-svg process-svg-v5" viewBox="0 0 420 220" preserveAspectRatio="xMidYMid meet" shape-rendering="geometricPrecision" role="img" aria-label="BPMN process map preview">
              <defs>
                <marker id="process-v5-arrow" markerUnits="userSpaceOnUse" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#45514c"></path>
                </marker>
              </defs>
              <rect x="1" y="1" width="418" height="218" rx="12" class="svg-v5-board"></rect>
              <path d="M1 110 H419" class="svg-v5-divider"></path>
              <path d="M64 1 V219" class="svg-v5-divider"></path>
              <rect x="1" y="1" width="63" height="109" rx="12" class="svg-v5-lane-bg sales"></rect>
              <rect x="1" y="111" width="63" height="108" rx="12" class="svg-v5-lane-bg manager"></rect>
              <text x="32" y="58" text-anchor="middle" class="svg-v5-lane">Sales</text>
              <text x="32" y="168" text-anchor="middle" class="svg-v5-lane">Manager</text>

              <circle cx="92" cy="55" r="14" class="svg-v5-start"></circle>
              <text x="92" y="83" text-anchor="middle" class="svg-v5-note">Start</text>

              <rect x="122" y="38" width="76" height="34" rx="7" class="svg-v5-task"></rect>
              <text x="160" y="52" text-anchor="middle" class="svg-v5-task-text">Capture</text>
              <text x="160" y="64" text-anchor="middle" class="svg-v5-task-text">request</text>

              <rect x="122" y="148" width="76" height="34" rx="7" class="svg-v5-task"></rect>
              <text x="160" y="162" text-anchor="middle" class="svg-v5-task-text">Review</text>
              <text x="160" y="174" text-anchor="middle" class="svg-v5-task-text">request</text>

              <polygon points="246,141 270,165 246,189 222,165" class="svg-v5-gateway"></polygon>
              <text x="246" y="162" text-anchor="middle" class="svg-v5-gateway-text">Approve?</text>
              <text x="246" y="173" text-anchor="middle" class="svg-v5-gateway-text">Yes / No</text>

              <rect x="292" y="38" width="74" height="34" rx="7" class="svg-v5-task"></rect>
              <text x="329" y="52" text-anchor="middle" class="svg-v5-task-text">Update</text>
              <text x="329" y="64" text-anchor="middle" class="svg-v5-task-text">CRM</text>

              <circle cx="396" cy="55" r="14" class="svg-v5-end"></circle>
              <text x="396" y="83" text-anchor="middle" class="svg-v5-note">Complete</text>
              <circle cx="396" cy="165" r="14" class="svg-v5-end rejected"></circle>
              <text x="396" y="193" text-anchor="middle" class="svg-v5-note">Rejected</text>

              <path class="svg-v5-arrow" d="M106 55 H122"></path>
              <path class="svg-v5-arrow" d="M160 72 V148"></path>
              <path class="svg-v5-arrow" d="M198 165 H222"></path>
              <path class="svg-v5-arrow" d="M246 141 V55 H292"></path>
              <path class="svg-v5-arrow" d="M366 55 H382"></path>
              <path class="svg-v5-arrow" d="M270 165 H382"></path>
              <text x="255" y="97" class="svg-v5-path-label">YES</text>
              <text x="316" y="157" class="svg-v5-path-label">NO</text>
            </svg>
          </div>`;
  }
  if (type === "requirements" || type === "stories") {
    return `<div class="artefact-visual requirements-output" aria-hidden="true">
            <div class="output-title">User story + acceptance criteria</div>
            <div class="story-output-card">
              <strong>User story</strong>
              <p>As a sales manager, I want to view live pipeline status so I can follow up with the right opportunities.</p>
            </div>
            <div class="acceptance-output-card">
              <strong>Acceptance criteria</strong>
              <span>User can filter pipeline by stage and owner</span>
              <span>Dashboard updates when opportunity status changes</span>
              <span>Only authorised users can view revenue values</span>
            </div>
            <div class="requirements-footer"><b>BRD</b><span>Scope</span><span>Business rules</span><span>Sign-off</span></div>
          </div>`;
  }
  if (type === "prototype") {
    return `<div class="artefact-visual prototype-output" aria-hidden="true">
            <div class="output-title">Prototype walkthrough</div>
            <div class="prototype-output-grid">
              <div class="prototype-window">
                <div class="prototype-sidebar"><span></span><span></span><span></span><small>CRM</small></div>
                <div class="prototype-canvas">
                  <div class="metric-card primary"><b>£48k</b><span>Pipeline</span></div><div class="metric-card"><b>18</b><span>Deals</span></div>
                  <div class="prototype-chart"><i></i><i></i><i></i><i></i></div>
                  <div class="prototype-table"><span></span><span></span><span></span></div>
                </div>
              </div>
              <div class="walkthrough-panel">
                <strong>Interview story</strong>
                <span>Problem</span><span>Decision</span><span>Outcome</span>
              </div>
            </div>
          </div>`;
  }
  return `<div class="artefact-visual stakeholder-output" aria-hidden="true">
          <div class="output-title">Stakeholder analysis output</div>
          <svg class="artefact-svg stakeholder-svg-v5" viewBox="0 0 420 220" preserveAspectRatio="xMidYMid meet" shape-rendering="geometricPrecision" role="img" aria-label="Stakeholder analysis preview">
            <rect x="1" y="1" width="418" height="218" rx="12" class="svg-v5-board"></rect>
            <rect x="10" y="10" width="250" height="200" rx="10" class="svg-v5-panel"></rect>
            <text x="24" y="35" class="svg-v5-title">Power / interest grid</text>
            <rect x="24" y="50" width="222" height="142" rx="7" class="svg-v5-matrix"></rect>
            <path d="M135 50 V192 M24 121 H246" class="svg-v5-grid-line"></path>
            <text x="151" y="64" class="svg-v5-axis-label">HIGH INFLUENCE</text>
            <text x="155" y="187" class="svg-v5-axis-label">HIGH INTEREST</text>

            <rect x="42" y="72" width="72" height="26" rx="13" class="svg-v5-chip it"></rect>
            <text x="78" y="89" text-anchor="middle" class="svg-v5-chip-text">IT</text>
            <rect x="152" y="72" width="88" height="26" rx="13" class="svg-v5-chip sponsor"></rect>
            <text x="196" y="89" text-anchor="middle" class="svg-v5-chip-text">Sponsor</text>
            <rect x="42" y="145" width="72" height="26" rx="13" class="svg-v5-chip users"></rect>
            <text x="78" y="162" text-anchor="middle" class="svg-v5-chip-text">Users</text>
            <rect x="148" y="145" width="96" height="26" rx="13" class="svg-v5-chip ops"></rect>
            <text x="196" y="162" text-anchor="middle" class="svg-v5-chip-text">Sales Ops</text>

            <rect x="270" y="10" width="140" height="200" rx="10" class="svg-v5-panel"></rect>
            <text x="284" y="35" class="svg-v5-title">RACI snapshot</text>
            <g class="raci-v5-row">
              <rect x="282" y="49" width="116" height="31" rx="7"></rect>
              <circle cx="298" cy="64.5" r="9"></circle>
              <text x="298" y="68" text-anchor="middle" class="letter">R</text>
              <text x="314" y="62" class="role">Business</text><text x="314" y="73" class="role">Analyst</text>
            </g>
            <g class="raci-v5-row">
              <rect x="282" y="89" width="116" height="31" rx="7"></rect>
              <circle cx="298" cy="104.5" r="9"></circle>
              <text x="298" y="108" text-anchor="middle" class="letter">A</text>
              <text x="314" y="102" class="role">Product</text><text x="314" y="113" class="role">Sponsor</text>
            </g>
            <g class="raci-v5-row">
              <rect x="282" y="129" width="116" height="31" rx="7"></rect>
              <circle cx="298" cy="144.5" r="9"></circle>
              <text x="298" y="148" text-anchor="middle" class="letter">C</text>
              <text x="314" y="142" class="role">Sales Ops</text><text x="314" y="153" class="role">+ IT</text>
            </g>
            <g class="raci-v5-row">
              <rect x="282" y="169" width="116" height="31" rx="7"></rect>
              <circle cx="298" cy="184.5" r="9"></circle>
              <text x="298" y="188" text-anchor="middle" class="letter">I</text>
              <text x="314" y="188" class="role">End users</text>
            </g>
          </svg>
        </div>`;
}

function renderTags(tags = []) {
  if (!Array.isArray(tags) || tags.length === 0) return "";
  return `<div class="proof-tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>`;
}

function generateArtefactsSection(home) {
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
  const visualPanels = artefacts.items
    .map((item, index) => {
      const type = item.type || "requirements";
      return `<div class="lab-visual-panel${index === 0 ? " active" : ""}" data-visual-type="${escapeAttr(type)}">
                ${renderArtefactVisual(type)}
              </div>`;
    })
    .join("\n                ");
  const headlineLead = artefacts.headline || artefacts.title || "Turn one business case into a portfolio";
  const headlineHighlight = artefacts.headlineHighlight || "employers can trust.";
  const outcome = artefacts.outcome || {};
  const defaultSystem = systemList[0];
  const defaultStep = artefacts.items[0];
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
              <code class="lab-code-line">${escapeHtml(proofCodeLine(defaultStep.type || "stakeholder"))}</code>
            </div>
            <div class="lab-visual-shell" aria-live="polite">
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
        </div>
      </div>
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

function generateHomeRoadmapSection(settings, roadmap) {
  const title = escapeHtml(roadmap.homeTitle || "Download the free BA Career Roadmap").replace(
    escapeHtml(roadmap.homeTitleHighlight || "BA Career Roadmap"),
    `<span class="highlight">${escapeHtml(roadmap.homeTitleHighlight || "BA Career Roadmap")}</span>`
  );
  const cards = (roadmap.homeCards && roadmap.homeCards.length ? roadmap.homeCards : [
    { title: "Know the path", text: "Understand what to learn first and what to avoid wasting time on." },
    { title: "Position yourself", text: "See how your current experience can connect to BA roles." },
    { title: "Take action", text: "Leave with a simple plan for skills, CV, LinkedIn, and applications." },
  ])
    .map((item) => `<div class="roadmap-point"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.text)}</span></div>`)
    .join("\n            ");
  const includes = (roadmap.homeIncludes && roadmap.homeIncludes.length ? roadmap.homeIncludes : [
    { title: "BA Career Roadmap", text: "Clear beginner-friendly stages from exploring BA to becoming interview-ready." },
    { title: "Starter CV Template", text: "A simple structure you can adapt for BA applications and transferable experience." },
    { title: "Community Invitation", text: "Get access to updates, practical tips, live sessions, and cohort announcements." },
  ])
    .map((item) => `<div class="roadmap-include"><b>${escapeHtml(item.title)}</b><span>${escapeHtml(item.text)}</span></div>`)
    .join("\n        ");
  const stageOptions = (roadmap.stageOptions && roadmap.stageOptions.length ? roadmap.stageOptions : [
    "Career changer",
    "Graduate",
    "New to the UK job market",
    "Already in tech or business",
    "Just exploring Business Analysis",
  ])
    .map((option) => `<option>${escapeHtml(option)}</option>`)
    .join("\n              ");
  const requiredNote = roadmap.requiredNote ? `<p class="form-note">${escapeHtml(roadmap.requiredNote)}</p>` : "";

  return `<section class="section roadmap-landing" id="roadmap-landing">
    <div class="section-inner">
      <div class="roadmap-hero">
        <div class="roadmap-copy">
          <div class="section-label">${escapeHtml(roadmap.homeSectionLabel || "Free resource")}</div>
          <h2>${title}</h2>
          <p class="section-copy">${escapeHtml(roadmap.homeIntro || roadmap.intro)}</p>
          <div class="roadmap-points">
            ${cards}
          </div>
        </div>
        <div class="roadmap-form-panel">
          <h3>${escapeHtml(roadmap.formTitle)}</h3>
          <p>${escapeHtml(roadmap.formIntro)}</p>
          <form class="lead-form" action="${escapeAttr(settings.forms.roadmapEndpoint)}" method="post">
            <label for="firstName">${escapeHtml(roadmap.firstNameLabel || "First name")} <span class="required-mark" aria-hidden="true">*</span></label>
            <input id="firstName" name="firstName" type="text" placeholder="${escapeAttr(roadmap.firstNamePlaceholder || "Your first name")}" required aria-required="true" />
            <label for="email">${escapeHtml(roadmap.emailLabel || "Email address")} <span class="required-mark" aria-hidden="true">*</span></label>
            <input id="email" name="email" type="email" placeholder="${escapeAttr(roadmap.emailPlaceholder || "you@example.com")}" required aria-required="true" />
            <label for="stage">${escapeHtml(roadmap.stageLabel || "Where are you now?")}</label>
            <select id="stage" name="stage" required>
              <option value="">${escapeHtml(roadmap.stagePlaceholder || "Select one")}</option>
              ${stageOptions}
            </select>
            <input type="hidden" name="leadSource" value="${escapeAttr(roadmap.leadSource || "BA Roadmap Website")}" />
            <label class="terms-consent" for="termsConsent">
              <input id="termsConsent" name="termsConsent" type="checkbox" required aria-required="true" />
              <span>${escapeHtml(roadmap.consentText || "I agree to the")} <a href="terms/index.html">${escapeHtml(roadmap.termsLinkLabel || "terms")}</a> and <a href="privacy/index.html">${escapeHtml(roadmap.privacyLinkLabel || "privacy notice")}</a>.</span>
            </label>
            <button class="btn btn-primary" type="submit">${escapeHtml(roadmap.submitButtonLabel || "Send me the free roadmap")}</button>
            ${requiredNote}
          </form>
        </div>
      </div>
      <div class="roadmap-includes" aria-label="${escapeAttr(roadmap.homeIncludesLabel || "What the free BA roadmap includes")}">
        ${includes}
      </div>
    </div>
  </section>`;
}

function generateHomeFaqSection(faqs) {
  const all = flattenFaqs(faqs);
  const selected = faqs.homepageQuestions
    .map((question) => all.find((item) => item.question === question))
    .filter(Boolean);
  const faqItems = selected
    .map((item, index) => `<article class="faq-item${index === 0 ? " open" : ""}"><button class="faq-question" type="button" aria-expanded="${index === 0 ? "true" : "false"}">${escapeHtml(item.question)}</button><div class="faq-answer">${escapeHtml(item.answer)}</div></article>`)
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

function updateHomepage(settings, home, pricing, testimonials, faqs, roadmap) {
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
    `${generateArtefactsSection(home)}

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

  ${generateHomeRoadmapSection(settings, roadmap)}

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
        <a class="btn btn-secondary" href="../index.html#roadmap-landing">Get Free BA Roadmap</a>
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
        <p>Download the free BA Career Roadmap, join the free Telegram community, or move straight into the premium mentorship when you are ready for deeper support.</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="../index.html#roadmap-landing">Get Free BA Roadmap</a>
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
      <p class="hero-copy">Use this page to understand the Anderseed mentorship, the free roadmap, career support, payment options, and what to expect before joining.</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="../index.html#pricing">View premium mentorship</a>
        <a class="btn btn-secondary" href="../index.html#roadmap-landing">Get Free BA Roadmap</a>
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
        <h2>Start with the free roadmap.</h2>
        <p>If you are not ready for premium mentorship yet, use the free BA Career Roadmap and community to understand the path first.</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="../index.html#roadmap-landing">Get Free BA Roadmap</a>
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

function generateRoadmap(settings, roadmap) {
  const title = roadmap.seoTitle || "Free BA Career Roadmap | Anderseed Consulting";
  const description = roadmap.seoDescription || settings.defaultDescription;
  writeFile(
    "roadmap/index.html",
    `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="refresh" content="0; url=../index.html#roadmap-landing" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeAttr(description)}" />
<link rel="canonical" href="${escapeAttr(settings.siteUrl.replace(/\/$/, ""))}/#roadmap-landing" />
<link rel="stylesheet" href="../assets/landing-pages.css" />
<link rel="icon" type="image/svg+xml" href="${favicon}" />
</head>
<body>
<main class="section">
  <div class="section-inner center">
    <div class="section-label">Free Roadmap</div>
    <h1>Opening the free roadmap section.</h1>
    <p class="section-copy">The free roadmap now lives on the homepage.</p>
    <a class="btn btn-primary" href="../index.html#roadmap-landing">Go to Free Roadmap</a>
  </div>
</main>
</body>
</html>`
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
        <a class="btn btn-primary" href="../index.html#roadmap-landing">${escapeHtml(blogPage.primaryButtonLabel)}</a>
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
          <a class="btn btn-primary" href="../index.html#roadmap-landing">${escapeHtml(blogPage.resourceButtonLabel)}</a>
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
        <a class="btn btn-primary" href="../../index.html#roadmap-landing">Get Free BA Roadmap</a>
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
          <div class="section-label">Free resource</div>
          <h2>Get the BA Career Roadmap</h2>
          <p>Start with a clear path before you commit to paid support.</p>
          <a class="btn btn-primary" href="../../index.html#roadmap-landing">Download roadmap</a>
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
  fs.writeFileSync(file, html, "utf8");
}

function main() {
  const settings = readJson("content/settings.json");
  const home = readJson("content/pages/homepage.json");
  const pricing = readJson("content/pages/pricing.json");
  const testimonials = readJson("content/pages/testimonials.json");
  const faqs = readJson("content/pages/faqs.json");
  const about = readJson("content/pages/about.json");
  const roadmap = readJson("content/pages/roadmap.json");
  const blogPage = readJson("content/pages/blog.json");
  const terms = readJson("content/pages/terms.json");
  const privacy = readJson("content/pages/privacy.json");
  const posts = readPosts();

  cleanDist();
  copyDir(root, dist);
  updateHomepage(settings, home, pricing, testimonials, faqs, roadmap);
  generateAbout(settings, about);
  generateFaq(settings, faqs);
  generateBlogIndex(settings, posts, blogPage);
  generateBlogPosts(settings, posts);
  generateLegalPage(settings, terms, { output: "terms/index.html", canonical: "/terms/" });
  generateLegalPage(settings, privacy, { output: "privacy/index.html", canonical: "/privacy/" });
  updateCheckout(settings);

  console.log(`Built Anderseed site into ${path.relative(root, dist)}`);
}

main();
