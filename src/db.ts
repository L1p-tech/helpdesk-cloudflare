import type { Env } from "./types";

/**
 * Anzeigename fuer Inhalte, deren Urheber geloescht wurde.
 *
 * Die Tabellen speichern den Namen redundant zur user_id (`*_by_name`), damit
 * Vorlagen, Befehle und Beitraege nach dem Loeschen eines Kontos zuordenbar
 * bleiben. Fuer Altbestaende ohne gespeicherten Namen greift dieser Fallback.
 */
export const DELETED_USER_LABEL = "Ehemaliger Mitarbeiter";

/**
 * Schreibt einen Eintrag ins Aenderungsprotokoll.
 *
 * Bewusst "best effort": Ein fehlgeschlagenes Audit darf die eigentliche
 * Fachaktion nicht zuruecknehmen, deshalb wird der Aufruf hier nicht in eine
 * Transaktion mit der Aktion selbst gezogen.
 */
export async function audit(
  env: Env,
  userId: number | null,
  action: string,
  entityType: string,
  entityId: number | null,
  details: unknown = {},
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details_json)
     VALUES (?1, ?2, ?3, ?4, ?5)`,
  )
    .bind(userId, action, entityType, entityId, JSON.stringify(details))
    .run();
}

/** Legt eine Benachrichtigung fuer einen Benutzer an (wird per Bootstrap abgeholt). */
export async function notify(
  env: Env,
  userId: number,
  type: string,
  title: string,
  message: string,
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO notifications (user_id, type, title, message)
     VALUES (?1, ?2, ?3, ?4)`,
  )
    .bind(userId, type, title, message)
    .run();
}

/**
 * Fuehrt eine Operation aus und schluckt "no such table"-Fehler.
 *
 * Gebraucht beim Loeschen von Benutzern: Dort werden Verweise in optionalen
 * Tabellen (Feedback, Vorschlaege) geloest, die in aelteren Installationen
 * noch nicht existieren muessen. Andere Fehler werden unveraendert
 * weitergereicht.
 */
export async function ignoreMissingTable(
  operation: () => Promise<unknown>,
): Promise<void> {
  try {
    await operation();
  } catch (error) {
    const isMissingTable = error instanceof Error
      && /no such table/i.test(error.message);
    if (!isMissingTable) throw error;
  }
}
