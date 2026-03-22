import { useApp } from '../context/AppContext.jsx'
import { Avatar, SlotBadge, StatCard, Skeleton } from '../components/ui.jsx'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function Dashboard() {
  const { leaderboard, participants, slotTotals, matches, loading, setPage, setFocusSlot } = useApp()

  const published = matches.filter(m => m.published)
  const top3 = leaderboard.slice(0, 3)
  const rest  = leaderboard.slice(3)

  // Build per-match totals for top 5
  // We need per-match scores — use slotTotals + match data
  // Chart shows leaderboard position trajectory (simplified: use total_runs as single bar)
  const chartData = leaderboard.slice(0, 5).map(p => ({
    name: p.name,
    runs: p.total_runs,
    color: p.color,
  }))

  if (loading) return <LoadingSkeleton />

  return (
    <div style={{ padding: 28, animation: 'fadeUp 0.35s ease' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: 'white', fontSize: 22, fontWeight: 800, marginBottom: 3 }}>🏆 Leaderboard</h1>
          <p style={{ color: '#64748B', fontSize: 13 }}>Points = total runs scored by your 5 batting slots · {published.length} matches played</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <StatCard label="Participants" value={12} />
          <StatCard label="Slots"        value={60} />
          <StatCard label="Matches"      value={published.length} />
        </div>
      </div>

      {/* Podium — 2nd | 1st | 3rd */}
      {top3.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr 1fr', gap: 12, marginBottom: 16 }}>
          {[top3[1], top3[0], top3[2]].map((p, i) => {
            if (!p) return <div key={i} />
            const medals  = ['🥈', '🥇', '🥉']
            const isFirst = i === 1
            return (
              <div key={p.id} style={{
                background: isFirst ? 'linear-gradient(145deg,#041810,#052e16)' : 'linear-gradient(145deg,#0a111e,#0d1829)',
                borderRadius: 14, border: `1px solid ${isFirst ? 'rgba(34,197,94,0.35)' : '#1E293B'}`,
                padding: isFirst ? '24px 16px' : '20px 14px',
                textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                boxShadow: isFirst ? '0 0 48px rgba(34,197,94,0.12)' : 'none',
                transition: 'transform 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <span style={{ fontSize: 26 }}>{medals[i]}</span>
                <Avatar name={p.name} color={p.color} size={isFirst ? 52 : 42} />
                <div style={{ color: 'white', fontWeight: 800, fontSize: isFirst ? 16 : 14 }}>{p.name}</div>
                <div>
                  <span style={{ color: isFirst ? '#22C55E' : '#94A3B8', fontSize: isFirst ? 32 : 24, fontWeight: 800, lineHeight: 1 }}>
                    {p.total_runs}
                  </span>
                  <span style={{ color: '#334155', fontSize: 11, marginLeft: 5 }}>runs</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Ranks 4–12 table */}
      {rest.length > 0 && (
        <div style={{ background: '#0A111E', borderRadius: 12, border: '1px solid #0F1E35', overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '46px 1fr 100px 70px 1fr', padding: '9px 18px', borderBottom: '1px solid #0F1E35' }}>
            {['#', 'Participant', 'Runs', 'Rank', 'Squad'].map(h => (
              <div key={h} style={{ color: '#1E3A5F', fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{h}</div>
            ))}
          </div>
          {rest.map(p => (
            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '46px 1fr 100px 70px 1fr', padding: '12px 18px', borderBottom: '1px solid #060E1A', alignItems: 'center', transition: 'background 0.14s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ color: '#475569', fontWeight: 700, fontSize: 14 }}>#{p.rank}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <Avatar name={p.name} color={p.color} size={28} />
                <span style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>{p.name}</span>
              </div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>{p.total_runs}</div>
              <div style={{ color: '#334155', fontSize: 12 }}>#{p.rank}</div>
              <ParticipantSlots participantId={p.id} />
            </div>
          ))}
        </div>
      )}

      {/* Simple bar comparison */}
      {chartData.length > 0 && (
        <div style={{ background: '#0A111E', borderRadius: 12, border: '1px solid #0F1E35', padding: 22 }}>
          <h3 style={{ color: 'white', fontWeight: 700, marginBottom: 4, fontSize: 14 }}>Total Runs — Season Standings</h3>
          <p style={{ color: '#475569', fontSize: 12, marginBottom: 16 }}>Cumulative across all published matches</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {leaderboard.map(p => {
              const max = leaderboard[0]?.total_runs || 1
              const pct = Math.round((p.total_runs / max) * 100)
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 90, color: '#94A3B8', fontSize: 12, fontWeight: 600, textAlign: 'right', flexShrink: 0 }}>{p.name}</div>
                  <div style={{ flex: 1, background: '#060E1A', borderRadius: 4, height: 20, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: p.color || '#22C55E', borderRadius: 4, transition: 'width 0.6s ease', minWidth: p.total_runs > 0 ? 4 : 0 }} />
                  </div>
                  <div style={{ width: 45, color: 'white', fontSize: 12, fontWeight: 700 }}>{p.total_runs}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {leaderboard.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#334155' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏏</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Season not started yet</div>
          <div style={{ fontSize: 13 }}>Waiting for the draft and first match scores</div>
        </div>
      )}
    </div>
  )
}

// Mini slot list for a participant in the table
function ParticipantSlots({ participantId }) {
  const { getParticipantSlots } = useApp()
  const slots = getParticipantSlots(participantId)
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
      {slots.map(s => <SlotBadge key={s} slot={s} />)}
      {slots.length === 0 && <span style={{ color: '#1E3A5F', fontSize: 11 }}>Not drafted</span>}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div style={{ padding: 28 }}>
      <Skeleton height={28} radius={8} />
      <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1.1fr 1fr', gap: 12 }}>
        {[0,1,2].map(i => <Skeleton key={i} height={180} radius={14} />)}
      </div>
      <div style={{ marginTop: 16 }}>
        {[0,1,2,3,4].map(i => <Skeleton key={i} height={48} radius={0} />)}
      </div>
    </div>
  )
}
