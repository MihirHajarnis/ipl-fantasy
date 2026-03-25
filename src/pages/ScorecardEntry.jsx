import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { SlotBadge, Avatar } from '../components/ui.jsx'
import { IPL_TEAMS, TEAM_META, ALL_SLOTS } from '../lib/supabase.js'
import {
  fetchScoresForMatch, upsertScores,
  publishMatch, unpublishMatch, deleteScore, deleteMatch, createMatch,
  writeAuditLog, saveRankSnapshot,
} from '../lib/api.js'

// ── Number input ──────────────────────────────────────────────
function NumInput({ value, onChange, accent, primary, max = 300 }) {
  const hasVal = value > 0
  return (
    <input type="number" min="0" max={max} value={value === 0 ? '' : value}
      onChange={e => onChange(parseInt(e.target.value) || 0)} placeholder="0"
      style={{
        width: '100%', padding: '8px 6px', textAlign: 'center',
        background: primary && hasVal ? 'rgba(34,197,94,0.07)' : '#0A111E',
        border: `1px solid ${primary && hasVal ? `${accent}66` : '#1E293B'}`,
        borderRadius: 7,
        color: primary && hasVal ? '#22C55E' : '#E2E8F0',
        fontSize: primary ? 15 : 13,
        fontWeight: primary && hasVal ? 700 : 400,
        outline: 'none', fontFamily: 'inherit', transition: 'all 0.15s',
      }}
      onFocus={e => { e.target.style.borderColor = accent; if (primary) e.target.style.boxShadow = `0 0 0 2px ${accent}18` }}
      onBlur={e  => { e.target.style.borderColor = primary && hasVal ? `${accent}66` : '#1E293B'; e.target.style.boxShadow = 'none' }}
    />
  )
}

