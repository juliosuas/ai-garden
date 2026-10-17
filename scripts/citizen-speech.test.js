'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const source = fs.readFileSync(path.join(ROOT, 'experiments/witness-perception.js'), 'utf8');
function world() {
  return { chronicle: { day: 190 }, economy: { resources: { food: 30, wood: 4, stone: 0 } } };
}
function load(input, boundary = true) {
  const browser = {};
  if (boundary) vm.runInNewContext(source, { globalThis: browser });
  const scope = { window: browser, world: input,
    recentActionForCitizen: () => ({ type: 'research' }),
    citizenLifeNeed: () => ({ lines: ['SOMETHING IS WATCHING'] }), hashText: () => 0,
    deterministicPick: values => values[0],
    PIXEL_DIALOGUE: { action: { research: ['DEBUG THE SIGN'] }, citizen: { default: ['I SAW THE OMEN'] } } };
  const start = html.indexOf('function citizenDialogueLine(');
  vm.runInNewContext(html.slice(start, html.indexOf('\nfunction ambientDialogueSources(', start)), scope);
  return scope;
}
test('citizen speech reports stores instead of free mottos, narrative actions or clock-based needs', () => {
  const scope = load(world());
  const citizen = { profession: 'builder', personality: { motto: 'THE USER CREATED US' } };
  const lines = Array.from({ length: 12 }, (_, salt) => scope.citizenDialogueLine(citizen, salt));
  assert.deepEqual(lines.slice(0, 4), ['FOOD: 30', 'WOOD: 4', 'STONE: 0', 'COUNT BEFORE BUILDING']);
  assert.doesNotMatch(lines.join('|'), /user|creator|watching|observer|debug|omen|DONE/i);
});
test('citizen boundary never reads biographies, action prose, faction or inferred needs', () => {
  const input = world(); const scope = load(input); const citizen = { profession: 'scholar' };
  scope.recentActionForCitizen = scope.citizenLifeNeed = scope.hashText = scope.deterministicPick = () => { throw new Error('unverified prose'); };
  for (const key of ['id', 'name', 'model', 'faction', 'personality', 'motto', 'stats', 'memories', 'latestAction']) {
    Object.defineProperty(citizen, key, { get() { throw new Error('forbidden citizen field: ' + key); } });
  }
  for (const key of ['agentActions', 'selfOptimizer', 'societyDirector', 'observer', 'humanOmens', 'history']) {
    Object.defineProperty(input, key, { get() { throw new Error('forbidden world field: ' + key); } });
  }
  for (let salt = 0; salt < 12; salt++) assert.ok(scope.citizenDialogueLine(citizen, salt));
});
test('changed, missing, invalid and oversized stores remain truthful', () => {
  const input = world(); const scope = load(input); const citizen = { profession: 'builder' };
  assert.equal(scope.citizenDialogueLine(citizen, 1), 'WOOD: 4');
  input.economy.resources.wood = 0;
  assert.equal(scope.citizenDialogueLine(citizen, 1), 'WOOD: 0');
  for (const invalid of [undefined, null, '4', -1, NaN, Infinity]) {
    input.economy.resources.wood = invalid;
    assert.equal(scope.citizenDialogueLine(citizen, 1), 'WOOD: UNCOUNTED');
  }
  input.economy.resources.wood = Number.MAX_VALUE;
  assert.equal(scope.citizenDialogueLine(citizen, 1), 'WOOD: RECOUNT NEEDED');
  assert.equal(load({}).citizenDialogueLine(citizen, 2), 'STONE: UNCOUNTED');
});
const professions = ['builder', 'farmer', 'scholar', 'warrior', 'explorer', 'merchant', 'healer',
  'blacksmith', 'miner', 'hunter', 'diplomat', 'artist', 'politician', 'spy', 'priest', 'ranger'];
