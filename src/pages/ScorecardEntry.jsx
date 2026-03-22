import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { SlotBadge } from '../components/ui.jsx'
import { IPL_TEAMS, TEAM_META } from '../lib/supabase.js'
import {
  fetchScoresForMatch, upsertScores,
  publishMatch, unpublishMatch,
  deleteScore, deleteMatch,
  createMatch,
} from '../lib/api.js'

// ── Innings input row ─────────────────────────────────────────
function BatterRow({ slot, data, onChange, onDelete, isSaved }) {
  const team = slot.replace(/\d+$/, '')
  const meta = TEAM_META[team] || {}
  const hasRuns = (data.runs || 0) > 0
  const sr = data.balls > 0 ? ((data.runs / data.balls) * 100).toFixed(1) : '—'

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '90px 1fr 1fr 1fr 1fr 52px 40px',
      gap: 6, alignItems: 'center',
      padding: '8px 10px',
      background: hasRuns ? 'rgba(34,197,94,0.04)' : '#060E1A',
      borderRadius: 8,
      border: `1px solid ${hasRuns ? 'rgba(34,197,94,0.18)' : '#0F1E35'}`,
      transition: 'all 0.15s',
    }}>
      {/* Slot badge */}
      <SlotBadge slot={slot} size="lg" />

      {/* R — Runs (primary, counts toward score) */}
      <div>
        <NumInput
          value={data.runs || 0}
          onChange={v => onChange('runs', v)}
          accent="#22C55E"
          primary
          max={300}
        />
      </div>

      {/* B — Balls */}
      <NumInput value={data.balls || 0} onChange={v => onChange('balls', v)} accent="#3B82F6" max={300} />

      {/* 4s */}
      <NumInput value={data.fours || 0} onChange={v => onChange('fours', v)} accent="#F59E0B" max={50} />

      {/* 6s */}
      <NumInput value={data.sixes || 0} onChange={v => onChange('sixes', v)} accent="#A855F7" max={30} />

      {/* SR — auto calculated, read only */}
      <div style={{
        color: data.balls > 0 ? '#3B82F6' : '#1E3A5F',
        fontSize: 11, fontWeight: 600, textAlign: 'center',
      }}>
        {sr}
      </div>

      {/* Delete — only if saved in DB */}
      <button
        onClick={onDelete}
        disabled={!isSaved}
        title="Clear this slot's score"
        style={{
          width: 32, height: 32, borderRadius: 6,
          background: isSaved ? 'rgba(239,68,68,0.08)' : 'transparent',
          border: isSaved ? '1px solid rgba(239,68,68,0.2)' : '1px solid transparent',
          color: isSaved ? '#EF4444' : '#1E3A5F',
          cursor: isSaved ? 'pointer' : 'default',
          fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'inherit',
        }}
      >
        🗑
      </button>
    </div>
  )
}

function NumInput({ value, onChange, accent, primary, max = 300 }) {
  const hasVal = value > 0
  return (
    <input
      type="number" min="0" max={max}
      value={value === 0 ? '' : value}
      onChange={e => onChange(parseInt(e.target.value) || 0)}
      placeholder="0"
      style={{
        width: '100%', padding: '8px 6px', textAlign: 'center',
        background: primary && hasVal ? 'rgba(34,197,94,0.07)' : '#0A111E',
        border: `1px solid ${primary && hasVal ? `${accent}66` : '#1E293B'}`,
        borderRadius: 7,
        color: primary && hasVal ? '#22C55E' : '#E2E8F0',
        fontSize: primary ? 15 : 13,
        fontWeight: primary && hasVal ? 700 : 400,
        outline: 'none', fontFamily: 'inherit', transition: 'all 0.15s',
      }}
      onFocus={e => { e.target.style.borderColor = accent; if (primary) e.target.style.boxShadow = `0 0 0 2px ${accent}18` }}
      onBlur={e  => { e.target.style.borderColor = primary && hasVal ? `${accent}66` : '#1E293B'; e.target.style.boxShadow = 'none' }}
    />
  )
}

