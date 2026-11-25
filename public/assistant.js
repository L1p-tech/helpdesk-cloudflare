import { ASSISTANT_TREE, ASSISTANT_GUIDES, ASSISTANT_SYNONYMS, ASSISTANT_STOPWORDS } from "./assistant-data.js";
import { findCommands, renderCommandRows } from "./command-match.js";
import { $, $$, escapeHtml, showToast, state } from "./base.js";
import { api } from "./core.js";
import { countContentUsage, reportSearchMiss } from "./palette.js";
import { commandCategoryColor, copyCommand, copySolution, copyText, rowCopyButton } from "./templates.js";
import { SEVERITY_LABELS, openSolutionDialog, renderSolutionSteps, renderSolutions } from "./solutions.js";
import { switchView } from "./router.js";

/* ============================================================
   Symptom-Assistent
   ============================================================
   Ein Entscheidungsbaum fuehrt vom Symptom zur passenden Loesung. Die
   Endpunkte verweisen ueber Suchbegriffe auf den Loesungsbestand, statt IDs
   fest zu verdrahten -- so bleibt der Baum gueltig, wenn Loesungen dazukommen
   oder umbenannt werden.
*/
/*
 * Der Baum, die Leitfaeden und die Synonyme liegen in assistant-data.js --
 * dort laesst sich Wissen ergaenzen, ohne die Logik hier anzufassen.
 */
export const assistantState = {
  knoten: "start",
  pfad: [],
  leitfaden: null,
  text: "",
  ausgang: null,
};

/* ---------- Freitext-Erkennung ---------- */

export function foldText(text) {
  return String(text || "").toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
}

// Nachschlagetabelle: Synonym -> Oberbegriff, einmal beim Laden gebaut.
export const SYNONYM_EXACT = new Map();

export const SYNONYM_PREFIX = [];

ASSISTANT_SYNONYMS.forEach((gruppe) => {
  gruppe.forEach((wort) => {
    const folded = foldText(wort);
    if (!SYNONYM_EXACT.has(folded)) SYNONYM_EXACT.set(folded, gruppe[0]);
    if (folded.length >= 4) SYNONYM_PREFIX.push([folded, gruppe[0]]);
  });
});

// Laengster Wortanfang gewinnt: "netzwerk" vor "netz".
SYNONYM_PREFIX.sort((a, b) => b[0].length - a[0].length);

/**
 * Zerlegt Text in Begriffe. Synonyme werden auf ihren Oberbegriff gebracht,
 * uebrige Woerter auf ihre ersten sechs Buchstaben -- so treffen sich
 * "Verbindung" und "verbindet" auch ohne Eintrag in der Synonymliste.
 */
export function assistantConcepts(text) {
  const begriffe = new Set();
  foldText(text).split(/[^a-z0-9-]+/).forEach((wort) => {
    if (wort.length < 2 || ASSISTANT_STOPWORDS.has(wort)) return;
    if (SYNONYM_EXACT.has(wort)) {
      begriffe.add(SYNONYM_EXACT.get(wort));
      return;
    }
    const prefix = SYNONYM_PREFIX.find(([syn]) => wort.startsWith(syn));
    begriffe.add(prefix ? prefix[1] : wort.slice(0, 6));
  });
  return begriffe;
}

// Begriffe der Leitfaeden aendern sich zur Laufzeit nicht -- einmal berechnen.
export let guideConceptCache = null;

export function guideConcepts() {
  if (!guideConceptCache) {
    guideConceptCache = Object.entries(ASSISTANT_GUIDES).map(([id, guide]) => ({
      id,
      titel: assistantConcepts(guide.titel),
      alle: assistantConcepts(`${guide.titel} ${guide.stichworte.join(" ")}`),
    }));
  }
  return guideConceptCache;
}

/**
 * Bewertet Leitfaeden und hinterlegte Loesungen gegen eine Beschreibung.
 *
 * Seltene Begriffe zaehlen mehr als haeufige (IDF): "Neustart" sagt mehr
 * ueber das Problem als "Rechner", das in jedem dritten Eintrag vorkommt.
 * Titeltreffer zaehlen doppelt. Ergebnis sind hoechstens `limit` Treffer.
 */
