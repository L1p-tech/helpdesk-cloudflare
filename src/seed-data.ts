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
];
