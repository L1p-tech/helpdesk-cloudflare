-- Weitere Loesungen fuer haeufige Helpdesk-Probleme. Der Symptom-Assistent
-- verweist ueber Suchwoerter auf den Loesungsbestand -- mit diesen Eintraegen
-- findet er fuer die meisten Leitfaeden einen konkreten Loesungsweg.
--
-- Jeder Eintrag wird nur angelegt, wenn es den Titel noch nicht gibt. So
-- entstehen keine Doppelten, falls das Team schon eine gleichnamige Loesung
-- gepflegt hat.

INSERT INTO solutions (category, title, symptom, cause, solution, severity, created_by_name, updated_by_name)
SELECT 'Teams', 'Teams: Gegenüber hört mich nicht / kein Ton',
 'Im Teams-Meeting hört der Benutzer nichts oder die anderen hören ihn nicht. Headset und Mikrofon sind angeschlossen.',
 'Meist ist in Teams ein anderes Audiogerät ausgewählt, oder Windows sperrt den Mikrofonzugriff für Apps.',
 '1. In Teams: Einstellungen, Geräte – Lautsprecher und Mikrofon auf das Headset stellen, Testanruf machen.' || char(10) ||
 '2. Windows: Einstellungen, Datenschutz, Mikrofon – Zugriff für Apps und Desktop-Apps erlauben.' || char(10) ||
 '3. Stummschalter am Headset-Kabel prüfen, anderen USB-Port testen.' || char(10) ||
 '4. Teams vollständig beenden (auch im Infobereich) und neu starten.',
 'medium', 'Mitgeliefert', 'Mitgeliefert'
WHERE NOT EXISTS (SELECT 1 FROM solutions WHERE title = 'Teams: Gegenüber hört mich nicht / kein Ton');

INSERT INTO solutions (category, title, symptom, cause, solution, severity, created_by_name, updated_by_name)
SELECT 'Teams', 'Teams startet nicht oder zeigt nur ein weißes Fenster',
 'Teams bleibt beim Start hängen, zeigt ein leeres weißes Fenster oder meldet sich ständig ab.',
 'Ein beschädigter lokaler Teams-Zwischenspeicher.',
 '1. Teams vollständig beenden, auch im Infobereich und im Task-Manager.' || char(10) ||
 '2. Neues Teams: Einstellungen, Apps, Microsoft Teams, Erweiterte Optionen – Zurücksetzen.' || char(10) ||
 '   Klassisches Teams: Ordner %AppData%\Microsoft\Teams leeren.' || char(10) ||
 '3. Teams starten und neu anmelden.' || char(10) ||
 '4. Klappt es weiterhin nicht: Teams im Browser testen, dann neu installieren.',
 'low', 'Mitgeliefert', 'Mitgeliefert'
WHERE NOT EXISTS (SELECT 1 FROM solutions WHERE title = 'Teams startet nicht oder zeigt nur ein weißes Fenster');

INSERT INTO solutions (category, title, symptom, cause, solution, severity, created_by_name, updated_by_name)
SELECT 'E-Mail', 'Outlook startet nicht oder hängt beim Laden des Profils',
 'Outlook bleibt bei "Profil wird geladen" stehen, stürzt beim Start ab oder reagiert nicht.',
 'Häufig ein fehlerhaftes Add-in, eine beschädigte OST-Datei oder ein defektes Outlook-Profil.',
 '1. Hängende Outlook-Prozesse im Task-Manager beenden.' || char(10) ||
 '2. Outlook im abgesicherten Modus starten: outlook.exe /safe – startet es, Add-ins nacheinander deaktivieren.' || char(10) ||
 '3. OST-Datei unter %LocalAppData%\Microsoft\Outlook umbenennen, sie wird neu aufgebaut.' || char(10) ||
 '4. Office-Schnellreparatur über Apps und Features.' || char(10) ||
 '5. Neues Outlook-Profil in der Systemsteuerung (Mail) anlegen.',
 'medium', 'Mitgeliefert', 'Mitgeliefert'
WHERE NOT EXISTS (SELECT 1 FROM solutions WHERE title = 'Outlook startet nicht oder hängt beim Laden des Profils');