export function matchAssistant(text, limit = 6) {
  const anfrage = assistantConcepts(text);
  if (!anfrage.size) return [];

  const eintraege = [
    // Dringende Leitfaeden (Sicherheitsvorfaelle, Stoerungen) nach vorn: Dort
    // zaehlt der Hinweis "sofort eskalieren" mehr als jeder Loesungsweg.
    ...guideConcepts().map((guide) => ({
      art: "leitfaden",
      id: guide.id,
      titel: guide.titel,
      alle: guide.alle,
      bonus: 0,
      dringend: Boolean(ASSISTANT_GUIDES[guide.id].dringend),
    })),
    // Konkrete Loesungen bei gleicher Passung leicht bevorzugen.
    ...state.solutions.map((solution) => ({
      art: "loesung",
      id: solution.id,
      titel: assistantConcepts(solution.title),
      alle: assistantConcepts(`${solution.title} ${solution.symptom} ${solution.category} ${solution.cause || ""}`),
      bonus: 0.25,
    })),
  ];

  const gewicht = new Map();
  anfrage.forEach((begriff) => {
    const vorkommen = eintraege.filter((eintrag) => eintrag.alle.has(begriff)).length;
    gewicht.set(begriff, vorkommen ? Math.log(1 + eintraege.length / vorkommen) : 0);
  });

  // Ab vier Suchbegriffen muessen mindestens zwei passen, sonst fuellt sich
  // die Liste mit allem, was nur ein einziges Wort gemeinsam hat.
  const mindest = anfrage.size >= 4 ? 2 : 1;
  const treffer = [];
  eintraege.forEach((eintrag) => {
    let punkte = 0;
    let getroffen = 0;
    anfrage.forEach((begriff) => {
      if (!eintrag.alle.has(begriff)) return;
      getroffen += 1;
      punkte += gewicht.get(begriff) * (eintrag.titel.has(begriff) ? 2 : 1);
    });
    // Vorrang fuer Dringendes nur bei klarer Passung -- ein einzelnes Wort
    // wie "Konto" soll nicht gleich einen Sicherheitsvorfall nahelegen.
    const bonus = eintrag.dringend ? (getroffen >= 2 ? 1.5 : 0) : eintrag.bonus;
    if (getroffen >= mindest) {
      treffer.push({ art: eintrag.art, id: eintrag.id, punkte: punkte + bonus, getroffen });
    }
  });

  return treffer.sort((a, b) => b.punkte - a.punkte).slice(0, limit);
}

/**
 * Findet Loesungen zu den Suchwoertern eines Leitfadens -- nur im Titel.
 * Mit Symptom und Kategorie kamen fachfremde Treffer durch: "office" fand
 * "Passwort im Homeoffice", "passwort" die Phishing-Loesung.
 */
export function solutionsForGuide(guide) {
  if (!guide.suche?.length) return [];
  const woerter = guide.suche.map(foldText);
  return state.solutions
    .map((solution) => {
      const text = foldText(solution.title);
      return { solution, punkte: woerter.filter((wort) => text.includes(wort)).length };
    })
    .filter((item) => item.punkte)
    .sort((a, b) => b.punkte - a.punkte)
    .slice(0, 4)
    .map((item) => item.solution);
}

/** Findet Befehle, deren Name mit einem der Stichworte beginnt oder es enthaelt. */
export function commandsForGuide(guide) {
  // Exakter Name zuerst, dann Teilstueck -- siehe command-match.js.
  return findCommands(state.commands, guide.befehle);
}

/* ---------- Darstellung ---------- */

