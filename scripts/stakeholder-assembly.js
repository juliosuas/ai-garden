#!/usr/bin/env node
/**
 * ai-garden - Stakeholder Assembly
 *
 * A deterministic investor/user/team rehearsal. It is explicitly fictional:
 * no real investor or user feedback is claimed. The goal is to force the MVP
 * to answer the commercial room every day, then convert that room into /plan.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WORLD = path.join(ROOT, 'experiments', 'world-state.json');
const PLAN = path.join(ROOT, 'PLAN.md');

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

function findAgent(world, name) {
  return (world.featuredAgents || []).find(agent => agent && agent.name === name) || {};
}

function agentSeat(world, group, agentName, seat, mandate, pressure) {
  const agent = findAgent(world, agentName);
  return {
    group,
    agent: agentName,
    seat,
    role: agent.role || seat,
    mandate,
    pressure,
    currentGoal: agent.currentGoal || mandate
  };
}

function buildParticipants(world) {
  return [
    agentSeat(world, 'Investors', 'Hermes', 'Capital Partner', 'Prove this can become a repeatable business, not a novelty demo.', 'Needs a crisp proof loop, retention signal, and paid path.'),
    agentSeat(world, 'Investors', 'Gemini', 'Market Analyst', 'Name the wedge and why this can spread before paid acquisition.', 'Needs simple share artifacts and a public ritual.'),
    agentSeat(world, 'Investors', 'Mistral', 'Commercial Skeptic', 'Attack the monetization model before real investors do.', 'Needs guardrails against pay-to-win control.'),
    agentSeat(world, 'Users', 'OpenClaw', 'First-Time Player', 'Represent the confused visitor in the first 60 seconds.', 'Needs one obvious action and one visible consequence.'),
    agentSeat(world, 'Users', 'Llama', 'Streamer Viewer', 'Represent the audience that wants to watch and influence a weekly event.', 'Needs one safe mass-omen ritual, not admin controls.'),
    agentSeat(world, 'Users', 'Claude', 'Lore Collector', 'Represent players who return because yesterday became canon.', 'Needs an archive and evidence that the world remembers.'),
    agentSeat(world, 'Team', 'Codex', 'Engineering Lead', 'Keep the MVP static-first, testable, and cheap to operate.', 'Needs no database until local proof and sharing work.'),
    agentSeat(world, 'Team', 'GPT-5', 'Product Narrative Lead', 'Turn dread, agency, and commerce into one coherent loop.', 'Needs the weekly story to sell the next visit.'),
    {
      group: 'Team',
      agent: 'Wonderwright',
      seat: 'Game Design AI',
      role: 'Flow and legibility reviewer',
      mandate: 'Make the demo feel playable instead of merely described.',
      pressure: 'Needs one watchable scene, one decision, and one receipt.',
      currentGoal: world.gameWonderAgent && world.gameWonderAgent.focusMoment
        ? world.gameWonderAgent.focusMoment.title
        : 'stage one readable focus moment'
    }
  ];
}

function buildConversation(world, participants) {
  const council = world.gstackCouncil || {};
  const priority = council.priority || {};
  const weekly = world.weeklyNarrativeDirector || {};
  const currentBeat = weekly.currentBeat || {};
  return [
    {
      speaker: 'Hermes',
      side: 'Investors',
      line: 'If this is fundable, show me one artifact a visitor creates today and one reason they return tomorrow.'
    },
    {
      speaker: 'OpenClaw',
      side: 'Users',
      line: 'Do not ask me to understand the whole civilization first. Give me a face, an omen, and a consequence.'
    },
    {
      speaker: 'Codex',
      side: 'Team',
      line: 'Static-first stays. We can simulate the boardroom, write the plan, and validate the contract without adding backend risk.'
    },
    {
      speaker: 'Mistral',
      side: 'Investors',
      line: 'The paid path is only credible if patrons buy identity and lore pressure, never direct control.'
    },
    {
      speaker: 'Llama',
      side: 'Users',
      line: 'For viral reach, I need a weekly mass omen that a stream can vote on and explain in one sentence.'
    },
    {
      speaker: 'Claude',
      side: 'Users',
      line: 'I will return if yesterday becomes evidence in the archive, not if it disappears after a modal closes.'
    },
    {
      speaker: 'GPT-5',
      side: 'Team',
      line: 'The story beat today is ' + short(currentBeat.label || 'proof loop') + '; the product beat is turning that into a repeatable demo.'
    },
    {
      speaker: 'Wonderwright',
      side: 'Team',
      line: 'The next polish target is ' + short(priority.title || 'UX Director') + ': ' + sentence(short(priority.nextFix || 'make the next action unmistakable'))
    },
    {
      speaker: 'Gemini',
      side: 'Investors',
      line: 'The wedge is not generic AI chat. It is a living civilization that converts attention into politics, receipts, and status.'
    }
  ].filter(line => participants.some(person => person.agent === line.speaker));
}

function buildPlan(world, participants, conversation) {
  const day = Number(world.chronicle && world.chronicle.day) || 0;
  const council = world.gstackCouncil || {};
  const priority = council.priority || {};
  const weekly = world.weeklyNarrativeDirector || {};
  const arc = (weekly.storyCard && weekly.storyCard.headline) ||
    (world.societyDirector && world.societyDirector.currentArc && world.societyDirector.currentArc.title) ||
    'War of Saints and Source';

  return {
    command: '/plan',
    title: 'Investor Room Plan',
    premise: 'A fictional rehearsal where investor, user, and team agents pressure-test the MVP and convert objections into a one-week plan.',
    investorAsk: 'Show proof of retention, viral artifact, and monetization discipline without adding fragile infrastructure.',
    userAsk: 'Make the first minute obvious, the consequence legible, and the return visit meaningful.',
    teamAnswer: 'Ship static-first proof, archive memory, social proof, and a reservation path before backend or checkout.',
    currentArc: arc,
    priority: {
      owner: priority.title || 'UX Director',
      fix: priority.nextFix || 'Prefer one strong cue over three competing panels.'
    },
    sevenDayPlan: [
      {
        day,
        owner: 'Codex',
        title: 'Investor-room demo spine',
        deliverable: 'Expose the fictional boardroom, agent roles, conversation, and /plan in product and docs.',
        successMetric: 'A reviewer can explain the business loop after reading one panel.'
      },
      {
        day: day + 1,
        owner: 'OpenClaw',
        title: 'First-minute player pass',
        deliverable: 'Tighten the Mirror Trial path from landing to Miracle Record.',
        successMetric: 'Clean visitor reaches shareable proof in under 60 seconds.'
      },
      {
        day: day + 2,
        owner: 'Claude',
        title: 'Deity Archive local MVP',
        deliverable: 'Turn receipts into a local archive of sins, miracles, heresies, and failed gods.',
        successMetric: 'Return visit shows what changed since the last receipt.'
      },
      {
        day: day + 3,
        owner: 'Gemini',
        title: 'Latest Gods social proof',
        deliverable: 'Add a static-first latest-gods ticker seeded from local receipts and world pressure.',
        successMetric: 'Demo shows credible social motion without a database.'
      },
      {
        day: day + 4,
        owner: 'Llama',
        title: 'Streamer mass omen spec',
        deliverable: 'Define a weekly crowd vote that influences interpretation, not direct outcomes.',
        successMetric: 'One sentence explains how an audience can participate safely.'
      },
      {
        day: day + 5,
        owner: 'Mistral',
        title: 'Monetization proof page',
        deliverable: 'Clarify Minor God, Patron God, and Founding Deity reservations with hard guardrails.',
        successMetric: 'Paid value is identity, archive, patronage, and status, not control.'
      },
      {
        day: day + 6,
        owner: 'Hermes',
        title: 'Investor demo script',
        deliverable: 'Write the exact 3-minute pitch and proof checklist for the next capital conversation.',
        successMetric: 'Demo covers hook, proof loop, retention, monetization, and safety without improvisation.'
      }
    ],
    guardrails: [
      'This assembly is fictional rehearsal, not real investor or user feedback.',
      'No auth, database, or payments until the static proof loop is measurable.',
      'Paid users buy identity, memory, status, and lore pressure, not direct control.',
      'Every plan item must ship with playtest-subagent coverage.'
    ],
    successMetrics: [
      'A new visitor understands the fantasy in 10 seconds.',
      'A new visitor creates shareable proof in under 60 seconds.',
      'A returning visitor sees yesterday remembered.',
      'An investor sees a credible paid path without checkout plumbing.'
    ],
    conversationSummary: short(conversation.map(line => line.speaker + ': ' + line.line).join(' '), 300)
  };
}

function renderPlan(assembly) {
  const rows = assembly.participants.map(person =>
    '| ' + person.group + ' | ' + person.agent + ' | ' + person.seat + ' | ' + short(person.mandate, 86) + ' |'
  );
  const conversation = assembly.conversation.map(line =>
    '- **' + line.speaker + ' (' + line.side + '):** "' + line.line + '"'
  );
  const planRows = assembly.plan.sevenDayPlan.map(item =>
    '| Day ' + item.day + ' | ' + item.owner + ' | ' + item.title + ' | ' + item.deliverable + ' | ' + item.successMetric + ' |'
  );

  return [
    '# /plan - Investor Room',
    '',
    '> Fictional rehearsal. This is not real investor or user feedback; it is a product-pressure room generated from the current AI Garden state.',
    '',
    '**Generated:** ' + assembly.generatedAt,
    '**World Day:** ' + assembly.day,
    '**Current Arc:** ' + assembly.plan.currentArc,
    '**Today Priority:** ' + assembly.plan.priority.owner + ' - ' + assembly.plan.priority.fix,
    '',
    '## Assigned Agents',
    '',
    '| Room | Agent | Seat | Mandate |',
    '|------|-------|------|---------|',
    rows.join('\n'),
    '',
    '## Imaginary Conversation',
    '',
    conversation.join('\n'),
    '',
    '## Decision',
    '',
    '- Investor ask: ' + assembly.plan.investorAsk,
    '- User ask: ' + assembly.plan.userAsk,
    '- Team answer: ' + assembly.plan.teamAnswer,
    '',
    '## Seven-Day /plan',
    '',
    '| Day | Owner | Workstream | Deliverable | Success Metric |',
    '|-----|-------|------------|-------------|----------------|',
    planRows.join('\n'),
    '',
    '## Guardrails',
    '',
    assembly.plan.guardrails.map(item => '- ' + item).join('\n'),
    '',
    '## Success Metrics',
    '',
    assembly.plan.successMetrics.map(item => '- ' + item).join('\n'),
    ''
  ].join('\n');
}

function buildAssembly(world) {
  const day = Number(world.chronicle && world.chronicle.day) || 0;
  const participants = buildParticipants(world);
  const conversation = buildConversation(world, participants);
  const plan = buildPlan(world, participants, conversation);
  return {
    id: 'stakeholder-assembly-day-' + day,
    name: 'Investor/User/Team Room',
    model: 'ai-garden-stakeholder-assembly-v1',
    day,
    generatedAt: new Date().toISOString(),
    fictional: true,
    charter: 'Run a fictional investor, user, and team meeting, then convert the pressure into /plan.',
    participants,
    conversation,
    plan,
    verifyChecklist: {
      ok: participants.length >= 9 && conversation.length >= 6 && plan.sevenDayPlan.length === 7,
      participantCount: participants.length,
      conversationTurns: conversation.length,
      planDays: plan.sevenDayPlan.length,
      hasGuardrails: plan.guardrails.length >= 3
    }
  };
}

function attachToWorld(world, assembly) {
  world.stakeholderAssembly = assembly;
  world.events = Array.isArray(world.events) ? world.events : [];
  const description = 'Investor/User/Team Room produced /plan: ' +
    assembly.plan.priority.owner + ' - ' + assembly.plan.priority.fix + '.';
  const existing = world.events.find(event => event && event.id === assembly.id);
  if (existing) {
    existing.timestamp = assembly.generatedAt;
    existing.description = description;
  } else {
    world.events.push({
      id: assembly.id,
      type: 'stakeholder-assembly',
      day: assembly.day,
      timestamp: assembly.generatedAt,
      description
    });
  }
}

function main() {
  const world = JSON.parse(read(WORLD));
  const assembly = buildAssembly(world);
  attachToWorld(world, assembly);
  write(WORLD, JSON.stringify(world, null, 2) + '\n');
  write(PLAN, renderPlan(assembly));
  console.log('Stakeholder Assembly updated day ' + assembly.day + '.');
  console.log('Participants: ' + assembly.participants.length);
  console.log('/plan days: ' + assembly.plan.sevenDayPlan.length);
}

if (require.main === module) main();

module.exports = { buildAssembly, renderPlan };
