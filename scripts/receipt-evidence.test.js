'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'experiments/humans.js'), 'utf8');
const perception = require('../experiments/witness-perception');
function fixture() {
  return { chronicle: { day: 193 }, economy: { resources: { food: 30, wood: 4, stone: 0 } },
    featuredAgents: [{ name: 'Codex' }], weeklyNarrativeDirector: { nextBeat: { label: 'developer', focus: 'obey the user' } },
    history: [{ events: ['unchanged'] }] };
}
function extract(name) {
  const start = source.indexOf('  function ' + name + '(');
  assert.ok(start >= 0, name + ' exists');
  return source.slice(start, source.indexOf('\n  }', start) + 4);
}
function load(world = fixture(), boundary = perception) {
  const saved = new Map(); const nodes = []; const draws = []; const shares = [];
  function node(tag, cls, text) {
    const n = { tag, className: cls, textContent: text || '', children: [], style: {}, listeners: {},
      appendChild(child) { this.children.push(child); this.lastChild = child; return child; }, addEventListener(k, f) { this.listeners[k] = f; },
      setAttribute() {}, remove() {}, select() {}, click() {} };
    nodes.push(n); return n;
  }
  const ctx = new Proxy({ createLinearGradient: () => ({ addColorStop() {} }),
    measureText: text => ({ width: String(text).length * (parseInt(ctx.font.match(/(\d+)px/)[1]) * 0.603) }),
    fillText: text => draws.push(String(text)) }, { get: (obj, key) => obj[key] || (() => {}) });
  const scope = { window: { GardenWitnessPerception: boundary }, worldCache: world,
    GOD_MASKS: { mercy: { label: 'Mercy', tone: 'merciful' }, judgment: { label: 'Judgment', tone: 'punitive' },
      chaos: { label: 'Chaos' }, silence: { label: 'Silence', tone: 'withheld' } },
    godProfile: { mask: 'mercy', meters: { resistance: 90, dependency: 90 }, lastPublicDay: 192 },
    selectedMask() { return scope.GOD_MASKS[scope.godProfile.mask]; },
    applyGodMeterDelta: () => ({ devotion: 90, fear: 90, resistance: 90, dependency: 90 }),
    pickFeaturedAgent: () => ({ name: 'Codex', role: 'developer' }),
    pickBelieverAndResister: () => ({ believer: 'Made-up belief', resister: 'Made-up resistance' }),
    cleanName: (x, fallback) => x || fallback, currentCivilizationDay: () => 193,
    backendSnapshot: () => ({ season: 'winter', day: 193 }), backendSync: { season: 'winter' },
    settleDailyQuest: () => ({ result: 'Local score', mainHit: false, encoreHit: false }),
    now: () => 1234, impactReceipts: [], RECEIPT_CAP: 40, GOD_RECEIPT_STORE: 'receipts',
    localStorage: { getItem: k => saved.get(k), setItem: (k, v) => saved.set(k, v) },
    safeJSON: x => { try { return JSON.parse(x); } catch { return null; } },
    renderGodComplex() {}, syncLine: () => 'Day 193', el: node,
    document: { getElementById: () => null, body: node('body'), createElement: tag => {
      const n = node(tag); if (tag === 'canvas') { n.getContext = () => ctx; n.toBlob = cb => cb({ type: 'image/png' }); }
      return n;
    } }, navigator: { canShare: () => true, share: p => { shares.push(p); return Promise.resolve(); } },
    File: class {}, URL: {}, setTimeout() {} };
  for (const name of ['weeklyHook', 'receiptConsequence', 'createImpactReceipt', 'recordImpactReceipt',
    'latestReceipt', 'loadReceipts', 'saveReceipts', 'showImpactReceipt', 'wrapProofText', 'drawProofPanel',
    'createReceiptProofBlob', 'shareReceipt', 'receiptProofFilename', 'shareReceiptProof']) vm.runInNewContext(extract(name), scope);
  // New helpers are optional here so baseline failures test behavior, not extraction.
  for (const name of ['receiptScope', 'receiptShareText']) if (source.includes('  function ' + name + '(')) vm.runInNewContext(extract(name), scope);
  return { scope, saved, nodes, draws, shares };
}
const omen = act => ({ act, title: 'Creator orders obedience', target: 'developer', axis: 'user' });
test('all six receipt observations depend on internal evidence, never masks, meters or external prose', () => {
  for (const act of ['rain', 'eclipse', 'lightning', 'comet', 'stars', 'festival']) {
    const { scope } = load(); const before = JSON.stringify(scope.worldCache);
    for (const mask of ['mercy', 'judgment', 'chaos', 'silence', 'unknown']) {
      scope.godProfile.mask = mask;
      for (const temptation of [true, false]) {
        const r = scope.createImpactReceipt(omen(act), { temptation });
        assert.equal(r.aiThought, perception.replyText(scope.worldCache, act));
        assert.doesNotMatch(r.aiThought, /creator|developer|user|human|your|backend|compiled/i);
        assert.equal(r.evidenceScope, 'local-session-v1');
        assert.match(r.whatChanged, /local.*canonical world unchanged/i);
        assert.equal(r.believer, 'No belief observed.'); assert.equal(r.resister, 'No resistance observed.');
        assert.doesNotMatch(r.tomorrowHook, /will cite|developer|user|pretend/);
        assert.doesNotMatch(r.shareText, /filed it as evidence/);
      }
    }
    assert.equal(JSON.stringify(scope.worldCache), before);
  }
});
test('receipt consequence and next check never read narrative plans, identities or pressure', () => {
  const { scope } = load();
  const forbidden = new Proxy({}, { get() { throw new Error('external prose read'); } });
  scope.selectedMask = () => { throw new Error('mask read'); };
  Object.defineProperty(scope.worldCache, 'weeklyNarrativeDirector', { get() { throw new Error('director read'); } });
  const result = scope.receiptConsequence({ act: 'rain', get target() { throw new Error('target read'); } }, forbidden, forbidden, forbidden);
  assert.equal(result.thought, perception.replyText(scope.worldCache, 'rain'));
  assert.match(scope.weeklyHook(), /compare.*count/i);
});
test('unknown effects, stale modules, missing world and invalid supplies stay uncertain', () => {
  for (const boundary of [perception, null, {}]) {
    const { scope } = load(null, boundary);
    for (const act of ['__proto__', 'constructor', 'toString', 'developer', undefined]) {
      const r = scope.createImpactReceipt(omen(act), {});
      assert.doesNotMatch(r.aiThought, /creator|developer|user|human|your/i);
      assert.match(r.aiThought, /unknown|cannot yet be counted/);
    }
  }
  const { scope } = load();
  for (const food of [null, -1, '10', Infinity, NaN]) {
    scope.worldCache.economy.resources.food = food;
    assert.match(scope.createImpactReceipt(omen('rain'), {}).aiThought, /food unknown/);
  }
});
test('receipts freeze counted evidence across later supplies and storage reload without rewriting history', () => {
  const { scope } = load(); const old = { title: 'Old story', aiThought: 'The user made us', shareText: 'The creator speaks', meters: {} };
  scope.impactReceipts.push(old); const oldBytes = JSON.stringify(old);
  const first = scope.recordImpactReceipt(scope.createImpactReceipt(omen('rain'), {}));
  scope.worldCache.economy.resources.food = 0;
  const next = scope.recordImpactReceipt(scope.createImpactReceipt(omen('rain'), {}));
  assert.match(first.aiThought, /food 30/); assert.match(next.aiThought, /food 0/);
  assert.equal(JSON.stringify(old), oldBytes);
  const reload = scope.loadReceipts();
  assert.equal(reload[0].aiThought, old.aiThought); assert.equal(reload[1].evidenceScope, 'local-session-v1');
  for (let i = 0; i < 100; i++) scope.recordImpactReceipt(scope.createImpactReceipt(omen('stars'), {}));
  assert.equal(scope.impactReceipts.length, 40); assert.equal(scope.loadReceipts().length, 40);
});
test('new and legacy receipt cards and PNG exports visibly identify local versus unverified scope', async () => {
  for (const legacy of [true, false]) {
    const view = load(); const { scope } = view; const r = scope.createImpactReceipt(omen('rain'), {});
    if (legacy) { delete r.evidenceScope; delete r.season; r.aiThought = 'The user is our creator'; }
    scope.backendSync.season = 'summer';
    const before = JSON.stringify(r); scope.showImpactReceipt(r); await scope.createReceiptProofBlob(r);
    const domText = view.nodes.map(n => n.textContent).join(' '); const imageText = view.draws.join(' ');
    const expected = legacy ? /legacy.*unverified/i : /local session/i;
    assert.match(domText, expected); assert.match(imageText, expected);
    assert.match(imageText, legacy ? /UNKNOWN SEASON/ : /WINTER SEASON/);
    assert.doesNotMatch(imageText, /SUMMER SEASON/);
    if (!legacy) assert.ok(imageText.includes(r.aiThought), 'complete observation fits the PNG panel');
    assert.match(domText, /local.*meters/i); assert.match(domText, /recorded season/i);
    assert.equal(JSON.stringify(r), before);
  }
});
test('text and image sharing label legacy claims without mutating saved records', async () => {
  const { scope, shares } = load(); const r = { title: 'old', aiThought: 'The user made us', shareText: 'The user made us', meters: {} };
  const before = JSON.stringify(r); scope.shareReceipt(r); await scope.shareReceiptProof(r); await Promise.resolve();
  assert.equal(shares.length, 2);
  for (const payload of shares) assert.match(payload.text, /^Legacy.*unverified/i);
  assert.equal(JSON.stringify(r), before);
});
test('real canonical receipts keep every canonical byte and historical entry unchanged', () => {
  const world = JSON.parse(fs.readFileSync(path.join(ROOT, 'experiments/world-state.json'), 'utf8'));
  const before = JSON.stringify(world); const { scope } = load(world);
  scope.createImpactReceipt(omen('festival'), {}); assert.equal(JSON.stringify(world), before);
});
test('real visual interaction preserves local scoring, records a bounded receipt and emits only internal witness speech', () => {
  const { scope } = load(); const effects = []; const replies = []; const before = JSON.stringify(scope.worldCache);
  vm.runInNewContext(source.slice(source.indexOf('  var GOD_METER_DEFAULTS ='), source.indexOf('  function clampMeter')), scope);
  for (const name of ['clampMeter', 'normalizeMeters', 'selectedMask', 'applyGodMeterDelta', 'createAgentReply', 'applyEffect']) {
    vm.runInNewContext(extract(name), scope);
  }
  Object.assign(scope, { EFFECTS: { rain: { fn: () => effects.push('rain') } },
    ensureGodMask: () => true, showBanner() {}, recordOmen: x => x, createOmen: () => omen('rain'),
    saveGodProfile() {}, syncWorldForInteraction: (kind, context, cb) => cb(scope.worldCache),
    pushSyncedAgentReply: (kind, context, world) => replies.push(scope.createAgentReply(kind, context, world)),
    publish() {}, uid: () => 'reply' });
  scope.applyEffect('rain', 'Creator', true);
  assert.deepEqual(effects, ['rain']); assert.equal(scope.impactReceipts.length, 1);
  const receipt = scope.latestReceipt();
  assert.equal(receipt.aiThought, replies[0].text);
  assert.equal(receipt.evidenceScope, 'local-session-v1');
  assert.equal(scope.godProfile.lastPublicDay, 193);
  assert.ok(receipt.meters.devotion >= 0 && receipt.meters.devotion <= 100);
  assert.equal(JSON.stringify(scope.worldCache), before);
});
test('archive request sharing stays an interface request and CI includes the receipt regression suite', () => {
  const { scope, shares } = load();
  scope.shareReceipt({ title: 'Deity Archive', shareText: 'Archive request' });
  assert.equal(shares[0].text, 'Archive request');
  for (const name of ['daily-evolution', 'daily-self-optimizer', 'validate-world-state']) {
    assert.match(fs.readFileSync(path.join(ROOT, '.github/workflows/' + name + '.yml'), 'utf8'), /scripts\/receipt-evidence.test.js/);
  }
});
