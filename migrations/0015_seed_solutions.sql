-- Startbestand an Loesungen fuer haeufige Probleme im Windows-Umfeld.
-- created_by bleibt NULL (kein Benutzerkonto als Urheber), der Name kennzeichnet
-- den Eintrag als mitgeliefert.

INSERT INTO solutions (category, title, symptom, cause, solution, severity, created_by_name, updated_by_name) VALUES
('Netzwerk', 'Kein Internet trotz bestehender WLAN-Verbindung',
 'Das WLAN ist verbunden, Webseiten laden aber nicht. Andere Geräte im selben Netz funktionieren.',
 'Meist ein veralteter DNS-Cache oder eine fehlerhaft bezogene IP-Adresse. Seltener ein hängender WLAN-Adapter.',
 '1. DNS-Cache leeren: ipconfig /flushdns' || char(10) ||
 '2. IP neu beziehen: ipconfig /release, dann ipconfig /renew' || char(10) ||
 '3. Hilft das nicht, Adapter zurücksetzen: netsh winsock reset und netsh int ip reset, danach neu starten.' || char(10) ||
 '4. Prüfen, ob im Adapter ein fester DNS-Server eingetragen ist, der nicht mehr existiert.',
 'medium', 'Mitgeliefert', 'Mitgeliefert'),

('Netzwerk', 'Netzlaufwerke sind nach dem Anmelden nicht verbunden',
 'Die verbundenen Laufwerke zeigen ein rotes Kreuz. Ein Doppelklick stellt die Verbindung meist wieder her.',
 'Windows stellt die Laufwerke oft her, bevor das Netzwerk vollständig bereit ist. Betrifft besonders WLAN-Clients.',
 '1. Prüfen, ob "Anmeldung warten auf Netzwerk" per Gruppenrichtlinie aktiv ist.' || char(10) ||
 '2. Laufwerke per Anmeldeskript statt dauerhafter Verbindung einbinden.' || char(10) ||
 '3. Als Zwischenlösung: net use * /delete /y, dann Laufwerke neu verbinden.' || char(10) ||
 'Hinweis: Das rote Kreuz allein bedeutet nicht zwingend einen Fehler -- Windows zeigt es auch bei nur unbenutzten Verbindungen.',
 'low', 'Mitgeliefert', 'Mitgeliefert'),

('Drucker', 'Druckaufträge bleiben in der Warteschlange hängen',
 'Dokumente stehen in der Warteschlange, werden aber nicht gedruckt. Löschen der Aufträge funktioniert nicht.',
 'Der Druckwarteschlangendienst (Spooler) hat sich aufgehängt, oder eine beschädigte Auftragsdatei blockiert die Verarbeitung.',
 '1. Dienst beenden: net stop spooler' || char(10) ||
 '2. Warteschlange leeren: Inhalt von C:\Windows\System32\spool\PRINTERS löschen' || char(10) ||
 '3. Dienst starten: net start spooler' || char(10) ||
 '4. Tritt das wiederholt auf, Druckertreiber erneuern -- häufig ist ein veralteter Treiber die Ursache.',
 'medium', 'Mitgeliefert', 'Mitgeliefert'),

('Drucker', 'Drucker druckt nur leere Seiten',
 'Der Auftrag läuft durch, das Papier kommt unbedruckt heraus.',
 'Bei Tintendruckern meist eingetrocknete Düsen, bei Laserdruckern ein nicht entferntes Transportsiegel oder ein leerer Toner ohne Warnmeldung.',
 '1. Füllstand prüfen -- manche Modelle melden leere Patronen nicht zuverlässig.' || char(10) ||
 '2. Bei Tinte: Düsenreinigung über das Druckermenü, maximal zwei Durchgänge hintereinander.' || char(10) ||
 '3. Bei Laser: Tonerkartusche entnehmen, waagerecht schwenken, Transportsiegel prüfen.' || char(10) ||
 '4. Testseite direkt am Gerät drucken -- kommt auch die leer, liegt es nicht am Rechner.',
 'low', 'Mitgeliefert', 'Mitgeliefert'),

('Windows', 'Rechner startet sehr langsam',
 'Vom Einschalten bis zum nutzbaren Desktop vergehen mehrere Minuten.',
 'Meist zu viele Autostart-Programme. Bei älteren Geräten häufig eine fast volle oder mechanische Festplatte.',
 '1. Autostart prüfen: Task-Manager, Reiter Autostart -- alles mit hoher Auswirkung hinterfragen.' || char(10) ||
 '2. Freien Speicherplatz prüfen: Unter 10 Prozent frei bremst Windows deutlich.' || char(10) ||
 '3. Schnellstart testweise deaktivieren -- verursacht auf manchen Geräten das Gegenteil.' || char(10) ||
 '4. Datenträger prüfen: chkdsk C: /scan' || char(10) ||
 '5. Bei mechanischer Festplatte ist ein SSD-Tausch die wirksamste Maßnahme.',
 'medium', 'Mitgeliefert', 'Mitgeliefert'),

