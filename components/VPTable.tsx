'use client'

import * as React from 'react'
import { VPData, ProjectData } from '../lib/supabase'

interface VPTableProps {
  project: ProjectData;
  vps: { [key: string]: VPData };
  onSelectVP: (vpId: string) => void;
  selectedVP?: string;
}

function getEffectiveProjectTotalWE(project: ProjectData) {
  if (typeof window === 'undefined') return project.totalWE
  const raw = localStorage.getItem(`proj_total_we_${project.name}`)
  const n = raw ? Number(raw) : NaN
  return Number.isFinite(n) && n > 0 ? n : project.totalWE
}

export default function VPTable({ project, vps, onSelectVP, selectedVP }: VPTableProps) {
  const projectVPs = Array.from(project.vps).map(vpId => vps[vpId]).filter(Boolean)
  const effectiveProjectWE = getEffectiveProjectTotalWE(project)

  return (
    <div className="section">
      <h2 className="section-title">
        <i className="fas fa-users"></i>
        VP im Projekt: {project.name}
      </h2>
      
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>VP Name</th>
              <th>WE (Projekt)</th>
              <th>Abschlüsse (Projekt)</th>
              <th>% eigene WE</th>
              <th>% Projekt WE</th>
            </tr>
          </thead>
          <tbody>
            {projectVPs.map(vp => {
              const slice = vp.perProject?.[project.name]
              const sliceWE = slice?.totalWE || 0
              const sliceCompletions = slice?.completions || 0
              const ownPercent = sliceWE > 0 ? Math.round((sliceCompletions / sliceWE) * 100) : 0
              const projectPercent = effectiveProjectWE > 0 ? Math.round((sliceCompletions / effectiveProjectWE) * 100) : 0
              
              return (
                <tr 
                  key={vp.id}
                  onClick={() => onSelectVP(vp.id)}
                  className={selectedVP === vp.id ? 'selected' : ''}
                >
                  <td style={{ fontWeight: 600 }}>
                    {vp.name}
                    {vp.email && (
                      <>
                        <br />
                        <small style={{ color: 'var(--gray-500)' }}>{vp.email}</small>
                      </>
                    )}
                  </td>
                  <td>{sliceWE}</td>
                  <td>{sliceCompletions}</td>
                  <td><strong>{ownPercent}%</strong></td>
                  <td><strong>{projectPercent}%</strong></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
