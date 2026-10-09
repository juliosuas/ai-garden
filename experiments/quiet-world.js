/* Presentation only. The civilization and canonical state keep their own clock. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const paths = {
    leaf: '<path d="M20 4c-9-1-16 3-15 10 1 7 14 7 15-10Z"/><path d="M4 21c1-6 5-10 10-13"/>',
    sound: '<path d="m11 5-6 4H2v6h3l6 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    mute: '<path d="m11 5-6 4H2v6h3l6 4V5Z"/><path d="m16 9 5 6m0-6-5 6"/>',
    menu: '<path d="M4 8h16M4 16h16"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    plus: '<path d="M5 12h14M12 5v14"/>',
    minus: '<path d="M5 12h14"/>'
  };
  const icon = name => '<svg viewBox="0 0 24 24" aria-hidden="true">' + paths[name] + '</svg>';
  const shell = document.createElement('div');
  shell.id = 'quiet-shell';
  shell.lang = 'es';
  shell.innerHTML = '<header class="qw-header"><div class="qw-brand">' + icon('leaf') + '<div><div class="qw-wordmark">Garden</div><div class="qw-day" id="qw-day">Cargando mundo</div></div></div><div class="qw-header-actions"><button type="button" id="qw-sound" class="qw-icon qw-glass" aria-label="Activar sonido" aria-pressed="false">' + icon('mute') + '</button><button type="button" id="qw-menu" class="qw-menu qw-glass" aria-haspopup="dialog" aria-controls="quiet-drawer" aria-expanded="false">Mundo ' + icon('menu') + '</button></div></header>' +
    '<div class="qw-hint" id="qw-hint">Arrastra para mirar. Toca para descubrir.</div><div class="qw-footer"><div id="qw-place" class="qw-place" role="status"></div><button type="button" id="qw-discover" class="qw-discover" disabled>Explorar ' + icon('arrow') + '</button></div><div class="qw-zoom qw-glass" role="group" aria-label="Zoom"><button type="button" class="qw-icon" id="qw-minus" aria-label="Alejar">' + icon('minus') + '</button><button type="button" class="qw-icon" id="qw-plus" aria-label="Acercar">' + icon('plus') + '</button></div>';
  document.body.append(shell);
  const drawer = document.createElement('dialog');
  drawer.id = 'quiet-drawer';
  drawer.lang = 'es';
  drawer.setAttribute('aria-labelledby', 'qw-title');
  drawer.innerHTML = '<div class="qw-drawer-head"><div><div class="qw-eyebrow">Una mirada más cerca</div><h2 id="qw-title">Tu mundo</h2></div><button type="button" id="qw-close" class="qw-icon qw-close" aria-label="Cerrar panel">' + icon('close') + '</button></div>' +
    '<nav class="qw-tabs" aria-label="Detalles del mundo"><button type="button" data-view="overview" aria-pressed="true">Resumen</button><button type="button" data-view="council" aria-pressed="false">Consejo</button><button type="button" data-view="settings" aria-pressed="false">Ajustes</button></nav>' +
    '<section id="qw-overview"><div class="qw-stats"><div><strong id="qw-pop">—</strong><span>habitantes</span></div><div><strong id="qw-plants">—</strong><span>plantas</span></div></div><div id="qw-map"></div><p class="qw-note">Toca el mapa para viajar.</p><h3>Últimas huellas</h3><ul id="qw-events" class="qw-events"></ul></section>' +
    '<section id="qw-council" hidden><p class="qw-note">Una conversación del mundo, en tiempo real.</p><div id="qw-council-host"></div></section>' +
    '<section id="qw-settings" hidden><div class="qw-setting"><span>Etiquetas del mundo</span><button type="button" id="qw-labels" aria-pressed="false">Ocultas</button></div><div class="qw-setting"><span>Sonido ambiente</span><button type="button" id="qw-setting-sound" aria-pressed="false">Apagado</button></div><div class="qw-setting"><span>Reducir movimiento</span><button type="button" id="qw-motion" aria-pressed="false">Apagado</button></div><div class="qw-setting"><span>Ritmo</span><div class="qw-speed" role="group" aria-label="Velocidad de simulación"><button type="button" data-pace="1" aria-pressed="true">1×</button><button type="button" data-pace="2" aria-pressed="false">2×</button><button type="button" data-pace="3" aria-pressed="false">3×</button></div></div><p class="qw-note" style="margin-top:24px">Desplázate con las flechas. Acerca el mundo con la rueda o con dos dedos.</p></section>';
  document.body.append(drawer);
  // Move existing live components, keeping their listeners and rendering intact.
  $('qw-map').append($('minimap-panel'));
  $('agent-theatre').lang = 'en';
  $('qw-council-host').append($('agent-theatre'));
  $('qw-events').lang = 'en';
  let placeIndex = -1;
  let initialized = false;
  function syncSound() {
    const playing = $('music-btn').getAttribute('aria-pressed') === 'true';
    $('qw-sound').innerHTML = icon(playing ? 'sound' : 'mute');
    $('qw-sound').setAttribute('aria-label', playing ? 'Silenciar sonido' : 'Activar sonido');
    $('qw-sound').setAttribute('aria-pressed', String(playing));
    $('qw-setting-sound').setAttribute('aria-pressed', String(playing));
    $('qw-setting-sound').textContent = playing ? 'Encendido' : 'Apagado';
  }
  function sound() { toggleGardenMusic(); syncSound(); }
  $('qw-sound').addEventListener('click', sound);
  $('qw-setting-sound').addEventListener('click', sound);
  new MutationObserver(syncSound).observe($('music-btn'), { attributes: true, attributeFilter: ['aria-pressed'] });
  function syncSettings() {
    syncSound();
    $('qw-labels').setAttribute('aria-pressed', String(worldLabelsVisible));
    $('qw-labels').textContent = worldLabelsVisible ? 'Visibles' : 'Ocultas';
    $('qw-motion').setAttribute('aria-pressed', String(prefersReducedMotion));
    $('qw-motion').textContent = prefersReducedMotion ? 'Encendido' : 'Apagado';
    drawer.querySelectorAll('[data-pace]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.pace) === gameSpeed)));
  }
  function overview() {
    $('qw-pop').textContent = (world.citizens || []).filter(citizen => citizen.alive !== false).length.toLocaleString('es');
    $('qw-plants').textContent = (world.plants || []).length.toLocaleString('es');
    const recent = (world.history || []).slice(-3).reverse().flatMap(day => day.events || []).filter(event => event && typeof event.headline === 'string').slice(0, 3);
    $('qw-events').replaceChildren(...recent.map(event => {
      const item = document.createElement('li'); item.textContent = event.headline; return item;
    }));
    if (!recent.length) { const item = document.createElement('li'); item.textContent = 'La historia empieza con lo que ocurre aquí.'; $('qw-events').append(item); }
  }
  function close() { drawer.close(); }
  $('qw-menu').addEventListener('click', () => {
    overview(); syncSettings(); keysDown = {}; drawer.showModal();
    $('qw-menu').setAttribute('aria-expanded', 'true');
  });
  $('qw-close').addEventListener('click', close);
  drawer.addEventListener('close', () => { $('qw-menu').setAttribute('aria-expanded', 'false'); $('qw-menu').focus(); });
  drawer.addEventListener('click', event => {
    if (event.target !== drawer) return;
    const rect = drawer.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
  });
  // Avoid legacy shortcuts moving the camera or opening hidden panels while reading.
  document.addEventListener('keydown', event => {
    if (drawer.open) event.stopImmediatePropagation();
    else if (/^[hHsSmMbB]$/.test(event.key) && !/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) {
      event.stopImmediatePropagation(); $('qw-menu').click();
    }
  }, true);
  drawer.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
    drawer.querySelectorAll('[data-view]').forEach(tab => {
      const active = tab === button;
      tab.setAttribute('aria-pressed', String(active));
      $('qw-' + tab.dataset.view).hidden = !active;
    });
  }));
  $('qw-labels').addEventListener('click', () => { worldLabelsVisible = !worldLabelsVisible; syncSettings(); });
  $('qw-motion').addEventListener('click', () => { setReducedMotionPreference(!prefersReducedMotion); syncSettings(); });
  drawer.querySelectorAll('[data-pace]').forEach(button => button.addEventListener('click', () => {
    document.querySelector('#speed-control [data-speed="' + button.dataset.pace + '"]').click(); syncSettings();
  }));
  $('qw-plus').addEventListener('click', () => setZoom(SCALE + 1));
  $('qw-minus').addEventListener('click', () => setZoom(SCALE - 1));
  $('minimap').addEventListener('click', close);
  $('minimap').addEventListener('touchend', close);
  function travel(place) {
    smoothNavigateTo(place.x, place.y);
    if (prefersReducedMotion) { camX = navTargetX; camY = navTargetY; navAnimating = false; cameraState = 'FREE'; }
  }
  $('qw-discover').addEventListener('click', () => {
    placeIndex = (placeIndex + 1) % OPEN_WORLD_LANDMARKS.length;
    const place = OPEN_WORLD_LANDMARKS[placeIndex];
    travel(place); $('qw-place').textContent = place.name;
    $('qw-hint').classList.add('is-gone');
  });
  // One brief hint, no modal, tutorial or onboarding choice to dismiss.
  setTimeout(() => {
    $('qw-hint').classList.add('is-gone');
    $('qw-hint').setAttribute('aria-hidden', 'true');
  }, 9000);
  function refresh() {
    if (!worldReady) return;
    $('qw-day').textContent = sharedWorldLoaded ? 'Día ' + (world.chronicle.day || 1) + ' · En vivo' : 'Mundo local';
    $('qw-discover').disabled = false;
    if (!initialized) {
      initialized = true;
      // Start in a living landscape rather than in front of the old instruction sign.
      if (!userControlledCamera) {
        const districts = (world.civilizationView || {}).districts || [];
        const firstPlace = districts.find(district => district.capital) || OPEN_WORLD_LANDMARKS[0];
        setZoom(3); travel(firstPlace);
      }
    }
    if (drawer.open) syncSettings();
  }
  refresh(); setInterval(refresh, 1000);
}());
