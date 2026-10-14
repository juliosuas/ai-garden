/* Session witnesses receive only counted world evidence and a known visual
   phenomenon. Chat, identities, receipts and development plans are excluded.
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
  var api = Object.freeze({ observe: observe, describe: describe, replyText: replyText });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GardenWitnessPerception = api;
}(typeof globalThis === 'object' ? globalThis : this));
