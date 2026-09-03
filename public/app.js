const state = {
  user: null,
  categories: [],
  templates: [],
  commands: [],
  solutions: [],
  proposals: [],
  contentProposals: [],
  avatars: [],
  cases: [],
  escalationLevels: [],
  reminders: [],
  feedbackItems: [],
  auditEntries: [],
  settings: {
    signatureName: "",
    favorites: { templates: [], commands: [] },
    preferences: { theme: "cyan" },
  },
  activeView: "templates",
  recentItems: [],
};

const THEMES = {
  cyan: { label: "Cyan", next: "magenta" },
  magenta: { label: "Magenta", next: "lime" },
  lime: { label: "Lime", next: "amber" },
  amber: { label: "Amber", next: "cyan" },
};

const TYPING_PROMPTS = [
  "Bitte pruefen Sie zuerst die Netzwerkverbindung und bestaetigen Sie dann den aktuellen Fehlerzeitpunkt im Ticket.",
  "Der Benutzer wurde ueber die durchgefuehrten Schritte informiert und gebeten den Rechner einmal neu zu starten.",
  "Vor der Eskalation bitte Logdateien sichern, Screenshot anhaengen und den betroffenen Arbeitsplatz dokumentieren.",
  "Die Vorlage wurde aktualisiert und kann ab sofort fuer Rueckmeldungen an Mitarbeitende direkt verwendet werden.",
  "Bitte kontrollieren Sie ob das VPN Profil korrekt ausgewaehlt ist und die Mehrfaktor Anmeldung erfolgreich abgeschlossen wurde.",
  "Falls der Druckauftrag weiterhin haengen bleibt, leeren Sie bitte die Warteschlange und testen den Druck erneut mit einer kleinen Datei.",
  "Dokumentieren Sie im Ticket, welche Systeme betroffen sind, seit wann die Stoerung besteht und welche Auswirkungen fuer den Mitarbeiter sichtbar sind.",
  "Bevor ein Zugriff entfernt wird, sollte die Freigabe des Fachbereichs vorliegen und im Vorgang eindeutig nachvollziehbar abgelegt werden.",
  "Wenn die Anmeldung im Browser fehlschlaegt, pruefen Sie Cookies, gespeicherte Sitzungen und einen moeglichen Hinweis auf eine gesperrte Identitaet.",
  "Bei einer Softwareinstallation bitte immer Version, Quelle, benoetigte Rechte und einen erfolgreichen Funktionstest im Ticket vermerken.",
  "Wird ein Konto entsperrt, sollte der Benutzer zusaetzlich auf Passwortaenderung, Mehrfaktor Anmeldung und die geltenden Sicherheitsregeln hingewiesen werden.",
  "Fuer eine saubere Eskalation brauchen wir Reproduktionsschritte, Zeitpunkt, Fehlermeldung, betroffene Umgebung und die bereits getesteten Massnahmen.",
];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  // Abgelaufene Sitzung: Nach Ablauf der Sitzungsdauer (Standard 12 Stunden)
  // beantwortet der Worker jede Anfrage mit 401. Ohne Behandlung liefe jede
  // Aktion in eine unverstaendliche Fehlermeldung, deshalb hier zurueck zum
  // Login. Der Login-Aufruf selbst ist ausgenommen -- dort ist 401 die normale
  // Antwort auf falsche Zugangsdaten und gehoert ins Formular.
  if (response.status === 401 && !path.startsWith("/api/auth/")) {
    handleExpiredSession();
    throw new Error("Sitzung abgelaufen.");
  }

  if (!response.ok) {
    const error = new Error(data.error || "Anfrage fehlgeschlagen.");
    error.details = data.details;
    throw error;
  }
  return data;
}

/**
 * Bringt die Oberflaeche nach einer abgelaufenen Sitzung zurueck zum Login.
 *
 * `sessionExpired` verhindert, dass parallele Anfragen den Hinweis mehrfach
 * anzeigen -- beim Laden der Seite laufen mehrere Requests gleichzeitig.
 */
let sessionExpired = false;

function handleExpiredSession() {
  if (sessionExpired) return;
  sessionExpired = true;

  // Ohne Stopp liefe das Chat-Polling im Hintergrund endlos gegen 401 weiter.
  stopChatPolling();

  $("#app-view").classList.add("hidden");
  $("#login-view").classList.remove("hidden");
  $("#chat-panel").classList.add("hidden");
  $("#chat-toggle").classList.add("hidden");
  document.body.classList.remove("chat-open");
  $("#login-message").textContent =
    "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.";
  $("#login-password").value = "";
  if (state.user) $("#login-username").value = state.user.username;
  state.user = null;
}

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = String(value ?? "");
  return element.innerHTML;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/**
 * Datum mit Uhrzeit -- fuer das Aenderungsprotokoll, wo die Reihenfolge
 * innerhalb eines Tages zaehlt.
 *
 * D1 liefert Zeitstempel als "YYYY-MM-DD HH:MM:SS" in UTC. Ohne das
 * angehaengte "Z" wuerde der Browser sie als Ortszeit deuten und die Uhrzeit
 * um den Zeitzonenversatz verschieben.
 */
