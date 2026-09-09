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
      if (state.db && state.db.settings && state.db.settings.readingMode === 'combined') {
        state.db.settings.readingMode = 'voice';
        saveDb();
      }
    } else {
      state.db = {
        settings: {
          vibeIntensity: 'medium',
          privacyMode: 'auto',
          readingMode: 'voice'
        },
        contacts: [
          { id: '1', name: 'Brother', phone: '+38971234567' },
          { id: '2', name: 'Mother', phone: '+38970123456' },
          { id: '3', name: 'Caregiver Elena', phone: '+38975999888' },
          { id: '4', name: 'Doctor Office', phone: '+38972555112' }
        ],
        messages: [
          { id: 'm1', from: 'Mother', senderName: 'Mother', text: 'Zdravo, kade si? Dojdi si...', time: '14:25', unread: true },
          { id: 'm2', from: 'Brother', senderName: 'Brother', text: 'Javi mi se koga mozes.', time: '13:10', unread: false },
          { id: 'm3', from: 'Caregiver Elena', senderName: 'Caregiver Elena', text: 'Podsetnuvam za lekovite vo 18h.', time: '12:05', unread: true }
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
