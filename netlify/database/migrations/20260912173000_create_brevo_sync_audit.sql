CREATE TABLE IF NOT EXISTS assessment_brevo_syncs (
  assessment_id UUID PRIMARY KEY REFERENCES assessment_runs(assessment_id) ON DELETE CASCADE,
  contact_status TEXT NOT NULL DEFAULT 'pending',
  roadmap_status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error_code TEXT,
  brevo_message_id TEXT,
  last_attempt_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS assessment_brevo_sync_status_idx
  ON assessment_brevo_syncs (contact_status, roadmap_status, updated_at);
