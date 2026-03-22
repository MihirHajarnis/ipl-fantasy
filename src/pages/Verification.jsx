import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { SlotBadge, StatusBadge, StatusDot, PageHeader } from '../components/ui.jsx'
import { IPL_TEAMS, ALL_SLOTS } from '../lib/supabase.js'
import {
  fetchVerificationsForParticipant,
  fetchScoresForMatch,
  upsertVerification
} from '../lib/api.js'

export default function Verification() {
  const { user, participants, matches, getParticipantSlots, slotTotals, toast, refresh } = useApp()

  const me      = participants.find(p => p.id === user?.id)
  const mySlots = me ? getParticipantSlots(me.id) : []

  // Latest published match
  const published = matches.filter(m => m.published)
  const latestMatch = published.at(-1)

  const [verifs,  setVerifs]  = useState({})   // { slotId: status }
  const [scores,  setScores]  = useState({})   // { slotId: { runs, balls, fours, sixes } }
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!me || !latestMatch) return
    setLoading(true)
    Promise.all([
      fetchVerificationsForParticipant(me.id, latestMatch.id),
      fetchScoresForMatch(latestMatch.id),
    ]).then(([vs, ss]) => {
      const vMap = {}
      vs.forEach(v => { vMap[v.slot_id] = v.status })
      setVerifs(vMap)

      const sMap = {}
      ss.forEach(s => { sMap[s.slot_id] = s })
      setScores(sMap)
      setLoading(false)
    })
  }, [me?.id, latestMatch?.id])

  const handleVerify = async (slotId) => {
    try {
      await upsertVerification(latestMatch.id, slotId, me.id, 'verified')
      setVerifs(v => ({ ...v, [slotId]: 'verified' }))
      toast('Score verified ✓')
    } catch (e) { toast('Error: ' + e.message, 'error') }
  }

  const handleDispute = async (slotId) => {
    try {
      await upsertVerification(latestMatch.id, slotId, me.id, 'disputed')
      setVerifs(v => ({ ...v, [slotId]: 'disputed' }))
      toast('Issue raised — admin will review', 'warning')
    } catch (e) { toast('Error: ' + e.message, 'error') }
  }

  const allVerified = mySlots.length > 0 && mySlots.every(s => verifs[s] === 'verified')
  const verifiedCount = mySlots.filter(s => verifs[s] === 'verified').length

  return (
    <div style={{ padding: 28, animation: 'fadeUp 0.35s ease' }}>
      <PageHeader
        title="✅ Score Verification"
        subtitle={latestMatch ? `Latest match: ${latestMatch.label}` : 'No published matches yet'}
      />

      {!latestMatch && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#334155' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📅</div>
          <div style={{ color: '#475569', fontSize: 14, fontWeight: 600 }}>No published matches yet</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Waiting for admin to publish match scores</div>
        </div>
      )}

      {latestMatch && (
        <>
          {allVerified && (
            <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 10, padding: '12px 18px', marginBottom: 20, color: '#22C55E', fontSize: 14, fontWeight: 600 }}>
              ✓ All your slots are verified for {latestMatch.label}!
            </div>
          )}

          {/* My slots */}
          <h2 style={{ color: 'white', fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
            My 5 Slots — {latestMatch.label} &nbsp;
            <span style={{ color: '#475569', fontWeight: 500, fontSize: 13 }}>({verifiedCount}/{mySlots.length} verified)</span>
          </h2>

          <div style={{ background: '#0A111E', borderRadius: 12, border: '1px solid #0F1E35', overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 80px 60px 60px 110px 1fr', padding: '9px 18px', borderBottom: '1px solid #0F1E35' }}>
              {['Slot','Runs','Balls','4s','6s','Status','Action'].map(h => (
                <div key={h} style={{ color: '#1E3A5F', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</div>
              ))}
            </div>

            {mySlots.length === 0 && (
              <div style={{ padding: '24px 18px', color: '#334155', fontSize: 13 }}>No slots assigned — waiting for draft</div>
            )}

            {mySlots.map(slot => {
              const score  = scores[slot] || {}
              const status = verifs[slot] || 'pending'
              return (
                <div key={slot} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 80px 60px 60px 110px 1fr', padding: '13px 18px', borderBottom: '1px solid #060E1A', alignItems: 'center', transition: 'background 0.14s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <SlotBadge slot={slot} size="lg" />
                  <div>
                    <div style={{ color: '#22C55E', fontWeight: 800, fontSize: 17 }}>{score.runs ?? '—'}</div>
                    <div style={{ color: '#334155', fontSize: 10 }}>
                      {slotTotals[slot]?.total_runs ?? 0} total
                    </div>
                  </div>
                  <div style={{ color: '#64748B', fontSize: 13 }}>{score.balls ?? '—'}</div>
                  <div style={{ color: '#64748B', fontSize: 13 }}>{score.fours ?? '—'}</div>
                  <div style={{ color: '#64748B', fontSize: 13 }}>{score.sixes ?? '—'}</div>
                  <StatusBadge status={status} />
                  {status === 'pending'
                    ? <div style={{ display: 'flex', gap: 7 }}>
                        <ActionBtn color="#22C55E" onClick={() => handleVerify(slot)}>✓ Verify</ActionBtn>
                        <ActionBtn color="#EF4444" onClick={() => handleDispute(slot)}>⚠ Issue</ActionBtn>
                      </div>
                    : <span style={{ color: '#334155', fontSize: 12, fontWeight: 500 }}>
                        {status === 'verified' ? '✓ Confirmed' : '⚠ Under review'}
                      </span>
                  }
                </div>
              )
            })}
          </div>

          {/* All-slot status grid */}
          <h2 style={{ color: 'white', fontSize: 15, fontWeight: 700, marginBottom: 12 }}>All 60 Slots — Verification Overview</h2>
          <div style={{ background: '#0A111E', borderRadius: 12, border: '1px solid #0F1E35', padding: 20 }}>
            <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
              {[['verified','#22C55E','Verified'],['pending','#F59E0B','Pending'],['disputed','#EF4444','Disputed']].map(([s,c,l]) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <StatusDot status={s} />
                  <span style={{ color: '#64748B', fontSize: 11 }}>{l}</span>
                </div>
              ))}
            </div>
            {IPL_TEAMS.map(team => (
              <div key={team} style={{ marginBottom: 12 }}>
                <div style={{ color: '#1E3A5F', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.5px' }}>{team}</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {ALL_SLOTS.filter(s => s.startsWith(team)).map(slot => (
                    <div key={slot} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#060E1A', borderRadius: 6, padding: '3px 7px', border: '1px solid #0F1E35' }}>
                      <SlotBadge slot={slot} />
                      <StatusDot status={verifs[slot] || 'pending'} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ActionBtn({ color, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 12px',
      background: `${color}12`, border: `1px solid ${color}33`,
      borderRadius: 7, color, cursor: 'pointer',
      fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
      transition: 'all 0.15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = `${color}22` }}
      onMouseLeave={e => { e.currentTarget.style.background = `${color}12` }}
    >{children}</button>
  )
}
