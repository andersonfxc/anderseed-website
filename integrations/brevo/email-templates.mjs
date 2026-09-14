const brand = {
  cream: "#f5f2ea",
  darkGreen: "#0f382a",
  green: "#1f7658",
  mint: "#7ed4a0",
  ink: "#17231e",
  muted: "#4c5a54",
  border: "#d9ded9",
};

export const templates = [
  {
    key: "nurtureWelcome",
    classification: "marketing",
    templateName: "Anderseed - Nurture 01 - Welcome",
    subject: "Welcome to your Business Analysis journey",
    tag: "anderseed-nurture-welcome",
    preheader: "A clear starting point for building your Business Analysis capability.",
    heading: "Welcome to your Business Analysis journey",
    intro: "You do not need to have everything figured out before you begin. The strongest starting point is understanding what Business Analysts actually do and then building evidence that you can do it.",
    points: [
      "Learn the language and thinking used by Business Analysts.",
      "Practise with realistic workplace scenarios, not theory alone.",
      "Build evidence you can explain in applications and interviews.",
    ],
    closing: "Over the next few emails, we will share practical guidance to help you turn your existing experience into a clearer BA direction.",
    cta: { label: "Explore the Anderseed approach", parameter: "programme_url" },
  },
  {
    key: "nurtureFoundations",
    classification: "marketing",
    templateName: "Anderseed - Cold 01 - Transferable Experience",
    subject: "Your experience may already contain BA skills",
    tag: "anderseed-cold-transferable-experience",
    preheader: "Find one experience you can begin translating into BA language.",
    heading: "Start with what you already know",
    intro: "You do not need to have worked under the title Business Analyst before you can begin recognising relevant experience. Think about a time when you:",
    points: [
      "Found a better way to complete a task at work.",
      "Asked questions to understand what someone needed.",
      "Helped resolve a recurring problem.",
      "Explained a new process or change to other people.",
      "Compared different options before recommending a solution.",
    ],
    closing: "If one of these sounds familiar, you already have a useful starting point. The next step is learning how to explain the problem you noticed, the people involved, what you did and the outcome you helped achieve. Use this short exercise to choose one example and begin translating it into clear Business Analysis language.",
    cta: { label: "Find my transferable BA experience", parameter: "content_url" },
  },
  {
    key: "nurtureCareer",
    classification: "marketing",
    templateName: "Anderseed - Cold 02 - Career Opportunities",
    subject: "Where could a Business Analysis career take you?",
    tag: "anderseed-cold-career-opportunities",
    timing: "Day 24",
    expectedOutcome: "Help the reader understand the breadth, progression and earning potential of a Business Analysis career, then explore the career path.",
    preheader: "Explore BA opportunities, career progression and UK salary expectations.",
    heading: "Business Analysis is more than one job title",
    intro: "Organisations need people who can understand problems, work with stakeholders and help teams deliver the right changes.",
    points: [
      "Technology and digital transformation",
      "Banking, finance and insurance",
      "Healthcare and pharmaceuticals",
      "Government and public services",
      "Retail, education, utilities and consulting",
    ],
    sections: [
      {
        paragraphs: ["You may also find similar work advertised under titles such as Process Analyst, Business Systems Analyst, Digital Business Analyst or Change Analyst."],
      },
      {
        heading: "A career with room to grow",
        paragraphs: [
          "The UK Government Digital and Data framework shows a career path from Trainee and Junior Business Analyst through to Business Analyst, Senior, Lead and Head of Business Analysis.",
          "With experience, Business Analysts may also progress into project management, product, consulting, change management or specialist industry roles.",
        ],
      },
      {
        heading: "What could you earn?",
        highlight: "Anderseed trainees have secured Business Analyst roles with salaries ranging from £41,000 to £55,000.",
        paragraphs: [
          "The UK National Careers Service currently gives an indicative salary range of approximately £23,000 for starters to £55,000 for experienced Business Analysts.",
          "Salary can be higher in senior, specialist, consultancy and contract positions. Actual earnings depend on your country, location, sector, employer and experience, so these figures should be treated as a guide rather than a guarantee.",
        ],
      },
    ],
    closing: "The opportunity is real, but employers still expect candidates to demonstrate clear BA knowledge, relevant skills and credible evidence of how they work. Explore the different roles, progression routes and capabilities that can help you build towards a Business Analysis career.",
    cta: { label: "Explore the Business Analysis career path", parameter: "career_path_url" },
    referenceNote: "Salary and progression references: National Careers Service and the Government Digital and Data Profession framework.",
  },
  {
    key: "nurturePortfolio",
    classification: "marketing",
    templateName: "Anderseed - Nurture 03 - Portfolio Evidence",
    subject: "Build BA evidence employers can understand",
    tag: "anderseed-nurture-portfolio",
    preheader: "Turn your learning into a connected, interview-ready project story.",
    heading: "A portfolio should show how you think",
    intro: "A useful BA portfolio is more than a folder of templates. It should show how you moved from a business problem to a practical recommendation and how each artefact supported that journey.",
    points: [
      "Choose a realistic CRM, HCM or ERP implementation scenario.",
      "Create stakeholder analysis and AS-IS and TO-BE process maps.",
      "Write Jira-ready user stories, acceptance criteria and a BRD.",
      "Present your decisions through a prototype and an interview-ready story.",
    ],
    closing: "The goal is connected evidence you can show, explain and defend with confidence.",
    cta: { label: "See the portfolio project", parameter: "portfolio_url" },
  },
  {
    key: "nurtureProgramme",
    classification: "marketing",
    templateName: "Anderseed - Nurture 04 - Programme",
    subject: "Ready to build practical BA experience?",
    tag: "anderseed-nurture-programme",
    preheader: "See how the 12-week Anderseed BA Career Journey brings the work together.",
    heading: "Turn learning into credible BA evidence",
    intro: "The Anderseed BA Career Journey combines eight weeks of live mentorship with a four-week guided portfolio project, helping you connect BA knowledge to realistic, end-to-end project work.",
    points: [
      "Live sessions, mentor feedback and structured practical tasks.",
      "A guided CRM, HCM or ERP portfolio project.",
      "CV, LinkedIn, application and interview preparation.",
      "Ongoing community and workplace support.",
    ],
    closing: "Review the full programme and pricing when you are ready. Joining is your decision, and there is no obligation to apply.",
    cta: { label: "Explore the programme and pricing", parameter: "pricing_url" },
  },
  {
    key: "assessmentRoadmapDelivery",
    classification: "service",
    templateName: "Anderseed - Assessment Roadmap Delivery",
    subject: "Your free BA Career Roadmap is ready",
    tag: "anderseed-assessment-roadmap",
    preheader: "Your requested roadmap is ready to view.",
    heading: "Your BA Career Roadmap is ready",
    intro: "Thank you for completing the Anderseed BA Readiness Assessment. Your personalised result was displayed immediately after completing the assessment.",
    points: [],
    closing: "Your free BA Career Roadmap is ready. Use it to understand the steps involved in developing your Business Analysis capability and planning your next move.",
    cta: { label: "View your BA Career Roadmap", parameter: "roadmap_url" },
    directLinkParameter: "roadmap_url",
    preferencePrompt: true,
    parameters: ["preferences_url"],
  },
  {
    key: "applicationReceived",
    classification: "service",
    templateName: "Anderseed - Application Received",
    subject: "We have received your Anderseed application",
    tag: "anderseed-application-received",
    preheader: "Your application has been received and is ready for review.",
    heading: "Your application has been received",
    intro: "Thank you for applying to Anderseed. Your application is now ready for review. This confirmation does not mean that a place has been offered yet.",
    points: [
      "We will review the information you submitted.",
      "We will contact you using the details in your application.",
      "You do not need to submit another application while this one is being reviewed.",
    ],
    closing: "Your application reference is {{ params.application_reference }}. Keep this email for your records.",
  },
  {
    key: "consultationConfirmed",
    classification: "service",
    templateName: "Anderseed - Consultation Confirmed",
    subject: "Your Anderseed consultation is confirmed",
    tag: "anderseed-consultation-confirmed",
    preheader: "Your consultation details and joining link are inside.",
    heading: "Your consultation is confirmed",
    intro: "Your free consultation has been booked. We will use the time to understand your current position, answer relevant questions and help you identify a sensible next step.",
    details: [["Date", "{{ params.consultation_date }}"], ["Time", "{{ params.consultation_time }} {{ params.consultation_timezone }}"]],
    closing: "Please use the button below at the scheduled time. If your plans change, use the booking management link in your confirmation details.",
    cta: { label: "Join or manage consultation", parameter: "manage_booking_url" },
  },
  {
    key: "consultationReminder",
    classification: "service",
    templateName: "Anderseed - Consultation Reminder",
    subject: "Reminder: your Anderseed consultation",
    tag: "anderseed-consultation-reminder",
    preheader: "A reminder of your upcoming Anderseed consultation.",
    heading: "Your consultation is coming up",
    intro: "This is a reminder of your upcoming Anderseed consultation. Bring any questions about your BA direction, practical experience or the programme.",
    details: [["Date", "{{ params.consultation_date }}"], ["Time", "{{ params.consultation_time }} {{ params.consultation_timezone }}"]],
    closing: "Please join on time using the button below. If you can no longer attend, use the same link to manage your booking.",
    cta: { label: "View consultation details", parameter: "manage_booking_url" },
  },
  {
    key: "paymentConfirmation",
    classification: "service",
    templateName: "Anderseed - Payment Confirmation",
    subject: "Your Anderseed payment confirmation",
    tag: "anderseed-payment-confirmation",
    preheader: "Your payment has been recorded. Keep this confirmation for your records.",
    heading: "Payment confirmed",
    intro: "Thank you. Your payment has been recorded successfully. Keep this email as confirmation of the transaction.",
    details: [["Reference", "{{ params.payment_reference }}"], ["Amount", "{{ params.payment_amount }}"], ["Payment plan", "{{ params.payment_plan }}"], ["Date", "{{ params.payment_date }}"]],
    closing: "We will send any relevant onboarding information separately. If you have a question about this payment, quote the reference above when contacting Anderseed.",
  },
];

