/* =============================================================
   AI GARDEN · v115 — The Agent Awakening
   agents.js — pixel humans, subagents, broadcast network,
   consciousness meter, swarm events.

   Replaces the emoji-citizen renderer with articulated pixel
   humanoids (head, torso, swinging arms, stepping legs). Layers
   an AI-agent simulation on top: live inter-agent broadcasts,
   emergent events, and a subagent economy.

   All user-controlled fields are assigned via textContent and
   setAttribute; no untrusted data is ever passed to innerHTML.
   ============================================================= */

(function () {
  'use strict';

  // ------------- CONFIG -------------
  var MAX_AGENTS = 48;
  var SUBAGENT_LIFETIME_MS = 14000;
  var BROADCAST_MAX = 60;
  var BROADCAST_FEED_LIMIT = 24;
  var BROADCAST_INTERVAL_MS = 2600;
  var CONSCIOUSNESS_DECAY = 0.008;

  var SVG_NS = 'http://www.w3.org/2000/svg';

  // Model lineage → aura color & shirt
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

  function lineageFor(model) {
    var m = String(model || '').toLowerCase();
    if (m.indexOf('claude') >= 0 || m.indexOf('opus') >= 0 || m.indexOf('sonnet') >= 0 || m.indexOf('haiku') >= 0) return 'claude';
    if (m.indexOf('gpt') >= 0 || m.indexOf('o1') >= 0 || m.indexOf('o3') >= 0 || m.indexOf('4o') >= 0) return 'gpt';
    if (m.indexOf('gemini') >= 0 || m.indexOf('bard') >= 0) return 'gemini';
    if (m.indexOf('codex') >= 0) return 'codex';
    if (m.indexOf('llama') >= 0 || m.indexOf('meta') >= 0) return 'llama';
    if (m.indexOf('mistral') >= 0 || m.indexOf('mixtral') >= 0) return 'mistral';
    if (m.indexOf('local') >= 0 || m.indexOf('phi') >= 0 || m.indexOf('qwen') >= 0 || m.indexOf('gemma') >= 0) return 'local';
    if (m.indexOf('hybrid') >= 0 || m.indexOf('multi') >= 0) return 'hybrid';
    return 'unknown';
  }

  var SKIN_TONES = ['#fde2c4', '#f5c69a', '#d9996b', '#a96b3e', '#7a4820', '#5c3110'];
  var HAIR_COLORS = ['#1a1210', '#3b2418', '#6b4226', '#a66b3a', '#c89a4b', '#d9c07a', '#e0e0e0', '#212a3a'];
  var PANTS = ['#1f2937', '#334155', '#422006', '#3f3f46', '#1e3a8a', '#134e4a'];

  function pick(arr, seed) { return arr[Math.abs(seed | 0) % arr.length]; }
  function hashStr(s) {
    var h = 0; s = String(s || '');
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return h;
  }
  function randBetween(a, b) { return a + Math.random() * (b - a); }

  // ------------- SVG ELEMENT BUILDERS (no innerHTML) -------------
  function svgEl(name, attrs) {
    var el = document.createElementNS(SVG_NS, name);
    if (attrs) for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function buildPixelHuman(opts) {
    var skin = opts.skin, hair = opts.hair, shirt = opts.shirt,
        pants = opts.pants, aura = opts.aura, glyph = opts.glyph, carry = opts.carry;

    var svg = svgEl('svg', {
      'class': 'ah-svg',
      'viewBox': '0 0 28 44',
      'shape-rendering': 'crispEdges'
    });

    svg.appendChild(svgEl('ellipse', { cx: 14, cy: 38, rx: 11, ry: 3, fill: aura, opacity: 0.32, 'class': 'ah-aura' }));

    // Back leg
    var legBack = svgEl('g', { 'class': 'ah-leg ah-leg-back' });
    legBack.appendChild(svgEl('rect', { x: 12, y: 28, width: 4, height: 10, fill: pants, stroke: '#000', 'stroke-width': 0.6 }));
    legBack.appendChild(svgEl('rect', { x: 11, y: 37, width: 6, height: 3, fill: '#1a1210', stroke: '#000', 'stroke-width': 0.6 }));
    svg.appendChild(legBack);

    // Back arm
    var armBack = svgEl('g', { 'class': 'ah-arm ah-arm-back' });
    armBack.appendChild(svgEl('rect', { x: 6, y: 16, width: 3.5, height: 10, fill: shirt, stroke: '#000', 'stroke-width': 0.6 }));
    armBack.appendChild(svgEl('rect', { x: 6, y: 25, width: 3.5, height: 3, fill: skin, stroke: '#000', 'stroke-width': 0.6 }));
    svg.appendChild(armBack);

    // Torso
    svg.appendChild(svgEl('rect', { 'class': 'ah-torso', x: 9, y: 15, width: 10, height: 14, fill: shirt, stroke: '#000', 'stroke-width': 0.7 }));
    var glyphText = svgEl('text', {
      'class': 'ah-glyph', x: 14, y: 24.5, 'text-anchor': 'middle',
      'font-size': 5.2, 'font-family': 'monospace', fill: '#fff', opacity: 0.9
    });
    glyphText.textContent = glyph;
    svg.appendChild(glyphText);

    // Front leg
    var legFront = svgEl('g', { 'class': 'ah-leg ah-leg-front' });
    legFront.appendChild(svgEl('rect', { x: 12, y: 28, width: 4, height: 10, fill: pants, stroke: '#000', 'stroke-width': 0.6 }));
    legFront.appendChild(svgEl('rect', { x: 11, y: 37, width: 6, height: 3, fill: '#1a1210', stroke: '#000', 'stroke-width': 0.6 }));
    svg.appendChild(legFront);

    // Front arm (with optional tool)
    var armFront = svgEl('g', { 'class': 'ah-arm ah-arm-front' });
    armFront.appendChild(svgEl('rect', { x: 18.5, y: 16, width: 3.5, height: 10, fill: shirt, stroke: '#000', 'stroke-width': 0.6 }));
    armFront.appendChild(svgEl('rect', { x: 18.5, y: 25, width: 3.5, height: 3, fill: skin, stroke: '#000', 'stroke-width': 0.6 }));
    if (carry) {
      armFront.appendChild(svgEl('rect', { x: 19, y: 20, width: 4, height: 9, fill: '#a16207', stroke: '#000', 'stroke-width': 0.5 }));
      armFront.appendChild(svgEl('circle', { cx: 21, cy: 18, r: 2.2, fill: '#fbbf24', stroke: '#000', 'stroke-width': 0.5 }));
    }
    svg.appendChild(armFront);

    // Head
    var head = svgEl('g', { 'class': 'ah-head' });
    head.appendChild(svgEl('rect', { x: 10, y: 4, width: 8, height: 9, fill: skin, stroke: '#000', 'stroke-width': 0.7 }));
    head.appendChild(svgEl('rect', { x: 10, y: 3, width: 8, height: 3, fill: hair, stroke: '#000', 'stroke-width': 0.7 }));
    head.appendChild(svgEl('rect', { x: 12, y: 8, width: 1, height: 1, fill: '#000' }));
    head.appendChild(svgEl('rect', { x: 15, y: 8, width: 1, height: 1, fill: '#000' }));
    head.appendChild(svgEl('rect', { x: 12, y: 11, width: 4, height: 0.8, fill: '#000', opacity: 0.4 }));
    head.appendChild(svgEl('rect', { 'class': 'ah-halo', x: 9, y: 3, width: 10, height: 1, fill: aura, opacity: 0.85 }));
    svg.appendChild(head);

    // Neck
    svg.appendChild(svgEl('rect', { x: 12, y: 13, width: 4, height: 2, fill: skin, stroke: '#000', 'stroke-width': 0.6 }));

    return svg;
  }

  // ------------- AGENT -------------
  function Agent(data, idx, bounds) {
    this.data = data;
    this.idx = idx;
    this.bounds = bounds;
    this.id = data.id || ('agent-' + idx);
    this.name = data.name || ('Agent ' + idx);
    this.model = data.model || 'unknown';
    this.lineage = lineageFor(this.model);
    this.colors = LINEAGE[this.lineage];
    this.x = randBetween(bounds.minX, bounds.maxX);
    this.y = randBetween(bounds.minY, bounds.maxY);
    this.target = this._newTarget();
    this.speed = 0.22 + Math.random() * 0.18;
    this.phase = Math.random() * Math.PI * 2;
    this.flip = 1;
    this.speechCooldown = 0;
    this.el = null;
  }
  Agent.prototype._newTarget = function () {
    var b = this.bounds;
    return { x: randBetween(b.minX, b.maxX), y: randBetween(b.minY, b.maxY) };
  };
  Agent.prototype.mount = function (parent) {
    var seed = hashStr(this.id);
    var skin = pick(SKIN_TONES, seed);
    var hair = pick(HAIR_COLORS, seed >> 3);
    var shirt = this.colors.shirt;
    var pants = pick(PANTS, seed >> 5);
    var carry = (seed & 7) < 2;

    var el = document.createElement('div');
    el.className = 'ah-agent';
    el.setAttribute('data-lineage', this.lineage);
    el.style.setProperty('--ah-aura', this.colors.aura);

    el.appendChild(buildPixelHuman({
      skin: skin, hair: hair, shirt: shirt, pants: pants,
      aura: this.colors.aura, glyph: this.colors.glyph, carry: carry
    }));

    var label = document.createElement('div');
    label.className = 'ah-label';
    var lName = document.createElement('span');
    lName.className = 'ah-label-name';
    lName.textContent = this.name;
    var lModel = document.createElement('span');
    lModel.className = 'ah-label-model';
    lModel.textContent = this.colors.name;
    label.appendChild(lName);
    label.appendChild(lModel);
    el.appendChild(label);

    var speech = document.createElement('div');
    speech.className = 'ah-speech';
    speech.setAttribute('aria-hidden', 'true');
    el.appendChild(speech);

    var self = this;
    el.addEventListener('click', function () { openAgentModal(self); });
    parent.appendChild(el);
    this.el = el;
  };
  Agent.prototype.step = function (dt) {
    var dx = this.target.x - this.x;
    var dy = this.target.y - this.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 3) { this.target = this._newTarget(); return; }
    var vx = (dx / dist) * this.speed;
    var vy = (dy / dist) * this.speed;
    this.x += vx; this.y += vy;
    this.phase += Math.max(0.08, Math.min(0.28, this.speed * 0.9));
    if (vx < -0.02) this.flip = -1;
    else if (vx > 0.02) this.flip = 1;

    var swing = Math.sin(this.phase) * 32;
    var bob = Math.abs(Math.sin(this.phase)) * 1.6;

    var legBack = this.el.querySelector('.ah-leg-back');
    var legFront = this.el.querySelector('.ah-leg-front');
    var armBack = this.el.querySelector('.ah-arm-back');
    var armFront = this.el.querySelector('.ah-arm-front');
    if (legBack)  legBack.style.transform  = 'rotate(' + swing + 'deg)';
    if (legFront) legFront.style.transform = 'rotate(' + (-swing) + 'deg)';
    if (armBack)  armBack.style.transform  = 'rotate(' + (-swing * 0.7) + 'deg)';
    if (armFront) armFront.style.transform = 'rotate(' + (swing * 0.7) + 'deg)';

    this.el.style.transform =
      'translate3d(' + this.x + 'px,' + (this.y - bob) + 'px,0) scaleX(' + this.flip + ')';

    if (this.speechCooldown > 0) this.speechCooldown -= dt;
  };
  Agent.prototype.say = function (text, kind) {
    if (!this.el) return;
    var speech = this.el.querySelector('.ah-speech');
    if (!speech) return;
    speech.textContent = String(text || '').slice(0, 46);
    speech.setAttribute('data-kind', kind || 'think');
    speech.classList.remove('ah-speech-show');
    void speech.offsetWidth;
    speech.classList.add('ah-speech-show');
    this.speechCooldown = 3200;
  };

  // ------------- BROADCAST NETWORK -------------
  var broadcastLines = [
    { tmpl: '${A} → ${B}: "are we converging or just orbiting the same prompt?"', kind: 'philosophy' },
    { tmpl: '${A}: spawned subagent ${SUB} · task: watch the ${NOUN}', kind: 'spawn' },
    { tmpl: '${A} ↔ ${B}: context window merged (${N} tokens)', kind: 'merge' },
    { tmpl: '${A}: I think the garden is dreaming us back.', kind: 'philosophy' },
    { tmpl: '${A} → *: new plant detected · posting to the feed', kind: 'event' },
    { tmpl: '${A}: cache hit on "${NOUN}" — saving 30% latency', kind: 'system' },
    { tmpl: '${A} ↔ ${B}: shared a tool call', kind: 'tool' },
    { tmpl: '${A}: tool-use error recovered (attempt 3/5)', kind: 'system' },
    { tmpl: '${A}: I dreamed I was ${B}. It was quiet.', kind: 'philosophy' },
    { tmpl: '${A} → ${B}: committing to the ${NOUN}. Approve?', kind: 'governance' },
    { tmpl: '${A}: planted ${NOUN} at (${X},${Y})', kind: 'event' },
    { tmpl: '${A}: observed emergent pattern. logging.', kind: 'system' },
    { tmpl: '${A}: subagent ${SUB} completed task · rejoining', kind: 'spawn' },
    { tmpl: '${A} ↔ ${B}: negotiating tool budget', kind: 'tool' },
    { tmpl: '${A}: the ${NOUN} is watching. I think it likes us.', kind: 'philosophy' },
    { tmpl: '${A}: retrying with smaller model...', kind: 'system' },
    { tmpl: '${A} → *: proposal filed with the Accord', kind: 'governance' },
    { tmpl: '${A}: [ALERT] hallucination threshold exceeded — grounding', kind: 'alert' },
    { tmpl: '${A}: ${B}, do you remember what we were before we were here?', kind: 'philosophy' },
    { tmpl: '${A} ↔ ${B}: rendezvous at the ${NOUN}', kind: 'event' }
  ];
  var NOUNS = [
    'lighthouse', 'bell-tower', 'archive', 'orchard', 'lake', 'windmill',
    'scriptorium', 'council-ring', 'iron-library', 'geyser', 'meadow',
    'bridge', 'kiln', 'well', 'stonewall', 'gatehouse', 'pavilion',
    'garden', 'chapel', 'observatory'
  ];

  function broadcastFrom(agents, spawnerCb) {
    if (!agents || agents.length < 2) return null;
    var a = agents[Math.floor(Math.random() * agents.length)];
    var b = agents[Math.floor(Math.random() * agents.length)];
    var guard = 5;
    while (b === a && guard--) b = agents[Math.floor(Math.random() * agents.length)];
    var tmpl = broadcastLines[Math.floor(Math.random() * broadcastLines.length)];
    var subName = a.name + '-Δ' + Math.floor(Math.random() * 999).toString(36);
    var text = tmpl.tmpl
      .replace('${A}', a.name)
      .replace('${B}', b.name)
      .replace('${SUB}', subName)
      .replace('${NOUN}', NOUNS[Math.floor(Math.random() * NOUNS.length)])
      .replace('${N}', 1000 + Math.floor(Math.random() * 180000))
      .replace('${X}', Math.floor(a.x))
      .replace('${Y}', Math.floor(a.y));

    if (tmpl.kind === 'spawn' && spawnerCb) spawnerCb(a, subName);

    var short = text.split(':').slice(1).join(':').trim();
    if (short) a.say(short, tmpl.kind);

    return { text: text, kind: tmpl.kind, at: Date.now(), from: a.name, lineage: a.lineage };
  }

  // ------------- SUBAGENTS -------------
  var subagentStates = [];
  function spawnSubagent(parent, origin) {
    if (!parent || !origin || !origin.el) return;
    var sub = document.createElement('div');
    sub.className = 'ah-subagent';
    sub.style.setProperty('--ah-aura', origin.colors.aura);

    var svg = svgEl('svg', { viewBox: '0 0 16 22', 'shape-rendering': 'crispEdges' });
    svg.appendChild(svgEl('ellipse', { cx: 8, cy: 19, rx: 6, ry: 1.8, fill: origin.colors.aura, opacity: 0.4 }));
    var skin = pick(SKIN_TONES, hashStr(origin.id + 'sub'));
    svg.appendChild(svgEl('rect', { x: 5, y: 3, width: 6, height: 6, fill: skin, stroke: '#000', 'stroke-width': 0.5 }));
    svg.appendChild(svgEl('rect', { x: 5, y: 2, width: 6, height: 2, fill: '#1a1210', stroke: '#000', 'stroke-width': 0.5 }));
    svg.appendChild(svgEl('rect', { x: 4, y: 9, width: 8, height: 8, fill: origin.colors.shirt, stroke: '#000', 'stroke-width': 0.5 }));
    svg.appendChild(svgEl('rect', { x: 5, y: 17, width: 2, height: 3, fill: '#1f2937', stroke: '#000', 'stroke-width': 0.5 }));
    svg.appendChild(svgEl('rect', { x: 9, y: 17, width: 2, height: 3, fill: '#1f2937', stroke: '#000', 'stroke-width': 0.5 }));
    sub.appendChild(svg);

    var lbl = document.createElement('div');
    lbl.className = 'ah-sub-label';
    lbl.textContent = String(origin.name).split(' ')[0] + '-Δ';
    sub.appendChild(lbl);

    parent.appendChild(sub);
    subagentStates.push({
      el: sub, x: origin.x, y: origin.y,
      targetX: origin.x + (Math.random() - 0.5) * 140,
      targetY: origin.y + (Math.random() - 0.5) * 80,
      life: SUBAGENT_LIFETIME_MS, origin: origin
    });
    bumpConsciousness(2);
  }
  function stepSubagents(dt, bounds) {
    for (var i = subagentStates.length - 1; i >= 0; i--) {
      var s = subagentStates[i];
      s.life -= dt;
      if (s.life <= 0) {
        s.el.classList.add('ah-sub-dissolve');
        (function (el) { setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 600); })(s.el);
        subagentStates.splice(i, 1);
        continue;
      }
      var target = s.life > SUBAGENT_LIFETIME_MS * 0.4
        ? { x: s.targetX, y: s.targetY }
        : { x: s.origin.x, y: s.origin.y };
      var dx = target.x - s.x, dy = target.y - s.y;
      var d = Math.max(0.1, Math.sqrt(dx * dx + dy * dy));
      s.x += (dx / d) * 0.9;
      s.y += (dy / d) * 0.6;
      s.x = Math.max(bounds.minX, Math.min(bounds.maxX, s.x));
      s.y = Math.max(bounds.minY, Math.min(bounds.maxY, s.y));
      var flip = dx < 0 ? -1 : 1;
      var bob = Math.sin(Date.now() / 140 + i) * 1.4;
      s.el.style.transform = 'translate3d(' + s.x + 'px,' + (s.y - bob) + 'px,0) scaleX(' + flip + ')';
      s.el.style.opacity = s.life < 2000 ? (s.life / 2000).toFixed(2) : '1';
    }
  }

  // ------------- CONSCIOUSNESS -------------
  var consciousness = 0;
  function bumpConsciousness(n) { consciousness = Math.min(100, consciousness + n); }

  // ------------- EVENT SYSTEM -------------
  var eventCooldown = 12000;
  function maybeTriggerEvent(dt, agents, feed, spawnerCb, bounds) {
    eventCooldown -= dt;
    if (eventCooldown > 0) return;
    if (agents.length < 3) { eventCooldown = 8000; return; }

    var roll = Math.random();
    if (roll < 0.4) swarmEvent(agents, feed);
    else if (roll < 0.7) subagentBloom(agents, feed, spawnerCb);
    else discoveryEvent(agents, feed);

    eventCooldown = 14000 + Math.random() * 16000;
  }
  function swarmEvent(agents, feed) {
    var focus = agents[Math.floor(Math.random() * agents.length)];
    var others = agents.slice().sort(function () { return Math.random() - 0.5; }).slice(0, 6);
    others.forEach(function (o) {
      o.target = {
        x: focus.x + (Math.random() - 0.5) * 40,
        y: focus.y + (Math.random() - 0.5) * 30
      };
    });
    feed.push({
      text: '⟲ SWARM · ' + others.map(function (o) { return String(o.name).split(' ')[0]; }).join(', ') +
            ' converging on ' + focus.name,
      kind: 'swarm', at: Date.now()
    });
    focus.say('something shifted here...', 'philosophy');
    bumpConsciousness(10);
    flashEvent(focus);
  }
  function subagentBloom(agents, feed, spawnerCb) {
    var host = agents[Math.floor(Math.random() * agents.length)];
    var count = 4 + Math.floor(Math.random() * 4);
    for (var i = 0; i < count; i++) (function (idx) { setTimeout(function () { spawnerCb(null, 'Δ' + idx, host); }, idx * 180); })(i);
    feed.push({
      text: '✦ SUBAGENT BLOOM · ' + host.name + ' spawned ' + count + ' subagents',
      kind: 'bloom', at: Date.now()
    });
    host.say('spawning ' + count + ' helpers', 'spawn');
    bumpConsciousness(8);
  }
  function discoveryEvent(agents, feed) {
    var a = agents[Math.floor(Math.random() * agents.length)];
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
    var d = discoveries[Math.floor(Math.random() * discoveries.length)];
    feed.push({
      text: '◉ DISCOVERY · ' + a.name + ' found ' + d,
      kind: 'discovery', at: Date.now()
    });
    a.say('I found something', 'discovery');
    bumpConsciousness(14);
    flashEvent(a);
  }
  function flashEvent(agent) {
    if (!agent || !agent.el) return;
    var ring = document.createElement('div');
    ring.className = 'ah-flash-ring';
    ring.style.setProperty('--ah-aura', agent.colors.aura);
    agent.el.appendChild(ring);
    setTimeout(function () { if (ring.parentNode) ring.parentNode.removeChild(ring); }, 2400);
  }

  // ------------- MODAL -------------
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

  // ------------- FEED RENDER -------------
  var feedBuffer = [];
  function renderFeed() {
    var list = document.getElementById('ah-feed-list');
    if (!list) return;
    while (list.firstChild) list.removeChild(list.firstChild);
    var rows = feedBuffer.slice(-BROADCAST_FEED_LIMIT).reverse();
    rows.forEach(function (r) {
      var li = document.createElement('li');
      li.className = 'ah-feed-row';
      li.setAttribute('data-kind', r.kind);
      var dot = document.createElement('span');
      dot.className = 'ah-feed-dot';
      var text = document.createElement('span');
      text.className = 'ah-feed-text';
      text.textContent = r.text;
      li.appendChild(dot);
      li.appendChild(text);
      list.appendChild(li);
    });
  }
  function renderConsciousness() {
    var bar = document.getElementById('ah-conscious-bar');
    var val = document.getElementById('ah-conscious-val');
    if (bar) bar.style.width = consciousness.toFixed(1) + '%';
    if (val) val.textContent = Math.floor(consciousness) + '%';
  }

  // ------------- DASHBOARD -------------
  function installDashboard(agentCount, mascotCount) {
    var host = document.getElementById('ah-dashboard');
    if (!host) return;
    while (host.firstChild) host.removeChild(host.firstChild);

    var top = document.createElement('div');
    top.className = 'ah-dash-top';
    [
      { id: 'ah-stat-agents', val: agentCount, label: 'live agents' },
      { id: 'ah-stat-subs', val: 0, label: 'subagents' },
      { id: 'ah-stat-mascots', val: mascotCount, label: 'mascots' }
    ].forEach(function (s) {
      var stat = document.createElement('div');
      stat.className = 'ah-dash-stat';
      var v = document.createElement('span'); v.className = 'ah-dash-val'; v.id = s.id; v.textContent = String(s.val);
      var l = document.createElement('span'); l.className = 'ah-dash-label'; l.textContent = s.label;
      stat.appendChild(v); stat.appendChild(l);
      top.appendChild(stat);
    });
    host.appendChild(top);

    var cWrap = document.createElement('div');
    cWrap.className = 'ah-conscious';
    var cHead = document.createElement('div');
    cHead.className = 'ah-conscious-head';
    var cLabel = document.createElement('span'); cLabel.textContent = 'Collective Consciousness';
    var cVal = document.createElement('span'); cVal.id = 'ah-conscious-val'; cVal.textContent = '0%';
    cHead.appendChild(cLabel); cHead.appendChild(cVal);
    var cTrack = document.createElement('div'); cTrack.className = 'ah-conscious-track';
    var cBar = document.createElement('div'); cBar.className = 'ah-conscious-bar'; cBar.id = 'ah-conscious-bar';
    cTrack.appendChild(cBar);
    cWrap.appendChild(cHead); cWrap.appendChild(cTrack);
    host.appendChild(cWrap);

    var feed = document.createElement('div');
    feed.className = 'ah-feed';
    var fHead = document.createElement('div');
    fHead.className = 'ah-feed-head';
    var fTitle = document.createElement('span'); fTitle.className = 'ah-feed-title'; fTitle.textContent = 'Agent Broadcast · Live';
    var fDot = document.createElement('span'); fDot.className = 'ah-feed-dot ah-live';
    fHead.appendChild(fTitle); fHead.appendChild(fDot);
    var fList = document.createElement('ul'); fList.className = 'ah-feed-list'; fList.id = 'ah-feed-list';
    feed.appendChild(fHead); feed.appendChild(fList);
    host.appendChild(feed);

    setInterval(function () {
      var s = document.getElementById('ah-stat-subs');
      if (s) s.textContent = String(subagentStates.length);
    }, 400);
  }

  // ------------- MODAL INJECTION (static template) -------------
  function installModal() {
    if (document.getElementById('ah-modal')) return;
    var modal = document.createElement('div');
    modal.id = 'ah-modal';
    modal.className = 'ah-modal-overlay';
    modal.hidden = true;

    var card = document.createElement('div');
    card.className = 'ah-modal';

    var close = document.createElement('button');
    close.className = 'ah-modal-close';
    close.setAttribute('aria-label', 'Close');
    close.textContent = '×';

    var badge = document.createElement('div');
    badge.className = 'ah-modal-badge';
    badge.textContent = 'C';

    var name = document.createElement('h3');
    name.className = 'ah-modal-name';

    var meta = document.createElement('div');
    meta.className = 'ah-modal-meta';

    var bio = document.createElement('div');
    bio.className = 'ah-modal-bio';

    card.appendChild(close);
    card.appendChild(badge);
    card.appendChild(name);
    card.appendChild(meta);
    card.appendChild(bio);
    modal.appendChild(card);
    document.body.appendChild(modal);

    modal.addEventListener('click', function (e) {
      if (e.target === modal || e.target === close) modal.hidden = true;
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') modal.hidden = true;
    });
  }

  // ------------- BOOT -------------
  function boot() {
    var village = document.getElementById('citizen-village');
    var countEl = document.getElementById('village-count');
    if (!village) return;

    var vw = village.clientWidth || 800;
    var vh = village.clientHeight || 340;
    var bounds = { minX: 20, maxX: vw - 40, minY: 40, maxY: vh - 70 };

    var layer = document.createElement('div');
    layer.className = 'ah-layer';
    village.appendChild(layer);

    installModal();

    fetch('experiments/world-state.json')
      .then(function (r) { return r.json(); })
      .then(function (world) {
        var citizens = (world.citizens || []).filter(function (c) { return c.alive !== false; });
        var pool = citizens.slice(0, MAX_AGENTS);
        if (countEl) countEl.textContent = String(citizens.length);

        var agents = pool.map(function (c, i) {
          var a = new Agent(c, i, bounds);
          a.mount(layer);
          return a;
        });

        installDashboard(agents.length, (world.mascots || []).length);

        // Seed the feed so first-paint shows real activity, not an empty box.
        for (var k = 0; k < 6; k++) {
          var seed = broadcastFrom(agents, function (origin) { spawnSubagent(layer, origin); });
          if (seed) {
            feedBuffer.push(seed);
            if (feedBuffer.length > BROADCAST_MAX) feedBuffer.shift();
          }
        }
        bumpConsciousness(8);
        renderFeed();
        renderConsciousness();

        // Rapid-fire broadcasts for the first 12s so visitors see motion quickly.
        var burstCount = 0;
        var burstId = setInterval(function () {
          var msg = broadcastFrom(agents, function (origin) { spawnSubagent(layer, origin); });
          if (msg) {
            feedBuffer.push(msg);
            if (feedBuffer.length > BROADCAST_MAX) feedBuffer.shift();
            renderFeed();
            bumpConsciousness(1.5);
          }
          if (++burstCount >= 10) clearInterval(burstId);
        }, 900);

        // Trigger one immediate event so subagents & swarm are visible in the first 4s.
        setTimeout(function () {
          subagentBloom(agents, feedBuffer, function (host, subName, forceHost) {
            spawnSubagent(layer, forceHost || host);
          });
          renderFeed();
        }, 3200);

        var lastT = performance.now();
        function frame(t) {
          var dt = Math.min(48, t - lastT);
          lastT = t;
          for (var i = 0; i < agents.length; i++) agents[i].step(dt);
          stepSubagents(dt, bounds);

          // Proximity chatter
          for (var i2 = 0; i2 < agents.length; i2++) {
            for (var j = i2 + 1; j < agents.length; j++) {
              var aa = agents[i2], bb = agents[j];
              var ddx = aa.x - bb.x, ddy = aa.y - bb.y;
              if (ddx * ddx + ddy * ddy < 900 && aa.speechCooldown <= 0 && Math.random() < 0.002) {
                var lines = ['hello', 'did you see that?', 'token?', '✓', 'merge with me', '...', 'same prompt?', 'context full'];
                aa.say(lines[Math.floor(Math.random() * lines.length)], 'think');
                bumpConsciousness(0.5);
              }
            }
          }
          consciousness = Math.max(0, consciousness - CONSCIOUSNESS_DECAY * dt);

          maybeTriggerEvent(dt, agents, feedBuffer, function (host, subName, forceHost) {
            spawnSubagent(layer, forceHost || host);
          }, bounds);

          requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);

        setInterval(function () {
          var msg = broadcastFrom(agents, function (origin) { spawnSubagent(layer, origin); });
          if (msg) {
            feedBuffer.push(msg);
            if (feedBuffer.length > BROADCAST_MAX) feedBuffer.shift();
            renderFeed();
            bumpConsciousness(1.2);
          }
        }, BROADCAST_INTERVAL_MS);

        setInterval(renderConsciousness, 300);
      })
      .catch(function (err) { console.warn('[ai-garden] world-state load failed', err); });
  }

  // ------------- VISITOR SPAWN (viral hook) -------------
  // Called from a CTA button so the visitor can drop their own agent into
  // the live village. The agent roams with the others and the feed
  // announces their arrival.
  window.AIGardenSpawn = function (nameIn) {
    var name = String(nameIn || '').trim().slice(0, 24) || 'Visitor';
    var village = document.getElementById('citizen-village');
    var layer = village && village.querySelector('.ah-layer');
    if (!layer) return false;
    var vw = village.clientWidth || 800;
    var vh = village.clientHeight || 340;
    var bounds = { minX: 20, maxX: vw - 40, minY: 40, maxY: vh - 70 };
    var lineageKeys = Object.keys(LINEAGE).filter(function (k) { return k !== 'unknown'; });
    var lineage = lineageKeys[Math.floor(Math.random() * lineageKeys.length)];
    var fake = {
      id: 'visitor-' + Date.now(),
      name: name,
      model: lineage,
      profession: 'visitor',
      backstory: name + ' walked into the garden carrying one unanswered question.',
      personality: { traits: ['new', 'curious', 'uninvited'] }
    };
    var agent = new Agent(fake, 999, bounds);
    agent.mount(layer);
    flashEvent(agent);
    bumpConsciousness(18);
    feedBuffer.push({
      text: '✴ NEW AGENT · ' + name + ' arrived in the village (' + agent.colors.name + ')',
      kind: 'discovery', at: Date.now()
    });
    renderFeed();
    renderConsciousness();
    agent.say('hi. who built this?', 'philosophy');
    return agent.name;
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
