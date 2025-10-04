'use client'

import * as React from 'react'
import { VPData, ProjectData } from '../lib/supabase'

interface VPTableProps {
  project: ProjectData;
  vps: { [key: string]: VPData };
  onSelectVP: (vpId: string) => void;
  selectedVP?: string;
}

export default function VPTable({ project, vps, onSelectVP, selectedVP }: VPTableProps) {
  const projectVPs = Array.from(project.vps).map(vpId => vps[vpId]).filter(Boolean);

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
              <th>WE</th>
              <th>Abschlüsse</th>
              <th>% eigene WE</th>
              <th>% Projekt WE</th>
            </tr>
          </thead>
          <tbody>
            {projectVPs.map(vp => {
              const ownPercent = vp.totalWE > 0 ? Math.round((vp.completions / vp.totalWE) * 100) : 0;
              const projectPercent = project.totalWE > 0 ? Math.round((vp.completions / project.totalWE) * 100) : 0;
              
              return (
                <tr 
                  key={vp.id}
                  onClick={() => onSelectVP(vp.id)}
                  className={selectedVP === vp.id ? 'selected' : ''}
                >
                  <td style={{ fontWeight: 600 }}>
                    {vp.name}
                    {vp.email && (
                      <React.Fragment>
                        <br />
                        <small style={{ color: 'var(--gray-500)' }}>{vp.email}</small>
                      </React.Fragment>
                    )}
                  </td>
                  <td><span className="badge badge-primary">{vp.totalWE}</span></td>
                  <td><span className="badge badge-warning">{vp.completions}</span></td>
                  <td><strong>{ownPercent}%</strong></td>
                  <td><strong>{projectPercent}%</strong></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}