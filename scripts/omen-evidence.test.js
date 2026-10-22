'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'experiments/humans.js'), 'utf8');
const perception = require('../experiments/witness-perception');
const acts = ['rain', 'eclipse', 'lightning', 'comet', 'stars', 'festival'];
function fixture() {
  return { chronicle: { day: 193 }, economy: { resources: { food: 30, wood: 4, stone: 0 } },
    citizens: [], featuredAgents: [], history: [{ events: ['untouched'] }] };
}
// Execute the complete production overlay without mounting it or opening its bus.
// Expose closures only in this VM copy; all tested functions remain production code.
function load(world = fixture(), boundary = perception, initial = []) {
  const saved = new Map([['ai-garden-divine-omens-v1', JSON.stringify(initial)]]);
  const nodes = new Map(); const effects = []; const publications = []; const replies = [];
  function node(tag) {
    const classes = new Set();
    return { tag, style: {}, children: [], attributes: {}, className: '', textContent: '',
      classList: { contains: k => classes.has(k), add: k => classes.add(k), remove: k => classes.delete(k),
        toggle(k, force) { if (force === true || (force !== false && !classes.has(k))) classes.add(k); else classes.delete(k); } },
      appendChild(c) { this.children.push(c); return c; },
      removeChild(c) { this.children.splice(this.children.indexOf(c), 1); },
      get firstChild() { return this.children[0]; }, setAttribute(k, v) { this.attributes[k] = v; },
      addEventListener() {}, remove() {} };
  }
  for (const id of ['ag-pantheon', 'ag-omen-last', 'ag-omen-ledger', 'ag-lore-body', 'ag-civ-body']) nodes.set(id, node('div'));
  const scope = { window: { GardenWitnessPerception: boundary },
    document: { readyState: 'loading', addEventListener() {}, createElement: node,
      createTextNode: text => Object.assign(node('#text'), { textContent: text }),
      getElementById: id => nodes.get(id) || null, querySelector: () => null, body: node('body') },
    localStorage: { getItem: k => saved.get(k) || null, setItem: (k, v) => saved.set(k, v) },
    navigator: {}, setTimeout() {}, setInterval() {}, requestAnimationFrame() {},
    fetch() { throw new Error('tests must never send a message or fetch the world'); } };
  const expose = `window.test = { createOmen, sanitizeOmen, sanitizeIncoming, recordOmen, loadOmens,
    renderPantheon, renderLorePanel, renderCivPanel, divinePressure, createAgentReply, applyEffect,
    cache: () => omenCache, receipts: () => impactReceipts,
    configure(world) { worldCache = world;
      Object.keys(EFFECTS).forEach(k => EFFECTS[k].fn = () => window.effects.push(k));
      showBanner = () => {}; ensureGodMask = () => true; showImpactReceipt = () => {};
      publish = msg => window.publications.push(msg);
      syncWorldForInteraction = (kind, context, cb) => cb(worldCache);
      pushSyncedAgentReply = (kind, context, w) => window.replies.push(createAgentReply(kind, context, w));
    }
  };`;
  Object.assign(scope.window, { effects, publications, replies });
  vm.runInNewContext(source.replace('  // Mount only after', expose + '\n  // Mount only after'), scope);
  scope.window.test.configure(world);
  return { api: scope.window.test, saved, nodes, effects, publications, replies,
    text(n) { return [n.textContent || '', ...n.children.map(c => this.text(c))].join(' '); } };
}
const legacy = { id: 'legacy', act: 'festival', title: 'Old festival', target: 'Old city', axis: 'revelry',
  nick: 'creator', text: 'Citizens worship the human creator', ts: 1000 };
