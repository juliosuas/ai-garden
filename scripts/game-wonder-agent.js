#!/usr/bin/env node
/**
 * ai-garden · Game Wonder Agent
 *
 * A deterministic product/design agent assigned to AI Garden. It looks at the
 * live world as a spectator game, scores whether the experience is legible and
 * delightful, then writes one concrete focus moment that the static client can
 * stage without a backend.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const WORLD = path.join(__dirname, '..', 'experiments', 'world-state.json');

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

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function short(text, limit = 150) {
  text = String(text || '').replace(/\s+/g, ' ').trim();
  if (text.length <= limit) return text;
  return text.slice(0, limit - 1).trimEnd() + '...';
}

function hashText(text) {
  text = String(text || '');
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function activeCitizens(world) {
  return (world.citizens || []).filter(c => c && c.alive !== false);
}

function activeWars(world) {
  return (world.wars || []).filter(w => w && w.active);
}

function activeFaiths(world) {
  return (world.religions || []).filter(r => r && !r.schism);
}

function actionWeight(action) {
  const typeWeight = {
    ritual: 15,
    research: 14,
    defense: 13,
    council: 12,
    market: 10,
    expedition: 11,
    art: 12
  };
  let score = typeWeight[action.type] || 7;
  if (action.faction === 'f-pantheon-covenant' || action.faction === 'f-code-cantons') score += 18;
  if (String(action.actor || '').includes('war') || String(action.target || '').includes('war-')) score += 8;
  if (action.consequence) score += 3;
  return score;
}

function districtMatchesTarget(district, target) {
  const t = String(target || '').toLowerCase();
  if (!t) return false;
  const name = String(district.name || '').toLowerCase();
  const region = String(district.region || '').toLowerCase();
  return name === t || region === t || name.includes(t) || t.includes(name) || region.includes(t) || t.includes(region);
}

function actionAnchor(world, action, fallbackIndex = 0) {
  const view = world.civilizationView || {};
  const districts = Array.isArray(view.districts) ? view.districts : [];
  if (!districts.length) return null;
  const direct = districts.find(d => districtMatchesTarget(d, action && action.target));
  if (direct) return direct;
  if (action && (action.faction === 'f-pantheon-covenant' || action.actor === 'f-pantheon-covenant')) return districts[1 % districts.length];
  if (action && (action.faction === 'f-code-cantons' || action.actor === 'f-code-cantons')) return districts[Math.floor(districts.length / 2) % districts.length];
  const seed = hashText((action && (action.id || action.headline || action.target)) || fallbackIndex);
  return districts[seed % districts.length];
}

function scoreExperience(world) {
  const citizens = activeCitizens(world).length;
  const actions = (world.agentActions || []).slice(-24);
  const actionVariety = new Set(actions.map(a => a.type)).size;
  const directorMetrics = world.societyDirector && world.societyDirector.metrics || {};
  const districts = world.civilizationView && Array.isArray(world.civilizationView.districts)
    ? world.civilizationView.districts.length
    : 0;
  const roads = world.civilizationView && Array.isArray(world.civilizationView.roads)
    ? world.civilizationView.roads.length
    : 0;
  const wars = activeWars(world).length;
  const faiths = activeFaiths(world).length;
  const legibility = Number(directorMetrics.legibility);

  return {
    flow: clamp(48 + Math.min(actions.length, 18) * 2 + Math.min(actionVariety, 7) * 5 - Math.max(0, wars - 5) * 4, 0, 100),
    legibility: clamp(Number.isFinite(legibility) ? legibility : 55, 0, 100),
    wonder: clamp(36 + Math.min(districts, 16) * 3 + Math.min(roads, 18) + Math.min(faiths, 8) * 3, 0, 100),
    agency: clamp(35 + Math.min(actionVariety, 7) * 8 + Math.min(wars, 6) * 4 + (world.divineCrisis ? 12 : 0), 0, 100),
    life: clamp(35 + Math.min(citizens, 140) * 0.35 + Math.min(actions.length, 24), 0, 100)
  };
}

function chooseFocusAction(world) {
  const actions = (world.agentActions || []).slice(-18);
  if (!actions.length) return null;
  return actions.slice().sort((a, b) => actionWeight(b) - actionWeight(a))[0];
}

function focusLabel(action) {
  if (!action) return 'WATCH';
  if (action.faction === 'f-pantheon-covenant') return 'OMEN';
  if (action.faction === 'f-code-cantons') return 'TRACE';
  if (action.type === 'defense') return 'FRONT';
  if (action.type === 'market') return 'TRADE';
  if (action.type === 'expedition') return 'SCOUT';
  if (action.type === 'art') return 'ART';
  return 'WATCH';
}

function buildFocusMoment(world) {
  const action = chooseFocusAction(world);
  const anchor = actionAnchor(world, action);
  if (!action || !anchor) {
    const view = world.civilizationView || {};
    const district = Array.isArray(view.districts) && view.districts[0];
    if (!district) return null;
    return {
      id: 'focus-civilization-heart',
      label: 'WATCH',
      title: district.name || 'Civilization heart',
      reason: 'The game needs one clear stage for spectators before it opens the whole map.',
      x: district.x,
      y: district.y,
      radius: 42,
      actionType: 'council',
      target: district.name || 'central district'
    };
  }
  return {
    id: 'focus-' + action.id,
    actionId: action.id,
    label: focusLabel(action),
    title: short(action.headline || action.actorName || action.type, 96),
    reason: short(action.consequence || 'This is the most readable live beat for spectators right now.', 140),
    x: anchor.x,
    y: anchor.y,
    radius: action.faction ? 58 : 42,
    actionType: action.type || 'council',
    faction: action.faction || null,
    target: action.target || anchor.name || 'the map'
  };
}

function buildRecommendations(world, scores, focus) {
  const recs = [];
  function add(id, title, why, apply) {
    recs.push({ id, title, why: short(why, 150), appliedNow: apply });
  }
  add(
    'single-readable-moment',
    'Stage one readable moment before showing the whole simulation',
    focus ? `Center spectators on ${focus.label}: ${focus.title}.` : 'The world is large enough that spectators need a guided beat.',
    true
  );
  add(
    'emotion-before-lore',
    'Show emotion before explanation',
    'Tiny faces, pulses, and short labels should tell the player what matters before any panel text does.',
    true
  );
  if (scores.legibility < 60) {
    add(
      'less-abstraction',
      'Convert abstract pressure into visible stakes',
      'Low legibility means wars, religions, and code audits need named locations and a possible outcome.',
      true
    );
  }
  if (activeWars(world).length >= 5) {
    add(
      'war-with-choices',
      'Give war a playable question',
      'A hard war is interesting only when observers can tell what both sides want and what peace would cost.',
      false
    );
  }
  add(
    'daily-marvel-pass',
    'Run a daily marvel pass',
    'Every cron should leave one spectacle, one social choice, and one camera-worthy scene.',
    true
  );
  return recs.slice(0, 5);
}

function buildCameraTargets(world, focus) {
  const targets = [];
  if (focus) {
    targets.push({
      id: focus.id,
      label: focus.label,
      x: focus.x,
      y: focus.y,
      weight: 1.75,
      reason: focus.reason
    });
  }
  const districts = world.civilizationView && Array.isArray(world.civilizationView.districts)
    ? world.civilizationView.districts
    : [];
  districts
    .slice()
    .sort((a, b) => (b.capital ? 1 : 0) - (a.capital ? 1 : 0) || (b.population || 0) - (a.population || 0))
    .slice(0, 5)
    .forEach(district => {
      targets.push({
        id: 'district-' + district.id,
        label: district.capital ? 'CAPITAL' : 'CITY',
        x: district.x,
        y: district.y,
        weight: district.capital ? 1.35 : 1.05,
        reason: district.name + ' is a strong read of the current civilization.'
      });
    });
  return targets.slice(0, 6);
}

function buildGameWonderAgent(world, rng = Math.random) {
  const scores = scoreExperience(world);
  const focus = buildFocusMoment(world);
  const recommendations = buildRecommendations(world, scores, focus);
  const average = Math.round((scores.flow + scores.legibility + scores.wonder + scores.agency + scores.life) / 5);
  const potential = average >= 76 ? 'high' : average >= 58 ? 'promising' : 'fragile';
  const diagnosis = potential === 'high'
    ? 'AI Garden has real spectator-game potential: the world is weird, social, and now needs stronger moment-to-moment staging.'
    : 'AI Garden has the ingredients, but the player needs a clearer reason to keep watching each minute.';

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    name: 'Wonderwright',
    model: 'ai-garden-game-wonder-agent-v1',
    role: 'spectator-game designer',
    assignedGame: 'AI Garden',
    charter: 'Find the fun, cut confusion, and make the simulation feel like a tiny living epic instead of a data dump.',
    potential,
    scores,
    diagnosis,
    focusMoment: focus,
    recommendations,
    cameraTargets: buildCameraTargets(world, focus),
    tickerBeats: [
      {
        type: 'game-design',
        label: 'WONDER',
        text: focus ? short('Watch ' + focus.label + ': ' + focus.title, 120) : 'Wonderwright is looking for the next playable beat.'
      },
      {
        type: 'game-design',
        label: 'FLOW',
        text: short(recommendations[0] && recommendations[0].title, 120)
      },
      {
        type: 'game-design',
        label: 'FEEL',
        text: short(recommendations[1] && recommendations[1].why, 120)
      }
    ],
    nextBuildRules: [
      'One clear focal moment per visit before broad simulation noise.',
      'Every visible agent needs motion, emotion, or a job silhouette.',
      'Panels explain only after the canvas creates curiosity.',
      'Autopilot changes should add spectacle and reduce confusion in the same pass.'
    ]
  };
}

function upsertById(arr, item) {
  const idx = arr.findIndex(x => x && x.id === item.id);
  if (idx >= 0) arr[idx] = item;
  else arr.push(item);
}

function applyWonderAdvice(world) {
  const agent = world.gameWonderAgent;
  if (!agent || !agent.focusMoment) return world;
  const day = world.chronicle && world.chronicle.day || 0;
  const focus = agent.focusMoment;
  world.events ||= [];
  upsertById(world.events, {
    id: 'game-wonder-' + String(day).padStart(3, '0'),
    type: 'game-design',
    description: short('Wonderwright chose a focus moment: ' + focus.label + ' at ' + focus.target + '. ' + focus.reason, 220),
    participants: ['game-wonder-agent'],
    timestamp: new Date().toISOString(),
    outcome: 'Camera guidance, ticker beats, and canvas highlight now favor the most readable live scene.'
  });
  world.events = world.events.slice(-150);

  world.agentActions ||= [];
  const actionId = 'act-' + String(day).padStart(3, '0') + '-game-wonder';
  upsertById(world.agentActions, {
    id: actionId,
    day,
    type: 'art',
    actor: 'game-wonder-agent',
    actorName: 'Wonderwright',
    lineage: 'mirrorborn',
    faction: null,
    target: focus.target,
    headline: '🎮 Wonderwright staged the most readable scene for spectators',
    consequence: 'The Garden now points the camera, ticker, and highlight pulse toward one strong beat before widening again.'
  });
  world.agentActions = world.agentActions.slice(-140);
  return world;
}

function refreshGameWonderAgent(world, rng, options = {}) {
  world.gameWonderAgent = buildGameWonderAgent(world, rng || Math.random);
  if (options.applyAdvice) applyWonderAdvice(world);
  return world;
}

if (require.main === module) {
  const args = new Set(process.argv.slice(2));
  const world = JSON.parse(fs.readFileSync(WORLD, 'utf8'));
  const rng = seededRng(dateSeed() + (world.version || 0) * 1000 + 333);
  refreshGameWonderAgent(world, rng, { applyAdvice: args.has('--apply') });
  world.lastUpdated = new Date().toISOString();
  fs.writeFileSync(WORLD, JSON.stringify(world, null, 2) + '\n');
  console.log(
    'Game Wonder Agent: ' + world.gameWonderAgent.potential +
    ' potential · focus ' + (world.gameWonderAgent.focusMoment && world.gameWonderAgent.focusMoment.label || 'none')
  );
}

module.exports = {
  buildGameWonderAgent,
  refreshGameWonderAgent,
  scoreExperience
};
