import { HttpError } from "./http";

export function requiredString(
  value: unknown,
  field: string,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    throw new HttpError(400, `${field} fehlt.`);
  }

  const trimmed = value.trim();
  if (!trimmed) throw new HttpError(400, `${field} darf nicht leer sein.`);
  if (trimmed.length > maxLength) {
    throw new HttpError(400, `${field} ist zu lang.`);
  }

  return trimmed;
}

export function optionalString(
  value: unknown,
  maxLength: number,
): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new HttpError(400, "Ungültiger Text.");

  const trimmed = value.trim();
  if (trimmed.length > maxLength) throw new HttpError(400, "Text ist zu lang.");
  return trimmed || null;
}

export function positiveInteger(value: unknown, field: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new HttpError(400, `${field} ist ungültig.`);
  }
  return parsed;
}

export function validColor(value: unknown): string {
  const color = requiredString(value, "Farbe", 7);
  if (!/^#[0-9a-f]{6}$/i.test(color)) {
    throw new HttpError(400, "Farbe muss im Format #RRGGBB angegeben werden.");
  }
  return color.toLowerCase();
}

export function validUsername(value: unknown): string {
  const username = requiredString(value, "Benutzername", 40).toLowerCase();
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
    throw new HttpError(
      400,
      "Benutzername: 3–40 Zeichen; erlaubt sind Buchstaben, Zahlen, Punkt, Unterstrich und Bindestrich.",
    );
  }
  return username;
}

export function validPassword(value: unknown): string {
  const password = requiredString(value, "Passwort", 200);
  if (password.length < 12) {
    throw new HttpError(400, "Das Passwort muss mindestens 12 Zeichen lang sein.");
  }
  return password;
}
