import { duplicateScore } from "./duplicates";
import { HttpError } from "./http";
import type { AuthUser, Env, Role } from "./types";


/**
 * Bedingung fuer die Sicht "Meine Vorschlaege".
 *
 * Erledigte Vorgaenge verschwinden aus der Liste: Genehmigtes steht bereits im
 * Bestand, Zurueckgezogenes hat der Einreicher selbst beendet. Abgelehnte und
 * zur Ueberarbeitung zurueckgegebene Vorschlaege bleiben dagegen sichtbar --
 * dort steht die Begruendung des Pruefers, die der Einreicher noch braucht.
 */
export const MY_PROPOSALS_CONDITION = (prefix: string) =>
  `${prefix}submitted_by = ?1 AND ${prefix}status NOT IN ('approved', 'withdrawn')`;

/** Ab diesem Dice-Wert gilt eine Vorlage als praktisch identisch und wird abgelehnt. */
export const DUPLICATE_REJECT_THRESHOLD = 0.98;

export const SHELLS = ["cmd", "powershell", "windows"] as const;
export const RISK_LEVELS = ["low", "medium", "high"] as const;
export const ROLES: Role[] = ["employee", "editor", "admin"];
export const SEVERITIES = ["low", "medium", "high"] as const;
export const CONTENT_TYPES = ["command", "solution"] as const;
export const FEEDBACK_TYPES = ["bug", "improvement"] as const;
export const FEEDBACK_STATUSES = ["open", "planned", "closed"] as const;

export interface TemplateCandidate {
  id: number;
  title: string;
  body: string;
}

export interface TemplateSnapshot {
  id: number;
  version: number;
  category_id: number;
  title: string;
  body: string;
}

/** Zeile aus content_proposals -- Vorschlaege fuer Befehle und Loesungen. */
export interface ContentProposalRow {
  id: number;
  content_type: "command" | "solution";
  base_version: number | null;
  target_id: number | null;
  proposal_type: "create" | "update";
  title: string;
  payload_json: string;
  status: string;
  submitted_by: number | null;
  submitted_by_name: string;
}

export interface ProposalRow {
  id: number;
  template_id: number | null;
  base_version: number | null;
  proposal_type: "create" | "update";
  category_id: number | null;
  proposed_category_name: string | null;
  proposed_category_color: string | null;
  title: string;
  body: string;
  status: string;
  submitted_by: number | null;
  submitted_by_name: string;
}

export interface FeedbackRow {
  id: number;
  type: "bug" | "improvement";
  title: string;
  message: string;
  status: "open" | "planned" | "closed";
  submitted_by: number | null;
  submitted_by_name: string;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

/** Spalten, die eine Vorlage vollstaendig beschreiben -- Basis fuer Versions-Snapshots. */
export const TEMPLATE_SNAPSHOT_COLUMNS = "id, version, category_id, title, body";

export function routePath(request: Request): string {
  return new URL(request.url).pathname.replace(/\/+$/, "") || "/";
}

export function isApi(path: string): boolean {
  return path === "/api" || path.startsWith("/api/");
}

/** Prueft einen Wert gegen eine feste Werteliste und wirft sonst 400. */
export function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  message: string,
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new HttpError(400, message);
  }
  return value as T;
}

/**
 * Tabellen, die in aelteren Installationen fehlen koennen und deshalb vor der
 * ersten Nutzung angelegt werden.
 *
 * Das ersetzt keine Migration -- die Definitionen sind mit 0004/0005/0006
 * identisch. Es faengt nur den Fall ab, dass eine Datenbank die Migrationen
 * noch nicht gesehen hat, damit Feedback und Tippspiel nicht hart scheitern.
 */
