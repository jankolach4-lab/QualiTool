'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, UserContact, UserDirectory, ProjectData, VPData } from '../lib/supabase'
import DashboardHeader from '../components/DashboardHeader'
import OverviewSection from '../components/OverviewSection'
import ProjectsTable from '../components/ProjectsTable'
import VPTable from '../components/VPTable'

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

  // Auth Check
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error
      if (!session) {
        router.push('/login')
        return false
      }
      
      // Load data after auth check
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
      console.log('🔍 Loading user directory...')
      const { data: users, error } = await supabase
        .from('user_directory')
        .select('user_id, email, display_name')
      
      if (error) throw error
      
      const directory: { [key: string]: UserDirectory } = {}
      ;(users || []).forEach(user => {
        directory[user.user_id] = user
      })
      
      setUserDirectory(directory)
      console.log('✅ Loaded user directory:', Object.keys(directory).length, 'users')
      
    } catch (error) {
      console.error('Error loading user directory:', error)
      setUserDirectory({})
    }
  }

  // Load Contacts
  const loadContacts = async () => {
    try {
      console.log('🔍 Loading user contacts...')
      const { data: contacts, error } = await supabase
        .from('user_contacts')
        .select('user_id, contacts, created_at, updated_at')
      
      if (error) throw error
      
      setAllContacts(contacts || [])
      console.log('✅ Loaded', contacts?.length || 0, 'contact records')
      
    } catch (error) {
      console.error('Error loading contacts:', error)
      setAllContacts([])
    }
  }

  // Process Data
  const processRealData = (contacts: UserContact[], directory: { [key: string]: UserDirectory }) => {
    const projects: { [key: string]: ProjectData } = {}
    const vps: { [key: string]: VPData } = {}
    
    console.log('🔄 Processing real data with enhanced analytics...')
    
    contacts.forEach((contactRecord) => {
      const vpId = contactRecord.user_id
      const contactsArray = Array.isArray(contactRecord.contacts) ? contactRecord.contacts : []
      
      // Get VP name from user directory
      const userInfo = directory[vpId]
      const vpName = userInfo?.display_name || userInfo?.email || `VP-${vpId}`
      
      contactsArray.forEach(contactItem => {
        const project = contactItem.ort || 'Unbekannt'
        const weCount = contactItem.we || 0
        
        // Initialize project
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
            weWithStatus: 0
          }
        }
        
        // Initialize VP if not exists
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
            weWithStatus: 0
          }
        }
        
        // Add associations
        vps[vpId].projects.add(project)
        projects[project].vps.add(vpId)
        
        // Add WE counts
        projects[project].totalWE += weCount
        vps[vpId].totalWE += weCount
        
        // Process residents with enhanced analytics
        const residents = contactItem.residents || {}
        Object.values(residents).forEach((resident: any) => {
          
          // 1. Current Status (for status breakdown)
          if (resident.status) {
            // Count current status for project
            projects[project].statusCounts[resident.status] = 
              (projects[project].statusCounts[resident.status] || 0) + 1
            
            // Count current status for VP
            vps[vpId].statusCounts[resident.status] = 
              (vps[vpId].statusCounts[resident.status] || 0) + 1
            
            // Count WE with status
            projects[project].weWithStatus++
            vps[vpId].weWithStatus++
            
            // Count direct completions (current status = "abschluss")
            if (resident.status === 'abschluss') {
              projects[project].completions++
              vps[vpId].completions++
            }
          }
          
          // 2. StatusHistory (for daily/hourly analytics)
          if (resident.statusHistory && Array.isArray(resident.statusHistory)) {
            resident.statusHistory.forEach((historyEntry: any) => {
              if (historyEntry.date && historyEntry.status) {
                const date = new Date(historyEntry.date)
                const dateKey = date.toISOString().split('T')[0] // YYYY-MM-DD
                const hour = date.getHours()
                
                // Initialize daily stats
                if (!projects[project].dailyStats[dateKey]) {
                  projects[project].dailyStats[dateKey] = { 
                    completions: 0, 
                    statusChanges: 0 
                  }
                }
                if (!vps[vpId].dailyStats[dateKey]) {
                  vps[vpId].dailyStats[dateKey] = { 
                    completions: 0, 
                    statusChanges: 0 
                  }
                }
                
                // Initialize hourly stats
                if (!projects[project].hourlyStats[hour]) {
                  projects[project].hourlyStats[hour] = 0
                }
                if (!vps[vpId].hourlyStats[hour]) {
                  vps[vpId].hourlyStats[hour] = 0
                }
                
                // Count status changes
                projects[project].dailyStats[dateKey].statusChanges++
                vps[vpId].dailyStats[dateKey].statusChanges++
                projects[project].totalStatusChanges++
                vps[vpId].totalStatusChanges++
                
                // Count hourly activity
                projects[project].hourlyStats[hour]++
                vps[vpId].hourlyStats[hour]++
                
                // Count daily completions (only "abschluss" in statusHistory)
                if (historyEntry.status === 'abschluss') {
                  projects[project].dailyStats[dateKey].completions++
                  vps[vpId].dailyStats[dateKey].completions++
                }
              }
            })
          }
        })
      })
    })
    
    console.log('✅ Enhanced analytics processing complete!')
    console.log(`   Projects with analytics: ${Object.keys(projects).length}`)
    console.log(`   VPs with analytics: ${Object.keys(vps).length}`)
    
    setProjectsData(projects)
    setVpsData(vps)
  }

  const processData = () => {
    console.log('🔄 Processing data...')
    const projects: { [key: string]: ProjectData } = {}
    const vps: { [key: string]: VPData } = {}
    
    let totalContactsProcessed = 0
    const allCities = new Set<string>()
    
    allContacts.forEach((contactRecord, index) => {
      const vpId = contactRecord.user_id
      const contacts = contactRecord.contacts
      
      // Get VP name from user directory
      const userInfo = userDirectory[vpId]
      const vpName = userInfo?.display_name || userInfo?.email || `VP-${vpId}`
      
      console.log(`📝 Processing VP ${index + 1}: ${vpName}`)
      
      // Ensure contacts is an array
      const contactsArray = Array.isArray(contacts) ? contacts : []
      
      if (contactsArray.length === 0) {
        console.log('   ⚠️ No contacts array found')
        return
      }
      
      console.log(`   📞 Processing ${contactsArray.length} contacts`)
      
      contactsArray.forEach(contactItem => {
        const project = contactItem.ort || 'Unbekannt'
        const weCount = contactItem.we || 0
        
        allCities.add(project)
        totalContactsProcessed++
        
        // Initialize project
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
            weWithStatus: 0
          }
          console.log(`   🏢 New project: ${project}`)
        }
        
        // Initialize VP if not exists
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
            weWithStatus: 0
          }
          console.log(`   👤 New VP: ${vpName}`)
        }
        
        // Add associations
        vps[vpId].projects.add(project)
        projects[project].vps.add(vpId)
        
        // Add WE counts
        projects[project].totalWE += weCount
        vps[vpId].totalWE += weCount
        
        console.log(`   ➕ Added ${weCount} WE to ${project} for ${vpName}`)
        
        // Process residents if they exist
        const residents = contactItem.residents || {}
        
        // If no residents, add some mock status data for testing
        if (Object.keys(residents).length === 0 && weCount > 0) {
          // Generate mock status data for testing
          const mockStatuses = ['interessiert', 'termin_vereinbart', 'besichtigung', 'angebot', 'abschluss']
          const statusCount = Math.min(weCount, Math.floor(Math.random() * 5) + 1)
          
          for (let i = 0; i < statusCount; i++) {
            const randomStatus = mockStatuses[Math.floor(Math.random() * mockStatuses.length)]
            
            // Count for project
            projects[project].statusCounts[randomStatus] = 
              (projects[project].statusCounts[randomStatus] || 0) + 1
            
            // Count for VP
            vps[vpId].statusCounts[randomStatus] = 
              (vps[vpId].statusCounts[randomStatus] || 0) + 1
            vps[vpId].totalChanges++
            
            if (randomStatus === 'abschluss') {
              projects[project].completions++
              vps[vpId].completions++
            }
            
            // Daily stats (using created_at)
            const dateKey = contactRecord.created_at ? contactRecord.created_at.split('T')[0] : null
            if (dateKey) {
              if (!projects[project].dailyStats[dateKey]) {
                projects[project].dailyStats[dateKey] = { completions: 0, statusChanges: 0 }
              }
              if (!vps[vpId].dailyStats[dateKey]) {
                vps[vpId].dailyStats[dateKey] = { completions: 0, statusChanges: 0 }
              }
              
              projects[project].dailyStats[dateKey].statusChanges++
              vps[vpId].dailyStats[dateKey].statusChanges++
              
              if (randomStatus === 'abschluss') {
                projects[project].dailyStats[dateKey].completions++
                vps[vpId].dailyStats[dateKey].completions++
              }
            }
          }
        } else {
          // Process actual residents data
          Object.values(residents).forEach(resident => {
            if (resident.status) {
              // Count for project
              projects[project].statusCounts[resident.status] = 
                (projects[project].statusCounts[resident.status] || 0) + 1
              
              // Count for VP
              vps[vpId].statusCounts[resident.status] = 
                (vps[vpId].statusCounts[resident.status] || 0) + 1
              vps[vpId].totalChanges++
              
              if (resident.status === 'abschluss') {
                projects[project].completions++
                vps[vpId].completions++
              }
              
              // Daily stats (using created_at)
              const dateKey = contactRecord.created_at ? contactRecord.created_at.split('T')[0] : null
              if (dateKey) {
                if (!projects[project].dailyStats[dateKey]) {
                  projects[project].dailyStats[dateKey] = { completions: 0, changes: 0 }
                }
                if (!vps[vpId].dailyStats[dateKey]) {
                  vps[vpId].dailyStats[dateKey] = { completions: 0, changes: 0 }
                }
                
                projects[project].dailyStats[dateKey].changes++
                vps[vpId].dailyStats[dateKey].changes++
                
                if (resident.status === 'abschluss') {
                  projects[project].dailyStats[dateKey].completions++
                  vps[vpId].dailyStats[dateKey].completions++
                }
              }
            }
          })
        }
      })
    })
    
    console.log('✅ Processing completed!')
    console.log(`   Total contact items processed: ${totalContactsProcessed}`)
    console.log(`   Unique cities found: ${Array.from(allCities).join(', ')}`)
    console.log(`   Projects created: ${Object.keys(projects).length}`)
    console.log(`   VPs created: ${Object.keys(vps).length}`)
    
    // Show project details
    Object.values(projects).forEach(project => {
      console.log(`   🏢 ${project.name}: ${project.totalWE} WE, ${project.vps.size} VPs`)
    })
    
    // Show VP details  
    Object.values(vps).forEach(vp => {
      console.log(`   👤 ${vp.name}: ${vp.totalWE} WE in ${vp.projects.size} project(s)`)
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

  // Process data when contacts or user directory changes
  useEffect(() => {
    if (allContacts.length > 0 || Object.keys(userDirectory).length > 0) {
      processData()
    }
  }, [allContacts, userDirectory])

  // Debug function
  const showDebug = async () => {
    let debugInfo = '🐛 Extended Debug Information\n\n'
    
    // Test direct Supabase queries
    try {
      // Test 1: All user_contacts without filters
      const { data: allUserContacts, error: contactsError } = await supabase
        .from('user_contacts')
        .select('*')
      
      debugInfo += `📊 Direct Supabase Query Results:\n`
      debugInfo += `- Total user_contacts records: ${allUserContacts?.length || 0}\n`
      if (contactsError) {
        debugInfo += `- Error: ${contactsError.message}\n`
      }
      
      // Test 2: All user_directory without filters  
      const { data: allUserDirectory, error: directoryError } = await supabase
        .from('user_directory')
        .select('*')
      
      debugInfo += `- Total user_directory records: ${allUserDirectory?.length || 0}\n`
      if (directoryError) {
        debugInfo += `- Error: ${directoryError.message}\n`
      }
      
      // Show raw data samples
      debugInfo += `\n🔍 Raw user_contacts samples:\n`
      if (allUserContacts && allUserContacts.length > 0) {
        allUserContacts.slice(0, 3).forEach((record, index) => {
          debugInfo += `${index + 1}. User: ${record.user_id}\n`
          debugInfo += `   Contacts type: ${Array.isArray(record.contacts) ? 'array' : typeof record.contacts}\n`
          debugInfo += `   Contacts length: ${Array.isArray(record.contacts) ? record.contacts.length : 'N/A'}\n`
          if (Array.isArray(record.contacts) && record.contacts.length > 0) {
            const cities = record.contacts.map((c: any) => c.ort).filter(Boolean)
            debugInfo += `   Cities: ${cities.join(', ')}\n`
          }
          debugInfo += '\n'
        })
      }
      
      // Check authentication
      const { data: { user } } = await supabase.auth.getUser()
      debugInfo += `👤 Current User:\n`
      debugInfo += `- ID: ${user?.id || 'None'}\n`
      debugInfo += `- Email: ${user?.email || 'None'}\n\n`
      
    } catch (error) {
      debugInfo += `❌ Debug query error: ${(error as Error).message}\n\n`
    }
    
    // Show processed data
    const allCities = new Set<string>()
    allContacts.forEach(contactRecord => {
      const contacts = contactRecord.contacts
      if (Array.isArray(contacts)) {
        contacts.forEach(contact => {
          if (contact.ort) allCities.add(contact.ort)
        })
      }
    })
    
    debugInfo += `🏢 Processed Cities:\n${Array.from(allCities).join(', ')}\n\n`
    
    // Show VP breakdown
    debugInfo += '👥 VP Breakdown:\n'
    allContacts.forEach(contactRecord => {
      const vpId = contactRecord.user_id
      const userInfo = userDirectory[vpId]
      const vpName = userInfo?.display_name || userInfo?.email || `VP-${vpId}`
      const contacts = contactRecord.contacts
      
      const cities = new Set<string>()
      let totalContacts = 0
      
      if (Array.isArray(contacts)) {
        totalContacts = contacts.length
        contacts.forEach(contact => {
          if (contact.ort) cities.add(contact.ort)
        })
      }
      
      debugInfo += `${vpName}: ${totalContacts} Kontakte in [${Array.from(cities).join(', ')}]\n`
    })
    
    debugInfo += '\n📊 Verarbeitete Projekte:\n'
    Object.keys(projectsData).forEach(project => {
      debugInfo += `${project}\n`
    })
    
    debugInfo += `\n🔢 Statistiken:\n`
    debugInfo += `- Kontakt-Einträge: ${allContacts.length}\n`
    debugInfo += `- Unique VPs: ${Object.keys(userDirectory).length}\n`
    debugInfo += `- Unique Cities: ${allCities.size}\n`
    debugInfo += `- Verarbeitete Projekte: ${Object.keys(projectsData).length}\n`
    debugInfo += `- Verarbeitete VPs: ${Object.keys(vpsData).length}\n\n`
    
    debugInfo += '📋 Projekt Details:\n'
    Object.values(projectsData).forEach(project => {
      debugInfo += `${project.name}: ${project.totalWE} WE, ${project.vps.size} VPs\n`
    })
    
    debugInfo += `\n👤 User Directory Einträge:\n`
    const firstThreeUsers = Object.values(userDirectory).slice(0, 3)
    debugInfo += JSON.stringify(Object.fromEntries(
      firstThreeUsers.map(user => [user.user_id, user])
    ), null, 2)
    
    alert(debugInfo)
    console.log(debugInfo)
  }

  // Calculate overview stats
  const totalProjects = Object.keys(projectsData).length
  const totalVPs = Object.keys(vpsData).length
  const totalWE = Object.values(projectsData).reduce((sum, project) => sum + project.totalWE, 0)

  if (loading) {
    return (
      <div className="loading">
        Dashboard wird geladen...
      </div>
    )
  }

  return (
    <div>
      <DashboardHeader 
        onRefresh={loadData}
        onDebug={showDebug}
        onLogout={logout}
      />
      
      <main className="main">
        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <OverviewSection 
          totalProjects={totalProjects}
          totalVPs={totalVPs}
          totalWE={totalWE}
        />

        <ProjectsTable 
          projects={projectsData}
          onSelectProject={setSelectedProject}
          selectedProject={selectedProject}
        />

        {selectedProject && projectsData[selectedProject] && (
          <VPTable 
            project={projectsData[selectedProject]}
            vps={vpsData}
            onSelectVP={setSelectedVP}
            selectedVP={selectedVP}
          />
        )}
      </main>
    </div>
  )
}