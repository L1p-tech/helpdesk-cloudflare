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
 * Da /api/bootstrap bei jedem Seitenaufruf laeuft, ist der Normalfall "alles
 * schon vorhanden" der wichtige: Dann kostet die Funktion nur eine einzige
 * Zaehlabfrage und bricht ab. Erst wenn tatsaechlich etwas fehlt, werden die
 * Inserts ausgefuehrt -- und zwar gebuendelt per batch(), nicht als ~70
 * einzelne Roundtrips.
 *
 * @param seedAdmin Wird beim Setup uebergeben, weil der frisch angelegte Admin
 *   zu diesem Zeitpunkt noch nicht per Query gefunden werden muss. Fehlt der
 *   Parameter, wird der aelteste Admin verwendet; gibt es keinen, passiert nichts.
 */
export async function ensureDefaultLibrary(
  env: Env,
  seedAdmin?: SeedAdmin,
): Promise<void> {
  if (await isLibraryComplete(env)) return;

  const admin = seedAdmin ?? await findOldestAdmin(env);
  if (!admin) return;

  // Kategorien zuerst und separat: Die Vorlagen-Inserts referenzieren sie ueber
  // den Slug und faenden sie sonst im selben Batch noch nicht vor.
  await env.DB.batch(
    DEFAULT_CATEGORY_SEEDS.map((category) => env.DB.prepare(
      `INSERT INTO categories (slug, name, color, created_by)
       SELECT ?1, ?2, ?3, ?4
       WHERE NOT EXISTS (
         SELECT 1 FROM categories WHERE slug = ?1 OR lower(name) = lower(?2)
       )`,
    ).bind(category.slug, category.name, category.color, admin.id)),
  );

  // Endgueltig geloeschte Standardvorlagen bleiben geloescht.
  const purgedTitles = await findPurgedTemplateTitles(env);
  const templateSeeds = DEFAULT_TEMPLATE_SEEDS.filter(
    (template) => !purgedTitles.has(template.title.toLowerCase()),
  );

  // Vorlagen werden ueber den Titel abgeglichen, Befehle ueber den Befehlstext:
  // Das sind jeweils die Felder, die eine Dublette fachlich ausmachen.
  await env.DB.batch([
    ...templateSeeds.map((template) => env.DB.prepare(
      `INSERT INTO templates
        (category_id, title, body, version, created_by, created_by_name, updated_by, updated_by_name)
       SELECT c.id, ?2, ?3, 1, ?4, ?5, ?4, ?5
       FROM categories c
       WHERE c.slug = ?1
       AND NOT EXISTS (SELECT 1 FROM templates WHERE lower(title) = lower(?2))`,
    ).bind(template.categorySlug, template.title, template.body, admin.id, admin.displayName)),

    ...DEFAULT_COMMAND_SEEDS.map((command) => env.DB.prepare(
      `INSERT INTO commands
        (category, name, command, description, shell, requires_admin, risk_level,
         remote_capable, restart_required, created_by, created_by_name, updated_by, updated_by_name)
       SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?10, ?11
       WHERE NOT EXISTS (SELECT 1 FROM commands WHERE command = ?3)`,
    ).bind(
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
    )),
  ]);
}

/**
 * Schnelle Vorabpruefung, ob die Standardbibliothek bereits vollstaendig ist.
 *
 * Verglichen wird nur die Anzahl: Sind mindestens so viele Kategorien, Vorlagen
 * und Befehle vorhanden wie im Seed definiert, ist nichts mehr nachzutragen.
 * Das ist bewusst grob -- geloeschte Standardvorlagen werden nicht neu
 * eingespielt, was auch gewuenscht ist: Ein Admin, der eine Vorlage archiviert,
 * will sie nicht beim naechsten Seitenaufruf zurueckbekommen.
 *
 * Archivierte Eintraege zaehlen mit (kein active-Filter), damit genau das gilt.
 */
/**
 * Titel aller Vorlagen, die ein Admin endgueltig aus dem Papierkorb geloescht
 * hat -- kleingeschrieben, passend zum Titelabgleich des Seeds.
 *
 * Ohne diese Sperrliste wuerde der Seed eine geloeschte Standardvorlage beim
 * naechsten Bootstrap wieder anlegen: Das NOT EXISTS greift nur, solange die
 * Zeile noch existiert. Archivierte Vorlagen brauchen das nicht, die bleiben
 * als Zeile erhalten.
 *
 * Quelle ist das Aenderungsprotokoll, das den Titel beim Loeschen mitschreibt
 * -- so kommt die Information ohne zusaetzliche Tabelle zustande.
 */
async function findPurgedTemplateTitles(env: Env): Promise<Set<string>> {
  const result = await env.DB.prepare(
    `SELECT DISTINCT lower(json_extract(details_json, '$.title')) AS title
     FROM audit_log
     WHERE action = 'purge' AND entity_type = 'template'
       AND json_extract(details_json, '$.title') IS NOT NULL`,
  ).all<{ title: string }>();

  return new Set(result.results.map((row) => row.title));
}

async function isLibraryComplete(env: Env): Promise<boolean> {
  const counts = await env.DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM categories) AS categories,
       (SELECT COUNT(*) FROM templates) AS templates,
       (SELECT COUNT(*) FROM commands) AS commands,
       (SELECT COUNT(DISTINCT lower(json_extract(details_json, '$.title')))
        FROM audit_log
        WHERE action = 'purge' AND entity_type = 'template'
          AND json_extract(details_json, '$.title') IS NOT NULL) AS purged`,
  ).first<{
    categories: number;
    templates: number;
    commands: number;
    purged: number;
  }>();

  if (!counts) return false;

  // Endgueltig geloeschte Vorlagen senken das Soll: Sonst gaebe es nach jedem
  // Loeschen bei jedem Seitenaufruf einen vergeblichen Seed-Durchlauf.
  const expectedTemplates = Math.max(
    0,
    DEFAULT_TEMPLATE_SEEDS.length - counts.purged,
  );

  return counts.categories >= DEFAULT_CATEGORY_SEEDS.length
    && counts.templates >= expectedTemplates
    && counts.commands >= DEFAULT_COMMAND_SEEDS.length;
}

async function findOldestAdmin(env: Env): Promise<SeedAdmin | null> {
  const row = await env.DB.prepare(
    "SELECT id, display_name FROM users WHERE role = 'admin' ORDER BY id LIMIT 1",
  ).first<{ id: number; display_name: string }>();

  return row ? { id: row.id, displayName: row.display_name } : null;
}
