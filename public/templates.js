import { $, $$, canReview, escapeHtml, formatDate, highlightPlaceholders, isAdmin, replaceLiteral, showToast, state } from "./base.js";
import { api } from "./core.js";
import { addRecentItem, isFavorite } from "./settings.js";
import { trackInCase } from "./workflow.js";
import { countContentUsage, reportSearchMiss } from "./palette.js";
import { openSolutionDialog, renderSolutions } from "./solutions.js";
import { loadBootstrap } from "./router.js";

export function replacePersonalPlaceholders(text) {
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
export async function copyText(text, { fill = true, title = "" } = {}) {
  let output = replacePersonalPlaceholders(text);

  // Offene Platzhalter wie [USERNAME] vorher abfragen. Abbrechen heisst: es
  // wird nichts kopiert, und die Aufrufer zaehlen auch keine Nutzung.
  if (fill && findPlaceholders(output).length) {
    const filled = await askPlaceholders(output, title);
    if (filled === null) return false;
    output = filled;
  }

  await navigator.clipboard.writeText(output);
  showToast("In Zwischenablage kopiert.");
  return true;
}

/* ============================================================
   Platzhalter ausfuellen
   ============================================================
   Fast jede Vorlage enthaelt [USERNAME], viele Befehle [HOSTNAME] oder
   [DRUCKERNAME]. Bisher wurden sie nach dem Einfuegen im Ticketsystem von
   Hand ersetzt -- und dabei regelmaessig vergessen. Jetzt fragt ein kleiner
   Dialog vor dem Kopieren danach.

   Als Platzhalter gilt nur Text in eckigen Klammern aus Grossbuchstaben,
   Ziffern und wenigen Trennzeichen. So bleiben PowerShell-Ausdruecke wie
   [math]::Round oder $liste[0] unangetastet.
*/
export const PLACEHOLDER_PATTERN = /\[(?=[^\]]*[A-ZÄÖÜ])([A-ZÄÖÜ0-9][A-ZÄÖÜ0-9 _/.\-]{0,40})\]/g;

/** Platzhalter, deren Wert aus dem offenen Fall stammt. */
export const TICKET_PLACEHOLDERS = new Set([
  "TICKET", "TICKET-NR", "TICKETNR", "TICKETNUMMER", "TICKET-NUMMER", "HP-TICKETNUMMER",
]);

export function findPlaceholders(text) {
  const seen = new Set();
  for (const match of String(text).matchAll(PLACEHOLDER_PATTERN)) {
    if (match[1] !== "ICH") seen.add(match[1]);
  }
  return [...seen];
}

export function fillPlaceholders(text, values) {
  return String(text).replace(PLACEHOLDER_PATTERN, (whole, name) => {
    const value = values[name];
    return value ? value : whole;
  });
}

/**
 * Gemerkte Werte gelten pro offenem Fall, ohne Fall fuer die Browsersitzung.
 * sessionStorage statt Datenbank: Benutzernamen und Geraetenamen aus Tickets
 * gehoeren nicht dauerhaft gespeichert.
 */
export function fillMemoryKey() {
  const offen = state.cases.find((item) => item.status === "open");
  return `helpdesk_fill_${state.user?.id ?? "x"}_${offen ? `case${offen.id}` : "frei"}`;
}

export function loadFillMemory() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(fillMemoryKey()) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveFillMemory(values) {
  try {
    sessionStorage.setItem(fillMemoryKey(), JSON.stringify(values));
  } catch {
    // Ohne Speicher wird beim naechsten Mal eben neu gefragt.
  }
}

export let fillResolver = null;

export function askPlaceholders(text, title) {
  const names = findPlaceholders(text);
  const memory = loadFillMemory();
  const offen = state.cases.find((item) => item.status === "open");

  $("#fill-subtitle").textContent = [
    title,
    offen ? `Werte werden für ${offen.ticket_ref} gemerkt` : "Werte werden bis zum Schließen des Tabs gemerkt",
  ].filter(Boolean).join(" · ");

  $("#fill-fields").innerHTML = names.map((name, index) => {
    const preset = memory[name]
      || (TICKET_PLACEHOLDERS.has(name) && offen ? offen.ticket_ref : "");
    return `
      <label>${escapeHtml(name)}
        <input data-fill-name="${escapeHtml(name)}" value="${escapeHtml(preset)}"
               autocomplete="off" ${index === 0 ? "autofocus" : ""}>
      </label>`;
  }).join("");

  const dialog = $("#fill-dialog");
  dialog.dataset.source = text;
  renderFillPreview();
  dialog.showModal();

  // Erstes leeres Feld fokussieren -- bereits gemerkte Werte ueberspringen.
  const inputs = $$("#fill-fields input");
  (inputs.find((input) => !input.value) || inputs[0])?.focus();

  return new Promise((resolve) => {
    fillResolver = resolve;
  });
}

