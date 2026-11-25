import { requireRole } from "../auth";
import { audit, DELETED_USER_LABEL } from "../db";
import { HttpError, json, readJson } from "../http";
import type { AuthUser, Env } from "../types";
import { optionalString, positiveInteger, requiredString } from "../validation";
import { oneOf } from "../shared";

/**
 * Zwei kleine Pausenspiele mit gemeinsamer Bestenliste.
 *
 * Die Ergebnisse kommen aus dem Browser und sind damit grundsaetzlich
 * manipulierbar. Serverseitig wird deshalb geprueft, ob ein Ergebnis in der
 * angegebenen Spielzeit ueberhaupt erreichbar ist. Das ist eine
 * Plausibilitaets-, keine Betrugssicherung -- fuer eine interne Bestenliste
 * bewusst ausreichend.
 */
/* ============================================================
   Fall-Arbeitsblatt
   ============================================================
   Haelt waehrend der Bearbeitung fest, was benutzt wurde, und erzeugt daraus
   die Ticket-Dokumentation. Jeder Fall gehoert genau einem Benutzer -- alle
   Abfragen filtern deshalb zusaetzlich auf user_id, damit niemand fremde
   Faelle liest oder aendert.
*/
export const CASE_ENTRY_KINDS = ["template", "command", "solution", "note"] as const;

export async function handleCases(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
  if (path === "/api/cases" && request.method === "GET") {
    const rows = await env.DB.prepare(
      `SELECT id, ticket_ref, title, status, notes, created_at, closed_at
       FROM cases WHERE user_id = ?1
       ORDER BY status = 'closed', updated_at DESC
       LIMIT 50`,
    ).bind(user.id).all();

    return json({ cases: rows.results });
  }

  if (path === "/api/cases" && request.method === "POST") {
    const body = await readJson<Record<string, unknown>>(request);
    const ticketRef = requiredString(body.ticketRef, "Ticketnummer", 60);
    const title = requiredString(body.title, "Kurzbeschreibung", 200);

    const result = await env.DB.prepare(
      `INSERT INTO cases (user_id, ticket_ref, title) VALUES (?1, ?2, ?3)`,
    ).bind(user.id, ticketRef, title).run();

    return json({ id: Number(result.meta.last_row_id) }, { status: 201 });
  }

  const caseMatch = path.match(/^\/api\/cases\/(\d+)$/);
  if (caseMatch && request.method === "GET") {
    const caseId = positiveInteger(caseMatch[1], "Fall-ID");

    const record = await env.DB.prepare(
      `SELECT id, ticket_ref, title, status, notes, created_at, closed_at
       FROM cases WHERE id = ?1 AND user_id = ?2`,
    ).bind(caseId, user.id).first();

    if (!record) throw new HttpError(404, "Fall wurde nicht gefunden.");

    const entries = await env.DB.prepare(
      `SELECT id, kind, ref_id, label, detail, created_at
       FROM case_entries WHERE case_id = ?1 ORDER BY created_at`,
    ).bind(caseId).all();

    return json({ case: record, entries: entries.results });
  }

  if (caseMatch && request.method === "PUT") {
    const caseId = positiveInteger(caseMatch[1], "Fall-ID");
    const body = await readJson<Record<string, unknown>>(request);
    const notes = optionalString(body.notes, 20_000);
    const status = oneOf(body.status ?? "open", ["open", "closed"] as const, "Ungültiger Status.");

    const result = await env.DB.prepare(
      `UPDATE cases
       SET notes = ?1, status = ?2,
           closed_at = CASE WHEN ?2 = 'closed' THEN CURRENT_TIMESTAMP ELSE NULL END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?3 AND user_id = ?4`,
    ).bind(notes, status, caseId, user.id).run();

    if ((result.meta.changes ?? 0) === 0) {
      throw new HttpError(404, "Fall wurde nicht gefunden.");
    }
    return json({ ok: true });
  }

  if (caseMatch && request.method === "DELETE") {
    const caseId = positiveInteger(caseMatch[1], "Fall-ID");
    const result = await env.DB.prepare(
      "DELETE FROM cases WHERE id = ?1 AND user_id = ?2",
    ).bind(caseId, user.id).run();

    if ((result.meta.changes ?? 0) === 0) {
      throw new HttpError(404, "Fall wurde nicht gefunden.");
    }
    return json({ ok: true });
  }

  const entryMatch = path.match(/^\/api\/cases\/(\d+)\/entries$/);
  if (entryMatch && request.method === "POST") {
    const caseId = positiveInteger(entryMatch[1], "Fall-ID");
    const body = await readJson<Record<string, unknown>>(request);
    const kind = oneOf(body.kind, CASE_ENTRY_KINDS, "Ungültige Eintragsart.");
    const label = requiredString(body.label, "Bezeichnung", 300);
    const detail = optionalString(body.detail, 20_000);
    const refId = body.refId ? positiveInteger(body.refId, "Verweis") : null;

    // Zugehoerigkeit pruefen, bevor etwas angehaengt wird.
    const owned = await env.DB.prepare(
      "SELECT id FROM cases WHERE id = ?1 AND user_id = ?2",
    ).bind(caseId, user.id).first();

    if (!owned) throw new HttpError(404, "Fall wurde nicht gefunden.");

    await env.DB.prepare(
      `INSERT INTO case_entries (case_id, kind, ref_id, label, detail)
       VALUES (?1, ?2, ?3, ?4, ?5)`,
    ).bind(caseId, kind, refId, label, detail).run();

    await env.DB.prepare(
      "UPDATE cases SET updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
    ).bind(caseId).run();

    return json({ ok: true }, { status: 201 });
  }

  const entryDeleteMatch = path.match(/^\/api\/cases\/(\d+)\/entries\/(\d+)$/);
  if (entryDeleteMatch && request.method === "DELETE") {
    const caseId = positiveInteger(entryDeleteMatch[1], "Fall-ID");
    const entryId = positiveInteger(entryDeleteMatch[2], "Eintrags-ID");

    // Der Join auf cases stellt sicher, dass nur eigene Eintraege verschwinden.
    const result = await env.DB.prepare(
      `DELETE FROM case_entries
       WHERE id = ?1 AND case_id = ?2
         AND EXISTS (SELECT 1 FROM cases WHERE id = ?2 AND user_id = ?3)`,
    ).bind(entryId, caseId, user.id).run();

    if ((result.meta.changes ?? 0) === 0) {
      throw new HttpError(404, "Eintrag wurde nicht gefunden.");
    }
    return json({ ok: true });
  }

  return null;
}

