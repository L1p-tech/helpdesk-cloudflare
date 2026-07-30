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

  const [categories, templates, commands, settings, notifications] = await Promise.all([
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
    // Pruefer sehen alle offenen Vorschlaege, Mitarbeiter nur ihre eigenen.
    const isReviewer = user.role === "admin" || user.role === "editor";
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

/** Handler nach dem Login. Reihenfolge egal -- die Pfade ueberschneiden sich nicht. */
const AUTHENTICATED_HANDLERS = [
  handleBootstrap,
  handleSettings,
  handleProposals,
  handleCategories,
  handleTemplates,
  handleCommands,
  handleFeedback,
  handleUsers,
  handleHistory,
  handleGame,
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
} satisfies ExportedHandler<Env>;