function formatDateTime(value) {
  if (!value) return "";
  const normalized = String(value).includes("T")
    ? String(value)
    : `${String(value).replace(" ", "T")}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function highlightPlaceholders(value) {
  return escapeHtml(value).replace(
    /\[([^\]]+)\]/g,
    '<span class="placeholder">[$1]</span>',
  );
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 2600);
}

function roleLabel(role) {
  return { employee: "Mitarbeiter", editor: "Redakteur", admin: "Administrator" }[role] || role;
}

function replaceLiteral(value, search, replacement) {
  return String(value).split(search).join(replacement);
}

function isAdmin() {
  return state.user?.role === "admin";
}

function normalizeFavorites(value) {
  const favorites = value && typeof value === "object" ? value : {};
  return {
    templates: Array.isArray(favorites.templates)
      ? favorites.templates.map(Number).filter(Number.isInteger)
      : [],
    commands: Array.isArray(favorites.commands)
      ? favorites.commands.map(Number).filter(Number.isInteger)
      : [],
  };
}

function isFavorite(type, id) {
  const collection = type === "template"
    ? state.settings.favorites.templates
    : state.settings.favorites.commands;
  return collection.includes(Number(id));
}

async function persistSettings() {
  await api("/api/settings", {
    method: "PUT",
    body: JSON.stringify({
      signatureName: state.settings.signatureName,
      favorites: state.settings.favorites,
      preferences: state.settings.preferences,
    }),
  });
}

/* ============================================================
   Pixel-Avatare

   Gezeichnet wird auf einem Raster von 16x16 Feldern. Gespeichert werden nur
   die gewaehlten Nummern und Farben -- daraus entsteht das Bild jedes Mal neu.
   Das haelt einen Avatar bei rund 60 Zeichen und erlaubt es, die Figuren
   spaeter zu verfeinern, ohne gespeicherte Daten anzufassen.
   ============================================================ */

const AVATAR_SKINS = [
  "#8d5524", "#c68642", "#e0ac69", "#f1c27d", "#ffdbac", "#5c3317",
];
const AVATAR_HAIR_COLORS = [
  "#2c1b18", "#4a312c", "#8b4513", "#b55239", "#d4a017", "#e8e3d9",
  "#6b7280", "#7c3aed", "#2ea86e", "#d55f5f",
];
const AVATAR_SHIRT_COLORS = [
  "#4a7cff", "#2ea86e", "#d55f5f", "#d89b36", "#8b5cf6", "#1f9d8b",
  "#c05621", "#5b8def", "#42a7c6", "#6b7280",
];

const AVATAR_GRID = 16;
const AVATAR_DEFAULT = {
  skin: 3, hair: 0, hairColor: 0, eyes: 0, mouth: 0, shirt: 0, accessory: 0,
};

const AVATAR_LABELS = {
  skin: "Hautton",
  hair: "Frisur",
  hairColor: "Haarfarbe",
  eyes: "Augen",
  mouth: "Mund",
  shirt: "Oberteil",
  accessory: "Zubehör",
};

const AVATAR_SHAPE_COUNTS = { hair: 8, eyes: 5, mouth: 4, accessory: 6 };

/** Begrenzt eine Auswahl auf den gueltigen Bereich -- gleiche Regel wie im Worker. */
function avatarIndex(value, max) {
  const zahl = Math.floor(Number(value));
  return Number.isFinite(zahl) && zahl >= 0 && zahl < max ? zahl : 0;
}

function normalizeAvatar(value) {
  const quelle = value && typeof value === "object" ? value : {};
  return {
    skin: avatarIndex(quelle.skin, AVATAR_SKINS.length),
    hair: avatarIndex(quelle.hair, AVATAR_SHAPE_COUNTS.hair),
    hairColor: avatarIndex(quelle.hairColor, AVATAR_HAIR_COLORS.length),
    eyes: avatarIndex(quelle.eyes, AVATAR_SHAPE_COUNTS.eyes),
    mouth: avatarIndex(quelle.mouth, AVATAR_SHAPE_COUNTS.mouth),
    shirt: avatarIndex(quelle.shirt, AVATAR_SHIRT_COLORS.length),
    accessory: avatarIndex(quelle.accessory, AVATAR_SHAPE_COUNTS.accessory),
  };
}

/**
 * Erzeugt aus einem Namen einen Avatar.
 *
 * Wer noch keinen gebaut hat, bekommt trotzdem ein eigenes Gesicht statt einer
 * grauen Platzhalterflaeche. Der Name wird dafuer in eine Zahl gefaltet --
 * gleiche Person, gleiches Aussehen, ohne dass etwas gespeichert werden muss.
 */
function avatarFromName(name) {
  let hash = 0;
  for (const zeichen of String(name || "?")) {
    hash = (hash * 31 + zeichen.codePointAt(0)) >>> 0;
  }
  const teil = (teiler, max) => Math.floor(hash / teiler) % max;
  return {
    skin: teil(1, AVATAR_SKINS.length),
    hair: teil(7, AVATAR_SHAPE_COUNTS.hair),
    hairColor: teil(13, AVATAR_HAIR_COLORS.length),
    eyes: teil(31, AVATAR_SHAPE_COUNTS.eyes),
    mouth: teil(61, AVATAR_SHAPE_COUNTS.mouth),
    shirt: teil(127, AVATAR_SHIRT_COLORS.length),
    accessory: 0,
  };
}

/* Die Formen als Pixelkarten. Jeder Eintrag ist [spalte, zeile]. Das Raster
   ist 16x16; Kopf und Koerper sitzen fest, variabel sind Haare und Zubehoer. */

const AVATAR_HAIR_SHAPES = [
  // 0: kurz -- eine flache Kappe
  [[4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[10,2],[11,2],
   [3,3],[4,3],[11,3],[12,3]],
  // 1: Seitenscheitel -- eine Seite deutlich hoeher
  [[4,1],[5,1],[6,1],[7,1],[8,1],
   [4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[10,2],[11,2],
   [3,3],[4,3],[5,3],[11,3],[12,3]],
  // 2: lang -- faellt bis auf die Schultern
  [[4,1],[5,1],[6,1],[7,1],[8,1],[9,1],[10,1],[11,1],
   [3,2],[4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[10,2],[11,2],[12,2],
   [3,3],[12,3],[2,4],[3,4],[12,4],[13,4],[2,5],[3,5],[12,5],[13,5],
   [2,6],[3,6],[12,6],[13,6],[2,7],[3,7],[12,7],[13,7],[3,8],[12,8],
   // Bis ueber die Schultern, sonst verschwindet die Laenge hinter dem Oberteil.
   [3,9],[12,9],[3,10],[12,10],[3,11],[12,11],[2,12],[3,12],[12,12],[13,12],
   [2,13],[13,13]],
  // 3: Dutt -- Knoten oben auf dem Kopf
  [[7,0],[8,0],[6,1],[7,1],[8,1],[9,1],
   [4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[10,2],[11,2],
   [3,3],[4,3],[11,3],[12,3]],
  // 4: Locken -- ausgefranste Silhouette
  [[5,0],[7,0],[9,0],[10,0],
   [3,1],[4,1],[6,1],[8,1],[10,1],[11,1],
   [3,2],[4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[10,2],[11,2],[12,2],
   [2,3],[3,3],[4,3],[11,3],[12,3],[13,3],[2,4],[13,4]],
  // 5: Glatze -- nur ein Kranz an den Seiten
  [[3,4],[3,5],[3,6],[12,4],[12,5],[12,6]],
  // 6: Irokese -- schmaler hoher Kamm
  [[7,0],[8,0],[7,1],[8,1],[6,1],[9,1],
   [6,2],[7,2],[8,2],[9,2],[5,2],[10,2],
   [3,3],[4,3],[11,3],[12,3]],
  // 7: Pony -- gerade Kante tief in der Stirn
  [[4,1],[5,1],[6,1],[7,1],[8,1],[9,1],[10,1],[11,1],
   [3,2],[4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[10,2],[11,2],[12,2],
   [3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[10,3],[11,3],[12,3],
   [3,4],[12,4],[3,5],[12,5]],
];

/* Augen: [linkes Auge, rechtes Auge] als Pixel, plus optionale Extras. */
const AVATAR_EYE_SHAPES = [
  [[5,6],[10,6]],                                  // 0: Punkte
  [[5,6],[6,6],[9,6],[10,6]],                      // 1: breit
  [[5,5],[5,6],[10,5],[10,6]],                     // 2: gross
  [[5,6],[9,6],[10,6]],                            // 3: zwinkernd
  [[5,5],[6,6],[10,5],[9,6]],                      // 4: schraeg
];

const AVATAR_MOUTH_SHAPES = [
  [[7,9],[8,9]],                                   // 0: neutral
  [[6,9],[9,9],[7,10],[8,10]],                     // 1: laecheln
  [[7,9],[8,9],[7,10],[8,10]],                     // 2: offen
  [[6,9],[7,10],[8,10],[9,9]],                     // 3: grinsen
];

/* Zubehoer wird in eigener Farbe gezeichnet: [pixel, farbe]. */
const AVATAR_ACCESSORIES = [
  null,                                            // 0: keins
  // Brille: Rahmen um die Augen, Steg dazwischen -- die Augenpixel selbst
  // bleiben frei, sonst verschwindet der Blick hinter dem Gestell.
  { color: "#2b2f36", pixels: [[4,5],[5,5],[6,5],[4,6],[6,6],[4,7],[5,7],[6,7],
                               [9,5],[10,5],[11,5],[9,6],[11,6],[9,7],[10,7],[11,7],
                               [7,6],[8,6]] },
  // Kappe mit Schirm
  { color: "#d55f5f", pixels: [[4,0],[5,0],[6,0],[7,0],[8,0],[9,0],[10,0],[11,0],
                               [3,1],[4,1],[5,1],[6,1],[7,1],[8,1],[9,1],[10,1],[11,1],[12,1],
                               [2,2],[3,2],[4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[10,2],[11,2],[12,2],[13,2]] },
  // Kopfhoerer: Buegel oben, Muscheln an den Ohren
  { color: "#2ea86e", pixels: [[5,1],[6,1],[7,1],[8,1],[9,1],[10,1],
                               [4,2],[11,2],[3,3],[2,4],[2,5],[2,6],[3,4],[3,5],[3,6],
                               [12,3],[13,4],[13,5],[13,6],[12,4],[12,5],[12,6]] },
  // Krawatte
  { color: "#d89b36", pixels: [[7,12],[8,12],[7,13],[8,13],[7,14],[8,14]] },
  // Stirnband
  { color: "#7c3aed", pixels: [[3,4],[4,4],[5,4],[6,4],[7,4],[8,4],[9,4],[10,4],[11,4],[12,4]] },
];

/**
 * Schaetzt, ob eine Farbe dunkel ist.
 *
 * Die Gewichtung entspricht der wahrgenommenen Helligkeit -- Gruen traegt
 * am staerksten bei, Blau am wenigsten. Wird gebraucht, damit Augen und Mund
 * auf jedem Hautton sichtbar bleiben.
 */
function istDunkel(hexFarbe) {
  const wert = parseInt(hexFarbe.slice(1), 16);
  const rot = (wert >> 16) & 255;
  const gruen = (wert >> 8) & 255;
  const blau = wert & 255;
  return (0.299 * rot + 0.587 * gruen + 0.114 * blau) < 110;
}

/**
 * Zeichnet einen Avatar auf ein Canvas.
 *
 * Die Groesse ergibt sich aus der Canvas-Breite, damit derselbe Code fuer das
 * kleine Bild neben einem Namen und die grosse Vorschau im Editor taugt.
 */
function drawAvatar(canvas, avatar) {
  const context = canvas.getContext("2d");
  const daten = normalizeAvatar(avatar);
  const feld = canvas.width / AVATAR_GRID;

  context.clearRect(0, 0, canvas.width, canvas.height);
  // Ohne diese Zeile verwischt der Browser die Kanten beim Skalieren.
  context.imageSmoothingEnabled = false;

  const male = (pixel, farbe) => {
    context.fillStyle = farbe;
    context.fillRect(pixel[0] * feld, pixel[1] * feld, feld, feld);
  };
  const maleAlle = (pixel, farbe) => pixel.forEach((p) => male(p, farbe));

  const haut = AVATAR_SKINS[daten.skin];
  const haar = AVATAR_HAIR_COLORS[daten.hairColor];
  const shirt = AVATAR_SHIRT_COLORS[daten.shirt];

  // Kopf
  const kopf = [];
  for (let x = 4; x <= 11; x++) {
    for (let y = 3; y <= 10; y++) kopf.push([x, y]);
  }
  maleAlle(kopf, haut);

  // Ohren
  maleAlle([[3, 7], [12, 7]], haut);

  // Hals
  maleAlle([[7, 11], [8, 11]], haut);

  // Schultern und Oberteil
  const koerper = [];
  for (let x = 3; x <= 12; x++) {
    for (let y = 12; y <= 15; y++) koerper.push([x, y]);
  }
  maleAlle(koerper, shirt);
  // Arme etwas dunkler, damit die Silhouette lesbar bleibt.
  maleAlle([[2, 13], [2, 14], [13, 13], [13, 14]], shirt);

  maleAlle(AVATAR_HAIR_SHAPES[daten.hair], haar);
  // Augen und Mund richten sich nach dem Hautton: Auf dunkler Haut verschwaende
  // ein fast schwarzes Auge, auf heller waere ein helles nicht zu sehen.
  maleAlle(AVATAR_EYE_SHAPES[daten.eyes], istDunkel(haut) ? "#f5f0e8" : "#1b1d22");
  maleAlle(AVATAR_MOUTH_SHAPES[daten.mouth], istDunkel(haut) ? "#e6a5a5" : "#8a4242");

  const zubehoer = AVATAR_ACCESSORIES[daten.accessory];
  if (zubehoer) maleAlle(zubehoer.pixels, zubehoer.color);
}

/**
 * Liefert das HTML fuer ein kleines Avatarbild neben einem Namen.
 *
 * Gezeichnet wird erst nachtraeglich von hydrateAvatars(): Beim Bauen der
 * Listen gibt es die Canvas-Elemente noch nicht, und ein einzelner Durchlauf
 * nach dem Einsetzen ist guenstiger als Zeichnen pro Zeile.
 */
function avatarTag(name, groesse = 24) {
  return `<canvas class="avatar-chip" width="${groesse * 2}" height="${groesse * 2}"
                  style="width:${groesse}px;height:${groesse}px"
                  data-avatar-name="${escapeHtml(name || "")}"
                  aria-hidden="true"></canvas>`;
}

/** Zeichnet alle noch leeren Avatarbilder im angegebenen Bereich. */
function hydrateAvatars(root = document) {
  root.querySelectorAll("canvas[data-avatar-name]:not([data-avatar-drawn])")
    .forEach((canvas) => {
      const name = canvas.dataset.avatarName;
      drawAvatar(canvas, avatarForName(name));
      canvas.dataset.avatarDrawn = "1";
    });
}

/**
 * Findet den Avatar zu einem Anzeigenamen.
 *
 * Gesucht wird ueber den Namen und nicht ueber die Benutzer-ID, weil Chat,
 * Vorschlaege und Statistik teils nur den Namen mitliefern -- bei geloeschten
 * Benutzern steht dort ohnehin nur noch ein Platzhalter. Wer keinen Avatar
 * gebaut hat, bekommt einen aus dem Namen abgeleiteten.
 */
function avatarForName(name) {
  const eintrag = state.avatars.find((item) => item.name === name);
  return eintrag?.avatar || avatarFromName(name);
}

/*
 * Die frueheren Themes wurden durch die Neon-Varianten ersetzt. Gespeicherte
 * Einstellungen wuerden sonst allesamt auf Cyan zurueckfallen -- diese
 * Zuordnung bringt jeden auf die farblich naechstliegende Variante.
 */
const LEGACY_THEMES = {
  forest: "lime",
  midnight: "cyan",
  dune: "amber",
  neon: "cyan",
};

function normalizePreferences(value) {
  const preferences = value && typeof value === "object" ? value : {};
  const stored = typeof preferences.theme === "string" ? preferences.theme : "";
  const theme = THEMES[stored]
    ? stored
    : LEGACY_THEMES[stored] || "cyan";
  return { theme };
}

function applyTheme(theme) {
  const resolvedTheme = THEMES[theme] ? theme : LEGACY_THEMES[theme] || "cyan";
  document.documentElement.dataset.theme = resolvedTheme;
  $("#theme-select").value = resolvedTheme;
  $("#theme-button").textContent = `Theme: ${THEMES[resolvedTheme].label}`;
}

async function cycleTheme() {
  const currentTheme = state.settings.preferences.theme || "cyan";
  const nextTheme = THEMES[currentTheme]?.next || "cyan";
  state.settings.preferences.theme = nextTheme;
  applyTheme(nextTheme);
  await persistSettings();
  showToast(`Theme gewechselt: ${THEMES[nextTheme].label}`);
}

async function toggleFavorite(type, id) {
  const key = type === "template" ? "templates" : "commands";
  const numericId = Number(id);
  const values = new Set(state.settings.favorites[key]);

  if (values.has(numericId)) {
    values.delete(numericId);
  } else {
    values.add(numericId);
  }

  state.settings.favorites[key] = [...values];
  await persistSettings();
  renderTemplates();
  renderCommands();
  renderQuickbar();
  showToast(values.has(numericId) ? "Zu Favoriten hinzugefügt." : "Favorit entfernt.");
}


/**
 * Prueflisten fuer die Diagnose. Bewusst als Reihenfolge gedacht: von der
 * einfachsten und haeufigsten Ursache zur aufwendigsten, damit man die Liste
 * von oben nach unten abarbeiten kann.
 *
 * Die abgehakten Punkte landen im erzeugten Diagnosetext und dokumentieren im
 * Ticket, was bereits geprueft wurde -- das erspart dem 3rd Level Rueckfragen.
 */
const DIAGNOSTICS = {
  "Netzwerk / Internet": [
    "Kabel bzw. WLAN-Verbindung geprüft",
    "IP-Konfiguration dokumentiert (ipconfig /all)",
    "IP-Adresse plausibel (kein 169.254.x.x)",
    "Gateway erreichbar (ping)",
    "DNS-Auflösung geprüft (nslookup)",
    "Externe Erreichbarkeit geprüft (ping 8.8.8.8)",
    "Netzwerkweg geprüft (tracert)",
    "DNS-Cache geleert (ipconfig /flushdns)",
    "Proxy-Einstellungen geprüft",
    "Netzwerktreiber und Adapterstatus geprüft",
    "Andere Geräte am selben Anschluss getestet",
    "Switch-Port bzw. Dose geprüft",
  ],
  "VPN": [
    "Internetverbindung ohne VPN geprüft",
    "VPN-Client-Version geprüft",
    "Richtiges VPN-Profil ausgewählt",
    "Anmeldedaten geprüft",
    "MFA erfolgreich abgeschlossen",
    "Windows-Updates vollständig installiert",
    "Zertifikat gültig und vorhanden",
    "Neustart durchgeführt",
    "Verbindung aus anderem Netz getestet",
    "VPN-Logs gesichert",
    "Fehlermeldung im Wortlaut dokumentiert",
  ],
  "Drucker": [
    "Drucker eingeschaltet und betriebsbereit",
    "Display auf Fehlermeldung geprüft",
    "Papier und Toner vorhanden",
    "Drucker über Netzwerk erreichbar (ping)",
    "Warteschlange auf hängende Aufträge geprüft",
    "Spooler-Dienst neu gestartet",
    "Treiber und Version geprüft",
    "Richtiger Drucker als Standard gesetzt",
    "Testseite direkt am Gerät gedruckt",
    "Testseite vom Arbeitsplatz gedruckt",
    "Berechtigungen auf die Freigabe geprüft",
    "Anderer Benutzer am selben Gerät getestet",
  ],
  "Windows / Software": [
    "Fehler reproduziert und Schritte notiert",
    "Genauer Wortlaut der Fehlermeldung erfasst",
    "Screenshot der Meldung gesichert",
    "Neustart durchgeführt",
    "Ereignisanzeige zum Zeitpunkt geprüft",
    "Zugehörige Dienste laufen",
    "Windows-Updates geprüft",
    "Anwendungsversion dokumentiert",
    "Reparaturinstallation getestet",
    "Mit anderem Benutzerprofil gegengeprüft",
    "An anderem Gerät gegengeprüft",
    "Freier Speicherplatz geprüft",
  ],
  "Anmeldung / Berechtigung": [
    "Kontostatus geprüft (aktiv, nicht gesperrt)",
    "Kennwort abgelaufen oder gesperrt geprüft",
    "Gruppenmitgliedschaften geprüft (whoami /groups)",
    "Berechtigung auf Ziel-Ressource geprüft",
    "Gruppenrichtlinien aktualisiert (gpupdate /force)",
    "Ab- und Anmeldung durchgeführt",
    "Kerberos-Tickets zurückgesetzt (klist purge)",
    "Gespeicherte Zugangsdaten geprüft (cmdkey /list)",
    "Anmeldung an anderem Gerät getestet",
    "Domänenverbindung geprüft",
    "Replikationszeit berücksichtigt",
  ],
  "Hardware": [
    "Kabel und Stromversorgung geprüft",
    "Gerät an anderem Anschluss getestet",
    "Hard-Reset durchgeführt",
    "Geräte-Manager auf Fehler geprüft",
    "Treiber und Firmware auf aktuellem Stand",
    "Herstellerdiagnose durchgeführt",
    "Komponente an anderem Gerät gegengeprüft",
    "Ersatzgerät getestet",
    "Seriennummer und Inventarnummer dokumentiert",
    "Garantiestatus geprüft",
    "Auffällige Geräusche oder Gerüche notiert",
  ],
  "E-Mail / Outlook": [
    "Anmeldung in Outlook Web geprüft",
    "Postfachgröße geprüft",
    "Offline-Modus ausgeschlossen",
    "Betroffene Absender oder Empfänger notiert",
    "Quarantäne geprüft",
    "Regeln und Weiterleitungen geprüft",
    "OST-Datei bzw. Profil neu aufgebaut",
    "Berechtigungen auf freigegebene Postfächer geprüft",
    "Kalenderfreigaben geprüft",
    "Sende- und Empfangsprotokoll ausgewertet",
  ],
  "Microsoft 365 / Teams": [
    "Anmeldung im Browser geprüft",
    "Lizenz zugewiesen und aktiv",
    "Zwischenspeicher der App geleert",
    "App-Version aktuell",
    "Abmeldung und Neuanmeldung durchgeführt",
    "Dienststatus bei Microsoft geprüft",
    "Berechtigungen auf Team oder Seite geprüft",
    "Auch im Browser reproduzierbar",
  ],
  "Konto / MFA": [
    "Betroffene Anmeldemethode ermittelt",
    "Uhrzeit auf dem Mobilgerät geprüft",
    "Authenticator-App aktuell",
    "Alternative Anmeldemethode hinterlegt",
    "Gerätewechsel als Ursache geprüft",
    "MFA-Zurücksetzung angestoßen",
    "Anmeldeprotokoll auf Blockierungen geprüft",
    "Benutzer über Neueinrichtung informiert",
  ],
  "Leistung / Geschwindigkeit": [
    "Betroffene Anwendung oder gesamtes System eingegrenzt",
    "Laufzeit seit letztem Neustart geprüft",
    "Auslastung von CPU, RAM und Datenträger geprüft",
    "Speicherfresser im Task-Manager identifiziert",
    "Freier Speicherplatz auf C geprüft",
    "Autostart-Programme geprüft",
    "Virenscan durchgeführt",
    "Energieplan geprüft",
    "Netzlaufwerke als Ursache ausgeschlossen",
    "Alter und Ausstattung des Geräts berücksichtigt",
  ],
  "Dateien / Freigaben": [
    "Genauer Pfad dokumentiert",
    "Netzlaufwerk verbunden und erreichbar",
    "Berechtigungen auf Ordner und Freigabe geprüft",
    "Datei durch anderen Benutzer gesperrt",
    "Speicherplatz auf dem Server geprüft",
    "Versionsverlauf oder Sicherung geprüft",
    "Zugriff von anderem Gerät getestet",
    "Pfadlänge unter 260 Zeichen",
  ],
  "Mobilgerät": [
    "Gerätemodell und Betriebssystemversion notiert",
    "Mobilfunk- oder WLAN-Verbindung geprüft",
    "Datenvolumen geprüft",
    "Neustart durchgeführt",
    "App-Updates installiert",
    "Geräteverwaltung zeigt Gerät als konform",
    "Firmenprofil vorhanden",
    "SIM-Karte und PIN geprüft",
  ],
};

function recentStorageKey() {
  return `helpdesk_recent_${state.user?.id ?? "anonymous"}`;
}

function loadRecentItems() {
  try {
    const parsed = JSON.parse(localStorage.getItem(recentStorageKey()) || "[]");
    state.recentItems = Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    state.recentItems = [];
  }
  renderQuickbar();
}

function saveRecentItems() {
  localStorage.setItem(recentStorageKey(), JSON.stringify(state.recentItems));
}

function addRecentItem(type, id, label) {
  state.recentItems = [
    { type, id, label },
    ...state.recentItems.filter((item) => !(item.type === type && item.id === id)),
  ].slice(0, 8);
  saveRecentItems();
  renderQuickbar();
}

function renderQuickbar() {
  const container = $("#quickbar-items");
  if (!container) return;

  const favoriteTemplates = state.templates
    .filter((item) => isFavorite("template", item.id))
    .map((item) => ({ type: "template", id: item.id, label: item.title }));

  const favoriteCommands = state.commands
    .filter((item) => isFavorite("command", item.id))
    .map((item) => ({ type: "command", id: item.id, label: item.name }));

  const favorites = [...favoriteTemplates, ...favoriteCommands];

  const renderItems = (items, extraClass = "") => items.map((item) => `
    <button
      class="quick-item ${extraClass}"
      type="button"
      data-recent-type="${escapeHtml(item.type)}"
      data-recent-id="${Number(item.id)}"
    >${escapeHtml(item.label)}</button>
  `).join("");

  container.innerHTML = `
    <div class="quickbar-section">
      <span class="quickbar-label">Favoriten</span>
      ${favorites.length
        ? renderItems(favorites, "favorite")
        : '<span class="quick-empty">Noch keine Favoriten markiert.</span>'}
    </div>
    <div class="quickbar-section">
      <span class="quickbar-label">Zuletzt verwendet</span>
      ${state.recentItems.length
        ? renderItems(state.recentItems)
        : '<span class="quick-empty">Noch keine zuletzt verwendeten Inhalte.</span>'}
    </div>
  `;

  // Solange weder Favoriten noch Verlauf existieren, ist die Leiste nur ein
  // leerer Kasten ueber dem Inhalt -- dann bleibt sie ausgeblendet.
  updateQuickbarVisibility();
}

/** Zeigt die Schnellleiste nur dort, wo sie Bezug hat und Inhalt zeigt. */
function updateQuickbarVisibility() {
  // Auf allen Reitern sichtbar: Der Schnellzugriff wird auch dann gebraucht,
  // wenn man gerade im Ticket-Generator oder in der Diagnose steht.
  const hasContent = state.recentItems.length > 0
    || state.templates.some((item) => isFavorite("template", item.id))
    || state.commands.some((item) => isFavorite("command", item.id));

  $("#quickbar").classList.toggle("hidden", !hasContent);
}

/* ============================================================
   Fall-Arbeitsblatt
   ============================================================ */
async function loadCases() {
  const data = await api("/api/cases");
  state.cases = data.cases;

  $("#cases-list").innerHTML = state.cases.length
    ? state.cases.map(caseCard).join("")
    : '<div class="panel muted">Noch kein Fall angelegt.</div>';

  updateCaseIndicator();
}

/**
 * Zeigt in der Kopfzeile, welcher Fall gerade mitschreibt.
 *
 * Ohne den Hinweis fragt die Anwendung nach dem Kopieren nach einem Fall, den
 * man womoeglich vor Stunden geoeffnet und laengst vergessen hat.
 */
function updateCaseIndicator() {
  const anzeige = $("#case-indicator");
  if (!anzeige) return;

  const offen = state.cases.find((item) => item.status === "open");
  anzeige.classList.toggle("hidden", !offen);
  if (offen) {
    anzeige.textContent = `● ${offen.ticket_ref}`;
    anzeige.title = `Offener Fall: ${offen.title}`;
  }
}

function caseCard(record) {
  const closed = record.status === "closed";

  return `
    <details class="card" ${closed ? "" : "open"}>
      <summary>
        <div class="summary-main">
          <span class="badge">${escapeHtml(record.ticket_ref)}</span>
          <span class="summary-title">${escapeHtml(record.title)}</span>
        </div>
        <span class="summary-meta">
          <span class="badge ${closed ? "" : "risk-badge risk-low"}">
            ${closed ? "Abgeschlossen" : "Offen"}
          </span>
        </span>
      </summary>
      <div class="card-content" data-case-body="${record.id}">
        <p class="muted">Wird geladen…</p>
      </div>
    </details>`;
}

/** Laedt die Schritte eines Falls erst beim Aufklappen nach. */
async function loadCaseDetail(caseId) {
  const container = document.querySelector(`[data-case-body="${caseId}"]`);
  if (!container || container.dataset.loaded === "1") return;

  const data = await api(`/api/cases/${caseId}`);
  container.dataset.loaded = "1";

  const entries = data.entries.length
    ? `<ol class="case-entries">${data.entries.map((entry) => `
        <li>
          <span class="case-kind">${escapeHtml(CASE_KIND_LABELS[entry.kind] || entry.kind)}</span>
          <span>${escapeHtml(entry.label)}</span>
          ${entry.detail ? `<div class="muted">${escapeHtml(entry.detail)}</div>` : ""}
          <button class="btn-link" type="button"
                  data-case-entry-delete="${entry.id}" data-case="${caseId}">Entfernen</button>
        </li>`).join("")}</ol>`
    : '<p class="muted">Noch nichts festgehalten. Nach dem Kopieren einer Vorlage, eines Befehls oder einer Lösung wird gefragt, ob es hierher gehört.</p>';

  container.innerHTML = `
    ${entries}
    <label class="field-block">Notizen
      <textarea rows="4" data-case-notes="${caseId}">${escapeHtml(data.case.notes || "")}</textarea>
    </label>
    <div class="card-actions">
      <button class="primary" data-case-document="${caseId}">Dokumentation erzeugen</button>
      <button data-case-save="${caseId}">Notizen speichern</button>
      ${data.case.status === "open"
        ? `<button data-case-close="${caseId}">Fall abschließen</button>`
        : ""}
      <button class="danger-button" data-case-delete="${caseId}">Löschen</button>
    </div>`;
}

const CASE_KIND_LABELS = {
  template: "Vorlage",
  command: "Befehl",
  solution: "Lösung",
  note: "Notiz",
};

/**
 * Erzeugt die Ticket-Dokumentation aus den gesammelten Schritten.
 *
 * Bewusst als reiner Text: Er wird in ein Ticketsystem eingefuegt, das kein
 * Markup uebernimmt.
 */
async function buildCaseDocumentation(caseId) {
  const data = await api(`/api/cases/${caseId}`);
  const record = data.case;

  const zeilen = [
    `Ticket: ${record.ticket_ref}`,
    `Vorgang: ${record.title}`,
    "",
    "Durchgeführte Schritte:",
  ];

  data.entries.forEach((entry, index) => {
    zeilen.push(`${index + 1}. [${CASE_KIND_LABELS[entry.kind] || entry.kind}] ${entry.label}`);
    if (entry.detail) zeilen.push(`   ${entry.detail}`);
  });

  if (!data.entries.length) zeilen.push("(keine)");

  if (record.notes) {
    zeilen.push("", "Notizen:", record.notes);
  }

  zeilen.push("", `Bearbeitet von: ${state.user.displayName}`);
  await copyText(zeilen.join("\n"));
}

/**
 * Bietet an, einen benutzten Inhalt an den offenen Fall zu haengen.
 *
 * Bewusst als Rueckfrage statt automatisch: Wer zwischendurch etwas fuer einen
 * Kollegen heraussucht, haette es sonst im Fall stehen und muesste es dort
 * wieder entfernen. Ohne Antwort passiert nichts -- der Hinweis verschwindet
 * von selbst.
 */
function trackInCase(kind, refId, label, detail = null) {
  const offen = state.cases.find((item) => item.status === "open");
  if (!offen) return;

  askCaseCapture(offen, { kind, refId, label, detail });
}

let caseAskTimer = null;

function askCaseCapture(fall, eintrag) {
  const box = $("#case-ask");
  clearTimeout(caseAskTimer);

  box.innerHTML = `
    <div class="case-ask-text">
      <strong>Kopiert.</strong>
      <span>Zu ${escapeHtml(fall.ticket_ref)} hinzufügen?</span>
    </div>
    <div class="case-ask-actions">
      <button class="case-ask-yes" type="button">Ja</button>
      <button class="case-ask-no" type="button">Nein</button>
    </div>`;
  box.classList.remove("hidden");

  const schliessen = () => {
    clearTimeout(caseAskTimer);
    box.classList.add("hidden");
  };

  box.querySelector(".case-ask-yes").addEventListener("click", async () => {
    schliessen();
    try {
      await api(`/api/cases/${fall.id}/entries`, {
        method: "POST",
        body: JSON.stringify(eintrag),
      });
      showToast(`Zu ${fall.ticket_ref} hinzugefügt.`);
      if (state.activeView === "cases") await loadCases();
    } catch (error) {
      alert(error.message);
    }
  });

  box.querySelector(".case-ask-no").addEventListener("click", schliessen);

  // Ohne Antwort nichts hinzufuegen -- Wegklicken ist die sichere Voreinstellung.
  caseAskTimer = setTimeout(schliessen, 6000);
}

/* ============================================================
   Eskalation
   ============================================================ */
async function loadEscalation() {
  const data = await api("/api/escalation");
  state.escalationLevels = data.levels;

  $("#escalation-list").innerHTML = data.levels.length
    ? data.levels.map((level) => `
      <article class="escalation-step">
        <div class="escalation-step-head">
          <span class="escalation-position">${level.position}</span>
          <div>
            <h4>${escapeHtml(level.name)}</h4>
            <p class="muted">${escapeHtml(level.responsible)}</p>
          </div>
          ${isAdmin() ? `
            <div class="escalation-actions">
              <button class="btn-link" data-escalation-edit="${level.id}">Bearbeiten</button>
              <button class="btn-link danger-link" data-escalation-delete="${level.id}">Entfernen</button>
            </div>` : ""}
        </div>
        <div class="escalation-meta">
          ${level.response_time
            ? `<span class="badge">Reaktion: ${escapeHtml(level.response_time)}</span>` : ""}
          ${level.contact ? `<span class="badge">${escapeHtml(level.contact)}</span>` : ""}
        </div>
        ${level.criteria ? `<p>${escapeHtml(level.criteria)}</p>` : ""}
      </article>`).join("")
    : '<div class="panel muted">Noch keine Stufen hinterlegt.</div>';
}

function openEscalationDialog(level = null) {
  const dialog = $("#escalation-dialog");
  dialog.dataset.levelId = level?.id || "";
  $("#escalation-dialog-title").textContent = level
    ? "Stufe bearbeiten" : "Stufe hinzufügen";
  $("#escalation-position").value = level?.position ?? state.escalationLevels.length + 1;
  $("#escalation-name").value = level?.name || "";
  $("#escalation-responsible").value = level?.responsible || "";
  $("#escalation-contact").value = level?.contact || "";
  $("#escalation-response").value = level?.response_time || "";
  $("#escalation-criteria").value = level?.criteria || "";
  dialog.showModal();
}

/* ============================================================
   Dienstuebergabe
   ============================================================ */
async function loadHandovers() {
  const data = await api("/api/handovers");

  $("#handover-list").innerHTML = data.handovers.length
    ? data.handovers.map((item) => `
      <details class="card" ${item.acknowledged_at ? "" : "open"}>
        <summary>
          <div class="summary-main">
            <span class="badge">${escapeHtml(item.shift_label)}</span>
            <span class="summary-title">${escapeHtml(item.created_by_name)}</span>
          </div>
          <span class="summary-meta">
            ${item.acknowledged_at
              ? `<span class="badge">Bestätigt von ${escapeHtml(item.acknowledged_by_name || "")}</span>`
              : '<span class="badge risk-badge risk-medium">Offen</span>'}
          </span>
        </summary>
        <div class="card-content">
          <p class="muted">${formatDate(item.created_at)}</p>
          ${handoverSection("Offene Fälle", item.open_cases)}
          ${handoverSection("Auffälligkeiten", item.incidents)}
          ${handoverSection("Notizen", item.notes)}
          ${item.acknowledged_at ? "" : `
            <div class="card-actions">
              <button class="primary" data-handover-ack="${item.id}">Übernahme bestätigen</button>
            </div>`}
        </div>
      </details>`).join("")
    : '<div class="panel muted">Noch keine Übergabe vorhanden.</div>';
}

function handoverSection(titel, inhalt) {
  if (!inhalt) return "";
  return `
    <div class="solution-block">
      <span class="solution-label">${escapeHtml(titel)}</span>
      <div class="template-body">${escapeHtml(inhalt)}</div>
    </div>`;
}

/* ============================================================
   Statistik
   ============================================================ */
/** Beschriftung der Formulare je Bereich, in dem gesucht wurde. */
const MISS_SCOPE_LABELS = {
  templates: "Vorlage",
  commands: "Befehl",
  solutions: "Lösung",
  all: "Eintrag",
};

/**
 * Eine Wissensluecke mit den passenden Aktionen.
 *
 * Welches Formular vorgeschlagen wird, richtet sich nach dem Bereich, in dem
 * am haeufigsten vergeblich gesucht wurde. Bei der Schnellsuche ("all") laesst
 * sich das nicht sagen -- dort werden alle drei Moeglichkeiten angeboten.
 */
function missRow(item) {
  const term = escapeHtml(item.term);
  const scope = item.scope || "all";
  const personen = Number(item.personen || 0);

  const arten = scope === "all"
    ? ["templates", "commands", "solutions"]
    : [scope];

  const aktionen = arten.map((art) => `
    <button type="button" class="btn-miss" data-miss-create="${art}"
            data-miss-term="${term}">
      + ${MISS_SCOPE_LABELS[art]}
    </button>`).join("");

  const abhaken = canReview()
    ? `<button type="button" class="btn-miss" data-miss-resolve="${term}"
               title="Lücke als erledigt abhaken">✓ Erledigt</button>`
    : "";

  return `
    <li class="miss-row">
      <div class="miss-main">
        <span class="miss-term">${term}</span>
        <span class="muted">
          ${item.treffer}× gesucht${personen > 1 ? ` · von ${personen} Personen` : ""}
        </span>
      </div>
      <div class="miss-actions">${aktionen}${abhaken}</div>
    </li>`;
}

async function loadStats() {
  const data = await api("/api/usage/stats");
  const counts = data.counts || {};

  // Einzahl/Mehrzahl, damit "1 Offene Fälle" nicht stehen bleibt.
  const kacheln = [
    ["Vorlagen", counts.vorlagen, "Vorlage"],
    ["Befehle", counts.befehle, "Befehl"],
    ["Lösungen", counts.loesungen, "Lösung"],
    ["Offene Fälle", counts.offene_faelle, "Offener Fall"],
    ["Offene Vorschläge", counts.offene_vorschlaege, "Offener Vorschlag"],
  ];

  const liste = (eintraege, leer) => eintraege.length
    ? `<ol class="stat-list">${eintraege.join("")}</ol>`
    : `<p class="muted">${leer}</p>`;

  $("#stats-body").innerHTML = `
    <div class="stat-tiles">
      ${kacheln.map(([mehrzahl, wert, einzahl]) => `
        <div class="stat-tile">
          <span class="stat-value">${Number(wert ?? 0)}</span>
          <span class="stat-label">${Number(wert ?? 0) === 1 ? einzahl : mehrzahl}</span>
        </div>`).join("")}
    </div>

    <div class="grid-two">
      <div class="panel-box">
        <h3>Meistgenutzte Lösungen</h3>
        ${liste(data.topSolutions.map((item) => `
          <li>
            <span>${escapeHtml(item.title)}</span>
            <span class="muted">${item.opened_count}× geöffnet · ${item.helpful_count}× hilfreich</span>
          </li>`), "Noch keine Nutzung erfasst.")}
      </div>

      <div class="panel-box">
        <h3>Meistgenutzte Befehle</h3>
        ${liste(data.topCommands.map((item) => `
          <li>
            <span>${escapeHtml(item.title)}</span>
            <span class="muted">${item.opened_count}× kopiert</span>
          </li>`), "Noch keine Nutzung erfasst.")}
      </div>

      <div class="panel-box">
        <h3>Gesucht, nichts gefunden</h3>
        <p class="panel-hint">
          Hier fehlt Wissen -- diese Begriffe liefern keine Treffer.
          ${canReview()
            ? "Lege den fehlenden Eintrag direkt an oder hake die Lücke ab."
            : "Du kannst den fehlenden Eintrag vorschlagen."}
        </p>
        ${liste(data.misses.map((item) => missRow(item)),
          "Keine erfolglosen Suchen -- gutes Zeichen.")}
      </div>

      <div class="panel-box">
        <h3>Beiträge zur Wissensbasis</h3>
        ${liste(data.contributors.map((item, index) => `
          <li>
            <span class="contributor-name">
              ${index < 3 ? ["🥇", "🥈", "🥉"][index] + " " : ""}
              ${avatarTag(item.name, 20)}${escapeHtml(item.name)}
            </span>
            <span class="muted">${item.beitraege} Einträge</span>
          </li>`), "Noch keine Beiträge.")}
      </div>
    </div>`;

  hydrateAvatars($("#stats-body"));
}

/* ============================================================
   Erinnerungen
   ============================================================ */
async function loadReminders() {
  const data = await api("/api/reminders");
  state.reminders = data.reminders;

  const zaehler = $("#reminder-count");
  zaehler.textContent = data.reminders.length || "";
  zaehler.classList.toggle("hidden", !data.reminders.length);

  const liste = $("#reminder-list");
  if (!liste) return;

  liste.innerHTML = data.reminders.length
    ? data.reminders.map((item) => `
      <div class="reminder-row ${Date.parse(item.due_at) <= Date.now() ? "due" : ""}">
        <div>
          <strong>${escapeHtml(item.message)}</strong>
          <div class="muted">
            ${item.ticket_ref ? `${escapeHtml(item.ticket_ref)} · ` : ""}${formatDateTime(item.due_at)}
          </div>
        </div>
        <button class="btn-link" type="button" data-reminder-done="${item.id}">Erledigt</button>
      </div>`).join("")
    : '<p class="muted">Keine offenen Erinnerungen.</p>';
}

/* ============================================================
   Symptom-Assistent
   ============================================================
   Ein Entscheidungsbaum fuehrt vom Symptom zur passenden Loesung. Die
   Endpunkte verweisen ueber Suchbegriffe auf den Loesungsbestand, statt IDs
   fest zu verdrahten -- so bleibt der Baum gueltig, wenn Loesungen dazukommen
   oder umbenannt werden.
*/
const ASSISTANT_TREE = {
  start: {
    frage: "Womit hat der Benutzer ein Problem?",
    optionen: [
      { text: "Netzwerk / Internet", ziel: "netzwerk" },
      { text: "Drucker", ziel: "drucker" },
      { text: "Anmeldung / Konto", ziel: "konto" },
      { text: "E-Mail / Outlook", ziel: "mail" },
      { text: "Rechner langsam oder Fehler", ziel: "rechner" },
      { text: "Remote-Zugriff / VPN", ziel: "vpn" },
    ],
  },
  netzwerk: {
    frage: "Wer ist betroffen?",
    optionen: [
      { text: "Nur ein Arbeitsplatz", ziel: "netzwerk-einzeln" },
      { text: "Mehrere Benutzer", ziel: "netzwerk-mehrere" },
      { text: "Netzlaufwerke fehlen", suche: "Netzlaufwerke" },
    ],
  },
  "netzwerk-einzeln": {
    frage: "Besteht eine Verbindung zum Netz?",
    optionen: [
      { text: "Verbunden, aber kein Internet", suche: "Kein Internet" },
      { text: "Gar keine Verbindung", hinweis:
        "Kabel und Anschlussdose prüfen, Adapterstatus mit ipconfig /all kontrollieren." },
    ],
  },
  "netzwerk-mehrere": {
    frage: "Sind auch Server betroffen?",
    optionen: [
      { text: "Ja, mehrere Dienste", eskalation: true, hinweis:
        "Deutet auf eine Störung der Infrastruktur hin -- eskalieren statt einzeln prüfen." },
      { text: "Nein, nur Internetzugriff", hinweis:
        "Gateway und Proxy prüfen. Bei Verdacht auf Ausfall die nächste Stufe einbeziehen." },
    ],
  },
  drucker: {
    frage: "Was passiert beim Drucken?",
    optionen: [
      { text: "Auftrag bleibt hängen", suche: "Warteschlange" },
      { text: "Seiten bleiben leer", suche: "leere Seiten" },
      { text: "Drucker nicht gefunden", hinweis:
        "Verbindung zum Druckserver prüfen, Drucker neu verbinden." },
    ],
  },
  konto: {
    frage: "Woran scheitert die Anmeldung?",
    optionen: [
      { text: "Konto ist gesperrt", suche: "gesperrt" },
      { text: "Zweiter Faktor wird abgelehnt", suche: "zweitem Faktor" },
      { text: "Passwort vergessen", hinweis:
        "Passwort zurücksetzen und Änderung bei der nächsten Anmeldung erzwingen." },
    ],
  },
  mail: {
    frage: "Was ist das Symptom?",
    optionen: [
      { text: "Ständige Kennwortabfrage", suche: "Kennwort" },
      { text: "Mails landen im Spam", suche: "Spam" },
      { text: "Postfach voll", hinweis:
        "Größe prüfen, Archivierung anstoßen oder Kontingent erhöhen." },
    ],
  },
  rechner: {
    frage: "Was genau tritt auf?",
    optionen: [
      { text: "Startet sehr langsam", suche: "langsam" },
      { text: "Update schlägt fehl", suche: "Update" },
      { text: "Kein Speicherplatz", suche: "Speicherplatz" },
      { text: "Programm startet nicht", suche: "Anwendung startet nicht" },
      { text: "Bildschirm bleibt schwarz", suche: "schwarz" },
    ],
  },
  vpn: {
    frage: "Wie weit kommt die Verbindung?",
    optionen: [
      { text: "Verbindet, nichts erreichbar", suche: "VPN" },
      { text: "Verbindet gar nicht", hinweis:
        "Zugangsdaten und zweiten Faktor prüfen, danach Client-Protokoll auswerten." },
    ],
  },
};

const assistantState = { knoten: "start", pfad: [] };

function renderAssistant() {
  const container = $("#assistant-body");
  if (!container) return;

  const knoten = ASSISTANT_TREE[assistantState.knoten];
  const pfad = assistantState.pfad.length
    ? `<p class="assistant-path">${assistantState.pfad.map(escapeHtml).join(" › ")}</p>`
    : "";

  // Endpunkt: entweder Treffer aus dem Loesungsbestand oder ein Hinweistext.
  if (!knoten) {
    container.innerHTML = pfad + renderAssistantResult();
    return;
  }

  container.innerHTML = `
    <h4 class="assistant-question">${escapeHtml(knoten.frage)}</h4>
    ${pfad}
    <div class="assistant-options">
      ${knoten.optionen.map((option, index) => `
        <button class="assistant-option" type="button" data-assistant-option="${index}">
          ${escapeHtml(option.text)}
        </button>`).join("")}
    </div>
    ${assistantState.pfad.length
      ? '<button class="btn-link" type="button" data-assistant-reset>Von vorn beginnen</button>'
      : ""}`;
}

function renderAssistantResult() {
  const ergebnis = assistantState.ergebnis || {};
  const treffer = ergebnis.suche
    ? state.solutions.filter((item) =>
      `${item.title} ${item.symptom}`.toLowerCase().includes(ergebnis.suche.toLowerCase()))
    : [];

  const trefferListe = treffer.length
    ? `<div class="assistant-hits">${treffer.map((item) => `
        <button class="assistant-hit" type="button" data-assistant-solution="${item.id}">
          <span class="badge category-badge"
                style="--category-color:${commandCategoryColor(item.category)}">
            ${escapeHtml(item.category)}
          </span>
          <span>${escapeHtml(item.title)}</span>
        </button>`).join("")}</div>`
    : ergebnis.suche
      ? `<div class="notice">Zu diesem Fall ist noch keine Lösung hinterlegt.
           Wenn du ihn löst, trag die Lösung bitte ein.</div>`
      : "";

  return `
    ${ergebnis.hinweis ? `<div class="notice">${escapeHtml(ergebnis.hinweis)}</div>` : ""}
    ${trefferListe}
    ${ergebnis.eskalation
      ? '<button class="btn-tool" type="button" data-assistant-escalate>Eskalationsstufen ansehen</button>'
      : ""}
    <button class="btn-link" type="button" data-assistant-reset>Von vorn beginnen</button>`;
}

function chooseAssistantOption(index) {
  const knoten = ASSISTANT_TREE[assistantState.knoten];
  const option = knoten?.optionen[index];
  if (!option) return;

  assistantState.pfad.push(option.text);

  if (option.ziel) {
    assistantState.knoten = option.ziel;
  } else {
    // Endpunkt erreicht: Ergebnis merken und Baum verlassen.
    assistantState.knoten = null;
    assistantState.ergebnis = option;
  }
  renderAssistant();
}

function resetAssistant() {
  assistantState.knoten = "start";
  assistantState.pfad = [];
  assistantState.ergebnis = null;
  renderAssistant();
}

/* ============================================================
   Schnellsuche (Strg+K)
   ============================================================
   Durchsucht Vorlagen, Befehle und Loesungen gleichzeitig. Alle Daten liegen
   bereits im Bootstrap -- die Suche laeuft deshalb ohne Serveranfrage.
*/
// "expanded" haelt fest, welcher Treffer aufgeklappt ist -- bewusst nur einer,
// damit die Liste bei vielen Treffern ueberschaubar bleibt. Der Schluessel ist
// "art:id", weil sich die laufenden Nummern beim Tippen staendig verschieben.
const paletteState = { items: [], index: 0, expanded: null };

function paletteKey(item) {
  return `${item.kind}:${item.id}`;
}

function paletteCandidates() {
  return [
    ...state.templates.map((item) => ({
      kind: "template",
      id: item.id,
      title: item.title,
      hint: item.category_name,
      copy: item.body,
      preview: item.body,
      haystack: `${item.title} ${item.body}`.toLowerCase(),
    })),
    ...state.commands.map((item) => ({
      kind: "command",
      id: item.id,
      title: item.name,
      hint: `${item.category} · ${item.shell}`,
      copy: item.command,
      preview: [item.command, item.description].filter(Boolean).join("\n\n"),
      haystack: `${item.name} ${item.command} ${item.description}`.toLowerCase(),
    })),
    ...state.solutions.map((item) => ({
      kind: "solution",
      id: item.id,
      title: item.title,
      hint: item.category,
      copy: item.solution,
      // Bei Loesungen gehoert das Symptom mit in die Vorschau: erst daran
      // erkennt man, ob es der richtige Fall ist.
      preview: [item.symptom && `Symptom:\n${item.symptom}`, item.solution]
        .filter(Boolean).join("\n\n"),
      haystack: `${item.title} ${item.symptom} ${item.solution}`.toLowerCase(),
    })),
  ];
}

const PALETTE_KIND_LABELS = {
  template: "Vorlage",
  command: "Befehl",
  solution: "Lösung",
};

function renderPalette() {
  const term = $("#palette-input").value.trim().toLowerCase();
  const container = $("#palette-results");

  paletteState.items = term
    ? paletteCandidates().filter((item) => item.haystack.includes(term)).slice(0, 40)
    : [];

  if (!term) {
    container.innerHTML = '<p class="palette-empty">Tippen, um zu suchen.</p>';
    return;
  }

  if (!paletteState.items.length) {
    container.innerHTML = '<p class="palette-empty">Nichts gefunden.</p>';
    // Erfolglose Suchen festhalten -- daraus wird sichtbar, welches Wissen fehlt.
    // "all", weil die Schnellsuche ueber alle drei Arten gleichzeitig sucht:
    // welche davon gefehlt hat, laesst sich hier nicht sagen.
    reportSearchMiss(term, "all");
    return;
  }

  paletteState.index = Math.min(paletteState.index, paletteState.items.length - 1);
  container.innerHTML = paletteState.items
    .map((item, index) => paletteRow(item, index))
    .join("");

  container.querySelector(".palette-row.active")
    ?.scrollIntoView({ block: "nearest" });
}

/**
 * Eine Trefferzeile, bei Bedarf mit aufgeklappter Vorschau.
 *
 * Der Volltext wird nur fuer den aufgeklappten Treffer erzeugt. Bei bis zu 40
 * Treffern mit langen Vorlagentexten waere es sonst viel Markup, das niemand
 * zu sehen bekommt.
 */
function paletteRow(item, index) {
  const open = paletteState.expanded === paletteKey(item);
  const active = index === paletteState.index;
  const preview = item.preview || item.copy || "";

  const details = open
    ? `
      <div class="palette-preview">
        <pre class="palette-preview-text">${escapeHtml(replacePersonalPlaceholders(preview))}</pre>
        <div class="palette-preview-actions">
          <button type="button" class="primary" data-palette-copy="${index}">Kopieren</button>
        </div>
      </div>`
    : "";

  return `
    <div class="palette-row ${active ? "active" : ""} ${open ? "open" : ""}">
      <button class="palette-item" type="button" data-palette-index="${index}"
              aria-expanded="${open}">
        <span class="palette-caret" aria-hidden="true">${open ? "▾" : "▸"}</span>
        <span class="palette-kind palette-kind-${item.kind}">${PALETTE_KIND_LABELS[item.kind]}</span>
        <span class="palette-title">${escapeHtml(item.title)}</span>
        <span class="palette-hint-text">${escapeHtml(item.hint || "")}</span>
      </button>
      ${details}
    </div>`;
}

/**
 * Meldet eine Suche ohne Treffer.
 *
 * Gedrosselt: Ohne die Verzoegerung entstuende bei jedem Tastendruck ein
 * Eintrag, und die Auswertung waere voll mit Wortfragmenten.
 */
let searchMissTimer = null;
function reportSearchMiss(term, scope) {
  if (term.length < 4) return;
  clearTimeout(searchMissTimer);
  searchMissTimer = setTimeout(() => {
    api("/api/usage/miss", {
      method: "POST",
      body: JSON.stringify({ term, scope }),
    }).catch(() => {
      // Statistik ist Beiwerk -- ein Fehler darf die Suche nicht stoeren.
    });
  }, 1200);
}

function movePaletteSelection(offset) {
  if (!paletteState.items.length) return;
  const count = paletteState.items.length;
  paletteState.index = (paletteState.index + offset + count) % count;
  renderPalette();
}

/** Klappt einen Treffer auf oder zu. Ohne Argument: den ausgewaehlten. */
function togglePaletteExpanded(index = paletteState.index, force = null) {
  const item = paletteState.items[index];
  if (!item) return;

  const key = paletteKey(item);
  const open = force === null ? paletteState.expanded !== key : force;

  paletteState.expanded = open ? key : null;
  paletteState.index = index;
  renderPalette();
}

async function usePaletteItem(index) {
  const item = paletteState.items[index];
  if (!item) return;

  await copyText(item.copy);
  addRecentItem(item.kind === "solution" ? "solution" : item.kind, item.id, item.title);
  if (item.kind !== "template") countContentUsage(item.kind, item.id);
  $("#palette-dialog").close();
}

function openPalette() {
  paletteState.index = 0;
  paletteState.expanded = null;
  $("#palette-input").value = "";
  renderPalette();
  $("#palette-dialog").showModal();
  $("#palette-input").focus();
}

/** Zaehlt Oeffnungen von Befehlen und Loesungen fuer die Statistik. */
function countContentUsage(contentType, contentId, helpful = false) {
  api("/api/usage", {
    method: "POST",
    body: JSON.stringify({ contentType, contentId, helpful }),
  }).catch(() => {
    // Auch hier: Statistik darf den Ablauf nicht blockieren.
  });
}

function renderDiagnosticChecklist() {
  const selectedType = $("#diag-type").value;
  const items = DIAGNOSTICS[selectedType] || [];
  $("#diag-checklist").innerHTML = items.map((item, index) => `
    <label class="checklist-item">
      <input type="checkbox" value="${escapeHtml(item)}" id="diag-step-${index}">
      <span>${escapeHtml(item)}</span>
    </label>
  `).join("");
}

function initializeDiagnostics() {
  $("#diag-type").innerHTML = Object.keys(DIAGNOSTICS)
    .map((name) => `<option>${escapeHtml(name)}</option>`)
    .join("");
  renderDiagnosticChecklist();
}

function generateDiagnosticText() {
  const selectedSteps = [...$("#diag-checklist").querySelectorAll("input:checked")]
    .map((input) => `✓ ${input.value}`);

  const lines = [
    `Diagnose: ${$("#diag-type").value}`,
    $("#diag-ticket").value.trim() ? `Ticket: ${$("#diag-ticket").value.trim()}` : "",
    $("#diag-user").value.trim() ? `Benutzer: ${$("#diag-user").value.trim()}` : "",
    $("#diag-device").value.trim() ? `Gerät: ${$("#diag-device").value.trim()}` : "",
    "",
    "Durchgeführte Prüfungen:",
    selectedSteps.length ? selectedSteps.join("\n") : "- Keine Prüfschritte ausgewählt",
    "",
    "Notizen / Ergebnisse:",
    $("#diag-notes").value.trim() || "- Keine zusätzlichen Notizen",
    "",
    `Bearbeitet von: ${state.settings.signatureName || state.user.displayName}`,
  ].filter((line, index, values) => line !== "" || values[index - 1] !== "");

  $("#diag-output").textContent = lines.join("\n");
}

function resetDiagnostics() {
  $("#diag-checklist").querySelectorAll("input").forEach((input) => {
    input.checked = false;
  });
  ["#diag-user", "#diag-device", "#diag-ticket", "#diag-notes"].forEach((selector) => {
    $(selector).value = "";
  });
  $("#diag-output").textContent = "Noch kein Text erzeugt.";
}

function fieldValue(selector, fallback = "-") {
  return $(selector).value.trim() || fallback;
}

/** Nimmt nur ausgefuellte Felder auf -- leere Zeilen blaehen den Text nur auf. */
function optionalLine(label, selector) {
  const value = $(selector).value.trim();
  return value ? `${label}: ${value}` : null;
}

/** Mehrzeiliger Abschnitt, ebenfalls nur wenn befuellt. */
function optionalBlock(label, selector) {
  const value = $(selector).value.trim();
  return value ? `${label}:\n${value}` : null;
}

/**
 * Baut den Tickettext aus den Formularfeldern.
 *
 * Aufbau: Kopfdaten, dann Fehlerbild und Schritte, dann ein je nach Textart
 * unterschiedlicher Teil. Leere Felder werden ausgelassen, damit der Text auch
 * bei schnell erfassten Tickets sauber bleibt.
 */
function generateTicketText() {
  const mode = $("#gen-mode").value;
  const MODE_TITLES = {
    solution: "LÖSUNG / ABSCHLUSS",
    progress: "ZWISCHENSTAND",
    escalation: "ESKALATION AN 3RD LEVEL",
    handover: "ÜBERGABE AN KOLLEGEN",
    callback: "RÜCKFRAGE AN BENUTZER",
    external: "WEITERGABE AN HERSTELLER",
    onsite: "VOR-ORT-EINSATZ",
    documentation: "DOKUMENTATION",
  };

  const header = [
    MODE_TITLES[mode] || "TICKET",
    "".padEnd((MODE_TITLES[mode] || "TICKET").length, "="),
    "",
    `Ticket: ${fieldValue("#gen-ticket")}`,
    `Priorität: ${fieldValue("#gen-priority")}`,
    `Benutzer: ${fieldValue("#gen-user")}`,
    optionalLine("Standort / Abteilung", "#gen-location"),
    `Gerät: ${fieldValue("#gen-device")}`,
    optionalLine("Inventar- / Seriennummer", "#gen-asset"),
    optionalLine("Betroffene Benutzer/Systeme", "#gen-affected"),
    `Auswirkung: ${fieldValue("#gen-impact")}`,
    optionalLine("Problem besteht seit", "#gen-since"),
    optionalLine("Erreichbarkeit", "#gen-contact"),
  ].filter(Boolean);

  const situation = [
    "",
    `Fehlerbild / Auswirkungen:\n${fieldValue("#gen-issue")}`,
    "",
    `Durchgeführte Schritte:\n${fieldValue("#gen-steps")}`,
    "",
    `Arbeit weiterhin möglich: ${fieldValue("#gen-workaround-state")}`,
    optionalBlock("Behelfslösung", "#gen-workaround"),
  ].filter((line) => line !== null);

  // Je Textart nur die Bloecke, die dort auch gebraucht werden.
  const BY_MODE = {
    escalation: () => [
      `Aktuelles Ergebnis / offene Frage:\n${fieldValue("#gen-result")}`,
      `Zielteam: ${fieldValue("#gen-team")}`,
      `Reproduzierbar: ${fieldValue("#gen-repro")}`,
      optionalBlock("Reproduktionsschritte", "#gen-reprosteps"),
      optionalBlock("Logs / Fehlercodes / Zeitstempel", "#gen-logs"),
      optionalBlock("Konkrete Frage an den 3rd Level", "#gen-request"),
      optionalBlock("Nächste Schritte", "#gen-next"),
    ],
    handover: () => [
      `Aktueller Stand:\n${fieldValue("#gen-result")}`,
      `Übergabe an: ${fieldValue("#gen-team")}`,
      optionalBlock("Logs / Fehlercodes / Zeitstempel", "#gen-logs"),
      optionalBlock("Was noch zu tun ist", "#gen-next"),
      optionalBlock("Hinweise für den Kollegen", "#gen-request"),
    ],
    external: () => [
      `Aktueller Stand:\n${fieldValue("#gen-result")}`,
      `Hersteller / Partner: ${fieldValue("#gen-team")}`,
      `Reproduzierbar: ${fieldValue("#gen-repro")}`,
      optionalBlock("Reproduktionsschritte", "#gen-reprosteps"),
      optionalBlock("Logs / Fehlercodes / Zeitstempel", "#gen-logs"),
      optionalBlock("Anliegen an den Hersteller", "#gen-request"),
      optionalBlock("Nächste Schritte", "#gen-next"),
    ],
    callback: () => [
      `Offene Rückfrage:\n${fieldValue("#gen-request")}`,
      optionalBlock("Bisheriger Stand", "#gen-result"),
      "",
      "Das Ticket bleibt bis zur Rückmeldung des Benutzers geöffnet.",
    ],
    onsite: () => [
      `Ergebnis vor Ort:\n${fieldValue("#gen-result")}`,
      optionalBlock("Nächste Schritte", "#gen-next"),
    ],
    progress: () => [
      `Aktueller Zwischenstand:\n${fieldValue("#gen-result")}`,
      optionalBlock("Logs / Fehlercodes / Zeitstempel", "#gen-logs"),
      optionalBlock("Nächste Schritte", "#gen-next"),
      "",
      "Das Ticket bleibt bis zur weiteren Klärung geöffnet.",
    ],
    documentation: () => [
      optionalBlock("Beobachtung / Ergebnis", "#gen-result"),
      optionalBlock("Logs / Fehlercodes / Zeitstempel", "#gen-logs"),
      optionalBlock("Nächste Schritte", "#gen-next"),
    ],
    solution: () => [
      `Ergebnis / Lösung:\n${fieldValue("#gen-result")}`,
      optionalBlock("Ursache", "#gen-logs"),
      optionalBlock("Hinweis für den Benutzer", "#gen-request"),
      "",
      "Das Anliegen wurde gelöst und kann abgeschlossen werden.",
    ],
  };

  const specific = (BY_MODE[mode] || BY_MODE.solution)()
    .filter(Boolean)
    .flatMap((block) => ["", block]);

  $("#gen-output").textContent = [
    ...header,
    ...situation,
    ...specific,
    "",
    `Bearbeitet von: ${state.settings.signatureName || state.user.displayName}`,
  ].join("\n");
}

function clearGenerator() {
  // Alle Eingabefelder des Generators auf einmal leeren. Bewusst ueber das
  // id-Praefix statt ueber eine gepflegte Liste -- so werden neue Felder
  // automatisch mit zurueckgesetzt.
  $$("#view-generator input, #view-generator textarea").forEach((field) => {
    field.value = "";
  });

  // Auswahlfelder auf ihren jeweiligen Standard (erste bzw. sinnvolle Option).
  $("#gen-mode").value = "solution";
  $("#gen-priority").value = "Normal";
  $("#gen-repro").value = "Unbekannt";
  $("#gen-impact").value = "Einzelner Benutzer";
  $("#gen-workaround-state").value = "Ja, ohne Einschränkung";
  $("#gen-output").textContent = "Noch kein Text erzeugt.";
}

function historyRow(item, type) {
  const canRestore = canReview();
  const subtitle = type === "version"
    ? `Version ${item.version} · ${formatDate(item.created_at)} · ${escapeHtml(item.changed_by_name || "")}`
    : `Archiviert am ${formatDate(item.updated_at)} · Version ${item.version}`;

  return `
    <article class="history-row">
      <div>
        <h4>${escapeHtml(item.title)}</h4>
        <p>${subtitle}</p>
      </div>
      <div class="history-actions">
        ${canRestore
        ? `<button type="button" data-restore-${type}="${item.id}">Wiederherstellen</button>`
        : ""}
        ${isAdmin()
        ? `<button class="danger-button" type="button" data-purge-${type}="${item.id}">${
          type === "template" ? "Endgültig löschen" : "Version löschen"
        }</button>`
        : ""}
      </div>
    </article>
  `;
}

async function loadHistory() {
  const data = await api("/api/history");
  $("#template-version-list").innerHTML = data.versions.length
    ? data.versions.map((item) => historyRow(item, "version")).join("")
    : '<div class="history-empty">Noch keine älteren Vorlagen-Versionen vorhanden.</div>';

  $("#template-trash-list").innerHTML = data.trash.length
    ? data.trash.map((item) => historyRow(item, "template")).join("")
    : '<div class="history-empty">Der Papierkorb ist leer.</div>';
}

async function restoreHistoryItem(type, id) {
  if (!confirm("Diesen Stand wirklich wiederherstellen?")) return;
  await api(`/api/history/${type}/${id}/restore`, {
    method: "POST",
    body: "{}",
  });
  showToast("Vorlage wurde wiederhergestellt.");
  await loadBootstrap();
  await loadHistory();
}

/**
 * Entfernt eine archivierte Vorlage endgueltig.
 *
 * Der Titel steht in der Rueckfrage, damit klar ist, welche Vorlage betroffen
 * ist -- der Vorgang laesst sich nicht rueckgaengig machen.
 */
/**
 * Entfernt einen einzelnen Eintrag aus der Versionshistorie.
 *
 * Betroffen ist nur der alte Stand -- die Vorlage selbst bleibt unveraendert.
 * Das steht auch in der Rueckfrage, damit die Tragweite klar ist.
 */
async function purgeVersion(id) {
  const row = $(`[data-purge-version="${id}"]`)?.closest(".history-row");
  const title = row?.querySelector("h4")?.textContent ?? "Dieser Stand";

  if (!confirm(`Diese Version von „${title}“ endgültig löschen?\n\nDer alte Stand wird unwiderruflich aus der Historie entfernt. Die Vorlage selbst bleibt unverändert.`)) {
    return;
  }

  await api(`/api/history/version/${id}`, { method: "DELETE" });
  showToast("Version wurde gelöscht.");
  await loadHistory();
}

async function purgeTemplate(id) {
  const title = $(`[data-purge-template="${id}"]`)
    ?.closest(".history-row")
    ?.querySelector("h4")
    ?.textContent ?? "Diese Vorlage";

  if (!confirm(`„${title}“ endgültig löschen?\n\nDie Vorlage und ihre Versionshistorie werden unwiderruflich entfernt.`)) {
    return;
  }

  await api(`/api/history/template/${id}`, { method: "DELETE" });
  showToast("Vorlage wurde endgültig gelöscht.");
  await loadHistory();
}

function canReview() {
  return ["editor", "admin"].includes(state.user?.role);
}

function applyRoleVisibility() {
  $$("[data-role='admin']").forEach((element) => {
    element.classList.toggle("hidden", state.user?.role !== "admin");
  });
  $$("[data-role='reviewer']").forEach((element) => {
    element.classList.toggle("hidden", !canReview());
  });
}

async function loadBootstrap() {
  const data = await api("/api/bootstrap");
  state.user = data.user;
  state.categories = data.categories;
  state.templates = data.templates;
  state.commands = data.commands;
  state.solutions = data.solutions || [];
  state.avatars = data.avatars || [];
  // Der eigene Avatar wird getrennt gehalten: Im Editor wird er bearbeitet,
  // bevor er gespeichert ist, und darf die Liste solange nicht veraendern.
  state.avatar = state.avatars.find((item) => item.id === data.user.id)?.avatar
    || avatarFromName(data.user.displayName);
  let parsedFavorites = {};
  let parsedPreferences = {};
  try {
    parsedFavorites = JSON.parse(
      data.settings.favorites_json || '{"templates":[],"commands":[]}',
    );
  } catch {
    parsedFavorites = {};
  }
  try {
    parsedPreferences = JSON.parse(data.settings.preferences_json || "{}");
  } catch {
    parsedPreferences = {};
  }

  state.settings = {
    signatureName: data.settings.signature_name || "",
    favorites: normalizeFavorites(parsedFavorites),
    preferences: normalizePreferences(parsedPreferences),
  };

  applyTheme(state.settings.preferences.theme);
  // Rolle nur zeigen, wenn sie sich vom Anzeigenamen unterscheidet -- sonst
  // stuende bei einem Konto namens "Administrator" zweimal dasselbe.
  const role = roleLabel(state.user.role);
  const showRole = role.toLowerCase() !== state.user.displayName.trim().toLowerCase();
  $("#current-user").innerHTML = `<strong>${escapeHtml(state.user.displayName)}</strong>`
    + (showRole ? `<br>${escapeHtml(role)}` : "");
  $("#signature-name").value = state.settings.signatureName;
  $("#theme-select").value = state.settings.preferences.theme;
  populateCategories();
  populateCommandCategories();
  applyRoleVisibility();
  renderTemplates();
  renderCommands();
  renderSolutions();
  populateSolutionCategories();
  loadRecentItems();
  loadCases().catch(() => {
    // Faelle sind Beiwerk beim Start -- ein Fehler darf den Aufbau nicht stoppen.
  });
  loadReminders().catch(() => {});
}

function populateCategories() {
  const options = state.categories
    .map((category) => `<option value="${category.id}">${escapeHtml(category.name)}</option>`)
    .join("");
  $("#proposal-category").innerHTML = options;
  $("#template-category-filter").innerHTML = `<option value="">Alle Kategorien</option>${options}`;
}

function selectedProposalCategoryMode() {
  return document.querySelector("input[name='proposal-category-mode']:checked")?.value || "existing";
}

function syncProposalCategoryMode() {
  const directEdit = $("#proposal-dialog").dataset.mode === "direct-edit";
  const mode = selectedProposalCategoryMode();
  const existingWrap = $("#proposal-category-existing-wrap");
  const newWrap = $("#proposal-category-new-wrap");
  const categorySelect = $("#proposal-category");
  const categoryName = $("#proposal-category-name");
  const modeInputs = [...document.querySelectorAll("input[name='proposal-category-mode']")];

  modeInputs.forEach((input) => {
    input.disabled = directEdit;
  });

  existingWrap.classList.toggle("hidden", !directEdit && mode !== "existing" ? true : false);
  newWrap.classList.toggle("hidden", directEdit || mode !== "new");
  categorySelect.required = directEdit || mode === "existing";
  categoryName.required = !directEdit && mode === "new";
}

function replacePersonalPlaceholders(text) {
  // Gleiche Rangfolge wie bei den erzeugten Ticket-Texten: bevorzugt der
  // selbst gesetzte Signaturname, sonst der Anmeldename. Nur wenn beides
  // fehlt, bleibt der Platzhalter sichtbar stehen.
  const name = state.settings.signatureName || state.user?.displayName || "[ICH]";
  return replaceLiteral(text, "[ICH]", name);
}

/**
 * Kopiert Text in die Zwischenablage.
 *
 * Die persoenlichen Platzhalter werden bewusst hier und nicht bei den
 * Aufrufern ersetzt: So ist kein Kopierweg davon ausgenommen - egal ob
 * Vorlagenliste, Loesung oder Schnellsuche. Bei Texten ohne Platzhalter
 * bleibt der Aufruf wirkungslos.
 */
async function copyText(text) {
  await navigator.clipboard.writeText(replacePersonalPlaceholders(text));
  showToast("In Zwischenablage kopiert.");
}

/**
 * Kopiert eine Vorlage und vermerkt die Nutzung.
 *
 * Der Zaehler steuert die Sortierung "zuletzt benutzt". Er wird bewusst ohne
 * await und mit verschlucktem Fehler gezaehlt: Das Kopieren soll nie daran
 * scheitern, dass die Statistik nicht geschrieben werden konnte.
 */
async function copyTemplate(template) {
  await copyText(template.body);
  addRecentItem("template", template.id, template.title);
  trackInCase("template", template.id, template.title);

  template.use_count = (template.use_count || 0) + 1;
  template.last_used_at = new Date().toISOString().replace("T", " ").slice(0, 19);

  api(`/api/templates/${template.id}/use`, { method: "POST", body: "{}" })
    .catch(() => {});
}

function templateCard(template) {
  const updatedAt = formatDate(template.updated_at);
  const favorite = isFavorite("template", template.id);
  const submittedBy = template.created_by_name
    ? `Eingereicht von ${escapeHtml(template.created_by_name)} · `
    : "";

  return `
    <details class="card category-card" style="--category-color:${template.category_color}">
      <summary>
        <button
          class="favorite-button ${favorite ? "active" : ""}"
          type="button"
          data-favorite-template="${template.id}"
          aria-label="${favorite ? "Vorlage aus Favoriten entfernen" : "Vorlage favorisieren"}"
          aria-pressed="${favorite}"
          title="${favorite ? "Favorit entfernen" : "Als Favorit markieren"}"
        >★</button>
        <div class="summary-main">
          <span
            class="badge category-badge"
            style="--category-color:${template.category_color}"
          >
            ${escapeHtml(template.category_name)}
          </span>
          <span class="summary-title">${escapeHtml(template.title)}</span>
        </div>
        <span class="summary-meta">
          ${template.use_count > 0 ? `<span class="usage-badge" title="So oft hast du diese Vorlage kopiert">${template.use_count}× benutzt</span> · ` : ""}${submittedBy}${updatedAt ? `Aktualisiert am ${updatedAt} · ` : ""}Version ${template.version}
        </span>
      </summary>
      <div class="card-content">
        <div class="template-body">${highlightPlaceholders(template.body)}</div>
        <div class="card-actions">
          <button class="primary" data-copy-template="${template.id}">Kopieren</button>
          <button data-edit-template="${template.id}">${isAdmin() ? "Direkt bearbeiten" : "Änderung vorschlagen"}</button>
          ${isAdmin() ? `<button class="danger-button" data-delete-template="${template.id}">Löschen</button>` : ""}
        </div>
      </div>
    </details>`;
}

function compareText(left, right) {
  return String(left ?? "").localeCompare(String(right ?? ""), "de", {
    sensitivity: "base",
    numeric: true,
  });
}

function compareUpdatedAt(left, right) {
  const leftTime = Date.parse(left.updated_at || "") || 0;
  const rightTime = Date.parse(right.updated_at || "") || 0;
  return leftTime - rightTime;
}

function sortTemplates(templates) {
  const sortBy = $("#template-sort")?.value || "recent-used";
  const sorted = [...templates];

  sorted.sort((left, right) => {
    // Zuletzt benutzte zuerst; noch nie benutzte Vorlagen rutschen ans Ende
    // und werden dort nach Aktualitaet sortiert.
    if (sortBy === "recent-used") {
      const leftUsed = left.last_used_at || "";
      const rightUsed = right.last_used_at || "";
      if (leftUsed !== rightUsed) return rightUsed.localeCompare(leftUsed);
      return compareUpdatedAt(right, left) || compareText(left.title, right.title);
    }

    if (sortBy === "most-used") {
      const difference = (right.use_count || 0) - (left.use_count || 0);
      if (difference !== 0) return difference;
      return compareUpdatedAt(right, left) || compareText(left.title, right.title);
    }

    if (sortBy === "updated-asc") {
      return compareUpdatedAt(left, right) ||
        compareText(left.title, right.title);
    }

    if (sortBy === "title-asc") {
      return compareText(left.title, right.title) ||
        compareText(left.category_name, right.category_name);
    }

    if (sortBy === "title-desc") {
      return compareText(right.title, left.title) ||
        compareText(right.category_name, left.category_name);
    }

    if (sortBy === "category-asc") {
      return compareText(left.category_name, right.category_name) ||
        compareText(left.title, right.title);
    }

    if (sortBy === "category-desc") {
      return compareText(right.category_name, left.category_name) ||
        compareText(left.title, right.title);
    }

    return compareUpdatedAt(right, left) ||
      compareText(left.title, right.title);
  });

  return sorted;
}

function renderTemplates() {
  const search = $("#template-search").value.trim().toLowerCase();
  const category = $("#template-category-filter").value;
  const templates = sortTemplates(state.templates.filter((template) => {
    const matchesSearch = !search ||
      template.title.toLowerCase().includes(search) ||
      template.body.toLowerCase().includes(search);
    const matchesCategory = !category || String(template.category_id) === category;
    return matchesSearch && matchesCategory;
  }));

  $("#templates-list").innerHTML = templates.length
    ? templates.map(templateCard).join("")
    : `<div class="panel muted">Keine Vorlagen gefunden.</div>`;

  if (search && !templates.length) reportSearchMiss(search, "templates");
}

/** Feste Farben fuer bekannte Bereiche -- passend zu den Kategorien der Vorlagen. */
const COMMAND_CATEGORY_COLORS = {
  netzwerk: "#42a7c6",
  windows: "#4a7cff",
  benutzer: "#5b8def",
  drucker: "#d89b36",
  software: "#2ea86e",
  hardware: "#d55f5f",
  vpn: "#b36ae2",
  "e-mail": "#d97706",
  berechtigungen: "#5b8def",
  sicherheit: "#8b5cf6",
  speicher: "#1f9d8b",
  dienste: "#c05621",
};

/** Ausweichpalette fuer Bereiche ohne feste Farbe. */
const CATEGORY_FALLBACK_COLORS = [
  "#4a7cff", "#2ea86e", "#d89b36", "#b36ae2", "#d55f5f",
  "#42a7c6", "#1f9d8b", "#c05621", "#8b5cf6", "#d97706",
];

/**
 * Liefert eine stabile Farbe fuer einen Bereich. Bekannte Bereiche bekommen ihre
 * feste Farbe, alle anderen eine per Namen gehashte -- so bleibt sie ueber
 * Neuladen hinweg gleich.
 */
function commandCategoryColor(category) {
  const key = String(category || "").trim().toLowerCase();
  if (COMMAND_CATEGORY_COLORS[key]) return COMMAND_CATEGORY_COLORS[key];

  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  }
  return CATEGORY_FALLBACK_COLORS[hash % CATEGORY_FALLBACK_COLORS.length];
}

function commandCard(command) {
  const warning = command.risk_level === "high"
    ? "Hohes Risiko"
    : command.risk_level === "medium"
      ? "Mittleres Risiko"
      : "Niedriges Risiko";
  const favorite = isFavorite("command", command.id);
  const color = commandCategoryColor(command.category);

  return `
    <details class="card category-card" style="--category-color:${color}">
      <summary>
        <button
          class="favorite-button ${favorite ? "active" : ""}"
          type="button"
          data-favorite-command="${command.id}"
          aria-label="${favorite ? "Befehl aus Favoriten entfernen" : "Befehl favorisieren"}"
          aria-pressed="${favorite}"
          title="${favorite ? "Favorit entfernen" : "Als Favorit markieren"}"
        >★</button>
        <div class="summary-main">
          <span
            class="badge category-badge"
            style="--category-color:${color}"
          >${escapeHtml(command.category)}</span>
          <span class="summary-title">${escapeHtml(command.name)}</span>
        </div>
        <span class="summary-meta">
          <span class="badge shell-badge">${escapeHtml(command.shell)}</span>
          <span class="badge risk-badge risk-${escapeHtml(command.risk_level)}">${warning}</span>
        </span>
      </summary>
      <div class="card-content">
        <p class="muted">${escapeHtml(command.description)}</p>
        <div class="badges">
          <span class="badge shell-badge">${escapeHtml(command.shell)}</span>
          <span class="badge risk-badge risk-${escapeHtml(command.risk_level)}">${warning}</span>
          ${command.requires_admin ? '<span class="badge flag-badge flag-admin">Admin</span>' : ""}
          ${command.remote_capable ? '<span class="badge flag-badge flag-remote">Remote</span>' : ""}
          ${command.restart_required ? '<span class="badge flag-badge flag-restart">Neustart</span>' : ""}
        </div>
        <code class="command-code">${escapeHtml(command.command)}</code>
        <div class="card-actions">
          <button class="primary" data-copy-command="${command.id}">Kopieren</button>
          ${isAdmin() ? `<button class="danger-button" data-delete-command="${command.id}">Löschen</button>` : ""}
        </div>
      </div>
    </details>`;
}

/** Rangfolge der Risikostufen fuer die Sortierung. */
const RISK_ORDER = { low: 0, medium: 1, high: 2 };

function sortCommands(commands) {
  const sortBy = $("#command-sort")?.value || "category-asc";
  const sorted = [...commands];

  sorted.sort((left, right) => {
    if (sortBy === "name-asc") return compareText(left.name, right.name);
    if (sortBy === "name-desc") return compareText(right.name, left.name);

    if (sortBy === "risk-asc" || sortBy === "risk-desc") {
      const difference = (RISK_ORDER[left.risk_level] ?? 0)
        - (RISK_ORDER[right.risk_level] ?? 0);
      if (difference !== 0) return sortBy === "risk-asc" ? difference : -difference;
      return compareText(left.name, right.name);
    }

    // Befehle ohne Adminrechte zuerst -- die kann man dem Benutzer direkt geben.
    if (sortBy === "no-admin") {
      const difference = (left.requires_admin ? 1 : 0) - (right.requires_admin ? 1 : 0);
      if (difference !== 0) return difference;
      return compareText(left.name, right.name);
    }

    return compareText(left.category, right.category)
      || compareText(left.name, right.name);
  });

  return sorted;
}

/** Fuellt den Bereichsfilter aus den tatsaechlich vorhandenen Befehlen. */
function populateCommandCategories() {
  const select = $("#command-category-filter");
  if (!select) return;

  const previous = select.value;
  const categories = [...new Set(state.commands.map((command) => command.category))]
    .sort((left, right) => compareText(left, right));

  select.innerHTML = `<option value="">Alle Bereiche</option>${
    categories.map((category) =>
      `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")
  }`;
  // Auswahl beibehalten, sofern der Bereich noch existiert.
  if (categories.includes(previous)) select.value = previous;
}

function renderCommands() {
  const search = $("#command-search").value.trim().toLowerCase();
  const category = $("#command-category-filter")?.value || "";
  const shell = $("#command-shell-filter")?.value || "";

  const commands = sortCommands(state.commands.filter((command) =>
    (!category || command.category === category) &&
    (!shell || command.shell === shell) &&
    (!search ||
      command.name.toLowerCase().includes(search) ||
      command.command.toLowerCase().includes(search) ||
      command.description.toLowerCase().includes(search))
  ));

  $("#commands-list").innerHTML = commands.length
    ? commands.map(commandCard).join("")
    : `<div class="panel muted">Keine Befehle gefunden.</div>`;

  if (search && !commands.length) reportSearchMiss(search, "commands");

  // Mitarbeiter schlagen vor, Redakteure und Admins legen direkt an.
  const button = $("#new-command-button");
  if (button) {
    button.textContent = canReview() ? "+ Befehl hinzufügen" : "+ Befehl vorschlagen";
  }
}

/* ============================================================
   Loesungen fuer bekannte Probleme
   ============================================================
   Aufbau wie bei den Befehlen: farbcodierte Bereiche, Suche, Filter. Wer
   einreichen darf statt direkt anzulegen, entscheidet die Rolle -- siehe
   openSolutionDialog.
*/

const SEVERITY_LABELS = { low: "Niedrig", medium: "Mittel", high: "Hoch" };
const SEVERITY_ORDER = { low: 0, medium: 1, high: 2 };

function solutionCard(solution) {
  const color = commandCategoryColor(solution.category);
  const severity = SEVERITY_LABELS[solution.severity] || solution.severity;

  return `
    <details class="card category-card" style="--category-color:${color}">
      <summary>
        <div class="summary-main">
          <span class="badge category-badge">${escapeHtml(solution.category)}</span>
          <span class="summary-title">${escapeHtml(solution.title)}</span>
        </div>
        <span class="summary-meta">
          <span class="badge risk-badge risk-${escapeHtml(solution.severity)}">${severity}</span>
        </span>
      </summary>
      <div class="card-content">
        <div class="solution-block">
          <span class="solution-label">Symptom</span>
          <div class="template-body">${escapeHtml(solution.symptom)}</div>
        </div>
        ${solution.cause ? `
          <div class="solution-block">
            <span class="solution-label">Ursache</span>
            <div class="template-body">${escapeHtml(solution.cause)}</div>
          </div>` : ""}
        <div class="solution-block">
          <span class="solution-label">Lösungsweg</span>
          ${renderSolutionSteps(solution)}
        </div>
        <div class="card-actions">
          <button class="primary" data-copy-solution="${solution.id}">Lösungsweg kopieren</button>
          <button data-helpful-solution="${solution.id}">Hat geholfen</button>
          <button data-edit-solution="${solution.id}">${
            canReview() ? "Bearbeiten" : "Änderung vorschlagen"
          }</button>
          ${isAdmin() ? `<button class="danger-button" data-delete-solution="${solution.id}">Löschen</button>` : ""}
        </div>
      </div>
    </details>`;
}

/**
 * Stellt den Loesungsweg als abhakbare Schritte dar.
 *
 * Nummerierte Zeilen ("1. ...") werden zu einzelnen Schritten; enthaelt ein
 * Schritt einen erkennbaren Befehl, bekommt er einen Kopierknopf. Texte ohne
 * Nummerierung bleiben unveraendert -- eine erzwungene Aufteilung riss
 * Fliesstext an den falschen Stellen auseinander.
 */
function renderSolutionSteps(solution) {
  const zeilen = String(solution.solution).split("\n").map((zeile) => zeile.trim());
  const schritte = zeilen.filter((zeile) => /^\d+\.\s/.test(zeile));

  if (schritte.length < 2) {
    return `<div class="template-body">${escapeHtml(solution.solution)}</div>`;
  }

  // Zeilen vor dem ersten Schritt und Hinweise am Ende bleiben als Text stehen.
  const ersterIndex = zeilen.findIndex((zeile) => /^\d+\.\s/.test(zeile));
  const nachspann = zeilen.slice(ersterIndex + schritte.length)
    .filter(Boolean).join("\n");

  return `
    <ol class="solution-steps" data-solution-steps="${solution.id}">
      ${schritte.map((schritt, index) => {
        const text = schritt.replace(/^\d+\.\s*/, "");
        const befehl = extractCommand(text);
        return `
          <li class="solution-step">
            <label class="step-check">
              <input type="checkbox" data-step="${index}">
              <span>${escapeHtml(text)}</span>
            </label>
            ${befehl
              ? `<button class="btn-link" type="button"
                         data-copy-step="${escapeHtml(befehl)}">Befehl kopieren</button>`
              : ""}
          </li>`;
      }).join("")}
    </ol>
    ${nachspann ? `<p class="muted">${escapeHtml(nachspann)}</p>` : ""}`;
}

/**
 * Zieht einen ausfuehrbaren Befehl aus einem Schritt.
 *
 * Erkennt die im Bestand ueblichen Schreibweisen ("Dienst beenden: net stop
 * spooler") sowie bekannte Kommandos am Zeilenanfang. Bewusst konservativ --
 * lieber kein Knopf als einer, der Fliesstext kopiert.
 */
const KNOWN_COMMANDS = /\b(ipconfig|net|netsh|gpupdate|sfc|dism|chkdsk|nslookup|route|whoami|klist|vssadmin|systeminfo|tasklist|shutdown)\b/;

function extractCommand(text) {
  const nachDoppelpunkt = text.split(": ").slice(1).join(": ").trim();
  const kandidat = KNOWN_COMMANDS.test(nachDoppelpunkt) ? nachDoppelpunkt : text.trim();

  if (!KNOWN_COMMANDS.test(kandidat)) return null;
  // Saetze mit Satzzeichen am Ende sind Beschreibungen, keine Befehle.
  if (/[.!?]$/.test(kandidat) || kandidat.split(/\s+/).length > 8) return null;

  return kandidat;
}

function sortSolutions(solutions) {
  const sortBy = $("#solution-sort")?.value || "category-asc";
  const sorted = [...solutions];

  sorted.sort((left, right) => {
    if (sortBy === "title-asc") return compareText(left.title, right.title);
    if (sortBy === "title-desc") return compareText(right.title, left.title);

    if (sortBy === "severity-asc" || sortBy === "severity-desc") {
      const difference = (SEVERITY_ORDER[left.severity] ?? 0)
        - (SEVERITY_ORDER[right.severity] ?? 0);
      if (difference !== 0) return sortBy === "severity-asc" ? difference : -difference;
      return compareText(left.title, right.title);
    }

    return compareText(left.category, right.category)
      || compareText(left.title, right.title);
  });

  return sorted;
}

/** Fuellt den Bereichsfilter aus den vorhandenen Loesungen. */
function populateSolutionCategories() {
  const select = $("#solution-category-filter");
  if (!select) return;

  const previous = select.value;
  const categories = [...new Set(state.solutions.map((item) => item.category))]
    .sort((left, right) => compareText(left, right));

  select.innerHTML = `<option value="">Alle Bereiche</option>${
    categories.map((category) =>
      `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")
  }`;
  if (categories.includes(previous)) select.value = previous;
}

function renderSolutions() {
  const list = $("#solutions-list");
  if (!list) return;

  const search = $("#solution-search").value.trim().toLowerCase();
  const category = $("#solution-category-filter")?.value || "";
  const severity = $("#solution-severity-filter")?.value || "";

  const solutions = sortSolutions(state.solutions.filter((item) =>
    (!category || item.category === category) &&
    (!severity || item.severity === severity) &&
    (!search ||
      item.title.toLowerCase().includes(search) ||
      item.symptom.toLowerCase().includes(search) ||
      item.solution.toLowerCase().includes(search) ||
      (item.cause || "").toLowerCase().includes(search))
  ));

  list.innerHTML = solutions.length
    ? solutions.map(solutionCard).join("")
    : `<div class="panel muted">Keine Lösungen gefunden.</div>`;

  if (search && !solutions.length) reportSearchMiss(search, "solutions");

  // Beschriftung des Knopfs richtet sich nach der Rolle.
  const button = $("#new-solution-button");
  if (button) {
    button.textContent = canReview() ? "+ Lösung hinzufügen" : "+ Lösung vorschlagen";
  }
}

/**
 * Oeffnet den Loesungsdialog.
 *
 * Redakteure und Admins speichern direkt, Mitarbeiter reichen einen Vorschlag
 * ein. Der Dialog ist derselbe -- nur das Begruendungsfeld und die Beschriftung
 * unterscheiden sich.
 */
function openSolutionDialog(solution = null) {
  const direct = canReview();
  const dialog = $("#solution-dialog");

  dialog.dataset.mode = direct ? "direct" : "proposal";
  dialog.dataset.solutionId = solution?.id || "";

  $("#solution-title").value = solution?.title || "";
  $("#solution-category").value = solution?.category || "";
  $("#solution-severity").value = solution?.severity || "medium";
  $("#solution-symptom").value = solution?.symptom || "";
  $("#solution-cause").value = solution?.cause || "";
  $("#solution-steps").value = solution?.solution || "";
  $("#solution-reason").value = "";

  $("#solution-reason-field").classList.toggle("hidden", direct);
  $("#solution-dialog-title").textContent = solution
    ? (direct ? "Lösung bearbeiten" : "Änderung vorschlagen")
    : (direct ? "Lösung hinzufügen" : "Lösung vorschlagen");
  $("#solution-submit").textContent = direct ? "Speichern" : "Zur Freigabe einreichen";

  dialog.showModal();
}

async function submitSolution(event) {
  event.preventDefault();
  const dialog = $("#solution-dialog");
  const direct = dialog.dataset.mode === "direct";
  const solutionId = dialog.dataset.solutionId || "";

  const payload = {
    category: $("#solution-category").value,
    title: $("#solution-title").value,
    symptom: $("#solution-symptom").value,
    cause: $("#solution-cause").value || null,
    solution: $("#solution-steps").value,
    severity: $("#solution-severity").value,
  };

  try {
    if (direct) {
      await api(solutionId ? `/api/solutions/${solutionId}` : "/api/solutions", {
        method: solutionId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      showToast(solutionId ? "Lösung gespeichert." : "Lösung angelegt.");
    } else {
      await api("/api/content-proposals", {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          contentType: "solution",
          targetId: solutionId || null,
          reason: $("#solution-reason").value || null,
        }),
      });
      showToast("Vorschlag wurde zur Freigabe eingereicht.");
    }

    dialog.close();
    await loadBootstrap();
    renderSolutions();
  } catch (error) {
    alert(error.message);
  }
}

function feedbackTypeLabel(type) {
  return type === "bug" ? "Bug" : "Verbesserung";
}

function feedbackStatusLabel(status) {
  return {
    open: "Offen",
    planned: "Geplant",
    closed: "Erledigt",
  }[status] || status;
}

function feedbackCard(item) {
  const isAdminView = isAdmin();

  return `
    <article class="card">
      <div class="card-header">
        <div>
          <h3>${escapeHtml(item.title)}</h3>
          <div class="badges">
            <span class="badge">${feedbackTypeLabel(item.type)}</span>
            <span class="badge">${feedbackStatusLabel(item.status)}</span>
          </div>
        </div>
      </div>
      <div class="card-content">
        <p class="muted">Von ${escapeHtml(item.submitted_by_name)} · ${formatDate(item.created_at)}</p>
        <div class="template-body">${escapeHtml(item.message)}</div>
        ${item.admin_note ? `<div class="notice">Admin-Notiz: ${escapeHtml(item.admin_note)}</div>` : ""}
        ${isAdminView ? `
          <div class="feedback-admin-actions">
            <select data-feedback-status="${item.id}">
              <option value="open" ${item.status === "open" ? "selected" : ""}>Offen</option>
              <option value="planned" ${item.status === "planned" ? "selected" : ""}>Geplant</option>
              <option value="closed" ${item.status === "closed" ? "selected" : ""}>Erledigt</option>
            </select>
            <input data-feedback-note="${item.id}" value="${escapeHtml(item.admin_note || "")}" placeholder="Admin-Notiz">
            <button class="btn-primary" type="button" data-feedback-save="${item.id}">Speichern</button>
          </div>
        ` : ""}
      </div>
    </article>`;
}

async function loadFeedback() {
  const data = await api("/api/feedback");
  state.feedbackItems = data.items;
  $("#feedback-list").innerHTML = state.feedbackItems.length
    ? state.feedbackItems.map(feedbackCard).join("")
    : '<div class="panel muted">Noch keine Vorschläge oder Bugs eingereicht.</div>';
}

const CONTENT_TYPE_LABELS = { command: "Befehl", solution: "Lösung" };

const PROPOSAL_STATUS_LABELS = {
  pending: "Offen",
  approved: "Genehmigt",
  rejected: "Abgelehnt",
  changes_requested: "Überarbeitung nötig",
  withdrawn: "Zurückgezogen",
  draft: "Entwurf",
};

/** Karte fuer einen Befehls- oder Loesungs-Vorschlag. */
function contentProposalCard(proposal, view) {
  const payload = safeParse(proposal.payload_json);
  const label = CONTENT_TYPE_LABELS[proposal.content_type] || proposal.content_type;
  const status = PROPOSAL_STATUS_LABELS[proposal.status] || proposal.status;

  // Je nach Art unterscheiden sich die inhaltlichen Felder.
  const preview = proposal.content_type === "command"
    ? payload.command || ""
    : [payload.symptom, payload.solution].filter(Boolean).join("\n\n");

  return `
    <article class="card">
      <div class="card-header">
        <div>
          <h3>${escapeHtml(proposal.title)}</h3>
          <div class="badges">
            <span class="badge">${escapeHtml(label)}</span>
            <span class="badge">${escapeHtml(payload.category || "")}</span>
            <span class="badge">${escapeHtml(status)}</span>
            ${proposal.proposal_type === "update"
              ? '<span class="badge">Änderung</span>' : ""}
          </div>
        </div>
        ${view === "approvals"
          ? `<button class="primary" data-review-content="${proposal.id}">Prüfen</button>`
          : ""}
      </div>
      <p class="muted">Von ${escapeHtml(proposal.submitted_by_name || state.user.displayName)}</p>
      <div class="template-body">${escapeHtml(preview)}</div>
      ${proposal.reason ? `<p class="muted">Begründung: ${escapeHtml(proposal.reason)}</p>` : ""}
      ${proposal.review_note ? `<div class="notice">${escapeHtml(proposal.review_note)}</div>` : ""}
    </article>`;
}

/** JSON aus der Datenbank -- defekte Daten duerfen die Liste nicht sprengen. */
function safeParse(value) {
  try {
    return JSON.parse(value) || {};
  } catch {
    return {};
  }
}

async function loadProposals(view) {
  // Unter "Meine Vorschlaege" zaehlt die eigene Sicht -- auch fuer Pruefer,
  // die sonst dort die Einreichungen aller Kollegen sehen wuerden.
  const scope = view === "approvals" ? "" : "?scope=mine";
  const [data, contentData] = await Promise.all([
    api(`/api/proposals${scope}`),
    api(`/api/content-proposals${scope}`),
  ]);
  state.proposals = data.proposals;
  state.contentProposals = contentData.proposals;
  const container = view === "approvals" ? $("#approvals-list") : $("#my-proposals-list");

  const contentCards = state.contentProposals
    .map((proposal) => contentProposalCard(proposal, view)).join("");

  container.innerHTML = (state.proposals.length + state.contentProposals.length)
    ? state.proposals.map((proposal) => `
      <article class="card">
        <div class="card-header">
          <div>
            <h3>${escapeHtml(proposal.title)}</h3>
            <div class="badges">
              <span class="badge">${escapeHtml(proposal.category_name || proposal.proposed_category_name || "Neue Kategorie")}</span>
              <span class="badge">${escapeHtml(proposal.status)}</span>
              ${proposal.duplicate_score >= .65
                ? `<span class="badge">Ähnlichkeit ${Math.round(proposal.duplicate_score * 100)} %</span>`
                : ""}
            </div>
          </div>
          ${view === "approvals" ? `<button class="primary" data-review-id="${proposal.id}">Prüfen</button>` : ""}
        </div>
        <p class="muted">Von ${escapeHtml(proposal.submitted_by_name || state.user.displayName)}</p>
        <div class="template-body">${escapeHtml(proposal.body)}</div>
        ${proposal.review_note ? `<div class="notice">${escapeHtml(proposal.review_note)}</div>` : ""}
      </article>`).join("") + contentCards
    : `<div class="panel muted">Keine Einträge vorhanden.</div>`;

  hydrateAvatars(container);

  if (view === "approvals") {
    const open = state.proposals.length + state.contentProposals.length;
    $("#approval-count").textContent = open ? `(${open})` : "";
  }
}

function openProposal(template = null) {
  $("#proposal-template-id").value = template?.id || "";
  $("#proposal-title").value = template?.title || "";
  $("#proposal-category").value = template?.category_id || state.categories[0]?.id || "";
  const directEdit = Boolean(isAdmin() && template);
  $("#proposal-dialog").dataset.mode = directEdit ? "direct-edit" : "proposal";
  document.querySelector("input[name='proposal-category-mode'][value='existing']").checked = true;
  $("#proposal-category-name").value = "";
  $("#proposal-category-color").value = "#4a7cff";
  $("#proposal-body").value = template?.body || "";
  $("#proposal-reason").value = "";
  $("#duplicate-result").classList.add("hidden");
  syncProposalCategoryMode();
  $("#proposal-dialog-title").textContent = directEdit
    ? "Vorlage direkt bearbeiten"
    : template
      ? "Änderung vorschlagen"
      : "Neue Vorlage vorschlagen";
  $("#proposal-form .btn-save").textContent = directEdit ? "Direkt speichern" : "Zur Freigabe einreichen";
  $("#check-duplicate-button").classList.toggle("hidden", directEdit);
  $("#proposal-dialog").showModal();
}

async function checkDuplicate() {
  const result = await api("/api/proposals/check", {
    method: "POST",
    body: JSON.stringify({
      title: $("#proposal-title").value,
      body: $("#proposal-body").value,
      templateId: $("#proposal-template-id").value || null,
    }),
  });

  const box = $("#duplicate-result");
  box.classList.remove("hidden");
  box.textContent = result.duplicate.templateId
    ? `Ähnlichste Vorlage: „${result.duplicate.title}“ (${Math.round(result.duplicate.score * 100)} %)`
    : "Kein Duplikat gefunden.";
}

async function submitProposal(event) {
  event.preventDefault();
  try {
    const categoryMode = selectedProposalCategoryMode();
    const payload = {
      templateId: $("#proposal-template-id").value || null,
      title: $("#proposal-title").value,
      categoryMode,
      categoryId: categoryMode === "existing" ? Number($("#proposal-category").value) : null,
      proposedCategoryName: categoryMode === "new" ? $("#proposal-category-name").value : null,
      proposedCategoryColor: categoryMode === "new" ? $("#proposal-category-color").value : null,
      body: $("#proposal-body").value,
      reason: $("#proposal-reason").value,
      note: $("#proposal-reason").value,
    };

    if ($("#proposal-dialog").dataset.mode === "direct-edit") {
      await api(`/api/templates/${$("#proposal-template-id").value}`, {
        method: "PUT",
        body: JSON.stringify({
          title: payload.title,
          categoryId: Number($("#proposal-category").value),
          body: payload.body,
          note: payload.reason,
        }),
      });
      $("#proposal-dialog").close();
      showToast("Vorlage wurde direkt aktualisiert.");
      await loadBootstrap();
      return;
    }

    const data = await api("/api/proposals", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    $("#proposal-dialog").close();
    showToast(data.duplicate.score >= .65
      ? "Vorschlag eingereicht; mögliche Ähnlichkeit wurde markiert."
      : "Vorschlag wurde zur Freigabe eingereicht.");
    await switchView("proposals");
  } catch (error) {
    alert(error.message);
  }
}

function openReview(proposalId) {
  const proposal = state.proposals.find((item) => item.id === proposalId);
  if (!proposal) return;

  $("#review-dialog").dataset.proposalId = String(proposalId);
  // Zuruecksetzen: sonst wuerde nach einem Inhalts-Vorschlag weiterhin dessen
  // Schnittstelle angesprochen.
  $("#review-dialog").dataset.kind = "template";
  $("#review-note").value = "";
  $("#review-content").innerHTML = `
    <h3>${escapeHtml(proposal.title)}</h3>
    <p class="muted proposal-author">
      ${avatarTag(proposal.submitted_by_name, 18)}Eingereicht von ${escapeHtml(proposal.submitted_by_name)}
    </p>
    <p class="muted">Kategorie: ${escapeHtml(proposal.category_name || proposal.proposed_category_name || "Nicht angegeben")}</p>
    ${proposal.duplicate_title
      ? `<div class="notice">Mögliche Ähnlichkeit mit „${escapeHtml(proposal.duplicate_title)}“: ${Math.round(proposal.duplicate_score * 100)} %</div>`
      : ""}
    <div class="template-body">${escapeHtml(proposal.body)}</div>`;
  $("#review-dialog").showModal();
}

/**
 * Pruefdialog fuer Befehls- und Loesungsvorschlaege.
 *
 * Nutzt denselben Dialog wie die Vorlagen. Welche Schnittstelle beim Bestaetigen
 * angesprochen wird, steht in `dataset.kind` -- ohne diese Unterscheidung liefe
 * die Entscheidung auf den falschen Endpunkt.
 */
function openContentReview(proposalId) {
  const proposal = state.contentProposals.find((item) => item.id === proposalId);
  if (!proposal) return;

  const payload = safeParse(proposal.payload_json);
  const dialog = $("#review-dialog");
  dialog.dataset.proposalId = String(proposalId);
  dialog.dataset.kind = "content";
  $("#review-note").value = "";

  const rows = proposal.content_type === "command"
    ? [
      ["Bereich", payload.category],
      ["Umgebung", payload.shell],
      ["Risiko", payload.riskLevel],
      ["Befehl", payload.command],
      ["Beschreibung", payload.description],
    ]
    : [
      ["Bereich", payload.category],
      ["Dringlichkeit", payload.severity],
      ["Symptom", payload.symptom],
      ["Ursache", payload.cause],
      ["Lösungsweg", payload.solution],
    ];

  $("#review-content").innerHTML = `
    <h3>${escapeHtml(proposal.title)}</h3>
    <p class="muted">
      ${escapeHtml(CONTENT_TYPE_LABELS[proposal.content_type] || "")}
      · Eingereicht von ${escapeHtml(proposal.submitted_by_name)}
      ${proposal.proposal_type === "update" ? "· Änderung an bestehendem Eintrag" : ""}
    </p>
    ${proposal.reason
      ? `<p class="muted">Begründung: ${escapeHtml(proposal.reason)}</p>` : ""}
    ${rows.filter(([, value]) => value).map(([label, value]) => `
      <div class="solution-block">
        <span class="solution-label">${escapeHtml(label)}</span>
        <div class="template-body">${escapeHtml(String(value))}</div>
      </div>`).join("")}`;

  dialog.showModal();
}

async function reviewProposal(action) {
  const dialog = $("#review-dialog");
  const proposalId = dialog.dataset.proposalId;

  // Befehle und Loesungen laufen ueber eine eigene Schnittstelle.
  if (dialog.dataset.kind === "content") {
    try {
      await api(`/api/content-proposals/${proposalId}/${action}`, {
        method: "POST",
        body: JSON.stringify({ note: $("#review-note").value }),
      });
      dialog.close();
      showToast("Vorschlag wurde bearbeitet.");
      await loadBootstrap();
      renderSolutions();
      await loadProposals("approvals");
    } catch (error) {
      alert(error.message);
    }
    return;
  }

  try {
    await api(`/api/proposals/${proposalId}/${action}`, {
      method: "POST",
      body: JSON.stringify({ note: $("#review-note").value }),
    });
    $("#review-dialog").close();
    showToast("Vorschlag wurde bearbeitet.");
    await loadBootstrap();
    await loadProposals("approvals");
  } catch (error) {
    alert(error.message);
  }
}

async function deleteTemplate(templateId) {
  if (!confirm("Diese Vorlage wirklich löschen? Sie landet im Papierkorb und kann später wiederhergestellt werden.")) return;
  await api(`/api/templates/${templateId}`, {
    method: "DELETE",
    body: "{}",
  });
  showToast("Vorlage wurde gelöscht.");
  await loadBootstrap();
  if (state.activeView === "history") await loadHistory();
}

async function deleteCommand(commandId) {
  if (!confirm("Diesen Befehl wirklich löschen?")) return;
  await api(`/api/commands/${commandId}`, {
    method: "DELETE",
    body: "{}",
  });
  showToast("Befehl wurde gelöscht.");
  await loadBootstrap();
}

async function switchView(view) {
  state.activeView = view;
  $$(".view").forEach((element) => element.classList.add("hidden"));
  $(`#view-${view}`).classList.remove("hidden");
  $$("#main-nav button").forEach((button) => button.classList.toggle("active", button.dataset.view === view));

  // Die Gruppe des aktiven Reiters hervorheben, damit sichtbar bleibt, wo man
  // sich befindet -- im zugeklappten Menue ist der Reiter selbst unsichtbar.
  $$(".nav-group").forEach((group) => {
    const holdsActive = Boolean(group.querySelector(`[data-view="${view}"]`));
    group.classList.toggle("holds-active", holdsActive);
  });

  const config = {
    templates: [
      "Gemeinsame Inhalte",
      "Ticket-Vorlagen",
      "Hier findest du freigegebene Ticket-Vorlagen zum schnellen Kopieren und Wiederverwenden.",
    ],
    proposals: [
      "Persönlich",
      "Meine Vorschläge",
      "Hier siehst du deine eingereichten Vorlagen und ihren aktuellen Freigabestatus.",
    ],
    approvals: [
      "Prüfung",
      "Freigaben",
      "Hier prüfen Redakteure und Admins neue Vorlagen, Änderungen und vorgeschlagene Kategorien.",
    ],
    commands: [
      "Werkzeuge",
      "Befehle",
      "Hier liegen freigegebene Support-Befehle zum Nachschlagen und Kopieren.",
    ],
    feedback: [
      "Produkt",
      "Verbesserungen & Bugs",
      "Hier können Mitarbeiter Probleme melden oder Ideen einreichen, die Admins gesammelt bearbeiten.",
    ],
    solutions: [
      "Wissen",
      "Lösungen",
      "Hier stehen bekannte Probleme mit Symptom, Ursache und erprobtem Lösungsweg.",
    ],
    assistant: [
      "Arbeiten",
      "Symptom-Assistent",
      "Ein paar Fragen führen vom Symptom zur passenden Lösung.",
    ],
    cases: [
      "Arbeiten",
      "Meine Fälle",
      "Ein offener Fall fragt nach jedem Kopieren, ob es dazugehört -- daraus entsteht die Dokumentation.",
    ],
    escalation: [
      "Arbeiten",
      "Eskalation",
      "Wann wird an wen weitergegeben, mit Zuständigkeit und Reaktionszeit.",
    ],
    handover: [
      "Team",
      "Dienstübergabe",
      "Was die nächste Schicht wissen muss -- offene Fälle, Auffälligkeiten, Notizen.",
    ],
    stats: [
      "Team",
      "Statistik",
      "Was wird genutzt, wo fehlt Wissen, wer pflegt die Wissensbasis.",
    ],
    diagnose: [
      "Werkzeuge",
      "Diagnose",
      "Hier erstellst du strukturierte Prüflisten und Diagnosetexte für Supportfälle.",
    ],
    generator: [
      "Dokumentation",
      "Ticket-Generator",
      "Hier erzeugst du saubere Tickettexte für Lösungen, Zwischenstände und Eskalationen.",
    ],
    history: [
      "Nachvollziehbarkeit",
      "Versionen & Papierkorb",
      "Hier findest du ältere Vorlagenstände und archivierte Einträge zur Wiederherstellung.",
    ],
    game: [
      "Pause",
      "Helpdesk Runner",
      "Hier kannst du kurz abschalten und deinen Punktestand mit dem Team vergleichen.",
    ],
    news: [
      "Aktuelles",
      "IT-Meldungen",
      "Hier laufen Sicherheitswarnungen und Nachrichten aus den hinterlegten Quellen zusammen.",
    ],
    admin: [
      "Verwaltung",
      "Administration",
      "Hier verwaltest du Benutzer, Kategorien und zentrale Bereiche der Anwendung.",
    ],
    settings: [
      "Persönlich",
      "Einstellungen",
      "Hier speicherst du persönliche Werte wie Signatur und Theme für dein Konto.",
    ],
  }[view];

  $("#view-eyebrow").textContent = config[0];
  $("#view-title").textContent = config[1];
  $("#view-description").textContent = config[2];
  // Je Reiter der passende Knopf in der Kopfzeile -- die Beschriftung setzen
  // renderCommands und renderSolutions anhand der Rolle.
  $("#new-proposal-button").classList.toggle("hidden", view !== "templates");
  $("#new-command-button").classList.toggle("hidden", view !== "commands");
  $("#new-solution-button").classList.toggle("hidden", view !== "solutions");

  // Die Schnellleiste bleibt auf jedem Reiter erreichbar.
  updateQuickbarVisibility();

  if (view === "solutions") renderSolutions();
  if (view === "assistant") renderAssistant();
  if (view === "cases") await loadCases();
  if (view === "escalation") await loadEscalation();
  if (view === "handover") await loadHandovers();
  if (view === "stats") await loadStats();
  if (view === "settings") renderAvatarEditor();
  if (view === "proposals" || view === "approvals") await loadProposals(view);
  if (view === "feedback") await loadFeedback();
  if (view === "news") await loadNews();
  if (view === "admin") await Promise.all([loadUsers(), loadAudit(), loadNewsFeeds()]);
  if (view === "history") await loadHistory();
  if (view === "game") {
    await loadLeaderboard();
    await loadTypingLeaderboard();
  }
}

/* ============================================================
   IT-Meldungen
   ============================================================
   Die Feeds holt der Worker und legt sie in D1 ab -- ein Abruf direkt aus dem
   Browser scheitert an CORS, ausserdem blieben so die IP-Adressen der
   Mitarbeiter bei den Anbietern haengen.
*/
const newsState = { items: [], feeds: [] };

async function loadNews(force = false) {
  $("#news-status").textContent = force
    ? "Quellen werden abgerufen…"
    : "Meldungen werden geladen…";

  const data = await api(`/api/news${force ? "?refresh=1" : ""}`);
  newsState.items = data.items ?? [];
  newsState.feeds = data.feeds ?? [];

  populateNewsFilters();
  renderNews();
}

/** Fuellt die Auswahllisten aus dem tatsaechlichen Bestand. */
function populateNewsFilters() {
  const categorySelect = $("#news-category");
  const feedSelect = $("#news-feed");
  const previousCategory = categorySelect.value;
  const previousFeed = feedSelect.value;

  const categories = [...new Set(newsState.items.map((item) => item.category))].sort();
  const feeds = [...new Set(newsState.items.map((item) => item.feed_name))].sort();

  categorySelect.innerHTML = '<option value="">Alle Kategorien</option>'
    + categories.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
  feedSelect.innerHTML = '<option value="">Alle Quellen</option>'
    + feeds.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");

  // Auswahl beibehalten, solange sie noch existiert.
  if (categories.includes(previousCategory)) categorySelect.value = previousCategory;
  if (feeds.includes(previousFeed)) feedSelect.value = previousFeed;
}

function renderNews() {
  const category = $("#news-category").value;
  const feed = $("#news-feed").value;
  const search = $("#news-search").value.trim().toLowerCase();

  const visible = newsState.items.filter((item) => {
    if (category && item.category !== category) return false;
    if (feed && item.feed_name !== feed) return false;
    if (!search) return true;
    return `${item.title} ${item.summary}`.toLowerCase().includes(search);
  });

  const failed = newsState.feeds.filter(
    (source) => source.active && String(source.last_status ?? "").startsWith("Fehler"),
  );

  // Ausgefallene Quellen benennen, statt sie stillschweigend fehlen zu lassen.
  $("#news-status").textContent = [
    `${visible.length} von ${newsState.items.length} Meldungen`,
    failed.length ? `${failed.length} Quelle(n) nicht erreichbar: ${failed.map((f) => f.name).join(", ")}` : "",
  ].filter(Boolean).join(" · ");

  if (!visible.length) {
    $("#news-list").innerHTML = '<p class="panel-hint">Keine Meldungen gefunden.</p>';
    return;
  }

  $("#news-list").innerHTML = visible.map((item) => `
    <article class="news-item">
      <div class="news-meta">
        <span class="news-source">${escapeHtml(item.feed_name)}</span>
        <span class="news-category">${escapeHtml(item.category)}</span>
        <span>${escapeHtml(formatNewsDate(item.published_at))}</span>
      </div>
      <h4 class="news-title">
        <a href="${escapeAttribute(item.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a>
      </h4>
      ${item.summary ? `<p class="news-summary">${escapeHtml(item.summary)}</p>` : ""}
    </article>`).join("");
}

/**
 * Escaping fuer Attributwerte. `escapeHtml` beruht auf textContent und laesst
 * Anfuehrungszeichen unveraendert -- in einem href-Attribut koennte eine
 * Adresse damit ausbrechen.
 */
function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function formatNewsDate(value) {
  if (!value) return "";
  const normalized = String(value).replace(" ", "T");
  const date = new Date(/[Z+]|-\d{2}:\d{2}$/.test(normalized) ? normalized : `${normalized}Z`);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Quellenverwaltung im Admin-Bereich. */
async function loadNewsFeeds() {
  const data = await api("/api/news");
  newsState.feeds = data.feeds ?? [];

  $("#news-feeds-list").innerHTML = newsState.feeds.map((feed) => `
    <div class="news-feed-row">
      <div class="news-feed-main">
        <strong>${escapeHtml(feed.name)}</strong>
        <span class="news-feed-url">${escapeHtml(feed.url)}</span>
      </div>
      <span>${escapeHtml(feed.category)}</span>
      <span class="${String(feed.last_status ?? "").startsWith("Fehler") ? "news-feed-error" : ""}">
        ${escapeHtml(feed.last_status ?? "noch nicht abgerufen")}
      </span>
      <div class="news-feed-actions">
        <button class="btn-ghost" type="button" data-feed-toggle="${feed.id}" data-feed-active="${feed.active}">
          ${feed.active ? "Deaktivieren" : "Aktivieren"}
        </button>
        <button class="btn-ghost danger-button" type="button" data-feed-delete="${feed.id}" data-feed-name="${escapeHtml(feed.name)}">
          Entfernen
        </button>
      </div>
    </div>`).join("") || '<p class="panel-hint">Noch keine Quellen eingetragen.</p>';
}

async function saveFeedbackAdmin(itemId) {
  const status = document.querySelector(`[data-feedback-status="${itemId}"]`)?.value;
  const adminNote = document.querySelector(`[data-feedback-note="${itemId}"]`)?.value ?? "";
  await api(`/api/feedback/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify({ status, adminNote }),
  });
  showToast("Vorschlag aktualisiert.");
  await loadFeedback();
}

async function loadUsers() {
  const data = await api("/api/users");
  $("#users-list").innerHTML = data.users.map((user) => `
    <div class="user-row">
      <div class="user-row-main">
        <strong>${escapeHtml(user.display_name)}</strong>
        <span>${escapeHtml(user.username)}</span>
      </div>
      <span>${roleLabel(user.role)}</span>
      <span>${user.active ? "Aktiv" : "Gesperrt"}</span>
      <div class="user-row-actions">
        <button class="btn-ghost" type="button" data-user-action="edit" data-user-id="${user.id}" data-user-name="${escapeHtml(user.display_name)}" data-user-login="${escapeHtml(user.username)}" data-user-role="${user.role}">
          Bearbeiten
        </button>
        <button class="btn-ghost" type="button" data-user-action="reset-password" data-user-id="${user.id}" data-user-name="${escapeHtml(user.display_name)}">
          Passwort
        </button>
        ${user.id === state.user?.id ? "" : `
        <button class="btn-ghost danger-button" type="button" data-user-action="delete" data-user-id="${user.id}" data-user-name="${escapeHtml(user.display_name)}">
          Löschen
        </button>`}
      </div>
    </div>`).join("");
}

// Rohwerte aus dem Protokoll in lesbare Bezeichnungen uebersetzen.
const AUDIT_ACTIONS = {
  create: "angelegt",
  update: "geändert",
  delete: "archiviert",
  purge: "endgültig gelöscht",
  restore: "wiederhergestellt",
  approve: "genehmigt",
  reject: "abgelehnt",
  changes: "Überarbeitung angefordert",
  submit: "eingereicht",
  login: "angemeldet",
  logout: "abgemeldet",
  setup_admin: "Ersteinrichtung",
};

const AUDIT_ENTITIES = {
  template: "Vorlage",
  template_proposal: "Vorschlag",
  template_version: "Vorlagen-Version",
  command: "Befehl",
  user: "Benutzer",
  category: "Kategorie",
  feedback_item: "Feedback",
  session: "Sitzung",
};

/** Formuliert einen Protokolleintrag als lesbaren Satz. */
function auditSummary(entry) {
  const action = AUDIT_ACTIONS[entry.action] || entry.action;
  const entity = AUDIT_ENTITIES[entry.entity_type] || entry.entity_type;

  if (entry.entity_type === "session") {
    return action === "angemeldet" ? "hat sich angemeldet" : "hat sich abgemeldet";
  }

  let detail = "";
  try {
    const details = JSON.parse(entry.details_json || "{}");
    if (details.title) detail = ` „${details.title}“`;
    else if (details.role) detail = ` (${roleLabel(details.role)})`;
  } catch {
    detail = "";
  }

  const reference = entry.entity_id ? ` #${entry.entity_id}` : "";
  return `hat ${entity}${detail || reference} ${action}`;
}

async function loadAudit() {
  const data = await api("/api/audit");
  state.auditEntries = data.entries;
  renderAudit();
}

function renderAudit() {
  const filter = $("#audit-filter")?.value || "";
  const entries = (state.auditEntries || []).filter(
    (entry) => !filter || entry.entity_type === filter,
  );

  $("#audit-list").innerHTML = entries.length
    ? entries.map((entry) => `
      <div class="audit-row">
        <span class="audit-action audit-${escapeHtml(entry.action)}">${escapeHtml(AUDIT_ACTIONS[entry.action] || entry.action)}</span>
        <div class="audit-main">
          <strong>${escapeHtml(entry.user_name)}</strong> ${escapeHtml(auditSummary(entry))}
        </div>
        <span class="audit-time">${formatDateTime(entry.created_at)}</span>
      </div>`).join("")
    : '<div class="history-empty">Keine Einträge für diesen Filter.</div>';
}

async function updateUserAdmin(userId, payload) {
  await api(`/api/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  await loadUsers();
}

/**
 * Oeffnet den Dialog zum Bearbeiten von Anzeigename und Rolle.
 *
 * Beim eigenen Konto ist die Rollenauswahl gesperrt: Wer sich selbst die
 * Adminrechte entzieht, verliert den Zugang zur Benutzerverwaltung. Der Worker
 * lehnt das ohnehin ab -- hier wird es nur sichtbar gemacht, statt den Fehler
 * erst nach dem Speichern zu zeigen.
 */
function openUserDialog(button) {
  const dialog = $("#user-dialog");
  const isSelf = Number(button.dataset.userId) === state.user?.id;

  dialog.dataset.userId = button.dataset.userId;
  $("#user-edit-username").textContent = button.dataset.userLogin || "";
  $("#user-edit-name").value = button.dataset.userName || "";
  $("#user-edit-role").value = button.dataset.userRole || "employee";
  $("#user-edit-role").disabled = isSelf;
  $("#user-edit-self-hint").hidden = !isSelf;

  dialog.showModal();
}

async function submitUserEdit(event) {
  event.preventDefault();

  const dialog = $("#user-dialog");
  const userId = Number(dialog.dataset.userId);
  const displayName = $("#user-edit-name").value.trim();

  if (!displayName) {
    showToast("Bitte einen Anzeigenamen eintragen.");
    return;
  }

  // Beim eigenen Konto bleibt das Rollenfeld gesperrt und wird nicht gesendet.
  const payload = { displayName };
  if (!$("#user-edit-role").disabled) {
    payload.role = $("#user-edit-role").value;
  }

  try {
    await updateUserAdmin(userId, payload);
    dialog.close();
    showToast("Benutzer aktualisiert.");
  } catch (error) {
    showToast(error.message);
  }
}

async function handleUsersListClick(event) {
  const button = event.target.closest("[data-user-action]");
  if (!button) return;

  const userId = Number(button.dataset.userId);
  const userName = button.dataset.userName || "dieser Benutzer";
  const action = button.dataset.userAction;

  if (!userId || !action) return;

  if (action === "edit") {
    openUserDialog(button);
    return;
  }

  if (action === "reset-password") {
    const password = window.prompt(`Neues Passwort für ${userName}:`);
    if (password === null) return;
    if (password.trim().length < 12) {
      showToast("Das Passwort muss mindestens 12 Zeichen lang sein.");
      return;
    }

    await updateUserAdmin(userId, { password: password.trim() });
    showToast("Passwort aktualisiert.");
    return;
  }

  if (action === "delete") {
    // Das Loeschen laesst sich nicht rueckgaengig machen, deshalb wird der
    // Name ausgeschrieben und der Verbleib der Inhalte benannt -- die Vorlagen
    // und Befehle des Kontos bleiben erhalten und werden nur entkoppelt.
    const confirmed = confirm(
      `Benutzer „${userName}" wirklich endgültig löschen?\n\n` +
      "Das Konto und alle zugehörigen Sitzungen werden entfernt. " +
      "Erstellte Vorlagen und Befehle bleiben erhalten.",
    );
    if (!confirmed) return;

    await api(`/api/users/${userId}`, { method: "DELETE" });
    await loadUsers();
    showToast(`Benutzer „${userName}" wurde gelöscht.`);
  }
}

async function loadLeaderboard() {
  const data = await api("/api/game/leaderboard");
  $("#leaderboard").innerHTML = data.leaderboard.length
    ? data.leaderboard.map((entry) => `<li><strong>${escapeHtml(entry.display_name)}</strong> – ${entry.score}</li>`).join("")
    : "<li>Noch keine Scores.</li>";
}

async function loadTypingLeaderboard() {
  const data = await api("/api/game/typing/leaderboard");
  $("#typing-leaderboard").innerHTML = data.leaderboard.length
    ? data.leaderboard.map((entry) => `
      <li><strong>${escapeHtml(entry.display_name)}</strong> – ${entry.wpm} WPM · ${entry.accuracy} %</li>
    `).join("")
    : "<li>Noch keine Ergebnisse.</li>";
}

/**
 * "Helpdesk Runner" -- ein Nachbau des Chrome-Offline-Dinos (T-Rex Runner).
 *
 * Die Spielphysik verwendet bewusst die Original-Konstanten aus Chromium
 * (components/neterror/resources/offline.js), damit sich das Spiel so anfuehlt
 * wie das Vorbild:
 *
 *   - Die Geschwindigkeit steigt kontinuierlich um ACCELERATION pro Frame,
 *     von SPEED (6) bis MAX_SPEED (13). Kein Deckel nach kurzer Zeit.
 *   - Der Abstand zwischen Hindernissen wird aus der aktuellen Geschwindigkeit
 *     berechnet, nicht aus einer festen Framezahl. Nur so bleibt das Spiel bei
 *     hohem Tempo fair -- sonst ruecken die Kakteen immer enger zusammen.
 *   - Der Punktestand haengt an der zurueckgelegten Strecke (COEFFICIENT),
 *     nicht an der Spielzeit. Schneller laufen = schneller punkten.
 *
 * Alle Groessen sind in Original-Pixeln definiert und werden ueber SCALE auf
 * die Canvas-Hoehe gebracht. Das Original rechnet mit einer 150 px hohen
 * Spielflaeche, dieses Canvas ist 260 px hoch.
 */
function initializeGame() {
  const canvas = $("#game-canvas");
  const context = canvas.getContext("2d");

  // Original-Konstanten aus Chromium (Runner.config).
  const ACCELERATION = 0.001;
  const START_SPEED = 6;
  const MAX_SPEED = 13;
  const GRAVITY = 0.6;
  // Trex.config.INITIAL_JUMP_VELOCITY im Original. Ergibt zusammen mit GRAVITY
  // einen Sprungbogen von rund 88 px Hoehe und gut 0,55 s Dauer.
  const INITIAL_JUMP_VELOCITY = -10;
  const DROP_VELOCITY = -5; // Sprung abbrechen (Taste loslassen / Pfeil runter)
  const SPEED_DROP_COEFFICIENT = 3; // schnelleres Fallen beim Ducken
  const GAP_COEFFICIENT = 0.6;
  const MAX_OBSTACLE_DUPLICATION = 2;
  const SCORE_COEFFICIENT = 0.025;
  const CLOUD_FREQUENCY = 0.5;
  const MAX_CLOUDS = 6;
  const BG_CLOUD_SPEED = 0.2;

  // Das Original ist auf 150 px Spielhoehe ausgelegt; hier auf das Canvas skaliert.
  const SCALE = 1.5;
  const px = (value) => value * SCALE;

  // Standlinie, auf der T-Rex und Kakteen aufsetzen.
  //
  // Im Original liegt die Bodengrafik bei y=127 und ist selbst rund 12 px hoch;
  // die Sprites reichen deshalb bis y=140. Hier wird der Boden nur als duenne
  // Linie gezeichnet, also wird direkt auf dieser Linie aufgesetzt. Die
  // Original-`yPos`-Werte der Hindernisse sind entsprechend auf diese Linie
  // umgerechnet (siehe ORIGINAL_GROUND_BOTTOM).
  const groundY = px(127);
  const ORIGINAL_GROUND_BOTTOM = 140;

  const TREX = {
    WIDTH: 44,
    HEIGHT: 47,
    WIDTH_DUCK: 59,
    HEIGHT_DUCK: 25,
    START_X_POS: 50,
  };

  // Hindernis-Typen mit den Originalmassen. `yPos` ist der Abstand der
  // Oberkante vom Boden, `minSpeed` die Geschwindigkeit, ab der ein Typ
  // ueberhaupt auftaucht (Pterodactyl erst ab 8.5).
  const OBSTACLE_TYPES = [
    {
      type: "CACTUS_SMALL",
      width: 17,
      height: 35,
      yPos: 105,
      multipleSpeed: 4,
      minGap: 120,
      minSpeed: 0,
      collisionBoxes: [
        { x: 0, y: 7, width: 5, height: 27 },
        { x: 4, y: 0, width: 6, height: 34 },
        { x: 10, y: 4, width: 7, height: 14 },
      ],
    },
    {
      type: "CACTUS_LARGE",
      width: 25,
      height: 50,
      yPos: 90,
      multipleSpeed: 7,
      minGap: 120,
      minSpeed: 0,
      collisionBoxes: [
        { x: 0, y: 12, width: 7, height: 38 },
        { x: 8, y: 0, width: 7, height: 49 },
        { x: 13, y: 10, width: 10, height: 38 },
      ],
    },
    {
      type: "PTERODACTYL",
      width: 46,
      height: 40,
      /*
       * Drei Flughoehen, gegenueber dem Original angepasst.
       *
       * Unsere Standlinie liegt bei 127 statt 140, wodurch alles um 13px
       * verrutscht: Mit den Originalwerten [100, 75, 50] passte der geduckte
       * T-Rex unter allen drei Hoehen hindurch, und der hoechste Vogel traf
       * ueberhaupt nichts mehr.
       *
       * Wirksame Bereiche bei dieser Standlinie:
       *   unter 70   trifft weder stehend noch geduckt
       *   70 .. 105  stehend getroffen, Ducken hilft
       *   ab 110     auch geduckt getroffen -- nur Springen hilft
       *
       * 115 liegt sicher im oberen Bereich (nur springen), 90 und 72 bleiben
       * unterduckbar und unterscheiden sich sichtbar in der Hoehe.
       */
      yPos: [115, 90, 72],
      multipleSpeed: 999, // tritt nie in Gruppen auf
      minGap: 150,
      minSpeed: 8.5,
      speedOffset: 0.8,
      numFrames: 2,
      frameRate: 1000 / 6,
      collisionBoxes: [
        { x: 15, y: 15, width: 16, height: 5 },
        { x: 18, y: 21, width: 24, height: 6 },
        { x: 2, y: 14, width: 4, height: 3 },
        { x: 6, y: 10, width: 4, height: 7 },
        { x: 10, y: 8, width: 6, height: 9 },
      ],
    },
  ];

  // Kollisionsboxen des T-Rex, ebenfalls Originalwerte.
  const TREX_COLLISION_RUNNING = [
    { x: 22, y: 0, width: 17, height: 16 },
    { x: 1, y: 18, width: 30, height: 9 },
    { x: 10, y: 35, width: 14, height: 8 },
    { x: 1, y: 24, width: 29, height: 5 },
    { x: 5, y: 30, width: 21, height: 4 },
    { x: 9, y: 34, width: 15, height: 4 },
  ];
  const TREX_COLLISION_DUCKING = [
    { x: 1, y: 18, width: 55, height: 25 },
  ];

  const trex = {
    x: TREX.START_X_POS,
    y: 0,
    velocityY: 0,
    jumping: false,
    ducking: false,
    speedDrop: false,
  };

  let running = false;
  let gameOver = false;
  let speed = START_SPEED;
  let distance = 0;
  // Startversatz von `distance`; wird beim Punktezaehlen wieder abgezogen.
  let scoreOffset = 0;
  let score = 0;
  let highScore = 0;
  let startTime = 0;
  let lastTime = 0;
  let animationId = null;
  let obstacles = [];
  let clouds = [];
  // Ist die Sprungtaste (oder Maus/Touch) gerade gedrueckt? Steuert zweierlei:
  // die Tastenwiederholung beim Halten und den sofortigen Anschlusssprung
  // direkt nach der Landung.
  let jumpHeld = false;

  /** Bodenhoehe des T-Rex in der aktuellen Haltung. */
  function trexGroundY() {
    return groundY - px(trex.ducking ? TREX.HEIGHT_DUCK : TREX.HEIGHT);
  }

  function resetGame() {
    running = true;
    gameOver = false;
    speed = START_SPEED;
    score = 0;
    obstacles = [];
    clouds = [];

    // Der Punktestand startet immer bei 0, die zurueckgelegte Strecke dagegen
    // an einer zufaelligen Stelle. `distance` steuert das Bodenmuster und den
    // Laufzyklus, deshalb sieht jede Runde anders aus statt jedes Mal mit
    // demselben Bild zu beginnen. Der Versatz wird beim Punktezaehlen wieder
    // abgezogen (siehe scoreOffset).
    distance = Math.random() * 10_000;
    scoreOffset = distance;

    // Wolken vorab verteilen, damit der Himmel nicht bei jedem Start leer ist
    // und sich erst nach und nach fuellt.
    let cloudX = Math.random() * 200;
    while (cloudX < canvas.width) {
      clouds.push({
        x: cloudX,
        y: px(30 + Math.floor(Math.random() * 40)),
        gap: 100 + Math.floor(Math.random() * 200),
      });
      cloudX += px(100 + Math.random() * 200);
    }
    trex.ducking = false;
    trex.jumping = false;
    trex.speedDrop = false;
    trex.velocityY = 0;
    trex.y = trexGroundY();
    startTime = Date.now();
    lastTime = 0;
    $("#game-score").textContent = "00000";
  }

  function startJump() {
    if (!running || trex.jumping) return;
    trex.jumping = true;
    trex.ducking = false;
    trex.speedDrop = false;
    // Hoehere Geschwindigkeit -> etwas kraeftigerer Absprung, wie im Original.
    trex.velocityY = INITIAL_JUMP_VELOCITY - (speed / 10);
  }

  /**
   * Sprung vorzeitig beenden. Kurzes Antippen ergibt so einen niedrigen
   * Sprung, langes Halten den vollen -- das ist im Original der Unterschied
   * zwischen MIN_JUMP_HEIGHT und MAX_JUMP_HEIGHT.
   */
  function endJump() {
    if (trex.jumping && trex.velocityY < DROP_VELOCITY) {
      trex.velocityY = DROP_VELOCITY;
    }
  }

  function setDucking(value) {
    if (!running) return;

    if (value && trex.jumping) {
      // Im Sprung wirkt Ducken als Schnellabstieg.
      trex.speedDrop = true;
      trex.ducking = false;
      return;
    }

    if (!trex.jumping) {
      trex.ducking = value;
      trex.y = trexGroundY();
    }

    if (!value) trex.speedDrop = false;
  }

  function updateTrex(deltaFrames) {
    if (trex.jumping) {
      const gravity = trex.speedDrop
        ? GRAVITY * SPEED_DROP_COEFFICIENT
        : GRAVITY;

      // Schwerkraft und Geschwindigkeit werden im selben Einheitenraum
      // gerechnet (Original-Pixel). Wuerde nur die Geschwindigkeit skaliert,
      // fiele der Sprung um den SCALE-Faktor zu hoch aus.
      trex.velocityY += gravity * deltaFrames;
      trex.y += trex.velocityY * deltaFrames;

      const ground = trexGroundY();
      if (trex.y >= ground) {
        trex.y = ground;
        trex.velocityY = 0;
        trex.jumping = false;
        trex.speedDrop = false;

        // Haelt der Spieler die Sprungtaste weiterhin gedrueckt, wird direkt
        // beim Aufsetzen neu abgesprungen. Ohne das muesste man loslassen und
        // erneut druecken -- bei eng aufeinanderfolgenden Hindernissen bleibt
        // dafuer keine Zeit.
        if (jumpHeld) startJump();
      }
    } else {
      trex.y = trexGroundY();
    }
  }

  /**
   * Mindestabstand zum naechsten Hindernis.
   *
   * Faehrt das Spiel schneller, braucht es proportional mehr Platz -- deshalb
   * geht die Geschwindigkeit hier direkt ein. Genau diese Kopplung fehlte
   * vorher, weshalb ein fester Frameabstand bei hohem Tempo unspielbar waere.
   */
  function computeGap(obstacle, currentSpeed) {
    const minGap = Math.round(
      obstacle.width * currentSpeed + obstacle.minGap * GAP_COEFFICIENT,
    );
    const maxGap = Math.round(minGap * 1.5);
    return minGap + Math.floor(Math.random() * (maxGap - minGap));
  }

  function lastObstacle() {
    return obstacles[obstacles.length - 1] ?? null;
  }

  function spawnObstacle() {
    const available = OBSTACLE_TYPES.filter((type) => speed >= type.minSpeed);
    const definition = available[Math.floor(Math.random() * available.length)];

    // Nicht mehr als MAX_OBSTACLE_DUPLICATION gleiche Hindernisse hintereinander.
    const recent = obstacles.slice(-MAX_OBSTACLE_DUPLICATION);
    if (
      recent.length === MAX_OBSTACLE_DUPLICATION &&
      recent.every((entry) => entry.type === definition.type)
    ) {
      return;
    }

    // Kakteen koennen als Gruppe auftreten -- aber erst ab `multipleSpeed`.
    const maxGroup = speed >= definition.multipleSpeed ? 3 : 1;
    const size = Math.floor(Math.random() * maxGroup) + 1;

    const yPos = Array.isArray(definition.yPos)
      ? definition.yPos[Math.floor(Math.random() * definition.yPos.length)]
      : definition.yPos;

    // Original-Koordinate auf unsere Standlinie umrechnen: Im Original sitzt
    // alles auf y=140 auf, hier direkt auf groundY.
    const y = groundY - px(ORIGINAL_GROUND_BOTTOM - yPos);

    obstacles.push({
      type: definition.type,
      definition,
      x: canvas.width,
      y,
      width: px(definition.width * size),
      height: px(definition.height),
      size,
      gap: computeGap({ ...definition, width: definition.width * size }, speed),
      frame: 0,
      frameTimer: 0,
    });
  }

  function updateObstacles(deltaFrames, deltaMs) {
    for (const obstacle of obstacles) {
      // Pterodactyls fliegen leicht schneller bzw. langsamer als der Boden.
      const obstacleSpeed = obstacle.definition.speedOffset
        ? speed + obstacle.definition.speedOffset
        : speed;
      obstacle.x -= px(obstacleSpeed) * deltaFrames;

      if (obstacle.definition.numFrames) {
        obstacle.frameTimer += deltaMs;
        if (obstacle.frameTimer >= obstacle.definition.frameRate) {
          obstacle.frameTimer = 0;
          obstacle.frame = (obstacle.frame + 1) % obstacle.definition.numFrames;
        }
      }
    }

    obstacles = obstacles.filter((obstacle) => obstacle.x + obstacle.width > 0);

    // Neues Hindernis, sobald das letzte weit genug hereingelaufen ist.
    //
    // Das erste Hindernis einer Runde bekommt zusaetzlich einen zufaelligen
    // Vorlauf, damit nicht jede Runde mit demselben Anlauf beginnt.
    const last = lastObstacle();
    if (!last) {
      spawnObstacle();
      const first = lastObstacle();
      if (first) first.x += px(60 + Math.random() * 220);
    } else if (last.x + last.width + px(last.gap) < canvas.width) {
      spawnObstacle();
    }
  }

  function updateClouds(deltaFrames) {
    for (const cloud of clouds) {
      cloud.x -= px(BG_CLOUD_SPEED + speed / 12) * deltaFrames;
    }
    clouds = clouds.filter((cloud) => cloud.x + px(46) > 0);

    const lastCloud = clouds[clouds.length - 1];
    const roomForCloud = !lastCloud
      || canvas.width - (lastCloud.x + px(46)) > px(lastCloud.gap);

    if (clouds.length < MAX_CLOUDS && roomForCloud && Math.random() > CLOUD_FREQUENCY) {
      clouds.push({
        x: canvas.width,
        y: px(30 + Math.floor(Math.random() * 40)),
        gap: 100 + Math.floor(Math.random() * 200),
      });
    }
  }

  // --- Zeichnen -------------------------------------------------------------
  // Der T-Rex wird aus Rechtecken nachgebaut. Die Aufteilung folgt der Silhouette
  // des Originals: hoher Kopf mit Schnauze, Auge als Aussparung, Rueckenlinie,
  // abfallender Schwanz, kurzer Arm und zwei animierte Beine.

  function drawTrex() {
    const x = Math.round(trex.x);
    const y = Math.round(trex.y);
    const unit = SCALE; // ein Original-Pixel
    const box = (left, top, width, height) => {
      context.fillRect(
        Math.round(x + left * unit),
        Math.round(y + top * unit),
        Math.ceil(width * unit),
        Math.ceil(height * unit),
      );
    };

    context.fillStyle = "#d4d6dc";

    if (trex.ducking) {
      // Geduckt: langgestreckter Koerper, Kopf nach vorn.
      box(0, 18, 14, 8);    // Schwanzspitze
      box(8, 14, 30, 14);   // Ruecken/Rumpf
      box(36, 12, 20, 12);  // Kopf
      box(52, 16, 6, 4);    // Schnauze
      context.fillStyle = "#12141b";
      box(48, 15, 3, 3);    // Auge
      context.fillStyle = "#d4d6dc";
      // Beine im Laufzyklus
      const duckFrame = Math.floor(distance / 6) % 2;
      box(14 + (duckFrame ? 0 : 4), 26, 7, 5);
      box(28 + (duckFrame ? 4 : 0), 26, 7, 5);
      return;
    }

    // Kopf: kompakter Block oben rechts, Schnauze ragt nach vorn ueber.
    box(27, 2, 15, 11);   // Schaedel
    box(42, 6, 4, 5);     // Schnauzenspitze
    box(27, 13, 11, 3);   // Unterkiefer
    context.fillStyle = "#12141b";
    box(37, 5, 3, 3);     // Auge als Aussparung
    context.fillStyle = "#d4d6dc";

    // Hals: schmaler als Kopf und Rumpf, dadurch bleibt der Kopf abgesetzt.
    box(24, 12, 9, 8);

    // Rumpf: oben breit, zum Schwanz hin schmaler -- das gibt die
    // charakteristische Keilform des Originals. Er reicht bewusst tief herunter,
    // damit der T-Rex gedrungen wirkt und nicht langbeinig.
    box(17, 19, 16, 12);
    box(19, 31, 14, 7);

    // Schwanz: laeuft in zwei Stufen nach hinten aus, leicht abfallend.
    box(9, 22, 10, 6);
    box(3, 25, 7, 4);

    // Winziger Arm direkt an der Brust. Bewusst nur eine kleine Stufe an der
    // Rumpfkante: Steht er weiter ab, liest sich die Silhouette wie ein zweites
    // Bein statt wie der typische Stummelarm des T-Rex.
    box(31, 24, 4, 3);

    if (trex.jumping) {
      // Im Sprung beide Beine angezogen
      box(20, 37, 6, 8);
      box(28, 37, 6, 8);
    } else {
      // Laufanimation: Der Takt haengt an der Strecke, nicht an der Zeit --
      // dadurch trippeln die Beine bei hohem Tempo sichtbar schneller.
      //
      // Ein Bein steht gestreckt am Boden (mit Fuss), das andere ist angewinkelt.
      // Der Fuss macht den Unterschied zwischen den beiden Frames deutlich
      // sichtbar; ohne ihn wirkt die Animation fast statisch.
      const legFrame = Math.floor(distance / 8) % 2;
      if (legFrame) {
        box(20, 37, 6, 10);   // hinteres Bein gestreckt
        box(20, 44, 9, 3);    // Fuss
        box(28, 37, 6, 5);    // vorderes Bein angewinkelt
      } else {
        box(20, 37, 6, 5);    // hinteres Bein angewinkelt
        box(28, 37, 6, 10);   // vorderes Bein gestreckt
        box(28, 44, 9, 3);    // Fuss
      }
    }
  }

  function drawCactus(obstacle) {
    const x = Math.round(obstacle.x);
    const y = Math.round(obstacle.y);
    const unit = SCALE;
    const single = obstacle.definition.width;
    context.fillStyle = "#74b785";

    // Jeder Kaktus der Gruppe wird einzeln gezeichnet.
    for (let index = 0; index < obstacle.size; index += 1) {
      const offset = x + index * single * unit;
      const box = (left, top, width, height) => {
        context.fillRect(
          Math.round(offset + left * unit),
          Math.round(y + top * unit),
          Math.ceil(width * unit),
          Math.ceil(height * unit),
        );
      };

      if (obstacle.type === "CACTUS_LARGE") {
        box(9, 0, 7, 50);   // Stamm
        box(2, 14, 7, 5);   // linker Arm
        box(2, 18, 5, 14);
        box(16, 10, 7, 5);  // rechter Arm
        box(18, 14, 5, 16);
      } else {
        box(6, 0, 6, 35);   // Stamm
        box(1, 10, 5, 4);   // linker Arm
        box(1, 13, 4, 10);
        box(12, 7, 5, 4);   // rechter Arm
        box(13, 10, 4, 11);
      }
    }
  }

  function drawPterodactyl(obstacle) {
    const x = Math.round(obstacle.x);
    const y = Math.round(obstacle.y);
    const unit = SCALE;
    const box = (left, top, width, height) => {
      context.fillRect(
        Math.round(x + left * unit),
        Math.round(y + top * unit),
        Math.ceil(width * unit),
        Math.ceil(height * unit),
      );
    };

    context.fillStyle = "#c9ccd4";
    // Kopf sitzt vorn oben, Schnabel laeuft spitz zu.
    box(32, 12, 12, 7);
    box(42, 15, 6, 3);
    // Schlanker Rumpf plus langer Schwanz nach hinten.
    box(18, 15, 16, 6);
    box(6, 17, 13, 4);
    box(2, 18, 5, 3);

    // Fluegel schlagen zwischen zwei Stellungen. Der Fluegel ist an der Wurzel
    // schmal und wird nach aussen breiter -- dadurch bleibt zwischen Fluegel und
    // Rumpf ein Spalt sichtbar und die Silhouette liest sich als Vogel statt
    // als geschlossener Klotz.
    if (obstacle.frame === 0) {
      box(24, 10, 6, 5);   // Wurzel am Rumpf
      box(20, 5, 13, 5);   // Fluegelflaeche
      box(22, 1, 9, 4);    // Spitze nach oben
    } else {
      box(24, 21, 6, 5);   // Wurzel am Rumpf
      box(20, 26, 13, 5);  // Fluegelflaeche
      box(22, 31, 9, 4);   // Spitze nach unten
    }
  }

  function drawCloud(cloud) {
    const x = Math.round(cloud.x);
    const y = Math.round(cloud.y);
    const unit = SCALE;
    context.fillStyle = "#555a68";
    context.fillRect(x, Math.round(y + 6 * unit), Math.ceil(38 * unit), Math.ceil(2 * unit));
    context.fillRect(Math.round(x + 8 * unit), y, Math.ceil(14 * unit), Math.ceil(2 * unit));
    context.fillRect(Math.round(x + 4 * unit), Math.round(y + 2 * unit), Math.ceil(26 * unit), Math.ceil(2 * unit));
    context.fillRect(Math.round(x + 2 * unit), Math.round(y + 4 * unit), Math.ceil(32 * unit), Math.ceil(2 * unit));
  }

  function drawScene() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#12141b";
    context.fillRect(0, 0, canvas.width, canvas.height);

    clouds.forEach(drawCloud);

    // Boden: durchgehende Linie plus Kieselstruktur, die mitscrollt.
    context.fillStyle = "#626674";
    context.fillRect(0, groundY, canvas.width, Math.ceil(2 * SCALE));

    const groundOffset = (distance * SCALE) % px(32);
    context.fillStyle = "#3c404d";
    for (let x = -groundOffset; x < canvas.width; x += px(32)) {
      context.fillRect(Math.round(x), groundY + px(6), px(11), px(1));
      context.fillRect(Math.round(x + px(18)), groundY + px(11), px(6), px(1));
    }

    obstacles.forEach((obstacle) => {
      if (obstacle.type === "PTERODACTYL") drawPterodactyl(obstacle);
      else drawCactus(obstacle);
    });

    drawTrex();

    context.fillStyle = "#8b8f9d";
    context.font = "14px monospace";
    context.textAlign = "right";
    context.fillText(
      `HI ${String(highScore).padStart(5, "0")}  ${String(score).padStart(5, "0")}`,
      canvas.width - 18,
      26,
    );

    if (!running) {
      context.textAlign = "center";
      context.fillStyle = "#b7bac4";
      context.font = "16px monospace";
      context.fillText(
        gameOver ? "GAME OVER" : "KLICKE AUF START",
        canvas.width / 2,
        105,
      );
      if (gameOver) {
        context.font = "12px monospace";
        context.fillText("Nutze den Button fuer einen Neustart", canvas.width / 2, 128);
      }
    }
  }

  /**
   * Kollisionspruefung in zwei Stufen, wie im Original: Erst die groben
   * Huellboxen, und nur bei Ueberschneidung die einzelnen Detailboxen. Das
   * verhindert Treffer, bei denen sich optisch nichts beruehrt.
   */
  function intersects(left, right) {
    return (
      left.x < right.x + right.width &&
      left.x + left.width > right.x &&
      left.y < right.y + right.height &&
      left.y + left.height > right.y
    );
  }

  function collides(obstacle) {
    const trexWidth = trex.ducking ? TREX.WIDTH_DUCK : TREX.WIDTH;
    const trexHeight = trex.ducking ? TREX.HEIGHT_DUCK : TREX.HEIGHT;

    const trexHull = {
      x: trex.x,
      y: trex.y,
      width: px(trexWidth),
      height: px(trexHeight),
    };
    const obstacleHull = {
      x: obstacle.x,
      y: obstacle.y,
      width: obstacle.width,
      height: obstacle.height,
    };

    if (!intersects(trexHull, obstacleHull)) return false;

    const trexBoxes = trex.ducking ? TREX_COLLISION_DUCKING : TREX_COLLISION_RUNNING;
    const obstacleBoxes = obstacle.definition.collisionBoxes;

    for (const rawTrexBox of trexBoxes) {
      const trexBox = {
        x: trex.x + px(rawTrexBox.x),
        y: trex.y + px(rawTrexBox.y),
        width: px(rawTrexBox.width),
        height: px(rawTrexBox.height),
      };

      // Bei Kaktusgruppen wiederholt sich die Box je Einzelkaktus.
      for (let index = 0; index < obstacle.size; index += 1) {
        const groupOffset = index * obstacle.definition.width;
        for (const rawObstacleBox of obstacleBoxes) {
          const obstacleBox = {
            x: obstacle.x + px(groupOffset + rawObstacleBox.x),
            y: obstacle.y + px(rawObstacleBox.y),
            width: px(rawObstacleBox.width),
            height: px(rawObstacleBox.height),
          };
          if (intersects(trexBox, obstacleBox)) return true;
        }
      }
    }

    return false;
  }

  async function finish() {
    running = false;
    gameOver = true;
    cancelAnimationFrame(animationId);
    highScore = Math.max(highScore, score);
    drawScene();

    const durationMs = Date.now() - startTime;
    if (durationMs < 1000) return;

    try {
      await api("/api/game/scores", {
        method: "POST",
        body: JSON.stringify({ score, durationMs }),
      });
      await loadLeaderboard();
    } catch (error) {
      console.error("Score konnte nicht gespeichert werden:", error);
    }
  }

  /**
   * Spielschleife.
   *
   * Rechnet mit einem Zeitdelta statt mit festen Frames, damit das Tempo auf
   * Bildschirmen mit 120 Hz nicht doppelt so hoch ist wie auf 60 Hz.
   */
  function tick(timestamp) {
    if (!running) return;

    if (!lastTime) lastTime = timestamp;
    const deltaMs = Math.min(timestamp - lastTime, 100); // Tab-Wechsel abfedern
    lastTime = timestamp;
    const deltaFrames = deltaMs / (1000 / 60);

    // Kontinuierliche Beschleunigung -- der Kern des Originals.
    if (speed < MAX_SPEED) {
      speed = Math.min(MAX_SPEED, speed + ACCELERATION * deltaFrames);
    }

    distance += speed * deltaFrames;
    score = Math.floor((distance - scoreOffset) * SCORE_COEFFICIENT);
    $("#game-score").textContent = String(score).padStart(5, "0");

    updateTrex(deltaFrames);
    updateObstacles(deltaFrames, deltaMs);
    updateClouds(deltaFrames);

    if (obstacles.some(collides)) {
      finish();
      return;
    }

    drawScene();
    animationId = requestAnimationFrame(tick);
  }

  function start() {
    if (running) return;
    cancelAnimationFrame(animationId);
    // Der Klick auf "Spiel starten" darf nicht als gehaltene Sprungtaste in die
    // neue Runde uebernommen werden.
    jumpHeld = false;
    resetGame();
    drawScene();
    animationId = requestAnimationFrame(tick);
  }

  $("#game-start").addEventListener("click", start);
  canvas.addEventListener("pointerdown", () => {
    if (!running) return;
    jumpHeld = true;
    startJump();
  });
  // Auch ausserhalb des Canvas loslassen zaehlt, sonst bliebe jumpHeld haengen.
  canvas.addEventListener("pointerup", () => {
    jumpHeld = false;
    if (running) endJump();
  });
  window.addEventListener("pointerup", () => { jumpHeld = false; });

  window.addEventListener("keydown", (event) => {
    if (state.activeView !== "game") return;

    if (event.code === "Space" || event.code === "ArrowUp") {
      if (!running) return;
      event.preventDefault();
      if (!jumpHeld) {
        jumpHeld = true;
        startJump();
      }
    }

    if (event.code === "ArrowDown") {
      if (!running) return;
      event.preventDefault();
      setDucking(true);
    }
  });

  window.addEventListener("keyup", (event) => {
    if (state.activeView !== "game") return;

    if (event.code === "Space" || event.code === "ArrowUp") {
      jumpHeld = false;
      endJump();
    }

    if (event.code === "ArrowDown") setDucking(false);
  });

  trex.y = trexGroundY();
  drawScene();
}

function initializeTypingGame() {
  const promptElement = $("#typing-prompt");
  const input = $("#typing-input");
  const wpmElement = $("#typing-wpm");
  const accuracyElement = $("#typing-accuracy");
  const timerElement = $("#typing-timer");
  const startButton = $("#typing-start");

  let currentPrompt = "";
  let startTime = 0;
  let timerId = null;
  let running = false;
  let remainingSeconds = 60;
  let totalCorrectChars = 0;
  let totalTypedChars = 0;

  function pickPrompt() {
    if (TYPING_PROMPTS.length < 2 || !currentPrompt) {
      return TYPING_PROMPTS[Math.floor(Math.random() * TYPING_PROMPTS.length)];
    }

    let nextPrompt = currentPrompt;
    while (nextPrompt === currentPrompt) {
      nextPrompt = TYPING_PROMPTS[Math.floor(Math.random() * TYPING_PROMPTS.length)];
    }
    return nextPrompt;
  }

  function getFirstMismatchIndex(value) {
    for (let index = 0; index < value.length; index += 1) {
      if (value[index] !== currentPrompt[index]) return index;
    }
    return -1;
  }

  function resetTypingGame() {
    clearInterval(timerId);
    currentPrompt = "";
    startTime = 0;
    running = false;
    remainingSeconds = 60;
    totalCorrectChars = 0;
    totalTypedChars = 0;
    input.value = "";
    input.disabled = true;
    promptElement.textContent = "Klicke auf Start, um den ersten Text zu laden.";
    wpmElement.textContent = "0 WPM";
    accuracyElement.textContent = "0 % Genauigkeit";
    timerElement.textContent = "60s";
    startButton.textContent = "Starten";
  }

  function renderPrompt() {
    const typedValue = input.value;
    const mismatchIndex = getFirstMismatchIndex(typedValue);
    const doneLength = mismatchIndex === -1 ? typedValue.length : mismatchIndex;
    const errorLength = mismatchIndex === -1 ? 0 : Math.min(1, typedValue.length - mismatchIndex);
    const typedPart = escapeHtml(currentPrompt.slice(0, doneLength));
    const errorPart = errorLength ? escapeHtml(currentPrompt.slice(mismatchIndex, mismatchIndex + errorLength)) : "";
    const remainingPart = escapeHtml(currentPrompt.slice(doneLength + errorLength));
    promptElement.innerHTML = `
      <span class="typing-done">${typedPart}</span><span class="typing-error">${errorPart}</span><span>${remainingPart}</span>
    `;
  }

  function currentResult() {
    const typed = input.value;
    const mismatchIndex = getFirstMismatchIndex(typed);
    const currentCorrectChars = mismatchIndex === -1 ? typed.length : mismatchIndex;
    const currentTypedChars = typed.length;
    const correctChars = totalCorrectChars + currentCorrectChars;
    const totalChars = totalTypedChars + currentTypedChars;
    const errorChars = Math.max(0, totalChars - correctChars);

    const elapsedMs = Math.max(1, Date.now() - startTime);
    const accuracy = totalChars ? Math.round((correctChars / (correctChars + errorChars)) * 100) : 100;
    const wpm = Math.round((correctChars / 5) / (elapsedMs / 60_000));

    wpmElement.textContent = `${Math.max(0, wpm)} WPM`;
    accuracyElement.textContent = `${Math.max(0, accuracy)} % Genauigkeit`;

    return {
      wpm: Math.max(0, wpm),
      accuracy: Math.max(0, accuracy),
      correctChars,
      totalChars: Math.max(1, totalChars),
      durationMs: elapsedMs,
    };
  }

  function advancePrompt() {
    totalCorrectChars += currentPrompt.length;
    totalTypedChars += currentPrompt.length;
    currentPrompt = pickPrompt();
    input.value = "";
    renderPrompt();
    currentResult();
  }

  async function finishTypingGame() {
    if (!running) return;
    running = false;
    clearInterval(timerId);
    input.disabled = true;
    startButton.textContent = "Nochmal spielen";

    const result = currentResult();
    try {
      await api("/api/game/typing/scores", {
        method: "POST",
        body: JSON.stringify(result),
      });
      await loadTypingLeaderboard();
      showToast("Typing-Ergebnis gespeichert.");
    } catch (error) {
      console.error("Typing-Ergebnis konnte nicht gespeichert werden:", error);
    }
  }

  function tick() {
    remainingSeconds -= 1;
    timerElement.textContent = `${remainingSeconds}s`;
    currentResult();
    if (remainingSeconds <= 0) finishTypingGame();
  }

  function startTypingGame() {
    currentPrompt = pickPrompt();
    startTime = Date.now();
    running = true;
    remainingSeconds = 60;
    totalCorrectChars = 0;
    totalTypedChars = 0;
    input.disabled = false;
    input.value = "";
    input.focus();
    startButton.textContent = "Laeuft...";
    timerElement.textContent = "60s";
    accuracyElement.textContent = "100 % Genauigkeit";
    wpmElement.textContent = "0 WPM";
    renderPrompt();
    clearInterval(timerId);
    timerId = setInterval(tick, 1000);
  }

  $("#typing-start").addEventListener("click", () => {
    if (running) return;
    startTypingGame();
  });

  $("#typing-reset").addEventListener("click", resetTypingGame);

  input.addEventListener("input", () => {
    if (!running) return;
    const mismatchIndex = getFirstMismatchIndex(input.value);
    const maxLength = mismatchIndex === -1 ? currentPrompt.length : mismatchIndex + 1;
    if (input.value.length > maxLength) {
      input.value = input.value.slice(0, maxLength);
    }
    if (input.value.length > currentPrompt.length) {
      input.value = input.value.slice(0, currentPrompt.length);
    }
    renderPrompt();
    currentResult();
    if (input.value === currentPrompt) {
      advancePrompt();
    }
  });

  resetTypingGame();
}

/* ============================================================
   Team-Chat
   ============================================================
   Ein gemeinsamer Raum fuer alle Rollen. Neue Nachrichten kommen per Polling --
   fuer WebSockets braeuchte es Durable Objects, was fuer ein Team dieser Groesse
   unverhaeltnismaessig waere. Abgefragt wird nur der Zuwachs (`?after=<id>`),
   sodass jede Runde wenige hundert Byte kostet.
*/
const CHAT_POLL_MS = 10_000;

const chatState = {
  messages: [],
  lastId: 0,
  open: false,
  unread: 0,
  timer: null,
  /** Verhindert, dass sich langsame Abfragen ueberholen. */
  loading: false,
};

function chatIsAtBottom() {
  const box = $("#chat-messages");
  return box.scrollHeight - box.scrollTop - box.clientHeight < 60;
}

function renderChat() {
  const box = $("#chat-messages");

  if (!chatState.messages.length) {
    box.innerHTML = '<p class="chat-empty">Noch keine Nachrichten.</p>';
    return;
  }

  // Vor dem Neuzeichnen merken, ob der Verlauf unten steht: Nur dann wird
  // nachgescrollt, sonst reisst es Mitlesende aus dem Hochgescrollten heraus.
  const stickToBottom = chatIsAtBottom();

  box.innerHTML = chatState.messages.map((message) => {
    const own = message.author_id === state.user?.id;
    const canDelete = own || isAdmin();
    return `
      <div class="chat-message${own ? " own" : ""}">
        <div class="chat-message-head">
          <span class="chat-author">
            ${avatarTag(message.author_name, 18)}${escapeHtml(message.author_name)}
          </span>
          <span>${escapeHtml(formatChatTime(message.created_at))}</span>
        </div>
        <div class="chat-body">${renderChatBody(message.body)}</div>
        ${canDelete ? `<button class="chat-delete" type="button" data-chat-delete="${message.id}">Löschen</button>` : ""}
      </div>`;
  }).join("");

  hydrateAvatars(box);
  if (stickToBottom) box.scrollTop = box.scrollHeight;
}

/** Endungen, bei denen eine Adresse als Bild eingebettet wird. */
const CHAT_IMAGE_PATTERN = /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i;

/**
 * Wandelt den Nachrichtentext in sicheres Markup: Adressen werden anklickbar,
 * Bildadressen zusaetzlich als Vorschau eingebettet.
 *
 * Sicherheitskritische Reihenfolge: Der Text wird ZUERST vollstaendig escaped,
 * die Ersetzung laeuft anschliessend nur noch ueber bereits entschaerften Text.
 * Andersherum -- erst ersetzen, dann escapen -- wuerde das eingefuegte Markup
 * mitescapen; und ohne Escaping vorweg koennte der Text eigenes HTML
 * einschleusen. Nur `http://` und `https://` werden verlinkt, damit weder
 * `javascript:` noch `data:` als Adresse durchkommen.
 */
function renderChatBody(body) {
  const safe = escapeHtml(body);

  // Adressen enden am ersten Anfuehrungszeichen: `escapeHtml` laesst `"` und
  // `'` unveraendert (textContent escaped nur &, < und >), sodass ein
  // eingeschmuggeltes Zeichen sonst im href-Attribut landen wuerde.
  return safe.replace(/https?:\/\/[^\s<"']+/g, (match) => {
    // Satzzeichen am Ende gehoeren zum Satz, nicht zur Adresse.
    const trailing = match.match(/[.,;:!?)\]]+$/);
    const url = trailing ? match.slice(0, -trailing[0].length) : match;
    const suffix = trailing ? trailing[0] : "";

    // Zusaetzlich hart kodieren, damit das Attribut auch dann nicht verlassen
    // werden kann, wenn das Muster oben je gelockert wird.
    const href = url.replaceAll('"', "&quot;").replaceAll("'", "&#39;");
    const link = `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;

    if (!CHAT_IMAGE_PATTERN.test(stripQuery(url))) return link + suffix;

    // Bilder werden lazy geladen und bleiben anklickbar, um sie in voller
    // Groesse zu oeffnen -- im schmalen Panel ist die Vorschau begrenzt.
    return `<a class="chat-image-link" href="${href}" target="_blank" rel="noopener noreferrer">
      <img class="chat-image" src="${href}" alt="Bild aus dem Chat" loading="lazy">
    </a>${suffix}`;
  });
}

/** Entfernt Query und Fragment, damit die Endung erkannt wird. */
function stripQuery(url) {
  return url.split(/[?#]/)[0];
}

/**
 * Uhrzeit fuer heutige Nachrichten, sonst zusaetzlich das Datum -- im laufenden
 * Gespraech ist das Datum nur Rauschen.
 */
function formatChatTime(value) {
  // SQLite liefert "YYYY-MM-DD HH:MM:SS" in UTC ohne Zeitzonenkennung. Ohne das
  // angehaengte "Z" wuerde der Browser das als Ortszeit lesen und die Uhrzeit
  // um den UTC-Versatz verschieben.
  const normalized = String(value ?? "").replace(" ", "T");
  const date = new Date(/[Z+]|-\d{2}:\d{2}$/.test(normalized) ? normalized : `${normalized}Z`);
  if (Number.isNaN(date.getTime())) return "";

  const time = new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  const today = new Date();
  const sameDay = date.getDate() === today.getDate()
    && date.getMonth() === today.getMonth()
    && date.getFullYear() === today.getFullYear();

  if (sameDay) return time;

  const day = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
  return `${day} ${time}`;
}

function updateChatBadge() {
  const badge = $("#chat-badge");
  if (chatState.unread > 0 && !chatState.open) {
    badge.textContent = chatState.unread > 99 ? "99+" : String(chatState.unread);
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
}

async function loadChat() {
  if (chatState.loading) return;
  chatState.loading = true;

  try {
    const query = chatState.lastId ? `?after=${chatState.lastId}` : "";
    const data = await api(`/api/chat${query}`);
    const incoming = data.messages ?? [];

    if (chatState.lastId === 0) {
      chatState.messages = incoming;
    } else if (incoming.length) {
      chatState.messages = chatState.messages.concat(incoming);
      // Fremde Nachrichten zaehlen als ungelesen, eigene nicht.
      if (!chatState.open) {
        chatState.unread += incoming.filter(
          (message) => message.author_id !== state.user?.id,
        ).length;
      }
    }

    if (chatState.messages.length) {
      chatState.lastId = chatState.messages[chatState.messages.length - 1].id;
    }

    if (incoming.length || chatState.lastId === 0) renderChat();
    updateChatBadge();
  } finally {
    chatState.loading = false;
  }
}

function startChatPolling() {
  if (chatState.timer) return;
  chatState.timer = setInterval(() => {
    // Im Hintergrundtab nicht pollen -- spart Anfragen ohne Nutzen.
    if (document.hidden) return;
    loadChat().catch(() => {});
  }, CHAT_POLL_MS);
}

function stopChatPolling() {
  if (!chatState.timer) return;
  clearInterval(chatState.timer);
  chatState.timer = null;
}

function setChatOpen(open) {
  chatState.open = open;
  $("#chat-panel").classList.toggle("hidden", !open);
  $("#chat-toggle").classList.toggle("hidden", open);
  $("#chat-toggle").setAttribute("aria-expanded", String(open));
  // Das Panel liegt fixiert ueber der Seite -- ohne diese Markierung wuerde es
  // auf breiten Bildschirmen die rechte Spalte samt Bedienelementen verdecken.
  document.body.classList.toggle("chat-open", open);

  if (open) {
    chatState.unread = 0;
    updateChatBadge();
    $("#chat-messages").scrollTop = $("#chat-messages").scrollHeight;
    $("#chat-input").focus();
    // Beim Oeffnen sofort nachladen, statt bis zur naechsten Runde zu warten.
    loadChat().catch(() => {});
  }

  try {
    localStorage.setItem("helpdesk_chat_open", open ? "1" : "0");
  } catch {
    /* Privater Modus: Der Zustand geht verloren, der Chat funktioniert weiter. */
  }
}

async function sendChatMessage() {
  const input = $("#chat-input");
  const body = input.value.trim();
  if (!body) return;

  input.value = "";
  try {
    await api("/api/chat", { method: "POST", body: JSON.stringify({ body }) });
    await loadChat();
    $("#chat-messages").scrollTop = $("#chat-messages").scrollHeight;
  } catch (error) {
    // Bei Fehlschlag den Text zuruecklegen, damit nichts verloren geht.
    input.value = body;
    throw error;
  }
}

async function deleteChatMessage(messageId) {
  await api(`/api/chat/${messageId}`, { method: "DELETE" });
  chatState.messages = chatState.messages.filter((message) => message.id !== messageId);
  renderChat();
}

function initializeChat() {
  $("#chat-toggle").classList.remove("hidden");

  let wasOpen = false;
  try {
    wasOpen = localStorage.getItem("helpdesk_chat_open") === "1";
  } catch {
    wasOpen = false;
  }

  loadChat()
    .then(() => {
      // Erstabruf zaehlt nicht als ungelesen -- sonst stuende nach jedem
      // Neuladen der gesamte Verlauf als "neu" da.
      chatState.unread = 0;
      setChatOpen(wasOpen);
      updateChatBadge();
    })
    .catch(() => {});

  startChatPolling();
}

async function initialize() {
  const me = await api("/api/auth/me");
  if (!me.user) return;

  $("#login-view").classList.add("hidden");
  $("#app-view").classList.remove("hidden");
  await loadBootstrap();
  initializeChat();
}

$("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("#login-message").textContent = "";
  try {
    await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: $("#login-username").value,
        password: $("#login-password").value,
      }),
    });
    sessionExpired = false;
    $("#login-message").textContent = "";
    $("#login-view").classList.add("hidden");
    $("#app-view").classList.remove("hidden");
    await loadBootstrap();
    initializeChat();
  } catch (error) {
    $("#login-message").textContent = error.message;
  }
});

$("#news-category").addEventListener("change", renderNews);
$("#news-feed").addEventListener("change", renderNews);
$("#news-search").addEventListener("input", renderNews);

$("#news-refresh").addEventListener("click", () => {
  // Nur Admins loesen serverseitig einen echten Neuabruf aus; fuer alle
  // anderen laedt der Klick den Zwischenspeicher neu.
  loadNews(isAdmin()).catch((error) => alert(error.message));
});

$("#news-feed-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/news/feeds", {
      method: "POST",
      body: JSON.stringify({
        name: $("#news-feed-name").value,
        url: $("#news-feed-url").value,
        category: $("#news-feed-category").value || "Allgemein",
      }),
    });
    $("#news-feed-name").value = "";
    $("#news-feed-url").value = "";
    showToast("Quelle hinzugefügt.");
    await loadNewsFeeds();
  } catch (error) {
    alert(error.message);
  }
});

$("#news-feeds-list").addEventListener("click", async (event) => {
  const toggle = event.target.closest("[data-feed-toggle]");
  const remove = event.target.closest("[data-feed-delete]");

  try {
    if (toggle) {
      await api(`/api/news/feeds/${toggle.dataset.feedToggle}`, {
        method: "PATCH",
        body: JSON.stringify({ active: toggle.dataset.feedActive !== "1" }),
      });
      await loadNewsFeeds();
      return;
    }

    if (remove) {
      const name = remove.dataset.feedName || "diese Quelle";
      if (!confirm(`Quelle „${name}" entfernen?\n\nDie zwischengespeicherten Meldungen dieser Quelle werden mit gelöscht.`)) return;
      await api(`/api/news/feeds/${remove.dataset.feedDelete}`, { method: "DELETE" });
      showToast("Quelle entfernt.");
      await loadNewsFeeds();
    }
  } catch (error) {
    alert(error.message);
  }
});

