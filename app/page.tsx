'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, UserContact, UserDirectory, ProjectData, VPData, Resident, StatusHistoryEntry, TimelineEvent, VPProjectSlice } from '../lib/supabase'
import DashboardHeader from '../components/DashboardHeader'
import OverviewSection from '../components/OverviewSection'
import ProjectsTable from '../components/ProjectsTable'
import ProjectAnalytics from '../components/ProjectAnalytics'
import VPTable from '../components/VPTable'
import VPAnalytics from '../components/VPAnalytics'
import ProjectProjection from '../components/ProjectProjection'

export default function Dashboard() {
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [allContacts, setAllContacts] = useState<UserContact[]>([])
  const [userDirectory, setUserDirectory] = useState<{ [key: string]: UserDirectory }>({})
  const [projectsData, setProjectsData] = useState<{ [key: string]: ProjectData }>({})
  const [vpsData, setVpsData] = useState<{ [key: string]: VPData }>({})
  const [selectedProject, setSelectedProject] = useState<string>()
  const [selectedVP, setSelectedVP] = useState<string>()
  const [timeRangeDays, setTimeRangeDays] = useState<number>(30)

  useEffect(() => { checkAuth() }, [])

  const checkAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error
      if (!session) { router.push('/login'); return false }
      await loadData(); return true
    } catch (error) { console.error('Auth check failed:', error); setError('Authentifizierung fehlgeschlagen'); return false }
  }

  const logout = async () => { try { const { error } = await supabase.auth.signOut(); if (error) throw error; router.push('/login') } catch (error) { console.error('Logout failed:', error); setError('Fehler beim Abmelden') } }

  const loadUserDirectory = async () => {
    try { const { data: users, error } = await supabase.from('user_directory').select('user_id, email, display_name'); if (error) throw error; const directory: { [key: string]: UserDirectory } = {}; (users || []).forEach(user => { directory[user.user_id] = user }); setUserDirectory(directory) }
    catch (error) { console.error('Error loading user directory:', error); setUserDirectory({}) }
  }

  const loadContacts = async () => {
    try { const { data: contacts, error } = await supabase.from('user_contacts').select('user_id, contacts, created_at, updated_at'); if (error) throw error; setAllContacts(contacts || []) }
    catch (error) { console.error('Error loading contacts:', error); setAllContacts([]) }
  }

  // Load project settings from Supabase and sync to localStorage for other components
  const loadProjectSettings = async () => {
    try {
      const { data, error } = await supabase.from('project_settings').select('project_name, start_date, end_date, total_we, state_code')
      if (error) throw error
      if (typeof window !== 'undefined') {
        (data || []).forEach(ps => {
          const name = ps.project_name
          if (!name) return
          // persist to localStorage so existing components pick it up
          localStorage.setItem(`proj_dates_${name}`, JSON.stringify({ startDate: ps.start_date || '', endDate: ps.end_date || '' }))
          localStorage.setItem(`proj_start_${name}`, ps.start_date || '')
          localStorage.setItem(`proj_end_${name}`, ps.end_date || '')
          if (ps.total_we && ps.total_we > 0) localStorage.setItem(`proj_total_we_${name}`, String(ps.total_we))
          if (ps.state_code !== null) localStorage.setItem(`proj_state_${name}`, ps.state_code || '')
        })
      }
    } catch (e) {
      console.warn('Project settings load failed (using localStorage fallback):', (e as Error).message)
    }
  }

  const getStatusPriority = (status: string): number => {
    const priorities: { [key: string]: number } = {
      'abschluss': 12,
      'onlineabschluss': 11,
      'abschl-anderer-vp': 10,
      'beraten': 9,
      'termin': 8,
      'wiedervorlage': 7,
      'kein-eintritt': 6,
      'kein-interesse': 5,
      'nicht-vermarktbar': 4,
      'blacklist': 3,
      'nicht-angetroffen': 2,
      'offen': 1,
      '': 0
    }
    return priorities[status] || 0
  }

  const getHighestPriorityStatus = (resident: Resident): string => {
    if (!resident?.statusHistory?.length) {
      return resident?.status || ''
    }

    // Sort history by date (newest first)
    const sortedHistory = [...resident.statusHistory].sort((a: any, b: any) => {
      const aTime = new Date(a.date || a.timestamp).getTime()
      const bTime = new Date(b.date || b.timestamp).getTime()
      return bTime - aTime
    })
    
    // Find highest status by normal priority
    const highestByPriority = resident.statusHistory.reduce((highestStatus: string, entry: any) => {
      const currentPriority = getStatusPriority(entry.status)
      const highestPriority = getStatusPriority(highestStatus)
      return currentPriority > highestPriority ? entry.status : highestStatus
    }, '')
    
    // SPECIAL RULE: "kein-eintritt" or "kein-interesse" AFTER higher prioritized status
    const newestEntry = sortedHistory[0]
    const newestStatus = newestEntry?.status
    
    // Check if newest status is one of the two special statuses
    if (newestStatus === 'kein-eintritt' || newestStatus === 'kein-interesse') {
      // Check if there is an older status with higher priority
      const hasOlderHigherPriorityStatus = sortedHistory.some((entry: any, index: number) => {
        if (index === 0) return false // Skip newest status
        return getStatusPriority(entry.status) > getStatusPriority(newestStatus)
      })
      
      // If yes, then use the newer (special) status
      if (hasOlderHigherPriorityStatus) {
        return newestStatus
      }
    }
    
    // Otherwise normal priority logic
    return highestByPriority
  }

  const ensureVPSlice = (vp: VPData, projectName: string): VPProjectSlice => {
    if (!vp.perProject) vp.perProject = {}
    if (!vp.perProject[projectName]) {
      vp.perProject[projectName] = { totalWE: 0, completions: 0, statusCounts: {}, dailyStats: {}, hourlyStats: {}, totalStatusChanges: 0, weWithStatus: 0, events: [] }
    }
    return vp.perProject[projectName]
  }

  const processRealData = (contacts: UserContact[], directory: { [key: string]: UserDirectory }) => {
    const projects: { [key: string]: ProjectData } = {}
    const vps: { [key: string]: VPData } = {}

    contacts.forEach((contactRecord) => {
      const vpId = contactRecord.user_id
      const contactsArray = Array.isArray(contactRecord.contacts) ? contactRecord.contacts : []
      const userInfo = directory[vpId]
      const vpName = userInfo?.display_name || userInfo?.email || `VP-${vpId}`

      contactsArray.forEach(contactItem => {
        const project = (contactItem as any).ort || 'Unbekannt'
        const weRaw = (contactItem as any).we
        const weCount = (typeof weRaw === 'number' && weRaw > 0) ? weRaw : 1

        if (!projects[project]) {
          projects[project] = { name: project, totalWE: 0, vps: new Set(), completions: 0, statusCounts: {}, dailyStats: {}, hourlyStats: {}, totalStatusChanges: 0, weWithStatus: 0, events: [] }
        }

        if (!vps[vpId]) {
          vps[vpId] = { id: vpId, name: vpName, email: userInfo?.email || '', totalWE: 0, completions: 0, totalChanges: 0, statusCounts: {}, dailyStats: {}, hourlyStats: {}, projects: new Set(), totalStatusChanges: 0, weWithStatus: 0, events: [], perProject: {} }
        }

        const vpSlice = ensureVPSlice(vps[vpId], project)

        vps[vpId].projects.add(project)
        projects[project].vps.add(vpId)
        projects[project].totalWE += weCount
        vps[vpId].totalWE += weCount
        vpSlice.totalWE += weCount

        const residents = (contactItem as any).residents || {}
        const residentList = Object.values(residents || {}) as Resident[]
        residentList.forEach((resident) => {
          // Use highest priority status instead of current status
          const highestStatus = getHighestPriorityStatus(resident)
          
          if (highestStatus) {
            projects[project].statusCounts[highestStatus] = (projects[project].statusCounts[highestStatus] || 0) + 1
            projects[project].weWithStatus++
            if (highestStatus === 'abschluss' || highestStatus === 'onlineabschluss') projects[project].completions++

            vps[vpId].statusCounts[highestStatus] = (vps[vpId].statusCounts[highestStatus] || 0) + 1
            vps[vpId].weWithStatus++
            if (highestStatus === 'abschluss' || highestStatus === 'onlineabschluss') vps[vpId].completions++

            vpSlice.statusCounts[highestStatus] = (vpSlice.statusCounts[highestStatus] || 0) + 1
            vpSlice.weWithStatus++
            if (highestStatus === 'abschluss' || highestStatus === 'onlineabschluss') vpSlice.completions++
          }

          if (resident.statusHistory && Array.isArray(resident.statusHistory)) {
            ;(resident.statusHistory as StatusHistoryEntry[]).forEach((historyEntry) => {
              if (historyEntry.date && historyEntry.status) {
                const date = new Date(historyEntry.date)
                const dateKey = date.toISOString().split('T')[0]
                const hour = date.getHours()

                if (!projects[project].dailyStats[dateKey]) projects[project].dailyStats[dateKey] = { completions: 0, statusChanges: 0 }
                if (!projects[project].hourlyStats[hour]) projects[project].hourlyStats[hour] = 0
                projects[project].dailyStats[dateKey].statusChanges++
                projects[project].totalStatusChanges++
                projects[project].hourlyStats[hour]++
                if (historyEntry.status === 'abschluss') projects[project].dailyStats[dateKey].completions++

                if (!vps[vpId].dailyStats[dateKey]) vps[vpId].dailyStats[dateKey] = { completions: 0, statusChanges: 0 }
                if (!vps[vpId].hourlyStats[hour]) vps[vpId].hourlyStats[hour] = 0
                vps[vpId].dailyStats[dateKey].statusChanges++
                vps[vpId].totalStatusChanges++
                vps[vpId].hourlyStats[hour]++
                if (historyEntry.status === 'abschluss') vps[vpId].dailyStats[dateKey].completions++

                if (!vpSlice.dailyStats[dateKey]) vpSlice.dailyStats[dateKey] = { completions: 0, statusChanges: 0 }
                if (!vpSlice.hourlyStats[hour]) vpSlice.hourlyStats[hour] = 0
                vpSlice.dailyStats[dateKey].statusChanges++
                vpSlice.totalStatusChanges++
                vpSlice.hourlyStats[hour]++
                if (historyEntry.status === 'abschluss') vpSlice.dailyStats[dateKey].completions++

                const ev: TimelineEvent = { dateKey, hour, status: historyEntry.status }
                projects[project].events?.push(ev)
                vps[vpId].events?.push(ev)
                vpSlice.events?.push(ev)
              }
            })
          }
        })
      })
    })

    setProjectsData(projects)
    setVpsData(vps)
  }

  const loadData = async () => {
    try { setLoading(true); setError(''); await loadUserDirectory(); await loadContacts(); await loadProjectSettings(); }
    catch (error) { console.error('Error loading data:', error); setError('Fehler beim Laden der Daten: ' + (error as Error).message) }
    finally { setLoading(false) }
  }

  useEffect(() => { if (allContacts.length > 0 && Object.keys(userDirectory).length > 0) { processRealData(allContacts, userDirectory) } }, [allContacts, userDirectory])

  const showDebug = async () => {
    let debugInfo = '🐛 Extended Debug Information\n\n'
    try {
      const { data: allUserContacts } = await supabase.from('user_contacts').select('*')
      debugInfo += `📊 user_contacts: ${allUserContacts?.length || 0}\n`
      const { data: allUserDirectory } = await supabase.from('user_directory').select('*')
      debugInfo += `📇 user_directory: ${allUserDirectory?.length || 0}\n`
      const { data: { user } } = await supabase.auth.getUser()
      debugInfo += `👤 User: ${user?.email || user?.id || 'None'}\n`
      const { data: settings } = await supabase.from('project_settings').select('count')
      debugInfo += `⚙️ project_settings rows: ${settings ? JSON.stringify(settings) : 'NA'}\n`
    } catch (error) { debugInfo += `❌ Debug query error: ${(error as Error).message}\n\n` }
    debugInfo += `Projekte: ${Object.keys(projectsData).length}, VPs: ${Object.keys(vpsData).length}\n`
    alert(debugInfo)
  }

  const totalProjects = Object.keys(projectsData).length
  const totalVPs = Object.keys(vpsData).length
  const totalWE = Object.values(projectsData).reduce((sum, project) => sum + project.totalWE, 0)

  if (loading) return <div className="loading">Dashboard wird geladen...</div>

  return (
    <div>
      <DashboardHeader onRefresh={loadData} onDebug={showDebug} onLogout={logout} timeRangeDays={timeRangeDays} onTimeRangeChange={setTimeRangeDays} />
      <main className="main">
        {error && (<div className="alert alert-error">{error}</div>)}
        <OverviewSection totalProjects={totalProjects} totalVPs={totalVPs} totalWE={totalWE} />
        <ProjectsTable projects={projectsData} onSelectProject={(projectName) => { setSelectedProject(projectName); setSelectedVP(undefined) }} selectedProject={selectedProject} />
        {selectedProject && projectsData[selectedProject] && (
          <>
            <ProjectAnalytics project={projectsData[selectedProject]} vpsData={vpsData} timeRangeDays={timeRangeDays} />
            <ProjectProjection project={projectsData[selectedProject]} />
            <VPTable project={projectsData[selectedProject]} vps={vpsData} onSelectVP={setSelectedVP} selectedVP={selectedVP} />
          </>
        )}
        {selectedVP && selectedProject && vpsData[selectedVP] && (
          <VPAnalytics 
            vp={vpsData[selectedVP]} 
            projectName={selectedProject} 
            projectTotalWE={(typeof window !== 'undefined' && localStorage.getItem(`proj_total_we_${selectedProject}`)) ? Number(localStorage.getItem(`proj_total_we_${selectedProject}`)) || projectsData[selectedProject].totalWE : projectsData[selectedProject].totalWE}
            timeRangeDays={timeRangeDays}
          />
        )}
      </main>
    </div>
  )
}
