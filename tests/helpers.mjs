import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

export async function fixture({ migrateThrough = '9999', historicalStatuses = false } = {}) {
  const compiled = await build({ entryPoints: ['src/index.ts'], bundle: true, format: 'esm', write: false });
  const mf = new Miniflare({ modules: true, script: compiled.outputFiles[0].text,
    compatibilityDate: '2026-07-29', d1Databases: ['DB'],
    bindings: { ADMIN_SETUP_TOKEN: 'test-setup-only', SESSION_TTL_HOURS: '12' },
  });
  const db = await mf.getD1Database('DB');
  const files = (await readdir('migrations')).filter(f => f.endsWith('.sql')).sort();
  async function migrate(file) {
    let sql = await readFile('migrations/' + file, 'utf8');
    if (historicalStatuses && file.startsWith('0006')) sql = sql.replace(
      "('draft', 'pending', 'changes_requested', 'approved', 'rejected', 'withdrawn')",
      "('pending', 'approved', 'rejected')");
    await db.batch(unstable_splitSqlQuery(sql).map(statement => db.prepare(statement)));
  }
  try { for (const file of files.filter(f => f.slice(0, 4) <= migrateThrough)) {
    try { await migrate(file); } catch (e) { throw new Error('Migration ' + file + ': ' + e.message, {cause:e}); }
  } } catch (e) { await mf.dispose(); throw e; }
  let userSequence = 0;
  async function user(role = 'admin') {
    const name = 'test-user-' + (++userSequence);
    const result = await db.prepare(`INSERT INTO users
      (username,display_name,password_hash,password_salt,password_iterations,role)
      VALUES(?1,?1,'unused','eA==',100000,?2)`).bind(name, role).run();
    const id = Number(result.meta.last_row_id);
    const token = 'test-token-' + id;
    await db.prepare(`INSERT INTO sessions(user_id,token_hash,expires_at)
      VALUES(?1,?2,datetime('now','+1 day'))`).bind(id, createHash('sha256').update(token).digest('base64')).run();
    return { id, token };
  }
  async function request(user, path, method = 'GET', body) {
    const response = await mf.dispatchFetch('https://test.invalid' + path, {
      method, headers: { 'content-type': 'application/json', ...(user ? { cookie: 'helpdesk_session=' + user.token } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json(), headers: response.headers };
  }
  return { mf, db, files, migrate, user, request, close: () => mf.dispose() };
}
