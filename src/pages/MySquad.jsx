import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { SlotBadge, TeamPill } from '../components/ui.jsx'
import { TEAM_META } from '../lib/supabase.js'

export default function MySquad() {
  const { user, participants, slotTotals, getParticipantSlots, leaderboard, setPage, setFocusSlot } = useApp()
  const me    = participants.find(p => p.id === user?.id)
  const slots = me ? getParticipantSlots(me.id) : []
  const lb    = leaderboard.find(l => l.id === user?.id)

  const totalRuns  = slots.reduce((s, slot) => s + (slotTotals[slot]?.total_runs  || 0), 0)
  const totalBalls = slots.reduce((s, slot) => s + (slotTotals[slot]?.total_balls || 0), 0)
  const sr = totalBalls > 0 ? ((totalRuns / totalBalls) * 100).toFixed(1) : '—'

  return (
    <div style={{ padding: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h1 style={{ color: 'white', fontSize: 20, fontWeight: 800, marginBottom: 3 }}>👥 My Squad</h1>
          <p style={{ color: '#64748B', fontSize: 13 }}>
            {me?.name} · Rank <span style={{ color: '#22C55E', fontWeight: 700 }}>#{lb?.rank || '—'}</span> of 12
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.22)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
          <div style={{ color: '#22C55E', fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{totalRuns}</div>
          <div style={{ color: '#475569', fontSize: 10, fontWeight: 600, marginTop: 3, textTransform: 'uppercase' }}>Total Runs</div>
        </div>
        <div style={{ background: '#0A111E', border: '1px solid #0F1E35', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
          <div style={{ color: '#3B82F6', fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{sr}</div>
          <div style={{ color: '#475569', fontSize: 10, fontWeight: 600, marginTop: 3, textTransform: 'uppercase' }}>Strike Rate</div>
        </div>
      </div>

      {slots.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🎯</div>
          <div style={{ color: '#475569', fontSize: 15, fontWeight: 600 }}>Waiting for Draft</div>
          <div style={{ color: '#334155', fontSize: 13, marginTop: 6 }}>Admin will assign your slots</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {slots.map(slot => (
            <SlotCard key={slot} slot={slot}
              onClick={() => { setFocusSlot(slot); setPage('slotdetail') }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SlotCard({ slot, onClick }) {
  const { slotTotals } = useApp()
  const team  = slot.replace(/\d+$/, '')
  const meta  = TEAM_META[team] || { color: '#334155', accent: '#94A3B8' }
  const data  = slotTotals[slot] || { total_runs: 0, total_balls: 0, total_fours: 0, total_sixes: 0 }
  const sr    = data.total_balls > 0 ? ((data.total_runs / data.total_balls) * 100).toFixed(1) : '0.0'

  return (
    <div onClick={onClick} style={{
      background: '#0A111E', borderRadius: 12, border: '1px solid #0F1E35',
      padding: '14px 16px', cursor: 'pointer', transition: 'border-color 0.2s',
    }}
      onTouchStart={e => e.currentTarget.style.borderColor = meta.color}
      onTouchEnd={e   => e.currentTarget.style.borderColor = '#0F1E35'}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <SlotBadge slot={slot} size="lg" />
        <TeamPill team={team} />
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ color: 'white', fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{data.total_runs}</div>
          <div style={{ color: '#475569', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', marginTop: 2 }}>Total Runs</div>
        </div>
        <div style={{ textAlign: 'right', color: '#475569', fontSize: 12 }}>
          tap for history →
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {[['⚡', sr, 'S/R'], ['🏏', data.total_balls, 'Balls'], ['4️⃣', data.total_fours, '4s'], ['6️⃣', data.total_sixes, '6s']].map(([ic, v, lb]) => (
          <div key={lb} style={{ background: '#060E1A', borderRadius: 7, padding: '7px 4px', textAlign: 'center' }}>
            <div style={{ fontSize: 10 }}>{ic}</div>
            <div style={{ color: '#94A3B8', fontWeight: 700, fontSize: 13 }}>{v}</div>
            <div style={{ color: '#334155', fontSize: 9, fontWeight: 600 }}>{lb}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
