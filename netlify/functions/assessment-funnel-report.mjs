import {
  authorizeReportingRequest,
  buildFunnelReport,
  parseReportRange,
  reportJson,
  reportingDatabase,
} from "./_assessment-reporting-utils.mjs";

const reportQuery = `
  WITH raw_counts AS (
    SELECT
      (server_timestamp AT TIME ZONE 'UTC')::date AS cohort_date,
      schema_version,
      event_name,
      COALESCE(question_id, '') AS question_id,
      COALESCE(question_number, 0) AS question_number,
      COUNT(DISTINCT analytics_session_id)::integer AS session_reach
    FROM assessment_events
    WHERE (server_timestamp AT TIME ZONE 'UTC')::date BETWEEN $1::date AND $2::date
      AND ($3::text IS NULL OR schema_version = $3::text)
    GROUP BY 1, 2, 3, 4, 5
  ),
  available_counts AS (
    SELECT cohort_date, schema_version, event_name, question_id, question_number, session_reach
    FROM raw_counts

    UNION ALL

    SELECT
      daily.cohort_date,
      daily.schema_version,
      daily.event_name,
      daily.question_id,
      daily.question_number,
      daily.assessment_sessions AS session_reach
    FROM assessment_funnel_daily AS daily
    WHERE daily.cohort_date BETWEEN $1::date AND $2::date
      AND ($3::text IS NULL OR daily.schema_version = $3::text)
      AND NOT EXISTS (
        SELECT 1
        FROM raw_counts AS raw
        WHERE raw.cohort_date = daily.cohort_date
          AND raw.schema_version = daily.schema_version
          AND raw.event_name = daily.event_name
          AND raw.question_id = daily.question_id
          AND raw.question_number = daily.question_number
      )
  )
  SELECT
    schema_version,
    event_name,
    question_id,
    question_number,
    SUM(session_reach)::integer AS session_reach
  FROM available_counts
  GROUP BY schema_version, event_name, question_id, question_number
  ORDER BY schema_version, event_name, question_number
`;

export default async (request) => {
  if (request.method !== "GET") {
    return reportJson({ ok: false, message: "Method not allowed." }, 405, { Allow: "GET" });
  }

  const authorization = authorizeReportingRequest(request);
  if (!authorization.ok) return authorization.response;

  const range = parseReportRange(new URL(request.url));
  if (!range.ok) return reportJson({ ok: false, message: range.message }, 400);

  const db = reportingDatabase();
  const client = await db.pool.connect();
  try {
    const counts = await client.query(reportQuery, [range.start, range.end, range.schemaVersion]);
    const freshness = await client.query(
      `SELECT
        (
          SELECT MAX(server_timestamp)
          FROM assessment_events
          WHERE (server_timestamp AT TIME ZONE 'UTC')::date BETWEEN $1::date AND $2::date
            AND ($3::text IS NULL OR schema_version = $3::text)
        ) AS latest_raw_event_at,
        (
          SELECT MAX(updated_at)
          FROM assessment_funnel_daily
          WHERE cohort_date BETWEEN $1::date AND $2::date
            AND ($3::text IS NULL OR schema_version = $3::text)
        ) AS latest_rollup_at`,
      [range.start, range.end, range.schemaVersion]
    );
    const status = freshness.rows[0] || {};
    return reportJson(
      buildFunnelReport(counts.rows, {
        ...range,
        latestRawEventAt: status.latest_raw_event_at,
        latestRollupAt: status.latest_rollup_at,
      })
    );
  } catch (error) {
    console.error("Assessment funnel reporting failed", error instanceof Error ? error.message : "unknown error");
    return reportJson({ ok: false, message: "The funnel report could not be generated." }, 500);
  } finally {
    client.release();
  }
};

export const config = {
  path: "/api/v1/admin/assessment-funnel",
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
