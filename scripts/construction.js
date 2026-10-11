'use strict';

// A small common material floor for daily works, not a complete pricing model.
// Reserved timber belongs to survival repairs and is never a construction input.
const COST = Object.freeze({ wood: 4, stone: 2 });
const SLOTS = ['daily', 'extra', 'fortune'];
const TYPE = 'funded-construction-v1';
function counted(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function attemptConstruction(world, structure, slot) {
  const day = (world.chronicle || {}).day;
  const previous = world.constructionLedger;
  if (!Number.isInteger(day) || day < 1 || !SLOTS.includes(slot) ||
      (previous && previous.day > day)) return null;
  const ledger = previous && previous.day === day ? previous : { day, receipts: [] };
  const existing = ledger.receipts.find(receipt => receipt.slot === slot);
  if (existing) return existing;
  if (ledger.receipts.length >= SLOTS.length) return null;
  const resources = (world.economy || {}).resources || {};
  const economy = world.economy || {};
  const reserve = Object.hasOwn(economy, 'repairReserveWood') ? economy.repairReserveWood : 0;
  const valid = counted(resources.wood) && counted(resources.stone);
  const before = valid ? { wood: resources.wood, stone: resources.stone } : null;
  let reason = 'The material stores could not be counted.';
  let status = 'blocked';
  const spent = { wood: 0, stone: 0 };
  const id = `construction-${day}-${slot}`;
  const builder = (world.citizens || []).find(c => structure && c.id === structure.builder && c.alive === true);
  if (valid && (!counted(reserve) || reserve > 24)) {
    reason = 'The protected timber reserve could not be counted.';
  } else if (valid && (!structure || !structure.id || structure.built !== day || !builder ||
      (world.structures || []).some(s => s.id === structure.id))) {
    reason = 'No living builder or distinct work could be confirmed.';
  } else if (valid && (resources.wood < COST.wood || resources.stone < COST.stone)) {
    reason = `Work requires ${COST.wood} available wood and ${COST.stone} stone; the repair reserve stays protected.`;
  } else if (valid) {
    resources.wood -= COST.wood;
    resources.stone -= COST.stone;
    Object.assign(spent, COST);
    structure.funding = { receipt: id, cost: { ...COST } };
    world.structures.push(structure);
    world.chronicle.structures++;
    status = 'built';
    reason = 'Available materials were committed to a completed work.';
  }
  const after = valid ? { wood: resources.wood, stone: resources.stone } : null;
  const receipt = { id, day, slot, type: TYPE, status, reason,
    structureId: status === 'built' ? structure.id : null, spent, before, after };
  ledger.receipts.push(receipt);
  world.constructionLedger = ledger;
  return receipt;
}

module.exports = { attemptConstruction, COST, SLOTS, TYPE };