test('all six omens report internal phenomena and counted stores, without inventions or external origin', () => {
  const world = fixture(); const before = JSON.stringify(world); const { api } = load(world);
  for (const act of acts) {
    const omen = api.createOmen(act, 'Creator');
    assert.equal(omen.text, perception.replyText(world, act));
    assert.equal(omen.evidenceScope, 'local-session-v1');
    assert.equal(omen.target, 'the settlement');
    assert.doesNotMatch(omen.text, /human|creator|developer|observer|user|well.*rise|farmers loosen|dance in public/i);
    world.economy.resources.food = 0;
    assert.match(api.createOmen(act, 'other').text, /food 0/);
    world.economy.resources.food = 30;
  }
  assert.equal(JSON.stringify(world), before);
});
test('new omen generation never reads narrative targets, gods, factions or development plans', () => {
  const world = fixture();
  for (const key of ['cities', 'dynasties', 'religions', 'wars', 'map', 'structures', 'selfOptimizer', 'societyDirector']) {
    Object.defineProperty(world, key, { get() { throw new Error('forbidden target read: ' + key); } });
  }
  const { api } = load(world);
  for (const act of acts) assert.equal(api.createOmen(act, 'developer').text, perception.replyText(world, act));
});
test('unknown keys cannot fire or record a phenomenon; absent measurements and stale code remain uncertain', () => {
  for (const boundary of [perception, null, {}]) {
    const view = load(null, boundary);
    for (const act of [undefined, '', 'creator', '__proto__', 'constructor', 'toString']) {
      assert.equal(view.api.createOmen(act, 'creator'), null);
      assert.doesNotThrow(() => view.api.applyEffect(act, 'creator', false));
    }
    assert.equal(view.effects.length, 0); assert.equal(view.api.cache().length, 0);
    for (const act of acts) assert.match(view.api.createOmen(act, '').text, /unknown|cannot yet be counted/);
  }
  for (const food of [null, -1, '3', Infinity, NaN]) {
    const world = fixture(); world.economy.resources.food = food;
    assert.match(load(world).api.createOmen('rain', '').text, /food unknown/);
  }
});
test('real local effects keep scoring and receipts while matching the omen and witness evidence', () => {
  const world = fixture(); const before = JSON.stringify(world); const view = load(world);
  for (const act of acts) view.api.applyEffect(act, 'Creator', true);
  assert.deepEqual(view.effects, acts); assert.equal(view.publications.length, 6);
  for (let i = 0; i < acts.length; i++) {
    const omen = view.api.cache()[i]; const receipt = view.api.receipts()[i];
    assert.equal(omen.text, view.replies[i].text); assert.equal(receipt.aiThought, omen.text);
    assert.equal(omen.evidenceScope, 'local-session-v1');
    assert.equal(view.publications[i].omen.text, omen.text);
    assert.ok(Object.values(receipt.meters).every(n => n >= 0 && n <= 100));
  }
  assert.equal(JSON.stringify(world), before);
});
test('received effects rebuild observations locally instead of trusting public-topic prose, scope or mismatched acts', () => {
  const world = fixture(); const before = JSON.stringify(world); const view = load(world);
  const incoming = { ...legacy, id: 'remote', evidenceScope: 'local-session-v1' };
  const original = JSON.stringify(incoming);
  const wire = view.api.sanitizeIncoming({ type: 'god', from: 'remote-client', act: 'rain', nick: 'creator', omen: incoming });
  view.api.applyEffect(wire.act, wire.nick, false, wire.omen);
  const local = view.api.cache()[0];
  assert.equal(local.act, 'rain'); assert.equal(local.text, perception.replyText(world, 'rain'));
  assert.equal(local.id, 'remote', 'wire ID retained for existing deduplication');
  assert.equal(local.evidenceScope, 'local-session-v1');
  assert.equal(view.api.receipts().length, 0); assert.equal(view.publications.length, 0);
  assert.equal(view.replies.length, 0); assert.equal(JSON.stringify(world), before);
  assert.equal(JSON.stringify(incoming), original);
  view.api.applyEffect('rain', 'creator', false, wire.omen);
  assert.equal(view.api.cache().length, 1, 'duplicate event cannot grow the archive');
});
test('raw incoming interpretation fields are not read during effect application', () => {
  const view = load();
  const incoming = { id: 'safe-id' };
  for (const key of ['text', 'title', 'axis', 'target', 'evidenceScope', 'act']) {
    Object.defineProperty(incoming, key, { get() { throw new Error('forbidden incoming prose: ' + key); } });
  }
  view.api.applyEffect('festival', 'creator', false, incoming);
  assert.equal(view.api.cache()[0].text, perception.replyText(fixture(), 'festival'));
});
test('legacy archives stay byte-identical while every omen presentation labels their claims', () => {
  const view = load(fixture(), perception, [legacy]); const before = JSON.stringify(view.api.cache());
  view.api.renderPantheon(); view.api.renderLorePanel(fixture()); view.api.renderCivPanel(fixture());
  for (const id of ['ag-omen-last', 'ag-omen-ledger', 'ag-lore-body', 'ag-civ-body']) {
    assert.match(view.text(view.nodes.get(id)), /legacy.*unverified/i, id + ' labels legacy history');
  }
  const weather = view.nodes.get('ag-civ-body').children.find(n => view.text(n).includes('Observer Weather'));
  assert.match(view.text(weather), /local.*meters/i);
  assert.doesNotMatch(view.text(weather), /being read through|bent the current interpretation/);
  assert.equal(JSON.stringify(view.api.cache()), before);
  assert.equal(view.saved.get('ai-garden-divine-omens-v1'), JSON.stringify([legacy]));
});
test('new omen provenance survives record sanitation and reload, retains 80-record cap and prior snapshots', () => {
  const view = load(fixture(), perception, [legacy]);
  const first = view.api.recordOmen(view.api.createOmen('rain', 'creator'));
  const before = JSON.stringify(first);
  view.api.renderPantheon(); view.api.renderLorePanel(fixture()); view.api.renderCivPanel(fixture());
  for (const id of ['ag-omen-last', 'ag-lore-body', 'ag-civ-body']) assert.match(view.text(view.nodes.get(id)), /local session/i);
  assert.equal(view.api.loadOmens()[1].evidenceScope, 'local-session-v1');
  for (let i = 0; i < 100; i++) {
    const omen = view.api.createOmen('stars', 'creator'); omen.id = 'distinct-' + i; view.api.recordOmen(omen);
  }
  assert.equal(view.api.cache().length, 80); assert.equal(view.api.loadOmens().length, 80);
  assert.equal(JSON.stringify(first), before);
});
test('no-omen weather and receipt summaries never establish inhabitant interpretation', () => {
  const view = load(); view.api.renderCivPanel(fixture());
  const weather = view.nodes.get('ag-civ-body').children.find(n => view.text(n).includes('Observer Weather'));
  assert.doesNotMatch(view.text(weather), /bent|interpretation/);
  assert.match(view.text(weather), /no.*local/i);
  view.api.applyEffect('rain', 'creator', true);
  const world = fixture(); world.weeklyNarrativeDirector = { currentBeat: {}, nextBeat: {} };
  view.api.renderCivPanel(world);
  assert.doesNotMatch(view.text(view.nodes.get('ag-civ-body')), /now reads it as story evidence/);
});
test('omen interactions cannot change real canonical bytes and CI runs the boundary tests', () => {
  const world = JSON.parse(fs.readFileSync(path.join(ROOT, 'experiments/world-state.json'), 'utf8'));
  const before = JSON.stringify(world); const view = load(world);
  for (const act of acts) view.api.applyEffect(act, 'creator', true);
  assert.equal(JSON.stringify(world), before);
  for (const name of ['daily-evolution', 'daily-self-optimizer', 'validate-world-state']) {
    assert.match(fs.readFileSync(path.join(ROOT, '.github/workflows/' + name + '.yml'), 'utf8'), /scripts\/omen-evidence.test.js/);
  }
});
