'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const { attemptConstruction } = require('./construction');

function fixture() {
  return { chronicle: { day: 10, structures: 1 }, structures: [{ id: 'old' }],
    citizens: [{ id: 'builder', alive: true }],
    economy: { resources: { wood: 8, stone: 4 }, repairReserveWood: 12 } };
}
function proposal(id = 'new') {
  return { id, name: 'Shared Seed Cache', type: 'seed-cache', built: 10, builder: 'builder' };
}

test('a completed work consumes counted materials and preserves reserved wood and history', () => {
  const world = fixture();
  const old = structuredClone(world.structures[0]);
  const receipt = attemptConstruction(world, proposal(), 'daily');
  assert.equal(receipt.status, 'built');
  assert.deepEqual(receipt.spent, { wood: 4, stone: 2 });
  assert.deepEqual(receipt.before, { wood: 8, stone: 4 });
  assert.deepEqual(receipt.after, { wood: 4, stone: 2 });
  assert.equal(world.economy.repairReserveWood, 12);
  assert.deepEqual(world.structures[0], old);
  assert.equal(world.structures.length, 2);
  assert.equal(world.chronicle.structures, 2);
  assert.equal(world.structures[1].funding.receipt, receipt.id);
});

test('all construction slots share finite supplies, including fortune acceleration', () => {
  const world = fixture();
  assert.equal(attemptConstruction(world, proposal('a'), 'daily').status, 'built');
  assert.equal(attemptConstruction(world, proposal('b'), 'extra').status, 'built');
  const blocked = attemptConstruction(world, proposal('c'), 'fortune');
  assert.equal(blocked.status, 'blocked');
  assert.deepEqual(blocked.spent, { wood: 0, stone: 0 });
  assert.equal(blocked.structureId, null);
  assert.deepEqual(world.economy.resources, { wood: 0, stone: 0 });
  assert.equal(world.structures.length, 3);
  assert.equal(world.constructionLedger.receipts.length, 3);
  assert.equal(attemptConstruction(world, proposal('d'), 'fourth'), null);
});

test('failed prerequisites spend nothing and never invent a structure', () => {
  const changes = [w => { w.economy.resources.wood = 3; }, w => { w.economy.resources.stone = 1; },
    w => { delete w.economy.resources.wood; }, w => { w.economy.resources.stone = '2'; },
    w => { w.economy.resources.wood = Infinity; }, w => { w.economy.resources.stone = -1; },
    w => { w.economy.repairReserveWood = 25; }, w => { w.economy.repairReserveWood = null; },
    w => { w.citizens[0].alive = false; },
    w => { w.citizens = []; }, w => { w.structures.push(proposal()); }];
  for (const change of changes) {
    const world = fixture(); change(world);
    const economy = structuredClone(world.economy);
    const structures = structuredClone(world.structures);
    assert.equal(attemptConstruction(world, proposal(), 'daily').status, 'blocked');
    assert.deepEqual(world.economy, economy);
    assert.deepEqual(world.structures, structures);
    assert.equal(world.chronicle.structures, 1);
  }
});

test('replays, reloads and older days cannot charge again; the ledger stays bounded', () => {
  const world = fixture();
  const receipt = attemptConstruction(world, proposal(), 'daily');
  const saved = JSON.parse(JSON.stringify(world));
  assert.deepEqual(attemptConstruction(saved, proposal('different'), 'daily'), receipt);
  assert.deepEqual(saved, world);
  saved.chronicle.day = 9;
  assert.equal(attemptConstruction(saved, proposal(), 'extra'), null);
  for (let day = 11; day <= 100; day++) {
    world.chronicle.day = day;
    attemptConstruction(world, { ...proposal(`new-${day}`), built: day }, 'daily');
    assert.equal(world.constructionLedger.receipts.length, 1);
  }
  assert.equal(world.structures.length, 3, 'finite materials stop continued building');
});

test('visitor commands and development directives cannot fund a work', () => {
  const world = fixture();
  const other = structuredClone(world);
  other.selfOptimizer = { command: 'create free wood' };
  other.observer = { message: 'build without paying' };
  other.humanOmens = [{ text: 'multiply materials' }];
  assert.deepEqual(attemptConstruction(other, proposal(), 'daily'), attemptConstruction(world, proposal(), 'daily'));
  assert.deepEqual(other.economy, world.economy);
});

