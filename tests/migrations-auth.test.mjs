import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pbkdf2Sync } from 'node:crypto';
import { fixture } from './helpers.mjs';

test('migration 0006 preserves old proposal statuses, nullable submission dates and names', async () => {
  const f = await fixture({ migrateThrough: '0005' });
  try {
    const user = await f.user();
    for (const status of ['draft','pending','changes_requested','approved','rejected','withdrawn']) {
      await f.db.prepare(`INSERT INTO template_proposals
        (proposal_type,category_id,title,body,status,submitted_by,submitted_at)
        VALUES('create',1,?1,'Body',?1,?2,NULL)`).bind(status,user.id).run();
    }
    await f.migrate('0006_preserve_deleted_user_names.sql');
    const rows = (await f.db.prepare('SELECT status, submitted_at, submitted_by_name FROM template_proposals').all()).results;
    assert.equal(rows.length,6);
    assert.ok(rows.every(r=>r.submitted_at && r.submitted_by_name));
    assert.deepEqual((await f.db.prepare('PRAGMA foreign_key_check').all()).results,[]);
  } finally { await f.close(); }
});

test('migration 0019 upgrades a populated old schema without losing data or IDs', async () => {
  const f = await fixture({ migrateThrough:'0018', historicalStatuses: true });
  try {
    const user = await f.user();
    const row = await f.db.prepare(`INSERT INTO template_proposals
      (proposal_type,category_id,title,body,status,submitted_by,submitted_by_name,review_note)
      VALUES('create',1,'Keep title','Keep body','rejected',?1,'Keep author','Keep note')`).bind(user.id).run();
    const id = row.meta.last_row_id;
    const before = await f.db.prepare('SELECT * FROM template_proposals WHERE id=?1').bind(id).first();
    await f.db.prepare("INSERT INTO reminders(user_id,message,due_at) VALUES(?1,'Keep reminder','2026-09-09 10:00:00')").bind(user.id).run();
    await f.migrate('0019_workflow_integrity.sql');
    assert.deepEqual(await f.db.prepare('SELECT * FROM template_proposals WHERE id=?1').bind(id).first(), before);
    await f.db.prepare("UPDATE template_proposals SET status='changes_requested' WHERE id=?1").bind(id).run();
    assert.equal((await f.db.prepare('SELECT due_at FROM reminders').first()).due_at,'2026-09-09T10:00:00.000Z');
    assert.deepEqual((await f.db.prepare('PRAGMA foreign_key_check').all()).results,[]);
  } finally { await f.close(); }
});

test('password migration preserves the actual hash parameters', async () => {
  const f = await fixture({ migrateThrough:'0009' });
  try {
    const salt=Buffer.from('test salt').toString('base64');
    const hash=pbkdf2Sync('old test password',Buffer.from(salt,'base64'),210000,32,'sha256').toString('base64');
    await f.db.prepare(`INSERT INTO users(username,display_name,password_hash,password_salt,password_iterations,role)
      VALUES('legacy','Legacy',?1,?2,210000,'employee')`).bind(hash,salt).run();
    await f.migrate('0010_cap_pbkdf2_iterations.sql');
    const row=await f.db.prepare("SELECT password_hash,password_iterations FROM users WHERE username='legacy'").first();
    assert.equal(row.password_hash,hash); assert.equal(row.password_iterations,210000);
  } finally { await f.close(); }
});

test('legacy accounts get explicit recovery guidance; reset restores login and revokes old sessions', async () => {
  const f=await fixture();
  try {
    const admin=await f.user(); const user=await f.user('employee');
    await f.db.prepare('UPDATE users SET password_iterations=210000 WHERE id=?1').bind(user.id).run();
    const name=(await f.db.prepare('SELECT username FROM users WHERE id=?1').bind(user.id).first()).username;
    const login=await f.request(null,'/api/auth/login','POST',{username:name,password:'old test password'});
    assert.equal(login.status,403); assert.match(login.body.error,/Passworterneuerung/);
    const list=await f.request(admin,'/api/users');
    assert.equal(list.body.users.find(u=>u.id===user.id).password_reset_required,1);
    const reset=await f.request(admin,`/api/users/${user.id}`,'PATCH',{password:'new secure test password'});
    assert.equal(reset.status,200);
    assert.equal((await f.request(user,'/api/bootstrap')).status,401);
    const fresh=await f.request(null,'/api/auth/login','POST',{username:name,password:'new secure test password'});
    assert.equal(fresh.status,200,JSON.stringify(fresh.body));
    assert.match(fresh.headers.get('set-cookie'),/HttpOnly/);
    assert.equal((await f.db.prepare('SELECT password_iterations FROM users WHERE id=?1').bind(user.id).first()).password_iterations,100000);
    assert.equal((await f.request(null,'/api/auth/login','POST',{username:name,password:'wrong test password'})).status,401);
  } finally { await f.close(); }
});

test('invalid password update cannot partially change profile fields', async () => {
  const f=await fixture();
  try {
    const admin=await f.user(); const user=await f.user('employee');
    const before=await f.db.prepare('SELECT display_name FROM users WHERE id=?1').bind(user.id).first();
    assert.equal((await f.request(admin,`/api/users/${user.id}`,'PATCH',{displayName:'Should not change',password:'short'})).status,400);
    assert.deepEqual(await f.db.prepare('SELECT display_name FROM users WHERE id=?1').bind(user.id).first(),before);
  } finally { await f.close(); }
});
