import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { Avatar } from './ui.jsx'

// Detect mobile
function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return mobile
}

export default function Layout({ children }) {
  const { user, logout, page, setPage } = useApp()
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isAdmin = user?.role === 'admin'

  const participantNav = [
    { id: 'dashboard',    icon: '🏆', label: 'Leaderboard'  },
    { id: 'mysquad',      icon: '👥', label: 'My Squad'      },
    { id: 'allslots',     icon: '📋', label: 'All Slots'     },
    { id: 'verification', icon: '✅', label: 'Verify'        },
    { id: 'power-swap',   icon: '⚡', label: 'Power Swap'    },
  ]
  const adminNav = [
    { id: 'admin-dashboard',    icon: '🏠', label: 'Overview'       },
    { id: 'scorecard',          icon: '🏏', label: 'Scorecard Entry' },
    { id: 'draft',              icon: '🎯', label: 'Draft Picker'    },
    { id: 'allslots',           icon: '📋', label: 'All Slots'       },
    { id: 'admin-participants', icon: '👤', label: 'Participants'    },
    { id: 'power-swap',         icon: '⚡', label: 'Power Swap'    },
    { id: 'sheets-sync',        icon: '📊', label: 'Sheets Sync'    },
  ]
  const navItems = isAdmin ? adminNav : participantNav

  // Close sidebar when navigating on mobile
  const navigate = (id) => {
    setPage(id)
    setSidebarOpen(false)
  }

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#060E1A', fontFamily: "'Inter', system-ui, sans-serif", color: 'white' }}>

        {/* Mobile top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#09111F', borderBottom: '1px solid #0F1E35', position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, background: '#22C55E', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🏏</div>
            <span style={{ color: 'white', fontSize: 15, fontWeight: 800 }}>IPL Fantasy</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 6, padding: '4px 8px' }}>
              <div style={{ width: 5, height: 5, background: '#22C55E', borderRadius: '50%', animation: 'liveP 1.8s infinite' }} />
              <span style={{ color: '#22C55E', fontSize: 10, fontWeight: 600 }}>Live</span>
            </div>
            <Avatar name={user?.name || '?'} color={user?.color || '#22C55E'} size={28} />
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, overflow: 'auto', paddingBottom: 70 }}>
          {children}
        </div>

        {/* Bottom tab bar — scrollable so all admin items are reachable */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#09111F', borderTop: '1px solid #0F1E35', zIndex: 100, paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
            {navItems.map(item => {
              const active = page === item.id
              return (
                <button key={item.id} onClick={() => navigate(item.id)} style={{
                  flex: '0 0 auto', minWidth: 64, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '10px 8px 8px', border: 'none', background: 'transparent',
                  color: active ? '#22C55E' : '#475569', cursor: 'pointer',
                  borderTop: active ? '2px solid #22C55E' : '2px solid transparent',
                  transition: 'all 0.15s', fontFamily: 'inherit',
                }}>
                  <span style={{ fontSize: 18, marginBottom: 3 }}>{item.icon}</span>
                  <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, whiteSpace: 'nowrap' }}>{item.label}</span>
                </button>
              )
            })}
            {/* Logout tab */}
            <button onClick={logout} style={{
              flex: '0 0 auto', minWidth: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '10px 8px 8px', border: 'none', background: 'transparent',
              color: '#EF4444', cursor: 'pointer', borderTop: '2px solid transparent',
              fontFamily: 'inherit',
            }}>
              <span style={{ fontSize: 18, marginBottom: 3 }}>↩</span>
              <span style={{ fontSize: 10, fontWeight: 500 }}>Out</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Desktop sidebar layout ────────────────────────────────
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#060E1A', fontFamily: "'Inter', system-ui, sans-serif", color: 'white' }}>
      <aside style={{ width: 220, background: '#09111F', borderRight: '1px solid #0F1E35', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '18px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #0F1E35' }}>
          <div style={{ width: 32, height: 32, background: '#22C55E', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🏏</div>
          <span style={{ color: 'white', fontSize: 15, fontWeight: 800 }}>IPL Fantasy</span>
        </div>
        <div style={{ margin: '10px 10px 2px', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 7, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 6, height: 6, background: '#22C55E', borderRadius: '50%', animation: 'liveP 1.8s infinite' }} />
          <span style={{ color: '#22C55E', fontSize: 10, fontWeight: 600 }}>Live · Supabase</span>
        </div>
        <div style={{ margin: '6px 10px 8px', padding: '5px 10px', background: isAdmin ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.06)', borderRadius: 6, fontSize: 10, fontWeight: 700, color: isAdmin ? '#EF4444' : '#22C55E', letterSpacing: '0.5px' }}>
          {isAdmin ? '🛡 ADMIN' : '👤 PARTICIPANT'}
        </div>
        <nav style={{ flex: 1, padding: '4px 6px', display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto' }}>
          {navItems.map(item => {
            const active = page === item.id
            return (
              <button key={item.id} onClick={() => setPage(item.id)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                padding: '10px 11px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: active ? 'rgba(34,197,94,0.11)' : 'transparent',
                color: active ? '#22C55E' : '#64748B',
                fontWeight: active ? 700 : 500, fontSize: 13, fontFamily: 'inherit', transition: 'all 0.15s',
              }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#94A3B8' } }}
                onMouseLeave={e => { e.currentTarget.style.background = active ? 'rgba(34,197,94,0.11)' : 'transparent'; e.currentTarget.style.color = active ? '#22C55E' : '#64748B' }}
              >
                <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
                <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                {active && <div style={{ width: 3, height: 16, background: '#22C55E', borderRadius: 2 }} />}
              </button>
            )
          })}
        </nav>
        <div style={{ padding: '10px 6px', borderTop: '1px solid #0F1E35' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px', marginBottom: 7 }}>
            <Avatar name={user?.name || '?'} color={user?.color || '#22C55E'} size={28} />
            <div>
              <div style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>{user?.name}</div>
              <div style={{ color: '#334155', fontSize: 10, textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
          </div>
          <button onClick={logout} style={{ width: '100%', padding: '7px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 7, color: '#EF4444', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit' }}>
            ↩ Sign Out
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>{children}</main>
    </div>
  )
}
