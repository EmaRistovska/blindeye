/**
 * BlindTouch / BlindEye - Accessibility Platform Prototype Simulator Controller
 * Full client-side state engine and simulation layer
 */

// ==========================================
// 1. DATABASE & MOCK STATE
// ==========================================

/**
 * Increment this integer whenever INITIAL_DB gains a new top-level key
 * or a new nested settings field. The migration function will forward-fill
 * missing fields from INITIAL_DB so existing saved data is never lost.
 */
const DB_SCHEMA_VERSION = 2;

const INITIAL_DB = {
  _version: DB_SCHEMA_VERSION,
  settings: {
    readingMode: 'voice', // 'voice', 'morse', 'combined'
    privacyMode: 'auto', // 'auto', 'off'
    vibeIntensity: 'medium', // 'low', 'medium', 'high'
    quickAccess: ['call_mother', 'nav_home', 'sos_trigger']
  },
  contacts: [
    { id: 1, name: 'Mother', phone: '+389 70 123 456', favorite: true, emergency: true },
    { id: 2, name: 'Brother', phone: '+389 71 987 654', favorite: true, emergency: false },
    { id: 3, name: 'Doctor', phone: '+389 72 555 112', favorite: false, emergency: true },
    { id: 4, name: 'Pharmacy Eurofarm', phone: '+389 2 3200 900', favorite: false, emergency: false },
    { id: 5, name: 'Ana Friend', phone: '+389 75 444 888', favorite: false, emergency: false }
  ],
  messages: [
    { id: 1, senderId: 1, senderName: 'Mother', text: 'Hi, where are you? When are you coming home?', unread: true, time: '12:05' },
    { id: 2, senderId: 2, senderName: 'Brother', text: 'I will be 10 minutes late, buy some bread.', unread: false, time: '11:42' },
    { id: 3, senderId: 3, senderName: 'Doctor', phone: '+389 72 555 112', text: 'Your appointment is tomorrow at 9 AM.', unread: false, time: 'Yesterday' }
  ],
  recentCalls: [
    { id: 1, name: 'Mother', type: 'received', time: '10:30 AM' },
    { id: 2, name: 'Brother', type: 'missed', time: 'Yesterday' },
    { id: 3, name: 'Doctor', type: 'received', time: '2 days ago' }
  ],
  savedPlaces: [
    { id: 1, name: 'Home', address: 'Partizanska 45, Skopje' },
    { id: 2, name: 'Doctor Office', address: 'Mother Teresa clinic, Skopje' }
  ],
  tutorialCompleted: false
};

/**
 * Forward-fill any fields that exist in INITIAL_DB but are absent from
 * the saved DB (happens when a new schema version adds fields).
 * Never deletes user data — only adds missing keys.
 */
function migrateDb(saved) {
  // Migrate top-level keys
  for (const key of Object.keys(INITIAL_DB)) {
    if (saved[key] === undefined) {
      saved[key] = JSON.parse(JSON.stringify(INITIAL_DB[key]));
      console.info(`[DB migration] Added missing key: "${key}"`);
    }
  }

  // Migrate nested settings fields
  if (saved.settings && INITIAL_DB.settings) {
    for (const key of Object.keys(INITIAL_DB.settings)) {
      if (saved.settings[key] === undefined) {
        saved.settings[key] = INITIAL_DB.settings[key];
        console.info(`[DB migration] Added missing settings.${key}`);
      }
    }
  }

  saved._version = DB_SCHEMA_VERSION;
  return saved;
}

// State Manager
let state = {
  db: null, // populated by loadDb() below
  currentScreen: 'welcomeScreen',
  currentSubScreen: null, // e.g. 'contactsView'
  focusedIndex: 0,
  focusedItems: [], // List of elements currently focusable
  gestureStart: null,
  isMuted: false,
  activeSpeech: null,
  speechEnabled: true,
  handwritingPoints: [],
  handwritingTimeout: null,
  dialedNumber: '',
  isCameraActive: false,
  webcamStream: null,
  activeCallContact: null,
  callTimerInterval: null,
  sosCountdownTimer: null,
  sosCountdownValue: 3,
  sosIsDispatched: false,
  activeMorseSequence: []
};

// Database helper functions
function loadDb() {
  const raw = localStorage.getItem('blindtouch_db');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      // Run migration if saved version is behind current schema
      if (!parsed._version || parsed._version < DB_SCHEMA_VERSION) {
        console.info(`[DB] Migrating from schema v${parsed._version || 0} → v${DB_SCHEMA_VERSION}`);
        state.db = migrateDb(parsed);
        saveDb(); // persist migrated data immediately
      } else {
        state.db = parsed;
      }
    } catch (e) {
      console.error('[DB] Corrupt localStorage data — resetting to INITIAL_DB:', e);
      state.db = JSON.parse(JSON.stringify(INITIAL_DB));
      saveDb();
    }
  } else {
    state.db = JSON.parse(JSON.stringify(INITIAL_DB));
  }
}

function saveDb() {
  localStorage.setItem('blindtouch_db', JSON.stringify(state.db));
  logSystem('LocalStorage database updated.');
}

// Developer helper to reset state in browser console
window.resetAppOnboarding = function () {
  localStorage.removeItem('blindtouch_db');
  localStorage.removeItem('blindEye_tutorialCompleted');
  if (state.db) {
    state.db.letterProfiles = {};
    state.db.tutorialCompleted = false;
  }
  location.reload();
};


// Logging helper for dashboard
function logSystem(text, type = 'system') {
  const consoleLog = document.getElementById('systemLogsConsole');
  if (!consoleLog) return;
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  const timestamp = new Date().toLocaleTimeString();
  entry.innerText = `[${timestamp}] ${text}`;
  consoleLog.appendChild(entry);
  consoleLog.scrollTop = consoleLog.scrollHeight;
}

function formatPhoneNumberForSpeech(phone) {
  if (!phone) return '';
  return phone.split('').map(char => {
    if (char === '+') return 'plus ';
    if (/\d/.test(char)) return char + ' ';
    return char;
  }).join('');
}

// ==========================================
// 2. TEXT-TO-SPEECH (TTS) SYSTEM
// ==========================================

const Speech = {
  speak: function (text, interrupt = true) {
    if (state.isMuted || !state.speechEnabled) {
      logSystem(`[Muted Speech]: "${text}"`, 'system');
      const logEl = document.getElementById('ttsOutputLog');
      if (logEl) logEl.innerText = `[MUTED] ${text}`;
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
      return; // Skip speech synthesis entirely
    }

    if (readingMode === 'combined') {
      playMorseString(text);
    }

    if (interrupt && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    logSystem(`Speaking: "${text}"`, 'action');
    const logEl = document.getElementById('ttsOutputLog');
    if (logEl) logEl.innerText = `> "${text}"`;

    const utterance = new SpeechSynthesisUtterance(text);

    // Auto-detect language. If Macedonian characters present, set locale or speed adjustments
    if (/[а-шА-Ш]/.test(text)) {
      utterance.lang = 'mk-MK';
    } else {
      utterance.lang = 'en-US';
    }

    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);

    // --- ARIA LIVE REGION MIRROR ---
    // Mirrors the announcement into a visually-hidden assertive ARIA region so
    // that native screen readers (TalkBack / VoiceOver) can announce the text
    // through their own pipeline without competing with speechSynthesis.
    const announcer = document.getElementById('accessibilityAnnouncer');
    if (announcer) {
      // Clear first (in the same frame) then set in the next frame so that
      // repeated identical strings still trigger a screen reader announcement.
      announcer.textContent = '';
      requestAnimationFrame(() => {
        announcer.textContent = text;
      });
    }
  },

  stop: function () {
    window.speechSynthesis.cancel();
  }
};


// Toggle mute button
const btnToggleSpeech = document.getElementById('btnToggleSpeech');
if (btnToggleSpeech) {
  btnToggleSpeech.addEventListener('click', () => {
    state.isMuted = !state.isMuted;
    const btn = document.getElementById('btnToggleSpeech');
    if (state.isMuted) {
      btn.className = 'tts-mute-btn muted';
      btn.innerHTML = '<i class="fa-solid fa-volume-xmark" id="ttsVolumeIcon"></i> Voice Mute: ON';
      Speech.stop();
      logSystem('Text-To-Speech synthesizer muted.');
    } else {
      btn.className = 'tts-mute-btn';
      btn.innerHTML = '<i class="fa-solid fa-volume-high" id="ttsVolumeIcon"></i> Voice Mute: Off';
      logSystem('Text-To-Speech synthesizer enabled.');
      Speech.speak('Voice output enabled');
    }
  });
}

// ==========================================
// 3. AUDIO & VISUAL HAPTIC SIMULATION
// ==========================================

// Web Audio API context for offline programmatic audio tone generation (Morse beeps)
let audioCtx = null;

function playTone(frequency, duration, type = 'sine') {
  if (state.isMuted) return;
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);

    // Smooth envelope ramp-up/down to prevent speaker popping/clicking
    gainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    const volumeSetting = (state.db && state.db.settings && state.db.settings.vibeIntensity) || 'medium';
    const volume = volumeSetting === 'low' ? 0.1 : volumeSetting === 'high' ? 0.4 : 0.25;
    
    gainNode.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration / 1000 - 0.015);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration / 1000);
  } catch (e) {
    console.warn("Web Audio API tone generation failed or blocked:", e);
  }
}

const Haptic = {
  trigger: function (patternType) {
    const ring = document.getElementById('hapticRippleRing');
    const core = document.getElementById('hapticCenterDot');
    const symbolLog = document.getElementById('vibeSymbolText');
    const phone = document.getElementById('phoneDevice');

    if (ring && core) {
      ring.className = 'haptic-ripple';
      core.className = 'haptic-center-core';
      void ring.offsetWidth; // Trigger reflow
      void core.offsetWidth;
    }

    if (patternType === 'short' || patternType === 'dot') {
      if (ring && core) {
        ring.classList.add('vibe-short');
        core.classList.add('vibe-short');
      }
      if (symbolLog) symbolLog.innerText = '● (short vibration)';
      this.playSound('short');
      if (navigator.vibrate) navigator.vibrate(100);
      logSystem('Haptic: ● (short vibration)', 'action');
    }
    else if (patternType === 'long' || patternType === 'dash') {
      if (ring && core) {
        ring.classList.add('vibe-long');
        core.classList.add('vibe-long');
      }
      if (symbolLog) symbolLog.innerText = '━━ (long vibration)';
      this.playSound('long');
      if (navigator.vibrate) navigator.vibrate(300);
      logSystem('Haptic: ━━ (long vibration)', 'action');
    }
    else if (patternType === 'success') {
      if (ring && core) {
        ring.classList.add('vibe-short');
        core.classList.add('vibe-short');
      }
      if (symbolLog) symbolLog.innerText = '●  ● (success vibration)';
      this.playSound('short');
      if (navigator.vibrate) navigator.vibrate([80, 50, 80]);

      setTimeout(() => {
        if (ring) {
          ring.className = 'haptic-ripple';
          void ring.offsetWidth;
          ring.classList.add('vibe-short');
        }
        this.playSound('short');
      }, 150);

      logSystem('Haptic: ● ● (success confirmation)', 'action');
    }
    else if (patternType === 'error') {
      if (ring && core) {
        ring.classList.add('vibe-long');
        core.classList.add('vibe-long');
      }
      if (symbolLog) symbolLog.innerText = '●  ●  ● (error vibration)';
      this.playSound('short');

      let count = 0;
      const interval = setInterval(() => {
        count++;
        this.playSound('short');
        if (count >= 2) clearInterval(interval);
      }, 120);

      if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100]);

      if (phone) {
        phone.classList.add('shaking');
        setTimeout(() => phone.classList.remove('shaking'), 300);
      }

      logSystem('Haptic: ● ● ● (error signal)', 'error');
    }
    else if (patternType === 'incomingCall') {
      if (ring && core) {
        ring.classList.add('vibe-long');
        core.classList.add('vibe-long');
      }
      if (symbolLog) symbolLog.innerText = '━━  ━━ (Incoming call vibration)';
      this.playSound('ringing');
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      if (phone) {
        phone.classList.add('shaking');
        setTimeout(() => phone.classList.remove('shaking'), 400);
      }
      logSystem('Haptic: ━━ ━━ (Incoming call vibration)', 'action');
    }
    else if (patternType === 'declineCall') {
      if (ring && core) {
        ring.classList.add('vibe-long');
        core.classList.add('vibe-long');
      }
      if (symbolLog) symbolLog.innerText = '━━━━━ (Call declined vibration)';
      this.playSound('long');
      if (navigator.vibrate) navigator.vibrate(600);
      if (phone) {
        phone.classList.add('shaking');
        setTimeout(() => phone.classList.remove('shaking'), 600);
      }
      logSystem('Haptic: ━━━━━ (Call declined vibration)', 'action');
    }
  },

  playSound: function (type) {
    if (state.isMuted) return;
    try {
      // Programmatic sine tone generator for Morse signals — guarantees sound works offline
      if (type === 'short' || type === 'dot') {
        playTone(700, 100);
        return;
      }
      if (type === 'long' || type === 'dash') {
        playTone(700, 300);
        return;
      }

      let id = 'soundBeepShort';
      if (type === 'ringing') id = 'soundCallRinging';
      else if (type === 'connected') id = 'soundCallConnected';
      else if (type === 'siren') id = 'soundSiren';

      const el = document.getElementById(id);
      if (el) {
        el.currentTime = 0;
        const volumeSetting = (state.db && state.db.settings && state.db.settings.vibeIntensity) || 'medium';
        el.volume = volumeSetting === 'low' ? 0.3 : volumeSetting === 'high' ? 1.0 : 0.6;
        el.play().catch(e => console.log('Audio playback blocked: ', e));
      }
    } catch (e) {
      console.log('Audio error:', e);
    }
  }
};

// ==========================================
// 4. MORSE HAPTIC ENCODER/DECODER
// ==========================================

const MORSE_MAP = {
  'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.', 'G': '--.', 'H': '....',
  'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..', 'M': '--', 'N': '-.', 'O': '---', 'P': '.--.',
  'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
  'Y': '-.--', 'Z': '--..',
  '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....',
  '6': '-....', '7': '--...', '8': '---..', '9': '----.', '0': '-----'
};

const DECODE_MORSE_MAP = Object.fromEntries(Object.entries(MORSE_MAP).map(([k, v]) => [v, k]));

// ---------------------------------------------------------------------------
// MORSE VIBRATION TIMING CONSTANTS
// DOT  = 100ms on | DASH = 300ms on | inter-symbol gap = 100ms off
// inter-letter gap = 300ms off | inter-word gap = 700ms off
// These match ITU-R M.1677-1 standard timing ratios (1 : 3 : 1 : 3 : 7)
// ---------------------------------------------------------------------------
const MORSE_VIBE = {
  DOT: 100,
  DASH: 300,
  SYM_GAP: 100,   // gap between dots/dashes within one letter
  LETTER_GAP: 300,   // gap between letters
  WORD_GAP: 700,   // gap between words
};

const MORSE_INPUT = {
  DOT_THRESHOLD: 250,
  DASH_THRESHOLD: 600
};

/**
 * Build a navigator.vibrate()-compatible [on, off, on, off ...] array
 * from a plain text string, using the MORSE_MAP lookup table.
 * Returns an empty array for strings with no recognised characters.
 */
function buildMorseVibratePattern(str) {
  const pattern = [];
  const words = str.toUpperCase().split(' ');

  words.forEach((word, wi) => {
    for (let ci = 0; ci < word.length; ci++) {
      const code = MORSE_MAP[word[ci]];
      if (!code) continue;

      for (let si = 0; si < code.length; si++) {
        const pulse = code[si] === '.' ? MORSE_VIBE.DOT : MORSE_VIBE.DASH;
        pattern.push(pulse);
        // Add inter-symbol gap after every pulse except the last in the letter
        if (si < code.length - 1) pattern.push(MORSE_VIBE.SYM_GAP);
      }
      // After each letter (except the last in a word): inter-letter gap
      if (ci < word.length - 1) pattern.push(MORSE_VIBE.LETTER_GAP);
    }
    // After each word (except the last): inter-word gap
    if (wi < words.length - 1) pattern.push(MORSE_VIBE.WORD_GAP);
  });

  return pattern;
}

/**
 * Play a Morse haptic sequence for a text string.
 *
 * Behaviour depends on user's reading mode and device capability:
 *  - If navigator.vibrate is supported AND readingMode includes 'morse':
 *      → fires a single atomic vibration pattern (true motor output for deaf-blind).
 *      → ALSO runs the visual simulator timeline (for sighted demo observers).
 *  - Otherwise:
 *      → runs only the visual/audio simulator timeline (original behaviour).
 *
 * The onComplete callback fires after the visual timeline finishes so that
 * callers (TTS chaining etc.) continue at the right moment regardless of path.
 */
function playMorseString(str, onComplete = null) {
  state.speechEnabled = false;

  // --- DEAF-BLIND PATH: single atomic motor vibration pattern ---
  const readingMode = (state.db && state.db.settings && state.db.settings.readingMode) || 'voice';
  const isMorseMode = (readingMode === 'morse' || readingMode === 'combined');

  if (isMorseMode && navigator.vibrate) {
    const pattern = buildMorseVibratePattern(str);
    if (pattern.length > 0) {
      navigator.vibrate(pattern);
      logSystem(`Morse motor vibration: "${str}" (${pattern.length} pulses)`, 'action');
    }
  }

  // --- SIMULATOR VISUAL/AUDIO TIMELINE (always runs for UI feedback) ---
  const words = str.toUpperCase().split(' ');
  let timeline = [];

  words.forEach(word => {
    for (let char of word) {
      const code = MORSE_MAP[char];
      if (code) {
        for (let pulse of code) {
          timeline.push({ type: pulse === '.' ? 'short' : 'long', char });
        }
        timeline.push({ type: 'pause-letter' });
      }
    }
    timeline.push({ type: 'pause-word' });
  });

  let index = 0;

  function nextPulse() {
    if (index >= timeline.length) {
      state.speechEnabled = true;
      if (onComplete) onComplete();
      return;
    }

    const step = timeline[index++];
    if (step.type === 'short' || step.type === 'long') {
      // In morse mode the motor vibration is already running atomically above;
      // call Haptic.trigger for the visual ripple animation only (sound is muted
      // for deaf-blind users anyway via isMuted or readingMode check).
      Haptic.trigger(step.type);
      setTimeout(nextPulse, step.type === 'short' ? 250 : 650);
    } else if (step.type === 'pause-letter') {
      setTimeout(nextPulse, 400);
    } else if (step.type === 'pause-word') {
      setTimeout(nextPulse, 900);
    }
  }

  nextPulse();
}

// ==========================================
// 5. SMARTPHONE GESTURE MANAGER
// ==========================================

const GestureManager = {
  init: function () {
    this.isTwoFingerGesture = false;
    const screen = document.getElementById('phoneScreen');

    if (screen) {
      screen.addEventListener('mousedown', (e) => {
        this.isTwoFingerGesture = false;
        this.start(e.clientX, e.clientY);
      });
      screen.addEventListener('mouseup', (e) => this.end(e.clientX, e.clientY));

      screen.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
          this.isTwoFingerGesture = true;
        } else if (e.touches.length === 1 && !this.isTwoFingerGesture) {
          this.isTwoFingerGesture = false;
        }
        const touch = e.touches[0];
        if (touch) this.start(touch.clientX, touch.clientY);
      });
      screen.addEventListener('touchend', (e) => {
        const touch = e.changedTouches[0];
        if (touch) this.end(touch.clientX, touch.clientY);
      });
    }

    const bindBtn = (id, gesture) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', () => {
          this.isTwoFingerGesture = (gesture === 'swipeDown');
          this.handleGesture(gesture);
        });
      }
    };

    bindBtn('btnSimulateSwipeL', 'swipeLeft');
    bindBtn('btnSimulateSwipeR', 'swipeRight');
    bindBtn('btnSimulateSwipeU', 'swipeUp');
    bindBtn('btnSimulateSwipeD', 'swipeDown');
    bindBtn('btnSimulateTap', 'tap');
    bindBtn('btnSimulateDblTap', 'doubleTap');
    bindBtn('btnSimulateLongPress', 'longPress');

    const bioBtn = document.getElementById('btnSimulateBioLock');
    if (bioBtn) bioBtn.addEventListener('click', () => triggerBiometricAuth());

    const simCallBtn = document.getElementById('btnSimulateIncomingCall');
    if (simCallBtn) {
      simCallBtn.addEventListener('click', () => {
        const sampleContact = (state.db && state.db.contacts && state.db.contacts[0]) || { name: 'Brother', phone: '+389 71 987 654' };
        triggerIncomingCall(sampleContact);
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'i' || e.key === 'I') {
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
          return;
        }
        const sampleContact = (state.db && state.db.contacts && state.db.contacts[0]) || { name: 'Brother', phone: '+389 71 987 654' };
        triggerIncomingCall(sampleContact);
      }
    });

    const skipTutBtn = document.getElementById('skipTutorialBtn');
    if (skipTutBtn) {
      skipTutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (state.db) state.db.tutorialCompleted = true;
        localStorage.setItem('blindEye_tutorialCompleted', 'true');
        saveDb();
        navigateTo('mainMenuScreen');
      });
    }

    const shakeBtn = document.getElementById('btnSimulateShake');
    if (shakeBtn) {
      shakeBtn.addEventListener('click', () => {
        logSystem('Double Shake detected via hardware simulator.', 'action');
        triggerSOS();
      });
    }

    let lastShakeTime = 0;
    let shakeCount = 0;
    let firstShakeTime = 0;        // timestamp of the first shake in a pair
    let lastX = null, lastY = null, lastZ = null;

    // After SOS triggers or is cancelled, block re-trigger for this many ms.
    // Stored on state so cancelSOS() can also reset it.
    state._sosCooldownUntil = 0;

    window.addEventListener('devicemotion', (e) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc || acc.x === null) return;

      if (lastX !== null) {
        const deltaX = Math.abs(acc.x - lastX);
        const deltaY = Math.abs(acc.y - lastY);
        const deltaZ = Math.abs(acc.z - lastZ);

        if (deltaX + deltaY + deltaZ > 25) {
          const now = Date.now();

          // Respect cooldown period after a previous SOS trigger or cancel
          if (now < state._sosCooldownUntil) {
            lastX = acc.x; lastY = acc.y; lastZ = acc.z;
            return;
          }

          if (shakeCount === 0) {
            // Record the very first shake
            shakeCount = 1;
            firstShakeTime = now;
            lastShakeTime = now;
          } else if (shakeCount === 1) {
            // Second shake must arrive:
            //  • within 800ms of the first (double-shake window)
            //  • at least 150ms after the first (prevents single jerk double-counting)
            const sinceFirst = now - firstShakeTime;
            const sinceLastPeak = now - lastShakeTime;

            if (sinceFirst < 800 && sinceLastPeak >= 150) {
              shakeCount = 0;
              state._sosCooldownUntil = now + 10000; // 10-second cooldown
              logSystem('Physical device double-shake detected!', 'action');
              triggerSOS();
            } else if (sinceFirst >= 800) {
              // Window expired — treat this as a new first shake
              shakeCount = 1;
              firstShakeTime = now;
            }
            lastShakeTime = now;
          }
        }
      }
      lastX = acc.x;
      lastY = acc.y;
      lastZ = acc.z;
    });

  },

  start: function (x, y) {
    if (state.currentScreen === 'callsScreen' && state.currentSubScreen === 'handwritingDialerView') {
      return;
    }
    state.gestureStart = { x, y, time: Date.now() };
  },

  end: function (x, y) {
    if (!state.gestureStart) {
      this.isTwoFingerGesture = false;
      return;
    }

    const deltaX = x - state.gestureStart.x;
    const deltaY = y - state.gestureStart.y;
    const duration = Date.now() - state.gestureStart.time;
    const startX = state.gestureStart.x;
    const startY = state.gestureStart.y;

    const minSwipeDist = 45;
    let gesture = null;

    if (duration > 650 && Math.abs(deltaX) < 15 && Math.abs(deltaY) < 15) {
      gesture = 'longPress';
    }
    else if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > minSwipeDist) {
        gesture = deltaX > 0 ? 'swipeRight' : 'swipeLeft';
      }
    }
    else {
      if (Math.abs(deltaY) > minSwipeDist) {
        gesture = deltaY > 0 ? 'swipeDown' : 'swipeUp';
      }
    }

    const phoneEl = document.getElementById('phoneScreen');
    let relX = 0, relY = 0;
    if (phoneEl) {
      const rect = phoneEl.getBoundingClientRect();
      relX = startX - rect.left;
      relY = startY - rect.top;
    }

    if (!gesture && duration < 300) {
      const now = Date.now();
      if (!state.tapCount) state.tapCount = 0;

      if (state.lastTapTime && (now - state.lastTapTime < 350)) {
        state.tapCount++;
      } else {
        state.tapCount = 1;
      }
      state.lastTapTime = now;

      if (state.tapTimer) clearTimeout(state.tapTimer);

      if (state.tapCount === 3) {
        state.tapCount = 0;
        state.lastTapTime = null;
        state.gestureStart = null;
        this.handleGesture('tripleTap', startX, startY);
        this.isTwoFingerGesture = false;
        return;
      }

      state.tapTimer = setTimeout(() => {
        if (state.tapCount === 2) {
          this.handleGesture('doubleTap', startX, startY);
        } else if (state.tapCount === 1) {
          this.handleGesture('tap', startX, startY);
        }
        state.tapCount = 0;
        state.lastTapTime = null;
        this.isTwoFingerGesture = false;
      }, 350);

      state.gestureStart = null;
      return;
    }

    state.gestureStart = null;
    if (gesture) {
      this.handleGesture(gesture, startX, startY);
    }
    this.isTwoFingerGesture = false;
  },

  handleGesture: function (gesture, x, y) {
    logSystem(`Gesture: ${gesture} at (${x}, ${y})`, 'input');
    if (gesture === 'tap') Haptic.playSound('short');

    // --- GLOBAL TOP-BAR SPATIAL CHECKS (Works across ALL screens) ---
    const phoneEl = document.getElementById('phoneScreen');
    if (phoneEl && x !== undefined && y !== undefined) {
      const rect = phoneEl.getBoundingClientRect();

      // Calculate relative X and Y inside the phone screen container
      const relX = x - rect.left;
      const relY = y - rect.top;
      const relHeight = rect.height;
      const relWidth = rect.width;

      // Top 15% of the inner phone screen height
      const isTopBar = relY > 0 && relY < (relHeight * 0.15);

      if (isTopBar) {
        // Top-Right 35% of inner phone screen width
        const isTopRight = relX > (relWidth * 0.65);

        if (gesture === 'doubleTap' && !isTopRight) {
          Haptic.trigger('success');
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          Speech.speak("Current time is " + timeStr);
          return;
        }
        else if ((gesture === 'doubleTap' || gesture === 'tripleTap') && isTopRight) {
          Haptic.trigger('success');
          if ('getBattery' in navigator) {
            navigator.getBattery().then(battery => {
              const level = Math.round(battery.level * 100);
              const status = battery.charging ? 'charging' : 'discharging';
              Speech.speak('Battery level is ' + level + ' percent, ' + status);
            });
          } else {
            Speech.speak('Battery level is 85 percent, simulated.');
          }
          return;
        }
      }
    }

    if (state.currentScreen === 'sosScreen') {
      if (gesture === 'longPress') {
        cancelSOS();
      } else {
        Haptic.trigger('error');
      }
      return;
    }

    if (state.currentScreen === 'activeCallScreen') {
      if (gesture === 'doubleTap' || gesture === 'longPress') {
        endCall();
      } else {
        Haptic.trigger('error');
      }
      return;
    }

    if (state.currentScreen === 'incomingCallScreen') {
      if (gesture === 'doubleTap') {
        answerIncomingCall();
      } else if (gesture === 'longPress') {
        declineIncomingCall();
      } else {
        Haptic.trigger('error');
        if (state.activeCallContact) {
          Speech.speak("Incoming call from " + state.activeCallContact.name + ". Double tap to answer, long press to decline.");
        }
      }
      return;
    }

    const qaOverlay = document.getElementById('quickAccessOverlay');
    if (qaOverlay && qaOverlay.classList.contains('active')) {
      handleQuickAccessNavigation(gesture);
      return;
    }

    if (gesture === 'swipeDown') {
      if (this.isTwoFingerGesture && state.currentScreen !== 'tutorialScreen' && state.currentScreen !== 'welcomeScreen') {
        Haptic.trigger('success');
        toggleQuickAccess(true);
        // Note: toggleQuickAccess() already announces the first item + count via Speech.speak()
      }
      return;
    }

    switch (state.currentScreen) {
      case 'welcomeScreen':
        handleWelcomeGesture(gesture);
        break;
      case 'tutorialScreen':
        handleTutorialGesture(gesture);
        break;
      case 'mainMenuScreen':
        handleMainMenuGesture(gesture);
        break;
      case 'messagesScreen':
        handleMessagesGesture(gesture);
        break;
      case 'callsScreen':
        handleCallsGesture(gesture);
        break;
      case 'cameraScreen':
        handleCameraGesture(gesture);
        break;
      case 'navigationScreen':
        handleNavigationGesture(gesture);
        break;
      case 'settingsScreen':
        handleSettingsGesture(gesture);
        break;
    }
  }
};

