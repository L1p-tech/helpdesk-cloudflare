import { HttpError, json, readJson } from "../http";
import type { AuthUser, Env } from "../types";
import { positiveInteger, requiredString } from "../validation";

/** Wie lange Chatnachrichten aufbewahrt werden, bevor sie entfernt werden. */
export const CHAT_RETENTION_DAYS = 30;

/** Wie viele Nachrichten der Verlauf beim Laden hoechstens zurueckgibt. */
export const CHAT_PAGE_SIZE = 100;

/**
 * Gemeinsamer Team-Chat -- ein einziger Raum fuer alle Rollen.
 *
 * Das Frontend fragt regelmaessig nach neuen Nachrichten. Damit dieses Polling
 * guenstig bleibt, kann es per `?after=<id>` nur den Zuwachs anfordern, statt
 * jedes Mal den kompletten Verlauf zu uebertragen.
 */
export async function handleChat(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
  if (path === "/api/chat" && request.method === "GET") {
    await ensureChatTable(env);
    await purgeExpiredChatMessages(env);

    const after = new URL(request.url).searchParams.get("after");
    const afterId = after === null ? null : positiveInteger(after, "Nachrichten-ID");

    // Neueste zuerst abfragen, damit LIMIT die juengsten Nachrichten behaelt
    // und nicht bei den aeltesten abschneidet -- im Frontend wieder gedreht.
    const messages = afterId === null
      ? await env.DB.prepare(
          `SELECT id, author_id, author_name, body, created_at
           FROM chat_messages
           ORDER BY id DESC LIMIT ?1`,
        ).bind(CHAT_PAGE_SIZE).all()
      : await env.DB.prepare(
          `SELECT id, author_id, author_name, body, created_at
           FROM chat_messages
           WHERE id > ?1
           ORDER BY id DESC LIMIT ?2`,
        ).bind(afterId, CHAT_PAGE_SIZE).all();

    return json({ messages: (messages.results ?? []).reverse() });
  }

  if (path === "/api/chat" && request.method === "POST") {
    await ensureChatTable(env);
    const body = await readJson<Record<string, unknown>>(request);
    const message = requiredString(body.body, "Nachricht", 2000);

    const result = await env.DB.prepare(
      `INSERT INTO chat_messages (author_id, author_name, body)
       VALUES (?1, ?2, ?3)`,
    ).bind(user.id, user.displayName, message).run();

    return json({ id: Number(result.meta.last_row_id) }, { status: 201 });
  }

  const messageMatch = path.match(/^\/api\/chat\/(\d+)$/);

  if (messageMatch && request.method === "DELETE") {
    const messageId = positiveInteger(messageMatch[1], "Nachrichten-ID");

    const existing = await env.DB.prepare(
      "SELECT author_id FROM chat_messages WHERE id = ?1",
    ).bind(messageId).first<{ author_id: number | null }>();

    if (!existing) throw new HttpError(404, "Nachricht nicht gefunden.");

    // Admins moderieren den gesamten Raum, alle anderen duerfen ausschliesslich
    // eigene Beitraege zuruecknehmen.
    if (user.role !== "admin" && existing.author_id !== user.id) {
      throw new HttpError(403, "Nur eigene Nachrichten können gelöscht werden.");
    }

    await env.DB.prepare("DELETE FROM chat_messages WHERE id = ?1")
      .bind(messageId).run();

    return json({ ok: true });
  }

  return null;
}

/**
 * Legt die Chattabelle an, falls die Migration in einer Installation noch nicht
 * gelaufen ist -- gleiche Absicherung wie bei `ensureTemplateUsageTable`.
 */
export async function ensureChatTable(env: Env): Promise<void> {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id INTEGER,
      author_name TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
    )`,
  ).run();
}

/**
 * Entfernt Nachrichten aelter als CHAT_RETENTION_DAYS.
 *
 * Laeuft beim Abruf mit. Der Aufwand
 * faellt kaum ins Gewicht: Ohne abgelaufene Zeilen ist es ein Index-Scan, der
 * nichts loescht.
 */
export async function purgeExpiredChatMessages(env: Env): Promise<void> {
  await env.DB.prepare(
    `DELETE FROM chat_messages
     WHERE created_at < datetime('now', ?1)`,
  ).bind(`-${CHAT_RETENTION_DAYS} days`).run();
}
