'use client'

import * as React from 'react'
import { useEffect, useRef } from 'react'
import { ProjectData, VPData } from '../lib/supabase'

interface ProjectAnalyticsProps {
  project: ProjectData;
  vpsData: { [key: string]: VPData };
  timeRangeDays: number;
}

export default function ProjectAnalytics({ project, vpsData, timeRangeDays }: ProjectAnalyticsProps) {
  const dailyCompletionsRef = useRef<HTMLCanvasElement>(null)
  const dailyChangesRef = useRef<HTMLCanvasElement>(null)
  const statusBreakdownRef = useRef<HTMLCanvasElement>(null)
  const chartsRef = useRef<any[]>([])

  useEffect(() => {
    chartsRef.current.forEach(chart => chart?.destroy())
    chartsRef.current = []

    if (typeof window !== 'undefined' && (window as any).Chart) {
      createCharts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, timeRangeDays])

  const createCharts = () => {
    const Chart = (window as any).Chart

    // 1. Daily Completions Chart
    if (dailyCompletionsRef.current) {
      const dailyData = prepareDailyCompletionsData()
      const completionsChart = new Chart(dailyCompletionsRef.current, {
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
          plugins: {
            title: {
              display: true,
              text: `Tägliche Abschlüsse (letzte ${timeRangeDays} Tage) - Alle VPs`
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1 }
            }
          }
        }
      })
      chartsRef.current.push(completionsChart)
    }

    // 2. Daily Status Changes Chart
    if (dailyChangesRef.current) {
      const dailyData = prepareDailyStatusChangesData()
      const changesChart = new Chart(dailyChangesRef.current, {
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
          plugins: {
            title: {
              display: true,
              text: `Tägliche Statusänderungen (letzte ${timeRangeDays} Tage) - Alle VPs`
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1 }
            }
          }
        }
      })
      chartsRef.current.push(changesChart)
    }

    // 3. Status Breakdown Pie Chart
    if (statusBreakdownRef.current) {
      const statusData = prepareStatusBreakdownData()
      const statusChart = new Chart(statusBreakdownRef.current, {
        type: 'pie',
        data: {
          labels: statusData.labels,
          datasets: [{
            data: statusData.values,
            backgroundColor: [
              'rgba(239, 68, 68, 0.8)',   // rot
              'rgba(245, 158, 11, 0.8)',  // gelb
              'rgba(59, 130, 246, 0.8)',  // blau
              'rgba(16, 185, 129, 0.8)',  // grün
              'rgba(139, 92, 246, 0.8)',  // lila
              'rgba(236, 72, 153, 0.8)',  // pink
              'rgba(156, 163, 175, 0.8)'  // grau
            ],
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Status-Breakdown - Aktueller Stand'
            },
            legend: { position: 'right' }
          }
        }
      })
      chartsRef.current.push(statusChart)
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
    const dailyStats = project.dailyStats || {}
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
    const dailyStats = project.dailyStats || {}
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
    const statusCounts = project.statusCounts || {}
    const labels = Object.keys(statusCounts)
    const values = Object.values(statusCounts)
    return { labels, values }
  }

  const totalWE = project.totalWE || 0
  const weWithStatus = project.weWithStatus || 0
  const weWithoutStatus = totalWE - weWithStatus
  const statusPercentage = totalWE > 0 ? Math.round((weWithStatus / totalWE) * 100) : 0

  return (
    <div className="section">
      <h2 className="section-title">
        <i className="fas fa-chart-bar"></i>
        Projekt Analytics: {project.name}
      </h2>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '2rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '0.75rem',
          border: '1px solid var(--gray-200)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <canvas ref={dailyCompletionsRef} width="400" height="200"></canvas>
        </div>
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '0.75rem',
          border: '1px solid var(--gray-200)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <canvas ref={dailyChangesRef} width="400" height="200"></canvas>
        </div>
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '0.75rem',
          border: '1px solid var(--gray-200)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <canvas ref={statusBreakdownRef} width="400" height="200"></canvas>
        </div>
      </div>

      <div style={{
        background: 'white',
        padding: '1.5rem',
        borderRadius: '0.75rem',
        border: '1px solid var(--gray-200)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600 }}>
          📋 Status-Tabelle
        </h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Anzahl (absolut)</th>
                <th>Anteil an WE (%)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(project.statusCounts || {}).map(([status, count]) => (
                <tr key={status}>
                  <td style={{ fontWeight: 600 }}>{status}</td>
                  <td>
                    <span className="badge badge-primary">{count}</span>
                  </td>
                  <td>
                    <strong>{totalWE > 0 ? Math.round(((count as number) / totalWE) * 100) : 0}%</strong>
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid var(--gray-200)', fontWeight: 600 }}>
                <td>WE mit Status</td>
                <td>
                  <span className="badge badge-success">{weWithStatus}</span>
                </td>
                <td>
                  <strong>{statusPercentage}%</strong>
                </td>
              </tr>
              <tr style={{ fontWeight: 600 }}>
                <td>WE ohne Status</td>
                <td>
                  <span className="badge badge-warning">{weWithoutStatus}</span>
                </td>
                <td>
                  <strong>{100 - statusPercentage}%</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