function handleWelcomeGesture(gesture) {
  const isCompleted = state.db.tutorialCompleted || localStorage.getItem('blindEye_tutorialCompleted') === 'true';

  if (!isCompleted) {
    if (gesture === 'swipeRight') {
      Haptic.trigger('success');
      state.db.tutorialCompleted = true;
      localStorage.setItem('blindEye_tutorialCompleted', 'true');
      saveDb();
      startTutorial();
    } else if (gesture === 'doubleTap' || gesture === 'tap') {
      Haptic.trigger('success');
      state.db.tutorialCompleted = true;
      localStorage.setItem('blindEye_tutorialCompleted', 'true');
      saveDb();
      navigateTo('mainMenuScreen');
    }
  } else {
    if (welcomeTimer) {
      clearTimeout(welcomeTimer);
      welcomeTimer = null;
    }
    Haptic.trigger('success');
    navigateTo('mainMenuScreen');
  }
}

function handleTutorialGesture(gesture) {
  // Long press: skip calibration and switch to voice-only mode
  if (gesture === 'longPress') {
    Haptic.trigger('long');
    skipCalibrationToVoiceMode();
    return;
  }
  // Any other gesture: re-announce the current calibration step
  const currentLetter = CALIBRATION_LETTERS[calibrationState.letterIdx] || 'M';
  const count = calibrationState.count || 1;
  if (gesture === 'doubleTap') {
    Haptic.trigger('short');
    Speech.speak(`Draw letter ${currentLetter}, ${count} of 3. Long press at any time to skip to voice-only mode.`);
  } else {
    Haptic.trigger('short');
    Speech.speak(`Draw letter ${currentLetter} on the canvas.`);
  }
}

// ==========================================
// 6. HEURISTIC HANDWRITING RECOGNIZER
// ==========================================

const Handwriting = {
  activeCanvas: null,
  ctx: null,
  isDrawing: false,
  points: [],
  timeout: null,

  init: function () {
    this.initCanvas('handwritingCanvas');
  },

  initCanvas: function (canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    this.activeCanvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resizeCanvas(canvas);

    const self = this;
    canvas.onmousedown = (e) => {
      const phoneEl = document.getElementById('phoneScreen');
      if (phoneEl) {
        const rect = phoneEl.getBoundingClientRect();
        const relY = e.clientY - rect.top;
        const relHeight = rect.height;
        if (canvasId === 'handwritingMenuCanvas' && relY < relHeight * 0.15) {
          return;
        }
      }
      self.startDraw(e.offsetX, e.offsetY);
    };
    canvas.onmousemove = (e) => self.draw(e.offsetX, e.offsetY);
    canvas.onmouseup = () => self.endDraw();
    canvas.onmouseleave = () => self.endDraw();

    canvas.ontouchstart = (e) => {
      const touch = e.touches[0];
      if (touch) {
        const phoneEl = document.getElementById('phoneScreen');
        if (phoneEl) {
          const rect = phoneEl.getBoundingClientRect();
          const relY = touch.clientY - rect.top;
          const relHeight = rect.height;
          if (canvasId === 'handwritingMenuCanvas' && relY < relHeight * 0.15) {
            return;
          }
        }
      }
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      if (touch) self.startDraw(touch.clientX - rect.left, touch.clientY - rect.top);
    };
    canvas.ontouchmove = (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      if (touch) self.draw(touch.clientX - rect.left, touch.clientY - rect.top);
    };
    canvas.ontouchend = () => self.endDraw();
  },

  resizeCanvas: function (canvas) {
    if (!canvas) canvas = this.activeCanvas;
    if (!canvas) return;

    // Bug fix: If layout hasn't run yet (offsetWidth is 0), defer execution to the next frame
    // to obtain the true CSS computed size. Limit to 10 attempts to prevent infinite loops.
    if (canvas.offsetWidth === 0) {
      if (!canvas._resizeAttempts) canvas._resizeAttempts = 0;
      if (canvas._resizeAttempts < 10) {
        canvas._resizeAttempts++;
        requestAnimationFrame(() => this.resizeCanvas(canvas));
        return;
      }
    }
    canvas._resizeAttempts = 0;

    // Bug fix #5: Scale canvas backing buffer by devicePixelRatio for crisp strokes on
    // Retina / high-DPI displays. The CSS size stays the same; only the pixel buffer grows.
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.offsetWidth || 292; // Default to 292 (padded content width of 360px screen)
    const cssHeight = canvas.offsetHeight || 340; // Default to 340
    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;
    canvas.style.width = cssWidth + 'px';
    canvas.style.height = cssHeight + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    this.clearCanvas(canvas);
  },

  clearCanvas: function (canvas) {
    if (!canvas) canvas = this.activeCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#FFCC00';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  },

  startDraw: function (x, y) {
    if (!this.ctx) return;
    this.isDrawing = true;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.points = [{ x, y, t: Date.now() }];
    if (this.timeout) clearTimeout(this.timeout);
  },

  draw: function (x, y) {
    if (!this.isDrawing || !this.ctx) return;
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    this.points.push({ x, y, t: Date.now() });
  },

  endDraw: function () {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.timeout = setTimeout(() => {
      this.recognize();
    }, 600);
  },

  recognize: function () {
    const pts = this.points;
    if (pts.length < 5) {
      this.clearCanvas();
      return;
    }

    if (state.currentScreen === 'mainMenuScreen') {
      handleMainMenuHandwriting(pts);
    } else if (state.currentScreen === 'tutorialScreen') {
      handleTutorialCalibrationStroke(pts);
    } else if (state.currentSubScreen === 'handwritingDialerView') {
      handleDialerHandwriting(pts);
    }

    this.clearCanvas();
  }
};

function handleDialerHandwriting(pts) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  pts.forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });

  const w = maxX - minX;
  const h = maxY - minY;

  let digit = '7';
  if (h / (w || 1) > 2.2) digit = '1';
  else if (w / h > 0.6 && w / h < 1.6) digit = '0';

  if (state.dialedNumber === 'No number' || state.dialedNumber === '') {
    state.dialedNumber = digit;
  } else {
    state.dialedNumber += digit;
  }

  const logEl = document.getElementById('dialerNumberLog');
  if (logEl) logEl.innerText = state.dialedNumber;
  Speech.speak(getDigitName(digit));
  Haptic.trigger('short');
}

function resamplePoints(pts, n = 20) {
  if (!pts || pts.length === 0) return [];
  if (pts.length === 1) return Array(n).fill({ x: pts[0].x, y: pts[0].y });

  let totalLength = 0;
  const dists = [0];
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    const d = Math.sqrt(dx * dx + dy * dy);
    totalLength += d;
    dists.push(totalLength);
  }

  if (totalLength === 0) return Array(n).fill({ x: pts[0].x, y: pts[0].y });

  const step = totalLength / (n - 1);
  const result = [pts[0]];
  let srcIdx = 0;

  for (let i = 1; i < n - 1; i++) {
    const targetDist = i * step;
    while (srcIdx < dists.length - 1 && dists[srcIdx + 1] < targetDist) {
      srcIdx++;
    }
    const d0 = dists[srcIdx];
    const d1 = dists[srcIdx + 1] || d0;
    const t = (d1 - d0) === 0 ? 0 : (targetDist - d0) / (d1 - d0);
    const p0 = pts[srcIdx];
    const p1 = pts[srcIdx + 1] || p0;

    result.push({
      x: p0.x + t * (p1.x - p0.x),
      y: p0.y + t * (p1.y - p0.y)
    });
  }

  result.push(pts[pts.length - 1]);
  return result;
}

function compareStrokeToProfile(normPts, ar, profile) {
  if (!profile || !profile.resampledPts) return Infinity;
  const sample = resamplePoints(normPts, 20);
  let distSum = 0;
  for (let i = 0; i < 20; i++) {
    const dx = sample[i].x - profile.resampledPts[i].x;
    const dy = sample[i].y - profile.resampledPts[i].y;
    distSum += Math.sqrt(dx * dx + dy * dy);
  }
  const avgDist = distSum / 20;
  const arDiff = Math.abs(ar - profile.ar);
  return avgDist + 0.3 * arDiff;
}

function recognizeHeuristicLetter(normPts, ar, startP, endP) {
  const n = normPts.length;
  const startX = normPts[0].x;
  const startY = normPts[0].y;
  const endX = normPts[n - 1].x;
  const endY = normPts[n - 1].y;

  let yExtrema = [];
  for (let i = 2; i < n - 2; i++) {
    const prevDy = normPts[i].y - normPts[i - 2].y;
    const nextDy = normPts[i + 2].y - normPts[i].y;
    if (prevDy < -0.05 && nextDy > 0.05) {
      yExtrema.push({ type: 'peak', x: normPts[i].x, y: normPts[i].y, idx: i });
    } else if (prevDy > 0.05 && nextDy < -0.05) {
      yExtrema.push({ type: 'valley', x: normPts[i].x, y: normPts[i].y, idx: i });
    }
  }

  let xExtrema = [];
  for (let i = 2; i < n - 2; i++) {
    const prevDx = normPts[i].x - normPts[i - 2].x;
    const nextDx = normPts[i + 2].x - normPts[i].x;
    if (prevDx < -0.05 && nextDx > 0.05) {
      xExtrema.push({ type: 'leftmost', x: normPts[i].x, y: normPts[i].y });
    } else if (prevDx > 0.05 && nextDx < -0.05) {
      xExtrema.push({ type: 'rightmost', x: normPts[i].x, y: normPts[i].y });
    }
  }

  const topPeaks = yExtrema.filter(e => e.type === 'peak' || e.y < 0.45);

  if (topPeaks.length >= 2 || (startY > 0.5 && endY > 0.5 && yExtrema.length >= 2)) {
    return 'M';
  }

  if ((startY > 0.5 && endY < 0.5) || (topPeaks.length === 1 && endY < 0.5)) {
    return 'N';
  }

  if (startY > 0.5 && endY < 0.75 && endX < 0.6 && startX < 0.5) {
    return 'P';
  }

  if (xExtrema.length >= 2 || (startX > 0.4 && endX < 0.6 && yExtrema.length >= 2)) {
    return 'S';
  } else if (startX > 0.3 && endX > 0.3 && (xExtrema.length <= 1)) {
    return 'C';
  }

  if (startY > 0.5 && endY > 0.5) return 'M';
  if (startY > 0.5 && endY < 0.5) return 'N';
  if (startX > 0.4 && endX > 0.4) return 'C';
  if (startX > 0.4 && endX < 0.5) return 'S';

  // Bug fix #1: Return null for genuinely unrecognized strokes instead of defaulting
  // to 'P'. The caller (handleMainMenuHandwriting) handles null by playing an error haptic
  // and speaking "Letter not recognized" — much better than silently opening Phone.
  return null;
}

function recognizeMainMenuLetter(pts) {
  if (!pts || pts.length < 5) return null;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  pts.forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });

  const w = maxX - minX;
  const h = maxY - minY;
  const ar = h / (w || 1);

  const normPts = pts.map(p => ({
    x: (p.x - minX) / (w || 1),
    y: (p.y - minY) / (h || 1)
  }));

  if (state.db.letterProfiles && Object.keys(state.db.letterProfiles).length > 0) {
    let bestLetter = null;
    let bestScore = Infinity;

    for (const [letter, profile] of Object.entries(state.db.letterProfiles)) {
      if (!profile || !profile.resampledPts) continue;
      const score = compareStrokeToProfile(normPts, ar, profile);
      if (score < bestScore) {
        bestScore = score;
        bestLetter = letter;
      }
    }

    if (bestLetter && bestScore < 1.8) {
      return bestLetter;
    }
  }

  return recognizeHeuristicLetter(normPts, ar, pts[0], pts[pts.length - 1]);
}

function handleMainMenuHandwriting(pts) {
  const recognizedLetter = recognizeMainMenuLetter(pts);

  const categoryMap = {
    'M': { name: 'Messages', targetScreen: 'messagesScreen', targetSubScreen: 'msgThreadsView' },
    'P': { name: 'Phone', targetScreen: 'callsScreen', targetSubScreen: 'callsMenuView' },
    'C': { name: 'Camera', targetScreen: 'cameraScreen', targetSubScreen: 'cameraMenuView' },
    'N': { name: 'Navigation', targetScreen: 'navigationScreen', targetSubScreen: 'navMenuView' },
    'S': { name: 'Settings', targetScreen: 'settingsScreen', targetSubScreen: 'settingsMenuView' }
  };

  if (recognizedLetter && categoryMap[recognizedLetter]) {
    const cat = categoryMap[recognizedLetter];
    Haptic.trigger('success');
    Speech.speak(`Opening ${cat.name}`);
    navigateTo(cat.targetScreen, cat.targetSubScreen);
  } else {
    Haptic.trigger('error');
    Speech.speak('Letter not recognized. Draw M, P, C, N, or S.');
  }
}

function getDigitName(d) {
  const names = { '0': 'Zero', '1': 'One', '2': 'Two', '3': 'Three', '4': 'Four', '5': 'Five', '6': 'Six', '7': 'Seven', '8': 'Eight', '9': 'Nine' };
  return names[d] || d;
}

// ==========================================
// 7. SCREEN ROUTER & NAVIGATION
// ==========================================

let welcomeTimer = null;

function navigateTo(screenId, subScreenId = null) {
  Speech.stop();

  if (welcomeTimer) {
    clearTimeout(welcomeTimer);
    welcomeTimer = null;
  }
  if (routingSimulationTimer) {
    clearInterval(routingSimulationTimer);
    routingSimulationTimer = null;
  }
  if (incomingCallInterval) {
    clearInterval(incomingCallInterval);
    incomingCallInterval = null;
  }
  if (state.callTimerInterval) {
    clearInterval(state.callTimerInterval);
    state.callTimerInterval = null;
  }
  if (state.tapTimer) {
    clearTimeout(state.tapTimer);
    state.tapTimer = null;
  }
  if (morseTimer) {
    clearTimeout(morseTimer);
    morseTimer = null;
  }
  if (navMorseTimer) {
    clearTimeout(navMorseTimer);
    navMorseTimer = null;
  }

  // Silence active call audio if exiting call screens
  if (screenId !== 'activeCallScreen' && screenId !== 'incomingCallScreen') {
    try {
      const ringSound = document.getElementById('soundCallRinging');
      const connSound = document.getElementById('soundCallConnected');
      if (ringSound) ringSound.pause();
      if (connSound) connSound.pause();
    } catch (e) { }
  }

  if (state.isCameraActive && screenId !== 'cameraScreen') {
    stopWebcam();
  }

  // 1. Hide all screen views
  const screens = document.querySelectorAll('.screen-view');
  screens.forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });

  state.previousScreen = state.currentScreen;
  state.currentScreen = screenId;
  state.currentSubScreen = subScreenId;

  // 2. Show target screen container
  const targetScreen = document.getElementById(screenId);
  if (targetScreen) {
    targetScreen.classList.add('active');
    targetScreen.style.display = 'flex';
  }

  // 3. Handle sub-screens inside targetScreen
  if (targetScreen) {
    const subScreens = targetScreen.querySelectorAll('.sub-screen');
    subScreens.forEach(sub => {
      sub.classList.remove('active');
      sub.style.display = 'none';
    });

    if (subScreenId) {
      const targetSubScreen = document.getElementById(subScreenId);
      if (targetSubScreen) {
        targetSubScreen.classList.add('active');
        targetSubScreen.style.display = 'flex';
      }
    } else if (subScreens.length > 0) {
      subScreens[0].classList.add('active');
      subScreens[0].style.display = 'flex';
      state.currentSubScreen = subScreens[0].id;
    }
  }

  logSystem(`Navigated to: ${screenId} -> ${subScreenId || 'main'}`, 'action');

  // 4. Toggle Navigation Area visibility
  const navArea = document.getElementById('navigationArea') || document.getElementById('fixedNavigationArea');
  if (navArea) {
    if (screenId === 'welcomeScreen' || screenId === 'tutorialScreen' || screenId === 'sosScreen' || screenId === 'activeCallScreen') {
      navArea.style.display = 'none';
    } else {
      navArea.style.display = 'flex';
    }
  }

  updatePrivacyScreenState();
  onScreenLoaded(screenId, subScreenId);
}

function updatePrivacyScreenState() {
  const overlay = document.getElementById('privacyOverlay');
  if (!overlay) return;
  const messagePrivacySubScreens = ['msgReplyView', 'msgMorseInputView', 'msgSttView', 'msgQuickRepliesView'];
  const isPrivateScreen = (state.currentScreen === 'messagesScreen' && messagePrivacySubScreens.includes(state.currentSubScreen));

  if (isPrivateScreen && (state.db.settings.privacyMode === 'auto' || state.db.settings.privacyMode === 'always on' || state.db.settings.privacyMode === 'on')) {
    overlay.classList.add('active');
  } else {
    overlay.classList.remove('active');
  }
}

function onScreenLoaded(screen, subScreen) {
  const menuSubScreens = ['callsMenuView', 'cameraMenuView', 'navMenuView', 'settingsMenuView'];

  // Only reset focusedIndex to 0 if entering a non-menu screen or switching to a new top-level module
  if (!menuSubScreens.includes(subScreen) && state.previousScreen !== screen) {
    state.focusedIndex = 0;
  }

  if (screen === 'welcomeScreen') {
    const isCompleted = state.db.tutorialCompleted || localStorage.getItem('blindEye_tutorialCompleted') === 'true';

    if (!isCompleted) {
      logSystem('First-time start detected. Swipe Right to begin tutorial.', 'system');
      Speech.speak('Welcome to BlindEye. Swipe right to start the interactive tutorial, or double tap to go to the Main Menu.');
    } else {
      Speech.speak('Welcome to BlindEye.');
      const subtext = document.getElementById('welcomeSubtext');
      if (subtext) subtext.innerText = 'Redirecting to Main Menu in 3 seconds...';

      welcomeTimer = setTimeout(() => {
        navigateTo('mainMenuScreen');
      }, 2000);
    }
  }
  else if (screen === 'tutorialScreen') {
    startTutorial();
  }
  else if (screen === 'mainMenuScreen') {
    renderMainMenu();
  }
  else if (screen === 'messagesScreen') {
    if (subScreen === 'msgThreadsView') renderMessagesList();
    else if (subScreen === 'msgDetailView') renderMessageDetail();
    else if (subScreen === 'msgReplyView') renderReplyScreen();
    else if (subScreen === 'msgQuickRepliesView') renderQuickReplies();
    else if (subScreen === 'msgSttView') startSpeechToTextInput();
    else if (subScreen === 'msgMorseInputView') initMorseInput();
  }
  else if (screen === 'callsScreen') {
    if (subScreen === 'callsMenuView') renderCallsMenu();
    else if (subScreen === 'contactsView') renderContacts();
    else if (subScreen === 'contactActionsView') renderContactActions();
    else if (subScreen === 'favoritesView') renderFavorites();
    else if (subScreen === 'recentsView') renderRecents();
    else if (subScreen === 'handwritingDialerView') {
      state.dialedNumber = '';
      const dialerLog = document.getElementById('dialerNumberLog');
      if (dialerLog) dialerLog.innerText = 'Draw number...';
      Handwriting.initCanvas('handwritingCanvas');
      Speech.speak('Dialer active. Draw digits on canvas. Double tap bottom to place call.');
    }
  }
  else if (screen === 'cameraScreen') {
    if (subScreen === 'cameraMenuView') renderCameraMenu();
    else if (subScreen === 'cameraActiveView') startCameraActiveViewport();
    else if (subScreen === 'cameraResultsView') renderCameraResults();
  }
  else if (screen === 'navigationScreen') {
    if (subScreen === 'navMenuView') {
      selectedSavedPlace = null;
      renderNavigationMenu();
    }
    else if (subScreen === 'navDestinationInputView') startNavigationSpeechSearch();
    else if (subScreen === 'navResultsView') renderNavigationResults();
    else if (subScreen === 'navActionsView') {
      if (selectedSavedPlace) renderSavedPlaceActions();
      else renderNavigationActions();
    }
    else if (subScreen === 'navActiveRoutingView') startNavigationRoutingSimulation();
  }
  else if (screen === 'settingsScreen') {
    if (subScreen === 'settingsMenuView') renderSettingsMenu();
    else if (subScreen === 'accessibilitySettingsView' || subScreen === 'accessibilityView') renderAccessibilitySettings();
    else if (subScreen === 'quickAccessSettingsView') renderQuickAccessSettings();
    else if (subScreen === 'quickActionTypeView') renderQuickActionTypes();
    else if (subScreen === 'emergencySettingsView') renderEmergencySettings();
  }
}

