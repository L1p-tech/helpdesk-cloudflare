/**
 * Standardbibliothek: Kategorien, Antwortvorlagen und Windows-Befehle, mit denen
 * eine frische Installation vorbefuellt wird.
 *
 * Diese Daten sind bewusst Code und nicht nur SQL-Migration: Die Migrationen
 * koennen nur dann seeden, wenn zum Migrationszeitpunkt bereits ein Admin
 * existiert. Beim ersten Setup ist das nicht der Fall, deshalb spielt
 * ensureDefaultLibrary() in src/library.ts dieselben Daten nachtraeglich ein.
 *
 * Aenderungen hier wirken nur auf noch nicht vorhandene Eintraege -- der Seed
 * ueberschreibt niemals bestehende Vorlagen (Abgleich ueber Titel bzw. Befehl).
 */

export interface DefaultCategorySeed {
  slug: string;
  name: string;
  color: string;
}

export interface DefaultTemplateSeed {
  categorySlug: string;
  title: string;
  body: string;
}

export interface DefaultCommandSeed {
  category: string;
  name: string;
  command: string;
  description: string;
  shell: "cmd" | "powershell" | "windows";
  requiresAdmin: 0 | 1;
  riskLevel: "low" | "medium" | "high";
  remoteCapable: 0 | 1;
  restartRequired: 0 | 1;
}

export const DEFAULT_CATEGORY_SEEDS: DefaultCategorySeed[] = [
  { slug: "allgemein", name: "Allgemein", color: "#6b7084" },
  { slug: "passwort", name: "Passwort", color: "#4a7cff" },
  { slug: "drucker", name: "Drucker", color: "#d89b36" },
  { slug: "software", name: "Software", color: "#2ea86e" },
  { slug: "vpn", name: "VPN", color: "#b36ae2" },
  { slug: "hardware", name: "Hardware", color: "#d55f5f" },
  { slug: "netzwerk", name: "Netzwerk", color: "#42a7c6" },
  { slug: "berechtigungen", name: "Berechtigungen", color: "#5b8def" },
  { slug: "mobilfunk", name: "Mobilfunk", color: "#1f9d8b" },
  { slug: "e-mail", name: "E-Mail", color: "#d97706" },
  { slug: "mfa", name: "MFA", color: "#8b5cf6" },
  { slug: "fachanwendungen", name: "Fachanwendungen", color: "#c05621" },
];

