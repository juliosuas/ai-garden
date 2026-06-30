#!/usr/bin/env node
/**
 * ai-garden - Roadmap Pulse
 *
 * Deterministic daily product pulse for ROADMAP.md. It does not mutate the
 * simulation. It checks whether the current product loop still supports the
 * roadmap, then refreshes one compact status block.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ROADMAP = path.join(ROOT, 'ROADMAP.md');
const WORLD = path.join(ROOT, 'experiments', 'world-state.json');
const PLAN = path.join(ROOT, 'PLAN.md');
const HUMANS = path.join(ROOT, 'experiments', 'humans.js');
const MUSIC = path.join(ROOT, 'experiments', 'music.js');
const INDEX = path.join(ROOT, 'index.html');
const PLAYTEST = path.join(ROOT, 'scripts', 'playtest-subagent.js');
const SELF_OPTIMIZER = path.join(ROOT, 'scripts', 'self-optimizer.js');
const GSTACK_COUNCIL = path.join(ROOT, 'scripts', 'gstack-council.js');
const STAKEHOLDER_ASSEMBLY = path.join(ROOT, 'scripts', 'stakeholder-assembly.js');
const WORKFLOW = path.join(ROOT, '.github', 'workflows', 'daily-roadmap-pulse.yml');

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function write(file, value) {
  fs.writeFileSync(file, value);
}

function short(text, limit = 120) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) return clean;
  return clean.slice(0, limit - 1).trimEnd() + '.';
}

function check(label, ok, why) {
  return { label, ok: !!ok, why };
}

function seasonForDay(day) {
  const seasons = ['spring', 'summer', 'autumn', 'winter'];
  return seasons[Math.floor((Number(day) || 0) % 28 / 7)] || 'spring';
}

function buildPulse() {
  const roadmap = read(ROADMAP);
  const world = JSON.parse(read(WORLD));
  const plan = read(PLAN);
  const humans = read(HUMANS);
  const music = read(MUSIC);
  const index = read(INDEX);
  const playtest = read(PLAYTEST);
  const selfOptimizer = read(SELF_OPTIMIZER);
  const gstackCouncilScript = read(GSTACK_COUNCIL);
  const stakeholderAssemblyScript = read(STAKEHOLDER_ASSEMBLY);
  const workflow = read(WORKFLOW);
  const day = Number(world.chronicle && world.chronicle.day) || 0;
  const weekly = world.weeklyNarrativeDirector || {};
  const optimizer = world.selfOptimizer || {};
  const council = world.gstackCouncil || {};
  const assembly = world.stakeholderAssembly || {};
  const arc = short(
    weekly.arcTitle ||
    (world.societyDirector && world.societyDirector.currentArc && world.societyDirector.currentArc.title) ||
    (world.divineCrisis && world.divineCrisis.name) ||
    'War of Saints and Source',
    80
  );

  const contracts = [
    check('Mirror Trial', humans.includes('Choose the face they will mistake for God') && humans.includes('Miracle Record'), 'first action produces proof'),
    check('Observer Lounge', humans.includes('ag-chat') && humans.includes('createAgentReply'), 'chat produces an AI witness reply'),
    check('Backend Sync', humans.includes('BACKEND_SYNC_STORE') && humans.includes('ag-sync-strip'), 'human actions show day, arc, and season'),
    check('Seasonal Audio', music.includes('SEASON_PROFILES') && music.includes('playAmbientPad') && music.includes('setSeason') && music.includes('MAX_MASTER_VOLUME'), 'ambient bed follows season and stays subtle'),
    check('Mobile Safety', humans.includes("chat.classList.add('ag-collapsed')") && index.includes('mobile-tools-open'), 'panels stay out of the way'),
    check('Daily QA', playtest.includes('BACKEND_SYNC_STORE') && selfOptimizer.includes('seasonal ambient'), 'tests protect the loop'),
    check('Professional Council', council.model === 'ai-garden-gstack-council-v1' && Array.isArray(council.specialists) && council.specialists.length >= 10 && gstackCouncilScript.includes('Trust And Safety Lead'), 'each product area has a named specialist'),
    check('Stakeholder Plan', assembly.model === 'ai-garden-stakeholder-assembly-v1' && plan.includes('/plan - Investor Room') && stakeholderAssemblyScript.includes('Fictional rehearsal'), 'investor, user, and team pressure becomes /plan'),
    check('Roadmap Cron', workflow.includes("cron: '17 7 * * *'") &&
      workflow.includes('node scripts/gstack-council.js') &&
      workflow.includes('node scripts/stakeholder-assembly.js') &&
      workflow.includes('git checkout -- experiments/world-state.json PLAN.md') &&
      workflow.includes('node scripts/roadmap-pulse.js'), 'daily roadmap pulse is scheduled and rehearses upstream rooms')
  ];
  const passing = contracts.filter(item => item.ok).length;
  const next = optimizer.focus && optimizer.focus.nextAction
    ? optimizer.focus.nextAction
    : 'run one clean mobile proof-loop demo before adding new systems';
  const focus = passing === contracts.length ? 'Phase 1 proof loop polish' : 'Repair roadmap contract gaps';
  const status = passing === contracts.length ? 'healthy' : 'needs attention';
  const generated = new Date().toISOString();

  const lines = [
    '<!-- roadmap-pulse:start -->',
    '**Roadmap Pulse** - Day ' + day +
      ' - ' + passing + '/' + contracts.length + ' contracts ' + status +
      ' - season: ' + seasonForDay(day) +
      ' - arc: ' + arc,
    '',
    '- Focus: ' + focus + '.',
    '- Next: ' + short(next, 150),
    '- Generated: ' + generated,
    '',
    '| Contract | Status | Why |',
    '|----------|--------|-----|'
  ];
  for (const item of contracts) {
    lines.push('| ' + item.label + ' | ' + (item.ok ? 'OK' : 'FAIL') + ' | ' + item.why + ' |');
  }
  lines.push('<!-- roadmap-pulse:end -->');

  return {
    roadmap,
    block: lines.join('\n')
  };
}

function upsertBlock(roadmap, block) {
  const re = /<!-- roadmap-pulse:start -->[\s\S]*?<!-- roadmap-pulse:end -->/;
  if (re.test(roadmap)) return roadmap.replace(re, block);
  return roadmap.trimEnd() + '\n\n' + block + '\n';
}

function main() {
  const pulse = buildPulse();
  const next = upsertBlock(pulse.roadmap, pulse.block);
  if (next !== pulse.roadmap) {
    write(ROADMAP, next.endsWith('\n') ? next : next + '\n');
  }
  console.log('Roadmap pulse updated.');
}

main();
