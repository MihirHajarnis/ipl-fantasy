import { useApp } from '../context/AppContext.jsx'
import { Avatar, SlotBadge, StatCard } from '../components/ui.jsx'
import { TEAM_META } from '../lib/supabase.js'

export default function AdminDashboard() {
  const { leaderboard, participants, slotTotals, matches, getParticipantSlots, setPage } = useApp()
  const published   = matches.filter(m => m.published)
  const unpublished = matches.filter(m => !m.published)

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ color: 'white', fontSize: 20, fontWeight: 800, marginBottom: 3 }}>🛡 Admin Overview</h1>
        <p style={{ color: '#64748B', fontSize: 13 }}>All participants, squads and scores</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <StatCard label="Participants"      value={12} />
        <StatCard label="Published"         value={published.length} />
        <StatCard label="Pending"           value={unpublished.length} accent="#F59E0B" />
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <ActionBtn label="✏️ Enter Scores"   color="#22C55E" onClick={() => setPage('admin-scores')} />
        <ActionBtn label="🎯 Draft Picker"    color="#A855F7" onClick={() => setPage('draft')} />
        <ActionBtn label="📋 All Slots"       color="#3B82F6" onClick={() => setPage('allslots')} />
        <ActionBtn label="✅ Verifications"   color="#F59E0B" onClick={() => setPage('verification')} />
      </div>

      {/* All 12 participant squads */}
      <h2 style={{ color: 'white', fontSize: 15, fontWeight: 700, marginBottom: 12 }}>All Participants & Squads</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {participants.map(p => {
          const lb    = leaderboard.find(l => l.id === p.id)
          const slots = getParticipantSlots(p.id)
          return (
            <div key={p.id} style={{ background: '#0A111E', borderRadius: 12, border: '1px solid #0F1E35', padding: 14 }}>
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: slots.length > 0 ? 12 : 0 }}>
                <Avatar name={p.name} color={p.color} size={32} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                  <div style={{ color: '#475569', fontSize: 11 }}>
                    Code: <span style={{ color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>{p.access_code}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {lb && <div style={{ color: '#22C55E', fontWeight: 800, fontSize: 15 }}>#{lb.rank}</div>}
                  <div style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>{lb?.total_runs || 0} runs</div>
                </div>
              </div>

              {/* Slot rows */}
              {slots.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {slots.map(slot => {
                    const st   = slotTotals[slot]
                    const runs = st?.total_runs || 0
                    const team = slot.replace(/\d+$/, '')
                    const meta = TEAM_META[team]
                    return (
                      <div key={slot} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: '#060E1A', borderRadius: 7 }}>
                        <SlotBadge slot={slot} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 50, background: '#0F1E35', borderRadius: 3, height: 4 }}>
                            <div style={{ width: `${Math.min(100, (runs / 350) * 100)}%`, height: '100%', background: meta?.accent || '#22C55E', borderRadius: 3 }} />
                          </div>
                          <span style={{ color: runs > 0 ? '#22C55E' : '#334155', fontWeight: 700, fontSize: 13, minWidth: 28, textAlign: 'right' }}>{runs}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ color: '#1E3A5F', fontSize: 12, textAlign: 'center', padding: '8px 0' }}>No slots yet — run the Draft</div>
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
      padding: '12px 16px', background: `${color}15`, border: `1px solid ${color}40`,
      borderRadius: 10, color, cursor: 'pointer', fontSize: 13, fontWeight: 700,
      fontFamily: 'inherit', textAlign: 'center', width: '100%',
    }}>
      {label}
    </button>
  )
}
