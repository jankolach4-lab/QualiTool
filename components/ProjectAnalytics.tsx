'use client'

import * as React from 'react'
import { useEffect, useRef, useState } from 'react'
import { ProjectData, VPData } from '../lib/supabase'
import { colorForStatus } from '../lib/colors'

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
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: `Tägliche Abschlüsse (letzte ${timeRangeDays} Tage) - Alle VPs` },
            legend: { display: false }
          },
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
      })
      chartsRef.current.push(completionsChart)
    }

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
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: `Tägliche Statusänderungen (letzte ${timeRangeDays} Tage) - Alle VPs` },
            legend: { display: false }
          },
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
      })
      chartsRef.current.push(changesChart)
    }

    if (statusBreakdownRef.current) {
      const statusData = prepareStatusBreakdownData()
      const colors = statusData.labels.map(l => colorForStatus(String(l)))
      const statusChart = new Chart(statusBreakdownRef.current, {
        type: 'pie',
        data: {
          labels: statusData.labels,
          datasets: [{
            data: statusData.values,
            backgroundColor: colors,
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { title: { display: true, text: 'Status-Breakdown' }, legend: { position: 'bottom', labels: { boxWidth: 10 } } }
        }
      })
      chartsRef.current.push(statusChart)
    }
  }

  const isWithinRange = (dateStr: string) => {
    const date = new Date(dateStr)
    const cutoff = new Date(); cutoff.setHours(0,0,0,0); cutoff.setDate(cutoff.getDate() - (timeRangeDays - 1))
    return date >= cutoff
  }

  const prepareDailyCompletionsData = () => {
    const dailyStats = project.dailyStats || {}
    const sortedDates = Object.keys(dailyStats).sort().filter(isWithinRange)
    return { labels: sortedDates.map(date => { const d = new Date(date); return `${d.getDate()}.${d.getMonth() + 1}` }), completions: sortedDates.map(date => dailyStats[date]?.completions || 0) }
  }

  const prepareDailyStatusChangesData = () => {
    const dailyStats = project.dailyStats || {}
    const sortedDates = Object.keys(dailyStats).sort().filter(isWithinRange)
    return { labels: sortedDates.map(date => { const d = new Date(date); return `${d.getDate()}.${d.getMonth() + 1}` }), statusChanges: sortedDates.map(date => dailyStats[date]?.statusChanges || 0) }
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
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ background: 'white', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--gray-200)', height: 280 }}>
          <canvas ref={dailyCompletionsRef} style={{ width: '100%', height: '100%' }} />
        </div>
        <div style={{ background: 'white', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--gray-200)', height: 280 }}>
          <canvas ref={dailyChangesRef} style={{ width: '100%', height: '100%' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ background: 'white', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--gray-200)', height: 320 }}>
          <canvas ref={statusBreakdownRef} style={{ width: '100%', height: '100%' }} />
        </div>
        <div style={{ background: 'white', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--gray-200)', height: 320, overflow: 'auto' }}>
          <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem', fontWeight: 600 }}>📋 Status-Tabelle</h3>
          <div className="table-container" style={{ border: 'none' }}>
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
                    <td>{count}</td>
                    <td><strong>{totalWE > 0 ? Math.round(((count as number) / totalWE) * 100) : 0}%</strong></td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid var(--gray-200)', fontWeight: 600 }}>
                  <td>WE mit Status</td>
                  <td>{weWithStatus}</td>
                  <td><strong>{statusPercentage}%</strong></td>
                </tr>
                <tr style={{ fontWeight: 600 }}>
                  <td>WE ohne Status</td>
                  <td>{weWithoutStatus}</td>
                  <td><strong>{100 - statusPercentage}%</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Projekt-Forecast Chart - Full Width */}
      <ProjectForecastChart project={project} />
    </div>
  )
}

// Neue Komponente für Projekt-Forecast
function ProjectForecastChart({ project }: { project: ProjectData }) {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstanceRef = useRef<any>(null)
  const [targetQuote, setTargetQuote] = useState<number>(33)

  useEffect(() => {
    // Load saved target quote
    const saved = localStorage.getItem(`proj_target_quote_${project.name}`)
    if (saved) setTargetQuote(Number(saved))
  }, [project.name])

  useEffect(() => {
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy()
    }

    if (typeof window !== 'undefined' && (window as any).Chart && chartRef.current) {
      createForecastChart()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, targetQuote])

  const createForecastChart = () => {
    const Chart = (window as any).Chart

    // Get project dates from localStorage
    const startDateStr = localStorage.getItem(`proj_start_${project.name}`) || ''
    const endDateStr = localStorage.getItem(`proj_end_${project.name}`) || ''
    
    if (!startDateStr || !endDateStr) {
      console.warn('[ProjectForecast] No project dates set for', project.name)
      return
    }

    const startDate = new Date(startDateStr)
    const endDate = new Date(endDateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Generate all dates from start to end
    const allDates: Date[] = []
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      allDates.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }

    const labels = allDates.map(d => d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }))
    const totalDays = allDates.length
    const daysPassed = allDates.filter(d => d <= today).length

    // Calculate total WE
    const totalWE = project.totalWE || 1

    // 1. Soll-Linie (Linear Target): 0% → targetQuote%
    const sollData = allDates.map((_, idx) => {
      const progress = (idx + 1) / totalDays
      return progress * targetQuote
    })

    // 2. Tägliche Ist-Quote (Balkendiagramm)
    const dailyQuoteData: number[] = []
    let cumulativeCompletions = 0
    
    allDates.forEach(date => {
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const dailyStats = project.dailyStats?.[dateKey]
      
      if (dailyStats && dailyStats.completions) {
        cumulativeCompletions += dailyStats.completions
      }
      
      const currentQuote = (cumulativeCompletions / totalWE) * 100
      dailyQuoteData.push(date <= today ? currentQuote : null as any)
    })

    // 3. Forecast-Linie (Hochrechnung) - für jeden Tag einzeln berechnen
    const forecastData: (number | null)[] = []
    
    allDates.forEach((date, idx) => {
      if (date > today) {
        forecastData.push(null)
        return
      }

      // Berechne Prognose AUS SICHT DIESES TAGES
      // Summiere alle Abschlüsse BIS zu diesem Tag
      let completionsUpToThisDay = 0
      let daysElapsedUpToThisDay = 0
      
      for (let i = 0; i <= idx; i++) {
        const checkDate = allDates[i]
        if (checkDate > date) break
        
        daysElapsedUpToThisDay++
        const dateKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`
        const stats = project.dailyStats?.[dateKey]
        
        if (stats && stats.completions) {
          completionsUpToThisDay += stats.completions
        }
      }
      
      if (daysElapsedUpToThisDay === 0) {
        forecastData.push(0)
        return
      }

      // Durchschnitt pro Tag bis zu diesem Zeitpunkt
      const avgCompletionsPerDay = completionsUpToThisDay / daysElapsedUpToThisDay
      
      // Verbleibende Tage ab diesem Tag bis Projektende
      const remainingDaysFromThisDay = totalDays - daysElapsedUpToThisDay
      
      // Hochrechnung: bisherige Abschlüsse + (Durchschnitt × verbleibende Tage)
      const projectedTotalCompletions = completionsUpToThisDay + (avgCompletionsPerDay * remainingDaysFromThisDay)
      const projectedEndQuote = (projectedTotalCompletions / totalWE) * 100

      forecastData.push(projectedEndQuote)
    })

    const chart = new Chart(chartRef.current, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            type: 'line',
            label: `Soll-Quote (${targetQuote}% Ziel)`,
            data: sollData,
            borderColor: '#10b981',
            backgroundColor: 'transparent',
            borderWidth: 3,
            borderDash: [5, 5],
            pointRadius: 0,
            tension: 0
          },
          {
            type: 'line',
            label: 'Hochrechnung (Forecast)',
            data: forecastData,
            borderColor: '#f59e0b',
            backgroundColor: 'transparent',
            borderWidth: 3,
            pointRadius: 2,
            tension: 0.3
          },
          {
            type: 'bar',
            label: 'Aktuelle Quote',
            data: dailyQuoteData,
            backgroundColor: '#3b82f6',
            borderColor: '#2563eb',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 15,
              font: { size: 13 }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context: any) {
                let label = context.dataset.label || ''
                if (label) label += ': '
                if (context.parsed.y !== null) {
                  label += context.parsed.y.toFixed(2) + '%'
                }
                return label
              }
            }
          }
        },
        scales: {
          x: {
            stacked: false,
            grid: { display: false },
            ticks: {
              maxRotation: 45,
              minRotation: 45,
              autoSkip: true,
              maxTicksLimit: 30
            }
          },
          y: {
            stacked: false,
            beginAtZero: true,
            max: (() => {
              // Finde den höchsten Wert aus allen drei Datenreihen
              const maxSoll = Math.max(...sollData)
              const maxDaily = Math.max(...dailyQuoteData.filter((v): v is number => v !== null))
              const maxForecast = Math.max(...forecastData.filter((v): v is number => v !== null))
              const overallMax = Math.max(maxSoll, maxDaily, maxForecast, targetQuote)
              
              // Y-Achse = höchster Wert + 15
              return overallMax + 15
            })(),
            title: {
              display: true,
              text: 'Quote (%)'
            },
            ticks: {
              callback: function(value: any) {
                return value + '%'
              }
            }
          }
        }
      }
    })

    chartInstanceRef.current = chart
  }

  const handleTargetQuoteChange = (value: string) => {
    const num = Number(value)
    if (num > 0 && num <= 100) {
      setTargetQuote(num)
      localStorage.setItem(`proj_target_quote_${project.name}`, value)
    }
  }

  return (
    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid var(--gray-200)', marginTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
          📈 Projekt-Forecast & Hochrechnung
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Ziel-Quote:</label>
          <input
            type="number"
            min="1"
            max="100"
            step="0.1"
            value={targetQuote}
            onChange={(e) => handleTargetQuoteChange(e.target.value)}
            style={{
              width: '80px',
              padding: '6px 10px',
              border: '1px solid var(--gray-300)',
              borderRadius: '6px',
              fontSize: '0.875rem'
            }}
          />
          <span style={{ fontSize: '0.875rem' }}>%</span>
        </div>
      </div>
      <div style={{ height: '400px', position: 'relative' }}>
        <canvas ref={chartRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  )
}
