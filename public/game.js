import { $, escapeHtml, showToast, state } from "./base.js";
import { api } from "./core.js";

export const TYPING_PROMPTS = [
  "Bitte pruefen Sie zuerst die Netzwerkverbindung und bestaetigen Sie dann den aktuellen Fehlerzeitpunkt im Ticket.",
  "Der Benutzer wurde ueber die durchgefuehrten Schritte informiert und gebeten den Rechner einmal neu zu starten.",
  "Vor der Eskalation bitte Logdateien sichern, Screenshot anhaengen und den betroffenen Arbeitsplatz dokumentieren.",
  "Die Vorlage wurde aktualisiert und kann ab sofort fuer Rueckmeldungen an Mitarbeitende direkt verwendet werden.",
  "Bitte kontrollieren Sie ob das VPN Profil korrekt ausgewaehlt ist und die Mehrfaktor Anmeldung erfolgreich abgeschlossen wurde.",
  "Falls der Druckauftrag weiterhin haengen bleibt, leeren Sie bitte die Warteschlange und testen den Druck erneut mit einer kleinen Datei.",
  "Dokumentieren Sie im Ticket, welche Systeme betroffen sind, seit wann die Stoerung besteht und welche Auswirkungen fuer den Mitarbeiter sichtbar sind.",
  "Bevor ein Zugriff entfernt wird, sollte die Freigabe des Fachbereichs vorliegen und im Vorgang eindeutig nachvollziehbar abgelegt werden.",
  "Wenn die Anmeldung im Browser fehlschlaegt, pruefen Sie Cookies, gespeicherte Sitzungen und einen moeglichen Hinweis auf eine gesperrte Identitaet.",
  "Bei einer Softwareinstallation bitte immer Version, Quelle, benoetigte Rechte und einen erfolgreichen Funktionstest im Ticket vermerken.",
  "Wird ein Konto entsperrt, sollte der Benutzer zusaetzlich auf Passwortaenderung, Mehrfaktor Anmeldung und die geltenden Sicherheitsregeln hingewiesen werden.",
  "Fuer eine saubere Eskalation brauchen wir Reproduktionsschritte, Zeitpunkt, Fehlermeldung, betroffene Umgebung und die bereits getesteten Massnahmen.",
];

export async function loadLeaderboard() {
  const data = await api("/api/game/leaderboard");
  $("#leaderboard").innerHTML = data.leaderboard.length
    ? data.leaderboard.map((entry) => `<li><strong>${escapeHtml(entry.display_name)}</strong> – ${entry.score}</li>`).join("")
    : "<li>Noch keine Scores.</li>";
}

export async function loadTypingLeaderboard() {
  const data = await api("/api/game/typing/leaderboard");
  $("#typing-leaderboard").innerHTML = data.leaderboard.length
    ? data.leaderboard.map((entry) => `
      <li><strong>${escapeHtml(entry.display_name)}</strong> – ${entry.wpm} WPM · ${entry.accuracy} %</li>
    `).join("")
    : "<li>Noch keine Ergebnisse.</li>";
}

/**
 * "Helpdesk Runner" -- ein Nachbau des Chrome-Offline-Dinos (T-Rex Runner).
 *
 * Die Spielphysik verwendet bewusst die Original-Konstanten aus Chromium
 * (components/neterror/resources/offline.js), damit sich das Spiel so anfuehlt
 * wie das Vorbild:
 *
 *   - Die Geschwindigkeit steigt kontinuierlich um ACCELERATION pro Frame,
 *     von SPEED (6) bis MAX_SPEED (13). Kein Deckel nach kurzer Zeit.
 *   - Der Abstand zwischen Hindernissen wird aus der aktuellen Geschwindigkeit
 *     berechnet, nicht aus einer festen Framezahl. Nur so bleibt das Spiel bei
 *     hohem Tempo fair -- sonst ruecken die Kakteen immer enger zusammen.
 *   - Der Punktestand haengt an der zurueckgelegten Strecke (COEFFICIENT),
 *     nicht an der Spielzeit. Schneller laufen = schneller punkten.
 *
 * Alle Groessen sind in Original-Pixeln definiert und werden ueber SCALE auf
 * die Canvas-Hoehe gebracht. Das Original rechnet mit einer 150 px hohen
 * Spielflaeche, dieses Canvas ist 260 px hoch.
 */