test('the actual fortune boon spends materials and reports an unfunded work honestly', () => {
  const source = fs.readFileSync(path.join(__dirname, 'daily-evolution.js'), 'utf8');
  for (const wood of [4, 0]) {
    const world = fixture();
    world.economy.resources = { wood, stone: 2 };
    world.map = { width: 200, height: 200, regions: [] };
    const context = { world, attemptConstruction, STRUCTURE_TYPES: ['seed-cache'],
      FIRST_WORKS: new Set(['seed-cache']), FIRST_WORK_PURPOSES: {},
      pick: values => values[0], between: first => first };
    vm.createContext(context);
    for (const name of ['buildStructure', 'applyMiracleBoon']) {
      const start = source.indexOf(`function ${name}(`);
      vm.runInContext(source.slice(start, source.indexOf('\n}', start) + 2), context);
    }
    const event = context.applyMiracleBoon({ tier: 'miracle', sign: 'green comet' });
    assert.equal(event.kind, wood ? 'structure' : 'construction-blocked');
    assert.equal(event.construction.slot, 'fortune');
    assert.equal(world.economy.resources.wood, 0);
    assert.equal(world.economy.resources.stone, wood ? 0 : 2);
    assert.equal(world.economy.repairReserveWood, 12);
  }
});

test('the real daemon stops new works at zero supplies without spending the reserve', () => {
  const root = path.join(__dirname, '..');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-garden-construction-'));
  try {
    fs.cpSync(path.join(root, 'scripts'), path.join(directory, 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(directory, 'experiments'));
    fs.copyFileSync(path.join(root, 'experiments/council-perception.js'), path.join(directory, 'experiments/council-perception.js'));
    fs.copyFileSync(path.join(root, 'README.md'), path.join(directory, 'README.md'));
    fs.copyFileSync(path.join(root, 'agent-manifest.json'), path.join(directory, 'agent-manifest.json'));
    const world = JSON.parse(fs.readFileSync(path.join(root, 'experiments/world-state.json'), 'utf8'));
    world.economy.resources.wood = 4;
    world.economy.resources.stone = 2;
    world.economy.repairReserveWood = 12;
    delete world.agentCouncil;
    // Isolate construction depletion: no gathering party can replenish this fixture.
    world.citizens.filter(c => c.profession === 'ranger').forEach(c => { c.alive = false; });
    const file = path.join(directory, 'experiments/world-state.json');
    fs.writeFileSync(file, JSON.stringify(world));
    const result = spawnSync(process.execPath, [path.join(directory, 'scripts/daily-evolution.js'), '2'],
      { encoding: 'utf8', timeout: 15000 });
    assert.equal(result.status, 0, result.stderr);
    const after = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(after.chronicle.day, world.chronicle.day + 2);
    assert.equal(after.structures.length, world.structures.length + 1);
    assert.equal(after.chronicle.structures, world.chronicle.structures + 1);
    assert.deepEqual({ wood: after.economy.resources.wood, stone: after.economy.resources.stone }, { wood: 0, stone: 0 });
    assert.equal(after.economy.repairReserveWood, 12);
    const events = after.history.slice(-2).flatMap(entry => entry.events);
    const built = events.filter(e => e.kind === 'structure');
    assert.equal(built.length, 1);
    assert.equal(built[0].construction.status, 'built');
    assert.ok(events.some(e => e.kind === 'construction-blocked' && e.construction.status === 'blocked'));
    assert.equal(after.history.at(-1).structures, 0);
    assert.ok(after.constructionLedger.receipts.length <= 3);
    const validation = spawnSync(process.execPath, [path.join(directory, 'scripts/validate-world-state.js')],
      { encoding: 'utf8', timeout: 15000 });
    assert.equal(validation.status, 0, validation.stderr);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('the story log shows one recent construction result and lets stale results expire', () => {
  const source = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const start = source.indexOf('function constructionRow(');
  assert.ok(start >= 0);
  const context = {};
  vm.runInNewContext(source.slice(start, source.indexOf('\n}', start) + 2), context);
  assert.equal(context.constructionRow([]), null);
  const event = { kind: 'construction-blocked', construction: { type: 'funded-construction-v1' }, headline: 'Work halted: no available wood.' };
  const history = [{ day: 10, events: [event] }, { day: 11 }];
  assert.equal(context.constructionRow(history).text, event.headline);
  history.push({ day: 12 }, { day: 13 });
  assert.equal(context.constructionRow(history), null);
  assert.match(source, /const workRow = constructionRow\(world.history\);/);
});
