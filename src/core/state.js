export let state = {
  db: null,
  commandCache: new Map(), // key: `${screen_id}::${gesture_code}::${sub_context}`
  screensCache: [],
  currentScreen: 'welcomeScreen',
  currentSubScreen: null,
  focusedIndex: 0,
  focusedItems: [],
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
  activeMorseSequence: [],
  tutorialMenuIndex: 0,
  tutorialMockItems: ['MESSAGES', 'PHONE', 'SETTINGS'],
  activeSpeechId: null,
  authenticated: false
};

export function saveDb() {
  try {
    if (state.db) {
      localStorage.setItem('blindEye_db_v2', JSON.stringify(state.db));
    }
  } catch (e) {
    console.error('Failed to save DB to local storage:', e);
  }
}

export function loadDb() {
  try {
    const raw = localStorage.getItem('blindEye_db_v2');
    if (raw) {
      state.db = JSON.parse(raw);
    } else {
      state.db = {
        settings: {
          vibeIntensity: 'medium',
          privacyMode: 'auto',
          readingMode: 'combined'
        },
        contacts: [
          { id: '1', name: 'John Doe', phone: '+1234567890' },
          { id: '2', name: 'Jane Smith', phone: '+0987654321' }
        ],
        messages: [
          { id: 'm1', from: 'John Doe', text: 'HELLO WORLD', time: '10:30 AM' }
        ]
      };
      saveDb();
    }
  } catch (e) {
    console.error('Failed to load DB:', e);
  }
}

export function logSystem(msg, type = 'info') {
  console.log(`[${type.toUpperCase()}] ${msg}`);
  const logEl = document.getElementById('systemLogView');
  if (logEl) {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logEl.prepend(entry);
  }
}
