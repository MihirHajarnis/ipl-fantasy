import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { Avatar } from './ui.jsx'

export default function Layout({ children }) {
  const { user, logout, page, setPage } = useApp()
  const [collapsed, setCollapsed] = useState(false)
  const isAdmin = user?.role === 'admin'

  const participantNav = [
    { id: 'dashboard',    icon: '🏆', label: 'Leaderboard'     },
    { id: 'mysquad',      icon: '👥', label: 'My Squad'         },
    { id: 'allslots',     icon: '📋', label: 'All Batting Slots' },
    { id: 'verification', icon: '✅', label: 'Verification'     },
  ]

  const adminNav = [
    { id: 'admin-dashboard', icon: '🏠', label: 'Overview'       },
    { id: 'admin-scores',    icon: '✏️', label: 'Enter Scores'   },
    { id: 'admin-matches',   icon: '📅', label: 'Matches'         },
    { id: 'draft',           icon: '🎯', label: 'Draft Picker'    },
    { id: 'allslots',        icon: '📋', label: 'All Slots'       },
  ]

  const navItems = isAdmin ? adminNav : participantNav

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#060E1A', fontFamily: "'Inter', system-ui, sans-serif", color: 'white' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: collapsed ? 58 : 220,
        background: '#09111F', borderRight: '1px solid #0F1E35',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.26s cubic-bezier(0.4,0,0.2,1)',
        flexShrink: 0, position: 'relative',
      }}>

        {/* Logo */}
        <div style={{ padding: collapsed ? '18px 12px' : '18px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #0F1E35', minHeight: 60 }}>
          <div style={{ width: 32, height: 32, background: '#22C55E', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🏏</div>
          {!collapsed && <span style={{ color: 'white', fontSize: 15, fontWeight: 800, whiteSpace: 'nowrap' }}>IPL Fantasy</span>}
        </div>

        {/* Live indicator */}
        {!collapsed && (
          <div style={{ margin: '10px 10px 2px', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 7, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 6, height: 6, background: '#22C55E', borderRadius: '50%', animation: 'liveP 1.8s infinite' }} />
            <span style={{ color: '#22C55E', fontSize: 10, fontWeight: 600 }}>Live · Supabase</span>
          </div>
        )}

        {/* Role label */}
        {!collapsed && (
          <div style={{ margin: '6px 10px 8px', padding: '5px 10px', background: isAdmin ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.06)', borderRadius: 6, fontSize: 10, fontWeight: 700, color: isAdmin ? '#EF4444' : '#22C55E', letterSpacing: '0.5px' }}>
            {isAdmin ? '🛡 ADMIN' : '👤 PARTICIPANT'}
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: '4px 6px', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {navItems.map(item => {
            const active = page === item.id
            return (
              <button key={item.id} onClick={() => setPage(item.id)}
                title={collapsed ? item.label : undefined}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  gap: collapsed ? 0 : 9,
                  padding: collapsed ? '10px 0' : '10px 11px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: active ? 'rgba(34,197,94,0.11)' : 'transparent',
                  color: active ? '#22C55E' : '#64748B',
                  fontWeight: active ? 700 : 500,
                  fontSize: 13, fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#94A3B8' } }}
                onMouseLeave={e => { e.currentTarget.style.background = active ? 'rgba(34,197,94,0.11)' : 'transparent'; e.currentTarget.style.color = active ? '#22C55E' : '#64748B' }}
              >
                <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
                {!collapsed && (
                  <>
                    <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden' }}>{item.label}</span>
                    {active && <div style={{ width: 3, height: 16, background: '#22C55E', borderRadius: 2, flexShrink: 0 }} />}
                  </>
                )}
              </button>
            )
          })}
        </nav>

        {/* User + logout */}
        <div style={{ padding: '10px 6px', borderTop: '1px solid #0F1E35' }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px', marginBottom: 7 }}>
              <Avatar name={user?.name || '?'} color={user?.color || '#22C55E'} size={28} />
              <div style={{ overflow: 'hidden' }}>
                <div style={{ color: 'white', fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
                <div style={{ color: '#334155', fontSize: 10, textTransform: 'capitalize' }}>{user?.role}</div>
              </div>
            </div>
          )}
          <button onClick={logout} style={{
            width: '100%', padding: '7px',
            background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)',
            borderRadius: 7, color: '#EF4444', cursor: 'pointer',
            fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            fontFamily: 'inherit',
          }}>
            {collapsed ? '↩' : '↩ Sign Out'}
          </button>
        </div>

        {/* Collapse toggle */}
        <button onClick={() => setCollapsed(c => !c)} style={{
          position: 'absolute', top: '50%', right: -11, transform: 'translateY(-50%)',
          width: 22, height: 22, background: '#22C55E', borderRadius: '50%',
          border: 'none', cursor: 'pointer', color: '#060E1A',
          fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10, fontWeight: 900,
        }}>
          {collapsed ? '›' : '‹'}
        </button>
      </aside>

      <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        {children}
      </main>
    </div>
  )
}
