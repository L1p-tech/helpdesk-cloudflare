import { $, $$, escapeHtml, state } from "./base.js";

/**
 * Prueflisten fuer die Diagnose. Bewusst als Reihenfolge gedacht: von der
 * einfachsten und haeufigsten Ursache zur aufwendigsten, damit man die Liste
 * von oben nach unten abarbeiten kann.
 *
 * Die abgehakten Punkte landen im erzeugten Diagnosetext und dokumentieren im
 * Ticket, was bereits geprueft wurde -- das erspart dem 3rd Level Rueckfragen.
 */
export const DIAGNOSTICS = {
  "Netzwerk / Internet": [
    "Kabel bzw. WLAN-Verbindung geprüft",
    "IP-Konfiguration dokumentiert (ipconfig /all)",
    "IP-Adresse plausibel (kein 169.254.x.x)",
    "Gateway erreichbar (ping)",
    "DNS-Auflösung geprüft (nslookup)",
    "Externe Erreichbarkeit geprüft (ping 8.8.8.8)",
    "Netzwerkweg geprüft (tracert)",
    "DNS-Cache geleert (ipconfig /flushdns)",
    "Proxy-Einstellungen geprüft",
    "Netzwerktreiber und Adapterstatus geprüft",
    "Andere Geräte am selben Anschluss getestet",
    "Switch-Port bzw. Dose geprüft",
  ],
  "VPN": [
    "Internetverbindung ohne VPN geprüft",
    "VPN-Client-Version geprüft",
    "Richtiges VPN-Profil ausgewählt",
    "Anmeldedaten geprüft",
    "MFA erfolgreich abgeschlossen",
    "Windows-Updates vollständig installiert",
    "Zertifikat gültig und vorhanden",
    "Neustart durchgeführt",
    "Verbindung aus anderem Netz getestet",
    "VPN-Logs gesichert",
    "Fehlermeldung im Wortlaut dokumentiert",
  ],
  "Drucker": [
    "Drucker eingeschaltet und betriebsbereit",
    "Display auf Fehlermeldung geprüft",
    "Papier und Toner vorhanden",
    "Drucker über Netzwerk erreichbar (ping)",
    "Warteschlange auf hängende Aufträge geprüft",
    "Spooler-Dienst neu gestartet",
    "Treiber und Version geprüft",
    "Richtiger Drucker als Standard gesetzt",
    "Testseite direkt am Gerät gedruckt",
    "Testseite vom Arbeitsplatz gedruckt",
    "Berechtigungen auf die Freigabe geprüft",
    "Anderer Benutzer am selben Gerät getestet",
  ],
  "Windows / Software": [
    "Fehler reproduziert und Schritte notiert",
    "Genauer Wortlaut der Fehlermeldung erfasst",
    "Screenshot der Meldung gesichert",
    "Neustart durchgeführt",
    "Ereignisanzeige zum Zeitpunkt geprüft",
    "Zugehörige Dienste laufen",
    "Windows-Updates geprüft",
    "Anwendungsversion dokumentiert",
    "Reparaturinstallation getestet",
    "Mit anderem Benutzerprofil gegengeprüft",
    "An anderem Gerät gegengeprüft",
    "Freier Speicherplatz geprüft",
  ],
  "Anmeldung / Berechtigung": [
    "Kontostatus geprüft (aktiv, nicht gesperrt)",
    "Kennwort abgelaufen oder gesperrt geprüft",
    "Gruppenmitgliedschaften geprüft (whoami /groups)",
    "Berechtigung auf Ziel-Ressource geprüft",
    "Gruppenrichtlinien aktualisiert (gpupdate /force)",
    "Ab- und Anmeldung durchgeführt",
    "Kerberos-Tickets zurückgesetzt (klist purge)",
    "Gespeicherte Zugangsdaten geprüft (cmdkey /list)",
    "Anmeldung an anderem Gerät getestet",
    "Domänenverbindung geprüft",
    "Replikationszeit berücksichtigt",
  ],
  "Hardware": [
    "Kabel und Stromversorgung geprüft",
    "Gerät an anderem Anschluss getestet",
    "Hard-Reset durchgeführt",
    "Geräte-Manager auf Fehler geprüft",
    "Treiber und Firmware auf aktuellem Stand",
    "Herstellerdiagnose durchgeführt",
    "Komponente an anderem Gerät gegengeprüft",
    "Ersatzgerät getestet",
    "Seriennummer und Inventarnummer dokumentiert",
    "Garantiestatus geprüft",
    "Auffällige Geräusche oder Gerüche notiert",
  ],
  "E-Mail / Outlook": [
    "Anmeldung in Outlook Web geprüft",
    "Postfachgröße geprüft",
    "Offline-Modus ausgeschlossen",
    "Betroffene Absender oder Empfänger notiert",
    "Quarantäne geprüft",
    "Regeln und Weiterleitungen geprüft",
    "OST-Datei bzw. Profil neu aufgebaut",
    "Berechtigungen auf freigegebene Postfächer geprüft",
    "Kalenderfreigaben geprüft",
    "Sende- und Empfangsprotokoll ausgewertet",
  ],
  "Microsoft 365 / Teams": [
    "Anmeldung im Browser geprüft",
    "Lizenz zugewiesen und aktiv",
    "Zwischenspeicher der App geleert",
    "App-Version aktuell",
    "Abmeldung und Neuanmeldung durchgeführt",
    "Dienststatus bei Microsoft geprüft",
    "Berechtigungen auf Team oder Seite geprüft",
    "Auch im Browser reproduzierbar",
  ],
  "Konto / MFA": [
    "Betroffene Anmeldemethode ermittelt",
    "Uhrzeit auf dem Mobilgerät geprüft",
    "Authenticator-App aktuell",
    "Alternative Anmeldemethode hinterlegt",
    "Gerätewechsel als Ursache geprüft",
    "MFA-Zurücksetzung angestoßen",
    "Anmeldeprotokoll auf Blockierungen geprüft",
    "Benutzer über Neueinrichtung informiert",
  ],
  "Leistung / Geschwindigkeit": [
    "Betroffene Anwendung oder gesamtes System eingegrenzt",
    "Laufzeit seit letztem Neustart geprüft",
    "Auslastung von CPU, RAM und Datenträger geprüft",
    "Speicherfresser im Task-Manager identifiziert",
    "Freier Speicherplatz auf C geprüft",
    "Autostart-Programme geprüft",
    "Virenscan durchgeführt",
    "Energieplan geprüft",
    "Netzlaufwerke als Ursache ausgeschlossen",
    "Alter und Ausstattung des Geräts berücksichtigt",
  ],
  "Dateien / Freigaben": [
    "Genauer Pfad dokumentiert",
    "Netzlaufwerk verbunden und erreichbar",
    "Berechtigungen auf Ordner und Freigabe geprüft",
    "Datei durch anderen Benutzer gesperrt",
    "Speicherplatz auf dem Server geprüft",
    "Versionsverlauf oder Sicherung geprüft",
    "Zugriff von anderem Gerät getestet",
    "Pfadlänge unter 260 Zeichen",
  ],
  "Mobilgerät": [
    "Gerätemodell und Betriebssystemversion notiert",
    "Mobilfunk- oder WLAN-Verbindung geprüft",
    "Datenvolumen geprüft",
    "Neustart durchgeführt",
    "App-Updates installiert",
    "Geräteverwaltung zeigt Gerät als konform",
    "Firmenprofil vorhanden",
    "SIM-Karte und PIN geprüft",
  ],
};

