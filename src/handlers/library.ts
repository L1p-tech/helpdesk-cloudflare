import { requireRole } from "../auth";
import { commitMutation, expectPending, expectVersion, precondition } from "../mutations";
import { audit, notificationStatement } from "../db";
import { HttpError, json, readJson } from "../http";
import type { AuthUser, Env } from "../types";
import { optionalString, positiveInteger, requiredString } from "../validation";
import { MY_PROPOSALS_CONDITION, SHELLS, RISK_LEVELS, SEVERITIES, CONTENT_TYPES, ContentProposalRow, oneOf } from "../shared";

export async function handleCommands(
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
export async function handleContentProposals(
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
      `SELECT id, content_type, target_id, base_version, proposal_type, title, payload_json,
              reason, status, submitted_by, submitted_by_name, review_note,
              submitted_at, reviewed_at
       FROM content_proposals
       WHERE ${isReviewer ? "status = 'pending'" : MY_PROPOSALS_CONDITION("")}
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
    let baseVersion: number | null = null;
    if (targetId !== null) {
      baseVersion = positiveInteger(body.baseVersion, "Ausgangsversion");
      const table = contentType === "command" ? "commands" : "solutions";
      const existing = await env.DB.prepare(
        `SELECT id, version FROM ${table} WHERE id = ?1 AND active = 1`,
      ).bind(targetId).first<{ id: number; version: number }>();
      if (!existing) throw new HttpError(404, "Der zu ändernde Eintrag wurde nicht gefunden.");
      if (existing.version !== baseVersion) throw new HttpError(409, "Der Eintrag wurde geändert. Bitte den aktuellen Stand neu öffnen.");
    }

    const result = await env.DB.prepare(
      `INSERT INTO content_proposals
        (content_type, target_id, base_version, proposal_type, title, payload_json, reason,
         status, submitted_by, submitted_by_name, submitted_at)
       VALUES (?1, ?2, ?9, ?3, ?4, ?5, ?6, 'pending', ?7, ?8, CURRENT_TIMESTAMP)`,
    ).bind(
      contentType,
      targetId,
      targetId === null ? "create" : "update",
      title,
      JSON.stringify(payload),
      reason,
      user.id,
      user.displayName,
      baseVersion,
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
      `SELECT id, content_type, target_id, base_version, proposal_type, title, payload_json,
              status, submitted_by, submitted_by_name
       FROM content_proposals WHERE id = ?1`,
    ).bind(proposalId).first<ContentProposalRow>();

    if (!proposal) throw new HttpError(404, "Vorschlag wurde nicht gefunden.");
    if (proposal.status !== "pending") {
      throw new HttpError(409, "Dieser Vorschlag wurde bereits bearbeitet.");
    }

    if (action === "approve") {
      const targetId = await applyContentProposal(env, user, proposal, note);

      await audit(env, user.id, "approve", "content_proposal", proposalId, { targetId });
      return json({ ok: true, targetId });
    }

    if (!note) {
      throw new HttpError(400, "Bitte einen Grund oder Änderungswunsch eintragen.");
    }

    const status = action === "reject" ? "rejected" : "changes_requested";
    await commitMutation(env, [
      expectPending(env, "content_proposals", proposalId),
      env.DB.prepare(
      `UPDATE content_proposals
       SET status = ?1, reviewed_by = ?2, review_note = ?3,
           reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?4`,
    ).bind(status, user.id, note, proposalId),
      notificationStatement(env, proposal.submitted_by,
        status === "rejected" ? "proposal_rejected" : "changes_requested",
        status === "rejected" ? "Vorschlag abgelehnt" : "Überarbeitung angefordert",
        `„${proposal.title}“: ${note}`),
    ]);

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
export async function applyContentProposal(
  env: Env, user: AuthUser, proposal: ContentProposalRow, note: string | null,
): Promise<number> {
  const raw: Record<string, unknown> = JSON.parse(proposal.payload_json);
  const statements = [expectPending(env, "content_proposals", proposal.id)];
  const create = proposal.proposal_type === "create";
  const table = proposal.content_type === "command" ? "commands" : "solutions";
  if (!create) {
    if (!proposal.target_id || !proposal.base_version) {
      throw new HttpError(409, "Die Ausgangsversion fehlt. Bitte den Vorschlag anhand des aktuellen Eintrags neu einreichen.");
    }
    statements.push(expectVersion(env, table, proposal.target_id, proposal.base_version));
  }
  if (proposal.content_type === "solution") {
    const p = parseSolutionPayload(raw);
    if (create) {
      statements.push(precondition(env, "NOT EXISTS (SELECT 1 FROM solutions WHERE active = 1 AND lower(title) = lower(?1))", p.title));
      statements.push(solutionInsert(env, p, proposal.submitted_by, proposal.submitted_by_name, user));
    } else {
      statements.push(env.DB.prepare(
        `UPDATE solutions SET category = ?1, title = ?2, symptom = ?3, cause = ?4,
         solution = ?5, severity = ?6, updated_by = ?7, updated_by_name = ?8,
         updated_at = CURRENT_TIMESTAMP, version = version + 1 WHERE id = ?9`,
      ).bind(p.category, p.title, p.symptom, p.cause, p.solution, p.severity, user.id, user.displayName, proposal.target_id));
    }
  } else {
    const p = parseCommandPayload(raw);
    statements.push(precondition(env,
      "NOT EXISTS (SELECT 1 FROM commands WHERE active = 1 AND (lower(name) = lower(?1) OR command = ?2) AND (?3 IS NULL OR id != ?3))",
      p.name, p.command, proposal.target_id,
    ));
    statements.push(create ? env.DB.prepare(
      `INSERT INTO commands (category, name, command, description, shell, requires_admin, risk_level,
       remote_capable, restart_required, created_by, created_by_name, updated_by, updated_by_name)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`,
    ).bind(p.category, p.name, p.command, p.description, p.shell, p.requiresAdmin, p.riskLevel,
      p.remoteCapable, p.restartRequired, proposal.submitted_by, proposal.submitted_by_name, user.id, user.displayName)
    : env.DB.prepare(
      `UPDATE commands SET category = ?1, name = ?2, command = ?3, description = ?4, shell = ?5,
       requires_admin = ?6, risk_level = ?7, remote_capable = ?8, restart_required = ?9,
       updated_by = ?10, updated_by_name = ?11, updated_at = CURRENT_TIMESTAMP, version = version + 1 WHERE id = ?12`,
    ).bind(p.category, p.name, p.command, p.description, p.shell, p.requiresAdmin, p.riskLevel,
      p.remoteCapable, p.restartRequired, user.id, user.displayName, proposal.target_id));
  }
  const writeIndex = statements.length - 1;
  statements.push(env.DB.prepare(
    `UPDATE content_proposals SET status = 'approved', reviewed_by = ?1, review_note = ?2,
     reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP,
     target_id = ${create ? "last_insert_rowid()" : "target_id"} WHERE id = ?3`,
  ).bind(user.id, note, proposal.id));
  statements.push(notificationStatement(env, proposal.submitted_by, "proposal_approved",
    "Vorschlag genehmigt", `Dein Vorschlag „${proposal.title}“ wurde genehmigt.`));
  const results = await commitMutation(env, statements);
  return create ? Number(results[writeIndex]!.meta.last_row_id) : proposal.target_id!;
}

/**
 * Inhaltliche Felder eines Befehls-Vorschlags.
 *
 * Wird beim Einreichen und erneut beim Genehmigen geprueft: zwischen beiden
 * Zeitpunkten koennen Wochen liegen, und die Datenbank kann den JSON-Inhalt
 * nicht selbst validieren.
 */
export function parseCommandPayload(body: Record<string, unknown>) {
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
export function parseSolutionPayload(body: Record<string, unknown>) {
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
export async function handleSolutions(
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

    await commitMutation(env, [
      expectVersion(env, "solutions", solutionId, positiveInteger(body.version, "Version")),
      env.DB.prepare(
      `UPDATE solutions
       SET category = ?1, title = ?2, symptom = ?3, cause = ?4, solution = ?5,
           severity = ?6, updated_by = ?7, updated_by_name = ?8,
           updated_at = CURRENT_TIMESTAMP, version = version + 1
       WHERE id = ?9 AND active = 1`,
    ).bind(
      payload.category, payload.title, payload.symptom, payload.cause,
      payload.solution, payload.severity, user.id, user.displayName, solutionId,
    ),
    ]);

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
export async function insertSolution(
  env: Env,
  payload: ReturnType<typeof parseSolutionPayload>,
  authorId: number | null,
  authorName: string,
  editor: AuthUser,
): Promise<number> {
  const result = await solutionInsert(env, payload, authorId, authorName, editor).run();
  return Number(result.meta.last_row_id);
}

export function solutionInsert(
  env: Env, payload: ReturnType<typeof parseSolutionPayload>, authorId: number | null,
  authorName: string, editor: AuthUser,
): D1PreparedStatement {
  return env.DB.prepare(
    `INSERT INTO solutions
      (category, title, symptom, cause, solution, severity,
       created_by, created_by_name, updated_by, updated_by_name)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
  ).bind(
    payload.category, payload.title, payload.symptom, payload.cause,
    payload.solution, payload.severity,
    authorId, authorName, editor.id, editor.displayName,
  );
}
