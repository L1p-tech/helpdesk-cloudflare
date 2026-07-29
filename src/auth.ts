import { hashPassword, randomToken, sha256, timingSafeEqual } from "./crypto";
import { getClientIp, HttpError } from "./http";
import type { AuthUser, Env, Role, SessionRow } from "./types";

const SESSION_COOKIE = "helpdesk_session";
const MAX_LOGIN_FAILURES = 5;
const LOCK_MINUTES = 15;

interface UserRow {
  id: number;
  username: string;
  display_name: string;
  password_hash: string;
  password_salt: string;
  password_iterations: number;
  role: Role;
  active: number;
  failed_login_count: number;
  locked_until: string | null;
}

function parseCookies(request: Request): Map<string, string> {
  const cookies = new Map<string, string>();
  const header = request.headers.get("cookie") ?? "";

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key) cookies.set(key, decodeURIComponent(value));
  }

  return cookies;
}

function sessionCookie(token: string, maxAgeSeconds: number): string {
  return [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    `Max-Age=${maxAgeSeconds}`,
  ].join("; ");
}

export function clearSessionCookie(): string {
  return [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    "Max-Age=0",
  ].join("; ");
}

export async function authenticate(request: Request, env: Env): Promise<AuthUser | null> {
  const token = parseCookies(request).get(SESSION_COOKIE);
  if (!token) return null;

  const tokenHash = await sha256(token);
  const row = await env.DB.prepare(
    `SELECT s.id, s.user_id, s.expires_at, u.username, u.display_name, u.role, u.active
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ?1 AND s.expires_at > CURRENT_TIMESTAMP`,
  )
    .bind(tokenHash)
    .first<SessionRow>();

  if (!row || row.active !== 1) return null;

  await env.DB.prepare(
    "UPDATE sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?1",
  ).bind(row.id).run();

  return {
    id: row.user_id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
  };
}

export function requireUser(user: AuthUser | null): AuthUser {
  if (!user) throw new HttpError(401, "Anmeldung erforderlich.");
  return user;
}

export function requireRole(user: AuthUser, roles: Role[]): void {
  if (!roles.includes(user.role)) {
    throw new HttpError(403, "Keine Berechtigung für diese Aktion.");
  }
}

export async function login(
  request: Request,
  env: Env,
  username: string,
  password: string,
): Promise<{ user: AuthUser; cookie: string }> {
  const normalizedUsername = username.trim().toLowerCase();

  const row = await env.DB.prepare(
    `SELECT id, username, display_name, password_hash, password_salt,
            password_iterations, role, active, failed_login_count, locked_until
     FROM users WHERE username = ?1 COLLATE NOCASE`,
  )
    .bind(normalizedUsername)
    .first<UserRow>();

  if (!row || row.active !== 1) {
    throw new HttpError(401, "Benutzername oder Passwort ist falsch.");
  }

  if (row.locked_until && Date.parse(row.locked_until) > Date.now()) {
    throw new HttpError(429, "Konto vorübergehend gesperrt. Bitte später erneut versuchen.");
  }

  const candidate = await hashPassword(
    password,
    row.password_salt,
    row.password_iterations,
  );

  if (!timingSafeEqual(candidate.hash, row.password_hash)) {
    const failures = row.failed_login_count + 1;
    const shouldLock = failures >= MAX_LOGIN_FAILURES;

    await env.DB.prepare(
      `UPDATE users
       SET failed_login_count = ?1,
           locked_until = CASE
             WHEN ?2 = 1 THEN datetime('now', '+' || ?3 || ' minutes')
             ELSE NULL
           END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?4`,
    )
      .bind(shouldLock ? 0 : failures, shouldLock ? 1 : 0, LOCK_MINUTES, row.id)
      .run();

    throw new HttpError(
      shouldLock ? 429 : 401,
      shouldLock
        ? "Zu viele Fehlversuche. Konto wurde für 15 Minuten gesperrt."
        : "Benutzername oder Passwort ist falsch.",
    );
  }

  await env.DB.prepare(
    `UPDATE users
     SET failed_login_count = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?1`,
  ).bind(row.id).run();

  const token = randomToken();
  const tokenHash = await sha256(token);
  const ttlHours = Math.max(1, Number(env.SESSION_TTL_HOURS) || 12);
  const maxAgeSeconds = ttlHours * 60 * 60;

  await env.DB.prepare(
    `INSERT INTO sessions
      (user_id, token_hash, expires_at, user_agent, ip_address)
     VALUES (?1, ?2, datetime('now', '+' || ?3 || ' hours'), ?4, ?5)`,
  )
    .bind(
      row.id,
      tokenHash,
      ttlHours,
      request.headers.get("user-agent")?.slice(0, 300) ?? "",
      getClientIp(request),
    )
    .run();

  return {
    user: {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      role: row.role,
    },
    cookie: sessionCookie(token, maxAgeSeconds),
  };
}

export async function logout(request: Request, env: Env): Promise<void> {
  const token = parseCookies(request).get(SESSION_COOKIE);
  if (!token) return;

  const tokenHash = await sha256(token);
  await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?1")
    .bind(tokenHash)
    .run();
}
