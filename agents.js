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
        var citizens = (world.citizens || []).filter(function (c) { return c.alive !== false; });
        var pool = citizens.slice(0, MAX_AGENTS);
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
      })
      .catch(function (e) { console.warn('[ai-garden] world-state load failed', e); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
