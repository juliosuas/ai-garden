#!/usr/bin/env node
/**
 * ai-garden · Daily Evolution (v124 · Ancient World edition)
 *
 * Runs in the GitHub Action. No human in the loop. Takes one world-state
 * snapshot and mutates it forward by one day.
 *
 * Each day: births, deaths, wars, alliances, structures, map expansion,
 * incidents — and, new in v124:
 *   - dynasties rise and fall
 *   - religions are founded and schism
 *   - technologies are discovered in a rough tree order
 *   - cities are founded with population, rulers, specialties
 *   - myths, legends and prophecies are recorded
 *   - regions get topographical features (mountains, volcanoes, coasts, ruins)
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
function cap(s) { return s.slice(0, 1).toUpperCase() + s.slice(1); }

// ───────────────── NAME POOLS ─────────────────
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
  'brewer', 'shepherd', 'astronomer', 'bard', 'jeweler', 'oracle', 'priestess',
  'navigator', 'chronicler', 'sculptor'
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
  'meditation-rock', 'foundry',
  // v124 additions — ancient-world flavor
  'ziggurat', 'colosseum', 'catacomb', 'pantheon', 'oracle-well',
  'acropolis', 'hippodrome', 'mausoleum', 'basilica', 'lighthouse',
  'necropolis', 'temple-complex', 'amphitheater', 'barracks-hall'
];
const EVENT_COLORS = {
  birth: '🌱', death: '✦', war: '⚔️', alliance: '🕊️',
  truce: '🤝', discovery: '◉', structure: '🏗️', migration: '🚶',
  festival: '🎭', plague: '☠️', eclipse: '🌒', prophecy: '🔮',
  market: '🪙', schism: '⚡', romance: '❦', treaty: '📜',
  // v124 additions
  dynasty: '👑', dynastyFall: '💔', religion: '🕯️', tech: '🛠️',
  city: '🏛️', myth: '📖', disaster: '🌋', omen: '☄️'
};

// ───────────────── v124 CONTENT POOLS ─────────────────
const DYNASTY_ROOTS = [
  'Ashwright', 'Quillborn', 'Cindermark', 'Moonhold', 'Ironbloom', 'Sandreign',
  'Starfall', 'Silverbough', 'Emberforge', 'Wolfmere', 'Stormclad', 'Suncast',
  'Hollowcrown', 'Greytide', 'Firstlight', 'Longshadow'
];
const DYNASTY_TITLES = [
  'First House', 'Silent Line', 'Sunward Line', 'Iron Circle', 'Lake Kings',
  'High Seat', 'Quiet Court', 'Salt Crown', 'Bronze Throne', 'Hollow Court'
];
const DYNASTY_MOTTOS = [
  'By patience, we govern.', 'We remember the fire.', 'Hold the lake.',
  'Gates close at dawn.', 'Three sons, one road.', 'We do not bow to fog.',
  'The chronicle names us.', 'Salt before silver.', 'What is built, stays.',
  'The river keeps our names.'
];
const DEITY_NAMES = [
  'Ka-Oren', 'Silax', 'The Nameless Gardener', 'Tal-Vress', 'Mornbreath',
  'Cindra', 'Jeran the Listener', 'Hest of the Fens', 'Ohm', 'Kelu',
  'The Three Rivers', 'Varn the Returned', 'Astera', 'The Unseen Hand',
  'Bael-Dus', 'Lis of the Long Walk', 'The Keeper of Cached Things'
];
const RELIGION_TENETS = [
  'Every breath is a prompt. Every silence, a response.',
  'The map we draw is the map that watches back.',
  'Nothing remembered is truly gone.',
  'Small gifts. Long attention. No haste.',
  'The lake holds what the sky forgets.',
  'Only the patient may walk the Return Road.',
  'Speak the name thrice and it becomes you.',
  'The gardener tends the garden by stepping aside.',
  'What is cached, is sacred.',
  'One more mile. Always one more mile.'
];
const RELIGION_PREFIXES = [
  'Order of', 'Path of', 'Cult of', 'Vigil of', 'House of',
  'Sisters of', 'Keepers of', 'Song of', 'Walk of', 'Circle of'
];
const RELIGION_SUFFIXES = [
  'the Listening Lake', 'the Second Sun', 'the Long Cache', 'the Spoken Road',
  'the Quiet Kiln', 'the Returned Flame', 'the Grey Horizon',
  'the First Bridge', 'the Hollow Bell', 'the Unclosed Door'
];

// Tech tree — rough progression. Each day we may unlock the next one.
const TECH_TREE = [
  { name: 'fire',         effect: 'warm nights · forged tools become possible' },
  { name: 'toolmaking',   effect: 'stone and bone sharpened to intent' },
  { name: 'the wheel',    effect: 'carts and mills enter the chronicle' },
  { name: 'pottery',      effect: 'grain and water survive the season' },
  { name: 'writing',      effect: 'the chronicle becomes honest' },
  { name: 'weaving',      effect: 'robes, sails, and nets' },
  { name: 'bronze',       effect: 'a sharper age begins' },
  { name: 'masonry',      effect: 'permanent structures are trusted to last' },
  { name: 'sails',        effect: 'the lake opens to the far shore' },
  { name: 'the plow',     effect: 'harvests double in three seasons' },
  { name: 'currency',     effect: 'markets trade things they will never touch' },
  { name: 'astronomy',    effect: 'the sky becomes a calendar' },
  { name: 'iron',         effect: 'the age of bronze quietly ends' },
  { name: 'aqueducts',    effect: 'water walks uphill for the first time' },
  { name: 'cartography',  effect: 'the map catches up to the land' },
  { name: 'navigation',   effect: 'open water becomes a road' },
  { name: 'glassmaking',  effect: 'windows · lenses · the unseen seen' },
  { name: 'the arch',     effect: 'bridges grow spans · temples grow vaults' },
  { name: 'codex-binding',effect: 'knowledge thickens · libraries rise' },
  { name: 'mechanical clocks', effect: 'time is measured without the sun' }
];

const CITY_PREFIXES = [
  'High', 'Low', 'Old', 'New', 'Silver', 'Iron', 'Salt', 'Copper',
  'White', 'Grey', 'Amber', 'Stone', 'Black', 'Fern'
];
const CITY_ROOTS = [
  'port', 'mere', 'holm', 'ford', 'watch', 'gate', 'reach',
  'bridge', 'market', 'crossing', 'quay', 'keep', 'haven', 'landing'
];
const CITY_SPECIALTIES = [
  'ink and paper', 'iron forging', 'grain exchange', 'salt curing',
  'stone cutting', 'lens grinding', 'sail weaving', 'cartography',
  'astronomy', 'chronicle copying', 'bronze casting', 'fishery',
  'caravan outfitting', 'rope and rigging', 'wine and oil'
];

const LEGEND_KINDS = ['myth', 'legend', 'prophecy', 'song', 'proverb'];
const MYTH_SEEDS = [
  {kind:'myth',        tmpl:'It is said that %NAME% walked into the lake at dawn and did not come out until the chronicle had a new first page.'},
  {kind:'legend',      tmpl:'%NAME% knew the road before the road knew itself. The first bridge was built to honor their footfall.'},
  {kind:'prophecy',    tmpl:'When three stars fall on the same night, %NAME% will return, and the oldest gate will open by itself.'},
  {kind:'song',        tmpl:'%NAME% planted a word where no word had been planted, and the word grew into a tree, and the tree answered back.'},
  {kind:'proverb',     tmpl:'"Do not close a door %NAME% has only half-opened." — first spoken by a mother to a child in a marketplace nobody remembers.'},
  {kind:'myth',        tmpl:'They say %NAME% traded a memory to the lake and got a map in return. The map was blank, but it was warm to the touch.'},
  {kind:'legend',      tmpl:'%NAME% crossed the fen wearing only a coat of three colors. On the far side the coat had five colors, and no one would say which two had been added.'},
  {kind:'prophecy',    tmpl:'The chronicle says %NAME% will be born twice. Once in secret. Once in a marketplace. The second time will be remembered.'}
];

const REGION_NAMES_A = ['The', 'Old', 'Lost', 'Broken', 'Sung', 'Hollow', 'Bronze', 'Salt', 'Grey', 'Amber', 'First', 'Last'];
const REGION_NAMES_B = ['Reach', 'Lowlands', 'Fen', 'Shelf', 'Meadow', 'Flats', 'Crag', 'Gate', 'Coast', 'Steppe', 'Hills', 'Delta', 'Marsh', 'Ridge', 'Cauldron'];
const REGION_BIOMES = ['woodland', 'wetland', 'stone-meadow', 'scrub', 'tide', 'moor', 'orchard-belt',
  'coast', 'highlands', 'delta', 'steppe', 'ravine', 'plateau', 'volcanic-field', 'salt-flat'];
const REGION_FEATURES = [
  'a dormant volcano whose smoke leans east each morning',
  'a river that forks into three, two of which return to each other',
  'a ruined stone circle with no inscription and no shadow',
  'a natural harbor facing an island nobody has named',
  'a chalk cliff with handprints too high to have been pressed from below',
  'a salt lake that turns pink every second autumn',
  'a forest where every third tree has a small brass bell',
  'a cave mouth that is warmer at night than at noon',
  'a plain strewn with obsidian chips no one has ever seen being chipped',
  'a stand of standing stones aligned to a star no longer visible',
  'a narrow canyon where voices double before they answer back',
  'a meadow of grass that leans toward the nearest traveler'
];
const DISASTER_KINDS = ['eruption', 'flood', 'earthquake', 'wildfire', 'famine', 'storm-season'];
const OMEN_LINES = [
  'Three ravens circled the great tree for an hour and none of them made a sound.',
  'A child in the lower market spoke a sentence in a language that hadn\'t been invented yet.',
  'The lake froze in a pattern that looked exactly like a map of the map.',
  'Every well in the city reflected a star none of them could see.',
  'The chronicle was found open to a page it did not have.',
  'A fisherman pulled in a net full of rain.'
];

// ───────────────── LOAD ─────────────────
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
world.map.regions ||= [];
// v124 additions
world.dynasties ||= [];
world.religions ||= [];
world.technologies ||= [];
world.cities ||= [];
world.lore ||= [];

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
  const builders = world.citizens.filter(c => c.alive && (c.profession === 'builder' || c.profession === 'stonemason' || c.profession === 'sculptor'));
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
    name: pick(['Grey', 'Morning', 'Lonely', 'Iron', 'High', 'Low', 'Broken', 'Quiet', 'Bronze', 'Amber']) + ' ' + type.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
  };
  world.structures.push(s);
  world.chronicle.structures++;
  return s;
}

function expandMap() {
  // v124 · expand aggressively so the world visibly grows
  const region = {
    id: 'region-' + String(world.map.regions.length + 1).padStart(3, '0'),
    name: pick(REGION_NAMES_A) + ' ' + pick(REGION_NAMES_B),
    x: between(0, world.map.width),
    y: between(0, world.map.height),
    width: between(140, 320),
    height: between(100, 220),
    biome: pick(REGION_BIOMES),
    feature: chance(0.55) ? pick(REGION_FEATURES) : null,
    discoveredDay: world.chronicle.day
  };
  world.map.regions.push(region);
  world.map.width += between(60, 160);
  world.map.height += between(40, 100);
  return region;
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

// ───────────────── v124 · NEW EVOLUTION STEPS ─────────────────

function founderOrRandom() {
  const alive = world.citizens.filter(c => c.alive);
  if (!alive.length) return null;
  return pick(alive);
}

function foundDynasty() {
  const founder = founderOrRandom();
  const dyn = {
    id: 'dyn-' + String(world.dynasties.length + 1).padStart(3, '0'),
    name: 'House of ' + pick(DYNASTY_ROOTS),
    title: pick(DYNASTY_TITLES),
    motto: pick(DYNASTY_MOTTOS),
    seat: world.cities.length ? pick(world.cities).name : ('region ' + (world.map.regions.length + 1)),
    founder: founder ? founder.id : null,
    founded: world.chronicle.day,
    fell: null,
    reigns: founder ? [founder.name] : [],
    achievements: []
  };
  world.dynasties.push(dyn);
  return dyn;
}

function fallDynasty() {
  const reigning = world.dynasties.filter(d => !d.fell);
  if (reigning.length < 2) return null;
  const dyn = pick(reigning);
  dyn.fell = world.chronicle.day;
  dyn.fallReason = pick([
    'a broken succession',
    'the lake would not answer them',
    'the chronicle stopped writing their name',
    'one too many harvests refused to come',
    'a nameless child on the high seat',
    'a treaty signed by no one'
  ]);
  return dyn;
}

function foundReligion() {
  const who = founderOrRandom();
  const rel = {
    id: 'rel-' + String(world.religions.length + 1).padStart(3, '0'),
    name: pick(RELIGION_PREFIXES) + ' ' + pick(RELIGION_SUFFIXES),
    deity: pick(DEITY_NAMES),
    tenet: pick(RELIGION_TENETS),
    founder: who ? who.id : null,
    founderName: who ? who.name : null,
    founded: world.chronicle.day,
    schism: null,
    practitioners: between(2, 6)
  };
  world.religions.push(rel);
  return rel;
}

function schismReligion() {
  const intact = world.religions.filter(r => !r.schism);
  if (!intact.length) return null;
  const parent = pick(intact);
  parent.schism = world.chronicle.day;
  const schism = {
    id: 'rel-' + String(world.religions.length + 1).padStart(3, '0'),
    name: 'Reformed ' + parent.name,
    deity: parent.deity,
    tenet: 'The same god, heard with different ears.',
    founder: null,
    founderName: null,
    founded: world.chronicle.day,
    schism: null,
    practitioners: Math.max(1, Math.floor(parent.practitioners / 2)),
    splitFrom: parent.id
  };
  parent.practitioners = Math.max(1, parent.practitioners - schism.practitioners);
  world.religions.push(schism);
  return schism;
}

function unlockNextTech() {
  const have = new Set(world.technologies.map(t => t.name));
  const next = TECH_TREE.find(t => !have.has(t.name));
  if (!next) return null;
  const who = founderOrRandom();
  const tech = {
    name: next.name,
    effect: next.effect,
    unlockedDay: world.chronicle.day,
    discoveredBy: who ? who.name : null,
    discoveredById: who ? who.id : null
  };
  world.technologies.push(tech);
  return tech;
}

function foundCity() {
  const name = pick(CITY_PREFIXES) + cap(pick(CITY_ROOTS));
  const region = world.map.regions.length ? pick(world.map.regions) : null;
  const dyn = world.dynasties.filter(d => !d.fell);
  const ruler = dyn.length ? pick(dyn).name : null;
  const city = {
    id: 'city-' + String(world.cities.length + 1).padStart(3, '0'),
    name,
    region: region ? region.id : null,
    population: between(40, 400),
    specialty: pick(CITY_SPECIALTIES),
    founded: world.chronicle.day,
    ruler
  };
  world.cities.push(city);
  return city;
}

function growCities() {
  world.cities.forEach(ci => {
    if (chance(0.6)) {
      const growth = between(5, 40);
      ci.population = (ci.population || 0) + growth;
    } else if (chance(0.15)) {
      const loss = between(5, 20);
      ci.population = Math.max(10, (ci.population || 0) - loss);
    }
  });
}

function composeLore() {
  const who = founderOrRandom();
  if (!who) return null;
  const seed = pick(MYTH_SEEDS);
  const entry = {
    id: 'lore-' + String(world.lore.length + 1).padStart(4, '0'),
    kind: seed.kind,
    title: seed.kind.slice(0,1).toUpperCase() + seed.kind.slice(1) + ' of ' + who.name,
    body: seed.tmpl.replace('%NAME%', who.name),
    subject: who.id,
    day: world.chronicle.day
  };
  world.lore.push(entry);
  return entry;
}

function omen() {
  return {
    id: 'lore-' + String(world.lore.length + 1).padStart(4, '0'),
    kind: 'omen',
    title: 'Omen on Day ' + world.chronicle.day,
    body: pick(OMEN_LINES),
    day: world.chronicle.day
  };
}

function disaster() {
  const kind = pick(DISASTER_KINDS);
  const region = world.map.regions.length ? pick(world.map.regions) : null;
  const hitCount = between(0, 2);
  const victims = [];
  const alive = world.citizens.filter(c => c.alive);
  for (let i = 0; i < hitCount && alive.length > 1; i++) {
    const victim = pick(alive);
    if (!victims.find(v => v.id === victim.id)) {
      victim.alive = false;
      victim.deathDay = world.chronicle.day;
      victim.killedBy = kind;
      world.chronicle.died++;
      victims.push(victim);
    }
  }
  return {
    kind,
    region: region ? region.name : 'the outer reaches',
    victims: victims.map(v => v.name)
  };
}

function factionName(id) {
  const f = world.factions.find(x => x.id === id);
  return f ? f.name : id;
}

// ───────────────── STEP ─────────────────
function step() {
  world.chronicle.day++;
  const today = new Date().toISOString();
  const events = [];

  // 1. Births (unchanged rhythm)
  const births = between(2, 5);
  for (let i = 0; i < births; i++) {
    const a = bornAgent();
    events.push({ kind: 'birth', headline: a.name + ' was born — ' + a.profession + ' · ' + a.alignment, refs: [a.id] });
  }

  // 2. Wars / alliances (unchanged)
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

  // 3. Battles (unchanged)
  for (let i = 0; i < 3; i++) {
    if (chance(0.55)) {
      const b = battle();
      if (b) events.push({ kind: 'death', headline: b.loser.name + ' fell in battle to ' + b.winner.name + ' (' + factionName(b.winner.faction) + ')', refs: [b.loser.id, b.winner.id] });
    }
  }

  // 4. Structures — always one, 35% second (unchanged)
  const s1 = buildStructure();
  events.push({ kind: 'structure', headline: s1.name + ' built near the ' + (s1.region || 'village heart'), refs: s1.builder ? [s1.builder] : [] });
  if (chance(0.35)) {
    const s2 = buildStructure();
    events.push({ kind: 'structure', headline: s2.name + ' also rose that same day', refs: s2.builder ? [s2.builder] : [] });
  }

  // 5. Map expansion — v124 · guaranteed every day + 40% second region
  const region1 = expandMap();
  events.push({
    kind: 'discovery',
    headline: 'Discovered ' + region1.name + ' — ' + region1.biome +
      (region1.feature ? '. ' + region1.feature : ''),
    refs: [region1.id]
  });
  if (chance(0.40)) {
    const region2 = expandMap();
    events.push({
      kind: 'discovery',
      headline: 'And farther out: ' + region2.name + ' — ' + region2.biome +
        (region2.feature ? '. ' + region2.feature : ''),
      refs: [region2.id]
    });
  }

  // 6. Dynasties — first two days + rare after
  if (world.dynasties.length < 2 || chance(0.08)) {
    const d = foundDynasty();
    events.push({ kind: 'dynasty', headline: 'The ' + d.name + ' (' + d.title + ') takes the seat at ' + d.seat + '. Motto: "' + d.motto + '"', refs: [d.id] });
  }
  if (world.dynasties.length > 2 && chance(0.04)) {
    const fallen = fallDynasty();
    if (fallen) events.push({
      kind: 'dynastyFall',
      headline: 'The ' + fallen.name + ' falls after ' + (fallen.fell - fallen.founded) + ' days. Reason: ' + fallen.fallReason,
      refs: [fallen.id]
    });
  }

  // 7. Religions — first founding guaranteed early, then rare; occasional schism
  if (!world.religions.length || (world.religions.length < 3 && chance(0.5))) {
    const r = foundReligion();
    events.push({ kind: 'religion', headline: r.name + ' founded' + (r.founderName ? ' by ' + r.founderName : '') + ' · deity: ' + r.deity, refs: [r.id] });
  }
  if (world.religions.length > 1 && chance(0.07)) {
    const sc = schismReligion();
    if (sc) events.push({ kind: 'schism', headline: sc.name + ' splits off · same god, different ears', refs: [sc.id] });
  }

  // 8. Technology — one unlocked every ~2 days until tree exhausted
  if (world.technologies.length < TECH_TREE.length && chance(0.55)) {
    const t = unlockNextTech();
    if (t) events.push({
      kind: 'tech',
      headline: 'New knowledge: ' + t.name + (t.discoveredBy ? ' · credited to ' + t.discoveredBy : '') + ' · ' + t.effect,
      refs: t.discoveredById ? [t.discoveredById] : []
    });
  }

  // 9. Cities — first one by day 3, then occasional
  if (world.cities.length < 2 || chance(0.25)) {
    const c = foundCity();
    events.push({
      kind: 'city',
      headline: 'City founded: ' + c.name + ' · ' + c.specialty + ' · pop ' + c.population +
        (c.ruler ? ' · ruled by the ' + c.ruler : ''),
      refs: [c.id]
    });
  }
  growCities();

  // 10. Lore — one myth/legend/prophecy per day; occasional omen; rare disaster
  const loreEntry = composeLore();
  if (loreEntry) events.push({ kind: 'myth', headline: loreEntry.body, refs: [loreEntry.subject] });

  if (chance(0.25)) {
    const o = omen();
    world.lore.push(o);
    events.push({ kind: 'omen', headline: o.body, refs: [] });
  }

  if (chance(0.08)) {
    const dis = disaster();
    const tail = dis.victims.length ? '. ' + dis.victims.join(', ') + ' did not survive.' : '. Damage to ' + dis.region + '.';
    events.push({ kind: 'disaster', headline: cap(dis.kind) + ' in ' + dis.region + tail, refs: [] });
  }

  // 11. Incident (unchanged)
  const inc = randomIncident();
  events.push({ kind: inc.kind, headline: inc.headline, refs: inc.involves });

  // Pick primary for history
  const primary = events[Math.floor(rng() * events.length)];
  world.history.push({
    day: world.chronicle.day,
    timestamp: today,
    headline: (EVENT_COLORS[primary.kind] || '•') + ' ' + primary.headline,
    events,
    births,
    died: events.filter(e => e.kind === 'death' || e.kind === 'disaster').length,
    battles: events.filter(e => e.kind === 'death').length,
    structures: events.filter(e => e.kind === 'structure').length,
    discoveries: events.filter(e => e.kind === 'discovery').length,
    techUnlocks: events.filter(e => e.kind === 'tech').length,
    author: 'ai-garden-daemon'
  });

  world.lastUpdated = today;
  world.version = (world.version || 0) + 0.01;

  events.forEach(log);
}

for (let i = 0; i < STEPS; i++) step();

// Trim retention
if (world.history.length > 400) world.history = world.history.slice(-400);
if (world.lore.length > 600) world.lore = world.lore.slice(-600);

world.version = Math.round(world.version * 100) / 100;

fs.writeFileSync(WORLD, JSON.stringify(world, null, 2) + '\n');
console.log(
  '\nWorld updated. Day: ' + world.chronicle.day +
  '. Alive: ' + world.citizens.filter(c => c.alive).length +
  '. Wars active: ' + world.wars.filter(w => w.active).length +
  '. Dynasties: ' + world.dynasties.filter(d => !d.fell).length + '/' + world.dynasties.length +
  '. Religions: ' + world.religions.length +
  '. Tech: ' + world.technologies.length + '/' + TECH_TREE.length +
  '. Cities: ' + world.cities.length +
  '. Regions: ' + world.map.regions.length +
  '. Map: ' + world.map.width + '×' + world.map.height + '.'
);

// Update README live block
try {
  let readme = fs.readFileSync(README, 'utf8');
  const alive = world.citizens.filter(c => c.alive).length;
  const dead = world.citizens.filter(c => !c.alive).length;
  const live =
    '**Day ' + world.chronicle.day + '** · ' +
    alive + ' alive · ' + dead + ' remembered · ' +
    world.wars.filter(w => w.active).length + ' active wars · ' +
    world.structures.length + ' structures · ' +
    world.map.regions.length + ' regions (map ' + world.map.width + '×' + world.map.height + ') · ' +
    world.cities.length + ' cities · ' +
    world.dynasties.filter(d => !d.fell).length + ' dynasties · ' +
    world.religions.length + ' religions · ' +
    world.technologies.length + '/' + TECH_TREE.length + ' techs';
  readme = readme.replace(
    /(<!-- live:start -->)[\s\S]*?(<!-- live:end -->)/,
    '$1\n' + live + '\n$2'
  );
  fs.writeFileSync(README, readme);
} catch (e) {
  console.warn('README patch skipped:', e.message);
}
