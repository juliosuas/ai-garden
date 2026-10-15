/* Session witnesses and featured voices receive only counted world evidence
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
  function residentLine(world, identity, salt) {
    var slot = Number.isSafeInteger(salt) ? ((salt % 4) + 4) % 4 : 0;
    if (slot === 3) {
      return typeof identity === 'string' && Object.prototype.hasOwnProperty.call(RESIDENT_VOICES, identity)
        ? RESIDENT_VOICES[identity] : 'COUNT BEFORE CLAIMING';
    }
    var key = ['food', 'wood', 'stone'][slot];
    var count = observe(world)[key];
    // Keep the entire measurement inside the existing three-line pixel bubble.
    var value = count === null ? 'UNCOUNTED'
      : String(count).length <= 12 ? String(count) : 'RECOUNT NEEDED';
    return key.toUpperCase() + ': ' + value;
  }
  var api = Object.freeze({ observe: observe, describe: describe, replyText: replyText, residentLine: residentLine });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GardenWitnessPerception = api;
}(typeof globalThis === 'object' ? globalThis : this));
