CREATE TABLE IF NOT EXISTS assessment_runs (
  assessment_id UUID PRIMARY KEY,
  schema_version TEXT NOT NULL,
  scoring_version TEXT NOT NULL,
  completion_token_hash TEXT NOT NULL,
  answers_json JSONB NOT NULL,
  result_json JSONB NOT NULL,
  readiness_score SMALLINT NOT NULL CHECK (readiness_score BETWEEN 0 AND 100),
  growth_stage TEXT NOT NULL,
  analytical_score SMALLINT NOT NULL CHECK (analytical_score BETWEEN 0 AND 100),
  transferable_score SMALLINT NOT NULL CHECK (transferable_score BETWEEN 0 AND 100),
  development_score SMALLINT NOT NULL CHECK (development_score BETWEEN 0 AND 100),
  market_score SMALLINT NOT NULL CHECK (market_score BETWEEN 0 AND 100),
  strongest_area TEXT NOT NULL,
  primary_growth_area TEXT NOT NULL,
  recommended_next_move TEXT NOT NULL,
  career_position TEXT NOT NULL,
  ba_exposure TEXT NOT NULL,
  transition_timeline TEXT NOT NULL,
  initial_lead_score SMALLINT NOT NULL CHECK (initial_lead_score BETWEEN 0 AND 100),
  lead_temperature TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email_gate_viewed_at TIMESTAMPTZ,
  contact_submitted_at TIMESTAMPTZ,
  result_viewed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assessment_answers (
  assessment_id UUID NOT NULL REFERENCES assessment_runs(assessment_id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  answer_value TEXT NOT NULL,
  selection_order SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (assessment_id, question_id, answer_value)
);

CREATE TABLE IF NOT EXISTS assessment_contacts (
  assessment_id UUID PRIMARY KEY REFERENCES assessment_runs(assessment_id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  email TEXT NOT NULL,
  email_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS assessment_contacts_email_hash_idx ON assessment_contacts(email_hash);

CREATE TABLE IF NOT EXISTS assessment_marketing_consents (
  assessment_id UUID PRIMARY KEY REFERENCES assessment_runs(assessment_id) ON DELETE CASCADE,
  opted_in BOOLEAN NOT NULL,
  consent_text_version TEXT NOT NULL,
  decision_captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opted_in_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS assessment_events (
  event_id UUID PRIMARY KEY,
  analytics_session_id UUID NOT NULL,
  event_name TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  scoring_version TEXT NOT NULL,
  question_id TEXT,
  question_number SMALLINT,
  client_timestamp TIMESTAMPTZ,
  server_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS assessment_events_step_idx ON assessment_events(event_name, question_number, server_timestamp);
CREATE INDEX IF NOT EXISTS assessment_events_session_idx ON assessment_events(analytics_session_id, server_timestamp);

CREATE TABLE IF NOT EXISTS assessment_funnel_daily (
  cohort_date DATE NOT NULL,
  schema_version TEXT NOT NULL,
  event_name TEXT NOT NULL,
  question_id TEXT NOT NULL DEFAULT '',
  question_number SMALLINT NOT NULL DEFAULT 0,
  assessment_sessions INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (cohort_date, schema_version, event_name, question_id, question_number)
);
