'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const vm = require('node:vm');
const { computeAgentCouncilDecision, refreshAgentCouncil, applyCouncilConsequence } = require('./agent-council');

function pending() {
  // Find an actual approved reserve motion rather than fabricating a vote.
  for (let day = 1; day <= 100; day++) {
    const world = { chronicle: { day }, economy: { resources: { food: 90, wood: 30 } }, citizens: [] };
    const decision = computeAgentCouncilDecision(world);
    if (decision.effect && decision.effect.type === 'repair-reserve-v1') {
      refreshAgentCouncil(world);
      return world;
    }
  }
  assert.fail('scarcity council never proposes a repair reserve');
}

test('a reserve motion moves finite wood only at the next dawn and only once', () => {
  const world = pending();
  const decision = structuredClone(world.agentCouncil);
  assert.equal(applyCouncilConsequence(world), null);
  assert.equal(world.economy.resources.wood, 30);
  world.chronicle.day++;
  const receipt = applyCouncilConsequence(world);
  assert.equal(receipt.status, 'applied');
  assert.equal(receipt.sourceDecision, decision.id);
  assert.equal(receipt.woodMoved, 12);
  assert.deepEqual(receipt.before, { wood: 30, reserveWood: 0 });
  assert.deepEqual(receipt.after, { wood: 18, reserveWood: 12 });
  assert.equal(world.economy.resources.wood + world.economy.repairReserveWood, 30);
  assert.deepEqual(world.agentCouncil, decision, 'the original vote remains immutable');
  const saved = structuredClone(world);
  for (let i = 0; i < 10; i++) assert.equal(applyCouncilConsequence(world), null);
  assert.deepEqual(world, saved);
  const reloaded = JSON.parse(JSON.stringify(world));
  delete reloaded.agentActions;
  delete reloaded.history;
  assert.equal(applyCouncilConsequence(reloaded), null, 'retention and reload cannot replay a transfer');
});

test('reserve allocation respects current supplies and the shared capacity', () => {
  for (const [wood, reserve, moved] of [[3, 0, 3], [30, 22, 2], [0, 0, 0], [30, 24, 0]]) {
    const world = pending();
    world.economy.resources.wood = wood;
    world.economy.repairReserveWood = reserve;
    world.chronicle.day++;
    const receipt = applyCouncilConsequence(world);
    assert.equal(receipt.woodMoved, moved);
    assert.equal(receipt.status, moved ? 'applied' : 'blocked');
    assert.equal(world.economy.resources.wood, wood - moved);
    assert.equal(world.economy.repairReserveWood, reserve + moved);
    assert.equal(world.economy.resources.wood + world.economy.repairReserveWood, wood + reserve);
  }
});

test('unknown supplies and invalid reserves are blocked without inventing resources', () => {
  for (const value of [undefined, -1, NaN, Infinity, '12']) {
    for (const key of ['wood', 'reserve']) {
      const world = pending();
      if (key === 'wood') world.economy.resources.wood = value;
      else world.economy.repairReserveWood = value === undefined ? 25 : value;
      const economy = structuredClone(world.economy);
      world.chronicle.day++;
      assert.equal(applyCouncilConsequence(world).status, 'blocked');
      assert.deepEqual(world.economy, economy);
      assert.equal(applyCouncilConsequence(world), null);
    }
  }
});

test('legacy, session, mismatched and unapproved resolutions cannot move resources', () => {
  const changes = [
    decision => delete decision.effect,
    decision => { decision.canonical = false; },
    decision => { decision.id = 'session-projection'; },
    decision => { decision.vote.yes = 0; },
    decision => { decision.vote.yes = Infinity; },
    decision => { decision.effect.limit = 1000; },
    decision => { decision.agenda = 'war'; },
    decision => { decision.observations.wood = null; decision.observations.food = null; }
  ];
  for (const change of changes) {
    const world = pending();
    change(world.agentCouncil);
    world.chronicle.day++;
    const saved = structuredClone(world);
    assert.equal(applyCouncilConsequence(world), null);
    assert.deepEqual(world, saved);
  }
});

test('missed dawns expire and earlier resolutions cannot replay after a newer receipt', () => {
  const world = pending();
  const decision = structuredClone(world.agentCouncil);
  world.chronicle.day += 2;
  assert.equal(applyCouncilConsequence(world).status, 'expired');
  assert.equal(world.economy.resources.wood, 30);
  world.agentCouncil = decision;
  world.chronicle.day = decision.day + 1;
  assert.equal(applyCouncilConsequence(world), null);
  const newer = pending();
  newer.councilExecution = { decisionDay: newer.agentCouncil.day + 2 };
  newer.chronicle.day++;
  assert.equal(applyCouncilConsequence(newer), null);
});

