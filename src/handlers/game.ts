import { DELETED_USER_LABEL } from "../db";
import { HttpError, json, readJson } from "../http";
import type { AuthUser, Env } from "../types";
import { ensureTypingScoresTable } from "../shared";

export async function handleGame(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
  if (path === "/api/game/leaderboard" && request.method === "GET") {
    const result = await env.DB.prepare(
      `SELECT COALESCE(g.display_name, u.display_name, ?1) AS display_name,
              MAX(g.score) AS score,
              MAX(g.created_at) AS achieved_at
       FROM game_scores g
       LEFT JOIN users u ON u.id = g.user_id
       GROUP BY
         COALESCE(g.user_id, g.display_name),
         COALESCE(g.display_name, u.display_name, ?1)
       ORDER BY score DESC, achieved_at ASC
       LIMIT 20`,
    ).bind(DELETED_USER_LABEL).all();
    return json({ leaderboard: result.results });
  }

  if (path === "/api/game/scores" && request.method === "POST") {
    const body = await readJson<Record<string, unknown>>(request);
    const score = Number(body.score);
    const durationMs = Number(body.durationMs);

    if (!Number.isInteger(score) || score < 0 || score > 1_000_000) {
      throw new HttpError(400, "Ungültiger Punktestand.");
    }
    if (!Number.isInteger(durationMs) || durationMs < 1000 || durationMs > 3_600_000) {
      throw new HttpError(400, "Ungültige Spieldauer.");
    }

    // Obergrenze: hoechstens ein Treffer je 25 ms, plus Puffer fuer Boni.
    const maximumPlausibleScore = Math.floor(durationMs / 25) + 250;
    if (score > maximumPlausibleScore) {
      throw new HttpError(400, "Punktestand konnte nicht plausibilisiert werden.");
    }

    await env.DB.prepare(
      "INSERT INTO game_scores (user_id, display_name, score, duration_ms) VALUES (?1, ?2, ?3, ?4)",
    ).bind(user.id, user.displayName, score, durationMs).run();

    return json({ ok: true }, { status: 201 });
  }

  if (path === "/api/game/typing/leaderboard" && request.method === "GET") {
    await ensureTypingScoresTable(env);
    const result = await env.DB.prepare(
      `SELECT COALESCE(t.display_name, u.display_name, ?1) AS display_name,
              MAX(t.wpm) AS wpm,
              MAX(t.accuracy) AS accuracy,
              MAX(t.created_at) AS achieved_at
       FROM typing_game_scores t
       LEFT JOIN users u ON u.id = t.user_id
       GROUP BY
         COALESCE(t.user_id, t.display_name),
         COALESCE(t.display_name, u.display_name, ?1)
       ORDER BY wpm DESC, accuracy DESC, achieved_at ASC
       LIMIT 20`,
    ).bind(DELETED_USER_LABEL).all();
    return json({ leaderboard: result.results });
  }

  if (path === "/api/game/typing/scores" && request.method === "POST") {
    await ensureTypingScoresTable(env);
    const body = await readJson<Record<string, unknown>>(request);
    const wpm = Number(body.wpm);
    const accuracy = Number(body.accuracy);
    const correctChars = Number(body.correctChars);
    const totalChars = Number(body.totalChars);
    const durationMs = Number(body.durationMs);

    if (!Number.isInteger(wpm) || wpm < 0 || wpm > 400) {
      throw new HttpError(400, "Ungültige Schreibgeschwindigkeit.");
    }
    if (!Number.isInteger(accuracy) || accuracy < 0 || accuracy > 100) {
      throw new HttpError(400, "Ungültige Genauigkeit.");
    }
    if (!Number.isInteger(correctChars) || correctChars < 0) {
      throw new HttpError(400, "Ungültige Zeichenzahl.");
    }
    if (!Number.isInteger(totalChars) || totalChars < 1) {
      throw new HttpError(400, "Ungültige Gesamtzeichenzahl.");
    }
    if (!Number.isInteger(durationMs) || durationMs < 10_000 || durationMs > 300_000) {
      throw new HttpError(400, "Ungültige Spieldauer.");
    }
    if (correctChars > totalChars) {
      throw new HttpError(400, "Ungültige Trefferzahl.");
    }

    // WPM-Konvention: ein "Wort" sind fuenf Zeichen. Der Puffer faengt
    // Rundungsunterschiede zwischen Browser und Server ab.
    const plausibleWpm = Math.ceil((correctChars / 5) / (durationMs / 60_000)) + 5;
    if (wpm > plausibleWpm) {
      throw new HttpError(400, "Ergebnis konnte nicht plausibilisiert werden.");
    }

    await env.DB.prepare(
      `INSERT INTO typing_game_scores
        (user_id, display_name, wpm, accuracy, correct_chars, total_chars, duration_ms)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
    ).bind(user.id, user.displayName, wpm, accuracy, correctChars, totalChars, durationMs).run();

    return json({ ok: true }, { status: 201 });
  }

  return null;
}
