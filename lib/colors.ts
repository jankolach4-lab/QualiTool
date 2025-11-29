// Utilities for consistent status colors across charts
// MAXIMALER Kontrast - klassische Farbkreis-Farben mit hoher Sättigung

const PRESET: Record<string, string> = {
  // Abschluss-Status - Primärfarben
  'abschluss': '#00C853',                    // REINES GRÜN
  'onlineabschluss': '#2196F3',              // REINES BLAU
  'abschl-anderer-vp': '#00BCD4',            // CYAN
  
  // Terminbezogen - Violett/Lila Spektrum
  'termin': '#9C27B0',                       // VIOLETT
  'termin-vereinbart': '#673AB7',            // TIEFES LILA
  
  // Wiedervorlage - Pink
  'wiedervorlage': '#E91E63',                // PINK
  
  // Beratung - Türkis/Teal
  'beraten': '#009688',                      // TEAL
  'in-bearbeitung': '#4CAF50',               // HELLGRÜN
  
  // Ablehnungen - Komplett verschiedene Farben
  'kein-interesse': '#FF9800',               // ORANGE
  'kein-eintritt': '#F44336',                // ROT
  'nicht-vermarktbar': '#795548',            // BRAUN
  'blacklist': '#212121',                    // SCHWARZ
  
  // Offen/Nicht erreicht - Gelb/Amber
  'offen': '#FFEB3B',                        // GELB
  'nicht-angetroffen': '#FF5722',            // TIEFORANGE/ROT-ORANGE
  
  // Sonstige
  'verschoben': '#9E9E9E',                   // GRAU
  'abgelehnt': '#FF1744',                    // NEON-ROT
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
