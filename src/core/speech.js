import { state, logSystem } from './state.js';
import { Haptic } from './haptics.js';

export const Speech = {
  speak: function (text, interrupt = true, onEndCallback = null) {
    if (state.isMuted || !state.speechEnabled) {
      logSystem(`[Muted Speech]: "${text}"`, 'system');
      const logEl = document.getElementById('ttsOutputLog');
      if (logEl) logEl.innerText = `[MUTED] ${text}`;
      if (onEndCallback) onEndCallback();
      return;
    }

    state.lastSpeechText = text;

    const rawMode = state.db && state.db.settings && state.db.settings.readingMode;
    const readingMode = rawMode ? rawMode.toLowerCase() : 'voice';

    if (readingMode === 'morse') {
      logSystem(`[Morse Only]: "${text}"`, 'system');
      const logEl = document.getElementById('ttsOutputLog');
      if (logEl) logEl.innerText = `[MORSE ONLY] ${text}`;
      playMorseString(text);
      if (onEndCallback) {
        setTimeout(onEndCallback, text.length * 150 + 200);
      }
      return;
    }

    if (readingMode === 'combined') {
      playMorseString(text);
    }

    if (interrupt && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      state.activeSpeechId = null;
    }

    logSystem(`Speaking: "${text}"`, 'action');
    const logEl = document.getElementById('ttsOutputLog');
    if (logEl) logEl.innerText = `> "${text}"`;

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

    window.speechSynthesis.speak(utterance);

    const announcer = document.getElementById('accessibilityAnnouncer');
    if (announcer) {
      announcer.textContent = '';
      requestAnimationFrame(() => {
        announcer.textContent = text;
      });
    }
  },

  stop: function () {
    window.speechSynthesis.cancel();
    state.activeSpeechId = null;
  }
};

export function playMorseString(text) {
  const charMap = {
    'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
    'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
    'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
    'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
    'Y': '-.--', 'Z': '--..', '1': '.----', '2': '..---', '3': '...--',
    '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..',
    '9': '----.', '0': '-----', ' ': ' '
  };

  let sequence = [];
  const upper = text.toUpperCase();
  for (let char of upper) {
    if (charMap[char]) {
      sequence.push(...charMap[char].split(''));
      sequence.push('gap');
    }
  }

  let delay = 0;
  sequence.forEach(symbol => {
    setTimeout(() => {
      if (symbol === '.') Haptic.trigger('short');
      else if (symbol === '-') Haptic.trigger('long');
    }, delay);
    delay += symbol === '.' ? 150 : symbol === '-' ? 350 : 200;
  });
}
