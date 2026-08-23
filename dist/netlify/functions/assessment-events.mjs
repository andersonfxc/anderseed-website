import {
  allowedEvents,
  database,
  enforceSameOrigin,
  errorResponse,
  jsonResponse,
  questionIds,
  readJsonBody,
  assessmentContent,
  scoringConfig,
  validUuid,
} from "./_assessment-utils.mjs";

function validEvent(event) {
  if (!event || !validUuid(event.eventId) || !validUuid(event.analyticsSessionId) || !allowedEvents.has(event.eventName)) return false;
  if (event.schemaVersion !== assessmentContent.schemaVersion || event.scoringVersion !== scoringConfig.scoringVersion) return false;
  if (event.questionId !== null && event.questionId !== undefined && !questionIds.has(event.questionId)) return false;
  if (event.questionNumber !== null && event.questionNumber !== undefined && (!Number.isInteger(event.questionNumber) || event.questionNumber < 1 || event.questionNumber > 8)) return false;
  return true;
}

export default async (request) => {
  if (request.method !== "POST") return errorResponse("Method not allowed", 405);
  if (!enforceSameOrigin(request)) return errorResponse("Cross-origin submissions are not accepted", 403);

  try {
    const body = await readJsonBody(request, 24576);
    const events = Array.isArray(body.events) ? body.events.slice(0, 20) : [];
    if (!events.length || events.some((event) => !validEvent(event))) return errorResponse("One or more analytics events are invalid.");
    const db = database();
    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");
      for (const event of events) {
        const timestamp = Number.isNaN(Date.parse(event.clientTimestamp)) ? null : event.clientTimestamp;
        await client.query(
          `INSERT INTO assessment_events (
            event_id, analytics_session_id, event_name, schema_version, scoring_version, question_id, question_number, client_timestamp
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          ON CONFLICT (event_id) DO NOTHING`,
          [event.eventId, event.analyticsSessionId, event.eventName, String(event.schemaVersion).slice(0, 80), String(event.scoringVersion).slice(0, 80), event.questionId || null, event.questionNumber || null, timestamp]
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return jsonResponse({ ok: true, accepted: events.length }, 202);
  } catch {
    return errorResponse("Analytics events could not be stored.", 500);
  }
};

export const config = {
  path: "/api/v1/assessment/events",
  rateLimit: { windowLimit: 180, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
