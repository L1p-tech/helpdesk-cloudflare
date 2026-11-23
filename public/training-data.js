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
    id: "alltag",
    titel: "Besser im Alltag",
    text: "Priorisieren und sauber mit Daten umgehen.",
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
     9 · Priorisieren
     ===================================================================== */
  {
    id: "prioritaeten",
    nr: 9,
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
     10 · Datenschutz
     ===================================================================== */
  {
    id: "datenschutz",
    nr: 10,
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
  { id: "check:woche1:mithoeren", text: "Ein Gespräch mit einem erfahrenen Kollegen mitgehört" },
  { id: "check:woche1:uebergabe", text: "Eine Dienstübergabe gelesen und bestätigt", ansicht: "handover" },
];
