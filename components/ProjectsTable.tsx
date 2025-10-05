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
                  onClick={() => onSelectProject(project.name)}
                  className={selectedProject === project.name ? 'selected' : ''}
                >
                  <td style={{ fontWeight: 600 }}>{project.name}</td>
                  <td>{totalWE.toLocaleString()}</td>
                  <td>{vpCount}</td>
                  <td>{project.completions}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 600 }}>{statusPercent}%</span>
                    </div>
                  </td>
                  <td>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${statusPercent}%` }}></div>
                    </div>
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
