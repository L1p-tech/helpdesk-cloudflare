import { DELETED_USER_LABEL } from "../db";
import { HttpError, json, readJson } from "../http";
import type { AuthUser, Env } from "../types";
import { positiveInteger, requiredString } from "../validation";
import { CONTENT_TYPES, oneOf } from "../shared";

/* ============================================================
   Nutzung und Statistik
   ============================================================ */
export async function handleUsage(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
  // Zaehlt eine Oeffnung oder eine Rueckmeldung "hat geholfen".
  if (path === "/api/usage" && request.method === "POST") {
    const body = await readJson<Record<string, unknown>>(request);
    const contentType = oneOf(body.contentType, CONTENT_TYPES, "Ungültige Inhaltsart.");
    const contentId = positiveInteger(body.contentId, "Inhalts-ID");
    const helpful = body.helpful === true;

    await env.DB.prepare(
      `INSERT INTO content_usage (content_type, content_id, opened_count, helpful_count)
       VALUES (?1, ?2, 1, ?3)
       ON CONFLICT (content_type, content_id) DO UPDATE SET
         opened_count = opened_count + 1,
         helpful_count = helpful_count + ?3,
         last_used_at = CURRENT_TIMESTAMP`,
    ).bind(contentType, contentId, helpful ? 1 : 0).run();

    return json({ ok: true });
  }

  // Suche ohne Treffer festhalten -- zeigt, welches Wissen fehlt.
  if (path === "/api/usage/miss" && request.method === "POST") {
    const body = await readJson<Record<string, unknown>>(request);
    const term = requiredString(body.term, "Suchbegriff", 200);
    // "all" kommt aus der Schnellsuche, die ueber alle Arten gleichzeitig sucht.
    const scope = oneOf(
      body.scope,
      ["templates", "commands", "solutions", "all"] as const,
      "Ungültiger Bereich.",
    );

    await env.DB.prepare(
      "INSERT INTO search_misses (term, scope, user_id) VALUES (?1, ?2, ?3)",
    ).bind(term.toLowerCase(), scope, user.id).run();

    return json({ ok: true });
  }

  /**
   * Hakt eine Wissensluecke ab.
   *
   * Es werden alle Eintraege desselben Begriffs erledigt, nicht nur einer:
   * Die Auswertung fasst sie ohnehin zusammen, und wer die Luecke schliesst,
   * schliesst sie fuer alle Suchen dieses Begriffs. Die Zeilen bleiben
   * erhalten, damit die Rohdaten spaeter noch auswertbar sind.
   */
  if (path === "/api/usage/miss/resolve" && request.method === "POST") {
    if (user.role !== "admin" && user.role !== "editor") {
      throw new HttpError(403, "Nur Redakteure und Administratoren können Lücken abhaken.");
    }

    const body = await readJson<Record<string, unknown>>(request);
    const term = requiredString(body.term, "Suchbegriff", 200);

    const result = await env.DB.prepare(
      `UPDATE search_misses
         SET resolved_at = CURRENT_TIMESTAMP, resolved_by = ?2
       WHERE term = ?1 AND resolved_at IS NULL`,
    ).bind(term.toLowerCase(), user.id).run();

    return json({ ok: true, erledigt: result.meta.changes ?? 0 });
  }

  if (path === "/api/usage/stats" && request.method === "GET") {
    const [topSolutions, topCommands, misses, contributors, counts] = await Promise.all([
      env.DB.prepare(
        `SELECT s.id, s.title, s.category, u.opened_count, u.helpful_count
         FROM content_usage u
         JOIN solutions s ON s.id = u.content_id AND s.active = 1
         WHERE u.content_type = 'solution'
         ORDER BY u.opened_count DESC LIMIT 10`,
      ).all(),
      env.DB.prepare(
        `SELECT c.id, c.name AS title, c.category, u.opened_count, u.helpful_count
         FROM content_usage u
         JOIN commands c ON c.id = u.content_id AND c.active = 1
         WHERE u.content_type = 'command'
         ORDER BY u.opened_count DESC LIMIT 10`,
      ).all(),
      // Nur offene Luecken. Gruppiert wird allein nach Begriff -- derselbe
      // Suchbegriff aus Schnellsuche und Bereichssuche ist dieselbe Luecke.
      // Der haeufigste Bereich kommt als Hinweis mit, damit das passende
      // Formular vorgeschlagen werden kann.
      env.DB.prepare(
        `SELECT term, COUNT(*) AS treffer, MAX(created_at) AS zuletzt,
                COUNT(DISTINCT user_id) AS personen,
                (SELECT scope FROM search_misses inner_m
                  WHERE inner_m.term = m.term AND inner_m.resolved_at IS NULL
                  GROUP BY scope ORDER BY COUNT(*) DESC LIMIT 1) AS scope
         FROM search_misses m
         WHERE created_at >= datetime('now', '-90 days')
           AND resolved_at IS NULL
         GROUP BY term
         HAVING COUNT(*) > 1
         ORDER BY treffer DESC, zuletzt DESC LIMIT 15`,
      ).all(),
      // Beitraege je Person: Wer pflegt die Wissensbasis?
      env.DB.prepare(
        `SELECT name, SUM(anzahl) AS beitraege FROM (
           SELECT COALESCE(created_by_name, ?1) AS name, COUNT(*) AS anzahl
           FROM templates WHERE active = 1 GROUP BY created_by_name
           UNION ALL
           SELECT COALESCE(created_by_name, ?1) AS name, COUNT(*) AS anzahl
           FROM commands WHERE active = 1 GROUP BY created_by_name
           UNION ALL
           SELECT COALESCE(created_by_name, ?1) AS name, COUNT(*) AS anzahl
           FROM solutions WHERE active = 1 GROUP BY created_by_name
         ) GROUP BY name ORDER BY beitraege DESC LIMIT 15`,
      ).bind(DELETED_USER_LABEL).all(),
      env.DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM templates WHERE active = 1) AS vorlagen,
           (SELECT COUNT(*) FROM commands WHERE active = 1) AS befehle,
           (SELECT COUNT(*) FROM solutions WHERE active = 1) AS loesungen,
           (SELECT COUNT(*) FROM cases WHERE status = 'open') AS offene_faelle,
           (SELECT COUNT(*) FROM template_proposals WHERE status = 'pending')
             + (SELECT COUNT(*) FROM content_proposals WHERE status = 'pending')
             AS offene_vorschlaege`,
      ).first(),
    ]);

    return json({
      topSolutions: topSolutions.results,
      topCommands: topCommands.results,
      misses: misses.results,
      contributors: contributors.results,
      counts,
    });
  }

  return null;
}
