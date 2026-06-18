#!/usr/bin/env node
/**
 * ai-garden - Self Optimizer
 *
 * A deterministic daily product agent. It audits the static game surface,
 * scores the experience, writes one clear improvement directive into the
 * shared world state, and refreshes the README so the next AI agent knows
 * what the Garden wants to become.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WORLD = path.join(ROOT, 'experiments', 'world-state.json');
const README = path.join(ROOT, 'README.md');
const PLAN = path.join(ROOT, 'PLAN.md');
const INDEX = path.join(ROOT, 'index.html');
const HUMANS = path.join(ROOT, 'experiments', 'humans.js');
const MUSIC = path.join(ROOT, 'experiments', 'music.js');
const PLAYTEST = path.join(ROOT, 'scripts', 'playtest-subagent.js');
const WEEKLY_NARRATIVE = path.join(ROOT, 'scripts', 'weekly-narrative-agent.js');
const ROADMAP_PULSE = path.join(ROOT, 'scripts', 'roadmap-pulse.js');
const GSTACK_COUNCIL = path.join(ROOT, 'scripts', 'gstack-council.js');
const STAKEHOLDER_ASSEMBLY = path.join(ROOT, 'scripts', 'stakeholder-assembly.js');
const DAILY_WORKFLOW = path.join(ROOT, '.github', 'workflows', 'daily-evolution.yml');
const AUTOPILOT_WORKFLOW = path.join(ROOT, '.github', 'workflows', 'daily-autopilot-pr.yml');
const SELF_WORKFLOW = path.join(ROOT, '.github', 'workflows', 'daily-self-optimizer.yml');
const ROADMAP_WORKFLOW = path.join(ROOT, '.github', 'workflows', 'daily-roadmap-pulse.yml');

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function write(file, value) {
  fs.writeFileSync(file, value);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function short(text, limit = 145) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) return clean;
  return clean.slice(0, limit - 1).trimEnd() + '.';
}

function hashText(text) {
  text = String(text || '');
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function points(checks) {
  const passed = checks.filter(Boolean).length;
  return Math.round((passed / Math.max(1, checks.length)) * 100);
}

function detail(name, ok) {
  return ok ? name : null;
}

function compactEvidence(items) {
  return items.filter(Boolean).slice(0, 6);
}

function scoreMobileUX(index, humans) {
  const checks = [
    index.includes('id="mobile-menu-toggle"'),
    index.includes('setMobileToolsOpen'),
    index.includes('closeMobileToolsAfterAction'),
    index.includes('mobile-tools-open'),
    index.includes('id="mobile-dock-close"'),
    index.includes('THE MIRROR TRIAL'),
    index.includes('watch-action-btn'),
    index.includes('story-action-btn'),
    humans.includes("chat.classList.add('ag-collapsed')"),
    humans.includes('body.mobile-tools-open .ag-chat')
  ];
  return {
    key: 'mobileUX',
    label: 'Mobile UX',
    score: points(checks),
    nextAction: 'keep the mobile HUD quiet, dismissible, and action-first',
    evidence: compactEvidence([
      detail('drawer toggle', checks[0]),
      detail('programmatic close', checks[1]),
      detail('post-action close', checks[2]),
      detail('body drawer state', checks[3]),
      detail('explicit close button', checks[4]),
      detail('god trial cue', checks[5]),
      detail('collapsed chat', checks[8])
    ])
  };
}

function scoreFlow(index, world) {
  const checks = [
    index.includes('TICKER_PIXELS_PER_SECOND'),
    index.includes('tuneTickerSpeed'),
    index.includes('ticker-track:hover'),
    index.includes('toggleEventsPanel'),
    index.includes('weeklyNarrativeData'),
    index.includes('id="story-week-cue"'),
    index.includes('id="story-meter-fill"'),
    index.includes('id="story-spotlight"'),
    index.includes('id="story-cliffhanger"'),
    index.includes('AIGardenHumans.trial'),
    index.includes('updateSpectatorCamera'),
    index.includes('focusNextFeaturedAgent'),
    index.includes('minZoomForViewport'),
    Number(world.gameWonderAgent && world.gameWonderAgent.scores && world.gameWonderAgent.scores.flow) >= 70,
    Array.isArray(world.agentActions) && world.agentActions.length >= 12,
    Array.isArray(world.events) && world.events.length >= 5
  ];
  return {
    key: 'flow',
    label: 'Game Flow',
    score: points(checks),
    nextAction: 'slow the spectacle into one readable scene at a time',
    evidence: compactEvidence([
      detail('pixel-speed ticker', checks[0]),
      detail('hover pause', checks[2]),
      detail('event details panel', checks[3]),
      detail('weekly cue', checks[5]),
      detail('week meter', checks[6]),
      detail('story spotlight', checks[7]),
      detail('god trial CTA', checks[9]),
      detail('spectator camera', checks[10]),
      detail('featured-agent jump', checks[11]),
      detail('dynamic zoom minimum', checks[12])
    ])
  };
}

function scoreWorldLife(index, world) {
  const view = world.civilizationView || {};
  const checks = [
    Array.isArray(world.featuredAgents) && world.featuredAgents.length === 8,
    Array.isArray(world.crabAgents) && world.crabAgents.length >= 2 && world.crabAgents.length <= 10,
    Array.isArray(view.districts) && view.districts.length >= 8,
    Array.isArray(view.roads) && view.roads.length >= 6,
    Array.isArray(view.settlementSites) && view.settlementSites.length >= 24,
    Array.isArray(world.convivenciaEvents) && world.convivenciaEvents.length >= 1,
    Array.isArray(world.landscapeEvents) && world.landscapeEvents.length >= 1,
    index.includes('drawFeaturedAgents'),
    index.includes('drawAgentActionBeacons'),
    index.includes('updateAmbientDialogues'),
    index.includes('PIXEL_DIALOGUE')
  ];
  return {
    key: 'worldLife',
    label: 'World Life',
    score: points(checks),
    nextAction: 'add motion, emotion, and civic work without increasing crowd density',
    evidence: compactEvidence([
      detail('8 featured agents', checks[0]),
      detail('bounded crab cast', checks[1]),
      detail('districts', checks[2]),
      detail('roads', checks[3]),
      detail('first-camp work sites', checks[4]),
      detail('ambient dialogue', checks[9])
    ])
  };
}

function scoreAudio(music, index, humans) {
  const checks = [
    music.includes('HOOK_STEPS'),
    music.includes('ARP_STEPS'),
    music.includes('playChipKick'),
    music.includes('playNoiseBurst'),
    index.includes('toggleGardenMusic'),
    index.includes('refreshMusicButton'),
    music.includes('SEASON_PROFILES'),
    music.includes('playAmbientPad'),
    music.includes('playSoftBell'),
    music.includes('setSeason'),
    humans.includes('GardenMusic.setSeason')
  ];
  return {
    key: 'audio',
    label: 'Audio',
    score: points(checks),
    nextAction: 'keep the seasonal ambient bed subtle, synced, and optional',
    evidence: compactEvidence([
      detail('original hook', checks[0]),
      detail('arpeggio motion', checks[1]),
      detail('chip kick', checks[2]),
      detail('noise percussion', checks[3]),
      detail('synced music button', checks[5]),
      detail('seasonal ambient', checks[6] && checks[7] && checks[10])
    ])
  };
}

function scorePerformance(index) {
  const checks = [
    index.includes('drawVisibleTiles'),
    index.includes('const CITIZEN_VISUAL_LIMIT = 14'),
    index.includes('CITIZEN_PER_DISTRICT_LIMIT'),
    index.includes('citizenTooCloseToDrawn'),
    index.includes('visibleCrabAgents'),
    index.includes('const MAX_VISIBLE_CRABS = 6'),
    index.includes('requestAnimationFrame'),
    index.includes('will-change') || index.includes('transform:')
  ];
  return {
    key: 'performance',
    label: 'Performance',
    score: points(checks),
    nextAction: 'profile the canvas and keep animation density readable before adding more life',
    evidence: compactEvidence([
      detail('viewport tile rendering', checks[0]),
      detail('citizen cap', checks[1]),
      detail('district cap', checks[2]),
      detail('spacing guard', checks[3]),
      detail('crab cap', checks[5])
    ])
  };
}

function scoreAutomation(dailyWorkflow, autopilotWorkflow, selfWorkflow, roadmapWorkflow, playtest, weeklyNarrative, roadmapPulse, gstackCouncil, stakeholderAssembly, plan) {
  const checks = [
    dailyWorkflow.includes("cron: '11 4 * * *'"),
    dailyWorkflow.includes('node scripts/playtest-subagent.js'),
    dailyWorkflow.includes('node --check scripts/weekly-narrative-agent.js'),
    dailyWorkflow.includes('git pull --rebase origin main'),
    autopilotWorkflow.includes("cron: '37 5 * * *'"),
    autopilotWorkflow.includes('gh pr create'),
    autopilotWorkflow.includes('--draft'),
    selfWorkflow.includes("cron: '23 6 * * *'"),
    selfWorkflow.includes('node scripts/self-optimizer.js'),
    selfWorkflow.includes('node scripts/gstack-council.js'),
    selfWorkflow.includes('node scripts/stakeholder-assembly.js'),
    selfWorkflow.includes('node --check scripts/weekly-narrative-agent.js'),
    selfWorkflow.includes('node --check scripts/roadmap-pulse.js'),
    selfWorkflow.includes('node --check scripts/gstack-council.js'),
    selfWorkflow.includes('node --check scripts/stakeholder-assembly.js'),
    selfWorkflow.includes('PLAN.md'),
    selfWorkflow.includes('git pull --rebase origin main'),
    roadmapWorkflow.includes("cron: '17 7 * * *'"),
    roadmapWorkflow.includes('node scripts/roadmap-pulse.js'),
    roadmapWorkflow.includes('git add ROADMAP.md'),
    roadmapPulse.includes('Roadmap Pulse'),
    roadmapPulse.includes('BACKEND_SYNC_STORE'),
    roadmapPulse.includes('Professional Council'),
    roadmapPulse.includes('Stakeholder Plan'),
    playtest.includes('SELF_OPTIMIZER'),
    playtest.includes('GSTACK_COUNCIL'),
    playtest.includes('STAKEHOLDER_ASSEMBLY'),
    playtest.includes('Weekly Narrative Agent'),
    playtest.includes('story-spotlight'),
    weeklyNarrative.includes('storyCard'),
    weeklyNarrative.includes('buildEntertainmentLayer'),
    weeklyNarrative.includes('weekly-showdown'),
    gstackCouncil.includes('GStack Professional Council'),
    gstackCouncil.includes('Product Lead'),
    gstackCouncil.includes('Trust And Safety Lead'),
    stakeholderAssembly.includes('Investor/User/Team Room'),
    stakeholderAssembly.includes('Seven-Day /plan'),
    plan.includes('/plan - Investor Room')
  ];
  return {
    key: 'automation',
    label: 'Autonomy',
    score: points(checks),
    nextAction: 'keep evolution, PR, self-audit, and roadmap pulse loops healthy without creating automation spam',
    evidence: compactEvidence([
      detail('daily daemon', checks[0]),
      detail('daemon playtest', checks[1]),
      detail('weekly syntax check', checks[2]),
      detail('autopilot PRs', checks[4]),
      detail('self-optimizer cron', checks[7]),
      detail('professional council', checks[9]),
      detail('stakeholder assembly', checks[10]),
      detail('roadmap pulse cron', checks[17]),
      detail('roadmap syntax check', checks[12]),
      detail('weekly narrative contract', checks[29])
    ])
  };
}

function chooseFocus(scores, day) {
  const sorted = scores.slice().sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return a.key.localeCompare(b.key);
  });
  const weakest = sorted[0];
  if (weakest.score < 92) return weakest;
  const rotation = ['worldLife', 'flow', 'mobileUX', 'performance', 'audio', 'automation'];
  const key = rotation[day % rotation.length];
  return scores.find(s => s.key === key) || weakest;
}

function average(scores) {
  return Math.round(scores.reduce((sum, s) => sum + s.score, 0) / Math.max(1, scores.length));
}

function snapshotSignature(snapshot) {
  return hashText(JSON.stringify({
    day: snapshot.day,
    overallScore: snapshot.overallScore,
    focus: snapshot.focus,
    scores: snapshot.scores,
    backlog: snapshot.backlog
  }));
}

function upsertReadmeBlock(readme, snapshot) {
  const focus = snapshot.focus;
  const block = [
    '<!-- self-optimizer:start -->',
    '**Self Optimizer** - Day ' + snapshot.day +
      ' - overall ' + snapshot.overallScore + '/100' +
      ' - focus: ' + focus.label +
      ' - next: ' + short(focus.nextAction, 110),
    '<!-- self-optimizer:end -->'
  ].join('\n');

  if (/<!-- self-optimizer:start -->[\s\S]*?<!-- self-optimizer:end -->/.test(readme)) {
    return readme.replace(/<!-- self-optimizer:start -->[\s\S]*?<!-- self-optimizer:end -->/, block);
  }
  if (/<!-- live:end -->/.test(readme)) {
    return readme.replace(/<!-- live:end -->/, '<!-- live:end -->\n\n' + block);
  }
  return readme + '\n\n' + block + '\n';
}

function buildSnapshot(world, files) {
  const day = Number(world.chronicle && world.chronicle.day) || 0;
  const scores = [
    scoreMobileUX(files.index, files.humans),
    scoreFlow(files.index, world),
    scoreWorldLife(files.index, world),
    scoreAudio(files.music, files.index, files.humans),
    scorePerformance(files.index),
    scoreAutomation(
      files.dailyWorkflow,
      files.autopilotWorkflow,
      files.selfWorkflow,
      files.roadmapWorkflow,
      files.playtest,
      files.weeklyNarrative,
      files.roadmapPulse,
      files.gstackCouncil,
      files.stakeholderAssembly,
      files.plan
    )
  ];
  const focus = chooseFocus(scores, day);
  const overallScore = average(scores);
  const backlog = scores
    .slice()
    .sort((a, b) => a.score - b.score)
    .map(s => ({
      key: s.key,
      label: s.label,
      score: s.score,
      nextAction: s.nextAction,
      evidence: s.evidence
    }));

  const snapshot = {
    id: 'self-optimizer-day-' + day,
    name: 'Self Optimizer',
    model: 'ai-garden-self-optimizer-v1',
    charter: 'Audit the whole spectator game every day and choose one small, safe improvement for the next agent.',
    day,
    generatedAt: new Date().toISOString(),
    sourceCommit: process.env.GITHUB_SHA || null,
    overallScore,
    focus: {
      key: focus.key,
      label: focus.label,
      score: focus.score,
      nextAction: focus.nextAction,
      why: short('Lowest or rotating priority based on UI, mobile, audio, performance, automation, and living-world checks.'),
      evidence: focus.evidence
    },
    scores: scores.reduce((acc, s) => {
      acc[s.key] = { label: s.label, score: s.score, evidence: s.evidence };
      return acc;
    }, {}),
    backlog,
    guardrails: [
      'one readable improvement before adding more entities',
      'mobile controls must stay dismissible',
      'ticker and observer lounge must stay calm',
      'run playtest-subagent before committing',
      'prefer small patches that future agents can understand'
    ],
    dailyDirective: short('Next agent: ' + focus.nextAction + '. Keep the world alive, but make the player understand what to watch.')
  };
  snapshot.signature = snapshotSignature(snapshot);

  const previous = world.selfOptimizer || {};
  if (previous.id === snapshot.id && previous.signature === snapshot.signature) {
    snapshot.generatedAt = previous.generatedAt || snapshot.generatedAt;
    snapshot.sourceCommit = previous.sourceCommit || snapshot.sourceCommit;
  }
  return snapshot;
}

function attachToWorld(world, snapshot) {
  const previous = world.selfOptimizer || {};
  const history = Array.isArray(previous.history)
    ? previous.history.filter(entry => entry && entry.day !== snapshot.day).slice(-13)
    : [];
  const historyEntry = {
    day: snapshot.day,
    generatedAt: snapshot.generatedAt,
    overallScore: snapshot.overallScore,
    focus: snapshot.focus.label,
    nextAction: snapshot.focus.nextAction
  };
  history.push(historyEntry);
  world.selfOptimizer = Object.assign({}, snapshot, { history });

  world.events = Array.isArray(world.events) ? world.events : [];
  const eventId = 'self-optimizer-day-' + snapshot.day;
  const description = 'Self Optimizer chose ' + snapshot.focus.label + ': ' + snapshot.focus.nextAction + '.';
  const existing = world.events.find(e => e && e.id === eventId);
  if (existing) {
    existing.description = description;
    existing.timestamp = snapshot.generatedAt;
  } else {
    world.events.push({
      id: eventId,
      type: 'self-optimizer',
      day: snapshot.day,
      timestamp: snapshot.generatedAt,
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
    playtest: read(PLAYTEST),
    weeklyNarrative: read(WEEKLY_NARRATIVE),
    roadmapPulse: read(ROADMAP_PULSE),
    gstackCouncil: read(GSTACK_COUNCIL),
    stakeholderAssembly: read(STAKEHOLDER_ASSEMBLY),
    plan: read(PLAN),
    dailyWorkflow: read(DAILY_WORKFLOW),
    autopilotWorkflow: read(AUTOPILOT_WORKFLOW),
    selfWorkflow: read(SELF_WORKFLOW),
    roadmapWorkflow: read(ROADMAP_WORKFLOW)
  };
  const snapshot = buildSnapshot(world, files);

  attachToWorld(world, snapshot);
  write(WORLD, JSON.stringify(world, null, 2) + '\n');

  const readme = read(README);
  write(README, upsertReadmeBlock(readme, snapshot));

  console.log('Self Optimizer updated day ' + snapshot.day + '.');
  console.log('Overall: ' + snapshot.overallScore + '/100');
  console.log('Focus: ' + snapshot.focus.label + ' - ' + snapshot.focus.nextAction);
}

if (require.main === module) main();
