/**
 * BlindTouch - Accessibility Platform Prototype Simulator Controller
 * Full client-side state engine and simulation layer
 */

// ==========================================
// 1. DATABASE & MOCK STATE
// ==========================================

const INITIAL_DB = {
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
    { id: 1, senderId: 1, senderName: 'Mother', text: 'Здраво, каде си? Дојди си дома.', unread: true, time: '12:05' },
    { id: 2, senderId: 2, senderName: 'Brother', text: 'Ќе доцнам 10 минути, купи леб.', unread: false, time: '11:42' },
    { id: 3, senderId: 3, senderName: 'Doctor', phone: '+389 72 555 112', text: 'Вашиот термин е потврден за утре во 9 часот.', unread: false, time: 'Yesterday' }
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

// State Manager
let state = {
  db: JSON.parse(localStorage.getItem('blindtouch_db')) || INITIAL_DB,
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

// Save database helper
function saveDb() {
  localStorage.setItem('blindtouch_db', JSON.stringify(state.db));
  logSystem('LocalStorage database updated.');
}

// Logging helper for dashboard
function logSystem(text, type = 'system') {
  const consoleLog = document.getElementById('systemLogsConsole');
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  const timestamp = new Date().toLocaleTimeString();
  entry.innerText = `[${timestamp}] ${text}`;
  consoleLog.appendChild(entry);
  consoleLog.scrollTop = consoleLog.scrollHeight;
}

// ==========================================
// 2. TEXT-TO-SPEECH (TTS) SYSTEM
// ==========================================

const Speech = {
  speak: function(text, interrupt = true) {
    if (state.isMuted || !state.speechEnabled) {
      logSystem(`[Muted Speech]: "${text}"`, 'system');
      document.getElementById('ttsOutputLog').innerText = `[MUTED] ${text}`;
      return;
    }

    if (interrupt && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    logSystem(`Speaking: "${text}"`, 'action');
    document.getElementById('ttsOutputLog').innerText = `> "${text}"`;

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Auto-detect language. If Macedonian characters present, set locale or speed adjustments
    if (/[а-шА-Ш]/.test(text)) {
      utterance.lang = 'mk-MK'; // Fallback to regional voice if available
    } else {
      utterance.lang = 'en-US';
    }
    
    utterance.rate = 1.0;
    
    window.speechSynthesis.speak(utterance);
  },

  stop: function() {
    window.speechSynthesis.cancel();
  }
};

// Toggle mute button
document.getElementById('btnToggleSpeech').addEventListener('click', () => {
  state.isMuted = !state.isMuted;
  const btn = document.getElementById('btnToggleSpeech');
  const icon = document.getElementById('ttsVolumeIcon');
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


// ==========================================
// 3. AUDIO & VISUAL HAPTIC SIMULATION
// ==========================================

const Haptic = {
  trigger: function(patternType) {
    // patternType: 'short' (dot) or 'long' (dash) or 'error' (triple short) or 'success' (double short)
    const ring = document.getElementById('hapticRippleRing');
    const core = document.getElementById('hapticCenterDot');
    const symbolLog = document.getElementById('vibeSymbolText');
    const phone = document.getElementById('phoneDevice');
    
    // Reset animations
    ring.className = 'haptic-ripple';
    core.className = 'haptic-center-core';
    void ring.offsetWidth; // Trigger reflow
    void core.offsetWidth;
    
    let delay = 0;
    
    if (patternType === 'short' || patternType === 'dot') {
      ring.classList.add('vibe-short');
      core.classList.add('vibe-short');
      symbolLog.innerText = '● (short vibration)';
      this.playSound('short');
      if (navigator.vibrate) navigator.vibrate(100);
      logSystem('Haptic: ● (short vibration)', 'action');
    } 
    else if (patternType === 'long' || patternType === 'dash') {
      ring.classList.add('vibe-long');
      core.classList.add('vibe-long');
      symbolLog.innerText = '━━ (long vibration)';
      this.playSound('long');
      if (navigator.vibrate) navigator.vibrate(300);
      logSystem('Haptic: ━━ (long vibration)', 'action');
    }
    else if (patternType === 'success') {
      // Double tap success feedback (● ●)
      ring.classList.add('vibe-short');
      core.classList.add('vibe-short');
      symbolLog.innerText = '●  ● (success vibration)';
      this.playSound('short');
      if (navigator.vibrate) navigator.vibrate([80, 50, 80]);
      
      setTimeout(() => {
        ring.className = 'haptic-ripple';
        void ring.offsetWidth;
        ring.classList.add('vibe-short');
        this.playSound('short');
      }, 150);
      
      logSystem('Haptic: ● ● (success confirmation)', 'action');
    }
    else if (patternType === 'error') {
      // Triple short (● ● ●)
      ring.classList.add('vibe-long');
      core.classList.add('vibe-long');
      symbolLog.innerText = '●  ●  ● (error vibration)';
      this.playSound('short');
      
      let count = 0;
      const interval = setInterval(() => {
        count++;
        this.playSound('short');
        if (count >= 2) clearInterval(interval);
      }, 120);
      
      if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100]);
      
      // Shudder the whole physical phone frame slightly
      phone.classList.add('shaking');
      setTimeout(() => phone.classList.remove('shaking'), 300);
      
      logSystem('Haptic: ● ● ● (error signal)', 'error');
    }
  },

  playSound: function(type) {
    if (state.isMuted) return;
    try {
      let id = 'soundBeepShort';
      if (type === 'long' || type === 'dash') id = 'soundBeepLong';
      else if (type === 'ringing') id = 'soundCallRinging';
      else if (type === 'connected') id = 'soundCallConnected';
      else if (type === 'siren') id = 'soundSiren';
      
      const el = document.getElementById(id);
      if (el) {
        el.currentTime = 0;
        el.volume = state.db.settings.vibeIntensity === 'low' ? 0.3 : state.db.settings.vibeIntensity === 'high' ? 1.0 : 0.6;
        el.play().catch(e => console.log('Audio playback blocked: ', e));
      }
    } catch(e) {
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

// Translate text to Morse vibration sequence
function playMorseString(str, onComplete = null) {
  state.speechEnabled = false; // Disable speech during Morse playback
  const words = str.toUpperCase().split(' ');
  let timeline = [];
  
  words.forEach(word => {
    for (let char of word) {
      const code = MORSE_MAP[char];
      if (code) {
        for (let pulse of code) {
          timeline.push({ type: pulse === '.' ? 'short' : 'long', char });
        }
        // Inter-letter pause (gap between characters in same word)
        timeline.push({ type: 'pause-letter' });
      }
    }
    // Inter-word pause
    timeline.push({ type: 'pause-word' });
  });

  // Playback the sequence recursively
  let index = 0;
  
  function nextPulse() {
    if (index >= timeline.length) {
      state.speechEnabled = true;
      if (onComplete) onComplete();
      return;
    }
    
    const step = timeline[index++];
    if (step.type === 'short' || step.type === 'long') {
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
  init: function() {
    const screen = document.getElementById('phoneScreen');
    
    // Mouse Events
    screen.addEventListener('mousedown', (e) => this.start(e.clientX, e.clientY));
    screen.addEventListener('mouseup', (e) => this.end(e.clientX, e.clientY));
    
    // Touch Events
    screen.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      this.start(touch.clientX, touch.clientY);
    });
    screen.addEventListener('touchend', (e) => {
      const touch = e.changedTouches[0];
      this.end(touch.clientX, touch.clientY);
    });

    // Helper buttons
    document.getElementById('btnSimulateSwipeL').addEventListener('click', () => this.handleGesture('swipeLeft'));
    document.getElementById('btnSimulateSwipeR').addEventListener('click', () => this.handleGesture('swipeRight'));
    document.getElementById('btnSimulateSwipeU').addEventListener('click', () => this.handleGesture('swipeUp'));
    document.getElementById('btnSimulateSwipeD').addEventListener('click', () => this.handleGesture('swipeDown'));
    document.getElementById('btnSimulateTap').addEventListener('click', () => this.handleGesture('tap'));
    document.getElementById('btnSimulateDblTap').addEventListener('click', () => this.handleGesture('doubleTap'));
    document.getElementById('btnSimulateLongPress').addEventListener('click', () => this.handleGesture('longPress'));
  },

  start: function(x, y) {
    // If the active screen is the handwriting canvas, we do NOT handle swipes/taps here (canvas draws instead)
    if (state.currentScreen === 'callsScreen' && state.currentSubScreen === 'handwritingDialerView') {
      return;
    }
    state.gestureStart = { x, y, time: Date.now() };
  },

  end: function(x, y) {
    if (!state.gestureStart) return;
    
    const deltaX = x - state.gestureStart.x;
    const deltaY = y - state.gestureStart.y;
    const duration = Date.now() - state.gestureStart.time;
    
    const minSwipeDist = 45; // pixels
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

    if (!gesture && duration < 250) {
      // Distinguish tap vs double tap
      if (state.lastTapTime && (Date.now() - state.lastTapTime < 280)) {
        gesture = 'doubleTap';
        state.lastTapTime = null;
      } else {
        state.lastTapTime = Date.now();
        // Delay parsing tap to see if double tap triggers
        setTimeout(() => {
          if (state.lastTapTime) {
            this.handleGesture('tap');
            state.lastTapTime = null;
          }
        }, 280);
        state.gestureStart = null;
        return;
      }
    }

    state.gestureStart = null;
    if (gesture) {
      this.handleGesture(gesture);
    }
  },

  handleGesture: function(gesture) {
    logSystem(`Gesture: ${gesture}`, 'input');
    
    // Play subtle audio click for gesture feedback
    if (gesture === 'tap') Haptic.playSound('short');
    
    // SOS Screen bypass - if SOS is counting down or active, only long press cancels it
    if (state.currentScreen === 'sosScreen') {
      if (gesture === 'longPress') {
        cancelSOS();
      } else {
        Haptic.trigger('error');
      }
      return;
    }

    // Call state bypass - if in active call, double tap ends call, long press goes back
    if (state.currentScreen === 'activeCallScreen') {
      if (gesture === 'doubleTap') {
        endCall();
      } else if (gesture === 'longPress') {
        endCall();
      } else {
        Haptic.trigger('error');
      }
      return;
    }

    // Quick Access Swipe Down Trigger (works anywhere except tutorial/sos/biometrics)
    if (gesture === 'swipeDown' && state.currentScreen !== 'tutorialScreen' && state.currentScreen !== 'welcomeScreen') {
      toggleQuickAccess(true);
      return;
    }

    if (gesture === 'swipeUp' && document.getElementById('quickAccessOverlay').classList.contains('active')) {
      toggleQuickAccess(false);
      return;
    }

    // If Quick Access is open, handle navigation inside Quick Access
    if (document.getElementById('quickAccessOverlay').classList.contains('active')) {
      handleQuickAccessNavigation(gesture);
      return;
    }

    // Normal Screen Screen Navigations
    switch(state.currentScreen) {
      case 'welcomeScreen':
        if (gesture === 'doubleTap' || gesture === 'tap') {
          // Default to start tutorial on click
          startTutorial();
        }
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


// ==========================================
// 6. HEURISTIC HANDWRITING RECOGNIZER
// ==========================================

const Handwriting = {
  canvas: null,
  ctx: null,
  isDrawing: false,

  init: function() {
    this.canvas = document.getElementById('handwritingCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();

    // Mouse Events
    this.canvas.addEventListener('mousedown', (e) => this.startDraw(e.offsetX, e.offsetY));
    this.canvas.addEventListener('mousemove', (e) => this.draw(e.offsetX, e.offsetY));
    this.canvas.addEventListener('mouseup', () => this.endDraw());
    this.canvas.addEventListener('mouseleave', () => this.endDraw());

    // Touch Events
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches[0];
      this.startDraw(touch.clientX - rect.left, touch.clientY - rect.top);
    });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches[0];
      this.draw(touch.clientX - rect.left, touch.clientY - rect.top);
    });
    this.canvas.addEventListener('touchend', () => this.endDraw());

    window.addEventListener('resize', () => this.resizeCanvas());
  },

  resizeCanvas: function() {
    if (!this.canvas) return;
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
    this.clearCanvas();
  },

  clearCanvas: function() {
    this.ctx.fillStyle = '#020617';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.strokeStyle = '#06b6d4';
    this.ctx.lineWidth = 6;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  },

  startDraw: function(x, y) {
    this.isDrawing = true;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    state.handwritingPoints = [{ x, y, t: Date.now() }];
    if (state.handwritingTimeout) clearTimeout(state.handwritingTimeout);
  },

  draw: function(x, y) {
    if (!this.isDrawing) return;
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    
    // Add path trace with time glow
    this.ctx.shadowBlur = 4;
    this.ctx.shadowColor = '#06b6d4';
    
    state.handwritingPoints.push({ x, y, t: Date.now() });
  },

  endDraw: function() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.ctx.shadowBlur = 0; // reset glow

    // Set timeout to recognize digit after user stops drawing for 700ms
    state.handwritingTimeout = setTimeout(() => {
      this.recognize();
    }, 700);
  },

  recognize: function() {
    const pts = state.handwritingPoints;
    if (pts.length < 8) {
      this.clearCanvas();
      return; // Stroke too short
    }

    // 1. Calculate Bounding Box
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    pts.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    const w = maxX - minX;
    const h = maxY - minY;
    
    // Feature calculations
    const startPt = pts[0];
    const endPt = pts[pts.length - 1];
    const dx = endPt.x - startPt.x;
    const dy = endPt.y - startPt.y;
    const pathLen = pts.reduce((sum, p, i) => i === 0 ? 0 : sum + Math.hypot(p.x - pts[i-1].x, p.y - pts[i-1].y), 0);
    const startEndDist = Math.hypot(dx, dy);

    // Heuristics character parser
    let digit = '7'; // Default fallback

    // Feature 1: Straight vertical-ish line (1)
    if (h / (w || 1) > 2.2 && startPt.y < minY + h * 0.25 && endPt.y > maxY - h * 0.25 && Math.abs(dx) < w * 0.5) {
      digit = '1';
    }
    // Feature 2: Closed loop circle (0)
    else if (startEndDist < pathLen * 0.25 && w / h > 0.6 && w / h < 1.6) {
      // Loop. Can be 0 or 8.
      // If there is intersection in middle, it is 8.
      let intersections = 0;
      for (let i = 2; i < pts.length - 2; i++) {
        for (let j = i + 4; j < pts.length; j++) {
          const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
          if (d < 5) intersections++;
        }
      }
      digit = intersections > 8 ? '8' : '0';
    }
    // Feature 3: Horizontal line followed by slash (7)
    else if (startPt.x < minX + w*0.4 && startPt.y < minY + h*0.25 && endPt.x < minX + w*0.5 && endPt.y > maxY - h*0.25) {
      digit = '7';
    }
    // Feature 4: Three arches (3) or curve right-left (3)
    else if (dx > 0 && Math.abs(dy) < h * 0.3) {
      digit = '3';
    }
    // Feature 5: Draw down then curve loop at bottom (6)
    else if (startPt.y < minY + h*0.2 && endPt.y < maxY && endPt.y > minY + h*0.4) {
      digit = '6';
    }
    // Feature 6: Loop at top, straight line down (9)
    else if (startPt.y > minY + h*0.3 && endPt.y > maxY - h*0.2) {
      digit = '9';
    }
    // General fallback template matching
    else {
      // Check quadrants for generic shapes
      if (dx > 0 && dy > 0) {
        digit = '2'; // Top left down to bottom right curves
      } else if (dx < 0 && dy > 0) {
        digit = '5';
      } else {
        digit = '4';
      }
    }

    logSystem(`Handwriting recognizer: classified drawing as "${digit}"`, 'system');
    
    // Add digit to dialed string
    if (state.dialedNumber === 'No number' || state.dialedNumber === '') {
      state.dialedNumber = digit;
    } else {
      state.dialedNumber += digit;
    }

    document.getElementById('dialerNumberLog').innerText = state.dialedNumber;
    Speech.speak(getDigitName(digit));
    Haptic.trigger('success');

    // Clean drawing
    this.clearCanvas();
  }
};

function getDigitName(d) {
  const names = {
    '0': 'Zero', '1': 'One', '2': 'Two', '3': 'Three', '4': 'Four',
    '5': 'Five', '6': 'Six', '7': 'Seven', '8': 'Eight', '9': 'Nine'
  };
  return names[d] || d;
}


// ==========================================
// 7. SCREEN ROUTER & NAVIGATION
// ==========================================

function navigateTo(screenId, subScreenId = null) {
  Speech.stop();
  
  // Clean active stream if leaving Camera
  if (state.isCameraActive && screenId !== 'cameraScreen') {
    stopWebcam();
  }

  // Deactivate old screens
  document.querySelectorAll('.screen-view').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sub-screen').forEach(s => s.classList.remove('active'));

  state.currentScreen = screenId;
  state.currentSubScreen = subScreenId;

  const targetScreen = document.getElementById(screenId);
  targetScreen.classList.add('active');

  if (subScreenId) {
    document.getElementById(subScreenId).classList.add('active');
  }

  logSystem(`Navigated to: ${screenId} -> ${subScreenId || 'main'}`, 'action');

  // Trigger Privacy screen logic
  updatePrivacyScreenState();

  // Screen-specific load initializers
  onScreenLoaded(screenId, subScreenId);
}

function updatePrivacyScreenState() {
  const overlay = document.getElementById('privacyOverlay');
  const isPrivateScreen = (state.currentScreen === 'messagesScreen' && state.currentSubScreen === 'msgDetailView') ||
                          (state.currentScreen === 'settingsScreen' && state.currentSubScreen === 'emergencySettingsView');

  if (isPrivateScreen && state.db.settings.privacyMode === 'auto') {
    overlay.classList.add('active');
    logSystem('Privacy Mode dims screen content.', 'system');
  } else {
    overlay.classList.remove('active');
  }
}

function onScreenLoaded(screen, subScreen) {
  state.focusedIndex = 0;
  
  if (screen === 'welcomeScreen') {
    Speech.speak('Welcome to BlindTouch. Double tap screen to start interactive tutorial.');
  } 
  else if (screen === 'tutorialScreen') {
    startTutorial();
  } 
  else if (screen === 'mainMenuScreen') {
    renderMainMenu();
  } 
  else if (screen === 'messagesScreen') {
    if (subScreen === 'msgThreadsView') {
      renderMessageThreads();
    } else if (subScreen === 'msgDetailView') {
      renderMessageDetail();
    } else if (subScreen === 'msgQuickRepliesView') {
      renderQuickReplies();
    } else if (subScreen === 'msgMorseInputView') {
      initMorseInput();
    }
  } 
  else if (screen === 'callsScreen') {
    if (subScreen === 'callsMenuView') {
      renderCallsMenu();
    } else if (subScreen === 'contactsView') {
      renderContacts();
    } else if (subScreen === 'contactActionsView') {
      renderContactActions();
    } else if (subScreen === 'favoritesView') {
      renderFavorites();
    } else if (subScreen === 'recentsView') {
      renderRecents();
    } else if (subScreen === 'handwritingDialerView') {
      state.dialedNumber = '';
      document.getElementById('dialerNumberLog').innerText = 'Draw number...';
      Handwriting.clearCanvas();
      Speech.speak('Dialer active. Draw digits on canvas. Double tap bottom to place call.');
    }
  } 
  else if (screen === 'cameraScreen') {
    if (subScreen === 'cameraMenuView') {
      renderCameraMenu();
    } else if (subScreen === 'cameraActiveView') {
      startCameraActiveViewport();
    } else if (subScreen === 'cameraResultsView') {
      renderCameraResults();
    }
  } 
  else if (screen === 'navigationScreen') {
    if (subScreen === 'navMenuView') {
      renderNavigationMenu();
    } else if (subScreen === 'navDestinationInputView') {
      startNavigationSpeechSearch();
    } else if (subScreen === 'navResultsView') {
      renderNavigationResults();
    } else if (subScreen === 'navActionsView') {
      renderNavigationActions();
    } else if (subScreen === 'navActiveRoutingView') {
      startNavigationRoutingSimulation();
    }
  } 
  else if (screen === 'settingsScreen') {
    if (subScreen === 'settingsMenuView') {
      renderSettingsMenu();
    } else if (subScreen === 'accessibilitySettingsView') {
      renderAccessibilitySettings();
    } else if (subScreen === 'quickAccessSettingsView') {
      renderQuickAccessSettings();
    } else if (subScreen === 'emergencySettingsView') {
      renderEmergencySettings();
    }
  }
}

// ==========================================
// 8. SCREEN MODULES IMPLEMENTATION
// ==========================================

// --- Welcome & Tutorial ---
let tutorialStep = 1;
function startTutorial() {
  tutorialStep = 1;
  navigateTo('tutorialScreen');
  setupTutorialStep();
}

function setupTutorialStep() {
  const title = document.getElementById('tutTitle');
  const text = document.getElementById('tutText');
  const ind = document.getElementById('tutIndicatorText');
  const box = document.getElementById('tutAnimationBox');
  
  box.className = 'tut-animation-container';
  Speech.stop();

  if (tutorialStep === 1) {
    title.innerText = 'Step 1: Swiping Right';
    text.innerText = 'Swipe RIGHT to move to the next item. Swipe LEFT for the previous item.';
    ind.innerText = 'Try it now: Swipe Right';
    box.classList.add('swipe-anim');
    Speech.speak('Step 1. Learning swipe gestures. Swipe right to focus next item.');
  } 
  else if (tutorialStep === 2) {
    title.innerText = 'Step 2: Selection';
    text.innerText = 'Double tap the screen to confirm your selected action.';
    ind.innerText = 'Try it now: Double Tap';
    Speech.speak('Step 2. Double tap screen to select.');
  } 
  else if (tutorialStep === 3) {
    title.innerText = 'Step 3: Haptic Feedback';
    text.innerText = 'Listen to the beep patterns and feel the device vibration to recognize modules.';
    ind.innerText = 'Try it now: Tap Screen';
    Speech.speak('Step 3. Vibration signals. Short beep represents a selection, long beep is an action.');
  } 
  else if (tutorialStep === 4) {
    title.innerText = 'Step 4: SOS Emergency';
    text.innerText = 'Shake your phone twice or hold down during active SOS to secure safety.';
    ind.innerText = 'Try it now: Long press screen';
    Speech.speak('Step 4. SOS system. Double shake phone during emergency. Long press to cancel tutorial and enter main menu.');
  }
}

function handleTutorialGesture(gesture) {
  if (tutorialStep === 1 && gesture === 'swipeRight') {
    Haptic.trigger('success');
    tutorialStep = 2;
    setupTutorialStep();
  } 
  else if (tutorialStep === 2 && gesture === 'doubleTap') {
    Haptic.trigger('success');
    tutorialStep = 3;
    setupTutorialStep();
  } 
  else if (tutorialStep === 3 && gesture === 'tap') {
    Haptic.trigger('long');
    tutorialStep = 4;
    setupTutorialStep();
  } 
  else if (gesture === 'longPress') {
    Haptic.trigger('success');
    state.db.tutorialCompleted = true;
    saveDb();
    navigateTo('mainMenuScreen');
    Speech.speak('Tutorial completed. Welcome to the Main Menu.');
  } else {
    Haptic.trigger('error');
  }
}


// --- Main Menu ---
const MAIN_MENU_ITEMS = [
  { id: 'msg', name: 'Messages', icon: 'fa-comment-sms', pattern: 'short' },
  { id: 'calls', name: 'Calls', icon: 'fa-phone', pattern: 'success' },
  { id: 'cam', name: 'Camera', icon: 'fa-camera', pattern: 'long' },
  { id: 'nav', name: 'Navigation', icon: 'fa-compass', pattern: 'long' },
  { id: 'set', name: 'Settings', icon: 'fa-sliders', pattern: 'long' }
];

function renderMainMenu() {
  const container = document.getElementById('menuCardsContainer');
  container.innerHTML = '';
  
  MAIN_MENU_ITEMS.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = `menu-item-card ${index === state.focusedIndex ? 'focused' : ''}`;
    card.id = `menuCard_${item.id}`;
    card.innerHTML = `
      <i class="fa-solid ${item.icon}"></i>
      <span>${item.name}</span>
    `;
    container.appendChild(card);
  });

  state.focusedItems = MAIN_MENU_ITEMS;
  speakFocusedItem();
}

function speakFocusedItem() {
  const item = state.focusedItems[state.focusedIndex];
  if (!item) return;
  
  Haptic.trigger(item.pattern || 'short');

  // Perform TTS speech
  if (state.currentScreen === 'mainMenuScreen') {
    Speech.speak(item.name);
  } else if (state.currentScreen === 'messagesScreen') {
    if (state.currentSubScreen === 'msgThreadsView') {
      Speech.speak(`Message from ${item.senderName}. ${item.unread ? 'Unread message.' : 'Read message.'}`);
    } else {
      Speech.speak(item.name || item.text);
    }
  } else if (state.currentScreen === 'callsScreen') {
    Speech.speak(item.name || item.text);
  } else if (state.currentScreen === 'settingsScreen') {
    Speech.speak(item.name);
  } else {
    Speech.speak(item.name || item.text || 'Menu Option');
  }
}

function handleMainMenuGesture(gesture) {
  if (gesture === 'swipeRight') {
    state.focusedIndex = (state.focusedIndex + 1) % state.focusedItems.length;
    renderMainMenu();
  } 
  else if (gesture === 'swipeLeft') {
    state.focusedIndex = (state.focusedIndex - 1 + state.focusedItems.length) % state.focusedItems.length;
    renderMainMenu();
  } 
  else if (gesture === 'doubleTap') {
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
function renderMessageThreads() {
  const container = document.getElementById('msgThreadsContainer');
  container.innerHTML = '';
  
  state.focusedItems = state.db.messages;
  
  state.focusedItems.forEach((msg, index) => {
    const card = document.createElement('div');
    card.className = `menu-item-card ${index === state.focusedIndex ? 'focused' : ''}`;
    card.innerHTML = `
      <i class="fa-solid ${msg.unread ? 'fa-envelope-open-text' : 'fa-envelope'}"></i>
      <div style="display:flex; flex-direction:column; text-align:left;">
        <span style="font-size:1.1rem; font-weight:700;">${msg.senderName}</span>
        <span style="font-size:0.8rem; color:var(--text-secondary); font-weight:normal;">${msg.text.substring(0, 20)}...</span>
      </div>
    `;
    container.appendChild(card);
  });
  
  speakFocusedItem();
}

function renderMessageDetail() {
  const msg = state.focusedItems[state.focusedIndex];
  document.getElementById('msgDetailSender').innerText = msg.senderName;
  
  const statusBadge = document.getElementById('msgDetailStatus');
  if (msg.unread) {
    statusBadge.innerText = 'Unread';
    statusBadge.className = 'msg-status-badge';
    msg.unread = false; // mark read
    saveDb();
  } else {
    statusBadge.innerText = 'Read';
    statusBadge.className = 'msg-status-badge read';
  }

  document.getElementById('msgDetailBodyText').innerText = msg.text;

  // Actions inside detail screen: Speak, Morse, Reply
  state.focusedItems = [
    { id: 'speak', name: 'Speak Text (TTS)', pattern: 'short' },
    { id: 'morse', name: 'Read Morse Haptic', pattern: 'long' },
    { id: 'reply', name: 'Reply', pattern: 'success' }
  ];
  state.focusedIndex = 0;
  updateMessageDetailActionsUI();
}

function updateMessageDetailActionsUI() {
  const actionIds = ['msgActionReadTTS', 'msgActionReadMorse', 'msgActionReply'];
  actionIds.forEach((id, index) => {
    const el = document.getElementById(id);
    if (index === state.focusedIndex) {
      el.classList.add('focused');
    } else {
      el.classList.remove('focused');
    }
  });
  Speech.speak(state.focusedItems[state.focusedIndex].name);
}

function handleMessagesGesture(gesture) {
  if (state.currentSubScreen === 'msgThreadsView') {
    if (gesture === 'swipeRight') {
      state.focusedIndex = (state.focusedIndex + 1) % state.focusedItems.length;
      renderMessageThreads();
    } else if (gesture === 'swipeLeft') {
      state.focusedIndex = (state.focusedIndex - 1 + state.focusedItems.length) % state.focusedItems.length;
      renderMessageThreads();
    } else if (gesture === 'doubleTap') {
      navigateTo('messagesScreen', 'msgDetailView');
    } else if (gesture === 'longPress') {
      navigateTo('mainMenuScreen');
    }
  } 
  else if (state.currentSubScreen === 'msgDetailView') {
    if (gesture === 'swipeRight') {
      state.focusedIndex = (state.focusedIndex + 1) % state.focusedItems.length;
      updateMessageDetailActionsUI();
    } else if (gesture === 'swipeLeft') {
      state.focusedIndex = (state.focusedIndex - 1 + state.focusedItems.length) % state.focusedItems.length;
      updateMessageDetailActionsUI();
    } else if (gesture === 'doubleTap') {
      const selected = state.focusedItems[state.focusedIndex];
      const activeMsg = state.db.messages.find(m => m.id === activeMessageIdUnderReview());
      
      if (selected.id === 'speak') {
        Speech.speak(activeMsg.text);
      } else if (selected.id === 'morse') {
        Speech.speak('Converting text to Morse pulses. Feel the screen.');
        setTimeout(() => playMorseString(activeMsg.text), 1500);
      } else if (selected.id === 'reply') {
        navigateTo('messagesScreen', 'msgReplyView');
      }
    } else if (gesture === 'longPress') {
      navigateTo('messagesScreen', 'msgThreadsView');
    }
  }
  else if (state.currentSubScreen === 'msgReplyView') {
    // Handling reply methods
    const replyOptions = [
      { id: 'quick', name: 'Quick Answers' },
      { id: 'stt', name: 'Voice Input' },
      { id: 'morse', name: 'Morse Keyboard' }
    ];
    
    if (gesture === 'swipeRight') {
      state.focusedIndex = (state.focusedIndex + 1) % replyOptions.length;
      updateReplyViewUI();
    } else if (gesture === 'swipeLeft') {
      state.focusedIndex = (state.focusedIndex - 1 + replyOptions.length) % replyOptions.length;
      updateReplyViewUI();
    } else if (gesture === 'doubleTap') {
      const selected = replyOptions[state.focusedIndex];
      if (selected.id === 'quick') navigateTo('messagesScreen', 'msgQuickRepliesView');
      if (selected.id === 'stt') navigateTo('messagesScreen', 'msgSttView');
      if (selected.id === 'morse') navigateTo('messagesScreen', 'msgMorseInputView');
    } else if (gesture === 'longPress') {
      navigateTo('messagesScreen', 'msgDetailView');
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
      sendSMSMessage(selected.text);
    } else if (gesture === 'longPress') {
      navigateTo('messagesScreen', 'msgReplyView');
    }
  }
  else if (state.currentSubScreen === 'msgSttView') {
    if (gesture === 'doubleTap') {
      // Simulate confirmation
      const res = document.getElementById('sttResultText').innerText.replace(/"/g, '').trim();
      sendSMSMessage(res || "Ќе стигнам за 10 минути.");
    } else if (gesture === 'longPress') {
      navigateTo('messagesScreen', 'msgReplyView');
    }
  }
}

function activeMessageIdUnderReview() {
  // Finds which message thread is currently open
  return state.db.messages[state.focusedIndex]?.id || 1;
}

function updateReplyViewUI() {
  const ids = ['replyModeQuick', 'replyModeSTT', 'replyModeMorse'];
  const names = ['Quick Answers', 'Voice Input', 'Morse Keyboard'];
  ids.forEach((id, index) => {
    const el = document.getElementById(id);
    if (index === state.focusedIndex) {
      el.classList.add('focused');
    } else {
      el.classList.remove('focused');
    }
  });
  Speech.speak(names[state.focusedIndex]);
}

function renderQuickReplies() {
  const container = document.getElementById('quickRepliesContainer');
  container.innerHTML = '';
  
  const replies = [
    { text: 'Да' },
    { text: 'Не' },
    { text: 'Во ред' },
    { text: 'Ќе ти се јавам' }
  ];
  state.focusedItems = replies;

  state.focusedItems.forEach((reply, index) => {
    const card = document.createElement('div');
    card.className = `menu-item-card ${index === state.focusedIndex ? 'focused' : ''}`;
    card.innerHTML = `<span>${reply.text}</span>`;
    container.appendChild(card);
  });
  Speech.speak(replies[state.focusedIndex].text);
}

function sendSMSMessage(text) {
  const activeMsg = state.db.messages.find(m => m.id === activeMessageIdUnderReview());
  Haptic.trigger('success');
  Speech.speak('Message sent successfully.');
  
  logSystem(`SMS sent to ${activeMsg.senderName}: "${text}"`, 'sms');
  
  setTimeout(() => {
    navigateTo('messagesScreen', 'msgThreadsView');
  }, 1500);
}


// --- Morse Input Subscreen Logic ---
let morseTimer = null;
let morseCodeBuffer = '';

function initMorseInput() {
  morseCodeBuffer = '';
  document.getElementById('morseSymbolsLog').innerText = '';
  document.getElementById('morseTextResult').innerText = 'No input';
  
  const pad = document.getElementById('morsePad');
  let startTime = 0;

  pad.onmousedown = (e) => {
    e.stopPropagation();
    startTime = Date.now();
  };

  pad.onmouseup = (e) => {
    e.stopPropagation();
    const duration = Date.now() - startTime;
    const symbol = duration < 300 ? '.' : '-';
    
    morseCodeBuffer += symbol;
    document.getElementById('morseSymbolsLog').innerText = morseCodeBuffer;
    Haptic.trigger(symbol === '.' ? 'short' : 'long');
    
    // Auto-detect end of letter after 1 second of inactivity
    if (morseTimer) clearTimeout(morseTimer);
    morseTimer = setTimeout(decodeMorseLetter, 1000);
  };
}

function decodeMorseLetter() {
  const char = DECODE_MORSE_MAP[morseCodeBuffer];
  const display = document.getElementById('morseTextResult');
  
  if (char) {
    if (display.innerText === 'No input') display.innerText = '';
    display.innerText += char;
    Speech.speak(char);
    logSystem(`Morse converted: "${morseCodeBuffer}" -> "${char}"`, 'system');
  } else {
    Haptic.trigger('error');
    Speech.speak('Unknown symbol');
  }
  morseCodeBuffer = '';
  document.getElementById('morseSymbolsLog').innerText = '';
}


// --- Calls Module ---
function renderCallsMenu() {
  const items = [
    { id: 'contacts', name: 'Contacts' },
    { id: 'favs', name: 'Favorites' },
    { id: 'recents', name: 'Recent Calls' },
    { id: 'dialer', name: 'Handwriting Dialer' }
  ];
  state.focusedItems = items;
  
  const ids = ['callsOptContacts', 'callsOptFavorites', 'callsOptRecents', 'callsOptDialer'];
  ids.forEach((id, idx) => {
    const el = document.getElementById(id);
    if (idx === state.focusedIndex) {
      el.classList.add('focused');
    } else {
      el.classList.remove('focused');
    }
  });

  Speech.speak(items[state.focusedIndex].name);
}

function renderContacts() {
  const container = document.getElementById('contactsContainer');
  container.innerHTML = '';
  
  state.focusedItems = state.db.contacts;
  
  state.focusedItems.forEach((c, index) => {
    const card = document.createElement('div');
    card.className = `menu-item-card ${index === state.focusedIndex ? 'focused' : ''}`;
    card.innerHTML = `
      <i class="fa-solid fa-user-tag"></i>
      <span>${c.name}</span>
      ${c.favorite ? '<i class="fa-solid fa-star" style="margin-left:auto; color:var(--accent-warning); font-size:0.9rem;"></i>' : ''}
    `;
    container.appendChild(card);
  });

  speakFocusedItem();
}

function renderContactActions() {
  const contact = state.db.contacts[state.focusedIndex];
  document.getElementById('actionContactName').innerText = contact.name;
  
  const actions = [
    { id: 'call', name: 'Call Contact' },
    { id: 'fav', name: contact.favorite ? 'Remove Favorite' : 'Add Favorite' },
    { id: 'emerg', name: contact.emergency ? 'Remove Emergency' : 'Add Emergency' },
    { id: 'del', name: 'Delete Contact' }
  ];
  state.focusedItems = actions;
  state.focusedIndex = 0;

  updateContactActionsUI();
}

function updateContactActionsUI() {
  const ids = ['contactActionCall', 'contactActionFavorite', 'contactActionEmergency', 'contactActionDelete'];
  ids.forEach((id, idx) => {
    const el = document.getElementById(id);
    if (idx === state.focusedIndex) {
      el.classList.add('focused');
    } else {
      el.classList.remove('focused');
    }
  });
  Speech.speak(state.focusedItems[state.focusedIndex].name);
}

function renderFavorites() {
  const container = document.getElementById('favoritesContainer');
  container.innerHTML = '';
  
  state.focusedItems = state.db.contacts.filter(c => c.favorite);
  
  if (state.focusedItems.length === 0) {
    container.innerHTML = `<div class="menu-item-card"><span>No favorites added.</span></div>`;
    Speech.speak('No favorite contacts.');
    return;
  }

  state.focusedItems.forEach((c, index) => {
    const card = document.createElement('div');
    card.className = `menu-item-card ${index === state.focusedIndex ? 'focused' : ''}`;
    card.innerHTML = `
      <i class="fa-solid fa-star" style="color:var(--accent-warning);"></i>
      <span>${c.name}</span>
    `;
    container.appendChild(card);
  });
  speakFocusedItem();
}

function renderRecents() {
  const container = document.getElementById('recentsContainer');
  container.innerHTML = '';
  
  state.focusedItems = state.db.recentCalls;

  state.focusedItems.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = `menu-item-card ${index === state.focusedIndex ? 'focused' : ''}`;
    const color = item.type === 'received' ? 'var(--accent-success)' : 'var(--accent-danger)';
    card.innerHTML = `
      <i class="fa-solid fa-phone" style="color:${color};"></i>
      <div style="display:flex; flex-direction:column; text-align:left;">
        <span>${item.name}</span>
        <span style="font-size:0.75rem; color:var(--text-secondary); font-weight:normal;">${item.type} • ${item.time}</span>
      </div>
    `;
    container.appendChild(card);
  });
  speakFocusedItem();
}

function handleCallsGesture(gesture) {
  if (state.currentSubScreen === 'callsMenuView') {
    if (gesture === 'swipeRight') {
      state.focusedIndex = (state.focusedIndex + 1) % 4;
      renderCallsMenu();
    } else if (gesture === 'swipeLeft') {
      state.focusedIndex = (state.focusedIndex - 1 + 4) % 4;
      renderCallsMenu();
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
      state.focusedIndex = (state.focusedIndex + 1) % state.focusedItems.length;
      renderContacts();
    } else if (gesture === 'swipeLeft') {
      state.focusedIndex = (state.focusedIndex - 1 + state.focusedItems.length) % state.focusedItems.length;
      renderContacts();
    } else if (gesture === 'doubleTap') {
      navigateTo('callsScreen', 'contactActionsView');
    } else if (gesture === 'longPress') {
      navigateTo('callsScreen', 'callsMenuView');
    }
  }
  else if (state.currentSubScreen === 'contactActionsView') {
    if (gesture === 'swipeRight') {
      state.focusedIndex = (state.focusedIndex + 1) % state.focusedItems.length;
      updateContactActionsUI();
    } else if (gesture === 'swipeLeft') {
      state.focusedIndex = (state.focusedIndex - 1 + state.focusedItems.length) % state.focusedItems.length;
      updateContactActionsUI();
    } else if (gesture === 'doubleTap') {
      const selected = state.focusedItems[state.focusedIndex];
      const activeContact = state.db.contacts.find(c => c.name === document.getElementById('actionContactName').innerText);
      
      if (selected.id === 'call') {
        startActiveCall(activeContact);
      } else if (selected.id === 'fav') {
        // Toggle Favorite settings
        activeContact.favorite = !activeContact.favorite;
        saveDb();
        Haptic.trigger('success');
        Speech.speak(activeContact.favorite ? 'Added to favorites.' : 'Removed from favorites.');
        navigateTo('callsScreen', 'contactsView');
      } else if (selected.id === 'emerg') {
        // Toggle Emergency with mock biometrics
        triggerBiometricAuth('Toggle Emergency Contact', 'Verify fingerprint to change security settings.', () => {
          activeContact.emergency = !activeContact.emergency;
          saveDb();
          Haptic.trigger('success');
          Speech.speak(activeContact.emergency ? 'Registered as emergency contact.' : 'Removed from emergency.');
          navigateTo('callsScreen', 'contactsView');
        });
      } else if (selected.id === 'del') {
        triggerBiometricAuth('Delete Contact', 'Verify fingerprint to delete contact.', () => {
          state.db.contacts = state.db.contacts.filter(c => c.id !== activeContact.id);
          saveDb();
          Haptic.trigger('success');
          Speech.speak('Contact deleted.');
          navigateTo('callsScreen', 'contactsView');
        });
      }
    } else if (gesture === 'longPress') {
      navigateTo('callsScreen', 'contactsView');
    }
  }
  else if (state.currentSubScreen === 'favoritesView') {
    if (gesture === 'swipeRight') {
      state.focusedIndex = (state.focusedIndex + 1) % state.focusedItems.length;
      renderFavorites();
    } else if (gesture === 'swipeLeft') {
      state.focusedIndex = (state.focusedIndex - 1 + state.focusedItems.length) % state.focusedItems.length;
      renderFavorites();
    } else if (gesture === 'doubleTap') {
      const c = state.focusedItems[state.focusedIndex];
      startActiveCall(c);
    } else if (gesture === 'longPress') {
      navigateTo('callsScreen', 'callsMenuView');
    }
  }
  else if (state.currentSubScreen === 'recentsView') {
    if (gesture === 'swipeRight') {
      state.focusedIndex = (state.focusedIndex + 1) % state.focusedItems.length;
      renderRecents();
    } else if (gesture === 'swipeLeft') {
      state.focusedIndex = (state.focusedIndex - 1 + state.focusedItems.length) % state.focusedItems.length;
      renderRecents();
    } else if (gesture === 'doubleTap') {
      // Redial
      const recent = state.focusedItems[state.focusedIndex];
      const match = state.db.contacts.find(c => c.name === recent.name) || { name: recent.name, phone: 'Unknown number' };
      startActiveCall(match);
    } else if (gesture === 'longPress') {
      navigateTo('callsScreen', 'callsMenuView');
    }
  }
}

// Active Calling system simulator
function startActiveCall(contact) {
  state.activeCallContact = contact;
  navigateTo('activeCallScreen');
  
  document.getElementById('activeCallName').innerText = contact.name;
  document.getElementById('activeCallTimer').innerText = '00:00';
  document.getElementById('activeCallStatus').innerText = 'Calling...';
  
  Haptic.playSound('ringing');
  logSystem(`Placing call to ${contact.name} (${contact.phone})`, 'action');

  let duration = 0;
  let hasConnected = false;

  state.callTimerInterval = setInterval(() => {
    duration++;
    
    if (!hasConnected && duration >= 3) {
      hasConnected = true;
      Haptic.playSound('connected');
      document.getElementById('activeCallStatus').innerText = 'Connected';
      Speech.speak(`Call with ${contact.name} connected.`);
    }

    if (hasConnected) {
      const mins = String(Math.floor(duration / 60)).padStart(2, '0');
      const secs = String(duration % 60).padStart(2, '0');
      document.getElementById('activeCallTimer').innerText = `${mins}:${secs}`;
    }
  }, 1000);
}

function endCall() {
  if (state.callTimerInterval) clearInterval(state.callTimerInterval);
  
  // Stop ringing sounds
  try {
    document.getElementById('soundCallRinging').pause();
    document.getElementById('soundCallConnected').pause();
  } catch(e) {}

  Haptic.trigger('long');
  Speech.speak('Call disconnected.');
  logSystem('Call ended.', 'action');
  
  // Add to recents
  state.db.recentCalls.unshift({
    id: Date.now(),
    name: state.activeCallContact.name,
    type: 'received',
    time: 'Just now'
  });
  saveDb();

  navigateTo('callsScreen', 'callsMenuView');
}


// --- Camera OCR Module ---
function renderCameraMenu() {
  const items = [
    { id: 'ocr', name: 'Read Text (OCR)' },
    { id: 'obj', name: 'Object Detection' }
  ];
  state.focusedItems = items;

  const ids = ['cameraOptOCR', 'cameraOptObject'];
  ids.forEach((id, idx) => {
    const el = document.getElementById(id);
    if (idx === state.focusedIndex) {
      el.classList.add('focused');
    } else {
      el.classList.remove('focused');
    }
  });
  Speech.speak(items[state.focusedIndex].name);
}

function startCameraActiveViewport() {
  state.isCameraActive = true;
  document.getElementById('cameraToast').style.display = 'none';

  const sceneVal = document.getElementById('ocrSceneSelect').value;
  
  if (sceneVal === 'webcam') {
    document.getElementById('mockSceneView').style.display = 'none';
    document.getElementById('webcamFeed').style.display = 'block';
    
    // Launch real webcam
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        state.webcamStream = stream;
        document.getElementById('webcamFeed').srcObject = stream;
      })
      .catch(err => {
        logSystem('Webcam access denied, falling back to mock scene.', 'error');
        document.getElementById('ocrSceneSelect').value = 'medicine';
        startCameraActiveViewport();
      });
  } else {
    // Show mock scene image
    document.getElementById('webcamFeed').style.display = 'none';
    const mockView = document.getElementById('mockSceneView');
    mockView.style.display = 'block';

    const ocrType = state.focusedItems[state.focusedIndex]?.id || 'ocr';
    if (ocrType === 'ocr') {
      const scenes = {
        'medicine': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80',
        'book': 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&q=80',
        'label': 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&q=80',
        'menu': 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&q=80'
      };
      mockView.style.backgroundImage = `url(${scenes[sceneVal] || scenes.medicine})`;
    } else {
      const objVal = document.getElementById('objectSceneSelect').value;
      const scenes = {
        'chair': 'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=400&q=80',
        'cup': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&q=80',
        'keyboard': 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&q=80'
      };
      mockView.style.backgroundImage = `url(${scenes[objVal] || scenes.chair})`;
    }
  }

  Speech.speak('Camera active. Point your phone and double tap screen to capture.');
}

function stopWebcam() {
  state.isCameraActive = false;
  if (state.webcamStream) {
    state.webcamStream.getTracks().forEach(track => track.stop());
    state.webcamStream = null;
  }
}

function captureCameraImage() {
  Haptic.trigger('success');
  const toast = document.getElementById('cameraToast');
  toast.style.display = 'block';
  toast.innerText = 'Capturing image...';
  
  Speech.speak('Image captured. Analyzing.');
  
  setTimeout(() => {
    toast.innerText = 'Processing OCR...';
    setTimeout(() => {
      navigateTo('cameraScreen', 'cameraResultsView');
    }, 1200);
  }, 1000);
}

function renderCameraResults() {
  const ocrType = state.focusedItems[state.focusedIndex]?.id || 'ocr';
  const display = document.getElementById('cameraResultText');
  let resultText = '';

  if (ocrType === 'ocr') {
    const sceneVal = document.getElementById('ocrSceneSelect').value;
    const texts = {
      'medicine': 'Paracetamol Tablets, 500mg. Take one tablet twice daily with water. Keep out of reach of children.',
      'book': 'Chapter One. The morning mist hung heavy over the quiet valley, concealing the ancient stone castle from sight...',
      'label': 'Fresh Whole Milk. Size: 1 Litre. Price: One dollar ninety-nine cents. Expiry Date: July 24.',
      'menu': 'Today\'s Specials: Pasta Carbonara, twelve dollars. Homemade Lasagna, fourteen dollars. Caprese Salad, ten dollars.'
    };
    resultText = texts[sceneVal] || texts.medicine;
  } else {
    const objVal = document.getElementById('objectSceneSelect').value;
    const items = {
      'chair': 'I detected a wooden office chair directly in front of you, approximately one meter away.',
      'cup': 'I detected a ceramic coffee cup and a closed paper journal on the flat desk table in front of you.',
      'keyboard': 'I detected a computer keyboard and a mouse on a dark desk surface.'
    };
    resultText = items[objVal] || items.chair;
  }

  display.innerText = resultText;
  
  // OCR Options: Speak or Morse
  state.focusedItems = [
    { id: 'speak', name: 'Speak Result (TTS)' },
    { id: 'morse', name: 'Read Morse Haptic' }
  ];
  state.focusedIndex = 0;
  updateCameraResultsUI();
}

function updateCameraResultsUI() {
  const ids = ['cameraActionReadTTS', 'cameraActionReadMorse'];
  ids.forEach((id, idx) => {
    const el = document.getElementById(id);
    if (idx === state.focusedIndex) {
      el.classList.add('focused');
    } else {
      el.classList.remove('focused');
    }
  });
  Speech.speak(state.focusedItems[state.focusedIndex].name);
}

function handleCameraGesture(gesture) {
  if (state.currentSubScreen === 'cameraMenuView') {
    if (gesture === 'swipeRight') {
      state.focusedIndex = (state.focusedIndex + 1) % 2;
      renderCameraMenu();
    } else if (gesture === 'swipeLeft') {
      state.focusedIndex = (state.focusedIndex - 1 + 2) % 2;
      renderCameraMenu();
    } else if (gesture === 'doubleTap') {
      navigateTo('cameraScreen', 'cameraActiveView');
    } else if (gesture === 'longPress') {
      navigateTo('mainMenuScreen');
    }
  }
  else if (state.currentSubScreen === 'cameraActiveView') {
    if (gesture === 'doubleTap') {
      captureCameraImage();
    } else if (gesture === 'longPress') {
      navigateTo('cameraScreen', 'cameraMenuView');
    }
  }
  else if (state.currentSubScreen === 'cameraResultsView') {
    if (gesture === 'swipeRight') {
      state.focusedIndex = (state.focusedIndex + 1) % state.focusedItems.length;
      updateCameraResultsUI();
    } else if (gesture === 'swipeLeft') {
      state.focusedIndex = (state.focusedIndex - 1 + state.focusedItems.length) % state.focusedItems.length;
      updateCameraResultsUI();
    } else if (gesture === 'doubleTap') {
      const selected = state.focusedItems[state.focusedIndex];
      const text = document.getElementById('cameraResultText').innerText;
      if (selected.id === 'speak') {
        Speech.speak(text);
      } else if (selected.id === 'morse') {
        Speech.speak('Converting details to Morse vibrations.');
        setTimeout(() => playMorseString(text), 1500);
      }
    } else if (gesture === 'longPress') {
      navigateTo('cameraScreen', 'cameraActiveView');
    }
  }
}


// --- Navigation Module ---
function renderNavigationMenu() {
  const items = [
    { id: 'dest', name: 'Enter Destination' },
    { id: 'favs', name: 'Saved Places' }
  ];
  state.focusedItems = items;
  
  const ids = ['navOptDestination', 'navOptFavorites'];
  ids.forEach((id, idx) => {
    const el = document.getElementById(id);
    if (idx === state.focusedIndex) {
      el.classList.add('focused');
    } else {
      el.classList.remove('focused');
    }
  });

  Speech.speak(items[state.focusedIndex].name);
}

function startNavigationSpeechSearch() {
  document.getElementById('navDestResult').innerText = 'Saying: "Eurofarm Pharmacy"';
  document.getElementById('navDestStatus').innerText = 'Processing speech input...';
  
  Speech.speak('Please say your destination after the beep.');
  Haptic.playSound('short');

  // Simulating voice speech processing delay
  setTimeout(() => {
    document.getElementById('navDestStatus').innerText = 'Found destination matches!';
    document.getElementById('navDestResult').innerText = '"Eurofarm Pharmacy Center"';
    Speech.speak('Found matches. Double tap to confirm "Eurofarm Pharmacy".');
  }, 2500);
}

function renderNavigationResults() {
  const results = [
    { id: 'eurofarm', name: 'Eurofarm Pharmacy Center', address: '11 October Street, Center' },
    { id: 'clinic', name: 'Eurofarm Clinic', address: 'Partizanska Blvd 80' }
  ];
  state.focusedItems = results;

  const container = document.getElementById('navResultsContainer');
  container.innerHTML = '';

  state.focusedItems.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = `menu-item-card ${index === state.focusedIndex ? 'focused' : ''}`;
    card.innerHTML = `
      <i class="fa-solid fa-map-location-dot"></i>
      <div style="display:flex; flex-direction:column; text-align:left;">
        <span>${item.name}</span>
        <span style="font-size:0.75rem; color:var(--text-secondary); font-weight:normal;">${item.address}</span>
      </div>
    `;
    container.appendChild(card);
  });
  speakFocusedItem();
}

