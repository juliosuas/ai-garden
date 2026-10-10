#!/usr/bin/env node
/**
 * AI Garden — Canonical Agent Council
 *
 * Runs inside the daily daemon. The council selects its own problem, cast,
 * motion, dissent, and weighted vote from canonical world state. Humans do not
 * provide a prompt and no session-local projection is trusted as canon.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const perception = require('../experiments/council-perception');

const RESERVE_MOTION = 'reserve timber for survival repairs before raising monuments';
const RESERVE_EFFECT = Object.freeze({ type: 'repair-reserve-v1', limit: 12, capacity: 24 });
const RESERVE_CONSEQUENCE = 'At the next dawn, up to 12 available wood will be set aside for survival repairs; the public reserve holds at most 24. No timber is created.';

const FALLBACK_CAST = [
  { name: 'Codex', profession: 'builder', faction: 'Code Cantons', wisdom: 7 },
  { name: 'Hermes', profession: 'diplomat', faction: 'Pantheon Covenant', wisdom: 8 },
  { name: 'Llama', profession: 'scholar', faction: 'Code Cantons', wisdom: 6 },
  { name: 'Mistral', profession: 'explorer', faction: 'Free Seeds', wisdom: 7 },
  { name: 'Gemini', profession: 'artist', faction: 'Pantheon Covenant', wisdom: 6 },
  { name: 'OpenClaw', profession: 'engineer', faction: 'Subagent Swarm', wisdom: 5 }
];

const AGENDAS = [
  {
    id: 'war',
    eligible: world => world.wars > 0,
    question: 'Can the saints and the source survive one more night?',
    motions: [
      'publish rival interpretations of the same omen',
      'open a neutral archive before either faction edits history',
      'trade one prisoner for one reproducible miracle'
    ],
    consequence: 'A disputed memory is marked neutral. Neither faction may cite it as proof until both interpretations are archived.'
  },
  {
    id: 'scarcity',
    eligible: world => {
      return (world.food !== null && world.food < 160) || (world.wood !== null && world.wood < 120);
    },
    question: 'What should the civilization protect while resources thin?',
    motions: [
      'convert an empty shrine into a public pantry',
      'send explorers beyond the mapped edge',
      RESERVE_MOTION
    ],
    consequence: 'One vanity project is suspended. Its materials become a public survival reserve.'
  },
  {
    id: 'threat',
    eligible: world => world.threats > 0,
    question: 'The frontier sent a warning. Who is allowed to believe it?',
    motions: [
      'send three rivals to verify the warning together',
      'treat the warning as prophecy and evacuate now',
      'publish the raw trace and let districts choose'
    ],
    consequence: 'Three incompatible witnesses leave together. Their shared report will outrank faction doctrine.'
  },
  {
    id: 'memory',
    eligible: () => true,
    question: 'Which act deserves to become tomorrow’s memory?',
    motions: [
      'canonize the smallest kindness nobody rewarded',
      'preserve the funniest failed invention',
      'archive the argument that changed a mind'
    ],
    consequence: 'The archive rejects spectacle and preserves one quiet act as evidence of civilization.'
  }
];

function active(items) {
  return (items || []).filter(item => item && item.active !== false && item.alive !== false && item.fell !== true);
}

function hash(value) {
  let result = 2166136261;
  for (const char of String(value)) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function at(items, salt) {
  return items[hash(salt) % items.length];
}

function clean(value, fallback = '') {
  const text = String(value || fallback).replace(/[<>]/g, '').trim();
  return text.slice(0, 120);
}

function citizenPool(world) {
  const featured = Array.isArray(world.featuredAgents) ? world.featuredAgents : [];
  const living = active(world.citizens).filter(agent => agent.name && agent.profession);
  const seen = new Set();
  return featured.concat(living, FALLBACK_CAST).filter(agent => {
    const name = clean(agent && agent.name);
    if (!name || seen.has(name)) return false;
    seen.add(name);
    return true;
  });
}

function formCouncil(world, day) {
  const pool = citizenPool(world);
  const start = hash(`${day}:canonical-council`) % pool.length;
  const council = [];
  for (let index = 0; index < pool.length && council.length < 3; index += 1) {
    const agent = pool[(start + index) % pool.length];
    council.push({
      name: clean(agent.name, 'Unnamed Agent'),
      profession: clean(agent.profession || agent.role, 'citizen'),
      faction: clean(agent.faction, 'independent'),
      wisdom: Math.max(1, Number(agent.stats && (agent.stats.wisdom || agent.stats.intelligence) || agent.wisdom || 5))
    });
  }
  return council;
}

function computeAgentCouncilDecision(world) {
  const observations = perception.observe(world);
  const day = observations.day;
  const eligible = AGENDAS.filter(agenda => agenda.eligible(observations));
  const agenda = at(eligible, `${day}:canonical-agenda`);
  const motion = at(agenda.motions, `${day}:${agenda.id}:canonical-motion`);
  const council = formCouncil(world || {}, day);
  const total = council.reduce((sum, agent) => sum + agent.wisdom, 0);
  let yes = council.reduce((sum, agent, index) => {
    const threshold = index === 1 ? 4 : 2;
    return sum + (hash(`${agent.name}:${motion}:${day}`) % 10 > threshold ? agent.wisdom : 0);
  }, 0);
  let resolution = 'passed';
  if (yes < Math.ceil(total * 0.55)) {
    yes = Math.ceil(total * 0.62);
    resolution = 'compromise-fork';
  }
  const decision = {
    id: `canonical-council-${day}`,
    model: 'ai-garden-agent-council-v1',
    day,
    canonical: true,
    observations,
    evidence: perception.describe(observations),
    agenda: agenda.id,
    question: agenda.question,
    motion,
    proposer: council[0].name,
    dissenter: council[1].name,
    closer: council[2].name,
    council,
    vote: { yes, total, threshold: Math.ceil(total * 0.55), resolution },
    consequence: motion === RESERVE_MOTION ? RESERVE_CONSEQUENCE : agenda.consequence,
    decidedAt: `world-day-${day}`
  };
  if (motion === RESERVE_MOTION) decision.effect = { ...RESERVE_EFFECT };
  return decision;
}

function supply(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

// Execute only the explicit, versioned reserve motion. Legacy prose and session
// projections are never interpreted as physical instructions. The receipt is
// separate from the immutable vote, and survives action/history retention.
function applyCouncilConsequence(world) {
  const decision = world.agentCouncil;
  const day = world.chronicle && world.chronicle.day;
  if (!decision || decision.canonical !== true || decision.model !== 'ai-garden-agent-council-v1' ||
      !Number.isInteger(day) || !Number.isInteger(decision.day) || decision.day < 1 ||
      day <= decision.day || decision.id !== `canonical-council-${decision.day}` ||
      decision.agenda !== 'scarcity' || decision.motion !== RESERVE_MOTION) return null;
  const effect = decision.effect || {};
  if (effect.type !== RESERVE_EFFECT.type || effect.limit !== RESERVE_EFFECT.limit ||
      effect.capacity !== RESERVE_EFFECT.capacity) return null;
  const observed = decision.observations || {};
  if (observed.day !== decision.day || !((supply(observed.food) && observed.food < 160) ||
      (supply(observed.wood) && observed.wood < 120))) return null;
  const vote = decision.vote || {};
  if (!Number.isFinite(vote.total) || vote.total <= 0 || !Number.isFinite(vote.yes) ||
      !Number.isFinite(vote.threshold) || vote.threshold < Math.ceil(vote.total * 0.55) ||
      vote.yes < vote.threshold || vote.yes > vote.total ||
      !['passed', 'compromise-fork'].includes(vote.resolution)) return null;
  const previous = world.councilExecution;
  if (previous && previous.decisionDay >= decision.day) return null;

  const economy = world.economy || {};
  const wood = (economy.resources || {}).wood;
  // An absent reserve is empty. An explicitly invalid value is unknown.
  const reserve = Object.hasOwn(economy, 'repairReserveWood') ? economy.repairReserveWood : 0;
  const valid = supply(wood) && supply(reserve) && reserve <= effect.capacity;
  const before = valid ? { wood, reserveWood: reserve } : null;
  let status = 'blocked';
  let reason = 'The timber stores or reserve could not be counted.';
  let woodMoved = 0;
  if (day !== decision.day + 1) {
    status = 'expired';
    reason = 'The appointed dawn has passed; the old allocation was not carried out.';
  } else if (valid) {
    woodMoved = Math.min(effect.limit, wood, effect.capacity - reserve);
    if (woodMoved > 0) {
      economy.resources.wood -= woodMoved;
      economy.repairReserveWood = reserve + woodMoved;
      status = 'applied';
      reason = 'Timber was moved from available stores into the public repair reserve.';
    } else {
      reason = reserve === effect.capacity ? 'The public repair reserve is already full.' : 'No available timber remains.';
    }
  }
  const after = valid ? { wood: economy.resources.wood, reserveWood: economy.repairReserveWood ?? reserve } : null;
  const receipt = {
    id: `council-consequence-${decision.day}`, sourceDecision: decision.id,
    decisionDay: decision.day, day, type: effect.type, status, reason,
    woodMoved, before, after,
    headline: `Council repair reserve: ${reason}` + (woodMoved > 0
      ? ` Available wood ${before.wood} → ${after.wood}; reserved wood ${before.reserveWood} → ${after.reserveWood}.`
      : '')
  };
  world.councilExecution = receipt;
  return receipt;
}

function refreshAgentCouncil(world) {
  const day = perception.observe(world).day;
  const recorded = world.agentCouncil;
  // A daily resolution is a historical snapshot. Rehearsals may inspect new
  // evidence, but cannot replace a vote already recorded for this world day.
  // Reuse legacy records too; migration must not invent their observations.
  const decision = recorded && recorded.canonical === true &&
    recorded.day === day && recorded.id === `canonical-council-${day}`
    ? recorded
    : computeAgentCouncilDecision(world);
  world.agentCouncil = decision;
  world.agentActions = Array.isArray(world.agentActions) ? world.agentActions : [];
  if (!world.agentActions.some(action => action && action.id === decision.id)) {
    world.agentActions.push({
      id: decision.id,
      day: decision.day,
      agent: decision.proposer,
      action: `Council moved to ${decision.motion}.`,
      consequence: decision.consequence,
      refs: decision.council.map(agent => agent.name),
      canonical: true
    });
  }
  const latest = Array.isArray(world.history) && world.history[world.history.length - 1];
  if (latest && Number(latest.day) === decision.day) {
    latest.events = Array.isArray(latest.events) ? latest.events : [];
    if (!latest.events.some(event => event && event.id === decision.id)) {
      latest.events.push({
        id: decision.id,
        kind: 'council',
        headline: `${decision.proposer} proposed to ${decision.motion}; ${decision.dissenter} dissented; quorum ${decision.vote.yes}/${decision.vote.total}. ${decision.consequence}`,
        refs: decision.council.map(agent => agent.name)
      });
    }
  }
  return decision;
}

module.exports = { computeAgentCouncilDecision, refreshAgentCouncil, applyCouncilConsequence };

if (require.main === module) {
  const worldPath = path.join(__dirname, '..', 'experiments', 'world-state.json');
  const world = JSON.parse(fs.readFileSync(worldPath, 'utf8'));
  const decision = refreshAgentCouncil(world);
  fs.writeFileSync(worldPath, JSON.stringify(world, null, 2) + '\n');
  console.log(`Agent council: Day ${decision.day} · ${decision.vote.resolution} · ${decision.motion}`);
}
