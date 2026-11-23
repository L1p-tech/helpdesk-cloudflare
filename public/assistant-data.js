/*
 * Wissen des Symptom-Assistenten.
 *
 * Drei Teile:
 *  - ASSISTANT_TREE: die Fragen. Jede Antwort fuehrt zur naechsten Frage
 *    (`ziel`) oder zu einem Leitfaden (`leitfaden`).
 *  - ASSISTANT_GUIDES: die Leitfaeden. Rueckfragen an den Benutzer, Schritte
 *    zum Abhaken, Suchwoerter fuer passende Loesungen und Befehle aus dem
 *    gemeinsamen Bestand, dazu ein Eskalationshinweis.
 *  - ASSISTANT_SYNONYMS: Woerter, die fuer die Freitext-Erkennung dasselbe
 *    meinen. Der erste Eintrag einer Gruppe ist der Oberbegriff.
 *
 * Loesungen und Befehle werden ueber Woerter gesucht, nicht ueber IDs. So
 * bleibt der Assistent gueltig, wenn neue Eintraege dazukommen -- sie tauchen
 * automatisch hier auf.
 *
 * `suche` wird nur mit dem LOESUNGSTITEL verglichen (Teilwort, ohne
 * Gross-/Kleinschreibung, Umlaute als ae/oe/ue). Begriffe deshalb gezielt
 * waehlen: "office" traefe auch "Homeoffice", "passwort" auch die
 * Phishing-Loesung. Lieber zwei genaue Begriffe als ein breiter.
 * `befehle` wird mit dem Befehlsnamen verglichen.
 *
 * Neuer Leitfaden: Eintrag in ASSISTANT_GUIDES anlegen und an passender
 * Stelle im Baum mit `{ text, leitfaden: "id" }` verlinken. `stichworte`
 * gut fuellen -- daran haengt die Freitext-Erkennung.
 */

export const ASSISTANT_TREE = {
  start: {
    frage: "Womit hat der Benutzer ein Problem?",
    optionen: [
      { text: "Anmeldung, Passwort, Konto", ziel: "konto" },
      { text: "E-Mail / Outlook", ziel: "mail" },
      { text: "Teams, Telefon, Meetings", ziel: "teams" },
      { text: "Netzwerk / Internet", ziel: "netzwerk" },
      { text: "WLAN", ziel: "wlan" },
      { text: "VPN / Homeoffice", ziel: "vpn" },
      { text: "Remotedesktop / Terminalserver", ziel: "remote" },
      { text: "Drucker / Scanner", ziel: "drucker" },
      { text: "Dateien, Laufwerke, OneDrive", ziel: "dateien" },
      { text: "Rechner langsam, Absturz, Updates", ziel: "rechner" },
      { text: "Programm / Software", ziel: "software" },
      { text: "Bildschirm, Maus, Headset, Laptop", ziel: "hardware" },
      { text: "Zugriff / Berechtigung fehlt", ziel: "zugriff" },
      { text: "Browser / Webseite", ziel: "browser" },
      { text: "Diensthandy / Smartphone", ziel: "handy" },
      { text: "Sicherheit: Phishing, Virus, Verlust", ziel: "sicherheit" },
    ],
  },

  konto: {
    frage: "Woran scheitert die Anmeldung?",
    optionen: [
      { text: "Konto ist gesperrt", leitfaden: "konto-gesperrt" },
      { text: "Passwort vergessen", leitfaden: "passwort-vergessen" },
      { text: "Passwort abgelaufen / muss geändert werden", leitfaden: "passwort-abgelaufen" },
      { text: "Zweiter Faktor (MFA) klappt nicht", leitfaden: "mfa" },
      { text: "Neues Handy, MFA umziehen", leitfaden: "mfa-neues-handy" },
      { text: "„Vertrauensstellung“ / Domäne nicht erreichbar", leitfaden: "vertrauensstellung" },
      { text: "Anmeldung dauert ewig / Profil fehlt", leitfaden: "profil-temporaer" },
      { text: "PIN / Windows Hello geht nicht", leitfaden: "windows-hello" },
      { text: "BitLocker fragt nach Wiederherstellungsschlüssel", leitfaden: "bitlocker" },
      { text: "Name geändert (z. B. Heirat)", leitfaden: "namensaenderung" },
      { text: "Etwas anderes", leitfaden: "konto-sonstiges" },
    ],
  },
  mail: {
    frage: "Was ist das Symptom?",
    optionen: [
      { text: "Ständige Kennwortabfrage", leitfaden: "outlook-kennwort" },
      { text: "Outlook startet nicht / hängt", leitfaden: "outlook-startet-nicht" },
      { text: "Mails kommen nicht an / gehen nicht raus", leitfaden: "mail-zustellung" },
      { text: "Mails landen im Spam", leitfaden: "mail-spam" },
      { text: "Postfach voll", leitfaden: "postfach-voll" },
      { text: "Freigegebenes Postfach / Kalender fehlt", leitfaden: "postfach-freigegeben" },
      { text: "Suche in Outlook findet nichts", leitfaden: "outlook-suche" },
      { text: "Abwesenheitsnotiz einrichten", leitfaden: "abwesenheit" },
      { text: "Signatur fehlt oder falsch", leitfaden: "signatur" },
      { text: "Anhang zu groß", leitfaden: "anhang-gross" },
      { text: "Kalender freigeben / Stellvertretung", leitfaden: "kalender-freigabe" },
      { text: "Etwas anderes", leitfaden: "mail-sonstiges" },
    ],
  },
  teams: {
    frage: "Was funktioniert nicht?",
    optionen: [
      { text: "Kein Ton / Mikrofon / Kamera", leitfaden: "teams-audio" },
      { text: "Teams startet nicht / hängt / weißes Fenster", leitfaden: "teams-cache" },
      { text: "Bildschirm teilen geht nicht", leitfaden: "teams-teilen" },
      { text: "Telefonie: keine Anrufe / Rufnummer fehlt", leitfaden: "teams-telefonie" },
      { text: "Status falsch / keine Benachrichtigungen", leitfaden: "teams-status" },
      { text: "Etwas anderes", leitfaden: "teams-sonstiges" },
    ],
  },
  netzwerk: {
    frage: "Wer ist betroffen?",
    optionen: [
      { text: "Nur ein Arbeitsplatz", ziel: "netzwerk-einzeln" },
      { text: "Mehrere Benutzer / ganzer Standort", leitfaden: "netz-stoerung" },
      { text: "Eine bestimmte Seite oder ein Server", leitfaden: "netz-ziel" },
    ],
  },
  "netzwerk-einzeln": {
    frage: "Wie verhält sich die Verbindung?",
    optionen: [
      { text: "Verbunden, aber kein Internet", leitfaden: "kein-internet" },
      { text: "Gar keine Verbindung (Kabel)", leitfaden: "lan-keine-verbindung" },
      { text: "Langsam oder bricht ab", leitfaden: "netz-langsam" },
    ],
  },
  wlan: {
    frage: "Was passiert beim WLAN?",
    optionen: [
      { text: "Verbindet sich gar nicht", leitfaden: "wlan-verbindet-nicht" },
      { text: "Bricht ständig ab", leitfaden: "wlan-abbrueche" },
      { text: "Verbunden, aber kein Internet", leitfaden: "kein-internet" },
      { text: "WLAN-Netz wird nicht angezeigt", leitfaden: "wlan-nicht-sichtbar" },
    ],
  },
  vpn: {
    frage: "Wie weit kommt die Verbindung?",
    optionen: [
      { text: "VPN verbindet gar nicht", leitfaden: "vpn-verbindet-nicht" },
      { text: "Verbindet, aber nichts erreichbar", leitfaden: "vpn-nichts-erreichbar" },
      { text: "Bricht ständig ab / sehr langsam", leitfaden: "vpn-instabil" },
      { text: "Passwort im Homeoffice abgelaufen", leitfaden: "passwort-abgelaufen" },
    ],
  },
  remote: {
    frage: "Was passiert bei der Remoteverbindung?",
    optionen: [
      { text: "Verbindung kommt nicht zustande", leitfaden: "rdp-verbindet-nicht" },
      { text: "Sitzung hängt / schwarzer Bildschirm", leitfaden: "rdp-sitzung" },
      { text: "Drucker oder Laufwerke fehlen in der Sitzung", leitfaden: "rdp-umleitung" },
    ],
  },
  drucker: {
    frage: "Was passiert beim Drucken?",
    optionen: [
      { text: "Auftrag bleibt hängen", leitfaden: "druck-warteschlange" },
      { text: "Drucker nicht gefunden / fehlt", leitfaden: "drucker-fehlt" },
      { text: "Druckt leere oder falsche Seiten", leitfaden: "druck-qualitaet" },
      { text: "Drucker meldet Fehler / Papierstau", leitfaden: "drucker-fehler" },
      { text: "Scannen (Scan-to-Mail/Ordner) geht nicht", leitfaden: "scanner" },
    ],
  },
  dateien: {
    frage: "Worum geht es?",
    optionen: [
      { text: "Netzlaufwerke fehlen / rotes Kreuz", leitfaden: "netzlaufwerke" },
      { text: "Zugriff verweigert auf Ordner", leitfaden: "zugriff-ordner" },
      { text: "OneDrive synchronisiert nicht", leitfaden: "onedrive" },
      { text: "Datei versehentlich gelöscht / überschrieben", leitfaden: "datei-wiederherstellen" },
      { text: "Datei ist gesperrt / „wird verwendet“", leitfaden: "datei-gesperrt" },
      { text: "SharePoint / Teams-Dateien", leitfaden: "sharepoint" },
      { text: "Office-Datei nicht gespeichert / abgestürzt", leitfaden: "office-autorecover" },
      { text: "USB-Stick / externe Festplatte", leitfaden: "usb-geraet" },
    ],
  },
  rechner: {
    frage: "Was genau tritt auf?",
    optionen: [
      { text: "Startet oder läuft sehr langsam", leitfaden: "rechner-langsam" },
      { text: "Friert ein / reagiert nicht", leitfaden: "rechner-friert" },
      { text: "Bluescreen / startet von selbst neu", leitfaden: "bluescreen" },
      { text: "Startet gar nicht", leitfaden: "startet-nicht" },
      { text: "Update schlägt fehl", leitfaden: "update-fehler" },
      { text: "Kein Speicherplatz", leitfaden: "speicherplatz" },
      { text: "Startmenü, Taskleiste oder Suche reagiert nicht", leitfaden: "startmenue" },
      { text: "Uhrzeit oder Datum falsch", leitfaden: "uhrzeit" },
      { text: "Etwas anderes", leitfaden: "rechner-sonstiges" },
    ],
  },
  software: {
    frage: "Was ist mit dem Programm?",
    optionen: [
      { text: "Startet nicht / stürzt ab", leitfaden: "programm-absturz" },
      { text: "Soll installiert werden", leitfaden: "software-installation" },
      { text: "Lizenz / „Produkt nicht aktiviert“", leitfaden: "lizenz" },
      { text: "Office-Programm (Word, Excel) macht Probleme", leitfaden: "office-reparatur" },
      { text: "Fachanwendung / Branchensoftware", leitfaden: "fachanwendung" },
      { text: "Datei öffnet mit falschem Programm / PDF", leitfaden: "standardprogramm" },
    ],
  },
  hardware: {
    frage: "Welches Gerät?",
    optionen: [
      { text: "Bildschirm schwarz / kein Bild", leitfaden: "monitor-kein-bild" },
      { text: "Zweiter Monitor / Dockingstation", leitfaden: "dockingstation" },
      { text: "Maus oder Tastatur", leitfaden: "maus-tastatur" },
      { text: "Tastatur schreibt falsche Zeichen (Y/Z, @)", leitfaden: "tastatur-layout" },
      { text: "Bild unscharf / Schrift zu groß oder klein", leitfaden: "skalierung" },
      { text: "Headset / Lautsprecher", leitfaden: "headset" },
      { text: "Webcam", leitfaden: "webcam" },
      { text: "Laptop-Akku / lädt nicht", leitfaden: "akku" },
      { text: "USB-Stick / externe Festplatte", leitfaden: "usb-geraet" },
      { text: "Gerät defekt / Austausch", leitfaden: "hardware-defekt" },
    ],
  },
  zugriff: {
    frage: "Worauf fehlt der Zugriff?",
    optionen: [
      { text: "Ordner / Netzlaufwerk", leitfaden: "zugriff-ordner" },
      { text: "Programm / Fachanwendung", leitfaden: "zugriff-anwendung" },
      { text: "Freigegebenes Postfach / Kalender", leitfaden: "postfach-freigegeben" },
      { text: "Neuer Mitarbeiter braucht alles", leitfaden: "onboarding" },
      { text: "Mitarbeiter verlässt das Unternehmen", leitfaden: "offboarding" },
    ],
  },
  browser: {
    frage: "Was passiert im Browser?",
    optionen: [
      { text: "Seite lädt nicht / falsch dargestellt", leitfaden: "browser-cache" },
      { text: "Zertifikatsfehler / „nicht sicher“", leitfaden: "zertifikat" },
      { text: "Anmeldung an Webanwendung klappt nicht", leitfaden: "web-anmeldung" },
      { text: "Pop-ups / Werbung / fremde Startseite", leitfaden: "browser-adware" },
    ],
  },
  handy: {
    frage: "Was ist mit dem Diensthandy?",
    optionen: [
      { text: "Mails / Kalender kommen nicht aufs Handy", leitfaden: "handy-mail" },
      { text: "Neues Handy einrichten", leitfaden: "mfa-neues-handy" },
      { text: "Handy verloren oder gestohlen", leitfaden: "geraet-verloren" },
      { text: "Firmen-App fehlt / Gerät nicht konform", leitfaden: "handy-mdm" },
    ],
  },
  sicherheit: {
    frage: "Was ist passiert?",
    optionen: [
      { text: "Verdächtige Mail erhalten (nicht geklickt)", leitfaden: "phishing-gemeldet" },
      { text: "Auf Link geklickt / Daten eingegeben", leitfaden: "phishing-geklickt" },
      { text: "Virenwarnung / Rechner verhält sich seltsam", leitfaden: "virus" },
      { text: "Laptop oder Handy verloren / gestohlen", leitfaden: "geraet-verloren" },
      { text: "Fremde Anmeldung / Konto missbraucht", leitfaden: "konto-kompromittiert" },
    ],
  },
};

