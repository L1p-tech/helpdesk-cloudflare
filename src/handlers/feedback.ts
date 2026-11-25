import { requireRole } from "../auth";
import { audit, DELETED_USER_LABEL } from "../db";
import { HttpError, json, readJson } from "../http";
import type { AuthUser, Env } from "../types";
import { optionalString, positiveInteger, requiredString } from "../validation";
import { FEEDBACK_TYPES, FEEDBACK_STATUSES, FeedbackRow, oneOf, ensureFeedbackTable } from "../shared";

export async function handleFeedback(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
  if (path === "/api/feedback" && request.method === "GET") {
    await ensureFeedbackTable(env);

    // Admins sehen alle Meldungen, alle anderen nur die eigenen.
    const isAdmin = user.role === "admin";
    const query = env.DB.prepare(
      `SELECT f.id, f.type, f.title, f.message, f.status, f.submitted_by,
              COALESCE(f.submitted_by_name, u.display_name, ?1) AS submitted_by_name,
              f.admin_note, f.created_at, f.updated_at
       FROM feedback_items f
       LEFT JOIN users u ON u.id = f.submitted_by
       WHERE ${isAdmin ? "1 = 1" : "f.submitted_by = ?2"}
       ORDER BY f.created_at DESC`,
    );

    const result = isAdmin
      ? await query.bind(DELETED_USER_LABEL).all<FeedbackRow>()
      : await query.bind(DELETED_USER_LABEL, user.id).all<FeedbackRow>();

    return json({ items: result.results });
  }

  if (path === "/api/feedback" && request.method === "POST") {
    await ensureFeedbackTable(env);
    const body = await readJson<Record<string, unknown>>(request);
    const type = oneOf(body.type, FEEDBACK_TYPES, "Ungültiger Feedback-Typ.");
    const title = requiredString(body.title, "Titel", 160);
    const message = requiredString(body.message, "Beschreibung", 4000);

    const result = await env.DB.prepare(
      `INSERT INTO feedback_items (type, title, message, submitted_by, submitted_by_name)
       VALUES (?1, ?2, ?3, ?4, ?5)`,
    ).bind(type, title, message, user.id, user.displayName).run();

    const feedbackId = Number(result.meta.last_row_id);
    await audit(env, user.id, "submit", "feedback_item", feedbackId, { type });
    return json({ id: feedbackId }, { status: 201 });
  }

  const feedbackMatch = path.match(/^\/api\/feedback\/(\d+)$/);
  if (feedbackMatch && request.method === "PATCH") {
    requireRole(user, ["admin"]);
    const feedbackId = positiveInteger(feedbackMatch[1], "Feedback-ID");
    const body = await readJson<Record<string, unknown>>(request);
    const status = body.status
      ? oneOf(body.status, FEEDBACK_STATUSES, "Ungültiger Feedback-Status.")
      : null;

    // Zwischen "Notiz nicht mitgeschickt" (unveraendert lassen) und "Notiz
    // geleert" (auf NULL setzen) muss unterschieden werden -- daher das Flag.
    const noteProvided = body.adminNote !== undefined;
    const adminNote = noteProvided ? optionalString(body.adminNote, 2000) : null;

    const result = await env.DB.prepare(
      `UPDATE feedback_items
       SET status = COALESCE(?1, status),
           admin_note = CASE WHEN ?2 = 1 THEN ?3 ELSE admin_note END,
           reviewed_by = ?4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?5`,
    ).bind(status, noteProvided ? 1 : 0, adminNote, user.id, feedbackId).run();

    if ((result.meta.changes ?? 0) === 0) {
      throw new HttpError(404, "Feedback wurde nicht gefunden.");
    }

    await audit(env, user.id, "update", "feedback_item", feedbackId, { status });
    return json({ ok: true });
  }

  return null;
}
