import { $, canReview, escapeHtml, isAdmin, showToast, state } from "./base.js";
import { api } from "./core.js";
import { commandCategoryColor, compareText, rowCopyButton } from "./templates.js";
import { reportSearchMiss } from "./palette.js";
import { loadBootstrap } from "./router.js";

export const SEVERITY_LABELS = { low: "Niedrig", medium: "Mittel", high: "Hoch" };

export const SEVERITY_ORDER = { low: 0, medium: 1, high: 2 };

export function solutionCard(solution) {
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
        ${rowCopyButton("data-copy-solution", solution.id, "Lösungsweg kopieren")}
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
export function renderSolutionSteps(solution) {
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
export const KNOWN_COMMANDS = /\b(ipconfig|net|netsh|gpupdate|sfc|dism|chkdsk|nslookup|route|whoami|klist|vssadmin|systeminfo|tasklist|shutdown)\b/;

export function extractCommand(text) {
  const nachDoppelpunkt = text.split(": ").slice(1).join(": ").trim();
  const kandidat = KNOWN_COMMANDS.test(nachDoppelpunkt) ? nachDoppelpunkt : text.trim();

  if (!KNOWN_COMMANDS.test(kandidat)) return null;
  // Saetze mit Satzzeichen am Ende sind Beschreibungen, keine Befehle.
  if (/[.!?]$/.test(kandidat) || kandidat.split(/\s+/).length > 8) return null;

  return kandidat;
}

export function sortSolutions(solutions) {
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
export function populateSolutionCategories() {
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

export function renderSolutions() {
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
export function openSolutionDialog(solution = null) {
  const direct = canReview();
  const dialog = $("#solution-dialog");

  dialog.dataset.mode = direct ? "direct" : "proposal";
  dialog.dataset.solutionId = solution?.id || "";
  dialog.dataset.baseVersion = solution?.version || "";

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

export async function submitSolution(event) {
  event.preventDefault();
  const dialog = $("#solution-dialog");
  const direct = dialog.dataset.mode === "direct";
  const solutionId = dialog.dataset.solutionId || "";

  const payload = {
    version: Number(dialog.dataset.baseVersion) || null,
    baseVersion: Number(dialog.dataset.baseVersion) || null,
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

$("#new-solution-button").addEventListener("click", () => openSolutionDialog());

$("#solution-form").addEventListener("submit", submitSolution);

$("#solution-search").addEventListener("input", renderSolutions);

$("#solution-category-filter").addEventListener("change", renderSolutions);

$("#solution-severity-filter").addEventListener("change", renderSolutions);

$("#solution-sort").addEventListener("change", renderSolutions);