export const ASSISTANT_GUIDES = {
  /* ---------- Anmeldung & Konto ---------- */
  "konto-gesperrt": {
    titel: "Konto ist gesperrt",
    stichworte: ["konto gesperrt", "account gesperrt", "zu viele fehlversuche", "anmeldung gesperrt", "entsperren"],
    fragen: [
      "Wurde das Passwort kürzlich geändert?",
      "Ist das Konto noch auf einem Handy, Tablet oder zweiten Rechner angemeldet?",
    ],
    schritte: [
      "Identität des Anrufers prüfen (Rückruf oder bekannte Merkmale)",
      "Konto im Active Directory entsperren",
      "Wird es sofort wieder gesperrt: Quelle der Fehlversuche suchen (Handy-Mail, gespeicherte Zugangsdaten, gemappte Laufwerke)",
      "Gespeicherte Windows-Anmeldeinformationen beim Benutzer bereinigen",
    ],
    suche: ["gesperrt"],
    befehle: ["Gespeicherte Zugangsdaten", "Anmeldeserver"],
    eskalation: "Bei wiederholter Sperre ohne erkennbare Quelle: an das AD-/Identity-Team, ggf. Sicherheitsprüfung.",
  },
  "passwort-vergessen": {
    titel: "Passwort vergessen",
    stichworte: ["passwort vergessen", "kennwort vergessen", "passwort zuruecksetzen", "reset"],
    fragen: ["Kann sich der Benutzer über das Self-Service-Portal selbst zurücksetzen?"],
    schritte: [
      "Identität des Anrufers sicher prüfen",
      "Auf Self-Service-Passwortreset hinweisen, falls eingerichtet",
      "Sonst: temporäres Passwort setzen und Änderung bei nächster Anmeldung erzwingen",
      "Temporäres Passwort nur auf sicherem Weg übermitteln",
      "Hinweis: Handy-Mail und gespeicherte Zugangsdaten danach aktualisieren, sonst droht Sperre",
    ],
  },
  "passwort-abgelaufen": {
    titel: "Passwort abgelaufen (auch im Homeoffice)",
    stichworte: ["passwort abgelaufen", "kennwort abgelaufen", "passwort aendern", "homeoffice passwort", "muss geaendert werden"],
    fragen: ["Ist der Benutzer im Büro oder im Homeoffice?", "Läuft das VPN bereits vor der Windows-Anmeldung?"],
    schritte: [
      "Im Büro: Passwort direkt bei der Anmeldung ändern lassen",
      "Im Homeoffice: mit lokal zwischengespeichertem Passwort anmelden, VPN verbinden, dann Strg+Alt+Entf → Kennwort ändern",
      "Nach der Änderung bei verbundenem VPN sperren und neu entsperren, damit das neue Passwort zwischengespeichert wird",
      "Passwort auf Handy, Outlook und gespeicherten Zugangsdaten aktualisieren",
    ],
    suche: ["passwort im homeoffice", "passwort abgelaufen"],
    befehle: ["Kerberos-Tickets zurücksetzen", "Gruppenrichtlinien aktualisieren"],
  },
  mfa: {
    titel: "Zweiter Faktor (MFA) schlägt fehl",
    stichworte: ["mfa", "zweiter faktor", "authenticator", "code ungueltig", "push kommt nicht", "zwei faktor", "2fa", "otp", "sms code"],
    fragen: ["Kommt keine Push-Benachrichtigung, oder wird der Code abgelehnt?", "Hat der Benutzer ein neues Handy?"],
    schritte: [
      "Uhrzeit am Handy auf automatisch stellen (Codes sind zeitbasiert)",
      "Richtige Konto-Kachel in der Authenticator-App verwenden",
      "Push: Benachrichtigungen und Akkusparmodus für die App prüfen",
      "Wenn nichts hilft: Authentifizierungsmethoden zurücksetzen und neu registrieren lassen",
    ],
    suche: ["zweitem faktor", "authenticator", "mfa"],
  },
  "mfa-neues-handy": {
    titel: "Neues Handy: MFA und Apps umziehen",
    stichworte: ["neues handy", "handy gewechselt", "authenticator umziehen", "neues smartphone", "handywechsel"],
    fragen: ["Ist das alte Handy noch verfügbar?"],
    schritte: [
      "Altes Handy vorhanden: neue Anmeldemethode über das Sicherheitsinfo-Portal hinzufügen, alte entfernen",
      "Altes Handy weg: Identität prüfen, MFA-Methoden zurücksetzen, neu registrieren lassen",
      "Firmenportal / MDM-App auf dem neuen Gerät installieren und Gerät registrieren",
      "Altes Gerät aus der Geräteverwaltung entfernen bzw. zurücksetzen",
    ],
    suche: ["zweitem faktor", "authenticator"],
  },
  vertrauensstellung: {
    titel: "Vertrauensstellung zur Domäne verloren",
    stichworte: ["vertrauensstellung", "domaene", "trust relationship", "domaenencontroller nicht erreichbar", "computerkonto"],
    fragen: ["Betrifft es nur diesen Rechner?", "War der Rechner länger ausgeschaltet oder wurde er neu aufgesetzt?"],
    schritte: [
      "Mit lokalem Administratorkonto anmelden",
      "Netzwerkverbindung zum Domänencontroller prüfen",
      "In Windows PowerShell als Admin: Test-ComputerSecureChannel -Repair -Credential DOMÄNE\\Admin – sonst Rechner aus der Domäne nehmen und neu aufnehmen",
      "Danach neu starten und mit Domänenkonto testen",
    ],
    suche: ["vertrauensstellung"],
    befehle: ["Domänenverbindung prüfen", "Anmeldeserver", "Erreichbarkeit"],
    eskalation: "Betrifft es mehrere Rechner, an das Server-/AD-Team eskalieren.",
  },
  "profil-temporaer": {
    titel: "Anmeldung dauert ewig / temporäres Profil",
    stichworte: ["temporaeres profil", "profil fehlt", "desktop leer", "anmeldung dauert", "willkommen dauert", "profil beschaedigt"],
    fragen: ["Erscheint der Hinweis „Sie wurden mit einem temporären Profil angemeldet“?"],
    schritte: [
      "Rechner einmal komplett neu starten (nicht nur abmelden)",
      "Freien Speicherplatz auf C: prüfen",
      "Bei temporärem Profil: Registry-Eintrag unter ProfileList (.bak) prüfen",
      "Profil sichern und neu anlegen lassen, falls beschädigt",
    ],
    suche: ["temporaeres profil", "startet sehr langsam"],
    befehle: ["Speicherplatz aller Laufwerke", "Systemfehler", "Gespeicherte Gruppenrichtlinien"],
    eskalation: "Profilreparatur mit Datenverlustrisiko: vorher sichern oder an 3rd Level geben.",
  },
  "konto-sonstiges": {
    titel: "Anmeldeproblem allgemein",
    stichworte: ["anmeldung", "login", "einloggen", "anmelden geht nicht"],
    fragen: ["Welche Fehlermeldung erscheint genau?", "Betrifft es Windows, eine Webanwendung oder ein Programm?"],
    schritte: [
      "Fehlermeldung wörtlich oder als Screenshot festhalten",
      "Konto im AD prüfen: aktiv, nicht gesperrt, Passwort nicht abgelaufen",
      "An einem anderen Rechner testen lassen",
    ],
    suche: ["gesperrt", "zweitem faktor"],
    befehle: ["Angemeldeten Benutzer", "Gruppenmitgliedschaften"],
  },

  /* ---------- E-Mail ---------- */
  "outlook-kennwort": {
    titel: "Outlook fragt ständig nach dem Kennwort",
    stichworte: ["outlook kennwort", "outlook passwort", "kennwortabfrage", "passwortabfrage", "fragt immer nach passwort", "anmeldefenster outlook"],
    schritte: [
      "Gespeicherte Anmeldeinformationen für Office/Outlook in der Anmeldeinformationsverwaltung löschen",
      "In Office unter Datei → Konto abmelden und neu anmelden",
      "Outlook-Profil neu anlegen, falls weiterhin",
    ],
    suche: ["kennwort"],
    befehle: ["Gespeicherte Zugangsdaten"],
  },
  "outlook-startet-nicht": {
    titel: "Outlook startet nicht oder hängt",
    stichworte: ["outlook startet nicht", "outlook haengt", "outlook stuerzt ab", "outlook laedt profil", "outlook reagiert nicht"],
    schritte: [
      "Outlook im abgesicherten Modus starten (outlook.exe /safe) – läuft es, Add-ins deaktivieren",
      "Hängende Outlook-Prozesse beenden",
      "OST-Datei umbenennen, damit sie neu aufgebaut wird",
      "Office-Schnellreparatur über Apps & Features",
      "Neues Outlook-Profil anlegen",
    ],
    suche: ["outlook startet nicht"],
    befehle: ["Prozess beenden", "Aktuelle Prozesse"],
  },
  "mail-zustellung": {
    titel: "Mails kommen nicht an oder gehen nicht raus",
    stichworte: ["mail kommt nicht an", "mail geht nicht raus", "postausgang", "unzustellbar", "ndr", "empfaenger bekommt nichts"],
    fragen: ["Betrifft es alle Empfänger oder nur einen?", "Gibt es eine Unzustellbarkeitsnachricht?"],
    schritte: [
      "Postausgang prüfen: hängt die Mail dort? Outlook online / nicht im Offlinemodus?",
      "Unzustellbarkeitsnachricht auswerten (Fehlercode)",
      "Nachrichtenablaufverfolgung im Exchange Admin Center prüfen",
      "Bei eingehenden Mails: Quarantäne und Junk-Ordner prüfen",
    ],
    suche: ["mails landen", "zustell", "quarantaene"],
    eskalation: "Betrifft es viele Benutzer oder externe Domänen: an das Mail-/M365-Team.",
  },
  "mail-spam": {
    titel: "Mails landen im Spam",
    stichworte: ["spam", "junk", "quarantaene", "werbung"],
    schritte: [
      "Absender in die Liste sicherer Absender aufnehmen",
      "Quarantäne prüfen und Nachricht freigeben",
      "Bei ausgehenden Mails: Signatur, Links und Anhänge prüfen",
    ],
    suche: ["spam"],
  },
  "postfach-voll": {
    titel: "Postfach voll",
    stichworte: ["postfach voll", "speicher voll outlook", "kontingent", "mailbox voll", "quota"],
    schritte: [
      "Postfachgröße unter Datei → Tools → Postfachbereinigung prüfen",
      "Gelöschte Elemente und große Anhänge aufräumen",
      "Online-Archiv aktivieren bzw. Archivierungsrichtlinie anwenden",
      "Kontingent nur nach Freigabe erhöhen",
    ],
    suche: ["postfach ist voll", "postfach voll"],
  },
  "postfach-freigegeben": {
    titel: "Freigegebenes Postfach oder Kalender fehlt",
    stichworte: ["freigegebenes postfach", "shared mailbox", "gruppenpostfach", "kalender freigabe", "funktionspostfach", "teampostfach"],
    fragen: ["Hat der Benutzer die Berechtigung erst kürzlich bekommen?", "Liegt eine Freigabe des Postfach-Verantwortlichen vor?"],
    schritte: [
      "Berechtigung (Vollzugriff / Senden als) im Exchange prüfen bzw. nach Freigabe vergeben",
      "Automatische Einbindung kann bis zu 60 Minuten dauern – Outlook neu starten",
      "Sonst manuell über Kontoeinstellungen → Weitere Postfächer hinzufügen",
    ],
    suche: ["freigegebenes postfach"],
  },
  "outlook-suche": {
    titel: "Outlook-Suche findet nichts",
    stichworte: ["outlook suche", "suche findet nichts", "indizierung", "suchergebnisse fehlen"],
    schritte: [
      "Indizierungsstatus in Outlook prüfen (Suchtools → Indizierungsstatus)",
      "Windows-Suchdienst prüfen und ggf. neu starten",
      "Index in den Indizierungsoptionen neu erstellen",
    ],
    befehle: ["Dienststatus", "Dienst neu starten"],
  },
  "mail-sonstiges": {
    titel: "E-Mail-Problem allgemein",
    stichworte: ["outlook", "mail", "email", "postfach"],
    schritte: [
      "Testen, ob es im Outlook im Web (OWA) genauso auftritt – trennt Client- von Serverproblem",
      "Outlook im abgesicherten Modus starten",
      "Office-Updates prüfen",
    ],
    suche: ["outlook"],
  },

  /* ---------- Teams & Telefonie ---------- */
  "teams-audio": {
    titel: "Teams: kein Ton, Mikrofon oder Kamera",
    stichworte: ["kein ton", "mikrofon", "hoert mich nicht", "hoere nichts", "kamera teams", "teams audio", "headset teams"],
    fragen: ["Funktioniert das Gerät in anderen Programmen?", "Ist das Headset per USB, Klinke oder Bluetooth verbunden?"],
    schritte: [
      "In Teams unter Einstellungen → Geräte das richtige Gerät auswählen und Testanruf machen",
      "Windows-Datenschutz: Mikrofon-/Kamerazugriff für Apps erlauben",
      "Stummschaltung am Headset/Kabel prüfen, anderen USB-Port testen",
      "Teams komplett beenden und neu starten",
    ],
    suche: ["kein ton", "headset"],
    befehle: ["Geräte-Manager"],
  },
  "teams-cache": {
    titel: "Teams startet nicht oder hängt",
    stichworte: ["teams startet nicht", "teams haengt", "teams weiss", "teams laedt nicht", "teams cache", "teams absturz"],
    schritte: [
      "Teams vollständig beenden (auch im Infobereich)",
      "Neues Teams: Einstellungen → Apps → Microsoft Teams → Erweiterte Optionen → Zurücksetzen; klassisches Teams: Ordner %AppData%\\Microsoft\\Teams leeren",
      "Teams neu starten und anmelden",
      "Testen, ob Teams im Browser funktioniert",
      "Teams über Apps & Features zurücksetzen oder neu installieren",
    ],
    suche: ["teams startet"],
    befehle: ["Prozess beenden"],
  },
  "teams-teilen": {
    titel: "Teams: Bildschirm teilen geht nicht",
    stichworte: ["bildschirm teilen", "screen sharing", "praesentieren", "freigabe bildschirm"],
    schritte: [
      "Teams und Grafiktreiber aktualisieren",
      "Einzelnes Fenster statt ganzen Bildschirm teilen testen",
      "Bei macOS: Bildschirmaufnahme-Berechtigung erteilen",
      "Hardwarebeschleunigung in Teams testweise deaktivieren",
    ],
  },
  "teams-telefonie": {
    titel: "Teams-Telefonie: keine Anrufe oder Rufnummer fehlt",
    stichworte: ["telefon", "anrufe", "rufnummer", "waehltastatur", "telefonie", "festnetz", "durchwahl"],
    fragen: ["Fehlt die Wähltastatur ganz?", "Kommen Anrufe nicht an oder kann nicht gewählt werden?"],
    schritte: [
      "Lizenz und Telefonnummernzuweisung im Teams Admin Center prüfen",
      "Rufumleitung / Nicht stören im Teams-Status prüfen",
      "Ab- und neu anmelden – Änderungen brauchen bis zu 24 Stunden",
    ],
    eskalation: "Nummernzuweisung und Voice-Routing: an das Telefonie-/UC-Team.",
  },
  "teams-sonstiges": {
    titel: "Teams-Problem allgemein",
    stichworte: ["teams", "meeting", "besprechung", "videokonferenz", "chat"],
    schritte: [
      "Teams im Browser testen (teams.microsoft.com)",
      "Ab- und neu anmelden",
      "Cache leeren und Teams aktualisieren",
    ],
    suche: ["teams"],
  },

  /* ---------- Netzwerk ---------- */
  "kein-internet": {
    titel: "Verbunden, aber kein Internet",
    stichworte: ["kein internet", "keine internetverbindung", "webseiten laden nicht", "eingeschraenkt", "kein zugriff internet"],
    schritte: [
      "Andere Geräte im selben Netz testen",
      "DNS-Cache leeren und IP neu beziehen",
      "Erreichbarkeit von Gateway und DNS prüfen",
      "Proxy-Einstellungen prüfen",
      "Netzwerkstack zurücksetzen und neu starten",
    ],
    suche: ["kein internet"],
    befehle: ["DNS-Zwischenspeicher leeren", "Neue IP-Adresse", "DNS-Auflösung", "Netzwerkstack zurücksetzen"],
  },
  "lan-keine-verbindung": {
    titel: "Keine Netzwerkverbindung über Kabel",
    stichworte: ["kabel", "lan", "netzwerkkabel", "keine verbindung", "nicht verbunden", "netzwerkdose"],
    schritte: [
      "Kabel und Anschlussdose prüfen, anderes Kabel / andere Dose testen",
      "Leuchtet die LED am Netzwerkanschluss?",
      "Adapter im Geräte-Manager prüfen (deaktiviert? Treiberfehler?)",
      "Bei Dockingstation: direkt am Laptop testen",
    ],
    befehle: ["Netzwerkkonfiguration anzeigen", "Geräte-Manager"],
    eskalation: "Dose tot: an Netzwerk-/Haustechnik zum Patchen.",
  },
  "netz-langsam": {
    titel: "Netzwerk langsam oder bricht ab",
    stichworte: ["netzwerk langsam", "internet langsam", "verbindung bricht ab", "abbrueche", "langsame verbindung"],
    schritte: [
      "Betrifft es nur diesen Rechner? Kabel statt WLAN testen",
      "Netzwerkweg zum Ziel prüfen (Paketverluste?)",
      "Hintergrund-Downloads und Updates prüfen",
      "Treiber des Netzwerkadapters aktualisieren",
    ],
    befehle: ["Netzwerkweg prüfen", "Erreichbarkeit", "Aktive Verbindungen"],
  },
  "netz-stoerung": {
    titel: "Störung bei mehreren Benutzern",
    stichworte: ["alle betroffen", "mehrere benutzer", "ganzer standort", "stoerung", "ausfall", "nichts geht mehr"],
    fragen: ["Seit wann?", "Welche Dienste genau, welcher Standort?", "Wie viele Benutzer?"],
    schritte: [
      "Umfang eingrenzen: Standort, Etage, Dienst",
      "IT-Meldungen und bekannte Störungen prüfen",
      "Kollegen informieren, Störungsmeldung (Major Incident) anlegen",
      "Betroffenen eine Rückmeldung mit Zeitpunkt der nächsten Info geben",
    ],
    eskalation: "Infrastrukturstörung: sofort an die nächste Stufe / Bereitschaft eskalieren statt einzeln zu prüfen.",
    dringend: true,
  },
  "netz-ziel": {
    titel: "Bestimmte Seite oder Server nicht erreichbar",
    stichworte: ["server nicht erreichbar", "seite nicht erreichbar", "dienst nicht erreichbar", "timeout", "port"],
    schritte: [
      "DNS-Auflösung des Namens prüfen",
      "Erreichbarkeit und Port prüfen",
      "Von einem anderen Rechner testen",
    ],
    befehle: ["DNS-Auflösung", "Erreichbarkeit", "Port-Erreichbarkeit"],
    eskalation: "Server antwortet nicht: an den Betreiber des Dienstes.",
  },
  "wlan-verbindet-nicht": {
    titel: "WLAN verbindet sich nicht",
    stichworte: ["wlan verbindet nicht", "wifi verbindet nicht", "wlan geht nicht", "kann nicht verbinden"],
    schritte: [
      "Flugmodus und WLAN-Schalter prüfen",
      "WLAN-Profil löschen und neu verbinden",
      "Zertifikat / Anmeldedaten bei Firmen-WLAN prüfen",
      "WLAN-Bericht erstellen und auswerten",
    ],
    suche: ["wlan"],
    befehle: ["WLAN-Profile", "WLAN-Adapter-Bericht"],
  },
  "wlan-abbrueche": {
    titel: "WLAN bricht ständig ab",
    stichworte: ["wlan bricht ab", "wlan trennt", "wifi abbrueche", "wlan instabil"],
    schritte: [
      "Energiesparen für den WLAN-Adapter im Geräte-Manager deaktivieren",
      "WLAN-Treiber aktualisieren",
      "Signalstärke am Platz prüfen, anderen Ort testen",
      "WLAN-Bericht auswerten",
    ],
    suche: ["wlan bricht"],
    befehle: ["WLAN-Adapter-Bericht", "Energieeinstellungen-Bericht"],
  },
  "wlan-nicht-sichtbar": {
    titel: "WLAN-Netz wird nicht angezeigt",
    stichworte: ["wlan nicht sichtbar", "netz wird nicht angezeigt", "kein wlan gefunden", "wlan fehlt"],
    schritte: [
      "Ist der WLAN-Adapter aktiv (Geräte-Manager, Flugmodus)?",
      "Sehen andere Geräte das Netz?",
      "Treiber neu installieren",
    ],
    befehle: ["Geräte-Manager", "WLAN-Profile"],
  },

  /* ---------- VPN ---------- */
  "vpn-verbindet-nicht": {
    titel: "VPN verbindet nicht",
    stichworte: ["vpn verbindet nicht", "vpn geht nicht", "vpn fehler", "vpn anmeldung"],
    fragen: ["Welche Fehlermeldung zeigt der VPN-Client?", "Funktioniert das Internet zu Hause?"],
    schritte: [
      "Internetverbindung ohne VPN prüfen",
      "Zugangsdaten und zweiten Faktor prüfen",
      "Client neu starten, Version prüfen",
      "Anderes Netz testen (Handy-Hotspot) – manche Router blockieren VPN",
    ],
    suche: ["vpn"],
  },
  "vpn-nichts-erreichbar": {
    titel: "VPN verbunden, intern nichts erreichbar",
    stichworte: ["vpn verbunden nichts erreichbar", "vpn keine laufwerke", "vpn server nicht erreichbar"],
    schritte: [
      "DNS-Auflösung interner Namen prüfen",
      "Heimnetz im gleichen IP-Bereich wie das Firmennetz? (z. B. 192.168.0.x)",
      "VPN trennen, DNS-Cache leeren, neu verbinden",
    ],
    suche: ["vpn"],
    befehle: ["DNS-Auflösung", "Netzwerkkonfiguration", "DNS-Zwischenspeicher"],
  },
  "vpn-instabil": {
    titel: "VPN bricht ab oder ist langsam",
    stichworte: ["vpn bricht ab", "vpn langsam", "vpn trennt", "homeoffice langsam"],
    schritte: [
      "Kabel statt WLAN zu Hause testen",
      "Andere Downloads/Streams im Heimnetz pausieren",
      "Energiesparoptionen des Netzwerkadapters prüfen",
    ],
    suche: ["vpn"],
    befehle: ["Netzwerkweg prüfen", "Erreichbarkeit"],
  },

  /* ---------- Drucker ---------- */
  "druck-warteschlange": {
    titel: "Druckauftrag bleibt hängen",
    stichworte: ["druckauftrag haengt", "warteschlange", "druckt nicht", "drucker druckt nicht", "spooler"],
    schritte: [
      "Drucker eingeschaltet, online, Papier und Toner vorhanden?",
      "Druckaufträge anzeigen und Warteschlange leeren",
      "Druckwarteschlange (Spooler) neu starten",
      "Testseite drucken",
    ],
    suche: ["warteschlange"],
    befehle: ["Druckaufträge", "Druckwarteschlange leeren"],
  },
  "drucker-fehlt": {
    titel: "Drucker nicht gefunden",
    stichworte: ["drucker fehlt", "drucker nicht gefunden", "drucker verbinden", "neuer drucker", "drucker hinzufuegen"],
    schritte: [
      "Installierte Drucker anzeigen",
      "Netzwerkdrucker über den Druckserver neu verbinden",
      "Gruppenrichtlinien aktualisieren, falls Drucker per GPO verteilt",
    ],
    befehle: ["Installierte Drucker", "Netzwerkdrucker verbinden", "Gruppenrichtlinien aktualisieren"],
  },
  "druck-qualitaet": {
    titel: "Druckt leere, streifige oder falsche Seiten",
    stichworte: ["leere seiten", "streifen", "blass", "falsche zeichen", "kryptische zeichen", "druckbild"],
    schritte: [
      "Toner/Tinte prüfen, Trommel kontrollieren",
      "Testseite direkt am Gerät drucken (trennt Gerät von Treiber)",
      "Bei falschen Zeichen: Druckertreiber neu installieren",
    ],
    suche: ["leere seiten"],
  },
  "drucker-fehler": {
    titel: "Drucker meldet Fehler oder Papierstau",
    stichworte: ["papierstau", "druckerfehler", "fehlercode drucker", "drucker blinkt"],
    schritte: [
      "Fehlercode am Display notieren",
      "Papierstau nach Anleitung entfernen, alle Klappen prüfen",
      "Gerät aus- und einschalten",
    ],
    eskalation: "Hardwaredefekt: Servicetechniker / Wartungsvertrag beauftragen.",
  },
  scanner: {
    titel: "Scannen geht nicht",
    stichworte: ["scanner", "scannen", "scan to mail", "scan to folder", "scan ordner"],
    schritte: [
      "Zielordner / Zieladresse am Gerät prüfen",
      "Bei Scan-to-Mail: SMTP-Zugang und Größenlimit prüfen",
      "Bei Scan-to-Folder: Freigabe-Berechtigung und Passwort des Scan-Kontos prüfen",
    ],
    eskalation: "Gerätekonfiguration: an Druckerbetreuung / Dienstleister.",
  },

  /* ---------- Dateien ---------- */
  netzlaufwerke: {
    titel: "Netzlaufwerke fehlen",
    stichworte: ["netzlaufwerk", "laufwerk fehlt", "laufwerk weg", "laufwerk verschwunden", "rotes kreuz", "laufwerk getrennt", "share", "freigabe fehlt"],
    schritte: [
      "Netzlaufwerke anzeigen",
      "Gruppenrichtlinien aktualisieren und neu anmelden",
      "Laufwerk manuell verbinden",
      "Bei VPN: erst VPN verbinden, dann Laufwerke",
    ],
    suche: ["netzlaufwerk"],
    befehle: ["Netzlaufwerke anzeigen", "Netzlaufwerk verbinden", "Gruppenrichtlinien aktualisieren"],
  },
  "zugriff-ordner": {
    titel: "Zugriff verweigert auf Ordner",
    stichworte: ["zugriff verweigert", "keine berechtigung", "access denied", "ordner gesperrt", "kein zugriff ordner"],
    fragen: ["Hatte der Benutzer den Zugriff früher schon?", "Liegt eine Freigabe des Ordner-Verantwortlichen vor?"],
    schritte: [
      "Gruppenmitgliedschaften des Benutzers prüfen",
      "Neue Gruppen wirken erst nach Ab-/Anmeldung oder Kerberos-Ticket-Reset",
      "Berechtigung nur nach Freigabe des Verantwortlichen beantragen/vergeben",
    ],
    suche: ["zugriff verweigert"],
    befehle: ["Gruppenmitgliedschaften", "Kerberos-Tickets zurücksetzen"],
  },
  onedrive: {
    titel: "OneDrive synchronisiert nicht",
    stichworte: ["onedrive", "synchronisierung", "sync", "wolke rot", "sync fehler"],
    schritte: [
      "OneDrive-Symbol prüfen: angemeldet? Pausiert? Fehlermeldung?",
      "Dateinamen mit ungültigen Zeichen oder zu langen Pfaden suchen",
      "Speicherplatz lokal und in OneDrive prüfen",
      "OneDrive zurücksetzen: %LocalAppData%\\Microsoft\\OneDrive\\onedrive.exe /reset, danach OneDrive neu starten",
    ],
    suche: ["onedrive"],
  },
  "datei-wiederherstellen": {
    titel: "Datei gelöscht oder überschrieben",
    stichworte: ["geloescht", "ueberschrieben", "datei weg", "wiederherstellen", "vorgaengerversion", "papierkorb"],
    fragen: ["Wo lag die Datei (lokal, Netzlaufwerk, OneDrive, SharePoint)?", "Wann war der letzte gute Stand?"],
    schritte: [
      "Papierkorb prüfen (lokal bzw. OneDrive/SharePoint-Papierkorb)",
      "Netzlaufwerk: Rechtsklick → Vorgängerversionen",
      "OneDrive/SharePoint: Versionsverlauf der Datei",
      "Sonst Wiederherstellung aus dem Backup beantragen",
    ],
    suche: ["geloescht", "ueberschrieben"],
    eskalation: "Restore aus Backup: an das Backup-/Server-Team mit Pfad und Zeitpunkt.",
  },
  "datei-gesperrt": {
    titel: "Datei ist gesperrt / wird verwendet",
    stichworte: ["datei gesperrt", "wird verwendet", "schreibgeschuetzt", "gesperrt von", "bereits geoeffnet"],
    schritte: [
      "Wer hat die Datei offen? Hinweis in Office beachten",
      "Hängende Office-Prozesse beim Benutzer beenden",
      "Geöffnete Dateien auf dem Dateiserver prüfen und Sitzung schließen",
      "Versteckte ~$-Sperrdatei im Ordner prüfen",
    ],
    befehle: ["Prozess beenden", "Aktuelle Prozesse"],
  },
  sharepoint: {
    titel: "SharePoint / Teams-Dateien",
    stichworte: ["sharepoint", "teams dateien", "bibliothek", "website zugriff"],
    schritte: [
      "Im Browser öffnen und Zugriff testen",
      "Zugriff über den Besitzer der Website / des Teams anfragen",
      "Synchronisierte Bibliothek: OneDrive-Status prüfen",
    ],
    suche: ["onedrive", "sharepoint"],
  },

  /* ---------- Rechner ---------- */
  "rechner-langsam": {
    titel: "Rechner ist langsam",
    stichworte: ["langsam", "lahm", "traege", "dauert ewig", "startet langsam", "rechner langsam", "pc langsam"],
    schritte: [
      "Systemlaufzeit prüfen – lange nicht neu gestartet?",
      "Speicherfresser im Task-Manager finden",
      "Autostart-Programme prüfen",
      "Freien Speicherplatz prüfen",
      "Laufende Updates abwarten",
    ],
    suche: ["langsam"],
    befehle: ["Systemlaufzeit", "Speicherfresser", "Autostart", "Speicherplatz"],
  },
  "rechner-friert": {
    titel: "Rechner friert ein",
    stichworte: ["friert ein", "haengt", "reagiert nicht", "eingefroren", "keine reaktion", "maus bewegt sich nicht"],
    schritte: [
      "Tritt es bei einem bestimmten Programm auf?",
      "Explorer neu starten, wenn nur Taskleiste/Desktop hängt",
      "Systemfehler der letzten 24 Stunden prüfen",
      "Systemdateien prüfen",
    ],
    suche: ["friert"],
    befehle: ["Explorer neu starten", "Systemfehler", "Windows-Systemdateien prüfen", "Speicherfresser"],
  },
  bluescreen: {
    titel: "Bluescreen oder unerwartete Neustarts",
    stichworte: ["bluescreen", "blauer bildschirm", "bsod", "rechner startet neu", "neustart von selbst", "absturz", "unerwartet"],
    fragen: ["Welcher Stoppcode steht auf dem Bluescreen?", "Wurde kürzlich etwas installiert oder angeschlossen?"],
    schritte: [
      "Stoppcode notieren",
      "Unerwartete Neustarts und Systemfehler in der Ereignisanzeige suchen",
      "Kürzlich installierte Treiber/Updates prüfen",
      "Systemdateien und Windows-Abbild reparieren",
      "Datenträger auf Fehler prüfen",
    ],
    suche: ["bluescreen"],
    befehle: ["Unerwartete Neustarts", "Systemfehler", "Windows-Systemdateien", "Windows-Abbild reparieren", "Datenträger auf Fehler"],
    eskalation: "Wiederholt mit Hardware-Stoppcode (Speicher, Festplatte): Gerätetausch über 3rd Level.",
  },
  "startet-nicht": {
    titel: "Rechner startet nicht",
    stichworte: ["startet nicht", "geht nicht an", "kein strom", "bootet nicht", "schwarzer bildschirm beim start"],
    schritte: [
      "Stromkabel, Netzteil, Steckdosenleiste prüfen",
      "Laptop: Netzteil anschließen, 30 Sekunden Einschaltknopf halten",
      "Leuchten LEDs, sind Lüfter zu hören?",
      "Bildschirm-Kabel prüfen – läuft der Rechner vielleicht doch?",
    ],
    eskalation: "Keine Reaktion: Ersatzgerät bereitstellen, Gerät zur Reparatur.",
  },
  "update-fehler": {
    titel: "Windows-Update schlägt fehl",
    stichworte: ["update fehler", "update schlaegt fehl", "windows update", "fehlercode update", "updates haengen"],
    schritte: [
      "Fehlercode notieren",
      "Freien Speicherplatz prüfen",
      "Windows Update zurücksetzen",
      "Systemdateien und Abbild reparieren",
    ],
    suche: ["update schlaegt"],
    befehle: ["Windows Update zurücksetzen", "Installierte Updates", "Windows-Abbild reparieren", "Speicherplatz"],
  },
  speicherplatz: {
    titel: "Kein Speicherplatz",
    stichworte: ["speicherplatz", "festplatte voll", "laufwerk c voll", "kein platz", "speicher voll"],
    schritte: [
      "Speicherplatz aller Laufwerke anzeigen",
      "Große Dateien finden",
      "Datenträgerbereinigung inkl. Systemdateien",
    ],
    suche: ["speicherplatz"],
    befehle: ["Speicherplatz aller Laufwerke", "Große Dateien finden", "Datenträgerbereinigung"],
  },
  "rechner-sonstiges": {
    titel: "Windows-Problem allgemein",
    stichworte: ["windows", "fehlermeldung", "pc", "rechner", "computer"],
    schritte: [
      "Fehlermeldung wörtlich oder per Screenshot festhalten",
      "Neustart (nicht nur Herunterfahren mit Schnellstart)",
      "Ereignisanzeige auf passende Fehler prüfen",
    ],
    befehle: ["Systemfehler", "Systeminformationen", "Systemlaufzeit"],
  },

  /* ---------- Software ---------- */
  "programm-absturz": {
    titel: "Programm startet nicht oder stürzt ab",
    stichworte: ["programm startet nicht", "anwendung startet nicht", "stuerzt ab", "absturz programm", "software geht nicht"],
    schritte: [
      "Fehlermeldung festhalten",
      "Rechner neu starten",
      "Kürzlich installierte Updates prüfen",
      "Programm reparieren oder neu installieren",
      "Mit anderem Benutzer testen (Profilproblem?)",
    ],
    suche: ["anwendung startet nicht", "stuerzt ab"],
    befehle: ["Systemfehler", "Installierte Programme", "Aktuelle Prozesse"],
  },
  "software-installation": {
    titel: "Software soll installiert werden",
    stichworte: ["installieren", "installation", "software benoetigt", "programm installieren", "adminrechte", "softwarecenter"],
    fragen: ["Welche Software und Version?", "Ist sie freigegeben und lizenziert?"],
    schritte: [
      "Prüfen, ob die Software im Softwarecenter / Firmenportal angeboten wird",
      "Freigabe und Lizenz klären",
      "Installation über Verteilung oder mit Adminrechten durchführen",
      "Funktionstest mit dem Benutzer",
    ],
  },
  lizenz: {
    titel: "Lizenz- oder Aktivierungsproblem",
    stichworte: ["lizenz", "nicht aktiviert", "aktivierung", "produkt deaktiviert", "testversion abgelaufen"],
    schritte: [
      "Bei Office: unter Datei → Konto abmelden und neu anmelden",
      "Lizenzzuweisung des Benutzers prüfen",
      "Windows-Aktivierungsstatus prüfen",
    ],
    befehle: ["Windows-Aktivierungsstatus"],
    eskalation: "Fehlende Lizenz: Bestellung über Lizenzverwaltung.",
  },
  "office-reparatur": {
    titel: "Word, Excel oder anderes Office-Programm macht Probleme",
    stichworte: ["word", "excel", "powerpoint", "office", "makro", "datei laesst sich nicht oeffnen", "excel stuerzt ab", "word stuerzt ab", "office absturz", "excel haengt", "word haengt"],
    schritte: [
      "Programm im abgesicherten Modus starten (winword /safe, excel /safe)",
      "Add-ins deaktivieren",
      "Office-Schnellreparatur, danach Onlinereparatur",
      "Office-Updates installieren",
    ],
    suche: ["word oder excel"],
  },
  fachanwendung: {
    titel: "Fachanwendung macht Probleme",
    stichworte: ["fachanwendung", "branchensoftware", "erp", "sap", "as400", "warenwirtschaft", "remoteapp"],
    fragen: ["Betrifft es nur diesen Benutzer oder mehrere?", "Welche Fehlermeldung, welche Funktion?"],
    schritte: [
      "Fehlermeldung und genaue Schritte festhalten",
      "Andere Benutzer betroffen? Dann zentraler Fehler",
      "Anmeldung/Passwort der Anwendung prüfen",
      "Cache / lokale Konfiguration nach Anleitung zurücksetzen",
    ],
    suche: ["fachanwendung"],
    eskalation: "An den Anwendungsbetreuer / Hersteller mit Fehlermeldung, Zeitpunkt und Reproduktionsschritten.",
  },

  /* ---------- Hardware ---------- */
  "monitor-kein-bild": {
    titel: "Bildschirm schwarz / kein Bild",
    stichworte: ["schwarz", "kein bild", "bildschirm aus", "monitor dunkel", "kein signal"],
    schritte: [
      "Strom und Kabel am Monitor prüfen, Eingangsquelle am Monitor wählen",
      "Windows+P drücken und Anzeigemodus wechseln",
      "Win+Strg+Umschalt+B setzt den Grafiktreiber zurück",
      "Anderes Kabel / anderen Anschluss testen",
    ],
    suche: ["bildschirm bleibt", "externer monitor"],
    befehle: ["Monitore anzeigen"],
  },
  dockingstation: {
    titel: "Zweiter Monitor oder Dockingstation",
    stichworte: ["dockingstation", "dock", "zweiter monitor", "externer monitor", "usb-c", "monitor wird nicht erkannt"],
    schritte: [
      "Dockingstation vom Strom trennen, 30 Sekunden warten, neu anschließen",
      "Laptop direkt am Monitor testen",
      "Treiber/Firmware der Dockingstation aktualisieren",
      "Anzeigeeinstellungen: Bildschirme erweitern",
    ],
    suche: ["dockingstation"],
    befehle: ["Monitore anzeigen", "Geräte-Manager"],
  },
  "maus-tastatur": {
    titel: "Maus oder Tastatur funktioniert nicht",
    stichworte: ["maus", "tastatur", "funkmaus", "tasten", "cursor"],
    schritte: [
      "Anderen USB-Port testen, Batterien bei Funkgeräten tauschen",
      "Empfänger direkt am Rechner statt an der Dockingstation",
      "Im Geräte-Manager auf Fehler prüfen",
      "Ersatzgerät testen",
    ],
    befehle: ["Geräte-Manager"],
  },
  headset: {
    titel: "Headset oder Lautsprecher",
    stichworte: ["headset", "kopfhoerer", "lautsprecher", "kein ton", "bluetooth headset"],
    schritte: [
      "In den Windows-Soundeinstellungen das richtige Gerät als Standard wählen",
      "Anderen USB-Port testen, Bluetooth neu koppeln",
      "In Teams das Gerät unter Einstellungen → Geräte auswählen",
      "Ersatzgerät testen",
    ],
    suche: ["headset", "kein ton"],
    befehle: ["Geräte-Manager"],
  },
  webcam: {
    titel: "Webcam funktioniert nicht",
    stichworte: ["webcam", "kamera", "kein bild kamera", "kamera schwarz"],
    schritte: [
      "Kameraklappe / Abdeckung oder Kamera-Taste am Laptop prüfen",
      "Windows-Datenschutz: Kamerazugriff erlauben",
      "Nur ein Programm gleichzeitig darf die Kamera nutzen",
      "Im Geräte-Manager prüfen",
    ],
    befehle: ["Geräte-Manager"],
  },
  akku: {
    titel: "Laptop-Akku hält nicht oder lädt nicht",
    stichworte: ["akku", "laedt nicht", "batterie", "netzteil", "laptop aus"],
    schritte: [
      "Originalnetzteil und Steckdose prüfen",
      "Akkubericht erstellen und Kapazität prüfen",
      "Energieeinstellungen prüfen",
    ],
    befehle: ["Akkubericht", "Energieeinstellungen-Bericht", "Seriennummer"],
    eskalation: "Akku verschlissen: Ersatz über Garantie bestellen.",
  },
  "hardware-defekt": {
    titel: "Gerät defekt – Austausch",
    stichworte: ["defekt", "kaputt", "austausch", "ersatzgeraet", "garantie", "heruntergefallen"],
    schritte: [
      "Seriennummer und Modell auslesen",
      "Garantiestatus prüfen",
      "Ersatzgerät bereitstellen, Daten sichern",
      "Reparatur / Austausch beauftragen",
    ],
    befehle: ["Seriennummer", "Modell und Hersteller"],
    eskalation: "Austausch über Hardware-/Beschaffungsprozess.",
  },

  /* ---------- Zugriff ---------- */
  "zugriff-anwendung": {
    titel: "Zugriff auf Programm fehlt",
    stichworte: ["zugriff programm", "berechtigung anwendung", "rolle fehlt", "keine rechte"],
    schritte: [
      "Welche Rolle/Gruppe wird benötigt? Freigabe des Verantwortlichen einholen",
      "Gruppenmitgliedschaft prüfen bzw. nach Freigabe setzen",
      "Ab- und neu anmelden",
    ],
    suche: ["zugriff verweigert"],
    befehle: ["Gruppenmitgliedschaften", "Kerberos-Tickets zurücksetzen"],
  },
  onboarding: {
    titel: "Neuer Mitarbeiter",
    stichworte: ["neuer mitarbeiter", "neuer kollege", "onboarding", "neues konto", "einstellung", "erster arbeitstag", "faengt an", "anfangen"],
    schritte: [
      "Konto, Postfach und Lizenzen anlegen",
      "Gruppen nach Abteilung/Vorlage zuweisen",
      "Hardware vorbereiten, MFA-Einrichtung erklären",
      "Zugänge zu Fachanwendungen beantragen",
    ],
    suche: ["neuer mitarbeiter", "onboarding"],
  },
  offboarding: {
    titel: "Mitarbeiter verlässt das Unternehmen",
    stichworte: ["austritt", "offboarding", "verlaesst", "kuendigung", "letzter arbeitstag", "konto deaktivieren"],
    schritte: [
      "Konto zum Austrittstermin deaktivieren",
      "Postfach-Weiterleitung oder Freigabe nach Vorgabe",
      "Hardware zurücknehmen, Lizenzen freigeben",
      "Gruppen und Sonderrechte entfernen",
    ],
    suche: ["offboarding", "austritt"],
  },

  /* ---------- Browser ---------- */
  "browser-cache": {
    titel: "Webseite lädt nicht oder falsch",
    stichworte: ["webseite laedt nicht", "seite falsch dargestellt", "browser cache", "seite haengt", "browser"],
    schritte: [
      "Seite mit Strg+F5 neu laden",
      "Im privaten Fenster testen",
      "Browser-Cache und Cookies leeren",
      "Anderen Browser testen",
    ],
    suche: ["webseite"],
  },
  zertifikat: {
    titel: "Zertifikatsfehler im Browser",
    stichworte: ["zertifikat", "nicht sicher", "ssl", "verbindung nicht privat", "sicherheitswarnung"],
    schritte: [
      "Datum und Uhrzeit am Rechner prüfen",
      "Betrifft es nur diese Seite? Interne Seiten brauchen das Firmen-Stammzertifikat",
      "Gruppenrichtlinien aktualisieren",
      "Bei externen Seiten: Warnung ernst nehmen, nicht übergehen",
    ],
    befehle: ["Gruppenrichtlinien aktualisieren"],
  },
  "web-anmeldung": {
    titel: "Anmeldung an Webanwendung klappt nicht",
    stichworte: ["webanmeldung", "portal anmeldung", "single sign on", "sso", "anmeldeschleife"],
    schritte: [
      "Im privaten Fenster testen",
      "Cookies der Seite löschen",
      "Richtiges Konto verwenden (privat vs. Firma)",
      "Konto und MFA-Status prüfen",
    ],
    suche: ["webseite"],
  },
  "browser-adware": {
    titel: "Pop-ups, Werbung, fremde Startseite",
    stichworte: ["popup", "werbung", "startseite geaendert", "suchmaschine geaendert", "erweiterung"],
    schritte: [
      "Browser-Erweiterungen prüfen und unbekannte entfernen",
      "Browser zurücksetzen",
      "Virenscan durchführen",
    ],
    befehle: ["Installierte Programme", "Autostart"],
    eskalation: "Hinweise auf Schadsoftware: Sicherheitsteam informieren.",
  },

  /* ---------- Handy ---------- */
  "handy-mail": {
    titel: "Mails/Kalender kommen nicht aufs Handy",
    stichworte: ["handy mail", "smartphone mail", "outlook app", "kalender handy", "iphone mail"],
    schritte: [
      "Outlook-App: Konto entfernen und neu hinzufügen",
      "Passwort kürzlich geändert? Neu anmelden",
      "Gerät im Firmenportal konform?",
    ],
  },
  "handy-mdm": {
    titel: "Firmen-App fehlt / Gerät nicht konform",
    stichworte: ["firmenportal", "intune", "mdm", "nicht konform", "compliance", "app fehlt"],
    schritte: [
      "Firmenportal-App öffnen und Konformität prüfen",
      "Betriebssystem aktualisieren, Bildschirmsperre setzen",
      "Gerät im Portal synchronisieren",
    ],
  },


  /* ---------- Ergaenzungen ---------- */
  "windows-hello": {
    titel: "PIN / Windows Hello funktioniert nicht",
    stichworte: ["pin", "windows hello", "pin geht nicht", "fingerabdruck", "gesichtserkennung", "pin vergessen"],
    fragen: ["Kommt eine Fehlermeldung oder wird die PIN nur abgelehnt?", "Klappt die Anmeldung mit dem normalen Passwort?"],
    schritte: [
      "Mit dem Passwort anmelden (Anmeldeoptionen unter dem PIN-Feld)",
      "Einstellungen → Konten → Anmeldeoptionen → PIN: „Ich habe meine PIN vergessen“ bzw. PIN entfernen und neu einrichten",
      "Ohne Netz zum Unternehmen kann eine neue PIN oft nicht eingerichtet werden – VPN oder Büro",
      "Bei Fehlern rund um TPM: Gerät neu starten, TPM-Status in tpm.msc prüfen",
    ],
    befehle: ["Systeminformationen"],
  },
  bitlocker: {
    titel: "BitLocker fragt nach dem Wiederherstellungsschlüssel",
    stichworte: ["bitlocker", "wiederherstellungsschluessel", "recovery key", "blauer bildschirm schluessel", "schluessel eingeben"],
    fragen: ["Welche Schlüssel-ID (die ersten 8 Zeichen) zeigt der Bildschirm?", "Wurde kürzlich ein BIOS-Update gemacht, Hardware getauscht oder die Dockingstation gewechselt?"],
    schritte: [
      "Identität des Anrufers sicher prüfen – der Schlüssel entsperrt das ganze Gerät",
      "Schlüssel-ID notieren und in Entra ID / Intune bzw. Active Directory beim Computerobjekt nachschlagen",
      "Schlüssel nur dem Gerätebesitzer telefonisch durchgeben, nicht per Mail",
      "Nach der Anmeldung Ursache klären (BIOS-/Firmware-Update, TPM, Bootreihenfolge)",
      "Tritt es wiederholt auf: Schlüssel nach Gebrauch rotieren lassen",
    ],
    eskalation: "Kein Schlüssel hinterlegt: an 3rd Level / Endpoint-Team – ohne Schlüssel sind die Daten nicht wiederherstellbar.",
  },
  namensaenderung: {
    titel: "Namensänderung (z. B. nach Heirat)",
    stichworte: ["namensaenderung", "name geaendert", "heirat", "nachname", "neuer name"],
    fragen: ["Liegt die Änderungsmitteilung der Personalabteilung vor?"],
    schritte: [
      "Freigabe/Mitteilung der Personalabteilung abwarten",
      "Anzeigename, Nachname und ggf. Mailadresse im AD/Entra ID anpassen, alte Adresse als Alias behalten",
      "Anmeldename nur ändern, wenn Richtlinie es vorsieht – betrifft Profile und Anwendungen",
      "Signatur, Telefonbuch und Fachanwendungen nachziehen",
    ],
  },
  abwesenheit: {
    titel: "Abwesenheitsnotiz einrichten",
    stichworte: ["abwesenheitsnotiz", "abwesenheit", "urlaub", "out of office", "automatische antwort", "abwesend"],
    fragen: ["Ist der Benutzer selbst noch erreichbar oder soll es stellvertretend eingerichtet werden?"],
    schritte: [
      "Klassisches Outlook: Datei → Automatische Antworten; neues Outlook und Web: Einstellungen → Konten → Automatische Antworten",
      "Zeitraum setzen, getrennte Texte für intern und extern",
      "Stellvertretend nur mit Freigabe (Vorgesetzte/r) – über Exchange Admin Center",
    ],
  },
  signatur: {
    titel: "Signatur fehlt oder ist falsch",
    stichworte: ["signatur", "unterschrift mail", "signatur fehlt", "signatur falsch"],
    schritte: [
      "Werden Signaturen zentral verteilt? Dann Daten im AD (Titel, Telefon, Abteilung) prüfen",
      "Sonst: Datei → Optionen → E-Mail → Signaturen, Standard für neue Mails und Antworten setzen",
      "Outlook im Web hat eine eigene Signatur – dort ggf. separat einrichten",
    ],
  },
  "anhang-gross": {
    titel: "Anhang zu groß",
    stichworte: ["anhang zu gross", "anhang", "datei zu gross", "mail zu gross", "grosse datei verschicken"],
    schritte: [
      "Datei in OneDrive/SharePoint ablegen und als Link teilen",
      "Für Externe: Freigabelink mit Ablaufdatum bzw. vorgesehenen Dateiaustausch nutzen",
      "Grenze ist meist 25–35 MB inklusive Kodierung – Empfänger können noch kleinere Grenzen haben",
    ],
  },
  "kalender-freigabe": {
    titel: "Kalender freigeben / Stellvertretung",
    stichworte: ["kalender", "kalender freigeben", "stellvertretung", "termine sehen", "kalenderberechtigung"],
    schritte: [
      "Outlook: Kalender → Freigeben → Person hinzufügen, Berechtigungsstufe wählen",
      "Stellvertretung (Termine im Namen annehmen): Datei → Kontoeinstellungen → Zugriffsrechte für Stellvertretung",
      "Ohne Zugriff des Besitzers nur mit dessen Freigabe über das Exchange Admin Center",
    ],
  },
  "teams-status": {
    titel: "Teams-Status falsch / keine Benachrichtigungen",
    stichworte: ["teams status", "status falsch", "abwesend obwohl", "benachrichtigungen", "keine benachrichtigung"],
    schritte: [
      "Status manuell setzen und „Status zurücksetzen“ wählen",
      "Teams-Einstellungen → Benachrichtigungen prüfen, Windows-Fokus/Nicht stören prüfen",
      "Kalender: Ein laufender Termin setzt automatisch „Beschäftigt“",
      "Ab- und neu anmelden",
    ],
  },
  "rdp-verbindet-nicht": {
    titel: "Remotedesktop verbindet nicht",
    stichworte: ["remotedesktop", "rdp", "terminalserver", "citrix", "remoteverbindung", "mstsc", "verbindung nicht moeglich"],
    fragen: ["Welche Fehlermeldung erscheint?", "Im Büro oder über VPN?"],
    schritte: [
      "VPN verbunden? Zielrechner erreichbar und eingeschaltet?",
      "Port 3389 bzw. Gateway erreichbar prüfen",
      "Benutzer in der Gruppe „Remotedesktopbenutzer“ bzw. der Zugriffsgruppe?",
      "Gespeicherte RDP-Anmeldedaten löschen und neu anmelden",
    ],
    befehle: ["Erreichbarkeit", "Port-Erreichbarkeit", "Gespeicherte Zugangsdaten", "Gruppenmitgliedschaften"],
    eskalation: "Server oder Gateway nicht erreichbar: an das Server-/Citrix-Team.",
  },
  "rdp-sitzung": {
    titel: "Remotesitzung hängt / schwarzer Bildschirm",
    stichworte: ["sitzung haengt", "terminalserver haengt", "rdp schwarz", "citrix haengt", "sitzung abmelden"],
    schritte: [
      "In der Sitzung Strg+Alt+Ende drücken (entspricht Strg+Alt+Entf) und den Task-Manager öffnen",
      "Hängende Sitzung serverseitig abmelden (Remotedesktopsitzungen anzeigen / Task-Manager → Benutzer)",
      "Neu verbinden",
      "Tritt es bei mehreren Benutzern auf: Server-Auslastung prüfen lassen",
    ],
    befehle: ["Remotedesktop-Sitzungen", "Aktuelle Prozesse"],
    eskalation: "Mehrere Benutzer betroffen: Server-Team.",
  },
  "rdp-umleitung": {
    titel: "Drucker oder Laufwerke fehlen in der Remotesitzung",
    stichworte: ["drucker in sitzung", "laufwerk in sitzung", "umleitung", "lokale drucker terminalserver"],
    schritte: [
      "Im RDP-Client unter „Lokale Ressourcen“ Drucker und Laufwerke aktivieren",
      "Neu verbinden – Umleitung greift nur beim Verbindungsaufbau",
      "Treiber des lokalen Druckers muss auf dem Server unterstützt sein",
    ],
    befehle: ["Netzlaufwerke anzeigen", "Installierte Drucker"],
  },
  "office-autorecover": {
    titel: "Office-Datei nicht gespeichert oder nach Absturz weg",
    stichworte: ["nicht gespeichert", "ungespeichert", "autowiederherstellung", "absturz datei weg", "word abgestuerzt datei", "excel nicht gespeichert"],
    schritte: [
      "Programm neu öffnen – links erscheint oft der Bereich „Dokumentwiederherstellung“",
      "Datei → Informationen → Dokument verwalten → Nicht gespeicherte Dokumente wiederherstellen",
      "Bei OneDrive/SharePoint-Dateien: Versionsverlauf prüfen",
      "Für die Zukunft: AutoSpeichern bzw. Speicherintervall der AutoWiederherstellung prüfen",
    ],
    suche: ["geloescht", "word oder excel"],
  },
  "usb-geraet": {
    titel: "USB-Stick oder externe Festplatte wird nicht erkannt",
    stichworte: ["usb stick", "usb", "externe festplatte", "stick wird nicht erkannt", "usb gesperrt", "speicherstick"],
    fragen: ["Erscheint eine Meldung, dass Wechseldatenträger gesperrt sind?"],
    schritte: [
      "Anderen USB-Port direkt am Rechner testen (nicht über Hub/Dock)",
      "Datenträgerverwaltung: Wird das Laufwerk angezeigt, nur ohne Buchstaben?",
      "Wechseldatenträger per Richtlinie gesperrt? Dann nur mit freigegebener Ausnahme",
      "Am anderen Rechner testen – defekt oder unformatiert?",
    ],
    befehle: ["Lokale Laufwerke", "Geräte-Manager"],
  },
  startmenue: {
    titel: "Startmenü, Taskleiste oder Suche reagiert nicht",
    stichworte: ["startmenue", "taskleiste", "windows suche", "startknopf", "suche geht nicht"],
    schritte: [
      "Windows-Explorer neu starten",
      "Abmelden und neu anmelden",
      "Systemdateien prüfen",
      "Ausstehende Updates installieren und neu starten",
    ],
    suche: ["friert"],
    befehle: ["Explorer neu starten", "Windows-Systemdateien", "Windows-Abbild reparieren"],
  },
  uhrzeit: {
    titel: "Uhrzeit oder Datum falsch",
    stichworte: ["uhrzeit falsch", "uhr geht falsch", "datum falsch", "zeitzone", "zeit falsch"],
    schritte: [
      "Zeitzone in den Einstellungen prüfen",
      "Zeit mit dem Domänencontroller synchronisieren (w32tm /resync)",
      "Hinweis: Falsche Zeit verursacht auch Anmelde-, Zertifikats- und MFA-Fehler",
      "Geht die Uhr nach jedem Neustart falsch: CMOS-Batterie (Hardware)",
    ],
    befehle: ["Anmeldeserver"],
  },
  standardprogramm: {
    titel: "Datei öffnet mit falschem Programm / PDF öffnet nicht",
    stichworte: ["pdf", "standardprogramm", "oeffnet mit falschem programm", "acrobat", "dateizuordnung", "pdf oeffnet nicht"],
    schritte: [
      "Rechtsklick auf die Datei → Öffnen mit → Andere App auswählen → „Immer“",
      "Einstellungen → Apps → Standard-Apps nach Dateityp prüfen",
      "Wird die Zuordnung zentral gesetzt, nach Anmeldung erneut zurückgesetzt? Dann Richtlinie prüfen",
      "PDF-Programm reparieren oder neu installieren",
    ],
    befehle: ["Gruppenrichtlinien aktualisieren", "Installierte Programme"],
  },
  "tastatur-layout": {
    titel: "Tastatur schreibt falsche Zeichen",
    stichworte: ["falsche zeichen", "y und z vertauscht", "tastaturlayout", "sonderzeichen", "at zeichen", "englische tastatur"],
    schritte: [
      "Sprachleiste prüfen: ENG statt DEU? Mit Windows+Leertaste zurückschalten – häufigste Ursache ist versehentliches Alt+Umschalt",
      "Ungewollte Tastaturlayouts unter Einstellungen → Zeit und Sprache entfernen",
      "Num-Taste prüfen, falls Zahlen statt Buchstaben kommen (Laptops)",
      "In Remotesitzungen das Layout der Sitzung prüfen",
    ],
  },
  skalierung: {
    titel: "Bild unscharf / Schrift zu groß oder zu klein",
    stichworte: ["unscharf", "aufloesung", "schrift zu gross", "schrift zu klein", "skalierung", "verschwommen"],
    schritte: [
      "Einstellungen → Anzeige: empfohlene Auflösung und Skalierung wählen",
      "Bei mehreren Bildschirmen jeden einzeln einstellen",
      "Nach Wechsel an der Dockingstation einmal ab- und anmelden",
      "Grafiktreiber aktualisieren",
    ],
    suche: ["externer monitor"],
    befehle: ["Monitore anzeigen"],
  },

  /* ---------- Sicherheit ---------- */
  "phishing-gemeldet": {
    titel: "Verdächtige Mail erhalten",
    stichworte: ["phishing", "verdaechtige mail", "spam mail", "betrug", "gefaelschte mail"],
    schritte: [
      "Benutzer loben – nicht klicken war richtig",
      "Mail über den „Phishing melden“-Knopf melden lassen",
      "Prüfen, ob weitere Kollegen dieselbe Mail bekommen haben",
    ],
    suche: ["phishing"],
  },
  "phishing-geklickt": {
    titel: "Auf Phishing-Link geklickt / Daten eingegeben",
    stichworte: ["link geklickt", "phishing geklickt", "daten eingegeben", "passwort eingegeben", "anhang geoeffnet"],
    fragen: ["Wurden Zugangsdaten eingegeben?", "Wurde ein Anhang geöffnet oder etwas installiert?"],
    schritte: [
      "Rechner sofort vom Netz trennen (Kabel/WLAN), nicht ausschalten",
      "Passwort sofort zurücksetzen und alle Sitzungen abmelden",
      "MFA-Methoden auf fremde Einträge prüfen",
      "Sicherheitsteam sofort informieren",
    ],
    suche: ["phishing"],
    eskalation: "Sicherheitsvorfall: sofort an das Sicherheitsteam / CERT, keine eigene Bereinigung.",
    dringend: true,
  },
  virus: {
    titel: "Virenwarnung oder seltsames Verhalten",
    stichworte: ["virus", "virenwarnung", "trojaner", "malware", "verschluesselt", "ransomware", "dateien umbenannt"],
    schritte: [
      "Bei Verschlüsselung/umbenannten Dateien: sofort vom Netz trennen",
      "Meldung des Virenscanners festhalten",
      "Sicherheitsteam informieren",
    ],
    eskalation: "Sicherheitsvorfall: sofort an das Sicherheitsteam.",
    dringend: true,
  },
  "geraet-verloren": {
    titel: "Gerät verloren oder gestohlen",
    stichworte: ["verloren", "gestohlen", "diebstahl", "laptop weg", "handy weg"],
    schritte: [
      "Gerät in der Geräteverwaltung sperren bzw. löschen",
      "Passwort zurücksetzen und Sitzungen beenden",
      "Sicherheitsteam / Datenschutz informieren",
      "Bei Diebstahl: Anzeige durch den Mitarbeiter",
    ],
    eskalation: "Meldung an Sicherheit und Datenschutz (mögliche Meldepflicht).",
    dringend: true,
  },
  "konto-kompromittiert": {
    titel: "Konto möglicherweise missbraucht",
    stichworte: ["fremde anmeldung", "gehackt", "konto missbraucht", "mails verschickt die ich nicht", "unbekannte anmeldung"],
    schritte: [
      "Passwort sofort zurücksetzen, alle Sitzungen widerrufen",
      "Postfachregeln und Weiterleitungen prüfen",
      "MFA-Methoden prüfen und fremde entfernen",
      "Sicherheitsteam informieren",
    ],
    suche: ["phishing"],
    eskalation: "Sicherheitsvorfall: sofort an das Sicherheitsteam.",
    dringend: true,
  },
};