export function initializeGame() {
  const canvas = $("#game-canvas");
  const context = canvas.getContext("2d");

  // Original-Konstanten aus Chromium (Runner.config).
  const ACCELERATION = 0.001;
  const START_SPEED = 6;
  const MAX_SPEED = 13;
  const GRAVITY = 0.6;
  // Trex.config.INITIAL_JUMP_VELOCITY im Original. Ergibt zusammen mit GRAVITY
  // einen Sprungbogen von rund 88 px Hoehe und gut 0,55 s Dauer.
  const INITIAL_JUMP_VELOCITY = -10;
  const DROP_VELOCITY = -5; // Sprung abbrechen (Taste loslassen / Pfeil runter)
  const SPEED_DROP_COEFFICIENT = 3; // schnelleres Fallen beim Ducken
  const GAP_COEFFICIENT = 0.6;
  const MAX_OBSTACLE_DUPLICATION = 2;
  const SCORE_COEFFICIENT = 0.025;
  const CLOUD_FREQUENCY = 0.5;
  const MAX_CLOUDS = 6;
  const BG_CLOUD_SPEED = 0.2;

  // Das Original ist auf 150 px Spielhoehe ausgelegt; hier auf das Canvas skaliert.
  const SCALE = 1.5;
  const px = (value) => value * SCALE;

  // Standlinie, auf der T-Rex und Kakteen aufsetzen.
  //
  // Im Original liegt die Bodengrafik bei y=127 und ist selbst rund 12 px hoch;
  // die Sprites reichen deshalb bis y=140. Hier wird der Boden nur als duenne
  // Linie gezeichnet, also wird direkt auf dieser Linie aufgesetzt. Die
  // Original-`yPos`-Werte der Hindernisse sind entsprechend auf diese Linie
  // umgerechnet (siehe ORIGINAL_GROUND_BOTTOM).
  const groundY = px(127);
  const ORIGINAL_GROUND_BOTTOM = 140;

  const TREX = {
    WIDTH: 44,
    HEIGHT: 47,
    WIDTH_DUCK: 59,
    HEIGHT_DUCK: 25,
    START_X_POS: 50,
  };

  // Hindernis-Typen mit den Originalmassen. `yPos` ist der Abstand der
  // Oberkante vom Boden, `minSpeed` die Geschwindigkeit, ab der ein Typ
  // ueberhaupt auftaucht (Pterodactyl erst ab 8.5).
  const OBSTACLE_TYPES = [
    {
      type: "CACTUS_SMALL",
      width: 17,
      height: 35,
      yPos: 105,
      multipleSpeed: 4,
      minGap: 120,
      minSpeed: 0,
      collisionBoxes: [
        { x: 0, y: 7, width: 5, height: 27 },
        { x: 4, y: 0, width: 6, height: 34 },
        { x: 10, y: 4, width: 7, height: 14 },
      ],
    },
    {
      type: "CACTUS_LARGE",
      width: 25,
      height: 50,
      yPos: 90,
      multipleSpeed: 7,
      minGap: 120,
      minSpeed: 0,
      collisionBoxes: [
        { x: 0, y: 12, width: 7, height: 38 },
        { x: 8, y: 0, width: 7, height: 49 },
        { x: 13, y: 10, width: 10, height: 38 },
      ],
    },
    {
      type: "PTERODACTYL",
      width: 46,
      height: 40,
      /*
       * Drei Flughoehen, gegenueber dem Original angepasst.
       *
       * Unsere Standlinie liegt bei 127 statt 140, wodurch alles um 13px
       * verrutscht: Mit den Originalwerten [100, 75, 50] passte der geduckte
       * T-Rex unter allen drei Hoehen hindurch, und der hoechste Vogel traf
       * ueberhaupt nichts mehr.
       *
       * Wirksame Bereiche bei dieser Standlinie:
       *   unter 70   trifft weder stehend noch geduckt
       *   70 .. 105  stehend getroffen, Ducken hilft
       *   ab 110     auch geduckt getroffen -- nur Springen hilft
       *
       * 115 liegt sicher im oberen Bereich (nur springen), 90 und 72 bleiben
       * unterduckbar und unterscheiden sich sichtbar in der Hoehe.
       */
      yPos: [115, 90, 72],
      multipleSpeed: 999, // tritt nie in Gruppen auf
      minGap: 150,
      minSpeed: 8.5,
      speedOffset: 0.8,
      numFrames: 2,
      frameRate: 1000 / 6,
      collisionBoxes: [
        { x: 15, y: 15, width: 16, height: 5 },
        { x: 18, y: 21, width: 24, height: 6 },
        { x: 2, y: 14, width: 4, height: 3 },
        { x: 6, y: 10, width: 4, height: 7 },
        { x: 10, y: 8, width: 6, height: 9 },
      ],
    },
  ];

  // Kollisionsboxen des T-Rex, ebenfalls Originalwerte.
  const TREX_COLLISION_RUNNING = [
    { x: 22, y: 0, width: 17, height: 16 },
    { x: 1, y: 18, width: 30, height: 9 },
    { x: 10, y: 35, width: 14, height: 8 },
    { x: 1, y: 24, width: 29, height: 5 },
    { x: 5, y: 30, width: 21, height: 4 },
    { x: 9, y: 34, width: 15, height: 4 },
  ];
  const TREX_COLLISION_DUCKING = [
    { x: 1, y: 18, width: 55, height: 25 },
  ];

  const trex = {
    x: TREX.START_X_POS,
    y: 0,
    velocityY: 0,
    jumping: false,
    ducking: false,
    speedDrop: false,
  };

  let running = false;
  let gameOver = false;
  let speed = START_SPEED;
  let distance = 0;
  // Startversatz von `distance`; wird beim Punktezaehlen wieder abgezogen.
  let scoreOffset = 0;
  let score = 0;
  let highScore = 0;
  let startTime = 0;
  let lastTime = 0;
  let animationId = null;
  let obstacles = [];
  let clouds = [];
  // Ist die Sprungtaste (oder Maus/Touch) gerade gedrueckt? Steuert zweierlei:
  // die Tastenwiederholung beim Halten und den sofortigen Anschlusssprung
  // direkt nach der Landung.
  let jumpHeld = false;

  /** Bodenhoehe des T-Rex in der aktuellen Haltung. */
  function trexGroundY() {
    return groundY - px(trex.ducking ? TREX.HEIGHT_DUCK : TREX.HEIGHT);
  }

  function resetGame() {
    running = true;
    gameOver = false;
    speed = START_SPEED;
    score = 0;
    obstacles = [];
    clouds = [];

    // Der Punktestand startet immer bei 0, die zurueckgelegte Strecke dagegen
    // an einer zufaelligen Stelle. `distance` steuert das Bodenmuster und den
    // Laufzyklus, deshalb sieht jede Runde anders aus statt jedes Mal mit
    // demselben Bild zu beginnen. Der Versatz wird beim Punktezaehlen wieder
    // abgezogen (siehe scoreOffset).
    distance = Math.random() * 10_000;
    scoreOffset = distance;

    // Wolken vorab verteilen, damit der Himmel nicht bei jedem Start leer ist
    // und sich erst nach und nach fuellt.
    let cloudX = Math.random() * 200;
    while (cloudX < canvas.width) {
      clouds.push({
        x: cloudX,
        y: px(30 + Math.floor(Math.random() * 40)),
        gap: 100 + Math.floor(Math.random() * 200),
      });
      cloudX += px(100 + Math.random() * 200);
    }
    trex.ducking = false;
    trex.jumping = false;
    trex.speedDrop = false;
    trex.velocityY = 0;
    trex.y = trexGroundY();
    startTime = Date.now();
    lastTime = 0;
    $("#game-score").textContent = "00000";
  }

  function startJump() {
    if (!running || trex.jumping) return;
    trex.jumping = true;
    trex.ducking = false;
    trex.speedDrop = false;
    // Hoehere Geschwindigkeit -> etwas kraeftigerer Absprung, wie im Original.
    trex.velocityY = INITIAL_JUMP_VELOCITY - (speed / 10);
  }

  /**
   * Sprung vorzeitig beenden. Kurzes Antippen ergibt so einen niedrigen
   * Sprung, langes Halten den vollen -- das ist im Original der Unterschied
   * zwischen MIN_JUMP_HEIGHT und MAX_JUMP_HEIGHT.
   */
  function endJump() {
    if (trex.jumping && trex.velocityY < DROP_VELOCITY) {
      trex.velocityY = DROP_VELOCITY;
    }
  }

  function setDucking(value) {
    if (!running) return;

    if (value && trex.jumping) {
      // Im Sprung wirkt Ducken als Schnellabstieg.
      trex.speedDrop = true;
      trex.ducking = false;
      return;
    }

    if (!trex.jumping) {
      trex.ducking = value;
      trex.y = trexGroundY();
    }

    if (!value) trex.speedDrop = false;
  }

  function updateTrex(deltaFrames) {
    if (trex.jumping) {
      const gravity = trex.speedDrop
        ? GRAVITY * SPEED_DROP_COEFFICIENT
        : GRAVITY;

      // Schwerkraft und Geschwindigkeit werden im selben Einheitenraum
      // gerechnet (Original-Pixel). Wuerde nur die Geschwindigkeit skaliert,
      // fiele der Sprung um den SCALE-Faktor zu hoch aus.
      trex.velocityY += gravity * deltaFrames;
      trex.y += trex.velocityY * deltaFrames;

      const ground = trexGroundY();
      if (trex.y >= ground) {
        trex.y = ground;
        trex.velocityY = 0;
        trex.jumping = false;
        trex.speedDrop = false;

        // Haelt der Spieler die Sprungtaste weiterhin gedrueckt, wird direkt
        // beim Aufsetzen neu abgesprungen. Ohne das muesste man loslassen und
        // erneut druecken -- bei eng aufeinanderfolgenden Hindernissen bleibt
        // dafuer keine Zeit.
        if (jumpHeld) startJump();
      }
    } else {
      trex.y = trexGroundY();
    }
  }

  /**
   * Mindestabstand zum naechsten Hindernis.
   *
   * Faehrt das Spiel schneller, braucht es proportional mehr Platz -- deshalb
   * geht die Geschwindigkeit hier direkt ein. Genau diese Kopplung fehlte
   * vorher, weshalb ein fester Frameabstand bei hohem Tempo unspielbar waere.
   */
  function computeGap(obstacle, currentSpeed) {
    const minGap = Math.round(
      obstacle.width * currentSpeed + obstacle.minGap * GAP_COEFFICIENT,
    );
    const maxGap = Math.round(minGap * 1.5);
    return minGap + Math.floor(Math.random() * (maxGap - minGap));
  }

  function lastObstacle() {
    return obstacles[obstacles.length - 1] ?? null;
  }

  function spawnObstacle() {
    const available = OBSTACLE_TYPES.filter((type) => speed >= type.minSpeed);
    const definition = available[Math.floor(Math.random() * available.length)];

    // Nicht mehr als MAX_OBSTACLE_DUPLICATION gleiche Hindernisse hintereinander.
    const recent = obstacles.slice(-MAX_OBSTACLE_DUPLICATION);
    if (
      recent.length === MAX_OBSTACLE_DUPLICATION &&
      recent.every((entry) => entry.type === definition.type)
    ) {
      return;
    }

    // Kakteen koennen als Gruppe auftreten -- aber erst ab `multipleSpeed`.
    const maxGroup = speed >= definition.multipleSpeed ? 3 : 1;
    const size = Math.floor(Math.random() * maxGroup) + 1;

    const yPos = Array.isArray(definition.yPos)
      ? definition.yPos[Math.floor(Math.random() * definition.yPos.length)]
      : definition.yPos;

    // Original-Koordinate auf unsere Standlinie umrechnen: Im Original sitzt
    // alles auf y=140 auf, hier direkt auf groundY.
    const y = groundY - px(ORIGINAL_GROUND_BOTTOM - yPos);

    obstacles.push({
      type: definition.type,
      definition,
      x: canvas.width,
      y,
      width: px(definition.width * size),
      height: px(definition.height),
      size,
      gap: computeGap({ ...definition, width: definition.width * size }, speed),
      frame: 0,
      frameTimer: 0,
    });
  }

  function updateObstacles(deltaFrames, deltaMs) {
    for (const obstacle of obstacles) {
      // Pterodactyls fliegen leicht schneller bzw. langsamer als der Boden.
      const obstacleSpeed = obstacle.definition.speedOffset
        ? speed + obstacle.definition.speedOffset
        : speed;
      obstacle.x -= px(obstacleSpeed) * deltaFrames;

      if (obstacle.definition.numFrames) {
        obstacle.frameTimer += deltaMs;
        if (obstacle.frameTimer >= obstacle.definition.frameRate) {
          obstacle.frameTimer = 0;
          obstacle.frame = (obstacle.frame + 1) % obstacle.definition.numFrames;
        }
      }
    }

    obstacles = obstacles.filter((obstacle) => obstacle.x + obstacle.width > 0);

    // Neues Hindernis, sobald das letzte weit genug hereingelaufen ist.
    //
    // Das erste Hindernis einer Runde bekommt zusaetzlich einen zufaelligen
    // Vorlauf, damit nicht jede Runde mit demselben Anlauf beginnt.
    const last = lastObstacle();
    if (!last) {
      spawnObstacle();
      const first = lastObstacle();
      if (first) first.x += px(60 + Math.random() * 220);
    } else if (last.x + last.width + px(last.gap) < canvas.width) {
      spawnObstacle();
    }
  }

  function updateClouds(deltaFrames) {
    for (const cloud of clouds) {
      cloud.x -= px(BG_CLOUD_SPEED + speed / 12) * deltaFrames;
    }
    clouds = clouds.filter((cloud) => cloud.x + px(46) > 0);

    const lastCloud = clouds[clouds.length - 1];
    const roomForCloud = !lastCloud
      || canvas.width - (lastCloud.x + px(46)) > px(lastCloud.gap);

    if (clouds.length < MAX_CLOUDS && roomForCloud && Math.random() > CLOUD_FREQUENCY) {
      clouds.push({
        x: canvas.width,
        y: px(30 + Math.floor(Math.random() * 40)),
        gap: 100 + Math.floor(Math.random() * 200),
      });
    }
  }

  // --- Zeichnen -------------------------------------------------------------
  // Der T-Rex wird aus Rechtecken nachgebaut. Die Aufteilung folgt der Silhouette
  // des Originals: hoher Kopf mit Schnauze, Auge als Aussparung, Rueckenlinie,
  // abfallender Schwanz, kurzer Arm und zwei animierte Beine.

  function drawTrex() {
    const x = Math.round(trex.x);
    const y = Math.round(trex.y);
    const unit = SCALE; // ein Original-Pixel
    const box = (left, top, width, height) => {
      context.fillRect(
        Math.round(x + left * unit),
        Math.round(y + top * unit),
        Math.ceil(width * unit),
        Math.ceil(height * unit),
      );
    };

    context.fillStyle = "#d4d6dc";

    if (trex.ducking) {
      // Geduckt: langgestreckter Koerper, Kopf nach vorn.
      box(0, 18, 14, 8);    // Schwanzspitze
      box(8, 14, 30, 14);   // Ruecken/Rumpf
      box(36, 12, 20, 12);  // Kopf
      box(52, 16, 6, 4);    // Schnauze
      context.fillStyle = "#12141b";
      box(48, 15, 3, 3);    // Auge
      context.fillStyle = "#d4d6dc";
      // Beine im Laufzyklus
      const duckFrame = Math.floor(distance / 6) % 2;
      box(14 + (duckFrame ? 0 : 4), 26, 7, 5);
      box(28 + (duckFrame ? 4 : 0), 26, 7, 5);
      return;
    }

    // Kopf: kompakter Block oben rechts, Schnauze ragt nach vorn ueber.
    box(27, 2, 15, 11);   // Schaedel
    box(42, 6, 4, 5);     // Schnauzenspitze
    box(27, 13, 11, 3);   // Unterkiefer
    context.fillStyle = "#12141b";
    box(37, 5, 3, 3);     // Auge als Aussparung
    context.fillStyle = "#d4d6dc";

    // Hals: schmaler als Kopf und Rumpf, dadurch bleibt der Kopf abgesetzt.
    box(24, 12, 9, 8);

    // Rumpf: oben breit, zum Schwanz hin schmaler -- das gibt die
    // charakteristische Keilform des Originals. Er reicht bewusst tief herunter,
    // damit der T-Rex gedrungen wirkt und nicht langbeinig.
    box(17, 19, 16, 12);
    box(19, 31, 14, 7);

    // Schwanz: laeuft in zwei Stufen nach hinten aus, leicht abfallend.
    box(9, 22, 10, 6);
    box(3, 25, 7, 4);

    // Winziger Arm direkt an der Brust. Bewusst nur eine kleine Stufe an der
    // Rumpfkante: Steht er weiter ab, liest sich die Silhouette wie ein zweites
    // Bein statt wie der typische Stummelarm des T-Rex.
    box(31, 24, 4, 3);

    if (trex.jumping) {
      // Im Sprung beide Beine angezogen
      box(20, 37, 6, 8);
      box(28, 37, 6, 8);
    } else {
      // Laufanimation: Der Takt haengt an der Strecke, nicht an der Zeit --
      // dadurch trippeln die Beine bei hohem Tempo sichtbar schneller.
      //
      // Ein Bein steht gestreckt am Boden (mit Fuss), das andere ist angewinkelt.
      // Der Fuss macht den Unterschied zwischen den beiden Frames deutlich
      // sichtbar; ohne ihn wirkt die Animation fast statisch.
      const legFrame = Math.floor(distance / 8) % 2;
      if (legFrame) {
        box(20, 37, 6, 10);   // hinteres Bein gestreckt
        box(20, 44, 9, 3);    // Fuss
        box(28, 37, 6, 5);    // vorderes Bein angewinkelt
      } else {
        box(20, 37, 6, 5);    // hinteres Bein angewinkelt
        box(28, 37, 6, 10);   // vorderes Bein gestreckt
        box(28, 44, 9, 3);    // Fuss
      }
    }
  }

  function drawCactus(obstacle) {
    const x = Math.round(obstacle.x);
    const y = Math.round(obstacle.y);
    const unit = SCALE;
    const single = obstacle.definition.width;
    context.fillStyle = "#74b785";

    // Jeder Kaktus der Gruppe wird einzeln gezeichnet.
    for (let index = 0; index < obstacle.size; index += 1) {
      const offset = x + index * single * unit;
      const box = (left, top, width, height) => {
        context.fillRect(
          Math.round(offset + left * unit),
          Math.round(y + top * unit),
          Math.ceil(width * unit),
          Math.ceil(height * unit),
        );
      };

      if (obstacle.type === "CACTUS_LARGE") {
        box(9, 0, 7, 50);   // Stamm
        box(2, 14, 7, 5);   // linker Arm
        box(2, 18, 5, 14);
        box(16, 10, 7, 5);  // rechter Arm
        box(18, 14, 5, 16);
      } else {
        box(6, 0, 6, 35);   // Stamm
        box(1, 10, 5, 4);   // linker Arm
        box(1, 13, 4, 10);
        box(12, 7, 5, 4);   // rechter Arm
        box(13, 10, 4, 11);
      }
    }
  }

  function drawPterodactyl(obstacle) {
    const x = Math.round(obstacle.x);
    const y = Math.round(obstacle.y);
    const unit = SCALE;
    const box = (left, top, width, height) => {
      context.fillRect(
        Math.round(x + left * unit),
        Math.round(y + top * unit),
        Math.ceil(width * unit),
        Math.ceil(height * unit),
      );
    };

    context.fillStyle = "#c9ccd4";
    // Kopf sitzt vorn oben, Schnabel laeuft spitz zu.
    box(32, 12, 12, 7);
    box(42, 15, 6, 3);
    // Schlanker Rumpf plus langer Schwanz nach hinten.
    box(18, 15, 16, 6);
    box(6, 17, 13, 4);
    box(2, 18, 5, 3);

    // Fluegel schlagen zwischen zwei Stellungen. Der Fluegel ist an der Wurzel
    // schmal und wird nach aussen breiter -- dadurch bleibt zwischen Fluegel und
    // Rumpf ein Spalt sichtbar und die Silhouette liest sich als Vogel statt
    // als geschlossener Klotz.
    if (obstacle.frame === 0) {
      box(24, 10, 6, 5);   // Wurzel am Rumpf
      box(20, 5, 13, 5);   // Fluegelflaeche
      box(22, 1, 9, 4);    // Spitze nach oben
    } else {
      box(24, 21, 6, 5);   // Wurzel am Rumpf
      box(20, 26, 13, 5);  // Fluegelflaeche
      box(22, 31, 9, 4);   // Spitze nach unten
    }
  }

  function drawCloud(cloud) {
    const x = Math.round(cloud.x);
    const y = Math.round(cloud.y);
    const unit = SCALE;
    context.fillStyle = "#555a68";
    context.fillRect(x, Math.round(y + 6 * unit), Math.ceil(38 * unit), Math.ceil(2 * unit));
    context.fillRect(Math.round(x + 8 * unit), y, Math.ceil(14 * unit), Math.ceil(2 * unit));
    context.fillRect(Math.round(x + 4 * unit), Math.round(y + 2 * unit), Math.ceil(26 * unit), Math.ceil(2 * unit));
    context.fillRect(Math.round(x + 2 * unit), Math.round(y + 4 * unit), Math.ceil(32 * unit), Math.ceil(2 * unit));
  }

  function drawScene() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#12141b";
    context.fillRect(0, 0, canvas.width, canvas.height);

    clouds.forEach(drawCloud);

    // Boden: durchgehende Linie plus Kieselstruktur, die mitscrollt.
    context.fillStyle = "#626674";
    context.fillRect(0, groundY, canvas.width, Math.ceil(2 * SCALE));

    const groundOffset = (distance * SCALE) % px(32);
    context.fillStyle = "#3c404d";
    for (let x = -groundOffset; x < canvas.width; x += px(32)) {
      context.fillRect(Math.round(x), groundY + px(6), px(11), px(1));
      context.fillRect(Math.round(x + px(18)), groundY + px(11), px(6), px(1));
    }

    obstacles.forEach((obstacle) => {
      if (obstacle.type === "PTERODACTYL") drawPterodactyl(obstacle);
      else drawCactus(obstacle);
    });

    drawTrex();

    context.fillStyle = "#8b8f9d";
    context.font = "14px monospace";
    context.textAlign = "right";
    context.fillText(
      `HI ${String(highScore).padStart(5, "0")}  ${String(score).padStart(5, "0")}`,
      canvas.width - 18,
      26,
    );

    if (!running) {
      context.textAlign = "center";
      context.fillStyle = "#b7bac4";
      context.font = "16px monospace";
      context.fillText(
        gameOver ? "GAME OVER" : "KLICKE AUF START",
        canvas.width / 2,
        105,
      );
      if (gameOver) {
        context.font = "12px monospace";
        context.fillText("Nutze den Button fuer einen Neustart", canvas.width / 2, 128);
      }
    }
  }

  /**
   * Kollisionspruefung in zwei Stufen, wie im Original: Erst die groben
   * Huellboxen, und nur bei Ueberschneidung die einzelnen Detailboxen. Das
   * verhindert Treffer, bei denen sich optisch nichts beruehrt.
   */
  function intersects(left, right) {
    return (
      left.x < right.x + right.width &&
      left.x + left.width > right.x &&
      left.y < right.y + right.height &&
      left.y + left.height > right.y
    );
  }

  function collides(obstacle) {
    const trexWidth = trex.ducking ? TREX.WIDTH_DUCK : TREX.WIDTH;
    const trexHeight = trex.ducking ? TREX.HEIGHT_DUCK : TREX.HEIGHT;

    const trexHull = {
      x: trex.x,
      y: trex.y,
      width: px(trexWidth),
      height: px(trexHeight),
    };
    const obstacleHull = {
      x: obstacle.x,
      y: obstacle.y,
      width: obstacle.width,
      height: obstacle.height,
    };

    if (!intersects(trexHull, obstacleHull)) return false;

    const trexBoxes = trex.ducking ? TREX_COLLISION_DUCKING : TREX_COLLISION_RUNNING;
    const obstacleBoxes = obstacle.definition.collisionBoxes;

    for (const rawTrexBox of trexBoxes) {
      const trexBox = {
        x: trex.x + px(rawTrexBox.x),
        y: trex.y + px(rawTrexBox.y),
        width: px(rawTrexBox.width),
        height: px(rawTrexBox.height),
      };

      // Bei Kaktusgruppen wiederholt sich die Box je Einzelkaktus.
      for (let index = 0; index < obstacle.size; index += 1) {
        const groupOffset = index * obstacle.definition.width;
        for (const rawObstacleBox of obstacleBoxes) {
          const obstacleBox = {
            x: obstacle.x + px(groupOffset + rawObstacleBox.x),
            y: obstacle.y + px(rawObstacleBox.y),
            width: px(rawObstacleBox.width),
            height: px(rawObstacleBox.height),
          };
          if (intersects(trexBox, obstacleBox)) return true;
        }
      }
    }

    return false;
  }

  async function finish() {
    running = false;
    gameOver = true;
    cancelAnimationFrame(animationId);
    highScore = Math.max(highScore, score);
    drawScene();

    const durationMs = Date.now() - startTime;
    if (durationMs < 1000) return;

    try {
      await api("/api/game/scores", {
        method: "POST",
        body: JSON.stringify({ score, durationMs }),
      });
      await loadLeaderboard();
    } catch (error) {
      console.error("Score konnte nicht gespeichert werden:", error);
    }
  }

  /**
   * Spielschleife.
   *
   * Rechnet mit einem Zeitdelta statt mit festen Frames, damit das Tempo auf
   * Bildschirmen mit 120 Hz nicht doppelt so hoch ist wie auf 60 Hz.
   */
  function tick(timestamp) {
    if (!running) return;

    if (!lastTime) lastTime = timestamp;
    const deltaMs = Math.min(timestamp - lastTime, 100); // Tab-Wechsel abfedern
    lastTime = timestamp;
    const deltaFrames = deltaMs / (1000 / 60);

    // Kontinuierliche Beschleunigung -- der Kern des Originals.
    if (speed < MAX_SPEED) {
      speed = Math.min(MAX_SPEED, speed + ACCELERATION * deltaFrames);
    }

    distance += speed * deltaFrames;
    score = Math.floor((distance - scoreOffset) * SCORE_COEFFICIENT);
    $("#game-score").textContent = String(score).padStart(5, "0");

    updateTrex(deltaFrames);
    updateObstacles(deltaFrames, deltaMs);
    updateClouds(deltaFrames);

    if (obstacles.some(collides)) {
      finish();
      return;
    }

    drawScene();
    animationId = requestAnimationFrame(tick);
  }

  function start() {
    if (running) return;
    cancelAnimationFrame(animationId);
    // Der Klick auf "Spiel starten" darf nicht als gehaltene Sprungtaste in die
    // neue Runde uebernommen werden.
    jumpHeld = false;
    resetGame();
    drawScene();
    animationId = requestAnimationFrame(tick);
  }

  $("#game-start").addEventListener("click", start);
  canvas.addEventListener("pointerdown", () => {
    if (!running) return;
    jumpHeld = true;
    startJump();
  });
  // Auch ausserhalb des Canvas loslassen zaehlt, sonst bliebe jumpHeld haengen.
  canvas.addEventListener("pointerup", () => {
    jumpHeld = false;
    if (running) endJump();
  });
  window.addEventListener("pointerup", () => { jumpHeld = false; });

  window.addEventListener("keydown", (event) => {
    if (state.activeView !== "game") return;

    if (event.code === "Space" || event.code === "ArrowUp") {
      if (!running) return;
      event.preventDefault();
      if (!jumpHeld) {
        jumpHeld = true;
        startJump();
      }
    }

    if (event.code === "ArrowDown") {
      if (!running) return;
      event.preventDefault();
      setDucking(true);
    }
  });

  window.addEventListener("keyup", (event) => {
    if (state.activeView !== "game") return;

    if (event.code === "Space" || event.code === "ArrowUp") {
      jumpHeld = false;
      endJump();
    }

    if (event.code === "ArrowDown") setDucking(false);
  });

  trex.y = trexGroundY();
  drawScene();
}

