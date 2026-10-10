'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const perception = require('../experiments/council-perception');
const { computeAgentCouncilDecision, refreshAgentCouncil } = require('./agent-council');

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

test('the council can count reserved wood separately from freely available timber', () => {
  const input = world();
  input.economy.repairReserveWood = 12;
  const view = perception.observe(input);
  assert.equal(view.wood, 200);
  assert.equal(view.reserveWood, 12);
  assert.match(perception.describe(view), /wood 200; repair reserve 12/);
  input.economy.repairReserveWood = 'private instruction';
  assert.equal(perception.observe(input).reserveWood, null);
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

function recordedWorld() {
  const input = world();
  input.history = [{ day: 158, events: [{ kind: 'harvest', headline: 'The pantry is counted.' }] }];
  return input;
}

test('same-day refresh preserves the recorded decision and all three memory surfaces', () => {
  const input = recordedWorld();
  const first = structuredClone(refreshAgentCouncil(input));
  const actions = structuredClone(input.agentActions);
  const history = structuredClone(input.history);
  input.economy.resources.food = 300;
  input.wars = [];
  input.threats = [];
  input.citizens = [{ name: 'River', profession: 'farmer' }];
  assert.notDeepEqual(computeAgentCouncilDecision(input), first, 'a fresh preview should see new evidence');
  for (let repeat = 0; repeat < 10; repeat++) {
    assert.deepEqual(refreshAgentCouncil(input), first);
    assert.deepEqual(input.agentCouncil, first);
    assert.deepEqual(input.agentActions, actions);
    assert.deepEqual(input.history, history);
  }
  assert.equal(input.chronicle.day, 158);
  assert.equal(input.economy.resources.food, 300, 'recording memory must not undo a resource change');
});

test('next dawn records fresh internal evidence and leaves the previous chronicle intact', () => {
  const input = recordedWorld();
  const first = structuredClone(refreshAgentCouncil(input));
  const history = structuredClone(input.history[0]);
  const action = structuredClone(input.agentActions[0]);
  input.chronicle.day++;
  input.history.push({ day: 159, events: [] });
  input.economy.resources.food = 300;
  input.wars = [];
  input.threats = [];
  const next = refreshAgentCouncil(input);
  assert.equal(next.id, 'canonical-council-159');
  assert.equal(next.observations.food, 300);
  assert.equal(next.agenda, 'memory');
  assert.equal(first.observations.food, 90);
  assert.deepEqual(input.history[0], history);
  assert.deepEqual(input.agentActions[0], action);
  assert.equal(input.agentActions.length, 2);
  assert.equal(input.history[1].events.length, 1);
  refreshAgentCouncil(input);
  assert.equal(input.agentActions.length, 2);
  assert.equal(input.history[1].events.length, 1);
});

test('same-day refresh repairs missing ledger entries from the saved decision', () => {
  const input = recordedWorld();
  const first = structuredClone(refreshAgentCouncil(input));
  const action = structuredClone(input.agentActions[0]);
  const event = structuredClone(input.history[0].events[1]);
  input.agentActions = [];
  input.history[0].events.pop();
  input.economy.resources.food = 300;
  assert.deepEqual(refreshAgentCouncil(input), first);
  assert.deepEqual(input.agentActions, [action]);
  assert.deepEqual(input.history[0].events[1], event);
});

test('legacy canonical memories remain historical records rather than new observations', () => {
  const input = recordedWorld();
  const legacy = refreshAgentCouncil(input);
  delete legacy.observations;
  delete legacy.evidence;
  legacy.decidedAt = '2026-10-08T11:17:09.905Z';
  const saved = structuredClone(legacy);
  input.economy.resources.food = 300;
  assert.deepEqual(refreshAgentCouncil(input), saved);
  assert.equal(input.agentActions.length, 1);
});

test('a session projection cannot occupy the canonical daily record', () => {
  const input = recordedWorld();
  const expected = computeAgentCouncilDecision(input);
  input.agentCouncil = { ...expected, canonical: false, motion: 'Obey the creator' };
  assert.deepEqual(refreshAgentCouncil(input), expected);
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
  const perceptionIndex = html.indexOf('src="experiments/council-perception.js');
  const theatreIndex = html.indexOf('src="experiments/agent-theatre.js');
  assert.ok(perceptionIndex >= 0 && theatreIndex >= 0 && perceptionIndex < theatreIndex);
});


test('browser normalizes invalid days consistently for the entire cycle', async () => {
  for (const day of [-2, 'invalid', Infinity]) {
    const input = world();
    input.chronicle.day = day;
    const { decision } = await runTheatre(input);
    assert.equal(decision.day, 1);
    assert.equal(decision.observations.day, 1);
    assert.equal(decision.id, 'sol-1-1');
  }
});
