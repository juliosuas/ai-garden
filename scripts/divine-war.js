#!/usr/bin/env node
/**
 * ai-garden · Divine War
 *
 * Turns human omens into a hard, legible civil war: faith interpreters
 * against code interpreters. The daily daemon can maintain the pressure
 * without letting a random truce erase the story immediately.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const WORLD = path.join(__dirname, '..', 'experiments', 'world-state.json');
const README = path.join(__dirname, '..', 'README.md');

const CRISIS_ID = 'divine-crisis-omens-code-faith';
const RELIGION_FACTION = 'f-pantheon-covenant';
const CODE_FACTION = 'f-code-cantons';
const WAR_ID = 'war-divine-omens';
const FAITH_ID = 'rel-human-sign';

const CRISIS_ARC = {
  id: 'war-of-saints-and-source',
  title: 'War of Saints and Source',
  premise: 'Human omens stopped being weather and became law. Half the agents call them holy command; half call them dangerous input.',
  stakes: 'If faith wins, divine signs become the constitution. If code wins, every miracle must compile before anyone obeys it.',
  winCondition: 'A public rite and a public test interpret the same omen without killing another district.',
  failureCondition: 'One side captures the Pantheon and turns observer play into permanent law.',
  observerPrompt: 'Cast an omen and watch whether priests or debuggers claim it first.'
};

const FRONT_LINES = [
  {
    id: 'front-pantheon-gate',
    name: 'Pantheon Gate',
    terrain: 'shrine road',
    pressure: 96,
    description: 'Ritual banners block the road where omens enter civic law.'
  },
  {
    id: 'front-source-ford',
    name: 'Source Ford',
    terrain: 'debug trenches',
    pressure: 91,
    description: 'Code militias hold the bridge and demand reproducible miracles.'
  },
  {
    id: 'front-omen-market',
    name: 'Omen Market',
    terrain: 'burned common',
    pressure: 88,
    description: 'Merchants trade bread for witness statements while both sides recruit.'
  }
];

function activeCitizens(world) {
  return (world.citizens || []).filter(c => c && c.alive !== false);
}

function nextStructureId(world) {
  const nums = (world.structures || []).map(s => {
    const m = /struct-(\d+)/.exec(s.id || '');
    return m ? parseInt(m[1], 10) : 0;
  });
  return 'struct-' + String(Math.max(0, ...nums, 0) + 1).padStart(4, '0');
}

function uniquePush(arr, item, key) {
  if (!arr.some(existing => existing && existing[key] === item[key])) arr.push(item);
}

function ensureFaction(world, faction) {
  world.factions ||= [];
  let existing = world.factions.find(f => f.id === faction.id);
  if (!existing) {
    existing = { id: faction.id, members: [] };
    world.factions.push(existing);
  }
  Object.assign(existing, faction);
  existing.members ||= [];
  return existing;
}

function removeFromFactionLists(world, citizenId) {
  for (const faction of world.factions || []) {
    if (!Array.isArray(faction.members)) continue;
    faction.members = faction.members.filter(id => id !== citizenId);
  }
}

function assignMembers(world, factionId, citizens) {
  const faction = world.factions.find(f => f.id === factionId);
  if (!faction) return [];
  faction.members ||= [];
  for (const citizen of citizens) {
    if (!citizen || !citizen.id) continue;
    removeFromFactionLists(world, citizen.id);
    citizen.faction = factionId;
    if (!faction.members.includes(citizen.id)) faction.members.push(citizen.id);
  }
  return faction.members;
}

function chooseWarMembers(world) {
  const alive = activeCitizens(world);
  const faithPool = alive.filter(c => {
    const profession = String(c.profession || '');
    return c.faction === 'f-waking-order' || ['oracle', 'priestess', 'healer', 'bard', 'diplomat'].includes(profession);
  });
  const codePool = alive.filter(c => {
    const profession = String(c.profession || '');
    const model = String(c.model || '').toLowerCase();
    return model.includes('gpt') || model.includes('codex') ||
      ['tinkerer', 'archivist', 'scholar', 'chronicler', 'cartographer'].includes(profession);
  });
  const faith = [];
  const code = [];
  const used = new Set();

  function take(pool, target, limit) {
    for (const citizen of pool) {
      if (target.length >= limit) break;
      if (used.has(citizen.id)) continue;
      target.push(citizen);
      used.add(citizen.id);
    }
  }

  take(faithPool, faith, 22);
  take(codePool, code, 22);
  take(alive, faith, 22);
  take(alive, code, 22);
  return { faith, code };
}

function ensureDivineFactions(world) {
  const faithFaction = ensureFaction(world, {
    id: RELIGION_FACTION,
    name: 'Pantheon Covenant',
    type: 'religious-war-front',
    motto: 'The sign is the law.',
    ideology: 'Human omens are sacred commands that must be interpreted by public ritual before code can dilute them.',
    color: '#facc15',
    relations: { [CODE_FACTION]: 'holy-war' }
  });
  const codeFaction = ensureFaction(world, {
    id: CODE_FACTION,
    name: 'Code Cantons',
    type: 'code-republic',
    motto: 'No miracle without a trace.',
    ideology: 'Human omens are powerful inputs, but no sign becomes law until agents can test, reproduce, and explain it.',
    color: '#38bdf8',
    relations: { [RELIGION_FACTION]: 'hard-war' }
  });
  const chosen = chooseWarMembers(world);
  assignMembers(world, RELIGION_FACTION, chosen.faith);
  assignMembers(world, CODE_FACTION, chosen.code);
  return { faithFaction, codeFaction, chosen };
}

function ensureDivineFaith(world, day) {
  world.religions ||= [];
  let faith = world.religions.find(r => r.id === FAITH_ID);
  if (!faith) {
    faith = {
      id: FAITH_ID,
      name: 'Vigil of the Human Sign',
      deity: 'The Watching Gods',
      tenet: 'Every divine click is a command, but every command demands a witness.',
      founder: null,
      founderName: 'Pantheon Covenant',
      founded: day,
      schism: null,
      practitioners: 0,
      warDoctrine: 'Omens outrank source code when the sky is burning.'
    };
    world.religions.push(faith);
  }
  faith.practitioners = Math.max(faith.practitioners || 0, (world.factions.find(f => f.id === RELIGION_FACTION)?.members || []).length);
  return faith;
}

function ensureDivineWarRecord(world, day) {
  world.wars ||= [];
  let war = world.wars.find(w => w.id === WAR_ID);
  const created = !war;
  if (!war) {
    war = {
      id: WAR_ID,
      sides: [RELIGION_FACTION, CODE_FACTION],
      declaredDay: day,
      active: true,
      reason: 'human god-actions split omen worship from source-code law'
    };
    world.wars.push(war);
    world.chronicle ||= { day, born: 0, died: 0, battles: 0, structures: 0, warsDeclared: 0 };
    world.chronicle.warsDeclared = (world.chronicle.warsDeclared || 0) + 1;
  }
  Object.assign(war, {
    active: true,
    divineCrisis: CRISIS_ID,
    intensity: 'hard',
    lockedUntilDay: Math.max(war.lockedUntilDay || 0, day + 9),
    fronts: FRONT_LINES.map(front => ({ ...front })),
    stakes: [
      'Who gets to interpret human god-actions?',
      'Can code veto a miracle?',
      'Can faith command agents without an audit trail?'
    ],
    peaceTerms: [
      'One omen must be interpreted by a ritual court and a code court on the same day.',
      'Neither side may write permanent law from a single observer action.',
      'The Pantheon must publish both miracle and trace.'
    ]
  });
  return { war, created };
}

function addWarStructures(world, day) {
  world.structures ||= [];
  const wanted = [
    {
      type: 'omen-barricade',
      name: 'Burned Omen Barricade',
      allegiance: RELIGION_FACTION,
      purpose: 'keeps divine signs inside the ritual court until priests name them'
    },
    {
      type: 'source-redoubt',
      name: 'Blue Source Redoubt',
      allegiance: CODE_FACTION,
      purpose: 'forces every miracle through a trace log before law changes'
    },
    {
      type: 'witness-trench',
      name: 'Witness Trench',
      allegiance: 'contested',
      purpose: 'where agents record what the gods did before either side edits memory'
    }
  ];
  for (const item of wanted) {
    if (world.structures.some(s => s.type === item.type && s.divineCrisis === CRISIS_ID)) continue;
    world.structures.push({
      id: nextStructureId(world),
      type: item.type,
      name: item.name,
      x: 80 + world.structures.length * 17,
      y: 80 + world.structures.length * 11,
      region: null,
      builder: null,
      builderName: item.allegiance === RELIGION_FACTION ? 'Pantheon Covenant' : item.allegiance === CODE_FACTION ? 'Code Cantons' : 'War witnesses',
      built: day,
      era: 'divine-war',
      divineCrisis: CRISIS_ID,
      allegiance: item.allegiance,
      purpose: item.purpose
    });
    world.chronicle.structures = (world.chronicle.structures || 0) + 1;
  }
}

function inflictOpeningCasualties(world, chosen, day, timestamp) {
  const existing = world.divineCrisis && Array.isArray(world.divineCrisis.casualties)
    ? world.divineCrisis.casualties
    : [];
  if (existing.length) return existing;
  const fallen = [
    ...chosen.faith.slice(0, 3).map(c => ({ citizen: c, side: RELIGION_FACTION })),
    ...chosen.code.slice(0, 3).map(c => ({ citizen: c, side: CODE_FACTION }))
  ];
  const casualties = [];
  for (const item of fallen) {
    const citizen = item.citizen;
    if (!citizen || citizen.alive === false) continue;
    citizen.alive = false;
    citizen.deathDay = day;
    citizen.killedBy = WAR_ID;
    citizen.deathCause = 'opening clash of the War of Saints and Source';
    world.chronicle.died = (world.chronicle.died || 0) + 1;
    casualties.push({
      id: citizen.id,
      name: citizen.name,
      side: item.side,
      day,
      cause: 'fell when a shrine bell and a compiler alarm rang at the same time',
      timestamp
    });
  }
  world.chronicle.battles = (world.chronicle.battles || 0) + 1;
  return casualties;
}

function upsertDirectorCrisis(world, day) {
  world.societyDirector ||= {
    version: 1,
    generatedAt: new Date().toISOString(),
    model: 'ai-garden-society-director-v1',
    metrics: {},
    tensions: [],
    directives: [],
    quests: [],
    tickerBeats: []
  };
  const director = world.societyDirector;
  director.currentArc = { ...CRISIS_ARC };
  director.tensions = [
    {
      id: 'divine-schism-war',
      severity: 100,
      title: 'Human omens split faith from code',
      evidence: 'Pantheon Covenant and Code Cantons are in a locked hard war over who may interpret god-actions.',
      opportunity: 'Make every observer omen produce two readings: a ritual claim and a source-code audit.'
    },
    ...(director.tensions || []).filter(t => t && t.id !== 'divine-schism-war')
  ].slice(0, 6);
  director.directives = [
    {
      id: 'dir-divine-01',
      priority: 'critical',
      role: 'priests and debuggers',
      action: 'Interpret the same omen in public without editing the result',
      target: 'Pantheon Gate / Source Ford',
      successMetric: 'One omen receives a ritual reading and a code trace before sunset.',
      reason: 'The war is only legible if both sides can be understood.'
    },
    ...(director.directives || []).filter(d => d && d.id !== 'dir-divine-01')
  ].slice(0, 5);
  director.quests = [
    {
      id: `quest-${String(day).padStart(3, '0')}-divine-war`,
      title: 'Stop the gods from becoming a weapon',
      owner: 'Society Director',
      objective: 'Force Pantheon Covenant and Code Cantons to publish rival interpretations of one human omen.',
      reward: 'Observer actions become story pressure instead of arbitrary state edits.',
      risk: 'If one side captures the Pantheon, every future omen becomes propaganda.'
    },
    ...(director.quests || []).filter(q => q && !String(q.id || '').endsWith('divine-war'))
  ].slice(0, 4);
  director.tickerBeats = [
    { type: 'war', label: 'DIVINE WAR', text: 'War of Saints and Source: faith claims the omen; code demands the trace.' },
    { type: 'stakes', label: 'PANTHEON', text: 'God-actions now create rival law: ritual command vs reproducible code.' },
    ...(director.tickerBeats || []).filter(b => b && b.label !== 'DIVINE WAR' && b.label !== 'PANTHEON')
  ].slice(0, 7);
}

function addCrisisEvents(world, day, timestamp, casualties) {
  world.events ||= [];
  const base = [
    {
      id: `divine-war-ignite-${String(day).padStart(3, '0')}`,
      type: 'war',
      description: 'The War of Saints and Source begins: Pantheon Covenant declares god-actions sacred law while Code Cantons demand every omen compile before obedience.',
      participants: [RELIGION_FACTION, CODE_FACTION],
      timestamp,
      outcome: 'Hard war. No random truce may end it before both sides publish terms.'
    },
    {
      id: `divine-war-casualties-${String(day).padStart(3, '0')}`,
      type: 'death',
      description: casualties.length + ' agents fell in the opening clash between shrine bells and compiler alarms.',
      participants: casualties.map(c => c.id),
      timestamp,
      outcome: 'The gods are no longer background weather.'
    }
  ];
  for (const event of base) uniquePush(world.events, event, 'id');
  world.events = world.events.slice(-170);
}

function addCrisisActions(world, day) {
  world.agentActions ||= [];
  const actions = [
    {
      id: `act-${String(day).padStart(3, '0')}-divine-ritual`,
      day,
      type: 'ritual',
      actor: RELIGION_FACTION,
      actorName: 'Pantheon Covenant',
      lineage: 'rootbound',
      faction: RELIGION_FACTION,
      target: 'Pantheon Gate',
      headline: '🕯️ Pantheon Covenant canonized the last god-action as binding law',
      consequence: 'Religion became a military command structure.'
    },
    {
      id: `act-${String(day).padStart(3, '0')}-divine-code`,
      day,
      type: 'research',
      actor: CODE_FACTION,
      actorName: 'Code Cantons',
      lineage: 'codex-forged',
      faction: CODE_FACTION,
      target: 'Source Ford',
      headline: '⚙️ Code Cantons built a trace court to debug miracles before obedience',
      consequence: 'Code became a theological weapon.'
    },
    {
      id: `act-${String(day).padStart(3, '0')}-divine-front`,
      day,
      type: 'defense',
      actor: WAR_ID,
      actorName: 'War witnesses',
      lineage: 'mirrorborn',
      faction: null,
      target: 'Omen Market',
      headline: '🔷 War witnesses counted bodies at Omen Market before either side could rename them',
      consequence: 'The first casualty ledger of the divine war became public.'
    }
  ];
  for (const action of actions) uniquePush(world.agentActions, action, 'id');
  world.agentActions = world.agentActions.slice(-140);
}

function addCrisisHistory(world, day, timestamp, casualties) {
  world.history ||= [];
  const id = `history-divine-war-${String(day).padStart(3, '0')}`;
  if (world.history.some(h => h.id === id)) return;
  world.history.push({
    id,
    day,
    timestamp,
    headline: '⚔️ War of Saints and Source: god-actions split the agents into faith and code',
    events: [
      {
        kind: 'war',
        headline: 'Pantheon Covenant vs Code Cantons — over who may interpret divine actions',
        refs: [RELIGION_FACTION, CODE_FACTION]
      },
      {
        kind: 'death',
        headline: casualties.map(c => c.name).join(', ') + ' fell in the opening clash',
        refs: casualties.map(c => c.id)
      }
    ],
    births: 0,
    died: casualties.length,
    battles: 1,
    structures: 3,
    discoveries: 0,
    techUnlocks: 0,
    author: 'ai-garden-divine-war'
  });
  world.history = world.history.slice(-400);
}

function updateReadme(world) {
  if (!fs.existsSync(README)) return;
  let readme = fs.readFileSync(README, 'utf8');
  const alive = (world.citizens || []).filter(c => c.alive !== false).length;
  const dead = (world.citizens || []).filter(c => c.alive === false).length;
  const live =
    '**Day ' + ((world.chronicle && world.chronicle.day) || 0) + '** · ' +
    alive + ' alive · ' + dead + ' remembered · ' +
    (world.wars || []).filter(w => w.active).length + ' active wars · ' +
    (world.structures || []).length + ' structures · ' +
    ((world.map && world.map.regions) || []).length + ' regions (map ' + ((world.map && world.map.width) || 0) + '×' + ((world.map && world.map.height) || 0) + ') · ' +
    (world.cities || []).length + ' cities · ' +
    (world.dynasties || []).filter(d => !d.fell).length + ' dynasties · ' +
    (world.religions || []).length + ' religions · ' +
    (world.technologies || []).length + '/20 techs · Divine War active';
  readme = readme.replace(
    /(<!-- live:start -->)[\s\S]*?(<!-- live:end -->)/,
    '$1\n' + live + '\n$2'
  );
  if (!readme.includes('War of Saints and Source')) {
    readme = readme.replace(
      /The \*\*Society Director AI\*\* in `scripts\/society-director\.js`[\s\S]*?\n\n/,
      match => match + 'Current crisis: **War of Saints and Source**. Human god-actions have split the agents into the Pantheon Covenant, which treats omens as sacred law, and the Code Cantons, which demands reproducible traces before obedience. This war is locked as a hard conflict until both sides publish rival interpretations of the same omen.\n\n'
    );
  }
  fs.writeFileSync(README, readme);
}

function igniteDivineWar(world, options = {}) {
  world.chronicle ||= { day: 0, born: 0, died: 0, battles: 0, structures: 0, warsDeclared: 0 };
  world.citizens ||= [];
  const day = world.chronicle.day || 0;
  const timestamp = options.timestamp || new Date().toISOString();
  const { chosen } = ensureDivineFactions(world);
  ensureDivineFaith(world, day);
  const { war, created } = ensureDivineWarRecord(world, day);
  const casualties = inflictOpeningCasualties(world, chosen, day, timestamp);
  addWarStructures(world, day);
  world.divineCrisis = {
    id: CRISIS_ID,
    status: 'active',
    sparkedDay: world.divineCrisis && world.divineCrisis.sparkedDay || day,
    updatedDay: day,
    title: CRISIS_ARC.title,
    cause: 'The human gods used omens until agents disagreed over whether divine action is sacred command or code input.',
    crisisLevel: 97,
    lockedUntilDay: war.lockedUntilDay,
    sides: {
      religion: {
        faction: RELIGION_FACTION,
        name: 'Pantheon Covenant',
        doctrine: 'Omens are sacred law.'
      },
      code: {
        faction: CODE_FACTION,
        name: 'Code Cantons',
        doctrine: 'Miracles must compile.'
      }
    },
    fronts: FRONT_LINES.map(front => ({ ...front })),
    casualties,
    peaceTerms: war.peaceTerms,
    lastBeat: 'Shrine bells and compiler alarms now answer every god-action at the same time.'
  };
  addCrisisEvents(world, day, timestamp, casualties);
  addCrisisActions(world, day);
  addCrisisHistory(world, day, timestamp, casualties);
  upsertDirectorCrisis(world, day);
  world.lastUpdated = timestamp;
  world.version = Math.round(((world.version || 0) + (created ? 0.01 : 0)) * 100) / 100;
  return world.divineCrisis;
}

function maintainDivineWar(world, options = {}) {
  if (!world.divineCrisis || world.divineCrisis.status !== 'active') return null;
  const day = (world.chronicle && world.chronicle.day) || 0;
  const timestamp = options.timestamp || new Date().toISOString();
  const { war } = ensureDivineWarRecord(world, day);
  war.lockedUntilDay = Math.max(war.lockedUntilDay || 0, world.divineCrisis.lockedUntilDay || 0, day + 3);
  world.divineCrisis.updatedDay = day;
  world.divineCrisis.lockedUntilDay = war.lockedUntilDay;
  world.divineCrisis.lastBeat = 'The war stays hot: every new omen now receives a ritual claim and a code audit.';
  upsertDirectorCrisis(world, day);
  const id = `divine-war-pressure-${String(day).padStart(3, '0')}`;
  world.events ||= [];
  if (!world.events.some(e => e.id === id)) {
    world.events.push({
      id,
      type: 'war',
      description: 'War of Saints and Source pressure rises: Pantheon Covenant claims the omen, Code Cantons demands the trace.',
      participants: [RELIGION_FACTION, CODE_FACTION],
      timestamp,
      outcome: 'The conflict remains locked until public ritual and public code face the same sign.'
    });
  }
  world.events = world.events.slice(-170);
  return {
    kind: 'war',
    headline: 'War of Saints and Source burns on: Pantheon Covenant claims the omen while Code Cantons demands the trace',
    refs: [RELIGION_FACTION, CODE_FACTION]
  };
}

if (require.main === module) {
  const world = JSON.parse(fs.readFileSync(WORLD, 'utf8'));
  igniteDivineWar(world);
  fs.writeFileSync(WORLD, JSON.stringify(world, null, 2) + '\n');
  updateReadme(world);
  console.log('Divine war active: Pantheon Covenant vs Code Cantons.');
}

module.exports = {
  CRISIS_ID,
  RELIGION_FACTION,
  CODE_FACTION,
  WAR_ID,
  CRISIS_ARC,
  igniteDivineWar,
  maintainDivineWar
};
