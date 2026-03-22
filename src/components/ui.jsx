import { useApp } from '../context/AppContext.jsx'
import { TEAM_META } from '../lib/supabase.js'

// ── Slot Badge ─────────────────────────────────────────────────
export function SlotBadge({ slot, size = 'sm' }) {
  const team   = slot.replace(/\d+$/, '')
  const num    = slot.replace(/^\D+/, '')
  const meta   = TEAM_META[team] || { color: '#334155', accent: '#94A3B8' }
  const big    = size === 'lg'

  return (
    <span style={{
      background:  `${meta.color}28`,
      border:      `1px solid ${meta.color}66`,
      color:       meta.accent,
      borderRadius: 7,
      padding:     big ? '5px 13px' : '3px 8px',
      fontSize:    big ? 14 : 11,
      fontWeight:  700,
      fontFamily:  "'JetBrains Mono', monospace",
      whiteSpace:  'nowrap',
      display:     'inline-flex',
      alignItems:  'center',
      gap:         2,
      letterSpacing: '0.3px',
    }}>
      <span style={{ color: meta.accent }}>{team}</span>
      <span style={{ color: '#64748B', fontWeight: 500 }}>#{num}</span>
    </span>
  )
}

// ── Team Pill ──────────────────────────────────────────────────
export function TeamPill({ team }) {
  const meta = TEAM_META[team] || { color: '#334155', accent: '#94A3B8' }
  return (
    <span style={{
      background:  `${meta.color}28`,
      border:      `1px solid ${meta.color}55`,
      color:       meta.accent,
      borderRadius: 6,
      padding:     '2px 7px',
      fontSize:    10,
      fontWeight:  700,
      letterSpacing: '0.3px',
    }}>
      {team}
    </span>
  )
}

// ── Avatar ────────────────────────────────────────────────────
export function Avatar({ name, color, size = 36 }) {
  return (
    <div style={{
      width:        size,
      height:       size,
      borderRadius: '50%',
      background:   color || '#22C55E',
      display:      'flex',
      alignItems:   'center',
      justifyContent: 'center',
      color:        'white',
      fontWeight:   800,
      fontSize:     size * 0.36,
      flexShrink:   0,
      letterSpacing: '-0.5px',
    }}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  )
}

