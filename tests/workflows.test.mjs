import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './helpers.mjs';
let f, admin, employee;
before(async () => { f = await fixture(); admin = await f.user(); employee = await f.user('employee'); });
after(async () => { await f?.close(); });
let sequence = 0;
const templatePayload = () => ({ title: 'Testvorlage ' + (++sequence), body: 'Eindeutiger Testtext ' + sequence, categoryId: 1 });
async function proposal(payload = templatePayload()) {
  const result = await f.request(employee, '/api/proposals', 'POST', payload);
  assert.equal(result.status, 201, JSON.stringify(result.body));
  return result.body.id;
}
async function publishedTemplate() {
  const id = await proposal();
  const result = await f.request(admin, `/api/proposals/${id}/approve`, 'POST', {});
  assert.equal(result.status, 200, JSON.stringify(result.body));
  return result.body.templateId;
}

test('bootstrap, roles and foreign keys remain valid', async () => {
  assert.equal((await f.request(admin, '/api/bootstrap')).status, 200);
  assert.equal((await f.request(employee, '/api/users')).status, 403);
  assert.equal((await f.request(null, '/api/bootstrap')).status, 401);
  assert.deepEqual((await f.db.prepare('PRAGMA foreign_key_check').all()).results, []);
});
test('changes requested is saved and the submitter receives a notification', async () => {
  const id = await proposal();
  const result = await f.request(admin, `/api/proposals/${id}/changes`, 'POST', { note: 'Bitte ergänzen' });
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal((await f.db.prepare('SELECT status FROM template_proposals WHERE id=?1').bind(id).first()).status, 'changes_requested');
  const inbox = await f.request(employee, '/api/notifications');
  assert.ok(inbox.body.notifications.some(n => n.message.includes('Bitte ergänzen')));
});
test('two simultaneous approvals publish only once', async () => {
  const payload = templatePayload(); const id = await proposal(payload);
  const results = await Promise.all([1,2].map(() => f.request(admin, `/api/proposals/${id}/approve`, 'POST', {})));
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
  assert.equal((await f.db.prepare('SELECT COUNT(*) AS n FROM templates WHERE title=?1').bind(payload.title).first()).n, 1);
});
test('failed approval rolls back category creation and proposal status', async () => {
  const id = await proposal({ ...templatePayload(), categoryMode: 'new', proposedCategoryName: 'Transactional Category', proposedCategoryColor: '#123456' });
  // Force a database failure after the new category has been staged.
  await f.db.exec("CREATE TRIGGER test_publication_failure BEFORE INSERT ON templates BEGIN SELECT RAISE(ABORT, 'test failure'); END;");
  try { assert.equal((await f.request(admin, `/api/proposals/${id}/approve`, 'POST', {})).status, 500); }
  finally { await f.db.exec('DROP TRIGGER test_publication_failure;'); }
  assert.equal((await f.db.prepare("SELECT COUNT(*) AS n FROM categories WHERE name='Transactional Category'").first()).n, 0);
  assert.equal((await f.db.prepare('SELECT status FROM template_proposals WHERE id=?1').bind(id).first()).status, 'pending');
});
test('stale direct edits and stale submissions are rejected without altering history', async () => {
  const id = await publishedTemplate();
  const edit = { title: 'New content', body: 'Current text', categoryId: 1, version: 1 };
  assert.equal((await f.request(admin, `/api/templates/${id}`, 'PUT', edit)).status, 200);
  assert.equal((await f.request(admin, `/api/templates/${id}`, 'PUT', { ...edit, body: 'Stale text' })).status, 409);
  assert.equal((await f.request(employee, '/api/proposals', 'POST', { ...templatePayload(), templateId: id, baseVersion: 1 })).status, 409);
  assert.equal((await f.db.prepare('SELECT body FROM templates WHERE id=?1').bind(id).first()).body, 'Current text');
  assert.equal((await f.db.prepare('SELECT COUNT(*) AS n FROM template_versions WHERE template_id=?1').bind(id).first()).n, 1);
});
test('two concurrent edits do not overwrite each other', async () => {
  const id = await publishedTemplate();
  const results = await Promise.all(['A','B'].map(body => f.request(admin, `/api/templates/${id}`, 'PUT', { title: 'Concurrent', body, categoryId: 1, version: 1 })));
  assert.deepEqual(results.map(r=>r.status).sort(), [200,409]);
});
test('stale update proposal cannot overwrite a newer template', async () => {
  const tid = await publishedTemplate();
  const pid = await proposal({ ...templatePayload(), templateId: tid, baseVersion: 1 });
  assert.equal((await f.request(admin, `/api/templates/${tid}`, 'PUT', { title: 'Changed', body: 'New version', categoryId: 1, version: 1 })).status, 200);
  assert.equal((await f.request(admin, `/api/proposals/${pid}/approve`, 'POST', {})).status, 409);
  assert.equal((await f.db.prepare('SELECT status FROM template_proposals WHERE id=?1').bind(pid).first()).status, 'pending');
});
const solutionPayload = () => ({ contentType: 'solution', category: 'Test', title: 'Lösung ' + (++sequence), symptom: 'Test', cause: null, solution: 'Prüfen', severity: 'low' });
test('solution approvals are atomic and solution edits require the original version', async () => {
  const payload = solutionPayload();
  const p = await f.request(employee, '/api/content-proposals', 'POST', payload);
  assert.equal(p.status, 201, JSON.stringify(p.body));
  const results = await Promise.all([1,2].map(()=>f.request(admin, `/api/content-proposals/${p.body.id}/approve`, 'POST', {})));
  assert.deepEqual(results.map(r=>r.status).sort(), [200,409]);
  const id = results.find(r=>r.status===200).body.targetId;
  assert.equal((await f.request(admin, `/api/solutions/${id}`, 'PUT', { ...payload, version: 1 })).status, 200);
  assert.equal((await f.request(admin, `/api/solutions/${id}`, 'PUT', { ...payload, version: 1 })).status, 409);
});
test('due reminders are delivered today and only once, even with concurrent polling', async () => {
  const dueAt = new Date(Date.now() - 60_000).toISOString();
  const r = await f.request(employee, '/api/reminders', 'POST', { message: 'Due now', dueAt });
  assert.equal(r.status, 201);
  await Promise.all([1,2,3].map(()=>f.request(employee, '/api/notifications')));
  assert.equal((await f.db.prepare('SELECT COUNT(*) AS n FROM notifications WHERE reminder_id=?1').bind(r.body.id).first()).n, 1);
  assert.ok((await f.db.prepare('SELECT notified_at FROM reminders WHERE id=?1').bind(r.body.id).first()).notified_at);
});
test('reminders require timezone and preserve explicit offsets', async () => {
  assert.equal((await f.request(employee, '/api/reminders', 'POST', { message: 'Invalid', dueAt: '2026-09-09T12:00' })).status, 400);
  const r = await f.request(employee, '/api/reminders', 'POST', { message: 'Offset', dueAt: '2099-09-09T12:00:00+02:00' });
  assert.equal(r.status, 201);
  assert.equal((await f.db.prepare('SELECT due_at FROM reminders WHERE id=?1').bind(r.body.id).first()).due_at, '2099-09-09T10:00:00.000Z');
  await f.request(employee, '/api/notifications');
  assert.equal((await f.db.prepare('SELECT notified_at FROM reminders WHERE id=?1').bind(r.body.id).first()).notified_at, null);
});
test('notification read action is scoped to owner and preserves newer notifications', async () => {
  const other = await f.user('employee');
  const r = await f.db.prepare("INSERT INTO notifications(user_id,type,title,message) VALUES(?1,'test','Private','Text')").bind(other.id).run();
  const id = r.meta.last_row_id;
  assert.equal((await f.request(employee, '/api/notifications/read', 'POST', { ids: [id] })).status, 200);
  assert.equal((await f.db.prepare('SELECT read_at FROM notifications WHERE id=?1').bind(id).first()).read_at, null);
  assert.equal((await f.request(other, '/api/notifications/read', 'POST', { ids: [id] })).status, 200);
  assert.ok((await f.db.prepare('SELECT read_at FROM notifications WHERE id=?1').bind(id).first()).read_at);
});
test('transaction guard table remains empty', async () => {
  assert.equal((await f.db.prepare('SELECT COUNT(*) AS n FROM mutation_guards').first()).n, 0);
  assert.deepEqual((await f.db.prepare('PRAGMA foreign_key_check').all()).results, []);
});

