import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { SlotBadge, StatusBadge, StatusDot, PageHeader } from '../components/ui.jsx'
import { IPL_TEAMS, ALL_SLOTS } from '../lib/supabase.js'
import { fetchVerificationsForParticipant, fetchScoresForMatch, upsertVerification } from '../lib/api.js'

export default function Verification() {
  const { user, participants, matches, getParticipantSlots, slotTotals, toast } = useApp()

  const me        = participants.find(p => p.id === user?.id)
  const mySlots   = me ? getParticipantSlots(me.id) : []
  const published = matches.filter(m => m.published)
  const latestMatch = published.at(-1)

  const [verifs,  setVerifs]  = useState({})
  const [scores,  setScores]  = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!me || !latestMatch) return
    setLoading(true)
    Promise.all([
      fetchVerificationsForParticipant(me.id, latestMatch.id),
      fetchScoresForMatch(latestMatch.id),
    ]).then(([vs, ss]) => {
      const vMap = {}; vs.forEach(v => { vMap[v.slot_id] = v.status })
      const sMap = {}; ss.forEach(s => { sMap[s.slot_id] = s })
      setVerifs(vMap); setScores(sMap); setLoading(false)
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

  const verifiedCount = mySlots.filter(s => verifs[s] === 'verified').length
  const allVerified   = mySlots.length > 0 && verifiedCount === mySlots.length

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ color: 'white', fontSize: 20, fontWeight: 800, marginBottom: 3 }}>✅ Verification</h1>
        <p style={{ color: '#64748B', fontSize: 13 }}>
          {latestMatch ? `Latest: ${latestMatch.label}` : 'No published matches yet'}
        </p>
      </div>

      {!latestMatch && (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📅</div>
          <div style={{ color: '#475569', fontSize: 14, fontWeight: 600 }}>No matches published yet</div>
        </div>
      )}

      {latestMatch && (
        <>
          {allVerified && (
            <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 14, color: '#22C55E', fontSize: 14, fontWeight: 600 }}>
              ✓ All your slots verified for {latestMatch.label}!
            </div>
          )}

          {/* Progress */}
          <div style={{ background: '#0A111E', borderRadius: 10, border: '1px solid #0F1E35', padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'white', fontWeight: 700 }}>My Slots</span>
            <span style={{ color: '#64748B', fontSize: 13 }}>{verifiedCount}/{mySlots.length} verified</span>
          </div>

          {/* My slot cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {mySlots.map(slot => {
              const score  = scores[slot] || {}
              const status = verifs[slot] || 'pending'
              return (
                <div key={slot} style={{ background: '#0A111E', borderRadius: 12, border: '1px solid #0F1E35', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <SlotBadge slot={slot} size="lg" />
                    <StatusBadge status={status} />
                  </div>

                  {/* Score display */}
                  <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                    <div style={{ background: '#060E1A', borderRadius: 8, padding: '8px 14px', textAlign: 'center', flex: 1 }}>
                      <div style={{ color: '#22C55E', fontWeight: 800, fontSize: 22 }}>{score.runs ?? '—'}</div>
                      <div style={{ color: '#334155', fontSize: 10 }}>runs this match</div>
                    </div>
                    <div style={{ background: '#060E1A', borderRadius: 8, padding: '8px 14px', textAlign: 'center', flex: 1 }}>
                      <div style={{ color: '#94A3B8', fontWeight: 700, fontSize: 22 }}>{slotTotals[slot]?.total_runs ?? 0}</div>
                      <div style={{ color: '#334155', fontSize: 10 }}>total runs</div>
                    </div>
                  </div>

                  {status === 'pending' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <button onClick={() => handleVerify(slot)} style={{ padding: '11px', background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.28)', borderRadius: 8, color: '#22C55E', cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit' }}>
                        ✓ Verify
                      </button>
                      <button onClick={() => handleDispute(slot)} style={{ padding: '11px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 8, color: '#EF4444', cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit' }}>
                        ⚠ Issue
                      </button>
                    </div>
                  ) : (
                    <div style={{ color: '#334155', fontSize: 12, textAlign: 'center' }}>
                      {status === 'verified' ? '✓ Confirmed' : '⚠ Under review'}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* All slots overview — grouped by team */}
          <h2 style={{ color: 'white', fontSize: 15, fontWeight: 700, marginBottom: 10 }}>All Slots Overview</h2>
          <div style={{ background: '#0A111E', borderRadius: 12, border: '1px solid #0F1E35', padding: 14 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              {[['verified','#22C55E','Verified'],['pending','#F59E0B','Pending'],['disputed','#EF4444','Disputed']].map(([s,c,l]) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <StatusDot status={s} /><span style={{ color: '#64748B', fontSize: 11 }}>{l}</span>
                </div>
              ))}
            </div>
            {IPL_TEAMS.map(team => (
              <div key={team} style={{ marginBottom: 10 }}>
                <div style={{ color: '#1E3A5F', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 5 }}>{team}</div>
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