export function renderAssistant() {
  const container = $("#assistant-body");
  if (!container) return;

  if (assistantState.leitfaden) {
    container.innerHTML = renderAssistantGuide();
    return;
  }

  const knoten = ASSISTANT_TREE[assistantState.knoten] || ASSISTANT_TREE.start;
  const pfad = assistantState.pfad.length
    ? `<p class="assistant-path">${assistantState.pfad.map(escapeHtml).join(" › ")}</p>`
    : "";

  const freitext = assistantState.knoten === "start" ? `
    <div class="assistant-free">
      <label for="assistant-text">Was sagt der Benutzer? In eigenen Worten beschreiben</label>
      <input id="assistant-text" type="search" autocomplete="off"
             placeholder="z. B. Outlook fragt ständig nach dem Passwort"
             value="${escapeHtml(assistantState.text)}">
      <div id="assistant-matches" class="assistant-matches"></div>
    </div>
    <p class="assistant-or">oder Schritt für Schritt eingrenzen:</p>` : "";

  container.innerHTML = `
    ${freitext}
    ${pfad}
    <h4 class="assistant-question">${escapeHtml(knoten.frage)}</h4>
    <div class="assistant-options">
      ${knoten.optionen.map((option, index) => `
        <button class="assistant-option" type="button" data-assistant-option="${index}">
          ${escapeHtml(option.text)}
        </button>`).join("")}
    </div>
    ${assistantState.pfad.length
      ? `<div class="assistant-nav">
           <button class="btn-link" type="button" data-assistant-back>← Zurück</button>
           <button class="btn-link" type="button" data-assistant-reset>Von vorn beginnen</button>
         </div>`
      : ""}`;

  if (assistantState.knoten === "start") renderAssistantMatches();
}

export function renderAssistantMatches() {
  const box = document.querySelector("#assistant-matches");
  if (!box) return;
  const text = assistantState.text.trim();
  if (text.length < 3) {
    box.innerHTML = "";
    return;
  }

  const treffer = matchAssistant(text);
  if (!treffer.length) {
    box.innerHTML = `<p class="muted">Nichts Passendes erkannt. Grenze das Problem unten
      Schritt für Schritt ein oder formuliere anders (z. B. Gerät + Symptom).</p>`;
    // Wissensluecke festhalten -- gedrosselt, damit keine Wortfragmente landen.
    reportSearchMiss(text, "solutions");
    return;
  }

  box.innerHTML = treffer.map((item) => {
    if (item.art === "leitfaden") {
      const guide = ASSISTANT_GUIDES[item.id];
      return `
        <button class="assistant-match" type="button" data-assistant-guide="${escapeHtml(item.id)}">
          <span class="assistant-kind ${guide.dringend ? "urgent" : ""}">${guide.dringend ? "Dringend" : "Leitfaden"}</span>
          <span>${escapeHtml(guide.titel)}</span>
        </button>`;
    }
    const solution = state.solutions.find((entry) => entry.id === item.id);
    return `
      <button class="assistant-match" type="button" data-assistant-solution-open="${solution.id}">
        <span class="assistant-kind solution">Lösung</span>
        <span>${escapeHtml(solution.title)}</span>
      </button>`;
  }).join("");
}

