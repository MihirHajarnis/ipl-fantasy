import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { IPL_TEAMS, TEAM_META } from '../lib/supabase.js'

export default function LoginPage() {
  const { loginAdmin, loginParticipant } = useApp()
  const [role,     setRole]    = useState('participant')
  const [username, setUser]    = useState('')
  const [password, setPass]    = useState('')
  const [code,     setCode]    = useState('')
  const [loading,  setLoading] = useState(false)
  const [showPass, setShowPass]= useState(false)

  const go = async () => {
    setLoading(true)
    if (role === 'admin') loginAdmin(username, password)
    else await loginParticipant(code)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060E1A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, background: '#22C55E', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 12px' }}>🏏</div>
          <h1 style={{ color: 'white', fontSize: 24, fontWeight: 800, marginBottom: 4 }}>IPL Fantasy</h1>
          <p style={{ color: '#64748B', fontSize: 14 }}>Private league · track every run</p>
        </div>

        {/* Card */}
        <div style={{ background: '#0A111E', borderRadius: 16, border: '1px solid #1E293B', padding: 24 }}>

          {/* Role toggle */}
          <div style={{ display: 'flex', background: '#060E1A', borderRadius: 10, padding: 4, marginBottom: 24, border: '1px solid #1E293B', gap: 4 }}>
            {[['participant', '👤 Participant'], ['admin', '🛡 Admin']].map(([r, lbl]) => (
              <button key={r} onClick={() => setRole(r)} style={{
                flex: 1, padding: '10px 0', borderRadius: 7, border: 'none', cursor: 'pointer',
                background: role === r ? '#22C55E' : 'transparent',
                color: role === r ? '#060E1A' : '#64748B',
                fontWeight: 700, fontSize: 14, fontFamily: 'inherit', transition: 'all 0.18s',
              }}>{lbl}</button>
            ))}
          </div>

          {role === 'admin' ? (
            <>
              <Field label="Username" value={username} onChange={setUser} placeholder="Enter username" onEnter={go} />
              <div style={{ position: 'relative' }}>
                <Field label="Password" value={password} onChange={setPass} placeholder="Enter password" type={showPass ? 'text' : 'password'} onEnter={go} />
                <button onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 12, top: 34, background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 12, padding: 0 }}>
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
            </>
          ) : (
            <Field label="Access Code" value={code} onChange={setCode} placeholder="Enter your access code" onEnter={go} />
          )}

          <button onClick={go} disabled={loading} style={{
            width: '100%', padding: '14px', marginTop: 4,
            background: loading ? '#166534' : '#22C55E',
            color: '#060E1A', border: 'none', borderRadius: 10,
            fontSize: 15, fontWeight: 800, cursor: loading ? 'wait' : 'pointer',
            fontFamily: 'inherit', transition: 'all 0.18s',
          }}>
            {loading ? 'Signing in…' : 'Continue →'}
          </button>
        </div>

        {/* Team pills */}
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <p style={{ color: '#1E3A5F', fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', marginBottom: 10 }}>10 TEAMS · 60 BATTING SLOTS · 12 PARTICIPANTS</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center' }}>
            {IPL_TEAMS.map(t => {
              const meta = TEAM_META[t]
              return <span key={t} style={{ background: `${meta.color}22`, border: `1px solid ${meta.color}55`, color: meta.accent, borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{t}</span>
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', hint, onEnter }) {
  const [foc, setFoc] = useState(false)
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ color: '#94A3B8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onKeyDown={e => e.key === 'Enter' && onEnter()}
        onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
        style={{ width: '100%', padding: '12px 14px', background: '#060E1A', border: `1px solid ${foc ? '#22C55E' : '#1E293B'}`, borderRadius: 8, color: 'white', fontSize: 15, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color 0.2s' }}
      />
      {hint && <p style={{ color: '#475569', fontSize: 11, marginTop: 5, lineHeight: 1.5 }}>{hint}</p>}
    </div>
  )
}
