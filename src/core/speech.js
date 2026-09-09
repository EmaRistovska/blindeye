import { state, logSystem } from './state.js';
import { Haptic } from './haptics.js';

let morseTimeouts = [];
let morseAudioCtx = null;

function getMorseAudioContext() {
  if (!morseAudioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) morseAudioCtx = new AudioCtx();
  }
  if (morseAudioCtx && morseAudioCtx.state === 'suspended') {
    morseAudioCtx.resume().catch(() => {});
  }
  return morseAudioCtx;
}

export function playMorseAudioTone(durationMs = 50, freq = 700) {
  try {
    const ctx = getMorseAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    const now = ctx.currentTime;
    const durSec = durationMs / 1000;
    const attack = 0.005;
    const release = 0.005;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.3, now + attack);
    gain.gain.setValueAtTime(0.3, now + durSec - release);
    gain.gain.linearRampToValueAtTime(0.0001, now + durSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + durSec);
  } catch (e) {}
}

export const Speech = {
  speak: function (text, interrupt = true, onEndCallback = null) {
    // 1. Immediately cancel any scheduled Morse pulse timeouts
    morseTimeouts.forEach(t => clearTimeout(t));
    morseTimeouts = [];

    if (!text || typeof text !== 'string') {
      if (onEndCallback) onEndCallback();
      return;
    }

    if (state.isMuted || !state.speechEnabled) {
      logSystem(`[Muted Speech]: "${text}"`, 'system');
      const logEl = document.getElementById('ttsOutputLog');
      if (logEl) logEl.innerText = `[MUTED] ${text}`;
      if (onEndCallback) onEndCallback();
      return;
    }

    state.lastSpeechText = text;

    const rawMode = (state.db && state.db.settings && state.db.settings.readingMode) || state.readingMode;
    const readingMode = rawMode ? rawMode.toLowerCase() : 'voice';
    const isMorseOnly = readingMode === 'morse' || readingMode === 'morse only';

    if (isMorseOnly) {
      logSystem(`[Morse Only]: "${text}"`, 'system');
      const logEl = document.getElementById('ttsOutputLog');
      if (logEl) logEl.innerText = `[MORSE AUDIO + HAPTICS] ${text}`;

      // Cancel any ongoing speech synthesis
      if ('speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch (e) {}
      }

      playMorseString(text);
      if (onEndCallback) {
        const timer = setTimeout(onEndCallback, text.length * 300 + 400);
        morseTimeouts.push(timer);
      }
      return;
    }

    // 2. Unconditionally kill any currently playing or queued utterance
    if (interrupt && ('speechSynthesis' in window)) {
      try {
        window.speechSynthesis.cancel();
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch (e) {
        console.warn('Speech cancel error:', e);
      }
      state.activeSpeechId = null;
    }

    logSystem(`Speaking: "${text}"`, 'action');
    const logEl = document.getElementById('ttsOutputLog');
    if (logEl) logEl.innerText = `> "${text}"`;

    if (!('speechSynthesis' in window)) {
      if (onEndCallback) onEndCallback();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);

    if (/[а-шА-Ш]/.test(text)) {
      utterance.lang = 'mk-MK';
    } else {
      utterance.lang = 'en-US';
    }

    utterance.rate = 1.0;

    const currentSpeechId = Date.now() + Math.random();
    state.activeSpeechId = currentSpeechId;

    if (onEndCallback) {
      utterance.onend = () => {
        if (state.activeSpeechId === currentSpeechId) {
          onEndCallback();
        }
      };
      utterance.onerror = () => {
        if (state.activeSpeechId === currentSpeechId) {
          onEndCallback();
        }
      };
    }

    if (interrupt) {
      setTimeout(() => {
        if (state.activeSpeechId === currentSpeechId && !state.isMuted && state.speechEnabled) {
          try {
            if (window.speechSynthesis.paused) {
              window.speechSynthesis.resume();
            }
            window.speechSynthesis.speak(utterance);
          } catch (e) {
            console.error('SpeechSynthesis speak error:', e);
          }
        }
      }, 20);
    } else {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.error('SpeechSynthesis speak error:', e);
      }
    }

    const announcer = document.getElementById('accessibilityAnnouncer');
    if (announcer) {
      announcer.textContent = '';
      requestAnimationFrame(() => {
        announcer.textContent = text;
      });
    }
  },

  stop: function () {
    morseTimeouts.forEach(t => clearTimeout(t));
    morseTimeouts = [];
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch (e) {}
    }
    state.activeSpeechId = null;
  }
};

