'use client'

import * as React from 'react'

interface DashboardHeaderProps {
  onRefresh: () => void;
  onDebug: () => void;
  onLogout: () => void;
}

export default function DashboardHeader({ onRefresh, onDebug, onLogout }: DashboardHeaderProps) {
  return (
    <header className="header">
      <div className="logo">
        <i className="fas fa-chart-line"></i>
        Admin Dashboard Pro
      </div>
      <div className="controls">
        <select className="select" id="timeRange" defaultValue="30">
          <option value="7">7 Tage</option>
          <option value="14">14 Tage</option>
          <option value="30">30 Tage</option>
          <option value="90">90 Tage</option>
          <option value="120">120 Tage</option>
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