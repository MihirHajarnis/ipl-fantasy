import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { Avatar, SlotBadge } from '../components/ui.jsx'
import { supabase } from '../lib/supabase.js'

// ─────────────────────────────────────────────────────────────
// Google Sheets Sync
//
// Uses Google Sheets API v4 via a user-provided API key + Sheet ID.
// Admin pastes their Sheet ID and API key once — stored in localStorage.
// On sync: builds a full data table and writes it via batchUpdate.
//
// Sheet layout after sync:
//   Sheet 1 "Leaderboard"  — rank, name, total runs, slots
//   Sheet 2 "Scores"       — every slot × every match
//   Sheet 3 "Squads"       — participant → their 5 slots
// ─────────────────────────────────────────────────────────────

const LS_SHEET_ID  = 'ipl_gsheet_id'
const LS_SHEET_KEY = 'ipl_gsheet_key'

function buildSheetsPayload(leaderboard, participants, slotTotals, matches, draftMap) {
  const published = matches.filter(m => m.published)

  // ── Sheet 1: Leaderboard ───────────────────────────────────
  const lbRows = [
    ['Rank', 'Name', 'Total Runs', 'Slot 1', 'Slot 2', 'Slot 3', 'Slot 4', 'Slot 5'],
    ...leaderboard.map(p => {
      const slots = Object.entries(draftMap)
        .filter(([_, pid]) => pid === p.id)
        .map(([sid]) => sid)
      return [p.rank, p.name, p.total_runs, ...slots]
    })
  ]

  // ── Sheet 2: Season Slot Totals ────────────────────────────
  const slotKeys = Object.keys(slotTotals).sort()
  const slotRows = [
    ['Slot', 'Owner', 'Total Runs', 'Total Balls', 'Total 4s', 'Total 6s', 'Strike Rate'],
    ...slotKeys.map(sid => {
      const d     = slotTotals[sid] || {}
      const owner = participants.find(p =>
        Object.entries(draftMap).find(([slot, pid]) => slot === sid && pid === p.id)
      )
      const sr = d.total_balls > 0 ? ((d.total_runs / d.total_balls) * 100).toFixed(1) : '—'
      return [sid, owner?.name || '—', d.total_runs || 0, d.total_balls || 0, d.total_fours || 0, d.total_sixes || 0, sr]
    })
  ]

  // ── Sheet 3: Squads ────────────────────────────────────────
  const squadRows = [
    ['Participant', 'Code', 'Slot 1', 'Slot 2', 'Slot 3', 'Slot 4', 'Slot 5', 'Total Runs'],
    ...participants.map(p => {
      const slots = Object.entries(draftMap)
        .filter(([_, pid]) => pid === p.id)
        .map(([sid]) => sid)
      const total = slots.reduce((s, sid) => s + (slotTotals[sid]?.total_runs || 0), 0)
      return [p.name, p.access_code, ...slots, total]
    })
  ]

  return { lbRows, slotRows, squadRows }
}

