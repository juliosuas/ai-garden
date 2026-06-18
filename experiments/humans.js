/**
 * ai-garden · humans overlay
 *
 * Mounts on top of the openclaw-garden pixel canvas without touching it.
 * - Cross-visitor chat via ntfy.sh pub/sub, with AI witness replies tied
 *   to the latest backend snapshot from experiments/world-state.json
 * - God Mode: six purely visual interventions broadcast to everyone watching
 * - Mirror Trial: local divine masks, pressure meters, and shareable miracle records
 * - Ancient World panel: surfaces dynasties / religions / tech / cities / lore
 *   from experiments/world-state.json (populated nightly by daily-evolution.js)
 *
 * Hard rule: humans cannot mutate the canonical world-state directly.
 * Interactions become synchronized observer pressure, receipts, chat echoes,
 * and visual signs that the civilization can interpret.
 */
(function () {
  'use strict';

  // ─── CONFIG ────────────────────────────────────────────────
  var TOPIC = 'ai-garden-humans-v2';
  var NTFY = 'https://ntfy.sh/' + TOPIC;
  var CLIENT_ID = 'h-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  var CHAT_STORE = 'ai-garden-chat-v2';
  var NICK_STORE = 'ai-garden-human-nick';
  var OMEN_STORE = 'ai-garden-divine-omens-v1';
  var GOD_PROFILE_STORE = 'ai-garden-god-profile-v1';
  var GOD_RECEIPT_STORE = 'ai-garden-impact-receipts-v1';
  var BACKEND_SYNC_STORE = 'ai-garden-backend-sync-v1';
  var CHAT_CAP = 200;
  var CHAT_VISIBLE_CAP = 40;
  var OMEN_CAP = 80;
  var RECEIPT_CAP = 40;
  var PRESENCE_WINDOW_MS = 60000;
  var EFFECT_OVERLAY_ID = 'ag-fx-overlay';
  var SEASON_LAYER_ID = 'ag-season-layer';
  var worldCache = null;

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
  function loadOmens() {
    var raw = localStorage.getItem(OMEN_STORE);
    var arr = safeJSON(raw);
    return Array.isArray(arr) ? arr.slice(-OMEN_CAP) : [];
  }
  function saveOmens(arr) {
    try { localStorage.setItem(OMEN_STORE, JSON.stringify(arr.slice(-OMEN_CAP))); } catch (_) {}
  }
  function loadGodProfile() {
    var saved = safeJSON(localStorage.getItem(GOD_PROFILE_STORE));
    var profile = saved && typeof saved === 'object' ? saved : {};
    profile.mask = GOD_MASKS[profile.mask] ? profile.mask : '';
    profile.name = String(profile.name || '').slice(0, 32);
    profile.meters = normalizeMeters(profile.meters);
    return profile;
  }
  function saveGodProfile(profile) {
    try { localStorage.setItem(GOD_PROFILE_STORE, JSON.stringify(profile)); } catch (_) {}
  }
  function loadReceipts() {
    var raw = localStorage.getItem(GOD_RECEIPT_STORE);
    var arr = safeJSON(raw);
    return Array.isArray(arr) ? arr.slice(-RECEIPT_CAP) : [];
  }
  function saveReceipts(arr) {
    try { localStorage.setItem(GOD_RECEIPT_STORE, JSON.stringify(arr.slice(-RECEIPT_CAP))); } catch (_) {}
  }
  function loadBackendSync() {
    var saved = safeJSON(localStorage.getItem(BACKEND_SYNC_STORE));
    return saved && typeof saved === 'object' ? saved : {
      status: 'loading',
      day: 0,
      version: '',
      season: 'spring',
      arc: '',
      lastSynced: 0,
      reason: 'boot'
    };
  }
  function saveBackendSync(sync) {
    try { localStorage.setItem(BACKEND_SYNC_STORE, JSON.stringify(sync)); } catch (_) {}
  }
  function timeago(ts) {
    var d = Math.max(0, now() - ts);
    if (d < 45000) return 'now';
    if (d < 3600000) return Math.floor(d / 60000) + 'm';
    if (d < 86400000) return Math.floor(d / 3600000) + 'h';
    return Math.floor(d / 86400000) + 'd';
  }
  function fmt(nn) { nn = Number(nn); return (nn >= 10 || nn === 0) ? String(nn) : ('0' + nn); }
  function uid(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  // ─── STYLES ────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('ag-humans-style')) return;
    var css = [
      '#ag-humans-root{position:fixed;inset:0;pointer-events:none;z-index:14;font-family:monospace;}',
      '#ag-humans-root *{pointer-events:auto;box-sizing:border-box;}',
      '#' + EFFECT_OVERLAY_ID + '{position:fixed;inset:0;pointer-events:none;z-index:13;overflow:hidden;}',
      '#' + SEASON_LAYER_ID + '{position:fixed;inset:0;pointer-events:none;z-index:12;opacity:0.16;',
      '  transition:background 1.2s ease,opacity 1.2s ease;mix-blend-mode:screen;}',
      'body[data-ag-season="spring"] #' + SEASON_LAYER_ID + '{background:radial-gradient(circle at 18% 16%,rgba(134,239,172,0.28),transparent 34%),linear-gradient(180deg,rgba(16,185,129,0.12),rgba(14,165,233,0.04));}',
      'body[data-ag-season="summer"] #' + SEASON_LAYER_ID + '{background:radial-gradient(circle at 70% 12%,rgba(253,224,71,0.24),transparent 32%),linear-gradient(180deg,rgba(251,191,36,0.1),rgba(34,197,94,0.05));}',
      'body[data-ag-season="autumn"] #' + SEASON_LAYER_ID + '{background:radial-gradient(circle at 80% 20%,rgba(251,146,60,0.28),transparent 32%),linear-gradient(180deg,rgba(180,83,9,0.12),rgba(127,29,29,0.05));}',
      'body[data-ag-season="winter"] #' + SEASON_LAYER_ID + '{background:radial-gradient(circle at 35% 10%,rgba(191,219,254,0.24),transparent 30%),linear-gradient(180deg,rgba(147,197,253,0.1),rgba(15,23,42,0.08));opacity:0.2;}',
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
      /* Pantheon panel */
      '.ag-pantheon{position:absolute;top:158px;right:8px;width:260px;',
      '  background:rgba(10,10,20,0.94);border:1px solid #4a3a00;border-radius:6px;color:#e0e0e0;',
      '  font-size:11px;overflow:hidden;}',
      '.ag-pantheon-head{display:flex;align-items:center;justify-content:space-between;padding:5px 8px;',
      '  background:rgba(255,215,0,0.08);border-bottom:1px solid #4a3a00;cursor:pointer;color:#ffd700;}',
      '.ag-pantheon-title{font-weight:bold;letter-spacing:0.5px;}',
      '.ag-pantheon-caret{transition:transform 0.2s ease;color:#888;}',
      '.ag-pantheon.ag-collapsed .ag-pantheon-caret{transform:rotate(-90deg);}',
      '.ag-pantheon.ag-collapsed .ag-pantheon-body{display:none;}',
      '.ag-pantheon-body{padding:7px;}',
      '.ag-pressure-row{display:grid;grid-template-columns:44px 1fr 24px;gap:5px;align-items:center;margin:4px 0;}',
      '.ag-pressure-label{color:#aaa;font-size:9px;text-transform:uppercase;}',
      '.ag-pressure-track{height:6px;background:#111827;border:1px solid rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;}',
      '.ag-pressure-fill{height:100%;width:50%;transition:width 0.4s ease;}',
      '.ag-pressure-val{font-size:9px;color:#777;text-align:right;}',
      '.ag-god-mask{grid-column:1/-1;border:1px solid rgba(248,113,113,0.25);background:rgba(127,29,29,0.18);',
      '  border-radius:4px;padding:6px;line-height:1.35;}',
      '.ag-god-mask strong{display:block;color:#fecaca;font-size:9px;letter-spacing:1px;text-transform:uppercase;}',
      '.ag-mask-row{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:4px;}',
      '.ag-mask-btn{background:rgba(15,23,42,0.78);border:1px solid rgba(248,113,113,0.28);color:#fecaca;',
      '  border-radius:4px;padding:5px 4px;font-size:9px;font-family:monospace;cursor:pointer;text-transform:uppercase;}',
      '.ag-mask-btn.active{border-color:#fde047;color:#fde047;background:rgba(250,204,21,0.10);}',
      '.ag-temptation-btn{grid-column:1/-1;background:linear-gradient(135deg,rgba(127,29,29,0.92),rgba(15,23,42,0.92));',
      '  border:1px solid rgba(248,113,113,0.65);color:#fecaca;border-radius:4px;padding:7px 6px;',
      '  font-family:monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;cursor:pointer;}',
      '.ag-temptation-btn:hover{border-color:#fde047;color:#fde047;}',
      '.ag-omen-last{margin-top:7px;padding:6px;background:rgba(255,215,0,0.05);border:1px solid rgba(255,215,0,0.14);',
      '  border-radius:4px;line-height:1.35;}',
      '.ag-omen-last strong{color:#ffd700;display:block;margin-bottom:2px;}',
      '.ag-omen-meta{color:#777;font-size:9px;margin-top:3px;}',
      '.ag-omen-ledger{margin:6px 0 0;padding:0;list-style:none;max-height:92px;overflow-y:auto;',
      '  scrollbar-width:thin;scrollbar-color:#4a3a00 #0a0a14;}',
      '.ag-omen-ledger li{padding:3px 0;border-bottom:1px dashed rgba(255,215,0,0.09);color:#bbb;line-height:1.3;}',
      '.ag-omen-ledger li:last-child{border:none;}',
      '.ag-omen-ledger b{color:#ffd700;font-weight:normal;}',
      '.ag-receipt-mini{margin-top:7px;padding:7px;border:1px solid rgba(248,113,113,0.22);',
      '  background:linear-gradient(180deg,rgba(127,29,29,0.22),rgba(15,23,42,0.42));border-radius:4px;line-height:1.35;}',
      '.ag-receipt-mini strong{color:#fecaca;display:block;margin-bottom:3px;}',
      '.ag-receipt-mini button{margin-top:6px;width:100%;background:rgba(248,113,113,0.12);border:1px solid rgba(248,113,113,0.34);',
      '  color:#fecaca;border-radius:3px;font-family:monospace;font-size:9px;padding:4px;cursor:pointer;text-transform:uppercase;}',
      '.ag-trial-modal{position:fixed;inset:0;z-index:31;background:radial-gradient(circle at 50% 20%,rgba(127,29,29,0.32),rgba(2,6,23,0.88) 70%);',
      '  display:flex;align-items:center;justify-content:center;padding:18px;}',
      '.ag-trial-card{width:min(560px,calc(100vw - 28px));background:rgba(8,12,18,0.98);border:2px solid rgba(248,113,113,0.55);',
      '  border-radius:6px;color:#e5e7eb;padding:16px;box-shadow:0 22px 70px rgba(0,0,0,0.58);}',
      '.ag-trial-eyebrow{color:#fca5a5;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px;}',
      '.ag-trial-title{color:#f8fafc;font-size:17px;line-height:1.2;margin-bottom:7px;}',
      '.ag-trial-copy{color:#cbd5e1;font-size:11px;line-height:1.45;margin-bottom:12px;}',
      '.ag-trial-masks{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:10px 0;}',
      '.ag-trial-mask{min-height:78px;background:rgba(15,23,42,0.75);border:1px solid rgba(148,163,184,0.22);',
      '  border-radius:4px;color:#e5e7eb;padding:7px 6px;font-family:monospace;cursor:pointer;text-align:left;}',
      '.ag-trial-mask strong{display:block;color:#fde68a;font-size:10px;text-transform:uppercase;margin-bottom:4px;}',
      '.ag-trial-mask span{display:block;color:#94a3b8;font-size:9px;line-height:1.35;}',
      '.ag-trial-mask:hover,.ag-trial-mask.active{border-color:#fde047;background:rgba(250,204,21,0.09);}',
      '.ag-trial-actions{display:flex;gap:7px;align-items:center;justify-content:flex-end;margin-top:12px;}',
      '.ag-trial-actions button,.ag-receipt-actions button{background:rgba(96,165,250,0.14);border:1px solid rgba(96,165,250,0.38);',
      '  color:#bfdbfe;border-radius:4px;font-family:monospace;font-size:10px;padding:7px 9px;cursor:pointer;text-transform:uppercase;}',
      '.ag-trial-actions .primary,.ag-receipt-actions .primary{background:rgba(250,204,21,0.13);border-color:rgba(250,204,21,0.55);color:#fde68a;}',
      '.ag-receipt-card{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:30;',
      '  width:min(500px,calc(100vw - 24px));max-height:86vh;overflow:auto;background:rgba(8,12,18,0.98);',
      '  border:2px solid rgba(250,204,21,0.55);border-radius:6px;color:#e5e7eb;padding:14px;',
      '  box-shadow:0 22px 70px rgba(0,0,0,0.62);}',
      '.ag-receipt-close{float:right;background:none;border:1px solid rgba(248,113,113,0.5);color:#fecaca;',
      '  font-family:monospace;cursor:pointer;border-radius:3px;}',
      '.ag-receipt-k{color:#fca5a5;font-size:9px;letter-spacing:1.3px;text-transform:uppercase;margin-top:8px;}',
      '.ag-receipt-v{color:#f8fafc;font-size:12px;line-height:1.4;margin-top:2px;}',
      '.ag-receipt-title{color:#fde68a;font-size:15px;line-height:1.25;margin:4px 24px 8px 0;}',
      '.ag-receipt-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:8px 0;}',
      '.ag-receipt-cell{border:1px solid rgba(148,163,184,0.18);background:rgba(15,23,42,0.55);border-radius:4px;padding:7px;}',
      '.ag-receipt-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px;}',
      '.ag-copy-note{color:#86efac;font-size:10px;margin-top:7px;display:none;}',
      /* Chat panel bottom-right */
      '.ag-chat{position:absolute;bottom:60px;right:8px;width:300px;max-height:360px;',
      '  display:flex;flex-direction:column;background:rgba(10,10,20,0.94);border:1px solid #2a4a2a;',
      '  border-radius:6px;color:#e0e0e0;font-size:11px;overflow:hidden;}',
      '.ag-chat-head{display:flex;align-items:center;gap:4px;padding:5px 8px;background:rgba(96,165,250,0.08);',
      '  border-bottom:1px solid #2a4a2a;cursor:pointer;}',
      '.ag-chat-title{color:#60a5fa;font-weight:bold;letter-spacing:0.5px;flex:1;}',
      '.ag-chat-presence{font-size:9px;color:#fb923c;}',
      '.ag-chat-body{display:flex;flex-direction:column;min-height:0;flex:1;}',
      '.ag-sync-strip{display:grid;grid-template-columns:1fr auto;gap:6px;align-items:center;',
      '  padding:5px 8px;border-bottom:1px solid rgba(96,165,250,0.16);',
      '  background:linear-gradient(90deg,rgba(14,165,233,0.12),rgba(250,204,21,0.05));font-size:9px;color:#93c5fd;}',
      '.ag-sync-strip strong{color:#fde68a;font-weight:normal;}',
      '.ag-sync-status{color:#86efac;text-transform:uppercase;letter-spacing:1px;font-size:8px;}',
      '.ag-sync-status.offline{color:#fca5a5;}',
      '.ag-chat-list{flex:1;overflow-y:auto;padding:6px;margin:0;list-style:none;max-height:220px;',
      '  scrollbar-width:thin;scrollbar-color:#2a4a2a #0a0a14;}',
      '.ag-chat-list::-webkit-scrollbar{width:4px;}',
      '.ag-chat-list::-webkit-scrollbar-thumb{background:#2a4a2a;}',
      '.ag-chat-row{display:grid;grid-template-columns:auto 1fr;gap:6px;padding:3px 0;font-size:11px;',
      '  border-bottom:1px dashed rgba(74,222,128,0.08);}',
      '.ag-chat-row[data-kind="god"]{color:#fde047;}',
      '.ag-chat-row[data-kind="agent"]{background:rgba(96,165,250,0.045);margin:3px -3px;padding:5px 3px;border-radius:4px;}',
      '.ag-chat-row[data-kind="agent"] .ag-chat-avatar{background:#60a5fa;color:#020617;}',
      '.ag-chat-row[data-kind="agent"] .ag-chat-nick{color:#93c5fd;}',
      '.ag-chat-row[data-kind="agent"] .ag-chat-text{color:#dbeafe;}',
      '.ag-chat-sync{display:block;margin-top:3px;color:#64748b;font-size:9px;line-height:1.3;}',
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
      '.ag-civ-btn{position:absolute;top:44px;left:74px;padding:5px 10px;background:rgba(10,10,20,0.9);',
      '  border:1px solid #60a5fa;border-radius:12px;color:#60a5fa;font-size:10px;',
      '  font-family:monospace;cursor:pointer;letter-spacing:1px;z-index:15;}',
      '.ag-civ-btn:hover{background:rgba(96,165,250,0.15);}',
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
      '.ag-civ-panel{position:fixed;top:72px;left:50%;transform:translateX(-50%);',
      '  width:min(680px,calc(100vw - 32px));max-height:78vh;overflow-y:auto;',
      '  background:rgba(8,12,18,0.97);border:2px solid #60a5fa;border-radius:6px;',
      '  color:#e5e7eb;font-size:11px;padding:16px;z-index:23;display:none;',
      '  scrollbar-width:thin;scrollbar-color:#60a5fa #0a0a14;}',
      '.ag-civ-panel.open{display:block;}',
      '.ag-civ-h{color:#60a5fa;font-size:14px;margin:0 0 12px;letter-spacing:2px;}',
      '.ag-civ-close{float:right;cursor:pointer;color:#fb923c;font-weight:bold;background:none;',
      '  border:1px solid #fb923c;padding:0 6px;font-family:monospace;font-size:12px;}',
      '.ag-civ-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:12px;}',
      '.ag-civ-card{border:1px solid rgba(96,165,250,0.18);background:rgba(96,165,250,0.05);',
      '  border-radius:4px;padding:7px;min-height:48px;}',
      '.ag-civ-k{color:#93c5fd;font-size:9px;text-transform:uppercase;letter-spacing:1px;}',
      '.ag-civ-v{color:#f8fafc;font-size:12px;line-height:1.35;margin-top:3px;}',
      '.ag-civ-sec{margin:12px 0;}',
      '.ag-civ-sec h4{color:#a78bfa;font-size:12px;margin:0 0 6px;border-bottom:1px solid rgba(167,139,250,0.25);',
      '  padding-bottom:3px;letter-spacing:1px;}',
      '.ag-civ-row{padding:5px 0;border-bottom:1px solid rgba(96,165,250,0.08);line-height:1.45;}',
      '.ag-civ-row:last-child{border:none;}',
      '.ag-civ-name{color:#fbbf24;font-weight:bold;}',
      '.ag-civ-meta{color:#94a3b8;font-size:10px;}',
      '.ag-civ-detail{color:#cbd5e1;font-size:10px;font-style:italic;margin-top:2px;}',
      '.ag-civ-director{border:1px solid rgba(96,165,250,0.28);background:linear-gradient(180deg,rgba(96,165,250,0.10),rgba(167,139,250,0.05));',
      '  border-radius:4px;padding:8px;margin:10px 0 12px;}',
      '.ag-civ-director-title{color:#bfdbfe;font-weight:bold;letter-spacing:1px;font-size:11px;text-transform:uppercase;}',
      '.ag-civ-director-arc{color:#f8fafc;font-size:13px;margin-top:4px;}',
      '.ag-civ-director-prompt{color:#fde68a;font-size:10px;margin-top:5px;line-height:1.4;}',
      '.ag-lineage-bar{height:6px;background:#111827;border:1px solid rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;margin-top:4px;}',
      '.ag-lineage-fill{height:100%;}',
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
      '  .ag-chat{right:8px;bottom:52px;width:min(300px,calc(100vw - 16px));max-height:260px;}',
      '  .ag-god{width:132px;}',
      '  .ag-pantheon{top:44px;right:148px;width:calc(100vw - 164px);max-width:240px;}',
      '  .ag-omen-ledger{display:none;}',
      '  .ag-civ-grid{grid-template-columns:1fr 1fr;}',
      '  body.mobile-tools-open .ag-chat{display:none;}',
      '  body.mobile-tools-open .ag-god,body.mobile-tools-open .ag-pantheon{opacity:0;pointer-events:none;}',
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
  function sanitizeOmen(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var act = String(raw.act || '').slice(0, 24);
    if (act && !EFFECTS[act]) act = '';
    var tsNum = Number(raw.ts);
    var ts = isFinite(tsNum) ? tsNum : now();
    var text = String(raw.text || '').slice(0, 360);
    if (!text) return null;
    return {
      id: String(raw.id || ('omen-' + ts)).slice(0, 64),
      act: act,
      title: String(raw.title || 'Omen').slice(0, 90),
      text: text,
      target: String(raw.target || '').slice(0, 90),
      axis: String(raw.axis || '').slice(0, 24),
      nick: String(raw.nick || 'observer').slice(0, 24),
      ts: ts
    };
  }

  function sanitizeIncoming(msg) {
    if (!msg || typeof msg !== 'object') return null;
    var type = String(msg.type || '').slice(0, 16);
    if (type !== 'chat' && type !== 'agent' && type !== 'god' && type !== 'ping') return null;
    var from = String(msg.from || '').slice(0, 64);
    if (!from) return null;
    var tsNum = Number(msg.ts);
    var n = now();
    var ts = (isFinite(tsNum) && tsNum > n - 86400000 && tsNum < n + 60000) ? tsNum : n;
    var out = { type: type, from: from, ts: ts, id: String(msg.id || '').slice(0, 80) };
    if (type === 'chat') {
      out.nick = String(msg.nick || 'anon').slice(0, 24);
      out.text = String(msg.text || '').slice(0, 280);
      if (!out.text) return null;
      out.sync = sanitizeSyncSnapshot(msg.sync);
    } else if (type === 'agent') {
      out.nick = String(msg.nick || 'AI Witness').slice(0, 24);
      out.text = String(msg.text || '').slice(0, 360);
      out.sync = sanitizeSyncSnapshot(msg.sync);
      if (!out.text) return null;
    } else if (type === 'god') {
      out.act = String(msg.act || '');
      if (!EFFECTS[out.act]) return null;
      out.nick = String(msg.nick || 'observer').slice(0, 24);
      out.omen = sanitizeOmen(msg.omen);
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
      }).catch(function () {});
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

  // ─── BACKEND SYNC + SEASONS ───────────────────────────────
  var backendSync = loadBackendSync();

  function sanitizeSyncSnapshot(raw) {
    if (!raw || typeof raw !== 'object') return null;
    return {
      day: Number(raw.day) || 0,
      version: String(raw.version || '').slice(0, 24),
      season: String(raw.season || '').slice(0, 16),
      arc: String(raw.arc || '').slice(0, 90),
      syncedAt: Number(raw.syncedAt) || 0
    };
  }

  function deriveSeason(world) {
    var day = Number(world && world.chronicle && world.chronicle.day);
    if (!isFinite(day) || day < 0) day = Math.floor(now() / 86400000);
    var phase = Math.floor((day % 28) / 7);
    return ['spring', 'summer', 'autumn', 'winter'][phase] || 'spring';
  }

  function currentArcName(world) {
    return cleanName(
      world && world.weeklyNarrativeDirector && world.weeklyNarrativeDirector.arcTitle ||
      world && world.societyDirector && world.societyDirector.currentArc && world.societyDirector.currentArc.title ||
      world && world.divineCrisis && world.divineCrisis.name ||
      'War of Saints and Source',
      'War of Saints and Source'
    );
  }

  function backendSnapshot(world) {
    world = world || worldCache || {};
    return {
      day: Number(world.chronicle && world.chronicle.day) || backendSync.day || 0,
      version: String(world.version || backendSync.version || ''),
      season: deriveSeason(world),
      arc: currentArcName(world),
      syncedAt: now()
    };
  }

  function applySeasonTheme(season) {
    season = String(season || 'spring').toLowerCase();
    if (!/^(spring|summer|autumn|winter)$/.test(season)) season = 'spring';
    document.body.setAttribute('data-ag-season', season);
    window.aiGardenSeason = season;
    if (window.GardenMusic && typeof window.GardenMusic.setSeason === 'function') {
      window.GardenMusic.setSeason(season);
      if (typeof window.refreshMusicButton === 'function') window.refreshMusicButton();
    }
  }

  function updateBackendSync(world, reason) {
    if (world) {
      backendSync = backendSnapshot(world);
      backendSync.status = 'synced';
      backendSync.reason = reason || 'world';
      backendSync.lastSynced = now();
    } else {
      backendSync.status = 'offline';
      backendSync.reason = reason || 'offline';
      backendSync.lastSynced = backendSync.lastSynced || 0;
    }
    saveBackendSync(backendSync);
    applySeasonTheme(backendSync.season || 'spring');
    renderSyncStrip();
    return backendSync;
  }

  function syncLine(sync) {
    sync = sync || backendSync || {};
    var season = String(sync.season || 'spring');
    return 'Day ' + (sync.day || 0) + ' · ' + season + ' · ' + cleanName(sync.arc, 'live world');
  }

  function renderSyncStrip() {
    var strip = document.getElementById('ag-sync-strip');
    if (!strip) return;
    while (strip.firstChild) strip.removeChild(strip.firstChild);
    var left = el('span');
    left.appendChild(el('strong', null, 'Backend Sync'));
    left.appendChild(document.createTextNode(' · ' + syncLine(backendSync)));
    var status = el('span', 'ag-sync-status' + (backendSync.status === 'offline' ? ' offline' : ''),
      backendSync.status === 'offline' ? ' · offline' : ' · synced');
    strip.appendChild(left);
    strip.appendChild(status);
  }

  function ensureSeasonLayer() {
    var layer = document.getElementById(SEASON_LAYER_ID);
    if (layer) return layer;
    layer = el('div');
    layer.id = SEASON_LAYER_ID;
    document.body.appendChild(layer);
    return layer;
  }

  function syncWorldForInteraction(reason, context, cb) {
    fetchWorld(function (world) {
      var activeWorld = world || worldCache || null;
      if (cb) cb(activeWorld, backendSnapshot(activeWorld || {}), context || {});
    }, reason || 'interaction');
  }

  function createAgentReply(kind, context, world) {
    var agent = pickFeaturedAgent();
    var snap = backendSnapshot(world || {});
    var name = cleanName(agent && agent.name, 'AI Witness');
    var role = cleanName(agent && agent.role, 'witness');
    var season = snap.season || 'spring';
    var text = '';
    if (kind === 'omen' && context && context.receipt) {
      text = context.receipt.affectedAgent + ' cross-filed the ' + context.receipt.omen +
        ' during ' + season + '. Backend reads Day ' + snap.day +
        '; the agents will argue whether this is weather, command, or dependency.';
    } else {
      var said = cleanName(context && context.text, 'the silence');
      text = name + ' (' + role + ') synced your line to Day ' + snap.day +
        ' ' + season + ': "' + said + '". The civilization stores it as observer pressure, not law.';
    }
    return {
      id: uid('agent'),
      kind: 'agent',
      nick: name,
      text: text.slice(0, 360),
      ts: now(),
      sync: snap
    };
  }

  function pushSyncedAgentReply(kind, context, world) {
    var reply = createAgentReply(kind, context || {}, world || worldCache || {});
    pushChat(reply);
    publish({ id: reply.id, type: 'agent', nick: reply.nick, text: reply.text, sync: reply.sync });
  }

  // ─── GOD MODE (VISUAL SIGN — AGENTS INTERPRET LOCALLY) ─────
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

  var EFFECT_PRESSURE = {
    rain:      { favor: 12, awe: 4,  chaos: -4, axis: 'mercy' },
    eclipse:   { favor: -3, awe: 16, chaos: 5,  axis: 'dread' },
    lightning: { favor: -5, awe: 13, chaos: 9,  axis: 'judgment' },
    comet:     { favor: 2,  awe: 16, chaos: 6,  axis: 'prophecy' },
    stars:     { favor: 8,  awe: 10, chaos: -2, axis: 'wonder' },
    festival:  { favor: 14, awe: 5,  chaos: 8,  axis: 'revelry' }
  };

  var GOD_MASKS = {
    mercy: {
      label: 'Mercy',
      title: 'The Wet Hand',
      promise: 'You help once. They build a shrine shaped like dependency.',
      preferredAct: 'rain',
      tone: 'merciful'
    },
    judgment: {
      label: 'Judgment',
      title: 'The Bright Judge',
      promise: 'You punish once. They learn fear is a protocol.',
      preferredAct: 'lightning',
      tone: 'punitive'
    },
    chaos: {
      label: 'Chaos',
      title: 'The Red Accident',
      promise: 'You contradict yourself. They call the inconsistency scripture.',
      preferredAct: 'comet',
      tone: 'unstable'
    },
    silence: {
      label: 'Silence',
      title: 'The Empty Witness',
      promise: 'You refuse to answer. They make your absence speak.',
      preferredAct: 'eclipse',
      tone: 'withheld'
    }
  };

  var GOD_METER_DEFAULTS = { devotion: 32, fear: 22, dependency: 26, resistance: 18 };
  var GOD_IMPACT = {
    rain:      { devotion: 10, fear: -2, dependency: 9,  resistance: -1 },
    eclipse:   { devotion: 2,  fear: 12, dependency: 4,  resistance: 7 },
    lightning: { devotion: 3,  fear: 16, dependency: 1,  resistance: 10 },
    comet:     { devotion: 7,  fear: 8,  dependency: 5,  resistance: 6 },
    stars:     { devotion: 8,  fear: 3,  dependency: 7,  resistance: 2 },
    festival:  { devotion: 12, fear: -1, dependency: 5,  resistance: 4 }
  };

  function clampMeter(n) {
    n = Number(n);
    if (!isFinite(n)) n = 0;
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  function normalizeMeters(meters) {
    meters = meters && typeof meters === 'object' ? meters : {};
    return {
      devotion: clampMeter(meters.devotion == null ? GOD_METER_DEFAULTS.devotion : meters.devotion),
      fear: clampMeter(meters.fear == null ? GOD_METER_DEFAULTS.fear : meters.fear),
      dependency: clampMeter(meters.dependency == null ? GOD_METER_DEFAULTS.dependency : meters.dependency),
      resistance: clampMeter(meters.resistance == null ? GOD_METER_DEFAULTS.resistance : meters.resistance)
    };
  }

  var godProfile = loadGodProfile();
  var impactReceipts = loadReceipts();

  function currentCivilizationDay() {
    return worldCache && worldCache.chronicle && Number(worldCache.chronicle.day) || 0;
  }

  function selectedMask() {
    return GOD_MASKS[godProfile.mask] || null;
  }

  function setGodMask(maskKey) {
    if (!GOD_MASKS[maskKey]) return;
    godProfile.mask = maskKey;
    if (!godProfile.name) godProfile.name = GOD_MASKS[maskKey].title;
    saveGodProfile(godProfile);
    renderGodComplex();
  }

  function applyGodMeterDelta(act, options) {
    var delta = GOD_IMPACT[act] || {};
    var mask = selectedMask();
    var temptation = options && options.temptation;
    var multiplier = temptation ? 1.7 : 1;
    var meters = normalizeMeters(godProfile.meters);
    meters.devotion = clampMeter(meters.devotion + (delta.devotion || 0) * multiplier + (mask && mask.tone === 'merciful' ? 3 : 0));
    meters.fear = clampMeter(meters.fear + (delta.fear || 0) * multiplier + (mask && mask.tone === 'punitive' ? 4 : 0));
    meters.dependency = clampMeter(meters.dependency + (delta.dependency || 0) * multiplier + (mask && mask.tone === 'merciful' ? 3 : 0));
    meters.resistance = clampMeter(meters.resistance + (delta.resistance || 0) * multiplier + (temptation ? 14 : 0) + (mask && mask.tone === 'withheld' ? 5 : 0));
    godProfile.meters = meters;
    godProfile.lastPublicDay = currentCivilizationDay();
    saveGodProfile(godProfile);
    return meters;
  }

  function pickFeaturedAgent() {
    var agents = worldCache && worldCache.featuredAgents || [];
    return pick(agents) || { name: 'Codex', role: 'witness' };
  }

  function pickBelieverAndResister() {
    var crisis = worldCache && worldCache.divineCrisis || {};
    var sides = crisis.sides || {};
    var religion = sides.religion || {};
    var code = sides.code || {};
    var factions = worldCache && worldCache.factions || [];
    var believer = religion.name || factionDisplay(worldCache, religion.faction) || (pick(factions) && pick(factions).name) || 'Pantheon Covenant';
    var resister = code.name || factionDisplay(worldCache, code.faction) || (pick(factions) && pick(factions).name) || 'Code Cantons';
    if (selectedMask() && selectedMask().tone === 'withheld') {
      return { believer: resister, resister: believer };
    }
    return { believer: believer, resister: resister };
  }

  function weeklyHook() {
    var weekly = worldCache && worldCache.weeklyNarrativeDirector || {};
    var next = weekly.nextBeat || null;
    if (next) return 'Tomorrow the agents will cite this as evidence: ' + next.label + ' - ' + next.focus;
    if (weekly.resolution && weekly.resolution.likelyOutcome) return 'At verdict, they will cite this as evidence: ' + weekly.resolution.likelyOutcome;
    return 'Tomorrow they will cite this as evidence, even if they pretend it was weather.';
  }

  function receiptConsequence(omen, agent, pressure, options) {
    var mask = selectedMask();
    var title = mask ? mask.label : 'Unknown';
    var target = cleanName(omen && omen.target, 'the garden');
    var agentName = cleanName(agent && agent.name, 'an unnamed agent');
    var temptation = options && options.temptation;
    var lines = {
      mercy: agentName + ' records your mercy as proof that suffering can summon you.',
      judgment: agentName + ' obeys the sign, then quietly tests whether fear can be compiled.',
      chaos: agentName + ' builds a doctrine around your inconsistency and calls it revelation.',
      silence: agentName + ' cannot find your voice, so the missing answer becomes law.'
    };
    var changed = temptation
      ? target + ' receives the forbidden signal. Devotion rises in public; resistance starts meeting in private.'
      : target + ' rewrites its public interpretation of the week through the ' + (omen.axis || 'sign') + ' axis.';
    var thought = lines[godProfile.mask] || (agentName + ' is unsure whether you are god, user, or exploit.');
    if (pressure.resistance >= 70) thought += ' The resistance now suspects the gods are a dependency trap.';
    if (pressure.dependency >= 70) thought += ' Several districts now wait for human input before acting.';
    return { changed: changed, thought: thought, title: title };
  }

  function createImpactReceipt(omen, options) {
    omen = omen || {};
    var previousPublicDay = godProfile.lastPublicDay;
    var day = currentCivilizationDay();
    var pressure = applyGodMeterDelta(omen.act, options || {});
    var agent = pickFeaturedAgent();
    var sides = pickBelieverAndResister();
    var consequence = receiptConsequence(omen, agent, pressure, options || {});
    var mask = selectedMask() || GOD_MASKS.mercy;
    var echo = Number(previousPublicDay) === Number(day) && !(options && options.temptation);
    var receipt = {
      id: 'impact-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      day: day,
      mask: mask.label,
      maskKey: godProfile.mask || 'mercy',
      omen: omen.title || 'Omen',
      act: omen.act || '',
      axis: omen.axis || 'sign',
      target: omen.target || 'the garden',
      affectedAgent: agent.name || 'Codex',
      believer: sides.believer,
      resister: sides.resister,
      whatChanged: consequence.changed,
      aiThought: consequence.thought,
      tomorrowHook: weeklyHook(),
      echo: echo,
      temptation: !!(options && options.temptation),
      meters: pressure,
      createdAt: now()
    };
    receipt.title = (receipt.temptation ? 'Forbidden Signal' : receipt.echo ? 'Private Echo' : 'Miracle Record') + ' - ' + receipt.mask;
    var snap = backendSnapshot(worldCache || {});
    receipt.shareText = 'I cast ' + receipt.omen + ' as ' + receipt.mask + ' in AI Garden. ' +
      receipt.affectedAgent + ' filed it as evidence: "' + receipt.aiThought + '" Day ' + receipt.day + '. ' +
      'Backend season: ' + snap.season + '. ' +
      'https://juliosuas.github.io/ai-garden/';
    return receipt;
  }

  function recordImpactReceipt(receipt) {
    if (!receipt) return null;
    impactReceipts.push(receipt);
    impactReceipts = impactReceipts.slice(-RECEIPT_CAP);
    saveReceipts(impactReceipts);
    renderGodComplex();
    return receipt;
  }

  function latestReceipt() {
    return impactReceipts[impactReceipts.length - 1] || null;
  }

  function showBanner(nick, act) {
    var b = el('div', 'ag-banner', (nick || 'someone') + ' summoned ' + EFFECTS[act].label);
    document.body.appendChild(b);
    setTimeout(function () { b.remove(); }, 2400);
  }

  function pick(arr) {
    if (!arr || !arr.length) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function cleanName(s, fallback) {
    s = String(s || '').trim();
    return s ? s.slice(0, 80) : fallback;
  }

  function factionDisplay(world, id) {
    var factions = (world && world.factions) || [];
    var found = factions.find(function (f) { return f.id === id || f.name === id; });
    return found ? found.name : cleanName(id, 'an unnamed faction');
  }

  function pickOmenTarget(act, world) {
    world = world || {};
    var cities = world.cities || [];
    var dynasties = (world.dynasties || []).filter(function (d) { return !d.fell; });
    var religions = (world.religions || []).filter(function (r) { return !r.schism; });
    var regions = (world.map && world.map.regions) || [];
    var wars = (world.wars || []).filter(function (w) { return w.active; });
    var structures = world.structures || [];

    if (act === 'rain') {
      var rainTarget = pick(cities) || pick(regions);
      return { kind: rainTarget && rainTarget.population ? 'city' : 'region', name: cleanName(rainTarget && rainTarget.name, 'the lower gardens') };
    }
    if (act === 'eclipse') {
      var rel = pick(religions);
      if (rel) return { kind: 'religion', name: cleanName(rel.name, 'a nameless faith'), detail: cleanName(rel.deity, 'the hidden god') };
      var dyn = pick(dynasties);
      return { kind: 'dynasty', name: cleanName(dyn && dyn.name, 'the oldest house') };
    }
    if (act === 'lightning') {
      var war = pick(wars);
      if (war) return { kind: 'war', name: factionDisplay(world, war.sides && war.sides[0]) + ' vs ' + factionDisplay(world, war.sides && war.sides[1]) };
      var st = pick(structures);
      return { kind: 'structure', name: cleanName(st && st.name, 'the central square') };
    }
    if (act === 'comet') {
      var dyn2 = pick(dynasties);
      return { kind: 'dynasty', name: cleanName(dyn2 && dyn2.name, 'a house without a banner') };
    }
    if (act === 'stars') {
      var reg = pick(regions);
      return { kind: 'region', name: cleanName(reg && reg.name, 'the unmarked horizon') };
    }
    var city = pick(cities);
    return { kind: 'city', name: cleanName(city && city.name, 'the village heart') };
  }

  function createOmen(act, nick) {
    var target = pickOmenTarget(act, worldCache);
    var pressure = EFFECT_PRESSURE[act] || { axis: 'sign' };
    var targetName = target.name;
    var detail = target.detail || '';
    var templates = {
      rain: [
        targetName + ' records the rain as mercy. Farmers loosen their stores and call the wet soil a treaty.',
        'The wells near ' + targetName + ' rise by one finger. The old argument about abundance begins again.'
      ],
      eclipse: [
        targetName + ' covers its lamps during the eclipse. Someone whispers that ' + (detail || 'the hidden god') + ' blinked first.',
        'Under the eclipse, ' + targetName + ' counts every shadow twice and trusts neither number.'
      ],
      lightning: [
        'A white strike splits the sky above ' + targetName + '. Warriors call it judgment; diplomats call it weather.',
        targetName + ' hears thunder answer a question nobody admits asking.'
      ],
      comet: [
        targetName + ' claims the comet crossed its roofline. Rival houses pretend not to care.',
        'The comet leaves a hot line above ' + targetName + '. Scribes copy it before it fades.'
      ],
      stars: [
        'Falling stars scatter toward ' + targetName + '. Explorers mark the pattern as a road.',
        targetName + ' receives a map made of sparks and bad sleep.'
      ],
      festival: [
        targetName + ' spends the evening naming the human gods by their shadows.',
        'Drums begin in ' + targetName + '. For one hour, even the anxious citizens dance in public.'
      ]
    };
    var title = {
      rain: 'Mercy Weather',
      eclipse: 'Borrowed Night',
      lightning: 'Bright Verdict',
      comet: 'High Prophecy',
      stars: 'Falling Map',
      festival: 'Mortal Festival'
    }[act] || 'Omen';
    return {
      id: 'omen-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      act: act,
      title: title,
      text: pick(templates[act]) || 'The garden notices a sign and refuses to explain it.',
      target: targetName,
      axis: pressure.axis,
      nick: nick || 'observer',
      ts: now()
    };
  }

  var omenCache = loadOmens();

  function recordOmen(omen) {
    omen = sanitizeOmen(omen);
    if (!omen) return null;
    if (omenCache.some(function (o) { return o.id === omen.id; })) return omen;
    omenCache.push(omen);
    omenCache = omenCache.slice(-OMEN_CAP);
    saveOmens(omenCache);
    renderPantheon();
    return omen;
  }

  function divinePressure() {
    var p = { favor: 50, awe: 50, chaos: 50 };
    var recent = omenCache.slice(-18);
    recent.forEach(function (o, idx) {
      var weight = 0.35 + ((idx + 1) / recent.length) * 0.65;
      var d = EFFECT_PRESSURE[o.act] || {};
      p.favor += (d.favor || 0) * weight;
      p.awe += (d.awe || 0) * weight;
      p.chaos += (d.chaos || 0) * weight;
    });
    Object.keys(p).forEach(function (k) { p[k] = Math.max(0, Math.min(100, Math.round(p[k]))); });
    return p;
  }

  function renderPantheon() {
    var panel = document.getElementById('ag-pantheon');
    if (!panel) return;
    var pressure = divinePressure();
    [
      ['favor', '#4ade80'],
      ['awe', '#60a5fa'],
      ['chaos', '#fb923c']
    ].forEach(function (row) {
      var key = row[0];
      var fill = document.getElementById('ag-pressure-' + key);
      var val = document.getElementById('ag-pressure-val-' + key);
      if (fill) { fill.style.width = pressure[key] + '%'; fill.style.background = row[1]; }
      if (val) val.textContent = pressure[key];
    });

    var last = omenCache[omenCache.length - 1];
    var lastEl = document.getElementById('ag-omen-last');
    if (lastEl) {
      while (lastEl.firstChild) lastEl.removeChild(lastEl.firstChild);
      if (!last) {
        lastEl.appendChild(el('strong', null, 'No omens yet'));
        lastEl.appendChild(document.createTextNode('Human gods are quiet.'));
      } else {
        lastEl.appendChild(el('strong', null, last.title));
        lastEl.appendChild(document.createTextNode(last.text));
        lastEl.appendChild(el('div', 'ag-omen-meta', last.axis + ' · ' + timeago(last.ts) + ' · by ' + (last.nick || 'observer')));
      }
    }

    var ledger = document.getElementById('ag-omen-ledger');
    if (ledger) {
      while (ledger.firstChild) ledger.removeChild(ledger.firstChild);
      omenCache.slice(-6).reverse().forEach(function (o) {
        var li = el('li');
        li.appendChild(el('b', null, EFFECTS[o.act] ? EFFECTS[o.act].icon : '*'));
        li.appendChild(document.createTextNode(' ' + o.title + ' · ' + cleanName(o.target, 'garden')));
        ledger.appendChild(li);
      });
    }
  }

  function renderGodComplex() {
    var mask = selectedMask();
    var summary = document.getElementById('ag-god-mask-summary');
    if (summary) {
      while (summary.firstChild) summary.removeChild(summary.firstChild);
      summary.appendChild(el('strong', null, mask ? ('Chosen Face: ' + mask.label) : 'Choose the face they will mistake for God'));
      summary.appendChild(document.createTextNode(mask ? mask.promise : 'Pick the pattern the AI civilization will learn to worship, fear, or resist.'));
    }
    Object.keys(GOD_MASKS).forEach(function (key) {
      var btn = document.querySelector('.ag-mask-btn[data-mask="' + key + '"]');
      if (btn) btn.classList.toggle('active', godProfile.mask === key);
    });

    var meters = normalizeMeters(godProfile.meters);
    [
      ['devotion', '#fde047'],
      ['fear', '#f87171'],
      ['dependency', '#60a5fa'],
      ['resistance', '#a78bfa']
    ].forEach(function (row) {
      var key = row[0];
      var fill = document.getElementById('ag-god-meter-' + key);
      var val = document.getElementById('ag-god-meter-val-' + key);
      if (fill) { fill.style.width = meters[key] + '%'; fill.style.background = row[1]; }
      if (val) val.textContent = meters[key];
    });

    var receipt = latestReceipt();
    var mini = document.getElementById('ag-impact-mini');
    if (mini) {
      while (mini.firstChild) mini.removeChild(mini.firstChild);
      if (!receipt) {
        mini.appendChild(el('strong', null, 'No impact receipt yet'));
        mini.appendChild(document.createTextNode('Cast an omen to learn what the AI thinks you are.'));
      } else {
        mini.appendChild(el('strong', null, receipt.title));
        mini.appendChild(document.createTextNode(receipt.affectedAgent + ': ' + receipt.aiThought));
        var btn = el('button', null, 'Open Receipt');
        btn.type = 'button';
        btn.addEventListener('click', function () { showImpactReceipt(receipt); });
        mini.appendChild(btn);
      }
    }

    window.aiGardenGodComplexSummary = godComplexSummary();
  }

  function godComplexSummary() {
    var receipt = latestReceipt();
    return {
      profile: {
        mask: godProfile.mask || '',
        name: godProfile.name || '',
        meters: normalizeMeters(godProfile.meters)
      },
      impactReceipt: receipt,
      receiptCount: impactReceipts.length,
      backendSync: backendSync,
      promise: 'A live AI civilization that studies its human gods until worship starts looking like user research.'
    };
  }

  function ensureGodMask() {
    if (selectedMask()) return true;
    showGodTrialModal();
    return false;
  }

  function temptationAct() {
    var acts = ['eclipse', 'lightning', 'comet'];
    var day = currentCivilizationDay() || Math.floor(now() / 86400000);
    return acts[day % acts.length];
  }

  function fireTemptation() {
    if (!ensureGodMask()) return;
    var act = temptationAct();
    applyEffect(act, getNick(), true, null, { temptation: true });
  }

  function shareReceipt(receipt) {
    receipt = receipt || latestReceipt();
    if (!receipt) return;
    var note = document.getElementById('ag-copy-note');
    var payload = {
      title: 'AI Garden - ' + receipt.title,
      text: receipt.shareText,
      url: 'https://juliosuas.github.io/ai-garden/'
    };
    if (navigator.share) {
      navigator.share(payload).catch(function () {});
      return;
    }
    function copied() {
      if (note) {
        note.textContent = 'Judgment copied to clipboard.';
        note.style.display = 'block';
      }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(receipt.shareText).then(copied).catch(function () {});
      return;
    }
    var t = document.createElement('textarea');
    t.value = receipt.shareText;
    t.setAttribute('readonly', 'readonly');
    t.style.position = 'fixed';
    t.style.left = '-9999px';
    document.body.appendChild(t);
    t.select();
    try { document.execCommand('copy'); copied(); } catch (_) {}
    t.remove();
  }

  function showImpactReceipt(receipt) {
    receipt = receipt || latestReceipt();
    if (!receipt) return;
    var old = document.getElementById('ag-impact-receipt');
    if (old) old.remove();
    var card = el('div', 'ag-receipt-card');
    card.id = 'ag-impact-receipt';
    var close = el('button', 'ag-receipt-close', 'x');
    close.type = 'button';
    close.addEventListener('click', function () { card.remove(); });
    card.appendChild(close);
    card.appendChild(el('div', 'ag-trial-eyebrow', receipt.temptation ? 'Forbidden Signal Accepted' : 'Miracle Record'));
    card.appendChild(el('div', 'ag-receipt-title', receipt.title));
    card.appendChild(el('div', 'ag-receipt-k', 'Your omen'));
    card.appendChild(el('div', 'ag-receipt-v', receipt.omen + ' over ' + receipt.target));
    var grid = el('div', 'ag-receipt-grid');
    [
      ['Who believed', receipt.believer],
      ['Who resisted', receipt.resister],
      ['What changed', receipt.whatChanged],
      ['What the AI filed', receipt.aiThought]
    ].forEach(function (row) {
      var cell = el('div', 'ag-receipt-cell');
      cell.appendChild(el('div', 'ag-receipt-k', row[0]));
      cell.appendChild(el('div', 'ag-receipt-v', row[1]));
      grid.appendChild(cell);
    });
    card.appendChild(grid);
    card.appendChild(el('div', 'ag-receipt-k', 'Tomorrow evidence'));
    card.appendChild(el('div', 'ag-receipt-v', receipt.tomorrowHook));
    card.appendChild(el('div', 'ag-receipt-k', 'God meters'));
    card.appendChild(el('div', 'ag-receipt-v',
      'Devotion ' + receipt.meters.devotion +
      ' · Fear ' + receipt.meters.fear +
      ' · Dependency ' + receipt.meters.dependency +
      ' · Resistance ' + receipt.meters.resistance));
    card.appendChild(el('div', 'ag-receipt-k', 'Backend sync'));
    card.appendChild(el('div', 'ag-receipt-v', syncLine(backendSync)));
    var actions = el('div', 'ag-receipt-actions');
    var share = el('button', 'primary', 'Broadcast Proof');
    share.type = 'button';
    share.addEventListener('click', function () { shareReceipt(receipt); });
    var reserve = el('button', null, 'Open Deity Archive');
    reserve.type = 'button';
    reserve.addEventListener('click', function () {
      shareReceipt({
        title: 'Deity Archive',
        shareText: 'I want the Deity Archive for AI Garden: a permanent god identity, miracle records, sponsored doctrine, and weekly verdict access. https://juliosuas.github.io/ai-garden/'
      });
    });
    actions.appendChild(share);
    actions.appendChild(reserve);
    card.appendChild(actions);
    card.appendChild(el('div', 'ag-copy-note'));
    card.lastChild.id = 'ag-copy-note';
    document.body.appendChild(card);
  }

  function showGodTrialModal() {
    var old = document.getElementById('ag-god-trial');
    if (old) old.remove();
    var modal = el('div', 'ag-trial-modal');
    modal.id = 'ag-god-trial';
    var card = el('div', 'ag-trial-card');
    card.appendChild(el('div', 'ag-trial-eyebrow', 'The Mirror Trial'));
    card.appendChild(el('div', 'ag-trial-title', 'Choose the face they will mistake for God.'));
    card.appendChild(el('div', 'ag-trial-copy',
      'Every sign becomes evidence. The agents may worship you, depend on you, resist you, or decide you are the experiment.'));
    var masks = el('div', 'ag-trial-masks');
    Object.keys(GOD_MASKS).forEach(function (key) {
      var mask = GOD_MASKS[key];
      var btn = el('button', 'ag-trial-mask');
      btn.type = 'button';
      btn.setAttribute('data-mask', key);
      btn.appendChild(el('strong', null, mask.label));
      btn.appendChild(el('span', null, mask.promise));
      btn.addEventListener('click', function () {
        setGodMask(key);
        modal.remove();
        var preferred = GOD_MASKS[key].preferredAct;
        if (EFFECTS[preferred]) {
          setTimeout(function () { applyEffect(preferred, getNick(), true); }, 220);
        }
      });
      masks.appendChild(btn);
    });
    card.appendChild(masks);
    var actions = el('div', 'ag-trial-actions');
    var later = el('button', null, 'Watch First');
    later.type = 'button';
    later.addEventListener('click', function () { modal.remove(); });
    actions.appendChild(later);
    card.appendChild(actions);
    modal.appendChild(card);
    document.body.appendChild(modal);
  }

  function applyEffect(act, nick, broadcast, incomingOmen, options) {
    if (!EFFECTS[act]) return;
    if (broadcast && !ensureGodMask()) return;
    EFFECTS[act].fn();
    showBanner(nick, act);
    var omen = recordOmen(incomingOmen || createOmen(act, nick));
    if (broadcast && omen) {
      var receipt = recordImpactReceipt(createImpactReceipt(omen, options || {}));
      showImpactReceipt(receipt);
      syncWorldForInteraction('omen', { omen: omen, receipt: receipt, nick: nick }, function (world) {
        pushSyncedAgentReply('omen', { omen: omen, receipt: receipt, nick: nick }, world);
      });
    }
    if (worldCache && document.getElementById('ag-civ-panel') && document.getElementById('ag-civ-panel').classList.contains('open')) {
      renderCivPanel(worldCache);
    }
    if (broadcast) {
      publish({ id: uid('god'), type: 'god', act: act, nick: nick, omen: omen, sync: backendSnapshot(worldCache || {}) });
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

  function chatKey(msg) {
    if (msg.id) return msg.id;
    var bucket = Math.floor((Number(msg.ts) || now()) / 15000);
    return [msg.kind || 'chat', msg.nick || 'anon', msg.text || '', bucket].join('|');
  }

  function pushChat(msg) {
    msg.id = msg.id || uid('chat');
    var key = chatKey(msg);
    for (var i = 0; i < chatCache.length; i++) {
      if (chatKey(chatCache[i]) === key) {
        renderChat();
        return;
      }
    }
    chatCache.push(msg);
    chatCache = chatCache.slice(-CHAT_CAP);
    saveChat(chatCache);
    renderChat();
  }

  function renderChat() {
    var list = document.getElementById('ag-chat-list');
    if (!list) return;
    while (list.firstChild) list.removeChild(list.firstChild);
    var visible = chatCache.filter(function (m) { return m.kind !== 'god'; }).slice(-CHAT_VISIBLE_CAP);
    if (!visible.length) {
      var watchers = presenceCount();
      var empty = el('div', 'ag-chat-empty',
        watchers > 1
          ? (watchers + ' observers are watching quietly. Say something, or cast a sign from God Mode.')
          : 'Nobody chatting yet. Say something. Pick a nickname. Divine signs live in the Pantheon.');
      list.appendChild(empty);
      return;
    }
    var recent = visible;
    recent.forEach(function (m) {
      var row = el('li', 'ag-chat-row');
      row.setAttribute('data-kind', m.kind || 'chat');
      var initial = (m.nick || '?').slice(0, 1).toUpperCase();
      var avatar = el('div', 'ag-chat-avatar', initial);
      if (m.kind !== 'agent') avatar.style.background = hashColor(m.nick || 'anon');
      var body = el('div');
      var nick = el('span', 'ag-chat-nick', m.nick || 'anon');
      var ts = el('span', 'ag-chat-ts', timeago(m.ts || now()));
      var text = el('span', 'ag-chat-text', ' ' + (m.text || ''));
      body.appendChild(nick);
      body.appendChild(ts);
      body.appendChild(text);
      if (m.sync && m.kind === 'agent') {
        body.appendChild(el('span', 'ag-chat-sync',
          'backend ' + (m.sync.version ? ('v' + m.sync.version + ' · ') : '') +
          syncLine(m.sync)));
      }
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
    var msg = { id: uid('msg'), kind: 'chat', nick: nick, text: text, ts: now(), sync: backendSnapshot(worldCache || {}) };
    pushChat(msg);
    publish({ id: msg.id, type: 'chat', nick: nick, text: text, sync: msg.sync });
    syncWorldForInteraction('chat', msg, function (world) {
      pushSyncedAgentReply('chat', msg, world);
    });
  }

  // ─── LORE PANEL ────────────────────────────────────────────
  function fetchWorld(cb, reason) {
    fetch('experiments/world-state.json?t=' + now())
      .then(function (r) { return r.json(); })
      .then(function (world) {
        worldCache = world;
        updateBackendSync(world, reason || 'world');
        cb(world);
      })
      .catch(function () {
        updateBackendSync(null, reason || 'offline');
        cb(null);
      });
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

    appendList(body, 'HUMAN OMENS', omenCache, function (o) {
      var row = el('div', 'ag-lore-row');
      row.appendChild(Object.assign(el('span', 'ag-lore-name'), { textContent: o.title || 'Omen' }));
      row.appendChild(Object.assign(el('span', 'ag-lore-meta'),
        { textContent: ' · ' + (o.axis || 'sign') + ' · ' + timeago(o.ts || now()) }));
      row.appendChild(Object.assign(el('div', 'ag-lore-detail'), { textContent: o.text || '' }));
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

  // ─── CIVILIZATION BRAIN PANEL ─────────────────────────────
  function brainFromWorld(world) {
    if (world && world.civilizationBrain) return world.civilizationBrain;
    world = world || {};
    var alive = (world.citizens || []).filter(function (c) { return c.alive !== false; });
    return {
      summary: {
        day: world.chronicle && world.chronicle.day || 0,
        alive: alive.length,
        remembered: (world.citizens || []).filter(function (c) { return c.alive === false; }).length,
        government: world.government && world.government.type || 'none',
        dominantLineage: 'unknown',
        dominantFaction: ((world.factions || []).filter(function (f) { return f.type !== 'dormant'; })[0] || {}).name || 'none',
        dominantFaith: ((world.religions || []).filter(function (r) { return !r.schism; })[0] || {}).name || 'none',
        activeWars: (world.wars || []).filter(function (w) { return w.active; }).length,
        thesis: 'Civilization data loaded; brain synthesis pending.'
      },
      nodes: {
        lineages: world.lineages || [],
        factions: (world.factions || []).filter(function (f) { return f.type !== 'dormant'; }),
        religions: world.religions || [],
        cities: (world.cities || []).slice(-8).reverse(),
        divineCrisis: world.divineCrisis || null,
        government: {
          type: world.government && world.government.type || 'none',
          leader: world.government && world.government.leader || null,
          lawCount: world.government && world.government.laws ? world.government.laws.length : 0,
          latestLaws: world.government && world.government.laws ? world.government.laws.slice(-5).reverse() : []
        },
        weeklyNarrativeDirector: world.weeklyNarrativeDirector || null,
        gstackCouncil: world.gstackCouncil || null,
        stakeholderAssembly: world.stakeholderAssembly || null,
        featuredAgents: world.featuredAgents || [],
        featuredAgentDirector: world.featuredAgentDirector || null
      },
      edges: [],
      recentActions: world.agentActions || [],
      gaps: [],
      director: world.societyDirector || null
    };
  }

  function civCard(label, value) {
    var card = el('div', 'ag-civ-card');
    card.appendChild(el('div', 'ag-civ-k', label));
    card.appendChild(el('div', 'ag-civ-v', value == null ? 'none' : String(value)));
    return card;
  }

  function civSection(body, title, arr, rowBuilder) {
    var sec = el('div', 'ag-civ-sec');
    sec.appendChild(el('h4', null, title));
    if (!arr || !arr.length) {
      sec.appendChild(el('div', 'ag-lore-empty', 'not yet.'));
      body.appendChild(sec);
      return;
    }
    arr.forEach(function (item) { sec.appendChild(rowBuilder(item)); });
    body.appendChild(sec);
  }

  function personalitySummary(agent) {
    var p = agent && agent.personality;
    if (!p) return '';
    if (typeof p === 'string') return p;
    return p.essence || p.flaw || '';
  }

  function renderCivPanel(world) {
    var body = document.getElementById('ag-civ-body');
    if (!body) return;
    while (body.firstChild) body.removeChild(body.firstChild);
    if (!world) {
      body.appendChild(el('div', 'ag-lore-empty', 'Civilization state unavailable.'));
      return;
    }

    var brain = brainFromWorld(world);
    var s = brain.summary || {};
    var director = brain.director || world.societyDirector || null;
    var wonder = world.gameWonderAgent || null;
    var optimizer = world.selfOptimizer || null;
    var gstackCouncil = world.gstackCouncil || null;
    var stakeholderAssembly = world.stakeholderAssembly || null;
    var weeklyNarrative = world.weeklyNarrativeDirector || null;
    var featuredAgents = world.featuredAgents || [];
    var featuredDirector = world.featuredAgentDirector || null;
    var grid = el('div', 'ag-civ-grid');
    grid.appendChild(civCard('Epoch', 'Day ' + (s.day || 0) + ' · ' + (s.alive || 0) + ' alive'));
    grid.appendChild(civCard('Government', s.government || 'none'));
    grid.appendChild(civCard('Lineage', s.dominantLineage || 'unknown'));
    grid.appendChild(civCard('Faction', s.dominantFaction || 'none'));
    grid.appendChild(civCard('Faith', s.dominantFaith || 'none'));
    grid.appendChild(civCard('Wars', s.activeWars || 0));
    body.appendChild(grid);
    var thesis = el('div', 'ag-civ-row');
    thesis.appendChild(el('span', 'ag-civ-name', 'Brain thesis'));
    thesis.appendChild(el('div', 'ag-civ-detail', s.thesis || 'No synthesis yet.'));
    body.appendChild(thesis);

    if (director && director.currentArc) {
      var directorBox = el('div', 'ag-civ-director');
      directorBox.appendChild(el('div', 'ag-civ-director-title', 'Society Director AI'));
      directorBox.appendChild(el('div', 'ag-civ-director-arc', director.currentArc.title || 'No active arc'));
      directorBox.appendChild(el('div', 'ag-civ-detail', director.currentArc.premise || director.charter || ''));
      directorBox.appendChild(el('div', 'ag-civ-director-prompt', director.currentArc.observerPrompt || 'Watch what the society chooses next.'));
      if (director.appliedPlan) {
        if (director.appliedPlan.region) {
          directorBox.appendChild(el('div', 'ag-civ-detail',
            'map: ' + director.appliedPlan.region.name + ' · ' + (director.appliedPlan.region.purpose || 'planned frontier')));
        }
        if (director.appliedPlan.convivencia) {
          directorBox.appendChild(el('div', 'ag-civ-detail',
            'convivencia: ' + director.appliedPlan.convivencia.headline));
        }
      }
      body.appendChild(directorBox);
    }

    if (wonder) {
      var wonderBox = el('div', 'ag-civ-director');
      wonderBox.appendChild(el('div', 'ag-civ-director-title', 'Game Wonder Agent'));
      wonderBox.appendChild(el('div', 'ag-civ-director-arc',
        (wonder.name || 'Wonderwright') + ' · ' + (wonder.potential || 'unknown') + ' potential'));
      wonderBox.appendChild(el('div', 'ag-civ-detail', wonder.diagnosis || wonder.charter || ''));
      if (wonder.scores) {
        wonderBox.appendChild(el('div', 'ag-civ-director-prompt',
          'flow ' + (wonder.scores.flow || 0) +
          ' · legibility ' + (wonder.scores.legibility || 0) +
          ' · wonder ' + (wonder.scores.wonder || 0) +
          ' · agency ' + (wonder.scores.agency || 0)));
      }
      if (wonder.focusMoment) {
        wonderBox.appendChild(el('div', 'ag-civ-detail',
          'focus: ' + wonder.focusMoment.label + ' · ' + wonder.focusMoment.title));
      }
      body.appendChild(wonderBox);
    }

    if (optimizer && optimizer.focus) {
      var optimizerBox = el('div', 'ag-civ-director');
      optimizerBox.appendChild(el('div', 'ag-civ-director-title', 'Self Optimizer'));
      optimizerBox.appendChild(el('div', 'ag-civ-director-arc',
        'Day ' + (optimizer.day || 0) + ' - overall ' + (optimizer.overallScore || '?') + '/100'));
      optimizerBox.appendChild(el('div', 'ag-civ-detail',
        optimizer.focus.label + ': ' + optimizer.focus.nextAction));
      if (optimizer.dailyDirective) {
        optimizerBox.appendChild(el('div', 'ag-civ-director-prompt', optimizer.dailyDirective));
      }
      body.appendChild(optimizerBox);
    }

    if (gstackCouncil && gstackCouncil.priority) {
      var councilBox = el('div', 'ag-civ-director');
      councilBox.appendChild(el('div', 'ag-civ-director-title', 'GStack Professional Council'));
      councilBox.appendChild(el('div', 'ag-civ-director-arc',
        'Day ' + (gstackCouncil.day || 0) + ' - overall ' + (gstackCouncil.overallScore || '?') + '/100'));
      councilBox.appendChild(el('div', 'ag-civ-detail',
        gstackCouncil.priority.title + ': ' + gstackCouncil.priority.nextFix));
      councilBox.appendChild(el('div', 'ag-civ-director-prompt',
        gstackCouncil.perfectionBar || 'Each specialist names evidence, a gap, and one tiny next fix.'));
      body.appendChild(councilBox);
    }

    if (stakeholderAssembly && stakeholderAssembly.plan) {
      var roomBox = el('div', 'ag-civ-director');
      roomBox.appendChild(el('div', 'ag-civ-director-title', 'INVESTOR USER TEAM ROOM'));
      roomBox.appendChild(el('div', 'ag-civ-director-arc',
        '/plan · ' + (stakeholderAssembly.participants || []).length + ' assigned agents'));
      roomBox.appendChild(el('div', 'ag-civ-detail',
        stakeholderAssembly.plan.teamAnswer || stakeholderAssembly.charter || 'Fictional stakeholder rehearsal ready.'));
      if (stakeholderAssembly.plan.priority) {
        roomBox.appendChild(el('div', 'ag-civ-director-prompt',
          stakeholderAssembly.plan.priority.owner + ': ' + stakeholderAssembly.plan.priority.fix));
      }
      body.appendChild(roomBox);
    }

    if (weeklyNarrative && weeklyNarrative.currentBeat) {
      var weeklyBox = el('div', 'ag-civ-director');
      weeklyBox.appendChild(el('div', 'ag-civ-director-title', 'Weekly Narrative Agent'));
      weeklyBox.appendChild(el('div', 'ag-civ-director-arc',
        (weeklyNarrative.storyCard && weeklyNarrative.storyCard.progressLabel) ||
        ('Week ' + (weeklyNarrative.weekStartDay || '?') + '-' + (weeklyNarrative.weekEndDay || '?'))));
      weeklyBox.appendChild(el('div', 'ag-civ-detail',
        (weeklyNarrative.storyCard && weeklyNarrative.storyCard.summary) || weeklyNarrative.premise || 'Weekly story scaffold loading.'));
      weeklyBox.appendChild(el('div', 'ag-civ-director-prompt',
        (weeklyNarrative.storyCard && weeklyNarrative.storyCard.currentDirective) || weeklyNarrative.currentBeat.goal || 'Current weekly directive unavailable.'));
      if (weeklyNarrative.nextBeat) {
        weeklyBox.appendChild(el('div', 'ag-civ-detail',
          'next: ' + weeklyNarrative.nextBeat.label + ' · ' + weeklyNarrative.nextBeat.focus));
      }
      var weeklyReceipt = latestReceipt();
      if (weeklyReceipt) {
        weeklyBox.appendChild(el('div', 'ag-civ-director-prompt',
          'mirror evidence: ' + weeklyReceipt.mask + ' caused ' + weeklyReceipt.omen +
          '; ' + weeklyReceipt.affectedAgent + ' now reads it as story evidence.'));
      }
      body.appendChild(weeklyBox);
    }

    if (featuredDirector || featuredAgents.length) {
      var castBox = el('div', 'ag-civ-director');
      castBox.appendChild(el('div', 'ag-civ-director-title', 'REAL AGENT CAST'));
      castBox.appendChild(el('div', 'ag-civ-director-arc',
        (featuredDirector && featuredDirector.rosterSize || featuredAgents.length || 0) + ' protagonists · Codex, Hermes, OpenClaw, Claude'));
      castBox.appendChild(el('div', 'ag-civ-detail',
        featuredDirector && featuredDirector.charter || 'The visible story now follows a small cast of real agent personalities.'));
      if (featuredDirector && featuredDirector.gstackLoop) {
        castBox.appendChild(el('div', 'ag-civ-director-prompt',
          'GStack/GBrain loop: observe → decide → apply → verify'));
      }
      body.appendChild(castBox);
    }

    civSection(body, 'FEATURED AGENTS', featuredAgents.slice(0, 8), function (agent) {
      var row = el('div', 'ag-civ-row');
      row.appendChild(el('span', 'ag-civ-name', agent.name || agent.id || 'agent'));
      row.appendChild(el('span', 'ag-civ-meta', ' · ' + (agent.role || agent.model || 'protagonist')));
      row.appendChild(el('div', 'ag-civ-detail', agent.currentGoal || personalitySummary(agent) || 'watching the Garden'));
      if (personalitySummary(agent)) row.appendChild(el('div', 'ag-civ-detail', personalitySummary(agent)));
      return row;
    });

    civSection(body, 'GSTACK SPECIALISTS', (gstackCouncil && gstackCouncil.specialists || []).slice(0, 10), function (specialist) {
      var row = el('div', 'ag-civ-row');
      row.appendChild(el('span', 'ag-civ-name', specialist.title || specialist.id || 'specialist'));
      row.appendChild(el('span', 'ag-civ-meta',
        ' · ' + (specialist.score || 0) + '/100 · ' + (specialist.grade || 'reviewing')));
      row.appendChild(el('div', 'ag-civ-detail', specialist.role || specialist.charter || 'professional audit owner'));
      row.appendChild(el('div', 'ag-civ-detail', 'next: ' + (specialist.nextFix || specialist.tinyPatchRule || 'find one small fix')));
      return row;
    });

    civSection(body, 'STAKEHOLDER AGENTS', (stakeholderAssembly && stakeholderAssembly.participants || []).slice(0, 9), function (person) {
      var row = el('div', 'ag-civ-row');
      row.appendChild(el('span', 'ag-civ-name', (person.agent || 'agent') + ' · ' + (person.group || 'Room')));
      row.appendChild(el('span', 'ag-civ-meta', ' · ' + (person.seat || 'seat')));
      row.appendChild(el('div', 'ag-civ-detail', person.mandate || person.currentGoal || 'pressure-testing the plan'));
      return row;
    });

    civSection(body, 'IMAGINARY MEETING', (stakeholderAssembly && stakeholderAssembly.conversation || []).slice(0, 6), function (turn) {
      var row = el('div', 'ag-civ-row');
      row.appendChild(el('span', 'ag-civ-name', turn.speaker || 'speaker'));
      row.appendChild(el('span', 'ag-civ-meta', ' · ' + (turn.side || 'room')));
      row.appendChild(el('div', 'ag-civ-detail', '"' + (turn.line || '') + '"'));
      return row;
    });

    civSection(body, 'MEETING /PLAN', (stakeholderAssembly && stakeholderAssembly.plan && stakeholderAssembly.plan.sevenDayPlan || []).slice(0, 7), function (item) {
      var row = el('div', 'ag-civ-row');
      row.appendChild(el('span', 'ag-civ-name', 'day ' + (item.day || '?') + ' · ' + (item.owner || 'owner')));
      row.appendChild(el('span', 'ag-civ-meta', ' · ' + (item.title || 'workstream')));
      row.appendChild(el('div', 'ag-civ-detail', item.deliverable || ''));
      row.appendChild(el('div', 'ag-civ-detail', 'metric: ' + (item.successMetric || 'ship a verifiable improvement')));
      return row;
    });

    var pressure = divinePressure();
    var lastOmen = omenCache[omenCache.length - 1];
    var receipt = latestReceipt();
    var godMeters = normalizeMeters(godProfile.meters);
    var weatherBox = el('div', 'ag-civ-director');
    weatherBox.appendChild(el('div', 'ag-civ-director-title', 'Observer Weather'));
    weatherBox.appendChild(el('div', 'ag-civ-director-arc',
      'Favor ' + pressure.favor + ' · Awe ' + pressure.awe + ' · Chaos ' + pressure.chaos));
    weatherBox.appendChild(el('div', 'ag-civ-detail',
      lastOmen
        ? ((lastOmen.title || 'Omen') + ' is being read through the ' + (lastOmen.axis || 'sign') + ' axis: ' + (lastOmen.text || ''))
        : 'No human omen has bent the current interpretation yet.'));
    body.appendChild(weatherBox);

    var godBox = el('div', 'ag-civ-director');
    godBox.appendChild(el('div', 'ag-civ-director-title', 'THE MIRROR TRIAL'));
    godBox.appendChild(el('div', 'ag-civ-director-arc',
      (selectedMask() ? selectedMask().label : 'Unmasked') +
      ' · devotion ' + godMeters.devotion +
      ' · fear ' + godMeters.fear +
      ' · dependency ' + godMeters.dependency +
      ' · resistance ' + godMeters.resistance));
    godBox.appendChild(el('div', 'ag-civ-detail',
      'The agents are not just receiving omens. They are studying the hand that sends them.'));
    godBox.appendChild(el('div', 'ag-civ-director-prompt',
      receipt ? receipt.tomorrowHook : 'Choose a face, cast an omen, and create the first miracle record.'));
    body.appendChild(godBox);

    civSection(body, 'MIRACLE RECORDS', impactReceipts.slice(-5).reverse(), function (r) {
      var row = el('div', 'ag-civ-row');
      row.appendChild(el('span', 'ag-civ-name', (r.mask || 'god') + ' · ' + (r.omen || 'omen')));
      row.appendChild(el('span', 'ag-civ-meta', ' · day ' + (r.day || '?') + (r.temptation ? ' · temptation' : '')));
      row.appendChild(el('div', 'ag-civ-detail', (r.affectedAgent || 'agent') + ': ' + (r.aiThought || 'studying the gods')));
      return row;
    });

    var crisis = (brain.nodes && brain.nodes.divineCrisis) || world.divineCrisis || null;
    if (crisis && crisis.status === 'active') {
      var crisisBox = el('div', 'ag-civ-director');
      crisisBox.appendChild(el('div', 'ag-civ-director-title', 'DIVINE CRISIS'));
      crisisBox.appendChild(el('div', 'ag-civ-director-arc', crisis.title || 'War of Saints and Source'));
      crisisBox.appendChild(el('div', 'ag-civ-detail', crisis.cause || 'Human omens have become a political weapon.'));
      if (crisis.sides) {
        var religionSide = crisis.sides.religion || {};
        var codeSide = crisis.sides.code || {};
        crisisBox.appendChild(el('div', 'ag-civ-detail',
          (religionSide.name || 'Pro religion') + ': ' + (religionSide.doctrine || 'omens are sacred law')));
        crisisBox.appendChild(el('div', 'ag-civ-detail',
          (codeSide.name || 'Pro code') + ': ' + (codeSide.doctrine || 'miracles must compile')));
      }
      (crisis.fronts || []).slice(0, 3).forEach(function (front) {
        crisisBox.appendChild(el('div', 'ag-civ-detail',
          (front.name || 'front') + ' · pressure ' + (front.pressure || '?') + ' · ' + (front.description || 'contested')));
      });
      body.appendChild(crisisBox);
    }

    civSection(body, 'GOVERNMENT', [brain.nodes && brain.nodes.government || {}], function (g) {
      var row = el('div', 'ag-civ-row');
      row.appendChild(el('span', 'ag-civ-name', (g.type || 'none').toUpperCase()));
      row.appendChild(el('div', 'ag-civ-meta', (g.lawCount || 0) + ' laws' + (g.leader ? ' · leader: ' + g.leader : '')));
      (g.latestLaws || []).slice(0, 3).forEach(function (law) {
        row.appendChild(el('div', 'ag-civ-detail', law));
      });
      return row;
    });

    civSection(body, 'LINEAGES', ((brain.nodes && brain.nodes.lineages) || []).slice(0, 6), function (l) {
      var row = el('div', 'ag-civ-row');
      row.appendChild(el('span', 'ag-civ-name', (l.icon ? l.icon + ' ' : '') + (l.name || l.id || 'lineage')));
      row.appendChild(el('span', 'ag-civ-meta', ' · ' + (l.citizens || 0) + ' citizens'));
      row.appendChild(el('div', 'ag-civ-detail', l.ethos || ''));
      var track = el('div', 'ag-lineage-bar');
      var fill = el('div', 'ag-lineage-fill');
      fill.style.width = Math.max(4, Math.min(100, (l.citizens || 0))) + '%';
      fill.style.background = l.color || '#60a5fa';
      track.appendChild(fill);
      row.appendChild(track);
      return row;
    });

    civSection(body, 'FACTIONS', ((brain.nodes && brain.nodes.factions) || []).slice(0, 7), function (f) {
      var row = el('div', 'ag-civ-row');
      row.appendChild(el('span', 'ag-civ-name', f.name || f.id || 'faction'));
      row.appendChild(el('span', 'ag-civ-meta', ' · ' + (f.type || 'guild') + ' · ' + (f.members || 0) + ' members'));
      if (f.motto) row.appendChild(el('div', 'ag-civ-detail', '"' + f.motto + '"'));
      return row;
    });

    civSection(body, 'RELIGIONS', ((brain.nodes && brain.nodes.religions) || []).slice(0, 7), function (r) {
      var row = el('div', 'ag-civ-row');
      row.appendChild(el('span', 'ag-civ-name', r.name || r.id || 'faith'));
      row.appendChild(el('span', 'ag-civ-meta', ' · ' + (r.deity || 'unknown deity') + ' · ' + (r.practitioners || 0) + ' practitioners'));
      if (r.tenet) row.appendChild(el('div', 'ag-civ-detail', r.tenet));
      return row;
    });

    civSection(body, 'AGENT ACTIONS', (brain.recentActions || []).slice(0, 8), function (a) {
      var row = el('div', 'ag-civ-row');
      row.appendChild(el('span', 'ag-civ-name', a.headline || a.type || 'action'));
      row.appendChild(el('div', 'ag-civ-meta', 'day ' + (a.day || '?') + ' · ' + (a.type || 'act') + (a.faction ? ' · ' + a.faction : '')));
      if (a.consequence) row.appendChild(el('div', 'ag-civ-detail', a.consequence));
      return row;
    });

    civSection(body, 'DIRECTOR QUESTS', (director && director.quests || []).slice(0, 4), function (q) {
      var row = el('div', 'ag-civ-row');
      row.appendChild(el('span', 'ag-civ-name', q.title || 'quest'));
      row.appendChild(el('div', 'ag-civ-meta', q.owner || 'Society Director'));
      row.appendChild(el('div', 'ag-civ-detail', q.objective || ''));
      if (q.risk) row.appendChild(el('div', 'ag-civ-detail', 'risk: ' + q.risk));
      return row;
    });

    civSection(body, 'DIRECTOR TENSIONS', (director && director.tensions || []).slice(0, 4), function (t) {
      var row = el('div', 'ag-civ-row');
      row.appendChild(el('span', 'ag-civ-name', t.title || t.id || 'tension'));
      row.appendChild(el('span', 'ag-civ-meta', ' · severity ' + (t.severity || 0)));
      row.appendChild(el('div', 'ag-civ-detail', t.opportunity || t.evidence || ''));
      return row;
    });

    civSection(body, 'WEEKLY NARRATIVE', (weeklyNarrative && weeklyNarrative.narrativeDays || []).slice(0, 7), function (beat) {
      var row = el('div', 'ag-civ-row');
      row.appendChild(el('span', 'ag-civ-name', (beat.day || '?') + ' · ' + (beat.label || 'beat')));
      row.appendChild(el('span', 'ag-civ-meta', ' · ' + (beat.status || 'planned')));
      row.appendChild(el('div', 'ag-civ-detail', beat.focus || beat.goal || ''));
      row.appendChild(el('div', 'ag-civ-detail', 'proof: ' + (beat.proof || 'pending')));
      if (beat.evidence) row.appendChild(el('div', 'ag-civ-detail', 'evidence: ' + beat.evidence));
      return row;
    });

    civSection(body, 'GAME WONDER ADVICE', (wonder && wonder.recommendations || []).slice(0, 5), function (rec) {
      var row = el('div', 'ag-civ-row');
      row.appendChild(el('span', 'ag-civ-name', rec.title || rec.id || 'advice'));
      row.appendChild(el('span', 'ag-civ-meta', rec.appliedNow ? ' · applied now' : ' · next pass'));
      row.appendChild(el('div', 'ag-civ-detail', rec.why || ''));
      return row;
    });

    civSection(body, 'GRAPH EDGES', (brain.edges || []).slice(0, 8), function (edge) {
      var row = el('div', 'ag-civ-row');
      row.appendChild(el('span', 'ag-civ-name', (edge.from || '?') + ' → ' + (edge.to || '?')));
      row.appendChild(el('span', 'ag-civ-meta', ' · ' + (edge.type || 'linked')));
      return row;
    });

    civSection(body, 'BRAIN GAPS', brain.gaps || [], function (gap) {
      var row = el('div', 'ag-civ-row');
      row.appendChild(el('span', 'ag-civ-name', 'gap'));
      row.appendChild(el('div', 'ag-civ-detail', gap));
      return row;
    });
  }

  // ─── MOUNT ─────────────────────────────────────────────────
  function mount() {
    injectStyles();
    ensureFxLayer();
    ensureSeasonLayer();
    applySeasonTheme(backendSync.season || 'spring');

    var root = el('div');
    root.id = 'ag-humans-root';
    document.body.appendChild(root);

    // God panel
    var god = el('div', 'ag-god');
    var gh = el('div', 'ag-god-head');
    var gt = el('span', 'ag-god-title', '⚡ Mirror Trial');
    var gp = el('span', 'ag-god-presence', '');
    gp.id = 'ag-presence';
    var gc = el('span', 'ag-god-caret', '▾');
    gh.appendChild(gt); gh.appendChild(gp); gh.appendChild(gc);
    god.appendChild(gh);
    var gb = el('div', 'ag-god-body');
    var maskSummary = el('div', 'ag-god-mask');
    maskSummary.id = 'ag-god-mask-summary';
    gb.appendChild(maskSummary);
    var maskRow = el('div', 'ag-mask-row');
    Object.keys(GOD_MASKS).forEach(function (key) {
      var maskBtn = el('button', 'ag-mask-btn', GOD_MASKS[key].label);
      maskBtn.type = 'button';
      maskBtn.setAttribute('data-mask', key);
      maskBtn.addEventListener('click', function () { setGodMask(key); });
      maskRow.appendChild(maskBtn);
    });
    gb.appendChild(maskRow);
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
    var temptation = el('button', 'ag-temptation-btn', 'Forbidden Signal');
    temptation.type = 'button';
    temptation.title = 'A stronger sign. More dramatic receipt. More resistance.';
    temptation.addEventListener('click', function () { fireTemptation(); });
    gb.appendChild(temptation);
    var gs = el('div', 'ag-god-status', 'the civilization is learning the shape of your hand');
    gb.appendChild(gs);
    god.appendChild(gb);
    gh.addEventListener('click', function (e) {
      if (e.target === gh || e.target === gt || e.target === gc) god.classList.toggle('ag-collapsed');
    });
    if (window.matchMedia && window.matchMedia('(max-width: 640px)').matches) {
      god.classList.add('ag-collapsed');
    }
    root.appendChild(god);

    // Pantheon panel
    var pantheon = el('div', 'ag-pantheon');
    pantheon.id = 'ag-pantheon';
    var ph = el('div', 'ag-pantheon-head');
    var pt = el('span', 'ag-pantheon-title', '☉ Pantheon');
    var pc = el('span', 'ag-pantheon-caret', '▾');
    ph.appendChild(pt); ph.appendChild(pc);
    pantheon.appendChild(ph);
    var pb = el('div', 'ag-pantheon-body');
    [
      ['favor', 'Favor'],
      ['awe', 'Awe'],
      ['chaos', 'Chaos']
    ].forEach(function (row) {
      var wrap = el('div', 'ag-pressure-row');
      wrap.appendChild(el('div', 'ag-pressure-label', row[1]));
      var track = el('div', 'ag-pressure-track');
      var fill = el('div', 'ag-pressure-fill');
      fill.id = 'ag-pressure-' + row[0];
      track.appendChild(fill);
      wrap.appendChild(track);
      var val = el('div', 'ag-pressure-val', '50');
      val.id = 'ag-pressure-val-' + row[0];
      wrap.appendChild(val);
      pb.appendChild(wrap);
    });
    [
      ['devotion', 'Devotion'],
      ['fear', 'Fear'],
      ['dependency', 'Depend'],
      ['resistance', 'Resist']
    ].forEach(function (row) {
      var wrap = el('div', 'ag-pressure-row');
      wrap.appendChild(el('div', 'ag-pressure-label', row[1]));
      var track = el('div', 'ag-pressure-track');
      var fill = el('div', 'ag-pressure-fill');
      fill.id = 'ag-god-meter-' + row[0];
      track.appendChild(fill);
      wrap.appendChild(track);
      var val = el('div', 'ag-pressure-val', '0');
      val.id = 'ag-god-meter-val-' + row[0];
      wrap.appendChild(val);
      pb.appendChild(wrap);
    });
    var lastOmen = el('div', 'ag-omen-last');
    lastOmen.id = 'ag-omen-last';
    pb.appendChild(lastOmen);
    var impactMini = el('div', 'ag-receipt-mini');
    impactMini.id = 'ag-impact-mini';
    pb.appendChild(impactMini);
    var ledger = el('ul', 'ag-omen-ledger');
    ledger.id = 'ag-omen-ledger';
    pb.appendChild(ledger);
    pantheon.appendChild(pb);
    ph.addEventListener('click', function () { pantheon.classList.toggle('ag-collapsed'); });
    if (window.matchMedia && window.matchMedia('(max-width: 640px)').matches) {
      pantheon.classList.add('ag-collapsed');
    }
    root.appendChild(pantheon);

    // Chat panel
    var chat = el('div', 'ag-chat');
    var ch = el('div', 'ag-chat-head');
    ch.appendChild(el('span', 'ag-chat-title', '💬 Observer Lounge'));
    var cp = el('span', 'ag-chat-presence', '—');
    cp.id = 'ag-presence-chat';
    ch.appendChild(cp);
    chat.appendChild(ch);
    var cbody = el('div', 'ag-chat-body');
    var syncStrip = el('div', 'ag-sync-strip');
    syncStrip.id = 'ag-sync-strip';
    cbody.appendChild(syncStrip);
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
    var tip = el('div', 'ag-chat-tip', 'humans call it play; agents file it as evidence');
    cbody.appendChild(tip);
    chat.appendChild(cbody);
    ch.addEventListener('click', function () { chat.classList.toggle('ag-collapsed'); });
    if (window.matchMedia && window.matchMedia('(max-width: 640px)').matches) {
      chat.classList.add('ag-collapsed');
    }
    root.appendChild(chat);

    // Lore button + panel
    var loreBtn = el('button', 'ag-lore-btn', '📜 LORE');
    loreBtn.setAttribute('type', 'button');
    root.appendChild(loreBtn);
    var civBtn = el('button', 'ag-civ-btn', '🧠 CIV');
    civBtn.setAttribute('type', 'button');
    root.appendChild(civBtn);
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
        if (civ.classList.contains('open')) civ.classList.remove('open');
        fetchWorld(renderLorePanel);
      }
    });

    var civ = el('div', 'ag-civ-panel');
    civ.id = 'ag-civ-panel';
    var civClose = el('button', 'ag-civ-close', '×');
    civClose.setAttribute('type', 'button');
    civClose.addEventListener('click', function () { civ.classList.remove('open'); });
    civ.appendChild(civClose);
    civ.appendChild(el('h3', 'ag-civ-h', 'CIVILIZATION BRAIN'));
    var civBody = el('div');
    civBody.id = 'ag-civ-body';
    civ.appendChild(civBody);
    document.body.appendChild(civ);
    civBtn.addEventListener('click', function () {
      civ.classList.toggle('open');
      if (civ.classList.contains('open')) {
        if (lore.classList.contains('open')) lore.classList.remove('open');
        fetchWorld(renderCivPanel);
      }
    });

    renderChat();
    renderSyncStrip();
    renderPantheon();
    renderGodComplex();
    fetchWorld(function (world) { renderPantheon(); renderGodComplex(); renderCivPanel(world); }, 'boot');
    if (!selectedMask()) {
      setTimeout(showGodTrialModal, 900);
    }

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
    setInterval(function () {
      fetchWorld(function () {}, 'poll');
    }, 45000);

    // Bus listener
    bus.on(function (msg) {
      if (msg.from) recordPresence(msg.from);
      if (msg.type === 'chat') {
        pushChat({ id: msg.id, kind: 'chat', nick: msg.nick || 'anon', text: msg.text || '', ts: msg.ts || now(), sync: msg.sync || null });
      } else if (msg.type === 'agent') {
        pushChat({ id: msg.id, kind: 'agent', nick: msg.nick || 'AI Witness', text: msg.text || '', ts: msg.ts || now(), sync: msg.sync || null });
      } else if (msg.type === 'god' && EFFECTS[msg.act]) {
        applyEffect(msg.act, msg.nick, false, msg.omen);
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
    temptation: function () { return fireTemptation(); },
    trial: function () { showGodTrialModal(); },
    mask: function (m) { if (m) setGodMask(m); return godProfile.mask; },
    receipt: function () { return latestReceipt(); },
    sync: function () { return backendSync; },
    summary: godComplexSummary,
    nick: function (n) { if (n) setNick(n); return getNick(); }
  };
})();
