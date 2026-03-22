import { useApp } from '../context/AppContext.jsx'
import { Avatar, SlotBadge, StatCard, Skeleton } from '../components/ui.jsx'

export default function Dashboard() {
  const { leaderboard, participants, matches, loading, getParticipantSlots } = useApp()
  const published = matches.filter(m => m.published)
  const sorted = [...leaderboard].sort((a, b) => a.rank - b.rank)
  const top3 = sorted.slice(0, 3)
  const rest  = sorted.slice(3)

  if (loading) return (
    <div style={{ padding: 16 }}>
      {[0,1,2,3,4].map(i => <div key={i} style={{ marginBottom: 10 }}><Skeleton height={60} /></div>)}
    </div>
  )

  return (
    <div style={{ padding: 16 }}>

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ color: 'white', fontSize: 20, fontWeight: 800, marginBottom: 3 }}>🏆 Leaderboard</h1>
        <p style={{ color: '#64748B', fontSize: 13 }}>Points = total runs · {published.length} matches played</p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        <StatCard label="Participants" value={12} />
        <StatCard label="Slots" value={60} />
        <StatCard label="Matches" value={published.length} />
      </div>

      {/* Top 3 podium — stacked on mobile */}
      {top3.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {/* #1 first on mobile */}
          {[top3[0], top3[1], top3[2]].map((p, i) => {
            if (!p) return null
            const medals = ['🥇','🥈','🥉']
            const isFirst = i === 0
            return (
              <div key={p.id} style={{
                background: isFirst ? 'linear-gradient(135deg,#041810,#052e16)' : '#0A111E',
                borderRadius: 12, border: `1px solid ${isFirst ? 'rgba(34,197,94,0.35)' : '#1E293B'}`,
                padding: '14px 16px', marginBottom: 8,
                display: 'flex', alignItems: 'center', gap: 12,
                boxShadow: isFirst ? '0 0 24px rgba(34,197,94,0.1)' : 'none',
              }}>
                <span style={{ fontSize: 24 }}>{medals[i]}</span>
                <Avatar name={p.name} color={p.color} size={38} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>{p.name}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 5 }}>
                    <ParticipantSlots participantId={p.id} />
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: isFirst ? '#22C55E' : '#94A3B8', fontSize: 22, fontWeight: 800 }}>{p.total_runs}</div>
                  <div style={{ color: '#334155', fontSize: 10 }}>runs</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Ranks 4–12 */}
      {rest.length > 0 && (
        <div style={{ background: '#0A111E', borderRadius: 12, border: '1px solid #0F1E35', overflow: 'hidden', marginBottom: 16 }}>
          {rest.map((p, i) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: i < rest.length - 1 ? '1px solid #060E1A' : 'none' }}>
              <div style={{ color: '#475569', fontWeight: 700, fontSize: 14, width: 24, textAlign: 'center' }}>#{p.rank}</div>
              <Avatar name={p.name} color={p.color} size={30} />
              <div style={{ flex: 1 }}>
                <div style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>{p.name}</div>
              </div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>{p.total_runs}</div>
            </div>
          ))}
        </div>
      )}

      {/* Run bar chart */}
      {leaderboard.length > 0 && (
        <div style={{ background: '#0A111E', borderRadius: 12, border: '1px solid #0F1E35', padding: 16 }}>
          <h3 style={{ color: 'white', fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Season Standings</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {leaderboard.map(p => {
              const max = leaderboard[0]?.total_runs || 1
              const pct = Math.round((p.total_runs / max) * 100)
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 72, color: '#94A3B8', fontSize: 12, fontWeight: 600, textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ flex: 1, background: '#060E1A', borderRadius: 4, height: 18, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: p.color || '#22C55E', borderRadius: 4, transition: 'width 0.6s ease', minWidth: p.total_runs > 0 ? 4 : 0 }} />
                  </div>
                  <div style={{ width: 36, color: 'white', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{p.total_runs}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {leaderboard.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🏏</div>
          <div style={{ color: '#475569', fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Season not started yet</div>
          <div style={{ color: '#334155', fontSize: 13 }}>Waiting for draft and first match</div>
        </div>
      )}
    </div>
  )
}

function ParticipantSlots({ participantId }) {
  const { getParticipantSlots } = useApp()
  const slots = getParticipantSlots(participantId)
  return <>{slots.map(s => <SlotBadge key={s} slot={s} />)}</>
}
