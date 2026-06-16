// ============================================================
// GARDEN MUSIC — Procedural 8-bit Earworm Soundtrack
// Original chiptune loop: hook, bass, arpeggio, and tiny noise drums.
// 4 moods: dawn, dusk, night, rain — shifts organically.
// ============================================================

const GardenMusic = (function() {
  let audioCtx = null;
  let masterGain = null;
  let playing = false;
  let muted = true;
  let volume = 0.25;
  let currentMood = 'dawn';
  let nextNoteTime = 0;
  let schedulerTimer = null;
  let moodTimer = null;
  let activeOscillators = [];

  // A minor-ish chip scale. The hook is original to AI Garden.
  const ROOT_A3 = 220;
  const CHIP_SCALE = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24, 27];
  const HOOK_STEPS = [
    7, null, 7, 10, 9, 7, 5, null,
    3, 5, 7, null, 10, 9, 7, null,
    7, 7, 12, 10, 9, null, 7, 5,
    3, null, 5, 7, 5, 3, 2, null
  ];
  const BASS_STEPS = [0, 0, 3, 3, 5, 5, 2, 2];
  const ARP_STEPS = [0, 2, 4, 7, 4, 2, 0, 4];

  // Mood configurations
  const MOODS = {
    dawn: {
      tempo: 104,
      octaveShift: 0,
      waveType: 'square',
      arpWave: 'triangle',
      noteProb: 0.92,
      bassProb: 0.95,
      chordProb: 0.35,
      noteDuration: 0.18,
      filterFreq: 2600,
      volume: 0.18,
      drumMix: 0.75,
      swing: 0.05,
    },
    dusk: {
      tempo: 96,
      octaveShift: -1,
      waveType: 'square',
      arpWave: 'triangle',
      noteProb: 0.82,
      bassProb: 0.9,
      chordProb: 0.25,
      noteDuration: 0.22,
      filterFreq: 1900,
      volume: 0.16,
      drumMix: 0.55,
      swing: 0.07,
    },
    night: {
      tempo: 88,
      octaveShift: -1,
      waveType: 'triangle',
      arpWave: 'sine',
      noteProb: 0.62,
      bassProb: 0.75,
      chordProb: 0.12,
      noteDuration: 0.28,
      filterFreq: 1200,
      volume: 0.13,
      drumMix: 0.32,
      swing: 0.08,
    },
    rain: {
      tempo: 112,
      octaveShift: 0,
      waveType: 'square',
      arpWave: 'square',
      noteProb: 0.78,
      bassProb: 0.8,
      chordProb: 0.32,
      noteDuration: 0.15,
      filterFreq: 2100,
      volume: 0.15,
      drumMix: 0.9,
      swing: 0.03,
    },
  };

  // Seeded pseudo-random for deterministic-ish melody patterns
  let melodySeed = 42;
  function mRand() {
    melodySeed = (melodySeed * 16807 + 0) % 2147483647;
    return (melodySeed - 1) / 2147483646;
  }

  let patternStep = 0;

  function init() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0; // Start silent
    masterGain.connect(audioCtx.destination);
  }

  function getChipNote(scaleIdx, octaveOffset) {
    const idx = ((scaleIdx % CHIP_SCALE.length) + CHIP_SCALE.length) % CHIP_SCALE.length;
    const octave = Math.floor(scaleIdx / CHIP_SCALE.length) + octaveOffset;
    return ROOT_A3 * Math.pow(2, (CHIP_SCALE[idx] + octave * 12) / 12);
  }

  function playTone(freq, duration, waveType, gainValue, startTime) {
    if (!audioCtx || !playing) return;

    const osc = audioCtx.createOscillator();
    const envGain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc.type = waveType;
    osc.frequency.value = freq;

    // Tiny detune keeps the chip sound alive without turning sour.
    osc.detune.value = (mRand() - 0.5) * 5;

    // Low-pass filter for warmth
    const mood = MOODS[currentMood];
    filter.type = 'lowpass';
    filter.frequency.value = mood.filterFreq;
    filter.Q.value = 1;

    // ADSR envelope
    const attack = 0.02;
    const decay = duration * 0.3;
    const sustain = gainValue * 0.6;
    const release = duration * 0.4;

    envGain.gain.setValueAtTime(0, startTime);
    envGain.gain.linearRampToValueAtTime(gainValue, startTime + attack);
    envGain.gain.linearRampToValueAtTime(sustain, startTime + attack + decay);
    envGain.gain.linearRampToValueAtTime(sustain, startTime + duration - release);
    envGain.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.connect(filter);
    filter.connect(envGain);
    envGain.connect(masterGain);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);

    // Track for cleanup
    const entry = { osc, stopTime: startTime + duration + 0.1 };
    activeOscillators.push(entry);
    osc.onended = function() {
      const idx = activeOscillators.indexOf(entry);
      if (idx !== -1) activeOscillators.splice(idx, 1);
    };
  }

  function playBass(freq, duration, startTime) {
    if (!audioCtx || !playing) return;

    const osc = audioCtx.createOscillator();
    const envGain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.value = freq / 4; // Two octaves below

    filter.type = 'lowpass';
    filter.frequency.value = 400;
    filter.Q.value = 0.5;

    const gainVal = MOODS[currentMood].volume * 0.4;
    envGain.gain.setValueAtTime(0, startTime);
    envGain.gain.linearRampToValueAtTime(gainVal, startTime + 0.05);
    envGain.gain.setValueAtTime(gainVal, startTime + duration * 0.7);
    envGain.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.connect(filter);
    filter.connect(envGain);
    envGain.connect(masterGain);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);

    const entry = { osc, stopTime: startTime + duration + 0.1 };
    activeOscillators.push(entry);
    osc.onended = function() {
      const idx = activeOscillators.indexOf(entry);
      if (idx !== -1) activeOscillators.splice(idx, 1);
    };
  }

  function playChipKick(startTime) {
    if (!audioCtx || !playing) return;
    const osc = audioCtx.createOscillator();
    const envGain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(130, startTime);
    osc.frequency.exponentialRampToValueAtTime(42, startTime + 0.09);
    envGain.gain.setValueAtTime(0.0001, startTime);
    envGain.gain.linearRampToValueAtTime(MOODS[currentMood].volume * 0.75, startTime + 0.006);
    envGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.12);
    osc.connect(envGain);
    envGain.connect(masterGain);
    osc.start(startTime);
    osc.stop(startTime + 0.14);
    const entry = { osc, stopTime: startTime + 0.15 };
    activeOscillators.push(entry);
    osc.onended = function() {
      const idx = activeOscillators.indexOf(entry);
      if (idx !== -1) activeOscillators.splice(idx, 1);
    };
  }

  function playNoiseBurst(duration, gainValue, startTime, filterFreq) {
    if (!audioCtx || !playing) return;
    const frames = Math.max(1, Math.floor(audioCtx.sampleRate * duration));
    const buffer = audioCtx.createBuffer(1, frames, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      const decay = 1 - i / frames;
      data[i] = (mRand() * 2 - 1) * decay;
    }
    const source = audioCtx.createBufferSource();
    const filter = audioCtx.createBiquadFilter();
    const envGain = audioCtx.createGain();
    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 0.9;
    envGain.gain.setValueAtTime(0.0001, startTime);
    envGain.gain.linearRampToValueAtTime(gainValue, startTime + 0.004);
    envGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    source.connect(filter);
    filter.connect(envGain);
    envGain.connect(masterGain);
    source.start(startTime);
    source.stop(startTime + duration + 0.01);
    const entry = { osc: source, stopTime: startTime + duration + 0.02 };
    activeOscillators.push(entry);
    source.onended = function() {
      const idx = activeOscillators.indexOf(entry);
      if (idx !== -1) activeOscillators.splice(idx, 1);
    };
  }

  function scheduleNote(time) {
    const mood = MOODS[currentMood];
    const stepDuration = (60 / mood.tempo) / 4;
    const step = patternStep % HOOK_STEPS.length;
    const barStep = patternStep % 16;
    const phrase = Math.floor(patternStep / 32) % 4;
    const swingTime = (barStep % 2 === 1) ? stepDuration * mood.swing : 0;
    const noteTime = time + swingTime;

    if (mood.drumMix > 0.3) {
      if (barStep === 0 || barStep === 10) playChipKick(time);
      if (barStep === 8) playNoiseBurst(0.11, mood.volume * mood.drumMix * 0.55, time, 1100);
      if (barStep % 2 === 1 && currentMood !== 'night') {
        playNoiseBurst(0.026, mood.volume * mood.drumMix * 0.18, noteTime, 5200);
      }
    }

    if (barStep % 4 === 0 && mRand() < mood.bassProb) {
      const bassStep = BASS_STEPS[Math.floor((patternStep % 32) / 4)];
      playBass(getChipNote(bassStep, mood.octaveShift), stepDuration * 3.5, time);
    }

    if (barStep % 2 === 0) {
      const arpRoot = BASS_STEPS[Math.floor((patternStep % 32) / 4)];
      const arpStep = arpRoot + ARP_STEPS[(patternStep / 2 | 0) % ARP_STEPS.length];
      playTone(getChipNote(arpStep, mood.octaveShift + 1), stepDuration * 0.85, mood.arpWave || 'square', mood.volume * 0.35, noteTime + 0.015);
    }

    const hookStep = HOOK_STEPS[step];
    if (hookStep !== null && mRand() < mood.noteProb) {
      const lift = phrase === 2 ? 1 : 0;
      const freq = getChipNote(hookStep + lift, mood.octaveShift + 1);
      const accent = (barStep === 0 || barStep === 4 || barStep === 12) ? 1.25 : 1;
      playTone(freq, mood.noteDuration + stepDuration * 0.7, mood.waveType, mood.volume * accent, noteTime);

      if (mRand() < mood.chordProb) {
        playTone(getChipNote(hookStep + 2 + lift, mood.octaveShift + 1), mood.noteDuration, 'triangle', mood.volume * 0.45, noteTime + 0.018);
      }
    }

    patternStep++;
    return stepDuration;
  }

  function scheduler() {
    if (!playing || !audioCtx) return;

    // Schedule notes ahead of time for smooth playback
    while (nextNoteTime < audioCtx.currentTime + 0.2) {
      const beatLen = scheduleNote(nextNoteTime);
      nextNoteTime += beatLen;
    }

    schedulerTimer = setTimeout(scheduler, 50);
  }

  // Auto-detect mood from garden weather/time
  function detectMood() {
    // Check weather indicator text
    const weatherEl = document.getElementById('weather-indicator');
    if (weatherEl) {
      const text = weatherEl.textContent;
      if (text.includes('🌧')) return 'rain';
      if (text.includes('🌙')) return 'night';
      if (text.includes('☁')) return 'dusk';
    }

    // Fallback: use time of day
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 10) return 'dawn';
    if (hour >= 10 && hour < 17) return 'dawn';
    if (hour >= 17 && hour < 21) return 'dusk';
    return 'night';
  }

  // Mood transition checker
  function checkMoodTransition() {
    if (!playing) return;
    const newMood = detectMood();
    if (newMood !== currentMood) {
      currentMood = newMood;
      // Reset melody seed for new mood feel
      melodySeed = Date.now() % 2147483647;
    }
  }

  // Public API
  return {
    start: function() {
      init();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      playing = true;
      currentMood = detectMood();
      nextNoteTime = audioCtx.currentTime + 0.1;
      melodySeed = Date.now() % 2147483647;
      patternStep = patternStep % HOOK_STEPS.length;
      if (!schedulerTimer) scheduler();
      // Check mood transitions every 30 seconds
      if (!moodTimer) moodTimer = setInterval(checkMoodTransition, 30000);

      if (!muted) {
        masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
        masterGain.gain.setValueAtTime(masterGain.gain.value, audioCtx.currentTime);
        masterGain.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + 0.5);
      }
    },

    stop: function() {
      playing = false;
      if (schedulerTimer) {
        clearTimeout(schedulerTimer);
        schedulerTimer = null;
      }
      if (moodTimer) {
        clearInterval(moodTimer);
        moodTimer = null;
      }
      if (masterGain) {
        masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
        masterGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
      }
      // Stop all active oscillators
      for (const entry of activeOscillators) {
        try { entry.osc.stop(); } catch(e) {}
      }
      activeOscillators = [];
    },

    setVolume: function(v) {
      volume = Math.max(0, Math.min(1, v));
      if (masterGain && !muted && playing) {
        masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
        masterGain.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + 0.1);
      }
    },

    toggleMute: function() {
      init();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      muted = !muted;
      if (!playing) {
        this.start();
      }
      if (muted) {
        masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
        masterGain.gain.setValueAtTime(masterGain.gain.value, audioCtx.currentTime);
        masterGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
      } else {
        masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
        masterGain.gain.setValueAtTime(masterGain.gain.value, audioCtx.currentTime);
        masterGain.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + 0.5);
      }
      return !muted; // returns true if now unmuted
    },

    isMuted: function() { return muted; },
    isPlaying: function() { return playing; },
    getMood: function() { return currentMood; },
    setMood: function(m) { if (MOODS[m]) currentMood = m; },
  };
})();

// Expose the API globally so ambient-toggle and other scripts can reach it.
if (typeof window !== 'undefined') window.GardenMusic = GardenMusic;