function renderNavigationActions() {
  const selected = state.focusedItems[state.focusedIndex];
  document.getElementById('selectedDestName').innerText = selected.name;

  state.focusedItems = [
    { id: 'start', name: 'Start GPS Navigation' },
    { id: 'call', name: 'Call Location' },
    { id: 'save', name: 'Add to Saved Places' },
    { id: 'share', name: 'Share Location via SMS' }
  ];
  state.focusedIndex = 0;
  updateNavigationActionsUI();
}

function updateNavigationActionsUI() {
  const ids = ['navActionStart', 'navActionCall', 'navActionSave', 'navActionShare'];
  ids.forEach((id, idx) => {
    const el = document.getElementById(id);
    if (idx === state.focusedIndex) {
      el.classList.add('focused');
    } else {
      el.classList.remove('focused');
    }
  });
  Speech.speak(state.focusedItems[state.focusedIndex].name);
}

let routeSimInterval = null;
function startNavigationRoutingSimulation() {
  Speech.speak('Starting navigation routing instructions to Eurofarm.');
  logSystem('Google Maps turn-by-turn routing session initiated.', 'action');

  let step = 0;
  const steps = [
    { dir: 'up', txt: 'Go straight on 11 October Street for 150 meters', dist: '350m' },
    { dir: 'right', txt: 'Turn right at the pharmacy intersection', dist: '200m' },
    { dir: 'up', txt: 'Continue straight for 50 meters. Your destination is on the right.', dist: '50m' },
    { dir: 'check', txt: 'You have arrived at Eurofarm Pharmacy Center.', dist: '0m' }
  ];

  updateRoutingStep(steps[0]);

  routeSimInterval = setInterval(() => {
    step++;
    if (step >= steps.length) {
      clearInterval(routeSimInterval);
      Speech.speak('You have arrived at your destination.');
      setTimeout(() => {
        navigateTo('navigationScreen', 'navMenuView');
      }, 3000);
      return;
    }
    updateRoutingStep(steps[step]);
  }, 4000);
}

