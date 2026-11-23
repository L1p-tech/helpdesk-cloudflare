/*
 * Schulung: Inhalte der Lernmodule.
 *
 * Ziel: IT-Grundlagen so erklaert, dass sie jede und jeder versteht -- mit
 * Alltagsvergleichen, einer Grafik, Befehlen zum Ausprobieren, einem Quiz und
 * einem Praxisfall pro Modul. Verbindliche Vorgaben des eigenen Betriebs
 * (Reaktionszeiten, Pruefverfahren, Meldewege) stehen hier bewusst NICHT; die
 * Texte verweisen darauf, statt sie zu erfinden.
 *
 * Aufbau eines Moduls:
 *   id, nr, titel, kurz, minuten, gruppe, farbe, icon (Symbol aus index.html)
 *   abschnitte  Liste aus { titel, text, diagramm?, merke?, vergleich? }
 *   befehle     Teilstrings von Befehlsnamen aus der Befehlsliste
 *   glossar     Begriffe, die im Glossar stehen muessen (Test prueft das)
 *   quiz        { frage, antworten[], richtig (Index), erklaerung }
 *   fall        { titel, situation, optionen[{ text, feedback }], beste }
 *
 * Auszeichnung im Text (alles andere wird als reiner Text ausgegeben):
 *   **fett**    `Befehl`    Leerzeile = Absatz
 *   [[Glossarbegriff]] oder [[Glossarbegriff|anderer Anzeigetext]]
 *   Zeilen mit "- " am Anfang werden zu einer Liste
 *
 * Die Antworten eines Quiz werden bei jedem Versuch neu gemischt; die
 * Reihenfolge hier ist also egal.
 */

export const TRAINING_GROUPS = [
  {
    id: "einarbeitung",
    titel: "Einarbeitung – die erste Woche",
    text: "Das Wichtigste für den Start. In dieser Reihenfolge am besten.",
  },
  {
    id: "technik",
    titel: "Technik verstehen",
    text: "Was im Hintergrund passiert, wenn „etwas nicht geht“.",
  },
  {
    id: "welt",
    titel: "Microsoft-Welt – wer macht was?",
    text: "Entra ID, Exchange, Intune & Co.: Was die Systeme tun, wo du nachsiehst und wie sie zusammenhängen.",
  },
  {
    id: "alltag",
    titel: "Besser im Alltag",
    text: "Priorisieren, sauber mit Daten umgehen und den IT-Service verstehen.",
  },
];

/** Mindestanteil richtiger Antworten zum Bestehen -- gleicher Wert wie im Worker. */
export const PASS_PERCENT = 70;

