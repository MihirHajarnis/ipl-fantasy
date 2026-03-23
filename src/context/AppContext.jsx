import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase, ADMIN_USERNAME, ADMIN_PASSWORD, ALL_SLOTS, PARTICIPANT_COLORS } from '../lib/supabase.js'
import {
  fetchLeaderboard, fetchParticipants, fetchParticipantByCode,
  fetchDraftAssignments, fetchDraftState,
  fetchMatches, fetchSlotTotals,
  fetchSwapRounds,
} from '../lib/api.js'

const AppCtx = createContext(null)

export function AppProvider({ children }) {
  const [user,         setUser]         = useState(null)          // { role, name, ...participant? }
  const [page,         setPage]         = useState('dashboard')
  const [focusSlot,    setFocusSlot]    = useState(null)
  const [focusMatch,   setFocusMatch]   = useState(null)

  // Data
  const [leaderboard,  setLeaderboard]  = useState([])
  const [participants, setParticipants] = useState([])
  const [slotTotals,   setSlotTotals]   = useState({})   // { slotId: { total_runs, ... } }
  const [matches,      setMatches]      = useState([])
  const [draftState,   setDraftState]   = useState({ cycle_completed: 0, is_committed: false })
  const [draftMap,     setDraftMap]     = useState({})   // { slotId: participantId }

  const [loading,      setLoading]      = useState(true)
  const [toasts,       setToasts]       = useState([])
  const [confetti,     setConfetti]     = useState(false)
  const [swapRounds,   setSwapRounds]   = useState([])

  // ── Toast ──────────────────────────────────────────────────

  const toast = useCallback((msg, type = 'success') => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }, [])

  // ── Load all data ──────────────────────────────────────────

  const loadAll = useCallback(async () => {
    try {
      const [lb, parts, slots, matchList, dState, dAssign, swapRds] = await Promise.all([
        fetchLeaderboard(),
        fetchParticipants(),
        fetchSlotTotals(),
        fetchMatches(),
        fetchDraftState(),
        fetchDraftAssignments(),
        fetchSwapRounds(),
      ])

      setLeaderboard(lb || [])
      setParticipants((parts || []).map((p, i) => ({ ...p, color: PARTICIPANT_COLORS[i] })))

      // slot totals as a map
      const stMap = {}
      ;(slots || []).forEach(s => { stMap[s.slot_id] = s })
      setSlotTotals(stMap)

      setMatches(matchList || [])
      setDraftState(dState || { cycle_completed: 0, is_committed: false })

      // draft map: slotId → participantId
      const dm = {}
      ;(dAssign || []).forEach(a => { dm[a.slot_id] = a.participant_id })
      setDraftMap(dm)
      setSwapRounds(swapRds || [])
    } catch (err) {
      console.error('loadAll error:', err)
      toast('Failed to load data — check Supabase config', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { loadAll() }, [loadAll])

  // ── Realtime subscriptions ─────────────────────────────────

  useEffect(() => {
    const scoresChannel = supabase
      .channel('scores-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'match_scores' },
        () => { loadAll() }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        () => { loadAll() }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'verifications' },
        () => { loadAll() }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'draft_assignments' },
        () => { loadAll() }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'swap_requests' },
        () => { loadAll() }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'power_swap_rounds' },
        () => { loadAll() }
      )
      .subscribe()

    return () => supabase.removeChannel(scoresChannel)
  }, [loadAll])

  // ── Auth ───────────────────────────────────────────────────

  const loginAdmin = (username, password) => {
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setUser({ role: 'admin', name: 'Commissioner' })
      setPage('admin-dashboard')
      toast('Welcome, Commissioner! 🛡')
      return true
    }
    toast('Invalid username or password', 'error')
    return false
  }

  const loginParticipant = async (code) => {
    const p = await fetchParticipantByCode(code)
    if (p) {
      const idx = participants.findIndex(x => x.id === p.id)
      const color = PARTICIPANT_COLORS[idx >= 0 ? idx : 0]
      setUser({ ...p, role: 'participant', color })
      setPage('dashboard')
      const lb = leaderboard.find(l => l.id === p.id)
      if (lb?.rank === 1) setTimeout(() => setConfetti(true), 600)
      toast(`Welcome back, ${p.name}! 🏏`)
      return true
    }
    toast('Invalid access code', 'error')
    return false
  }

  const logout = () => {
    setUser(null)
    setPage('dashboard')
    setConfetti(false)
  }

  // ── Helpers ────────────────────────────────────────────────

  // Get participant who owns a slot
  const getSlotOwner = useCallback((slotId) => {
    const pid = draftMap[slotId]
    return participants.find(p => p.id === pid) || null
  }, [draftMap, participants])

  // Get slots owned by a participant
  const getParticipantSlots = useCallback((participantId) => {
    return Object.entries(draftMap)
      .filter(([_, pid]) => pid === participantId)
      .map(([slotId]) => slotId)
  }, [draftMap])

  // Latest published match
  const latestMatch = matches.filter(m => m.published).at(-1) || null

  return (
    <AppCtx.Provider value={{
      user, loginAdmin, loginParticipant, logout,
      page, setPage, focusSlot, setFocusSlot, focusMatch, setFocusMatch,
      leaderboard, participants, slotTotals, matches, draftState, draftMap,
      latestMatch, getSlotOwner, getParticipantSlots,
      loading, toast, toasts, confetti, setConfetti,
      swapRounds, refresh: loadAll,
    }}>
      {children}
    </AppCtx.Provider>
  )
}

export const useApp = () => useContext(AppCtx)
