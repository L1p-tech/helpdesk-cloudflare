import { $, escapeHtml, showToast, state } from "./base.js";
import { api } from "./core.js";

export const AVATAR_SKINS = [
  "#8d5524", "#c68642", "#e0ac69", "#f1c27d", "#ffdbac", "#5c3317",
];

export const AVATAR_HAIR_COLORS = [
  "#2c1b18", "#4a312c", "#8b4513", "#b55239", "#d4a017", "#e8e3d9",
  "#6b7280", "#7c3aed", "#2ea86e", "#d55f5f",
];

export const AVATAR_SHIRT_COLORS = [
  "#4a7cff", "#2ea86e", "#d55f5f", "#d89b36", "#8b5cf6", "#1f9d8b",
  "#c05621", "#5b8def", "#42a7c6", "#6b7280",
];

export const AVATAR_GRID = 16;

export const AVATAR_DEFAULT = {
  skin: 3, hair: 0, hairColor: 0, eyes: 0, mouth: 0, shirt: 0, accessory: 0,
};

export const AVATAR_LABELS = {
  skin: "Hautton",
  hair: "Frisur",
  hairColor: "Haarfarbe",
  eyes: "Augen",
  mouth: "Mund",
  shirt: "Oberteil",
  accessory: "Zubehör",
};

export const AVATAR_SHAPE_COUNTS = { hair: 8, eyes: 5, mouth: 4, accessory: 6 };

/** Begrenzt eine Auswahl auf den gueltigen Bereich -- gleiche Regel wie im Worker. */
export function avatarIndex(value, max) {
  const zahl = Math.floor(Number(value));
  return Number.isFinite(zahl) && zahl >= 0 && zahl < max ? zahl : 0;
}

export function normalizeAvatar(value) {
  const quelle = value && typeof value === "object" ? value : {};
  return {
    skin: avatarIndex(quelle.skin, AVATAR_SKINS.length),
    hair: avatarIndex(quelle.hair, AVATAR_SHAPE_COUNTS.hair),
    hairColor: avatarIndex(quelle.hairColor, AVATAR_HAIR_COLORS.length),
    eyes: avatarIndex(quelle.eyes, AVATAR_SHAPE_COUNTS.eyes),
    mouth: avatarIndex(quelle.mouth, AVATAR_SHAPE_COUNTS.mouth),
    shirt: avatarIndex(quelle.shirt, AVATAR_SHIRT_COLORS.length),
    accessory: avatarIndex(quelle.accessory, AVATAR_SHAPE_COUNTS.accessory),
  };
}

/**
 * Erzeugt aus einem Namen einen Avatar.
 *
 * Wer noch keinen gebaut hat, bekommt trotzdem ein eigenes Gesicht statt einer
 * grauen Platzhalterflaeche. Der Name wird dafuer in eine Zahl gefaltet --
 * gleiche Person, gleiches Aussehen, ohne dass etwas gespeichert werden muss.
 */
export function avatarFromName(name) {
  let hash = 0;
  for (const zeichen of String(name || "?")) {
    hash = (hash * 31 + zeichen.codePointAt(0)) >>> 0;
  }
  const teil = (teiler, max) => Math.floor(hash / teiler) % max;
  return {
    skin: teil(1, AVATAR_SKINS.length),
    hair: teil(7, AVATAR_SHAPE_COUNTS.hair),
    hairColor: teil(13, AVATAR_HAIR_COLORS.length),
    eyes: teil(31, AVATAR_SHAPE_COUNTS.eyes),
    mouth: teil(61, AVATAR_SHAPE_COUNTS.mouth),
    shirt: teil(127, AVATAR_SHIRT_COLORS.length),
    accessory: 0,
  };
}

/* Die Formen als Pixelkarten. Jeder Eintrag ist [spalte, zeile]. Das Raster
   ist 16x16; Kopf und Koerper sitzen fest, variabel sind Haare und Zubehoer. */

