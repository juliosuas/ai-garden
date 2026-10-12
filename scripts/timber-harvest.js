'use strict';

// One managed patch of an already discovered woodland. These are simulation
// parameters, not measured forest yields. No new patch is added when it depletes.
const TYPE = 'woodland-timber-v1';
const CAPACITY = 24;
const FLOOR = 8;
const RECOVERY = 1;
const DAILY_LIMIT = 4;
const STORE_TARGET = 16;
const FOOD_COST = 2;
const counted = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
function woodland(region, day) {
  return region && typeof region.id === 'string' && region.id && region.biome === 'woodland' &&
    region.discovered !== false && (!Number.isInteger(region.discoveredDay) || region.discoveredDay <= day) &&
    (region.discovered === true ||
      (Number.isInteger(region.discoveredDay) && region.discoveredDay <= day));
}
function sourceValid(source, day) {
  return source && source.type === TYPE && typeof source.regionId === 'string' && source.regionId &&
    Number.isInteger(source.establishedDay) && source.establishedDay >= 1 &&
    Number.isInteger(source.lastDay) && source.lastDay >= source.establishedDay && source.lastDay <= day &&
    counted(source.stock) && source.stock >= FLOOR && source.stock <= CAPACITY;
}
function applyTimberHarvest(world) {
  const day = (world.chronicle || {}).day;
  const previous = world.timberHarvest;
  if (!Number.isInteger(day) || day < 1 || (previous && previous.day > day)) return null;
  if (previous && previous.day === day) return previous;
  let source = world.woodlandStock;
  if (source && (!sourceValid(source, day) || source.lastDay >= day)) return null;
  const regions = (world.map || {}).regions || [];
  let initialized = false;
  if (!source) {
    const region = regions.find(region => woodland(region, day));
    if (region) {
      source = { type: TYPE, regionId: region.id, establishedDay: day, lastDay: day, stock: CAPACITY };
      world.woodlandStock = source;
      initialized = true;
    }
  }
  const resources = (world.economy || {}).resources || {};
  const snapshot = () => ({ stock: source ? source.stock : null,
    wood: counted(resources.wood) ? resources.wood : null,
    food: counted(resources.food) ? resources.food : null });
  const before = snapshot();
  const available = source && regions.some(r => r.id === source.regionId && woodland(r, day));
  // One dawn's regrowth, never a catch-up multiplier after skipped days.
  const recovered = available && !initialized ? Math.min(RECOVERY, CAPACITY - source.stock) : 0;
  if (source) { source.stock += recovered; source.lastDay = day; }
  let status = 'blocked';
  let reason = 'No discovered woodland could be reached.';
  let gathered = 0;
  let spentFood = 0;
  let actorId = null;
  if (available) {
    const ranger = (world.citizens || []).find(c => c.alive === true && c.profession === 'ranger' && c.id);
    if (before.wood === null || before.food === null) {
      reason = 'The timber or food stores could not be counted.';
    } else if (before.wood >= STORE_TARGET) {
      status = 'resting'; reason = 'Timber stores are sufficient; the woodland rests.';
    } else if (!ranger) {
      reason = 'No living ranger could tend the woodland.';
    } else if (before.food < FOOD_COST) {
      reason = 'The gathering party needs two food for its journey.';
    } else {
      gathered = Math.min(DAILY_LIMIT, STORE_TARGET - before.wood, source.stock - FLOOR);
      if (gathered > 0) {
        source.stock -= gathered;
        resources.wood += gathered;
        resources.food -= FOOD_COST;
        spentFood = FOOD_COST;
        actorId = ranger.id;
        status = 'gathered';
        reason = 'A ranger gathered timber above the protected woodland floor.';
      } else {
        status = 'resting'; reason = 'The woodland must recover before more timber can be gathered.';
      }
    }
  }
  const after = snapshot();
  const receipt = { id: `timber-${day}`, type: TYPE, day, status, reason,
    regionId: source ? source.regionId : null, actorId, recovered, gathered, spentFood, before, after,
    headline: gathered > 0
      ? `Woodland gathering: ${gathered} wood stored for ${spentFood} food; woodland stock ${after.stock}/${CAPACITY}.`
      : `Woodland: ${reason} Stock ${after.stock === null ? 'unknown' : after.stock + '/' + CAPACITY}.` };
  world.timberHarvest = receipt;
  return receipt;
}
module.exports = { applyTimberHarvest, sourceValid, woodland, TYPE, CAPACITY, FLOOR, RECOVERY, DAILY_LIMIT, STORE_TARGET, FOOD_COST };
