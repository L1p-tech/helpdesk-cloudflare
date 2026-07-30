const state = {
  user: null,
  categories: [],
  templates: [],
  commands: [],
  proposals: [],
  feedbackItems: [],
  settings: {
    signatureName: "",
    favorites: { templates: [], commands: [] },
    preferences: { theme: "forest" },
  },
  activeView: "templates",
  recentItems: [],
};

const THEMES = {
  forest: { label: "Forest", next: "midnight" },
  midnight: { label: "Midnight", next: "dune" },
  dune: { label: "Dune", next: "forest" },
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
  if (!response.ok) {
    const error = new Error(data.error || "Anfrage fehlgeschlagen.");
    error.details = data.details;
    throw error;
  }
  return data;
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

function normalizePreferences(value) {
  const preferences = value && typeof value === "object" ? value : {};
  const theme = typeof preferences.theme === "string" && THEMES[preferences.theme]
    ? preferences.theme
    : "forest";
  return { theme };
}

function applyTheme(theme) {
  const resolvedTheme = THEMES[theme] ? theme : "forest";
  document.documentElement.dataset.theme = resolvedTheme;
  $("#theme-select").value = resolvedTheme;
  $("#theme-button").textContent = `Theme: ${THEMES[resolvedTheme].label}`;
}

async function cycleTheme() {
  const currentTheme = state.settings.preferences.theme || "forest";
  const nextTheme = THEMES[currentTheme]?.next || "forest";
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


const DIAGNOSTICS = {
  "Netzwerk / Internet": [
    "IP-Konfiguration dokumentiert",
    "Gateway erreichbar",
    "DNS-Auflösung geprüft",
    "Ping zum Ziel geprüft",
    "VPN/Proxy geprüft",
    "Netzwerktreiber geprüft",
  ],
  "VPN": [
    "Internetverbindung geprüft",
    "VPN-Profil geprüft",
    "Anmeldedaten geprüft",
    "MFA geprüft",
    "Client-Version geprüft",
    "VPN-Logs gesichert",
  ],
  "Drucker": [
    "Drucker erreichbar",
    "Warteschlange geprüft",
    "Spooler neu gestartet",
    "Treiber geprüft",
    "Testseite gedruckt",
    "Berechtigungen geprüft",
  ],
  "Windows / Software": [
    "Fehler reproduziert",
    "Ereignisanzeige geprüft",
    "Dienststatus geprüft",
    "Updates geprüft",
    "Reparatur/Neuinstallation getestet",
    "Benutzerprofil gegengeprüft",
  ],
  "Anmeldung / Berechtigung": [
    "Kontostatus geprüft",
    "Gruppenmitgliedschaften geprüft",
    "Kennwort/Sperre geprüft",
    "Gruppenrichtlinien aktualisiert",
    "Anmeldung an anderem Gerät getestet",
    "Replikation berücksichtigt",
  ],
  "Hardware": [
    "Kabel/Strom geprüft",
    "Geräte-Manager geprüft",
    "Treiber/Firmware geprüft",
    "Diagnosetest durchgeführt",
    "Komponente gegengeprüft",
    "Inventarnummer dokumentiert",
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

function generateTicketText() {
  const mode = $("#gen-mode").value;
  const common = [
    `Ticket: ${fieldValue("#gen-ticket")}`,
    `Priorität: ${fieldValue("#gen-priority")}`,
    `Benutzer: ${fieldValue("#gen-user")}`,
    `Gerät: ${fieldValue("#gen-device")}`,
    `Betroffene Benutzer/Systeme: ${fieldValue("#gen-affected")}`,
    "",
    `Fehlerbild / Auswirkungen:\n${fieldValue("#gen-issue")}`,
    "",
    `Durchgeführte Schritte:\n${fieldValue("#gen-steps")}`,
  ];

  let specific;
  if (mode === "escalation") {
    specific = [
      "",
      `Aktuelles Ergebnis / offene Frage:\n${fieldValue("#gen-result")}`,
      "",
      `Zielteam: ${fieldValue("#gen-team")}`,
      `Reproduzierbar: ${fieldValue("#gen-repro")}`,
      "",
      `Reproduktionsschritte:\n${fieldValue("#gen-reprosteps")}`,
      "",
      `Logs / Fehlercodes / Zeitstempel:\n${fieldValue("#gen-logs")}`,
      "",
      `Konkrete Frage an den 3rd Level:\n${fieldValue("#gen-request")}`,
    ];
  } else if (mode === "progress") {
    specific = [
      "",
      `Aktueller Zwischenstand:\n${fieldValue("#gen-result")}`,
      "",
      "Das Ticket bleibt bis zur weiteren Klärung geöffnet.",
    ];
  } else {
    specific = [
      "",
      `Ergebnis / Lösung:\n${fieldValue("#gen-result")}`,
      "",
      "Das Anliegen wurde gelöst und kann abgeschlossen werden.",
    ];
  }

  $("#gen-output").textContent = [
    ...common,
    ...specific,
    "",
    `Bearbeitet von: ${state.settings.signatureName || state.user.displayName}`,
  ].join("\n");
}

function clearGenerator() {
  [
    "#gen-user", "#gen-device", "#gen-ticket", "#gen-affected", "#gen-issue",
    "#gen-steps", "#gen-result", "#gen-team", "#gen-logs", "#gen-reprosteps",
    "#gen-request",
  ].forEach((selector) => {
    $(selector).value = "";
  });
  $("#gen-mode").value = "solution";
  $("#gen-priority").value = "Normal";
  $("#gen-repro").value = "Unbekannt";
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
      ${canRestore
        ? `<button type="button" data-restore-${type}="${item.id}">Wiederherstellen</button>`
        : ""}
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
  $("#current-user").innerHTML = `<strong>${escapeHtml(state.user.displayName)}</strong><br>${roleLabel(state.user.role)}`;
  $("#signature-name").value = state.settings.signatureName;
  $("#theme-select").value = state.settings.preferences.theme;
  populateCategories();
  applyRoleVisibility();
  renderTemplates();
  renderCommands();
  loadRecentItems();
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
  return replaceLiteral(text, "[ICH]", state.settings.signatureName || "[ICH]");
}

async function copyText(text) {
  await navigator.clipboard.writeText(text);
  showToast("In Zwischenablage kopiert.");
}

function templateCard(template) {
  const updatedAt = formatDate(template.updated_at);
  const favorite = isFavorite("template", template.id);
  const submittedBy = template.created_by_name
    ? `Eingereicht von ${escapeHtml(template.created_by_name)} · `
    : "";

  return `
    <details class="card">
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
          ${submittedBy}${updatedAt ? `Aktualisiert am ${updatedAt} · ` : ""}Version ${template.version}
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
  const sortBy = $("#template-sort")?.value || "updated-desc";
  const sorted = [...templates];

  sorted.sort((left, right) => {
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
}

function commandCard(command) {
  const warning = command.risk_level === "high"
    ? "Hohes Risiko"
    : command.risk_level === "medium"
      ? "Mittleres Risiko"
      : "Niedriges Risiko";
  const favorite = isFavorite("command", command.id);

  return `
    <details class="card">
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
          <span class="badge">${escapeHtml(command.category)}</span>
          <span class="summary-title">${escapeHtml(command.name)}</span>
        </div>
        <span class="summary-meta">${escapeHtml(command.shell)} · ${warning}</span>
      </summary>
      <div class="card-content">
        <p class="muted">${escapeHtml(command.description)}</p>
        <div class="badges">
          <span class="badge">${escapeHtml(command.shell)}</span>
          <span class="badge">${warning}</span>
          ${command.requires_admin ? '<span class="badge">Admin</span>' : ""}
          ${command.remote_capable ? '<span class="badge">Remote</span>' : ""}
          ${command.restart_required ? '<span class="badge">Neustart</span>' : ""}
        </div>
        <code class="command-code">${escapeHtml(command.command)}</code>
        <div class="card-actions">
          <button class="primary" data-copy-command="${command.id}">Kopieren</button>
          ${isAdmin() ? `<button class="danger-button" data-delete-command="${command.id}">Löschen</button>` : ""}
        </div>
      </div>
    </details>`;
}

function renderCommands() {
  const search = $("#command-search").value.trim().toLowerCase();
  const commands = state.commands.filter((command) =>
    !search ||
    command.name.toLowerCase().includes(search) ||
    command.command.toLowerCase().includes(search) ||
    command.description.toLowerCase().includes(search)
  );

  $("#commands-list").innerHTML = commands.length
    ? commands.map(commandCard).join("")
    : `<div class="panel muted">Keine Befehle gefunden.</div>`;
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

async function loadProposals(view) {
  const data = await api("/api/proposals");
  state.proposals = data.proposals;
  const container = view === "approvals" ? $("#approvals-list") : $("#my-proposals-list");

  container.innerHTML = state.proposals.length
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
      </article>`).join("")
    : `<div class="panel muted">Keine Einträge vorhanden.</div>`;

  if (view === "approvals") {
    $("#approval-count").textContent = state.proposals.length ? `(${state.proposals.length})` : "";
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
  $("#review-note").value = "";
  $("#review-content").innerHTML = `
    <h3>${escapeHtml(proposal.title)}</h3>
    <p class="muted">Eingereicht von ${escapeHtml(proposal.submitted_by_name)}</p>
    <p class="muted">Kategorie: ${escapeHtml(proposal.category_name || proposal.proposed_category_name || "Nicht angegeben")}</p>
    ${proposal.duplicate_title
      ? `<div class="notice">Mögliche Ähnlichkeit mit „${escapeHtml(proposal.duplicate_title)}“: ${Math.round(proposal.duplicate_score * 100)} %</div>`
      : ""}
    <div class="template-body">${escapeHtml(proposal.body)}</div>`;
  $("#review-dialog").showModal();
}

async function reviewProposal(action) {
  const proposalId = $("#review-dialog").dataset.proposalId;
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
  $("#new-proposal-button").classList.toggle("hidden", view !== "templates");

  if (view === "proposals" || view === "approvals") await loadProposals(view);
  if (view === "feedback") await loadFeedback();
  if (view === "admin") await loadUsers();
  if (view === "history") await loadHistory();
  if (view === "game") {
    await loadLeaderboard();
    await loadTypingLeaderboard();
  }
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
        <button class="btn-ghost" type="button" data-user-action="toggle-active" data-user-id="${user.id}" data-user-name="${escapeHtml(user.display_name)}" data-user-active="${user.active ? "1" : "0"}">
          ${user.active ? "Sperren" : "Entsperren"}
        </button>
        <button class="btn-ghost" type="button" data-user-action="reset-password" data-user-id="${user.id}" data-user-name="${escapeHtml(user.display_name)}">
          Passwort
        </button>
        <button class="btn-danger" type="button" data-user-action="delete" data-user-id="${user.id}" data-user-name="${escapeHtml(user.display_name)}">
          Löschen
        </button>
      </div>
    </div>`).join("");
}

async function updateUserAdmin(userId, payload) {
  await api(`/api/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  await loadUsers();
}

async function handleUsersListClick(event) {
  const button = event.target.closest("[data-user-action]");
  if (!button) return;

  const userId = Number(button.dataset.userId);
  const userName = button.dataset.userName || "dieser Benutzer";
  const action = button.dataset.userAction;

  if (!userId || !action) return;

  if (action === "toggle-active") {
    const currentlyActive = button.dataset.userActive === "1";
    const shouldActivate = !currentlyActive;
    const confirmed = window.confirm(
      shouldActivate ? `${userName} wieder entsperren?` : `${userName} wirklich sperren?`,
    );
    if (!confirmed) return;

    await updateUserAdmin(userId, { active: shouldActivate });
    showToast(shouldActivate ? "Benutzer entsperrt." : "Benutzer gesperrt.");
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
    const confirmed = window.confirm(
      `${userName} wirklich löschen? Vorhandene Inhalte, Vorschläge und Spielstände bleiben mit Namen erhalten.`,
    );
    if (!confirmed) return;

    await api(`/api/users/${userId}`, { method: "DELETE" });
    await loadUsers();
    showToast("Benutzer gelöscht.");
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
      yPos: [100, 75, 50], // drei Flughoehen -- ducken oder springen
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
  let score = 0;
  let highScore = 0;
  let startTime = 0;
  let lastTime = 0;
  let animationId = null;
  let obstacles = [];
  let clouds = [];
  let jumpKeyHeld = false;

  /** Bodenhoehe des T-Rex in der aktuellen Haltung. */
  function trexGroundY() {
    return groundY - px(trex.ducking ? TREX.HEIGHT_DUCK : TREX.HEIGHT);
  }

  function resetGame() {
    running = true;
    gameOver = false;
    speed = START_SPEED;
    distance = 0;
    score = 0;
    obstacles = [];
    clouds = [];
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
    const last = lastObstacle();
    if (!last) {
      spawnObstacle();
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

    // Kopf mit Schnauze und Kiefer
    box(26, 0, 18, 14);   // Kopfform
    box(42, 6, 4, 4);     // Schnauzenspitze
    box(26, 13, 14, 4);   // Unterkiefer
    context.fillStyle = "#12141b";
    box(38, 3, 3, 3);     // Auge
    context.fillStyle = "#d4d6dc";

    // Hals und Rumpf
    box(22, 10, 12, 12);
    box(14, 18, 20, 16);

    // Schwanz -- abfallend nach hinten, gibt die typische Silhouette
    box(6, 20, 10, 8);
    box(0, 24, 8, 6);

    // Kurzer Arm vor der Brust
    box(30, 22, 8, 4);
    box(35, 25, 4, 3);

    if (trex.jumping) {
      // Im Sprung beide Beine angezogen
      box(16, 33, 7, 12);
      box(26, 33, 7, 12);
    } else {
      // Laufanimation: Der Takt haengt an der Strecke, nicht an der Zeit --
      // dadurch trippeln die Beine bei hohem Tempo sichtbar schneller.
      //
      // Ein Bein steht gestreckt am Boden (mit Fuss), das andere ist angewinkelt.
      // Der Fuss macht den Unterschied zwischen den beiden Frames deutlich
      // sichtbar; ohne ihn wirkt die Animation fast statisch.
      const legFrame = Math.floor(distance / 8) % 2;
      if (legFrame) {
        box(15, 33, 7, 14);   // hinteres Bein gestreckt
        box(15, 44, 11, 3);   // Fuss
        box(27, 33, 7, 8);    // vorderes Bein angewinkelt
      } else {
        box(15, 33, 7, 8);    // hinteres Bein angewinkelt
        box(27, 33, 7, 14);   // vorderes Bein gestreckt
        box(27, 44, 11, 3);   // Fuss
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
    score = Math.floor(distance * SCORE_COEFFICIENT);
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
    resetGame();
    drawScene();
    animationId = requestAnimationFrame(tick);
  }

  $("#game-start").addEventListener("click", start);
  canvas.addEventListener("pointerdown", () => {
    if (running) startJump();
  });
  canvas.addEventListener("pointerup", () => {
    if (running) endJump();
  });

  window.addEventListener("keydown", (event) => {
    if (state.activeView !== "game") return;

    if (event.code === "Space" || event.code === "ArrowUp") {
      if (!running) return;
      event.preventDefault();
      if (!jumpKeyHeld) {
        jumpKeyHeld = true;
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
      jumpKeyHeld = false;
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

async function initialize() {
  const me = await api("/api/auth/me");
  if (!me.user) return;

  $("#login-view").classList.add("hidden");
  $("#app-view").classList.remove("hidden");
  await loadBootstrap();
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
    $("#login-view").classList.add("hidden");
    $("#app-view").classList.remove("hidden");
    await loadBootstrap();
  } catch (error) {
    $("#login-message").textContent = error.message;
  }
});

$("#logout-button").addEventListener("click", async () => {
  await api("/api/auth/logout", { method: "POST", body: "{}" });
  location.reload();
});

$("#main-nav").addEventListener("click", (event) => {
  const button = event.target.closest("[data-view]");
  if (button) switchView(button.dataset.view);
});

$("#main-nav").addEventListener("wheel", (event) => {
  const nav = event.currentTarget;
  if (nav.scrollWidth <= nav.clientWidth) return;

  const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX)
    ? event.deltaY
    : event.deltaX;

  if (delta === 0) return;
  event.preventDefault();
  nav.scrollLeft += delta;
}, { passive: false });

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
$("#theme-button").addEventListener("click", () => {
  cycleTheme().catch((error) => alert(error.message));
});
$("#theme-select").addEventListener("change", (event) => {
  const theme = event.target.value;
  state.settings.preferences.theme = THEMES[theme] ? theme : "forest";
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
    if (template) {
      copyText(replacePersonalPlaceholders(template.body));
      addRecentItem("template", template.id, template.title);
    }
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
});

$("#approvals-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-review-id]");
  if (button) openReview(Number(button.dataset.reviewId));
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
    if (template) {
      copyText(replacePersonalPlaceholders(template.body));
      addRecentItem("template", template.id, template.title);
    }
    return;
  }

  const command = state.commands.find((item) => item.id === id);
  if (command) {
    copyText(command.command);
    addRecentItem("command", command.id, command.name);
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
  const button = event.target.closest("[data-restore-version]");
  if (button) restoreHistoryItem("version", Number(button.dataset.restoreVersion))
    .catch((error) => alert(error.message));
});
$("#template-trash-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-restore-template]");
  if (button) restoreHistoryItem("template", Number(button.dataset.restoreTemplate))
    .catch((error) => alert(error.message));
});

$("#new-command-button").addEventListener("click", () => $("#command-dialog").showModal());
$("#command-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/commands", {
      method: "POST",
      body: JSON.stringify({
        name: $("#command-name").value,
        category: $("#command-category").value,
        command: $("#command-code").value,
        description: $("#command-description").value,
        shell: $("#command-shell").value,
        riskLevel: $("#command-risk").value,
        requiresAdmin: $("#command-admin").checked,
        remoteCapable: $("#command-remote").checked,
        restartRequired: $("#command-restart").checked,
      }),
    });
    $("#command-dialog").close();
    event.target.reset();
    showToast("Befehl gespeichert.");
    await loadBootstrap();
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