export function renderDiagnosticChecklist() {
  const selectedType = $("#diag-type").value;
  const items = DIAGNOSTICS[selectedType] || [];
  $("#diag-checklist").innerHTML = items.map((item, index) => `
    <label class="checklist-item">
      <input type="checkbox" value="${escapeHtml(item)}" id="diag-step-${index}">
      <span>${escapeHtml(item)}</span>
    </label>
  `).join("");
}

export function initializeDiagnostics() {
  $("#diag-type").innerHTML = Object.keys(DIAGNOSTICS)
    .map((name) => `<option>${escapeHtml(name)}</option>`)
    .join("");
  renderDiagnosticChecklist();
}

export function generateDiagnosticText() {
  const selectedSteps = [...$("#diag-checklist").querySelectorAll("input:checked")]
    .map((input) => `✓ ${input.value}`);

  const lines = [
    `Diagnose: ${$("#diag-type").value}`,
    $("#diag-ticket").value.trim() ? `Ticket: ${$("#diag-ticket").value.trim()}` : "",
    $("#diag-user").value.trim() ? `Benutzer: ${$("#diag-user").value.trim()}` : "",
    $("#diag-device").value.trim() ? `Gerät: ${$("#diag-device").value.trim()}` : "",
    "",
    "Durchgeführte Prüfungen:",
    selectedSteps.length ? selectedSteps.join("\n") : "- Keine Prüfschritte ausgewählt",
    "",
    "Notizen / Ergebnisse:",
    $("#diag-notes").value.trim() || "- Keine zusätzlichen Notizen",
    "",
    `Bearbeitet von: ${state.settings.signatureName || state.user.displayName}`,
  ].filter((line, index, values) => line !== "" || values[index - 1] !== "");

  $("#diag-output").textContent = lines.join("\n");
}

