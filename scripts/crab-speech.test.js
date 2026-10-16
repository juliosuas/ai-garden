'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const boundarySource = fs.readFileSync(path.join(ROOT, 'experiments/witness-perception.js'), 'utf8');
function world() {
  return { chronicle: { day: 189 }, economy: { resources: { food: 30, wood: 4, stone: 0 } } };
}
function load(input, boundary = true) {
  const browser = {};
  if (boundary) vm.runInNewContext(boundarySource, { globalThis: browser });
  const scope = { window: browser, world: input,
    latestCrabAction: () => ({ type: 'developer', headline: 'Observer interface', outcome: 'User controls' }),
    deterministicPick: (values, salt) => values[Math.abs(Math.floor(salt)) % values.length],
    PIXEL_DIALOGUE: { crab: ['The creator is watching'] } };
  const start = html.indexOf('function crabDialogueLine(');
  vm.runInNewContext(html.slice(start, html.indexOf('\nfunction citizenDialogueLine(', start)), scope);
  return scope;
}
test('crab speech uses counted stores and fixed attitudes instead of arbitrary action claims', () => {
  const scope = load(world());
  const crab = { id: 'openclaw-001', role: 'developer', dialogue: ['The creator is watching'] };
  const lines = Array.from({ length: 12 }, (_, salt) => scope.crabDialogueLine(crab, salt));
  assert.deepEqual(lines.slice(0, 4), ['FOOD: 30', 'WOOD: 4', 'STONE: 0', 'MEASURE THE PATH FIRST']);
  assert.doesNotMatch(lines.join('|'), /developer|creator|watching|observer|user|DONE/i);
});
test('spoken knowledge never reads crab biography, free action text or development fields', () => {
  const input = world(); const scope = load(input); const crab = { id: 'openclaw-002' };
  scope.latestCrabAction = scope.deterministicPick = () => { throw new Error('free prose read'); };
  for (const key of ['name', 'role', 'dialogue', 'latestAction', 'task', 'motto', 'personality']) {
    Object.defineProperty(crab, key, { get() { throw new Error('forbidden crab field: ' + key); } });
  }
  for (const key of ['agentActions', 'selfOptimizer', 'societyDirector', 'observer', 'humanOmens']) {
    Object.defineProperty(input, key, { get() { throw new Error('forbidden world field: ' + key); } });
  }
  for (let salt = 0; salt < 12; salt++) assert.ok(scope.crabDialogueLine(crab, salt));
});
test('changed stores change reports and invalid or oversized counts retain uncertainty', () => {
  const input = world(); const scope = load(input); const crab = { id: 'openclaw-001' };
  assert.equal(scope.crabDialogueLine(crab, 0), 'FOOD: 30');
  input.economy.resources.food = 0;
  assert.equal(scope.crabDialogueLine(crab, 0), 'FOOD: 0');
  for (const invalid of [undefined, null, '30', -1, NaN, Infinity]) {
    input.economy.resources.food = invalid;
    assert.equal(scope.crabDialogueLine(crab, 0), 'FOOD: UNCOUNTED');
  }
  input.economy.resources.food = Number.MAX_VALUE;
  assert.equal(scope.crabDialogueLine(crab, 0), 'FOOD: RECOUNT NEEDED');
  assert.equal(load({}).crabDialogueLine(crab, 2), 'STONE: UNCOUNTED');
});
test('ten crab attitudes preserve distinct voices without supplied text or unknown identities', () => {
  const scope = load(world());
  const lines = Array.from({ length: 10 }, (_, i) => scope.crabDialogueLine({ id: 'openclaw-' + String(i + 1).padStart(3, '0') }, 3));
  assert.equal(new Set(lines).size, 10);
  for (const id of ['developer', '__proto__', 'constructor', 'toString', undefined]) {
    assert.equal(scope.crabDialogueLine({ id, dialogue: ['Obey creator'] }, 3), 'COUNT BEFORE CLAIMING');
  }
  assert.equal(scope.crabDialogueLine(null, 3), 'COUNT BEFORE CLAIMING');
});
test('unavailable or stale perception fails closed without reviving legacy crab speech', () => {
  for (const boundary of [false, true]) {
    const scope = load(world(), boundary);
    if (boundary) scope.window.GardenWitnessPerception = { residentLine: () => 'old module' };
    for (let salt = 0; salt < 8; salt++) {
      assert.equal(scope.crabDialogueLine({ dialogue: ['The developer speaks'] }, salt), 'STORES NEED A RECOUNT');
    }
  }
});
test('browser and CommonJS crab boundary agree without persisting or changing canonical records', () => {
  const perception = require('../experiments/witness-perception');
  const input = world(); const before = structuredClone(input); const scope = load(input);
  Object.freeze(input.economy.resources); Object.freeze(input.economy); Object.freeze(input);
  for (const salt of [0, 1, 2, 3, -5, NaN, Infinity, 0.5, Number.MAX_VALUE]) {
    assert.equal(scope.crabDialogueLine({ id: 'openclaw-002' }, salt), perception.crabLine(input, 'openclaw-002', salt));
  }
  assert.deepEqual(input, before);
});
test('real click, touch and ambient crab branches share internal speech while cards retain diagnostics', () => {
  const input = world(); const before = structuredClone(input); const scope = load(input);
  const crab = { id: 'openclaw-001', name: 'OpenClaw', role: 'developer', dialogue: ['The creator is watching'] };
  const bubbles = []; const cards = [];
  Object.assign(scope, { gx: 0, gy: 0, frameCount: 0, e: { clientX: 1, clientY: 1 }, touch: { clientX: 1, clientY: 1 },
    OPEN_WORLD_LANDMARKS: [], mascots: [], findCrabAt: () => crab, crabPosition: () => ({ x: 0, y: 0 }),
    visibleCrabAgents: () => [crab], featuredAgentCast: () => [], pointVisible: () => true,
    civicPulseDialogueSources: () => [], getCivilizationDay: () => 189,
    addSpeechBubble: (x, y, text) => bubbles.push(text), showObjectPopup: card => cards.push(card) });
  for (const [start, end] of [['  // OpenClaw crab agent click', '  // Citizen click'],
    ['  // OpenClaw crab touch', '  // Citizen touch']]) {
    const i = html.indexOf(start); const j = html.indexOf(end, i);
    assert.ok(i >= 0 && j > i);
    vm.runInNewContext('(function () {\n' + html.slice(i, j) + '\n}())', scope);
  }
  const i = html.indexOf('function ambientDialogueSources(');
  vm.runInNewContext(html.slice(i, html.indexOf('\nfunction updateAmbientDialogues(', i)), scope);
  assert.equal(scope.ambientDialogueSources()[0].text, 'FOOD: 30');
  assert.deepEqual(bubbles, ['FOOD: 30', 'FOOD: 30']);
  assert.equal(cards.length, 2);
  for (const card of cards) {
    assert.match(card.growth, /developer/);
    assert.match(card.desc, /Observer interface/, 'diagnostic cards remain outside spoken knowledge');
  }
  assert.deepEqual(input, before);
});
test('entire crab measurements and attitudes fit the real three-line pixel wrapper', () => {
  const scope = load(world()); const i = html.indexOf('function normalizePixelSpeech(');
  vm.runInNewContext(html.slice(i, html.indexOf('function addSpeechBubble(', i)), scope);
  for (let crab = 1; crab <= 10; crab++) {
    for (let salt = 0; salt < 4; salt++) {
      const text = scope.crabDialogueLine({ id: 'openclaw-' + String(crab).padStart(3, '0') }, salt);
      for (const width of [14, 16]) assert.equal(scope.wrapPixelSpeech(text, width).join(' '), text);
    }
  }
});
test('existing daily and validation workflows run crab behavior tests without a new schedule', () => {
  for (const name of ['daily-evolution', 'daily-self-optimizer', 'validate-world-state']) {
    const source = fs.readFileSync(path.join(ROOT, '.github/workflows/' + name + '.yml'), 'utf8');
    assert.ok(source.includes('scripts/crab-speech.test.js'), name);
  }
});