export async function ensureFeedbackTable(env: Env): Promise<void> {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS feedback_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('bug', 'improvement')),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'planned', 'closed')),
      submitted_by INTEGER,
      submitted_by_name TEXT NOT NULL,
      reviewed_by INTEGER,
      admin_note TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    )`,
  ).run();
}

export async function ensureTypingScoresTable(env: Env): Promise<void> {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS typing_game_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      display_name TEXT NOT NULL,
      wpm INTEGER NOT NULL CHECK (wpm >= 0 AND wpm <= 400),
      accuracy INTEGER NOT NULL CHECK (accuracy >= 0 AND accuracy <= 100),
      correct_chars INTEGER NOT NULL CHECK (correct_chars >= 0),
      total_chars INTEGER NOT NULL CHECK (total_chars >= 1),
      duration_ms INTEGER NOT NULL CHECK (duration_ms >= 10000 AND duration_ms <= 300000),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )`,
  ).run();
}

export async function ensureTemplateUsageTable(env: Env): Promise<void> {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS template_usage (
      user_id INTEGER NOT NULL,
      template_id INTEGER NOT NULL,
      use_count INTEGER NOT NULL DEFAULT 0,
      last_used_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, template_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
    )`,
  ).run();
}

/**
 * Sucht die aehnlichste aktive Vorlage.
 *
 * Bewusst ein voller Tabellenscan mit Vergleich in JS: Der Bestand liegt im
 * Bereich weniger hundert Vorlagen, und SQLite bietet ohne Extension keine
 * Trigramm-Aehnlichkeit. Sollte der Bestand deutlich wachsen, waere hier eine
 * Vorfilterung (z. B. FTS5 auf den Titel) der naechste Schritt.
 */
export async function findDuplicate(
  env: Env,
  title: string,
  body: string,
  excludedTemplateId: number | null,
): Promise<{ score: number; templateId: number | null; title: string | null }> {
  const result = await env.DB.prepare(
    `SELECT id, title, body
     FROM templates
     WHERE active = 1 AND (?1 IS NULL OR id <> ?1)`,
  )
    .bind(excludedTemplateId)
    .all<TemplateCandidate>();

  let best = { score: 0, templateId: null as number | null, title: null as string | null };

  for (const candidate of result.results) {
    const score = duplicateScore(title, body, candidate.title, candidate.body);
    if (score > best.score) {
      best = { score, templateId: candidate.id, title: candidate.title };
    }
  }

  return best;
}

export function slugifyCategory(name: string): string {
  return name
    .toLocaleLowerCase("de")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/** Liest eine aktive Vorlage oder wirft 404. */
export async function loadActiveTemplate(env: Env, templateId: number): Promise<TemplateSnapshot> {
  const template = await env.DB.prepare(
    `SELECT ${TEMPLATE_SNAPSHOT_COLUMNS} FROM templates WHERE id = ?1 AND active = 1`,
  ).bind(templateId).first<TemplateSnapshot>();

  if (!template) throw new HttpError(404, "Vorlage wurde nicht gefunden.");
  return template;
}

/**
 * Schreibt den aktuellen Stand einer Vorlage in die Versionshistorie.
 *
 * Immer *vor* dem UPDATE aufrufen: Gespeichert wird der Zustand, der gleich
 * ueberschrieben wird, damit er wiederherstellbar bleibt.
 *
 * `ON CONFLICT DO NOTHING` deckt den Fall ab, dass genau diese Version schon
 * gesichert wurde. Das passiert beim Wiederherstellen: Dort wird der aktuelle
 * Stand vorsorglich archiviert, obwohl er unter Umstaenden aus einer frueheren
 * Bearbeitung bereits in der Historie steht. Ohne diese Klausel bricht der
 * Vorgang am UNIQUE-Index (template_id, version) mit 409 ab. Ein zweiter
 * Eintrag derselben Version haette ohnehin keinen Mehrwert.
 */
export function archiveTemplateVersion(
  env: Env,
  snapshot: TemplateSnapshot,
  user: AuthUser,
  changeNote: string | null,
): D1PreparedStatement {
  return env.DB.prepare(
    `INSERT INTO template_versions
      (template_id, version, category_id, title, body, changed_by, changed_by_name, change_note)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
     ON CONFLICT (template_id, version) DO NOTHING`,
  ).bind(
    snapshot.id,
    snapshot.version,
    snapshot.category_id,
    snapshot.title,
    snapshot.body,
    user.id,
    user.displayName,
    changeNote,
  );
}
