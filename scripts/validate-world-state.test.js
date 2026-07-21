'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
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
