#!/usr/bin/env node
/**
 * ai-garden · Playtest Subagent
 *
 * Fast product smoke tests for the spectator experience. This is not a
 * unit-test suite; it is a small QA agent that checks whether the Garden
 * has a legible society loop, a sane ticker, and the expected observer UI.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WORLD = path.join(ROOT, 'experiments', 'world-state.json');
const INDEX = path.join(ROOT, 'index.html');
const HUMANS = path.join(ROOT, 'experiments', 'humans.js');
const DAILY_WORKFLOW = path.join(ROOT, '.github', 'workflows', 'daily-evolution.yml');
const AUTOPILOT_WORKFLOW = path.join(ROOT, '.github', 'workflows', 'daily-autopilot-pr.yml');
const AUTOPILOT_SUMMARY = path.join(ROOT, 'scripts', 'autopilot-pr-summary.js');
const DAILY_EVOLUTION = path.join(ROOT, 'scripts', 'daily-evolution.js');

const failures = [];
const notes = [];

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function check(condition, message) {
  if (!condition) failures.push(message);
}

function note(message) {
  notes.push(message);
}

async function checkLocalUrl(url) {
  if (!url) return;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    check(res.ok, `${url} did not return OK`);
    const html = await res.text();
    check(html.includes('events-scroll'), 'local page is missing the events ticker DOM');
    check(html.includes('experiments/humans.js'), 'local page is missing the human observer layer');
    note(`local url ${url} returned ${res.status}`);
  } catch (err) {
    failures.push(`could not fetch ${url}: ${err.message}`);
  }
}

async function main() {
  const url = process.argv.find(arg => arg.startsWith('http://') || arg.startsWith('https://'));
  const world = JSON.parse(read(WORLD));
  const index = read(INDEX);
  const humans = read(HUMANS);
  const dailyWorkflow = read(DAILY_WORKFLOW);
  const autopilotWorkflow = read(AUTOPILOT_WORKFLOW);
  const autopilotSummary = read(AUTOPILOT_SUMMARY);
  const dailyEvolution = read(DAILY_EVOLUTION);
  const landmarkBlock = index.match(/const OPEN_WORLD_LANDMARKS = \[([\s\S]*?)\];/);
  const landmarkCount = landmarkBlock ? (landmarkBlock[1].match(/\bid:/g) || []).length : 0;
  const civilizationView = world.civilizationView || {};
  const settlementSites = Array.isArray(civilizationView.settlementSites) ? civilizationView.settlementSites : [];
  const settlementTypes = new Set(settlementSites.map(site => site.type));

  check(world.civilizationBrain && world.civilizationBrain.summary, 'missing civilizationBrain summary');
  check(Array.isArray(world.agentActions) && world.agentActions.length >= 12, 'agent action ledger is too thin');
  check(Array.isArray(world.lineages) && world.lineages.length >= 6, 'missing agent lineages');

  const director = world.societyDirector;
  check(director && director.currentArc, 'missing Society Director current arc');
  check(director && Array.isArray(director.tensions) && director.tensions.length >= 2, 'Society Director has too few tensions');
  check(director && Array.isArray(director.quests) && director.quests.length >= 2, 'Society Director has too few quests');
  check(director && Array.isArray(director.tickerBeats) && director.tickerBeats.length >= 3, 'Society Director has too few ticker beats');
  check(director && director.appliedPlan && director.appliedPlan.region, 'Society Director did not apply a daily map plan');
  check(director && director.appliedPlan && director.appliedPlan.convivencia, 'Society Director did not apply a convivencia plan');
  check(Array.isArray(world.landscapeEvents) && world.landscapeEvents.length >= 1, 'missing director landscape events');
  check(Array.isArray(world.convivenciaEvents) && world.convivenciaEvents.length >= 1, 'missing convivencia events');
  check(world.civilizationView && Array.isArray(world.civilizationView.districts) && world.civilizationView.districts.length >= 8, 'civilization view has too few visible districts');
  check(world.civilizationView && Array.isArray(world.civilizationView.roads) && world.civilizationView.roads.length >= 6, 'civilization view has too few roads');
  check(world.civilizationView && Array.isArray(world.civilizationView.frontierCells) && world.civilizationView.frontierCells.length >= 6, 'civilization view is missing frontier cells');
  check(world.civilizationView && world.civilizationView.projection && world.civilizationView.projection.canvasWidth >= 2304, 'civilization projection canvas is still too small');
  check((world.civilizationView && world.civilizationView.districts || []).some(d => d.x > 1300 || d.y > 900), 'civilization districts do not reach the expanded map');
  check(settlementSites.length >= 24, 'civilization view needs visible first-camp construction sites');
  check(settlementTypes.has('hearth-circle'), 'first-camp layer is missing shared fire sites');
  check(settlementTypes.has('reed-shelter') || settlementTypes.has('seed-cache') || settlementTypes.has('shared-granary'), 'first-camp layer is missing shelter or food storage');
  check(settlementTypes.has('council-stones') || settlementTypes.has('memory-pole') || settlementTypes.has('scribe-mat'), 'first-camp layer is missing law, memory, or ritual places');
  check(Array.isArray(world.crabAgents) && world.crabAgents.length >= 2 && world.crabAgents.length <= 10, 'OpenClaw crab agents should stay between 2 and 10');
  check((world.crabAgents || []).some(crab => crab.name === 'OpenClaw'), 'OpenClaw crab is missing');
  check((world.crabAgents || []).some(crab => crab.name === 'Claude'), 'Claude crab is missing');
  check((world.crabAgents || []).every(crab => crab.personality && Array.isArray(crab.dialogue) && crab.dialogue.length >= 2), 'each OpenClaw crab needs personality and dialogue');
  check(Array.isArray(world.crabActions) && world.crabActions.length >= 1, 'missing OpenClaw crab action ledger');

  for (const beat of (director && director.tickerBeats) || []) {
    check(String(beat.text || '').length <= 155, `ticker beat too long: ${beat.text}`);
  }

  check(index.includes('TICKER_PIXELS_PER_SECOND'), 'ticker speed is not measured by pixel velocity');
  check(index.includes('tuneTickerSpeed'), 'ticker speed tuning function is missing');
  check(index.includes('escapeTickerText'), 'ticker text escaping is missing');
  check(index.includes('ticker-track:hover'), 'ticker does not pause on hover');
  check(index.includes('toggleEventsPanel'), 'ticker does not open an event/detail panel');
  check(index.includes('getCivilizationDay'), 'top day counter is not tied to chronicle/civilization day');
  check(index.includes('minZoomForViewport'), 'zoom minimum is not dynamic to viewport size');
  check(index.includes('drawCivilizationProjection'), 'canvas does not draw the civilization projection');
  check(index.includes('drawCrabAgents'), 'canvas does not draw OpenClaw crab agents');
  check(index.includes('findCrabAt'), 'OpenClaw crab agents are not clickable');
  check(index.includes('OPEN_WORLD_LANDMARKS'), 'expanded open-world landmarks are missing');
  check(index.includes('const WORLD_W = 2304'), 'open-world width should be 2304');
  check(index.includes('const WORLD_H = 1728'), 'open-world height should be 1728');
  check(landmarkCount >= 14, 'expanded open-world needs at least 14 named landmarks');
  check(index.includes('drawVisibleTiles'), 'expanded map is not using viewport tile rendering');
  check(index.includes('updateSpectatorCamera'), 'spectator camera touring is missing');
  check(index.includes('<canvas id="minimap" width="176" height="132"></canvas>'), 'expanded map minimap is too small');
  check(index.includes('drawPrimitiveWork'), 'canvas does not draw first-camp construction sprites');
  check(index.includes('settlementSites'), 'canvas does not consume settlement construction sites');
  check(index.includes('addSpeechBubble'), 'pixel speech bubble helper is missing');
  check(index.includes('updateAmbientDialogues'), 'ambient agent dialogue scheduler is missing');
  check(index.includes('PIXEL_DIALOGUE'), 'pixel dialogue line pools are missing');
  check(!index.includes('Math.min(220, itemCount * 12)'), 'old capped item-count ticker speed logic is still present');
  check(!index.includes("Math.max(2, SCALE - 1)"), 'zoom-out can still force a too-low scale');

  check(humans.includes('Society Director AI'), 'CIV panel does not expose Society Director AI');
  check(humans.includes('DIRECTOR QUESTS'), 'CIV panel does not expose director quests');
  check(humans.includes('DIRECTOR TENSIONS'), 'CIV panel does not expose director tensions');
  check(humans.includes('Observer Weather'), 'CIV panel does not expose human omen consequences');
  check(humans.includes('convivencia:'), 'CIV panel does not expose applied convivencia plan');
  check(!humans.includes('cosmetic · agents do not see'), 'God Mode still says it is cosmetic');
  check(humans.includes("m.kind !== 'god'"), 'Observer Lounge may still render god spam');

  check(dailyWorkflow.includes("cron: '11 4 * * *'"), 'daily evolution cron is missing');
  check(dailyWorkflow.includes('node scripts/playtest-subagent.js'), 'daily cron does not run the playtest subagent');
  check(dailyWorkflow.includes('git pull --rebase origin main'), 'daily cron does not rebase before pushing');
  check(dailyWorkflow.includes('contents: write'), 'daily cron cannot write commits');

  check(autopilotWorkflow.includes("cron: '37 5 * * *'"), 'daily autopilot PR cron is missing');
  check(autopilotWorkflow.includes('pull-requests: write'), 'autopilot workflow cannot open PRs');
  check(autopilotWorkflow.includes('startsWith') || autopilotWorkflow.includes('startswith("autopilot/day-")'), 'autopilot workflow lacks duplicate PR guard');
  check(autopilotWorkflow.includes('Check PR automation permission'), 'autopilot workflow does not preflight PR permissions');
  check(autopilotWorkflow.includes('PR creation blocked'), 'autopilot workflow does not exit cleanly when PR creation is disabled');
  check(autopilotWorkflow.includes('node scripts/autopilot-pr-summary.js'), 'autopilot workflow does not generate a PR summary');
  check(autopilotWorkflow.includes('gh pr create'), 'autopilot workflow does not open a PR');
  check(autopilotWorkflow.includes('--draft'), 'autopilot PRs should start as drafts');
  check(autopilotWorkflow.includes('--label ai-garden-autopilot'), 'autopilot PR label is missing');
  check(autopilotSummary.includes('Autopilot Summary'), 'autopilot summary body is missing');
  check(autopilotSummary.includes('GITHUB_OUTPUT'), 'autopilot summary does not expose workflow outputs');

  check(dailyEvolution.includes('FIRST_WORKS'), 'daily evolution does not generate first-civilization works');
  check(dailyEvolution.includes('FIRST_WORK_PURPOSES'), 'daily evolution does not explain why first-camp works matter');
  check(dailyEvolution.includes("era: FIRST_WORKS.has(type) ? 'first-camp'"), 'daily evolution does not tag first-camp structures');

  await checkLocalUrl(url);

  if (director && director.currentArc) note(`arc: ${director.currentArc.title}`);
  if (director && director.metrics) {
    note(`pressure: instability ${director.metrics.instability}, novelty ${director.metrics.novelty}, legibility ${director.metrics.legibility}`);
  }

  if (failures.length) {
    console.error('Playtest subagent failed:');
    for (const f of failures) console.error('- ' + f);
    process.exit(1);
  }

  console.log('Playtest subagent passed.');
  for (const n of notes) console.log('- ' + n);
}

main().catch(err => {
  console.error(err.stack || err.message);
  process.exit(1);
});