// ── Innings block (one team's batting) ────────────────────────
function InningsBlock({ label, team, slots, inputs, savedRows, onChangeRow, onDeleteRow }) {
  const meta = TEAM_META[team] || {}
  const totalRuns = slots.reduce((s, sl) => s + (inputs[sl]?.runs || 0), 0)

  return (
    <div style={{
      background: '#0A111E', borderRadius: 12,
      border: `1px solid ${meta.color || '#1E293B'}44`,
      overflow: 'hidden', marginBottom: 14,
    }}>
      {/* Innings header */}
      <div style={{
        padding: '12px 14px',
        background: `linear-gradient(90deg, ${meta.color || '#1E293B'}22, transparent)`,
        borderBottom: '1px solid #0F1E35',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ color: 'white', fontWeight: 800, fontSize: 14 }}>{label}</div>
          <div style={{ color: meta.accent || '#64748B', fontSize: 12, marginTop: 2 }}>
            {team} Batting · Slots 1–6
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#22C55E', fontSize: 20, fontWeight: 800 }}>{totalRuns}</div>
          <div style={{ color: '#334155', fontSize: 10 }}>total runs</div>
        </div>
      </div>

      {/* Column headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '90px 1fr 1fr 1fr 1fr 52px 40px',
        gap: 6, padding: '8px 10px',
        borderBottom: '1px solid #0F1E35',
      }}>
        {['SLOT', 'R ★', 'B', '4s', '6s', 'SR', ''].map((h, i) => (
          <div key={i} style={{
            color: i === 1 ? '#22C55E' : '#1E3A5F',
            fontSize: 10, fontWeight: 700,
            textAlign: i >= 2 ? 'center' : 'left',
            letterSpacing: '0.4px',
          }}>{h}</div>
        ))}
      </div>

      {/* 6 batter rows */}
      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {slots.map(slot => (
          <BatterRow
            key={slot}
            slot={slot}
            data={inputs[slot] || { runs: 0, balls: 0, fours: 0, sixes: 0 }}
            onChange={(field, val) => onChangeRow(slot, field, val)}
            onDelete={() => onDeleteRow(slot)}
            isSaved={!!(savedRows[slot]?.runs > 0)}
          />
        ))}
      </div>

      {/* Innings footer summary */}
      <div style={{
        padding: '10px 14px',
        borderTop: '1px solid #0F1E35',
        display: 'flex', gap: 20, flexWrap: 'wrap',
      }}>
        {[
          ['Total Runs', totalRuns, '#22C55E'],
          ['Total Balls', slots.reduce((s, sl) => s + (inputs[sl]?.balls || 0), 0), '#3B82F6'],
          ['Total 4s',   slots.reduce((s, sl) => s + (inputs[sl]?.fours || 0), 0), '#F59E0B'],
          ['Total 6s',   slots.reduce((s, sl) => s + (inputs[sl]?.sixes || 0), 0), '#A855F7'],
        ].map(([lbl, val, col]) => (
          <div key={lbl}>
            <div style={{ color: '#334155', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>{lbl}</div>
            <div style={{ color: col, fontSize: 16, fontWeight: 800 }}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main scorecard entry page ─────────────────────────────────
export default function ScorecardEntry() {
  const { matches, participants, getParticipantSlots, toast, refresh } = useApp()

  const [selectedMatchId, setSelected]  = useState(null)
  const [inputs,     setInputs]    = useState({})
  const [savedRows,  setSavedRows] = useState({})
  const [saving,     setSaving]    = useState(false)
  const [publishing, setPub]       = useState(false)
  const [showNew,    setShowNew]   = useState(false)
  const [newLabel,   setNewLabel]  = useState('')
  const [newHome,    setNewHome]   = useState('')
  const [newAway,    setNewAway]   = useState('')
  const [newDate,    setNewDate]   = useState('')
  const [confirm,    setConfirm]   = useState(null)

  const selectedMatch = matches.find(m => m.id === selectedMatchId)

  // Innings teams — derived from match home/away
  const team1 = selectedMatch?.home_team || null
  const team2 = selectedMatch?.away_team || null

  // Slot lists for each innings (positions 1–6)
  const innings1Slots = team1 ? Array.from({ length: 6 }, (_, i) => `${team1}${i + 1}`) : []
  const innings2Slots = team2 ? Array.from({ length: 6 }, (_, i) => `${team2}${i + 1}`) : []

  // Load existing scores when match changes
  useEffect(() => {
    if (!selectedMatchId) return
    fetchScoresForMatch(selectedMatchId).then(rows => {
      const map = {}
      rows.forEach(r => {
        map[r.slot_id] = { runs: r.runs, balls: r.balls, fours: r.fours, sixes: r.sixes }
      })
      setInputs(map)
      setSavedRows(map)
    })
  }, [selectedMatchId])

  const handleChange = (slot, field, val) => {
    setInputs(p => ({ ...p, [slot]: { ...(p[slot] || { runs: 0, balls: 0, fours: 0, sixes: 0 }), [field]: val } }))
  }

  const handleDeleteRow = (slot) => {
    if (!savedRows[slot]) {
      // Not saved — just clear local
      setInputs(p => { const n = { ...p }; delete n[slot]; return n })
      return
    }
    setConfirm({ type: 'deleteScore', slotId: slot })
  }

  const handleDeleteScoreConfirmed = async () => {
    const slot = confirm.slotId
    setConfirm(null)
    try {
      await deleteScore(selectedMatchId, slot)
      setInputs(p => { const n = { ...p }; delete n[slot]; return n })
      setSavedRows(p => { const n = { ...p }; delete n[slot]; return n })
      toast(`${slot} score deleted`)
      refresh()
    } catch (e) { toast('Delete failed: ' + e.message, 'error') }
  }

  const handleSave = async () => {
    if (!selectedMatchId) { toast('Select a match first', 'error'); return }
    setSaving(true)
    try {
      const rows = Object.entries(inputs).map(([slot_id, v]) => ({ slot_id, ...v }))
      await upsertScores(selectedMatchId, rows)
      setSavedRows({ ...inputs })
      toast('Scorecard saved ✓')
      refresh()
    } catch (e) { toast('Save failed: ' + e.message, 'error') }
    finally { setSaving(false) }
  }

  const handlePublish = async () => {
    const filledCount = Object.values(inputs).filter(v => v.runs > 0).length
    if (filledCount === 0) { toast('Enter at least one batter\'s runs', 'error'); return }
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

  const handleUnpublish = async () => {
    setConfirm(null)
    try {
      await unpublishMatch(selectedMatchId)
      toast('Match unpublished', 'warning')
      refresh()
    } catch (e) { toast('Failed: ' + e.message, 'error') }
  }

  const handleDeleteMatch = async () => {
    setConfirm(null)
    try {
      await deleteMatch(selectedMatchId)
      setSelected(null); setInputs({}); setSavedRows({})
      toast('Match deleted', 'warning')
      refresh()
    } catch (e) { toast('Failed: ' + e.message, 'error') }
  }

  const handleCreateMatch = async () => {
    if (!newLabel) { toast('Enter a match label e.g. M1', 'error'); return }
    if (!newHome || !newAway) { toast('Select both teams', 'error'); return }
    if (newHome === newAway) { toast('Home and away teams must be different', 'error'); return }
    try {
      const m = await createMatch(newLabel, newHome, newAway, newDate || null)
      toast(`${newLabel} created`)
      setSelected(m.id); setShowNew(false)
      setNewLabel(''); setNewHome(''); setNewAway(''); setNewDate('')
      refresh()
    } catch (e) { toast('Failed: ' + e.message, 'error') }
  }

  // ── Confirm dialog ──────────────────────────────────────────
  const ConfirmDialog = () => {
    if (!confirm) return null
    const cfg = {
      deleteScore: {
        title: `Delete ${confirm.slotId} Score?`,
        body: `This will remove ${confirm.slotId}'s runs from this match and update the leaderboard.`,
        action: handleDeleteScoreConfirmed, color: '#EF4444',
      },
      unpublish: {
        title: 'Unpublish Match?',
        body: `Scores will be hidden from the leaderboard until re-published.`,
        action: handleUnpublish, color: '#F59E0B',
      },
      deleteMatch: {
        title: 'Delete Entire Match?',
        body: `All scores for ${selectedMatch?.label} will be permanently deleted. Cannot be undone.`,
        action: handleDeleteMatch, color: '#EF4444',
      },
    }[confirm.type]

    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: '#0A111E', borderRadius: 16, border: `1px solid ${cfg.color}44`, padding: 28, maxWidth: 360, width: '100%' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>⚠️</div>
          <h3 style={{ color: 'white', fontWeight: 800, fontSize: 16, marginBottom: 8 }}>{cfg.title}</h3>
          <p style={{ color: '#94A3B8', fontSize: 13, lineHeight: 1.6, marginBottom: 22 }}>{cfg.body}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={() => setConfirm(null)} style={{ padding: '11px', background: '#060E1A', border: '1px solid #1E293B', borderRadius: 8, color: '#94A3B8', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>Cancel</button>
            <button onClick={cfg.action} style={{ padding: '11px', background: cfg.color, border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 800, fontFamily: 'inherit' }}>Confirm</button>
          </div>
        </div>
      </div>
    )
  }

  const totalFilledSlots = Object.values(inputs).filter(v => v.runs > 0).length

  return (
    <div style={{ padding: 16, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <ConfirmDialog />

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ color: 'white', fontSize: 20, fontWeight: 800, marginBottom: 3 }}>🏏 Scorecard Entry</h1>
        <p style={{ color: '#64748B', fontSize: 13 }}>
          Enter top-6 batters for each innings · mirrors Cricbuzz layout · R = runs (counts toward leaderboard)
        </p>
      </div>

      {/* How to use banner */}
      <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
        <div style={{ color: '#22C55E', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>📋 How to use</div>
        <div style={{ color: '#64748B', fontSize: 12, lineHeight: 1.7 }}>
          1. Select a match · 2. Open Cricbuzz scorecard in another tab · 3. Copy R, B, 4s, 6s for each batter in batting order into the matching slot row · 4. Save → Publish
        </div>
      </div>

      {/* Match selector */}
      <div style={{ background: '#0A111E', borderRadius: 12, border: '1px solid #0F1E35', padding: 14, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>Select Match</span>
          <button onClick={() => setShowNew(s => !s)} style={{ padding: '6px 12px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 7, color: '#3B82F6', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>
            + New Match
          </button>
        </div>

        {/* New match form */}
        {showNew && (
          <div style={{ background: '#060E1A', borderRadius: 10, padding: 14, marginBottom: 12, border: '1px solid #1E293B' }}>
            <div style={{ color: '#94A3B8', fontSize: 12, fontWeight: 600, marginBottom: 10 }}>
              ⚠️ Select both teams — this determines which slots appear in each innings
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              {/* Label */}
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ color: '#64748B', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Match Label</div>
                <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="e.g. M1, M9"
                  style={{ width: '100%', padding: '9px 12px', background: '#0A111E', border: '1px solid #1E293B', borderRadius: 7, color: 'white', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = '#22C55E'}
                  onBlur={e  => e.target.style.borderColor = '#1E293B'}
                />
              </div>
              {/* Home team */}
              <div>
                <div style={{ color: '#64748B', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Innings 1 (Home)</div>
                <TeamSelect value={newHome} onChange={setNewHome} exclude={newAway} />
              </div>
              {/* Away team */}
              <div>
                <div style={{ color: '#64748B', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Innings 2 (Away)</div>
                <TeamSelect value={newAway} onChange={setNewAway} exclude={newHome} />
              </div>
              {/* Date */}
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ color: '#64748B', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Match Date (optional)</div>
                <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', background: '#0A111E', border: '1px solid #1E293B', borderRadius: 7, color: 'white', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = '#22C55E'}
                  onBlur={e  => e.target.style.borderColor = '#1E293B'}
                />
              </div>
            </div>
            <button onClick={handleCreateMatch} style={{ padding: '9px 18px', background: '#22C55E', border: 'none', borderRadius: 8, color: '#060E1A', fontWeight: 800, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
              Create Match
            </button>
          </div>
        )}

        {/* Match list */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {matches.length === 0 && <span style={{ color: '#334155', fontSize: 13 }}>No matches yet — create one above</span>}
          {matches.map(m => (
            <button key={m.id} onClick={() => { setSelected(m.id); setInputs({}); setSavedRows({}) }} style={{
              padding: '7px 14px', borderRadius: 8,
              border: `1px solid ${selectedMatchId === m.id ? '#22C55E' : '#1E293B'}`,
              background: selectedMatchId === m.id ? 'rgba(34,197,94,0.12)' : '#060E1A',
              color: selectedMatchId === m.id ? '#22C55E' : '#64748B',
              cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {m.label}
              {m.home_team && m.away_team && (
                <span style={{ color: '#334155', fontSize: 11 }}>{m.home_team} vs {m.away_team}</span>
              )}
              {m.published && (
                <span style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4 }}>LIVE</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Match selected — show scorecard */}
      {selectedMatch && (
        <>
          {/* Match status bar */}
          <div style={{ background: '#0A111E', borderRadius: 10, border: '1px solid #0F1E35', padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ color: 'white', fontWeight: 700 }}>{selectedMatch.label}</span>
            {team1 && team2 && (
              <span style={{ color: '#64748B', fontSize: 13 }}>
                {team1} <span style={{ color: '#334155' }}>vs</span> {team2}
              </span>
            )}
            {selectedMatch.match_date && (
              <span style={{ color: '#475569', fontSize: 12 }}>{selectedMatch.match_date}</span>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {selectedMatch.published
                ? <span style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22C55E', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>✓ Published</span>
                : <span style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#F59E0B', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>Draft</span>
              }
              {selectedMatch.published && (
                <button onClick={() => setConfirm({ type: 'unpublish' })} style={{ padding: '4px 11px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 6, color: '#F59E0B', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>
                  ↩ Unpublish
                </button>
              )}
              <button onClick={() => setConfirm({ type: 'deleteMatch' })} style={{ padding: '4px 11px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, color: '#EF4444', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>
                🗑 Delete
              </button>
            </div>
          </div>

          {/* Warning if teams not set */}
          {(!team1 || !team2) && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 10, padding: '12px 16px', marginBottom: 14, color: '#EF4444', fontSize: 13 }}>
              ⚠️ This match has no teams set. Delete it and create a new one with both teams selected.
            </div>
          )}

          {/* Innings 1 */}
          {team1 && (
            <InningsBlock
              label="Innings 1"
              team={team1}
              slots={innings1Slots}
              inputs={inputs}
              savedRows={savedRows}
              onChangeRow={handleChange}
              onDeleteRow={handleDeleteRow}
            />
          )}

          {/* Innings 2 */}
          {team2 && (
            <InningsBlock
              label="Innings 2"
              team={team2}
              slots={innings2Slots}
              inputs={inputs}
              savedRows={savedRows}
              onChangeRow={handleChange}
              onDeleteRow={handleDeleteRow}
            />
          )}

          {/* Combined match summary */}
          {(team1 || team2) && (
            <div style={{ background: '#0A111E', borderRadius: 10, border: '1px solid #0F1E35', padding: '12px 16px', marginBottom: 80, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: '#334155', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Match Total Runs</div>
                <div style={{ color: '#22C55E', fontSize: 22, fontWeight: 800 }}>
                  {[...innings1Slots, ...innings2Slots].reduce((s, sl) => s + (inputs[sl]?.runs || 0), 0)}
                </div>
              </div>
              <div>
                <div style={{ color: '#334155', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Slots Filled</div>
                <div style={{ color: 'white', fontSize: 22, fontWeight: 800 }}>{totalFilledSlots} / 12</div>
              </div>
              {totalFilledSlots > 0 && (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: '#22C55E', fontSize: 12, fontWeight: 600 }}>
                    ✓ {totalFilledSlots} batter{totalFilledSlots !== 1 ? 's' : ''} entered
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Sticky action bar */}
          <div style={{
            position: 'fixed', bottom: 70, left: 0, right: 0,
            padding: '10px 16px', background: '#060E1A',
            borderTop: '1px solid #0F1E35',
            display: 'grid',
            gridTemplateColumns: !selectedMatch.published ? '1fr 1fr' : '1fr',
            gap: 10, zIndex: 50,
          }}>
            <button onClick={handleSave} disabled={saving} style={{
              padding: '13px', background: 'rgba(59,130,246,0.10)',
              border: '1px solid rgba(59,130,246,0.28)', borderRadius: 9,
              color: '#3B82F6', cursor: saving ? 'wait' : 'pointer',
              fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
            }}>
              {saving ? 'Saving…' : '💾 Save Scorecard'}
            </button>
            {!selectedMatch.published && (
              <button onClick={handlePublish} disabled={publishing} style={{
                padding: '13px',
                background: publishing ? '#166534' : '#22C55E',
                border: 'none', borderRadius: 9,
                color: '#060E1A', cursor: publishing ? 'wait' : 'pointer',
                fontSize: 14, fontWeight: 800, fontFamily: 'inherit',
              }}>
                {publishing ? 'Publishing…' : '🚀 Publish Scores'}
              </button>
            )}
          </div>
        </>
      )}

      {!selectedMatchId && matches.length > 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🏏</div>
          <div style={{ color: '#475569', fontSize: 14, fontWeight: 600 }}>Select a match above to enter the scorecard</div>
        </div>
      )}
    </div>
  )
}

// ── Team dropdown ─────────────────────────────────────────────
function TeamSelect({ value, onChange, exclude }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width: '100%', padding: '9px 12px', background: '#0A111E', border: '1px solid #1E293B', borderRadius: 7, color: value ? 'white' : '#475569', fontSize: 13, outline: 'none', fontFamily: 'inherit', cursor: 'pointer', boxSizing: 'border-box' }}
      onFocus={e => e.target.style.borderColor = '#22C55E'}
      onBlur={e  => e.target.style.borderColor = '#1E293B'}
    >
      <option value="">Select team…</option>
      {IPL_TEAMS.filter(t => t !== exclude).map(t => (
        <option key={t} value={t}>{t} — {TEAM_META[t]?.label}</option>
      ))}
    </select>
  )
}
