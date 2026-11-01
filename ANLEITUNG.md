# Allreminde einrichten – Schritt für Schritt

Du machst das **einmal**. Danach baut GitHub bei jeder Änderung automatisch die PC-Version und die Handy-App.

## 1. Supabase (Speicher & Sync)

1. Auf **supabase.com** anmelden (am einfachsten mit GitHub) → **New project**.
   Name `allreminde`, Region **Frankfurt (eu-central-1)**, Datenbank-Passwort ausdenken und gut aufheben.
2. Links **SQL Editor → New query**, den kompletten Inhalt von `supabase/schema.sql` einfügen → **Run**.
   Unten sollte „Success“ stehen.
3. **Project Settings → API**: kopiere **Project URL** und den **anon public**-Schlüssel.
4. Trage beides in `www/js/00-env.js` ein (`SUPABASE_URL`, `SUPABASE_KEY`).
5. Nach Schritt 2 unten: **Authentication → URL Configuration → Site URL** auf die Adresse der Web-Version setzen
   (z. B. `https://deinname.github.io/allreminde/`). Dorthin führt der Link in der Bestätigungs-E-Mail.

## 2. GitHub (baut alles automatisch)

1. Auf **github.com** ein Repository `allreminde` anlegen und alle Dateien dieses Ordners hochladen
   (oder Claude macht das für dich, wenn GitHub verbunden ist).
2. Im Repository: **Settings → Pages → Source: „GitHub Actions“** auswählen.
3. **Settings → Actions → General → Workflow permissions: „Read and write permissions“** → Save.
4. Trage in `www/js/00-env.js` bei `APP_URL` die Adresse ein: `https://DEINNAME.github.io/allreminde/`.
5. Unter **Actions** siehst du den Bau. Nach ca. 5–8 Minuten ist alles fertig.

> Hinweis: GitHub Pages ist kostenlos nur für **öffentliche** Repositories. Im Code stehen keine
> persönlichen Daten und keine Passwörter. Deine Daten liegen geschützt bei Supabase.

## 3. Am PC (Windows)

1. Öffne `https://DEINNAME.github.io/allreminde/` in **Edge** oder **Chrome**.
2. Oben in der Adresszeile auf **„App installieren“** klicken. Allreminde hat dann ein eigenes Fenster und ein Symbol.
3. In Edge: `edge://apps` → Allreminde → **„Beim Anmelden automatisch starten“** aktivieren.
4. In der App: **Mehr → Konto & Sync** → Konto anlegen → Bestätigungs-E-Mail anklicken → anmelden.
5. **Mehr → Benachrichtigungen → Einschalten** und „Test-Erinnerung“ ausprobieren.

## 4. Am Handy (Samsung S22 Ultra)

1. Auf dem Handy im Browser das GitHub-Repository öffnen → rechts **Releases** → **Allreminde.apk** antippen.
2. Beim Öffnen fragt Android, ob der Browser Apps installieren darf → **Erlauben** → **Installieren**.
   (Google Play Protect kann warnen, weil die App nicht aus dem Play Store kommt → „Trotzdem installieren“.)
3. Allreminde öffnen → **Mehr → Konto & Sync** → mit demselben Konto anmelden.
4. **Mehr → Benachrichtigungen → Einschalten**, dann **„Pünktliche Wecker erlauben“** antippen und den Schalter aktivieren.
5. Damit Samsung nichts verschluckt:
   - Einstellungen → Apps → Allreminde → Akku → **Nicht eingeschränkt**
   - Einstellungen → Akku → Hintergrund-Nutzungslimits → **Apps, die nie in den Standby-Modus wechseln** → Allreminde hinzufügen
6. „Test-Wecker“ antippen und die App schließen. Nach 5 Sekunden sollte es klingeln.

**Updates:** Neue Versionen erscheinen unter Releases. Einfach die neue APK installieren, deine Daten bleiben erhalten.

## Daten aus der Claude-Version übernehmen

In der bisherigen Version (in Claude): **Mehr → Import & Export → Sicherung herunterladen**.
In der neuen App: **Mehr → Import & Export → Sicherung einspielen**.
Fotos und Belege aus der Claude-Version lassen sich leider nicht mitnehmen und müssen neu hochgeladen werden.

## Claude-Funktionen (optional)

„Foto auslesen“, „Aufgaben vorschlagen“ und Fragen zu Einträgen brauchen einen API-Schlüssel von
**console.anthropic.com** (Abrechnung pro Nutzung, wenige Cent). Eintragen unter **Mehr → Konto & Sync**.
Der Schlüssel bleibt nur auf dem jeweiligen Gerät.
