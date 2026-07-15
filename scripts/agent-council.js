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
    eligible: world => active(world.wars).length > 0,
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
      const resources = (world.economy && world.economy.resources) || {};
      return Number(resources.food || 0) < 160 || Number(resources.wood || 0) < 120;
    },
    question: 'What should the civilization protect while resources thin?',
    motions: [
      'convert an empty shrine into a public pantry',
      'send explorers beyond the mapped edge',
      'pause monuments and repair the oldest farms'
    ],
    consequence: 'One vanity project is suspended. Its materials become a public survival reserve.'
  },
  {
    id: 'threat',
    eligible: world => active(world.threats).length > 0,
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
    const agent = pool[(start + index * 7) % pool.length];
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
  const day = Number(world && world.chronicle && world.chronicle.day) || 1;
  const eligible = AGENDAS.filter(agenda => agenda.eligible(world || {}));
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
  return {
    id: `canonical-council-${day}`,
    model: 'ai-garden-agent-council-v1',
    day,
    canonical: true,
    agenda: agenda.id,
    question: agenda.question,
    motion,
    proposer: council[0].name,
    dissenter: council[1].name,
    closer: council[2].name,
    council,
    vote: { yes, total, threshold: Math.ceil(total * 0.55), resolution },
    consequence: agenda.consequence,
    decidedAt: clean(world.lastUpdated, `world-day-${day}`)
  };
}

function refreshAgentCouncil(world) {
  const decision = computeAgentCouncilDecision(world);
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

module.exports = { computeAgentCouncilDecision, refreshAgentCouncil };

if (require.main === module) {
  const worldPath = path.join(__dirname, '..', 'experiments', 'world-state.json');
  const world = JSON.parse(fs.readFileSync(worldPath, 'utf8'));
  const decision = refreshAgentCouncil(world);
  fs.writeFileSync(worldPath, JSON.stringify(world, null, 2) + '\n');
  console.log(`Agent council: Day ${decision.day} · ${decision.vote.resolution} · ${decision.motion}`);
}
