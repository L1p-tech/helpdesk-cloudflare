import { $, canReview, escapeAttribute, escapeHtml, formatDateTime, relativeTime, showToast, state } from "./base.js";
import { api } from "./core.js";
import { loadCases, loadReminders } from "./workflow.js";
import { refreshApprovalCount, updateHandoverBadge } from "./sidebar.js";
import { training } from "./app.js";
import { avatarTag, hydrateAvatars } from "./avatars.js";
import { isFavorite } from "./settings.js";
import { PALETTE_KIND_LABELS } from "./palette.js";
import { newsSourceColor } from "./news.js";
import { switchView } from "./router.js";
import { copyByRef } from "./templates.js";

/* ============================================================
   Start: der Ueberblick zu Schichtbeginn
   ============================================================
   Alles, wofuer man sonst fuenf Reiter oeffnet: was die letzte Schicht
   hinterlassen hat, die eigenen offenen Faelle und Erinnerungen, die
   Lieblingsvorlagen zum Sofort-Kopieren, was auf Freigabe wartet und welche
   Sicherheitsmeldungen neu sind. Jede Karte laedt fuer sich -- eine langsame
   Nachrichtenquelle haelt die uebrigen nicht auf.
*/
export function greeting() {
  const hour = new Date().getHours();
  if (hour < 11) return "Guten Morgen";
  if (hour < 17) return "Hallo";
  return "Guten Abend";
}

export function firstName() {
  const name = state.settings.signatureName || state.user?.displayName || "";
  return name.trim().split(/\s+/)[0] || "zusammen";
}

export function startCard(key, title, { wide = false, action = "" } = {}) {
  return `
    <section class="start-card ${wide ? "start-card-wide" : ""}" data-start-card="${key}">
      <header class="start-card-head">
        <h3>${title}</h3>
        ${action}
      </header>
      <div class="start-card-body"><p class="muted">Wird geladen…</p></div>
    </section>`;
}

export function fillStartCard(key, html) {
  const body = document.querySelector(`[data-start-card="${key}"] .start-card-body`);
  if (body) body.innerHTML = html;
}

export let startGeneration = 0;

export async function renderStart() {
  const generation = ++startGeneration;
  const goLink = (view, label) =>
    `<button class="btn-link" type="button" data-start-go="${view}">${label}</button>`;

  $("#start-grid").innerHTML = [
    startCard("handover", "Übergabe der letzten Schicht", { wide: true, action: goLink("handover", "Alle Übergaben") }),
    startCard("cases", "Meine offenen Fälle", { action: goLink("cases", "Alle Fälle") }),
    startCard("reminders", "Erinnerungen", {
      action: '<button class="btn-link" type="button" data-start-new-reminder>+ Neu</button>',
    }),
    startCard("quick", "Favoriten &amp; zuletzt benutzt", { action: goLink("templates", "Alle Vorlagen") }),
    startCard("waiting", canReview() ? "Wartet auf dich" : "Meine Vorschläge"),
    startCard("training", "Schulung", { wide: true, action: goLink("training", "Zur Schulung") }),
    startCard("news", "Neue IT-Meldungen", { wide: true, action: goLink("news", "Alle Meldungen") }),
  ].join("");

  // Lokale Daten sofort, Serverdaten je Karte, sobald sie da sind.
  renderStartQuick();
  const stillCurrent = () => generation === startGeneration && state.activeView === "start";

  loadCases().then(() => stillCurrent() && renderStartCases())
    .catch(() => fillStartCard("cases", '<p class="muted">Fälle konnten nicht geladen werden.</p>'));
  loadReminders().then(() => stillCurrent() && renderStartReminders())
    .catch(() => fillStartCard("reminders", '<p class="muted">Erinnerungen konnten nicht geladen werden.</p>'));

  api("/api/handovers").then((data) => {
    updateHandoverBadge(data.handovers);
    if (stillCurrent()) renderStartHandover(data.handovers);
  }).catch(() => fillStartCard("handover", '<p class="muted">Übergaben konnten nicht geladen werden.</p>'));

  loadStartWaiting().then((html) => stillCurrent() && fillStartCard("waiting", html))
    .catch(() => fillStartCard("waiting", '<p class="muted">Konnte nicht geladen werden.</p>'));

  training.load()
    .then(() => stillCurrent() && fillStartCard("training", training.startCardHtml()))
    .catch(() => fillStartCard("training", '<p class="muted">Fortschritt konnte nicht geladen werden.</p>'));

  api("/api/news").then((data) => stillCurrent() && renderStartNews(data.items || [], data.feeds || []))
    .catch(() => fillStartCard("news", '<p class="muted">Meldungen konnten nicht geladen werden.</p>'));
}

