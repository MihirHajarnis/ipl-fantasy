-- ============================================================
-- AUDIT LOG — Run in Supabase Dashboard → SQL Editor
-- Tracks every score entry and edit with full diff history
-- ============================================================

CREATE TABLE IF NOT EXISTS score_audit_log (
  id          SERIAL PRIMARY KEY,
  match_id    INT  REFERENCES matches(id) ON DELETE CASCADE,
  slot_id     TEXT REFERENCES batting_slots(id),
  action      TEXT NOT NULL CHECK (action IN ('created','updated','deleted')),
  old_runs    INT, old_balls INT, old_fours INT, old_sixes INT,
  new_runs    INT, new_balls INT, new_fours INT, new_sixes INT,
  entered_by  TEXT NOT NULL DEFAULT 'Admin',
  entered_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE score_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_audit"  ON score_audit_log FOR SELECT USING (true);
CREATE POLICY "public_write_audit" ON score_audit_log FOR ALL    USING (true);

-- Also store previous rank in leaderboard snapshots for rank change tracking
-- We use a simple column added to matches to store JSON snapshot
ALTER TABLE matches ADD COLUMN IF NOT EXISTS rank_snapshot JSONB DEFAULT '{}';

ALTER PUBLICATION supabase_realtime ADD TABLE score_audit_log;
