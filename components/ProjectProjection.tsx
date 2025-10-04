'use client'

import * as React from 'react'
import Holidays from 'date-holidays'
import { useMemo, useState } from 'react'
import { ProjectData } from '../lib/supabase'

interface ProjectProjectionProps {
  project: ProjectData;
}

export default function ProjectProjection({ project }: ProjectProjectionProps) {
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  // load/save per project (localStorage), keyed by project.name
  React.useEffect(() => {
    const key = `proj_dates_${project.name}`
    const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        if (parsed.startDate) setStartDate(parsed.startDate)
        if (parsed.endDate) setEndDate(parsed.endDate)
      } catch {}
    }
  }, [project.name])

  const persistDates = (s: string, e: string) => {
    const key = `proj_dates_${project.name}`
    localStorage.setItem(key, JSON.stringify({ startDate: s, endDate: e }))
  }

  const handleStartChange = (v: string) => {
    setStartDate(v)
    persistDates(v, endDate)
  }
  const handleEndChange = (v: string) => {
    setEndDate(v)
    persistDates(startDate, v)
  }

  const { forecast, pct, workdaysElapsed, workdaysTotal, dailyRate } = useMemo(() => {
    const hd = new Holidays('DE') // bundesweite Feiertage

    const parse = (s?: string) => (s ? new Date(s + 'T00:00:00') : undefined)
    const sDate = parse(startDate)
    const eDate = parse(endDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const isWorkday = (d: Date) => {
      const day = d.getDay() // 0=So..6=Sa
      if (day === 0 || day === 6) return false
      const iso = d.toISOString().slice(0, 10)
      return !hd.isHoliday(new Date(iso)) // true wenn kein Feiertag
    }

    const countWorkdays = (from: Date, to: Date) => {
      const d = new Date(from)
      let c = 0
      while (d <= to) {
        if (isWorkday(d)) c++
        d.setDate(d.getDate() + 1)
      }
      return c
    }

    // Akkumulierte Abschlüsse bisher (aktueller Stand) aus project.completions
    const completionsSoFar = project.completions || 0

    let workdaysElapsed = 0
    let workdaysTotal = 0
    let dailyRate = 0
    let forecast = 0
    let pct = 0

    if (sDate && eDate && sDate <= eDate) {
      const endForElapsed = today < sDate ? sDate : (today < eDate ? today : eDate)
      workdaysElapsed = countWorkdays(sDate, endForElapsed)
      workdaysTotal = countWorkdays(sDate, eDate)

      if (workdaysElapsed > 0) {
        dailyRate = completionsSoFar / workdaysElapsed
      } else {
        dailyRate = 0
      }

      const remainingDays = Math.max(0, workdaysTotal - workdaysElapsed)
      const projected = completionsSoFar + dailyRate * remainingDays
      // Deckelung und Rundung auf 2 Nachkommastellen
      const capped = Math.min(projected, project.totalWE)
      forecast = Math.round(capped * 100) / 100

      pct = project.totalWE > 0 ? Math.round((forecast / project.totalWE) * 10000) / 100 : 0
    }

    return { forecast, pct, workdaysElapsed, workdaysTotal, dailyRate }
  }, [startDate, endDate, project])

  return (
    <div className="section">
      <h2 className="section-title">
        <i className="fas fa-chart-line"></i>
        Projekt-Projektion: {project.name}
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--gray-500)' }}>Beginn</label>
          <input className="input" type="date" value={startDate} onChange={(e) => handleStartChange(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--gray-500)' }}>Ende</label>
          <input className="input" type="date" value={endDate} onChange={(e) => handleEndChange(e.target.value)} />
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
              <td><span className="badge badge-primary">{project.completions}</span></td>
            </tr>
            <tr>
              <td>Arbeitstage (vergangen / gesamt)</td>
              <td>
                <span className="badge badge-success">{workdaysElapsed}</span> / {workdaysTotal}
              </td>
            </tr>
            <tr>
              <td>Durchschnitt/Arbeitstag</td>
              <td>{dailyRate.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Prognose Abschlüsse bis Ende</td>
              <td><strong>{forecast.toFixed(2)}</strong> von {project.totalWE.toLocaleString()}</td>
            </tr>
            <tr>
              <td>Prognose in % der WE</td>
              <td><strong>{pct.toFixed(2)}%</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: '0.75rem' }}>
        Grundlage: 5‑Tage‑Woche (Mo–Fr), bundesweite Feiertage. Prognose basiert auf Durchschnitt seit Projektbeginn.
      </p>
    </div>
  )
}
