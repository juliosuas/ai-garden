#!/usr/bin/env node
/**
 * ai-garden · Weekly Narrative Agent v2
 *
 * Wrap the Society Director's current arc in one stable seven-day spectator
 * plan. The output must be readable in the UI, survive daily refreshes, and
 * carry a verdict or unresolved thread into the next week.
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

function short(text, limit = 170) {
  text = String(text || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= limit) return text;
  return text.slice(0, limit - 1).trimEnd() + '…';
}

function pick(arr, rng) {
  if (!arr || !arr.length) return null;
  return arr[Math.floor(rng() * arr.length)];
}

function weekStartDay(day) {
  const numeric = Math.max(1, Number(day) || 1);
  return Math.floor((numeric - 1) / 7) * 7 + 1;
}

function beatStatus(beatDay, currentDay) {
  if (beatDay < currentDay) return 'completed';
  if (beatDay === currentDay) return 'current';
  return 'upcoming';
}

function featuredNames(world) {
  return (world.featuredAgents || []).slice(0, 8).map(agent => agent && agent.name).filter(Boolean);
}

function protagonistsForBeat(names, idx) {
  const list = Array.isArray(names) && names.length ? names : ['Codex', 'Hermes', 'Claude', 'GPT-5'];
  const result = [];
  for (let i = 0; i < Math.min(3, list.length); i++) {
    result.push(list[(idx + i) % list.length]);
  }
  return result;
}

function historyEntryForDay(world, day) {
  const history = Array.isArray(world.history) ? world.history : [];
  for (let i = history.length - 1; i >= 0; i--) {
    if (Number(history[i] && history[i].day) === Number(day)) return history[i];
  }
  return null;
}

function eventHeadlineForDay(world, day) {
  const events = Array.isArray(world.events) ? world.events : [];
  for (let i = events.length - 1; i >= 0; i--) {
    if (Number(events[i] && events[i].day) === Number(day)) {
      return events[i].description || events[i].outcome || events[i].type || '';
    }
  }
  return '';
}

function evidenceForDay(world, day) {
  const history = historyEntryForDay(world, day);
  if (history) return short(history.headline || history.text || '', 150);
  const eventText = eventHeadlineForDay(world, day);
  if (eventText) return short(eventText, 150);
  return '';
}

function religionCodeSides(world) {
  const crisis = world && world.divineCrisis || {};
  const sides = crisis.sides || {};
  return {
    religionName: (sides.religion && sides.religion.name) || 'Pantheon Covenant',
    codeName: (sides.code && sides.code.name) || 'Code Cantons'
  };
}

function progressPhase(index) {
  if (index <= 1) return 'opening';
  if (index <= 3) return 'escalation';
  if (index === 4) return 'reversal';
  if (index <= 6) return 'climax';
  return 'verdict';
}

function currentBeatForDay(narrativeDays, day) {
  return (narrativeDays || []).find(beat => beat.day === day) || narrativeDays[0] || null;
}

function nextBeatAfterDay(narrativeDays, day) {
  return (narrativeDays || []).find(beat => beat.day > day) || null;
}

function buildCarryover(world, previous, startDay, currentArcTitle) {
  if (!previous) return null;
  if (Number(previous.weekStartDay) === Number(startDay) && previous.carryover) return previous.carryover;
  if (Number(previous.weekStartDay) >= Number(startDay)) return null;

  const sameArc = previous.currentArcTitle && currentArcTitle && previous.currentArcTitle === currentArcTitle;
  const lastHeadline = short(
    (historyEntryForDay(world, previous.weekEndDay) || historyEntryForDay(world, (world.chronicle && world.chronicle.day) || 0) || {}).headline ||
    '',
    150
  );
  const verdict = sameArc
    ? 'Last week ended without a clean answer, so the same conflict rolls forward under tighter pressure.'
    : 'Last week closed hard enough to hand this week a cleaner question than it started with.';

  return {
    previousWeekId: previous.id || null,
    previousWeekTitle: previous.title || 'Previous week',
    verdict,
    unresolvedThread: lastHeadline || short(previous.stakes || previous.storyCard && previous.storyCard.currentDirective || 'The prior conflict left one unresolved public argument.', 150)
  };
}

function beatTemplates(world, director) {
  const arc = director.currentArc || {};
  const tensions = Array.isArray(director.tensions) ? director.tensions : [];
  const quests = Array.isArray(director.quests) ? director.quests : [];
  const directives = Array.isArray(director.directives) ? director.directives : [];
  const sides = religionCodeSides(world);
  const topTension = tensions[0];
  const topQuest = quests[0];
  const topDirective = directives[0];

  return [
    {
      label: 'Opening signal',
      focus: short(arc.premise || 'The Garden wakes under one shared pressure.', 120),
      goal: 'Introduce the week in public with one named conflict, place, and consequence.',
      risk: short(topTension ? topTension.title : 'The conflict stays abstract and anonymous.', 110),
      proof: 'Ticker beats, HUD text, and one public event all point at the same conflict.',
      mission: 'Read the week header, then follow a named protagonist into the first pressure point.',
      outcomeHint: 'Spectators can say what the week is about in one sentence.'
    },
    {
      label: 'Choose sides',
      focus: short('Push ' + sides.religionName + ' and ' + sides.codeName + ' into visibly different readings of the same pressure.', 120),
      goal: 'Make allegiance legible through law, ritual, or public debate.',
      risk: 'If both sides behave the same, the week loses its shape.',
      proof: 'At least one event contrasts ritual interpretation with auditable action.',
      mission: 'Watch who claims authority first when the same omen becomes public.',
      outcomeHint: 'Spectators can explain the split without opening the JSON.'
    },
    {
      label: 'Public proof',
      focus: short(topDirective ? topDirective.action : 'Force one concrete civic action that spectators can watch.', 120),
      goal: short(topDirective ? topDirective.successMetric : 'Turn pressure into a visible choice with public consequences.', 118),
      risk: 'The story becomes lore text instead of playable pressure.',
      proof: 'One named law, market, ritual, expedition, or confrontation lands today.',
      mission: 'Check whether the world answered with action instead of exposition.',
      outcomeHint: 'The day produces one named proof point for the week.'
    },
    {
      label: 'Midweek reversal',
      focus: 'Complicate the strongest claim with a reversal, exposed cost, or unwanted witness.',
      goal: 'Force one side to react instead of simply repeating itself.',
      risk: 'Without reversal, seven days collapse into one loop.',
      proof: 'A faction, city, or faith loses certainty and must explain itself in public.',
      mission: 'Look for the day when confidence cracks and the week becomes harder.',
      outcomeHint: 'The week earns a middle, not just a beginning and end.'
    },
    {
      label: 'Human pressure night',
      focus: short(arc.observerPrompt || 'Tie one observer omen directly to the week.', 118),
      goal: 'Make one human action legible as story pressure rather than ambient weather.',
      risk: 'Observer play feels cosmetic if omens do not bend the week.',
      proof: 'A god-action gets claimed by both a civic and spiritual frame.',
      mission: 'Cast or inspect an omen and watch both sides translate it.',
      outcomeHint: 'Observer play becomes part of the plot, not a side channel.'
    },
    {
      label: 'Terms of resolution',
      focus: short(topQuest ? topQuest.title + ': ' + topQuest.objective : arc.winCondition || 'Name what would count as progress before the week ends.', 128),
      goal: short(arc.winCondition || 'Present one credible way the week could end without dissolving into noise.', 118),
      risk: short(arc.failureCondition || 'The week ends in escalation with no imaginable landing.', 118),
      proof: 'Spectators can point at one test, treaty, rite, or battle that would count as the week answer.',
      mission: 'Ask whether the world has defined a possible ending, not just more conflict.',
      outcomeHint: 'The week becomes arguable because its finish condition is visible.'
    },
    {
      label: 'Week verdict',
      focus: 'Close with a verdict, truce, schism, or harder next question.',
      goal: 'Leave one legible state change that feeds the next week instead of resetting the world.',
      risk: 'A non-ending makes automatic commits feel narratively empty.',
      proof: 'History records a named outcome and a next unresolved thread.',
      mission: 'Read the verdict, then see what burden the next week inherits.',
      outcomeHint: 'The next week starts from consequence, not amnesia.'
    }
  ];
}

function buildNarrativeDays(world, director, previous, startDay) {
  const day = Number(world.chronicle && world.chronicle.day) || 0;
  const templates = beatTemplates(world, director);
  const protagonists = featuredNames(world);
  const previousBeatMap = new Map();
  if (previous && Number(previous.weekStartDay) === Number(startDay) && Array.isArray(previous.narrativeDays)) {
    previous.narrativeDays.forEach(beat => previousBeatMap.set(Number(beat.day), beat));
  }

  return templates.map(function(template, idx) {
    const beatDay = startDay + idx;
    const previousBeat = previousBeatMap.get(beatDay);
    const status = beatStatus(beatDay, day);
    const evidence = evidenceForDay(world, beatDay);
    const focus = previousBeat && previousBeat.focus ? previousBeat.focus : template.focus;
    const goal = previousBeat && previousBeat.goal ? previousBeat.goal : template.goal;
    const risk = previousBeat && previousBeat.risk ? previousBeat.risk : template.risk;
    const proof = previousBeat && previousBeat.proof ? previousBeat.proof : template.proof;
    const mission = previousBeat && previousBeat.mission ? previousBeat.mission : template.mission;
    const outcomeHint = previousBeat && previousBeat.outcomeHint ? previousBeat.outcomeHint : template.outcomeHint;

    return {
      id: 'weekly-beat-' + String(beatDay).padStart(3, '0'),
      day: beatDay,
      label: previousBeat && previousBeat.label ? previousBeat.label : template.label,
      status,
      focus,
      goal,
      risk,
      proof,
      mission,
      outcomeHint,
      evidence: evidence || (status === 'upcoming' ? 'Waiting for this day to arrive.' : status === 'current' ? 'Today is still unfolding.' : 'The world moved, but did not leave a clean headline yet.'),
      protagonists: previousBeat && Array.isArray(previousBeat.protagonists) && previousBeat.protagonists.length
        ? previousBeat.protagonists.slice(0, 3)
        : protagonistsForBeat(protagonists, idx)
    };
  });
}

function buildWeekProgress(narrativeDays, currentBeat, day) {
  const currentBeatIndex = currentBeat ? Math.max(1, narrativeDays.indexOf(currentBeat) + 1) : 1;
  const completedBeats = narrativeDays.filter(beat => beat.status === 'completed').length;
  const remainingBeats = narrativeDays.filter(beat => beat.status === 'upcoming').length;
  return {
    day,
    currentBeatIndex,
    totalBeats: narrativeDays.length,
    completedBeats,
    remainingBeats,
    percent: Math.round((currentBeatIndex / Math.max(1, narrativeDays.length)) * 100),
    phase: progressPhase(currentBeatIndex)
  };
}

function buildResolution(arc, carryover) {
  return {
    successSignal: short(arc.winCondition || 'The week ends in a public answer that changes civic behavior.', 140),
    failureSignal: short(arc.failureCondition || 'The week ends with escalation and no shared interpretation.', 140),
    likelyOutcome: carryover && carryover.unresolvedThread
      ? short('The week probably hands forward one unresolved thread: ' + carryover.unresolvedThread, 160)
      : short('The week should end with a named outcome and a next burden.', 120)
  };
}

function buildStoryCard(plan) {
  const beat = plan.currentBeat || {};
  const nextBeat = plan.nextBeat || null;
  return {
    headline: 'Week ' + plan.weekStartDay + '-' + plan.weekEndDay + ' · ' + (plan.currentArcTitle || 'Seven-Day Watch'),
    summary: short(beat.focus || plan.premise, 170),
    statusLine: 'Beat ' + plan.weekProgress.currentBeatIndex + '/' + plan.weekProgress.totalBeats + ' · ' + (beat.label || 'Opening signal') + ' · ' + plan.weekProgress.phase,
    currentDirective: short(beat.goal || plan.stakes, 160),
    viewerMission: short(beat.mission || plan.observerPromise, 160),
    progressLabel: 'Week ' + plan.weekStartDay + '-' + plan.weekEndDay + ' · Beat ' + plan.weekProgress.currentBeatIndex + '/' + plan.weekProgress.totalBeats,
    nextMove: nextBeat ? short(nextBeat.label + ': ' + nextBeat.focus, 150) : 'This week is at the verdict edge.',
    carryover: plan.carryover && plan.carryover.verdict ? plan.carryover.verdict : 'This week starts clean enough to read at a glance.'
  };
}

function buildEntertainmentLayer(plan) {
  const beat = plan.currentBeat || {};
  const nextBeat = plan.nextBeat || null;
  const names = Array.isArray(beat.protagonists) && beat.protagonists.length ? beat.protagonists : (plan.protagonists || []);
  const lead = names[0] || 'Codex';
  const support = names[1] || 'Claude';
  const urgency = plan.weekProgress && plan.weekProgress.phase === 'climax'
    ? 'SHOWDOWN'
    : plan.weekProgress && plan.weekProgress.phase === 'reversal'
      ? 'TWIST'
      : plan.weekProgress && plan.weekProgress.phase === 'verdict'
        ? 'VERDICT'
        : 'BUILD';

  return {
    urgency,
    spotlight: short(lead + ' and ' + support + ' now carry ' + (beat.label || 'the current beat') + '.', 140),
    showdown: short(beat.goal || plan.stakes || 'The week still needs a public answer.', 150),
    cliffhanger: short(nextBeat ? (nextBeat.label + ' follows: ' + nextBeat.focus) : (plan.resolution && plan.resolution.likelyOutcome) || 'The next answer is almost public.', 150),
    ifWin: short(plan.resolution && plan.resolution.successSignal || 'The week lands a visible answer.', 140),
    ifFail: short(plan.resolution && plan.resolution.failureSignal || 'The conflict hardens into a worse week.', 140),
    shortWatch: short('If you only watch one thing: ' + lead + ' inside ' + (beat.label || 'this beat') + '.', 140)
  };
}

function buildTickerBeats(plan) {
  const beats = [
    {
      type: 'weekly-narrative',
      label: 'WEEK',
      text: plan.storyCard.progressLabel + ' · ' + (plan.currentBeat && plan.currentBeat.label || 'Opening signal')
    },
    {
      type: 'weekly-mission',
      label: 'MISSION',
      text: plan.storyCard.currentDirective
    },
    {
      type: 'weekly-showdown',
      label: plan.entertainment && plan.entertainment.urgency || 'SHOW',
      text: plan.entertainment && plan.entertainment.showdown || plan.entertainment && plan.entertainment.spotlight || plan.storyCard.summary
    }
  ];
  if (plan.nextBeat) {
    beats.push({
      type: 'weekly-next',
      label: 'NEXT',
      text: short(plan.nextBeat.label + ': ' + plan.nextBeat.focus, 150)
    });
  }
  return beats;
}

function buildVerifyChecklist(plan) {
  const checks = [
    { id: 'seven-days', label: 'seven narrative beats', ok: Array.isArray(plan.narrativeDays) && plan.narrativeDays.length === 7 },
    { id: 'covers-day', label: 'current day is covered', ok: !!plan.currentBeat && Number(plan.currentBeat.day) === Number(plan.day) },
    { id: 'has-arc', label: 'society arc present', ok: !!plan.currentArcId && !!plan.currentArcTitle },
    { id: 'story-card', label: 'spectator story card present', ok: !!plan.storyCard && !!plan.storyCard.headline && !!plan.storyCard.currentDirective },
    { id: 'ticker-beats', label: 'ticker beats present', ok: Array.isArray(plan.tickerBeats) && plan.tickerBeats.length >= 2 },
    { id: 'automatic-commit', label: 'commit mode remains automatic', ok: plan.automation && plan.automation.commitMode === 'automatic' }
  ];
  return {
    ok: checks.every(check => check.ok),
    checks
  };
}

function buildWeeklyNarrativeDirector(world, rng) {
  const director = world.societyDirector || {};
  const arc = director.currentArc || {};
  const previous = world.weeklyNarrativeDirector || null;
  const day = Number(world.chronicle && world.chronicle.day) || 0;
  const startDay = weekStartDay(day || 1);
  const endDay = startDay + 6;
  const protagonists = featuredNames(world);
  const carryover = buildCarryover(world, previous, startDay, arc.title || null);
  const narrativeDays = buildNarrativeDays(world, director, previous, startDay);
  const currentBeat = currentBeatForDay(narrativeDays, day);
  const nextBeat = nextBeatAfterDay(narrativeDays, day);
  const weekProgress = buildWeekProgress(narrativeDays, currentBeat, day);
  const tensionHeadlines = Array.isArray(director.tensions) ? director.tensions.slice(0, 3).map(t => t.title) : [];

  const plan = {
    id: 'weekly-narrative-week-' + startDay,
    version: 2,
    name: 'Weekly Narrative Agent',
    model: 'ai-garden-weekly-narrative-agent-v2',
    charter: 'Guarantee that the automatic daily commits belong to one watchable seven-day narrative, not seven unrelated updates.',
    generatedAt: new Date().toISOString(),
    day,
    weekStartDay: startDay,
    weekEndDay: endDay,
    title: (arc.title || 'Seven-Day Watch') + ' · Week ' + startDay + '-' + endDay,
    premise: short(arc.premise || 'The Garden is under one shared story pressure this week.', 180),
    stakes: short(arc.stakes || 'The week should end in a visible answer, not ambient drift.', 180),
    observerPromise: short(arc.observerPrompt || 'Observers should be able to cast one omen and see the week bend around it.', 160),
    currentArcId: arc.id || null,
    currentArcTitle: arc.title || null,
    protagonists: protagonists.slice(0, 6),
    tensionHeadlines,
    narrativeDays,
    currentBeat,
    nextBeat,
    weekProgress,
    carryover,
    resolution: buildResolution(arc, carryover),
    godComplexContract: {
      input: 'client impactReceipt from the God Mode Trial',
      pressureAxes: ['devotion', 'fear', 'dependency', 'resistance'],
      rule: 'Treat human impact receipts as local story pressure: agents may worship, depend, resist, or accuse the gods.'
    },
    automation: {
      commitMode: 'automatic',
      commitWorkflow: 'daily-evolution',
      commitBranch: 'main',
      verificationAgent: 'playtest-subagent'
    }
  };

  plan.storyCard = buildStoryCard(plan);
  plan.entertainment = buildEntertainmentLayer(plan);
  plan.tickerBeats = buildTickerBeats(plan);
  plan.verifyChecklist = buildVerifyChecklist(plan);
  return plan;
}

function attachToWorld(world, plan) {
  const previous = world.weeklyNarrativeDirector || {};
  const history = Array.isArray(previous.history)
    ? previous.history.filter(entry => entry && Number(entry.weekStartDay) !== Number(plan.weekStartDay)).slice(-7)
    : [];
  history.push({
    weekStartDay: plan.weekStartDay,
    weekEndDay: plan.weekEndDay,
    title: plan.title,
    generatedAt: plan.generatedAt,
    arc: plan.currentArcTitle,
    verdict: plan.carryover && plan.carryover.verdict || null
  });
  world.weeklyNarrativeDirector = Object.assign({}, plan, { history });

  world.events ||= [];
  const eventId = 'weekly-narrative-week-' + plan.weekStartDay;
  const description = short(
    'Weekly Narrative Agent v2 staged days ' + plan.weekStartDay + '-' + plan.weekEndDay +
    ' around ' + (plan.currentArcTitle || 'the current arc') +
    '. ' + plan.storyCard.statusLine + '.',
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
    'Weekly Narrative Agent v2 staged days ' +
    world.weeklyNarrativeDirector.weekStartDay + '-' +
    world.weeklyNarrativeDirector.weekEndDay + ' around ' +
    world.weeklyNarrativeDirector.currentArcTitle + '.'
  );
}

module.exports = {
  buildWeeklyNarrativeDirector,
  refreshWeeklyNarrativeDirector
};
