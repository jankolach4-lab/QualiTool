# QualiTool APK Update-Anleitung

## ✅ Ja, Update über alte Version ist möglich!

Das QualiTool kann über **jede ältere Version** aktualisiert werden, und **alle Daten bleiben erhalten**:
- ✅ Kontakte in localStorage
- ✅ Supabase Login-Session
- ✅ WE-Korrekturen
- ✅ Geocoding-Cache
- ✅ Offline-Einstellungen

---

## 📋 Voraussetzungen für erfolgreiches Update

### 1. **App-ID muss identisch bleiben**
✅ **Aktuell:** `de.ams.Qualifizierungstool`
- Darf **NIEMALS** geändert werden
- Android erkennt App nur als Update, wenn ID gleich bleibt

### 2. **Version muss höher sein**
✅ **Aktuell:** `0.1.0` (versionCode: 1)
- Neue Version muss höhere versionCode haben
- Z.B.: v0.1.0 → v0.2.0 (versionCode 2)

### 3. **Signing Key muss gleich sein**
⚠️ **Problem:** Debug-Key vs. Release-Key
- GitHub Actions erstellt Debug-APK (Debug-Key)
- Wenn alte Version mit anderem Key signiert → Update blockiert
- **Lösung:** Immer gleichen Key verwenden

---

## 🔧 Version automatisch erhöhen

### Option 1: Manuelle Version in package.json
Bearbeite `/app/frontend/package.json`:
```json
{
  "name": "frontend",
  "version": "0.2.0",  // Erhöhe diese Zahl bei jedem Update
  ...
}
```

### Option 2: Automatische Version aus package.json
Füge zu `capacitor.config.ts` hinzu:
```typescript
import packageJson from './package.json';

const config: CapacitorConfig = {
  appId: 'de.ams.Qualifizierungstool',
  appName: 'Qualifizierungstool',
  version: packageJson.version,  // Automatisch aus package.json
  ...
}
```

### Option 3: Build-Skript erweitern
Füge zu GitHub Workflow hinzu (vor Android Build):
```yaml
- name: Set Android version
  run: |
    VERSION_NAME=$(node -p "require('./package.json').version")
    VERSION_CODE=$(date +%s)  # Unix-Timestamp als versionCode
    echo "Version: $VERSION_NAME (Code: $VERSION_CODE)"
    
    # Patch build.gradle
    sed -i "s/versionCode 1/versionCode $VERSION_CODE/" android/app/build.gradle
    sed -i "s/versionName \"1.0\"/versionName \"$VERSION_NAME\"/" android/app/build.gradle
```

---

## 📦 Datenspeicherung im QualiTool

### Was bleibt beim Update erhalten?

| Datentyp | Speicherort | Bleibt erhalten? |
|----------|-------------|------------------|
| **Kontakte** | `localStorage.contacts` | ✅ JA |
| **Supabase Session** | Capacitor Preferences | ✅ JA |
| **Geocoding Cache** | `localStorage.geocode_*` | ✅ JA |
| **WE-Korrekturen** | `contacts[].weCorrections` | ✅ JA |
| **Offline-Flag** | `localStorage.offline_allowed` | ✅ JA |
| **Letzte User-ID** | `localStorage.last_user_id` | ✅ JA |
| **Statistiken** | Berechnet aus Kontakten | ✅ JA |

**Warum?**
- Android behält App-Daten bei Update (gleiche App-ID)
- localStorage und Capacitor Preferences bleiben erhalten
- Nur bei **Deinstallation** werden Daten gelöscht

---

## 🚀 Update-Prozess (Schritt für Schritt)

### Vorbereitung (einmalig):
1. **Prüfe alte APK-Version auf Tablet:**
   ```
   Einstellungen → Apps → Qualifizierungstool → Details
   Notiere: Version & App-ID
   ```

2. **Stelle sicher, dass App-ID gleich ist:**
   - Alte Version: Prüfe in App-Details
   - Neue Version: `de.ams.Qualifizierungstool`
   - ✅ Müssen identisch sein!

### Update durchführen:
1. **Lade neue APK herunter**
   - Von GitHub Actions Artifacts ODER
   - Lokaler Build

2. **Installiere APK auf Tablet**
   - Öffne APK-Datei
   - Android fragt: "App aktualisieren?"
   - **WICHTIG:** Wähle "Aktualisieren" (NICHT "Installieren")

