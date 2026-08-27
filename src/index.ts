/**
 * Worker-Einstiegspunkt des 2nd-Level-Helpdesks.
 *
 * Aufbau:
 *   - `handleApi` prueft Origin und Session und reicht die Anfrage dann durch
 *     eine Kette von Handlern (`handleAuth`, `handleTemplates`, ...).
 *   - Jeder Handler gibt `null` zurueck, wenn er fuer Pfad/Methode nicht
 *     zustaendig ist. Der erste Handler, der eine Response liefert, gewinnt.
 *   - Alles, was nicht unter /api liegt, wird an die statischen Assets
 *     durchgereicht.
 *
 * Fehlerbehandlung laeuft zentral: Handler werfen `HttpError`, `errorResponse`
 * uebersetzt das in eine JSON-Antwort. Kein Handler baut Fehler-Responses selbst.
 *
 * Rollenmodell: employee < editor < admin. Die Pruefung erfolgt ausschliesslich
 * hier im Worker (`requireRole`), niemals im Frontend.
 */
import {
  authenticate,
  clearSessionCookie,
  login,
  logout,
  requireRole,
  requireUser,
} from "./auth";
import { hashPassword } from "./crypto";
import { audit, DELETED_USER_LABEL, ignoreMissingTable, notify } from "./db";
import { duplicateScore } from "./duplicates";
import {
  assertSameOrigin,
  errorResponse,
  HttpError,
  json,
  readJson,
} from "./http";
import { ensureDefaultLibrary } from "./library";
import { fetchFeed } from "./feeds";
import type { AuthUser, Env, Role } from "./types";
import {
  optionalString,
  positiveInteger,
  requiredString,
  validColor,
  validPassword,
  validUsername,
} from "./validation";

/** Ab diesem Dice-Wert gilt eine Vorlage als praktisch identisch und wird abgelehnt. */
const DUPLICATE_REJECT_THRESHOLD = 0.98;

const SHELLS = ["cmd", "powershell", "windows"] as const;
const RISK_LEVELS = ["low", "medium", "high"] as const;
const ROLES: Role[] = ["employee", "editor", "admin"];
const SEVERITIES = ["low", "medium", "high"] as const;
const CONTENT_TYPES = ["command", "solution"] as const;
const FEEDBACK_TYPES = ["bug", "improvement"] as const;
const FEEDBACK_STATUSES = ["open", "planned", "closed"] as const;

interface TemplateCandidate {
  id: number;
  title: string;
  body: string;
}

interface TemplateSnapshot {
  id: number;
  version: number;
  category_id: number;
  title: string;
  body: string;
}

/** Zeile aus content_proposals -- Vorschlaege fuer Befehle und Loesungen. */
interface ContentProposalRow {
  id: number;
  content_type: "command" | "solution";
  target_id: number | null;
  proposal_type: "create" | "update";
  title: string;
  payload_json: string;
  status: string;
  submitted_by: number | null;
  submitted_by_name: string;
}