// ==========================================
// 8. SCREEN MODULES IMPLEMENTATION
// ==========================================

// --- Welcome & Tutorial / Calibration ---
const CALIBRATION_LETTERS = ['M', 'P', 'C', 'N', 'S'];
let calibrationState = {
  letterIdx: 0,
  count: 1,
  samples: [],
  failCount: 0  // consecutive tiny/failed strokes for current letter
};

function startTutorial() {
  calibrationState = {
    letterIdx: 0,
    count: 1,
    samples: [],
    failCount: 0
  };
  if (!state.db) state.db = {};
  state.db.letterProfiles = {};

  navigateTo('tutorialScreen');
  initTutorialCalibration();
}

/**
 * Skip handwriting calibration and go straight to voice-primary mode.
 * Called automatically after repeated tiny/invalid strokes, or by the
 * user explicitly (e.g. long press during calibration).
 */
function skipCalibrationToVoiceMode() {
  Speech.speak("Voice-primary mode activated. Handwriting calibration skipped. Opening Main Menu.");
  Haptic.trigger('success');
  state.db.tutorialCompleted = true;
  localStorage.setItem('blindEye_tutorialCompleted', 'true');
  // Clear any partial letter profiles so heuristic fallback is used
  state.db.letterProfiles = {};
  saveDb();
  setTimeout(() => {
    navigateTo('mainMenuScreen');
  }, 1800);
}

function initTutorialCalibration() {
  Handwriting.initCanvas('tutorialCanvas');
  updateTutorialCalibrationUI(true);
}

function updateTutorialCalibrationUI(announceSpeech = true) {
  const currentLetter = CALIBRATION_LETTERS[calibrationState.letterIdx];
  const count = calibrationState.count;

  const counterEl = document.getElementById('tutorialLetterCounter');
  const instructionEl = document.getElementById('tutorialInstructionText');

  if (counterEl) counterEl.innerText = `Draw letter ${currentLetter} [ ${count} / 3 ]`;
  if (instructionEl) instructionEl.innerText = `Swipe / Draw letter ${currentLetter} to teach the system your style`;

  if (announceSpeech) {
    Speech.speak(`Tutorial Calibration. Draw letter ${currentLetter}, ${count} of 3.`);
  }
}

function handleTutorialCalibrationStroke(pts) {
  const currentLetter = CALIBRATION_LETTERS[calibrationState.letterIdx];
  const count = calibrationState.count;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  pts.forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });

  const w = maxX - minX;
  const h = maxY - minY;

  // Reject micro taps
  if (w < 10 && h < 10) {
    Haptic.trigger('error');
    Speech.speak(`Stroke too small. Please draw letter ${currentLetter} clearly on the screen.`);
    return;
  }

  const ar = h / (w || 1);
  const normPts = pts.map(p => ({
    x: (p.x - minX) / (w || 1),
    y: (p.y - minY) / (h || 1)
  }));
  const resampled = resamplePoints(normPts, 20);

  calibrationState.samples.push({ ar, resampledPts: resampled });
  Haptic.trigger('success');

  if (count < 3) {
    Speech.speak(`${currentLetter}, ${count} of 3 recorded.`);
    calibrationState.count++;
    updateTutorialCalibrationUI(false);
  } else {
    // Save averaged profile after 3 samples
    const avgAr = calibrationState.samples.reduce((sum, s) => sum + s.ar, 0) / 3;
    const avgResampled = [];
    for (let i = 0; i < 20; i++) {
      const avgX = (calibrationState.samples[0].resampledPts[i].x + calibrationState.samples[1].resampledPts[i].x + calibrationState.samples[2].resampledPts[i].x) / 3;
      const avgY = (calibrationState.samples[0].resampledPts[i].y + calibrationState.samples[1].resampledPts[i].y + calibrationState.samples[2].resampledPts[i].y) / 3;
      avgResampled.push({ x: avgX, y: avgY });
    }

    if (!state.db.letterProfiles) state.db.letterProfiles = {};
    state.db.letterProfiles[currentLetter] = { ar: avgAr, resampledPts: avgResampled };
    saveDb();

    if (calibrationState.letterIdx < CALIBRATION_LETTERS.length - 1) {
      calibrationState.letterIdx++;
      calibrationState.count = 1;
      calibrationState.samples = [];
      const nextLetter = CALIBRATION_LETTERS[calibrationState.letterIdx];
      Speech.speak(`Letter ${currentLetter} learned successfully. Now draw letter ${nextLetter}.`);
      updateTutorialCalibrationUI(false);
    } else {
      state.db.tutorialCompleted = true;
      localStorage.setItem('blindEye_tutorialCompleted', 'true');
      saveDb();

      Speech.speak("All letters calibrated! Tutorial complete. Opening Main Menu.");
      setTimeout(() => {
        navigateTo('mainMenuScreen');
      }, 1500);
    }
  }
}

// --- Main Menu ---
const MAIN_MENU_ITEMS = [
  { id: 'msg', name: 'Messages', icon: 'fa-comment-sms', pattern: 'short' },
  { id: 'calls', name: 'Phone', icon: 'fa-phone', pattern: 'success' },
  { id: 'cam', name: 'Camera', icon: 'fa-camera', pattern: 'long' },
  { id: 'nav', name: 'Navigation', icon: 'fa-compass', pattern: 'long' },
  { id: 'set', name: 'Settings', icon: 'fa-sliders', pattern: 'long' }
];

function renderMainMenu() {
  Handwriting.initCanvas('handwritingMenuCanvas');
  Speech.speak("Main Menu. Draw M for Messages, P for Phone, C for Camera, N for Navigation, or S for Settings.");
}

/**
 * Announce that the user has hit the start or end of a list.
 * Plays a double haptic pulse (stronger than a normal navigation step)
 * and includes position in the speech so the user always knows where they are.
 *
 * @param {'first'|'last'} boundary
 * @param {string} itemLabel - Human-readable name of the current item
 * @param {number} total - Total number of items in the list
 */
function announceListBoundary(boundary, itemLabel, total) {
  Haptic.trigger('success'); // double pulse — distinguishable from error (triple)
  const pos = boundary === 'first' ? 1 : total;
  const word = boundary === 'first' ? 'First' : 'Last';
  Speech.speak(`${word} item. ${itemLabel}. ${pos} of ${total}.`);
}

function speakFocusedItem() {
  const item = state.focusedItems[state.focusedIndex];
  if (!item) return;

  Haptic.trigger(item.pattern || 'short');

  const idx = state.focusedIndex + 1;
  const total = state.focusedItems.length;
  const pos = total > 1 ? `, ${idx} of ${total}` : '';

  if (state.currentScreen === 'mainMenuScreen') {
    Speech.speak(`${item.name}${pos}`);
  } else if (state.currentScreen === 'messagesScreen') {
    if (state.currentSubScreen === 'msgThreadsView') {
      const status = item.unread ? 'Unread.' : 'Read.';
      Speech.speak(`${item.senderName}. ${status}${pos}`);
    } else {
      Speech.speak(`${item.name || item.text}${pos}`);
    }
  } else if (state.currentScreen === 'callsScreen') {
    if (state.currentSubScreen === 'contactsView') {
      Speech.speak(`${item.name}, ${formatPhoneNumberForSpeech(item.phone)}${pos}`);
    } else {
      Speech.speak(`${item.name || item.text}${pos}`);
    }
  } else {
    Speech.speak(`${item.name || item.text || 'Menu Option'}${pos}`);
  }
}



function handleMainMenuGesture(gesture) {
  if (gesture === 'swipeRight') {
    state.focusedIndex = (state.focusedIndex + 1) % state.focusedItems.length;
    renderMainMenu();
  } else if (gesture === 'swipeLeft') {
    state.focusedIndex = (state.focusedIndex - 1 + state.focusedItems.length) % state.focusedItems.length;
    renderMainMenu();
  } else if (gesture === 'doubleTap') {
    const selected = state.focusedItems[state.focusedIndex];
    Haptic.trigger('success');

    if (selected.id === 'msg') navigateTo('messagesScreen', 'msgThreadsView');
    if (selected.id === 'calls') navigateTo('callsScreen', 'callsMenuView');
    if (selected.id === 'cam') navigateTo('cameraScreen', 'cameraMenuView');
    if (selected.id === 'nav') navigateTo('navigationScreen', 'navMenuView');
    if (selected.id === 'set') navigateTo('settingsScreen', 'settingsMenuView');
  }
}

// --- Messages ---
function renderMessagesList() {
  const container = document.getElementById('msgListContainer');
  if (!container) return;

  // Force container to fill available vertical space and center content
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.justifyContent = 'center';
  container.style.alignItems = 'center';
  container.style.height = 'calc(100% - 120px)';
  container.style.width = '100%';
  container.style.boxSizing = 'border-box';
  container.style.margin = 'auto 0';
  container.innerHTML = '';

  const messages = (state.db && state.db.messages) ? state.db.messages : [];
  state.focusedItems = messages;
  const total = messages.length;

  if (total === 0) {
    container.innerHTML = `
      <div class="hero-card" style="width: calc(100% - 32px); max-height: 260px; border: 3px solid #FFCC00; border-radius: 20px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 24px 18px; background: #000000; margin: auto;">
        <div class="card-header" style="width: 100%; display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #FFCC00; font-weight: bold; font-size: 0.9rem;">[ MESSAGES ]</span>
          <span style="color: #FFFFFF; font-weight: bold; font-size: 1rem;">[ 0 / 0 ]</span>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; gap: 10px; margin: auto 0; text-align: center;">
          <h2 style="color: #FFCC00; font-size: 1.5rem; margin: 0; font-weight: 800;">NO MESSAGES</h2>
        </div>
      </div>
    `;
    Speech.speak("No messages in inbox.");
    return;
  }

  if (state.focusedIndex >= total) state.focusedIndex = 0;
  const current = messages[state.focusedIndex];

  container.innerHTML = `
    <div class="hero-card" style="width: calc(100% - 32px); height: auto; border: 3px solid #FFCC00; border-radius: 20px; box-sizing: border-box; display: flex; flex-direction: column; gap: 18px; padding: 22px 18px; background: #000000; margin: 0 auto; overflow: hidden;">
      
      <!-- Header: Sender Info & Item Counter -->
      <div class="card-header" style="width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
          <i class="fa-solid fa-circle-user" style="color: #FFCC00; font-size: 1.8rem; flex-shrink: 0;"></i>
          <span style="color: #FFCC00; font-weight: 800; font-size: 1.5rem; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${current.senderName}
          </span>
        </div>
        <span style="color: #FFFFFF; font-weight: bold; font-size: 1.1rem; white-space: nowrap; flex-shrink: 0;">
          [ ${state.focusedIndex + 1} / ${total} ]
        </span>
      </div>

      <!-- Timestamp & Status Badge Row -->
      <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; background: rgba(255, 204, 0, 0.05); border: 1px solid #333; border-radius: 12px; padding: 12px 14px; box-sizing: border-box;">
        <span style="color: #FFFFFF; font-size: 0.95rem; font-weight: 700; font-family: monospace;">
          <i class="fa-regular fa-clock" style="color: #FFCC00; margin-right: 6px;"></i>${current.time || current.timestamp || '??:??'}
        </span>
        <span style="font-size: 0.8rem; font-weight: 800; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; ${current.unread ? 'background: #FFCC00; color: #000000;' : 'background: #222222; color: #888888; border: 1px solid #444;'}">
          ${current.unread ? 'UNREAD' : 'READ'}
        </span>
      </div>

    </div>

    <!-- Carousel Indicators -->
    <div class="carousel-dots" style="display: flex; gap: 8px; margin-top: 16px; flex-shrink: 0;">
      ${messages.map((_, idx) => `
        <span style="width: ${idx === state.focusedIndex ? '24px' : '8px'}; height: 8px; background: ${idx === state.focusedIndex ? '#FFCC00' : '#666666'}; border-radius: ${idx === state.focusedIndex ? '4px' : '50%'};"></span>
      `).join('')}
    </div>
  `;

  const status = current.unread ? 'Unread.' : 'Read.';
  Speech.speak(`Message ${state.focusedIndex + 1} of ${total}. From ${current.senderName}. ${status}`);
}

function getActiveMessage() {
  // Bug fix #4: selectedMsgIndex persists across navigations and can point to a stale
  // message. Only use it when we are actually inside the messages screen; otherwise fall
  // back to focusedIndex which is always reset correctly when entering a new screen.
  const onMessagesScreen = state.currentScreen === 'messagesScreen';
  const idx = (onMessagesScreen && state.selectedMsgIndex !== undefined)
    ? state.selectedMsgIndex
    : (state.focusedIndex || 0);
  return state.db.messages[idx] || state.db.messages[0] || { senderName: 'Mother', text: 'Hi, where are you? When are you coming home?' };
}

let activeSpeechRecognition = null;
let inlineTouchStartTime = 0;
let inlineMorseBuffer = '';
let inlineMorseText = '';
let inlineMorseTimer = null;
let inlineVoiceTranscript = '';

function renderMessageDetail() {
  const msg = getActiveMessage();
  if (msg && msg.unread) {
    msg.unread = false;
    saveDb();
  }

  const senderName = msg ? msg.senderName : 'Contact';
  const textContent = msg ? msg.text : '';

  // Reset inline input buffers
  inlineMorseBuffer = '';
  inlineMorseText = '';
  inlineVoiceTranscript = '';

  const container = document.getElementById('msgDetailContainer');
  if (container) {
    // Pure blackout UI — completely black background with no visible text cards for maximum privacy
    container.innerHTML = `
      <div class="privacy-blackout-card" style="width: 100%; height: 100%; background: #000000; display: flex; align-items: center; justify-content: center;">
        <span class="sr-only">Privacy Screen Active. Screen is black.</span>
      </div>
    `;
  }

  // Determine instruction based on settings
  const readingMode = (state.db && state.db.settings && state.db.settings.readingMode) || 'combined';
  let modeInstruction = "Speak or tap Morse code to reply.";
  if (readingMode === 'morse') {
    modeInstruction = "Tap Morse code on the screen to reply.";
  } else if (readingMode === 'voice' || readingMode === 'tts only') {
    modeInstruction = "Speak your reply after the tone.";
  }

  // Speak message content via TTS
  Speech.speak(`Message from ${senderName}: ${textContent}. ${modeInstruction} Swipe right to send, or long press to go back.`);

  // Activate input listeners based on active settings
  initInlineMorseListeners();
  if (readingMode !== 'morse') {
    startInlineVoiceListening();
  }
}

