import { GLOSSARY, GLOSSARY_CATEGORIES } from "./glossary-data.js";
import { $, escapeHtml } from "./base.js";
import { foldText } from "./assistant.js";
import { NEWS_SOURCE_COLORS } from "./news.js";
import { switchView } from "./router.js";

/* ============================================================
   Glossar
   ============================================================
   Die Begriffe stehen in glossary-data.js. Gesucht wird in Begriff,
   Abkuerzungen und Erklaerung; Treffer im Begriff selbst stehen vorn.
*/
export function glossarySlug(begriff) {
  return foldText(begriff).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function glossaryLetter(begriff) {
  const first = foldText(begriff).replace(/^[^a-z0-9]+/, "").charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : "#";
}

/** Feste Farbe je Bereich, der Reihe nach vergeben -- keine Doppelten. */
export function glossaryColor(kategorie) {
  const index = Math.max(0, GLOSSARY_CATEGORIES.indexOf(kategorie));
  return NEWS_SOURCE_COLORS[index % NEWS_SOURCE_COLORS.length];
}

export function populateGlossaryCategories() {
  const select = $("#glossary-category");
  if (select.options.length > 1) return;
  select.insertAdjacentHTML("beforeend", GLOSSARY_CATEGORIES.map((kategorie) => {
    const anzahl = GLOSSARY.filter((eintrag) => eintrag.kategorie === kategorie).length;
    return `<option value="${escapeHtml(kategorie)}">${escapeHtml(kategorie)} (${anzahl})</option>`;
  }).join(""));
}

export function filteredGlossary() {
  const suche = foldText($("#glossary-search").value.trim());
  const kategorie = $("#glossary-category").value;

  return GLOSSARY
    .filter((eintrag) => !kategorie || eintrag.kategorie === kategorie)
    .map((eintrag) => {
      if (!suche) return { eintrag, rang: 0 };
      const namen = [eintrag.begriff, ...(eintrag.auch || [])].map(foldText);
      if (namen.some((name) => name === suche)) return { eintrag, rang: 3 };
      if (namen.some((name) => name.startsWith(suche))) return { eintrag, rang: 2 };
      if (namen.some((name) => name.includes(suche))) return { eintrag, rang: 1 };
      if (foldText(`${eintrag.text} ${eintrag.beispiel || ""}`).includes(suche)) return { eintrag, rang: 0.5 };
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => b.rang - a.rang
      || a.eintrag.begriff.localeCompare(b.eintrag.begriff, "de", { sensitivity: "base" }))
    .map((item) => item.eintrag);
}

export function glossaryEntry(eintrag) {
  const color = glossaryColor(eintrag.kategorie);
  const auch = (eintrag.auch || []).filter((name) => name !== eintrag.begriff);
  return `
    <article class="glossary-entry" id="glossar-${glossarySlug(eintrag.begriff)}"
             style="--category-color:${color}">
      <header class="glossary-head">
        <h4>${escapeHtml(eintrag.begriff)}</h4>
        <span class="badge category-badge">${escapeHtml(eintrag.kategorie)}</span>
      </header>
      ${auch.length ? `<p class="glossary-aka">auch: ${auch.map(escapeHtml).join(", ")}</p>` : ""}
      <p class="glossary-text">${escapeHtml(eintrag.text)}</p>
      ${eintrag.beispiel ? `<p class="glossary-example"><strong>Beispiel:</strong> ${escapeHtml(eintrag.beispiel)}</p>` : ""}
      ${eintrag.siehe?.length ? `
        <div class="glossary-see">
          <span>Siehe auch:</span>
          ${eintrag.siehe.map((ziel) => `
            <button class="glossary-chip" type="button" data-glossary-jump="${escapeHtml(ziel)}">${escapeHtml(ziel)}</button>`).join("")}
        </div>` : ""}
    </article>`;
}

export function renderGlossary() {
  populateGlossaryCategories();
  const eintraege = filteredGlossary();
  const suche = $("#glossary-search").value.trim();

  $("#glossary-count").textContent = `${eintraege.length} von ${GLOSSARY.length} Begriffen`;

  if (!eintraege.length) {
    $("#glossary-letters").innerHTML = "";
    $("#glossary-list").innerHTML = `
      <div class="panel muted glossary-empty">
        <p>Zu „${escapeHtml(suche)}“ gibt es noch keinen Eintrag.</p>
        <button class="btn-tool" type="button" data-glossary-missing>Begriff zur Aufnahme vorschlagen</button>
      </div>`;
    return;
  }

  // Bei einer Suche nach Relevanz, sonst alphabetisch mit Buchstabenkoepfen.
  if (suche) {
    $("#glossary-letters").innerHTML = "";
    $("#glossary-list").innerHTML = `<div class="glossary-grid">${eintraege.map(glossaryEntry).join("")}</div>`;
    return;
  }

  const gruppen = new Map();
  eintraege.forEach((eintrag) => {
    const buchstabe = glossaryLetter(eintrag.begriff);
    if (!gruppen.has(buchstabe)) gruppen.set(buchstabe, []);
    gruppen.get(buchstabe).push(eintrag);
  });
  const buchstaben = [...gruppen.keys()].sort((a, b) => (a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b)));

  // "#" fuer Begriffe, die mit einer Ziffer beginnen (z. B. "1st Level").
  $("#glossary-letters").innerHTML = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", ...(gruppen.has("#") ? ["#"] : [])].map((buchstabe) => gruppen.has(buchstabe)
    ? `<button type="button" data-glossary-letter="${buchstabe}">${buchstabe}</button>`
    : `<span aria-hidden="true">${buchstabe}</span>`).join("");

  $("#glossary-list").innerHTML = buchstaben.map((buchstabe) => `
    <section class="glossary-group" id="glossar-buchstabe-${buchstabe}">
      <h3 class="glossary-letter">${buchstabe}</h3>
      <div class="glossary-grid">${gruppen.get(buchstabe).map(glossaryEntry).join("")}</div>
    </section>`).join("");
}

/** Springt zu einem Begriff -- setzt Filter zurueck, falls er verborgen ist. */
export function jumpToGlossaryEntry(begriff) {
  const id = `glossar-${glossarySlug(begriff)}`;
  if (!document.getElementById(id)) {
    $("#glossary-search").value = "";
    $("#glossary-category").value = "";
    renderGlossary();
  }
  const ziel = document.getElementById(id);
  if (!ziel) return;
  ziel.scrollIntoView({ block: "center", behavior: "smooth" });
  ziel.classList.remove("flash");
  // Neu ausloesen, auch wenn derselbe Begriff zweimal angesprungen wird.
  void ziel.offsetWidth;
  ziel.classList.add("flash");
}

$("#glossary-search").addEventListener("input", renderGlossary);

$("#glossary-category").addEventListener("change", renderGlossary);

$("#glossary-list").addEventListener("click", (event) => {
  const jump = event.target.closest("[data-glossary-jump]");
  if (jump) {
    jumpToGlossaryEntry(jump.dataset.glossaryJump);
    return;
  }

  // Fehlender Begriff: als Verbesserungsvorschlag an die Admins.
  if (event.target.closest("[data-glossary-missing]")) {
    const begriff = $("#glossary-search").value.trim();
    switchView("feedback").then(() => {
      $("#feedback-type").value = "improvement";
      $("#feedback-title").value = `Glossar: „${begriff}“ ergänzen`;
      $("#feedback-message").value = `Bitte den Begriff „${begriff}“ ins Glossar aufnehmen.\n\nWo kommt er vor / was ist unklar?\n`;
      $("#feedback-message").focus();
    });
  }
});
