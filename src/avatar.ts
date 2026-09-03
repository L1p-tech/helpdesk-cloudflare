/**
 * Pixel-Avatare: gemeinsame Merkmalsliste fuer Worker und Oberflaeche.
 *
 * Gespeichert wird nur die Auswahl (welche Frisur, welche Farbe), nie ein
 * fertiges Bild. Gezeichnet wird daraus erst im Browser. Dadurch bleibt ein
 * Avatar rund 60 Zeichen gross, und die Zeichnung laesst sich spaeter
 * verbessern, ohne gespeicherte Daten anzufassen.
 */

/** Hauttoene -- bewusst breit gefaechert, nicht nur helle Varianten. */
export const AVATAR_SKINS = [
  "#8d5524", "#c68642", "#e0ac69", "#f1c27d", "#ffdbac", "#5c3317",
] as const;

export const AVATAR_HAIR_COLORS = [
  "#2c1b18", "#4a312c", "#8b4513", "#b55239", "#d4a017", "#e8e3d9",
  "#6b7280", "#7c3aed", "#2ea86e", "#d55f5f",
] as const;

export const AVATAR_SHIRT_COLORS = [
  "#4a7cff", "#2ea86e", "#d55f5f", "#d89b36", "#8b5cf6", "#1f9d8b",
  "#c05621", "#5b8def", "#42a7c6", "#6b7280",
] as const;

/** Anzahl der Varianten je Formmerkmal. Die Formen selbst zeichnet das Frontend. */
export const AVATAR_SHAPES = {
  hair: 8,
  eyes: 5,
  mouth: 4,
  accessory: 6,
} as const;

export interface Avatar {
  skin: number;
  hair: number;
  hairColor: number;
  eyes: number;
  mouth: number;
  shirt: number;
  accessory: number;
}

export const DEFAULT_AVATAR: Avatar = {
  skin: 3, hair: 0, hairColor: 0, eyes: 0, mouth: 0, shirt: 0, accessory: 0,
};

/** Begrenzt einen Wert auf 0..max-1. Alles Unbrauchbare wird zu 0. */
function index(value: unknown, max: number): number {
  const zahl = typeof value === "number" ? Math.floor(value) : Number.NaN;
  return Number.isFinite(zahl) && zahl >= 0 && zahl < max ? zahl : 0;
}

/**
 * Bringt beliebige Eingaben auf einen gueltigen Avatar.
 *
 * Der Worker speichert nur das Ergebnis dieser Funktion. So kann ueber die
 * API weder ein unbekanntes Merkmal noch ein ueberlanges Feld in die
 * Datenbank gelangen, und die Oberflaeche muss beim Zeichnen keine
 * Sonderfaelle abfangen.
 */
export function normalizeAvatar(value: unknown): Avatar {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    skin: index(source.skin, AVATAR_SKINS.length),
    hair: index(source.hair, AVATAR_SHAPES.hair),
    hairColor: index(source.hairColor, AVATAR_HAIR_COLORS.length),
    eyes: index(source.eyes, AVATAR_SHAPES.eyes),
    mouth: index(source.mouth, AVATAR_SHAPES.mouth),
    shirt: index(source.shirt, AVATAR_SHIRT_COLORS.length),
    accessory: index(source.accessory, AVATAR_SHAPES.accessory),
  };
}

/** Liest einen gespeicherten Avatar. Fehlt oder bricht er, kommt null zurueck. */
export function parseAvatar(stored: string | null | undefined): Avatar | null {
  if (!stored) return null;
  try {
    return normalizeAvatar(JSON.parse(stored));
  } catch {
    return null;
  }
}
