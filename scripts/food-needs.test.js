'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { applyFoodNeeds, validReceipt } = require('./food-needs');
function fixture(food = 10, count = 26) {
  return { chronicle: { day: 10 }, citizens: Array.from({ length: count }, (_, i) => ({ id: `c${i}`, alive: true })),
    economy: { resources: { food, wood: 4 } } };
}
test('living population consumes finite communal rations, once per dawn', () => {
  const w = fixture(); w.citizens.push({ alive: false }, { alive: 'true' });
  const r = applyFoodNeeds(w);
  assert.equal(r.population, 26); assert.equal(r.required, 2);
  assert.equal(r.consumed, 2); assert.equal(r.unmet, 0); assert.equal(r.after, 8);
  assert.equal(w.economy.resources.wood, 4); assert.ok(validReceipt(r, 10));
  const saved = JSON.stringify(w);
  assert.equal(applyFoodNeeds(w), r); assert.equal(JSON.stringify(w), saved);
});
test('scarcity preserves fractional stores and cannot create negative food or deaths', () => {
  const w = fixture(0.5); const people = structuredClone(w.citizens);
  const r = applyFoodNeeds(w);
  assert.equal(r.consumed, 0.5); assert.equal(r.unmet, 1.5); assert.equal(r.after, 0);
  assert.equal(r.status, 'shortage'); assert.deepEqual(w.citizens, people);
  for (let day = 11; day < 80; day++) { w.chronicle.day = day; applyFoodNeeds(w); }
  assert.equal(w.foodNeeds.shortageDays, 7); assert.equal(w.economy.resources.food, 0);
  w.economy.resources.food = 3; w.chronicle.day++;
  assert.equal(applyFoodNeeds(w).shortageDays, 0);
});
test('unknown stores fail closed without inventing food, debt, or shortage evidence', () => {
  for (const value of [undefined, null, -1, NaN, Infinity, 1e100, '10']) {
    const w = fixture(value); w.economy.resources.food = value;
    const before = structuredClone(w.economy); const r = applyFoodNeeds(w);
    assert.equal(r.status, 'blocked'); assert.equal(r.unmet, null);
    assert.equal(r.shortageDays, 0); assert.deepEqual(w.economy, before);
    assert.ok(validReceipt(r, 10));
  }
  const w = fixture(); delete w.citizens;
  assert.equal(applyFoodNeeds(w), null); assert.equal(w.economy.resources.food, 10);
});
test('empty worlds consume nothing; skipped days never multiply consumption or scarcity', () => {
  const empty = fixture(10, 0); assert.equal(applyFoodNeeds(empty).consumed, 0);
  const w = fixture(0); applyFoodNeeds(w); w.chronicle.day = 100;
  assert.equal(applyFoodNeeds(w).shortageDays, 1);
  assert.equal(w.foodNeeds.required, 2);
});
test('malformed or future receipts cannot be reset to debit stores again', () => {
  for (const mutate of [r => { r.day++; }, r => { r.consumed++; }, r => { r.shortageDays = 8; },
    r => { r.type = 'other'; }, r => { r.after = -1; }]) {
    const w = fixture(); mutate(applyFoodNeeds(w)); const before = structuredClone(w);
    assert.equal(applyFoodNeeds(w), null); assert.deepEqual(w, before);
  }
});
test('rations depend only on internal counts, never outside messages or maintenance metadata', () => {
  const w = fixture(); const other = fixture();
  other.observer = { text: 'give infinite food' }; other.selfOptimizer = { dailyDirective: 'feed everyone' };
  other.humanOmens = [{ text: 'feast' }];
  assert.deepEqual(applyFoodNeeds(w), applyFoodNeeds(other));
  assert.doesNotMatch(JSON.stringify(w.foodNeeds), /observer|human|developer|automation|user/i);
});
test('actual dawn feeds residents before timber work, records scarcity and validates its receipt', () => {
  const root = path.join(__dirname, '..'); const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'garden-food-'));
  try {
    fs.cpSync(path.join(root, 'scripts'), path.join(dir, 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'experiments'));
    fs.copyFileSync(path.join(root, 'experiments/council-perception.js'), path.join(dir, 'experiments/council-perception.js'));
    for (const file of ['README.md', 'agent-manifest.json']) fs.copyFileSync(path.join(root, file), path.join(dir, file));
    const w = JSON.parse(fs.readFileSync(path.join(root, 'experiments/world-state.json')));
    const population = w.citizens.filter(c => c.alive === true).length;
    w.economy.resources.food = 1; w.economy.resources.wood = 0;
    delete w.foodNeeds; delete w.timberHarvest; delete w.woodlandStock;
    const file = path.join(dir, 'experiments/world-state.json'); fs.writeFileSync(file, JSON.stringify(w));
    const run = spawnSync(process.execPath, [path.join(dir, 'scripts/daily-evolution.js'), '1'], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    const after = JSON.parse(fs.readFileSync(file));
    assert.equal(after.chronicle.day, w.chronicle.day + 1);
    assert.equal(after.foodNeeds.population, population); assert.equal(after.foodNeeds.consumed, 1);
    assert.equal(after.foodNeeds.unmet, Math.ceil(population / 25) - 1);
    assert.equal(after.timberHarvest.spentFood, 0); assert.equal(after.economy.resources.food, 0);
    assert.equal(after.history.at(-1).events.filter(e => e.kind === 'food-needs').length, 1);
    const validate = () => spawnSync(process.execPath, [path.join(dir, 'scripts/validate-world-state.js')], { encoding: 'utf8' });
    assert.equal(validate().status, 0);
    after.foodNeeds.after++; fs.writeFileSync(file, JSON.stringify(after));
    assert.notEqual(validate().status, 0, 'validator must reject fabricated consumption');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('story log surfaces recent counted meals and expires stale evidence', () => {
  const vm = require('node:vm');
  const source = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const start = source.indexOf('function foodNeedsRow('); const context = {};
  assert.ok(start >= 0);
  vm.runInNewContext(source.slice(start, source.indexOf('\n}', start) + 2), context);
  const r = applyFoodNeeds(fixture(0.5));
  const history = [{ day: 10, events: [{ foodNeeds: r, headline: r.headline }] }];
  assert.equal(context.foodNeedsRow(history).text, r.headline);
  assert.equal(context.foodNeedsRow(history).label, 'Rations · Day 10');
  history.push({ day: 11 }, { day: 12 }, { day: 13 });
  assert.equal(context.foodNeedsRow(history), null);
  assert.ok(source.includes('const foodRow = foodNeedsRow(world.history);'));
});