function renderPoints(points = []) {
  if (!points.length) return "";
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:4px 0 22px">${points.map((point) => `<tr><td valign="top" style="width:24px;padding:7px 0;color:${brand.green};font-size:17px;font-weight:700">&#10003;</td><td style="padding:7px 0;color:${brand.ink};font-size:15px;line-height:1.55">${point}</td></tr>`).join("")}</table>`;
}

function renderDetails(details = []) {
  if (!details.length) return "";
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:4px 0 22px;border:1px solid ${brand.border}">${details.map(([label, value], index) => `<tr><td style="padding:12px 14px;${index ? `border-top:1px solid ${brand.border};` : ""}color:${brand.muted};font-size:13px;font-weight:700">${label}</td><td align="right" style="padding:12px 14px;${index ? `border-top:1px solid ${brand.border};` : ""}color:${brand.ink};font-size:14px">${value}</td></tr>`).join("")}</table>`;
}

function renderSections(sections = []) {
  return sections.map((section) => `${section.heading ? `<h2 style="margin:26px 0 10px;color:#123b2d;font-family:Georgia,serif;font-size:22px;line-height:1.25">${section.heading}</h2>` : ""}${section.highlight ? `<p style="margin:0 0 14px;padding:14px 16px;background:#f3f7f4;border-left:4px solid ${brand.green};color:${brand.ink};font-size:16px;font-weight:700;line-height:1.55">${section.highlight}</p>` : ""}${(section.paragraphs || []).map((paragraph) => `<p style="margin:0 0 14px;color:${brand.muted};font-size:15px;line-height:1.65">${paragraph}</p>`).join("")}`).join("");
}