export function resetDiagnostics() {
  $("#diag-checklist").querySelectorAll("input").forEach((input) => {
    input.checked = false;
  });
  ["#diag-user", "#diag-device", "#diag-ticket", "#diag-notes"].forEach((selector) => {
    $(selector).value = "";
  });
  $("#diag-output").textContent = "Noch kein Text erzeugt.";
}

export function fieldValue(selector, fallback = "-") {
  return $(selector).value.trim() || fallback;
}

/** Nimmt nur ausgefuellte Felder auf -- leere Zeilen blaehen den Text nur auf. */
export function optionalLine(label, selector) {
  const value = $(selector).value.trim();
  return value ? `${label}: ${value}` : null;
}

/** Mehrzeiliger Abschnitt, ebenfalls nur wenn befuellt. */
export function optionalBlock(label, selector) {
  const value = $(selector).value.trim();
  return value ? `${label}:\n${value}` : null;
}

/**
 * Baut den Tickettext aus den Formularfeldern.
 *
 * Aufbau: Kopfdaten, dann Fehlerbild und Schritte, dann ein je nach Textart
 * unterschiedlicher Teil. Leere Felder werden ausgelassen, damit der Text auch
 * bei schnell erfassten Tickets sauber bleibt.
 */
export function generateTicketText() {
  const mode = $("#gen-mode").value;
  const MODE_TITLES = {
    solution: "LÖSUNG / ABSCHLUSS",
    progress: "ZWISCHENSTAND",
    escalation: "ESKALATION AN 3RD LEVEL",
    handover: "ÜBERGABE AN KOLLEGEN",
    callback: "RÜCKFRAGE AN BENUTZER",
    external: "WEITERGABE AN HERSTELLER",
    onsite: "VOR-ORT-EINSATZ",
    documentation: "DOKUMENTATION",
  };

  const header = [
    MODE_TITLES[mode] || "TICKET",
    "".padEnd((MODE_TITLES[mode] || "TICKET").length, "="),
    "",
    `Ticket: ${fieldValue("#gen-ticket")}`,
    `Priorität: ${fieldValue("#gen-priority")}`,
    `Benutzer: ${fieldValue("#gen-user")}`,
    optionalLine("Standort / Abteilung", "#gen-location"),
    `Gerät: ${fieldValue("#gen-device")}`,
    optionalLine("Inventar- / Seriennummer", "#gen-asset"),
    optionalLine("Betroffene Benutzer/Systeme", "#gen-affected"),
    `Auswirkung: ${fieldValue("#gen-impact")}`,
    optionalLine("Problem besteht seit", "#gen-since"),
    optionalLine("Erreichbarkeit", "#gen-contact"),
  ].filter(Boolean);

  const situation = [
    "",
    `Fehlerbild / Auswirkungen:\n${fieldValue("#gen-issue")}`,
    "",
    `Durchgeführte Schritte:\n${fieldValue("#gen-steps")}`,
    "",
    `Arbeit weiterhin möglich: ${fieldValue("#gen-workaround-state")}`,
    optionalBlock("Behelfslösung", "#gen-workaround"),
  ].filter((line) => line !== null);

  // Je Textart nur die Bloecke, die dort auch gebraucht werden.
  const BY_MODE = {
    escalation: () => [
      `Aktuelles Ergebnis / offene Frage:\n${fieldValue("#gen-result")}`,
      `Zielteam: ${fieldValue("#gen-team")}`,
      `Reproduzierbar: ${fieldValue("#gen-repro")}`,
      optionalBlock("Reproduktionsschritte", "#gen-reprosteps"),
      optionalBlock("Logs / Fehlercodes / Zeitstempel", "#gen-logs"),
      optionalBlock("Konkrete Frage an den 3rd Level", "#gen-request"),
      optionalBlock("Nächste Schritte", "#gen-next"),
    ],
    handover: () => [
      `Aktueller Stand:\n${fieldValue("#gen-result")}`,
      `Übergabe an: ${fieldValue("#gen-team")}`,
      optionalBlock("Logs / Fehlercodes / Zeitstempel", "#gen-logs"),
      optionalBlock("Was noch zu tun ist", "#gen-next"),
      optionalBlock("Hinweise für den Kollegen", "#gen-request"),
    ],
    external: () => [
      `Aktueller Stand:\n${fieldValue("#gen-result")}`,
      `Hersteller / Partner: ${fieldValue("#gen-team")}`,
      `Reproduzierbar: ${fieldValue("#gen-repro")}`,
      optionalBlock("Reproduktionsschritte", "#gen-reprosteps"),
      optionalBlock("Logs / Fehlercodes / Zeitstempel", "#gen-logs"),
      optionalBlock("Anliegen an den Hersteller", "#gen-request"),
      optionalBlock("Nächste Schritte", "#gen-next"),
    ],
    callback: () => [
      `Offene Rückfrage:\n${fieldValue("#gen-request")}`,
      optionalBlock("Bisheriger Stand", "#gen-result"),
      "",
      "Das Ticket bleibt bis zur Rückmeldung des Benutzers geöffnet.",
    ],
    onsite: () => [
      `Ergebnis vor Ort:\n${fieldValue("#gen-result")}`,
      optionalBlock("Nächste Schritte", "#gen-next"),
    ],
    progress: () => [
      `Aktueller Zwischenstand:\n${fieldValue("#gen-result")}`,
      optionalBlock("Logs / Fehlercodes / Zeitstempel", "#gen-logs"),
      optionalBlock("Nächste Schritte", "#gen-next"),
      "",
      "Das Ticket bleibt bis zur weiteren Klärung geöffnet.",
    ],
    documentation: () => [
      optionalBlock("Beobachtung / Ergebnis", "#gen-result"),
      optionalBlock("Logs / Fehlercodes / Zeitstempel", "#gen-logs"),
      optionalBlock("Nächste Schritte", "#gen-next"),
    ],
    solution: () => [
      `Ergebnis / Lösung:\n${fieldValue("#gen-result")}`,
      optionalBlock("Ursache", "#gen-logs"),
      optionalBlock("Hinweis für den Benutzer", "#gen-request"),
      "",
      "Das Anliegen wurde gelöst und kann abgeschlossen werden.",
    ],
  };

  const specific = (BY_MODE[mode] || BY_MODE.solution)()
    .filter(Boolean)
    .flatMap((block) => ["", block]);

  $("#gen-output").textContent = [
    ...header,
    ...situation,
    ...specific,
    "",
    `Bearbeitet von: ${state.settings.signatureName || state.user.displayName}`,
  ].join("\n");
}

export function clearGenerator() {
  // Alle Eingabefelder des Generators auf einmal leeren. Bewusst ueber das
  // id-Praefix statt ueber eine gepflegte Liste -- so werden neue Felder
  // automatisch mit zurueckgesetzt.
  $$("#view-generator input, #view-generator textarea").forEach((field) => {
    field.value = "";
  });

  // Auswahlfelder auf ihren jeweiligen Standard (erste bzw. sinnvolle Option).
  $("#gen-mode").value = "solution";
  $("#gen-priority").value = "Normal";
  $("#gen-repro").value = "Unbekannt";
  $("#gen-impact").value = "Einzelner Benutzer";
  $("#gen-workaround-state").value = "Ja, ohne Einschränkung";
  $("#gen-output").textContent = "Noch kein Text erzeugt.";
}

$("#diag-type").addEventListener("change", renderDiagnosticChecklist);

$("#diag-generate-button").addEventListener("click", generateDiagnosticText);

$("#diag-reset-button").addEventListener("click", resetDiagnostics);

$("#gen-create-button").addEventListener("click", generateTicketText);

$("#gen-clear-button").addEventListener("click", clearGenerator);

initializeDiagnostics();
