# Allreminde – Aufbau des Codes

Einrichtung: siehe **ANLEITUNG.md**.

## Ordner

| Ordner / Datei | Inhalt |
|---|---|
| `www/` | Die App selbst. Läuft im Browser **und** in der Android-App (gleicher Code). |
| `www/index.html` | Grundgerüst, lädt alle Dateien in der richtigen Reihenfolge |
| `www/css/style.css` | Aussehen. Farben oben als Variablen |
| `www/sw.js`, `www/manifest.webmanifest` | Macht die Web-Version installierbar und offline-fähig |
| `www/fonts/symbols.woff` | Symbol-Schrift (nur benutzte Symbole), erzeugt von `tools/icons.py` |
| `capacitor.config.json`, `package.json` | Einstellungen für die Android-App (Capacitor) |
| `android-extra/` | Weckton und Benachrichtigungs-Symbol für Android |
| `resources/` | App-Symbol und Startbild |
| `supabase/schema.sql` | Datenbank-Tabellen und Schutzregeln |
| `.github/workflows/build.yml` | Baut automatisch Web-Version und APK |
| `tools/` | Hilfsskripte (Symbol-Schrift, Bibliotheken laden, Signatur-Schlüssel) |

## JavaScript-Dateien (`www/js/`)

| Datei | Inhalt |
|---|---|
| `00-env.js` | **Hier trägst du deine Zugangsdaten ein** (Supabase, Web-Adresse) |
| `00-icons.js` | Symbol-Liste (automatisch erzeugt) |
| `01-config.js` | **Nur Daten:** Symbole, Farben, Bereichsarten mit Vorlagen, Dokumentarten, Startpakete, Menü |
| `02-helpers.js` | Helfer für Datum, Zahlen, Text |
| `03-store.js` | Datenmodell, Beispieldaten, Speichern auf dem Gerät und bei Supabase, Anmeldung, Papierkorb |
| `04-logic.js` | Fälligkeiten, Erinnerungen, Erledigen/Überspringen, Verträge, automatische Aufgaben, Kosten, Suche |
| `05-ui.js` | Bausteine (Aufgabenzeile, Kacheln, Formularfelder, Meldungen) |
| `06-views.js` | Die Seiten. Ganz unten `ROUTES`: welche Adresse welche Seite zeigt |
| `07-forms.js` | Formulare zum Anlegen und Bearbeiten, Aufgaben-Menü (Verschieben usw.) |
| `08-extras.js` | Hochladen, Export/Import, Claude-Funktionen, Aussehen, Startpakete |
| `09-main.js` | `ACTIONS` (was bei Klicks passiert), `SUBMIT` (Speichern), `start()` |
| `10-notify.js` | Benachrichtigungen und Wecker (Android: auf dem Gerät geplant, PC: Browser) |
| `99-start.js` | Startet die App |

## Typische Änderungen

- **Neues Symbol:** Namen in `01-config.js` bei `ICON_GROUPS` eintragen (Namen von fonts.google.com/icons),
  dann `python3 tools/icons.py PFAD/MaterialSymbolsRounded[FILL,GRAD,opsz,wght].ttf` ausführen.
- **Neue Bereichsart oder Vorlage:** `01-config.js` → `KINDS` bzw. `STARTER`.
- **Neue Dokumentart:** `01-config.js` → `DOCTYPES`.
- **Neue Zusatz-Liste (wie Tankbuch):** `01-config.js` → `MODULES`.
- **Farben:** oben in `www/css/style.css`.

Änderungen hochladen (GitHub) → nach ein paar Minuten sind Web-Version und neue APK fertig.

## Lokal ausprobieren

`bash tools/vendor.sh` (lädt zwei Bibliotheken), dann im Ordner `www` z. B. `python3 -m http.server 8080`
und im Browser `http://localhost:8080` öffnen.
