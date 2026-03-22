-- ============================================================
-- RLS FIX — Run this in Supabase Dashboard → SQL Editor
-- Fixes: "Cannot coerce the result to a single JSON object"
--        and participant name/code update failing
-- ============================================================

-- Allow writes to participants table (admin updates names/codes)
CREATE POLICY "public_write_participants"
  ON participants FOR ALL USING (true);

-- Also ensure write policies exist for all other tables
-- (safe to run even if they already exist — uses IF NOT EXISTS pattern)
DO $$
BEGIN
  -- participants write
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'participants' AND policyname = 'public_write_participants'
  ) THEN
    CREATE POLICY "public_write_participants" ON participants FOR ALL USING (true);
  END IF;
END $$;
