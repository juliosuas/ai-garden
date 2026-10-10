/* The council knows only civic observations. Development metadata, visitor
   identity, chat, omens and narrative directors never enter this view. */
(function (root) {
  'use strict';
  function active(items) {
    return (Array.isArray(items) ? items : []).filter(function (item) {
      return item && item.active !== false && item.alive !== false && item.fell !== true;
    });
  }
  function amount(value) {
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : null;
  }
  function observe(world) {
    world = world || {};
    var resources = (world.economy || {}).resources || {};
    var view = {
      day: amount((world.chronicle || {}).day) || 1,
      food: amount(resources.food),
      wood: amount(resources.wood),
      wars: active(world.wars).length,
      threats: active(world.threats).length
    };
    if (Object.prototype.hasOwnProperty.call(world.economy || {}, 'repairReserveWood')) {
      view.reserveWood = amount(world.economy.repairReserveWood);
    }
    return view;
  }
  function describe(view) {
    return 'Day ' + view.day + ': ' + view.wars + ' active conflicts; ' +
      view.threats + ' frontier warnings; food ' + (view.food === null ? 'unknown' : view.food) +
      '; wood ' + (view.wood === null ? 'unknown' : view.wood) +
      (Object.prototype.hasOwnProperty.call(view, 'reserveWood')
        ? '; repair reserve ' + (view.reserveWood === null ? 'unknown' : view.reserveWood) : '') + '.';
  }
  var api = { observe: observe, describe: describe };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GardenCouncilPerception = api;
}(typeof globalThis === 'object' ? globalThis : this));
