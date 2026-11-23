/*
 * Erklaergrafiken der Schulung, als SVG gezeichnet.
 *
 * Kein Bildmaterial: Die Grafiken bestehen aus Kaesten, Pfeilen und Text,
 * uebernehmen ueber CSS-Klassen (.dg-*) die Farben des gewaehlten Themes und
 * bleiben auf jedem Bildschirm scharf. Gezeichnet wird auf einer festen
 * Breite von 640; die Hoehe richtet sich nach der Grafik.
 *
 * Neue Grafik: Eintrag in DIAGRAMS anlegen und im Modul unter `diagramm`
 * mit dem Schluessel nennen. Texte kurz halten -- SVG bricht nicht um.
 */

const esc = (value) => String(value)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const round = (number) => Math.round(number * 10) / 10;

function svg(height, inner, label) {
  return `<svg class="dg" viewBox="0 0 640 ${height}" role="img" aria-label="${esc(label)}">${inner}</svg>`;
}

function text(x, y, content, cls = "dg-s", anchor = "middle") {
  return `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}">${esc(content)}</text>`;
}

/** Kasten mit mittig gesetzten Zeilen; die erste Zeile ist die Ueberschrift. */
function box(x, y, w, h, lines, cls = "") {
  const lineHeight = 17;
  const first = y + h / 2 - ((lines.length - 1) * lineHeight) / 2 + 4.5;
  const rows = lines.map((line, index) =>
    text(x + w / 2, first + index * lineHeight, line, index === 0 ? "dg-t" : "dg-s"),
  ).join("");
  return `<rect class="dg-box ${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="12"/>${rows}`;
}

/** Pfeil von (x1,y1) nach (x2,y2); die Spitze ist ein eigenes Dreieck. */
function arrow(x1, y1, x2, y2, cls = "") {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const baseX = x2 - 10 * Math.cos(angle);
  const baseY = y2 - 10 * Math.sin(angle);
  const points = [
    [x2, y2],
    [baseX + 5.5 * Math.sin(angle), baseY - 5.5 * Math.cos(angle)],
    [baseX - 5.5 * Math.sin(angle), baseY + 5.5 * Math.cos(angle)],
  ].map(([px, py]) => `${round(px)},${round(py)}`).join(" ");
  return `<line class="dg-line ${cls}" x1="${x1}" y1="${y1}" x2="${round(baseX)}" y2="${round(baseY)}"/>`
    + `<polygon class="dg-head ${cls}" points="${points}"/>`;
}

