'use strict';

// Food is a communal store unit: one unit feeds up to 25 living inhabitants
// for one dawn. This is an explicit game rule, not a measured dietary need.
const TYPE = 'communal-rations-v1';
const PEOPLE_PER_RATION = 25;
const MAX_SHORTAGE_DAYS = 7;
const counted = n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= Number.MAX_SAFE_INTEGER;
function validReceipt(r, day) {
  if (!Number.isInteger(day) || day < 1 || !r || r.type !== TYPE || !Number.isInteger(r.day) || r.day < 1 || r.day > day ||
    r.id !== `food-${r.day}` || !Number.isSafeInteger(r.population) || r.population < 0 ||
    r.required !== Math.ceil(r.population / PEOPLE_PER_RATION) ||
    !Number.isInteger(r.shortageDays) || r.shortageDays < 0 || r.shortageDays > MAX_SHORTAGE_DAYS) return false;
  if (r.status === 'blocked') return r.before === null && r.after === null && r.consumed === 0 &&
    r.unmet === null && r.shortageDays === 0;
  return counted(r.before) && counted(r.after) && r.consumed === Math.min(r.before, r.required) &&
    r.after === r.before - r.consumed && r.unmet === r.required - r.consumed &&
    r.status === (r.unmet > 0 ? 'shortage' : 'fed') &&
    (r.unmet > 0 ? r.shortageDays > 0 : r.shortageDays === 0);
}
function applyFoodNeeds(world) {
  const day = world.chronicle && world.chronicle.day;
  const previous = world.foodNeeds;
  if (!Number.isInteger(day) || day < 1 || !Array.isArray(world.citizens)) return null;
  // Never silently repair a corrupt receipt into a second debit.
  if (previous && !validReceipt(previous, day)) return null;
  if (previous && previous.day === day) return previous;
  const population = world.citizens.filter(c => c && c.alive === true).length;
  const required = Math.ceil(population / PEOPLE_PER_RATION);
  const resources = world.economy && world.economy.resources;
  const before = resources && counted(resources.food) ? resources.food : null;
  const consumed = before === null ? 0 : Math.min(before, required);
  const after = before === null ? null : before - consumed;
  const unmet = before === null ? null : required - consumed;
  const status = before === null ? 'blocked' : unmet > 0 ? 'shortage' : 'fed';
  // A gap is unknown time, never retroactive consumption or evidence of famine.
  const shortageDays = unmet > 0 ? Math.min(MAX_SHORTAGE_DAYS,
    (previous && previous.day === day - 1 ? previous.shortageDays : 0) + 1) : 0;
  if (before !== null) resources.food = after;
  const headline = status === 'blocked' ? 'Communal meal: food stores could not be counted.' :
    `Communal meal: ${consumed}/${required} food shared among ${population} inhabitants; ${after} stored.` +
    (unmet > 0 ? ` Shortfall ${unmet}; ${shortageDays} consecutive dawns with insufficient rations (up to 7 recorded).` : '');
  const receipt = { id: `food-${day}`, type: TYPE, day, population, required,
    consumed, unmet, before, after, status, shortageDays, headline };
  // Keep only the latest receipt; canonical history already has bounded events.
  world.foodNeeds = receipt;
  return receipt;
}
module.exports = { applyFoodNeeds, validReceipt, PEOPLE_PER_RATION, TYPE };
