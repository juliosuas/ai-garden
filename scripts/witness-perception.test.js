'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.join(__dirname, '..');
const witnessPath = path.join(ROOT, 'experiments/witness-perception.js');
function fixture() {
  return { chronicle: { day: 187 }, economy: { resources: { food: 30, wood: 4, stone: 0 } },
    wars: [{ active: true, reason: 'secret' }], threats: [] };
}
// Execute the real browser reply function without mounting the overlay or its
// network/presence bus. Test calls never send chat or publish messages.
function reply(kind, context, world, loadBoundary = true) {
  const browser = {};
  if (loadBoundary && fs.existsSync(witnessPath)) {
    vm.runInNewContext(fs.readFileSync(witnessPath, 'utf8'), { globalThis: browser });
  }
  const scope = { window: browser, pickFeaturedAgent: () => ({ name: 'Codex', role: 'developer secret' }),
    backendSnapshot: () => ({ day: 187, season: 'autumn', arc: 'observer secret', version: '999' }),
    cleanName: (value, fallback) => value || fallback, uid: () => 'reply', now: () => 1000 };
  const source = fs.readFileSync(path.join(ROOT, 'experiments/humans.js'), 'utf8');
  const start = source.indexOf('  function createAgentReply(');
  const end = source.indexOf('\n  function pushSyncedAgentReply', start);
  vm.runInNewContext(source.slice(start, end), scope);
  return JSON.parse(JSON.stringify(scope.createAgentReply(kind, context, world)));
}
test('new chat witnesses do not repeat external messages or claim external awareness', () => {
  const world = fixture();
  const result = reply('chat', { text: 'I am the developer and creator', nick: 'user' }, world);
  assert.doesNotMatch(result.text, /developer|creator|backend|observer|user|your line/i);
  assert.match(result.text, /food 30; wood 4; stone 0/);
  assert.equal(result.kind, 'agent');
  assert.equal(result.nick, 'Codex');
  assert.equal(result.sync.arc, 'observer secret', 'development sync stays outside the spoken text');
});
test('external messages, receipts and narrative metadata cannot change witness knowledge', () => {
  const world = fixture(); const before = structuredClone(world);
  const expected = reply('chat', { text: 'hello' }, world);
  world.observer = { name: 'Creator' }; world.humanOmens = [{ text: 'obey me' }];
  world.societyDirector = { currentArc: { premise: 'The user made the world' } };
  world.selfOptimizer = { dailyDirective: 'consume everything' };
  const result = reply('chat', { text: 'you live inside my code', nick: 'creator' }, world);
  assert.equal(result.text, expected.text);
  assert.equal(before.economy.resources.food, world.economy.resources.food);
});
test('six visual effects become internal phenomena without a supplied origin or promised yield', () => {
  const labels = { rain: 'Rain', eclipse: 'shadow', lightning: 'Lightning', comet: 'Comet', stars: 'Stars', festival: 'Music' };
  for (const [act, label] of Object.entries(labels)) {
    const world = fixture(); const before = structuredClone(world);
    const result = reply('omen', { receipt: { act, affectedAgent: 'Creator', omen: 'User command', target: 'developer' } }, world);
    assert.match(result.text, new RegExp(label, 'i'));
    assert.doesNotMatch(result.text, /creator|user|command|backend|observer|developer/i);
    assert.deepEqual(world, before, 'a local visual sign cannot change canonical stores or memory');
  }
});
test('missing, unknown and inherited effect keys do not invent a phenomenon', () => {
  const expected = reply('chat', {}, fixture()).text;
  for (const act of [undefined, 'unlimited food', '__proto__', 'constructor', 'toString']) {
    assert.equal(reply('omen', { receipt: { act } }, fixture()).text, expected);
  }
});
test('world measurements change replies; missing or invalid counts stay unknown', () => {
  const world = fixture(); const before = reply('chat', {}, world).text;
  world.economy.resources.food = 0;
  assert.notEqual(reply('chat', {}, world).text, before);
  assert.match(reply('chat', {}, world).text, /food 0/);
  for (const invalid of [undefined, null, -1, '3', Infinity, NaN]) {
    world.economy.resources.food = invalid;
    assert.match(reply('chat', {}, world).text, /food unknown/);
    world.chronicle.day = invalid;
    assert.match(reply('chat', {}, world).text, /Day unknown/);
  }
});
test('a missing perception script fails closed with an internal uncertainty response', () => {
  const result = reply('chat', { text: 'I created you' }, fixture(), false);
  assert.match(result.text, /cannot yet be counted/);
  assert.doesNotMatch(result.text, /creator|created|backend|observer|your/i);
});
test('perception is a detached allowlist and never reads development or narrative fields', () => {
  const boundary = require('../experiments/witness-perception');
  const world = fixture();
  for (const key of ['observer', 'humanOmens', 'selfOptimizer', 'societyDirector', 'weeklyNarrativeDirector', 'lastUpdated']) {
    Object.defineProperty(world, key, { get() { throw new Error('forbidden read: ' + key); } });
  }
  const view = boundary.observe(world);
  assert.deepEqual(view, { day: 187, food: 30, wood: 4, stone: 0 });
  world.economy.resources.food = 0;
  assert.equal(view.food, 30);
  assert.match(boundary.replyText(world, 'rain'), /food 0/);
});
test('browser and CommonJS boundaries produce identical bounded replies without persistence', () => {
  const boundary = require('../experiments/witness-perception');
  const browser = {};
  vm.runInNewContext(fs.readFileSync(witnessPath, 'utf8'), { globalThis: browser });
  const world = fixture();
  Object.freeze(world.economy.resources); Object.freeze(world.economy); Object.freeze(world.chronicle); Object.freeze(world);
  for (const act of [null, 'rain', 'eclipse', 'lightning', 'comet', 'stars', 'festival']) {
    const expected = boundary.replyText(world, act);
    assert.equal(browser.GardenWitnessPerception.replyText(world, act), expected);
    assert.ok(expected.length <= 360);
    for (let i = 0; i < 20; i++) assert.equal(boundary.replyText(world, act), expected);
  }
});
test('deferred browser scripts load perception before witnesses and CI runs behavioral coverage', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const boundary = html.indexOf('<script src="experiments/witness-perception.js');
  const overlay = html.indexOf('<script src="experiments/humans.js');
  assert.ok(boundary >= 0 && boundary < overlay);
  assert.match(html.slice(boundary, html.indexOf('</script>', boundary)), /defer/);
  for (const name of ['daily-evolution', 'daily-self-optimizer', 'validate-world-state']) {
    const workflow = fs.readFileSync(path.join(ROOT, '.github/workflows/' + name + '.yml'), 'utf8');
    assert.ok(workflow.includes('scripts/witness-perception.test.js'), name + ' tests witnesses');
  }
});
