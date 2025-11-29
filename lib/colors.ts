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
  'beraten': '#00E5FF',                      // HELL-CYAN
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
