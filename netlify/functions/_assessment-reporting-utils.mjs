import { timingSafeEqual } from "node:crypto";
import { getDatabase } from "@netlify/database";

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const schemaPattern = /^[A-Za-z0-9._-]{1,80}$/;
const maximumReportDays = 366;

export const funnelSteps = [
  { id: "page_viewed", label: "Assessment page viewed", eventName: "assessment_page_viewed" },
  { id: "started", label: "Assessment started", eventName: "assessment_started" },
  ...Array.from({ length: 8 }, (_, index) => ({
    id: `question_${index + 1}_viewed`,
    label: `Question ${index + 1} reached`,
    eventName: "assessment_question_viewed",
    questionNumber: index + 1,
  })),
  { id: "completed", label: "Assessment completed", eventName: "assessment_completed" },
  { id: "gate_viewed", label: "Lead-capture screen viewed", eventName: "email_gate_viewed" },
  { id: "contact_submitted", label: "Contact details submitted", eventName: "contact_details_submitted" },
  { id: "result_viewed", label: "Personalised result viewed", eventName: "result_viewed" },
  {
    id: "programme_cta_clicked",
    label: "Anderseed programme CTA clicked",
    eventName: "anderseed_programme_cta_clicked",
  },
];

export function reportingDatabase() {
  return getDatabase();
}

export function reportJson(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      ...extraHeaders,
    },
  });
}

function safeEqual(left, right) {
  const leftBytes = Buffer.from(String(left || ""), "utf8");
  const rightBytes = Buffer.from(String(right || ""), "utf8");
  if (leftBytes.length !== rightBytes.length || leftBytes.length === 0) return false;
  return timingSafeEqual(leftBytes, rightBytes);
}

export function authorizeReportingRequest(request) {
  const expected = process.env.ASSESSMENT_REPORTING_ADMIN_SECRET;
  if (!expected || expected.length < 32) {
    return {
      ok: false,
      response: reportJson(
        { ok: false, message: "Assessment reporting is not configured." },
        503
      ),
    };
  }

  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match || !safeEqual(match[1], expected)) {
    return {
      ok: false,
      response: reportJson(
        { ok: false, message: "A valid reporting access token is required." },
        401,
        { "WWW-Authenticate": 'Bearer realm="Anderseed assessment reporting"' }
      ),
    };
  }

  return { ok: true };
}

function dateFromIso(value) {
  if (!isoDatePattern.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

export function parseReportRange(url) {
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const defaultStart = new Date(todayUtc);
  defaultStart.setUTCDate(defaultStart.getUTCDate() - 29);

  const startValue = url.searchParams.get("start") || isoDate(defaultStart);
  const endValue = url.searchParams.get("end") || isoDate(todayUtc);
  const start = dateFromIso(startValue);
  const end = dateFromIso(endValue);

  if (!start || !end || start > end) {
    return { ok: false, message: "Use a valid date range in YYYY-MM-DD format." };
  }

  const inclusiveDays = Math.floor((end.valueOf() - start.valueOf()) / 86400000) + 1;
  if (inclusiveDays > maximumReportDays) {
    return { ok: false, message: `Reporting ranges are limited to ${maximumReportDays} days.` };
  }

  const schemaVersion = url.searchParams.get("schemaVersion");
  if (schemaVersion && !schemaPattern.test(schemaVersion)) {
    return { ok: false, message: "The schemaVersion filter is invalid." };
  }

  return {
    ok: true,
    start: startValue,
    end: endValue,
    inclusiveDays,
    schemaVersion: schemaVersion || null,
  };
}

function percentage(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function countFor(rows, eventName, questionNumber = 0) {
  return rows
    .filter(
      (row) =>
        row.event_name === eventName && Number(row.question_number || 0) === Number(questionNumber || 0)
    )
    .reduce((total, row) => total + Number(row.session_reach || 0), 0);
}

function abandonment(entered, progressed) {
  const abandoned = Math.max(0, entered - progressed);
  return {
    entered,
    progressed,
    abandoned,
    abandonmentRatePct: percentage(abandoned, entered),
    progressionRatePct: percentage(Math.min(progressed, entered), entered),
    unmatchedProgressions: Math.max(0, progressed - entered),
  };
}

export function buildFunnelReport(rows, { start, end, inclusiveDays, schemaVersion, latestRawEventAt, latestRollupAt }) {
  const pageReach = countFor(rows, "assessment_page_viewed");
  const steps = funnelSteps.map((step) => ({
    id: step.id,
    label: step.label,
    eventName: step.eventName,
    questionNumber: step.questionNumber || null,
    reach: countFor(rows, step.eventName, step.questionNumber),
  }));

  steps.forEach((step, index) => {
    const previous = index > 0 ? steps[index - 1] : null;
    const next = index < steps.length - 1 ? steps[index + 1] : null;
    step.conversionFromPreviousPct = previous
      ? percentage(Math.min(step.reach, previous.reach), previous.reach)
      : null;
    step.conversionFromEntryPct = percentage(Math.min(step.reach, pageReach), pageReach);
    step.exits = next ? Math.max(0, step.reach - next.reach) : null;
    step.dropOff = step.exits;
    step.dropOffPct = next ? percentage(step.exits, step.reach) : null;
    step.conversionToNextPct = next
      ? percentage(Math.min(next.reach, step.reach), step.reach)
      : null;
    step.unmatchedNextStepReach = next ? Math.max(0, next.reach - step.reach) : 0;
  });

  const reachById = Object.fromEntries(steps.map((step) => [step.id, step.reach]));
  const assessmentAbandonment = abandonment(reachById.started, reachById.completed);
  const leadCaptureAbandonment = abandonment(reachById.completed, reachById.contact_submitted);

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    range: { start, end, inclusiveDays, schemaVersion },
    metricBasis: {
      unit: "anonymous session reach",
      detail:
        "Sessions are deduplicated within each UTC day and funnel step. Totals across several dates may count a session again if it spans a UTC date boundary.",
      rawEventRetentionDays: 7,
    },
    summary: {
      assessmentPageViews: reachById.page_viewed,
      assessmentsStarted: reachById.started,
      assessmentsCompleted: reachById.completed,
      contactsSubmitted: reachById.contact_submitted,
      resultsViewed: reachById.result_viewed,
      startRatePct: percentage(Math.min(reachById.started, reachById.page_viewed), reachById.page_viewed),
      assessmentCompletionRatePct: percentage(
        Math.min(reachById.completed, reachById.started),
        reachById.started
      ),
      leadCaptureRatePct: percentage(
        Math.min(reachById.contact_submitted, reachById.completed),
        reachById.completed
      ),
      resultRevealRatePct: percentage(
        Math.min(reachById.result_viewed, reachById.contact_submitted),
        reachById.contact_submitted
      ),
      roadmapCtaClicks: countFor(rows, "roadmap_cta_clicked"),
      programmeCtaClicks: countFor(rows, "anderseed_programme_cta_clicked"),
    },
    abandonment: {
      assessment: assessmentAbandonment,
      leadCapture: leadCaptureAbandonment,
    },
    funnel: steps,
    dataFreshness: {
      latestRawEventAt: latestRawEventAt || null,
      latestRollupAt: latestRollupAt || null,
    },
    privacy: {
      containsPersonalData: false,
      contactDetailsIncluded: false,
      answerValuesIncluded: false,
    },
  };
}
