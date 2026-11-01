# Allreminde einrichten – Schritt für Schritt

Du machst das **einmal**. Danach baut GitHub bei jeder Änderung automatisch die PC-Version und die Handy-App.

## 1. Supabase (Speicher & Sync)

1. Auf **supabase.com** anmelden (am einfachsten mit GitHub) → **New project**.
   Name `allreminde`, Region **Frankfurt (eu-central-1)**, Datenbank-Passwort ausdenken und gut aufheben.
2. Links **SQL Editor → New query**, den kompletten Inhalt von `supabase/schema.sql` einfügen → **Run**.
   Unten sollte „Success“ stehen. Danach genauso mit `supabase/schema-v2.sql` (Profile, Freunde, Gruppen, Chat).
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

## 3. Am PC (Windows, Firefox)

1. Prüfe deine Firefox-Version (Menü ☰ → Hilfe → Über Firefox). Du brauchst **Version 143 oder neuer**.
2. Öffne `https://DEINNAME.github.io/allreminde/` in Firefox.
3. Rechts in der Adresszeile auf das **Web-App-Symbol** klicken → Allreminde wird installiert,
   bekommt ein eigenes Fenster, ein Taskleisten-Symbol und einen Eintrag im Startmenü.
4. **Automatisch mit Windows starten:** Windows-Taste + R → `shell:startup` → Enter.
   Die Allreminde-Verknüpfung aus dem Startmenü in diesen Ordner ziehen.
5. Nach dem PC-Start einmal kurz in Allreminde klicken. Erst danach darf Firefox den Weckton abspielen.
6. Beim Öffnen erscheint die Anmeldung: Konto anlegen → (falls verlangt) Bestätigungs-E-Mail anklicken → anmelden → Benutzernamen wählen.
   Am PC wirst du nach 20 Minuten ohne Aktivität automatisch abgemeldet.
7. **Mehr → Benachrichtigungen → Einschalten** (Firefox fragt nach → „Erlauben“) und „Test-Erinnerung“ ausprobieren.
8. Windows-Einstellungen → System → Benachrichtigungen: **Firefox** muss erlaubt sein.

> Am PC kommen Erinnerungen, solange Allreminde geöffnet ist (das Fenster darf minimiert sein).
> Ist es ganz geschlossen, holt die App verpasste Erinnerungen beim nächsten Öffnen nach (bis 6 Stunden zurück).

## 4. Am Handy (Samsung S22 Ultra)

1. Auf dem Handy im Browser das GitHub-Repository öffnen → rechts **Releases** → **Allreminde.apk** antippen.
2. Beim Öffnen fragt Android, ob der Browser Apps installieren darf → **Erlauben** → **Installieren**.
   (Google Play Protect kann warnen, weil die App nicht aus dem Play Store kommt → „Trotzdem installieren“.)
3. Allreminde öffnen → mit demselben Konto anmelden. Die Handy-App bleibt angemeldet, damit Wecker immer klingeln.
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

## Freunde einladen (Konten, Gruppen, Chat)

Einmalig in Supabase:

1. **SQL Editor → New query** → Inhalt von `supabase/schema-v2.sql` einfügen → **Run**.
2. **Authentication → Sign In / Providers → Email**: „Allow new users to sign up“ muss **an** sein, sonst können sich Freunde nicht registrieren.
3. **Authentication → URL Configuration**:
   - Site URL: `https://DEINNAME.github.io/Allreminde/`
   - Redirect URLs: `https://DEINNAME.github.io/Allreminde/**` hinzufügen (für „Passwort vergessen“).
4. E-Mails: Supabase verschickt ohne eigenen Mail-Server nur sehr wenige E-Mails pro Stunde.
   - Entweder **Authentication → Sign In / Providers → Email → „Confirm email“ ausschalten** (Freunde können sich sofort anmelden),
   - oder unter **Authentication → Emails → SMTP Settings** einen eigenen Mail-Server eintragen (z. B. von Brevo oder Resend, kostenlos für wenige Mails).
   „Passwort vergessen“ braucht immer eine E-Mail. Den Link im **selben Browser** öffnen, in dem man ihn angefordert hat.

Danach schickst du deinen Freunden einfach die Adresse der Web-Version (oder die APK). Jeder legt sein eigenes Konto an,
startet mit einer leeren App und wählt einen Benutzernamen. Unter **Gemeinsam → Freunde** sucht man sich per Benutzername.

Hinweis: Benutzername, Anzeigename und Profilfoto sind für alle angemeldeten Nutzer sichtbar. Alles andere (deine Bereiche,
Aufgaben, Dokumente) sieht nur du. Gruppen-Inhalte sehen nur die Mitglieder der Gruppe.