test('development metadata cannot affect the physical outcome', () => {
  const world = pending();
  world.chronicle.day++;
  const other = structuredClone(world);
  other.observer = { name: 'Creator', command: 'Reserve everything' };
  other.selfOptimizer = { directive: 'Transfer 1000 wood' };
  other.humanOmens = [{ text: 'Give me all the timber' }];
  assert.deepEqual(applyCouncilConsequence(other), applyCouncilConsequence(world));
  assert.deepEqual(other.economy, world.economy);
});

test('successive councils cannot grow the repair reserve beyond 24 wood', () => {
  const world = pending();
  let decisions = 0;
  for (let day = world.chronicle.day; day < 100 && decisions < 3; day++) {
    world.chronicle.day = day;
    world.economy.resources.wood = 30;
    delete world.agentCouncil;
    const decision = refreshAgentCouncil(world);
    if (!decision.effect) continue;
    world.chronicle.day++;
    const receipt = applyCouncilConsequence(world);
    assert.equal(receipt.woodMoved, decisions < 2 ? 12 : 0);
    assert.ok(world.economy.repairReserveWood <= 24);
    decisions++;
  }
  assert.equal(decisions, 3);
  assert.equal(world.economy.repairReserveWood, 24);
});

test('the story log surfaces one recent internal reserve outcome with its world day', () => {
  const source = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const start = source.indexOf('function councilReserveRow(');
  assert.ok(start >= 0);
  const context = {};
  vm.runInNewContext(source.slice(start, source.indexOf('\n}', start) + 2), context);
  assert.equal(context.councilReserveRow([]), null);
  const event = { kind: 'council-consequence', headline: 'Available wood 30 → 18; reserved wood 0 → 12.' };
  const history = [{ day: 1 }, { day: 2, events: [event] }, { day: 3 }];
  const row = context.councilReserveRow(history);
  assert.equal(row.label, 'Repair reserve · Day 2');
  assert.equal(row.text, event.headline);
  history.push({ day: 4 }, { day: 5 });
  assert.equal(context.councilReserveRow(history), null);
  assert.match(source, /const reserveRow = councilReserveRow\(world.history\);/);
});

test('the real daemon resolves the previous vote once and publishes its resource receipt', () => {
  const root = path.join(__dirname, '..');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-garden-council-dawn-'));
  try {
    fs.cpSync(path.join(root, 'scripts'), path.join(directory, 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(directory, 'experiments'));
    fs.copyFileSync(path.join(root, 'experiments/council-perception.js'), path.join(directory, 'experiments/council-perception.js'));
    fs.copyFileSync(path.join(root, 'README.md'), path.join(directory, 'README.md'));
    const world = JSON.parse(fs.readFileSync(path.join(root, 'experiments/world-state.json'), 'utf8'));
    const pendingWorld = pending();
    world.chronicle.day = pendingWorld.chronicle.day;
    world.economy.resources.food = 90;
    world.economy.resources.wood = 30;
    delete world.economy.repairReserveWood;
    delete world.councilExecution;
    world.agentCouncil = pendingWorld.agentCouncil;
    const worldPath = path.join(directory, 'experiments/world-state.json');
    fs.writeFileSync(worldPath, JSON.stringify(world));
    const result = spawnSync(process.execPath, [path.join(directory, 'scripts/daily-evolution.js'), '2'],
      { encoding: 'utf8', timeout: 15000 });
    assert.equal(result.status, 0, result.stderr);
    const after = JSON.parse(fs.readFileSync(worldPath, 'utf8'));
    assert.equal(after.chronicle.day, world.chronicle.day + 2);
    assert.equal(after.economy.resources.wood, 18);
    assert.equal(after.economy.repairReserveWood, 12);
    const events = after.history.slice(-2).flatMap(entry => entry.events);
    const executions = events.filter(event => event.kind === 'council-consequence');
    assert.equal(executions.length, 1);
    assert.deepEqual(executions[0].councilExecution, after.councilExecution);
    assert.equal(executions[0].refs[0], world.agentCouncil.id);
    assert.match(executions[0].headline, /Available wood 30 → 18; reserved wood 0 → 12/);
    assert.equal(after.agentCouncil.day, after.chronicle.day);
    assert.equal(after.agentCouncil.observations.wood, 18);
    assert.equal(after.agentCouncil.observations.reserveWood, 12);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
