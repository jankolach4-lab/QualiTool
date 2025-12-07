'use client'

import * as React from 'react'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import * as XLSX from 'xlsx'

export default function AddressUnifier() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [finalData, setFinalData] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.title = 'Adress-Unifier - Dashboard'
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      if (authError) throw authError
      if (!session) {
        router.push('/login')
        return
      }
    } catch (err) {
      console.error('Auth check failed:', err)
      router.push('/login')
    }
  }

  // Intelligente Spaltensuche
  const findeSpalte = (header: any[], rows: any[][], exakterName: string, keywords: string[], inhaltCheck?: (values: string[]) => boolean) => {
    // 1. Exakter Name → absolute Priorität
    for (let i = 0; i < header.length; i++) {
      if (header[i].toString().trim().toUpperCase() === exakterName.toUpperCase()) {
        return { index: i, name: header[i], grund: `exakt "${exakterName}"` }
      }
    }

    // 2. Keywordsuche
    for (let i = 0; i < header.length; i++) {
      const h = header[i].toString().toLowerCase()
      if (keywords.some(k => h.includes(k))) {
        return { index: i, name: header[i], grund: 'Keyword' }
      }
    }

    // 3. Inhaltsanalyse
    if (inhaltCheck) {
      for (let i = 0; i < header.length; i++) {
        const values = rows.map(r => r[i] + '')
        if (inhaltCheck(values)) {
          return { index: i, name: header[i], grund: 'Inhaltsanalyse' }
        }
      }
    }

    return null
  }

  const processFile = (file: File) => {
    if (!file) return
    
    setLoading(true)
    const reader = new FileReader()
    
    reader.onload = function (e) {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array', raw: true, cellDates: false, cellText: false })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const json: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true })
        const header = json[0]
        const rows = json.slice(1).filter(r => r.some(c => c !== ''))

        const cols: any = {}

        // PLZ
        cols.PLZ = findeSpalte(header, rows, "PLZ",
          ['plz', 'postleitzahl', 'zip', 'postcode'],
          values => values.filter(v => /^\d{4,5}$/.test(v.trim())).length > values.length * 0.6
        )

        // Ort
        cols.Ort = findeSpalte(header, rows, "Ort",
          ['ort', 'stadt', 'city', 'gemeinde', 'town', 'ortsteil'],
          values => values.filter(v => /^[a-zA-ZäöüÄÖÜß\s-]+$/.test(v.trim()) && v.trim().length > 2).length > values.length * 0.7
        )

        // Straße
        cols.Straße = findeSpalte(header, rows, "Straße",
          ['straße', 'strasse', 'str.', 'street', 'road', 'weg', 'allee', 'platz', 'gasse', 'ring'],
          undefined
        )

        // Nummer
        cols.Nummer = findeSpalte(header, rows, "Nummer",
          ['nummer', 'nr', 'nr.', 'hnr', 'hausnummer', 'hausnr', 'no.', 'house number'],
          values => values.filter(v => /^\d+[a-zA-Z]?$/.test(v.trim())).length > values.length * 0.6
        )

        // Zusatz
        cols.Zusatz = findeSpalte(header, rows, "Zusatz",
          ['zusatz', 'buchstabe', 'buchst.', 'etage', 'top', 'block', 'anbau', 'apt', 'whg', 'wohnung'],
          values => values.filter(v => /^[a-zA-Z]+$/.test(v.trim()) && v.trim().length <= 3).length > values.length * 0.5
        )

        // WE – mit höchster Priorität
        cols.WE = findeSpalte(header, rows, "WE",
          ['we', 'wohneinheit', 'wohneinheiten', 'residents', 'units', 'mieter', 'anzahl we', 'potential we', 'gestattungs-we'],
          values => {
            let zahlen = 0, total = 0
            for (let v of values) {
              if (!v) continue
              total++
              const n = parseFloat(v)
              if (!isNaN(n) && n >= 1 && n <= 200) zahlen++
            }
            return total >= 20 && zahlen / total >= 0.7
          }
        )

        // Prüfen, ob alles gefunden wurde
        const fehlend = Object.keys(cols).filter(k => !cols[k])
        if (fehlend.length > 0 && fehlend.length < 5) {
          if (!confirm(`Folgende Spalten nicht eindeutig gefunden: ${fehlend.join(', ')}\nTrotzdem fortfahren?`)) {
            setLoading(false)
            return
          }
        }

        let statusHTML = `<strong>${file.name}</strong> – ${rows.length} Zeilen<br/><br/><strong>Erkannte Spalten:</strong><br/>`
        for (let key in cols) {
          const c = cols[key]
          statusHTML += `• <strong>${key}:</strong> ${c ? `"${c.name}" (${c.grund})` : '❌ nicht gefunden'}<br/>`
        }

        const processedData = rows.map(row => ({
          PLZ: cols.PLZ ? String(row[cols.PLZ.index] || '') : '',
          Ort: cols.Ort ? String(row[cols.Ort.index] || '') : '',
          Straße: cols.Straße ? String(row[cols.Straße.index] || '') : '',
          Nummer: cols.Nummer ? String(row[cols.Nummer.index] || '') : '',
          Zusatz: cols.Zusatz ? String(row[cols.Zusatz.index] || '') : '',
          WE: cols.WE ? String(row[cols.WE.index] || '') : ''
        }))

        setFinalData(processedData)
        setResult({
          fileName: file.name,
          rowCount: rows.length,
          statusHTML: statusHTML,
          preview: processedData.slice(0, 30)
        })
        setLoading(false)
      } catch (error) {
        console.error('Error processing file:', error)
        alert('Fehler beim Verarbeiten der Datei: ' + (error as Error).message)
        setLoading(false)
      }
    }

    reader.readAsArrayBuffer(file)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  const handleExport = () => {
    // Erstelle Worksheet
    const ws = XLSX.utils.json_to_sheet(finalData)
    
    // Forciere ALLE Zellen als Text, um automatische Konvertierung zu verhindern
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
        if (!ws[cellAddress]) continue
        
        // Setze alle Zellen explizit als Text (type 's')
        const cellValue = ws[cellAddress].v
        ws[cellAddress] = {
          t: 's',  // Type: String
          v: String(cellValue),  // Wert als String
          w: String(cellValue)   // Formatted value
        }
      }
    }
    
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Adressen")
    XLSX.writeFile(wb, "Adressen_bereinigt_final.xlsx", { bookType: 'xlsx', cellDates: false })
    alert(`FERTIG! ${finalData.length} Adressen exportiert – alles korrekt erkannt!`)
  }

  const goBack = () => {
    router.push('/')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f8ff', padding: '50px' }}>
      <div style={{ maxWidth: '1100px', margin: 'auto', background: 'white', padding: '50px', borderRadius: '20px', boxShadow: '0 15px 50px rgba(0,0,0,0.18)', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: '#16a085', fontSize: '36px', margin: 0 }}>Adress-Unifier ULTRA</h1>
          <button onClick={goBack} style={{ padding: '10px 20px', fontSize: '14px', background: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            ← Zurück zum Dashboard
          </button>
        </div>
        
        <p style={{ fontSize: '20px', color: '#34495e', marginBottom: '40px' }}>
          Lade deine Excel- oder CSV-Datei hoch – wir erkennen automatisch PLZ, Ort, Straße, Nummer, Zusatz und WE!
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {!result && (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            style={{
              border: '6px dashed #16a085',
              padding: '100px',
              borderRadius: '20px',
              background: '#f0fffa',
              fontSize: '28px',
              cursor: 'pointer',
              margin: '40px 0',
              transition: '0.3s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#d8f5f0'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#f0fffa'}
          >
            {loading ? '🔄 Verarbeite...' : '📂 Datei hier ablegen oder klicken zum Hochladen'}
          </div>
        )}

        {result && (
          <div id="result" style={{ marginTop: '40px' }}>
            <div
              className="status"
              style={{ padding: '30px', background: '#d8f5f0', borderRadius: '15px', fontSize: '20px', margin: '30px 0', borderLeft: '8px solid #16a085' }}
              dangerouslySetInnerHTML={{ __html: result.statusHTML }}
            />

            <div className="preview" style={{ overflowX: 'auto' }}>
              <table style={{ margin: '30px auto', width: '100%', borderCollapse: 'collapse', fontSize: '18px' }}>
                <thead>
                  <tr>
                    <th style={{ background: '#16a085', color: 'white', padding: '15px' }}>PLZ</th>
                    <th style={{ background: '#16a085', color: 'white', padding: '15px' }}>Ort</th>
                    <th style={{ background: '#16a085', color: 'white', padding: '15px' }}>Straße</th>
                    <th style={{ background: '#16a085', color: 'white', padding: '15px' }}>Nummer</th>
                    <th style={{ background: '#16a085', color: 'white', padding: '15px' }}>Zusatz</th>
                    <th style={{ background: '#16a085', color: 'white', padding: '15px' }}>WE</th>
                  </tr>
                </thead>
                <tbody>
                  {result.preview.map((row: any, idx: number) => (
                    <tr key={idx} style={{ background: idx % 2 === 0 ? '#f8f9fa' : 'white' }}>
                      <td style={{ padding: '12px', border: '1px solid #ccc', textAlign: 'center' }}>{row.PLZ}</td>
                      <td style={{ padding: '12px', border: '1px solid #ccc', textAlign: 'center' }}>{row.Ort}</td>
                      <td style={{ padding: '12px', border: '1px solid #ccc', textAlign: 'center' }}>{row.Straße}</td>
                      <td style={{ padding: '12px', border: '1px solid #ccc', textAlign: 'center' }}>{row.Nummer}</td>
                      <td style={{ padding: '12px', border: '1px solid #ccc', textAlign: 'center' }}>{row.Zusatz}</td>
                      <td style={{ padding: '12px', border: '1px solid #ccc', textAlign: 'center' }}>{row.WE}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={handleExport}
              style={{ padding: '22px 100px', fontSize: '26px', background: '#16a085', color: 'white', border: 'none', borderRadius: '15px', cursor: 'pointer', margin: '20px' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#117964'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#16a085'}
            >
              💾 Jetzt als Excel exportieren
            </button>

            <button
              onClick={() => { setResult(null); setFinalData([]); }}
              style={{ padding: '22px 100px', fontSize: '26px', background: '#6b7280', color: 'white', border: 'none', borderRadius: '15px', cursor: 'pointer', margin: '20px' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#4b5563'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#6b7280'}
            >
              🔄 Neue Datei hochladen
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
