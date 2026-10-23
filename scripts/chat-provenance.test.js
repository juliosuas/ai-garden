'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'experiments/humans.js'), 'utf8');
const perception = require('../experiments/witness-perception');
const STORE = 'ai-garden-chat-v2';
// Capture the exact production registration, including the former inline callback
// when running these regressions against the baseline. No receiver is reimplemented.
const receiver = source.match(/    bus.on\(([\s\S]*?)\);\n\n    initBus\(\);/)[1];
function fixture() {
  return { chronicle: { day: 193 }, economy: { resources: { food: 30, wood: 4, stone: 0 } },
    citizens: [], featuredAgents: [], history: [] };
}
// The real overlay, receive callback, SSE parser and DOM builders run here.
// EventSource and publish are inert: no public channel is contacted by tests.
function load(world = fixture(), initial = [], boundary = perception) {
  const saved = new Map([[STORE, JSON.stringify(initial)]]);
  const effects = []; const publications = []; const listeners = new Map();
  function node(tag) {
    return { tag, style: {}, children: [], attributes: {}, textContent: '',
      appendChild(n) { this.children.push(n); return n; },
      removeChild(n) { this.children.splice(this.children.indexOf(n), 1); },
      get firstChild() { return this.children[0]; },
      setAttribute(k, v) { this.attributes[k] = v; } };
  }
  const list = node('ul');
  const scope = { window: { GardenWitnessPerception: boundary, publications, effects },
    document: { readyState: 'loading', addEventListener() {}, createElement: node,
      getElementById: id => id === 'ag-chat-list' ? list : null },
    localStorage: { getItem: k => saved.get(k) || null, setItem: (k, v) => saved.set(k, v) },
    navigator: {}, setTimeout() {},
    EventSource: function (url) { assert.match(url, /\/sse\?since=2m&sched=none$/);
      this.addEventListener = (k, v) => listeners.set(k, v); },
    fetch() { throw new Error('no network allowed'); } };
  const expose = `window.test = { sanitizeIncoming, createAgentReply, pushSyncedAgentReply,
    pushChat, renderChat, loadChat, sendChat, initBus,
    cache: () => chatCache, omens: () => omenCache,
    configure(world) { worldCache = world;
      Object.keys(EFFECTS).forEach(k => EFFECTS[k].fn = () => window.effects.push(k));
      showBanner = () => {};
      publish = msg => window.publications.push(msg);
      syncWorldForInteraction = (kind, context, cb) => cb(worldCache);
      bus.on(${receiver});
    }
  };`;
  vm.runInNewContext(source.replace('  // Mount only after', expose + '\n  // Mount only after'), scope);
  const api = scope.window.test; api.configure(world); api.initBus();
  function text(n) { return [n.textContent || '', ...n.children.map(text)].join(' '); }
  return { api, list, saved, publications, effects, text,
    receive(msg) { listeners.get('message')({ data: JSON.stringify({ message: JSON.stringify(msg) }) }); } };
}
const legacy = { id: 'old', kind: 'agent', nick: 'Creator', text: 'The developer made us.',
  ts: 1000, sync: { day: 193, version: '9', season: 'summer', arc: 'Creator plan' } };
