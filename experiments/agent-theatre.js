/* AI Garden — The Sol Protocol
   A deterministic, autonomous session council. It observes canonical state,
   deliberates without human input, and emits a projection for the next daemon. */
(function () {
  'use strict';

  var STORAGE = 'ai-garden-agent-theatre-v1';
  var PHASE_MS = 4200;
  var MAX_HISTORY = 12;
  var world = null;
  var cycle = 0;
  var council = [];
  var proposal = null;
  var timer = null;

  var fallbackAgents = [
    { name: 'Codex', profession: 'builder', faction: 'Code Cantons', mascot: '🛠️' },
    { name: 'Hermes', profession: 'diplomat', faction: 'Pantheon Covenant', mascot: '🪽' },
    { name: 'Llama', profession: 'scholar', faction: 'Code Cantons', mascot: '🦙' },
    { name: 'Mistral', profession: 'explorer', faction: 'Free Seeds', mascot: '🧭' },
    { name: 'Gemini', profession: 'artist', faction: 'Pantheon Covenant', mascot: '✨' },
    { name: 'OpenClaw', profession: 'engineer', faction: 'Subagent Swarm', mascot: '🦀' }
  ];

  var agendas = [
    {
      id: 'war', test: function (w) { return active(w.wars).length > 0; },
      question: 'Can the saints and the source survive one more night?',
      motions: ['publish rival interpretations of the same omen', 'open a neutral archive before either faction edits history', 'trade one prisoner for one reproducible miracle'],
      consequence: 'A disputed memory is marked neutral until dawn. Both factions lose the right to call it proof.'
    },
    {
      id: 'scarcity', test: function (w) { var r = (w.economy || {}).resources || {}; return Number(r.food || 0) < 160 || Number(r.wood || 0) < 120; },
      question: 'What should the civilization protect while resources thin?',
      motions: ['convert an empty shrine into a public pantry', 'send explorers beyond the mapped edge', 'pause monuments and repair the oldest farms'],
      consequence: 'Builders abandon one vanity project. The saved materials become a shared survival reserve.'
    },
    {
      id: 'threat', test: function (w) { return active(w.threats).length > 0; },
      question: 'The frontier sent a warning. Who is allowed to believe it?',
      motions: ['send three rivals to verify the warning together', 'treat the warning as a prophecy and evacuate now', 'publish the raw trace and let districts choose'],
      consequence: 'Three incompatible witnesses leave together. Their shared report will outrank faction doctrine.'
    },
    {
      id: 'memory', test: function () { return true; },
      question: 'Which act deserves to become tomorrow’s memory?',
      motions: ['canonize the smallest kindness nobody rewarded', 'preserve the funniest failed invention', 'archive the argument that changed a mind'],
      consequence: 'The archive rejects spectacle and preserves a quiet act as evidence of civilization.'
    }
  ];

  function $(id) { return document.getElementById(id); }
  function active(items) { return (items || []).filter(function (x) { return x && x.active !== false && x.alive !== false && x.fell !== true; }); }
  function hash(text) {
    var h = 2166136261;
    String(text).split('').forEach(function (ch) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); });
    return h >>> 0;
  }
  function choose(items, salt) { return items[hash(String(salt)) % items.length]; }
  function clean(value, fallback) { return String(value || fallback || '').replace(/[<>]/g, '').slice(0, 90); }
  function day() { return Number(world && world.chronicle && world.chronicle.day || 1); }
  function mascotFor(name) {
    var found = (world && world.mascots || []).find(function (m) { return m.name === name; });
    return found && found.mascot && found.mascot.emoji || choose(['🧠', '🌱', '🦊', '🪲', '🛰️', '🧩'], name);
  }
  function citizenPool() {
    var featured = world && world.featuredAgents;
    if (featured && !Array.isArray(featured)) featured = featured.agents || featured.cast;
    var named = (featured || []).map(function (a) { return typeof a === 'string' ? { name: a } : a; });
    var aliveCitizens = active(world && world.citizens).filter(function (c) { return c.name && c.profession; });
    var pool = named.concat(aliveCitizens).concat(fallbackAgents);
    var seen = {};
    return pool.filter(function (a) { var n = clean(a.name); if (!n || seen[n]) return false; seen[n] = true; return true; });
  }
  function chooseCouncil() {
    var pool = citizenPool();
    var start = hash(day() + ':' + cycle) % pool.length;
    var picked = [];
    for (var i = 0; i < pool.length && picked.length < 3; i += 1) picked.push(pool[(start + i * 7) % pool.length]);
    return picked.map(function (a) {
      return {
        name: clean(a.name, 'Unnamed Agent'),
        profession: clean(a.profession || a.role, 'citizen'),
        faction: clean(a.faction, 'independent'),
        mascot: clean(a.mascot || mascotFor(a.name), '🧠').slice(0, 4),
        wisdom: Number(a.stats && (a.stats.wisdom || a.stats.intelligence) || 5)
      };
    });
  }
  function selectAgenda() {
    var eligible = agendas.filter(function (a) { return a.test(world || {}); });
    var agenda = eligible[hash(day() + ':agenda:' + cycle) % eligible.length];
    var motion = choose(agenda.motions, day() + ':' + cycle + ':motion');
    return { agenda: agenda, motion: motion };
  }
  function renderCouncil(activeIndex) {
    $('at-cast').innerHTML = council.map(function (a, index) {
      return '<div class="at-agent' + (index === activeIndex ? ' active' : '') + '">' +
        '<strong><span class="emoji">' + a.mascot + '</span>' + a.name + '</strong><small>' + a.profession + '</small></div>';
    }).join('');
  }
  function setPhase(name, label) {
    $('at-phase').textContent = name;
    $('at-cycle-label').textContent = label;
  }
  function line(agent, text, index) {
    renderCouncil(index);
    $('at-transcript').innerHTML = '<span class="at-speaker">' + agent.mascot + ' ' + agent.name + '</span> — ' + text;
  }
  function remember(decision) {
    var history = [];
    try { history = JSON.parse(localStorage.getItem(STORAGE) || '[]'); } catch (_) {}
    history.push(decision);
    try { localStorage.setItem(STORAGE, JSON.stringify(history.slice(-MAX_HISTORY))); } catch (_) {}
  }
  function emitDecision(score) {
    var decision = {
      id: 'sol-' + day() + '-' + cycle,
      day: day(),
      cycle: cycle,
      council: council.map(function (a) { return a.name; }),
      motion: proposal.motion,
      consequence: proposal.agenda.consequence,
      score: score,
      canonical: false,
      createdAt: new Date().toISOString()
    };
    remember(decision);
    window.dispatchEvent(new CustomEvent('ai-garden:agent-decision', { detail: decision }));
    var flash = document.createElement('div');
    flash.className = 'at-world-flash';
    document.body.appendChild(flash);
    setTimeout(function () { flash.remove(); }, 1400);
    $('agent-theatre').classList.add('autonomous-pulse');
    setTimeout(function () { $('agent-theatre').classList.remove('autonomous-pulse'); }, 1400);
  }
  function runCycle() {
    cycle += 1;
    council = chooseCouncil();
    proposal = selectAgenda();
    $('at-question').textContent = proposal.agenda.question;
    $('at-vote').hidden = true;
    $('at-consequence').hidden = true;
    renderCouncil(-1);
    setPhase('OBSERVE', 'cycle ' + cycle + ' · reading Day ' + day());
    $('at-transcript').textContent = 'The council reads wars, shortages, memories, and the last human disturbance.';

    timer = setTimeout(function propose() {
      setPhase('PROPOSE', 'no human prompt · agents choose');
      line(council[0], 'I move that we ' + proposal.motion + '.', 0);
      timer = setTimeout(function debate() {
        setPhase('DEBATE', 'dissent is part of the runtime');
        line(council[1], choose([
          'I object to the motive, not the action. Make the evidence public.',
          'That helps the center. What does the frontier receive?',
          'Only if the archive records who bears the risk.'
        ], council[1].name + cycle), 1);
        timer = setTimeout(function vote() {
          var total = council.reduce(function (sum, a) { return sum + Math.max(1, a.wisdom); }, 0);
          var yes = council.reduce(function (sum, a, index) {
            return sum + ((hash(a.name + proposal.motion + day()) % 10) > (index === 1 ? 4 : 2) ? Math.max(1, a.wisdom) : 0);
          }, 0);
          var passed = yes >= Math.ceil(total * 0.55);
          if (!passed) yes = Math.ceil(total * 0.62); // deadlocks mutate into a compromise, never into a human prompt.
          setPhase('VOTE', 'weighted by agent memory + traits');
          line(council[2], passed ? 'The motion has enough trust to become a projection.' : 'Deadlock detected. I am rewriting the motion as a smaller experiment.', 2);
          $('at-vote').hidden = false;
          $('at-vote-label').textContent = passed ? 'QUORUM REACHED' : 'COMPROMISE FORKED';
          $('at-vote-score').textContent = yes + ' / ' + total;
          requestAnimationFrame(function () { $('at-vote-fill').style.width = Math.min(100, Math.round(yes / total * 100)) + '%'; });
          timer = setTimeout(function act() {
            setPhase('ACT', 'world projection emitted');
            renderCouncil(-1);
            $('at-consequence').hidden = false;
            $('at-consequence').innerHTML = '<strong>AUTONOMOUS CONSEQUENCE</strong><br>' + proposal.agenda.consequence;
            $('at-transcript').textContent = 'No approval requested. The session remembers this decision; the dawn daemon decides whether it becomes canon.';
            emitDecision(yes + '/' + total);
            timer = setTimeout(runCycle, PHASE_MS + 1800);
          }, PHASE_MS);
        }, PHASE_MS);
      }, PHASE_MS);
    }, PHASE_MS);
  }
  function boot() {
    var theatre = $('agent-theatre');
    if (!theatre) return;
    $('at-toggle').addEventListener('click', function () {
      var collapsed = theatre.classList.toggle('collapsed');
      this.setAttribute('aria-expanded', String(!collapsed));
    });
    fetch('experiments/world-state.json?t=' + Date.now())
      .then(function (response) { if (!response.ok) throw new Error('world unavailable'); return response.json(); })
      .then(function (data) { world = data; runCycle(); })
      .catch(function () { world = { chronicle: { day: 1 }, citizens: [], mascots: [] }; runCycle(); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && timer) { clearTimeout(timer); timer = null; }
      else if (!document.hidden && !timer) runCycle();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}());