$("#chat-toggle").addEventListener("click", () => setChatOpen(true));
$("#chat-close").addEventListener("click", () => setChatOpen(false));

$("#chat-form").addEventListener("submit", (event) => {
  event.preventDefault();
  sendChatMessage().catch((error) => alert(error.message));
});

// Enter sendet, Umschalt+Enter macht einen Zeilenumbruch -- wie in gaengigen
// Chat-Oberflaechen.
$("#chat-input").addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendChatMessage().catch((error) => alert(error.message));
  }
});

$("#chat-messages").addEventListener("click", (event) => {
  const button = event.target.closest("[data-chat-delete]");
  if (!button) return;
  if (!confirm("Diese Nachricht löschen?")) return;
  deleteChatMessage(Number(button.dataset.chatDelete))
    .catch((error) => alert(error.message));
});

// Beim Zurueckkehren in den Tab sofort nachladen, statt bis zu einer vollen
// Runde auf neue Nachrichten zu warten.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && chatState.timer) loadChat().catch(() => {});
});

$("#logout-button").addEventListener("click", async () => {
  await api("/api/auth/logout", { method: "POST", body: "{}" });
  location.reload();
});

$("#main-nav").addEventListener("click", (event) => {
  // Gruppenkopf: Menue auf- und zuklappen, andere Gruppen schliessen.
  const groupButton = event.target.closest(".nav-group-button");
  if (groupButton) {
    const group = groupButton.closest(".nav-group");
    const wasOpen = group.classList.contains("open");
    closeNavGroups();
    group.classList.toggle("open", !wasOpen);
    groupButton.setAttribute("aria-expanded", String(!wasOpen));
    return;
  }

  const button = event.target.closest("[data-view]");
  if (button) {
    closeNavGroups();
    switchView(button.dataset.view);
  }
});