function startInlineVoiceListening() {
  if (activeSpeechRecognition) {
    try { activeSpeechRecognition.stop(); } catch (e) { }
    activeSpeechRecognition = null;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  try {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    // Bug fix #6: Use Macedonian locale to match the app's TTS language.
    // Falls back gracefully to English on browsers without mk-MK support.
    recognition.lang = 'mk-MK';

    recognition.onspeechstart = () => {
      if (state.currentSubScreen === 'msgDetailView') {
        Haptic.trigger('short');
        const badgeEl = document.getElementById('msgDetailStatusBadge');
        if (badgeEl) {
          badgeEl.innerText = 'LISTENING';
          badgeEl.style.display = 'inline-block';
          badgeEl.style.backgroundColor = '#00E5FF';
        }
      }
    };

    recognition.onresult = (event) => {
      if (state.currentSubScreen !== 'msgDetailView') return;
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      inlineVoiceTranscript = transcript;
      const footerEl = document.getElementById('msgDetailFooterHint');
      if (footerEl && transcript) {
        footerEl.innerText = `Voice: "${transcript}"`;
      }
    };

    recognition.onerror = (e) => {
      logSystem(`Inline voice STT error: ${e.error || 'unknown'}`, 'error');
      if (e.error === 'not-allowed' || e.error === 'audio-capture') {
        Haptic.trigger('error');
        Speech.speak('Microphone access denied. Please allow microphone permission and try again.');
      }
    };
    recognition.start();
    activeSpeechRecognition = recognition;
  } catch (e) { }
}

function initInlineMorseListeners() {
  const detailScreen = document.getElementById('msgDetailView');
  if (!detailScreen) return;

  // Morse tap timing thresholds (ms)
  // < 250ms  → dot (.)
  // 250–599ms → dash (-)
  // ≥ 600ms   → back navigation (handled by GestureManager, not here)
  const DOT_THRESHOLD = MORSE_INPUT.DOT_THRESHOLD;
  const BACK_THRESHOLD = MORSE_INPUT.DASH_THRESHOLD;

  function onMorseTouchStart(e) {
    if (state.currentSubScreen !== 'msgDetailView') return;
    e.stopPropagation();
    inlineTouchStartTime = Date.now();
  }

  function onMorseTouchEnd(e) {
    if (state.currentSubScreen !== 'msgDetailView') return;
    e.stopPropagation();
    const duration = Date.now() - inlineTouchStartTime;

    // ≥ 600ms is reserved for the universal back gesture — ignore here
    if (duration >= BACK_THRESHOLD) return;

    if (activeSpeechRecognition) {
      try { activeSpeechRecognition.stop(); } catch (err) { }
      activeSpeechRecognition = null;
    }

    const symbol = duration < DOT_THRESHOLD ? '.' : '-';
    inlineMorseBuffer += symbol;

    const badgeEl = document.getElementById('msgDetailStatusBadge');
    if (badgeEl) {
      badgeEl.innerText = 'MORSE';
      badgeEl.style.display = 'inline-block';
      badgeEl.style.backgroundColor = '#10B981';
    }

    Haptic.trigger(symbol === '.' ? 'short' : 'long');

    if (inlineMorseTimer) clearTimeout(inlineMorseTimer);
    inlineMorseTimer = setTimeout(decodeInlineMorseLetter, 800);
  }

  // Mouse events (desktop simulator)
  detailScreen.onmousedown = onMorseTouchStart;
  detailScreen.onmouseup = onMorseTouchEnd;

  // Touch events (real mobile device — CRITICAL for production use)
  detailScreen.ontouchstart = onMorseTouchStart;
  detailScreen.ontouchend = onMorseTouchEnd;
}


function decodeInlineMorseLetter() {
  const char = DECODE_MORSE_MAP[inlineMorseBuffer];
  const footerEl = document.getElementById('msgDetailFooterHint');

  if (char) {
    inlineMorseText += char;
    if (footerEl) footerEl.innerText = `Morse: "${inlineMorseText}"`;
    Speech.speak(char);
    logSystem(`Morse converted: "${inlineMorseBuffer}" -> "${char}"`, 'system');
  } else if (inlineMorseBuffer.length > 0) {
    Haptic.trigger('error');
    Speech.speak('Unknown symbol');
  }
  inlineMorseBuffer = '';
}

function sendSMSMessageInline(text, customTTS) {
  if (activeSpeechRecognition) {
    try { activeSpeechRecognition.stop(); } catch (e) { }
    activeSpeechRecognition = null;
  }

  const activeMsg = getActiveMessage();
  const senderName = activeMsg ? activeMsg.senderName : 'Contact';
  const ttsMessage = customTTS || `Message sent successfully to ${senderName}`;

  Haptic.trigger('success');
  setTimeout(() => Haptic.trigger('success'), 150);
  Speech.speak(ttsMessage);
  logSystem(`SMS sent to ${senderName}: "${text}"`, 'sms');

  setTimeout(() => {
    navigateTo('messagesScreen', 'msgThreadsView');
  }, 1400);
}

function updateMessageDetailActionsUI(isEntrance = false) {
  // Inline Privacy Mode - no button carousel updates
}

function renderReplyScreen() {
  const msg = getActiveMessage();
  const senderEl = document.getElementById('msgReplySender');
  if (senderEl) senderEl.innerText = msg.senderName;

  state.focusedItems = [
    { id: 'stt', name: 'Voice Input (STT)', icon: 'fa-microphone' },
    { id: 'morse', name: 'Morse Keyboard', icon: 'fa-fingerprint' },
    { id: 'quick', name: 'Quick Answers', icon: 'fa-reply-all' }
  ];
  state.focusedIndex = 0;
  updateReplyScreenUI(true);
}

function updateReplyScreenUI(isEntrance = false) {
  const itemIds = ['replyModeSTT', 'replyModeMorse', 'replyModeQuick'];
  itemIds.forEach((id, index) => {
    const el = document.getElementById(id);
    if (el) {
      if (index === state.focusedIndex) el.classList.add('focused');
      else el.classList.remove('focused');
    }
  });

  const msg = getActiveMessage();
  if (isEntrance) {
    Speech.speak(`Reply to ${msg.senderName}. Voice Input, Morse Keyboard, or Quick Answers. Swipe right to cycle.`);
  } else {
    Speech.speak(state.focusedItems[state.focusedIndex].name);
  }
}

let sttVoiceTranscript = '';

function startSpeechToTextInput() {
  Haptic.trigger('short');
  Speech.speak("Speak your reply after the beep.");

  sttVoiceTranscript = '';
  const statusText = document.getElementById('sttStatusText');
  const resultBox = document.getElementById('sttResultText');
  const micRing = document.getElementById('sttMicRing');

  if (micRing) micRing.classList.add('listening');
  if (statusText) statusText.innerText = 'Listening for voice input...';
  if (resultBox) resultBox.innerText = 'Listening...';

  if (activeSpeechRecognition) {
    try { activeSpeechRecognition.stop(); } catch (e) { }
    activeSpeechRecognition = null;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    if (resultBox) resultBox.innerText = '"Ќе стигнам за 10 минути" (Simulated)';
    sttVoiceTranscript = 'Ќе стигнам за 10 минути';
    return;
  }

  try {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    // Bug fix #6 (reply screen): Use Macedonian locale to match app TTS language.
    recognition.lang = 'mk-MK';

    recognition.onspeechstart = () => {
      Haptic.trigger('short');
    };

    recognition.onresult = (event) => {
      if (state.currentSubScreen !== 'msgSttView') return;
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      sttVoiceTranscript = transcript;
      if (resultBox && transcript) {
        resultBox.innerText = `"${transcript}"`;
      }
    };

    recognition.onend = () => {
      if (micRing) micRing.classList.remove('listening');
      if (statusText) statusText.innerText = 'Tap or double tap to send, long press to cancel.';
      if (sttVoiceTranscript) {
        Speech.speak(`Recorded: ${sttVoiceTranscript}. Tap or double tap to send.`);
      } else {
        Speech.speak("No speech detected. Please try again.");
      }
    };

    recognition.onerror = (e) => {
      if (micRing) micRing.classList.remove('listening');
      if (statusText) statusText.innerText = 'Speech error. Try again.';
      Haptic.trigger('error');
      logSystem(`STT error: ${e.error || 'unknown'}`, 'error');
      if (e.error === 'not-allowed' || e.error === 'audio-capture') {
        Speech.speak('Microphone access denied. Please allow microphone permission.');
      } else {
        Speech.speak('Voice input error. Please try again.');
      }
    };

    recognition.start();
    activeSpeechRecognition = recognition;
  } catch (e) {
    if (resultBox) resultBox.innerText = '"Ќе стигнам за 10 минути" (Simulated)';
    sttVoiceTranscript = 'Ќе стигнам за 10 минути';
  }
}

function handleMessagesGesture(gesture) {
  if (state.currentSubScreen === 'msgThreadsView') {
    if (gesture === 'swipeRight') {
      if (state.focusedIndex < state.focusedItems.length - 1) {
        state.focusedIndex++;
        renderMessagesList();
      } else {
        const item = state.focusedItems[state.focusedIndex];
        announceListBoundary('last', item ? item.senderName : 'Message', state.focusedItems.length);
      }
    } else if (gesture === 'swipeLeft') {
      if (state.focusedIndex > 0) {
        state.focusedIndex--;
        renderMessagesList();
      } else {
        const item = state.focusedItems[state.focusedIndex];
        announceListBoundary('first', item ? item.senderName : 'Message', state.focusedItems.length);
      }
    } else if (gesture === 'doubleTap') {
      state.selectedMsgIndex = state.focusedIndex;
      navigateTo('messagesScreen', 'msgDetailView');
    } else if (gesture === 'longPress') {
      Haptic.trigger('long');
      Speech.speak('Returned to Main Menu');
      navigateTo('mainMenuScreen');
    }
  }
  else if (state.currentSubScreen === 'msgDetailView') {
    if (gesture === 'swipeRight' || gesture === 'doubleTap') {
      const activeMsg = getActiveMessage();
      const senderName = activeMsg ? activeMsg.senderName : 'Contact';
      const textToSend = inlineMorseText || inlineVoiceTranscript || 'Ќе стигнам за 10 минути';
      sendSMSMessageInline(textToSend, `Message sent successfully to ${senderName}`);
    } else if (gesture === 'longPress') {
      if (activeSpeechRecognition) {
        try { activeSpeechRecognition.stop(); } catch (e) { }
        activeSpeechRecognition = null;
      }
      Haptic.trigger('long');
      Speech.speak("Returned to Messages Inbox");
      navigateTo('messagesScreen', 'msgThreadsView');
    }
  }
  else if (state.currentSubScreen === 'msgReplyView') {
    if (gesture === 'swipeRight') {
      state.focusedIndex = (state.focusedIndex + 1) % state.focusedItems.length;
      updateReplyScreenUI(false);
    } else if (gesture === 'swipeLeft') {
      state.focusedIndex = (state.focusedIndex - 1 + state.focusedItems.length) % state.focusedItems.length;
      updateReplyScreenUI(false);
    } else if (gesture === 'doubleTap') {
      const selected = state.focusedItems[state.focusedIndex];
      if (selected.id === 'stt') {
        navigateTo('messagesScreen', 'msgSttView');
      } else if (selected.id === 'morse') {
        navigateTo('messagesScreen', 'msgMorseInputView');
      } else if (selected.id === 'quick') {
        navigateTo('messagesScreen', 'msgQuickRepliesView');
      }
    } else if (gesture === 'longPress') {
      Haptic.trigger('long');
      Speech.speak('Returned to Message Detail');
      navigateTo('messagesScreen', 'msgDetailView');
    }
  }
  else if (state.currentSubScreen === 'msgSttView') {
    if (gesture === 'doubleTap' || gesture === 'tap') {
      const textToSend = sttVoiceTranscript || 'Ќе стигнам за 10 минути';
      sendSMSMessage(textToSend, `Message sent: ${textToSend}`);
    } else if (gesture === 'longPress') {
      if (activeSpeechRecognition) {
        try { activeSpeechRecognition.stop(); } catch (e) { }
        activeSpeechRecognition = null;
      }
      Haptic.trigger('long');
      Speech.speak('Returned to Reply Options');
      navigateTo('messagesScreen', 'msgReplyView');
    }
  }
  else if (state.currentSubScreen === 'msgMorseInputView') {
    if (gesture === 'doubleTap' || gesture === 'swipeUp') {
      const textToSend = morseOutputText || 'OK';
      sendSMSMessage(textToSend, 'Morse reply sent');
    } else if (gesture === 'longPress') {
      Haptic.trigger('long');
      Speech.speak('Returned to Reply Options');
      navigateTo('messagesScreen', 'msgReplyView');
    }
  }
  else if (state.currentSubScreen === 'msgQuickRepliesView') {
    if (gesture === 'swipeRight') {
      state.focusedIndex = (state.focusedIndex + 1) % state.focusedItems.length;
      renderQuickReplies();
    } else if (gesture === 'swipeLeft') {
      state.focusedIndex = (state.focusedIndex - 1 + state.focusedItems.length) % state.focusedItems.length;
      renderQuickReplies();
    } else if (gesture === 'doubleTap') {
      const selected = state.focusedItems[state.focusedIndex];
      sendSMSMessage(selected.text, 'Message sent');
    } else if (gesture === 'longPress') {
      Haptic.trigger('long');
      Speech.speak('Returned to Reply Options');
      navigateTo('messagesScreen', 'msgReplyView');
    }
  }
}

function renderQuickReplies() {
  const container = document.getElementById('quickRepliesContainer');
  if (!container) return;
  container.innerHTML = '';

  const replies = [{ text: 'Да' }, { text: 'Не' }, { text: 'Во ред' }, { text: 'Ќе ти се јавам' }];
  state.focusedItems = replies;

  state.focusedItems.forEach((reply, index) => {
    const card = document.createElement('div');
    card.className = `menu-item-card ${index === state.focusedIndex ? 'focused' : ''}`;
    card.innerHTML = `<span>${reply.text}</span>`;
    container.appendChild(card);
  });
  Speech.speak(replies[state.focusedIndex].text);
}

function sendSMSMessage(text, customTTS = 'Message sent') {
  const activeMsg = getActiveMessage();
  Haptic.trigger('success');
  Speech.speak(customTTS);
  logSystem(`SMS sent to ${activeMsg ? activeMsg.senderName : 'Contact'}: "${text}"`, 'sms');

  setTimeout(() => {
    Speech.speak("Returned to Messages Inbox");
    navigateTo('messagesScreen', 'msgThreadsView');
  }, 1600);
}

let morseTimer = null;
let morseCodeBuffer = '';
let morseOutputText = '';

function initMorseInput() {
  morseCodeBuffer = '';
  morseOutputText = '';
  const symbolsLog = document.getElementById('morseSymbolsLog');
  const textResult = document.getElementById('morseTextResult');
  if (symbolsLog) symbolsLog.innerText = '';
  if (textResult) textResult.innerText = 'Tap dot / hold dash...';

  const pad = document.getElementById('morsePad');
  if (!pad) return;

  let touchStartTime = 0;

  const onPadStart = (e) => { e.stopPropagation(); touchStartTime = Date.now(); };
  const onPadEnd = (e) => {
    e.stopPropagation();
    const duration = Date.now() - touchStartTime;
    const symbol = duration < MORSE_INPUT.DOT_THRESHOLD ? '.' : '-';

    morseCodeBuffer += symbol;
    if (symbolsLog) symbolsLog.innerText = morseCodeBuffer;
    Haptic.trigger(symbol === '.' ? 'short' : 'long');

    if (morseTimer) clearTimeout(morseTimer);
    morseTimer = setTimeout(decodeMorseLetter, 800);
  };

  // Desktop (mouse) events
  pad.onmousedown = onPadStart;
  pad.onmouseup = onPadEnd;

  // Mobile (touch) events — required for real device use
  pad.ontouchstart = (e) => { e.preventDefault(); onPadStart(e); };
  pad.ontouchend = (e) => { e.preventDefault(); onPadEnd(e); };

  Speech.speak('Morse keyboard active. Tap for dot, hold for dash. Swipe up or double tap to send reply.');
}

function decodeMorseLetter() {
  const char = DECODE_MORSE_MAP[morseCodeBuffer];
  const display = document.getElementById('morseTextResult');

  if (char && display) {
    morseOutputText += char;
    display.innerText = morseOutputText;
    Speech.speak(char);
    logSystem(`Morse converted: "${morseCodeBuffer}" -> "${char}"`, 'system');
  } else if (morseCodeBuffer.length > 0) {
    Haptic.trigger('error');
    Speech.speak('Unknown symbol');
  }
  morseCodeBuffer = '';
  const symbolsLog = document.getElementById('morseSymbolsLog');
  if (symbolsLog) symbolsLog.innerText = '';
}

// --- Calls Module ---
function renderCallsMenu() {
  const items = [
    { id: 'contacts', name: 'CONTACTS', icon: 'fa-address-book' },
    { id: 'favs', name: 'FAVORITES', icon: 'fa-star' },
    { id: 'recents', name: 'RECENT CALLS', icon: 'fa-clock-rotate-left' },
    { id: 'dialer', name: 'HANDWRITING DIALER', icon: 'fa-pen-nib' }
  ];
  state.focusedItems = items;
  const total = items.length;
  const current = items[state.focusedIndex];

  const container = document.getElementById('callsMenuContainer');
  if (container) {
    // Standardize parent container styling
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.flex = '1';
    container.style.width = '100%';
    container.style.boxSizing = 'border-box';

    container.innerHTML = `
      <div class="hero-card" style="width: calc(100% - 32px); flex: 1; max-height: calc(100% - 24px); border: 3px solid #FFCC00; border-radius: 20px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 22px 18px; background: #000000; margin: 0 auto; overflow: hidden;">
        <div class="card-header" style="width: 100%; display: flex; justify-content: flex-start; align-items: center; flex-shrink: 0;">
          <span style="color: #FFFFFF; font-weight: bold; font-size: 1rem;">[ ${state.focusedIndex + 1} / ${total} ]</span>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; gap: 16px; margin: auto 0; text-align: center; width: 100%;">
          <div class="hero-icon-circle" style="width: 90px; height: 90px; min-width: 90px; min-height: 90px; border-radius: 50%; border: 3px solid #FFCC00; display: flex; align-items: center; justify-content: center; background: rgba(255, 204, 0, 0.05);">
            <i class="fa-solid ${current.icon}" style="font-size: 2.6rem; color: #FFCC00;"></i>
          </div>
          <h2 style="color: #FFCC00; font-size: 2.2rem; margin: 0; font-weight: 800; text-transform: uppercase; text-align: center; line-height: 1.1;">${current.name}</h2>
        </div>
        <div style="border-top: 1px dashed #444; width: 100%; padding-top: 10px; text-align: center; flex-shrink: 0;">
          <span style="color: #FFCC00; font-size: 0.8rem; font-weight: bold;">[ Double Tap: Select • Swipe: Next ]</span>
        </div>
      </div>
      <div class="carousel-dots" style="display: flex; gap: 8px; margin-top: 8px; flex-shrink: 0;">
        ${items.map((_, idx) => `
          <span style="width: ${idx === state.focusedIndex ? '24px' : '8px'}; height: 8px; background: ${idx === state.focusedIndex ? '#FFCC00' : '#666666'}; border-radius: ${idx === state.focusedIndex ? '4px' : '50%'};"></span>
        `).join('')}
      </div>
    `;
  }
  Speech.speak(items[state.focusedIndex].name);
}

function renderContacts() {
  const container = document.getElementById('contactsContainer');
  if (!container) return;
  container.innerHTML = '';

  state.focusedItems = state.db.contacts;

  if (state.focusedItems.length === 0) {
    container.innerHTML = `<div class="menu-item-card focused"><span>No contacts found</span></div>`;
    speakFocusedItem();
    return;
  }

  const prevIndex = (state.focusedIndex - 1 + state.focusedItems.length) % state.focusedItems.length;
  const nextIndex = (state.focusedIndex + 1) % state.focusedItems.length;
  const totalContacts = state.focusedItems.length;

  state.focusedItems.forEach((c, index) => {
    const card = document.createElement('div');
    let extraClass = '';
    if (index === state.focusedIndex) extraClass = 'focused';
    else if (index === prevIndex) extraClass = 'prev';
    else if (index === nextIndex) extraClass = 'next';

    card.className = `single-focus-card contact-card ${extraClass}`;
    card.id = `contactCard_${c.id}`;

    const initials = c.name ? c.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'C';

    card.innerHTML = `
      <div class="card-header-line" style="display: flex; justify-content: flex-start; width: 100%;">
        <span class="card-counter-badge">[ ${index + 1} / ${totalContacts} ]</span>
      </div>
      <div class="contact-upper-middle" style="display: flex; flex-direction: column; align-items: center; gap: 16px; margin-top: 20px;">
        <div class="contact-avatar"><span>${initials}</span></div>
        <span class="contact-name">${c.name}</span>
        <span class="contact-phone-number">${c.phone}</span>
      </div>
      <div class="contact-badges-row">
        ${c.emergency ? `
          <span class="badge-circle emergency-badge" style="border: 2px solid #FF3333; display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%;">
            <i class="fa-solid fa-triangle-exclamation" style="color: #FF3333; font-size: 1rem;"></i>
          </span>
        ` : ''}
        ${c.favorite ? `
          <span class="badge-circle favorite-badge" style="border: 2px solid #FFCC00; display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%;">
            <i class="fa-solid fa-star" style="color: #FFCC00; font-size: 1rem;"></i>
          </span>
        ` : ''}
      </div>
      <div class="footer-hint-text">
        [ Two-Finger Swipe Down: Quick Access • Long Press: Back ]
      </div>
    `;
    container.appendChild(card);
  });

  const dotsContainer = document.createElement('div');
  dotsContainer.className = 'menu-carousel-dots pagination-dots';
  state.focusedItems.forEach((_, index) => {
    const dot = document.createElement('span');
    dot.className = `carousel-dot ${index === state.focusedIndex ? 'active' : ''}`;
    dotsContainer.appendChild(dot);
  });
  container.appendChild(dotsContainer);

  speakFocusedItem();
}

let activeContactForActions = null;

function renderContactActions() {
  const container = document.getElementById('contactActionsContainer');
  if (!container) return;
  container.innerHTML = '';

  const contact = state.selectedContact || { name: 'Contact', phone: '+389 70 000 000', favorite: false, emergency: false };

  const nameEl = document.getElementById('actionContactName');
  if (nameEl) nameEl.innerText = contact.name;

  const actions = [
    {
      id: 'call',
      name: 'CALL CONTACT',
      icon: 'fa-phone',
      subtitle: contact.phone,
      style: '',
      iconStyle: 'color: #FFCC00;'
    },
    {
      id: 'fav',
      name: contact.favorite ? 'REMOVE FROM FAVORITES' : 'ADD TO FAVORITES',
      icon: 'fa-star',
      subtitle: contact.phone,
      style: '',
      iconStyle: contact.favorite ? 'color: #FFCC00;' : 'color: #888888;'
    },
    {
      id: 'emerg',
      name: contact.emergency ? 'REMOVE EMERGENCY CONTACT' : 'ADD EMERGENCY CONTACT',
      icon: 'fa-triangle-exclamation',
      subtitle: contact.phone,
      style: '',
      iconStyle: contact.emergency ? 'color: #FF3333; border-color: #FF3333;' : 'color: #888888;'
    },
    {
      id: 'del',
      name: 'DELETE CONTACT',
      icon: 'fa-trash-can',
      subtitle: contact.phone,
      style: 'border-color: #FF3333 !important; color: #FF3333 !important;',
      iconStyle: 'color: #FF3333;'
    }
  ];

  state.focusedItems = actions;

  const prevIndex = (state.focusedIndex - 1 + actions.length) % actions.length;
  const nextIndex = (state.focusedIndex + 1) % actions.length;

  actions.forEach((act, index) => {
    const card = document.createElement('div');
    let extraClass = '';
    if (index === state.focusedIndex) extraClass = 'focused';
    else if (index === prevIndex) extraClass = 'prev';
    else if (index === nextIndex) extraClass = 'next';

    card.className = `single-focus-card contact-action-card ${extraClass}`;
    if (act.id === 'del') card.className += ' destructive';
    card.id = `contactActionCard_${index}`;
    if (act.style) card.setAttribute('style', act.style);

    card.innerHTML = `
      <div class="card-header-line">
        <span class="card-category-tag" style="color: ${act.id === 'del' ? '#FF3333' : '#FFCC00'}">[ ACTION ]</span>
        <span class="card-counter-badge">[ ${index + 1} / ${actions.length} ]</span>
      </div>
      
      <div class="hero-icon-circle" style="border: 2px solid ${act.id === 'del' ? '#FF3333' : (act.id === 'emerg' && contact.emergency ? '#FF3333' : '#FFCC00')}; display: inline-flex; align-items: center; justify-content: center; width: 80px; height: 80px; border-radius: 50%; margin: 20px auto 10px auto;">
        <i class="fa-solid ${act.icon}" style="${act.iconStyle} font-size: 2.2rem;"></i>
      </div>

      <div class="contact-upper-middle" style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
        <span class="contact-name" style="color: ${act.id === 'del' ? '#FF3333' : '#FFCC00'}; text-align: center; font-size: 1.4rem; font-weight: 800;">${act.name}</span>
        <span class="contact-phone-number" style="color: #FFFFFF; font-size: 1rem;">${act.subtitle}</span>
      </div>

      <div class="footer-hint-text" style="color: ${act.id === 'del' ? '#FF3333' : '#FFCC00'}">
        [ Two-Finger Swipe Down: Quick Access • Long Press: Back ]
      </div>
    `;
    container.appendChild(card);
  });

  const dotsContainer = document.createElement('div');
  dotsContainer.className = 'menu-carousel-dots pagination-dots';
  actions.forEach((_, index) => {
    const dot = document.createElement('span');
    dot.className = `carousel-dot ${index === state.focusedIndex ? 'active' : ''}`;
    dotsContainer.appendChild(dot);
  });
  container.appendChild(dotsContainer);

  const currentAction = actions[state.focusedIndex];
  if (currentAction) {
    Speech.speak(currentAction.name);
  }
}

function renderFavorites() {
  const container = document.getElementById('favoritesContainer');
  if (!container) return;
  container.innerHTML = '';

  const allContacts = (state.db && state.db.contacts) ? state.db.contacts : [];
  const favoriteContacts = allContacts.filter(c => c.favorite);
  state.focusedItems = favoriteContacts;

  const total = favoriteContacts.length;

  if (total === 0) {
    container.innerHTML = `
      <div class="hero-card" style="width: calc(100% - 32px); flex: 1; max-height: calc(100% - 24px); border: 3px solid #FFCC00; border-radius: 20px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 22px 18px; background: #000000; margin: 0 auto; overflow: hidden;">
        <div class="card-header" style="width: 100%; display: flex; justify-content: flex-start; align-items: center; gap: 12px; flex-shrink: 0;">
          <span style="color: #FFFFFF; font-weight: bold; font-size: 1rem;">[ 0 / 0 ]</span>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; gap: 14px; margin: auto 0; text-align: center; width: 100%;">
          <div class="hero-icon-circle" style="width: 80px; height: 80px; min-width: 80px; min-height: 80px; border-radius: 50%; border: 3px solid #FFCC00; display: flex; align-items: center; justify-content: center; background: rgba(255, 204, 0, 0.05);">
            <i class="fa-solid fa-star-half-stroke" style="font-size: 2.2rem; color: #FFCC00;"></i>
          </div>
          <h2 style="color: #FFCC00; font-size: 1.7rem; margin: 0; font-weight: 800; text-transform: uppercase;">NO FAVORITES</h2>
          <p style="color: #FFFFFF; font-size: 0.95rem; text-align: center; margin: 0; opacity: 0.9;">Star contacts in the Contacts menu to add them here.</p>
        </div>
        <div style="border-top: 1px dashed #444; width: 100%; padding-top: 10px; text-align: center; flex-shrink: 0;">
          <span style="color: #FFCC00; font-size: 0.8rem; font-weight: bold;">[ Long Press: Back to Phone Menu ]</span>
        </div>
      </div>
    `;
    Speech.speak("No favorite contacts.");
    return;
  }

  if (state.focusedIndex >= total) state.focusedIndex = 0;
  const current = favoriteContacts[state.focusedIndex];

  container.innerHTML = `
    <div class="hero-card" style="width: calc(100% - 32px); flex: 1; max-height: calc(100% - 24px); border: 3px solid #FFCC00; border-radius: 20px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 22px 18px; background: #000000; margin: 0 auto; overflow: hidden;">
      
      <!-- Card Header -->
      <div class="card-header" style="width: 100%; display: flex; justify-content: flex-start; align-items: center; gap: 12px; flex-shrink: 0;">
        <span style="color: #FFFFFF; font-weight: bold; font-size: 1rem;">[ ${state.focusedIndex + 1} / ${total} ]</span>
      </div>

      <!-- Contact Details -->
      <div style="display: flex; flex-direction: column; align-items: center; gap: 14px; margin: auto 0; text-align: center; width: 100%;">
        <div class="hero-icon-circle" style="width: 80px; height: 80px; min-width: 80px; min-height: 80px; border-radius: 50%; border: 3px solid #FFCC00; display: flex; align-items: center; justify-content: center; background: rgba(255, 204, 0, 0.05);">
          <i class="fa-solid fa-star" style="font-size: 2.2rem; color: #FFCC00;"></i>
        </div>
        <h2 style="color: #FFCC00; font-size: 2rem; margin: 0; font-weight: 800; text-transform: uppercase; text-align: center; line-height: 1.1;">${current.name}</h2>
        <p style="color: #FFFFFF; font-size: 1.1rem; text-align: center; margin: 0; font-family: monospace; font-weight: 700;">${current.phone}</p>
      </div>

      <!-- Action Hint -->
      <div style="border-top: 1px dashed #444; width: 100%; padding-top: 10px; text-align: center; flex-shrink: 0;">
        <span style="color: #FFCC00; font-size: 0.8rem; font-weight: bold;">[ Double Tap: Call Contact • Long Press: Back ]</span>
      </div>

    </div>

    <!-- Carousel Indicator Dots -->
    <div class="carousel-dots" style="display: flex; gap: 8px; margin-top: 8px; flex-shrink: 0;">
      ${favoriteContacts.map((_, idx) => `
        <span style="width: ${idx === state.focusedIndex ? '24px' : '8px'}; height: 8px; background: ${idx === state.focusedIndex ? '#FFCC00' : '#666666'}; border-radius: ${idx === state.focusedIndex ? '4px' : '50%'};"></span>
      `).join('')}
    </div>
  `;

  Speech.speak(`${current.name}, ${formatPhoneNumberForSpeech(current.phone)}`);
}

function renderRecents() {
  const container = document.getElementById('recentsContainer');
  if (!container) return;
  container.innerHTML = '';

  state.focusedItems = state.db.recentCalls || [];
  if (state.focusedItems.length === 0) {
    container.innerHTML = `
      <div class="hero-card" style="width: calc(100% - 32px); height: calc(100% - 40px); border: 3px solid #FFCC00; border-radius: 20px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 28px 20px; background: #000000; margin: 0 auto;">
        <div class="card-header" style="width: 100%; display: flex; justify-content: flex-start; align-items: center; white-space: nowrap;">
          <span class="card-header-counter" style="color: #FFFFFF; font-weight: bold; font-size: 0.9rem; flex-shrink: 0;">[ 0 / 0 ]</span>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
          <div class="hero-icon-circle" style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid #FFCC00; display: flex; align-items: center; justify-content: center;">
            <i class="fa-solid fa-phone-slash" style="font-size: 2.2rem; color: #FFCC00;"></i>
          </div>
          <h2 style="color: #FFCC00; font-size: 1.8rem; margin: 0; font-weight: 800; text-transform: uppercase;">NO RECENT CALLS</h2>
        </div>
        <div style="border-top: 1px dashed #444; width: 100%; padding-top: 12px; text-align: center;">
          <span style="color: #FFCC00; font-size: 0.85rem;">[ Two-Finger Swipe Down: Quick Access • Long Press: Back ]</span>
        </div>
      </div>
    `;
    Speech.speak('No recent calls.');
    return;
  }

  if (state.focusedIndex >= state.focusedItems.length) state.focusedIndex = 0;
  const item = state.focusedItems[state.focusedIndex];
  const total = state.focusedItems.length;

  const isMissed = item.type === 'missed';
  const themeColor = isMissed ? '#FF3333' : '#00FF66'; // Red for missed, Green for received
  const iconClass = isMissed ? 'fa-phone-slash' : 'fa-phone';
  const statusText = `${item.type ? item.type.toUpperCase() : 'RECEIVED'} • ${(item.time || 'JUST NOW').toUpperCase()}`;

  container.innerHTML = `
    <div class="hero-card" style="width: calc(100% - 32px); height: calc(100% - 40px); border: 3px solid ${themeColor}; border-radius: 20px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 28px 20px; background: #000000; margin: 0 auto; box-shadow: 0 0 15px ${themeColor}33;">
      
      <!-- Card Header -->
      <div class="card-header" style="width: 100%; display: flex; justify-content: flex-start; align-items: center; white-space: nowrap;">
        <span class="card-header-counter" style="color: #FFFFFF; font-weight: bold; font-size: 0.9rem; flex-shrink: 0;">[ ${state.focusedIndex + 1} / ${total} ]</span>
      </div>

      <!-- Center Content -->
      <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
        <div class="hero-icon-circle" style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid ${themeColor}; display: flex; align-items: center; justify-content: center; background: ${themeColor}10;">
          <i class="fa-solid ${iconClass}" style="font-size: 2.2rem; color: ${themeColor};"></i>
        </div>
        <div style="text-align: center;">
          <h2 style="color: ${themeColor}; font-size: 2rem; margin: 0; font-weight: 800; text-transform: uppercase;">${item.name}</h2>
          <p style="color: #FFFFFF; font-size: 1rem; font-weight: 700; margin: 6px 0 0 0;">${statusText}</p>
        </div>
      </div>

      <!-- Footer Hint -->
      <div style="border-top: 1px dashed #444; width: 100%; padding-top: 12px; text-align: center;">
        <span style="color: ${themeColor}; font-size: 0.85rem;">[ Two-Finger Swipe Down: Quick Access • Long Press: Back ]</span>
      </div>

    </div>

    <!-- Indicator Dots -->
    <div class="carousel-dots" style="display: flex; gap: 8px; margin-top: 12px;">
      ${state.focusedItems.map((_, idx) => `
        <span style="width: ${idx === state.focusedIndex ? '24px' : '8px'}; height: 8px; background: ${idx === state.focusedIndex ? themeColor : '#666666'}; border-radius: ${idx === state.focusedIndex ? '4px' : '50%'};"></span>
      `).join('')}
    </div>
  `;

  Speech.speak(`${item.name}. ${statusText}`);
}

function handleCallsGesture(gesture) {
  if (state.currentSubScreen === 'callsMenuView') {
    const total = state.focusedItems.length || 4;

    if (gesture === 'swipeRight') {
      if (state.focusedIndex < total - 1) {
        state.focusedIndex++;
        renderCallsMenu();
      } else {
        // Stop at item 4 — vibrate and announce last item
        const currentItem = state.focusedItems[state.focusedIndex];
        announceListBoundary('last', currentItem ? currentItem.name : 'HANDWRITING DIALER', total);
      }
    } else if (gesture === 'swipeLeft') {
      if (state.focusedIndex > 0) {
        state.focusedIndex--;
        renderCallsMenu();
      } else {
        // Stop at item 1 — vibrate and announce first item
        const currentItem = state.focusedItems[state.focusedIndex];
        announceListBoundary('first', currentItem ? currentItem.name : 'CONTACTS', total);
      }
    } else if (gesture === 'doubleTap') {
      Haptic.trigger('success');
      if (state.focusedIndex === 0) navigateTo('callsScreen', 'contactsView');
      if (state.focusedIndex === 1) navigateTo('callsScreen', 'favoritesView');
      if (state.focusedIndex === 2) navigateTo('callsScreen', 'recentsView');
      if (state.focusedIndex === 3) navigateTo('callsScreen', 'handwritingDialerView');
    } else if (gesture === 'longPress') {
      navigateTo('mainMenuScreen');
    }
  }
  else if (state.currentSubScreen === 'contactsView') {
    if (gesture === 'swipeRight') {
      if (state.focusedIndex < state.focusedItems.length - 1) {
        state.focusedIndex++;
        renderContacts();
      } else {
        const contact = state.focusedItems[state.focusedIndex];
        announceListBoundary('last', contact ? contact.name : 'Contact', state.focusedItems.length);
      }
    } else if (gesture === 'swipeLeft') {
      if (state.focusedIndex > 0) {
        state.focusedIndex--;
        renderContacts();
      } else {
        const contact = state.focusedItems[state.focusedIndex];
        announceListBoundary('first', contact ? contact.name : 'Contact', state.focusedItems.length);
      }
    } else if (gesture === 'doubleTap') {
      if (state.quickActionSelection) {
        const contact = state.focusedItems[state.focusedIndex];
        const actionType = state.quickActionSelection.type;
        const newId = `custom_${Date.now()}`;
        const newAction = {
          id: newId,
          name: (actionType === 'call' ? 'Call ' : 'Message ') + contact.name,
          icon: actionType === 'call' ? 'fa-phone' : 'fa-comment-dots',
          type: actionType,
          targetId: contact.id
        };
        if (!state.db.settings.quickAccessCustom) state.db.settings.quickAccessCustom = [];
        state.db.settings.quickAccessCustom.push(newAction);
        if (!state.db.settings.quickAccess) state.db.settings.quickAccess = [];
        if (!state.db.settings.quickAccess.includes(newId)) {
          state.db.settings.quickAccess.push(newId);
        }
        saveDb();
        state.quickActionSelection = null;
        Haptic.trigger('success');
        Speech.speak(`Quick Action created for ${contact.name}`);
        state.focusedIndex = 0;
        navigateTo('settingsScreen', 'quickAccessSettingsView');
        renderQuickAccessSettings();
        return;
      }
      const contact = state.focusedItems[state.focusedIndex];
      state.selectedContact = contact;
      Haptic.trigger('success');
      Speech.speak(`Contact options for ${contact.name}. Swipe to view options.`);
      state.focusedIndex = 0;
      navigateTo('callsScreen', 'contactActionsView');
    } else if (gesture === 'longPress') {
      if (state.quickActionSelection) {
        state.quickActionSelection = null;
        Haptic.trigger('long');
        Speech.speak("Selection canceled. Returned to Quick Access");
        navigateTo('settingsScreen', 'quickAccessSettingsView');
        renderQuickAccessSettings();
        return;
      }
      Haptic.trigger('long');
      Speech.speak("Returned to Phone Menu");
      state.focusedIndex = 0; // Remembers CONTACTS
      navigateTo('callsScreen', 'callsMenuView');
    }
  }
  else if (state.currentSubScreen === 'contactActionsView') {
    if (gesture === 'swipeRight') {
      state.focusedIndex = (state.focusedIndex + 1) % state.focusedItems.length;
      renderContactActions();
    } else if (gesture === 'swipeLeft') {
      state.focusedIndex = (state.focusedIndex - 1 + state.focusedItems.length) % state.focusedItems.length;
      renderContactActions();
    } else if (gesture === 'doubleTap') {
      const selected = state.focusedItems[state.focusedIndex];
      const contact = state.selectedContact;

      if (selected.id === 'call') {
        startActiveCall(contact);
      } else if (selected.id === 'fav') {
        contact.favorite = !contact.favorite;
        saveDb();
        Haptic.trigger('success');
        Speech.speak(`${contact.name} ${contact.favorite ? 'added to favorites' : 'removed from favorites'}`);
        renderContactActions();
      } else if (selected.id === 'emerg') {
        // Bug fix #2: Gate ALL emergency contact changes (add AND remove) behind biometric
        // auth. Previously only removal from Settings was protected; adding via Phone module
        // was unguarded and could be exploited with brief physical access to the device.
        const isCurrentlyEmergency = contact.emergency;
        const authTitle = isCurrentlyEmergency ? 'Remove Emergency Contact' : 'Add Emergency Contact';
        const authText = isCurrentlyEmergency
          ? `Authenticate to remove ${contact.name} from emergency contacts`
          : `Authenticate to add ${contact.name} as an emergency contact`;
        triggerBiometricAuth(authTitle, authText, () => {
          contact.emergency = !contact.emergency;
          saveDb();
          Haptic.trigger('success');
          Speech.speak(`${contact.name} ${contact.emergency ? 'set as emergency contact' : 'removed from emergency contacts'}`);
          renderContactActions();
        });
      } else if (selected.id === 'del') {
        state.db.contacts = state.db.contacts.filter(c => c.id !== contact.id);
        saveDb();
        Haptic.trigger('error');
        Speech.speak(`${contact.name} deleted`);
        state.focusedIndex = 0;
        navigateTo('callsScreen', 'contactsView');
      }
    } else if (gesture === 'longPress') {
      Haptic.trigger('long');
      Speech.speak("Returned to Contacts");
      state.focusedIndex = 0;
      navigateTo('callsScreen', 'contactsView');
    }
  }
  else if (state.currentSubScreen === 'recentsView') {
    state.focusedItems = state.db.recentCalls || [];
    const total = state.focusedItems.length;

    if (gesture === 'swipeRight') {
      if (total > 0) {
        state.focusedIndex = (state.focusedIndex + 1) % total;
        renderRecents();
      }
    } else if (gesture === 'swipeLeft') {
      if (total > 0) {
        state.focusedIndex = (state.focusedIndex - 1 + total) % total;
        renderRecents();
      }
    } else if (gesture === 'doubleTap') {
      if (total > 0) {
        const recent = state.focusedItems[state.focusedIndex];
        const contact = state.db.contacts.find(c => c.name === recent.name) || { name: recent.name, phone: '+389 70 000 000' };
        startActiveCall(contact);
      }
    } else if (gesture === 'longPress') {
      Haptic.trigger('long');
      Speech.speak("Returned to Phone Menu");
      state.focusedIndex = 2; // Remembers RECENT CALLS
      navigateTo('callsScreen', 'callsMenuView');
    }
  }
  else if (state.currentSubScreen === 'favoritesView') {
    state.focusedItems = state.db.contacts ? state.db.contacts.filter(c => c.favorite) : [];
    const total = state.focusedItems.length;

    if (gesture === 'swipeRight') {
      if (total > 0) {
        state.focusedIndex = (state.focusedIndex + 1) % total;
        renderFavorites();
      }
    } else if (gesture === 'swipeLeft') {
      if (total > 0) {
        state.focusedIndex = (state.focusedIndex - 1 + total) % total;
        renderFavorites();
      }
    } else if (gesture === 'doubleTap') {
      if (total > 0) {
        const contact = state.focusedItems[state.focusedIndex];
        startActiveCall(contact);
      }
    } else if (gesture === 'longPress') {
      Haptic.trigger('long');
      Speech.speak("Returned to Phone Menu");
      state.focusedIndex = 1; // Remembers FAVORITES
      navigateTo('callsScreen', 'callsMenuView');
    }
  }
  else if (state.currentSubScreen === 'handwritingDialerView') {
    const logEl = document.getElementById('dialerNumberLog');
    let currentNumber = (state.dialedNumber && state.dialedNumber !== 'No number') ? state.dialedNumber : '';

    if (gesture === 'swipeLeft') {
      if (currentNumber.length > 0) {
        const deletedChar = currentNumber.slice(-1);
        currentNumber = currentNumber.slice(0, -1);
        state.dialedNumber = currentNumber;
        if (logEl) logEl.innerText = currentNumber.length > 0 ? currentNumber : 'No number';
        Haptic.trigger('error');
        Speech.speak(`${getDigitName(deletedChar)} deleted`);
      } else {
        Haptic.trigger('error');
        Speech.speak('No digits to delete');
      }
    } else if (gesture === 'doubleTap') {
      if (currentNumber.length > 0) {
        Haptic.trigger('success');
        Speech.speak(`Calling ${formatPhoneNumberForSpeech(currentNumber)}`);
        startActiveCall({ name: currentNumber, phone: currentNumber });
      } else {
        Haptic.trigger('error');
        Speech.speak('Please draw digits first');
      }
    } else if (gesture === 'longPress') {
      Haptic.trigger('long');
      Speech.speak("Returned to Phone Menu");
      state.focusedIndex = 3; // Remembers HANDWRITING DIALER
      navigateTo('callsScreen', 'callsMenuView');
    }
  }
}

let incomingCallInterval = null;

function triggerIncomingCall(contact) {
  // Store previous screen context
  if (state.currentScreen && state.currentScreen !== 'incomingCallScreen' && state.currentScreen !== 'welcomeScreen') {
    state.previousScreen = state.currentScreen;
    state.previousSubScreen = state.currentSubScreen;
  } else {
    state.previousScreen = 'mainMenuScreen';
    state.previousSubScreen = null;
  }

  state.activeCallContact = contact || { name: 'Mother', phone: '+389 70 123 456' };

  const nameEl = document.getElementById('incomingCallerName');
  if (nameEl) nameEl.innerText = state.activeCallContact.name || 'Unknown';

  const numEl = document.getElementById('incomingCallerNumber');
  if (numEl) numEl.innerText = state.activeCallContact.phone || '';

  navigateTo('incomingCallScreen');

  if (incomingCallInterval) {
    clearInterval(incomingCallInterval);
  }

  Haptic.trigger('incomingCall');
  incomingCallInterval = setInterval(() => {
    Haptic.trigger('incomingCall');
  }, 2500);

  Speech.speak("Incoming call from " + (state.activeCallContact.name || "Unknown contact") + ". Double tap to answer, long press to decline.");
}

function answerIncomingCall() {
  if (incomingCallInterval) {
    clearInterval(incomingCallInterval);
    incomingCallInterval = null;
  }

  Haptic.trigger('success');
  Speech.speak("Call connected.");

  if (state.activeCallContact) {
    startActiveCall(state.activeCallContact, true);
  } else {
    startActiveCall({ name: 'Unknown', phone: '' }, true);
  }
}

function declineIncomingCall() {
  if (incomingCallInterval) {
    clearInterval(incomingCallInterval);
    incomingCallInterval = null;
  }

  Haptic.trigger('declineCall');
  Speech.speak("Call declined. Auto SMS reply sent.");

  if (state.activeCallContact) {
    const contact = state.activeCallContact;
    logSystem(`Auto SMS reply sent to ${contact.name} (${contact.phone}): "Sorry, I cannot talk right now."`, 'sms');
  }

  // Ensure target screen is valid before executing navigation
  const targetScreen = (state.previousScreen && state.previousScreen !== 'incomingCallScreen')
    ? state.previousScreen
    : 'mainMenuScreen';

  const targetSubScreen = state.previousSubScreen || null;

  // Force navigation back to the active view
  navigateTo(targetScreen, targetSubScreen);
}

function startActiveCall(contact, isIncomingAnswer = false) {
  state.activeCallContact = contact;
  state.isMuted = false;
  state.isSpeakerphone = false;

  const btnMute = document.getElementById('btnToggleMute');
  if (btnMute) btnMute.classList.remove('active');
  const btnSpeaker = document.getElementById('btnToggleSpeaker');
  if (btnSpeaker) btnSpeaker.classList.remove('active');

  navigateTo('activeCallScreen');

  const nameEl = document.getElementById('activeCallName');
  if (nameEl) nameEl.innerText = contact.name;
  const timerEl = document.getElementById('activeCallTimer');
  if (timerEl) timerEl.innerText = '00:00';
  const statusEl = document.getElementById('activeCallStatus');

  if (isIncomingAnswer) {
    if (statusEl) statusEl.innerText = 'Connected';
    Haptic.playSound('connected');
    // Bug fix #3a (support): Flag that this was an incoming call so endCall() logs it correctly.
    state._lastCallWasIncoming = true;
    logSystem(`Incoming call connected with ${contact.name}`, 'action');
  } else {
    if (statusEl) statusEl.innerText = 'Calling...';
    Haptic.playSound('ringing');
    state._lastCallWasIncoming = false;
    logSystem(`Placing call to ${contact.name} (${contact.phone})`, 'action');
  }

  let duration = 0;
  let hasConnected = isIncomingAnswer;

  state.callTimerInterval = setInterval(() => {
    duration++;

    if (!hasConnected && duration >= 3) {
      hasConnected = true;
      Haptic.playSound('connected');
      if (statusEl) statusEl.innerText = 'Connected';
      Speech.speak(`Call with ${contact.name} connected.`);
    }

    if (hasConnected && timerEl) {
      const mins = String(Math.floor(duration / 60)).padStart(2, '0');
      const secs = String(duration % 60).padStart(2, '0');
      timerEl.innerText = `${mins}:${secs}`;
    }
  }, 1000);
}

function endCall() {
  if (state.callTimerInterval) clearInterval(state.callTimerInterval);

  try {
    const ringSound = document.getElementById('soundCallRinging');
    const connSound = document.getElementById('soundCallConnected');
    if (ringSound) ringSound.pause();
    if (connSound) connSound.pause();
  } catch (e) { }

  Haptic.trigger('long');
  Speech.speak('Call disconnected.');
  logSystem('Call ended.', 'action');

  if (state.activeCallContact) {
    // Bug fix #3a: Record the correct call type ('outgoing' vs 'received') instead of
    // always logging every call as 'received'.
    const callType = state._lastCallWasIncoming ? 'received' : 'outgoing';
    state._lastCallWasIncoming = false; // reset flag
    state.db.recentCalls.unshift({
      id: Date.now(),
      name: state.activeCallContact.name,
      type: callType,
      time: 'Just now'
    });
    // Bug fix #3b: Cap recentCalls at 50 entries to prevent unbounded localStorage growth.
    if (state.db.recentCalls.length > 50) {
      state.db.recentCalls = state.db.recentCalls.slice(0, 50);
    }
    saveDb();
  }

  navigateTo('callsScreen', 'callsMenuView');
}

// --- Camera OCR Module ---
function renderCameraMenu() {
  const container = document.getElementById('cameraMenuContainer');
  if (!container) return;

  // Standardize parent container styling
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'center';
  container.style.flex = '1';
  container.style.width = '100%';
  container.style.boxSizing = 'border-box';
  container.innerHTML = '';

  const cameraItems = [
    {
      id: 'ocr',
      title: 'TEXT READER (OCR)',
      icon: 'fa-solid fa-file-lines',
      description: 'Read labels, documents, and signs aloud.'
    },
    {
      id: 'objectDetection',
      title: 'OBJECT DETECTION',
      icon: 'fa-solid fa-cubes',
      description: 'Identify objects and obstacles in front of you.'
    }
  ];

  state.focusedItems = cameraItems;
  const total = cameraItems.length;

  if (state.focusedIndex >= total) state.focusedIndex = 0;
  const current = cameraItems[state.focusedIndex];

  container.innerHTML = `
    <div class="hero-card" style="width: calc(100% - 32px); flex: 1; max-height: calc(100% - 24px); border: 3px solid #FFCC00; border-radius: 20px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 22px 18px; background: #000000; margin: 0 auto; overflow: hidden;">
      
      <!-- Card Header Counter -->
      <div class="card-header" style="width: 100%; display: flex; justify-content: flex-start; align-items: center; flex-shrink: 0;">
        <span style="color: #FFFFFF; font-weight: bold; font-size: 1rem;">[ ${state.focusedIndex + 1} / ${total} ]</span>
      </div>

      <!-- Center Icon & Title -->
      <div style="display: flex; flex-direction: column; align-items: center; gap: 16px; margin: auto 0; text-align: center; width: 100%;">
        <div class="hero-icon-circle" style="width: 90px; height: 90px; min-width: 90px; min-height: 90px; border-radius: 50%; border: 3px solid #FFCC00; display: flex; align-items: center; justify-content: center; background: rgba(255, 204, 0, 0.05);">
          <i class="${current.icon}" style="font-size: 2.6rem; color: #FFCC00;"></i>
        </div>
        <h2 style="color: #FFCC00; font-size: 2.2rem; margin: 0; font-weight: 800; text-transform: uppercase; text-align: center; line-height: 1.1;">
          ${current.title}
        </h2>
      </div>

      <!-- Card Footer Action Hint -->
      <div style="border-top: 1px dashed #444; width: 100%; padding-top: 10px; text-align: center; flex-shrink: 0;">
        <span style="color: #FFCC00; font-size: 0.8rem; font-weight: bold;">[ Double Tap: Activate Camera • Long Press: Back ]</span>
      </div>

    </div>

    <!-- Carousel Dots -->
    <div class="carousel-dots" style="display: flex; gap: 8px; margin-top: 8px; flex-shrink: 0;">
      ${cameraItems.map((_, idx) => `
        <span style="width: ${idx === state.focusedIndex ? '24px' : '8px'}; height: 8px; background: ${idx === state.focusedIndex ? '#FFCC00' : '#666666'}; border-radius: ${idx === state.focusedIndex ? '4px' : '50%'};"></span>
      `).join('')}
    </div>
  `;

  Speech.speak(`${current.title}. Option ${state.focusedIndex + 1} of ${total}.`);
}

function startCameraActiveViewport() {
  state.isCameraActive = true;
  const toast = document.getElementById('cameraToast');
  if (toast) toast.style.display = 'none';

  const video = document.getElementById('webcamFeed');
  if (video) {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        state.webcamStream = stream;
        video.srcObject = stream;
        video.style.display = 'block';
        Speech.speak('Camera active. Point your phone and double tap screen to capture.');
      })
      .catch(err => {
        console.error("Camera access failed:", err);
        Speech.speak('Camera active in simulator mode. Point your phone and double tap screen to capture.');
      });
  } else {
    Speech.speak('Camera active. Point your phone and double tap screen to capture.');
  }
}