export const TRAINING_MODULES = [
  /* =====================================================================
     1 · Der Helpdesk-Helper
     ===================================================================== */
  {
    id: "helper",
    nr: 1,
    titel: "Der Helpdesk-Helper im Alltag",
    kurz: "Wo du was findest und wie ein Anruf damit reibungslos läuft.",
    minuten: 8,
    gruppe: "einarbeitung",
    farbe: "#22d3ee",
    icon: "i-compass",
    abschnitte: [
      {
        titel: "Dein Werkzeugkasten auf einen Blick",
        diagramm: "apptour",
        text: "Der Helpdesk-Helper nimmt dir Routinearbeit ab: Du musst nicht jedes Mal einen Text neu schreiben oder einen Befehl aus dem Gedächtnis tippen.\n\nDie wichtigste Abkürzung: **Strg + K** öffnet die Schnellsuche. Sie durchsucht Vorlagen, Befehle, Lösungen und Glossar auf einmal. Mit **Enter** kopierst du den Treffer.",
        merke: "Wenn du etwas suchst: erst Strg + K. Die Chance ist hoch, dass es schon jemand aufgeschrieben hat.",
      },
      {
        titel: "Ein typischer Anruf – Schritt für Schritt",
        text: "- **1. Fall starten.** Auf der Startseite Ticketnummer und Stichwort eintragen. Ab jetzt schreibt der [[Fall]] mit.\n- **2. Problem beschreiben.** Im [[Symptom-Assistent]] in eigenen Worten eintippen, was der Benutzer sagt. Er schlägt Rückfragen, Schritte und passende Lösungen vor.\n- **3. Schritte abhaken, Befehle kopieren.** Beim Kopieren fragt der Helper nach Werten wie dem Benutzernamen ([[Platzhalter]]).\n- **4. „Zu INC-… hinzufügen?“** Nach jedem Kopieren fragt er, ob es zum Fall gehört – ein Klick auf „Ja“, und es steht in der Dokumentation.\n- **5. Abschluss.** Auf dem Fall „Dokumentation erzeugen“ klicken oder im Ticket-Generator den Abschlusstext bauen – fertig zum Einfügen ins Ticket.",
      },
      {
        titel: "Wissen, das fehlt, wird eingetragen",
        text: "Findest du nichts, merkt sich der Helper den Suchbegriff als [[Wissenslücke]] – das Team sieht in der Statistik, was fehlt. Noch besser: Hast du die Lösung gefunden, trag sie direkt unter **Lösungen → + Lösung hinzufügen** ein (als Mitarbeiter wird sie als Vorschlag zur Freigabe eingereicht).\n\nUnten findest du drei Befehle mit Platzhaltern wie `[SERVER-ODER-IP]`: Probier sie aus, der Helper fragt beim Kopieren nach den Werten.\n\nKleine Hilfen: **/** springt ins Suchfeld der aktuellen Seite, **g** und dann ein Buchstabe wechselt den Bereich (zum Beispiel **g b** zu den Befehlen), **?** zeigt alle Tastenkürzel.",
        merke: "Wissen, das nur in deinem Kopf steht, hilft dem Team nicht – und dir nicht mehr, sobald du Urlaub hast.",
      },
    ],
    befehle: [
      "Erreichbarkeit prüfen",
      "Dienststatus prüfen",
      "Port-Erreichbarkeit prüfen",
    ],
    glossar: ["Fall", "Symptom-Assistent", "Platzhalter", "Wissenslücke", "Vorlage"],
    quiz: [
      {
        frage: "Du hast einen Fall offen und kopierst eine Vorlage. Was passiert?",
        antworten: [
          "Nichts – der Text wird nur kopiert.",
          "Der Helper fragt, ob das zum offenen Fall gehört, und trägt es nach Bestätigung in die Doku ein.",
          "Der Fall wird automatisch geschlossen.",
          "Das Ticket wird im Ticketsystem aktualisiert.",
        ],
        richtig: 1,
        erklaerung: "Der Fall schreibt nur mit, wenn du bestätigst. So landet nichts versehentlich in der Doku, wenn du zwischendurch etwas für einen Kollegen heraussuchst.",
      },
      {
        frage: "In einer Vorlage steht „Hallo [USERNAME]“. Was passiert beim Kopieren?",
        antworten: [
          "Der Helper fragt den Wert ab und merkt ihn sich für den offenen Fall.",
          "Der Text wird unverändert kopiert, du musst ihn danach selbst ersetzen.",
          "[USERNAME] wird durch deinen eigenen Namen ersetzt.",
          "Es erscheint eine Fehlermeldung.",
        ],
        richtig: 0,
        erklaerung: "Nur [ICH] wird automatisch durch deinen Namen ersetzt. Alle anderen Platzhalter fragt der Helper ab – so vergisst du keinen.",
      },
      {
        frage: "Die Schnellsuche findet nichts zu „Fax-Server“. Was ist sinnvoll?",
        antworten: [
          "Nichts – dann gibt es das Problem nicht.",
          "Erst den Leitfaden im Symptom-Assistenten probieren; wenn du die Lösung findest, sie als Lösung eintragen.",
          "Beim Benutzer auflegen.",
          "Die Suche so lange wiederholen, bis etwas erscheint.",
        ],
        richtig: 1,
        erklaerung: "Die erfolglose Suche wird als Wissenslücke gezählt. Trägst du die Lösung ein, hilft sie dem nächsten Kollegen.",
      },
      {
        frage: "Welche Taste bringt dich in das Suchfeld der aktuellen Seite?",
        antworten: ["Strg + F", "Tab", "/", "Esc"],
        richtig: 2,
        erklaerung: "Der Schrägstrich springt ins Suchfeld. Strg + K dagegen öffnet die Schnellsuche über alle Inhalte.",
      },
    ],
    fall: {
      titel: "Du findest eine Lösung, die im Helper fehlt",
      situation: "Nach 20 Minuten hast du ein kniffliges Problem gelöst: Ein Scanner schickte keine Mails, weil das Passwort des Scan-Kontos abgelaufen war. In der Wissensbasis steht dazu nichts. Was machst du?",
      optionen: [
        { text: "Ich merke es mir – ich weiß es ja jetzt.", feedback: "Das hilft nur dir, und nur bis du es vergisst. Ein Kollege, der morgen dasselbe Problem hat, fängt wieder bei null an." },
        { text: "Ich lege unter „Lösungen“ einen Eintrag mit Symptom, Ursache und Schritten an.", feedback: "Genau. Fünf Minuten Aufwand, die sich schnell zurückzahlen. Als Mitarbeiter geht der Eintrag zur Freigabe, Redakteure veröffentlichen ihn direkt." },
        { text: "Ich schreibe es in den Team-Chat.", feedback: "Besser als nichts, aber der Chat ist nicht durchsuchbar wie die Wissensbasis und rutscht nach unten. Eine Lösung ist dort auffindbar." },
      ],
      beste: 1,
    },
  },

  /* =====================================================================
     2 · Systematische Fehlersuche
     ===================================================================== */
  {
    id: "fehlersuche",
    nr: 2,
    titel: "Systematische Fehlersuche",
    kurz: "Nicht raten, sondern eingrenzen – die wichtigste Fähigkeit im Support.",
    minuten: 10,
    gruppe: "einarbeitung",
    farbe: "#38bdf8",
    icon: "i-search",
    abschnitte: [
      {
        titel: "Erst verstehen, dann klicken",
        diagramm: "eingrenzen",
        text: "Eine Ärztin fängt nicht mit der Operation an, sondern mit Fragen. Im Support ist es genauso: Die meisten Fehler sind nach drei, vier guten Fragen schon halb gelöst.\n\nDie vier wichtigsten Fragen:\n- **Was genau passiert?** Die Fehlermeldung wörtlich oder als Screenshot – „geht nicht“ sagt fast nichts.\n- **Seit wann?** Der Zeitpunkt verrät oft den Auslöser.\n- **Was hat sich geändert?** Update, neues Passwort, neuer Arbeitsplatz, Urlaub?\n- **Wer ist noch betroffen?** Nur eine Person oder alle am Standort?",
        merke: "Die Frage „Was hat sich geändert?“ löst erstaunlich viele Fälle. Es hat sich fast immer etwas geändert.",
      },
      {
        titel: "Eingrenzen mit dem Gegentest",
        text: "Ein **Gegentest** heißt: Du änderst genau eine Sache und beobachtest, ob sich das Verhalten ändert. Damit schließt du ganze Bereiche aus.\n\n- Funktioniert es mit einem **anderen Benutzer** am selben Rechner? → Dann liegt es am Konto, nicht am Rechner.\n- Funktioniert es am **Rechner des Kollegen**? → Dann liegt es am Rechner, nicht am Konto.\n- **Kabel statt WLAN**, **Handy-Hotspot statt Firmennetz**? → Netzwerk oder nicht Netzwerk.\n- **Outlook im Web** statt Outlook-Programm? → Postfach oder Programm.",
        merke: "Immer nur eine Sache auf einmal ändern. Probierst du drei Dinge gleichzeitig und es klappt, weißt du nicht, was geholfen hat – und kannst es beim nächsten Mal nicht gezielt wiederholen.",
      },
      {
        titel: "Und der Neustart?",
        text: "Der Klassiker hilft wirklich oft, weil er hängende Zustände aufräumt. Aber er ist kein Beweis, dass „alles in Ordnung“ ist: Wenn das Problem nach dem Neustart wiederkommt, hast du einen Hinweis bekommen – zum Beispiel auf einen Dienst, der abstürzt.\n\nNotiere deshalb, **dass** ein Neustart geholfen hat und **wann** das Problem wiederkam. Das ist eine wertvolle Spur für den 2nd und 3rd Level.",
      },
      {
        titel: "Dokumentieren, während du arbeitest",
        text: "Schreib mit, was du versuchst und was dabei herauskommt – nicht erst am Ende. Das spart später die Frage „Was habe ich schon probiert?“, und der nächste Kollege (oder du selbst nach der Pause) prüft nichts doppelt.\n\nDer Helper hilft dabei: Ein offener [[Fall]] sammelt Vorlagen, Befehle und Lösungen, die du kopierst, und erzeugt daraus die Dokumentation.",
        merke: "Gute Dokumentation heißt nicht lang, sondern nachvollziehbar: Versuch → Ergebnis.",
      },
    ],
    befehle: [
      "Angemeldeten Benutzer anzeigen",
      "Computername anzeigen",
      "Hochfahrzeit anzeigen",
      "Systemlaufzeit anzeigen",
      "Fehlerhafte Geräte anzeigen",
      "Systemfehler der letzten 24 Stunden",
      "Anwendungsabstürze der letzten 24 Stunden anzeigen",
      "Speicherfresser finden",
      "Zuverlässigkeitsverlauf öffnen",
      "Systeminformationen anzeigen",
    ],
    glossar: ["Eskalation", "Reproduzierbar", "Behelfslösung", "Abgesicherter Modus"],
    quiz: [
      {
        frage: "Ein Benutzer ruft an: „Outlook geht nicht.“ Was fragst du zuerst?",
        antworten: [
          "„Haben Sie den Rechner schon neu gestartet?“",
          "„Ich installiere Outlook am besten neu.“",
          "„Was genau passiert – gibt es eine Fehlermeldung, und seit wann?“",
          "„Das wird der Mailserver sein.“",
        ],
        richtig: 2,
        erklaerung: "Erst das Fehlerbild klären. „Geht nicht“ kann alles heißen: startet nicht, hängt, keine Mails, Kennwortfenster. Ohne diese Information rätst du.",
      },
      {
        frage: "Outlook auf dem Rechner macht Probleme, Outlook im Browser funktioniert einwandfrei. Was folgt daraus?",
        antworten: [
          "Das Postfach ist beschädigt.",
          "Der Mailserver ist ausgefallen.",
          "Der Test sagt nichts aus.",
          "Das Problem liegt eher am Programm oder Profil auf dem Rechner als am Postfach.",
        ],
        richtig: 3,
        erklaerung: "Im Browser sprichst du direkt mit dem Postfach. Läuft das, ist das Postfach in Ordnung – der Fehler sitzt im lokalen Teil.",
      },
      {
        frage: "Du probierst Neustart, Treiber-Update und Kabeltausch gleichzeitig – und es klappt. Warum ist das ungünstig?",
        antworten: [
          "Das ist völlig in Ordnung.",
          "Du weißt nicht, was geholfen hat, und kannst es beim nächsten Mal nicht gezielt wiederholen.",
          "Es ist verboten, mehrere Dinge zu tun.",
          "Es dauert zu lange.",
        ],
        richtig: 1,
        erklaerung: "Eine Änderung nach der anderen macht die Ursache sichtbar. Bei drei gleichzeitigen Änderungen bleibt sie im Dunkeln.",
      },
      {
        frage: "Warum schreibst du deine Schritte schon während der Arbeit auf?",
        antworten: [
          "Damit der Chef kontrollieren kann.",
          "Damit Kollegen und der 3rd Level nichts doppelt prüfen müssen und du nichts vergisst.",
          "Nur weil es Vorschrift ist.",
          "Damit das Ticket länger offen bleibt.",
        ],
        richtig: 1,
        erklaerung: "Dokumentation ist ein Werkzeug für dich und das Team – besonders bei Übergaben und Eskalationen.",
      },
    ],
    fall: {
      titel: "„Ich komme nicht auf das Laufwerk S:“",
      situation: "Eine Kollegin ruft an: Seit heute Morgen kann sie nicht auf das Netzlaufwerk S: zugreifen. Die Kollegen am Nachbartisch hätten keine Probleme. Wie gehst du vor?",
      optionen: [
        { text: "Ich lasse den Rechner sofort neu aufsetzen.", feedback: "Viel zu früh und zu aufwändig. Du weißt noch nicht einmal, ob es am Rechner liegt." },
        { text: "Ich frage nach der Fehlermeldung, mache einen Gegentest (anderer Benutzer am selben Rechner bzw. sie an einem anderen Rechner) und prüfe ihre Gruppenmitgliedschaft.", feedback: "Sehr gut. Die Nachbarn funktionieren – also liegt es an ihrem Konto oder Rechner. Der Gegentest trennt die beiden, die Gruppen verraten, ob ein Recht fehlt." },
        { text: "Ich verbinde das Laufwerk neu und schließe das Ticket.", feedback: "Das kann kurzfristig helfen, ist aber nur ein Pflaster. Wenn ein Recht fehlt, hilft es nicht – und ohne Ursache kommt der Anruf morgen wieder." },
      ],
      beste: 1,
    },
  },

  /* =====================================================================
     3 · Gespräche mit Benutzern
     ===================================================================== */
  {
    id: "gespraech",
    nr: 3,
    titel: "Gespräche mit Benutzern",
    kurz: "Verständlich erklären, ruhig bleiben, Vertrauen aufbauen.",
    minuten: 8,
    gruppe: "einarbeitung",
    farbe: "#f472b6",
    icon: "i-message",
    abschnitte: [
      {
        titel: "Der Ablauf eines guten Gesprächs",
        diagramm: "gespraech",
        text: "Wer anruft, hat meist ein Problem, das ihn bei der Arbeit stoppt – manchmal ist er gestresst oder verunsichert. Ein klarer Ablauf gibt Sicherheit:\n\n- **Begrüßen** und mit Namen melden.\n- **Zuhören** und ausreden lassen. Das spart am Ende Zeit.\n- **Zusammenfassen**: „Wenn ich Sie richtig verstehe, …“. So merkst du Missverständnisse sofort.\n- **Nächsten Schritt und Zeitpunkt nennen**: „Ich sehe mir das an und melde mich bis 14 Uhr.“",
        merke: "Ein ehrliches „Ich weiß es noch nicht, finde es aber heraus“ ist besser als eine geratene Antwort.",
      },
      {
        titel: "Einfach erklären",
        text: "Fachwörter sind für uns Alltag, für Benutzer nicht. Ersetze sie durch Bilder und kurze Sätze – und sag immer **eine** Sache auf einmal.",
        vergleich: {
          schlecht: "„Die DNS-Auflösung scheitert, vermutlich ist der Cache korrupt. Bitte führen Sie ein flushdns durch.“",
          gut: "„Ihr Rechner findet die Adresse der Seite gerade nicht – wie ein Telefonbuch mit veraltetem Eintrag. Ich zeige Ihnen, wie wir das auffrischen. Klicken Sie bitte zuerst auf das Startmenü.“",
        },
      },
      {
        titel: "Wenn jemand verärgert ist",
        text: "Ärger gilt fast nie dir persönlich, sondern der Lage. Hilfreich ist diese Reihenfolge:\n\n- **Ruhig bleiben** und nicht verteidigen. Eine Rechtfertigung verlängert nur das Gespräch.\n- **Das Gefühl anerkennen**: „Das ist ärgerlich, besonders vor dem Termin.“\n- **Sagen, was du jetzt tust**: „Ich schaue mir das sofort an.“\n- **Konkreten Zeitpunkt nennen**, wann es weitergeht.\n\nMusst du etwas ablehnen (zum Beispiel ein Recht ohne Freigabe), sag freundlich **warum** und biete eine **Alternative** an: „Das darf ich ohne Freigabe Ihrer Abteilungsleitung leider nicht. Ich schicke Ihnen sofort den Weg, wie Sie sie einholen.“",
      },
      {
        titel: "Sauber abschließen",
        text: "Am Ende bitte den Benutzer, **selbst zu testen**, ob es wirklich funktioniert. Wer nur „sollte gehen“ hört, ruft später wieder an.\n\nFrag zum Schluss, ob noch etwas offen ist, und nenne – wenn sinnvoll – einen Tipp, wie es künftig vermieden wird.",
        merke: "Ein Ticket ist erst gelöst, wenn der Benutzer es bestätigt hat – nicht, wenn du es für gelöst hältst.",
      },
    ],
    befehle: [
      "Computername anzeigen",
      "Angemeldeten Benutzer anzeigen",
      "Remoteunterstützung starten",
    ],
    glossar: ["Behelfslösung", "Eskalation"],
    quiz: [
      {
        frage: "Ein Benutzer ist sehr verärgert. Was hilft zuerst?",
        antworten: [
          "Erklären, warum es nicht deine Schuld ist.",
          "Ruhig bleiben, den Ärger anerkennen und sagen, was du jetzt tust.",
          "Das Gespräch kurz halten und aufs Ticket verweisen.",
          "Gar nicht auf den Ärger eingehen.",
        ],
        richtig: 1,
        erklaerung: "Wer sich ernst genommen fühlt, beruhigt sich meist schnell. Rechtfertigungen verlängern den Streit.",
      },
      {
        frage: "Welche Erklärung versteht jeder?",
        antworten: [
          "„Der Kerberos-Token ist abgelaufen, wir müssen den Cache leeren.“",
          "„Ihr Rechner hat seinen Ausweis für das Firmennetz verloren – ich hole ihm einen neuen.“",
          "„Das ist ein DNS-Problem.“",
          "„Das System hat einen Fehler.“",
        ],
        richtig: 1,
        erklaerung: "Ein Bild aus dem Alltag („Ausweis“) macht verständlich, was passiert, ohne dass der Benutzer die Technik kennen muss.",
      },
      {
        frage: "Du darfst etwas nicht tun, zum Beispiel ein Recht ohne Freigabe vergeben. Wie reagierst du?",
        antworten: [
          "Ich mache es trotzdem, um Ärger zu vermeiden.",
          "Ich sage knapp „geht nicht“.",
          "Freundlich ablehnen, den Grund nennen und eine Alternative anbieten.",
          "Ich ignoriere die Anfrage.",
        ],
        richtig: 2,
        erklaerung: "Eine Grenze mit Begründung und Weg dahin wirkt hilfsbereit, nicht abweisend.",
      },
      {
        frage: "Warum lässt du den Benutzer am Ende selbst testen?",
        antworten: [
          "Damit er beschäftigt ist.",
          "Weil es Vorschrift ist.",
          "Damit sicher ist, dass es wirklich gelöst ist – das vermeidet Rückrufe.",
          "Damit du das Ticket früher schließen kannst.",
        ],
        richtig: 2,
        erklaerung: "Erst der Test durch den Benutzer zeigt, dass sein Problem behoben ist, nicht nur deine Annahme.",
      },
    ],
    fall: {
      titel: "„Schon die dritte Woche geht mein Drucker nicht!“",
      situation: "Ein Anrufer ist sehr laut: „Das ist unglaublich! Schon die dritte Woche geht mein Drucker nicht, und niemand tut etwas!“ Du siehst im System ein offenes Ticket, das zwei Wochen nicht bearbeitet wurde.",
      optionen: [
        { text: "„Das war nicht mein Team, da kann ich nichts für.“", feedback: "Vielleicht stimmt das, hilft aber nicht. Der Anrufer will eine Lösung, keine Schuldzuweisung." },
        { text: "„Das ist ärgerlich, dass es so lange dauert – das tut mir leid. Ich übernehme das jetzt und melde mich bis 14 Uhr bei Ihnen.“", feedback: "Genau: Ärger anerkennen, Verantwortung übernehmen, konkreten Zeitpunkt nennen. Dann musst du ihn aber auch einhalten." },
        { text: "Ich schließe das alte Ticket und lege ein neues an.", feedback: "Das ist Augenwischerei: Die Vorgeschichte geht verloren, und der Ärger bleibt. Bearbeite das bestehende Ticket weiter." },
      ],
      beste: 1,
    },
  },

  /* =====================================================================
     4 · Gute Tickets und Eskalation
     ===================================================================== */
  {
    id: "tickets",
    nr: 4,
    titel: "Gute Tickets und saubere Eskalation",
    kurz: "Was ins Ticket gehört, damit niemand zweimal nachfragen muss.",
    minuten: 9,
    gruppe: "einarbeitung",
    farbe: "#a78bfa",
    icon: "i-pen",
    abschnitte: [
      {
        titel: "Ein Ticket, das jeder versteht",
        diagramm: "ticket",
        text: "Stell dir vor, du bekommst morgen ein Ticket von einer Kollegin, die im Urlaub ist, und musst sofort loslegen. Was brauchst du dafür? Genau diese sechs Dinge gehören hinein. Merkhilfe: Wer? Was? Seit wann? Wie viele? Was schon versucht? Was kommt jetzt?",
      },
      {
        titel: "Vorher – nachher",
        text: "Der Unterschied liegt nicht in der Länge, sondern in den Angaben.",
        vergleich: {
          schlecht: "„Rechner kaputt, bitte prüfen.“",
          gut: "„WLAN bricht ab – Laptop PC-0815 (Frau Keller, 3. OG, erreichbar unter 1234). Seit Montag etwa stündlich, nur im Büro, zu Hause funktioniert es. Andere Laptops im 3. OG ohne Probleme. WLAN-Treiber aktualisiert, WLAN-Bericht erstellt (siehe Anhang). Nächster Schritt: Access Point in Raum 3.12 prüfen lassen.“",
        },
        merke: "Fehlermeldungen wörtlich oder als Screenshot festhalten. Der genaue Wortlaut und Fehlercode zeigen oft sofort auf die Ursache.",
      },
      {
        titel: "Eskalieren heißt nicht aufgeben",
        diagramm: "stufen",
        text: "Eskalation bedeutet, den Fall an jemanden zu geben, der **mehr Rechte, mehr Wissen oder mehr Zeit** dafür hat. Das ist professionell – nicht schwach.\n\nTypische Gründe:\n- Du kommst mit deinen Mitteln oder Rechten nicht weiter.\n- Viele Benutzer sind betroffen oder die Auswirkung ist groß ([[Major Incident]]).\n- Es besteht ein Sicherheitsrisiko.\n- Eine vereinbarte Frist würde sonst reißen.",
        merke: "Wann du eskalierst, entscheidet nicht dein Stolz, sondern die Lage. Lieber zu früh mit guten Angaben als zu spät mit einer Vermutung.",
      },
      {
        titel: "Was du bei der Eskalation mitgibst",
        text: "Der 3rd Level soll nicht von vorn anfangen müssen. Gib mit:\n- Fehlerbild und **Auswirkung** (wer und wie viele sind betroffen?)\n- **Zeitpunkt** und was sich geändert hat\n- **Deine Schritte** und was dabei herauskam\n- **Logs, Screenshots, Fehlercodes**\n- Ob der Fehler [[Reproduzierbar]] ist\n- Wie der Benutzer erreichbar ist\n\nDer **Ticket-Generator** (Textart „Eskalation an 3rd Level“) baut daraus einen fertigen Text. Im Symptom-Assistenten übernimmt „Nicht gelöst → Eskalationstext erstellen“ dein Fehlerbild und die abgehakten Schritte.",
      },
    ],
    befehle: [
      "Computername anzeigen",
      "Angemeldeten Benutzer anzeigen",
      "Windows-Version und Build anzeigen",
      "Modell und Hersteller anzeigen",
      "Seriennummer auslesen",
      "Netzwerkkonfiguration anzeigen",
      "Systeminformationen anzeigen",
      "Systemfehler der letzten 24 Stunden",
      "Anwendungsabstürze der letzten 24 Stunden anzeigen",
    ],
    glossar: ["Ticket", "1st / 2nd / 3rd Level", "Eskalation", "Major Incident", "Reproduzierbar", "Behelfslösung"],
    quiz: [
      {
        frage: "Welches Ticket ist besser?",
        antworten: [
          "„Drucker geht nicht.“",
          "„Drucker im 2. OG druckt seit 9 Uhr nicht, Fehler ‚Offline‘, Neustart des Druckers hat nicht geholfen, 5 Personen betroffen.“",
          "„Bitte dringend!!! Drucker.“",
          "„Siehe Anruf.“",
        ],
        richtig: 1,
        erklaerung: "Das zweite Ticket enthält Ort, Zeit, Fehlermeldung, versuchte Schritte und Umfang – alles, was der Nächste braucht.",
      },
      {
        frage: "Warum ist die Fehlermeldung im Wortlaut so wichtig?",
        antworten: [
          "Weil sie hübscher aussieht.",
          "Weil Wortlaut und Fehlercode oft eindeutig auf die Ursache zeigen.",
          "Weil es das Ticket länger macht.",
          "Eigentlich ist sie nicht wichtig.",
        ],
        richtig: 1,
        erklaerung: "„Zugriff verweigert“, „Server nicht gefunden“ und „Zeitüberschreitung“ bedeuten drei verschiedene Dinge. Umschreibungen gehen diese Information verloren.",
      },
      {
        frage: "Wann solltest du eskalieren?",
        antworten: [
          "Erst nach mindestens einem Tag.",
          "Nie – man löst alles selbst.",
          "Wenn du nicht weiterkommst, viele betroffen sind, ein Sicherheitsrisiko besteht oder eine Frist droht.",
          "Immer sofort, ohne vorher etwas zu prüfen.",
        ],
        richtig: 2,
        erklaerung: "Die Lage entscheidet. Eskalieren ohne Vorarbeit kostet den 3rd Level Zeit; zu langes Zögern kostet die Benutzer Zeit.",
      },
      {
        frage: "Was ist an dem Ticket „Rechner kaputt, bitte prüfen“ das größte Problem?",
        antworten: [
          "Es ist zu kurz geschrieben.",
          "Es fehlt jede Angabe: Der Empfänger muss alles neu erfragen.",
          "Es ist unhöflich.",
          "Es enthält Rechtschreibfehler.",
        ],
        richtig: 1,
        erklaerung: "Kurz ist nicht schlimm, solange die wichtigen Angaben da sind. Hier fehlen sie ganz – das kostet alle Beteiligten doppelte Arbeit.",
      },
    ],
    fall: {
      titel: "VPN-Ausfall bei zwölf Benutzern",
      situation: "Seit 8:30 Uhr melden sich immer mehr Homeoffice-Benutzer: Das VPN verbindet nicht. Inzwischen sind es zwölf Tickets. Du hast bei drei Benutzern Zugangsdaten und Client geprüft – ohne Erfolg. Es ist 9:15 Uhr.",
      optionen: [
        { text: "Ich arbeite die zwölf Tickets einzeln ab, vielleicht liegt es ja bei jedem anders.", feedback: "Bei so vielen gleichen Meldungen liegt die Ursache fast sicher zentral. Einzeln abzuarbeiten kostet Zeit, die alle Betroffenen verlieren." },
        { text: "Ich eskaliere sofort mit Zusammenfassung: seit wann, wie viele, was schon geprüft wurde, welche Fehlermeldung – und verknüpfe die Tickets.", feedback: "Genau. Du hast die Lage erkannt und gibst dem 3rd Level alles, womit er loslegen kann. Danach kannst du den Betroffenen eine einheitliche Rückmeldung geben." },
        { text: "Ich warte bis zum Nachmittag, ob es sich von selbst löst.", feedback: "Warten ist hier das falsche Signal. Ein Ausfall mit vielen Betroffenen darf nicht liegen bleiben." },
      ],
      beste: 1,
    },
  },

  /* =====================================================================
     5 · Sicherheit am Telefon
     ===================================================================== */
  {
    id: "sicherheit",
    nr: 5,
    titel: "Sicherheit am Telefon",
    kurz: "Anrufer prüfen, Phishing erkennen, richtig reagieren.",
    minuten: 10,
    gruppe: "einarbeitung",
    farbe: "#f87171",
    icon: "i-shield",
    abschnitte: [
      {
        titel: "Warum der Helpdesk ein Ziel ist",
        diagramm: "anrufpruefung",
        text: "Wir können Passwörter zurücksetzen, Zugänge freischalten und Sicherheitsmerkmale ändern. Genau das macht den Helpdesk für Angreifer attraktiv: Statt ein System zu knacken, rufen sie an – als „Kollege im Außendienst“, „Geschäftsführer in Eile“ oder „Mitarbeiter aus der Personalabteilung“. Das nennt man **Social Engineering**.\n\nDie gute Nachricht: Ein fester Ablauf schützt zuverlässig.",
      },
      {
        titel: "Identität prüfen – immer, nach festem Verfahren",
        text: "- **Rückruf auf die hinterlegte Nummer** (aus Telefonbuch oder Verzeichnis – nie auf die, die der Anrufer nennt).\n- **Prüfverfahren deines Teams** anwenden, zum Beispiel Rückfrage bei der Führungskraft. Frag, wenn du es nicht kennst.\n- **Passwörter nie am Telefon erfragen** und nie unverschlüsselt weitergeben. Auch Anrufer mit dem richtigen Namen müssen sich ausweisen.\n- **Zeitdruck, Drohungen und Ausnahmen** („nur dieses eine Mal“) sind Warnsignale. Je dringender jemand wirkt, desto genauer prüfst du.",
        merke: "Du bist nicht unhöflich, wenn du prüfst. Seriöse Anrufer haben dafür Verständnis – Angreifer drängen.",
      },
      {
        titel: "Phishing erkennen",
        diagramm: "phishing",
        text: "[[Phishing]] sind gefälschte Mails oder Seiten, die Zugangsdaten abgreifen oder Schadsoftware unterschieben wollen. Moderne Fälschungen sind oft fehlerfrei – verlass dich nicht auf Rechtschreibfehler, sondern auf diese Merkmale:\n- Absenderadresse **leicht verändert** (zum Beispiel eine Null statt eines O)\n- **Zeitdruck oder Drohung**\n- Der Link führt **woandershin**, als der Text vermuten lässt (Maus darüber halten)\n- **Unerwartete Anhänge**, vor allem ZIP-Dateien oder Office-Dateien mit Makros",
        merke: "Im Zweifel nicht klicken, sondern den Absender über einen anderen Weg fragen – und die Mail über den „Phishing melden“-Knopf melden.",
      },
      {
        titel: "Wenn doch geklickt wurde",
        text: "Das passiert den Besten. Entscheidend ist das Tempo – und dass niemand Angst haben muss, sich zu melden.\n\n- **Rechner vom Netz trennen** (Kabel ziehen, WLAN aus), nicht ausschalten.\n- **Passwort zurücksetzen** und alle Sitzungen beenden.\n- **MFA-Methoden und Postfachregeln prüfen** – Angreifer richten gern Weiterleitungen ein.\n- **Sicherheitsteam sofort informieren.** Eigene Aufräumversuche können Spuren verwischen.\n\nDer Symptom-Assistent hat dafür den Leitfaden „Auf Phishing-Link geklickt“.",
        merke: "Wer schnell meldet, begrenzt den Schaden. Beschuldigen hilft nie – es sorgt nur dafür, dass der Nächste zu spät meldet.",
      },
    ],
    befehle: [
      "Benutzerkonto im Active Directory anzeigen",
      "Sitzungen widerrufen",
      "MFA-Methoden anzeigen",
      "Weiterleitungsregeln eines Postfachs prüfen",
      "Defender-Status anzeigen",
      "Defender-Schnellscan starten",
      "Defender-Funde anzeigen",
      "Aktive Netzwerkverbindungen mit Prozess anzeigen",
      "Datei-Hash berechnen",
      "Fehlgeschlagene Anmeldungen anzeigen",
    ],
    glossar: ["Phishing", "MFA", "Authenticator", "Push-Benachrichtigung", "Ransomware / Malware", "Self-Service-Passwortreset"],
    quiz: [
      {
        frage: "Ein Anrufer will „ganz dringend“ seinen zweiten Faktor zurücksetzen lassen: „Ich sitze im Flugzeug, der Chef wartet!“ Was tust du?",
        antworten: [
          "Sofort zurücksetzen – der Chef wartet.",
          "Die Identität über einen eigenen Weg prüfen (Rückruf auf hinterlegte Nummer, Führungskraft), bevor etwas geändert wird.",
          "Dem Anrufer ein Passwort am Telefon nennen.",
          "Auflegen und nichts weiter tun.",
        ],
        richtig: 1,
        erklaerung: "Zeitdruck und Autorität sind die klassischen Hebel von Social Engineering. Das MFA zurückzusetzen ist besonders heikel – deshalb zuerst prüfen.",
      },
      {
        frage: "Auf welche Nummer rufst du zur Identitätsprüfung zurück?",
        antworten: [
          "Auf die Nummer, die der Anrufer nennt.",
          "Auf die Nummer, die im Display erschien.",
          "Auf die im Verzeichnis hinterlegte Nummer der Person.",
          "Auf die private Handynummer, wenn der Anrufer sie angibt.",
        ],
        richtig: 2,
        erklaerung: "Eine vom Anrufer genannte Nummer führt im Zweifel wieder zum Angreifer. Nur der hinterlegte Eintrag ist verlässlich.",
      },
      {
        frage: "Eine Mail droht: „Ihr Konto läuft in 24 Stunden ab, jetzt anmelden“, Absender „hilfe@micros0ft-konto.example“. Was sind Warnzeichen?",
        antworten: [
          "Keine – die Mail ist harmlos.",
          "Die Mail ist zu kurz.",
          "Zeitdruck und eine verfälschte Absender-Domäne (Null statt O).",
          "Dass sie in deutscher Sprache geschrieben ist.",
        ],
        richtig: 2,
        erklaerung: "Zeitdruck und eine nur ähnliche Domäne sind typisch. Die Sprache sagt nichts – moderne Fälschungen sind fehlerfrei.",
      },
      {
        frage: "Ein Benutzer hat auf einen Phishing-Link geklickt und sein Passwort eingegeben. Was ist die richtige erste Reaktion?",
        antworten: [
          "Abwarten, ob etwas passiert.",
          "Die Mail löschen und weiterarbeiten.",
          "Rechner vom Netz trennen, Passwort zurücksetzen, Sitzungen beenden und das Sicherheitsteam sofort informieren.",
          "Den Benutzer ermahnen und das Ticket schließen.",
        ],
        richtig: 2,
        erklaerung: "Jede Minute zählt: Mit dem Passwort kann sich ein Angreifer sofort anmelden. Schnell trennen, Zugang sperren und melden.",
      },
    ],
    fall: {
      titel: "„Hier ist Herr Weber aus der Geschäftsführung“",
      situation: "Ein Anrufer meldet sich als Herr Weber (Geschäftsführung), er sei im Ausland und komme nicht an sein Konto. Du sollst sein Passwort zurücksetzen und es an seine **private** Mailadresse schicken. „Es eilt, ich habe gleich einen Termin mit dem Vorstand.“",
      optionen: [
        { text: "Ich setze das Passwort zurück und sende es an die private Adresse – er ist ja Geschäftsführer.", feedback: "Genau das wollen Angreifer. Rang und Zeitdruck dürfen die Prüfung nie ersetzen – und Passwörter gehören nicht an private Adressen." },
        { text: "Ich bleibe freundlich, lehne das Zurücksenden an die private Adresse ab, rufe auf der hinterlegten Nummer zurück bzw. frage die Assistenz und dokumentiere alles im Ticket.", feedback: "Perfekt: freundlich, aber nach dem festen Ablauf. Ist es echt, haben seine Mitarbeiter Verständnis – ist es ein Angriff, hast du ihn gestoppt." },
        { text: "Ich frage ihn nach dem Geburtsdatum, und wenn es stimmt, setze ich zurück.", feedback: "Geburtsdaten sind für Angreifer oft leicht zu finden. Ein einzelnes Merkmal reicht nicht – nutze das Prüfverfahren deines Teams und den Rückruf." },
      ],
      beste: 1,
    },
  },

  /* =====================================================================
     6 · Netzwerk
     ===================================================================== */
  {
    id: "netzwerk",
    nr: 6,
    titel: "Wie ein Rechner ins Netz kommt",
    kurz: "IP-Adresse, DHCP, DNS und Gateway – ganz ohne Fachchinesisch.",
    minuten: 10,
    gruppe: "technik",
    farbe: "#34d399",
    icon: "i-globe",
    abschnitte: [
      {
        titel: "Das Netzwerk als Post und Straßenverkehr",
        diagramm: "netzweg",
        text: "Damit dein Rechner eine Seite oder einen Server erreicht, muss er vier Dinge können:\n\n- Eine **Adresse** haben: die [[IP-Adresse]] – wie die Hausnummer, unter der Post ankommt.\n- Diese Adresse **automatisch bekommen**: das erledigt [[DHCP]], die „Hausverwaltung“, die freie Nummern verteilt.\n- **Namen übersetzen**: [[DNS]] ist das Telefonbuch, das aus „heise.de“ eine Nummer macht.\n- Aus dem eigenen Netz **hinauskommen**: das [[Gateway]] ist die Ausfahrt in die Welt.\n\nDazwischen steht oft ein Türsteher (Firewall oder [[Proxy]]), der nur Erlaubtes durchlässt.",
      },
      {
        titel: "Woran du erkennst, wo es hakt",
        text: "Jedes der vier Teile verrät sich durch ein anderes Fehlerbild:\n\n- **Adresse beginnt mit 169.254.** → Der Rechner hat keine Adresse vom DHCP bekommen. Kabel, WLAN, Dienst?\n- **Adresse ok, aber das Gateway antwortet nicht** → Problem im lokalen Netz (Kabel, Switch, WLAN).\n- **Seiten gehen nicht per Name, aber per IP-Adresse** → DNS.\n- **Nur eine bestimmte Seite geht nicht** → Ziel, Proxy, Zertifikat oder Berechtigung.",
        merke: "Von unten nach oben prüfen: erst Verbindung, dann Adresse, dann Gateway, dann Namen. Wie bei einer Kette, die an der schwächsten Stelle reißt.",
      },
      {
        titel: "Der Dreischritt-Test",
        text: "Mit drei Befehlen findest du die Schicht in den meisten Fällen in unter einer Minute:\n\n- **1. Netzwerkkonfiguration anzeigen** – hat der Rechner eine sinnvolle Adresse und ein Gateway?\n- **2. Erreichbarkeit prüfen** – antwortet das Gateway bzw. ein bekannter Server?\n- **3. DNS-Auflösung prüfen** – findet der Rechner den Namen?\n\nUnten kannst du die Befehle direkt kopieren.",
      },
      {
        titel: "Und im Homeoffice? Das VPN",
        text: "Ein [[VPN]] ist ein verschlüsselter Tunnel vom Homeoffice ins Firmennetz. Erst damit sind interne Server, Netzlaufwerke und Fachanwendungen erreichbar.\n\nTypische Fehler: Die Verbindung kommt gar nicht zustande (Zugangsdaten, zweiter Faktor, Router blockiert) oder sie steht, aber nichts ist erreichbar. Dann liegt es oft am **Namen** (interner DNS) oder daran, dass das **Heimnetz denselben Adressbereich** wie das Firmennetz nutzt (zum Beispiel 192.168.0.x) – der Rechner weiß dann nicht, ob das Ziel zu Hause oder im Büro liegt.",
      },
    ],
    befehle: [
      "Netzwerkkonfiguration anzeigen",
      "Netzwerkadapter anzeigen",
      "IP-Konfiguration kompakt anzeigen",
      "Standardgateway anzeigen",
      "Erreichbarkeit prüfen",
      "DNS-Server anzeigen",
      "DNS-Auflösung prüfen",
      "DNS-Zwischenspeicher leeren",
      "Neue IP-Adresse anfordern",
      "Netzwerkweg prüfen",
      "Verbindungsqualität prüfen",
      "Port-Erreichbarkeit prüfen",
      "Aktuelles WLAN anzeigen",
      "Proxy-Einstellungen des Systems anzeigen",
      "VPN-Verbindungen anzeigen",
      "Routing-Tabelle anzeigen",
    ],
    glossar: ["IP-Adresse", "DHCP", "DNS", "Gateway", "Proxy", "VPN", "ipconfig", "ping / tracert", "nslookup", "Port"],
    quiz: [
      {
        frage: "Was macht DNS?",
        antworten: [
          "Es vergibt IP-Adressen an Rechner.",
          "Es übersetzt Namen wie heise.de in IP-Adressen.",
          "Es verschlüsselt den Datenverkehr.",
          "Es schützt vor Viren.",
        ],
        richtig: 1,
        erklaerung: "DNS ist das Telefonbuch des Netzes. Die Adressen verteilt dagegen DHCP.",
      },
      {
        frage: "Ein Rechner hat die Adresse 169.254.12.7. Was bedeutet das meistens?",
        antworten: [
          "Alles ist in Ordnung.",
          "Er hat keine Adresse vom DHCP-Server erhalten.",
          "Der Rechner ist mit dem VPN verbunden.",
          "Der DNS-Server ist ausgefallen.",
        ],
        richtig: 1,
        erklaerung: "Adressen aus 169.254.x.x vergibt sich der Rechner notfalls selbst, wenn kein DHCP antwortet. Prüfe Kabel, WLAN und den DHCP-Dienst.",
      },
      {
        frage: "Webseiten laden nicht per Name, aber ein Ping auf eine IP-Adresse klappt. Was ist am wahrscheinlichsten?",
        antworten: [
          "Das Netzkabel ist defekt.",
          "Der Rechner hat keine IP-Adresse.",
          "Es liegt an der Namensauflösung (DNS).",
          "Der Browser ist veraltet.",
        ],
        richtig: 2,
        erklaerung: "Die Verbindung steht, nur die Übersetzung von Namen funktioniert nicht – das Telefonbuch ist die Schwachstelle.",
      },
      {
        frage: "Warum kann ein VPN scheitern, wenn das Heimnetz denselben Adressbereich wie das Firmennetz nutzt?",
        antworten: [
          "Weil die Datenmenge zu groß ist.",
          "Weil der Rechner nicht unterscheiden kann, ob ein Ziel zu Hause oder im Firmennetz liegt.",
          "Weil das VPN dann zu langsam wird.",
          "Weil der Router das Passwort ändert.",
        ],
        richtig: 1,
        erklaerung: "Gleiche Adressen auf beiden Seiten sind wie zwei Straßen mit gleichem Namen: Die Post weiß nicht, wohin sie soll.",
      },
    ],
    fall: {
      titel: "„WLAN ist verbunden, aber kein Internet“",
      situation: "Ein Kollege im Büro: Das WLAN-Symbol zeigt „verbunden“, aber keine Seite lädt. Die Kollegen nebenan arbeiten normal.",
      optionen: [
        { text: "Ich lasse ihn den Rechner neu installieren.", feedback: "Das wäre das letzte Mittel. Du hast noch nicht einmal geprüft, ob er eine Adresse hat." },
        { text: "Ich lasse mir die Netzwerkkonfiguration zeigen: Welche Adresse und welches Gateway hat er? Dann prüfe ich Gateway und DNS der Reihe nach.", feedback: "Genau, von unten nach oben. Beginnt die Adresse mit 169.254, fehlt DHCP; antwortet nur das Gateway nicht, ist es das lokale Netz; klappt nur die IP, liegt es an DNS." },
        { text: "Ich bitte ihn, den Browser zu wechseln.", feedback: "Das kann ein Gegentest sein, aber wenn kein Gerät Internet hat, hilft ein anderer Browser nicht. Erst die Netzwerkschichten prüfen." },
      ],
      beste: 1,
    },
  },

  /* =====================================================================
     7 · Anmeldung im Firmennetz
     ===================================================================== */
  {
    id: "anmeldung",
    nr: 7,
    titel: "Anmeldung im Firmennetz",
    kurz: "Domäne, Kerberos und Gruppen – warum Rechte erst nach neuer Anmeldung wirken.",
    minuten: 9,
    gruppe: "technik",
    farbe: "#fbbf24",
    icon: "i-key",
    abschnitte: [
      {
        titel: "Der Pförtner und der Besucherausweis",
        diagramm: "anmeldung",
        text: "Stell dir das Firmennetz wie ein Bürogebäude vor. Am Eingang sitzt ein Pförtner: der [[Domänencontroller]]. Er prüft dein Passwort (und gegebenenfalls den zweiten Faktor) und gibt dir einen **Besucherausweis**: das [[Kerberos]]-Ticket.\n\nAuf diesem Ausweis steht, zu welchen **Gruppen** du gehörst. Jeder Türsteher im Haus – zum Beispiel ein Dateiserver – schaut nur auf den Ausweis, nicht mehr auf dein Passwort.",
        merke: "Das ist der Grund, warum nach einer Rechteänderung oft die Anmeldung neu nötig ist: Der alte Ausweis kennt die neue Gruppe noch nicht. Der einfachste Weg ist Abmelden und neu Anmelden. `klist purge` leert nur den Ticket-Zwischenspeicher – harmlos, aber meist nicht nötig.",
      },
      {
        titel: "Rechte hängen an Gruppen",
        diagramm: "gruppen",
        text: "Berechtigungen werden nicht einzeln pro Person vergeben, sondern an [[Gruppe / Gruppenmitgliedschaft|Gruppen]]. Wer zum Beispiel in der Gruppe „Vertrieb“ ist, darf in den Ordner „Vertrieb“. Das macht Verwaltung übersichtlich: Wechselt jemand die Abteilung, ändert man die Gruppe, nicht hundert Ordnerrechte.\n\nHat ein neuer Kollege **kein Zugriff**, prüfst du: Ist er in der richtigen Gruppe? Hat er sich seitdem **neu angemeldet**?",
      },
      {
        titel: "Gruppenrichtlinien: die Hausordnung",
        text: "[[Gruppenrichtlinie|Gruppenrichtlinien]] sind zentrale Einstellungen für Rechner und Benutzer: welche Laufwerke und Drucker verbunden werden, welche Sicherheitsvorgaben gelten, welche Startseite der Browser hat. Sie werden bei der Anmeldung und regelmäßig im Hintergrund angewendet.\n\nHat sich etwas geändert und ist noch nicht da? `gpupdate /force` wendet die Richtlinien sofort an.",
      },
      {
        titel: "Wenn die Anmeldung scheitert",
        text: "Gehe die Möglichkeiten der Reihe nach durch:\n\n- **Konto gesperrt?** Zu viele falsche Passwörter, oft vom Handy oder einem gespeicherten Netzlaufwerk verursacht.\n- **Passwort abgelaufen?** Im Homeoffice nur mit VPN änderbar.\n- **Uhrzeit falsch?** Kerberos akzeptiert Tickets nur, wenn die Zeit von Rechner und Domänencontroller nur wenige Minuten (meist fünf) abweicht.\n- **Domänencontroller nicht erreichbar?** Im Büro Netzwerk, zu Hause VPN prüfen.\n- **[[Vertrauensstellung]] verloren?** Meldung „Die Vertrauensstellung zwischen dieser Arbeitsstation und der Domäne …“ – dann hilft meist das Reparieren des Computerkontos.",
        merke: "Wenn viele Benutzer gleichzeitig Anmeldeprobleme haben, ist es selten ein Passwortproblem, sondern fast immer ein zentraler Dienst.",
      },
    ],
    befehle: [
      "Angemeldeten Benutzer anzeigen",
      "Gruppenmitgliedschaften anzeigen",
      "Kerberos-Tickets anzeigen",
      "Kerberos-Tickets zurücksetzen",
      "Gruppenrichtlinien aktualisieren",
      "Gruppenrichtlinien-Bericht als HTML erstellen",
      "Domänenverbindung prüfen",
      "Domänencontroller der Domäne anzeigen",
      "Zeitdienst-Status anzeigen",
      "Zeit neu synchronisieren",
      "Eigenes Domänenkonto anzeigen",
      "Benutzerkonto im Active Directory anzeigen",
      "Konto entsperren",
      "Vertrauensstellung reparieren",
    ],
    glossar: ["Active Directory", "Domäne", "Domänencontroller", "Kerberos", "Gruppe / Gruppenmitgliedschaft", "Gruppenrichtlinie", "klist", "gpupdate", "whoami", "Vertrauensstellung"],
    quiz: [
      {
        frage: "Wofür ist der Domänencontroller zuständig?",
        antworten: [
          "Er speichert die Dateien aller Benutzer.",
          "Er prüft Anmeldungen und führt das Active Directory.",
          "Er druckt Dokumente.",
          "Er schützt vor Viren.",
        ],
        richtig: 1,
        erklaerung: "Der Domänencontroller ist der Pförtner: Er kennt Konten und Gruppen und stellt die Tickets aus.",
      },
      {
        frage: "Ein Benutzer wurde einer Gruppe hinzugefügt, hat aber noch keinen Zugriff. Was hilft meistens?",
        antworten: [
          "Den Ordner löschen.",
          "Dem Benutzer direkt Rechte auf den Ordner geben.",
          "Neu anmelden lassen (oder die Tickets zurücksetzen) – erst dann steht die Gruppe im Ausweis.",
          "Das Passwort ändern.",
        ],
        richtig: 2,
        erklaerung: "Die Gruppen stehen im Kerberos-Ticket. Ein neues Ticket gibt es bei einer neuen Anmeldung.",
      },
      {
        frage: "Was ist eine Gruppenrichtlinie?",
        antworten: [
          "Eine Liste von Mitarbeitern.",
          "Zentral festgelegte Einstellungen für Rechner und Benutzer.",
          "Ein Antivirenprogramm.",
          "Eine Vorlage für Tickets.",
        ],
        richtig: 1,
        erklaerung: "Richtlinien sind die „Hausordnung“: Laufwerke, Drucker, Sicherheitsvorgaben und vieles mehr werden darüber verteilt.",
      },
      {
        frage: "Warum kann eine falsche Uhrzeit am Rechner die Anmeldung verhindern?",
        antworten: [
          "Weil die Uhrzeit im Passwort steckt.",
          "Weil Kerberos-Tickets nur bei kleiner Zeitabweichung akzeptiert werden.",
          "Weil der Rechner dann langsamer ist.",
          "Gar nicht – die Zeit spielt keine Rolle.",
        ],
        richtig: 1,
        erklaerung: "Tickets haben einen Zeitstempel. Weicht die Rechnerzeit zu stark ab (meist über fünf Minuten), werden sie abgelehnt.",
      },
    ],
    fall: {
      titel: "Neuer Kollege sieht den Ordner nicht",
      situation: "Max wurde heute früh in die Gruppe „Buchhaltung“ aufgenommen. Eine Stunde später ruft er an: Er sieht den Ordner „Buchhaltung“ trotzdem nicht. Was machst du?",
      optionen: [
        { text: "Ich gebe Max das Recht direkt auf den Ordner, dann geht es sofort.", feedback: "Das umgeht die Gruppen und erzeugt Einzelrechte, die später keiner mehr überblickt. Außerdem fehlt womöglich nur die Neuanmeldung." },
        { text: "Ich prüfe seine Gruppenmitgliedschaft und lasse ihn sich ab- und wieder anmelden. Hilft das nicht, setze ich die Kerberos-Tickets zurück.", feedback: "Genau. Erst prüfen, ob die Gruppe wirklich eingetragen ist, dann ein neues Ticket erzwingen. So bleibt die Rechtevergabe sauber." },
        { text: "Ich bitte ihn, den Rechner auszuschalten und morgen wiederzukommen.", feedback: "Das löst nichts – und lässt ihn einen Tag ohne seine Arbeit. Die Lösung dauert nur wenige Minuten." },
      ],
      beste: 1,
    },
  },

  /* =====================================================================
     8 · Microsoft 365
     ===================================================================== */
  {
    id: "microsoft365",
    nr: 8,
    titel: "Microsoft 365: Rechner oder Cloud?",
    kurz: "Was lokal läuft, was in der Cloud – und der Web-Test, der Stunden spart.",
    minuten: 8,
    gruppe: "technik",
    farbe: "#60a5fa",
    icon: "i-cloud",
    abschnitte: [
      {
        titel: "Zwei Welten",
        diagramm: "cloudlokal",
        text: "Bei Microsoft 365 besteht fast alles aus **zwei Teilen**: einem Programm auf dem Rechner und einem Dienst in der Cloud.\n\n- **Outlook** (Programm) zeigt ein [[Postfach]], das bei Microsoft auf dem [[Exchange]]-Server liegt. Lokal liegt nur eine Kopie – die [[OST-Datei|OST-Datei]].\n- **Teams** (App) nutzt den Teams-Dienst in der Cloud.\n- **OneDrive** synchronisiert einen Ordner auf dem Rechner mit dem Speicher in der Cloud.\n- Alles hängt an deinem Konto in [[Entra ID]] samt Anmeldung und MFA.",
      },
      {
        titel: "Der wichtigste Trick: der Web-Test",
        text: "Fast jeder Dienst lässt sich auch im Browser öffnen: Outlook im Web ([[OWA]]), Teams im Browser, OneDrive im Browser. Das ist dein stärkster Gegentest:\n\n- **Im Browser funktioniert es** → Konto, Lizenz und Dienst sind in Ordnung. Der Fehler liegt **auf dem Rechner** (Programm, Profil, Cache, Add-in).\n- **Auch im Browser nicht** → Das Problem liegt **beim Konto, bei der Lizenz oder beim Dienst**.",
        merke: "Der Web-Test dauert eine Minute und teilt das Problem in zwei Hälften. Mach ihn, bevor du am lokalen Programm herumschraubst.",
      },
      {
        titel: "Lokale Probleme – meist harmlos reparierbar",
        text: "Wenn der Fehler lokal liegt, gibt es eine bewährte Reihenfolge – vom Sanften zum Gründlichen:\n\n- Programm im [[Abgesicherter Modus|abgesicherten Modus]] starten (ohne Add-ins)\n- [[Cache]] leeren (bei Teams) bzw. die OST-Datei umbenennen (bei Outlook)\n- Office-Reparatur\n- Neues [[Outlook-Profil]] anlegen\n\nKeine Sorge bei Outlook: Die Mails liegen im Postfach in der Cloud. Ein neues Profil baut die lokale Kopie einfach neu auf.",
      },
      {
        titel: "Liegt es an Microsoft selbst?",
        text: "Manchmal ist nicht dein Rechner schuld, sondern der Dienst. Das erkennst du daran, dass **mehrere Benutzer gleichzeitig** dasselbe Cloud-Problem melden, an verschiedenen Rechnern und Standorten.\n\nPrüfe dann die IT-Meldungen im Helper und den Dienststatus von Microsoft (im Admin Center oder auf der Statusseite), bevor du eine Stunde lang lokal suchst. Bei einem bestätigten Ausfall hilft nur: Betroffene informieren und warten.",
        merke: "Eine kurze Rückmeldung wie „Microsoft hat aktuell eine Störung bei Teams, wir beobachten es“ erspart allen Beteiligten viel Rätselraten.",
      },
    ],
    befehle: [
      "Outlook im abgesicherten Modus starten",
      "Outlook beenden",
      "OST-Dateien anzeigen",
      "Mail-Profile öffnen",
      "Gespeicherte Zugangsdaten anzeigen",
      "Gespeicherte Zugangsdaten löschen",
      "Teams beenden",
      "Teams-Cache leeren (neues Teams)",
      "OneDrive zurücksetzen",
      "Office-Version anzeigen",
      "Lizenzen eines Benutzers anzeigen",
      "Postfachgröße anzeigen",
      "Nachrichtenverfolgung",
    ],
    glossar: ["Exchange", "Postfach", "OWA", "OST-Datei", "Outlook-Profil", "OneDrive", "SharePoint", "Entra ID", "Lizenz", "Cache"],
    quiz: [
      {
        frage: "Das Outlook-Programm hängt, Outlook im Web läuft einwandfrei. Wo liegt der Fehler wahrscheinlich?",
        antworten: [
          "Auf dem lokalen Rechner (Programm, Profil, Add-in).",
          "Beim Mailserver von Microsoft.",
          "Im Postfach des Benutzers.",
          "Beim Internetanbieter.",
        ],
        richtig: 0,
        erklaerung: "Im Browser sprichst du direkt mit dem Postfach. Läuft das, bleibt der lokale Teil als Verdächtiger.",
      },
      {
        frage: "Was ist die OST-Datei?",
        antworten: [
          "Das Passwort des Postfachs.",
          "Der lokale Zwischenspeicher des Postfachs in Outlook.",
          "Eine Sicherung aller Mails auf einem Server.",
          "Ein Virenschutz für Outlook.",
        ],
        richtig: 1,
        erklaerung: "Die OST-Datei ist eine Kopie des Postfachs auf dem Rechner. Ist sie beschädigt, baut Outlook sie nach dem Umbenennen neu auf.",
      },
      {
        frage: "Wann lohnt sich ein Blick auf den Microsoft-Dienststatus?",
        antworten: [
          "Bei jedem einzelnen Ticket.",
          "Wenn mehrere Benutzer gleichzeitig dasselbe Cloud-Problem melden.",
          "Nie, das ist Sache von Microsoft.",
          "Nur montags.",
        ],
        richtig: 1,
        erklaerung: "Viele gleichzeitige gleiche Meldungen an verschiedenen Rechnern sind ein Hinweis auf eine zentrale Ursache.",
      },
      {
        frage: "Du legst für einen Benutzer ein neues Outlook-Profil an. Was passiert mit den Mails?",
        antworten: [
          "Sie sind gelöscht.",
          "Sie bleiben im Postfach in der Cloud; Outlook baut die lokale Kopie neu auf.",
          "Sie müssen aus einem Backup zurückgeholt werden.",
          "Sie werden an alle weitergeleitet.",
        ],
        richtig: 1,
        erklaerung: "Das Postfach liegt auf dem Server. Das Profil ist nur die Verbindung dorthin. (Ausnahme: lokale PST-Archive – die bleiben eigene Dateien.)",
      },
    ],
    fall: {
      titel: "Teams funktioniert bei mehreren nicht",
      situation: "Innerhalb einer halben Stunde melden sich fünf Kolleginnen aus zwei Standorten: Teams-Anrufe lassen sich nicht annehmen, Meetings hängen. Es betrifft Windows- und Mac-Geräte.",
      optionen: [
        { text: "Ich lasse jede Person den Teams-Cache leeren.", feedback: "Bei fünf Betroffenen an zwei Standorten und verschiedenen Geräten liegt die Ursache sehr wahrscheinlich nicht lokal. Du verlierst Zeit." },
        { text: "Ich prüfe IT-Meldungen und den Microsoft-Dienststatus, erfasse den Umfang und melde den Fall zentral – dann informiere ich die Betroffenen.", feedback: "Genau. Verschiedene Geräte und Standorte sprechen für eine zentrale Ursache. So sparst du allen unnötige lokale Versuche." },
        { text: "Ich warte, bis sich weitere melden.", feedback: "Das ist zu passiv. Den Umfang festzustellen und zu melden gehört sofort zu deinen Aufgaben." },
      ],
      beste: 1,
    },
  },

  /* =====================================================================
     9 · Fernzugriff, VPN und Drucken
     ===================================================================== */
  {
    id: "fernzugriff",
    nr: 9,
    titel: "Fernzugriff, VPN und Drucken",
    kurz: "Wie man von außen ins Firmennetz kommt, wie man sicher aus der Ferne hilft – und warum Drucker so oft zicken.",
    minuten: 9,
    gruppe: "technik",
    farbe: "#2dd4bf",
    icon: "i-terminal",
    abschnitte: [
      {
        titel: "Drei Wege – und was sie unterscheidet",
        diagramm: "fernzugriff",
        text: "Alles, was „aus der Ferne“ heißt, ist eines von drei Dingen. Sie werden gern verwechselt:\n\n- **[[VPN]]** verbindet den Rechner einer Mitarbeiterin sicher mit dem Firmennetz. Danach funktionieren Netzlaufwerke, interne Webseiten und Programme wie im Büro. Du siehst dabei nicht in ihren Rechner.\n- **[[RDP]] (Remotedesktop)** zeigt dir den Bildschirm eines anderen Rechners, zum Beispiel eines Servers oder des Büro-PCs, und lässt dich dort arbeiten. Am Arbeitsplatz-PC wird die Sitzung der Person vor Ort dabei getrennt.\n- **[[Remoteunterstützung]]** teilt den Bildschirm des Benutzers. Ihr seht und steuert gemeinsam – er sitzt dabei und muss zustimmen.",
        merke: "Frag zuerst: Soll die Person nur ins Firmennetz kommen (VPN), brauche ich einen anderen Rechner (RDP) oder soll ich ihr an ihrem eigenen Bildschirm helfen (Remoteunterstützung)?",
      },
      {
        titel: "VPN-Probleme eingrenzen",
        text: "Meldet jemand „Ich komme nicht an die Laufwerke“, zerlege die Frage:\n\n- **Gibt es Internet?** Ohne Internet gibt es kein VPN. Öffne im Browser eine beliebige Webseite.\n- **Ist das VPN verbunden?** Die Statusanzeige des VPN-Programms zeigt es.\n- **Betrifft es eine Person oder viele?** Bei vielen liegt die Ursache oft zentral am VPN-Zugang, nicht am einzelnen Rechner.\n- **Hat sich am Konto etwas geändert?** Ein neues Passwort, ein abgelaufenes Zertifikat oder ein gesperrtes Konto lassen die VPN-Anmeldung scheitern. Das Anmeldeproblem steckt dann hinter dem VPN-Problem.\n- **Hotel- oder Café-WLAN?** Manche öffentlichen Netze blockieren VPN. Ein mobiler Hotspot ist ein guter Gegentest.\n\nWelche VPN-Software eure Firma einsetzt und wie der Zugang freigeschaltet wird, steht im Verfahren eures Betriebs.",
        merke: "Zeigt das VPN „verbunden“, aber interne Seiten lassen sich nicht öffnen, liegt es oft an der Namensauflösung ([[DNS]]) oder an einer Regel. Schreib genau das ins Ticket.",
      },
      {
        titel: "Sicher aus der Ferne helfen",
        text: "Fernzugriff ist mächtig – deshalb gelten feste Regeln:\n\n- **Zustimmung zuerst.** Ruf an, erkläre, was du tust, und lass die Person zustimmen, bevor du etwas siehst oder steuerst.\n- **Nur das Nötige.** Bitte darum, fremde und private Fenster zu schließen, bevor ihr den Bildschirm teilt.\n- **Die Verbindung nicht abschneiden.** Starte nie den Netzwerkadapter des Rechners neu und ändere keine Netzwerkeinstellungen, über die du gerade verbunden bist – danach kommst du nicht mehr drauf.\n- **Neustarts ankündigen.** Damit nichts Ungespeichertes verloren geht.\n- **Aufschreiben.** Im Ticket steht, dass du aus der Ferne zugegriffen hast und warum.\n\nWelches Werkzeug erlaubt ist, bestimmt euer Betrieb. Nimm nie ein privates Programm.",
      },
      {
        titel: "Drucken – der Weg eines Auftrags",
        diagramm: "drucken",
        text: "Ein Druckauftrag geht durch mehrere Stationen. Bricht eine, kommt kein Papier – aber an unterschiedlicher Stelle:\n\n- **Programm und [[Treiber]]:** Das Dokument wird für das Druckermodell übersetzt. Ein falscher oder beschädigter Treiber ergibt Fehler oder Zeichensalat.\n- **[[Spooler]] (Warteschlange):** Der Auftrag wartet hier auf seinen Druck. Ein **hängender Auftrag** blockiert oft alles dahinter.\n- **Netzwerk:** Der Drucker muss erreichbar sein – direkt oder über den [[Druckserver]].\n- **Drucker selbst:** Papier, Toner, Papierstau, Display-Meldung, „offline“.",
        merke: "Die beste Eingrenzung sind drei Fragen: Druckt es aus einem anderen Programm? Auf einen anderen Drucker? Bei einer anderen Person? Aus den Antworten ergibt sich, welches Glied der Kette nicht funktioniert.",
      },
      {
        titel: "Typische Druckerfälle",
        text: "- **Nur eine Person kann nicht drucken:** Warteschlange am Rechner ansehen, prüfen, ob der richtige Drucker als Standard gewählt ist, Treiber und Verbindung zum Druckserver kontrollieren.\n- **Alle am selben Drucker nicht:** Dann liegt es am Drucker (Strom, Netzwerkkabel, Display) oder am Druckserver. Mehrere Betroffene melden die Störung sofort zentral.\n- **Ein Auftrag hängt fest:** Erst nur diesen Auftrag abbrechen. Hilft das nicht, den Druckspooler-Dienst neu starten. Dabei gehen die wartenden Aufträge dieses Rechners verloren – kündige das kurz an.\n- **Drucker steht auf „offline“:** Ist er wirklich aus oder nur in Windows als offline markiert? Ein Ping auf seine Adresse klärt das.",
      },
    ],
    befehle: [
      "Remoteunterstützung starten",
      "Remotedesktop-Verbindung öffnen",
      "Remoteverwaltung prüfen",
      "VPN-Verbindungen anzeigen",
      "Erreichbarkeit prüfen",
      "Installierte Drucker anzeigen",
      "Druckaufträge anzeigen",
      "Standarddrucker anzeigen",
      "Druckspooler-Dienst neu starten",
      "Druckwarteschlange leeren",
      "Testseite drucken",
    ],
    glossar: ["VPN", "RDP", "Remoteunterstützung", "Terminalserver", "Treiber", "Spooler", "Druckserver", "Netzlaufwerk"],
    quiz: [
      {
        frage: "Eine Mitarbeiterin im Homeoffice erreicht das Netzlaufwerk nicht, Webseiten im Browser laufen aber. Was prüfst du zuerst?",
        antworten: [
          "Ob der Drucker Papier hat.",
          "Ob das VPN verbunden ist.",
          "Ob Outlook aktuell ist.",
          "Ob der Bildschirm sauber ist.",
        ],
        richtig: 1,
        erklaerung: "Netzlaufwerke im Firmennetz sind von außen meist nur über VPN erreichbar. Läuft das Internet, aber das VPN ist nicht verbunden, fehlen genau diese Ziele.",
      },
      {
        frage: "Was unterscheidet die Remoteunterstützung von einem Remotedesktop (RDP)?",
        antworten: [
          "Es gibt keinen Unterschied.",
          "RDP funktioniert nur über ein Kabel.",
          "Bei der Remoteunterstützung sitzt der Benutzer dabei, stimmt zu und ihr seht denselben Bildschirm. Bei RDP arbeitest du in einer eigenen Sitzung auf dem anderen Rechner.",
          "Die Remoteunterstützung braucht weder Internet noch Zustimmung.",
        ],
        richtig: 2,
        erklaerung: "Bei der Remoteunterstützung arbeitet ihr gemeinsam am Bildschirm der Person. Bei RDP meldest du dich an einem anderen Rechner an und bekommst dort eine eigene Sitzung.",
      },
      {
        frage: "Du hilfst per Fernzugriff und willst den Netzwerkadapter des Rechners neu starten. Was passiert wahrscheinlich?",
        antworten: [
          "Die Verbindung bricht ab und du sperrst dich selbst aus.",
          "Nichts, der Fernzugriff bleibt bestehen.",
          "Der Drucker druckt danach schneller.",
          "Der Benutzer bekommt zusätzliche Rechte.",
        ],
        richtig: 0,
        erklaerung: "Der Fernzugriff läuft über genau diese Netzwerkverbindung. Wird sie getrennt, bricht auch deine Sitzung ab – und du erreichst den Rechner nicht mehr.",
      },
      {
        frage: "Ein einzelner defekter Druckauftrag blockiert die Warteschlange. Was ist ein sinnvoller erster Schritt?",
        antworten: [
          "Den Drucker austauschen.",
          "Windows neu installieren.",
          "Allen Benutzern neue Passwörter geben.",
          "Den hängenden Auftrag abbrechen und die Warteschlange prüfen.",
        ],
        richtig: 3,
        erklaerung: "Meist reicht es, den einen defekten Auftrag zu entfernen. Erst wenn das nicht hilft, folgt der Neustart des Spooler-Dienstes.",
      },
    ],
    fall: {
      titel: "Drucker im Großraumbüro",
      situation: "Mehrere Kolleginnen im 2. OG melden, dass der Netzwerkdrucker nichts ausgibt. Am Gerät steht „Bereit“. Auf den Rechnern stehen die Aufträge in der Warteschlange.",
      optionen: [
        { text: "Ich lasse jede Person den Drucker neu installieren.", feedback: "Das ist aufwendig und trifft die Ursache vermutlich nicht. Mehrere Betroffene am selben Drucker sprechen für etwas Zentrales." },
        { text: "Ich prüfe, ob der Drucker im Netz erreichbar ist und ob der Druckserver Aufträge annimmt, und melde den Fall zentral.", feedback: "Genau. Mehrere Betroffene und ein Drucker, der „Bereit“ meldet: Ein Blick auf Erreichbarkeit und Druckserver grenzt das Glied in der Kette ein, und die zentrale Meldung hilft allen anderen." },
        { text: "Ich lösche alle Aufträge und starte alle Rechner neu.", feedback: "Das löscht fremde Aufträge, kostet Arbeitszeit und ändert nichts an einer zentralen Ursache." },
      ],
      beste: 1,
    },
  },

  /* =====================================================================
     10 · Die Microsoft-Landkarte
     ===================================================================== */
  {
    id: "landkarte",
    nr: 10,
    titel: "Die Microsoft-Landkarte: wer macht was?",
    kurz: "Entra ID, Exchange, Intune, Defender: Was jedes System macht und wo du nachsiehst.",
    minuten: 9,
    gruppe: "welt",
    farbe: "#818cf8",
    icon: "i-compass",
    abschnitte: [
      {
        titel: "Microsoft 365 ist ein Paket, kein Programm",
        diagramm: "landkarte",
        text: "Hinter „Microsoft 365“ stecken viele einzelne Dienste, die zusammenarbeiten. Alles zusammen gehört zu eurem **[[Tenant]]** – dem abgetrennten Bereich eurer Firma bei Microsoft. Merk dir die Mitte der Karte:\n\n- **[[Entra ID]]** ist der Türsteher. Hier wird festgelegt, wer du bist, ob du mit [[MFA]] bestätigen musst und welche Gruppen und [[Lizenz|Lizenzen]] du hast.\n- **[[Exchange]]** kümmert sich um Mail, Kalender und [[Postfach|Postfächer]].\n- **Teams, SharePoint und OneDrive** sind Chat, Meetings und Dateien.\n- **[[Intune]]** verwaltet Geräte und Apps.\n- **[[Microsoft Defender|Defender]]** schützt vor Spam, Schadsoftware und Phishing.\n- **Das lokale [[Active Directory]]** liegt im Firmennetz und wird per [[Entra Connect]] mit der Cloud abgeglichen.\n\nFast jedes Problem in der Microsoft-Welt lässt sich einem dieser Kästen zuordnen. Damit weißt du, wo du nachsehen musst.",
      },
      {
        titel: "Azure AD, Entra ID – ist das dasselbe?",
        text: "**Ja.** Microsoft hat den Dienst „Azure Active Directory“ (kurz **Azure AD** oder AAD) im Jahr 2023 in **Microsoft Entra ID** umbenannt. Die Funktion ist dieselbe, nur der Name ist neu. Deshalb stehen in älteren Anleitungen, Fehlermeldungen und Skripten noch die alten Begriffe. „Azure AD Join“ und „Entra Join“ sind dasselbe.\n\nDrei Namen, die oft verwechselt werden:\n\n- **[[Active Directory]] (AD):** das klassische Verzeichnis **im Firmennetz**, auf Servern der Firma.\n- **[[Entra ID]]:** das Verzeichnis **in der Cloud** für Microsoft 365 – früher Azure AD.\n- **Azure:** Microsofts Cloud-Plattform für Server und Datenbanken. Wenn im Helpdesk von „Azure AD“ die Rede ist, ist fast nie Azure als Plattform gemeint, sondern der Verzeichnisdienst.",
        merke: "Liest oder hörst du „Azure AD“, übersetze im Kopf: Entra ID. Das lokale Verzeichnis im Firmennetz heißt weiterhin Active Directory.",
      },
      {
        titel: "Wohin für was? Die Verwaltungsportale",
        diagramm: "portale",
        text: "Jedes System hat seine eigene Verwaltungsoberfläche im Browser, ein [[Admin Center]]. Typische Adressen (deine Firma kann abweichen):\n\n- **Microsoft 365 Admin Center** – `admin.microsoft.com`: Benutzer, Lizenzen, Dienststatus, Meldungen\n- **Entra Admin Center** – `entra.microsoft.com`: Anmeldung, MFA, Geräte, Gruppen\n- **Exchange Admin Center (EAC)** – `admin.exchange.microsoft.com`: Postfächer, Verteilerlisten, Nachrichtenablaufverfolgung\n- **Microsoft Defender Portal** – `security.microsoft.com`: Quarantäne, Phishing, Bedrohungen\n- **Intune Admin Center** – `intune.microsoft.com`: Geräte, Apps, Konformität\n- **Teams Admin Center** – `admin.teams.microsoft.com`: Teams-Einstellungen und Anrufe\n\nWas du dort siehst und ändern darfst, hängt von deiner **[[Admin-Rolle|Rolle]]** ab. Fehlt ein Knopf, ist das meist gewollt und kein Fehler.",
        merke: "Nicht jeder im Helpdesk hat Zugriff auf jedes Portal. Fehlt dir das Recht, gib den Fall mit allen Angaben an die nächste Stufe weiter. Du musst nichts umgehen.",
      },
      {
        titel: "Liegt es an Microsoft oder an uns?",
        text: "Im Microsoft 365 Admin Center zeigt der **Dienststatus**, ob Microsoft gerade eine Störung bei einem Dienst meldet. Das **Nachrichtencenter** kündigt Änderungen an. Wer die nötige Rolle hat, schaut dort nach, bevor er lange lokal sucht.\n\nBei einem Cloud-Problem hilft diese Reihenfolge:\n\n- **Zuerst:** Betrifft es nur eine Person oder mehrere?\n- **Dann:** Läuft es im Browser (Web-Test)?\n- **Dann:** Gibt es eine Störungsmeldung von Microsoft?\n- **Erst danach:** Konto, Lizenz und der einzelne Rechner.",
      },
    ],
    befehle: [
      "Lizenzen eines Benutzers anzeigen",
      "Geräte-Join-Status anzeigen",
      "Anmeldenamen (UPN) anzeigen",
      "Mit Microsoft Graph verbinden",
      "Mit Exchange Online verbinden",
      "Office-Version anzeigen",
    ],
    glossar: ["Entra ID", "Active Directory", "Exchange", "Intune", "Microsoft Defender", "Entra Connect", "Admin Center", "Tenant", "Admin-Rolle", "Lizenz", "MFA"],
    quiz: [
      {
        frage: "Ein Kollege sagt: „Das ist ein Azure-AD-Problem.“ Was ist damit gemeint?",
        antworten: [
          "Ein Problem mit dem lokalen Domänencontroller im Keller.",
          "Ein Problem mit Microsoft Entra ID – so hieß der Dienst früher.",
          "Ein Problem mit dem Drucker.",
          "Ein Problem mit dem WLAN-Router.",
        ],
        richtig: 1,
        erklaerung: "Azure AD wurde 2023 in Microsoft Entra ID umbenannt. Das Verzeichnis im Firmennetz heißt weiterhin Active Directory.",
      },
      {
        frage: "Wo findest du Mails, die der Mailfilter zentral zurückgehalten hat?",
        antworten: [
          "Im Intune Admin Center.",
          "Im Teams Admin Center.",
          "In der Quarantäne im Microsoft Defender Portal.",
          "Im Entra Admin Center unter „Geräte“.",
        ],
        richtig: 2,
        erklaerung: "Verdächtige Mails liegen entweder im Junk-Ordner des Postfachs oder in der zentralen Quarantäne. Sie ist im Defender Portal zu sehen.",
      },
      {
        frage: "Eine neue Kollegin ist im lokalen Active Directory angelegt, in Teams aber noch nicht zu finden. Was ist eine wahrscheinliche Erklärung?",
        antworten: [
          "Der Abgleich zur Cloud (Entra Connect) läuft nur in Abständen und war noch nicht dran.",
          "Teams ist grundsätzlich gestört.",
          "Das Konto wurde schon wieder gelöscht.",
          "Der Drucker ist offline.",
        ],
        richtig: 0,
        erklaerung: "Konten werden aus dem lokalen AD in die Cloud kopiert – normalerweise alle 30 Minuten. Kurz warten ist oft die einfachste Lösung.",
      },
      {
        frage: "Welches System ist in der Microsoft-Welt der „Türsteher“ für Anmeldung, MFA und Gruppen?",
        antworten: [
          "Exchange Online",
          "SharePoint",
          "Microsoft Entra ID",
          "Der Druckspooler",
        ],
        richtig: 2,
        erklaerung: "Entra ID entscheidet, wer sich anmelden darf und welche Nachweise nötig sind. Exchange und SharePoint verlassen sich darauf.",
      },
    ],
    fall: {
      titel: "Wohin mit der Frage?",
      situation: "Eine Kollegin meldet: „Im Firmenportal steht mein Gerät als ‚nicht konform‘, und seitdem komme ich nicht mehr in Teams.“ Du willst herausfinden, wo die Ursache liegt.",
      optionen: [
        { text: "Ich suche in Exchange das Postfach der Kollegin.", feedback: "Exchange ist für Mail und Postfächer zuständig. „Nicht konform“ ist ein Gerätezustand und gehört zu Intune." },
        { text: "Ich sehe in Intune den Gerätezustand und die Gründe an – oder gebe den Fall mit allen Angaben weiter, wenn mir dazu das Recht fehlt.", feedback: "Genau. Die Konformität prüft Intune. Dass dadurch Teams blockiert wird, kommt von einer Zugriffsregel in Entra ID – mehr dazu im nächsten Modul." },
        { text: "Ich lasse die Kollegin ihr Passwort ändern.", feedback: "Das Passwort ist nicht das Problem. Der Gerätezustand entscheidet, und den ändert ein neues Passwort nicht." },
      ],
      beste: 1,
    },
  },

  /* =====================================================================
     11 · Identität
     ===================================================================== */
  {
    id: "identitaet",
    nr: 11,
    titel: "Identität: Anmeldung, Sync und Zugriffsregeln",
    kurz: "Wie Konto, Passwort und MFA zusammenspielen – im Firmennetz, in der Cloud und dazwischen.",
    minuten: 10,
    gruppe: "welt",
    farbe: "#e879f9",
    icon: "i-key",
    abschnitte: [
      {
        titel: "Zwei Verzeichnisse – eine Identität",
        diagramm: "hybrid",
        text: "In vielen Firmen gibt es **zwei Verzeichnisse**: das lokale [[Active Directory]] im Firmennetz und [[Entra ID]] in der Cloud. Damit eine Person trotzdem nur ein Konto hat, kopiert [[Entra Connect]] Konten, Gruppen und Eigenschaften aus dem AD in die Cloud. Man nennt das eine [[Hybrid-Umgebung]]. Der Abgleich läuft normalerweise **alle 30 Minuten**.\n\nDaraus folgt:\n\n- Eine Änderung im lokalen AD (neues Konto, geänderte Gruppe) ist in der Cloud **nicht sofort** sichtbar.\n- Es gilt: **Dort ändern, wo das Konto herkommt.** Synchronisierte Konten werden im lokalen AD geändert. In der Cloud ist so eine Änderung meist gesperrt oder geht verloren. Reine Cloud-Konten werden dagegen direkt in Entra ID gepflegt.",
        merke: "Fragt jemand „Wo ändere ich das?“, ist die Gegenfrage: Wird das Konto aus dem lokalen AD synchronisiert? Dann dort ändern – und rund 30 Minuten warten.",
      },
      {
        titel: "Passwort, MFA und Anmeldung in der Cloud",
        text: "Beim Anmelden bei Microsoft 365 prüft Entra ID das Passwort (oder lässt es lokal prüfen) und verlangt oft einen zweiten Nachweis – [[MFA]]. Danach erhält das Gerät einen Anmelde-Token, damit nicht jedes Programm neu fragt ([[Single Sign-On|Single Sign-on]]).\n\nWichtige Begriffe:\n\n- **[[UPN]]:** der Anmeldename im Mailformat. Er kann von der Mailadresse abweichen – vergleiche beide, bevor du ein Passwortproblem vermutest.\n- **[[Authenticator]]:** die App, in der MFA bestätigt wird. Neues Handy? Dann muss die Methode neu eingerichtet werden – über einen geprüften Ablauf, nie „mal eben“ am Telefon.\n- **[[Self-Service-Passwortreset|Self-Service-Passwortreset]]:** Benutzer setzen ihr Passwort selbst zurück, wenn sie sich vorher mit eingerichteten Methoden ausweisen. Das spart Anrufe – aber nur, wenn die Methoden vorher hinterlegt wurden.\n- **[[Smart Lockout]]:** Entra ID sperrt die Anmeldung kurzzeitig, wenn zu viele falsche Versuche kommen – auch dann, wenn jemand Fremdes rät.",
      },
      {
        titel: "Conditional Access: Regeln bei jeder Anmeldung",
        diagramm: "condacc",
        text: "Mit [[Conditional Access]] (auf Deutsch „Bedingter Zugriff“) legt die Firma Regeln fest, die bei **jeder Anmeldung** geprüft werden: Wer meldet sich an, von welchem Land, mit welchem Gerät, bei welcher App? Je nachdem wird zugelassen, **MFA** verlangt oder **blockiert**.\n\nWas das für dich bedeutet:\n\n- Passwort und MFA stimmen, aber die Anmeldung scheitert? Dann blockiert oft eine **Regel** – etwa wegen des Standorts oder weil das Gerät nicht [[Gerätekonformität|konform]] ist.\n- Die Fehlermeldung nennt häufig einen Text wie „Ihr Administrator hat den Zugriff blockiert“ oder einen **Fehlercode** (AADSTS…). Schreib den Code wörtlich ins Ticket.\n- Regeln änderst du **nie selbst**. Sie schützen die ganze Firma. Gib den Fall mit Code, Uhrzeit, Benutzer, Gerät und Standort weiter.",
      },
      {
        titel: "Rollen: warum du nicht alles darfst",
        text: "Admin-Rechte in Microsoft 365 hängen an **[[Admin-Rolle|Rollen]]**. Es gibt zum Beispiel eine Rolle für Passwort-Zurücksetzen, eine für Exchange und eine für Intune. Jede Person bekommt nur die Rollen, die sie braucht – das **Prinzip der minimalen Rechte**.\n\n- Fehlt dir ein Menüpunkt oder eine Schaltfläche, liegt es an der Rolle und nicht an einem Fehler.\n- Brauchst du mehr Rechte für eine Aufgabe, bekommst du sie über den Freigabeprozess. Du leihst dir nie Zugangsdaten anderer.\n- Konten mit Admin-Rollen sind besonders wertvolle Ziele. Wer ein Admin-Konto übernimmt, kann viel Schaden anrichten – melde jeden Verdacht sofort.",
      },
      {
        titel: "Typische Anmeldeprobleme – wo schaust du?",
        text: "- **„Konto gesperrt“ bei einem lokalen Konto** → im Active Directory prüfen: gesperrt? Passwort abgelaufen? Danach die Sperrquelle klären.\n- **„Konto vorübergehend gesperrt“ in der Cloud** → [[Smart Lockout]]. Kurz warten und nicht weiter probieren lassen. Oft rät jemand anderes.\n- **MFA-Abfrage kommt nicht an** → Handy online? Authenticator-App aktuell? Handy gewechselt? Methode im geprüften Ablauf neu einrichten.\n- **Anmeldung scheitert nur an einem Gerät** → Gerätezustand und Uhrzeit prüfen (`dsregcmd /status`, Zeitabweichung).\n- **Eine Änderung erscheint nicht in Microsoft 365** → Abgleich von Entra Connect abwarten oder prüfen lassen.",
        merke: "Immer klären: Passt das **Konto** (lokal oder Cloud), passt das **Gerät**, passt die **Regel**?",
      },
    ],
    befehle: [
      "Benutzerkonto im Active Directory anzeigen",
      "Gesperrte Konten finden",
      "Sperrquelle eines Kontos finden",
      "Passwortablauf eines Benutzers anzeigen",
      "Konto entsperren",
      "Geräte-Join-Status anzeigen",
      "Anmeldenamen (UPN) anzeigen",
      "Verzeichnis-Synchronisierung prüfen",
      "Zeitabweichung zur Domäne prüfen",
      "MFA-Methoden anzeigen",
    ],
    glossar: ["Entra ID", "Active Directory", "Entra Connect", "Hybrid-Umgebung", "MFA", "Authenticator", "Self-Service-Passwortreset", "Single Sign-On", "UPN", "Smart Lockout", "Conditional Access", "Gerätekonformität", "Admin-Rolle"],
    quiz: [
      {
        frage: "Eine Mitarbeiterin wurde im lokalen Active Directory einer neuen Gruppe hinzugefügt. Nach fünf Minuten ist der Zugriff in der Cloud noch nicht da. Was ist die wahrscheinlichste Erklärung?",
        antworten: [
          "Sie hat ein falsches Passwort.",
          "Teams ist grundsätzlich kaputt.",
          "Der Bildschirm ist zu klein.",
          "Der Abgleich zur Cloud läuft nur in Abständen (normalerweise alle 30 Minuten) und war noch nicht dran.",
        ],
        richtig: 3,
        erklaerung: "Änderungen im lokalen AD kommen erst mit dem nächsten Abgleich von Entra Connect in der Cloud an.",
      },
      {
        frage: "Passwort und MFA stimmen, die Anmeldung wird aber mit „Zugriff blockiert“ abgelehnt. Woran liegt das häufig?",
        antworten: [
          "An einem Papierstau im Drucker.",
          "An einer Zugriffsregel (Conditional Access), zum Beispiel wegen Gerät oder Standort.",
          "An der Bildschirmauflösung.",
          "An einem zu langen Benutzernamen.",
        ],
        richtig: 1,
        erklaerung: "Conditional Access prüft bei jeder Anmeldung zusätzliche Bedingungen. Auch mit richtigem Passwort kann eine Regel den Zugriff blockieren.",
      },
      {
        frage: "Ein Konto wird aus dem lokalen AD synchronisiert. Wo änderst du es am besten?",
        antworten: [
          "Im lokalen Active Directory, denn dort liegt die Quelle.",
          "Nur in der Cloud, das lokale AD ist egal.",
          "Gar nicht – synchronisierte Konten kann niemand ändern.",
          "Im Druckerportal.",
        ],
        richtig: 0,
        erklaerung: "Bei synchronisierten Konten bestimmt das lokale AD die Werte. Der Abgleich übernimmt sie in die Cloud; eine Änderung dort ist meist gesperrt oder geht verloren.",
      },
      {
        frage: "Im Portal fehlt dir eine Schaltfläche. Was ist richtig?",
        antworten: [
          "Mit dem Admin-Konto einer Kollegin anmelden.",
          "Das Konto des Benutzers löschen.",
          "Prüfen, ob deine Rolle das erlaubt, und den Fall sonst über den Freigabeprozess weitergeben – nie fremde Zugangsdaten leihen.",
          "Den Rechner neu installieren.",
        ],
        richtig: 2,
        erklaerung: "Fehlende Schaltflächen sind meist gewollt, weil die Rolle nicht reicht. Rechte holt man sich über den vorgesehenen Weg.",
      },
    ],
    fall: {
      titel: "Gesperrt – aber nicht lokal",
      situation: "Ein Außendienstler meldet: „Ich komme seit heute früh nicht mehr in Microsoft 365 – ‚Konto vorübergehend gesperrt‘.“ Im lokalen Active Directory ist sein Konto nicht gesperrt.",
      optionen: [
        { text: "Ich entsperre das Konto im Active Directory.", feedback: "Dort ist nichts gesperrt, der Befehl ändert nichts. Die Meldung kommt aus der Cloud (Smart Lockout)." },
        { text: "Ich lasse ihn kurz warten und nicht weiter probieren, frage nach auffälligen Mails oder Anmeldungen und melde einen möglichen Angriff über den Sicherheitsweg.", feedback: "Genau. Smart Lockout greift oft, weil jemand anderes Passwörter ausprobiert. Wiederholtes Versuchen hilft nicht, und der Verdacht gehört gemeldet." },
        { text: "Ich setze sein Passwort auf ein einfaches Standardpasswort.", feedback: "Ein Standardpasswort ist gefährlich, wenn gerade jemand rät. Ein Reset gehört in den geprüften Ablauf mit Identitätsprüfung." },
      ],
      beste: 1,
    },
  },

  /* =====================================================================
     12 · Exchange und EAC
     ===================================================================== */
  {
    id: "exchange",
    nr: 12,
    titel: "Exchange und EAC: Postfächer und Mailfluss",
    kurz: "Was Exchange Online macht, was das EAC ist – und warum Mails nicht ankommen.",
    minuten: 10,
    gruppe: "welt",
    farbe: "#fb7185",
    icon: "i-message",
    abschnitte: [
      {
        titel: "Exchange Online und das EAC",
        text: "**[[Exchange]] Online** ist der Mailserver in der Cloud: Dort liegen Postfächer, Kalender und Kontakte aller Benutzer. Outlook, die Mail-App und Outlook im Web ([[OWA]]) sind nur verschiedene Fenster auf dasselbe [[Postfach]].\n\nDas **EAC** (Exchange Admin Center) ist die Verwaltungsoberfläche dazu. Je nach Rolle findest du dort:\n\n- **Empfänger:** Postfächer, freigegebene Postfächer, Verteilerlisten\n- **Mailfluss:** Nachrichtenablaufverfolgung, Regeln, Connectors\n- **Berichte** zu Mailverkehr und Postfächern\n\nBenutzerkonto, Passwort, MFA und Lizenz gehören **nicht** ins EAC, sondern zu Entra ID und zum Microsoft 365 Admin Center. Das Postfach ist das Ziel, das Konto die Eintrittskarte.",
      },
      {
        titel: "Welche Art von Postfach ist das?",
        text: "Nicht alles mit einer Mailadresse ist ein normales Postfach. Die Art bestimmt, was möglich ist:\n\n- **Benutzerpostfach:** gehört einer Person und braucht eine Lizenz.\n- **[[Freigegebenes Postfach]] (Shared Mailbox):** gehört einem Team, zum Beispiel info@. Mitarbeitende bekommen **Vollzugriff** und „Senden als“. Man meldet sich nicht direkt daran an, sondern öffnet es mit dem eigenen Konto. Eine Lizenz braucht es nur in Sonderfällen, etwa bei sehr großem Postfach, Archiv oder Aufbewahrungssperre.\n- **Raum- und Gerätepostfach:** zum Buchen von Räumen oder Geräten.\n- **[[Verteilerliste]]:** eine Adresse, die an mehrere Personen verteilt. Sie hat kein eigenes Postfach.\n- **Microsoft-365-Gruppe:** gemeinsame Adresse samt Teams, Dateien und Kalender.\n\nBei jeder Meldung zu einem „Gruppenpostfach“ lautet die erste Frage: Welche Art ist es genau? Der Befehl „Postfachtyp anzeigen“ verrät es.",
        merke: "„Mail an die Gruppe kommt nicht an“ kann vier verschiedene Dinge bedeuten. Kläre erst die Art, dann die Berechtigung.",
      },
      {
        titel: "Wie eine Mail ihren Weg nimmt",
        diagramm: "mailfluss",
        text: "Schickt jemand von außen eine Mail an name@firma.de, passiert Folgendes:\n\n- Der Absender-Server fragt im [[DNS]] nach dem **[[MX-Eintrag]]** der Domäne. Er verrät, an welchen Server die Mail geliefert wird – bei Microsoft 365 ein Name unter `mail.protection.outlook.com`.\n- Dort prüft der **Mailfilter** (Exchange Online Protection, Teil von [[Microsoft Defender|Defender]]) auf Spam, Schadsoftware und Phishing. Verdächtiges landet im Junk-Ordner oder in der **[[Quarantäne]]**.\n- Im [[Postfach]] greifen **Regeln und Weiterleitungen** des Benutzers. Erst dann zeigt Outlook die Mail.\n\nZerlege „Mail kommt nicht an“ deshalb in Teilfragen: Hat sie den Server erreicht? Hat der Filter sie zurückgehalten? Hat eine Regel sie verschoben?",
        merke: "Die **[[Nachrichtenablaufverfolgung]]** im EAC zeigt für eine bestimmte Mail jeden Schritt samt Status – zugestellt, in Quarantäne, abgelehnt oder noch in der Warteschlange. Sie beendet viel Rätselraten.",
      },
      {
        titel: "Unzustellbar: den Fehlercode lesen",
        diagramm: "ndr",
        text: "Kann eine Mail nicht zugestellt werden, schickt der Server dem Absender eine **Unzustellbarkeitsnachricht** (NDR). Darin steht ein Code, der beste Hinweis auf die Ursache. Die erste Ziffer **5** heißt: dauerhafter Fehler – nochmal senden ändert nichts.\n\n- **5.1.1 / 5.1.10:** Empfängeradresse falsch oder nicht gefunden. Tippfehler? Alte Adresse im Outlook-Vorschlagsspeicher?\n- **5.4.1:** Der Zielserver lehnt die Empfängeradresse ab, weil es sie dort nicht gibt.\n- **5.7.1:** nicht berechtigt. Zum Beispiel darf nur eine bestimmte Gruppe an diese Verteilerliste schreiben, oder eine Regel hat die Mail blockiert.\n- **5.1.8:** Der Absender wurde wegen sehr vieler Spam-Mails gesperrt. Das ist meist ein **gehacktes Konto** – sofort an die Sicherheitsstelle melden. Entsperrt wird erst, nachdem das Konto gesichert ist.\n- **5.2.122:** Der Empfänger hat zu viele Mails pro Stunde bekommen. Später erneut senden.\n- **5.4.14 / 5.4.6:** Mailschleife, oft durch eine falsch gesetzte Weiterleitung.\n\nDie genaue Bedeutung findest du im Wortlaut der Nachricht. Gib den Code immer wörtlich weiter.",
      },
      {
        titel: "Spam, Quarantäne und gefälschte Absender",
        text: "Zwei Fälle, die oft verwechselt werden:\n\n- **Eingehend – eine erwartete Mail fehlt:** Prüfe zuerst den Junk-Ordner, dann die Quarantäne im Defender Portal, dann die Nachrichtenablaufverfolgung. Benutzer können vieles in der Quarantäne selbst freigeben. Mails mit Schadsoftware oder als sehr sicheres Phishing erkannte Mails darf dagegen **nur ein Admin** freigeben. Eine freigegebene Mail erscheint mit dem Zeitpunkt der Freigabe im Postfach.\n- **Ausgehend – Mails der Firma landen beim Empfänger im Spam:** Dann stimmt oft etwas bei **[[SPF / DKIM / DMARC|SPF, DKIM und DMARC]]** nicht. Das sind drei Einträge im DNS, mit denen eine Domäne beweist, dass ihre Mails wirklich von ihr stammen.\n\nGib eine Mail nie vorschnell frei. Wirkt der Absender unbekannt oder drängt die Mail zu einer Handlung, behandle sie als [[Phishing]]-Verdacht und nutze die Meldewege eures Betriebs.",
      },
      {
        titel: "Weiterleitungen: ein beliebter Angriffsweg",
        text: "Wird ein Konto gehackt, richten Angreifer oft heimlich eine **Weiterleitungsregel** an eine fremde Adresse ein, um mitzulesen. Bei Verdacht auf ein gehacktes Konto gehört deshalb immer die Prüfung von Regeln und Weiterleitungen dazu (siehe Befehle unten).\n\nFindest du eine unbekannte Weiterleitung nach außen, **löschst du sie nicht selbst**, sondern meldest sie sofort der Sicherheitsstelle. Sonst gehen Beweise verloren.",
        merke: "Gehacktes Konto heißt: nichts verändern, was Spuren löscht – erst melden, dann nach Anweisung handeln.",
      },
    ],
    befehle: [
      "Mit Exchange Online verbinden",
      "Nachrichtenverfolgung",
      "Quarantäne-Nachrichten anzeigen",
      "Postfachtyp anzeigen",
      "E-Mail-Adressen eines Postfachs anzeigen",
      "Postfachberechtigungen anzeigen",
      "Postfachgröße anzeigen",
      "Weiterleitungsregeln eines Postfachs prüfen",
      "Postfach-Weiterleitung prüfen",
      "MX-Einträge einer Domäne anzeigen",
      "SPF-Eintrag einer Domäne anzeigen",
      "DMARC-Eintrag einer Domäne anzeigen",
    ],
    glossar: ["Exchange", "Postfach", "Freigegebenes Postfach", "Verteilerliste", "OWA", "Quarantäne", "Nachrichtenablaufverfolgung", "SMTP-Fehlercode", "MX-Eintrag", "SPF / DKIM / DMARC", "Microsoft Defender", "Stellvertretung", "Admin Center"],
    quiz: [
      {
        frage: "Eine Mail an info@firma.de kommt nicht an. Mit welchem Werkzeug im EAC siehst du, was mit der Mail passiert ist?",
        antworten: [
          "Datenträgerverwaltung",
          "Nachrichtenablaufverfolgung",
          "Geräte-Manager",
          "Task-Manager",
        ],
        richtig: 1,
        erklaerung: "Die Nachrichtenablaufverfolgung zeigt den Weg und Status einer Mail: zugestellt, in Quarantäne, abgelehnt oder in der Warteschlange.",
      },
      {
        frage: "Eine Unzustellbarkeitsnachricht enthält den Code 5.1.8 („bad outbound sender“). Was bedeutet das und was ist zu tun?",
        antworten: [
          "Die Empfängeradresse ist falsch – einfach neu senden.",
          "Der Drucker ist offline.",
          "Die Mail war zu kurz.",
          "Der Absender wurde wegen Spamverdachts gesperrt – meist ein gehacktes Konto. Sofort an die Sicherheitsstelle melden.",
        ],
        richtig: 3,
        erklaerung: "5.1.8 bedeutet, dass der Absender zu viel Spam verschickt hat und gesperrt wurde. Die Ursache ist meist ein kompromittiertes Konto.",
      },
      {
        frage: "Welche Aussage zum freigegebenen Postfach (Shared Mailbox) stimmt?",
        antworten: [
          "Es braucht immer eine eigene Anmeldung mit Passwort.",
          "Es gehört einem Team; man öffnet es mit dem eigenen Konto über Vollzugriff und „Senden als“.",
          "Es ist dasselbe wie eine Verteilerliste.",
          "Es lässt sich nicht in Outlook öffnen.",
        ],
        richtig: 1,
        erklaerung: "Ein freigegebenes Postfach ist ein eigenes Postfach, das mehrere Personen über Berechtigungen nutzen. Eine Verteilerliste hat dagegen kein Postfach und verteilt nur.",
      },
      {
        frage: "Ein Benutzer vermisst eine erwartete Mail. In welcher Reihenfolge prüfst du sinnvoll?",
        antworten: [
          "Junk-Ordner, Quarantäne, Nachrichtenablaufverfolgung.",
          "Erst Windows neu installieren, dann Outlook löschen.",
          "Gar nicht – einfach warten.",
          "Zuerst den Drucker prüfen.",
        ],
        richtig: 0,
        erklaerung: "Vom Einfachen zum Aufwendigen: Der Junk-Ordner kostet Sekunden, die Quarantäne eine Minute, und die Nachrichtenablaufverfolgung zeigt den ganzen Weg.",
      },
      {
        frage: "Wer darf eine als Schadsoftware erkannte Mail aus der Quarantäne freigeben?",
        antworten: [
          "Jeder Benutzer mit einem Klick.",
          "Der Absender der Mail.",
          "Nur ein Administrator – Benutzer können das nicht.",
          "Niemand, die Mail wird sofort zugestellt.",
        ],
        richtig: 2,
        erklaerung: "Mails, die als Schadsoftware erkannt wurden, sind standardmäßig nur für Administratoren verfügbar. Das schützt vor versehentlichem Freigeben.",
      },
    ],
    fall: {
      titel: "Die Mail vom Kunden fehlt",
      situation: "Ein Vertriebsmitarbeiter wartet auf ein Angebot, das ein Kunde nach eigener Aussage vor einer Stunde geschickt hat. Im Posteingang ist nichts. Der Kunde hat keine Unzustellbarkeitsnachricht erhalten.",
      optionen: [
        { text: "Ich bitte den Kunden, die Mail noch zehnmal zu schicken.", feedback: "Das belastet alle Beteiligten und klärt nichts. Erst herausfinden, wo die Mail geblieben ist." },
        { text: "Ich lege eine Regel an, die alle Mails des Kunden immer in den Posteingang verschiebt.", feedback: "Das umgeht den Schutz, ohne die Ursache zu kennen, und kann Phishing durchlassen. Erst prüfen, warum die Mail zurückgehalten wurde." },
        { text: "Ich prüfe Junk-Ordner und Quarantäne und verfolge die Mail mit der Nachrichtenablaufverfolgung (Absender, Zeitraum). Freigeben würde ich sie nur, wenn der Absender plausibel ist.", feedback: "Genau. So findest du die Stelle im Mailweg, und die Freigabe ist ein bewusster Schritt nach der Prüfung." },
      ],
      beste: 2,
    },
  },

  /* =====================================================================
     13 · Geräte
     ===================================================================== */
  {
    id: "geraete",
    nr: 13,
    titel: "Geräte: Entra-Join, Intune und Firmenportal",
    kurz: "Wie ein Rechner zur Firma gehört, was „nicht konform“ heißt und woher Geräteprobleme kommen.",
    minuten: 9,
    gruppe: "welt",
    farbe: "#4ade80",
    icon: "i-sliders",
    abschnitte: [
      {
        titel: "Wie gehört ein Rechner zur Firma?",
        diagramm: "joinzustand",
        text: "Ein Firmenrechner ist auf unterschiedliche Weise mit der Firma „verbunden“ ([[Geräte-Join]]):\n\n- **Nur Domäne:** klassisch, nur im lokalen [[Active Directory]].\n- **Hybrid (Hybrid joined):** in der Domäne **und** in Entra ID bekannt. Verbreitet in Firmen, die lokal und Cloud mischen ([[Hybrid-Umgebung]]).\n- **Entra joined:** nur in Entra ID, ohne lokales AD. Typisch für neue, reine Cloud-Rechner.\n- **Registriert:** ein privates Gerät, auf dem ein Firmenkonto hinzugefügt wurde. Die Firma verwaltet es nur eingeschränkt.\n\nDen Zustand zeigt `dsregcmd /status`. Achte auf **AzureAdJoined**, **DomainJoined** und **WorkplaceJoined**. Der Befehl spricht noch von „Azure AD“, gemeint ist Entra ID.",
      },
      {
        titel: "Intune: die Geräteverwaltung",
        text: "[[Intune]] ist die Geräteverwaltung (MDM) von Microsoft. Es verteilt Einstellungen und Apps und prüft, ob Geräte die Vorgaben erfüllen.\n\n- **Einstellungen:** Intune setzt zum Beispiel WLAN-Profile, Verschlüsselung und Sperrbildschirm.\n- **Apps:** Programme erscheinen im **Firmenportal**, dem App-Katalog der Firma. Benutzer installieren dort selbst.\n- **Konformität:** Intune prüft Vorgaben wie „Festplatte verschlüsselt“ oder „Windows aktuell“. Das Ergebnis heißt [[Gerätekonformität|konform oder nicht konform]].\n- **[[Autopilot]]:** Neue Geräte richten sich über das Internet selbst für die Firma ein.\n\nProbleme „im Firmenportal“ betreffen meist fehlende Apps, noch nicht angekommene Richtlinien oder einen nicht konformen Zustand.",
      },
      {
        titel: "Nicht konform heißt oft: Zugriff weg",
        text: "Die Firma kann festlegen, dass nur **konforme** Geräte auf Mail, Teams und Dateien zugreifen. Umgesetzt wird das durch [[Conditional Access]] in Entra ID – die Konformität selbst kommt aus Intune. Daher die typische Meldung „Ihr Gerät erfüllt die Vorgaben nicht“ oder ein Zugriffsfehler nach der Anmeldung.\n\nSo gehst du vor:\n\n- **Grund finden:** Im Firmenportal oder in Intune steht, welche Vorgabe fehlt – meist ein fehlendes Update, eine fehlende Verschlüsselung ([[BitLocker]]) oder ein zu altes Windows.\n- **Beheben statt umgehen:** Update einspielen, Verschlüsselung abschließen, neu starten und danach im Firmenportal den Status aktualisieren lassen. Es kann etwas dauern, bis der neue Zustand in der Cloud ankommt.\n- **Nie Regeln lockern.** Ausnahmen für ein einzelnes Gerät entscheidet die Sicherheitsstelle, nicht der Helpdesk.",
        merke: "Geräteprobleme sind selten „nur ein Rechnerproblem“: Konto, Gerätezustand und Zugriffsregel spielen zusammen.",
      },
      {
        titel: "Typische Geräteprobleme",
        text: "- **Anmeldung am Rechner klappt, in der Cloud kommt kein Zugriff:** `dsregcmd /status` prüfen – gibt es einen Cloud-Token (Block „SSO State“)? Stimmen Uhrzeit und Netzverbindung?\n- **Eine Richtlinie kommt nicht an:** Neustart und etwas Geduld lösen viel. Lokale Richtlinien zeigen die Befehle unten; Richtlinien aus Intune brauchen Zeit.\n- **„Vertrauensstellung zur Domäne fehlgeschlagen“:** Das Rechnerkonto im lokalen AD passt nicht mehr zum Rechner. Die Reparatur ist ein Fall für Berechtigte.\n- **Gerät doppelt in Entra ID oder falsch zugeordnet:** Nicht selbst löschen – Berechtigte prüfen das, weil dabei Zugriffe verloren gehen können.\n- **Neuer Rechner ohne Zugriff auf Firmen-Apps:** Hat er seine Einrichtung (Autopilot) abgeschlossen?",
      },
    ],
    befehle: [
      "Geräte-Join-Status anzeigen",
      "Anmeldenamen (UPN) anzeigen",
      "Gruppenrichtlinien aktualisieren",
      "Computerrichtlinien anzeigen",
      "Zeitdienst-Status anzeigen",
      "BitLocker-Status anzeigen",
      "TPM-Status anzeigen",
      "Windows-Version und Build anzeigen",
      "Installierte Updates anzeigen",
      "Seriennummer auslesen",
      "Defender-Status anzeigen",
    ],
    glossar: ["Intune", "Geräte-Join", "Hybrid-Umgebung", "Gerätekonformität", "Autopilot", "Conditional Access", "BitLocker", "TPM", "Gruppenrichtlinie", "Vertrauensstellung", "Entra ID"],
    quiz: [
      {
        frage: "dsregcmd /status zeigt „DomainJoined: YES“ und „AzureAdJoined: YES“. Was bedeutet das?",
        antworten: [
          "Der Rechner ist ein privates Handy.",
          "Der Rechner ist nur in der Cloud.",
          "Der Rechner ist hybrid: in der lokalen Domäne und in Entra ID bekannt.",
          "Der Rechner ist ausgeschaltet.",
        ],
        richtig: 2,
        erklaerung: "Beide Werte auf YES bedeuten einen hybriden Rechner. Nur AzureAdJoined = YES wäre ein reiner Cloud-Rechner, nur DomainJoined = YES ein klassischer Domänenrechner.",
      },
      {
        frage: "Ein Gerät ist „nicht konform“ und der Zugriff auf Teams wird blockiert. Wer stellt die Konformität fest und wer setzt die Sperre um?",
        antworten: [
          "Intune prüft die Konformität, Conditional Access in Entra ID setzt die Sperre um.",
          "Der Drucker prüft, das WLAN blockiert.",
          "Exchange prüft, SharePoint blockiert.",
          "Niemand – das ist Zufall.",
        ],
        richtig: 0,
        erklaerung: "Intune bewertet den Gerätezustand. Eine Zugriffsregel in Entra ID (Conditional Access) wertet das Ergebnis bei der Anmeldung aus.",
      },
      {
        frage: "Was ist beim Umgang mit einem nicht konformen Gerät KEIN guter Weg?",
        antworten: [
          "Den Grund im Firmenportal ansehen.",
          "Die Zugriffsregel für dieses Gerät selbst lockern.",
          "Den fehlenden Punkt, zum Beispiel ein Update, beheben.",
          "Den Status nach der Behebung aktualisieren lassen.",
        ],
        richtig: 1,
        erklaerung: "Sicherheitsregeln lockert der Helpdesk nicht. Die Ursache wird behoben, danach meldet das Gerät wieder „konform“.",
      },
      {
        frage: "Wofür ist das Firmenportal da?",
        antworten: [
          "Zum Bestellen von Büromaterial.",
          "Zum Weiterleiten von Mails.",
          "Zum Drucken auf Netzwerkdruckern.",
          "Als App-Katalog der Firma und zur Prüfung des Gerätestatus.",
        ],
        richtig: 3,
        erklaerung: "Im Firmenportal installieren Benutzer Firmen-Apps und sehen, ob ihr Gerät die Vorgaben erfüllt.",
      },
    ],
    fall: {
      titel: "Neuer Laptop, kein Zugriff",
      situation: "Ein neuer Laptop wurde gestern ausgeliefert. Die Anmeldung am Gerät klappt, aber Outlook und Teams melden „Zugriff nicht erlaubt“. Im Firmenportal steht: „Gerät nicht konform – Verschlüsselung fehlt“.",
      optionen: [
        { text: "Ich bitte darum, die Zugriffsregel für dieses Gerät zu entfernen.", feedback: "Ausnahmen von Sicherheitsregeln sind keine Aufgabe des Helpdesks und lösen die Ursache nicht." },
        { text: "Ich prüfe den Verschlüsselungsstatus (BitLocker), lasse die Verschlüsselung abschließen, starte neu und lasse das Gerät im Firmenportal den Status aktualisieren.", feedback: "Genau. Die Konformität kommt aus Intune. Sobald die Verschlüsselung aktiv ist und der Status zurückgemeldet wurde, gibt die Zugriffsregel den Weg frei." },
        { text: "Ich installiere Windows neu.", feedback: "Das ist Overkill und löscht die Einrichtung. Die Ursache ist bekannt und deutlich kleiner." },
      ],
      beste: 1,
    },
  },

  /* =====================================================================
     14 · Priorisieren
     ===================================================================== */
  {
    id: "prioritaeten",
    nr: 14,
    titel: "Wichtig oder dringend? Priorisieren",
    kurz: "Welches Ticket zuerst – und wie du fair und verständlich entscheidest.",
    minuten: 8,
    gruppe: "alltag",
    farbe: "#fb923c",
    icon: "i-flag",
    abschnitte: [
      {
        titel: "Zwei Fragen entscheiden",
        diagramm: "prio",
        text: "Nicht das lauteste Telefon gewinnt, sondern die Lage. Zwei Fragen bestimmen die Priorität:\n\n- **Auswirkung:** Wie viele Personen sind betroffen, und wie wichtig ist die Arbeit, die steht?\n- **Dringlichkeit:** Wie schnell muss es behoben sein? Gibt es eine Frist oder kann die Person nicht weiterarbeiten?\n\nZusammen ergeben sie die Priorität. Ein ausgefallener Dateiserver für die ganze Firma schlägt eine defekte Maus – auch wenn die Maus lauter vorgetragen wird.",
        merke: "Sicherheitsvorfälle sind fast immer hoch priorisiert – unabhängig davon, wie wenige Personen betroffen scheinen.",
      },
      {
        titel: "Fragen zum Einstufen",
        text: "- **Wie viele** Personen oder Standorte sind betroffen?\n- **Kann die Person weiterarbeiten** – vielleicht mit einer [[Behelfslösung]]?\n- **Gibt es eine Frist?** Zum Beispiel Gehaltsabrechnung, Kundentermin, Prüfung.\n- Gibt es ein **Sicherheitsrisiko**?\n- Betrifft es **Kernsysteme**, an denen andere hängen?\n\nDiese Angaben gehören auch ins Ticket – so kann jeder deine Einstufung nachvollziehen.\n\nDen **Umfang** klärst du schnell mit den Befehlen unten: gesperrte Konten zählen, Sitzungen auf einem Server ansehen, prüfen, ob ein Dienst oder Port erreichbar ist.",
      },
      {
        titel: "Störung oder Anfrage?",
        text: "Zwei Arten von Tickets laufen oft durcheinander:\n\n- **Störung (Incident):** Etwas, das funktioniert hat, geht nicht mehr. Beispiel: Outlook startet nicht.\n- **Anfrage (Service Request):** Der Wunsch nach etwas Neuem oder einer Standardleistung. Beispiel: Software installieren, neues Konto, zusätzlicher Monitor.\n\nStörungen haben meist Vorrang, weil dort etwas **kaputt** ist. Anfragen folgen in der Regel festen Abläufen mit Freigaben.",
      },
      {
        titel: "Ehrlich kommunizieren",
        text: "Wer warten muss, will wissen, **woran er ist**. Sag offen, wann du dich meldest – auch wenn du heute nicht mehr dazukommst: „Ihre Maus ist ersetzbar, aber gerade steht der Dateiserver. Ich melde mich morgen bis 10 Uhr.“\n\nÄndert sich die Lage (mehr Betroffene, neue Frist), **stufst du hoch** und eskalierst, falls nötig.",
        merke: "Die verbindlichen Reaktionszeiten (SLA) deines Betriebs stehen in euren internen Vorgaben. Frag deine Teamleitung, wenn du sie nicht kennst – hier stehen bewusst keine erfundenen Zahlen.",
      },
    ],
    befehle: [
      "Gesperrte Konten finden",
      "Remotedesktop-Sitzungen anzeigen",
      "Dienststatus prüfen",
      "Erreichbarkeit prüfen",
      "Port-Erreichbarkeit prüfen",
      "Gestoppte Automatik-Dienste anzeigen",
    ],
    glossar: ["Major Incident", "Behelfslösung", "Eskalation"],
    quiz: [
      {
        frage: "Welche beiden Faktoren bestimmen die Priorität eines Tickets?",
        antworten: [
          "Lautstärke des Anrufers und Uhrzeit.",
          "Auswirkung und Dringlichkeit.",
          "Alter des Geräts und Abteilung.",
          "Reihenfolge des Eingangs.",
        ],
        richtig: 1,
        erklaerung: "Wie viele betroffen sind (Auswirkung) und wie schnell es gehen muss (Dringlichkeit) – nicht, wer lauter fordert.",
      },
      {
        frage: "Was ist höher zu priorisieren?",
        antworten: [
          "Der Drucker einer Person ist defekt, ein zweiter Drucker steht direkt daneben.",
          "Der Dateiserver ist für 80 Personen nicht erreichbar.",
          "Eine Maus ist defekt.",
          "Ein Bildschirm soll gegen einen größeren getauscht werden.",
        ],
        richtig: 1,
        erklaerung: "80 Personen blockiert: große Auswirkung und hohe Dringlichkeit. Die anderen haben Alternativen oder können warten.",
      },
      {
        frage: "Ein Benutzer ruft zum dritten Mal an und wird laut. Ändert das die Priorität?",
        antworten: [
          "Ja, wer öfter anruft, kommt zuerst dran.",
          "Nein, die Priorität folgt der Lage – aber du gibst eine ehrliche Rückmeldung und prüfst, ob sich die Lage verändert hat.",
          "Ja, aber nur wenn der Anrufer wichtig ist.",
          "Das Ticket wird einfach geschlossen.",
        ],
        richtig: 1,
        erklaerung: "Lautstärke ändert die Priorität nicht, wohl aber neue Informationen. Frag nach, ob es neue Auswirkungen oder eine Frist gibt.",
      },
      {
        frage: "Was ist eine Anfrage (Service Request)?",
        antworten: [
          "Eine Störung, die Dringlichkeit hat.",
          "Der Wunsch nach etwas Neuem oder einer Standardleistung, zum Beispiel einer Software-Installation.",
          "Ein Anruf von einer Führungskraft.",
          "Ein defektes Gerät.",
        ],
        richtig: 1,
        erklaerung: "Bei einer Anfrage ist nichts kaputt – es wird etwas bestellt oder eingerichtet.",
      },
    ],
    fall: {
      titel: "Drei Tickets auf einmal",
      situation: "Es ist 9 Uhr, du hast drei offene Tickets:\n**A)** Die Maus von Frau Roth ist defekt (sie hat eine Ersatzmaus gefunden).\n**B)** Die Mail ist für die gesamte Vertriebsabteilung (30 Personen) seit 8:45 Uhr nicht erreichbar.\n**C)** Ein neuer Mitarbeiter braucht Konto und Laptop – er fängt übermorgen an.",
      optionen: [
        { text: "Ich beginne mit A, weil es am schnellsten geht.", feedback: "Schnell erledigt fühlt sich gut an, aber 30 Personen ohne Mail sind das größere Problem. A ist mit der Ersatzmaus nicht dringend." },
        { text: "Zuerst B. Danach plane ich C fest ein, A bekommt eine Rückmeldung mit Termin.", feedback: "Genau: Die größte Auswirkung zuerst. C hat eine Frist (übermorgen), also fest einplanen. A bekommt eine ehrliche Antwort mit Zeitpunkt." },
        { text: "Ich arbeite in der Reihenfolge, wie die Tickets eingegangen sind.", feedback: "Die Eingangsreihenfolge sagt nichts über die Lage. Sonst wartet eine ganze Abteilung wegen einer Maus." },
      ],
      beste: 1,
    },
  },

  /* =====================================================================
     15 · Datenschutz
     ===================================================================== */
  {
    id: "datenschutz",
    nr: 15,
    titel: "Datenschutz im Support",
    kurz: "Was ins Ticket darf, was nie – und was bei einer Panne zu tun ist.",
    minuten: 8,
    gruppe: "alltag",
    farbe: "#c084fc",
    icon: "i-lock",
    abschnitte: [
      {
        titel: "Wir sehen viel – deshalb gilt Sorgfalt",
        diagramm: "datenampel",
        text: "Im Support sehen wir Namen, Mailinhalte, Dateien, Bildschirme. Das ist nötig, um zu helfen, bringt aber Verantwortung mit: Wir dürfen nur das nutzen, was für die Aufgabe nötig ist, und nur dafür.\n\nDie Ampel zeigt, was in Tickets und Chat gehört.",
        merke: "Passwörter, PINs und MFA-Codes gehören nie in ein Ticket, einen Chat oder eine Mail – auch nicht „nur kurz“.",
      },
      {
        titel: "Die vier Faustregeln",
        text: "- **So wenig wie nötig.** Frag nur die Daten ab, die du für das Problem brauchst.\n- **Nur wer es braucht.** Gib Informationen nur an Personen weiter, die sie für ihre Aufgabe brauchen.\n- **Nur dafür.** Daten, die du für einen Fall einsiehst, nutzt du nicht für etwas anderes.\n- **Nichts Geheimes im Klartext.** Zugangsdaten werden nicht aufgeschrieben oder weitergegeben.",
      },
      {
        titel: "Fernzugriff und fremde Postfächer",
        text: "- **Mitsehen und Fernsteuern nur mit Zustimmung** des Benutzers – und nur, solange es für das Problem nötig ist.\n- **Bildschirm teilen:** Vorher fremde und private Fenster schließen oder nur das benötigte Fenster teilen.\n- **Fremde Postfächer oder Dateien öffnest du nur mit einem Auftrag**, den die dafür berechtigte Stelle freigegeben hat. Eigene Neugier ist kein Grund.\n- **Wer Zugriff hat, lässt sich prüfen:** Gruppenmitglieder, Postfach- und Ordnerrechte zeigen die Befehle unten. Zu viele Rechte sind ein Datenschutzrisiko – melde sie.\n- **Screenshots** mit Namen oder Inhalten nur teilen, wenn nötig – und nicht in öffentliche Kanäle.",
      },
      {
        titel: "Wenn etwas schiefgeht",
        text: "Eine Datenpanne passiert schnell: eine Mail an den falschen Empfänger, ein verlorener Laptop, ein offen gelassener Bildschirm. Wichtig ist:\n\n- **Sofort melden** – an deine Führungskraft und die zuständige Stelle für Datenschutz bzw. Sicherheit. Nicht hoffen, dass es keiner merkt.\n- **Nichts verheimlichen oder löschen.**\n- **Schnell sein:** Je nach Fall muss der Betrieb eine Datenpanne innerhalb kurzer Frist (in der Regel 72 Stunden) an die Aufsichtsbehörde melden – das geht nur, wenn er sofort davon erfährt.",
        merke: "Dies ist eine Orientierung, keine Rechtsberatung. Es gelten die Regeln eures Unternehmens – frag die oder den Datenschutzbeauftragten.",
      },
    ],
    befehle: [
      "Mitglieder einer Gruppe anzeigen",
      "Postfachberechtigungen anzeigen",
      "Ordnerrechte anzeigen",
      "Lokale Administratoren anzeigen",
      "Angemeldete Benutzer am Rechner anzeigen",
      "BitLocker-Status anzeigen",
    ],
    glossar: ["Phishing", "Remoteunterstützung", "Eskalation"],
    quiz: [
      {
        frage: "Welche Angabe gehört NICHT in ein Ticket?",
        antworten: [
          "Der Gerätename PC-0815.",
          "Die genaue Fehlermeldung.",
          "Das Passwort des Benutzers.",
          "Die Uhrzeit, zu der das Problem auftrat.",
        ],
        richtig: 2,
        erklaerung: "Passwörter gehören nirgendwohin außer ins Gedächtnis oder einen Passwortmanager – nie in Tickets, Chats oder Mails.",
      },
      {
        frage: "Jemand möchte „nur mal sehen“, was im Postfach einer Kollegin steht. Was ist richtig?",
        antworten: [
          "Das geht, wenn niemand etwas merkt.",
          "Nur mit einem dokumentierten Auftrag der dafür berechtigten Stelle; sonst nein.",
          "Das geht, wenn es zeitlich passt.",
          "Das darf jeder Administrator jederzeit.",
        ],
        richtig: 1,
        erklaerung: "Zugriff auf fremde Postfächer braucht einen berechtigten Anlass und Freigabe. Technisch möglich heißt nicht erlaubt.",
      },
      {
        frage: "Du hast versehentlich eine Mail mit Kundendaten an den falschen Empfänger geschickt. Was tust du?",
        antworten: [
          "Nichts – vielleicht liest er sie nicht.",
          "Ich warte ab, ob sich jemand meldet.",
          "Sofort bei Führungskraft und der zuständigen Stelle für Datenschutz melden.",
          "Ich schicke die Mail erneut an die richtige Person und sage nichts.",
        ],
        richtig: 2,
        erklaerung: "Rasche Meldung ist entscheidend, weil manche Datenpannen kurzen Meldefristen unterliegen. Melden schützt auch dich.",
      },
      {
        frage: "Was machst du, bevor du im Videocall deinen Bildschirm teilst?",
        antworten: [
          "Nichts, das spielt keine Rolle.",
          "Fremde und private Fenster schließen oder nur das benötigte Fenster teilen.",
          "Alle Programme im Hintergrund starten.",
          "Den Ton ausschalten.",
        ],
        richtig: 1,
        erklaerung: "Beim Teilen sieht das Publikum alles, was auf dem Bildschirm ist – auch Benachrichtigungen und offene Fenster.",
      },
    ],
    fall: {
      titel: "„Gib mir mal das Passwort von Frau Keller“",
      situation: "Ein Kollege schreibt dir im Chat: „Frau Keller ist im Urlaub, ich muss dringend etwas aus ihrem Postfach holen. Gib mir kurz ihr Passwort.“",
      optionen: [
        { text: "Ich setze das Passwort zurück und schicke es ihm im Chat.", feedback: "Damit hast du ein Passwort im Klartext in einen Chat gesetzt und ein fremdes Postfach zugänglich gemacht – ohne Auftrag." },
        { text: "Ich lehne freundlich ab und erkläre den Weg: Zugriff auf das Postfach (zum Beispiel Vertretung) beantragt er mit Freigabe der Führungskraft; ich richte ihn dann ein.", feedback: "Genau: ablehnen, den richtigen Weg zeigen und die Freigabe einholen lassen. Niemand gibt sein Passwort weiter – und der Zugriff ist nachvollziehbar dokumentiert." },
        { text: "Ich frage Frau Keller per Handy im Urlaub nach dem Passwort.", feedback: "Das Passwort bleibt bei ihr. Ein Anruf im Urlaub ist unnötig – über den Vertretungsprozess geht es mit Freigabe und ohne Passwort." },
      ],
      beste: 1,
    },
  },

  /* =====================================================================
     16 · IT-Service verstehen
     ===================================================================== */
  {
    id: "itservice",
    nr: 16,
    titel: "Incident, Anfrage, Change, Problem",
    kurz: "Vier Arten von Vorgängen – und warum es nützt, sie auseinanderzuhalten.",
    minuten: 8,
    gruppe: "alltag",
    farbe: "#a3e635",
    icon: "i-check-list",
    abschnitte: [
      {
        titel: "Nicht jedes Ticket ist gleich",
        diagramm: "servicearten",
        text: "Im IT-Service (oft nach dem Rahmenwerk ITIL beschrieben) unterscheidet man vier Arten von Vorgängen. Das klingt theoretisch, hilft aber im Alltag, denn jede Art hat ihren eigenen Weg:\n\n- **Incident (Störung):** Etwas, das gestern ging, geht heute nicht. Ziel: so schnell wie möglich wieder arbeiten können – notfalls mit einer [[Behelfslösung]].\n- **[[Service Request]] (Anfrage):** Etwas Normales wird bestellt – Software, Zugriff, ein neues Headset. Läuft über einen festen Ablauf, oft mit Freigabe.\n- **[[Change]] (Änderung):** Etwas an der IT wird geplant verändert, zum Beispiel ein Server-Update. Wird vorher beantragt, geprüft und freigegeben.\n- **[[Problem Management|Problem]]:** Die Ursache hinter vielen gleichartigen Incidents. Sie wird gesucht, damit die Störung nicht wiederkommt.",
      },
      {
        titel: "Warum die Unterscheidung nützt",
        text: "- **Richtige Priorität:** Die Anfrage nach einem neuen Headset ist nicht dringend. Eine Störung, die ein Team lahmlegt, schon.\n- **Richtiger Weg:** Anfragen laufen über einen Freigabeprozess, Störungen über Fehlersuche und Eskalation.\n- **Weniger Doppelarbeit:** Melden zehn Personen dasselbe, sind das zehn Incidents, aber nur ein Problem. Es reicht, einmal an der Ursache zu arbeiten.\n- **Sicherheit:** „Schnell mal“ etwas an einem Server zu ändern ist ein Change. Er braucht Freigabe, weil er andere treffen kann.\n\nWie euer Betrieb Vorgänge benennt und welche Fristen gelten, legt er selbst fest. Frag im Zweifel nach.",
        merke: "Erkennst du bei mehreren gleichen Tickets ein Muster, sprich es an. Das ist ein **Problem**, und deine Beobachtung spart allen Zeit.",
      },
      {
        titel: "Reaktionszeit und SLA",
        text: "Ein [[SLA]] (Service Level Agreement) legt fest, wie schnell ein Team reagieren und lösen soll – meist abhängig von der Priorität. Die genauen Werte gibt dein Betrieb vor. Erfinde keine.\n\n- **Reaktionszeit:** bis sich jemand das Ticket ansieht und dem Melder antwortet.\n- **Lösungszeit:** bis die Störung behoben ist.\n- **[[Eskalation]]** ist erlaubt und erwünscht, wenn eine Frist zu reißen droht oder du nicht weiterkommst.\n\nWer eine Frist knapp werden sieht, informiert den Benutzer **rechtzeitig**. Das ist besser als Schweigen.",
      },
      {
        titel: "Änderungen: nicht mal eben",
        text: "Ein Change ist die kontrollierte Art, etwas zu ändern. Er beantwortet meist: Was soll sich ändern? Warum? Wer ist betroffen? Wann (Wartungsfenster)? Wie geht es zurück, wenn es schiefgeht?\n\nFür dich im Helpdesk heißt das:\n\n- Änderungen an Servern, am Netzwerk oder an zentralen Einstellungen führst du **nicht ohne Freigabe** durch – auch dann nicht, wenn es technisch möglich wäre.\n- Beginnt ein Problem nach einer Änderung, schreib das ins Ticket. **Was hat sich zuletzt geändert?** ist eine der besten Fragen der Fehlersuche.\n- Geplante Wartungsarbeiten stehen in den Meldungen und in der Dienstübergabe. Kündige sie Anrufern an, wenn sie betroffen sind.",
      },
    ],
    befehle: [],
    glossar: ["Ticket", "Service Request", "Change", "Problem Management", "SLA", "Behelfslösung", "Eskalation", "Major Incident"],
    quiz: [
      {
        frage: "Zehn Personen melden innerhalb einer Stunde, dass das WLAN im 3. OG abbricht. Was ist das aus IT-Service-Sicht?",
        antworten: [
          "Zehn Anfragen (Service Requests).",
          "Ein geplanter Change.",
          "Zehn Incidents, hinter denen wahrscheinlich ein gemeinsames Problem steckt.",
          "Kein IT-Thema.",
        ],
        richtig: 2,
        erklaerung: "Jede Meldung ist ein Incident. Die gemeinsame Ursache ist ein Problem – dort sollte einmal gründlich gearbeitet werden.",
      },
      {
        frage: "Ein Benutzer möchte Zugriff auf einen neuen Projektordner. Welche Art von Vorgang ist das?",
        antworten: [
          "Ein Service Request.",
          "Ein Major Incident.",
          "Ein Problem.",
          "Ein Virus.",
        ],
        richtig: 0,
        erklaerung: "Es ist nichts kaputt, jemand bittet um etwas Normales. Solche Anfragen laufen meist über einen festen Ablauf mit Freigabe.",
      },
      {
        frage: "Du könntest „schnell mal“ eine Einstellung auf einem zentralen Server ändern. Was ist richtig?",
        antworten: [
          "Einfach machen, Hauptsache es hilft.",
          "Das ist ein Change und braucht eine Freigabe.",
          "Heimlich nachts ändern.",
          "Den Benutzer ändern lassen.",
        ],
        richtig: 1,
        erklaerung: "Änderungen an zentralen Systemen können viele treffen. Deshalb werden sie geplant, geprüft und freigegeben.",
      },
      {
        frage: "Wozu dient eine Behelfslösung bei einem Incident?",
        antworten: [
          "Sie ersetzt die spätere Ursachensuche vollständig.",
          "Damit die Person schnell weiterarbeiten kann, während die Ursache noch gesucht wird.",
          "Sie ist grundsätzlich verboten.",
          "Sie ist nur für Administratoren erlaubt.",
        ],
        richtig: 1,
        erklaerung: "Eine Behelfslösung bringt die Arbeit sofort zurück. Die eigentliche Ursache wird davon unabhängig gesucht.",
      },
    ],
    fall: {
      titel: "Das dritte Mal diese Woche",
      situation: "Zum dritten Mal in dieser Woche meldet jemand aus der Buchhaltung, dass das Fachprogramm nach dem Start einfriert. Du hast jedes Mal mit einem Neustart geholfen.",
      optionen: [
        { text: "Ich helfe wieder mit einem Neustart und schließe das Ticket.", feedback: "Die Person kann weiterarbeiten, aber die Ursache bleibt. Wiederkehrende gleichartige Störungen deuten auf ein Problem hin." },
        { text: "Ich helfe mit dem Neustart, notiere den Zusammenhang in allen drei Tickets und melde das Muster, damit die Ursache gesucht wird.", feedback: "Genau. Die Behelfslösung hilft jetzt, die Meldung des Musters hilft dauerhaft – das ist der Kern von Problem Management." },
        { text: "Ich ändere selbst Einstellungen auf dem Server, auf dem das Programm läuft.", feedback: "Änderungen an Servern brauchen eine Freigabe (Change). Ohne sie riskierst du neue Störungen für alle." },
      ],
      beste: 1,
    },
  },
];

