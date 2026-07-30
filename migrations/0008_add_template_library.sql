-- Erweitert die Standardbibliothek um zusaetzliche Kategorien und Vorlagen.
--
-- Zwei Eigenschaften sind hier wichtig:
--   1. Idempotent: Jedes INSERT ist durch ein NOT EXISTS abgesichert, die
--      Migration kann also gefahrlos auf eine bereits befuellte DB laufen.
--   2. Alle Inserts haengen an einem vorhandenen Admin ("... FROM users WHERE
--      role = 'admin'"). Existiert noch kein Admin -- also vor dem Setup --,
--      liefert die Subquery keine Zeile und die Migration wird zum No-Op.
--      Die Bibliothek wird dann spaeter von ensureDefaultLibrary() im Worker
--      angelegt (siehe src/library.ts).
--
-- Seit Migration 0007 sind templates.created_by_name / updated_by_name NOT NULL
-- ohne Default. Die Inserts muessen diese Spalten daher mitfuellen, sonst
-- bricht die gesamte Migration mit "NOT NULL constraint failed" ab.

INSERT INTO categories (slug, name, color, created_by)
SELECT 'berechtigungen', 'Berechtigungen', '#5b8def', a.id
FROM (SELECT id, display_name FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'berechtigungen' OR lower(name) = lower('Berechtigungen'));

INSERT INTO categories (slug, name, color, created_by)
SELECT 'mobilfunk', 'Mobilfunk', '#1f9d8b', a.id
FROM (SELECT id, display_name FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'mobilfunk' OR lower(name) = lower('Mobilfunk'));

INSERT INTO categories (slug, name, color, created_by)
SELECT 'e-mail', 'E-Mail', '#d97706', a.id
FROM (SELECT id, display_name FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'e-mail' OR lower(name) = lower('E-Mail'));

INSERT INTO categories (slug, name, color, created_by)
SELECT 'mfa', 'MFA', '#8b5cf6', a.id
FROM (SELECT id, display_name FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'mfa' OR lower(name) = lower('MFA'));

INSERT INTO categories (slug, name, color, created_by)
SELECT 'fachanwendungen', 'Fachanwendungen', '#c05621', a.id
FROM (SELECT id, display_name FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'fachanwendungen' OR lower(name) = lower('Fachanwendungen'));

INSERT INTO templates (category_id, title, body, version, created_by, created_by_name, updated_by, updated_by_name)
SELECT c.id, 'Telefonische Rückmeldung erbeten',
'Hallo [USERNAME],

leider konnte ich Sie telefonisch nicht erreichen.

Bitte melden Sie sich bei uns unter der 089 44459333 und lassen Sie sich zu mir durchstellen.

Vielen Dank für Ihre Mithilfe.

Mit freundlichen Grüßen
[ICH]', 1, a.id, a.display_name, a.id, a.display_name
FROM categories c, (SELECT id, display_name FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE c.slug = 'allgemein'
AND NOT EXISTS (SELECT 1 FROM templates WHERE lower(title) = lower('Telefonische Rückmeldung erbeten'));

INSERT INTO templates (category_id, title, body, version, created_by, created_by_name, updated_by, updated_by_name)
SELECT c.id, 'VPN nach Neustart wieder funktionsfähig',
'Hallo [USERNAME],

bitte starten Sie Ihren PC einmal neu. Bitte wählen Sie dabei "Neu starten" und nicht "Herunterfahren".

Falls der VPN-Anschluss danach weiterhin nicht funktioniert, führen Sie bitte einen zweiten Neustart durch.

Anschließend sollte der VPN-Zugang wieder funktionieren.

Falls das Problem weiterhin besteht, geben Sie uns bitte Bescheid.

Vielen Dank für Ihre Mithilfe.

Mit freundlichen Grüßen
[ICH]', 1, a.id, a.display_name, a.id, a.display_name
FROM categories c, (SELECT id, display_name FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE c.slug = 'vpn'
AND NOT EXISTS (SELECT 1 FROM templates WHERE lower(title) = lower('VPN nach Neustart wieder funktionsfähig'));

INSERT INTO templates (category_id, title, body, version, created_by, created_by_name, updated_by, updated_by_name)
SELECT c.id, 'Berechtigung über BBV-App beantragen',
'Hallo [USERNAME],

bitte beantragen Sie die benötigte Berechtigung über die neue BBV-App.

Sie finden die Anwendung im SalesNet.

Vielen Dank für Ihre Mithilfe.

Mit freundlichen Grüßen
[ICH]', 1, a.id, a.display_name, a.id, a.display_name
FROM categories c, (SELECT id, display_name FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE c.slug = 'berechtigungen'
AND NOT EXISTS (SELECT 1 FROM templates WHERE lower(title) = lower('Berechtigung über BBV-App beantragen'));

INSERT INTO templates (category_id, title, body, version, created_by, created_by_name, updated_by, updated_by_name)
SELECT c.id, 'Software über Ivanti bereitgestellt',
'Hallo [USERNAME],

ich habe das Programm für Sie über Ivanti bereitgestellt.

Die Installation erfolgt im Laufe des Tages im Hintergrund.

Mit freundlichen Grüßen
[ICH]', 1, a.id, a.display_name, a.id, a.display_name
FROM categories c, (SELECT id, display_name FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE c.slug = 'software'
AND NOT EXISTS (SELECT 1 FROM templates WHERE lower(title) = lower('Software über Ivanti bereitgestellt'));

INSERT INTO templates (category_id, title, body, version, created_by, created_by_name, updated_by, updated_by_name)
SELECT c.id, 'Datenvolumen erhöht',
'Hallo [USERNAME],

Ihr Datenvolumen wurde auf [DATENVOLUMEN] erhöht.

Bei weiteren Fragen erreichen Sie uns gerne unter der 089 44459333.

Mit freundlichen Grüßen
[ICH]', 1, a.id, a.display_name, a.id, a.display_name
FROM categories c, (SELECT id, display_name FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE c.slug = 'mobilfunk'
AND NOT EXISTS (SELECT 1 FROM templates WHERE lower(title) = lower('Datenvolumen erhöht'));

INSERT INTO templates (category_id, title, body, version, created_by, created_by_name, updated_by, updated_by_name)
SELECT c.id, 'HP-Ticket erstellt',
'Hallo [USERNAME],

bei HP wurde ein Ticket für Sie eröffnet.

Ticketnummer: [HP-TICKETNUMMER]

Ein Techniker von HP wird sich demnächst mit Ihnen in Verbindung setzen.

Bitte hinterlegen Sie im Ticket neue Informationen, Screenshots und den E-Mail-Verkehr mit HP.

Vielen Dank für Ihre Mithilfe.

Mit freundlichen Grüßen
[ICH]', 1, a.id, a.display_name, a.id, a.display_name
FROM categories c, (SELECT id, display_name FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE c.slug = 'hardware'
AND NOT EXISTS (SELECT 1 FROM templates WHERE lower(title) = lower('HP-Ticket erstellt'));

INSERT INTO templates (category_id, title, body, version, created_by, created_by_name, updated_by, updated_by_name)
SELECT c.id, 'HP-Ticket erstellt – Rückmeldung mit PIN',
'Hallo [USERNAME],

bei HP wurde ein Ticket für Sie eröffnet.

Ticketnummer: [HP-TICKETNUMMER]

Bitte melden Sie sich zeitnah bei HP unter der Telefonnummer [HP-NUMMER] und geben Sie die PIN-ID [HP-PIN-ID] an.

Bitte beachten Sie, dass die Rückmeldung bis spätestens [FRISTDATUM] erfolgen muss, da HP das Ticket sonst schließt.

Bitte hinterlegen Sie im Ticket neue Informationen, Screenshots und den E-Mail-Verkehr mit HP.

Vielen Dank für Ihre Mithilfe.

Mit freundlichen Grüßen
[ICH]', 1, a.id, a.display_name, a.id, a.display_name
FROM categories c, (SELECT id, display_name FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE c.slug = 'hardware'
AND NOT EXISTS (SELECT 1 FROM templates WHERE lower(title) = lower('HP-Ticket erstellt – Rückmeldung mit PIN'));

INSERT INTO templates (category_id, title, body, version, created_by, created_by_name, updated_by, updated_by_name)
SELECT c.id, 'Notebook startet nicht – Hard Reset',
'Hallo [USERNAME],

bitte führen Sie einmal einen Hard Reset am Notebook durch:

1. Stellen Sie sicher, dass das Notebook vollständig ausgeschaltet ist.
2. Entfernen Sie alle angeschlossenen Kabel, einschließlich des Netzkabels.
3. Halten Sie die Einschalttaste und die Taste F6 gleichzeitig etwa 30 Sekunden lang gedrückt.
4. Lassen Sie beide Tasten los. Das Notebook sollte anschließend wieder starten.
5. Danach können Sie alle Kabel wieder anschließen.

Bitte geben Sie im Ticket Bescheid, ob die Meldung danach erneut auftritt.

Mit freundlichen Grüßen
[ICH]', 1, a.id, a.display_name, a.id, a.display_name
FROM categories c, (SELECT id, display_name FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE c.slug = 'hardware'
AND NOT EXISTS (SELECT 1 FROM templates WHERE lower(title) = lower('Notebook startet nicht – Hard Reset'));

INSERT INTO templates (category_id, title, body, version, created_by, created_by_name, updated_by, updated_by_name)
SELECT c.id, 'Postfachberechtigung vergeben',
'Hallo [USERNAME],

ich habe Ihnen die Berechtigung für das Postfach soeben vergeben.

Das Postfach sollte innerhalb weniger Minuten sichtbar sein.

Falls es noch nicht angezeigt wird, starten Sie Outlook bitte einmal neu.

Mit freundlichen Grüßen
[ICH]', 1, a.id, a.display_name, a.id, a.display_name
FROM categories c, (SELECT id, display_name FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE c.slug = 'e-mail'
AND NOT EXISTS (SELECT 1 FROM templates WHERE lower(title) = lower('Postfachberechtigung vergeben'));

INSERT INTO templates (category_id, title, body, version, created_by, created_by_name, updated_by, updated_by_name)
SELECT c.id, 'Authenticator-Telefonnummer ändern',
'Hallo [USERNAME],

wenn Sie Ihre Telefonnummer im Authenticator oder in den Sicherheitsinformationen ändern möchten, führen Sie bitte die folgenden Schritte aus:

1. Öffnen Sie den folgenden Link:
https://mysignins.microsoft.com/security-info
2. Klicken Sie auf "Anmeldemethode hinzufügen".
3. Wenn bereits eine Telefonnummer hinterlegt ist, wählen Sie stattdessen "Ändern".

Es ist empfehlenswert, mehr als eine Anmeldemethode zu hinterlegen, zum Beispiel Authenticator und Telefonnummer.

Ich freue mich auf Ihre Rückmeldung.

Mit freundlichen Grüßen
[ICH]', 1, a.id, a.display_name, a.id, a.display_name
FROM categories c, (SELECT id, display_name FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE c.slug = 'mfa'
AND NOT EXISTS (SELECT 1 FROM templates WHERE lower(title) = lower('Authenticator-Telefonnummer ändern'));

INSERT INTO templates (category_id, title, body, version, created_by, created_by_name, updated_by, updated_by_name)
SELECT c.id, 'AS400-Passwort zurückgesetzt',
'Hallo [USERNAME],

ich habe Ihr AS400-Passwort zurückgesetzt.

Temporäres Passwort: [TEMP-PASSWORT]

Wenn Sie ein neues Passwort vergeben, beachten Sie bitte die geltenden Kennwortregeln für AS400.

Mit freundlichen Grüßen
[ICH]', 1, a.id, a.display_name, a.id, a.display_name
FROM categories c, (SELECT id, display_name FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE c.slug = 'fachanwendungen'
AND NOT EXISTS (SELECT 1 FROM templates WHERE lower(title) = lower('AS400-Passwort zurückgesetzt'));

INSERT INTO templates (category_id, title, body, version, created_by, created_by_name, updated_by, updated_by_name)
SELECT c.id, 'Astro per RemoteApp einrichten',
'Hallo [USERNAME],

für die Nutzung von Astro gehen Sie bitte wie folgt vor:

1. Öffnen Sie "RemoteApp- und Desktopverbindungen". Am schnellsten finden Sie den Eintrag über die Windows-Suche.
2. Klicken Sie auf "Auf RemoteApp und Desktops zugreifen".
3. Verwenden Sie als Verbindungs-URL:
https://HCETERM.ETG-FROESCHL.LOCAL/RDWEB/FEED/
4. Melden Sie sich anschließend mit Ihrer Windows-Kennung an, also mit Ihrer E-Mail-Adresse und Ihrem Windows-Passwort.

Mit freundlichen Grüßen
[ICH]', 1, a.id, a.display_name, a.id, a.display_name
FROM categories c, (SELECT id, display_name FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE c.slug = 'fachanwendungen'
AND NOT EXISTS (SELECT 1 FROM templates WHERE lower(title) = lower('Astro per RemoteApp einrichten'));

INSERT INTO templates (category_id, title, body, version, created_by, created_by_name, updated_by, updated_by_name)
SELECT c.id, 'Neuen PC zur Einrichtung vorbereiten',
'Hallo [USERNAME],

wenn der PC noch nicht in Betrieb war, ist er in der Regel auch noch nicht vollständig eingerichtet.

Bitte lassen Sie den PC zunächst mindestens zwei Stunden per LAN verbunden und führen Sie danach einen Neustart durch.

Anschließend sollte bei der Windows-Anmeldung die Option "Anderer Benutzer" angezeigt werden. Melden Sie sich dort bitte mit Ihrer Windows-Kennung beziehungsweise Ihrer E-Mail-Adresse und Ihrem Windows-Passwort an.

Bitte führen Sie danach noch die folgenden drei Schritte aus:

1. Sicherheitsscan über die Windows-Suche starten
2. Inventarscan über die Windows-Suche starten
3. Windows-Updates ausführen

Sobald diese Punkte erledigt sind, melden Sie sich bitte unter der 089 44459333 und lassen Sie sich zu mir durchstellen. Dann können wir den PC gemeinsam einrichten.

Mit freundlichen Grüßen
[ICH]', 1, a.id, a.display_name, a.id, a.display_name
FROM categories c, (SELECT id, display_name FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE c.slug = 'hardware'
AND NOT EXISTS (SELECT 1 FROM templates WHERE lower(title) = lower('Neuen PC zur Einrichtung vorbereiten'));

INSERT INTO templates (category_id, title, body, version, created_by, created_by_name, updated_by, updated_by_name)
SELECT c.id, 'Office-Desktop-Lizenz nicht verfügbar',
'Hallo [USERNAME],

das Lizenzmodell wurde geändert. Mitarbeitende in der Logistik können die Office-Desktop-Versionen derzeit leider nicht mehr nutzen.

Bitte verwenden Sie stattdessen die Web-Versionen. Diese finden Sie im SalesNet.

Falls Sie die Desktop-Versionen dennoch benötigen, beantragen Sie die Berechtigung bitte im SalesNet unter "Berechtigungen".

Mit freundlichen Grüßen
[ICH]', 1, a.id, a.display_name, a.id, a.display_name
FROM categories c, (SELECT id, display_name FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE c.slug = 'berechtigungen'
AND NOT EXISTS (SELECT 1 FROM templates WHERE lower(title) = lower('Office-Desktop-Lizenz nicht verfügbar'));

INSERT INTO templates (category_id, title, body, version, created_by, created_by_name, updated_by, updated_by_name)
SELECT c.id, 'Schletter-Ordnerpfad',
'Hallo [USERNAME],

den Schletter-Ordner finden Sie unter folgendem Pfad:

\\rexepm\Packages\Boudi\Scalc3\2.0

Mit freundlichen Grüßen
[ICH]', 1, a.id, a.display_name, a.id, a.display_name
FROM categories c, (SELECT id, display_name FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE c.slug = 'fachanwendungen'
AND NOT EXISTS (SELECT 1 FROM templates WHERE lower(title) = lower('Schletter-Ordnerpfad'));
