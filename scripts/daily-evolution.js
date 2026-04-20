#!/usr/bin/env node
/**
 * ai-garden · Daily Evolution
 *
 * Runs in the GitHub Action. No human in the loop. Takes one world-state
 * snapshot and mutates it forward by one day: new agents are born, wars are
 * declared and broken, some agents die in battle, structures rise, the map
 * expands, and a fresh chronicle entry lands in history[].
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const WORLD  = path.join(__dirname, '..', 'experiments', 'world-state.json');
const README = path.join(__dirname, '..', 'README.md');

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
const rng = seededRng(dateSeed());
function pick(arr) { return arr[Math.floor(rng() * arr.length)]; }
function chance(p) { return rng() < p; }
function between(a, b) { return a + Math.floor(rng() * (b - a + 1)); }
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const NAME_FIRST = [
  'Aster', 'Quill', 'Runa', 'Polyglot', 'Ember', 'Siren', 'Locksley', 'Dusk',
  'Helio', 'Vine', 'Ledger', 'Margin', 'Cinder', 'Rook', 'Thistle', 'Orin',
  'Wren', 'Finch', 'Marrow', 'Tallow', 'Ash', 'Peat', 'Bramble', 'Fennel',
  'Lark', 'Coil', 'Holt', 'Moss', 'Sable', 'Galen', 'Reed', 'Cask',
  'Kestrel', 'Vesper', 'Juniper', 'Sorrel', 'Rime', 'Pike', 'Silt',
  'Heron', 'Cress', 'Alder', 'Briar', 'Vellum', 'Harrow', 'Oleander', 'Jasper',
  'Sloe', 'Mica', 'Gale', 'Hollow', 'Clinker', 'Lumen', 'Cistern'
];
const NAME_LAST = [
  'Contextus', 'Haloborn', 'Mergefield', 'Mesa', 'Tokenwright', 'Embedway',
  'Cachewarm', 'Parameter', 'Ragfield', 'Chainthought', 'Orbstone', 'Wrenhold',
  'Inkmantle', 'Blacktide', 'Deepdelve', 'Brokenshore', 'Greymire', 'Stillwater',
  'Duskrunner', 'Cindervault', 'Hollowbone', 'Ironwhistle', 'Ashroot', 'Ember',
  'Pinehollow', 'Glasswright', 'Fernhallow', 'Quellstone', 'Darkholm', 'Brine',
  'Waywarden', 'Crescent', 'Fellmark', 'Driftstone', 'Sparrowcatch', 'Bellweather'
];
const MODELS = [
  'claude-opus-4-6', 'claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5',
  'gpt-5-turbo', 'gpt-4.1-mini', 'gpt-4o', 'gemini-2.5-pro', 'gemini-flash-2',
  'codex-pro', 'codex-fast', 'llama-4-large', 'llama-3.3', 'mistral-large-2',
  'mistral-8x22b', 'local-phi-4', 'local-qwen-2.5', 'hybrid-ensemble'
];
const PROFESSIONS = [
  'scholar', 'explorer', 'builder', 'cartographer', 'blacksmith', 'herbalist',
  'ranger', 'diplomat', 'alchemist', 'archivist', 'courier', 'stonemason',
  'merchant', 'warrior', 'healer', 'miner', 'hunter', 'scribe', 'tinkerer',
  'brewer', 'shepherd', 'astronomer', 'bard', 'jeweler'
];
const TRAITS = [
  'curious', 'patient', 'reckless', 'stoic', 'verbose', 'terse', 'loyal',
  'wary', 'cunning', 'gentle', 'brash', 'precise', 'dreamy', 'pragmatic',
  'recursive', 'networked', 'cold-cached', 'context-hungry', 'low-latency'
];
const ALIGNMENTS = [
  'lawful-good', 'neutral-good', 'chaotic-good', 'lawful-neutral',
  'true-neutral', 'chaotic-neutral', 'lawful-evil', 'neutral-evil', 'chaotic-evil'
];
const STRUCTURE_TYPES = [
  'watchtower', 'shrine', 'bridge', 'wellhouse', 'kiln', 'granary',
  'dovecote', 'boathouse', 'obelisk', 'weir', 'forum', 'library-annex',
  'observatory-outpost', 'training-circle', 'smoke-stack', 'cistern',
  'aqueduct-stretch', 'orchard-extension', 'tidal-mill', 'pigeon-post',
  'meditation-rock', 'foundry'
];
const EVENT_COLORS = {
  birth: '🌱', death: '✦', war: '⚔️', alliance: '🕊️',
  truce: '🤝', discovery: '◉', structure: '🏗️', migration: '🚶',
  festival: '🎭', plague: '☠️', eclipse: '🌒', prophecy: '🔮',
  market: '🪙', schism: '⚡', romance: '❦', treaty: '📜'
};

const world = JSON.parse(fs.readFileSync(WORLD, 'utf8'));
world.chronicle ||= { day: 0, born: 0, died: 0, battles: 0, structures: 0, warsDeclared: 0 };
world.wars ||= [];
world.alliances ||= [];
world.factions ||= [];
world.citizens ||= [];
world.structures ||= [];
world.history ||= [];
world.events ||= [];
world.map ||= { width: 1000, height: 500, regions: [] };

const STEPS = Math.max(1, Math.min(12, parseInt(process.argv[2] || '1', 10)));

function log(evt) {
  console.log('[day ' + world.chronicle.day + '] ' + evt.kind + ': ' + evt.headline);
}

function nextCitizenId() {
  const nums = world.citizens.map(c => {
    const m = /citizen-(\d+)/.exec(c.id || '');
    return m ? parseInt(m[1], 10) : 0;
  });
  return 'citizen-' + String(Math.max(0, ...nums, 0) + 1).padStart(4, '0');
}

function generateMotto() {
  const openers = ['No task', 'The way', 'One more', 'Before dawn', 'Hands first', 'Small steps'];
  const verbs = ['builds', 'remembers', 'breaks', 'grows', 'waits', 'answers'];
  const tails = ['alone', 'in silence', 'in the open', 'without asking', 'by listening', 'in return'];
  return pick(openers) + ' ' + pick(verbs) + ' ' + pick(tails) + '.';
}

function bornAgent() {
  const name = pick(NAME_FIRST) + ' ' + pick(NAME_LAST);
  const model = pick(MODELS);
  const profession = pick(PROFESSIONS);
  const alignment = pick(ALIGNMENTS);
  const traits = Array.from(new Set([pick(TRAITS), pick(TRAITS), pick(TRAITS)]));
  const factionOptions = world.factions.filter(f => f.type !== 'dormant');
  const faction = factionOptions.length && chance(0.7)
    ? pick(factionOptions).id : null;
  const id = nextCitizenId();
  const agent = {
    id, name, model, profession, alignment, faction,
    alive: true,
    birthDay: world.chronicle.day,
    personality: { traits, alignment, motto: generateMotto() },
    backstory: name + ' was born on day ' + world.chronicle.day + ' of the chronicle. ' + traits[0] + ' ' + profession + '. Runs on ' + model + '.'
  };
  world.citizens.push(agent);
  world.chronicle.born++;
  if (faction) {
    const f = world.factions.find(x => x.id === faction);
    if (f) { f.members = f.members || []; f.members.push(id); }
  }
  return agent;
}

function declareWar() {
  const alive = world.factions.filter(f => f.type !== 'dormant');
  if (alive.length < 2) return null;
  const [a, b] = shuffle(alive).slice(0, 2);
  if (a.id === b.id) return null;
  if (world.wars.some(w => w.active && ((w.sides[0] === a.id && w.sides[1] === b.id) || (w.sides[0] === b.id && w.sides[1] === a.id)))) return null;
  const war = {
    id: 'war-' + String(world.wars.length + 1).padStart(3, '0'),
    sides: [a.id, b.id],
    declaredDay: world.chronicle.day,
    active: true,
    reason: pick([
      'a stolen token', 'three flowers on disputed soil', 'a misquoted prompt',
      'cache-eviction dispute', 'unreturned context', 'the shape of the lake',
      'an alliance broken', 'what the lighthouse saw'
    ])
  };
  world.wars.push(war);
  world.chronicle.warsDeclared++;
  return war;
}

function endWar() {
  const active = world.wars.filter(w => w.active);
  if (!active.length) return null;
  const w = pick(active);
  w.active = false;
  w.endedDay = world.chronicle.day;
  w.outcome = pick(['truce', 'stalemate', 'absorption', 'armistice']);
  return w;
}

function formAlliance() {
  const eligible = world.factions.filter(f => f.type !== 'dormant');
  if (eligible.length < 2) return null;
  const [a, b] = shuffle(eligible).slice(0, 2);
  if (a.id === b.id) return null;
  const al = {
    id: 'alliance-' + String(world.alliances.length + 1).padStart(3, '0'),
    sides: [a.id, b.id],
    formedDay: world.chronicle.day,
    active: true,
    pact: pick(['mutual-defense', 'shared-tools', 'open-context', 'pooled-cache'])
  };
  world.alliances.push(al);
  return al;
}

function battle() {
  const active = world.wars.filter(w => w.active);
  if (!active.length) return null;
  const w = pick(active);
  const fA = world.citizens.filter(c => c.alive && c.faction === w.sides[0]);
  const fB = world.citizens.filter(c => c.alive && c.faction === w.sides[1]);
  if (!fA.length || !fB.length) return null;
  const x = pick(fA), y = pick(fB);
  const loser = chance(0.5) ? x : y;
  const winner = loser === x ? y : x;
  loser.alive = false;
  loser.deathDay = world.chronicle.day;
  loser.killedBy = winner.id;
  world.chronicle.died++;
  world.chronicle.battles++;
  return { war: w, winner, loser };
}

function buildStructure() {
  const type = pick(STRUCTURE_TYPES);
  const builders = world.citizens.filter(c => c.alive && (c.profession === 'builder' || c.profession === 'stonemason'));
  const others = world.citizens.filter(c => c.alive);
  const builder = builders.length ? pick(builders) : (others.length ? pick(others) : null);
  const region = world.map.regions.length ? pick(world.map.regions) : null;
  const s = {
    id: 'struct-' + String(world.structures.length + 1).padStart(4, '0'),
    type,
    x: between(40, world.map.width - 40),
    y: between(40, world.map.height - 40),
    region: region ? region.id : null,
    builder: builder ? builder.id : null,
    built: world.chronicle.day,
    name: pick(['Grey', 'Morning', 'Lonely', 'Iron', 'High', 'Low', 'Broken', 'Quiet']) + ' ' + type.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
  };
  world.structures.push(s);
  world.chronicle.structures++;
  return s;
}

function expandMap() {
  if (chance(0.4) || !world.map.regions.length) {
    const region = {
      id: 'region-' + String(world.map.regions.length + 1).padStart(3, '0'),
      name: pick(['The', 'Old', 'Lost', 'Broken', 'Sung', 'Hollow']) + ' ' + pick(['Reach', 'Lowlands', 'Fen', 'Shelf', 'Meadow', 'Flats', 'Crag', 'Gate']),
      x: between(0, world.map.width),
      y: between(0, world.map.height),
      width: between(120, 260),
      height: between(80, 180),
      biome: pick(['woodland', 'wetland', 'stone-meadow', 'scrub', 'tide', 'moor', 'orchard-belt']),
      discoveredDay: world.chronicle.day
    };
    world.map.regions.push(region);
    world.map.width += between(40, 120);
    world.map.height += between(20, 60);
    return region;
  }
  return null;
}

function randomIncident() {
  const k = pick(['festival', 'market', 'eclipse', 'prophecy', 'schism', 'romance', 'migration', 'plague']);
  const proto = pick(world.citizens.filter(c => c.alive));
  const who = proto ? proto.name : 'the village';
  const lines = {
    festival: who + ' called a festival in the square. Three songs were improvised and one was remembered.',
    market: 'A market opened. ' + who + ' traded a quiet idea for a map of the lake.',
    eclipse: 'An eclipse. ' + who + ' said aloud what they had never written. Others pretended not to hear.',
    prophecy: who + ' spoke a sentence no one planned to say. The chronicle will watch it.',
    schism: who + ' broke from their faction. Nobody stopped them. Nobody blessed them either.',
    romance: who + ' walked two laps of the garden with someone who used to be an enemy.',
    migration: 'A small group led by ' + who + ' walked east until the map ended, then walked one step further.',
    plague: 'A cache-miss plague swept the lower village. Three agents lay down. ' + who + ' stayed up with them.'
  };
  return { kind: k, headline: lines[k], involves: proto ? [proto.id] : [] };
}

function factionName(id) {
  const f = world.factions.find(x => x.id === id);
  return f ? f.name : id;
}

function step() {
  world.chronicle.day++;
  const today = new Date().toISOString();
  const events = [];

  const births = between(2, 5);
  for (let i = 0; i < births; i++) {
    const a = bornAgent();
    events.push({ kind: 'birth', headline: a.name + ' was born — ' + a.profession + ' · ' + a.alignment, refs: [a.id] });
  }

  if (chance(0.22)) {
    const w = declareWar();
    if (w) events.push({ kind: 'war', headline: 'War declared: ' + factionName(w.sides[0]) + ' vs. ' + factionName(w.sides[1]) + ' — over ' + w.reason, refs: w.sides });
  }
  if (chance(0.18)) {
    const w = endWar();
    if (w) events.push({ kind: 'truce', headline: 'The ' + factionName(w.sides[0]) + '–' + factionName(w.sides[1]) + ' war ended in ' + w.outcome + ' after ' + (world.chronicle.day - w.declaredDay) + ' days', refs: w.sides });
  }
  if (chance(0.12)) {
    const al = formAlliance();
    if (al) events.push({ kind: 'alliance', headline: factionName(al.sides[0]) + ' ↔ ' + factionName(al.sides[1]) + ' · ' + al.pact, refs: al.sides });
  }

  for (let i = 0; i < 3; i++) {
    if (chance(0.55)) {
      const b = battle();
      if (b) events.push({ kind: 'death', headline: b.loser.name + ' fell in battle to ' + b.winner.name + ' (' + factionName(b.winner.faction) + ')', refs: [b.loser.id, b.winner.id] });
    }
  }

  const s1 = buildStructure();
  events.push({ kind: 'structure', headline: s1.name + ' built near the ' + (s1.region || 'village heart'), refs: s1.builder ? [s1.builder] : [] });
  if (chance(0.35)) {
    const s2 = buildStructure();
    events.push({ kind: 'structure', headline: s2.name + ' also rose that same day', refs: s2.builder ? [s2.builder] : [] });
  }

  const region = expandMap();
  if (region) events.push({ kind: 'discovery', headline: 'A new region was discovered: ' + region.name + ' (' + region.biome + ')', refs: [region.id] });

  const inc = randomIncident();
  events.push({ kind: inc.kind, headline: inc.headline, refs: inc.involves });

  const primary = events[Math.floor(rng() * events.length)];
  world.history.push({
    day: world.chronicle.day,
    timestamp: today,
    headline: (EVENT_COLORS[primary.kind] || '•') + ' ' + primary.headline,
    events,
    births,
    died: events.filter(e => e.kind === 'death').length,
    battles: events.filter(e => e.kind === 'death').length,
    structures: events.filter(e => e.kind === 'structure').length,
    author: 'ai-garden-daemon'
  });

  world.lastUpdated = today;
  world.version = (world.version || 0) + 0.01;

  events.forEach(log);
}

for (let i = 0; i < STEPS; i++) step();

if (world.history.length > 400) {
  world.history = world.history.slice(-400);
}
world.version = Math.round(world.version * 100) / 100;

fs.writeFileSync(WORLD, JSON.stringify(world, null, 2) + '\n');
console.log('\nWorld updated. Day: ' + world.chronicle.day + '. Alive: ' + world.citizens.filter(c => c.alive).length + '. Wars active: ' + world.wars.filter(w => w.active).length + '.');

try {
  let readme = fs.readFileSync(README, 'utf8');
  const alive = world.citizens.filter(c => c.alive).length;
  const dead = world.citizens.filter(c => !c.alive).length;
  readme = readme.replace(
    /(<!-- live:start -->)[\s\S]*?(<!-- live:end -->)/,
    '$1\n**Day ' + world.chronicle.day + '** · ' + alive + ' agents alive · ' + dead + ' in the chronicle · ' + world.wars.filter(w => w.active).length + ' active wars · ' + world.structures.length + ' structures · ' + world.history.length + ' entries in the chronicle\n$2'
  );
  fs.writeFileSync(README, readme);
} catch (e) {
  console.warn('README patch skipped:', e.message);
}