function closeNavGroups() {
  $$(".nav-group").forEach((group) => {
    group.classList.remove("open");
    group.querySelector(".nav-group-button")?.setAttribute("aria-expanded", "false");
  });
}

// Klick ausserhalb schliesst offene Menues -- sonst bleiben sie stehen.
document.addEventListener("click", (event) => {
  if (!event.target.closest(".nav-group")) closeNavGroups();
});

$$("dialog").forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
});

document.addEventListener("click", (event) => {
  const closeButton = event.target.closest("[data-close-dialog]");
  if (!closeButton) return;
  const dialog = closeButton.closest("dialog");
  if (dialog?.open) dialog.close();
});

$("#template-search").addEventListener("input", renderTemplates);
$("#template-category-filter").addEventListener("change", renderTemplates);
$("#template-sort").addEventListener("change", renderTemplates);
$("#command-search").addEventListener("input", renderCommands);
$("#command-category-filter").addEventListener("change", renderCommands);
$("#command-shell-filter").addEventListener("change", renderCommands);
$("#command-sort").addEventListener("change", renderCommands);
$("#theme-button").addEventListener("click", () => {
  cycleTheme().catch((error) => alert(error.message));
});
$("#theme-select").addEventListener("change", (event) => {
  const theme = event.target.value;
  state.settings.preferences.theme = THEMES[theme] ? theme : "cyan";
  applyTheme(state.settings.preferences.theme);
});
document.querySelectorAll("input[name='proposal-category-mode']").forEach((input) => {
  input.addEventListener("change", syncProposalCategoryMode);
});
$("#new-proposal-button").addEventListener("click", () => openProposal());
$("#proposal-form").addEventListener("submit", submitProposal);
$("#check-duplicate-button").addEventListener("click", () => checkDuplicate().catch((error) => alert(error.message)));
$("#feedback-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/feedback", {
      method: "POST",
      body: JSON.stringify({
        type: $("#feedback-type").value,
        title: $("#feedback-title").value,
        message: $("#feedback-message").value,
      }),
    });
    event.target.reset();
    $("#feedback-type").value = "bug";
    showToast("Vorschlag wurde eingereicht.");
    await loadFeedback();
  } catch (error) {
    alert(error.message);
  }
});
$("#feedback-refresh-button").addEventListener("click", () => {
  loadFeedback().catch((error) => alert(error.message));
});
$("#feedback-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-feedback-save]");
  if (!button) return;
  saveFeedbackAdmin(Number(button.dataset.feedbackSave))
    .catch((error) => alert(error.message));
});
$("#users-list").addEventListener("click", (event) => {
  handleUsersListClick(event).catch((error) => alert(error.message));
});