/* ============================================================
   Erinnerungen
   ============================================================
   Faellige Erinnerungen stellt der zeitgesteuerte Lauf als Benachrichtigung
   zu (siehe deliverDueReminders).
*/
/* ============================================================
   Eskalation und Dienstuebergabe
   ============================================================ */
export async function handleEscalation(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
  if (path === "/api/escalation" && request.method === "GET") {
    const rows = await env.DB.prepare(
      `SELECT id, position, name, responsible, contact, response_time, criteria
       FROM escalation_levels WHERE active = 1
       ORDER BY position, id`,
    ).all();

    return json({ levels: rows.results });
  }

  if (path === "/api/escalation" && request.method === "POST") {
    requireRole(user, ["admin"]);
    const body = await readJson<Record<string, unknown>>(request);

    const result = await env.DB.prepare(
      `INSERT INTO escalation_levels
        (position, name, responsible, contact, response_time, criteria)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    ).bind(
      Number(body.position) || 0,
      requiredString(body.name, "Bezeichnung", 120),
      requiredString(body.responsible, "Zuständigkeit", 200),
      optionalString(body.contact, 200),
      optionalString(body.responseTime, 120),
      optionalString(body.criteria, 2000),
    ).run();

    const levelId = Number(result.meta.last_row_id);
    await audit(env, user.id, "create", "escalation_level", levelId);
    return json({ id: levelId }, { status: 201 });
  }

  const levelMatch = path.match(/^\/api\/escalation\/(\d+)$/);
  if (levelMatch && request.method === "PUT") {
    requireRole(user, ["admin"]);
    const levelId = positiveInteger(levelMatch[1], "Stufen-ID");
    const body = await readJson<Record<string, unknown>>(request);

    const result = await env.DB.prepare(
      `UPDATE escalation_levels
       SET position = ?1, name = ?2, responsible = ?3, contact = ?4,
           response_time = ?5, criteria = ?6, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?7 AND active = 1`,
    ).bind(
      Number(body.position) || 0,
      requiredString(body.name, "Bezeichnung", 120),
      requiredString(body.responsible, "Zuständigkeit", 200),
      optionalString(body.contact, 200),
      optionalString(body.responseTime, 120),
      optionalString(body.criteria, 2000),
      levelId,
    ).run();

    if ((result.meta.changes ?? 0) === 0) {
      throw new HttpError(404, "Eskalationsstufe wurde nicht gefunden.");
    }

    await audit(env, user.id, "update", "escalation_level", levelId);
    return json({ ok: true });
  }

  if (levelMatch && request.method === "DELETE") {
    requireRole(user, ["admin"]);
    const levelId = positiveInteger(levelMatch[1], "Stufen-ID");

    const result = await env.DB.prepare(
      "UPDATE escalation_levels SET active = 0 WHERE id = ?1 AND active = 1",
    ).bind(levelId).run();

    if ((result.meta.changes ?? 0) === 0) {
      throw new HttpError(404, "Eskalationsstufe wurde nicht gefunden.");
    }

    await audit(env, user.id, "delete", "escalation_level", levelId);
    return json({ ok: true });
  }

  return null;
}

export async function handleHandovers(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
  if (path === "/api/handovers" && request.method === "GET") {
    const rows = await env.DB.prepare(
      `SELECT h.id, h.shift_label, h.open_cases, h.incidents, h.notes,
              h.created_at, h.acknowledged_at,
              COALESCE(h.created_by_name, ?1) AS created_by_name,
              h.acknowledged_by_name
       FROM handovers h
       ORDER BY h.created_at DESC
       LIMIT 30`,
    ).bind(DELETED_USER_LABEL).all();

    return json({ handovers: rows.results });
  }

  if (path === "/api/handovers" && request.method === "POST") {
    const body = await readJson<Record<string, unknown>>(request);
    const shiftLabel = requiredString(body.shiftLabel, "Schicht", 120);
    const openCases = optionalString(body.openCases, 20_000);
    const incidents = optionalString(body.incidents, 20_000);
    const notes = optionalString(body.notes, 20_000);

    if (!openCases && !incidents && !notes) {
      throw new HttpError(400, "Bitte mindestens einen Bereich ausfüllen.");
    }

    const result = await env.DB.prepare(
      `INSERT INTO handovers
        (shift_label, open_cases, incidents, notes, created_by, created_by_name)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    ).bind(shiftLabel, openCases, incidents, notes, user.id, user.displayName).run();

    const handoverId = Number(result.meta.last_row_id);
    await audit(env, user.id, "create", "handover", handoverId);
    return json({ id: handoverId }, { status: 201 });
  }

  const ackMatch = path.match(/^\/api\/handovers\/(\d+)\/acknowledge$/);
  if (ackMatch && request.method === "POST") {
    const handoverId = positiveInteger(ackMatch[1], "Übergabe-ID");

    // Nur einmal bestaetigen, und nicht die eigene Uebergabe -- sonst waere die
    // Bestaetigung ohne Aussage.
    const result = await env.DB.prepare(
      `UPDATE handovers
       SET acknowledged_by = ?1, acknowledged_by_name = ?2,
           acknowledged_at = CURRENT_TIMESTAMP
       WHERE id = ?3 AND acknowledged_at IS NULL AND created_by IS NOT ?1`,
    ).bind(user.id, user.displayName, handoverId).run();

    if ((result.meta.changes ?? 0) === 0) {
      throw new HttpError(
        409,
        "Übergabe wurde bereits bestätigt oder stammt von dir selbst.",
      );
    }

    await audit(env, user.id, "acknowledge", "handover", handoverId);
    return json({ ok: true });
  }

  return null;
}