export function currentFillValues() {
  const values = {};
  $$("#fill-fields input").forEach((input) => {
    values[input.dataset.fillName] = input.value.trim();
  });
  return values;
}

export function renderFillPreview() {
  const source = $("#fill-dialog").dataset.source || "";
  const values = currentFillValues();
  // Vorschau mit markierten Restplatzhaltern: man sieht sofort, was fehlt.
  const html = escapeHtml(source).replace(
    /\[(?=[^\]]*[A-ZÄÖÜ])([A-ZÄÖÜ0-9][A-ZÄÖÜ0-9 _/.\-]{0,40})\]/g,
    (whole, name) => {
      const decoded = name.replace(/&amp;/g, "&");
      return values[decoded]
        ? `<mark class="fill-done">${escapeHtml(values[decoded])}</mark>`
        : `<span class="placeholder">${whole}</span>`;
    },
  );
  $("#fill-preview").innerHTML = html;
}

export function finishFill(result) {
  const resolve = fillResolver;
  fillResolver = null;
  const dialog = $("#fill-dialog");
  if (dialog.open) dialog.close();
  resolve?.(result);
}

/**
 * Kopiert eine Vorlage und vermerkt die Nutzung.
 *
 * Der Zaehler steuert die Sortierung "zuletzt benutzt". Er wird bewusst ohne
 * await und mit verschlucktem Fehler gezaehlt: Das Kopieren soll nie daran
 * scheitern, dass die Statistik nicht geschrieben werden konnte.
 */
export async function copyTemplate(template) {
  if (!(await copyText(template.body, { title: template.title }))) return false;
  addRecentItem("template", template.id, template.title);
  trackInCase("template", template.id, template.title);

  template.use_count = (template.use_count || 0) + 1;
  template.last_used_at = new Date().toISOString().replace("T", " ").slice(0, 19);

  api(`/api/templates/${template.id}/use`, { method: "POST", body: "{}" })
    .catch(() => {});
  return true;
}

/**
 * Kopiert einen Befehl samt Nutzung, Verlauf und Fall-Rueckfrage. Alle
 * Kopierwege (Liste, Schnellsuche, Start, Schnellleiste) laufen hier durch,
 * damit keiner die Risiko-Rueckfrage oder die Statistik auslaesst.
 */
export async function copyCommand(command) {
  if (command.risk_level === "high"
    && !confirm("Dieser Befehl ist als hohes Risiko markiert. Wirklich kopieren?")) return false;
  if (!(await copyText(command.command, { title: command.name }))) return false;
  addRecentItem("command", command.id, command.name);
  countContentUsage("command", command.id);
  trackInCase("command", command.id, command.name, command.command);
  return true;
}

export async function copySolution(solution, { helpful = false, detail = null } = {}) {
  if (!(await copyText(solution.solution, { title: solution.title }))) return false;
  addRecentItem("solution", solution.id, solution.title);
  countContentUsage("solution", solution.id, helpful);
  trackInCase("solution", solution.id, solution.title, detail);
  return true;
}

/** Kopiert einen Eintrag anhand von Art und ID -- fuer Start und Schnellleiste. */
export async function copyByRef(type, id) {
  if (type === "template") {
    const template = state.templates.find((item) => item.id === id);
    return template ? copyTemplate(template) : false;
  }
  if (type === "solution") {
    const solution = state.solutions.find((item) => item.id === id);
    return solution ? copySolution(solution) : false;
  }
  const command = state.commands.find((item) => item.id === id);
  return command ? copyCommand(command) : false;
}

/**
 * Kopierknopf direkt in der zugeklappten Zeile. Wer die Vorlage kennt, muss
 * sie nicht erst aufklappen -- ein Klick statt zwei, viele Male am Tag.
 */
export function rowCopyButton(attribute, id, label) {
  return `
    <button class="row-copy" type="button" ${attribute}="${Number(id)}"
            title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">
      <svg class="ico"><use href="#i-copy"/></svg><span>Kopieren</span>
    </button>`;
}

