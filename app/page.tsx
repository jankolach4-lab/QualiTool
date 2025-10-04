'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, UserContact, UserDirectory, ProjectData, VPData, Resident, StatusHistoryEntry, TimelineEvent } from '../lib/supabase'
import DashboardHeader from '../components/DashboardHeader'
import OverviewSection from '../components/OverviewSection'
import ProjectsTable from '../components/ProjectsTable'
import ProjectAnalytics from '../components/ProjectAnalytics'
import VPTable from '../components/VPTable'
import VPAnalytics from '../components/VPAnalytics'
import ProjectProjection from '../components/ProjectProjection'

export default function Dashboard() {
  const router = useRouter()
  
  // State
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [allContacts, setAllContacts] = useState<UserContact[]>([])
  const [userDirectory, setUserDirectory] = useState<{ [key: string]: UserDirectory }>({})
  const [projectsData, setProjectsData] = useState<{ [key: string]: ProjectData }>({})
  const [vpsData, setVpsData] = useState<{ [key: string]: VPData }>({})
  const [selectedProject, setSelectedProject] = useState<string>()
  const [selectedVP, setSelectedVP] = useState<string>()
  const [timeRangeDays, setTimeRangeDays] = useState<number>(30)

  // Auth Check
  useEffect(() => {
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error
      if (!session) {
        router.push('/login')
        return false
      }
      await loadData()
      return true
    } catch (error) {
      console.error('Auth check failed:', error)
      setError('Authentifizierung fehlgeschlagen')
      return false
    }
  }

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
      setError('Fehler beim Abmelden')
    }
  }

  // Load User Directory
  const loadUserDirectory = async () => {
    try {
      const { data: users, error } = await supabase
        .from('user_directory')
        .select('user_id, email, display_name')
      if (error) throw error
      const directory: { [key: string]: UserDirectory } = {}
      ;(users || []).forEach(user => {
        directory[user.user_id] = user
      })
      setUserDirectory(directory)
    } catch (error) {
      console.error('Error loading user directory:', error)
      setUserDirectory({})
    }
  }

  // Load Contacts
  const loadContacts = async () => {
    try {
      const { data: contacts, error } = await supabase
        .from('user_contacts')
        .select('user_id, contacts, created_at, updated_at')
      if (error) throw error
      setAllContacts(contacts || [])
    } catch (error) {
      console.error('Error loading contacts:', error)
      setAllContacts([])
    }
  }

  // Enhanced Processing using status + statusHistory
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
        const weCount = (contactItem as any).we || 0

        if (!projects[project]) {
          projects[project] = {
            name: project,
            totalWE: 0,
            vps: new Set(),
            completions: 0,
            statusCounts: {},
            dailyStats: {},
            hourlyStats: {},
            totalStatusChanges: 0,
            weWithStatus: 0,
            events: []
          }
        }

        if (!vps[vpId]) {
          vps[vpId] = {
            id: vpId,
            name: vpName,
            email: userInfo?.email || '',
            totalWE: 0,
            completions: 0,
            totalChanges: 0,
            statusCounts: {},
            dailyStats: {},
            hourlyStats: {},
            projects: new Set(),
            totalStatusChanges: 0,
            weWithStatus: 0,
            events: []
          }
        }

        vps[vpId].projects.add(project)
        projects[project].vps.add(vpId)

        projects[project].totalWE += weCount
        vps[vpId].totalWE += weCount

        const residents = (contactItem as any).residents || {}
        Object.values(residents as any).forEach((resident: any) => {
          if (resident.status) {
            projects[project].statusCounts[resident.status] = (projects[project].statusCounts[resident.status] || 0) + 1
            vps[vpId].statusCounts[resident.status] = (vps[vpId].statusCounts[resident.status] || 0) + 1
            projects[project].weWithStatus++
            vps[vpId].weWithStatus++
            if (resident.status === 'abschluss') {
              projects[project].completions++
              vps[vpId].completions++
            }
          }
          if (resident.statusHistory && Array.isArray(resident.statusHistory)) {
            ;(resident.statusHistory as StatusHistoryEntry[]).forEach((historyEntry) => {
              if (historyEntry.date && historyEntry.status) {
                const date = new Date(historyEntry.date)
                const dateKey = date.toISOString().split('T')[0]
                const hour = date.getHours()

                if (!projects[project].dailyStats[dateKey]) {
                  projects[project].dailyStats[dateKey] = { completions: 0, statusChanges: 0 }
                }
                if (!vps[vpId].dailyStats[dateKey]) {
                  vps[vpId].dailyStats[dateKey] = { completions: 0, statusChanges: 0 }
                }
                if (!projects[project].hourlyStats[hour]) projects[project].hourlyStats[hour] = 0
                if (!vps[vpId].hourlyStats[hour]) vps[vpId].hourlyStats[hour] = 0

                projects[project].dailyStats[dateKey].statusChanges++
                vps[vpId].dailyStats[dateKey].statusChanges++
                projects[project].totalStatusChanges++
                vps[vpId].totalStatusChanges++

                projects[project].hourlyStats[hour]++
                vps[vpId].hourlyStats[hour]++

                if (historyEntry.status === 'abschluss') {
                  projects[project].dailyStats[dateKey].completions++
                  vps[vpId].dailyStats[dateKey].completions++
                }

                const ev: TimelineEvent = { dateKey, hour, status: historyEntry.status }
                projects[project].events?.push(ev)
                vps[vpId].events?.push(ev)
              }
            })
          }
        })
      })
    })

    setProjectsData(projects)
    setVpsData(vps)
  }

  // Main load function
  const loadData = async () => {
    try {
      setLoading(true)
      setError('')
      await loadUserDirectory()
      await loadContacts()
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Fehler beim Laden der Daten: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // Re-process when data changes
  useEffect(() => {
    if (allContacts.length > 0 && Object.keys(userDirectory).length > 0) {
      processRealData(allContacts, userDirectory)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allContacts, userDirectory])

  const showDebug = async () => {
    let debugInfo = '🐛 Extended Debug Information\n\n'
    try {
      const { data: allUserContacts } = await supabase.from('user_contacts').select('*')
      debugInfo += `📊 user_contacts: ${allUserContacts?.length || 0}\n`
      const { data: allUserDirectory } = await supabase.from('user_directory').select('*')
      debugInfo += `📇 user_directory: ${allUserDirectory?.length || 0}\n`
      const { data: { user } } = await supabase.auth.getUser()
      debugInfo += `👤 User: ${user?.email || user?.id || 'None'}\n`
    } catch (error) {
      debugInfo += `❌ Debug query error: ${(error as Error).message}\n\n`
    }
    debugInfo += `Projekte: ${Object.keys(projectsData).length}, VPs: ${Object.keys(vpsData).length}\n`
    alert(debugInfo)
    console.log(debugInfo)
  }

  const totalProjects = Object.keys(projectsData).length
  const totalVPs = Object.keys(vpsData).length
  const totalWE = Object.values(projectsData).reduce((sum, project) => sum + project.totalWE, 0)

  if (loading) {
    return (
      <div className="loading">Dashboard wird geladen...</div>
    )
  }

  return (
    <div>
      <DashboardHeader 
        onRefresh={loadData}
        onDebug={showDebug}
        onLogout={logout}
        timeRangeDays={timeRangeDays}
        onTimeRangeChange={setTimeRangeDays}
      />
      
      <main className="main">
        {error && (
          <div className="alert alert-error">{error}</div>
        )}

        <OverviewSection 
          totalProjects={totalProjects}
          totalVPs={totalVPs}
          totalWE={totalWE}
        />

        <ProjectsTable 
          projects={projectsData}
          onSelectProject={(projectName) => { setSelectedProject(projectName); setSelectedVP(undefined); }}
          selectedProject={selectedProject}
        />

        {selectedProject && projectsData[selectedProject] && (
          <>
            <ProjectAnalytics 
              project={projectsData[selectedProject]}
              vpsData={vpsData}
              timeRangeDays={timeRangeDays}
            />
            <ProjectProjection project={projectsData[selectedProject]} />
            <VPTable 
              project={projectsData[selectedProject]}
              vps={vpsData}
              onSelectVP={setSelectedVP}
              selectedVP={selectedVP}
            />
          </>
        )}

        {selectedVP && vpsData[selectedVP] && (
          <VPAnalytics vp={vpsData[selectedVP]} timeRangeDays={timeRangeDays} />
        )}
      </main>
    </div>
  )
}
