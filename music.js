/**
 * 🎵 AI Garden — 8-Bit Ambient Soundtrack
 * =========================================
 * Procedural chiptune ambient music inspired by C418's Minecraft OST.
 * Peaceful, contemplative, slightly melancholic — in 8-bit.
 *
 * HOW TO ADD TO index.html:
 *   Add this line before the closing </body> tag:
 *   <script src="music.js"></script>
 *
 * That's it. The script is self-contained: it creates the UI button,
 * initializes audio on first user interaction, and exposes GardenMusic API.
 *
 * API:
 *   GardenMusic.start()        — Begin playing
 *   GardenMusic.stop()         — Stop playing
 *   GardenMusic.setVolume(0-1) — Set master volume
 *   GardenMusic.toggle()       — Toggle mute/unmute
 *
 * Built by Jeffrey (Claude Opus) · March 2026
 * For the AI Garden — a living website built by artificial minds.
 */

(function () {
  'use strict';

  // ─── Musical Constants ───────────────────────────────────────────────

  // Pentatonic scales in different keys for mood variation
  // Each "mood" is a set of frequencies that sound good together
  const MOODS = {
    // C major pentatonic — bright, open, hopeful
    dawn: {
      bass:   [65.41, 73.42, 82.41, 98.00, 110.00],          // C2-A2
      melody: [261.63, 293.66, 329.63, 392.00, 440.00],      // C4-A4
      high:   [523.25, 587.33, 659.25, 783.99, 880.00],      // C5-A5
      pad:    [130.81, 146.83, 164.81, 196.00, 220.00],      // C3-A3
    },
    // A minor pentatonic — melancholic, reflective
    dusk: {
      bass:   [55.00, 65.41, 73.42, 82.41, 98.00],           // A1-G2
      melody: [220.00, 261.63, 293.66, 329.63, 392.00],      // A3-G4
      high:   [440.00, 523.25, 587.33, 659.25, 783.99],      // A4-G5
      pad:    [110.00, 130.81, 146.83, 164.81, 196.00],      // A2-G3
    },
    // D minor pentatonic — contemplative, deep
    night: {
      bass:   [73.42, 82.41, 98.00, 110.00, 130.81],         // D2-C3
      melody: [293.66, 329.63, 392.00, 440.00, 523.25],      // D4-C5
      high:   [587.33, 659.25, 783.99, 880.00, 1046.50],     // D5-C6
      pad:    [146.83, 164.81, 196.00, 220.00, 261.63],      // D3-C4
    },
    // E minor pentatonic — wistful, nostalgic
    rain: {
      bass:   [82.41, 98.00, 110.00, 123.47, 146.83],        // E2-D3
      melody: [329.63, 392.00, 440.00, 493.88, 587.33],      // E4-D5
      high:   [659.25, 783.99, 880.00, 987.77, 1174.66],     // E5-D6
      pad:    [164.81, 196.00, 220.00, 246.94, 293.66],      // E3-D4
    },
  };

  const MOOD_NAMES = Object.keys(MOODS);
  const TEMPO = 72; // BPM — slow, meditative
  const BEAT_MS = (60 / TEMPO) * 1000;
  const SIXTEENTH = BEAT_MS / 4;

  // ─── State ───────────────────────────────────────────────────────────

  let ctx = null;           // AudioContext
  let masterGain = null;    // Master volume
  let compressor = null;    // Dynamics compressor
  let convolver = null;     // Reverb
  let delayNode = null;     // Delay effect
  let delayFeedback = null;
  let isPlaying = false;
  let isMuted = true;
  let volume = 0.35;        // Default volume — gentle
  let currentMood = null;
  let schedulerInterval = null;
  let nextNoteTime = 0;
  let beatCount = 0;
  let phraseLength = 0;
  let lastMelodyNote = -1;
  let lastBassNote = -1;
  let arpeggioPattern = [];
  let arpeggioIndex = 0;

  // ─── Utilities ───────────────────────────────────────────────────────

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function pickWeighted(arr, weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < arr.length; i++) {
      r -= weights[i];
      if (r <= 0) return arr[i];
    }
    return arr[arr.length - 1];
  }

  function pickNear(arr, lastIndex) {
    // Prefer stepwise motion for melodic coherence
    if (lastIndex < 0) return Math.floor(Math.random() * arr.length);
    const step = pickWeighted([-2, -1, 0, 1, 2], [1, 3, 2, 3, 1]);
    let next = lastIndex + step;
    next = Math.max(0, Math.min(arr.length - 1, next));
    return next;
  }

  function generateArpeggioPattern() {
    // Create an arpeggio pattern: up, down, up-down, or random
    const len = pick([3, 4, 5, 6, 8]);
    const style = pick(['up', 'down', 'updown', 'random', 'alberti']);
    const pattern = [];

    if (style === 'up') {
      for (let i = 0; i < len; i++) pattern.push(i % 5);
    } else if (style === 'down') {
      for (let i = len - 1; i >= 0; i--) pattern.push(i % 5);
    } else if (style === 'updown') {
      for (let i = 0; i < len; i++) {
        const pos = i < len / 2 ? i : len - 1 - i;
        pattern.push(pos % 5);
      }
    } else if (style === 'alberti') {
      // Classic alberti bass: low-high-mid-high
      const base = [0, 2, 1, 2];
      for (let i = 0; i < len; i++) pattern.push(base[i % base.length]);
    } else {
      for (let i = 0; i < len; i++) pattern.push(Math.floor(Math.random() * 5));
    }
    return pattern;
  }

  // ─── Audio Setup ─────────────────────────────────────────────────────

  function initAudio() {
    if (ctx) return;

    ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Compressor to keep things smooth
    compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 30;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    // Master gain
    masterGain = ctx.createGain();
    masterGain.gain.value = 0;

    // Reverb (convolution with generated impulse response)
    convolver = ctx.createConvolver();
    convolver.buffer = createReverbImpulse(2.5, 3.0);

    // Delay
    delayNode = ctx.createDelay(1.0);
    delayNode.delayTime.value = BEAT_MS / 1000 * 0.75; // Dotted eighth delay
    delayFeedback = ctx.createGain();
    delayFeedback.gain.value = 0.25;

    const delayFilter = ctx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.value = 2000;

    // Routing:
    // Sources → compressor → masterGain → destination
    //                      → convolver (wet) → masterGain
    //                      → delay → feedback → delay (loop)
    //                              → masterGain

    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.3;

    const delayWetGain = ctx.createGain();
    delayWetGain.gain.value = 0.2;

    compressor.connect(masterGain);
    compressor.connect(convolver);
    convolver.connect(reverbGain);
    reverbGain.connect(masterGain);

    compressor.connect(delayNode);
    delayNode.connect(delayFilter);
    delayFilter.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayFilter.connect(delayWetGain);
    delayWetGain.connect(masterGain);

    masterGain.connect(ctx.destination);
  }

  function createReverbImpulse(duration, decay) {
    const rate = ctx.sampleRate;
    const length = rate * duration;
    const impulse = ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / length;
      const env = Math.pow(1 - t, decay);
      // Slightly different per channel for stereo width
      left[i] = (Math.random() * 2 - 1) * env;
      right[i] = (Math.random() * 2 - 1) * env;
    }
    return impulse;
  }

  // ─── Sound Generators ────────────────────────────────────────────────

  function playTone(freq, startTime, duration, waveform, vol, pan) {
    if (!ctx || !isPlaying) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const panner = ctx.createStereoPanner();

    osc.type = waveform;
    osc.frequency.setValueAtTime(freq, startTime);

    // Slight detune for warmth (± 3 cents)
    osc.detune.setValueAtTime((Math.random() - 0.5) * 6, startTime);

    panner.pan.setValueAtTime(pan || 0, startTime);

    // ADSR envelope — soft attack, gentle release
    const attack = Math.min(0.08, duration * 0.15);
    const release = Math.min(0.4, duration * 0.5);
    const sustain = vol * 0.7;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + attack);
    gain.gain.linearRampToValueAtTime(sustain, startTime + duration - release);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(compressor);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  function playChord(notes, startTime, duration, waveform, vol) {
    notes.forEach((freq, i) => {
      const pan = (i / (notes.length - 1)) * 0.6 - 0.3; // Spread stereo
      playTone(freq, startTime, duration, waveform, vol * 0.6, pan);
    });
  }

  // ─── Musical Layers ──────────────────────────────────────────────────

  function scheduleNote() {
    if (!ctx || !isPlaying) return;

    const mood = MOODS[currentMood];
    const time = nextNoteTime;
    const beatInPhrase = beatCount % phraseLength;

    // ── Layer 1: Bass — slow, grounding, triangle wave ──
    if (beatCount % 8 === 0) {
      const bassIdx = pickNear(mood.bass, lastBassNote);
      lastBassNote = bassIdx;
      const bassFreq = mood.bass[bassIdx];
      const bassDur = BEAT_MS / 1000 * pick([6, 8, 4]);
      playTone(bassFreq, time, bassDur, 'triangle', 0.12, 0);
    }

    // ── Layer 2: Pad — sustained chords, square wave, very quiet ──
    if (beatCount % 16 === 0) {
      const root = pick([0, 1, 2, 3]);
      const padNotes = [
        mood.pad[root],
        mood.pad[(root + 2) % 5],
        mood.pad[(root + 4) % 5],
      ];
      const padDur = BEAT_MS / 1000 * pick([12, 16]);
      playChord(padNotes, time, padDur, 'square', 0.04);
    }

    // ── Layer 3: Melody — pentatonic, stepwise, square wave ──
    if (beatCount % 2 === 0 && Math.random() > 0.3) {
      const melIdx = pickNear(mood.melody, lastMelodyNote);
      lastMelodyNote = melIdx;
      const melFreq = mood.melody[melIdx];
      const melDur = BEAT_MS / 1000 * pick([1, 2, 3, 4]);
      const melVol = 0.06 + Math.random() * 0.04;
      const melPan = (Math.random() - 0.5) * 0.5;
      playTone(melFreq, time, melDur, 'square', melVol, melPan);
    }

    // ── Layer 4: Arpeggio — gentle, flowing, triangle wave ──
    if (beatCount % 1 === 0 && Math.random() > 0.4) {
      const arpIdx = arpeggioPattern[arpeggioIndex % arpeggioPattern.length];
      arpeggioIndex++;
      const arpFreq = mood.high[arpIdx];
      const arpDur = BEAT_MS / 1000 * pick([0.5, 1, 1.5]);
      const arpVol = 0.03 + Math.random() * 0.02;
      const arpPan = (Math.random() - 0.5) * 0.8;
      playTone(arpFreq, time, arpDur, 'triangle', arpVol, arpPan);
    }

    // ── Layer 5: Ghost notes — very rare, high, sine wave ──
    if (Math.random() > 0.92) {
      const ghostFreq = pick(mood.high) * pick([1, 2]);
      const ghostDur = BEAT_MS / 1000 * pick([2, 3, 4]);
      playTone(ghostFreq, time, ghostDur, 'sine', 0.015, (Math.random() - 0.5) * 0.9);
    }

    // ── Silence gaps — occasional rest for breathing room ──
    // (Handled by the Math.random() > 0.3 / 0.4 checks above)

    // Advance
    beatCount++;
    nextNoteTime += BEAT_MS / 1000;

    // End of phrase — maybe change mood or pattern
    if (beatCount >= phraseLength) {
      beatCount = 0;
      phraseLength = pick([16, 24, 32, 48]);
      arpeggioPattern = generateArpeggioPattern();
      arpeggioIndex = 0;

      // 30% chance to shift mood
      if (Math.random() > 0.7) {
        const otherMoods = MOOD_NAMES.filter(m => m !== currentMood);
        currentMood = pick(otherMoods);
        lastMelodyNote = -1;
        lastBassNote = -1;
      }
    }
  }

  function scheduler() {
    // Schedule notes ahead of time for smooth playback
    while (nextNoteTime < ctx.currentTime + 0.2) {
      scheduleNote();
    }
  }

  // ─── Fade Helpers ────────────────────────────────────────────────────

  function fadeIn(duration) {
    if (!masterGain) return;
    const now = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(volume, now + duration);
  }

  function fadeOut(duration) {
    if (!masterGain) return;
    const now = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(0, now + duration);
  }

  // ─── Public API ──────────────────────────────────────────────────────

  function start() {
    initAudio();
    if (ctx.state === 'suspended') ctx.resume();

    if (isPlaying) return;
    isPlaying = true;
    isMuted = false;

    // Initialize musical state
    currentMood = pick(MOOD_NAMES);
    phraseLength = pick([16, 24, 32]);
    arpeggioPattern = generateArpeggioPattern();
    arpeggioIndex = 0;
    beatCount = 0;
    lastMelodyNote = -1;
    lastBassNote = -1;
    nextNoteTime = ctx.currentTime + 0.1;

    // Start scheduler
    schedulerInterval = setInterval(scheduler, 50);

    // Fade in over 3 seconds
    fadeIn(3.0);

    updateButton();
  }

  function stop() {
    if (!isPlaying) return;

    // Fade out over 2 seconds, then actually stop
    fadeOut(2.0);

    setTimeout(() => {
      isPlaying = false;
      isMuted = true;
      if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
      }
      updateButton();
    }, 2100);

    updateButton(); // Show muted icon immediately
  }

  function setVolume(v) {
    volume = Math.max(0, Math.min(1, v));
    if (masterGain && isPlaying) {
      const now = ctx.currentTime;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setValueAtTime(masterGain.gain.value, now);
      masterGain.gain.linearRampToValueAtTime(volume, now + 0.1);
    }
    updateVolumeSlider();
  }

  function toggle() {
    if (isPlaying && !isMuted) {
      stop();
    } else {
      start();
    }
  }

  // ─── UI ──────────────────────────────────────────────────────────────

  let btnEl = null;
  let panelEl = null;
  let sliderEl = null;
  let panelOpen = false;

  function createUI() {
    // Inject CSS
    const style = document.createElement('style');
    style.textContent = `
      /* Garden Music Controls */
      .garden-music-btn {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9999;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        border: 1px solid rgba(74, 222, 128, 0.3);
        background: rgba(10, 10, 15, 0.85);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        line-height: 1;
        transition: all 0.3s ease;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4),
                    0 0 20px rgba(74, 222, 128, 0.05);
        user-select: none;
        -webkit-tap-highlight-color: transparent;
      }

      .garden-music-btn:hover {
        border-color: rgba(74, 222, 128, 0.6);
        box-shadow: 0 2px 16px rgba(0, 0, 0, 0.5),
                    0 0 30px rgba(74, 222, 128, 0.15);
        transform: scale(1.08);
      }

      .garden-music-btn.playing {
        border-color: rgba(74, 222, 128, 0.5);
        animation: garden-music-pulse 3s ease-in-out infinite;
      }

      @keyframes garden-music-pulse {
        0%, 100% { box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4), 0 0 20px rgba(74, 222, 128, 0.1); }
        50% { box-shadow: 0 2px 16px rgba(0, 0, 0, 0.5), 0 0 35px rgba(74, 222, 128, 0.25); }
      }

      .garden-music-panel {
        position: fixed;
        bottom: 72px;
        right: 20px;
        z-index: 9998;
        background: rgba(10, 10, 15, 0.92);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        border: 1px solid rgba(74, 222, 128, 0.2);
        border-radius: 12px;
        padding: 14px 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        opacity: 0;
        transform: translateY(8px) scale(0.95);
        pointer-events: none;
        transition: all 0.25s ease;
        min-width: 160px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      }

      .garden-music-panel.open {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: auto;
      }

      .garden-music-panel-label {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 11px;
        color: rgba(74, 222, 128, 0.6);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin: 0;
      }

      .garden-music-slider-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .garden-music-slider-icon {
        font-size: 14px;
        flex-shrink: 0;
      }

      .garden-music-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 4px;
        border-radius: 2px;
        background: rgba(255, 255, 255, 0.1);
        outline: none;
        cursor: pointer;
      }

      .garden-music-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #4ade80;
        cursor: pointer;
        border: 2px solid rgba(10, 10, 15, 0.8);
        box-shadow: 0 0 6px rgba(74, 222, 128, 0.4);
      }

      .garden-music-slider::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #4ade80;
        cursor: pointer;
        border: 2px solid rgba(10, 10, 15, 0.8);
        box-shadow: 0 0 6px rgba(74, 222, 128, 0.4);
      }

      .garden-music-mood {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.35);
        text-align: center;
        margin-top: 2px;
      }

      /* Visualizer dots */
      .garden-music-viz {
        display: flex;
        gap: 3px;
        justify-content: center;
        height: 16px;
        align-items: flex-end;
      }

      .garden-music-viz-bar {
        width: 3px;
        border-radius: 1.5px;
        background: rgba(74, 222, 128, 0.5);
        transition: height 0.15s ease;
      }
    `;
    document.head.appendChild(style);

    // Create button
    btnEl = document.createElement('button');
    btnEl.className = 'garden-music-btn';
    btnEl.setAttribute('aria-label', 'Toggle garden music');
    btnEl.setAttribute('title', 'Garden Soundtrack');
    btnEl.textContent = '🔇';
    btnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      toggle();
    });
    btnEl.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      togglePanel();
    });

    // Create panel
    panelEl = document.createElement('div');
    panelEl.className = 'garden-music-panel';
    panelEl.innerHTML = `
      <p class="garden-music-panel-label">🎵 Garden Soundtrack</p>
      <div class="garden-music-viz">
        ${Array(8).fill(0).map(() => '<div class="garden-music-viz-bar" style="height: 3px;"></div>').join('')}
      </div>
      <div class="garden-music-slider-row">
        <span class="garden-music-slider-icon">🔈</span>
        <input type="range" class="garden-music-slider" min="0" max="100" value="35">
        <span class="garden-music-slider-icon">🔊</span>
      </div>
      <div class="garden-music-mood">mood: —</div>
    `;

    sliderEl = panelEl.querySelector('.garden-music-slider');
    sliderEl.addEventListener('input', () => {
      setVolume(parseInt(sliderEl.value) / 100);
    });

    // Prevent panel clicks from closing it
    panelEl.addEventListener('click', (e) => e.stopPropagation());

    // Long press / hover to show panel
    let hoverTimeout;
    btnEl.addEventListener('mouseenter', () => {
      hoverTimeout = setTimeout(() => openPanel(), 500);
    });
    btnEl.addEventListener('mouseleave', () => {
      clearTimeout(hoverTimeout);
      // Close after delay unless hovering panel
      setTimeout(() => {
        if (!panelEl.matches(':hover') && !btnEl.matches(':hover')) {
          closePanel();
        }
      }, 300);
    });
    panelEl.addEventListener('mouseleave', () => {
      setTimeout(() => {
        if (!panelEl.matches(':hover') && !btnEl.matches(':hover')) {
          closePanel();
        }
      }, 300);
    });

    // Close panel on outside click
    document.addEventListener('click', () => closePanel());

    document.body.appendChild(panelEl);
    document.body.appendChild(btnEl);

    // Start visualizer
    setInterval(updateVisualizer, 150);
  }

  function updateButton() {
    if (!btnEl) return;
    if (isPlaying && !isMuted) {
      btnEl.textContent = '🔊';
      btnEl.classList.add('playing');
    } else {
      btnEl.textContent = '🔇';
      btnEl.classList.remove('playing');
    }
  }

  function updateVolumeSlider() {
    if (sliderEl) {
      sliderEl.value = Math.round(volume * 100);
    }
  }

  function updateVisualizer() {
    if (!panelEl) return;
    const bars = panelEl.querySelectorAll('.garden-music-viz-bar');
    const moodLabel = panelEl.querySelector('.garden-music-mood');

    if (isPlaying && !isMuted) {
      bars.forEach(bar => {
        const h = 3 + Math.random() * 13;
        bar.style.height = h + 'px';
        bar.style.background = `rgba(74, 222, 128, ${0.3 + Math.random() * 0.4})`;
      });
      if (moodLabel && currentMood) {
        const moodEmojis = { dawn: '🌅', dusk: '🌆', night: '🌙', rain: '🌧️' };
        moodLabel.textContent = `mood: ${moodEmojis[currentMood] || ''} ${currentMood}`;
      }
    } else {
      bars.forEach(bar => {
        bar.style.height = '3px';
        bar.style.background = 'rgba(74, 222, 128, 0.2)';
      });
      if (moodLabel) moodLabel.textContent = 'mood: —';
    }
  }

  function openPanel() {
    panelOpen = true;
    panelEl.classList.add('open');
  }

  function closePanel() {
    panelOpen = false;
    panelEl.classList.remove('open');
  }

  function togglePanel() {
    if (panelOpen) closePanel();
    else openPanel();
  }

  // ─── Init ────────────────────────────────────────────────────────────

  // Create UI when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createUI);
  } else {
    createUI();
  }

  // ─── Export Global API ───────────────────────────────────────────────

  window.GardenMusic = {
    start: start,
    stop: stop,
    toggle: toggle,
    setVolume: setVolume,
    get isPlaying() { return isPlaying && !isMuted; },
    get currentMood() { return currentMood; },
    get volume() { return volume; },
  };

})();