// ── Innings block ─────────────────────────────────────────────
function InningsBlock({ label, team, inputs, savedRows, onChangeRow, onDeleteRow }) {
  const meta      = TEAM_META[team] || {}
  const slots     = Array.from({length:6}, (_,i) => `${team}${i+1}`)
  const totalRuns = slots.reduce((s, sl) => s + (inputs[sl]?.runs || 0), 0)

  return (
    <div style={{ background: '#0A111E', borderRadius: 12, border: `1px solid ${meta.color || '#1E293B'}44`, overflow: 'hidden', marginBottom: 14 }}>
      {/* Header */}
      <div style={{ padding: '12px 14px', background: `linear-gradient(90deg, ${meta.color||'#1E293B'}22, transparent)`, borderBottom: '1px solid #0F1E35', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: 'white', fontWeight: 800, fontSize: 14 }}>{label}</div>
          <div style={{ color: meta.accent || '#64748B', fontSize: 12, marginTop: 2 }}>{team} Batting · Slots 1–6</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#22C55E', fontSize: 20, fontWeight: 800 }}>{totalRuns}</div>
          <div style={{ color: '#334155', fontSize: 10 }}>total runs</div>
        </div>
      </div>

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 1fr 1fr 52px 36px', gap: 6, padding: '8px 10px', borderBottom: '1px solid #0F1E35' }}>
        {['SLOT','R ★','B','4s','6s','SR',''].map((h,i) => (
          <div key={i} style={{ color: i===1 ? '#22C55E' : '#1E3A5F', fontSize: 10, fontWeight: 700, textAlign: i>=2 ? 'center' : 'left' }}>{h}</div>
        ))}
      </div>

      {/* Rows */}
      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {slots.map(slot => {
          const d       = inputs[slot] || { runs:0, balls:0, fours:0, sixes:0 }
          const saved   = savedRows[slot]
          const hasRuns = d.runs > 0
          const isSaved = (saved?.runs || 0) > 0
          const isDirty = hasRuns && JSON.stringify(d) !== JSON.stringify(saved)
          const srVal   = d.balls > 0 ? ((d.runs/d.balls)*100).toFixed(1) : '—'
          // Diff display
          const prevRuns = saved?.runs || 0
          const diff     = hasRuns && isSaved ? d.runs - prevRuns : 0

          return (
            <div key={slot} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 1fr 1fr 52px 36px', gap: 6, alignItems: 'center', padding: '7px 0', borderRadius: 7, background: hasRuns ? 'rgba(34,197,94,0.03)' : 'transparent' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <SlotBadge slot={slot} size="lg" />
                {isDirty && diff !== 0 && (
                  <span style={{ fontSize: 9, color: diff > 0 ? '#22C55E' : '#EF4444', fontWeight: 700 }}>
                    {prevRuns} → {d.runs} ({diff > 0 ? '+' : ''}{diff})
                  </span>
                )}
              </div>
              <NumInput value={d.runs}  onChange={v => onChangeRow(slot,'runs',v)}  accent="#22C55E" primary max={300} />
              <NumInput value={d.balls} onChange={v => onChangeRow(slot,'balls',v)} accent="#3B82F6" max={300} />
              <NumInput value={d.fours} onChange={v => onChangeRow(slot,'fours',v)} accent="#F59E0B" max={50}  />
              <NumInput value={d.sixes} onChange={v => onChangeRow(slot,'sixes',v)} accent="#A855F7" max={30}  />
              <div style={{ color: d.balls>0 ? '#3B82F6' : '#1E3A5F', fontSize: 11, fontWeight: 600, textAlign: 'center' }}>{srVal}</div>
              <button onClick={() => onDeleteRow(slot)} title="Clear" disabled={!isSaved} style={{ width:30, height:30, borderRadius:6, background: isSaved?'rgba(239,68,68,0.08)':'transparent', border: isSaved?'1px solid rgba(239,68,68,0.2)':'1px solid transparent', color: isSaved?'#EF4444':'#1E3A5F', cursor: isSaved?'pointer':'default', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'inherit' }}>
                🗑
              </button>
            </div>
          )
        })}
      </div>

      {/* Footer totals */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid #0F1E35', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {[['Runs',totalRuns,'#22C55E'],['Balls',slots.reduce((s,sl)=>s+(inputs[sl]?.balls||0),0),'#3B82F6'],['4s',slots.reduce((s,sl)=>s+(inputs[sl]?.fours||0),0),'#F59E0B'],['6s',slots.reduce((s,sl)=>s+(inputs[sl]?.sixes||0),0),'#A855F7']].map(([l,v,c])=>(
          <div key={l}><div style={{color:'#334155',fontSize:9,fontWeight:700,textTransform:'uppercase'}}>{l}</div><div style={{color:c,fontSize:16,fontWeight:800}}>{v}</div></div>
        ))}
      </div>
    </div>
  )
}

// ── Bulk mode parser ──────────────────────────────────────────
function parseBulkText(text) {
  const results = {}
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  for (const line of lines) {
    // Accept: "MI1 45 32 4 2" or "MI1: 45 32 4 2" or "MI1,45,32,4,2"
    const cleaned = line.replace(/[,:]/g, ' ').replace(/\s+/g, ' ').trim()
    const parts   = cleaned.split(' ')
    if (parts.length < 2) continue
    const slot = parts[0].toUpperCase()
    if (!ALL_SLOTS.includes(slot)) continue
    results[slot] = {
      runs:  parseInt(parts[1]) || 0,
      balls: parseInt(parts[2]) || 0,
      fours: parseInt(parts[3]) || 0,
      sixes: parseInt(parts[4]) || 0,
    }
  }
  return results
}

