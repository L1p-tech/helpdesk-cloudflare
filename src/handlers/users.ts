import { requireRole } from "../auth";
import { hashPassword } from "../crypto";
import { audit, DELETED_USER_LABEL, ignoreMissingTable } from "../db";
import { HttpError, json, readJson } from "../http";
import type { AuthUser, Env } from "../types";
import { positiveInteger, requiredString, validPassword, validUsername } from "../validation";
import { ROLES, oneOf } from "../shared";

export async function handleUsers(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
  // Aenderungsprotokoll: Der Worker schreibt bei jeder Aktion einen Eintrag,
  // bisher gab es aber keine Moeglichkeit, ihn zu lesen. Nur fuer Admins, weil
  // dort steht, wer was wann getan hat.
  if (path === "/api/audit" && request.method === "GET") {
    requireRole(user, ["admin"]);

    const result = await env.DB.prepare(
      `SELECT a.id, a.action, a.entity_type, a.entity_id, a.details_json, a.created_at,
              COALESCE(u.display_name, ?1) AS user_name
       FROM audit_log a
       LEFT JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC, a.id DESC
       LIMIT 200`,
    ).bind(DELETED_USER_LABEL).all();

    return json({ entries: result.results });
  }

  if (path === "/api/users" && request.method === "GET") {
    requireRole(user, ["admin"]);
    const result = await env.DB.prepare(
      `SELECT id, username, display_name, role, active, created_at,
         (password_iterations > 100000 OR password_iterations < 1) AS password_reset_required
       FROM users ORDER BY display_name COLLATE NOCASE`,
    ).all();
    return json({ users: result.results });
  }

  if (path === "/api/users" && request.method === "POST") {
    requireRole(user, ["admin"]);
    const body = await readJson<Record<string, unknown>>(request);
    const username = validUsername(body.username);
    const displayName = requiredString(body.displayName, "Anzeigename", 80);
    const password = validPassword(body.password);
    const role = oneOf(body.role ?? "employee", ROLES, "Ungültige Rolle.");

    const passwordData = await hashPassword(password);
    const result = await env.DB.prepare(
      `INSERT INTO users
        (username, display_name, password_hash, password_salt, password_iterations, role)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    )
      .bind(
        username,
        displayName,
        passwordData.hash,
        passwordData.salt,
        passwordData.iterations,
        role,
      )
      .run();

    const newUserId = Number(result.meta.last_row_id);
    await audit(env, user.id, "create", "user", newUserId, { role });
    return json({ id: newUserId }, { status: 201 });
  }

  const userMatch = path.match(/^\/api\/users\/(\d+)$/);

  if (userMatch && request.method === "PATCH") {
    requireRole(user, ["admin"]);
    const targetId = positiveInteger(userMatch[1], "Benutzer-ID");
    const body = await readJson<Record<string, unknown>>(request);
    const role = body.role ? oneOf(body.role, ROLES, "Ungültige Rolle.") : null;

    // Selbstaussperrung verhindern: Ein Admin darf sich weder selbst
    // deaktivieren noch sich die eigenen Adminrechte entziehen -- sonst waere
    // die Benutzerverwaltung unter Umstaenden fuer niemanden mehr erreichbar.
    if (targetId === user.id && body.active === false) {
      throw new HttpError(400, "Das eigene Konto kann nicht deaktiviert werden.");
    }
    if (targetId === user.id && role !== null && role !== "admin") {
      throw new HttpError(400, "Die eigene Administratorrolle kann nicht entzogen werden.");
    }

    const passwordData = body.password === undefined ? null : await hashPassword(validPassword(body.password));
    const statements = [env.DB.prepare(
      `UPDATE users SET display_name = COALESCE(?1, display_name), role = COALESCE(?2, role),
       active = COALESCE(?3, active), updated_at = CURRENT_TIMESTAMP WHERE id = ?4`,
    ).bind(body.displayName ? requiredString(body.displayName, "Anzeigename", 80) : null,
      role, typeof body.active === "boolean" ? (body.active ? 1 : 0) : null, targetId)];
    if (passwordData) {
      statements.push(env.DB.prepare(
        `UPDATE users SET password_hash = ?1, password_salt = ?2, password_iterations = ?3,
         failed_login_count = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?4`,
      ).bind(passwordData.hash, passwordData.salt, passwordData.iterations, targetId),
        env.DB.prepare("DELETE FROM sessions WHERE user_id = ?1").bind(targetId));
    }
    const results = await env.DB.batch(statements);
    if (!results[0]?.meta.changes) throw new HttpError(404, "Benutzer nicht gefunden.");

    await audit(env, user.id, "update", "user", targetId);
    return json({ ok: true });
  }

  if (userMatch && request.method === "DELETE") {
    requireRole(user, ["admin"]);
    const targetId = positiveInteger(userMatch[1], "Benutzer-ID");

    if (targetId === user.id) {
      throw new HttpError(400, "Das eigene Konto kann nicht gelöscht werden.");
    }

    await detachUserReferences(env, targetId);

    const deleteResult = await env.DB.prepare("DELETE FROM users WHERE id = ?1")
      .bind(targetId).run();
    if (!deleteResult.meta.changes) {
      throw new HttpError(404, "Benutzer nicht gefunden.");
    }

    await audit(env, user.id, "delete", "user", targetId);
    return json({ ok: true });
  }

  return null;
}

/**
 * Loest alle Fremdschluessel auf einen Benutzer, damit das Konto geloescht
 * werden kann.
 *
 * Die Inhalte selbst bleiben erhalten: Der Anzeigename steht redundant in den
 * `*_by_name`-Spalten, sodass Vorlagen, Befehle und Beitraege weiterhin
 * zugeordnet werden koennen. Feedback und Vorschlaege sind optional, weil die
 * zugehoerigen Tabellen in aelteren Installationen fehlen koennen.
 */
export async function detachUserReferences(env: Env, targetId: number): Promise<void> {
  const required = [
    "UPDATE templates SET created_by = NULL WHERE created_by = ?1",
    "UPDATE templates SET updated_by = NULL WHERE updated_by = ?1",
    "UPDATE commands SET created_by = NULL WHERE created_by = ?1",
    "UPDATE commands SET updated_by = NULL WHERE updated_by = ?1",
    "UPDATE template_versions SET changed_by = NULL WHERE changed_by = ?1",
    "UPDATE categories SET created_by = NULL WHERE created_by = ?1",
  ];

  const optional = [
    "UPDATE template_proposals SET submitted_by = NULL WHERE submitted_by = ?1",
    "UPDATE template_proposals SET reviewed_by = NULL WHERE reviewed_by = ?1",
    "UPDATE feedback_items SET submitted_by = NULL WHERE submitted_by = ?1",
    "UPDATE feedback_items SET reviewed_by = NULL WHERE reviewed_by = ?1",
  ];

  for (const sql of required) {
    await env.DB.prepare(sql).bind(targetId).run();
  }

  for (const sql of optional) {
    await ignoreMissingTable(() => env.DB.prepare(sql).bind(targetId).run());
  }
}