function stopWebcam() {
  state.isCameraActive = false;
  const video = document.getElementById('webcamFeed');
  if (video) {
    video.srcObject = null;
  }
  if (state.webcamStream) {
    state.webcamStream.getTracks().forEach(track => track.stop());
    state.webcamStream = null;
  }
}

async function measureFrameLuma() {
  const video = document.getElementById('webcamFeed') || document.querySelector('video');
  if (!video || !state.isCameraActive) return null;

  try {
    const canvas = document.createElement('canvas');
    // Sample at low resolution for speed
    canvas.width = 64;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imageData.data;
    let total = 0;
    // Luma approximation: 0.299R + 0.587G + 0.114B
    for (let i = 0; i < d.length; i += 4) {
      total += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    }
    return total / (canvas.width * canvas.height);
  } catch (e) {
    return null; // canvas taint or browser restriction
  }
}

async function captureCameraImage() {
  // --- AMBIENT LIGHT CHECK ---
  // Blind users cannot see whether the room is lit. Warn early rather
  // than returning a blank/noisy OCR result with no explanation.
  const luma = await measureFrameLuma();
  const LUMA_THRESHOLD = 30; // below this → very dark frame

  if (luma !== null && luma < LUMA_THRESHOLD) {
    Haptic.trigger('error');
    Speech.speak('Light level is too low. Please turn on a light or the flashlight before scanning.');
    logSystem(`Camera luma check: ${luma.toFixed(1)} — below threshold, warned user.`, 'error');
    return; // abort capture
  }

  Haptic.trigger('success');
  const toast = document.getElementById('cameraToast');
  if (toast) {
    toast.style.display = 'block';
    toast.innerText = 'Capturing image...';
  }

  Speech.speak('Image captured. Analyzing.');

  setTimeout(() => {
    if (toast) toast.innerText = 'Processing OCR...';
    setTimeout(() => {
      navigateTo('cameraScreen', 'cameraResultsView');
    }, 1200);
  }, 1000);
}


function renderCameraResults() {
  const display = document.getElementById('cameraResultText');
  const ocrSelect = document.getElementById('ocrSceneSelect');
  const objSelect = document.getElementById('objectSceneSelect');
  const categoryTag = document.querySelector('#cameraResultsView .hero-category-tag');

  let resultText = '';

  if (state.cameraMode === 'object') {
    if (categoryTag) categoryTag.innerHTML = '<i class="fa-solid fa-cubes"></i> DETECTED OBJECTS';
    const choice = objSelect ? objSelect.value : 'chair';
    const mappings = {
      chair: 'Office Chair detected directly in front of you. Path is slightly blocked.',
      cup: 'Coffee Cup and Notebook detected on the table.',
      keyboard: 'Computer Keyboard and Mouse detected on the desk.'
    };
    resultText = mappings[choice] || 'No objects detected.';
  } else {
    if (categoryTag) categoryTag.innerHTML = '<i class="fa-solid fa-file-lines"></i> SCANNED TEXT';
    const choice = ocrSelect ? ocrSelect.value : 'medicine';
    const mappings = {
      medicine: 'Paracetamol Tablets, 500mg. Take one tablet twice daily with water. Keep out of reach of children.',
      book: 'Chapter 1. It was a dark and stormy night; the rain fell in torrents...',
      label: 'Whole Milk, 1L, Price: $1.99. Best by: August 2nd.',
      menu: 'Pasta Carbonara - 12 USD, Lasagna - 14 USD, Tiramisu - 6 USD. Ask server for specials.',
      webcam: 'Real-time text from camera feed: High contrast labels found.'
    };
    resultText = mappings[choice] || 'No text recognized.';
  }

  if (display) display.innerText = resultText;
  Speech.speak(resultText);
}

function handleCameraGesture(gesture) {
  if (state.currentSubScreen === 'cameraMenuView') {
    if (gesture === 'swipeRight') {
      if (state.focusedIndex < state.focusedItems.length - 1) {
        state.focusedIndex++;
        renderCameraMenu();
      } else {
        const item = state.focusedItems[state.focusedIndex];
        announceListBoundary('last', item ? item.name : 'Option', state.focusedItems.length);
      }
    } else if (gesture === 'swipeLeft') {
      if (state.focusedIndex > 0) {
        state.focusedIndex--;
        renderCameraMenu();
      } else {
        const item = state.focusedItems[state.focusedIndex];
        announceListBoundary('first', item ? item.name : 'Option', state.focusedItems.length);
      }
    } else if (gesture === 'doubleTap') {
      state.cameraMode = state.focusedIndex === 0 ? 'ocr' : 'object';
      navigateTo('cameraScreen', 'cameraActiveView');
    } else if (gesture === 'longPress') {
      navigateTo('mainMenuScreen');
    }
  }
  else if (state.currentSubScreen === 'cameraActiveView') {
    if (gesture === 'doubleTap') {
      captureCameraImage();
    } else if (gesture === 'longPress') {
      stopWebcam();
      Haptic.trigger('long');
      Speech.speak('Returned to Camera Menu');
      // state.focusedIndex is preserved (0 for OCR, 1 for Object Detection)
      navigateTo('cameraScreen', 'cameraMenuView');
    }
  }
  else if (state.currentSubScreen === 'cameraResultsView') {
    if (gesture === 'longPress') {
      stopWebcam();
      Haptic.trigger('long');
      Speech.speak('Returned to Camera Menu');
      // state.focusedIndex is preserved (0 for OCR, 1 for Object Detection)
      navigateTo('cameraScreen', 'cameraMenuView');
    } else if (gesture === 'doubleTap') {
      Haptic.trigger('success');
      Speech.speak('Result copied to clipboard');
    } else if (gesture === 'tap' || gesture === 'singleTap') {
      const display = document.getElementById('cameraResultText');
      const text = display ? display.innerText : 'Paracetamol Tablets, 500mg. Take one tablet twice daily with water.';
      Speech.speak(text);
    }
  }
}

