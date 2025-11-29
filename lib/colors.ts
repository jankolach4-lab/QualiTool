// Utilities for consistent status colors across charts
// MAXIMAL unterscheidbare Farben - jeder Status eine KOMPLETT andere Farbe

const PRESET: Record<string, string> = {
  // Abschluss-Status - leuchtende Grüntöne
  'abschluss': '#10B981',                    // leuchtend grün
  'onlineabschluss': '#3B82F6',              // leuchtend blau
  'abschl-anderer-vp': '#14B8A6',            // türkis/teal
  
  // Terminbezogen - Blau/Violett
  'termin': '#8B5CF6',                       // violett
  'termin-vereinbart': '#6366F1',            // indigo
  
  // Wiedervorlage - knalliges Magenta
  'wiedervorlage': '#EC4899',                // pink/magenta
  
  // Beratung - Cyan/Aqua
  'beraten': '#06B6D4',                      // cyan
  'in-bearbeitung': '#14B8A6',               // teal
  
  // Ablehnungen - Rot/Orange/Braun MIX
  'kein-interesse': '#FBBF24',               // gelb/gold
  'kein-eintritt': '#EF4444',                // rot
  'nicht-vermarktbar': '#7C2D12',            // dunkelbraun
  'blacklist': '#1F2937',                    // dunkelgrau/schwarz
  
  // Offen/Nicht erreicht - Orange/Gelb
  'offen': '#FCD34D',                        // hellgelb
  'nicht-angetroffen': '#F97316',            // orange
  
  // Sonstige - komplett andere Farben
  'verschoben': '#9CA3AF',                   // grau
  'abgelehnt': '#DC2626',                    // hellrot
}

function hashCode(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

// MAXIMAL kontrastreiche Farben für unbekannte Status
// Jede Farbe ist KOMPLETT verschieden von den anderen
const FALLBACK_COLORS = [
  '#EC4899',    // pink
  '#8B5CF6',    // lila
  '#3B82F6',    // blau
  '#06B6D4',    // cyan
  '#10B981',    // grün
  '#84CC16',    // lime
  '#FBBF24',    // gelb
  '#F97316',    // orange
  '#EF4444',    // rot
  '#6366F1',    // indigo
  '#14B8A6',    // teal
  '#A855F7',    // violett
  '#F59E0B',    // amber
  '#DC2626',    // dunkelrot
  '#059669',    // smaragd
]

export function colorForStatus(status: string): string {
  const key = (status || '').toLowerCase()
  if (PRESET[key]) return PRESET[key]
  
  // Verwende vordefinierte kontrastreiche Farben statt HSL
  const index = hashCode(key) % FALLBACK_COLORS.length
  return FALLBACK_COLORS[index]
}
