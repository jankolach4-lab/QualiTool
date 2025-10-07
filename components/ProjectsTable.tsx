'use client'

import * as React from 'react'
import { ProjectData } from '../lib/supabase'

interface ProjectsTableProps {
  projects: { [key: string]: ProjectData };
  onSelectProject: (projectName: string) => void;
  selectedProject?: string;
}

function getEffectiveTotalWE(project: ProjectData) {
  if (typeof window === 'undefined') return project.totalWE
  const raw = localStorage.getItem(`proj_total_we_${project.name}`)
  const n = raw ? Number(raw) : NaN
  return Number.isFinite(n) && n > 0 ? n : project.totalWE
}

export default function ProjectsTable({ projects, onSelectProject, selectedProject }: ProjectsTableProps) {
  return (
    <div className="section">
      <h2 className="section-title">
        <i className="fas fa-building"></i>
        Projektübersicht
      </h2>
      
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Projekt (Stadt)</th>
              <th>WE</th>
              <th>VP</th>
              <th>Abschlüsse</th>
              <th>Status %</th>
              <th>Fortschritt</th>
              <th>Karte</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(projects).map(project => {
              const vpCount = project.vps.size;
              const totalWE = getEffectiveTotalWE(project)
              const statusPercent = totalWE > 0 ? Math.round((project.completions / totalWE) * 100) : 0;
              
              return (
                <tr 
                  key={project.name}
                  className={selectedProject === project.name ? 'selected' : ''}
                >
                  <td style={{ fontWeight: 600, cursor: 'pointer' }} onClick={() => onSelectProject(project.name)}>{project.name}</td>
                  <td onClick={() => onSelectProject(project.name)} style={{ cursor: 'pointer' }}>{totalWE.toLocaleString()}</td>
                  <td onClick={() => onSelectProject(project.name)} style={{ cursor: 'pointer' }}>{vpCount}</td>
                  <td onClick={() => onSelectProject(project.name)} style={{ cursor: 'pointer' }}>{project.completions}</td>
                  <td onClick={() => onSelectProject(project.name)} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 600 }}>{statusPercent}%</span>
                    </div>
                  </td>
                  <td onClick={() => onSelectProject(project.name)} style={{ cursor: 'pointer' }}>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${statusPercent}%` }}></div>
                    </div>
                  </td>
                  <td>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/map?project=${encodeURIComponent(project.name)}`, '_blank');
                      }}
                      style={{
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.875rem',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.25rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                      title="Abschlüsse-Karte öffnen"
                    >
                      🗺️ Karte
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
