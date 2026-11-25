import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import { fixture } from './helpers.mjs';

const settle = () => new Promise(resolve => setImmediate(resolve));
async function until(condition) {
  for (let i = 0; i < 200; i++) {
    if (condition()) return;
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  assert.fail('condition not reached in time');
}
const html = await readFile('public/index.html', 'utf8');
const compiled = await build({
  stdin: { contents: 'import "./app.js";\nimport { state } from "./base.js";\nimport { openProposal } from "./proposals.js";\nimport { switchView, VIEW_ROUTES } from "./router.js";\nglobalThis.__app={state,openProposal,switchView,VIEW_ROUTES};', resolveDir: process.cwd() + '/public' },
  bundle: true, format: 'iife', write: false,
});

async function openApp(f) {
  const dom = new JSDOM(html, { url: 'https://test.invalid/', runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  window.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (_, key) => key === 'measureText' ? () => ({ width: 0 }) : () => ({ addColorStop() {} }) });
  window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  window.HTMLDialogElement.prototype.close = function () { if (!this.hasAttribute('open')) return; this.removeAttribute('open'); this.dispatchEvent(new window.Event('close')); };
  window.alert = () => {};
  window.scrollTo = () => {};
  let cookie = '';
  const ui = { window, doc: window.document, pending: 0 };
  window.fetch = async (path, options = {}) => {
    ui.pending++;
    const response = await f.mf.dispatchFetch('https://test.invalid' + path, {
      ...options, headers: { ...(options.headers || {}), ...(cookie ? { cookie } : {}) },
    });
    const set = response.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    ui.pending--;
    return response;
  };
  globalThis.document = window.document;
  window.eval(compiled.outputFiles[0].text);
  await settle();
  ui.app = window.__app;
  return ui;
}

async function closeApp(ui) {
  for (let quiet = 0; quiet < 4; quiet++) {
    await new Promise(resolve => setTimeout(resolve, 50));
    if (ui.pending > 0) quiet = -1;
  }
  ui.window.close();
}

async function employeeWithPassword(f, password, role = 'employee') {
  const admin = await f.user();
  const employee = await f.user(role);
  const reset = await f.request(admin, `/api/users/${employee.id}`, 'PATCH', { password });
  assert.equal(reset.status, 200);
  const row = await f.db.prepare('SELECT username FROM users WHERE id=?1').bind(employee.id).first();
  return { username: row.username, id: employee.id };
}

async function submitLogin(ui, username, password, done) {
  ui.doc.querySelector('#login-username').value = username;
  ui.doc.querySelector('#login-password').value = password;
  ui.doc.querySelector('#login-form').dispatchEvent(new ui.window.Event('submit', { bubbles: true, cancelable: true }));
  await until(done);
}

test('login form: wrong password shows the error, correct login opens the app without admin controls', async () => {
  const f = await fixture();
  let ui;
  try {
    const { username } = await employeeWithPassword(f, 'correct test password');
    ui = await openApp(f);
    assert.ok(!ui.doc.querySelector('#login-view').classList.contains('hidden'));

    await submitLogin(ui, username, 'wrong test password', () => ui.doc.querySelector('#login-message').textContent !== '');
    assert.match(ui.doc.querySelector('#login-message').textContent, /falsch/);
    assert.ok(!ui.doc.querySelector('#login-view').classList.contains('hidden'));
    assert.ok(ui.doc.querySelector('#app-view').classList.contains('hidden'));

    await submitLogin(ui, username, 'correct test password', () => ui.app.state.user && ui.app.state.categories?.length >= 0 && ui.doc.querySelector('#login-view').classList.contains('hidden'));
    assert.ok(ui.doc.querySelector('#login-view').classList.contains('hidden'));
    assert.ok(!ui.doc.querySelector('#app-view').classList.contains('hidden'));
    assert.equal(ui.doc.querySelector('#login-message').textContent, '');
    assert.equal(ui.app.state.user.role, 'employee');
    const restricted = [...ui.doc.querySelectorAll("[data-role='admin'], [data-role='reviewer']")];
    assert.ok(restricted.length > 0);
    assert.ok(restricted.every(element => element.classList.contains('hidden')));
  } finally { if (ui) await closeApp(ui); await f.close(); }
});

test('employee submits a template proposal through the form and it lands as pending', async () => {
  const f = await fixture();
  let ui;
  try {
    const { username, id } = await employeeWithPassword(f, 'correct test password');
    await f.db.prepare("INSERT INTO categories (slug,name) VALUES ('ui-test','UI Test')").run();
    ui = await openApp(f);
    await submitLogin(ui, username, 'correct test password', () => ui.app.state.user && ui.app.state.categories.length > 0);

    ui.app.openProposal();
    assert.ok(ui.doc.querySelector('#proposal-dialog').hasAttribute('open'));
    ui.doc.querySelector('#proposal-title').value = 'Drucker offline';
    ui.doc.querySelector('#proposal-body').value = 'Bitte den Druckerspooler neu starten und erneut testen.';
    ui.doc.querySelector('#proposal-reason').value = 'Haeufiger Fall';
    ui.doc.querySelector('#proposal-form').dispatchEvent(new ui.window.Event('submit', { bubbles: true, cancelable: true }));
    await until(() => !ui.doc.querySelector('#proposal-dialog').hasAttribute('open'));

    const row = await f.db.prepare('SELECT title, status, submitted_by FROM template_proposals').first();
    assert.equal(row.title, 'Drucker offline');
    assert.equal(row.status, 'pending');
    assert.equal(row.submitted_by, id);
    assert.ok(!ui.doc.querySelector('#proposal-dialog').hasAttribute('open'));
  } finally { if (ui) await closeApp(ui); await f.close(); }
});

test('every view opens for an admin without errors', async () => {
  const f = await fixture();
  const errors = [];
  const onRejection = reason => errors.push(String(reason?.stack || reason));
  process.on('unhandledRejection', onRejection);
  let ui;
  try {
    const { username } = await employeeWithPassword(f, 'correct test password', 'admin');
    ui = await openApp(f);
    ui.window.addEventListener('error', event => errors.push(String(event.error?.stack || event.message)));
    await submitLogin(ui, username, 'correct test password', () => ui.app.state.user && ui.doc.querySelector('#login-view').classList.contains('hidden'));
    const views = Object.keys(ui.app.VIEW_ROUTES);
    assert.ok(views.length >= 15, 'found ' + views.length + ' views');
    for (const view of views) {
      await ui.app.switchView(view);
      await new Promise(resolve => setTimeout(resolve, 60));
    }
    assert.deepEqual(errors, []);
  } finally {
    process.off('unhandledRejection', onRejection);
    if (ui) await closeApp(ui);
    await f.close();
  }
});