function updateRoutingStep(data) {
  const arrow = document.getElementById('routingTurnArrow');
  if (data.dir === 'up') arrow.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
  else if (data.dir === 'right') arrow.innerHTML = '<i class="fa-solid fa-arrow-right"></i>';
  else if (data.dir === 'check') arrow.innerHTML = '<i class="fa-solid fa-circle-check" style="color:var(--accent-success)"></i>';
  
  document.getElementById('routingInstruction').innerText = data.txt;
  document.getElementById('routingDistance').innerText = `ETA: ${data.dist === '0m' ? 'Arrived' : 'Calculating'} • ${data.dist}`;
  
  Speech.speak(data.txt);
  Haptic.trigger('short');
}

function handleNavigationGesture(gesture) {
  if (state.currentSubScreen === 'navMenuView') {
    if (gesture === 'swipeRight') {
      state.focusedIndex = (state.focusedIndex + 1) % 2;
      renderNavigationMenu();
    } else if (gesture === 'swipeLeft') {
      state.focusedIndex = (state.focusedIndex - 1 + 2) % 2;
      renderNavigationMenu();
    } else if (gesture === 'doubleTap') {
      if (state.focusedIndex === 0) navigateTo('navigationScreen', 'navDestinationInputView');
      if (state.focusedIndex === 1) {
        // Show saved places
        state.focusedItems = state.db.savedPlaces;
        navigateTo('navigationScreen', 'navResultsView');
      }
    } else if (gesture === 'longPress') {
      navigateTo('mainMenuScreen');
    }
  }
  else if (state.currentSubScreen === 'navDestinationInputView') {
    if (gesture === 'doubleTap') {
      // Confirm input
      Haptic.trigger('success');
      state.focusedIndex = 0;
      navigateTo('navigationScreen', 'navResultsView');
    } else if (gesture === 'longPress') {
      navigateTo('navigationScreen', 'navMenuView');
    }
  }
  else if (state.currentSubScreen === 'navResultsView') {
    if (gesture === 'swipeRight') {
      state.focusedIndex = (state.focusedIndex + 1) % state.focusedItems.length;
      renderNavigationResults();
    } else if (gesture === 'swipeLeft') {
      state.focusedIndex = (state.focusedIndex - 1 + state.focusedItems.length) % state.focusedItems.length;
      renderNavigationResults();
    } else if (gesture === 'doubleTap') {
      navigateTo('navigationScreen', 'navActionsView');
    } else if (gesture === 'longPress') {
      navigateTo('navigationScreen', 'navMenuView');
    }
  }
  else if (state.currentSubScreen === 'navActionsView') {
    if (gesture === 'swipeRight') {
      state.focusedIndex = (state.focusedIndex + 1) % state.focusedItems.length;
      updateNavigationActionsUI();
    } else if (gesture === 'swipeLeft') {
      state.focusedIndex = (state.focusedIndex - 1 + state.focusedItems.length) % state.focusedItems.length;
      updateNavigationActionsUI();
    } else if (gesture === 'doubleTap') {
      const selected = state.focusedItems[state.focusedIndex];
      const activePlace = document.getElementById('selectedDestName').innerText;
      
      if (selected.id === 'start') {
        navigateTo('navigationScreen', 'navActiveRoutingView');
      } else if (selected.id === 'call') {
        startActiveCall({ name: activePlace, phone: '+389 2 3200 900' });
      } else if (selected.id === 'save') {
        // Save to place list
        state.db.savedPlaces.push({ id: Date.now(), name: activePlace, address: 'Google Maps Link' });
        saveDb();
        Haptic.trigger('success');
        Speech.speak('Saved location.');
        navigateTo('navigationScreen', 'navMenuView');
      } else if (selected.id === 'share') {
        // Share via mock SMS
        Haptic.trigger('success');
        Speech.speak('Location shared via SMS.');
        logSystem(`Location shared with Mother: "https://maps.google.com/?q=Eurofarm+Pharmacy"`, 'sms');
        navigateTo('navigationScreen', 'navMenuView');
      }
    } else if (gesture === 'longPress') {
      navigateTo('navigationScreen', 'navResultsView');
    }
  }
  else if (state.currentSubScreen === 'navActiveRoutingView') {
    if (gesture === 'longPress') {
      if (routeSimInterval) clearInterval(routeSimInterval);
      Haptic.trigger('long');
      Speech.speak('GPS session terminated.');
      navigateTo('navigationScreen', 'navMenuView');
    }
  }
}


