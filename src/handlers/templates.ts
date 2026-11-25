import { requireRole } from "../auth";
import { commitMutation, expectPending, expectVersion, precondition } from "../mutations";
import { audit, notificationStatement } from "../db";
import { HttpError, json, readJson } from "../http";
import type { AuthUser, Env } from "../types";
import { optionalString, positiveInteger, requiredString, validColor } from "../validation";
import { MY_PROPOSALS_CONDITION, DUPLICATE_REJECT_THRESHOLD, ProposalRow, ensureTemplateUsageTable, findDuplicate, slugifyCategory, loadActiveTemplate, archiveTemplateVersion } from "../shared";

/**
 * Vorschlagsprozess: Mitarbeiter reichen Vorlagen ein, Redakteure und Admins
 * genehmigen, lehnen ab oder fordern Ueberarbeitung an.
 */
export async function handleProposals(
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
       WHERE ${isReviewer ? "p.status = 'pending'" : MY_PROPOSALS_CONDITION("p.")}
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
      baseVersion = positiveInteger(body.baseVersion, "Ausgangsversion");
      if (template.version !== baseVersion) throw new HttpError(409, "Die Vorlage wurde geändert. Bitte den aktuellen Stand neu öffnen.");
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

      await audit(env, user.id, "approve", "template_proposal", proposalId, { templateId });

      return json({ ok: true, templateId });
    }

    // Ablehnung und Ueberarbeitung muessen begruendet werden -- die Begruendung
    // ist der Text, den der Einreicher als Benachrichtigung erhaelt.
    if (!note) {
      throw new HttpError(400, "Bitte einen Grund oder Änderungswunsch eintragen.");
    }

    const status = action === "reject" ? "rejected" : "changes_requested";
    await commitMutation(env, [
      expectPending(env, "template_proposals", proposalId),
      env.DB.prepare(
      `UPDATE template_proposals
       SET status = ?1, reviewed_by = ?2, review_note = ?3,
           reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?4`,
    ).bind(status, user.id, note, proposalId),
      notificationStatement(env, proposal.submitted_by,
        status === "rejected" ? "proposal_rejected" : "changes_requested",
        status === "rejected" ? "Vorschlag abgelehnt" : "Überarbeitung angefordert",
        `„${proposal.title}“: ${note}`),
    ]);

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
export async function applyApprovedProposal(
  env: Env, user: AuthUser, proposal: ProposalRow, note: string | null,
): Promise<number> {
  const statements = [expectPending(env, "template_proposals", proposal.id)];
  if (proposal.proposed_category_name) {
    const slug = slugifyCategory(proposal.proposed_category_name);
    if (!slug) throw new HttpError(400, "Kategoriename ist ungültig.");
    statements.push(env.DB.prepare(
      `INSERT INTO categories (slug, name, color, created_by)
       SELECT ?1, ?2, ?3, ?4 WHERE NOT EXISTS
         (SELECT 1 FROM categories WHERE lower(name) = lower(?2))`,
    ).bind(slug, proposal.proposed_category_name, proposal.proposed_category_color ?? "#4a7cff", user.id));
  }
  const categoryId = proposal.proposed_category_name ? null : proposal.category_id;
  const categoryName = proposal.proposed_category_name;
  statements.push(precondition(env,
    "EXISTS (SELECT 1 FROM categories WHERE active = 1 AND (id = ?1 OR lower(name) = lower(?2)))",
    categoryId, categoryName,
  ));
  let insertionIndex = -1;
  if (proposal.proposal_type === "create") {
    insertionIndex = statements.length;
    statements.push(env.DB.prepare(
      `INSERT INTO templates
       (category_id, title, body, version, created_by, created_by_name, updated_by, updated_by_name)
       VALUES ((SELECT id FROM categories WHERE active = 1 AND (id = ?1 OR lower(name) = lower(?2))),
               ?3, ?4, 1, ?5, ?6, ?7, ?8)`,
    ).bind(categoryId, categoryName, proposal.title, proposal.body,
      proposal.submitted_by, proposal.submitted_by_name, user.id, user.displayName));
  } else {
    if (!proposal.template_id || !proposal.base_version) throw new HttpError(409, "Zielvorlage oder Ausgangsversion fehlt.");
    const current = await loadActiveTemplate(env, proposal.template_id);
    statements.push(
      expectVersion(env, "templates", current.id, proposal.base_version),
      archiveTemplateVersion(env, current, user, note),
      env.DB.prepare(
        `UPDATE templates SET category_id =
           (SELECT id FROM categories WHERE active = 1 AND (id = ?1 OR lower(name) = lower(?2))),
         title = ?3, body = ?4, version = version + 1,
         updated_by = ?5, updated_by_name = ?6, updated_at = CURRENT_TIMESTAMP WHERE id = ?7`,
      ).bind(categoryId, categoryName, proposal.title, proposal.body, user.id, user.displayName, current.id),
    );
  }
  // For creates this immediately follows the INSERT, within the same transaction.
  statements.push(env.DB.prepare(
    `UPDATE template_proposals SET status = 'approved', reviewed_by = ?1, review_note = ?2,
       reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP,
       template_id = ${insertionIndex >= 0 ? "last_insert_rowid()" : "template_id"} WHERE id = ?3`,
  ).bind(user.id, note, proposal.id));
  statements.push(notificationStatement(env, proposal.submitted_by, "proposal_approved",
    "Vorlage genehmigt", `Dein Vorschlag „${proposal.title}“ wurde genehmigt.`));
  const results = await commitMutation(env, statements);
  return insertionIndex >= 0 ? Number(results[insertionIndex]!.meta.last_row_id) : proposal.template_id!;
}

export async function handleCategories(
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
export async function handleTemplates(
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

    await commitMutation(env, [
      expectVersion(env, "templates", templateId, positiveInteger(body.version, "Version")),
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
  await commitMutation(env, [
    expectVersion(env, "templates", templateId, current.version),
    archiveTemplateVersion(env, current, user, "Vorlage archiviert"),
    env.DB.prepare(
      `UPDATE templates
       SET active = 0, version = version + 1, updated_by = ?1, updated_by_name = ?2, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?3`,
    ).bind(user.id, user.displayName, templateId),
  ]);

  await audit(env, user.id, "delete", "template", templateId);
  return json({ ok: true });
}
