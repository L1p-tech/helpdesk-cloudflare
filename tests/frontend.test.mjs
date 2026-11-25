import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
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
    const source=(await Promise.all((await readdir('public')).filter(f=>f.endsWith('.js')).map(f=>readFile('public/'+f,'utf8')))).join('\n');
    for(const match of source.matchAll(/\$\("#([\w-]+)"\)/g)) assert.ok(document.getElementById(match[1]),match[1]);
  } finally {dom.window.close();delete globalThis.document;}
});

test('edit forms send the opened version and retain drafts after conflicts; reminder form sends UTC', async () => {
  const { build } = await import('esbuild');
  const source = await readFile('public/app.js','utf8');
  const compiled = await build({stdin:{contents:'import "./app.js";\nimport {state} from "./base.js";import {notificationCenter} from "./core.js";\nimport {openProposal,submitProposal} from "./proposals.js";\nimport {openSolutionDialog,submitSolution} from "./solutions.js";\nglobalThis.__app={state,openProposal,submitProposal,openSolutionDialog,submitSolution,notificationCenter};',resolveDir:process.cwd()+'/public'},bundle:true,format:'iife',write:false});
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

async function loadApp(imports, exports) {
  const { build } = await import('esbuild');
  const compiled = await build({stdin:{contents:`import "./app.js";\n${imports}\nglobalThis.__app={${exports}};`,resolveDir:process.cwd()+'/public'},bundle:true,format:'iife',write:false});
  const dom=new JSDOM(html,{url:'https://test.invalid/',runScripts:'outside-only',pretendToBeVisual:true});
  const {window}=dom;
  window.HTMLCanvasElement.prototype.getContext=()=>new Proxy({}, {get:(_,key)=>key==='measureText'?()=>({width:0}):()=>({addColorStop(){}})});
  window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
  window.HTMLDialogElement.prototype.close=function(){if(!this.hasAttribute('open'))return;this.removeAttribute('open');this.dispatchEvent(new window.Event('close'));};
  window.fetch=async(path)=>new Response(JSON.stringify(path==='/api/auth/me'?{user:null}:{reminders:[]}));
  window.eval(compiled.outputFiles[0].text);await settle();
  return {window,app:window.__app};
}

test('placeholders skip PowerShell syntax; filling copies values, remembers them per case, cancel copies nothing', async () => {
  const {window,app}=await loadApp('import {state} from "./base.js"; import {notificationCenter} from "./core.js"; import {copyText,findPlaceholders} from "./templates.js";','state,copyText,findPlaceholders,notificationCenter');
  const written=[];
  Object.defineProperty(window.navigator,'clipboard',{value:{writeText:async text=>{written.push(text);}}});
  try {
    assert.deepEqual(
      [...app.findPlaceholders('Hallo [USERNAME], [ICH] $a[0] [math]::Round [PC-NAME] [USERNAME]')],
      ['USERNAME','PC-NAME']);
    app.state.user={id:1,role:'employee',displayName:'Test Person'};
    app.state.cases=[{id:5,status:'open',ticket_ref:'INC-1'}];

    const first=app.copyText('Ticket [TICKET-NR] für [USERNAME], Gruß [ICH]');
    const inputs=[...window.document.querySelectorAll('#fill-fields input')];
    assert.equal(inputs.find(i=>i.dataset.fillName==='TICKET-NR').value,'INC-1');
    inputs.find(i=>i.dataset.fillName==='USERNAME').value='mmueller';
    window.document.querySelector('#fill-form').dispatchEvent(new window.Event('submit',{cancelable:true}));
    assert.equal(await first,true);
    assert.deepEqual(written,['Ticket INC-1 für mmueller, Gruß Test Person']);

    const second=app.copyText('Hallo [USERNAME]');
    assert.equal(window.document.querySelector('[data-fill-name="USERNAME"]').value,'mmueller');
    window.document.querySelector('#fill-dialog').close();
    assert.equal(await second,false);
    assert.equal(written.length,1);

    assert.equal(await app.copyText('Ohne [Platzhalter] $x[0]'),true);
    assert.equal(written[1],'Ohne [Platzhalter] $x[0]');
  } finally {app.notificationCenter.stop();window.close();}
});

test('routes map to views and respect roles', async () => {
  const {window,app}=await loadApp('import {state} from "./base.js";import {notificationCenter} from "./core.js"; import {viewFromLocation} from "./router.js";','state,viewFromLocation,notificationCenter');
  try {
    app.state.user={id:1,role:'employee',displayName:'Test'};
    window.location.hash='#/befehle';
    assert.equal(app.viewFromLocation(),'commands');
    window.location.hash='#/administration';
    assert.equal(app.viewFromLocation(),'start');
    window.location.hash='#/freigaben';
    assert.equal(app.viewFromLocation(),'start');
    window.location.hash='#/unbekannt';
    assert.equal(app.viewFromLocation(),'start');
    app.state.user.role='admin';
    window.location.hash='#/administration';
    assert.equal(app.viewFromLocation(),'admin');
  } finally {app.notificationCenter.stop();window.close();}
});

test('assistant free text recognises typical user descriptions', async () => {
  const {window,app}=await loadApp('import {state} from "./base.js";import {notificationCenter} from "./core.js"; import {matchAssistant} from "./assistant.js";','state,matchAssistant,notificationCenter');
  const cases = {
    'Outlook fragt ständig nach dem Passwort': 'outlook-kennwort',
    'Konto gesperrt': 'konto-gesperrt',
    'kann mich nicht anmelden, Account gesperrt': 'konto-gesperrt',
    'Drucker druckt nicht': 'druck-warteschlange',
    'Drucker druckt nur leere Seiten': 'druck-qualitaet',
    'Teams kein Ton': 'teams-audio',
    'die anderen hören mich im Meeting nicht': 'teams-audio',
    'Teams startet nicht': 'teams-cache',
    'WLAN bricht ständig ab': 'wlan-abbrueche',
    'VPN verbindet nicht': 'vpn-verbindet-nicht',
    'Rechner ist total langsam': 'rechner-langsam',
    'PC friert ein': 'rechner-friert',
    'Bluescreen': 'bluescreen',
    'zweiter Monitor wird nicht erkannt': 'dockingstation',
    'Zugriff verweigert auf Ordner': 'zugriff-ordner',
    'OneDrive synchronisiert nicht': 'onedrive',
    'Datei gelöscht': 'datei-wiederherstellen',
    'auf Link in Phishing Mail geklickt': 'phishing-geklickt',
    'Handy verloren': 'geraet-verloren',
    'Postfach voll': 'postfach-voll',
    'Authenticator Code wird nicht akzeptiert': 'mfa',
    'Festplatte voll': 'speicherplatz',
    'Excel stürzt ab': 'office-reparatur',
    'Zertifikatsfehler im Browser': 'zertifikat',
    'kein Internet': 'kein-internet',
    'Laptop Akku lädt nicht': 'akku',
    'Scanner schickt keine Mail': 'scanner',
    'Passwort abgelaufen im Homeoffice': 'passwort-abgelaufen',
    'Netzlaufwerk fehlt': 'netzlaufwerke',
    'Webcam geht nicht': 'webcam',
    'Ich komme nicht mehr in mein Konto rein': 'konto-gesperrt',
    'Mein Rechner startet ständig neu': 'bluescreen',
    'Ausdruck kommt nicht raus': 'druck-warteschlange',
    'Excel hängt sich auf': 'office-reparatur',
    'Laufwerk H ist weg': 'netzlaufwerke',
    'neuer Kollege fängt Montag an': 'onboarding',
    'wifi verbindet sich nicht': 'wlan-verbindet-nicht',
    'Windows Update hängt bei 30 Prozent': 'update-fehler',
    'im Homeoffice komme ich nicht auf die Laufwerke': 'vpn-nichts-erreichbar',
    'BitLocker will einen Schlüssel haben': 'bitlocker',
    'meine PIN funktioniert nicht mehr': 'windows-hello',
    'Laptop zeigt blauen Bildschirm und will Wiederherstellungsschlüssel': 'bitlocker',
    'Kollegin hat geheiratet und braucht neuen Namen': 'namensaenderung',
    'wie richte ich meine Abwesenheitsnotiz ein, bin im Urlaub': 'abwesenheit',
    'meine Signatur ist weg': 'signatur',
    'Datei ist zu groß zum Verschicken': 'anhang-gross',
    'Chefin soll meinen Kalender sehen können': 'kalender-freigabe',
    'Teams zeigt mich als abwesend obwohl ich da bin': 'teams-status',
    'Remotedesktop zum Server geht nicht': 'rdp-verbindet-nicht',
    'Citrix hängt': 'rdp-sitzung',
    'Terminalserver Sitzung schwarz': 'rdp-sitzung',
    'Word abgestürzt, Dokument nicht gespeichert': 'office-autorecover',
    'USB Stick wird nicht erkannt': 'usb-geraet',
    'Startmenü öffnet sich nicht': 'startmenue',
    'die Uhr am PC geht falsch': 'uhrzeit',
    'PDF öffnet sich im falschen Programm': 'standardprogramm',
    'Tastatur schreibt Y statt Z': 'tastatur-layout',
    'alles ist so unscharf auf dem Monitor': 'skalierung',
    'Schrift ist riesig': 'skalierung',
    'Drucker im Terminalserver fehlt': 'rdp-umleitung',
    'Anmeldung mit Fingerabdruck geht nicht': 'windows-hello',
    'externe Festplatte erscheint nicht': 'usb-geraet',
    'Mail mit Anhang kommt zurück, zu groß': 'anhang-gross',
    'Kalender Stellvertretung einrichten': 'kalender-freigabe',
    'Beamer im Besprechungsraum zeigt kein Bild': 'beamer-besprechungsraum',
    'Monitor flackert und hat Streifen': 'bildschirm-flackert',
    'Bluetooth Kopfhörer verbindet nicht': 'bluetooth-verbindet-nicht',
    'Laptop wird sehr heiß und der Lüfter ist laut': 'laptop-ueberhitzt',
    'Teams Nachricht wird nicht gesendet': 'teams-nachrichten',
    'externe Teams Besprechung beitreten geht nicht': 'teams-gast-extern',
    'Mails werden automatisch an eine fremde Adresse weitergeleitet': 'mail-regeln-weiterleitung',
    'Senden als für Funktionspostfach geht nicht': 'mail-senden-als',
    'Mitarbeiter hat einen USB Stick gefunden und angesteckt': 'fremder-usb-stick',
  };
  try {
    app.state.solutions=[];
    const misses=[];
    for (const [text, expected] of Object.entries(cases)) {
      const top=[...app.matchAssistant(text,3)].map(hit=>hit.id);
      if(!top.includes(expected)) misses.push(`${text} -> ${top.join(', ') || '(nichts)'}`);
    }
    assert.deepEqual(misses,[]);
    // Sicherheitsvorfall: der dringende Leitfaden steht vor jeder Loesung.
    app.state.solutions=[{id:1,title:'Auf Phishing-Link geklickt oder Zugangsdaten eingegeben',symptom:'Link geklickt, Passwort eingegeben',category:'Sicherheit'}];
    assert.equal(app.matchAssistant('auf Link geklickt und Passwort eingegeben',3)[0].id,'phishing-geklickt');
  } finally {app.notificationCenter.stop();window.close();}
});

test('assistant tree only links existing nodes and guides, and every guide is reachable', async () => {
  const { ASSISTANT_TREE, ASSISTANT_GUIDES } = await import('../public/assistant-data.js');
  const reachable = new Set();
  for (const [key, node] of Object.entries(ASSISTANT_TREE)) {
    for (const option of node.optionen) {
      if (option.ziel) assert.ok(ASSISTANT_TREE[option.ziel], `${key} -> ${option.ziel}`);
      else {
        assert.ok(ASSISTANT_GUIDES[option.leitfaden], `${key} -> ${option.leitfaden}`);
        reachable.add(option.leitfaden);
      }
    }
  }
  for (const [id, guide] of Object.entries(ASSISTANT_GUIDES)) {
    assert.ok(reachable.has(id), `Leitfaden ${id} ist im Baum nicht erreichbar`);
    assert.ok(guide.titel && guide.schritte.length && guide.stichworte.length, id);
  }
});

test('glossary terms are unique, categories valid and every cross reference exists', async () => {
  const { GLOSSARY, GLOSSARY_CATEGORIES } = await import('../public/glossary-data.js');
  const names = GLOSSARY.map(entry => entry.begriff);
  assert.equal(new Set(names).size, names.length, 'doppelter Begriff');
  // Gleiche Bildung wie glossarySlug() in app.js: Sprungziele muessen eindeutig sein.
  const slug = text => text.toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const slugs = names.map(slug);
  assert.equal(new Set(slugs).size, slugs.length, 'zwei Begriffe ergeben dieselbe Sprungadresse');
  for (const entry of GLOSSARY) {
    assert.ok(GLOSSARY_CATEGORIES.includes(entry.kategorie), `${entry.begriff}: Kategorie ${entry.kategorie}`);
    assert.ok(entry.text && entry.text.length > 20, `${entry.begriff}: Erklärung fehlt`);
    for (const target of entry.siehe || []) assert.ok(names.includes(target), `${entry.begriff} -> ${target}`);
  }
});

test('training content is consistent: ids, quiz answers, diagrams, icons, glossary links, checklist', async () => {
  const { TRAINING_MODULES, TRAINING_GROUPS, FIRST_WEEK, PASS_PERCENT } = await import('../public/training-data.js');
  const { DIAGRAMS } = await import('../public/training-diagrams.js');
  const { GLOSSARY } = await import('../public/glossary-data.js');
  const terms = new Set(GLOSSARY.map(entry => entry.begriff));
  const groups = new Set(TRAINING_GROUPS.map(group => group.id));
  const sprite = html;
  assert.equal(PASS_PERCENT, 70, 'muss zum Worker (TRAINING_PASS_PERCENT) passen');
  const worker = await readFile('src/handlers/training.ts', 'utf8');
  assert.match(worker, /TRAINING_PASS_PERCENT = 70/);

  const ids = TRAINING_MODULES.map(module => module.id);
  assert.equal(new Set(ids).size, ids.length, 'doppelte Modul-ID');
  assert.deepEqual(TRAINING_MODULES.map(module => module.nr), ids.map((_, index) => index + 1), 'Nummern lückenlos in Reihenfolge');
  for (const module of TRAINING_MODULES) {
    // Muss zur serverseitigen Pruefung passen, sonst liesse sich der Fortschritt nie speichern.
    assert.match(module.id, /^[a-z0-9][a-z0-9-]{0,79}$/, module.id);
    assert.ok(!module.id.startsWith('check:'), module.id);
    assert.ok(groups.has(module.gruppe), `${module.id}: Gruppe`);
    assert.match(module.farbe, /^#[0-9a-f]{6}$/i, `${module.id}: Farbe`);
    assert.ok(sprite.includes(`id="${module.icon}"`), `${module.id}: Symbol ${module.icon} fehlt im Sprite`);
    assert.ok(module.abschnitte.length >= 3, `${module.id}: zu wenige Abschnitte`);
    assert.ok(module.quiz.length >= 3 && module.quiz.length <= 50, `${module.id}: Quizlänge`);
    for (const question of module.quiz) {
      assert.ok(question.antworten.length >= 3 && question.antworten.length <= 6, `${module.id}: Antwortanzahl`);
      assert.ok(Number.isInteger(question.richtig) && question.richtig >= 0 && question.richtig < question.antworten.length, `${module.id}: richtig`);
      assert.equal(new Set(question.antworten).size, question.antworten.length, `${module.id}: doppelte Antwort`);
      assert.ok(question.erklaerung.length > 20, `${module.id}: Erklärung`);
    }
    const fall = module.fall;
    assert.ok(fall.optionen.length >= 3 && fall.beste >= 0 && fall.beste < fall.optionen.length, `${module.id}: Praxisfall`);
    assert.ok(fall.optionen.every(option => option.text && option.feedback), `${module.id}: Feedback fehlt`);
    for (const section of module.abschnitte) {
      if (section.diagramm) assert.ok(DIAGRAMS[section.diagramm], `${module.id}: Grafik ${section.diagramm}`);
      assert.ok(section.titel && section.text, `${module.id}: Abschnitt`);
    }
    // Jeder [[Begriff]] im Text und jeder Eintrag in `glossar` muss im Glossar stehen.
    const text = [module.kurz, ...module.abschnitte.flatMap(section =>
      [section.titel, section.text, section.merke, section.vergleich?.schlecht, section.vergleich?.gut])].filter(Boolean).join('\n');
    for (const match of text.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) assert.ok(terms.has(match[1]), `${module.id}: [[${match[1]}]] fehlt im Glossar`);
    for (const term of module.glossar || []) assert.ok(terms.has(term), `${module.id}: ${term} fehlt im Glossar`);
  }

  const checkIds = FIRST_WEEK.map(item => item.id);
  assert.equal(new Set(checkIds).size, checkIds.length, 'doppelte Checklisten-ID');
  for (const item of FIRST_WEEK) {
    assert.match(item.id, /^check:[a-z0-9:-]{1,70}$/, item.id);
    if (item.modul) assert.ok(ids.includes(item.modul), `${item.id}: Modul ${item.modul}`);
  }
});

test('every training diagram renders valid SVG without leftover template text', async () => {
  const { DIAGRAMS } = await import('../public/training-diagrams.js');
  const { JSDOM: Dom } = await import('jsdom');
  for (const [name, draw] of Object.entries(DIAGRAMS)) {
    const markup = draw();
    assert.ok(!/undefined|NaN|\[object/.test(markup), `${name}: enthält undefined/NaN`);
    const dom = new Dom(`<body>${markup}</body>`, { contentType: 'text/html' });
    const svg = dom.window.document.querySelector('svg');
    assert.ok(svg && svg.getAttribute('aria-label'), `${name}: SVG oder Beschriftung fehlt`);
    // Alle Koordinaten muessen innerhalb der Zeichenflaeche liegen.
    const [,, width, height] = svg.getAttribute('viewBox').split(' ').map(Number);
    for (const rect of svg.querySelectorAll('rect')) {
      const x = Number(rect.getAttribute('x')), y = Number(rect.getAttribute('y'));
      assert.ok(x >= 0 && y >= 0 && x + Number(rect.getAttribute('width')) <= width && y + Number(rect.getAttribute('height')) <= height, `${name}: Kasten außerhalb`);
    }
    dom.window.close();
  }
});
