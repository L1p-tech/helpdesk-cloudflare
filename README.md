# 2nd Level Helpdesk – Cloudflare-Version

## Enthalten

- Benutzername/Passwort-Login
- Rollen: Mitarbeiter, Redakteur, Administrator
- zentrale Speicherung in Cloudflare D1
- gemeinsame Vorlagen und Befehle
- Vorschlags- und Freigabeprozess
- automatische Duplikatprüfung
- Wissenslücken: erfolglose Suchen werden erfasst und lassen sich direkt
  in eine Vorlage, einen Befehl oder eine Lösung überführen
- Versionsschutz bei gleichzeitigen Änderungen
- persönliche Speicherung von `[ICH]`
- Platzhalter wie `[USERNAME]` oder `[HOSTNAME]` werden beim Kopieren
  abgefragt; die Werte bleiben für den offenen Fall gemerkt, die Ticketnummer
  wird vorbelegt (nur im Browser-Tab, nicht in der Datenbank)
- Symptom-Assistent: erkennt Probleme aus einer Beschreibung in eigenen
  Worten (Synonyme, Wortformen) oder führt Schritt für Schritt durch 16
  Bereiche zu 94 Leitfäden mit Rückfragen, abhakbaren Schritten, passenden
  Befehlen und Lösungen; Ergebnis geht in Ticket-Generator oder Fall.
  Wissen ergänzen in `public/assistant-data.js`
- Befehlsbibliothek mit rund 225 Befehlen in 19 Bereichen (u. a. Active
  Directory, Sicherheit/Defender/BitLocker, Netzwerk/WLAN/VPN, Drucker,
  Outlook/Teams, Microsoft 365, Dateien, Remote, Ereignisse), jeweils mit
  Admin- und Risikohinweis. Bewusst nicht enthalten: Befehle, die Daten
  löschen, fremde Arbeit beenden, Passwörter/Rechte/Gruppen ändern oder
  Rechner vom Netz nehmen bzw. neu starten (ein Test sichert das ab).
  Neue Standardbefehle in `src/seed-data.ts`; sie werden beim nächsten
  Seitenaufruf automatisch ergänzt, ohne Migration
- Glossar mit rund 120 Fachwörtern aus Vorlagen, Befehlen und Lösungen,
  jeweils mit Beispiel und Querverweisen; auch über die Schnellsuche
  erreichbar. Begriffe ergänzen in `public/glossary-data.js`
- Schulung mit 16 Lernmodulen in vier Gruppen (Einarbeitung, Technik, Microsoft-Welt,
  Alltag): Fehlersuche, Netzwerk, Anmeldung, Microsoft 365, Fernzugriff und Drucken,
  die Microsoft-Landkarte (Entra ID = früher Azure AD, Exchange/EAC, Intune,
  Defender), Identität, Mailfluss und Fehlercodes, Geräte, Sicherheit am Telefon,
  Tickets, Priorisieren, Datenschutz, IT-Service (Incident/Change/Problem) u. a.:
  einfache Erklärungen mit Grafiken, Quiz,
  Praxisfall und Checkliste für die erste Woche. Der Fortschritt wird pro
  Benutzer gespeichert und ist nur für den Benutzer selbst sichtbar. Inhalte
  ergänzen in `public/training-data.js`, Grafiken in `public/training-diagrams.js`
- Startseite „Mein Tag“: letzte Übergabe, offene Fälle, Erinnerungen,
  Favoriten, wartende Freigaben und neue IT-Meldungen
- Seitenleiste mit Zählern, eigene Adresse je Bereich (`#/befehle`),
  Tastenkürzel (`Strg+K`, `/`, `g` + Buchstabe, `?` für die Übersicht)
- Pixel-Avatare: jeder baut seine Figur, sie erscheint neben dem Namen
- Benutzer- und Kategorienverwaltung
- Benachrichtigungen mit Ungelesen-Zähler und Lesestatus
- Erinnerungen mit Zeitzonenbehandlung und einmaliger Zustellung
- Änderungsprotokoll
- Helpdesk-Runner mit D1-Leaderboard
- vollständig statische Oberfläche plus Worker-API

## 1. Voraussetzungen

- Node.js 20.19 oder neuer
- Cloudflare-Account
- Domain im Cloudflare-Account
- Wrangler-Anmeldung über `npx wrangler login`

## 2. Abhängigkeiten installieren

```bash
npm install
```

## 3. D1-Datenbank erstellen

```bash
npm run db:create
```

Wrangler gibt eine `database_id` aus. Diese ID in `wrangler.jsonc` eintragen.

## 4. Migrationen anwenden

Lokal:

```bash
npm run db:migrate:local
```

Cloudflare:

```bash
npm run db:migrate:remote
```

## 5. Setup-Token setzen

Lokal `.dev.vars` aus `.dev.vars.example` erstellen.

Produktion:

```bash
npx wrangler secret put ADMIN_SETUP_TOKEN
```

Einen langen zufälligen Wert verwenden.

## 6. Ersten Administrator erstellen

Lokalen Server starten:

```bash
npm run dev
```

