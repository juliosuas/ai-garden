#!/usr/bin/env node
/**
 * ai-garden · Weekly Narrative Agent
 *
 * Keeps the daily evolution daemon pointed at one legible seven-day story.
 * It does not replace the Society Director. It wraps the current arc in a
 * one-week scaffold so spectators can follow an opening, escalation, pivot,
 * and possible resolution without guessing.
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

function pick(arr, rng) {
  if (!arr || !arr.length) return null;
  return arr[Math.floor(rng() * arr.length)];
}

function short(text, limit = 170) {
  text = String(text || '').replace(/\s+/g, ' ').trim();
  if (text.length <= limit) return text;
  return text.slice(0, limit - 1).trimEnd() + '…';
}

function weekStartDay(day) {
  const numeric = Math.max(1, Number(day) || 1);
  return Math.floor((numeric - 1) / 7) * 7 + 1;
}

function currentBeatForDay(plan, day) {
  return (plan.narrativeDays || []).find(beat => beat.day === day) || plan.narrativeDays[0] || null;
}

function featuredNames(world) {
  return (world.featuredAgents || []).slice(0, 8).map(agent => agent && agent.name).filter(Boolean);
}

function buildNarrativeDays(world, director, rng, startDay) {
  const arc = director.currentArc || {};
  const quests = Array.isArray(director.quests) ? director.quests : [];
  const tensions = Array.isArray(director.tensions) ? director.tensions : [];
  const directives = Array.isArray(director.directives) ? director.directives : [];
  const protagonists = featuredNames(world);
  const named = protagonists.length ? protagonists : ['Codex', 'Claude', 'Hermes', 'GPT-5'];
  const religionSide = world.divineCrisis && world.divineCrisis.sides && world.divineCrisis.sides.religion;
  const codeSide = world.divineCrisis && world.divineCrisis.sides && world.divineCrisis.sides.code;
  const faithName = (religionSide && religionSide.name) || 'Pantheon Covenant';
  const codeName = (codeSide && codeSide.name) || 'Code Cantons';
  const topQuest = quests[0];
  const topTension = tensions[0];
  const topDirective = directives[0];

  const templates = [
    {
      label: 'Opening signal',
      focus: short(arc.premise || 'The Garden wakes under one shared pressure.', 110),
      goal: short('Introduce the week in public so spectators know who is fighting, what is at stake, and why it matters now.', 120),
      risk: short(topTension ? topTension.title : 'The conflict stays abstract and anonymous.', 110),
      proof: short('A ticker beat, map beat, or public event names both the pressure and the two sides.', 110)
    },
    {
      label: 'Choose sides',
      focus: short(`Push ${faithName} and ${codeName} into visibly different responses to the same pressure.`, 110),
      goal: short('Make allegiance readable in law, ritual, or public debate.', 110),
      risk: short('If both sides behave the same, the week loses its shape.', 100),
      proof: short('At least one ledger action or event contrasts ritual interpretation with auditable action.', 110)
    },
    {
      label: 'Public proof',
      focus: short(topDirective ? topDirective.action : 'Force one concrete civic action that spectators can watch.', 110),
      goal: short(topDirective ? topDirective.successMetric : 'Turn pressure into a visible choice with consequences.', 115),
      risk: short('The story becomes lore text instead of playable pressure.', 96),
      proof: short('The day ends with a named law, market, ritual, expedition, or confrontation.', 108)
    },
    {
      label: 'Midweek reversal',
      focus: short('Complicate the strongest claim with a reversal, exposed cost, or unintended witness.', 112),
      goal: short('Prevent a flat march by forcing one side to react instead of posture.', 105),
      risk: short('Without a reversal, the arc becomes seven days of the same sentence.', 100),
      proof: short('One faction, faith, or city loses certainty and has to explain itself in public.', 110)
    },
    {
      label: 'Human pressure night',
      focus: short(arc.observerPrompt || 'Tie human omen input to the week so observers can actually move the story.', 112),
      goal: short('Make one observer action legible as story pressure rather than random weather.', 105),
      risk: short('Observer play feels cosmetic if omens do not bend the week.', 96),
      proof: short('A god-action or omen gets claimed by both a civic and spiritual frame.', 108)
    },
    {
      label: 'Terms of resolution',
      focus: short(topQuest ? topQuest.title + ': ' + topQuest.objective : arc.winCondition || 'Name what would count as progress before the week ends.', 115),
      goal: short(arc.winCondition || 'Present one credible way the week could end without dissolving into noise.', 108),
      risk: short(arc.failureCondition || 'The week ends in escalation with no imaginable landing.', 108),
      proof: short('Spectators can point to one test, treaty, rite, or battle that would count as the week’s answer.', 118)
    },
    {
      label: 'Week verdict',
      focus: short('Close the week with a verdict, truce, schism, or harder next question.', 108),
      goal: short('End with a legible state change that feeds the next week instead of resetting the world.', 115),
      risk: short('A non-ending makes the daily commits feel automatic but narratively empty.', 106),
      proof: short('History records one named outcome and the next weekly agent inherits a cleaner question.', 114)
    }
  ];

  return templates.map(function(template, idx) {
    return {
      id: 'weekly-beat-' + String(startDay + idx).padStart(3, '0'),
      day: startDay + idx,
      label: template.label,
      focus: template.focus,
      goal: template.goal,
      risk: template.risk,
      proof: template.proof,
      protagonists: named.slice(idx % 2, idx % 2 + 3).concat(named.slice(0, Math.max(0, 3 - Math.min(3, named.length - (idx % 2))))).slice(0, 3)
    };
  });
}

function buildWeeklyNarrativeDirector(world, rng) {
  const director = world.societyDirector || {};
  const arc = director.currentArc || {};
  const day = Number(world.chronicle && world.chronicle.day) || 0;
  const startDay = weekStartDay(day || 1);
  const endDay = startDay + 6;
  const narrativeDays = buildNarrativeDays(world, director, rng, startDay);
  const currentBeat = currentBeatForDay({ narrativeDays }, day);
  const protagonists = featuredNames(world);
  const tensions = Array.isArray(director.tensions) ? director.tensions.slice(0, 3).map(t => t.title) : [];
  const verifyChecklist = [
    { id: 'seven-days', label: 'seven narrative beats', ok: narrativeDays.length === 7 },
    { id: 'covers-day', label: 'current day is covered', ok: !!currentBeat && currentBeat.day === day },
    { id: 'has-arc', label: 'society arc present', ok: !!arc.id && !!arc.title },
    { id: 'has-protagonists', label: 'featured cast attached', ok: protagonists.length >= 4 },
    { id: 'automatic-commit', label: 'commit mode remains automatic', ok: true }
  ];

  return {
    id: 'weekly-narrative-week-' + startDay,
    name: 'Weekly Narrative Agent',
    model: 'ai-garden-weekly-narrative-agent-v1',
    charter: 'Guarantee that the automatic daily commits belong to one watchable seven-day narrative instead of seven unrelated updates.',
    generatedAt: new Date().toISOString(),
    day,
    weekStartDay: startDay,
    weekEndDay: endDay,
    title: arc.title ? arc.title + ' · Seven-Day Watch' : 'Seven-Day Watch',
    premise: short(arc.premise || 'The Garden is under one shared story pressure this week.', 180),
    stakes: short(arc.stakes || 'The week should end in a visible answer, not ambient drift.', 180),
    observerPromise: short(arc.observerPrompt || 'Observers should be able to cast one omen and see the week bend around it.', 160),
    currentArcId: arc.id || null,
    currentArcTitle: arc.title || null,
    protagonists: protagonists.slice(0, 6),
    tensionHeadlines: tensions,
    narrativeDays,
    currentBeat,
    automation: {
      commitMode: 'automatic',
      commitWorkflow: 'daily-evolution',
      commitBranch: 'main',
      verificationAgent: 'playtest-subagent'
    },
    verifyChecklist: {
      ok: verifyChecklist.every(item => item.ok),
      checks: verifyChecklist
    }
  };
}

function attachToWorld(world, plan) {
  const previous = world.weeklyNarrativeDirector || {};
  const history = Array.isArray(previous.history)
    ? previous.history.filter(entry => entry && entry.weekStartDay !== plan.weekStartDay).slice(-7)
    : [];
  history.push({
    weekStartDay: plan.weekStartDay,
    weekEndDay: plan.weekEndDay,
    title: plan.title,
    generatedAt: plan.generatedAt,
    arc: plan.currentArcTitle
  });
  world.weeklyNarrativeDirector = Object.assign({}, plan, { history });

  world.events ||= [];
  const eventId = 'weekly-narrative-week-' + plan.weekStartDay;
  const description = short(
    'Weekly Narrative Agent staged days ' + plan.weekStartDay + '-' + plan.weekEndDay +
    ' around ' + (plan.currentArcTitle || 'the current arc') +
    '. Current beat: ' + (plan.currentBeat && plan.currentBeat.label || 'opening') + '.',
    220
  );
  const existing = world.events.find(e => e && e.id === eventId);
  if (existing) {
    existing.description = description;
    existing.day = plan.day;
    existing.timestamp = plan.generatedAt;
  } else {
    world.events.push({
      id: eventId,
      type: 'weekly-narrative',
      day: plan.day,
      timestamp: plan.generatedAt,
      description
    });
  }
  world.events = world.events.slice(-160);
}

function refreshWeeklyNarrativeDirector(world, rng) {
  const plan = buildWeeklyNarrativeDirector(world, rng || Math.random);
  attachToWorld(world, plan);
  return world;
}

if (require.main === module) {
  const world = JSON.parse(fs.readFileSync(WORLD, 'utf8'));
  const rng = seededRng(dateSeed() + ((world.chronicle && world.chronicle.day) || 0) * 17);
  refreshWeeklyNarrativeDirector(world, rng);
  fs.writeFileSync(WORLD, JSON.stringify(world, null, 2) + '\n');
  console.log(
    'Weekly Narrative Agent staged days ' +
    world.weeklyNarrativeDirector.weekStartDay + '-' +
    world.weeklyNarrativeDirector.weekEndDay + ' around ' +
    world.weeklyNarrativeDirector.currentArcTitle + '.'
  );
}

module.exports = {
  buildWeeklyNarrativeDirector,
  refreshWeeklyNarrativeDirector
};