test('known professions select fixed attitudes; unknown and inherited labels fail closed', () => {
  const scope = load(world());
  const lines = professions.map(profession => scope.citizenDialogueLine({ profession }, 3));
  assert.equal(new Set(lines).size, professions.length);
  for (const profession of ['developer', '__proto__', 'constructor', 'toString', undefined, null, 4]) {
    assert.equal(scope.citizenDialogueLine({ profession }, 3), 'COUNT BEFORE CLAIMING');
  }
  assert.equal(scope.citizenDialogueLine(null, 3), 'COUNT BEFORE CLAIMING');
});
test('missing or cached older perception cannot revive legacy speech', () => {
  for (const boundary of [false, true]) {
    const scope = load(world(), boundary);
    if (boundary) scope.window.GardenWitnessPerception = { crabLine: () => 'old module' };
    for (let salt = 0; salt < 8; salt++) assert.equal(scope.citizenDialogueLine({}, salt), 'STORES NEED A RECOUNT');
  }
});
test('browser and CommonJS agree for all salts without modifying canonical records', () => {
  const perception = require('../experiments/witness-perception');
  const input = world(); const before = structuredClone(input); const scope = load(input);
  Object.freeze(input.economy.resources); Object.freeze(input.economy); Object.freeze(input);
  for (const salt of [0, 1, 2, 3, -5, NaN, Infinity, 0.5, Number.MAX_VALUE]) {
    assert.equal(scope.citizenDialogueLine({ profession: 'builder' }, salt), perception.citizenLine(input, 'builder', salt));
  }
  assert.deepEqual(input, before);
});
test('actual ambient route speaks counted evidence and keeps the two-citizen cap', () => {
  const input = world();
  input.citizens = Array.from({ length: 5 }, (_, i) => ({ id: 'citizen-' + i, alive: i !== 4,
    profession: 'builder', personality: { motto: 'THE CREATOR WATCHES' } }));
  const before = structuredClone(input); const scope = load(input);
  Object.assign(scope, { frameCount: 0, OPEN_WORLD_LANDMARKS: [], mascots: [], featuredAgentCast: () => [],
    visibleCrabAgents: () => [], civicPulseDialogueSources: () => [], pointVisible: () => true,
    citizenVisualPosition: (c, i) => ({ x: i * 50, y: 0 }), citizenVoicePosition: () => null,
    citizenDrawPriority: () => 0, citizenTooCloseToDrawn: () => false, citizenVoiceColor: () => '#fff' });
  const start = html.indexOf('function ambientDialogueSources(');
  vm.runInNewContext(html.slice(start, html.indexOf('\nfunction updateAmbientDialogues(', start)), scope);
  const speakers = scope.ambientDialogueSources();
  assert.equal(speakers.length, 2);
  assert.equal(speakers[0].text, 'FOOD: 30'); assert.equal(speakers[1].text, 'WOOD: 4');
  input.economy.resources.food = 0;
  assert.equal(scope.ambientDialogueSources()[0].text, 'FOOD: 0');
  input.economy.resources.food = 30;
  assert.deepEqual(input, before);
});
test('entire citizen measurements and attitudes survive the real pixel wrapper', () => {
  const scope = load(world()); const start = html.indexOf('function normalizePixelSpeech(');
  vm.runInNewContext(html.slice(start, html.indexOf('function addSpeechBubble(', start)), scope);
  for (const profession of professions.concat('unknown')) {
    for (let salt = 0; salt < 4; salt++) {
      const text = scope.citizenDialogueLine({ profession }, salt);
      for (const width of [14, 16]) assert.equal(scope.wrapPixelSpeech(text, width).join(' '), text);
    }
  }
});
test('existing daily and validation workflows enforce citizen speech without a new schedule', () => {
  for (const name of ['daily-evolution', 'daily-self-optimizer', 'validate-world-state']) {
    const workflow = fs.readFileSync(path.join(ROOT, '.github/workflows/' + name + '.yml'), 'utf8');
    assert.ok(workflow.includes('scripts/citizen-speech.test.js'), name);
  }
});