// ── Status Badge ──────────────────────────────────────────────
export function StatusBadge({ status }) {
  const map = {
    verified: { bg: 'rgba(34,197,94,0.1)',  bd: 'rgba(34,197,94,0.3)',  col: '#22C55E', lbl: '✓ Verified'  },
    pending:  { bg: 'rgba(245,158,11,0.1)', bd: 'rgba(245,158,11,0.3)', col: '#F59E0B', lbl: '⏳ Pending'  },
    disputed: { bg: 'rgba(239,68,68,0.1)',  bd: 'rgba(239,68,68,0.3)',  col: '#EF4444', lbl: '⚠ Disputed'  },
  }
  const c = map[status] || map.pending
  return (
    <span style={{
      background: c.bg, border: `1px solid ${c.bd}`,
      borderRadius: 6, padding: '3px 10px',
      color: c.col, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      {c.lbl}
    </span>
  )
}

// ── Status Dot ────────────────────────────────────────────────
export function StatusDot({ status }) {
  const col = status === 'verified' ? '#22C55E' : status === 'disputed' ? '#EF4444' : '#F59E0B'
  return <div style={{ width: 7, height: 7, borderRadius: '50%', background: col, flexShrink: 0 }} />
}

// ── Toast notifications ───────────────────────────────────────
export function Toasts() {
  const { toasts } = useApp()
  const styles = {
    success: { bg: '#052e16', bd: '#22C55E', col: '#22C55E' },
    error:   { bg: '#450a0a', bd: '#EF4444', col: '#FCA5A5' },
    warning: { bg: '#451a03', bd: '#F59E0B', col: '#FCD34D' },
  }
  return (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 10000, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
      {toasts.map(t => {
        const s = styles[t.type] || styles.success
        return (
          <div key={t.id} style={{
            background: s.bg, border: `1px solid ${s.bd}40`,
            borderLeft: `3px solid ${s.bd}`, color: s.col,
            padding: '12px 18px', borderRadius: 10, fontSize: 14,
            fontWeight: 600, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            animation: 'toastIn 0.3s ease', maxWidth: 320,
          }}>
            {t.msg}
          </div>
        )
      })}
    </div>
  )
}

// ── Confetti ──────────────────────────────────────────────────
export function Confetti() {
  const pieces = Array.from({ length: 70 }, (_, i) => ({
    id: i,
    color: ['#22C55E','#F5A623','#E33629','#3B82F6','#A855F7','#F59E0B','#EC4899'][i % 7],
    left:  Math.random() * 100,
    delay: Math.random() * 1.5,
    dur:   2.5 + Math.random() * 1.5,
    size:  7 + Math.random() * 9,
  }))
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9998, overflow: 'hidden' }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.left}%`, top: '-20px',
          width: p.size, height: p.size, background: p.color, borderRadius: '2px',
          animation: `cfFall ${p.dur}s ${p.delay}s ease-in forwards`,
        }} />
      ))}
    </div>
  )
}

// ── Loading skeleton ──────────────────────────────────────────
export function Skeleton({ height = 40, radius = 8 }) {
  return (
    <div style={{
      height, borderRadius: radius,
      background: 'linear-gradient(90deg, #0F1E35 25%, #1E3A5F 50%, #0F1E35 75%)',
      backgroundSize: '400px 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  )
}

// ── Page Header ───────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
      <div>
        <h1 style={{ color: 'white', fontSize: 22, fontWeight: 800, marginBottom: 3, letterSpacing: '-0.3px' }}>{title}</h1>
        {subtitle && <p style={{ color: '#64748B', fontSize: 13, fontWeight: 500 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────
export function StatCard({ label, value, sub, accent = '#22C55E' }) {
  return (
    <div style={{ background: '#0A111E', border: '1px solid #0F1E35', borderRadius: 10, padding: '14px 18px' }}>
      <div style={{ color: '#475569', fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ color: accent, fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: '#334155', fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

// ── Back button ───────────────────────────────────────────────
export function BackBtn({ label = '← Back', onClick }) {
  return (
    <button onClick={onClick} style={{
      background: 'transparent', border: 'none', color: '#22C55E',
      cursor: 'pointer', fontSize: 13, fontWeight: 700, marginBottom: 20,
      display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', padding: 0,
    }}>
      {label}
    </button>
  )
}

// ── Form input ────────────────────────────────────────────────
export function FormInput({ label, value, onChange, placeholder, type = 'text', hint }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ color: '#94A3B8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '11px 14px',
          background: '#060E1A', border: '1px solid #1E293B',
          borderRadius: 8, color: 'white', fontSize: 14,
          outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
          transition: 'border-color 0.2s',
        }}
        onFocus={e => e.target.style.borderColor = '#22C55E'}
        onBlur={e  => e.target.style.borderColor = '#1E293B'}
      />
      {hint && <p style={{ color: '#475569', fontSize: 11, marginTop: 5 }}>{hint}</p>}
    </div>
  )
}

// ── Number input for score entry ──────────────────────────────
export function ScoreInput({ value, onChange, accent = '#22C55E', primary = false }) {
  const hasVal = value > 0
  return (
    <input
      type="number" min="0" max="300" placeholder="0"
      value={value === 0 ? '' : value}
      onChange={e => onChange(parseInt(e.target.value) || 0)}
      style={{
        width: '100%', padding: '8px 10px',
        background: primary && hasVal ? 'rgba(34,197,94,0.07)' : '#060E1A',
        border: `1px solid ${primary && hasVal ? `${accent}77` : '#1E293B'}`,
        borderRadius: 7, color: primary && hasVal ? '#22C55E' : '#E2E8F0',
        fontSize: primary ? 15 : 13,
        fontWeight: primary && hasVal ? 700 : 400,
        outline: 'none', fontFamily: 'inherit',
        transition: 'all 0.18s',
      }}
      onFocus={e => {
        e.target.style.borderColor = primary ? '#22C55E' : accent
        if (primary) e.target.style.boxShadow = '0 0 0 2px rgba(34,197,94,0.12)'
      }}
      onBlur={e => {
        e.target.style.borderColor = primary && hasVal ? `${accent}77` : '#1E293B'
        e.target.style.boxShadow = 'none'
      }}
    />
  )
}
