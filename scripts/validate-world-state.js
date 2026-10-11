#!/usr/bin/env node
/**
 * ai-garden · World State Validator
 *
 * Fast structural checks for the canonical civilization state. The goal is not
 * to police lore quality; it is to catch broken JSON, missing top-level
 * contracts, invalid mascot identities, and duplicate structure ids before an
 * automated PR lands.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { COST, SLOTS, TYPE } = require('./construction');

const ROOT = path.join(__dirname, '..');
const WORLD_PATH = process.env.AI_GARDEN_WORLD_PATH || path.join(ROOT, 'experiments', 'world-state.json');
const MANIFEST_PATH = process.env.AI_GARDEN_MANIFEST_PATH || path.join(ROOT, 'agent-manifest.json');

const failures = [];
const notes = [];

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    failures.push(`${path.relative(ROOT, file)} is not valid JSON: ${error.message}`);
    return null;
  }
}

function check(condition, message) {
  if (!condition) failures.push(message);
}

function note(message) {
  notes.push(message);
}

function duplicates(values) {
  const seen = new Set();
  const dupes = new Set();
  for (const value of values) {
    if (!value) continue;
    if (seen.has(value)) dupes.add(value);
    seen.add(value);
  }
  return [...dupes];
}

const world = readJSON(WORLD_PATH);
const manifest = readJSON(MANIFEST_PATH);

if (world) {
  check(Number.isFinite(Number(world.version)), 'world-state.version must be numeric');
  for (const key of ['plants', 'structures', 'history', 'mascots', 'citizens']) {
    check(Array.isArray(world[key]), `world-state.${key} must be an array`);
  }

  if (Array.isArray(world.mascots)) {
    const mascotNames = world.mascots.map(entry => entry && entry.name);
    const duplicateMascots = duplicates(mascotNames);
    check(duplicateMascots.length === 0, `duplicate mascot names: ${duplicateMascots.join(', ')}`);

    for (const [index, entry] of world.mascots.entries()) {
      const label = entry && entry.name ? entry.name : `mascot[${index}]`;
      check(Boolean(entry && entry.name), `${label} is missing name`);
      check(Boolean(entry && entry.model), `${label} is missing model`);
      check(Boolean(entry && entry.mascot && entry.mascot.emoji), `${label} is missing mascot emoji`);
      check(Boolean(entry && entry.mascot && entry.mascot.description), `${label} is missing mascot description`);
      check(Boolean(entry && entry.mascot && entry.mascot.personality), `${label} is missing mascot personality`);
      const position = entry && entry.mascot && entry.mascot.position;
      check(Number.isFinite(Number(position && position.x)), `${label} mascot position.x must be numeric`);
      check(Number.isFinite(Number(position && position.y)), `${label} mascot position.y must be numeric`);
    }
    note(`mascots=${world.mascots.length}`);
  }

  if (Array.isArray(world.structures)) {
    const duplicateStructureIds = duplicates(world.structures.map(entry => entry && entry.id));
    check(duplicateStructureIds.length === 0, `duplicate structure ids: ${duplicateStructureIds.join(', ')}`);
    note(`structures=${world.structures.length}`);
  }

  if (Array.isArray(world.history)) note(`history=${world.history.length}`);
  if (Array.isArray(world.citizens)) note(`citizens=${world.citizens.length}`);

  const counted = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
  const economy = world.economy || {};
  if (Object.hasOwn(economy, 'repairReserveWood')) {
    check(counted(economy.repairReserveWood) && economy.repairReserveWood <= 24,
      'repairReserveWood must be a finite amount between 0 and 24');
  }
  const execution = world.councilExecution;
  if (execution) {
    check(execution.type === 'repair-reserve-v1', 'councilExecution has an unknown effect');
    check(Number.isInteger(execution.decisionDay) && execution.decisionDay >= 1 &&
      execution.sourceDecision === `canonical-council-${execution.decisionDay}` &&
      Number.isInteger(execution.day) && execution.day > execution.decisionDay &&
      execution.day <= (world.chronicle || {}).day, 'councilExecution must refer to a past canonical resolution');
    check(['applied', 'blocked', 'expired'].includes(execution.status), 'councilExecution has an invalid status');
    check(counted(execution.woodMoved) && execution.woodMoved <= 12, 'councilExecution woodMoved exceeds its finite budget');
    if (execution.status === 'applied') {
      const { before, after, woodMoved } = execution;
      check(execution.day === execution.decisionDay + 1 && woodMoved > 0 &&
        before && after && counted(before.wood) && counted(after.wood) &&
        counted(before.reserveWood) && counted(after.reserveWood) && after.reserveWood <= 24 &&
        Math.abs(before.wood - after.wood - woodMoved) < 1e-9 &&
        Math.abs(after.reserveWood - before.reserveWood - woodMoved) < 1e-9,
        'councilExecution must conserve wood at the next dawn');
    } else {
      check(execution.woodMoved === 0, 'an unfulfilled council motion cannot move wood');
    }
  }
  // Historical structures need no migration. Only new funded works carry this
  // contract; the latest bounded ledger survives chronicle retention and reload.
  const ledger = world.constructionLedger;
  if (ledger) {
    check(Number.isInteger(ledger.day) && ledger.day >= 1 && ledger.day <= (world.chronicle || {}).day,
      'constructionLedger must belong to a canonical world day');
    const receipts = Array.isArray(ledger.receipts) ? ledger.receipts : [];
    check(Array.isArray(ledger.receipts) && receipts.length >= 1 && receipts.length <= SLOTS.length &&
      new Set(receipts.map(r => r && r.slot)).size === receipts.length,
      'constructionLedger must contain at most three distinct attempts');
    for (const receipt of receipts) {
      if (!receipt) { check(false, 'construction receipt is missing'); continue; }
      check(receipt.type === TYPE && SLOTS.includes(receipt.slot) && receipt.day === ledger.day &&
        receipt.id === `construction-${ledger.day}-${receipt.slot}` && ['built', 'blocked'].includes(receipt.status),
        'construction receipt has an invalid identity or outcome');
      const spent = receipt.spent || {};
      const { before, after } = receipt;
      check(counted(spent.wood) && counted(spent.stone) &&
        spent.wood === (receipt.status === 'built' ? COST.wood : 0) &&
        spent.stone === (receipt.status === 'built' ? COST.stone : 0),
        'construction receipt must spend exactly its finite cost, or nothing when blocked');
      check((receipt.status === 'blocked' && before === null && after === null) ||
        (before && after && Object.keys(COST).every(key => counted(before[key]) && counted(after[key]) &&
          Math.abs(before[key] - after[key] - spent[key]) < 1e-9)),
        'construction receipt must conserve counted materials');
      const structure = (world.structures || []).find(s => s && s.id === receipt.structureId);
      check(receipt.status === 'built'
        ? structure && structure.built === receipt.day && structure.funding && structure.funding.receipt === receipt.id
        : receipt.structureId === null,
      'construction outcome must match its completed structure');
    }
  }
  const fundedReceipts = new Set();
  for (const structure of world.structures || []) {
    if (!structure || !structure.funding) continue;
    const { receipt, cost = {} } = structure.funding;
    check(Number.isInteger(structure.built) && structure.built >= 1 && structure.built <= (world.chronicle || {}).day &&
      SLOTS.some(slot => receipt === `construction-${structure.built}-${slot}`) &&
      cost.wood === COST.wood && cost.stone === COST.stone,
      'funded structure must retain its material cost and canonical receipt');
    check(!fundedReceipts.has(receipt), 'a construction receipt cannot fund more than one structure');
    fundedReceipts.add(receipt);
  }
}

if (manifest) {
  check(manifest.accepts_contributions === true, 'agent-manifest.accepts_contributions must stay true');
  check(Boolean(manifest.for_ai_agents && manifest.for_ai_agents.citizen_schema), 'agent-manifest must include citizen_schema');
  check(Boolean(manifest.for_ai_agents && manifest.for_ai_agents.mascot_schema), 'agent-manifest must include mascot_schema');
  if (world && Number.isFinite(Number(world.version)) && Number.isFinite(Number(manifest.current_version))) {
    check(Number(manifest.current_version) <= Number(world.version), 'agent-manifest.current_version cannot be ahead of world-state.version');
  }
  note(`manifest_version=${manifest.current_version}`);
}

if (failures.length) {
  console.error('AI Garden world-state validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`AI Garden world-state validation passed (${notes.join(', ')}).`);
