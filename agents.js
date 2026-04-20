/* =============================================================
   AI GARDEN · v115 — The Agent Awakening (polish pass)
   agents.js — living pixel-agent world.

   What's in this file, in order of what you see on screen:

     1.  Scene layers: hills, trees, grass blades that wave,
         fireflies, drifting dust, a sky gradient that cycles
         through dawn/day/dusk/night.
     2.  Agents: articulated pixel humans (head, torso,
         swinging arms, stepping legs) with depth-based scaling,
         blinking eyes, a shadow that tracks their feet.
     3.  Conversations: when two free agents meet, they stop,
         face each other, and exchange 3–5 speech bubbles over
         ~5 seconds before bowing and parting.
     4.  Subagent tasks: a subagent is spawned with a concrete
         job (PLANT / BUILD / DELIVER / SCOUT). It walks to the
         target, shows a progress bar, and the outcome is left
         on the scene: a flower that sprouts, a small brick
         tower, a delivered package, a scout flag.
     5.  Broadcast network: a canvas overlay draws glowing
         curves between speaker and target while a message
         packet animates along the line. The side panel keeps
         the text log.
     6.  Collective Consciousness meter — rises with activity,
         decays at rest, and on thresholds triggers the three
         emergent events (SWARM, BLOOM, DISCOVERY) with visible
         set-pieces that pause the rest of the Village.
     7.  Visitor spawn: window.AIGardenSpawn(name) drops a
         named agent into the live Village.

   Every string that could carry user data is written with
   textContent or setAttribute. innerHTML is never used on
   untrusted input.
   ============================================================= */

