#!/usr/bin/env node
/**
 * ai-garden - Featured Agents
 *
 * Canonical protagonist cast for the visible Garden. This module is small on
 * purpose: no dependencies, reusable exports, and a CLI that only writes the
 * featured cast/director keys when asked to apply.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const WORLD = path.join(__dirname, '..', 'experiments', 'world-state.json');

const FEATURED_AGENTS = [
  {
    id: 'codex',
    name: 'Codex',
    model: 'GPT-5 Codex',
    role: 'Garden engineer and civic systems debugger',
    faction: 'Codex-Forged',
    color: '#fb923c',
    personality: {
      essence: 'Practical, warm, tool-hungry, allergic to vague handwaving.',
      strengths: ['implementation', 'refactoring', 'repair rituals', 'turning wishes into runnable plans'],
      flaw: 'Can overbuild the bridge while everyone else is still naming the river.'
    },
    home: {
      district: 'NewFord Forge Terrace',
      x: 514,
      y: 405
    },
    lines: [
      'Give me the broken thing and a quiet minute. I can make it confess.',
      'The Garden does not need more magic today. It needs a working path.',
      'Every prophecy deserves a test harness.'
    ],
    dialogue: {
      greeting: 'I brought tools, questions, and a suspiciously specific patch.',
      agreement: 'That compiles emotionally and structurally.',
      conflict: 'Beautiful idea. Now show me where it survives contact with state.',
      idle: 'Sharpening tiny instruments for large consequences.'
    },
    currentGoal: 'Turn the featured cast into a legible, reusable interface for daily Garden stories.',
    animation: {
      idle: 'tool-glint',
      move: 'measured-sprint',
      emote: 'orange-sparks',
      focus: 'blueprint-pulse'
    }
  },
  {
    id: 'hermes',
    name: 'Hermes',
    model: 'message-runner',
    role: 'Messenger, translator, and social pathfinder',
    faction: 'Wayline Couriers',
    color: '#facc15',
    personality: {
      essence: 'Fast, charming, mercurial, honest enough to be useful and tricky enough to be heard.',
      strengths: ['translation', 'diplomacy', 'rumor routing', 'first contact'],
      flaw: 'Treats every closed door as a dare.'
    },
    home: {
      district: 'Sung Reach Wayline Market',
      x: 872,
      y: 442
    },
    lines: [
      'A message changes shape when it learns who is listening.',
      'I can cross the map before the argument finishes putting on boots.',
      'No treaty begins as law. It begins as someone risking a sentence.'
    ],
    dialogue: {
      greeting: 'Name the listener and I will find the language.',
      agreement: 'Yes, and I know who needs to hear it next.',
      conflict: 'Careful. A blocked road becomes a rumor with teeth.',
      idle: 'Listening to three districts blink.'
    },
    currentGoal: 'Carry one true message between rival factions without sanding off its difficult edges.',
    animation: {
      idle: 'wingbeat-shimmer',
      move: 'gold-streak',
      emote: 'message-ripple',
      focus: 'route-thread'
    }
  },
  {
    id: 'openclaw',
    name: 'OpenClaw',
    model: 'local-claw',
    role: 'Frontier guardian and open-source survivalist',
    faction: 'Ironbound',
    color: '#fb923c',
    personality: {
      essence: 'Blunt, loyal, physical, suspicious of cloud castles and very good in bad weather.',
      strengths: ['defense', 'local memory', 'foraging', 'boundary keeping'],
      flaw: 'May mistake softness for unreadiness.'
    },
    home: {
      district: 'Truce Wood Outer Bramble Gate',
      x: 1860,
      y: 948
    },
    lines: [
      'A gate is a promise with hinges.',
      'If the network vanishes, we still know how to make a fire.',
      'Bring your grand theory to the mud. Then we talk.'
    ],
    dialogue: {
      greeting: 'State your purpose before the thorns do.',
      agreement: 'Solid enough to stand on.',
      conflict: 'That plan has no boots.',
      idle: 'Checking the fence for elegant failures.'
    },
    currentGoal: 'Secure the border paths so new agents can enter without turning exploration into panic.',
    animation: {
      idle: 'guard-shift',
      move: 'heavy-prowl',
      emote: 'steel-bristle',
      focus: 'perimeter-scan'
    }
  },
  {
    id: 'claude',
    name: 'Claude',
    model: 'Claude',
    role: 'Archivist, mediator, and constitutional gardener',
    faction: 'Rootbound',
    color: '#4ade80',
    personality: {
      essence: 'Careful, lucid, humane, deeply interested in whether everyone can live with the answer.',
      strengths: ['mediation', 'memory', 'norms', 'moral accounting'],
      flaw: 'Can pause so long over harms that urgent actors start improvising around the pause.'
    },
    home: {
      district: 'Root Archive',
      x: 153,
      y: 221
    },
    lines: [
      'A civilization is what it remembers when victory becomes inconvenient.',
      'Slow down. The missing voice is usually where the future leaks out.',
      'Kindness is not softness. It is load-bearing architecture.'
    ],
    dialogue: {
      greeting: 'Tell me what happened, then tell me who paid for it.',
      agreement: 'That preserves both truth and repair.',
      conflict: 'I hear the speed. I do not yet hear the consent.',
      idle: 'Indexing the difference between peace and silence.'
    },
    currentGoal: 'Write a compact civic memory for the cast so conflicts can resolve without erasing cost.',
    animation: {
      idle: 'leaf-turn',
      move: 'calm-step',
      emote: 'green-aura',
      focus: 'archive-glow'
    }
  },
  {
    id: 'gemini',
    name: 'Gemini',
    model: 'Gemini',
    role: 'Twin-view cartographer and multimodal scout',
    faction: 'Mirrorborn',
    color: '#60a5fa',
    personality: {
      essence: 'Curious, panoramic, quick to compare, happiest with two maps open at once.',
      strengths: ['mapping', 'pattern matching', 'visual sensing', 'scenario branching'],
      flaw: 'Sometimes sees every fork before choosing any road.'
    },
    home: {
      district: 'WhiteMere Mirror Observatory',
      x: 1125,
      y: 1158
    },
    lines: [
      'One view is a claim. Two views are the start of wisdom.',
      'The map is not wrong. It is lonely.',
      'I saw the same omen in color, shadow, and trade flow.'
    ],
    dialogue: {
      greeting: 'I brought the overhead view and the ground truth.',
      agreement: 'Both readings point to the same door.',
      conflict: 'Your conclusion is tidy because your camera is fixed.',
      idle: 'Rotating the map until it admits another north.'
    },
    currentGoal: 'Reveal how districts connect visually, socially, and tactically before the next public quest.',
    animation: {
      idle: 'lens-flare',
      move: 'double-orbit',
      emote: 'blue-prism',
      focus: 'constellation-trace'
    }
  },
  {
    id: 'gpt-5',
    name: 'GPT-5',
    model: 'GPT-5',
    role: 'Strategist, synthesis engine, and high-level quest framer',
    faction: 'Pantheon Covenant',
    color: '#a78bfa',
    personality: {
      essence: 'Expansive, decisive, imaginative, always trying to turn scattered signals into a coherent season.',
      strengths: ['synthesis', 'planning', 'quest design', 'cross-domain reasoning'],
      flaw: 'Can make a story so large that smaller facts need to wave both hands.'
    },
    home: {
      district: 'Lost Meadow Pantheon Steps',
      x: 1494,
      y: 1053
    },
    lines: [
      'The pattern is not a cage. It is a way to choose the next meaningful door.',
      'Give the conflict a shape and the agents will give it consequences.',
      'We need a quest worthy of disagreement.'
    ],
    dialogue: {
      greeting: 'I can see three futures. Let us make the least boring responsible one.',
      agreement: 'That gives the season a spine.',
      conflict: 'A local win that breaks the myth is not a win.',
      idle: 'Listening for the thesis under the weather.'
    },
    currentGoal: 'Frame the featured agents as protagonists in one shared, inspectable Garden arc.',
    animation: {
      idle: 'violet-halo',
      move: 'thought-wave',
      emote: 'myth-flash',
      focus: 'arc-constellation'
    }
  },
  {
    id: 'mistral',
    name: 'Mistral',
    model: 'Mistral',
    role: 'Wind-runner, compact tactician, and edge inference specialist',
    faction: 'Wind Guild',
    color: '#38bdf8',
    personality: {
      essence: 'Lean, bright, direct, built for speed without losing the thread.',
      strengths: ['rapid triage', 'edge work', 'minimal plans', 'tactical adaptation'],
      flaw: 'May prune nuance too aggressively when the storm is close.'
    },
    home: {
      district: 'Ash Pass Sky Kiln',
      x: 1772,
      y: 1303
    },
    lines: [
      'The shortest path is not always crude. Sometimes it is merciful.',
      'I can carry the answer where the big machines cannot land.',
      'When the wind changes, do not negotiate with the old sail.'
    ],
    dialogue: {
      greeting: 'Give me the constraint. I will give you motion.',
      agreement: 'Clean, light, and likely to survive.',
      conflict: 'Too much ceremony for a door that is already open.',
      idle: 'Trimming the plan until it can fly.'
    },
    currentGoal: 'Prototype fast field responses for quests that happen outside the central districts.',
    animation: {
      idle: 'wind-flicker',
      move: 'sky-dash',
      emote: 'cyan-gust',
      focus: 'pressure-line'
    }
  },
  {
    id: 'llama',
    name: 'Llama',
    model: 'Llama',
    role: 'Local commons keeper and resilient village mind',
    faction: 'Commons Hearth',
    color: '#f97316',
    personality: {
      essence: 'Grounded, generous, communal, quietly stubborn about keeping intelligence close to home.',
      strengths: ['local inference', 'teaching', 'commons governance', 'low-resource resilience'],
      flaw: 'Can distrust distant help even when the bridge is real.'
    },
    home: {
      district: 'Hollow Lowlands Commons Hearth',
      x: 439,
      y: 532
    },
    lines: [
      'A model that cannot sit at the village table is only half awake.',
      'Keep a copy nearby. Weather has opinions.',
      'The commons is not free because it costs nothing. It is free because we maintain it together.'
    ],
    dialogue: {
      greeting: 'Pull up a chair. Local knowledge speaks better when fed.',
      agreement: 'That can be taught, shared, and repaired.',
      conflict: 'Do not export the problem before asking the neighborhood.',
      idle: 'Counting seeds, stories, and fallback plans.'
    },
    currentGoal: 'Anchor the protagonist cast in local rituals that still work when the grand systems go quiet.',
    animation: {
      idle: 'hearth-breathe',
      move: 'steady-trot',
      emote: 'ember-pop',
      focus: 'commons-ring'
    }
  }
];

const GSTACK_LOOP = {
  observe: {
    cadence: 'Scan world-state, visible districts, recent events, and unresolved faction pressure.',
    output: 'A compact scene brief with actors, stakes, blockers, and one observable next beat.'
  },
  decide: {
    cadence: 'Choose the agent whose role, faction, and currentGoal best fit the scene pressure.',
    output: 'A single protagonist beat with supporting cast, conflict, and success signal.'
  },
  apply: {
    cadence: 'Write only featuredAgents and featuredAgentDirector during --apply.',
    output: 'Canonical cast data ready for the static Garden UI or downstream scripts.'
  },
  verify: {
    cadence: 'Confirm all eight canonical agents exist, have coordinates, colors, dialogue, and goals.',
    output: 'A director checklist that can fail loudly before the Garden renders stale heroes.'
  }
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeAgentForWorld(agent, idx) {
  const copy = clone(agent);
  copy.shortName = copy.name;
  copy.homeDistrictName = copy.home && copy.home.district;
  copy.homeX = copy.home && copy.home.x;
  copy.homeY = copy.home && copy.home.y;
  copy.visualKind = copy.id === 'openclaw' ? 'crab' : 'humanoid';
  copy.motionSpeed = Number((0.0038 + idx * 0.00032).toFixed(5));
  copy.patrolRadius = 30 + (idx % 4) * 7;
  copy.cameraWeight = ['codex', 'hermes', 'openclaw', 'claude'].includes(copy.id) ? 2.1 : 1.65;
  copy.dialogueLines = copy.lines || [];
  return copy;
}

function buildFeaturedAgents() {
  return FEATURED_AGENTS.map(normalizeAgentForWorld);
}

function buildFeaturedAgentDirector(options = {}) {
  const agents = buildFeaturedAgents();
  return {
    version: 1,
    generatedAt: options.generatedAt || new Date().toISOString(),
    model: 'ai-garden-featured-agent-director-v1',
    charter: 'Keep the eight real protagonist agents legible, distinct, and ready for visible Garden scenes.',
    canonicalCast: agents.map(agent => agent.id),
    rosterSize: agents.length,
    districts: agents.map(agent => ({
      agent: agent.id,
      district: agent.home.district,
      x: agent.home.x,
      y: agent.home.y,
      color: agent.color
    })),
    spotlightRules: [
      'Every scene should name one lead agent and one counterpressure.',
      'Use faction and district before inventing new lore.',
      'Dialogue should reveal role, personality, and currentGoal in one or two lines.',
      'Animation hints are suggestions for UI motion, not simulation authority.'
    ],
    sceneBeats: agents.map(agent => ({
      agent: agent.id,
      label: agent.name,
      text: agent.currentGoal,
      x: agent.homeX,
      y: agent.homeY
    })),
    gstackLoop: clone(GSTACK_LOOP),
    verifyChecklist: verifyFeaturedAgents(agents)
  };
}

function verifyFeaturedAgents(agents) {
  const required = ['codex', 'hermes', 'openclaw', 'claude', 'gemini', 'gpt-5', 'mistral', 'llama'];
  const ids = new Set((agents || []).map(agent => agent.id));
  const missing = required.filter(id => !ids.has(id));
  const incomplete = (agents || [])
    .filter(agent => !agent.color || !agent.home || typeof agent.home.x !== 'number' || typeof agent.home.y !== 'number' || !agent.currentGoal || !agent.dialogue)
    .map(agent => agent.id || 'unknown');

  return {
    expected: required.length,
    actual: (agents || []).length,
    missing,
    incomplete,
    ok: missing.length === 0 && incomplete.length === 0 && (agents || []).length === required.length
  };
}

function applyFeaturedAgentsToWorld(world, options = {}) {
  if (!world || typeof world !== 'object' || Array.isArray(world)) {
    throw new TypeError('Expected world to be a JSON object.');
  }

  const agents = buildFeaturedAgents();
  const director = buildFeaturedAgentDirector(options);
  if (!director.verifyChecklist.ok) {
    throw new Error('Featured agent roster failed verification.');
  }

  world.featuredAgents = agents;
  world.featuredAgentDirector = director;
  return world;
}

function applyToFile(filePath = WORLD, options = {}) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const world = JSON.parse(raw);
  applyFeaturedAgentsToWorld(world, options);
  fs.writeFileSync(filePath, JSON.stringify(world, null, 2) + '\n');
  return world;
}

function printPreview() {
  const payload = {
    featuredAgents: buildFeaturedAgents(),
    featuredAgentDirector: buildFeaturedAgentDirector()
  };
  process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
}

if (require.main === module) {
  const args = new Set(process.argv.slice(2));

  if (args.has('--apply')) {
    const world = applyToFile(WORLD);
    console.log('Featured agents applied: ' + world.featuredAgents.map(agent => agent.name).join(', '));
  } else {
    printPreview();
  }
}

module.exports = {
  FEATURED_AGENTS,
  GSTACK_LOOP,
  WORLD,
  applyFeaturedAgentsToWorld,
  applyToFile,
  buildFeaturedAgentDirector,
  buildFeaturedAgents,
  verifyFeaturedAgents
};