export function templateCard(template) {
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
        ${rowCopyButton("data-copy-template", template.id, "Vorlage kopieren")}
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

export function compareText(left, right) {
  return String(left ?? "").localeCompare(String(right ?? ""), "de", {
    sensitivity: "base",
    numeric: true,
  });
}

export function compareUpdatedAt(left, right) {
  const leftTime = Date.parse(left.updated_at || "") || 0;
  const rightTime = Date.parse(right.updated_at || "") || 0;
  return leftTime - rightTime;
}

export function sortTemplates(templates) {
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

export function renderTemplates() {
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
export const COMMAND_CATEGORY_COLORS = {
  "active directory": "#6d7ae0",
  teams: "#6264a7",
  dateien: "#c9a227",
  "microsoft 365": "#e0612c",
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
export const CATEGORY_FALLBACK_COLORS = [
  "#4a7cff", "#2ea86e", "#d89b36", "#b36ae2", "#d55f5f",
  "#42a7c6", "#1f9d8b", "#c05621", "#8b5cf6", "#d97706",
];

/**
 * Liefert eine stabile Farbe fuer einen Bereich. Bekannte Bereiche bekommen ihre
 * feste Farbe, alle anderen eine per Namen gehashte -- so bleibt sie ueber
 * Neuladen hinweg gleich.
 */
export function commandCategoryColor(category) {
  const key = String(category || "").trim().toLowerCase();
  if (COMMAND_CATEGORY_COLORS[key]) return COMMAND_CATEGORY_COLORS[key];

  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  }
  return CATEGORY_FALLBACK_COLORS[hash % CATEGORY_FALLBACK_COLORS.length];
}

export function commandCard(command) {
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
        ${rowCopyButton("data-copy-command", command.id, "Befehl kopieren")}
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
export const RISK_ORDER = { low: 0, medium: 1, high: 2 };

export function sortCommands(commands) {
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
export function populateCommandCategories() {
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

export function renderCommands() {
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

$("#template-search").addEventListener("input", renderTemplates);

$("#template-category-filter").addEventListener("change", renderTemplates);

$("#template-sort").addEventListener("change", renderTemplates);

$("#command-search").addEventListener("input", renderCommands);

$("#command-category-filter").addEventListener("change", renderCommands);

$("#command-shell-filter").addEventListener("change", renderCommands);

$("#command-sort").addEventListener("change", renderCommands);

$("#quickbar-items").addEventListener("click", (event) => {
  const button = event.target.closest("[data-recent-type]");
  if (!button) return;

  copyByRef(button.dataset.recentType, Number(button.dataset.recentId))
    .catch((error) => alert(error.message));
});

$("#diag-copy-button").addEventListener("click", () => {
  const output = $("#diag-output").textContent;
  if (output && output !== "Noch kein Text erzeugt.") copyText(output, { fill: false });
});

$("#gen-copy-button").addEventListener("click", () => {
  const output = $("#gen-output").textContent;
  if (output && output !== "Noch kein Text erzeugt.") copyText(output, { fill: false });
});

/**
 * Oeffnet den Befehlsdialog. Wie bei den Loesungen entscheidet die Rolle, ob
 * direkt gespeichert oder ein Vorschlag eingereicht wird.
 */
export function openCommandDialog() {
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
    if (copyButton.closest("summary")) event.preventDefault();
    const solution = state.solutions.find(
      (item) => item.id === Number(copyButton.dataset.copySolution));
    if (solution) copySolution(solution).catch((error) => alert(error.message));
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

/* ============================================================
   Platzhalter-Dialog: Verdrahtung
   ============================================================ */
$("#fill-fields").addEventListener("input", renderFillPreview);

$("#fill-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const values = currentFillValues();
  const memory = loadFillMemory();
  Object.entries(values).forEach(([name, value]) => {
    if (value) memory[name] = value;
  });
  saveFillMemory(memory);
  finishFill(fillPlaceholders($("#fill-dialog").dataset.source || "", values));
});

$("#fill-raw").addEventListener("click", () => finishFill($("#fill-dialog").dataset.source || ""));

$("#fill-forget").addEventListener("click", () => {
  saveFillMemory({});
  $$("#fill-fields input").forEach((input) => { input.value = ""; });
  renderFillPreview();
  $("#fill-fields input")?.focus();
  showToast("Gemerkte Werte gelöscht.");
});

// Esc, Klick daneben oder ✕: abbrechen, nichts kopieren.
$("#fill-dialog").addEventListener("close", () => {
  if (fillResolver) finishFill(null);
});