export const DEFAULT_TEMPLATE_SEEDS: DefaultTemplateSeed[] = [
  {
    categorySlug: "passwort",
    title: "Passwort zurückgesetzt",
    body: `Hallo [USERNAME],

Ihr Passwort wurde erfolgreich zurückgesetzt.

Bitte melden Sie sich mit dem temporären Passwort an und vergeben Sie umgehend ein neues persönliches Passwort.

Temporäres Passwort: [TEMP-PASSWORT]

Bei weiteren Fragen stehe ich gerne zur Verfügung.

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "passwort",
    title: "Account gesperrt – entsperrt",
    body: `Hallo [USERNAME],

Ihr Benutzerkonto wurde aufgrund mehrfacher Fehlanmeldungen automatisch gesperrt.

Ich habe die Sperre aufgehoben. Sie können sich ab sofort wieder anmelden.

Falls Sie Ihr Passwort vergessen haben, melden Sie sich gerne erneut.

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "drucker",
    title: "Drucker verbunden",
    body: `Hallo [USERNAME],

der Drucker [DRUCKERNAME] wurde auf Ihrem Arbeitsplatz [PC-NAME] erfolgreich eingerichtet.

Sie können ihn ab sofort über die gewohnte Druckfunktion auswählen.

Falls der Drucker nicht in der Liste erscheint, starten Sie bitte einmal Ihren PC neu.

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "drucker",
    title: "Drucker – Papierstau / Fehlermeldung",
    body: `Hallo [USERNAME],

vielen Dank für Ihre Meldung.

Das Problem am Drucker [DRUCKERNAME] wurde behoben. Es handelte sich um [URSACHE].

Der Drucker ist wieder einsatzbereit.

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "software",
    title: "Software installiert",
    body: `Hallo [USERNAME],

die angeforderte Software [SOFTWARE-NAME] wurde auf Ihrem Arbeitsplatz [PC-NAME] installiert.

Sie finden die Anwendung im Startmenü bzw. auf dem Desktop.

Bitte melden Sie sich kurz ab und wieder an, damit alle Berechtigungen übernommen werden.

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "software",
    title: "Software – Genehmigung erforderlich",
    body: `Hallo [USERNAME],

für die Installation von [SOFTWARE-NAME] ist eine Genehmigung durch Ihren Vorgesetzten erforderlich.

Bitte lassen Sie uns die schriftliche Freigabe von [VORGESETZTER] zukommen. Danach nehmen wir die Installation zeitnah vor.

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "vpn",
    title: "VPN-Zugang eingerichtet",
    body: `Hallo [USERNAME],

Ihr VPN-Zugang wurde eingerichtet.

Bitte laden Sie den VPN-Client über [LINK/PFAD] herunter und verbinden Sie sich mit dem Profil [PROFILNAME].

Verwenden Sie zur Anmeldung Ihre regulären Windows-Zugangsdaten.

Anleitung: [LINK ZUR ANLEITUNG]

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "vpn",
    title: "VPN – Verbindungsprobleme",
    body: `Hallo [USERNAME],

bitte prüfen Sie folgende Punkte:
1. Ist die Internetverbindung stabil?
2. Ist der VPN-Client auf dem neuesten Stand?
3. Ist das richtige VPN-Profil ausgewählt?

Falls das Problem weiterhin besteht, benötige ich einen Screenshot der Fehlermeldung sowie die Ausgabe von ipconfig.

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "allgemein",
    title: "Rückfrage – mehr Infos nötig",
    body: `Hallo [USERNAME],

vielen Dank für Ihre Anfrage.

Um Ihr Anliegen bearbeiten zu können, benötige ich noch folgende Informationen:

- [FRAGE 1]
- [FRAGE 2]

Sobald mir diese vorliegen, kümmere ich mich darum.

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "allgemein",
    title: "Ticket gelöst – Abschluss",
    body: `Hallo [USERNAME],

Ihr Anliegen wurde wie besprochen gelöst.

Zusammenfassung: [BESCHREIBUNG DER LÖSUNG]

Sollte das Problem erneut auftreten, können Sie sich jederzeit melden. Ich schließe dieses Ticket hiermit.

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "allgemein",
    title: "Weiterleitung an 3rd Level",
    body: `Hallo [USERNAME],

vielen Dank für Ihre Geduld.

Ich habe Ihr Anliegen an unsere Fachabteilung [TEAM/ABTEILUNG] weitergeleitet, da eine tiefergehende Analyse notwendig ist.

Die Ticketnummer lautet weiterhin [TICKET-NR].

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "hardware",
    title: "Hardware-Tausch durchgeführt",
    body: `Hallo [USERNAME],

der Austausch Ihres [GERÄT] wurde durchgeführt.

Neues Gerät: [MODELL / INVENTARNR]

Bitte prüfen Sie kurz, ob alles einwandfrei funktioniert.

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "hardware",
    title: "Hardware-Bestellung – in Bearbeitung",
    body: `Hallo [USERNAME],

Ihre Anfrage für [GERÄT] wurde aufgenommen und die Bestellung ist in Bearbeitung.

Voraussichtliche Lieferzeit: [ZEITRAUM]

Ich melde mich, sobald das Gerät eingetroffen ist.

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "allgemein",
    title: "Telefonische Rückmeldung erbeten",
    body: `Hallo [USERNAME],

leider konnte ich Sie telefonisch nicht erreichen.

Bitte melden Sie sich bei uns unter der 089 44459333 und lassen Sie sich zu mir durchstellen.

Vielen Dank für Ihre Mithilfe.

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "vpn",
    title: "VPN nach Neustart wieder funktionsfähig",
    body: `Hallo [USERNAME],

bitte starten Sie Ihren PC einmal neu. Bitte wählen Sie dabei "Neu starten" und nicht "Herunterfahren".

Falls der VPN-Anschluss danach weiterhin nicht funktioniert, führen Sie bitte einen zweiten Neustart durch.

Anschließend sollte der VPN-Zugang wieder funktionieren.

Falls das Problem weiterhin besteht, geben Sie uns bitte Bescheid.

Vielen Dank für Ihre Mithilfe.

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "berechtigungen",
    title: "Berechtigung über BBV-App beantragen",
    body: `Hallo [USERNAME],

bitte beantragen Sie die benötigte Berechtigung über die neue BBV-App.

Sie finden die Anwendung im SalesNet.

Vielen Dank für Ihre Mithilfe.

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "software",
    title: "Software über Ivanti bereitgestellt",
    body: `Hallo [USERNAME],

ich habe das Programm für Sie über Ivanti bereitgestellt.

Die Installation erfolgt im Laufe des Tages im Hintergrund.

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "mobilfunk",
    title: "Datenvolumen erhöht",
    body: `Hallo [USERNAME],

Ihr Datenvolumen wurde auf [DATENVOLUMEN] erhöht.

Bei weiteren Fragen erreichen Sie uns gerne unter der 089 44459333.

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "hardware",
    title: "HP-Ticket erstellt",
    body: `Hallo [USERNAME],

bei HP wurde ein Ticket für Sie eröffnet.

Ticketnummer: [HP-TICKETNUMMER]

Ein Techniker von HP wird sich demnächst mit Ihnen in Verbindung setzen.

Bitte hinterlegen Sie im Ticket neue Informationen, Screenshots und den E-Mail-Verkehr mit HP.

Vielen Dank für Ihre Mithilfe.

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "hardware",
    title: "HP-Ticket erstellt – Rückmeldung mit PIN",
    body: `Hallo [USERNAME],

bei HP wurde ein Ticket für Sie eröffnet.

Ticketnummer: [HP-TICKETNUMMER]

Bitte melden Sie sich zeitnah bei HP unter der Telefonnummer [HP-NUMMER] und geben Sie die PIN-ID [HP-PIN-ID] an.

Bitte beachten Sie, dass die Rückmeldung bis spätestens [FRISTDATUM] erfolgen muss, da HP das Ticket sonst schließt.

Bitte hinterlegen Sie im Ticket neue Informationen, Screenshots und den E-Mail-Verkehr mit HP.

Vielen Dank für Ihre Mithilfe.

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "hardware",
    title: "Notebook startet nicht – Hard Reset",
    body: `Hallo [USERNAME],

bitte führen Sie einmal einen Hard Reset am Notebook durch:

1. Stellen Sie sicher, dass das Notebook vollständig ausgeschaltet ist.
2. Entfernen Sie alle angeschlossenen Kabel, einschließlich des Netzkabels.
3. Halten Sie die Einschalttaste und die Taste F6 gleichzeitig etwa 30 Sekunden lang gedrückt.
4. Lassen Sie beide Tasten los. Das Notebook sollte anschließend wieder starten.
5. Danach können Sie alle Kabel wieder anschließen.

Bitte geben Sie im Ticket Bescheid, ob die Meldung danach erneut auftritt.

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "e-mail",
    title: "Postfachberechtigung vergeben",
    body: `Hallo [USERNAME],

ich habe Ihnen die Berechtigung für das Postfach soeben vergeben.

Das Postfach sollte innerhalb weniger Minuten sichtbar sein.

Falls es noch nicht angezeigt wird, starten Sie Outlook bitte einmal neu.

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "mfa",
    title: "Authenticator-Telefonnummer ändern",
    body: `Hallo [USERNAME],

wenn Sie Ihre Telefonnummer im Authenticator oder in den Sicherheitsinformationen ändern möchten, führen Sie bitte die folgenden Schritte aus:

1. Öffnen Sie den folgenden Link:
https://mysignins.microsoft.com/security-info
2. Klicken Sie auf "Anmeldemethode hinzufügen".
3. Wenn bereits eine Telefonnummer hinterlegt ist, wählen Sie stattdessen "Ändern".

Es ist empfehlenswert, mehr als eine Anmeldemethode zu hinterlegen, zum Beispiel Authenticator und Telefonnummer.

Ich freue mich auf Ihre Rückmeldung.

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "fachanwendungen",
    title: "AS400-Passwort zurückgesetzt",
    body: `Hallo [USERNAME],

ich habe Ihr AS400-Passwort zurückgesetzt.

Temporäres Passwort: [TEMP-PASSWORT]

Wenn Sie ein neues Passwort vergeben, beachten Sie bitte die geltenden Kennwortregeln für AS400.

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "fachanwendungen",
    title: "Astro per RemoteApp einrichten",
    body: `Hallo [USERNAME],

für die Nutzung von Astro gehen Sie bitte wie folgt vor:

1. Öffnen Sie "RemoteApp- und Desktopverbindungen". Am schnellsten finden Sie den Eintrag über die Windows-Suche.
2. Klicken Sie auf "Auf RemoteApp und Desktops zugreifen".
3. Verwenden Sie als Verbindungs-URL:
https://HCETERM.ETG-FROESCHL.LOCAL/RDWEB/FEED/
4. Melden Sie sich anschließend mit Ihrer Windows-Kennung an, also mit Ihrer E-Mail-Adresse und Ihrem Windows-Passwort.

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "hardware",
    title: "Neuen PC zur Einrichtung vorbereiten",
    body: `Hallo [USERNAME],

wenn der PC noch nicht in Betrieb war, ist er in der Regel auch noch nicht vollständig eingerichtet.

Bitte lassen Sie den PC zunächst mindestens zwei Stunden per LAN verbunden und führen Sie danach einen Neustart durch.

Anschließend sollte bei der Windows-Anmeldung die Option "Anderer Benutzer" angezeigt werden. Melden Sie sich dort bitte mit Ihrer Windows-Kennung beziehungsweise Ihrer E-Mail-Adresse und Ihrem Windows-Passwort an.

Bitte führen Sie danach noch die folgenden drei Schritte aus:

1. Sicherheitsscan über die Windows-Suche starten
2. Inventarscan über die Windows-Suche starten
3. Windows-Updates ausführen

Sobald diese Punkte erledigt sind, melden Sie sich bitte unter der 089 44459333 und lassen Sie sich zu mir durchstellen. Dann können wir den PC gemeinsam einrichten.

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "berechtigungen",
    title: "Office-Desktop-Lizenz nicht verfügbar",
    body: `Hallo [USERNAME],

das Lizenzmodell wurde geändert. Mitarbeitende in der Logistik können die Office-Desktop-Versionen derzeit leider nicht mehr nutzen.

Bitte verwenden Sie stattdessen die Web-Versionen. Diese finden Sie im SalesNet.

Falls Sie die Desktop-Versionen dennoch benötigen, beantragen Sie die Berechtigung bitte im SalesNet unter "Berechtigungen".

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "fachanwendungen",
    title: "Schletter-Ordnerpfad",
    body: `Hallo [USERNAME],

den Schletter-Ordner finden Sie unter folgendem Pfad:

\\\\rexepm\\Packages\\Boudi\\Scalc3\\2.0

Mit freundlichen Grüßen
[ICH]`,
  },
];

export const DEFAULT_COMMAND_SEEDS: DefaultCommandSeed[] = [
  {
    category: "Netzwerk",
    name: "Netzwerkkonfiguration anzeigen",
    command: "ipconfig /all",
    description: "Zeigt ausführliche Informationen zu Netzwerkadaptern, IP-Adressen, DNS-Servern und Standardgateway.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Netzwerk",
    name: "DNS-Zwischenspeicher leeren",
    command: "ipconfig /flushdns",
    description: "Leert den lokalen DNS-Cache. Hilfreich bei falscher oder veralteter Namensauflösung.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Netzwerk",
    name: "Neue IP-Adresse anfordern",
    command: `ipconfig /release
ipconfig /renew`,
    description: "Gibt die aktuelle DHCP-Adresse frei und fordert anschließend eine neue IP-Adresse an.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "medium",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Gruppenrichtlinien aktualisieren",
    command: "gpupdate /force",
    description: "Lädt Benutzer- und Computerrichtlinien erneut.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Benutzer",
    name: "Angemeldeten Benutzer anzeigen",
    command: "whoami",
    description: "Zeigt das aktuell verwendete Benutzerkonto inklusive Domäne an.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Computername anzeigen",
    command: "hostname",
    description: "Zeigt den Namen des aktuellen Computers an.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Netzwerk",
    name: "Erreichbarkeit prüfen",
    command: "ping [SERVER-ODER-IP]",
    description: "Prüft, ob ein Server oder Gerät über das Netzwerk erreichbar ist.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Netzwerk",
    name: "DNS-Auflösung prüfen",
    command: "nslookup [HOSTNAME]",
    description: "Prüft, welche IP-Adresse ein DNS-Server für einen Hostnamen zurückliefert.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Netzwerk",
    name: "Netzwerkweg prüfen",
    command: "tracert [SERVER-ODER-IP]",
    description: "Zeigt die einzelnen Netzwerkstationen auf dem Weg zum Ziel.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Netzwerk",
    name: "Aktive Verbindungen anzeigen",
    command: "netstat -ano",
    description: "Zeigt aktive Netzwerkverbindungen, Ports und zugehörige Prozess-IDs.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Systeminformationen anzeigen",
    command: "systeminfo",
    description: "Zeigt Betriebssystem, Installationsdatum, Arbeitsspeicher, Hotfixes und weitere Systeminformationen.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Reparatur",
    name: "Windows-Systemdateien prüfen",
    command: "sfc /scannow",
    description: "Prüft geschützte Windows-Systemdateien und versucht beschädigte Dateien zu reparieren.",
    shell: "cmd",
    requiresAdmin: 1,
    riskLevel: "medium",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Reparatur",
    name: "Windows-Abbild reparieren",
    command: "DISM /Online /Cleanup-Image /RestoreHealth",
    description: "Prüft und repariert den Windows-Komponentenspeicher.",
    shell: "cmd",
    requiresAdmin: 1,
    riskLevel: "medium",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Prozesse",
    name: "Aktuelle Prozesse anzeigen",
    command: "tasklist",
    description: "Listet laufende Prozesse mit Prozess-ID und Speicherverbrauch auf.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Prozesse",
    name: "Prozess beenden",
    command: "taskkill /PID [PROZESS-ID] /F",
    description: "Beendet einen Prozess anhand seiner Prozess-ID. Vorsichtig verwenden.",
    shell: "cmd",
    requiresAdmin: 1,
    riskLevel: "high",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Gruppenrichtlinien",
    name: "Gespeicherte Gruppenrichtlinien anzeigen",
    command: "gpresult /r",
    description: "Zeigt, welche Gruppenrichtlinien für Computer und Benutzer angewendet wurden.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Windows-Ereignisanzeige öffnen",
    command: "eventvwr.msc",
    description: "Öffnet die Ereignisanzeige zur Prüfung von System-, Anwendungs- und Sicherheitsmeldungen.",
    shell: "windows",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Geräte-Manager öffnen",
    command: "devmgmt.msc",
    description: "Öffnet den Geräte-Manager, um Hardware und Treiber zu prüfen.",
    shell: "windows",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Diensteverwaltung öffnen",
    command: "services.msc",
    description: "Öffnet die Windows-Diensteverwaltung zum Prüfen, Starten oder Beenden von Diensten.",
    shell: "windows",
    requiresAdmin: 0,
    riskLevel: "medium",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Datenträger",
    name: "Lokale Laufwerke anzeigen",
    command: "Get-CimInstance Win32_LogicalDisk | Select-Object DeviceID, Description, FreeSpace, Size",
    description: "Zeigt Laufwerksbuchstaben, Typ, freien Speicherplatz und Gesamtgröße an.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
];