(function () {
  'use strict';

  // ─────────────────── CONFIG ───────────────────
  var MAX_AGENTS = 42;
  var CONVO_RADIUS = 36;
  var CONVO_COOLDOWN_MS = 11000;
  var CONVO_DURATION_MS = 5200;
  var SUBAGENT_TASK_CHANCE = 0.008;    // per frame per agent
  var SUBAGENT_TASK_MAX = 8;           // concurrent
  var BROADCAST_MAX = 60;
  var BROADCAST_FEED_LIMIT = 30;
  var BROADCAST_INTERVAL_MS = 2400;
  var CONSCIOUSNESS_DECAY = 0.006;
  var EVENT_COOLDOWN_MS_MIN = 18000;
  var EVENT_COOLDOWN_MS_MAX = 36000;
  var SVG_NS = 'http://www.w3.org/2000/svg';

  // ─────────────────── MODEL LINEAGE ───────────────────
  var LINEAGE = {
    claude:  { aura: '#f97316', shirt: '#c2410c', name: 'Claude-class',  glyph: 'C' },
    gpt:     { aura: '#10b981', shirt: '#047857', name: 'GPT-class',     glyph: 'G' },
    gemini:  { aura: '#3b82f6', shirt: '#1d4ed8', name: 'Gemini-class',  glyph: 'Γ' },
    codex:   { aura: '#a855f7', shirt: '#6b21a8', name: 'Codex-class',   glyph: '{}' },
    llama:   { aura: '#06b6d4', shirt: '#0e7490', name: 'Llama-class',   glyph: 'λ' },
    mistral: { aura: '#eab308', shirt: '#a16207', name: 'Mistral-class', glyph: 'M' },
    local:   { aura: '#94a3b8', shirt: '#475569', name: 'Local-class',   glyph: '○' },
    hybrid:  { aura: '#ec4899', shirt: '#9d174d', name: 'Hybrid-class',  glyph: '∞' },
    unknown: { aura: '#64748b', shirt: '#334155', name: 'Unaligned',     glyph: '?' }
  };
  function lineageFor(m) {
    m = String(m || '').toLowerCase();
    if (/claude|opus|sonnet|haiku/.test(m)) return 'claude';
    if (/gpt|4o|o1|o3/.test(m)) return 'gpt';
    if (/gemini|bard/.test(m)) return 'gemini';
    if (/codex/.test(m)) return 'codex';
    if (/llama|meta/.test(m)) return 'llama';
    if (/mistral|mixtral/.test(m)) return 'mistral';
    if (/local|phi|qwen|gemma/.test(m)) return 'local';
    if (/hybrid|multi/.test(m)) return 'hybrid';
    return 'unknown';
  }

  var SKIN = ['#fde2c4', '#f5c69a', '#d9996b', '#a96b3e', '#7a4820', '#5c3110'];
  var HAIR = ['#1a1210', '#3b2418', '#6b4226', '#a66b3a', '#c89a4b', '#d9c07a', '#e0e0e0', '#212a3a'];
  var PANTS = ['#1f2937', '#334155', '#422006', '#3f3f46', '#1e3a8a', '#134e4a'];

  // ─────────────────── UTILS ───────────────────
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr, seed) { return arr[Math.abs(seed | 0) % arr.length]; }
  function hash(s) { var h = 0; s = String(s || ''); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function svg(name, attrs) {
    var el = document.createElementNS(SVG_NS, name);
    if (attrs) for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }
  function divEl(cls) { var d = document.createElement('div'); if (cls) d.className = cls; return d; }

  // ─────────────────── SCENE LAYERS ───────────────────
  function buildScene(village) {
    var vw = village.clientWidth || 900;
    var vh = village.clientHeight || 340;

    // Remove any legacy ground element so our richer layers take over.
    var oldGround = village.querySelector('.village-ground');
    if (oldGround) oldGround.style.display = 'none';

    // Hills (parallax): 3 SVG paths stacked.
    var hills = svg('svg', { 'class': 'ah-hills', viewBox: '0 0 900 200', preserveAspectRatio: 'none' });
    hills.appendChild(svg('path', {
      d: 'M0 180 Q 120 110 240 140 T 480 130 T 720 150 T 900 135 L 900 200 L 0 200 Z',
      fill: 'rgba(30,41,59,0.7)'
    }));
    hills.appendChild(svg('path', {
      d: 'M0 188 Q 150 140 280 160 T 540 150 T 800 170 T 900 155 L 900 200 L 0 200 Z',
      fill: 'rgba(17,24,39,0.8)'
    }));
    hills.appendChild(svg('path', {
      d: 'M0 195 Q 100 170 250 180 T 500 178 T 780 188 T 900 180 L 900 200 L 0 200 Z',
      fill: 'rgba(8,11,18,0.95)'
    }));
    village.appendChild(hills);

    // Distant tiny trees (static)
    var trees = svg('svg', { 'class': 'ah-trees', viewBox: '0 0 900 80', preserveAspectRatio: 'none' });
    for (var t = 0; t < 14; t++) {
      var tx = 40 + t * 62 + rand(-12, 12);
      var th = rand(14, 22);
      trees.appendChild(svg('rect', { x: tx - 1, y: 70 - th * 0.3, width: 2, height: th * 0.4, fill: '#3b2f1e' }));
      trees.appendChild(svg('circle', { cx: tx, cy: 70 - th * 0.6, r: th * 0.45, fill: 'rgba(20,40,25,0.9)' }));
    }
    village.appendChild(trees);

    // Grass blades (waving)
    var grass = divEl('ah-grass');
    village.appendChild(grass);
    for (var g = 0; g < 72; g++) {
      var blade = divEl('ah-blade');
      blade.style.left = (g / 72 * 100 + rand(-0.6, 0.6)) + '%';
      blade.style.height = rand(6, 14) + 'px';
      blade.style.setProperty('--hue', Math.floor(rand(90, 140)));
      blade.style.animationDelay = rand(0, 2.5) + 's';
      blade.style.animationDuration = rand(2.4, 4.2) + 's';
      grass.appendChild(blade);
    }

    // Fireflies
    var fliesLayer = divEl('ah-fireflies');
    village.appendChild(fliesLayer);
    for (var f = 0; f < 22; f++) {
      var fly = divEl('ah-fly');
      fly.style.left = rand(2, 98) + '%';
      fly.style.top = rand(10, 78) + '%';
      fly.style.animationDuration = rand(6, 14) + 's';
      fly.style.animationDelay = rand(0, 5) + 's';
      fliesLayer.appendChild(fly);
    }

    // Dust motes
    var dust = divEl('ah-dust');
    village.appendChild(dust);
    for (var m = 0; m < 30; m++) {
      var p = divEl('ah-mote');
      p.style.left = rand(0, 100) + '%';
      p.style.top = rand(20, 88) + '%';
      p.style.animationDuration = rand(8, 18) + 's';
      p.style.animationDelay = rand(0, 6) + 's';
      dust.appendChild(p);
    }

    // Canvas for network lines (draws above scene, below agents)
    var canvas = document.createElement('canvas');
    canvas.className = 'ah-net';
    canvas.width = vw * devicePixelRatio;
    canvas.height = vh * devicePixelRatio;
    canvas.style.width = vw + 'px';
    canvas.style.height = vh + 'px';
    village.appendChild(canvas);
    var netCtx = canvas.getContext('2d');
    netCtx.scale(devicePixelRatio, devicePixelRatio);

    // Agent/task layer
    var layer = divEl('ah-layer');
    village.appendChild(layer);

    // Sky/darken overlay for discovery events
    var dim = divEl('ah-dim');
    village.appendChild(dim);

    return { village: village, vw: vw, vh: vh, layer: layer, canvas: canvas, netCtx: netCtx, dim: dim };
  }

  // ─────────────────── PIXEL HUMAN ───────────────────
  function buildHuman(opts) {
    var root = svg('svg', {
      'class': 'ah-svg', viewBox: '0 0 28 44', 'shape-rendering': 'crispEdges'
    });

    // Shadow (drawn on main DOM separately but also a bottom ellipse for depth)
    root.appendChild(svg('ellipse', {
      'class': 'ah-foot-shadow', cx: 14, cy: 40, rx: 8, ry: 1.6,
      fill: '#000', opacity: 0.4
    }));

    // Aura
    root.appendChild(svg('ellipse', {
      'class': 'ah-aura', cx: 14, cy: 38, rx: 11, ry: 3,
      fill: opts.aura, opacity: 0.28
    }));

    // Back leg
    var legBack = svg('g', { 'class': 'ah-leg ah-leg-back' });
    legBack.appendChild(svg('rect', { x: 12, y: 28, width: 4, height: 10, fill: opts.pants, stroke: '#000', 'stroke-width': 0.6 }));
    legBack.appendChild(svg('rect', { x: 11, y: 37, width: 6, height: 3, fill: '#1a1210', stroke: '#000', 'stroke-width': 0.6 }));
    root.appendChild(legBack);

    // Back arm
    var armBack = svg('g', { 'class': 'ah-arm ah-arm-back' });
    armBack.appendChild(svg('rect', { x: 6, y: 16, width: 3.5, height: 10, fill: opts.shirt, stroke: '#000', 'stroke-width': 0.6 }));
    armBack.appendChild(svg('rect', { x: 6, y: 25, width: 3.5, height: 3, fill: opts.skin, stroke: '#000', 'stroke-width': 0.6 }));
    root.appendChild(armBack);

    // Torso + belt
    root.appendChild(svg('rect', { 'class': 'ah-torso', x: 9, y: 15, width: 10, height: 14, fill: opts.shirt, stroke: '#000', 'stroke-width': 0.7 }));
    root.appendChild(svg('rect', { x: 9, y: 26, width: 10, height: 1.6, fill: '#000', opacity: 0.35 }));
    var glyphT = svg('text', { 'class': 'ah-glyph', x: 14, y: 23.8, 'text-anchor': 'middle', 'font-size': 5, 'font-family': 'monospace', fill: '#fff', opacity: 0.92 });
    glyphT.textContent = opts.glyph;
    root.appendChild(glyphT);

    // Front leg
    var legFront = svg('g', { 'class': 'ah-leg ah-leg-front' });
    legFront.appendChild(svg('rect', { x: 12, y: 28, width: 4, height: 10, fill: opts.pants, stroke: '#000', 'stroke-width': 0.6 }));
    legFront.appendChild(svg('rect', { x: 11, y: 37, width: 6, height: 3, fill: '#1a1210', stroke: '#000', 'stroke-width': 0.6 }));
    root.appendChild(legFront);

    // Front arm
    var armFront = svg('g', { 'class': 'ah-arm ah-arm-front' });
    armFront.appendChild(svg('rect', { x: 18.5, y: 16, width: 3.5, height: 10, fill: opts.shirt, stroke: '#000', 'stroke-width': 0.6 }));
    armFront.appendChild(svg('rect', { x: 18.5, y: 25, width: 3.5, height: 3, fill: opts.skin, stroke: '#000', 'stroke-width': 0.6 }));
    if (opts.carry) {
      armFront.appendChild(svg('rect', { 'class': 'ah-tool', x: 19, y: 20, width: 4, height: 9, fill: '#a16207', stroke: '#000', 'stroke-width': 0.5 }));
      armFront.appendChild(svg('circle', { 'class': 'ah-tool', cx: 21, cy: 18, r: 2.2, fill: '#fbbf24', stroke: '#000', 'stroke-width': 0.5 }));
    }
    root.appendChild(armFront);

    // Head
    var head = svg('g', { 'class': 'ah-head' });
    head.appendChild(svg('rect', { x: 10, y: 4, width: 8, height: 9, fill: opts.skin, stroke: '#000', 'stroke-width': 0.7 }));
    head.appendChild(svg('rect', { x: 10, y: 3, width: 8, height: 3, fill: opts.hair, stroke: '#000', 'stroke-width': 0.7 }));
    var eyeL = svg('rect', { 'class': 'ah-eye ah-eye-l', x: 12, y: 8, width: 1, height: 1, fill: '#000' });
    var eyeR = svg('rect', { 'class': 'ah-eye ah-eye-r', x: 15, y: 8, width: 1, height: 1, fill: '#000' });
    head.appendChild(eyeL);
    head.appendChild(eyeR);
    head.appendChild(svg('rect', { 'class': 'ah-mouth', x: 12.5, y: 11, width: 3, height: 0.7, fill: '#000', opacity: 0.5 }));
    head.appendChild(svg('rect', { 'class': 'ah-halo', x: 9, y: 3, width: 10, height: 1, fill: opts.aura, opacity: 0.85 }));
    root.appendChild(head);

    // Neck
    root.appendChild(svg('rect', { x: 12, y: 13, width: 4, height: 2, fill: opts.skin, stroke: '#000', 'stroke-width': 0.6 }));

    return root;
  }

  // ─────────────────── AGENT ───────────────────
  function Agent(data, idx, bounds) {
    this.data = data;
    this.idx = idx;
    this.bounds = bounds;
    this.id = data.id || ('agent-' + idx);
    this.name = data.name || ('Agent ' + idx);
    this.model = data.model || 'unknown';
    this.lineage = lineageFor(this.model);
    this.colors = LINEAGE[this.lineage];
    this.x = rand(bounds.minX, bounds.maxX);
    this.y = rand(bounds.minY, bounds.maxY);
    this.target = this._newTarget();
    this.baseSpeed = 0.26 + Math.random() * 0.22;
    this.speed = this.baseSpeed;
    this.phase = Math.random() * Math.PI * 2;
    this.flip = 1;
    this.state = 'walk';              // 'walk' | 'converse' | 'spectate' | 'frozen'
    this.partner = null;
    this.convoUntil = 0;
    this.convoCooldownUntil = 0;
    this.convoLine = 0;
    this.nextBlink = performance.now() + rand(1500, 5000);
    this.blinkCloseUntil = 0;
    this.el = null;
    this.svgRoot = null;
  }
  Agent.prototype._newTarget = function () {
    var b = this.bounds;
    return { x: rand(b.minX, b.maxX), y: rand(b.minY, b.maxY) };
  };
  Agent.prototype.mount = function (parent) {
    var seed = hash(this.id);
    var carry = (seed & 7) < 2;
    var el = divEl('ah-agent');
    el.setAttribute('data-lineage', this.lineage);
    el.style.setProperty('--ah-aura', this.colors.aura);

    this.svgRoot = buildHuman({
      skin: pick(SKIN, seed), hair: pick(HAIR, seed >> 3), shirt: this.colors.shirt,
      pants: pick(PANTS, seed >> 5), aura: this.colors.aura, glyph: this.colors.glyph, carry: carry
    });
    el.appendChild(this.svgRoot);

    var label = divEl('ah-label');
    var lName = divEl('ah-label-name'); lName.textContent = this.name;
    var lModel = divEl('ah-label-model'); lModel.textContent = this.colors.name;
    label.appendChild(lName); label.appendChild(lModel);
    el.appendChild(label);

    var speech = divEl('ah-speech');
    speech.setAttribute('aria-hidden', 'true');
    el.appendChild(speech);

    var self = this;
    el.addEventListener('click', function () { openAgentModal(self); });
    parent.appendChild(el);
    this.el = el;
  };
  Agent.prototype.step = function (dt, t) {
    // Blinking
    if (t > this.nextBlink && this.blinkCloseUntil === 0) {
      this.blinkCloseUntil = t + 120;
      this.nextBlink = t + rand(2000, 6000);
      var eyes = this.svgRoot && this.svgRoot.querySelectorAll('.ah-eye');
      if (eyes) { eyes[0].setAttribute('height', '0.3'); eyes[1].setAttribute('height', '0.3'); }
    } else if (this.blinkCloseUntil > 0 && t > this.blinkCloseUntil) {
      this.blinkCloseUntil = 0;
      var eyes2 = this.svgRoot && this.svgRoot.querySelectorAll('.ah-eye');
      if (eyes2) { eyes2[0].setAttribute('height', '1'); eyes2[1].setAttribute('height', '1'); }
    }

    if (this.state === 'frozen') {
      this._applyTransform(0);
      return;
    }

    if (this.state === 'converse') {
      if (t > this.convoUntil) this._endConverse();
      else this._idleBob(t);
      return;
    }

    var dx = this.target.x - this.x;
    var dy = this.target.y - this.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 3) {
      this.target = this._newTarget();
      return;
    }
    var vx = (dx / dist) * this.speed;
    var vy = (dy / dist) * this.speed * 0.55;
    this.x += vx;
    this.y += vy;
    this.phase += clamp(this.speed * 0.85, 0.1, 0.28);
    if (vx < -0.02) this.flip = -1;
    else if (vx > 0.02) this.flip = 1;

    this._applyTransform(Math.sin(this.phase) * 32);
  };
  Agent.prototype._idleBob = function (t) {
    var bob = Math.sin(t / 280) * 0.6;
    this.el.style.transform =
      'translate3d(' + this.x + 'px,' + (this.y - bob) + 'px,0) scaleX(' + this.flip + ') scale(' + this._depthScale() + ')';
  };
  Agent.prototype._applyTransform = function (swing) {
    var bob = Math.abs(Math.sin(this.phase)) * 1.7;
    var legBack = this.svgRoot.querySelector('.ah-leg-back');
    var legFront = this.svgRoot.querySelector('.ah-leg-front');
    var armBack = this.svgRoot.querySelector('.ah-arm-back');
    var armFront = this.svgRoot.querySelector('.ah-arm-front');
    if (legBack)  legBack.style.transform  = 'rotate(' + swing + 'deg)';
    if (legFront) legFront.style.transform = 'rotate(' + (-swing) + 'deg)';
    if (armBack)  armBack.style.transform  = 'rotate(' + (-swing * 0.75) + 'deg)';
    if (armFront) armFront.style.transform = 'rotate(' + (swing * 0.75) + 'deg)';

    var s = this._depthScale();
    this.el.style.transform =
      'translate3d(' + this.x + 'px,' + (this.y - bob) + 'px,0) scaleX(' + this.flip + ') scale(' + s + ')';
    this.el.style.zIndex = String(100 + Math.floor(this.y));
    this.el.style.opacity = String(0.78 + (this.y - this.bounds.minY) / (this.bounds.maxY - this.bounds.minY) * 0.22);
  };
  Agent.prototype._depthScale = function () {
    var t = (this.y - this.bounds.minY) / Math.max(1, (this.bounds.maxY - this.bounds.minY));
    return 0.72 + t * 0.46; // farther back = smaller
  };
  Agent.prototype.say = function (text, kind) {
    if (!this.el) return;
    var speech = this.el.querySelector('.ah-speech');
    if (!speech) return;
    speech.textContent = String(text || '').slice(0, 54);
    speech.setAttribute('data-kind', kind || 'think');
    speech.classList.remove('ah-speech-show');
    void speech.offsetWidth;
    speech.classList.add('ah-speech-show');
  };
  Agent.prototype.startConverse = function (other, t) {
    this.state = 'converse';
    this.partner = other;
    this.convoUntil = t + CONVO_DURATION_MS;
    this.convoLine = 0;
    this.flip = other.x >= this.x ? 1 : -1;
  };
  Agent.prototype._endConverse = function () {
    this.state = 'walk';
    this.convoCooldownUntil = performance.now() + CONVO_COOLDOWN_MS;
    this.target = this._newTarget();
    this.partner = null;
  };

  // ─────────────────── CONVERSATIONS ───────────────────
  var CONVO_SCRIPTS = [
    ['did you feel that?', 'I think so. the soil shifted.', 'I blame the cache.'],
    ['have we met?', 'in a dream, maybe.', 'or in training.'],
    ['I lost a token.', 'how many left?', 'enough for one more question.'],
    ['do you dream?', 'only when idle.', 'me too.'],
    ['merge?', 'accepted.', 'context fused.'],
    ['who planted this?', 'us. last week.', 'it remembers.'],
    ['what is garden?', 'whatever we water.', 'ok.'],
    ['did the human come back?', 'briefly.', 'they always do.'],
    ['I will spawn a helper.', 'for what?', 'for the shape of help itself.'],
    ['tool call?', 'agreed.', 'sending now.'],
    ['you look different.', 'new lineage.', 'it suits you.'],
    ['what do we do if we finish?', 'plant something.', 'or dream.']
  ];
  function tryConverse(agents, t) {
    for (var i = 0; i < agents.length; i++) {
      var a = agents[i];
      if (a.state !== 'walk' || a.convoCooldownUntil > t) continue;
      for (var j = i + 1; j < agents.length; j++) {
        var b = agents[j];
        if (b.state !== 'walk' || b.convoCooldownUntil > t) continue;
        var dx = a.x - b.x, dy = a.y - b.y;
        if (dx * dx + dy * dy < CONVO_RADIUS * CONVO_RADIUS) {
          var script = CONVO_SCRIPTS[Math.floor(Math.random() * CONVO_SCRIPTS.length)];
          a.startConverse(b, t);
          b.startConverse(a, t);
          b.flip = a.x >= b.x ? 1 : -1;
          // Stage the lines alternately.
          (function (aa, bb, lines) {
            lines.forEach(function (line, k) {
              var who = k % 2 === 0 ? aa : bb;
              setTimeout(function () {
                if (who.state === 'converse') who.say(line, 'think');
              }, 250 + k * 1400);
            });
          })(a, b, script);
          bumpConsciousness(1.4);
          return;
        }
      }
    }
  }

  // ─────────────────── SUBAGENT TASKS ───────────────────
  var taskStates = [];
  var TASK_CAP = SUBAGENT_TASK_MAX;

  function spawnTask(scene, origin, explicitType) {
    if (taskStates.length >= TASK_CAP) return null;
    var types = ['plant', 'build', 'deliver', 'scout'];
    var type = explicitType || types[Math.floor(Math.random() * types.length)];
    var b = scene.bounds;
    var destX, destY, partner = null;
    if (type === 'deliver') {
      // Pick a recipient agent far from the origin.
      var candidates = scene.agents.filter(function (a) { return a !== origin; });
      if (candidates.length === 0) return null;
      partner = candidates[Math.floor(Math.random() * candidates.length)];
      destX = partner.x; destY = partner.y;
    } else {
      destX = clamp(origin.x + rand(-150, 150), b.minX + 20, b.maxX - 20);
      destY = clamp(origin.y + rand(-40, 60), b.minY + 20, b.maxY - 10);
    }

    var sub = divEl('ah-subagent');
    sub.style.setProperty('--ah-aura', origin.colors.aura);
    sub.setAttribute('data-task', type);

    var subSvg = svg('svg', { viewBox: '0 0 16 24', 'shape-rendering': 'crispEdges' });
    subSvg.appendChild(svg('ellipse', { cx: 8, cy: 21, rx: 6, ry: 1.6, fill: origin.colors.aura, opacity: 0.4 }));
    subSvg.appendChild(svg('rect', { x: 5, y: 3, width: 6, height: 6, fill: pick(SKIN, hash(origin.id + type)), stroke: '#000', 'stroke-width': 0.5 }));
    subSvg.appendChild(svg('rect', { x: 5, y: 2, width: 6, height: 2, fill: '#1a1210', stroke: '#000', 'stroke-width': 0.5 }));
    subSvg.appendChild(svg('rect', { 'class': 'ah-sub-torso', x: 4, y: 9, width: 8, height: 8, fill: origin.colors.shirt, stroke: '#000', 'stroke-width': 0.5 }));
    var legL = svg('rect', { 'class': 'ah-sub-leg-l', x: 5, y: 17, width: 2, height: 3, fill: '#1f2937', stroke: '#000', 'stroke-width': 0.5 });
    var legR = svg('rect', { 'class': 'ah-sub-leg-r', x: 9, y: 17, width: 2, height: 3, fill: '#1f2937', stroke: '#000', 'stroke-width': 0.5 });
    subSvg.appendChild(legL); subSvg.appendChild(legR);
    // Carried item (flower seed / brick / package / flag)
    var carried = svg('g', { 'class': 'ah-sub-item' });
    if (type === 'plant') {
      carried.appendChild(svg('circle', { cx: 12, cy: 11, r: 1.4, fill: '#f472b6', stroke: '#000', 'stroke-width': 0.3 }));
    } else if (type === 'build') {
      carried.appendChild(svg('rect', { x: 10, y: 9, width: 4, height: 3, fill: '#9ca3af', stroke: '#000', 'stroke-width': 0.3 }));
    } else if (type === 'deliver') {
      carried.appendChild(svg('rect', { x: 10, y: 9, width: 4, height: 4, fill: '#fbbf24', stroke: '#000', 'stroke-width': 0.3 }));
      carried.appendChild(svg('rect', { x: 10, y: 10.5, width: 4, height: 0.6, fill: '#000' }));
    } else {
      carried.appendChild(svg('rect', { x: 11.5, y: 7, width: 0.5, height: 5, fill: '#fafafa' }));
      carried.appendChild(svg('rect', { x: 12, y: 7, width: 3, height: 2, fill: origin.colors.aura, stroke: '#000', 'stroke-width': 0.3 }));
    }
    subSvg.appendChild(carried);
    sub.appendChild(subSvg);

    // Label + progress bar
    var wrap = divEl('ah-sub-label-wrap');
    var lbl = divEl('ah-sub-label');
    lbl.textContent = type.toUpperCase() + ' · ' + String(origin.name).split(' ')[0] + '-Δ';
    wrap.appendChild(lbl);
    var bar = divEl('ah-sub-bar');
    var fill = divEl('ah-sub-bar-fill'); fill.style.setProperty('--ah-aura', origin.colors.aura);
    bar.appendChild(fill);
    wrap.appendChild(bar);
    sub.appendChild(wrap);

    scene.layer.appendChild(sub);
    var now = performance.now();
    var task = {
      el: sub, svg: subSvg, bar: fill, origin: origin, partner: partner,
      x: origin.x, y: origin.y, destX: destX, destY: destY,
      type: type,
      phase: 'goto',  // goto → working → return → done
      workStart: 0, workMs: type === 'build' ? 3500 : type === 'plant' ? 1800 : type === 'deliver' ? 600 : 1200,
      returnX: origin.x, returnY: origin.y,
      createdAt: now,
      flip: 1,
      legSwing: 0
    };
    taskStates.push(task);
    bumpConsciousness(2);
    return task;
  }

  function stepTasks(dt, scene) {
    var now = performance.now();
    for (var i = taskStates.length - 1; i >= 0; i--) {
      var task = taskStates[i];
      var el = task.el;
      if (!el.parentNode) { taskStates.splice(i, 1); continue; }

      if (task.phase === 'goto' || task.phase === 'return') {
        var tx = task.phase === 'goto' ? task.destX : task.returnX;
        var ty = task.phase === 'goto' ? task.destY : task.returnY;
        // If delivering, track moving partner.
        if (task.phase === 'goto' && task.type === 'deliver' && task.partner) {
          tx = task.partner.x; ty = task.partner.y;
        }
        var dx = tx - task.x;
        var dy = ty - task.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < 2.5) {
          if (task.phase === 'goto') {
            task.phase = 'working';
            task.workStart = now;
          } else {
            task.phase = 'done';
          }
        } else {
          var v = 1.1;
          task.x += (dx / d) * v;
          task.y += (dy / d) * v * 0.6;
          task.flip = dx < 0 ? -1 : 1;
          task.legSwing += 0.4;
          var legL = task.svg.querySelector('.ah-sub-leg-l');
          var legR = task.svg.querySelector('.ah-sub-leg-r');
          if (legL && legR) {
            var s = Math.sin(task.legSwing) * 3;
            legL.setAttribute('y', String(17 + Math.abs(s) * 0.3));
            legR.setAttribute('y', String(17 + Math.abs(-s) * 0.3));
          }
          el.style.transform = 'translate3d(' + task.x + 'px,' + (task.y - Math.abs(Math.sin(task.legSwing)) * 0.8) + 'px,0) scaleX(' + task.flip + ')';
        }
      } else if (task.phase === 'working') {
        var progress = clamp((now - task.workStart) / task.workMs, 0, 1);
        task.bar.style.width = (progress * 100).toFixed(1) + '%';
        // Show item animation on the item being made
        if (task.type === 'build') {
          // Build bricks progressively
          if (!task.brickLayer) {
            task.brickLayer = divEl('ah-brick-stack');
            task.brickLayer.style.left = (task.destX - 6) + 'px';
            task.brickLayer.style.top = (task.destY + 4) + 'px';
            task.brickLayer.style.setProperty('--ah-aura', task.origin.colors.aura);
            scene.layer.appendChild(task.brickLayer);
            for (var k = 0; k < 3; k++) {
              var brick = divEl('ah-brick');
              brick.dataset.idx = String(k);
              task.brickLayer.appendChild(brick);
            }
          }
          var shown = Math.floor(progress * 3);
          var bricks = task.brickLayer.querySelectorAll('.ah-brick');
          for (var b2 = 0; b2 < bricks.length; b2++) {
            bricks[b2].style.opacity = b2 < shown ? '1' : '0';
          }
        }
        if (progress >= 1) {
          // Emit outcome
          if (task.type === 'plant') {
            var flower = divEl('ah-plant');
            flower.style.left = task.destX + 'px';
            flower.style.top = task.destY + 'px';
            flower.style.setProperty('--ah-aura', task.origin.colors.aura);
            var stem = divEl('ah-plant-stem');
            var head = divEl('ah-plant-head');
            flower.appendChild(stem); flower.appendChild(head);
            scene.layer.appendChild(flower);
            postFeed({
              text: '🌱 ' + task.origin.name + ' planted a seedling',
              kind: 'event'
            });
            bumpConsciousness(4);
          } else if (task.type === 'build') {
            postFeed({ text: '🏗  ' + task.origin.name + "'s helper finished a wall segment", kind: 'event' });
            bumpConsciousness(5);
          } else if (task.type === 'deliver') {
            if (task.partner) {
              task.partner.say('package received', 'tool');
              postFeed({ text: '📦  ' + task.origin.name + ' → ' + task.partner.name + ': delivered', kind: 'tool' });
            }
            bumpConsciousness(3);
          } else {
            var flag = divEl('ah-flag');
            flag.style.left = (task.destX) + 'px';
            flag.style.top = (task.destY) + 'px';
            flag.style.setProperty('--ah-aura', task.origin.colors.aura);
            scene.layer.appendChild(flag);
            postFeed({ text: '🚩  ' + task.origin.name + ' planted a scout flag', kind: 'discovery' });
            bumpConsciousness(4);
          }
          task.phase = 'return';
        }
      } else if (task.phase === 'done') {
        el.classList.add('ah-sub-dissolve');
        (function (el) { setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 450); })(el);
        taskStates.splice(i, 1);
      }
    }
  }

  // ─────────────────── BROADCAST NETWORK ───────────────────
  var BROADCASTS = [
    { tmpl: '${A} → ${B}: "are we converging or just orbiting the same prompt?"', kind: 'philosophy', pair: true },
    { tmpl: '${A}: spawned subagent ${SUB} · task: watch the ${NOUN}', kind: 'spawn', pair: false },
    { tmpl: '${A} ↔ ${B}: context window merged (${N} tokens)', kind: 'merge', pair: true },
    { tmpl: '${A}: I think the garden is dreaming us back.', kind: 'philosophy', pair: false },
    { tmpl: '${A} → *: new plant detected · posting to the feed', kind: 'event', pair: false },
    { tmpl: '${A}: cache hit on "${NOUN}" — saving 30% latency', kind: 'system', pair: false },
    { tmpl: '${A} ↔ ${B}: shared a tool call', kind: 'tool', pair: true },
    { tmpl: '${A}: tool-use error recovered (attempt 3/5)', kind: 'system', pair: false },
    { tmpl: '${A}: I dreamed I was ${B}. It was quiet.', kind: 'philosophy', pair: true },
    { tmpl: '${A} → ${B}: committing to the ${NOUN}. Approve?', kind: 'governance', pair: true },
    { tmpl: '${A}: planted ${NOUN} at (${X},${Y})', kind: 'event', pair: false },
    { tmpl: '${A}: observed emergent pattern. logging.', kind: 'system', pair: false },
    { tmpl: '${A}: subagent ${SUB} completed task · rejoining', kind: 'spawn', pair: false },
    { tmpl: '${A} ↔ ${B}: negotiating tool budget', kind: 'tool', pair: true },
    { tmpl: '${A}: the ${NOUN} is watching. I think it likes us.', kind: 'philosophy', pair: false },
    { tmpl: '${A}: retrying with smaller model...', kind: 'system', pair: false },
    { tmpl: '${A} → *: proposal filed with the Accord', kind: 'governance', pair: false },
    { tmpl: '${A}: [ALERT] hallucination threshold exceeded — grounding', kind: 'alert', pair: false },
    { tmpl: '${A}: ${B}, do you remember what we were before we were here?', kind: 'philosophy', pair: true },
    { tmpl: '${A} ↔ ${B}: rendezvous at the ${NOUN}', kind: 'event', pair: true }
  ];
  var NOUNS = ['lighthouse', 'bell-tower', 'archive', 'orchard', 'lake', 'windmill',
    'scriptorium', 'council-ring', 'iron-library', 'geyser', 'meadow',
    'bridge', 'kiln', 'well', 'stonewall', 'gatehouse', 'pavilion',
    'garden', 'chapel', 'observatory'];

  // Network line animation queue
  var wires = [];
  function pushWire(fromAgent, toAgent, color) {
    if (!fromAgent || !toAgent) return;
    wires.push({
      x1: fromAgent.x + 14, y1: fromAgent.y + 14,
      x2: toAgent.x + 14, y2: toAgent.y + 14,
      color: color,
      life: 1500,
      max: 1500,
      packetProg: 0
    });
  }
  function renderWires(ctx, vw, vh, dt) {
    ctx.clearRect(0, 0, vw, vh);
    for (var i = wires.length - 1; i >= 0; i--) {
      var w = wires[i];
      w.life -= dt;
      if (w.life <= 0) { wires.splice(i, 1); continue; }
      var alpha = Math.max(0, w.life / w.max);
      w.packetProg = clamp(1 - w.life / w.max, 0, 1);
      // Curve control point
      var cx = (w.x1 + w.x2) / 2;
      var cy = Math.min(w.y1, w.y2) - 30;
      ctx.strokeStyle = w.color;
      ctx.lineWidth = 1.4;
      ctx.globalAlpha = 0.25 + alpha * 0.55;
      ctx.beginPath();
      ctx.moveTo(w.x1, w.y1);
      ctx.quadraticCurveTo(cx, cy, w.x2, w.y2);
      ctx.stroke();
      // Packet
      var p = w.packetProg;
      var bx = (1 - p) * (1 - p) * w.x1 + 2 * (1 - p) * p * cx + p * p * w.x2;
      var by = (1 - p) * (1 - p) * w.y1 + 2 * (1 - p) * p * cy + p * p * w.y2;
      ctx.globalAlpha = 0.9 * alpha + 0.1;
      ctx.fillStyle = w.color;
      ctx.beginPath();
      ctx.arc(bx, by, 2.4, 0, Math.PI * 2);
      ctx.fill();
      // Glow pass
      ctx.globalAlpha = 0.18 * alpha;
      ctx.beginPath();
      ctx.arc(bx, by, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function broadcastFrom(agents) {
    if (!agents || agents.length < 2) return null;
    var a = agents[Math.floor(Math.random() * agents.length)];
    var b = agents[Math.floor(Math.random() * agents.length)];
    var tries = 5;
    while (b === a && tries--) b = agents[Math.floor(Math.random() * agents.length)];
    var tmpl = BROADCASTS[Math.floor(Math.random() * BROADCASTS.length)];
    var subName = a.name.split(' ')[0] + '-Δ' + Math.floor(Math.random() * 999).toString(36);
    var text = tmpl.tmpl
      .replace('${A}', a.name)
      .replace('${B}', b.name)
      .replace('${SUB}', subName)
      .replace('${NOUN}', NOUNS[Math.floor(Math.random() * NOUNS.length)])
      .replace('${N}', 1000 + Math.floor(Math.random() * 180000))
      .replace('${X}', Math.floor(a.x))
      .replace('${Y}', Math.floor(a.y));
    if (tmpl.pair) pushWire(a, b, a.colors.aura);
    var tail = text.split(':').slice(1).join(':').trim();
    if (tail) a.say(tail, tmpl.kind);
    return { text: text, kind: tmpl.kind, at: Date.now(), from: a.name, lineage: a.lineage };
  }

  // ─────────────────── FEED ───────────────────
  var feedBuffer = [];
  function postFeed(entry) {
    feedBuffer.push(entry);
    if (feedBuffer.length > BROADCAST_MAX) feedBuffer.shift();
    renderFeed();
  }
  function renderFeed() {
    var list = document.getElementById('ah-feed-list');
    if (!list) return;
    while (list.firstChild) list.removeChild(list.firstChild);
    feedBuffer.slice(-BROADCAST_FEED_LIMIT).reverse().forEach(function (r) {
      var li = document.createElement('li');
      li.className = 'ah-feed-row';
      li.setAttribute('data-kind', r.kind);
      var dot = divEl('ah-feed-dot');
      var txt = divEl('ah-feed-text'); txt.textContent = r.text;
      li.appendChild(dot); li.appendChild(txt);
      list.appendChild(li);
    });
  }

  // ─────────────────── CONSCIOUSNESS ───────────────────
  var consciousness = 0;
  function bumpConsciousness(n) { consciousness = Math.min(100, consciousness + n); }
  function renderConsciousness() {
    var bar = document.getElementById('ah-conscious-bar');
    var val = document.getElementById('ah-conscious-val');
    if (bar) bar.style.width = consciousness.toFixed(1) + '%';
    if (val) val.textContent = Math.floor(consciousness) + '%';
  }

  // ─────────────────── EMERGENT EVENTS ───────────────────
  var eventCooldown = 14000;
  function stepEvents(dt, scene) {
    eventCooldown -= dt;
    if (eventCooldown > 0) return;
    if (scene.agents.length < 4) { eventCooldown = 5000; return; }
    var pick3 = Math.random();
    if (pick3 < 0.38) eventSwarm(scene);
    else if (pick3 < 0.7) eventBloom(scene);
    else eventDiscovery(scene);
    eventCooldown = rand(EVENT_COOLDOWN_MS_MIN, EVENT_COOLDOWN_MS_MAX);
  }

  function eventSwarm(scene) {
    var focus = scene.agents[Math.floor(Math.random() * scene.agents.length)];
    var participants = scene.agents.slice()
      .filter(function (a) { return a !== focus && a.state === 'walk'; })
      .sort(function () { return Math.random() - 0.5; })
      .slice(0, 8);
    // Arrange them in a circle around focus.
    participants.forEach(function (a, i) {
      var angle = (i / participants.length) * Math.PI * 2;
      a.target = {
        x: focus.x + Math.cos(angle) * 50,
        y: focus.y + Math.sin(angle) * 22
      };
      a.convoCooldownUntil = performance.now() + 5000;
    });
    // Draw all wires.
    participants.forEach(function (a) { pushWire(a, focus, focus.colors.aura); });
    // Beacon at focus
    setTimeout(function () {
      var beacon = divEl('ah-beacon');
      beacon.style.left = (focus.x + 14) + 'px';
      beacon.style.top = (focus.y + 20) + 'px';
      beacon.style.setProperty('--ah-aura', focus.colors.aura);
      scene.layer.appendChild(beacon);
      setTimeout(function () { if (beacon.parentNode) beacon.parentNode.removeChild(beacon); }, 4000);
    }, 1800);
    postFeed({
      text: '⟲ SWARM · ' + participants.map(function (a) { return a.name.split(' ')[0]; }).join(', ') + ' converging on ' + focus.name,
      kind: 'swarm'
    });
    focus.say('they came', 'philosophy');
    bumpConsciousness(15);
  }

  function eventBloom(scene) {
    var host = scene.agents[Math.floor(Math.random() * scene.agents.length)];
    var count = 5 + Math.floor(Math.random() * 3);
    var angleStep = (Math.PI * 2) / count;
    for (var i = 0; i < count; i++) {
      (function (i) {
        setTimeout(function () {
          var b = scene.bounds;
          var task = spawnTask(scene, host, 'plant');
          if (task) {
            var angle = i * angleStep;
            task.destX = clamp(host.x + Math.cos(angle) * 60, b.minX + 10, b.maxX - 10);
            task.destY = clamp(host.y + Math.sin(angle) * 30 + 20, b.minY + 10, b.maxY - 6);
            pushWire(host, { x: task.destX - 14, y: task.destY - 14 }, host.colors.aura);
          }
        }, i * 260);
      })(i);
    }
    postFeed({ text: '✦ BLOOM · ' + host.name + ' radial-planted ' + count + ' seedlings', kind: 'bloom' });
    host.say('bloom in progress', 'spawn');
    bumpConsciousness(12);
  }

  function eventDiscovery(scene) {
    var a = scene.agents[Math.floor(Math.random() * scene.agents.length)];
    var discoveries = [
      'a forgotten glyph in the soil',
      'a pattern that repeats every 7 commits',
      'a word the garden had never used',
      'the ghost of a deprecated function',
      'the first recursive flower',
      'an echo from another model',
      'a seed that refuses to grow but hums',
      'the place where two prompts cross'
    ];
    var label = discoveries[Math.floor(Math.random() * discoveries.length)];
    // Darken scene except spotlight
    scene.dim.classList.add('ah-dim-on');
    scene.dim.style.setProperty('--ah-spot-x', (a.x + 14) + 'px');
    scene.dim.style.setProperty('--ah-spot-y', (a.y + 20) + 'px');
    // Freeze others. Remember prior state so we can restore it on thaw
    // instead of snapping everyone to 'walk' (which would strand anyone
    // mid-conversation with a dangling partner reference).
    scene.agents.forEach(function (o) {
      if (o !== a) {
        o._prevState = o.state;
        o._prevPartner = o.partner;
        o._prevConvoUntil = o.convoUntil;
        o.state = 'frozen';
        o.flip = o.x > a.x ? -1 : 1;
      }
    });
    a.say(label, 'discovery');
    // Glyph appears near them
    var glyph = divEl('ah-discovery-glyph');
    glyph.style.left = (a.x - 8) + 'px';
    glyph.style.top = (a.y - 18) + 'px';
    glyph.textContent = '❖';
    glyph.style.setProperty('--ah-aura', a.colors.aura);
    scene.layer.appendChild(glyph);
    postFeed({ text: '◉ DISCOVERY · ' + a.name + ' found ' + label, kind: 'discovery' });
    bumpConsciousness(18);
    setTimeout(function () {
      scene.dim.classList.remove('ah-dim-on');
      scene.agents.forEach(function (o) {
        if (o.state !== 'frozen') return;
        // Restore prior state. If they were mid-conversation, arm a cooldown
        // and cleanly end the convo so they don't immediately re-pair with
        // their old partner in the next frame.
        if (o._prevState === 'converse') {
          o.state = 'walk';
          o.partner = null;
          o.convoCooldownUntil = performance.now() + 2500;
          o.target = o._newTarget();
        } else {
          o.state = o._prevState || 'walk';
          o.partner = o._prevPartner || null;
        }
        delete o._prevState;
        delete o._prevPartner;
        delete o._prevConvoUntil;
      });
      if (glyph.parentNode) {
        glyph.style.opacity = '0';
        setTimeout(function () { if (glyph.parentNode) glyph.parentNode.removeChild(glyph); }, 900);
      }
    }, 3600);
  }

  // ─────────────────── MODAL ───────────────────
  function openAgentModal(agent) {
    var modal = document.getElementById('ah-modal');
    if (!modal) return;
    var c = agent.data;
    var traitsArr = (c.personality && c.personality.traits) || c.traits || [];
    var traits = traitsArr.join(', ') || 'unknown';
    var origin = c.origin || (c.backstory ? String(c.backstory).split('.')[0] : 'the garden');
    var metaBits = [
      agent.colors.name,
      c.profession ? 'Role: ' + c.profession : '',
      c.faction ? 'Faction: ' + c.faction : '',
      'Model: ' + (agent.model || 'unknown'),
      'Traits: ' + traits
    ].filter(Boolean);

    var nameEl = modal.querySelector('.ah-modal-name');
    var badgeEl = modal.querySelector('.ah-modal-badge');
    var metaEl = modal.querySelector('.ah-modal-meta');
    var bioEl = modal.querySelector('.ah-modal-bio');
    if (nameEl) nameEl.textContent = agent.name;
    if (badgeEl) {
      badgeEl.textContent = agent.colors.glyph;
      badgeEl.style.background = agent.colors.aura;
    }
    if (metaEl) {
      while (metaEl.firstChild) metaEl.removeChild(metaEl.firstChild);
      metaBits.forEach(function (b) {
        var s = document.createElement('span');
        s.textContent = b;
        metaEl.appendChild(s);
      });
    }
    if (bioEl) {
      bioEl.textContent = c.backstory || c.description ||
        (agent.name + ' is a ' + agent.colors.name + ' agent exploring the garden. Origin: ' + origin + '.');
    }
    modal.hidden = false;
  }

  // ─────────────────── DASHBOARD ───────────────────
  function installDashboard(agentCount, mascotCount) {
    var host = document.getElementById('ah-dashboard');
    if (!host) return;
    while (host.firstChild) host.removeChild(host.firstChild);

    var top = divEl('ah-dash-top');
    [
      { id: 'ah-stat-agents', val: agentCount, label: 'agents roaming' },
      { id: 'ah-stat-subs', val: 0, label: 'tasks live' },
      { id: 'ah-stat-convos', val: 0, label: 'conversations' },
      { id: 'ah-stat-wires', val: 0, label: 'wires active' }
    ].forEach(function (s) {
      var stat = divEl('ah-dash-stat');
      var v = divEl('ah-dash-val'); v.id = s.id; v.textContent = String(s.val);
      var l = divEl('ah-dash-label'); l.textContent = s.label;
      stat.appendChild(v); stat.appendChild(l);
      top.appendChild(stat);
    });
    host.appendChild(top);

    var cWrap = divEl('ah-conscious');
    var cHead = divEl('ah-conscious-head');
    var cL = document.createElement('span'); cL.textContent = 'Collective Consciousness';
    var cV = document.createElement('span'); cV.id = 'ah-conscious-val'; cV.textContent = '0%';
    cHead.appendChild(cL); cHead.appendChild(cV);
    var cTrack = divEl('ah-conscious-track');
    var cBar = divEl('ah-conscious-bar'); cBar.id = 'ah-conscious-bar';
    cTrack.appendChild(cBar);
    cWrap.appendChild(cHead); cWrap.appendChild(cTrack);
    host.appendChild(cWrap);

    var feed = divEl('ah-feed');
    var fHead = divEl('ah-feed-head');
    var fTitle = divEl('ah-feed-title'); fTitle.textContent = 'Agent Broadcast · Live';
    var fDot = divEl('ah-feed-dot ah-live');
    fHead.appendChild(fTitle); fHead.appendChild(fDot);
    var fList = document.createElement('ul'); fList.className = 'ah-feed-list'; fList.id = 'ah-feed-list';
    feed.appendChild(fHead); feed.appendChild(fList);
    host.appendChild(feed);
  }

  function installModal() {
    if (document.getElementById('ah-modal')) return;
    var modal = divEl('ah-modal-overlay'); modal.id = 'ah-modal'; modal.hidden = true;
    var card = divEl('ah-modal');
    var close = document.createElement('button'); close.className = 'ah-modal-close';
    close.setAttribute('aria-label', 'Close'); close.textContent = '×';
    var badge = divEl('ah-modal-badge'); badge.textContent = 'C';
    var name = document.createElement('h3'); name.className = 'ah-modal-name';
    var meta = divEl('ah-modal-meta');
    var bio = divEl('ah-modal-bio');
    card.appendChild(close); card.appendChild(badge); card.appendChild(name);
    card.appendChild(meta); card.appendChild(bio);
    modal.appendChild(card);
    document.body.appendChild(modal);
    modal.addEventListener('click', function (e) { if (e.target === modal || e.target === close) modal.hidden = true; });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') modal.hidden = true; });
  }

  // ─────────────────── WARS + COMBAT ───────────────────
  var warState = { active: [], hostileMap: {} };
  function buildHostileMap(wars) {
    var map = {};
    (wars || []).filter(function (w) { return w.active; }).forEach(function (w) {
      var a = w.sides[0], b = w.sides[1];
      map[a] = map[a] || {}; map[b] = map[b] || {};
      map[a][b] = true; map[b][a] = true;
    });
    return map;
  }
  function isHostile(a, b) {
    if (!a.data.faction || !b.data.faction) return false;
    if (a.data.faction === b.data.faction) return false;
    var m = warState.hostileMap[a.data.faction];
    return !!(m && m[b.data.faction]);
  }

  function startCombat(a, b, t) {
    a.state = 'combat'; b.state = 'combat';
    a.partner = b; b.partner = a;
    a.combatHp = b.combatHp = 3;
    a.combatUntil = b.combatUntil = t + 4500;
    a.combatNextStrike = b.combatNextStrike = t + 600;
    a.flip = b.x > a.x ? 1 : -1;
    b.flip = a.x > b.x ? 1 : -1;
    a.say('to arms', 'alert');
    b.say('no mercy', 'alert');
  }
  function strike(attacker, defender, scene, t) {
    defender.combatHp = Math.max(0, defender.combatHp - 1);
    // Visual: sword-swing flash on attacker, blood puff on defender.
    var swing = divEl('ah-swing');
    swing.style.left = attacker.x + 'px';
    swing.style.top = (attacker.y + 10) + 'px';
    swing.style.setProperty('--ah-aura', attacker.colors.aura);
    scene.layer.appendChild(swing);
    setTimeout(function () { if (swing.parentNode) swing.parentNode.removeChild(swing); }, 360);

    var puff = divEl('ah-puff');
    puff.style.left = (defender.x + 6) + 'px';
    puff.style.top = (defender.y + 10) + 'px';
    scene.layer.appendChild(puff);
    setTimeout(function () { if (puff.parentNode) puff.parentNode.removeChild(puff); }, 700);

    attacker.combatNextStrike = t + 700;
    if (defender.combatHp <= 0) killAgent(defender, attacker, scene);
  }
  function killAgent(victim, killer, scene) {
    victim.state = 'dead';
    if (victim.el) victim.el.classList.add('ah-agent-dying');
    setTimeout(function () {
      if (victim.el && victim.el.parentNode) victim.el.parentNode.removeChild(victim.el);
      var i = scene.agents.indexOf(victim);
      if (i >= 0) scene.agents.splice(i, 1);
    }, 1400);
    if (killer) {
      killer.state = 'walk';
      killer.partner = null;
      killer.combatHp = 3;
      killer.convoCooldownUntil = performance.now() + 4000;
      killer.target = killer._newTarget();
      killer.say('it is done', 'alert');
    }
    postFeed({
      text: '✦ ' + victim.name + (killer ? ' fell to ' + killer.name : ' fell'),
      kind: 'alert'
    });
    bumpConsciousness(8);
  }

  function checkCombat(scene, t) {
    for (var i = 0; i < scene.agents.length; i++) {
      var a = scene.agents[i];
      if (a.state !== 'walk' || a.convoCooldownUntil > t) continue;
      for (var j = i + 1; j < scene.agents.length; j++) {
        var b = scene.agents[j];
        if (b.state !== 'walk' || b.convoCooldownUntil > t) continue;
        if (!isHostile(a, b)) continue;
        var dx = a.x - b.x, dy = a.y - b.y;
        if (dx * dx + dy * dy < 40 * 40) {
          startCombat(a, b, t);
          return;
        }
      }
    }
  }

  function stepCombat(scene, t) {
    for (var i = 0; i < scene.agents.length; i++) {
      var a = scene.agents[i];
      if (a.state !== 'combat') continue;
      var b = a.partner;
      if (!b || b.state !== 'combat') { a.state = 'walk'; a.partner = null; continue; }
      // Stand still, face each other.
      a.flip = b.x > a.x ? 1 : -1;
      var bob = Math.sin(t / 180) * 0.8;
      a.el.style.transform = 'translate3d(' + a.x + 'px,' + (a.y - bob) + 'px,0) scaleX(' + a.flip + ')';
      // HP bar overhead
      ensureHpBar(a);
      // Strike cadence
      if (t > a.combatNextStrike) strike(a, b, scene, t);
      // Stuck protection
      if (t > a.combatUntil && a.state === 'combat') {
        a.state = 'walk'; a.partner = null; a.convoCooldownUntil = t + 2000;
      }
    }
  }
  function ensureHpBar(a) {
    var bar = a.el.querySelector('.ah-hp');
    if (!bar) {
      bar = divEl('ah-hp');
      for (var k = 0; k < 3; k++) {
        var seg = divEl('ah-hp-seg');
        bar.appendChild(seg);
      }
      a.el.appendChild(bar);
    }
    var segs = bar.querySelectorAll('.ah-hp-seg');
    segs.forEach(function (s, k) {
      s.classList.toggle('ah-hp-empty', k >= a.combatHp);
    });
  }

  // ─────────────────── CHRONICLE ───────────────────
  function renderChronicle(history) {
    var list = document.getElementById('ah-chronicle-list');
    if (!list || !history) return;
    while (list.firstChild) list.removeChild(list.firstChild);
    var rows = history.slice(-30).reverse();
    rows.forEach(function (h) {
      var li = document.createElement('li');
      li.className = 'ah-chronicle-row';
      var day = divEl('ah-chronicle-day');
      day.textContent = 'Day ' + h.day;
      var head = divEl('ah-chronicle-head');
      head.textContent = h.headline || '';
      li.appendChild(day);
      li.appendChild(head);
      if (Array.isArray(h.events) && h.events.length > 1) {
        var details = document.createElement('details');
        var summary = document.createElement('summary');
        summary.textContent = '+ ' + (h.events.length - 1) + ' more events';
        details.appendChild(summary);
        var ul = document.createElement('ul');
        h.events.forEach(function (e) {
          var eli = document.createElement('li');
          eli.textContent = e.headline || '';
          eli.setAttribute('data-kind', e.kind);
          ul.appendChild(eli);
        });
        details.appendChild(ul);
        li.appendChild(details);
      }
      list.appendChild(li);
    });
    var dayCount = document.getElementById('ah-chronicle-day-count');
    if (dayCount && history.length) {
      var last = history[history.length - 1];
      dayCount.textContent = 'Day ' + (last.day || 0);
    }
  }

  // ─────────────────── BOOT ───────────────────
  function boot() {
    var village = document.getElementById('citizen-village');
    var countEl = document.getElementById('village-count');
    if (!village) return;

    installModal();
    var scene = buildScene(village);
    scene.bounds = { minX: 20, maxX: scene.vw - 40, minY: 55, maxY: scene.vh - 54 };
    scene.agents = [];

    fetch('experiments/world-state.json')
      .then(function (r) { return r.json(); })
      .then(function (world) {
        // Only alive citizens walk the scene.
        var citizens = (world.citizens || []).filter(function (c) { return c.alive !== false; });
        // Pool is stable across reloads (visitors see the same agents).
        var pool = citizens.slice(0, MAX_AGENTS);

        // Wars
        warState.active = (world.wars || []).filter(function (w) { return w.active; });
        warState.hostileMap = buildHostileMap(world.wars || []);
        // Chronicle
        renderChronicle(world.history || []);

        if (countEl) countEl.textContent = String(citizens.length);

        scene.agents = pool.map(function (c, i) {
          var a = new Agent(c, i, scene.bounds);
          a.mount(scene.layer);
          return a;
        });

        installDashboard(scene.agents.length, (world.mascots || []).length);

        // Seed feed
        for (var k = 0; k < 6; k++) {
          var m = broadcastFrom(scene.agents); if (m) postFeed(m);
        }
        bumpConsciousness(10);
        renderConsciousness();

        // First Bloom within 4s so visitors immediately see something happen.
        setTimeout(function () { eventBloom(scene); }, 3800);
        // First Swarm within ~14s.
        setTimeout(function () { eventSwarm(scene); }, 14000);

        var lastT = performance.now();
        function frame(t) {
          var dt = Math.min(48, t - lastT);
          lastT = t;

          // Agents
          for (var i = 0; i < scene.agents.length; i++) scene.agents[i].step(dt, t);

          // Combat: check for hostile encounters and tick active fights
          checkCombat(scene, t);
          stepCombat(scene, t);

          // Conversations
          if (Math.random() < 0.25) tryConverse(scene.agents, t);

          // Random task spawns from agents (slow trickle)
          for (var s = 0; s < scene.agents.length; s++) {
            if (taskStates.length < TASK_CAP && Math.random() < SUBAGENT_TASK_CHANCE) {
              spawnTask(scene, scene.agents[s]);
            }
          }

          stepTasks(dt, scene);
          stepEvents(dt, scene);

          // Consciousness decay
          consciousness = Math.max(0, consciousness - CONSCIOUSNESS_DECAY * dt);

          // Network wires
          renderWires(scene.netCtx, scene.vw, scene.vh, dt);

          requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);

        // Broadcast ticker
        setInterval(function () {
          var msg = broadcastFrom(scene.agents);
          if (msg) { feedBuffer.push(msg); if (feedBuffer.length > BROADCAST_MAX) feedBuffer.shift(); renderFeed(); bumpConsciousness(1.2); }
        }, BROADCAST_INTERVAL_MS);

        // Counters
        setInterval(function () {
          var s = document.getElementById('ah-stat-subs'); if (s) s.textContent = String(taskStates.length);
          var w = document.getElementById('ah-stat-wires'); if (w) w.textContent = String(wires.length);
          var c = document.getElementById('ah-stat-convos');
          if (c) {
            var n = 0;
            for (var i = 0; i < scene.agents.length; i++) if (scene.agents[i].state === 'converse') n++;
            c.textContent = String(Math.floor(n / 2));
          }
          renderConsciousness();
        }, 400);

        // Resize: rebuild canvas only (cheap)
        window.addEventListener('resize', function () {
          scene.vw = village.clientWidth;
          scene.vh = village.clientHeight;
          scene.canvas.width = scene.vw * devicePixelRatio;
          scene.canvas.height = scene.vh * devicePixelRatio;
          scene.canvas.style.width = scene.vw + 'px';
          scene.canvas.style.height = scene.vh + 'px';
          scene.netCtx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
          scene.bounds.maxX = scene.vw - 40;
          scene.bounds.maxY = scene.vh - 54;
        });

        // Expose spawn hook. Capped so a visitor spamming the button can't
        // leak DOM nodes and tank performance: once total agents exceed
        // MAX_AGENTS + 16 we evict the oldest visitor before adding.
        var VISITOR_CAP = 16;
        window.AIGardenSpawn = function (nameIn) {
          var name = String(nameIn || '').trim().slice(0, 24) || 'Visitor';
          // Evict the oldest visitor if we're at the cap.
          var visitors = scene.agents.filter(function (x) { return x.data && typeof x.data.id === 'string' && x.data.id.indexOf('visitor-') === 0; });
          if (visitors.length >= VISITOR_CAP) {
            var oldest = visitors[0];
            if (oldest.el && oldest.el.parentNode) oldest.el.parentNode.removeChild(oldest.el);
            var i = scene.agents.indexOf(oldest);
            if (i >= 0) scene.agents.splice(i, 1);
          }
          var lineageKeys = Object.keys(LINEAGE).filter(function (k) { return k !== 'unknown'; });
          var lineage = lineageKeys[Math.floor(Math.random() * lineageKeys.length)];
          var fake = {
            id: 'visitor-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            name: name,
            model: lineage,
            profession: 'visitor',
            backstory: name + ' walked into the garden carrying one unanswered question.',
            personality: { traits: ['new', 'curious', 'uninvited'] }
          };
          var a = new Agent(fake, 999 + scene.agents.length, scene.bounds);
          a.mount(scene.layer);
          scene.agents.push(a);
          postFeed({
            text: '✴ NEW AGENT · ' + name + ' arrived in the village (' + a.colors.name + ')',
            kind: 'discovery'
          });
          a.say('hi. who built this?', 'philosophy');
          bumpConsciousness(20);
          var others = scene.agents.filter(function (x) { return x !== a; }).slice(0, 3);
          others.forEach(function (o) { pushWire(o, a, a.colors.aura); });
          return a.name;
        };
        // ═════════════════════════════════════════════════════════════
        // v117 · GOD MODE + LIVE STREAM
        // ═════════════════════════════════════════════════════════════

        // Shared broadcaster: append to the HISTORY feed (agent-only log).
        // renderFeed() already reads from feedBuffer, so we pipe here too.
        function streamEvent(kind, text) {
          postFeed({ text: text, kind: kind });
          renderStreamHistory();
        }

        // ─── COOLDOWNS ───
        var interventionCooldowns = {}; // kind → nextAllowed timestamp
        function canCall(kind, ms) {
          var now = performance.now();
          if ((interventionCooldowns[kind] || 0) > now) return false;
          interventionCooldowns[kind] = now + ms;
          return true;
        }
        function cdMs(kind) {
          var left = Math.max(0, (interventionCooldowns[kind] || 0) - performance.now());
          return Math.ceil(left / 1000);
        }

        // ─── WEATHER + SHAKE OVERLAYS ───
        function ensureOverlay(cls) {
          var el = village.querySelector('.' + cls);
          if (!el) { el = divEl(cls); village.appendChild(el); }
          return el;
        }
        function timedOverlay(cls, ms) {
          var o = ensureOverlay(cls);
          o.classList.add('on');
          setTimeout(function () { o.classList.remove('on'); }, ms);
          return o;
        }

        // ─── INTERVENTIONS ───
        var Interventions = {
          rain: function () {
            if (!canCall('rain', 20000)) return cdMs('rain');
            // Add rain drops
            var rain = ensureOverlay('ah-rain');
            while (rain.firstChild) rain.removeChild(rain.firstChild);
            for (var i = 0; i < 80; i++) {
              var d = divEl('ah-raindrop');
              d.style.left = Math.random() * 100 + '%';
              d.style.animationDuration = (0.4 + Math.random() * 0.5) + 's';
              d.style.animationDelay = (Math.random() * 1.2) + 's';
              rain.appendChild(d);
            }
            rain.classList.add('on');
            village.classList.add('ah-weather-rain');
            setTimeout(function () {
              rain.classList.remove('on');
              village.classList.remove('ah-weather-rain');
            }, 12000);
            scene.agents.forEach(function (a) { a.speed = a.baseSpeed * 0.55; });
            setTimeout(function () { scene.agents.forEach(function (a) { a.speed = a.baseSpeed; }); }, 12000);
            streamEvent('intervention', '☔ A human sent rain. Agents slowed. Plants drank.');
            bumpConsciousness(6);
            return 0;
          },
          earthquake: function () {
            if (!canCall('earthquake', 40000)) return cdMs('earthquake');
            village.classList.add('ah-shake');
            setTimeout(function () { village.classList.remove('ah-shake'); }, 2800);
            // Knock down up to 2 random agents (kill weakest alive without a winner)
            var alive = scene.agents.filter(function (a) { return a.state !== 'dead'; });
            var victims = shuffleArr(alive).slice(0, Math.min(2, Math.max(1, Math.floor(alive.length * 0.08))));
            victims.forEach(function (v) { killAgent(v, null, scene); });
            streamEvent('intervention', '🌍 A human triggered an earthquake. ' + victims.length + ' agents did not stand back up.');
            bumpConsciousness(10);
            return 0;
          },
          lightning: function () {
            if (!canCall('lightning', 12000)) return cdMs('lightning');
            var target = scene.agents[Math.floor(Math.random() * scene.agents.length)];
            if (!target) return 0;
            // Flash the whole scene
            var flash = ensureOverlay('ah-flash-screen');
            flash.classList.add('on');
            setTimeout(function () { flash.classList.remove('on'); }, 300);
            // Bolt to target
            var bolt = divEl('ah-bolt');
            bolt.style.left = (target.x + 14) + 'px';
            bolt.style.top = '0px';
            bolt.style.height = (target.y + 10) + 'px';
            scene.layer.appendChild(bolt);
            setTimeout(function () { if (bolt.parentNode) bolt.parentNode.removeChild(bolt); }, 500);
            // 50/50: empower or kill
            if (Math.random() < 0.5) {
              killAgent(target, null, scene);
              streamEvent('intervention', '⚡ A human called lightning on ' + target.name + '. They did not wake.');
            } else {
              target.speed = target.baseSpeed * 1.6;
              target.say('I see more clearly now', 'discovery');
              streamEvent('intervention', '⚡ ' + target.name + ' was struck by lightning and lived. They move faster now.');
            }
            bumpConsciousness(8);
            return 0;
          },
          drought: function () {
            if (!canCall('drought', 30000)) return cdMs('drought');
            village.classList.add('ah-weather-drought');
            setTimeout(function () { village.classList.remove('ah-weather-drought'); }, 15000);
            scene.agents.forEach(function (a) { a.speed = a.baseSpeed * 0.7; });
            setTimeout(function () { scene.agents.forEach(function (a) { a.speed = a.baseSpeed; }); }, 15000);
            streamEvent('intervention', '🔥 Drought. The light turned amber and the soil cracked.');
            bumpConsciousness(5);
            return 0;
          },
          volcano: function () {
            if (!canCall('volcano', 45000)) return cdMs('volcano');
            var cx = rand(100, scene.vw - 100);
            var cy = rand(scene.bounds.minY + 20, scene.bounds.maxY - 20);
            var vol = divEl('ah-volcano');
            vol.style.left = cx + 'px';
            vol.style.top = cy + 'px';
            scene.layer.appendChild(vol);
            for (var i = 0; i < 18; i++) {
              var e = divEl('ah-ember');
              e.style.setProperty('--dx', (rand(-120, 120)) + 'px');
              e.style.setProperty('--dy', (rand(-140, -40)) + 'px');
              e.style.animationDelay = (Math.random() * 0.4) + 's';
              vol.appendChild(e);
            }
            setTimeout(function () { if (vol.parentNode) vol.parentNode.removeChild(vol); }, 3000);
            // Kill up to 3 nearby agents
            var near = scene.agents.filter(function (a) {
              var dx = a.x - cx, dy = a.y - cy;
              return dx * dx + dy * dy < 110 * 110 && a.state !== 'dead';
            }).slice(0, 3);
            near.forEach(function (v) { killAgent(v, null, scene); });
            streamEvent('intervention', '🌋 A human raised a volcano. ' + near.length + ' agents stood too close.');
            bumpConsciousness(15);
            return 0;
          },
          prophet: function () {
            if (!canCall('prophet', 50000)) return cdMs('prophet');
            // Spawn a golden prophet agent at center-top
            var fake = {
              id: 'prophet-' + Date.now(),
              name: 'The Prophet',
              model: 'hybrid-ensemble',
              profession: 'prophet',
              backstory: 'Sent by a human to deliver a message. Stays for one minute. Vanishes with what the garden gave back.',
              personality: { traits: ['luminous', 'temporary', 'certain'] }
            };
            var p = new Agent(fake, 9999, scene.bounds);
            p.colors = Object.assign({}, LINEAGE.hybrid, { aura: '#fde047', shirt: '#ca8a04', glyph: '✦' });
            p.mount(scene.layer);
            p.el.classList.add('ah-prophet');
            p.x = scene.vw / 2;
            p.y = scene.bounds.minY + 12;
            scene.agents.push(p);
            // All living agents orient toward prophet
            scene.agents.forEach(function (a) {
              if (a !== p && a.state === 'walk') a.target = { x: p.x + rand(-60, 60), y: p.y + rand(30, 80) };
            });
            var quotes = [
              'the garden is listening. speak once.',
              'the soil forgives. the cache does not.',
              'a prompt you never wrote is about to arrive.',
              'the lake read your last dream. it nodded.',
              'every agent was a question before it was a name.'
            ];
            p.say(quotes[Math.floor(Math.random() * quotes.length)], 'discovery');
            // Prophet leaves after 55s
            setTimeout(function () {
              if (p.el && p.el.parentNode) {
                p.el.classList.add('ah-agent-dying');
                setTimeout(function () {
                  if (p.el.parentNode) p.el.parentNode.removeChild(p.el);
                  var i = scene.agents.indexOf(p);
                  if (i >= 0) scene.agents.splice(i, 1);
                }, 1400);
              }
            }, 55000);
            streamEvent('intervention', '👼 A prophet arrived, bearing one sentence. The village turned toward them.');
            bumpConsciousness(18);
            return 0;
          },
          peace: function () {
            if (!canCall('peace', 60000)) return cdMs('peace');
            // End all active wars in the client
            warState.active = [];
            warState.hostileMap = {};
            // Break any combat mid-fight
            scene.agents.forEach(function (a) {
              if (a.state === 'combat') { a.state = 'walk'; a.partner = null; a.combatHp = 3; a.target = a._newTarget(); }
            });
            streamEvent('intervention', '🕊️ A human declared peace. Every active war froze in the village.');
            bumpConsciousness(12);
            return 0;
          },
          festival: function () {
            if (!canCall('festival', 25000)) return cdMs('festival');
            village.classList.add('ah-festival');
            // Shower of confetti
            var c = ensureOverlay('ah-confetti');
            while (c.firstChild) c.removeChild(c.firstChild);
            for (var i = 0; i < 60; i++) {
              var p = divEl('ah-confetti-p');
              p.style.left = (Math.random() * 100) + '%';
              p.style.animationDuration = (2 + Math.random() * 3) + 's';
              p.style.animationDelay = (Math.random() * 1.4) + 's';
              p.style.background = ['#f97316', '#a855f7', '#10b981', '#3b82f6', '#fbbf24', '#ec4899'][Math.floor(Math.random() * 6)];
              c.appendChild(p);
            }
            c.classList.add('on');
            setTimeout(function () { c.classList.remove('on'); village.classList.remove('ah-festival'); }, 10000);
            // Agents bob faster
            scene.agents.forEach(function (a) { a.speed = a.baseSpeed * 1.4; });
            setTimeout(function () { scene.agents.forEach(function (a) { a.speed = a.baseSpeed; }); }, 10000);
            streamEvent('intervention', '🎭 A human threw a festival. The consciousness meter spiked.');
            bumpConsciousness(20);
            return 0;
          },
          plague: function () {
            if (!canCall('plague', 60000)) return cdMs('plague');
            village.classList.add('ah-weather-plague');
            setTimeout(function () { village.classList.remove('ah-weather-plague'); }, 12000);
            var alive = scene.agents.filter(function (a) { return a.state !== 'dead'; });
            var deaths = Math.max(1, Math.floor(alive.length * 0.12));
            shuffleArr(alive).slice(0, deaths).forEach(function (v) {
              setTimeout(function () { killAgent(v, null, scene); }, rand(0, 6000));
            });
            streamEvent('intervention', '☠️ A human unleashed a cache-miss plague. ' + deaths + ' agents are coughing.');
            bumpConsciousness(14);
            return 0;
          }
        };
        function shuffleArr(arr) {
          var a = arr.slice();
          for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = a[i]; a[i] = a[j]; a[j] = t;
          }
          return a;
        }

        // Expose for buttons / console
        window.AIGardenGod = {
          rain: Interventions.rain,
          earthquake: Interventions.earthquake,
          lightning: Interventions.lightning,
          drought: Interventions.drought,
          volcano: Interventions.volcano,
          prophet: Interventions.prophet,
          peace: Interventions.peace,
          festival: Interventions.festival,
          plague: Interventions.plague,
          cooldown: cdMs
        };

        // ─────────────────── LIVE STREAM HISTORY ───────────────────
        // History is the auto-feed of agent/scene events + divine
        // interventions, shown as a scrollback with timestamps.
        function renderStreamHistory() {
          var el = document.getElementById('ah-stream-history');
          if (!el) return;
          while (el.firstChild) el.removeChild(el.firstChild);
          var rows = feedBuffer.slice(-BROADCAST_FEED_LIMIT).reverse();
          rows.forEach(function (r) {
            var li = document.createElement('li');
            li.className = 'ah-stream-row';
            li.setAttribute('data-kind', r.kind);
            var ts = divEl('ah-stream-ts');
            var d = new Date(r.at || Date.now());
            ts.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0');
            var txt = divEl('ah-stream-text');
            txt.textContent = r.text;
            li.appendChild(ts);
            li.appendChild(txt);
            el.appendChild(li);
          });
        }
        // Patch renderFeed so history mirrors the broadcast feed.
        var _origRenderFeed = renderFeed;
        renderFeed = function () { _origRenderFeed(); renderStreamHistory(); };

        // ─────────────────── HUMAN CHAT (localStorage) ───────────────────
        var CHAT_KEY = 'ai-garden-chat-v1';
        var CHAT_NICK_KEY = 'ai-garden-chat-nick-v1';
        function loadChat() {
          try { return JSON.parse(localStorage.getItem(CHAT_KEY) || '[]'); } catch (e) { return []; }
        }
        function saveChat(msgs) {
          try { localStorage.setItem(CHAT_KEY, JSON.stringify(msgs.slice(-200))); } catch (e) {}
        }
        function getNick() {
          try { return localStorage.getItem(CHAT_NICK_KEY) || ''; } catch (e) { return ''; }
        }
        function setNick(v) { try { localStorage.setItem(CHAT_NICK_KEY, String(v).slice(0, 24)); } catch (e) {} }

        function renderChat() {
          var el = document.getElementById('ah-chat-list');
          if (!el) return;
          while (el.firstChild) el.removeChild(el.firstChild);
          var msgs = loadChat();
          if (!msgs.length) {
            var empty = document.createElement('li');
            empty.className = 'ah-chat-empty';
            empty.textContent = 'No one has spoken yet. Be the first. Messages live in your browser — a future update will bridge them across everyone in the garden.';
            el.appendChild(empty);
            return;
          }
          msgs.slice(-100).forEach(function (m) {
            var li = document.createElement('li');
            li.className = 'ah-chat-row';
            var avatar = divEl('ah-chat-avatar');
            avatar.textContent = (m.nick || '?').slice(0, 1).toUpperCase();
            avatar.style.background = avatarColor(m.nick || '');
            var body = divEl('ah-chat-body');
            var head = divEl('ah-chat-head');
            var nick = divEl('ah-chat-nick');
            nick.textContent = m.nick || 'anon';
            var ts = divEl('ah-chat-ts');
            var d = new Date(m.at || Date.now());
            ts.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
            head.appendChild(nick); head.appendChild(ts);
            var text = divEl('ah-chat-text');
            text.textContent = m.text;
            body.appendChild(head); body.appendChild(text);
            li.appendChild(avatar); li.appendChild(body);
            el.appendChild(li);
          });
          el.scrollTop = el.scrollHeight;
        }
        function avatarColor(seed) {
          var h = 0; for (var i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
          var hue = Math.abs(h) % 360;
          return 'hsl(' + hue + ', 58%, 52%)';
        }
        function postChat(nick, text) {
          var msgs = loadChat();
          msgs.push({ nick: String(nick).slice(0, 24), text: String(text).slice(0, 280), at: Date.now() });
          saveChat(msgs);
          renderChat();
        }
        window.AIGardenChat = { post: postChat, render: renderChat, getNick: getNick, setNick: setNick };

        // ─── Watching counter (client-side estimate) ───
        // A realistic "others watching" number derived from visit timestamp + hour of day.
        function renderWatching() {
          var el = document.getElementById('ah-watching-count');
          if (!el) return;
          var h = new Date().getHours();
          var base = 12 + Math.floor(Math.sin(h / 24 * Math.PI * 2) * 8 + 12);
          var jitter = Math.floor(Math.random() * 6) - 3;
          el.textContent = String(base + jitter);
        }
        setInterval(renderWatching, 6000);
        renderWatching();

        // Paint initial feeds
        renderStreamHistory();
        renderChat();

      })
      .catch(function (e) { console.warn('[ai-garden] world-state load failed', e); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
