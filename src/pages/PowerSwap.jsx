import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { SlotBadge, Avatar, StatusBadge } from '../components/ui.jsx'
import {
  fetchSwapRequests, proposeSwap, respondToSwap,
  cancelSwap, openSwapRound, closeSwapRound, finaliseSwapRound,
} from '../lib/api.js'

// ── Status config ─────────────────────────────────────────────
const SWAP_STATUS = {
  pending:   { col: '#F59E0B', bg: 'rgba(245,158,11,0.10)',  bd: 'rgba(245,158,11,0.30)',  lbl: '⏳ Pending'    },
  accepted:  { col: '#22C55E', bg: 'rgba(34,197,94,0.10)',   bd: 'rgba(34,197,94,0.30)',   lbl: '✓ Accepted'   },
  declined:  { col: '#EF4444', bg: 'rgba(239,68,68,0.10)',   bd: 'rgba(239,68,68,0.30)',   lbl: '✗ Declined'   },
  finalised: { col: '#3B82F6', bg: 'rgba(59,130,246,0.10)',  bd: 'rgba(59,130,246,0.30)',  lbl: '🔒 Finalised'  },
  cancelled: { col: '#475569', bg: 'rgba(71,85,105,0.10)',   bd: 'rgba(71,85,105,0.30)',   lbl: '✗ Cancelled'  },
}

