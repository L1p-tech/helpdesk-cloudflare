import { HttpError } from "./http";
import type { Env } from "./types";

/** SQL comes only from the application; values must always be bound. */
export function precondition(env: Env, condition: string, ...values: (string | number | null)[]): D1PreparedStatement {
  const statement = env.DB.prepare(
    `INSERT INTO mutation_guards (valid) SELECT CASE WHEN (${condition}) THEN 1 ELSE 0 END`,
  );
  return values.length ? statement.bind(...values) : statement;
}

/** Checks and writes share one D1 transaction. A failed check rolls everything back. */
export async function commitMutation(env: Env, statements: D1PreparedStatement[]): Promise<D1Result[]> {
  try {
    const results = await env.DB.batch([
      ...statements,
      env.DB.prepare("DELETE FROM mutation_guards"),
    ]);
    return results.slice(0, -1);
  } catch (error) {
    if (error instanceof Error && error.message.includes("mutation_precondition")) {
      throw new HttpError(409, "Der Eintrag wurde zwischenzeitlich geändert oder bereits bearbeitet. Bitte neu laden und erneut prüfen.");
    }
    throw error;
  }
}

export function expectVersion(env: Env, table: "templates" | "commands" | "solutions", id: number, version: number, activeOnly = true): D1PreparedStatement {
  return precondition(env,
    `EXISTS (SELECT 1 FROM ${table} WHERE id = ?1 AND version = ?2${activeOnly ? " AND active = 1" : ""})`,
    id, version,
  );
}

export function expectPending(env: Env, table: "template_proposals" | "content_proposals", id: number): D1PreparedStatement {
  return precondition(env, `EXISTS (SELECT 1 FROM ${table} WHERE id = ?1 AND status = 'pending')`, id);
}