// --- Settings Module ---
function renderSettingsMenu() {
  const items = [
    { id: 'access', name: 'Accessibility Config' },
    { id: 'quick', name: 'Quick Access Setup' },
    { id: 'emerg', name: 'Emergency Contacts Setup' }
  ];
  state.focusedItems = items;

  const ids = ['settingsOptAccessibility', 'settingsOptQuick', 'settingsOptEmergency'];
  ids.forEach((id, idx) => {
    const el = document.getElementById(id);
    if (idx === state.focusedIndex) {
      el.classList.add('focused');
    } else {
      el.classList.remove('focused');
    }
  });
  Speech.speak(items[state.focusedIndex].name);
}

function renderAccessibilitySettings() {
  document.getElementById('lblReadingModeVal').innerText = state.db.settings.readingMode.toUpperCase();
  document.getElementById('lblPrivacyModeVal').innerText = state.db.settings.privacyMode.toUpperCase();
  document.getElementById('lblVibeVal').innerText = state.db.settings.vibeIntensity.toUpperCase();
  document.getElementById('vibeIntensityRange').value = state.db.settings.vibeIntensity === 'low' ? 1 : state.db.settings.vibeIntensity === 'high' ? 3 : 2;

  state.focusedItems = [
    { id: 'read', name: 'Reading Mode: ' + state.db.settings.readingMode },
    { id: 'privacy', name: 'Privacy Mode: ' + state.db.settings.privacyMode },
    { id: 'intensity', name: 'Vibration Intensity: ' + state.db.settings.vibeIntensity }
  ];
  state.focusedIndex = 0;
  updateAccessibilitySettingsUI();
}

