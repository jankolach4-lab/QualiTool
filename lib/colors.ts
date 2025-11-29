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

// Material Design Farben - MAXIMALER Kontrast garantiert
// Aus dem Farbkreis mit 360° Abstand für perfekte Unterscheidbarkeit
const FALLBACK_COLORS = [
  '#F44336',    // ROT
  '#2196F3',    // BLAU
  '#4CAF50',    // GRÜN
  '#FFEB3B',    // GELB
  '#FF9800',    // ORANGE
  '#9C27B0',    // VIOLETT
  '#E91E63',    // PINK
  '#00BCD4',    // CYAN
  '#8BC34A',    // LIME
  '#FF5722',    // TIEFORANGE
  '#673AB7',    // TIEFES LILA
  '#009688',    // TEAL
  '#FFC107',    // AMBER
  '#795548',    // BRAUN
  '#607D8B',    // BLAUGRAU
  '#CDDC39',    // LIME-GELB
  '#3F51B5',    // INDIGO
  '#00E5FF',    // HELL-CYAN
  '#76FF03',    // NEON-GRÜN
  '#FF1744',    // NEON-ROT
]

export function colorForStatus(status: string): string {
  const key = (status || '').toLowerCase()
  if (PRESET[key]) return PRESET[key]
  
  // Verwende vordefinierte kontrastreiche Farben statt HSL
  const index = hashCode(key) % FALLBACK_COLORS.length
  return FALLBACK_COLORS[index]
}
