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

Bitte dokumentieren Sie den weiteren Verlauf im Ticket: neue Erkenntnisse, Screenshots sowie den E-Mail-Verkehr mit HP.

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

Bitte dokumentieren Sie den weiteren Verlauf im Ticket: neue Erkenntnisse, Screenshots sowie den E-Mail-Verkehr mit HP.

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
5. Schließen Sie danach zuerst das Netzkabel und anschließend die übrigen Kabel wieder an.

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
2. Klicken Sie auf "Anmeldemethode hinzufügen". Ist bereits eine Telefonnummer hinterlegt, wählen Sie stattdessen "Ändern".

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

Anschließend sollte bei der Windows-Anmeldung die Option "Anderer Benutzer" angezeigt werden.

Melden Sie sich dort bitte mit Ihrer Windows-Kennung beziehungsweise Ihrer E-Mail-Adresse und Ihrem Windows-Passwort an.

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
  {
    categorySlug: "passwort",
    title: "Windows-Passwort ändern – Anleitung",
    body: `Hallo [USERNAME],

bitte ändern Sie einmal Ihr Windows-Passwort:

1. Drücken Sie Strg + Alt + Entf und wählen Sie "Kennwort ändern". Vergeben Sie anschließend ein neues Kennwort.
2. Sperren Sie den Rechner danach mit Windows-Taste + L und melden Sie sich mit dem neuen Passwort wieder an.
3. Warten Sie anschließend etwa fünf Minuten und starten Sie den PC neu.

Nach dem Neustart sollte die Anmeldung überall wieder funktionieren.

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "mfa",
    title: "MFA zurückgesetzt",
    body: `Hallo [USERNAME],

die Multi-Faktor-Authentifizierung (MFA) für Ihren Account wurde zurückgesetzt.

Bitte melden Sie sich erneut an und schließen Sie die Einrichtung der MFA ab, indem Sie den Anweisungen auf dem Bildschirm folgen.

Sollte es weiterhin zu Problemen kommen, melden Sie sich gerne bei uns.

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "mfa",
    title: "Global MFA Reset anfordern (intern)",
    body: `Dear Global AD Team,

could you please reset the MFA for the following user:

[E-MAIL-ADRESSE]

Thanks in advance and best regards
[ICH]`,
  },
  {
    categorySlug: "e-mail",
    title: "Postfachzugriff entfernt",
    body: `Hallo [USERNAME],

wir haben den Zugriff auf das entsprechende Postfach entfernt. Die Änderung ist ab sofort wirksam.

Falls dabei Probleme auftreten oder Sie noch Fragen haben, geben Sie uns gerne Bescheid.

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "e-mail",
    title: "Postfach voll – Speicherplatz schaffen",
    body: `Hallo [USERNAME],

Ihr Postfach ist serverseitig voll, weshalb aktuell keine E-Mails bei Ihnen ankommen können.

Bitte versuchen Sie Folgendes, um schnell Platz zu schaffen:

1. Öffnen Sie Outlook und leeren Sie den Ordner "Gelöschte Elemente" (Rechtsklick auf den Ordner, dann "Ordner leeren").
2. Leeren Sie anschließend auch den Ordner "Junk-E-Mail".
3. Löschen Sie große E-Mails mit Anhängen, die Sie nicht mehr benötigen. Tipp: Sortieren Sie Ihren Posteingang nach Größe, um die größten E-Mails schnell zu finden.

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "e-mail",
    title: "E-Mail aus Quarantäne freigegeben",
    body: `Hallo [USERNAME],

ich habe die Information vom Global Service Portal erhalten, dass die E-Mail aus der Quarantäne freigegeben wurde.

Sie sollte in Kürze in Ihrem Postfach eintreffen.

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "e-mail",
    title: "Quarantäne-Freigabe – Angaben erforderlich",
    body: `Hallo [USERNAME],

um Ihre E-Mail aus der Quarantäne freigeben zu können, benötigen wir von Ihnen folgende Informationen:

- Absender-E-Mail-Adresse des betroffenen Senders
- Empfänger-E-Mail-Adresse
- Betreff der E-Mail
- Empfangsdatum der E-Mail
- Details zum Vorgang (zum Beispiel Inhalt oder Kontext der E-Mail)
- Geschäftliche Begründung, warum die E-Mail freigegeben werden soll

Bitte reichen Sie diese Angaben nach, damit wir Ihre Anfrage weiter bearbeiten können.

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "vpn",
    title: "VPN – Windows Updates erforderlich",
    body: `Hallo [USERNAME],

die angezeigte Fehlermeldung weist darauf hin, dass Ihr Gerät die Sicherheitsanforderungen für die VPN-Verbindung aktuell nicht erfüllt. Bitte prüfen Sie, ob alle Windows Updates installiert sind:

1. Klicken Sie auf Start und öffnen Sie die Einstellungen (Zahnrad-Symbol).
2. Gehen Sie auf "Windows Update" (bei Windows 11 direkt im linken Menü).
3. Klicken Sie auf "Nach Updates suchen" und installieren Sie alle verfügbaren Updates.
4. Starten Sie Ihren Rechner anschließend neu und versuchen Sie die VPN-Verbindung erneut.

Sollte das Problem danach weiterhin bestehen, melden Sie sich gerne noch einmal bei uns.

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "software",
    title: "Office-Lizenz zugewiesen",
    body: `Hallo [USERNAME],

für [MITARBEITER] wurde die Office-Lizenz gemäß den hinterlegten Daten zugewiesen. Die Nutzung ist ab sofort möglich.

Die Zugangsdaten und Erstanmeldeinformationen erhalten Sie in einer separaten E-Mail.

Bei Rückfragen stehe ich Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "fachanwendungen",
    title: "indeX-App löst HIS-Profile ab",
    body: `Hallo [USERNAME],

seit einigen Tagen gibt es die neue indeX-App, welche die HIS-Profile ablöst.

Der Zugriff auf die HIS-Datenbank wurde in diesem Zuge eingeschränkt. Weitere Informationen finden Sie in der Ankündigung im Intranet: [LINK]

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "hardware",
    title: "Laptop-Kauf – Preis und Formular",
    body: `Hallo [USERNAME],

der Preis für das Gerät liegt bei [PREIS].

Falls Sie es kaufen möchten, füllen Sie bitte das beigefügte Formular aus und fügen es wieder in das Ticket ein.

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "hardware",
    title: "Formular für Verkauf an Mitarbeiter",
    body: `Hallo [USERNAME],

bitte füllen Sie das beigefügte Formular aus und fügen es wieder in das Ticket ein.

Formular: [FORMULARNAME]

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "allgemein",
    title: "Browser-Cache leeren",
    body: `Hallo [USERNAME],

versuchen Sie bitte einmal, Ihren Browser-Cache zu löschen:

1. Öffnen Sie das Drei-Punkte-Menü oben rechts und wählen Sie "Einstellungen".
2. Wechseln Sie zu "Datenschutz, Suche und Dienste".
3. Klicken Sie im Abschnitt "Browserdaten löschen" auf "Zu löschende Elemente auswählen".
4. Wählen Sie bei "Zeitbereich" die Option "Gesamte Zeit".
5. Setzen Sie den Haken bei "Zwischengespeicherte Bilder und Dateien" und klicken Sie auf "Jetzt löschen".

Starten Sie den Browser anschließend einmal neu und probieren Sie es erneut.

Mit freundlichen Grüßen
[ICH]`,
  },
  {
    categorySlug: "allgemein",
    title: "Ticket wegen Inaktivität geschlossen",
    body: `Hallo [USERNAME],

da wir zu Ihrem Anliegen längere Zeit keine Rückmeldung erhalten haben, schließen wir das Ticket vorerst.

Falls das Problem weiterhin besteht, öffnen Sie das Ticket bitte einfach erneut. Wir kümmern uns dann gerne darum.

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
  {
    category: "Netzwerk",
    name: "IP-Adresse neu beziehen",
    command: "ipconfig /release && ipconfig /renew",
    description: "Gibt die aktuelle IP-Adresse frei und fordert eine neue vom DHCP-Server an. Hilft bei fehlerhafter oder fehlender IP-Konfiguration.",
    shell: "cmd",
    requiresAdmin: 1,
    riskLevel: "medium",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Netzwerk",
    name: "WLAN-Profile anzeigen",
    command: "netsh wlan show profiles",
    description: "Listet alle gespeicherten WLAN-Profile des Rechners auf.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Netzwerk",
    name: "WLAN-Adapter-Bericht erstellen",
    command: "netsh wlan show wlanreport",
    description: "Erstellt einen ausführlichen HTML-Bericht zur WLAN-Verbindungshistorie unter C:\\ProgramData\\Microsoft\\Windows\\WlanReport.",
    shell: "cmd",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Netzwerk",
    name: "Netzwerkstack zurücksetzen",
    command: "netsh winsock reset && netsh int ip reset",
    description: "Setzt Winsock-Katalog und TCP/IP-Stack auf die Standardwerte zurück. Letzte Maßnahme bei hartnäckigen Netzwerkproblemen. Danach ist ein Neustart zwingend erforderlich.",
    shell: "cmd",
    requiresAdmin: 1,
    riskLevel: "high",
    remoteCapable: 0,
    restartRequired: 1,
  },
  {
    category: "Netzwerk",
    name: "Offene Ports eines Prozesses finden",
    command: "netstat -ano | findstr [PORT]",
    description: "Zeigt, welcher Prozess einen bestimmten Port belegt. Die letzte Spalte ist die Prozess-ID.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Netzwerk",
    name: "Port-Erreichbarkeit prüfen",
    command: "Test-NetConnection -ComputerName [SERVER] -Port [PORT]",
    description: "Prüft, ob ein bestimmter Port auf einem Server erreichbar ist. Ersetzt telnet für Verbindungstests.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Netzwerk",
    name: "Netzlaufwerke anzeigen",
    command: "net use",
    description: "Listet alle verbundenen Netzlaufwerke und deren Status auf.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Netzwerk",
    name: "Netzlaufwerk verbinden",
    command: "net use [LAUFWERK]: \\\\[SERVER]\\[FREIGABE] /persistent:yes",
    description: "Verbindet eine Netzwerkfreigabe dauerhaft mit einem Laufwerksbuchstaben, zum Beispiel: net use Z: \\\\server\\daten /persistent:yes",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Netzwerk",
    name: "ARP-Tabelle leeren",
    command: "arp -d *",
    description: "Leert die ARP-Tabelle. Hilfreich, wenn nach einem Gerätetausch noch eine alte MAC-Adresse zwischengespeichert ist.",
    shell: "cmd",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Windows-Aktivierungsstatus prüfen",
    command: "slmgr /xpr",
    description: "Zeigt an, ob und bis wann Windows aktiviert ist.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Windows-Version anzeigen",
    command: "winver",
    description: "Öffnet ein Fenster mit Windows-Version und Build-Nummer.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Installierte Updates anzeigen",
    command: "Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 20",
    description: "Listet die zuletzt installierten Windows-Updates mit Datum auf.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Systemlaufzeit anzeigen",
    command: "net statistics workstation | find \"Statistik seit\"",
    description: "Zeigt, seit wann der Rechner läuft. Nützlich bei der Frage, ob wirklich neu gestartet wurde.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Autostart-Programme anzeigen",
    command: "Get-CimInstance Win32_StartupCommand | Select-Object Name, Command, Location",
    description: "Listet Programme auf, die beim Start automatisch geladen werden. Hilfreich bei langsamem Hochfahren.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Installierte Programme auflisten",
    command: "Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Select-Object DisplayName, DisplayVersion, Publisher | Sort-Object DisplayName",
    description: "Zeigt alle installierten Programme mit Version. Zuverlässiger als die Systemsteuerung.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Energieeinstellungen-Bericht erstellen",
    command: "powercfg /energy",
    description: "Erstellt einen Bericht zu Energieproblemen. Hilfreich, wenn ein Notebook nicht in den Ruhezustand geht oder unerwartet aufwacht.",
    shell: "cmd",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Akkubericht erstellen",
    command: "powercfg /batteryreport",
    description: "Erstellt einen HTML-Bericht zum Akkuzustand eines Notebooks, inklusive Kapazitätsverlust.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Zuletzt aufgewacht durch",
    command: "powercfg /lastwake",
    description: "Zeigt, welches Gerät den Rechner zuletzt aus dem Ruhezustand geholt hat.",
    shell: "cmd",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Windows-Einstellungen öffnen",
    command: "start ms-settings:",
    description: "Öffnet die Windows-Einstellungen direkt. Mit Zusatz auch gezielt, zum Beispiel ms-settings:windowsupdate.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Zwischenablage leeren",
    command: "echo off | clip",
    description: "Leert die Windows-Zwischenablage.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Reparatur",
    name: "Windows Update zurücksetzen",
    command: "net stop wuauserv && net stop bits && ren C:\\Windows\\SoftwareDistribution SoftwareDistribution.old && net start wuauserv && net start bits",
    description: "Setzt den Windows-Update-Zwischenspeicher zurück. Hilft, wenn Updates wiederholt fehlschlagen oder hängen bleiben.",
    shell: "cmd",
    requiresAdmin: 1,
    riskLevel: "high",
    remoteCapable: 0,
    restartRequired: 1,
  },
  {
    category: "Reparatur",
    name: "Datenträger auf Fehler prüfen",
    command: "chkdsk C: /scan",
    description: "Prüft die Systempartition im laufenden Betrieb auf Dateisystemfehler, ohne Neustart.",
    shell: "cmd",
    requiresAdmin: 1,
    riskLevel: "medium",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Reparatur",
    name: "Druckwarteschlange leeren",
    command: "net stop spooler && del /Q /F /S \"%systemroot%\\System32\\spool\\PRINTERS\\*.*\" && net start spooler",
    description: "Stoppt die Druckerwarteschlange, löscht hängende Druckaufträge und startet den Dienst neu. Der Klassiker bei festsitzenden Druckaufträgen.",
    shell: "cmd",
    requiresAdmin: 1,
    riskLevel: "medium",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Reparatur",
    name: "Explorer neu starten",
    command: "taskkill /f /im explorer.exe && start explorer.exe",
    description: "Startet die Windows-Oberfläche neu. Hilft bei eingefrorener Taskleiste oder fehlendem Startmenü.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "medium",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Reparatur",
    name: "Microsoft Store zurücksetzen",
    command: "wsreset.exe",
    description: "Leert den Zwischenspeicher des Microsoft Store, ohne installierte Apps zu entfernen.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Drucker",
    name: "Installierte Drucker anzeigen",
    command: "Get-Printer | Select-Object Name, DriverName, PortName, PrinterStatus",
    description: "Listet alle eingerichteten Drucker mit Treiber, Anschluss und Status auf.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Drucker",
    name: "Druckaufträge anzeigen",
    command: "Get-PrintJob -PrinterName [DRUCKERNAME]",
    description: "Zeigt die aktuellen Druckaufträge eines bestimmten Druckers.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Drucker",
    name: "Netzwerkdrucker verbinden",
    command: "rundll32 printui.dll,PrintUIEntry /in /n \\\\[PRINTSERVER]\\[DRUCKERNAME]",
    description: "Verbindet einen freigegebenen Drucker vom Printserver mit dem Arbeitsplatz.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Benutzer",
    name: "Gruppenmitgliedschaften anzeigen",
    command: "whoami /groups",
    description: "Zeigt alle Gruppen, in denen der angemeldete Benutzer Mitglied ist. Erster Blick bei Berechtigungsproblemen.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Benutzer",
    name: "Anmeldeserver anzeigen",
    command: "echo %LOGONSERVER%",
    description: "Zeigt, an welchem Domänencontroller sich der Rechner angemeldet hat.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Benutzer",
    name: "Kerberos-Tickets anzeigen",
    command: "klist",
    description: "Listet die zwischengespeicherten Kerberos-Tickets auf. Hilfreich bei Single-Sign-On-Problemen.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Benutzer",
    name: "Kerberos-Tickets zurücksetzen",
    command: "klist purge",
    description: "Verwirft alle zwischengespeicherten Kerberos-Tickets. Danach ist eine Neuanmeldung nötig, oft behebt das hartnäckige Zugriffsfehler.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "medium",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Benutzer",
    name: "Gespeicherte Zugangsdaten anzeigen",
    command: "cmdkey /list",
    description: "Listet die im Windows-Anmeldeinformationsspeicher hinterlegten Zugangsdaten auf. Häufige Ursache für wiederkehrende Anmeldefenster.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Benutzer",
    name: "Domänenverbindung prüfen",
    command: "Test-ComputerSecureChannel -Verbose",
    description: "Prüft, ob die Vertrauensstellung des Rechners zur Domäne intakt ist. Bei \"False\" ist die Domänenanbindung defekt.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Datenträger",
    name: "Speicherplatz aller Laufwerke",
    command: "Get-PSDrive -PSProvider FileSystem | Select-Object Name, @{n='Frei(GB)';e={[math]::Round($_.Free/1GB,1)}}, @{n='Belegt(GB)';e={[math]::Round($_.Used/1GB,1)}}",
    description: "Zeigt freien und belegten Speicherplatz aller Laufwerke übersichtlich in Gigabyte.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Datenträger",
    name: "Große Dateien finden",
    command: "Get-ChildItem C:\\ -Recurse -ErrorAction SilentlyContinue | Sort-Object Length -Descending | Select-Object -First 20 FullName, @{n='GB';e={[math]::Round($_.Length/1GB,2)}}",
    description: "Findet die 20 größten Dateien auf dem Laufwerk C. Hilfreich, wenn die Festplatte volläuft.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Datenträger",
    name: "Datenträgerbereinigung öffnen",
    command: "cleanmgr",
    description: "Öffnet die Windows-Datenträgerbereinigung zum Freigeben von Speicherplatz.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Hardware",
    name: "Seriennummer auslesen",
    command: "Get-CimInstance Win32_BIOS | Select-Object SerialNumber, Manufacturer, SMBIOSBIOSVersion",
    description: "Zeigt Seriennummer, Hersteller und BIOS-Version. Wird für Garantiefälle und HP-Tickets benötigt.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Hardware",
    name: "Modell und Hersteller anzeigen",
    command: "Get-CimInstance Win32_ComputerSystem | Select-Object Manufacturer, Model, TotalPhysicalMemory",
    description: "Zeigt Hersteller, Modellbezeichnung und Arbeitsspeicher des Geräts.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Hardware",
    name: "Monitore anzeigen",
    command: "Get-CimInstance WmiMonitorID -Namespace root\\wmi | ForEach-Object { ($_.UserFriendlyName -ne 0 | ForEach-Object {[char]$_}) -join '' }",
    description: "Listet die angeschlossenen Monitore mit Modellbezeichnung auf.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Prozesse",
    name: "Speicherfresser finden",
    command: "Get-Process | Sort-Object WorkingSet -Descending | Select-Object -First 15 Name, Id, @{n='RAM(MB)';e={[math]::Round($_.WorkingSet/1MB)}}",
    description: "Zeigt die 15 Prozesse mit dem höchsten Arbeitsspeicherverbrauch.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Dienste",
    name: "Dienststatus prüfen",
    command: "Get-Service [DIENSTNAME] | Select-Object Name, Status, StartType",
    description: "Zeigt Status und Starttyp eines Windows-Dienstes.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Dienste",
    name: "Dienst neu starten",
    command: "Restart-Service [DIENSTNAME] -Force",
    description: "Startet einen Windows-Dienst neu. Vorsicht bei Diensten, von denen andere abhängen.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "medium",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Ereignisse",
    name: "Systemfehler der letzten 24 Stunden",
    command: "Get-WinEvent -FilterHashtable @{LogName='System'; Level=1,2; StartTime=(Get-Date).AddDays(-1)} | Select-Object TimeCreated, Id, ProviderName, Message -First 30",
    description: "Zeigt kritische Fehler und Warnungen aus dem Systemprotokoll des letzten Tages.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Ereignisse",
    name: "Unerwartete Neustarts finden",
    command: "Get-WinEvent -FilterHashtable @{LogName='System'; Id=6008,41,1074} -MaxEvents 20 | Select-Object TimeCreated, Id, Message",
    description: "Findet Einträge zu unsauberen Herunterfahrvorgängen und Abstürzen. Klärt die Frage, warum ein Rechner neu gestartet ist.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Remote",
    name: "Remotedesktop-Sitzungen anzeigen",
    command: "query session /server:[SERVER]",
    description: "Zeigt die aktiven und getrennten Remotedesktop-Sitzungen eines Servers.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Remote",
    name: "Remoteunterstützung starten",
    command: "msra /offerra",
    description: "Startet die Windows-Remoteunterstützung, um sich auf den Rechner eines Benutzers aufzuschalten.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },

  // ---- Erweiterung: Active Directory, Sicherheit, Microsoft 365, Dateien, Remote u. a. ----
  {
    category: "Active Directory",
    name: "Benutzerkonto im Active Directory anzeigen",
    command: "Get-ADUser [BENUTZERNAME] -Properties LockedOut, PasswordExpired, PasswordLastSet, LastLogonDate | Select-Object Name, Enabled, LockedOut, PasswordExpired, PasswordLastSet, LastLogonDate",
    description: "Zeigt, ob ein Konto aktiv oder gesperrt ist, ob das Passwort abgelaufen ist und wann es zuletzt geändert wurde. Braucht das AD-Modul (RSAT).",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Active Directory",
    name: "Gesperrte Konten finden",
    command: "Search-ADAccount -LockedOut | Select-Object Name, SamAccountName, LastLogonDate",
    description: "Listet alle aktuell gesperrten Benutzerkonten. Zeigt auch, ob eine Sperre viele Benutzer betrifft.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Active Directory",
    name: "Konto entsperren",
    command: "Unlock-ADAccount -Identity [BENUTZERNAME]",
    description: "Hebt die Sperre eines Benutzerkontos auf. Vorher die Identität prüfen. Wird das Konto sofort wieder gesperrt, die Sperrquelle suchen.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "medium",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Active Directory",
    name: "Sperrquelle eines Kontos finden",
    command: "Get-WinEvent -ComputerName [DOMÄNENCONTROLLER] -FilterHashtable @{LogName='Security'; Id=4740} -MaxEvents 200 | Where-Object { $_.Properties[0].Value -eq '[BENUTZERNAME]' } | Select-Object TimeCreated, @{n='Gesperrt von Rechner';e={$_.Properties[1].Value}}",
    description: "Zeigt, von welchem Rechner die Sperrungen eines Kontos ausgingen, zum Beispiel ein altes Handy oder ein gespeichertes Laufwerk. Muss gegen einen Domänencontroller laufen.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Active Directory",
    name: "Passwortablauf eines Benutzers anzeigen",
    command: "Get-ADUser [BENUTZERNAME] -Properties msDS-UserPasswordExpiryTimeComputed | Select-Object Name, @{n='Passwort läuft ab';e={[DateTime]::FromFileTime($_.'msDS-UserPasswordExpiryTimeComputed')}}",
    description: "Zeigt, wann das Passwort eines Benutzers abläuft.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Active Directory",
    name: "AD-Gruppen eines Benutzers anzeigen",
    command: "Get-ADPrincipalGroupMembership [BENUTZERNAME] | Sort-Object Name | Select-Object Name",
    description: "Listet alle Gruppen, in denen ein Benutzer laut Active Directory Mitglied ist. Hilft bei „Zugriff verweigert“.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Active Directory",
    name: "Mitglieder einer Gruppe anzeigen",
    command: "Get-ADGroupMember \"[GRUPPE]\" | Select-Object Name, SamAccountName, objectClass",
    description: "Zeigt, wer zu einer Gruppe gehört, also wer Zugriff auf eine Ressource hat.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Active Directory",
    name: "Rechnerkonto in der Domäne anzeigen",
    command: "Get-ADComputer [PC-NAME] -Properties OperatingSystem, LastLogonDate | Select-Object Name, Enabled, OperatingSystem, LastLogonDate",
    description: "Zeigt das Computerkonto eines Rechners: aktiv, Betriebssystem und letzte Anmeldung an der Domäne.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Active Directory",
    name: "Vertrauensstellung reparieren",
    command: "Test-ComputerSecureChannel -Repair -Credential [DOMÄNE]\\[ADMINKONTO]",
    description: "Repariert die Vertrauensstellung zwischen Rechner und Domäne („Vertrauensstellung konnte nicht hergestellt werden“). Auf dem betroffenen Rechner mit lokalem Administrator ausführen, danach neu starten.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "medium",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Active Directory",
    name: "Domänencontroller der Domäne anzeigen",
    command: "nltest /dsgetdc:[DOMÄNE]",
    description: "Zeigt, welcher Domänencontroller antwortet. Hilft zu klären, ob der Rechner die Domäne erreicht.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Benutzer",
    name: "Eigenes Domänenkonto anzeigen",
    command: "net user %USERNAME% /domain",
    description: "Zeigt Kontostatus, letzte Passwortänderung, Ablaufdatum des Passworts und Gruppen des angemeldeten Benutzers. Kommt ohne AD-Modul aus.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Benutzer",
    name: "Domänenkonto eines Benutzers anzeigen",
    command: "net user [BENUTZERNAME] /domain",
    description: "Zeigt Kontostatus, Passwortablauf und Gruppen eines beliebigen Domänenbenutzers. Kommt ohne AD-Modul aus.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Benutzer",
    name: "Passwortrichtlinie der Domäne anzeigen",
    command: "net accounts /domain",
    description: "Zeigt Mindestlänge, Gültigkeitsdauer und Sperrregeln für Passwörter in der Domäne.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Benutzer",
    name: "Gespeicherte Zugangsdaten löschen",
    command: "cmdkey /delete:[ZIELNAME]",
    description: "Entfernt einen gespeicherten Windows-Zugangsdateneintrag. Den Zielnamen vorher mit „Gespeicherte Zugangsdaten anzeigen“ ermitteln. Hilft nach einer Passwortänderung.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "medium",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Benutzer",
    name: "Anmeldeinformationsverwaltung öffnen",
    command: "control /name Microsoft.CredentialManager",
    description: "Öffnet die Windows-Anmeldeinformationsverwaltung zum Ansehen und Löschen gespeicherter Passwörter.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Benutzer",
    name: "Lokale Benutzer anzeigen",
    command: "Get-LocalUser | Select-Object Name, Enabled, LastLogon",
    description: "Listet die lokalen Benutzerkonten eines Rechners mit Status und letzter Anmeldung.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Benutzer",
    name: "Lokale Administratoren anzeigen",
    command: "Get-LocalGroupMember -SID S-1-5-32-544 | Select-Object Name, ObjectClass",
    description: "Zeigt, wer lokaler Administrator auf diesem Rechner ist. Die Gruppe wird über ihre feste Kennung angesprochen und funktioniert daher in jeder Windows-Sprache.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Benutzer",
    name: "Angemeldete Benutzer am Rechner anzeigen",
    command: "query user",
    description: "Zeigt alle Benutzer mit aktiver oder getrennter Sitzung auf diesem Rechner, samt Sitzungs-ID und Anmeldezeit.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Benutzer",
    name: "Benutzerprofile anzeigen",
    command: "Get-CimInstance Win32_UserProfile | Where-Object { -not $_.Special } | Select-Object LocalPath, LastUseTime",
    description: "Listet die auf dem Rechner vorhandenen Benutzerprofile. Hilft bei temporären oder beschädigten Profilen.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Sicherheit",
    name: "BitLocker-Status anzeigen",
    command: "manage-bde -status",
    description: "Zeigt, ob die Laufwerke verschlüsselt sind und ob der Schutz aktiv ist.",
    shell: "cmd",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Sicherheit",
    name: "BitLocker-Schlüssel-ID anzeigen",
    command: "Get-BitLockerVolume -MountPoint C: | Select-Object -ExpandProperty KeyProtector | Select-Object KeyProtectorType, KeyProtectorId",
    description: "Zeigt die Schutzmechanismen von Laufwerk C: mit ihrer ID. Mit der Schlüssel-ID wird der Wiederherstellungsschlüssel im Verzeichnis gesucht. Der Schlüssel selbst wird bewusst nicht angezeigt – er gehört nie in Ticket, Mail oder Chat.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Sicherheit",
    name: "TPM-Status anzeigen",
    command: "Get-Tpm | Select-Object TpmPresent, TpmReady, TpmEnabled, ManufacturerVersion",
    description: "Zeigt, ob das Sicherheitsmodul (TPM) vorhanden und einsatzbereit ist. Wichtig für BitLocker und Windows Hello.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Sicherheit",
    name: "Defender-Status anzeigen",
    command: "Get-MpComputerStatus | Select-Object AMServiceEnabled, RealTimeProtectionEnabled, AntivirusSignatureLastUpdated, QuickScanEndTime, FullScanEndTime",
    description: "Zeigt, ob Microsoft Defender aktiv ist, wie aktuell die Virensignaturen sind und wann zuletzt gescannt wurde.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Sicherheit",
    name: "Defender-Schnellscan starten",
    command: "Start-MpScan -ScanType QuickScan",
    description: "Startet einen schnellen Virenscan mit Microsoft Defender.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Sicherheit",
    name: "Defender-Signaturen aktualisieren",
    command: "Update-MpSignature",
    description: "Lädt die neuesten Virensignaturen für Microsoft Defender.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Sicherheit",
    name: "Defender-Funde anzeigen",
    command: "Get-MpThreatDetection | Select-Object InitialDetectionTime, ThreatID, ProcessName, Resources",
    description: "Listet, was Microsoft Defender zuletzt erkannt hat, samt Zeitpunkt und betroffener Datei.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Sicherheit",
    name: "Firewall-Status anzeigen",
    command: "Get-NetFirewallProfile | Select-Object Name, Enabled, DefaultInboundAction",
    description: "Zeigt, ob die Windows-Firewall für Domäne, privates und öffentliches Netz aktiv ist.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Sicherheit",
    name: "Aktive Netzwerkverbindungen mit Prozess anzeigen",
    command: "Get-NetTCPConnection -State Established | Select-Object LocalPort, RemoteAddress, RemotePort, @{n='Prozess';e={(Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).ProcessName}} | Sort-Object RemoteAddress",
    description: "Zeigt, welches Programm mit welcher Gegenstelle verbunden ist. Hilft, verdächtige Verbindungen zu erkennen.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Sicherheit",
    name: "Datei-Hash berechnen",
    command: "Get-FileHash \"[PFAD]\" -Algorithm SHA256",
    description: "Berechnet die Prüfsumme einer Datei. Damit lässt sich eine verdächtige Datei eindeutig melden oder prüfen.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Sicherheit",
    name: "Zertifikate des Benutzers öffnen",
    command: "certmgr.msc",
    description: "Öffnet die Zertifikatsverwaltung des angemeldeten Benutzers. Nur ansehen: Ein gelöschtes Zertifikat kann VPN oder WLAN unbrauchbar machen.",
    shell: "windows",
    requiresAdmin: 0,
    riskLevel: "medium",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Sicherheit",
    name: "Zertifikate des Computers öffnen",
    command: "certlm.msc",
    description: "Öffnet die Zertifikatsverwaltung des Computers, zum Beispiel um das Firmen-Stammzertifikat zu prüfen. Nur ansehen: Ein gelöschtes Zertifikat kann VPN oder WLAN unbrauchbar machen.",
    shell: "windows",
    requiresAdmin: 1,
    riskLevel: "medium",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Sicherheit",
    name: "Internetoptionen öffnen",
    command: "inetcpl.cpl",
    description: "Öffnet die Internetoptionen mit Proxy-Einstellungen, Zertifikaten und Sicherheitszonen.",
    shell: "windows",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Sicherheit",
    name: "Proxy-Einstellungen des Systems anzeigen",
    command: "netsh winhttp show proxy",
    description: "Zeigt den systemweiten Proxy. Ein falscher Eintrag ist eine häufige Ursache für „kein Internet“ trotz Verbindung.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Sicherheit",
    name: "Proxy-Einstellungen des Benutzers anzeigen",
    command: "Get-ItemProperty \"HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings\" | Select-Object ProxyEnable, ProxyServer, AutoConfigURL",
    description: "Zeigt den Proxy des angemeldeten Benutzers, den Browser und viele Programme verwenden.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Sicherheit",
    name: "Zeitdienst-Status anzeigen",
    command: "w32tm /query /status",
    description: "Zeigt, von wem der Rechner seine Uhrzeit bezieht und wann zuletzt synchronisiert wurde.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Sicherheit",
    name: "Zeitabweichung zur Domäne prüfen",
    command: "w32tm /stripchart /computer:[DOMÄNENCONTROLLER] /samples:3 /dataonly",
    description: "Misst die Abweichung der Rechneruhr zum Domänencontroller. Über etwa fünf Minuten scheitert die Anmeldung per Kerberos.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Sicherheit",
    name: "Zeit neu synchronisieren",
    command: "w32tm /resync",
    description: "Gleicht die Uhrzeit sofort mit der Zeitquelle ab.",
    shell: "cmd",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Netzwerk",
    name: "Netzwerkadapter anzeigen",
    command: "Get-NetAdapter | Select-Object Name, Status, LinkSpeed, MacAddress",
    description: "Listet alle Netzwerkadapter mit Status und Geschwindigkeit. Zeigt, ob Kabel oder WLAN verbunden sind.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Netzwerk",
    name: "Netzwerkadapter neu starten",
    command: "Restart-NetAdapter -Name \"[ADAPTERNAME]\"",
    description: "Schaltet einen Netzwerkadapter aus und wieder ein. Den Namen (zum Beispiel „WLAN“ oder „Ethernet“) mit „Netzwerkadapter anzeigen“ ermitteln. Die Verbindung bricht kurz ab – per Fernzugriff nicht ausführen.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "medium",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Netzwerk",
    name: "IP-Konfiguration kompakt anzeigen",
    command: "Get-NetIPConfiguration",
    description: "Zeigt je Adapter IP-Adresse, Gateway und DNS-Server übersichtlich auf wenigen Zeilen.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Netzwerk",
    name: "Standardgateway anzeigen",
    command: "Get-NetRoute -DestinationPrefix 0.0.0.0/0 | Select-Object InterfaceAlias, NextHop, RouteMetric",
    description: "Zeigt, über welchen Adapter und welches Gateway der Rechner ins Netz geht. Mit aktivem VPN erkennt man, ob der Verkehr durch den Tunnel läuft.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Netzwerk",
    name: "DNS-Server anzeigen",
    command: "Get-DnsClientServerAddress -AddressFamily IPv4 | Select-Object InterfaceAlias, ServerAddresses",
    description: "Zeigt, welche DNS-Server jeder Adapter verwendet.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Netzwerk",
    name: "DNS-Auflösung mit PowerShell prüfen",
    command: "Resolve-DnsName [HOSTNAME]",
    description: "Fragt die Adresse zu einem Namen ab und zeigt auch alternative Einträge wie CNAME.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Netzwerk",
    name: "DNS-Zwischenspeicher anzeigen",
    command: "ipconfig /displaydns",
    description: "Zeigt die zwischengespeicherten Namensauflösungen. Hilft, veraltete Einträge zu finden.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Netzwerk",
    name: "Routing-Tabelle anzeigen",
    command: "route print",
    description: "Zeigt, über welche Wege der Rechner welche Netze erreicht. Nützlich bei VPN-Problemen und doppelten Adressbereichen.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Netzwerk",
    name: "Verbindungsqualität prüfen",
    command: "pathping -n [SERVER-ODER-IP]",
    description: "Misst auf jedem Teilstück des Weges Paketverluste und Laufzeit. Dauert etwa fünf Minuten, zeigt aber, wo die Verbindung schlecht ist.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Netzwerk",
    name: "Dauerhaft pingen",
    command: "ping -t [SERVER-ODER-IP]",
    description: "Pingt ununterbrochen, bis man mit Strg+C abbricht. Gut, um Verbindungsabbrüche zu beobachten.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Netzwerk",
    name: "MAC-Adresse anzeigen",
    command: "getmac /v",
    description: "Zeigt die MAC-Adressen aller Netzwerkadapter, zum Beispiel für die Freischaltung im WLAN oder Netzwerk.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Netzwerk",
    name: "Aktuelles WLAN anzeigen",
    command: "netsh wlan show interfaces",
    description: "Zeigt mit welchem WLAN der Rechner verbunden ist, samt Signalstärke, Kanal und Verbindungsstandard.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Netzwerk",
    name: "Verfügbare WLAN-Netze anzeigen",
    command: "netsh wlan show networks mode=bssid",
    description: "Listet alle empfangenen WLAN-Netze mit Signalstärke. Zeigt, ob das gesuchte Netz überhaupt ankommt.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Netzwerk",
    name: "WLAN-Profil löschen",
    command: "netsh wlan delete profile name=\"[WLAN-NAME]\"",
    description: "Entfernt ein gespeichertes WLAN-Profil. Hilft, wenn sich der Rechner nach einer Passwort- oder Zertifikatsänderung nicht mehr verbindet. Das WLAN-Kennwort muss bekannt sein, sonst kommt der Benutzer nicht wieder ins Netz.",
    shell: "cmd",
    requiresAdmin: 1,
    riskLevel: "medium",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Netzwerk",
    name: "Hosts-Datei anzeigen",
    command: "Get-Content C:\\Windows\\System32\\drivers\\etc\\hosts",
    description: "Zeigt die lokale Namenszuordnung. Einträge hier überstimmen DNS – eine häufige Ursache, wenn nur eine Seite oder ein Server nicht erreichbar ist.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Netzwerk",
    name: "Netzwerkeinstellungen öffnen",
    command: "start ms-settings:network-status",
    description: "Öffnet die Windows-Netzwerkeinstellungen.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "VPN",
    name: "VPN-Verbindungen anzeigen",
    command: "Get-VpnConnection | Select-Object Name, ServerAddress, ConnectionStatus",
    description: "Zeigt die in Windows eingerichteten VPN-Verbindungen und ihren Status. Gilt für die Windows-eigene Funktion; Hersteller-Clients haben eigene Oberflächen.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "VPN",
    name: "VPN-Verbindung trennen",
    command: "rasdial [VPN-NAME] /disconnect",
    description: "Trennt eine Windows-VPN-Verbindung. Danach neu verbinden – löst hängende Tunnel.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "medium",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Drucker",
    name: "Druckerports anzeigen",
    command: "Get-PrinterPort | Select-Object Name, PrinterHostAddress",
    description: "Zeigt, über welche Adresse ein Drucker angesprochen wird. Passt sie nicht mehr, erreicht der Drucker den Rechner nicht.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Drucker",
    name: "Druckertreiber anzeigen",
    command: "Get-PrinterDriver | Select-Object Name, Manufacturer",
    description: "Listet die installierten Druckertreiber.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Drucker",
    name: "Standarddrucker anzeigen",
    command: "Get-CimInstance Win32_Printer | Where-Object Default | Select-Object Name",
    description: "Zeigt, welcher Drucker als Standard eingestellt ist.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Drucker",
    name: "Standarddrucker setzen",
    command: "(New-Object -ComObject WScript.Network).SetDefaultPrinter('\\\\[PRINTSERVER]\\[DRUCKERNAME]')",
    description: "Macht einen Netzwerkdrucker zum Standarddrucker des angemeldeten Benutzers.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Drucker",
    name: "Drucker entfernen",
    command: "Remove-Printer -Name \"[DRUCKERNAME]\"",
    description: "Entfernt einen Drucker vom Rechner. Danach lässt er sich mit „Netzwerkdrucker verbinden“ neu einrichten.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "medium",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Drucker",
    name: "Druckauftrag löschen",
    command: "Remove-PrintJob -PrinterName \"[DRUCKERNAME]\" -ID [AUFTRAGS-ID]",
    description: "Löscht einen einzelnen hängenden Druckauftrag. Die ID liefert „Druckaufträge anzeigen“.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "medium",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Drucker",
    name: "Druckspooler-Dienst neu starten",
    command: "Restart-Service Spooler",
    description: "Startet den Druckwarteschlangen-Dienst neu. Löst hängende Druckaufträge, ohne die Warteschlange von Hand zu leeren.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "medium",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Drucker",
    name: "Testseite drucken",
    command: "rundll32 printui.dll,PrintUIEntry /k /n \"[DRUCKERNAME]\"",
    description: "Druckt eine Windows-Testseite. Klappt sie, liegt das Problem am Programm, nicht am Drucker.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Hochfahrzeit anzeigen",
    command: "(Get-CimInstance Win32_OperatingSystem).LastBootUpTime",
    description: "Zeigt, wann der Rechner zuletzt gestartet wurde. Wer wochenlang nicht neu gestartet hat, hat oft deshalb Probleme.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Windows-Version und Build anzeigen",
    command: "Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, OsBuildNumber",
    description: "Zeigt Windows-Edition, Version und Build. Gut für Tickets und zur Prüfung, ob ein Update fehlt.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Windows-Lizenzstatus ausführlich anzeigen",
    command: "slmgr /dli",
    description: "Zeigt Lizenzart, Teil des Produktschlüssels und Aktivierungsstatus.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Windows-Update-Dienste prüfen",
    command: "Get-Service wuauserv, bits, cryptsvc | Select-Object Name, Status, StartType",
    description: "Zeigt, ob die Dienste laufen, die Windows Update braucht.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Windows-Update-Fehler anzeigen",
    command: "Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-WindowsUpdateClient'; Level=2,3} -MaxEvents 20 | Select-Object TimeCreated, Message",
    description: "Listet die letzten Fehler und Warnungen von Windows Update mit Fehlercode.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Windows-Update-Protokoll erzeugen",
    command: "Get-WindowsUpdateLog",
    description: "Erzeugt eine lesbare Protokolldatei des Windows-Updates auf dem Desktop.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Fehlerhafte Geräte anzeigen",
    command: "Get-PnpDevice -PresentOnly | Where-Object Status -ne 'OK' | Select-Object FriendlyName, Class, Status",
    description: "Listet Geräte mit Treiberproblem – das, was im Geräte-Manager ein gelbes Warnzeichen hat.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "USB-Geräte anzeigen",
    command: "Get-PnpDevice -Class USB -PresentOnly | Select-Object FriendlyName, Status",
    description: "Zeigt die erkannten USB-Geräte und Anschlüsse. Hilft, wenn Stick, Maus oder Dockingstation nicht erkannt werden.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Arbeitsspeicher prüfen",
    command: "mdsched.exe",
    description: "Öffnet die Windows-Speicherdiagnose. Sie fragt, ob jetzt oder beim nächsten Start geprüft wird: „Beim nächsten Start“ wählen, solange der Benutzer noch arbeitet – „Jetzt neu starten“ schließt alles. Die Prüfung dauert einige Minuten.",
    shell: "windows",
    requiresAdmin: 1,
    riskLevel: "medium",
    remoteCapable: 0,
    restartRequired: 1,
  },
  {
    category: "Windows",
    name: "Zuverlässigkeitsverlauf öffnen",
    command: "perfmon /rel",
    description: "Öffnet die Übersicht der Abstürze und Fehler der letzten Wochen auf einer Zeitleiste. Zeigt, ab wann Probleme auftraten.",
    shell: "windows",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Systeminformationen grafisch öffnen",
    command: "msinfo32",
    description: "Öffnet die ausführliche Systemübersicht mit Hardware, Treibern und Umgebung.",
    shell: "windows",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Grafik-Diagnose öffnen",
    command: "dxdiag",
    description: "Öffnet das DirectX-Diagnosetool mit Grafikkarte, Treiber und Bildschirmen.",
    shell: "windows",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Task-Manager öffnen",
    command: "taskmgr",
    description: "Öffnet den Task-Manager mit Prozessen, Auslastung und Autostart.",
    shell: "windows",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Geplante Aufgaben anzeigen",
    command: "Get-ScheduledTask | Where-Object State -ne 'Disabled' | Select-Object TaskName, TaskPath, State",
    description: "Listet die aktiven geplanten Aufgaben. Hilft, wenn etwas zu bestimmten Zeiten den Rechner bremst.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Systemwiederherstellungspunkte anzeigen",
    command: "Get-ComputerRestorePoint",
    description: "Listet vorhandene Wiederherstellungspunkte, zum Beispiel vor einem Update.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Windows Installer neu registrieren",
    command: "msiexec /unregister && msiexec /regserver",
    description: "Registriert den Windows Installer neu. Hilft, wenn Installationen mit Installer-Fehlern abbrechen.",
    shell: "cmd",
    requiresAdmin: 1,
    riskLevel: "medium",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Windows-Update-Einstellungen öffnen",
    command: "start ms-settings:windowsupdate",
    description: "Öffnet Windows Update in den Einstellungen.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Apps und Features öffnen",
    command: "start ms-settings:appsfeatures",
    description: "Öffnet die Liste der installierten Apps, um Programme zu reparieren oder zurückzusetzen.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Anzeige-Einstellungen öffnen",
    command: "start ms-settings:display",
    description: "Öffnet Bildschirme, Auflösung und Skalierung.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Sound-Einstellungen öffnen",
    command: "start ms-settings:sound",
    description: "Öffnet Ausgabe- und Eingabegeräte, Lautstärke und Pegel.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Mikrofon-Datenschutz öffnen",
    command: "start ms-settings:privacy-microphone",
    description: "Öffnet die Einstellung, welche Apps das Mikrofon nutzen dürfen. Häufige Ursache, wenn in Teams niemand zu hören ist.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Kamera-Datenschutz öffnen",
    command: "start ms-settings:privacy-webcam",
    description: "Öffnet die Einstellung, welche Apps die Kamera nutzen dürfen.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Anmeldeoptionen öffnen",
    command: "start ms-settings:signinoptions",
    description: "Öffnet PIN, Fingerabdruck und Passwort für die Windows-Anmeldung.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Bluetooth-Einstellungen öffnen",
    command: "start ms-settings:bluetooth",
    description: "Öffnet Bluetooth-Geräte zum Koppeln und Entfernen.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Datum- und Zeiteinstellungen öffnen",
    command: "start ms-settings:dateandtime",
    description: "Öffnet Uhrzeit, Zeitzone und automatische Synchronisierung.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Windows",
    name: "Sprach- und Tastatureinstellungen öffnen",
    command: "start ms-settings:regionlanguage",
    description: "Öffnet Sprachen und Tastaturlayouts. Hilft, wenn die Tastatur falsche Zeichen schreibt.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Hardware",
    name: "Grafikkarte und Auflösung anzeigen",
    command: "Get-CimInstance Win32_VideoController | Select-Object Name, CurrentHorizontalResolution, CurrentVerticalResolution, DriverVersion",
    description: "Zeigt Grafikkarte, aktuelle Auflösung und Treiberversion.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Hardware",
    name: "Audiogeräte anzeigen",
    command: "Get-CimInstance Win32_SoundDevice | Select-Object Name, Status",
    description: "Listet die erkannten Audiogeräte (Lautsprecher, Mikrofon, Headset).",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Hardware",
    name: "Kameras anzeigen",
    command: "Get-PnpDevice -Class Camera, Image -PresentOnly | Select-Object FriendlyName, Status",
    description: "Zeigt die erkannten Kameras und ob sie ohne Fehler arbeiten.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Hardware",
    name: "Bluetooth-Geräte anzeigen",
    command: "Get-PnpDevice -Class Bluetooth -PresentOnly | Select-Object FriendlyName, Status",
    description: "Zeigt Bluetooth-Adapter und gekoppelte Geräte.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Hardware",
    name: "Treiberversion eines Geräts anzeigen",
    command: "Get-CimInstance Win32_PnPSignedDriver | Where-Object DeviceName -like \"*[GERÄTENAME]*\" | Select-Object DeviceName, DriverVersion, DriverDate",
    description: "Zeigt Version und Datum des Treibers eines Geräts, zum Beispiel „WLAN“ oder „Intel“. Zeigt, ob ein Treiber veraltet ist.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Hardware",
    name: "BIOS-Version anzeigen",
    command: "Get-CimInstance Win32_BIOS | Select-Object SMBIOSBIOSVersion, ReleaseDate",
    description: "Zeigt BIOS-Version und -Datum. Wichtig für Garantiefälle und bei BitLocker-Rückfragen nach einem Firmware-Update.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Hardware",
    name: "Arbeitsspeicher anzeigen",
    command: "Get-CimInstance Win32_PhysicalMemory | Select-Object Manufacturer, @{n='GB';e={$_.Capacity/1GB}}, Speed",
    description: "Zeigt Größe, Hersteller und Takt der eingebauten Speichermodule.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Hardware",
    name: "Prozessor und Auslastung anzeigen",
    command: "Get-CimInstance Win32_Processor | Select-Object Name, NumberOfCores, LoadPercentage",
    description: "Zeigt Prozessormodell, Kernanzahl und aktuelle Auslastung.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Hardware",
    name: "Festplatten-Gesundheit prüfen",
    command: "Get-PhysicalDisk | Select-Object FriendlyName, MediaType, HealthStatus, OperationalStatus",
    description: "Zeigt, ob die Laufwerke gesund sind. Ein Status ungleich „Healthy“ ist ein Grund, die Daten zu sichern und das Gerät zu tauschen.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Hardware",
    name: "Akku-Zustand anzeigen",
    command: "Get-CimInstance Win32_Battery | Select-Object EstimatedChargeRemaining, BatteryStatus",
    description: "Zeigt Ladezustand und Status des Akkus. Die Kapazität über die Jahre zeigt der Akkubericht.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Hardware",
    name: "Hardware neu einlesen",
    command: "pnputil /scan-devices",
    description: "Lässt Windows alle Geräte neu erkennen. Hilft, wenn ein angeschlossenes Gerät nicht auftaucht.",
    shell: "cmd",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Prozesse",
    name: "Prozessdetails mit Benutzer anzeigen",
    command: "Get-Process -IncludeUserName | Where-Object ProcessName -like \"[PROGRAMMNAME]*\" | Select-Object Id, ProcessName, UserName, CPU, WorkingSet",
    description: "Zeigt zu einem Programm die Prozesse samt Benutzer, Auslastung und Speicherverbrauch.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Prozesse",
    name: "CPU-Fresser finden",
    command: "Get-Process | Sort-Object CPU -Descending | Select-Object -First 10 Name, Id, CPU",
    description: "Zeigt die zehn Prozesse mit der höchsten Prozessorlast.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Remote",
    name: "Remotedesktop-Verbindung öffnen",
    command: "mstsc /v:[SERVER]",
    description: "Öffnet eine Remotedesktop-Verbindung zu einem Server oder Rechner.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Remote",
    name: "Prozesse eines Fremdrechners anzeigen",
    command: "tasklist /s [PC-NAME]",
    description: "Zeigt die laufenden Prozesse auf einem anderen Rechner im Netz.",
    shell: "cmd",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Remote",
    name: "Systeminformationen eines Fremdrechners anzeigen",
    command: "systeminfo /s [PC-NAME]",
    description: "Zeigt Betriebssystem, Hardware und Updates eines anderen Rechners im Netz.",
    shell: "cmd",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Remote",
    name: "Remoteverwaltung prüfen",
    command: "Test-WSMan [PC-NAME]",
    description: "Prüft, ob ein Rechner für die PowerShell-Fernverwaltung erreichbar ist.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Remote",
    name: "PowerShell-Sitzung auf Fremdrechner öffnen",
    command: "Enter-PSSession -ComputerName [PC-NAME]",
    description: "Öffnet eine PowerShell-Sitzung auf einem anderen Rechner, ohne sich per Remotedesktop aufzuschalten. Beenden mit Exit-PSSession.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "medium",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Ereignisse",
    name: "Fehlgeschlagene Anmeldungen anzeigen",
    command: "Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4625} -MaxEvents 20 | Select-Object TimeCreated, Message",
    description: "Listet die letzten fehlgeschlagenen Anmeldeversuche an diesem Rechner. Zeigt, ob jemand Passwörter durchprobiert.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Ereignisse",
    name: "Anwendungsabstürze der letzten 24 Stunden anzeigen",
    command: "Get-WinEvent -FilterHashtable @{LogName='Application'; ProviderName='Application Error'; StartTime=(Get-Date).AddDays(-1)} -MaxEvents 20 | Select-Object TimeCreated, Message",
    description: "Listet abgestürzte Programme mit Name und fehlerhaftem Modul.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Ereignisse",
    name: "Bluescreens anzeigen",
    command: "Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-WER-SystemErrorReporting'} -MaxEvents 10 | Select-Object TimeCreated, Message",
    description: "Zeigt die letzten Bluescreens mit Stoppcode.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Ereignisse",
    name: "Minidumps anzeigen",
    command: "Get-ChildItem C:\\Windows\\Minidump | Sort-Object LastWriteTime -Descending | Select-Object Name, LastWriteTime, Length",
    description: "Listet die Absturzabbilder. Sie können dem 3rd Level oder dem Hersteller zur Analyse übergeben werden.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Ereignisse",
    name: "Dienstfehler anzeigen",
    command: "Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Service Control Manager'; Level=2} -MaxEvents 20 | Select-Object TimeCreated, Message",
    description: "Listet Dienste, die nicht starten konnten oder abgestürzt sind.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Ereignisse",
    name: "WLAN-Ereignisse anzeigen",
    command: "Get-WinEvent -LogName 'Microsoft-Windows-WLAN-AutoConfig/Operational' -MaxEvents 30 | Select-Object TimeCreated, Id, Message",
    description: "Zeigt das WLAN-Protokoll mit Verbindungsaufbau, Abbrüchen und Fehlergründen.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Dienste",
    name: "Dienst starten",
    command: "Start-Service [DIENSTNAME]",
    description: "Startet einen angehaltenen Windows-Dienst.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "medium",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Dienste",
    name: "Gestoppte Automatik-Dienste anzeigen",
    command: "Get-Service | Where-Object { $_.StartType -eq 'Automatic' -and $_.Status -ne 'Running' } | Select-Object Name, DisplayName, Status",
    description: "Listet Dienste, die automatisch starten sollten, aber nicht laufen. Ein guter erster Blick bei unklaren Störungen.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Datenträger",
    name: "Ordnergröße berechnen",
    command: "\"{0:N1} GB\" -f ((Get-ChildItem \"[PFAD]\" -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum / 1GB)",
    description: "Berechnet die Gesamtgröße eines Ordners in GB. Findet, was auf einem vollen Laufwerk den Platz belegt.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Datenträger",
    name: "Laufwerke und Dateisysteme anzeigen",
    command: "Get-Volume | Select-Object DriveLetter, FileSystemLabel, FileSystem, HealthStatus, SizeRemaining, Size",
    description: "Zeigt alle Laufwerke mit Dateisystem, Zustand und freiem Platz.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Datenträger",
    name: "Datenträgerverwaltung öffnen",
    command: "diskmgmt.msc",
    description: "Öffnet die Datenträgerverwaltung, um Laufwerke und Laufwerksbuchstaben anzusehen. Nur ansehen: Hier lassen sich Laufwerke auch formatieren.",
    shell: "windows",
    requiresAdmin: 1,
    riskLevel: "medium",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Dateien",
    name: "Ordnerrechte anzeigen",
    command: "icacls \"[PFAD]\"",
    description: "Zeigt, wer auf einen Ordner welche Rechte hat. Hilft bei „Zugriff verweigert“.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Dateien",
    name: "Eigentümer eines Ordners anzeigen",
    command: "Get-Acl \"[PFAD]\" | Select-Object Owner",
    description: "Zeigt den Eigentümer eines Ordners oder einer Datei.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Dateien",
    name: "Offene Dateien auf dem Server anzeigen",
    command: "Get-SmbOpenFile | Where-Object Path -like \"*[DATEINAME]*\" | Select-Object FileId, ClientUserName, ClientComputerName, Path",
    description: "Zeigt auf dem Dateiserver, wer eine Datei geöffnet hat und sie damit sperrt. Muss auf dem Dateiserver laufen.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Dateien",
    name: "Verbundene Netzlaufwerke mit Status anzeigen",
    command: "Get-SmbMapping | Select-Object LocalPath, RemotePath, Status",
    description: "Zeigt die Netzlaufwerke mit Verbindungsstatus. „Unavailable“ entspricht dem roten Kreuz.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Dateien",
    name: "Netzlaufwerk trennen",
    command: "net use [LAUFWERK]: /delete",
    description: "Trennt ein einzelnes Netzlaufwerk. Sind dort Dateien geöffnet, fragt Windows nach. Danach lässt es sich mit „Netzlaufwerk verbinden“ neu herstellen.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "medium",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Dateien",
    name: "Schattenkopien anzeigen",
    command: "vssadmin list shadows",
    description: "Listet vorhandene Schattenkopien. Daraus lassen sich über „Vorgängerversionen“ gelöschte Dateien holen.",
    shell: "cmd",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Dateien",
    name: "Schattenkopien-Speicher anzeigen",
    command: "vssadmin list shadowstorage",
    description: "Zeigt, wie viel Platz Schattenkopien belegen. Häufige Ursache für vollgelaufene Laufwerke.",
    shell: "cmd",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Dateien",
    name: "OneDrive zurücksetzen",
    command: "\"%LOCALAPPDATA%\\Microsoft\\OneDrive\\onedrive.exe\" /reset",
    description: "Setzt die OneDrive-Synchronisierung zurück. Dateien bleiben erhalten, der Abgleich beginnt neu. OneDrive startet nach etwa einer Minute von selbst, sonst von Hand starten.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "medium",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "E-Mail",
    name: "Outlook im abgesicherten Modus starten",
    command: "start outlook.exe /safe",
    description: "Startet Outlook ohne Add-ins. Läuft es so, ist ein Add-in schuld.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "E-Mail",
    name: "Outlook-Navigationsbereich zurücksetzen",
    command: "start outlook.exe /resetnavpane",
    description: "Setzt die Ordnerleiste und den Navigationsbereich auf Standard zurück.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "E-Mail",
    name: "Outlook-Ansichten zurücksetzen",
    command: "start outlook.exe /cleanviews",
    description: "Setzt alle Ansichten auf die Standardeinstellung zurück. Eigene Ansichten gehen verloren.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "medium",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "E-Mail",
    name: "Outlook-Profilauswahl anzeigen",
    command: "start outlook.exe /profiles",
    description: "Startet Outlook mit der Auswahl des Profils. Praktisch, um ein neues Profil zu testen.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "E-Mail",
    name: "Mail-Profile öffnen",
    command: "control mlcfg32.cpl",
    description: "Öffnet die Mail-Profilverwaltung der Systemsteuerung, um ein neues Outlook-Profil anzulegen.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "E-Mail",
    name: "Outlook beenden",
    command: "taskkill /IM outlook.exe",
    description: "Bittet Outlook, sich zu schließen, und fragt dabei nach dem Speichern. Reagiert es nicht, den Benutzer vorher warnen, dass Entwürfe verloren gehen können, und erst dann `/F` anhängen.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "E-Mail",
    name: "OST-Dateien anzeigen",
    command: "Get-ChildItem \"$env:LOCALAPPDATA\\Microsoft\\Outlook\" -Filter *.ost | Select-Object Name, @{n='MB';e={[math]::Round($_.Length/1MB)}}, LastWriteTime",
    description: "Zeigt die lokalen Postfach-Zwischenspeicher mit Größe und Änderungsdatum. Ist eine Datei beschädigt, hilft Umbenennen.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "E-Mail",
    name: "Office-Version anzeigen",
    command: "reg query \"HKLM\\SOFTWARE\\Microsoft\\Office\\ClickToRun\\Configuration\" /v VersionToReport",
    description: "Zeigt die installierte Version von Microsoft 365 Apps.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Teams",
    name: "Teams beenden",
    command: "taskkill /IM ms-teams.exe & taskkill /IM Teams.exe",
    description: "Bittet neues und klassisches Teams, sich zu schließen. Eine Fehlermeldung zur nicht laufenden Version ist normal. Vor dem Leeren des Teams-Caches ausführen.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Teams",
    name: "Teams-Cache leeren (neues Teams)",
    command: "Remove-Item \"$env:LOCALAPPDATA\\Packages\\MSTeams_8wekyb3d8bbwe\\LocalCache\\*\" -Recurse -Force -ErrorAction SilentlyContinue",
    description: "Leert den Zwischenspeicher des neuen Teams. Teams vorher beenden. Hilft bei weißem Fenster, Anmeldeschleifen und hängenden Chats.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "medium",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Teams",
    name: "Teams-Cache leeren (klassisch)",
    command: "Remove-Item \"$env:APPDATA\\Microsoft\\Teams\\*\" -Recurse -Force -ErrorAction SilentlyContinue",
    description: "Leert den Zwischenspeicher des klassischen Teams. Teams vorher beenden.",
    shell: "powershell",
    requiresAdmin: 0,
    riskLevel: "medium",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Microsoft 365",
    name: "Mit Exchange Online verbinden",
    command: "Connect-ExchangeOnline",
    description: "Meldet sich an Exchange Online an. Voraussetzung für die anderen Exchange-Befehle. Braucht das Modul ExchangeOnlineManagement und ein Admin-Konto.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Microsoft 365",
    name: "Postfachgröße anzeigen",
    command: "Get-MailboxStatistics [BENUTZER-MAIL] | Select-Object DisplayName, ItemCount, TotalItemSize",
    description: "Zeigt, wie groß ein Postfach ist und wie viele Elemente es enthält.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Microsoft 365",
    name: "Postfachberechtigungen anzeigen",
    command: "Get-MailboxPermission [POSTFACH] | Where-Object { $_.User -ne 'NT AUTHORITY\\SELF' } | Select-Object User, AccessRights",
    description: "Zeigt, wer Zugriff auf ein Postfach hat, zum Beispiel bei freigegebenen Postfächern.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Microsoft 365",
    name: "Weiterleitungsregeln eines Postfachs prüfen",
    command: "Get-InboxRule -Mailbox [BENUTZER-MAIL] | Select-Object Name, Enabled, ForwardTo, RedirectTo, ForwardAsAttachmentTo",
    description: "Zeigt Regeln, die Mails weiterleiten. Angreifer richten nach einem Kontomissbrauch gern versteckte Weiterleitungen ein.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Microsoft 365",
    name: "Postfach-Weiterleitung prüfen",
    command: "Get-Mailbox [BENUTZER-MAIL] | Select-Object DisplayName, ForwardingAddress, ForwardingSmtpAddress, DeliverToMailboxAndForward",
    description: "Zeigt, ob für das ganze Postfach eine Weiterleitung eingerichtet ist.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Microsoft 365",
    name: "Nachrichtenverfolgung",
    command: "Get-MessageTraceV2 -SenderAddress [ABSENDER] -StartDate (Get-Date).AddDays(-2) -EndDate (Get-Date) | Select-Object Received, SenderAddress, RecipientAddress, Subject, Status",
    description: "Zeigt, was mit Mails eines Absenders in den letzten zwei Tagen passiert ist: zugestellt, in Quarantäne, abgewiesen oder noch in der Warteschlange. Nachfolger von Get-MessageTrace und braucht ein aktuelles ExchangeOnlineManagement-Modul; im Exchange Admin Center heißt die Funktion „Nachrichtenablaufverfolgung“.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Microsoft 365",
    name: "Mit Microsoft Graph verbinden",
    command: "Connect-MgGraph -Scopes \"User.Read.All\",\"UserAuthenticationMethod.Read.All\"",
    description: "Meldet sich mit reinen Leserechten an Microsoft Graph an. Voraussetzung für die Befehle zu Lizenzen und MFA-Methoden. Braucht das Modul Microsoft.Graph und ein Admin-Konto.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Microsoft 365",
    name: "MFA-Methoden anzeigen",
    command: "Get-MgUserAuthenticationMethod -UserId [BENUTZER-MAIL]",
    description: "Listet die für ein Konto registrierten Anmeldemethoden. Bei Verdacht auf Missbrauch auf fremde Einträge prüfen.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Microsoft 365",
    name: "Sitzungen widerrufen",
    command: "Revoke-MgUserSignInSession -UserId [BENUTZER-MAIL]",
    description: "Beendet alle bestehenden Anmeldungen eines Kontos – nötig nach einem Passwortreset bei Verdacht auf Missbrauch. Der Benutzer muss sich überall neu anmelden. Dafür vorher mit Connect-MgGraph -Scopes \"User.RevokeSessions.All\" verbinden.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "medium",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Microsoft 365",
    name: "Lizenzen eines Benutzers anzeigen",
    command: "Get-MgUserLicenseDetail -UserId [BENUTZER-MAIL] | Select-Object SkuPartNumber",
    description: "Zeigt die zugewiesenen Microsoft-365-Lizenzen. Fehlt eine, sind Funktionen gesperrt.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Gruppenrichtlinien",
    name: "Gruppenrichtlinien-Bericht als HTML erstellen",
    command: "gpresult /h \"%USERPROFILE%\\Desktop\\gpresult.html\"",
    description: "Erzeugt einen übersichtlichen Bericht, welche Richtlinien angewendet wurden und welche nicht. Liegt danach auf dem Desktop.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Gruppenrichtlinien",
    name: "Computerrichtlinien anzeigen",
    command: "gpresult /r /scope computer",
    description: "Zeigt die auf den Rechner angewendeten Richtlinien.",
    shell: "cmd",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },
  {
    category: "Reparatur",
    name: "Komponentenspeicher schnell prüfen",
    command: "DISM /Online /Cleanup-Image /CheckHealth",
    description: "Prüft schnell, ob das Windows-Abbild als beschädigt markiert ist. Die gründliche Prüfung ist „Windows-Abbild reparieren“.",
    shell: "cmd",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 1,
    restartRequired: 0,
  },

  // ---- Erweiterung: Microsoft-Welt (Entra, Exchange, Mail-Authentifizierung) ----
  {
    category: "Microsoft 365",
    name: "Quarantäne-Nachrichten anzeigen",
    command: "Get-QuarantineMessage -RecipientAddress [BENUTZER-MAIL] -StartReceivedDate (Get-Date).AddDays(-2) -EndReceivedDate (Get-Date) | Select-Object ReceivedTime, SenderAddress, Subject, Type, ReleaseStatus",
    description: "Listet Mails der letzten zwei Tage, die für ein Postfach in der Quarantäne gelandet sind, samt Grund (Type). Nur ansehen – Freigeben läuft im Microsoft Defender Portal und nur nach Prüfung des Absenders. Malware und sehr sicheres Phishing darf nur ein Admin freigeben.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Microsoft 365",
    name: "Postfachtyp anzeigen",
    command: "Get-Mailbox [BENUTZER-MAIL] | Select-Object DisplayName, RecipientTypeDetails, PrimarySmtpAddress",
    description: "Zeigt, ob es ein normales Benutzerpostfach (UserMailbox), ein freigegebenes Postfach (SharedMailbox) oder ein Raum- bzw. Gerätepostfach ist. Das entscheidet über Lizenz, Anmeldung und Berechtigungen.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Microsoft 365",
    name: "E-Mail-Adressen eines Postfachs anzeigen",
    command: "(Get-Mailbox [BENUTZER-MAIL]).EmailAddresses",
    description: "Listet alle Adressen eines Postfachs. Die Adresse mit „SMTP:“ in Großbuchstaben ist die primäre, „smtp:“ in Kleinbuchstaben sind Aliasse. Hilfreich, wenn eine Mail „an die falsche Adresse“ ging oder eine Adresse nicht ankommt.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Active Directory",
    name: "Verzeichnis-Synchronisierung prüfen",
    command: "Get-ADSyncScheduler",
    description: "Zeigt auf dem Entra-Connect-Server, wie oft das lokale Active Directory mit der Cloud abgeglichen wird (normalerweise alle 30 Minuten) und ob der Abgleich aktiv ist. Erklärt, warum eine Änderung im AD erst später in Microsoft 365 ankommt. Nur auf dem Sync-Server und nur durch Berechtigte.",
    shell: "powershell",
    requiresAdmin: 1,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Active Directory",
    name: "Geräte-Join-Status anzeigen",
    command: "dsregcmd /status",
    description: "Zeigt, ob ein Rechner mit Entra ID verbunden ist (AzureAdJoined), in der lokalen Domäne ist (DomainJoined) oder beides (Hybrid). Wichtig bei Anmelde-, Intune- und Conditional-Access-Problemen. Im Block „SSO State“ steht, ob ein Cloud-Token vorhanden ist.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Active Directory",
    name: "Anmeldenamen (UPN) anzeigen",
    command: "whoami /upn",
    description: "Zeigt den Anmeldenamen im Mailformat (UPN), mit dem der Benutzer in der Cloud angemeldet wird. Er stimmt nicht immer mit der Mailadresse überein – bei Anmeldeproblemen zuerst vergleichen.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Netzwerk",
    name: "MX-Einträge einer Domäne anzeigen",
    command: "nslookup -type=MX [DOMÄNE]",
    description: "Zeigt, an welchen Mailserver eine Domäne ihre Mails liefern lässt. Bei Microsoft 365 steht dort ein Name auf mail.protection.outlook.com. Weist der Eintrag woanders hin, kommen Mails dort an statt im Postfach.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Netzwerk",
    name: "SPF-Eintrag einer Domäne anzeigen",
    command: "nslookup -type=TXT [DOMÄNE]",
    description: "Listet die TXT-Einträge einer Domäne. Der Eintrag, der mit v=spf1 beginnt, ist der SPF-Eintrag: Er nennt die Server, die für die Domäne Mails senden dürfen. Bei Microsoft 365 sollte include:spf.protection.outlook.com darin stehen.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
  {
    category: "Netzwerk",
    name: "DMARC-Eintrag einer Domäne anzeigen",
    command: "nslookup -type=TXT _dmarc.[DOMÄNE]",
    description: "Zeigt den DMARC-Eintrag einer Domäne. Er legt fest, was mit Mails geschehen soll, die SPF und DKIM nicht bestehen (p=none, quarantine oder reject). Ist keiner vorhanden, gibt es keine Vorgabe.",
    shell: "cmd",
    requiresAdmin: 0,
    riskLevel: "low",
    remoteCapable: 0,
    restartRequired: 0,
  },
];
