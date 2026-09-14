import {
  database,
  enforceSameOrigin,
  errorResponse,
  jsonResponse,
  readJsonBody,
  validUuid,
} from "./_assessment-utils.mjs";
import { applyLeadHeatEvent, browserScoreEvents } from "./_lead-heat.mjs";

export default async (request) => {
  if (request.method !== "POST") return errorResponse("Method not allowed", 405);
  if (!enforceSameOrigin(request)) return errorResponse("Cross-origin submissions are not accepted", 403);

  try {
    const body = await readJsonBody(request, 4096);
    if (!validUuid(body.assessmentId) || !String(body.engagementToken || "")) {
      return errorResponse("This activity could not be verified.", 401, "activity_unauthorized");
    }
    if (!browserScoreEvents.has(String(body.eventName || ""))) {
      return errorResponse("This activity is not scoreable.", 400, "activity_invalid");
    }
    const outcome = await applyLeadHeatEvent(database(), {
      assessmentId: body.assessmentId,
      engagementToken: body.engagementToken,
      eventName: body.eventName,
      source: "website",
      occurredAt: new Date().toISOString(),
    });
    if (outcome.status === "unauthorized" || outcome.status === "not_found") {
      return errorResponse("This activity could not be verified.", 401, "activity_unauthorized");
    }
    return jsonResponse({ ok: true, recorded: outcome.status === "applied", duplicate: outcome.status === "duplicate" });
  } catch {
    return errorResponse("Activity scoring is temporarily unavailable.", 503, "activity_unavailable");
  }
};

export const config = {
  path: "/api/v1/lead/activity",
  rateLimit: { windowLimit: 120, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
