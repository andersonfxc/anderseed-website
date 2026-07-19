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
      ["content", "dist", "scripts", "node_modules", ".git", "package.json", "package-lock.json", "netlify.toml"].includes(entry.name)
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
  return `<a class="logo" href="${base}index.html" aria-label="Anderseed Consulting home"><img src="${base}assets/anderseed-logo-header.png" alt="Anderseed Consulting" /></a>`;
}

function nav(base = "", active = "") {
  const items = [
    ["Home", `${base}index.html`, "home"],
    ["About", `${base}about/index.html`, "about"],
    ["Pricing", `${base}index.html#pricing`, "pricing"],
    ["Free Roadmap", `${base}roadmap/index.html`, "roadmap"],
    ["Blog", `${base}blog/index.html`, "blog"],
    ["FAQ", `${base}faq/index.html`, "faq"],
    ["Contact Us", `${base}index.html#contact`, "contact"],
  ];
  return `<nav class="nav-links" aria-label="Primary navigation">
      ${items.map(([label, href, key]) => `<a${active === key ? ' class="active"' : ""} href="${href}">${label}</a>`).join("\n      ")}
    </nav>`;
}

function footer(base = "", settings) {
  return `<footer class="footer">
  <div class="footer-inner">
    <div><strong>${escapeHtml(settings.siteName)}</strong><p>${escapeHtml(settings.footerTagline)}</p></div>
    <div class="footer-links"><a href="${base}about/index.html">About</a><a href="${base}blog/index.html">Blog</a><a href="${base}roadmap/index.html">Free Roadmap</a><a href="${base}faq/index.html">FAQ</a><a href="${base}privacy/index.html">Privacy</a><a href="${base}terms/index.html">Terms</a></div>
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
<header class="nav">
  <div class="nav-inner">
    ${logo(base)}
    ${nav(base, active)}
  </div>
</header>
${body}
${footer(base, settings)}
${telegramFloat(settings)}
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

function updateHomepage(settings, home, pricing, testimonials, faqs) {
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
    /<section class="section" id="steps">[\s\S]*?<\/section>\s*<section class="section" id="pricing">/,
    `${generateStepsSection(home)}

  <section class="section" id="pricing">`,
    "process section"
  );
  html = replaceFirst(
    html,
    /<section class="section" id="pricing">[\s\S]*?<\/section>\s*<section class="section roadmap-landing"/,
    `${generatePricingSection(pricing)}

  <section class="section roadmap-landing"`,
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
        <a class="btn btn-secondary" href="../roadmap/index.html">Get Free BA Roadmap</a>
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
          <a class="btn btn-primary" href="../roadmap/index.html">Get Free BA Roadmap</a>
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
        <a class="btn btn-secondary" href="../roadmap/index.html">Get Free BA Roadmap</a>
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
          <a class="btn btn-primary" href="../roadmap/index.html">Get Free BA Roadmap</a>
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
      description: "Frequently asked questions about Anderseed Consulting, Business Analysis mentorship, the free BA roadmap, career support, payments, job outcomes, and UK BA job-market support.",
      canonical: "/faq/",
      base: "../",
      active: "faq",
      body,
      schema: faqJsonLd(items),
    }, settings)
  );
}

function generateRoadmap(settings, roadmap) {
  const body = `<main>
  <section class="hero">
    <div class="hero-inner">
      <div class="eyebrow"><span class="leaf-dot" aria-hidden="true"></span>${escapeHtml(roadmap.eyebrow)}</div>
      <h1>${escapeHtml(roadmap.headline).replace("BA Career Roadmap", "<span>BA Career Roadmap</span>")}</h1>
      <p class="hero-copy">${escapeHtml(roadmap.intro)}</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="#roadmap-form">Download roadmap</a>
        <a class="btn btn-secondary" href="${escapeAttr(settings.social.telegram)}" target="_blank" rel="noopener">Join free BA community</a>
      </div>
    </div>
  </section>
  <section class="section">
    <div class="section-inner grid-2">
      <div class="dark-panel">
        <div class="section-label">Inside the roadmap</div>
        <h2>${escapeHtml(roadmap.insideTitle)}</h2>
        <p>${escapeHtml(roadmap.insideText)}</p>
        ${list(roadmap.points)}
      </div>
      <div class="panel panel-pad" id="roadmap-form">
        <div class="section-label">Instant access</div>
        <h2>${escapeHtml(roadmap.formTitle)}</h2>
        <p class="section-copy">${escapeHtml(roadmap.formIntro)}</p>
        <form class="lead-form" action="${escapeAttr(settings.forms.roadmapEndpoint)}" method="post">
          <label for="firstName">First name <span class="required">*</span>
            <input id="firstName" name="firstName" type="text" placeholder="Your first name" autocomplete="given-name" required />
          </label>
          <label for="email">Email address <span class="required">*</span>
            <input id="email" name="email" type="email" placeholder="you@example.com" autocomplete="email" required />
          </label>
          <label for="stage">Where are you now? <span class="required">*</span>
            <select id="stage" name="stage" required>
              <option value="">Select one</option>
              <option>Career changer</option>
              <option>Graduate</option>
              <option>New to the UK job market</option>
              <option>Already in tech or business</option>
              <option>Just exploring Business Analysis</option>
            </select>
          </label>
          <input type="hidden" name="leadSource" value="Roadmap Landing Page" />
          <label class="terms-consent" for="termsConsent">
            <input id="termsConsent" name="termsConsent" type="checkbox" required />
            <span>I agree to the <a href="../terms/index.html">terms</a> and <a href="../privacy/index.html">privacy notice</a>.</span>
          </label>
          <button class="btn btn-primary" type="submit">Send me the free roadmap</button>
        </form>
      </div>
    </div>
  </section>
  <section class="section alt">
    <div class="section-inner">
      <div class="section-head center">
        <div class="section-label">What happens next</div>
        <h2>${escapeHtml(roadmap.nextStepsTitle)}</h2>
        <p class="section-copy">${escapeHtml(roadmap.nextStepsIntro)}</p>
      </div>
      <div class="card-grid">
        <article class="info-card"><h3>Read the roadmap</h3><p>Get a simple beginner-friendly view of what Business Analysts do and what to learn first.</p></article>
        <article class="info-card"><h3>Join the community</h3><p>Stay close to BA tips, job-search support, live sessions, and cohort updates.</p></article>
        <article class="info-card"><h3>Choose premium support</h3><p>When ready, move into live mentorship, project practice, CV support, and interview preparation.</p></article>
      </div>
    </div>
  </section>
</main>`;
  writeFile("roadmap/index.html", pageShell({ title: roadmap.seoTitle, description: roadmap.seoDescription, canonical: "/roadmap/", base: "../", active: "roadmap", body }, settings));
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

function generateBlogIndex(settings, posts) {
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
      <div class="eyebrow"><span class="leaf-dot" aria-hidden="true"></span>Business Analysis blog</div>
      <h1>Practical BA articles for people starting from <span>scratch</span></h1>
      <p class="hero-copy">Use this blog to publish SEO-focused articles on Business Analysis careers, CV positioning, LinkedIn, requirements gathering, stakeholder management, interviews, and the UK BA job market.</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="../roadmap/index.html">Get Free BA Roadmap</a>
        <a class="btn btn-secondary" href="../index.html#pricing">View mentorship</a>
      </div>
    </div>
  </section>
  <section class="section">
    <div class="section-inner article-wrap">
      <div>
        <div class="section-head">
          <div class="section-label">Latest articles</div>
          <h2>Build clarity before you apply</h2>
          <p class="section-copy">Publish helpful articles around the questions your audience already searches for, then link each article back to the free roadmap and mentorship programme.</p>
        </div>
        <div class="post-grid">
        ${postCards}
        </div>
      </div>
      <aside class="sidebar">
        <div class="sidebar-card">
          <h3>Browse topics</h3>
          <ul class="topic-list">
            ${categoryList}
          </ul>
        </div>
        <div class="dark-panel">
          <div class="section-label">Free resource</div>
          <h2>Get the BA Career Roadmap</h2>
          <p>Start with a clear path before you commit to paid support.</p>
          <a class="btn btn-primary" href="../roadmap/index.html">Send me the roadmap</a>
        </div>
        <div class="sidebar-card">
          <h3>Community</h3>
          <p>Join the free Telegram community for BA tips, live sessions, and cohort updates.</p>
          <a class="btn btn-secondary" href="${escapeAttr(settings.social.telegram)}" target="_blank" rel="noopener">Join on Telegram</a>
        </div>
      </aside>
    </div>
  </section>
</main>`;
  writeFile(
    "blog/index.html",
    pageShell({
      title: "Business Analysis Blog | Anderseed Consulting",
      description: "Practical Business Analysis career articles for beginners, career changers, graduates, and professionals moving into BA roles in the UK market.",
      canonical: "/blog/",
      base: "../",
      active: "blog",
      body,
      schema: `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "Blog", name: "Anderseed Consulting BA Blog", description: "Practical Business Analysis career articles for beginners and career changers in the UK.", publisher: { "@type": "Organization", name: settings.siteName } })}</script>`,
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
        <a class="btn btn-primary" href="../../roadmap/index.html">Get Free BA Roadmap</a>
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
          <a class="btn btn-primary" href="../../roadmap/index.html">Download roadmap</a>
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

function updateCheckout(settings) {
  const file = path.join(dist, "checkout/index.html");
  if (!fs.existsSync(file)) return;
  const html = applyGlobalReplacements(fs.readFileSync(file, "utf8"), settings, "application");
  fs.writeFileSync(file, html, "utf8");
}

function updateCopiedLandingPages(settings) {
  for (const relativePath of ["privacy/index.html", "terms/index.html"]) {
    const file = path.join(dist, relativePath);
    if (!fs.existsSync(file)) continue;
    const html = applyGlobalReplacements(fs.readFileSync(file, "utf8"), settings);
    fs.writeFileSync(file, html, "utf8");
  }
}

function main() {
  const settings = readJson("content/settings.json");
  const home = readJson("content/pages/homepage.json");
  const pricing = readJson("content/pages/pricing.json");
  const testimonials = readJson("content/pages/testimonials.json");
  const faqs = readJson("content/pages/faqs.json");
  const about = readJson("content/pages/about.json");
  const roadmap = readJson("content/pages/roadmap.json");
  const posts = readPosts();

  cleanDist();
  copyDir(root, dist);
  updateHomepage(settings, home, pricing, testimonials, faqs);
  generateAbout(settings, about);
  generateFaq(settings, faqs);
  generateRoadmap(settings, roadmap);
  generateBlogIndex(settings, posts);
  generateBlogPosts(settings, posts);
  updateCheckout(settings);
  updateCopiedLandingPages(settings);

  console.log(`Built Anderseed site into ${path.relative(root, dist)}`);
}

main();