3. **Erste Start nach Update**
   - App startet automatisch
   - Alle Daten sind vorhanden ✅
   - Ggf. neue Berechtigungen anfragen (Standort)

4. **Verifiziere Daten**
   ```
   ✓ Kontakte → Alle Adressen vorhanden?
   ✓ Login → Noch eingeloggt?
   ✓ Statistik → Historische Daten korrekt?
   ✓ WE-Korrekturen → Alle Einträge da?
   ```

---

## ⚠️ Häufige Probleme & Lösungen

### Problem 1: "App kann nicht installiert werden"
**Ursache:** Signing-Key unterschiedlich
**Lösung:**
- Option A: Alte App deinstallieren (Daten gehen verloren!)
- Option B: Gleichen Signing-Key verwenden

**Daten vorher sichern:**
```javascript
// In Browser-Konsole im QualiTool:
const backup = {
  contacts: localStorage.getItem('contacts'),
  offline_allowed: localStorage.getItem('offline_allowed'),
  last_user_id: localStorage.getItem('last_user_id')
};
console.log(JSON.stringify(backup));
// Kopiere Output und speichere in Textdatei

// Nach Neuinstallation wiederherstellen:
localStorage.setItem('contacts', backup.contacts);
localStorage.setItem('offline_allowed', backup.offline_allowed);
localStorage.setItem('last_user_id', backup.last_user_id);
```

### Problem 2: Nach Update sind Daten weg
**Ursache:** App-ID hat sich geändert
**Prüfung:**
```bash
# Auf Tablet in Chrome Remote Debugging:
chrome://inspect/#devices
# Öffne DevTools → Console:
console.log(document.location.host);
```

### Problem 3: Alte Version zeigt sich noch
**Ursache:** Cache nicht geleert
**Lösung:**
```
Einstellungen → Apps → Qualifizierungstool
→ Speicher → Cache leeren (NICHT Daten löschen!)
```

---

## 🎯 Best Practices für Updates

### 1. Version-Naming
```
v0.1.0 → Initiale Version
v0.2.0 → Neue Features (Map, Dashboard)
v0.2.1 → Bugfixes (CSV Export, Standort)
v0.3.0 → Breaking Changes
v1.0.0 → Production Release
```

### 2. Release Notes erstellen
Vor jedem Update dokumentieren:
```markdown
## Version 0.2.1 (2025-01-23)

### Neu:
- ✨ Kartenansicht mit Echtzeit-Standort
- ✨ CSV Export für WE-Korrekturen (Android)

### Behoben:
- 🐛 Adressen mit Suffix (12A, 12B) in Admin Dashboard
- 🐛 Standort-Marker jetzt sichtbar
- 🐛 Google Warnung bei Installation entfernt

### Technisch:
- 🔧 Capacitor Filesystem + Share für Downloads
- 🔧 Location Permissions in AndroidManifest
```

### 3. Migrations-Code für alte Daten
Falls sich Datenstruktur ändert, Migration einbauen:
```javascript
// In index.html nach DOMContentLoaded:
function migrateOldData() {
  const version = localStorage.getItem('app_version') || '0.1.0';
  
  if (version < '0.2.0') {
    console.log('[Migration] Upgrading from', version, 'to 0.2.0');
    
    // Beispiel: Alte Kontakte ohne 'zusatz' Feld
    const contacts = JSON.parse(localStorage.getItem('contacts') || '[]');
    contacts.forEach(c => {
      if (!c.hasOwnProperty('zusatz')) {
        c.zusatz = '';  // Neues Feld hinzufügen
      }
    });
    localStorage.setItem('contacts', JSON.stringify(contacts));
    localStorage.setItem('app_version', '0.2.0');
    
    console.log('[Migration] Upgrade complete!');
  }
}

migrateOldData();
```

---

## 📝 Zusammenfassung

✅ **JA, Update über alte Version funktioniert**
✅ **Alle Daten bleiben erhalten** (localStorage, Supabase Session)
✅ **App-ID muss gleich bleiben:** `de.ams.Qualifizierungstool`
✅ **Version erhöhen** in package.json bei jedem Update
⚠️ **Signing-Key muss gleich sein** (Debug vs. Release beachten)

**Empfehlung:**
- Immer Debug-APK für Tests verwenden (aus GitHub Actions)
- Für Production: Release-APK mit eigenem Signing-Key
- Vor jedem Update: Version in package.json erhöhen
- Release Notes schreiben für Nachvollziehbarkeit
