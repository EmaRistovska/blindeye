import { state, logSystem } from './state.js';

export const Haptic = {
  trigger: function (type) {
    const intensity = (state.db && state.db.settings && state.db.settings.vibeIntensity) || 'medium';
    const scale = intensity === 'low' ? 0.6 : intensity === 'high' ? 1.4 : 1.0;

    const basePatterns = {
      short: [40],
      long: [160],
      success: [40, 50, 80],
      error: [80, 50, 80, 50, 120],
      warning: [120, 60, 120],
      sos: [60, 40, 60, 40, 60, 150, 160, 50, 160, 50, 160, 150, 60, 40, 60, 40, 60]
    };

    const raw = basePatterns[type] || basePatterns.short;
    const pattern = raw.map((val, idx) => idx % 2 === 0 ? Math.round(val * scale) : val);

    logSystem(`Haptic Trigger: ${type} [${pattern.join(',')} ms] (${intensity} intensity)`, 'action');

    // Visual Haptic Waveform in DOM
    const vizEl = document.getElementById('vibeVisualizer');
    if (vizEl) {
      vizEl.classList.remove('active', 'error-active', 'success-active');
      void vizEl.offsetWidth; // Force reflow
      const activeClass = type === 'error' ? 'error-active' : type === 'success' ? 'success-active' : 'active';
      vizEl.classList.add(activeClass);
      setTimeout(() => vizEl.classList.remove(activeClass), 450);
    }

    // Physical Hardware Vibration Motor (Capacitor / Browser Web Vibration API)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        console.warn('[Haptics] navigator.vibrate error:', e);
      }
    }

    this.playSound(type);
  },

  playSound: function (type) {
    const rawMode = state.db && state.db.settings && state.db.settings.readingMode;
    if (rawMode === 'morse') {
      // In Morse Only mode (for deaf-blind users), suppress audio tones
      return;
    }

    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      let freq = 440;
      let duration = 0.05;

      if (type === 'short') { freq = 600; duration = 0.04; }
      else if (type === 'long') { freq = 350; duration = 0.16; }
      else if (type === 'success') { freq = 880; duration = 0.12; }
      else if (type === 'error') { freq = 180; duration = 0.25; }
      else if (type === 'warning') { freq = 320; duration = 0.2; }
      else if (type === 'sos') { freq = 900; duration = 0.35; }

      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime);

      const volumeSetting = (state.db && state.db.settings && state.db.settings.vibeIntensity) || 'medium';
      const volume = volumeSetting === 'low' ? 0.1 : volumeSetting === 'high' ? 0.4 : 0.25;

      gainNode.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + 0.015);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration - 0.015);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // AudioContext may be locked until user touch
    }
  },

  playMorse: function (text) {
    const charMap = {
      'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
      'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
      'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
      'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
      'Y': '-.--', 'Z': '--..', '1': '.----', '2': '..---', '3': '...--',
      '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..',
      '9': '----.', '0': '-----', ' ': ' '
    };

    let vibratePattern = [];
    const upper = text.toUpperCase();

    for (let char of upper) {
      if (char === ' ') {
        vibratePattern.push(0, 300); // word gap
      } else if (charMap[char]) {
        for (let symbol of charMap[char]) {
          if (symbol === '.') {
            vibratePattern.push(50, 60); // dot pulse + intra-symbol gap
          } else if (symbol === '-') {
            vibratePattern.push(180, 60); // dash pulse + intra-symbol gap
          }
        }
        vibratePattern.push(0, 150); // inter-character gap
      }
    }

    if (vibratePattern.length > 0 && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(vibratePattern);
    }
  }
};
