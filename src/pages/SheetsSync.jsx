import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'

// ─────────────────────────────────────────────────────────────
// Google Sheets Sync via Apps Script Web App
//
// No OAuth, no API key needed.
// Admin deploys a small Apps Script in their Google Sheet,
// gets a Web App URL, pastes it here once.
// On sync: we POST all data → script writes to the sheet.
// ─────────────────────────────────────────────────────────────

const LS_WEBAPP_URL = 'ipl_sheets_webapp_url'

function buildPayload(leaderboard, participants, slotTotals, draftMap) {
  // ── Leaderboard ──────────────────────────────────────────
  const lbRows = [
    ['Rank', 'Name', 'Total Runs', 'Slot 1', 'Slot 2', 'Slot 3', 'Slot 4', 'Slot 5'],
    ...leaderboard.map(p => {
      const slots = Object.entries(draftMap)
        .filter(([_, pid]) => pid === p.id)
        .map(([sid]) => sid)
      return [p.rank, p.name, p.total_runs, ...slots]
    })
  ]

  // ── Season Slot Totals ───────────────────────────────────
  const slotKeys = Object.keys(slotTotals).sort()
  const seasonRows = [
    ['Slot', 'Owner', 'Total Runs', 'Total Balls', 'Total 4s', 'Total 6s', 'Strike Rate'],
    ...slotKeys.map(sid => {
      const d     = slotTotals[sid] || {}
      const ownerEntry = Object.entries(draftMap).find(([slot]) => slot === sid)
      const owner = ownerEntry ? participants.find(p => p.id === ownerEntry[1]) : null
      const sr    = d.total_balls > 0 ? ((d.total_runs / d.total_balls) * 100).toFixed(1) : '—'
      return [
        sid,
        owner?.name || '—',
        d.total_runs  || 0,
        d.total_balls || 0,
        d.total_fours || 0,
        d.total_sixes || 0,
        sr,
      ]
    })
  ]

  // ── Squads ───────────────────────────────────────────────
  const squadRows = [
    ['Participant', 'Slot 1', 'Slot 2', 'Slot 3', 'Slot 4', 'Slot 5', 'Total Runs'],
    ...participants.map(p => {
      const slots = Object.entries(draftMap)
        .filter(([_, pid]) => pid === p.id)
        .map(([sid]) => sid)
      const total = slots.reduce((s, sid) => s + (slotTotals[sid]?.total_runs || 0), 0)
      return [p.name, ...slots, total]
    })
  ]

  return { leaderboard: lbRows, seasonTotals: seasonRows, squads: squadRows }
}

