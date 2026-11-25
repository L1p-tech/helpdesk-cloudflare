import { GLOSSARY } from "./glossary-data.js";
import { $, escapeHtml, state } from "./base.js";
import { api } from "./core.js";
import { copyByRef, replacePersonalPlaceholders } from "./templates.js";
import { switchView } from "./router.js";
import { jumpToGlossaryEntry } from "./glossary.js";

/* ============================================================
   Schnellsuche (Strg+K)
   ============================================================
   Durchsucht Vorlagen, Befehle und Loesungen gleichzeitig. Alle Daten liegen
   bereits im Bootstrap -- die Suche laeuft deshalb ohne Serveranfrage.
*/
// "expanded" haelt fest, welcher Treffer aufgeklappt ist -- bewusst nur einer,
// damit die Liste bei vielen Treffern ueberschaubar bleibt. Der Schluessel ist
// "art:id", weil sich die laufenden Nummern beim Tippen staendig verschieben.
export const paletteState = { items: [], index: 0, expanded: null };

export function paletteKey(item) {
  return `${item.kind}:${item.id}`;
}

export function paletteCandidates() {
  return [
    ...state.templates.map((item) => ({
      kind: "template",
      id: item.id,
      title: item.title,
      hint: item.category_name,
      copy: item.body,
      preview: item.body,
      haystack: `${item.title} ${item.body}`.toLowerCase(),
    })),
    ...state.commands.map((item) => ({
      kind: "command",
      id: item.id,
      title: item.name,
      hint: `${item.category} · ${item.shell}`,
      copy: item.command,
      preview: [item.command, item.description].filter(Boolean).join("\n\n"),
      haystack: `${item.name} ${item.command} ${item.description}`.toLowerCase(),
    })),
    ...state.solutions.map((item) => ({
      kind: "solution",
      id: item.id,
      title: item.title,
      hint: item.category,
      copy: item.solution,
      // Bei Loesungen gehoert das Symptom mit in die Vorschau: erst daran
      // erkennt man, ob es der richtige Fall ist.
      preview: [item.symptom && `Symptom:\n${item.symptom}`, item.solution]
        .filter(Boolean).join("\n\n"),
      haystack: `${item.title} ${item.symptom} ${item.solution}`.toLowerCase(),
    })),
    // Glossar zuletzt: Wer "DNS" sucht, will meist erst den Befehl oder die
    // Loesung; die Erklaerung steht direkt darunter.
    ...GLOSSARY.map((item) => ({
      kind: "glossary",
      id: item.begriff,
      title: item.begriff,
      hint: item.kategorie,
      preview: [item.text, item.beispiel && `Beispiel: ${item.beispiel}`].filter(Boolean).join("\n\n"),
      haystack: `${item.begriff} ${(item.auch || []).join(" ")}`.toLowerCase(),
    })),
  ];
}

export const PALETTE_KIND_LABELS = {
  template: "Vorlage",
  command: "Befehl",
  solution: "Lösung",
  glossary: "Begriff",
};

export function renderPalette() {
  const term = $("#palette-input").value.trim().toLowerCase();
  const container = $("#palette-results");

  paletteState.items = term
    ? paletteCandidates().filter((item) => item.haystack.includes(term)).slice(0, 40)
    : [];

  if (!term) {
    container.innerHTML = '<p class="palette-empty">Tippen, um zu suchen.</p>';
    return;
  }

  if (!paletteState.items.length) {
    container.innerHTML = '<p class="palette-empty">Nichts gefunden.</p>';
    // Erfolglose Suchen festhalten -- daraus wird sichtbar, welches Wissen fehlt.
    // "all", weil die Schnellsuche ueber alle drei Arten gleichzeitig sucht:
    // welche davon gefehlt hat, laesst sich hier nicht sagen.
    reportSearchMiss(term, "all");
    return;
  }

  paletteState.index = Math.min(paletteState.index, paletteState.items.length - 1);
  container.innerHTML = paletteState.items
    .map((item, index) => paletteRow(item, index))
    .join("");

  container.querySelector(".palette-row.active")
    ?.scrollIntoView({ block: "nearest" });
}