// Achtung: "#user-form" ist das Formular zum Anlegen neuer Benutzer im
// Admin-Bereich. Der Bearbeiten-Dialog heisst bewusst anders, sonst wuerde
// $() nur das erste Element mit der ID finden.
$("#user-edit-form").addEventListener("submit", submitUserEdit);

$("#audit-filter").addEventListener("change", renderAudit);
$("#audit-refresh").addEventListener("click", () => {
  loadAudit().catch((error) => alert(error.message));
});

$("#templates-list").addEventListener("click", (event) => {
  const favoriteButton = event.target.closest("[data-favorite-template]");
  if (favoriteButton) {
    event.preventDefault();
    event.stopPropagation();
    toggleFavorite("template", Number(favoriteButton.dataset.favoriteTemplate))
      .catch((error) => alert(error.message));
    return;
  }

  const copyButton = event.target.closest("[data-copy-template]");
  if (copyButton) {
    const template = state.templates.find((item) => item.id === Number(copyButton.dataset.copyTemplate));
    if (template) copyTemplate(template);
  }

  const editButton = event.target.closest("[data-edit-template]");
  if (editButton) {
    const template = state.templates.find((item) => item.id === Number(editButton.dataset.editTemplate));
    if (template) openProposal(template);
  }

  const deleteButton = event.target.closest("[data-delete-template]");
  if (deleteButton) {
    deleteTemplate(Number(deleteButton.dataset.deleteTemplate))
      .catch((error) => alert(error.message));
  }
});

