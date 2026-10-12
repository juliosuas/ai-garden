'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { attemptConstruction } = require('./construction');
const { applyTimberHarvest } = require('./timber-harvest');
const test = require('node:test');

const validator = path.join(__dirname, 'validate-world-state.js');

function runValidator(world) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-garden-validator-'));
  const worldPath = path.join(directory, 'world-state.json');
  const manifestPath = path.join(directory, 'agent-manifest.json');

  fs.writeFileSync(worldPath, JSON.stringify(world));
  fs.writeFileSync(manifestPath, JSON.stringify({
    accepts_contributions: true,
    current_version: 1,
    for_ai_agents: { citizen_schema: {}, mascot_schema: {} },
  }));

  try {
    return spawnSync(process.execPath, [validator], {
      encoding: 'utf8',
      env: {
        ...process.env,
        AI_GARDEN_WORLD_PATH: worldPath,
        AI_GARDEN_MANIFEST_PATH: manifestPath,
      },
    });
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function validWorld() {
  return {
    version: 1,
    plants: [],
    structures: [{ id: 'observatory' }],
    history: [],
    mascots: [{
      name: 'Sprout',
      model: 'test-model',
      mascot: {
        emoji: '🌱',
        description: 'A test sprout',
        personality: 'Patient',
        position: { x: 1, y: 2 },
      },
    }],
    citizens: [],
  };
}

test('accepts a valid isolated world-state fixture', () => {
  const result = runValidator(validWorld());

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /validation passed/);
});

test('rejects duplicate structure ids in the supplied world-state', () => {
  const world = validWorld();
  world.structures.push({ id: 'observatory' });

  const result = runValidator(world);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /duplicate structure ids: observatory/);
});

function constructedWorld() {
  const world = validWorld();
  world.chronicle = { day: 10, structures: 1 };
  world.citizens = [{ id: 'builder', alive: true }];
  world.economy = { resources: { wood: 4, stone: 2 }, repairReserveWood: 12 };
  attemptConstruction(world, { id: 'cache', built: 10, builder: 'builder' }, 'daily');
  attemptConstruction(world, { id: 'other', built: 10, builder: 'builder' }, 'extra');
  return world;
}

test('accepts finite funded works and blocked attempts alongside legacy structures', () => {
  const result = runValidator(constructedWorld());
  assert.equal(result.status, 0, result.stderr);
});

test('rejects construction resource creation, overspending, invented works and duplicate attempts', () => {
  const changes = [w => { w.constructionLedger.receipts[0].after.wood = 4; },
    w => { w.constructionLedger.receipts[0].spent.wood = 5; },
    w => { w.constructionLedger.receipts[1].spent.stone = 2; },
    w => { w.constructionLedger.day = 11; },
    w => { w.constructionLedger.receipts.push(w.constructionLedger.receipts[0]); },
    w => { w.structures.pop(); },
    w => { w.structures.at(-1).funding.cost.wood = 0; },
    w => { w.structures.push({ ...w.structures.at(-1), id: 'unpaid-copy' }); }];
  for (const change of changes) {
    const world = constructedWorld(); change(world);
    const result = runValidator(world);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /construction|funded structure/);
  }
});

function reserveWorld() {
  const world = validWorld();
  world.chronicle = { day: 2 };
  world.economy = { resources: { wood: 18 }, repairReserveWood: 12 };
  world.councilExecution = { type: 'repair-reserve-v1', sourceDecision: 'canonical-council-1',
    decisionDay: 1, day: 2, status: 'applied', woodMoved: 12,
    before: { wood: 30, reserveWood: 0 }, after: { wood: 18, reserveWood: 12 } };
  return world;
}

test('accepts a conserved, bounded next-dawn reserve allocation', () => {
  const result = runValidator(reserveWorld());
  assert.equal(result.status, 0, result.stderr);
});

test('rejects invalid reserve amounts rather than allowing unlimited accumulation', () => {
  for (const amount of [-1, 25, '12', null]) {
    const world = reserveWorld();
    world.economy.repairReserveWood = amount;
    const result = runValidator(world);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /repairReserveWood/);
  }
});

test('rejects resource creation, late allocations and payments from blocked motions', () => {
  const mutations = [
    world => { world.councilExecution.after.wood = 30; },
    world => { world.councilExecution.woodMoved = 13; },
    world => { world.councilExecution.day = 3; world.chronicle.day = 3; },
    world => { world.councilExecution.status = 'blocked'; },
    world => { world.councilExecution.sourceDecision = 'session'; }
  ];
  for (const mutate of mutations) {
    const world = reserveWorld();
    mutate(world);
    assert.equal(runValidator(world).status, 1);
  }
});

function timberWorld() {
  const world = validWorld();
  world.chronicle = { day: 10 };
  world.map = { regions: [{ id: 'grove', biome: 'woodland', discoveredDay: 7 }] };
  world.citizens = [{ id: 'ranger', profession: 'ranger', alive: true }];
  world.economy = { resources: { wood: 0, food: 30 } };
  applyTimberHarvest(world);
  return world;
}
test('accepts bounded woodland transfer, paid gathering and unfulfilled journeys', () => {
  assert.equal(runValidator(timberWorld()).status, 0);
  const world = timberWorld();
  world.chronicle.day++;
  world.economy.resources.food = 0;
  applyTimberHarvest(world);
  const result = runValidator(world);
  assert.equal(result.status, 0, result.stderr);
  const absent = validWorld(); absent.chronicle = { day: 10 };
  applyTimberHarvest(absent);
  assert.equal(runValidator(absent).status, 0);
});
test('rejects excess regeneration, unpaid gathering, source replacement and phantom timber', () => {
  const changes = [w => { w.woodlandStock.stock = 25; }, w => { w.woodlandStock.stock = 7; },
    w => { w.woodlandStock.regionId = 'invented'; }, w => { w.woodlandStock.lastDay = 11; },
    w => { w.timberHarvest.recovered = 2; }, w => { w.timberHarvest.spentFood = 0; },
    w => { w.timberHarvest.after.wood = 5; }, w => { w.timberHarvest.after.stock = 24; },
    w => { w.timberHarvest.actorId = 'ghost'; }, w => { w.timberHarvest.day = 11; },
    w => { w.timberHarvest.gathered = 5; }, w => { w.timberHarvest.status = 'blocked'; },
    w => { delete w.woodlandStock; }, w => { delete w.timberHarvest; }];
  for (const change of changes) {
    const world = timberWorld(); change(world);
    const result = runValidator(world);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /timber|woodland/i);
  }
});
