import { $, escapeHtml, showToast, state } from "./base.js";
import { api } from "./core.js";
import { copyCommand, renderCommands, renderTemplates } from "./templates.js";
import { deleteCommand } from "./proposals.js";

export const THEMES = {
  cyan: { label: "Cyan", next: "magenta" },
  magenta: { label: "Magenta", next: "lime" },
  lime: { label: "Lime", next: "amber" },
  amber: { label: "Amber", next: "cyan" },
};

export function normalizeFavorites(value) {
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

export function isFavorite(type, id) {
  const collection = type === "template"
    ? state.settings.favorites.templates
    : state.settings.favorites.commands;
  return collection.includes(Number(id));
}

export async function persistSettings() {
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

/*
 * Die frueheren Themes wurden durch die Neon-Varianten ersetzt. Gespeicherte
 * Einstellungen wuerden sonst allesamt auf Cyan zurueckfallen -- diese
 * Zuordnung bringt jeden auf die farblich naechstliegende Variante.
 */
export const LEGACY_THEMES = {
  forest: "lime",
  midnight: "cyan",
  dune: "amber",
  neon: "cyan",
};

export function normalizePreferences(value) {
  const preferences = value && typeof value === "object" ? value : {};
  const stored = typeof preferences.theme === "string" ? preferences.theme : "";
  const theme = THEMES[stored]
    ? stored
    : LEGACY_THEMES[stored] || "cyan";
  return { theme };
}

export function applyTheme(theme) {
  const resolvedTheme = THEMES[theme] ? theme : LEGACY_THEMES[theme] || "cyan";
  document.documentElement.dataset.theme = resolvedTheme;
  $("#theme-select").value = resolvedTheme;
  $("#theme-button").title = `Theme: ${THEMES[resolvedTheme].label} – klicken zum Wechseln`;
}

export async function cycleTheme() {
  const currentTheme = state.settings.preferences.theme || "cyan";
  const nextTheme = THEMES[currentTheme]?.next || "cyan";
  state.settings.preferences.theme = nextTheme;
  applyTheme(nextTheme);
  await persistSettings();
  showToast(`Theme gewechselt: ${THEMES[nextTheme].label}`);
}

export async function toggleFavorite(type, id) {
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

export function recentStorageKey() {
  return `helpdesk_recent_${state.user?.id ?? "anonymous"}`;
}

export function loadRecentItems() {
  try {
    const parsed = JSON.parse(localStorage.getItem(recentStorageKey()) || "[]");
    state.recentItems = Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    state.recentItems = [];
  }
  renderQuickbar();
}

export function saveRecentItems() {
  localStorage.setItem(recentStorageKey(), JSON.stringify(state.recentItems));
}

export function addRecentItem(type, id, label) {
  state.recentItems = [
    { type, id, label },
    ...state.recentItems.filter((item) => !(item.type === type && item.id === id)),
  ].slice(0, 8);
  saveRecentItems();
  renderQuickbar();
}

export function renderQuickbar() {
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
export function updateQuickbarVisibility() {
  // Auf allen Reitern sichtbar: Der Schnellzugriff wird auch dann gebraucht,
  // wenn man gerade im Ticket-Generator oder in der Diagnose steht.
  const hasContent = state.recentItems.length > 0
    || state.templates.some((item) => isFavorite("template", item.id))
    || state.commands.some((item) => isFavorite("command", item.id));

  $("#quickbar").classList.toggle("hidden", !hasContent);
}

$("#theme-button").addEventListener("click", () => {
  cycleTheme().catch((error) => alert(error.message));
});

$("#theme-select").addEventListener("change", (event) => {
  const theme = event.target.value;
  state.settings.preferences.theme = THEMES[theme] ? theme : "cyan";
  applyTheme(state.settings.preferences.theme);
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
  // Kopierknopf in der zugeklappten Zeile: nicht zusaetzlich aufklappen.
  if (button.closest("summary")) event.preventDefault();
  const command = state.commands.find((item) => item.id === Number(button.dataset.copyCommand));
  if (command) copyCommand(command).catch((error) => alert(error.message));
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

$("#clear-recent-button").addEventListener("click", () => {
  state.recentItems = [];
  saveRecentItems();
  renderQuickbar();
});
