'use client'

import * as React from 'react'
import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase, UserContact, UserDirectory } from '../../lib/supabase'
import Head from 'next/head'

export default function ProjectMap() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectName = searchParams.get('project')
  
  useEffect(() => {
    document.title = 'Kartenansicht Dashboard'
  }, [])
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeProgress, setGeocodeProgress] = useState({ current: 0, total: 0 })
  const [debugInfo, setDebugInfo] = useState<string>('')
  const [cacheStats, setCacheStats] = useState({ hits: 0, misses: 0 })
  const mapRef = useRef<any>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  useEffect(() => {
    if (!projectName) {
      setError('Kein Projekt ausgewählt')
      setLoading(false)
      return
    }
    
    checkAuthAndLoad()
  }, [projectName])

  const checkAuthAndLoad = async () => {
    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      if (authError) throw authError
      if (!session) {
        router.push('/login')
        return
      }
      
      await loadMapData()
    } catch (err) {
      console.error('Auth check failed:', err)
      setError('Authentifizierung fehlgeschlagen')
      setLoading(false)
    }
  }

  const loadMapData = async () => {
    try {
      setLoading(true)
      
      // Load contacts and user directory
      const { data: contacts, error: contactsError } = await supabase
        .from('user_contacts')
        .select('user_id, contacts')
      
      if (contactsError) throw contactsError

      const { data: users, error: usersError } = await supabase
        .from('user_directory')
        .select('user_id, email, display_name')
      
      if (usersError) throw usersError

      const userDirectory: { [key: string]: UserDirectory } = {}
      ;(users || []).forEach(user => {
        userDirectory[user.user_id] = user
      })

      // Filter addresses with completions for this project
      const completionStatuses = ['abschluss', 'abschluss-vp-anderer', 'online-abschluss', 'ts-abschluss']
      const addressesToMap: any[] = []
      const debugStats = {
        totalContacts: 0,
        projectContacts: 0,
        totalResidents: 0,
        matchingResidents: 0,
        statusBreakdown: {} as any
      }

      ;(contacts || []).forEach(userContact => {
        const userId = userContact.user_id
        const vpName = userDirectory[userId]?.display_name || userDirectory[userId]?.email || 'Unbekannt'
        const contactList = userContact.contacts || []

        contactList.forEach((contact: any) => {
          debugStats.totalContacts++
          
          const ort = (contact.ort || contact.Ort || '').toString().trim()
          const projectNameNorm = (projectName || '').toString().trim()
          
          // Flexible matching: exact or case-insensitive
          if (ort.toLowerCase() !== projectNameNorm.toLowerCase()) return
          
          debugStats.projectContacts++

          const residents = contact.residents || {}
          Object.keys(residents).forEach(resKey => {
            debugStats.totalResidents++
            
            const resident = residents[resKey]
            const status = (resident.status || '').toString().trim().toLowerCase()
            
            // Track all statuses
            debugStats.statusBreakdown[status] = (debugStats.statusBreakdown[status] || 0) + 1
            
            // Check if status matches (case-insensitive)
            const isMatch = completionStatuses.some(cs => cs.toLowerCase() === status)
            
            if (isMatch) {
              debugStats.matchingResidents++
              
              const addrObj = {
                plz: contact.plz || contact.PLZ || '',
                ort: contact.ort || contact.Ort || '',
                strasse: contact.strasse || contact.straße || contact.Straße || contact.Strasse || '',
                hausnummer: contact.nummer || contact.Nummer || contact.hausnummer || contact.hnr || '',
                zusatz: contact.adresszusatz || contact.Zusatz || '',
                we: contact.we || contact.WE || 1,
                status: status,
                vpName: vpName,
                residentKey: resKey
              }
              
              // Debug: Log first few addresses to check structure
              if (addressesToMap.length < 3) {
                console.log(`[Address ${addressesToMap.length + 1}]`, {
                  strasse: addrObj.strasse,
                  hausnummer: addrObj.hausnummer,
                  plz: addrObj.plz,
                  ort: addrObj.ort
                })
              }
              
              addressesToMap.push(addrObj)
            }
          })
        })
      })

      console.log(`[Map] Debug Stats für ${projectName}:`, debugStats)
      console.log(`[Map] Gefunden: ${addressesToMap.length} Adressen mit Abschlüssen`)
      console.log(`[Map] Status-Verteilung:`, debugStats.statusBreakdown)
      
      // DEBUG: Log raw contact structure to find where house numbers are
      if (contacts && contacts.length > 0) {
        const sampleContact = contacts.find(c => {
          const contactList = c.contacts || []
          return contactList.some((contact: any) => {
            const ort = (contact.ort || contact.Ort || '').toString().trim()
            return ort.toLowerCase() === (projectName || '').toLowerCase()
          })
        })
        
        if (sampleContact) {
          console.log('🔍 [DEBUG] Sample Contact Structure:', sampleContact)
          const projectContact = (sampleContact.contacts || []).find((c: any) => {
            const ort = (c.ort || c.Ort || '').toString().trim()
            return ort.toLowerCase() === (projectName || '').toLowerCase()
          })
          if (projectContact) {
            console.log('🔍 [DEBUG] Sample Project Contact:', projectContact)
            console.log('🔍 [DEBUG] Available keys in contact:', Object.keys(projectContact))
          }
        }
      }
      
      // Deduplicate addresses (same address, different residents should still show)
      // but log for debugging
      const uniqueAddresses = new Set(addressesToMap.map(a => `${a.strasse}|${a.hausnummer}|${a.plz}|${a.ort}`))
      console.log(`[Map] Eindeutige Adressen: ${uniqueAddresses.size}`)
      
      // Set debug info for UI
      let debugText = `📊 Gefundene Daten für "${projectName}":\n`
      debugText += `- Gesamt Kontakte: ${debugStats.totalContacts}\n`
      debugText += `- Kontakte in ${projectName}: ${debugStats.projectContacts}\n`
      debugText += `- Gesamt Residents: ${debugStats.totalResidents}\n`
      debugText += `- Abschlüsse gefunden: ${debugStats.matchingResidents}\n`
      debugText += `- Eindeutige Adressen: ${uniqueAddresses.size}\n\n`
      debugText += `📋 Status-Verteilung:\n`
      Object.entries(debugStats.statusBreakdown).forEach(([status, count]) => {
        debugText += `  • ${status}: ${count}\n`
      })
      setDebugInfo(debugText)
      
      if (addressesToMap.length === 0) {
        console.warn(`[Map] Keine Adressen gefunden! Prüfen Sie:`)
        console.warn(`- Projektname stimmt: "${projectName}"`)
        console.warn(`- Verfügbare Status: ${Object.keys(debugStats.statusBreakdown).join(', ')}`)
        console.warn(`- Erwartet: abschluss, abschluss-vp-anderer, online-abschluss, ts-abschluss`)
      }
      
      // Initialize map
      initializeMap(addressesToMap)
      
    } catch (err) {
      console.error('Error loading map data:', err)
      setError('Fehler beim Laden der Kartendaten')
      setLoading(false)
    }
  }

  const initializeMap = async (addresses: any[]) => {
    if (typeof window === 'undefined') return

    // Dynamically load Leaflet
    const L = (window as any).L
    if (!L) {
      // Load Leaflet if not already loaded
      await loadLeaflet()
      return initializeMap(addresses)
    }

    if (!mapInstanceRef.current && mapRef.current) {
      // Create map centered on Germany
      const map = L.map(mapRef.current).setView([51.1657, 10.4515], 6)
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map)

      mapInstanceRef.current = map
    }

    setLoading(false)
    
    // Geocode and add markers
    await geocodeAndAddMarkers(addresses)
  }

  const loadLeaflet = () => {
    return new Promise((resolve, reject) => {
      if ((window as any).L) {
        resolve(true)
        return
      }

      // Add CSS
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)

      // Add JS
      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = () => resolve(true)
      script.onerror = reject
      document.head.appendChild(script)
    })
  }

  const geocodeAddress = async (address: any): Promise<{ lat: number; lon: number } | null> => {
    // Normalize address for consistent cache key
    const normalizeStr = (s: string) => s.toString().trim().toLowerCase().replace(/\s+/g, ' ')
    const strasse = normalizeStr(address.strasse)
    const hausnummer = normalizeStr(address.hausnummer)
    const plz = normalizeStr(address.plz)
    const ort = normalizeStr(address.ort)
    
    const cacheKey = `geocode_${strasse}_${hausnummer}_${plz}_${ort}`
    
    // Check localStorage cache first
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      try {
        const coords = JSON.parse(cached)
        console.log(`[Cache HIT] ${address.strasse} ${address.hausnummer}, ${address.ort}`)
        return coords
      } catch (e) {
        console.warn('Cache parse error:', e)
        localStorage.removeItem(cacheKey) // Remove corrupt cache
      }
    }

    console.log(`[Cache MISS] Geocoding: ${address.strasse} ${address.hausnummer}, ${address.ort}`)

    // Geocode with Nominatim
    try {
      const streetWithNumber = `${address.strasse} ${address.hausnummer}`.trim()
      console.log(`[Geocode] Full address string: "${streetWithNumber}, ${address.plz} ${address.ort}"`)
      
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=de&accept-language=de&street=${encodeURIComponent(streetWithNumber)}&city=${encodeURIComponent(address.ort)}&postalcode=${encodeURIComponent(address.plz)}`
      
      console.log(`[Geocode] API URL: ${url}`)
      
      const response = await fetch(url, {
        headers: { 'User-Agent': 'QualifizierungsDashboard/1.0' }
      })

      if (!response.ok) {
        console.warn(`[Geocode] HTTP ${response.status} for ${address.strasse}`)
        return null
      }

      const results = await response.json()
      if (results && results.length > 0) {
        const result = results[0]
        const coords = { lat: parseFloat(result.lat), lon: parseFloat(result.lon) }
        
        // Cache result in localStorage
        try {
          localStorage.setItem(cacheKey, JSON.stringify(coords))
          console.log(`[Cache SAVE] ${address.strasse} ${address.hausnummer} → ${coords.lat}, ${coords.lon}`)
        } catch (e) {
          console.warn('Cache save error (quota?)', e)
        }
        
        return coords
      }

      console.warn(`[Geocode] No results for ${address.strasse} ${address.hausnummer}, ${address.ort}`)
      return null
    } catch (err) {
      console.error('Geocoding error:', err)
      return null
    }
  }

  const geocodeAndAddMarkers = async (addresses: any[]) => {
    if (!mapInstanceRef.current) return
    
    const L = (window as any).L
    setGeocoding(true)

    let cacheHits = 0
    let cacheMisses = 0
    
    // Group addresses ONLY by exact same location (Straße + Hausnummer + PLZ)
    // Multiple residents in same building will be grouped
    const addressGroups = new Map<string, any[]>()
    
    for (const address of addresses) {
      const normalizeStr = (s: string) => s.toString().trim().toLowerCase().replace(/\s+/g, ' ')
      // Include hausnummer in key to ensure each house number is separate
      const locationKey = `${normalizeStr(address.strasse)}_${normalizeStr(address.hausnummer)}_${normalizeStr(address.plz)}_${normalizeStr(address.ort)}`
      
      if (!addressGroups.has(locationKey)) {
        addressGroups.set(locationKey, [])
      }
      addressGroups.get(locationKey)!.push(address)
    }
    
    console.log(`[Map] Gruppiere ${addresses.length} Abschlüsse in ${addressGroups.size} eindeutige Adressen`)
    console.log(`[Map] Beispiele:`, Array.from(addressGroups.keys()).slice(0, 3))
    
    setGeocodeProgress({ current: 0, total: addressGroups.size })
    
    let processedGroups = 0

    // Process each unique address
    for (const [locationKey, groupedAddresses] of Array.from(addressGroups.entries())) {
      processedGroups++
      setGeocodeProgress({ current: processedGroups, total: addressGroups.size })
      
      const firstAddress = groupedAddresses[0]
      const normalizeStr = (s: string) => s.toString().trim().toLowerCase().replace(/\s+/g, ' ')
      const cacheKey = `geocode_${locationKey}`
      const wasCached = !!localStorage.getItem(cacheKey)
      
      const coords = await geocodeAddress(firstAddress)
      
      if (wasCached && coords) {
        cacheHits++
      } else if (!wasCached && coords) {
        cacheMisses++
      }
      
      if (coords) {
        // Count by status type
        const greenCount = groupedAddresses.filter(a => 
          a.status === 'abschluss' || a.status === 'abschluss-vp-anderer'
        ).length
        const blueCount = groupedAddresses.filter(a => 
          a.status === 'online-abschluss' || a.status === 'ts-abschluss'
        ).length
        
        // Determine dominant color and size
        let color = greenCount >= blueCount ? '#10b981' : '#3b82f6'
        const totalCount = groupedAddresses.length
        const radius = totalCount === 1 ? 6 : Math.min(6 + totalCount * 1.5, 20)

        // Create marker with size based on count
        const marker = L.circleMarker([coords.lat, coords.lon], {
          radius: radius,
          fillColor: color,
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.7
        }).addTo(mapInstanceRef.current)

        // Add label with count if > 1
        if (totalCount > 1) {
          const divIcon = L.divIcon({
            className: 'marker-label',
            html: `<div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background: white;
              color: ${color};
              font-weight: bold;
              font-size: 11px;
              width: ${radius * 1.5}px;
              height: ${radius * 1.5}px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 2px solid ${color};
              pointer-events: none;
            ">${totalCount}</div>`,
            iconSize: [radius * 2, radius * 2],
            iconAnchor: [radius, radius]
          })
          
          L.marker([coords.lat, coords.lon], { icon: divIcon }).addTo(mapInstanceRef.current)
        }

        // Build popup with all residents at this address
        let popupContent = `
          <div style="font-size: 13px; max-height: 300px; overflow-y: auto;">
            <strong style="font-size: 14px;">${firstAddress.strasse} ${firstAddress.hausnummer}</strong><br>
            <span style="color: #6b7280;">${firstAddress.plz} ${firstAddress.ort}</span>
            <hr style="margin: 8px 0; border: none; border-top: 1px solid #e5e7eb;">
            <div style="margin-bottom: 4px;">
              <strong>Abschlüsse:</strong> ${totalCount}
              ${greenCount > 0 ? `<span style="color: #10b981;"> • ${greenCount} Standard</span>` : ''}
              ${blueCount > 0 ? `<span style="color: #3b82f6;"> • ${blueCount} Online/TS</span>` : ''}
            </div>
            <hr style="margin: 8px 0; border: none; border-top: 1px solid #e5e7eb;">
        `
        
        // List all residents
        groupedAddresses.forEach((addr, idx) => {
          const statusColor = (addr.status === 'online-abschluss' || addr.status === 'ts-abschluss') ? '#3b82f6' : '#10b981'
          popupContent += `
            <div style="margin: 6px 0; padding: 6px; background: #f9fafb; border-radius: 4px; border-left: 3px solid ${statusColor};">
              <div style="font-weight: 600;">Wohnung ${addr.residentKey}</div>
              <div style="font-size: 12px; color: #6b7280;">
                VP: ${addr.vpName}<br>
                Status: ${addr.status}<br>
                WE: ${addr.we}
              </div>
            </div>
          `
        })
        
        popupContent += '</div>'
        
        marker.bindPopup(popupContent, { maxWidth: 300 })
        markersRef.current.push(marker)
      }

      // Rate limiting - nur für neue Geocoding-Anfragen
      if (!wasCached) {
        await new Promise(resolve => setTimeout(resolve, 1200))
      }
    }

    setGeocoding(false)
    setCacheStats({ hits: cacheHits, misses: cacheMisses })
    
    // Fit map to markers
    if (markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current)
      mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1))
    }

    console.log(`[Map] ${addressGroups.size} eindeutige Adressen mit ${addresses.length} Abschlüssen geokodiert`)
    console.log(`[Cache] Hits: ${cacheHits}, Misses: ${cacheMisses}, Rate: ${cacheHits > 0 ? ((cacheHits/(cacheHits+cacheMisses))*100).toFixed(1) : 0}%`)
  }

  const goBack = () => {
    router.push('/')
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: '#dc2626' }}>Fehler</h2>
        <p>{error}</p>
        <button onClick={goBack} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>
          Zurück zum Dashboard
        </button>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: 'white', padding: '1rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>
            🗺️ Abschlüsse-Karte: {projectName}
          </h1>
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
            <span style={{ display: 'inline-block', marginRight: '1rem' }}>
              <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: '#10b981', marginRight: 4 }}></span>
              Abschluss / Abschluss VP-anderer
            </span>
            <span style={{ display: 'inline-block' }}>
              <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: '#3b82f6', marginRight: 4 }}></span>
              Online-Abschluss / TS-Abschluss
            </span>
          </div>
          {cacheStats.hits + cacheStats.misses > 0 && (
            <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.25rem' }}>
              💾 Cache: {cacheStats.hits} Treffer, {cacheStats.misses} neu geladen
              {cacheStats.hits > 0 && ` (${((cacheStats.hits/(cacheStats.hits+cacheStats.misses))*100).toFixed(0)}% aus Cache)`}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
          {debugInfo && (
            <button
              onClick={() => alert(debugInfo)}
              style={{ padding: '0.5rem 1rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.875rem' }}
            >
              📊 Debug-Info
            </button>
          )}
          <button 
            onClick={goBack}
            style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            ← Zurück
          </button>
        </div>
      </div>

      {/* Loading overlay */}
      {(loading || geocoding) && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              {loading ? 'Lade Kartendaten...' : 'Geokodiere Adressen...'}
            </div>
            {geocoding && (
              <div>
                <div style={{ marginBottom: '0.5rem' }}>
                  {geocodeProgress.current} / {geocodeProgress.total}
                </div>
                <div style={{ width: '300px', height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${(geocodeProgress.current / geocodeProgress.total) * 100}%`, 
                    height: '100%', 
                    background: '#3b82f6',
                    transition: 'width 0.3s'
                  }}></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Map */}
      <div ref={mapRef} style={{ flex: 1, width: '100%' }}></div>
    </div>
  )
}
