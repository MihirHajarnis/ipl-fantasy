-- ============================================================
-- IPL FANTASY LEAGUE — SUPABASE SCHEMA
-- Run this entire file in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── TEAMS & SLOTS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ipl_teams (
  id TEXT PRIMARY KEY  -- 'MI', 'RCB', etc.
);

INSERT INTO ipl_teams VALUES
  ('MI'),('RCB'),('KKR'),('DC'),('SRH'),
  ('PBKS'),('RR'),('CSK'),('LSG'),('GT')
ON CONFLICT DO NOTHING;

-- 60 batting slots: MI1..MI6, RCB1..RCB6, ...
CREATE TABLE IF NOT EXISTS batting_slots (
  id          TEXT PRIMARY KEY,   -- 'MI1', 'RCB3', etc.
  team_id     TEXT REFERENCES ipl_teams(id),
  slot_number INT  NOT NULL CHECK (slot_number BETWEEN 1 AND 6)
);

INSERT INTO batting_slots (id, team_id, slot_number)
SELECT t.id || s.n, t.id, s.n
FROM ipl_teams t
CROSS JOIN (SELECT generate_series(1,6) AS n) s
ON CONFLICT DO NOTHING;

-- ── PARTICIPANTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS participants (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  access_code TEXT NOT NULL UNIQUE,   -- e.g. 'ASH001'
  color       TEXT NOT NULL DEFAULT '#22C55E',
  created_at  TIMESTAMPTZ DEFAULT now()
);

INSERT INTO participants (name, access_code, color) VALUES
  ('Ashay',      'ASH001', '#22C55E'),
  ('Kunal',      'KUN002', '#3B82F6'),
  ('Tanmay',     'TAN003', '#F59E0B'),
  ('Mihir',      'MIH004', '#A855F7'),
  ('Pratik',     'PRA005', '#EF4444'),
  ('Santosh',    'SAN006', '#06B6D4'),
  ('Tushar',     'TUS007', '#EC4899'),
  ('Pratham',    'PTH008', '#14B8A6'),
  ('Padmanabh',  'PAD009', '#F97316'),
  ('Vishal',     'VIS010', '#84CC16'),
  ('Arvind',     'ARV011', '#8B5CF6'),
  ('Mit',        'MIT012', '#E11D48')
ON CONFLICT DO NOTHING;

-- ── DRAFT ─────────────────────────────────────────────────────
-- Stores which participant owns which batting slot
CREATE TABLE IF NOT EXISTS draft_assignments (
  id             SERIAL PRIMARY KEY,
  participant_id INT  REFERENCES participants(id) ON DELETE CASCADE,
  slot_id        TEXT REFERENCES batting_slots(id),
  cycle          INT  NOT NULL CHECK (cycle BETWEEN 1 AND 5),
  assigned_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(slot_id)   -- each slot owned by exactly one participant
);

-- ── MATCHES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matches (
  id           SERIAL PRIMARY KEY,
  label        TEXT NOT NULL,          -- 'M1', 'M2', ...
  home_team    TEXT REFERENCES ipl_teams(id),
  away_team    TEXT REFERENCES ipl_teams(id),
  match_date   DATE,
  published    BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ── MATCH SCORES (per slot per match) ─────────────────────────
-- Runs = points. Balls/fours/sixes = visualization only.
CREATE TABLE IF NOT EXISTS match_scores (
  id         SERIAL PRIMARY KEY,
  match_id   INT  REFERENCES matches(id) ON DELETE CASCADE,
  slot_id    TEXT REFERENCES batting_slots(id),
  runs       INT NOT NULL DEFAULT 0,
  balls      INT NOT NULL DEFAULT 0,
  fours      INT NOT NULL DEFAULT 0,
  sixes      INT NOT NULL DEFAULT 0,
  entered_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(match_id, slot_id)
);

-- ── VERIFICATIONS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS verifications (
  id             SERIAL PRIMARY KEY,
  match_id       INT  REFERENCES matches(id) ON DELETE CASCADE,
  slot_id        TEXT REFERENCES batting_slots(id),
  participant_id INT  REFERENCES participants(id),
  status         TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','verified','disputed')),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(match_id, slot_id, participant_id)
);

-- ── DRAFT STATE ───────────────────────────────────────────────
-- Single-row table tracking draft progress
CREATE TABLE IF NOT EXISTS draft_state (
  id              INT PRIMARY KEY DEFAULT 1,
  cycle_completed INT NOT NULL DEFAULT 0,
  is_committed    BOOLEAN DEFAULT false,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

INSERT INTO draft_state (id, cycle_completed, is_committed)
VALUES (1, 0, false)
ON CONFLICT DO NOTHING;

-- ── VIEWS ─────────────────────────────────────────────────────

-- Participant totals (leaderboard)
CREATE OR REPLACE VIEW leaderboard AS
SELECT
  p.id,
  p.name,
  p.access_code,
  p.color,
  COALESCE(SUM(ms.runs), 0) AS total_runs,
  RANK() OVER (ORDER BY COALESCE(SUM(ms.runs), 0) DESC) AS rank
FROM participants p
LEFT JOIN draft_assignments da ON da.participant_id = p.id
LEFT JOIN match_scores ms ON ms.slot_id = da.slot_id
  AND ms.match_id IN (SELECT id FROM matches WHERE published = true)
GROUP BY p.id, p.name, p.access_code, p.color;

-- Slot season totals
CREATE OR REPLACE VIEW slot_season_totals AS
SELECT
  bs.id AS slot_id,
  bs.team_id,
  bs.slot_number,
  COALESCE(SUM(ms.runs),  0) AS total_runs,
  COALESCE(SUM(ms.balls), 0) AS total_balls,
  COALESCE(SUM(ms.fours), 0) AS total_fours,
  COALESCE(SUM(ms.sixes), 0) AS total_sixes
FROM batting_slots bs
LEFT JOIN match_scores ms ON ms.slot_id = bs.id
  AND ms.match_id IN (SELECT id FROM matches WHERE published = true)
GROUP BY bs.id, bs.team_id, bs.slot_number;

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
ALTER TABLE participants      ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches            ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_scores       ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_state        ENABLE ROW LEVEL SECURITY;

-- Public read for all tables (participants read leaderboard etc.)
CREATE POLICY "public_read_participants"      ON participants      FOR SELECT USING (true);
CREATE POLICY "public_read_draft"             ON draft_assignments FOR SELECT USING (true);
CREATE POLICY "public_read_matches"           ON matches           FOR SELECT USING (true);
CREATE POLICY "public_read_scores"            ON match_scores      FOR SELECT USING (true);
CREATE POLICY "public_read_verifications"     ON verifications     FOR SELECT USING (true);
CREATE POLICY "public_read_draft_state"       ON draft_state       FOR SELECT USING (true);

-- Only service-role (admin) can write — enforced via Supabase service key
-- used in admin API calls (never exposed to browser)
CREATE POLICY "admin_write_matches"      ON matches           FOR ALL USING (true);
CREATE POLICY "admin_write_scores"       ON match_scores      FOR ALL USING (true);
CREATE POLICY "admin_write_draft"        ON draft_assignments FOR ALL USING (true);
CREATE POLICY "admin_write_draft_state" ON draft_state        FOR ALL USING (true);

-- Participants can write their own verifications
CREATE POLICY "participant_verify" ON verifications FOR ALL USING (true);

-- ── REALTIME ──────────────────────────────────────────────────
-- Enable realtime on key tables so scores push live
ALTER PUBLICATION supabase_realtime ADD TABLE match_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE verifications;
ALTER PUBLICATION supabase_realtime ADD TABLE draft_assignments;
