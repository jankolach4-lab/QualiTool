# QualiTool Release-System Guide

## 🎯 Übersicht

Das QualiTool hat ein vollautomatisches Update-System:
- **App:** Prüft GitHub Releases auf neue Versionen
- **GitHub Actions:** Erstellt automatisch Releases bei jedem Push

---

## 📋 Wie funktioniert ein Release?

### Automatischer Ablauf:

```
1. Du änderst Code
   ↓
2. Erhöhe Version in package.json
   ↓
3. Push zu GitHub (main branch)
   ↓
4. GitHub Actions startet automatisch
   ↓
5. APK wird gebaut
   ↓
6. Release wird erstellt (falls Version neu)
   ↓
7. APK wird zu Release hochgeladen
   ↓
8. Changelog wird generiert
   ↓
9. ✅ Release ist live!
   ↓
10. Nutzer sehen Update in App
```

---

## 🚀 Release erstellen (Schritt für Schritt)

### Schritt 1: Version erhöhen

**Bearbeite:** `/app/frontend/package.json`

```json
{
  "name": "frontend",
  "version": "0.1.0",  // ← Erhöhe diese Zahl
  ...
}
```

**Versions-Schema:**
- `0.1.0` → `0.1.1` (Bugfixes, kleine Änderungen)
- `0.1.0` → `0.2.0` (Neue Features)
- `0.1.0` → `1.0.0` (Große Änderungen, Breaking Changes)

**Beispiel:**
```json
"version": "0.2.0"  // Von 0.1.0 auf 0.2.0
```

### Schritt 2: Code committen & pushen

```bash
git add .
git commit -m "Release v0.2.0 - Polygon-Zeichnung & Update-System"
git push origin main
```

### Schritt 3: Warten auf GitHub Actions

1. Gehe zu: `https://github.com/jankolach4-lab/QualiTool/actions`
2. Warte auf grünen Haken (ca. 5-10 Minuten)
3. Falls rot: Klicke auf Workflow → Logs prüfen

### Schritt 4: Release prüfen

1. Gehe zu: `https://github.com/jankolach4-lab/QualiTool/releases`
2. Neues Release sollte sichtbar sein: `v0.2.0`
3. APK-Datei sollte als Asset angehängt sein

---

## 🔍 Was macht GitHub Actions?

### Build-Prozess:

1. **Checkout Code** ✓
2. **Node.js 20 installieren** ✓
3. **Dependencies installieren** (yarn)
4. **Web-Assets bauen** (yarn build)
5. **Android Platform hinzufügen** (Capacitor)
6. **Version setzen** (aus package.json)
7. **Android Permissions patchen** (Standort, Speicher)
8. **Java 17 + Android SDK setup**
9. **APK bauen** (Gradle)
10. **Version aus package.json lesen**
11. **Prüfen: Release existiert bereits?**
    - Ja → Überspringen
    - Nein → Weitermachen
12. **Changelog generieren** (aus Git Commits)
13. **GitHub Release erstellen**
14. **APK hochladen**

---

## 📝 Changelog

**Automatisch generiert aus:**
- Git Commits seit letztem Tag
- Format: `- <commit message> (<author>)`
- Letzten 20 Commits (wenn erster Release)

**Beispiel Changelog:**
```markdown
## 🎉 Was ist neu?

- Polygon-Zeichnung für Adress-Import hinzugefügt (Janko Lach)
- Update-System implementiert (Janko Lach)
- Hellrote Markierung für "Kein Eintritt" (Janko Lach)
- Straßenfilter-Persistenz verbessert (Janko Lach)

## 📥 Installation

1. Laden Sie die APK-Datei herunter
2. Öffnen Sie die Datei auf Ihrem Android-Gerät
3. Bestätigen Sie die Installation
4. Alle Daten bleiben erhalten

## ⚠️ Wichtig

- Erste Installation: Erlauben Sie alle Berechtigungen
- Update: Signing-Key muss gleich sein
- Bei Problemen: Support kontaktieren
```

---

## ⚠️ Wichtige Hinweise

### 1. **Version-Duplikate**
- GitHub Actions prüft, ob Release bereits existiert
- Falls ja → Überspringt Release-Erstellung
- Verhindert Fehler bei mehreren Pushes

### 2. **Signing-Key Problem**
- **Wichtig:** APK hat aktuell Debug-Key
- Updates funktionieren nur mit **gleichem** Signing-Key
- **Lösung:** Release-Key einrichten (siehe `SIGNING_KEY_SETUP.md`)
- Danach: **Alle zukünftigen Updates funktionieren**

### 3. **Erstes Release**
- Das **erste Release** wird NICHT automatisch erstellt
- **Warum?** Version 0.1.0 ist schon "released" (wenn du pushst)
- **Lösung:** Erhöhe auf 0.1.1 oder 0.2.0 für ersten Auto-Release

### 4. **Branch-Trigger**
- Nur Pushes zu `main` Branch triggern Build
- Andere Branches: Workflow manuell starten (`workflow_dispatch`)

---

## 🧪 Testen des Update-Systems

### Szenario 1: Erste Installation
```
1. Installiere APK v0.1.0
2. Öffne App → Einstellungen
3. "Nach Updates suchen" → "Noch kein Release"
4. Normal, da v0.1.0 noch kein Release ist
```

### Szenario 2: Update verfügbar
```
1. App Version: 0.1.0
2. GitHub Release: v0.2.0 vorhanden
3. "Nach Updates suchen" → "Update verfügbar!"
4. "Jetzt herunterladen" → APK Download
5. Installation → App updated auf 0.2.0
```

### Szenario 3: Auto-Check
```
1. Aktiviere "Auto-Check" in Einstellungen
2. Schließe App
3. Warte >24h (oder lösche lastUpdateCheck in localStorage)
4. Öffne App → Auto-Check läuft im Hintergrund
5. Falls Update → Alert erscheint
```

---

## 🔧 Troubleshooting

### Problem: "Noch kein Release verfügbar"
**Lösung:** Erstes Release manuell erstellen ODER Version auf 0.2.0 erhöhen

### Problem: "APK nicht im Release"
**Lösung:** GitHub Actions Logs prüfen → Build fehlgeschlagen?

### Problem: "Update funktioniert nicht (Signing-Key)"
**Lösung:** Release-Key einrichten (siehe `SIGNING_KEY_SETUP.md`)

### Problem: "Changelog ist leer"
**Lösung:** Mehr aussagekräftige Commit-Messages schreiben

---

## 📊 Release-Statistik

**Check auf GitHub:**
```
Releases: https://github.com/jankolach4-lab/QualiTool/releases
Actions: https://github.com/jankolach4-lab/QualiTool/actions
```

**Nützliche Infos:**
- Anzahl Downloads pro Release
- Build-Dauer
- Success-Rate der Workflows

---

## 🎉 Zusammenfassung

**Für einen Release brauchst du nur:**
1. ✅ Version in package.json erhöhen
2. ✅ Committen & Pushen
3. ✅ Fertig! GitHub Actions macht den Rest

**Nutzer bekommen Update:**
- ✅ Automatisch (wenn Auto-Check AN)
- ✅ Manuell (über Einstellungen)
- ✅ Download direkt aus App
- ✅ Installation mit 1 Klick

**Alle Daten bleiben erhalten! 🎊**
