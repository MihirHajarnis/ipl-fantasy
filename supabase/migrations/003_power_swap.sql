-- ============================================================
-- POWER SWAP — Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Power Swap Rounds ─────────────────────────────────────────
-- Tracks the two rounds (admin opens/closes/finalises)
CREATE TABLE IF NOT EXISTS power_swap_rounds (
  id            SERIAL PRIMARY KEY,
  round_number  INT NOT NULL CHECK (round_number IN (1, 2)),
  status        TEXT NOT NULL DEFAULT 'closed'
                     CHECK (status IN ('closed', 'open', 'finalised')),
  opened_at     TIMESTAMPTZ,
  finalised_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(round_number)
);

-- Seed the two rounds
INSERT INTO power_swap_rounds (round_number, status)
VALUES (1, 'closed'), (2, 'closed')
ON CONFLICT DO NOTHING;

-- ── Swap Requests ─────────────────────────────────────────────
-- One row per proposed swap between two participants
CREATE TABLE IF NOT EXISTS swap_requests (
  id                  SERIAL PRIMARY KEY,
  round_id            INT  REFERENCES power_swap_rounds(id) ON DELETE CASCADE,

  -- Who is proposing
  proposer_id         INT  REFERENCES participants(id),
  proposer_slot       TEXT REFERENCES batting_slots(id),

  -- Who they want to swap with
  receiver_id         INT  REFERENCES participants(id),
  receiver_slot       TEXT REFERENCES batting_slots(id),

  -- Status lifecycle:
  -- pending   → proposer sent, receiver hasn't responded
  -- accepted  → receiver agreed, waiting for admin to finalise
  -- declined  → receiver said no
  -- finalised → admin executed the swap
  -- cancelled → proposer withdrew, or round closed without finalising
  status              TEXT NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','accepted','declined','finalised','cancelled')),

  proposed_at         TIMESTAMPTZ DEFAULT now(),
  responded_at        TIMESTAMPTZ,
  finalised_at        TIMESTAMPTZ,

  -- Prevent duplicate proposals in the same round between same two parties
  UNIQUE(round_id, proposer_id, receiver_id)
);

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE power_swap_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE swap_requests      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_swap_rounds"    ON power_swap_rounds FOR SELECT USING (true);
CREATE POLICY "public_write_swap_rounds"   ON power_swap_rounds FOR ALL    USING (true);
CREATE POLICY "public_read_swap_requests"  ON swap_requests     FOR SELECT USING (true);
CREATE POLICY "public_write_swap_requests" ON swap_requests     FOR ALL    USING (true);

-- ── Realtime ──────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE power_swap_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE swap_requests;
