import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { SlotBadge, Avatar } from '../components/ui.jsx'
import { fetchAllMatchScores, fetchExportData } from '../lib/api.js'

// ── Utility ───────────────────────────────────────────────────
function calcStreaks(slotHistory) {
  // Returns { current: n, type: 'fire'|'duck', best: n }
  if (!slotHistory.length) return null
  let current = 1, type = null, best = 0
  const runs = slotHistory.map(h => h.runs)
  // Current streak from end
  const last = runs[runs.length - 1]
  type = last >= 30 ? 'fire' : last === 0 ? 'duck' : null
  if (type) {
    for (let i = runs.length - 2; i >= 0; i--) {
      const qualifies = type === 'fire' ? runs[i] >= 30 : runs[i] === 0
      if (qualifies) current++
      else break
    }
  }
  // Best single match
  best = Math.max(...runs)
  return { current: type ? current : 0, type, best, avg: Math.round(runs.reduce((a,b)=>a+b,0)/runs.length) }
}

// ── Match Summary Card ────────────────────────────────────────
function MatchSummaryCard({ match, matchScores, participants, draftMap, prevLeaderboard, currentLeaderboard }) {
  const scores = matchScores.filter(s => s.match_id === match.id)
  if (scores.length === 0) return null

  // Top performer this match
  const topScore  = scores.reduce((best, s) => s.runs > (best?.runs||0) ? s : best, null)
  const topSlot   = topScore?.slot_id
  const topOwner  = topSlot ? participants.find(p => p.id === draftMap[topSlot]) : null

  // Match winner = participant with most runs this match
  const partRunsMap = {}
  scores.forEach(s => {
    const pid = draftMap[s.slot_id]
    if (pid) partRunsMap[pid] = (partRunsMap[pid] || 0) + s.runs
  })
  const matchWinnerId  = Object.entries(partRunsMap).sort((a,b)=>b[1]-a[1])[0]?.[0]
  const matchWinner    = participants.find(p => p.id === parseInt(matchWinnerId))
  const matchWinnerRuns = partRunsMap[matchWinnerId] || 0

  // Biggest rank gain
  let biggestGain = null, biggestGainVal = 0
  if (prevLeaderboard && currentLeaderboard) {
    currentLeaderboard.forEach(p => {
      const prev = prevLeaderboard[p.id]
      if (prev && prev - p.rank > biggestGainVal) {
        biggestGainVal = prev - p.rank
        biggestGain = p
      }
    })
  }

  return (
    <div style={{ background:'#0A111E', borderRadius:14, border:'1px solid #0F1E35', overflow:'hidden', marginBottom:16 }}>
      {/* Header */}
      <div style={{ padding:'14px 16px', background:'linear-gradient(90deg,rgba(34,197,94,0.08),transparent)', borderBottom:'1px solid #0F1E35', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ color:'white', fontWeight:800, fontSize:15 }}>{match.label}</div>
          {match.home_team && <div style={{ color:'#64748B', fontSize:12, marginTop:2 }}>{match.home_team} vs {match.away_team}</div>}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          {match.published && <span style={{ background:'rgba(34,197,94,0.12)', border:'1px solid rgba(34,197,94,0.3)', color:'#22C55E', padding:'3px 10px', borderRadius:6, fontSize:11, fontWeight:700 }}>✓ Published</span>}
        </div>
      </div>

      {/* Highlights */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:1 }}>
        {/* Top performer */}
        <div style={{ padding:'14px 16px', borderRight:'1px solid #0F1E35', textAlign:'center' }}>
          <div style={{ color:'#F59E0B', fontSize:20, marginBottom:4 }}>🏆</div>
          <div style={{ color:'#F59E0B', fontSize:10, fontWeight:700, textTransform:'uppercase', marginBottom:6 }}>Top Slot</div>
          {topSlot ? (
            <>
              <SlotBadge slot={topSlot} />
              <div style={{ color:'#22C55E', fontSize:18, fontWeight:800, marginTop:6 }}>{topScore?.runs} runs</div>
              {topOwner && <div style={{ color:'#64748B', fontSize:11, marginTop:3 }}>owned by {topOwner.name}</div>}
            </>
          ) : <div style={{ color:'#334155', fontSize:12 }}>—</div>}
        </div>

        {/* Match winner */}
        <div style={{ padding:'14px 16px', borderRight:'1px solid #0F1E35', textAlign:'center' }}>
          <div style={{ fontSize:20, marginBottom:4 }}>🥇</div>
          <div style={{ color:'#64748B', fontSize:10, fontWeight:700, textTransform:'uppercase', marginBottom:6 }}>Match Winner</div>
          {matchWinner ? (
            <>
              <Avatar name={matchWinner.name} color={matchWinner.color} size={28} />
              <div style={{ color:'white', fontWeight:700, fontSize:13, marginTop:6 }}>{matchWinner.name}</div>
              <div style={{ color:'#22C55E', fontSize:15, fontWeight:800 }}>{matchWinnerRuns} runs</div>
            </>
          ) : <div style={{ color:'#334155', fontSize:12 }}>—</div>}
        </div>

        {/* Biggest rank gain */}
        <div style={{ padding:'14px 16px', textAlign:'center' }}>
          <div style={{ fontSize:20, marginBottom:4 }}>🚀</div>
          <div style={{ color:'#64748B', fontSize:10, fontWeight:700, textTransform:'uppercase', marginBottom:6 }}>Biggest Rise</div>
          {biggestGain ? (
            <>
              <Avatar name={biggestGain.name} color={biggestGain.color} size={28} />
              <div style={{ color:'white', fontWeight:700, fontSize:13, marginTop:6 }}>{biggestGain.name}</div>
              <div style={{ color:'#22C55E', fontSize:15, fontWeight:800 }}>▲ +{biggestGainVal} rank</div>
            </>
          ) : <div style={{ color:'#334155', fontSize:12 }}>No data</div>}
        </div>
      </div>

      {/* All scores this match */}
      <div style={{ padding:'12px 16px', borderTop:'1px solid #0F1E35' }}>
        <div style={{ color:'#334155', fontSize:10, fontWeight:700, textTransform:'uppercase', marginBottom:8 }}>All Scores This Match</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          {scores.sort((a,b)=>b.runs-a.runs).map(s => (
            <div key={s.slot_id} style={{ display:'flex', alignItems:'center', gap:6, background:'#060E1A', borderRadius:7, padding:'5px 10px' }}>
              <SlotBadge slot={s.slot_id} />
              <span style={{ color: s.runs >= 50 ? '#22C55E' : s.runs >= 30 ? '#F59E0B' : s.runs === 0 ? '#EF4444' : '#94A3B8', fontWeight:700, fontSize:13 }}>{s.runs}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Weekly Awards ─────────────────────────────────────────────
function WeeklyAwards({ allScores, participants, draftMap, matches }) {
  const last3 = matches.filter(m=>m.published).slice(-3).map(m=>m.id)

  // Form player — highest total runs in last 3 matches per slot
  const slotRecent = {}
  allScores.filter(s=>last3.includes(s.match_id)).forEach(s => {
    slotRecent[s.slot_id] = (slotRecent[s.slot_id]||0) + s.runs
  })
  const formSlot   = Object.entries(slotRecent).sort((a,b)=>b[1]-a[1])[0]
  const formOwner  = formSlot ? participants.find(p=>p.id===draftMap[formSlot[0]]) : null

  // Flop — lowest total in last 3 (min 1 match played)
  const flopSlot   = Object.entries(slotRecent).filter(([_,r])=>r>=0).sort((a,b)=>a[1]-b[1])[0]
  const flopOwner  = flopSlot ? participants.find(p=>p.id===draftMap[flopSlot[0]]) : null

  // Underdog rise — participant with most rank improvement over last 3 matches
  // (simplified: participant with highest runs in last 3)
  const partLast3 = {}
  allScores.filter(s=>last3.includes(s.match_id)).forEach(s => {
    const pid = draftMap[s.slot_id]
    if (pid) partLast3[pid] = (partLast3[pid]||0) + s.runs
  })
  const underdogId   = Object.entries(partLast3).sort((a,b)=>b[1]-a[1])[1]?.[0] // #2 not #1
  const underdog     = underdogId ? participants.find(p=>p.id===parseInt(underdogId)) : null

  const awards = [
    { icon:'🔥', title:'Form Player', sub:'Highest runs — last 3 matches', slot: formSlot?.[0], owner:formOwner, val:`${formSlot?.[1]||0} runs`, col:'#F59E0B' },
    { icon:'💀', title:'Flop of the Week', sub:'Lowest runs — last 3 matches', slot: flopSlot?.[0], owner:flopOwner, val:`${flopSlot?.[1]||0} runs`, col:'#EF4444' },
    { icon:'🚀', title:'Underdog Rise', sub:'Top performer outside #1', owner:underdog, val:`${partLast3[underdogId]||0} runs`, col:'#3B82F6' },
  ]

  return (
    <div style={{ background:'#0A111E', borderRadius:14, border:'1px solid #0F1E35', padding:16, marginBottom:16 }}>
      <div style={{ color:'white', fontWeight:800, fontSize:15, marginBottom:14 }}>🏅 Weekly Awards</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10 }}>
        {awards.map(a => (
          <div key={a.title} style={{ background:'#060E1A', borderRadius:10, padding:'14px 14px', border:`1px solid ${a.col}22` }}>
            <div style={{ fontSize:22, marginBottom:6 }}>{a.icon}</div>
            <div style={{ color:a.col, fontWeight:700, fontSize:12, marginBottom:2 }}>{a.title}</div>
            <div style={{ color:'#334155', fontSize:10, marginBottom:8 }}>{a.sub}</div>
            {a.slot && <div style={{ marginBottom:4 }}><SlotBadge slot={a.slot}/></div>}
            {a.owner && <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}><Avatar name={a.owner.name} color={a.owner.color} size={18}/><span style={{color:'#94A3B8',fontSize:11}}>{a.owner.name}</span></div>}
            <div style={{ color:'white', fontWeight:800, fontSize:14 }}>{a.val}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Streaks ───────────────────────────────────────────────────
function StreaksView({ allScores, participants, draftMap, slotTotals }) {
  const slotHistories = {}
  allScores.forEach(s => {
    if (!slotHistories[s.slot_id]) slotHistories[s.slot_id] = []
    slotHistories[s.slot_id].push({ runs: s.runs, matchId: s.match_id })
  })

  const activeStreaks = []
  Object.entries(slotHistories).forEach(([slot, hist]) => {
    const streak = calcStreaks(hist)
    if (streak && streak.current >= 2) activeStreaks.push({ slot, ...streak })
  })
  activeStreaks.sort((a,b) => b.current - a.current)

  return (
    <div style={{ background:'#0A111E', borderRadius:14, border:'1px solid #0F1E35', padding:16, marginBottom:16 }}>
      <div style={{ color:'white', fontWeight:800, fontSize:15, marginBottom:4 }}>🔥 Active Streaks</div>
      <div style={{ color:'#64748B', fontSize:12, marginBottom:14 }}>Slots on a run (≥30 runs) or cold spell (ducks)</div>
      {activeStreaks.length === 0 ? (
        <div style={{ color:'#334155', fontSize:13, textAlign:'center', padding:'16px 0' }}>No streaks yet — need more match data</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {activeStreaks.slice(0, 10).map(s => {
            const owner = participants.find(p=>p.id===draftMap[s.slot])
            const isFire = s.type === 'fire'
            return (
              <div key={s.slot} style={{ display:'flex', alignItems:'center', gap:12, background:'#060E1A', borderRadius:9, padding:'10px 14px' }}>
                <span style={{ fontSize:20 }}>{isFire ? '🔥' : '🥶'}</span>
                <SlotBadge slot={s.slot} />
                <div style={{ flex:1 }}>
                  <div style={{ color:isFire?'#F59E0B':'#3B82F6', fontWeight:700, fontSize:13 }}>
                    {s.current} {isFire ? `match${s.current>1?'es':''} above 30` : `duck${s.current>1?'s':''} in a row`}
                  </div>
                  {owner && <div style={{ color:'#475569', fontSize:11 }}>owned by {owner.name}</div>}
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ color:'#94A3B8', fontSize:11 }}>Best: {s.best}</div>
                  <div style={{ color:'#64748B', fontSize:11 }}>Avg: {s.avg}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Export button ─────────────────────────────────────────────
function ExportSection({ toast }) {
  const [exporting, setExporting] = useState(false)

  const handleExport = async (format) => {
    setExporting(true)
    try {
      const data = await fetchExportData()
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' })
        download(blob, 'ipl-fantasy-export.json')
      } else {
        // CSV — export leaderboard as the main sheet
        const rows = [
          ['Rank','Name','Total Runs'],
          ...data.leaderboard.map(p => [p.rank, p.name, p.total_runs])
        ]
        const csv = rows.map(r => r.join(',')).join('\n')
        const blob = new Blob([csv], { type:'text/csv' })
        download(blob, 'ipl-fantasy-leaderboard.csv')
      }
      toast(`Exported as ${format.toUpperCase()} ✓`)
    } catch (e) { toast('Export failed: ' + e.message, 'error') }
    finally { setExporting(false) }
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob)
    const a   = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ background:'#0A111E', borderRadius:14, border:'1px solid #0F1E35', padding:16, marginBottom:16 }}>
      <div style={{ color:'white', fontWeight:800, fontSize:15, marginBottom:4 }}>💾 Export Data</div>
      <div style={{ color:'#64748B', fontSize:12, marginBottom:14 }}>Download full tournament data for backup or analysis</div>
      <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
        {[['JSON','Full data — matches, scores, participants','#22C55E'],['CSV','Leaderboard only — simple spreadsheet','#3B82F6']].map(([fmt,desc,col])=>(
          <button key={fmt} onClick={()=>handleExport(fmt.toLowerCase())} disabled={exporting} style={{ padding:'11px 20px', background:`${col}15`, border:`1px solid ${col}44`, borderRadius:9, color:col, cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit', flex:1, minWidth:140 }}>
            <div>⬇ Export {fmt}</div>
            <div style={{ color:`${col}88`, fontSize:10, fontWeight:500, marginTop:2 }}>{desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function MatchCenter() {
  const { matches, participants, draftMap, slotTotals, leaderboard, toast } = useApp()
  const [allScores,   setAllScores]   = useState([])
  const [activeTab,   setActiveTab]   = useState('summary')
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    fetchAllMatchScores().then(s => { setAllScores(s); setLoading(false) }).catch(()=>setLoading(false))
  }, [matches])

  const published = matches.filter(m=>m.published)

  const tabs = [
    { id:'summary', label:'📋 Match Summaries' },
    { id:'awards',  label:'🏅 Awards'          },
    { id:'streaks', label:'🔥 Streaks'          },
    { id:'export',  label:'💾 Export'           },
  ]

  return (
    <div style={{ padding:16, fontFamily:"'Inter',system-ui,sans-serif" }}>
      <div style={{ marginBottom:16 }}>
        <h1 style={{ color:'white', fontSize:20, fontWeight:800, marginBottom:3 }}>🏟 Match Centre</h1>
        <p style={{ color:'#64748B', fontSize:13 }}>Summaries · awards · streaks · data export</p>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:18, overflowX:'auto', paddingBottom:4 }}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{ padding:'8px 14px', borderRadius:8, border:`1px solid ${activeTab===t.id?'#22C55E':'#1E293B'}`, background:activeTab===t.id?'rgba(34,197,94,0.12)':'transparent', color:activeTab===t.id?'#22C55E':'#64748B', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign:'center', padding:'40px 0', color:'#334155' }}>Loading…</div>}

      {!loading && activeTab === 'summary' && (
        <>
          {published.length === 0 && <div style={{ textAlign:'center', padding:'48px 20px' }}><div style={{fontSize:32,marginBottom:10}}>📅</div><div style={{color:'#475569',fontSize:14}}>No published matches yet</div></div>}
          {[...published].reverse().map(m => (
            <MatchSummaryCard key={m.id} match={m} matchScores={allScores} participants={participants} draftMap={draftMap} prevLeaderboard={m.rank_snapshot||{}} currentLeaderboard={leaderboard} />
          ))}
        </>
      )}

      {!loading && activeTab === 'awards' && (
        <WeeklyAwards allScores={allScores} participants={participants} draftMap={draftMap} matches={matches} />
      )}

      {!loading && activeTab === 'streaks' && (
        <StreaksView allScores={allScores} participants={participants} draftMap={draftMap} slotTotals={slotTotals} />
      )}

      {activeTab === 'export' && <ExportSection toast={toast} />}
    </div>
  )
}