export const AVATAR_HAIR_SHAPES = [
  // 0: kurz -- eine flache Kappe
  [[4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[10,2],[11,2],
   [3,3],[4,3],[11,3],[12,3]],
  // 1: Seitenscheitel -- eine Seite deutlich hoeher
  [[4,1],[5,1],[6,1],[7,1],[8,1],
   [4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[10,2],[11,2],
   [3,3],[4,3],[5,3],[11,3],[12,3]],
  // 2: lang -- faellt bis auf die Schultern
  [[4,1],[5,1],[6,1],[7,1],[8,1],[9,1],[10,1],[11,1],
   [3,2],[4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[10,2],[11,2],[12,2],
   [3,3],[12,3],[2,4],[3,4],[12,4],[13,4],[2,5],[3,5],[12,5],[13,5],
   [2,6],[3,6],[12,6],[13,6],[2,7],[3,7],[12,7],[13,7],[3,8],[12,8],
   // Bis ueber die Schultern, sonst verschwindet die Laenge hinter dem Oberteil.
   [3,9],[12,9],[3,10],[12,10],[3,11],[12,11],[2,12],[3,12],[12,12],[13,12],
   [2,13],[13,13]],
  // 3: Dutt -- Knoten oben auf dem Kopf
  [[7,0],[8,0],[6,1],[7,1],[8,1],[9,1],
   [4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[10,2],[11,2],
   [3,3],[4,3],[11,3],[12,3]],
  // 4: Locken -- ausgefranste Silhouette
  [[5,0],[7,0],[9,0],[10,0],
   [3,1],[4,1],[6,1],[8,1],[10,1],[11,1],
   [3,2],[4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[10,2],[11,2],[12,2],
   [2,3],[3,3],[4,3],[11,3],[12,3],[13,3],[2,4],[13,4]],
  // 5: Glatze -- nur ein Kranz an den Seiten
  [[3,4],[3,5],[3,6],[12,4],[12,5],[12,6]],
  // 6: Irokese -- schmaler hoher Kamm
  [[7,0],[8,0],[7,1],[8,1],[6,1],[9,1],
   [6,2],[7,2],[8,2],[9,2],[5,2],[10,2],
   [3,3],[4,3],[11,3],[12,3]],
  // 7: Pony -- gerade Kante tief in der Stirn
  [[4,1],[5,1],[6,1],[7,1],[8,1],[9,1],[10,1],[11,1],
   [3,2],[4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[10,2],[11,2],[12,2],
   [3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[10,3],[11,3],[12,3],
   [3,4],[12,4],[3,5],[12,5]],
];

/* Augen: [linkes Auge, rechtes Auge] als Pixel, plus optionale Extras. */
export const AVATAR_EYE_SHAPES = [
  [[5,6],[10,6]],                                  // 0: Punkte
  [[5,6],[6,6],[9,6],[10,6]],                      // 1: breit
  [[5,5],[5,6],[10,5],[10,6]],                     // 2: gross
  [[5,6],[9,6],[10,6]],                            // 3: zwinkernd
  [[5,5],[6,6],[10,5],[9,6]],                      // 4: schraeg
];

export const AVATAR_MOUTH_SHAPES = [
  [[7,9],[8,9]],                                   // 0: neutral
  [[6,9],[9,9],[7,10],[8,10]],                     // 1: laecheln
  [[7,9],[8,9],[7,10],[8,10]],                     // 2: offen
  [[6,9],[7,10],[8,10],[9,9]],                     // 3: grinsen
];

/* Zubehoer wird in eigener Farbe gezeichnet: [pixel, farbe]. */
export const AVATAR_ACCESSORIES = [
  null,                                            // 0: keins
  // Brille: Rahmen um die Augen, Steg dazwischen -- die Augenpixel selbst
  // bleiben frei, sonst verschwindet der Blick hinter dem Gestell.
  { color: "#2b2f36", pixels: [[4,5],[5,5],[6,5],[4,6],[6,6],[4,7],[5,7],[6,7],
                               [9,5],[10,5],[11,5],[9,6],[11,6],[9,7],[10,7],[11,7],
                               [7,6],[8,6]] },
  // Kappe mit Schirm
  { color: "#d55f5f", pixels: [[4,0],[5,0],[6,0],[7,0],[8,0],[9,0],[10,0],[11,0],
                               [3,1],[4,1],[5,1],[6,1],[7,1],[8,1],[9,1],[10,1],[11,1],[12,1],
                               [2,2],[3,2],[4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[10,2],[11,2],[12,2],[13,2]] },
  // Kopfhoerer: Buegel oben, Muscheln an den Ohren
  { color: "#2ea86e", pixels: [[5,1],[6,1],[7,1],[8,1],[9,1],[10,1],
                               [4,2],[11,2],[3,3],[2,4],[2,5],[2,6],[3,4],[3,5],[3,6],
                               [12,3],[13,4],[13,5],[13,6],[12,4],[12,5],[12,6]] },
  // Krawatte
  { color: "#d89b36", pixels: [[7,12],[8,12],[7,13],[8,13],[7,14],[8,14]] },
  // Stirnband
  { color: "#7c3aed", pixels: [[3,4],[4,4],[5,4],[6,4],[7,4],[8,4],[9,4],[10,4],[11,4],[12,4]] },
];

/**
 * Schaetzt, ob eine Farbe dunkel ist.
 *
 * Die Gewichtung entspricht der wahrgenommenen Helligkeit -- Gruen traegt
 * am staerksten bei, Blau am wenigsten. Wird gebraucht, damit Augen und Mund
 * auf jedem Hautton sichtbar bleiben.
 */
export function istDunkel(hexFarbe) {
  const wert = parseInt(hexFarbe.slice(1), 16);
  const rot = (wert >> 16) & 255;
  const gruen = (wert >> 8) & 255;
  const blau = wert & 255;
  return (0.299 * rot + 0.587 * gruen + 0.114 * blau) < 110;
}

/**
 * Zeichnet einen Avatar auf ein Canvas.
 *
 * Die Groesse ergibt sich aus der Canvas-Breite, damit derselbe Code fuer das
 * kleine Bild neben einem Namen und die grosse Vorschau im Editor taugt.
 */
export function drawAvatar(canvas, avatar) {
  const context = canvas.getContext("2d");
  const daten = normalizeAvatar(avatar);
  const feld = canvas.width / AVATAR_GRID;

  context.clearRect(0, 0, canvas.width, canvas.height);
  // Ohne diese Zeile verwischt der Browser die Kanten beim Skalieren.
  context.imageSmoothingEnabled = false;

  const male = (pixel, farbe) => {
    context.fillStyle = farbe;
    context.fillRect(pixel[0] * feld, pixel[1] * feld, feld, feld);
  };
  const maleAlle = (pixel, farbe) => pixel.forEach((p) => male(p, farbe));

  const haut = AVATAR_SKINS[daten.skin];
  const haar = AVATAR_HAIR_COLORS[daten.hairColor];
  const shirt = AVATAR_SHIRT_COLORS[daten.shirt];

  // Kopf
  const kopf = [];
  for (let x = 4; x <= 11; x++) {
    for (let y = 3; y <= 10; y++) kopf.push([x, y]);
  }
  maleAlle(kopf, haut);

  // Ohren
  maleAlle([[3, 7], [12, 7]], haut);

  // Hals
  maleAlle([[7, 11], [8, 11]], haut);

  // Schultern und Oberteil
  const koerper = [];
  for (let x = 3; x <= 12; x++) {
    for (let y = 12; y <= 15; y++) koerper.push([x, y]);
  }
  maleAlle(koerper, shirt);
  // Arme etwas dunkler, damit die Silhouette lesbar bleibt.
  maleAlle([[2, 13], [2, 14], [13, 13], [13, 14]], shirt);

  maleAlle(AVATAR_HAIR_SHAPES[daten.hair], haar);
  // Augen und Mund richten sich nach dem Hautton: Auf dunkler Haut verschwaende
  // ein fast schwarzes Auge, auf heller waere ein helles nicht zu sehen.
  maleAlle(AVATAR_EYE_SHAPES[daten.eyes], istDunkel(haut) ? "#f5f0e8" : "#1b1d22");
  maleAlle(AVATAR_MOUTH_SHAPES[daten.mouth], istDunkel(haut) ? "#e6a5a5" : "#8a4242");

  const zubehoer = AVATAR_ACCESSORIES[daten.accessory];
  if (zubehoer) maleAlle(zubehoer.pixels, zubehoer.color);
}

/**
 * Liefert das HTML fuer ein kleines Avatarbild neben einem Namen.
 *
 * Gezeichnet wird erst nachtraeglich von hydrateAvatars(): Beim Bauen der
 * Listen gibt es die Canvas-Elemente noch nicht, und ein einzelner Durchlauf
 * nach dem Einsetzen ist guenstiger als Zeichnen pro Zeile.
 */
export function avatarTag(name, groesse = 24) {
  return `<canvas class="avatar-chip" width="${groesse * 2}" height="${groesse * 2}"
                  style="width:${groesse}px;height:${groesse}px"
                  data-avatar-name="${escapeHtml(name || "")}"
                  aria-hidden="true"></canvas>`;
}

/** Zeichnet alle noch leeren Avatarbilder im angegebenen Bereich. */
export function hydrateAvatars(root = document) {
  root.querySelectorAll("canvas[data-avatar-name]:not([data-avatar-drawn])")
    .forEach((canvas) => {
      const name = canvas.dataset.avatarName;
      drawAvatar(canvas, avatarForName(name));
      canvas.dataset.avatarDrawn = "1";
    });
}

/**
 * Findet den Avatar zu einem Anzeigenamen.
 *
 * Gesucht wird ueber den Namen und nicht ueber die Benutzer-ID, weil Chat,
 * Vorschlaege und Statistik teils nur den Namen mitliefern -- bei geloeschten
 * Benutzern steht dort ohnehin nur noch ein Platzhalter. Wer keinen Avatar
 * gebaut hat, bekommt einen aus dem Namen abgeleiteten.
 */
export function avatarForName(name) {
  const eintrag = state.avatars.find((item) => item.name === name);
  return eintrag?.avatar || avatarFromName(name);
}

/* Welche Merkmale der Editor anbietet und wie viele Varianten es je gibt.
   Farbmerkmale bekommen Farbfelder, Formmerkmale nummerierte Knoepfe. */
export const AVATAR_FIELDS = [
  { key: "skin", colors: AVATAR_SKINS },
  { key: "hair", count: AVATAR_SHAPE_COUNTS.hair },
  { key: "hairColor", colors: AVATAR_HAIR_COLORS },
  { key: "eyes", count: AVATAR_SHAPE_COUNTS.eyes },
  { key: "mouth", count: AVATAR_SHAPE_COUNTS.mouth },
  { key: "shirt", colors: AVATAR_SHIRT_COLORS },
  { key: "accessory", count: AVATAR_SHAPE_COUNTS.accessory },
];

/** Der Stand im Editor -- erst beim Speichern wird er uebernommen. */
export let avatarDraft = null;

export function renderAvatarEditor() {
  const preview = $("#avatar-preview");
  if (!preview) return;

  if (!avatarDraft) avatarDraft = { ...state.avatar };
  drawAvatar(preview, avatarDraft);

  $("#avatar-controls").innerHTML = AVATAR_FIELDS.map((feld) => {
    const aktiv = avatarDraft[feld.key];
    const knoepfe = feld.colors
      ? feld.colors.map((farbe, index) => `
          <button type="button" class="avatar-swatch ${index === aktiv ? "active" : ""}"
                  style="background:${farbe}"
                  data-avatar-field="${feld.key}" data-avatar-value="${index}"
                  aria-label="${AVATAR_LABELS[feld.key]} ${index + 1}"
                  aria-pressed="${index === aktiv}"></button>`).join("")
      : Array.from({ length: feld.count }, (unused, index) => `
          <button type="button" class="avatar-option ${index === aktiv ? "active" : ""}"
                  data-avatar-field="${feld.key}" data-avatar-value="${index}"
                  aria-pressed="${index === aktiv}">${index + 1}</button>`).join("");

    return `
      <div class="avatar-field">
        <span class="avatar-field-label">${AVATAR_LABELS[feld.key]}</span>
        <div class="avatar-field-options">${knoepfe}</div>
      </div>`;
  }).join("");
}

$("#avatar-controls").addEventListener("click", (event) => {
  const knopf = event.target.closest("[data-avatar-field]");
  if (!knopf) return;

  avatarDraft[knopf.dataset.avatarField] = Number(knopf.dataset.avatarValue);
  renderAvatarEditor();
});

$("#avatar-random").addEventListener("click", () => {
  // Ein zufaelliger Name als Ausgangspunkt -- so entsteht eine stimmige
  // Kombination statt reiner Wuerfelei bei jedem Merkmal.
  avatarDraft = avatarFromName(String(Math.random()));
  renderAvatarEditor();
});

$("#avatar-reset").addEventListener("click", () => {
  avatarDraft = { ...state.avatar };
  renderAvatarEditor();
});

$("#avatar-save").addEventListener("click", async () => {
  try {
    await api("/api/settings", {
      method: "PUT",
      body: JSON.stringify({
        signatureName: state.settings.signatureName,
        favorites: state.settings.favorites,
        preferences: state.settings.preferences,
        avatar: avatarDraft,
      }),
    });

    state.avatar = { ...avatarDraft };
    // Auch die gemeinsame Liste nachziehen, damit der eigene Avatar sofort
    // neben dem eigenen Namen erscheint, ohne die Seite neu zu laden.
    const eigener = state.avatars.find((item) => item.id === state.user.id);
    if (eigener) eigener.avatar = state.avatar;
    else state.avatars.push({
      id: state.user.id, name: state.user.displayName, avatar: state.avatar,
    });

    // Bereits gezeichnete Bilder neu zeichnen lassen.
    document.querySelectorAll("canvas[data-avatar-drawn]")
      .forEach((canvas) => delete canvas.dataset.avatarDrawn);
    hydrateAvatars();

    showToast("Avatar gespeichert.");
  } catch (error) {
    alert(error.message);
  }
});
