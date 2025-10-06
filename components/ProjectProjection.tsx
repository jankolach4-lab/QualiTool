'use client'

import * as React from 'react'
import Holidays from 'date-holidays'
import { useMemo, useState } from 'react'
import { ProjectData } from '../lib/supabase'

interface ProjectProjectionProps {
  project: ProjectData;
}

// Bundesländer-Auswahl (Code → Label)
const STATES: { code: string; label: string }[] = [
  { code: '', label: 'Bundesweit' },
  { code: 'BW', label: 'Baden‑Württemberg' },
  { code: 'BY', label: 'Bayern' },
  { code: 'BE', label: 'Berlin' },
  { code: 'BB', label: 'Brandenburg' },
  { code: 'HB', label: 'Bremen' },
  { code: 'HH', label: 'Hamburg' },
  { code: 'HE', label: 'Hessen' },
  { code: 'MV', label: 'Mecklenburg‑Vorpommern' },
  { code: 'NI', label: 'Niedersachsen' },
  { code: 'NW', label: 'Nordrhein‑Westfalen' },
  { code: 'RP', label: 'Rheinland‑Pfalz' },
  { code: 'SL', label: 'Saarland' },
  { code: 'SN', label: 'Sachsen' },
  { code: 'ST', label: 'Sachsen‑Anhalt' },
  { code: 'SH', label: 'Schleswig‑Holstein' },
  { code: 'TH', label: 'Thüringen' },
]

export default function ProjectProjection({ project }: ProjectProjectionProps) {
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [manualTotalWE, setManualTotalWE] = useState<string>('')
  const [stateCode, setStateCode] = useState<string>('') // Bundesland-Code

  React.useEffect(() => {
    const datesKey = `proj_dates_${project.name}`
    const raw = typeof window !== 'undefined' ? localStorage.getItem(datesKey) : null
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        if (parsed.startDate) setStartDate(parsed.startDate)
        if (parsed.endDate) setEndDate(parsed.endDate)
      } catch {}
    }
    const weKey = `proj_total_we_${project.name}`
    const storedWE = typeof window !== 'undefined' ? localStorage.getItem(weKey) : null
    if (storedWE) setManualTotalWE(storedWE)

    const stKey = `proj_state_${project.name}`
    const storedState = typeof window !== 'undefined' ? localStorage.getItem(stKey) : null
    if (storedState !== null) setStateCode(storedState)
  }, [project.name])

  const persistDates = (s: string, e: string) => {
    const key = `proj_dates_${project.name}`
    localStorage.setItem(key, JSON.stringify({ startDate: s, endDate: e }))
  }

  const persistManualWE = (val: string) => {
    const weKey = `proj_total_we_${project.name}`
    if (val && Number(val) > 0) localStorage.setItem(weKey, val)
    else localStorage.removeItem(weKey)
  }

  const persistState = (code: string) => {
    const stKey = `proj_state_${project.name}`
    localStorage.setItem(stKey, code)
  }

  const handleStartChange = (v: string) => { setStartDate(v); persistDates(v, endDate) }
  const handleEndChange = (v: string) => { setEndDate(v); persistDates(startDate, v) }
  const handleManualWEChange = (v: string) => { setManualTotalWE(v); persistManualWE(v) }
  const handleStateChange = (v: string) => { setStateCode(v); persistState(v) }

  const effectiveTotalWE = useMemo(() => {
    const n = Number(manualTotalWE)
    return Number.isFinite(n) && n > 0 ? n : project.totalWE
  }, [manualTotalWE, project.totalWE])

  const { forecastInt, pct, workdaysElapsed, workdaysTotal, dailyRate } = useMemo(() => {
    // Holidays: bundesweit oder bundeslandspezifisch
    let hd: Holidays
    try {
      hd = stateCode ? new Holidays('DE', stateCode.toLowerCase()) : new Holidays('DE')
    } catch {
      hd = new Holidays('DE')
    }

    const parse = (s?: string) => (s ? new Date(s + 'T00:00:00') : undefined)
    const sDate = parse(startDate)
    const eDate = parse(endDate)
    const today = new Date(); today.setHours(0,0,0,0)

    const isWorkday = (d: Date) => {
      const day = d.getDay(); if (day === 0 || day === 6) return false
      // hd.isHoliday akzeptiert Date; wenn Region gesetzt ist, wird diese berücksichtigt
      return !hd.isHoliday(d)
    }

    const countWorkdays = (from: Date, to: Date) => {
      const d = new Date(from); let c = 0
      while (d <= to) { if (isWorkday(d)) c++; d.setDate(d.getDate()+1); d.setHours(0,0,0,0) }
      return c
    }

    const completionsSoFar = project.completions || 0

    let workdaysElapsed = 0, workdaysTotal = 0, dailyRate = 0, forecastInt = 0, pct = 0

    if (sDate && eDate && sDate <= eDate) {
      const endForElapsed = today < sDate ? sDate : (today < eDate ? today : eDate)
      workdaysElapsed = countWorkdays(sDate, endForElapsed)
      workdaysTotal = countWorkdays(sDate, eDate)

      dailyRate = workdaysElapsed > 0 ? (completionsSoFar / workdaysElapsed) : 0

      const remainingDays = Math.max(0, workdaysTotal - workdaysElapsed)
      const projected = completionsSoFar + dailyRate * remainingDays
      const capped = Math.min(projected, effectiveTotalWE)
      forecastInt = Math.round(capped)

      pct = effectiveTotalWE > 0 ? Math.round((forecastInt / effectiveTotalWE) * 10000) / 100 : 0
    }

    return { forecastInt, pct, workdaysElapsed, workdaysTotal, dailyRate }
  }, [startDate, endDate, project.completions, effectiveTotalWE, stateCode])

  return (
    <div className="section">
      <h2 className="section-title">
        <i className="fas fa-chart-line"></i>
        Projekt-Projektion: {project.name}
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--gray-500)' }}>Beginn</label>
          <input className="input" type="date" value={startDate} onChange={(e) => handleStartChange(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--gray-500)' }}>Ende</label>
          <input className="input" type="date" value={endDate} onChange={(e) => handleEndChange(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--gray-500)' }}>Gesamt‑WE (manuell)</label>
          <input className="input" type="number" min={0} step={1} placeholder={`${project.totalWE}`} value={manualTotalWE} onChange={(e) => handleManualWEChange(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--gray-500)' }}>Bundesland</label>
          <select className="select" value={stateCode} onChange={(e) => handleStateChange(e.target.value)}>
            {STATES.map(s => (
              <option key={s.code || 'DE'} value={s.code}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Kennzahl</th>
              <th>Wert</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Abschlüsse bisher</td>
              <td>{project.completions}</td>
            </tr>
            <tr>
              <td>Arbeitstage (vergangen / gesamt)</td>
              <td>{workdaysElapsed} / {workdaysTotal}</td>
            </tr>
            <tr>
              <td>Durchschnitt/Arbeitstag</td>
              <td>{dailyRate.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Prognose Abschlüsse bis Ende</td>
              <td><strong>{forecastInt}</strong> von {effectiveTotalWE.toLocaleString()}</td>
            </tr>
            <tr>
              <td>Prognose in % der WE</td>
              <td><strong>{pct.toFixed(2)}%</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: '0.5rem' }}>
        Grundlage: 5‑Tage‑Woche (Mo–Fr), Feiertage gemäß Auswahl (Bundesweit oder Bundesland).
      </p>
    </div>
  )
}
