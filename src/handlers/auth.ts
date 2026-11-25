import { clearSessionCookie, login, logout } from "../auth";
import { hashPassword } from "../crypto";
import { audit } from "../db";
import { HttpError, json, readJson } from "../http";
import { ensureDefaultLibrary } from "../library";
import type { AuthUser, Env } from "../types";
import { requiredString, validPassword, validUsername } from "../validation";

export async function createInitialAdmin(request: Request, env: Env): Promise<Response> {
  const token = request.headers.get("x-setup-token");
  if (!env.ADMIN_SETUP_TOKEN || token !== env.ADMIN_SETUP_TOKEN) {
    throw new HttpError(403, "Ungültiger Setup-Token.");
  }

  // Der Endpunkt ist nur solange offen, wie es ueberhaupt keinen Benutzer gibt.
  const existing = await env.DB.prepare("SELECT COUNT(*) AS count FROM users")
    .first<{ count: number }>();
  if ((existing?.count ?? 0) > 0) {
    throw new HttpError(409, "Es existiert bereits mindestens ein Benutzer.");
  }

  const body = await readJson<Record<string, unknown>>(request);
  const username = validUsername(body.username);
  const displayName = requiredString(body.displayName, "Anzeigename", 80);
  const password = validPassword(body.password);
  const passwordData = await hashPassword(password);

  const result = await env.DB.prepare(
    `INSERT INTO users
      (username, display_name, password_hash, password_salt, password_iterations, role)
     VALUES (?1, ?2, ?3, ?4, ?5, 'admin')`,
  )
    .bind(
      username,
      displayName,
      passwordData.hash,
      passwordData.salt,
      passwordData.iterations,
    )
    .run();

  const adminId = Number(result.meta.last_row_id);

  // Die Seed-Migrationen liefen ins Leere, solange kein Admin existierte --
  // jetzt nachziehen, damit die Installation nicht leer startet.
  await ensureDefaultLibrary(env, { id: adminId, displayName });
  await audit(env, adminId, "setup_admin", "user", adminId);
  return json({ ok: true }, { status: 201 });
}

export const LOGIN_IP_MAX_FAILURES = 20;
export const LOGIN_IP_WINDOW_MINUTES = 15;

export async function handleAuth(
  request: Request,
  env: Env,
  user: AuthUser | null,
  path: string,
): Promise<Response | null> {
  if (path === "/api/setup/admin" && request.method === "POST") {
    return createInitialAdmin(request, env);
  }

  if (path === "/api/auth/login" && request.method === "POST") {
    const body = await readJson<Record<string, unknown>>(request);
    const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
    const results = await env.DB.batch([
      env.DB.prepare("DELETE FROM login_attempts WHERE attempted_at < datetime('now', '-1 day')"),
      env.DB.prepare(
        `INSERT INTO login_attempts (ip)
         SELECT ?1 WHERE (
           SELECT COUNT(*) FROM login_attempts
           WHERE ip = ?1 AND attempted_at > datetime('now', '-' || ?2 || ' minutes')
         ) < ?3`,
      ).bind(ip, LOGIN_IP_WINDOW_MINUTES, LOGIN_IP_MAX_FAILURES),
    ]);
    const reservation = results[1]!;
    if (reservation.meta.changes === 0) {
      throw new HttpError(429, "Zu viele Fehlversuche von dieser Adresse. Bitte später erneut versuchen.");
    }
    const attemptId = reservation.meta.last_row_id;

    let result;
    try {
      result = await login(
        request,
        env,
        requiredString(body.username, "Benutzername", 40),
        requiredString(body.password, "Passwort", 200),
      );
    } catch (error) {
      const failedCredentials = error instanceof HttpError && (error.status === 401 || error.status === 429);
      if (!failedCredentials) await env.DB.prepare("DELETE FROM login_attempts WHERE id = ?1").bind(attemptId).run();
      throw error;
    }
    await env.DB.prepare("DELETE FROM login_attempts WHERE id = ?1").bind(attemptId).run();

    await audit(env, result.user.id, "login", "session", null);
    return json(
      { user: result.user },
      { headers: { "set-cookie": result.cookie } },
    );
  }

  if (path === "/api/auth/logout" && request.method === "POST") {
    if (user) await audit(env, user.id, "logout", "session", null);
    await logout(request, env);
    return json(
      { ok: true },
      { headers: { "set-cookie": clearSessionCookie() } },
    );
  }

  if (path === "/api/auth/me" && request.method === "GET") {
    return json({ user });
  }

  return null;
}
