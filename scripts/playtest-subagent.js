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

  check(world.civilizationBrain && world.civilizationBrain.summary, 'missing civilizationBrain summary');
  check(Array.isArray(world.agentActions) && world.agentActions.length >= 12, 'agent action ledger is too thin');
  check(Array.isArray(world.lineages) && world.lineages.length >= 6, 'missing agent lineages');

  const director = world.societyDirector;
  check(director && director.currentArc, 'missing Society Director current arc');
  check(director && Array.isArray(director.tensions) && director.tensions.length >= 2, 'Society Director has too few tensions');
  check(director && Array.isArray(director.quests) && director.quests.length >= 2, 'Society Director has too few quests');
  check(director && Array.isArray(director.tickerBeats) && director.tickerBeats.length >= 3, 'Society Director has too few ticker beats');

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
  check(!index.includes('Math.min(220, itemCount * 12)'), 'old capped item-count ticker speed logic is still present');
  check(!index.includes("Math.max(2, SCALE - 1)"), 'zoom-out can still force a too-low scale');

  check(humans.includes('Society Director AI'), 'CIV panel does not expose Society Director AI');
  check(humans.includes('DIRECTOR QUESTS'), 'CIV panel does not expose director quests');
  check(humans.includes('DIRECTOR TENSIONS'), 'CIV panel does not expose director tensions');
  check(humans.includes('Observer Weather'), 'CIV panel does not expose human omen consequences');
  check(!humans.includes('cosmetic · agents do not see'), 'God Mode still says it is cosmetic');
  check(humans.includes("m.kind !== 'god'"), 'Observer Lounge may still render god spam');

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
