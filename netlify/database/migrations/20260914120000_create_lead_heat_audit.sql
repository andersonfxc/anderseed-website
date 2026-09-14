ALTER TABLE assessment_runs
  ADD COLUMN IF NOT EXISTS engagement_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS engagement_expires_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS lead_heat_events (
  assessment_id UUID NOT NULL REFERENCES assessment_runs(assessment_id) ON DELETE CASCADE,
  score_group TEXT NOT NULL,
  event_name TEXT NOT NULL,
  score_delta SMALLINT NOT NULL,
  source TEXT NOT NULL,
  scoring_version TEXT NOT NULL,
  downstream_sync_status TEXT NOT NULL DEFAULT 'pending',
  safe_error_code TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (assessment_id, score_group)
);

INSERT INTO lead_heat_events (
  assessment_id, score_group, event_name, score_delta, source,
  scoring_version, downstream_sync_status, occurred_at, created_at
)
SELECT assessment_id,
       CASE WHEN score_group = 'email_suppression' THEN 'marketing_subscription' ELSE score_group END,
       event_name, score_delta, 'brevo_webhook',
       'legacy', 'unknown', created_at, created_at
FROM brevo_lead_score_events
ON CONFLICT (assessment_id, score_group) DO NOTHING;

CREATE INDEX IF NOT EXISTS lead_heat_events_created_idx
  ON lead_heat_events (created_at DESC);

INSERT INTO lead_heat_events (
  assessment_id, score_group, event_name, score_delta, source,
  scoring_version, downstream_sync_status, occurred_at
)
SELECT assessment_id, 'assessment_completion', 'assessment_completed', 20,
       'assessment_migration', 'lead-heat-2026-09-14-v2', 'included_in_initial_sync', completed_at
FROM assessment_runs
ON CONFLICT (assessment_id, score_group) DO NOTHING;

INSERT INTO lead_heat_events (
  assessment_id, score_group, event_name, score_delta, source,
  scoring_version, downstream_sync_status, occurred_at
)
SELECT assessment_id, 'transition_timeline', 'transition_timeline',
       CASE transition_timeline
         WHEN 'asap' THEN 25
         WHEN 'one_to_three' THEN 20
         WHEN 'three_to_six' THEN 10
         WHEN 'six_to_twelve' THEN 5
         ELSE 0
       END,
       'assessment_migration', 'lead-heat-2026-09-14-v2', 'included_in_initial_sync', completed_at
FROM assessment_runs
ON CONFLICT (assessment_id, score_group) DO NOTHING;

CREATE TABLE IF NOT EXISTS lead_heat_change_audit (
  change_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES assessment_runs(assessment_id) ON DELETE CASCADE,
  score_group TEXT NOT NULL,
  previous_event_name TEXT,
  event_name TEXT NOT NULL,
  previous_group_delta SMALLINT NOT NULL,
  group_delta SMALLINT NOT NULL,
  score_delta SMALLINT NOT NULL,
  previous_score SMALLINT NOT NULL CHECK (previous_score BETWEEN 0 AND 100),
  lead_score SMALLINT NOT NULL CHECK (lead_score BETWEEN 0 AND 100),
  source TEXT NOT NULL,
  scoring_version TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lead_heat_change_audit_assessment_idx
  ON lead_heat_change_audit (assessment_id, created_at DESC);

CREATE TABLE IF NOT EXISTS telegram_lead_invites (
  invite_hash TEXT PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES assessment_runs(assessment_id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS telegram_lead_invites_assessment_idx
  ON telegram_lead_invites (assessment_id, created_at DESC);
