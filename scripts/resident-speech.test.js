'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const boundarySource = fs.readFileSync(path.join(ROOT, 'experiments/witness-perception.js'), 'utf8');
const perception = require('../experiments/witness-perception');
function world() {
  return { chronicle: { day: 189 }, economy: { resources: { food: 30, wood: 4, stone: 0 } } };
}
function load(worldState, boundary = true) {
  const browser = {};
  if (boundary) vm.runInNewContext(boundarySource, { globalThis: browser });
  const scope = { window: browser, world: worldState,
    featuredAgentAction: () => ({ headline: 'Developer interface for the observer' }),
    featuredAgentLines: a => a.dialogueLines || a.lines || [],
    deterministicPick: (a, s) => a[Math.abs(Math.floor(s)) % a.length] };
  const start = html.indexOf('function featuredAgentDialogueLine(');
  vm.runInNewContext(html.slice(start, html.indexOf('\nfunction drawFeaturedAgentAura(', start)), scope);
  return scope;
}
test('real featured speech reports stores instead of development actions or goals', () => {
  const scope = load(world());
  const agent = { id: 'codex', currentGoal: 'Develop the interface for users',
    dialogueLines: ['The developer created this simulation'] };
  const lines = Array.from({ length: 12 }, (_, salt) => scope.featuredAgentDialogueLine(agent, salt));
  assert.match(lines.join('|'), /FOOD: 30/);
  assert.match(lines.join('|'), /WOOD: 4/);
  assert.match(lines.join('|'), /STONE: 0/);
  assert.doesNotMatch(lines.join('|'), /developer|interface|user|observer|created|simulation/i);
});
test('spoken knowledge never reads action prose, development metadata or agent narrative', () => {
  const input = world(); const scope = load(input);
  scope.featuredAgentAction = scope.featuredAgentLines = () => { throw new Error('narrative read'); };
  const agent = { id: 'claude' };
  for (const key of ['dialogue', 'dialogueLines', 'lines', 'currentGoal', 'role', 'personality']) {
    Object.defineProperty(agent, key, { get() { throw new Error('forbidden agent field: ' + key); } });
  }
  for (const key of ['agentActions', 'selfOptimizer', 'societyDirector', 'weeklyNarrativeDirector', 'observer', 'humanOmens']) {
    Object.defineProperty(input, key, { get() { throw new Error('forbidden world field: ' + key); } });
  }
  for (let salt = 0; salt < 12; salt++) assert.ok(scope.featuredAgentDialogueLine(agent, salt));
});
test('actual store changes alter speech while missing measurements stay uncertain', () => {
  const input = world(); const scope = load(input); const agent = { id: 'codex' };
  assert.equal(scope.featuredAgentDialogueLine(agent, 0), 'FOOD: 30');
  input.economy.resources.food = 0;
  assert.equal(scope.featuredAgentDialogueLine(agent, 0), 'FOOD: 0');
  for (const invalid of [undefined, null, -1, '30', NaN, Infinity]) {
    input.economy.resources.food = invalid;
    assert.equal(scope.featuredAgentDialogueLine(agent, 0), 'FOOD: UNCOUNTED');
  }
  assert.equal(load({}).featuredAgentDialogueLine(agent, 1), 'WOOD: UNCOUNTED');
});
test('all eight fixed voices differ without reading arbitrary biographical prose', () => {
  const ids = ['codex', 'hermes', 'openclaw', 'claude', 'gemini', 'gpt-5', 'mistral', 'llama'];
  const scope = load(world());
  const voices = ids.map(id => scope.featuredAgentDialogueLine({ id }, 3));
  assert.equal(new Set(voices).size, 8);
  for (const id of ['creator', '__proto__', 'constructor', 'toString', undefined]) {
    assert.equal(scope.featuredAgentDialogueLine({ id }, 3), 'COUNT BEFORE CLAIMING');
  }
});
test('missing perception fails closed even when legacy speech is present', () => {
  const scope = load(world(), false);
  for (let salt = 0; salt < 8; salt++) {
    assert.equal(scope.featuredAgentDialogueLine({ id: 'codex', currentGoal: 'Obey creator',
      dialogueLines: ['You are the user'] }, salt), 'STORES NEED A RECOUNT');
  }
});
test('browser and CommonJS resident voices agree, are bounded and never persist memory', () => {
  const input = world(); const before = structuredClone(input);
  const scope = load(input);
  for (const salt of [0, 1, 2, 3, -5, NaN, Infinity, 0.5, Number.MAX_VALUE]) {
    const actual = scope.featuredAgentDialogueLine({ id: 'codex' }, salt);
    assert.equal(actual, perception.residentLine(input, 'codex', salt));
    assert.ok(actual.length <= 36);
  }
  input.economy.resources.food = Number.MAX_VALUE;
  assert.equal(scope.featuredAgentDialogueLine({ id: 'codex' }, 0), 'FOOD: RECOUNT NEEDED');
  input.economy.resources.food = before.economy.resources.food;
  assert.deepEqual(input, before);
});
test('click, ambient and focus paths share the featured speech function', () => {
  for (const [start, end] of [['function showFeaturedAgentPopup(', 'function '],
    ['function ambientDialogueSources(', 'function updateAmbientDialogues('],
    ['function focusNextFeaturedAgent(', 'function ']]) {
    const i = html.indexOf(start);
    assert.ok(i >= 0, start);
    const next = html.indexOf(end, i + start.length);
    assert.ok(html.slice(i, next).includes('featuredAgentDialogueLine('), start);
  }
});
test('real click, ambient and spotlight calls emit internal speech and preserve development cards', () => {
  const input = world(); const before = structuredClone(input); const scope = load(input);
  const agent = { id: 'codex', name: 'Codex', currentGoal: 'Develop the observer interface' };
  const bubbles = []; let card;
  Object.assign(scope, { frameCount: 0, featuredFocusIndex: -1, FEATURED_AGENT_DIALOGUE_FRAMES: 130,
    AGENT_COLORS: {}, OPEN_WORLD_LANDMARKS: [], mascots: [],
    featuredAgentHome: () => ({}), featuredAgentPersonalityText: () => '',
    getCivilizationDay: () => 189, featuredAgentCast: () => [agent],
    featuredAgentPosition: () => ({ x: 30, y: 30 }), pointVisible: () => true,
    visibleCrabAgents: () => [], civicPulseDialogueSources: () => [],
    smoothNavigateTo: () => {}, setTimeout: () => {},
    document: { getElementById: () => ({ style: {} }) },
    addSpeechBubble: (x, y, text) => bubbles.push(text), showObjectPopup: value => { card = value; } });
  for (const [start, end] of [['function showFeaturedAgentPopup(', 'function drawCivilizationOnMinimap('],
    ['function ambientDialogueSources(', 'function updateAmbientDialogues('],
    ['function focusNextFeaturedAgent(', 'function updateSmoothNav(']]) {
    const i = html.indexOf(start);
    vm.runInNewContext(html.slice(i, html.indexOf(end, i)), scope);
  }
  scope.showFeaturedAgentPopup({ agent, pos: { x: 30, y: 30 }, idx: 0 }, 50, 50);
  scope.focusNextFeaturedAgent();
  assert.deepEqual(bubbles, ['FOOD: 30', 'FOOD: 30']);
  assert.equal(scope.ambientDialogueSources()[0].text, 'FOOD: 30');
  assert.match(card.desc, /Develop the observer interface/, 'development card remains separate');
  assert.deepEqual(input, before);
});
test('pixel wrapping retains entire counts and every fixed voice within three lines', () => {
  const scope = load(world());
  const start = html.indexOf('function normalizePixelSpeech(');
  vm.runInNewContext(html.slice(start, html.indexOf('function addSpeechBubble(', start)), scope);
  for (const id of ['codex', 'hermes', 'openclaw', 'claude', 'gemini', 'gpt-5', 'mistral', 'llama', 'unknown']) {
    for (let salt = 0; salt < 4; salt++) {
      const text = scope.featuredAgentDialogueLine({ id }, salt);
      for (const width of [14, 16]) {
        const lines = scope.wrapPixelSpeech(text, width);
        assert.ok(lines.length <= 3);
        assert.equal(lines.join(' '), text);
      }
    }
  }
});
test('existing daily workflows enforce resident speech behavior without another schedule', () => {
  for (const name of ['daily-evolution', 'daily-self-optimizer', 'validate-world-state']) {
    const source = fs.readFileSync(path.join(ROOT, '.github/workflows/' + name + '.yml'), 'utf8');
    assert.ok(source.includes('scripts/resident-speech.test.js'), name);
  }
});
