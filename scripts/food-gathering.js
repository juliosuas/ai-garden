'use strict';

// A single patch in an existing orchard supplies supplementary food. These
// finite yields, basket costs and seasons are game rules, not measured ecology.
const TYPE = 'orchard-food-v1';
const CAPACITY = 32;
const FLOOR = 8;
const DAILY_LIMIT = 8;
const STORE_TARGET = 32;
const WOOD_COST = 1;
const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const RECOVERY = [2, 3, 4, 0];
const counted = n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= Number.MAX_SAFE_INTEGER;
const validDay = day => Number.isSafeInteger(day) && day >= 1;
const seasonIndex = day => Math.floor(day % 28 / 7);
const near = (a, b) => Math.abs(a - b) < 1e-9;

function orchard(region, day) {
  return region && typeof region.id === 'string' && region.id && region.biome === 'orchard-belt' &&
    region.discovered !== false && (region.discoveredDay === undefined ||
      (Number.isSafeInteger(region.discoveredDay) && region.discoveredDay >= 0 && region.discoveredDay <= day)) &&
    (region.discovered === true || Number.isSafeInteger(region.discoveredDay));
}
function sourceValid(s, day) {
  return !!(s && s.type === TYPE && typeof s.regionId === 'string' && s.regionId &&
    validDay(s.establishedDay) && validDay(s.lastDay) && s.lastDay >= s.establishedDay && s.lastDay <= day &&
    counted(s.stock) && s.stock >= FLOOR && s.stock <= CAPACITY);
}
function validReceipt(r, day, source) {
  if (!validDay(day) || !r || r.type !== TYPE || !validDay(r.day) || r.day > day ||
    r.id !== `food-gathering-${r.day}` || r.season !== SEASONS[seasonIndex(r.day)] ||
    typeof r.available !== 'boolean' || !['gathered', 'resting', 'blocked'].includes(r.status) ||
    !counted(r.recovered) || !counted(r.gathered) || r.gathered > DAILY_LIMIT ||
    r.spentWood !== (r.status === 'gathered' ? WOOD_COST : 0) ||
    (r.status === 'gathered' ? !(r.gathered > 0 && typeof r.actorId === 'string' && r.actorId) :
      r.gathered !== 0 || r.actorId !== null)) return false;
  const { before: b, after: a } = r;
  if (!b || !a || !['stock', 'food', 'wood'].every(k =>
    (b[k] === null && a[k] === null) || (counted(b[k]) && counted(a[k]) &&
      near(a[k] - b[k], k === 'stock' ? r.recovered - r.gathered : k === 'food' ? r.gathered : -r.spentWood)))) return false;
  if (source) {
    if (!sourceValid(source, day) || r.day !== source.lastDay || r.regionId !== source.regionId ||
      !counted(b.stock) || b.stock < FLOOR || b.stock > CAPACITY || a.stock !== source.stock ||
      (r.day === source.establishedDay && b.stock !== CAPACITY) ||
      r.recovered !== (r.available && r.day > source.establishedDay ?
        Math.min(RECOVERY[seasonIndex(r.day)], CAPACITY - b.stock) : 0)) return false;
  } else if (r.regionId !== null || r.available || b.stock !== null || a.stock !== null || r.recovered !== 0) return false;
  if (r.status === 'gathered') return !!(source && r.available && r.season !== 'winter' &&
    counted(b.food) && counted(b.wood) && b.wood >= WOOD_COST && a.food <= STORE_TARGET &&
    r.gathered === Math.min(DAILY_LIMIT, STORE_TARGET - b.food, b.stock + r.recovered - FLOOR));
  return true;
}

function applyFoodGathering(world) {
  const day = world.chronicle && world.chronicle.day;
  const previous = world.foodGathering;
  let source = world.orchardStock;
  if (!validDay(day)) return null;
  // Missing or inconsistent ledgers never authorize another harvest or refill.
  if (source && !sourceValid(source, day)) return null;
  if ((source && !previous) || (previous && !validReceipt(previous, day, source))) return null;
  if (previous && previous.day === day) return previous;
  if (source && source.lastDay >= day) return null;
  const regions = world.map && Array.isArray(world.map.regions) ? world.map.regions : [];
  if (!source) {
    const region = regions.find(r => orchard(r, day));
    if (region) source = { type: TYPE, regionId: region.id, establishedDay: day, lastDay: day, stock: CAPACITY };
  }
  const resources = world.economy && world.economy.resources;
  const snapshot = () => ({ stock: source ? source.stock : null,
    food: resources && counted(resources.food) ? resources.food : null,
    wood: resources && counted(resources.wood) ? resources.wood : null });
  const before = snapshot();
  const available = !!(source && regions.some(r => r.id === source.regionId && orchard(r, day)));
  const season = SEASONS[seasonIndex(day)];
  // A skipped interval is unknown: at most this dawn's growth, never catch-up.
  const recovered = available && source.establishedDay < day ?
    Math.min(RECOVERY[seasonIndex(day)], CAPACITY - source.stock) : 0;
  if (source) { source.stock += recovered; source.lastDay = day; }
  let status = 'blocked';
  let reason = 'No discovered orchard patch could be reached.';
  let gathered = 0;
  let actorId = null;
  const herbalist = (Array.isArray(world.citizens) ? world.citizens : [])
    .find(c => c && c.alive === true && c.profession === 'herbalist' && typeof c.id === 'string' && c.id);
  if (available) {
    if (before.food === null || before.wood === null) reason = 'Food or basket timber could not be counted.';
    else if (before.food >= STORE_TARGET) { status = 'resting'; reason = 'Food stores are sufficient; the orchard rests.'; }
    else if (season === 'winter') { status = 'resting'; reason = 'Winter closes the orchard; its protected stock remains.'; }
    else if (!herbalist) reason = 'No living herbalist could gather the fruit.';
    else if (before.wood < WOOD_COST) reason = 'Gathering needs one timber for baskets.';
    else {
      gathered = Math.min(DAILY_LIMIT, STORE_TARGET - before.food, source.stock - FLOOR);
      if (gathered > 0) {
        source.stock -= gathered;
        resources.food += gathered;
        resources.wood -= WOOD_COST;
        actorId = herbalist.id;
        status = 'gathered';
        reason = 'An herbalist gathered fruit above the protected orchard floor.';
      } else { status = 'resting'; reason = 'The orchard must recover before another gathering.'; }
    }
  }
  const spentWood = gathered > 0 ? WOOD_COST : 0;
  const after = snapshot();
  const headline = gathered > 0 ?
    `Orchard gathering: ${gathered} food stored for ${spentWood} timber; patch ${after.stock}/${CAPACITY} (${season}).` :
    `Orchard: ${reason} Stock ${after.stock === null ? 'unknown' : after.stock + '/' + CAPACITY} (${season}).`;
  const receipt = { id: `food-gathering-${day}`, type: TYPE, day, season, status, reason, available,
    regionId: source ? source.regionId : null, actorId, recovered, gathered, spentWood, before, after, headline };
  if (source) world.orchardStock = source;
  world.foodGathering = receipt;
  return receipt;
}
module.exports = { applyFoodGathering, validReceipt, sourceValid, orchard, TYPE, CAPACITY, FLOOR,
  DAILY_LIMIT, STORE_TARGET, WOOD_COST, SEASONS, RECOVERY };