export function renderAssistantGuide() {
  const guide = ASSISTANT_GUIDES[assistantState.leitfaden];
  const loesungen = solutionsForGuide(guide);
  const befehle = commandsForGuide(guide);
  const offen = state.cases.find((item) => item.status === "open");
  const pfad = assistantState.pfad.length
    ? `<p class="assistant-path">${assistantState.pfad.map(escapeHtml).join(" › ")}</p>`
    : "";

  const liste = (titel, inhalt) => inhalt ? `
    <section class="assistant-section">
      <h5>${titel}</h5>
      ${inhalt}
    </section>` : "";

  const ausgang = assistantState.ausgang === "offen" ? `
    <div class="notice">
      <strong>Nicht gelöst – so geht es weiter:</strong>
      ${escapeHtml(guide.eskalation || "Mit Fehlerbild, durchgeführten Schritten und Zeitpunkt an die nächste Stufe eskalieren.")}
      <div class="card-actions">
        <button class="btn-tool" type="button" data-assistant-escalate>Eskalationsstufen ansehen</button>
        <button class="btn-tool" type="button" data-assistant-generator="escalation">Eskalationstext erstellen</button>
        <button class="btn-link" type="button" data-assistant-new-solution>Später gelöst? Lösung eintragen</button>
      </div>
    </div>` : assistantState.ausgang === "geloest" ? `
    <div class="notice success">
      Prima! Soll der Abschluss gleich als Tickettext entstehen?
      <div class="card-actions">
        <button class="btn-tool" type="button" data-assistant-generator="solution">Abschlusstext erstellen</button>
      </div>
    </div>` : "";

  return `
    ${pfad}
    <div class="assistant-guide-head">
      <h4 class="assistant-question">${escapeHtml(guide.titel)}</h4>
      ${guide.dringend ? '<span class="badge risk-badge risk-high">Dringend</span>' : ""}
    </div>
    ${guide.dringend ? `<div class="notice danger-notice">${escapeHtml(guide.eskalation || "Sofort handeln und eskalieren.")}</div>` : ""}
    ${liste("Erst nachfragen", guide.fragen?.length
      ? `<ul class="assistant-questions">${guide.fragen.map((frage) => `<li>${escapeHtml(frage)}</li>`).join("")}</ul>`
      : "")}
    ${liste("Schritte – abhaken, was erledigt ist", `
      <div class="checklist assistant-steps">
        ${guide.schritte.map((schritt, index) => `
          <label class="checklist-item">
            <input type="checkbox" data-assistant-step="${index}">
            <span>${escapeHtml(schritt)}</span>
          </label>`).join("")}
      </div>`)}
    ${liste("Passende Lösungen aus der Wissensbasis", loesungen.length
      ? `<div class="assistant-solutions">${loesungen.map(assistantSolutionCard).join("")}</div>`
      : "")}
    ${liste("Hilfreiche Befehle", befehle.length
      ? renderCommandRows({
        commands: befehle, attribute: "data-assistant-command", escapeHtml, limit: 6,
      })
      : "")}
    ${!guide.dringend && guide.eskalation && assistantState.ausgang !== "offen"
      ? `<p class="assistant-escalation-hint"><strong>Eskalation:</strong> ${escapeHtml(guide.eskalation)}</p>`
      : ""}
    ${ausgang}
    <div class="assistant-actions">
      <button class="btn-primary" type="button" data-assistant-outcome="geloest">Gelöst</button>
      <button class="btn-cancel" type="button" data-assistant-outcome="offen">Nicht gelöst</button>
      <button class="btn-tool" type="button" data-assistant-generator="progress">In Ticket-Generator übernehmen</button>
      ${offen ? `<button class="btn-tool" type="button" data-assistant-case>Zu ${escapeHtml(offen.ticket_ref)} hinzufügen</button>` : ""}
    </div>
    <div class="assistant-nav">
      <button class="btn-link" type="button" data-assistant-back>← Zurück</button>
      <button class="btn-link" type="button" data-assistant-reset>Von vorn beginnen</button>
    </div>`;
}

/**
 * Eine Loesung im Leitfaden: zugeklappt mit Kopierknopf, aufgeklappt mit
 * Symptom, Ursache und Loesungsweg -- wie in der Loesungsliste, damit man vor
 * dem Kopieren pruefen kann, ob es wirklich passt.
 */
export function assistantSolutionCard(solution) {
  const color = commandCategoryColor(solution.category);
  const severity = SEVERITY_LABELS[solution.severity] || solution.severity;
  return `
    <details class="card category-card assistant-solution" style="--category-color:${color}"
             data-assistant-solution-card="${solution.id}">
      <summary>
        <div class="summary-main">
          <span class="badge category-badge">${escapeHtml(solution.category)}</span>
          <span class="summary-title">${escapeHtml(solution.title)}</span>
        </div>
        ${severity ? `<span class="summary-meta">
          <span class="badge risk-badge risk-${escapeHtml(solution.severity)}">${escapeHtml(severity)}</span>
        </span>` : ""}
        ${rowCopyButton("data-assistant-solution", solution.id, "Lösungsweg kopieren")}
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
          <button class="primary" type="button" data-assistant-solution="${solution.id}">Lösungsweg kopieren</button>
          <button type="button" data-assistant-helpful="${solution.id}">Hat geholfen</button>
        </div>
      </div>
    </details>`;
}

/* ---------- Bedienung ---------- */

export function chooseAssistantOption(index) {
  const knoten = ASSISTANT_TREE[assistantState.knoten];
  const option = knoten?.optionen[index];
  if (!option) return;

  assistantState.pfad.push(option.text);
  if (option.ziel) {
    assistantState.knoten = option.ziel;
  } else if (option.leitfaden) {
    openAssistantGuide(option.leitfaden, { pfadBehalten: true });
    return;
  }
  renderAssistant();
}

export function openAssistantGuide(id, { pfadBehalten = false } = {}) {
  if (!ASSISTANT_GUIDES[id]) return;
  if (!pfadBehalten) assistantState.pfad = [];
  assistantState.leitfaden = id;
  assistantState.ausgang = null;
  renderAssistant();
  $("#assistant-body").scrollIntoView({ block: "start", behavior: "smooth" });
}