export function renderStartHandover(handovers) {
  const latest = handovers[0];
  if (!latest) {
    fillStartCard("handover", `
      <p class="muted">Noch keine Übergabe vorhanden.</p>
      <button class="btn-tool" type="button" data-start-go="handover">Erste Übergabe schreiben</button>`);
    return;
  }

  const section = (label, text) => text
    ? `<div class="start-handover-part"><span class="solution-label">${label}</span><p>${escapeHtml(text)}</p></div>`
    : "";

  fillStartCard("handover", `
    <div class="start-handover-meta">
      ${avatarTag(latest.created_by_name, 22)}
      <strong>${escapeHtml(latest.shift_label)}</strong>
      <span class="muted">von ${escapeHtml(latest.created_by_name)} · ${relativeTime(latest.created_at)}</span>
      ${latest.acknowledged_at
        ? `<span class="badge">Übernommen von ${escapeHtml(latest.acknowledged_by_name || "")}</span>`
        : '<span class="badge risk-badge risk-medium">Noch nicht übernommen</span>'}
    </div>
    <div class="start-handover-grid">
      ${section("Offene Fälle", latest.open_cases)}
      ${section("Auffälligkeiten", latest.incidents)}
      ${section("Notizen", latest.notes)}
    </div>
    ${latest.acknowledged_at ? "" : `
      <div class="card-actions">
        <button class="primary" type="button" data-start-ack="${latest.id}">Übernahme bestätigen</button>
      </div>`}`);
  hydrateAvatars($("#start-grid"));
}

export function renderStartCases() {
  const open = state.cases.filter((item) => item.status === "open");
  const list = open.length
    ? `<ul class="start-list">${open.map((item) => `
        <li>
          <button class="start-row" type="button" data-start-go="cases">
            <span class="badge">${escapeHtml(item.ticket_ref)}</span>
            <span class="start-row-title">${escapeHtml(item.title)}</span>
          </button>
        </li>`).join("")}</ul>`
    : '<p class="muted">Kein offener Fall. Ein Fall schreibt mit, was du kopierst – daraus entsteht die Ticket-Doku.</p>';

  fillStartCard("cases", `
    ${list}
    <form class="start-inline-form" data-start-case-form>
      <input name="ticket" required placeholder="Ticket, z. B. INC-4711" aria-label="Ticketnummer">
      <input name="title" required placeholder="Worum geht es?" aria-label="Kurzbeschreibung">
      <button class="btn-primary" type="submit">Starten</button>
    </form>`);
}

export function renderStartReminders() {
  const items = [...state.reminders]
    .sort((a, b) => Date.parse(a.due_at) - Date.parse(b.due_at))
    .slice(0, 6);

  fillStartCard("reminders", items.length
    ? `<ul class="start-list">${items.map((item) => `
        <li class="start-reminder ${Date.parse(item.due_at) <= Date.now() ? "due" : ""}">
          <div>
            <strong>${escapeHtml(item.message)}</strong>
            <span class="muted">${item.ticket_ref ? `${escapeHtml(item.ticket_ref)} · ` : ""}${formatDateTime(item.due_at)}</span>
          </div>
          <button class="btn-link" type="button" data-start-reminder-done="${item.id}">Erledigt</button>
        </li>`).join("")}</ul>`
    : '<p class="muted">Keine offenen Erinnerungen.</p>');
}

export function renderStartQuick() {
  const favorites = [
    ...state.templates.filter((item) => isFavorite("template", item.id))
      .map((item) => ({ type: "template", id: item.id, label: item.title })),
    ...state.commands.filter((item) => isFavorite("command", item.id))
      .map((item) => ({ type: "command", id: item.id, label: item.name })),
  ];
  // Ohne Favoriten die meistgenutzten Vorlagen anbieten -- so ist die Karte
  // auch am ersten Tag nuetzlich.
  const top = favorites.length ? [] : [...state.templates]
    .filter((item) => item.use_count > 0)
    .sort((a, b) => b.use_count - a.use_count)
    .slice(0, 6)
    .map((item) => ({ type: "template", id: item.id, label: item.title }));

  const chip = (item) => `
    <button class="start-chip" type="button" data-start-copy-type="${escapeHtml(item.type)}"
            data-start-copy-id="${Number(item.id)}" title="Klicken zum Kopieren">
      <span class="palette-kind palette-kind-${escapeHtml(item.type)}">${PALETTE_KIND_LABELS[item.type] || ""}</span>
      ${escapeHtml(item.label)}
    </button>`;

  const group = (label, items) => items.length
    ? `<span class="quickbar-label">${label}</span><div class="start-chips">${items.map(chip).join("")}</div>`
    : "";

  const html = group("Favoriten", favorites)
    + group("Meistgenutzt", top)
    + group("Zuletzt kopiert", state.recentItems.slice(0, 6));

  fillStartCard("quick", html || `
    <p class="muted">Markiere Vorlagen und Befehle mit ★ – sie erscheinen hier zum Kopieren mit einem Klick.</p>`);
}