/*
 * Synonyme fuer die Freitext-Erkennung. Umlaute schon umgeschrieben (ae, oe,
 * ue, ss) -- so wird auch die Eingabe vereinheitlicht. Woerter ab vier
 * Buchstaben treffen auch als Wortanfang: "druck" findet "druckt", "drucken".
 */
export const ASSISTANT_SYNONYMS = [
  ["passwort", "kennwort", "pw", "passwd", "password"],
  ["hello", "pin", "fingerabdruck", "gesichtserkennung"],
  ["bitlocker", "wiederherstellungsschluessel", "recovery", "schluessel"],
  ["remotedesktop", "rdp", "terminalserver", "citrix", "rds", "mstsc", "remotesitzung", "sitzung"],
  ["abwesenheit", "abwesenheitsnotiz", "urlaub", "abwesend", "ooo"],
  ["signatur", "unterschrift", "signature"],
  ["anhang", "anhaenge", "attachment"],
  ["kalender", "termin", "termine"],
  ["usb", "stick", "usb-stick", "speicherstick", "wechseldatentraeger"],
  ["startmenue", "taskleiste", "startknopf"],
  ["uhrzeit", "uhr", "datum", "zeitzone"],
  ["pdf", "acrobat", "standardprogramm", "dateizuordnung"],
  ["skalierung", "unscharf", "aufloesung", "verschwommen"],
  ["layout", "tastaturlayout", "vertauscht", "sonderzeichen"],
  ["namensaenderung", "nachname", "heirat", "geheiratet", "verheiratet", "namen", "name"],
  ["gesperrt", "sperre", "locked", "lockout", "sperrt"],
  ["anmeldung", "anmelden", "login", "einloggen", "logon", "signin", "anmeldet"],
  ["mfa", "authenticator", "2fa", "otp", "push", "faktor"],
  ["mail", "email", "e-mail", "mails", "nachricht", "nachrichten"],
  ["outlook", "owa"],
  ["postfach", "mailbox", "posteingang"],
  ["teams", "meeting", "besprechung", "videokonferenz", "call", "konferenz"],
  ["ton", "audio", "sound", "hoeren", "hoert", "hoere", "laut"],
  ["mikrofon", "mikro", "mic"],
  ["kamera", "webcam", "cam", "video"],
  ["drucker", "druck", "printer", "ausdruck"],
  ["scanner", "scan", "scannen"],
  ["internet", "online", "web", "webseite", "website", "seite", "seiten"],
  ["wlan", "wifi", "wireless", "funknetz"],
  ["netzwerk", "netz", "lan", "network", "verbindung", "verbunden", "verbindet"],
  ["vpn", "homeoffice", "fernzugriff", "remote", "zuhause"],
  ["laufwerk", "netzlaufwerk", "share", "freigabe", "ordner"],
  ["onedrive", "sync", "synchron", "synchronisierung", "synchronisiert"],
  ["langsam", "lahm", "traege", "ewig", "dauert", "zaeh", "slow"],
  ["haengt", "friert", "eingefroren", "reagiert", "freeze", "haengen"],
  ["absturz", "stuerzt", "crash", "abgestuerzt", "abschmiert"],
  ["bluescreen", "bsod", "blauer"],
  ["neustart", "neustarts", "neu", "reboot", "neugestartet"],
  ["neuer", "neue", "neues", "neuen"],
  ["konto", "account", "benutzerkonto", "kennung"],
  ["update", "updates", "aktualisierung", "patch"],
  ["speicherplatz", "speicher", "voll", "festplatte", "platz"],
  ["bildschirm", "monitor", "display", "anzeige", "screen"],
  ["schwarz", "dunkel", "bild"],
  ["dockingstation", "dock", "docking", "usb-c"],
  ["maus", "mouse"],
  ["tastatur", "keyboard", "tasten"],
  ["headset", "kopfhoerer", "lautsprecher"],
  ["akku", "batterie", "laden", "laedt", "netzteil"],
  ["zugriff", "berechtigung", "rechte", "zugang", "verweigert", "access"],
  ["software", "programm", "anwendung", "app", "tool"],
  ["installieren", "installation", "install", "installiert"],
  ["lizenz", "aktiviert", "aktivierung", "license"],
  ["browser", "chrome", "edge", "firefox"],
  ["zertifikat", "ssl", "unsicher", "privat"],
  ["handy", "smartphone", "iphone", "android", "diensthandy", "mobil", "telefon"],
  ["phishing", "verdaechtig", "betrug", "fake", "gefaelscht"],
  ["virus", "trojaner", "malware", "schadsoftware", "ransomware", "verschluesselt"],
  ["verloren", "gestohlen", "diebstahl"],
  ["geloescht", "loeschen", "weg", "verschwunden", "ueberschrieben"],
  ["fehler", "fehlermeldung", "error", "meldung"],
  ["rechner", "pc", "computer", "laptop", "notebook", "arbeitsplatz", "geraet"],
];

