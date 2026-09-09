# Update: Freigaben, Versionsschutz und Benachrichtigungen

Dieses Update behebt die Fehler im Überarbeitungsprozess, bei gleichzeitigen
Bearbeitungen und bei der Zustellung von Erinnerungen. Es ergänzt eine
Benachrichtigungsanzeige mit Zähler und „Als gelesen markieren“.

## Installation und Prüfung

Das vollständige Projekt übernehmen, einschließlich `src/`, `public/`,
`migrations/`, `tests/`, `package.json`, `package-lock.json` und `wrangler.jsonc`.
Einzelne Dateien aus einer älteren Update-Anleitung reichen nicht aus.

```bash
npm ci
npm run check
```

Die Tests laufen mit Miniflare/Workerd und isolierten D1-Datenbanken. Sie
verwenden weder die lokale Entwicklungsdatenbank noch Cloudflare-Produktivdaten.
Die Oberfläche wird zusätzlich mit JSDOM geprüft; das ersetzt keine visuelle
Browserprüfung. Die gezielten Fehlertests erzeugen erwartete Serverfehler im Log.

## Datenbank und Veröffentlichung

Die neue Migration `0019_workflow_integrity.sql` muss vor dem neuen Worker
angewendet werden. Sie erhält die vorhandenen Vorschläge einschließlich IDs,
Namen und Prüfnotizen. Sie ergänzt außerdem Versionsnummern für Befehle und
Lösungen sowie die Zuordnung von Erinnerungen zu Benachrichtigungen.

```bash
npm run db:migrate:local
npm run dev
```

Für die Produktion nach der lokalen Prüfung:

```bash
npm run deploy
```

Der bestehende Predeploy-Schritt zeigt offene Migrationen an und fragt vor
Anwendung auf die Produktionsdatenbank nach. Alternativ lässt sich das Schema
explizit mit `npm run db:migrate:remote` aktualisieren. Der neue Cron-Takt prüft
Erinnerungen jede Minute; Nachrichtenquellen behalten ihr 30-Minuten-Intervall.
Während die App geöffnet ist, aktualisiert sie Benachrichtigungen alle 30 Sekunden.
Nach der Veröffentlichung offene Browser-Tabs neu laden.

## Bestehende Vorschläge und Erinnerungen

Alte Änderungsvorschläge für Befehle oder Lösungen enthalten keine verlässliche
Ausgangsversion. Sie werden erhalten, können aber nicht ungeprüft freigegeben
werden. Den aktuellen Inhalt prüfen und den Änderungsvorschlag neu einreichen;
anschließend den alten Vorschlag mit entsprechender Begründung ablehnen.
Neue Änderungsvorschläge speichern die im Formular geöffnete Version.

Bestehende Erinnerungszeitpunkte werden in ein einheitliches UTC-Format gebracht.
Eine früher fehlende Zeitzone lässt sich nachträglich nicht zuverlässig ableiten.
Bei vor diesem Update angelegten Erinnerungen deshalb die angezeigte Uhrzeit
prüfen und gegebenenfalls die Erinnerung neu anlegen.

## Alte Passwort-Hashes

Migration 0010 ist jetzt absichtlich ohne Datenänderung. Eine Iterationszahl ist
Teil des Hash-Verfahrens und darf ohne Kenntnis des Passworts nicht reduziert
werden. Konten mit nicht unterstützten alten Parametern erhalten beim Login
einen Hinweis zur Passworterneuerung und sind in der Benutzerverwaltung markiert.

Ein angemeldeter Administrator setzt unter **Administration → Benutzer → Passwort**
ein neues Passwort. Passwort, Salt und Iterationszahl werden gemeinsam gespeichert;
alle bisherigen Sitzungen des betroffenen Kontos werden dabei ungültig.

Falls die frühere Migration 0010 bereits gelaufen ist, ist die originale
Iterationszahl aus dem aktuellen Datensatz nicht mehr erkennbar. Ein dadurch
beschädigter Hash kann nicht automatisch repariert werden. Betroffene Konten
benötigen ebenfalls ein neues Passwort. Nicht pauschal alle Iterationszahlen
zurücksetzen. Wenn kein Administrator mehr Zugang hat, ist eine gezielte
Wiederherstellung durch den Datenbankverantwortlichen erforderlich.

Die historische Migration 0006 wurde ebenfalls korrigiert, damit noch ausstehende
Updates auch Vorschläge mit `changes_requested`, `draft` oder `withdrawn` und
fehlendem Einreichdatum erhalten. Bereits aktualisierte Installationen bekommen
die Statuskorrektur durch Migration 0019.

## Struktur und Abhängigkeiten

- `src/mutations.ts`: atomare Vorbedingungen und Versionsprüfungen. Prüfung und
  Änderungen laufen in derselben D1-Transaktion; fehlgeschlagene Vorbedingungen
  rollen die gesamte Mutation zurück und ergeben HTTP 409.
- `src/notifications.ts`: Erinnerungen, Zustellung und benutzerspezifische Inbox.
- `public/notifications.js`: Anzeige, Lesestatus und Polling-Lebenszyklus.
- `tests/`: D1-, Migrations-, Authentifizierungs- und DOM-Regressionstests.

Die Overrides für `undici` und `sharp` schließen bekannte Schwachstellen in den
Entwicklungswerkzeugen. Bei einem späteren Wrangler-/Miniflare-Update prüfen, ob
die Overrides noch benötigt werden; nicht ungeprüft auf alte Versionen zurückgehen.
