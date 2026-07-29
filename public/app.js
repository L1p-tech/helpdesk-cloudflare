const state = {
  user: null,
  categories: [],
  templates: [],
  commands: [],
  proposals: [],
  settings: { signatureName: "", favorites: { templates: [], commands: [] } },
  activeView: "templates",
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
    game: ["Pause", "Helpdesk Runner"],
    admin: ["Verwaltung", "Administration"],
    settings: ["Persönlich", "Einstellungen"],
  }[view];

  $("#view-eyebrow").textContent = config[0];
  $("#view-title").textContent = config[1];
  $("#new-proposal-button").classList.toggle("hidden", view !== "templates");

  if (view === "proposals" || view === "approvals") await loadProposals(view);
  if (view === "admin") await loadUsers();
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
    if (template) copyText(replacePersonalPlaceholders(template.body));
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

initializeGame();
initialize().catch((error) => {
  console.error(error);
  $("#login-message").textContent = "Anwendung konnte nicht geladen werden.";
});
