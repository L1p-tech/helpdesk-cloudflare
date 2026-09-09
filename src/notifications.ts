import { HttpError, json, readJson } from "./http";
import { optionalString, positiveInteger, requiredString } from "./validation";
import type { AuthUser, Env } from "./types";

export async function handleReminders(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
  if (path === "/api/reminders" && request.method === "GET") {
    const rows = await env.DB.prepare(
      `SELECT id, message, ticket_ref, due_at, done, notified_at
       FROM reminders WHERE user_id = ?1 AND done = 0
       ORDER BY due_at
       LIMIT 50`,
    ).bind(user.id).all();

    return json({ reminders: rows.results });
  }

  if (path === "/api/reminders" && request.method === "POST") {
    const body = await readJson<Record<string, unknown>>(request);
    const message = requiredString(body.message, "Text", 500);
    const ticketRef = optionalString(body.ticketRef, 60);
    const dueAt = requiredString(body.dueAt, "Zeitpunkt", 40);

    // Der Wert kommt aus einem datetime-local-Feld und ist damit
    // nutzerkontrolliert -- ohne Pruefung landete Unsinn in der Sortierung.
    if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(dueAt) || Number.isNaN(Date.parse(dueAt))) {
      throw new HttpError(400, "Zeitpunkt muss eine gültige Zeitzone enthalten.");
    }

    const result = await env.DB.prepare(
      `INSERT INTO reminders (user_id, message, ticket_ref, due_at)
       VALUES (?1, ?2, ?3, ?4)`,
    ).bind(user.id, message, ticketRef, new Date(dueAt).toISOString()).run();

    return json({ id: Number(result.meta.last_row_id) }, { status: 201 });
  }

  const reminderMatch = path.match(/^\/api\/reminders\/(\d+)$/);
  if (reminderMatch && request.method === "DELETE") {
    const reminderId = positiveInteger(reminderMatch[1], "Erinnerungs-ID");

    const result = await env.DB.prepare(
      "UPDATE reminders SET done = 1 WHERE id = ?1 AND user_id = ?2 AND done = 0",
    ).bind(reminderId, user.id).run();

    if ((result.meta.changes ?? 0) === 0) {
      throw new HttpError(404, "Erinnerung wurde nicht gefunden.");
    }
    return json({ ok: true });
  }

  return null;
}


/** Notification and delivery marker commit together; repeated/concurrent runs are safe. */
export async function deliverDueReminders(env: Env, userId: number | null = null): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO notifications (user_id, type, title, message, reminder_id)
       SELECT user_id, 'reminder', 'Erinnerung fällig',
         CASE WHEN ticket_ref IS NULL THEN message ELSE ticket_ref || ': ' || message END, id
       FROM reminders
       WHERE done = 0 AND notified_at IS NULL
         AND due_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         AND (?1 IS NULL OR user_id = ?1)
       ORDER BY due_at, id LIMIT 100
       ON CONFLICT(reminder_id) DO NOTHING`,
    ).bind(userId),
    env.DB.prepare(
      `UPDATE reminders SET notified_at = CURRENT_TIMESTAMP
       WHERE notified_at IS NULL AND (?1 IS NULL OR user_id = ?1)
         AND EXISTS (SELECT 1 FROM notifications WHERE reminder_id = reminders.id)`,
    ).bind(userId),
  ]);
}

export async function handleNotifications(request: Request, env: Env, user: AuthUser, path: string): Promise<Response | null> {
  if (path === "/api/notifications" && request.method === "GET") {
    await deliverDueReminders(env, user.id);
    const [items, count] = await env.DB.batch<{ count?: number }>([
      env.DB.prepare(`SELECT id, type, title, message, created_at FROM notifications
        WHERE user_id = ?1 AND read_at IS NULL ORDER BY created_at DESC, id DESC LIMIT 50`).bind(user.id),
      env.DB.prepare("SELECT COUNT(*) AS count FROM notifications WHERE user_id = ?1 AND read_at IS NULL").bind(user.id),
    ]);
    return json({ notifications: items!.results, unreadCount: count!.results[0]?.count ?? 0 });
  }
  if (path === "/api/notifications/read" && request.method === "POST") {
    const body = await readJson<Record<string, unknown>>(request);
    if (!Array.isArray(body.ids) || body.ids.length < 1 || body.ids.length > 50) {
      throw new HttpError(400, "Bitte 1 bis 50 Benachrichtigungen auswählen.");
    }
    const ids = [...new Set(body.ids.map((id) => positiveInteger(id, "Benachrichtigungs-ID")))];
    await env.DB.prepare(`UPDATE notifications SET read_at = CURRENT_TIMESTAMP
      WHERE user_id = ?1 AND read_at IS NULL AND id IN (${ids.map((_, i) => `?${i + 2}`).join(",")})`)
      .bind(user.id, ...ids).run();
    return json({ ok: true });
  }
  return null;
}
