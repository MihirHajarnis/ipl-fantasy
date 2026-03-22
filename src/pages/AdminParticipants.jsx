import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { Avatar, PageHeader } from '../components/ui.jsx'
import { updateParticipant } from '../lib/api.js'

export default function AdminParticipants() {
  const { participants, toast, refresh } = useApp()

  // Track which row is being edited
  const [editing,  setEditing]  = useState(null)   // participant id
  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')
  const [saving,   setSaving]   = useState(false)

  const startEdit = (p) => {
    setEditing(p.id)
    setEditName(p.name)
    setEditCode(p.access_code)
  }

  const cancelEdit = () => {
    setEditing(null)
    setEditName('')
    setEditCode('')
  }

  const handleSave = async (p) => {
    // Validation
    if (!editName.trim()) { toast('Name cannot be empty', 'error'); return }
    if (!editCode.trim()) { toast('Access code cannot be empty', 'error'); return }
    if (editCode.trim().length < 4) { toast('Access code must be at least 4 characters', 'error'); return }

    // Check for duplicate code (ignore self)
    const codeUpper = editCode.toUpperCase().trim()
    const duplicate = participants.find(x => x.id !== p.id && x.access_code === codeUpper)
    if (duplicate) { toast(`Code ${codeUpper} is already used by ${duplicate.name}`, 'error'); return }

    setSaving(true)
    try {
      await updateParticipant(p.id, editName, editCode)
      toast(`${editName}'s details updated ✓`)
      cancelEdit()
      refresh()
    } catch (e) {
      toast('Update failed: ' + e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <PageHeader
        title="👤 Manage Participants"
        subtitle="Edit names and access codes · changes take effect immediately"
      />

      {/* Info banner */}
      <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.22)', borderRadius: 10, padding: '12px 16px', marginBottom: 18, color: '#94A3B8', fontSize: 13, lineHeight: 1.6 }}>
        <span style={{ color: '#3B82F6', fontWeight: 700 }}>ℹ️ Note: </span>
        Changes to access codes take effect instantly. Make sure to share the new code with the participant before they try to log in.
      </div>

      {/* Participant list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {participants.map(p => {
          const isEditing = editing === p.id

          return (
            <div key={p.id} style={{
              background: '#0A111E',
              borderRadius: 12,
              border: `1px solid ${isEditing ? 'rgba(34,197,94,0.35)' : '#0F1E35'}`,
              padding: '14px 16px',
              transition: 'border-color 0.2s',
            }}>
              {isEditing ? (
                /* ── Edit mode ── */
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <Avatar name={editName || p.name} color={p.color} size={34} />
                    <span style={{ color: '#22C55E', fontSize: 12, fontWeight: 700 }}>Editing…</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                    {/* Name field */}
                    <div>
                      <label style={{ color: '#94A3B8', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 5 }}>
                        NAME
                      </label>
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        placeholder="Participant name"
                        maxLength={30}
                        style={{
                          width: '100%', padding: '10px 12px',
                          background: '#060E1A', border: '1px solid #22C55E',
                          borderRadius: 8, color: 'white', fontSize: 14,
                          outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    {/* Access code field */}
                    <div>
                      <label style={{ color: '#94A3B8', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 5 }}>
                        ACCESS CODE
                      </label>
                      <input
                        value={editCode}
                        onChange={e => setEditCode(e.target.value.toUpperCase())}
                        placeholder="e.g. ASH001"
                        maxLength={10}
                        style={{
                          width: '100%', padding: '10px 12px',
                          background: '#060E1A', border: '1px solid #22C55E',
                          borderRadius: 8, color: '#22C55E', fontSize: 14,
                          fontWeight: 700, outline: 'none',
                          fontFamily: "'JetBrains Mono', monospace",
                          boxSizing: 'border-box', letterSpacing: '1px',
                        }}
                      />
                      <div style={{ color: '#475569', fontSize: 10, marginTop: 4 }}>
                        Will be auto-uppercased
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button onClick={cancelEdit} style={{
                      padding: '11px', background: '#060E1A',
                      border: '1px solid #1E293B', borderRadius: 8,
                      color: '#64748B', cursor: 'pointer', fontSize: 13,
                      fontWeight: 700, fontFamily: 'inherit',
                    }}>
                      Cancel
                    </button>
                    <button onClick={() => handleSave(p)} disabled={saving} style={{
                      padding: '11px', background: saving ? '#166534' : '#22C55E',
                      border: 'none', borderRadius: 8,
                      color: '#060E1A', cursor: saving ? 'wait' : 'pointer',
                      fontSize: 13, fontWeight: 800, fontFamily: 'inherit',
                    }}>
                      {saving ? 'Saving…' : '✓ Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                /* ── View mode ── */
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar name={p.name} color={p.color} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>{p.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      <span style={{ color: '#475569', fontSize: 11 }}>Code:</span>
                      <span style={{
                        color: '#22C55E', fontSize: 12, fontWeight: 700,
                        fontFamily: "'JetBrains Mono', monospace",
                        background: 'rgba(34,197,94,0.08)',
                        border: '1px solid rgba(34,197,94,0.2)',
                        borderRadius: 5, padding: '1px 7px',
                        letterSpacing: '0.5px',
                      }}>
                        {p.access_code}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => startEdit(p)}
                    style={{
                      padding: '8px 14px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid #1E293B',
                      borderRadius: 8, color: '#94A3B8',
                      cursor: 'pointer', fontSize: 12, fontWeight: 700,
                      fontFamily: 'inherit', flexShrink: 0,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#22C55E'; e.currentTarget.style.color = '#22C55E' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E293B'; e.currentTarget.style.color = '#94A3B8' }}
                  >
                    ✏️ Edit
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Codes summary — visible to admin only */}
      <div style={{ background: '#0A111E', borderRadius: 12, border: '1px solid #0F1E35', padding: 16, marginTop: 20 }}>
        <div style={{ color: 'white', fontWeight: 700, fontSize: 14, marginBottom: 12 }}>All Access Codes (Admin View)</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {participants.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #060E1A' }}>
              <span style={{ color: '#94A3B8', fontSize: 13 }}>{p.name}</span>
              <span style={{
                color: '#22C55E', fontSize: 12, fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
                background: 'rgba(34,197,94,0.07)',
                border: '1px solid rgba(34,197,94,0.18)',
                borderRadius: 5, padding: '2px 9px', letterSpacing: '0.5px',
              }}>
                {p.access_code}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
