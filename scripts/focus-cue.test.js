'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
function load(input) {
  const nodes = Object.fromEntries(['follow-indicator', 'follow-name'].map(id => [id, { style: {}, textContent: '' }]));
  const timers = new Map(); let nextTimer = 0; let fallback = 0;
  const scope = { world: input, screenW: 1200, screenH: 720, SCALE: 3, WORLD_W: 2304, WORLD_H: 1728,
    navTargetX: null, navTargetY: null, navAnimating: false, cameraState: 'FREE', followingMascot: null,
    userControlledCamera: false, wonderFocusTimeout: null,
    speechBubbles: [{ text: 'FOOD: 30', life: 100 }],
    document: { getElementById: id => nodes[id] },
    addSpeechBubble: () => { throw new Error('camera prose reached inhabitant speech'); },
    focusNextFeaturedAgent: () => { fallback++; },
    setTimeout: callback => { timers.set(++nextTimer, callback); return nextTimer; },
    clearTimeout: id => timers.delete(id) };
  for (const name of ['gameWonderFocus', 'smoothNavigateTo', 'focusGameWonderMoment']) {
    const start = html.indexOf('function ' + name + '(');
    vm.runInNewContext(html.slice(start, html.indexOf('\n}', start) + 2), scope);
  }
  return { scope, nodes, timers, fallback: () => fallback };
}
function world() {
  return { chronicle: { day: 193 }, gameWonderAgent: { focusMoment: {
    x: 800, y: 600, radius: 42, label: 'FRONT', title: 'The developer asks the observer to inspect this scene'
  } }, history: [{ day: 192, events: ['untouched'] }] };
}
test('real Watch navigation displays camera prose only in interface text', () => {
  const input = world(); const before = structuredClone(input); const { scope, nodes } = load(input);
  scope.focusGameWonderMoment();
  assert.equal(nodes['follow-name'].textContent, 'Watch · FRONT — ' + input.gameWonderAgent.focusMoment.title);
  assert.equal(nodes['follow-indicator'].style.display, 'block');
  assert.equal(scope.navTargetX, 600); assert.equal(scope.navTargetY, 480);
  assert.equal(scope.cameraState, 'SMOOTH_NAV'); assert.equal(scope.userControlledCamera, true);
  assert.equal(scope.followingMascot, null);
  assert.deepEqual(scope.speechBubbles, [{ text: 'FOOD: 30', life: 100 }]);
  assert.deepEqual(input, before);
});
test('camera text is bounded, normalized and assigned as literal text', () => {
  const input = world(); input.gameWonderAgent.focusMoment.title = '  <img onerror=alert(1)>\n' + 'x'.repeat(1000);
  const { scope, nodes } = load(input); scope.focusGameWonderMoment();
  const text = nodes['follow-name'].textContent;
  assert.ok(text.length <= 160); assert.ok(text.includes('<img onerror=alert(1)>'));
  assert.doesNotMatch(text, /\n/); assert.equal(nodes['follow-name'].innerHTML, undefined);
});
test('repeated Watch replaces the pending expiry without growing speech or state', () => {
  const input = world(); const before = structuredClone(input); const { scope, timers, nodes } = load(input);
  for (let i = 0; i < 100; i++) scope.focusGameWonderMoment();
  assert.equal(timers.size, 1); assert.equal(scope.speechBubbles.length, 1);
  [...timers.values()][0](); assert.equal(nodes['follow-indicator'].style.display, 'none');
  assert.deepEqual(input, before);
});
test('expiry cannot hide a newer spotlight or a followed inhabitant', () => {
  for (const mode of ['spotlight', 'following']) {
    const { scope, nodes, timers } = load(world()); scope.focusGameWonderMoment();
    if (mode === 'spotlight') nodes['follow-name'].textContent = 'Spotlight · Codex';
    else { scope.followingMascot = { name: 'Codex' }; scope.cameraState = 'FOLLOWING'; }
    [...timers.values()][0](); assert.equal(nodes['follow-indicator'].style.display, 'block');
  }
});
test('missing or invalid focus keeps existing fallback and cancels old expiry', () => {
  for (const value of [null, { x: 'bad', y: 0 }, { x: 0, y: Infinity }]) {
    const input = world(); const { scope, timers } = load(input); scope.focusGameWonderMoment();
    input.gameWonderAgent.focusMoment = value; scope.focusGameWonderMoment();
    assert.equal(timers.size, 0); assert.equal(scope.cameraState, 'SMOOTH_NAV');
    assert.equal(scope.speechBubbles.length, 1);
  }
  const view = load({}); view.scope.focusGameWonderMoment(); assert.equal(view.fallback(), 1);
});
test('missing title remains a useful camera label and never invents an utterance', () => {
  const input = world(); delete input.gameWonderAgent.focusMoment.title;
  const { scope, nodes } = load(input); scope.focusGameWonderMoment();
  assert.equal(nodes['follow-name'].textContent, 'Watch · FRONT');
});
test('canonical focus navigation does not mutate history, resources or resident memory', () => {
  const input = JSON.parse(fs.readFileSync(path.join(ROOT, 'experiments/world-state.json'), 'utf8'));
  const before = JSON.stringify(input); const { scope } = load(input);
  scope.focusGameWonderMoment(); assert.equal(JSON.stringify(input), before);
});