/**
 * Eine Trefferzeile, bei Bedarf mit aufgeklappter Vorschau.
 *
 * Der Volltext wird nur fuer den aufgeklappten Treffer erzeugt. Bei bis zu 40
 * Treffern mit langen Vorlagentexten waere es sonst viel Markup, das niemand
 * zu sehen bekommt.
 */
export function paletteRow(item, index) {
  const open = paletteState.expanded === paletteKey(item);
  const active = index === paletteState.index;
  const preview = item.preview || item.copy || "";

  const details = open
    ? `
      <div class="palette-preview">
        <pre class="palette-preview-text">${escapeHtml(item.kind === "glossary" ? preview : replacePersonalPlaceholders(preview))}</pre>
        <div class="palette-preview-actions">
          <button type="button" class="primary" data-palette-copy="${index}">${item.kind === "glossary" ? "Im Glossar öffnen" : "Kopieren"}</button>
        </div>
      </div>`
    : "";

  return `
    <div class="palette-row ${active ? "active" : ""} ${open ? "open" : ""}">
      <button class="palette-item" type="button" data-palette-index="${index}"
              aria-expanded="${open}">
        <span class="palette-caret" aria-hidden="true">${open ? "▾" : "▸"}</span>
        <span class="palette-kind palette-kind-${item.kind}">${PALETTE_KIND_LABELS[item.kind]}</span>
        <span class="palette-title">${escapeHtml(item.title)}</span>
        <span class="palette-hint-text">${escapeHtml(item.hint || "")}</span>
      </button>
      ${details}
    </div>`;
}

/**
 * Meldet eine Suche ohne Treffer.
 *
 * Gedrosselt: Ohne die Verzoegerung entstuende bei jedem Tastendruck ein
 * Eintrag, und die Auswertung waere voll mit Wortfragmenten.
 */
export let searchMissTimer = null;

export function reportSearchMiss(term, scope) {
  if (term.length < 4) return;
  clearTimeout(searchMissTimer);
  searchMissTimer = setTimeout(() => {
    api("/api/usage/miss", {
      method: "POST",
      body: JSON.stringify({ term, scope }),
    }).catch(() => {
      // Statistik ist Beiwerk -- ein Fehler darf die Suche nicht stoeren.
    });
  }, 1200);
}

export function movePaletteSelection(offset) {
  if (!paletteState.items.length) return;
  const count = paletteState.items.length;
  paletteState.index = (paletteState.index + offset + count) % count;
  renderPalette();
}

/** Klappt einen Treffer auf oder zu. Ohne Argument: den ausgewaehlten. */
export function togglePaletteExpanded(index = paletteState.index, force = null) {
  const item = paletteState.items[index];
  if (!item) return;

  const key = paletteKey(item);
  const open = force === null ? paletteState.expanded !== key : force;

  paletteState.expanded = open ? key : null;
  paletteState.index = index;
  renderPalette();
}

export async function usePaletteItem(index) {
  const item = paletteState.items[index];
  if (!item) return;

  // Begriffe werden nicht kopiert, sondern im Glossar aufgeschlagen.
  if (item.kind === "glossary") {
    $("#palette-dialog").close();
    await switchView("glossary");
    jumpToGlossaryEntry(item.id);
    return;
  }
  if (!(await copyByRef(item.kind, item.id))) return;
  $("#palette-dialog").close();
}

export function openPalette() {
  paletteState.index = 0;
  paletteState.expanded = null;
  $("#palette-input").value = "";
  renderPalette();
  $("#palette-dialog").showModal();
  $("#palette-input").focus();
}

/** Zaehlt Oeffnungen von Befehlen und Loesungen fuer die Statistik. */
export function countContentUsage(contentType, contentId, helpful = false) {
  api("/api/usage", {
    method: "POST",
    body: JSON.stringify({ contentType, contentId, helpful }),
  }).catch(() => {
    // Auch hier: Statistik darf den Ablauf nicht blockieren.
  });
}

$("#palette-button").addEventListener("click", openPalette);

$("#palette-input").addEventListener("input", () => {
  paletteState.index = 0;
  renderPalette();
});