function updateAccessibilitySettingsUI() {
  const ids = ['setOptReadingMode', 'setOptPrivacyMode', 'vibeIntensityRange'];
  ids.forEach((id, idx) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (idx === state.focusedIndex) {
      el.classList.add('focused');
    } else {
      el.classList.remove('focused');
    }
  });

  const card = state.focusedItems[state.focusedIndex];
  Speech.speak(card.name);
}

function renderQuickAccessSettings() {
  const actions = [
    { id: 'call_mother', name: 'Quick Call Mother' },
    { id: 'nav_home', name: 'Quick Navigate Home' },
    { id: 'sos_trigger', name: 'Quick SOS Activation' }
  ];
  state.focusedItems = actions;

  const container = document.getElementById('quickAccessConfigContainer');
  container.innerHTML = '';

  state.focusedItems.forEach((act, idx) => {
    const isConfigured = state.db.settings.quickAccess.includes(act.id);
    const card = document.createElement('div');
    card.className = `setting-item-card ${idx === state.focusedIndex ? 'focused' : ''}`;
    card.innerHTML = `
      <span>${act.name}</span>
      <i class="fa-solid ${isConfigured ? 'fa-toggle-on' : 'fa-toggle-off'}" style="color:${isConfigured ? 'var(--accent-success)' : 'var(--text-secondary)'}; font-size:1.4rem;"></i>
    `;
    container.appendChild(card);
  });

  Speech.speak(`${actions[state.focusedIndex].name}. ${state.db.settings.quickAccess.includes(actions[state.focusedIndex].id) ? 'Enabled' : 'Disabled'}`);
}