export function assistantBack() {
  if (assistantState.leitfaden) {
    assistantState.leitfaden = null;
    assistantState.ausgang = null;
    assistantState.pfad.pop();
    // Ohne Pfad kam man ueber den Freitext: zurueck zum Anfang.
    if (!assistantState.pfad.length) assistantState.knoten = "start";
    renderAssistant();
    return;
  }
  // Den Knoten suchen, aus dem der aktuelle erreicht wurde.
  const eltern = Object.keys(ASSISTANT_TREE).find((key) =>
    ASSISTANT_TREE[key].optionen.some((option) => option.ziel === assistantState.knoten));
  assistantState.knoten = eltern || "start";
  assistantState.pfad.pop();
  renderAssistant();
}

export function resetAssistant() {
  assistantState.knoten = "start";
  assistantState.pfad = [];
  assistantState.leitfaden = null;
  assistantState.ausgang = null;
  assistantState.text = "";
  renderAssistant();
  document.querySelector("#assistant-text")?.focus();
}

/** Die abgehakten Schritte des offenen Leitfadens als Textzeilen. */
export function assistantCheckedSteps() {
  const guide = ASSISTANT_GUIDES[assistantState.leitfaden];
  return $$("#assistant-body [data-assistant-step]")
    .filter((box) => box.checked)
    .map((box) => guide.schritte[Number(box.dataset.assistantStep)]);
}

/** Uebergibt Fehlerbild und erledigte Schritte an den Ticket-Generator. */
export async function assistantToGenerator(mode) {
  const guide = ASSISTANT_GUIDES[assistantState.leitfaden];
  const schritte = assistantCheckedSteps();
  const offen = state.cases.find((item) => item.status === "open");
  const beschreibung = [assistantState.text.trim(), guide.titel].filter(Boolean);

  // Angefangenen Text im Generator nicht stillschweigend ueberschreiben.
  const vorhanden = $("#gen-issue").value.trim() || $("#gen-steps").value.trim();
  if (vorhanden && !confirm("Im Ticket-Generator steht schon Text. Fehlerbild und Schritte ersetzen?")) return;

  $("#gen-mode").value = mode;
  $("#gen-issue").value = [...new Set(beschreibung)].join("\n");
  $("#gen-steps").value = schritte.map((schritt) => `- ${schritt}`).join("\n");
  if (offen && !$("#gen-ticket").value) $("#gen-ticket").value = offen.ticket_ref;
  if (mode === "escalation" && guide.eskalation && !$("#gen-request").value) {
    $("#gen-request").value = guide.eskalation;
  }
  await switchView("generator");
  showToast("Fehlerbild und Schritte übernommen.");
}

export async function assistantToCase() {
  const guide = ASSISTANT_GUIDES[assistantState.leitfaden];
  const offen = state.cases.find((item) => item.status === "open");
  if (!offen) return;
  const schritte = assistantCheckedSteps();
  await api(`/api/cases/${offen.id}/entries`, {
    method: "POST",
    body: JSON.stringify({
      kind: "note",
      label: `Assistent: ${guide.titel}`,
      detail: schritte.length ? schritte.map((schritt) => `- ${schritt}`).join("\n") : null,
    }),
  });
  showToast(`Zu ${offen.ticket_ref} hinzugefügt.`);
}

