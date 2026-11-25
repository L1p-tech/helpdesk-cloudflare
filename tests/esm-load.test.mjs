import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';

test('public/app.js loads as native ES modules: no module evaluates before what it needs', async () => {
  const html = await readFile('public/index.html', 'utf8');
  const { window } = new JSDOM(html, { url: 'https://test.invalid/', pretendToBeVisual: true });
  window.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (_, key) => key === 'measureText' ? () => ({ width: 0 }) : () => ({ addColorStop() {} }) });
  window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  window.scrollTo = () => {};
  const requests = [];
  window.fetch = async path => { requests.push(path); return new Response(JSON.stringify({ user: null, reminders: [] })); };
  const names = ['window', 'document', 'localStorage', 'sessionStorage', 'location', 'history', 'navigator', 'HTMLElement', 'Event', 'KeyboardEvent', 'MouseEvent', 'Node', 'CustomEvent', 'getComputedStyle', 'matchMedia', 'requestAnimationFrame', 'cancelAnimationFrame', 'IntersectionObserver'];
  window.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  const saved = new Map();
  for (const name of names) {
    saved.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    const value = name === 'window' ? window : window[name];
    if (value !== undefined) Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  }
  Object.defineProperty(globalThis, 'fetch', { value: window.fetch, configurable: true, writable: true });
  try {
    await import(pathToFileURL(process.cwd() + '/public/app.js').href);
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.ok(requests.includes('/api/auth/me'));
    assert.ok(!document.querySelector('#login-view').classList.contains('hidden'));
    assert.ok(document.querySelector('#diag-type').options.length > 0);
    assert.ok(document.querySelector('#diag-checklist').children.length > 0);
  } finally {
    window.close();
  }
});

test('every module in public/ is reachable from app.js, so none silently never runs', async () => {
  const seen = new Set();
  const visit = async file => {
    if (seen.has(file)) return;
    seen.add(file);
    const source = await readFile('public/' + file, 'utf8');
    for (const match of source.matchAll(/(?:import|export)[^;]*?from\s+"\.\/([^"]+)"|import\s+"\.\/([^"]+)"/g)) await visit(match[1] || match[2]);
  };
  await visit('app.js');
  const all = (await readdir('public')).filter(file => file.endsWith('.js'));
  assert.deepEqual(all.filter(file => !seen.has(file)), []);
});