// --- Navigation Module ---
function renderNavigationMenu() {
  const items = [
    { id: 'dest', name: 'ENTER DESTINATION', subtitle: 'Search address via voice or typing', icon: 'fa-location-dot' },
    { id: 'favs', name: 'SAVED PLACES', subtitle: 'Access Home, Work, and favorite routes', icon: 'fa-star' }
  ];
  state.focusedItems = items;
  const current = items[state.focusedIndex] || items[0];
  const container = document.getElementById('navMenuContainer');
  const total = items.length;

  if (container) {
    // Standardize parent container styling
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.flex = '1';
    container.style.width = '100%';
    container.style.boxSizing = 'border-box';

    container.innerHTML = `
      <div class="hero-card" style="width: calc(100% - 32px); flex: 1; max-height: calc(100% - 24px); border: 3px solid #FFCC00; border-radius: 20px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 22px 18px; background: #000000; margin: 0 auto; overflow: hidden;">
        <div class="card-header" style="width: 100%; display: flex; justify-content: flex-start; align-items: center; flex-shrink: 0;">
          <span style="color: #FFFFFF; font-weight: bold; font-size: 1rem;">[ ${state.focusedIndex + 1} / ${total} ]</span>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; gap: 16px; margin: auto 0; text-align: center; width: 100%;">
          <div class="hero-icon-circle" style="width: 90px; height: 90px; min-width: 90px; min-height: 90px; border-radius: 50%; border: 3px solid #FFCC00; display: flex; align-items: center; justify-content: center; background: rgba(255, 204, 0, 0.05);">
            <i class="fa-solid ${current.icon}" style="font-size: 2.6rem; color: #FFCC00;"></i>
          </div>
          <h2 style="color: #FFCC00; font-size: 2.2rem; margin: 0; font-weight: 800; text-transform: uppercase; text-align: center; line-height: 1.1;">${current.name}</h2>
        </div>
        <div style="border-top: 1px dashed #444; width: 100%; padding-top: 10px; text-align: center; flex-shrink: 0;">
          <span style="color: #FFCC00; font-size: 0.8rem; font-weight: bold;">[ Double Tap: Select • Swipe: Next ]</span>
        </div>
      </div>
      <div class="carousel-dots" style="display: flex; gap: 8px; margin-top: 8px; flex-shrink: 0;">
        ${items.map((_, idx) => `
          <span style="width: ${idx === state.focusedIndex ? '24px' : '8px'}; height: 8px; background: ${idx === state.focusedIndex ? '#FFCC00' : '#666666'}; border-radius: ${idx === state.focusedIndex ? '4px' : '50%'};"></span>
        `).join('')}
      </div>
    `;
  }
  Speech.speak(items[state.focusedIndex].name);
}

let navSpeechRecognition = null;
let navTouchStartTime = 0;
let navMorseBuffer = '';
let navMorseText = '';
let navMorseTimer = null;

function startNavigationSpeechSearch() {
  const subtitleEl = document.getElementById('navDestSubtitle');
  if (subtitleEl) subtitleEl.innerText = 'Speak or tap Morse code to search';

  navMorseBuffer = '';
  navMorseText = '';

  Speech.speak("Navigation active. Speak your destination or tap Morse code.");

  initNavMorseListeners();

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  try {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    // Bug fix #6 (navigation STT): Use Macedonian locale to match app TTS language.
    recognition.lang = 'mk-MK';

    recognition.onresult = (event) => {
      if (state.currentSubScreen !== 'navDestinationInputView') return;
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (subtitleEl && transcript) {
        subtitleEl.innerText = `"${transcript}"`;
      }
      if (event.results[0] && event.results[0].isFinal) {
        confirmNavDestination(transcript || 'Eurofarm Pharmacy Center');
      }
    };

    recognition.onerror = (e) => {
      logSystem(`Nav STT error: ${e.error || 'unknown'}`, 'error');
      if (e.error === 'not-allowed' || e.error === 'audio-capture') {
        Haptic.trigger('error');
        Speech.speak('Microphone access denied. You can also tap Morse code to enter your destination.');
      } else {
        Speech.speak('Voice input error. Tap Morse code or swipe right for a default destination.');
      }
    };
    recognition.start();
    navSpeechRecognition = recognition;
  } catch (e) { }
}

function initNavMorseListeners() {
  const inputScreen = document.getElementById('navDestinationInputView');
  if (!inputScreen) return;

  inputScreen.onmousedown = (e) => {
    if (state.currentSubScreen !== 'navDestinationInputView') return;
    e.stopPropagation();
    navTouchStartTime = Date.now();
  };

  inputScreen.onmouseup = (e) => {
    if (state.currentSubScreen !== 'navDestinationInputView') return;
    e.stopPropagation();
    const duration = Date.now() - navTouchStartTime;

    if (duration >= MORSE_INPUT.DASH_THRESHOLD) return;

    if (navSpeechRecognition) {
      try { navSpeechRecognition.stop(); } catch (err) { }
      navSpeechRecognition = null;
    }

    const symbol = duration < MORSE_INPUT.DOT_THRESHOLD ? '.' : '-';
    navMorseBuffer += symbol;

    Haptic.trigger(symbol === '.' ? 'short' : 'long');

    if (navMorseTimer) clearTimeout(navMorseTimer);
    navMorseTimer = setTimeout(decodeNavMorseLetter, 800);
  };
}

function decodeNavMorseLetter() {
  const char = DECODE_MORSE_MAP[navMorseBuffer];
  const subtitleEl = document.getElementById('navDestSubtitle');

  if (char) {
    navMorseText += char;
    if (subtitleEl) subtitleEl.innerText = `Morse search: ${navMorseText}`;
    Speech.speak(char);
  } else if (navMorseBuffer.length > 0) {
    Haptic.trigger('error');
    Speech.speak('Unknown symbol');
  }
  navMorseBuffer = '';
}

function confirmNavDestination(destinationName) {
  if (navSpeechRecognition) {
    try { navSpeechRecognition.stop(); } catch (e) { }
    navSpeechRecognition = null;
  }

  const dest = destinationName || 'Eurofarm Pharmacy Center';
  const subtitleEl = document.getElementById('navDestSubtitle');
  if (subtitleEl) subtitleEl.innerText = `Destination found: ${dest}`;

  Haptic.trigger('success');
  Speech.speak(`Destination found: ${dest}. Opening options.`);

  setTimeout(() => {
    state.focusedIndex = 0;
    navigateTo('navigationScreen', 'navActionsView');
  }, 1400);
}

function renderNavigationActions() {
  const container = document.getElementById('navActionsContainer');
  if (!container) return;

  const actions = [
    {
      id: 'start',
      name: 'START NAVIGATION',
      subtitle: 'Turn-by-turn route guidance',
      icon: 'fa-location-arrow',
      hint: '[ Double Tap: Start Navigation • Swipe: Next ]',
      action: () => {
        Speech.speak('Navigation started. Head north for 100 meters.');
        navigateTo('navigationScreen', 'navActiveRoutingView');
      }
    },
    {
      id: 'call',
      name: 'CALL LOCATION',
      subtitle: '+389 2 3200 900',
      icon: 'fa-phone',
      hint: '[ Double Tap: Place Call • Swipe: Next ]',
      action: () => {
        startActiveCall({ name: 'Eurofarm Pharmacy', phone: '+389 2 3200 900' });
      }
    },
    {
      id: 'save',
      name: 'SAVE PLACE',
      subtitle: 'Add to Saved Places',
      icon: 'fa-star',
      hint: '[ Double Tap: Save Location • Swipe: Next ]',
      action: () => {
        state.db.savedPlaces.push({
          id: Date.now(),
          name: 'Eurofarm Pharmacy',
          address: '11 October Street, Center'
        });
        saveDb();
        Haptic.trigger('success');
        Haptic.trigger('success');
        Speech.speak('Place saved to Saved Places');
        navigateTo('navigationScreen', 'navMenuView');
      }
    }
  ];

  state.focusedItems = actions;
  if (state.focusedIndex >= actions.length) state.focusedIndex = 0;

  const current = actions[state.focusedIndex];
  const total = actions.length;

  container.innerHTML = `
    <div class="hero-card" style="width: calc(100% - 32px); flex: 1; max-height: calc(100% - 24px); border: 3px solid #FFCC00; border-radius: 20px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 18px 16px; background: #000000; overflow: hidden;">
      <div class="card-header" style="width: 100%; display: flex; justify-content: flex-start; align-items: center; gap: 12px; flex-shrink: 0;">
        <span class="card-header-counter" style="color: #FFFFFF; font-weight: bold; font-size: 1rem; white-space: nowrap; flex-shrink: 0;">[ ${state.focusedIndex + 1} / ${total} ]</span>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 12px; margin: auto 0;">
        <div class="hero-icon-circle" style="width: 70px; height: 70px; min-width: 70px; min-height: 70px; border-radius: 50%; border: 3px solid #FFCC00; display: flex; align-items: center; justify-content: center;">
          <i class="fa-solid ${current.icon}" style="font-size: 1.8rem; color: #FFCC00;"></i>
        </div>
        <h2 style="color: #FFCC00; font-size: 1.6rem; margin: 0; font-weight: 800; text-transform: uppercase; text-align: center; line-height: 1.1;">${current.name}</h2>
        
      </div>
      <div style="border-top: 1px dashed #444; width: 100%; padding-top: 10px; text-align: center; flex-shrink: 0;">
        <span style="color: #FFCC00; font-size: 0.8rem; font-weight: bold;">${current.hint}</span>
      </div>
    </div>
    <div class="carousel-dots" style="display: flex; gap: 8px; margin-top: 6px; flex-shrink: 0;">
      ${actions.map((_, idx) => `
        <span style="width: ${idx === state.focusedIndex ? '24px' : '8px'}; height: 8px; background: ${idx === state.focusedIndex ? '#FFCC00' : '#666666'}; border-radius: ${idx === state.focusedIndex ? '4px' : '50%'};"></span>
      `).join('')}
    </div>
  `;

  Speech.speak(current.name);
}

let selectedSavedPlace = null;

function renderNavigationResults() {
  const titleEl = document.getElementById('navResultsTitle');
  if (titleEl) titleEl.innerText = "Saved Places";

  const container = document.getElementById('navResultsContainer');
  if (!container) return;

  // Force container to fill available vertical space and center content — same pattern as renderMessagesList
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.justifyContent = 'center';
  container.style.alignItems = 'center';
  container.style.height = '100%';
  container.style.width = '100%';
  container.style.boxSizing = 'border-box';

  const places = state.db.savedPlaces || [];
  state.focusedItems = places;

  if (places.length === 0) {
    container.innerHTML = `
      <div class="hero-card" style="width: calc(100% - 32px); flex: 1; max-height: calc(100% - 24px); border: 3px solid #FFCC00; border-radius: 20px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 18px 16px; background: #000000; overflow: hidden;">
        <div class="card-header" style="width: 100%; display: flex; justify-content: flex-start; align-items: center; gap: 12px; flex-shrink: 0;">
          <span style="color: #FFFFFF; font-weight: bold; font-size: 1rem; white-space: nowrap; flex-shrink: 0;">[ 0 / 0 ]</span>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; gap: 12px; margin: auto 0;">
          <div class="hero-icon-circle" style="width: 70px; height: 70px; min-width: 70px; min-height: 70px; border-radius: 50%; border: 3px solid #FFCC00; display: flex; align-items: center; justify-content: center;">
            <i class="fa-solid fa-bookmark" style="font-size: 1.8rem; color: #FFCC00;"></i>
          </div>
          <h2 style="color: #FFCC00; font-size: 1.6rem; margin: 0; font-weight: 800; text-transform: uppercase; text-align: center;">NO SAVED PLACES</h2>
          <p style="color: #FFFFFF; font-size: 0.95rem; text-align: center; margin: 0;">Add places by searching destinations</p>
        </div>
        <div style="border-top: 1px dashed #444; width: 100%; padding-top: 10px; text-align: center; flex-shrink: 0;">
          <span style="color: #FFCC00; font-size: 0.8rem; font-weight: bold;">[ Long Press: Back to Navigation Menu ]</span>
        </div>
      </div>
    `;
    Speech.speak("No saved places found.");
    return;
  }

  if (state.focusedIndex >= places.length) state.focusedIndex = 0;
  const current = places[state.focusedIndex];
  const total = places.length;

  container.innerHTML = `
    <div class="hero-card" style="width: calc(100% - 32px); height: auto; border: 3px solid #FFCC00; border-radius: 20px; box-sizing: border-box; display: flex; flex-direction: column; gap: 18px; padding: 22px 18px; background: #000000; margin: 0 auto; overflow: hidden;">
      <div class="card-header" style="width: 100%; display: flex; justify-content: flex-start; align-items: center; gap: 12px; flex-shrink: 0;">
        <span style="color: #FFFFFF; font-weight: bold; font-size: 1rem; white-space: nowrap; flex-shrink: 0;">[ ${state.focusedIndex + 1} / ${total} ]</span>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 12px; margin: 0 auto; width: 100%;">
        <div class="hero-icon-circle" style="width: 70px; height: 70px; min-width: 70px; min-height: 70px; border-radius: 50%; border: 3px solid #FFCC00; display: flex; align-items: center; justify-content: center;">
          <i class="fa-solid fa-star" style="font-size: 1.8rem; color: #FFCC00;"></i>
        </div>
        <h2 style="color: #FFCC00; font-size: 1.6rem; margin: 0; font-weight: 800; text-transform: uppercase; text-align: center; line-height: 1.1;">${current.name}</h2>
        <p style="color: #FFFFFF; font-size: 0.95rem; text-align: center; margin: 0; line-height: 1.3;">${current.address || ''}</p>
      </div>
     
    </div>
    <div class="carousel-dots" style="display: flex; gap: 8px; margin-top: 16px; flex-shrink: 0;">
      ${places.map((_, idx) => `
        <span style="width: ${idx === state.focusedIndex ? '24px' : '8px'}; height: 8px; background: ${idx === state.focusedIndex ? '#FFCC00' : '#666666'}; border-radius: ${idx === state.focusedIndex ? '4px' : '50%'};"></span>
      `).join('')}
    </div>
  `;

  Speech.speak(`${current.name}, ${current.address || ''}`);
}

function renderSavedPlaceActions() {
  const container = document.getElementById('navActionsContainer');
  if (!container) return;

  const place = selectedSavedPlace || { name: 'Eurofarm Pharmacy', address: '11 October Street, Center', phone: '+389 2 3200 900' };

  const actions = [
    {
      id: 'start',
      name: 'START NAVIGATION',
      subtitle: 'Turn-by-turn route guidance',
      icon: 'fa-location-arrow',
      color: '#FFCC00',
      hint: '[ Double Tap: Start Navigation • Swipe: Next ]',
      action: () => {
        Speech.speak('Navigation started. Head north for 100 meters.');
        navigateTo('navigationScreen', 'navActiveRoutingView');
      }
    },
    {
      id: 'call',
      name: 'CALL PLACE',
      subtitle: place.phone || '+389 2 3200 900',
      icon: 'fa-phone',
      color: '#FFCC00',
      hint: '[ Double Tap: Place Call • Swipe: Next ]',
      action: () => {
        startActiveCall({ name: place.name, phone: place.phone || '+389 2 3200 900' });
      }
    },
    {
      id: 'remove',
      name: 'REMOVE SAVED PLACE',
      subtitle: 'Delete from Saved Places',
      icon: 'fa-trash-can',
      color: '#FF3333',
      hint: '[ Double Tap: Confirm Delete • Swipe: Next ]',
      action: () => {
        const idx = (state.db.savedPlaces || []).findIndex(p => p.id === place.id || p.name === place.name);
        if (idx !== -1) {
          state.db.savedPlaces.splice(idx, 1);
          saveDb();
        }
        Haptic.trigger('error');
        Haptic.trigger('error');
        Haptic.trigger('error');
        Speech.speak(`${place.name} removed from saved places`);
        selectedSavedPlace = null;
        state.focusedIndex = 0;
        navigateTo('navigationScreen', 'navResultsView');
      }
    }
  ];

  state.focusedItems = actions;
  if (state.focusedIndex >= actions.length) state.focusedIndex = 0;

  const current = actions[state.focusedIndex];
  const total = actions.length;
  const themeColor = current.color || '#FFCC00';

  container.innerHTML = `
    <div class="hero-card" style="width: calc(100% - 32px); flex: 1; max-height: calc(100% - 24px); border: 3px solid ${themeColor}; border-radius: 20px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 18px 16px; background: #000000; overflow: hidden;">
      <div class="card-header" style="width: 100%; display: flex; justify-content: flex-start; align-items: center; gap: 12px; flex-shrink: 0;">
        <span class="card-header-counter" style="color: #FFFFFF; font-weight: bold; font-size: 1rem; white-space: nowrap; flex-shrink: 0;">[ ${state.focusedIndex + 1} / ${total} ]</span>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 12px; margin: auto 0;">
        <div class="hero-icon-circle" style="width: 70px; height: 70px; min-width: 70px; min-height: 70px; border-radius: 50%; border: 3px solid ${themeColor}; display: flex; align-items: center; justify-content: center;">
          <i class="fa-solid ${current.icon}" style="font-size: 1.8rem; color: ${themeColor};"></i>
        </div>
        <h2 style="color: ${themeColor}; font-size: 1.6rem; margin: 0; font-weight: 800; text-transform: uppercase; text-align: center; line-height: 1.1;">${current.name}</h2>
        <p style="color: #FFFFFF; font-size: 0.95rem; text-align: center; margin: 0; line-height: 1.3;">${current.subtitle}</p>
      </div>
      <div style="border-top: 1px dashed #444; width: 100%; padding-top: 10px; text-align: center; flex-shrink: 0;">
        <span style="color: ${themeColor}; font-size: 0.8rem; font-weight: bold;">${current.hint}</span>
      </div>
    </div>
    <div class="carousel-dots" style="display: flex; gap: 8px; margin-top: 6px; flex-shrink: 0;">
      ${actions.map((_, idx) => `
        <span style="width: ${idx === state.focusedIndex ? '24px' : '8px'}; height: 8px; background: ${idx === state.focusedIndex ? themeColor : '#666666'}; border-radius: ${idx === state.focusedIndex ? '4px' : '50%'};"></span>
      `).join('')}
    </div>
  `;

  Speech.speak(current.name);
}

function handleNavigationGesture(gesture) {
  if (state.currentSubScreen === 'navMenuView') {
    if (gesture === 'swipeRight') {
      if (state.focusedIndex < 1) {
        state.focusedIndex++;
        renderNavigationMenu();
      } else {
        const item = state.focusedItems[state.focusedIndex];
        announceListBoundary('last', item ? item.name : 'Saved Places', 2);
      }
    } else if (gesture === 'swipeLeft') {
      if (state.focusedIndex > 0) {
        state.focusedIndex--;
        renderNavigationMenu();
      } else {
        const item = state.focusedItems[state.focusedIndex];
        announceListBoundary('first', item ? item.name : 'Enter Destination', 2);
      }
    } else if (gesture === 'doubleTap') {
      if (state.focusedIndex === 0) {
        selectedSavedPlace = null;
        navigateTo('navigationScreen', 'navDestinationInputView');
      }
      if (state.focusedIndex === 1) {
        state.focusedItems = state.db.savedPlaces;
        state.focusedIndex = 0;
        navigateTo('navigationScreen', 'navResultsView');
      }
    } else if (gesture === 'longPress') {
      navigateTo('mainMenuScreen');
    }
  }
  else if (state.currentSubScreen === 'navDestinationInputView') {
    if (gesture === 'swipeRight' || gesture === 'doubleTap') {
      // Use Morse or voice input if available, otherwise fall back to default demo destination
      const dest = navMorseText || 'Eurofarm Pharmacy Center';
      confirmNavDestination(dest);
    } else if (gesture === 'longPress') {
      if (navSpeechRecognition) {
        try { navSpeechRecognition.stop(); } catch (e) { }
        navSpeechRecognition = null;
      }
      Haptic.trigger('long');
      Speech.speak("Returned to Navigation Menu");
      state.focusedIndex = 0; // Remembers ENTER DESTINATION
      navigateTo('navigationScreen', 'navMenuView');
    }
  }
  else if (state.currentSubScreen === 'navResultsView') {
    const places = state.db.savedPlaces || [];
    if (places.length === 0) {
      if (gesture === 'longPress') {
        if (state.quickActionSelection) {
          state.quickActionSelection = null;
          Haptic.trigger('long');
          Speech.speak("Selection canceled. Returned to Quick Access");
          navigateTo('settingsScreen', 'quickAccessSettingsView');
          renderQuickAccessSettings();
          return;
        }
        Haptic.trigger('long');
        Speech.speak("Returned to Navigation Menu");
        state.focusedIndex = 1; // Remembers SAVED PLACES
        navigateTo('navigationScreen', 'navMenuView');
      }
      return;
    }
    if (gesture === 'swipeRight') {
      if (state.focusedIndex < places.length - 1) {
        state.focusedIndex++;
        renderNavigationResults();
      } else {
        const item = places[state.focusedIndex];
        announceListBoundary('last', item ? item.name : 'Place', places.length);
      }
    } else if (gesture === 'swipeLeft') {
      if (state.focusedIndex > 0) {
        state.focusedIndex--;
        renderNavigationResults();
      } else {
        const item = places[state.focusedIndex];
        announceListBoundary('first', item ? item.name : 'Place', places.length);
      }
    } else if (gesture === 'doubleTap') {
      if (state.quickActionSelection) {
        const place = places[state.focusedIndex];
        const newId = `custom_${Date.now()}`;
        const newAction = {
          id: newId,
          name: `Navigate ${place.name}`,
          icon: 'fa-location-dot',
          type: 'navigation',
          targetId: place.id
        };
        if (!state.db.settings.quickAccessCustom) state.db.settings.quickAccessCustom = [];
        state.db.settings.quickAccessCustom.push(newAction);
        if (!state.db.settings.quickAccess) state.db.settings.quickAccess = [];
        if (!state.db.settings.quickAccess.includes(newId)) {
          state.db.settings.quickAccess.push(newId);
        }
        saveDb();
        state.quickActionSelection = null;
        Haptic.trigger('success');
        Speech.speak(`Quick Action created for ${place.name}`);
        state.focusedIndex = 0;
        navigateTo('settingsScreen', 'quickAccessSettingsView');
        renderQuickAccessSettings();
        return;
      }
      selectedSavedPlace = places[state.focusedIndex];
      state.focusedIndex = 0;
      navigateTo('navigationScreen', 'navActionsView');
    } else if (gesture === 'longPress') {
      if (state.quickActionSelection) {
        state.quickActionSelection = null;
        Haptic.trigger('long');
        Speech.speak("Selection canceled. Returned to Quick Access");
        navigateTo('settingsScreen', 'quickAccessSettingsView');
        renderQuickAccessSettings();
        return;
      }
      Haptic.trigger('long');
      Speech.speak("Returned to Navigation Menu");
      state.focusedIndex = 1; // Remembers SAVED PLACES
      navigateTo('navigationScreen', 'navMenuView');
    }
  }
  else if (state.currentSubScreen === 'navActionsView') {
    const total = state.focusedItems.length || 3;
    if (gesture === 'swipeRight') {
      if (state.focusedIndex < total - 1) {
        state.focusedIndex++;
        if (selectedSavedPlace) renderSavedPlaceActions();
        else renderNavigationActions();
      } else {
        const item = state.focusedItems[state.focusedIndex];
        announceListBoundary('last', item ? item.name : 'Action', total);
      }
    } else if (gesture === 'swipeLeft') {
      if (state.focusedIndex > 0) {
        state.focusedIndex--;
        if (selectedSavedPlace) renderSavedPlaceActions();
        else renderNavigationActions();
      } else {
        const item = state.focusedItems[state.focusedIndex];
        announceListBoundary('first', item ? item.name : 'Action', total);
      }
    } else if (gesture === 'doubleTap') {
      const current = state.focusedItems[state.focusedIndex];
      if (current && typeof current.action === 'function') {
        current.action();
      }
    } else if (gesture === 'longPress') {
      Haptic.trigger('long');
      if (selectedSavedPlace) {
        Speech.speak("Returned to Saved Places");
        navigateTo('navigationScreen', 'navResultsView');
      } else {
        Speech.speak("Returned to Navigation Menu");
        navigateTo('navigationScreen', 'navMenuView');
      }
    }
  }
  else if (state.currentSubScreen === 'navActiveRoutingView') {
    if (gesture === 'longPress') {
      if (routingSimulationTimer) {
        clearInterval(routingSimulationTimer);
        routingSimulationTimer = null;
      }
      Haptic.trigger('long');
      Speech.speak("Navigation canceled. Returned to Navigation Menu");
      navigateTo('navigationScreen', 'navMenuView');
    } else if (gesture === 'doubleTap' || gesture === 'singleTap' || gesture === 'tap') {
      const instruction = document.getElementById('routingInstruction')?.innerText || 'Go straight for 200 meters';
      Speech.speak(instruction);
    }
  }
}

