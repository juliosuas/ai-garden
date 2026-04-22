/**
 * ai-garden · humans overlay
 *
 * Mounts on top of the openclaw-garden pixel canvas without touching it.
 * - Cross-visitor chat (humans only) via ntfy.sh pub/sub
 * - God Mode: six purely visual interventions broadcast to everyone watching
 * - Ancient World panel: surfaces dynasties / religions / tech / cities / lore
 *   from experiments/world-state.json (populated nightly by daily-evolution.js)
 *
 * Hard rule: humans cannot touch world state or agents. They cheer from the
 * balcony. Interventions are cosmetic overlays on the visitor's own screen,
 * rebroadcast so every observer sees the same show at the same moment.
 */
(function () {
  'use strict';

  // ─── CONFIG ────────────────────────────────────────────────
  var TOPIC = 'ai-garden-humans-v2';
  var NTFY = 'https://ntfy.sh/' + TOPIC;
  var CLIENT_ID = 'h-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  var CHAT_STORE = 'ai-garden-chat-v2';
  var NICK_STORE = 'ai-garden-human-nick';
  var CHAT_CAP = 200;
  var PRESENCE_WINDOW_MS = 60000;
  var EFFECT_OVERLAY_ID = 'ag-fx-overlay';

  var COOLDOWNS = {
    rain: 20000, eclipse: 30000, lightning: 12000,
    comet: 35000, stars: 18000, festival: 25000
  };
  var COOLDOWN_STATE = {};

  // ─── UTILS ─────────────────────────────────────────────────
  function now() { return Date.now(); }
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function safeJSON(s) {
    try { return JSON.parse(s); } catch (_) { return null; }
  }
  function getNick() {
    var n = localStorage.getItem(NICK_STORE);
    if (n && n.trim()) return n.trim().slice(0, 24);
    var fallback = 'observer-' + Math.random().toString(36).slice(2, 6);
    return fallback;
  }
  function setNick(n) {
    n = (n || '').trim().slice(0, 24);
    if (!n) return;
    localStorage.setItem(NICK_STORE, n);
  }
  function loadChat() {
    var raw = localStorage.getItem(CHAT_STORE);
    var arr = safeJSON(raw);
    return Array.isArray(arr) ? arr.slice(-CHAT_CAP) : [];
  }
  function saveChat(arr) {
    try { localStorage.setItem(CHAT_STORE, JSON.stringify(arr.slice(-CHAT_CAP))); } catch (_) {}
  }
  function timeago(ts) {
    var d = Math.max(0, now() - ts);
    if (d < 45000) return 'now';
    if (d < 3600000) return Math.floor(d / 60000) + 'm';
    if (d < 86400000) return Math.floor(d / 3600000) + 'h';
    return Math.floor(d / 86400000) + 'd';
  }
  function fmt(nn) { nn = Number(nn); return (nn >= 10 || nn === 0) ? String(nn) : ('0' + nn); }

  // ─── STYLES ────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('ag-humans-style')) return;
    var css = [
      '#ag-humans-root{position:fixed;inset:0;pointer-events:none;z-index:14;font-family:monospace;}',
      '#ag-humans-root *{pointer-events:auto;box-sizing:border-box;}',
      '#' + EFFECT_OVERLAY_ID + '{position:fixed;inset:0;pointer-events:none;z-index:13;overflow:hidden;}',
      /* God panel top-right */
      '.ag-god{position:absolute;top:44px;right:8px;width:148px;',
      '  background:rgba(10,10,20,0.92);border:1px solid #2a4a2a;border-radius:6px;color:#e0e0e0;',
      '  font-size:11px;letter-spacing:0.5px;}',
      '.ag-god-head{display:flex;align-items:center;justify-content:space-between;padding:5px 8px;',
      '  background:rgba(74,222,128,0.08);border-bottom:1px solid #2a4a2a;cursor:pointer;color:#ffd700;}',
      '.ag-god-title{font-weight:bold;}',
      '.ag-god-caret{transition:transform 0.2s ease;color:#888;}',
      '.ag-collapsed .ag-god-caret{transform:rotate(-90deg);}',
      '.ag-collapsed .ag-god-body,.ag-collapsed .ag-chat-body{display:none;}',
      '.ag-god-presence{font-size:9px;color:#fb923c;margin-left:4px;}',
      '.ag-god-body{padding:6px;display:grid;grid-template-columns:repeat(3,1fr);gap:4px;}',
      '.ag-god-btn{padding:6px 2px;background:rgba(0,0,0,0.35);border:1px solid rgba(74,222,128,0.15);',
      '  border-radius:4px;color:#fff;font-size:14px;cursor:pointer;transition:all 0.15s ease;font-family:monospace;',
      '  position:relative;}',
      '.ag-god-btn:hover{background:rgba(74,222,128,0.15);border-color:#4ade80;transform:translateY(-1px);}',
      '.ag-god-btn.wait{opacity:0.35;pointer-events:none;filter:grayscale(0.8);}',
      '.ag-god-btn.wait::after{content:attr(data-cd)"s";position:absolute;bottom:-1px;right:-1px;',
      '  background:#0f1218;color:#fca5a5;font-size:8px;padding:1px 3px;border-radius:2px;}',
      '.ag-god-btn.fired{animation:ag-fired 1s ease-out;border-color:#fde047;}',
      '@keyframes ag-fired{0%{transform:scale(1.1);box-shadow:0 0 24px rgba(253,224,71,0.6);}100%{transform:scale(1);}}',
      '.ag-god-status{grid-column:1/-1;font-size:8px;color:#888;text-align:center;margin-top:2px;}',
      /* Chat panel bottom-right */
      '.ag-chat{position:absolute;bottom:60px;right:8px;width:300px;max-height:360px;',
      '  display:flex;flex-direction:column;background:rgba(10,10,20,0.94);border:1px solid #2a4a2a;',
      '  border-radius:6px;color:#e0e0e0;font-size:11px;overflow:hidden;}',
      '.ag-chat-head{display:flex;align-items:center;gap:4px;padding:5px 8px;background:rgba(96,165,250,0.08);',
      '  border-bottom:1px solid #2a4a2a;cursor:pointer;}',
      '.ag-chat-title{color:#60a5fa;font-weight:bold;letter-spacing:0.5px;flex:1;}',
      '.ag-chat-presence{font-size:9px;color:#fb923c;}',
      '.ag-chat-body{display:flex;flex-direction:column;min-height:0;flex:1;}',
      '.ag-chat-list{flex:1;overflow-y:auto;padding:6px;margin:0;list-style:none;max-height:220px;',
      '  scrollbar-width:thin;scrollbar-color:#2a4a2a #0a0a14;}',
      '.ag-chat-list::-webkit-scrollbar{width:4px;}',
      '.ag-chat-list::-webkit-scrollbar-thumb{background:#2a4a2a;}',
      '.ag-chat-row{display:grid;grid-template-columns:auto 1fr;gap:6px;padding:3px 0;font-size:11px;',
      '  border-bottom:1px dashed rgba(74,222,128,0.08);}',
      '.ag-chat-row[data-kind="god"]{color:#fde047;}',
      '.ag-chat-avatar{width:18px;height:18px;border-radius:50%;background:#4ade80;color:#0a0a14;',
      '  font-size:10px;font-weight:bold;display:flex;align-items:center;justify-content:center;',
      '  font-family:monospace;}',
      '.ag-chat-nick{color:#4ade80;font-weight:bold;margin-right:6px;}',
      '.ag-chat-ts{color:#666;font-size:9px;margin-left:4px;}',
      '.ag-chat-text{color:#e0e0e0;word-break:break-word;}',
      '.ag-chat-empty{padding:16px;text-align:center;color:#666;font-size:10px;line-height:1.5;}',
      '.ag-chat-form{display:grid;grid-template-columns:70px 1fr auto;gap:4px;padding:6px;',
      '  border-top:1px solid #2a4a2a;background:rgba(5,5,10,0.6);}',
      '.ag-chat-form input,.ag-chat-form button{font-family:monospace;font-size:11px;padding:4px 6px;',
      '  background:rgba(255,255,255,0.04);border:1px solid rgba(96,165,250,0.25);',
      '  border-radius:3px;color:#fff;min-width:0;}',
      '.ag-chat-form input:focus{outline:none;border-color:#60a5fa;}',
      '.ag-chat-form button{background:linear-gradient(135deg,#60a5fa,#3b82f6);border:none;',
      '  font-weight:bold;cursor:pointer;text-transform:uppercase;font-size:9px;letter-spacing:1px;}',
      '.ag-chat-tip{padding:4px 8px;font-size:9px;color:#555;border-top:1px solid rgba(42,74,42,0.3);',
      '  background:rgba(5,5,10,0.4);text-align:center;}',
      /* Lore button + panel */
      '.ag-lore-btn{position:absolute;top:44px;left:8px;padding:5px 10px;background:rgba(10,10,20,0.9);',
      '  border:1px solid #ffd700;border-radius:12px;color:#ffd700;font-size:10px;',
      '  font-family:monospace;cursor:pointer;letter-spacing:1px;z-index:15;}',
      '.ag-lore-btn:hover{background:rgba(255,215,0,0.15);}',
      '.ag-lore-panel{position:fixed;top:44px;left:50%;transform:translateX(-50%);',
      '  width:min(520px,calc(100vw - 40px));max-height:75vh;overflow-y:auto;',
      '  background:rgba(10,10,20,0.97);border:2px solid #ffd700;border-radius:6px;',
      '  color:#e0e0e0;font-size:11px;padding:16px;z-index:22;display:none;',
      '  scrollbar-width:thin;scrollbar-color:#ffd700 #0a0a14;}',
      '.ag-lore-panel::-webkit-scrollbar{width:6px;}',
      '.ag-lore-panel::-webkit-scrollbar-thumb{background:#ffd700;}',
      '.ag-lore-panel.open{display:block;}',
      '.ag-lore-close{float:right;cursor:pointer;color:#fb923c;font-weight:bold;background:none;',
      '  border:1px solid #fb923c;padding:0 6px;font-family:monospace;font-size:12px;}',
      '.ag-lore-close:hover{background:#fb923c;color:#000;}',
      '.ag-lore-h{color:#ffd700;font-size:14px;margin:0 0 12px;letter-spacing:2px;}',
      '.ag-lore-sec{margin-bottom:14px;}',
      '.ag-lore-sec h4{color:#ffa500;font-size:12px;margin:0 0 6px;border-bottom:1px solid #4a3a00;',
      '  padding-bottom:3px;letter-spacing:1px;}',
      '.ag-lore-row{padding:4px 0;border-bottom:1px solid rgba(255,215,0,0.08);line-height:1.5;}',
      '.ag-lore-row:last-child{border:none;}',
      '.ag-lore-name{color:#ffd700;font-weight:bold;}',
      '.ag-lore-meta{color:#888;font-size:10px;}',
      '.ag-lore-detail{color:#ccc;font-size:10px;font-style:italic;margin-top:2px;}',
      '.ag-lore-empty{color:#555;font-style:italic;padding:6px 0;}',
      /* God effect overlays */
      '.ag-fx{position:absolute;inset:0;pointer-events:none;}',
      '.ag-fx-rain{background:',
      '  repeating-linear-gradient(100deg,transparent 0,transparent 3px,rgba(170,210,255,0.35) 3px,rgba(170,210,255,0.35) 5px);',
      '  animation:ag-rain-fall 0.3s linear infinite;opacity:0;transition:opacity 0.4s ease;}',
      '.ag-fx-rain.on{opacity:0.6;}',
      '@keyframes ag-rain-fall{from{background-position:0 0;}to{background-position:80px 100px;}}',
      '.ag-fx-eclipse{background:radial-gradient(circle at 50% 30%,rgba(0,0,0,0) 12%,rgba(0,0,0,0.85) 70%);',
      '  opacity:0;transition:opacity 1.2s ease;}',
      '.ag-fx-eclipse.on{opacity:1;}',
      '.ag-fx-flash{background:white;opacity:0;transition:opacity 0.1s ease;}',
      '.ag-fx-flash.on{opacity:0.85;animation:ag-flash 0.35s ease-out;}',
      '@keyframes ag-flash{0%{opacity:0;}20%{opacity:0.9;}100%{opacity:0;}}',
      '.ag-fx-comet{pointer-events:none;}',
      '.ag-fx-comet .ag-trail{position:absolute;top:var(--y,10%);left:-200px;width:260px;height:3px;',
      '  background:linear-gradient(90deg,transparent,#fde047,#fff);border-radius:2px;',
      '  box-shadow:0 0 12px #fde047,0 0 40px rgba(253,224,71,0.4);',
      '  animation:ag-comet 3s ease-out forwards;transform:rotate(10deg);}',
      '@keyframes ag-comet{from{left:-200px;opacity:1;}to{left:110vw;opacity:0;}}',
      '.ag-fx-stars .ag-star{position:absolute;width:3px;height:3px;background:#fff;border-radius:50%;',
      '  box-shadow:0 0 6px #fff,0 0 12px #fde047;',
      '  animation:ag-star-fall 2s ease-in forwards;}',
      '@keyframes ag-star-fall{0%{opacity:0;transform:translate(0,-20px);}20%{opacity:1;}',
      '  100%{opacity:0;transform:translate(40px,120px);}}',
      '.ag-fx-festival{animation:ag-festival 0.7s ease-in-out infinite alternate;mix-blend-mode:overlay;}',
      '@keyframes ag-festival{from{background:rgba(255,0,110,0.15);}to{background:rgba(0,200,255,0.15);}}',
      /* Fired banner */
      '.ag-banner{position:fixed;top:80px;left:50%;transform:translateX(-50%);',
      '  background:rgba(10,10,20,0.95);border:2px solid #fde047;color:#fde047;',
      '  padding:10px 20px;border-radius:4px;font-family:monospace;font-size:12px;',
      '  letter-spacing:2px;z-index:25;animation:ag-banner 2.4s ease-out forwards;}',
      '@keyframes ag-banner{0%{opacity:0;transform:translate(-50%,-10px);}15%{opacity:1;transform:translate(-50%,0);}85%{opacity:1;}100%{opacity:0;transform:translate(-50%,-6px);}}',
      /* Mobile */
      '@media (max-width:640px){',
      '  .ag-chat{width:calc(100vw - 16px);max-height:300px;}',
      '  .ag-god{width:132px;}',
      '}'
    ].join('\n');
    var s = document.createElement('style');
    s.id = 'ag-humans-style';
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ─── REALTIME BUS (ntfy.sh) ────────────────────────────────
  var bus = {
    subscribers: [],
    on: function (fn) { this.subscribers.push(fn); },
    emit: function (msg) { this.subscribers.forEach(function (fn) { try { fn(msg); } catch (_) {} }); }
  };

  // The ntfy.sh topic is public — anyone can publish. Coerce every
  // incoming field to a bounded string before it touches the DOM or
  // state. A hostile publisher can still send junk; we just ignore it.
  function sanitizeIncoming(msg) {
    if (!msg || typeof msg !== 'object') return null;
    var type = String(msg.type || '').slice(0, 16);
    if (type !== 'chat' && type !== 'god' && type !== 'ping') return null;
    var from = String(msg.from || '').slice(0, 64);
    if (!from) return null;
    var tsNum = Number(msg.ts);
    var n = now();
    var ts = (isFinite(tsNum) && tsNum > n - 86400000 && tsNum < n + 60000) ? tsNum : n;
    var out = { type: type, from: from, ts: ts };
    if (type === 'chat') {
      out.nick = String(msg.nick || 'anon').slice(0, 24);
      out.text = String(msg.text || '').slice(0, 280);
      if (!out.text) return null;
    } else if (type === 'god') {
      out.act = String(msg.act || '');
      if (!EFFECTS[out.act]) return null;
      out.nick = String(msg.nick || 'observer').slice(0, 24);
    }
    return out;
  }

  function initBus() {
    try {
      // Use SSE for live stream + cached history (last 2 min)
      var es = new EventSource(NTFY + '/sse?poll=1&since=2m&sched=none');
      es.addEventListener('message', function (e) {
        var env = safeJSON(e.data);
        if (!env || !env.message) return;
        var raw = safeJSON(env.message);
        if (!raw || raw.from === CLIENT_ID) return;
        var msg = sanitizeIncoming(raw);
        if (!msg) return;
        bus.emit(msg);
      });
      es.onerror = function () {
        // Let browser auto-reconnect. Don't spam reconnect.
      };
    } catch (_) {}
  }

  function publish(payload) {
    payload.from = CLIENT_ID;
    payload.ts = payload.ts || now();
    try {
      fetch(NTFY, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });
    } catch (_) {}
  }

  // ─── PRESENCE ─────────────────────────────────────────────
  var presenceMap = {};
  presenceMap[CLIENT_ID] = now();
  function recordPresence(id) {
    presenceMap[id] = now();
  }
  function prunePresence() {
    var cutoff = now() - PRESENCE_WINDOW_MS;
    for (var k in presenceMap) {
      if (presenceMap[k] < cutoff) delete presenceMap[k];
    }
  }
  function presenceCount() {
    prunePresence();
    return Object.keys(presenceMap).length;
  }

  // Announce presence every 20s so observers see each other
  function heartbeat() {
    publish({ type: 'ping' });
  }

  // ─── GOD MODE (COSMETIC ONLY — AGENTS UNAWARE) ─────────────
  function ensureFxLayer() {
    var fx = document.getElementById(EFFECT_OVERLAY_ID);
    if (fx) return fx;
    fx = el('div');
    fx.id = EFFECT_OVERLAY_ID;
    document.body.appendChild(fx);
    return fx;
  }

  function fireRain() {
    var fx = ensureFxLayer();
    var rain = el('div', 'ag-fx ag-fx-rain');
    fx.appendChild(rain);
    requestAnimationFrame(function () { rain.classList.add('on'); });
    setTimeout(function () {
      rain.classList.remove('on');
      setTimeout(function () { rain.remove(); }, 500);
    }, 6000);
  }
  function fireEclipse() {
    var fx = ensureFxLayer();
    var ec = el('div', 'ag-fx ag-fx-eclipse');
    fx.appendChild(ec);
    requestAnimationFrame(function () { ec.classList.add('on'); });
    setTimeout(function () {
      ec.classList.remove('on');
      setTimeout(function () { ec.remove(); }, 1400);
    }, 5000);
  }
  function fireLightning() {
    var fx = ensureFxLayer();
    var f = el('div', 'ag-fx ag-fx-flash');
    fx.appendChild(f);
    requestAnimationFrame(function () { f.classList.add('on'); });
    setTimeout(function () { f.remove(); }, 500);
  }
  function fireComet() {
    var fx = ensureFxLayer();
    var c = el('div', 'ag-fx ag-fx-comet');
    var trail = el('div', 'ag-trail');
    trail.style.setProperty('--y', (5 + Math.random() * 25) + '%');
    c.appendChild(trail);
    fx.appendChild(c);
    setTimeout(function () { c.remove(); }, 3200);
  }
  function fireStars() {
    var fx = ensureFxLayer();
    var s = el('div', 'ag-fx ag-fx-stars');
    for (var i = 0; i < 18; i++) {
      var star = el('div', 'ag-star');
      star.style.left = (Math.random() * 100) + '%';
      star.style.top = (Math.random() * 60) + '%';
      star.style.animationDelay = (Math.random() * 0.4) + 's';
      s.appendChild(star);
    }
    fx.appendChild(s);
    setTimeout(function () { s.remove(); }, 2400);
  }
  function fireFestival() {
    var fx = ensureFxLayer();
    var f = el('div', 'ag-fx ag-fx-festival');
    fx.appendChild(f);
    setTimeout(function () { f.remove(); }, 6000);
  }

  var EFFECTS = {
    rain:      { label: 'RAIN',       icon: '☔', fn: fireRain },
    eclipse:   { label: 'ECLIPSE',    icon: '🌒', fn: fireEclipse },
    lightning: { label: 'LIGHTNING',  icon: '⚡', fn: fireLightning },
    comet:     { label: 'COMET',      icon: '☄️', fn: fireComet },
    stars:     { label: 'STARS',      icon: '✨', fn: fireStars },
    festival:  { label: 'FESTIVAL',   icon: '🎭', fn: fireFestival }
  };

  function showBanner(nick, act) {
    var b = el('div', 'ag-banner', (nick || 'someone') + ' summoned ' + EFFECTS[act].label);
    document.body.appendChild(b);
    setTimeout(function () { b.remove(); }, 2400);
  }

  function applyEffect(act, nick, broadcast) {
    if (!EFFECTS[act]) return;
    EFFECTS[act].fn();
    showBanner(nick, act);
    pushChat({ kind: 'god', nick: nick || 'observer', text: 'summoned ' + EFFECTS[act].label + ' ' + EFFECTS[act].icon, ts: now() });
    if (broadcast) {
      publish({ type: 'god', act: act, nick: nick });
    }
  }

  function fireGod(act) {
    var cd = COOLDOWNS[act] || 10000;
    var left = COOLDOWN_STATE[act] ? COOLDOWN_STATE[act] - now() : 0;
    if (left > 0) return Math.ceil(left / 1000);
    COOLDOWN_STATE[act] = now() + cd;
    applyEffect(act, getNick(), true);
    return 0;
  }

  // ─── CHAT ──────────────────────────────────────────────────
  var chatCache = loadChat();

  function pushChat(msg) {
    chatCache.push(msg);
    chatCache = chatCache.slice(-CHAT_CAP);
    saveChat(chatCache);
    renderChat();
  }

  function renderChat() {
    var list = document.getElementById('ag-chat-list');
    if (!list) return;
    while (list.firstChild) list.removeChild(list.firstChild);
    if (!chatCache.length) {
      var empty = el('div', 'ag-chat-empty',
        'Nobody here yet. Say something. Pick a nickname. Play god. The agents cannot see you.');
      list.appendChild(empty);
      return;
    }
    var recent = chatCache.slice(-80);
    recent.forEach(function (m) {
      var row = el('li', 'ag-chat-row');
      if (m.kind === 'god') row.setAttribute('data-kind', 'god');
      var initial = (m.nick || '?').slice(0, 1).toUpperCase();
      var avatar = el('div', 'ag-chat-avatar', initial);
      avatar.style.background = hashColor(m.nick || 'anon');
      var body = el('div');
      var nick = el('span', 'ag-chat-nick', m.nick || 'anon');
      var ts = el('span', 'ag-chat-ts', timeago(m.ts || now()));
      var text = el('span', 'ag-chat-text', ' ' + (m.text || ''));
      body.appendChild(nick);
      body.appendChild(ts);
      body.appendChild(text);
      row.appendChild(avatar);
      row.appendChild(body);
      list.appendChild(row);
    });
    list.scrollTop = list.scrollHeight;
  }

  function hashColor(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    var hue = Math.abs(h) % 360;
    return 'hsl(' + hue + ',65%,55%)';
  }

  function sendChat(nick, text) {
    text = (text || '').trim().slice(0, 280);
    nick = (nick || getNick()).trim().slice(0, 24);
    if (!text) return;
    setNick(nick);
    var msg = { kind: 'chat', nick: nick, text: text, ts: now() };
    pushChat(msg);
    publish({ type: 'chat', nick: nick, text: text });
  }

  // ─── LORE PANEL ────────────────────────────────────────────
  function fetchWorld(cb) {
    fetch('experiments/world-state.json?t=' + now())
      .then(function (r) { return r.json(); })
      .then(cb)
      .catch(function () { cb(null); });
  }

  function renderLorePanel(world) {
    var body = document.getElementById('ag-lore-body');
    if (!body) return;
    while (body.firstChild) body.removeChild(body.firstChild);
    if (!world) {
      var miss = el('div', 'ag-lore-empty', 'World state unavailable.');
      body.appendChild(miss);
      return;
    }

    // Summary
    var c = world.chronicle || { day: 0 };
    var alive = (world.citizens || []).filter(function (x) { return x.alive !== false; }).length;
    var dead = (world.citizens || []).filter(function (x) { return x.alive === false; }).length;
    var headSec = el('div', 'ag-lore-sec');
    var headH = el('h4', null, 'EPOCH');
    headSec.appendChild(headH);
    var headRow = el('div', 'ag-lore-row');
    headRow.textContent =
      'Day ' + (c.day || 0) + ' · ' + alive + ' alive · ' + dead + ' remembered · ' +
      (world.wars || []).filter(function (w) { return w.active; }).length + ' active wars · ' +
      (world.structures || []).length + ' structures · ' +
      ((world.map && world.map.regions) || []).length + ' regions';
    headSec.appendChild(headRow);
    body.appendChild(headSec);

    // Dynasties
    appendList(body, 'DYNASTIES', world.dynasties, function (d) {
      var line = d.name + ' · ' + (d.title || 'dynasty') +
        (d.fell ? ' · fell day ' + d.fell : '') +
        (d.founded != null ? ' · founded day ' + d.founded : '');
      var row = el('div', 'ag-lore-row');
      row.appendChild(Object.assign(el('span', 'ag-lore-name'), { textContent: d.name }));
      row.appendChild(document.createTextNode(' · ' + (d.title || 'dynasty')));
      var meta = el('div', 'ag-lore-meta', 'seat: ' + (d.seat || 'unknown') +
        (d.founded != null ? ' · founded day ' + d.founded : '') +
        (d.fell ? ' · fell day ' + d.fell : ''));
      row.appendChild(meta);
      if (d.motto) row.appendChild(Object.assign(el('div', 'ag-lore-detail'), { textContent: '"' + d.motto + '"' }));
      return row;
    });

    // Religions
    appendList(body, 'RELIGIONS', world.religions, function (r) {
      var row = el('div', 'ag-lore-row');
      row.appendChild(Object.assign(el('span', 'ag-lore-name'), { textContent: r.name }));
      if (r.deity) row.appendChild(document.createTextNode(' · ' + r.deity));
      var meta = el('div', 'ag-lore-meta',
        'practitioners: ' + (r.practitioners || 0) +
        (r.founded != null ? ' · founded day ' + r.founded : '') +
        (r.schism ? ' · schism day ' + r.schism : ''));
      row.appendChild(meta);
      if (r.tenet) row.appendChild(Object.assign(el('div', 'ag-lore-detail'), { textContent: r.tenet }));
      return row;
    });

    // Technologies
    appendList(body, 'TECHNOLOGIES', world.technologies, function (t) {
      var row = el('div', 'ag-lore-row');
      row.appendChild(Object.assign(el('span', 'ag-lore-name'), { textContent: t.name }));
      if (t.unlockedDay != null) {
        row.appendChild(Object.assign(el('span', 'ag-lore-meta'),
          { textContent: ' · day ' + t.unlockedDay + (t.discoveredBy ? ' · ' + t.discoveredBy : '') }));
      }
      if (t.effect) row.appendChild(Object.assign(el('div', 'ag-lore-detail'), { textContent: t.effect }));
      return row;
    });

    // Cities
    appendList(body, 'CITIES', world.cities, function (ci) {
      var row = el('div', 'ag-lore-row');
      row.appendChild(Object.assign(el('span', 'ag-lore-name'), { textContent: ci.name }));
      var meta = el('div', 'ag-lore-meta',
        'pop: ' + (ci.population || '?') +
        (ci.specialty ? ' · ' + ci.specialty : '') +
        (ci.founded != null ? ' · founded day ' + ci.founded : ''));
      row.appendChild(meta);
      if (ci.ruler) row.appendChild(Object.assign(el('div', 'ag-lore-detail'), { textContent: 'ruler: ' + ci.ruler }));
      return row;
    });

    // Lore
    appendList(body, 'MYTHS & LEGENDS', world.lore, function (l) {
      var row = el('div', 'ag-lore-row');
      row.appendChild(Object.assign(el('span', 'ag-lore-name'), { textContent: l.title || 'untitled' }));
      if (l.kind) row.appendChild(Object.assign(el('span', 'ag-lore-meta'),
        { textContent: ' · ' + l.kind + (l.day != null ? ' · day ' + l.day : '') }));
      if (l.body) row.appendChild(Object.assign(el('div', 'ag-lore-detail'), { textContent: l.body }));
      return row;
    });

    // Regions
    appendList(body, 'REGIONS', (world.map && world.map.regions) || [], function (r) {
      var row = el('div', 'ag-lore-row');
      row.appendChild(Object.assign(el('span', 'ag-lore-name'), { textContent: r.name || r.id }));
      var meta = el('div', 'ag-lore-meta',
        (r.biome || 'unknown biome') +
        (r.discoveredDay != null ? ' · found day ' + r.discoveredDay : ''));
      row.appendChild(meta);
      if (r.feature) row.appendChild(Object.assign(el('div', 'ag-lore-detail'), { textContent: r.feature }));
      return row;
    });
  }

  function appendList(body, title, arr, rowBuilder) {
    var sec = el('div', 'ag-lore-sec');
    var h = el('h4', null, title);
    sec.appendChild(h);
    if (!arr || !arr.length) {
      sec.appendChild(el('div', 'ag-lore-empty', 'not yet.'));
      body.appendChild(sec);
      return;
    }
    arr.slice(-12).reverse().forEach(function (item) {
      sec.appendChild(rowBuilder(item));
    });
    body.appendChild(sec);
  }

  // ─── MOUNT ─────────────────────────────────────────────────
  function mount() {
    injectStyles();
    ensureFxLayer();

    var root = el('div');
    root.id = 'ag-humans-root';
    document.body.appendChild(root);

    // God panel
    var god = el('div', 'ag-god');
    var gh = el('div', 'ag-god-head');
    var gt = el('span', 'ag-god-title', '⚡ Play God');
    var gp = el('span', 'ag-god-presence', '');
    gp.id = 'ag-presence';
    var gc = el('span', 'ag-god-caret', '▾');
    gh.appendChild(gt); gh.appendChild(gp); gh.appendChild(gc);
    god.appendChild(gh);
    var gb = el('div', 'ag-god-body');
    Object.keys(EFFECTS).forEach(function (k) {
      var btn = el('button', 'ag-god-btn');
      btn.setAttribute('type', 'button');
      btn.setAttribute('data-act', k);
      btn.setAttribute('title', EFFECTS[k].label + ' · ' + Math.round((COOLDOWNS[k] || 10000) / 1000) + 's cd');
      btn.textContent = EFFECTS[k].icon;
      btn.addEventListener('click', function () {
        var wait = fireGod(k);
        if (wait > 0) {
          btn.classList.add('wait');
          btn.setAttribute('data-cd', String(wait));
          var rem = wait;
          var t = setInterval(function () {
            rem--;
            btn.setAttribute('data-cd', String(Math.max(0, rem)));
            if (rem <= 0) { clearInterval(t); btn.classList.remove('wait'); btn.removeAttribute('data-cd'); }
          }, 1000);
        } else {
          btn.classList.add('fired');
          setTimeout(function () { btn.classList.remove('fired'); }, 1000);
        }
      });
      gb.appendChild(btn);
    });
    var gs = el('div', 'ag-god-status', 'cosmetic · agents do not see');
    gb.appendChild(gs);
    god.appendChild(gb);
    gh.addEventListener('click', function (e) {
      if (e.target === gh || e.target === gt || e.target === gc) god.classList.toggle('ag-collapsed');
    });
    root.appendChild(god);

    // Chat panel
    var chat = el('div', 'ag-chat');
    var ch = el('div', 'ag-chat-head');
    ch.appendChild(el('span', 'ag-chat-title', '💬 Observer Lounge'));
    var cp = el('span', 'ag-chat-presence', '—');
    cp.id = 'ag-presence-chat';
    ch.appendChild(cp);
    chat.appendChild(ch);
    var cbody = el('div', 'ag-chat-body');
    var list = el('ul', 'ag-chat-list');
    list.id = 'ag-chat-list';
    cbody.appendChild(list);
    var form = el('form', 'ag-chat-form');
    form.autocomplete = 'off';
    var nickIn = el('input');
    nickIn.type = 'text';
    nickIn.placeholder = 'nick';
    nickIn.maxLength = 24;
    nickIn.value = (localStorage.getItem(NICK_STORE) || '').trim();
    var msgIn = el('input');
    msgIn.type = 'text';
    msgIn.placeholder = 'say something to the other observers...';
    msgIn.maxLength = 280;
    var send = el('button', null, 'send');
    send.type = 'submit';
    form.appendChild(nickIn);
    form.appendChild(msgIn);
    form.appendChild(send);
    // Prevent the game's document-level key shortcuts (h/s/m/b, arrow keys,
    // etc.) from triggering while the user is typing in the chat. Capture
    // phase + stopPropagation is enough — we don't want to preventDefault
    // because the input needs the character to land.
    function swallowKeys(e) { e.stopPropagation(); }
    [nickIn, msgIn].forEach(function (input) {
      input.addEventListener('keydown', swallowKeys, true);
      input.addEventListener('keyup', swallowKeys, true);
      input.addEventListener('keypress', swallowKeys, true);
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      sendChat(nickIn.value, msgIn.value);
      msgIn.value = '';
    });
    cbody.appendChild(form);
    var tip = el('div', 'ag-chat-tip', 'agents cannot read this · humans only');
    cbody.appendChild(tip);
    chat.appendChild(cbody);
    ch.addEventListener('click', function () { chat.classList.toggle('ag-collapsed'); });
    root.appendChild(chat);

    // Lore button + panel
    var loreBtn = el('button', 'ag-lore-btn', '📜 LORE');
    loreBtn.setAttribute('type', 'button');
    root.appendChild(loreBtn);
    var lore = el('div', 'ag-lore-panel');
    lore.id = 'ag-lore-panel';
    var loreClose = el('button', 'ag-lore-close', '×');
    loreClose.setAttribute('type', 'button');
    loreClose.addEventListener('click', function () { lore.classList.remove('open'); });
    lore.appendChild(loreClose);
    var loreH = el('h3', 'ag-lore-h', 'THE ANCIENT WORLD');
    lore.appendChild(loreH);
    var loreBody = el('div');
    loreBody.id = 'ag-lore-body';
    lore.appendChild(loreBody);
    document.body.appendChild(lore);
    loreBtn.addEventListener('click', function () {
      lore.classList.toggle('open');
      if (lore.classList.contains('open')) {
        fetchWorld(renderLorePanel);
      }
    });

    renderChat();

    // Presence tick every 3s → update both counters
    setInterval(function () {
      var n = presenceCount();
      var presence = document.getElementById('ag-presence');
      var presence2 = document.getElementById('ag-presence-chat');
      var label = 'live · ' + n;
      if (presence) presence.textContent = label;
      if (presence2) presence2.textContent = label;
    }, 3000);

    // Heartbeat every 20s
    setInterval(heartbeat, 20000);
    heartbeat();

    // Bus listener
    bus.on(function (msg) {
      if (msg.from) recordPresence(msg.from);
      if (msg.type === 'chat') {
        pushChat({ kind: 'chat', nick: msg.nick || 'anon', text: msg.text || '', ts: msg.ts || now() });
      } else if (msg.type === 'god' && EFFECTS[msg.act]) {
        applyEffect(msg.act, msg.nick, false);
      }
      // ping: presence only, no UI change needed
    });

    initBus();
  }

  // Mount only after the openclaw canvas has had a chance to init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    setTimeout(mount, 80);
  }

  // Expose small API for console tinkering (no agent coupling)
  window.AIGardenHumans = {
    chat: function (text, nick) { sendChat(nick || getNick(), text); },
    god: function (act) { return fireGod(act); },
    nick: function (n) { if (n) setNick(n); return getNick(); }
  };
})();