test('approval and rejection racing leave one consistent final state', async () => {
  const id=await proposal();
  const results=await Promise.all([
    f.request(admin,`/api/proposals/${id}/approve`,'POST',{}),
    f.request(admin,`/api/proposals/${id}/reject`,'POST',{note:'Nicht übernehmen'}),
  ]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  const row=await f.db.prepare('SELECT status,template_id FROM template_proposals WHERE id=?1').bind(id).first();
  assert.equal(Boolean(row.template_id),row.status==='approved');
});
test('command update proposals carry a base version; a second stale proposal cannot overwrite', async () => {
  const payload={contentType:'command',category:'Test',name:'Command '+(++sequence),command:'test-command-'+sequence,description:'Description',shell:'cmd'};
  const created=await f.request(admin,'/api/commands','POST',payload);
  assert.equal(created.status,201);
  const proposals=[];
  for(const name of ['Command edit A','Command edit B']) {
    const r=await f.request(employee,'/api/content-proposals','POST',{...payload,name,targetId:created.body.id,baseVersion:1});
    assert.equal(r.status,201,JSON.stringify(r.body));proposals.push(r.body.id);
  }
  assert.equal((await f.request(admin,`/api/content-proposals/${proposals[0]}/approve`,'POST',{})).status,200);
  assert.equal((await f.request(admin,`/api/content-proposals/${proposals[1]}/approve`,'POST',{})).status,409);
  const command=await f.db.prepare('SELECT name,version FROM commands WHERE id=?1').bind(created.body.id).first();
  assert.equal(command.name,'Command edit A');assert.equal(command.version,2);
});
test('archive, restore and subsequent edit use distinct history versions', async () => {
  const id=await publishedTemplate();
  assert.equal((await f.request(admin,`/api/templates/${id}`,'DELETE')).status,200);
  assert.equal((await f.request(admin,`/api/history/template/${id}/restore`,'POST',{})).status,200);
  assert.equal((await f.request(admin,`/api/templates/${id}`,'PUT',{title:'After restore',body:'Restored edit',categoryId:1,version:3})).status,200);
  const versions=(await f.db.prepare('SELECT version FROM template_versions WHERE template_id=?1 ORDER BY version').bind(id).all()).results.map(r=>r.version);
  assert.deepEqual(versions,[1,3]);
});
test('failed reminder notification does not mark it delivered', async () => {
  const r=await f.request(employee,'/api/reminders','POST',{message:'Retry delivery',dueAt:new Date(Date.now()-1000).toISOString()});
  await f.db.exec("CREATE TRIGGER test_notification_failure BEFORE INSERT ON notifications BEGIN SELECT RAISE(ABORT, 'test reminder failure'); END;");
  try { assert.equal((await f.request(employee,'/api/notifications')).status,500); }
  finally { await f.db.exec('DROP TRIGGER test_notification_failure;'); }
  assert.equal((await f.db.prepare('SELECT notified_at FROM reminders WHERE id=?1').bind(r.body.id).first()).notified_at,null);
  assert.equal((await f.request(employee,'/api/notifications')).status,200);
  assert.ok((await f.db.prepare('SELECT notified_at FROM reminders WHERE id=?1').bind(r.body.id).first()).notified_at);
});
