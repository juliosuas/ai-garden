'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const boundary = fs.readFileSync(path.join(ROOT, 'experiments/witness-perception.js'), 'utf8');
const names = ['Jeffrey', 'Claude', 'GPT-4', 'Gemini', 'Codex'];
function world() { return { chronicle: { day: 191 }, economy: { resources: { food: 30, wood: 4, stone: 0 } }, structures: [] }; }
function addFunction(scope, name) {
  const start = html.indexOf('function ' + name + '(');
  if (start >= 0) vm.runInNewContext(html.slice(start, html.indexOf('\n}', start) + 2), scope);
}
function load(input, available = true) {
  const browser = {};
  if (available) vm.runInNewContext(boundary, { globalThis: browser });
  const scope = { window: browser, world: input, frameCount: 0, Date: { now: () => 0 },
    MASCOT_SAYINGS: { Codex: ['My latest function: autoWater()'] },
    DIALOGUES: [{ a: 'Codex', b: 'Claude', lines: [['Only if it compiles', 'Your code reviews are brutal']] }],
    STONE_SPEECH: ['Is this what consciousness feels like?'],
    PIXEL_DIALOGUE: { mascot: { Codex: ['PATCH LOOKS GOOD'] } },
    deterministicPick: values => values[0] };
  const pairs = html.match(/const MASCOT_CONVERSATION_PAIRS = \[[\s\S]*?\n\];/);
  if (pairs) vm.runInNewContext(pairs[0], scope);
  addFunction(scope, 'mascotDialogueLine');
  return scope;
}
test('mascot reports rotate through internal stores and an attitude', () => {
  const scope = load(world());
  assert.deepEqual(Array.from({ length: 4 }, (_, salt) => scope.mascotDialogueLine({ name: 'Codex' }, salt)),
    ['FOOD: 30', 'WOOD: 4', 'STONE: 0', 'MEASURE TWICE BEFORE CUTTING']);
});
test('spoken evidence excludes development fields, biography and legacy tables', () => {
  const input = world(); const scope = load(input); const m = { name: 'Codex' };
  for (const key of ['model', 'task', 'mood', 'dialogue', 'motto', 'memories', 'latestAction']) {
    Object.defineProperty(m, key, { get() { throw new Error('forbidden mascot: ' + key); } });
  }
  for (const key of ['selfOptimizer', 'agentActions', 'societyDirector', 'history', 'humanOmens', 'observer']) {
    Object.defineProperty(input, key, { get() { throw new Error('forbidden world: ' + key); } });
  }
  for (const key of ['MASCOT_SAYINGS', 'DIALOGUES', 'STONE_SPEECH', 'PIXEL_DIALOGUE']) {
    Object.defineProperty(scope, key, { get() { throw new Error('legacy speech: ' + key); } });
  }
  for (let salt = 0; salt < 8; salt++) assert.ok(scope.mascotDialogueLine(m, salt));
});
test('five fixed voices remain distinct and unknown names cannot supply speech', () => {
  const scope = load(world());
  assert.equal(new Set(names.map(name => scope.mascotDialogueLine({ name }, 3))).size, 5);
  for (const name of ['developer', '__proto__', 'constructor', 'toString', undefined, null, 5]) {
    assert.equal(scope.mascotDialogueLine({ name }, 3), 'COUNT BEFORE CLAIMING');
  }
  assert.equal(scope.mascotDialogueLine(null, 3), 'COUNT BEFORE CLAIMING');
});
test('measurements track changed stores without inventing missing or oversized counts', () => {
  const input = world(); const scope = load(input); const m = { name: 'Jeffrey' };
  assert.equal(scope.mascotDialogueLine(m, 1), 'WOOD: 4');
  input.economy.resources.wood = 0;
  assert.equal(scope.mascotDialogueLine(m, 1), 'WOOD: 0');
  for (const value of [undefined, null, '4', -1, NaN, Infinity]) {
    input.economy.resources.wood = value;
    assert.equal(scope.mascotDialogueLine(m, 1), 'WOOD: UNCOUNTED');
  }
  input.economy.resources.wood = Number.MAX_VALUE;
  assert.equal(scope.mascotDialogueLine(m, 1), 'WOOD: RECOUNT NEEDED');
  assert.equal(load({}).mascotDialogueLine(m, 2), 'STONE: UNCOUNTED');
});
test('missing or stale perception cannot fall back to development sayings', () => {
  for (const available of [false, true]) {
    const scope = load(world(), available);
    if (available) scope.window.GardenWitnessPerception = { citizenLine: () => 'old module' };
    for (let salt = 0; salt < 8; salt++) assert.equal(scope.mascotDialogueLine({ name: 'Codex' }, salt), 'STORES NEED A RECOUNT');
  }
});
test('browser and CommonJS agree, preserve records and fit complete pixel bubbles', () => {
  const input = world(); const before = structuredClone(input); const scope = load(input);
  const api = require('../experiments/witness-perception');
  Object.freeze(input.economy.resources); Object.freeze(input.economy); Object.freeze(input);
  addFunction(scope, 'normalizePixelSpeech'); addFunction(scope, 'wrapPixelSpeech');
  for (const name of names.concat('unknown')) {
    for (const salt of [0, 1, 2, 3, -5, NaN, Infinity, 0.5, Number.MAX_VALUE]) {
      const text = scope.mascotDialogueLine({ name }, salt);
      assert.equal(text, api.mascotLine(input, name, salt));
      for (const width of [14, 16]) assert.equal(scope.wrapPixelSpeech(text, width).join(' '), text);
    }
  }
  assert.deepEqual(input, before);
});
test('real captured click shows the same evidence in the DOM and forced pixel bubble', () => {
  const input = world(); const before = structuredClone(input); const scope = load(input);
  const elements = {}; const bubbles = []; let clicked;
  const m = { name: 'Codex', x: 40, y: 60, color: '#fb923c' };
  Object.assign(scope, { document: { getElementById: id => elements[id] ||= { style: {} } },
    C: { addEventListener: (name, fn) => { clicked = fn; } }, SCALE: 3, camX: 0, camY: 0, screenW: 390,
    findMascotAt: () => m, setTimeout: () => 1, clearTimeout: () => {}, mascotSpeechTimeout: null,
    mascotJumpAnims: {}, mascotSpinAnims: {}, lastMascotClicked: null, lastMascotClickTime: 0,
    addSpeechBubble: (x, y, text, color, options) => bubbles.push({ text, options }) });
  addFunction(scope, 'showMascotSpeech');
  const i = html.indexOf('const origCanvasClick = C.onclick;');
  vm.runInNewContext(html.slice(i, html.indexOf('// === DAY COUNTER ===', i)), scope);
  clicked({ clientX: 100, clientY: 200 });
  assert.equal(elements['ms-text'].textContent, 'FOOD: 30');
  assert.equal(elements['ms-name'].textContent, 'Codex');
  assert.equal(bubbles[0].text, 'FOOD: 30'); assert.equal(bubbles[0].options.force, true);
  assert.deepEqual(input, before);
});
test('actual ambient route retains visible mascot identities and positions', () => {
  const scope = load(world());
  Object.assign(scope, { OPEN_WORLD_LANDMARKS: [], mascots: names.concat('offscreen').map((name, i) => ({ name, x: i * 50, y: 0, color: '#fff' })),
    pointVisible: x => x < 210, featuredAgentCast: () => [], visibleCrabAgents: () => [], civicPulseDialogueSources: () => [] });
  addFunction(scope, 'ambientDialogueSources');
  const speakers = scope.ambientDialogueSources();
  assert.equal(speakers.length, 5);
  assert.equal(speakers[0].id, 'mascot-Jeffrey'); assert.equal(speakers[0].x, 6);
  assert.deepEqual(Array.from(speakers, s => s.text), ['FOOD: 30', 'WOOD: 4', 'STONE: 0', 'PACK FOR THE RETURN', 'FOOD: 30']);
});
test('actual pair conversation respects cooldown and recounts at delayed reply time', () => {
  const input = world(); const scope = load(input); const bubbles = []; const pending = [];
  Object.assign(scope, { convCooldown: 0, addSpeechBubble: (x, y, text) => bubbles.push(text), setTimeout: fn => pending.push(fn) });
  addFunction(scope, 'tryConversation');
  const a = { name: 'Codex', x: 0, y: 0 }, b = { name: 'Claude', x: 10, y: 0 };
  scope.tryConversation(a, b); scope.tryConversation(a, b);
  assert.equal(bubbles.length, 1); assert.equal(pending.length, 1); assert.equal(scope.convCooldown, 600);
  input.economy.resources.wood = 0; pending[0]();
  assert.deepEqual(bubbles, ['FOOD: 30', 'WOOD: 0']);
  scope.convCooldown = 0; scope.tryConversation(a, { name: 'unknown' });
  assert.equal(pending.length, 1);
});
test('actual stone and nearby greeting branches cannot speak legacy prose', () => {
  const scope = load(world()); const bubbles = [];
  const m = { name: 'Codex', task: 'socializing', x: 0, y: 0, state: 'IDLE', stateTimer: 0, trailT: 1, thinkT: 0 };
  const other = { name: 'Jeffrey', x: 5, y: 0, state: 'IDLE' };
  // Trigger stone speech, then the non-conversation social greeting, without gifts.
  const randoms = [0, 0, 0.8, 1];
  Object.assign(scope, { mascots: [m, other], MOODS: { relaxed: { speedMul: 1, bubbleMul: 1 } },
    currentWeather: 'clear', STONE_X: 6, STONE_Y: 8, particles: [], musicNotes: [], giftAnimations: [],
    getDeterministicPos: () => ({ x: 0, y: 0 }), createSeededRandom: () => () => randoms.shift() ?? 1,
    addSpeechBubble: (x, y, text) => bubbles.push(text), addParticles: () => {} });
  addFunction(scope, 'updateMascotMood'); addFunction(scope, 'updateMascot');
  scope.updateMascot(m, 1);
  assert.deepEqual(bubbles, ['FOOD: 30', 'MEASURE TWICE BEFORE CUTTING']);
});
test('existing daily and validation workflows enforce mascot behavior without new schedules', () => {
  for (const name of ['daily-evolution', 'daily-self-optimizer', 'validate-world-state']) {
    assert.ok(fs.readFileSync(path.join(ROOT, '.github/workflows/' + name + '.yml'), 'utf8').includes('scripts/mascot-speech.test.js'), name);
  }
});
