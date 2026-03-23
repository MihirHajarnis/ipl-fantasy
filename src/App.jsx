import { useApp } from './context/AppContext.jsx'
import { Toasts, Confetti } from './components/ui.jsx'
import Layout      from './components/Layout.jsx'
import LoginPage   from './pages/LoginPage.jsx'
import Dashboard   from './pages/Dashboard.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import AdminScores from './pages/AdminScores.jsx'
import MySquad     from './pages/MySquad.jsx'
import AllSlots    from './pages/AllSlots.jsx'
import SlotDetail  from './pages/SlotDetail.jsx'
import Verification from './pages/Verification.jsx'
import DraftPicker from './pages/DraftPicker.jsx'
import AdminParticipants from './pages/AdminParticipants.jsx'
import ScorecardEntry from './pages/ScorecardEntry.jsx'
import SheetsSync from './pages/SheetsSync.jsx'
import PowerSwap from './pages/PowerSwap.jsx'

function Router() {
  const { user, page, confetti, setConfetti } = useApp()

  if (!user) return <LoginPage />

  return (
    <>
      {confetti && <Confetti />}
      {confetti && (
        <div style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          zIndex: 10000, textAlign: 'center',
          background: '#060E1A', border: '1px solid rgba(34,197,94,0.4)',
          borderRadius: 18, padding: '40px 48px',
          boxShadow: '0 0 80px rgba(34,197,94,0.22)',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          <div style={{ fontSize: 56 }}>🏆</div>
          <div style={{ color: '#22C55E', fontSize: 26, fontWeight: 800, margin: '10px 0 4px' }}>You're #1!</div>
          <div style={{ color: '#64748B', fontSize: 14, marginBottom: 20 }}>League leader this season</div>
          <button onClick={() => setConfetti(false)} style={{
            padding: '11px 28px', background: '#22C55E', border: 'none', borderRadius: 9,
            cursor: 'pointer', fontWeight: 800, color: '#060E1A', fontSize: 14, fontFamily: 'inherit',
          }}>
            Let's Go! 🚀
          </button>
        </div>
      )}
      <Layout>
        {page === 'dashboard'      && <Dashboard />}
        {page === 'mysquad'        && <MySquad />}
        {page === 'allslots'       && <AllSlots />}
        {page === 'slotdetail'     && <SlotDetail />}
        {page === 'verification'   && <Verification />}
        {page === 'admin-dashboard'&& <AdminDashboard />}
        {page === 'admin-scores'   && <AdminScores />}
        {page === 'admin-matches'  && <AdminScores />}
        {page === 'draft'          && <DraftPicker />}
        {page === 'admin-participants' && <AdminParticipants />}
        {page === 'scorecard'           && <ScorecardEntry />}
        {page === 'sheets-sync'         && <SheetsSync />}
        {page === 'power-swap'           && <PowerSwap />}
      </Layout>
    </>
  )
}

export default function App() {
  return (
    <>
      <Toasts />
      <Router />
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #060E1A; color: white; font-family: 'Inter', system-ui, sans-serif; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #060E1A; }
        ::-webkit-scrollbar-thumb { background: #1E293B; border-radius: 3px; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        input::placeholder { color: #334155; }
        select option { background: #0A111E; color: white; }
        @keyframes fadeUp  { from { transform: translateY(14px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes toastIn { from { transform: translateX(110%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes liveP   { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.35; transform:scale(0.75); } }
        @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
        @keyframes spin    { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}