function renderEmergencySettings() {
  const container = document.getElementById('emergencySettingsContainer');
  container.innerHTML = '';

  state.focusedItems = state.db.contacts;

  state.focusedItems.forEach((c, idx) => {
    const card = document.createElement('div');
    card.className = `setting-item-card ${idx === state.focusedIndex ? 'focused' : ''}`;
    card.innerHTML = `
      <span>🚨 ${c.name}</span>
      <i class="fa-solid ${c.emergency ? 'fa-square-check' : 'fa-square'}" style="color:${c.emergency ? 'var(--accent-danger)' : 'var(--text-secondary)'}; font-size:1.4rem;"></i>
    `;
    container.appendChild(card);
  });

  Speech.speak(`${state.focusedItems[state.focusedIndex].name}. ${state.focusedItems[state.focusedIndex].emergency ? 'SOS contact' : 'Not SOS contact'}`);
}

function handleSettingsGesture(gesture) {
  if (state.currentSubScreen === 'settingsMenuView') {
    if (gesture === 'swipeRight') {
      state.focusedIndex = (state.focusedIndex + 1) % 3;
      renderSettingsMenu();
    } else if (gesture === 'swipeLeft') {
      state.focusedIndex = (state.focusedIndex - 1 + 3) % 3;
      renderSettingsMenu();
    } else if (gesture === 'doubleTap') {
      Haptic.trigger('success');
      if (state.focusedIndex === 0) navigateTo('settingsScreen', 'accessibilitySettingsView');
      if (state.focusedIndex === 1) navigateTo('settingsScreen', 'quickAccessSettingsView');
      if (state.focusedIndex === 2) {
        // Emergency contact editing requires biometric verification
        triggerBiometricAuth('Manage SOS Contacts', 'Biometric credential required to alter emergency contacts list.', () => {
          navigateTo('settingsScreen', 'emergencySettingsView');
        });
      }
    } else if (gesture === 'longPress') {
      navigateTo('mainMenuScreen');
    }
  }
  else if (state.currentSubScreen === 'accessibilitySettingsView') {
    if (gesture === 'swipeRight') {
      state.focusedIndex = (state.focusedIndex + 1) % 3;
      updateAccessibilitySettingsUI();
    } else if (gesture === 'swipeLeft') {
      state.focusedIndex = (state.focusedIndex - 1 + 3) % 3;
      updateAccessibilitySettingsUI();
    } else if (gesture === 'doubleTap') {
      const selected = state.focusedItems[state.focusedIndex];
      Haptic.trigger('success');

      if (selected.id.startsWith('read')) {
        const modes = ['voice', 'morse', 'combined'];
        const currentIdx = modes.indexOf(state.db.settings.readingMode);
        const next = modes[(currentIdx + 1) % 3];
        state.db.settings.readingMode = next;
        saveDb();
        renderAccessibilitySettings();
      } else if (selected.id.startsWith('privacy')) {
        state.db.settings.privacyMode = state.db.settings.privacyMode === 'auto' ? 'off' : 'auto';
        saveDb();
        renderAccessibilitySettings();
      } else if (selected.id.startsWith('intensity')) {
        const levels = ['low', 'medium', 'high'];
        const currentIdx = levels.indexOf(state.db.settings.vibeIntensity);
        const next = levels[(currentIdx + 1) % 3];
        state.db.settings.vibeIntensity = next;
        saveDb();
        renderAccessibilitySettings();
      }
    } else if (gesture === 'longPress') {
      navigateTo('settingsScreen', 'settingsMenuView');
    }
  }
  else if (state.currentSubScreen === 'quickAccessSettingsView') {
    if (gesture === 'swipeRight') {
      state.focusedIndex = (state.focusedIndex + 1) % state.focusedItems.length;
      renderQuickAccessSettings();
    } else if (gesture === 'swipeLeft') {
      state.focusedIndex = (state.focusedIndex - 1 + state.focusedItems.length) % state.focusedItems.length;
      renderQuickAccessSettings();
    } else if (gesture === 'doubleTap') {
      const act = state.focusedItems[state.focusedIndex];
      Haptic.trigger('success');

      if (state.db.settings.quickAccess.includes(act.id)) {
        state.db.settings.quickAccess = state.db.settings.quickAccess.filter(id => id !== act.id);
      } else {
        state.db.settings.quickAccess.push(act.id);
      }
      saveDb();
      renderQuickAccessSettings();
    } else if (gesture === 'longPress') {
      navigateTo('settingsScreen', 'settingsMenuView');
    }
  }
  else if (state.currentSubScreen === 'emergencySettingsView') {
    if (gesture === 'swipeRight') {
      state.focusedIndex = (state.focusedIndex + 1) % state.focusedItems.length;
      renderEmergencySettings();
    } else if (gesture === 'swipeLeft') {
      state.focusedIndex = (state.focusedIndex - 1 + state.focusedItems.length) % state.focusedItems.length;
      renderEmergencySettings();
    } else if (gesture === 'doubleTap') {
      const contact = state.focusedItems[state.focusedIndex];
      Haptic.trigger('success');
      
      contact.emergency = !contact.emergency;
      saveDb();
      renderEmergencySettings();
    } else if (gesture === 'longPress') {
      navigateTo('settingsScreen', 'settingsMenuView');
    }
  }
}


