# ⚠️ Wichtig: Version-Check vor Update

## Problem: Alte APK ohne Versionsnummer

Du hast eine **sehr alte QualiTool-Version** ohne explizite Versionsnummer. Das kann beim Update Probleme verursachen.

---

## ✅ Schritt 1: Prüfe alte APK-Info

### Auf dem Tablet:
1. Öffne: **Einstellungen → Apps → Qualifizierungstool**
2. Tippe auf **App-Details** oder **Erweitert**
3. Notiere folgende Informationen:

```
📋 Wichtige Infos:
┌─────────────────────────────────────────┐
│ Package-Name: ________________________  │  ← SEHR WICHTIG!
│ Version:      ________________________  │
│ Versionscode: ________________________  │
└─────────────────────────────────────────┘
```

**Beispiele:**
- ✅ Gut: `de.ams.Qualifizierungstool` (gleiche App-ID)
- ❌ Problem: `com.example.qualitool` (andere App-ID)

---

## 📊 Szenarien & Lösungen

### ✅ Szenario A: Gleiche App-ID + niedrige/keine Version
**Wenn:**
- Package-Name = `de.ams.Qualifizierungstool` ✅
- Version = "1.0" oder leer oder sehr niedrig

**Dann:**
→ **Update funktioniert automatisch!** 🎉
- Neue versionCode ist IMMER höher (Format: 2025012315)
- Alle Daten bleiben erhalten
- Einfach neue APK installieren

**Schritte:**
1. Neue APK auf Tablet kopieren
2. APK öffnen
3. "Aktualisieren" wählen
4. Fertig! ✅

---

### ⚠️ Szenario B: Andere App-ID
**Wenn:**
- Package-Name = `com.example.xyz` (anders als `de.ams.Qualifizierungstool`)

**Dann:**
→ **Update funktioniert NICHT!** ❌
- Android sieht das als komplett neue App
- Alte App muss deinstalliert werden
- **Daten gehen verloren!**

**Lösung: Daten VOR Deinstallation sichern**

---

## 💾 Daten-Backup (falls Szenario B)

### Option 1: Manuelles Backup via Chrome DevTools

**Voraussetzung:** Android Debugging aktiviert

**Schritte:**
1. Verbinde Tablet per USB mit PC
2. Öffne Chrome: `chrome://inspect/#devices`
3. Klicke auf "inspect" bei Qualifizierungstool
4. In DevTools Console:
   ```javascript
   // BACKUP ERSTELLEN
   const backup = {
     contacts: localStorage.getItem('contacts'),
     offline_allowed: localStorage.getItem('offline_allowed'),
     last_user_id: localStorage.getItem('last_user_id'),
     geocache: {}
   };
   
   // Geocoding-Cache sichern
   for (let i = 0; i < localStorage.length; i++) {
     const key = localStorage.key(i);
     if (key.startsWith('geocode_')) {
       backup.geocache[key] = localStorage.getItem(key);
     }
   }
   
   console.log('📦 BACKUP ERSTELLT - KOPIERE FOLGENDEN TEXT:');
   console.log(JSON.stringify(backup));
   ```
5. **Kopiere den gesamten Output** und speichere in Textdatei

**Nach Neuinstallation wiederherstellen:**
```javascript
// BACKUP WIEDERHERSTELLEN
const backup = { /* HIER KOPIERTEN TEXT EINFÜGEN */ };

localStorage.setItem('contacts', backup.contacts);
localStorage.setItem('offline_allowed', backup.offline_allowed);
localStorage.setItem('last_user_id', backup.last_user_id);

// Geocoding-Cache wiederherstellen
for (const [key, value] of Object.entries(backup.geocache)) {
  localStorage.setItem(key, value);
}

console.log('✅ BACKUP WIEDERHERGESTELLT!');
location.reload();
```

---

### Option 2: Excel-Export (Kontakte sichern)

**Einfachere Methode, aber nur Kontakte:**

1. Öffne QualiTool
2. Gehe zu "Adressen importieren"
3. Klicke "Excel exportieren"
4. Speichere Excel-Datei
5. Nach Neuinstallation: "Excel importieren"

⚠️ **Nachteil:**
- WE-Korrekturen gehen verloren
- Geocoding-Cache muss neu aufgebaut werden
- Status-Historie wird nicht exportiert

---

## 🔍 Automatische Version-Erkennung (NEU)

Die neue APK hat jetzt ein **intelligentes Versionssystem:**

### Alte Version (deine aktuelle):
```
versionCode: 1 (oder nicht definiert)
versionName: "1.0" (oder leer)
```

### Neue Version (automatisch):
```
versionCode: 2025012315  ← IMMER höher als alte Version!
versionName: "0.2.0"     ← Aus package.json
```

**Format:** `YYYYMMDDHH` (Jahr-Monat-Tag-Stunde)
- Beispiel: `2025012315` = 23. Januar 2025, 15 Uhr
- **Garantiert höher** als jede alte Version (auch 1 oder 0)

---

## 🎯 Empfehlung

### BEVOR du pushst:

1. **Prüfe Package-Name der alten APK**
   ```
   Einstellungen → Apps → Qualifizierungstool → Details
   ```

2. **Falls Package-Name = `de.ams.Qualifizierungstool`:**
   → ✅ Alles gut! Einfach neue APK drüber installieren

3. **Falls Package-Name anders:**
   → ⚠️ Backup erstellen (siehe oben)
   → Alte App deinstallieren
   → Neue App installieren
   → Backup wiederherstellen

---

## 📝 Test-Protokoll (zum Ausfüllen)

```
□ Alte APK Package-Name geprüft: ________________
□ Gleiche App-ID wie neue Version? [ ] Ja [ ] Nein
□ Falls Nein: Backup erstellt? [ ] Ja
□ Neue APK gebaut und heruntergeladen
□ Installation durchgeführt: [ ] Update [ ] Neuinstallation
□ Nach Installation:
  □ Kontakte vorhanden?
  □ Login-Session aktiv?
  □ WE-Korrekturen da?
  □ Neue Features funktionieren?
```

---

## 💡 Zusammenfassung

**Gute Nachricht:**
- ✅ Neue APK hat GARANTIERT höhere Version (Timestamp-basiert)
- ✅ Funktioniert auch wenn alte Version "1" oder "0" oder leer ist

**Einziges Risiko:**
- ⚠️ Falls alte App-ID anders ist → Backup nötig

**Empfehlung:**
1. Prüfe erst Package-Name der alten APK
2. Falls gleich (`de.ams.Qualifizierungstool`) → Einfach Update
3. Falls anders → Erst Backup, dann Neuinstallation

**Bei Fragen: Diese Datei enthält alle Lösungen! 📖**
