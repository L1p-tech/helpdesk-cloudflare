/*
 * Findet einen Befehl der Befehlsliste anhand seines Namens.
 *
 * Schulung und Symptom-Assistent verweisen auf Befehle ueber den Namen, nicht
 * ueber die ID: Die IDs unterscheiden sich je Installation, Namen bleiben
 * stabil. Ein exakter Name hat Vorrang; erst danach zaehlt ein Teilstueck.
 * Ohne den Vorrang wuerde "Erreichbarkeit pruefen" auch "Port-Erreichbarkeit
 * pruefen" treffen, je nach Sortierung den falschen.
 *
 * Gross-/Kleinschreibung und Umlaute spielen keine Rolle.
 */
export function foldName(value) {
  return String(value || "").toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
}

export function findCommand(commands, name) {
  const wanted = foldName(name);
  return commands.find((command) => foldName(command.name) === wanted)
    || commands.find((command) => foldName(command.name).includes(wanted))
    || null;
}

/** Mehrere Namen aufloesen; Unbekanntes und Doppeltes entfaellt. */
export function findCommands(commands, names) {
  const found = [];
  (names || []).forEach((name) => {
    const command = findCommand(commands, name);
    if (command && !found.includes(command)) found.push(command);
  });
  return found;
}

/**
 * Zeigt Befehle als kopierbare Zeilen. Admin- und Risiko-Hinweis stehen
 * direkt am Namen: Wer einen Befehl kopiert, soll vorher sehen, ob er
 * Administratorrechte braucht oder etwas Unumkehrbares tut. Lange Listen
 * zeigen die ersten Eintraege und klappen den Rest ein.
 *
 * `attribute` ist das data-Attribut, an dem der Klick-Handler den Befehl
 * erkennt (Wert: Befehls-ID); `escapeHtml` kommt von aussen.
 */
export function renderCommandRows({ commands, attribute, escapeHtml, limit = 8 }) {
  const flags = (command) => [
    command.requires_admin
      ? '<span class="cmd-flag admin" title="Braucht Administratorrechte">Admin</span>' : "",
    command.risk_level === "high"
      ? '<span class="cmd-flag risk" title="Hohes Risiko – der Helper fragt vor dem Kopieren nach">Risiko</span>'
      : command.risk_level === "medium"
        ? '<span class="cmd-flag care" title="Mit Bedacht einsetzen">Vorsicht</span>' : "",
  ].join("");

  // Anfuehrungszeichen maskieren: Beschreibungen koennen welche enthalten und
  // wuerden das title-Attribut sonst vorzeitig beenden.
  const quoted = (value) => escapeHtml(value).replaceAll('"', "&quot;").replaceAll("'", "&#39;");

  const row = (command) => `
    <button class="assistant-command" type="button" ${attribute}="${Number(command.id)}" title="${quoted(command.description || "Befehl kopieren")}">
      <span class="assistant-command-name">${escapeHtml(command.name)}${flags(command)}</span>
      <code>${escapeHtml(command.command)}</code>
    </button>`;

  // Wegen einem oder zwei Befehlen lohnt kein Einklappen: dann alle zeigen.
  const shown = commands.length - limit <= 2 ? commands.length : limit;
  const rest = commands.slice(shown);
  return `<div class="assistant-commands">${commands.slice(0, shown).map(row).join("")}</div>`
    + (rest.length ? `
      <details class="assistant-more">
        <summary>Weitere ${rest.length} Befehle anzeigen</summary>
        <div class="assistant-commands">${rest.map(row).join("")}</div>
      </details>` : "");
}