// --- Symptom-Assistent ----------------------------------------------------
$("#assistant-body").addEventListener("click", (event) => {
  // Einzelnen Befehl aus einem Schritt einer aufgeklappten Loesung kopieren.
  const stepCopy = event.target.closest("[data-copy-step]");
  if (stepCopy) {
    copyText(stepCopy.dataset.copyStep).catch((error) => alert(error.message));
    return;
  }

  const helpful = event.target.closest("[data-assistant-helpful]");
  if (helpful) {
    countContentUsage("solution", Number(helpful.dataset.assistantHelpful), true);
    showToast("Danke -- das hilft bei der Pflege der Wissensbasis.");
    return;
  }

  const option = event.target.closest("[data-assistant-option]");
  if (option) {
    chooseAssistantOption(Number(option.dataset.assistantOption));
    return;
  }

  const guideButton = event.target.closest("[data-assistant-guide]");
  if (guideButton) {
    openAssistantGuide(guideButton.dataset.assistantGuide);
    return;
  }

  if (event.target.closest("[data-assistant-reset]")) {
    resetAssistant();
    return;
  }

  if (event.target.closest("[data-assistant-back]")) {
    assistantBack();
    return;
  }

  if (event.target.closest("[data-assistant-escalate]")) {
    switchView("escalation");
    return;
  }

  const outcome = event.target.closest("[data-assistant-outcome]");
  if (outcome) {
    assistantState.ausgang = outcome.dataset.assistantOutcome;
    if (assistantState.ausgang === "offen") {
      // Ungeloeste Leitfaeden landen bei den Wissensluecken in der Statistik.
      reportSearchMiss(`assistent: ${ASSISTANT_GUIDES[assistantState.leitfaden].titel}`, "solutions");
    }
    const erledigt = $$("#assistant-body [data-assistant-step]").map((box) => box.checked);
    const aufgeklappt = $$("#assistant-body [data-assistant-solution-card]")
      .filter((card) => card.open)
      .map((card) => card.dataset.assistantSolutionCard);
    const loesungsHaken = $$("#assistant-body [data-solution-steps] input")
      .map((box) => box.checked);
    renderAssistant();
    // Haken und aufgeklappte Loesungen beim Neuzeichnen nicht verlieren.
    $$("#assistant-body [data-assistant-step]").forEach((box, index) => {
      box.checked = Boolean(erledigt[index]);
    });
    $$("#assistant-body [data-assistant-solution-card]").forEach((card) => {
      card.open = aufgeklappt.includes(card.dataset.assistantSolutionCard);
    });
    $$("#assistant-body [data-solution-steps] input").forEach((box, index) => {
      box.checked = Boolean(loesungsHaken[index]);
    });
    return;
  }

  const generator = event.target.closest("[data-assistant-generator]");
  if (generator) {
    assistantToGenerator(generator.dataset.assistantGenerator).catch((error) => alert(error.message));
    return;
  }

  if (event.target.closest("[data-assistant-case]")) {
    assistantToCase().catch((error) => alert(error.message));
    return;
  }

  if (event.target.closest("[data-assistant-new-solution]")) {
    const guide = ASSISTANT_GUIDES[assistantState.leitfaden];
    openSolutionDialog();
    $("#solution-title").value = guide.titel;
    $("#solution-symptom").value = assistantState.text.trim();
    $("#solution-steps").value = assistantCheckedSteps().map((schritt, index) => `${index + 1}. ${schritt}`).join("\n");
    return;
  }

  const command = event.target.closest("[data-assistant-command]");
  if (command) {
    const entry = state.commands.find((item) => item.id === Number(command.dataset.assistantCommand));
    if (entry) copyCommand(entry).catch((error) => alert(error.message));
    return;
  }

  // Treffer aus dem Freitext: Loesung in der Loesungsliste aufgeklappt zeigen.
  const openSolution = event.target.closest("[data-assistant-solution-open]");
  if (openSolution) {
    const solution = state.solutions.find((item) => item.id === Number(openSolution.dataset.assistantSolutionOpen));
    if (!solution) return;
    switchView("solutions").then(() => {
      $("#solution-search").value = solution.title;
      renderSolutions();
      const card = document.querySelector("#solutions-list details");
      if (card) card.open = true;
    });
    return;
  }

  const hit = event.target.closest("[data-assistant-solution]");
  if (hit) {
    // Kopierknopf in der zugeklappten Zeile: kopieren, nicht aufklappen.
    if (hit.closest("summary")) event.preventDefault();
    const solution = state.solutions.find((item) => item.id === Number(hit.dataset.assistantSolution));
    if (solution) {
      const guide = ASSISTANT_GUIDES[assistantState.leitfaden];
      copySolution(solution, {
        helpful: true,
        detail: guide ? `Über den Assistenten gefunden (${guide.titel})` : "Über den Assistenten gefunden",
      }).catch((error) => alert(error.message));
    }
  }
});

// Freitext: Treffer bei jeder Eingabe neu berechnen, Enter oeffnet den besten.
$("#assistant-body").addEventListener("input", (event) => {
  if (event.target.id !== "assistant-text") return;
  assistantState.text = event.target.value;
  renderAssistantMatches();
});
