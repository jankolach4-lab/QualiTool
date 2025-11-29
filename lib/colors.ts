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

// Vordefinierte kontrastreiche Farben für unbekannte Status
const FALLBACK_COLORS = [
  'rgba(236, 72, 153, 0.9)',    // pink
  'rgba(168, 85, 247, 0.9)',    // lila
  'rgba(59, 130, 246, 0.9)',    // blau
  'rgba(14, 165, 233, 0.9)',    // himmelblau
  'rgba(34, 197, 94, 0.9)',     // grün
  'rgba(234, 179, 8, 0.9)',     // gold
  'rgba(251, 146, 60, 0.9)',    // orange
  'rgba(239, 68, 68, 0.9)',     // rot
  'rgba(139, 92, 246, 0.9)',    // violett
  'rgba(20, 184, 166, 0.9)',    // teal
]

export function colorForStatus(status: string): string {
  const key = (status || '').toLowerCase()
  if (PRESET[key]) return PRESET[key]
  
  // Verwende vordefinierte kontrastreiche Farben statt HSL
  const index = hashCode(key) % FALLBACK_COLORS.length
  return FALLBACK_COLORS[index]
}