function dashed(x1, y1, x2, y2) {
  return `<line class="dg-dash" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
}

/** Nummerierter Kreis fuer Reihenfolgen. */
function badge(x, y, number) {
  return `<circle class="dg-num" cx="${x}" cy="${y}" r="11"/>`
    + `<text class="dg-num-t" x="${x}" y="${y + 4.5}" text-anchor="middle">${number}</text>`;
}

/** Vier gleich breite Kaesten nebeneinander mit Pfeilen -- die haeufigste Form. */
function steps(items, y, h, classes = []) {
  const w = 142;
  const xs = [4, 166, 328, 490];
  let inner = "";
  items.forEach((lines, index) => {
    inner += box(xs[index], y, w, h, lines, classes[index] || "");
    if (index < items.length - 1) inner += arrow(xs[index] + w + 3, y + h / 2, xs[index + 1] - 3, y + h / 2);
  });
  return inner;
}

export const DIAGRAMS = {
  /* ---- Fehlersuche ---- */
  eingrenzen() {
    return svg(170, steps([
      ["1 · Zuhören", "Was genau? Seit wann?", "Fehlermeldung wörtlich"],
      ["2 · Eingrenzen", "Wer ist betroffen?", "Was hat sich geändert?"],
      ["3 · Gegentest", "Nur eine Sache ändern,", "Ergebnis beobachten"],
      ["4 · Lösen", "Beheben + notieren,", "Benutzer testen lassen"],
    ], 20, 100, ["primary", "", "", "good"])
      + text(320, 150, "Hilft es nicht? Zurück zu Schritt 2 – mit einer neuen Idee.", "dg-s"),
    "Vier Schritte der Fehlersuche: zuhören, eingrenzen, Gegentest, lösen");
  },

  /* ---- Netzwerk ---- */
  netzweg() {
    return svg(250, ""
      + box(10, 20, 190, 80, ["Dein Rechner", "hat eine IP-Adresse", "= seine Hausnummer"], "primary")
      + box(225, 20, 190, 80, ["Gateway / Router", "die Ausfahrt aus", "dem eigenen Netz"])
      + box(440, 20, 190, 80, ["Server / Internet", "das Ziel, z. B.", "heise.de oder Fileserver"])
      + arrow(203, 60, 222, 60) + arrow(418, 60, 437, 60)
      + dashed(105, 100, 105, 150) + dashed(320, 100, 320, 150) + dashed(535, 100, 535, 150)
      + box(10, 150, 190, 80, ["DHCP", "Hausverwaltung: teilt", "freie Adressen zu"], "good")
      + box(225, 150, 190, 80, ["Firewall / Proxy", "Türsteher: lässt nur", "Erlaubtes durch"], "warn")
      + box(440, 150, 190, 80, ["DNS", "Telefonbuch: macht aus", "Namen eine IP-Adresse"], "accent"),
    "Weg eines Rechners ins Netz: Rechner, Gateway, Server, dazu DHCP, Firewall und DNS");
  },

  /* ---- Anmeldung ---- */
  anmeldung() {
    return svg(290, ""
      + box(10, 20, 190, 80, ["Benutzer", "gibt Passwort ein", "(und ggf. MFA)"], "primary")
      + box(225, 20, 190, 80, ["Domänencontroller", "der Pförtner: prüft", "Passwort und Konto"])
      + box(440, 20, 190, 80, ["Kerberos-Ticket", "Besucherausweis, darauf", "stehen deine Gruppen"], "good")
      + arrow(203, 60, 222, 60) + arrow(418, 60, 437, 60)
      + badge(212, 46, 1) + badge(428, 46, 2)
      + box(225, 170, 190, 80, ["Dateiserver / Ordner", "der Türsteher: ist deine", "Gruppe eingetragen?"], "accent")
      + arrow(535, 104, 418, 176) + badge(488, 128, 3)
      + arrow(222, 212, 95, 104) + badge(148, 162, 4)
      + text(545, 160, "zeigt den Ausweis", "dg-s")
      + text(132, 218, "Zugriff ja / nein", "dg-s")
      + text(320, 278, "Neue Gruppe? Sie steht erst im nächsten Ticket – also neu anmelden.", "dg-s"),
    "Anmeldung: Benutzer, Domänencontroller, Kerberos-Ticket, Dateiserver");
  },

  gruppen() {
    return svg(190, ""
      + box(10, 25, 150, 54, ["Anna", "Vertrieb"])
      + box(10, 100, 150, 54, ["Ben", "Vertrieb"])
      + box(245, 55, 150, 80, ["Gruppe", "„Vertrieb“"], "primary")
      + box(480, 55, 150, 80, ["Ordner", "S:\\Vertrieb"], "good")
      + arrow(163, 52, 242, 82) + arrow(163, 127, 242, 108)
      + arrow(398, 95, 477, 95)
      + text(440, 84, "darf", "dg-s")
      + text(320, 178, "Rechte hängen an Gruppen – nie an einzelnen Personen.", "dg-s"),
    "Anna und Ben sind in der Gruppe Vertrieb, die Gruppe darf auf den Ordner");
  },

  /* ---- Microsoft 365 ---- */
  cloudlokal() {
    return svg(300, ""
      + `<rect class="dg-zone" x="6" y="14" width="270" height="196" rx="16"/>`
      + text(141, 38, "AUF DEINEM RECHNER", "dg-zone-t")
      + box(26, 52, 230, 34, ["Outlook-Programm"])
      + box(26, 94, 230, 34, ["OST-Datei (Zwischenspeicher)"])
      + box(26, 136, 230, 34, ["Teams-App · OneDrive-Ordner"])
      + `<rect class="dg-zone cloud" x="364" y="14" width="270" height="196" rx="16"/>`
      + text(499, 38, "IN DER MICROSOFT-CLOUD", "dg-zone-t")
      + box(384, 52, 230, 34, ["Postfach (Exchange Online)"], "primary")
      + box(384, 94, 230, 34, ["Teams-Dienst · SharePoint"], "primary")
      + box(384, 136, 230, 34, ["Konto + MFA (Entra ID)"], "primary")
      + arrow(279, 112, 361, 112) + arrow(361, 112, 279, 112)
      + text(320, 100, "Internet", "dg-s")
      + box(190, 232, 260, 50, ["Browser: Outlook im Web", "Gegentest ohne den lokalen Teil"], "good")
      + arrow(450, 244, 540, 213),
    "Links die Programme auf dem Rechner, rechts die Dienste in der Cloud, unten der Browser als Gegentest");
  },

  /* ---- Sicherheit ---- */
  anrufpruefung() {
    const w = 108;
    const xs = [2, 134, 266, 398, 530];
    const items = [
      ["Anruf", "will etwas", "ändern"],
      ["Wer ist das?", "Rückruf an", "bekannte Nr."],
      ["Darf er das?", "Rolle und", "Freigabe prüfen"],
      ["Handeln", "nur das", "Nötige tun"],
      ["Notieren", "Ticket mit", "Prüfung"],
    ];
    const cls = ["", "warn", "warn", "good", "good"];
    let inner = "";
    items.forEach((lines, index) => {
      inner += box(xs[index], 14, w, 96, lines, cls[index]);
      if (index < 4) inner += arrow(xs[index] + w + 3, 62, xs[index + 1] - 3, 62);
    });
    inner += `<rect class="dg-box bad" x="2" y="128" width="636" height="46" rx="12"/>`
      + text(320, 149, "Warnsignale", "dg-t")
      + text(320, 166, "Zeitdruck · Drohung · „Ich bin der Chef“ · „nur dieses eine Mal“ · private Mailadresse", "dg-s");
    return svg(190, inner, "Prüfung bei Anrufen: wer, darf er, handeln, notieren – mit Warnsignalen");
  },

  phishing() {
    return svg(300, ""
      + `<rect class="dg-box" x="6" y="8" width="420" height="284" rx="14"/>`
      + `<rect class="dg-mailbar" x="6" y="8" width="420" height="34" rx="14"/>`
      + text(22, 30, "Posteingang", "dg-t", "start")
      + text(22, 66, "Von:", "dg-s", "start") + text(62, 66, "IT-Support <hilfe@micros0ft-konto.example>", "dg-t", "start")
      + badge(406, 62, 1)
      + text(22, 94, "Betreff:", "dg-s", "start") + text(78, 94, "DRINGEND: Konto wird in 24 h gesperrt!", "dg-t", "start")
      + badge(406, 90, 2)
      + `<line class="dg-dash" x1="22" y1="108" x2="410" y2="108"/>`
      + text(22, 134, "Sehr geehrter Kunde,", "dg-s", "start")
      + text(22, 154, "wir haben ungewöhnliche Aktivität festgestellt.", "dg-s", "start")
      + text(22, 174, "Bestätigen Sie Ihr Passwort, sonst wird", "dg-s", "start")
      + text(22, 194, "Ihr Konto dauerhaft deaktiviert.", "dg-s", "start")
      + `<rect class="dg-btn" x="22" y="212" width="150" height="34" rx="9"/>`
      + text(97, 234, "Jetzt anmelden", "dg-btn-t")
      + badge(190, 229, 3)
      + text(22, 270, "Anhang: Rechnung_Nr_4711.zip", "dg-s", "start")
      + badge(406, 266, 4)
      + box(446, 8, 190, 62, ["1 Absender", "Domäne wirkt echt,", "ist aber verändert"], "warn")
      + box(446, 80, 190, 62, ["2 Zeitdruck", "Drohung soll zum", "Klicken drängen"], "warn")
      + box(446, 152, 190, 62, ["3 Link prüfen", "Maus darüber: zeigt", "er auf eine andere Seite?"], "warn")
      + box(446, 224, 190, 62, ["4 Anhang", "unerwartet, ZIP", "oder Office mit Makros"], "warn"),
    "Beispiel einer Phishing-Mail mit vier Warnzeichen");
  },

  /* ---- Prioritaeten ---- */
  prio() {
    const cols = ["kann warten", "bald nötig", "sofort, Arbeit steht"];
    const rows = ["ganze Firma / viele", "eine Abteilung", "eine Person"];
    const grid = [
      [["Mittel", "primary"], ["Hoch", "warn"], ["Kritisch", "bad"]],
      [["Niedrig", "good"], ["Mittel", "primary"], ["Hoch", "warn"]],
      [["Niedrig", "good"], ["Niedrig", "good"], ["Mittel", "primary"]],
    ];
    let inner = text(402, 20, "DRINGLICHKEIT →", "dg-zone-t");
    cols.forEach((label, c) => { inner += text(240 + c * 130, 42, label, "dg-s"); });
    rows.forEach((label, r) => {
      inner += text(160, 86 + r * 56, label, "dg-s", "end");
      grid[r].forEach(([name, cls], c) => {
        inner += box(176 + c * 130, 52 + r * 56, 124, 48, [name], cls);
      });
    });
    inner += text(80, 36, "AUSWIRKUNG ↓", "dg-zone-t")
      + text(320, 236, "Auswirkung = wie viele und wie wichtig · Dringlichkeit = wie schnell muss es gehen", "dg-s");
    return svg(256, inner, "Prioritätsmatrix aus Auswirkung und Dringlichkeit");
  },

  /* ---- Tickets ---- */
  ticket() {
    const rows = [
      ["Titel", "Kurz und konkret: Was + wo"],
      ["Wer / Wo", "Name, Gerät, Standort, Erreichbarkeit"],
      ["Was passiert", "Fehlermeldung wörtlich, Screenshot"],
      ["Seit wann / wie viele", "Zeitpunkt, Auswirkung, Umfang"],
      ["Schon versucht", "Schritte und was dabei herauskam"],
      ["Nächster Schritt", "Wer macht was bis wann?"],
    ];
    let inner = "";
    rows.forEach(([label, hint], index) => {
      const y = 8 + index * 52;
      inner += `<rect class="dg-box ${index === 5 ? "good" : ""}" x="6" y="${y}" width="628" height="44" rx="11"/>`
        + badge(30, y + 22, index + 1)
        + text(54, y + 27, label, "dg-t", "start")
        + text(236, y + 27, hint, "dg-s", "start");
    });
    return svg(324, inner, "Aufbau eines guten Tickets in sechs Teilen");
  },

  stufen() {
    return svg(220, ""
      + box(6, 130, 196, 80, ["1st Level", "Annehmen, Standardfälle,", "Passwort, Konto, FAQ"])
      + box(222, 78, 196, 132, ["2nd Level", "Analyse, Befehle, Logs,", "Gegentests, wiederkehrende", "Fehler, Dokumentation"], "primary")
      + box(438, 26, 196, 184, ["3rd Level", "Spezialisten: Server,", "Netzwerk, Sicherheit,", "Hersteller-Support"])
      + arrow(205, 150, 219, 130) + arrow(421, 98, 435, 78)
      + text(122, 118, "eskalieren ↗", "dg-s") + text(335, 66, "eskalieren ↗", "dg-s")
      + `<rect class="dg-tag" x="276" y="190" width="88" height="20" rx="10"/>` + text(320, 204, "dein Team", "dg-tag-t"),
    "Supportstufen: 1st Level, 2nd Level, 3rd Level mit Eskalation nach oben");
  },

  /* ---- Gespraeche ---- */
  gespraech() {
    return svg(170, steps([
      ["Begrüßen", "„Guten Tag, hier ist", "Sam vom IT-Support.“"],
      ["Zuhören", "Ausreden lassen,", "nicht unterbrechen"],
      ["Zusammenfassen", "„Wenn ich Sie richtig", "verstehe, …“"],
      ["Nächster Schritt", "„Ich melde mich", "bis 14 Uhr.“"],
    ], 14, 118, ["primary", "", "", "good"])
      + text(320, 156, "Am Ende immer: Funktioniert es? – gemeinsam testen.", "dg-s"),
    "Gesprächsablauf: begrüßen, zuhören, zusammenfassen, nächster Schritt");
  },

  /* ---- Datenschutz ---- */
  datenampel() {
    const cols = [
      { x: 6, cls: "good", title: "Okay im Ticket", lines: ["Gerätename (PC-0815)", "Fehlermeldung und Code", "Zeitpunkt, Programmversion", "Deine Schritte und Ergebnis"] },
      { x: 219, cls: "warn", title: "Nur wenn nötig", lines: ["Name der Person", "Telefonnummer", "Standort / Abteilung", "Screenshots (vorher prüfen)"] },
      { x: 432, cls: "bad", title: "Niemals ins Ticket", lines: ["Passwörter und PINs", "MFA-Codes, Schlüssel", "Gesundheits-/Personaldaten", "Inhalte privater Mails"] },
    ];
    let inner = "";
    cols.forEach(({ x, cls, title, lines }) => {
      inner += `<rect class="dg-box ${cls}" x="${x}" y="8" width="202" height="190" rx="14"/>`
        + `<circle class="dg-dot ${cls}" cx="${x + 24}" cy="36" r="9"/>`
        + text(x + 42, 41, title, "dg-t", "start");
      lines.forEach((line, index) => {
        inner += text(x + 20, 78 + index * 28, line, "dg-s", "start");
      });
    });
    return svg(212, inner, "Datenampel: was ins Ticket darf, was nur wenn nötig, was nie");
  },

  /* ---- Der Helper ---- */
  apptour() {
    const w = 148;
    const xs = [2, 164, 326, 488];
    const row1 = [
      ["Schnellsuche", "Strg + K: Vorlagen,", "Befehle, Lösungen"],
      ["Symptom-Assistent", "Problem beschreiben,", "Leitfaden folgen"],
      ["Meine Fälle", "schreibt mit, was", "du kopierst"],
      ["Ticket-Generator", "Abschluss, Eskalation,", "Rückfrage"],
    ];
    const row2 = [
      ["Dienstübergabe", "für die nächste", "Schicht"],
      ["Glossar", "Fachwörter", "kurz erklärt"],
      ["IT-Meldungen", "aktuelle Warnungen", "aus mehreren Quellen"],
      ["Schulung", "du bist hier", "★"],
    ];
    let inner = "";
    row1.forEach((lines, index) => { inner += box(xs[index], 10, w, 98, lines, index === 0 ? "primary" : ""); });
    row2.forEach((lines, index) => { inner += box(xs[index], 124, w, 98, lines, index === 3 ? "good" : ""); });
    return svg(236, inner, "Übersicht der Bereiche im Helpdesk-Helper");
  },
};

/** Liefert das SVG zu einem Schluessel oder einen leeren String. */
export function diagram(name) {
  return DIAGRAMS[name] ? DIAGRAMS[name]() : "";
}