let routingSimulationTimer = null;

function startNavigationRoutingSimulation() {
  const instructionEl = document.getElementById('routingInstruction');
  if (instructionEl) instructionEl.innerText = "Go straight for 200m";
  Speech.speak("Turn-by-turn navigation started. Go straight for 200 meters. Long press to cancel navigation.");

  if (routingSimulationTimer) clearInterval(routingSimulationTimer);
  let step = 0;
  const steps = [
    "In 50 meters, turn right on October 11th Street",
    "Turn right now onto October 11th Street",
    "Destination Eurofarm Pharmacy is on your left in 30 meters",
    "You have arrived at Eurofarm Pharmacy"
  ];

  routingSimulationTimer = setInterval(() => {
    if (state.currentSubScreen !== 'navActiveRoutingView') {
      clearInterval(routingSimulationTimer);
      return;
    }
    if (step < steps.length) {
      if (instructionEl) instructionEl.innerText = steps[step];
      Speech.speak(steps[step]);
      Haptic.trigger('short');
      step++;
    } else {
      clearInterval(routingSimulationTimer);
    }
  }, 7000);
}

// ==========================================
// 9. SETTINGS MODULE
// ==========================================

function renderSettingsMenu() {
  const items = [
    { id: 'access', name: 'ACCESSIBILITY', icon: 'fa-universal-access', hint: '[ Double Tap: Open Accessibility Settings ]' },
    { id: 'quick', name: 'QUICK ACCESS', icon: 'fa-bolt', hint: '[ Double Tap: Configure Shortcuts ]' },
    { id: 'emerg', name: 'EMERGENCY CONTACTS', icon: 'fa-triangle-exclamation', hint: '[ Double Tap: Emergency Settings ]' },
    { id: 'tutorial', name: 'RESTART TUTORIAL', icon: 'fa-graduation-cap', hint: '[ Double Tap: Start Onboarding ]' }
  ];
  state.focusedItems = items;
  if (state.focusedIndex >= items.length) state.focusedIndex = 0;

  const current = items[state.focusedIndex] || items[0];
  const container = document.getElementById('settingsMenuContainer');
  const total = items.length;

  if (container) {
    container.innerHTML = `
      <div class="hero-card" style="width: calc(100% - 32px); flex: 1; max-height: calc(100% - 24px); border: 3px solid #FFCC00; border-radius: 20px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 22px 18px; background: #000000; overflow: hidden;">
        <div class="card-header-line" style="display: flex; justify-content: flex-start; width: 100%;">
          <span class="card-counter-badge" style="color: #FFFFFF; font-weight: bold; font-size: 1rem;">[ ${state.focusedIndex + 1} / ${total} ]</span>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; margin: auto 0; text-align: center; width: 100%;">
          <div class="hero-icon-circle" style="width: 80px; height: 80px; min-width: 80px; min-height: 80px; border-radius: 50%; border: 3px solid #FFCC00; display: flex; align-items: center; justify-content: center; aspect-ratio: 1 / 1; margin: 0 auto; background: rgba(255, 204, 0, 0.05);">
            <i class="fa-solid ${current.icon}" style="font-size: 2.2rem; color: #FFCC00; line-height: 1; margin: 0; padding: 0;"></i>
          </div>
          <h2 style="color: #FFCC00; font-size: 1.7rem; margin: 0 auto; font-weight: 800; text-transform: uppercase; text-align: center; line-height: 1.1; width: 100%; word-break: break-word;">${current.name}</h2>
        </div>
        <div style="border-top: 1px dashed #444; width: 100%; padding-top: 10px; text-align: center; flex-shrink: 0;">
          <span style="color: #FFCC00; font-size: 0.8rem; font-weight: bold;">${current.hint}</span>
        </div>
      </div>
      <div class="carousel-dots" style="display: flex; gap: 8px; margin-top: 8px; flex-shrink: 0;">
        ${items.map((_, idx) => `
          <span style="width: ${idx === state.focusedIndex ? '24px' : '8px'}; height: 8px; background: ${idx === state.focusedIndex ? '#FFCC00' : '#666666'}; border-radius: ${idx === state.focusedIndex ? '4px' : '50%'};"></span>
        `).join('')}
      </div>
    `;
  }

  Speech.speak(items[state.focusedIndex].name);
}

function renderAccessibilitySettings() {
  let curRead = (state.db.settings.readingMode || 'combined').toUpperCase();
  if (curRead === 'VOICE') curRead = 'TTS ONLY';
  let curPriv = (state.db.settings.privacyMode || 'auto').toUpperCase();
  let curVibe = (state.db.settings.vibeIntensity || 'high').toUpperCase();

  const items = [
    {
      id: 'readingMode',
      name: 'READING MODE',
      icon: 'fa-volume-high',
      options: ['COMBINED', 'TTS ONLY', 'MORSE'],
      value: curRead,
      subtitle: 'Options: COMBINED • TTS ONLY • MORSE',
      hint: '[ Double Tap: Change Value • Swipe: Next Setting ]'
    },
    {
      id: 'privacyMode',
      name: 'PRIVACY MODE',
      icon: 'fa-user-shield',
      options: ['AUTO', 'ALWAYS ON', 'OFF'],
      value: curPriv,
      subtitle: 'Options: AUTO • ALWAYS ON • OFF',
      hint: '[ Double Tap: Toggle Mode • Swipe: Next Setting ]'
    },
    {
      id: 'vibeIntensity',
      name: 'VIBRATION INTENSITY',
      icon: 'fa-wave-square',
      options: ['LOW', 'MEDIUM', 'HIGH'],
      value: curVibe,
      subtitle: 'Options: LOW • MEDIUM • HIGH',
      hint: '[ Double Tap: Adjust Intensity • Swipe: Previous ]'
    }
  ];

  state.focusedItems = items;
  if (state.focusedIndex >= items.length) state.focusedIndex = 0;
  updateAccessibilitySettingsUI();
}

function updateAccessibilitySettingsUI(suppressSpeech = false) {
  const container = document.getElementById('accessibilityConfigContainer');
  if (!container) return;

  const current = state.focusedItems[state.focusedIndex] || state.focusedItems[0];
  const total = state.focusedItems.length;

  container.innerHTML = `
    <div class="hero-card" style="width: calc(100% - 32px); flex: 1; max-height: calc(100% - 24px); border: 3px solid #FFCC00; border-radius: 20px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 22px 18px; background: #000000; overflow: hidden;">
      <div class="card-header" style="width: 100%; display: flex; justify-content: flex-start; align-items: center; gap: 12px; flex-shrink: 0;">
        <span class="card-header-counter" style="color: #FFFFFF; font-weight: bold; font-size: 1rem; white-space: nowrap; flex-shrink: 0;">[ ${state.focusedIndex + 1} / ${total} ]</span>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 14px; margin: auto 0;">
        <div class="hero-icon-circle" style="width: 80px; height: 80px; min-width: 80px; min-height: 80px; border-radius: 50%; border: 3px solid #FFCC00; display: flex; align-items: center; justify-content: center; aspect-ratio: 1 / 1; margin: 0 auto; background: rgba(255, 204, 0, 0.05);">
          <i class="fa-solid ${current.icon}" style="font-size: 2.2rem; color: #FFCC00; line-height: 1; margin: 0; padding: 0;"></i>
        </div>
        <h2 style="color: #FFCC00; font-size: 1.7rem; margin: 0; font-weight: 800; text-transform: uppercase; text-align: center; line-height: 1.1;">${current.name}</h2>
        <div style="background: rgba(255, 204, 0, 0.15); border: 2px solid #FFCC00; border-radius: 25px; padding: 6px 20px; color: #FFCC00; font-weight: 800; font-size: 1.15rem; text-align: center;">[ ${current.value} ]</div>
        <p style="color: #FFFFFF; font-size: 0.9rem; text-align: center; margin: 0; opacity: 0.9;">${current.subtitle}</p>
      </div>
      <div style="border-top: 1px dashed #444; width: 100%; padding-top: 10px; text-align: center; flex-shrink: 0;">
        <span style="color: #FFCC00; font-size: 0.8rem; font-weight: bold;">${current.hint}</span>
      </div>
    </div>
    <div class="carousel-dots" style="display: flex; gap: 8px; margin-top: 8px; flex-shrink: 0;">
      ${state.focusedItems.map((_, idx) => `
        <span style="width: ${idx === state.focusedIndex ? '24px' : '8px'}; height: 8px; background: ${idx === state.focusedIndex ? '#FFCC00' : '#666666'}; border-radius: ${idx === state.focusedIndex ? '4px' : '50%'};"></span>
      `).join('')}
    </div>
  `;

  if (!suppressSpeech) {
    Speech.speak(`${current.name}: ${current.value}`);
  }
}

function renderQuickAccessSettings() {
  if (!state.db.settings.quickAccessCustom) state.db.settings.quickAccessCustom = [];
  if (!state.db.settings.quickAccessDeletedBuiltIns) state.db.settings.quickAccessDeletedBuiltIns = [];

  const allBuiltIn = [
    { id: 'call_mother', name: 'Quick Call Mother', icon: 'fa-phone' },
    { id: 'nav_home', name: 'Quick Navigate Home', icon: 'fa-location-arrow' },
    { id: 'sos_trigger', name: 'Quick SOS Activation', icon: 'fa-triangle-exclamation' }
  ];

  const builtIn = allBuiltIn.filter(item => !state.db.settings.quickAccessDeletedBuiltIns.includes(item.id));
  const custom = state.db.settings.quickAccessCustom || [];

  const items = [...builtIn, ...custom];
  state.focusedItems = items;

  if (state.focusedIndex >= items.length) {
    state.focusedIndex = Math.max(0, items.length - 1);
  }

  updateQuickAccessUI();
}

function deleteQuickActionCard(cardItem) {
  const actionName = cardItem.name;

  if (!state.db.settings.quickAccessDeletedBuiltIns) state.db.settings.quickAccessDeletedBuiltIns = [];
  if (state.db.settings.quickAccessCustom) {
    state.db.settings.quickAccessCustom = state.db.settings.quickAccessCustom.filter(item => item.id !== cardItem.id);
  }

  if (['call_mother', 'nav_home', 'sos_trigger'].includes(cardItem.id)) {
    state.db.settings.quickAccessDeletedBuiltIns.push(cardItem.id);
  }

  state.db.settings.quickAccess = (state.db.settings.quickAccess || []).filter(id => id !== cardItem.id);
  saveDb();

  Haptic.trigger('error');
  Speech.speak(`${actionName} deleted.`);
  renderQuickAccessSettings();
}

function updateQuickAccessUI() {
  const container = document.getElementById('quickAccessConfigContainer');
  if (!container) return;

  const total = state.focusedItems.length;

  if (total === 0) {
    container.innerHTML = `
      <div class="hero-card" style="width: calc(100% - 32px); flex: 1; max-height: calc(100% - 24px); border: 3px solid #FFCC00; border-radius: 20px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 22px 18px; background: #000000; overflow: hidden;">
        <div class="card-header" style="width: 100%; display: flex; justify-content: flex-start; align-items: center; gap: 12px; flex-shrink: 0;">
          <span class="card-header-counter" style="color: #FFFFFF; font-weight: bold; font-size: 1rem; white-space: nowrap; flex-shrink: 0;">[ 0 / 0 ]</span>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; gap: 14px; margin: auto 0;">
          <div class="hero-icon-circle" style="width: 80px; height: 80px; min-width: 80px; min-height: 80px; border-radius: 50%; border: 3px solid #FFCC00; display: flex; align-items: center; justify-content: center; aspect-ratio: 1 / 1; margin: 0 auto; background: rgba(255, 204, 0, 0.05);">
            <i class="fa-solid fa-plus" style="font-size: 2.2rem; color: #FFCC00; line-height: 1; margin: 0; padding: 0;"></i>
          </div>
          <h2 style="color: #FFCC00; font-size: 1.7rem; margin: 0; font-weight: 800; text-transform: uppercase; text-align: center; line-height: 1.1;">NO SHORTCUTS</h2>
          <p style="color: #FFFFFF; font-size: 0.95rem; text-align: center; margin: 0; opacity: 0.9;">Swipe Up to create a shortcut</p>
        </div>
        <div style="border-top: 1px dashed #444; width: 100%; padding-top: 10px; text-align: center; flex-shrink: 0;">
          <span style="color: #FFCC00; font-size: 0.8rem; font-weight: bold;">[ Two-Finger Swipe Down: Quick Access • Long Press: Back ]</span>
        </div>
      </div>
    `;
    Speech.speak("No shortcuts configured. Swipe Up to create one.");
    return;
  }

  const current = state.focusedItems[state.focusedIndex] || state.focusedItems[0];
  const isEnabled = state.db.settings.quickAccess.includes(current.id);
  container.innerHTML = `
    <div class="hero-card" style="width: calc(100% - 32px); flex: 1; max-height: calc(100% - 24px); border: 3px solid #FFCC00; border-radius: 20px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 22px 18px; background: #000000; overflow: hidden;">
      <div class="card-header" style="width: 100%; display: flex; justify-content: flex-start; align-items: center; gap: 12px; flex-shrink: 0;">
        <span class="card-header-counter" style="color: #FFFFFF; font-weight: bold; font-size: 1rem; white-space: nowrap; flex-shrink: 0;">[ ${state.focusedIndex + 1} / ${total} ]</span>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 14px; margin: auto 0;">
        <div class="hero-icon-circle" style="width: 80px; height: 80px; min-width: 80px; min-height: 80px; border-radius: 50%; border: 3px solid #FFCC00; display: flex; align-items: center; justify-content: center; aspect-ratio: 1 / 1; margin: 0 auto; background: rgba(255, 204, 0, 0.05);">
          <i class="fa-solid ${current.icon}" style="font-size: 2.2rem; color: #FFCC00; line-height: 1; margin: 0; padding: 0;"></i>
        </div>
        <h2 style="color: #FFCC00; font-size: 1.7rem; margin: 0; font-weight: 800; text-transform: uppercase; text-align: center; line-height: 1.1;">${current.name}</h2>
        <div style="background: rgba(255, 204, 0, 0.15); border: 2px solid #FFCC00; border-radius: 25px; padding: 6px 20px; color: #FFCC00; font-weight: 800; font-size: 1.15rem; text-align: center;">[ ${isEnabled ? 'ENABLED' : 'DISABLED'} ]</div>
      </div>
      <div style="border-top: 1px dashed #444; width: 100%; padding-top: 10px; text-align: center; flex-shrink: 0;">
        <span style="color: #FFCC00; font-size: 0.8rem; font-weight: bold;">[ Two-Finger Swipe Down: Quick Access • Long Press: Back ]</span>
      </div>
    </div>
    <div class="carousel-dots" style="display: flex; gap: 8px; margin-top: 8px; flex-shrink: 0;">
      ${state.focusedItems.map((_, idx) => `
        <span style="width: ${idx === state.focusedIndex ? '24px' : '8px'}; height: 8px; background: ${idx === state.focusedIndex ? '#FFCC00' : '#666666'}; border-radius: ${idx === state.focusedIndex ? '4px' : '50%'};"></span>
      `).join('')}
    </div>
  `;
  Speech.speak(`${current.name}. ${isEnabled ? 'Enabled' : 'Disabled'}`);
}

function renderQuickActionTypes() {
  const items = [
    {
      id: 'call',
      name: 'CALL CONTACT',
      icon: 'fa-phone',
      subtitle: 'Create shortcut to call a contact',
      hint: '[ Double Tap: Select Contact • Swipe: Next ]',
      action: () => {
        state.quickActionSelection = { type: 'call' };
        Speech.speak('Select contact to call');
        navigateTo('callsScreen', 'contactsView');
      }
    },
    {
      id: 'message',
      name: 'MESSAGE CONTACT',
      icon: 'fa-comment-dots',
      subtitle: 'Create shortcut to send message',
      hint: '[ Double Tap: Select Contact • Swipe: Next ]',
      action: () => {
        state.quickActionSelection = { type: 'message' };
        Speech.speak('Select contact to message');
        navigateTo('callsScreen', 'contactsView');
      }
    },
    {
      id: 'navigation',
      name: 'NAVIGATE TO LOCATION',
      icon: 'fa-location-dot',
      subtitle: 'Create shortcut to navigate to place',
      hint: '[ Double Tap: Select Place • Swipe: Previous ]',
      action: () => {
        state.quickActionSelection = { type: 'navigation' };
        Speech.speak('Select saved place to navigate');
        navigateTo('navigationScreen', 'navResultsView');
      }
    }
  ];

  state.focusedItems = items;
  if (state.focusedIndex >= items.length) state.focusedIndex = 0;
  updateQuickActionTypesUI();
}

function updateQuickActionTypesUI(suppressSpeech = false) {
  const container = document.getElementById('quickActionTypeContainer');
  if (!container) return;

  const current = state.focusedItems[state.focusedIndex] || state.focusedItems[0];
  const total = state.focusedItems.length;

  container.innerHTML = `
    <div class="hero-card" style="width: calc(100% - 32px); flex: 1; max-height: calc(100% - 24px); border: 3px solid #FFCC00; border-radius: 20px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 22px 18px; background: #000000; overflow: hidden;">
      <div class="card-header" style="width: 100%; display: flex; justify-content: flex-start; align-items: center; gap: 12px; flex-shrink: 0;">
        <span class="card-header-counter" style="color: #FFFFFF; font-weight: bold; font-size: 1rem; white-space: nowrap; flex-shrink: 0;">[ ${state.focusedIndex + 1} / ${total} ]</span>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 14px; margin: auto 0;">
        <div class="hero-icon-circle" style="width: 80px; height: 80px; min-width: 80px; min-height: 80px; border-radius: 50%; border: 3px solid #FFCC00; display: flex; align-items: center; justify-content: center; aspect-ratio: 1 / 1; margin: 0 auto; background: rgba(255, 204, 0, 0.05);">
          <i class="fa-solid ${current.icon}" style="font-size: 2.2rem; color: #FFCC00; line-height: 1; margin: 0; padding: 0;"></i>
        </div>
        <h2 style="color: #FFCC00; font-size: 1.7rem; margin: 0; font-weight: 800; text-transform: uppercase; text-align: center; line-height: 1.1;">${current.name}</h2>
        
      </div>
      <div style="border-top: 1px dashed #444; width: 100%; padding-top: 10px; text-align: center; flex-shrink: 0;">
        <span style="color: #FFCC00; font-size: 0.8rem; font-weight: bold;">${current.hint}</span>
      </div>
    </div>
    <div class="carousel-dots" style="display: flex; gap: 8px; margin-top: 8px; flex-shrink: 0;">
      ${state.focusedItems.map((_, idx) => `
        <span style="width: ${idx === state.focusedIndex ? '24px' : '8px'}; height: 8px; background: ${idx === state.focusedIndex ? '#FFCC00' : '#666666'}; border-radius: ${idx === state.focusedIndex ? '4px' : '50%'};"></span>
      `).join('')}
    </div>
  `;

  if (!suppressSpeech) {
    Speech.speak(`${current.name}`);
  }
}

function handleSettingsGesture(gesture) {
  if (state.currentSubScreen === 'settingsMenuView') {
    if (gesture === 'swipeRight') {
      if (state.focusedIndex < state.focusedItems.length - 1) {
        state.focusedIndex++;
        renderSettingsMenu();
      } else {
        const item = state.focusedItems[state.focusedIndex];
        announceListBoundary('last', item ? item.name : 'Setting', state.focusedItems.length);
      }
    } else if (gesture === 'swipeLeft') {
      if (state.focusedIndex > 0) {
        state.focusedIndex--;
        renderSettingsMenu();
      } else {
        const item = state.focusedItems[state.focusedIndex];
        announceListBoundary('first', item ? item.name : 'Setting', state.focusedItems.length);
      }
    } else if (gesture === 'doubleTap') {
      Haptic.trigger('success');
      if (state.focusedIndex === 0) {
        state.focusedIndex = 0;
        navigateTo('settingsScreen', 'accessibilitySettingsView');
        renderAccessibilitySettings();
      } else if (state.focusedIndex === 1) {
        state.focusedIndex = 0;
        navigateTo('settingsScreen', 'quickAccessSettingsView');
        renderQuickAccessSettings();
      } else if (state.focusedIndex === 2) {
        state.focusedIndex = 0;
        navigateTo('settingsScreen', 'emergencySettingsView');
        renderEmergencySettings();
      } else if (state.focusedIndex === 3) {
        // RESTART TUTORIAL FIX
        if (!state.db) state.db = {};
        state.db.tutorialCompleted = false;
        state.db.letterProfiles = {};
        localStorage.removeItem('blindEye_tutorialCompleted');
        saveDb();

        Speech.speak('Restarting handwriting tutorial and gesture calibration.');
        startTutorial();
      }
    } else if (gesture === 'longPress') {
      Speech.speak('Returned to Main Menu');
      navigateTo('mainMenuScreen');
    }
  }
  else if (state.currentSubScreen === 'accessibilitySettingsView' || state.currentSubScreen === 'accessibilityView') {
    if (gesture === 'swipeRight') {
      if (state.focusedIndex < state.focusedItems.length - 1) {
        state.focusedIndex++;
        updateAccessibilitySettingsUI();
      } else {
        const item = state.focusedItems[state.focusedIndex];
        announceListBoundary('last', item ? item.name : 'Accessibility Setting', state.focusedItems.length);
      }
    } else if (gesture === 'swipeLeft') {
      if (state.focusedIndex > 0) {
        state.focusedIndex--;
        updateAccessibilitySettingsUI();
      } else {
        const item = state.focusedItems[state.focusedIndex];
        announceListBoundary('first', item ? item.name : 'Accessibility Setting', state.focusedItems.length);
      }
    } else if (gesture === 'doubleTap') {
      const current = state.focusedItems[state.focusedIndex];
      const curIdx = current.options.indexOf(current.value);
      const nextValue = current.options[(curIdx + 1) % current.options.length];
      current.value = nextValue;

      if (current.id === 'readingMode') state.db.settings.readingMode = nextValue.toLowerCase();
      else if (current.id === 'privacyMode') state.db.settings.privacyMode = nextValue.toLowerCase();
      else if (current.id === 'vibeIntensity') state.db.settings.vibeIntensity = nextValue.toLowerCase();
      saveDb();

      Haptic.trigger('success');
      updateAccessibilitySettingsUI();
    } else if (gesture === 'longPress') {
      Haptic.trigger('long');
      Speech.speak('Returned to Settings Menu');
      state.focusedIndex = 0; // Remembers ACCESSIBILITY
      navigateTo('settingsScreen', 'settingsMenuView');
    }
  }
  else if (state.currentSubScreen === 'quickAccessSettingsView') {
    if (gesture === 'swipeUp') {
      Haptic.trigger('success');
      Speech.speak('Opening action type menu.');
      state.focusedIndex = 0;
      navigateTo('settingsScreen', 'quickActionTypeView');
      renderQuickActionTypes();
    } else if (gesture === 'swipeRight') {
      if (state.focusedItems.length > 0 && state.focusedIndex < state.focusedItems.length - 1) {
        state.focusedIndex++;
        updateQuickAccessUI();
      } else if (state.focusedItems.length > 0) {
        const item = state.focusedItems[state.focusedIndex];
        announceListBoundary('last', item ? item.name : 'Quick Access', state.focusedItems.length);
      }
    } else if (gesture === 'swipeLeft') {
      if (state.focusedItems.length > 0 && state.focusedIndex > 0) {
        state.focusedIndex--;
        updateQuickAccessUI();
      } else if (state.focusedItems.length > 0) {
        const item = state.focusedItems[state.focusedIndex];
        announceListBoundary('first', item ? item.name : 'Quick Access', state.focusedItems.length);
      }
    } else if (gesture === 'doubleTap') {
      if (state.focusedItems.length > 0) {
        const current = state.focusedItems[state.focusedIndex];
        Haptic.trigger('success');
        let isNowEnabled = false;
        if (state.db.settings.quickAccess.includes(current.id)) {
          state.db.settings.quickAccess = state.db.settings.quickAccess.filter(id => id !== current.id);
          isNowEnabled = false;
        } else {
          state.db.settings.quickAccess.push(current.id);
          isNowEnabled = true;
        }
        saveDb();
        Speech.speak(`${current.name} ${isNowEnabled ? 'Enabled' : 'Disabled'}`);
        updateQuickAccessUI();
      } else {
        Haptic.trigger('error');
      }
    } else if (gesture === 'tripleTap') {
      if (state.focusedItems.length > 0) {
        const current = state.focusedItems[state.focusedIndex];
        deleteQuickActionCard(current);
      } else {
        Haptic.trigger('error');
      }
    } else if (gesture === 'longPress') {
      Haptic.trigger('long');
      Speech.speak('Returned to Settings Menu');
      state.focusedIndex = 1; // Remembers QUICK ACCESS
      navigateTo('settingsScreen', 'settingsMenuView');
    }
  }
  else if (state.currentSubScreen === 'quickActionTypeView') {
    if (gesture === 'swipeRight') {
      if (state.focusedIndex < state.focusedItems.length - 1) {
        state.focusedIndex++;
        updateQuickActionTypesUI();
      } else {
        const item = state.focusedItems[state.focusedIndex];
        announceListBoundary('last', item ? item.name : 'Action Type', state.focusedItems.length);
      }
    } else if (gesture === 'swipeLeft') {
      if (state.focusedIndex > 0) {
        state.focusedIndex--;
        updateQuickActionTypesUI();
      } else {
        const item = state.focusedItems[state.focusedIndex];
        announceListBoundary('first', item ? item.name : 'Action Type', state.focusedItems.length);
      }
    } else if (gesture === 'doubleTap') {
      const current = state.focusedItems[state.focusedIndex];
      if (current && current.action) {
        Haptic.trigger('success');
        current.action();
      }
    } else if (gesture === 'longPress') {
      state.quickActionSelection = null;
      Haptic.trigger('long');
      Speech.speak('Selection canceled. Returned to Quick Access');
      navigateTo('settingsScreen', 'quickAccessSettingsView');
      renderQuickAccessSettings();
    }
  }
  else if (state.currentSubScreen === 'emergencySettingsView') {
    const total = state.focusedItems.length;
    if (gesture === 'swipeRight') {
      if (total > 0 && state.focusedIndex < total - 1) {
        state.focusedIndex++;
        renderEmergencySettings();
      } else if (total > 0) {
        const item = state.focusedItems[state.focusedIndex];
        announceListBoundary('last', item ? item.name : 'Emergency Contact', total);
      }
    } else if (gesture === 'swipeLeft') {
      if (total > 0 && state.focusedIndex > 0) {
        state.focusedIndex--;
        renderEmergencySettings();
      } else if (total > 0) {
        const item = state.focusedItems[state.focusedIndex];
        announceListBoundary('first', item ? item.name : 'Emergency Contact', total);
      }
    } else if (gesture === 'doubleTap') {
      if (total > 0) {
        const contact = state.focusedItems[state.focusedIndex];
        triggerBiometricAuth('Remove Emergency Contact', `Authenticate to remove ${contact.name} from emergency contacts`, () => {
          contact.emergency = false;
          saveDb();
          Haptic.trigger('success');
          Speech.speak(`${contact.name} removed from emergency contacts`);
          state.focusedIndex = 0;
          renderEmergencySettings();
        });
      }
    } else if (gesture === 'longPress') {
      Haptic.trigger('long');
      Speech.speak('Returned to Settings Menu');
      state.focusedIndex = 2; // Remembers EMERGENCY CONTACTS
      navigateTo('settingsScreen', 'settingsMenuView');
    }
  }
}

