'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
function loadFunction(name, context) {
  const start = source.indexOf('function ' + name + '(');
  assert.ok(start >= 0, name + ' exists');
  const end = source.indexOf('\n}', start) + 2;
  vm.runInNewContext(source.slice(start, end), context);
  return context[name];
}
test('enlarged drawer map maps its visual center to the center of the world', () => {
  const context = { MC: { width: 176, height: 132, getBoundingClientRect: () => ({ width: 352, height: 264 }) },
    WORLD_W: 2304, WORLD_H: 1728, minimapZoomed: false };
  const project = loadFunction('minimapToWorld', context);
  const center = project(176, 132);
  assert.equal(center.x, 1152); assert.ok(Math.abs(center.y - 864) < 1e-9);
  const edge = project(352, 264);
  assert.equal(edge.x, 2304); assert.ok(Math.abs(edge.y - 1728) < 1e-9);
});
test('zoomed map retains the camera-centered mapping after CSS scaling', () => {
  const context = { MC: { width: 176, height: 132, getBoundingClientRect: () => ({ width: 264, height: 198 }) },
    WORLD_W: 2304, WORLD_H: 1728, minimapZoomed: true, camX: 200, camY: 100, screenW: 1200, screenH: 720, SCALE: 3 };
  const project = loadFunction('minimapToWorld', context);
  const center = project(132, 99);
  assert.equal(center.x, 400); assert.equal(center.y, 220);
});
test('quiet world suppresses unsolicited speech but retains requested character speech', () => {
  const context = { QUIET_WORLD_UI: true, speechBubbles: [], wrapPixelSpeech: text => [text] };
  const speak = loadFunction('addSpeechBubble', context);
  speak(10, 10, 'Unsolicited narration', '#fff');
  assert.equal(context.speechBubbles.length, 0);
  speak(10, 10, 'Hello', '#fff', { force: true, speakerId: 'clicked-character' });
  assert.equal(context.speechBubbles.length, 1);
  assert.equal(context.speechBubbles[0].text, 'Hello');
});
test('quiet labels preserve requested speech and can be turned back on', () => {
  let pixels = 0;
  const context = { worldLabelsVisible: false, FONT: { A: '111111111111111' }, px() { pixels++; } };
  const text = loadFunction('drawPixelText', context);
  text('AAA', 0, 0, '#fff'); assert.equal(pixels, 0);
  text('AAA', 0, 0, '#fff', true); assert.ok(pixels > 0);
  pixels = 0; context.worldLabelsVisible = true;
  text('AAA', 0, 0, '#fff'); assert.ok(pixels > 0);
});