function SwapStatusChip({ status }) {
  const s = SWAP_STATUS[status] || SWAP_STATUS.pending
  return (
    <span style={{ background: s.bg, border: `1px solid ${s.bd}`, color: s.col, borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {s.lbl}
    </span>
  )
}

// ── Single swap card ──────────────────────────────────────────
function SwapCard({ swap, participants, isAdmin, currentUserId, onAccept, onDecline, onCancel }) {
  const proposer = participants.find(p => p.id === swap.proposer_id)
  const receiver = participants.find(p => p.id === swap.receiver_id)
  const isReceiver  = currentUserId === swap.receiver_id
  const isProposer  = currentUserId === swap.proposer_id
  const canRespond  = isReceiver && swap.status === 'pending'
  const canCancel   = isProposer && swap.status === 'pending'

  return (
    <div style={{
      background: '#0A111E', borderRadius: 12,
      border: `1px solid ${swap.status === 'accepted' ? 'rgba(34,197,94,0.25)' : swap.status === 'declined' ? 'rgba(239,68,68,0.2)' : '#0F1E35'}`,
      padding: 16, marginBottom: 10,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar name={proposer?.name || '?'} color={proposer?.color} size={24} />
          <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{proposer?.name}</span>
          <span style={{ color: '#334155', fontSize: 13 }}>→</span>
          <Avatar name={receiver?.name || '?'} color={receiver?.color} size={24} />
          <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{receiver?.name}</span>
        </div>
        <SwapStatusChip status={swap.status} />
      </div>

      {/* Swap details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center', marginBottom: 14 }}>
        <div style={{ background: '#060E1A', borderRadius: 9, padding: '12px 14px', textAlign: 'center' }}>
          <div style={{ color: '#64748B', fontSize: 10, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' }}>{proposer?.name} gives</div>
          <SlotBadge slot={swap.proposer_slot} size="lg" />
        </div>
        <div style={{ color: '#334155', fontSize: 20, textAlign: 'center' }}>⇄</div>
        <div style={{ background: '#060E1A', borderRadius: 9, padding: '12px 14px', textAlign: 'center' }}>
          <div style={{ color: '#64748B', fontSize: 10, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' }}>{receiver?.name} gives</div>
          <SlotBadge slot={swap.receiver_slot} size="lg" />
        </div>
      </div>

      {/* Time */}
      <div style={{ color: '#334155', fontSize: 11, marginBottom: swap.status === 'pending' ? 12 : 0 }}>
        Proposed {new Date(swap.proposed_at).toLocaleString()}
        {swap.responded_at && ` · Responded ${new Date(swap.responded_at).toLocaleString()}`}
      </div>

      {/* Actions */}
      {canRespond && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button onClick={() => onAccept(swap.id)} style={{ padding: '10px', background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.28)', borderRadius: 8, color: '#22C55E', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>
            ✓ Accept Swap
          </button>
          <button onClick={() => onDecline(swap.id)} style={{ padding: '10px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 8, color: '#EF4444', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>
            ✗ Decline
          </button>
        </div>
      )}
      {canCancel && (
        <button onClick={() => onCancel(swap.id)} style={{ padding: '8px 16px', background: 'rgba(71,85,105,0.10)', border: '1px solid rgba(71,85,105,0.25)', borderRadius: 7, color: '#64748B', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>
          Withdraw proposal
        </button>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function PowerSwap() {
  const { user, participants, swapRounds, draftMap, getParticipantSlots, toast, refresh } = useApp()

  const isAdmin      = user?.role === 'admin'
  const currentUser  = participants.find(p => p.id === user?.id)
  const mySlots      = currentUser ? getParticipantSlots(currentUser.id) : []

  // Local swap state per round
  const [swapsByRound, setSwapsByRound] = useState({ 1: [], 2: [] })
  const [activeRound,  setActiveRound]  = useState(1)

  // Propose swap form
  const [proposeOpen,   setProposeOpen]  = useState(false)
  const [mySlotPick,    setMySlotPick]   = useState('')
  const [targetPart,    setTargetPart]   = useState('')
  const [theirSlotPick, setTheirSlot]    = useState('')
  const [proposing,     setProposing]    = useState(false)

  // Admin confirm
  const [confirm, setConfirm] = useState(null)

  // Load swap requests for both rounds
  useEffect(() => {
    const load = async () => {
      const results = await Promise.all(
        swapRounds.map(r => fetchSwapRequests(r.id).then(swaps => ({ roundId: r.id, roundNum: r.round_number, swaps })))
      )
      const map = {}
      results.forEach(({ roundNum, swaps }) => { map[roundNum] = swaps })
      setSwapsByRound(map)
    }
    if (swapRounds.length) load()
  }, [swapRounds])

  const round     = swapRounds.find(r => r.round_number === activeRound)
  const swaps     = swapsByRound[activeRound] || []
  const isOpen    = round?.status === 'open'
  const isFinalised = round?.status === 'finalised'

  const acceptedSwaps = swaps.filter(s => s.status === 'accepted')
  const pendingSwaps  = swaps.filter(s => s.status === 'pending')
  const mySwaps       = swaps.filter(s => s.proposer_id === user?.id || s.receiver_id === user?.id)

  // Target participant's slots (for the propose form)
  const targetParticipant = participants.find(p => p.id === parseInt(targetPart))
  const theirSlots = targetParticipant ? getParticipantSlots(targetParticipant.id) : []

  // ── Handlers ─────────────────────────────────────────────────

  const handlePropose = async () => {
    if (!mySlotPick)    { toast('Pick one of your slots to offer', 'error');  return }
    if (!targetPart)    { toast('Select who you want to swap with', 'error'); return }
    if (!theirSlotPick) { toast('Pick their slot you want', 'error');          return }
    if (parseInt(targetPart) === user?.id) { toast('You cannot swap with yourself', 'error'); return }

    // Check participant hasn't already proposed in this round
    const alreadyProposed = swaps.find(s => s.proposer_id === user?.id && s.status === 'pending')
    if (alreadyProposed) { toast('You already have a pending proposal this round. Withdraw it first.', 'error'); return }

    setProposing(true)
    try {
      await proposeSwap(round.id, user.id, mySlotPick, parseInt(targetPart), theirSlotPick)
      toast('Swap proposed! Waiting for their response 🤝')
      setProposeOpen(false); setMySlotPick(''); setTargetPart(''); setTheirSlot('')
      refresh()
    } catch (e) { toast('Failed: ' + e.message, 'error') }
    finally { setProposing(false) }
  }

  const handleAccept  = async (swapId) => { try { await respondToSwap(swapId, true);  toast('Swap accepted ✓'); refresh() } catch (e) { toast(e.message, 'error') } }
  const handleDecline = async (swapId) => { try { await respondToSwap(swapId, false); toast('Swap declined');   refresh() } catch (e) { toast(e.message, 'error') } }
  const handleCancel  = async (swapId) => { try { await cancelSwap(swapId);           toast('Proposal withdrawn'); refresh() } catch (e) { toast(e.message, 'error') } }

  const handleOpenRound = async () => {
    setConfirm(null)
    try { await openSwapRound(round.id); toast(`Power Swap Round ${activeRound} is now OPEN 🔓`); refresh() }
    catch (e) { toast(e.message, 'error') }
  }

  const handleCloseRound = async () => {
    setConfirm(null)
    try { await closeSwapRound(round.id); toast(`Round ${activeRound} closed — pending swaps cancelled`, 'warning'); refresh() }
    catch (e) { toast(e.message, 'error') }
  }

  const handleFinalise = async () => {
    setConfirm(null)
    try {
      await finaliseSwapRound(round.id)
      toast(`Round ${activeRound} finalised! ${acceptedSwaps.length} swap${acceptedSwaps.length !== 1 ? 's' : ''} executed 🔄`)
      refresh()
    } catch (e) { toast(e.message, 'error') }
  }

  // ── Confirm dialog ────────────────────────────────────────────
  const ConfirmDialog = () => {
    if (!confirm) return null
    const cfg = {
      open:     { title: `Open Round ${activeRound}?`,     body: 'Participants will be able to propose and accept swaps.',                                                      action: handleOpenRound,  col: '#22C55E' },
      close:    { title: `Close Round ${activeRound}?`,    body: 'All pending and accepted swaps will be cancelled. No swaps will be executed.',                                action: handleCloseRound, col: '#F59E0B' },
      finalise: { title: `Finalise Round ${activeRound}?`, body: `${acceptedSwaps.length} accepted swap${acceptedSwaps.length !== 1 ? 's' : ''} will be executed permanently. This cannot be undone.`, action: handleFinalise,   col: '#3B82F6' },
    }[confirm]
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: '#0A111E', borderRadius: 16, border: `1px solid ${cfg.col}44`, padding: 28, maxWidth: 380, width: '100%' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>⚡</div>
          <h3 style={{ color: 'white', fontWeight: 800, fontSize: 16, marginBottom: 8 }}>{cfg.title}</h3>
          <p style={{ color: '#94A3B8', fontSize: 13, lineHeight: 1.6, marginBottom: 22 }}>{cfg.body}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={() => setConfirm(null)} style={{ padding: '11px', background: '#060E1A', border: '1px solid #1E293B', borderRadius: 8, color: '#94A3B8', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>Cancel</button>
            <button onClick={cfg.action} style={{ padding: '11px', background: cfg.col, border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 800, fontFamily: 'inherit' }}>Confirm</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 16, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <ConfirmDialog />

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ color: 'white', fontSize: 20, fontWeight: 800, marginBottom: 3 }}>⚡ Power Swap</h1>
        <p style={{ color: '#64748B', fontSize: 13 }}>2 rounds · 1 swap per participant per round · both must agree</p>
      </div>

      {/* Round tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {swapRounds.map(r => {
          const active = activeRound === r.round_number
          const statusCol = r.status === 'open' ? '#22C55E' : r.status === 'finalised' ? '#3B82F6' : '#475569'
          return (
            <button key={r.id} onClick={() => setActiveRound(r.round_number)} style={{
              flex: 1, padding: '12px 16px', borderRadius: 10,
              border: `1px solid ${active ? statusCol : '#1E293B'}`,
              background: active ? `${statusCol}15` : '#0A111E',
              color: active ? statusCol : '#64748B',
              cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 14,
              transition: 'all 0.15s',
            }}>
              <div>Round {r.round_number}</div>
              <div style={{ fontSize: 11, fontWeight: 500, marginTop: 2, color: statusCol }}>
                {r.status === 'open' ? '🟢 Open' : r.status === 'finalised' ? '🔒 Finalised' : '⚫ Closed'}
              </div>
            </button>
          )
        })}
      </div>

      {/* Admin controls */}
      {isAdmin && round && (
        <div style={{ background: '#0A111E', borderRadius: 12, border: '1px solid #0F1E35', padding: 16, marginBottom: 16 }}>
          <div style={{ color: '#94A3B8', fontSize: 12, fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Admin Controls — Round {activeRound}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {round.status === 'closed' && (
              <button onClick={() => setConfirm('open')} style={{ padding: '10px 20px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 9, color: '#22C55E', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>
                🔓 Open Round {activeRound}
              </button>
            )}
            {round.status === 'open' && (
              <>
                <button onClick={() => setConfirm('finalise')} disabled={acceptedSwaps.length === 0} style={{
                  padding: '10px 20px',
                  background: acceptedSwaps.length > 0 ? '#3B82F6' : '#1E293B',
                  border: 'none', borderRadius: 9,
                  color: acceptedSwaps.length > 0 ? 'white' : '#475569',
                  cursor: acceptedSwaps.length > 0 ? 'pointer' : 'not-allowed',
                  fontSize: 13, fontWeight: 800, fontFamily: 'inherit',
                }}>
                  🔒 Finalise Round ({acceptedSwaps.length} swap{acceptedSwaps.length !== 1 ? 's' : ''} ready)
                </button>
                <button onClick={() => setConfirm('close')} style={{ padding: '10px 20px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 9, color: '#EF4444', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>
                  Close Without Finalising
                </button>
              </>
            )}
            {round.status === 'finalised' && (
              <div style={{ color: '#3B82F6', fontSize: 13, fontWeight: 600, padding: '10px 0' }}>
                🔒 Round {activeRound} finalised on {new Date(round.finalised_at).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Not-final disclaimer */}
      {isOpen && acceptedSwaps.length > 0 && (
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
          <div>
            <div style={{ color: '#F59E0B', fontWeight: 700, fontSize: 13, marginBottom: 3 }}>Swaps Not Yet Final</div>
            <div style={{ color: '#94A3B8', fontSize: 12, lineHeight: 1.6 }}>
              {acceptedSwaps.length} swap{acceptedSwaps.length !== 1 ? 's have' : ' has'} been mutually agreed but the admin has not yet finalised this round. Squads shown below reflect <strong style={{ color: 'white' }}>current assignments only</strong> — these swaps are pending execution.
            </div>
          </div>
        </div>
      )}

      {/* Round closed / not started */}
      {!isOpen && !isFinalised && (
        <div style={{ background: '#0A111E', borderRadius: 12, border: '1px solid #1E293B', padding: '32px 20px', textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>⚫</div>
          <div style={{ color: '#475569', fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Round {activeRound} is not open yet</div>
          <div style={{ color: '#334155', fontSize: 13 }}>
            {isAdmin ? 'Click "Open Round" above to start this Power Swap round.' : 'Waiting for admin to open this round.'}
          </div>
        </div>
      )}

      {/* Propose swap — participants only, round is open */}
      {!isAdmin && isOpen && !isFinalised && (
        <div style={{ background: '#0A111E', borderRadius: 12, border: '1px solid #0F1E35', overflow: 'hidden', marginBottom: 16 }}>
          <button onClick={() => setProposeOpen(s => !s)} style={{ width: '100%', padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'inherit' }}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>⚡ Propose a Swap</span>
            <span style={{ color: '#475569', fontSize: 12 }}>{proposeOpen ? '▲' : '▼'}</span>
          </button>

          {proposeOpen && (
            <div style={{ padding: '0 16px 16px', borderTop: '1px solid #0F1E35' }}>
              <div style={{ color: '#64748B', fontSize: 12, margin: '12px 0 16px', lineHeight: 1.6 }}>
                Pick one of your slots to offer, select who you want to swap with, then pick their slot.
              </div>

              {/* Step 1 — my slot */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ color: '#94A3B8', fontSize: 11, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>1. Your slot to offer</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {mySlots.map(s => (
                    <button key={s} onClick={() => setMySlotPick(s)} style={{
                      padding: '6px 2px', background: 'transparent', border: 'none', cursor: 'pointer',
                      transform: mySlotPick === s ? 'scale(1.1)' : 'none',
                      outline: mySlotPick === s ? '2px solid #22C55E' : 'none',
                      borderRadius: 8, transition: 'all 0.15s',
                    }}>
                      <SlotBadge slot={s} size="lg" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2 — pick participant */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ color: '#94A3B8', fontSize: 11, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>2. Swap with</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {participants.filter(p => p.id !== user?.id).map(p => (
                    <button key={p.id} onClick={() => { setTargetPart(String(p.id)); setTheirSlot('') }} style={{
                      display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px',
                      background: targetPart === String(p.id) ? `${p.color}22` : '#060E1A',
                      border: `1px solid ${targetPart === String(p.id) ? p.color : '#1E293B'}`,
                      borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'all 0.15s',
                    }}>
                      <Avatar name={p.name} color={p.color} size={20} />
                      <span style={{ color: targetPart === String(p.id) ? 'white' : '#64748B', fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 3 — their slot */}
              {targetParticipant && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#94A3B8', fontSize: 11, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>3. Their slot you want</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {theirSlots.map(s => (
                      <button key={s} onClick={() => setTheirSlot(s)} style={{
                        padding: '6px 2px', background: 'transparent', border: 'none', cursor: 'pointer',
                        transform: theirSlotPick === s ? 'scale(1.1)' : 'none',
                        outline: theirSlotPick === s ? '2px solid #3B82F6' : 'none',
                        borderRadius: 8, transition: 'all 0.15s',
                      }}>
                        <SlotBadge slot={s} size="lg" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview */}
              {mySlotPick && theirSlotPick && targetParticipant && (
                <div style={{ background: '#060E1A', borderRadius: 10, padding: '12px 14px', marginBottom: 14, border: '1px solid rgba(34,197,94,0.2)' }}>
                  <div style={{ color: '#22C55E', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Swap Preview</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#64748B', fontSize: 10, marginBottom: 4 }}>You give</div>
                      <SlotBadge slot={mySlotPick} size="lg" />
                    </div>
                    <div style={{ color: '#334155', fontSize: 20 }}>⇄</div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#64748B', fontSize: 10, marginBottom: 4 }}>You get</div>
                      <SlotBadge slot={theirSlotPick} size="lg" />
                    </div>
                    <div style={{ color: '#475569', fontSize: 12, marginLeft: 'auto' }}>from {targetParticipant.name}</div>
                  </div>
                </div>
              )}

              <button onClick={handlePropose} disabled={proposing || !mySlotPick || !theirSlotPick} style={{
                padding: '12px 24px', background: mySlotPick && theirSlotPick ? '#22C55E' : '#1E293B',
                border: 'none', borderRadius: 9, color: mySlotPick && theirSlotPick ? '#060E1A' : '#475569',
                cursor: mySlotPick && theirSlotPick ? 'pointer' : 'not-allowed',
                fontSize: 14, fontWeight: 800, fontFamily: 'inherit',
              }}>
                {proposing ? 'Sending…' : '⚡ Send Swap Proposal'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Swaps list */}
      {(isOpen || isFinalised) && (
        <div>
          {/* For participants — show only their swaps */}
          {!isAdmin && (
            <>
              <div style={{ color: 'white', fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
                Your Swaps This Round
              </div>
              {mySwaps.length === 0
                ? <div style={{ color: '#334155', fontSize: 13, padding: '16px 0' }}>No swap proposals involving you yet.</div>
                : mySwaps.map(s => (
                    <SwapCard key={s.id} swap={s} participants={participants}
                      isAdmin={false} currentUserId={user?.id}
                      onAccept={handleAccept} onDecline={handleDecline} onCancel={handleCancel}
                    />
                  ))
              }
            </>
          )}

          {/* For admin — show all swaps grouped by status */}
          {isAdmin && (
            <>
              {/* Accepted — ready to finalise */}
              {acceptedSwaps.length > 0 && (
                <>
                  <div style={{ color: '#22C55E', fontWeight: 700, fontSize: 13, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E' }} />
                    Accepted — Ready to Finalise ({acceptedSwaps.length})
                    {isOpen && <span style={{ color: '#F59E0B', fontSize: 11, fontWeight: 600, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 5, padding: '2px 7px' }}>⚠ Not Final</span>}
                  </div>
                  {acceptedSwaps.map(s => (
                    <SwapCard key={s.id} swap={s} participants={participants} isAdmin currentUserId={null} onAccept={handleAccept} onDecline={handleDecline} onCancel={handleCancel} />
                  ))}
                </>
              )}

              {/* Pending */}
              {pendingSwaps.length > 0 && (
                <>
                  <div style={{ color: '#F59E0B', fontWeight: 700, fontSize: 13, marginBottom: 10, marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B' }} />
                    Awaiting Response ({pendingSwaps.length})
                  </div>
                  {pendingSwaps.map(s => (
                    <SwapCard key={s.id} swap={s} participants={participants} isAdmin currentUserId={null} onAccept={handleAccept} onDecline={handleDecline} onCancel={handleCancel} />
                  ))}
                </>
              )}

              {/* Declined / Cancelled */}
              {swaps.filter(s => ['declined','cancelled'].includes(s.status)).length > 0 && (
                <>
                  <div style={{ color: '#475569', fontWeight: 700, fontSize: 13, marginBottom: 10, marginTop: 16 }}>
                    Declined / Cancelled
                  </div>
                  {swaps.filter(s => ['declined','cancelled'].includes(s.status)).map(s => (
                    <SwapCard key={s.id} swap={s} participants={participants} isAdmin currentUserId={null} onAccept={handleAccept} onDecline={handleDecline} onCancel={handleCancel} />
                  ))}
                </>
              )}

              {/* Finalised */}
              {swaps.filter(s => s.status === 'finalised').length > 0 && (
                <>
                  <div style={{ color: '#3B82F6', fontWeight: 700, fontSize: 13, marginBottom: 10, marginTop: 16 }}>
                    Executed Swaps
                  </div>
                  {swaps.filter(s => s.status === 'finalised').map(s => (
                    <SwapCard key={s.id} swap={s} participants={participants} isAdmin currentUserId={null} onAccept={handleAccept} onDecline={handleDecline} onCancel={handleCancel} />
                  ))}
                </>
              )}

              {swaps.length === 0 && (
                <div style={{ color: '#334155', fontSize: 13, padding: '16px 0', textAlign: 'center' }}>No swap proposals yet this round.</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
