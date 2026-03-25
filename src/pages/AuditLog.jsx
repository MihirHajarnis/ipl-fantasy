import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { SlotBadge, PageHeader } from '../components/ui.jsx'
import { fetchAuditLog } from '../lib/api.js'

function diffStr(oldVal, newVal, label) {
  if (oldVal === null || oldVal === undefined) return null
  if (oldVal === newVal) return null
  const diff = (newVal||0) - (oldVal||0)
  return { label, old: oldVal, new: newVal, diff }
}

function DiffChip({ diff }) {
  const col = diff.diff > 0 ? '#22C55E' : diff.diff < 0 ? '#EF4444' : '#94A3B8'
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:'#060E1A', borderRadius:6, padding:'2px 8px', fontSize:11 }}>
      <span style={{ color:'#475569' }}>{diff.label}:</span>
      <span style={{ color:'#94A3B8', textDecoration:'line-through' }}>{diff.old}</span>
      <span style={{ color:'#64748B' }}>→</span>
      <span style={{ color:'white', fontWeight:700 }}>{diff.new}</span>
      {diff.diff !== 0 && (
        <span style={{ color:col, fontWeight:800 }}>({diff.diff > 0 ? '+' : ''}{diff.diff})</span>
      )}
    </span>
  )
}

export default function AuditLog() {
  const { matches } = useApp()
  const [selectedMatchId, setSelected] = useState('all')
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    const load = async () => {
      try {
        if (selectedMatchId === 'all') {
          const { fetchAllAuditLogs } = await import('../lib/api.js')
          const data = await fetchAllAuditLogs()
          setLogs(data)
        } else {
          const data = await fetchAuditLog(parseInt(selectedMatchId))
          setLogs(data)
        }
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [selectedMatchId])

  // Group logs by date
  const grouped = logs.reduce((acc, log) => {
    const date = new Date(log.entered_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })
    if (!acc[date]) acc[date] = []
    acc[date].push(log)
    return acc
  }, {})

  const actionConfig = {
    created: { col:'#22C55E', bg:'rgba(34,197,94,0.10)', lbl:'Created' },
    updated: { col:'#3B82F6', bg:'rgba(59,130,246,0.10)', lbl:'Edited'  },
    deleted: { col:'#EF4444', bg:'rgba(239,68,68,0.10)',  lbl:'Deleted' },
  }

  return (
    <div style={{ padding:16, fontFamily:"'Inter',system-ui,sans-serif" }}>
      <PageHeader title="🔍 Match Audit Log" subtitle="Full history of every score entry and edit — admin transparency" />

      {/* Match filter */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:18 }}>
        <button onClick={()=>setSelected('all')} style={{ padding:'6px 14px', borderRadius:7, border:`1px solid ${selectedMatchId==='all'?'#22C55E':'#1E293B'}`, background:selectedMatchId==='all'?'rgba(34,197,94,0.12)':'transparent', color:selectedMatchId==='all'?'#22C55E':'#64748B', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
          All Matches
        </button>
        {matches.map(m => (
          <button key={m.id} onClick={()=>setSelected(String(m.id))} style={{ padding:'6px 14px', borderRadius:7, border:`1px solid ${selectedMatchId===String(m.id)?'#22C55E':'#1E293B'}`, background:selectedMatchId===String(m.id)?'rgba(34,197,94,0.12)':'transparent', color:selectedMatchId===String(m.id)?'#22C55E':'#64748B', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:5 }}>
            {m.label}
            {m.published&&<span style={{width:6,height:6,borderRadius:'50%',background:'#22C55E',display:'inline-block'}}/>}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign:'center', padding:'40px 0', color:'#334155', fontSize:13 }}>Loading audit log…</div>
      )}

      {!loading && logs.length === 0 && (
        <div style={{ textAlign:'center', padding:'48px 20px' }}>
          <div style={{ fontSize:32, marginBottom:10 }}>📋</div>
          <div style={{ color:'#475569', fontSize:14, fontWeight:600 }}>No audit logs yet</div>
          <div style={{ color:'#334155', fontSize:13, marginTop:6 }}>Logs appear after scores are saved</div>
        </div>
      )}

      {/* Log groups */}
      {!loading && Object.entries(grouped).map(([date, dateLogs]) => (
        <div key={date} style={{ marginBottom:20 }}>
          <div style={{ color:'#334155', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10, paddingLeft:4 }}>
            {date}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {dateLogs.map(log => {
              const matchLabel = matches.find(m=>m.id===log.match_id)?.label || `Match ${log.match_id}`
              const ac = actionConfig[log.action] || actionConfig.updated
              const diffs = []
              if (log.action === 'updated') {
                const rd = diffStr(log.old_runs,  log.new_runs,  'R')
                const bd = diffStr(log.old_balls, log.new_balls, 'B')
                const fd = diffStr(log.old_fours, log.new_fours, '4s')
                const sd = diffStr(log.old_sixes, log.new_sixes, '6s')
                if(rd) diffs.push(rd); if(bd) diffs.push(bd); if(fd) diffs.push(fd); if(sd) diffs.push(sd)
              }

              return (
                <div key={log.id} style={{ background:'#0A111E', borderRadius:10, border:`1px solid ${ac.col}22`, padding:'12px 14px' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, flexWrap:'wrap', marginBottom: diffs.length > 0 ? 10 : 0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                      {/* Action badge */}
                      <span style={{ background:ac.bg, border:`1px solid ${ac.col}44`, color:ac.col, borderRadius:6, padding:'2px 9px', fontSize:11, fontWeight:700, flexShrink:0 }}>
                        {ac.lbl}
                      </span>
                      {/* Match label */}
                      <span style={{ color:'#64748B', fontSize:12, fontWeight:600 }}>{matchLabel}</span>
                      {/* Slot */}
                      {log.slot_id && log.slot_id !== 'ALL' && <SlotBadge slot={log.slot_id} />}
                      {/* What was set */}
                      {log.action === 'created' && log.new_runs != null && (
                        <span style={{ color:'#94A3B8', fontSize:12 }}>
                          {log.new_runs}r · {log.new_balls}b · {log.new_fours}×4 · {log.new_sixes}×6
                        </span>
                      )}
                      {log.action === 'deleted' && log.old_runs != null && (
                        <span style={{ color:'#EF4444', fontSize:12 }}>
                          Removed {log.old_runs} runs
                        </span>
                      )}
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ color:'#475569', fontSize:11 }}>
                        {new Date(log.entered_at).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
                      </div>
                      <div style={{ color:'#334155', fontSize:10 }}>{log.entered_by}</div>
                    </div>
                  </div>

                  {/* Diffs */}
                  {diffs.length > 0 && (
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      {diffs.map(d => <DiffChip key={d.label} diff={d} />)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
