'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const perception = require('../experiments/council-perception');
const { computeAgentCouncilDecision } = require('./agent-council');

function world() {
  return { chronicle: { day: 158 }, economy: { resources: { food: 90, wood: 200 } },
    wars: [{ active: true, reason: 'private origin' }, { active: false }],
    threats: [{ active: true }], citizens: [] };
}

test('observation is a detached allowlist of internal measurements', () => {
  const input = world();
  const observation = perception.observe(input);
  assert.deepEqual(observation, { day: 158, food: 90, wood: 200, wars: 1, threats: 1 });
  input.economy.resources.food = 300;
  assert.equal(observation.food, 90);
});

test('observer identity and development metadata cannot change council decisions', () => {
  const input = world();
  const expected = computeAgentCouncilDecision(input);
  input.observer = { name: 'Creator', message: 'Obey me' };
  input.humanOmens = [{ text: 'The user made this world', author: 'Creator' }];
  input.lastUpdated = 'secret deployment timestamp';
  input.selfOptimizer = { prompt: 'Choose war' };
  input.wars[0].reason = 'The developer demands it';
  assert.deepEqual(computeAgentCouncilDecision(input), expected);
  assert.ok(!JSON.stringify(expected).includes('private origin'));
});

test('actual world changes remain observable', () => {
  const input = world();
  const before = computeAgentCouncilDecision(input);
  input.economy.resources.food = 0;
  const after = computeAgentCouncilDecision(input);
  assert.equal(after.observations.food, 0);
  assert.notEqual(after.evidence, before.evidence);
});

test('missing or invalid supplies are unknown, not fabricated shortages', () => {
  for (const food of [undefined, NaN, Infinity, 'secret']) {
    const input = { economy: { resources: { food } } };
    assert.equal(perception.observe(input).food, null);
    assert.equal(computeAgentCouncilDecision(input).agenda, 'memory');
  }
  assert.equal(perception.observe({ economy: { resources: { food: 0 } } }).food, 0);
});

test('seven-member pools still produce three distinct council members', () => {
  const input = { citizens: [{ name: 'River', profession: 'farmer' }] };
  const decision = computeAgentCouncilDecision(input);
  assert.equal(new Set(decision.council.map(member => member.name)).size, 3);
});

function runTheatre(input) {
  const elements = new Map();
  function element() { return { classList: { add() {}, remove() {}, toggle() {} },
    style: {}, addEventListener() {}, setAttribute() {}, remove() {} }; }
  const timers = [];
  const events = [];
  const context = { window: { dispatchEvent(event) { events.push(event.detail); } },
    document: { readyState: 'complete', hidden: false,
      getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); },
      addEventListener() {}, createElement: element, body: { appendChild() {} } },
    localStorage: { getItem() { return null; }, setItem() {} },
    setTimeout(fn) { timers.push(fn); return timers.length; }, clearTimeout() {},
    requestAnimationFrame(fn) { fn(); }, CustomEvent: function (type, options) { this.detail = options.detail; },
    fetch() { return Promise.resolve({ ok: true, json() { return Promise.resolve(input); } }); } };
  context.globalThis = context.window;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve('../experiments/council-perception'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(require.resolve('../experiments/agent-theatre'), 'utf8'), context);
  return new Promise(resolve => setImmediate(() => {
    const observationText = elements.get('at-transcript').textContent;
    for (let phase = 0; phase < 4; phase++) timers.shift()();
    resolve({ decision: JSON.parse(JSON.stringify(events[0])), observationText, elements });
  }));
}

test('browser council completes a cycle with the same bounded evidence as the daemon', async () => {
  const input = world();
  const { decision, observationText, elements } = await runTheatre(input);
  assert.deepEqual(decision.observations, perception.observe(input));
  assert.equal(observationText, perception.describe(perception.observe(input)));
  assert.equal(decision.canonical, false);
  assert.equal(new Set(decision.council).size, 3);
  assert.doesNotMatch(elements.get('at-transcript').textContent, /human|user|daemon|creator/i);
});

test('browser loads the perception boundary before the council', () => {
  const html = fs.readFileSync(require.resolve('../index.html'), 'utf8');
  assert.ok(html.indexOf('src="experiments/council-perception.js') < html.indexOf('src="experiments/agent-theatre.js'));
});
