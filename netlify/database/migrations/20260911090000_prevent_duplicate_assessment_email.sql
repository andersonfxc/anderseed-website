CREATE TABLE IF NOT EXISTS assessment_email_claims (
  email_hash TEXT PRIMARY KEY,
  assessment_id UUID NOT NULL UNIQUE REFERENCES assessment_runs(assessment_id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO assessment_email_claims (email_hash, assessment_id, claimed_at)
SELECT DISTINCT ON (email_hash)
  email_hash,
  assessment_id,
  created_at
FROM assessment_contacts
WHERE email_hash <> ''
ORDER BY email_hash, created_at, assessment_id
ON CONFLICT DO NOTHING;
