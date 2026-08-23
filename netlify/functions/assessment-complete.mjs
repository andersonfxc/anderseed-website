import { randomBytes } from "node:crypto";
import {
  assessmentContent,
  scoringConfig,
  scoring,
  database,
  enforceSameOrigin,
  errorResponse,
  jsonResponse,
  publicResult,
  readJsonBody,
  sha256,
  validUuid,
} from "./_assessment-utils.mjs";

export default async (request) => {
  if (request.method !== "POST") return errorResponse("Method not allowed", 405);
  if (!enforceSameOrigin(request)) return errorResponse("Cross-origin submissions are not accepted", 403);

  try {
    const body = await readJsonBody(request);
    if (!validUuid(body.assessmentId)) return errorResponse("A valid assessment ID is required");
    if (body.schemaVersion !== assessmentContent.schemaVersion || body.scoringVersion !== scoringConfig.scoringVersion) {
      return errorResponse("This assessment version is no longer current. Please refresh and try again.", 409);
    }
    const validation = scoring.validateAnswers(body.answers, assessmentContent.questions);
    if (!validation.valid) return errorResponse("Please complete all eight assessment questions.");

    const result = scoring.scoreAssessment(body.answers, scoringConfig);
    const completionToken = randomBytes(32).toString("base64url");
    const tokenHash = sha256(completionToken);
    const db = database();
    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");
      const upsert = await client.query(
        `INSERT INTO assessment_runs (
          assessment_id, schema_version, scoring_version, completion_token_hash, answers_json, result_json,
          readiness_score, growth_stage, analytical_score, transferable_score, development_score, market_score,
          strongest_area, primary_growth_area, recommended_next_move, career_position, ba_exposure,
          transition_timeline, initial_lead_score, lead_temperature, completed_at, email_gate_viewed_at, expires_at, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,NOW(),NOW(),NOW() + INTERVAL '7 days',NOW()
        )
        ON CONFLICT (assessment_id) DO UPDATE SET
          schema_version=EXCLUDED.schema_version,
          scoring_version=EXCLUDED.scoring_version,
          completion_token_hash=EXCLUDED.completion_token_hash,
          answers_json=EXCLUDED.answers_json,
          result_json=EXCLUDED.result_json,
          readiness_score=EXCLUDED.readiness_score,
          growth_stage=EXCLUDED.growth_stage,
          analytical_score=EXCLUDED.analytical_score,
          transferable_score=EXCLUDED.transferable_score,
          development_score=EXCLUDED.development_score,
          market_score=EXCLUDED.market_score,
          strongest_area=EXCLUDED.strongest_area,
          primary_growth_area=EXCLUDED.primary_growth_area,
          recommended_next_move=EXCLUDED.recommended_next_move,
          career_position=EXCLUDED.career_position,
          ba_exposure=EXCLUDED.ba_exposure,
          transition_timeline=EXCLUDED.transition_timeline,
          initial_lead_score=EXCLUDED.initial_lead_score,
          lead_temperature=EXCLUDED.lead_temperature,
          completed_at=NOW(),
          email_gate_viewed_at=NOW(),
          expires_at=NOW() + INTERVAL '7 days',
          updated_at=NOW()
        WHERE assessment_runs.contact_submitted_at IS NULL`,
        [
          body.assessmentId,
          result.schemaVersion,
          result.scoringVersion,
          tokenHash,
          JSON.stringify(body.answers),
          JSON.stringify(result),
          result.readinessScore,
          result.readinessStage,
          result.dimensions.analyticalProblemSolving,
          result.dimensions.transferableExperience,
          result.dimensions.baDevelopment,
          result.dimensions.marketReadiness,
          result.strongestArea.key,
          result.primaryGrowthAreaKey,
          result.recommendedNextMove.title,
          body.answers.careerPosition,
          body.answers.baExposure,
          body.answers.transitionTimeline,
          result.initialLeadScore,
          result.leadTemperature,
        ]
      );
      if (upsert.rowCount !== 1) {
        await client.query("ROLLBACK");
        return errorResponse("This assessment has already been securely completed.", 409);
      }
      await client.query("DELETE FROM assessment_answers WHERE assessment_id = $1", [body.assessmentId]);
      for (const question of assessmentContent.questions) {
        const values = Array.isArray(body.answers[question.id]) ? body.answers[question.id] : [body.answers[question.id]];
        for (let index = 0; index < values.length; index += 1) {
          await client.query(
            "INSERT INTO assessment_answers (assessment_id, question_id, answer_value, selection_order) VALUES ($1,$2,$3,$4)",
            [body.assessmentId, question.id, values[index], index]
          );
        }
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return jsonResponse({ ok: true, assessmentId: body.assessmentId, completionToken, result: publicResult(result) }, 201);
  } catch {
    return errorResponse("We could not securely prepare your result. Please try again.", 500);
  }
};

export const config = {
  path: "/api/v1/assessment/complete",
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