function renderReferenceNote(referenceNote) {
  if (!referenceNote) return "";
  return `<p style="margin:22px 0 0;color:#68736e;font-size:12px;line-height:1.55"><em>${referenceNote}</em></p>`;
}

function renderCta(cta) {
  if (!cta) return "";
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 0"><tr><td style="border-radius:5px;background:${brand.green}"><a href="{{ params.${cta.parameter} }}" style="display:inline-block;padding:14px 22px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none">${cta.label} &rarr;</a></td></tr></table>`;
}

function renderDirectLink(parameter) {
  if (!parameter) return "";
  return `<p style="margin:18px 0 0;color:#68736e;font-size:13px;line-height:1.6">If the button does not work, use this link:<br><a href="{{ params.${parameter} }}" style="color:${brand.green};word-break:break-all">{{ params.${parameter} }}</a></p>`;
}

function renderPreferencePrompt(enabled) {
  if (!enabled) return "";
  return `{% if not contact.MARKETING_CONSENT %}<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 0;background:#f3f7f4;border:1px solid ${brand.border}"><tr><td style="padding:18px"><h2 style="margin:0 0 8px;color:#123b2d;font-family:Georgia,serif;font-size:20px">Your email preferences</h2><p style="margin:0 0 12px;color:${brand.muted};font-size:14px;line-height:1.55">You are not currently subscribed to ongoing Anderseed emails.</p><a href="{{ params.preferences_url }}" style="color:${brand.green};font-size:14px;font-weight:700">Review your email preferences</a></td></tr></table>{% endif %}`;
}