export default function SheetsSync() {
  const { leaderboard, participants, slotTotals, matches, draftMap, toast } = useApp()

  const [webAppUrl, setWebAppUrl] = useState(() => localStorage.getItem(LS_WEBAPP_URL) || '')
  const [syncing,   setSyncing]   = useState(false)
  const [lastSync,  setLastSync]  = useState(null)
  const [showSetup, setShowSetup] = useState(!localStorage.getItem(LS_WEBAPP_URL))
  const [showScript,setShowScript]= useState(false)

  const isConfigured = !!localStorage.getItem(LS_WEBAPP_URL)
  const published    = matches.filter(m => m.published)

  const saveConfig = () => {
    if (!webAppUrl.trim()) { toast('Paste your Web App URL first', 'error'); return }
    if (!webAppUrl.includes('script.google.com')) {
      toast('That doesn\'t look like a valid Apps Script URL', 'error'); return
    }
    localStorage.setItem(LS_WEBAPP_URL, webAppUrl.trim())
    setShowSetup(false)
    toast('Web App URL saved ✓')
  }

  const handleSync = async () => {
    const url = localStorage.getItem(LS_WEBAPP_URL)
    if (!url) { setShowSetup(true); toast('Set up the Web App URL first', 'error'); return }

    setSyncing(true)
    try {
      const payload = buildPayload(leaderboard, participants, slotTotals, draftMap)

      // Apps Script Web Apps have CORS restrictions — use no-cors mode
      // The sync still works but we can't read the response body
      const response = await fetch(url, {
        method:  'POST',
        mode:    'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body:    JSON.stringify(payload),
      })

      // no-cors means response.ok is always false, but if no exception = success
      const now = new Date().toLocaleTimeString()
      setLastSync(now)
      toast('Google Sheet synced! ✓')
    } catch (e) {
      toast('Sync failed: ' + e.message, 'error')
    } finally {
      setSyncing(false)
    }
  }

  const scriptCode = `function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents)
    const ss = SpreadsheetApp.getActiveSpreadsheet()

    // Leaderboard sheet
    let lb = ss.getSheetByName('Leaderboard') || ss.insertSheet('Leaderboard')
    lb.clearContents()
    if (data.leaderboard.length > 0)
      lb.getRange(1, 1, data.leaderboard.length, data.leaderboard[0].length)
        .setValues(data.leaderboard)

    // Season Totals sheet
    let st = ss.getSheetByName('Season Totals') || ss.insertSheet('Season Totals')
    st.clearContents()
    if (data.seasonTotals.length > 0)
      st.getRange(1, 1, data.seasonTotals.length, data.seasonTotals[0].length)
        .setValues(data.seasonTotals)

    // Squads sheet
    let sq = ss.getSheetByName('Squads') || ss.insertSheet('Squads')
    sq.clearContents()
    if (data.squads.length > 0)
      sq.getRange(1, 1, data.squads.length, data.squads[0].length)
        .setValues(data.squads)

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON)

  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON)
  }
}`

  return (
    <div style={{ padding: 16, fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ color: 'white', fontSize: 20, fontWeight: 800, marginBottom: 3 }}>📊 Google Sheets Sync</h1>
        <p style={{ color: '#64748B', fontSize: 13 }}>
          Push leaderboard, season totals and squads to your Google Sheet with one tap
        </p>
      </div>

      {/* Sync card */}
      <div style={{ background: '#0A111E', borderRadius: 12, border: '1px solid #0F1E35', padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Sync Now</div>
            <div style={{ color: '#64748B', fontSize: 12 }}>
              {published.length} published matches · {leaderboard.length} participants
            </div>
            {lastSync && (
              <div style={{ color: '#22C55E', fontSize: 11, marginTop: 4, fontWeight: 600 }}>
                ✓ Last synced at {lastSync}
              </div>
            )}
          </div>
          <button onClick={handleSync} disabled={syncing} style={{
            padding: '13px 28px', background: syncing ? '#166534' : '#22C55E',
            border: 'none', borderRadius: 10, color: '#060E1A',
            cursor: syncing ? 'wait' : 'pointer',
            fontSize: 14, fontWeight: 800, fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 8, minWidth: 160,
          }}>
            {syncing ? <><Spinner /> Syncing…</> : '📊 Sync to Sheet'}
          </button>
        </div>

        {/* What gets written */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
          {[
            ['📋 Leaderboard',   'Rank · name · runs · slots'],
            ['📋 Season Totals', 'All slots: runs, S/R, 4s, 6s'],
            ['📋 Squads',        'Each participant\'s 5 slots'],
          ].map(([title, desc]) => (
            <div key={title} style={{ background: '#060E1A', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ color: '#22C55E', fontWeight: 700, fontSize: 12, marginBottom: 3 }}>{title}</div>
              <div style={{ color: '#475569', fontSize: 11 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Configuration */}
      <div style={{ background: '#0A111E', borderRadius: 12, border: '1px solid #0F1E35', overflow: 'hidden', marginBottom: 16 }}>
        <button onClick={() => setShowSetup(s => !s)} style={{
          width: '100%', padding: '14px 16px', background: 'transparent',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontFamily: 'inherit',
        }}>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>⚙️ Configuration</span>
          <span style={{ color: isConfigured ? '#22C55E' : '#F59E0B', fontSize: 12 }}>
            {isConfigured ? '✓ Configured' : '⚠ Not set up'} {showSetup ? '▲' : '▼'}
          </span>
        </button>

        {showSetup && (
          <div style={{ padding: '0 16px 16px', borderTop: '1px solid #0F1E35' }}>
            <div style={{ marginTop: 14, marginBottom: 14 }}>
              <label style={{ color: '#94A3B8', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                APPS SCRIPT WEB APP URL
              </label>
              <input
                value={webAppUrl}
                onChange={e => setWebAppUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                style={{
                  width: '100%', padding: '11px 14px',
                  background: '#060E1A', border: '1px solid #1E293B',
                  borderRadius: 8, color: 'white', fontSize: 13,
                  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#22C55E'}
                onBlur={e  => e.target.style.borderColor = '#1E293B'}
              />
              <p style={{ color: '#475569', fontSize: 11, marginTop: 5 }}>
                Get this URL by deploying the Apps Script below as a Web App
              </p>
            </div>
            <button onClick={saveConfig} style={{
              padding: '10px 20px', background: '#22C55E',
              border: 'none', borderRadius: 8,
              color: '#060E1A', fontWeight: 800, cursor: 'pointer',
              fontSize: 13, fontFamily: 'inherit',
            }}>
              Save URL
            </button>
          </div>
        )}
      </div>

      {/* Setup guide */}
      <div style={{ background: '#0A111E', borderRadius: 12, border: '1px solid #0F1E35', padding: 16, marginBottom: 16 }}>
        <div style={{ color: 'white', fontWeight: 700, fontSize: 14, marginBottom: 14 }}>
          📖 One-Time Setup Guide
        </div>

        {[
          { n:'1', col:'#22C55E', title:'Open your Google Sheet',         body:'Go to sheets.google.com and open your IPL Fantasy sheet (or create a new one).' },
          { n:'2', col:'#3B82F6', title:'Open Apps Script',               body:'Click Extensions → Apps Script. A new tab opens with a code editor.' },
          { n:'3', col:'#F59E0B', title:'Paste the script',               body:'Delete any existing code, paste the Apps Script code below, then click Save (floppy disk icon).' },
          { n:'4', col:'#A855F7', title:'Deploy as Web App',              body:'Click Deploy → New deployment. Type: Web app. Execute as: Me. Who has access: Anyone. Click Deploy.' },
          { n:'5', col:'#22C55E', title:'Authorize & copy the URL',       body:'Click Authorize access → allow permissions. Then copy the Web App URL that appears.' },
          { n:'6', col:'#3B82F6', title:'Paste URL above & save',         body:'Paste the URL into the Configuration field above, click Save URL, then click Sync to Sheet.' },
        ].map(({ n, col, title, body }) => (
          <div key={n} style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${col}22`, border: `1px solid ${col}44`, color: col, fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
              {n}
            </div>
            <div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{title}</div>
              <div style={{ color: '#64748B', fontSize: 12, lineHeight: 1.6 }}>{body}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Apps Script code block */}
      <div style={{ background: '#0A111E', borderRadius: 12, border: '1px solid #0F1E35', overflow: 'hidden' }}>
        <button onClick={() => setShowScript(s => !s)} style={{
          width: '100%', padding: '14px 16px', background: 'transparent',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontFamily: 'inherit',
        }}>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>📄 Apps Script Code</span>
          <span style={{ color: '#475569', fontSize: 12 }}>Copy & paste into Apps Script {showScript ? '▲' : '▼'}</span>
        </button>

        {showScript && (
          <div style={{ borderTop: '1px solid #0F1E35' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 16px' }}>
              <button
                onClick={() => { navigator.clipboard.writeText(scriptCode); toast('Script copied to clipboard ✓') }}
                style={{ padding: '6px 14px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 7, color: '#22C55E', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}
              >
                📋 Copy Code
              </button>
            </div>
            <pre style={{
              margin: 0, padding: '0 16px 16px',
              color: '#94A3B8', fontSize: 11, lineHeight: 1.7,
              overflowX: 'auto', fontFamily: "'JetBrains Mono', monospace",
              whiteSpace: 'pre',
            }}>
              {scriptCode}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div style={{ width: 14, height: 14, border: '2px solid rgba(6,14,26,0.3)', borderTop: '2px solid #060E1A', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
  )
}