INSERT INTO solutions (category, title, symptom, cause, solution, severity, created_by_name, updated_by_name)
SELECT 'E-Mail', 'Postfach ist voll',
 'Outlook meldet, dass das Postfach das Speicherlimit erreicht hat. Senden ist nicht mehr möglich.',
 'Große Anhänge, ungeleerte Ordner "Gelöschte Elemente" und fehlende Archivierung.',
 '1. Datei, Tools, Postfachbereinigung – Größe der Ordner anzeigen.' || char(10) ||
 '2. Gelöschte Elemente und Junk leeren, große Mails (Suche: Größe > 5 MB) aufräumen.' || char(10) ||
 '3. Online-Archiv aktivieren bzw. Archivierungsrichtlinie zuweisen.' || char(10) ||
 '4. Kontingent nur nach Freigabe erhöhen.',
 'medium', 'Mitgeliefert', 'Mitgeliefert'
WHERE NOT EXISTS (SELECT 1 FROM solutions WHERE title = 'Postfach ist voll');

INSERT INTO solutions (category, title, symptom, cause, solution, severity, created_by_name, updated_by_name)
SELECT 'E-Mail', 'Freigegebenes Postfach erscheint nicht in Outlook',
 'Der Benutzer hat Berechtigung auf ein Gruppen- oder Funktionspostfach, es erscheint aber nicht in Outlook.',
 'Die automatische Einbindung (AutoMapping) braucht bis zu einer Stunde, oder die Berechtigung fehlt.',
 '1. Berechtigung (Vollzugriff, ggf. Senden als) im Exchange Admin Center prüfen.' || char(10) ||
 '2. Bis zu 60 Minuten warten, Outlook neu starten.' || char(10) ||
 '3. Sonst manuell: Datei, Kontoeinstellungen, Ändern, Weitere Einstellungen, Erweitert – Postfach hinzufügen.' || char(10) ||
 '4. Im Outlook im Web testen: Rechtsklick auf Ordner, Freigegebenen Ordner hinzufügen.',
 'low', 'Mitgeliefert', 'Mitgeliefert'
WHERE NOT EXISTS (SELECT 1 FROM solutions WHERE title = 'Freigegebenes Postfach erscheint nicht in Outlook');

INSERT INTO solutions (category, title, symptom, cause, solution, severity, created_by_name, updated_by_name)
SELECT 'Dateien', 'OneDrive synchronisiert nicht',
 'Das OneDrive-Symbol zeigt ein rotes Kreuz oder Pausenzeichen, Dateien werden nicht hoch- oder heruntergeladen.',
 'Ungültige Dateinamen, zu lange Pfade, voller Speicher oder eine abgelaufene Anmeldung.',
 '1. Auf das OneDrive-Symbol klicken und die Fehlermeldung lesen.' || char(10) ||
 '2. Dateinamen mit Zeichen wie " * : < > ? / \ | sowie Pfade über 400 Zeichen korrigieren.' || char(10) ||
 '3. Freien Speicher lokal und in OneDrive prüfen.' || char(10) ||
 '4. Abmelden und neu anmelden, sonst zurücksetzen: %LocalAppData%\Microsoft\OneDrive\onedrive.exe /reset',
 'medium', 'Mitgeliefert', 'Mitgeliefert'
WHERE NOT EXISTS (SELECT 1 FROM solutions WHERE title = 'OneDrive synchronisiert nicht');

INSERT INTO solutions (category, title, symptom, cause, solution, severity, created_by_name, updated_by_name)
SELECT 'Berechtigungen', 'Zugriff verweigert trotz neuer Berechtigung',
 'Der Benutzer wurde einer Gruppe hinzugefügt, bekommt beim Öffnen des Ordners aber weiterhin "Zugriff verweigert".',
 'Gruppenmitgliedschaften stehen im Kerberos-Ticket der Anmeldung. Neue Gruppen wirken erst mit einem neuen Ticket.',
 '1. Gruppenmitgliedschaft prüfen: whoami /groups' || char(10) ||
 '2. Tickets erneuern: klist purge, danach Ordner erneut öffnen.' || char(10) ||
 '3. Sonst ab- und wieder anmelden.' || char(10) ||
 '4. Fehlt die Gruppe ganz: Berechtigung nur nach Freigabe des Ordner-Verantwortlichen beantragen.',
 'low', 'Mitgeliefert', 'Mitgeliefert'
