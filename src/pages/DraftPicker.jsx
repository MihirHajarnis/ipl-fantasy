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

  const [localPool,     setPool]     = useState(() => {
    const assigned = Object.keys(draftMap)
    return ALL_SLOTS.filter(s => !assigned.includes(s))
  })
  const [localAssigned, setAssigned] = useState(() => {
    const map = {}
    participants.forEach(p => { map[p.id] = [] })
    Object.entries(draftMap).forEach(([slot, pid]) => { if (map[pid]) map[pid].push(slot) })
    return map
  })
  const [cycle,    setCycle]    = useState(draftState.cycle_completed || 0)
  const [saving,   setSaving]   = useState(false)
  const [resetting,setResetting]= useState(false)
  const committed = draftState.is_committed

  const handleNextCycle = async () => {
    if (cycle >= 5) { toast('All 5 cycles complete!', 'warning'); return }
    if (localPool.length < 12) { toast('Not enough slots!', 'error'); return }
    const shuffled = shuffle(localPool)
    const picked   = shuffled.splice(0, 12)
    const newAssigned = { ...localAssigned }
    const rows = []
    participants.forEach((p, i) => {
      if (!newAssigned[p.id]) newAssigned[p.id] = []
      newAssigned[p.id].push(picked[i])
      rows.push({ participant_id: p.id, slot_id: picked[i], cycle: cycle + 1 })
    })
    setSaving(true)
    try {
      await saveDraftCycle(rows, cycle + 1)
      setPool(shuffled); setAssigned(newAssigned); setCycle(c => c + 1)
      toast(`Cycle ${cycle + 1} complete! 🎯`); refresh()
    } catch (e) { toast('Error: ' + e.message, 'error') }
    finally { setSaving(false) }
  }

  const handleCommit = async () => {
    if (cycle < 5) { toast('Complete all 5 cycles first!', 'error'); return }
    setSaving(true)
    try { await commitDraft(); toast('Season started! 🏏'); refresh() }
    catch (e) { toast('Error: ' + e.message, 'error') }
    finally { setSaving(false) }
  }

  const handleReset = async () => {
    if (!confirm('Reset the entire draft?')) return
    setResetting(true)
    try {
      await resetDraft()
      setPool([...ALL_SLOTS])
      const map = {}; participants.forEach(p => { map[p.id] = [] }); setAssigned(map)
      setCycle(0); toast('Draft reset', 'warning'); refresh()
    } catch (e) { toast('Error: ' + e.message, 'error') }
    finally { setResetting(false) }
  }

  return (
    <div style={{ padding: 16 }}>
      <PageHeader title="🎯 Draft Picker" subtitle="5 cycles · 12 picks each" />

      {committed && (
        <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 14, color: '#22C55E', fontSize: 13, fontWeight: 600 }}>
          ✓ Draft committed. Season is live.
        </div>
      )}

      {/* Cycle counter + buttons */}
      <div style={{ background: '#0A111E', borderRadius: 12, border: '1px solid #0F1E35', padding: 16, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ color: '#64748B', fontSize: 11, fontWeight: 600, marginBottom: 2 }}>PROGRESS</div>
            <div style={{ color: '#22C55E', fontSize: 24, fontWeight: 800 }}>{cycle} / 5 cycles</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#64748B', fontSize: 11, marginBottom: 2 }}>Pool remaining</div>
            <div style={{ color: 'white', fontSize: 20, fontWeight: 700 }}>{localPool.length}</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ background: '#060E1A', borderRadius: 4, height: 6, marginBottom: 14 }}>
          <div style={{ width: `${(cycle / 5) * 100}%`, height: '100%', background: '#22C55E', borderRadius: 4, transition: 'width 0.4s ease' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: cycle === 5 && !committed ? '1fr 1fr' : '1fr', gap: 8, marginBottom: 8 }}>
          <button onClick={handleNextCycle} disabled={saving || cycle >= 5} style={{
            padding: '13px', borderRadius: 9, border: 'none',
            background: cycle >= 5 ? '#1E293B' : '#22C55E',
            color: cycle >= 5 ? '#475569' : '#060E1A',
            fontWeight: 800, fontSize: 14, fontFamily: 'inherit', cursor: cycle >= 5 ? 'not-allowed' : 'pointer',
          }}>
            {saving ? 'Saving…' : cycle >= 5 ? '✓ All cycles done' : '🎯 Next Cycle'}
          </button>
          {cycle === 5 && !committed && (
            <button onClick={handleCommit} disabled={saving} style={{ padding: '13px', background: '#3B82F6', border: 'none', borderRadius: 9, color: 'white', fontWeight: 800, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
              🚀 Start Season
            </button>
          )}
        </div>
        <button onClick={handleReset} disabled={resetting} style={{ width: '100%', padding: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 9, color: '#EF4444', cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit' }}>
          {resetting ? 'Resetting…' : '🔄 Reset Draft'}
        </button>
      </div>

      {/* Pool — collapsible on mobile */}
      <details style={{ marginBottom: 14 }}>
        <summary style={{ background: '#0A111E', borderRadius: 10, border: '1px solid #0F1E35', padding: '12px 16px', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Free Pool</span>
          <span style={{ color: '#475569', fontSize: 12 }}>{localPool.length} slots ▾</span>
        </summary>
        <div style={{ background: '#0A111E', borderRadius: '0 0 10px 10px', border: '1px solid #0F1E35', borderTop: 'none', padding: 14 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {localPool.length === 0
              ? <span style={{ color: '#1E3A5F', fontSize: 12 }}>All slots assigned</span>
              : localPool.map(s => <SlotBadge key={s} slot={s} />)
            }
          </div>
        </div>
      </details>

      {/* Participant assignments */}
      <h2 style={{ color: 'white', fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Participant Assignments</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {participants.map(p => {
          const pSlots = localAssigned[p.id] || []
          return (
            <div key={p.id} style={{ background: '#0A111E', borderRadius: 11, border: '1px solid #0F1E35', padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: pSlots.length > 0 ? 10 : 0 }}>
                <Avatar name={p.name} color={p.color} size={28} />
                <span style={{ color: 'white', fontWeight: 700, fontSize: 14, flex: 1 }}>{p.name}</span>
                <span style={{ color: '#334155', fontSize: 12 }}>{pSlots.length}/5</span>
              </div>
              {pSlots.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {pSlots.map(s => <SlotBadge key={s} slot={s} />)}
                </div>
              )}
              {pSlots.length === 0 && <div style={{ color: '#1E3A5F', fontSize: 12 }}>No picks yet</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
