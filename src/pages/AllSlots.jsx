import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { SlotBadge, Avatar, PageHeader } from '../components/ui.jsx'
import { IPL_TEAMS, TEAM_META, ALL_SLOTS } from '../lib/supabase.js'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

export default function AllSlots() {
  const { slotTotals, participants, getParticipantSlots, setPage, setFocusSlot } = useApp()
  const [filterTeam, setFT] = useState('ALL')
  const [sortBy,     setSB] = useState('total_runs')

  const getOwner = slot => participants.find(p => getParticipantSlots(p.id).includes(slot))

  const slots = ALL_SLOTS
    .filter(s => filterTeam === 'ALL' || s.startsWith(filterTeam))
    .sort((a, b) => (slotTotals[b]?.[sortBy] || 0) - (slotTotals[a]?.[sortBy] || 0))

  return (
    <div style={{ padding: 28, animation: 'fadeUp 0.35s ease' }}>
      <PageHeader
        title="📋 All Batting Slots"
        subtitle="60 slots across 10 teams · click any row for full match history"
      />

      {/* Team filter */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
        {['ALL', ...IPL_TEAMS].map(t => {
          const active = filterTeam === t
          const meta   = TEAM_META[t]
          return (
            <button key={t} onClick={() => setFT(t)} style={{
              padding: '5px 11px', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit',
              border:      `1px solid ${active ? (meta?.color || '#22C55E') : '#1E293B'}`,
              background:  active ? `${meta?.color || '#22C55E'}22` : 'transparent',
              color:       active ? (meta?.accent || '#22C55E') : '#64748B',
              fontSize: 11, fontWeight: 700,
            }}>
              {t === 'ALL' ? 'All Teams' : t}
            </button>
          )
        })}
      </div>

      {/* Sort */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 18, alignItems: 'center' }}>
        <span style={{ color: '#475569', fontSize: 11, fontWeight: 600 }}>Sort:</span>
        {[['total_runs','Runs'],['total_balls','Balls'],['total_fours','Fours'],['total_sixes','Sixes']].map(([k,l]) => (
          <button key={k} onClick={() => setSB(k)} style={{
            padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
            border: `1px solid ${sortBy === k ? '#22C55E' : '#1E293B'}`,
            background: sortBy === k ? 'rgba(34,197,94,0.10)' : 'transparent',
            color: sortBy === k ? '#22C55E' : '#64748B',
            fontSize: 11, fontWeight: 700,
          }}>{l}</button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#0A111E', borderRadius: 12, border: '1px solid #0F1E35', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '140px 80px 70px 60px 55px 55px 110px 130px', padding: '9px 18px', borderBottom: '1px solid #0F1E35' }}>
          {['Slot','Runs','S/R','Balls','4s','6s','Trend','Owner'].map(h => (
            <div key={h} style={{ color: '#1E3A5F', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</div>
          ))}
        </div>

        {slots.map(slot => {
          const d     = slotTotals[slot] || {}
          const team  = slot.replace(/\d+$/, '')
          const meta  = TEAM_META[team]
          const runs  = d.total_runs  || 0
          const balls = d.total_balls || 0
          const srVal = balls > 0 ? ((runs / balls) * 100).toFixed(1) : '—'
          const owner = getOwner(slot)

          return (
            <div key={slot}
              onClick={() => { setFocusSlot(slot); setPage('slotdetail') }}
              style={{ display: 'grid', gridTemplateColumns: '140px 80px 70px 60px 55px 55px 110px 130px', padding: '11px 18px', borderBottom: '1px solid #060E1A', alignItems: 'center', cursor: 'pointer', transition: 'background 0.14s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <SlotBadge slot={slot} />
              <div style={{ color: runs > 0 ? '#22C55E' : '#334155', fontWeight: 800, fontSize: 15 }}>{runs}</div>
              <div style={{ color: '#64748B', fontSize: 12 }}>{srVal}</div>
              <div style={{ color: '#64748B', fontSize: 12 }}>{balls || '—'}</div>
              <div style={{ color: '#64748B', fontSize: 12 }}>{d.total_fours || '—'}</div>
              <div style={{ color: '#64748B', fontSize: 12 }}>{d.total_sixes || '—'}</div>
              {/* Sparkline placeholder */}
              <div style={{ height: 24, opacity: 0.6 }}>
                <div style={{ width: `${Math.min(100, (runs / 400) * 100)}%`, minWidth: runs > 0 ? 3 : 0, height: '100%', background: `linear-gradient(90deg, ${meta?.color || '#334155'}, ${meta?.accent || '#475569'})`, borderRadius: 3 }} />
              </div>
              {owner
                ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Avatar name={owner.name} color={owner.color} size={20} />
                    <span style={{ color: '#94A3B8', fontSize: 11, fontWeight: 500 }}>{owner.name}</span>
                  </div>
                : <span style={{ color: '#1E3A5F', fontSize: 11 }}>—</span>
              }
            </div>
          )
        })}
      </div>
    </div>
  )
}
