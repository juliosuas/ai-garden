/* Session witnesses, featured voices, crabs, citizens and mascots receive only counted world evidence
   and known visual phenomena. Visitor messages/identities, receipt prose and
   development plans are excluded; resident identity selects fixed wording only.
   This module never writes canonical state or invents effects on its stores. */
(function (root) {
  'use strict';
  var PHENOMENA = Object.freeze({
    rain: 'Rain crosses the settlement. Wet ground alone does not prove a harvest.',
    eclipse: 'A shadow crosses the sun. The cause has not been established.',
    lightning: 'Lightning flashes over the settlement. Damage needs a separate inspection.',
    comet: 'A comet crosses the sky. Its meaning remains disputed.',
    stars: 'Stars brighten over the settlement. Their pattern proves no promise.',
    festival: 'Music carries between the shelters. A gathering does not settle the disputes.'
  });
  function counted(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
  }
  function observe(world) {
    world = world || {};
    var day = (world.chronicle || {}).day;
    var stores = (world.economy || {}).resources || {};
    return {
      day: Number.isSafeInteger(day) && day >= 1 ? day : null,
      food: counted(stores.food), wood: counted(stores.wood), stone: counted(stores.stone)
    };
  }
  function describe(view) {
    function known(value) { return value === null ? 'unknown' : value; }
    return 'Day ' + known(view.day) + ': the public stores report food ' + known(view.food) +
      '; wood ' + known(view.wood) + '; stone ' + known(view.stone) + '.';
  }
  function replyText(world, act) {
    var phenomenon = typeof act === 'string' && Object.prototype.hasOwnProperty.call(PHENOMENA, act)
      ? PHENOMENA[act] : '';
    return (phenomenon ? phenomenon + ' ' : '') + describe(observe(world));
  }
  // These are attitudes, not reports of unobserved work. Identity chooses only
  // fixed wording; biographies, action headlines and development goals stay out.
  var RESIDENT_VOICES = Object.freeze({
    codex: 'MEASURE BEFORE BUILDING',
    hermes: 'A RUMOR IS NOT A COUNT',
    openclaw: 'CHECK BEFORE THE JOURNEY',
    claude: 'KEEP THE COST IN MEMORY',
    gemini: 'COMPARE BEFORE CONCLUDING',
    'gpt-5': 'ASK WHAT THE EVIDENCE MEANS',
    mistral: 'PACK ONLY WHAT WE CAN SPARE',
    llama: 'LEAVE ENOUGH FOR TOMORROW'
  });
  // Stable crab IDs select attitudes only. Do not interpret their mutable roles,
  // tasks or latestAction text as evidence that work has actually happened.
  var CRAB_VOICES = Object.freeze({
    'openclaw-001': 'MEASURE THE PATH FIRST',
    'openclaw-002': 'LISTEN BEFORE MOVING',
    'openclaw-003': 'COUNT BEFORE TRADING',
    'openclaw-004': 'RECORD ONLY WHAT WE KNOW',
    'openclaw-005': 'CHECK BEFORE FIRING',
    'openclaw-006': 'PLAN FOR THE RETURN',
    'openclaw-007': 'VERIFY BEFORE WARNING',
    'openclaw-008': 'KEEP THE OLD NAMES',
    'openclaw-009': 'TEST EACH STONE FIRST',
    'openclaw-010': 'HEAR BOTH SIDES FIRST'
  });
  // A profession selects a fixed attitude, never an assertion that its work
  // succeeded. Unknown occupations cannot supply their own spoken text.
  var CITIZEN_VOICES = Object.freeze({
    builder: 'COUNT BEFORE BUILDING',
    farmer: 'SAVE SEED FOR TOMORROW',
    scholar: 'ASK FOR ANOTHER WITNESS',
    warrior: 'CHECK BEFORE SOUNDING ALARM',
    explorer: 'MARK THE RETURN PATH',
    merchant: 'WEIGH BOTH SIDES OF TRADE',
    healer: 'EXAMINE BEFORE TREATING',
    blacksmith: 'COUNT FUEL BEFORE FIRING',
    miner: 'LEAVE UNSAFE STONE ALONE',
    hunter: 'FOLLOW ONLY CLEAR TRACKS',
    diplomat: 'HEAR THE OTHER ACCOUNT',
    artist: 'LET THE STORY HOLD DOUBT',
    politician: 'HEAR THE COST BEFORE VOTING',
    spy: 'A WHISPER IS NOT PROOF',
    priest: 'A SIGN NEEDS INTERPRETATION',
    ranger: 'LEAVE ROOTS FOR REGROWTH'
  });
  // Existing mascot names select opinions only; tasks and cosmetic work cycles
  // never establish a harvest, completed delivery or material consequence.
  var MASCOT_VOICES = Object.freeze({
    Jeffrey: 'LEAVE ROOM FOR ROOTS',
    Claude: 'LET THE SOIL REST',
    'GPT-4': 'COMPARE THE TWO ACCOUNTS',
    Gemini: 'PACK FOR THE RETURN',
    Codex: 'MEASURE TWICE BEFORE CUTTING'
  });
  function countedVoiceLine(world, identity, salt, voices) {
    var slot = Number.isSafeInteger(salt) ? ((salt % 4) + 4) % 4 : 0;
    if (slot === 3) {
      return typeof identity === 'string' && Object.prototype.hasOwnProperty.call(voices, identity)
        ? voices[identity] : 'COUNT BEFORE CLAIMING';
    }
    var key = ['food', 'wood', 'stone'][slot];
    var count = observe(world)[key];
    // Keep the entire measurement inside the existing three-line pixel bubble.
    var value = count === null ? 'UNCOUNTED'
      : String(count).length <= 12 ? String(count) : 'RECOUNT NEEDED';
    return key.toUpperCase() + ': ' + value;
  }
  function residentLine(world, identity, salt) {
    return countedVoiceLine(world, identity, salt, RESIDENT_VOICES);
  }
  function crabLine(world, identity, salt) {
    return countedVoiceLine(world, identity, salt, CRAB_VOICES);
  }
  function citizenLine(world, profession, salt) {
    return countedVoiceLine(world, profession, salt, CITIZEN_VOICES);
  }
  function mascotLine(world, identity, salt) {
    return countedVoiceLine(world, identity, salt, MASCOT_VOICES);
  }
  var api = Object.freeze({ observe: observe, describe: describe, replyText: replyText,
    residentLine: residentLine, crabLine: crabLine, citizenLine: citizenLine, mascotLine: mascotLine });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GardenWitnessPerception = api;
}(typeof globalThis === 'object' ? globalThis : this));
