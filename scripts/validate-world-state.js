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

const ROOT = path.join(__dirname, '..');
const WORLD_PATH = path.join(ROOT, 'experiments', 'world-state.json');
const MANIFEST_PATH = path.join(ROOT, 'agent-manifest.json');

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
