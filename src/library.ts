import {
  DEFAULT_CATEGORY_SEEDS,
  DEFAULT_COMMAND_SEEDS,
  DEFAULT_TEMPLATE_SEEDS,
} from "./seed-data";
import type { Env } from "./types";

/** Admin, dem die eingespielten Standardinhalte zugeschrieben werden. */
export interface SeedAdmin {
  id: number;
  displayName: string;
}

/**
 * Spielt die Standardbibliothek ein, sofern die jeweiligen Eintraege noch
 * fehlen. Der Aufruf ist idempotent: Jedes INSERT ist ueber ein NOT EXISTS
 * abgesichert, bestehende Kategorien, Vorlagen und Befehle bleiben unangetastet.
 *
 * Warum das im Worker passiert und nicht nur in den Migrationen: Die Seed-
 * Migrationen haengen alle an einem vorhandenen Admin. Beim ersten `wrangler d1
 * migrations apply` ist die Benutzertabelle aber noch leer, die Inserts laufen
 * dort also ins Leere. Deshalb wird hier nachgezogen -- einmal direkt nach dem
 * Anlegen des ersten Admins und danach bei jedem /api/bootstrap.
 *
 * @param seedAdmin Wird beim Setup uebergeben, weil der frisch angelegte Admin
 *   zu diesem Zeitpunkt noch nicht per Query gefunden werden muss. Fehlt der
 *   Parameter, wird der aelteste Admin verwendet; gibt es keinen, passiert nichts.
 */
export async function ensureDefaultLibrary(
  env: Env,
  seedAdmin?: SeedAdmin,
): Promise<void> {
  const admin = seedAdmin ?? await findOldestAdmin(env);
  if (!admin) return;

  for (const category of DEFAULT_CATEGORY_SEEDS) {
    await env.DB.prepare(
      `INSERT INTO categories (slug, name, color, created_by)
       SELECT ?1, ?2, ?3, ?4
       WHERE NOT EXISTS (
         SELECT 1 FROM categories WHERE slug = ?1 OR lower(name) = lower(?2)
       )`,
    ).bind(category.slug, category.name, category.color, admin.id).run();
  }

  // Vorlagen werden ueber den Titel abgeglichen, Befehle ueber den Befehlstext:
  // Das sind jeweils die Felder, die eine Dublette fachlich ausmachen.
  for (const template of DEFAULT_TEMPLATE_SEEDS) {
    await env.DB.prepare(
      `INSERT INTO templates
        (category_id, title, body, version, created_by, created_by_name, updated_by, updated_by_name)
       SELECT c.id, ?2, ?3, 1, ?4, ?5, ?4, ?5
       FROM categories c
       WHERE c.slug = ?1
       AND NOT EXISTS (SELECT 1 FROM templates WHERE lower(title) = lower(?2))`,
    )
      .bind(template.categorySlug, template.title, template.body, admin.id, admin.displayName)
      .run();
  }

  for (const command of DEFAULT_COMMAND_SEEDS) {
    await env.DB.prepare(
      `INSERT INTO commands
        (category, name, command, description, shell, requires_admin, risk_level,
         remote_capable, restart_required, created_by, created_by_name, updated_by, updated_by_name)
       SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?10, ?11
       WHERE NOT EXISTS (SELECT 1 FROM commands WHERE command = ?3)`,
    )
      .bind(
        command.category,
        command.name,
        command.command,
        command.description,
        command.shell,
        command.requiresAdmin,
        command.riskLevel,
        command.remoteCapable,
        command.restartRequired,
        admin.id,
        admin.displayName,
      )
      .run();
  }
}

async function findOldestAdmin(env: Env): Promise<SeedAdmin | null> {
  const row = await env.DB.prepare(
    "SELECT id, display_name FROM users WHERE role = 'admin' ORDER BY id LIMIT 1",
  ).first<{ id: number; display_name: string }>();

  return row ? { id: row.id, displayName: row.display_name } : null;
}
