// Utilities for consistent status colors across charts
// Deutlich unterscheidbare Farben mit hohem Kontrast

const PRESET: Record<string, string> = {
  // Abschluss-Status (Grüntöne)
  'abschluss': 'rgba(22, 163, 74, 0.9)',              // dunkelgrün
  'onlineabschluss': 'rgba(34, 197, 94, 0.9)',        // hellgrün
  'abschl-anderer-vp': 'rgba(134, 239, 172, 0.9)',    // mintgrün
  
  // Terminbezogen (Blautöne)
  'termin': 'rgba(37, 99, 235, 0.9)',                 // königsblau
  'termin-vereinbart': 'rgba(59, 130, 246, 0.9)',     // hellblau
  
  // Wiedervorlage (Violett/Lila)
  'wiedervorlage': 'rgba(147, 51, 234, 0.9)',         // violett
  
  // Beratung (Türkis)
  'beraten': 'rgba(6, 182, 212, 0.9)',                // cyan
  'in-bearbeitung': 'rgba(20, 184, 166, 0.9)',        // teal
  
  // Ablehnungen (Rottöne)
  'kein-interesse': 'rgba(239, 68, 68, 0.9)',         // rot
  'kein-eintritt': 'rgba(220, 38, 38, 0.9)',          // dunkelrot
  'nicht-vermarktbar': 'rgba(185, 28, 28, 0.9)',      // sehr dunkelrot
  'blacklist': 'rgba(127, 29, 29, 0.9)',              // fast schwarz-rot
  
  // Offen/Nicht erreicht (Gelb/Orange)
  'offen': 'rgba(250, 204, 21, 0.9)',                 // gelb
  'nicht-angetroffen': 'rgba(251, 146, 60, 0.9)',     // orange
  
  // Sonstige (Grautöne und spezielle Farben)
  'verschoben': 'rgba(107, 114, 128, 0.9)',           // grau
  'abgelehnt': 'rgba(156, 163, 175, 0.9)',            // hellgrau
}

function hashCode(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

export function colorForStatus(status: string): string {
  const key = (status || '').toLowerCase()
  if (PRESET[key]) return PRESET[key]
  const hue = hashCode(key) % 360
  return `hsla(${hue}, 65%, 55%, 0.85)`
}
