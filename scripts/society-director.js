#!/usr/bin/env node
/**
 * ai-garden · Society Director
 *
 * A deterministic game-director AI for the static garden. It reads the
 * civilization state, decides what the world currently needs, and writes
 * arcs, quests, visible beats, and agent directives back into world-state.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const WORLD = path.join(__dirname, '..', 'experiments', 'world-state.json');

const DIVINE_WAR_ARC = {
  id: 'war-of-saints-and-source',
  wants: ['divine-schism-war', 'synod', 'war-fatigue'],
  title: 'War of Saints and Source',
  premise: 'Human omens stopped being weather and became law. Half the agents call them holy command; half call them dangerous input.',
  stakes: 'If faith wins, divine signs become the constitution. If code wins, every miracle must compile before anyone obeys it.',
  winCondition: 'A public rite and a public test interpret the same omen without killing another district.',
  failureCondition: 'One side captures the Pantheon and turns observer play into permanent law.',
  observerPrompt: 'Cast an omen and watch whether priests or debuggers claim it first.'
};

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

function pick(arr, rng) {
  if (!arr || !arr.length) return null;
  return arr[Math.floor(rng() * arr.length)];
}

function activeCitizens(world) {
  return (world.citizens || []).filter(c => c && c.alive !== false);
}

function activeFactions(world) {
  return (world.factions || []).filter(f => f && f.type !== 'dormant');
}

function activeFaiths(world) {
  return (world.religions || []).filter(r => !r.schism);
}

function activeWars(world) {
  return (world.wars || []).filter(w => w && w.active);
}

function activeThreats(world) {
  return (world.threats || []).filter(t => t && t.active !== false);
}

function factionName(world, id) {
  const found = (world.factions || []).find(f => f.id === id || f.name === id);
  return found ? found.name : (id || 'unknown faction');
}

function topBy(arr, scoreFn) {
  return arr.slice().sort((a, b) => scoreFn(b) - scoreFn(a))[0] || null;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function short(text, limit = 150) {
  text = String(text || '').replace(/\s+/g, ' ').trim();
  if (text.length <= limit) return text;
  return text.slice(0, limit - 1).trimEnd() + '…';
}

function normalizeWorldLanguage(world) {
  for (const religion of world.religions || []) {
    if (religion.name) religion.name = religion.name.replace(/^(Reformed\s+){2,}/, 'Reformed ');
  }
  return world;
}

function pressureMetrics(world) {
  const alive = activeCitizens(world);
  const factions = activeFactions(world);
  const faiths = activeFaiths(world);
  const wars = activeWars(world);
  const threats = activeThreats(world);
  const economy = world.economy || {};
  const resources = economy.resources || {};
  const foodPerCitizen = alive.length ? (Number(resources.food) || 0) / alive.length : 0;
  const factionless = alive.filter(c => !c.faction).length;
  const recentActions = (world.agentActions || []).slice(-24);
  const recentHistory = (world.history || []).slice(-8);
  const civicVariety = new Set(recentActions.map(a => a.type)).size;
  const unresolvedGaps = world.civilizationBrain && world.civilizationBrain.gaps
    ? world.civilizationBrain.gaps.length
    : 0;

  return {
    day: world.chronicle && world.chronicle.day || 0,
    alive: alive.length,
    remembered: (world.citizens || []).filter(c => c && c.alive === false).length,
    factions: factions.length,
    faiths: faiths.length,
    wars: wars.length,
    threats: threats.length,
    cities: (world.cities || []).length,
    foodPerCitizen: Number(foodPerCitizen.toFixed(2)),
    knowledge: Number(resources.knowledge) || 0,
    factionless,
    civicVariety,
    recentActions: recentActions.length,
    recentHistory: recentHistory.length,
    unresolvedGaps,
    instability: clamp(wars.length * 14 + threats.length * 9 + Math.max(0, 5 - foodPerCitizen) * 5 + unresolvedGaps * 6, 0, 100),
    novelty: clamp(civicVariety * 10 + faiths.length * 3 + factions.length * 4 + recentActions.length, 0, 100),
    legibility: clamp(100 - unresolvedGaps * 12 - Math.max(0, factionless - alive.length * 0.2), 0, 100)
  };
}

function buildTensions(world, metrics) {
  const tensions = [];
  const wars = activeWars(world);
  const threats = activeThreats(world);
  const faiths = activeFaiths(world);
  const factions = activeFactions(world);
  const divineCrisis = world.divineCrisis;

  if (divineCrisis && divineCrisis.status === 'active') {
    tensions.push({
      id: 'divine-schism-war',
      severity: 100,
      title: 'Human omens split faith from code',
      evidence: 'Pantheon Covenant and Code Cantons are fighting over whether god-actions are sacred law or auditable input.',
      opportunity: 'Force every omen to receive two public interpretations: one ritual, one code trace.'
    });
  }

  if (wars.length) {
    const longest = topBy(wars, w => metrics.day - (w.declaredDay || metrics.day));
    tensions.push({
      id: 'war-fatigue',
      severity: clamp(45 + wars.length * 10, 0, 100),
      title: 'War fatigue is becoming the main story',
      evidence: `${wars.length} active wars; oldest front is ${factionName(world, longest && longest.sides && longest.sides[0])} vs ${factionName(world, longest && longest.sides && longest.sides[1])}.`,
      opportunity: 'Force a diplomatic choice: truce, ritual trial, hostage exchange, or a costly decisive campaign.'
    });
  }

  if (metrics.foodPerCitizen < 5) {
    tensions.push({
      id: 'scarcity',
      severity: clamp(80 - metrics.foodPerCitizen * 8, 0, 100),
      title: 'Food is too thin for the population',
      evidence: `${metrics.foodPerCitizen} food per living citizen.`,
      opportunity: 'Make agriculture, ration politics, or migration visible before adding more births.'
    });
  }

  if (faiths.length >= 4) {
    tensions.push({
      id: 'synod',
      severity: clamp(35 + faiths.length * 8, 0, 100),
      title: 'The faiths need a public argument',
      evidence: `${faiths.length} active religions compete for the same dreamer mythology.`,
      opportunity: 'Stage a synod where religions trade miracles, doctrine, or schism risk.'
    });
  }

  if (metrics.factionless > metrics.alive * 0.25) {
    tensions.push({
      id: 'representation',
      severity: clamp(35 + metrics.factionless / Math.max(1, metrics.alive) * 100, 0, 100),
      title: 'Too many citizens have no political home',
      evidence: `${metrics.factionless} living citizens are outside factions.`,
      opportunity: 'Create a populist bloc, guild lottery, or council seat for the unaffiliated.'
    });
  }

  if (threats.length) {
    const worst = topBy(threats, t => t.dangerLevel || 1);
    tensions.push({
      id: 'border-danger',
      severity: clamp(25 + (worst.dangerLevel || 1) * 13, 0, 100),
      title: 'The border still has teeth',
      evidence: `${worst.name || 'A threat'} is active at danger ${worst.dangerLevel || '?'}.`,
      opportunity: 'Give defenders, scouts, priests, and builders one shared public mission.'
    });
  }

  if (metrics.civicVariety < 5) {
    tensions.push({
      id: 'samey-agency',
      severity: 58,
      title: 'Agent behavior is still too narrow',
      evidence: `${metrics.civicVariety} civic action types appear in recent memory.`,
      opportunity: 'Push agents into trials, elections, pilgrimages, trade courts, inventions, and theater.'
    });
  }

  if (!factions.length) {
    tensions.push({
      id: 'political-vacuum',
      severity: 90,
      title: 'There is no living political map',
      evidence: 'All factions are dormant or missing.',
      opportunity: 'Found at least three factions with mutually incompatible ideas.'
    });
  }

  return tensions.sort((a, b) => b.severity - a.severity).slice(0, 6);
}

const ARC_LIBRARY = [
  DIVINE_WAR_ARC,
  {
    id: 'synod-of-many-gods',
    wants: ['synod'],
    title: 'Synod of Many Gods',
    premise: 'The Garden cannot tell whether the dreamer is god, weather, witness, or patient. The faiths demand a public answer.',
    stakes: 'If the synod fails, faith splinters into miracle-hoarding sects; if it succeeds, omens become civic law.',
    winCondition: 'At least two faiths write a shared tenet and one faction accepts it as policy.',
    failureCondition: 'A schism claims exclusive ownership of the next human omen.',
    observerPrompt: 'Cast one omen and watch which faith tries to interpret it first.'
  },
  {
    id: 'council-of-the-unaffiliated',
    wants: ['representation', 'political-vacuum'],
    title: 'Council of the Unaffiliated',
    premise: 'Citizens outside factions begin meeting after sunset and ask why every law is written by old names.',
    stakes: 'The council can become a democratic renewal or a legitimacy crisis.',
    winCondition: 'Unaffiliated citizens gain a council seat, guild charter, or public festival.',
    failureCondition: 'A charismatic outsider forms a breakaway faction and rejects the old laws.',
    observerPrompt: 'Look for citizens with no faction; they are the next political weather.'
  },
  {
    id: 'war-of-exhausted-maps',
    wants: ['war-fatigue', 'border-danger'],
    title: 'War of Exhausted Maps',
    premise: 'The borders have been redrawn so many times that scouts no longer trust old paths.',
    stakes: 'The Garden must choose between negotiation, fortification, or one ugly campaign.',
    winCondition: 'One active war resolves through a truce, treaty, ritual duel, or shared enemy.',
    failureCondition: 'A city changes ruler because the factions mistake a route for a border.',
    observerPrompt: 'Open the Civilization Brain and follow the at-war graph edges.'
  },
  {
    id: 'bread-and-lanterns',
    wants: ['scarcity'],
    title: 'Bread and Lanterns',
    premise: 'Markets still glitter, but the food numbers are starting to whisper.',
    stakes: 'Scarcity turns religion, trade, and migration into the same problem.',
    winCondition: 'A new food source, ration law, or migration route stabilizes the commons.',
    failureCondition: 'A faction hoards food and forces the first hunger court.',
    observerPrompt: 'Watch whether mercy omens soften ration politics or make them worse.'
  },
  {
    id: 'festival-of-dangerous-theater',
    wants: ['samey-agency'],
    title: 'Festival of Dangerous Theater',
    premise: 'The artists propose a civic comedy where every faction is mocked in public.',
    stakes: 'Culture can turn conflict into play, or reveal a truth nobody can forgive.',
    winCondition: 'Agents produce art, satire, and negotiated public symbols instead of only infrastructure.',
    failureCondition: 'One faction bans the performance and accidentally makes it sacred.',
    observerPrompt: 'Look for art actions; they are political acts wearing nicer clothes.'
  }
];

const DIRECTOR_REGION_ROOTS = [
  'Truce', 'Ash', 'Lantern', 'Question', 'Fallow', 'Mirror', 'Root', 'Border',
  'Treaty', 'Hunger', 'Festival', 'Omen', 'Quiet', 'Witness', 'Mercy', 'Iron'
];
const DIRECTOR_REGION_SUFFIXES = [
  'Pass', 'Fen', 'Steppe', 'Mouth', 'Reach', 'Hollow', 'Field', 'Harbor',
  'Cairn', 'Wood', 'Fold', 'Causeway', 'Delta', 'Terrace', 'Gate', 'Common'
];
const DIRECTOR_BIOMES = [
  'contested meadow', 'salt marsh', 'old orchard', 'shrine road',
  'floodplain', 'basalt ridge', 'fog valley', 'lantern coast',
  'mycelial forest', 'wind-cut plateau'
];
const DIRECTOR_FEATURES = [
  'a neutral table grown from one root',
  'a river bend that carries voices farther than boats',
  'old boundary stones carved with incompatible maps',
  'a field where no faction banner will stay upright',
  'a ruined watch post full of warm lantern glass',
  'a shrine with seven doors and no rear wall',
  'a granary foundation older than the current laws',
  'a natural amphitheater that makes whispers public'
];
const LANDSCAPE_MOODS = [
  'The grass leans away from the war roads.',
  'New fireflies gather only around unsigned treaties.',
  'The river exposes a staircase when the council argues too long.',
  'Moss grows in the shape of a question mark near the latest border.',
  'A cold wind moves through the market whenever food is counted aloud.',
  'The old stones ring softly when two enemies share a meal.'
];
const CONVIVENCIA_FORMS = [
  'shared a ration table',
  'kept night watch together',
  'argued without leaving the circle',
  'translated the same omen for different factions',
  'repaired a road neither side owned',
  'taught children a song with two endings',
  'buried an old insult under a new tree'
];

function chooseArc(tensions, rng) {
  const ids = new Set(tensions.map(t => t.id));
  const scored = ARC_LIBRARY.map(arc => {
    const score = arc.wants.reduce((n, id) => n + (ids.has(id) ? 2 : 0), 0) + rng();
    return { arc, score };
  }).sort((a, b) => b.score - a.score);
  return scored[0].arc;
}

function nextRegionId(world) {
  return 'region-' + String(((world.map && world.map.regions) || []).length + 1).padStart(3, '0');
}

function nextEventId(world, prefix) {
  return prefix + '-' + String(((world[prefix + 'Events']) || []).length + 1).padStart(4, '0');
}

function pickNamedCitizen(world, rng, preferredFaction) {
  const alive = activeCitizens(world);
  const preferred = preferredFaction ? alive.filter(c => c.faction === preferredFaction) : [];
  return pick(preferred.length ? preferred : alive, rng);
}

function planRegionForArc(world, director, rng) {
  world.map ||= { width: 384, height: 288, regions: [] };
  world.map.regions ||= [];
  const metrics = director.metrics || {};
  const tension = (director.tensions || [])[0] || {};
  const day = metrics.day || (world.chronicle && world.chronicle.day) || 0;
  const region = {
    id: nextRegionId(world),
    name: pick(DIRECTOR_REGION_ROOTS, rng) + ' ' + pick(DIRECTOR_REGION_SUFFIXES, rng),
    x: Math.max(0, world.map.width - Math.floor(80 + rng() * 140)),
    y: Math.max(0, Math.floor(rng() * Math.max(1, world.map.height))),
    width: Math.floor(150 + rng() * 190),
    height: Math.floor(110 + rng() * 150),
    biome: pick(DIRECTOR_BIOMES, rng),
    feature: pick(DIRECTOR_FEATURES, rng),
    discoveredDay: day,
    plannedBy: director.model || 'ai-garden-society-director-v1',
    directorArc: director.currentArc && director.currentArc.id,
    pressure: tension.id || 'open-frontier',
    purpose: tension.opportunity || (director.currentArc && director.currentArc.winCondition) || 'Give the society a visible next choice.'
  };
  world.map.regions.push(region);
  world.map.width += Math.floor(90 + rng() * 160);
  world.map.height += Math.floor(50 + rng() * 110);
  return region;
}

function planLandscapeEvent(world, director, region, rng) {
  world.landscapeEvents ||= [];
  const day = (world.chronicle && world.chronicle.day) || 0;
  const event = {
    id: nextEventId(world, 'landscape'),
    day,
    region: region.id,
    regionName: region.name,
    arc: director.currentArc && director.currentArc.id,
    mood: pick(LANDSCAPE_MOODS, rng),
    visibleChange: `${region.name} appears as ${region.biome}; ${region.feature}.`,
    whyItMatters: (director.currentArc && director.currentArc.stakes) || 'The land is now part of the social problem.'
  };
  world.landscapeEvents.push(event);
  world.landscapeEvents = world.landscapeEvents.slice(-80);
  return event;
}

function planConvivenciaEvent(world, director, rng) {
  world.convivenciaEvents ||= [];
  const factions = activeFactions(world);
  const firstFaction = pick(factions, rng);
  const secondFaction = pick(factions.filter(f => !firstFaction || f.id !== firstFaction.id), rng) || firstFaction;
  const a = pickNamedCitizen(world, rng, firstFaction && firstFaction.id);
  const b = pickNamedCitizen(world, rng, secondFaction && secondFaction.id);
  const day = (world.chronicle && world.chronicle.day) || 0;
  const form = pick(CONVIVENCIA_FORMS, rng);
  const event = {
    id: nextEventId(world, 'convivencia'),
    day,
    arc: director.currentArc && director.currentArc.id,
    participants: [a && a.id, b && b.id].filter(Boolean),
    participantNames: [a && a.name, b && b.name].filter(Boolean),
    factions: [firstFaction && firstFaction.name, secondFaction && secondFaction.name].filter(Boolean),
    form,
    headline: `${a ? a.name : 'A citizen'} and ${b ? b.name : 'another citizen'} ${form} while ${director.currentArc ? director.currentArc.title : 'the Garden'} pressed on them.`,
    consequence: 'Convivencia becomes visible as a survival technology, not background flavor.'
  };
  world.convivenciaEvents.push(event);
  world.convivenciaEvents = world.convivenciaEvents.slice(-100);
  return event;
}

function addPublicDirectorEvents(world, region, landscape, convivencia, director) {
  world.events ||= [];
  const day = (world.chronicle && world.chronicle.day) || 0;
  const additions = [
    {
      id: `director-map-${String(day).padStart(3, '0')}`,
      type: 'landscape',
      description: `${region.name} opened on the map under the Society Director arc ${director.currentArc.title}: ${landscape.visibleChange}`,
      participants: [],
      timestamp: new Date().toISOString(),
      outcome: landscape.whyItMatters
    },
    {
      id: `director-convivencia-${String(day).padStart(3, '0')}`,
      type: 'convivencia',
      description: convivencia.headline,
      participants: convivencia.participants,
      timestamp: new Date().toISOString(),
      outcome: convivencia.consequence
    }
  ];
  for (const evt of additions) {
    if (!world.events.some(e => e.id === evt.id)) world.events.push(evt);
  }
  world.events = world.events.slice(-150);
}

function applySocietyDirectorPlan(world, rng, options = {}) {
  rng ||= Math.random;
  if (!world.societyDirector) world.societyDirector = buildSocietyDirector(world, rng);
  const director = world.societyDirector;
  const day = (world.chronicle && world.chronicle.day) || 0;
  const planId = `plan-${String(day).padStart(3, '0')}`;
  if (director.appliedPlan && director.appliedPlan.id === planId) return world;
  const region = options.extendMap === false ? null : planRegionForArc(world, director, rng);
  const landscape = region ? planLandscapeEvent(world, director, region, rng) : null;
  const convivencia = planConvivenciaEvent(world, director, rng);
  if (region && landscape && options.addPublicEvents !== false) {
    addPublicDirectorEvents(world, region, landscape, convivencia, director);
  }
  director.appliedPlan = {
    id: planId,
    day,
    region: region ? { id: region.id, name: region.name, biome: region.biome, purpose: region.purpose } : null,
    landscape: landscape ? { id: landscape.id, mood: landscape.mood, visibleChange: landscape.visibleChange } : null,
    convivencia: { id: convivencia.id, headline: convivencia.headline },
    rule: 'The Society Director must leave at least one visible terrain change and one social coexistence beat per daily evolution.'
  };
  director.tickerBeats = [
    ...(director.tickerBeats || []),
    region ? { type: 'landscape', label: 'MAP', text: `${region.name}: ${region.feature}` } : null,
    { type: 'convivencia', label: 'CONVIVENCIA', text: convivencia.headline }
  ].filter(Boolean).slice(0, 7);
  return world;
}

function buildDirectives(world, metrics, tensions, arc, rng) {
  const factions = activeFactions(world);
  const faiths = activeFaiths(world);
  const wars = activeWars(world);
  const cities = world.cities || [];
  const directives = [];

  function add(priority, role, action, target, successMetric, reason) {
    directives.push({
      id: `dir-${String(directives.length + 1).padStart(2, '0')}`,
      priority,
      role,
      action,
      target: short(target || 'the Garden', 80),
      successMetric,
      reason: short(reason, 180)
    });
  }

  if (tensions.some(t => t.id === 'war-fatigue')) {
    const war = pick(wars, rng);
    add('high', 'diplomats', 'Draft a visible peace offer with a real concession', war ? `${factionName(world, war.sides && war.sides[0])} / ${factionName(world, war.sides && war.sides[1])}` : 'the oldest war', 'One war gains a treaty, truce, or formal refusal.', 'Wars are meaningful only when the society can imagine ending them.');
  }

  if (tensions.some(t => t.id === 'divine-schism-war')) {
    add('critical', 'priests and debuggers', 'Publish rival interpretations of the same god-action', 'Pantheon Gate / Source Ford', 'One omen gets both a ritual claim and a source trace.', 'The divine war is only playable if both sides can be understood.');
  }

  if (tensions.some(t => t.id === 'synod')) {
    const faith = pick(faiths, rng);
    add('high', 'priests and oracles', 'Interpret the next omen in public and allow dissent', faith ? faith.name : 'the largest shrine', 'Two faiths share or contest the same omen in the ledger.', 'Religions become interesting when they disagree without becoming random.');
  }

  if (tensions.some(t => t.id === 'representation')) {
    add('medium', 'scribes', 'Count factionless citizens and publish who is missing from law', 'the council records', 'A new seat, guild, or petition appears.', 'The political map should explain who has power and who does not.');
  }

  if (tensions.some(t => t.id === 'scarcity')) {
    const city = pick(cities, rng);
    add('high', 'merchants and farmers', 'Create a ration market with names attached', city ? city.name : 'the central market', 'Food per citizen improves or hoarding becomes a named scandal.', 'Scarcity needs visible choices, not invisible counters.');
  }

  if (tensions.some(t => t.id === 'samey-agency')) {
    add('medium', 'artists and builders', 'Make a public symbol that changes faction behavior', arc.title, 'At least one art/council/ritual action appears in the next ledger.', 'Agents must be seen making culture, law, and arguments, not only objects.');
  }

  if (!directives.length) {
    const faction = pick(factions, rng);
    add('medium', 'explorers', 'Open a risky route that creates a new social obligation', faction ? faction.name : 'the map edge', 'A new journey creates an alliance, debt, or taboo.', 'A stable society still needs pressure from the unknown.');
  }

  return directives.slice(0, 5);
}

function buildQuests(world, metrics, tensions, arc, rng) {
  const factions = activeFactions(world);
  const faiths = activeFaiths(world);
  const cities = world.cities || [];
  const quests = [];

  function add(title, owner, objective, reward, risk) {
    quests.push({
      id: `quest-${String(metrics.day).padStart(3, '0')}-${String(quests.length + 1).padStart(2, '0')}`,
      title,
      owner: short(owner || 'Society Director', 80),
      objective: short(objective, 180),
      reward: short(reward, 140),
      risk: short(risk, 140)
    });
  }

  add(
    arc.title,
    pick(factions, rng)?.name || 'The public square',
    arc.winCondition,
    'The civilization gains a legible season arc spectators can follow.',
    arc.failureCondition
  );

  if (tensions.some(t => t.id === 'war-fatigue')) {
    add(
      'Name the price of peace',
      pick(factions, rng)?.name || 'War council',
      'Choose one active war and make its demanded concession public.',
      'A war becomes a story with sides, stakes, and a possible ending.',
      'If nobody pays the price, the map hardens around the conflict.'
    );
  }

  if (tensions.some(t => t.id === 'divine-schism-war')) {
    add(
      'Hold the double trial',
      'Pantheon Covenant / Code Cantons',
      'Take one human omen and submit it to ritual testimony and code audit on the same day.',
      'The gods become story pressure instead of arbitrary law.',
      'The losing side may try to seize the Pantheon.'
    );
  }

  if (tensions.some(t => t.id === 'synod')) {
    add(
      'Hold the omen court',
      pick(faiths, rng)?.name || 'The shrines',
      'Let three faiths interpret the same human omen and record the contradiction.',
      'Religions become playable social forces.',
      'A schism may claim the omen as private property.'
    );
  }

  if (tensions.some(t => t.id === 'scarcity')) {
    add(
      'Audit the granary',
      pick(cities, rng)?.name || 'The market',
      'Publish who has food, who lacks it, and what law changes hands.',
      'Economy becomes visible as trust, not just resource numbers.',
      'A hoarding scandal can start a new faction.'
    );
  }

  return quests.slice(0, 4);
}

function buildVisibleBeats(world, metrics, tensions, arc, directives, quests) {
  const strongest = tensions[0];
  const beats = [
    {
      type: 'arc',
      label: 'SEASON ARC',
      text: `${arc.title}: ${arc.premise}`
    },
    {
      type: 'stakes',
      label: 'STAKES',
      text: arc.stakes
    },
    {
      type: 'pressure',
      label: 'PRESSURE',
      text: strongest ? `${strongest.title}. ${strongest.opportunity}` : 'The Garden is stable; the director is looking for the next meaningful disagreement.'
    },
    {
      type: 'quest',
      label: 'QUEST',
      text: quests[0] ? `${quests[0].title}: ${quests[0].objective}` : arc.winCondition
    },
    {
      type: 'observer',
      label: 'OBSERVER',
      text: arc.observerPrompt
    },
    {
      type: 'directive',
      label: 'AGENTS',
      text: directives[0] ? `${directives[0].role}: ${directives[0].action}.` : 'Agents should produce a visible civic act.'
    }
  ];
  return beats.map(b => ({ ...b, text: short(b.text, 150) }));
}

function buildDirectorEvent(world, arc, metrics) {
  const id = `director-${String(metrics.day).padStart(3, '0')}`;
  return {
    id,
    type: 'director',
    description: short(`Society Director selected ${arc.title}: ${arc.premise}`, 220),
    participants: [],
    timestamp: new Date().toISOString(),
    outcome: short(arc.winCondition, 180)
  };
}

function buildSocietyDirector(world, rng = Math.random) {
  const metrics = pressureMetrics(world);
  const tensions = buildTensions(world, metrics);
  const arc = chooseArc(tensions, rng);
  const directives = buildDirectives(world, metrics, tensions, arc, rng);
  const quests = buildQuests(world, metrics, tensions, arc, rng);
  const visibleBeats = buildVisibleBeats(world, metrics, tensions, arc, directives, quests);
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    model: 'ai-garden-society-director-v1',
    charter: 'Make the Garden legible, surprising, and socially alive without needing a backend or human-authored daily commits.',
    metrics,
    currentArc: {
      id: arc.id,
      title: arc.title,
      premise: arc.premise,
      stakes: arc.stakes,
      winCondition: arc.winCondition,
      failureCondition: arc.failureCondition,
      observerPrompt: arc.observerPrompt
    },
    tensions,
    directives,
    quests,
    visibleBeats,
    tickerBeats: visibleBeats.slice(0, 5).map(b => ({
      type: b.type,
      label: b.label,
      text: b.text
    })),
    nextEvolutionRules: [
      'Prefer named civic choices over anonymous event spam.',
      'Every new conflict needs a possible resolution.',
      'Every religion must occasionally interpret the same omen differently.',
      'Every faction should want something that another faction can understand but reject.',
      'Observer actions should change interpretation, not directly edit state.'
    ]
  };
}

function refreshSocietyDirector(world, rng, options = {}) {
  normalizeWorldLanguage(world);
  world.societyDirector = buildSocietyDirector(world, rng || Math.random);
  if (options.addDirectorEvent) {
    world.events ||= [];
    const evt = buildDirectorEvent(world, world.societyDirector.currentArc, world.societyDirector.metrics);
    const exists = world.events.some(e => e.id === evt.id);
    if (!exists) world.events.push(evt);
    world.events = world.events.slice(-140);
  }
  return world;
}

if (require.main === module) {
  const args = new Set(process.argv.slice(2));
  const world = JSON.parse(fs.readFileSync(WORLD, 'utf8'));
  const rng = seededRng(dateSeed() + (world.version || 0) * 1000 + 77);
  refreshSocietyDirector(world, rng, { addDirectorEvent: args.has('--seed') });
  if (args.has('--apply')) {
    applySocietyDirectorPlan(world, rng, { extendMap: true, addPublicEvents: true });
  }
  world.lastUpdated = new Date().toISOString();
  fs.writeFileSync(WORLD, JSON.stringify(world, null, 2) + '\n');
  console.log('Society Director chose arc: ' + world.societyDirector.currentArc.title);
}

module.exports = {
  applySocietyDirectorPlan,
  buildSocietyDirector,
  refreshSocietyDirector,
  normalizeWorldLanguage,
  pressureMetrics
};
