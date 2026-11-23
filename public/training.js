/*
 * Schulung: Oberflaeche.
 *
 * Zeigt die Lernmodule aus training-data.js an und speichert den Fortschritt
 * ueber /api/training. Abhaengigkeiten von der Anwendung kommen von aussen
 * (wie bei notifications.js), damit diese Datei ohne app.js testbar bleibt.
 *
 * Der Bereich hat eigene Adressen: #/schulung zeigt die Uebersicht,
 * #/schulung/<modul> ein einzelnes Modul. Zurueck und Neuladen funktionieren
 * dadurch wie erwartet.
 */
import {
  FIRST_WEEK,
  PASS_PERCENT,
  TRAINING_GROUPS,
  TRAINING_MODULES,
} from "./training-data.js";
import { diagram } from "./training-diagrams.js";
import { findCommands, renderCommandRows } from "./command-match.js";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function shuffle(list) {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

export function createTraining({
  api,
  escapeHtml,
  showToast,
  getCommands,
  copyCommand,
  openGlossary,
  openView,
}) {
  const progress = new Map();
  let loaded = false;
  let quiz = null;

  const root = () => document.querySelector("#training-body");
  const attribute = (value) => escapeHtml(value).replaceAll('"', "&quot;").replaceAll("'", "&#39;");

  /* ---------- Fortschritt ---------- */

  async function load() {
    const data = await api("/api/training");
    progress.clear();
    data.progress.forEach((row) => progress.set(row.item_id, row));
    loaded = true;
  }

  /** Vergisst alles Geladene -- beim Wechsel des Benutzers noetig. */
  function reset() {
    progress.clear();
    loaded = false;
    quiz = null;
  }

  function moduleStatus(id) {
    const row = progress.get(id);
    return {
      done: Boolean(row?.completed_at),
      percent: row?.percent ?? null,
      attempts: row?.attempts ?? 0,
    };
  }

  function summary() {
    const done = TRAINING_MODULES.filter((module) => moduleStatus(module.id).done).length;
    const next = TRAINING_MODULES.find((module) => !moduleStatus(module.id).done) || null;
    return { done, total: TRAINING_MODULES.length, next };
  }

  /* ---------- Text und Bausteine ---------- */

  /** Zeichnet **fett**, `code` und [[Glossarbegriff|Anzeige]] in bereits maskierten Text. */
  function inline(raw) {
    return escapeHtml(raw)
      .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, term, label) =>
        `<button class="glossary-chip" type="button" data-training-glossary="${attribute(term.replaceAll("&amp;", "&"))}">${label || term}</button>`)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
  }

  /** Absaetze und Listen: Zeilen mit "- " werden zu Listenpunkten. */
  function rich(text) {
    return String(text).split(/\n\n+/).map((block) => {
      let html = "";
      let paragraph = [];
      let list = [];
      const flushParagraph = () => {
        if (paragraph.length) html += `<p>${paragraph.map(inline).join("<br>")}</p>`;
        paragraph = [];
      };
      const flushList = () => {
        if (list.length) html += `<ul>${list.map((item) => `<li>${inline(item)}</li>`).join("")}</ul>`;
        list = [];
      };
      block.split("\n").forEach((line) => {
        if (line.startsWith("- ")) {
          flushParagraph();
          list.push(line.slice(2));
        } else {
          flushList();
          paragraph.push(line);
        }
      });
      flushParagraph();
      flushList();
      return html;
    }).join("");
  }

  function icon(name) {
    return `<svg class="ico" aria-hidden="true"><use href="#${name}"/></svg>`;
  }

  function ring(percent, label, size = "") {
    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - Math.min(100, Math.max(0, percent)) / 100);
    return `
      <svg class="tr-ring ${size}" viewBox="0 0 100 100" role="img" aria-label="${attribute(label)}">
        <circle class="tr-ring-bg" cx="50" cy="50" r="${radius}"/>
        <circle class="tr-ring-fg" cx="50" cy="50" r="${radius}"
                stroke-dasharray="${circumference.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"
                transform="rotate(-90 50 50)"/>
        <text x="50" y="57" text-anchor="middle" class="tr-ring-t">${Math.round(percent)} %</text>
      </svg>`;
  }

  function statusChip(id) {
    const { done, percent, attempts } = moduleStatus(id);
    if (done) return `<span class="tr-status done">Bestanden · ${percent ?? 100} %</span>`;
    if (attempts) return `<span class="tr-status retry">Noch nicht bestanden · ${percent ?? 0} %</span>`;
    return '<span class="tr-status new">Neu</span>';
  }

  function findModule(id) {
    return TRAINING_MODULES.find((module) => module.id === id) || null;
  }

  /* ---------- Uebersicht ---------- */

  function checklistState(item) {
    if (item.modul) return moduleStatus(item.modul).done;
    return Boolean(progress.get(item.id)?.completed_at);
  }

  function renderChecklist() {
    const doneCount = FIRST_WEEK.filter(checklistState).length;
    const percent = Math.round((doneCount / FIRST_WEEK.length) * 100);
    return `
      <section class="tr-panel">
        <header class="tr-panel-head">
          <div>
            <h3>Checkliste für die erste Woche</h3>
            <p class="muted">${doneCount} von ${FIRST_WEEK.length} erledigt</p>
          </div>
          <div class="tr-bar" role="progressbar" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100">
            <span style="width:${percent}%"></span>
          </div>
        </header>
        <ul class="tr-checklist">
          ${FIRST_WEEK.map((item) => {
            const done = checklistState(item);
            const auto = Boolean(item.modul);
            return `
              <li class="${done ? "done" : ""}">
                <label>
                  <input type="checkbox" ${done ? "checked" : ""} ${auto ? "disabled" : ""}
                         data-training-check="${attribute(item.id)}">
                  <span>${escapeHtml(item.text)}</span>
                </label>
                ${auto
                  ? `<button class="btn-link" type="button" data-training-open="${attribute(item.modul)}">Zum Modul</button>`
                  : item.ansicht
                    ? `<button class="btn-link" type="button" data-training-view="${attribute(item.ansicht)}">Öffnen</button>`
                    : ""}
              </li>`;
          }).join("")}
        </ul>
      </section>`;
  }

  function moduleCard(module) {
    return `
      <button class="tr-card" type="button" data-training-open="${attribute(module.id)}"
              style="--mod-color:${module.farbe}">
        <span class="tr-card-top">
          <span class="tr-card-icon">${icon(module.icon)}</span>
          <span class="tr-card-nr">Modul ${module.nr}</span>
        </span>
        <strong class="tr-card-title">${escapeHtml(module.titel)}</strong>
        <span class="tr-card-text">${escapeHtml(module.kurz)}</span>
        <span class="tr-card-foot">
          <span class="tr-minutes">${module.minuten} Min.</span>
          ${statusChip(module.id)}
        </span>
      </button>`;
  }

  function renderHome() {
    const { done, total, next } = summary();
    const percent = Math.round((done / total) * 100);
    const allDone = done === total;

    root().innerHTML = `
      <section class="tr-hero">
        ${ring(percent, `${done} von ${total} Modulen bestanden`)}
        <div class="tr-hero-text">
          <h3>${allDone ? "Alle Module bestanden – stark!" : done ? "Du bist auf einem guten Weg" : "Willkommen in der Schulung"}</h3>
          <p>
            ${done} von ${total} Modulen bestanden. Jedes Modul dauert 8 bis 10 Minuten
            und besteht aus Erklärung, Grafik, Quiz und einem Praxisfall.
            Mit ${PASS_PERCENT} % richtigen Antworten ist ein Modul bestanden – du kannst es beliebig oft wiederholen.
          </p>
          ${allDone
            ? ""
            : `<button class="btn-primary" type="button" data-training-open="${attribute(next.id)}">
                 ${done ? "Weiter mit" : "Starten mit"} Modul ${next.nr}: ${escapeHtml(next.titel)}
               </button>`}
        </div>
      </section>

      ${TRAINING_GROUPS.map((group) => `
        <section class="tr-group">
          <header>
            <h3>${escapeHtml(group.titel)}</h3>
            <p class="muted">${escapeHtml(group.text)}</p>
          </header>
          <div class="tr-grid">
            ${TRAINING_MODULES.filter((module) => module.gruppe === group.id).map(moduleCard).join("")}
          </div>
        </section>
        ${/* Die Checkliste gehoert zur Einarbeitung und steht direkt darunter. */""}
        ${group.id === "einarbeitung" ? renderChecklist() : ""}`).join("")}

      <p class="tr-foot">
        Dein Fortschritt gehört nur dir – andere sehen ihn nicht.
        <button class="btn-link" type="button" data-training-reset>Fortschritt zurücksetzen</button>
      </p>`;
  }

  /* ---------- Modul lesen ---------- */

  function renderSection(section, index) {
    return `
      <article class="tr-section">
        <header>
          <span class="tr-section-nr">${index + 1}</span>
          <h3>${escapeHtml(section.titel)}</h3>
        </header>
        ${section.diagramm ? `<div class="dg-wrap">${diagram(section.diagramm)}</div>` : ""}
        <div class="tr-text">${rich(section.text)}</div>
        ${section.vergleich ? `
          <div class="tr-compare">
            <div class="bad"><span>Eher schlecht</span><p>${inline(section.vergleich.schlecht)}</p></div>
            <div class="good"><span>Besser</span><p>${inline(section.vergleich.gut)}</p></div>
          </div>` : ""}
        ${section.merke ? `
          <aside class="tr-merke">
            ${icon("i-bulb")}
            <div><strong>Merke</strong><p>${inline(section.merke)}</p></div>
          </aside>` : ""}
      </article>`;
  }

  function resolveCommands(module) {
    return findCommands(getCommands(), module.befehle);
  }

  function renderTry(module) {
    const commands = resolveCommands(module);
    if (!commands.length) return "";
    return `
      <section class="tr-block" data-training-section="try">
        <h3 class="tr-block-title"><span>Befehle zum Thema (${commands.length})</span></h3>
        <p class="muted">Diese Befehle aus eurer Befehlsliste gehören zum Thema. Ein Klick kopiert sie. „Admin“ heißt: braucht Administratorrechte. Bei „Risiko“ fragt der Helper vor dem Kopieren nach. Probier die harmlosen am besten gleich an einem Testrechner aus.</p>
        ${renderCommandRows({
          commands, attribute: "data-training-copy", escapeHtml, limit: 8,
        })}
      </section>`;
  }

  /* ---------- Quiz ---------- */

  function startQuiz(module) {
    quiz = {
      moduleId: module.id,
      checked: false,
      items: shuffle(module.quiz).map((question) => ({
        question,
        order: shuffle(question.antworten.map((_, index) => index)),
        picked: null,
      })),
    };
  }

  function quizScore() {
    return quiz.items.filter((item) => item.picked === item.question.richtig).length;
  }

  function renderQuizBlock(module) {
    if (!quiz || quiz.moduleId !== module.id) startQuiz(module);
    const answered = quiz.items.filter((item) => item.picked !== null).length;
    const total = quiz.items.length;

    const cards = quiz.items.map((item, qi) => `
      <div class="tr-q">
        <p class="tr-q-text"><span>${qi + 1}</span>${escapeHtml(item.question.frage)}</p>
        <div class="tr-answers">
          ${item.order.map((original, position) => {
            const chosen = item.picked === original;
            let state = chosen ? "chosen" : "";
            if (quiz.checked) {
              if (original === item.question.richtig) state += " right";
              else if (chosen) state += " wrong";
            }
            return `
              <button class="tr-answer ${state}" type="button" ${quiz.checked ? "disabled" : ""}
                      data-training-answer="${qi}:${original}" aria-pressed="${chosen}">
                <span class="tr-letter">${LETTERS[position]}</span>
                <span>${escapeHtml(item.question.antworten[original])}</span>
              </button>`;
          }).join("")}
        </div>
        ${quiz.checked ? `<p class="tr-explain ${item.picked === item.question.richtig ? "ok" : "no"}">
          <strong>${item.picked === item.question.richtig ? "Richtig." : "Nicht ganz."}</strong>
          ${escapeHtml(item.question.erklaerung)}</p>` : ""}
      </div>`).join("");

    let footer;
    if (quiz.checked) {
      const score = quizScore();
      const percent = Math.round((score * 100) / total);
      const passed = percent >= PASS_PERCENT;
      footer = `
        <div class="tr-result ${passed ? "pass" : "fail"}">
          ${ring(percent, `${percent} Prozent`, "small")}
          <div>
            <h4>${passed ? "Bestanden!" : "Noch nicht bestanden"}</h4>
            <p>${score} von ${total} richtig. ${passed
              ? "Dein Ergebnis ist gespeichert."
              : `Mit ${PASS_PERCENT} % ist das Modul bestanden – lies die Erklärungen und versuche es noch einmal.`}</p>
            <button class="btn-tool" type="button" data-training-retry>Quiz wiederholen</button>
          </div>
        </div>`;
    } else {
      footer = `
        <div class="tr-quiz-foot">
          <button class="btn-primary" type="button" data-training-evaluate ${answered === total ? "" : "disabled"}>Auswerten</button>
          <span class="muted">${answered} von ${total} beantwortet</span>
        </div>`;
    }
    return cards + footer;
  }

  /* ---------- Praxisfall ---------- */

  function renderCase(module) {
    const fall = module.fall;
    return `
      <section class="tr-block" data-training-section="case">
        <h3 class="tr-block-title"><span>Praxisfall: ${escapeHtml(fall.titel)}</span></h3>
        <div class="tr-case-situation">${rich(fall.situation)}</div>
        <p class="muted">Was würdest du tun? Du kannst alle Möglichkeiten anklicken und die Rückmeldung lesen.</p>
        <div class="tr-options">
          ${fall.optionen.map((option, index) => `
            <div class="tr-option" data-training-option="${index}">
              <button type="button" data-training-pick="${index}">
                <span class="tr-letter">${LETTERS[index]}</span><span>${escapeHtml(option.text)}</span>
              </button>
              <p class="tr-option-feedback hidden"></p>
            </div>`).join("")}
        </div>
      </section>`;
  }

  /* ---------- Modul ---------- */

  function renderModule(id) {
    const module = findModule(id);
    if (!module) {
      renderHome();
      return;
    }
    const index = TRAINING_MODULES.indexOf(module);
    const next = TRAINING_MODULES[index + 1] || null;
    const commandsAvailable = resolveCommands(module).length > 0;

    root().innerHTML = `
      <div class="tr-reader" style="--mod-color:${module.farbe}">
        <button class="btn-link tr-back" type="button" data-training-home>← Alle Module</button>

        <header class="tr-head">
          <span class="tr-card-icon big">${icon(module.icon)}</span>
          <div>
            <span class="tr-card-nr">Modul ${module.nr} von ${TRAINING_MODULES.length} · ${module.minuten} Min.</span>
            <h3>${escapeHtml(module.titel)}</h3>
            <p>${escapeHtml(module.kurz)}</p>
          </div>
          <span data-training-status>${statusChip(module.id)}</span>
        </header>

        <nav class="tr-steps" aria-label="Abschnitte dieses Moduls">
          <button type="button" data-training-jump="learn">1 · Verstehen</button>
          ${commandsAvailable ? '<button type="button" data-training-jump="try">2 · Ausprobieren</button>' : ""}
          <button type="button" data-training-jump="quiz">${commandsAvailable ? "3" : "2"} · Quiz</button>
          <button type="button" data-training-jump="case">${commandsAvailable ? "4" : "3"} · Praxisfall</button>
        </nav>

        <div data-training-section="learn">
          ${module.abschnitte.map(renderSection).join("")}
          ${module.glossar?.length ? `
            <div class="tr-terms">
              <span>Begriffe aus diesem Modul:</span>
              ${module.glossar.map((term) => `<button class="glossary-chip" type="button" data-training-glossary="${attribute(term)}">${escapeHtml(term)}</button>`).join("")}
            </div>` : ""}
        </div>

        ${renderTry(module)}

        <section class="tr-block" data-training-section="quiz">
          <h3 class="tr-block-title"><span>Quiz</span></h3>
          <p class="muted">${module.quiz.length} Fragen. Die Reihenfolge der Antworten wechselt bei jedem Versuch.</p>
          <div data-training-quiz>${renderQuizBlock(module)}</div>
        </section>

        ${renderCase(module)}

        <footer class="tr-next">
          <button class="btn-tool" type="button" data-training-home>Zur Übersicht</button>
          ${next ? `<button class="btn-primary" type="button" data-training-open="${attribute(next.id)}">Weiter: Modul ${next.nr} – ${escapeHtml(next.titel)}</button>` : ""}
        </footer>
      </div>`;
  }

  /* ---------- Navigation ---------- */

  function moduleFromLocation() {
    const parts = location.hash.replace(/^#\/?/, "").split("/");
    return parts[0] === "schulung" && parts[1] && findModule(parts[1]) ? parts[1] : null;
  }

  async function render() {
    const element = root();
    if (!element) return;

    if (!loaded) {
      element.innerHTML = '<p class="muted">Wird geladen…</p>';
      try {
        await load();
      } catch (error) {
        element.innerHTML = `
          <div class="panel muted">
            <p>Der Fortschritt konnte nicht geladen werden: ${escapeHtml(error.message)}</p>
            <button class="btn-tool" type="button" data-training-retry-load>Erneut versuchen</button>
          </div>`;
        return;
      }
    }

    const id = moduleFromLocation();
    // Unbekanntes Modul in der Adresse (alter Link, Tippfehler): auf die Uebersicht umstellen.
    const parts = location.hash.replace(/^#\/?/, "").split("/");
    if (!id && parts[0] === "schulung" && parts[1]) history.replaceState(null, "", "#/schulung");
    if (id) {
      if (quiz && quiz.moduleId !== id) quiz = null;
      renderModule(id);
    } else {
      quiz = null;
      renderHome();
    }
  }

  function go(hash) {
    if (location.hash !== hash) history.pushState(null, "", hash);
    window.scrollTo({ top: 0 });
    return render();
  }

  function openModule(id) {
    quiz = null;
    return go(`#/schulung/${id}`);
  }

  /* ---------- Aktionen ---------- */

  async function evaluate() {
    if (!quiz || quiz.checked) return;
    const module = findModule(quiz.moduleId);
    if (!module || quiz.items.some((item) => item.picked === null)) return;

    quiz.checked = true;
    const score = quizScore();
    const total = quiz.items.length;
    redrawQuiz(module);
    // Ergebnis zeigen: Die Seite springt nicht von selbst an eine andere Stelle.
    root()?.querySelector("[data-training-quiz]")?.scrollIntoView?.({ block: "start", behavior: "smooth" });

    try {
      const data = await api("/api/training", {
        method: "POST",
        body: JSON.stringify({ kind: "quiz", itemId: module.id, score, total }),
      });
      progress.set(module.id, data.progress);
      const chip = root()?.querySelector("[data-training-status]");
      if (chip) chip.innerHTML = statusChip(module.id);
    } catch (error) {
      showToast(`Ergebnis konnte nicht gespeichert werden: ${error.message}`);
    }
  }

  function redrawQuiz(module) {
    const block = root()?.querySelector("[data-training-quiz]");
    if (block) block.innerHTML = renderQuizBlock(module);
  }

  async function toggleCheck(itemId, done) {
    const before = progress.get(itemId);
    // Sofort anzeigen, bei einem Fehler zurueckrollen.
    if (done) progress.set(itemId, { item_id: itemId, completed_at: new Date().toISOString() });
    else progress.delete(itemId);
    try {
      await api("/api/training", {
        method: "POST",
        body: JSON.stringify({ kind: "check", itemId, done }),
      });
    } catch (error) {
      if (before) progress.set(itemId, before);
      else progress.delete(itemId);
      showToast(error.message);
    }
    if (!moduleFromLocation()) renderHome();
  }

  async function clearProgress() {
    if (!confirm("Deinen gesamten Lernfortschritt zurücksetzen?\n\nQuiz-Ergebnisse und Checkliste werden gelöscht. Das lässt sich nicht rückgängig machen.")) return;
    try {
      await api("/api/training", { method: "DELETE" });
      progress.clear();
      showToast("Fortschritt zurückgesetzt.");
      renderHome();
    } catch (error) {
      showToast(error.message);
    }
  }

  function pickOption(button) {
    const wrapper = button.closest("[data-training-option]");
    const module = findModule(moduleFromLocation());
    if (!wrapper || !module) return;

    const option = module.fall.optionen[Number(button.dataset.trainingPick)];
    const good = Number(button.dataset.trainingPick) === module.fall.beste;
    const feedback = wrapper.querySelector(".tr-option-feedback");
    feedback.innerHTML = `<strong>${good ? "Gute Wahl." : "Besser nicht."}</strong> ${escapeHtml(option.feedback)}`;
    feedback.classList.remove("hidden");
    wrapper.classList.toggle("good", good);
    wrapper.classList.toggle("bad", !good);
  }

  function handleClick(event) {
    const target = event.target;

    const open = target.closest("[data-training-open]");
    if (open) return openModule(open.dataset.trainingOpen);

    if (target.closest("[data-training-home]")) return go("#/schulung");

    const view = target.closest("[data-training-view]");
    if (view) return openView(view.dataset.trainingView);

    const term = target.closest("[data-training-glossary]");
    if (term) return openGlossary(term.dataset.trainingGlossary);

    const jump = target.closest("[data-training-jump]");
    if (jump) {
      root().querySelector(`[data-training-section="${jump.dataset.trainingJump}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return null;
    }

    const copy = target.closest("[data-training-copy]");
    if (copy) {
      const command = getCommands().find((item) => item.id === Number(copy.dataset.trainingCopy));
      if (command) copyCommand(command).catch((error) => showToast(error.message));
      return null;
    }

    const answer = target.closest("[data-training-answer]");
    if (answer && quiz && !quiz.checked) {
      const [question, original] = answer.dataset.trainingAnswer.split(":").map(Number);
      quiz.items[question].picked = original;
      redrawQuiz(findModule(quiz.moduleId));
      // Das Quiz wird neu gezeichnet; ohne diese Zeile ginge der Tastaturfokus
      // verloren und man muesste nach jeder Antwort neu hineintabben.
      root().querySelector(`[data-training-answer="${answer.dataset.trainingAnswer}"]`)?.focus({ preventScroll: true });
      return null;
    }

    if (target.closest("[data-training-evaluate]")) return evaluate();

    if (target.closest("[data-training-retry]") && quiz) {
      const module = findModule(quiz.moduleId);
      startQuiz(module);
      redrawQuiz(module);
      root().querySelector('[data-training-section="quiz"]')
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return null;
    }

    const pick = target.closest("[data-training-pick]");
    if (pick) return pickOption(pick);

    if (target.closest("[data-training-reset]")) return clearProgress();

    if (target.closest("[data-training-retry-load]")) return render();
    return null;
  }

  function handleChange(event) {
    const box = event.target.closest("[data-training-check]");
    if (box) toggleCheck(box.dataset.trainingCheck, box.checked);
  }

  function init() {
    const element = root();
    if (!element) return;
    element.addEventListener("click", (event) => {
      Promise.resolve(handleClick(event)).catch((error) => showToast(error.message));
    });
    element.addEventListener("change", handleChange);
  }

  /* ---------- Karte auf der Startseite ---------- */

  function startCardHtml() {
    const { done, total, next } = summary();
    const percent = Math.round((done / total) * 100);
    return `
      <div class="tr-start">
        ${ring(percent, `${done} von ${total} Modulen bestanden`, "small")}
        <div>
          <p><strong>${done} von ${total}</strong> Modulen bestanden</p>
          ${next
            ? `<button class="btn-tool" type="button" data-start-module="${attribute(next.id)}">${done ? "Weiter mit" : "Starten mit"} Modul ${next.nr}: ${escapeHtml(next.titel)}</button>`
            : '<p class="muted">Alle Module bestanden – stark!</p>'}
        </div>
      </div>`;
  }

  return { init, load, reset, render, openModule, summary, startCardHtml };
}