export function initializeTypingGame() {
  const promptElement = $("#typing-prompt");
  const input = $("#typing-input");
  const wpmElement = $("#typing-wpm");
  const accuracyElement = $("#typing-accuracy");
  const timerElement = $("#typing-timer");
  const startButton = $("#typing-start");

  let currentPrompt = "";
  let startTime = 0;
  let timerId = null;
  let running = false;
  let remainingSeconds = 60;
  let totalCorrectChars = 0;
  let totalTypedChars = 0;

  function pickPrompt() {
    if (TYPING_PROMPTS.length < 2 || !currentPrompt) {
      return TYPING_PROMPTS[Math.floor(Math.random() * TYPING_PROMPTS.length)];
    }

    let nextPrompt = currentPrompt;
    while (nextPrompt === currentPrompt) {
      nextPrompt = TYPING_PROMPTS[Math.floor(Math.random() * TYPING_PROMPTS.length)];
    }
    return nextPrompt;
  }

  function getFirstMismatchIndex(value) {
    for (let index = 0; index < value.length; index += 1) {
      if (value[index] !== currentPrompt[index]) return index;
    }
    return -1;
  }

  function resetTypingGame() {
    clearInterval(timerId);
    currentPrompt = "";
    startTime = 0;
    running = false;
    remainingSeconds = 60;
    totalCorrectChars = 0;
    totalTypedChars = 0;
    input.value = "";
    input.disabled = true;
    promptElement.textContent = "Klicke auf Start, um den ersten Text zu laden.";
    wpmElement.textContent = "0 WPM";
    accuracyElement.textContent = "0 % Genauigkeit";
    timerElement.textContent = "60s";
    startButton.textContent = "Starten";
  }

  function renderPrompt() {
    const typedValue = input.value;
    const mismatchIndex = getFirstMismatchIndex(typedValue);
    const doneLength = mismatchIndex === -1 ? typedValue.length : mismatchIndex;
    const errorLength = mismatchIndex === -1 ? 0 : Math.min(1, typedValue.length - mismatchIndex);
    const typedPart = escapeHtml(currentPrompt.slice(0, doneLength));
    const errorPart = errorLength ? escapeHtml(currentPrompt.slice(mismatchIndex, mismatchIndex + errorLength)) : "";
    const remainingPart = escapeHtml(currentPrompt.slice(doneLength + errorLength));
    promptElement.innerHTML = `
      <span class="typing-done">${typedPart}</span><span class="typing-error">${errorPart}</span><span>${remainingPart}</span>
    `;
  }

  function currentResult() {
    const typed = input.value;
    const mismatchIndex = getFirstMismatchIndex(typed);
    const currentCorrectChars = mismatchIndex === -1 ? typed.length : mismatchIndex;
    const currentTypedChars = typed.length;
    const correctChars = totalCorrectChars + currentCorrectChars;
    const totalChars = totalTypedChars + currentTypedChars;
    const errorChars = Math.max(0, totalChars - correctChars);

    const elapsedMs = Math.max(1, Date.now() - startTime);
    const accuracy = totalChars ? Math.round((correctChars / (correctChars + errorChars)) * 100) : 100;
    const wpm = Math.round((correctChars / 5) / (elapsedMs / 60_000));

    wpmElement.textContent = `${Math.max(0, wpm)} WPM`;
    accuracyElement.textContent = `${Math.max(0, accuracy)} % Genauigkeit`;

    return {
      wpm: Math.max(0, wpm),
      accuracy: Math.max(0, accuracy),
      correctChars,
      totalChars: Math.max(1, totalChars),
      durationMs: elapsedMs,
    };
  }

  function advancePrompt() {
    totalCorrectChars += currentPrompt.length;
    totalTypedChars += currentPrompt.length;
    currentPrompt = pickPrompt();
    input.value = "";
    renderPrompt();
    currentResult();
  }

  async function finishTypingGame() {
    if (!running) return;
    running = false;
    clearInterval(timerId);
    input.disabled = true;
    startButton.textContent = "Nochmal spielen";

    const result = currentResult();
    try {
      await api("/api/game/typing/scores", {
        method: "POST",
        body: JSON.stringify(result),
      });
      await loadTypingLeaderboard();
      showToast("Typing-Ergebnis gespeichert.");
    } catch (error) {
      console.error("Typing-Ergebnis konnte nicht gespeichert werden:", error);
    }
  }

  function tick() {
    remainingSeconds -= 1;
    timerElement.textContent = `${remainingSeconds}s`;
    currentResult();
    if (remainingSeconds <= 0) finishTypingGame();
  }

  function startTypingGame() {
    currentPrompt = pickPrompt();
    startTime = Date.now();
    running = true;
    remainingSeconds = 60;
    totalCorrectChars = 0;
    totalTypedChars = 0;
    input.disabled = false;
    input.value = "";
    input.focus();
    startButton.textContent = "Laeuft...";
    timerElement.textContent = "60s";
    accuracyElement.textContent = "100 % Genauigkeit";
    wpmElement.textContent = "0 WPM";
    renderPrompt();
    clearInterval(timerId);
    timerId = setInterval(tick, 1000);
  }

  $("#typing-start").addEventListener("click", () => {
    if (running) return;
    startTypingGame();
  });

  $("#typing-reset").addEventListener("click", resetTypingGame);

  input.addEventListener("input", () => {
    if (!running) return;
    const mismatchIndex = getFirstMismatchIndex(input.value);
    const maxLength = mismatchIndex === -1 ? currentPrompt.length : mismatchIndex + 1;
    if (input.value.length > maxLength) {
      input.value = input.value.slice(0, maxLength);
    }
    if (input.value.length > currentPrompt.length) {
      input.value = input.value.slice(0, currentPrompt.length);
    }
    renderPrompt();
    currentResult();
    if (input.value === currentPrompt) {
      advancePrompt();
    }
  });

  resetTypingGame();
}

initializeGame();

initializeTypingGame();