export function playMorseString(text) {
  morseTimeouts.forEach(t => clearTimeout(t));
  morseTimeouts = [];

  const charMap = {
    'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
    'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
    'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
    'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
    'Y': '-.--', 'Z': '--..', '1': '.----', '2': '..---', '3': '...--',
    '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..',
    '9': '----.', '0': '-----', ' ': ' '
  };

  const cleanText = (text || '').replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const words = cleanText.split(' ');
  const morseInput = words.slice(0, 8).join(' ');

  const rawSpeed = (state.db && state.db.settings && state.db.settings.morseSpeed) || state.morseSpeed || 'medium';
  const speed = String(rawSpeed).toLowerCase();
  const mult = speed === 'slow' ? 1.5 : (speed === 'fast' ? 0.55 : 1.0);
  const toneFreq = speed === 'slow' ? 600 : (speed === 'fast' ? 820 : 700);

  const dotDur = Math.round(75 * mult);
  const dashDur = Math.round(230 * mult);
  const intraGap = Math.round(75 * mult);
  const charPause = Math.round(220 * mult);
  const wordPause = Math.round(480 * mult);

  let delay = 0;
  const upper = morseInput.toUpperCase();

  for (let i = 0; i < upper.length; i++) {
    const char = upper[i];
    if (char === ' ') {
      delay += wordPause;
      continue;
    }

    const code = charMap[char];
    if (!code) continue;

    for (let s of code) {
      const isDot = s === '.';
      const dur = isDot ? dotDur : dashDur;
      const currentDelay = delay;

      const t = setTimeout(() => {
        // 1. Audio Beep (sine tone)
        playMorseAudioTone(dur, toneFreq);

        // 2. Physical Vibration
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate([dur]);
          } catch (e) {}
        }

        // 3. Visual Waveform
        const vizEl = document.getElementById('vibeVisualizer');
        if (vizEl) {
          vizEl.classList.add('active');
          setTimeout(() => vizEl.classList.remove('active'), dur);
        }

        // 4. Simulator Tactile Bar Indicator
        const simHapticBars = document.querySelectorAll('[id$="_hapticBar"]');
        simHapticBars.forEach(bar => {
          bar.style.background = 'rgba(255,238,85,0.2)';
          bar.style.borderColor = '#FFEE55';
          bar.style.color = '#FFEE55';
          bar.innerText = `[ MORSE (${speed.toUpperCase()}): ${isDot ? 'DOT (•)' : 'DASH (—)'} ]`;
        });
      }, currentDelay);

      morseTimeouts.push(t);
      delay += dur + intraGap;
    }

    delay += charPause;
  }

  const endTimer = setTimeout(() => {
    const simHapticBars = document.querySelectorAll('[id$="_hapticBar"]');
    simHapticBars.forEach(bar => {
      if (bar.innerText.includes('MORSE')) {
        bar.innerText = '[ IDLE ]';
        bar.style.background = '';
        bar.style.borderColor = '';
        bar.style.color = '';
      }
    });
  }, delay + 150);
  morseTimeouts.push(endTimer);
}

export function formatPhoneForTTS(phone) {
  if (!phone || typeof phone !== 'string') return '';
  const hasPlus = phone.includes('+');
  const clean = phone.replace(/\+/g, '').trim();
  const chunks = clean.split(/\s+/).filter(Boolean);
  const formattedChunks = chunks.map(chunk => chunk.split('').join(' '));
  const result = formattedChunks.join(', ');
  return hasPlus ? `plus ${result}` : result;
}