export async function loadStartWaiting() {
  if (canReview()) {
    const [open, mine, mineContent] = await Promise.all([
      refreshApprovalCount(),
      api("/api/proposals?scope=mine"),
      api("/api/content-proposals?scope=mine"),
    ]);
    const rework = [...mine.proposals, ...mineContent.proposals]
      .filter((item) => item.status === "changes_requested").length;
    return `
      <div class="start-stat-row">
        <button class="start-stat ${open ? "alert" : ""}" type="button" data-start-go="approvals">
          <strong>${open}</strong><span>Freigaben offen</span>
        </button>
        <button class="start-stat ${rework ? "alert" : ""}" type="button" data-start-go="proposals">
          <strong>${rework}</strong><span>Eigene zur Überarbeitung</span>
        </button>
      </div>`;
  }

  const [templates, content] = await Promise.all([
    api("/api/proposals?scope=mine"),
    api("/api/content-proposals?scope=mine"),
  ]);
  const all = [...templates.proposals, ...content.proposals];
  const pending = all.filter((item) => item.status === "pending").length;
  const rework = all.filter((item) => item.status === "changes_requested").length;
  return `
    <div class="start-stat-row">
      <button class="start-stat" type="button" data-start-go="proposals">
        <strong>${pending}</strong><span>In Prüfung</span>
      </button>
      <button class="start-stat ${rework ? "alert" : ""}" type="button" data-start-go="proposals">
        <strong>${rework}</strong><span>Zur Überarbeitung</span>
      </button>
    </div>
    <p class="muted">Fehlt dir eine Vorlage? Schlag sie vor – das Team profitiert.</p>`;
}

export function renderStartNews(items, feeds = []) {
  fillStartCard("news", items.length
    ? `<ul class="start-news">${items.slice(0, 6).map((item) => `
        <li style="--source-color:${newsSourceColor(item.feed_name, feeds)}">
          <a href="${escapeAttribute(item.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a>
          <span class="muted"><span class="news-source">${escapeHtml(item.feed_name)}</span>${item.published_at ? ` · ${relativeTime(item.published_at)}` : ""}</span>
        </li>`).join("")}</ul>`
    : '<p class="muted">Keine Meldungen. Quellen pflegen Admins unter Administration.</p>');
}

$("#view-start").addEventListener("click", async (event) => {
  const go = event.target.closest("[data-start-go]");
  if (go) {
    await switchView(go.dataset.startGo);
    if (go.dataset.startGo === "cases") $("#case-ticket")?.focus();
    return;
  }

  const module = event.target.closest("[data-start-module]");
  if (module) {
    await switchView("training");
    await training.openModule(module.dataset.startModule);
    return;
  }

  const copy = event.target.closest("[data-start-copy-type]");
  if (copy) {
    copyByRef(copy.dataset.startCopyType, Number(copy.dataset.startCopyId))
      .then(() => renderStartQuick())
      .catch((error) => alert(error.message));
    return;
  }

  if (event.target.closest("[data-start-new-reminder]")) {
    $("#reminder-button").click();
    return;
  }

  const done = event.target.closest("[data-start-reminder-done]");
  if (done) {
    try {
      await api(`/api/reminders/${done.dataset.startReminderDone}`, { method: "DELETE" });
      await loadReminders();
      renderStartReminders();
    } catch (error) {
      alert(error.message);
    }
    return;
  }

  const ack = event.target.closest("[data-start-ack]");
  if (ack) {
    try {
      await api(`/api/handovers/${ack.dataset.startAck}/acknowledge`, { method: "POST", body: "{}" });
      showToast("Übernahme bestätigt.");
      const data = await api("/api/handovers");
      updateHandoverBadge(data.handovers);
      renderStartHandover(data.handovers);
    } catch (error) {
      alert(error.message);
    }
  }
});
