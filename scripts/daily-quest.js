#!/usr/bin/env node
/**
 * AI Garden daily prophecy.
 *
 * Creates one deterministic, playable objective from the canonical world day.
 * The browser records personal completion locally; the daemon only publishes
 * the shared challenge, so humans still cannot mutate world-state directly.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const MASKS = [
  { key: 'mercy', label: 'Mercy', act: 'rain' },
  { key: 'judgment', label: 'Judgment', act: 'lightning' },
  { key: 'chaos', label: 'Chaos', act: 'comet' },
  { key: 'silence', label: 'Silence', act: 'eclipse' }
];

const OMENS = [
  { act: 'rain', label: 'Rain', verb: 'send rain across' },
  { act: 'eclipse', label: 'Eclipse', verb: 'darken' },
  { act: 'lightning', label: 'Lightning', verb: 'strike' },
  { act: 'comet', label: 'Comet', verb: 'mark' },
  { act: 'stars', label: 'Stars', verb: 'illuminate' },
  { act: 'festival', label: 'Festival', verb: 'rouse' }
];

const TITLES = [
  'The Unanswered Bell',
  'Trial of the Borrowed Sky',
  'The Saint and the Compiler',
  'Weather for Heretics',
  'The Last Honest Miracle',
  'A Sign With Two Witnesses',
  'The Dependency Test',
  'Proof Before Worship'
];

const REWARDS = [
  'Keeper of the First Sign',
  'Weather-Sworn Witness',
  'Compiler of Miracles',
  'Patron of Doubt',
  'Saint of the Return Path',
  'Archivist of Impossible Proof'
];

const JACKPOTS = [
  'Crown of the Second Miracle',
  'Hermes Magno’s Golden Error',
  'Backstage Saint of Daybreak',
  'Keeper of the Impossible Encore',
  'Two-Sign Trickster',
  'The God Who Came Back Twice'
];

const TWISTS = [
  'The believers must defend the doubters for one night.',
  'The resistance may rename your miracle before dawn.',
  'A child will repeat the sign incorrectly and start a new doctrine.',
  'The losing faction gets the final word in tomorrow’s archive.',
  'Every witness must publish one thing the omen failed to prove.',
  'The council will treat applause as suspicious evidence.'
];

const OPENINGS = [
  'Hermes Magno rings a bell nobody remembers building.',
  'Hermes Magno enters wearing a crown made from rejected patches.',
  'Hermes Magno declares the sky guilty of being predictable.',
  'Hermes Magno sells front-row seats to the end of certainty.',
  'Hermes Magno opens the archive and releases yesterday’s mistakes.',
  'Hermes Magno whispers: one miracle is faith; two is entertainment.'
];

function at(list, index) {
  return list[((index % list.length) + list.length) % list.length];
}

function clean(value, fallback) {
  const text = String(value || '').trim();
  return text ? text.slice(0, 120) : fallback;
}

function refreshDailyQuest(world) {
  const day = Number(world && world.chronicle && world.chronicle.day) || 1;
  const mask = at(MASKS, day * 7 + 3);
  const omen = OMENS.find(candidate => candidate.act === mask.act);
  const featured = (world.featuredAgents || []).filter(agent => agent && agent.name);
  const witness = at(featured, day * 13) || { name: 'Codex' };
  const crisis = world.divineCrisis || {};
  const target = clean(
    crisis.currentFlashpoint ||
    (world.weeklyNarrativeDirector && world.weeklyNarrativeDirector.currentBeat && world.weeklyNarrativeDirector.currentBeat.label),
    'the disputed garden'
  );
  const title = at(TITLES, day * 17);
  const rewardTitle = at(REWARDS, day * 19);
  const encorePool = OMENS.filter(candidate => candidate.act !== omen.act);
  const encore = at(encorePool, day * 23 + mask.key.length);
  const jackpotTitle = at(JACKPOTS, day * 29);
  const twist = at(TWISTS, day * 31);
  const opening = at(OPENINGS, day * 37);

  world.dailyQuest = {
    id: `daily-prophecy-${day}`,
    model: 'ai-garden-hermes-magno-v2',
    host: 'Hermes Magno',
    day,
    title,
    maskKey: mask.key,
    maskLabel: mask.label,
    act: omen.act,
    omenLabel: omen.label,
    target,
    witness: clean(witness.name, 'Codex'),
    objective: `Wear ${mask.label}, then ${omen.verb} ${target}.`,
    stakes: `Complete the sign before Day ${day + 1}. ${clean(witness.name, 'Codex')} will file whether you obeyed prophecy or rewrote it.`,
    rewardTitle,
    opening,
    twist,
    encoreAct: encore.act,
    encoreLabel: encore.label,
    encoreObjective: `Encore: keep the face of ${mask.label} and cast ${encore.label}.`,
    jackpotTitle,
    finale: `If both signs land, ${clean(witness.name, 'Codex')} must archive the performance as “${jackpotTitle}.”`,
    expiresAfterDay: day,
    generatedAt: clean(world.lastUpdated, `world-day-${day}`)
  };

  return world.dailyQuest;
}

module.exports = { refreshDailyQuest };

if (require.main === module) {
  const worldPath = path.join(__dirname, '..', 'experiments', 'world-state.json');
  const world = JSON.parse(fs.readFileSync(worldPath, 'utf8'));
  const quest = refreshDailyQuest(world);
  fs.writeFileSync(worldPath, JSON.stringify(world, null, 2) + '\n');
  console.log(`Hermes Magno ready: Day ${quest.day} · ${quest.title} · encore ${quest.encoreLabel}`);
}
