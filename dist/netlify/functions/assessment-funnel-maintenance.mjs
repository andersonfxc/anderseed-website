import { reportJson, reportingDatabase } from "./_assessment-reporting-utils.mjs";

const rollupQuery = `
  INSERT INTO assessment_funnel_daily (
    cohort_date,
    schema_version,
    event_name,
    question_id,
    question_number,
    assessment_sessions,
    updated_at
  )
  SELECT
    (server_timestamp AT TIME ZONE 'UTC')::date AS cohort_date,
    schema_version,
    event_name,
    COALESCE(question_id, '') AS question_id,
    COALESCE(question_number, 0) AS question_number,
    COUNT(DISTINCT analytics_session_id)::integer AS assessment_sessions,
    NOW() AS updated_at
  FROM assessment_events
  GROUP BY 1, 2, 3, 4, 5
  ON CONFLICT (cohort_date, schema_version, event_name, question_id, question_number)
  DO UPDATE SET
    assessment_sessions = EXCLUDED.assessment_sessions,
    updated_at = NOW()
`;

export default async () => {
  const db = reportingDatabase();
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const rollup = await client.query(rollupQuery);
    const purge = await client.query(
      "DELETE FROM assessment_events WHERE server_timestamp < NOW() - INTERVAL '7 days'"
    );
    const expiredRuns = await client.query(
      "DELETE FROM assessment_runs WHERE expires_at < NOW()"
    );
    await client.query("COMMIT");
    return reportJson({
      ok: true,
      rolledUpGroups: rollup.rowCount,
      purgedRawEvents: purge.rowCount,
      purgedExpiredAssessmentRuns: expiredRuns.rowCount,
      rawEventRetentionDays: 7,
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Assessment funnel maintenance failed", error instanceof Error ? error.message : "unknown error");
    return reportJson({ ok: false, message: "Assessment funnel maintenance failed." }, 500);
  } finally {
    client.release();
  }
};

export const config = {
  schedule: "15 2 * * *",
};
