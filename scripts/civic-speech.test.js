'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const boundary = fs.readFileSync(path.join(ROOT, 'experiments/witness-perception.js'), 'utf8');
function world() {
  return { chronicle: { day: 192 }, economy: { resources: { food: 30, wood: 4, stone: 0 } } };
}
function addFunction(scope, name) {
  const start = html.indexOf('function ' + name + '(');
  vm.runInNewContext(html.slice(start, html.indexOf('\n}', start) + 2), scope);
}
function load(input, available = true) {
  const browser = {};
  if (available) vm.runInNewContext(boundary, { globalThis: browser });
  const scope = { window: browser, world: input, frameCount: 0,
    compactTickerText: text => text, hashText: () => 0, pointVisible: () => true,
    getCivilizationView: () => ({ districts: [{ regionId: 'grove', x: 80, y: 60, scale: 12, color: '#fff' }] }) };
  for (const name of ['civicPulseAnchor', 'civicPulseText', 'civicPulseDialogueSources']) addFunction(scope, name);
  return scope;
}
test('civic speech reports stores instead of claiming a narrative public work', () => {
  const input = world();
  input.landscapeEvents = [{ id: 'a', region: 'grove', form: 'THE USER CREATED US', visibleChange: 'PATCH APPLIED' }];
  const scope = load(input);
  const lines = [0, 180, 360, 540].map(frame => {
    scope.frameCount = frame;
    return scope.civicPulseDialogueSources()[0].text;
  });
  assert.deepEqual(lines, ['FOOD: 30', 'WOOD: 4', 'STONE: 0', 'HEAR BOTH ACCOUNTS FIRST']);
  assert.doesNotMatch(lines.join('|'), /user|creator|observer|patch|PUBLIC WORK|DONE/i);
});
test('actual civic source path never reads narrative prose or development plans', () => {
  const input = world(); const event = { id: 'a', region: 'grove' };
  for (const key of ['form', 'visibleChange', 'mood', 'headline', 'consequence', 'whyItMatters']) {
    Object.defineProperty(event, key, { get() { throw new Error('unverified event: ' + key); } });
  }
  for (const key of ['selfOptimizer', 'societyDirector', 'agentActions', 'humanOmens', 'observer', 'history']) {
    Object.defineProperty(input, key, { get() { throw new Error('forbidden world: ' + key); } });
  }
  input.landscapeEvents = [event];
  const scope = load(input);
  for (let frame = 0; frame < 720; frame += 180) {
    scope.frameCount = frame; assert.equal(scope.civicPulseDialogueSources().length, 1);
  }
  // Fallback placement cannot inspect headline/change either.
  event.region = 'unknown'; delete event.id;
  assert.equal(scope.civicPulseDialogueSources().length, 1);
});
test('convivencia scenes use the same boundary without rewriting the old accounts', () => {
  const input = world();
  input.convivenciaEvents = [{ id: 'social-a', region: 'grove', form: 'compiled a patch',
    headline: 'THE OBSERVER WATCHES', consequence: 'THE CREATOR SENT A SIGN' }];
  const before = structuredClone(input); const scope = load(input);
  scope.frameCount = 360;
  assert.equal(scope.civicPulseDialogueSources()[0].text, 'STONE: 0');
  input.economy.resources.stone = 2;
  assert.equal(scope.civicPulseDialogueSources()[0].text, 'STONE: 2');
  input.economy.resources.stone = 0;
  assert.deepEqual(input, before);
});
test('measurements follow live stores; invalid and oversized counts remain uncertain', () => {
  const input = world(); const scope = load(input);
  assert.equal(scope.civicPulseText(1), 'WOOD: 4');
  input.economy.resources.wood = 0;
  assert.equal(scope.civicPulseText(1), 'WOOD: 0');
  for (const value of [undefined, null, '4', -1, NaN, Infinity]) {
    input.economy.resources.wood = value;
    assert.equal(scope.civicPulseText(1), 'WOOD: UNCOUNTED');
  }
  input.economy.resources.wood = Number.MAX_VALUE;
  assert.equal(scope.civicPulseText(1), 'WOOD: RECOUNT NEEDED');
  assert.equal(load({}).civicPulseText(2), 'STONE: UNCOUNTED');
});
test('missing or cached older perception cannot restore narrative speech', () => {
  for (const available of [false, true]) {
    const scope = load(world(), available);
    if (available) scope.window.GardenWitnessPerception = { mascotLine: () => 'old module' };
    assert.equal(scope.civicPulseText(0), 'STORES NEED A RECOUNT');
  }
});
test('civic speech cannot accept arbitrary or inherited event wording as evidence', () => {
  const scope = load(world());
  for (const value of [{ form: 'THE CREATOR WATCHES' }, '__proto__', 'constructor', null, undefined, NaN, Infinity, 0.5]) {
    assert.equal(scope.civicPulseText(value), 'FOOD: 30');
  }
});
test('real ambient delivery keeps visibility, two-source cap and cooldown', () => {
  const input = world(); const before = structuredClone(input);
  input.landscapeEvents = [0, 1, 2].map(i => ({ id: 'land-' + i, region: 'grove', form: 'PATCH ' + i }));
  input.convivenciaEvents = [0, 1, 2].map(i => ({ id: 'social-' + i, region: 'grove', consequence: 'THE DEVELOPER SPOKE' }));
  const saved = structuredClone(input); const scope = load(input); const bubbles = [];
  Object.assign(scope, { OPEN_WORLD_LANDMARKS: [], mascots: [], featuredAgentCast: () => [], visibleCrabAgents: () => [],
    worldReady: true, ambientDialogueCooldown: 0, speechBubbles: [], lastAmbientDialogueSpeaker: '',
    getCivilizationDay: () => 192, addSpeechBubble: (x, y, text, color, options) => bubbles.push({ x, y, text, options }) });
  addFunction(scope, 'ambientDialogueSources'); addFunction(scope, 'updateAmbientDialogues');
  const sources = scope.ambientDialogueSources();
  assert.equal(sources.length, 2);
  assert.deepEqual(Array.from(sources, s => s.id), ['civic-land-1', 'civic-land-2']);
  assert.deepEqual(Array.from(sources, s => s.text), ['FOOD: 30', 'WOOD: 4']);
  assert.equal(sources[0].x, 72); assert.equal(sources[0].y, 36);
  scope.updateAmbientDialogues(); scope.updateAmbientDialogues();
  assert.equal(bubbles.length, 1); assert.equal(scope.ambientDialogueCooldown, 189);
  scope.speechBubbles = [{}, {}]; scope.ambientDialogueCooldown = 0; scope.updateAmbientDialogues();
  assert.equal(bubbles.length, 1); assert.equal(scope.ambientDialogueCooldown, 90);
  scope.pointVisible = () => false;
  assert.equal(scope.civicPulseDialogueSources().length, 0);
  scope.pointVisible = () => true; scope.getCivilizationView = () => ({ districts: [] });
  assert.equal(scope.civicPulseDialogueSources().length, 0);
  assert.deepEqual(input, saved);
  assert.deepEqual(input.economy, before.economy);
});
test('browser and CommonJS agree and preserve canonical records across reloads', () => {
  const input = world(); const before = structuredClone(input); const scope = load(input);
  const api = require('../experiments/witness-perception');
  Object.freeze(input.economy.resources); Object.freeze(input.economy); Object.freeze(input);
  for (const salt of [0, 1, 2, 3, -5, NaN, Infinity, 0.5, Number.MAX_VALUE]) {
    assert.equal(scope.civicPulseText(salt), api.civicLine(input, salt));
    assert.equal(scope.civicPulseText(salt), load(JSON.parse(JSON.stringify(input))).civicPulseText(salt));
  }
  assert.deepEqual(input, before);
});
test('complete civic measurements and attitude fit the real pixel wrapper', () => {
  const scope = load(world());
  addFunction(scope, 'normalizePixelSpeech'); addFunction(scope, 'wrapPixelSpeech');
  for (let salt = 0; salt < 4; salt++) {
    const text = scope.civicPulseText(salt);
    for (const width of [14, 16]) assert.equal(scope.wrapPixelSpeech(text, width).join(' '), text);
  }
});
test('existing daily and validation workflows enforce civic behavior without new schedules', () => {
  for (const name of ['daily-evolution', 'daily-self-optimizer', 'validate-world-state']) {
    assert.ok(fs.readFileSync(path.join(ROOT, '.github/workflows/' + name + '.yml'), 'utf8').includes('scripts/civic-speech.test.js'), name);
  }
});