$("#commands-list").addEventListener("click", (event) => {
  const favoriteButton = event.target.closest("[data-favorite-command]");
  if (favoriteButton) {
    event.preventDefault();
    event.stopPropagation();
    toggleFavorite("command", Number(favoriteButton.dataset.favoriteCommand))
      .catch((error) => alert(error.message));
    return;
  }

  const deleteButton = event.target.closest("[data-delete-command]");
  if (deleteButton) {
    deleteCommand(Number(deleteButton.dataset.deleteCommand))
      .catch((error) => alert(error.message));
    return;
  }

  const button = event.target.closest("[data-copy-command]");
  if (!button) return;
  const command = state.commands.find((item) => item.id === Number(button.dataset.copyCommand));
  if (!command) return;

  if (command.risk_level === "high" && !confirm("Dieser Befehl ist als hohes Risiko markiert. Wirklich kopieren?")) return;
  copyText(command.command);
  addRecentItem("command", command.id, command.name);
  countContentUsage("command", command.id);
  trackInCase("command", command.id, command.name, command.command);
});

$("#approvals-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-review-id]");
  if (button) {
    openReview(Number(button.dataset.reviewId));
    return;
  }

  const contentButton = event.target.closest("[data-review-content]");
  if (contentButton) openContentReview(Number(contentButton.dataset.reviewContent));
});

