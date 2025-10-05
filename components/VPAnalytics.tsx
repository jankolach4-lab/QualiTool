'use client'

import * as React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { VPData } from '../lib/supabase'

interface VPAnalyticsProps {
  vp: VPData;
  timeRangeDays: number;
}

export default function VPAnalytics({ vp, timeRangeDays }: VPAnalyticsProps) {
  const dailyCompletionsRef = useRef<HTMLCanvasElement>(null)
  const dailyChangesRef = useRef<HTMLCanvasElement>(null)
  const statusBreakdownRef = useRef<HTMLCanvasElement>(null)
  const hourlyActivityRef = useRef<HTMLCanvasElement>(null)
  const chartsRef = useRef<any[]>([])

  const [selectedDay, setSelectedDay] = useState<string>('')

  const availableDates = useMemo(() => {
    const dates = new Set<string>()
    if (vp.events && Array.isArray(vp.events)) {
      vp.events.forEach(ev => dates.add(ev.dateKey))
    } else if (vp.dailyStats) {
      Object.keys(vp.dailyStats).forEach(d => dates.add(d))
    }
    return Array.from(dates).sort()
  }, [vp])

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
  }, [vp, timeRangeDays, selectedDay])

  const createCharts = () => {
    const Chart = (window as any).Chart

    // Reihe 1: zwei Kacheln
    if (dailyCompletionsRef.current) {
      const dailyData = prepareDailyCompletionsData()
      const chart = new Chart(dailyCompletionsRef.current, {
        type: 'bar',
        data: {
          labels: dailyData.labels,
          datasets: [{
            label: 'Tägliche Abschlüsse',
            data: dailyData.completions,
            backgroundColor: 'rgba(16, 185, 129, 0.8)',
            borderColor: 'rgba(16, 185, 129, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: { title: { display: true, text: `Tägliche Abschlüsse (letzte ${timeRangeDays} Tage) - ${vp.name}` } },
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
      })
      chartsRef.current.push(chart)
    }

    if (dailyChangesRef.current) {
      const dailyData = prepareDailyStatusChangesData()
      const chart = new Chart(dailyChangesRef.current, {
        type: 'bar',
        data: {
          labels: dailyData.labels,
          datasets: [{
            label: 'Tägliche Statusänderungen',
            data: dailyData.statusChanges,
            backgroundColor: 'rgba(37, 99, 235, 0.8)',
            borderColor: 'rgba(37, 99, 235, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: { title: { display: true, text: `Tägliche Statusänderungen (letzte ${timeRangeDays} Tage) - ${vp.name}` } },
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
      })
      chartsRef.current.push(chart)
    }

    // Reihe 2: restliche Kacheln (Status-Pie + Stundenaktivität)
    if (statusBreakdownRef.current) {
      const statusData = prepareStatusBreakdownData()
      const chart = new Chart(statusBreakdownRef.current, {
        type: 'pie',
        data: {
          labels: statusData.labels,
          datasets: [{
            data: statusData.values,
            backgroundColor: [
              'rgba(239, 68, 68, 0.8)',
              'rgba(245, 158, 11, 0.8)',
              'rgba(59, 130, 246, 0.8)',
              'rgba(16, 185, 129, 0.8)',
              'rgba(139, 92, 246, 0.8)',
              'rgba(236, 72, 153, 0.8)',
              'rgba(156, 163, 175, 0.8)'
            ],
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          plugins: { title: { display: true, text: `Status-Breakdown - ${vp.name}` }, legend: { position: 'right' } }
        }
      })
      chartsRef.current.push(chart)
    }

    if (hourlyActivityRef.current) {
      const hourlyData = prepareHourlyActivityData()
      const titleDay = selectedDay ? selectedDay : 'Tag wählen'
      const chart = new Chart(hourlyActivityRef.current, {
        type: 'bar',
        data: {
          labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
          datasets: [{
            label: 'Aktivität pro Stunde',
            data: hourlyData,
            backgroundColor: 'rgba(99, 102, 241, 0.8)',
            borderColor: 'rgba(99, 102, 241, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: { title: { display: true, text: `Stündliche Aktivität – ${titleDay}` } },
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
      })
      chartsRef.current.push(chart)
    }
  }

  const isWithinRange = (dateStr: string) => {
    const date = new Date(dateStr)
    const cutoff = new Date()
    cutoff.setHours(0, 0, 0, 0)
    cutoff.setDate(cutoff.getDate() - (timeRangeDays - 1))
    return date >= cutoff
  }

  const prepareDailyCompletionsData = () => {
    const dailyStats = vp.dailyStats || {}
    const sortedDates = Object.keys(dailyStats).sort().filter(isWithinRange)
    return {
      labels: sortedDates.map(date => {
        const d = new Date(date)
        return `${d.getDate()}.${d.getMonth() + 1}`
      }),
      completions: sortedDates.map(date => dailyStats[date]?.completions || 0)
    }
  }

  const prepareDailyStatusChangesData = () => {
    const dailyStats = vp.dailyStats || {}
    const sortedDates = Object.keys(dailyStats).sort().filter(isWithinRange)
    return {
      labels: sortedDates.map(date => {
        const d = new Date(date)
        return `${d.getDate()}.${d.getMonth() + 1}`
      }),
      statusChanges: sortedDates.map(date => dailyStats[date]?.statusChanges || 0)
    }
  }

  const prepareStatusBreakdownData = () => {
    const statusCounts = vp.statusCounts || {}
    const labels = Object.keys(statusCounts)
    const values = Object.values(statusCounts)
    return { labels, values }
  }

  const prepareHourlyActivityData = () => {
    const counts = new Array(24).fill(0)
    if (vp.events && Array.isArray(vp.events) && vp.events.length > 0) {
      const day = selectedDay || (vp.events[vp.events.length - 1]?.dateKey)
      vp.events.forEach(ev => {
        if (ev.dateKey === day) {
          const h = Math.max(0, Math.min(23, ev.hour || 0))
          counts[h] += 1
        }
      })
    } else if (vp.hourlyStats) {
      for (let h = 0; h < 24; h++) counts[h] = vp.hourlyStats[h] || 0
    }
    return counts
  }

  const totalWE = vp.totalWE || 0
  const weWithStatus = vp.weWithStatus || 0
  const weWithoutStatus = totalWE - weWithStatus
  const statusPercentage = totalWE > 0 ? Math.round((weWithStatus / totalWE) * 100) : 0

  return (
    <div className="section">
      <h2 className="section-title">
        <i className="fas fa-user-chart"></i>
        VP Analytics: {vp.name}
      </h2>

      <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <label style={{ fontSize: 12, color: 'var(--gray-500)' }}>Tag für stündliche Aktivität:</label>
        <input className="input" type="date" value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} />
      </div>

      {/* Reihe 1: zwei Kacheln nebeneinander */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', 
        gap: '1rem',
        marginBottom: '1rem'
      }}>
        <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--gray-200)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <canvas ref={dailyCompletionsRef} width="360" height="160"></canvas>
        </div>
        <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--gray-200)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <canvas ref={dailyChangesRef} width="360" height="160"></canvas>
        </div>
      </div>

      {/* Reihe 2: übrige Kacheln (Status-Pie + Stunden) */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', 
        gap: '1rem',
        marginBottom: '1rem'
      }}>
        <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--gray-200)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <canvas ref={statusBreakdownRef} width="360" height="160"></canvas>
        </div>
        <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--gray-200)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <canvas ref={hourlyActivityRef} width="360" height="160"></canvas>
        </div>
      </div>

      <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--gray-200)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem', fontWeight: 600 }}>📋 Zusammenfassung</h3>
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
                <td>WE gesamt</td>
                <td>{totalWE}</td>
              </tr>
              <tr>
                <td>WE mit Status</td>
                <td>{weWithStatus} ({statusPercentage}%)</td>
              </tr>
              <tr>
                <td>WE ohne Status</td>
                <td>{weWithoutStatus}</td>
              </tr>
              <tr>
                <td>Abschlüsse (aktuell)</td>
                <td><strong>{vp.completions}</strong></td>
              </tr>
              <tr>
                <td>Statusänderungen (gesamt)</td>
                <td><strong>{vp.totalStatusChanges}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
