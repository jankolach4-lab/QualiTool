# Android Signing-Key Setup für Updates

## Problem: Jedes Update erfordert Neuinstallation

**Ursache:** GitHub Actions erstellt Debug-APKs mit wechselnden oder Standard-Debug-Keys.

**Lösung:** Erstelle einen **permanenten Release-Key** und verwende ihn für ALLE zukünftigen APKs.

---

## 🔐 Release-Key erstellen (Einmalig)

### Schritt 1: Key generieren

Auf deinem PC (Linux/Mac/Windows mit Java):

```bash
# Erstelle Keystore
keytool -genkey -v -keystore qualitool-release.keystore \
  -alias qualitool \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass DEIN_STARKES_PASSWORD \
  -keypass DEIN_STARKES_PASSWORD

# Beantworte die Fragen:
# - Vor- und Nachname: [Dein Name oder Firma]
# - Organisationseinheit: [z.B. "Development"]
# - Organisation: [z.B. "AMS"]
# - Stadt: [Deine Stadt]
# - Bundesland: [Dein Bundesland]
# - Ländercode: DE
```

**Wichtig:** 
- ⚠️ **SICHERE DIESE DATEI GUT!** (`qualitool-release.keystore`)
- ⚠️ **NOTIERE DAS PASSWORD!**
- ⚠️ **Ohne diesen Key kannst du keine Updates mehr verteilen!**

---

## 📦 Key zu GitHub Secrets hinzufügen

### Schritt 2: Key in Base64 umwandeln

```bash
# Linux/Mac:
base64 qualitool-release.keystore > keystore.base64

# Windows PowerShell:
[Convert]::ToBase64String([IO.File]::ReadAllBytes("qualitool-release.keystore")) > keystore.base64
```

### Schritt 3: Secrets in GitHub erstellen

1. Gehe zu: **GitHub Repository → Settings → Secrets and variables → Actions**
2. Klicke **"New repository secret"**
3. Erstelle folgende Secrets:

```
Name: ANDROID_KEYSTORE_BASE64
Value: [Inhalt von keystore.base64 Datei]

Name: ANDROID_KEYSTORE_PASSWORD
Value: [Dein Password vom keytool Befehl]

Name: ANDROID_KEY_ALIAS
Value: qualitool

Name: ANDROID_KEY_PASSWORD
Value: [Dein Password vom keytool Befehl]
```

---

## 🔧 GitHub Workflow anpassen

Füge zum Workflow `.github/workflows/build-android-apk.yml` hinzu:

### NACH dem "Setup Java 17" Schritt:

```yaml
      - name: Decode Keystore
        run: |
          echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 -d > android/release.keystore
          echo "✓ Keystore decoded"

      - name: Create keystore.properties
        run: |
          cd android
          cat > keystore.properties << EOF
          storeFile=release.keystore
          storePassword=${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          keyAlias=${{ secrets.ANDROID_KEY_ALIAS }}
          keyPassword=${{ secrets.ANDROID_KEY_PASSWORD }}
          EOF
          echo "✓ keystore.properties created"

      - name: Build Release APK (signed)
        run: |
          cd android
          ./gradlew assembleRelease
          echo "✓ Signed Release APK built"

      - name: Upload Signed Release APK artifact
        uses: actions/upload-artifact@v4
        with:
          name: qualitool-release-apk
          path: frontend/android/app/build/outputs/apk/release/app-release.apk
          if-no-files-found: error
          retention-days: 30
```

### ERSETZE den alten "Build Debug APK" Schritt!

---

## 🎯 Alternative: app/build.gradle anpassen

Falls du das Signing direkt in Gradle konfigurieren willst:

Bearbeite `android/app/build.gradle` (nach `cap sync`):

```gradle
android {
    ...
    
    signingConfigs {
        release {
            // Wird aus keystore.properties gelesen
            def keystorePropertiesFile = rootProject.file("keystore.properties")
            if (keystorePropertiesFile.exists()) {
                def keystoreProperties = new Properties()
                keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
                
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

---

## ✅ Ergebnis nach Setup

**VORHER (jetzt):**
- ❌ Jedes Update → Neuinstallation nötig
- ❌ Daten gehen verloren
- ❌ Signing-Key wechselt

**NACHHER (mit Release-Key):**
- ✅ Updates funktionieren über alte Versionen
- ✅ Daten bleiben automatisch erhalten
- ✅ Gleicher Key für alle Versionen
- ✅ Production-ready APKs

---

## 🔒 Sicherheit

**Wichtig:**
- ⚠️ **Keystore-Datei NIEMALS in Git committen!**
- ⚠️ **Password NIEMALS in Code schreiben!**
- ⚠️ **Nur über GitHub Secrets verwenden!**
- ⚠️ **Keystore-Datei an 2-3 sicheren Orten sichern!**

**Backup-Strategie:**
```
1. Keystore auf verschlüsseltem USB-Stick
2. Keystore in verschlüsseltem Cloud-Storage
3. Password in Password-Manager (1Password, Bitwarden, etc.)
```

---

## 📝 Zusammenfassung

**Einmalig durchführen:**
1. Release-Key erstellen (`keytool`)
2. Key in GitHub Secrets hochladen
3. Workflow anpassen (Release statt Debug)
4. **Keystore sicher aufbewahren!**

**Danach:**
- ✅ Alle Updates funktionieren automatisch
- ✅ Keine Neuinstallation mehr nötig
- ✅ Daten bleiben erhalten
- ✅ Professional deployment-ready

**Zeit:** ~30 Minuten einmalig
**Nutzen:** Alle zukünftigen Updates problemlos! 🎉