('Windows', 'Update schlägt wiederholt mit Fehlercode fehl',
 'Ein Update wird geladen, bricht bei der Installation ab und wird beim nächsten Versuch erneut angeboten.',
 'Beschädigte Dateien im Update-Zwischenspeicher oder ein fehlerhafter Komponentenspeicher.',
 '1. Update-Dienste beenden: net stop wuauserv und net stop bits' || char(10) ||
 '2. Ordner C:\Windows\SoftwareDistribution umbenennen (z. B. in SoftwareDistribution.alt)' || char(10) ||
 '3. Dienste wieder starten und erneut nach Updates suchen.' || char(10) ||
 '4. Bleibt der Fehler: DISM /Online /Cleanup-Image /RestoreHealth, danach sfc /scannow' || char(10) ||
 'Hinweis: Schritt 4 dauert je nach Gerät 15 bis 30 Minuten und sollte nicht unterbrochen werden.',
 'medium', 'Mitgeliefert', 'Mitgeliefert'),

('Benutzer', 'Konto ist gesperrt und wird sofort erneut gesperrt',
 'Nach dem Entsperren im Active Directory ist das Konto binnen Minuten wieder gesperrt.',
 'Ein Gerät meldet sich im Hintergrund mit dem alten Passwort an -- typischerweise ein Smartphone mit Mailkonto, ein zweiter Rechner oder ein Dienst, der unter dem Konto läuft.',
 '1. Herkunft der Fehlversuche ermitteln: Ereignisanzeige auf dem PDC, Ereignis-ID 4740 zeigt den auslösenden Rechner.' || char(10) ||
 '2. Betroffenes Gerät ermitteln und dort das gespeicherte Passwort aktualisieren.' || char(10) ||
 '3. Häufig übersehen: Anmeldeinformationsverwaltung in Windows und Dienste mit hinterlegtem Benutzerkonto.' || char(10) ||
 '4. Erst danach entsperren -- sonst wiederholt sich der Vorgang.',
 'high', 'Mitgeliefert', 'Mitgeliefert'),

('E-Mail', 'Outlook fragt dauerhaft nach dem Kennwort',
 'Das Kennwortfenster erscheint immer wieder, auch nach korrekter Eingabe.',
 'Meist ein veralteter Eintrag in der Anmeldeinformationsverwaltung oder ein abgelaufenes Token nach einer Passwortänderung.',
 '1. Outlook schließen.' || char(10) ||
 '2. Systemsteuerung, Anmeldeinformationsverwaltung, Windows-Anmeldeinformationen: alle Einträge mit MicrosoftOffice oder der Mailadresse entfernen.' || char(10) ||
 '3. Outlook starten und Kennwort einmalig neu eingeben.' || char(10) ||
 '4. Hält das nicht: Neues Outlook-Profil anlegen und das alte erst nach erfolgreichem Test entfernen.',
 'medium', 'Mitgeliefert', 'Mitgeliefert'),

('E-Mail', 'Gesendete Mails landen beim Empfänger im Spam',
 'Einzelne Empfänger melden, dass Nachrichten im Junk-Ordner ankommen.',
 'Meist unvollständige DNS-Einträge für die Absenderdomäne (SPF, DKIM, DMARC) oder ein Absender, der über einen nicht autorisierten Server verschickt.',
 '1. SPF-Eintrag prüfen: Sind alle versendenden Systeme enthalten? Mehrere SPF-Einträge sind unzulässig.' || char(10) ||
 '2. DKIM-Signatur prüfen -- fehlt sie, bewerten viele Empfänger strenger.' || char(10) ||
 '3. DMARC-Richtlinie prüfen und Reports auswerten.' || char(10) ||
 '4. Kopfzeilen einer betroffenen Mail beim Empfänger anfordern: dort steht, welche Prüfung fehlgeschlagen ist.',
 'medium', 'Mitgeliefert', 'Mitgeliefert'),

