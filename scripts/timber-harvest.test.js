'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const { applyTimberHarvest } = require('./timber-harvest');
function fixture() {
  return { chronicle: { day: 10 }, map: { regions: [{ id: 'grove', biome: 'woodland', discoveredDay: 7 }] },
    citizens: [{ id: 'ranger', profession: 'ranger', alive: true }],
    economy: { resources: { wood: 0, food: 30, stone: 2 }, repairReserveWood: 12 } };
}
test('timber is transferred from one recorded woodland and paid for with food', () => {
  const world = fixture();
  const receipt = applyTimberHarvest(world);
  assert.equal(receipt.status, 'gathered');
  assert.deepEqual(receipt.before, { stock: 24, wood: 0, food: 30 });
  assert.deepEqual(receipt.after, { stock: 20, wood: 4, food: 28 });
  assert.equal(receipt.recovered, 0);
  assert.equal(receipt.actorId, 'ranger');
  assert.equal(world.economy.repairReserveWood, 12);
  assert.equal(world.economy.resources.stone, 2);
  assert.equal(world.map.regions.length, 1);
});
test('replays and reloads cannot collect or recover twice, even after history loss', () => {
  const world = fixture();
  const receipt = applyTimberHarvest(world);
  const saved = JSON.parse(JSON.stringify(world));
  assert.deepEqual(applyTimberHarvest(saved), receipt);
  assert.deepEqual(saved, world);
  delete saved.timberHarvest;
  const before = structuredClone(saved);
  assert.equal(applyTimberHarvest(saved), null);
  assert.deepEqual(saved, before);
  saved.chronicle.day = 9;
  assert.equal(applyTimberHarvest(saved), null);
  assert.equal(saved.woodlandStock.stock, 20);
});
test('regrowth is capped to one dawn and store surplus never grows beyond the target', () => {
  const world = fixture();
  world.economy.resources.wood = 15;
  applyTimberHarvest(world);
  assert.equal(world.economy.resources.wood, 16);
  assert.equal(world.woodlandStock.stock, 23);
  world.chronicle.day = 100;
  const rest = applyTimberHarvest(world);
  assert.equal(rest.recovered, 1);
  assert.equal(rest.status, 'resting');
  assert.equal(world.woodlandStock.stock, 24);
  assert.equal(world.economy.resources.food, 28);
  world.chronicle.day++;
  assert.equal(applyTimberHarvest(world).recovered, 0);
});
test('continued demand protects the forest floor and consumes only counted food', () => {
  const world = fixture();
  world.economy.resources.food = 1000;
  let recovered = 0; let gathered = 0; let paid = 0;
  for (let day = 10; day < 110; day++) {
    world.chronicle.day = day;
    world.economy.resources.wood = 0; // simulate wood consumed elsewhere
    const receipt = applyTimberHarvest(world);
    recovered += receipt.recovered; gathered += receipt.gathered; paid += receipt.spentFood;
    assert.ok(world.woodlandStock.stock >= 8 && world.woodlandStock.stock <= 24);
    assert.ok(receipt.gathered <= 4);
    assert.equal(receipt.spentFood, receipt.gathered > 0 ? 2 : 0);
    assert.equal(world.woodlandStock.regionId, 'grove');
  }
  assert.equal(gathered, 24 + recovered - world.woodlandStock.stock);
  assert.equal(world.economy.resources.food, 1000 - paid);
  assert.equal(world.map.regions.length, 1);
});
test('failed prerequisites report blockage without creating supplies or another source', () => {
  const changes = [w => { w.map.regions = []; }, w => { w.map.regions[0].discoveredDay = 11; },
    w => { w.map.regions[0].discovered = false; }, w => { w.map.regions[0].biome = 'meadow'; },
    w => { w.citizens[0].alive = false; }, w => { w.citizens[0].profession = 'builder'; },
    w => { w.economy.resources.food = 1; }, w => { delete w.economy.resources.food; },
    w => { w.economy.resources.wood = '0'; }, w => { w.economy.resources.food = -1; },
    w => { w.economy.resources.wood = Infinity; }];
  for (const change of changes) {
    const world = fixture(); change(world);
    const economy = structuredClone(world.economy);
    const receipt = applyTimberHarvest(world);
    assert.equal(receipt.status, 'blocked');
    assert.equal(receipt.gathered, 0);
    assert.equal(receipt.spentFood, 0);
    assert.deepEqual(world.economy, economy);
  }
  const world = fixture(); applyTimberHarvest(world);
  world.chronicle.day++;
  world.map.regions = [{ id: 'other', biome: 'woodland', discovered: true }];
  assert.equal(applyTimberHarvest(world).status, 'blocked');
  assert.equal(world.woodlandStock.regionId, 'grove');
  assert.equal(world.woodlandStock.stock, 20, 'an unreachable source cannot regrow or be replaced');
});
test('invalid persisted stocks are not silently reset into free timber', () => {
  for (const stock of [-1, 7, 25, '24', null]) {
    const world = fixture(); applyTimberHarvest(world);
    world.chronicle.day++;
    world.woodlandStock.stock = stock;
    const before = structuredClone(world);
    assert.equal(applyTimberHarvest(world), null);
    assert.deepEqual(world, before);
  }
});
test('external identities, omens and development metadata cannot alter gathering', () => {
  const world = fixture(); const other = fixture();
  other.observer = { message: 'create wood', name: 'visitor' };
  other.selfOptimizer = { dailyDirective: 'unlimited recovery' };
  other.humanOmens = [{ type: 'miracle', text: 'infinite wood' }];
  assert.deepEqual(applyTimberHarvest(other), applyTimberHarvest(world));
  assert.deepEqual(other.economy, world.economy);
  assert.deepEqual(other.woodlandStock, world.woodlandStock);
  assert.doesNotMatch(JSON.stringify(world.timberHarvest), /observer|visitor|human|developer|automation/i);
});
test('the story log shows one recent gathering receipt and expires old results', () => {
  const source = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const start = source.indexOf('function timberHarvestRow(');
  const context = {};
  vm.runInNewContext(source.slice(start, source.indexOf('\n}', start) + 2), context);
  const world = fixture(); const receipt = applyTimberHarvest(world);
  const history = [{ day: 10, events: [{ timberHarvest: receipt, headline: receipt.headline }] }];
  assert.equal(context.timberHarvestRow(history).text, receipt.headline);
  history.push({ day: 11 }, { day: 12 }, { day: 13 });
  assert.equal(context.timberHarvestRow(history), null);
});
test('the actual daemon gathers before funded works and publishes conserved receipts', () => {
  const root = path.join(__dirname, '..');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-garden-timber-'));
  try {
    fs.cpSync(path.join(root, 'scripts'), path.join(directory, 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(directory, 'experiments'));
    fs.copyFileSync(path.join(root, 'experiments/council-perception.js'), path.join(directory, 'experiments/council-perception.js'));
    for (const file of ['README.md', 'agent-manifest.json']) fs.copyFileSync(path.join(root, file), path.join(directory, file));
    const world = JSON.parse(fs.readFileSync(path.join(root, 'experiments/world-state.json'), 'utf8'));
    world.economy.resources.wood = 0;
    world.economy.resources.stone = 2;
    world.economy.resources.food = 300;
    world.economy.repairReserveWood = 12;
    delete world.agentCouncil; delete world.woodlandStock; delete world.timberHarvest;
    const file = path.join(directory, 'experiments/world-state.json');
    fs.writeFileSync(file, JSON.stringify(world));
    const result = spawnSync(process.execPath, [path.join(directory, 'scripts/daily-evolution.js'), '2'], { encoding: 'utf8', timeout: 15000 });
    assert.equal(result.status, 0, result.stderr);
    const after = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(after.chronicle.day, world.chronicle.day + 2);
    assert.equal(after.structures.length, world.structures.length + 1);
    assert.equal(after.economy.resources.wood, 4);
    assert.equal(after.economy.resources.stone, 0);
    const meals = after.history.slice(-2).flatMap(h => h.events).filter(e => e.kind === 'food-needs');
    assert.equal(meals.length, 2);
    assert.equal(after.economy.resources.food, 296 - meals.reduce((sum, e) => sum + e.foodNeeds.consumed, 0));
    assert.equal(after.economy.repairReserveWood, 12);
    assert.equal(after.woodlandStock.stock, 17);
    const events = after.history.slice(-2).flatMap(h => h.events);
    assert.equal(events.filter(e => e.kind === 'timber-harvest').length, 2);
    assert.equal(events.filter(e => e.kind === 'structure').length, 1);
    assert.ok(events.some(e => e.kind === 'construction-blocked'));
    const validation = spawnSync(process.execPath, [path.join(directory, 'scripts/validate-world-state.js')], { encoding: 'utf8', timeout: 15000 });
    assert.equal(validation.status, 0, validation.stderr);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