// ==========================================
// 9. SOS EMERGENCY SYSTEM
// ==========================================

function triggerSOS() {
  if (state.currentScreen === 'sosScreen') return; // already active

  Speech.stop();
  navigateTo('sosScreen');

  state.sosCountdownValue = 3;
  state.sosIsDispatched = false;

  document.getElementById('sosCountdownBox').innerText = '3';
  document.getElementById('sosCountdownBox').style.display = 'block';
  document.getElementById('sosInstructionsText').innerText = 'HOLD DOWN SCREEN TO CANCEL';
  document.getElementById('sosDispatchedInfo').style.display = 'none';

  Speech.speak('S O S triggered. Shaking detected. Initializing emergency countdown. Hold down screen to cancel.');
  
  Haptic.trigger('error');
  
  state.sosCountdownTimer = setInterval(() => {
    state.sosCountdownValue--;
    
    if (state.sosCountdownValue > 0) {
      document.getElementById('sosCountdownBox').innerText = state.sosCountdownValue;
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
  
  // Stop sirens
  try {
    document.getElementById('soundSiren').pause();
  } catch(e) {}

  Haptic.trigger('long');
  Speech.speak('S O S cancelled. Returning to main menu.');
  logSystem('SOS emergency bypass active. SOS alerts terminated.', 'error');
  navigateTo('mainMenuScreen');
}

function dispatchSOSAlerts() {
  state.sosIsDispatched = true;
  document.getElementById('sosCountdownBox').style.display = 'none';
  document.getElementById('sosInstructionsText').innerText = 'SOS ACTIVE • LONG PRESS TO CANCEL';
  
  const dispatched = document.getElementById('sosDispatchedInfo');
  dispatched.style.display = 'flex';

  // Play siren sound loop
  if (!state.isMuted) {
    try {
      const siren = document.getElementById('soundSiren');
      siren.currentTime = 0;
      siren.volume = 0.8;
      siren.play().catch(e => console.log(e));
    } catch(e) {}
  }

  // Get Emergency list
  const sosContacts = state.db.contacts.filter(c => c.emergency);
  const names = sosContacts.map(c => c.name).join(', ') || 'No emergency contacts registered';
  document.getElementById('sosPrimaryEmergencyContact').innerText = names;

  // Log SMS
  sosContacts.forEach(c => {
    logSystem(`SOS Dispatched to ${c.name} (${c.phone}): "Emergency alert! I need help. Location: https://maps.google.com/?q=42.0012,21.4316"`, 'sms');
  });

  Speech.speak('S O S Alert dispatched to emergency contacts! Flashing help details on screen.');
}


// ==========================================
// 10. BIOMETRIC AUTHENTICATION SIMULATION
// ==========================================

let onBioSuccessCallback = null;

function triggerBiometricAuth(title, text, onSuccessCallback) {
  onBioSuccessCallback = onSuccessCallback;
  
  navigateTo('mainMenuScreen'); // Overlay shows on top of active, but keep behind active screen
  const modal = document.getElementById('biometricOverlay');
  modal.classList.add('active');

  document.getElementById('bioPromptTitle').innerText = title;
  document.getElementById('bioPromptText').innerText = text;

  // Alternate visual between Face ID and Touch ID randomly to show support
  const showFace = Math.random() > 0.5;
  if (showFace) {
    document.getElementById('bioFaceIdIcon').classList.remove('hidden');
    document.getElementById('bioTouchIdIcon').classList.add('hidden');
    Speech.speak('Face ID scanning. Please look at the camera.');
  } else {
    document.getElementById('bioFaceIdIcon').classList.add('hidden');
    document.getElementById('bioTouchIdIcon').classList.remove('hidden');
    Speech.speak('Touch ID scanning. Please place your finger on the sensor.');
  }
}

document.getElementById('btnSimulateBioSuccess').addEventListener('click', () => {
  document.getElementById('biometricOverlay').classList.remove('active');
  Haptic.trigger('success');
  Speech.speak('Identity verified successfully.');
  logSystem('Biometric authentication succeeded.', 'system');
  if (onBioSuccessCallback) {
    onBioSuccessCallback();
    onBioSuccessCallback = null;
  }
});

document.getElementById('btnSimulateBioFail').addEventListener('click', () => {
  document.getElementById('biometricOverlay').classList.remove('active');
  Haptic.trigger('error');
  Speech.speak('Authentication failed. Access denied.');
  logSystem('Biometric authentication failed.', 'error');
  onBioSuccessCallback = null;
});


// ==========================================
// 11. QUICK ACCESS OVERLAY SYSTEM
// ==========================================

function toggleQuickAccess(open) {
  const overlay = document.getElementById('quickAccessOverlay');
  if (open) {
    overlay.classList.add('active');
    Speech.speak('Quick access shortcuts menu open.');
    renderQuickAccessItems();
  } else {
    overlay.classList.remove('active');
    Speech.speak('Quick access closed.');
  }
}

function renderQuickAccessItems() {
  const container = document.getElementById('quickAccessItemsContainer');
  container.innerHTML = '';

  const configured = state.db.settings.quickAccess;
  const items = [];
  
  if (configured.includes('call_mother')) {
    items.push({ id: 'qa_call', name: 'Call Mother', icon: 'fa-phone' });
  }
  if (configured.includes('nav_home')) {
    items.push({ id: 'qa_nav', name: 'Navigate Home', icon: 'fa-location-arrow' });
  }
  if (configured.includes('sos_trigger')) {
    items.push({ id: 'qa_sos', name: 'Trigger SOS Alert', icon: 'fa-triangle-exclamation' });
  }

  if (items.length === 0) {
    container.innerHTML = `<div class="action-card"><span>No quick actions setup.</span></div>`;
    state.focusedItems = [];
    Speech.speak('No quick actions configured in settings.');
    return;
  }

  state.focusedItems = items;
  state.focusedIndex = 0;

  items.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = `action-card ${idx === state.focusedIndex ? 'focused' : ''}`;
    card.innerHTML = `
      <i class="fa-solid ${item.icon}"></i>
      <span>${item.name}</span>
    `;
    container.appendChild(card);
  });
  Speech.speak(items[0].name);
}

function handleQuickAccessNavigation(gesture) {
  if (state.focusedItems.length === 0) {
    if (gesture === 'swipeUp' || gesture === 'longPress') toggleQuickAccess(false);
    return;
  }

  if (gesture === 'swipeRight') {
    state.focusedIndex = (state.focusedIndex + 1) % state.focusedItems.length;
    renderQuickAccessItems();
  } 
  else if (gesture === 'swipeLeft') {
    state.focusedIndex = (state.focusedIndex - 1 + state.focusedItems.length) % state.focusedItems.length;
    renderQuickAccessItems();
  } 
  else if (gesture === 'doubleTap') {
    const selected = state.focusedItems[state.focusedIndex];
    toggleQuickAccess(false);
    
    if (selected.id === 'qa_call') {
      const c = state.db.contacts.find(con => con.name === 'Mother');
      startActiveCall(c);
    } else if (selected.id === 'qa_nav') {
      state.focusedItems = [{ name: 'Home', address: 'Partizanska 45' }];
      state.focusedIndex = 0;
      navigateTo('navigationScreen', 'navActiveRoutingView');
    } else if (selected.id === 'qa_sos') {
      triggerSOS();
    }
  } 
  else if (gesture === 'swipeUp' || gesture === 'longPress') {
    toggleQuickAccess(false);
  }
}


// ==========================================
// 12. RUN INITIALIZATIONS & TRIGGERS
// ==========================================

// Physical notch shake simulation click
document.getElementById('btnSimulateShake').addEventListener('click', () => {
  logSystem('Double Shake motion sensor detected.', 'input');
  triggerSOS();
});

// Hardware lock simulate lock Screen
document.getElementById('btnSimulateBioLock').addEventListener('click', () => {
  logSystem('Screen locked with biometrics.', 'system');
  triggerBiometricAuth('Application Locked', 'Authentication required to unlock BlindTouch launcher.', () => {
    navigateTo('mainMenuScreen');
  });
});

// Setup click selectors for welcome screen buttons
document.getElementById('startTutorialBtn').addEventListener('click', () => {
  Haptic.trigger('success');
  startTutorial();
});

document.getElementById('skipTutorialBtn').addEventListener('click', () => {
  Haptic.trigger('success');
  navigateTo('mainMenuScreen');
});

// Load Handwriting Dialer drawing bindings
Handwriting.init();

// Load Gestures manager listeners
GestureManager.init();

// Initialize welcoming speech synthesis
window.onload = () => {
  logSystem('BlindTouch launcher engine booted successfully.', 'system');
  Speech.speak('Welcome to BlindTouch accessibility platform simulator. Double tap screen to open tutorial.');
};
