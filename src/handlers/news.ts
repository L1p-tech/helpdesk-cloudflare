import { requireRole } from "../auth";
import { audit } from "../db";
import { HttpError, json, readJson } from "../http";
import { fetchFeed } from "../feeds";
import type { AuthUser, Env } from "../types";
import { positiveInteger, requiredString } from "../validation";

/** Abstand zwischen zwei Feed-Abrufen. */
export const NEWS_REFRESH_MINUTES = 30;

/** Wie lange eingelesene Meldungen aufbewahrt werden. */
export const NEWS_RETENTION_DAYS = 30;

/**
 * IT-Meldungen aus RSS-/Atom-Quellen.
 *
 * Die Feeds werden serverseitig geholt: Ein Abruf direkt aus dem Browser
 * scheitert an CORS, und so erfahren die Anbieter auch nichts ueber die
 * einzelnen Mitarbeiter. Die Ergebnisse liegen in D1, damit nicht jeder
 * Seitenaufruf jede Quelle neu anfragt.
 */
export async function handleNews(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
  if (path === "/api/news" && request.method === "GET") {
    const force = new URL(request.url).searchParams.get("refresh") === "1";
    // Nur Admins duerfen einen Abruf erzwingen -- sonst koennte jeder Klick
    // auf "Aktualisieren" alle Quellen gleichzeitig anfragen.
    await refreshNewsIfStale(env, force && user.role === "admin");

    const [items, feeds] = await Promise.all([
      env.DB.prepare(
        `SELECT i.id, i.title, i.link, i.summary, i.published_at,
                f.name AS feed_name, f.category
         FROM news_items i
         JOIN news_feeds f ON f.id = i.feed_id
         WHERE f.active = 1
         ORDER BY COALESCE(i.published_at, i.fetched_at) DESC
         LIMIT 150`,
      ).all(),
      env.DB.prepare(
        `SELECT id, name, url, category, active, last_fetched_at, last_status
         FROM news_feeds ORDER BY category, name COLLATE NOCASE`,
      ).all(),
    ]);

    return json({ items: items.results, feeds: feeds.results });
  }

  if (path === "/api/news/feeds" && request.method === "POST") {
    requireRole(user, ["admin"]);
    const body = await readJson<Record<string, unknown>>(request);
    const name = requiredString(body.name, "Name", 80);
    const url = validFeedUrl(body.url);
    const category = requiredString(body.category ?? "Allgemein", "Kategorie", 40);

    const duplicate = await env.DB.prepare(
      "SELECT id FROM news_feeds WHERE url = ?1",
    ).bind(url).first();
    if (duplicate) throw new HttpError(409, "Diese Quelle ist bereits eingetragen.");

    const result = await env.DB.prepare(
      "INSERT INTO news_feeds (name, url, category) VALUES (?1, ?2, ?3)",
    ).bind(name, url, category).run();

    const feedId = Number(result.meta.last_row_id);
    // Direkt einlesen, damit die neue Quelle nicht bis zum naechsten
    // Auffrischen leer bleibt. Ein Fehlschlag wird in last_status vermerkt.
    await refreshSingleFeed(env, { id: feedId, url });
    await audit(env, user.id, "create", "news_feed", feedId, { name, url });

    return json({ id: feedId }, { status: 201 });
  }

  const feedMatch = path.match(/^\/api\/news\/feeds\/(\d+)$/);

  if (feedMatch && request.method === "PATCH") {
    requireRole(user, ["admin"]);
    const feedId = positiveInteger(feedMatch[1], "Quellen-ID");
    const body = await readJson<Record<string, unknown>>(request);

    const result = await env.DB.prepare(
      `UPDATE news_feeds
       SET name = COALESCE(?1, name),
           category = COALESCE(?2, category),
           active = COALESCE(?3, active)
       WHERE id = ?4`,
    ).bind(
      body.name ? requiredString(body.name, "Name", 80) : null,
      body.category ? requiredString(body.category, "Kategorie", 40) : null,
      typeof body.active === "boolean" ? (body.active ? 1 : 0) : null,
      feedId,
    ).run();

    if (!result.meta.changes) throw new HttpError(404, "Quelle nicht gefunden.");

    await audit(env, user.id, "update", "news_feed", feedId);
    return json({ ok: true });
  }

  if (feedMatch && request.method === "DELETE") {
    requireRole(user, ["admin"]);
    const feedId = positiveInteger(feedMatch[1], "Quellen-ID");

    // Die Meldungen haengen per CASCADE an der Quelle und verschwinden mit.
    const result = await env.DB.prepare("DELETE FROM news_feeds WHERE id = ?1")
      .bind(feedId).run();

    if (!result.meta.changes) throw new HttpError(404, "Quelle nicht gefunden.");

    await audit(env, user.id, "delete", "news_feed", feedId);
    return json({ ok: true });
  }

  return null;
}

