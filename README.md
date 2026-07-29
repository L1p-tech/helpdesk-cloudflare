# 2nd Level Helpdesk – Cloudflare-Version

## Enthalten

- Benutzername/Passwort-Login
- Rollen: Mitarbeiter, Redakteur, Administrator
- zentrale Speicherung in Cloudflare D1
- gemeinsame Vorlagen und Befehle
- Vorschlags- und Freigabeprozess
- automatische Duplikatprüfung
- Versionsschutz bei gleichzeitigen Änderungen
- persönliche Speicherung von `[ICH]`
- Benutzer- und Kategorienverwaltung
- Benachrichtigungen in der Datenbank
- Änderungsprotokoll
- Helpdesk-Runner mit D1-Leaderboard
- vollständig statische Oberfläche plus Worker-API

## 1. Voraussetzungen

- Node.js 20 oder neuer
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
npm run typecheck
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

## 8. Veröffentlichen

```bash
npm run deploy
```

Danach im Cloudflare-Dashboard:

1. **Workers & Pages**
2. Worker `helpdesk-cloudflare`
3. **Settings → Domains & Routes**
4. eigene Domain hinzufügen, zum Beispiel `helpdesk.deine-domain.de`

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
- Rechteprüfung ausschließlich im Worker
- Mutationen werden auf gleiche Origin geprüft
- hohe Spielscores werden plausibilisiert
- Setup-Admin nur mit Secret und nur bei leerer Benutzertabelle

## Noch vor dem Produktivbetrieb empfohlen

- starke individuelle Startpasswörter
- erzwungener Passwortwechsel bei Erstanmeldung
- Cloudflare WAF-/Rate-Limit-Regel für `/api/auth/login`
- täglicher D1-Export oder regelmäßige Backups
- interne Datenschutzprüfung
- Test mit zwei parallel angemeldeten Benutzern

