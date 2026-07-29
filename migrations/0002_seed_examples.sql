-- Standardinhalte aus der bisherigen lokalen Helpdesk-Datei.
-- Die Migration ist wiederholbar: vorhandene Titel/Befehle werden nicht doppelt angelegt.

INSERT INTO templates (category_id, title, body, version, created_by, updated_by)
SELECT c.id, 'Passwort zurückgesetzt',
'Hallo [USERNAME],

Ihr Passwort wurde erfolgreich zurückgesetzt.

Bitte melden Sie sich mit dem temporären Passwort an und vergeben Sie umgehend ein neues persönliches Passwort.

Temporäres Passwort: [TEMP-PASSWORT]

Bei weiteren Fragen stehe ich gerne zur Verfügung.

Mit freundlichen Grüßen
[ICH]', 1, a.id, a.id
FROM categories c, (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE c.slug = 'passwort'
AND NOT EXISTS (SELECT 1 FROM templates WHERE lower(title) = lower('Passwort zurückgesetzt'));

INSERT INTO templates (category_id, title, body, version, created_by, updated_by)
SELECT c.id, 'Account gesperrt – entsperrt',
'Hallo [USERNAME],

Ihr Benutzerkonto wurde aufgrund mehrfacher Fehlanmeldungen automatisch gesperrt.

Ich habe die Sperre aufgehoben. Sie können sich ab sofort wieder anmelden.

Falls Sie Ihr Passwort vergessen haben, melden Sie sich gerne erneut.

Mit freundlichen Grüßen
[ICH]', 1, a.id, a.id
FROM categories c, (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE c.slug = 'passwort'
AND NOT EXISTS (SELECT 1 FROM templates WHERE lower(title) = lower('Account gesperrt – entsperrt'));

INSERT INTO templates (category_id, title, body, version, created_by, updated_by)
SELECT c.id, 'Drucker verbunden',
'Hallo [USERNAME],

der Drucker [DRUCKERNAME] wurde auf Ihrem Arbeitsplatz [PC-NAME] erfolgreich eingerichtet.

Sie können ihn ab sofort über die gewohnte Druckfunktion auswählen.

Falls der Drucker nicht in der Liste erscheint, starten Sie bitte einmal Ihren PC neu.

Mit freundlichen Grüßen
[ICH]', 1, a.id, a.id
FROM categories c, (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE c.slug = 'drucker'
AND NOT EXISTS (SELECT 1 FROM templates WHERE lower(title) = lower('Drucker verbunden'));

INSERT INTO templates (category_id, title, body, version, created_by, updated_by)
SELECT c.id, 'Drucker – Papierstau / Fehlermeldung',
'Hallo [USERNAME],

vielen Dank für Ihre Meldung.

Das Problem am Drucker [DRUCKERNAME] wurde behoben. Es handelte sich um [URSACHE].

Der Drucker ist wieder einsatzbereit.

Mit freundlichen Grüßen
[ICH]', 1, a.id, a.id
FROM categories c, (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE c.slug = 'drucker'
AND NOT EXISTS (SELECT 1 FROM templates WHERE lower(title) = lower('Drucker – Papierstau / Fehlermeldung'));

INSERT INTO templates (category_id, title, body, version, created_by, updated_by)
SELECT c.id, 'Software installiert',
'Hallo [USERNAME],

die angeforderte Software [SOFTWARE-NAME] wurde auf Ihrem Arbeitsplatz [PC-NAME] installiert.

Sie finden die Anwendung im Startmenü bzw. auf dem Desktop.

Bitte melden Sie sich kurz ab und wieder an, damit alle Berechtigungen übernommen werden.

Mit freundlichen Grüßen
[ICH]', 1, a.id, a.id
FROM categories c, (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE c.slug = 'software'
AND NOT EXISTS (SELECT 1 FROM templates WHERE lower(title) = lower('Software installiert'));

INSERT INTO templates (category_id, title, body, version, created_by, updated_by)
SELECT c.id, 'Software – Genehmigung erforderlich',
'Hallo [USERNAME],

für die Installation von [SOFTWARE-NAME] ist eine Genehmigung durch Ihren Vorgesetzten erforderlich.

Bitte lassen Sie uns die schriftliche Freigabe von [VORGESETZTER] zukommen. Danach nehmen wir die Installation zeitnah vor.

Mit freundlichen Grüßen
[ICH]', 1, a.id, a.id
FROM categories c, (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE c.slug = 'software'
AND NOT EXISTS (SELECT 1 FROM templates WHERE lower(title) = lower('Software – Genehmigung erforderlich'));

INSERT INTO templates (category_id, title, body, version, created_by, updated_by)
SELECT c.id, 'VPN-Zugang eingerichtet',
'Hallo [USERNAME],

Ihr VPN-Zugang wurde eingerichtet.

Bitte laden Sie den VPN-Client über [LINK/PFAD] herunter und verbinden Sie sich mit dem Profil [PROFILNAME].

Verwenden Sie zur Anmeldung Ihre regulären Windows-Zugangsdaten.

Anleitung: [LINK ZUR ANLEITUNG]

Mit freundlichen Grüßen
[ICH]', 1, a.id, a.id
FROM categories c, (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE c.slug = 'vpn'
AND NOT EXISTS (SELECT 1 FROM templates WHERE lower(title) = lower('VPN-Zugang eingerichtet'));

INSERT INTO templates (category_id, title, body, version, created_by, updated_by)
SELECT c.id, 'VPN – Verbindungsprobleme',
'Hallo [USERNAME],

bitte prüfen Sie folgende Punkte:
1. Ist die Internetverbindung stabil?
2. Ist der VPN-Client auf dem neuesten Stand?
3. Ist das richtige VPN-Profil ausgewählt?

Falls das Problem weiterhin besteht, benötige ich einen Screenshot der Fehlermeldung sowie die Ausgabe von ipconfig.

Mit freundlichen Grüßen
[ICH]', 1, a.id, a.id
FROM categories c, (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE c.slug = 'vpn'
AND NOT EXISTS (SELECT 1 FROM templates WHERE lower(title) = lower('VPN – Verbindungsprobleme'));

INSERT INTO templates (category_id, title, body, version, created_by, updated_by)
SELECT c.id, 'Rückfrage – mehr Infos nötig',
'Hallo [USERNAME],

vielen Dank für Ihre Anfrage.

Um Ihr Anliegen bearbeiten zu können, benötige ich noch folgende Informationen:

- [FRAGE 1]
- [FRAGE 2]

Sobald mir diese vorliegen, kümmere ich mich darum.

Mit freundlichen Grüßen
[ICH]', 1, a.id, a.id
FROM categories c, (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE c.slug = 'allgemein'
AND NOT EXISTS (SELECT 1 FROM templates WHERE lower(title) = lower('Rückfrage – mehr Infos nötig'));

INSERT INTO templates (category_id, title, body, version, created_by, updated_by)
SELECT c.id, 'Ticket gelöst – Abschluss',
'Hallo [USERNAME],

Ihr Anliegen wurde wie besprochen gelöst.

Zusammenfassung: [BESCHREIBUNG DER LÖSUNG]

Sollte das Problem erneut auftreten, können Sie sich jederzeit melden. Ich schließe dieses Ticket hiermit.

Mit freundlichen Grüßen
[ICH]', 1, a.id, a.id
FROM categories c, (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE c.slug = 'allgemein'
AND NOT EXISTS (SELECT 1 FROM templates WHERE lower(title) = lower('Ticket gelöst – Abschluss'));

INSERT INTO templates (category_id, title, body, version, created_by, updated_by)
SELECT c.id, 'Weiterleitung an 3rd Level',
'Hallo [USERNAME],

vielen Dank für Ihre Geduld.

Ich habe Ihr Anliegen an unsere Fachabteilung [TEAM/ABTEILUNG] weitergeleitet, da eine tiefergehende Analyse notwendig ist.

Die Ticketnummer lautet weiterhin [TICKET-NR].

Mit freundlichen Grüßen
[ICH]', 1, a.id, a.id
FROM categories c, (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE c.slug = 'allgemein'
AND NOT EXISTS (SELECT 1 FROM templates WHERE lower(title) = lower('Weiterleitung an 3rd Level'));

INSERT INTO templates (category_id, title, body, version, created_by, updated_by)
SELECT c.id, 'Hardware-Tausch durchgeführt',
'Hallo [USERNAME],

der Austausch Ihres [GERÄT] wurde durchgeführt.

Neues Gerät: [MODELL / INVENTARNR]

Bitte prüfen Sie kurz, ob alles einwandfrei funktioniert.

Mit freundlichen Grüßen
[ICH]', 1, a.id, a.id
FROM categories c, (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE c.slug = 'hardware'
AND NOT EXISTS (SELECT 1 FROM templates WHERE lower(title) = lower('Hardware-Tausch durchgeführt'));

INSERT INTO templates (category_id, title, body, version, created_by, updated_by)
SELECT c.id, 'Hardware-Bestellung – in Bearbeitung',
'Hallo [USERNAME],

Ihre Anfrage für [GERÄT] wurde aufgenommen und die Bestellung ist in Bearbeitung.

Voraussichtliche Lieferzeit: [ZEITRAUM]

Ich melde mich, sobald das Gerät eingetroffen ist.

Mit freundlichen Grüßen
[ICH]', 1, a.id, a.id
FROM categories c, (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE c.slug = 'hardware'
AND NOT EXISTS (SELECT 1 FROM templates WHERE lower(title) = lower('Hardware-Bestellung – in Bearbeitung'));

INSERT INTO commands
(category, name, command, description, shell, requires_admin, risk_level, remote_capable, restart_required, created_by, updated_by)
SELECT 'Netzwerk', 'Netzwerkkonfiguration anzeigen', 'ipconfig /all',
'Zeigt ausführliche Informationen zu Netzwerkadaptern, IP-Adressen, DNS-Servern und Standardgateway.',
'cmd', 0, 'low', 1, 0, a.id, a.id
FROM (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE NOT EXISTS (SELECT 1 FROM commands WHERE command = 'ipconfig /all');

INSERT INTO commands
(category, name, command, description, shell, requires_admin, risk_level, remote_capable, restart_required, created_by, updated_by)
SELECT 'Netzwerk', 'DNS-Zwischenspeicher leeren', 'ipconfig /flushdns',
'Leert den lokalen DNS-Cache. Hilfreich bei falscher oder veralteter Namensauflösung.',
'cmd', 0, 'low', 1, 0, a.id, a.id
FROM (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE NOT EXISTS (SELECT 1 FROM commands WHERE command = 'ipconfig /flushdns');

INSERT INTO commands
(category, name, command, description, shell, requires_admin, risk_level, remote_capable, restart_required, created_by, updated_by)
SELECT 'Netzwerk', 'Neue IP-Adresse anfordern', 'ipconfig /release
ipconfig /renew',
'Gibt die aktuelle DHCP-Adresse frei und fordert anschließend eine neue IP-Adresse an.',
'cmd', 0, 'medium', 0, 0, a.id, a.id
FROM (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE NOT EXISTS (SELECT 1 FROM commands WHERE command LIKE 'ipconfig /release%');

INSERT INTO commands
(category, name, command, description, shell, requires_admin, risk_level, remote_capable, restart_required, created_by, updated_by)
SELECT 'Windows', 'Gruppenrichtlinien aktualisieren', 'gpupdate /force',
'Lädt Benutzer- und Computerrichtlinien erneut.',
'cmd', 0, 'low', 1, 0, a.id, a.id
FROM (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE NOT EXISTS (SELECT 1 FROM commands WHERE command = 'gpupdate /force');

INSERT INTO commands
(category, name, command, description, shell, requires_admin, risk_level, remote_capable, restart_required, created_by, updated_by)
SELECT 'Benutzer', 'Angemeldeten Benutzer anzeigen', 'whoami',
'Zeigt das aktuell verwendete Benutzerkonto inklusive Domäne an.',
'cmd', 0, 'low', 1, 0, a.id, a.id
FROM (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE NOT EXISTS (SELECT 1 FROM commands WHERE command = 'whoami');

INSERT INTO commands
(category, name, command, description, shell, requires_admin, risk_level, remote_capable, restart_required, created_by, updated_by)
SELECT 'Windows', 'Computername anzeigen', 'hostname',
'Zeigt den Namen des aktuellen Computers an.',
'cmd', 0, 'low', 1, 0, a.id, a.id
FROM (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE NOT EXISTS (SELECT 1 FROM commands WHERE command = 'hostname');

INSERT INTO commands
(category, name, command, description, shell, requires_admin, risk_level, remote_capable, restart_required, created_by, updated_by)
SELECT 'Netzwerk', 'Erreichbarkeit prüfen', 'ping [SERVER-ODER-IP]',
'Prüft, ob ein Server oder Gerät über das Netzwerk erreichbar ist.',
'cmd', 0, 'low', 1, 0, a.id, a.id
FROM (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE NOT EXISTS (SELECT 1 FROM commands WHERE command = 'ping [SERVER-ODER-IP]');

INSERT INTO commands
(category, name, command, description, shell, requires_admin, risk_level, remote_capable, restart_required, created_by, updated_by)
SELECT 'Netzwerk', 'DNS-Auflösung prüfen', 'nslookup [HOSTNAME]',
'Prüft, welche IP-Adresse ein DNS-Server für einen Hostnamen zurückliefert.',
'cmd', 0, 'low', 1, 0, a.id, a.id
FROM (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE NOT EXISTS (SELECT 1 FROM commands WHERE command = 'nslookup [HOSTNAME]');

INSERT INTO commands
(category, name, command, description, shell, requires_admin, risk_level, remote_capable, restart_required, created_by, updated_by)
SELECT 'Netzwerk', 'Netzwerkweg prüfen', 'tracert [SERVER-ODER-IP]',
'Zeigt die einzelnen Netzwerkstationen auf dem Weg zum Ziel.',
'cmd', 0, 'low', 1, 0, a.id, a.id
FROM (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE NOT EXISTS (SELECT 1 FROM commands WHERE command = 'tracert [SERVER-ODER-IP]');

INSERT INTO commands
(category, name, command, description, shell, requires_admin, risk_level, remote_capable, restart_required, created_by, updated_by)
SELECT 'Netzwerk', 'Aktive Verbindungen anzeigen', 'netstat -ano',
'Zeigt aktive Netzwerkverbindungen, Ports und zugehörige Prozess-IDs.',
'cmd', 0, 'low', 1, 0, a.id, a.id
FROM (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE NOT EXISTS (SELECT 1 FROM commands WHERE command = 'netstat -ano');

INSERT INTO commands
(category, name, command, description, shell, requires_admin, risk_level, remote_capable, restart_required, created_by, updated_by)
SELECT 'Windows', 'Systeminformationen anzeigen', 'systeminfo',
'Zeigt Betriebssystem, Installationsdatum, Arbeitsspeicher, Hotfixes und weitere Systeminformationen.',
'cmd', 0, 'low', 1, 0, a.id, a.id
FROM (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE NOT EXISTS (SELECT 1 FROM commands WHERE command = 'systeminfo');

INSERT INTO commands
(category, name, command, description, shell, requires_admin, risk_level, remote_capable, restart_required, created_by, updated_by)
SELECT 'Reparatur', 'Windows-Systemdateien prüfen', 'sfc /scannow',
'Prüft geschützte Windows-Systemdateien und versucht beschädigte Dateien zu reparieren.',
'cmd', 1, 'medium', 0, 0, a.id, a.id
FROM (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE NOT EXISTS (SELECT 1 FROM commands WHERE command = 'sfc /scannow');

INSERT INTO commands
(category, name, command, description, shell, requires_admin, risk_level, remote_capable, restart_required, created_by, updated_by)
SELECT 'Reparatur', 'Windows-Abbild reparieren', 'DISM /Online /Cleanup-Image /RestoreHealth',
'Prüft und repariert den Windows-Komponentenspeicher.',
'cmd', 1, 'medium', 0, 0, a.id, a.id
FROM (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE NOT EXISTS (SELECT 1 FROM commands WHERE command = 'DISM /Online /Cleanup-Image /RestoreHealth');

INSERT INTO commands
(category, name, command, description, shell, requires_admin, risk_level, remote_capable, restart_required, created_by, updated_by)
SELECT 'Prozesse', 'Aktuelle Prozesse anzeigen', 'tasklist',
'Listet laufende Prozesse mit Prozess-ID und Speicherverbrauch auf.',
'cmd', 0, 'low', 1, 0, a.id, a.id
FROM (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE NOT EXISTS (SELECT 1 FROM commands WHERE command = 'tasklist');

INSERT INTO commands
(category, name, command, description, shell, requires_admin, risk_level, remote_capable, restart_required, created_by, updated_by)
SELECT 'Prozesse', 'Prozess beenden', 'taskkill /PID [PROZESS-ID] /F',
'Beendet einen Prozess anhand seiner Prozess-ID. Vorsichtig verwenden.',
'cmd', 1, 'high', 0, 0, a.id, a.id
FROM (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE NOT EXISTS (SELECT 1 FROM commands WHERE command = 'taskkill /PID [PROZESS-ID] /F');

INSERT INTO commands
(category, name, command, description, shell, requires_admin, risk_level, remote_capable, restart_required, created_by, updated_by)
SELECT 'Gruppenrichtlinien', 'Gespeicherte Gruppenrichtlinien anzeigen', 'gpresult /r',
'Zeigt, welche Gruppenrichtlinien für Computer und Benutzer angewendet wurden.',
'cmd', 0, 'low', 1, 0, a.id, a.id
FROM (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE NOT EXISTS (SELECT 1 FROM commands WHERE command = 'gpresult /r');

INSERT INTO commands
(category, name, command, description, shell, requires_admin, risk_level, remote_capable, restart_required, created_by, updated_by)
SELECT 'Windows', 'Windows-Ereignisanzeige öffnen', 'eventvwr.msc',
'Öffnet die Ereignisanzeige zur Prüfung von System-, Anwendungs- und Sicherheitsmeldungen.',
'windows', 0, 'low', 0, 0, a.id, a.id
FROM (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE NOT EXISTS (SELECT 1 FROM commands WHERE command = 'eventvwr.msc');

INSERT INTO commands
(category, name, command, description, shell, requires_admin, risk_level, remote_capable, restart_required, created_by, updated_by)
SELECT 'Windows', 'Geräte-Manager öffnen', 'devmgmt.msc',
'Öffnet den Geräte-Manager, um Hardware und Treiber zu prüfen.',
'windows', 0, 'low', 0, 0, a.id, a.id
FROM (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE NOT EXISTS (SELECT 1 FROM commands WHERE command = 'devmgmt.msc');

INSERT INTO commands
(category, name, command, description, shell, requires_admin, risk_level, remote_capable, restart_required, created_by, updated_by)
SELECT 'Windows', 'Diensteverwaltung öffnen', 'services.msc',
'Öffnet die Windows-Diensteverwaltung zum Prüfen, Starten oder Beenden von Diensten.',
'windows', 0, 'medium', 0, 0, a.id, a.id
FROM (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE NOT EXISTS (SELECT 1 FROM commands WHERE command = 'services.msc');

INSERT INTO commands
(category, name, command, description, shell, requires_admin, risk_level, remote_capable, restart_required, created_by, updated_by)
SELECT 'Datenträger', 'Lokale Laufwerke anzeigen',
'Get-CimInstance Win32_LogicalDisk | Select-Object DeviceID, Description, FreeSpace, Size',
'Zeigt Laufwerksbuchstaben, Typ, freien Speicherplatz und Gesamtgröße an.',
'powershell', 0, 'low', 1, 0, a.id, a.id
FROM (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) a
WHERE NOT EXISTS (
  SELECT 1 FROM commands
  WHERE command = 'Get-CimInstance Win32_LogicalDisk | Select-Object DeviceID, Description, FreeSpace, Size'
);
