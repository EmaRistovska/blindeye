import { state, logSystem } from './state.js';

export const Haptic = {
  trigger: function (type) {
    const rawIntensity = (state.db && state.db.settings && state.db.settings.vibeIntensity) || state.vibStrength || 'medium';
    const intensity = rawIntensity.toLowerCase();
    const scale = intensity === 'low' ? 0.5 : intensity === 'high' ? 1.8 : 1.0;

    const basePatterns = {
      short: [45],
      long: [170],
      soft: [25],
      heavy: [90, 40, 110],
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
    const rawMode = (state.db && state.db.settings && state.db.settings.readingMode) || state.readingMode;
    if (rawMode === 'morse' || rawMode === 'morse only') {
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

      if (type === 'soft') { freq = 380; duration = 0.03; }
      else if (type === 'heavy') { freq = 750; duration = 0.18; }
      else if (type === 'short') { freq = 550; duration = 0.05; }
      else if (type === 'long') { freq = 350; duration = 0.16; }
      else if (type === 'success') { freq = 880; duration = 0.12; }
      else if (type === 'error') { freq = 180; duration = 0.25; }
      else if (type === 'warning') { freq = 320; duration = 0.2; }
      else if (type === 'sos') { freq = 900; duration = 0.35; }

      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime);

      const rawIntensity = (state.db && state.db.settings && state.db.settings.vibeIntensity) || state.vibStrength || 'medium';
      const volumeSetting = rawIntensity.toLowerCase();
      const volume = volumeSetting === 'low' ? 0.08 : volumeSetting === 'high' ? 0.45 : 0.22;

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

    const rawSpeed = (state.db && state.db.settings && state.db.settings.morseSpeed) || state.morseSpeed || 'medium';
    const speed = String(rawSpeed).toLowerCase();
    const mult = speed === 'slow' ? 1.5 : (speed === 'fast' ? 0.65 : 1.0);

    const dotDuration = Math.round(50 * mult);
    const dashDuration = Math.round(180 * mult);
    const intraGap = Math.round(70 * mult);
    const charGap = Math.round(180 * mult);
    const wordGap = Math.round(300 * mult);

    let vibratePattern = [];
    const upper = (text || 'OK').toUpperCase();

    let delay = 0;
    for (let char of upper) {
      if (char === ' ') {
        vibratePattern.push(0, wordGap);
        delay += wordGap;
      } else if (charMap[char]) {
        for (let symbol of charMap[char]) {
          const currentDelay = delay;
          if (symbol === '.') {
            vibratePattern.push(dotDuration, intraGap);
            setTimeout(() => {
              this.playSound('short');
              const viz = document.getElementById('vibeVisualizer');
              if (viz) { viz.classList.add('active'); setTimeout(() => viz.classList.remove('active'), dotDuration + 30); }
            }, currentDelay);
            delay += (dotDuration + intraGap);
          } else if (symbol === '-') {
            vibratePattern.push(dashDuration, intraGap);
            setTimeout(() => {
              this.playSound('long');
              const viz = document.getElementById('vibeVisualizer');
              if (viz) { viz.classList.add('active'); setTimeout(() => viz.classList.remove('active'), dashDuration + 30); }
            }, currentDelay);
            delay += (dashDuration + intraGap);
          }
        }
        vibratePattern.push(0, charGap);
        delay += charGap;
      }
    }

    if (vibratePattern.length > 0 && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(vibratePattern);
      } catch (e) {}
    }
  }
};
