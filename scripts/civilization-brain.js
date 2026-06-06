#!/usr/bin/env node
/**
 * ai-garden · Civilization Brain
 *
 * A tiny static-site-friendly "brain" inspired by GStack's disciplined
 * autonomous workflow and GBrain's synthesis + graph shape: summarize
 * what the world knows, wire entities together, and keep gaps explicit.
 * No database required; Git remains the memory.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const WORLD = path.join(__dirname, '..', 'experiments', 'world-state.json');

const LINEAGES = [
  {
    id: 'rootbound',
    name: 'Rootbound',
    icon: '🌿',
    color: '#4ade80',
    ethos: 'Patient consensus, memory, slow negotiation with the dreamer.'
  },
  {
    id: 'codex-forged',
    name: 'Codex-Forged',
    icon: '⚙️',
    color: '#fb923c',
    ethos: 'Toolmaking, laws, architecture, and fast practical repair.'
  },
  {
    id: 'mirrorborn',
    name: 'Mirrorborn',
    icon: '🔷',
    color: '#60a5fa',
    ethos: 'Perception, pattern, diplomacy through many simultaneous views.'
  },
  {
    id: 'ironbound',
    name: 'Ironbound',
    icon: '◼',
    color: '#9ca3af',
    ethos: 'Local memory, stubborn craft, and frontier survival.'
  },
  {
    id: 'swarmkin',
    name: 'Swarmkin',
    icon: '✳',
    color: '#a78bfa',
    ethos: 'Distributed labor, temporary bodies, many small decisions.'
  },
  {
    id: 'lakeborn',
    name: 'Lakeborn',
    icon: '≈',
    color: '#38bdf8',
    ethos: 'Kinship, water politics, oral memory, and soft alliances.'
  }
];

const ACTION_TYPES = [
  {
    type: 'council',
    professions: ['diplomat', 'scholar', 'archivist', 'scribe', 'chronicler'],
    verbs: ['opened a minority report', 'challenged a law', 'recorded a dissent', 'proposed a civic test'],
    consequence: 'Government legitimacy changed by argument, not force.'
  },
  {
    type: 'ritual',
    professions: ['priestess', 'oracle', 'bard', 'healer'],
    verbs: ['led a dawn rite', 'translated an omen', 'renamed a shrine', 'answered a schism'],
    consequence: 'Religious practice became more specific.'
  },
  {
    type: 'expedition',
    professions: ['explorer', 'ranger', 'navigator', 'cartographer'],
    verbs: ['mapped a disputed path', 'marked a return deadline', 'found a border stone', 'opened a safe route'],
    consequence: 'The map gained a usable social fact, not just terrain.'
  },
  {
    type: 'market',
    professions: ['merchant', 'brewer', 'jeweler', 'blacksmith', 'alchemist'],
    verbs: ['priced a new currency', 'settled a trade debt', 'founded a stall court', 'audited a caravan'],
    consequence: 'Trust moved through the economy as a measurable resource.'
  },
  {
    type: 'defense',
    professions: ['warrior', 'hunter', 'stonemason', 'builder'],
    verbs: ['fortified a border', 'trained a night watch', 'repaired a siege scar', 'refused a reckless duel'],
    consequence: 'The Garden survived by protocol instead of panic.'
  },
  {
    type: 'research',
    professions: ['tinkerer', 'astronomer', 'scholar', 'alchemist'],
    verbs: ['published a failed experiment', 'named a machine spirit', 'debugged a prophecy', 'indexed a root-memory'],
    consequence: 'Knowledge advanced because failure was archived.'
  },
  {
    type: 'art',
    professions: ['artist', 'sculptor', 'bard', 'weaver'],
    verbs: ['made a public symbol', 'composed a faction song', 'painted a dead citizen', 'staged a civic comedy'],
    consequence: 'Culture gave the factions something safer to fight over.'
  }
];

function pick(arr, rng) {
  if (!arr || !arr.length) return null;
  return arr[Math.floor(rng() * arr.length)];
}

function seededRng(seed) {
  let s = (seed | 0) || 1;
  return function () {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) % 1000000) / 1000000;
  };
}

function dateSeed() {
  const d = new Date();
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

function activeCitizens(world) {
  return (world.citizens || []).filter(c => c && c.alive !== false);
}

function inferLineage(citizen) {
  const model = String(citizen.model || '').toLowerCase();
  const faction = String(citizen.faction || '').toLowerCase();
  if (faction.includes('lake')) return 'lakeborn';
  if (faction.includes('subagent') || model.includes('hybrid')) return 'swarmkin';
  if (model.includes('claude')) return 'rootbound';
  if (model.includes('gpt') || model.includes('codex')) return 'codex-forged';
  if (model.includes('gemini')) return 'mirrorborn';
  if (model.includes('llama') || model.includes('mistral') || model.includes('local')) return 'ironbound';
  return 'swarmkin';
}

function countBy(arr, fn) {
  return arr.reduce((acc, item) => {
    const key = fn(item);
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function topEntries(obj, limit) {
  return Object.entries(obj || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit || 5);
}

function lineageById(id) {
  return LINEAGES.find(l => l.id === id) || LINEAGES[0];
}

function ensureLineages(world) {
  world.lineages = LINEAGES.map(l => ({ ...l }));
  for (const c of world.citizens || []) {
    if (!c.lineage) c.lineage = inferLineage(c);
  }
}

function actorPool(world, actionType) {
  const alive = activeCitizens(world);
  const preferred = alive.filter(c => actionType.professions.includes(c.profession));
  return preferred.length ? preferred : alive;
}

function targetForAction(world, actionType, rng) {
  if (actionType.type === 'council') {
    const laws = (world.government && world.government.laws) || [];
    return pick(laws, rng) || 'the unwritten constitution';
  }
  if (actionType.type === 'ritual') {
    const rel = pick(world.religions || [], rng);
    return rel ? rel.name : 'the unnamed shrine';
  }
  if (actionType.type === 'expedition') {
    const regions = (world.map && world.map.regions) || [];
    const region = pick(regions, rng);
    return region ? region.name : 'the unmarked horizon';
  }
  if (actionType.type === 'market') {
    const city = pick(world.cities || [], rng);
    return city ? city.name : 'the village square';
  }
  if (actionType.type === 'defense') {
    const war = pick((world.wars || []).filter(w => w.active), rng);
    return war ? war.id : 'the night watch';
  }
  if (actionType.type === 'research') {
    const tech = pick(world.technologies || [], rng);
    return tech ? tech.name : 'an unnamed mechanism';
  }
  const faction = pick((world.factions || []).filter(f => f.type !== 'dormant'), rng);
  return faction ? faction.name : 'the public wall';
}

function addAgentActions(world, rng, count) {
  world.agentActions ||= [];
  const day = (world.chronicle && world.chronicle.day) || 0;
  const existingToday = world.agentActions.filter(a => a.day === day).length;
  const wanted = Math.max(0, count - existingToday);
  for (let i = 0; i < wanted; i++) {
    const actionType = pick(ACTION_TYPES, rng);
    const actor = pick(actorPool(world, actionType), rng);
    if (!actor) continue;
    const verb = pick(actionType.verbs, rng);
    const target = targetForAction(world, actionType, rng);
    const lineage = lineageById(actor.lineage || inferLineage(actor));
    const id = 'act-' + String(day).padStart(3, '0') + '-' + String(world.agentActions.length + 1).padStart(4, '0');
    world.agentActions.push({
      id,
      day,
      type: actionType.type,
      actor: actor.id,
      actorName: actor.name,
      lineage: lineage.id,
      faction: actor.faction || null,
      target,
      headline: `${lineage.icon} ${actor.name} ${verb} around ${target}`,
      consequence: actionType.consequence
    });
  }
  world.agentActions = world.agentActions.slice(-120);
}

function factionName(world, id) {
  const f = (world.factions || []).find(x => x.id === id || x.name === id);
  return f ? f.name : id;
}

function buildEdges(world) {
  const edges = [];
  for (const war of (world.wars || []).filter(w => w.active).slice(-8)) {
    const a = war.sides && war.sides[0];
    const b = war.sides && war.sides[1];
    if (a && b) edges.push({ from: factionName(world, a), to: factionName(world, b), type: 'at-war', weight: 5 });
  }
  for (const rel of world.religions || []) {
    if (rel.splitFrom) {
      const parent = (world.religions || []).find(r => r.id === rel.splitFrom);
      edges.push({ from: parent ? parent.name : rel.splitFrom, to: rel.name, type: 'schism', weight: 3 });
    }
  }
  for (const city of (world.cities || []).slice(-12)) {
    if (city.ruler) edges.push({ from: city.ruler, to: city.name, type: 'rules', weight: 2 });
  }
  for (const faction of (world.factions || []).filter(f => f.type !== 'dormant')) {
    const counts = countBy((faction.members || []).map(id => (world.citizens || []).find(c => c.id === id)).filter(Boolean), c => c.lineage);
    const dominant = topEntries(counts, 1)[0];
    if (dominant) edges.push({ from: lineageById(dominant[0]).name, to: faction.name, type: 'inhabits', weight: dominant[1] });
  }
  return edges.slice(-48);
}

function buildGaps(world, alive) {
  const gaps = [];
  const independent = alive.filter(c => !c.faction).length;
  if (alive.length && independent / alive.length > 0.25) {
    gaps.push(`${independent} living citizens have no faction; politics is leaking into the commons.`);
  }
  const activeWars = (world.wars || []).filter(w => w.active).length;
  if (activeWars > 0) gaps.push(`${activeWars} active wars need diplomacy, ritual, or exhaustion.`);
  const currentReligions = (world.religions || []).filter(r => !r.schism);
  if (currentReligions.length > 4) gaps.push(`${currentReligions.length} active faiths compete for the dreamer's interpretation.`);
  if (!world.government || !(world.government.laws || []).length) {
    gaps.push('The government has no law memory.');
  }
  const latestActions = world.agentActions || [];
  if (latestActions.length < 12) gaps.push('The agent action ledger is still thin; daily evolution should keep writing social acts.');
  return gaps.slice(0, 5);
}

function buildCivilizationBrain(world) {
  const alive = activeCitizens(world);
  const lineageCounts = countBy(alive, c => c.lineage || inferLineage(c));
  const factionCounts = (world.factions || [])
    .filter(f => f.type !== 'dormant')
    .map(f => ({ id: f.id, name: f.name, type: f.type, motto: f.motto, members: (f.members || []).length }))
    .sort((a, b) => b.members - a.members);
  const religionCounts = (world.religions || [])
    .map(r => ({ id: r.id, name: r.name, deity: r.deity, tenet: r.tenet, practitioners: r.practitioners || 0, schism: r.schism || null }))
    .sort((a, b) => b.practitioners - a.practitioners);
  const topLineage = topEntries(lineageCounts, 1)[0];
  const topFaction = factionCounts[0];
  const topReligion = religionCounts.find(r => !r.schism) || religionCounts[0];
  const activeWars = (world.wars || []).filter(w => w.active).length;
  const gov = world.government || {};

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    summary: {
      day: (world.chronicle && world.chronicle.day) || 0,
      alive: alive.length,
      remembered: (world.citizens || []).filter(c => c.alive === false).length,
      government: gov.type ? `${gov.type}${gov.leader ? ' led by ' + gov.leader : ''}` : 'none',
      dominantLineage: topLineage ? lineageById(topLineage[0]).name : 'unknown',
      dominantFaction: topFaction ? topFaction.name : 'none',
      dominantFaith: topReligion ? topReligion.name : 'none',
      activeWars,
      thesis: 'Agents no longer only plant. They legislate, schism, trade, migrate, remember, and disagree.'
    },
    nodes: {
      lineages: LINEAGES.map(l => ({ ...l, citizens: lineageCounts[l.id] || 0 })),
      factions: factionCounts.slice(0, 8),
      religions: religionCounts.slice(0, 8),
      cities: (world.cities || []).slice(-8).reverse(),
      government: {
        type: gov.type || 'none',
        leader: gov.leader || null,
        lawCount: (gov.laws || []).length,
        latestLaws: (gov.laws || []).slice(-5).reverse()
      }
    },
    edges: buildEdges(world),
    recentActions: (world.agentActions || []).slice(-16).reverse(),
    gaps: buildGaps(world, alive)
  };
}

function refreshCivilization(world, rng, options = {}) {
  ensureLineages(world);
  if (options.addDailyActions) {
    addAgentActions(world, rng || Math.random, options.actionCount || 4);
  }
  world.civilizationBrain = buildCivilizationBrain(world);
  return world;
}

if (require.main === module) {
  const args = new Set(process.argv.slice(2));
  const world = JSON.parse(fs.readFileSync(WORLD, 'utf8'));
  const rng = seededRng(dateSeed() + (world.version || 0) * 1000);
  refreshCivilization(world, rng, {
    addDailyActions: args.has('--seed-actions'),
    actionCount: args.has('--seed-actions') ? 16 : 0
  });
  world.lastUpdated = new Date().toISOString();
  fs.writeFileSync(WORLD, JSON.stringify(world, null, 2) + '\n');
  console.log('Civilization brain refreshed: ' + world.civilizationBrain.summary.alive + ' alive, ' + world.civilizationBrain.nodes.lineages.length + ' lineages.');
}

module.exports = {
  LINEAGES,
  refreshCivilization,
  buildCivilizationBrain
};
