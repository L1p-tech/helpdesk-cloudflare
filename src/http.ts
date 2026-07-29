import type { JsonObject } from "./types";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: JsonObject,
  ) {
    super(message);
  }
}

export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return json(
      { error: error.message, details: error.details ?? null },
      { status: error.status },
    );
  }

  console.error(error);
  return json({ error: "Interner Serverfehler." }, { status: 500 });
}

export async function readJson<T>(request: Request): Promise<T> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new HttpError(415, "JSON erwartet.");
  }

  try {
    return await request.json<T>();
  } catch {
    throw new HttpError(400, "Ungültiges JSON.");
  }
}

export function assertSameOrigin(request: Request): void {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;

  const origin = request.headers.get("origin");
  if (!origin) return;

  const expected = new URL(request.url).origin;
  if (origin !== expected) {
    throw new HttpError(403, "Ungültige Anfragequelle.");
  }
}

export function getClientIp(request: Request): string {
  return request.headers.get("cf-connecting-ip") ?? "unknown";
}
