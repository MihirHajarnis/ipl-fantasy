import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { SlotBadge, Avatar, PageHeader, ScoreInput } from '../components/ui.jsx'
import { IPL_TEAMS, TEAM_META, ALL_SLOTS } from '../lib/supabase.js'
import { fetchScoresForMatch, upsertScores, publishMatch, createMatch } from '../lib/api.js'

export default function AdminScores() {
  const { matches, participants, slotTotals, getParticipantSlots, toast, refresh } = useApp()

  const [selectedMatchId, setSelectedMatchId] = useState(null)
  const [inputs,    setInputs]    = useState({})    // { slotId: { runs, balls, fours, sixes } }
  const [saving,    setSaving]    = useState(false)
  const [publishing,setPub]       = useState(false)
  const [filterTeam, setFT]       = useState('ALL')
  const [filterPart, setFP]       = useState('ALL') // filter by participant

  // New match form
  const [showNewMatch, setShowNew] = useState(false)
  const [newLabel,  setNewLabel]   = useState('')
  const [newHome,   setNewHome]    = useState('')
  const [newAway,   setNewAway]    = useState('')
  const [newDate,   setNewDate]    = useState('')

  const selectedMatch = matches.find(m => m.id === selectedMatchId)

  // Load existing scores when match changes
  useEffect(() => {
    if (!selectedMatchId) return
    fetchScoresForMatch(selectedMatchId).then(rows => {
      const map = {}
      rows.forEach(r => {
        map[r.slot_id] = { runs: r.runs, balls: r.balls, fours: r.fours, sixes: r.sixes }
      })
      setInputs(map)
    })
  }, [selectedMatchId])

  const setVal = (slot, field, val) => {
    setInputs(prev => ({ ...prev, [slot]: { ...(prev[slot] || {}), [field]: parseInt(val) || 0 } }))
  }

  const getVal = (slot, field) => inputs[slot]?.[field] || 0

  // Only slots that have runs entered
  const filledSlots = ALL_SLOTS.filter(s => (inputs[s]?.runs || 0) > 0)

  const handleSave = async () => {
    if (!selectedMatchId) { toast('Select a match first', 'error'); return }
    setSaving(true)
    try {
      const rows = Object.entries(inputs).map(([slot_id, v]) => ({ slot_id, ...v }))
      await upsertScores(selectedMatchId, rows)
      toast('Scores saved ✓')
      refresh()
    } catch (e) {
      toast('Save failed: ' + e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!selectedMatchId) { toast('Select a match first', 'error'); return }
    if (filledSlots.length === 0) { toast('Enter at least one slot\'s runs first', 'error'); return }
    setPub(true)
    try {
      const rows = Object.entries(inputs).map(([slot_id, v]) => ({ slot_id, ...v }))
      await upsertScores(selectedMatchId, rows)
      await publishMatch(selectedMatchId)
      toast('Match scores published! 🚀')
      refresh()
    } catch (e) {
      toast('Publish failed: ' + e.message, 'error')
    } finally {
      setPub(false)
    }
  }

  const handleCreateMatch = async () => {
    if (!newLabel) { toast('Enter a match label', 'error'); return }
    try {
      const m = await createMatch(newLabel, newHome || null, newAway || null, newDate || null)
      toast(`Match ${newLabel} created`)
      setSelectedMatchId(m.id)
      setShowNew(false)
      setNewLabel(''); setNewHome(''); setNewAway(''); setNewDate('')
      refresh()
    } catch (e) {
      toast('Failed: ' + e.message, 'error')
    }
  }

  // Build filtered slot list
  let filteredSlots = ALL_SLOTS
  if (filterTeam !== 'ALL') filteredSlots = filteredSlots.filter(s => s.startsWith(filterTeam))
  if (filterPart !== 'ALL') {
    const p = participants.find(x => x.id === parseInt(filterPart))
    if (p) {
      const pSlots = getParticipantSlots(p.id)
      filteredSlots = filteredSlots.filter(s => pSlots.includes(s))
    }
  }

  const sr = (runs, balls) => balls > 0 ? ((runs / balls) * 100).toFixed(1) : '—'

  return (
    <div style={{ padding: 28, animation: 'fadeUp 0.35s ease' }}>
      <PageHeader
        title="✏️ Enter Match Scores"
        subtitle="Select a match, then enter runs for any slot. Balls/4s/6s are optional — for stats only."
      />

      {/* Match selector */}
      <div style={{ background: '#0A111E', borderRadius: 12, border: '1px solid #0F1E35', padding: 18, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>Select Match</span>
          <button onClick={() => setShowNew(s => !s)} style={{ padding: '7px 14px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, color: '#3B82F6', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>
            + New Match
          </button>
        </div>

        {showNewMatch && (
          <div style={{ background: '#060E1A', borderRadius: 10, padding: 16, marginBottom: 14, border: '1px solid #1E293B' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
              {[['Label', newLabel, setNewLabel, 'M9'], ['Home Team', newHome, setNewHome, 'MI'], ['Away Team', newAway, setNewAway, 'RCB'], ['Date', newDate, setNewDate, '2025-04-20']].map(([lbl, val, set, ph]) => (
                <div key={lbl}>
                  <div style={{ color: '#64748B', fontSize: 11, fontWeight: 600, marginBottom: 5 }}>{lbl}</div>
                  <input value={val} onChange={e => set(e.target.value)} placeholder={ph}
                    style={{ width: '100%', padding: '8px 10px', background: '#0A111E', border: '1px solid #1E293B', borderRadius: 7, color: 'white', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = '#22C55E'}
                    onBlur={e => e.target.style.borderColor = '#1E293B'}
                  />
                </div>
              ))}
            </div>
            <button onClick={handleCreateMatch} style={{ padding: '8px 18px', background: '#22C55E', border: 'none', borderRadius: 8, color: '#060E1A', fontWeight: 800, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
              Create Match
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {matches.length === 0 && <span style={{ color: '#334155', fontSize: 13 }}>No matches yet — create one above</span>}
          {matches.map(m => (
            <button key={m.id} onClick={() => setSelectedMatchId(m.id)} style={{
              padding: '8px 16px', borderRadius: 8, border: `1px solid ${selectedMatchId === m.id ? '#22C55E' : '#1E293B'}`,
              background: selectedMatchId === m.id ? 'rgba(34,197,94,0.12)' : '#060E1A',
              color: selectedMatchId === m.id ? '#22C55E' : '#64748B',
              cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
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
          {/* Match info + status */}
          <div style={{ background: '#0A111E', borderRadius: 10, border: '1px solid #0F1E35', padding: '12px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ color: 'white', fontWeight: 700 }}>{selectedMatch.label}</div>
            {selectedMatch.home_team && <span style={{ color: '#64748B', fontSize: 13 }}>{selectedMatch.home_team} vs {selectedMatch.away_team}</span>}
            {selectedMatch.match_date && <span style={{ color: '#475569', fontSize: 12 }}>{selectedMatch.match_date}</span>}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              {selectedMatch.published
                ? <span style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22C55E', padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>✓ Published</span>
                : <span style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#F59E0B', padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>Draft</span>
              }
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <span style={{ color: '#475569', fontSize: 11, fontWeight: 600, marginRight: 6 }}>Team:</span>
              {['ALL', ...IPL_TEAMS].map(t => {
                const active = filterTeam === t
                const meta = TEAM_META[t]
                return (
                  <button key={t} onClick={() => setFT(t)} style={{ padding: '4px 10px', marginRight: 4, borderRadius: 6, border: `1px solid ${active ? (meta?.color || '#22C55E') : '#1E293B'}`, background: active ? `${meta?.color || '#22C55E'}22` : 'transparent', color: active ? (meta?.accent || '#22C55E') : '#64748B', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {t === 'ALL' ? 'All' : t}
                  </button>
                )
              })}
            </div>
            <div>
              <span style={{ color: '#475569', fontSize: 11, fontWeight: 600, marginRight: 6 }}>Participant:</span>
              <select value={filterPart} onChange={e => setFP(e.target.value)}
                style={{ background: '#060E1A', border: '1px solid #1E293B', borderRadius: 7, color: 'white', padding: '5px 10px', fontSize: 12, fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}>
                <option value="ALL">All Participants</option>
                {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
            <LegendItem color="#22C55E" label="RUNS ★ — counts toward leaderboard" />
            <LegendItem color="#475569" label="Balls, 4s, 6s — visualization only" />
            {filledSlots.length > 0 && <span style={{ color: '#22C55E', fontSize: 12, fontWeight: 600 }}>{filledSlots.length} slots filled</span>}
          </div>

          {/* Score table */}
          <div style={{ background: '#0A111E', borderRadius: 12, border: '1px solid #0F1E35', overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '150px 110px 95px 85px 85px 70px 180px', padding: '9px 18px', borderBottom: '1px solid #0F1E35', alignItems: 'center' }}>
              <div style={{ color: '#64748B', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Slot</div>
              <div style={{ color: '#22C55E', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Runs ★</div>
              <div style={{ color: '#475569', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>Balls</div>
              <div style={{ color: '#475569', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>Fours</div>
              <div style={{ color: '#475569', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>Sixes</div>
              <div style={{ color: '#334155', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>S/R</div>
              <div style={{ color: '#475569', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>Owner</div>
            </div>

            {filteredSlots.map(slot => {
              const runs  = getVal(slot, 'runs')
              const balls = getVal(slot, 'balls')
              const owner = participants.find(p => getParticipantSlots(p.id).includes(slot))
              const hasRuns = runs > 0
              return (
                <div key={slot} style={{ display: 'grid', gridTemplateColumns: '150px 110px 95px 85px 85px 70px 180px', padding: '9px 18px', borderBottom: '1px solid #060E1A', alignItems: 'center', background: hasRuns ? 'rgba(34,197,94,0.03)' : 'transparent', transition: 'background 0.14s' }}
                  onMouseEnter={e => { if (!hasRuns) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = hasRuns ? 'rgba(34,197,94,0.03)' : 'transparent' }}
                >
                  <SlotBadge slot={slot} />
                  <ScoreInput value={runs}  onChange={v => setVal(slot, 'runs',  v)} primary />
                  <ScoreInput value={getVal(slot,'balls')} onChange={v => setVal(slot,'balls',v)} accent="#3B82F6" />
                  <ScoreInput value={getVal(slot,'fours')} onChange={v => setVal(slot,'fours',v)} accent="#F59E0B" />
                  <ScoreInput value={getVal(slot,'sixes')} onChange={v => setVal(slot,'sixes',v)} accent="#A855F7" />
                  <div style={{ color: balls > 0 ? '#3B82F6' : '#1E3A5F', fontWeight: 600, fontSize: 12 }}>
                    {sr(runs, balls)}
                  </div>
                  {owner
                    ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Avatar name={owner.name} color={owner.color} size={20} />
                        <span style={{ color: '#94A3B8', fontSize: 12, fontWeight: 500 }}>{owner.name}</span>
                      </div>
                    : <span style={{ color: '#1E3A5F', fontSize: 11 }}>—</span>
                  }
                </div>
              )
            })}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ color: '#475569', fontSize: 12, marginRight: 'auto' }}>
              {filledSlots.length} slot{filledSlots.length !== 1 ? 's' : ''} with runs entered
            </span>
            <button onClick={handleSave} disabled={saving} style={{ padding: '11px 22px', background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.28)', borderRadius: 9, color: '#3B82F6', cursor: saving ? 'wait' : 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>
              {saving ? 'Saving…' : '💾 Save Draft'}
            </button>
            {!selectedMatch.published && (
              <button onClick={handlePublish} disabled={publishing} style={{ padding: '11px 26px', background: publishing ? '#166534' : '#22C55E', border: 'none', borderRadius: 9, color: '#060E1A', cursor: publishing ? 'wait' : 'pointer', fontSize: 14, fontWeight: 800, fontFamily: 'inherit' }}>
                {publishing ? 'Publishing…' : '🚀 Publish Scores'}
              </button>
            )}
          </div>
        </>
      )}

      {!selectedMatchId && matches.length > 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: '#334155' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>👆</div>
          <div style={{ color: '#475569', fontSize: 14, fontWeight: 600 }}>Select a match above to enter scores</div>
        </div>
      )}
    </div>
  )
}

function LegendItem({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ color: '#64748B', fontSize: 11 }}>{label}</span>
    </div>
  )
}
