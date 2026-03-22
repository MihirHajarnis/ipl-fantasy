import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { SlotBadge, Avatar, BackBtn } from '../components/ui.jsx'
import { TEAM_META } from '../lib/supabase.js'
import { fetchSlotHistory } from '../lib/api.js'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

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
    fetchSlotHistory(slot)
      .then(rows => { setHistory(rows); setLoading(false) })
      .catch(() => setLoading(false))
  }, [slot])

  if (!slot) return null

  const chartData = history.map(r => ({
    match:  r.matches?.label || `M${r.match_id}`,
    runs:   r.runs,
    balls:  r.balls,
    fours:  r.fours,
    sixes:  r.sixes,
    sr:     r.balls > 0 ? parseFloat(((r.runs / r.balls) * 100).toFixed(1)) : 0,
    boundaries: r.fours * 4 + r.sixes * 6,
  }))

  const totalBoundary = data.total_fours * 4 + data.total_sixes * 6
  const avgPerMatch   = chartData.length > 0 ? Math.round(data.total_runs / chartData.length) : 0
  const srOverall     = data.total_balls > 0 ? ((data.total_runs / data.total_balls) * 100).toFixed(1) : '—'

  return (
    <div style={{ padding: 16 }}>
      <BackBtn label="← Back" onClick={() => setPage('allslots')} />

      {/* Identity card */}
      <div style={{ background: '#0A111E', borderRadius: 14, border: `1px solid ${meta.color}44`, padding: 20, marginBottom: 14, textAlign: 'center' }}>
        <SlotBadge slot={slot} size="lg" />
        <div style={{ color: '#475569', fontSize: 12, marginTop: 6, marginBottom: 12 }}>{meta.label}</div>
        <div style={{ color: '#22C55E', fontSize: 48, fontWeight: 800, lineHeight: 1 }}>{data.total_runs}</div>
        <div style={{ color: '#1E3A5F', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 4, marginBottom: 14 }}>Total Runs · Season</div>
        {owner && (
          <div style={{ background: `${owner.color}15`, border: `1px solid ${owner.color}33`, borderRadius: 9, padding: '10px 14px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Avatar name={owner.name} color={owner.color} size={24} />
            <span style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>{owner.name}</span>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 14 }}>
        {[
          ['Strike Rate', srOverall,       '#3B82F6'],
          ['Balls Faced', data.total_balls,'#94A3B8'],
          ['Fours',       data.total_fours,'#F59E0B'],
          ['Sixes',       data.total_sixes,'#A855F7'],
          ['Boundary Runs', totalBoundary, '#EF4444'],
          ['Avg / Match', avgPerMatch,     '#22C55E'],
        ].map(([lbl, val, col]) => (
          <div key={lbl} style={{ background: '#0A111E', borderRadius: 10, border: '1px solid #0F1E35', padding: '12px 14px' }}>
            <div style={{ color: '#475569', fontSize: 11, marginBottom: 4 }}>{lbl}</div>
            <div style={{ color: col, fontSize: 20, fontWeight: 800 }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Runs chart */}
      <div style={{ background: '#0A111E', borderRadius: 12, border: '1px solid #0F1E35', padding: 16, marginBottom: 14 }}>
        <div style={{ color: 'white', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Runs Per Match</div>
        <div style={{ color: '#475569', fontSize: 12, marginBottom: 14 }}>Counts toward leaderboard</div>
        {loading ? (
          <div style={{ height: 160, background: '#060E1A', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontSize: 13 }}>Loading…</div>
        ) : chartData.length === 0 ? (
          <div style={{ height: 100, background: '#060E1A', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontSize: 13 }}>No data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#0F1E35" />
              <XAxis dataKey="match" stroke="#0F1E35" tick={{ fill: '#475569', fontSize: 10 }} />
              <YAxis stroke="#0F1E35" tick={{ fill: '#475569', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#09111F', border: '1px solid #1E293B', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="runs" stroke={meta.accent} fill={`${meta.color}22`} strokeWidth={2.5} name="Runs" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Match scorecard */}
      {chartData.length > 0 && (
        <div style={{ background: '#0A111E', borderRadius: 12, border: '1px solid #0F1E35', padding: 16 }}>
          <div style={{ color: 'white', fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Match Scorecard</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 340 }}>
              <thead>
                <tr>
                  {['Match','Runs','Balls','S/R','4s','6s'].map(h => (
                    <th key={h} style={{ color: '#1E3A5F', fontWeight: 700, padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #0F1E35', fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chartData.map((m, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #060E1A' }}>
                    <td style={{ padding: '10px', color: '#64748B', fontWeight: 600 }}>{m.match}</td>
                    <td style={{ padding: '10px', color: m.runs >= 50 ? '#22C55E' : m.runs >= 30 ? '#F59E0B' : '#94A3B8', fontWeight: 800, fontSize: 16 }}>{m.runs}</td>
                    <td style={{ padding: '10px', color: '#64748B' }}>{m.balls}</td>
                    <td style={{ padding: '10px', color: '#3B82F6', fontWeight: 600 }}>{m.sr}</td>
                    <td style={{ padding: '10px', color: '#F59E0B' }}>{m.fours}</td>
                    <td style={{ padding: '10px', color: '#A855F7' }}>{m.sixes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