async function syncToSheets(sheetId, apiKey, payload, toast) {
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`

  // Step 1: Get spreadsheet metadata to find/create sheets
  const metaRes = await fetch(`${base}?key=${apiKey}`)
  if (!metaRes.ok) {
    const err = await metaRes.json()
    throw new Error(err.error?.message || 'Cannot access spreadsheet. Check Sheet ID and API key.')
  }
  const meta = await metaRes.json()
  const existingSheets = meta.sheets.map(s => ({ title: s.properties.title, id: s.properties.sheetId }))

  const needed = ['Leaderboard', 'Season Totals', 'Squads']

  // Step 2: Create missing sheets
  const addRequests = needed
    .filter(title => !existingSheets.find(s => s.title === title))
    .map(title => ({ addSheet: { properties: { title } } }))

  if (addRequests.length > 0) {
    const addRes = await fetch(`${base}:batchUpdate?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: addRequests }),
    })
    if (!addRes.ok) {
      const err = await addRes.json()
      throw new Error(err.error?.message || 'Failed to create sheets')
    }
  }

  // Step 3: Write data to each sheet
  const sheetDataMap = {
    'Leaderboard':   payload.lbRows,
    'Season Totals': payload.slotRows,
    'Squads':        payload.squadRows,
  }

  const valueRanges = Object.entries(sheetDataMap).map(([sheet, rows]) => ({
    range: `${sheet}!A1`,
    values: rows,
  }))

  const writeRes = await fetch(`${base}/values:batchUpdate?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: valueRanges,
    }),
  })

  if (!writeRes.ok) {
    const err = await writeRes.json()
    throw new Error(err.error?.message || 'Failed to write data to sheet')
  }

  return await writeRes.json()
}

export default function SheetsSync() {
  const { leaderboard, participants, slotTotals, matches, draftMap, toast } = useApp()

  const [sheetId,  setSheetId]  = useState(() => localStorage.getItem(LS_SHEET_ID)  || '')
  const [apiKey,   setApiKey]   = useState(() => localStorage.getItem(LS_SHEET_KEY) || '')
  const [syncing,  setSyncing]  = useState(false)
  const [lastSync, setLastSync] = useState(null)
  const [showSetup,setShowSetup]= useState(!localStorage.getItem(LS_SHEET_ID))

  const saveConfig = () => {
    if (!sheetId.trim()) { toast('Enter your Sheet ID', 'error'); return }
    if (!apiKey.trim())  { toast('Enter your API key', 'error');  return }
    localStorage.setItem(LS_SHEET_ID,  sheetId.trim())
    localStorage.setItem(LS_SHEET_KEY, apiKey.trim())
    setShowSetup(false)
    toast('Configuration saved ✓')
  }

  const handleSync = async () => {
    const sid = localStorage.getItem(LS_SHEET_ID)
    const key = localStorage.getItem(LS_SHEET_KEY)
    if (!sid || !key) { setShowSetup(true); toast('Configure Google Sheets first', 'error'); return }

    setSyncing(true)
    try {
      const payload = buildSheetsPayload(leaderboard, participants, slotTotals, matches, draftMap)
      await syncToSheets(sid, key, payload, toast)
      const now = new Date().toLocaleTimeString()
      setLastSync(now)
      toast('Google Sheet synced! ✓')
    } catch (e) {
      toast('Sync failed: ' + e.message, 'error')
      console.error('Sheets sync error:', e)
    } finally {
      setSyncing(false)
    }
  }

  const published = matches.filter(m => m.published)

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ color: 'white', fontSize: 20, fontWeight: 800, marginBottom: 3 }}>📊 Google Sheets Sync</h1>
        <p style={{ color: '#64748B', fontSize: 13 }}>Push full leaderboard, scores and squads to your Google Sheet instantly</p>
      </div>

      {/* Sync status card */}
      <div style={{ background: '#0A111E', borderRadius: 12, border: '1px solid #0F1E35', padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Sync Now</div>
            <div style={{ color: '#64748B', fontSize: 12 }}>
              {published.length} matches · {leaderboard.length} participants · {Object.keys(slotTotals).length} slots
            </div>
            {lastSync && (
              <div style={{ color: '#22C55E', fontSize: 11, marginTop: 4 }}>
                ✓ Last synced at {lastSync}
              </div>
            )}
          </div>
          <button onClick={handleSync} disabled={syncing} style={{
            padding: '13px 28px',
            background: syncing ? '#166534' : '#22C55E',
            border: 'none', borderRadius: 10,
            color: '#060E1A', cursor: syncing ? 'wait' : 'pointer',
            fontSize: 14, fontWeight: 800, fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 8,
            minWidth: 160,
          }}>
            {syncing
              ? <><Spinner /> Syncing…</>
              : '📊 Sync to Sheet'
            }
          </button>
        </div>

        {/* What gets synced */}
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #0F1E35', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            ['Leaderboard', 'Rank, name, total runs, slots'],
            ['Season Totals', 'Every slot: runs, balls, 4s, 6s, S/R'],
            ['Squads', 'Each participant\'s 5 slots + total'],
          ].map(([title, desc]) => (
            <div key={title} style={{ background: '#060E1A', borderRadius: 8, padding: '10px 14px', flex: 1, minWidth: 140 }}>
              <div style={{ color: '#22C55E', fontWeight: 700, fontSize: 12, marginBottom: 3 }}>📋 {title}</div>
              <div style={{ color: '#475569', fontSize: 11 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Configuration */}
      <div style={{ background: '#0A111E', borderRadius: 12, border: '1px solid #0F1E35', overflow: 'hidden', marginBottom: 16 }}>
        <button
          onClick={() => setShowSetup(s => !s)}
          style={{ width: '100%', padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'inherit' }}
        >
          <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>⚙️ Configuration</span>
          <span style={{ color: '#475569', fontSize: 12 }}>
            {localStorage.getItem(LS_SHEET_ID) ? '✓ Configured' : '⚠ Not set up'} {showSetup ? '▲' : '▼'}
          </span>
        </button>

        {showSetup && (
          <div style={{ padding: '0 16px 16px', borderTop: '1px solid #0F1E35' }}>
            <div style={{ marginTop: 14, marginBottom: 16 }}>
              <Field label="Google Sheet ID" value={sheetId} onChange={setSheetId}
                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                hint="Found in your sheet's URL: docs.google.com/spreadsheets/d/[THIS-PART]/edit"
              />
              <Field label="Google API Key" value={apiKey} onChange={setApiKey}
                placeholder="AIzaSy..."
                hint="Get from: console.cloud.google.com → Credentials → API Key (enable Google Sheets API)"
                secret
              />
            </div>
            <button onClick={saveConfig} style={{ padding: '10px 20px', background: '#22C55E', border: 'none', borderRadius: 8, color: '#060E1A', fontWeight: 800, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
              Save Configuration
            </button>
          </div>
        )}
      </div>

      {/* Step by step setup guide */}
      <div style={{ background: '#0A111E', borderRadius: 12, border: '1px solid #0F1E35', padding: 16 }}>
        <div style={{ color: 'white', fontWeight: 700, fontSize: 14, marginBottom: 14 }}>📖 Setup Guide (one time)</div>

        {[
          {
            step: '1',
            title: 'Create a Google Sheet',
            body: 'Go to sheets.google.com → create a new blank sheet → name it "IPL Fantasy 2025"',
            color: '#22C55E',
          },
          {
            step: '2',
            title: 'Copy the Sheet ID',
            body: 'Look at the URL: docs.google.com/spreadsheets/d/[SHEET-ID]/edit — copy the long ID between /d/ and /edit',
            color: '#3B82F6',
          },
          {
            step: '3',
            title: 'Get a Google API Key',
            body: 'Go to console.cloud.google.com → New Project → Enable "Google Sheets API" → Credentials → Create API Key → Copy it',
            color: '#F59E0B',
          },
          {
            step: '4',
            title: 'Make the Sheet public (important)',
            body: 'In your Google Sheet → Share → Anyone with the link → Editor. This lets the API key write to it.',
            color: '#A855F7',
          },
          {
            step: '5',
            title: 'Paste both into Configuration above',
            body: 'Paste your Sheet ID and API Key into the fields above → Save Configuration → Click Sync to Sheet',
            color: '#22C55E',
          },
        ].map(({ step, title, body, color }) => (
          <div key={step} style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${color}22`, border: `1px solid ${color}44`, color, fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {step}
            </div>
            <div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{title}</div>
              <div style={{ color: '#64748B', fontSize: 12, lineHeight: 1.6 }}>{body}</div>
            </div>
          </div>
        ))}

        <div style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, padding: '10px 14px', marginTop: 4 }}>
          <div style={{ color: '#3B82F6', fontSize: 12, lineHeight: 1.6 }}>
            <strong>After setup:</strong> Click Sync to Sheet after every match to update the sheet instantly. Share the sheet link with participants so they can view it anytime.
          </div>
        </div>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div style={{ width: 14, height: 14, border: '2px solid #06401a', borderTop: '2px solid #060E1A', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
  )
}

function Field({ label, value, onChange, placeholder, hint, secret }) {
  const [show, setShow] = useState(false)
  const [foc,  setFoc]  = useState(false)
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ color: '#94A3B8', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 5 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={secret && !show ? 'password' : 'text'}
          value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
          style={{
            width: '100%', padding: secret ? '10px 60px 10px 12px' : '10px 12px',
            background: '#060E1A',
            border: `1px solid ${foc ? '#22C55E' : '#1E293B'}`,
            borderRadius: 8, color: 'white', fontSize: 13,
            outline: 'none', fontFamily: 'inherit',
            boxSizing: 'border-box', transition: 'border-color 0.2s',
          }}
        />
        {secret && (
          <button onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>
            {show ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {hint && <p style={{ color: '#334155', fontSize: 11, marginTop: 4, lineHeight: 1.5 }}>{hint}</p>}
    </div>
  )
}
