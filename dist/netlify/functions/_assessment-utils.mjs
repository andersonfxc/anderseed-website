import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { getDatabase } from "@netlify/database";

const require = createRequire(import.meta.url);
export const assessmentContent = require("../../content/pages/assessment.json");
export const scoringConfig = require("../../content/assessment-scoring.json");
export const siteSettings = require("../../content/settings.json");
export const scoring = require("../../assets/assessment-scoring.js");

export const allowedEvents = new Set([
  "assessment_page_viewed",
  "assessment_started",
  "assessment_question_viewed",
  "assessment_question_answered",
  "assessment_completed",
  "email_gate_viewed",
  "contact_details_submitted",
  "result_viewed",
  "roadmap_cta_clicked",
  "anderseed_programme_cta_clicked",
  "exit_prompt_viewed",
  "exit_cancelled",
  "exit_confirmed",
  "assessment_restored",
  "draft_expired",
]);

export const questionIds = new Set(assessmentContent.questions.map((question) => question.id));
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function errorResponse(message, status = 400) {
  return jsonResponse({ ok: false, message }, status);
}

export function enforceSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export async function readJsonBody(request, maxBytes = 32768) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > maxBytes) throw new Error("Request is too large");
  const text = await request.text();
  if (text.length > maxBytes) throw new Error("Request is too large");
  try {
    return JSON.parse(text || "{}");
  } catch {
    throw new Error("Request must contain valid JSON");
  }
}

export function validUuid(value) {
  return uuidPattern.test(String(value || ""));
}

export function normalizeName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 80);
}

export function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase().slice(0, 254);
  return emailPattern.test(email) ? email : "";
}

export function sha256(value) {
  return createHash("sha256").update(String(value || "")).digest("hex");
}

export function database() {
  return getDatabase();
}

export function publicResult(result) {
  return {
    schemaVersion: result.schemaVersion,
    scoringVersion: result.scoringVersion,
    readinessScore: result.readinessScore,
    readinessProfile: result.readinessProfile,
    readinessStage: result.readinessStage,
    readinessStageIcon: result.readinessStageIcon,
    resultTitle: result.resultTitle,
    focus: result.focus,
    explanation: result.explanation,
    dimensions: result.dimensions,
    dimensionStatuses: result.dimensionStatuses,
    strongestArea: result.strongestArea,
    strength: result.strength,
    primaryGrowthAreaKey: result.primaryGrowthAreaKey,
    primaryGrowthArea: result.primaryGrowthArea,
    biggestGap: result.biggestGap,
    recommendedNextMove: result.recommendedNextMove,
    topPriorities: result.topPriorities,
    programmeRecommendation: result.programmeRecommendation,
  };
}
