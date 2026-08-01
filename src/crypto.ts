const encoder = new TextEncoder();

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export function randomToken(byteLength = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return toBase64(bytes)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return toBase64(new Uint8Array(digest));
}

/**
 * Obergrenze der Cloudflare-Workers-Laufzeit fuer PBKDF2. Hoehere Werte
 * quittiert die WebCrypto-Implementierung mit einem NotSupportedError
 * ("iteration counts above 100000 are not supported"). Lokal in `wrangler dev`
 * greift das Limit nicht, weshalb zu hohe Werte erst in der Produktion
 * auffallen -- der Standard muss daher hier verankert bleiben.
 */
export const MAX_PBKDF2_ITERATIONS = 100_000;

export async function hashPassword(
  password: string,
  saltBase64?: string,
  iterations = MAX_PBKDF2_ITERATIONS,
): Promise<{ hash: string; salt: string; iterations: number }> {
  const salt = saltBase64
    ? fromBase64(saltBase64)
    : crypto.getRandomValues(new Uint8Array(16));

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  // Gespeicherte Iterationszahlen aus aelteren Datensaetzen koennen ueber dem
  // Laufzeitlimit liegen. Ungeprueft wuerde deriveBits werfen und der Login
  // waere fuer diese Konten dauerhaft blockiert, statt nur langsamer zu sein.
  const safeIterations = Math.min(iterations, MAX_PBKDF2_ITERATIONS);

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: new Uint8Array(salt).buffer,
      iterations: safeIterations,
    },
    key,
    256,
  );

  return {
    hash: toBase64(new Uint8Array(bits)),
    salt: toBase64(salt),
    iterations: safeIterations,
  };
}

export function timingSafeEqual(left: string, right: string): boolean {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const maxLength = Math.max(leftBytes.length, rightBytes.length);
  let difference = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < maxLength; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return difference === 0;
}
