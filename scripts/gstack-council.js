#!/usr/bin/env node
/**
 * ai-garden - GStack Professional Council
 *
 * A deterministic panel of specialists. Each discipline reviews the current
 * static MVP, names evidence, and chooses one tiny next fix. The output lives
 * in world-state so the UI, roadmap, and future agents can work from a shared
 * professional standard instead of vague "make it better" requests.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WORLD = path.join(ROOT, 'experiments', 'world-state.json');
const INDEX = path.join(ROOT, 'index.html');
const HUMANS = path.join(ROOT, 'experiments', 'humans.js');
const MUSIC = path.join(ROOT, 'experiments', 'music.js');
const README = path.join(ROOT, 'README.md');
const ROADMAP = path.join(ROOT, 'ROADMAP.md');
const PLAYTEST = path.join(ROOT, 'scripts', 'playtest-subagent.js');
const SELF_OPTIMIZER = path.join(ROOT, 'scripts', 'self-optimizer.js');
const ROADMAP_PULSE = path.join(ROOT, 'scripts', 'roadmap-pulse.js');
const SELF_WORKFLOW = path.join(ROOT, '.github', 'workflows', 'daily-self-optimizer.yml');
const ROADMAP_WORKFLOW = path.join(ROOT, '.github', 'workflows', 'daily-roadmap-pulse.yml');

const SPECIALISTS = [
  {
    id: 'product',
    title: 'Product Lead',
    role: 'First-minute proof loop owner',
    charter: 'Make the value proposition obvious in under 60 seconds.',
    tinyPatchRule: 'Remove one unclear step before adding a new mechanic.'
  },
  {
    id: 'ux',
    title: 'UX Director',
    role: 'Clarity, hierarchy, and first-run comprehension owner',
    charter: 'Make the visitor always know what to do next.',
    tinyPatchRule: 'Prefer one strong cue over three competing panels.'
  },
  {
    id: 'mobile',
    title: 'Mobile Lead',
    role: 'Small-screen usability and panel collision owner',
    charter: 'Keep chat, trial, CIV, and controls usable on a phone.',
    tinyPatchRule: 'Any new UI must collapse, dismiss, or move on mobile.'
  },
  {
    id: 'narrative',
    title: 'Narrative Director',
    role: 'Weekly arc, consequence, and character motivation owner',
    charter: 'Make every interaction feel like evidence in a living story.',
    tinyPatchRule: 'Every beat needs a who, a why, and a tomorrow.'
  },
  {
    id: 'audio',
    title: 'Audio Director',
    role: 'Subtle ambience, season, and sound fatigue owner',
    charter: 'Make the world feel inhabited without demanding attention.',
    tinyPatchRule: 'If audio competes with reading, lower density first.'
  },
  {
    id: 'performance',
    title: 'Performance Engineer',
    role: 'Canvas budget, animation density, and loading owner',
    charter: 'Keep the simulation readable and smooth before adding life.',
    tinyPatchRule: 'Profile or cap before drawing more entities.'
  },
  {
    id: 'monetization',
    title: 'Monetization Strategist',
    role: 'Paid identity, archive, and patronage owner',
    charter: 'Sell status and memory, never unilateral control.',
    tinyPatchRule: 'Every paid idea must preserve simulation integrity.'
  },
  {
    id: 'qa',
    title: 'QA Lead',
    role: 'Regression, syntax, smoke, and contract owner',
    charter: 'Make small errors fail loudly before users find them.',
    tinyPatchRule: 'Every shipped loop needs a deterministic assertion.'
  },
  {
    id: 'growth',
    title: 'Growth Lead',
    role: 'Shareability, return hooks, and social proof owner',
    charter: 'Turn one visit into proof someone wants to show.',
    tinyPatchRule: 'Tighten the share artifact before widening acquisition.'
  },
  {
    id: 'safety',
    title: 'Trust And Safety Lead',
    role: 'Guardrails, consent, and simulation integrity owner',
    charter: 'Keep dark play legible without letting money or humans corrupt outcomes.',
    tinyPatchRule: 'Name the boundary in UI before adding a stronger action.'
  }
];

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function write(file, value) {
  fs.writeFileSync(file, value);
}

function short(text, limit = 150) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) return clean;
  return clean.slice(0, limit - 1).trimEnd() + '.';
}

function sentence(text) {
  const clean = String(text || '').trim();
  if (!clean) return '';
  return /[.!?]$/.test(clean) ? clean : clean + '.';
}

function points(checks) {
  const total = Math.max(1, checks.length);
  return Math.round((checks.filter(item => item.ok).length / total) * 100);
}

function grade(score) {
  if (score >= 96) return 'professional';
  if (score >= 88) return 'strong';
  if (score >= 75) return 'needs polish';
  return 'blocking';
}

function check(name, ok, fix) {
  return { name, ok: !!ok, fix };
}

function evidence(checks) {
  return checks.filter(item => item.ok).map(item => item.name).slice(0, 6);
}

function gaps(checks) {
  return checks.filter(item => !item.ok).map(item => item.fix || item.name).slice(0, 4);
}

function firstGap(checks, fallback) {
  const gap = gaps(checks)[0];
  return gap || fallback;
}

function reviewFor(specialist, files, world) {
  const weekly = world.weeklyNarrativeDirector || {};
  const optimizer = world.selfOptimizer || {};
  const checksById = {
    product: [
      check('README pitch', files.readme.includes('AI civilization') && files.readme.includes('Demo loop'), 'tighten README above-the-fold pitch'),
      check('roadmap north star', files.roadmap.includes('North Star'), 'define the north star in ROADMAP.md'),
      check('proof loop', files.roadmap.includes('choose face -> cast sign or chat'), 'make the proof loop explicit'),
      check('share proof', files.humans.includes('Broadcast Proof') && files.humans.includes('navigator.share'), 'restore shareable proof'),
      check('return hook', files.humans.includes('tomorrowHook'), 'restore tomorrow hook on receipts')
    ],
    ux: [
      check('story primer', files.index.includes('storyPrimerData') && files.index.includes('STORY FIRST'), 'restore story-first onboarding'),
      check('trial CTA', files.index.includes('AIGardenHumans.trial'), 'connect CTA to Mirror Trial'),
      check('sync strip', files.humans.includes('ag-sync-strip'), 'show backend sync in Observer Lounge'),
      check('CIV panel', files.humans.includes('CIVILIZATION BRAIN'), 'restore CIV panel'),
      check('events panel', files.index.includes('STORY LOG'), 'restore story log')
    ],
    mobile: [
      check('mobile drawer', files.index.includes('mobile-tools-open'), 'restore mobile tools drawer'),
      check('collapsed chat', files.humans.includes("chat.classList.add('ag-collapsed')"), 'collapse chat by default on mobile'),
      check('post-action close', files.index.includes('closeMobileToolsAfterAction'), 'close mobile drawer after single actions'),
      check('dynamic zoom', files.index.includes('minZoomForViewport'), 'restore dynamic zoom minimum'),
      check('chat avoidance', files.humans.includes('body.mobile-tools-open .ag-chat'), 'prevent chat from blocking mobile tools'),
      check('primer avoidance', files.index.includes('body.mobile-tools-open #nav-help'), 'hide the story primer while mobile tools are open')
    ],
    narrative: [
      check('weekly v2', weekly && weekly.version === 2, 'restore Weekly Narrative Agent v2'),
      check('current beat', weekly && weekly.currentBeat, 'publish current weekly beat'),
      check('showdown', weekly && weekly.entertainment && weekly.entertainment.showdown, 'restore weekly showdown'),
      check('mirror pressure', files.weeklyNarrative.includes('godComplexContract'), 'make weekly narrative consume Mirror Trial pressure'),
      check('divine crisis', world.divineCrisis && world.divineCrisis.status === 'active', 'restore War of Saints and Source pressure')
    ],
    audio: [
      check('season profiles', files.music.includes('SEASON_PROFILES'), 'restore seasonal audio profiles'),
      check('ambient pads', files.music.includes('playAmbientPad'), 'restore subtle ambient pads'),
      check('soft bells', files.music.includes('playSoftBell'), 'restore soft bell accents'),
      check('music button sync', files.index.includes('refreshMusicButton'), 'sync music button state'),
      check('season bridge', files.humans.includes('GardenMusic.setSeason'), 'sync season into music'),
      check('input ducking', files.music.includes('INPUT_DUCK_VOLUME') && files.music.includes('focusin') && files.music.includes('focusout'), 'duck ambient music during text entry'),
      check('voice cap', files.music.includes('MAX_ACTIVE_VOICES') && files.music.includes('canScheduleVoice'), 'cap scheduled audio voice density')
    ],
    performance: [
      check('visible tiles', files.index.includes('drawVisibleTiles'), 'restore viewport tile rendering'),
      check('citizen cap', files.index.includes('CITIZEN_VISUAL_LIMIT'), 'cap visible citizens'),
      check('crab cap', files.index.includes('MAX_VISIBLE_CRABS'), 'cap crab agents'),
      check('spacing guard', files.index.includes('citizenTooCloseToDrawn'), 'avoid crowded sprite overlap'),
      check('reduced motion', files.index.includes('prefersReducedMotion'), 'respect reduced motion')
    ],
    monetization: [
      check('deity archive', files.readme.includes('Deity Archive') && files.humans.includes('Share Result'), 'keep Deity Archive as an honest roadmap while the playable result stays useful'),
      check('paid guardrail', files.roadmap.includes('Cannot force outcomes') && files.readme.includes('without selling direct control'), 'state paid control guardrail'),
      check('minor pass', files.roadmap.includes('Minor God Pass'), 'define Minor God Pass'),
      check('patron pass', files.roadmap.includes('Patron God Pass'), 'define Patron God Pass'),
      check('founding deity', files.roadmap.includes('Founding Deity'), 'define Founding Deity')
    ],
    qa: [
      check('playtest contract', files.playtest.includes('GStack') || files.playtest.includes('gstackCouncil'), 'add GStack Council to playtest'),
      check('roadmap pulse', files.roadmapPulse.includes('Roadmap Pulse'), 'restore roadmap pulse script'),
      check('self optimizer', optimizer && optimizer.overallScore >= 90, 'restore self optimizer score'),
      check('workflow syntax', files.selfWorkflow.includes('node --check scripts/roadmap-pulse.js'), 'validate roadmap pulse in workflow'),
      check('json validation', files.selfWorkflow.includes('jq empty experiments/world-state.json'), 'validate world-state JSON')
    ],
    growth: [
      check('native share', files.humans.includes('navigator.share'), 'restore native share'),
      check('share copy fallback', files.humans.includes('clipboard') || files.humans.includes('execCommand'), 'restore share copy fallback'),
      check('public proof', files.readme.includes('shareable artifact'), 'make share artifact obvious'),
      check('latest gods planned', files.roadmap.includes('Latest Gods'), 'keep Latest Gods in roadmap'),
      check('return hook', files.roadmap.includes('Return visit shows what changed'), 'define return hook criteria')
    ],
    safety: [
      check('no direct mutation', files.humans.includes('cannot mutate the canonical world-state directly'), 'state no direct world mutation'),
      check('paid boundary', files.roadmap.includes('Direct paid control over world outcomes') && files.readme.includes('do not buy control'), 'state paid boundary'),
      check('sanitized bus', files.humans.includes('sanitizeIncoming') && files.humans.includes('sanitizeOmen'), 'sanitize realtime input'),
      check('bounded text', files.humans.includes('slice(0, 280)') && files.humans.includes('slice(0, 360)'), 'bound user text lengths'),
      check('temptation label', files.humans.includes('Forbidden Signal'), 'label high-power action as dangerous')
    ]
  };

  const checks = checksById[specialist.id] || [];
  const score = points(checks);
  return Object.assign({}, specialist, {
    score,
    grade: grade(score),
    evidence: evidence(checks),
    gaps: gaps(checks),
    nextFix: firstGap(checks, specialist.tinyPatchRule),
    status: score >= 96 ? 'ready' : 'needs-polish'
  });
}

function buildCouncil(world, files) {
  const day = Number(world.chronicle && world.chronicle.day) || 0;
  const reviews = SPECIALISTS.map(specialist => reviewFor(specialist, files, world));
  const overallScore = Math.round(reviews.reduce((sum, item) => sum + item.score, 0) / Math.max(1, reviews.length));
  const backlog = reviews
    .slice()
    .sort((a, b) => a.score - b.score || a.id.localeCompare(b.id))
    .map(item => ({
      discipline: item.id,
      title: item.title,
      score: item.score,
      nextFix: item.nextFix,
      tinyPatchRule: item.tinyPatchRule
    }));
  const priority = backlog.find(item => item.score < 100) || backlog[day % Math.max(1, backlog.length)] || null;

  return {
    id: 'gstack-council-day-' + day,
    name: 'GStack Professional Council',
    model: 'ai-garden-gstack-council-v1',
    day,
    generatedAt: new Date().toISOString(),
    charter: 'Use professional specialists to make every small product flaw visible, prioritized, and testable.',
    perfectionBar: 'No vague polish: every discipline must name evidence, a gap, and one tiny next fix.',
    overallScore,
    priority,
    specialists: reviews,
    backlog,
    gstackLoop: {
      observe: 'Read world-state, client UI, roadmap, automation, and test contracts.',
      diagnose: 'Each professional scores their discipline with concrete evidence and gaps.',
      prioritize: 'Lowest score wins the next tiny patch; if every discipline passes, rotate the professional watchlist.',
      apply: 'Future agents ship one small improvement and rerun playtest before committing.',
      verify: 'Playtest, self-optimizer, roadmap pulse, and this council must all agree the loop is healthier.'
    },
    verifyChecklist: {
      ok: reviews.length === SPECIALISTS.length && !!priority,
      specialistCount: reviews.length,
      hasPriority: !!priority,
      allHaveNextFix: reviews.every(item => !!item.nextFix)
    }
  };
}

function attachToWorld(world, council) {
  world.gstackCouncil = council;
  world.events = Array.isArray(world.events) ? world.events : [];
  const eventId = council.id;
  const description = 'GStack Professional Council picked ' +
    council.priority.title + ': ' + sentence(council.priority.nextFix);
  const existing = world.events.find(event => event && event.id === eventId);
  if (existing) {
    existing.timestamp = council.generatedAt;
    existing.description = description;
  } else {
    world.events.push({
      id: eventId,
      type: 'gstack-council',
      day: council.day,
      timestamp: council.generatedAt,
      description
    });
  }
}

function main() {
  const world = JSON.parse(read(WORLD));
  const files = {
    index: read(INDEX),
    humans: read(HUMANS),
    music: read(MUSIC),
    readme: read(README),
    roadmap: read(ROADMAP),
    playtest: read(PLAYTEST),
    selfOptimizer: read(SELF_OPTIMIZER),
    roadmapPulse: read(ROADMAP_PULSE),
    selfWorkflow: read(SELF_WORKFLOW),
    roadmapWorkflow: read(ROADMAP_WORKFLOW),
    weeklyNarrative: read(path.join(ROOT, 'scripts', 'weekly-narrative-agent.js'))
  };
  const council = buildCouncil(world, files);
  attachToWorld(world, council);
  write(WORLD, JSON.stringify(world, null, 2) + '\n');
  console.log('GStack Council updated day ' + council.day + '.');
  console.log('Overall: ' + council.overallScore + '/100');
  console.log('Priority: ' + council.priority.title + ' - ' + council.priority.nextFix);
}

if (require.main === module) main();

module.exports = { buildCouncil };
