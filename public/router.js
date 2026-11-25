import { $, $$, canReview, escapeHtml, isAdmin, roleLabel, showToast, state } from "./base.js";
import { api, clearSessionExpired, notificationCenter } from "./core.js";
import { enterView, training } from "./app.js";
import { avatarFromName, hydrateAvatars, renderAvatarEditor } from "./avatars.js";
import { applyTheme, loadRecentItems, normalizeFavorites, normalizePreferences, updateQuickbarVisibility } from "./settings.js";
import { loadProposals, populateCategories } from "./proposals.js";
import { populateCommandCategories, renderCommands, renderTemplates } from "./templates.js";
import { populateSolutionCategories, renderSolutions } from "./solutions.js";
import { loadCases, loadEscalation, loadHandovers, loadReminders, loadStats, suggestShiftLabel } from "./workflow.js";
import { refreshApprovalCount, setSidebarOpen, updateHandoverBadge } from "./sidebar.js";
import { firstName, greeting, renderStart, renderStartQuick } from "./start.js";
import { renderGlossary } from "./glossary.js";
import { renderAssistant } from "./assistant.js";
import { loadFeedback } from "./feedback.js";
import { loadNews, loadNewsFeeds } from "./news.js";
import { loadAudit, loadUsers } from "./admin.js";
import { loadHistory } from "./history.js";
import { loadLeaderboard, loadTypingLeaderboard } from "./game.js";
import { initializeChat } from "./chat.js";

export function applyRoleVisibility() {
  $$("[data-role='admin']").forEach((element) => {
    element.classList.toggle("hidden", state.user?.role !== "admin");
  });
  $$("[data-role='reviewer']").forEach((element) => {
    element.classList.toggle("hidden", !canReview());
  });
}

export async function loadBootstrap() {
  const data = await api("/api/bootstrap");
  // Nach einem Benutzerwechsel ohne Neuladen darf kein fremder Lernstand stehen bleiben.
  if (state.user?.id !== data.user.id) training.reset();
  state.user = data.user;
  notificationCenter.start();
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
    + (showRole ? `<span>${escapeHtml(role)}</span>` : "");
  const chipAvatar = $("#current-user-avatar");
  chipAvatar.dataset.avatarName = state.user.displayName;
  delete chipAvatar.dataset.avatarDrawn;
  hydrateAvatars(chipAvatar.parentElement);
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
  refreshApprovalCount().catch(() => {});
  api("/api/handovers").then((data) => updateHandoverBadge(data.handovers)).catch(() => {});
  if (state.activeView === "start") renderStartQuick();
}

/*
 * Adressen pro Bereich (#/befehle). Damit funktionieren Neuladen, die
 * Zurueck-Taste des Browsers und Links, die man Kollegen in den Chat schickt.
 */
export const VIEW_ROUTES = {
  start: "start",
  templates: "vorlagen",
  commands: "befehle",
  solutions: "loesungen",
  glossary: "glossar",
  training: "schulung",
  assistant: "assistent",
  cases: "faelle",
  escalation: "eskalation",
  diagnose: "diagnose",
  generator: "ticket-generator",
  handover: "uebergabe",
  stats: "statistik",
  news: "meldungen",
  proposals: "vorschlaege",
  approvals: "freigaben",
  feedback: "verbesserungen",
  history: "versionen",
  game: "pause",
  admin: "administration",
  settings: "einstellungen",
};

/** Liest den Bereich aus der Adresse; unbekannte oder gesperrte -> Start. */
export function viewFromLocation() {
  // Nur das erste Stueck zaehlt: #/schulung/netzwerk gehoert zum Bereich "schulung".
  const slug = location.hash.replace(/^#\/?/, "").split("/")[0];
  const view = Object.keys(VIEW_ROUTES).find((key) => VIEW_ROUTES[key] === slug);
  if (!view) return "start";
  if (view === "admin" && !isAdmin()) return "start";
  if (view === "approvals" && !canReview()) return "start";
  return view;
}

export async function switchView(view, { updateUrl = true } = {}) {
  if (!VIEW_ROUTES[view]) view = "start";
  state.activeView = view;
  $$(".view").forEach((element) => element.classList.add("hidden"));
  $(`#view-${view}`).classList.remove("hidden");
  $$("#main-nav [data-view]").forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });

  if (updateUrl) {
    const target = `#/${VIEW_ROUTES[view]}`;
    if (location.hash !== target) history.pushState(null, "", target);
  }
  setSidebarOpen(false);
  window.scrollTo({ top: 0 });

  const config = {
    start: [
      "Mein Tag",
      `${greeting()}, ${firstName()}`,
      new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" })
        .format(new Date()),
    ],
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
    training: [
      "Wissen",
      "Schulung",
      "IT-Grundlagen und Helpdesk-Alltag in kurzen Modulen – mit Grafiken, Quiz und Praxisfällen.",
    ],
    glossary: [
      "Wissen",
      "Glossar",
      "Fachwörter aus Vorlagen, Befehlen und Lösungen – kurz erklärt, mit Beispiel aus dem Helpdesk-Alltag.",
    ],
    assistant: [
      "Arbeiten",
      "Symptom-Assistent",
      "Problem in eigenen Worten beschreiben oder Schritt für Schritt eingrenzen – mit Rückfragen, Schritten, Befehlen und Lösungen.",
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
  $("#view-description").classList.toggle("hidden", !config[2]);
  document.title = view === "start" ? "Helpdesk-Helper" : `${config[1]} · Helpdesk-Helper`;
  // Je Reiter der passende Knopf in der Kopfzeile -- die Beschriftung setzen
  // renderCommands und renderSolutions anhand der Rolle.
  $("#new-proposal-button").classList.toggle("hidden", view !== "templates");
  $("#new-command-button").classList.toggle("hidden", view !== "commands");
  $("#new-solution-button").classList.toggle("hidden", view !== "solutions");

  // Die Schnellleiste bleibt auf jedem Reiter erreichbar.
  updateQuickbarVisibility();

  if (view === "start") await renderStart();
  if (view === "solutions") renderSolutions();
  if (view === "glossary") renderGlossary();
  if (view === "training") await training.render();
  if (view === "assistant") renderAssistant();
  if (view === "cases") await loadCases();
  if (view === "escalation") await loadEscalation();
  if (view === "handover") {
    if (!$("#handover-shift").value) $("#handover-shift").value = suggestShiftLabel();
    await loadHandovers();
  }
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
    clearSessionExpired();
    $("#login-message").textContent = "";
    $("#login-view").classList.add("hidden");
    $("#app-view").classList.remove("hidden");
    await loadBootstrap();
    initializeChat();
    await enterView();
  } catch (error) {
    $("#login-message").textContent = error.message;
  }
});

$("#main-nav").addEventListener("click", (event) => {
  const button = event.target.closest("[data-view]");
  if (button) switchView(button.dataset.view).catch((error) => showToast(error.message));
});

// Zurueck/Vor im Browser wechselt den Bereich, ohne neuen Verlaufseintrag.
window.addEventListener("popstate", () => {
  if ($("#app-view").classList.contains("hidden")) return;
  switchView(viewFromLocation(), { updateUrl: false }).catch(() => {});
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

// --- Erinnerungen ---------------------------------------------------------
// Klick auf die Fallanzeige fuehrt direkt zum Fall.
$("#case-indicator").addEventListener("click", () => switchView("cases"));
