import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { SlotBadge, Avatar, PageHeader } from '../components/ui.jsx'
import { IPL_TEAMS, TEAM_META, ALL_SLOTS } from '../lib/supabase.js'

export default function AllSlots() {
  const { slotTotals, participants, getParticipantSlots, setPage, setFocusSlot } = useApp()
  const [filterTeam, setFT] = useState('ALL')
  const [sortBy,     setSB] = useState('total_runs')

  const getOwner = slot => participants.find(p => getParticipantSlots(p.id).includes(slot))

  const slots = ALL_SLOTS
    .filter(s => filterTeam === 'ALL' || s.startsWith(filterTeam))
    .sort((a, b) => (slotTotals[b]?.[sortBy] || 0) - (slotTotals[a]?.[sortBy] || 0))

  return (
    <div style={{ padding: 16 }}>
      <PageHeader title="📋 All Batting Slots" subtitle="60 slots · tap for match history" />

      {/* Team filter — horizontal scroll */}
      <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 8, marginBottom: 8 }}>
        {['ALL', ...IPL_TEAMS].map(t => {
          const active = filterTeam === t
          const meta   = TEAM_META[t]
          return (
            <button key={t} onClick={() => setFT(t)} style={{
              padding: '5px 11px', borderRadius: 7, flexShrink: 0,
              border:     `1px solid ${active ? (meta?.color || '#22C55E') : '#1E293B'}`,
              background:  active ? `${meta?.color || '#22C55E'}22` : 'transparent',
              color:       active ? (meta?.accent || '#22C55E') : '#64748B',
              fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {t === 'ALL' ? 'All' : t}
            </button>
          )
        })}
      </div>

      {/* Sort */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 14, overflowX: 'auto', paddingBottom: 4 }}>
        {[['total_runs','Runs'],['total_balls','Balls'],['total_fours','Fours'],['total_sixes','Sixes']].map(([k,l]) => (
          <button key={k} onClick={() => setSB(k)} style={{
            padding: '4px 10px', borderRadius: 6, flexShrink: 0,
            border:     `1px solid ${sortBy === k ? '#22C55E' : '#1E293B'}`,
            background:  sortBy === k ? 'rgba(34,197,94,0.10)' : 'transparent',
            color:       sortBy === k ? '#22C55E' : '#64748B',
            fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>{l}</button>
        ))}
      </div>

      {/* Slot list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {slots.map(slot => {
          const d     = slotTotals[slot] || {}
          const team  = slot.replace(/\d+$/, '')
          const meta  = TEAM_META[team]
          const runs  = d.total_runs  || 0
          const balls = d.total_balls || 0
          const srVal = balls > 0 ? ((runs / balls) * 100).toFixed(1) : '—'
          const owner = getOwner(slot)

          return (
            <div key={slot} onClick={() => { setFocusSlot(slot); setPage('slotdetail') }}
              style={{ background: '#0A111E', borderRadius: 10, border: '1px solid #0F1E35', padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'border-color 0.15s' }}
              onTouchStart={e => e.currentTarget.style.borderColor = meta?.color || '#22C55E'}
              onTouchEnd={e   => e.currentTarget.style.borderColor = '#0F1E35'}
            >
              <SlotBadge slot={slot} />
              <div style={{ flex: 1, minWidth: 0 }}>
                {owner
                  ? <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                      <Avatar name={owner.name} color={owner.color} size={16} />
                      <span style={{ color: '#64748B', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{owner.name}</span>
                    </div>
                  : <div style={{ color: '#1E3A5F', fontSize: 11, marginBottom: 3 }}>Unowned</div>
                }
                <div style={{ display: 'flex', gap: 10 }}>
                  <span style={{ color: '#64748B', fontSize: 11 }}>S/R: {srVal}</span>
                  <span style={{ color: '#64748B', fontSize: 11 }}>{balls || 0} balls</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: runs > 0 ? '#22C55E' : '#334155', fontWeight: 800, fontSize: 18 }}>{runs}</div>
                <div style={{ color: '#334155', fontSize: 10 }}>runs</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