interface ProposalRow {
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

interface CategoryRow {
  id: number;
  slug: string;
  name: string;
  color: string;
}

interface FeedbackRow {
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
const TEMPLATE_SNAPSHOT_COLUMNS = "id, version, category_id, title, body";

function routePath(request: Request): string {
  return new URL(request.url).pathname.replace(/\/+$/, "") || "/";
}

function isApi(path: string): boolean {
  return path === "/api" || path.startsWith("/api/");
}

/** Prueft einen Wert gegen eine feste Werteliste und wirft sonst 400. */
function oneOf<T extends string>(
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
async function ensureFeedbackTable(env: Env): Promise<void> {
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

async function ensureTypingScoresTable(env: Env): Promise<void> {
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

async function ensureTemplateUsageTable(env: Env): Promise<void> {
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
async function findDuplicate(
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

function slugifyCategory(name: string): string {
  return name
    .toLocaleLowerCase("de")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/**
 * Ermittelt die Zielkategorie eines Vorschlags.
 *
 * Vorschlaege duerfen eine neue Kategorie vorschlagen. Diese wird erst beim
 * Genehmigen angelegt -- und nur dann, wenn nicht zwischenzeitlich jemand eine
 * gleichnamige Kategorie erstellt hat.
 */
async function resolveProposalCategory(
  env: Env,
  userId: number,
  categoryId: number | null,
  proposedCategoryName: string | null,
  proposedCategoryColor: string | null,
): Promise<number> {
  if (proposedCategoryName) {
    const existing = await env.DB.prepare(
      `SELECT id, slug, name, color
       FROM categories
       WHERE lower(name) = lower(?1)
       LIMIT 1`,
    ).bind(proposedCategoryName).first<CategoryRow>();

    if (existing) return existing.id;

    const slug = slugifyCategory(proposedCategoryName);
    if (!slug) throw new HttpError(400, "Kategoriename ist ungültig.");

    const result = await env.DB.prepare(
      `INSERT INTO categories (slug, name, color, created_by)
       VALUES (?1, ?2, ?3, ?4)`,
    ).bind(
      slug,
      proposedCategoryName,
      proposedCategoryColor ?? "#4a7cff",
      userId,
    ).run();

    return Number(result.meta.last_row_id);
  }

  if (categoryId === null) {
    throw new HttpError(400, "Kategorie fehlt.");
  }

  return categoryId;
}

/** Liest eine aktive Vorlage oder wirft 404. */
async function loadActiveTemplate(env: Env, templateId: number): Promise<TemplateSnapshot> {
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
function archiveTemplateVersion(
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

async function createInitialAdmin(request: Request, env: Env): Promise<Response> {
  const token = request.headers.get("x-setup-token");
  if (!env.ADMIN_SETUP_TOKEN || token !== env.ADMIN_SETUP_TOKEN) {
    throw new HttpError(403, "Ungültiger Setup-Token.");
  }

  // Der Endpunkt ist nur solange offen, wie es ueberhaupt keinen Benutzer gibt.
  const existing = await env.DB.prepare("SELECT COUNT(*) AS count FROM users")
    .first<{ count: number }>();
  if ((existing?.count ?? 0) > 0) {
    throw new HttpError(409, "Es existiert bereits mindestens ein Benutzer.");
  }

  const body = await readJson<Record<string, unknown>>(request);
  const username = validUsername(body.username);
  const displayName = requiredString(body.displayName, "Anzeigename", 80);
  const password = validPassword(body.password);
  const passwordData = await hashPassword(password);

  const result = await env.DB.prepare(
    `INSERT INTO users
      (username, display_name, password_hash, password_salt, password_iterations, role)
     VALUES (?1, ?2, ?3, ?4, ?5, 'admin')`,
  )
    .bind(
      username,
      displayName,
      passwordData.hash,
      passwordData.salt,
      passwordData.iterations,
    )
    .run();

  const adminId = Number(result.meta.last_row_id);

  // Die Seed-Migrationen liefen ins Leere, solange kein Admin existierte --
  // jetzt nachziehen, damit die Installation nicht leer startet.
  await ensureDefaultLibrary(env, { id: adminId, displayName });
  await audit(env, adminId, "setup_admin", "user", adminId);
  return json({ ok: true }, { status: 201 });
}

async function handleAuth(
  request: Request,
  env: Env,
  user: AuthUser | null,
  path: string,
): Promise<Response | null> {
  if (path === "/api/setup/admin" && request.method === "POST") {
    return createInitialAdmin(request, env);
  }

  if (path === "/api/auth/login" && request.method === "POST") {
    const body = await readJson<Record<string, unknown>>(request);
    const result = await login(
      request,
      env,
      requiredString(body.username, "Benutzername", 40),
      requiredString(body.password, "Passwort", 200),
    );

    await audit(env, result.user.id, "login", "session", null);
    return json(
      { user: result.user },
      { headers: { "set-cookie": result.cookie } },
    );
  }

  if (path === "/api/auth/logout" && request.method === "POST") {
    if (user) await audit(env, user.id, "logout", "session", null);
    await logout(request, env);
    return json(
      { ok: true },
      { headers: { "set-cookie": clearSessionCookie() } },
    );
  }

  if (path === "/api/auth/me" && request.method === "GET") {
    return json({ user });
  }

  return null;
}

/**
 * Liefert den kompletten Startdatensatz der Oberflaeche in einer Antwort:
 * Kategorien, Vorlagen, Befehle, persoenliche Einstellungen und ungelesene
 * Benachrichtigungen. Spart dem Frontend fuenf einzelne Requests beim Laden.
 */
async function handleBootstrap(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
  if (path !== "/api/bootstrap" || request.method !== "GET") return null;

  await ensureDefaultLibrary(env, { id: user.id, displayName: user.displayName });
  await ensureTemplateUsageTable(env);

  const [categories, templates, commands, solutions, settings, notifications] = await Promise.all([
    env.DB.prepare(
      "SELECT id, slug, name, color FROM categories WHERE active = 1 ORDER BY name COLLATE NOCASE",
    ).all(),
    // Nutzungszahlen des aktuellen Benutzers kommen per LEFT JOIN mit, damit
    // das Frontend nach "zuletzt benutzt" sortieren kann, ohne zweite Anfrage.
    env.DB.prepare(
      `SELECT t.id, t.title, t.body, t.version, t.updated_at,
              c.id AS category_id, c.name AS category_name, c.color AS category_color,
              COALESCE(t.created_by_name, cu.display_name, ?1) AS created_by_name,
              COALESCE(t.updated_by_name, u.display_name, ?1) AS updated_by_name,
              COALESCE(usage.use_count, 0) AS use_count,
              usage.last_used_at
       FROM templates t
       JOIN categories c ON c.id = t.category_id
       LEFT JOIN users cu ON cu.id = t.created_by
       LEFT JOIN users u ON u.id = t.updated_by
       LEFT JOIN template_usage usage
         ON usage.template_id = t.id AND usage.user_id = ?2
       WHERE t.active = 1
       ORDER BY t.updated_at DESC`,
    ).bind(DELETED_USER_LABEL, user.id).all(),
    env.DB.prepare(
      `SELECT id, category, name, command, description, shell, requires_admin,
              risk_level, remote_capable, restart_required
       FROM commands WHERE active = 1 ORDER BY category, name COLLATE NOCASE`,
    ).all(),
    env.DB.prepare(
      `SELECT id, category, title, symptom, cause, solution, severity, updated_at,
              COALESCE(created_by_name, ?1) AS created_by_name
       FROM solutions WHERE active = 1 ORDER BY category, title COLLATE NOCASE`,
    ).bind(DELETED_USER_LABEL).all(),
    env.DB.prepare(
      `SELECT signature_name, favorites_json, preferences_json
       FROM user_settings WHERE user_id = ?1`,
    ).bind(user.id).first(),
    env.DB.prepare(
      `SELECT id, type, title, message, created_at
       FROM notifications WHERE user_id = ?1 AND read_at IS NULL
       ORDER BY created_at DESC LIMIT 30`,
    ).bind(user.id).all(),
  ]);

  return json({
    user,
    categories: categories.results,
    templates: templates.results,
    commands: commands.results,
    solutions: solutions.results,
    settings: settings ?? {
      signature_name: "",
      favorites_json: '{"templates":[],"commands":[]}',
      preferences_json: "{}",
    },
    notifications: notifications.results,
  });
}

async function handleSettings(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
  if (path !== "/api/settings" || request.method !== "PUT") return null;

  const body = await readJson<Record<string, unknown>>(request);
  const signatureName = optionalString(body.signatureName, 100) ?? "";
  const favorites = body.favorites ?? { templates: [], commands: [] };
  const preferences = body.preferences ?? {};

  await env.DB.prepare(
    `INSERT INTO user_settings
      (user_id, signature_name, favorites_json, preferences_json, updated_at)
     VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id) DO UPDATE SET
       signature_name = excluded.signature_name,
       favorites_json = excluded.favorites_json,
       preferences_json = excluded.preferences_json,
       updated_at = CURRENT_TIMESTAMP`,
  )
    .bind(user.id, signatureName, JSON.stringify(favorites), JSON.stringify(preferences))
    .run();

  return json({ ok: true });
}

/**
 * Vorschlagsprozess: Mitarbeiter reichen Vorlagen ein, Redakteure und Admins
 * genehmigen, lehnen ab oder fordern Ueberarbeitung an.
 */
async function handleProposals(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
  if (path === "/api/proposals" && request.method === "GET") {
    /*
     * `scope=mine` liefert die eigenen Vorschlaege, sonst die offenen zur
     * Pruefung. Ohne diese Unterscheidung entschied allein die Rolle, wodurch
     * Pruefer auch unter "Meine Vorschlaege" fremde Einreichungen sahen.
     */
    const scope = new URL(request.url).searchParams.get("scope");
    const isReviewer = scope !== "mine"
      && (user.role === "admin" || user.role === "editor");
    const query = env.DB.prepare(
      `SELECT p.*, c.name AS category_name, c.color AS category_color,
              d.title AS duplicate_title
       FROM template_proposals p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN templates d ON d.id = p.duplicate_template_id
       WHERE ${isReviewer ? "p.status = 'pending'" : "p.submitted_by = ?1"}
       ORDER BY p.updated_at DESC`,
    );

    const rows = isReviewer ? await query.all() : await query.bind(user.id).all();
    return json({ proposals: rows.results });
  }

  // Vorabpruefung aus dem Formular heraus -- meldet nur, blockiert nicht.
  if (path === "/api/proposals/check" && request.method === "POST") {
    const body = await readJson<Record<string, unknown>>(request);
    const title = requiredString(body.title, "Titel", 160);
    const templateBody = requiredString(body.body, "Vorlagentext", 20_000);
    const templateId = body.templateId ? positiveInteger(body.templateId, "Vorlagen-ID") : null;
    const duplicate = await findDuplicate(env, title, templateBody, templateId);
    return json({ duplicate });
  }

  if (path === "/api/proposals" && request.method === "POST") {
    const body = await readJson<Record<string, unknown>>(request);
    const title = requiredString(body.title, "Titel", 160);
    const templateBody = requiredString(body.body, "Vorlagentext", 20_000);
    const wantsNewCategory = body.categoryMode === "new";
    const categoryId = wantsNewCategory
      ? null
      : positiveInteger(body.categoryId, "Kategorie");
    const proposedCategoryName = wantsNewCategory
      ? requiredString(body.proposedCategoryName, "Neue Kategorie", 60)
      : null;
    const proposedCategoryColor = wantsNewCategory
      ? validColor(body.proposedCategoryColor)
      : null;
    const reason = optionalString(body.reason, 1000);
    const templateId = body.templateId ? positiveInteger(body.templateId, "Vorlagen-ID") : null;

    // Bezieht sich der Vorschlag auf eine bestehende Vorlage, wird deren
    // Version festgehalten. Beim Genehmigen wird geprueft, ob sie sich
    // zwischenzeitlich geaendert hat (optimistisches Sperren).
    let proposalType: "create" | "update" = "create";
    let baseVersion: number | null = null;

    if (templateId !== null) {
      const template = await loadActiveTemplate(env, templateId);
      proposalType = "update";
      baseVersion = template.version;
    }

    const duplicate = await findDuplicate(env, title, templateBody, templateId);
    if (duplicate.score >= DUPLICATE_REJECT_THRESHOLD) {
      throw new HttpError(409, "Eine nahezu identische Vorlage existiert bereits.", {
        duplicate,
      });
    }

    const result = await env.DB.prepare(
      `INSERT INTO template_proposals
        (template_id, base_version, proposal_type, category_id, proposed_category_name,
         proposed_category_color, title, body, reason, status, duplicate_score,
         duplicate_template_id, submitted_by, submitted_by_name, submitted_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'pending', ?10, ?11, ?12, ?13, CURRENT_TIMESTAMP)`,
    ).bind(
      templateId,
      baseVersion,
      proposalType,
      categoryId,
      proposedCategoryName,
      proposedCategoryColor,
      title,
      templateBody,
      reason,
      duplicate.score,
      duplicate.templateId,
      user.id,
      user.displayName,
    ).run();

    const proposalId = Number(result.meta.last_row_id);
    await audit(env, user.id, "submit", "template_proposal", proposalId, {
      duplicateScore: duplicate.score,
    });

    return json({ id: proposalId, duplicate }, { status: 201 });
  }

  const reviewMatch = path.match(/^\/api\/proposals\/(\d+)\/(approve|reject|changes)$/);
  if (reviewMatch && request.method === "POST") {
    requireRole(user, ["editor", "admin"]);

    const proposalId = positiveInteger(reviewMatch[1], "Vorschlags-ID");
    // Die Aktion stammt aus der Regex-Gruppe und ist damit bereits auf diese
    // drei Werte begrenzt.
    const action = reviewMatch[2] as "approve" | "reject" | "changes";

    const body = await readJson<Record<string, unknown>>(request);
    const note = optionalString(body.note, 2000);

    const proposal = await env.DB.prepare(
      `SELECT id, template_id, base_version, proposal_type, category_id,
              proposed_category_name, proposed_category_color, title, body,
              status, submitted_by, submitted_by_name
       FROM template_proposals WHERE id = ?1`,
    ).bind(proposalId).first<ProposalRow>();

    if (!proposal) throw new HttpError(404, "Vorschlag wurde nicht gefunden.");
    if (proposal.status !== "pending") {
      throw new HttpError(409, "Dieser Vorschlag wurde bereits bearbeitet.");
    }

    if (action === "approve") {
      const templateId = await applyApprovedProposal(env, user, proposal, note);

      await env.DB.prepare(
        `UPDATE template_proposals
         SET status = 'approved', reviewed_by = ?1, review_note = ?2,
             reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP,
             template_id = ?3
         WHERE id = ?4`,
      ).bind(user.id, note, templateId, proposalId).run();

      if (proposal.submitted_by !== null) {
        await notify(
          env,
          proposal.submitted_by,
          "proposal_approved",
          "Vorlage genehmigt",
          `Dein Vorschlag „${proposal.title}“ wurde genehmigt.`,
        );
      }
      await audit(env, user.id, "approve", "template_proposal", proposalId, { templateId });

      return json({ ok: true, templateId });
    }

    // Ablehnung und Ueberarbeitung muessen begruendet werden -- die Begruendung
    // ist der Text, den der Einreicher als Benachrichtigung erhaelt.
    if (!note) {
      throw new HttpError(400, "Bitte einen Grund oder Änderungswunsch eintragen.");
    }

    const status = action === "reject" ? "rejected" : "changes_requested";
    await env.DB.prepare(
      `UPDATE template_proposals
       SET status = ?1, reviewed_by = ?2, review_note = ?3,
           reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?4`,
    ).bind(status, user.id, note, proposalId).run();

    if (proposal.submitted_by !== null) {
      await notify(
        env,
        proposal.submitted_by,
        status === "rejected" ? "proposal_rejected" : "changes_requested",
        status === "rejected" ? "Vorlage abgelehnt" : "Überarbeitung angefordert",
        `„${proposal.title}“: ${note}`,
      );
    }
    await audit(env, user.id, action, "template_proposal", proposalId, { note });

    return json({ ok: true });
  }

  return null;
}

/**
 * Uebertraegt einen genehmigten Vorschlag in den Vorlagenbestand und gibt die
 * betroffene Vorlagen-ID zurueck.
 *
 * Bei `update` wird geprueft, ob die Zielvorlage noch auf der Version steht,
 * auf der der Vorschlag basiert. Ist sie zwischenzeitlich veraendert worden,
 * bricht der Vorgang mit 409 ab, statt fremde Aenderungen zu ueberschreiben.
 */
async function applyApprovedProposal(
  env: Env,
  user: AuthUser,
  proposal: ProposalRow,
  note: string | null,
): Promise<number> {
  const categoryId = await resolveProposalCategory(
    env,
    user.id,
    proposal.category_id,
    proposal.proposed_category_name,
    proposal.proposed_category_color,
  );

  if (proposal.proposal_type === "create") {
    // Urheberschaft bleibt beim Einreicher, die letzte Aenderung beim Pruefer.
    const result = await env.DB.prepare(
      `INSERT INTO templates
        (category_id, title, body, version, created_by, created_by_name, updated_by, updated_by_name)
       VALUES (?1, ?2, ?3, 1, ?4, ?5, ?6, ?7)`,
    ).bind(
      categoryId,
      proposal.title,
      proposal.body,
      proposal.submitted_by,
      proposal.submitted_by_name,
      user.id,
      user.displayName,
    ).run();

    return Number(result.meta.last_row_id);
  }

  if (!proposal.template_id) throw new HttpError(409, "Zielvorlage fehlt.");

  const current = await env.DB.prepare(
    `SELECT ${TEMPLATE_SNAPSHOT_COLUMNS} FROM templates WHERE id = ?1 AND active = 1`,
  ).bind(proposal.template_id).first<TemplateSnapshot>();

  if (!current) throw new HttpError(404, "Zielvorlage wurde nicht gefunden.");
  if (current.version !== proposal.base_version) {
    throw new HttpError(
      409,
      "Die Vorlage wurde zwischenzeitlich geändert. Vorschlag bitte erneut prüfen.",
    );
  }

  await env.DB.batch([
    archiveTemplateVersion(env, current, user, note),
    env.DB.prepare(
      `UPDATE templates
       SET category_id = ?1, title = ?2, body = ?3, version = version + 1,
           updated_by = ?4, updated_by_name = ?5, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?6`,
    ).bind(
      categoryId,
      proposal.title,
      proposal.body,
      user.id,
      user.displayName,
      proposal.template_id,
    ),
  ]);

  return proposal.template_id;
}

async function handleCategories(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
  if (path !== "/api/categories" || request.method !== "POST") return null;
  requireRole(user, ["admin"]);

  const body = await readJson<Record<string, unknown>>(request);
  const name = requiredString(body.name, "Kategoriename", 60);
  const color = validColor(body.color);
  const slug = slugifyCategory(name);

  if (!slug) throw new HttpError(400, "Kategoriename ist ungültig.");

  const result = await env.DB.prepare(
    `INSERT INTO categories (slug, name, color, created_by)
     VALUES (?1, ?2, ?3, ?4)`,
  ).bind(slug, name, color, user.id).run();

  const categoryId = Number(result.meta.last_row_id);
  await audit(env, user.id, "create", "category", categoryId);
  return json({ id: categoryId }, { status: 201 });
}

/**
 * Direktes Bearbeiten und Archivieren von Vorlagen -- nur fuer Admins.
 * Alle anderen Rollen gehen ueber den Vorschlagsprozess.
 */
async function handleTemplates(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
  // Nutzung protokollieren: Wird beim Kopieren einer Vorlage aufgerufen und
  // steuert die Sortierung "zuletzt benutzt". Fuer alle Rollen offen, denn
  // jeder zaehlt nur seine eigene Nutzung hoch.
  const usageMatch = path.match(/^\/api\/templates\/(\d+)\/use$/);
  if (usageMatch && request.method === "POST") {
    const templateId = positiveInteger(usageMatch[1], "Vorlagen-ID");
    await ensureTemplateUsageTable(env);

    const result = await env.DB.prepare(
      `INSERT INTO template_usage (user_id, template_id, use_count, last_used_at)
       SELECT ?1, ?2, 1, CURRENT_TIMESTAMP
       WHERE EXISTS (SELECT 1 FROM templates WHERE id = ?2 AND active = 1)
       ON CONFLICT (user_id, template_id) DO UPDATE SET
         use_count = use_count + 1,
         last_used_at = CURRENT_TIMESTAMP`,
    ).bind(user.id, templateId).run();

    if ((result.meta.changes ?? 0) === 0) {
      throw new HttpError(404, "Vorlage wurde nicht gefunden.");
    }

    return json({ ok: true });
  }

  const templateMatch = path.match(/^\/api\/templates\/(\d+)$/);
  if (!templateMatch) return null;
  if (request.method !== "PUT" && request.method !== "DELETE") return null;

  requireRole(user, ["admin"]);
  const templateId = positiveInteger(templateMatch[1], "Vorlagen-ID");
  const current = await loadActiveTemplate(env, templateId);

  if (request.method === "PUT") {
    const body = await readJson<Record<string, unknown>>(request);
    const title = requiredString(body.title, "Titel", 160);
    const templateBody = requiredString(body.body, "Vorlagentext", 20_000);
    const categoryId = positiveInteger(body.categoryId, "Kategorie");
    const note = optionalString(body.note, 1000) ?? "Direktbearbeitung durch Administrator";

    await env.DB.batch([
      archiveTemplateVersion(env, current, user, note),
      env.DB.prepare(
        `UPDATE templates
         SET category_id = ?1, title = ?2, body = ?3, version = version + 1,
             updated_by = ?4, updated_by_name = ?5, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?6`,
      ).bind(categoryId, title, templateBody, user.id, user.displayName, templateId),
    ]);

    await audit(env, user.id, "update", "template", templateId, { direct: true });
    return json({ ok: true });
  }

  // Loeschen ist ein Soft-Delete (active = 0); die Vorlage bleibt im Papierkorb
  // wiederherstellbar.
  await env.DB.batch([
    archiveTemplateVersion(env, current, user, "Vorlage archiviert"),
    env.DB.prepare(
      `UPDATE templates
       SET active = 0, updated_by = ?1, updated_by_name = ?2, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?3`,
    ).bind(user.id, user.displayName, templateId),
  ]);

  await audit(env, user.id, "delete", "template", templateId);
  return json({ ok: true });
}

async function handleCommands(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
  if (path === "/api/commands" && request.method === "POST") {
    requireRole(user, ["editor", "admin"]);

    const body = await readJson<Record<string, unknown>>(request);
    const category = requiredString(body.category, "Kategorie", 60);
    const name = requiredString(body.name, "Name", 120);
    const command = requiredString(body.command, "Befehl", 5000);
    const description = requiredString(body.description, "Beschreibung", 2000);
    const shell = oneOf(body.shell, SHELLS, "Ungültige Shell.");
    const riskLevel = oneOf(body.riskLevel ?? "low", RISK_LEVELS, "Ungültige Risikostufe.");

    const duplicate = await env.DB.prepare(
      `SELECT id FROM commands
       WHERE active = 1 AND (lower(name) = lower(?1) OR command = ?2)
       LIMIT 1`,
    ).bind(name, command).first();

    if (duplicate) throw new HttpError(409, "Befehl oder Bezeichnung existiert bereits.");

    const result = await env.DB.prepare(
      `INSERT INTO commands
        (category, name, command, description, shell, requires_admin, risk_level,
         remote_capable, restart_required, created_by, created_by_name, updated_by, updated_by_name)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?10, ?11)`,
    ).bind(
      category,
      name,
      command,
      description,
      shell,
      body.requiresAdmin ? 1 : 0,
      riskLevel,
      body.remoteCapable ? 1 : 0,
      body.restartRequired ? 1 : 0,
      user.id,
      user.displayName,
    ).run();

    const commandId = Number(result.meta.last_row_id);
    await audit(env, user.id, "create", "command", commandId);
    return json({ id: commandId }, { status: 201 });
  }

  const commandMatch = path.match(/^\/api\/commands\/(\d+)$/);
  if (commandMatch && request.method === "DELETE") {
    requireRole(user, ["admin"]);
    const commandId = positiveInteger(commandMatch[1], "Befehls-ID");

    const result = await env.DB.prepare(
      `UPDATE commands
       SET active = 0, updated_by = ?1, updated_by_name = ?2, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?3 AND active = 1`,
    ).bind(user.id, user.displayName, commandId).run();

    if ((result.meta.changes ?? 0) === 0) {
      throw new HttpError(404, "Befehl wurde nicht gefunden.");
    }

    await audit(env, user.id, "delete", "command", commandId);
    return json({ ok: true });
  }

  return null;
}

/** Fehlermeldungen und Verbesserungsvorschlaege der Mitarbeitenden. */
/**
 * Vorschlaege fuer Befehle und Loesungen.
 *
 * Ablauf wie bei den Vorlagen: Mitarbeiter reichen ein, Redakteure und Admins
 * entscheiden. Anders als dort teilen sich beide Inhaltsarten eine Tabelle --
 * die inhaltlichen Felder liegen als JSON im Payload, geprueft wird beim
 * Einreichen und erneut beim Genehmigen.
 */
async function handleContentProposals(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
  if (path === "/api/content-proposals" && request.method === "GET") {
    // Wie bei den Vorlagen: `scope=mine` erzwingt die eigene Sicht.
    const scope = new URL(request.url).searchParams.get("scope");
    const isReviewer = scope !== "mine"
      && (user.role === "admin" || user.role === "editor");
    const query = env.DB.prepare(
      `SELECT id, content_type, target_id, proposal_type, title, payload_json,
              reason, status, submitted_by, submitted_by_name, review_note,
              submitted_at, reviewed_at
       FROM content_proposals
       WHERE ${isReviewer ? "status = 'pending'" : "submitted_by = ?1"}
       ORDER BY updated_at DESC`,
    );

    const rows = isReviewer ? await query.all() : await query.bind(user.id).all();
    return json({ proposals: rows.results });
  }

  if (path === "/api/content-proposals" && request.method === "POST") {
    const body = await readJson<Record<string, unknown>>(request);
    const contentType = oneOf(body.contentType, CONTENT_TYPES, "Ungültige Inhaltsart.");
    const reason = optionalString(body.reason, 1000);
    const targetId = body.targetId ? positiveInteger(body.targetId, "Ziel-ID") : null;

    // Die Felder werden hier vollstaendig geprueft, damit ein Vorschlag nicht
    // erst beim Genehmigen -- moeglicherweise Wochen spaeter -- auffaellt.
    const payload = contentType === "command"
      ? parseCommandPayload(body)
      : parseSolutionPayload(body);
    const title = contentType === "command"
      ? (payload as ReturnType<typeof parseCommandPayload>).name
      : (payload as ReturnType<typeof parseSolutionPayload>).title;

    // Bezieht sich der Vorschlag auf einen bestehenden Eintrag, muss es den
    // auch geben -- sonst liefe er beim Genehmigen ins Leere.
    if (targetId !== null) {
      const table = contentType === "command" ? "commands" : "solutions";
      const existing = await env.DB.prepare(
        `SELECT id FROM ${table} WHERE id = ?1 AND active = 1`,
      ).bind(targetId).first();
      if (!existing) throw new HttpError(404, "Der zu ändernde Eintrag wurde nicht gefunden.");
    }

    const result = await env.DB.prepare(
      `INSERT INTO content_proposals
        (content_type, target_id, proposal_type, title, payload_json, reason,
         status, submitted_by, submitted_by_name, submitted_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'pending', ?7, ?8, CURRENT_TIMESTAMP)`,
    ).bind(
      contentType,
      targetId,
      targetId === null ? "create" : "update",
      title,
      JSON.stringify(payload),
      reason,
      user.id,
      user.displayName,
    ).run();

    const proposalId = Number(result.meta.last_row_id);
    await audit(env, user.id, "submit", "content_proposal", proposalId, { contentType });
    return json({ id: proposalId }, { status: 201 });
  }

  const reviewMatch = path.match(/^\/api\/content-proposals\/(\d+)\/(approve|reject|changes)$/);
  if (reviewMatch && request.method === "POST") {
    requireRole(user, ["editor", "admin"]);

    const proposalId = positiveInteger(reviewMatch[1], "Vorschlags-ID");
    const action = reviewMatch[2] as "approve" | "reject" | "changes";

    const body = await readJson<Record<string, unknown>>(request);
    const note = optionalString(body.note, 2000);

    const proposal = await env.DB.prepare(
      `SELECT id, content_type, target_id, proposal_type, title, payload_json,
              status, submitted_by, submitted_by_name
       FROM content_proposals WHERE id = ?1`,
    ).bind(proposalId).first<ContentProposalRow>();

    if (!proposal) throw new HttpError(404, "Vorschlag wurde nicht gefunden.");
    if (proposal.status !== "pending") {
      throw new HttpError(409, "Dieser Vorschlag wurde bereits bearbeitet.");
    }

    if (action === "approve") {
      const targetId = await applyContentProposal(env, user, proposal);

      await env.DB.prepare(
        `UPDATE content_proposals
         SET status = 'approved', reviewed_by = ?1, review_note = ?2,
             reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP,
             target_id = ?3
         WHERE id = ?4`,
      ).bind(user.id, note, targetId, proposalId).run();

      if (proposal.submitted_by !== null) {
        await notify(
          env,
          proposal.submitted_by,
          "proposal_approved",
          proposal.content_type === "command" ? "Befehl genehmigt" : "Lösung genehmigt",
          `Dein Vorschlag „${proposal.title}“ wurde genehmigt.`,
        );
      }
      await audit(env, user.id, "approve", "content_proposal", proposalId, { targetId });
      return json({ ok: true, targetId });
    }

    if (!note) {
      throw new HttpError(400, "Bitte einen Grund oder Änderungswunsch eintragen.");
    }

    const status = action === "reject" ? "rejected" : "changes_requested";
    await env.DB.prepare(
      `UPDATE content_proposals
       SET status = ?1, reviewed_by = ?2, review_note = ?3,
           reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?4`,
    ).bind(status, user.id, note, proposalId).run();

    if (proposal.submitted_by !== null) {
      await notify(
        env,
        proposal.submitted_by,
        status === "rejected" ? "proposal_rejected" : "changes_requested",
        status === "rejected" ? "Vorschlag abgelehnt" : "Überarbeitung angefordert",
        `„${proposal.title}“: ${note}`,
      );
    }
    await audit(env, user.id, action, "content_proposal", proposalId, { note });
    return json({ ok: true });
  }

  // Zurueckziehen des eigenen Vorschlags, solange er offen ist.
  const withdrawMatch = path.match(/^\/api\/content-proposals\/(\d+)$/);
  if (withdrawMatch && request.method === "DELETE") {
    const proposalId = positiveInteger(withdrawMatch[1], "Vorschlags-ID");

    const result = await env.DB.prepare(
      `UPDATE content_proposals
       SET status = 'withdrawn', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?1 AND submitted_by = ?2 AND status = 'pending'`,
    ).bind(proposalId, user.id).run();

    if ((result.meta.changes ?? 0) === 0) {
      throw new HttpError(404, "Offener eigener Vorschlag wurde nicht gefunden.");
    }

    await audit(env, user.id, "withdraw", "content_proposal", proposalId);
    return json({ ok: true });
  }

  return null;
}

/**
 * Uebertraegt einen genehmigten Vorschlag in den Bestand.
 *
 * Der Payload wird erneut geprueft: Zwischen Einreichen und Genehmigen koennen
 * Wochen liegen, und ein unvollstaendiger Datensatz wuerde sonst ungeprueft in
 * den Bestand wandern.
 */
async function applyContentProposal(
  env: Env,
  user: AuthUser,
  proposal: ContentProposalRow,
): Promise<number> {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(proposal.payload_json) as Record<string, unknown>;
  } catch {
    throw new HttpError(409, "Der Vorschlag enthält keine lesbaren Daten.");
  }

  if (proposal.content_type === "solution") {
    const payload = parseSolutionPayload(raw);

    if (proposal.proposal_type === "create") {
      // Urheberschaft bleibt beim Einreicher, die letzte Aenderung beim Pruefer.
      return insertSolution(
        env, payload, proposal.submitted_by, proposal.submitted_by_name, user,
      );
    }

    if (!proposal.target_id) throw new HttpError(409, "Ziel-Lösung fehlt.");
    const result = await env.DB.prepare(
      `UPDATE solutions
       SET category = ?1, title = ?2, symptom = ?3, cause = ?4, solution = ?5,
           severity = ?6, updated_by = ?7, updated_by_name = ?8,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?9 AND active = 1`,
    ).bind(
      payload.category, payload.title, payload.symptom, payload.cause,
      payload.solution, payload.severity, user.id, user.displayName, proposal.target_id,
    ).run();

    if ((result.meta.changes ?? 0) === 0) {
      throw new HttpError(404, "Die zu ändernde Lösung existiert nicht mehr.");
    }
    return proposal.target_id;
  }

  const payload = parseCommandPayload(raw);

  if (proposal.proposal_type === "create") {
    const duplicate = await env.DB.prepare(
      `SELECT id FROM commands
       WHERE active = 1 AND (lower(name) = lower(?1) OR command = ?2)
       LIMIT 1`,
    ).bind(payload.name, payload.command).first();

    if (duplicate) {
      throw new HttpError(409, "Inzwischen existiert bereits ein gleichnamiger Befehl.");
    }

    const result = await env.DB.prepare(
      `INSERT INTO commands
        (category, name, command, description, shell, requires_admin, risk_level,
         remote_capable, restart_required, created_by, created_by_name,
         updated_by, updated_by_name)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`,
    ).bind(
      payload.category, payload.name, payload.command, payload.description,
      payload.shell, payload.requiresAdmin, payload.riskLevel,
      payload.remoteCapable, payload.restartRequired,
      proposal.submitted_by, proposal.submitted_by_name,
      user.id, user.displayName,
    ).run();

    return Number(result.meta.last_row_id);
  }

  if (!proposal.target_id) throw new HttpError(409, "Ziel-Befehl fehlt.");
  const result = await env.DB.prepare(
    `UPDATE commands
     SET category = ?1, name = ?2, command = ?3, description = ?4, shell = ?5,
         requires_admin = ?6, risk_level = ?7, remote_capable = ?8,
         restart_required = ?9, updated_by = ?10, updated_by_name = ?11,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?12 AND active = 1`,
  ).bind(
    payload.category, payload.name, payload.command, payload.description,
    payload.shell, payload.requiresAdmin, payload.riskLevel,
    payload.remoteCapable, payload.restartRequired,
    user.id, user.displayName, proposal.target_id,
  ).run();

  if ((result.meta.changes ?? 0) === 0) {
    throw new HttpError(404, "Der zu ändernde Befehl existiert nicht mehr.");
  }
  return proposal.target_id;
}

/**
 * Inhaltliche Felder eines Befehls-Vorschlags.
 *
 * Wird beim Einreichen und erneut beim Genehmigen geprueft: zwischen beiden
 * Zeitpunkten koennen Wochen liegen, und die Datenbank kann den JSON-Inhalt
 * nicht selbst validieren.
 */
function parseCommandPayload(body: Record<string, unknown>) {
  return {
    category: requiredString(body.category, "Kategorie", 60),
    name: requiredString(body.name, "Name", 120),
    command: requiredString(body.command, "Befehl", 5000),
    description: requiredString(body.description, "Beschreibung", 2000),
    shell: oneOf(body.shell, SHELLS, "Ungültige Shell."),
    riskLevel: oneOf(body.riskLevel ?? "low", RISK_LEVELS, "Ungültige Risikostufe."),
    requiresAdmin: body.requiresAdmin ? 1 : 0,
    remoteCapable: body.remoteCapable ? 1 : 0,
    restartRequired: body.restartRequired ? 1 : 0,
  };
}

/** Inhaltliche Felder eines Loesungs-Vorschlags. */
function parseSolutionPayload(body: Record<string, unknown>) {
  return {
    category: requiredString(body.category, "Kategorie", 60),
    title: requiredString(body.title, "Titel", 160),
    symptom: requiredString(body.symptom, "Symptom", 2000),
    cause: optionalString(body.cause, 2000),
    solution: requiredString(body.solution, "Lösung", 20_000),
    severity: oneOf(body.severity ?? "medium", SEVERITIES, "Ungültige Dringlichkeit."),
  };
}

/** Loesungen fuer bekannte Probleme -- Aufbau analog zu den Befehlen. */
async function handleSolutions(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
  if (path === "/api/solutions" && request.method === "POST") {
    requireRole(user, ["editor", "admin"]);

    const body = await readJson<Record<string, unknown>>(request);
    const payload = parseSolutionPayload(body);

    const duplicate = await env.DB.prepare(
      "SELECT id FROM solutions WHERE active = 1 AND lower(title) = lower(?1) LIMIT 1",
    ).bind(payload.title).first();

    if (duplicate) throw new HttpError(409, "Eine Lösung mit diesem Titel existiert bereits.");

    const solutionId = await insertSolution(env, payload, user.id, user.displayName, user);
    await audit(env, user.id, "create", "solution", solutionId);
    return json({ id: solutionId }, { status: 201 });
  }

  const solutionMatch = path.match(/^\/api\/solutions\/(\d+)$/);
  if (solutionMatch && request.method === "PUT") {
    requireRole(user, ["editor", "admin"]);
    const solutionId = positiveInteger(solutionMatch[1], "Lösungs-ID");

    const body = await readJson<Record<string, unknown>>(request);
    const payload = parseSolutionPayload(body);

    const result = await env.DB.prepare(
      `UPDATE solutions
       SET category = ?1, title = ?2, symptom = ?3, cause = ?4, solution = ?5,
           severity = ?6, updated_by = ?7, updated_by_name = ?8,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?9 AND active = 1`,
    ).bind(
      payload.category, payload.title, payload.symptom, payload.cause,
      payload.solution, payload.severity, user.id, user.displayName, solutionId,
    ).run();

    if ((result.meta.changes ?? 0) === 0) {
      throw new HttpError(404, "Lösung wurde nicht gefunden.");
    }

    await audit(env, user.id, "update", "solution", solutionId);
    return json({ ok: true });
  }

  if (solutionMatch && request.method === "DELETE") {
    requireRole(user, ["admin"]);
    const solutionId = positiveInteger(solutionMatch[1], "Lösungs-ID");

    const result = await env.DB.prepare(
      `UPDATE solutions
       SET active = 0, updated_by = ?1, updated_by_name = ?2, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?3 AND active = 1`,
    ).bind(user.id, user.displayName, solutionId).run();

    if ((result.meta.changes ?? 0) === 0) {
      throw new HttpError(404, "Lösung wurde nicht gefunden.");
    }

    await audit(env, user.id, "delete", "solution", solutionId);
    return json({ ok: true });
  }

  return null;
}

/** Legt eine Loesung an; Urheberschaft kann vom Pruefer abweichen. */
async function insertSolution(
  env: Env,
  payload: ReturnType<typeof parseSolutionPayload>,
  authorId: number | null,
  authorName: string,
  editor: AuthUser,
): Promise<number> {
  const result = await env.DB.prepare(
    `INSERT INTO solutions
      (category, title, symptom, cause, solution, severity,
       created_by, created_by_name, updated_by, updated_by_name)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
  ).bind(
    payload.category, payload.title, payload.symptom, payload.cause,
    payload.solution, payload.severity,
    authorId, authorName, editor.id, editor.displayName,
  ).run();

  return Number(result.meta.last_row_id);
}

async function handleFeedback(
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

async function handleUsers(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
  // Aenderungsprotokoll: Der Worker schreibt bei jeder Aktion einen Eintrag,
  // bisher gab es aber keine Moeglichkeit, ihn zu lesen. Nur fuer Admins, weil
  // dort steht, wer was wann getan hat.
  if (path === "/api/audit" && request.method === "GET") {
    requireRole(user, ["admin"]);

    const result = await env.DB.prepare(
      `SELECT a.id, a.action, a.entity_type, a.entity_id, a.details_json, a.created_at,
              COALESCE(u.display_name, ?1) AS user_name
       FROM audit_log a
       LEFT JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC, a.id DESC
       LIMIT 200`,
    ).bind(DELETED_USER_LABEL).all();

    return json({ entries: result.results });
  }

  if (path === "/api/users" && request.method === "GET") {
    requireRole(user, ["admin"]);
    const result = await env.DB.prepare(
      `SELECT id, username, display_name, role, active, created_at
       FROM users ORDER BY display_name COLLATE NOCASE`,
    ).all();
    return json({ users: result.results });
  }

  if (path === "/api/users" && request.method === "POST") {
    requireRole(user, ["admin"]);
    const body = await readJson<Record<string, unknown>>(request);
    const username = validUsername(body.username);
    const displayName = requiredString(body.displayName, "Anzeigename", 80);
    const password = validPassword(body.password);
    const role = oneOf(body.role ?? "employee", ROLES, "Ungültige Rolle.");

    const passwordData = await hashPassword(password);
    const result = await env.DB.prepare(
      `INSERT INTO users
        (username, display_name, password_hash, password_salt, password_iterations, role)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    )
      .bind(
        username,
        displayName,
        passwordData.hash,
        passwordData.salt,
        passwordData.iterations,
        role,
      )
      .run();

    const newUserId = Number(result.meta.last_row_id);
    await audit(env, user.id, "create", "user", newUserId, { role });
    return json({ id: newUserId }, { status: 201 });
  }

  const userMatch = path.match(/^\/api\/users\/(\d+)$/);

  if (userMatch && request.method === "PATCH") {
    requireRole(user, ["admin"]);
    const targetId = positiveInteger(userMatch[1], "Benutzer-ID");
    const body = await readJson<Record<string, unknown>>(request);
    const role = body.role ? oneOf(body.role, ROLES, "Ungültige Rolle.") : null;

    // Selbstaussperrung verhindern: Ein Admin darf sich weder selbst
    // deaktivieren noch sich die eigenen Adminrechte entziehen -- sonst waere
    // die Benutzerverwaltung unter Umstaenden fuer niemanden mehr erreichbar.
    if (targetId === user.id && body.active === false) {
      throw new HttpError(400, "Das eigene Konto kann nicht deaktiviert werden.");
    }
    if (targetId === user.id && role !== null && role !== "admin") {
      throw new HttpError(400, "Die eigene Administratorrolle kann nicht entzogen werden.");
    }

    await env.DB.prepare(
      `UPDATE users
       SET display_name = COALESCE(?1, display_name),
           role = COALESCE(?2, role),
           active = COALESCE(?3, active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?4`,
    )
      .bind(
        body.displayName ? requiredString(body.displayName, "Anzeigename", 80) : null,
        role,
        typeof body.active === "boolean" ? (body.active ? 1 : 0) : null,
        targetId,
      )
      .run();

    if (body.password) {
      const passwordData = await hashPassword(validPassword(body.password));
      await env.DB.prepare(
        `UPDATE users
         SET password_hash = ?1, password_salt = ?2, password_iterations = ?3,
             failed_login_count = 0, locked_until = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?4`,
      )
        .bind(
          passwordData.hash,
          passwordData.salt,
          passwordData.iterations,
          targetId,
        )
        .run();
      // Nach einem Passwortwechsel sind alle bestehenden Sitzungen ungueltig.
      await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?1").bind(targetId).run();
    }

    await audit(env, user.id, "update", "user", targetId);
    return json({ ok: true });
  }

  if (userMatch && request.method === "DELETE") {
    requireRole(user, ["admin"]);
    const targetId = positiveInteger(userMatch[1], "Benutzer-ID");

    if (targetId === user.id) {
      throw new HttpError(400, "Das eigene Konto kann nicht gelöscht werden.");
    }

    await detachUserReferences(env, targetId);

    const deleteResult = await env.DB.prepare("DELETE FROM users WHERE id = ?1")
      .bind(targetId).run();
    if (!deleteResult.meta.changes) {
      throw new HttpError(404, "Benutzer nicht gefunden.");
    }

    await audit(env, user.id, "delete", "user", targetId);
    return json({ ok: true });
  }

  return null;
}

/**
 * Loest alle Fremdschluessel auf einen Benutzer, damit das Konto geloescht
 * werden kann.
 *
 * Die Inhalte selbst bleiben erhalten: Der Anzeigename steht redundant in den
 * `*_by_name`-Spalten, sodass Vorlagen, Befehle und Beitraege weiterhin
 * zugeordnet werden koennen. Feedback und Vorschlaege sind optional, weil die
 * zugehoerigen Tabellen in aelteren Installationen fehlen koennen.
 */
async function detachUserReferences(env: Env, targetId: number): Promise<void> {
  const required = [
    "UPDATE templates SET created_by = NULL WHERE created_by = ?1",
    "UPDATE templates SET updated_by = NULL WHERE updated_by = ?1",
    "UPDATE commands SET created_by = NULL WHERE created_by = ?1",
    "UPDATE commands SET updated_by = NULL WHERE updated_by = ?1",
    "UPDATE template_versions SET changed_by = NULL WHERE changed_by = ?1",
    "UPDATE categories SET created_by = NULL WHERE created_by = ?1",
  ];

  const optional = [
    "UPDATE template_proposals SET submitted_by = NULL WHERE submitted_by = ?1",
    "UPDATE template_proposals SET reviewed_by = NULL WHERE reviewed_by = ?1",
    "UPDATE feedback_items SET submitted_by = NULL WHERE submitted_by = ?1",
    "UPDATE feedback_items SET reviewed_by = NULL WHERE reviewed_by = ?1",
  ];

  for (const sql of required) {
    await env.DB.prepare(sql).bind(targetId).run();
  }

  for (const sql of optional) {
    await ignoreMissingTable(() => env.DB.prepare(sql).bind(targetId).run());
  }
}

/** Versionshistorie und Papierkorb archivierter Vorlagen. */
async function handleHistory(
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

    await env.DB.batch([
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
       SET active = 1, updated_by = ?1, updated_by_name = ?2, updated_at = CURRENT_TIMESTAMP
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
const CASE_ENTRY_KINDS = ["template", "command", "solution", "note"] as const;

async function handleCases(
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
async function handleReminders(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
  if (path === "/api/reminders" && request.method === "GET") {
    const rows = await env.DB.prepare(
      `SELECT id, message, ticket_ref, due_at, done, notified_at
       FROM reminders WHERE user_id = ?1 AND done = 0
       ORDER BY due_at
       LIMIT 50`,
    ).bind(user.id).all();

    return json({ reminders: rows.results });
  }

  if (path === "/api/reminders" && request.method === "POST") {
    const body = await readJson<Record<string, unknown>>(request);
    const message = requiredString(body.message, "Text", 500);
    const ticketRef = optionalString(body.ticketRef, 60);
    const dueAt = requiredString(body.dueAt, "Zeitpunkt", 40);

    // Der Wert kommt aus einem datetime-local-Feld und ist damit
    // nutzerkontrolliert -- ohne Pruefung landete Unsinn in der Sortierung.
    if (Number.isNaN(Date.parse(dueAt))) {
      throw new HttpError(400, "Zeitpunkt ist ungültig.");
    }

    const result = await env.DB.prepare(
      `INSERT INTO reminders (user_id, message, ticket_ref, due_at)
       VALUES (?1, ?2, ?3, ?4)`,
    ).bind(user.id, message, ticketRef, new Date(dueAt).toISOString()).run();

    return json({ id: Number(result.meta.last_row_id) }, { status: 201 });
  }

  const reminderMatch = path.match(/^\/api\/reminders\/(\d+)$/);
  if (reminderMatch && request.method === "DELETE") {
    const reminderId = positiveInteger(reminderMatch[1], "Erinnerungs-ID");

    const result = await env.DB.prepare(
      "UPDATE reminders SET done = 1 WHERE id = ?1 AND user_id = ?2 AND done = 0",
    ).bind(reminderId, user.id).run();

    if ((result.meta.changes ?? 0) === 0) {
      throw new HttpError(404, "Erinnerung wurde nicht gefunden.");
    }
    return json({ ok: true });
  }

  return null;
}

/**
 * Stellt faellige Erinnerungen als Benachrichtigung zu.
 *
 * `notified_at` verhindert Doppelzustellung: Der Lauf greift nur Eintraege ab,
 * die noch nie zugestellt wurden.
 */
async function deliverDueReminders(env: Env): Promise<void> {
  const due = await env.DB.prepare(
    `SELECT id, user_id, message, ticket_ref
     FROM reminders
     WHERE done = 0 AND notified_at IS NULL AND due_at <= CURRENT_TIMESTAMP
     LIMIT 100`,
  ).all<{ id: number; user_id: number; message: string; ticket_ref: string | null }>();

  for (const reminder of due.results) {
    await notify(
      env,
      reminder.user_id,
      "reminder",
      "Erinnerung fällig",
      reminder.ticket_ref
        ? `${reminder.ticket_ref}: ${reminder.message}`
        : reminder.message,
    );

    await env.DB.prepare(
      "UPDATE reminders SET notified_at = CURRENT_TIMESTAMP WHERE id = ?1",
    ).bind(reminder.id).run();
  }
}

/* ============================================================
   Eskalation und Dienstuebergabe
   ============================================================ */
async function handleEscalation(
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

async function handleHandovers(
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

/* ============================================================
   Nutzung und Statistik
   ============================================================ */
async function handleUsage(
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
    const scope = oneOf(
      body.scope,
      ["templates", "commands", "solutions"] as const,
      "Ungültiger Bereich.",
    );

    await env.DB.prepare(
      "INSERT INTO search_misses (term, scope, user_id) VALUES (?1, ?2, ?3)",
    ).bind(term.toLowerCase(), scope, user.id).run();

    return json({ ok: true });
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
      env.DB.prepare(
        `SELECT term, scope, COUNT(*) AS treffer, MAX(created_at) AS zuletzt
         FROM search_misses
         WHERE created_at >= datetime('now', '-90 days')
         GROUP BY term, scope
         HAVING COUNT(*) > 1
         ORDER BY treffer DESC LIMIT 15`,
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

async function handleGame(
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

/** Abstand zwischen zwei Feed-Abrufen. */
const NEWS_REFRESH_MINUTES = 30;

/** Wie lange eingelesene Meldungen aufbewahrt werden. */
const NEWS_RETENTION_DAYS = 30;

/**
 * IT-Meldungen aus RSS-/Atom-Quellen.
 *
 * Die Feeds werden serverseitig geholt: Ein Abruf direkt aus dem Browser
 * scheitert an CORS, und so erfahren die Anbieter auch nichts ueber die
 * einzelnen Mitarbeiter. Die Ergebnisse liegen in D1, damit nicht jeder
 * Seitenaufruf jede Quelle neu anfragt.
 */
async function handleNews(
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
function validFeedUrl(value: unknown): string {
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
 * Der Worker hat keinen Cron-Trigger, deshalb laeuft das beim Abruf mit. Die
 * Quellen werden parallel geholt, damit die Wartezeit von der langsamsten
 * Quelle bestimmt wird und nicht von deren Summe.
 */
async function refreshNewsIfStale(env: Env, force: boolean): Promise<void> {
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
async function refreshSingleFeed(
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
async function purgeExpiredNews(env: Env): Promise<void> {
  await env.DB.prepare(
    `DELETE FROM news_items
     WHERE COALESCE(published_at, fetched_at) < datetime('now', ?1)`,
  ).bind(`-${NEWS_RETENTION_DAYS} days`).run();
}

/** Wie lange Chatnachrichten aufbewahrt werden, bevor sie entfernt werden. */
const CHAT_RETENTION_DAYS = 30;

/** Wie viele Nachrichten der Verlauf beim Laden hoechstens zurueckgibt. */
const CHAT_PAGE_SIZE = 100;

/**
 * Gemeinsamer Team-Chat -- ein einziger Raum fuer alle Rollen.
 *
 * Das Frontend fragt regelmaessig nach neuen Nachrichten. Damit dieses Polling
 * guenstig bleibt, kann es per `?after=<id>` nur den Zuwachs anfordern, statt
 * jedes Mal den kompletten Verlauf zu uebertragen.
 */
async function handleChat(
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
async function ensureChatTable(env: Env): Promise<void> {
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
 * Laeuft beim Abruf mit, weil der Worker keinen Cron-Trigger hat. Der Aufwand
 * faellt kaum ins Gewicht: Ohne abgelaufene Zeilen ist es ein Index-Scan, der
 * nichts loescht.
 */
async function purgeExpiredChatMessages(env: Env): Promise<void> {
  await env.DB.prepare(
    `DELETE FROM chat_messages
     WHERE created_at < datetime('now', ?1)`,
  ).bind(`-${CHAT_RETENTION_DAYS} days`).run();
}

/** Handler nach dem Login. Reihenfolge egal -- die Pfade ueberschneiden sich nicht. */
const AUTHENTICATED_HANDLERS = [
  handleBootstrap,
  handleSettings,
  handleProposals,
  handleCategories,
  handleTemplates,
  handleCommands,
  handleSolutions,
  handleContentProposals,
  handleCases,
  handleReminders,
  handleEscalation,
  handleHandovers,
  handleUsage,
  handleFeedback,
  handleUsers,
  handleHistory,
  handleGame,
  handleChat,
  handleNews,
];

async function handleApi(request: Request, env: Env): Promise<Response> {
  assertSameOrigin(request);
  const path = routePath(request);
  const user = await authenticate(request, env);

  // Login, Logout und Setup muessen ohne gueltige Sitzung erreichbar sein.
  const authResponse = await handleAuth(request, env, user, path);
  if (authResponse) return authResponse;

  const authenticatedUser = requireUser(user);

  for (const handler of AUTHENTICATED_HANDLERS) {
    const response = await handler(request, env, authenticatedUser, path);
    if (response) return response;
  }

  throw new HttpError(404, "API-Endpunkt nicht gefunden.");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = routePath(request);

    try {
      if (isApi(path)) return await handleApi(request, env);
      return await env.ASSETS.fetch(request);
    } catch (error) {
      return errorResponse(error);
    }
  },

  /**
   * Zeitgesteuerter Lauf (siehe `triggers.crons` in wrangler.jsonc).
   *
   * Holt die Nachrichtenquellen unabhaengig davon, ob jemand die Seite
   * benutzt. Ohne diesen Lauf wuerde nach einem Wochenende ohne Zugriff erst
   * der naechste Seitenaufruf die Meldungen nachladen.
   *
   * `force` bleibt aus: Der Lauf soll dieselbe Alterspruefung anwenden wie der
   * Seitenaufruf, damit ein zwischenzeitlicher Abruf nicht sofort wiederholt
   * wird. Da der Trigger im selben Takt wie NEWS_REFRESH_MINUTES laeuft, ist
   * praktisch immer etwas faellig.
   */
  async scheduled(_event: ScheduledController, env: Env): Promise<void> {
    try {
      await refreshNewsIfStale(env, false);
    } catch (error) {
      // Ein Fehler hier darf den Lauf nicht als fehlgeschlagen enden lassen --
      // die einzelnen Quellen behandeln ihre Fehler bereits selbst, und ein
      // erneuter Versuch folgt ohnehin in 30 Minuten.
      console.error("Zeitgesteuerter Feed-Abruf fehlgeschlagen:", error);
    }

    // Eigener Block: Schlaegt der Feed-Abruf fehl, sollen die Erinnerungen
    // trotzdem zugestellt werden -- und umgekehrt.
    try {
      await deliverDueReminders(env);
    } catch (error) {
      console.error("Zustellung faelliger Erinnerungen fehlgeschlagen:", error);
    }
  },
} satisfies ExportedHandler<Env>;
