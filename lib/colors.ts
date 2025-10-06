// Utilities for consistent status colors across charts

const PRESET: Record<string, string> = {
  'abschluss': 'rgba(16, 185, 129, 0.85)',            // green
  'kein-eintritt': 'rgba(239, 68, 68, 0.85)',         // red
  'nicht-angetroffen': 'rgba(245, 158, 11, 0.85)',    // amber
  'offen': 'rgba(59, 130, 246, 0.85)',                // blue
  'abgelehnt': 'rgba(139, 92, 246, 0.85)',            // purple
  'termin-vereinbart': 'rgba(236, 72, 153, 0.85)',    // pink
  'in-bearbeitung': 'rgba(20, 184, 166, 0.85)',       // teal
  'verschoben': 'rgba(107, 114, 128, 0.85)',          // gray
  'wiedervorlage': 'rgba(99, 102, 241, 0.85)',        // indigo
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
