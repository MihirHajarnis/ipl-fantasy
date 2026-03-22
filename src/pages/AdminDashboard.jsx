import { useApp } from '../context/AppContext.jsx'
import { Avatar, SlotBadge, StatCard } from '../components/ui.jsx'
import { TEAM_META } from '../lib/supabase.js'

export default function AdminDashboard() {
  const { leaderboard, participants, slotTotals, matches, getParticipantSlots, setPage } = useApp()

  const published = matches.filter(m => m.published)
  const unpublished = matches.filter(m => !m.published)

  return (
    <div style={{ padding: 28, animation: 'fadeUp 0.35s ease' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: 'white', fontSize: 22, fontWeight: 800, marginBottom: 3 }}>🛡 Admin Overview</h1>
        <p style={{ color: '#64748B', fontSize: 13 }}>Full view of all participants, squads, and scores</p>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatCard label="Participants"     value={12} />
        <StatCard label="Published Matches" value={published.length} />
        <StatCard label="Pending Matches"  value={unpublished.length} accent="#F59E0B" />
        <StatCard label="Total Slots"      value={60} />
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
        <ActionBtn label="✏️ Enter Scores"  color="#22C55E" onClick={() => setPage('admin-scores')} />
        <ActionBtn label="📅 Manage Matches" color="#3B82F6" onClick={() => setPage('admin-matches')} />
        <ActionBtn label="🎯 Draft Picker"   color="#A855F7" onClick={() => setPage('draft')} />
      </div>

      {/* All 12 participant squads */}
      <h2 style={{ color: 'white', fontSize: 15, fontWeight: 700, marginBottom: 14 }}>All Participants & Squads</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
        {participants.map((p, i) => {
          const lb    = leaderboard.find(l => l.id === p.id)
          const slots = getParticipantSlots(p.id)
          const totalRuns = lb?.total_runs || 0

          return (
            <div key={p.id} style={{ background: '#0A111E', borderRadius: 12, border: '1px solid #0F1E35', padding: 18, transition: 'border-color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = p.color + '55'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#0F1E35'}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={p.name} color={p.color} size={34} />
                  <div>
                    <div style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                    <div style={{ color: '#475569', fontSize: 11 }}>Code: <span style={{ color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>{p.access_code}</span></div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {lb && <div style={{ color: '#22C55E', fontWeight: 800, fontSize: 18 }}>#{lb.rank}</div>}
                  <div style={{ color: 'white', fontWeight: 700 }}>{totalRuns} runs</div>
                </div>
              </div>

              {/* Slot list with per-slot runs */}
              {slots.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {slots.map(slot => {
                    const st   = slotTotals[slot]
                    const runs = st?.total_runs || 0
                    const team = slot.replace(/\d+$/, '')
                    const meta = TEAM_META[team]
                    return (
                      <div key={slot} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: '#060E1A', borderRadius: 7, border: '1px solid #0F1E35' }}>
                        <SlotBadge slot={slot} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {/* Mini run bar */}
                          <div style={{ width: 60, background: '#0F1E35', borderRadius: 3, height: 4, overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, (runs / 350) * 100)}%`, height: '100%', background: meta?.accent || '#22C55E', borderRadius: 3 }} />
                          </div>
                          <span style={{ color: runs > 0 ? '#22C55E' : '#334155', fontWeight: 700, fontSize: 13, minWidth: 32, textAlign: 'right' }}>
                            {runs}
                          </span>
                          <span style={{ color: '#334155', fontSize: 11 }}>runs</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ color: '#1E3A5F', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>
                  No slots assigned yet — run the Draft
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ActionBtn({ label, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 20px',
      background: `${color}18`, border: `1px solid ${color}44`,
      borderRadius: 9, color, cursor: 'pointer',
      fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
      transition: 'all 0.18s',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = `${color}28`; e.currentTarget.style.borderColor = `${color}88` }}
      onMouseLeave={e => { e.currentTarget.style.background = `${color}18`; e.currentTarget.style.borderColor = `${color}44` }}
    >
      {label}
    </button>
  )
}