WHERE NOT EXISTS (SELECT 1 FROM solutions WHERE title = 'Zugriff verweigert trotz neuer Berechtigung');

INSERT INTO solutions (category, title, symptom, cause, solution, severity, created_by_name, updated_by_name)
SELECT 'Windows', 'Bluescreen oder unerwartete Neustarts',
 'Der Rechner zeigt einen blauen Fehlerbildschirm oder startet ohne Vorwarnung neu.',
 'Meist ein fehlerhafter Treiber nach einem Update, seltener defekter Arbeitsspeicher oder Datenträger.',
 '1. Stoppcode notieren (Foto vom Bildschirm).' || char(10) ||
 '2. Ereignisanzeige: Kernel-Power 41 und BugCheck-Einträge suchen.' || char(10) ||
 '3. Kürzlich installierte Treiber und Updates prüfen, ggf. zurücksetzen.' || char(10) ||
 '4. sfc /scannow und DISM /Online /Cleanup-Image /RestoreHealth ausführen.' || char(10) ||
 '5. Bei Speicher- oder Datenträger-Stoppcodes: Hardwaretest, Gerät tauschen.',
 'high', 'Mitgeliefert', 'Mitgeliefert'
WHERE NOT EXISTS (SELECT 1 FROM solutions WHERE title = 'Bluescreen oder unerwartete Neustarts');

INSERT INTO solutions (category, title, symptom, cause, solution, severity, created_by_name, updated_by_name)
SELECT 'Windows', 'Rechner friert ein oder reagiert nicht mehr',
 'Mauszeiger oder Programme reagieren minutenlang nicht, manchmal hängt nur die Taskleiste.',
 'Ein Prozess belegt Prozessor oder Arbeitsspeicher, oder der Explorer hängt.',
 '1. Task-Manager (Strg+Umschalt+Esc): Prozesse nach CPU und Arbeitsspeicher sortieren.' || char(10) ||
 '2. Hängt nur Taskleiste/Desktop: Windows-Explorer im Task-Manager neu starten.' || char(10) ||
 '3. Systemfehler der letzten 24 Stunden in der Ereignisanzeige prüfen.' || char(10) ||
 '4. sfc /scannow ausführen, Treiber aktualisieren.',
 'medium', 'Mitgeliefert', 'Mitgeliefert'
WHERE NOT EXISTS (SELECT 1 FROM solutions WHERE title = 'Rechner friert ein oder reagiert nicht mehr');

INSERT INTO solutions (category, title, symptom, cause, solution, severity, created_by_name, updated_by_name)
SELECT 'Hardware', 'Externer Monitor an der Dockingstation wird nicht erkannt',
 'Am Laptop mit Dockingstation bleibt der externe Bildschirm schwarz oder wird nicht angezeigt.',
 'Die Dockingstation hängt, oder Firmware und Treiber sind veraltet.',
 '1. Windows+P: Anzeigemodus "Erweitern" wählen.' || char(10) ||
 '2. Dockingstation vom Strom trennen, 30 Sekunden warten, wieder anschließen.' || char(10) ||
 '3. Monitor direkt am Laptop testen – trennt Dock- von Monitorproblem.' || char(10) ||
 '4. Firmware und Treiber der Dockingstation über das Herstellertool aktualisieren.',
 'low', 'Mitgeliefert', 'Mitgeliefert'
WHERE NOT EXISTS (SELECT 1 FROM solutions WHERE title = 'Externer Monitor an der Dockingstation wird nicht erkannt');

INSERT INTO solutions (category, title, symptom, cause, solution, severity, created_by_name, updated_by_name)
SELECT 'Hardware', 'Headset wird nicht erkannt oder hat keinen Ton',
 'Das Headset ist angeschlossen, Windows oder Teams geben aber keinen Ton darüber aus.',
 'Ein anderes Gerät ist als Standard eingestellt, oder der USB-Anschluss bzw. die Bluetooth-Kopplung hängt.',
 '1. Windows-Soundeinstellungen: Headset als Ausgabe- und Eingabegerät wählen.' || char(10) ||
 '2. Anderen USB-Port direkt am Rechner nutzen (nicht über Hub/Dock).' || char(10) ||
 '3. Bluetooth: Gerät entfernen und neu koppeln.' || char(10) ||
 '4. In Teams unter Einstellungen, Geräte das Headset auswählen.',
 'low', 'Mitgeliefert', 'Mitgeliefert'
