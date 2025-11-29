// Utilities for consistent status colors across charts
// Professionell ausgewählte, maximal kontraststarke Farben

const PRESET: Record<string, string> = {
  // Abschluss-Status
  'abschluss': '#3CB44B',                    // starkes Grün
  'onlineabschluss': '#0082C8',              // sattes Blau
  'abschl-anderer-vp': '#46F0F0',            // kräftiges Türkis
  
  // Terminbezogen
  'termin': '#911EB4',                       // intensives Violett
  'termin-vereinbart': '#F032E6',            // Pink/Magenta
  
  // Wiedervorlage
  'wiedervorlage': '#F032E6',                // Pink/Magenta
  
  // Beratung
  'beraten': '#46F0F0',                      // kräftiges Türkis
  'in-bearbeitung': '#3CB44B',               // starkes Grün
  
  // Ablehnungen
  'kein-interesse': '#F58231',               // leuchtendes Orange
  'kein-eintritt': '#E6194B',                // kräftiges Rot
  'nicht-vermarktbar': '#9A6324',            // warmes Braun
  'blacklist': '#800000',                    // dunkles Rotbraun
  
  // Offen/Nicht erreicht
  'offen': '#FFE119',                        // helles Gelb
  'nicht-angetroffen': '#F58231',            // leuchtendes Orange
  
  // Sonstige
  'verschoben': '#9A6324',                   // warmes Braun
  'abgelehnt': '#E6194B',                    // kräftiges Rot
}

function hashCode(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

// Professionell ausgewählte, maximal kontraststarke Fallback-Farben
const FALLBACK_COLORS = [
  '#E6194B',    // kräftiges Rot
  '#3CB44B',    // starkes Grün
  '#0082C8',    // sattes Blau
  '#F58231',    // leuchtendes Orange
  '#911EB4',    // intensives Violett
  '#FFE119',    // helles Gelb
  '#46F0F0',    // kräftiges Türkis
  '#F032E6',    // Pink/Magenta
  '#800000',    // dunkles Rotbraun
  '#9A6324',    // warmes Braun
]

export function colorForStatus(status: string): string {
  const key = (status || '').toLowerCase()
  if (PRESET[key]) return PRESET[key]
  
  // Verwende vordefinierte kontrastreiche Farben statt HSL
  const index = hashCode(key) % FALLBACK_COLORS.length
  return FALLBACK_COLORS[index]
}