/**
 * Checkliste "Erste Woche". Punkte mit `modul` werden automatisch abgehakt,
 * sobald das Modul bestanden ist; alle anderen hakt man selbst ab.
 * `ansicht` ist optional und erzeugt einen Link zum passenden Bereich.
 */
export const FIRST_WEEK = [
  { id: "check:woche1:chat", text: "Team-Chat und Schnellsuche (Strg + K) ausprobiert", ansicht: "templates" },
  { id: "check:woche1:einstellungen", text: "Namen für [ICH] und Pixel-Avatar in den Einstellungen gesetzt", ansicht: "settings" },
  { id: "check:woche1:helper", text: "Modul „Der Helpdesk-Helper im Alltag“ bestanden", modul: "helper" },
  { id: "check:woche1:fall", text: "Einen eigenen Fall angelegt und die Dokumentation erzeugt", ansicht: "cases" },
  { id: "check:woche1:fehlersuche", text: "Modul „Systematische Fehlersuche“ bestanden", modul: "fehlersuche" },
  { id: "check:woche1:eskalation", text: "Eskalationsstufen angesehen und weiß, wen ich wann anrufe", ansicht: "escalation" },
  { id: "check:woche1:sicherheit", text: "Modul „Sicherheit am Telefon“ bestanden", modul: "sicherheit" },
  { id: "check:woche1:landkarte", text: "Modul „Die Microsoft-Landkarte“ bestanden – Entra ID, Exchange, Intune & Co. auseinanderhalten", modul: "landkarte" },
  { id: "check:woche1:mithoeren", text: "Ein Gespräch mit einem erfahrenen Kollegen mitgehört" },
  { id: "check:woche1:uebergabe", text: "Eine Dienstübergabe gelesen und bestätigt", ansicht: "handover" },
];
