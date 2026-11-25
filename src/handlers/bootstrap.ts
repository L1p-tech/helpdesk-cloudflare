import { DELETED_USER_LABEL } from "../db";
import { json, readJson } from "../http";
import { normalizeAvatar, parseAvatar } from "../avatar";
import { ensureDefaultLibrary } from "../library";
import type { AuthUser, Env } from "../types";
import { optionalString } from "../validation";
import { ensureTemplateUsageTable } from "../shared";

/**
 * Liefert den kompletten Startdatensatz der Oberflaeche in einer Antwort:
 * Kategorien, Vorlagen, Befehle, persoenliche Einstellungen und ungelesene
 * Benachrichtigungen. Spart dem Frontend fuenf einzelne Requests beim Laden.
 */
export async function handleBootstrap(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
  if (path !== "/api/bootstrap" || request.method !== "GET") return null;

  await ensureDefaultLibrary(env, { id: user.id, displayName: user.displayName });
  await ensureTemplateUsageTable(env);

  const [categories, templates, commands, solutions, settings, notifications, avatars] =
    await Promise.all([
    env.DB.prepare(
      "SELECT id, slug, name, color FROM categories WHERE active = 1 ORDER BY name COLLATE NOCASE",
    ).all(),
    // Nutzungszahlen des aktuellen Benutzers kommen per LEFT JOIN mit, damit
    // das Frontend nach "zuletzt benutzt" sortieren kann, ohne zweite Anfrage.
    env.DB.prepare(
      `SELECT t.id, t.title, t.body, t.version, t.updated_at,
              c.id AS category_id, c.name AS category_name, c.color AS category_color,
              COALESCE(t.created_by_name, cu.display_name, ?1) AS created_by_name,
              COALESCE(t.updated_by_name, u.display_name, ?1) AS updated_by_name,
              COALESCE(usage.use_count, 0) AS use_count,
              usage.last_used_at
       FROM templates t
       JOIN categories c ON c.id = t.category_id
       LEFT JOIN users cu ON cu.id = t.created_by
       LEFT JOIN users u ON u.id = t.updated_by
       LEFT JOIN template_usage usage
         ON usage.template_id = t.id AND usage.user_id = ?2
       WHERE t.active = 1
       ORDER BY t.updated_at DESC`,
    ).bind(DELETED_USER_LABEL, user.id).all(),
    env.DB.prepare(
      `SELECT id, version, category, name, command, description, shell, requires_admin,
              risk_level, remote_capable, restart_required
       FROM commands WHERE active = 1 ORDER BY category, name COLLATE NOCASE`,
    ).all(),
    env.DB.prepare(
      `SELECT id, version, category, title, symptom, cause, solution, severity, updated_at,
              COALESCE(created_by_name, ?1) AS created_by_name
       FROM solutions WHERE active = 1 ORDER BY category, title COLLATE NOCASE`,
    ).bind(DELETED_USER_LABEL).all(),
    env.DB.prepare(
      `SELECT signature_name, favorites_json, preferences_json
       FROM user_settings WHERE user_id = ?1`,
    ).bind(user.id).first(),
    env.DB.prepare(
      `SELECT id, type, title, message, created_at
       FROM notifications WHERE user_id = ?1 AND read_at IS NULL
       ORDER BY created_at DESC LIMIT 30`,
    ).bind(user.id).all(),
    // Avatare aller aktiven Benutzer. Sie werden neben fremden Namen gezeigt
    // (Chat, Vorschlaege, Statistik) und sind deshalb fuer alle sichtbar --
    // enthalten aber ausser dem Aussehen keine persoenlichen Angaben.
    env.DB.prepare(
      `SELECT id, display_name, avatar_json FROM users WHERE active = 1`,
    ).all(),
  ]);

  return json({
    user,
    categories: categories.results,
    templates: templates.results,
    commands: commands.results,
    solutions: solutions.results,
    settings: settings ?? {
      signature_name: "",
      favorites_json: '{"templates":[],"commands":[]}',
      preferences_json: "{}",
    },
    notifications: notifications.results,
    avatars: (avatars.results as Array<Record<string, unknown>>).map((row) => ({
      id: row.id,
      name: row.display_name,
      avatar: parseAvatar(row.avatar_json as string | null),
    })),
  });
}

export async function handleSettings(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
  if (path !== "/api/settings" || request.method !== "PUT") return null;

  const body = await readJson<Record<string, unknown>>(request);
  const signatureName = optionalString(body.signatureName, 100) ?? "";
  const favorites = body.favorites ?? { templates: [], commands: [] };
  const preferences = body.preferences ?? {};

  await env.DB.prepare(
    `INSERT INTO user_settings
      (user_id, signature_name, favorites_json, preferences_json, updated_at)
     VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id) DO UPDATE SET
       signature_name = excluded.signature_name,
       favorites_json = excluded.favorites_json,
       preferences_json = excluded.preferences_json,
       updated_at = CURRENT_TIMESTAMP`,
  )
    .bind(user.id, signatureName, JSON.stringify(favorites), JSON.stringify(preferences))
    .run();

  // Der Avatar liegt auf "users", weil ihn auch andere sehen. Er wird nur
  // angefasst, wenn das Feld mitgeschickt wurde -- so loescht ein Speichern
  // der uebrigen Einstellungen den Avatar nicht.
  if (body.avatar !== undefined) {
    const avatar = normalizeAvatar(body.avatar);
    await env.DB.prepare(
      "UPDATE users SET avatar_json = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
    ).bind(user.id, JSON.stringify(avatar)).run();
  }

  return json({ ok: true });
}