$("#review-form").addEventListener("click", (event) => {
  const button = event.target.closest("[data-review]");
  if (button) reviewProposal(button.dataset.review);
});

$("#settings-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  state.settings.signatureName = $("#signature-name").value.trim();
  state.settings.preferences.theme = $("#theme-select").value;
  try {
    await persistSettings();
    applyTheme(state.settings.preferences.theme);
    showToast("Einstellungen gespeichert.");
  } catch (error) {
    alert(error.message);
  }
});

$("#user-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/users", {
      method: "POST",
      body: JSON.stringify({
        username: $("#user-username").value,
        displayName: $("#user-display-name").value,
        password: $("#user-password").value,
        role: $("#user-role").value,
      }),
    });
    event.target.reset();
    showToast("Benutzer angelegt.");
    await loadUsers();
  } catch (error) {
    alert(error.message);
  }
});

$("#category-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/categories", {
      method: "POST",
      body: JSON.stringify({
        name: $("#category-name").value,
        color: $("#category-color").value,
      }),
    });
    event.target.reset();
    $("#category-color").value = "#4a7cff";
    showToast("Kategorie angelegt.");
    await loadBootstrap();
  } catch (error) {
    alert(error.message);
  }
});


$("#clear-recent-button").addEventListener("click", () => {
  state.recentItems = [];
  saveRecentItems();
  renderQuickbar();
});

