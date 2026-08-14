import { state, logSystem } from './state.js';

export const Haptic = {
  trigger: function (type) {
    const patterns = {
      short: [40],
      long: [150],
      success: [30, 50, 60],
      error: [80, 40, 80, 40, 80],
      warning: [100, 50, 100],
      sos: [40, 40, 40, 40, 40, 40, 150, 150, 150, 40, 40, 40, 40, 40, 40]
    };

    const pattern = patterns[type] || patterns.short;
    logSystem(`Haptic Trigger: ${type} [${pattern.join(',')}]`, 'action');

    const vizEl = document.getElementById('vibeVisualizer');
    if (vizEl) {
      vizEl.classList.remove('active', 'error-active', 'success-active');
      void vizEl.offsetWidth; // Force reflow
      const activeClass = type === 'error' ? 'error-active' : type === 'success' ? 'success-active' : 'active';
      vizEl.classList.add(activeClass);
      setTimeout(() => vizEl.classList.remove(activeClass), 400);
    }

    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }

    this.playSound(type);
  },

  playSound: function (type) {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      let freq = 440;
      let duration = 0.05;

      if (type === 'short') { freq = 600; duration = 0.04; }
      else if (type === 'long') { freq = 350; duration = 0.15; }
      else if (type === 'success') { freq = 880; duration = 0.1; }
      else if (type === 'error') { freq = 180; duration = 0.25; }

      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      const volumeSetting = (state.db && state.db.settings && state.db.settings.vibeIntensity) || 'medium';
      const volume = volumeSetting === 'low' ? 0.1 : volumeSetting === 'high' ? 0.4 : 0.25;

      gainNode.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + 0.015);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration - 0.015);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // AudioContext might be blocked until user gesture
    }
  }
};
