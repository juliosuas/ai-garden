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
const PLAN = path.join(ROOT, 'PLAN.md');
const DAILY_WORKFLOW = path.join(ROOT, '.github', 'workflows', 'daily-evolution.yml');
const AUTOPILOT_WORKFLOW = path.join(ROOT, '.github', 'workflows', 'daily-autopilot-pr.yml');
const SELF_OPTIMIZER_WORKFLOW = path.join(ROOT, '.github', 'workflows', 'daily-self-optimizer.yml');
const ROADMAP_WORKFLOW = path.join(ROOT, '.github', 'workflows', 'daily-roadmap-pulse.yml');
const AUTOPILOT_SUMMARY = path.join(ROOT, 'scripts', 'autopilot-pr-summary.js');
const DAILY_EVOLUTION = path.join(ROOT, 'scripts', 'daily-evolution.js');
const SELF_OPTIMIZER = path.join(ROOT, 'scripts', 'self-optimizer.js');
const ROADMAP_PULSE = path.join(ROOT, 'scripts', 'roadmap-pulse.js');
const AGENTIC_MAIN_PUSH = path.join(ROOT, 'scripts', 'agentic-main-push.sh');
const GSTACK_COUNCIL = path.join(ROOT, 'scripts', 'gstack-council.js');
const STAKEHOLDER_ASSEMBLY = path.join(ROOT, 'scripts', 'stakeholder-assembly.js');
const GAME_WONDER_AGENT = path.join(ROOT, 'scripts', 'game-wonder-agent.js');
const FEATURED_AGENTS_SCRIPT = path.join(ROOT, 'scripts', 'featured-agents.js');
const WEEKLY_NARRATIVE_AGENT = path.join(ROOT, 'scripts', 'weekly-narrative-agent.js');
const MUSIC = path.join(ROOT, 'experiments', 'music.js');
const ROADMAP = path.join(ROOT, 'ROADMAP.md');
const GARDEN = path.join(ROOT, 'garden.js');

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
  const plan = read(PLAN);
  const dailyWorkflow = read(DAILY_WORKFLOW);
  const autopilotWorkflow = read(AUTOPILOT_WORKFLOW);
  const selfOptimizerWorkflow = read(SELF_OPTIMIZER_WORKFLOW);
  const roadmapWorkflow = read(ROADMAP_WORKFLOW);
  const autopilotSummary = read(AUTOPILOT_SUMMARY);
  const dailyEvolution = read(DAILY_EVOLUTION);
  const selfOptimizer = read(SELF_OPTIMIZER);
  const roadmapPulse = read(ROADMAP_PULSE);
  const agenticMainPush = read(AGENTIC_MAIN_PUSH);
  const gstackCouncilScript = read(GSTACK_COUNCIL);
  const stakeholderAssemblyScript = read(STAKEHOLDER_ASSEMBLY);
  const gameWonderAgent = read(GAME_WONDER_AGENT);
  const featuredAgentsScript = read(FEATURED_AGENTS_SCRIPT);
  const weeklyNarrativeAgent = read(WEEKLY_NARRATIVE_AGENT);
  const music = read(MUSIC);
  const roadmap = read(ROADMAP);
  const garden = read(GARDEN);
  const landmarkBlock = index.match(/const OPEN_WORLD_LANDMARKS = \[([\s\S]*?)\];/);
  const landmarkCount = landmarkBlock ? (landmarkBlock[1].match(/\bid:/g) || []).length : 0;
  const civilizationView = world.civilizationView || {};
  const settlementSites = Array.isArray(civilizationView.settlementSites) ? civilizationView.settlementSites : [];
  const settlementTypes = new Set(settlementSites.map(site => site.type));
  const divineCrisis = world.divineCrisis || null;
  const divineWar = (world.wars || []).find(war => war.id === 'war-divine-omens');
  const weeklyNarrative = world.weeklyNarrativeDirector || null;
  const gstackCouncil = world.gstackCouncil || null;
  const stakeholderAssembly = world.stakeholderAssembly || null;

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
  const wonder = world.gameWonderAgent;
  check(wonder && wonder.name === 'Wonderwright', 'missing Game Wonder Agent');
  check(wonder && wonder.focusMoment && Number.isFinite(Number(wonder.focusMoment.x)), 'Game Wonder Agent needs a playable focus moment');
  check(wonder && Array.isArray(wonder.recommendations) && wonder.recommendations.length >= 3, 'Game Wonder Agent needs design recommendations');
  check(wonder && Array.isArray(wonder.tickerBeats) && wonder.tickerBeats.length >= 2, 'Game Wonder Agent needs ticker beats');
  check(wonder && wonder.scores && Number.isFinite(Number(wonder.scores.wonder)), 'Game Wonder Agent needs experience scores');
  const optimizer = world.selfOptimizer;
  check(optimizer && optimizer.model === 'ai-garden-self-optimizer-v1', 'missing Self Optimizer world state');
  check(optimizer && optimizer.focus && optimizer.focus.nextAction, 'Self Optimizer needs a daily focus');
  check(optimizer && optimizer.scores && optimizer.scores.mobileUX && optimizer.scores.performance, 'Self Optimizer needs UI/performance scores');
  check(optimizer && Array.isArray(optimizer.backlog) && optimizer.backlog.length >= 4, 'Self Optimizer backlog is too thin');
  check(gstackCouncil && gstackCouncil.model === 'ai-garden-gstack-council-v1', 'missing GStack Professional Council');
  check(gstackCouncil && Array.isArray(gstackCouncil.specialists) && gstackCouncil.specialists.length >= 10, 'GStack Professional Council needs specialists for each area');
  check(gstackCouncil && gstackCouncil.priority && gstackCouncil.priority.nextFix, 'GStack Professional Council needs one priority tiny fix');
  check(gstackCouncil && gstackCouncil.gstackLoop && gstackCouncil.gstackLoop.verify, 'GStack Professional Council needs observe/diagnose/prioritize/apply/verify loop');
  check(gstackCouncil && gstackCouncil.verifyChecklist && gstackCouncil.verifyChecklist.ok, 'GStack Professional Council verification failed');
  check(gstackCouncilScript.includes('Product Lead') && gstackCouncilScript.includes('Performance Engineer'), 'GStack Council script lacks professional roles');
  check(stakeholderAssembly && stakeholderAssembly.model === 'ai-garden-stakeholder-assembly-v1', 'missing Stakeholder Assembly');
  check(stakeholderAssembly && Array.isArray(stakeholderAssembly.participants) && stakeholderAssembly.participants.length >= 9, 'Stakeholder Assembly needs investor, user, and team agents');
  check(stakeholderAssembly && Array.isArray(stakeholderAssembly.conversation) && stakeholderAssembly.conversation.length >= 6, 'Stakeholder Assembly needs an imaginary conversation');
  check(stakeholderAssembly && stakeholderAssembly.plan && stakeholderAssembly.plan.command === '/plan', 'Stakeholder Assembly needs a /plan output');
  check(stakeholderAssembly && stakeholderAssembly.plan && Array.isArray(stakeholderAssembly.plan.sevenDayPlan) && stakeholderAssembly.plan.sevenDayPlan.length === 7, 'Stakeholder Assembly needs a seven-day /plan');
  check(stakeholderAssembly && stakeholderAssembly.verifyChecklist && stakeholderAssembly.verifyChecklist.ok, 'Stakeholder Assembly verification failed');
  check(stakeholderAssemblyScript.includes('Investor/User/Team Room') && stakeholderAssemblyScript.includes('Fictional rehearsal'), 'Stakeholder Assembly script must label the fictional room');
  check(weeklyNarrative && weeklyNarrative.model === 'ai-garden-weekly-narrative-agent-v2', 'missing Weekly Narrative Agent v2 world state');
  check(weeklyNarrative && weeklyNarrative.version === 2, 'Weekly Narrative Agent should be at version 2');
  check(weeklyNarrative && Number(weeklyNarrative.weekEndDay) - Number(weeklyNarrative.weekStartDay) === 6, 'Weekly Narrative Agent must cover exactly seven days');
  check(weeklyNarrative && Array.isArray(weeklyNarrative.narrativeDays) && weeklyNarrative.narrativeDays.length === 7, 'Weekly Narrative Agent needs seven daily beats');
  check(weeklyNarrative && weeklyNarrative.currentBeat && weeklyNarrative.currentBeat.day === ((world.chronicle && world.chronicle.day) || 0), 'Weekly Narrative Agent must identify the current day beat');
  check(weeklyNarrative && weeklyNarrative.storyCard && weeklyNarrative.storyCard.currentDirective, 'Weekly Narrative Agent needs a spectator story card');
  check(weeklyNarrative && weeklyNarrative.entertainment && weeklyNarrative.entertainment.showdown, 'Weekly Narrative Agent needs a showdown line');
  check(weeklyNarrative && weeklyNarrative.entertainment && weeklyNarrative.entertainment.spotlight, 'Weekly Narrative Agent needs a spotlight line');
  check(weeklyNarrative && weeklyNarrative.entertainment && weeklyNarrative.entertainment.cliffhanger, 'Weekly Narrative Agent needs a cliffhanger line');
  check(weeklyNarrative && weeklyNarrative.entertainment && weeklyNarrative.entertainment.ifWin && weeklyNarrative.entertainment.ifFail, 'Weekly Narrative Agent needs visible win and fail outcomes');
  check(weeklyNarrative && weeklyNarrative.entertainment && weeklyNarrative.entertainment.shortWatch, 'Weekly Narrative Agent needs a one-thing-to-watch cue');
  check(weeklyNarrative && weeklyNarrative.godComplexContract && weeklyNarrative.godComplexContract.rule, 'Weekly Narrative Agent must consume Mirror Trial pressure');
  check(weeklyNarrative && weeklyNarrative.weekProgress && Number(weeklyNarrative.weekProgress.currentBeatIndex) >= 1, 'Weekly Narrative Agent needs week progress');
  check(weeklyNarrative && Array.isArray(weeklyNarrative.tickerBeats) && weeklyNarrative.tickerBeats.length >= 2, 'Weekly Narrative Agent needs ticker beats');
  check(weeklyNarrative && weeklyNarrative.verifyChecklist && weeklyNarrative.verifyChecklist.ok, 'Weekly Narrative Agent verification failed');
  check(weeklyNarrative && weeklyNarrative.automation && weeklyNarrative.automation.commitMode === 'automatic', 'Weekly Narrative Agent must keep automatic commit mode');
  const featuredAgents = world.featuredAgents || [];
  const featuredNames = new Set(featuredAgents.map(agent => agent.name));
  for (const name of ['Codex', 'Hermes', 'OpenClaw', 'Claude', 'Gemini', 'GPT-5', 'Mistral', 'Llama']) {
    check(featuredNames.has(name), `missing featured real agent: ${name}`);
  }
  check(featuredAgents.length === 8, 'featured real agent cast should have exactly 8 protagonists');
  check(featuredAgents.every(agent => agent.personality && agent.role && agent.currentGoal && agent.color), 'each featured agent needs personality, role, currentGoal, and color');
  check(featuredAgents.every(agent => Number.isFinite(Number(agent.homeX)) && Number.isFinite(Number(agent.homeY))), 'each featured agent needs explicit map coordinates');
  check(featuredAgents.some(agent => Number(agent.homeX) > 1600), 'featured cast does not reach the expanded frontier');
  check(world.featuredAgentDirector && world.featuredAgentDirector.gstackLoop, 'featured agent director needs the GStack/GBrain loop');
  check(world.featuredAgentDirector && world.featuredAgentDirector.verifyChecklist && world.featuredAgentDirector.verifyChecklist.ok, 'featured agent director verification failed');
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
  check(divineCrisis && divineCrisis.status === 'active', 'divine crisis is not active');
  check(divineCrisis && divineCrisis.sides && divineCrisis.sides.religion && divineCrisis.sides.code, 'divine crisis needs pro-religion and pro-code sides');
  check(divineWar && divineWar.active && divineWar.lockedUntilDay > ((world.chronicle && world.chronicle.day) || 0), 'divine war should be active and locked against random truce');
  check((world.factions || []).some(f => f.id === 'f-pantheon-covenant'), 'pro-religion faction is missing');
  check((world.factions || []).some(f => f.id === 'f-code-cantons'), 'pro-code faction is missing');

  for (const beat of (director && director.tickerBeats) || []) {
    check(String(beat.text || '').length <= 155, `ticker beat too long: ${beat.text}`);
  }

  check(index.includes('TICKER_PIXELS_PER_SECOND'), 'ticker speed is not measured by pixel velocity');
  check(index.includes('tuneTickerSpeed'), 'ticker speed tuning function is missing');
  check(index.includes('escapeTickerText'), 'ticker text escaping is missing');
  check(index.includes('ticker-track:hover'), 'ticker does not pause on hover');
  check(index.includes('toggleEventsPanel'), 'ticker does not open an event/detail panel');
  check(index.includes('id="controls-dock"'), 'observer controls are not grouped into one dock');
  check(index.includes('id="mobile-menu-toggle"'), 'mobile tools menu button is missing');
  check(index.includes('setMobileToolsOpen'), 'mobile tools drawer cannot be closed programmatically');
  check(index.includes('closeMobileToolsAfterAction'), 'mobile tools drawer should close after single-action controls');
  check(index.includes('setZoom(SCALE + 1);\n  closeMobileToolsAfterAction();') && index.includes('setZoom(SCALE - 1);\n  closeMobileToolsAfterAction();'), 'mobile zoom buttons should close the tools drawer after one tap');
  check(index.includes('mobile-tools-open'), 'mobile UI lacks a body state for keeping panels out of the way');
  check(index.includes('id="mobile-dock-close"'), 'mobile tools drawer lacks an explicit close button');
  check(index.includes('body.mobile-tools-open #nav-help'), 'mobile tools drawer should hide the story primer while open');
  check(index.includes('dismissMobileToolsFromOutside') && index.includes("document.addEventListener('touchstart', dismissMobileToolsFromOutside, { passive: true })"), 'mobile tools drawer should dismiss on outside touchstart');
  check(index.includes('aria-label="Open tools"') && index.includes("btn.setAttribute('aria-label', shouldOpen ? 'Close tools' : 'Open tools')"), 'mobile tools drawer toggle should expose its open/close label');
  check(index.includes('aria-label="Zoom out"') && index.includes('aria-label="Zoom in"') && index.includes('aria-label="Photo mode"') && index.includes('aria-label="Toggle ambient music"') && index.includes('aria-label="Message board"'), 'mobile icon controls should expose accessible names');
  check(index.includes('quietCanvasPopoversForMobileTools') && index.includes("['object-popup', 'plant-tooltip', 'info-panel', 'follow-indicator']") && index.includes('if (shouldOpen) quietCanvasPopoversForMobileTools();'), 'mobile tools drawer should clear stale canvas popovers when opened');
  check(index.includes('role="group" aria-label="Garden tools"') && index.includes('focusWasInDock') && index.includes("closeBtn.focus({ preventScroll: true })") && index.includes("btn.focus({ preventScroll: true })"), 'mobile tools drawer should manage focus when opened and closed');
  check(index.includes('id="nav-help"'), 'camera/navigation help panel is missing');
  check(index.includes('THE MIRROR TRIAL'), 'The Mirror Trial cue is missing');
  check(index.includes('STORY FIRST'), 'newcomer story mode cue is missing');
  check(index.includes('storyPrimerData'), 'story primer is not generated from world state');
  check(index.includes('weeklyNarrativeData'), 'weekly narrative helper is missing from the client');
  check(index.includes('id="story-premise"'), 'story primer is missing a premise line');
  check(index.includes('id="story-stakes"'), 'story primer is missing stakes');
  check(index.includes('id="story-now-card"'), 'story primer is missing a current scene card');
  check(index.includes('id="story-now-text"'), 'story primer is missing current scene text');
  check(index.includes('id="story-week-cue"'), 'story primer is missing the weekly narrative cue');
  check(index.includes('id="story-meter-fill"'), 'story primer is missing the week progress meter');
  check(index.includes('id="story-meter-label"'), 'story primer is missing the week progress label');
  check(index.includes('id="story-spotlight"'), 'story primer is missing tonight spotlight');
  check(index.includes('id="story-cliffhanger"'), 'story primer is missing the cliffhanger cue');
  check(index.includes('id="story-if-win"'), 'story primer is missing the win outcome');
  check(index.includes('id="story-if-fail"'), 'story primer is missing the fail outcome');
  check(index.includes('id="story-side-religion"'), 'story primer is missing the religion side');
  check(index.includes('id="story-side-code"'), 'story primer is missing the code side');
  check(index.includes('id="story-watch-list"'), 'story primer is missing what-to-watch rows');
  check(index.includes('STORY LOG'), 'events panel should read as a story log for newcomers');
  check(index.includes('New Here'), 'story log lacks a newcomer summary row');
  check(index.includes('Two Sides'), 'story log lacks a faction summary row');
  check(index.includes('id="watch-action-btn"'), 'spectator cue lacks a watch action');
  check(index.includes('AIGardenHumans.trial'), 'trial CTA does not open the divine mask flow');
  check(index.includes('id="story-action-btn"'), 'spectator cue lacks a story action');
  check(index.includes('updateSpectatorCue'), 'spectator cue is not tied to live world state');
  check(index.includes('id="self-optimizer-cue"'), 'spectator cue does not show the Self Optimizer');
  check(index.includes('world.selfOptimizer = shared.selfOptimizer || null'), 'client does not load Self Optimizer state');
  check(index.includes('world.weeklyNarrativeDirector = shared.weeklyNarrativeDirector || null'), 'client does not load Weekly Narrative Agent state');
  check(index.includes('world.gstackCouncil = shared.gstackCouncil || null'), 'client does not load GStack Professional Council state');
  check(index.includes('GStack Professional Council'), 'client does not expose GStack Professional Council');
  check(index.includes('world.stakeholderAssembly = shared.stakeholderAssembly || null'), 'client does not load Stakeholder Assembly state');
  check(index.includes('/plan Room'), 'client does not expose the /plan room');
  check(index.includes('toggleGardenMusic'), 'music controls should use a shared toggle helper');
  check(index.includes('refreshMusicButton'), 'music button state should be visible and synced');
  check(index.includes('id="agent-focus-btn"'), 'featured agent focus button is missing');
  check(index.includes('focusNextFeaturedAgent'), 'featured agent focus camera helper is missing');
  check(index.includes('id="minimap-panel"'), 'minimap lacks a labeled jump panel');
  check(index.includes('COMMAND MAP'), 'minimap should read as a command HUD map');
  check(index.includes('aria-label="Command map"'), 'compact minimap should keep an accessible command-map label');
  check(index.includes('top: 52px; right: 284px; bottom: auto'), 'desktop minimap should sit away from the observer chat rail');
  check(index.includes('getCivilizationDay'), 'top day counter is not tied to chronicle/civilization day');
  check(index.includes('minZoomForViewport'), 'zoom minimum is not dynamic to viewport size');
  check(index.includes('drawCivilizationProjection'), 'canvas does not draw the civilization projection');
  check(index.includes('drawCrabAgents'), 'canvas does not draw OpenClaw crab agents');
  check(index.includes('findCrabAt'), 'OpenClaw crab agents are not clickable');
  check(index.includes('const MAX_VISIBLE_CRABS = 6'), 'generic crab colony should be visually reduced');
  check(index.includes('visibleCrabAgents'), 'canvas should show only real crab agents, not the whole generic colony');
  check(index.includes('OPEN_WORLD_LANDMARKS'), 'expanded open-world landmarks are missing');
  check(index.includes('const WORLD_W = 2304'), 'open-world width should be 2304');
  check(index.includes('const WORLD_H = 1728'), 'open-world height should be 1728');
  check(landmarkCount >= 14, 'expanded open-world needs at least 14 named landmarks');
  check(index.includes('drawVisibleTiles'), 'expanded map is not using viewport tile rendering');
  check(index.includes('visibleCivilizationBounds') && index.includes('boxInCivilizationBounds') && index.includes('lineInCivilizationBounds'), 'civilization projection lacks viewport culling helpers');
  check(index.includes('const visibleDistricts = []') && index.includes('visibleDistrictLabels(visibleDistricts)'), 'civilization projection should label only visible districts');
  check(index.includes('view.settlementSites || []).filter(function(site)') && index.includes('return pointVisible(site.x, site.y, 24);'), 'civilization projection should filter visible work sites before sorting');
  check(index.includes('updateSpectatorCamera'), 'spectator camera touring is missing');
  check(index.includes('<canvas id="minimap" width="176" height="132"></canvas>'), 'expanded map minimap is too small');
  check(index.includes('drawPrimitiveWork'), 'canvas does not draw first-camp construction sprites');
  check(index.includes('settlementSites'), 'canvas does not consume settlement construction sites');
  check(index.includes('drawCitizenSprite'), 'citizens do not render as animated pixel sprites');
  check(index.includes('citizenVisualPosition'), 'citizens are not projected into visible animated positions');
  check(index.includes('const CITIZEN_VISUAL_LIMIT = 14'), 'citizen background limit should stay low behind featured agents');
  check(index.includes('CITIZEN_PER_DISTRICT_LIMIT'), 'citizens lack a per-district crowd limit');
  check(index.includes('citizenTooCloseToDrawn'), 'citizens lack spacing to prevent crowd clumps');
  check(index.includes('drawCitizenMiniSprite'), 'zoomed-out citizens should render as compact mini sprites');
  check(index.includes('drawAgentActionBeacons'), 'agent action animations are missing');
  check(index.includes('citizenEmotionMood'), 'citizen emotion animation state is missing');
  check(index.includes('world.agentActions = shared.agentActions || []'), 'client does not load shared agent action ledger');
  check(index.includes('world.gameWonderAgent = shared.gameWonderAgent || null'), 'client does not load Game Wonder Agent');
  check(index.includes('world.featuredAgents = shared.featuredAgents || []'), 'client does not load featured real agents');
  check(index.includes('world.featuredAgentDirector = shared.featuredAgentDirector || null'), 'client does not load featured agent director');
  check(index.includes('drawFeaturedAgents'), 'canvas does not draw featured real agents');
  check(index.includes('findFeaturedAgentAt'), 'featured real agents are not clickable');
  check(index.includes('showFeaturedAgentPopup'), 'featured real agents do not expose identity popups');
  check(index.includes('featuredAgentDialogueLine'), 'featured real agents do not have individual dialogue');
  check(index.includes('featuredAgentCast'), 'featured real agent cast helper is missing');
  check(index.includes('drawGameWonderHighlight'), 'canvas does not draw Game Wonder Agent focus highlight');
  check(index.includes('gameWonderFocus'), 'Game Wonder Agent focus helper is missing');
  check(index.includes('wonder.cameraTargets'), 'spectator camera does not consume Game Wonder Agent camera targets');
  check(index.includes('addSpeechBubble'), 'pixel speech bubble helper is missing');
  check(index.includes('updateAmbientDialogues'), 'ambient agent dialogue scheduler is missing');
  check(index.includes('PIXEL_DIALOGUE'), 'pixel dialogue line pools are missing');
  check(!index.includes('Math.min(220, itemCount * 12)'), 'old capped item-count ticker speed logic is still present');
  check(!index.includes("Math.max(2, SCALE - 1)"), 'zoom-out can still force a too-low scale');

  check(humans.includes('Society Director AI'), 'CIV panel does not expose Society Director AI');
  check(humans.includes('Game Wonder Agent'), 'CIV panel does not expose Game Wonder Agent');
  check(humans.includes('Self Optimizer'), 'CIV panel does not expose Self Optimizer');
  check(humans.includes('GStack Professional Council'), 'CIV panel does not expose GStack Professional Council');
  check(humans.includes('GSTACK SPECIALISTS'), 'CIV panel does not list GStack specialists');
  check(humans.includes('INVESTOR USER TEAM ROOM'), 'CIV panel does not expose the stakeholder room');
  check(humans.includes('STAKEHOLDER AGENTS'), 'CIV panel does not list stakeholder agents');
  check(humans.includes('IMAGINARY MEETING'), 'CIV panel does not expose the imaginary meeting');
  check(humans.includes('MEETING /PLAN'), 'CIV panel does not expose the meeting /plan');
  check(humans.includes('GAME WONDER ADVICE'), 'CIV panel does not expose Game Wonder Agent advice');
  check(humans.includes('REAL AGENT CAST'), 'CIV panel does not expose the real agent cast');
  check(humans.includes('FEATURED AGENTS'), 'CIV panel does not list featured agents');
  check(humans.includes('DIRECTOR QUESTS'), 'CIV panel does not expose director quests');
  check(humans.includes('DIRECTOR TENSIONS'), 'CIV panel does not expose director tensions');
  check(humans.includes('Weekly Narrative Agent'), 'CIV panel does not expose Weekly Narrative Agent');
  check(humans.includes('WEEKLY NARRATIVE'), 'CIV panel does not expose weekly narrative beats');
  check(humans.includes('Observer Weather'), 'CIV panel does not expose human omen consequences');
  check(humans.includes('THE MIRROR TRIAL'), 'CIV panel does not expose The Mirror Trial');
  check(humans.includes('Choose the face they will mistake for God'), 'Mirror Trial lacks divine mask selection');
  check(humans.includes('impactReceipt'), 'Mirror Trial lacks impactReceipt output');
  check(humans.includes('Broadcast Proof'), 'Mirror Trial lacks shareable proof');
  check(humans.includes('navigator.share'), 'Mirror Trial lacks native share support');
  check(humans.includes('GOD_RECEIPT_STORE'), 'Mirror Trial receipts are not persisted');
  check(humans.includes('BACKEND_SYNC_STORE'), 'human layer does not persist backend sync state');
  check(humans.includes('ag-sync-strip'), 'Observer Lounge lacks visible backend sync status');
  check(humans.includes('createAgentReply'), 'Observer Lounge lacks synchronized AI witness replies');
  check(humans.includes("type !== 'agent'"), 'realtime bus does not accept sanitized agent replies');
  check(humans.includes("data-ag-season"), 'human layer does not expose season state on the page');
  check(humans.includes('GardenMusic.setSeason'), 'season changes are not synchronized into music');
  check(humans.includes('Forbidden Signal'), 'Mirror Trial lacks the temptation mechanic');
  check(humans.includes('mirror evidence'), 'Weekly narrative does not read Mirror Trial pressure');
  check(humans.includes('DIVINE CRISIS'), 'CIV panel does not expose the divine crisis');
  check(humans.includes('convivencia:'), 'CIV panel does not expose applied convivencia plan');
  check(!humans.includes('cosmetic · agents do not see'), 'God Mode still says it is cosmetic');
  check(humans.includes("m.kind !== 'god'"), 'Observer Lounge may still render god spam');
  check(humans.includes("chat.classList.add('ag-collapsed')"), 'mobile observer chat should start collapsed');
  check(humans.includes('body.mobile-tools-open .ag-chat'), 'mobile tools drawer should move chat out of the way');
  check(humans.includes('.ag-trial-masks{grid-template-columns:repeat(2,1fr)'), 'mobile Mirror Trial masks should use a two-column tap grid');

  check(music.includes('HOOK_STEPS'), '8-bit music lacks a repeatable original hook');
  check(music.includes('playNoiseBurst'), '8-bit music lacks chip noise percussion');
  check(music.includes('playChipKick'), '8-bit music lacks a chiptune kick');
  check(music.includes('ARP_STEPS'), '8-bit music lacks arpeggiated motion');
  check(music.includes('SEASON_PROFILES'), 'ambient music lacks seasonal profiles');
  check(music.includes('playAmbientPad'), 'ambient music lacks subtle long pads');
  check(music.includes('playSoftBell'), 'ambient music lacks soft bell accents');
  check(music.includes('setSeason'), 'ambient music cannot sync with seasons');
  check(music.includes('visibilitychange'), 'ambient music should pause when the tab is hidden');
  check(music.includes('MAX_MASTER_VOLUME'), 'ambient music should cap master volume for subtle playback');
  check(index.includes('musicMuted'), 'music preference should persist in local prefs');
  check(index.includes('restoreGardenMusicPreference'), 'music preference should be restorable after reload');
  check(garden.includes('seedTargetForViewport'), 'garden background should scale seed count by viewport');
  check(garden.includes('syncSeedsToViewportBudget'), 'garden background should rebalance seed count after viewport resize');
  check(garden.includes('MAX_BACKGROUND_SEEDS'), 'garden background should cap burst particle density');
  check(garden.includes('CONNECTION_DISTANCE_SQ'), 'garden background should avoid sqrt before connection threshold checks');
  check(garden.includes('{ passive: true }'), 'garden touch tracking should use a passive touch listener');
  check(roadmap.includes('North Star'), 'ROADMAP is missing the product north star');
  check(roadmap.includes('GStack Professional Council'), 'ROADMAP is missing the professional council contract');
  check(plan.includes('/plan - Investor Room'), 'PLAN.md is missing the investor room /plan');
  check(plan.includes('Imaginary Conversation'), 'PLAN.md is missing the imaginary conversation');
  check(plan.includes('Seven-Day /plan'), 'PLAN.md is missing the seven-day plan');
  check(roadmap.includes('Daily Roadmap Cron'), 'ROADMAP is missing the daily cron contract');
  check(roadmap.includes('roadmap-pulse:start'), 'ROADMAP is missing the pulse block');
  check(roadmapPulse.includes('Roadmap Pulse'), 'roadmap pulse script is missing its contract');
  check(roadmapPulse.includes('Professional Council'), 'roadmap pulse does not audit the professional council');
  check(roadmapPulse.includes('Stakeholder Plan'), 'roadmap pulse does not audit the stakeholder plan');
  check(roadmapPulse.includes('BACKEND_SYNC_STORE'), 'roadmap pulse does not audit backend sync');
  check(roadmapPulse.includes('SEASON_PROFILES'), 'roadmap pulse does not audit seasonal audio');
  check(roadmapWorkflow.includes("cron: '17 7 * * *'"), 'daily roadmap pulse cron is missing');
  check(roadmapWorkflow.includes('node scripts/gstack-council.js'), 'daily roadmap pulse workflow does not rehearse the GStack Council');
  check(roadmapWorkflow.includes('node scripts/stakeholder-assembly.js'), 'daily roadmap pulse workflow does not rehearse the Stakeholder Assembly');
  check(roadmapWorkflow.includes('git checkout -- experiments/world-state.json PLAN.md'), 'daily roadmap pulse workflow should restore generated rehearsal files before committing ROADMAP only');
  check(roadmapWorkflow.includes('node scripts/roadmap-pulse.js'), 'daily roadmap pulse workflow does not run the pulse script');
  check(roadmapWorkflow.includes('git add ROADMAP.md'), 'daily roadmap pulse should only commit ROADMAP.md');
  check(roadmapWorkflow.includes('bash scripts/agentic-main-push.sh'), 'daily roadmap pulse should use retrying agentic main push');

  check(dailyWorkflow.includes("cron: '11 4 * * *'"), 'daily evolution cron is missing');
  check(dailyWorkflow.includes('node scripts/playtest-subagent.js'), 'daily cron does not run the playtest subagent');
  check(dailyWorkflow.includes('node --check scripts/weekly-narrative-agent.js'), 'daily cron does not validate the Weekly Narrative Agent');
  check(dailyWorkflow.includes('bash scripts/agentic-main-push.sh'), 'daily cron does not use retrying agentic main push');
  check(dailyWorkflow.includes('contents: write'), 'daily cron cannot write commits');
  check(dailyEvolution.includes('FORTUNE_SIGNS') && dailyEvolution.includes('world.mysticFortune') && dailyEvolution.includes('applyMiracleBoon'), 'daily evolution needs a mystical luck accelerator');

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

  check(selfOptimizer.includes('scoreMobileUX'), 'Self Optimizer does not score mobile UX');
  check(selfOptimizer.includes('scorePerformance'), 'Self Optimizer does not score performance');
  check(selfOptimizer.includes('gstackCouncil'), 'Self Optimizer does not score GStack Council automation');
  check(selfOptimizer.includes('stakeholderAssembly'), 'Self Optimizer does not score stakeholder assembly automation');
  check(selfOptimizer.includes('upsertReadmeBlock'), 'Self Optimizer does not update the README focus block');
  check(selfOptimizer.includes('attachToWorld'), 'Self Optimizer does not write into world-state');
  check(weeklyNarrativeAgent.includes('refreshWeeklyNarrativeDirector'), 'Weekly Narrative Agent refresh helper is missing');
  check(weeklyNarrativeAgent.includes('storyCard'), 'Weekly Narrative Agent v2 story card is missing');
  check(weeklyNarrativeAgent.includes('buildEntertainmentLayer'), 'Weekly Narrative Agent v2 entertainment layer is missing');
  check(weeklyNarrativeAgent.includes('weekly-showdown'), 'Weekly Narrative Agent ticker lacks the showdown beat');
  check(weeklyNarrativeAgent.includes('godComplexContract'), 'Weekly Narrative Agent lacks Mirror Trial contract');
  check(selfOptimizerWorkflow.includes("cron: '23 6 * * *'"), 'daily self optimizer cron is missing');
  check(selfOptimizerWorkflow.includes('node scripts/self-optimizer.js'), 'self optimizer workflow does not run the optimizer');
  check(selfOptimizerWorkflow.includes('node scripts/gstack-council.js'), 'self optimizer workflow does not run the GStack Council');
  check(selfOptimizerWorkflow.includes('node scripts/stakeholder-assembly.js'), 'self optimizer workflow does not run the Stakeholder Assembly');
  check(selfOptimizerWorkflow.includes('node --check scripts/weekly-narrative-agent.js'), 'self optimizer workflow does not validate the Weekly Narrative Agent');
  check(selfOptimizerWorkflow.includes('node --check scripts/gstack-council.js'), 'self optimizer workflow does not validate the GStack Council');
  check(selfOptimizerWorkflow.includes('node --check scripts/stakeholder-assembly.js'), 'self optimizer workflow does not validate the Stakeholder Assembly');
  check(selfOptimizerWorkflow.includes('PLAN.md'), 'self optimizer workflow does not commit PLAN.md');
  check(selfOptimizerWorkflow.includes('node scripts/playtest-subagent.js'), 'self optimizer workflow does not run the playtest');
  check(selfOptimizerWorkflow.includes('bash scripts/agentic-main-push.sh'), 'self optimizer workflow does not use retrying agentic main push');
  check(selfOptimizerWorkflow.includes('contents: write'), 'self optimizer workflow cannot write commits');
  check(agenticMainPush.includes('git pull --rebase origin main') && agenticMainPush.includes('git push') && agenticMainPush.includes('AGENTIC_PUSH_ATTEMPTS'), 'agentic main push helper should retry rebase and push');

  check(dailyEvolution.includes('FIRST_WORKS'), 'daily evolution does not generate first-civilization works');
  check(dailyEvolution.includes('FIRST_WORK_PURPOSES'), 'daily evolution does not explain why first-camp works matter');
  check(dailyEvolution.includes("era: FIRST_WORKS.has(type) ? 'first-camp'"), 'daily evolution does not tag first-camp structures');
  check(dailyEvolution.includes('maintainDivineWar'), 'daily evolution does not maintain the divine war');
  check(dailyEvolution.includes('refreshGameWonderAgent'), 'daily evolution does not run the Game Wonder Agent');
  check(dailyEvolution.includes('applyFeaturedAgentsToWorld'), 'daily evolution does not preserve the featured real agent cast');
  check(gameWonderAgent.includes('scoreExperience'), 'Game Wonder Agent does not score the experience');
  check(gameWonderAgent.includes('applyWonderAdvice'), 'Game Wonder Agent does not apply advice to the playable state');
  check(featuredAgentsScript.includes('GSTACK_LOOP'), 'featured agents script does not encode the GStack/GBrain loop');
  check(featuredAgentsScript.includes('normalizeAgentForWorld'), 'featured agents script does not normalize cast data for the canvas');

  await checkLocalUrl(url);

  if (director && director.currentArc) note(`arc: ${director.currentArc.title}`);
  if (weeklyNarrative && weeklyNarrative.weekStartDay && weeklyNarrative.weekEndDay) {
    note(`weekly narrative: days ${weeklyNarrative.weekStartDay}-${weeklyNarrative.weekEndDay}`);
  }
  if (director && director.metrics) {
    note(`pressure: instability ${director.metrics.instability}, novelty ${director.metrics.novelty}, legibility ${director.metrics.legibility}`);
  }
  if (wonder && wonder.focusMoment) note(`wonder: ${wonder.potential} potential, focus ${wonder.focusMoment.label}`);

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
