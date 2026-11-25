import { HttpError, json, readJson } from "../http";
import type { AuthUser, Env } from "../types";
import { requiredString } from "../validation";
import { oneOf } from "../shared";

/**
 * Schulung: Lernfortschritt des angemeldeten Benutzers.
 *
 * Die Inhalte liegen im Frontend, hier wird nur gespeichert, wer was geschafft
 * hat. Jede Abfrage ist auf `user.id` begrenzt -- es gibt keinen Weg, den
 * Stand anderer zu lesen oder zu aendern.
 */
export const TRAINING_PASS_PERCENT = 70;
export const TRAINING_ITEM_PATTERN = /^[a-z0-9][a-z0-9:-]{0,79}$/;

export async function handleTraining(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
  if (path !== "/api/training") return null;

  if (request.method === "GET") {
    const rows = await env.DB.prepare(
      `SELECT item_id, percent, attempts, completed_at
       FROM training_progress WHERE user_id = ?1`,
    ).bind(user.id).all();
    return json({ progress: rows.results });
  }

  if (request.method === "POST") {
    const body = await readJson<Record<string, unknown>>(request);
    const kind = oneOf(body.kind, ["quiz", "check"] as const, "Ungültige Art.");
    const itemId = requiredString(body.itemId, "Eintrag", 80);
    if (!TRAINING_ITEM_PATTERN.test(itemId)) {
      throw new HttpError(400, "Eintrag ist ungültig.");
    }
    // Checklistenpunkte tragen das Praefix "check:" -- so kann ein Quiz nie
    // einen Punkt der Checkliste ueberschreiben und umgekehrt.
    if ((kind === "check") !== itemId.startsWith("check:")) {
      throw new HttpError(400, "Eintrag passt nicht zur Art.");
    }

    if (kind === "check") {
      if (typeof body.done !== "boolean") {
        throw new HttpError(400, "Erledigt-Status fehlt.");
      }
      if (!body.done) {
        await env.DB.prepare(
          "DELETE FROM training_progress WHERE user_id = ?1 AND item_id = ?2",
        ).bind(user.id, itemId).run();
        return json({ ok: true });
      }
      await env.DB.prepare(
        `INSERT INTO training_progress (user_id, item_id, completed_at)
         VALUES (?1, ?2, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, item_id) DO UPDATE SET
           completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP),
           updated_at = CURRENT_TIMESTAMP`,
      ).bind(user.id, itemId).run();
      return json({ ok: true });
    }

    const total = Number(body.total);
    const score = Number(body.score);
    if (!Number.isInteger(total) || total < 1 || total > 50) {
      throw new HttpError(400, "Fragenanzahl ist ungültig.");
    }
    if (!Number.isInteger(score) || score < 0 || score > total) {
      throw new HttpError(400, "Ergebnis ist ungültig.");
    }
    const percent = Math.round((score * 100) / total);

    // Bestes Ergebnis behalten; "bestanden" bleibt bestehen, auch wenn ein
    // spaeterer Versuch schlechter ausfaellt.
    await env.DB.prepare(
      `INSERT INTO training_progress (user_id, item_id, percent, attempts, completed_at)
       VALUES (?1, ?2, ?3, 1, CASE WHEN ?3 >= ?4 THEN CURRENT_TIMESTAMP END)
       ON CONFLICT (user_id, item_id) DO UPDATE SET
         percent = MAX(COALESCE(percent, 0), excluded.percent),
         attempts = attempts + 1,
         completed_at = COALESCE(completed_at, excluded.completed_at),
         updated_at = CURRENT_TIMESTAMP`,
    ).bind(user.id, itemId, percent, TRAINING_PASS_PERCENT).run();

    const row = await env.DB.prepare(
      `SELECT item_id, percent, attempts, completed_at
       FROM training_progress WHERE user_id = ?1 AND item_id = ?2`,
    ).bind(user.id, itemId).first();
    return json({ ok: true, progress: row });
  }

  // Den eigenen Fortschritt komplett zuruecksetzen.
  if (request.method === "DELETE") {
    await env.DB.prepare("DELETE FROM training_progress WHERE user_id = ?1")
      .bind(user.id).run();
    return json({ ok: true });
  }

  return null;
}