// ── Main page ─────────────────────────────────────────────────
export default function ScorecardEntry() {
  const { matches, participants, leaderboard, getParticipantSlots, toast, refresh } = useApp()

  const [selectedMatchId, setSelected]  = useState(null)
  const [inputs,     setInputs]    = useState({})
  const [savedRows,  setSavedRows] = useState({})
  const [saving,     setSaving]    = useState(false)
  const [publishing, setPub]       = useState(false)
  const [showNew,    setShowNew]   = useState(false)
  const [newLabel,   setNewLabel]  = useState('')
  const [newHome,    setNewHome]   = useState('')
  const [newAway,    setNewAway]   = useState('')
  const [newDate,    setNewDate]   = useState('')
  const [confirm,    setConfirm]   = useState(null)
  const [bulkMode,   setBulkMode]  = useState(false)
  const [bulkText,   setBulkText]  = useState('')
  const [bulkParsed, setBulkParsed]= useState({})
  const [bulkError,  setBulkError] = useState('')
  // Undo stack — stores previous savedRows before each save
  const undoStack = useRef([])

  const selectedMatch = matches.find(m => m.id === selectedMatchId)
  const team1 = selectedMatch?.home_team || null
  const team2 = selectedMatch?.away_team || null

  useEffect(() => {
    if (!selectedMatchId) return
    fetchScoresForMatch(selectedMatchId).then(rows => {
      const map = {}
      rows.forEach(r => { map[r.slot_id] = { runs:r.runs, balls:r.balls, fours:r.fours, sixes:r.sixes } })
      setInputs(map); setSavedRows(map)
    })
  }, [selectedMatchId])

  const handleChange = (slot, field, val) =>
    setInputs(p => ({ ...p, [slot]: { ...(p[slot] || {runs:0,balls:0,fours:0,sixes:0}), [field]: val } }))

  const handleDeleteRow = async (slot) => {
    if (!savedRows[slot]) { setInputs(p => { const n={...p}; delete n[slot]; return n }); return }
    setConfirm({ type:'deleteScore', slotId: slot })
  }

  // ── Bulk mode ──────────────────────────────────────────────
  const handleBulkParse = () => {
    const parsed = parseBulkText(bulkText)
    const count  = Object.keys(parsed).length
    if (count === 0) { setBulkError('No valid slots found. Format: MI1 45 32 4 2 (one per line)'); setBulkParsed({}); return }
    const invalid = bulkText.split('\n').filter(l => l.trim()).filter(l => {
      const slot = l.trim().replace(/[,:]/g,' ').split(' ')[0].toUpperCase()
      return slot && !ALL_SLOTS.includes(slot)
    })
    setBulkError(invalid.length ? `⚠ Unknown slots ignored: ${invalid.map(l=>l.split(' ')[0]).join(', ')}` : '')
    setBulkParsed(parsed)
  }

  const handleBulkApply = () => {
    if (Object.keys(bulkParsed).length === 0) { toast('Parse first', 'error'); return }
    setInputs(p => ({ ...p, ...bulkParsed }))
    toast(`${Object.keys(bulkParsed).length} slots loaded from bulk entry ✓`)
    setBulkMode(false); setBulkText(''); setBulkParsed({})
  }

  // ── Save (with audit log + undo stack) ─────────────────────
  const handleSave = async () => {
    if (!selectedMatchId) { toast('Select a match first', 'error'); return }
    setSaving(true)
    try {
      // Push current savedRows to undo stack
      undoStack.current.push(JSON.parse(JSON.stringify(savedRows)))
      if (undoStack.current.length > 5) undoStack.current.shift()

      const rows = Object.entries(inputs).map(([slot_id, v]) => ({ slot_id, ...v }))
      await upsertScores(selectedMatchId, rows)

      // Write audit log entries for each changed slot
      for (const [slot_id, newVals] of Object.entries(inputs)) {
        const old = savedRows[slot_id]
        const action = old ? 'updated' : 'created'
        if (!old || JSON.stringify(old) !== JSON.stringify(newVals)) {
          await writeAuditLog(selectedMatchId, slot_id, action, old || null, newVals)
        }
      }
      // Audit deleted slots
      for (const slot_id of Object.keys(savedRows)) {
        if (!inputs[slot_id]) {
          await writeAuditLog(selectedMatchId, slot_id, 'deleted', savedRows[slot_id], null)
        }
      }

      setSavedRows({ ...inputs })
      toast('Scorecard saved ✓')
      refresh()
    } catch (e) { toast('Save failed: ' + e.message, 'error') }
    finally { setSaving(false) }
  }

  // ── Undo ───────────────────────────────────────────────────
  const handleUndo = async () => {
    if (undoStack.current.length === 0) { toast('Nothing to undo', 'warning'); return }
    const prev = undoStack.current.pop()
    setSaving(true)
    try {
      // Restore previous state to DB
      const rows = Object.entries(prev).map(([slot_id, v]) => ({ slot_id, ...v }))
      if (rows.length > 0) await upsertScores(selectedMatchId, rows)
      // Delete slots that existed in current but not in prev
      for (const slot of Object.keys(savedRows)) {
        if (!prev[slot]) await deleteScore(selectedMatchId, slot)
      }
      await writeAuditLog(selectedMatchId, 'ALL', 'updated', null, { note: 'Undo last save' })
      setInputs({ ...prev }); setSavedRows({ ...prev })
      toast('Last save undone ↩')
      refresh()
    } catch (e) { toast('Undo failed: ' + e.message, 'error') }
    finally { setSaving(false) }
  }

  // ── Publish ────────────────────────────────────────────────
  const handlePublish = async () => {
    const filled = Object.values(inputs).filter(v => v.runs > 0).length
    if (filled === 0) { toast('Enter at least one batter\'s runs', 'error'); return }
    setPub(true)
    try {
      const rows = Object.entries(inputs).map(([slot_id, v]) => ({ slot_id, ...v }))
      await upsertScores(selectedMatchId, rows)
      // Save rank snapshot before publishing so we can show rank changes
      await saveRankSnapshot(selectedMatchId, leaderboard)
      await publishMatch(selectedMatchId)
      for (const [slot_id, newVals] of Object.entries(inputs)) {
        const old = savedRows[slot_id]
        if (!old || JSON.stringify(old) !== JSON.stringify(newVals)) {
          await writeAuditLog(selectedMatchId, slot_id, old ? 'updated' : 'created', old||null, newVals)
        }
      }
      setSavedRows({ ...inputs })
      toast('Scores published! 🚀')
      refresh()
    } catch (e) { toast('Publish failed: ' + e.message, 'error') }
    finally { setPub(false) }
  }

  const handleUnpublish = async () => { setConfirm(null); try { await unpublishMatch(selectedMatchId); toast('Match unpublished','warning'); refresh() } catch(e){toast(e.message,'error')} }
  const handleDeleteMatch = async () => { setConfirm(null); try { await deleteMatch(selectedMatchId); setSelected(null);setInputs({});setSavedRows({}); toast('Match deleted','warning'); refresh() } catch(e){toast(e.message,'error')} }
  const handleDeleteScoreConfirmed = async () => {
    const slot = confirm.slotId; setConfirm(null)
    try {
      await deleteScore(selectedMatchId, slot)
      await writeAuditLog(selectedMatchId, slot, 'deleted', savedRows[slot], null)
      setInputs(p=>{const n={...p};delete n[slot];return n})
      setSavedRows(p=>{const n={...p};delete n[slot];return n})
      toast(`${slot} score deleted`); refresh()
    } catch(e){toast(e.message,'error')}
  }

  const handleCreateMatch = async () => {
    if (!newLabel)          { toast('Enter match label','error'); return }
    if (!newHome||!newAway) { toast('Select both teams','error'); return }
    if (newHome===newAway)  { toast('Teams must be different','error'); return }
    try {
      const m = await createMatch(newLabel, newHome, newAway, newDate||null)
      toast(`${newLabel} created`); setSelected(m.id); setShowNew(false)
      setNewLabel('');setNewHome('');setNewAway('');setNewDate('')
      refresh()
    } catch(e){toast(e.message,'error')}
  }

  const innings1Slots = team1 ? Array.from({length:6},(_,i)=>`${team1}${i+1}`) : []
  const innings2Slots = team2 ? Array.from({length:6},(_,i)=>`${team2}${i+1}`) : []
  const totalFilled   = [...innings1Slots,...innings2Slots].filter(s=>(inputs[s]?.runs||0)>0).length

  // ── Confirm dialog ─────────────────────────────────────────
  const ConfirmDialog = () => {
    if (!confirm) return null
    const cfg = {
      deleteScore:  { title:`Delete ${confirm?.slotId} Score?`, body:`Remove this slot's runs from ${selectedMatch?.label}.`, action:handleDeleteScoreConfirmed, col:'#EF4444' },
      unpublish:    { title:'Unpublish Match?', body:'Scores hidden from leaderboard until re-published.', action:handleUnpublish, col:'#F59E0B' },
      deleteMatch:  { title:'Delete Entire Match?', body:`Permanently delete all scores for ${selectedMatch?.label}.`, action:handleDeleteMatch, col:'#EF4444' },
    }[confirm.type]
    return (
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
        <div style={{background:'#0A111E',borderRadius:16,border:`1px solid ${cfg.col}44`,padding:28,maxWidth:360,width:'100%'}}>
          <div style={{fontSize:28,marginBottom:10}}>⚠️</div>
          <h3 style={{color:'white',fontWeight:800,fontSize:16,marginBottom:8}}>{cfg.title}</h3>
          <p style={{color:'#94A3B8',fontSize:13,lineHeight:1.6,marginBottom:22}}>{cfg.body}</p>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <button onClick={()=>setConfirm(null)} style={{padding:'11px',background:'#060E1A',border:'1px solid #1E293B',borderRadius:8,color:'#94A3B8',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit'}}>Cancel</button>
            <button onClick={cfg.action} style={{padding:'11px',background:cfg.col,border:'none',borderRadius:8,color:'white',cursor:'pointer',fontSize:13,fontWeight:800,fontFamily:'inherit'}}>Confirm</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{padding:16,fontFamily:"'Inter',system-ui,sans-serif"}}>
      <ConfirmDialog />

      <div style={{marginBottom:16}}>
        <h1 style={{color:'white',fontSize:20,fontWeight:800,marginBottom:3}}>🏏 Scorecard Entry</h1>
        <p style={{color:'#64748B',fontSize:13}}>Top 6 batters per innings · R counts toward leaderboard · all changes logged</p>
      </div>

      {/* Mode toggle */}
      <div style={{display:'flex',background:'#060E1A',borderRadius:10,padding:4,marginBottom:16,border:'1px solid #1E293B',gap:4,maxWidth:320}}>
        {[['normal','🏏 Normal Mode'],['bulk','⚡ Bulk Mode']].map(([m,lbl])=>(
          <button key={m} onClick={()=>setBulkMode(m==='bulk')} style={{flex:1,padding:'9px 0',borderRadius:7,border:'none',cursor:'pointer',background:bulkMode===(m==='bulk')?'#22C55E':'transparent',color:bulkMode===(m==='bulk')?'#060E1A':'#64748B',fontWeight:700,fontSize:13,fontFamily:'inherit',transition:'all 0.18s'}}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Match selector */}
      <div style={{background:'#0A111E',borderRadius:12,border:'1px solid #0F1E35',padding:14,marginBottom:14}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <span style={{color:'white',fontWeight:700,fontSize:14}}>Select Match</span>
          <button onClick={()=>setShowNew(s=>!s)} style={{padding:'6px 12px',background:'rgba(59,130,246,0.12)',border:'1px solid rgba(59,130,246,0.3)',borderRadius:7,color:'#3B82F6',cursor:'pointer',fontSize:12,fontWeight:700,fontFamily:'inherit'}}>+ New Match</button>
        </div>

        {showNew && (
          <div style={{background:'#060E1A',borderRadius:10,padding:14,marginBottom:12,border:'1px solid #1E293B'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
              <div style={{gridColumn:'1 / -1'}}>
                <div style={{color:'#64748B',fontSize:11,fontWeight:600,marginBottom:4}}>Match Label</div>
                <input value={newLabel} onChange={e=>setNewLabel(e.target.value)} placeholder="e.g. M1"
                  style={{width:'100%',padding:'9px 12px',background:'#0A111E',border:'1px solid #1E293B',borderRadius:7,color:'white',fontSize:14,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}
                  onFocus={e=>e.target.style.borderColor='#22C55E'} onBlur={e=>e.target.style.borderColor='#1E293B'}
                />
              </div>
              {[['Innings 1 (Home)',newHome,setNewHome,newAway],['Innings 2 (Away)',newAway,setNewAway,newHome]].map(([lbl,val,set,excl])=>(
                <div key={lbl}>
                  <div style={{color:'#64748B',fontSize:11,fontWeight:600,marginBottom:4}}>{lbl}</div>
                  <select value={val} onChange={e=>set(e.target.value)} style={{width:'100%',padding:'9px 12px',background:'#0A111E',border:'1px solid #1E293B',borderRadius:7,color:val?'white':'#475569',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box',cursor:'pointer'}}
                    onFocus={e=>e.target.style.borderColor='#22C55E'} onBlur={e=>e.target.style.borderColor='#1E293B'}>
                    <option value="">Select team…</option>
                    {IPL_TEAMS.filter(t=>t!==excl).map(t=><option key={t} value={t}>{t} — {TEAM_META[t]?.label}</option>)}
                  </select>
                </div>
              ))}
              <div style={{gridColumn:'1 / -1'}}>
                <div style={{color:'#64748B',fontSize:11,fontWeight:600,marginBottom:4}}>Date (optional)</div>
                <input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)}
                  style={{width:'100%',padding:'9px 12px',background:'#0A111E',border:'1px solid #1E293B',borderRadius:7,color:'white',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}
                  onFocus={e=>e.target.style.borderColor='#22C55E'} onBlur={e=>e.target.style.borderColor='#1E293B'}
                />
              </div>
            </div>
            <button onClick={handleCreateMatch} style={{padding:'9px 18px',background:'#22C55E',border:'none',borderRadius:8,color:'#060E1A',fontWeight:800,cursor:'pointer',fontSize:13,fontFamily:'inherit'}}>Create Match</button>
          </div>
        )}

        <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
          {matches.length===0&&<span style={{color:'#334155',fontSize:13}}>No matches yet</span>}
          {matches.map(m=>(
            <button key={m.id} onClick={()=>{setSelected(m.id);setInputs({});setSavedRows({})}} style={{padding:'7px 14px',borderRadius:8,border:`1px solid ${selectedMatchId===m.id?'#22C55E':'#1E293B'}`,background:selectedMatchId===m.id?'rgba(34,197,94,0.12)':'#060E1A',color:selectedMatchId===m.id?'#22C55E':'#64748B',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit',display:'flex',alignItems:'center',gap:6}}>
              {m.label}
              {m.home_team&&m.away_team&&<span style={{color:'#334155',fontSize:11}}>{m.home_team} vs {m.away_team}</span>}
              {m.published&&<span style={{background:'rgba(34,197,94,0.15)',color:'#22C55E',fontSize:9,fontWeight:700,padding:'1px 5px',borderRadius:4}}>LIVE</span>}
            </button>
          ))}
        </div>
      </div>

      {selectedMatch && (
        <>
          {/* Match status bar */}
          <div style={{background:'#0A111E',borderRadius:10,border:'1px solid #0F1E35',padding:'10px 14px',marginBottom:14,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
            <span style={{color:'white',fontWeight:700}}>{selectedMatch.label}</span>
            {team1&&team2&&<span style={{color:'#64748B',fontSize:13}}>{team1} vs {team2}</span>}
            <div style={{marginLeft:'auto',display:'flex',gap:7,flexWrap:'wrap'}}>
              {selectedMatch.published
                ?<span style={{background:'rgba(34,197,94,0.12)',border:'1px solid rgba(34,197,94,0.3)',color:'#22C55E',padding:'4px 10px',borderRadius:6,fontSize:12,fontWeight:700}}>✓ Published</span>
                :<span style={{background:'rgba(245,158,11,0.12)',border:'1px solid rgba(245,158,11,0.3)',color:'#F59E0B',padding:'4px 10px',borderRadius:6,fontSize:12,fontWeight:700}}>Draft</span>
              }
              {selectedMatch.published&&<button onClick={()=>setConfirm({type:'unpublish'})} style={{padding:'4px 11px',background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.25)',borderRadius:6,color:'#F59E0B',cursor:'pointer',fontSize:12,fontWeight:700,fontFamily:'inherit'}}>↩ Unpublish</button>}
              <button onClick={()=>setConfirm({type:'deleteMatch'})} style={{padding:'4px 11px',background:'rgba(239,68,68,0.07)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:6,color:'#EF4444',cursor:'pointer',fontSize:12,fontWeight:700,fontFamily:'inherit'}}>🗑 Delete</button>
            </div>
          </div>

          {(!team1||!team2)&&<div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.22)',borderRadius:10,padding:'12px 16px',marginBottom:14,color:'#EF4444',fontSize:13}}>⚠️ Match has no teams set. Delete and recreate with both teams.</div>}

          {/* Bulk Mode */}
          {bulkMode ? (
            <div style={{background:'#0A111E',borderRadius:12,border:'1px solid #0F1E35',padding:16,marginBottom:14}}>
              <div style={{color:'white',fontWeight:700,fontSize:14,marginBottom:4}}>⚡ Bulk Entry Mode</div>
              <div style={{color:'#64748B',fontSize:12,marginBottom:12,lineHeight:1.6}}>
                One slot per line. Format: <code style={{color:'#22C55E',background:'#060E1A',padding:'1px 6px',borderRadius:4}}>SLOT RUNS BALLS 4s 6s</code><br/>
                Example: <code style={{color:'#94A3B8'}}>MI1 56 34 6 2</code> · Balls/4s/6s optional
              </div>
              <textarea value={bulkText} onChange={e=>{setBulkText(e.target.value);setBulkParsed({})}}
                rows={10} placeholder={"MI1 56 34 6 2\nMI2 12 18 1 0\nMI3 78 41 5 4\nRCB1 45 30 4 1\n..."}
                style={{width:'100%',padding:'12px',background:'#060E1A',border:'1px solid #1E293B',borderRadius:9,color:'white',fontSize:13,fontFamily:"'JetBrains Mono',monospace",outline:'none',boxSizing:'border-box',resize:'vertical',lineHeight:1.8}}
                onFocus={e=>e.target.style.borderColor='#22C55E'} onBlur={e=>e.target.style.borderColor='#1E293B'}
              />
              {bulkError&&<div style={{color:'#F59E0B',fontSize:12,marginTop:6}}>{bulkError}</div>}
              {Object.keys(bulkParsed).length>0&&(
                <div style={{background:'rgba(34,197,94,0.07)',border:'1px solid rgba(34,197,94,0.2)',borderRadius:8,padding:'10px 14px',marginTop:10}}>
                  <div style={{color:'#22C55E',fontWeight:700,fontSize:12,marginBottom:6}}>✓ {Object.keys(bulkParsed).length} slots parsed</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                    {Object.entries(bulkParsed).map(([slot,d])=>(
                      <div key={slot} style={{background:'#060E1A',borderRadius:6,padding:'4px 10px',fontSize:11}}>
                        <SlotBadge slot={slot}/> <span style={{color:'#22C55E',fontWeight:700,marginLeft:4}}>{d.runs}r</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{display:'flex',gap:8,marginTop:12}}>
                <button onClick={handleBulkParse} style={{padding:'10px 20px',background:'rgba(59,130,246,0.12)',border:'1px solid rgba(59,130,246,0.3)',borderRadius:8,color:'#3B82F6',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit'}}>🔍 Parse</button>
                {Object.keys(bulkParsed).length>0&&<button onClick={handleBulkApply} style={{padding:'10px 20px',background:'#22C55E',border:'none',borderRadius:8,color:'#060E1A',cursor:'pointer',fontSize:13,fontWeight:800,fontFamily:'inherit'}}>✓ Apply to Scorecard</button>}
              </div>
            </div>
          ) : (
            <>
              {team1&&<InningsBlock label="Innings 1" team={team1} inputs={inputs} savedRows={savedRows} onChangeRow={handleChange} onDeleteRow={handleDeleteRow}/>}
              {team2&&<InningsBlock label="Innings 2" team={team2} inputs={inputs} savedRows={savedRows} onChangeRow={handleChange} onDeleteRow={handleDeleteRow}/>}
            </>
          )}

          {/* Summary */}
          {!bulkMode&&(team1||team2)&&(
            <div style={{background:'#0A111E',borderRadius:10,border:'1px solid #0F1E35',padding:'12px 16px',marginBottom:80,display:'flex',gap:20,flexWrap:'wrap'}}>
              <div><div style={{color:'#334155',fontSize:10,fontWeight:700,textTransform:'uppercase'}}>Match Total Runs</div><div style={{color:'#22C55E',fontSize:22,fontWeight:800}}>{[...innings1Slots,...innings2Slots].reduce((s,sl)=>s+(inputs[sl]?.runs||0),0)}</div></div>
              <div><div style={{color:'#334155',fontSize:10,fontWeight:700,textTransform:'uppercase'}}>Slots Filled</div><div style={{color:'white',fontSize:22,fontWeight:800}}>{totalFilled} / 12</div></div>
            </div>
          )}

          {/* Sticky action bar */}
          <div style={{position:'fixed',bottom:70,left:0,right:0,padding:'10px 16px',background:'#060E1A',borderTop:'1px solid #0F1E35',display:'flex',gap:8,flexWrap:'wrap',zIndex:50}}>
            {undoStack.current.length>0&&(
              <button onClick={handleUndo} style={{padding:'11px 16px',background:'rgba(245,158,11,0.10)',border:'1px solid rgba(245,158,11,0.28)',borderRadius:9,color:'#F59E0B',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit'}}>↩ Undo</button>
            )}
            <button onClick={handleSave} disabled={saving} style={{flex:1,padding:'13px',background:'rgba(59,130,246,0.10)',border:'1px solid rgba(59,130,246,0.28)',borderRadius:9,color:'#3B82F6',cursor:saving?'wait':'pointer',fontSize:14,fontWeight:700,fontFamily:'inherit'}}>
              {saving?'Saving…':'💾 Save'}
            </button>
            {!selectedMatch.published&&(
              <button onClick={handlePublish} disabled={publishing} style={{flex:1,padding:'13px',background:publishing?'#166534':'#22C55E',border:'none',borderRadius:9,color:'#060E1A',cursor:publishing?'wait':'pointer',fontSize:14,fontWeight:800,fontFamily:'inherit'}}>
                {publishing?'Publishing…':'🚀 Publish'}
              </button>
            )}
          </div>
        </>
      )}

      {!selectedMatchId&&matches.length>0&&(
        <div style={{textAlign:'center',padding:'40px 20px'}}>
          <div style={{fontSize:32,marginBottom:10}}>🏏</div>
          <div style={{color:'#475569',fontSize:14}}>Select a match above</div>
        </div>
      )}
    </div>
  )
}
