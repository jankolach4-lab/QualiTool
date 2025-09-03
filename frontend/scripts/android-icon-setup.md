# Android App-Icon mit Capacitor

Wir verwenden capacitor-assets (Capacitor v6) zum Generieren der Android-Launcher-Icons aus einer Quelle.

## Schritte (CI/Manuell)

1) Quelle prüfen
   - Quelle liegt unter: `frontend/resources/icon.png` (aktuell aus deinem Sidebar-Logo kopiert)
   - Empfohlen: 1024×1024 PNG mit ausreichend Rand

2) Assets generieren

Lokal oder in CI (vor `npx cap sync android`):

```bash
npx @capacitor/assets generate --android
```

Dies erzeugt die Mipmap-Icons in `frontend/android/app/src/main/res/mipmap-*/ic_launcher.png`.

3) Sync & Build

```bash
npx cap sync android
cd android
./gradlew assembleDebug
```

## Optional: App-Name/Icon im Manifest prüfen
- Pfad: `frontend/android/app/src/main/AndroidManifest.xml` → Label/Icons automatisch durch Capacitor gesetzt

Hinweis: Wir können den Generator in den GitHub‑Workflow einbauen, damit das Icon automatisch generiert wird.