WHERE NOT EXISTS (SELECT 1 FROM solutions WHERE title = 'Headset wird nicht erkannt oder hat keinen Ton');

INSERT INTO solutions (category, title, symptom, cause, solution, severity, created_by_name, updated_by_name)
SELECT 'Benutzer', 'Passwort im Homeoffice abgelaufen',
 'Der Benutzer arbeitet von zu Hause und soll das Passwort ändern, die Änderung schlägt fehl oder das neue Passwort wird nicht angenommen.',
 'Ohne Verbindung zum Domänencontroller kann Windows das Passwort nicht ändern; danach ist das alte noch lokal zwischengespeichert.',
 '1. Mit dem bisherigen (zwischengespeicherten) Passwort anmelden.' || char(10) ||
 '2. VPN verbinden.' || char(10) ||
 '3. Strg+Alt+Entf, Kennwort ändern.' || char(10) ||
 '4. Bei bestehendem VPN Rechner sperren (Windows+L) und mit dem neuen Passwort entsperren.' || char(10) ||
 '5. Neues Passwort auf Handy und in Outlook nachtragen.',
 'medium', 'Mitgeliefert', 'Mitgeliefert'
WHERE NOT EXISTS (SELECT 1 FROM solutions WHERE title = 'Passwort im Homeoffice abgelaufen');

INSERT INTO solutions (category, title, symptom, cause, solution, severity, created_by_name, updated_by_name)
SELECT 'Benutzer', 'Vertrauensstellung zwischen Arbeitsstation und Domäne fehlgeschlagen',
 'Bei der Anmeldung erscheint "Die Vertrauensstellung zwischen dieser Arbeitsstation und der primären Domäne konnte nicht hergestellt werden".',
 'Das Kennwort des Computerkontos passt nicht mehr zur Domäne, etwa nach einer Wiederherstellung oder langer Offlinezeit.',
 '1. Mit einem lokalen Administratorkonto anmelden.' || char(10) ||
 '2. PowerShell als Administrator: Test-ComputerSecureChannel -Repair -Credential DOMAENE\Admin' || char(10) ||
 '3. Neu starten und mit dem Domänenkonto anmelden.' || char(10) ||
 '4. Hilft das nicht: Rechner aus der Domäne nehmen und neu aufnehmen.',
 'medium', 'Mitgeliefert', 'Mitgeliefert'
WHERE NOT EXISTS (SELECT 1 FROM solutions WHERE title = 'Vertrauensstellung zwischen Arbeitsstation und Domäne fehlgeschlagen');

INSERT INTO solutions (category, title, symptom, cause, solution, severity, created_by_name, updated_by_name)
SELECT 'Netzwerk', 'WLAN bricht ständig ab',
 'Die WLAN-Verbindung des Laptops reißt mehrmals am Tag ab und verbindet sich danach neu.',
 'Häufig Energiesparen des WLAN-Adapters, ein veralteter Treiber oder schwaches Signal am Platz.',
 '1. Geräte-Manager: WLAN-Adapter, Energieverwaltung – "Computer kann das Gerät ausschalten" deaktivieren.' || char(10) ||
 '2. WLAN-Treiber vom Hersteller aktualisieren.' || char(10) ||
 '3. Bericht erstellen: netsh wlan show wlanreport – Abbrüche und Gründe prüfen.' || char(10) ||
 '4. Signalstärke am Platz prüfen, testweise näher am Access Point arbeiten.',
 'low', 'Mitgeliefert', 'Mitgeliefert'
WHERE NOT EXISTS (SELECT 1 FROM solutions WHERE title = 'WLAN bricht ständig ab');