/** Nimmt nur http(s) an -- andere Schemata sind keine Feed-Adressen. */
export function validFeedUrl(value: unknown): string {
  const raw = requiredString(value, "Adresse", 500);
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new HttpError(400, "Die Adresse ist ungültig.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new HttpError(400, "Nur http- und https-Adressen sind erlaubt.");
  }
  return parsed.toString();
}

/**
 * Frischt alle Quellen auf, deren letzter Abruf zu lange her ist.
 *
 * Neben dem Cron-Trigger prueft auch der Seitenabruf auf veraltete Quellen. Die
 * Quellen werden parallel geholt, damit die Wartezeit von der langsamsten
 * Quelle bestimmt wird und nicht von deren Summe.
 */
export async function refreshNewsIfStale(env: Env, force: boolean): Promise<void> {
  const stale = await env.DB.prepare(
    `SELECT id, url FROM news_feeds
     WHERE active = 1
       AND (?1 = 1
            OR last_fetched_at IS NULL
            OR last_fetched_at < datetime('now', ?2))`,
  ).bind(force ? 1 : 0, `-${NEWS_REFRESH_MINUTES} minutes`).all<{ id: number; url: string }>();

  const feeds = stale.results ?? [];
  if (!feeds.length) return;

  await Promise.all(feeds.map((feed) => refreshSingleFeed(env, feed)));
  await purgeExpiredNews(env);
}

/**
 * Holt eine Quelle und legt die Meldungen ab.
 *
 * Fehler werden hier abgefangen statt weitergereicht: Eine nicht erreichbare
 * Quelle darf weder den Abruf der uebrigen noch den Seitenaufbau stoppen. Der
 * Grund landet in `last_status` und ist im Admin-Bereich sichtbar.
 */
export async function refreshSingleFeed(
  env: Env,
  feed: { id: number; url: string },
): Promise<void> {
  try {
    const items = await fetchFeed(feed.url);

    if (items.length) {
      // Dieselbe Meldung kann bei einem spaeteren Abruf erneut auftauchen, und
      // manche Feeds fuehren eine Kennung sogar mehrfach (beim Microsoft-Feed
      // beobachtet) -- deshalb ueberall ON CONFLICT.
      await env.DB.batch(
        items.map((item) =>
          env.DB.prepare(
            `INSERT INTO news_items (feed_id, guid, title, link, summary, published_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT (feed_id, guid) DO UPDATE SET
               title = excluded.title,
               link = excluded.link,
               summary = excluded.summary,
               published_at = excluded.published_at`,
          ).bind(feed.id, item.guid, item.title, item.link, item.summary, item.publishedAt),
        ),
      );
    }

    await env.DB.prepare(
      `UPDATE news_feeds
       SET last_fetched_at = CURRENT_TIMESTAMP, last_status = ?1
       WHERE id = ?2`,
    ).bind(`ok (${items.length})`, feed.id).run();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    await env.DB.prepare(
      `UPDATE news_feeds
       SET last_fetched_at = CURRENT_TIMESTAMP, last_status = ?1
       WHERE id = ?2`,
    ).bind(`Fehler: ${message}`.slice(0, 200), feed.id).run();
  }
}

/** Entfernt Meldungen, die aelter als NEWS_RETENTION_DAYS sind. */
export async function purgeExpiredNews(env: Env): Promise<void> {
  await env.DB.prepare(
    `DELETE FROM news_items
     WHERE COALESCE(published_at, fetched_at) < datetime('now', ?1)`,
  ).bind(`-${NEWS_RETENTION_DAYS} days`).run();
}
