import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { createNotifications } from '../public/notifications.js';
const settle = () => new Promise(resolve => setImmediate(resolve));
const html = await readFile('public/index.html','utf8');
function setup() {
  const dom = new JSDOM(html, { url:'https://test.invalid', pretendToBeVisual:true });
  globalThis.document = dom.window.document;
  const dialog = document.querySelector('#notification-dialog');
  dialog.showModal = () => dialog.setAttribute('open','');
  dialog.close = () => dialog.removeAttribute('open');
  return dom;
}
test('notifications show escaped text, unread count and read actions', async () => {
  const dom=setup(); const calls=[];
  const item={id:1,title:'Freigabe',message:'<img src=x onerror=alert(1)>',created_at:'2026-09-09 12:00:00'};
  let unread=[item];
  const center=createNotifications({api:async(path,options)=>{
    calls.push({path,options});
    if(options) { unread=[]; return {ok:true}; }
    return {notifications:unread,unreadCount:unread.length};
  },formatDateTime:()=> '09.09.2026',onError:e=>{throw e;}});
  try {
    center.start(); await settle();
    assert.equal(document.querySelector('#notification-count').textContent,'1');
    assert.equal(document.querySelector('#notification-list img'),null);
    assert.ok(document.querySelector('#notification-list').textContent.includes(item.message));
    document.querySelector('#notification-button').click(); await settle();
    assert.ok(document.querySelector('#notification-dialog').hasAttribute('open'));
    document.querySelector('#notification-read-visible').click(); await settle(); await settle();
    assert.deepEqual(JSON.parse(calls.find(c=>c.options).options.body),{ids:[1]});
    assert.ok(document.querySelector('#notification-count').classList.contains('hidden'));
    assert.match(document.querySelector('#notification-list').textContent,/Keine ungelesenen/);
  } finally {center.stop();dom.window.close();delete globalThis.document;}
});
test('a response arriving after session expiry cannot repopulate private notifications', async () => {
  const dom=setup(); let resolve;
  const pending=new Promise(r=>resolve=r);
  const center=createNotifications({api:()=>pending,formatDateTime:()=>'',onError:e=>{throw e;}});
  try {
    center.start(); center.stop();
    resolve({notifications:[{id:1,title:'Private',message:'Old account data'}],unreadCount:1});
    await settle();
    assert.ok(!document.querySelector('#notification-list').textContent.includes('Old account data'));
    assert.ok(document.querySelector('#notification-count').classList.contains('hidden'));
  } finally {center.stop();dom.window.close();delete globalThis.document;}
});
test('HTML IDs are unique and every direct app selector has a target', async () => {
  const dom=setup();
  try {
    const ids=[...document.querySelectorAll('[id]')].map(el=>el.id);
    assert.equal(new Set(ids).size,ids.length);
    const source=await readFile('public/app.js','utf8');
    for(const match of source.matchAll(/\$\("#([\w-]+)"\)/g)) assert.ok(document.getElementById(match[1]),match[1]);
  } finally {dom.window.close();delete globalThis.document;}
});

test('edit forms send the opened version and retain drafts after conflicts; reminder form sends UTC', async () => {
  const { build } = await import('esbuild');
  const source = await readFile('public/app.js','utf8');
  const compiled = await build({stdin:{contents:source+'\nglobalThis.__app={state,openProposal,submitProposal,openSolutionDialog,submitSolution,notificationCenter};',resolveDir:process.cwd()+'/public'},bundle:true,format:'iife',write:false});
  const dom=new JSDOM(html,{url:'https://test.invalid',runScripts:'outside-only',pretendToBeVisual:true});
  const {window}=dom;const calls=[],alerts=[];
  window.HTMLCanvasElement.prototype.getContext=()=>new Proxy({}, {get:(_,key)=>key==='measureText'?()=>({width:0}):()=>({addColorStop(){}})});
  window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
  window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
  window.alert=message=>alerts.push(message);
  window.fetch=async(path,options={})=>{
    calls.push({path,options});
    if(path==='/api/auth/me') return new Response(JSON.stringify({user:null}));
    if(path==='/api/reminders') return new Response(JSON.stringify({reminders:[]}));
    return new Response(JSON.stringify({error:'Zwischenzeitlich geändert'}),{status:409});
  };
  const oldTimezone=process.env.TZ;
  try {
    window.eval(compiled.outputFiles[0].text);await settle();
    const app=window.__app;
    app.state.user={id:1,role:'admin',displayName:'Test'};
    app.state.categories=[{id:1,name:'Test'}];
    const select=window.document.querySelector('#proposal-category');
    select.innerHTML='<option value="1">Test</option>';
    app.openProposal({id:7,version:12,title:'Draft title',body:'Keep this draft',category_id:1});
    await app.submitProposal({preventDefault(){}});
    const edit=calls.find(c=>c.path==='/api/templates/7');
    assert.equal(JSON.parse(edit.options.body).version,12);
    assert.ok(window.document.querySelector('#proposal-dialog').hasAttribute('open'));
    assert.equal(window.document.querySelector('#proposal-body').value,'Keep this draft');
    app.state.user.role='employee';
    app.openProposal({id:7,version:12,title:'Draft title',body:'Keep this draft',category_id:1});
    await app.submitProposal({preventDefault(){}});
    assert.equal(JSON.parse(calls.find(c=>c.path==='/api/proposals').options.body).baseVersion,12);
    app.state.user.role='editor';
    app.openSolutionDialog({id:9,version:5,title:'Solution',category:'Test',symptom:'Symptom',solution:'Draft'});
    await app.submitSolution({preventDefault(){}});
    assert.equal(JSON.parse(calls.find(c=>c.path==='/api/solutions/9').options.body).version,5);
    assert.equal(window.document.querySelector('#solution-steps').value,'Draft');
    assert.equal(alerts.length,3);
    process.env.TZ='Europe/Berlin';
    window.document.querySelector('#reminder-message').value='Test reminder';
    window.document.querySelector('#reminder-due').value='2026-09-09T12:00';
    window.document.querySelector('#reminder-form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
    await settle();
    const reminder=calls.find(c=>c.path==='/api/reminders' && c.options.method==='POST');
    assert.equal(JSON.parse(reminder.options.body).dueAt,'2026-09-09T10:00:00.000Z');
  } finally {
    if(oldTimezone===undefined) delete process.env.TZ; else process.env.TZ=oldTimezone;
    window.__app?.notificationCenter.stop();window.close();
  }
});