('Hardware', 'Bildschirm bleibt nach dem Aufwachen schwarz',
 'Der Rechner läuft hörbar, der Bildschirm bleibt nach dem Energiesparmodus dunkel.',
 'Der Grafiktreiber stellt die Ausgabe nicht korrekt wieder her, oder der Monitor wechselt nicht auf den richtigen Eingang.',
 '1. Anzeige zurücksetzen: Windows-Taste + Strg + Umschalt + B -- der Bildschirm blinkt kurz.' || char(10) ||
 '2. Monitor-Eingang manuell durchschalten.' || char(10) ||
 '3. Grafiktreiber aktualisieren; bei wiederholtem Auftreten Energiesparmodus für die Grafikkarte deaktivieren.' || char(10) ||
 '4. Bei Docking-Stations: Kabel zum Dock trennen und neu verbinden -- häufig liegt es dort, nicht am Rechner.',
 'low', 'Mitgeliefert', 'Mitgeliefert'),

('VPN', 'VPN verbindet, danach ist kein internes System erreichbar',
 'Die VPN-Verbindung wird aufgebaut, interne Server und Freigaben antworten aber nicht.',
 'Meist eine fehlende oder falsche Route, ein DNS-Server, der nur extern auflöst, oder eine Adressüberschneidung zwischen Heim- und Firmennetz.',
 '1. Routen prüfen: route print -- ist das interne Netz über die VPN-Schnittstelle erreichbar?' || char(10) ||
 '2. Namensauflösung prüfen: nslookup <interner-server> -- antwortet der interne DNS?' || char(10) ||
 '3. Adressbereiche vergleichen: Nutzt das Heimnetz denselben Bereich wie die Firma (oft 192.168.1.0/24), scheitert das Routing. Abhilfe: Heimrouter auf einen anderen Bereich umstellen.' || char(10) ||
 '4. Split-Tunnel-Konfiguration prüfen.',
 'high', 'Mitgeliefert', 'Mitgeliefert'),

('Software', 'Anwendung startet nicht mehr nach einem Update',
 'Das Programm wurde aktualisiert und startet danach nicht oder stürzt sofort ab.',
 'Beschädigte Konfiguration im Benutzerprofil, fehlende Laufzeitkomponenten oder eine Blockade durch den Virenschutz.',
 '1. Ereignisanzeige, Anwendung: Der Absturz nennt meist das auslösende Modul.' || char(10) ||
 '2. Benutzerkonfiguration testweise umbenennen (%APPDATA% und %LOCALAPPDATA%) -- startet die Anwendung dann, lag es daran.' || char(10) ||
 '3. Fehlende Laufzeit prüfen: Visual C++ Redistributable, .NET-Version.' || char(10) ||
 '4. Virenschutz-Protokoll prüfen -- neue Programmversionen werden gelegentlich blockiert.' || char(10) ||
 '5. Als Absicherung vor der Reparatur: Benutzerdaten der Anwendung sichern.',
 'medium', 'Mitgeliefert', 'Mitgeliefert'),

('MFA', 'Anmeldung mit zweitem Faktor schlägt fehl',
 'Der Code aus der Authenticator-App wird als ungültig abgewiesen, obwohl er frisch generiert wurde.',
 'Fast immer eine abweichende Uhrzeit auf dem Smartphone -- zeitbasierte Codes tolerieren nur wenige Sekunden Abweichung.',
 '1. Auf dem Smartphone die automatische Zeitsynchronisierung aktivieren.' || char(10) ||
 '2. In der Microsoft Authenticator App: Einstellungen, Zeitkorrektur für Codes.' || char(10) ||
 '3. Prüfen, ob die richtige Konto-Kachel verwendet wird -- bei mehreren Konten leicht zu verwechseln.' || char(10) ||
 '4. Hilft nichts: Zweiten Faktor zurücksetzen und neu einrichten.',
 'medium', 'Mitgeliefert', 'Mitgeliefert'),

('Windows', 'Kein Speicherplatz auf Laufwerk C',
 'Windows meldet zu wenig Speicherplatz, obwohl keine großen Dateien abgelegt wurden.',
 'Meist Windows-Update-Reste, ein großer Papierkorb, Schattenkopien oder ein angewachsenes Benutzerprofil.',
 '1. Datenträgerbereinigung als Administrator ausführen und Systemdateien einbeziehen.' || char(10) ||
 '2. Update-Reste entfernen: DISM /Online /Cleanup-Image /StartComponentCleanup' || char(10) ||
 '3. Speicherbelegung prüfen -- häufig sind Downloads-Ordner oder lokale OneDrive-Kopien die Ursache.' || char(10) ||
 '4. Schattenkopien prüfen: vssadmin list shadowstorage' || char(10) ||
 'Hinweis: Vor dem Löschen von Update-Resten sicherstellen, dass das System stabil läuft -- danach ist keine Rückkehr zur Vorversion mehr möglich.',
 'medium', 'Mitgeliefert', 'Mitgeliefert');
