ALTER TABLE telegram_lead_invites
  ADD COLUMN IF NOT EXISTS member_hash TEXT,
  ADD COLUMN IF NOT EXISTS membership_status TEXT,
  ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS telegram_lead_invites_member_idx
  ON telegram_lead_invites (member_hash, used_at DESC)
  WHERE member_hash IS NOT NULL;