function renderEmergencySettings() {
  const container = document.getElementById('emergencySettingsContainer');
  if (!container) return;

  // Ensure state.db and contacts exist
  const allContacts = (state.db && state.db.contacts) ? state.db.contacts : [];
  const emergencyContacts = allContacts.filter(c => c.emergency);
  state.focusedItems = emergencyContacts;

  const total = emergencyContacts.length;

  if (total === 0) {
    container.innerHTML = `
      <div class="hero-card" style="width: calc(100% - 32px); flex: 1; max-height: calc(100% - 24px); border: 3px solid #FFCC00; border-radius: 20px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 22px 18px; background: #000000; overflow: hidden;">
        <div class="card-header" style="width: 100%; display: flex; justify-content: flex-start; align-items: center; gap: 12px; flex-shrink: 0;">
          <span class="card-header-counter" style="color: #FFFFFF; font-weight: bold; font-size: 1rem; white-space: nowrap; flex-shrink: 0;">[ 0 / 0 ]</span>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; gap: 14px; margin: auto 0; text-align: center; width: 100%;">
          <div class="hero-icon-circle" style="width: 80px; height: 80px; min-width: 80px; min-height: 80px; border-radius: 50%; border: 3px solid #FFCC00; display: flex; align-items: center; justify-content: center; aspect-ratio: 1 / 1; margin: 0 auto; background: rgba(255, 204, 0, 0.05);">
            <i class="fa-solid fa-triangle-exclamation" style="font-size: 2.2rem; color: #FFCC00; line-height: 1; margin: 0; padding: 0;"></i>
          </div>
          <h2 style="color: #FFCC00; font-size: 1.7rem; margin: 0; font-weight: 800; text-transform: uppercase; text-align: center; line-height: 1.1;">NO CONTACTS</h2>
          <p style="color: #FFFFFF; font-size: 0.95rem; text-align: center; margin: 0; opacity: 0.9;">Assign emergency contacts in the Phone module.</p>
        </div>
        <div style="border-top: 1px dashed #444; width: 100%; padding-top: 10px; text-align: center; flex-shrink: 0;">
          <span style="color: #FFCC00; font-size: 0.8rem; font-weight: bold;">[ Long Press: Back ]</span>
        </div>
      </div>
    `;
    Speech.speak("No emergency contacts configured.");
    return;
  }

  if (state.focusedIndex >= total) state.focusedIndex = 0;
  const current = emergencyContacts[state.focusedIndex];

  container.innerHTML = `
    <div class="hero-card" style="width: calc(100% - 32px); flex: 1; max-height: calc(100% - 24px); border: 3px solid #FFCC00; border-radius: 20px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 22px 18px; background: #000000; overflow: hidden;">
      <div class="card-header" style="width: 100%; display: flex; justify-content: flex-start; align-items: center; gap: 12px; flex-shrink: 0;">
        <span class="card-header-counter" style="color: #FFFFFF; font-weight: bold; font-size: 1rem; white-space: nowrap; flex-shrink: 0;">[ ${state.focusedIndex + 1} / ${total} ]</span>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 14px; margin: auto 0; text-align: center; width: 100%;">
        <div class="hero-icon-circle" style="width: 80px; height: 80px; min-width: 80px; min-height: 80px; border-radius: 50%; border: 3px solid #FFCC00; display: flex; align-items: center; justify-content: center; aspect-ratio: 1 / 1; margin: 0 auto; background: rgba(255, 204, 0, 0.05);">
          <i class="fa-solid fa-user" style="font-size: 2.2rem; color: #FFCC00; line-height: 1; margin: 0; padding: 0;"></i>
        </div>
        <h2 style="color: #FFCC00; font-size: 1.7rem; margin: 0; font-weight: 800; text-transform: uppercase; text-align: center; line-height: 1.1;">${current.name}</h2>
        <p style="color: #FFFFFF; font-size: 1.1rem; text-align: center; margin: 0; font-family: monospace;">${current.phone}</p>
      </div>
      <div style="border-top: 1px dashed #444; width: 100%; padding-top: 10px; text-align: center; flex-shrink: 0;">
        <span style="color: #FFCC00; font-size: 0.8rem; font-weight: bold;">[ Double Tap: Remove Emergency Status • Long Press: Back ]</span>
      </div>
    </div>
    <div class="carousel-dots" style="display: flex; gap: 8px; margin-top: 8px; flex-shrink: 0;">
      ${emergencyContacts.map((_, idx) => `
        <span style="width: ${idx === state.focusedIndex ? '24px' : '8px'}; height: 8px; background: ${idx === state.focusedIndex ? '#FFCC00' : '#666666'}; border-radius: ${idx === state.focusedIndex ? '4px' : '50%'};"></span>
      `).join('')}
    </div>
  `;

  Speech.speak(`${current.name}. Emergency Contact.`);
}

// ==========================================
// 10. SOS EMERGENCY SYSTEM
// ==========================================

function triggerSOS() {
  if (state.currentScreen === 'sosScreen' && !state.sosIsDispatched) return;

  Speech.stop();
  navigateTo('sosScreen');

  state.sosCountdownValue = 3;
  state.sosIsDispatched = false;

  const countdownContainer = document.getElementById('sosCountdownContainer');
  if (countdownContainer) countdownContainer.style.display = 'flex';

  const dispatchedBox = document.getElementById('sosDispatchedInfo');
  if (dispatchedBox) {
    dispatchedBox.classList.remove('active');
    dispatchedBox.style.display = 'none';
  }

  const countBox = document.getElementById('sosCountdownBox');
  if (countBox) {
    countBox.innerText = '3';
    countBox.style.display = 'block';
  }

  // Concise announcement so speech is not truncated by the 1-second interval
  Speech.speak('S O S Active. 3');
  Haptic.trigger('error');

  if (state.sosCountdownTimer) clearInterval(state.sosCountdownTimer);

  state.sosCountdownTimer = setInterval(() => {
    state.sosCountdownValue--;

    if (state.sosCountdownValue > 0) {
      if (countBox) countBox.innerText = state.sosCountdownValue;
      Speech.speak(String(state.sosCountdownValue));
      Haptic.trigger('short');
    } else {
      clearInterval(state.sosCountdownTimer);
      dispatchSOSAlerts();
    }
  }, 1000);
}

function cancelSOS() {
  if (state.sosCountdownTimer) clearInterval(state.sosCountdownTimer);

  // Reset cooldown so shake cannot immediately re-trigger after cancel
  // (the devicemotion listener reads state._sosCooldownUntil)
  state._sosCooldownUntil = Date.now() + 10000;

  try {
    const siren = document.getElementById('soundSiren');
    if (siren) siren.pause();
  } catch (e) { }

  Haptic.trigger('long');
  Speech.speak('S O S cancelled. Returning to main menu.');
  logSystem('SOS emergency bypass active. SOS alerts terminated.', 'error');
  navigateTo('mainMenuScreen');
}


function dispatchSOSAlerts() {
  state.sosIsDispatched = true;

  const countdownContainer = document.getElementById('sosCountdownContainer');
  if (countdownContainer) countdownContainer.style.display = 'none';

  const dispatchedBox = document.getElementById('sosDispatchedInfo');
  if (dispatchedBox) {
    dispatchedBox.classList.add('active');
    dispatchedBox.style.display = 'flex';
  }

  const emergencyContact = (state.db && state.db.contacts)
    ? state.db.contacts.find(c => c.emergency) || state.db.contacts[0]
    : { name: 'Mother', phone: '+389 70 123 456' };

  const contactDisplay = document.getElementById('sosEmergencyContactDisplay');
  if (contactDisplay) {
    contactDisplay.innerText = `${emergencyContact.name} (${emergencyContact.phone})`;
  }

  Speech.speak('S O S Alert dispatched. Displaying emergency statement.');
}

// ==========================================
// 11. BIOMETRIC AUTHENTICATION & QUICK ACCESS OVERLAY
// ==========================================

let onBioSuccessCallback = null;

function triggerBiometricAuth(title, text, onSuccessCallback) {
  onBioSuccessCallback = onSuccessCallback;

  const overlay = document.getElementById('biometricOverlay');
  if (overlay) {
    overlay.style.display = 'block';
    overlay.classList.add('active');
  }

  const screen = document.getElementById('phoneScreen');
  if (screen) {
    screen.classList.add('auth-required');
  }

  // Non-visual voice guidance
  Speech.speak("Authentication required. Place your finger anywhere on the screen.");

  // Bind full-screen touch listener
  if (overlay) {
    overlay.onclick = (e) => {
      e.stopPropagation();
      handleBiometricSuccess();
    };
  }
}

function handleBiometricSuccess() {
  const overlay = document.getElementById('biometricOverlay');
  const screen = document.getElementById('phoneScreen');

  // Trigger visual green transition
  if (overlay) {
    overlay.classList.add('success');
  }
  if (screen) {
    screen.classList.add('auth-success');
  }

  // Play success sound chime (connected tone) & double vibration feedback
  Haptic.playSound('connected');
  Haptic.trigger('success');

  Speech.speak("Authentication successful.");
  logSystem("Biometric authentication succeeded.", "system");

  // Keep green border visible for 800ms before removing overlay
  setTimeout(() => {
    if (overlay) {
      overlay.style.display = 'none';
      overlay.classList.remove('active', 'success');
      overlay.onclick = null;
    }

    if (screen) {
      screen.classList.remove('auth-required', 'auth-success');
    }

    if (onBioSuccessCallback) {
      const cb = onBioSuccessCallback;
      onBioSuccessCallback = null;
      cb();
    }
  }, 800);
}

function handleBiometricFail() {
  // 2 Pulses for Failure
  Haptic.trigger('error'); // Trigger 2 short vibrations
  Speech.speak("Authentication failed. Try again.");
  logSystem("Biometric authentication failed.", "error");
}

// NOTE: The full toggleQuickAccess() and handleQuickAccessNavigation() implementations
// are defined in section 12 below. These stubs have been removed to avoid confusion.

// ==========================================
// 12. RUN INITIALIZATIONS & SPATIAL SLIDER
// ==========================================

// Spatial touch navigation for Vibration Intensity card
const navAreaEl = document.getElementById('navigationArea') || document.querySelector('.fixed-navigation-area');
if (navAreaEl) {
  let isDraggingNav = false;

  const handleSpatialInput = (e) => {
    if (state.currentSubScreen !== 'accessibilitySettingsView' && state.currentSubScreen !== 'accessibilityView') return;
    if (state.focusedIndex !== 2) return;

    if (e.cancelable) e.preventDefault();
    e.stopPropagation();

    const rect = navAreaEl.getBoundingClientRect();
    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    if (clientX === undefined) return;

    const relativeX = clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, relativeX / rect.width));

    let newLevel = 'MEDIUM';
    if (ratio <= 0.33) newLevel = 'LOW';
    else if (ratio <= 0.66) newLevel = 'MEDIUM';
    else newLevel = 'HIGH';

    const current = state.focusedItems && state.focusedItems[2];
    if (current) {
      const isChanged = current.value !== newLevel;
      current.value = newLevel;
      state.db.settings.vibeIntensity = newLevel.toLowerCase();
      saveDb();

      if (newLevel === 'LOW') Haptic.trigger('short');
      else if (newLevel === 'MEDIUM') Haptic.trigger('success');
      else if (newLevel === 'HIGH') Haptic.trigger('long');

      updateAccessibilitySettingsUI(true);

      if (isChanged || e.type === 'click' || e.type === 'touchstart') {
        Speech.speak(`${newLevel.charAt(0) + newLevel.slice(1).toLowerCase()} intensity`);
      }
    }
  };

  navAreaEl.addEventListener('mousedown', (e) => {
    if ((state.currentSubScreen === 'accessibilitySettingsView' || state.currentSubScreen === 'accessibilityView') && state.focusedIndex === 2) {
      isDraggingNav = true;
      handleSpatialInput(e);
    }
  });

  navAreaEl.addEventListener('mousemove', (e) => {
    if (isDraggingNav && (state.currentSubScreen === 'accessibilitySettingsView' || state.currentSubScreen === 'accessibilityView') && state.focusedIndex === 2) {
      handleSpatialInput(e);
    }
  });

  window.addEventListener('mouseup', () => { isDraggingNav = false; });

  navAreaEl.addEventListener('touchstart', (e) => {
    if ((state.currentSubScreen === 'accessibilitySettingsView' || state.currentSubScreen === 'accessibilityView') && state.focusedIndex === 2) {
      handleSpatialInput(e);
    }
  }, { passive: false });

  navAreaEl.addEventListener('touchmove', (e) => {
    if ((state.currentSubScreen === 'accessibilitySettingsView' || state.currentSubScreen === 'accessibilityView') && state.focusedIndex === 2) {
      handleSpatialInput(e);
    }
  }, { passive: false });

  navAreaEl.addEventListener('click', (e) => {
    if ((state.currentSubScreen === 'accessibilitySettingsView' || state.currentSubScreen === 'accessibilityView') && state.focusedIndex === 2) {
      handleSpatialInput(e);
    }
  });
}

// ==========================================
// QUICK ACCESS OVERLAY ENGINE
// ==========================================

function renderQuickAccessItems() {
  if (!state.db.settings) {
    state.db.settings = {};
  }

  if (!state.db.settings.quickAccess || !Array.isArray(state.db.settings.quickAccess) || state.db.settings.quickAccess.length === 0) {
    state.db.settings.quickAccess = ['call_mother', 'nav_home', 'sos_trigger'];
    saveDb();
  }

  const activeIds = state.db.settings.quickAccess;
  const builtInMap = {
    'call_mother': {
      id: 'call_mother',
      name: 'Call Mother',
      icon: 'fa-phone',
      action: () => {
        startActiveCall({ name: 'Mother', phone: '+389 70 123 456' });
      }
    },
    'nav_home': {
      id: 'nav_home',
      name: 'Navigate Home',
      icon: 'fa-location-arrow',
      action: () => {
        Speech.speak('Navigation started for Home.');
        navigateTo('navigationScreen', 'navActiveRoutingView');
      }
    },
    'sos_trigger': {
      id: 'sos_trigger',
      name: 'Trigger SOS Alert',
      icon: 'fa-triangle-exclamation',
      action: () => {
        triggerSOS();
      }
    }
  };

  const customItems = state.db.settings.quickAccessCustom || [];
  const items = [];

  activeIds.forEach(id => {
    if (builtInMap[id]) {
      items.push(builtInMap[id]);
    } else {
      const match = customItems.find(c => c.id === id);
      if (match) {
        let rawIcon = match.icon || 'fa-bolt';
        rawIcon = rawIcon.replace('fa-solid ', '').replace('fa-', '');
        items.push({
          id: match.id,
          name: match.name || 'Custom Shortcut',
          icon: rawIcon,
          action: () => {
            if (match.type === 'call') {
              // Bug fix #8: Validate the target contact still exists before calling.
              // Previously, if the contact was deleted after the shortcut was created,
              // the call would silently use a blank phone number.
              const targetContact = state.db.contacts.find(c => c.id === match.targetId);
              if (targetContact) {
                startActiveCall(targetContact);
              } else {
                Haptic.trigger('error');
                Speech.speak(`Contact for shortcut ${match.name} no longer exists. Please update your Quick Access settings.`);
              }
            } else if (match.type === 'message') {
              // Bug fix #8: Validate the target contact still exists before opening reply.
              const contactMatch = state.db.contacts.find(c => c.id === match.targetId);
              if (!contactMatch) {
                Haptic.trigger('error');
                Speech.speak(`Contact for shortcut ${match.name} no longer exists. Please update your Quick Access settings.`);
                return;
              }
              const msgIndex = state.db.messages.findIndex(m => m.senderName === contactMatch.name);
              state.selectedMsgIndex = msgIndex !== -1 ? msgIndex : 0;
              navigateTo('messagesScreen', 'msgReplyView');
              renderReplyScreen();
            } else if (match.type === 'navigation') {
              // Bug fix #8: Validate the saved place still exists before navigating.
              const targetPlace = (state.db.savedPlaces || []).find(p => p.id === match.targetId);
              if (targetPlace) {
                selectedSavedPlace = targetPlace;
                navigateTo('navigationScreen', 'navActiveRoutingView');
              } else {
                Haptic.trigger('error');
                Speech.speak(`Saved place for shortcut ${match.name} no longer exists. Please update your Quick Access settings.`);
              }
            } else {
              navigateTo('mainMenuScreen');
            }
          }
        });
      }
    }
  });

  state.qaItems = items;
  if (state.focusedIndex === undefined || state.focusedIndex >= items.length) {
    state.focusedIndex = 0;
  }

  const container = document.getElementById('quickAccessListContainer');
  if (!container) return items;

  if (items.length === 0) {
    container.innerHTML = `
      <div class="qa-list-item focused" style="text-align:center; justify-content:center;">
        <span class="qa-item-title" style="color:#FFCC00;">No shortcuts configured</span>
      </div>`;
    return items;
  }

  container.innerHTML = items.map((item, index) => {
    const isFocused = index === state.focusedIndex;
    const cleanIcon = item.icon.startsWith('fa-') ? item.icon : `fa-${item.icon}`;
    return `
      <div class="qa-list-item ${isFocused ? 'focused' : ''}">
        <i class="fa-solid ${cleanIcon}"></i>
        <span class="qa-item-title">${item.name}</span>
      </div>
    `;
  }).join('');

  return items;
}

function toggleQuickAccess(show) {
  const overlay = document.getElementById('quickAccessOverlay');
  if (!overlay) return;

  if (show) {
    overlay.classList.add('active');
    Haptic.trigger('success');
    state.focusedIndex = 0;
    const items = renderQuickAccessItems();

    if (items && items.length > 0) {
      Speech.speak(`Quick Access open. ${items[0].name}, 1 of ${items.length}`);
    } else {
      Speech.speak("Quick Access open. No shortcuts configured.");
    }
  } else {
    overlay.classList.remove('active');
    Haptic.trigger('short');
    Speech.speak("Quick Access closed");
  }
}

function handleQuickAccessNavigation(gesture) {
  const items = state.qaItems || [];
  if (!items || items.length === 0) {
    if (gesture === 'longPress' || gesture === 'swipeUp' || gesture === 'swipeLeft') {
      toggleQuickAccess(false);
    }
    return;
  }

  const total = items.length;

  if (gesture === 'swipeRight') {
    state.focusedIndex = (state.focusedIndex + 1) % total;
    renderQuickAccessItems();
    Haptic.trigger('short');
    Speech.speak(`${items[state.focusedIndex].name}, ${state.focusedIndex + 1} of ${total}`);
  } else if (gesture === 'swipeLeft') {
    state.focusedIndex = (state.focusedIndex - 1 + total) % total;
    renderQuickAccessItems();
    Haptic.trigger('short');
    Speech.speak(`${items[state.focusedIndex].name}, ${state.focusedIndex + 1} of ${total}`);
  } else if (gesture === 'doubleTap' || gesture === 'tap') {
    const current = items[state.focusedIndex];
    if (current && typeof current.action === 'function') {
      Haptic.trigger('success');
      toggleQuickAccess(false);
      current.action();
    }
  } else if (gesture === 'longPress') {
    toggleQuickAccess(false);
  }
}

// Master Boot
window.onload = () => {
  logSystem('BlindEye launcher engine booted successfully.', 'system');
  loadDb();

  const bioSuccess = document.getElementById('btnSimulateBioSuccess');
  if (bioSuccess) bioSuccess.addEventListener('click', handleBiometricSuccess);
  const bioFail = document.getElementById('btnSimulateBioFail');
  if (bioFail) bioFail.addEventListener('click', handleBiometricFail);

  // NOTE: The biometric overlay click handler is managed exclusively by triggerBiometricAuth()
  // via overlay.onclick assignment. A second addEventListener here would cause the callback
  // to fire twice. The overlay element exists for the simulator Bio Lock button only.

  // Active Call Screen Action Button Event Listeners
  const btnMute = document.getElementById('btnToggleMute');
  if (btnMute) {
    btnMute.addEventListener('click', () => {
      state.isMuted = !state.isMuted;
      Haptic.trigger('short');
      btnMute.classList.toggle('active', state.isMuted);
      Speech.speak(`Microphone ${state.isMuted ? 'Muted' : 'Active'}`);
      logSystem(`Call audio state: ${state.isMuted ? 'Muted' : 'Unmuted'}`, 'action');
    });
  }

  const btnSpeaker = document.getElementById('btnToggleSpeaker');
  if (btnSpeaker) {
    btnSpeaker.addEventListener('click', () => {
      state.isSpeakerphone = !state.isSpeakerphone;
      Haptic.trigger('success');
      btnSpeaker.classList.toggle('active', state.isSpeakerphone);
      Speech.speak(`Speakerphone ${state.isSpeakerphone ? 'On' : 'Off'}`);
      logSystem(`Call speakerphone state: ${state.isSpeakerphone ? 'On' : 'Off'}`, 'action');
    });
  }

  const btnEnd = document.getElementById('btnEndCall');
  if (btnEnd) {
    btnEnd.addEventListener('click', () => {
      endCall();
    });
  }

  // Simulation and devicemotion listeners are bound in GestureManager.init() below

  if (typeof GestureManager !== 'undefined' && GestureManager.init) GestureManager.init();
  if (typeof Handwriting !== 'undefined' && Handwriting.init) Handwriting.init();

  // Catch first user interaction to unblock browser Audio/SpeechSynthesis
  const handleFirstInteraction = () => {
    // Initialize & resume AudioContext on first user gesture
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    if (state.lastSpeechText) {
      // Re-trigger the last spoken text now that user gesture has activated audio context
      Speech.speak(state.lastSpeechText);
    }
    document.removeEventListener('click', handleFirstInteraction);
    document.removeEventListener('touchstart', handleFirstInteraction);
  };
  document.addEventListener('click', handleFirstInteraction);
  document.addEventListener('touchstart', handleFirstInteraction);

  navigateTo('welcomeScreen');
};