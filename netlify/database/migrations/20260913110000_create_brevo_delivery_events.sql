ALTER TABLE assessment_brevo_syncs
  ADD COLUMN IF NOT EXISTS email_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS last_event TEXT,
  ADD COLUMN IF NOT EXISTS last_event_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retry_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lead_score SMALLINT CHECK (lead_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS lead_tier TEXT,
  ADD COLUMN IF NOT EXISTS last_score_event TEXT,
  ADD COLUMN IF NOT EXISTS last_score_delta SMALLINT NOT NULL DEFAULT 0;

UPDATE assessment_brevo_syncs AS sync
SET lead_score = runs.initial_lead_score,
    lead_tier = runs.lead_temperature
FROM assessment_runs AS runs
WHERE runs.assessment_id = sync.assessment_id
  AND sync.lead_score IS NULL;

CREATE TABLE IF NOT EXISTS brevo_webhook_events (
  event_key TEXT PRIMARY KEY,
  assessment_id UUID REFERENCES assessment_runs(assessment_id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  brevo_message_id TEXT,
  event_timestamp TIMESTAMPTZ NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'received',
  contact_sync_status TEXT NOT NULL DEFAULT 'pending',
  safe_error_code TEXT,
  score_delta SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS brevo_lead_score_events (
  assessment_id UUID NOT NULL REFERENCES assessment_runs(assessment_id) ON DELETE CASCADE,
  score_group TEXT NOT NULL,
  event_name TEXT NOT NULL,
  score_delta SMALLINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (assessment_id, score_group)
);

CREATE INDEX IF NOT EXISTS brevo_webhook_assessment_idx
  ON brevo_webhook_events (assessment_id, event_timestamp);

CREATE INDEX IF NOT EXISTS brevo_webhook_message_idx
  ON brevo_webhook_events (brevo_message_id, event_timestamp);
