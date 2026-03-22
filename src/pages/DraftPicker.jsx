import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { SlotBadge, Avatar, PageHeader } from '../components/ui.jsx'
import { ALL_SLOTS } from '../lib/supabase.js'
import { saveDraftCycle, commitDraft, resetDraft } from '../lib/api.js'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function DraftPicker() {
  const { participants, draftState, draftMap, toast, refresh } = useApp()

  // Local draft state (before committing)
  const [localPool,     setPool]     = useState(() => {
    const assigned = Object.keys(draftMap)
    return ALL_SLOTS.filter(s => !assigned.includes(s))
  })
  const [localAssigned, setAssigned] = useState(() => {
    // Build per-participant arrays from existing draftMap
    const map = {}
    participants.forEach(p => { map[p.id] = [] })
    Object.entries(draftMap).forEach(([slot, pid]) => {
      if (map[pid]) map[pid].push(slot)
    })
    return map
  })
  const [cycle,    setCycle]    = useState(draftState.cycle_completed || 0)
  const [saving,   setSaving]   = useState(false)
  const [resetting,setResetting]= useState(false)

  const committed = draftState.is_committed

  const handleNextCycle = async () => {
    if (cycle >= 5) { toast('All 5 cycles complete!', 'warning'); return }
    if (localPool.length < 12) { toast('Not enough slots in pool!', 'error'); return }

    const shuffled = shuffle(localPool)
    const picked   = shuffled.splice(0, 12)
    const newPool  = shuffled

    const newAssigned = { ...localAssigned }
    const rows = []
    participants.forEach((p, i) => {
      const slot = picked[i]
      if (!newAssigned[p.id]) newAssigned[p.id] = []
      newAssigned[p.id].push(slot)
      rows.push({ participant_id: p.id, slot_id: slot, cycle: cycle + 1 })
    })

    setSaving(true)
    try {
      await saveDraftCycle(rows, cycle + 1)
      setPool(newPool)
      setAssigned(newAssigned)
      setCycle(c => c + 1)
      toast(`Cycle ${cycle + 1} complete! 🎯`)
      refresh()
    } catch (e) {
      toast('Error: ' + e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleCommit = async () => {
    if (cycle < 5) { toast('Complete all 5 cycles first!', 'error'); return }
    setSaving(true)
    try {
      await commitDraft()
      toast('Draft committed! Season started 🏏')
      refresh()
    } catch (e) {
      toast('Error: ' + e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!confirm('Reset the entire draft? This cannot be undone.')) return
    setResetting(true)
    try {
      await resetDraft()
      setPool([...ALL_SLOTS])
      const map = {}
      participants.forEach(p => { map[p.id] = [] })
      setAssigned(map)
      setCycle(0)
      toast('Draft reset', 'warning')
      refresh()
    } catch (e) {
      toast('Error: ' + e.message, 'error')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div style={{ padding: 28, animation: 'fadeUp 0.35s ease' }}>
      <PageHeader
        title="🎯 Draft Picker"
        subtitle="5 cycles · 12 picks each · mirrors your original draft tool exactly"
      />

      {committed && (
        <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 10, padding: '12px 18px', marginBottom: 20, color: '#22C55E', fontSize: 14, fontWeight: 600 }}>
          ✓ Draft is committed. Season is live. Reset to redo.
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 22, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.22)', borderRadius: 10, padding: '10px 20px', color: '#22C55E', fontWeight: 800, fontSize: 16 }}>
          Cycle {cycle} / 5
        </div>

        <button onClick={handleNextCycle} disabled={saving || cycle >= 5} style={{
          padding: '10px 20px', borderRadius: 9, border: 'none', cursor: cycle >= 5 ? 'not-allowed' : 'pointer',
          background: cycle >= 5 ? '#1E293B' : '#22C55E',
          color: cycle >= 5 ? '#475569' : '#060E1A',
          fontWeight: 800, fontSize: 13, fontFamily: 'inherit',
        }}>
          {saving ? 'Saving…' : '🎯 Next Cycle'}
        </button>

        {cycle === 5 && !committed && (
          <button onClick={handleCommit} disabled={saving} style={{
            padding: '10px 20px', background: '#3B82F6', border: 'none', borderRadius: 9,
            color: 'white', fontWeight: 800, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
          }}>
            🚀 Commit & Start Season
          </button>
        )}

        <button onClick={handleReset} disabled={resetting} style={{
          padding: '10px 20px', background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.22)', borderRadius: 9,
          color: '#EF4444', cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit',
        }}>
          {resetting ? 'Resetting…' : '🔄 Reset Draft'}
        </button>
      </div>

      {/* Free pool */}
      <div style={{ background: '#0A111E', borderRadius: 12, border: '1px solid #0F1E35', padding: 18, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>Free Pool</span>
          <span style={{ color: '#475569', fontSize: 12 }}>{localPool.length} slots remaining</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {localPool.length === 0
            ? <span style={{ color: '#1E3A5F', fontSize: 12 }}>All slots assigned</span>
            : localPool.map(s => <SlotBadge key={s} slot={s} />)
          }
        </div>
      </div>

      {/* 12 participant boxes — 4 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {participants.map(p => {
          const pSlots = localAssigned[p.id] || []
          return (
            <div key={p.id} style={{ background: '#0A111E', borderRadius: 11, border: '1px solid #0F1E35', padding: 14, transition: 'border-color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = p.color + '55'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#0F1E35'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Avatar name={p.name} color={p.color} size={26} />
                <span style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>{p.name}</span>
                <span style={{ color: '#334155', fontSize: 10, marginLeft: 'auto' }}>{pSlots.length}/5</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {pSlots.length === 0
                  ? <span style={{ color: '#1E3A5F', fontSize: 11 }}>No picks yet</span>
                  : pSlots.map(s => <SlotBadge key={s} slot={s} />)
                }
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
