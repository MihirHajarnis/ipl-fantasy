import { supabase } from './supabase.js'

// ── LEADERBOARD ───────────────────────────────────────────────

export async function fetchLeaderboard() {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .order('rank', { ascending: true })
  if (error) throw error
  return data
}

// ── PARTICIPANTS ──────────────────────────────────────────────

export async function fetchParticipants() {
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .order('id')
  if (error) throw error
  return data
}


// ── Update participant name / access code ─────────────────────
export async function updateParticipant(id, name, accessCode) {
  // Use update without .single() to avoid coercion errors
  const { data, error } = await supabase
    .from('participants')
    .update({ name: name.trim(), access_code: accessCode.toUpperCase().trim() })
    .eq('id', id)
    .select()
  if (error) throw error
  // data is an array — return first row
  return data?.[0] || null
}

export async function fetchParticipantByCode(code) {
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('access_code', code.toUpperCase().trim())
    .single()
  if (error) return null
  return data
}

// ── DRAFT ─────────────────────────────────────────────────────

export async function fetchDraftAssignments() {
  const { data, error } = await supabase
    .from('draft_assignments')
    .select('*, participants(name, color)')
    .order('participant_id')
  if (error) throw error
  return data
}

export async function fetchDraftState() {
  const { data, error } = await supabase
    .from('draft_state')
    .select('*')
    .eq('id', 1)
    .single()
  if (error) throw error
  return data
}

export async function saveDraftCycle(assignments, newCycleCount) {
  // assignments: [{ participant_id, slot_id, cycle }]
  const { error: insertErr } = await supabase
    .from('draft_assignments')
    .upsert(assignments, { onConflict: 'slot_id' })
  if (insertErr) throw insertErr

  const { error: stateErr } = await supabase
    .from('draft_state')
    .update({ cycle_completed: newCycleCount, updated_at: new Date().toISOString() })
    .eq('id', 1)
  if (stateErr) throw stateErr
}

export async function commitDraft() {
  const { error } = await supabase
    .from('draft_state')
    .update({ is_committed: true, updated_at: new Date().toISOString() })
    .eq('id', 1)
  if (error) throw error
}

export async function resetDraft() {
  await supabase.from('draft_assignments').delete().neq('id', 0)
  await supabase
    .from('draft_state')
    .update({ cycle_completed: 0, is_committed: false, updated_at: new Date().toISOString() })
    .eq('id', 1)
}

// ── MATCHES ───────────────────────────────────────────────────

export async function fetchMatches() {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('id', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createMatch(label, homeTeam, awayTeam, matchDate) {
  const { data, error } = await supabase
    .from('matches')
    .insert({ label, home_team: homeTeam, away_team: awayTeam, match_date: matchDate })
    .select()
    .single()
  if (error) throw error
  return data
}

// ── SCORES ────────────────────────────────────────────────────

export async function fetchScoresForMatch(matchId) {
  const { data, error } = await supabase
    .from('match_scores')
    .select('*')
    .eq('match_id', matchId)
  if (error) throw error
  return data || []
}

export async function fetchAllPublishedScores() {
  const { data, error } = await supabase
    .from('match_scores')
    .select('*, matches!inner(published)')
    .eq('matches.published', true)
  if (error) throw error
  return data || []
}

export async function upsertScores(matchId, scoreRows) {
  // scoreRows: [{ slot_id, runs, balls, fours, sixes }]
  const rows = scoreRows.map(r => ({
    match_id: matchId,
    slot_id:  r.slot_id,
    runs:     r.runs  || 0,
    balls:    r.balls || 0,
    fours:    r.fours || 0,
    sixes:    r.sixes || 0,
    entered_at: new Date().toISOString(),
  }))
  const { error } = await supabase
    .from('match_scores')
    .upsert(rows, { onConflict: 'match_id,slot_id' })
  if (error) throw error
}

export async function publishMatch(matchId) {
  const { error } = await supabase
    .from('matches')
    .update({ published: true, published_at: new Date().toISOString() })
    .eq('id', matchId)
  if (error) throw error
}

// ── Delete a single slot's score for a match ──────────────────
// Removes the row entirely — slot shows as 0 runs on leaderboard
export async function deleteScore(matchId, slotId) {
  const { error } = await supabase
    .from('match_scores')
    .delete()
    .eq('match_id', matchId)
    .eq('slot_id', slotId)
  if (error) throw error
}

// ── Unpublish a match (revert to draft) ───────────────────────
// Scores are kept in DB, just hidden from leaderboard until re-published
export async function unpublishMatch(matchId) {
  const { error } = await supabase
    .from('matches')
    .update({ published: false, published_at: null })
    .eq('id', matchId)
  if (error) throw error
}

// ── Delete an entire match and all its scores ─────────────────
export async function deleteMatch(matchId) {
  // match_scores will cascade delete via FK constraint
  const { error } = await supabase
    .from('matches')
    .delete()
    .eq('id', matchId)
  if (error) throw error
}

// ── SLOT SEASON TOTALS ────────────────────────────────────────

export async function fetchSlotTotals() {
  const { data, error } = await supabase
    .from('slot_season_totals')
    .select('*')
  if (error) throw error
  return data || []
}

// Per-match history for a single slot
export async function fetchSlotHistory(slotId) {
  const { data, error } = await supabase
    .from('match_scores')
    .select('*, matches(label, match_date, published)')
    .eq('slot_id', slotId)
    .eq('matches.published', true)
    .order('match_id', { ascending: true })
  if (error) throw error
  return (data || []).filter(r => r.matches?.published)
}

// ── VERIFICATIONS ─────────────────────────────────────────────

export async function fetchVerificationsForParticipant(participantId, matchId) {
  const { data, error } = await supabase
    .from('verifications')
    .select('*')
    .eq('participant_id', participantId)
    .eq('match_id', matchId)
  if (error) throw error
  return data || []
}

export async function fetchAllVerifications(matchId) {
  const { data, error } = await supabase
    .from('verifications')
    .select('*')
    .eq('match_id', matchId)
  if (error) throw error
  return data || []
}

export async function upsertVerification(matchId, slotId, participantId, status) {
  const { error } = await supabase
    .from('verifications')
    .upsert({
      match_id:       matchId,
      slot_id:        slotId,
      participant_id: participantId,
      status,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'match_id,slot_id,participant_id' })
  if (error) throw error
}