function renderSocialLinks(classification) {
  if (classification !== "marketing") return "";
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:26px 0 0;border-top:1px solid ${brand.border}"><tr><td style="padding:22px 0 0"><h2 style="margin:0 0 8px;color:#123b2d;font-family:Georgia,serif;font-size:20px">Stay connected with Anderseed</h2><p style="margin:0 0 12px;color:${brand.muted};font-size:14px;line-height:1.55">Join the free Telegram community for BA guidance, shared resources, session updates and peer support.</p><p style="margin:0 0 14px"><a href="{{ params.telegram_url }}" style="color:${brand.green};font-size:14px;font-weight:700">Join the Telegram community &rarr;</a></p><p style="margin:0;color:${brand.muted};font-size:13px;line-height:1.6">Follow Anderseed: <a href="{{ params.tiktok_url }}" style="color:${brand.green}">TikTok</a> &middot; <a href="{{ params.instagram_url }}" style="color:${brand.green}">Instagram</a> &middot; <a href="{{ params.youtube_url }}" style="color:${brand.green}">YouTube</a></p></td></tr></table>`;
}

function renderFooter(template) {
  if (template.classification === "marketing") return `You are receiving this email because you chose to receive practical BA tips and Anderseed programme updates.<br><a href="{{ unsubscribe }}" style="color:${brand.green}">Unsubscribe</a> from marketing emails at any time.<br>Anderseed Consulting`;
  return "This service email relates to an action or transaction you completed with Anderseed. It is separate from marketing consent.<br>Anderseed Consulting";
}

export function renderTemplateHtml(template) {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${template.subject}</title></head>
<body style="margin:0;background:${brand.cream};color:${brand.ink};font-family:Arial,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${template.preheader}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${brand.cream}"><tr><td align="center" style="padding:28px 12px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid ${brand.border}">
      <tr><td style="padding:24px 30px;background:${brand.darkGreen};color:#ffffff"><div style="font-family:Georgia,serif;font-size:26px;line-height:1.2">Ander<span style="color:${brand.mint}">seed</span></div><div style="margin-top:4px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#d8e8df">Consulting</div></td></tr>
      <tr><td style="padding:34px 30px"><p style="margin:0 0 14px;font-size:16px;line-height:1.6">Hi {{ contact.FIRSTNAME }},</p><h1 style="margin:0 0 16px;color:#123b2d;font-family:Georgia,serif;font-size:32px;line-height:1.18">${template.heading}</h1><p style="margin:0 0 20px;color:${brand.muted};font-size:16px;line-height:1.65">${template.intro}</p>${renderPoints(template.points)}${renderSections(template.sections)}${renderDetails(template.details)}<p style="margin:0;color:${brand.muted};font-size:15px;line-height:1.65">${template.closing}</p>${renderCta(template.cta)}${renderDirectLink(template.directLinkParameter)}${renderPreferencePrompt(template.preferencePrompt)}${renderSocialLinks(template.classification)}${renderReferenceNote(template.referenceNote)}</td></tr>
      <tr><td style="padding:20px 30px;border-top:1px solid #e4e8e5;color:#68736e;font-size:12px;line-height:1.6">${renderFooter(template)}</td></tr>
    </table>
  </td></tr></table>
</body>
</html>`;
}

export function renderTemplateText(template) {
  const lines = ["Hi {{ contact.FIRSTNAME }},", "", template.heading, "", template.intro];
  for (const point of template.points || []) lines.push("", `- ${point}`);
  for (const section of template.sections || []) {
    if (section.heading) lines.push("", section.heading);
    if (section.highlight) lines.push("", section.highlight);
    for (const paragraph of section.paragraphs || []) lines.push("", paragraph);
  }
  for (const [label, value] of template.details || []) lines.push("", `${label}: ${value}`);
  lines.push("", template.closing);
  if (template.cta) lines.push("", `${template.cta.label}:`, `{{ params.${template.cta.parameter} }}`);
  if (template.preferencePrompt) lines.push("", "If you are not currently subscribed to ongoing Anderseed emails, review your email preferences:", "{{ params.preferences_url }}");
  if (template.classification === "marketing") lines.push("", "Stay connected with Anderseed", "", "Join the free Telegram community for BA guidance, shared resources, session updates and peer support.", "Join Telegram: {{ params.telegram_url }}", "TikTok: {{ params.tiktok_url }}", "Instagram: {{ params.instagram_url }}", "YouTube: {{ params.youtube_url }}");
  if (template.classification === "marketing") lines.push("", "You are receiving this email because you chose to receive practical BA tips and Anderseed programme updates.", "Unsubscribe: {{ unsubscribe }}");
  else lines.push("", "This service email relates to an action or transaction you completed with Anderseed. It is separate from marketing consent.");
  if (template.referenceNote) lines.push("", template.referenceNote);
  lines.push("", "Anderseed Consulting");
  return `${lines.join("\n")}\n`;
}
