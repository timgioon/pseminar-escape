# Seminar-Escape – Cloud-Version

Die App ist für ein gemeinsames Seminar-Escape-Projekt mit Supabase vorbereitet. Die Browser-App nutzt ausschließlich den öffentlichen Supabase Publishable/Anon Key. Der Service-Role-Key bleibt ausschließlich in Supabase Edge Functions.

## Was diese Version mit Supabase synchronisiert

- Anmeldung über Benutzername + persönlichen Zugangscode (Supabase Auth; intern wird eine nicht zustellbare `.invalid`-E-Mail als Auth-Kennung verwendet).
- Profile, Rollen, Teamzuordnung und Projektfarben.
- Projektstammdaten und Teams.
- Aufgaben inkl. Status und Deadlines.
- Gruppen-/Teamchat mit Realtime-Aktualisierung; Nachrichten von Mitgliedern landen automatisch im eigenen Teamkanal.
- Umfragen und Stimmen (eine Stimme pro Benutzer, erneut abstimmbar).
- Projektdateien im privaten Storage-Bucket mit Teamordnern, Metadaten und zeitlich begrenzten Download-Links.
- Abschluss der interaktiven Einführung pro Profil.
- Monatsbericht aus den aktuell in Supabase gespeicherten Projektinformationen; PDF/Markdown wird weiterhin manuell heruntergeladen.

## Bereits erledigt

Du hast das Hauptschema `supabase/schema.sql` bereits im SQL Editor ausgeführt. Die Tabellen sollten sichtbar sein. **Nicht erneut ausführen.**

## Einmalige Supabase-Aktivierung

### 1. Admin-Auth-Konto anlegen

In Supabase Dashboard → Authentication → Users → Add user → Create new user:

- E-Mail: `admin@login.seminar-escape.invalid`
- Passwort: eigenes starkes Admin-Geheimnis mit mindestens 12 Zeichen
- **Auto Confirm User** aktivieren

Das ist keine echte Mailadresse und empfängt keine E-Mails. Sie dient nur als interne Auth-Kennung. Der Login in der App bleibt Benutzername + Zugangscode.

### 2. Erstprojekt und Admin-Profil anlegen

Öffne `supabase/bootstrap-admin.sql` im SQL Editor. Prüfe oben die drei Werte `admin_login_email`, `admin_username` und `admin_display_name`. Sie müssen zur eben angelegten Auth-Mail bzw. zum gewünschten Login-Namen passen. Für den Start kann `admin` bleiben. Danach den gesamten SQL-Code einmal ausführen.

### 3. Cloud- und Storage-Regeln aktivieren

Öffne `supabase/cloud-activation.sql` und führe den vollständigen Inhalt im SQL Editor aus. Das erstellt den privaten `project-files` Bucket, ergänzt Storage-Regeln und aktiviert zusätzliche projektbezogene Berechtigungen. Das Skript ist für erneutes Ausführen ausgelegt.

### 4. Edge Function für sichere Benutzeranlage bereitstellen

Voraussetzung: Node.js 20 oder neuer. Öffne PowerShell im Projektordner `seminar-escape` und führe aus:

```powershell
npm.cmd install
npm.cmd install -D supabase
npx.cmd supabase login
```

Im Browser den Supabase-Login bestätigen. Danach den Project Ref aus Supabase Dashboard → Project Settings → General kopieren und ausführen:

```powershell
npx.cmd supabase link --project-ref DEIN_PROJECT_REF
npx.cmd supabase functions deploy create-member --use-api
```

Die Funktion erstellt Auth-Benutzer und Profile nur nach Prüfung der angemeldeten Rolle. Der Service-Role-Key wird automatisch als serverseitige Supabase-Funktion-Umgebungsvariable verwendet und gehört niemals in `.env` oder den Browser.

### 5. Frontend konfigurieren

Im Projektordner eine Datei `.env` neben `package.json` anlegen. Werte aus Supabase Dashboard → Project Settings → API:

```env
VITE_SUPABASE_URL=https://DEIN_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Nur den öffentlichen Publishable Key (`sb_publishable_...`) oder bei älteren Projekten den anon Key verwenden, niemals den Secret Key (`sb_secret_...`) oder `service_role`.

Danach:

```powershell
npm.cmd install
npm.cmd run build
```

Wenn der Build erfolgreich ist, liegt die fertige Website im Ordner `dist`.

## Erststart

1. In der App mit Benutzername `admin` und dem im Auth-Dashboard festgelegten Passwort anmelden.
2. Beim ersten Login erscheint der Projekt-Assistent.
3. Projektname, Beschreibung und Enddatum einstellen; Teamleitungen und Mitglieder ergänzen.
4. Teamleitungen erhalten den eingegebenen Code. Mitglieder erhalten automatisch generierte Codes. Codes beim Anlegen sicher notieren und persönlich weitergeben.
5. Anschließend weitere Benutzer im Bereich **Teams** hinzufügen. Ein neu generierter Code wird nur direkt nach dem Erstellen angezeigt; er wird nicht im Klartext gespeichert.

## Wichtige Hinweise und Grenzen

- Die Auth-Kennung basiert auf dem normalisierten Benutzernamen. Benutzernamen müssen eindeutig sein und werden als Kleinbuchstaben/Bindestrich-Slug normalisiert.
- Zugangscodes mit mindestens 8 Zeichen verwenden; für den Admin mindestens 12 Zeichen.
- Teamleitungen dürfen nur Mitglieder des eigenen Teams anlegen. Nur Admins dürfen Teamleitungen anlegen. Admins können Konten nachträglich im jeweiligen Team-Bereich erstellen.
- Mitglieder sehen Team- und globale Aufgaben; sie können den Status ändern. Nur Admins/Teamleitungen dürfen Aufgaben erstellen.
- Teamaufgaben, Teamdateien, Team-Chatkanäle und Team-Umfragen werden serverseitig durch Row Level Security auf das jeweilige Team begrenzt; globale Aufgaben und Admin-Dateien sind projektweit sichtbar.
- Termine zeigt in dieser Version die Aufgaben-Deadlines. Ein separater Kalendertermin-Editor ist noch nicht angebunden.
- Push-Benachrichtigungen sind noch nicht als serverseitiger Push-Dienst eingerichtet.
- Vor dem Einsatz mit echten Schülerdaten RLS mit mindestens je einem Admin-, Teamleitungs- und Mitgliederkonto testen.
- Nach Konfiguration von `.env` muss die App neu gebaut und anschließend auf Netlify/Cloudflare Pages veröffentlicht werden. Lokale Daten aus älteren Demo-Versionen werden nicht automatisch in Supabase importiert.

## Teststatus

Die geänderten TypeScript-/TSX-Dateien wurden auf Syntax geprüft. Ein vollständiger Vite-Produktionsbuild konnte in der Erstellungsumgebung wegen eines Timeouts beim Herunterladen der npm-Abhängigkeiten nicht ausgeführt werden. Vor Veröffentlichung daher unbedingt lokal `npm.cmd install` und `npm.cmd run build` ausführen und eventuelle Fehlermeldungen prüfen.

## Lokal starten

```powershell
npm.cmd install
npm.cmd run dev
```