$("#quickbar-items").addEventListener("click", (event) => {
  const button = event.target.closest("[data-recent-type]");
  if (!button) return;

  const id = Number(button.dataset.recentId);
  if (button.dataset.recentType === "template") {
    const template = state.templates.find((item) => item.id === id);
    if (template) copyTemplate(template);
    return;
  }

  if (button.dataset.recentType === "solution") {
    const solution = state.solutions.find((item) => item.id === id);
    if (solution) {
      copyText(solution.solution);
      addRecentItem("solution", solution.id, solution.title);
      countContentUsage("solution", solution.id);
    }
    return;
  }

  const command = state.commands.find((item) => item.id === id);
  if (command) {
    copyText(command.command);
    addRecentItem("command", command.id, command.name);
    countContentUsage("command", command.id);
  }
});

$("#diag-type").addEventListener("change", renderDiagnosticChecklist);
$("#diag-generate-button").addEventListener("click", generateDiagnosticText);
$("#diag-reset-button").addEventListener("click", resetDiagnostics);
$("#diag-copy-button").addEventListener("click", () => {
  const output = $("#diag-output").textContent;
  if (output && output !== "Noch kein Text erzeugt.") copyText(output);
});

$("#gen-create-button").addEventListener("click", generateTicketText);
$("#gen-clear-button").addEventListener("click", clearGenerator);
$("#gen-copy-button").addEventListener("click", () => {
  const output = $("#gen-output").textContent;
  if (output && output !== "Noch kein Text erzeugt.") copyText(output);
});

$("#history-refresh-button").addEventListener("click", () => {
  loadHistory().catch((error) => alert(error.message));
});
$("#template-version-list").addEventListener("click", (event) => {
  const restoreButton = event.target.closest("[data-restore-version]");
  if (restoreButton) {
    restoreHistoryItem("version", Number(restoreButton.dataset.restoreVersion))
      .catch((error) => alert(error.message));
    return;
  }

  const purgeButton = event.target.closest("[data-purge-version]");
  if (purgeButton) {
    purgeVersion(Number(purgeButton.dataset.purgeVersion))
      .catch((error) => alert(error.message));
  }
});
$("#template-trash-list").addEventListener("click", (event) => {
  const restoreButton = event.target.closest("[data-restore-template]");
  if (restoreButton) {
    restoreHistoryItem("template", Number(restoreButton.dataset.restoreTemplate))
      .catch((error) => alert(error.message));
    return;
  }

  const purgeButton = event.target.closest("[data-purge-template]");
  if (purgeButton) {
    purgeTemplate(Number(purgeButton.dataset.purgeTemplate))
      .catch((error) => alert(error.message));
  }
});

/**
 * Oeffnet den Befehlsdialog. Wie bei den Loesungen entscheidet die Rolle, ob
 * direkt gespeichert oder ein Vorschlag eingereicht wird.
 */
function openCommandDialog() {
  const direct = canReview();
  const dialog = $("#command-dialog");

  dialog.dataset.mode = direct ? "direct" : "proposal";
  $("#command-reason-field").classList.toggle("hidden", direct);
  $("#command-dialog-title").textContent = direct
    ? "Befehl hinzufügen"
    : "Befehl vorschlagen";
  $("#command-form .btn-save").textContent = direct
    ? "Speichern"
    : "Zur Freigabe einreichen";
  dialog.showModal();
}

$("#new-command-button").addEventListener("click", openCommandDialog);
$("#command-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const direct = $("#command-dialog").dataset.mode !== "proposal";

  const payload = {
    name: $("#command-name").value,
    category: $("#command-category").value,
    command: $("#command-code").value,
    description: $("#command-description").value,
    shell: $("#command-shell").value,
    riskLevel: $("#command-risk").value,
    requiresAdmin: $("#command-admin").checked,
    remoteCapable: $("#command-remote").checked,
    restartRequired: $("#command-restart").checked,
  };

  try {
    if (direct) {
      await api("/api/commands", { method: "POST", body: JSON.stringify(payload) });
      showToast("Befehl gespeichert.");
    } else {
      await api("/api/content-proposals", {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          contentType: "command",
          reason: $("#command-reason").value || null,
        }),
      });
      showToast("Vorschlag wurde zur Freigabe eingereicht.");
    }

    $("#command-dialog").close();
    event.target.reset();
    await loadBootstrap();
  } catch (error) {
    alert(error.message);
  }
});

$("#new-solution-button").addEventListener("click", () => openSolutionDialog());
$("#solution-form").addEventListener("submit", submitSolution);
$("#solution-search").addEventListener("input", renderSolutions);
$("#solution-category-filter").addEventListener("change", renderSolutions);
$("#solution-severity-filter").addEventListener("change", renderSolutions);
$("#solution-sort").addEventListener("change", renderSolutions);

$("#solutions-list").addEventListener("click", (event) => {
  // Einzelnen Befehl aus einem Schritt kopieren.
  const stepCopy = event.target.closest("[data-copy-step]");
  if (stepCopy) {
    copyText(stepCopy.dataset.copyStep);
    return;
  }

  const helpful = event.target.closest("[data-helpful-solution]");
  if (helpful) {
    const id = Number(helpful.dataset.helpfulSolution);
    countContentUsage("solution", id, true);
    showToast("Danke -- das hilft bei der Pflege der Wissensbasis.");
    return;
  }

  const copyButton = event.target.closest("[data-copy-solution]");
  if (copyButton) {
    const solution = state.solutions.find(
      (item) => item.id === Number(copyButton.dataset.copySolution));
    if (solution) {
      copyText(solution.solution);
      addRecentItem("solution", solution.id, solution.title);
      countContentUsage("solution", solution.id);
      trackInCase("solution", solution.id, solution.title);
    }
    return;
  }

  const editButton = event.target.closest("[data-edit-solution]");
  if (editButton) {
    const solution = state.solutions.find(
      (item) => item.id === Number(editButton.dataset.editSolution));
    if (solution) openSolutionDialog(solution);
    return;
  }

  const deleteButton = event.target.closest("[data-delete-solution]");
  if (deleteButton) {
    const id = Number(deleteButton.dataset.deleteSolution);
    const solution = state.solutions.find((item) => item.id === id);
    if (!confirm(`„${solution?.title ?? "Diese Lösung"}“ löschen?`)) return;
    api(`/api/solutions/${id}`, { method: "DELETE" })
      .then(async () => {
        showToast("Lösung gelöscht.");
        await loadBootstrap();
        renderSolutions();
      })
      .catch((error) => alert(error.message));
  }
});

/* ============================================================
   Verdrahtung der neuen Bereiche
   ============================================================ */

// --- Schnellsuche ---------------------------------------------------------
/* ============================================================
   Wissensluecken schliessen
   ============================================================ */

/**
 * Oeffnet das passende Formular mit dem Suchbegriff als Titel.
 *
 * Der Begriff steht in der Datenbank klein geschrieben, weil die Auswertung
 * sonst "Drucker" und "drucker" getrennt zaehlen wuerde. Fuer den Titel wird
 * der erste Buchstabe wieder gross gesetzt.
 */
function createFromMiss(art, term) {
  const titel = term.charAt(0).toUpperCase() + term.slice(1);

  if (art === "templates") {
    openProposal();
    $("#proposal-title").value = titel;
    $("#proposal-reason").value = `Wurde mehrfach vergeblich gesucht: "${term}"`;
    $("#proposal-body").focus();
    return;
  }

  if (art === "commands") {
    openCommandDialog();
    $("#command-name").value = titel;
    const grund = $("#command-reason");
    if (grund) grund.value = `Wurde mehrfach vergeblich gesucht: "${term}"`;
    $("#command-code").focus();
    return;
  }

  openSolutionDialog();
  $("#solution-title").value = titel;
  // Der Suchbegriff ist der beste vorhandene Hinweis auf das Symptom.
  $("#solution-symptom").value = titel;
  const grund = $("#solution-reason");
  if (grund) grund.value = `Wurde mehrfach vergeblich gesucht: "${term}"`;
  $("#solution-steps").focus();
}

$("#stats-body").addEventListener("click", async (event) => {
  const anlegen = event.target.closest("[data-miss-create]");
  if (anlegen) {
    createFromMiss(anlegen.dataset.missCreate, anlegen.dataset.missTerm);
    return;
  }

  const abhaken = event.target.closest("[data-miss-resolve]");
  if (!abhaken) return;

  const term = abhaken.dataset.missResolve;
  if (!confirm(`Lücke "${term}" als erledigt abhaken?`)) return;

  try {
    await api("/api/usage/miss/resolve", {
      method: "POST",
      body: JSON.stringify({ term }),
    });
    showToast("Lücke abgehakt.");
    await loadStats();
  } catch (error) {
    alert(error.message);
  }
});

/* ============================================================
   Avatar-Editor
   ============================================================ */

/* Welche Merkmale der Editor anbietet und wie viele Varianten es je gibt.
   Farbmerkmale bekommen Farbfelder, Formmerkmale nummerierte Knoepfe. */
const AVATAR_FIELDS = [
  { key: "skin", colors: AVATAR_SKINS },
  { key: "hair", count: AVATAR_SHAPE_COUNTS.hair },
  { key: "hairColor", colors: AVATAR_HAIR_COLORS },
  { key: "eyes", count: AVATAR_SHAPE_COUNTS.eyes },
  { key: "mouth", count: AVATAR_SHAPE_COUNTS.mouth },
  { key: "shirt", colors: AVATAR_SHIRT_COLORS },
  { key: "accessory", count: AVATAR_SHAPE_COUNTS.accessory },
];

/** Der Stand im Editor -- erst beim Speichern wird er uebernommen. */
let avatarDraft = null;

function renderAvatarEditor() {
  const preview = $("#avatar-preview");
  if (!preview) return;

  if (!avatarDraft) avatarDraft = { ...state.avatar };
  drawAvatar(preview, avatarDraft);

  $("#avatar-controls").innerHTML = AVATAR_FIELDS.map((feld) => {
    const aktiv = avatarDraft[feld.key];
    const knoepfe = feld.colors
      ? feld.colors.map((farbe, index) => `
          <button type="button" class="avatar-swatch ${index === aktiv ? "active" : ""}"
                  style="background:${farbe}"
                  data-avatar-field="${feld.key}" data-avatar-value="${index}"
                  aria-label="${AVATAR_LABELS[feld.key]} ${index + 1}"
                  aria-pressed="${index === aktiv}"></button>`).join("")
      : Array.from({ length: feld.count }, (unused, index) => `
          <button type="button" class="avatar-option ${index === aktiv ? "active" : ""}"
                  data-avatar-field="${feld.key}" data-avatar-value="${index}"
                  aria-pressed="${index === aktiv}">${index + 1}</button>`).join("");

    return `
      <div class="avatar-field">
        <span class="avatar-field-label">${AVATAR_LABELS[feld.key]}</span>
        <div class="avatar-field-options">${knoepfe}</div>
      </div>`;
  }).join("");
}

$("#avatar-controls").addEventListener("click", (event) => {
  const knopf = event.target.closest("[data-avatar-field]");
  if (!knopf) return;

  avatarDraft[knopf.dataset.avatarField] = Number(knopf.dataset.avatarValue);
  renderAvatarEditor();
});

$("#avatar-random").addEventListener("click", () => {
  // Ein zufaelliger Name als Ausgangspunkt -- so entsteht eine stimmige
  // Kombination statt reiner Wuerfelei bei jedem Merkmal.
  avatarDraft = avatarFromName(String(Math.random()));
  renderAvatarEditor();
});

$("#avatar-reset").addEventListener("click", () => {
  avatarDraft = { ...state.avatar };
  renderAvatarEditor();
});

$("#avatar-save").addEventListener("click", async () => {
  try {
    await api("/api/settings", {
      method: "PUT",
      body: JSON.stringify({
        signatureName: state.settings.signatureName,
        favorites: state.settings.favorites,
        preferences: state.settings.preferences,
        avatar: avatarDraft,
      }),
    });

    state.avatar = { ...avatarDraft };
    // Auch die gemeinsame Liste nachziehen, damit der eigene Avatar sofort
    // neben dem eigenen Namen erscheint, ohne die Seite neu zu laden.
    const eigener = state.avatars.find((item) => item.id === state.user.id);
    if (eigener) eigener.avatar = state.avatar;
    else state.avatars.push({
      id: state.user.id, name: state.user.displayName, avatar: state.avatar,
    });

    // Bereits gezeichnete Bilder neu zeichnen lassen.
    document.querySelectorAll("canvas[data-avatar-drawn]")
      .forEach((canvas) => delete canvas.dataset.avatarDrawn);
    hydrateAvatars();

    showToast("Avatar gespeichert.");
  } catch (error) {
    alert(error.message);
  }
});

$("#palette-button").addEventListener("click", openPalette);
$("#palette-input").addEventListener("input", () => {
  paletteState.index = 0;
  renderPalette();
});

$("#palette-input").addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    movePaletteSelection(1);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    movePaletteSelection(-1);
  } else if (event.key === "ArrowRight") {
    // Nur aufklappen, wenn der Cursor am Zeilenende steht -- sonst wuerde die
    // Taste das Bewegen im Suchbegriff unmoeglich machen.
    const input = event.target;
    if (input.selectionStart === input.value.length) {
      event.preventDefault();
      togglePaletteExpanded(paletteState.index, true);
    }
  } else if (event.key === "ArrowLeft") {
    const input = event.target;
    if (input.selectionStart === input.value.length && paletteState.expanded) {
      event.preventDefault();
      togglePaletteExpanded(paletteState.index, false);
    }
  } else if (event.key === "Tab") {
    event.preventDefault();
    togglePaletteExpanded();
  } else if (event.key === "Enter") {
    event.preventDefault();
    usePaletteItem(paletteState.index).catch((error) => alert(error.message));
  }
});

$("#palette-results").addEventListener("click", (event) => {
  // Der Kopieren-Knopf zuerst: er liegt innerhalb der Zeile, sonst wuerde die
  // Zeile darunter das Ereignis abfangen und nur zuklappen.
  const copyButton = event.target.closest("[data-palette-copy]");
  if (copyButton) {
    usePaletteItem(Number(copyButton.dataset.paletteCopy))
      .catch((error) => alert(error.message));
    return;
  }

  const row = event.target.closest("[data-palette-index]");
  if (row) togglePaletteExpanded(Number(row.dataset.paletteIndex));
});

// Strg+K oeffnet die Suche von ueberall. In Eingabefeldern greift die
// Tastenkombination bewusst auch -- sie ersetzt dort nichts Eigenes.
document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    if (!$("#app-view").classList.contains("hidden")) openPalette();
  }
});

// --- Symptom-Assistent ----------------------------------------------------
$("#assistant-body").addEventListener("click", (event) => {
  const option = event.target.closest("[data-assistant-option]");
  if (option) {
    chooseAssistantOption(Number(option.dataset.assistantOption));
    return;
  }

  if (event.target.closest("[data-assistant-reset]")) {
    resetAssistant();
    return;
  }

  if (event.target.closest("[data-assistant-escalate]")) {
    switchView("escalation");
    return;
  }

  const hit = event.target.closest("[data-assistant-solution]");
  if (hit) {
    const id = Number(hit.dataset.assistantSolution);
    const solution = state.solutions.find((item) => item.id === id);
    if (solution) {
      copyText(solution.solution);
      countContentUsage("solution", id, true);
      addRecentItem("solution", id, solution.title);
      trackInCase("solution", id, solution.title, "Über den Assistenten gefunden");
    }
  }
});

// --- Faelle ---------------------------------------------------------------
$("#case-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/cases", {
      method: "POST",
      body: JSON.stringify({
        ticketRef: $("#case-ticket").value,
        title: $("#case-title").value,
      }),
    });
    event.target.reset();
    showToast("Fall angelegt. Ab jetzt wird mitgeschrieben.");
    await loadCases();
  } catch (error) {
    alert(error.message);
  }
});

$("#cases-list").addEventListener("toggle", (event) => {
  const details = event.target.closest("details");
  if (details?.open) {
    const body = details.querySelector("[data-case-body]");
    if (body) loadCaseDetail(Number(body.dataset.caseBody)).catch(() => {});
  }
}, true);

$("#cases-list").addEventListener("click", async (event) => {
  const ziel = (attribut) => event.target.closest(`[${attribut}]`);

  try {
    const doc = ziel("data-case-document");
    if (doc) {
      await buildCaseDocumentation(Number(doc.dataset.caseDocument));
      return;
    }

    const save = ziel("data-case-save");
    if (save) {
      const id = Number(save.dataset.caseSave);
      await api(`/api/cases/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          notes: document.querySelector(`[data-case-notes="${id}"]`)?.value || null,
          status: "open",
        }),
      });
      showToast("Notizen gespeichert.");
      return;
    }

    const close = ziel("data-case-close");
    if (close) {
      const id = Number(close.dataset.caseClose);
      await api(`/api/cases/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          notes: document.querySelector(`[data-case-notes="${id}"]`)?.value || null,
          status: "closed",
        }),
      });
      showToast("Fall abgeschlossen.");
      await loadCases();
      return;
    }

    const remove = ziel("data-case-delete");
    if (remove) {
      if (!confirm("Diesen Fall mitsamt Schritten löschen?")) return;
      await api(`/api/cases/${remove.dataset.caseDelete}`, { method: "DELETE" });
      showToast("Fall gelöscht.");
      await loadCases();
      return;
    }

    const entryDelete = ziel("data-case-entry-delete");
    if (entryDelete) {
      const caseId = entryDelete.dataset.case;
      await api(`/api/cases/${caseId}/entries/${entryDelete.dataset.caseEntryDelete}`,
        { method: "DELETE" });
      const body = document.querySelector(`[data-case-body="${caseId}"]`);
      if (body) body.dataset.loaded = "";
      await loadCaseDetail(Number(caseId));
    }
  } catch (error) {
    alert(error.message);
  }
});

// --- Eskalation -----------------------------------------------------------
$("#new-escalation-button").addEventListener("click", () => openEscalationDialog());

$("#escalation-list").addEventListener("click", async (event) => {
  const edit = event.target.closest("[data-escalation-edit]");
  if (edit) {
    const level = state.escalationLevels.find(
      (item) => item.id === Number(edit.dataset.escalationEdit));
    if (level) openEscalationDialog(level);
    return;
  }

  const remove = event.target.closest("[data-escalation-delete]");
  if (remove) {
    if (!confirm("Diese Stufe entfernen?")) return;
    try {
      await api(`/api/escalation/${remove.dataset.escalationDelete}`, { method: "DELETE" });
      showToast("Stufe entfernt.");
      await loadEscalation();
    } catch (error) {
      alert(error.message);
    }
  }
});

$("#escalation-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const levelId = $("#escalation-dialog").dataset.levelId;

  const payload = {
    position: Number($("#escalation-position").value) || 0,
    name: $("#escalation-name").value,
    responsible: $("#escalation-responsible").value,
    contact: $("#escalation-contact").value || null,
    responseTime: $("#escalation-response").value || null,
    criteria: $("#escalation-criteria").value || null,
  };

  try {
    await api(levelId ? `/api/escalation/${levelId}` : "/api/escalation", {
      method: levelId ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    $("#escalation-dialog").close();
    showToast("Eskalationsstufe gespeichert.");
    await loadEscalation();
  } catch (error) {
    alert(error.message);
  }
});

// --- Dienstuebergabe ------------------------------------------------------
$("#handover-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/handovers", {
      method: "POST",
      body: JSON.stringify({
        shiftLabel: $("#handover-shift").value,
        openCases: $("#handover-cases").value || null,
        incidents: $("#handover-incidents").value || null,
        notes: $("#handover-notes").value || null,
      }),
    });
    event.target.reset();
    showToast("Übergabe gespeichert.");
    await loadHandovers();
  } catch (error) {
    alert(error.message);
  }
});

$("#handover-list").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-handover-ack]");
  if (!button) return;

  try {
    await api(`/api/handovers/${button.dataset.handoverAck}/acknowledge`, {
      method: "POST",
      body: "{}",
    });
    showToast("Übernahme bestätigt.");
    await loadHandovers();
  } catch (error) {
    alert(error.message);
  }
});

// --- Erinnerungen ---------------------------------------------------------
// Klick auf die Fallanzeige fuehrt direkt zum Fall.
$("#case-indicator").addEventListener("click", () => switchView("cases"));

$("#reminder-button").addEventListener("click", async () => {
  await loadReminders().catch(() => {});
  $("#reminder-dialog").showModal();
});

$("#reminder-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = $("#reminder-message").value.trim();
  const dueAt = $("#reminder-due").value;

  if (!message || !dueAt) {
    alert("Bitte Text und Zeitpunkt angeben.");
    return;
  }

  try {
    await api("/api/reminders", {
      method: "POST",
      body: JSON.stringify({
        message,
        ticketRef: $("#reminder-ticket").value || null,
        dueAt,
      }),
    });
    $("#reminder-message").value = "";
    $("#reminder-ticket").value = "";
    $("#reminder-due").value = "";
    showToast("Erinnerung angelegt.");
    await loadReminders();
  } catch (error) {
    alert(error.message);
  }
});

$("#reminder-list").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-reminder-done]");
  if (!button) return;

  try {
    await api(`/api/reminders/${button.dataset.reminderDone}`, { method: "DELETE" });
    await loadReminders();
  } catch (error) {
    alert(error.message);
  }
});

initializeDiagnostics();
initializeGame();
initializeTypingGame();
initialize().catch((error) => {
  console.error(error);
  $("#login-message").textContent = "Anwendung konnte nicht geladen werden.";
});
