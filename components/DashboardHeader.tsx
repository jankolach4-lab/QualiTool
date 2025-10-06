"use client"

import * as React from 'react'

interface DashboardHeaderProps {
  onRefresh: () => void;
  onDebug: () => void;
  onLogout: () => void;
  timeRangeDays: number;
  onTimeRangeChange: (days: number) => void;
}

export default function DashboardHeader({ onRefresh, onDebug, onLogout, timeRangeDays, onTimeRangeChange }: DashboardHeaderProps) {
  return (
    <header className="header">
      {/* zentrierte Marke */}
      <div className="brand-centered" aria-label="Admin Dashboard Pro">
        <img src="/brand-icon.svg" alt="Logo" width={22} height={22} />
        <span>Admin Dashboard Pro</span>
      </div>

      {/* rechte Steuerleiste */}
      <div className="controls">
        <a
          className="btn btn-secondary"
          href="/Polygontool.html"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Polygontool in neuem Tab öffnen"
          title="Polygontool"
        >
          <i className="fas fa-draw-polygon"></i>
          Polygontool
        </a>
        <select
          className="select"
          aria-label="Zeitraum"
          value={timeRangeDays}
          onChange={(e) => onTimeRangeChange(Number(e.target.value))}
        >
          <option value={7}>7 Tage</option>
          <option value={14}>14 Tage</option>
          <option value={30}>30 Tage</option>
          <option value={90}>90 Tage</option>
          <option value={120}>120 Tage</option>
        </select>
        <button className="btn btn-primary" onClick={onRefresh}>
          <i className="fas fa-sync-alt"></i>
          Aktualisieren
        </button>
        <button className="btn btn-secondary" onClick={onDebug}>
          <i className="fas fa-bug"></i>
          Debug
        </button>
        <button className="btn btn-secondary" onClick={onLogout}>
          <i className="fas fa-sign-out-alt"></i>
          Abmelden
        </button>
      </div>
    </header>
  )
}
