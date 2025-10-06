'use client'

import * as React from 'react'
import Holidays from 'date-holidays'
import { useMemo, useState } from 'react'
import { ProjectData, supabase } from '../lib/supabase'

interface ProjectProjectionProps { project: ProjectData }

export default function ProjectProjection({ project }: ProjectProjectionProps) {
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [manualTotalWE, setManualTotalWE] = useState<string>('')
  const [stateCode, setStateCode] = useState<string>('')

  React.useEffect(() => {
    const datesKey = `proj_dates_${project.name}`
    const raw = typeof window !== 'undefined' ? localStorage.getItem(datesKey) : null
    if (raw) { try { const parsed = JSON.parse(raw); if (parsed.startDate) setStartDate(parsed.startDate); if (parsed.endDate) setEndDate(parsed.endDate) } catch {} }
    else { const s = localStorage.getItem(`proj_start_${project.name}`); const e = localStorage.getItem(`proj_end_${project.name}`); if (s) setStartDate(s); if (e) setEndDate(e) }
    const weKey = `proj_total_we_${project.name}`
    const storedWE = typeof window !== 'undefined' ? localStorage.getItem(weKey) : null
    if (storedWE) setManualTotalWE(storedWE)
    const stKey = `proj_state_${project.name}`
    const storedState = typeof window !== 'undefined' ? localStorage.getItem(stKey) : null
    if (storedState !== null) setStateCode(storedState)
  }, [project.name])

  const upsertSettings = async (s: string, e: string, weStr: string, state: string) => {
    try {
      const total = weStr ? Number(weStr) : null
      const payload: any = { project_name: project.name, start_date: s || null, end_date: e || null, total_we: total && total > 0 ? total : null, state_code: state || null }
      const { error } = await supabase.from('project_settings').upsert(payload, { onConflict: 'project_name' })
      if (error) console.warn('project_settings upsert error', error.message)
    } catch (err) {
      console.warn('project_settings upsert failed', (err as Error).message)
    }
  }

  const persistDates = (s: string, e: string) => {
    const key = `proj_dates_${project.name}`
    localStorage.setItem(key, JSON.stringify({ startDate: s, endDate: e }))
    localStorage.setItem(`proj_start_${project.name}`, s || '')
    localStorage.setItem(`proj_end_${project.name}`, e || '')
    upsertSettings(s, e, manualTotalWE, stateCode)
  }
  const persistManualWE = (val: string) => {
    const weKey = `proj_total_we_${project.name}`
    if (val && Number(val) > 0) localStorage.setItem(weKey, val)
    else localStorage.removeItem(weKey)
    upsertSettings(startDate, endDate, val, stateCode)
  }
  const persistState = (code: string) => {
    const stKey = `proj_state_${project.name}`
    localStorage.setItem(stKey, code)
    upsertSettings(startDate, endDate, manualTotalWE, code)
  }

  const handleStartChange = (v: string) => { setStartDate(v); persistDates(v, endDate) }
  const handleEndChange = (v: string) => { setEndDate(v); persistDates(startDate, v) }
  const handleManualWEChange = (v: string) => { setManualTotalWE(v); persistManualWE(v) }
  const handleStateChange = (v: string) => { setStateCode(v); persistState(v) }

  const effectiveTotalWE = useMemo(() => { const n = Number(manualTotalWE); return Number.isFinite(n) && n > 0 ? n : project.totalWE }, [manualTotalWE, project.totalWE])

  const { forecastInt, pct, workdaysElapsed, workdaysTotal, dailyRate } = useMemo(() => {
    let hd: Holidays; try { hd = stateCode ? new Holidays('DE', stateCode.toLowerCase()) : new Holidays('DE') } catch { hd = new Holidays('DE') }
    const parse = (s?: string) => (s ? new Date(s + 'T00:00:00') : undefined)
    const sDate = parse(startDate); const eDate = parse(endDate)
    const today = new Date(); today.setHours(0,0,0,0)
    const isWorkday = (d: Date) => { const day=d.getDay(); if(day===0||day===6) return false; return !hd.isHoliday(d) }
    const countWorkdays = (from: Date, to: Date) => { const d=new Date(from); let c=0; while(d<=to){ if(isWorkday(d)) c++; d.setDate(d.getDate()+1); d.setHours(0,0,0,0) } return c }
    const completionsSoFar = project.completions || 0
    let workdaysElapsed=0, workdaysTotal=0, dailyRate=0, forecastInt=0, pct=0
    if(sDate && eDate && sDate <= eDate){ const endForElapsed = today < sDate ? sDate : (today < eDate ? today : eDate); workdaysElapsed = countWorkdays(sDate, endForElapsed); workdaysTotal = countWorkdays(sDate, eDate); dailyRate = workdaysElapsed>0 ? (completionsSoFar/workdaysElapsed) : 0; const remaining = Math.max(0, workdaysTotal - workdaysElapsed); const projected = completionsSoFar + dailyRate*remaining; const capped = Math.min(projected, effectiveTotalWE); forecastInt = Math.round(capped); pct = effectiveTotalWE>0 ? Math.round((forecastInt/effectiveTotalWE)*10000)/100 : 0 }
    return { forecastInt, pct, workdaysElapsed, workdaysTotal, dailyRate }
  }, [startDate, endDate, project.completions, effectiveTotalWE, stateCode])

  return (
    <div className="section">
      <h2 className="section-title"><i className="fas fa-chart-line"></i>Projekt-Projektion: {project.name}</h2>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'0.75rem', marginBottom:'0.75rem' }}>
        <div><label style={{ fontSize:12, color:'var(--gray-500)' }}>Beginn</label><input className="input" type="date" value={startDate} onChange={(e)=>handleStartChange(e.target.value)} /></div>
        <div><label style={{ fontSize:12, color:'var(--gray-500)' }}>Ende</label><input className="input" type="date" value={endDate} onChange={(e)=>handleEndChange(e.target.value)} /></div>
        <div><label style={{ fontSize:12, color:'var(--gray-500)' }}>Gesamt‑WE (manuell)</label><input className="input" type="number" min={0} step={1} placeholder={`${project.totalWE}`} value={manualTotalWE} onChange={(e)=>handleManualWEChange(e.target.value)} /></div>
        <div><label style={{ fontSize:12, color:'var(--gray-500)' }}>Bundesland</label><select className="select" value={stateCode} onChange={(e)=>handleStateChange(e.target.value)}>
          <option value="">Bundesweit</option>
          <option value="BW">Baden‑Württemberg</option>
          <option value="BY">Bayern</option>
          <option value="BE">Berlin</option>
          <option value="BB">Brandenburg</option>
          <option value="HB">Bremen</option>
          <option value="HH">Hamburg</option>
          <option value="HE">Hessen</option>
          <option value="MV">Mecklenburg‑Vorpommern</option>
          <option value="NI">Niedersachsen</option>
          <option value="NW">Nordrhein‑Westfalen</option>
          <option value="RP">Rheinland‑Pfalz</option>
          <option value="SL">Saarland</option>
          <option value="SN">Sachsen</option>
          <option value="ST">Sachsen‑Anhalt</option>
          <option value="SH">Schleswig‑Holstein</option>
          <option value="TH">Thüringen</option>
        </select></div>
      </div>
      <div className="table-container"><table><thead><tr><th>Kennzahl</th><th>Wert</th></tr></thead><tbody>
        <tr><td>Abschlüsse bisher</td><td>{project.completions}</td></tr>
        <tr><td>Arbeitstage (vergangen / gesamt)</td><td>{workdaysElapsed} / {workdaysTotal}</td></tr>
        <tr><td>Durchschnitt/Arbeitstag</td><td>{dailyRate.toFixed(2)}</td></tr>
        <tr><td>Prognose Abschlüsse bis Ende</td><td><strong>{forecastInt}</strong> von {effectiveTotalWE.toLocaleString()}</td></tr>
        <tr><td>Prognose in % der WE</td><td><strong>{pct.toFixed(2)}%</strong></td></tr>
      </tbody></table></div>
      <p style={{ fontSize:12, color:'var(--gray-500)', marginTop:'0.5rem' }}>Grundlage: 5‑Tage‑Woche (Mo–Fr), Feiertage gemäß Auswahl (Bundesweit oder Bundesland).</p>
    </div>
  )
}
