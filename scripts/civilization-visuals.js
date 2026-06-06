#!/usr/bin/env node
/**
 * ai-garden · Civilization Visuals
 *
 * Turns the large logical world map into a compact spectator scene: districts,
 * roads, frontier markers, and OpenClaw crab agents that can be drawn on the
 * 384x288 canvas.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const WORLD = path.join(__dirname, '..', 'experiments', 'world-state.json');
const VIEW_W = 384;
const VIEW_H = 288;
const MARGIN = 18;

const DISTRICT_COLORS = [
  '#d6b36a', '#60a5fa', '#f97316', '#4ade80', '#e879f9', '#f43f5e',
  '#38bdf8', '#a3e635', '#facc15', '#c084fc', '#fb7185', '#2dd4bf'
];

const FRONTIER_COLORS = {
  woodland: '#2f855a',
  wetland: '#2dd4bf',
  'stone-meadow': '#94a3b8',
  scrub: '#a3a35d',
  tide: '#38bdf8',
  moor: '#7c3aed',
  'orchard-belt': '#84cc16',
  coast: '#0ea5e9',
  highlands: '#94a3b8',
  delta: '#22d3ee',
  steppe: '#d6b36a',
  ravine: '#64748b',
  plateau: '#a8a29e',
  'volcanic-field': '#ef4444',
  'salt-flat': '#e2e8f0',
  floodplain: '#34d399',
  'shrine road': '#facc15'
};

const CRAB_BLUEPRINTS = [
  {
    id: 'openclaw-001',
    name: 'OpenClaw',
    role: 'map keeper',
    color: '#fb923c',
    darkColor: '#9a3412',
    motto: 'maps one calm road at a time',
    personality: 'patient founder; brave, practical, and careful with noise',
    dialogue: ['ONE ROAD AT A TIME', 'MAP FIRST', 'CLAWS STEADY']
  },
  {
    id: 'openclaw-002',
    name: 'Claude',
    role: 'rain listener',
    color: '#60a5fa',
    darkColor: '#1d4ed8',
    motto: 'listens before moving the smallest stone',
    personality: 'gentle observer; philosophical, slow, and good at making peace',
    dialogue: ['SLOW WATER WINS', 'LET SOIL ANSWER', 'PEACE NEEDS ROOM']
  },
  {
    id: 'openclaw-003',
    name: 'Pinchfork',
    role: 'market auditor',
    color: '#facc15',
    darkColor: '#854d0e',
    motto: 'counts grain stalls and keeps trade honest',
    personality: 'skeptical accountant; funny only when the numbers balance',
    dialogue: ['COUNT THE BREAD', 'MARKET IS QUIET', 'FAIR TRADE FIRST']
  },
  {
    id: 'openclaw-004',
    name: 'Shellscript',
    role: 'scribe',
    color: '#38bdf8',
    darkColor: '#075985',
    motto: 'etches civil law into tiny wet tablets',
    personality: 'tidy archivist; exact, loyal, and allergic to messy decrees',
    dialogue: ['WRITE IT ONCE', 'LAW NEEDS LIGHT', 'ARCHIVE IS SAFE']
  },
  {
    id: 'openclaw-005',
    name: 'Rustclaw',
    role: 'forge runner',
    color: '#f97316',
    darkColor: '#7c2d12',
    motto: 'keeps the kilns honest after sunset',
    personality: 'warm craftsperson; stubborn, protective, and fond of useful tools',
    dialogue: ['KILN IS WARM', 'TOOLS ARE READY', 'FIX THEN TALK']
  },
  {
    id: 'openclaw-006',
    name: 'Kelpstack',
    role: 'dock planner',
    color: '#2dd4bf',
    darkColor: '#0f766e',
    motto: 'routes boats, rumors, and emergency snacks',
    personality: 'soft-spoken organizer; coastal, generous, and impossible to rush',
    dialogue: ['BOATS GO SLOW', 'TIDE HAS TIME', 'SNACK ROUTE OPEN']
  },
  {
    id: 'openclaw-007',
    name: 'Snapline',
    role: 'scout',
    color: '#a3e635',
    darkColor: '#3f6212',
    motto: 'checks the frontier and returns before panic starts',
    personality: 'alert ranger; quick eyes, quiet feet, never dramatic',
    dialogue: ['FRONTIER CALM', 'TRACKS ARE FRESH', 'NO PANIC']
  },
  {
    id: 'openclaw-008',
    name: 'Coralbit',
    role: 'temple keeper',
    color: '#e879f9',
    darkColor: '#86198f',
    motto: 'polishes shrine bells until they remember names',
    personality: 'ritual caretaker; dreamy, musical, and kind to old faiths',
    dialogue: ['THREE BELLS', 'SHRINE IS QUIET', 'NAMES STAY']
  },
  {
    id: 'openclaw-009',
    name: 'Pebbleclaw',
    role: 'road mason',
    color: '#cbd5e1',
    darkColor: '#475569',
    motto: 'sets road stones in arguments nobody can move',
    personality: 'steady builder; plainspoken, durable, and happiest near good paths',
    dialogue: ['STONE BY STONE', 'ROAD HOLDS', 'SMALL STEPS']
  },
  {
    id: 'openclaw-010',
    name: 'Brinehook',
    role: 'harbor judge',
    color: '#60a5fa',
    darkColor: '#1e3a8a',
    motto: 'settles dock disputes with one raised claw',
    personality: 'dry mediator; fair, watchful, and secretly sentimental',
    dialogue: ['DOCKS STAY FAIR', 'ONE CLAW VOTE', 'HEAR BOTH SIDES']
  }
];

const CRAB_TASKS = [
  {
    type: 'roadwork',
    verb: 'measured road stones',
    outcome: 'trade carts now take the route without arguing at every fork'
  },
  {
    type: 'convivencia',
    verb: 'hosted a ration-table parley',
    outcome: 'two factions left with fewer insults and more bread'
  },
  {
    type: 'frontier',
    verb: 'charted a damp frontier line',
    outcome: 'the next map expansion has a named place to start from'
  },
  {
    type: 'civic',
    verb: 'patched a plaza ruleboard',
    outcome: 'citizens can see which law changed before breakfast'
  },
  {
    type: 'ritual',
    verb: 'rang tiny shrine bells',
    outcome: 'three religions agreed to share the same morning road'
  },
  {
    type: 'festival',
    verb: 'organized a side-street lantern crawl',
    outcome: 'children now know the city has more than one center'
  }
];

function seededRng(seed) {
  let s = (seed | 0) || 1;
  return function () {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) % 1000000) / 1000000;
  };
}

function daySeed(world) {
  return ((world.chronicle && world.chronicle.day) || 1) * 7919 + (world.version || 1) * 1000;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

function regionBounds(region) {
  if (!region) return { x: 0, y: 0, w: 240, h: 180 };
  if (region.bounds) {
    return {
      x: Number(region.bounds.x) || 0,
      y: Number(region.bounds.y) || 0,
      w: Number(region.bounds.w || region.bounds.width) || 240,
      h: Number(region.bounds.h || region.bounds.height) || 180
    };
  }
  return {
    x: Number(region.x) || 0,
    y: Number(region.y) || 0,
    w: Number(region.width || region.w) || 240,
    h: Number(region.height || region.h) || 180
  };
}

function projectionFor(world) {
  const regions = (world.map && world.map.regions) || [];
  let minX = 0;
  let minY = 0;
  let maxX = Number(world.map && world.map.width) || 400;
  let maxY = Number(world.map && world.map.height) || 300;

  for (const region of regions) {
    const b = regionBounds(region);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }

  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  return {
    minX, minY, maxX, maxY, spanX, spanY,
    point(x, y) {
      return {
        x: Math.round(clamp(MARGIN + ((x - minX) / spanX) * (VIEW_W - MARGIN * 2), 8, VIEW_W - 8)),
        y: Math.round(clamp(MARGIN + ((y - minY) / spanY) * (VIEW_H - MARGIN * 2), 12, VIEW_H - 10))
      };
    },
    rect(region) {
      const b = regionBounds(region);
      const p1 = this.point(b.x, b.y);
      const p2 = this.point(b.x + b.w, b.y + b.h);
      return {
        x: Math.min(p1.x, p2.x),
        y: Math.min(p1.y, p2.y),
        w: Math.max(5, Math.abs(p2.x - p1.x)),
        h: Math.max(5, Math.abs(p2.y - p1.y))
      };
    }
  };
}

function buildDistricts(world, rng, project) {
  const regions = new Map(((world.map && world.map.regions) || []).map(region => [region.id, region]));
  const cities = (world.cities || []).slice(-18);
  const seenByRegion = new Map();
  const largest = Math.max(1, ...cities.map(city => Number(city.population) || 1));

  return cities.map((city, idx) => {
    const region = regions.get(city.region) || regions.get('region-001') || null;
    const bounds = regionBounds(region);
    const count = seenByRegion.get(city.region) || 0;
    seenByRegion.set(city.region, count + 1);

    const center = project.point(bounds.x + bounds.w / 2, bounds.y + bounds.h / 2);
    const angle = idx * 2.399 + count * 1.25;
    const radius = 4 + count * 7 + rng() * 3;
    const pop = Number(city.population) || 100;
    const scale = Math.round(clamp(7 + Math.sqrt(pop / largest) * 12, 8, 19));

    return {
      id: city.id || 'city-' + String(idx + 1).padStart(3, '0'),
      name: city.name || 'Unnamed',
      region: region ? region.name : 'Unmapped',
      regionId: city.region || null,
      x: Math.round(clamp(center.x + Math.cos(angle) * radius, 12, VIEW_W - 18)),
      y: Math.round(clamp(center.y + Math.sin(angle) * radius, 16, VIEW_H - 14)),
      population: pop,
      specialty: city.specialty || 'civic life',
      ruler: city.ruler || 'local council',
      founded: city.founded || ((world.chronicle && world.chronicle.day) || 0),
      scale,
      color: DISTRICT_COLORS[idx % DISTRICT_COLORS.length],
      walls: pop >= 750 || String(city.ruler || '').includes('House'),
      capital: pop === largest
    };
  });
}

function buildRoads(districts, world) {
  const roads = [];
  if (districts.length < 2) return roads;
  const ordered = districts.slice().sort((a, b) => (a.founded || 0) - (b.founded || 0));

  function addRoad(from, to, kind) {
    if (!from || !to || from.id === to.id) return;
    const id = [from.id, to.id].sort().join('--');
    if (roads.some(road => road.id === id)) return;
    roads.push({
      id,
      from: from.id,
      to: to.id,
      kind,
      traffic: Math.round(clamp((from.population + to.population) / 260, 2, 12))
    });
  }

  for (let i = 1; i < ordered.length; i++) {
    addRoad(ordered[i - 1], ordered[i], i % 4 === 0 ? 'pilgrim-road' : 'trade-road');
  }

  for (const district of districts) {
    let nearest = null;
    let nearestDist = Infinity;
    for (const other of districts) {
      if (other.id === district.id) continue;
      const d = Math.hypot(other.x - district.x, other.y - district.y);
      if (d < nearestDist) {
        nearest = other;
        nearestDist = d;
      }
    }
    addRoad(district, nearest, district.ruler === (nearest && nearest.ruler) ? 'house-road' : 'trade-road');
    if (roads.length >= 24) break;
  }

  const activeWars = ((world.wars || []).filter(war => war.active).length);
  if (activeWars && districts.length >= 3) {
    addRoad(districts[districts.length - 1], districts[Math.floor(districts.length / 2)], 'war-road');
  }
  return roads.slice(0, 24);
}

function buildFrontierCells(world, project) {
  const regions = ((world.map && world.map.regions) || []).slice(-16);
  return regions.map(region => {
    const box = project.rect(region);
    return {
      id: region.id,
      name: region.name || region.id,
      biome: region.biome || 'unknown',
      feature: region.feature || '',
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.h,
      color: FRONTIER_COLORS[region.biome] || '#94a3b8',
      plannedBy: region.plannedBy || null,
      discoveredDay: region.discoveredDay || null
    };
  });
}

function ensureCrabAgents(world, districts, rng) {
  world.crabAgents = Array.isArray(world.crabAgents) ? world.crabAgents : [];
  const byId = new Map(world.crabAgents.map(crab => [crab.id, crab]));
  const day = (world.chronicle && world.chronicle.day) || 0;

  for (let i = 0; i < CRAB_BLUEPRINTS.length; i++) {
    const blueprint = CRAB_BLUEPRINTS[i];
    const { id, name, role, color, darkColor, motto, personality, dialogue } = blueprint;
    const district = districts.length ? districts[i % districts.length] : null;
    const phase = Math.round((i * 0.77 + rng() * 0.2) * 1000) / 1000;
    const crab = byId.get(id) || {
      id,
      name,
      species: 'OpenClaw pixel crab agent',
      role,
      color,
      darkColor,
      motto,
      createdDay: day,
      actions: 0
    };
    crab.name = name;
    crab.species = 'OpenClaw pixel crab agent';
    crab.role = role;
    crab.color = color;
    crab.darkColor = darkColor;
    crab.motto = motto;
    crab.personality = personality;
    crab.dialogue = dialogue;
    crab.homeDistrict = district ? district.id : null;
    crab.homeDistrictName = district ? district.name : 'The Garden';
    crab.homeX = district ? Math.round(clamp(district.x + Math.cos(i * 1.7) * (district.scale + 5), 8, VIEW_W - 12)) : 40 + i * 12;
    crab.homeY = district ? Math.round(clamp(district.y + Math.sin(i * 1.7) * (district.scale + 4), 12, VIEW_H - 12)) : 80;
    crab.phase = crab.phase || phase;
    crab.task = crab.task || role;
    byId.set(id, crab);
  }

  world.crabAgents = CRAB_BLUEPRINTS.map(({ id }) => byId.get(id));

  const activeIds = new Set(world.crabAgents.map(crab => crab.id));
  const activeNames = new Set(world.crabAgents.map(crab => crab.name));
  const latestActionByDay = new Map();
  for (const action of (world.crabActions || []).filter(action => activeIds.has(action.agentId))) {
    latestActionByDay.set(action.day, action);
  }
  world.crabActions = Array.from(latestActionByDay.values()).slice(-40);

  const latestCrabEventByDay = new Map();
  const otherEvents = [];
  for (const event of (world.events || [])) {
    if (event.type === 'crab-agent') {
      if (activeNames.has(event.agent)) latestCrabEventByDay.set(event.day, event);
    } else {
      otherEvents.push(event);
    }
  }
  world.events = otherEvents
    .concat(Array.from(latestCrabEventByDay.values()))
    .sort((a, b) => Date.parse(a.timestamp || 0) - Date.parse(b.timestamp || 0))
    .slice(-160);
}

function addCrabAction(world, rng, districts) {
  world.crabActions = Array.isArray(world.crabActions) ? world.crabActions : [];
  world.events = Array.isArray(world.events) ? world.events : [];

  if (!world.crabAgents || world.crabAgents.length === 0) return null;
  const day = (world.chronicle && world.chronicle.day) || 0;
  const existingToday = world.crabActions.slice().reverse().find(action => action.day === day);
  if (existingToday) return existingToday;
  const crab = pick(world.crabAgents, rng);
  const district = districts.find(item => item.id === crab.homeDistrict) || pick(districts, rng) || null;
  const task = pick(CRAB_TASKS, rng);
  const arc = world.societyDirector && world.societyDirector.currentArc
    ? world.societyDirector.currentArc.title
    : 'the living map';
  const districtName = district ? district.name : crab.homeDistrictName || 'The Garden';
  const headline = crab.name + ' ' + task.verb + ' in ' + districtName;
  const baseId = 'crab-action-' + String(day).padStart(4, '0') + '-' + crab.id;
  let id = baseId;
  let dupe = 2;
  while (world.crabActions.some(existing => existing.id === id)) {
    id = baseId + '-' + dupe;
    dupe++;
  }
  const action = {
    id,
    day,
    timestamp: new Date().toISOString(),
    type: task.type,
    agentId: crab.id,
    agentName: crab.name,
    role: crab.role,
    districtId: district ? district.id : null,
    district: districtName,
    headline,
    outcome: task.outcome,
    arc
  };

  crab.actions = (crab.actions || 0) + 1;
  crab.task = task.type;
  crab.latestAction = headline;
  world.crabActions.push(action);
  world.crabActions = world.crabActions.slice(-100);
  world.events.push({
    type: 'crab-agent',
    day,
    timestamp: action.timestamp,
    description: 'OpenClaw: ' + headline + '; ' + task.outcome + '.',
    agent: crab.name,
    district: districtName
  });
  world.events = world.events.slice(-160);
  return action;
}

function refreshCivilizationVisuals(world, rng, options = {}) {
  rng = rng || seededRng(daySeed(world));
  world.map ||= { width: 400, height: 300, regions: [] };
  const project = projectionFor(world);
  const districts = buildDistricts(world, rng, project);
  const roads = buildRoads(districts, world);
  const frontierCells = buildFrontierCells(world, project);

  ensureCrabAgents(world, districts, rng);
  const latestAction = options.addDailyCrabAction ? addCrabAction(world, rng, districts) : null;

  world.civilizationView = {
    version: 1,
    generatedAt: new Date().toISOString(),
    day: (world.chronicle && world.chronicle.day) || 0,
    projection: {
      worldWidth: Math.round(project.spanX),
      worldHeight: Math.round(project.spanY),
      canvasWidth: VIEW_W,
      canvasHeight: VIEW_H
    },
    districts,
    roads,
    frontierCells,
    latestAction,
    stats: {
      districts: districts.length,
      roads: roads.length,
      frontierCells: frontierCells.length,
      crabAgents: world.crabAgents.length
    }
  };

  return world.civilizationView;
}

module.exports = { refreshCivilizationVisuals, seededRng };

if (require.main === module) {
  const world = JSON.parse(fs.readFileSync(WORLD, 'utf8'));
  const rng = seededRng(daySeed(world));
  refreshCivilizationVisuals(world, rng, { addDailyCrabAction: process.argv.includes('--seed-actions') });
  fs.writeFileSync(WORLD, JSON.stringify(world, null, 2) + '\n');
  console.log(
    'Civilization view refreshed: ' +
    world.civilizationView.districts.length + ' districts, ' +
    world.civilizationView.roads.length + ' roads, ' +
    world.crabAgents.length + ' OpenClaw crab agents.'
  );
}
