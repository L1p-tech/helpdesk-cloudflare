import {
  authenticate,
  clearSessionCookie,
  login,
  logout,
  requireRole,
  requireUser,
} from "./auth";
import { hashPassword } from "./crypto";
import { duplicateScore } from "./duplicates";
import {
  assertSameOrigin,
  errorResponse,
  HttpError,
  json,
  readJson,
} from "./http";
import type { AuthUser, Env, Role } from "./types";
import {
  optionalString,
  positiveInteger,
  requiredString,
  validColor,
  validPassword,
  validUsername,
} from "./validation";

interface TemplateCandidate {
  id: number;
  title: string;
  body: string;
}

interface ProposalRow {
  id: number;
  template_id: number | null;
  base_version: number | null;
  proposal_type: "create" | "update";
  category_id: number | null;
  proposed_category_name: string | null;
  proposed_category_color: string | null;
  title: string;
  body: string;
  status: string;
  submitted_by: number | null;
  submitted_by_name: string;
}

interface CategoryRow {
  id: number;
  slug: string;
  name: string;
  color: string;
}

interface FeedbackRow {
  id: number;
  type: "bug" | "improvement";
  title: string;
  message: string;
  status: "open" | "planned" | "closed";
  submitted_by: number | null;
  submitted_by_name: string;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

interface SeedAdmin {
  id: number;
  displayName: string;
}

interface DefaultCategorySeed {
  slug: string;
  name: string;
  color: string;
}

interface DefaultTemplateSeed {
  categorySlug: string;
  title: string;
  body: string;
}

interface DefaultCommandSeed {
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

const DEFAULT_CATEGORY_SEEDS: DefaultCategorySeed[] = [
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

const DEFAULT_TEMPLATE_SEEDS: DefaultTemplateSeed[] = [
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

const DEFAULT_COMMAND_SEEDS: DefaultCommandSeed[] = [
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

function routePath(request: Request): string {
  return new URL(request.url).pathname.replace(/\/+$/, "") || "/";
}

function isApi(path: string): boolean {
  return path === "/api" || path.startsWith("/api/");
}

async function audit(
  env: Env,
  userId: number | null,
  action: string,
  entityType: string,
  entityId: number | null,
  details: unknown = {},
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details_json)
     VALUES (?1, ?2, ?3, ?4, ?5)`,
  )
    .bind(userId, action, entityType, entityId, JSON.stringify(details))
    .run();
}

async function hasColumn(env: Env, table: string, column: string): Promise<boolean> {
  try {
    const pragma = await env.DB.prepare(`PRAGMA table_info(${table})`).all<{
      name: string;
    }>();
    return pragma.results.some((entry) => entry.name === column);
  } catch {
    return false;
  }
}

function isSchemaMismatch(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /no such column|has no column named|NOT NULL constraint failed/i.test(error.message);
}

function isMissingTable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /no such table/i.test(error.message);
}

async function withSchemaFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
): Promise<T> {
  try {
    return await primary();
  } catch (error) {
    if (!isSchemaMismatch(error)) throw error;
    return fallback();
  }
}

async function ignoreMissingTable(operation: () => Promise<unknown>): Promise<void> {
  try {
    await operation();
  } catch (error) {
    if (!isMissingTable(error)) throw error;
  }
}

async function ensureFeedbackTable(env: Env): Promise<void> {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS feedback_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('bug', 'improvement')),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'planned', 'closed')),
      submitted_by INTEGER,
      submitted_by_name TEXT NOT NULL,
      reviewed_by INTEGER,
      admin_note TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    )`,
  ).run();
}

async function ensureTypingScoresTable(env: Env): Promise<void> {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS typing_game_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      display_name TEXT NOT NULL,
      wpm INTEGER NOT NULL CHECK (wpm >= 0 AND wpm <= 400),
      accuracy INTEGER NOT NULL CHECK (accuracy >= 0 AND accuracy <= 100),
      correct_chars INTEGER NOT NULL CHECK (correct_chars >= 0),
      total_chars INTEGER NOT NULL CHECK (total_chars >= 1),
      duration_ms INTEGER NOT NULL CHECK (duration_ms >= 10000 AND duration_ms <= 300000),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )`,
  ).run();
}

async function ensureDefaultLibrary(env: Env, seedAdmin?: SeedAdmin): Promise<void> {
  const admin = seedAdmin ?? await env.DB.prepare(
    "SELECT id, display_name FROM users WHERE role = 'admin' ORDER BY id LIMIT 1",
  ).first<{ id: number; display_name: string }>().then((row) => (
    row ? { id: row.id, displayName: row.display_name } : null
  ));

  if (!admin) return;

  const [hasTemplateNames, hasCommandNames] = await Promise.all([
    hasColumn(env, "templates", "created_by_name"),
    hasColumn(env, "commands", "created_by_name"),
  ]);

  for (const category of DEFAULT_CATEGORY_SEEDS) {
    await env.DB.prepare(
      `INSERT INTO categories (slug, name, color, created_by)
       SELECT ?1, ?2, ?3, ?4
       WHERE NOT EXISTS (
         SELECT 1 FROM categories WHERE slug = ?1 OR lower(name) = lower(?2)
       )`,
    ).bind(category.slug, category.name, category.color, admin.id).run();
  }

  for (const template of DEFAULT_TEMPLATE_SEEDS) {
    const sql = hasTemplateNames
      ? `INSERT INTO templates
          (category_id, title, body, version, created_by, created_by_name, updated_by, updated_by_name)
         SELECT c.id, ?2, ?3, 1, ?4, ?5, ?4, ?5
         FROM categories c
         WHERE c.slug = ?1
         AND NOT EXISTS (SELECT 1 FROM templates WHERE lower(title) = lower(?2))`
      : `INSERT INTO templates
          (category_id, title, body, version, created_by, updated_by)
         SELECT c.id, ?2, ?3, 1, ?4, ?4
         FROM categories c
         WHERE c.slug = ?1
         AND NOT EXISTS (SELECT 1 FROM templates WHERE lower(title) = lower(?2))`;

    await env.DB.prepare(sql)
      .bind(template.categorySlug, template.title, template.body, admin.id, admin.displayName)
      .run();
  }

  for (const command of DEFAULT_COMMAND_SEEDS) {
    const sql = hasCommandNames
      ? `INSERT INTO commands
          (category, name, command, description, shell, requires_admin, risk_level,
           remote_capable, restart_required, created_by, created_by_name, updated_by, updated_by_name)
         SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?10, ?11
         WHERE NOT EXISTS (SELECT 1 FROM commands WHERE command = ?3)`
      : `INSERT INTO commands
          (category, name, command, description, shell, requires_admin, risk_level,
           remote_capable, restart_required, created_by, updated_by)
         SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10
         WHERE NOT EXISTS (SELECT 1 FROM commands WHERE command = ?3)`;

    await env.DB.prepare(sql)
      .bind(
        command.category,
        command.name,
        command.command,
        command.description,
        command.shell,
        command.requiresAdmin,
        command.riskLevel,
        command.remoteCapable,
        command.restartRequired,
        admin.id,
        admin.displayName,
      )
      .run();
  }
}

async function notify(
  env: Env,
  userId: number,
  type: string,
  title: string,
  message: string,
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO notifications (user_id, type, title, message)
     VALUES (?1, ?2, ?3, ?4)`,
  )
    .bind(userId, type, title, message)
    .run();
}

async function findDuplicate(
  env: Env,
  title: string,
  body: string,
  excludedTemplateId: number | null,
): Promise<{ score: number; templateId: number | null; title: string | null }> {
  const result = await env.DB.prepare(
    `SELECT id, title, body
     FROM templates
     WHERE active = 1 AND (?1 IS NULL OR id <> ?1)`,
  )
    .bind(excludedTemplateId)
    .all<TemplateCandidate>();

  let best = { score: 0, templateId: null as number | null, title: null as string | null };

  for (const candidate of result.results) {
    const score = duplicateScore(title, body, candidate.title, candidate.body);
    if (score > best.score) {
      best = { score, templateId: candidate.id, title: candidate.title };
    }
  }

  return best;
}

function slugifyCategory(name: string): string {
  return name
    .toLocaleLowerCase("de")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

async function resolveProposalCategory(
  env: Env,
  userId: number,
  categoryId: number | null,
  proposedCategoryName: string | null,
  proposedCategoryColor: string | null,
): Promise<number> {
  if (proposedCategoryName) {
    const existing = await env.DB.prepare(
      `SELECT id, slug, name, color
       FROM categories
       WHERE lower(name) = lower(?1)
       LIMIT 1`,
    ).bind(proposedCategoryName).first<CategoryRow>();

    if (existing) return existing.id;

    const slug = slugifyCategory(proposedCategoryName);
    if (!slug) throw new HttpError(400, "Kategoriename ist ungültig.");

    const result = await env.DB.prepare(
      `INSERT INTO categories (slug, name, color, created_by)
       VALUES (?1, ?2, ?3, ?4)`,
    ).bind(
      slug,
      proposedCategoryName,
      proposedCategoryColor ?? "#4a7cff",
      userId,
    ).run();

    return Number(result.meta.last_row_id);
  }

  if (categoryId === null) {
    throw new HttpError(400, "Kategorie fehlt.");
  }

  return categoryId;
}

async function createInitialAdmin(request: Request, env: Env): Promise<Response> {
  const token = request.headers.get("x-setup-token");
  if (!env.ADMIN_SETUP_TOKEN || token !== env.ADMIN_SETUP_TOKEN) {
    throw new HttpError(403, "Ungültiger Setup-Token.");
  }

  const existing = await env.DB.prepare("SELECT COUNT(*) AS count FROM users")
    .first<{ count: number }>();
  if ((existing?.count ?? 0) > 0) {
    throw new HttpError(409, "Es existiert bereits mindestens ein Benutzer.");
  }

  const body = await readJson<Record<string, unknown>>(request);
  const username = validUsername(body.username);
  const displayName = requiredString(body.displayName, "Anzeigename", 80);
  const password = validPassword(body.password);
  const passwordData = await hashPassword(password);

  const result = await env.DB.prepare(
    `INSERT INTO users
      (username, display_name, password_hash, password_salt, password_iterations, role)
     VALUES (?1, ?2, ?3, ?4, ?5, 'admin')`,
  )
    .bind(
      username,
      displayName,
      passwordData.hash,
      passwordData.salt,
      passwordData.iterations,
    )
    .run();

  await ensureDefaultLibrary(env, {
    id: Number(result.meta.last_row_id),
    displayName,
  });
  await audit(env, Number(result.meta.last_row_id), "setup_admin", "user", Number(result.meta.last_row_id));
  return json({ ok: true }, { status: 201 });
}

async function handleAuth(
  request: Request,
  env: Env,
  user: AuthUser | null,
  path: string,
): Promise<Response | null> {
  if (path === "/api/setup/admin" && request.method === "POST") {
    return createInitialAdmin(request, env);
  }

  if (path === "/api/auth/login" && request.method === "POST") {
    const body = await readJson<Record<string, unknown>>(request);
    const result = await login(
      request,
      env,
      requiredString(body.username, "Benutzername", 40),
      requiredString(body.password, "Passwort", 200),
    );

    await audit(env, result.user.id, "login", "session", null);
    return json(
      { user: result.user },
      { headers: { "set-cookie": result.cookie } },
    );
  }

  if (path === "/api/auth/logout" && request.method === "POST") {
    if (user) await audit(env, user.id, "logout", "session", null);
    await logout(request, env);
    return json(
      { ok: true },
      { headers: { "set-cookie": clearSessionCookie() } },
    );
  }

  if (path === "/api/auth/me" && request.method === "GET") {
    return json({ user });
  }

  return null;
}

async function handleBootstrap(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
  if (path !== "/api/bootstrap" || request.method !== "GET") return null;

  await ensureDefaultLibrary(env, {
    id: user.id,
    displayName: user.displayName,
  });

  const [categories, templates, commands, settings, notifications] = await Promise.all([
    env.DB.prepare(
      "SELECT id, slug, name, color FROM categories WHERE active = 1 ORDER BY name COLLATE NOCASE",
    ).all(),
    (async () => {
      const hasTemplateNames = await hasColumn(env, "templates", "created_by_name");
      return env.DB.prepare(
        `SELECT t.id, t.title, t.body, t.version, t.updated_at,
                c.id AS category_id, c.name AS category_name, c.color AS category_color,
                ${hasTemplateNames
    ? "COALESCE(t.created_by_name, cu.display_name, 'Ehemaliger Mitarbeiter')"
    : "cu.display_name"} AS created_by_name,
                ${hasTemplateNames
    ? "COALESCE(t.updated_by_name, u.display_name, 'Ehemaliger Mitarbeiter')"
    : "u.display_name"} AS updated_by_name
         FROM templates t
         JOIN categories c ON c.id = t.category_id
         ${hasTemplateNames ? "LEFT JOIN users cu ON cu.id = t.created_by" : "JOIN users cu ON cu.id = t.created_by"}
         ${hasTemplateNames ? "LEFT JOIN users u ON u.id = t.updated_by" : "JOIN users u ON u.id = t.updated_by"}
         WHERE t.active = 1
         ORDER BY t.updated_at DESC`,
      ).all();
    })(),
    env.DB.prepare(
      `SELECT id, category, name, command, description, shell, requires_admin,
              risk_level, remote_capable, restart_required
       FROM commands WHERE active = 1 ORDER BY category, name COLLATE NOCASE`,
    ).all(),
    env.DB.prepare(
      `SELECT signature_name, favorites_json, preferences_json
       FROM user_settings WHERE user_id = ?1`,
    ).bind(user.id).first(),
    env.DB.prepare(
      `SELECT id, type, title, message, created_at
       FROM notifications WHERE user_id = ?1 AND read_at IS NULL
       ORDER BY created_at DESC LIMIT 30`,
    ).bind(user.id).all(),
  ]);

  return json({
    user,
    categories: categories.results,
    templates: templates.results,
    commands: commands.results,
    settings: settings ?? {
      signature_name: "",
      favorites_json: '{"templates":[],"commands":[]}',
      preferences_json: "{}",
    },
    notifications: notifications.results,
  });
}

async function handleSettings(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
  if (path !== "/api/settings" || request.method !== "PUT") return null;

  const body = await readJson<Record<string, unknown>>(request);
  const signatureName = optionalString(body.signatureName, 100) ?? "";
  const favorites = body.favorites ?? { templates: [], commands: [] };
  const preferences = body.preferences ?? {};

  await env.DB.prepare(
    `INSERT INTO user_settings
      (user_id, signature_name, favorites_json, preferences_json, updated_at)
     VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id) DO UPDATE SET
       signature_name = excluded.signature_name,
       favorites_json = excluded.favorites_json,
       preferences_json = excluded.preferences_json,
       updated_at = CURRENT_TIMESTAMP`,
  )
    .bind(user.id, signatureName, JSON.stringify(favorites), JSON.stringify(preferences))
    .run();

  return json({ ok: true });
}

async function handleProposals(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
  if (path === "/api/proposals" && request.method === "GET") {
    const adminView = user.role === "admin" || user.role === "editor";
    const hasSubmittedByName = await hasColumn(env, "template_proposals", "submitted_by_name");
    const result = await env.DB.prepare(
      `SELECT p.*, c.name AS category_name, c.color AS category_color,
              ${hasSubmittedByName
    ? "p.submitted_by_name"
    : "COALESCE(u.display_name, 'Ehemaliger Mitarbeiter') AS submitted_by_name"},
              d.title AS duplicate_title
       FROM template_proposals p
       LEFT JOIN categories c ON c.id = p.category_id
       ${hasSubmittedByName ? "LEFT JOIN users u ON u.id = p.submitted_by" : "JOIN users u ON u.id = p.submitted_by"}
       LEFT JOIN templates d ON d.id = p.duplicate_template_id
       WHERE ${adminView ? "p.status = 'pending'" : "p.submitted_by = ?1"}
       ORDER BY p.updated_at DESC`,
    );

    const rows = adminView
      ? await result.all()
      : await result.bind(user.id).all();

    return json({ proposals: rows.results });
  }

  if (path === "/api/proposals/check" && request.method === "POST") {
    const body = await readJson<Record<string, unknown>>(request);
    const title = requiredString(body.title, "Titel", 160);
    const templateBody = requiredString(body.body, "Vorlagentext", 20_000);
    const templateId = body.templateId ? positiveInteger(body.templateId, "Vorlagen-ID") : null;
    const duplicate = await findDuplicate(env, title, templateBody, templateId);
    return json({ duplicate });
  }

  if (path === "/api/proposals" && request.method === "POST") {
    const body = await readJson<Record<string, unknown>>(request);
    const title = requiredString(body.title, "Titel", 160);
    const templateBody = requiredString(body.body, "Vorlagentext", 20_000);
    const categoryMode = body.categoryMode === "new" ? "new" : "existing";
    const categoryId = categoryMode === "existing"
      ? positiveInteger(body.categoryId, "Kategorie")
      : null;
    const proposedCategoryName = categoryMode === "new"
      ? requiredString(body.proposedCategoryName, "Neue Kategorie", 60)
      : null;
    const proposedCategoryColor = categoryMode === "new"
      ? validColor(body.proposedCategoryColor)
      : null;
    const reason = optionalString(body.reason, 1000);
    const templateId = body.templateId ? positiveInteger(body.templateId, "Vorlagen-ID") : null;

    let proposalType: "create" | "update" = "create";
    let baseVersion: number | null = null;

    if (templateId !== null) {
      const template = await env.DB.prepare(
        "SELECT version FROM templates WHERE id = ?1 AND active = 1",
      ).bind(templateId).first<{ version: number }>();
      if (!template) throw new HttpError(404, "Vorlage wurde nicht gefunden.");
      proposalType = "update";
      baseVersion = template.version;
    }

    const duplicate = await findDuplicate(env, title, templateBody, templateId);
    if (duplicate.score >= 0.98) {
      throw new HttpError(409, "Eine nahezu identische Vorlage existiert bereits.", {
        duplicate,
      });
    }
    const hasSubmittedByName = await hasColumn(env, "template_proposals", "submitted_by_name");
    const insert = hasSubmittedByName
      ? env.DB.prepare(
        `INSERT INTO template_proposals
          (template_id, base_version, proposal_type, category_id, proposed_category_name,
           proposed_category_color, title, body, reason, status, duplicate_score,
           duplicate_template_id, submitted_by, submitted_by_name, submitted_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'pending', ?10, ?11, ?12, ?13, CURRENT_TIMESTAMP)`,
      ).bind(
        templateId,
        baseVersion,
        proposalType,
        categoryId,
        proposedCategoryName,
        proposedCategoryColor,
        title,
        templateBody,
        reason,
        duplicate.score,
        duplicate.templateId,
        user.id,
        user.displayName,
      )
      : env.DB.prepare(
        `INSERT INTO template_proposals
          (template_id, base_version, proposal_type, category_id, proposed_category_name,
           proposed_category_color, title, body, reason, status, duplicate_score,
           duplicate_template_id, submitted_by, submitted_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'pending', ?10, ?11, ?12, CURRENT_TIMESTAMP)`,
      ).bind(
        templateId,
        baseVersion,
        proposalType,
        categoryId,
        proposedCategoryName,
        proposedCategoryColor,
        title,
        templateBody,
        reason,
        duplicate.score,
        duplicate.templateId,
        user.id,
      );

    const result = await insert.run();

    const proposalId = Number(result.meta.last_row_id);
    await audit(env, user.id, "submit", "template_proposal", proposalId, {
      duplicateScore: duplicate.score,
    });

    return json({ id: proposalId, duplicate }, { status: 201 });
  }

  const reviewMatch = path.match(/^\/api\/proposals\/(\d+)\/(approve|reject|changes)$/);
  if (reviewMatch && request.method === "POST") {
    requireRole(user, ["editor", "admin"]);

    const proposalId = positiveInteger(reviewMatch[1], "Vorschlags-ID");
    const actionValue = reviewMatch[2];

    if (
      actionValue !== "approve" &&
      actionValue !== "reject" &&
      actionValue !== "changes"
    ) {
      throw new HttpError(400, "Ungültige Freigabeaktion.");
    }

    const action = actionValue;
    const body = await readJson<Record<string, unknown>>(request);
    const note = optionalString(body.note, 2000);

    const proposal = await withSchemaFallback(
      () => env.DB.prepare(
        `SELECT id, template_id, base_version, proposal_type, category_id,
                proposed_category_name, proposed_category_color, title, body,
                status, submitted_by, submitted_by_name
         FROM template_proposals WHERE id = ?1`,
      ).bind(proposalId).first<ProposalRow>(),
      () => env.DB.prepare(
        `SELECT p.id, p.template_id, p.base_version, p.proposal_type, p.category_id,
                p.proposed_category_name, p.proposed_category_color, p.title, p.body,
                p.status, p.submitted_by, u.display_name AS submitted_by_name
         FROM template_proposals p
         JOIN users u ON u.id = p.submitted_by
         WHERE p.id = ?1`,
      ).bind(proposalId).first<ProposalRow>(),
    );

    if (!proposal) throw new HttpError(404, "Vorschlag wurde nicht gefunden.");
    if (proposal.status !== "pending") {
      throw new HttpError(409, "Dieser Vorschlag wurde bereits bearbeitet.");
    }

    if (action === "approve") {
      const resolvedCategoryId = await resolveProposalCategory(
        env,
        user.id,
        proposal.category_id,
        proposal.proposed_category_name,
        proposal.proposed_category_color,
      );
      let templateId: number;
      if (proposal.proposal_type === "create") {
        const hasTemplateNames = await hasColumn(env, "templates", "created_by_name");
        const result = hasTemplateNames
          ? await env.DB.prepare(
            `INSERT INTO templates
              (category_id, title, body, version, created_by, created_by_name, updated_by, updated_by_name)
             VALUES (?1, ?2, ?3, 1, ?4, ?5, ?6, ?7)`,
          )
            .bind(
              resolvedCategoryId,
              proposal.title,
              proposal.body,
              proposal.submitted_by,
              proposal.submitted_by_name,
              user.id,
              user.displayName,
            )
            .run()
          : await env.DB.prepare(
            `INSERT INTO templates
              (category_id, title, body, version, created_by, updated_by)
             VALUES (?1, ?2, ?3, 1, ?4, ?5)`,
          )
            .bind(
              resolvedCategoryId,
              proposal.title,
              proposal.body,
              proposal.submitted_by,
              user.id,
            )
            .run();
        templateId = Number(result.meta.last_row_id);
      } else {
        if (!proposal.template_id) throw new HttpError(409, "Zielvorlage fehlt.");

        const current = await env.DB.prepare(
          "SELECT version FROM templates WHERE id = ?1 AND active = 1",
        ).bind(proposal.template_id).first<{ version: number }>();

        if (!current) throw new HttpError(404, "Zielvorlage wurde nicht gefunden.");
        if (current.version !== proposal.base_version) {
          throw new HttpError(
            409,
            "Die Vorlage wurde zwischenzeitlich geändert. Vorschlag bitte erneut prüfen.",
          );
        }

        const hasVersionNames = await hasColumn(env, "template_versions", "changed_by_name");
        const hasTemplateNames = await hasColumn(env, "templates", "updated_by_name");

        await env.DB.prepare(
          hasVersionNames
            ? `INSERT INTO template_versions
                (template_id, version, category_id, title, body, changed_by, changed_by_name, change_note)
               SELECT id, version, category_id, title, body, ?2, ?3, ?4
               FROM templates WHERE id = ?1`
            : `INSERT INTO template_versions
                (template_id, version, category_id, title, body, changed_by, change_note)
               SELECT id, version, category_id, title, body, ?2, ?3
               FROM templates WHERE id = ?1`,
        ).bind(
          proposal.template_id,
          user.id,
          ...(hasVersionNames ? [user.displayName, note] : [note]),
        ).run();

        await env.DB.prepare(
          hasTemplateNames
            ? `UPDATE templates
               SET category_id = ?1, title = ?2, body = ?3, version = version + 1,
                   updated_by = ?4, updated_by_name = ?5, updated_at = CURRENT_TIMESTAMP
               WHERE id = ?6`
            : `UPDATE templates
               SET category_id = ?1, title = ?2, body = ?3, version = version + 1,
                   updated_by = ?4, updated_at = CURRENT_TIMESTAMP
               WHERE id = ?5`,
        )
          .bind(
            resolvedCategoryId,
            proposal.title,
            proposal.body,
            user.id,
            ...(hasTemplateNames ? [user.displayName, proposal.template_id] : [proposal.template_id]),
          )
          .run();

        templateId = proposal.template_id;
      }

      await env.DB.prepare(
        `UPDATE template_proposals
         SET status = 'approved', reviewed_by = ?1, review_note = ?2,
             reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP,
             template_id = ?3
         WHERE id = ?4`,
      ).bind(user.id, note, templateId, proposalId).run();

      if (proposal.submitted_by !== null) {
        await notify(
          env,
          proposal.submitted_by,
          "proposal_approved",
          "Vorlage genehmigt",
          `Dein Vorschlag „${proposal.title}“ wurde genehmigt.`,
        );
      }
      await audit(env, user.id, "approve", "template_proposal", proposalId, { templateId });

      return json({ ok: true, templateId });
    }

    if (!note) {
      throw new HttpError(400, "Bitte einen Grund oder Änderungswunsch eintragen.");
    }

    const status = action === "reject" ? "rejected" : "changes_requested";
    await env.DB.prepare(
      `UPDATE template_proposals
       SET status = ?1, reviewed_by = ?2, review_note = ?3,
           reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?4`,
    ).bind(status, user.id, note, proposalId).run();

    if (proposal.submitted_by !== null) {
      await notify(
        env,
        proposal.submitted_by,
        status === "rejected" ? "proposal_rejected" : "changes_requested",
        status === "rejected" ? "Vorlage abgelehnt" : "Überarbeitung angefordert",
        `„${proposal.title}“: ${note}`,
      );
    }
    await audit(env, user.id, action, "template_proposal", proposalId, { note });

    return json({ ok: true });
  }

  return null;
}

async function handleCategories(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
  if (path !== "/api/categories" || request.method !== "POST") return null;
  requireRole(user, ["admin"]);

  const body = await readJson<Record<string, unknown>>(request);
  const name = requiredString(body.name, "Kategoriename", 60);
  const color = validColor(body.color);
  const slug = slugifyCategory(name);

  if (!slug) throw new HttpError(400, "Kategoriename ist ungültig.");

  const result = await env.DB.prepare(
    `INSERT INTO categories (slug, name, color, created_by)
     VALUES (?1, ?2, ?3, ?4)`,
  ).bind(slug, name, color, user.id).run();

  await audit(env, user.id, "create", "category", Number(result.meta.last_row_id));
  return json({ id: Number(result.meta.last_row_id) }, { status: 201 });
}

async function handleTemplates(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
  const templateMatch = path.match(/^\/api\/templates\/(\d+)$/);
  if (!templateMatch) return null;

  const templateId = positiveInteger(templateMatch[1], "Vorlagen-ID");

  if (request.method === "PUT") {
    requireRole(user, ["admin"]);

    const current = await env.DB.prepare(
      `SELECT id, version, category_id, title, body
       FROM templates
       WHERE id = ?1 AND active = 1`,
    ).bind(templateId).first<{
      id: number;
      version: number;
      category_id: number;
      title: string;
      body: string;
    }>();

    if (!current) throw new HttpError(404, "Vorlage wurde nicht gefunden.");

    const body = await readJson<Record<string, unknown>>(request);
    const title = requiredString(body.title, "Titel", 160);
    const templateBody = requiredString(body.body, "Vorlagentext", 20_000);
    const categoryId = positiveInteger(body.categoryId, "Kategorie");
    const note = optionalString(body.note, 1000) ?? "Direktbearbeitung durch Administrator";

    const hasVersionNames = await hasColumn(env, "template_versions", "changed_by_name");
    const hasTemplateNames = await hasColumn(env, "templates", "updated_by_name");
    await env.DB.batch([
      env.DB.prepare(
        hasVersionNames
          ? `INSERT INTO template_versions
              (template_id, version, category_id, title, body, changed_by, changed_by_name, change_note)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
          : `INSERT INTO template_versions
              (template_id, version, category_id, title, body, changed_by, change_note)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
      ).bind(
        current.id,
        current.version,
        current.category_id,
        current.title,
        current.body,
        user.id,
        ...(hasVersionNames ? [user.displayName, note] : [note]),
      ),
      env.DB.prepare(
        hasTemplateNames
          ? `UPDATE templates
             SET category_id = ?1, title = ?2, body = ?3, version = version + 1,
                 updated_by = ?4, updated_by_name = ?5, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?6`
          : `UPDATE templates
             SET category_id = ?1, title = ?2, body = ?3, version = version + 1,
                 updated_by = ?4, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?5`,
      ).bind(
        categoryId,
        title,
        templateBody,
        user.id,
        ...(hasTemplateNames ? [user.displayName, templateId] : [templateId]),
      ),
    ]);

    await audit(env, user.id, "update", "template", templateId, { direct: true });
    return json({ ok: true });
  }

  if (request.method !== "DELETE") return null;

  requireRole(user, ["admin"]);

  const current = await env.DB.prepare(
    `SELECT id, version, category_id, title, body
     FROM templates
     WHERE id = ?1 AND active = 1`,
  ).bind(templateId).first<{
    id: number;
    version: number;
    category_id: number;
    title: string;
    body: string;
  }>();

  if (!current) throw new HttpError(404, "Vorlage wurde nicht gefunden.");

  const hasVersionNames = await hasColumn(env, "template_versions", "changed_by_name");
  const hasTemplateNames = await hasColumn(env, "templates", "updated_by_name");
  await env.DB.batch([
    env.DB.prepare(
      hasVersionNames
        ? `INSERT INTO template_versions
            (template_id, version, category_id, title, body, changed_by, changed_by_name, change_note)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
        : `INSERT INTO template_versions
            (template_id, version, category_id, title, body, changed_by, change_note)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
    ).bind(
      current.id,
      current.version,
      current.category_id,
      current.title,
      current.body,
      user.id,
      ...(hasVersionNames ? [user.displayName, "Vorlage archiviert"] : ["Vorlage archiviert"]),
    ),
    env.DB.prepare(
      hasTemplateNames
        ? `UPDATE templates
           SET active = 0, updated_by = ?1, updated_by_name = ?2, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?3`
        : `UPDATE templates
           SET active = 0, updated_by = ?1, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?2`,
    ).bind(
      user.id,
      ...(hasTemplateNames ? [user.displayName, templateId] : [templateId]),
    ),
  ]);

  await audit(env, user.id, "delete", "template", templateId);
  return json({ ok: true });
}

async function handleCommands(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
  if (path === "/api/commands" && request.method === "POST") {
    requireRole(user, ["editor", "admin"]);

    const body = await readJson<Record<string, unknown>>(request);
    const category = requiredString(body.category, "Kategorie", 60);
    const name = requiredString(body.name, "Name", 120);
    const command = requiredString(body.command, "Befehl", 5000);
    const description = requiredString(body.description, "Beschreibung", 2000);
    const shell = requiredString(body.shell, "Shell", 20);
    const riskLevel = requiredString(body.riskLevel ?? "low", "Risiko", 20);

    if (!["cmd", "powershell", "windows"].includes(shell)) {
      throw new HttpError(400, "Ungültige Shell.");
    }
    if (!["low", "medium", "high"].includes(riskLevel)) {
      throw new HttpError(400, "Ungültige Risikostufe.");
    }

    const duplicate = await env.DB.prepare(
      `SELECT id FROM commands
       WHERE active = 1 AND (lower(name) = lower(?1) OR command = ?2)
       LIMIT 1`,
    ).bind(name, command).first();

    if (duplicate) throw new HttpError(409, "Befehl oder Bezeichnung existiert bereits.");

    const hasCommandNames = await hasColumn(env, "commands", "created_by_name");
    const result = hasCommandNames
      ? await env.DB.prepare(
        `INSERT INTO commands
          (category, name, command, description, shell, requires_admin, risk_level,
           remote_capable, restart_required, created_by, created_by_name, updated_by, updated_by_name)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?10, ?11)`,
      )
        .bind(
          category,
          name,
          command,
          description,
          shell,
          body.requiresAdmin ? 1 : 0,
          riskLevel,
          body.remoteCapable ? 1 : 0,
          body.restartRequired ? 1 : 0,
          user.id,
          user.displayName,
        )
        .run()
      : await env.DB.prepare(
        `INSERT INTO commands
          (category, name, command, description, shell, requires_admin, risk_level,
           remote_capable, restart_required, created_by, updated_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)`,
      )
        .bind(
          category,
          name,
          command,
          description,
          shell,
          body.requiresAdmin ? 1 : 0,
          riskLevel,
          body.remoteCapable ? 1 : 0,
          body.restartRequired ? 1 : 0,
          user.id,
        )
        .run();

    await audit(env, user.id, "create", "command", Number(result.meta.last_row_id));
    return json({ id: Number(result.meta.last_row_id) }, { status: 201 });
  }

  const commandMatch = path.match(/^\/api\/commands\/(\d+)$/);
  if (commandMatch && request.method === "DELETE") {
    requireRole(user, ["admin"]);
    const commandId = positiveInteger(commandMatch[1], "Befehls-ID");

    const hasCommandNames = await hasColumn(env, "commands", "updated_by_name");
    const result = await env.DB.prepare(
      hasCommandNames
        ? `UPDATE commands
           SET active = 0, updated_by = ?1, updated_by_name = ?2, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?3 AND active = 1`
        : `UPDATE commands
           SET active = 0, updated_by = ?1, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?2 AND active = 1`,
    ).bind(user.id, ...(hasCommandNames ? [user.displayName, commandId] : [commandId])).run();

    if ((result.meta.changes ?? 0) === 0) {
      throw new HttpError(404, "Befehl wurde nicht gefunden.");
    }

    await audit(env, user.id, "delete", "command", commandId);
    return json({ ok: true });
  }

  return null;
}

async function handleFeedback(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
  if (path === "/api/feedback" && request.method === "GET") {
    await ensureFeedbackTable(env);
    const adminView = user.role === "admin";
    const result = await withSchemaFallback(
      async () => {
        const query = env.DB.prepare(
          `SELECT f.id, f.type, f.title, f.message, f.status, f.submitted_by,
                  COALESCE(f.submitted_by_name, u.display_name, 'Ehemaliger Mitarbeiter') AS submitted_by_name,
                  f.admin_note, f.created_at, f.updated_at
           FROM feedback_items f
           LEFT JOIN users u ON u.id = f.submitted_by
           WHERE ${adminView ? "1 = 1" : "f.submitted_by = ?1"}
           ORDER BY f.created_at DESC`,
        );
        return adminView
          ? query.all<FeedbackRow>()
          : query.bind(user.id).all<FeedbackRow>();
      },
      async () => {
        const query = env.DB.prepare(
          `SELECT f.id, f.type, f.title, f.message, f.status, f.submitted_by,
                  u.display_name AS submitted_by_name, f.admin_note,
                  f.created_at, f.updated_at
           FROM feedback_items f
           JOIN users u ON u.id = f.submitted_by
           WHERE ${adminView ? "1 = 1" : "f.submitted_by = ?1"}
           ORDER BY f.created_at DESC`,
        );
        return adminView
          ? query.all<FeedbackRow>()
          : query.bind(user.id).all<FeedbackRow>();
      },
    );

    return json({ items: result.results });
  }

  if (path === "/api/feedback" && request.method === "POST") {
    await ensureFeedbackTable(env);
    const body = await readJson<Record<string, unknown>>(request);
    const type = requiredString(body.type, "Typ", 20);
    const title = requiredString(body.title, "Titel", 160);
    const message = requiredString(body.message, "Beschreibung", 4000);

    if (!["bug", "improvement"].includes(type)) {
      throw new HttpError(400, "Ungültiger Feedback-Typ.");
    }

    const result = await withSchemaFallback(
      () => env.DB.prepare(
        `INSERT INTO feedback_items (type, title, message, submitted_by, submitted_by_name)
         VALUES (?1, ?2, ?3, ?4, ?5)`,
      ).bind(type, title, message, user.id, user.displayName).run(),
      () => env.DB.prepare(
        `INSERT INTO feedback_items (type, title, message, submitted_by)
         VALUES (?1, ?2, ?3, ?4)`,
      ).bind(type, title, message, user.id).run(),
    );

    const feedbackId = Number(result.meta.last_row_id);
    await audit(env, user.id, "submit", "feedback_item", feedbackId, { type });
    return json({ id: feedbackId }, { status: 201 });
  }

  const feedbackMatch = path.match(/^\/api\/feedback\/(\d+)$/);
  if (feedbackMatch && request.method === "PATCH") {
    requireRole(user, ["admin"]);
    const feedbackId = positiveInteger(feedbackMatch[1], "Feedback-ID");
    const body = await readJson<Record<string, unknown>>(request);
    const status = body.status ? requiredString(body.status, "Status", 20) : null;
    const adminNote = body.adminNote === undefined
      ? null
      : optionalString(body.adminNote, 2000);

    if (status && !["open", "planned", "closed"].includes(status)) {
      throw new HttpError(400, "Ungültiger Feedback-Status.");
    }

    const result = await env.DB.prepare(
      `UPDATE feedback_items
       SET status = COALESCE(?1, status),
           admin_note = CASE WHEN ?2 = 1 THEN ?3 ELSE admin_note END,
           reviewed_by = ?4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?5`,
    ).bind(
      status,
      body.adminNote === undefined ? 0 : 1,
      adminNote,
      user.id,
      feedbackId,
    ).run();

    if ((result.meta.changes ?? 0) === 0) {
      throw new HttpError(404, "Feedback wurde nicht gefunden.");
    }

    await audit(env, user.id, "update", "feedback_item", feedbackId, { status });
    return json({ ok: true });
  }

  return null;
}

async function handleUsers(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
  if (path === "/api/users" && request.method === "GET") {
    requireRole(user, ["admin"]);
    const result = await env.DB.prepare(
      `SELECT id, username, display_name, role, active, created_at
       FROM users ORDER BY display_name COLLATE NOCASE`,
    ).all();
    return json({ users: result.results });
  }

  if (path === "/api/users" && request.method === "POST") {
    requireRole(user, ["admin"]);
    const body = await readJson<Record<string, unknown>>(request);
    const username = validUsername(body.username);
    const displayName = requiredString(body.displayName, "Anzeigename", 80);
    const password = validPassword(body.password);
    const role = requiredString(body.role ?? "employee", "Rolle", 20) as Role;

    if (!["employee", "editor", "admin"].includes(role)) {
      throw new HttpError(400, "Ungültige Rolle.");
    }

    const passwordData = await hashPassword(password);
    const result = await env.DB.prepare(
      `INSERT INTO users
        (username, display_name, password_hash, password_salt, password_iterations, role)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    )
      .bind(
        username,
        displayName,
        passwordData.hash,
        passwordData.salt,
        passwordData.iterations,
        role,
      )
      .run();

    await audit(env, user.id, "create", "user", Number(result.meta.last_row_id), { role });
    return json({ id: Number(result.meta.last_row_id) }, { status: 201 });
  }

  const userMatch = path.match(/^\/api\/users\/(\d+)$/);
  if (userMatch && request.method === "PATCH") {
    requireRole(user, ["admin"]);
    const targetId = positiveInteger(userMatch[1], "Benutzer-ID");
    const body = await readJson<Record<string, unknown>>(request);
    const role = body.role ? requiredString(body.role, "Rolle", 20) as Role : null;

    if (role && !["employee", "editor", "admin"].includes(role)) {
      throw new HttpError(400, "Ungültige Rolle.");
    }

    if (targetId === user.id && body.active === false) {
      throw new HttpError(400, "Das eigene Konto kann nicht deaktiviert werden.");
    }

    await env.DB.prepare(
      `UPDATE users
       SET display_name = COALESCE(?1, display_name),
           role = COALESCE(?2, role),
           active = COALESCE(?3, active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?4`,
    )
      .bind(
        body.displayName ? requiredString(body.displayName, "Anzeigename", 80) : null,
        role,
        typeof body.active === "boolean" ? (body.active ? 1 : 0) : null,
        targetId,
      )
      .run();

    if (body.password) {
      const passwordData = await hashPassword(validPassword(body.password));
      await env.DB.prepare(
        `UPDATE users
         SET password_hash = ?1, password_salt = ?2, password_iterations = ?3,
             failed_login_count = 0, locked_until = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?4`,
      )
        .bind(
          passwordData.hash,
          passwordData.salt,
          passwordData.iterations,
          targetId,
        )
        .run();
      await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?1").bind(targetId).run();
    }

    await audit(env, user.id, "update", "user", targetId);
    return json({ ok: true });
  }

  if (userMatch && request.method === "DELETE") {
    requireRole(user, ["admin"]);
    const targetId = positiveInteger(userMatch[1], "Benutzer-ID");

    if (targetId === user.id) {
      throw new HttpError(400, "Das eigene Konto kann nicht gelöscht werden.");
    }

    await withSchemaFallback(
      () => env.DB.prepare("UPDATE templates SET created_by = NULL WHERE created_by = ?1")
        .bind(targetId).run(),
      () => env.DB.prepare(
        "UPDATE templates SET created_by = ?2, updated_at = updated_at WHERE created_by = ?1",
      ).bind(targetId, user.id).run(),
    );
    await withSchemaFallback(
      () => env.DB.prepare("UPDATE templates SET updated_by = NULL WHERE updated_by = ?1")
        .bind(targetId).run(),
      () => env.DB.prepare(
        "UPDATE templates SET updated_by = ?2, updated_at = updated_at WHERE updated_by = ?1",
      ).bind(targetId, user.id).run(),
    );
    await withSchemaFallback(
      () => env.DB.prepare("UPDATE commands SET created_by = NULL WHERE created_by = ?1")
        .bind(targetId).run(),
      () => env.DB.prepare("UPDATE commands SET created_by = ?2 WHERE created_by = ?1")
        .bind(targetId, user.id).run(),
    );
    await withSchemaFallback(
      () => env.DB.prepare("UPDATE commands SET updated_by = NULL WHERE updated_by = ?1")
        .bind(targetId).run(),
      () => env.DB.prepare("UPDATE commands SET updated_by = ?2 WHERE updated_by = ?1")
        .bind(targetId, user.id).run(),
    );
    await withSchemaFallback(
      () => env.DB.prepare("UPDATE template_versions SET changed_by = NULL WHERE changed_by = ?1")
        .bind(targetId).run(),
      () => env.DB.prepare("UPDATE template_versions SET changed_by = ?2 WHERE changed_by = ?1")
        .bind(targetId, user.id).run(),
    );
    await ignoreMissingTable(() => withSchemaFallback(
      () => env.DB.prepare("UPDATE template_proposals SET submitted_by = NULL WHERE submitted_by = ?1")
        .bind(targetId).run(),
      () => env.DB.prepare("UPDATE template_proposals SET submitted_by = ?2 WHERE submitted_by = ?1")
        .bind(targetId, user.id).run(),
    ));
    await ignoreMissingTable(() => env.DB.prepare(
      "UPDATE template_proposals SET reviewed_by = NULL WHERE reviewed_by = ?1",
    ).bind(targetId).run());
    await ignoreMissingTable(() => withSchemaFallback(
      () => env.DB.prepare("UPDATE feedback_items SET submitted_by = NULL WHERE submitted_by = ?1")
        .bind(targetId).run(),
      () => env.DB.prepare("UPDATE feedback_items SET submitted_by = ?2 WHERE submitted_by = ?1")
        .bind(targetId, user.id).run(),
    ));
    await ignoreMissingTable(() => env.DB.prepare(
      "UPDATE feedback_items SET reviewed_by = NULL WHERE reviewed_by = ?1",
    ).bind(targetId).run());

    const deleteResult = await env.DB.prepare("DELETE FROM users WHERE id = ?1").bind(targetId).run();
    if (!deleteResult.meta.changes) {
      throw new HttpError(404, "Benutzer nicht gefunden.");
    }

    await audit(env, user.id, "delete", "user", targetId);
    return json({ ok: true });
  }

  return null;
}


async function handleHistory(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
  if (path === "/api/history" && request.method === "GET") {
    const hasVersionNames = await hasColumn(env, "template_versions", "changed_by_name");
    const [versions, trash] = await Promise.all([
      env.DB.prepare(
        `SELECT v.id, v.template_id, v.version, v.title, v.created_at,
                ${hasVersionNames
    ? "COALESCE(v.changed_by_name, u.display_name, 'Ehemaliger Mitarbeiter')"
    : "u.display_name"} AS changed_by_name
         FROM template_versions v
         ${hasVersionNames ? "LEFT JOIN users u ON u.id = v.changed_by" : "JOIN users u ON u.id = v.changed_by"}
         ORDER BY v.created_at DESC
         LIMIT 100`,
      ).all(),
      env.DB.prepare(
        `SELECT id, title, version, updated_at
         FROM templates
         WHERE active = 0
         ORDER BY updated_at DESC
         LIMIT 100`,
      ).all(),
    ]);

    return json({
      versions: versions.results,
      trash: trash.results,
    });
  }

  const versionMatch = path.match(/^\/api\/history\/version\/(\d+)\/restore$/);
  if (versionMatch && request.method === "POST") {
    requireRole(user, ["editor", "admin"]);
    const versionId = positiveInteger(versionMatch[1], "Versions-ID");

    const version = await env.DB.prepare(
      `SELECT id, template_id, version, category_id, title, body
       FROM template_versions
       WHERE id = ?1`,
    ).bind(versionId).first<{
      id: number;
      template_id: number;
      version: number;
      category_id: number;
      title: string;
      body: string;
    }>();

    if (!version) throw new HttpError(404, "Version wurde nicht gefunden.");

    const current = await env.DB.prepare(
      `SELECT id, version, category_id, title, body
       FROM templates WHERE id = ?1`,
    ).bind(version.template_id).first<{
      id: number;
      version: number;
      category_id: number;
      title: string;
      body: string;
    }>();

    if (!current) throw new HttpError(404, "Zielvorlage wurde nicht gefunden.");

    const hasVersionNames = await hasColumn(env, "template_versions", "changed_by_name");
    const hasTemplateNames = await hasColumn(env, "templates", "updated_by_name");
    await env.DB.batch([
      env.DB.prepare(
        hasVersionNames
          ? `INSERT INTO template_versions
              (template_id, version, category_id, title, body, changed_by, changed_by_name, change_note)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
          : `INSERT INTO template_versions
              (template_id, version, category_id, title, body, changed_by, change_note)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
      ).bind(
        current.id,
        current.version,
        current.category_id,
        current.title,
        current.body,
        user.id,
        ...(hasVersionNames ? [user.displayName, `Automatische Sicherung vor Wiederherstellung von Version ${version.version}`] : [`Automatische Sicherung vor Wiederherstellung von Version ${version.version}`]),
      ),
      env.DB.prepare(
        hasTemplateNames
          ? `UPDATE templates
             SET category_id = ?1, title = ?2, body = ?3, version = version + 1,
                 active = 1, updated_by = ?4, updated_by_name = ?5, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?6`
          : `UPDATE templates
             SET category_id = ?1, title = ?2, body = ?3, version = version + 1,
                 active = 1, updated_by = ?4, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?5`,
      ).bind(
        version.category_id,
        version.title,
        version.body,
        user.id,
        ...(hasTemplateNames ? [user.displayName, version.template_id] : [version.template_id]),
      ),
    ]);

    await audit(env, user.id, "restore", "template_version", versionId, {
      templateId: version.template_id,
      restoredVersion: version.version,
    });
    return json({ ok: true });
  }

  const templateMatch = path.match(/^\/api\/history\/template\/(\d+)\/restore$/);
  if (templateMatch && request.method === "POST") {
    requireRole(user, ["editor", "admin"]);
    const templateId = positiveInteger(templateMatch[1], "Vorlagen-ID");

    const hasTemplateNames = await hasColumn(env, "templates", "updated_by_name");
    const result = await env.DB.prepare(
      hasTemplateNames
        ? `UPDATE templates
           SET active = 1, updated_by = ?1, updated_by_name = ?2, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?3 AND active = 0`
        : `UPDATE templates
           SET active = 1, updated_by = ?1, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?2 AND active = 0`,
    ).bind(user.id, ...(hasTemplateNames ? [user.displayName, templateId] : [templateId])).run();

    if ((result.meta.changes ?? 0) === 0) {
      throw new HttpError(404, "Archivierte Vorlage wurde nicht gefunden.");
    }

    await audit(env, user.id, "restore", "template", templateId);
    return json({ ok: true });
  }

  return null;
}

async function handleGame(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
  if (path === "/api/game/leaderboard" && request.method === "GET") {
    const result = await withSchemaFallback(
      () => env.DB.prepare(
        `SELECT COALESCE(g.display_name, u.display_name, 'Ehemaliger Mitarbeiter') AS display_name,
                MAX(g.score) AS score,
                MAX(g.created_at) AS achieved_at
         FROM game_scores g
         LEFT JOIN users u ON u.id = g.user_id
         GROUP BY
           COALESCE(g.user_id, g.display_name),
           COALESCE(g.display_name, u.display_name, 'Ehemaliger Mitarbeiter')
         ORDER BY score DESC, achieved_at ASC
         LIMIT 20`,
      ).all(),
      () => env.DB.prepare(
        `SELECT u.display_name AS display_name,
                MAX(g.score) AS score,
                MAX(g.created_at) AS achieved_at
         FROM game_scores g
         JOIN users u ON u.id = g.user_id
         GROUP BY g.user_id, u.display_name
         ORDER BY score DESC, achieved_at ASC
         LIMIT 20`,
      ).all(),
    );
    return json({ leaderboard: result.results });
  }

  if (path === "/api/game/scores" && request.method === "POST") {
    const body = await readJson<Record<string, unknown>>(request);
    const score = Number(body.score);
    const durationMs = Number(body.durationMs);

    if (!Number.isInteger(score) || score < 0 || score > 1_000_000) {
      throw new HttpError(400, "Ungültiger Punktestand.");
    }
    if (!Number.isInteger(durationMs) || durationMs < 1000 || durationMs > 3_600_000) {
      throw new HttpError(400, "Ungültige Spieldauer.");
    }

    const maximumPlausibleScore = Math.floor(durationMs / 25) + 250;
    if (score > maximumPlausibleScore) {
      throw new HttpError(400, "Punktestand konnte nicht plausibilisiert werden.");
    }

    await withSchemaFallback(
      () => env.DB.prepare(
        "INSERT INTO game_scores (user_id, display_name, score, duration_ms) VALUES (?1, ?2, ?3, ?4)",
      ).bind(user.id, user.displayName, score, durationMs).run(),
      () => env.DB.prepare(
        "INSERT INTO game_scores (user_id, score, duration_ms) VALUES (?1, ?2, ?3)",
      ).bind(user.id, score, durationMs).run(),
    );

    return json({ ok: true }, { status: 201 });
  }

  if (path === "/api/game/typing/leaderboard" && request.method === "GET") {
    await ensureTypingScoresTable(env);
    const result = await withSchemaFallback(
      () => env.DB.prepare(
        `SELECT COALESCE(t.display_name, u.display_name, 'Ehemaliger Mitarbeiter') AS display_name,
                MAX(t.wpm) AS wpm,
                MAX(t.accuracy) AS accuracy,
                MAX(t.created_at) AS achieved_at
         FROM typing_game_scores t
         LEFT JOIN users u ON u.id = t.user_id
         GROUP BY
           COALESCE(t.user_id, t.display_name),
           COALESCE(t.display_name, u.display_name, 'Ehemaliger Mitarbeiter')
         ORDER BY wpm DESC, accuracy DESC, achieved_at ASC
         LIMIT 20`,
      ).all(),
      () => env.DB.prepare(
        `SELECT u.display_name AS display_name,
                MAX(t.wpm) AS wpm,
                MAX(t.accuracy) AS accuracy,
                MAX(t.created_at) AS achieved_at
         FROM typing_game_scores t
         JOIN users u ON u.id = t.user_id
         GROUP BY t.user_id, u.display_name
         ORDER BY wpm DESC, accuracy DESC, achieved_at ASC
         LIMIT 20`,
      ).all(),
    );
    return json({ leaderboard: result.results });
  }

  if (path === "/api/game/typing/scores" && request.method === "POST") {
    await ensureTypingScoresTable(env);
    const body = await readJson<Record<string, unknown>>(request);
    const wpm = Number(body.wpm);
    const accuracy = Number(body.accuracy);
    const correctChars = Number(body.correctChars);
    const totalChars = Number(body.totalChars);
    const durationMs = Number(body.durationMs);

    if (!Number.isInteger(wpm) || wpm < 0 || wpm > 400) {
      throw new HttpError(400, "Ungültige Schreibgeschwindigkeit.");
    }
    if (!Number.isInteger(accuracy) || accuracy < 0 || accuracy > 100) {
      throw new HttpError(400, "Ungültige Genauigkeit.");
    }
    if (!Number.isInteger(correctChars) || correctChars < 0) {
      throw new HttpError(400, "Ungültige Zeichenzahl.");
    }
    if (!Number.isInteger(totalChars) || totalChars < 1) {
      throw new HttpError(400, "Ungültige Gesamtzeichenzahl.");
    }
    if (!Number.isInteger(durationMs) || durationMs < 10_000 || durationMs > 300_000) {
      throw new HttpError(400, "Ungültige Spieldauer.");
    }
    if (correctChars > totalChars) {
      throw new HttpError(400, "Ungültige Trefferzahl.");
    }

    const plausibleWpm = Math.ceil((correctChars / 5) / (durationMs / 60_000)) + 5;
    if (wpm > plausibleWpm) {
      throw new HttpError(400, "Ergebnis konnte nicht plausibilisiert werden.");
    }

    await withSchemaFallback(
      () => env.DB.prepare(
        `INSERT INTO typing_game_scores
          (user_id, display_name, wpm, accuracy, correct_chars, total_chars, duration_ms)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
      ).bind(user.id, user.displayName, wpm, accuracy, correctChars, totalChars, durationMs).run(),
      () => env.DB.prepare(
        `INSERT INTO typing_game_scores
          (user_id, wpm, accuracy, correct_chars, total_chars, duration_ms)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
      ).bind(user.id, wpm, accuracy, correctChars, totalChars, durationMs).run(),
    );

    return json({ ok: true }, { status: 201 });
  }

  return null;
}

async function handleApi(request: Request, env: Env): Promise<Response> {
  assertSameOrigin(request);
  const path = routePath(request);
  const user = await authenticate(request, env);

  const authResponse = await handleAuth(request, env, user, path);
  if (authResponse) return authResponse;

  const authenticatedUser = requireUser(user);

  const handlers = [
    handleBootstrap,
    handleSettings,
    handleProposals,
    handleCategories,
    handleTemplates,
    handleCommands,
    handleFeedback,
    handleUsers,
    handleHistory,
    handleGame,
  ];

  for (const handler of handlers) {
    const response = await handler(request, env, authenticatedUser, path);
    if (response) return response;
  }

  throw new HttpError(404, "API-Endpunkt nicht gefunden.");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = routePath(request);

    try {
      if (isApi(path)) return await handleApi(request, env);
      return await env.ASSETS.fetch(request);
    } catch (error) {
      return errorResponse(error);
    }
  },
} satisfies ExportedHandler<Env>;
