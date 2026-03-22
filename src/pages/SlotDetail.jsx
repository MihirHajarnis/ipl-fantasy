import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { SlotBadge, Avatar, BackBtn } from '../components/ui.jsx'
import { TEAM_META } from '../lib/supabase.js'
import { fetchSlotHistory } from '../lib/api.js'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'

export default function SlotDetail() {
  const { focusSlot, slotTotals, participants, getParticipantSlots, setPage } = useApp()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  const slot  = focusSlot
  const team  = slot ? slot.replace(/\d+$/, '') : ''
  const meta  = TEAM_META[team] || { color: '#334155', accent: '#94A3B8', label: '' }
  const data  = slotTotals[slot] || { total_runs: 0, total_balls: 0, total_fours: 0, total_sixes: 0 }
  const owner = participants.find(p => getParticipantSlots(p.id).includes(slot))

  useEffect(() => {
    if (!slot) return
    setLoading(true)
    fetchSlotHistory(slot).then(rows => {
      setHistory(rows)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [slot])

  if (!slot) return null

  const chartData = history.map(r => ({
    match:      r.matches?.label || `M${r.match_id}`,
    runs:       r.runs,
    balls:      r.balls,
    fours:      r.fours,
    sixes:      r.sixes,
    sr:         r.balls > 0 ? parseFloat(((r.runs / r.balls) * 100).toFixed(1)) : 0,
    boundaries: r.fours * 4 + r.sixes * 6,
  }))

  const totalBoundaryRuns = data.total_fours * 4 + data.total_sixes * 6
  const avgPerMatch = chartData.length > 0 ? Math.round(data.total_runs / chartData.length) : 0
  const srOverall   = data.total_balls > 0 ? ((data.total_runs / data.total_balls) * 100).toFixed(1) : '—'

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: '#09111F', border: '1px solid #1E293B', borderRadius: 8, padding: '10px 14px' }}>
        <div style={{ color: '#94A3B8', fontSize: 11, marginBottom: 6 }}>{label}</div>
        {payload.map(p => (
          <div key={p.name} style={{ color: p.color, fontSize: 13, fontWeight: 700 }}>
            {p.name}: {p.value}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ padding: 28, animation: 'fadeUp 0.35s ease' }}>
      <BackBtn label="← Back to All Slots" onClick={() => setPage('allslots')} />

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, alignItems: 'start' }}>

        {/* Left panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Identity */}
          <div style={{ background: '#0A111E', borderRadius: 14, border: `1px solid ${meta.color}44`, padding: 24, textAlign: 'center', boxShadow: `0 0 40px ${meta.color}10` }}>
            <div style={{ width: 70, height: 70, background: `${meta.color}22`, border: `2px solid ${meta.color}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 14px' }}>🏏</div>
            <SlotBadge slot={slot} size="lg" />
            <div style={{ color: '#475569', fontSize: 12, marginTop: 6, marginBottom: 14 }}>{meta.label}</div>
            <div style={{ color: '#22C55E', fontSize: 44, fontWeight: 800, lineHeight: 1 }}>{data.total_runs}</div>
            <div style={{ color: '#1E3A5F', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 4, marginBottom: 16 }}>
              Total Runs · Season
            </div>
            {owner
              ? <div style={{ background: `${owner.color}15`, border: `1px solid ${owner.color}33`, borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ color: '#475569', fontSize: 10, marginBottom: 5, textTransform: 'uppercase', fontWeight: 600 }}>Owned By</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Avatar name={owner.name} color={owner.color} size={24} />
                    <span style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>{owner.name}</span>
                  </div>
                </div>
              : <div style={{ color: '#1E3A5F', fontSize: 12 }}>Unowned slot</div>
            }
          </div>

          {/* Stats */}
          <div style={{ background: '#0A111E', borderRadius: 12, border: '1px solid #0F1E35', padding: 18 }}>
            <div style={{ color: '#1E3A5F', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>Season Stats</div>
            {[
              ['🏏 Total Runs',    data.total_runs,       '#22C55E'],
              ['⚡ Strike Rate',   srOverall,             '#3B82F6'],
              ['🏏 Balls Faced',   data.total_balls,      '#94A3B8'],
              ['4️⃣  Fours',         data.total_fours,      '#F59E0B'],
              ['6️⃣  Sixes',         data.total_sixes,      '#A855F7'],
              ['🔥 Boundary Runs', totalBoundaryRuns,     '#EF4444'],
              ['📈 Avg / Match',   avgPerMatch,           '#22C55E'],
              ['🎯 Matches Played',chartData.length,      '#94A3B8'],
            ].map(([label, val, col]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #060E1A' }}>
                <span style={{ color: '#64748B', fontSize: 12 }}>{label}</span>
                <span style={{ color: col, fontWeight: 700, fontSize: 13 }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Runs per match — primary */}
          <div style={{ background: '#0A111E', borderRadius: 12, border: '1px solid #0F1E35', padding: 22 }}>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Runs Per Match</div>
            <div style={{ color: '#475569', fontSize: 12, marginBottom: 16 }}>This is the score that counts toward the leaderboard</div>
            {loading ? (
              <div style={{ height: 200, background: '#060E1A', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontSize: 13 }}>Loading match data…</div>
            ) : chartData.length === 0 ? (
              <div style={{ height: 200, background: '#060E1A', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontSize: 13 }}>No published match data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#0F1E35" />
                  <XAxis dataKey="match" stroke="#0F1E35" tick={{ fill: '#475569', fontSize: 11 }} />
                  <YAxis stroke="#0F1E35" tick={{ fill: '#475569', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="runs" stroke={meta.accent} fill={`${meta.color}22`} strokeWidth={2.5} name="Runs" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Match scorecard table */}
          {chartData.length > 0 && (
            <div style={{ background: '#0A111E', borderRadius: 12, border: '1px solid #0F1E35', padding: 22 }}>
              <div style={{ color: 'white', fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Match-by-Match Scorecard</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      {['Match','Runs','Balls','S/R','4s','6s','Boundary Runs'].map(h => (
                        <th key={h} style={{ color: '#1E3A5F', fontWeight: 700, padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #0F1E35', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((m, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #060E1A', transition: 'background 0.14s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '10px 12px', color: '#64748B', fontWeight: 600 }}>{m.match}</td>
                        <td style={{ padding: '10px 12px', color: m.runs >= 50 ? '#22C55E' : m.runs >= 30 ? '#F59E0B' : '#94A3B8', fontWeight: 800, fontSize: 16 }}>{m.runs}</td>
                        <td style={{ padding: '10px 12px', color: '#64748B' }}>{m.balls}</td>
                        <td style={{ padding: '10px 12px', color: '#3B82F6', fontWeight: 600 }}>{m.sr}</td>
                        <td style={{ padding: '10px 12px', color: '#F59E0B' }}>{m.fours}</td>
                        <td style={{ padding: '10px 12px', color: '#A855F7' }}>{m.sixes}</td>
                        <td style={{ padding: '10px 12px', color: '#EF4444', fontWeight: 600 }}>{m.boundaries}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Strike rate + boundary charts */}
          {chartData.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ background: '#0A111E', borderRadius: 12, border: '1px solid #0F1E35', padding: 18 }}>
                <div style={{ color: 'white', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Strike Rate</div>
                <div style={{ color: '#475569', fontSize: 11, marginBottom: 12 }}>Visualization only</div>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={chartData}>
                    <XAxis dataKey="match" stroke="#0F1E35" tick={{ fill: '#475569', fontSize: 10 }} />
                    <YAxis stroke="#0F1E35" tick={{ fill: '#475569', fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="sr" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6', r: 3 }} name="S/R" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={{ background: '#0A111E', borderRadius: 12, border: '1px solid #0F1E35', padding: 18 }}>
                <div style={{ color: 'white', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Boundary Runs</div>
                <div style={{ color: '#475569', fontSize: 11, marginBottom: 12 }}>Visualization only</div>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={chartData}>
                    <XAxis dataKey="match" stroke="#0F1E35" tick={{ fill: '#475569', fontSize: 10 }} />
                    <YAxis stroke="#0F1E35" tick={{ fill: '#475569', fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="boundaries" radius={[3, 3, 0, 0]} name="Boundary Runs">
                      {chartData.map((_, i) => <Cell key={i} fill={meta.accent} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
