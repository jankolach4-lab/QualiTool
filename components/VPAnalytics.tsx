'use client'

import * as React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { VPData, VPProjectSlice } from '../lib/supabase'
import { colorForStatus } from '../lib/colors'

interface VPAnalyticsProps {
  vp: VPData;
  projectName: string;
  projectTotalWE: number;
  timeRangeDays: number;
}

export default function VPAnalytics({ vp, projectName, projectTotalWE, timeRangeDays }: VPAnalyticsProps) {
  const dailyCompletionsRef = useRef<HTMLCanvasElement>(null)
  const dailyChangesRef = useRef<HTMLCanvasElement>(null)
  const statusBreakdownRef = useRef<HTMLCanvasElement>(null)
  const hourlyActivityRef = useRef<HTMLCanvasElement>(null)
  const chartsRef = useRef<any[]>([])

  const slice: VPProjectSlice = useMemo(() => vp.perProject?.[projectName] || {
    totalWE: 0, completions: 0, statusCounts: {}, dailyStats: {}, hourlyStats: {}, totalStatusChanges: 0, weWithStatus: 0, events: []
  }, [vp, projectName])

  const [selectedDay, setSelectedDay] = useState<string>('')

  const availableDates = useMemo(() => {
    const dates = new Set<string>()
    Object.keys(slice.dailyStats || {}).forEach(d => dates.add(d))
    return Array.from(dates).sort()
  }, [slice])

  useEffect(() => {
    if (!selectedDay) {
      const latest = availableDates[availableDates.length - 1]
      if (latest) setSelectedDay(latest)
    } else if (!availableDates.includes(selectedDay)) {
      const latest = availableDates[availableDates.length - 1]
      setSelectedDay(latest || '')
    }
  }, [availableDates, selectedDay])

  useEffect(() => {
    chartsRef.current.forEach(chart => chart?.destroy())
    chartsRef.current = []

    if (typeof window !== 'undefined' && (window as any).Chart) {
      createCharts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slice, timeRangeDays, selectedDay])

  const createCharts = () => {
    const Chart = (window as any).Chart

    // Reihe 1: zwei Kacheln (280px)
    if (dailyCompletionsRef.current) {
      const dailyData = prepareDailyCompletionsData()
      const chart = new Chart(dailyCompletionsRef.current, {
        type: 'bar',
        data: { labels: dailyData.labels, datasets: [{ label: 'Tägliche Abschlüsse', data: dailyData.completions, backgroundColor: 'rgba(16, 185, 129, 0.8)', borderColor: 'rgba(16, 185, 129, 1)', borderWidth: 1 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: `Tägliche Abschlüsse (letzte ${timeRangeDays} Tage)` }, legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
      })
      chartsRef.current.push(chart)
    }

    if (dailyChangesRef.current) {
      const dailyData = prepareDailyStatusChangesData()
      const chart = new Chart(dailyChangesRef.current, {
        type: 'bar',
        data: { labels: dailyData.labels, datasets: [{ label: 'Tägliche Statusänderungen', data: dailyData.statusChanges, backgroundColor: 'rgba(37, 99, 235, 0.8)', borderColor: 'rgba(37, 99, 235, 1)', borderWidth: 1 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: `Tägliche Statusänderungen (letzte ${timeRangeDays} Tage)` }, legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
      })
      chartsRef.current.push(chart)
    }

    // Reihe 2: drei Kacheln nebeneinander (360px)
    if (statusBreakdownRef.current) {
      const statusData = prepareStatusBreakdownData()
      const colors = statusData.labels.map(l => colorForStatus(String(l)))
      const chart = new Chart(statusBreakdownRef.current, {
        type: 'pie',
        data: { labels: statusData.labels, datasets: [{ data: statusData.values, backgroundColor: colors, borderWidth: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Status-Breakdown' }, legend: { position: 'bottom', labels: { boxWidth: 10 } } } }
      })
      chartsRef.current.push(chart)
    }

    if (hourlyActivityRef.current) {
      const hourlyData = prepareHourlyActivityData()
      const titleDay = selectedDay ? selectedDay : 'Tag wählen'
      const chart = new Chart(hourlyActivityRef.current, {
        type: 'bar',
        data: { labels: Array.from({ length: 24 }, (_, i) => `${i}:00`), datasets: [{ label: 'Aktivität pro Stunde', data: hourlyData, backgroundColor: 'rgba(99, 102, 241, 0.8)', borderColor: 'rgba(99, 102, 241, 1)', borderWidth: 1 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: `Stündliche Aktivität – ${titleDay}` }, legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
      })
      chartsRef.current.push(chart)
    }
  }

  const isWithinRange = (dateStr: string) => {
    const date = new Date(dateStr)
    const cutoff = new Date(); cutoff.setHours(0,0,0,0); cutoff.setDate(cutoff.getDate() - (timeRangeDays - 1))
    return date >= cutoff
  }

  const prepareDailyCompletionsData = () => {
    const dailyStats = slice.dailyStats || {}
    const sortedDates = Object.keys(dailyStats).sort().filter(isWithinRange)
    return { labels: sortedDates.map(date => { const d = new Date(date); return `${d.getDate()}.${d.getMonth() + 1}` }), completions: sortedDates.map(date => dailyStats[date]?.completions || 0) }
  }

  const prepareDailyStatusChangesData = () => {
    const dailyStats = slice.dailyStats || {}
    const sortedDates = Object.keys(dailyStats).sort().filter(isWithinRange)
    return { labels: sortedDates.map(date => { const d = new Date(date); return `${d.getDate()}.${d.getMonth() + 1}` }), statusChanges: sortedDates.map(date => dailyStats[date]?.statusChanges || 0) }
  }

  const prepareStatusBreakdownData = () => {
    const statusCounts = slice.statusCounts || {}
    const labels = Object.keys(statusCounts)
    const values = Object.values(statusCounts)
    return { labels, values }
  }

  const prepareHourlyActivityData = () => {
    const counts = new Array(24).fill(0)
    if (slice.events && Array.isArray(slice.events) && slice.events.length > 0) {
      const day = selectedDay
      slice.events.forEach(ev => {
        if (!day || ev.dateKey === day) {
          const h = Math.max(0, Math.min(23, ev.hour || 0))
          counts[h] += 1
        }
      })
    } else if (slice.hourlyStats) {
      for (let h = 0; h < 24; h++) counts[h] = slice.hourlyStats[h] || 0
    }
    return counts
  }

  const totalWE = slice.totalWE || 0
  const weWithStatus = slice.weWithStatus || 0
  const weWithoutStatus = totalWE - weWithStatus

  const shareWEProject = projectTotalWE > 0 ? Math.round((totalWE / projectTotalWE) * 10000) / 100 : 0
  const shareCompletionsProject = projectTotalWE > 0 ? Math.round((slice.completions / projectTotalWE) * 10000) / 100 : 0

  return (
    <div className="section">
      <h2 className="section-title">
        <i className="fas fa-user-chart"></i>
        VP Analytics: {vp.name} – {projectName}
      </h2>

      <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <label style={{ fontSize: 12, color: 'var(--gray-500)' }}>Tag für stündliche Aktivität:</label>
        <input className="input" type="date" value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} />
      </div>

      {/* Reihe 1: zwei Kacheln nebeneinander (280px) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ background: 'white', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--gray-200)', height: 280 }}>
          <canvas ref={dailyCompletionsRef} style={{ width: '100%', height: '100%' }} />
        </div>
        <div style={{ background: 'white', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--gray-200)', height: 280 }}>
          <canvas ref={dailyChangesRef} style={{ width: '100%', height: '100%' }} />
        </div>
      </div>

      {/* Reihe 2: Status-Pie + Stunden + Summary nebeneinander (360px) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ background: 'white', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--gray-200)', height: 360 }}>
          <canvas ref={statusBreakdownRef} style={{ width: '100%', height: '100%' }} />
        </div>
        <div style={{ background: 'white', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--gray-200)', height: 360 }}>
          <canvas ref={hourlyActivityRef} style={{ width: '100%', height: '100%' }} />
        </div>
        <div style={{ background: 'white', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--gray-200)', height: 360 }}>
          <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem', fontWeight: 600 }}>📋 Zusammenfassung</h3>
          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Kennzahl</th>
                  <th>Wert</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>WE gesamt (VP im Projekt)</td><td>{totalWE}</td></tr>
                <tr><td>Anteil WE am Projekt</td><td><strong>{shareWEProject.toFixed(2)}%</strong> (von {projectTotalWE.toLocaleString()})</td></tr>
                <tr><td>Abschlüsse (aktuell)</td><td><strong>{slice.completions}</strong></td></tr>
                <tr><td>Anteil Abschlüsse am Projekt</td><td><strong>{shareCompletionsProject.toFixed(2)}%</strong></td></tr>
                <tr><td>WE mit Status</td><td>{weWithStatus}</td></tr>
                <tr><td>Statusänderungen (gesamt)</td><td><strong>{slice.totalStatusChanges}</strong></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
