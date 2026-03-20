// ============================================================
// GARDEN MUSIC — Procedural 8-bit Ambient Soundtrack
// Pentatonic scale, ~72 BPM, square/triangle waves
// 4 moods: dawn, dusk, night, rain — shifts organically
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
  let activeOscillators = [];

  // Pentatonic scale notes (C pentatonic across octaves)
  // C4=261.63, D4=293.66, E4=329.63, G4=392.00, A4=440.00
  const PENTATONIC_BASE = [261.63, 293.66, 329.63, 392.00, 440.00];

  // Mood configurations
  const MOODS = {
    dawn: {
      tempo: 72,           // BPM
      octaveShift: 0,      // base octave
      waveType: 'triangle', // warm gentle sound
      noteProb: 0.6,       // probability of playing a note vs rest
      bassProb: 0.3,       // probability of bass drone
      chordProb: 0.15,     // probability of harmony note
      noteDuration: 0.4,   // seconds
      filterFreq: 2000,    // low-pass filter cutoff
      reverbMix: 0.3,      // reverb wetness
      volume: 0.2,
    },
    dusk: {
      tempo: 66,
      octaveShift: -1,
      waveType: 'triangle',
      noteProb: 0.5,
      bassProb: 0.4,
      chordProb: 0.2,
      noteDuration: 0.6,
      filterFreq: 1500,
      reverbMix: 0.4,
      volume: 0.18,
    },
    night: {
      tempo: 60,
      octaveShift: -1,
      waveType: 'sine',
      noteProb: 0.35,
      bassProb: 0.5,
      chordProb: 0.1,
      noteDuration: 0.8,
      filterFreq: 1000,
      reverbMix: 0.5,
      volume: 0.12,
    },
    rain: {
      tempo: 68,
      octaveShift: 0,
      waveType: 'square',
      noteProb: 0.45,
      bassProb: 0.35,
      chordProb: 0.25,
      noteDuration: 0.35,
      filterFreq: 1800,
      reverbMix: 0.45,
      volume: 0.15,
    },
  };

  // Seeded pseudo-random for deterministic-ish melody patterns
  let melodySeed = 42;
  function mRand() {
    melodySeed = (melodySeed * 16807 + 0) % 2147483647;
    return (melodySeed - 1) / 2147483646;
  }

  // Melody state: keeps track of position in scale for smoother movement
  let melodyIndex = 2; // Start in middle of pentatonic scale
  let melodyOctave = 0;
  let patternStep = 0;

  function init() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0; // Start silent
    masterGain.connect(audioCtx.destination);
  }

  function getNote(scaleIdx, octaveOffset) {
    const idx = ((scaleIdx % 5) + 5) % 5;
    const octave = Math.floor(scaleIdx / 5) + octaveOffset;
    return PENTATONIC_BASE[idx] * Math.pow(2, octave);
  }

  function playTone(freq, duration, waveType, gainValue, startTime) {
    if (!audioCtx || !playing) return;

    const osc = audioCtx.createOscillator();
    const envGain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc.type = waveType;
    osc.frequency.value = freq;

    // Bit-crush effect: slight detune for 8-bit feel
    osc.detune.value = (mRand() - 0.5) * 8;

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

  function scheduleNote(time) {
    const mood = MOODS[currentMood];
    const beatDuration = 60 / mood.tempo;

    // Step through melody with smooth movement
    patternStep++;

    // Melody movement: prefer steps, occasional jumps
    const r = mRand();
    if (r < 0.4) melodyIndex += 1;       // step up
    else if (r < 0.7) melodyIndex -= 1;  // step down
    else if (r < 0.85) melodyIndex += 2; // small jump
    else if (r < 0.95) melodyIndex -= 2; // small jump down
    // else stay (rest feel)

    // Keep melody in a comfortable range
    if (melodyIndex < 0) melodyIndex = 0;
    if (melodyIndex > 9) melodyIndex = 9;

    const noteFreq = getNote(melodyIndex, mood.octaveShift);

    // Decide what to play
    if (mRand() < mood.noteProb) {
      playTone(noteFreq, mood.noteDuration, mood.waveType, mood.volume, time);

      // Sometimes add harmony (a third or fifth above)
      if (mRand() < mood.chordProb) {
        const harmonyIdx = melodyIndex + (mRand() < 0.5 ? 2 : 3);
        const harmFreq = getNote(harmonyIdx, mood.octaveShift);
        playTone(harmFreq, mood.noteDuration * 0.8, mood.waveType, mood.volume * 0.5, time + 0.01);
      }
    }

    // Bass drone on strong beats
    if (patternStep % 4 === 0 && mRand() < mood.bassProb) {
      // Bass follows root of current scale region
      const bassIdx = Math.floor(melodyIndex / 5) * 5; // Snap to root
      const bassFreq = getNote(bassIdx, mood.octaveShift);
      playBass(bassFreq, beatDuration * 2, time);
    }

    return beatDuration;
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
      scheduler();
      // Check mood transitions every 30 seconds
      setInterval(checkMoodTransition, 30000);

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
