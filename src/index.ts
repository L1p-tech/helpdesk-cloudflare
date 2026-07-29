import {
  authenticate,
  clearSessionCookie,
  login,
  logout,
  requireRole,
  requireUser,
} from "./auth";
import { hashPassword } from "./crypto";
import { duplicateScore } from "./duplicates";
import {
  assertSameOrigin,
  errorResponse,
  HttpError,
  json,
  readJson,
} from "./http";
import type { AuthUser, Env, Role } from "./types";
import {
  optionalString,
  positiveInteger,
  requiredString,
  validColor,
  validPassword,
  validUsername,
} from "./validation";

interface TemplateCandidate {
  id: number;
  title: string;
  body: string;
}

interface ProposalRow {
  id: number;
  template_id: number | null;
  base_version: number | null;
  proposal_type: "create" | "update";
  category_id: number;
  title: string;
  body: string;
  status: string;
  submitted_by: number;
}

function routePath(request: Request): string {
  return new URL(request.url).pathname.replace(/\/+$/, "") || "/";
}

function isApi(path: string): boolean {
  return path === "/api" || path.startsWith("/api/");
}

async function audit(
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

async function notify(
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

async function createInitialAdmin(request: Request, env: Env): Promise<Response> {
  const token = request.headers.get("x-setup-token");
  if (!env.ADMIN_SETUP_TOKEN || token !== env.ADMIN_SETUP_TOKEN) {
    throw new HttpError(403, "Ungültiger Setup-Token.");
  }

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

  await audit(env, Number(result.meta.last_row_id), "setup_admin", "user", Number(result.meta.last_row_id));
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

async function handleBootstrap(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
  if (path !== "/api/bootstrap" || request.method !== "GET") return null;

  const [categories, templates, commands, settings, notifications] = await Promise.all([
    env.DB.prepare(
      "SELECT id, slug, name, color FROM categories WHERE active = 1 ORDER BY name COLLATE NOCASE",
    ).all(),
    env.DB.prepare(
      `SELECT t.id, t.title, t.body, t.version, t.updated_at,
              c.id AS category_id, c.name AS category_name, c.color AS category_color,
              u.display_name AS updated_by_name
       FROM templates t
       JOIN categories c ON c.id = t.category_id
       JOIN users u ON u.id = t.updated_by
       WHERE t.active = 1
       ORDER BY t.updated_at DESC`,
    ).all(),
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

async function handleProposals(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
  if (path === "/api/proposals" && request.method === "GET") {
    const adminView = user.role === "admin" || user.role === "editor";
    const result = await env.DB.prepare(
      `SELECT p.*, c.name AS category_name, c.color AS category_color,
              u.display_name AS submitted_by_name,
              d.title AS duplicate_title
       FROM template_proposals p
       JOIN categories c ON c.id = p.category_id
       JOIN users u ON u.id = p.submitted_by
       LEFT JOIN templates d ON d.id = p.duplicate_template_id
       WHERE ${adminView ? "p.status = 'pending'" : "p.submitted_by = ?1"}
       ORDER BY p.updated_at DESC`,
    );

    const rows = adminView
      ? await result.all()
      : await result.bind(user.id).all();

    return json({ proposals: rows.results });
  }

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
    const categoryId = positiveInteger(body.categoryId, "Kategorie");
    const reason = optionalString(body.reason, 1000);
    const templateId = body.templateId ? positiveInteger(body.templateId, "Vorlagen-ID") : null;

    let proposalType: "create" | "update" = "create";
    let baseVersion: number | null = null;

    if (templateId !== null) {
      const template = await env.DB.prepare(
        "SELECT version FROM templates WHERE id = ?1 AND active = 1",
      ).bind(templateId).first<{ version: number }>();
      if (!template) throw new HttpError(404, "Vorlage wurde nicht gefunden.");
      proposalType = "update";
      baseVersion = template.version;
    }

    const duplicate = await findDuplicate(env, title, templateBody, templateId);
    if (duplicate.score >= 0.98) {
      throw new HttpError(409, "Eine nahezu identische Vorlage existiert bereits.", {
        duplicate,
      });
    }

    const result = await env.DB.prepare(
      `INSERT INTO template_proposals
        (template_id, base_version, proposal_type, category_id, title, body,
         reason, status, duplicate_score, duplicate_template_id, submitted_by,
         submitted_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'pending', ?8, ?9, ?10, CURRENT_TIMESTAMP)`,
    )
      .bind(
        templateId,
        baseVersion,
        proposalType,
        categoryId,
        title,
        templateBody,
        reason,
        duplicate.score,
        duplicate.templateId,
        user.id,
      )
      .run();

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
    const actionValue = reviewMatch[2];

    if (
      actionValue !== "approve" &&
      actionValue !== "reject" &&
      actionValue !== "changes"
    ) {
      throw new HttpError(400, "Ungültige Freigabeaktion.");
    }

    const action = actionValue;
    const body = await readJson<Record<string, unknown>>(request);
    const note = optionalString(body.note, 2000);

    const proposal = await env.DB.prepare(
      `SELECT id, template_id, base_version, proposal_type, category_id, title,
              body, status, submitted_by
       FROM template_proposals WHERE id = ?1`,
    ).bind(proposalId).first<ProposalRow>();

    if (!proposal) throw new HttpError(404, "Vorschlag wurde nicht gefunden.");
    if (proposal.status !== "pending") {
      throw new HttpError(409, "Dieser Vorschlag wurde bereits bearbeitet.");
    }

    if (action === "approve") {
      let templateId: number;
      if (proposal.proposal_type === "create") {
        const result = await env.DB.prepare(
          `INSERT INTO templates
            (category_id, title, body, version, created_by, updated_by)
           VALUES (?1, ?2, ?3, 1, ?4, ?5)`,
        )
          .bind(
            proposal.category_id,
            proposal.title,
            proposal.body,
            proposal.submitted_by,
            user.id,
          )
          .run();
        templateId = Number(result.meta.last_row_id);
      } else {
        if (!proposal.template_id) throw new HttpError(409, "Zielvorlage fehlt.");

        const current = await env.DB.prepare(
          "SELECT version FROM templates WHERE id = ?1 AND active = 1",
        ).bind(proposal.template_id).first<{ version: number }>();

        if (!current) throw new HttpError(404, "Zielvorlage wurde nicht gefunden.");
        if (current.version !== proposal.base_version) {
          throw new HttpError(
            409,
            "Die Vorlage wurde zwischenzeitlich geändert. Vorschlag bitte erneut prüfen.",
          );
        }

        await env.DB.prepare(
          `INSERT INTO template_versions
            (template_id, version, category_id, title, body, changed_by, change_note)
           SELECT id, version, category_id, title, body, ?2, ?3
           FROM templates WHERE id = ?1`,
        ).bind(proposal.template_id, user.id, note).run();

        await env.DB.prepare(
          `UPDATE templates
           SET category_id = ?1, title = ?2, body = ?3, version = version + 1,
               updated_by = ?4, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?5`,
        )
          .bind(
            proposal.category_id,
            proposal.title,
            proposal.body,
            user.id,
            proposal.template_id,
          )
          .run();

        templateId = proposal.template_id;
      }

      await env.DB.prepare(
        `UPDATE template_proposals
         SET status = 'approved', reviewed_by = ?1, review_note = ?2,
             reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP,
             template_id = ?3
         WHERE id = ?4`,
      ).bind(user.id, note, templateId, proposalId).run();

      await notify(
        env,
        proposal.submitted_by,
        "proposal_approved",
        "Vorlage genehmigt",
        `Dein Vorschlag „${proposal.title}“ wurde genehmigt.`,
      );
      await audit(env, user.id, "approve", "template_proposal", proposalId, { templateId });

      return json({ ok: true, templateId });
    }

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

    await notify(
      env,
      proposal.submitted_by,
      status === "rejected" ? "proposal_rejected" : "changes_requested",
      status === "rejected" ? "Vorlage abgelehnt" : "Überarbeitung angefordert",
      `„${proposal.title}“: ${note}`,
    );
    await audit(env, user.id, action, "template_proposal", proposalId, { note });

    return json({ ok: true });
  }

  return null;
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
  const slug = name
    .toLocaleLowerCase("de")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  if (!slug) throw new HttpError(400, "Kategoriename ist ungültig.");

  const result = await env.DB.prepare(
    `INSERT INTO categories (slug, name, color, created_by)
     VALUES (?1, ?2, ?3, ?4)`,
  ).bind(slug, name, color, user.id).run();

  await audit(env, user.id, "create", "category", Number(result.meta.last_row_id));
  return json({ id: Number(result.meta.last_row_id) }, { status: 201 });
}

async function handleCommands(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
  if (path !== "/api/commands" || request.method !== "POST") return null;
  requireRole(user, ["editor", "admin"]);

  const body = await readJson<Record<string, unknown>>(request);
  const category = requiredString(body.category, "Kategorie", 60);
  const name = requiredString(body.name, "Name", 120);
  const command = requiredString(body.command, "Befehl", 5000);
  const description = requiredString(body.description, "Beschreibung", 2000);
  const shell = requiredString(body.shell, "Shell", 20);
  const riskLevel = requiredString(body.riskLevel ?? "low", "Risiko", 20);

  if (!["cmd", "powershell", "windows"].includes(shell)) {
    throw new HttpError(400, "Ungültige Shell.");
  }
  if (!["low", "medium", "high"].includes(riskLevel)) {
    throw new HttpError(400, "Ungültige Risikostufe.");
  }

  const duplicate = await env.DB.prepare(
    `SELECT id FROM commands
     WHERE active = 1 AND (lower(name) = lower(?1) OR command = ?2)
     LIMIT 1`,
  ).bind(name, command).first();

  if (duplicate) throw new HttpError(409, "Befehl oder Bezeichnung existiert bereits.");

  const result = await env.DB.prepare(
    `INSERT INTO commands
      (category, name, command, description, shell, requires_admin, risk_level,
       remote_capable, restart_required, created_by, updated_by)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)`,
  )
    .bind(
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
    )
    .run();

  await audit(env, user.id, "create", "command", Number(result.meta.last_row_id));
  return json({ id: Number(result.meta.last_row_id) }, { status: 201 });
}

async function handleUsers(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
): Promise<Response | null> {
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
    const role = requiredString(body.role ?? "employee", "Rolle", 20) as Role;

    if (!["employee", "editor", "admin"].includes(role)) {
      throw new HttpError(400, "Ungültige Rolle.");
    }

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

    await audit(env, user.id, "create", "user", Number(result.meta.last_row_id), { role });
    return json({ id: Number(result.meta.last_row_id) }, { status: 201 });
  }

  const userMatch = path.match(/^\/api\/users\/(\d+)$/);
  if (userMatch && request.method === "PATCH") {
    requireRole(user, ["admin"]);
    const targetId = positiveInteger(userMatch[1], "Benutzer-ID");
    const body = await readJson<Record<string, unknown>>(request);
    const role = body.role ? requiredString(body.role, "Rolle", 20) as Role : null;

    if (role && !["employee", "editor", "admin"].includes(role)) {
      throw new HttpError(400, "Ungültige Rolle.");
    }

    if (targetId === user.id && body.active === false) {
      throw new HttpError(400, "Das eigene Konto kann nicht deaktiviert werden.");
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
      await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?1").bind(targetId).run();
    }

    await audit(env, user.id, "update", "user", targetId);
    return json({ ok: true });
  }

  return null;
}


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
                u.display_name AS changed_by_name
         FROM template_versions v
         JOIN users u ON u.id = v.changed_by
         ORDER BY v.created_at DESC
         LIMIT 100`,
      ).all(),
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
    ).bind(versionId).first<{
      id: number;
      template_id: number;
      version: number;
      category_id: number;
      title: string;
      body: string;
    }>();

    if (!version) throw new HttpError(404, "Version wurde nicht gefunden.");

    const current = await env.DB.prepare(
      `SELECT id, version, category_id, title, body
       FROM templates WHERE id = ?1`,
    ).bind(version.template_id).first<{
      id: number;
      version: number;
      category_id: number;
      title: string;
      body: string;
    }>();

    if (!current) throw new HttpError(404, "Zielvorlage wurde nicht gefunden.");

    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO template_versions
          (template_id, version, category_id, title, body, changed_by, change_note)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
      ).bind(
        current.id,
        current.version,
        current.category_id,
        current.title,
        current.body,
        user.id,
        `Automatische Sicherung vor Wiederherstellung von Version ${version.version}`,
      ),
      env.DB.prepare(
        `UPDATE templates
         SET category_id = ?1, title = ?2, body = ?3, version = version + 1,
             active = 1, updated_by = ?4, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?5`,
      ).bind(
        version.category_id,
        version.title,
        version.body,
        user.id,
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
       SET active = 1, updated_by = ?1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?2 AND active = 0`,
    ).bind(user.id, templateId).run();

    if ((result.meta.changes ?? 0) === 0) {
      throw new HttpError(404, "Archivierte Vorlage wurde nicht gefunden.");
    }

    await audit(env, user.id, "restore", "template", templateId);
    return json({ ok: true });
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
      `SELECT u.display_name, MAX(g.score) AS score, MAX(g.created_at) AS achieved_at
       FROM game_scores g
       JOIN users u ON u.id = g.user_id
       GROUP BY g.user_id, u.display_name
       ORDER BY score DESC, achieved_at ASC
       LIMIT 20`,
    ).all();
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

    const maximumPlausibleScore = Math.floor(durationMs / 25) + 250;
    if (score > maximumPlausibleScore) {
      throw new HttpError(400, "Punktestand konnte nicht plausibilisiert werden.");
    }

    await env.DB.prepare(
      "INSERT INTO game_scores (user_id, score, duration_ms) VALUES (?1, ?2, ?3)",
    ).bind(user.id, score, durationMs).run();

    return json({ ok: true }, { status: 201 });
  }

  return null;
}

async function handleApi(request: Request, env: Env): Promise<Response> {
  assertSameOrigin(request);
  const path = routePath(request);
  const user = await authenticate(request, env);

  const authResponse = await handleAuth(request, env, user, path);
  if (authResponse) return authResponse;

  const authenticatedUser = requireUser(user);

  const handlers = [
    handleBootstrap,
    handleSettings,
    handleProposals,
    handleCategories,
    handleCommands,
    handleUsers,
    handleHistory,
    handleGame,
  ];

  for (const handler of handlers) {
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
