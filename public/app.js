const state = {
  user: null,
  categories: [],
  templates: [],
  commands: [],
  proposals: [],
  settings: { signatureName: "", favorites: { templates: [], commands: [] } },
  activeView: "templates",
  recentItems: [],
};

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

  container.innerHTML = state.recentItems.length
    ? state.recentItems.map((item) => `
      <button
        class="quick-item"
        type="button"
        data-recent-type="${escapeHtml(item.type)}"
        data-recent-id="${Number(item.id)}"
      >${escapeHtml(item.label)}</button>
    `).join("")
    : '<span class="quick-empty">Noch keine zuletzt verwendeten Inhalte.</span>';
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
  state.settings = {
    signatureName: data.settings.signature_name || "",
    favorites: JSON.parse(data.settings.favorites_json || '{"templates":[],"commands":[]}'),
  };

  $("#current-user").innerHTML = `<strong>${escapeHtml(state.user.displayName)}</strong><br>${roleLabel(state.user.role)}`;
  $("#signature-name").value = state.settings.signatureName;
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

function replacePersonalPlaceholders(text) {
  return text.replaceAll("[ICH]", state.settings.signatureName || "[ICH]");
}

async function copyText(text) {
  await navigator.clipboard.writeText(text);
  showToast("In Zwischenablage kopiert.");
}

function templateCard(template) {
  const updatedAt = formatDate(template.updated_at);
  return `
    <details class="card">
      <summary>
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
          ${updatedAt ? `Aktualisiert am ${updatedAt} · ` : ""}Version ${template.version}
        </span>
      </summary>
      <div class="card-content">
        <div class="template-body">${highlightPlaceholders(template.body)}</div>
        <div class="card-actions">
          <button class="primary" data-copy-template="${template.id}">Kopieren</button>
          <button data-edit-template="${template.id}">Änderung vorschlagen</button>
        </div>
      </div>
    </details>`;
}

function renderTemplates() {
  const search = $("#template-search").value.trim().toLowerCase();
  const category = $("#template-category-filter").value;
  const templates = state.templates.filter((template) => {
    const matchesSearch = !search ||
      template.title.toLowerCase().includes(search) ||
      template.body.toLowerCase().includes(search);
    const matchesCategory = !category || String(template.category_id) === category;
    return matchesSearch && matchesCategory;
  });

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

  return `
    <details class="card">
      <summary>
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
              <span class="badge">${escapeHtml(proposal.category_name)}</span>
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
  $("#proposal-body").value = template?.body || "";
  $("#proposal-reason").value = "";
  $("#duplicate-result").classList.add("hidden");
  $("#proposal-dialog-title").textContent = template ? "Änderung vorschlagen" : "Neue Vorlage vorschlagen";
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
    const data = await api("/api/proposals", {
      method: "POST",
      body: JSON.stringify({
        templateId: $("#proposal-template-id").value || null,
        title: $("#proposal-title").value,
        categoryId: Number($("#proposal-category").value),
        body: $("#proposal-body").value,
        reason: $("#proposal-reason").value,
      }),
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

async function switchView(view) {
  state.activeView = view;
  $$(".view").forEach((element) => element.classList.add("hidden"));
  $(`#view-${view}`).classList.remove("hidden");
  $$("#main-nav button").forEach((button) => button.classList.toggle("active", button.dataset.view === view));

  const config = {
    templates: ["Gemeinsame Inhalte", "Ticket-Vorlagen"],
    proposals: ["Persönlich", "Meine Vorschläge"],
    approvals: ["Prüfung", "Freigaben"],
    commands: ["Werkzeuge", "Befehle"],
    diagnose: ["Werkzeuge", "Diagnose"],
    generator: ["Dokumentation", "Ticket-Generator"],
    history: ["Nachvollziehbarkeit", "Versionen & Papierkorb"],
    game: ["Pause", "Helpdesk Runner"],
    admin: ["Verwaltung", "Administration"],
    settings: ["Persönlich", "Einstellungen"],
  }[view];

  $("#view-eyebrow").textContent = config[0];
  $("#view-title").textContent = config[1];
  $("#new-proposal-button").classList.toggle("hidden", view !== "templates");

  if (view === "proposals" || view === "approvals") await loadProposals(view);
  if (view === "admin") await loadUsers();
  if (view === "history") await loadHistory();
  if (view === "game") await loadLeaderboard();
}

