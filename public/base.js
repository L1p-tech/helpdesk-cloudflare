

export const state = {
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
  activeView: "start",
  recentItems: [],
};

export const $ = (selector) => document.querySelector(selector);

export const $$ = (selector) => [...document.querySelectorAll(selector)];

export function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = String(value ?? "");
  return element.innerHTML;
}

export function formatDate(value) {
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
export function formatDateTime(value) {
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

export function highlightPlaceholders(value) {
  return escapeHtml(value).replace(
    /\[([^\]]+)\]/g,
    '<span class="placeholder">[$1]</span>',
  );
}

export function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 2600);
}

export function roleLabel(role) {
  return { employee: "Mitarbeiter", editor: "Redakteur", admin: "Administrator" }[role] || role;
}

export function replaceLiteral(value, search, replacement) {
  return String(value).split(search).join(replacement);
}

export function isAdmin() {
  return state.user?.role === "admin";
}

export function canReview() {
  return ["editor", "admin"].includes(state.user?.role);
}

/** JSON aus der Datenbank -- defekte Daten duerfen die Liste nicht sprengen. */
export function safeParse(value) {
  try {
    return JSON.parse(value) || {};
  } catch {
    return {};
  }
}

/**
 * Escaping fuer Attributwerte. `escapeHtml` beruht auf textContent und laesst
 * Anfuehrungszeichen unveraendert -- in einem href-Attribut koennte eine
 * Adresse damit ausbrechen.
 */
export function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

export function relativeTime(value) {
  const date = new Date(String(value).includes("T") ? value : `${String(value).replace(" ", "T")}Z`);
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (!Number.isFinite(minutes)) return "";
  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.round(hours / 24);
  return days === 1 ? "gestern" : `vor ${days} Tagen`;
}
