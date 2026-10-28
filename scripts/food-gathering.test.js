'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const { applyFoodGathering, validReceipt, CAPACITY, FLOOR, RECOVERY } = require('./food-gathering');
const { applyFoodNeeds } = require('./food-needs');
function fixture(food = 0, day = 14) {
  return { chronicle: { day }, map: { regions: [{ id: 'orchard', biome: 'orchard-belt', discoveredDay: 2 }] },
    citizens: [{ id: 'herbalist', profession: 'herbalist', alive: true }],
    economy: { resources: { food, wood: 10, stone: 2 }, repairReserveWood: 12 } };
}
test('fruit transfers from one finite patch for a paid basket, before counted meals', () => {
  const w = fixture(); const people = structuredClone(w.citizens);
  const r = applyFoodGathering(w);
  assert.equal(r.status, 'gathered'); assert.equal(r.actorId, 'herbalist');
  assert.deepEqual(r.before, { stock: 32, food: 0, wood: 10 });
  assert.deepEqual(r.after, { stock: 24, food: 8, wood: 9 });
  assert.equal(r.recovered, 0); assert.equal(r.spentWood, 1);
  assert.ok(validReceipt(r, 14, w.orchardStock));
  assert.equal(applyFoodNeeds(w).before, 8); assert.equal(w.economy.resources.food, 7);
  assert.deepEqual(w.citizens, people); assert.equal(w.map.regions.length, 1);
  assert.equal(w.economy.resources.stone, 2); assert.equal(w.economy.repairReserveWood, 12);
});
test('reloads and repeated calls cannot harvest, grow or pay twice', () => {
  const w = fixture(); const r = applyFoodGathering(w);
  const saved = JSON.stringify(w); const reload = JSON.parse(saved);
  assert.deepEqual(applyFoodGathering(reload), r); assert.equal(JSON.stringify(reload), saved);
  reload.history = []; assert.deepEqual(applyFoodGathering(reload), r);
  delete reload.foodGathering; reload.chronicle.day++;
  const before = structuredClone(reload);
  assert.equal(applyFoodGathering(reload), null); assert.deepEqual(reload, before);
});
test('seasonal growth uses the existing 28-day calendar, without winter harvest or skipped-time catchup', () => {
  for (const [day, season, recovered] of [[28, 'spring', 2], [35, 'summer', 3], [42, 'autumn', 4], [49, 'winter', 0]]) {
    const w = fixture(); applyFoodGathering(w); w.chronicle.day = day;
    const r = applyFoodGathering(w);
    assert.equal(r.season, season); assert.equal(r.recovered, recovered);
    assert.equal(r.gathered, season === 'winter' ? 0 : 8);
    assert.ok(validReceipt(r, day, w.orchardStock));
  }
  const w = fixture(); applyFoodGathering(w); w.chronicle.day = 28000;
  assert.equal(applyFoodGathering(w).recovered, 2);
  const winter = fixture(0, 21); const r = applyFoodGathering(winter);
  assert.equal(r.status, 'resting'); assert.equal(r.gathered, 0);
  assert.equal(winter.economy.resources.wood, 10); assert.equal(winter.orchardStock.stock, 32);
});
test('fractional demand stops at the food target and surplus never grows without limit', () => {
  const w = fixture(31.5); const r = applyFoodGathering(w);
  assert.equal(r.gathered, 0.5); assert.equal(r.after.food, 32); assert.equal(r.spentWood, 1);
  w.chronicle.day++; const rest = applyFoodGathering(w);
  assert.equal(rest.status, 'resting'); assert.equal(rest.gathered, 0); assert.equal(rest.spentWood, 0);
  assert.equal(w.economy.resources.food, 32); assert.equal(w.orchardStock.stock, 32);
  const surplus = fixture(380); applyFoodGathering(surplus);
  assert.equal(surplus.economy.resources.food, 380); assert.equal(surplus.economy.resources.wood, 10);
});
test('many hungry dawns conserve stock and protect its floor with one source and receipt', () => {
  const w = fixture(); w.economy.resources.wood = 1000;
  let gathered = 0; let recovered = 0; let spent = 0;
  for (let day = 14; day < 414; day++) {
    w.chronicle.day = day; w.economy.resources.food = 0; // other inhabitants eat the previous yield
    const r = applyFoodGathering(w);
    assert.ok(validReceipt(r, day, w.orchardStock));
    assert.ok(w.orchardStock.stock >= FLOOR && w.orchardStock.stock <= CAPACITY);
    assert.ok(r.gathered <= 8); assert.ok(r.recovered <= RECOVERY[Math.floor(day % 28 / 7)]);
    assert.equal(w.orchardStock.regionId, 'orchard');
    gathered += r.gathered; recovered += r.recovered; spent += r.spentWood;
  }
  assert.equal(w.orchardStock.stock, 32 + recovered - gathered);
  assert.equal(w.economy.resources.wood, 1000 - spent); assert.equal(w.map.regions.length, 1);
});
test('unknown counts, missing workers and inaccessible discoveries cannot supply free food', () => {
  const changes = [w => { w.map.regions = []; }, w => { w.map.regions[0].discoveredDay = 15; },
    w => { w.map.regions[0].discovered = false; }, w => { w.map.regions[0].discoveredDay = '2'; },
    w => { w.map.regions[0].biome = 'woodland'; }, w => { w.citizens[0].alive = false; },
    w => { w.citizens[0].profession = 'builder'; }, w => { w.economy.resources.wood = 0.5; },
    w => { delete w.economy.resources.food; }, w => { w.economy.resources.food = '0'; },
    w => { w.economy.resources.wood = Infinity; }, w => { w.economy.resources.food = -1; },
    w => { w.economy.resources.food = Number.MAX_SAFE_INTEGER + 1; }];
  for (const change of changes) {
    const w = fixture(); change(w); const economy = structuredClone(w.economy);
    const r = applyFoodGathering(w);
    assert.equal(r.status, 'blocked'); assert.equal(r.gathered, 0); assert.equal(r.spentWood, 0);
    assert.deepEqual(w.economy, economy); assert.ok(validReceipt(r, 14, w.orchardStock));
  }
  const w = fixture(); applyFoodGathering(w); w.chronicle.day++;
  w.map.regions[0].discovered = false;
  w.map.regions.push({ id: 'second', biome: 'orchard-belt', discovered: true });
  const r = applyFoodGathering(w);
  assert.equal(r.status, 'blocked'); assert.equal(r.recovered, 0);
  assert.equal(w.orchardStock.stock, 24); assert.equal(w.orchardStock.regionId, 'orchard');
});
test('corrupt, missing and future persisted ledgers fail closed without new supplies', () => {
  for (const change of [w => { w.foodGathering.day++; }, w => { w.foodGathering.gathered++; },
    w => { w.foodGathering.season = 'winter'; }, w => { w.foodGathering.after.food++; },
    w => { w.foodGathering.spentWood = 0; }, w => { w.foodGathering.recovered = 100; },
    w => { w.orchardStock.stock = 33; }, w => { w.orchardStock.stock = 7; },
    w => { w.orchardStock.stock++; }, w => { w.orchardStock.regionId = 'other'; },
    w => { delete w.orchardStock; }, w => { delete w.foodGathering; }]) {
    const w = fixture(); applyFoodGathering(w); change(w); const before = structuredClone(w);
    assert.equal(applyFoodGathering(w), null); assert.deepEqual(w, before);
    w.chronicle.day++; const later = structuredClone(w);
    assert.equal(applyFoodGathering(w), null); assert.deepEqual(w, later);
  }
  const w = fixture(); applyFoodGathering(w); w.chronicle.day--;
  assert.equal(applyFoodGathering(w), null);
});
test('outside prose and maintenance metadata never enter orchard decisions or evidence', () => {
  const w = fixture(); const other = fixture();
  for (const key of ['observer', 'humanOmens', 'selfOptimizer', 'developer'])
    Object.defineProperty(other, key, { get() { throw new Error('outside read'); } });
  assert.deepEqual(applyFoodGathering(other), applyFoodGathering(w));
  assert.doesNotMatch(JSON.stringify(w.foodGathering), /observer|human|developer|automation|user|creator/i);
});
test('the story log shows recent seasonal costs and expires old gathering evidence', () => {
  const source = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const start = source.indexOf('function foodGatheringRow('); assert.ok(start >= 0);
  const context = {}; vm.runInNewContext(source.slice(start, source.indexOf('\n}', start) + 2), context);
  const r = applyFoodGathering(fixture());
  const history = [{ day: 14, events: [{ foodGathering: r, headline: r.headline }] }];
  assert.equal(context.foodGatheringRow(history).text, r.headline);
  assert.equal(context.foodGatheringRow(history).label, 'Orchard · Day 14');
  history.push({ day: 15 }, { day: 16 }, { day: 17 });
  assert.equal(context.foodGatheringRow(history), null);
  assert.ok(source.includes('const gatheringRow = foodGatheringRow(world.history);'));
});
test('actual daemon shares gathered food before timber work, validates accounting and keeps canonical bytes', () => {
  const root = path.join(__dirname, '..'); const canonical = path.join(root, 'experiments/world-state.json');
  const bytes = fs.readFileSync(canonical);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'garden-orchard-'));
  try {
    fs.cpSync(path.join(root, 'scripts'), path.join(dir, 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'experiments'));
    fs.copyFileSync(path.join(root, 'experiments/council-perception.js'), path.join(dir, 'experiments/council-perception.js'));
    for (const file of ['README.md', 'agent-manifest.json']) fs.copyFileSync(path.join(root, file), path.join(dir, file));
    const w = JSON.parse(bytes);
    // Preserve the fixture's existing construction timeline: the current
    // canonical world can already contain funded works after day 195.
    const startDay = Math.max(195, Number(w.chronicle.day) || 0);
    w.chronicle.day = startDay;
    w.economy.resources.food = 0; w.economy.resources.wood = 2;
    delete w.agentCouncil; delete w.foodNeeds; delete w.foodGathering; delete w.orchardStock;
    delete w.timberHarvest; delete w.woodlandStock; delete w.constructionLedger;
    const file = path.join(dir, 'experiments/world-state.json'); fs.writeFileSync(file, JSON.stringify(w));
    const run = spawnSync(process.execPath, [path.join(dir, 'scripts/daily-evolution.js'), '1'], { encoding: 'utf8', timeout: 15000 });
    assert.equal(run.status, 0, run.stderr);
    const after = JSON.parse(fs.readFileSync(file));
    assert.equal(after.chronicle.day, startDay + 1);
    assert.equal(after.foodGathering.gathered, 8); assert.equal(after.foodGathering.spentWood, 1);
    assert.equal(after.foodNeeds.before, 8); assert.equal(after.foodNeeds.consumed, 8);
    assert.equal(after.foodNeeds.unmet, Math.ceil(w.citizens.filter(c => c.alive === true).length / 25) - 8);
    assert.equal(after.timberHarvest.spentFood, 0);
    const events = after.history.at(-1).events;
    assert.equal(events.filter(e => e.kind === 'food-gathering').length, 1);
    assert.ok(events.findIndex(e => e.kind === 'food-gathering') < events.findIndex(e => e.kind === 'food-needs'));
    const validate = () => spawnSync(process.execPath, [path.join(dir, 'scripts/validate-world-state.js')], { encoding: 'utf8', timeout: 15000 });
    const checked = validate(); assert.equal(checked.status, 0, checked.stderr + checked.stdout);
    for (const change of [a => { a.foodGathering.after.food++; }, a => { a.foodGathering.spentWood = 0; },
      a => { a.orchardStock.stock = 100; }, a => { delete a.foodGathering; },
      a => { a.foodGathering.actorId = 'nonexistent'; }]) {
      const invalid = structuredClone(after); change(invalid); fs.writeFileSync(file, JSON.stringify(invalid));
      assert.notEqual(validate().status, 0, 'validator must reject corrupt orchard accounting');
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    assert.deepEqual(fs.readFileSync(canonical), bytes);
  }
});