Danach in einem zweiten Terminal:

```bash
curl -X POST "http://localhost:8787/api/setup/admin" \
  -H "Content-Type: application/json" \
  -H "X-Setup-Token: DEIN_SETUP_TOKEN" \
  --data '{"username":"admin","displayName":"Administrator","password":"MINDESTENS-12-ZEICHEN"}'
```

Der Setup-Endpunkt funktioniert nur, solange noch kein Benutzer existiert.

## 7. Lokal testen

```bash
npm run check
npm run dev
```

Öffnen: `http://localhost:8787`

Testreihenfolge:

1. Admin anmelden.
2. Mitarbeiter anlegen.
3. Mitarbeiter anmelden und Vorlage vorschlagen.
4. Admin anmelden und Vorschlag genehmigen.
5. Mitarbeiter neu laden und veröffentlichte Vorlage prüfen.
6. `[ICH]` speichern und Kopierfunktion testen.
7. Befehl mit hohem Risiko kopieren.
8. Spiel starten und Leaderboard prüfen.

Automatisierte Tests laufen isoliert mit Miniflare/Workerd und JSDOM:

```bash
npm test
```

Hinweise für vorhandene Installationen und alte Passwort-Hashes stehen in
[UPDATE-ANLEITUNG.md](UPDATE-ANLEITUNG.md).

## 8. Veröffentlichen

```bash
npm run deploy
```

Vor dem Deploy prüft `scripts/predeploy.mjs`, ob das Schema der
Produktionsdatenbank zum Code passt. Sind Migrationen offen, werden sie
aufgelistet und nach einer kurzen Bestätigung angewendet. Ohne diesen Schritt
kann der Worker live gehen, bevor seine Spalten existieren — die betroffenen
Seiten antworten dann mit einem internen Serverfehler.

Ohne Terminal (CI) bricht der Deploy stattdessen ab. `HELPDESK_MIGRATE=ja`
wendet Migrationen dort bewusst ohne Rückfrage an.

Danach im Cloudflare-Dashboard:

1. **Workers & Pages**
2. Worker `helpdesk-cloudflare`
3. **Settings → Domains & Routes**
4. eigene Domain hinzufügen, zum Beispiel `helpdesk.deine-domain.de`

## Datensicherung

`npm run db:backup` exportiert die Produktionsdatenbank nach
`backups/helpdesk-JJJJ-MM-TT.sql` (die letzten 30 Dateien bleiben erhalten;
der Ordner ist nicht im Repository). Dafür muss `wrangler` angemeldet sein.
Für eine tägliche Sicherung den Befehl per Cron oder Aufgabenplanung
ausführen, zum Beispiel:

```
0 3 * * * cd /pfad/zum/projekt && npm run db:backup
```

Die Datei enthält Passwort-Hashes und alle Fallinhalte, deshalb gehört sie an
einen geschützten Ort. Einspielen in eine leere Datenbank:
`npx wrangler d1 execute helpdesk-db --remote --file backups/<datei>.sql`.
Zusätzlich bietet Cloudflare D1 „Time Travel“: Wiederherstellung auf einen
beliebigen Zeitpunkt der letzten 30 Tage
(`npx wrangler d1 time-travel restore helpdesk-db --timestamp=<ISO-Zeit>`).

## Rollen

- `employee`: Vorlagen nutzen und Vorschläge einreichen
- `editor`: zusätzlich Vorschläge prüfen und Befehle anlegen
- `admin`: zusätzlich Benutzer und Kategorien verwalten

## Sicherheitsentscheidungen

- PBKDF2-SHA-256 mit individuellem Salt
- Passwörter nie im Klartext
- Session-Tokens nur gehasht in D1
- `HttpOnly`, `Secure`, `SameSite=Strict`
- Kontosperre nach fünf Fehlversuchen
- zusätzlich höchstens 20 Fehlversuche je IP-Adresse in 15 Minuten
  (Tabelle `login_attempts`, Migration 0024)
- Rechteprüfung ausschließlich im Worker
- Mutationen werden auf gleiche Origin geprüft
- hohe Spielscores werden plausibilisiert
- Setup-Admin nur mit Secret und nur bei leerer Benutzertabelle

## Noch vor dem Produktivbetrieb empfohlen

- starke individuelle Startpasswörter
- erzwungener Passwortwechsel bei Erstanmeldung
- optional zusätzlich eine Cloudflare WAF-/Rate-Limit-Regel für `/api/auth/login`
  (die Begrenzung je IP im Worker ist bereits eingebaut)
- Backups einrichten, siehe Abschnitt „Datensicherung“
- interne Datenschutzprüfung
- Test mit zwei parallel angemeldeten Benutzern

## Design

Dunkles Neon-Design in vier Farbvarianten. Die Navigation sitzt als
Seitenleiste links (einklappbar, auf dem Handy als Schublade), darüber eine
schmale Kopfzeile mit Schnellsuche, offenem Fall, Erinnerungen und
Benachrichtigungen. Listen sind bewusst kompakt, jede Zeile hat einen eigenen
Kopierknopf.