async function loadUsers() {
  const data = await api("/api/users");
  $("#users-list").innerHTML = data.users.map((user) => `
    <div class="user-row">
      <strong>${escapeHtml(user.display_name)}</strong>
      <span>${escapeHtml(user.username)}</span>
      <span>${roleLabel(user.role)}</span>
      <span>${user.active ? "Aktiv" : "Gesperrt"}</span>
    </div>`).join("");
}

async function loadLeaderboard() {
  const data = await api("/api/game/leaderboard");
  $("#leaderboard").innerHTML = data.leaderboard.length
    ? data.leaderboard.map((entry) => `<li><strong>${escapeHtml(entry.display_name)}</strong> – ${entry.score}</li>`).join("")
    : "<li>Noch keine Scores.</li>";
}

function initializeGame() {
  const canvas = $("#game-canvas");
  const context = canvas.getContext("2d");
  let running = false;
  let frame = 0;
  let startTime = 0;
  let score = 0;
  let playerY = 200;
  let velocityY = 0;
  let obstacleX = 800;

  function jump() {
    if (running && playerY >= 199) velocityY = -12;
  }

  function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#2a2d3a";
    context.fillRect(0, 230, canvas.width, 2);

    context.fillStyle = "#4a7cff";
    context.fillRect(70, playerY, 28, 30);

    context.fillStyle = "#d55f5f";
    context.fillRect(obstacleX, 195, 22, 35);
  }

  async function finish() {
    running = false;
    const durationMs = Date.now() - startTime;
    try {
      await api("/api/game/scores", {
        method: "POST",
        body: JSON.stringify({ score, durationMs }),
      });
      await loadLeaderboard();
    } catch (error) {
      console.error(error);
    }
  }

  function tick() {
    if (!running) return;
    frame += 1;
    score = Math.floor(frame / 4);
    $("#game-score").textContent = String(score);

    velocityY += .65;
    playerY = Math.min(200, playerY + velocityY);
    obstacleX -= 6 + Math.min(5, score / 200);
    if (obstacleX < -30) obstacleX = 800 + Math.random() * 300;

    const collision =
      obstacleX < 98 &&
      obstacleX + 22 > 70 &&
      playerY + 30 > 195;

    draw();
    if (collision) {
      finish();
      return;
    }
    requestAnimationFrame(tick);
  }

  $("#game-start").addEventListener("click", () => {
    running = true;
    frame = 0;
    score = 0;
    startTime = Date.now();
    playerY = 200;
    velocityY = 0;
    obstacleX = 800;
    tick();
  });

  canvas.addEventListener("click", jump);
  window.addEventListener("keydown", (event) => {
    if (event.code === "Space" && state.activeView === "game") {
      event.preventDefault();
      jump();
    }
  });

  draw();
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

$("#template-search").addEventListener("input", renderTemplates);
$("#template-category-filter").addEventListener("change", renderTemplates);
$("#command-search").addEventListener("input", renderCommands);
$("#new-proposal-button").addEventListener("click", () => openProposal());
$("#proposal-form").addEventListener("submit", submitProposal);
$("#check-duplicate-button").addEventListener("click", () => checkDuplicate().catch((error) => alert(error.message)));

$("#templates-list").addEventListener("click", (event) => {
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
});

$("#commands-list").addEventListener("click", (event) => {
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
  await api("/api/settings", {
    method: "PUT",
    body: JSON.stringify({
      signatureName: $("#signature-name").value,
      favorites: state.settings.favorites,
      preferences: {},
    }),
  });
  state.settings.signatureName = $("#signature-name").value.trim();
  showToast("Einstellungen gespeichert.");
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
initialize().catch((error) => {
  console.error(error);
  $("#login-message").textContent = "Anwendung konnte nicht geladen werden.";
});
