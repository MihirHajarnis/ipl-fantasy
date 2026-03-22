import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { SlotBadge, Avatar, ScoreInput } from '../components/ui.jsx'
import { IPL_TEAMS, TEAM_META, ALL_SLOTS } from '../lib/supabase.js'
import {
  fetchScoresForMatch, upsertScores,
  publishMatch, unpublishMatch,
  deleteScore, deleteMatch,
  createMatch,
} from '../lib/api.js'

export default function AdminScores() {
  const { matches, participants, getParticipantSlots, toast, refresh } = useApp()

  const [selectedMatchId, setSelected]  = useState(null)
  const [inputs,     setInputs]    = useState({})   // { slotId: {runs,balls,fours,sixes} }
  const [savedRows,  setSavedRows] = useState({})   // rows currently in DB for this match
  const [saving,     setSaving]    = useState(false)
  const [publishing, setPub]       = useState(false)
  const [filterTeam, setFT]        = useState('ALL')
  const [filterPart, setFP]        = useState('ALL')
  const [showNew,    setShowNew]   = useState(false)
  const [newLabel,   setNewLabel]  = useState('')
  const [newHome,    setNewHome]   = useState('')
  const [newAway,    setNewAway]   = useState('')
  const [newDate,    setNewDate]   = useState('')
  // Confirm dialog state
  const [confirm,    setConfirm]   = useState(null)  // { type, slotId? }

  const selectedMatch = matches.find(m => m.id === selectedMatchId)

  // Load existing scores whenever match changes
  useEffect(() => {
    if (!selectedMatchId) return
    fetchScoresForMatch(selectedMatchId).then(rows => {
      const map = {}
      rows.forEach(r => {
        map[r.slot_id] = { runs: r.runs, balls: r.balls, fours: r.fours, sixes: r.sixes }
      })
      setInputs(map)
      setSavedRows(map)  // track what's actually in DB
    })
  }, [selectedMatchId])

  const setVal = (slot, field, val) =>
    setInputs(p => ({ ...p, [slot]: { ...(p[slot] || {}), [field]: parseInt(val) || 0 } }))
  const getVal = (slot, field) => inputs[slot]?.[field] || 0

  const filledSlots = ALL_SLOTS.filter(s => (inputs[s]?.runs || 0) > 0)
  const savedSlots  = Object.keys(savedRows).filter(s => (savedRows[s]?.runs || 0) > 0)

  // ── Save / Publish ───────────────────────────────────────────

  const handleSave = async () => {
    if (!selectedMatchId) { toast('Select a match first', 'error'); return }
    setSaving(true)
    try {
      const rows = Object.entries(inputs).map(([slot_id, v]) => ({ slot_id, ...v }))
      await upsertScores(selectedMatchId, rows)
      setSavedRows({ ...inputs })
      toast('Scores saved ✓')
      refresh()
    } catch (e) { toast('Save failed: ' + e.message, 'error') }
    finally { setSaving(false) }
  }

  const handlePublish = async () => {
    if (!selectedMatchId) { toast('Select a match first', 'error'); return }
    if (filledSlots.length === 0) { toast('Enter at least one slot\'s runs', 'error'); return }
    setPub(true)
    try {
      const rows = Object.entries(inputs).map(([slot_id, v]) => ({ slot_id, ...v }))
      await upsertScores(selectedMatchId, rows)
      await publishMatch(selectedMatchId)
      setSavedRows({ ...inputs })
      toast('Scores published! 🚀')
      refresh()
    } catch (e) { toast('Publish failed: ' + e.message, 'error') }
    finally { setPub(false) }
  }

  // ── Delete a single slot score ───────────────────────────────

  const handleDeleteScore = async (slotId) => {
    setConfirm(null)
    try {
      await deleteScore(selectedMatchId, slotId)
      // Remove from local state
      setInputs(p => { const n = { ...p }; delete n[slotId]; return n })
      setSavedRows(p => { const n = { ...p }; delete n[slotId]; return n })
      toast(`Score for ${slotId} deleted`)
      refresh()
    } catch (e) { toast('Delete failed: ' + e.message, 'error') }
  }

  // ── Unpublish match ──────────────────────────────────────────

  const handleUnpublish = async () => {
    setConfirm(null)
    try {
      await unpublishMatch(selectedMatchId)
      toast('Match unpublished — scores hidden from leaderboard', 'warning')
      refresh()
    } catch (e) { toast('Failed: ' + e.message, 'error') }
  }

  // ── Delete entire match ──────────────────────────────────────

  const handleDeleteMatch = async () => {
    setConfirm(null)
    try {
      await deleteMatch(selectedMatchId)
      setSelected(null)
      setInputs({})
      setSavedRows({})
      toast('Match and all scores deleted', 'warning')
      refresh()
    } catch (e) { toast('Failed: ' + e.message, 'error') }
  }

  // ── Create new match ─────────────────────────────────────────

  const handleCreateMatch = async () => {
    if (!newLabel) { toast('Enter a match label', 'error'); return }
    try {
      const m = await createMatch(newLabel, newHome || null, newAway || null, newDate || null)
      toast(`Match ${newLabel} created`)
      setSelected(m.id); setShowNew(false)
      setNewLabel(''); setNewHome(''); setNewAway(''); setNewDate('')
      refresh()
    } catch (e) { toast('Failed: ' + e.message, 'error') }
  }

  // ── Filtered slots ───────────────────────────────────────────

  let filteredSlots = ALL_SLOTS
  if (filterTeam !== 'ALL') filteredSlots = filteredSlots.filter(s => s.startsWith(filterTeam))
  if (filterPart !== 'ALL') {
    const p = participants.find(x => x.id === parseInt(filterPart))
    if (p) { const ps = getParticipantSlots(p.id); filteredSlots = filteredSlots.filter(s => ps.includes(s)) }
  }

  const sr = (r, b) => b > 0 ? ((r / b) * 100).toFixed(1) : '—'

  // ── Confirm dialog ───────────────────────────────────────────

  const ConfirmDialog = () => {
    if (!confirm) return null
    const messages = {
      deleteScore:  { title: 'Delete Score?',          body: `Remove ${confirm.slotId}'s score for ${selectedMatch?.label}? This will update the leaderboard.`,   action: () => handleDeleteScore(confirm.slotId), color: '#EF4444' },
      unpublish:    { title: 'Unpublish Match?',        body: `${selectedMatch?.label} scores will be hidden from the leaderboard until re-published.`,              action: handleUnpublish,   color: '#F59E0B' },
      deleteMatch:  { title: 'Delete Entire Match?',   body: `All scores for ${selectedMatch?.label} will be permanently deleted. This cannot be undone.`,          action: handleDeleteMatch, color: '#EF4444' },
    }
    const cfg = messages[confirm.type]
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: '#0A111E', borderRadius: 16, border: `1px solid ${cfg.color}44`, padding: 28, maxWidth: 380, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>⚠️</div>
          <h3 style={{ color: 'white', fontWeight: 800, fontSize: 17, marginBottom: 10 }}>{cfg.title}</h3>
          <p style={{ color: '#94A3B8', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>{cfg.body}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={() => setConfirm(null)} style={{ padding: '12px', background: '#060E1A', border: '1px solid #1E293B', borderRadius: 9, color: '#94A3B8', cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit' }}>
              Cancel
            </button>
            <button onClick={cfg.action} style={{ padding: '12px', background: cfg.color, border: 'none', borderRadius: 9, color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 800, fontFamily: 'inherit' }}>
              Confirm
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 16 }}>
      <ConfirmDialog />

      <div style={{ marginBottom: 16 }}>
        <h1 style={{ color: 'white', fontSize: 20, fontWeight: 800, marginBottom: 3 }}>✏️ Enter / Edit Scores</h1>
        <p style={{ color: '#64748B', fontSize: 13 }}>Runs count toward leaderboard · you can edit or delete any score</p>
      </div>

      {/* Match selector */}
      <div style={{ background: '#0A111E', borderRadius: 12, border: '1px solid #0F1E35', padding: 14, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>Select Match</span>
          <button onClick={() => setShowNew(s => !s)} style={{ padding: '6px 12px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 7, color: '#3B82F6', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>
            + New Match
          </button>
        </div>

        {showNew && (
          <div style={{ background: '#060E1A', borderRadius: 9, padding: 14, marginBottom: 12, border: '1px solid #1E293B' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              {[['Label','M9',newLabel,setNewLabel],['Date','2025-04-20',newDate,setNewDate],['Home','MI',newHome,setNewHome],['Away','RCB',newAway,setNewAway]].map(([lbl,ph,val,set]) => (
                <div key={lbl}>
                  <div style={{ color: '#64748B', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{lbl}</div>
                  <input value={val} onChange={e => set(e.target.value)} placeholder={ph}
                    style={{ width: '100%', padding: '8px 10px', background: '#0A111E', border: '1px solid #1E293B', borderRadius: 7, color: 'white', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = '#22C55E'}
                    onBlur={e => e.target.style.borderColor = '#1E293B'}
                  />
                </div>
              ))}
            </div>
            <button onClick={handleCreateMatch} style={{ padding: '8px 16px', background: '#22C55E', border: 'none', borderRadius: 7, color: '#060E1A', fontWeight: 800, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
              Create Match
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {matches.length === 0 && <span style={{ color: '#334155', fontSize: 13 }}>No matches yet — create one above</span>}
          {matches.map(m => (
            <button key={m.id} onClick={() => setSelected(m.id)} style={{
              padding: '7px 14px', borderRadius: 8,
              border: `1px solid ${selectedMatchId === m.id ? '#22C55E' : '#1E293B'}`,
              background: selectedMatchId === m.id ? 'rgba(34,197,94,0.12)' : '#060E1A',
              color: selectedMatchId === m.id ? '#22C55E' : '#64748B',
              cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {m.label}
              {m.published && <span style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4 }}>LIVE</span>}
            </button>
          ))}
        </div>
      </div>

      {selectedMatch && (
        <>
          {/* Match info + danger actions */}
          <div style={{ background: '#0A111E', borderRadius: 10, border: '1px solid #0F1E35', padding: '12px 14px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>{selectedMatch.label}</span>
              {selectedMatch.home_team && <span style={{ color: '#64748B', fontSize: 13 }}>{selectedMatch.home_team} vs {selectedMatch.away_team}</span>}
              {selectedMatch.match_date && <span style={{ color: '#475569', fontSize: 12 }}>{selectedMatch.match_date}</span>}

              <div style={{ marginLeft: 'auto', display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {/* Publish status */}
                {selectedMatch.published
                  ? <span style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22C55E', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>✓ Published</span>
                  : <span style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#F59E0B', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>Draft</span>
                }

                {/* Unpublish button — only if published */}
                {selectedMatch.published && (
                  <button onClick={() => setConfirm({ type: 'unpublish' })} style={{ padding: '4px 12px', background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.28)', borderRadius: 6, color: '#F59E0B', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>
                    ↩ Unpublish
                  </button>
                )}

                {/* Delete match */}
                <button onClick={() => setConfirm({ type: 'deleteMatch' })} style={{ padding: '4px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 6, color: '#EF4444', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>
                  🗑 Delete Match
                </button>
              </div>
            </div>

            {/* Summary of saved scores */}
            {savedSlots.length > 0 && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #0F1E35', color: '#64748B', fontSize: 12 }}>
                {savedSlots.length} slot{savedSlots.length !== 1 ? 's' : ''} have saved scores ·&nbsp;
                <span style={{ color: '#94A3B8' }}>
                  Total runs: {savedSlots.reduce((s, sl) => s + (savedRows[sl]?.runs || 0), 0)}
                </span>
              </div>
            )}
          </div>

          {/* Filters */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8, overflowX: 'auto', paddingBottom: 4 }}>
              <span style={{ color: '#475569', fontSize: 11, fontWeight: 600, alignSelf: 'center', flexShrink: 0 }}>Team:</span>
              {['ALL', ...IPL_TEAMS].map(t => {
                const active = filterTeam === t; const meta = TEAM_META[t]
                return (
                  <button key={t} onClick={() => setFT(t)} style={{ padding: '4px 9px', borderRadius: 6, border: `1px solid ${active ? (meta?.color || '#22C55E') : '#1E293B'}`, background: active ? `${meta?.color || '#22C55E'}22` : 'transparent', color: active ? (meta?.accent || '#22C55E') : '#64748B', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                    {t === 'ALL' ? 'All' : t}
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#475569', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>Participant:</span>
              <select value={filterPart} onChange={e => setFP(e.target.value)}
                style={{ background: '#060E1A', border: '1px solid #1E293B', borderRadius: 7, color: 'white', padding: '5px 10px', fontSize: 12, fontFamily: 'inherit', outline: 'none', flex: 1, cursor: 'pointer' }}>
                <option value="ALL">All Participants</option>
                {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          {/* Score cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 80 }}>
            {filteredSlots.map(slot => {
              const runs    = getVal(slot, 'runs')
              const balls   = getVal(slot, 'balls')
              const owner   = participants.find(p => getParticipantSlots(p.id).includes(slot))
              const hasRuns = runs > 0
              const isSaved = (savedRows[slot]?.runs || 0) > 0
              const isDirty = hasRuns && JSON.stringify(inputs[slot]) !== JSON.stringify(savedRows[slot])

              return (
                <div key={slot} style={{
                  background: hasRuns ? 'rgba(34,197,94,0.04)' : '#0A111E',
                  borderRadius: 10,
                  border: `1px solid ${isSaved ? 'rgba(34,197,94,0.22)' : '#0F1E35'}`,
                  padding: '12px 14px', transition: 'all 0.15s',
                }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <SlotBadge slot={slot} size="lg" />
                      {isDirty && <span style={{ color: '#F59E0B', fontSize: 10, fontWeight: 700 }}>● unsaved</span>}
                      {isSaved && !isDirty && <span style={{ color: '#22C55E', fontSize: 10, fontWeight: 700 }}>✓ saved</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {owner && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Avatar name={owner.name} color={owner.color} size={18} />
                          <span style={{ color: '#64748B', fontSize: 11 }}>{owner.name}</span>
                        </div>
                      )}
                      {/* Delete score button — only if saved */}
                      {isSaved && (
                        <button onClick={() => setConfirm({ type: 'deleteScore', slotId: slot })}
                          title={`Delete ${slot}'s score`}
                          style={{ padding: '4px 8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 6, color: '#EF4444', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit' }}>
                          🗑
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inputs */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                    <div>
                      <div style={{ color: '#22C55E', fontSize: 10, fontWeight: 700, marginBottom: 4 }}>RUNS ★</div>
                      <ScoreInput value={runs} onChange={v => setVal(slot,'runs',v)} primary />
                    </div>
                    <div>
                      <div style={{ color: '#475569', fontSize: 10, fontWeight: 600, marginBottom: 4 }}>BALLS</div>
                      <ScoreInput value={balls} onChange={v => setVal(slot,'balls',v)} accent="#3B82F6" />
                    </div>
                    <div>
                      <div style={{ color: '#475569', fontSize: 10, fontWeight: 600, marginBottom: 4 }}>FOURS</div>
                      <ScoreInput value={getVal(slot,'fours')} onChange={v => setVal(slot,'fours',v)} accent="#F59E0B" />
                    </div>
                    <div>
                      <div style={{ color: '#475569', fontSize: 10, fontWeight: 600, marginBottom: 4 }}>SIXES</div>
                      <ScoreInput value={getVal(slot,'sixes')} onChange={v => setVal(slot,'sixes',v)} accent="#A855F7" />
                    </div>
                  </div>
                  {balls > 0 && (
                    <div style={{ color: '#3B82F6', fontSize: 11, marginTop: 6, fontWeight: 600 }}>S/R: {sr(runs, balls)}</div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Sticky action bar */}
          <div style={{ position: 'fixed', bottom: 70, left: 0, right: 0, padding: '10px 16px', background: '#060E1A', borderTop: '1px solid #0F1E35', display: 'grid', gridTemplateColumns: !selectedMatch.published ? '1fr 1fr' : '1fr', gap: 10, zIndex: 50 }}>
            <button onClick={handleSave} disabled={saving} style={{ padding: '13px', background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.28)', borderRadius: 9, color: '#3B82F6', cursor: saving ? 'wait' : 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit' }}>
              {saving ? 'Saving…' : '💾 Save'}
            </button>
            {!selectedMatch.published && (
              <button onClick={handlePublish} disabled={publishing} style={{ padding: '13px', background: publishing ? '#166534' : '#22C55E', border: 'none', borderRadius: 9, color: '#060E1A', cursor: publishing ? 'wait' : 'pointer', fontSize: 14, fontWeight: 800, fontFamily: 'inherit' }}>
                {publishing ? 'Publishing…' : '🚀 Publish'}
              </button>
            )}
          </div>
        </>
      )}

      {!selectedMatchId && matches.length > 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#334155' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>👆</div>
          <div style={{ color: '#475569', fontSize: 14 }}>Select a match above to enter or edit scores</div>
        </div>
      )}
    </div>
  )
}
