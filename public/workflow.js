import { $, canReview, escapeHtml, formatDate, formatDateTime, isAdmin, showToast, state } from "./base.js";
import { api } from "./core.js";
import { setNavBadge, updateHandoverBadge } from "./sidebar.js";
import { copyText, openCommandDialog } from "./templates.js";
import { avatarTag, hydrateAvatars } from "./avatars.js";
import { openProposal } from "./proposals.js";
import { openSolutionDialog } from "./solutions.js";
import { renderStartCases } from "./start.js";

/* ============================================================
   Fall-Arbeitsblatt
   ============================================================ */
export async function loadCases() {
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
export function updateCaseIndicator() {
  const anzeige = $("#case-indicator");
  if (!anzeige) return;

  const offen = state.cases.find((item) => item.status === "open");
  setNavBadge("#nav-badge-cases", state.cases.filter((item) => item.status === "open").length);
  anzeige.classList.toggle("hidden", !offen);
  if (offen) {
    anzeige.textContent = `● ${offen.ticket_ref}`;
    anzeige.title = `Offener Fall: ${offen.title}`;
  }
}

export function caseCard(record) {
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
export async function loadCaseDetail(caseId) {
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

export const CASE_KIND_LABELS = {
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
export async function buildCaseDocumentation(caseId) {
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
  await copyText(zeilen.join("\n"), { fill: false });
}

/**
 * Bietet an, einen benutzten Inhalt an den offenen Fall zu haengen.
 *
 * Bewusst als Rueckfrage statt automatisch: Wer zwischendurch etwas fuer einen
 * Kollegen heraussucht, haette es sonst im Fall stehen und muesste es dort
 * wieder entfernen. Ohne Antwort passiert nichts -- der Hinweis verschwindet
 * von selbst.
 */
export function trackInCase(kind, refId, label, detail = null) {
  const offen = state.cases.find((item) => item.status === "open");
  if (!offen) return;

  askCaseCapture(offen, { kind, refId, label, detail });
}

export let caseAskTimer = null;

export function askCaseCapture(fall, eintrag) {
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
export async function loadEscalation() {
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

export function openEscalationDialog(level = null) {
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
export async function loadHandovers() {
  const data = await api("/api/handovers");
  updateHandoverBadge(data.handovers);

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

export function handoverSection(titel, inhalt) {
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
export const MISS_SCOPE_LABELS = {
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
export function missRow(item) {
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

export async function loadStats() {
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
export async function loadReminders() {
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

/**
 * Oeffnet das passende Formular mit dem Suchbegriff als Titel.
 *
 * Der Begriff steht in der Datenbank klein geschrieben, weil die Auswertung
 * sonst "Drucker" und "drucker" getrennt zaehlen wuerde. Fuer den Titel wird
 * der erste Buchstabe wieder gross gesetzt.
 */
export function createFromMiss(art, term) {
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
/** Schlaegt eine Schichtbezeichnung vor, z. B. "Spätschicht 23.11.". */
export function suggestShiftLabel() {
  const now = new Date();
  const hour = now.getHours();
  const shift = hour < 13 ? "Frühschicht" : hour < 21 ? "Spätschicht" : "Nachtschicht";
  const day = `${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.`;
  return `${shift} ${day}`;
}

// Offene Faelle stehen schon in der Anwendung -- nicht noch einmal abtippen.
$("#handover-fill-cases").addEventListener("click", async () => {
  try {
    await loadCases();
  } catch {
    // Mit dem bekannten Stand weitermachen.
  }
  const open = state.cases.filter((item) => item.status === "open");
  if (!open.length) {
    showToast("Du hast keine offenen Fälle.");
    return;
  }
  const field = $("#handover-cases");
  const lines = open
    .filter((item) => !field.value.includes(item.ticket_ref))
    .map((item) => `${item.ticket_ref} ${item.title}: `);
  field.value = [field.value.trim(), ...lines].filter(Boolean).join("\n");
  field.focus();
  field.setSelectionRange(field.value.length, field.value.length);
});

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
        dueAt: new Date(dueAt).toISOString(),
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

$("#view-start").addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-start-case-form]");
  if (!form) return;
  event.preventDefault();
  try {
    await api("/api/cases", {
      method: "POST",
      body: JSON.stringify({ ticketRef: form.ticket.value, title: form.title.value }),
    });
    showToast("Fall angelegt. Ab jetzt wird mitgeschrieben.");
    await loadCases();
    renderStartCases();
  } catch (error) {
    alert(error.message);
  }
});