/** Fuellwoerter, die fuer die Erkennung nichts aussagen. */
export const ASSISTANT_STOPWORDS = new Set([
  "der", "die", "das", "den", "dem", "des", "ein", "eine", "einen", "einem", "einer",
  "und", "oder", "aber", "nicht", "kein", "keine", "keinen", "geht", "gehen", "ist",
  "sind", "war", "hat", "habe", "haben", "mit", "bei", "auf", "im", "in", "am", "an",
  "zu", "von", "vom", "fuer", "mehr", "nur", "auch", "noch", "schon", "mein", "meine",
  "sein", "seine", "er", "sie", "es", "ich", "wir", "ihr", "man", "benutzer", "user",
  "kollege", "kollegin", "mal", "immer", "wieder", "seit", "heute", "kann", "koennen",
  "will", "wird", "werden", "wie", "was", "wo", "wenn", "dass", "so", "da", "dann",
  "bitte", "hallo", "problem", "probleme", "funktioniert", "klappt", "mehr", "sich",
  "beim", "zum", "zur", "ueber", "nach", "vor", "aus", "als", "um", "alle", "alles",
  "ab", "total", "ganz", "gar", "staendig", "dauernd", "einfach", "irgendwie",
  "komme", "kommt", "kommen", "rein", "raus", "mehr", "sich", "bleibt", "mich", "mir",
  "einrichten", "richte", "eingerichtet", "einstellen", "brauche", "braucht", "soll", "sollen",
]);
