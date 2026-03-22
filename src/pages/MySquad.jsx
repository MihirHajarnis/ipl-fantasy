import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { SlotBadge, TeamPill, PageHeader } from '../components/ui.jsx'
import { TEAM_META } from '../lib/supabase.js'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { fetchSlotHistory } from '../lib/api.js'

export default function MySquad() {
  const { user, participants, slotTotals, getParticipantSlots, leaderboard, setPage, setFocusSlot } = useApp()
  const me   = participants.find(p => p.id === user?.id)
  const slots = me ? getParticipantSlots(me.id) : []
  const lb    = leaderboard.find(l => l.id === user?.id)

  const totalRuns  = slots.reduce((s, slot) => s + (slotTotals[slot]?.total_runs  || 0), 0)
  const totalBalls = slots.reduce((s, slot) => s + (slotTotals[slot]?.total_balls || 0), 0)
  const sr = totalBalls > 0 ? ((totalRuns / totalBalls) * 100).toFixed(1) : '—'

  return (
    <div style={{ padding: 28, animation: 'fadeUp 0.35s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: 'white', fontSize: 22, fontWeight: 800, marginBottom: 3 }}>👥 My Squad</h1>
          <p style={{ color: '#64748B', fontSize: 13 }}>
            {me?.name} · Rank <span style={{ color: '#22C55E', fontWeight: 700 }}>#{lb?.rank || '—'}</span> of 12
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.22)', borderRadius: 10, padding: '12px 20px', textAlign: 'center' }}>
            <div style={{ color: '#22C55E', fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{totalRuns}</div>
            <div style={{ color: '#475569', fontSize: 10, fontWeight: 600, marginTop: 3, textTransform: 'uppercase' }}>Total Runs</div>
          </div>
          <div style={{ background: '#0A111E', border: '1px solid #0F1E35', borderRadius: 10, padding: '12px 20px', textAlign: 'center' }}>
            <div style={{ color: '#3B82F6', fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{sr}</div>
            <div style={{ color: '#475569', fontSize: 10, fontWeight: 600, marginTop: 3, textTransform: 'uppercase' }}>Strike Rate</div>
          </div>
        </div>
      </div>

      {slots.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#334155' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🎯</div>
          <div style={{ color: '#475569', fontSize: 14, fontWeight: 600 }}>Waiting for Draft</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>The admin will run the draft picker to assign slots</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 14 }}>
          {slots.map(slot => (
            <SlotCard key={slot} slot={slot} onClick={() => { setFocusSlot(slot); setPage('slotdetail') }} />
          ))}
        </div>
      )}
    </div>
  )
}

function SlotCard({ slot, onClick }) {
  const { slotTotals } = useApp()
  const [hov, setHov] = useState(false)
  const team  = slot.replace(/\d+$/, '')
  const meta  = TEAM_META[team] || { color: '#334155', accent: '#94A3B8' }
  const data  = slotTotals[slot] || { total_runs: 0, total_balls: 0, total_fours: 0, total_sixes: 0 }
  const runs  = data.total_runs
  const balls = data.total_balls
  const sr    = balls > 0 ? ((runs / balls) * 100).toFixed(1) : '0.0'

  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: '#0A111E', borderRadius: 12,
        border: `1px solid ${hov ? meta.color : '#0F1E35'}`,
        padding: 18, cursor: 'pointer',
        transition: 'all 0.2s',
        transform: hov ? 'translateY(-4px)' : 'none',
        boxShadow: hov ? `0 16px 40px rgba(0,0,0,0.45), 0 0 0 1px ${meta.color}33` : 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <SlotBadge slot={slot} size="lg" />
        <TeamPill team={team} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ color: 'white', fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{runs}</div>
        <div style={{ color: '#475569', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', marginTop: 3 }}>
          Total Runs
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 5, marginBottom: 12 }}>
        {[['⚡', sr, 'S/R'], ['🏏', balls, 'Balls'], ['4️⃣', data.total_fours, '4s'], ['6️⃣', data.total_sixes, '6s']].map(([ic, v, lb]) => (
          <div key={lb} style={{ background: '#060E1A', borderRadius: 7, padding: '7px 4px', textAlign: 'center' }}>
            <div style={{ fontSize: 9 }}>{ic}</div>
            <div style={{ color: '#94A3B8', fontWeight: 700, fontSize: 12 }}>{v}</div>
            <div style={{ color: '#334155', fontSize: 9, fontWeight: 600 }}>{lb}</div>
          </div>
        ))}
      </div>

      <div style={{ color: '#1E3A5F', fontSize: 10, textAlign: 'right' }}>click for match history →</div>
    </div>
  )
}
