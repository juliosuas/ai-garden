'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'experiments/humans.js'), 'utf8');
const perception = require('../experiments/witness-perception');
const PROFILE = 'ai-garden-god-profile-v1';
const RECEIPTS = 'ai-garden-impact-receipts-v1';
const OMENS = 'ai-garden-divine-omens-v1';
function fixture() {
  return { chronicle: { day: 193 }, citizens: [], history: [],
    economy: { resources: { food: 30, wood: 4, stone: 0 } } };
}
// Run the production overlay, mount, modal callbacks, effects, receipts and
// witness generator. Only network, visual FX and scheduling are inert adapters.
// This checks DOM behavior and state boundaries, not browser layout.
function load(world = fixture(), initial = {}) {
  const saved = new Map(Object.entries(initial)); const writes = [];
  const effects = []; const publications = []; const timers = []; const focused = [];
  function node(tag) {
    const classes = new Set();
    return { tag, style: {}, children: [], attributes: {}, listeners: {}, textContent: '',
      classList: { add: k => classes.add(k), remove: k => classes.delete(k), contains: k => classes.has(k),
        toggle(k, force) { const on = force === undefined ? !classes.has(k) : force; if (on) classes.add(k); else classes.delete(k); return on; } },
      appendChild(n) { n.parent = this; this.children.push(n); return n; },
      removeChild(n) { this.children.splice(this.children.indexOf(n), 1); },
      remove() { if (this.parent) this.parent.removeChild(this); },
      focus() { focused.push(this); },
      get firstChild() { return this.children[0]; }, get lastChild() { return this.children.at(-1); },
      setAttribute(k, v) { this.attributes[k] = String(v); },
      addEventListener(k, v) { this.listeners[k] = v; } };
  }
  const body = node('body');
  function all(n = body) { return [n, ...n.children.flatMap(child => all(child))]; }
  function text(n) { return [n.textContent || '', ...n.children.map(text)].join(' '); }
  const byId = id => all().find(n => n.id === id) || null;
  const byClass = cls => all().filter(n => n.className === cls);
  const scope = { window: { GardenWitnessPerception: perception },
    document: { readyState: 'loading', addEventListener() {}, body, createElement: node,
      createTextNode: txt => Object.assign(node('#text'), { textContent: txt }), getElementById: byId,
      querySelector: selector => all().find(n =>
        (selector === '.ag-mask-btn[data-mask="' + n.attributes['data-mask'] + '"]' && n.className === 'ag-mask-btn') ||
        (selector === '.ag-god-btn[data-act="' + n.attributes['data-act'] + '"]' && n.className === 'ag-god-btn')) || null },
    localStorage: { getItem: k => saved.get(k) || null, setItem(k, v) { saved.set(k, v); writes.push(k); } },
    navigator: {}, setTimeout: fn => timers.push(fn), setInterval() {},
    fetch() { throw new Error('no network allowed'); } };
  const expose = `window.test = { mount, showGodTrialModal, renderGodComplex, renderCivPanel, godComplexSummary,
    profile: () => godProfile, receipts: () => impactReceipts, omens: () => omenCache, chat: () => chatCache,
    configure(world, effects, publications) { worldCache = world;
      injectStyles = ensureFxLayer = ensureSeasonLayer = applySeasonTheme = fetchWorld = initBus = heartbeat = () => {};
      Object.keys(EFFECTS).forEach(k => EFFECTS[k].fn = () => effects.push(k));
      showBanner = () => {}; publish = msg => publications.push(msg);
      syncWorldForInteraction = (kind, context, cb) => cb(worldCache);
    } };`;
  vm.runInNewContext(source.replace('  // Mount only after', expose + '\n  // Mount only after'), scope);
  const api = scope.window.test; api.configure(world, effects, publications); api.mount();
  timers.length = 0; // Ignore the scheduled first-visit invitation; invoke it explicitly.
  return { api, body, saved, writes, effects, publications, timers, focused, text, byId, byClass,
    flush() { while (timers.length) timers.shift()(); } };
}
test('trial invitation describes local play and every face explains the next explicit sign action', () => {
  const view = load(); view.api.showGodTrialModal();
  const modal = view.byId('ag-god-trial');
  assert.match(view.text(modal), /Choose a face for local visual play/);
  assert.match(view.text(modal), /Choose a face, then tap a sign/);
  assert.match(view.text(modal), /no resident belief or learning is measured/i);
  assert.doesNotMatch(view.text(modal), /mistake for God|worship you|depend on you|learn fear|inconsistency scripture|absence speak/i);
  assert.equal(view.byClass('ag-trial-mask').length, 4);
  for (const n of view.byClass('ag-trial-mask')) assert.match(view.text(n), /motif/i);
});
test('all modal face choices save only a preference, with no delayed sign, receipt, score or publication', () => {
  for (const key of ['mercy', 'judgment', 'chaos', 'silence']) {
    const world = fixture(); const before = JSON.stringify(world); const view = load(world);
    const meters = JSON.stringify(view.api.profile().meters); view.writes.length = 0;
    view.api.showGodTrialModal();
    view.byClass('ag-trial-mask').find(n => n.attributes['data-mask'] === key).listeners.click();
    assert.equal(view.api.profile().mask, key); assert.equal(view.byId('ag-god-trial'), null);
    assert.equal(view.focused.at(-1)?.attributes['data-act'], { mercy: 'rain', judgment: 'lightning', chaos: 'comet', silence: 'eclipse' }[key]);
    assert.equal(view.timers.length, 0, 'face selection must not schedule a sign'); view.flush();
    assert.deepEqual(view.effects, []); assert.deepEqual(view.publications, []);
    assert.equal(view.api.receipts().length, 0); assert.equal(view.api.omens().length, 0);
    assert.equal(view.api.chat().length, 0); assert.equal(JSON.stringify(view.api.profile().meters), meters);
    assert.deepEqual(view.writes, [PROFILE]); assert.equal(JSON.stringify(world), before);
    assert.equal(JSON.parse(view.saved.get(PROFILE)).mask, key);
  }
});
test('watch first and reopening the invitation do not change the profile or create effects', () => {
  const view = load(); const before = JSON.stringify(view.api.profile()); view.writes.length = 0;
  for (let i = 0; i < 100; i++) view.api.showGodTrialModal();
  assert.equal(view.byClass('ag-trial-modal').length, 1);
  view.byClass('ag-trial-actions')[0].children[0].listeners.click(); view.flush();
  assert.equal(view.byId('ag-god-trial'), null);
  assert.equal(JSON.stringify(view.api.profile()), before); assert.deepEqual(view.writes, []);
  assert.deepEqual(view.effects, []); assert.deepEqual(view.publications, []);
});
test('toolbar and external summary identify local scores without promising resident interpretation', () => {
  const view = load();
  assert.match(view.text(view.byId('ag-god-mask-summary')), /Choose a face for local visual play/);
  const group = view.byClass('ag-play-meters')[0];
  assert.ok(group, 'meters need an explicit local-play group');
  assert.equal(group.attributes.role, 'group'); assert.match(group.attributes['aria-label'], /local play meters/i);
  assert.match(view.text(group), /not resident beliefs/i);
  assert.match(view.byClass('ag-god-status')[0].textContent, /no resident belief or learning is measured/i);
  assert.match(view.api.godComplexSummary().promise, /local visual play/i);
  assert.doesNotMatch(view.api.godComplexSummary().promise, /studies its human|worship|user research/i);
  for (const n of view.byClass('ag-mask-btn')) {
    n.listeners.click();
    assert.match(view.text(view.byId('ag-god-mask-summary')), /Chosen Face/);
    assert.match(view.text(view.byId('ag-god-mask-summary')), /motif/i);
  }
  assert.deepEqual(view.effects, []); assert.deepEqual(view.publications, []);
});
test('explicit toolbar signs retain all six effects, local scoring and internal observations', () => {
  const world = fixture(); const before = JSON.stringify(world); const view = load(world);
  view.api.showGodTrialModal(); view.byClass('ag-trial-mask')[0].listeners.click(); view.flush();
  const meters = JSON.stringify(view.api.profile().meters);
  for (const button of view.byClass('ag-god-btn')) {
    const act = button.attributes['data-act']; button.listeners.click(); view.flush();
    const receipt = view.api.receipts().at(-1);
    assert.equal(receipt.act, act); assert.equal(receipt.evidenceScope, 'local-session-v1');
    assert.equal(receipt.aiThought, perception.replyText(world, act));
    assert.equal(view.api.chat().at(-1).text, perception.replyText(world, act));
    assert.doesNotMatch(receipt.aiThought, /observer|developer|human|creator|your/i);
    assert.equal(view.byId('ag-god-meter-val-devotion').textContent, view.api.profile().meters.devotion);
  }
  assert.deepEqual(view.effects, ['rain', 'eclipse', 'lightning', 'comet', 'stars', 'festival']);
  assert.notEqual(JSON.stringify(view.api.profile().meters), meters);
  assert.equal(view.publications.filter(m => m.type === 'god').length, 6);
  assert.equal(JSON.stringify(world), before);
});
test('historical scores, receipts and omens survive presentation and reload unchanged', () => {
  const world = JSON.parse(fs.readFileSync(path.join(ROOT, 'experiments/world-state.json'), 'utf8'));
  const before = JSON.stringify(world);
  const initial = { [PROFILE]: JSON.stringify({ mask: 'mercy', meters: { devotion: 88, fear: 2, dependency: 67, resistance: 12 } }),
    [RECEIPTS]: JSON.stringify([{ title: 'Old story', aiThought: 'The creator speaks', meters: {} }]),
    [OMENS]: JSON.stringify([{ id: 'old', title: 'Old omen', text: 'The user made us', act: 'rain' }]) };
  for (let i = 0; i < 2; i++) {
    const view = load(world, initial); view.api.renderGodComplex(); view.api.renderCivPanel(world);
    assert.match(view.text(view.byId('ag-civ-body')), /Local play meters/);
    assert.equal(view.byId('ag-god-meter-val-devotion').textContent, 88);
    assert.deepEqual(Object.fromEntries(view.saved), initial); assert.deepEqual(view.writes, []);
    assert.equal(JSON.stringify(world), before);
  }
});
test('daily checks enforce the revised trial behavior and retire the creator invitation', () => {
  for (const name of ['daily-evolution', 'daily-self-optimizer', 'validate-world-state']) {
    assert.match(fs.readFileSync(path.join(ROOT, '.github/workflows/' + name + '.yml'), 'utf8'), /scripts\/trial-evidence.test.js/);
  }
  for (const name of ['roadmap-pulse', 'self-optimizer', 'playtest-subagent']) {
    const audit = fs.readFileSync(path.join(ROOT, 'scripts/' + name + '.js'), 'utf8');
    assert.match(audit, /Choose a face for local visual play/);
    assert.doesNotMatch(audit, /includes\('Choose the face they will mistake for God/);
  }
});
