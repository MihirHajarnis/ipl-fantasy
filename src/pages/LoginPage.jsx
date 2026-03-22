import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { IPL_TEAMS, TEAM_META } from '../lib/supabase.js'

export default function LoginPage() {
  const { loginAdmin, loginParticipant } = useApp()
  const [role,     setRole]     = useState('participant')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [code,     setCode]     = useState('')
  const [loading,  setLoading]  = useState(false)
  const [showPass, setShowPass] = useState(false)

  const go = async () => {
    setLoading(true)
    if (role === 'admin') {
      loginAdmin(username, password)
    } else {
      await loginParticipant(code)
    }
    setLoading(false)
  }

  const handleKey = e => { if (e.key === 'Enter') go() }

  return (
    <div style={{
      minHeight: '100vh', background: '#060E1A',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Ambient glow */}
      <div style={{ position: 'absolute', top: '-15%', left: '-10%', width: 500, height: 500, background: 'radial-gradient(circle,rgba(34,197,94,0.08) 0%,transparent 70%)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-15%', right: '-5%',  width: 600, height: 600, background: 'radial-gradient(circle,rgba(59,130,246,0.05) 0%,transparent 70%)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }} />

      <div style={{ display: 'flex', width: '100%', maxWidth: 900, borderRadius: 20, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.7)', border: '1px solid #1E293B', zIndex: 1 }}>

        {/* ── Left hero panel ── */}
        <div style={{ flex: 1, background: 'linear-gradient(155deg,#041810 0%,#060E1A 55%,#0a1525 100%)', padding: '52px 44px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRight: '1px solid rgba(34,197,94,0.1)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
              <div style={{ width: 40, height: 40, background: '#22C55E', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏏</div>
              <span style={{ color: 'white', fontSize: 18, fontWeight: 800 }}>IPL Fantasy</span>
            </div>
            <h1 style={{ color: 'white', fontSize: 34, fontWeight: 800, lineHeight: 1.1, marginBottom: 14, letterSpacing: '-0.5px' }}>
              Track every run.<br />
              <span style={{ color: '#22C55E' }}>Own the game.</span>
            </h1>
            <p style={{ color: '#64748B', fontSize: 14, lineHeight: 1.7, maxWidth: 280 }}>
              Each batting slot is a position that any player can occupy. Pure batting. Pure runs. No bias.
            </p>
          </div>

          <div>
            <p style={{ color: '#1E3A5F', fontSize: 10, fontWeight: 700, letterSpacing: '1px', marginBottom: 10 }}>
              12 PARTICIPANTS · 60 BATTING SLOTS · 5 DRAFT CYCLES
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {IPL_TEAMS.map(t => {
                const meta = TEAM_META[t]
                return (
                  <span key={t} style={{ background: `${meta.color}22`, border: `1px solid ${meta.color}55`, color: meta.accent, borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                    {t}
                  </span>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div style={{ flex: 1, background: '#0A111E', padding: '52px 44px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h2 style={{ color: 'white', fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Sign in</h2>
          <p style={{ color: '#475569', fontSize: 13, marginBottom: 28 }}>Select your role to continue</p>

          {/* Role toggle */}
          <div style={{ display: 'flex', background: '#060E1A', borderRadius: 10, padding: 4, marginBottom: 28, border: '1px solid #1E293B', gap: 4 }}>
            {[['participant', '👤 Participant'], ['admin', '🛡 Admin']].map(([r, lbl]) => (
              <button key={r} onClick={() => setRole(r)} style={{
                flex: 1, padding: '10px 0', borderRadius: 7, border: 'none',
                cursor: 'pointer',
                background: role === r ? '#22C55E' : 'transparent',
                color:      role === r ? '#060E1A' : '#64748B',
                fontWeight: 700, fontSize: 13, fontFamily: 'inherit',
                transition: 'all 0.18s',
              }}>{lbl}</button>
            ))}
          </div>

          {role === 'admin' ? (
            <>
              <Field label="Username" value={username} onChange={setUsername} placeholder="commissioner" onKeyDown={handleKey} />
              <Field label="Password" value={password} onChange={setPassword} placeholder="••••••••" type={showPass ? 'text' : 'password'} onKeyDown={handleKey}
                suffix={
                  <button onClick={() => setShowPass(s => !s)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 12, padding: 0 }}>
                    {showPass ? 'Hide' : 'Show'}
                  </button>
                }
              />
            </>
          ) : (
            <Field
              label="Access Code"
              value={code} onChange={setCode}
              placeholder="e.g. ASH001"
              onKeyDown={handleKey}
              hint="ASH001 · KUN002 · TAN003 · MIH004 · PRA005 · SAN006 · TUS007 · PTH008 · PAD009 · VIS010 · ARV011 · MIT012"
            />
          )}

          <button
            onClick={go} disabled={loading}
            style={{
              width: '100%', padding: '13px', marginTop: 4,
              background: loading ? '#166534' : '#22C55E',
              color: '#060E1A', border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 800, cursor: loading ? 'wait' : 'pointer',
              fontFamily: 'inherit', transition: 'all 0.18s',
            }}
          >
            {loading ? 'Signing in…' : 'Continue →'}
          </button>

          <p style={{ color: '#1E3A5F', fontSize: 11, textAlign: 'center', marginTop: 20 }}>
            Private league · contact admin for access
          </p>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', hint, onKeyDown, suffix }) {
  const [foc, setFoc] = useState(false)
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ color: '#94A3B8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>{label}</label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type={type} value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          onKeyDown={onKeyDown}
          onFocus={() => setFoc(true)}
          onBlur={() => setFoc(false)}
          style={{
            width: '100%', padding: suffix ? '11px 60px 11px 14px' : '11px 14px',
            background: '#060E1A',
            border: `1px solid ${foc ? '#22C55E' : '#1E293B'}`,
            borderRadius: 8, color: 'white', fontSize: 14,
            outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
            transition: 'border-color 0.2s',
          }}
        />
        {suffix && <div style={{ position: 'absolute', right: 12 }}>{suffix}</div>}
      </div>
      {hint && <p style={{ color: '#475569', fontSize: 11, marginTop: 5, lineHeight: 1.5 }}>{hint}</p>}
    </div>
  )
}