$("#palette-input").addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    movePaletteSelection(1);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    movePaletteSelection(-1);
  } else if (event.key === "ArrowRight") {
    // Nur aufklappen, wenn der Cursor am Zeilenende steht -- sonst wuerde die
    // Taste das Bewegen im Suchbegriff unmoeglich machen.
    const input = event.target;
    if (input.selectionStart === input.value.length) {
      event.preventDefault();
      togglePaletteExpanded(paletteState.index, true);
    }
  } else if (event.key === "ArrowLeft") {
    const input = event.target;
    if (input.selectionStart === input.value.length && paletteState.expanded) {
      event.preventDefault();
      togglePaletteExpanded(paletteState.index, false);
    }
  } else if (event.key === "Tab") {
    event.preventDefault();
    togglePaletteExpanded();
  } else if (event.key === "Enter") {
    event.preventDefault();
    usePaletteItem(paletteState.index).catch((error) => alert(error.message));
  }
});

$("#palette-results").addEventListener("click", (event) => {
  // Der Kopieren-Knopf zuerst: er liegt innerhalb der Zeile, sonst wuerde die
  // Zeile darunter das Ereignis abfangen und nur zuklappen.
  const copyButton = event.target.closest("[data-palette-copy]");
  if (copyButton) {
    usePaletteItem(Number(copyButton.dataset.paletteCopy))
      .catch((error) => alert(error.message));
    return;
  }

  const row = event.target.closest("[data-palette-index]");
  if (row) togglePaletteExpanded(Number(row.dataset.paletteIndex));
});

// Strg+K oeffnet die Suche von ueberall. In Eingabefeldern greift die
// Tastenkombination bewusst auch -- sie ersetzt dort nichts Eigenes.
document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    if (!$("#app-view").classList.contains("hidden")) openPalette();
  }
});

/* ============================================================
   Tastenkuerzel
   ============================================================
   "g" und danach ein Buchstabe springt in einen Bereich, "/" ins Suchfeld der
   aktuellen Seite. Greift nie, solange man in einem Feld tippt oder ein
   Dialog offen ist.
*/
export const GOTO_KEYS = {
  s: "start", v: "templates", b: "commands", l: "solutions", w: "glossary", k: "training", a: "assistant",
  f: "cases", t: "generator", d: "diagnose", e: "escalation", u: "handover", m: "news",
};

export const VIEW_SEARCH_FIELDS = {
  templates: "#template-search",
  commands: "#command-search",
  solutions: "#solution-search",
  glossary: "#glossary-search",
  news: "#news-search",
};

export let gotoPending = false;

export let gotoTimer = null;

export function isTyping(target) {
  return target instanceof HTMLElement
    && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
}

document.addEventListener("keydown", (event) => {
  if ($("#app-view").classList.contains("hidden")) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (isTyping(event.target) || document.querySelector("dialog[open]")) return;
  // Waehrend des Runners gehoeren die Tasten dem Spiel.
  if (state.activeView === "game") return;

  if (gotoPending) {
    gotoPending = false;
    clearTimeout(gotoTimer);
    const view = GOTO_KEYS[event.key.toLowerCase()];
    if (view) {
      event.preventDefault();
      switchView(view).catch(() => {});
    }
    return;
  }

  if (event.key === "g") {
    gotoPending = true;
    gotoTimer = setTimeout(() => { gotoPending = false; }, 1200);
    return;
  }

  if (event.key === "/") {
    event.preventDefault();
    const field = VIEW_SEARCH_FIELDS[state.activeView];
    if (field) {
      $(field).focus();
      $(field).select();
    } else {
      openPalette();
    }
    return;
  }

  if (event.key === "?") {
    event.preventDefault();
    $("#shortcut-dialog").showModal();
  }
});

// Esc im Suchfeld einer Liste leert es -- schneller als markieren und loeschen.
Object.values(VIEW_SEARCH_FIELDS).forEach((selector) => {
  document.querySelector(selector)?.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !event.target.value) return;
    event.target.value = "";
    event.target.dispatchEvent(new Event("input", { bubbles: true }));
  });
});