INSERT INTO solutions (category, title, symptom, cause, solution, severity, created_by_name, updated_by_name)
SELECT 'Browser', 'Webseite lädt nicht oder wird falsch dargestellt',
 'Eine Webanwendung zeigt eine alte Version, Knöpfe fehlen oder die Anmeldung dreht sich im Kreis.',
 'Veraltete Daten im Browser-Cache oder fehlerhafte Cookies.',
 '1. Seite mit Strg+F5 neu laden.' || char(10) ||
 '2. Im privaten Fenster testen – klappt es dort, liegt es an Cache oder Cookies.' || char(10) ||
 '3. Browser-Cache und Cookies für die Seite löschen.' || char(10) ||
 '4. Anderen Browser testen, Erweiterungen deaktivieren.',
 'low', 'Mitgeliefert', 'Mitgeliefert'
WHERE NOT EXISTS (SELECT 1 FROM solutions WHERE title = 'Webseite lädt nicht oder wird falsch dargestellt');

INSERT INTO solutions (category, title, symptom, cause, solution, severity, created_by_name, updated_by_name)
SELECT 'Sicherheit', 'Auf Phishing-Link geklickt oder Zugangsdaten eingegeben',
 'Ein Benutzer meldet, auf einen Link in einer verdächtigen Mail geklickt oder dort sein Passwort eingegeben zu haben.',
 'Angreifer versuchen, Zugangsdaten abzugreifen oder Schadsoftware zu installieren.',
 '1. Rechner sofort vom Netz trennen (Kabel ziehen, WLAN aus) – nicht ausschalten.' || char(10) ||
 '2. Passwort sofort zurücksetzen und alle Sitzungen widerrufen.' || char(10) ||
 '3. MFA-Methoden, Postfachregeln und Weiterleitungen auf fremde Einträge prüfen.' || char(10) ||
 '4. Sicherheitsteam sofort informieren, Mail als Phishing melden.' || char(10) ||
 'Wichtig: Benutzer nicht beschuldigen – frühe Meldung begrenzt den Schaden.',
 'high', 'Mitgeliefert', 'Mitgeliefert'
WHERE NOT EXISTS (SELECT 1 FROM solutions WHERE title = 'Auf Phishing-Link geklickt oder Zugangsdaten eingegeben');

INSERT INTO solutions (category, title, symptom, cause, solution, severity, created_by_name, updated_by_name)
SELECT 'Dateien', 'Datei versehentlich gelöscht oder überschrieben',
 'Eine wichtige Datei ist weg oder wurde mit einem falschen Stand gespeichert.',
 'Versehentliches Löschen oder Speichern; meist ist ein älterer Stand noch vorhanden.',
 '1. Papierkorb prüfen – lokal bzw. im OneDrive-/SharePoint-Papierkorb (93 Tage).' || char(10) ||
 '2. Netzlaufwerk: Rechtsklick auf Ordner oder Datei, Vorgängerversionen wiederherstellen.' || char(10) ||
 '3. OneDrive/SharePoint: Versionsverlauf der Datei öffnen.' || char(10) ||
 '4. Sonst Wiederherstellung aus dem Backup mit Pfad und Zeitpunkt beantragen.',
 'medium', 'Mitgeliefert', 'Mitgeliefert'
WHERE NOT EXISTS (SELECT 1 FROM solutions WHERE title = 'Datei versehentlich gelöscht oder überschrieben');

INSERT INTO solutions (category, title, symptom, cause, solution, severity, created_by_name, updated_by_name)
SELECT 'Software', 'Word oder Excel stürzt ab oder öffnet Dateien nicht',
 'Ein Office-Programm schließt sich beim Start oder beim Öffnen bestimmter Dateien.',
 'Meist ein fehlerhaftes Add-in oder eine beschädigte Office-Installation.',
 '1. Im abgesicherten Modus starten: winword /safe bzw. excel /safe' || char(10) ||
 '2. Läuft es dort: Datei, Optionen, Add-Ins – COM-Add-ins nacheinander deaktivieren.' || char(10) ||
 '3. Office-Schnellreparatur, danach ggf. Onlinereparatur.' || char(10) ||
 '4. Office-Updates installieren.',
 'medium', 'Mitgeliefert', 'Mitgeliefert'
WHERE NOT EXISTS (SELECT 1 FROM solutions WHERE title = 'Word oder Excel stürzt ab oder öffnet Dateien nicht');