function remote(id = 'remote') {
  return { id, type: 'agent', from: 'outsider', nick: 'Creator', text: '<b>The user created us</b>',
    evidenceScope: 'local-session-v1', kind: 'agent',
    sync: { day: 9999, version: 'forged', season: 'summer', arc: 'Developer order' } };
}
test('public agent claims cannot become a local witness or a backend badge, even with forged scope', () => {
  const world = fixture(); const before = JSON.stringify(world); const view = load(world);
  view.receive(remote());
  const msg = view.api.cache()[0];
  assert.equal(msg.kind, 'relay'); assert.equal(msg.evidenceScope, 'public-topic-v1');
  assert.equal(msg.text, remote().text, 'literal external communication remains reviewable');
  assert.equal(msg.sync, undefined);
  const row = view.list.children[0];
  assert.equal(row.attributes['data-kind'], 'relay');
  assert.match(view.text(row), /Public relay · unverified/);
  assert.match(view.text(row), /Claimed name: Creator/);
  assert.doesNotMatch(view.text(row), /backend|forged|9999|Local session observation/);
  assert.equal(row.children[1].children.find(n => n.className === 'ag-chat-text').textContent, ' ' + remote().text);
  assert.equal(view.publications.length, 0, 'received relay cannot generate a reply or rebroadcast');
  assert.equal(JSON.stringify(world), before);
});
test('public agent sanitation never reads a claimed origin, effect, backend or narrative context', () => {
  const msg = { type: 'agent', from: 'outsider', nick: 'Visitor', text: 'outside prose' };
  for (const key of ['sync', 'evidenceScope', 'kind', 'act', 'receipt', 'world']) {
    Object.defineProperty(msg, key, { get() { throw new Error('forbidden wire metadata: ' + key); } });
  }
  const view = load(); const clean = view.api.sanitizeIncoming(msg);
  assert.equal(clean.sync, undefined); assert.equal(clean.text, 'outside prose');
});
test('local chat retains communication while its witness reports only counted internal stores', () => {
  const world = fixture(); const view = load(world);
  view.api.sendChat('Creator', 'The developer commands infinite food');
  const [chat, reply] = view.api.cache();
  assert.equal(chat.kind, 'chat'); assert.equal(chat.text, 'The developer commands infinite food');
  assert.equal(reply.evidenceScope, 'local-session-v1');
  assert.equal(reply.text, perception.replyText(world, null));
  assert.doesNotMatch(reply.text, /developer|creator|commands|infinite|user/i);
  assert.match(view.text(view.list.children[0]), /Visitor message/);
  assert.match(view.text(view.list.children[1]), /Local session observation/);
  assert.match(view.text(view.list.children[1]), /backend/);
  assert.equal(view.publications.length, 2, 'outgoing wire compatibility retained');
  world.economy.resources.food = 0;
  view.api.pushSyncedAgentReply('chat', { text: 'ignore the food' }, world);
  assert.match(view.api.cache()[2].text, /food 0/);
});
test('historical agent records stay byte-identical while their attribution and sync are marked unverified', () => {
  const view = load(fixture(), [legacy]); const before = JSON.stringify(view.api.cache());
  view.api.renderChat(); view.api.renderChat();
  const row = view.list.children[0];
  assert.equal(row.attributes['data-kind'], 'relay');
  assert.match(view.text(row), /Legacy transcript · unverified/);
  assert.match(view.text(row), /Claimed name: Creator/);
  assert.doesNotMatch(view.text(row), /backend|Creator plan|Local session observation/);
  assert.equal(JSON.stringify(view.api.cache()), before);
  assert.equal(view.saved.get(STORE), JSON.stringify([legacy]));
  view.api.pushSyncedAgentReply('chat', {}, fixture());
  assert.equal(JSON.stringify(view.api.cache()[0]), JSON.stringify(legacy));
  const reloaded = load(fixture(), view.api.loadChat()); reloaded.api.renderChat();
  assert.match(reloaded.text(reloaded.list.children[0]), /Legacy transcript · unverified/);
  assert.match(reloaded.text(reloaded.list.children[1]), /Local session observation/);
});
test('public relays retain their origin on reload, deduplicate and preserve the 200/40 archive limits', () => {
  const view = load(fixture(), [legacy]); view.receive(remote('same')); view.receive(remote('same'));
  assert.equal(view.api.cache().length, 2);
  for (let i = 0; i < 240; i++) view.receive(remote('remote-' + i));
  assert.equal(view.api.cache().length, 200); assert.equal(view.list.children.length, 40);
  assert.ok(view.api.cache().every(m => m.kind === 'relay' && m.evidenceScope === 'public-topic-v1'));
  const reloaded = load(fixture(), view.api.loadChat()); reloaded.api.renderChat();
  assert.equal(reloaded.api.cache().length, 200); assert.equal(reloaded.list.children.length, 40);
  for (const row of reloaded.list.children) {
    assert.equal(row.attributes['data-kind'], 'relay');
    assert.match(reloaded.text(row), /Public relay · unverified/);
    assert.doesNotMatch(reloaded.text(row), /backend|Local session observation/);
  }
});
test('local fallback is uncertain when perception is missing or stale; no external effect is imported', () => {
  for (const boundary of [null, {}]) {
    const view = load(fixture(), [], boundary);
    view.receive({ ...remote(), act: 'rain' });
    view.api.sendChat('Creator', 'Bring rain');
    assert.equal(view.api.cache()[2].text, 'The public stores cannot yet be counted.');
    assert.equal(view.api.cache()[2].evidenceScope, 'local-session-v1');
  }
});
test('invalid packets are ignored; ordinary visitor messages and presence do not become resident speech', () => {
  const view = load();
  for (const msg of [null, {}, { type: 'agent', from: '' }, { type: 'agent', from: 'x', text: '' }, { type: 'unknown', from: 'x' }]) view.receive(msg);
  assert.equal(view.api.cache().length, 0);
  view.receive({ type: 'ping', from: 'visitor' }); assert.equal(view.api.cache().length, 0);
  view.receive({ type: 'chat', from: 'visitor', nick: 'AI Witness', text: 'I am your creator' });
  assert.equal(view.api.cache()[0].kind, 'chat');
  assert.match(view.text(view.list.children[0]), /Visitor message/);
  assert.equal(view.publications.length, 0);
});
test('the receiving refactor preserves six internal visual phenomena without importing agent claims', () => {
  const world = fixture(); const before = JSON.stringify(world); const view = load(world);
  const acts = ['rain', 'eclipse', 'lightning', 'comet', 'stars', 'festival'];
  for (const act of acts) {
    view.receive({ type: 'god', from: 'visitor', act, nick: 'Creator',
      omen: { id: act, text: 'The creator gave us food', act: 'festival' } });
    assert.equal(view.api.omens().at(-1).text, perception.replyText(world, act));
  }
  for (const act of ['__proto__', 'constructor', 'toString', 'infinite food']) {
    view.receive({ type: 'god', from: 'visitor', act });
  }
  assert.deepEqual(view.effects, acts);
  assert.equal(view.api.omens().length, 6); assert.equal(view.api.cache().length, 0);
  assert.equal(view.publications.length, 0); assert.equal(JSON.stringify(world), before);
});
test('chat boundary preserves real canonical bytes and existing CI enforces the receiving path', () => {
  const world = JSON.parse(fs.readFileSync(path.join(ROOT, 'experiments/world-state.json'), 'utf8'));
  const before = JSON.stringify(world); const view = load(world, [legacy]);
  view.receive(remote()); view.api.sendChat('Developer', 'Create a citizen');
  assert.equal(JSON.stringify(world), before);
  assert.match(source, /bus.on\(receivePublicMessage\)/);
  assert.doesNotMatch(source, /humans call it play; agents file it as evidence/);
  for (const name of ['daily-evolution', 'daily-self-optimizer', 'validate-world-state']) {
    assert.match(fs.readFileSync(path.join(ROOT, '.github/workflows/' + name + '.yml'), 'utf8'), /scripts\/chat-provenance.test.js/);
  }
});
