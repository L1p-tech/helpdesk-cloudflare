import { requireRole } from "../auth";
import { commitMutation, expectVersion } from "../mutations";
import { audit, DELETED_USER_LABEL } from "../db";
import { HttpError, json } from "../http";
import type { AuthUser, Env } from "../types";
import { positiveInteger } from "../validation";
import { TemplateSnapshot, TEMPLATE_SNAPSHOT_COLUMNS, archiveTemplateVersion } from "../shared";

/** Versionshistorie und Papierkorb archivierter Vorlagen. */
export async function handleHistory(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
  if (path === "/api/history" && request.method === "GET") {
    const [versions, trash] = await Promise.all([
      env.DB.prepare(
        `SELECT v.id, v.template_id, v.version, v.title, v.created_at,
                COALESCE(v.changed_by_name, u.display_name, ?1) AS changed_by_name
         FROM template_versions v
         LEFT JOIN users u ON u.id = v.changed_by
         ORDER BY v.created_at DESC
         LIMIT 100`,
      ).bind(DELETED_USER_LABEL).all(),
      env.DB.prepare(
        `SELECT id, title, version, updated_at
         FROM templates
         WHERE active = 0
         ORDER BY updated_at DESC
         LIMIT 100`,
      ).all(),
    ]);

    return json({
      versions: versions.results,
      trash: trash.results,
    });
  }

  const versionMatch = path.match(/^\/api\/history\/version\/(\d+)\/restore$/);
  if (versionMatch && request.method === "POST") {
    requireRole(user, ["editor", "admin"]);
    const versionId = positiveInteger(versionMatch[1], "Versions-ID");

    const version = await env.DB.prepare(
      `SELECT id, template_id, version, category_id, title, body
       FROM template_versions
       WHERE id = ?1`,
    ).bind(versionId).first<TemplateSnapshot & { template_id: number }>();

    if (!version) throw new HttpError(404, "Version wurde nicht gefunden.");

    // Bewusst ohne active-Filter: Auch eine archivierte Vorlage darf durch das
    // Wiederherstellen einer Version zurueckgeholt werden.
    const current = await env.DB.prepare(
      `SELECT ${TEMPLATE_SNAPSHOT_COLUMNS} FROM templates WHERE id = ?1`,
    ).bind(version.template_id).first<TemplateSnapshot>();

    if (!current) throw new HttpError(404, "Zielvorlage wurde nicht gefunden.");

    await commitMutation(env, [
      expectVersion(env, "templates", current.id, current.version, false),
      // Erst den aktuellen Stand sichern, damit das Zurueckholen umkehrbar ist.
      archiveTemplateVersion(
        env,
        current,
        user,
        `Automatische Sicherung vor Wiederherstellung von Version ${version.version}`,
      ),
      env.DB.prepare(
        `UPDATE templates
         SET category_id = ?1, title = ?2, body = ?3, version = version + 1,
             active = 1, updated_by = ?4, updated_by_name = ?5, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?6`,
      ).bind(
        version.category_id,
        version.title,
        version.body,
        user.id,
        user.displayName,
        version.template_id,
      ),
    ]);

    await audit(env, user.id, "restore", "template_version", versionId, {
      templateId: version.template_id,
      restoredVersion: version.version,
    });
    return json({ ok: true });
  }

  const templateMatch = path.match(/^\/api\/history\/template\/(\d+)\/restore$/);
  if (templateMatch && request.method === "POST") {
    requireRole(user, ["editor", "admin"]);
    const templateId = positiveInteger(templateMatch[1], "Vorlagen-ID");

    const result = await env.DB.prepare(
      `UPDATE templates
       SET active = 1, version = version + 1, updated_by = ?1, updated_by_name = ?2, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?3 AND active = 0`,
    ).bind(user.id, user.displayName, templateId).run();

    if ((result.meta.changes ?? 0) === 0) {
      throw new HttpError(404, "Archivierte Vorlage wurde nicht gefunden.");
    }

    await audit(env, user.id, "restore", "template", templateId);
    return json({ ok: true });
  }

  // Einzelne Version aus der Historie entfernen.
  //
  // Wie beim Papierkorb nur fuer Admins: Der Vorgang ist nicht umkehrbar.
  // Betroffen ist ausschliesslich der Historieneintrag -- die Vorlage selbst
  // und ihr aktueller Stand bleiben unberuehrt.
  const versionPurgeMatch = path.match(/^\/api\/history\/version\/(\d+)$/);
  if (versionPurgeMatch && request.method === "DELETE") {
    requireRole(user, ["admin"]);
    const versionId = positiveInteger(versionPurgeMatch[1], "Versions-ID");

    // Titel und Versionsnummer vorher lesen, damit das Protokoll
    // nachvollziehbar bleibt.
    const version = await env.DB.prepare(
      "SELECT template_id, version, title FROM template_versions WHERE id = ?1",
    ).bind(versionId).first<{ template_id: number; version: number; title: string }>();

    if (!version) throw new HttpError(404, "Version wurde nicht gefunden.");

    await env.DB.prepare(
      "DELETE FROM template_versions WHERE id = ?1",
    ).bind(versionId).run();

    await audit(env, user.id, "purge", "template_version", versionId, {
      templateId: version.template_id,
      version: version.version,
      title: version.title,
    });
    return json({ ok: true });
  }

  // Endgueltiges Loeschen aus dem Papierkorb.
  //
  // Bewusst nur fuer Admins, waehrend Wiederherstellen auch Redakteuren offen
  // steht: Der Vorgang ist nicht umkehrbar. Die Bedingung `active = 0` stellt
  // sicher, dass nur bereits archivierte Vorlagen entfernt werden koennen --
  // eine aktive Vorlage muss also erst in den Papierkorb wandern.
  //
  // Die Versionshistorie haengt per ON DELETE CASCADE an der Vorlage und wird
  // automatisch mitgeloescht. Vorschlaege verweisen mit ON DELETE SET NULL und
  // bleiben erhalten.
  const purgeMatch = path.match(/^\/api\/history\/template\/(\d+)$/);
  if (purgeMatch && request.method === "DELETE") {
    requireRole(user, ["admin"]);
    const templateId = positiveInteger(purgeMatch[1], "Vorlagen-ID");

    // Titel vorher lesen, damit das Protokoll nachvollziehbar bleibt.
    const template = await env.DB.prepare(
      "SELECT title FROM templates WHERE id = ?1 AND active = 0",
    ).bind(templateId).first<{ title: string }>();

    if (!template) {
      throw new HttpError(404, "Archivierte Vorlage wurde nicht gefunden.");
    }

    await env.DB.prepare(
      "DELETE FROM templates WHERE id = ?1 AND active = 0",
    ).bind(templateId).run();

    await audit(env, user.id, "purge", "template", templateId, {
      title: template.title,
    });
    return json({ ok: true });
  }

  return null;
}
