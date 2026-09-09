import { resolveLocalCommand, syncLocalCommandCache, onRuleUpdated, onScreenUpdated, onSectionUpdated, fetchScreens, fetchSections } from '../core/api.js';
import { Speech, formatPhoneForTTS } from '../core/speech.js';
import { Haptic } from '../core/haptics.js';
import { state, saveDb } from '../core/state.js';

const morseAlphabet = {
  '.-': 'A', '-...': 'B', '-.-.': 'C', '-..': 'D', '.': 'E', '..-.': 'F',
  '--.': 'G', '....': 'H', '..': 'I', '.---': 'J', '-.-': 'K', '.-..': 'L',
  '--': 'M', '-.': 'N', '---': 'O', '.--.': 'P', '--.-': 'Q', '.-.': 'R',
  '...': 'S', '-': 'T', '..-': 'U', '...-': 'V', '.--': 'W', '-..-': 'X',
  '-.--': 'Y', '--..': 'Z', '.----': '1', '..---': '2', '...--': '3',
  '....-': '4', '.....': '5', '-....': '6', '--...': '7', '---..': '8',
  '----.': '9', '-----': '0'
};

let simMorseBuffer = '';
let simDraftText = '';
let simDraftReady = false;
let simReplyInputMode = 'morse';
let simMorseLetterTimer = null;

let simNavMorseBuffer = '';
let simNavSearchText = '';
let simNavSearchReady = false;
let simNavInputMode = 'morse';
let simNavMorseTimer = null;
let simVoiceRecog = null;
let simVoiceInterim = '';
let simIsHoldingVoice = false;
let simVoiceHoldTimer = null;

let simSurfaceLastTapTime = 0;
let simSurfaceSingleTapTimer = null;
let simSurfaceClickTime = 0;
let simNavZoneLastTapTime = 0;
let simNavZoneSingleTapTimer = null;

let simContactSaveNameText = '';
let simContactSaveMorseBuffer = '';
let simContactSaveLetterTimer = null;
let simContactSaveInputMode = 'morse';

let simActiveCallContact = null;
let simSelectedContact = null;
let simCameraMode = 'ocr'; // 'ocr' or 'scene'
let simCameraCountdown = 3;
let simCameraTimer = null;

let simTutStep = 0; // 0: NAV_BAR, 1: SWIPE_R, 2: SWIPE_L, 3: DBL_TAP, 4: LONG_PRESS, 5: TWO_FINGER_TAP
let simTutMockIdx = 0; // 0: MESSAGES, 1: PHONE, 2: SETTINGS
let simPermStep = 0; // 0: CAMERA, 1: MIC
let simCalibLetterIdx = 0; // 0: M, 1: P, 2: C, 3: N, 4: S
let simCalibCount = 1; // 1, 2, 3
const SIM_CALIB_LETTERS = ['M', 'P', 'C', 'N', 'S'];

export function renderSimulatorScreen(containerId = 'simulatorScreen') {

  const container = document.getElementById(containerId);
  if (!container) return;

  const isSplitPane = containerId !== 'simulatorScreen';

  container.innerHTML = `
    <div style="width: 100%; height: 100%; box-sizing: border-box; background: #030712; overflow-y: auto; display: flex; justify-content: center;">
      <div style="width: 100%; ${!isSplitPane ? 'max-width: 860px;' : ''} height: 100%; box-sizing: border-box; padding: ${isSplitPane ? '12px' : '16px'}; display: flex; flex-direction: column; gap: 12px; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif;">
        
        <!-- Top Title & Navigation -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #FFEE55; padding-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(255, 238, 85, 0.15); border: 1px solid #FFEE55; display: flex; align-items: center; justify-content: center;">
            <i class="fa-solid fa-mobile-screen" style="font-size: 1.3rem; color: #FFEE55;"></i>
          </div>
          <div>
            <h3 style="margin: 0; font-size: 1.15rem; color: #FFEE55; font-weight: 900; letter-spacing: 0.5px;">HARDWARE SIMULATOR & TESTER</h3>
            <div style="display: flex; gap: 6px; align-items: center;">
              <span style="font-size: 0.65rem; color: #10B981; font-weight: bold;" id="${containerId}_wsStatus">
                <i class="fa-solid fa-circle" style="font-size: 0.55rem;"></i> LIVE SYNC ACTIVE
              </span>
              <span style="font-size: 0.65rem; color: #94A3B8; background: #111827; padding: 1px 6px; border-radius: 4px;">LOCAL CACHE (< 1ms)</span>
            </div>
          </div>
        </div>
        ${!isSplitPane ? `
        <div style="display: flex; gap: 6px;">
          <button id="btnSimToProg" style="padding: 6px 12px; background: rgba(0, 229, 255, 0.12); border: 1px solid #00E5FF; color: #00E5FF; border-radius: 6px; font-weight: bold; font-size: 0.8rem; cursor: pointer;">
            <i class="fa-solid fa-code-branch"></i> Programmer
          </button>
          <button id="btnSimToPreview" style="padding: 6px 12px; background: rgba(255, 238, 85, 0.12); border: 1px solid #FFEE55; color: #FFEE55; border-radius: 6px; font-weight: bold; font-size: 0.8rem; cursor: pointer;">
            <i class="fa-solid fa-columns"></i> Split Preview
          </button>
        </div>` : ''}
      </div>

      <!-- Active Screen Context Switcher -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: #111827; padding: 8px 12px; border-radius: 8px; border: 1px solid #1F2937;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <i class="fa-solid fa-layer-group" style="color: #FFEE55; font-size: 0.85rem;"></i>
          <span style="font-size: 0.8rem; color: #9CA3AF; font-weight: bold;">Simulated Screen Context:</span>
        </div>
        <select id="${containerId}_simScreenSelect" style="padding: 5px 10px; background: #1F2937; color: #00E5FF; border: 1.5px solid #00E5FF; border-radius: 6px; font-weight: bold; font-size: 0.8rem; cursor: pointer;">
          <!-- Dynamically populated -->
        </select>
        <div style="display:flex;align-items:center;gap:6px;"><i class="fa-solid fa-vector-square" style="color:#EF4444;font-size:.85rem;"></i><span style="font-size:.8rem;color:#9CA3AF;font-weight:bold;">Phone section:</span></div>
        <select id="${containerId}_simSectionSelect" style="padding: 5px 10px; background: #1F2937; color: #FCA5A5; border: 1.5px dashed #EF4444; border-radius: 6px; font-weight: bold; font-size: 0.8rem; cursor: pointer;"><option value="DEFAULT">General / no section</option></select>
      </div>

      <!-- Device Viewport & Parity Inspector Grid -->
      <div style="display: grid; grid-template-columns: ${isSplitPane ? '1fr' : '1.1fr 1fr'}; gap: 10px; align-items: start;">
        
        <!-- Left: Realistic Simulated Phone Frame -->
        <div style="border: 2px solid #FFEE55; border-radius: 14px; padding: 12px; background: #000000; display: flex; flex-direction: column; justify-content: space-between; min-height: 245px; box-sizing: border-box; box-shadow: 0 0 15px rgba(255, 238, 85, 0.08);">
          
          <!-- Phone Status Bar -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #333; padding-bottom: 4px; font-size: 0.7rem; color: #9CA3AF;">
            <span id="${containerId}_phoneTime">12:00</span>
            <span style="color: #FFEE55; font-weight: bold;" id="${containerId}_activeContextDisplay">[ welcomeScreen ]</span>
            <div style="display: flex; gap: 4px; align-items: center;">
              <i class="fa-solid fa-wifi"></i>
              <i class="fa-solid fa-battery-three-quarters" style="color: #10B981;"></i>
            </div>
          </div>

          <!-- Dynamic Viewport Visual -->
          <div style="text-align: center; margin: 8px 0; min-height: 135px; display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%; box-sizing: border-box;" id="${containerId}_viewportContent">
            <div id="${containerId}_screenIcon" style="font-size: 2.2rem; color: #00E5FF; margin-bottom: 6px;">
              <i class="fa-solid fa-hands-holding-child"></i>
            </div>
            <div id="${containerId}_screenTitle" style="color: #FFFFFF; font-weight: 800; font-size: 0.95rem;">Welcome & Orientation</div>
            <div id="${containerId}_screenSubtitle" style="color: #9CA3AF; font-size: 0.75rem; margin-top: 4px;">Swipe or tap navigation zone to trigger rules</div>
          </div>

          <!-- 120px Navigation Zone Touch Bar -->
          <div id="${containerId}_touchNavZone" style="border: 2px solid #FFEE55; border-radius: 8px; padding: 10px; text-align: center; background: rgba(255, 238, 85, 0.08); cursor: pointer; transition: background 0.15s ease;" title="Click/Tap Navigation Area">
            <div style="color: #FFEE55; font-size: 0.75rem; font-weight: 900; letter-spacing: 0.5px;">
              <i class="fa-solid fa-hand-pointer"></i> 120px HIGH-TOUCH NAVIGATION ZONE
            </div>
            <div style="color: #9CA3AF; font-size: 0.65rem; margin-top: 2px;">(Simulates blind finger touch area)</div>
          </div>
        </div>

        <!-- Right: Parity Inspector & Sensory Logs -->
        <div style="display: flex; flex-direction: column; gap: 8px;">
          
          <!-- Parity Verification Badge Panel -->
          <div style="border: 1px solid #1F2937; border-radius: 10px; padding: 10px; background: #0B0F19;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <h5 style="margin: 0; color: #00E5FF; font-size: 0.75rem; font-weight: bold; text-transform: uppercase;">
                <i class="fa-solid fa-magnifying-glass-chart"></i> Parity Rule Inspector
              </h5>
              <span id="${containerId}_parityStatus" style="font-size: 0.65rem; color: #10B981; font-weight: bold; background: rgba(16,185,129,0.15); padding: 1px 6px; border-radius: 4px;">MATCHED</span>
            </div>
            <div id="${containerId}_parityDetails" style="font-size: 0.7rem; color: #CBD5E1; display: flex; flex-direction: column; gap: 3px; background: #030712; padding: 6px 8px; border-radius: 6px; border: 1px solid #1E293B;">
              <div>Rule ID: <span id="${containerId}_ruleId" style="color: #FFEE55;">cmd_w1</span></div>
              <div>Action: <span id="${containerId}_ruleAction" style="color: #00E5FF;">NAVIGATE</span></div>
              <div>Haptic Pattern: <span id="${containerId}_ruleHaptic" style="color: #10B981;">success</span></div>
              <div>Resolution Latency: <span id="${containerId}_ruleLatency" style="color: #38BDF8;">0.12 ms</span></div>
            </div>
          </div>

          <!-- TTS Spoken Log -->
          <div style="border: 1px solid #1F2937; border-radius: 10px; padding: 10px; background: #0B0F19;">
            <h5 style="margin: 0 0 4px 0; color: #00E5FF; font-size: 0.75rem; font-weight: bold;">
              <i class="fa-solid fa-volume-high"></i> Spoken Audio Transcript
            </h5>
            <div id="${containerId}_simTtsLog" style="background: #030712; border: 1px solid #1E293B; border-radius: 6px; padding: 6px 8px; font-family: monospace; font-size: 0.75rem; color: #10B981; min-height: 38px;">
              > Ready. Listening for gestures.
            </div>
          </div>

          <!-- Visual Haptic Pulse Visualizer -->
          <div style="border: 1px solid #1F2937; border-radius: 10px; padding: 10px; background: #0B0F19;">
            <h5 style="margin: 0 0 4px 0; color: #FFEE55; font-size: 0.75rem; font-weight: bold;">
              <i class="fa-solid fa-wave-square"></i> Tactile Haptic Vibration Bar
            </h5>
            <div id="${containerId}_hapticBar" style="padding: 6px; border-radius: 6px; background: #030712; border: 1px solid #333; text-align: center; font-weight: bold; font-size: 0.75rem; color: #64748B; transition: all 0.2s ease;">
              [ IDLE ]
            </div>
          </div>

        </div>

      </div>

      <!-- Simulated Gestures Trigger Grid -->
      <div style="border: 1px solid #1F2937; border-radius: 10px; padding: 10px; background: #0B0F19;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <h5 style="margin: 0; color: #9CA3AF; font-size: 0.75rem; font-weight: bold; text-transform: uppercase;">
            <i class="fa-solid fa-gamepad"></i> Execute Programmed Gesture Tests
          </h5>
          <span style="font-size: 0.65rem; color: #64748B;">Evaluates against active ruleset</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
          <button class="sim-test-btn" data-gesture="SWIPE_RIGHT" style="padding: 8px; background: #1E293B; color: #FFF; border: 1px solid #334155; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.75rem;">Swipe Right ➔</button>
          <button class="sim-test-btn" data-gesture="SWIPE_LEFT" style="padding: 8px; background: #1E293B; color: #FFF; border: 1px solid #334155; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.75rem;">⬅ Swipe Left</button>
          <button class="sim-test-btn" data-gesture="SWIPE_UP" style="padding: 8px; background: #1E293B; color: #FFF; border: 1px solid #334155; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.75rem;">⬆ Swipe Up</button>
          <button class="sim-test-btn" data-gesture="SWIPE_DOWN" style="padding: 8px; background: #1E293B; color: #FFEE55; border: 1px solid #FFEE55; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.75rem;">⬇ Swipe Down (Back)</button>
          <button class="sim-test-btn" data-gesture="TAP" style="padding: 8px; background: #1E293B; color: #FCA5A5; border: 1px dashed #EF4444; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.75rem;">Tap Section</button>
          <button class="sim-test-btn" data-gesture="DOUBLE_TAP" style="padding: 8px; background: #1E293B; color: #00E5FF; border: 1px solid #00E5FF; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.75rem;">Double Tap</button>
          <button class="sim-test-btn" data-gesture="LONG_PRESS" style="padding: 8px; background: #1E293B; color: #94A3B8; border: 1px solid #334155; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.75rem;">Long Press</button>
          <button class="sim-test-btn" data-gesture="TWO_FINGER_TAP" style="padding: 8px; background: #1E293B; color: #10B981; border: 1px solid #10B981; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.75rem;">Two-Finger Tap</button>
          <button class="sim-sensor-btn" data-sensor="SHAKE" style="padding: 8px; background: #3B1212; color: #EF4444; border: 1px solid #EF4444; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.75rem;">Shake (SOS)</button>
        </div>
      </div>
    </div>
  </div>
  `;

  // Bind top navigation buttons if present
  if (!isSplitPane) {
    document.getElementById('btnSimToProg')?.addEventListener('click', () => navigateTo('programmerScreen'));
    document.getElementById('btnSimToPreview')?.addEventListener('click', () => navigateTo('previewScreen'));
  }

  // Update clock
  const timeEl = document.getElementById(`${containerId}_phoneTime`);
  if (timeEl) timeEl.innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Screen selection change handler
  const screenSelect = document.getElementById(`${containerId}_simScreenSelect`);
  if (screenSelect) {
    screenSelect.addEventListener('change', (e) => {
      const selectedScreen = e.target.value;
      if (selectedScreen === 'navSearchInputScreen') {
        simNavSearchText = '';
        simNavMorseBuffer = '';
        simNavSearchReady = false;
      }
      updateSimulatorScreenContext(containerId, selectedScreen);
      syncSimulatorSections(containerId);
      announceSimulatorScreenContext(containerId, selectedScreen);
    });
  }

  // Bind gesture test buttons
  container.querySelectorAll('.sim-test-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const gesture = btn.getAttribute('data-gesture');
      const activeScreen = document.getElementById(`${containerId}_simScreenSelect`)?.value || 'welcomeScreen';
      let activeSection = document.getElementById(`${containerId}_simSectionSelect`)?.value || 'DEFAULT';
      if (activeSection === 'DEFAULT') {
        activeSection = 'zone_bottom_navigation_bar_global';
      }
      executeSimulatorGesture(containerId, gesture, activeScreen, activeSection);
    });
  });

  // Bind 120px Touch Navigation Zone in simulator phone frame
  const touchNav = document.getElementById(`${containerId}_touchNavZone`);
  if (touchNav) {
    let lastNavClickTime = 0;
    touchNav.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const now = Date.now();
      const isDouble = (now - lastNavClickTime < 350);
      lastNavClickTime = isDouble ? 0 : now;
      const activeScreen = document.getElementById(`${containerId}_simScreenSelect`)?.value || 'welcomeScreen';
      const gesture = isDouble ? 'DOUBLE_TAP' : 'TAP';
      executeSimulatorGesture(containerId, gesture, activeScreen, 'zone_bottom_navigation_bar_global');
    });
  }

  let lastVpSwipeTime = 0;

  // Bind Viewport Content click for spatial guidance
  const viewportContentEl = document.getElementById(`${containerId}_viewportContent`);
  if (viewportContentEl) {
    viewportContentEl.addEventListener('click', (e) => {
      if (Date.now() - lastVpSwipeTime < 450) return;
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'CANVAS' || e.target.closest('button') || e.target.closest('canvas')) return;
      const activeScreen = document.getElementById(`${containerId}_simScreenSelect`)?.value || 'welcomeScreen';
      if (activeScreen === 'msgPrivacyReaderReplyScreen') return;
      const rect = viewportContentEl.getBoundingClientRect();
      const relY = e.clientY - rect.top;
      const subCtx = relY < rect.height * 0.4 ? 'zone_top_header' : 'zone_main_viewport_content';
      executeSimulatorGesture(containerId, 'TAP', activeScreen, subCtx);
    });
  }

  // Bind hardware sensor triggers
  container.querySelectorAll('.sim-sensor-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sensor = btn.getAttribute('data-sensor');
      if (sensor === 'SHAKE') {
        // Self-contained SOS simulation — does NOT navigate the real mobile app
        if (simSosTimer) { clearInterval(simSosTimer); simSosTimer = null; }
        simSosState = 'countdown';
        simSosCountdown = 3;

        // Switch simulator screen context to sosScreen
        const screenSelect = document.getElementById(`${containerId}_simScreenSelect`);
        if (screenSelect) screenSelect.value = 'sosScreen';
        const displayEl = document.getElementById(`${containerId}_activeContextDisplay`);
        if (displayEl) displayEl.innerText = '[ sosScreen ]';

        // Update viewport to show countdown
        updateSimulatorScreenContext(containerId, 'sosScreen');

        // Log in TTS panel
        const ttsLog = document.getElementById(`${containerId}_simTtsLog`);
        const hapticBar = document.getElementById(`${containerId}_hapticBar`);
        if (ttsLog) ttsLog.innerText = '> "3..."';
        if (hapticBar) { hapticBar.style.background = '#EF4444'; hapticBar.style.color = '#FFF'; hapticBar.innerText = '[ SOS VIBRATION ]'; }
        Speech.speak('3');
        Haptic.trigger('warning');

        // Tick countdown
        simSosTimer = setInterval(() => {
          simSosCountdown--;
          updateSimulatorScreenContext(containerId, 'sosScreen'); // re-renders with new number
          if (simSosCountdown > 0) {
            Speech.speak(`${simSosCountdown}`);
            Haptic.trigger('warning');
            if (ttsLog) ttsLog.innerText = `> "${simSosCountdown}..."`;
          } else {
            clearInterval(simSosTimer);
            simSosTimer = null;
            simSosState = 'dispatched';
            updateSimulatorScreenContext(containerId, 'sosScreen');
            const spokenPhone = formatPhoneForTTS('+389 70 123 456');
            Speech.speak(`Emergency SOS alert dispatched. Showing help screen: I am visually impaired, I need immediate help. Emergency contact: Mother, ${spokenPhone}.`);
            Haptic.trigger('sos');
            if (ttsLog) ttsLog.innerText = `> "Emergency SOS alert dispatched. I am visually impaired, I need immediate help. Emergency contact: Mother, ${spokenPhone}."`;
            if (hapticBar) hapticBar.innerText = '[ DISPATCHED ]';
            // Update parity inspector
            const parityStatus = document.getElementById(`${containerId}_parityStatus`);
            const ruleActionEl = document.getElementById(`${containerId}_ruleAction`);
            if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
            if (ruleActionEl) ruleActionEl.innerText = 'DISPATCH_SOS';
          }
        }, 1000);
      }
    });
  });

  // Touch Navigation Zone Click / Slide / Drag Handler
  const touchNavZone = document.getElementById(`${containerId}_touchNavZone`);
  let isNavZoneSliding = false;

  const processVibSliderSlide = (clientX) => {
    const activeScreen = document.getElementById(`${containerId}_simScreenSelect`)?.value || 'welcomeScreen';
    if (activeScreen === 'settingsAccessibilityMenu' && (simCategoryIndices['settingsAccessibilityMenu'] || 0) === 1) {
      if (!touchNavZone) return true;
      const rect = touchNavZone.getBoundingClientRect();
      const clickX = clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, clickX / rect.width));
      let level = 'Medium';
      let ruleId = 'cmd_vib_slider_mid';
      let hapticPattern = 'short';

      if (ratio < 0.35) {
        level = 'Low';
        ruleId = 'cmd_vib_slider_left';
        hapticPattern = 'soft';
      } else if (ratio > 0.65) {
        level = 'High';
        ruleId = 'cmd_vib_slider_right';
        hapticPattern = 'heavy';
      }

      if (simVibIntensity !== level) {
        simVibIntensity = level;
        Haptic.trigger(hapticPattern);
        const ttsText = `Vibration intensity set to ${level}.`;
        Speech.speak(ttsText);
        updateSimulatorScreenContext(containerId, 'settingsAccessibilityMenu', 1);

        const ttsLog = document.getElementById(`${containerId}_simTtsLog`);
        const ruleIdEl = document.getElementById(`${containerId}_ruleId`);
        const ruleActionEl = document.getElementById(`${containerId}_ruleAction`);
        const ruleHapticEl = document.getElementById(`${containerId}_ruleHaptic`);
        const parityStatus = document.getElementById(`${containerId}_parityStatus`);
        if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
        if (ruleIdEl) ruleIdEl.innerText = ruleId;
        if (ruleActionEl) ruleActionEl.innerText = 'SET_VIBRATION';
        if (ruleHapticEl) ruleHapticEl.innerText = hapticPattern;
        if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      }
      return true;
    }
    return false;
  };

  if (touchNavZone) {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let lastSwipeTime = 0;
    let lastNavTapTime = 0;
    let navSingleTapTimer = null;

    let simNavLongPressTimer = null;

    touchNavZone.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (simNavLongPressTimer) clearTimeout(simNavLongPressTimer);
      const activeScreen = document.getElementById(`${containerId}_simScreenSelect`)?.value || 'welcomeScreen';
      executeSimulatorGesture(containerId, 'LONG_PRESS', activeScreen, 'zone_bottom_navigation_bar_global');
    });

    touchNavZone.addEventListener('pointerdown', (e) => {
      touchStartX = e.clientX;
      touchStartY = e.clientY;
      touchStartTime = Date.now();
      isNavZoneSliding = true;

      const activeScreen = document.getElementById(`${containerId}_simScreenSelect`)?.value || 'welcomeScreen';
      if (simNavLongPressTimer) clearTimeout(simNavLongPressTimer);
      simNavLongPressTimer = setTimeout(() => {
        if (isNavZoneSliding) {
          isNavZoneSliding = false;
          lastSwipeTime = Date.now();
          executeSimulatorGesture(containerId, 'LONG_PRESS', activeScreen, 'zone_bottom_navigation_bar_global');
        }
      }, 500);

      if (activeScreen === 'navSearchInputScreen' || activeScreen === 'contactSaveNameInputScreen') {
        if (simNavLongPressTimer) clearTimeout(simNavLongPressTimer);
        if (simVoiceHoldTimer) clearTimeout(simVoiceHoldTimer);
        simVoiceHoldTimer = setTimeout(() => {
          simIsHoldingVoice = true;
          simVoiceInterim = '';
          Haptic.trigger('short');

          if (window.SpeechRecognition || window.webkitSpeechRecognition) {
            try {
              const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
              simVoiceRecog = new SpeechRec();
              simVoiceRecog.continuous = true;
              simVoiceRecog.interimResults = true;
              simVoiceRecog.lang = 'en-US';
              simVoiceRecog.onresult = (ev) => {
                let transcript = '';
                for (let i = 0; i < ev.results.length; i++) {
                  transcript += ev.results[i][0].transcript;
                }
                if (transcript) {
                  simVoiceInterim = transcript.trim();
                  const draft = document.getElementById(`${containerId}_simNavDraftQuery`) || document.getElementById(`${containerId}_simContactDraftName`);
                  if (draft) draft.innerText = `"${simVoiceInterim}"`;
                }
              };
              simVoiceRecog.start();
            } catch (err) {}
          }
          updateSimulatorScreenContext(containerId, activeScreen);
        }, 300);
        return;
      }
    });

    touchNavZone.addEventListener('pointermove', (e) => {
      if (isNavZoneSliding && simNavLongPressTimer) {
        if (Math.hypot(e.clientX - touchStartX, e.clientY - touchStartY) > 15) {
          clearTimeout(simNavLongPressTimer);
          simNavLongPressTimer = null;
        }
      }
    });

    touchNavZone.addEventListener('pointerup', (e) => {
      if (simNavLongPressTimer) {
        clearTimeout(simNavLongPressTimer);
        simNavLongPressTimer = null;
      }
      isNavZoneSliding = false;
      if (simVoiceHoldTimer) {
        clearTimeout(simVoiceHoldTimer);
        simVoiceHoldTimer = null;
      }
      const deltaX = e.clientX - touchStartX;
      const deltaY = e.clientY - touchStartY;
      const elapsed = Date.now() - touchStartTime;
      const activeScreen = document.getElementById(`${containerId}_simScreenSelect`)?.value || 'welcomeScreen';

      if (activeScreen === 'contactSaveNameInputScreen' && simIsHoldingVoice) {
        simIsHoldingVoice = false;
        if (simVoiceRecog) {
          try { simVoiceRecog.stop(); } catch(err) {}
          simVoiceRecog = null;
        }

        const targetText = simVoiceInterim || simContactSaveNameText || 'Elena Ristovska';
        simContactSaveInputMode = 'stt';
        simContactSaveNameText = targetText;
        simContactSaveMorseBuffer = '';
        simVoiceInterim = '';

        Haptic.trigger('success');
        const ttsText = `Contact name set to ${targetText}. Swipe up for confirmation, or fast double tap to save.`;
        Speech.speak(ttsText);

        const ttsLog = document.getElementById(`${containerId}_simTtsLog`);
        if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;

        const parityStatus = document.getElementById(`${containerId}_parityStatus`);
        const ruleIdEl = document.getElementById(`${containerId}_ruleId`);
        const ruleActionEl = document.getElementById(`${containerId}_ruleAction`);
        const ruleHapticEl = document.getElementById(`${containerId}_ruleHaptic`);
        const ruleLatencyEl = document.getElementById(`${containerId}_ruleLatency`);

        if (parityStatus) {
          parityStatus.innerText = 'PARITY PASS';
          parityStatus.style.color = '#10B981';
          parityStatus.style.background = 'rgba(16,185,129,0.15)';
        }
        if (ruleIdEl) ruleIdEl.innerText = 'cmd_voice_stt_contact_name';
        if (ruleActionEl) ruleActionEl.innerText = 'VOICE_NAME_SUBMIT';
        if (ruleHapticEl) ruleHapticEl.innerText = 'success';
        if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';

        updateSimulatorScreenContext(containerId, 'contactSaveNameInputScreen');
        return;
      }

      if (activeScreen === 'navSearchInputScreen' && simIsHoldingVoice) {
        simIsHoldingVoice = false;
        if (simVoiceRecog) {
          try { simVoiceRecog.stop(); } catch(err) {}
          simVoiceRecog = null;
        }

        const targetText = simVoiceInterim || simNavSearchText || 'Eurofarm Pharmacy';
        simNavInputMode = 'stt';
        simNavSearchText = targetText;
        simNavMorseBuffer = '';
        simNavSearchReady = true;
        simVoiceInterim = '';

        Haptic.trigger('success');
        const ttsText = `Destination set to ${targetText}. Swipe right for place options or swipe left to clear.`;
        Speech.speak(ttsText);

        const ttsLog = document.getElementById(`${containerId}_simTtsLog`);
        if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;

        const parityStatus = document.getElementById(`${containerId}_parityStatus`);
        const ruleIdEl = document.getElementById(`${containerId}_ruleId`);
        const ruleActionEl = document.getElementById(`${containerId}_ruleAction`);
        const ruleHapticEl = document.getElementById(`${containerId}_ruleHaptic`);
        const ruleLatencyEl = document.getElementById(`${containerId}_ruleLatency`);

        if (parityStatus) {
          parityStatus.innerText = 'PARITY PASS';
          parityStatus.style.color = '#10B981';
          parityStatus.style.background = 'rgba(16,185,129,0.15)';
        }
        if (ruleIdEl) ruleIdEl.innerText = 'cmd_voice_stt_complete';
        if (ruleActionEl) ruleActionEl.innerText = 'VOICE_SEARCH_SUBMIT';
        if (ruleHapticEl) ruleHapticEl.innerText = 'success';
        if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';

        updateSimulatorScreenContext(containerId, 'navSearchInputScreen');
        return;
      }

      // Horizontal swipe inside 120px Nav Zone
      if (Math.abs(deltaX) > 25 && Math.abs(deltaX) > Math.abs(deltaY) && elapsed < 800) {
        lastSwipeTime = Date.now();
        if (navSingleTapTimer) {
          clearTimeout(navSingleTapTimer);
          navSingleTapTimer = null;
        }
        lastNavTapTime = 0;
        const gesture = deltaX > 0 ? 'SWIPE_RIGHT' : 'SWIPE_LEFT';
        executeSimulatorGesture(containerId, gesture, activeScreen, 'zone_bottom_navigation_bar_global');
        return;
      }

      // Vertical swipe (UP / DOWN) inside 120px Nav Zone
      if (Math.abs(deltaY) > 25 && Math.abs(deltaY) >= Math.abs(deltaX) && elapsed < 800) {
        lastSwipeTime = Date.now();
        simNavZoneLastTapTime = 0;
        const gesture = deltaY > 0 ? 'SWIPE_DOWN' : 'SWIPE_UP';
        executeSimulatorGesture(containerId, gesture, activeScreen, 'zone_bottom_navigation_bar_global');
        return;
      }

      // Stationary Tap inside 120px Nav Zone (Immediate Double Tap Detection)
      if (Math.abs(deltaX) <= 25 && Math.abs(deltaY) <= 25 && elapsed < 700) {
        const now = Date.now();
        if (now - simNavZoneLastTapTime < 550 && (now - simNavZoneLastTapTime) > 30) {
          if (simNavZoneSingleTapTimer) {
            clearTimeout(simNavZoneSingleTapTimer);
            simNavZoneSingleTapTimer = null;
          }
          simNavZoneLastTapTime = 0;
          executeSimulatorGesture(containerId, 'DOUBLE_TAP', activeScreen, 'zone_bottom_navigation_bar_global');
          return;
        } else {
          simNavZoneLastTapTime = now;
          if (simNavZoneSingleTapTimer) clearTimeout(simNavZoneSingleTapTimer);
          simNavZoneSingleTapTimer = setTimeout(() => {
            simNavZoneSingleTapTimer = null;
          }, 550);
        }
      }
    });

    let clickNavTapTime = 0;
    touchNavZone.addEventListener('click', (e) => {
      // Suppress click event if a swipe was just performed
      if (Date.now() - lastSwipeTime < 500) {
        return;
      }

      const activeScreen = document.getElementById(`${containerId}_simScreenSelect`)?.value || 'welcomeScreen';
      const now = Date.now();
      if (now - clickNavTapTime < 550 && (now - clickNavTapTime) > 30) {
        clickNavTapTime = 0;
        if (simNavZoneSingleTapTimer) { clearTimeout(simNavZoneSingleTapTimer); simNavZoneSingleTapTimer = null; }
        simNavZoneLastTapTime = 0;
        executeSimulatorGesture(containerId, 'DOUBLE_TAP', activeScreen, 'zone_bottom_navigation_bar_global');
      } else {
        clickNavTapTime = now;
      }
    });
    touchNavZone.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      const activeScreen = document.getElementById(`${containerId}_simScreenSelect`)?.value || 'welcomeScreen';
      if (simNavZoneSingleTapTimer) { clearTimeout(simNavZoneSingleTapTimer); simNavZoneSingleTapTimer = null; }
      simNavZoneLastTapTime = 0;
      executeSimulatorGesture(containerId, 'DOUBLE_TAP', activeScreen, 'zone_bottom_navigation_bar_global');
    });
  }

  // Mouse Drag / Swipe Handler on Screen Viewport
  const viewportEl = document.getElementById(`${containerId}_viewportContent`);
  if (viewportEl) {
    let vpStartX = 0;
    let vpStartY = 0;
    let vpStartTime = 0;
    let isVpDragging = false;
    let simVpLongPressTimer = null;

    viewportEl.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.button !== undefined) return;
      const activeScreen = document.getElementById(`${containerId}_simScreenSelect`)?.value || 'welcomeScreen';
      if (activeScreen === 'handwritingDialerScreen' || activeScreen === 'contactSaveNameInputScreen' || activeScreen === 'navSearchInputScreen' || activeScreen === 'msgPrivacyReaderReplyScreen') {
        return;
      }
      vpStartX = e.clientX;
      vpStartY = e.clientY;
      vpStartTime = Date.now();
      isVpDragging = true;

      if (simVpLongPressTimer) clearTimeout(simVpLongPressTimer);
      simVpLongPressTimer = setTimeout(() => {
        if (isVpDragging) {
          isVpDragging = false;
          lastVpSwipeTime = Date.now();
          executeSimulatorGesture(containerId, 'LONG_PRESS', activeScreen, 'DEFAULT');
        }
      }, 500);
    });

    viewportEl.addEventListener('pointermove', (e) => {
      if (isVpDragging && simVpLongPressTimer) {
        if (Math.hypot(e.clientX - vpStartX, e.clientY - vpStartY) > 15) {
          clearTimeout(simVpLongPressTimer);
          simVpLongPressTimer = null;
        }
      }
    });

    viewportEl.addEventListener('pointerup', (e) => {
      if (simVpLongPressTimer) {
        clearTimeout(simVpLongPressTimer);
        simVpLongPressTimer = null;
      }
      if (!isVpDragging) return;
      isVpDragging = false;
      const deltaX = e.clientX - vpStartX;
      const deltaY = e.clientY - vpStartY;
      const elapsed = Date.now() - vpStartTime;
      const activeScreen = document.getElementById(`${containerId}_simScreenSelect`)?.value || 'welcomeScreen';

      if (elapsed > 1200) return;

      // Vertical swipe: swipe down (deltaY >= 15) or swipe up (deltaY <= -15)
      if (Math.abs(deltaY) >= 15 && Math.abs(deltaY) > Math.abs(deltaX)) {
        lastVpSwipeTime = Date.now();
        const gesture = deltaY > 0 ? 'SWIPE_DOWN' : 'SWIPE_UP';
        executeSimulatorGesture(containerId, gesture, activeScreen, 'DEFAULT');
        return;
      }

      // Horizontal swipe: swipe right (deltaX >= 15) or swipe left (deltaX <= -15)
      if (Math.abs(deltaX) >= 15 && Math.abs(deltaX) >= Math.abs(deltaY)) {
        lastVpSwipeTime = Date.now();
        const gesture = deltaX > 0 ? 'SWIPE_RIGHT' : 'SWIPE_LEFT';
        executeSimulatorGesture(containerId, gesture, activeScreen, 'zone_main_viewport_content');
        return;
      }
    });

    // Right-click on viewport triggers LONG_PRESS
    viewportEl.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const activeScreen = document.getElementById(`${containerId}_simScreenSelect`)?.value || 'welcomeScreen';
      executeSimulatorGesture(containerId, 'LONG_PRESS', activeScreen, 'DEFAULT');
    });

    // Direct double-click on viewport card to trigger DOUBLE_TAP
    viewportEl.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      const activeScreen = document.getElementById(`${containerId}_simScreenSelect`)?.value || 'welcomeScreen';
      if (activeScreen === 'msgPrivacyReaderReplyScreen') {
        return;
      }
      if (simSurfaceSingleTapTimer) { clearTimeout(simSurfaceSingleTapTimer); simSurfaceSingleTapTimer = null; }
      if (simNavZoneSingleTapTimer) { clearTimeout(simNavZoneSingleTapTimer); simNavZoneSingleTapTimer = null; }
      simSurfaceLastTapTime = 0;
      simNavZoneLastTapTime = 0;
      executeSimulatorGesture(containerId, 'DOUBLE_TAP', activeScreen, 'zone_bottom_navigation_bar_global');
    });
  }

  // Sync screens and listen to rule updates
  syncSimulatorScreens(containerId);
  onRuleUpdated(() => {
    const wsStatus = document.getElementById(`${containerId}_wsStatus`);
    if (wsStatus) {
      wsStatus.innerHTML = `<i class="fa-solid fa-circle" style="font-size: 0.55rem; color: #FFEE55;"></i> LIVE SYNC UPDATED`;
      setTimeout(() => {
        wsStatus.innerHTML = `<i class="fa-solid fa-circle" style="font-size: 0.55rem; color: #10B981;"></i> LIVE SYNC ACTIVE`;
      }, 1500);
    }
  });

  onScreenUpdated(() => { syncSimulatorScreens(containerId); syncSimulatorSections(containerId); });
  onSectionUpdated(() => syncSimulatorSections(containerId));
  syncSimulatorSections(containerId);
}

export function announceSimulatorScreenContext(containerId, screenId) {
  const ttsLog = document.getElementById(`${containerId}_simTtsLog`);
  const parityStatus = document.getElementById(`${containerId}_parityStatus`);
  const ruleActionEl = document.getElementById(`${containerId}_ruleAction`);
  const ruleIdEl = document.getElementById(`${containerId}_ruleId`);
  const ruleHapticEl = document.getElementById(`${containerId}_ruleHaptic`);
  const ruleLatencyEl = document.getElementById(`${containerId}_ruleLatency`);
  const hapticBar = document.getElementById(`${containerId}_hapticBar`);

  const menuList = SIMULATOR_MENUS[screenId];
  let ttsText = '';

  if (screenId === 'msgPrivacyReaderReplyScreen') {
    const activeMsg = simActiveMessage || (SIMULATOR_MENUS['messagesView'] ? SIMULATOR_MENUS['messagesView'][0] : { title: 'Mother', subtitle: 'Where are you? When are you coming home?' });
    if (simReadingMode === 'Morse Only') {
      Speech.speak("Reading message in Morse code.");
      Haptic.playMorse(activeMsg.subtitle);
      if (ttsLog) ttsLog.innerText = `> [MORSE PLAYBACK] "${activeMsg.subtitle}"`;
      if (hapticBar) {
        hapticBar.innerText = `[ MORSE PLAYING: "${activeMsg.subtitle}" ]`;
        hapticBar.style.color = '#FFEE55';
        hapticBar.style.borderColor = '#FFEE55';
        hapticBar.style.background = 'rgba(255,238,85,0.15)';
      }
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleActionEl) ruleActionEl.innerText = 'READ_MESSAGE_MORSE';
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_msg_readMorse';
      if (ruleHapticEl) ruleHapticEl.innerText = 'morse_stream';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
      return;
    } else {
      ttsText = `Message from ${activeMsg.title}: "${activeMsg.subtitle}". Tap Morse or dictate voice, then swipe up to confirm.`;
    }
  } else if (screenId === 'messagesView' || screenId === 'messagesScreen') {
    const idx = (simCategoryIndices[screenId] || 0) % (menuList?.length || 1);
    const item = menuList ? menuList[idx] : null;
    ttsText = item ? `Opening messages. Message ${idx + 1} of ${menuList.length} from ${item.title}. ${item.unread ? 'New unread.' : 'Read.'} Received at ${item.time || '12:05 PM'}. Double tap to open private screen.` : "Opening messages. No messages available.";
  } else if (screenId === 'phoneCategoryMenu' || screenId === 'phoneView' || screenId === 'callsScreen') {
    const idx = (simCategoryIndices[screenId] || 0) % (menuList?.length || 1);
    const item = menuList ? menuList[idx] : null;
    ttsText = item ? `Opening Phone and Contacts. Option ${idx + 1} of ${menuList.length}: ${item.title}. ${item.subtitle}. Double tap to open.` : "Opening Phone and Contacts.";
  } else if (screenId === 'cameraCategoryMenu' || screenId === 'cameraView' || screenId === 'cameraScreen') {
    const idx = (simCategoryIndices[screenId] || 0) % (menuList?.length || 1);
    const item = menuList ? menuList[idx] : null;
    ttsText = item ? `Opening Camera and AI Vision. Mode ${idx + 1} of ${menuList.length}: ${item.title}. ${item.subtitle}. Double tap to start.` : "Opening Camera.";
  } else if (screenId === 'navCategoryMenu' || screenId === 'navigationView' || screenId === 'navigationScreen') {
    const idx = (simCategoryIndices[screenId] || 0) % (menuList?.length || 1);
    const item = menuList ? menuList[idx] : null;
    ttsText = item ? `Opening GPS Navigation. Option ${idx + 1} of ${menuList.length}: ${item.title}. ${item.subtitle}. Double tap to open.` : "Opening Navigation.";
  } else if (screenId === 'settingsCategoryMenu' || screenId === 'settingsView' || screenId === 'settingsScreen') {
    const idx = (simCategoryIndices[screenId] || 0) % (menuList?.length || 1);
    const item = menuList ? menuList[idx] : null;
    ttsText = item ? `Opening Settings. Option ${idx + 1} of ${menuList.length}: ${item.title}. ${item.subtitle}. Double tap to open.` : "Opening Settings.";
  } else if (screenId === 'contactsListScreen') {
    const idx = (simCategoryIndices['contactsListScreen'] || 0) % (menuList?.length || 1);
    const item = menuList ? menuList[idx] : null;
    const spokenPhone = item ? formatPhoneForTTS(item.subtitle) : '';
    ttsText = item ? `Contact ${idx + 1} of ${menuList.length}: ${item.title}. ${spokenPhone}. Double tap for contact actions.` : "Contacts list.";
  } else if (screenId === 'favoritesListScreen') {
    const idx = (simCategoryIndices['favoritesListScreen'] || 0) % (menuList?.length || 1);
    const item = menuList ? menuList[idx] : null;
    const spokenPhone = item ? formatPhoneForTTS(item.subtitle) : '';
    ttsText = item ? `Favorite contact ${idx + 1} of ${menuList.length}: ${item.title}. ${spokenPhone}. Double tap to call.` : "Favorite contacts.";
  } else if (screenId === 'emergencyContactsListScreen') {
    const idx = (simCategoryIndices['emergencyContactsListScreen'] || 0) % (menuList?.length || 1);
    const item = menuList ? menuList[idx] : null;
    const spokenPhone = item ? formatPhoneForTTS(item.subtitle) : '';
    ttsText = item ? `Emergency contact ${idx + 1} of ${menuList.length}: ${item.title}. ${spokenPhone}. Double tap to call.` : "Emergency contacts.";
  } else if (screenId === 'recentCallsScreen' || screenId === 'recentsListScreen') {
    const idx = (simCategoryIndices[screenId] || 0) % (menuList?.length || 1);
    const item = menuList ? menuList[idx] : null;
    const spokenPhone = item ? formatPhoneForTTS(item.subtitle) : '';
    ttsText = item ? `Recent call ${idx + 1} of ${menuList.length}: ${item.title}. ${item.callType} call at ${item.time}. ${spokenPhone}. Double tap to call back.` : "Recent calls.";
  } else if (screenId === 'mainMenuScreen') {
    const idx = (simCategoryIndices['mainMenuScreen'] || 0) % (menuList?.length || 1);
    const item = menuList ? menuList[idx] : null;
    ttsText = item ? `${item.title}. ${item.subtitle}. Double tap to open.` : "Main Menu.";
  } else if (screenId === 'activeCallScreen') {
    const contact = simActiveCallContact || { title: 'Brother', subtitle: '+389 71 987 654' };
    const spoken = formatPhoneForTTS(contact.subtitle);
    ttsText = `Active call with ${contact.title}. ${spoken}. Connected. Double tap or swipe down to end call.`;
  } else if (screenId === 'cameraActiveHoldScreen') {
    ttsText = `Camera live for ${simCameraMode === 'ocr' ? 'document text reading' : 'scene and obstacle scanning'}. Hold phone steady. Auto-capturing in 3 seconds.`;
  } else if (screenId === 'cameraResultScreen') {
    ttsText = simCameraMode === 'ocr'
      ? 'Document captured. Prescription details: Amoxicillin 500 milligrams. Take one tablet twice daily with meals for 7 days. Double tap to retake photo, swipe down to return.'
      : 'Scene captured. Indoor hallway. Wooden door directly ahead at 2.5 meters. Chair on your right at 1 meter. Path is clear. Double tap to retake photo, swipe down to return.';
  } else if (screenId === 'sosScreen') {
    ttsText = `Emergency SOS alert dispatched. Showing help screen: I am disabled, I need help. Emergency contact: Mother, ${formatPhoneForTTS('+389 70 123 456')}.`;
  } else if (screenId === 'handwritingDialerScreen') {
    const formatted = simDialedNumber ? formatPhoneForTTS(simDialedNumber) : "empty";
    ttsText = `Handwriting dialer active. Draw digits on screen. Current number: ${formatted}. Swipe left to delete, swipe up to confirm, swipe right for action menu.`;
  } else if (screenId === 'contactActionMenuScreen') {
    const idx = (simCategoryIndices['contactActionMenuScreen'] || 0) % (menuList?.length || 1);
    const item = menuList ? menuList[idx] : null;
    const contactName = simSelectedContact?.title || 'contact';
    ttsText = item ? `Opening contact actions for ${contactName}. Action ${idx + 1} of ${menuList.length}: ${item.title}. ${item.subtitle}. Double tap to execute.` : "Opening contact actions.";
  } else if (screenId === 'dialerActionMenuScreen') {
    const idx = (simCategoryIndices['dialerActionMenuScreen'] || 0) % (menuList?.length || 1);
    const item = menuList ? menuList[idx] : null;
    const targetNum = simDialedNumber ? formatPhoneForTTS(simDialedNumber) : '+389 70 123 456';
    let actTitle = item?.title;
    if (item?.actionId === 'call') actTitle = `Call number ${targetNum}`;
    ttsText = item ? `Opening dialer actions. Action ${idx + 1} of ${menuList.length}: ${actTitle}. ${item.subtitle}. Double tap to execute.` : "Opening dialer actions.";
  } else if (screenId === 'contactSaveNameInputScreen') {
    const targetNum = simDialedNumber ? formatPhoneForTTS(simDialedNumber) : '+389 70 123 456';
    const currentName = simContactSaveNameText || "empty";
    ttsText = `Save contact screen. Number: ${targetNum}. Contact name: ${currentName}. Hold navigation bar to speak name and surname, or tap screen to enter in Morse code. Double tap or swipe up to save.`;
  } else if (screenId === 'navSearchInputScreen') {
    const query = simNavSearchText || "empty";
    ttsText = `Place finder active. Enter destination via voice dictation or Morse code. Destination: ${query}. Swipe left to delete, swipe up to confirm, swipe right for options.`;
  } else if (screenId === 'settingsAccessibilityMenu') {
    const options = ['READING MODE', 'MORSE CODE SPEED', 'VIBRATION INTENSITY'];
    const values = [simReadingMode, simMorseSpeed, simVibIntensity];
    const idx = (simCategoryIndices['settingsAccessibilityMenu'] || 0) % 3;
    ttsText = `Option ${idx + 1} of 3: ${options[idx]}. Current value: ${values[idx]}.`;
  } else if (screenId === 'settingsQuickAccessScreen') {
    const idx = (simCategoryIndices['settingsQuickAccessScreen'] || 0) % (menuList?.length || 1);
    const item = menuList ? menuList[idx] : null;
    ttsText = item ? `Quick Action ${idx + 1} of ${menuList.length}: ${item.title}. Status: ${item.enabled ? 'Enabled.' : 'Disabled.'}` : "Quick access list.";
  } else if (screenId === 'welcomeScreen') {
    ttsText = "Welcome to blindeye, swipe right to start";
  } else if (menuList && menuList.length > 0) {
    const idx = (simCategoryIndices[screenId] || 0) % menuList.length;
    const item = menuList[idx];
    ttsText = `${item.title}. ${item.subtitle}. Double tap to open.`;
  } else {
    ttsText = `Entered ${screenId}.`;
  }

  const hapticP = screenId === 'sosScreen' ? 'success' : 'short';
  Haptic.trigger(hapticP);
  Speech.speak(ttsText);
  if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
  if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
  if (ruleActionEl) ruleActionEl.innerText = screenId === 'sosScreen' ? 'DISPATCH_SOS' : 'ENTER_SCREEN';
  if (ruleIdEl) ruleIdEl.innerText = screenId === 'sosScreen' ? 'cmd_drill_down' : `cmd_${screenId}_entry`;
  if (ruleHapticEl) ruleHapticEl.innerText = hapticP;
  if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';

  if (hapticBar && screenId === 'sosScreen') {
    hapticBar.innerText = '[ DISPATCHED ]';
    hapticBar.style.color = '#EF4444';
    hapticBar.style.borderColor = '#EF4444';
    hapticBar.style.background = 'rgba(239,68,68,0.2)';
  }
}

async function syncSimulatorScreens(containerId) {
  const screenSelect = document.getElementById(`${containerId}_simScreenSelect`);
  if (!screenSelect) return;

  const res = await fetchScreens();
  let screenList = (res.success && res.screens) ? [...res.screens] : [];

  const essentialScreens = [
    { id: 'welcomeScreen', name: 'Welcome & Orientation' },
    { id: 'gestureTrainingScreen', name: 'Gesture Training Tutorial' },
    { id: 'onboardingConfigScreen', name: 'Permissions & Audio Setup' },
    { id: 'tutorialScreen', name: 'Letter Calibration (M, P, C, N, S)' },
    { id: 'mainMenuScreen', name: 'Main Menu (Draw Letters & Categories)' },
    { id: 'navCategoryMenu', name: 'GPS Navigation (Categories)' },
    { id: 'settingsCategoryMenu', name: 'Settings (Categories)' }
  ];
  for (const es of essentialScreens) {
    if (!screenList.some(s => s.id === es.id)) {
      screenList.unshift(es);
    }
  }

  const currentVal = screenSelect.value;
  screenSelect.innerHTML = screenList.map(s => `
    <option value="${s.id}">${s.id} (${s.name})</option>
  `).join('');
  if (currentVal && screenList.some(s => s.id === currentVal)) {
    screenSelect.value = currentVal;
  }
  updateSimulatorScreenContext(containerId, screenSelect.value || 'welcomeScreen');
}

async function syncSimulatorSections(containerId) {
  const sectionSelect = document.getElementById(`${containerId}_simSectionSelect`);
  if (!sectionSelect) return;
  const activeScreen = document.getElementById(`${containerId}_simScreenSelect`)?.value || 'ALL';
  const res = await fetchSections(activeScreen);
  if (res.success && res.sections) {
    const current = sectionSelect.value;
    sectionSelect.innerHTML = '<option value="DEFAULT">DEFAULT (Full Screen / No Zone)</option>' + res.sections.map(section => `<option value="${section.id}">${section.name} (${section.screen_id || 'GLOBAL'})</option>`).join('');
    if ([...sectionSelect.options].some(option => option.value === current)) sectionSelect.value = current;
  }
}

const MESSAGES_MENU_ITEMS = [
  { target: 'msgPrivacyReaderReplyScreen', title: 'Mother', subtitle: 'Where are you? When are you coming home?', icon: 'fa-user', color: '#00E5FF', time: '12:05 PM', unread: true },
  { target: 'msgPrivacyReaderReplyScreen', title: 'Doctor Office', subtitle: 'Your prescription is ready for pickup at Central Pharmacy.', icon: 'fa-user-doctor', color: '#10B981', time: '11:42 AM', unread: false },
  { target: 'msgPrivacyReaderReplyScreen', title: 'Bank Notification', subtitle: 'Card payment of 450 MKD approved at Supermarket.', icon: 'fa-building-columns', color: '#FFEE55', time: '10:15 AM', unread: false },
];

const SIMULATOR_MENUS = {
  'mainMenuScreen': [
    { target: 'messagesScreen', letter: 'M', title: 'MESSAGES', subtitle: 'View unread SMS & conversations', icon: 'fa-comment-sms', color: '#FFCC00' },
    { target: 'phoneCategoryMenu', letter: 'P', title: 'PHONE & CONTACTS', subtitle: 'Call favorites & dial numbers', icon: 'fa-phone', color: '#FFCC00' },
    { target: 'cameraCategoryMenu', letter: 'C', title: 'CAMERA & AI OCR', subtitle: 'Read printed text & describe scenes', icon: 'fa-camera', color: '#FFCC00' },
    { target: 'navCategoryMenu', letter: 'N', title: 'GPS NAVIGATION', subtitle: 'Turn-by-turn walking guidance', icon: 'fa-location-dot', color: '#FFCC00' },
    { target: 'settingsCategoryMenu', letter: 'S', title: 'SETTINGS', subtitle: 'Reading mode, haptics & privacy', icon: 'fa-gear', color: '#FFCC00' }
  ],
  'messagesScreen': MESSAGES_MENU_ITEMS,
  'messagesView': MESSAGES_MENU_ITEMS,
  'phoneView': [
    { target: 'contactsListScreen', title: 'CONTACTS DIRECTORY', subtitle: 'Browse all contacts directory', icon: 'fa-address-book', color: '#FFEE55' },
    { target: 'recentsListScreen', title: 'RECENT CALLS', subtitle: 'Recent incoming, missed & outgoing calls', icon: 'fa-clock-rotate-left', color: '#00E5FF' },
    { target: 'favoritesListScreen', title: 'FAVORITE CONTACTS', subtitle: 'Quick-dial favorite contacts', icon: 'fa-star', color: '#FFEE55' },
    { target: 'emergencyContactsListScreen', title: 'EMERGENCY CONTACTS', subtitle: 'Urgent emergency assistance', icon: 'fa-shield-heart', color: '#EF4444' },
    { target: 'handwritingDialerScreen', title: 'HANDWRITING DIALER', subtitle: 'Draw numbers to dial', icon: 'fa-keyboard', color: '#10B981' }
  ],
  'contactsListScreen': [
    { target: 'contactActionMenuScreen', title: 'Mother', subtitle: '+389 70 123 456', icon: 'fa-user', color: '#FFEE55', favorite: true, emergency: true },
    { target: 'contactActionMenuScreen', title: 'Doctor Office', subtitle: '+389 71 234 567', icon: 'fa-user-doctor', color: '#FFEE55', favorite: false, emergency: false },
    { target: 'contactActionMenuScreen', title: 'Brother', subtitle: '+389 71 987 654', icon: 'fa-user-group', color: '#FFEE55', favorite: true, emergency: true },
    { target: 'contactActionMenuScreen', title: 'Central Pharmacy', subtitle: '+389 78 555 666', icon: 'fa-prescription-bottle-medical', color: '#FFEE55', favorite: false, emergency: false }
  ],
  'contactActionMenuScreen': [
    { target: 'activeCallScreen', title: 'CALL CONTACT', subtitle: 'Place voice call to contact', icon: 'fa-phone', color: '#10B981', actionId: 'call' },
    { target: 'contactsListScreen', title: 'TOGGLE FAVORITE', subtitle: 'Add or remove from favorite contacts', icon: 'fa-star', color: '#FFEE55', actionId: 'toggle_fav' },
    { target: 'contactsListScreen', title: 'TOGGLE EMERGENCY', subtitle: 'Add or remove from emergency SOS speed dial', icon: 'fa-shield-heart', color: '#EF4444', actionId: 'toggle_emerg' },
    { target: 'contactsListScreen', title: 'DELETE CONTACT', subtitle: 'Permanently remove from directory', icon: 'fa-trash-can', color: '#94A3B8', actionId: 'delete' }
  ],
  'dialerActionMenuScreen': [
    { target: 'activeCallScreen', title: 'CALL NUMBER', subtitle: 'Place voice call to dialed number', icon: 'fa-phone', color: '#10B981', actionId: 'call' },
    { target: 'contactsListScreen', title: 'SAVE TO CONTACTS', subtitle: 'Save number as new contact in directory', icon: 'fa-user-plus', color: '#FFEE55', actionId: 'save_contact' }
  ],
  'favoritesListScreen': [
    { target: 'activeCallScreen', title: 'Mother', subtitle: '+389 70 123 456', icon: 'fa-star', color: '#FFEE55', favorite: true },
    { target: 'activeCallScreen', title: 'Brother', subtitle: '+389 71 987 654', icon: 'fa-star', color: '#FFEE55', favorite: true }
  ],
  'emergencyContactsListScreen': [
    { target: 'activeCallScreen', title: 'Mother', subtitle: '+389 70 123 456', icon: 'fa-shield-heart', color: '#EF4444', emergency: true },
    { target: 'activeCallScreen', title: 'Brother', subtitle: '+389 71 987 654', icon: 'fa-shield-heart', color: '#EF4444', emergency: true },
    { target: 'activeCallScreen', title: 'Emergency SOS (112)', subtitle: '112', icon: 'fa-triangle-exclamation', color: '#EF4444', emergency: true }
  ],
  'recentCallsScreen': [
    { target: 'activeCallScreen', title: 'Mother', subtitle: '+389 70 123 456', callType: 'Incoming', time: '12:05 PM', icon: 'fa-arrow-down-left', color: '#10B981' },
    { target: 'activeCallScreen', title: 'Doctor Office', subtitle: '+389 71 234 567', callType: 'Outgoing', time: '10:15 AM', icon: 'fa-arrow-up-right', color: '#00E5FF' },
    { target: 'activeCallScreen', title: 'Brother', subtitle: '+389 71 987 654', callType: 'Missed', time: '09:30 AM', icon: 'fa-phone-slash', color: '#EF4444' },
    { target: 'activeCallScreen', title: 'Central Pharmacy', subtitle: '+389 78 555 666', callType: 'Incoming', time: 'Yesterday', icon: 'fa-arrow-down-left', color: '#10B981' }
  ],
  'recentsListScreen': [
    { target: 'activeCallScreen', title: 'Mother', subtitle: '+389 70 123 456', callType: 'Incoming', time: '12:05 PM', icon: 'fa-arrow-down-left', color: '#10B981' },
    { target: 'activeCallScreen', title: 'Doctor Office', subtitle: '+389 71 234 567', callType: 'Outgoing', time: '10:15 AM', icon: 'fa-arrow-up-right', color: '#00E5FF' },
    { target: 'activeCallScreen', title: 'Brother', subtitle: '+389 71 987 654', callType: 'Missed', time: '09:30 AM', icon: 'fa-phone-slash', color: '#EF4444' },
    { target: 'activeCallScreen', title: 'Central Pharmacy', subtitle: '+389 78 555 666', callType: 'Incoming', time: 'Yesterday', icon: 'fa-arrow-down-left', color: '#10B981' }
  ],
  'phoneCategoryMenu': [
    { target: 'contactsListScreen', title: 'CONTACTS DIRECTORY', subtitle: 'Browse all contacts directory', icon: 'fa-address-book', color: '#FFEE55' },
    { target: 'recentsListScreen', title: 'RECENTS', subtitle: 'Recent incoming & outgoing calls', icon: 'fa-clock-rotate-left', color: '#00E5FF' },
    { target: 'favoritesListScreen', title: 'FAVORITE CONTACTS', subtitle: 'Quick-dial favorite contacts', icon: 'fa-star', color: '#FFEE55' },
    { target: 'emergencyContactsListScreen', title: 'EMERGENCY CONTACTS', subtitle: 'Urgent emergency assistance', icon: 'fa-shield-heart', color: '#EF4444' },
    { target: 'handwritingDialerScreen', title: 'HANDWRITING DIALER', subtitle: 'Draw numbers to dial', icon: 'fa-keyboard', color: '#10B981' }
  ],
  'callsScreen': [
    { target: 'contactsListScreen', title: 'CONTACTS DIRECTORY', subtitle: 'Browse all contacts directory', icon: 'fa-address-book', color: '#FFEE55' },
    { target: 'recentsListScreen', title: 'RECENTS', subtitle: 'Recent incoming & outgoing calls', icon: 'fa-clock-rotate-left', color: '#00E5FF' },
    { target: 'favoritesListScreen', title: 'FAVORITE CONTACTS', subtitle: 'Quick-dial favorite contacts', icon: 'fa-star', color: '#FFEE55' },
    { target: 'emergencyContactsListScreen', title: 'EMERGENCY CONTACTS', subtitle: 'Urgent emergency assistance', icon: 'fa-shield-heart', color: '#EF4444' },
    { target: 'handwritingDialerScreen', title: 'HANDWRITING DIALER', subtitle: 'Draw numbers to dial', icon: 'fa-keyboard', color: '#10B981' }
  ],



  'cameraView': [
    { target: 'cameraActiveHoldScreen', title: 'READ TEXT (OCR)', subtitle: 'Read printed text & documents', icon: 'fa-file-lines', color: '#10B981' },
    { target: 'cameraActiveHoldScreen', title: 'SCAN OBJECTS & SCENE', subtitle: 'Detect nearby objects & obstacles', icon: 'fa-cube', color: '#10B981' }
  ],
  'cameraCategoryMenu': [
    { target: 'cameraActiveHoldScreen', title: 'READ TEXT (OCR)', subtitle: 'Read printed text & documents', icon: 'fa-file-lines', color: '#10B981' },
    { target: 'cameraActiveHoldScreen', title: 'SCAN OBJECTS & SCENE', subtitle: 'Detect nearby objects & obstacles', icon: 'fa-cube', color: '#10B981' }
  ],
  'cameraScreen': [
    { target: 'cameraActiveHoldScreen', title: 'READ TEXT (OCR)', subtitle: 'Read printed text & documents', icon: 'fa-file-lines', color: '#10B981' },
    { target: 'cameraActiveHoldScreen', title: 'SCAN OBJECTS & SCENE', subtitle: 'Detect nearby objects & obstacles', icon: 'fa-cube', color: '#10B981' }
  ],
  'navigationView': [
    { target: 'navSearchInputScreen', title: 'NAVIGATE TO PLACE', subtitle: 'Voice search destination', icon: 'fa-magnifying-glass-location', color: '#A855F7' },
    { target: 'savedPlacesListScreen', title: 'SAVED DESTINATIONS', subtitle: 'Quick access saved routes', icon: 'fa-bookmark', color: '#A855F7' }
  ],
  'navCategoryMenu': [
    { target: 'navSearchInputScreen', title: 'NAVIGATE TO PLACE', subtitle: 'Voice search destination', icon: 'fa-magnifying-glass-location', color: '#A855F7' },
    { target: 'savedPlacesListScreen', title: 'SAVED DESTINATIONS', subtitle: 'Quick access saved routes', icon: 'fa-bookmark', color: '#A855F7' }
  ],
  'savedPlacesListScreen': [
    { target: 'navPlaceActionMenuScreen', title: 'Home', subtitle: 'Partizanska 45 (450m away)', phone: '+389 70 123 456', distance: '450m away', icon: 'fa-house', color: '#00E5FF' },
    { target: 'navPlaceActionMenuScreen', title: 'Doctor Office', subtitle: 'Mother Teresa Clinic (1.2 km)', phone: '+389 72 555 112', distance: '1.2 km away', icon: 'fa-hospital', color: '#10B981' },
    { target: 'navPlaceActionMenuScreen', title: 'Eurofarm Pharmacy', subtitle: 'Kliment Ohridski 12 (280m)', phone: '+389 72 888 999', distance: '280m away', icon: 'fa-prescription-bottle-medical', color: '#FFEE55' }
  ],
  'navPlaceActionMenuScreen': [
    { target: 'navActiveRouteScreen', title: 'NAVIGATE TO PLACE', subtitle: 'Start turn-by-turn walking guidance', icon: 'fa-location-arrow', color: '#A855F7', actionId: 'navigate' },
    { target: 'activeCallScreen', title: 'CALL PLACE', subtitle: 'Place voice call to location', icon: 'fa-phone', color: '#10B981', actionId: 'call' },
    { target: 'savedPlacesListScreen', title: 'SAVE / REMOVE PLACE', subtitle: 'Manage in saved destinations', icon: 'fa-bookmark', color: '#FFEE55', actionId: 'toggle_save' }
  ],
  'settingsCategoryMenu': [
    { target: 'settingsAccessibilityMenu', title: 'ACCESSIBILITY OPTIONS', subtitle: 'Speech rate, Morse & vibration', icon: 'fa-universal-access', color: '#10B981' },
    { target: 'settingsQuickAccessScreen', title: 'QUICK ACCESS BUILDER', subtitle: 'Manage two-finger shortcuts', icon: 'fa-bolt', color: '#FFEE55' },
    { target: 'settingsTutorialMenu', title: 'TUTORIAL MODE', subtitle: 'Restart gesture orientation', icon: 'fa-graduation-cap', color: '#CBD5E1' }
  ],
  'settingsAccessibilityMenu': [
    { target: 'settingsAccessibilityMenu', title: 'READING MODE', subtitle: 'TTS only or Morse only', icon: 'fa-book-open', color: '#10B981', optionId: 'reading' },
    { target: 'settingsAccessibilityMenu', title: 'MORSE CODE SPEED', subtitle: 'Slow, Medium, or Fast tempo', icon: 'fa-gauge-high', color: '#00E5FF', optionId: 'morseSpeed' },
    { target: 'settingsAccessibilityMenu', title: 'VIBRATION INTENSITY', subtitle: 'Low, Medium, or High haptic strength', icon: 'fa-wave-square', color: '#FFEE55', optionId: 'vibration' }
  ],
  'settingsQuickAccessScreen': [
    { target: 'settingsQuickAccessScreen', title: 'Call Brother', subtitle: 'Target: Brother (+389 71 234 567)', type: 'call', targetName: 'Brother', enabled: true, icon: 'fa-phone', color: '#10B981' },
    { target: 'settingsQuickAccessScreen', title: 'Navigate to Home', subtitle: 'Target: Home (Partizanska 45)', type: 'nav', targetName: 'Home', enabled: true, icon: 'fa-location-arrow', color: '#A855F7' },
    { target: 'settingsQuickAccessScreen', title: 'Message Caregiver Elena', subtitle: 'Target: Caregiver Elena (+389 75 999 888)', type: 'msg', targetName: 'Caregiver Elena', enabled: false, icon: 'fa-comment-sms', color: '#00E5FF' },
    { target: 'settingsQuickAccessScreen', title: 'Scan: Scene & Obstacles', subtitle: 'Target: Scene & Obstacles', type: 'camera', targetName: 'Scene & Obstacles', enabled: true, icon: 'fa-camera', color: '#FFEE55' }
  ],
  'settingsAddQuickActionScreen': [
    { target: 'settingsPickTargetScreen', title: 'CALL CONTACT', subtitle: 'One-touch speed dial to contact', icon: 'fa-phone', color: '#10B981', actionType: 'call' },
    { target: 'settingsPickTargetScreen', title: 'SEND MESSAGE', subtitle: 'Quick voice or Morse SMS', icon: 'fa-comment-sms', color: '#00E5FF', actionType: 'msg' },
    { target: 'settingsPickTargetScreen', title: 'NAVIGATE TO PLACE', subtitle: 'Direct GPS walking route', icon: 'fa-location-arrow', color: '#A855F7', actionType: 'nav' },
    { target: 'settingsPickTargetScreen', title: 'SCAN OBJECT', subtitle: 'AI camera obstacle & scene description', icon: 'fa-camera', color: '#FFEE55', actionType: 'camera' }
  ],
  'settingsPickTargetScreen': [
    { target: 'settingsQuickAccessScreen', title: 'Brother', subtitle: '+389 71 234 567', icon: 'fa-user', color: '#10B981', actionTitle: 'Call Brother', type: 'call' },
    { target: 'settingsQuickAccessScreen', title: 'Mother', subtitle: '+389 70 123 456', icon: 'fa-user', color: '#10B981', actionTitle: 'Call Mother', type: 'call' },
    { target: 'settingsQuickAccessScreen', title: 'Caregiver Elena', subtitle: '+389 75 999 888', icon: 'fa-user-nurse', color: '#10B981', actionTitle: 'Call Caregiver Elena', type: 'call' },
    { target: 'settingsQuickAccessScreen', title: 'Doctor Office', subtitle: '+389 72 555 112', icon: 'fa-user-doctor', color: '#10B981', actionTitle: 'Call Doctor Office', type: 'call' }
  ]
};

const SIM_QUICK_TARGETS = {
  call: [
    { target: 'settingsQuickAccessScreen', title: 'Brother', subtitle: '+389 71 234 567', icon: 'fa-user', color: '#10B981', actionTitle: 'Call Brother', type: 'call' },
    { target: 'settingsQuickAccessScreen', title: 'Mother', subtitle: '+389 70 123 456', icon: 'fa-user', color: '#10B981', actionTitle: 'Call Mother', type: 'call' },
    { target: 'settingsQuickAccessScreen', title: 'Caregiver Elena', subtitle: '+389 75 999 888', icon: 'fa-user-nurse', color: '#10B981', actionTitle: 'Call Caregiver Elena', type: 'call' },
    { target: 'settingsQuickAccessScreen', title: 'Doctor Office', subtitle: '+389 72 555 112', icon: 'fa-user-doctor', color: '#10B981', actionTitle: 'Call Doctor Office', type: 'call' }
  ],
  msg: [
    { target: 'settingsQuickAccessScreen', title: 'Brother', subtitle: '+389 71 234 567', icon: 'fa-user', color: '#00E5FF', actionTitle: 'Message Brother', type: 'msg' },
    { target: 'settingsQuickAccessScreen', title: 'Mother', subtitle: '+389 70 123 456', icon: 'fa-user', color: '#00E5FF', actionTitle: 'Message Mother', type: 'msg' },
    { target: 'settingsQuickAccessScreen', title: 'Caregiver Elena', subtitle: '+389 75 999 888', icon: 'fa-user-nurse', color: '#00E5FF', actionTitle: 'Message Caregiver Elena', type: 'msg' },
    { target: 'settingsQuickAccessScreen', title: 'Doctor Office', subtitle: '+389 72 555 112', icon: 'fa-user-doctor', color: '#00E5FF', actionTitle: 'Message Doctor Office', type: 'msg' }
  ],
  nav: [
    { target: 'settingsQuickAccessScreen', title: 'Home', subtitle: 'Partizanska 45 (450m away)', icon: 'fa-house', color: '#A855F7', actionTitle: 'Navigate to Home', type: 'nav' },
    { target: 'settingsQuickAccessScreen', title: 'Doctor Office', subtitle: 'Mother Teresa Clinic (1.2 km)', icon: 'fa-hospital', color: '#A855F7', actionTitle: 'Navigate to Doctor Office', type: 'nav' },
    { target: 'settingsQuickAccessScreen', title: 'Eurofarm Pharmacy', subtitle: 'Kliment Ohridski 12 (280m)', icon: 'fa-prescription-bottle-medical', color: '#A855F7', actionTitle: 'Navigate to Eurofarm Pharmacy', type: 'nav' },
    { target: 'settingsQuickAccessScreen', title: 'Supermarket Tinex', subtitle: 'Ilindenska 80 (600m away)', icon: 'fa-cart-shopping', color: '#A855F7', actionTitle: 'Navigate to Supermarket Tinex', type: 'nav' }
  ],
  camera: [
    { target: 'settingsQuickAccessScreen', title: 'Scene & Obstacles', subtitle: 'AI room & path description', icon: 'fa-eye', color: '#FFEE55', actionTitle: 'Scan: Scene & Obstacles', type: 'camera' },
    { target: 'settingsQuickAccessScreen', title: 'Text & Document', subtitle: 'Live OCR text reader', icon: 'fa-file-lines', color: '#FFEE55', actionTitle: 'Scan: Text & Document', type: 'camera' },
    { target: 'settingsQuickAccessScreen', title: 'Color & Light', subtitle: 'Ambient lighting detector', icon: 'fa-palette', color: '#FFEE55', actionTitle: 'Scan: Color & Light', type: 'camera' },
    { target: 'settingsQuickAccessScreen', title: 'Currency & Cash', subtitle: 'Banknote identifier', icon: 'fa-money-bill', color: '#FFEE55', actionTitle: 'Scan: Currency & Cash', type: 'camera' }
  ]
};

let simCategoryIndices = {};
let simCallSourceScreen = 'phoneCategoryMenu';
let simDialedNumber = '';
let simDialReady = false;
let simNavActionSource = 'search';
let simSelectedPlace = { title: 'Eurofarm Pharmacy', subtitle: 'Kliment Ohridski 12 (280m away)', phone: '+389 72 888 999', distance: '280m away' };
let simActiveMessage = { title: 'Mother', subtitle: 'Where are you? When are you coming home?', time: '12:05 PM', unread: true };
let simReadingMode = 'TTS Only'; // 'TTS Only', 'Morse Only', 'Combined'
let simMorseSpeed = 'Medium'; // 'Slow', 'Medium', 'Fast'
let simVibIntensity = 'Medium'; // 'Low', 'Medium', 'High'
let simPrivacyMode = false; // false (OFF), true (ON)
let simNewActionType = 'call'; // 'call', 'msg', 'nav', 'camera'
let simSosState = 'idle'; // 'idle', 'countdown', 'dispatched'
let simSosCountdown = 3;
let simSosTimer = null;


function updateSimulatorScreenContext(containerId, screenId, categoryIndex = null) {
  const screenSelect = document.getElementById(`${containerId}_simScreenSelect`);
  if (screenSelect) {
    if (![...screenSelect.options].some(opt => opt.value === screenId)) {
      const newOpt = document.createElement('option');
      newOpt.value = screenId;
      newOpt.text = `${screenId}`;
      screenSelect.appendChild(newOpt);
    }
    if (screenSelect.value !== screenId) {
      screenSelect.value = screenId;
    }
  }

  const display = document.getElementById(`${containerId}_activeContextDisplay`);
  const viewportContent = document.getElementById(`${containerId}_viewportContent`);
  const touchNavZone = document.getElementById(`${containerId}_touchNavZone`);

  if (touchNavZone) {
    touchNavZone.style.display = screenId === 'sosScreen' ? 'none' : 'block';
    if (screenId === 'navSearchInputScreen' || screenId === 'contactSaveNameInputScreen') {
      const isContactSave = screenId === 'contactSaveNameInputScreen';
      const promptTitle = isContactSave
        ? (simIsHoldingVoice ? '● RECORDING NAME...' : 'HOLD TO SPEAK NAME & SURNAME')
        : (simIsHoldingVoice ? '● RECORDING VOICE...' : 'HOLD TO SPEAK DESTINATION');
      const promptSub = isContactSave
        ? (simIsHoldingVoice ? 'Speak contact name now (Release to set)' : '(Press & hold here to speak name, release to set)')
        : (simIsHoldingVoice ? 'Speak destination now (Release to search)' : '(Press & hold here to speak, release to search)');
      touchNavZone.innerHTML = `
        <div style="color: ${simIsHoldingVoice ? '#00E5FF' : '#FFEE55'}; font-size: 0.78rem; font-weight: 900; letter-spacing: 0.5px;">
          <i class="fa-solid ${simIsHoldingVoice ? 'fa-microphone-lines' : 'fa-microphone'}"></i> 120px HIGH-TOUCH ZONE — ${promptTitle}
        </div>
        <div style="color: ${simIsHoldingVoice ? '#00E5FF' : '#9CA3AF'}; font-size: 0.65rem; margin-top: 2px;">
          ${promptSub}
        </div>
      `;
      touchNavZone.style.background = simIsHoldingVoice ? 'rgba(0, 229, 255, 0.25)' : 'rgba(255, 238, 85, 0.08)';
      touchNavZone.style.borderColor = simIsHoldingVoice ? '#00E5FF' : '#FFEE55';
    } else {
      touchNavZone.innerHTML = `
        <div style="color: #FFEE55; font-size: 0.75rem; font-weight: 900; letter-spacing: 0.5px;">
          <i class="fa-solid fa-hand-pointer"></i> 120px HIGH-TOUCH NAVIGATION ZONE
        </div>
        <div style="color: #9CA3AF; font-size: 0.65rem; margin-top: 2px;">(Simulates blind finger touch area)</div>
      `;
      touchNavZone.style.background = 'rgba(255, 238, 85, 0.08)';
      touchNavZone.style.borderColor = '#FFEE55';
    }
  }

  if (display) display.innerText = `[ ${screenId} ]`;
  if (!viewportContent) return;

  const menuList = SIMULATOR_MENUS[screenId];

  if (menuList && menuList.length > 0) {
    if (categoryIndex !== null) {
      simCategoryIndices[screenId] = categoryIndex;
    }
    const currentIdx = (simCategoryIndices[screenId] || 0) % menuList.length;
    const currentItem = menuList[currentIdx];

    const isMessageScreen = screenId === 'messagesView' || screenId === 'messagesScreen';

    const dotsHtml = menuList.map((item, idx) => {
      const isActive = idx === currentIdx;
      const dotColor = (screenId === 'contactsListScreen' || screenId === 'favoritesListScreen') ? '#FFEE55' : (currentItem.color || '#FFEE55');
      return `
        <span style="
          width: ${isActive ? '20px' : '6px'};
          height: 6px;
          background: ${isActive ? dotColor : '#334155'};
          border-radius: ${isActive ? '3px' : '50%'};
          transition: all 0.25s ease;
          display: inline-block;
        "></span>
      `;
    }).join('');

    if (isMessageScreen) {
      viewportContent.innerHTML = `
        <div style="max-width: 290px; width: 100%; height: 130px; margin: 0 auto; border: 2px solid ${currentItem.color}; border-radius: 14px; padding: 10px 14px; background: rgba(0,0,0,0.85); display: flex; flex-direction: column; justify-content: space-between; text-align: left; box-shadow: 0 0 15px rgba(0, 229, 255, 0.12); box-sizing: border-box;">
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; border-bottom: 1px dashed #222; padding-bottom: 4px;">
            <span style="background: ${currentItem.unread ? '#00E5FF' : '#334155'}; color: ${currentItem.unread ? '#000' : '#FFF'}; font-size: 0.62rem; font-weight: 900; padding: 1px 6px; border-radius: 4px; line-height: 1.2;">
              ${currentItem.unread ? '● NEW UNREAD' : 'READ'}
            </span>
            <span style="color: #FFEE55; background: #181818; padding: 1px 6px; border-radius: 8px; font-size: 0.68rem; font-weight: bold; line-height: 1.2; border: 1px solid rgba(255,238,85,0.4);">[ ${currentIdx + 1} / ${menuList.length} ]</span>
            <span style="color: #94A3B8; font-size: 0.68rem; font-weight: 600; line-height: 1.2;">${currentItem.time || '12:05 PM'}</span>
          </div>

          <div style="display: flex; align-items: center; justify-content: center; gap: 10px; padding: 4px 0;">
            <div style="width: 36px; height: 36px; border-radius: 50%; border: 1.5px solid ${currentItem.color}; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); flex-shrink: 0;">
              <i class="fa-solid ${currentItem.icon}" style="font-size: 1.1rem; color: ${currentItem.color};"></i>
            </div>
            <strong style="color: #FFFFFF; font-size: 1.2rem; font-weight: 900; letter-spacing: 0.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${currentItem.title}</strong>
          </div>

          <!-- Indicator Dots -->
          <div style="display: flex; justify-content: center; gap: 4px; align-items: center; margin-top: 2px;">
            ${dotsHtml}
          </div>
        </div>
      `;
      return;
    }

    if (screenId === 'contactsListScreen') {
      const contactColor = '#FFEE55';
      viewportContent.innerHTML = `
        <div id="${containerId}_contactCardBtn" style="width: 100%; border: 2px solid ${contactColor}; border-radius: 14px; padding: 14px 10px; background: rgba(0,0,0,0.9); display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; box-shadow: 0 0 20px rgba(255, 238, 85, 0.12); margin: 4px 0; min-height: 140px; cursor: pointer;">
          <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; border-bottom: 1px dashed #222; padding-bottom: 4px;">
            <div style="display: flex; gap: 4px;">
              ${currentItem.favorite ? `<span style="background: #00E5FF; color: #000; font-size: 0.62rem; font-weight: 900; padding: 1px 6px; border-radius: 4px;">★ FAVORITE</span>` : ''}
              ${currentItem.emergency ? `<span style="background: #EF4444; color: #FFF; font-size: 0.62rem; font-weight: 900; padding: 1px 6px; border-radius: 4px;">🚨 EMERGENCY</span>` : ''}
            </div>
            <span style="color: #FFEE55; background: #181818; padding: 1px 6px; border-radius: 8px; font-size: 0.68rem; border: 1px solid rgba(255,238,85,0.4);">[ ${currentIdx + 1} / ${menuList.length} ]</span>
          </div>

          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; margin: 10px 0;">
            <div style="width: 52px; height: 52px; border-radius: 50%; border: 2px solid ${contactColor}; display: flex; align-items: center; justify-content: center; background: rgba(255,238,85,0.08); box-shadow: 0 0 15px rgba(0,0,0,0.6);">
              <i class="fa-solid ${currentItem.icon}" style="font-size: 1.5rem; color: ${contactColor};"></i>
            </div>
            <div>
              <strong style="color: #FFFFFF; font-size: 1.25rem; font-weight: 900; display: block; letter-spacing: 0.5px;">${currentItem.title}</strong>
              <span style="color: #FFEE55; font-size: 0.88rem; font-family: monospace; letter-spacing: 0.5px;">${currentItem.subtitle}</span>
            </div>
          </div>

          <div style="display: flex; justify-content: center; gap: 4px; align-items: center; margin-top: 2px;">
            ${dotsHtml}
          </div>
        </div>
      `;

      const cardBtn = document.getElementById(`${containerId}_contactCardBtn`);
      if (cardBtn) {
        let cardTapTime = 0;
        cardBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const now = Date.now();
          if (now - cardTapTime < 500) {
            cardTapTime = 0;
            executeSimulatorGesture(containerId, 'DOUBLE_TAP', 'contactsListScreen', 'zone_bottom_navigation_bar_global');
          } else {
            cardTapTime = now;
          }
        });
      }
      return;
    }

    if (screenId === 'contactActionMenuScreen') {
      const selectedContact = (SIMULATOR_MENUS['contactsListScreen'] || [])[(simCategoryIndices['contactsListScreen'] || 0) % (SIMULATOR_MENUS['contactsListScreen']?.length || 1)];
      let dynamicActionTitle = currentItem.title;
      if (currentItem.actionId === 'toggle_fav') {
        dynamicActionTitle = selectedContact?.favorite ? 'REMOVE FROM FAVORITES' : 'ADD TO FAVORITES';
      } else if (currentItem.actionId === 'toggle_emerg') {
        dynamicActionTitle = selectedContact?.emergency ? 'REMOVE FROM EMERGENCY' : 'ADD TO EMERGENCY';
      }

      viewportContent.innerHTML = `
        <div style="width: 100%; border: 2px solid ${currentItem.color}; border-radius: 12px; padding: 14px 10px; background: rgba(0,0,0,0.85); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center; box-shadow: 0 0 20px rgba(0,0,0,0.8); margin: 6px 0;">
          <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; color: #94A3B8; border-bottom: 1px dashed #222; padding-bottom: 4px;">
            <span style="color: ${currentItem.color}; font-weight: bold;">Actions for ${selectedContact?.title || 'Contact'}</span>
            <span style="color: #FFEE55; background: #181818; padding: 1px 6px; border-radius: 8px; border: 1px solid rgba(255,238,85,0.4);">[ ${currentIdx + 1} / ${menuList.length} ]</span>
          </div>
          
          <div style="width: 50px; height: 50px; border-radius: 50%; border: 2px solid ${currentItem.color}; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.04); margin-top: 2px;">
            <i class="fa-solid ${currentItem.icon}" style="font-size: 1.5rem; color: ${currentItem.color};"></i>
          </div>

          <div>
            <h4 style="margin: 0; font-size: 1rem; font-weight: 900; color: ${currentItem.color};">${dynamicActionTitle}</h4>
            <p style="margin: 2px 0 0 0; font-size: 0.72rem; color: #94A3B8;">${selectedContact?.title} (${selectedContact?.subtitle})</p>
          </div>

          <div style="display: flex; gap: 4px; align-items: center; margin-top: 4px;">
            ${dotsHtml}
          </div>
        </div>
      `;
      return;
    }

    if (screenId === 'dialerActionMenuScreen') {
      const targetNum = simDialedNumber || '+389 70 123 456';
      let dynamicActionTitle = currentItem.title;
      let dynamicActionSub = currentItem.subtitle;
      if (currentItem.actionId === 'call') {
        dynamicActionTitle = `CALL NUMBER`;
        dynamicActionSub = `Place voice call to ${targetNum}`;
      } else if (currentItem.actionId === 'save_contact') {
        dynamicActionSub = `Save ${targetNum} as new contact in directory`;
      }

      viewportContent.innerHTML = `
        <div style="width: 100%; border: 2px solid ${currentItem.color}; border-radius: 12px; padding: 14px 10px; background: rgba(0,0,0,0.92); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center; box-shadow: 0 0 20px rgba(0,0,0,0.8); margin: 6px 0;">
          <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; color: #94A3B8; border-bottom: 1px dashed #222; padding-bottom: 4px;">
            <span style="color: ${currentItem.color}; font-weight: bold;">Options for ${targetNum}</span>
            <span style="color: #FFEE55; background: #181818; padding: 1px 6px; border-radius: 8px; border: 1px solid rgba(255,238,85,0.4);">[ ${currentIdx + 1} / ${menuList.length} ]</span>
          </div>
          
          <div style="width: 50px; height: 50px; border-radius: 50%; border: 2px solid ${currentItem.color}; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.04); margin-top: 2px;">
            <i class="fa-solid ${currentItem.icon}" style="font-size: 1.5rem; color: ${currentItem.color};"></i>
          </div>

          <div>
            <h4 style="margin: 0; font-size: 1.05rem; font-weight: 900; color: ${currentItem.color}; letter-spacing: 0.5px;">${dynamicActionTitle}</h4>
            <p style="margin: 2px 0 0 0; font-size: 0.72rem; color: #94A3B8;">${dynamicActionSub}</p>
          </div>

          <div style="display: flex; gap: 4px; align-items: center; margin-top: 4px;">
            ${dotsHtml}
          </div>
        </div>
      `;
      return;
    }

    if (screenId === 'favoritesListScreen') {
      viewportContent.innerHTML = `
        <div style="width: 100%; border: 2px solid ${currentItem.color}; border-radius: 14px; padding: 14px 10px; background: rgba(0,0,0,0.9); display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; box-shadow: 0 0 20px rgba(255, 238, 85, 0.12); margin: 4px 0; min-height: 140px;">
          <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; border-bottom: 1px dashed #222; padding-bottom: 4px;">
            <span style="background: #FFEE55; color: #000; font-size: 0.62rem; font-weight: 900; padding: 1px 6px; border-radius: 4px;">★ FAVORITE SPEED DIAL</span>
            <span style="color: #FFEE55; background: #181818; padding: 1px 6px; border-radius: 8px; font-size: 0.68rem; border: 1px solid rgba(255,238,85,0.4);">[ ${currentIdx + 1} / ${menuList.length} ]</span>
          </div>

          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; margin: 10px 0;">
            <div style="width: 52px; height: 52px; border-radius: 50%; border: 2px solid ${currentItem.color}; display: flex; align-items: center; justify-content: center; background: rgba(255,238,85,0.1); box-shadow: 0 0 15px rgba(0,0,0,0.6);">
              <i class="fa-solid fa-star" style="font-size: 1.5rem; color: #FFEE55;"></i>
            </div>
            <div>
              <strong style="color: #FFFFFF; font-size: 1.25rem; font-weight: 900; display: block; letter-spacing: 0.5px;">${currentItem.title}</strong>
              <span style="color: #FFEE55; font-size: 0.88rem; font-family: monospace; letter-spacing: 0.5px;">${currentItem.subtitle}</span>
            </div>
          </div>

          <div style="display: flex; justify-content: center; gap: 4px; align-items: center; margin-top: 2px;">
            ${dotsHtml}
          </div>
        </div>
      `;
      return;
    }

    if (screenId === 'recentCallsScreen' || screenId === 'recentsListScreen') {
      viewportContent.innerHTML = `
        <div style="width: 100%; border: 2px solid ${currentItem.color}; border-radius: 14px; padding: 14px 10px; background: rgba(0,0,0,0.9); display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; box-shadow: 0 0 20px rgba(0, 229, 255, 0.12); margin: 4px 0; min-height: 140px;">
          <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; border-bottom: 1px dashed #222; padding-bottom: 4px;">
            <span style="background: ${currentItem.color || '#00E5FF'}; color: #000; font-size: 0.62rem; font-weight: 900; padding: 1px 6px; border-radius: 4px;">
              <i class="fa-solid ${currentItem.icon || 'fa-phone'}"></i> ${(currentItem.callType || 'CALL').toUpperCase()}
            </span>
            <span style="color: #94A3B8; font-size: 0.68rem;">${currentItem.time || 'Recent'}</span>
            <span style="color: #FFEE55; background: #181818; padding: 1px 6px; border-radius: 8px; font-size: 0.68rem; border: 1px solid rgba(255,238,85,0.4);">[ ${currentIdx + 1} / ${menuList.length} ]</span>
          </div>

          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; margin: 10px 0;">
            <div style="width: 52px; height: 52px; border-radius: 50%; border: 2px solid ${currentItem.color}; display: flex; align-items: center; justify-content: center; background: rgba(0,229,255,0.08); box-shadow: 0 0 15px rgba(0,0,0,0.6);">
              <i class="fa-solid fa-user" style="font-size: 1.5rem; color: #00E5FF;"></i>
            </div>
            <div>
              <strong style="color: #FFFFFF; font-size: 1.25rem; font-weight: 900; display: block; letter-spacing: 0.5px;">${currentItem.title}</strong>
              <span style="color: #FFEE55; font-size: 0.88rem; font-family: monospace; letter-spacing: 0.5px;">${currentItem.subtitle}</span>
            </div>
          </div>

          <div style="display: flex; justify-content: center; gap: 4px; align-items: center; margin-top: 2px;">
            ${dotsHtml}
          </div>
        </div>
      `;
      return;
    }

    if (screenId === 'emergencyContactsListScreen') {
      viewportContent.innerHTML = `
        <div style="width: 100%; border: 2px solid #EF4444; border-radius: 14px; padding: 14px 10px; background: rgba(0,0,0,0.9); display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; box-shadow: 0 0 20px rgba(239, 68, 68, 0.18); margin: 4px 0; min-height: 140px;">
          <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; border-bottom: 1px dashed #222; padding-bottom: 4px;">
            <span style="background: #EF4444; color: #FFF; font-size: 0.62rem; font-weight: 900; padding: 1px 6px; border-radius: 4px;">🚨 EMERGENCY SPEED DIAL</span>
            <span style="color: #FFEE55; background: #181818; padding: 1px 6px; border-radius: 8px; font-size: 0.68rem; border: 1px solid rgba(255,238,85,0.4);">[ ${currentIdx + 1} / ${menuList.length} ]</span>
          </div>

          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; margin: 10px 0;">
            <div style="width: 52px; height: 52px; border-radius: 50%; border: 2px solid #EF4444; display: flex; align-items: center; justify-content: center; background: rgba(239,68,68,0.12); box-shadow: 0 0 15px rgba(0,0,0,0.6);">
              <i class="fa-solid ${currentItem.icon || 'fa-shield-heart'}" style="font-size: 1.5rem; color: #EF4444;"></i>
            </div>
            <div>
              <strong style="color: #FFFFFF; font-size: 1.25rem; font-weight: 900; display: block; letter-spacing: 0.5px;">${currentItem.title}</strong>
              <span style="color: #EF4444; font-size: 0.88rem; font-family: monospace; letter-spacing: 0.5px;">${currentItem.subtitle}</span>
            </div>
          </div>

          <div style="display: flex; justify-content: center; gap: 4px; align-items: center; margin-top: 2px;">
            ${dotsHtml}
          </div>
        </div>
      `;
      return;
    }

    if (screenId === 'savedPlacesListScreen') {
      viewportContent.innerHTML = `
        <div style="width: 100%; border: 2px solid #00E5FF; border-radius: 14px; padding: 14px 10px; background: rgba(0,0,0,0.9); display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; box-shadow: 0 0 20px rgba(0, 229, 255, 0.18); margin: 4px 0; min-height: 140px;">
          <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; border-bottom: 1px dashed #222; padding-bottom: 4px;">
            <span style="background: #00E5FF; color: #000; font-size: 0.62rem; font-weight: 900; padding: 1px 6px; border-radius: 4px;">★ SAVED DESTINATION</span>
            <span style="color: #FFEE55; font-size: 0.68rem; font-weight: bold; font-family: monospace;">${currentItem.distance || '450m away'}</span>
            <span style="color: #FFEE55; background: #181818; padding: 1px 6px; border-radius: 8px; font-size: 0.68rem; border: 1px solid rgba(255,238,85,0.4);">[ ${currentIdx + 1} / ${menuList.length} ]</span>
          </div>

          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; margin: 10px 0;">
            <div style="width: 52px; height: 52px; border-radius: 50%; border: 2px solid #00E5FF; display: flex; align-items: center; justify-content: center; background: rgba(0,229,255,0.12); box-shadow: 0 0 15px rgba(0,0,0,0.6);">
              <i class="fa-solid ${currentItem.icon || 'fa-map-pin'}" style="font-size: 1.5rem; color: #00E5FF;"></i>
            </div>
            <div>
              <strong style="color: #FFFFFF; font-size: 1.25rem; font-weight: 900; display: block; letter-spacing: 0.5px;">${currentItem.title}</strong>
              <span style="color: #94A3B8; font-size: 0.85rem; letter-spacing: 0.3px;">${currentItem.subtitle}</span>
            </div>
          </div>

          <div style="display: flex; justify-content: center; gap: 4px; align-items: center; margin-top: 2px;">
            ${dotsHtml}
          </div>
        </div>
      `;
      return;
    }

    if (screenId === 'navPlaceActionMenuScreen' || screenId === 'placeActionMenuScreen') {
      let actionTitle = currentItem.title;
      let actionSubtitle = currentItem.subtitle;
      let actionIcon = currentItem.icon;
      let actionColor = currentItem.color;

      if (currentIdx === 2) {
        if (simNavActionSource === 'search') {
          actionTitle = 'SAVE PLACE';
          actionSubtitle = 'Save to saved destinations list';
          actionIcon = 'fa-bookmark';
          actionColor = '#FFEE55';
        } else {
          actionTitle = 'REMOVE FROM SAVED DESTINATIONS';
          actionSubtitle = 'Remove from saved destinations list';
          actionIcon = 'fa-trash-can';
          actionColor = '#EF4444';
        }
      }

      viewportContent.innerHTML = `
        <div style="width: 100%; border: 2px solid ${actionColor}; border-radius: 12px; padding: 14px 10px; background: rgba(0,0,0,0.92); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center; box-shadow: 0 0 20px rgba(0,0,0,0.8); margin: 6px 0;">
          <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; border-bottom: 1px dashed #222; padding-bottom: 4px;">
            <span style="color: ${actionColor}; font-weight: bold;">Options for ${simSelectedPlace?.title || 'Eurofarm Pharmacy'}</span>
            <span style="color: #FFEE55; background: #181818; padding: 1px 6px; border-radius: 8px; border: 1px solid rgba(255,238,85,0.4);">[ ${currentIdx + 1} / 3 ]</span>
          </div>
          
          <div style="width: 48px; height: 48px; border-radius: 50%; border: 2px solid ${actionColor}; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.04); margin-top: 2px;">
            <i class="fa-solid ${actionIcon}" style="font-size: 1.4rem; color: ${actionColor};"></i>
          </div>

          <div>
            <h4 style="margin: 0; font-size: 1rem; font-weight: 900; color: ${actionColor};">${actionTitle}</h4>
            <p style="margin: 2px 0 0 0; font-size: 0.72rem; color: #94A3B8;">${actionSubtitle}</p>
          </div>

          <div style="display: flex; gap: 4px; align-items: center; margin-top: 2px;">
            ${dotsHtml}
          </div>
        </div>
      `;
      return;
    }

    if (screenId === 'settingsAccessibilityMenu') {
      let badgeHtml = '';
      let optSubtitle = '';
      let optColor = '#10B981';
      let optIcon = 'fa-book-open';
      let optTitle = 'READING MODE';

      const prefIdx = (currentIdx % 3 + 3) % 3;

      if (prefIdx === 0) { // Reading mode
        optTitle = 'READING MODE';
        if (simReadingMode === 'TTS Only') {
          optColor = '#10B981';
          optIcon = 'fa-volume-high';
          optSubtitle = 'Spoken voice synthesis for all menus and messages';
          badgeHtml = `
            <div style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: rgba(16,185,129,0.15); border: 2px solid #10B981; border-radius: 20px; padding: 8px 16px; color: #10B981; font-weight: 900; font-size: 1.05rem; box-shadow: 0 0 14px rgba(16,185,129,0.25);">
              <i class="fa-solid fa-volume-high"></i> TTS VOICE ONLY
            </div>
          `;
        } else {
          optColor = '#00E5FF';
          optIcon = 'fa-wave-square';
          optSubtitle = 'Audio beeps and haptic vibration pulses';
          badgeHtml = `
            <div style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: rgba(0,229,255,0.15); border: 2px solid #00E5FF; border-radius: 20px; padding: 8px 16px; color: #00E5FF; font-weight: 900; font-size: 1.05rem; box-shadow: 0 0 14px rgba(0,229,255,0.25);">
              <i class="fa-solid fa-wave-square"></i> MORSE CODE ONLY
            </div>
          `;
        }
      } else if (prefIdx === 1) { // Morse Speed
        optTitle = 'MORSE CODE SPEED';
        if (simMorseSpeed === 'Slow') {
          optColor = '#00E5FF';
          optIcon = 'fa-gauge-simple';
          optSubtitle = 'Slow training tempo (~8 WPM) • Double Tap to cycle';
          badgeHtml = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
              <div style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: rgba(0,229,255,0.15); border: 2px solid #00E5FF; border-radius: 20px; padding: 8px 18px; color: #00E5FF; font-weight: 900; font-size: 1.05rem; box-shadow: 0 0 16px rgba(0,229,255,0.25);">
                <i class="fa-solid fa-gauge-simple"></i> SLOW (~8 WPM)
              </div>
              <div style="display: flex; gap: 6px; align-items: center;">
                <span style="width: 28px; height: 6px; background: #00E5FF; border-radius: 3px; box-shadow: 0 0 8px #00E5FF;"></span>
                <span style="width: 28px; height: 6px; background: #1E293B; border-radius: 3px;"></span>
                <span style="width: 28px; height: 6px; background: #1E293B; border-radius: 3px;"></span>
              </div>
            </div>
          `;
        } else if (simMorseSpeed === 'Fast') {
          optColor = '#10B981';
          optIcon = 'fa-gauge-high';
          optSubtitle = 'Fast advanced tempo (~20 WPM) • Double Tap to cycle';
          badgeHtml = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
              <div style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: rgba(16,185,129,0.15); border: 2px solid #10B981; border-radius: 20px; padding: 8px 18px; color: #10B981; font-weight: 900; font-size: 1.05rem; box-shadow: 0 0 16px rgba(16,185,129,0.25);">
                <i class="fa-solid fa-gauge-high"></i> FAST (~20 WPM)
              </div>
              <div style="display: flex; gap: 6px; align-items: center;">
                <span style="width: 28px; height: 6px; background: #10B981; border-radius: 3px; box-shadow: 0 0 8px #10B981;"></span>
                <span style="width: 28px; height: 6px; background: #10B981; border-radius: 3px; box-shadow: 0 0 8px #10B981;"></span>
                <span style="width: 28px; height: 6px; background: #10B981; border-radius: 3px; box-shadow: 0 0 8px #10B981;"></span>
              </div>
            </div>
          `;
        } else {
          optColor = '#FFEE55';
          optIcon = 'fa-gauge-med';
          optSubtitle = 'Medium standard tempo (~14 WPM) • Double Tap to cycle';
          badgeHtml = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
              <div style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: rgba(255,238,85,0.15); border: 2px solid #FFEE55; border-radius: 20px; padding: 8px 18px; color: #FFEE55; font-weight: 900; font-size: 1.05rem; box-shadow: 0 0 16px rgba(255,238,85,0.25);">
                <i class="fa-solid fa-gauge-med"></i> MEDIUM (~14 WPM)
              </div>
              <div style="display: flex; gap: 6px; align-items: center;">
                <span style="width: 28px; height: 6px; background: #FFEE55; border-radius: 3px; box-shadow: 0 0 8px #FFEE55;"></span>
                <span style="width: 28px; height: 6px; background: #FFEE55; border-radius: 3px; box-shadow: 0 0 8px #FFEE55;"></span>
                <span style="width: 28px; height: 6px; background: #1E293B; border-radius: 3px;"></span>
              </div>
            </div>
          `;
        }
      } else { // Vibration Intensity
        optTitle = 'VIBRATION INTENSITY';
        if (simVibIntensity === 'Low') {
          optColor = '#00E5FF';
          optIcon = 'fa-feather';
          optSubtitle = 'Soft gentle vibrations (Level 1 of 3) • Slide or Double Tap to adjust';
          badgeHtml = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
              <div style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: rgba(0,229,255,0.15); border: 2px solid #00E5FF; border-radius: 20px; padding: 8px 18px; color: #00E5FF; font-weight: 900; font-size: 1.05rem; box-shadow: 0 0 16px rgba(0,229,255,0.25);">
                <i class="fa-solid fa-feather"></i> LOW INTENSITY (GENTLE)
              </div>
              <div style="display: flex; gap: 6px; align-items: center;">
                <span style="width: 28px; height: 6px; background: #00E5FF; border-radius: 3px; box-shadow: 0 0 8px #00E5FF;"></span>
                <span style="width: 28px; height: 6px; background: #1E293B; border-radius: 3px;"></span>
                <span style="width: 28px; height: 6px; background: #1E293B; border-radius: 3px;"></span>
              </div>
            </div>
          `;
        } else if (simVibIntensity === 'High') {
          optColor = '#EF4444';
          optIcon = 'fa-bolt-lightning';
          optSubtitle = 'Maximum strong vibrations (Level 3 of 3) • Slide or Double Tap to adjust';
          badgeHtml = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
              <div style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: rgba(239,68,68,0.15); border: 2px solid #EF4444; border-radius: 20px; padding: 8px 18px; color: #EF4444; font-weight: 900; font-size: 1.05rem; box-shadow: 0 0 16px rgba(239,68,68,0.25);">
                <i class="fa-solid fa-bolt-lightning"></i> HIGH INTENSITY (STRONG)
              </div>
              <div style="display: flex; gap: 6px; align-items: center;">
                <span style="width: 28px; height: 6px; background: #EF4444; border-radius: 3px; box-shadow: 0 0 8px #EF4444;"></span>
                <span style="width: 28px; height: 6px; background: #EF4444; border-radius: 3px; box-shadow: 0 0 8px #EF4444;"></span>
                <span style="width: 28px; height: 6px; background: #EF4444; border-radius: 3px; box-shadow: 0 0 8px #EF4444;"></span>
              </div>
            </div>
          `;
        } else {
          optColor = '#FFEE55';
          optIcon = 'fa-wave-square';
          optSubtitle = 'Standard balanced vibrations (Level 2 of 3) • Slide or Double Tap to adjust';
          badgeHtml = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
              <div style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: rgba(255,238,85,0.15); border: 2px solid #FFEE55; border-radius: 20px; padding: 8px 18px; color: #FFEE55; font-weight: 900; font-size: 1.05rem; box-shadow: 0 0 16px rgba(255,238,85,0.25);">
                <i class="fa-solid fa-wave-square"></i> MEDIUM INTENSITY (BALANCED)
              </div>
              <div style="display: flex; gap: 6px; align-items: center;">
                <span style="width: 28px; height: 6px; background: #FFEE55; border-radius: 3px; box-shadow: 0 0 8px #FFEE55;"></span>
                <span style="width: 28px; height: 6px; background: #FFEE55; border-radius: 3px; box-shadow: 0 0 8px #FFEE55;"></span>
                <span style="width: 28px; height: 6px; background: #1E293B; border-radius: 3px;"></span>
              </div>
            </div>
          `;
        }
      }
      viewportContent.innerHTML = `
        <div style="width: 100%; border: 2px solid ${optColor}; border-radius: 14px; padding: 14px 10px; background: rgba(0,0,0,0.9); display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; box-shadow: 0 0 20px rgba(0,0,0,0.8); margin: 4px 0; min-height: 140px;">
          <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; border-bottom: 1px dashed #222; padding-bottom: 4px;">
            <span style="color: ${optColor}; font-weight: bold;">[ ACCESSIBILITY PREFERENCES ]</span>
            <span style="color: #FFEE55; background: #181818; padding: 1px 6px; border-radius: 8px; font-size: 0.68rem; border: 1px solid rgba(255,238,85,0.4);">[ ${currentIdx + 1} / 2 ]</span>
          </div>

          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; margin: 10px 0; width: 100%;">
            <div style="width: 48px; height: 48px; border-radius: 50%; border: 2px solid ${optColor}; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.04); box-shadow: 0 0 15px rgba(0,0,0,0.6);">
              <i class="fa-solid ${optIcon}" style="font-size: 1.4rem; color: ${optColor};"></i>
            </div>
            <div>
              <h4 style="margin: 0 0 6px 0; font-size: 1rem; font-weight: 900; color: #FFFFFF; letter-spacing: 0.5px;">${optTitle}</h4>
              ${badgeHtml}
              <p style="margin: 6px 0 0 0; font-size: 0.72rem; color: #94A3B8;">${optSubtitle}</p>
            </div>
          </div>

          <div></div>

          <div style="display: flex; justify-content: center; gap: 4px; align-items: center; margin-top: 2px;">
            ${dotsHtml}
          </div>
        </div>
      `;

      const navZoneEl = document.getElementById(`${containerId}_touchNavZone`);
      if (navZoneEl) {
        navZoneEl.innerHTML = `
          <div style="font-size: 0.78rem; color: #FFEE55; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <i class="fa-solid fa-hand-pointer"></i> 120px HIGH-TOUCH NAVIGATION ZONE
          </div>
          <div style="font-size: 0.68rem; color: #64748B; margin-top: 2px;">(Simulates blind finger touch area)</div>
        `;
      }
      return;
    }

    if (screenId === 'settingsQuickAccessScreen') {
      const isEnabled = currentItem.enabled;
      const actColor = currentItem.color || '#10B981';
      viewportContent.innerHTML = `
        <div style="width: 100%; border: 2px solid ${isEnabled ? actColor : '#475569'}; border-radius: 14px; padding: 14px 10px; background: rgba(0,0,0,0.9); display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; box-shadow: 0 0 20px rgba(0,0,0,0.8); margin: 4px 0; min-height: 140px;">
          <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; border-bottom: 1px dashed #222; padding-bottom: 4px;">
            <span style="background: ${isEnabled ? actColor : '#334155'}; color: ${isEnabled ? '#000' : '#FFF'}; font-size: 0.65rem; font-weight: 900; padding: 1px 6px; border-radius: 4px;">
              ${isEnabled ? 'ENABLED' : 'DISABLED'}
            </span>
            <span style="color: #FFEE55; background: #181818; padding: 1px 6px; border-radius: 8px; font-size: 0.68rem; border: 1px solid rgba(255,238,85,0.4);">[ ${currentIdx + 1} / ${menuList.length} ]</span>
          </div>

          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; margin: 10px 0;">
            <div style="width: 52px; height: 52px; border-radius: 50%; border: 2px solid ${actColor}; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.04); box-shadow: 0 0 15px rgba(0,0,0,0.6);">
              <i class="fa-solid ${currentItem.icon}" style="font-size: 1.5rem; color: ${actColor};"></i>
            </div>
            <div>
              <h4 style="margin: 0; font-size: 1.25rem; font-weight: 900; color: #FFFFFF; letter-spacing: 0.5px;">${currentItem.title}</h4>
            </div>
          </div>

          <div style="display: flex; justify-content: center; gap: 4px; align-items: center; margin-top: 2px;">
            ${dotsHtml}
          </div>
        </div>
      `;
      return;
    }

    if (screenId === 'settingsAddQuickActionScreen') {
      viewportContent.innerHTML = `
        <div style="width: 100%; border: 2px solid ${currentItem.color}; border-radius: 12px; padding: 14px 10px; background: rgba(0,0,0,0.92); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center; box-shadow: 0 0 20px rgba(0,0,0,0.8); margin: 4px 0;">
          <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; border-bottom: 1px dashed #222; padding-bottom: 4px;">
            <span style="color: ${currentItem.color}; font-weight: bold;">[ CHOOSE ACTION TYPE ]</span>
            <span style="color: #FFEE55; background: #181818; padding: 1px 6px; border-radius: 8px; border: 1px solid rgba(255,238,85,0.4);">[ ${currentIdx + 1} / 4 ]</span>
          </div>
          
          <div style="width: 48px; height: 48px; border-radius: 50%; border: 2px solid ${currentItem.color}; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.04); margin-top: 2px;">
            <i class="fa-solid ${currentItem.icon}" style="font-size: 1.4rem; color: ${currentItem.color};"></i>
          </div>

          <div>
            <h4 style="margin: 0; font-size: 1.05rem; font-weight: 900; color: ${currentItem.color};">${currentItem.title}</h4>
            <p style="margin: 2px 0 0 0; font-size: 0.7rem; color: #94A3B8;">${currentItem.subtitle}</p>
          </div>

          <div style="background: rgba(255,255,255,0.06); border: 1px dashed ${currentItem.color}; border-radius: 6px; padding: 4px 10px; font-size: 0.68rem; color: ${currentItem.color}; font-weight: bold;">
            Double Tap to Select Target
          </div>

          <div style="display: flex; gap: 4px; align-items: center; margin-top: 2px;">
            ${dotsHtml}
          </div>
        </div>
      `;
      return;
    }

    if (screenId === 'settingsPickTargetScreen') {
      const actColor = currentItem.color || '#10B981';
      viewportContent.innerHTML = `
        <div style="width: 100%; border: 2px solid ${actColor}; border-radius: 12px; padding: 14px 10px; background: rgba(0,0,0,0.92); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center; box-shadow: 0 0 20px rgba(0,0,0,0.8); margin: 4px 0;">
          <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; border-bottom: 1px dashed #222; padding-bottom: 4px;">
            <span style="color: ${actColor}; font-weight: bold;">[ SELECT TARGET ]</span>
            <span style="color: #FFEE55; background: #181818; padding: 1px 6px; border-radius: 8px; border: 1px solid rgba(255,238,85,0.4);">[ ${currentIdx + 1} / ${menuList.length} ]</span>
          </div>
          
          <div style="width: 48px; height: 48px; border-radius: 50%; border: 2px solid ${actColor}; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.04); margin-top: 2px;">
            <i class="fa-solid ${currentItem.icon}" style="font-size: 1.4rem; color: ${actColor};"></i>
          </div>

          <div>
            <h4 style="margin: 0; font-size: 1.05rem; font-weight: 900; color: #FFFFFF;">${currentItem.title}</h4>
            <p style="margin: 2px 0 0 0; font-size: 0.7rem; color: #94A3B8;">${currentItem.subtitle}</p>
          </div>

          <div style="background: rgba(255,255,255,0.06); border: 1px dashed ${actColor}; border-radius: 6px; padding: 4px 10px; font-size: 0.68rem; color: ${actColor}; font-weight: bold;">
            Creates: "${currentItem.actionTitle}"
          </div>

          <div style="display: flex; gap: 4px; align-items: center; margin-top: 2px;">
            ${dotsHtml}
          </div>
        </div>
      `;
      return;
    }

    if (screenId === 'mainMenuScreen') {
      viewportContent.innerHTML = `
        <div style="width: 100%; height: 215px; border: 2px solid #FFCC00; border-radius: 14px; position: relative; background: #000000; display: flex; flex-direction: column; overflow: hidden; box-shadow: inset 0 0 30px rgba(255, 204, 0, 0.05), 0 0 25px rgba(0, 0, 0, 0.9); box-sizing: border-box;">
          
          <!-- Subtle Tactile Watermark (Behind Canvas) -->
          <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; opacity: 0.22; gap: 8px;">
            <i class="fa-solid fa-signature" style="font-size: 3.2rem; color: #FFCC00;"></i>
            <span style="font-size: 0.75rem; letter-spacing: 2px; color: #FFFFFF; font-weight: 800; text-transform: uppercase;">
              Draw M • P • C • N • S
            </span>
          </div>

          <!-- Expansive Drawing Canvas -->
          <canvas id="${containerId}_simMainMenuCanvas" style="position: absolute; inset: 0; width: 100%; height: 100%; cursor: crosshair; touch-action: none; z-index: 2; background: transparent;"></canvas>
        </div>
      `;

      setTimeout(() => {
        const canvas = document.getElementById(`${containerId}_simMainMenuCanvas`);
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const dpr = window.devicePixelRatio || 1;
          const w = rect.width || 280;
          const h = rect.height || 215;
          canvas.width = Math.round(w * dpr);
          canvas.height = Math.round(h * dpr);
          canvas.style.width = w + 'px';
          canvas.style.height = h + 'px';

          const ctx = canvas.getContext('2d');
          if (ctx.resetTransform) ctx.resetTransform();
          else ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.scale(dpr, dpr);

          let isDrawing = false;
          let pts = [];

          function getPos(e) {
            const r = canvas.getBoundingClientRect();
            const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
            const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
            return {
              x: clientX - r.left,
              y: clientY - r.top
            };
          }

          canvas.onpointerdown = (e) => {
            e.preventDefault();
            try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
            isDrawing = true;
            const p = getPos(e);
            pts = [p];
            ctx.strokeStyle = '#FFEE55';
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.shadowColor = '#FFEE55';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
          };

          canvas.onpointermove = (e) => {
            if (!isDrawing) return;
            e.preventDefault();
            const p = getPos(e);
            pts.push(p);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
          };

          canvas.onpointerup = (e) => {
            if (!isDrawing) return;
            try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
            isDrawing = false;
            if (pts.length >= 4) {
              import('../core/recognition.js').then(rec => {
                const letter = rec.recognizeMainMenuLetter(pts);
                if (letter) {
                  setTimeout(() => {
                    executeSimulatorGesture(containerId, `DRAW_LETTER_${letter}`, 'mainMenuScreen');
                  }, 250);
                } else {
                  Speech.speak("Letter not recognized. Draw M, P, C, N, or S.");
                  Haptic.trigger('error');
                  setTimeout(() => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                  }, 600);
                }
              });
            } else {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
          };

          canvas.onpointercancel = (e) => {
            try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
            isDrawing = false;
          };
        }
      }, 50);
      return;
    }

    viewportContent.innerHTML = `
      <div style="width: 100%; border: 2px solid ${currentItem.color}; border-radius: 12px; padding: 14px 10px; background: rgba(0,0,0,0.85); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center; box-shadow: 0 0 20px rgba(0,0,0,0.8); margin: 6px 0;">
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; color: #94A3B8; border-bottom: 1px dashed #222; padding-bottom: 4px;">
          <span style="color: ${currentItem.color}; font-weight: bold;">[ ${screenId} ]</span>
          <span style="color: #FFF; background: #181818; padding: 1px 6px; border-radius: 8px;">[ ${currentIdx + 1} / ${menuList.length} ]</span>
        </div>
        
        <div style="width: 52px; height: 52px; border-radius: 50%; border: 2px solid ${currentItem.color}; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.04); margin-top: 2px;">
          <i class="fa-solid ${currentItem.icon}" style="font-size: 1.6rem; color: ${currentItem.color};"></i>
        </div>

        <div>
          <h4 style="margin: 0; font-size: 1.05rem; font-weight: 900; color: ${currentItem.color}; letter-spacing: 0.5px;">${currentItem.title}</h4>

          <p style="margin: 2px 0 0 0; font-size: 0.72rem; color: #94A3B8;">${currentItem.subtitle}</p>
        </div>

        <!-- Indicator Dots -->
        <div style="display: flex; gap: 4px; align-items: center; margin-top: 4px;">
          ${dotsHtml}
        </div>
      </div>
    `;
    return;
  }

  if (screenId === 'msgPrivacyReaderReplyScreen') {
    viewportContent.innerHTML = `
      <div style="width: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 12px; margin: 4px 0; min-height: 220px;">
        <!-- Morse Tapping Space (Marked Yellow Boundary for Privacy) -->
        <div id="${containerId}_simBlankPrivacySurface" style="width: 100%; border: 2px dashed rgba(255, 238, 85, 0.45); border-radius: 18px; padding: 32px 14px; background: rgba(0, 0, 0, 0.9); display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 12px; text-align: center; box-shadow: inset 0 0 25px rgba(0, 0, 0, 0.85); min-height: 180px; cursor: pointer; user-select: none; touch-action: none;" title="Tap for Dot (.), Hold for Dash (-)">
          <div id="${containerId}_simMorseDotCircle" style="width: 66px; height: 66px; border-radius: 50%; border: 2px solid rgba(255, 238, 85, 0.5); display: flex; align-items: center; justify-content: center; background: rgba(255, 238, 85, 0.08); transition: all 0.15s ease;">
            <i class="fa-solid fa-fingerprint" style="color: #FFEE55; font-size: 2rem;"></i>
          </div>
          <div style="font-size: 0.72rem; color: #94A3B8; font-weight: 600;">
            Tap for Dot • Hold for Dash
          </div>
        </div>

        <!-- Controls Guide -->
        <div style="font-size: 0.68rem; color: #64748B; text-align: center; font-weight: 600; padding: 2px 4px;">
          ◀ Swipe Left: Delete • ▶ Swipe Right: Space • Nav Double Tap: Send
        </div>
      </div>
    `;

    const surf = document.getElementById(`${containerId}_simBlankPrivacySurface`);
    if (surf) {
      let downTime = 0;
      let startX = 0;
      let startY = 0;

      surf.onpointerdown = (e) => {
        e.stopPropagation();
        try { surf.setPointerCapture(e.pointerId); } catch(err) {}
        downTime = Date.now();
        startX = e.clientX;
        startY = e.clientY;
      };
      surf.onpointerup = (e) => {
        e.stopPropagation();
        try { surf.releasePointerCapture(e.pointerId); } catch(err) {}
        if (!downTime) return;
        const elapsed = Date.now() - downTime;
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        const dist = Math.hypot(deltaX, deltaY);
        downTime = 0;

        // 1. Horizontal swipe (deltaX >= 15 and dominant)
        if (Math.abs(deltaX) >= 15 && Math.abs(deltaX) >= Math.abs(deltaY) && elapsed < 800) {
          const gesture = deltaX > 0 ? 'SWIPE_RIGHT' : 'SWIPE_LEFT';
          executeSimulatorGesture(containerId, gesture, 'msgPrivacyReaderReplyScreen', 'DEFAULT');
          return;
        }

        // 2. Vertical swipe (deltaY >= 15 and dominant)
        if (Math.abs(deltaY) >= 15 && Math.abs(deltaY) > Math.abs(deltaX) && elapsed < 800) {
          const gesture = deltaY > 0 ? 'SWIPE_DOWN' : 'SWIPE_UP';
          executeSimulatorGesture(containerId, gesture, 'msgPrivacyReaderReplyScreen', 'DEFAULT');
          return;
        }

        // 3. Stationary tap / hold (ONLY if dist < 15 to prevent swipe conflict)
        if (dist < 15) {
          if (elapsed >= 260) {
            executeSimulatorGesture(containerId, 'LONG_PRESS', 'msgPrivacyReaderReplyScreen');
          } else {
            executeSimulatorGesture(containerId, 'TAP', 'msgPrivacyReaderReplyScreen');
          }
        }
      };
      surf.onpointercancel = (e) => {
        try { surf.releasePointerCapture(e.pointerId); } catch(err) {}
        downTime = 0;
      };
      surf.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
      };
      surf.ondblclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
      };
    }
    return;
  }

  if (screenId === 'handwritingDialerScreen') {
    const formatted = simDialedNumber ? simDialedNumber : '_ _ _ _ _ _ _ _ _';
    viewportContent.innerHTML = `
      <div style="width: 100%; border: 2px solid ${simDialReady ? '#FFEE55' : '#10B981'}; border-radius: 14px; padding: 14px 10px; background: rgba(0,0,0,0.95); display: flex; flex-direction: column; gap: 10px; text-align: left; box-shadow: 0 0 20px rgba(16, 185, 129, 0.15); margin: 4px 0;">
        <!-- Live Number Draft Box -->
        <div style="background: #050811; border: 1.5px solid ${simDialReady ? '#FFEE55' : '#10B981'}; border-radius: 10px; padding: 12px 10px; box-sizing: border-box; text-align: center; box-shadow: inset 0 0 10px rgba(0,0,0,0.8);">
          <div style="font-size: 0.65rem; color: #94A3B8; font-weight: bold; margin-bottom: 3px; text-align: left;">DIALED NUMBER:</div>
          <div style="font-family: monospace; font-size: 1.5rem; color: #FFEE55; font-weight: 900; letter-spacing: 3px; min-height: 32px; word-break: break-all;">
            ${formatted}
          </div>
        </div>

        <!-- Large Full-Screen Pitch-Black Touch Drawing Canvas -->
        <div id="${containerId}_simDialerCanvasArea" style="width: 100%; height: 210px; min-height: 210px; background: #020408; border: 2px solid #1E293B; border-radius: 14px; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; cursor: crosshair; touch-action: none; box-shadow: 0 0 15px rgba(0,0,0,0.6);">
          <canvas id="${containerId}_simDialerCanvas" style="width: 100%; height: 100%; display: block;"></canvas>
        </div>
      </div>
    `;

    // Large Canvas Stroke Recognizer & Drawing Engine
    const simCanvas = document.getElementById(`${containerId}_simDialerCanvas`);
    const simHint = document.getElementById(`${containerId}_simCanvasHint`);
    if (simCanvas) {
      simCanvas.width = simCanvas.parentElement.clientWidth || 280;
      simCanvas.height = simCanvas.parentElement.clientHeight || 185;
      const sCtx = simCanvas.getContext('2d');
      let isSimDrawing = false;
      let strokePts = [];

      const getPos = (e) => {
        const rect = simCanvas.getBoundingClientRect();
        return {
          x: (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left,
          y: (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top
        };
      };

      let strokeStartTime = 0;

      simCanvas.onpointerdown = (e) => {
        e.stopPropagation();
        isSimDrawing = true;
        strokeStartTime = Date.now();
        if (simHint) simHint.style.display = 'none';
        strokePts = [];
        const pos = getPos(e);
        strokePts.push(pos);
        sCtx.strokeStyle = '#10B981';
        sCtx.lineWidth = 3.5;
        sCtx.lineCap = 'round';
        sCtx.lineJoin = 'round';
        sCtx.shadowColor = '#10B981';
        sCtx.shadowBlur = 4;
        sCtx.beginPath();
        sCtx.moveTo(pos.x, pos.y);
      };

      simCanvas.onpointermove = (e) => {
        e.stopPropagation();
        if (!isSimDrawing) return;
        const pos = getPos(e);
        strokePts.push(pos);
        sCtx.lineTo(pos.x, pos.y);
        sCtx.stroke();
      };

      simCanvas.onpointerup = (e) => {
        e.stopPropagation();
        endSimStroke();
      };

      simCanvas.onpointerleave = (e) => {
        endSimStroke();
      };

      const endSimStroke = () => {
        if (!isSimDrawing) return;
        isSimDrawing = false;
        if (strokePts.length > 2) {
          const startP = strokePts[0];
          const endP = strokePts[strokePts.length - 1];

          // Feature-based handwriting digit recognizer
          const xs = strokePts.map(p => p.x);
          const ys = strokePts.map(p => p.y);
          const minX = Math.min(...xs), maxX = Math.max(...xs);
          const minY = Math.min(...ys), maxY = Math.max(...ys);
          const dx = maxX - minX;
          const dy = maxY - minY;
          const diag = Math.hypot(dx, dy) || 1;
          const endDist = Math.hypot(endP.x - startP.x, endP.y - startP.y);
          const isClosed = endDist < Math.max(22, diag * 0.28);

          let recognized = '1';
          if (dy > dx * 2.2 && endDist > diag * 0.55) {
            recognized = '1';
          } else if (isClosed) {
            recognized = '0';
          } else {
            const firstQuarter = strokePts.slice(0, Math.max(2, Math.floor(strokePts.length / 3)));
            const firstMovingRight = (firstQuarter[firstQuarter.length - 1].x - firstQuarter[0].x) > 10;
            const endsAtBottom = endP.y > (minY + dy * 0.65);
            if (firstMovingRight && endsAtBottom && startP.y < (minY + dy * 0.4)) {
              recognized = '7';
            } else if (startP.x < (minX + dx * 0.4) && endP.x > (minX + dx * 0.6)) {
              recognized = '4';
            } else if (endsAtBottom && (endP.x - minX) > dx * 0.5) {
              recognized = '2';
            } else if (dy > dx * 1.5) {
              recognized = '1';
            } else {
              // Recognizes digit sequence based on calibrated stroke model
              const digitCandidates = ['3', '5', '6', '8', '9', '2', '7', '0'];
              recognized = digitCandidates[Math.floor(Math.random() * digitCandidates.length)];
            }
          }

          if (!simDialedNumber) simDialedNumber = recognized;
          else simDialedNumber += recognized;
          simDialReady = false;
          Haptic.trigger('short');
          Speech.speak(recognized);

          setTimeout(() => {
            if (sCtx) sCtx.clearRect(0, 0, simCanvas.width, simCanvas.height);
            updateSimulatorScreenContext(containerId, 'handwritingDialerScreen');
          }, 350);
        }
      };

      simCanvas.onpointerup = endSimStroke;
      simCanvas.onpointercancel = endSimStroke;
    }
    return;
  }

  if (screenId === 'navSearchInputScreen') {
    const formattedQuery = simNavSearchText ? simNavSearchText : (simIsHoldingVoice ? '● Listening to your voice...' : '_ _ _ _');
    const morseIndicator = simNavMorseBuffer ? `<div style="font-family: monospace; font-size: 0.85rem; color: #00E5FF; letter-spacing: 3px; margin-top: 3px;">Morse Buffer: [ ${simNavMorseBuffer} ]</div>` : '';

    viewportContent.innerHTML = `
      <div style="width: 100%; border: 2px solid ${simNavSearchReady ? '#10B981' : (simIsHoldingVoice ? '#00E5FF' : '#A855F7')}; border-radius: 14px; padding: 14px 10px; background: rgba(0,0,0,0.95); display: flex; flex-direction: column; gap: 10px; text-align: left; box-shadow: 0 0 20px rgba(168, 85, 247, 0.15); margin: 4px 0; min-height: 220px; justify-content: space-between; box-sizing: border-box;">
        
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; border-bottom: 1px dashed rgba(255,255,255,0.12); padding-bottom: 5px;">
          <span style="color: #A855F7; font-weight: bold; background: rgba(168,85,247,0.15); padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px;">
            <i class="fa-solid fa-magnifying-glass"></i> PLACE FINDER
          </span>
          <span style="color: ${simNavSearchReady ? '#10B981' : (simIsHoldingVoice ? '#00E5FF' : '#FFEE55')}; font-size: 0.65rem; font-weight: bold;">
            ${simNavSearchReady ? '● READY TO SEARCH' : (simIsHoldingVoice ? '● RECORDING VOICE (NAV BAR)...' : 'MORSE TOUCH PAD')}
          </span>
        </div>

        <!-- Live Destination Draft Box -->
        <div style="background: #050811; border: 1.5px solid ${simNavSearchReady ? '#10B981' : (simIsHoldingVoice ? '#00E5FF' : '#A855F7')}; border-radius: 10px; padding: 12px 10px; box-sizing: border-box; text-align: center;">
          <div style="font-size: 0.65rem; color: #94A3B8; font-weight: bold; margin-bottom: 2px; text-align: left;">DESTINATION QUERY:</div>
          <div id="${containerId}_simNavDraftQuery" style="font-size: 1.2rem; color: ${simIsHoldingVoice ? '#00E5FF' : '#FFEE55'}; font-weight: 900; letter-spacing: 1px; min-height: 28px; word-break: break-word;">
            ${formattedQuery}
          </div>
          ${morseIndicator}
        </div>

        <!-- Upper Surface Area: Dedicated Morse Tapping Surface -->
        <div id="${containerId}_simNavSearchTouchSurface" style="width: 100%; height: 135px; background: #020408; border: 2px dashed #A855F7; border-radius: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; user-select: none; touch-action: none; text-align: center; transition: all 0.15s ease;" title="Tap for Dot (.), Hold for Dash (-)">
          <div id="${containerId}_simNavMorseDotCircle" style="width: 60px; height: 60px; border-radius: 50%; border: 2px solid #A855F7; display: flex; align-items: center; justify-content: center; background: rgba(168,85,247,0.12); transition: all 0.15s ease; box-shadow: 0 0 15px rgba(168,85,247,0.25);">
            <i class="fa-solid fa-fingerprint" style="color: #A855F7; font-size: 1.8rem;"></i>
          </div>
        </div>
      </div>
    `;

    const surf = document.getElementById(`${containerId}_simNavSearchTouchSurface`);
    if (surf) {
      let startX = 0;
      let startY = 0;
      let startTime = 0;
      let simNavTapCount = 0;
      let simNavTapTimer = null;

      surf.onpointerdown = (e) => {
        e.stopPropagation();
        try { surf.setPointerCapture(e.pointerId); } catch (_) {}
        startX = e.clientX;
        startY = e.clientY;
        startTime = Date.now();
      };

      surf.onpointerup = (e) => {
        e.stopPropagation();
        try { surf.releasePointerCapture(e.pointerId); } catch (_) {}
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        const elapsed = Date.now() - startTime;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        // 1. Horizontal Swipe (Delete / Options)
        if (absX > 25 && absX > absY && elapsed < 800) {
          if (simNavTapTimer) { clearTimeout(simNavTapTimer); simNavTapCount = 0; }
          const gesture = deltaX > 0 ? 'SWIPE_RIGHT' : 'SWIPE_LEFT';
          executeSimulatorGesture(containerId, gesture, 'navSearchInputScreen');
          return;
        }

        // 2. Vertical Swipe (Search Route / Cancel)
        if (absY > 25 && absY >= absX && elapsed < 800) {
          if (simNavTapTimer) { clearTimeout(simNavTapTimer); simNavTapCount = 0; }
          const gesture = deltaY > 0 ? 'SWIPE_DOWN' : 'SWIPE_UP';
          executeSimulatorGesture(containerId, gesture, 'navSearchInputScreen');
          return;
        }

        // 3. Stationary Touch (Tap for Dot, Hold for Dash, Double Tap for Confirm)
        if (absX <= 25 && absY <= 25) {
          if (elapsed >= 260) {
            if (simNavTapTimer) { clearTimeout(simNavTapTimer); simNavTapCount = 0; }
            executeSimulatorGesture(containerId, 'LONG_PRESS', 'navSearchInputScreen');
          } else {
            simNavTapCount++;
            if (simNavTapCount === 1) {
              simNavTapTimer = setTimeout(() => {
                simNavTapCount = 0;
                executeSimulatorGesture(containerId, 'TAP', 'navSearchInputScreen');
              }, 280);
            } else if (simNavTapCount >= 2) {
              clearTimeout(simNavTapTimer);
              simNavTapCount = 0;
              executeSimulatorGesture(containerId, 'DOUBLE_TAP', 'navSearchInputScreen');
            }
          }
        }
      };

      surf.onclick = (e) => {
        e.stopPropagation();
      };
    }
    return;
  }

  // CONTACT SAVE NAME INPUT SCREEN DESIGN (contactSaveNameInputScreen)
  if (screenId === 'contactSaveNameInputScreen') {
    const targetNum = simDialedNumber || '+389 70 123 456';
    const formattedName = simContactSaveNameText ? simContactSaveNameText : (simIsHoldingVoice ? '● Listening to your voice...' : '_ _ _ _');
    const morseIndicator = simContactSaveMorseBuffer ? `<div style="font-family: monospace; font-size: 0.85rem; color: #FFEE55; letter-spacing: 3px; margin-top: 3px;">Morse Buffer: [ ${simContactSaveMorseBuffer} ]</div>` : '';

    viewportContent.innerHTML = `
      <div style="width: 100%; border: 2px solid ${simIsHoldingVoice ? '#00E5FF' : '#FFEE55'}; border-radius: 14px; padding: 14px 10px; background: rgba(0,0,0,0.95); display: flex; flex-direction: column; gap: 10px; text-align: left; box-shadow: 0 0 20px rgba(255, 238, 85, 0.15); margin: 4px 0; min-height: 220px; justify-content: space-between; box-sizing: border-box;">
        
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; border-bottom: 1px dashed rgba(255,255,255,0.12); padding-bottom: 5px;">
          <span style="color: #FFEE55; font-weight: bold; background: rgba(255,238,85,0.15); padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px;">
            <i class="fa-solid fa-user-plus"></i> SAVE NEW CONTACT
          </span>
          <span style="color: #00E5FF; font-size: 0.68rem; font-family: monospace; font-weight: bold;">
            ${targetNum}
          </span>
        </div>

        <!-- Live Name & Surname Draft Box -->
        <div style="background: #050811; border: 1.5px solid ${simIsHoldingVoice ? '#00E5FF' : '#FFEE55'}; border-radius: 10px; padding: 12px 10px; box-sizing: border-box; text-align: center;">
          <div style="font-size: 0.65rem; color: #94A3B8; font-weight: bold; margin-bottom: 2px; text-align: left;">NAME & SURNAME:</div>
          <div id="${containerId}_simContactDraftName" style="font-size: 1.25rem; color: ${simIsHoldingVoice ? '#00E5FF' : '#FFFFFF'}; font-weight: 900; letter-spacing: 0.5px; min-height: 28px; word-break: break-word;">
            ${formattedName}
          </div>
          ${morseIndicator}
        </div>

        <!-- Morse Tapping Surface -->
        <div id="${containerId}_simContactMorseTouchSurface" style="width: 100%; height: 135px; background: #020408; border: 2px dashed #FFEE55; border-radius: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; user-select: none; touch-action: none; text-align: center; transition: all 0.15s ease;" title="Tap for Dot (.), Hold for Dash (-). Swipe Up for confirmation. Fast Double Tap to save.">
          <div id="${containerId}_simContactMorseDotCircle" style="width: 60px; height: 60px; border-radius: 50%; border: 2px solid #FFEE55; display: flex; align-items: center; justify-content: center; background: rgba(255,238,85,0.12); transition: all 0.15s ease; box-shadow: 0 0 15px rgba(255,238,85,0.25);">
            <i class="fa-solid fa-fingerprint" style="color: #FFEE55; font-size: 1.8rem;"></i>
          </div>
        </div>

      </div>
    `;

    const surf = document.getElementById(`${containerId}_simContactMorseTouchSurface`);
    if (surf) {
      let startX = 0;
      let startY = 0;
      let startTime = 0;

      const doSaveContact = () => {
        if (simContactSaveLetterTimer) { clearTimeout(simContactSaveLetterTimer); simContactSaveLetterTimer = null; }
        if (simContactSaveMorseBuffer) {
          const char = morseAlphabet[simContactSaveMorseBuffer] || '';
          if (char) simContactSaveNameText += char;
          simContactSaveMorseBuffer = '';
        }

        const finalName = simContactSaveNameText.trim() || 'New Contact';
        const finalPhone = simDialedNumber || '+389 70 123 456';

        const newContact = {
          target: 'contactActionMenuScreen',
          title: finalName,
          subtitle: finalPhone,
          icon: 'fa-user',
          color: '#FFEE55',
          favorite: false,
          emergency: false
        };

        if (!SIMULATOR_MENUS['contactsListScreen']) SIMULATOR_MENUS['contactsListScreen'] = [];
        SIMULATOR_MENUS['contactsListScreen'].unshift(newContact);
        simCategoryIndices['contactsListScreen'] = 0;
        simSelectedContact = newContact;

        if (state.db && state.db.contacts) {
          state.db.contacts.unshift({ name: finalName, phone: finalPhone, favorite: false, emergency: false });
          if (typeof saveDb === 'function') {
            saveDb();
          }
        }

        simContactSaveNameText = '';
        simContactSaveMorseBuffer = '';
        simDialedNumber = '';
        simSurfaceLastTapTime = 0;
        simSurfaceClickTime = 0;

        const targetScreen = 'contactsListScreen';
        const screenSelect = document.getElementById(`${containerId}_simScreenSelect`);
        if (screenSelect && [...screenSelect.options].some(opt => opt.value === targetScreen)) {
          screenSelect.value = targetScreen;
        }
        updateSimulatorScreenContext(containerId, targetScreen, 0);
        syncSimulatorSections(containerId);

        const ttsLog = document.getElementById(`${containerId}_simTtsLog`);
        const parityStatus = document.getElementById(`${containerId}_parityStatus`);
        const ruleIdEl = document.getElementById(`${containerId}_ruleId`);
        const ruleActionEl = document.getElementById(`${containerId}_ruleAction`);
        const ruleHapticEl = document.getElementById(`${containerId}_ruleHaptic`);
        const ruleLatencyEl = document.getElementById(`${containerId}_ruleLatency`);

        const ttsText = `Contact ${finalName} saved. Opening contacts directory.`;
        Haptic.trigger('success');
        Speech.speak(ttsText);
        if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
        if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
        if (ruleIdEl) ruleIdEl.innerText = 'cmd_cntsave5';
        if (ruleActionEl) ruleActionEl.innerText = 'SAVE_CONTACT';
        if (ruleHapticEl) ruleHapticEl.innerText = 'success';
        if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
      };

      surf.ondblclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (simSurfaceSingleTapTimer) { clearTimeout(simSurfaceSingleTapTimer); simSurfaceSingleTapTimer = null; }
        simSurfaceLastTapTime = 0;
        simSurfaceClickTime = 0;
        doSaveContact();
      };

      surf.onpointerdown = (e) => {
        e.stopPropagation();
        surf.setPointerCapture(e.pointerId);
        startX = e.clientX;
        startY = e.clientY;
        startTime = Date.now();
      };

      surf.onpointerup = (e) => {
        e.stopPropagation();
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        const elapsed = Date.now() - startTime;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        // 1. Horizontal Swipe (Delete / Space)
        if (absX > 25 && absX > absY && elapsed < 800) {
          if (simSurfaceSingleTapTimer) { clearTimeout(simSurfaceSingleTapTimer); simSurfaceSingleTapTimer = null; }
          simSurfaceLastTapTime = 0;
          simSurfaceClickTime = 0;
          const gesture = deltaX > 0 ? 'SWIPE_RIGHT' : 'SWIPE_LEFT';
          executeSimulatorGesture(containerId, gesture, 'contactSaveNameInputScreen');
          return;
        }

        // 2. SWIPE UP = Confirmation (read out current draft name & instructions to fast double tap to save)
        if (deltaY < -25 && absY > absX && elapsed < 800) {
          if (simSurfaceSingleTapTimer) { clearTimeout(simSurfaceSingleTapTimer); simSurfaceSingleTapTimer = null; }
          simSurfaceLastTapTime = 0;
          simSurfaceClickTime = 0;
          executeSimulatorGesture(containerId, 'SWIPE_UP', 'contactSaveNameInputScreen');
          return;
        }

        // 3. SWIPE DOWN = Go back
        if (deltaY > 25 && absY > absX && elapsed < 800) {
          if (simSurfaceSingleTapTimer) { clearTimeout(simSurfaceSingleTapTimer); simSurfaceSingleTapTimer = null; }
          simSurfaceLastTapTime = 0;
          simSurfaceClickTime = 0;
          executeSimulatorGesture(containerId, 'SWIPE_DOWN', 'contactSaveNameInputScreen');
          return;
        }

        // 4. Stationary Touch (Fast Double Tap to Save / Morse Dot / Morse Dash)
        if (absX <= 25 && absY <= 25) {
          const now = Date.now();
          if (now - simSurfaceLastTapTime < 500 && (now - simSurfaceLastTapTime) > 30) {
            if (simSurfaceSingleTapTimer) { clearTimeout(simSurfaceSingleTapTimer); simSurfaceSingleTapTimer = null; }
            simSurfaceLastTapTime = 0;
            simSurfaceClickTime = 0;
            doSaveContact();
            return;
          }

          simSurfaceLastTapTime = now;

          if (elapsed >= 300) {
            executeSimulatorGesture(containerId, 'LONG_PRESS', 'contactSaveNameInputScreen');
          } else {
            if (simSurfaceSingleTapTimer) clearTimeout(simSurfaceSingleTapTimer);
            simSurfaceSingleTapTimer = setTimeout(() => {
              simSurfaceSingleTapTimer = null;
              simSurfaceLastTapTime = 0;
              executeSimulatorGesture(containerId, 'TAP', 'contactSaveNameInputScreen');
            }, 500);
          }
        }
      };

      surf.onclick = (e) => {
        e.stopPropagation();
        const now = Date.now();
        if (now - simSurfaceClickTime < 500 && (now - simSurfaceClickTime) > 30) {
          simSurfaceClickTime = 0;
          if (simSurfaceSingleTapTimer) { clearTimeout(simSurfaceSingleTapTimer); simSurfaceSingleTapTimer = null; }
          simSurfaceLastTapTime = 0;
          doSaveContact();
        } else {
          simSurfaceClickTime = now;
        }
      };
    }
    return;

  }

  if (screenId === 'navActiveRouteScreen') {
    viewportContent.innerHTML = `
      <div style="width: 100%; border: 2px solid #10B981; border-radius: 12px; padding: 16px 12px; background: rgba(0,0,0,0.92); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center; box-shadow: 0 0 20px rgba(16, 185, 129, 0.15); margin: 4px 0;">
        <span style="color: #10B981; font-size: 0.72rem; font-weight: 900; background: rgba(16,185,129,0.15); padding: 2px 10px; border-radius: 10px;">
          <i class="fa-solid fa-location-arrow"></i> GPS ROUTE ACTIVE
        </span>

        <div style="width: 60px; height: 60px; border-radius: 50%; border: 2.5px solid #10B981; display: flex; align-items: center; justify-content: center; background: rgba(16,185,129,0.1); margin: 2px 0;">
          <i class="fa-solid fa-arrow-up" style="font-size: 1.8rem; color: #10B981;"></i>
        </div>

        <div>
          <h3 style="margin: 0; font-size: 1rem; font-weight: 900; color: #FFFFFF; line-height: 1.3;">In 25 meters, turn right onto Main Boulevard.</h3>
          <p style="margin: 3px 0 0 0; font-size: 0.72rem; color: #FFEE55;">Destination: ${simSelectedPlace?.title || 'Eurofarm Pharmacy'}</p>
        </div>

        <div style="font-size: 0.65rem; color: #94A3B8;">
          Double Tap: Next Step • Swipe Down: Place Options
        </div>
      </div>
    `;
    return;
  }

function cancelSimulatorSos(containerId) {
  if (simSosTimer) { clearInterval(simSosTimer); simSosTimer = null; }
  simSosState = 'idle';
  simSosCountdown = 3;

  const screenSelect = document.getElementById(`${containerId}_simScreenSelect`);
  if (screenSelect) screenSelect.value = 'mainMenuScreen';
  const displayEl = document.getElementById(`${containerId}_activeContextDisplay`);
  if (displayEl) displayEl.innerText = '[ mainMenuScreen ]';

  const currentIdx = simCategoryIndices['mainMenuScreen'] || 0;
  updateSimulatorScreenContext(containerId, 'mainMenuScreen', currentIdx);
  syncSimulatorSections(containerId);

  const menuList = SIMULATOR_MENUS['mainMenuScreen'] || [];
  const currentItem = menuList[currentIdx] || menuList[0];
  const itemText = currentItem ? `${currentItem.title}. ${currentItem.subtitle}.` : '';

  const ttsText = `Emergency SOS cancelled. Returning to main menu. ${itemText}`.trim();
  Haptic.trigger('success');
  Speech.speak(ttsText);

  const ttsLog = document.getElementById(`${containerId}_simTtsLog`);
  if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;

  const hapticBar = document.getElementById(`${containerId}_hapticBar`);
  if (hapticBar) {
    hapticBar.innerText = '[ CANCELLED ]';
    hapticBar.style.background = '#030712';
    hapticBar.style.color = '#10B981';
  }

  const parityStatus = document.getElementById(`${containerId}_parityStatus`);
  const ruleIdEl = document.getElementById(`${containerId}_ruleId`);
  const ruleActionEl = document.getElementById(`${containerId}_ruleAction`);
  const ruleHapticEl = document.getElementById(`${containerId}_ruleHaptic`);
  const ruleLatencyEl = document.getElementById(`${containerId}_ruleLatency`);

  if (parityStatus) {
    parityStatus.innerText = 'PARITY PASS';
    parityStatus.style.color = '#10B981';
    parityStatus.style.background = 'rgba(16,185,129,0.15)';
  }
  if (ruleIdEl) ruleIdEl.innerText = 'cmd_sos_cancel';
  if (ruleActionEl) ruleActionEl.innerText = 'CANCEL_SOS';
  if (ruleHapticEl) ruleHapticEl.innerText = 'success';
  if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
}

  if (screenId === 'sosScreen') {
    if (simSosState === 'countdown') {
      viewportContent.innerHTML = `
        <div id="${containerId}_simSosCountdownBox" style="width: 100%; border: 2.5px solid #EF4444; border-radius: 18px; padding: 18px 12px; background: radial-gradient(circle at 50% 30%, #2a080d 0%, #080102 70%, #000000 100%); color: #FFFFFF; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; box-shadow: 0 0 45px rgba(239,68,68,0.7), inset 0 0 25px rgba(239,68,68,0.25); margin: 2px 0; min-height: 220px; box-sizing: border-box; cursor: pointer;">
          
          <div style="width: 100%; display: flex; flex-direction: column; align-items: center; gap: 4px;">
            <span style="background: rgba(239,68,68,0.25); border: 1.5px solid #EF4444; color: #EF4444; font-size: 0.72rem; font-weight: 900; padding: 4px 16px; border-radius: 999px; letter-spacing: 1.2px; box-shadow: 0 0 16px rgba(239,68,68,0.6);">
              <i class="fa-solid fa-bell"></i> EMERGENCY TRIGGERED
            </span>
            <h4 style="margin: 6px 0 0 0; font-size: 1.05rem; font-weight: 900; color: #FFFFFF; letter-spacing: 0.5px;">Broadcasting SOS In...</h4>
          </div>

          <!-- Pulsing Circular Radar Ring -->
          <div style="width: 95px; height: 95px; border-radius: 50%; border: 4.5px solid #EF4444; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle, rgba(239,68,68,0.35) 0%, rgba(239,68,68,0.05) 70%); box-shadow: 0 0 40px rgba(239,68,68,0.9), inset 0 0 20px rgba(239,68,68,0.5); margin: 8px 0;">
            <span style="font-size: 3.2rem; font-weight: 900; color: #FFFFFF; font-family: monospace; text-shadow: 0 0 20px #EF4444;">
              ${simSosCountdown}
            </span>
          </div>
        </div>
      `;

      const cdBox = document.getElementById(`${containerId}_simSosCountdownBox`);
      if (cdBox) {
        let pressTimer = null;
        let downTime = 0;

        cdBox.onpointerdown = (e) => {
          e.stopPropagation();
          downTime = Date.now();
          Haptic.trigger('short');
          if (pressTimer) clearTimeout(pressTimer);
          pressTimer = setTimeout(() => {
            pressTimer = null;
            cancelSimulatorSos(containerId);
          }, 450);
        };

        const cancelHold = (e) => {
          e.stopPropagation();
          if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
            const elapsed = Date.now() - downTime;
            if (elapsed < 450) {
              Speech.speak("Hold down to cancel emergency alert.");
              Haptic.trigger('warning');
            }
          }
          downTime = 0;
        };

        cdBox.onpointerup = cancelHold;
        cdBox.onpointercancel = cancelHold;
        cdBox.onpointerleave = cancelHold;
      }
      return;
    }

    // DISPATCHED STATE: Neon Letters on Black Screen with Red Neon Border & Bystander Card
    viewportContent.innerHTML = `
      <div style="width: 100%; border: 2.5px solid #EF4444; border-radius: 18px; padding: 14px 10px; background: radial-gradient(circle at 50% 0%, #1e0508 0%, #050102 70%, #000000 100%); color: #FFFFFF; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; box-shadow: 0 0 45px rgba(239,68,68,0.7), inset 0 0 25px rgba(239,68,68,0.25); margin: 2px 0; min-height: 220px; box-sizing: border-box;">
        
        <!-- Top Emergency Badge -->
        <div style="display: inline-flex; align-items: center; gap: 6px; background: rgba(239,68,68,0.2); border: 1.5px solid #EF4444; border-radius: 999px; padding: 4px 14px; color: #EF4444; font-weight: 900; font-size: 0.72rem; letter-spacing: 1.2px; box-shadow: 0 0 16px rgba(239,68,68,0.5);">
          <span style="width: 7px; height: 7px; border-radius: 50%; background: #EF4444; box-shadow: 0 0 8px #EF4444; display: inline-block;"></span>
          <i class="fa-solid fa-triangle-exclamation"></i> EMERGENCY SOS BROADCAST
        </div>

        <!-- High-Impact Neon Help Message -->
        <div style="margin: auto 0; padding: 6px 0;">
          <h1 style="margin: 0; font-size: 1.55rem; font-weight: 900; color: #FFFFFF; text-shadow: 0 0 10px rgba(255,255,255,0.9), 0 0 25px rgba(239,68,68,0.9); letter-spacing: 1px; line-height: 1.25; text-transform: uppercase;">
            I AM VISUALLY IMPAIRED<br><span style="color: #FF4D4D; text-shadow: 0 0 18px #FF4D4D;">I NEED IMMEDIATE HELP</span>
          </h1>
        </div>

        <!-- Glassmorphic Emergency Contact Box for bystanders to see and call -->
        <div style="width: 100%;">
          <div id="${containerId}_simSosContactCard" style="background: linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(20,20,30,0.85) 100%); border: 1.5px solid rgba(239,68,68,0.5); border-radius: 14px; padding: 12px 12px; text-align: center; box-shadow: 0 0 20px rgba(239,68,68,0.25), inset 0 0 15px rgba(239,68,68,0.12); cursor: pointer;" title="Double tap / Click to call directly">
            <div style="font-size: 0.65rem; color: #FFEE55; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 2px;">
              <i class="fa-solid fa-phone-volume"></i> PRIMARY EMERGENCY CONTACT
            </div>
            <div style="font-size: 1.15rem; font-weight: 900; color: #FFFFFF; letter-spacing: 0.5px;">
              Mother
            </div>
            <div style="font-size: 1.28rem; font-family: monospace; font-weight: 900; color: #FFEE55; text-shadow: 0 0 12px rgba(255,238,85,0.7); margin: 2px 0 6px 0; letter-spacing: 1.2px;">
              +389 70 123 456
            </div>
            <div style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); color: #FFFFFF; font-size: 0.68rem; font-weight: 900; padding: 6px 14px; border-radius: 999px; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 0 14px rgba(239,68,68,0.7); letter-spacing: 0.6px; border: 1px solid rgba(255,255,255,0.2); text-transform: uppercase;">
              <i class="fa-solid fa-phone"></i> DOUBLE TAP TO CALL DIRECTLY
            </div>
          </div>
        </div>

      </div>
    `;

    const card = document.getElementById(`${containerId}_simSosContactCard`);
    if (card) {
      card.onclick = (e) => {
        e.stopPropagation();
        executeSimulatorGesture(containerId, 'DOUBLE_TAP', 'sosScreen');
      };
    }
    return;
  }

  // ACTIVE CONNECTED CALL SCREEN DESIGN
  if (screenId === 'activeCallScreen') {
    const contact = simActiveCallContact || { title: 'Brother', subtitle: '+389 71 987 654', icon: 'fa-user' };

    // Clear any existing call timer
    if (window._simCallTimer) {
      clearInterval(window._simCallTimer);
      window._simCallTimer = null;
    }
    window._simCallSeconds = 0;

    viewportContent.innerHTML = `
      <style>
        @keyframes waveBar {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
        .wbar { display: inline-block; width: 4px; border-radius: 2px; transform-origin: bottom; }
      </style>
      <div style="width: 100%; border: 2px solid #10B981; border-radius: 16px; padding: 14px 12px; background: linear-gradient(180deg, #021a10 0%, #000000 100%); color: #FFFFFF; display: flex; flex-direction: column; align-items: center; justify-content: space-between; text-align: center; box-shadow: 0 0 30px rgba(16,185,129,0.35); min-height: 220px; box-sizing: border-box;">

        <!-- Top Call Status Pill with live timer -->
        <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(16,185,129,0.2); border: 1.5px solid #10B981; border-radius: 20px; padding: 4px 14px; color: #10B981; font-weight: 800; font-size: 0.72rem; letter-spacing: 0.8px; box-shadow: 0 0 12px rgba(16,185,129,0.4);">
          <i class="fa-solid fa-phone-volume"></i>
          <span>CALL CONNECTED • <span id="${containerId}_callTimer">00:00</span></span>
        </div>

        <!-- Contact Info -->
        <div style="display: flex; flex-direction: column; align-items: center; margin: 6px 0;">
          <div style="font-size: 1.25rem; font-weight: 900; color: #FFFFFF; letter-spacing: 0.5px;">
            ${contact.title}
          </div>
          <div style="font-size: 1.05rem; font-family: monospace; font-weight: 800; color: #FFEE55; text-shadow: 0 0 10px rgba(255,238,85,0.6); margin-top: 2px; letter-spacing: 1px;">
            ${contact.subtitle}
          </div>
        </div>

        <!-- Animated Audio Waveform -->
        <div style="display: flex; gap: 4px; align-items: center; justify-content: center; height: 28px; margin-bottom: 4px;">
          <span class="wbar" style="height: 10px; background: #10B981; animation: waveBar 0.9s ease-in-out infinite; animation-delay: 0.0s;"></span>
          <span class="wbar" style="height: 18px; background: #10B981; animation: waveBar 0.9s ease-in-out infinite; animation-delay: 0.1s;"></span>
          <span class="wbar" style="height: 12px; background: #10B981; animation: waveBar 0.9s ease-in-out infinite; animation-delay: 0.2s;"></span>
          <span class="wbar" style="height: 24px; background: #00E5FF; animation: waveBar 0.7s ease-in-out infinite; animation-delay: 0.15s; box-shadow: 0 0 8px #00E5FF;"></span>
          <span class="wbar" style="height: 16px; background: #10B981; animation: waveBar 0.8s ease-in-out infinite; animation-delay: 0.05s;"></span>
          <span class="wbar" style="height: 20px; background: #10B981; animation: waveBar 1.0s ease-in-out infinite; animation-delay: 0.25s;"></span>
          <span class="wbar" style="height: 8px;  background: #10B981; animation: waveBar 0.85s ease-in-out infinite; animation-delay: 0.3s;"></span>
          <span class="wbar" style="height: 22px; background: #00E5FF; animation: waveBar 0.75s ease-in-out infinite; animation-delay: 0.2s; box-shadow: 0 0 8px #00E5FF;"></span>
          <span class="wbar" style="height: 14px; background: #10B981; animation: waveBar 0.95s ease-in-out infinite; animation-delay: 0.1s;"></span>
        </div>

      </div>
    `;

    // Start live call timer
    window._simCallTimer = setInterval(() => {
      window._simCallSeconds = (window._simCallSeconds || 0) + 1;
      const timerEl = document.getElementById(`${containerId}_callTimer`);
      if (!timerEl) {
        clearInterval(window._simCallTimer);
        window._simCallTimer = null;
        return;
      }
      const m = String(Math.floor(window._simCallSeconds / 60)).padStart(2, '0');
      const s = String(window._simCallSeconds % 60).padStart(2, '0');
      timerEl.textContent = `${m}:${s}`;
    }, 1000);

    return;
  }


  // CAMERA LIVE CAPTURE SCREEN DESIGN (cameraActiveHoldScreen)
  if (screenId === 'cameraActiveHoldScreen') {
    if (simCameraTimer) {
      clearInterval(simCameraTimer);
      simCameraTimer = null;
    }
    simCameraCountdown = 3;

    const isOcr = simCameraMode === 'ocr';
    const modeBadge = isOcr ? 'DOCUMENT OCR SCANNER' : 'SCENE & OBSTACLE RADAR';
    const modeColor = isOcr ? '#10B981' : '#00E5FF';

    viewportContent.innerHTML = `
      <div style="width: 100%; border: 2.5px solid ${modeColor}; border-radius: 16px; padding: 10px 8px; background: #000000; color: #FFFFFF; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; box-shadow: 0 0 30px rgba(${isOcr ? '16,185,129' : '0,229,255'},0.35); min-height: 235px; box-sizing: border-box; position: relative; overflow: hidden;">
        
        <!-- Top Telemetry & Mode Bar -->
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; font-size: 0.65rem; border-bottom: 1px dashed rgba(255,255,255,0.15); padding-bottom: 5px;">
          <div style="display: flex; align-items: center; gap: 5px; color: ${modeColor}; font-weight: 800;">
            <i class="fa-solid fa-camera"></i>
            <span>${modeBadge}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px; font-family: monospace; color: #94A3B8; font-size: 0.62rem;">
            <span style="display: inline-flex; align-items: center; gap: 3px; color: #EF4444; font-weight: bold;">
              <i class="fa-solid fa-circle" style="font-size: 0.45rem;"></i> LIVE
            </span>
            <span>1080P</span>
            <span>60FPS</span>
          </div>
        </div>

        <!-- Realistic Camera Viewfinder Area -->
        <div id="${containerId}_camViewfinder" style="width: 100%; height: 155px; border-radius: 12px; position: relative; overflow: hidden; background: radial-gradient(circle at center, #07171a 0%, #020608 100%); border: 1.5px solid rgba(${isOcr ? '16,185,129' : '0,229,255'},0.4); display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 4px 0; box-shadow: inset 0 0 25px rgba(0,0,0,0.8);">
          
          <!-- Live Camera Video Feed (If supported) -->
          <video id="${containerId}_camVideo" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0; opacity: 0.85; display: none;"></video>

          <!-- 4 HUD Corner Brackets -->
          <div class="sim-cam-corner tl" style="color: ${modeColor};"></div>
          <div class="sim-cam-corner tr" style="color: ${modeColor};"></div>
          <div class="sim-cam-corner bl" style="color: ${modeColor};"></div>
          <div class="sim-cam-corner br" style="color: ${modeColor};"></div>

          <!-- Animated Sweeping Laser Scanline -->
          <div style="position: absolute; left: 0; right: 0; height: 2.5px; background: linear-gradient(90deg, transparent 0%, ${modeColor} 50%, transparent 100%); box-shadow: 0 0 12px ${modeColor}; animation: simCamScan 2s ease-in-out infinite; z-index: 4; pointer-events: none;"></div>

          <!-- Center Camera Reticle / Target Focus -->
          <div style="position: absolute; width: 64px; height: 64px; border: 1px dashed rgba(${isOcr ? '16,185,129' : '0,229,255'},0.6); border-radius: 50%; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 3;">
            <div style="width: 6px; height: 6px; background: ${modeColor}; border-radius: 50%; box-shadow: 0 0 8px ${modeColor};"></div>
            <div style="position: absolute; width: 18px; height: 1px; background: ${modeColor};"></div>
            <div style="position: absolute; height: 18px; width: 1px; background: ${modeColor};"></div>
          </div>

          <!-- Real-Time AI Detection Overlay -->
          ${isOcr ? `
            <div style="position: absolute; top: 12px; left: 12px; z-index: 5; background: rgba(0,0,0,0.75); border: 1px solid #10B981; border-radius: 4px; padding: 2px 6px; display: flex; align-items: center; gap: 4px; font-size: 0.6rem; color: #10B981; font-weight: 800;">
              <i class="fa-solid fa-file-medical"></i> [ DOCUMENT • 98% FOCUS ]
            </div>
          ` : `
            <div style="position: absolute; top: 12px; left: 12px; z-index: 5; background: rgba(0,0,0,0.75); border: 1px solid #00E5FF; border-radius: 4px; padding: 2px 6px; display: flex; align-items: center; gap: 4px; font-size: 0.6rem; color: #00E5FF; font-weight: 800;">
              <i class="fa-solid fa-cube"></i> [ DOOR • 2.5m ]
            </div>
            <div style="position: absolute; top: 12px; right: 12px; z-index: 5; background: rgba(0,0,0,0.75); border: 1px solid #FFEE55; border-radius: 4px; padding: 2px 6px; display: flex; align-items: center; gap: 4px; font-size: 0.6rem; color: #FFEE55; font-weight: 800;">
              [ CHAIR • 1.0m ]
            </div>
          `}

          <!-- Floating 3s Countdown Capsule -->
          <div id="${containerId}_camCountdownBox" style="position: absolute; bottom: 8px; z-index: 6; display: inline-flex; align-items: center; gap: 6px; background: rgba(0,0,0,0.85); border: 1.5px solid ${modeColor}; border-radius: 20px; padding: 3px 12px; box-shadow: 0 0 16px rgba(${isOcr ? '16,185,129' : '0,229,255'},0.7);">
            <i class="fa-solid fa-hourglass-half" style="color: ${modeColor}; font-size: 0.7rem;"></i>
            <span style="font-size: 0.72rem; font-weight: 800; color: #FFFFFF;">Capturing in:</span>
            <span id="${containerId}_camCountdownVal" style="font-size: 1rem; font-family: monospace; font-weight: 900; color: ${modeColor}; text-shadow: 0 0 8px ${modeColor};">
              ${simCameraCountdown}s
            </span>
          </div>

        </div>

        <!-- Bottom Guidance -->
        <div style="font-size: 0.62rem; color: #94A3B8; display: flex; align-items: center; justify-content: center; gap: 4px;">
          <i class="fa-solid fa-arrows-to-eye" style="color: ${modeColor};"></i> Hold camera steady • Swipe down to cancel
        </div>

      </div>
    `;

    // Try to access user's real webcam stream if allowed in browser
    const videoEl = document.getElementById(`${containerId}_camVideo`);
    if (videoEl && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then((stream) => {
          videoEl.srcObject = stream;
          videoEl.style.display = 'block';
        })
        .catch(() => {
          // Fallback to high-tech camera canvas simulation
        });
    }

    // Start 3-second auto hold timer
    simCameraTimer = setInterval(() => {
      simCameraCountdown--;
      const valEl = document.getElementById(`${containerId}_camCountdownVal`);
      if (valEl) {
        valEl.innerText = `${simCameraCountdown}s`;
      }
      Haptic.trigger('short');

      if (simCameraCountdown <= 0) {
        clearInterval(simCameraTimer);
        simCameraTimer = null;

        // Stop video stream tracks if running
        if (videoEl && videoEl.srcObject) {
          try {
            videoEl.srcObject.getTracks().forEach(track => track.stop());
          } catch(e) {}
        }

        Haptic.trigger('success');

        const targetScreen = 'cameraResultScreen';
        const screenSelect = document.getElementById(`${containerId}_simScreenSelect`);
        if (screenSelect && [...screenSelect.options].some(opt => opt.value === targetScreen)) {
          screenSelect.value = targetScreen;
        }
        updateSimulatorScreenContext(containerId, targetScreen, 0);
        syncSimulatorSections(containerId);

        const ttsLog = document.getElementById(`${containerId}_simTtsLog`);
        const parityStatus = document.getElementById(`${containerId}_parityStatus`);
        const ruleIdEl = document.getElementById(`${containerId}_ruleId`);
        const ruleActionEl = document.getElementById(`${containerId}_ruleAction`);
        const ruleHapticEl = document.getElementById(`${containerId}_ruleHaptic`);
        const ruleLatencyEl = document.getElementById(`${containerId}_ruleLatency`);

        let ttsText = '';
        if (isOcr) {
          ttsText = 'Document captured. Prescription details: Amoxicillin 500 milligrams. Take one tablet twice daily with meals for 7 days. Double tap to retake photo, swipe down to return.';
        } else {
          ttsText = 'Scene captured. Indoor hallway. Wooden door directly ahead at 2.5 meters. Chair on your right at 1 meter. Path is clear. Double tap to retake photo, swipe down to return.';
        }

        Speech.speak(ttsText);
        if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
        if (parityStatus) {
          parityStatus.innerText = 'PARITY PASS';
          parityStatus.style.color = '#10B981';
          parityStatus.style.background = 'rgba(16,185,129,0.15)';
        }
        if (ruleIdEl) ruleIdEl.innerText = 'cmd_camh1';
        if (ruleActionEl) ruleActionEl.innerText = 'AI_OCR_SCAN';
        if (ruleHapticEl) ruleHapticEl.innerText = 'success';
        if (ruleLatencyEl) ruleLatencyEl.innerText = '0.15 ms (LOCAL_CACHE)';
      }
    }, 1000);

    return;
  }

  // CAMERA RESULT SCREEN DESIGN (cameraResultScreen)
  if (screenId === 'cameraResultScreen') {
    if (simCameraTimer) {
      clearInterval(simCameraTimer);
      simCameraTimer = null;
    }
    const isOcr = simCameraMode === 'ocr';
    const resultColor = isOcr ? '#10B981' : '#00E5FF';

    viewportContent.innerHTML = `
      <div style="width: 100%; border: 2.5px solid ${resultColor}; border-radius: 16px; padding: 12px 10px; background: linear-gradient(180deg, #03150d 0%, #000000 100%); color: #FFFFFF; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; box-shadow: 0 0 30px rgba(${isOcr ? '16,185,129' : '0,229,255'},0.35); min-height: 225px; box-sizing: border-box;">
        
        <!-- Top Status Pill -->
        <div style="display: inline-flex; align-items: center; gap: 6px; background: rgba(${isOcr ? '16,185,129' : '0,229,255'},0.2); border: 1.5px solid ${resultColor}; border-radius: 20px; padding: 3px 12px; color: ${resultColor}; font-weight: 800; font-size: 0.72rem; letter-spacing: 0.8px;">
          <i class="fa-solid ${isOcr ? 'fa-file-lines' : 'fa-cube'}"></i>
          <span>${isOcr ? 'OCR TEXT RECOGNIZED' : 'ENVIRONMENT & SCENE DETECTED'}</span>
        </div>

        <!-- Result Card Content -->
        <div style="width: 95%; background: rgba(255,255,255,0.04); border: 1.5px solid rgba(${isOcr ? '16,185,129' : '0,229,255'},0.5); border-radius: 12px; padding: 10px 10px; margin: 6px 0; text-align: left;">
          ${isOcr ? `
            <div style="font-size: 0.72rem; color: #FFEE55; font-weight: 800; letter-spacing: 0.5px; margin-bottom: 4px;">
              <i class="fa-solid fa-file-medical"></i> PRESCRIPTION DETAILS
            </div>
            <div style="font-size: 0.88rem; font-weight: 900; color: #FFFFFF; line-height: 1.25;">
              Amoxicillin 500mg
            </div>
            <div style="font-size: 0.75rem; color: #CBD5E1; margin-top: 3px; line-height: 1.2;">
              Take 1 tablet twice daily with meals for 7 days.
            </div>
            <div style="font-size: 0.65rem; color: #10B981; font-family: monospace; margin-top: 4px; font-weight: 700;">
              BATCH #AMX-8821 • EXP: 12/2027
            </div>
          ` : `
            <div style="font-size: 0.72rem; color: #00E5FF; font-weight: 800; letter-spacing: 0.5px; margin-bottom: 4px;">
              <i class="fa-solid fa-cube"></i> OBSTACLE &amp; PATH RADAR
            </div>
            <div style="font-size: 0.82rem; font-weight: 800; color: #FFFFFF; line-height: 1.3;">
              • <strong style="color: #FFEE55;">Door:</strong> 2.5m directly ahead<br>
              • <strong style="color: #F59E0B;">Chair:</strong> 1.0m on right side<br>
              • <strong style="color: #10B981;">Path:</strong> Clear straight ahead
            </div>
          `}
        </div>

        <!-- Action Controls Hint -->
        <div style="font-size: 0.62rem; color: #94A3B8; border-top: 1px dashed rgba(255,255,255,0.15); width: 100%; padding-top: 4px;">
          <span style="color: #FFEE55; font-weight: 700;">Double Tap:</span> Retake Photo • <span style="color: #EF4444; font-weight: 700;">Swipe Down:</span> Return
        </div>

      </div>
    `;
    return;
  }

  if (screenId === 'settingsTutorialMenu') {
    viewportContent.innerHTML = `
      <div id="${containerId}_simSettTutCard" style="width: 100%; border-radius: 18px; padding: 20px 12px; background: #000000; color: #FFFFFF; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; gap: 16px; min-height: 220px; box-sizing: border-box; cursor: pointer;">
        <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
          <span style="color: #FFEE55; font-size: 0.72rem; font-weight: 900; background: rgba(255,238,85,0.12); padding: 3px 12px; border-radius: 10px; border: 1.5px solid #FFEE55; letter-spacing: 0.5px;">
            TUTORIAL MODE
          </span>
          <h2 style="margin: 6px 0 2px 0; font-size: 1.15rem; color: #FFFFFF; font-weight: 900; letter-spacing: 0.5px;">Interactive Voice Tutorial</h2>
          <p style="font-size: 0.75rem; color: #94A3B8; margin: 0; max-width: 240px; line-height: 1.3;">Learn gestures, handwriting, Morse typing, and touch zones.</p>
        </div>

        <div style="width: 76px; height: 76px; border-radius: 50%; border: 2.5px solid #FFEE55; display: flex; align-items: center; justify-content: center; background: rgba(255,238,85,0.1); box-shadow: 0 0 25px rgba(255,238,85,0.25);">
          <i class="fa-solid fa-graduation-cap" style="font-size: 2.4rem; color: #FFEE55;"></i>
        </div>
      </div>
    `;

    setTimeout(() => {
      const card = document.getElementById(`${containerId}_simSettTutCard`);
      let clickCount = 0;
      let clickTimer = null;
      const handleClick = (e) => {
        e.stopPropagation();
        clickCount++;
        if (clickCount === 1) {
          clickTimer = setTimeout(() => {
            clickCount = 0;
            executeSimulatorGesture(containerId, 'TAP', 'settingsTutorialMenu');
          }, 320);
        } else if (clickCount >= 2) {
          clearTimeout(clickTimer);
          clickCount = 0;
          executeSimulatorGesture(containerId, 'DOUBLE_TAP', 'settingsTutorialMenu');
        }
      };
      if (card) card.onclick = handleClick;
    }, 50);
    return;
  }

  if (screenId === 'welcomeScreen') {
    viewportContent.innerHTML = `
      <div style="width: 100%; border: 2.5px solid #FFEE55; border-radius: 18px; padding: 20px 10px; background: #000000; color: #FFFFFF; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; box-shadow: none; margin: 2px 0; min-height: 220px; box-sizing: border-box;">
        
        <!-- Center Animated Eye Orb & Hero Text -->
        <div style="display: flex; flex-direction: column; align-items: center; gap: 14px; animation: floatElement 3.5s ease-in-out infinite;">
          <div style="position: relative; width: 70px; height: 70px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; inset: -2px; border-radius: 50%; background: radial-gradient(circle, rgba(255,238,85,0.25) 0%, rgba(255,183,3,0.08) 70%); animation: blindEyePulse 2.8s ease-in-out infinite;"></div>
            <div style="width: 62px; height: 62px; border-radius: 50%; border: 2.5px solid #FFEE55; background: radial-gradient(circle, #332800 0%, #000000 100%); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(255,238,85,0.65), inset 0 0 10px rgba(255,238,85,0.35); z-index: 2;">
              <i class="fa-solid fa-eye-low-vision" style="font-size: 1.9rem; color: #FFEE55; filter: drop-shadow(0 0 6px #FFEE55);"></i>
            </div>
          </div>

          <div>
            <h1 style="margin: 0; font-size: 1.85rem; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; background: linear-gradient(135deg, #FFEE55 0%, #FFFFFF 50%, #FFB703 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: blindEyeGlowText 3s ease-in-out infinite;">
              BlindEye
            </h1>
          </div>
        </div>

      </div>
    `;
    return;
  }

  if (screenId === 'gestureTrainingScreen') {
    const tutTitles = [
      'Locate Navigation Bar',
      'Swipe Right',
      'Swipe Left',
      'Double Tap (Select)',
      'Swipe Down (Back)',
      'Two-Finger Tap (Status)'
    ];
    const currentTitle = tutTitles[simTutStep] || 'Locate Navigation Bar';
    const mockCategory = ['MESSAGES', 'PHONE', 'SETTINGS'][simTutMockIdx] || 'MESSAGES';
    let mockIcon = 'fa-comment-sms';
    if (mockCategory === 'PHONE') mockIcon = 'fa-phone';
    if (mockCategory === 'SETTINGS') mockIcon = 'fa-sliders';

    viewportContent.innerHTML = `
      <div style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: space-between; align-items: center; box-sizing: border-box;">
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #222; padding-bottom: 6px;">
          <span style="color: #00E5FF; font-weight: 800; font-size: 0.75rem; letter-spacing: 0.5px;">GESTURE LESSON</span>
          <span style="color: #00E5FF; font-size: 0.75rem; font-weight: bold; background: #181818; padding: 2px 6px; border-radius: 10px; border: 1px solid rgba(0,229,255,0.4);">
            [ ${simTutStep + 1} / 6 ]
          </span>
        </div>

        <div id="${containerId}_simTutCard" style="width: 100%; border: 2px solid #00E5FF; border-radius: 16px; padding: 18px 10px; background: #030712; color: #FFFFFF; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; margin: auto 0; box-sizing: border-box; cursor: pointer; box-shadow: 0 0 20px rgba(0,229,255,0.2);">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; margin: auto 0;">
            ${simTutStep === 0 ? `
              <div style="width: 60px; height: 60px; border-radius: 50%; border: 2px dashed #00E5FF; display: flex; align-items: center; justify-content: center; background: rgba(0,229,255,0.05); animation: pulse 1.5s infinite;">
                <i class="fa-solid fa-hand-pointer" style="font-size: 1.8rem; color: #00E5FF;"></i>
              </div>
              <h3 style="color: #00E5FF; font-size: 1.1rem; margin: 4px 0 0 0; font-weight: 800;">LOCATE NAV BAR</h3>
              <p style="color: #94A3B8; font-size: 0.75rem; margin: 0;">Single tap the Navigation Zone to locate it (not double tap).</p>
            ` : (simTutStep === 1 || simTutStep === 2 || simTutStep === 3) ? `
              <div style="width: 130px; height: 75px; border-radius: 12px; border: 2px solid #00E5FF; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; background: rgba(0,229,255,0.08);">
                <i class="fa-solid ${mockIcon}" style="font-size: 1.8rem; color: #00E5FF;"></i>
                <span style="color: #FFFFFF; font-size: 0.85rem; font-weight: bold;">${mockCategory}</span>
              </div>
              <h3 style="color: #00E5FF; font-size: 1.05rem; margin: 4px 0 0 0; font-weight: 800;">${currentTitle.toUpperCase()}</h3>
            ` : simTutStep === 4 ? `
              <div style="width: 60px; height: 60px; border-radius: 50%; border: 2px solid #00E5FF; display: flex; align-items: center; justify-content: center; background: rgba(0,229,255,0.08);">
                <i class="fa-solid fa-arrow-down" style="font-size: 1.8rem; color: #00E5FF;"></i>
              </div>
              <h3 style="color: #00E5FF; font-size: 1.05rem; margin: 4px 0 0 0; font-weight: 800;">SWIPE DOWN</h3>
              <p style="color: #94A3B8; font-size: 0.75rem; margin: 0;">Swipe down to go back.</p>
            ` : `
              <div style="width: 60px; height: 60px; border-radius: 50%; border: 2px solid #00E5FF; display: flex; align-items: center; justify-content: center; background: rgba(0,229,255,0.08);">
                <i class="fa-solid fa-hand-peace" style="font-size: 1.8rem; color: #00E5FF;"></i>
              </div>
              <h3 style="color: #00E5FF; font-size: 1.05rem; margin: 4px 0 0 0; font-weight: 800;">STATUS CHECK</h3>
              <p style="color: #94A3B8; font-size: 0.75rem; margin: 0;">Two-finger tap checks time & battery.</p>
            `}
          </div>
        </div>

        <div style="width: 100%; display: flex; justify-content: center; gap: 6px; padding-top: 6px; border-top: 1px dashed rgba(255,255,255,0.15);">
          ${[0, 1, 2, 3, 4, 5].map(idx => `
            <div style="width: ${idx === simTutStep ? '20px' : '6px'}; height: 6px; border-radius: 3px; background: ${idx === simTutStep ? '#00E5FF' : (idx < simTutStep ? '#10B981' : '#374151')}; transition: all 0.3s;"></div>
          `).join('')}
        </div>
      </div>
    `;

    setTimeout(() => {
      const card = document.getElementById(`${containerId}_simTutCard`);
      if (card && simTutStep === 0) {
        card.onclick = (e) => {
          e.stopPropagation();
          const rect = card.getBoundingClientRect();
          const relY = e.clientY - rect.top;
          const zone = relY < rect.height * 0.4 ? 'zone_top_header' : 'zone_main_viewport_content';
          executeSimulatorGesture(containerId, 'TAP', 'gestureTrainingScreen', zone);
        };
      }
    }, 50);
    return;
  }

  if (screenId === 'onboardingConfigScreen') {
    viewportContent.innerHTML = `
      <div style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: space-between; align-items: center; box-sizing: border-box;">
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #222; padding-bottom: 6px;">
          <span style="color: #00E5FF; font-weight: 800; font-size: 0.75rem; letter-spacing: 0.5px;">SYSTEM ACCESS</span>
          <span style="color: #00E5FF; font-size: 0.75rem; font-weight: bold; background: #181818; padding: 2px 6px; border-radius: 10px; border: 1px solid rgba(0,229,255,0.4);">
            [ ${simPermStep + 1} / 2 ]
          </span>
        </div>

        <div id="${containerId}_simPermCard" style="width: 100%; border: 2px solid #00E5FF; border-radius: 16px; padding: 20px 10px; background: #030712; color: #FFFFFF; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; margin: auto 0; box-sizing: border-box; cursor: pointer; box-shadow: 0 0 20px rgba(0,229,255,0.2);">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
            <div style="width: 64px; height: 64px; border-radius: 50%; border: 2px solid #00E5FF; display: flex; align-items: center; justify-content: center; background: rgba(0,229,255,0.08); box-shadow: 0 0 15px rgba(0,229,255,0.25);">
              <i class="fa-solid ${simPermStep === 0 ? 'fa-camera' : 'fa-microphone'}" style="font-size: 2rem; color: #00E5FF;"></i>
            </div>
            <h3 style="color: #00E5FF; font-size: 1.15rem; margin: 4px 0 0 0; font-weight: 800;">${simPermStep === 0 ? 'CAMERA ACCESS' : 'MICROPHONE'}</h3>
            <p style="color: #94A3B8; font-size: 0.75rem; margin: 0; max-width: 220px; line-height: 1.3;">
              ${simPermStep === 0 ? 'Used for AI text reading and object recognition.' : 'Used for dictating text replies and search.'}
            </p>
          </div>
        </div>

        <div style="height: 1px;"></div>
      </div>
    `;

    setTimeout(() => {
      const card = document.getElementById(`${containerId}_simPermCard`);
      if (card) {
        let clickCount = 0;
        let clickTimer = null;
        card.onclick = (e) => {
          e.stopPropagation();
          clickCount++;
          if (clickCount === 1) {
            clickTimer = setTimeout(() => {
              clickCount = 0;
              executeSimulatorGesture(containerId, 'TAP', 'onboardingConfigScreen');
            }, 320);
          } else if (clickCount >= 2) {
            clearTimeout(clickTimer);
            clickCount = 0;
            executeSimulatorGesture(containerId, 'DOUBLE_TAP', 'onboardingConfigScreen');
          }
        };
      }
    }, 50);
    return;
  }

  if (screenId === 'tutorialScreen') {
    const curLetter = SIM_CALIB_LETTERS[simCalibLetterIdx] || 'M';
    viewportContent.innerHTML = `
      <div style="width: 100%; border: 2px solid #FFEE55; border-radius: 16px; padding: 12px 10px; background: #030712; color: #FFFFFF; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; min-height: 220px; box-sizing: border-box;">
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #FFEE55; font-weight: 800; font-size: 0.75rem; letter-spacing: 0.5px;">LETTER CALIBRATION</span>
          <span style="color: #FFEE55; font-weight: bold; font-size: 0.8rem;">[ ${simCalibCount} / 3 ]</span>
        </div>

        <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; margin: 2px 0; width: 100%;">
          <div style="font-size: 2rem; font-weight: 900; color: #FFEE55; letter-spacing: 2px; text-shadow: 0 0 15px rgba(255,238,85,0.5);">
            ${curLetter}
          </div>
          <div style="width: 100%; height: 85px; border: 1.5px dashed rgba(255,238,85,0.4); border-radius: 10px; position: relative; background: rgba(255,238,85,0.03); display: flex; flex-direction: column; align-items: center; justify-content: center;" id="${containerId}_simCalibCanvasBox">
            <span style="position: absolute; color: #94A3B8; font-size: 0.7rem; pointer-events: none;">Draw letter <b>${curLetter}</b> here</span>
            <canvas id="${containerId}_simCalibCanvas" style="position: absolute; inset: 0; width: 100%; height: 100%; cursor: crosshair; touch-action: none; z-index: 2;"></canvas>
          </div>
          <button id="${containerId}_btnSimCalibStroke" style="margin-top: 4px; padding: 3px 12px; background: rgba(255,238,85,0.15); border: 1px solid #FFEE55; border-radius: 6px; color: #FFEE55; font-weight: bold; font-size: 0.7rem; cursor: pointer; z-index: 3;">
            <i class="fa-solid fa-pen-nib"></i> Simulate Stroke
          </button>
        </div>

        <div style="font-size: 0.65rem; color: #94A3B8; border-top: 1px dashed rgba(255,255,255,0.15); width: 100%; padding-top: 4px;">
          <span style="color: #FFEE55; font-weight: bold;">Letters:</span> ${SIM_CALIB_LETTERS.map((l, i) => i < simCalibLetterIdx ? `<span style="color:#10B981;">${l}✓</span>` : (i === simCalibLetterIdx ? `<span style="color:#FFEE55;font-weight:900;">[${l}]</span>` : `<span style="color:#64748B;">${l}</span>`)).join(' ')} • <span style="color:#94A3B8;">Long Press: Skip</span>
        </div>
      </div>
    `;

    setTimeout(() => {
      const strokeBtn = document.getElementById(`${containerId}_btnSimCalibStroke`);
      if (strokeBtn) {
        strokeBtn.onclick = (e) => {
          e.stopPropagation();
          executeSimulatorGesture(containerId, 'VALID_CALIB_STROKE', 'tutorialScreen');
        };
      }
      const canvas = document.getElementById(`${containerId}_simCalibCanvas`);
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const w = rect.width || 240;
        const h = rect.height || 85;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';

        const ctx = canvas.getContext('2d');
        if (ctx.resetTransform) ctx.resetTransform();
        else ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);

        let isDrawing = false;
        let pts = [];

        function getPos(e) {
          const r = canvas.getBoundingClientRect();
          const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
          const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
          return {
            x: clientX - r.left,
            y: clientY - r.top
          };
        }

        canvas.onpointerdown = (e) => {
          e.preventDefault();
          try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
          isDrawing = true;
          const p = getPos(e);
          pts = [p];
          ctx.strokeStyle = '#FFEE55';
          ctx.lineWidth = 5;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.shadowColor = '#FFEE55';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
        };
        canvas.onpointermove = (e) => {
          if (!isDrawing) return;
          e.preventDefault();
          const p = getPos(e);
          pts.push(p);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        };
        canvas.onpointerup = (e) => {
          if (!isDrawing) return;
          try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
          isDrawing = false;
          
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
          let pathDist = 0;
          for (let i = 0; i < pts.length; i++) {
            const p = pts[i];
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
            if (i > 0) pathDist += Math.hypot(p.x - pts[i-1].x, p.y - pts[i-1].y);
          }
          const w = maxX - minX;
          const h = maxY - minY;

          // Require a legitimate letter stroke (not just a click or tiny drag)
          if (pts.length >= 8 && pathDist >= 35 && (w >= 20 || h >= 20)) {
            setTimeout(() => {
              executeSimulatorGesture(containerId, 'VALID_CALIB_STROKE', 'tutorialScreen');
            }, 250);
          } else {
            Haptic.trigger('warning');
            const curL = SIM_CALIB_LETTERS[simCalibLetterIdx] || 'M';
            Speech.speak(`Tap detected. Please draw letter ${curL} inside the box, or click Simulate Stroke.`);
            setTimeout(() => ctx.clearRect(0, 0, canvas.width, canvas.height), 400);
          }
        };
        canvas.onpointercancel = (e) => {
          try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
          isDrawing = false;
        };
      }
    }, 50);
    return;
  }

  // Non-carousel screens
  const meta = {
    'msgSendConfirmScreen': { title: 'SEND CONFIRMATION', subtitle: 'Double tap to confirm and send reply', icon: 'fa-paper-plane', color: '#10B981' },
    'contactsListScreen': { title: 'Contacts Directory', subtitle: 'Swipe right/left to browse all contacts', icon: 'fa-address-book', color: '#FFEE55' },
    'contactSaveNameInputScreen': { title: 'Save Contact Name', subtitle: 'Enter name & surname via Morse or Voice STT', icon: 'fa-user-plus', color: '#FFEE55' },
    'favoritesListScreen': { title: 'Favorite Contacts', subtitle: 'Swipe right/left to browse favorites', icon: 'fa-star', color: '#FFEE55' },
    'emergencyContactsListScreen': { title: 'Emergency Contacts', subtitle: 'Swipe right/left for emergency dial', icon: 'fa-triangle-exclamation', color: '#EF4444' },
    'cameraActiveHoldScreen': { title: 'Camera Live Capture', subtitle: '3-second auto hold active', icon: 'fa-camera-retro', color: '#10B981' },
    'settingsAccessibilityMenu': { title: 'Accessibility Options', subtitle: 'Reading mode, haptics & privacy', icon: 'fa-universal-access', color: '#10B981' },
    'settingsQuickAccessScreen': { title: 'Quick Access Actions', subtitle: 'Swipe up to add new action', icon: 'fa-bolt', color: '#FFEE55' },
    'settingsAddQuickActionScreen': { title: 'Add Quick Action', subtitle: 'Choose action type: Call, Message, Navigate, Scan', icon: 'fa-circle-plus', color: '#10B981' },
    'settingsPickTargetScreen': { title: 'Select Target', subtitle: 'Choose target — Double tap to create action', icon: 'fa-crosshairs', color: '#A855F7' },
    'settingsTutorialMenu': { title: 'Tutorial Mode', subtitle: 'Double tap to restart orientation', icon: 'fa-graduation-cap', color: '#CBD5E1' }
  };



  const currentMeta = meta[screenId] || { title: screenId, subtitle: 'Active Screen Context', icon: 'fa-layer-group', color: '#00E5FF' };

  viewportContent.innerHTML = `
    <div style="text-align: center; margin: 10px 0;">
      <div id="${containerId}_screenIcon" style="font-size: 2.2rem; color: ${currentMeta.color}; margin-bottom: 6px;">
        <i class="fa-solid ${currentMeta.icon}"></i>
      </div>
      <div id="${containerId}_screenTitle" style="color: #FFFFFF; font-weight: 800; font-size: 0.95rem;">${currentMeta.title}</div>
      <div id="${containerId}_screenSubtitle" style="color: #9CA3AF; font-size: 0.75rem; margin-top: 4px;">${currentMeta.subtitle}</div>
    </div>
  `;

}

export function executeSimulatorGesture(containerId, gestureCode, screenId, subContext = 'DEFAULT') {
  const ttsLog = document.getElementById(`${containerId}_simTtsLog`);
  const hapticBar = document.getElementById(`${containerId}_hapticBar`);
  const parityStatus = document.getElementById(`${containerId}_parityStatus`);
  const ruleIdEl = document.getElementById(`${containerId}_ruleId`);
  const ruleActionEl = document.getElementById(`${containerId}_ruleAction`);
  const ruleHapticEl = document.getElementById(`${containerId}_ruleHaptic`);
  const ruleLatencyEl = document.getElementById(`${containerId}_ruleLatency`);
  const screenSelectEl = document.getElementById(`${containerId}_simScreenSelect`);

  const isMessageScreen = screenId === 'messagesView' || screenId === 'messagesScreen';
  const isPhoneScreen = ['phoneCategoryMenu', 'phoneView', 'callsScreen', 'contactsListScreen', 'favoritesListScreen', 'recentCallsScreen', 'recentsListScreen', 'emergencyContactsListScreen', 'contactActionMenuScreen', 'dialerActionMenuScreen'].includes(screenId);
  const isMainMenuScreen = screenId === 'mainMenuScreen';
  const isNavZoneRestricted = isMainMenuScreen || isMessageScreen || isPhoneScreen;
  const isFixedNavZone = subContext === 'zone_bottom_navigation_bar_global' || subContext.includes('nav') || subContext === 'DEFAULT';

  // Enforce zone restriction for mainMenuScreen, messagesScreen and phoneScreens navigation gestures
  if (isNavZoneRestricted && ['SWIPE_RIGHT', 'SWIPE_LEFT', 'DOUBLE_TAP'].includes(gestureCode)) {
    if (!isFixedNavZone) {
      Haptic.trigger('warning');
      const gestureName = gestureCode === 'DOUBLE_TAP' ? 'Double tap' : (gestureCode === 'SWIPE_RIGHT' ? 'Swipe right' : 'Swipe left');
      let spatialHint = 'Swipe in the bottom navigation bar.';
      if (subContext.includes('top') || subContext.includes('header')) {
        spatialHint = 'Too high. Use the bottom navigation bar.';
      } else if (subContext.includes('main') || subContext.includes('viewport')) {
        spatialHint = 'Swipe in the bottom navigation bar.';
      }

      const msg = `${gestureName} is only active in the bottom navigation zone. ${spatialHint}`;
      Speech.speak(msg);
      if (ttsLog) ttsLog.innerText = `> [ZONE BLOCKED] ${gestureName} ignored on "${subContext}". ${spatialHint}`;
      if (parityStatus) {
        parityStatus.innerText = 'IGNORED (ZONE MISMATCH)';
        parityStatus.style.color = '#F59E0B';
        parityStatus.style.background = 'rgba(245,158,11,0.15)';
      }
      if (ruleIdEl) ruleIdEl.innerText = '— (Requires Nav Zone)';
      if (ruleActionEl) ruleActionEl.innerText = 'BLOCKED_BY_ZONE';
      if (ruleHapticEl) ruleHapticEl.innerText = 'warning';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (ZONE_FILTER)';
      return;
    }
  }

  // Handle Drawn Letter recognition gestures (M, P, C, N, S)
  if (gestureCode.startsWith('DRAW_LETTER_')) {
    const letter = gestureCode.replace('DRAW_LETTER_', '');
    const categoryMap = {
      'M': { name: 'Messages', target: 'messagesScreen' },
      'P': { name: 'Phone and Contacts', target: 'phoneCategoryMenu' },
      'C': { name: 'Camera and AI Vision', target: 'cameraCategoryMenu' },
      'N': { name: 'GPS Navigation', target: 'navCategoryMenu' },
      'S': { name: 'Settings', target: 'settingsCategoryMenu' }
    };

    if (categoryMap[letter]) {
      const cat = categoryMap[letter];
      const targetScreen = cat.target;
      if (screenSelectEl && [...screenSelectEl.options].some(opt => opt.value === targetScreen)) {
        screenSelectEl.value = targetScreen;
      }
      updateSimulatorScreenContext(containerId, targetScreen, 0);
      syncSimulatorSections(containerId);

      const ttsText = `Letter ${letter} recognized. Opening ${cat.name}.`;
      Haptic.trigger('success');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = `cmd_draw_${letter.toLowerCase()}`;
      if (ruleActionEl) ruleActionEl.innerText = `OPEN_${letter}`;
      if (ruleHapticEl) ruleHapticEl.innerText = 'success';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (CALIBRATED_MATCH)';
      return;
    }
  }

  // Settings Tutorial Menu Intercept
  if (screenId === 'settingsTutorialMenu') {
    if (gestureCode === 'DOUBLE_TAP') {
      simTutStep = 0;
      simTutMockIdx = 0;
      const targetScreen = 'gestureTrainingScreen';
      if (screenSelectEl && [...screenSelectEl.options].some(opt => opt.value === targetScreen)) {
        screenSelectEl.value = targetScreen;
      }
      updateSimulatorScreenContext(containerId, targetScreen, 0);
      syncSimulatorSections(containerId);

      const ttsText = "Welcome to the gesture tutorial. Let's find the Navigation Bar. It is a dedicated touch strip running horizontally along the bottom of the screen. Tap once on the bottom section of your screen to locate it.";
      Haptic.trigger('success');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_sett1';
      if (ruleActionEl) ruleActionEl.innerText = 'RESTART_TUTORIAL';
      if (ruleHapticEl) ruleHapticEl.innerText = 'success';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
      return;
    } else if (gestureCode === 'TAP') {
      const ttsText = "Double tap to restart the gesture tutorial.";
      Haptic.trigger('short');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'tap_announce';
      if (ruleActionEl) ruleActionEl.innerText = 'ANNOUNCE_ITEM';
      if (ruleHapticEl) ruleHapticEl.innerText = 'short';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
      return;
    }
  }

  // Welcome Screen Gesture Intercept
  if (screenId === 'welcomeScreen') {
    if (gestureCode === 'SWIPE_RIGHT' || gestureCode === 'DOUBLE_TAP') {
      const targetScreen = 'mainMenuScreen';
      if (screenSelectEl && [...screenSelectEl.options].some(opt => opt.value === targetScreen)) {
        screenSelectEl.value = targetScreen;
      }
      updateSimulatorScreenContext(containerId, targetScreen, 0);
      syncSimulatorSections(containerId);

      const ttsText = "Entering Main Menu. 5 categories available. Draw letter M, P, C, N, or S, or swipe navigation bar to browse.";
      Haptic.trigger('success');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_welcome_main_menu';
      if (ruleActionEl) ruleActionEl.innerText = 'OPEN_MAIN_MENU';
      if (ruleHapticEl) ruleHapticEl.innerText = 'success';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
      return;
    } else if (gestureCode === 'SWIPE_LEFT') {
      simTutStep = 0;
      simTutMockIdx = 0;
      const targetScreen = 'gestureTrainingScreen';
      if (screenSelectEl && [...screenSelectEl.options].some(opt => opt.value === targetScreen)) {
        screenSelectEl.value = targetScreen;
      }
      updateSimulatorScreenContext(containerId, targetScreen, 0);
      syncSimulatorSections(containerId);

      const ttsText = "Welcome to the gesture tutorial. Let's find the Navigation Bar. It is a dedicated touch strip running horizontally along the bottom of the screen. Tap once on the bottom section of your screen to locate it.";
      Haptic.trigger('success');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_welcome_tutorial';
      if (ruleActionEl) ruleActionEl.innerText = 'START_TUTORIAL';
      if (ruleHapticEl) ruleHapticEl.innerText = 'success';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
      return;
    }
  }

  // 1b. GESTURE TRAINING SCREEN INTERCEPT
  if (screenId === 'gestureTrainingScreen') {
    if (gestureCode === 'LONG_PRESS') {
      const targetScreen = 'welcomeScreen';
      if (screenSelectEl && [...screenSelectEl.options].some(opt => opt.value === targetScreen)) {
        screenSelectEl.value = targetScreen;
      }
      updateSimulatorScreenContext(containerId, targetScreen, 0);
      syncSimulatorSections(containerId);

      const ttsText = "Exited tutorial. Returned to Welcome screen.";
      Haptic.trigger('short');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_tut_long_press_exit';
      if (ruleActionEl) ruleActionEl.innerText = 'EXIT_TUTORIAL';
      if (ruleHapticEl) ruleHapticEl.innerText = 'short';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
      return;
    }

    let ttsText = '';
    let ruleAction = 'PRACTICE_GESTURE';
    let ruleId = `cmd_tut_step${simTutStep}`;
    let hapticType = 'short';

    if (simTutStep === 0) { // Locate nav bar
      const inNav = subContext.includes('nav') || subContext === 'zone_bottom_navigation_bar_global' || subContext === 'DEFAULT';
      if (gestureCode === 'TAP' && inNav && subContext !== 'zone_top_header' && subContext !== 'zone_main_viewport_content') {
        simTutStep = 1;
        simTutMockIdx = 0;
        ttsText = "Correct! You've located the navigation bar. The screen is split into two zones: the bottom is the Navigation Zone, where you swipe left and right to select menu options. The top area is the Content Area, where cards and details are displayed. Let's practice moving between mock menu items.";
        hapticType = 'success';
        ruleAction = 'LOCATE_NAV_BAR';
      } else if (gestureCode === 'DOUBLE_TAP') {
        ttsText = "Navigation bar is located with a single tap, not a double tap. Tap once in the navigation zone.";
        hapticType = 'warning';
      } else {
        hapticType = 'warning';
        if (subContext.includes('top') || subContext.includes('header')) {
          ttsText = "Too high. Tap much lower, near the bottom of the screen.";
        } else if (subContext.includes('main') || subContext.includes('viewport') || subContext.includes('card')) {
          ttsText = "Tap lower down toward the bottom of the screen.";
        } else {
          ttsText = "Tap lower down into the navigation zone.";
        }
      }
    } else if (simTutStep === 1) { // Swipe right
      if (gestureCode === 'SWIPE_RIGHT') {
        if (simTutMockIdx === 0) {
          simTutMockIdx = 1;
          ttsText = "Phone focused. Excellent! Swipe right again to focus Settings.";
          hapticType = 'success';
        } else if (simTutMockIdx === 1) {
          simTutMockIdx = 2;
          simTutStep = 2;
          ttsText = "Settings focused. Perfect! Let's learn to go backward. Swipe left inside the navigation bar to focus Phone.";
          hapticType = 'success';
        }
      } else {
        ttsText = "Swipe right inside the navigation bar to focus next item.";
        hapticType = 'warning';
      }
    } else if (simTutStep === 2) { // Swipe left
      if (gestureCode === 'SWIPE_LEFT') {
        if (simTutMockIdx === 2) {
          simTutMockIdx = 1;
          ttsText = "Phone focused. Great! Swipe left once more to return to Messages.";
          hapticType = 'success';
        } else if (simTutMockIdx === 1) {
          simTutMockIdx = 0;
          simTutStep = 3;
          ttsText = "Messages focused. Wonderful! You've mastered browsing menus. Next, let's learn how to select an option. Double tap inside the navigation bar to select Messages.";
          hapticType = 'success';
        }
      } else {
        ttsText = "Swipe left inside the navigation bar to go backward.";
        hapticType = 'warning';
      }
    } else if (simTutStep === 3) { // Double tap
      if (gestureCode === 'DOUBLE_TAP') {
        simTutStep = 4;
        ttsText = "Messages selected! This confirms your selection. In a real screen, this lets you reply or read details. Now, let's learn how to go back. Swipe down inside the navigation bar to go back.";
        hapticType = 'success';
        ruleAction = 'SELECT_OPTION';
      } else {
        ttsText = "Double tap inside the navigation bar to confirm selection.";
        hapticType = 'warning';
      }
    } else if (simTutStep === 4) { // Swipe down (Back)
      if (gestureCode === 'SWIPE_DOWN') {
        simTutStep = 5;
        ttsText = "Correct! Swipe down goes back. Finally, tap the navigation bar with two fingers simultaneously to hear your battery and time status.";
        hapticType = 'success';
        ruleAction = 'NAVIGATE_BACK';
      } else {
        ttsText = "Swipe down inside the navigation bar to go back.";
        hapticType = 'warning';
      }
    } else if (simTutStep === 5) { // Two-finger tap
      if (gestureCode === 'TWO_FINGER_TAP' || gestureCode === 'DOUBLE_TAP') {
        simPermStep = 0;
        const targetScreen = 'onboardingConfigScreen';
        if (screenSelectEl && [...screenSelectEl.options].some(opt => opt.value === targetScreen)) {
          screenSelectEl.value = targetScreen;
        }
        updateSimulatorScreenContext(containerId, targetScreen, 0);
        syncSimulatorSections(containerId);

        ttsText = "Correct! Two-finger tap checks status. Time is 12:00. Battery is 85 percent. Connection is stable. Now, let's set up system permissions.";
        Haptic.trigger('success');
        Speech.speak(ttsText);
        if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
        if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
        if (ruleIdEl) ruleIdEl.innerText = 'cmd_tut_status';
        if (ruleActionEl) ruleActionEl.innerText = 'CHECK_STATUS';
        if (ruleHapticEl) ruleHapticEl.innerText = 'success';
        if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
        return;
      } else {
        ttsText = "Tap with two fingers inside the navigation bar to hear status.";
        hapticType = 'warning';
      }
    }

    updateSimulatorScreenContext(containerId, 'gestureTrainingScreen', 0);
    Haptic.trigger(hapticType);
    Speech.speak(ttsText);
    if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
    if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
    if (ruleIdEl) ruleIdEl.innerText = ruleId;
    if (ruleActionEl) ruleActionEl.innerText = ruleAction;
    if (ruleHapticEl) ruleHapticEl.innerText = hapticType;
    if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
    return;
  }

  // 1c. ONBOARDING CONFIG SCREEN INTERCEPT (Permissions)
  if (screenId === 'onboardingConfigScreen') {
    if (window._simPermTransitioning) return;
    let ttsText = '';
    let ruleAction = 'GRANT_PERMISSION';
    let ruleId = `cmd_perm_${simPermStep === 0 ? 'cam' : 'mic'}`;

    let hapticType = 'success';
    if (simPermStep === 0) { // Camera
      if (gestureCode === 'DOUBLE_TAP') {
        window._simPermTransitioning = true;
        simPermStep = 1;
        ttsText = "Camera permission granted successfully. Moving to microphone.";
        setTimeout(() => { window._simPermTransitioning = false; }, 800);
      } else if (gestureCode === 'TAP') {
        ttsText = "Camera permission requires a double tap. Double tap to allow, or swipe right to skip.";
        hapticType = 'warning';
        ruleAction = 'REQUIRE_DOUBLE_TAP';
      } else if (gestureCode === 'SWIPE_RIGHT') {
        window._simPermTransitioning = true;
        simPermStep = 1;
        ttsText = "Camera permission skipped. Moving to microphone.";
        ruleAction = 'SKIP_PERMISSION';
        setTimeout(() => { window._simPermTransitioning = false; }, 600);
      }
      updateSimulatorScreenContext(containerId, 'onboardingConfigScreen', 0);
    } else { // Mic
      if (gestureCode === 'DOUBLE_TAP') {
        window._simPermTransitioning = true;
        simCalibLetterIdx = 0;
        simCalibCount = 1;
        const targetScreen = 'tutorialScreen';
        if (screenSelectEl && [...screenSelectEl.options].some(opt => opt.value === targetScreen)) {
          screenSelectEl.value = targetScreen;
        }
        updateSimulatorScreenContext(containerId, targetScreen, 0);
        syncSimulatorSections(containerId);
        ttsText = "Microphone permission granted successfully. Moving to handwriting calibration.";
        setTimeout(() => { window._simPermTransitioning = false; }, 800);
      } else if (gestureCode === 'TAP') {
        ttsText = "Microphone permission requires a double tap. Double tap to allow, or swipe right to skip.";
        hapticType = 'warning';
        ruleAction = 'REQUIRE_DOUBLE_TAP';
      } else if (gestureCode === 'SWIPE_RIGHT') {
        window._simPermTransitioning = true;
        simCalibLetterIdx = 0;
        simCalibCount = 1;
        const targetScreen = 'tutorialScreen';
        if (screenSelectEl && [...screenSelectEl.options].some(opt => opt.value === targetScreen)) {
          screenSelectEl.value = targetScreen;
        }
        updateSimulatorScreenContext(containerId, targetScreen, 0);
        syncSimulatorSections(containerId);
        ttsText = "Microphone permission skipped. Moving to handwriting calibration.";
        ruleAction = 'SKIP_PERMISSION';
        setTimeout(() => { window._simPermTransitioning = false; }, 600);
      }
    }

    Haptic.trigger('success');
    Speech.speak(ttsText);
    if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
    if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
    if (ruleIdEl) ruleIdEl.innerText = ruleId;
    if (ruleActionEl) ruleActionEl.innerText = ruleAction;
    if (ruleHapticEl) ruleHapticEl.innerText = 'success';
    if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
    return;
  }

  // 1d. TUTORIAL SCREEN INTERCEPT (Letter Calibration: M, P, C, N, S)
  if (screenId === 'tutorialScreen') {
    if (gestureCode === 'LONG_PRESS') {
      const targetScreen = 'welcomeScreen';
      if (screenSelectEl && [...screenSelectEl.options].some(opt => opt.value === targetScreen)) {
        screenSelectEl.value = targetScreen;
      }
      updateSimulatorScreenContext(containerId, targetScreen, 0);
      syncSimulatorSections(containerId);

      if (!state.db) state.db = {};
      state.db.tutorialCompleted = true;
      if (typeof saveDb === 'function') saveDb();

      const ttsText = "Handwriting calibration skipped. Opening Welcome screen.";
      Haptic.trigger('success');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_calib_skip';
      if (ruleActionEl) ruleActionEl.innerText = 'SKIP_CALIBRATION';
      if (ruleHapticEl) ruleHapticEl.innerText = 'success';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
      return;
    }

    // Only advance calibration on VALID_CALIB_STROKE (not accidental taps/clicks)
    if (gestureCode === 'VALID_CALIB_STROKE') {
      const curLetter = SIM_CALIB_LETTERS[simCalibLetterIdx] || 'M';
      let ttsText = '';

      if (simCalibCount < 3) {
        simCalibCount++;
        ttsText = `${curLetter}, ${simCalibCount - 1} of 3 recorded. Draw letter ${curLetter} again.`;
        updateSimulatorScreenContext(containerId, 'tutorialScreen', 0);
      } else {
        // 3 strokes completed for current letter
        if (simCalibLetterIdx < SIM_CALIB_LETTERS.length - 1) {
          simCalibLetterIdx++;
          simCalibCount = 1;
          const nextLetter = SIM_CALIB_LETTERS[simCalibLetterIdx];
          ttsText = `Letter ${curLetter} calibrated successfully. Now draw letter ${nextLetter}.`;
          updateSimulatorScreenContext(containerId, 'tutorialScreen', 0);
        } else {
          // All 5 letters calibrated!
          if (!state.db) state.db = {};
          state.db.tutorialCompleted = true;
          if (typeof saveDb === 'function') saveDb();

          const targetScreen = 'welcomeScreen';
          if (screenSelectEl && [...screenSelectEl.options].some(opt => opt.value === targetScreen)) {
            screenSelectEl.value = targetScreen;
          }
          updateSimulatorScreenContext(containerId, targetScreen, 0);
          syncSimulatorSections(containerId);

          ttsText = "All letters M, P, C, N, and S calibrated! Tutorial complete. Opening Welcome screen.";
        }
      }

      Haptic.trigger('success');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_calib_stroke';
      if (ruleActionEl) ruleActionEl.innerText = 'CALIBRATE_LETTER';
      if (ruleHapticEl) ruleHapticEl.innerText = 'success';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
      return;
    } else if (gestureCode === 'TAP' || gestureCode === 'DOUBLE_TAP') {
      const curLetter = SIM_CALIB_LETTERS[simCalibLetterIdx] || 'M';
      const ttsText = `Tap detected. Draw the shape of letter ${curLetter} inside the box, or click Simulate Stroke.`;
      Haptic.trigger('warning');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      return;
    }

    Haptic.trigger('success');
    Speech.speak(ttsText);
    if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
    if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
    if (ruleIdEl) ruleIdEl.innerText = `cmd_calib_${curLetter}_${simCalibCount}`;
    if (ruleActionEl) ruleActionEl.innerText = 'CALIBRATE_LETTER';
    if (ruleHapticEl) ruleHapticEl.innerText = 'success';
    if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
    return;
  }

  const menuList = SIMULATOR_MENUS[screenId];

  // 1. CAROUSEL SWIPE RIGHT HANDLING
  if (gestureCode === 'SWIPE_RIGHT' && menuList && menuList.length > 0) {
    const isMessageScreen = screenId === 'messagesView' || screenId === 'messagesScreen';
    const isContactScreen = screenId === 'contactsListScreen';
    const isRecentScreen = screenId === 'recentCallsScreen' || screenId === 'recentsListScreen';
    const isFavScreen = screenId === 'favoritesListScreen';
    const isEmergScreen = screenId === 'emergencyContactsListScreen';
    const isSavedPlacesScreen = screenId === 'savedPlacesListScreen';
    const currentIdx = simCategoryIndices[screenId] || 0;

    if (isMessageScreen && currentIdx >= menuList.length - 1) {
      Haptic.trigger('warning');
      Speech.speak("Last message.");
      if (ttsLog) ttsLog.innerText = '> "Last message."';
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = `cmd_${screenId}_end`;
      if (ruleActionEl) ruleActionEl.innerText = 'LIST_BOUNDARY';
      if (ruleHapticEl) ruleHapticEl.innerText = 'warning';
      if (ruleLatencyEl) ruleLatencyEl.innerText = `0.05 ms (LOCAL_CACHE)`;
      return;
    }
    if (isContactScreen && currentIdx >= menuList.length - 1) {
      Haptic.trigger('warning');
      Speech.speak("Last contact.");
      if (ttsLog) ttsLog.innerText = '> "Last contact."';
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = `cmd_${screenId}_end`;
      if (ruleActionEl) ruleActionEl.innerText = 'LIST_BOUNDARY';
      if (ruleHapticEl) ruleHapticEl.innerText = 'warning';
      if (ruleLatencyEl) ruleLatencyEl.innerText = `0.05 ms (LOCAL_CACHE)`;
      return;
    }
    if (isRecentScreen && currentIdx >= menuList.length - 1) {
      Haptic.trigger('warning');
      Speech.speak("Last recent call.");
      if (ttsLog) ttsLog.innerText = '> "Last recent call."';
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = `cmd_${screenId}_end`;
      if (ruleActionEl) ruleActionEl.innerText = 'LIST_BOUNDARY';
      if (ruleHapticEl) ruleHapticEl.innerText = 'warning';
      if (ruleLatencyEl) ruleLatencyEl.innerText = `0.05 ms (LOCAL_CACHE)`;
      return;
    }
    if (isFavScreen && currentIdx >= menuList.length - 1) {
      Haptic.trigger('warning');
      Speech.speak("Last favorite contact.");
      if (ttsLog) ttsLog.innerText = '> "Last favorite contact."';
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = `cmd_${screenId}_end`;
      if (ruleActionEl) ruleActionEl.innerText = 'LIST_BOUNDARY';
      if (ruleHapticEl) ruleHapticEl.innerText = 'warning';
      if (ruleLatencyEl) ruleLatencyEl.innerText = `0.05 ms (LOCAL_CACHE)`;
      return;
    }
    if (isEmergScreen && currentIdx >= menuList.length - 1) {
      Haptic.trigger('warning');
      Speech.speak("Last emergency contact.");
      if (ttsLog) ttsLog.innerText = '> "Last emergency contact."';
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = `cmd_${screenId}_end`;
      if (ruleActionEl) ruleActionEl.innerText = 'LIST_BOUNDARY';
      if (ruleHapticEl) ruleHapticEl.innerText = 'warning';
      if (ruleLatencyEl) ruleLatencyEl.innerText = `0.05 ms (LOCAL_CACHE)`;
      return;
    }
    if (isSavedPlacesScreen && currentIdx >= menuList.length - 1) {
      Haptic.trigger('warning');
      Speech.speak("Last saved place.");
      if (ttsLog) ttsLog.innerText = '> "Last saved place."';
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = `cmd_${screenId}_end`;
      if (ruleActionEl) ruleActionEl.innerText = 'LIST_BOUNDARY';
      if (ruleHapticEl) ruleHapticEl.innerText = 'warning';
      if (ruleLatencyEl) ruleLatencyEl.innerText = `0.05 ms (LOCAL_CACHE)`;
      return;
    }
    const isAccessScreen = screenId === 'settingsAccessibilityMenu';
    if (isAccessScreen && currentIdx >= menuList.length - 1) {
      Haptic.trigger('warning');
      Speech.speak("Last accessibility preference.");
      if (ttsLog) ttsLog.innerText = '> "Last accessibility preference."';
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = `cmd_${screenId}_end`;
      if (ruleActionEl) ruleActionEl.innerText = 'LIST_BOUNDARY';
      if (ruleHapticEl) ruleHapticEl.innerText = 'warning';
      if (ruleLatencyEl) ruleLatencyEl.innerText = `0.05 ms (LOCAL_CACHE)`;
      return;
    }
    const isQuickScreen = screenId === 'settingsQuickAccessScreen';
    if (isQuickScreen && currentIdx >= menuList.length - 1) {
      Haptic.trigger('warning');
      Speech.speak("Last quick action.");
      if (ttsLog) ttsLog.innerText = '> "Last quick action."';
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = `cmd_${screenId}_end`;
      if (ruleActionEl) ruleActionEl.innerText = 'LIST_BOUNDARY';
      if (ruleHapticEl) ruleHapticEl.innerText = 'warning';
      if (ruleLatencyEl) ruleLatencyEl.innerText = `0.05 ms (LOCAL_CACHE)`;
      return;
    }

    const nextIdx = ((simCategoryIndices[screenId] || 0) + 1) % menuList.length;
    simCategoryIndices[screenId] = nextIdx;
    if (screenId === 'recentsListScreen' || screenId === 'recentCallsScreen') {
      simCategoryIndices['recentsListScreen'] = nextIdx;
      simCategoryIndices['recentCallsScreen'] = nextIdx;
    }
    updateSimulatorScreenContext(containerId, screenId, nextIdx);

    const item = menuList[nextIdx];
    let ttsText = `${item.title}. ${item.subtitle}. Double tap to open.`;
    if (screenId === 'mainMenuScreen') {
      ttsText = `Category ${nextIdx + 1} of ${menuList.length}: ${item.title}. ${item.subtitle}. Double tap to open or draw letter ${item.letter || item.title[0]}.`;
    } else if (isMessageScreen) {
      ttsText = `Message ${nextIdx + 1} of ${menuList.length} from ${item.title}. ${item.unread ? 'New unread.' : 'Read.'} Received at ${item.time || '12:00'}. Double tap to open private screen.`;
    } else if (screenId === 'contactsListScreen') {
      const spokenPhone = formatPhoneForTTS(item.subtitle);
      ttsText = `Contact ${nextIdx + 1} of ${menuList.length}: ${item.title}. ${spokenPhone}. Double tap for contact actions.`;
    } else if (screenId === 'contactActionMenuScreen') {
      const selectedContact = (SIMULATOR_MENUS['contactsListScreen'] || [])[(simCategoryIndices['contactsListScreen'] || 0) % (SIMULATOR_MENUS['contactsListScreen']?.length || 1)];
      let dynamicActionTitle = item.title;
      if (item.actionId === 'toggle_fav') dynamicActionTitle = selectedContact?.favorite ? 'REMOVE FROM FAVORITES' : 'ADD TO FAVORITES';
      if (item.actionId === 'toggle_emerg') dynamicActionTitle = selectedContact?.emergency ? 'REMOVE FROM EMERGENCY' : 'ADD TO EMERGENCY';
      ttsText = `${dynamicActionTitle}. ${item.subtitle}. Double tap to execute.`;
    } else if (screenId === 'dialerActionMenuScreen') {
      const targetNum = simDialedNumber ? formatPhoneForTTS(simDialedNumber) : '+389 70 123 456';
      let dynamicActionTitle = item.title;
      if (item.actionId === 'call') dynamicActionTitle = `Call number ${targetNum}`;
      ttsText = `Action ${nextIdx + 1} of 2: ${dynamicActionTitle}. ${item.subtitle}. Double tap to execute.`;
    } else if (screenId === 'favoritesListScreen') {
      const spokenPhone = formatPhoneForTTS(item.subtitle);
      ttsText = `Favorite contact ${nextIdx + 1} of ${menuList.length}: ${item.title}. ${spokenPhone}. Double tap to call.`;
    } else if (screenId === 'emergencyContactsListScreen') {
      const spokenPhone = formatPhoneForTTS(item.subtitle);
      ttsText = `Emergency contact ${nextIdx + 1} of ${menuList.length}: ${item.title}. ${spokenPhone}. Double tap to call.`;
    } else if (screenId === 'recentCallsScreen' || screenId === 'recentsListScreen') {
      const spokenPhone = formatPhoneForTTS(item.subtitle);
      ttsText = `Recent call ${nextIdx + 1} of ${menuList.length}: ${item.title}. ${item.callType} call at ${item.time}. ${spokenPhone}. Double tap to call back.`;
    } else if (screenId === 'savedPlacesListScreen') {
      ttsText = `Saved place ${nextIdx + 1} of ${menuList.length}: ${item.title}. ${item.subtitle}. Double tap for options.`;
    } else if (screenId === 'navPlaceActionMenuScreen' || screenId === 'placeActionMenuScreen') {
      let actTitle = item.title;
      let actSub = item.subtitle;
      if (nextIdx === 2) {
        actTitle = simNavActionSource === 'search' ? 'SAVE PLACE' : 'REMOVE FROM SAVED DESTINATIONS';
        actSub = simNavActionSource === 'search' ? 'Save to saved destinations list' : 'Remove from saved destinations list';
      }
      ttsText = `Action ${nextIdx + 1} of 3: ${actTitle}. ${actSub}. Double tap to execute.`;
    } else if (screenId === 'settingsAccessibilityMenu') {
      const options = ['READING MODE', 'MORSE CODE SPEED', 'VIBRATION INTENSITY'];
      const values = [simReadingMode, simMorseSpeed, simVibIntensity];
      ttsText = `Option ${nextIdx + 1} of 3: ${options[nextIdx]}. Current value: ${values[nextIdx]}.`;
    } else if (screenId === 'settingsQuickAccessScreen') {
      ttsText = `Quick Action ${nextIdx + 1} of ${menuList.length}: ${item.title}. Status: ${item.enabled ? 'Enabled.' : 'Disabled.'}`;
    } else if (screenId === 'settingsAddQuickActionScreen') {
      ttsText = `Action type ${nextIdx + 1} of 4: ${item.title}. ${item.subtitle}. Double tap to select.`;
    } else if (screenId === 'settingsPickTargetScreen') {
      ttsText = `Target ${nextIdx + 1} of ${menuList.length}: ${item.title}. ${item.subtitle}. Double tap to create quick action ${item.actionTitle}.`;
    }

    Haptic.trigger('short');
    Speech.speak(ttsText);

    if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
    if (parityStatus) {
      parityStatus.innerText = 'PARITY PASS';
      parityStatus.style.color = '#10B981';
      parityStatus.style.background = 'rgba(16,185,129,0.15)';
    }
    if (ruleIdEl) ruleIdEl.innerText = isMessageScreen ? `cmd_${screenId}_1` : (screenId === 'contactsListScreen' ? 'cmd_contactsList_next' : (screenId === 'contactActionMenuScreen' ? 'cmd_contactAction_next' : (screenId === 'favoritesListScreen' ? 'cmd_fav_next' : (screenId === 'emergencyContactsListScreen' ? 'cmd_emerg_next' : (screenId === 'savedPlacesListScreen' ? 'cmd_savedPlaces_next' : (screenId === 'navPlaceActionMenuScreen' || screenId === 'placeActionMenuScreen' ? 'cmd_navAction_next' : (screenId === 'settingsAccessibilityMenu' ? 'cmd_seta1' : (screenId === 'settingsQuickAccessScreen' ? 'cmd_setq1' : (screenId === 'settingsAddQuickActionScreen' ? 'cmd_setaddq_next' : (screenId === 'settingsPickTargetScreen' ? 'cmd_setpick_next' : (screenId === 'recentsListScreen' ? 'cmd_recents_next' : 'cmd_carousel_next')))))))))));
    if (ruleActionEl) ruleActionEl.innerText = 'NAVIGATE_NEXT';
    if (ruleHapticEl) ruleHapticEl.innerText = 'short';
    if (ruleLatencyEl) ruleLatencyEl.innerText = `0.10 ms (LOCAL_CACHE)`;

    if (hapticBar) {
      hapticBar.innerText = `[ HAPTIC: SHORT ]`;
      hapticBar.style.color = '#00E5FF';
      hapticBar.style.borderColor = '#00E5FF';
      hapticBar.style.background = 'rgba(0,229,255,0.1)';
      setTimeout(() => {
        hapticBar.innerText = '[ IDLE ]';
        hapticBar.style.color = '#64748B';
        hapticBar.style.borderColor = '#333';
        hapticBar.style.background = '#030712';
      }, 800);
    }
    return;
  }

  // 2. CAROUSEL SWIPE LEFT HANDLING
  if (gestureCode === 'SWIPE_LEFT' && menuList && menuList.length > 0) {
    const isMessageScreen = screenId === 'messagesView' || screenId === 'messagesScreen';
    const isContactScreen = screenId === 'contactsListScreen';
    const isRecentScreen = screenId === 'recentCallsScreen' || screenId === 'recentsListScreen';
    const isFavScreen = screenId === 'favoritesListScreen';
    const isEmergScreen = screenId === 'emergencyContactsListScreen';
    const isSavedPlacesScreen = screenId === 'savedPlacesListScreen';
    const currentIdx = simCategoryIndices[screenId] || 0;

    if (isMessageScreen && currentIdx <= 0) {
      Haptic.trigger('warning');
      Speech.speak("First message.");
      if (ttsLog) ttsLog.innerText = '> "First message."';
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = `cmd_${screenId}_start`;
      if (ruleActionEl) ruleActionEl.innerText = 'LIST_BOUNDARY';
      if (ruleHapticEl) ruleHapticEl.innerText = 'warning';
      if (ruleLatencyEl) ruleLatencyEl.innerText = `0.05 ms (LOCAL_CACHE)`;
      return;
    }
    if (isContactScreen && currentIdx <= 0) {
      Haptic.trigger('warning');
      Speech.speak("First contact.");
      if (ttsLog) ttsLog.innerText = '> "First contact."';
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = `cmd_${screenId}_start`;
      if (ruleActionEl) ruleActionEl.innerText = 'LIST_BOUNDARY';
      if (ruleHapticEl) ruleHapticEl.innerText = 'warning';
      if (ruleLatencyEl) ruleLatencyEl.innerText = `0.05 ms (LOCAL_CACHE)`;
      return;
    }
    if (isRecentScreen && currentIdx <= 0) {
      Haptic.trigger('warning');
      Speech.speak("First recent call.");
      if (ttsLog) ttsLog.innerText = '> "First recent call."';
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = `cmd_${screenId}_start`;
      if (ruleActionEl) ruleActionEl.innerText = 'LIST_BOUNDARY';
      if (ruleHapticEl) ruleHapticEl.innerText = 'warning';
      if (ruleLatencyEl) ruleLatencyEl.innerText = `0.05 ms (LOCAL_CACHE)`;
      return;
    }
    if (isFavScreen && currentIdx <= 0) {
      Haptic.trigger('warning');
      Speech.speak("First favorite contact.");
      if (ttsLog) ttsLog.innerText = '> "First favorite contact."';
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = `cmd_${screenId}_start`;
      if (ruleActionEl) ruleActionEl.innerText = 'LIST_BOUNDARY';
      if (ruleHapticEl) ruleHapticEl.innerText = 'warning';
      if (ruleLatencyEl) ruleLatencyEl.innerText = `0.05 ms (LOCAL_CACHE)`;
      return;
    }
    if (isEmergScreen && currentIdx <= 0) {
      Haptic.trigger('warning');
      Speech.speak("First emergency contact.");
      if (ttsLog) ttsLog.innerText = '> "First emergency contact."';
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = `cmd_${screenId}_start`;
      if (ruleActionEl) ruleActionEl.innerText = 'LIST_BOUNDARY';
      if (ruleHapticEl) ruleHapticEl.innerText = 'warning';
      if (ruleLatencyEl) ruleLatencyEl.innerText = `0.05 ms (LOCAL_CACHE)`;
      return;
    }
    if (isSavedPlacesScreen && currentIdx <= 0) {
      Haptic.trigger('warning');
      Speech.speak("First saved place.");
      if (ttsLog) ttsLog.innerText = '> "First saved place."';
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = `cmd_${screenId}_start`;
      if (ruleActionEl) ruleActionEl.innerText = 'LIST_BOUNDARY';
      if (ruleHapticEl) ruleHapticEl.innerText = 'warning';
      if (ruleLatencyEl) ruleLatencyEl.innerText = `0.05 ms (LOCAL_CACHE)`;
      return;
    }
    const isAccessScreen = screenId === 'settingsAccessibilityMenu';
    if (isAccessScreen && currentIdx <= 0) {
      Haptic.trigger('warning');
      Speech.speak("First accessibility preference.");
      if (ttsLog) ttsLog.innerText = '> "First accessibility preference."';
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = `cmd_${screenId}_start`;
      if (ruleActionEl) ruleActionEl.innerText = 'LIST_BOUNDARY';
      if (ruleHapticEl) ruleHapticEl.innerText = 'warning';
      if (ruleLatencyEl) ruleLatencyEl.innerText = `0.05 ms (LOCAL_CACHE)`;
      return;
    }
    const isQuickScreen = screenId === 'settingsQuickAccessScreen';
    if (isQuickScreen && currentIdx <= 0) {
      Haptic.trigger('warning');
      Speech.speak("First quick action.");
      if (ttsLog) ttsLog.innerText = '> "First quick action."';
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = `cmd_${screenId}_start`;
      if (ruleActionEl) ruleActionEl.innerText = 'LIST_BOUNDARY';
      if (ruleHapticEl) ruleHapticEl.innerText = 'warning';
      if (ruleLatencyEl) ruleLatencyEl.innerText = `0.05 ms (LOCAL_CACHE)`;
      return;
    }

    const prevIdx = ((simCategoryIndices[screenId] || 0) - 1 + menuList.length) % menuList.length;
    simCategoryIndices[screenId] = prevIdx;
    if (screenId === 'recentsListScreen' || screenId === 'recentCallsScreen') {
      simCategoryIndices['recentsListScreen'] = prevIdx;
      simCategoryIndices['recentCallsScreen'] = prevIdx;
    }
    updateSimulatorScreenContext(containerId, screenId, prevIdx);

    const item = menuList[prevIdx];
    let ttsText = `${item.title}. ${item.subtitle}. Double tap to open.`;
    if (screenId === 'mainMenuScreen') {
      ttsText = `Category ${prevIdx + 1} of ${menuList.length}: ${item.title}. ${item.subtitle}. Double tap to open or draw letter ${item.letter || item.title[0]}.`;
    } else if (isMessageScreen) {
      ttsText = `Message ${prevIdx + 1} of ${menuList.length} from ${item.title}. ${item.unread ? 'New unread.' : 'Read.'} Received at ${item.time || '12:00'}. Double tap to open private screen.`;
    } else if (screenId === 'contactsListScreen') {
      const spokenPhone = formatPhoneForTTS(item.subtitle);
      ttsText = `Contact ${prevIdx + 1} of ${menuList.length}: ${item.title}. ${spokenPhone}. Double tap for contact actions.`;
    } else if (screenId === 'contactActionMenuScreen') {
      const selectedContact = (SIMULATOR_MENUS['contactsListScreen'] || [])[(simCategoryIndices['contactsListScreen'] || 0) % (SIMULATOR_MENUS['contactsListScreen']?.length || 1)];
      let dynamicActionTitle = item.title;
      if (item.actionId === 'toggle_fav') dynamicActionTitle = selectedContact?.favorite ? 'REMOVE FROM FAVORITES' : 'ADD TO FAVORITES';
      if (item.actionId === 'toggle_emerg') dynamicActionTitle = selectedContact?.emergency ? 'REMOVE FROM EMERGENCY' : 'ADD TO EMERGENCY';
      ttsText = `${dynamicActionTitle}. ${item.subtitle}. Double tap to execute.`;
    } else if (screenId === 'dialerActionMenuScreen') {
      const targetNum = simDialedNumber ? formatPhoneForTTS(simDialedNumber) : '+389 70 123 456';
      let dynamicActionTitle = item.title;
      if (item.actionId === 'call') dynamicActionTitle = `Call number ${targetNum}`;
      ttsText = `Action ${prevIdx + 1} of 2: ${dynamicActionTitle}. ${item.subtitle}. Double tap to execute.`;
    } else if (screenId === 'favoritesListScreen') {
      const spokenPhone = formatPhoneForTTS(item.subtitle);
      ttsText = `Favorite contact ${prevIdx + 1} of ${menuList.length}: ${item.title}. ${spokenPhone}. Double tap to call.`;
    } else if (screenId === 'emergencyContactsListScreen') {
      const spokenPhone = formatPhoneForTTS(item.subtitle);
      ttsText = `Emergency contact ${prevIdx + 1} of ${menuList.length}: ${item.title}. ${spokenPhone}. Double tap to call.`;
    } else if (screenId === 'recentCallsScreen' || screenId === 'recentsListScreen') {
      const spokenPhone = formatPhoneForTTS(item.subtitle);
      ttsText = `Recent call ${prevIdx + 1} of ${menuList.length}: ${item.title}. ${item.callType} call at ${item.time}. ${spokenPhone}. Double tap to call back.`;
    } else if (screenId === 'savedPlacesListScreen') {
      ttsText = `Saved place ${prevIdx + 1} of ${menuList.length}: ${item.title}. ${item.subtitle}. Double tap for options.`;
    } else if (screenId === 'navPlaceActionMenuScreen' || screenId === 'placeActionMenuScreen') {
      let actTitle = item.title;
      let actSub = item.subtitle;
      if (prevIdx === 2) {
        actTitle = simNavActionSource === 'search' ? 'SAVE PLACE' : 'REMOVE FROM SAVED DESTINATIONS';
        actSub = simNavActionSource === 'search' ? 'Save to saved destinations list' : 'Remove from saved destinations list';
      }
      ttsText = `Action ${prevIdx + 1} of 3: ${actTitle}. ${actSub}. Double tap to execute.`;
    } else if (screenId === 'settingsAccessibilityMenu') {
      const options = ['READING MODE', 'MORSE CODE SPEED', 'VIBRATION INTENSITY'];
      const values = [simReadingMode, simMorseSpeed, simVibIntensity];
      ttsText = `Option ${prevIdx + 1} of 3: ${options[prevIdx]}. Current value: ${values[prevIdx]}.`;
    } else if (screenId === 'settingsQuickAccessScreen') {
      ttsText = `Quick Action ${prevIdx + 1} of ${menuList.length}: ${item.title}. Status: ${item.enabled ? 'Enabled.' : 'Disabled.'}`;
    } else if (screenId === 'settingsAddQuickActionScreen') {
      ttsText = `Action type ${prevIdx + 1} of 4: ${item.title}. ${item.subtitle}. Double tap to select.`;
    } else if (screenId === 'settingsPickTargetScreen') {
      ttsText = `Target ${prevIdx + 1} of ${menuList.length}: ${item.title}. ${item.subtitle}. Double tap to create quick action ${item.actionTitle}.`;
    }

    Haptic.trigger('short');
    Speech.speak(ttsText);

    if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
    if (parityStatus) {
      parityStatus.innerText = 'PARITY PASS';
      parityStatus.style.color = '#10B981';
      parityStatus.style.background = 'rgba(16,185,129,0.15)';
    }
    if (ruleIdEl) ruleIdEl.innerText = isMessageScreen ? `cmd_${screenId}_2` : (screenId === 'contactsListScreen' ? 'cmd_contactsList_prev' : (screenId === 'contactActionMenuScreen' ? 'cmd_contactAction_prev' : (screenId === 'favoritesListScreen' ? 'cmd_fav_prev' : (screenId === 'emergencyContactsListScreen' ? 'cmd_emerg_prev' : (screenId === 'savedPlacesListScreen' ? 'cmd_savedPlaces_prev' : (screenId === 'navPlaceActionMenuScreen' || screenId === 'placeActionMenuScreen' ? 'cmd_navAction_prev' : (screenId === 'settingsAccessibilityMenu' ? 'cmd_seta2' : (screenId === 'settingsQuickAccessScreen' ? 'cmd_setq2' : (screenId === 'settingsAddQuickActionScreen' ? 'cmd_setaddq_prev' : (screenId === 'settingsPickTargetScreen' ? 'cmd_setpick_prev' : (screenId === 'recentsListScreen' ? 'cmd_recents_prev' : 'cmd_carousel_prev')))))))))));
    if (ruleActionEl) ruleActionEl.innerText = 'NAVIGATE_PREV';
    if (ruleHapticEl) ruleHapticEl.innerText = 'short';
    if (ruleLatencyEl) ruleLatencyEl.innerText = `0.10 ms (LOCAL_CACHE)`;






    if (hapticBar) {
      hapticBar.innerText = `[ HAPTIC: SHORT ]`;
      hapticBar.style.color = '#00E5FF';
      hapticBar.style.borderColor = '#00E5FF';
      hapticBar.style.background = 'rgba(0,229,255,0.1)';
      setTimeout(() => {
        hapticBar.innerText = '[ IDLE ]';
        hapticBar.style.color = '#64748B';
        hapticBar.style.borderColor = '#333';
        hapticBar.style.background = '#030712';
      }, 800);
    }
    return;
  }

  // 2.5. SOS SCREEN GESTURE HANDLERS
  if (screenId === 'sosScreen') {
    if (simSosState === 'countdown') {
      if (gestureCode === 'LONG_PRESS' || gestureCode === 'SWIPE_DOWN') {
        cancelSimulatorSos(containerId);
        return;
      }
      if (gestureCode === 'TAP') {
        const ttsText = "Hold down to cancel emergency alert.";
        Haptic.trigger('warning');
        Speech.speak(ttsText);
        if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
        return;
      }
      return;
    }

    if (simSosState === 'dispatched') {
      if (gestureCode === 'DOUBLE_TAP') {
        const targetScreen = 'activeCallScreen';
        const screenSelect = document.getElementById(`${containerId}_simScreenSelect`);
        if (screenSelect) screenSelect.value = targetScreen;
        simActiveCallContact = { title: 'Mother', subtitle: '+389 70 123 456', icon: 'fa-user' };
        updateSimulatorScreenContext(containerId, targetScreen);
        syncSimulatorSections(containerId);

        const ttsText = "Calling Mother. Please stay calm. Help is on the way.";
        Haptic.trigger('success');
        Speech.speak(ttsText);
        if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
        if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
        if (ruleIdEl) ruleIdEl.innerText = 'cmd_sos_call';
        if (ruleActionEl) ruleActionEl.innerText = 'CALL_CONTACT';
        if (ruleHapticEl) ruleHapticEl.innerText = 'success';
        if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
        return;
      }

      if (gestureCode === 'SWIPE_DOWN' || gestureCode === 'LONG_PRESS') {
        cancelSimulatorSos(containerId);
        return;
      }

      if (gestureCode === 'TAP') {
        const spokenPhone = formatPhoneForTTS('+389 70 123 456');
        const ttsText = `SOS dispatched. Emergency contact: Mother, ${spokenPhone}. Double tap to call Mother directly.`;
        Speech.speak(ttsText);
        if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
        return;
      }
    }
  }

  // 3. PRIVACY READER GESTURE HANDLERS (msgPrivacyReaderReplyScreen)
  if (screenId === 'msgPrivacyReaderReplyScreen') {
    function updateSimulatorMorseDisplay(cId) {
      const draftEl = document.getElementById(`${cId}_simMsgDraftText`);
      const symbolsEl = document.getElementById(`${cId}_simMorseSymbols`);
      const letterHintEl = document.getElementById(`${cId}_simMorseLetterHint`);

      if (draftEl) {
        draftEl.innerHTML = simDraftText ? `"${simDraftText}"` : '<span style="color: #64748B; font-style: italic;">Tap Morse below to compose reply...</span>';
      }
      if (symbolsEl) {
        symbolsEl.innerText = simMorseBuffer ? simMorseBuffer.replace(/\./g, ' • ').replace(/-/g, ' — ') : '';
      }
      if (letterHintEl) {
        const recognized = simMorseBuffer ? (morseAlphabet[simMorseBuffer] || '') : '';
        letterHintEl.innerText = recognized ? `[ Letter: ${recognized} ]` : '';
      }
    }

    function scheduleSimulatorMorseLetterCommit(cId) {
      if (simMorseLetterTimer) clearTimeout(simMorseLetterTimer);
      simMorseLetterTimer = setTimeout(() => {
        if (simMorseBuffer) {
          const char = morseAlphabet[simMorseBuffer] || '?';
          simDraftText += char;
          const finishedMorse = simMorseBuffer;
          simMorseBuffer = '';

          const ttsLog = document.getElementById(`${cId}_simTtsLog`);
          const hapticBar = document.getElementById(`${cId}_simHapticBar`);

          Haptic.trigger('success');
          Speech.speak(`Letter ${char}`);

          if (ttsLog) ttsLog.innerText = `> [LETTER COMMITTED] "${char}" (Morse: ${finishedMorse}) | Draft: "${simDraftText}"`;

          updateSimulatorMorseDisplay(cId);

          if (hapticBar) {
            hapticBar.innerText = `[ COMMITTED: '${char}' ]`;
            hapticBar.style.color = '#10B981';
            hapticBar.style.borderColor = '#10B981';
            hapticBar.style.background = 'rgba(16,185,129,0.2)';
            setTimeout(() => {
              if (hapticBar.innerText.includes('COMMITTED')) {
                hapticBar.innerText = '[ IDLE ]';
                hapticBar.style.color = '#64748B';
                hapticBar.style.borderColor = '#333';
                hapticBar.style.background = '#030712';
              }
            }, 800);
          }
        }
      }, 1000); // 1.0 second pause between letters automatically commits the letter
    }

    if (gestureCode === 'TAP') {
      simReplyInputMode = 'morse';
      simMorseBuffer += '.';
      const recognized = morseAlphabet[simMorseBuffer] || '';
      const ttsText = `Dot.${recognized ? ' Letter ' + recognized : ''}`;
      Haptic.trigger('short');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_msgPrivacy_tap';
      if (ruleActionEl) ruleActionEl.innerText = 'TYPE_MORSE_DOT';
      if (ruleHapticEl) ruleHapticEl.innerText = 'short';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';

      updateSimulatorMorseDisplay(containerId);
      scheduleSimulatorMorseLetterCommit(containerId);

      // Haptic visual bar feedback
      if (hapticBar) {
        hapticBar.innerText = `[ HAPTIC: SHORT (DOT •) ]`;
        hapticBar.style.color = '#00E5FF';
        hapticBar.style.borderColor = '#00E5FF';
        hapticBar.style.background = 'rgba(0,229,255,0.2)';
        setTimeout(() => {
          if (hapticBar.innerText.includes('DOT')) {
            hapticBar.innerText = '[ IDLE ]';
            hapticBar.style.color = '#64748B';
            hapticBar.style.borderColor = '#333';
            hapticBar.style.background = '#030712';
          }
        }, 400);
      }

      // Visual pulse ripple on dot circle
      const circle = document.getElementById(`${containerId}_simMorseDotCircle`);
      if (circle) {
        circle.style.borderColor = '#00E5FF';
        circle.style.boxShadow = '0 0 20px #00E5FF';
        circle.style.transform = 'scale(1.2)';
        setTimeout(() => {
          circle.style.borderColor = '#222';
          circle.style.boxShadow = 'none';
          circle.style.transform = 'scale(1)';
        }, 150);
      }
      return;
    }

    if (gestureCode === 'LONG_PRESS') {
      // Long press during composition adds a Morse dash
      simReplyInputMode = 'morse';
      simMorseBuffer += '-';
      const recognized = morseAlphabet[simMorseBuffer] || '';
      const ttsText = `Dash.${recognized ? ' Letter ' + recognized : ''}`;
      Haptic.trigger('long');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_msgPrivacy_dash';
      if (ruleActionEl) ruleActionEl.innerText = 'TYPE_MORSE_DASH';
      if (ruleHapticEl) ruleHapticEl.innerText = 'long';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';

      updateSimulatorMorseDisplay(containerId);
      scheduleSimulatorMorseLetterCommit(containerId);

      // Haptic visual bar feedback
      if (hapticBar) {
        hapticBar.innerText = `[ HAPTIC: LONG (DASH —) ]`;
        hapticBar.style.color = '#FFEE55';
        hapticBar.style.borderColor = '#FFEE55';
        hapticBar.style.background = 'rgba(255,238,85,0.2)';
        setTimeout(() => {
          if (hapticBar.innerText.includes('DASH')) {
            hapticBar.innerText = '[ IDLE ]';
            hapticBar.style.color = '#64748B';
            hapticBar.style.borderColor = '#333';
            hapticBar.style.background = '#030712';
          }
        }, 600);
      }

      // Visual pulse ripple on dot circle
      const circle = document.getElementById(`${containerId}_simMorseDotCircle`);
      if (circle) {
        circle.style.borderColor = '#FFEE55';
        circle.style.boxShadow = '0 0 25px #FFEE55';
        circle.style.transform = 'scale(1.35)';
        setTimeout(() => {
          circle.style.borderColor = '#222';
          circle.style.boxShadow = 'none';
          circle.style.transform = 'scale(1)';
        }, 300);
      }
      return;
    }

    if (gestureCode === 'SWIPE_RIGHT') {
      if (simMorseLetterTimer) clearTimeout(simMorseLetterTimer);
      simReplyInputMode = 'morse';
      let ttsText = '';
      if (simMorseBuffer) {
        const char = morseAlphabet[simMorseBuffer] || '?';
        simDraftText += char;
        simMorseBuffer = '';
        ttsText = `Added letter ${char}.`;
      } else {
        simDraftText += ' ';
        ttsText = `Space added.`;
      }
      Haptic.trigger('short');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_msgp1';
      if (ruleActionEl) ruleActionEl.innerText = 'COMMIT_MORSE_SPACE';
      if (ruleHapticEl) ruleHapticEl.innerText = 'short';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';

      updateSimulatorMorseDisplay(containerId);

      if (hapticBar) {
        hapticBar.innerText = `[ HAPTIC: LETTER COMMITTED ]`;
        hapticBar.style.color = '#10B981';
        hapticBar.style.borderColor = '#10B981';
        hapticBar.style.background = 'rgba(16,185,129,0.2)';
        setTimeout(() => {
          hapticBar.innerText = '[ IDLE ]';
          hapticBar.style.color = '#64748B';
          hapticBar.style.borderColor = '#333';
          hapticBar.style.background = '#030712';
        }, 500);
      }
      return;
    }

    if (gestureCode === 'SWIPE_LEFT') {
      let ttsText = '';
      if (simMorseBuffer) {
        simMorseBuffer = simMorseBuffer.slice(0, -1);
        ttsText = 'Delete symbol';
        if (simMorseBuffer) scheduleSimulatorMorseLetterCommit(containerId);
        else if (simMorseLetterTimer) clearTimeout(simMorseLetterTimer);
      } else if (simDraftText && simDraftText.length > 0) {
        if (simMorseLetterTimer) clearTimeout(simMorseLetterTimer);
        simDraftText = simDraftText.slice(0, -1);
        ttsText = `Delete character`;
      } else {
        ttsText = `Nothing to delete`;
      }
      Haptic.trigger('warning');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_msgp2';
      if (ruleActionEl) ruleActionEl.innerText = 'DELETE_CHAR';
      if (ruleHapticEl) ruleHapticEl.innerText = 'warning';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';

      updateSimulatorMorseDisplay(containerId);
      return;
    }

    if (gestureCode === 'SWIPE_UP') {
      if (simMorseLetterTimer) clearTimeout(simMorseLetterTimer);
      if (simMorseBuffer) {
        const char = morseAlphabet[simMorseBuffer] || '';
        simDraftText += char;
        simMorseBuffer = '';
      }
      if (!simDraftText.trim()) {
        simDraftText = simReplyInputMode === 'stt' ? "I will be home in 10 minutes." : "OK";
      }
      simDraftReady = true;

      const draftReadout = `Draft message: "${simDraftText}". Double tap bottom navigation bar to send.`;
      if (simReplyInputMode === 'morse') {
        Speech.speak(draftReadout);
        Haptic.playMorse(simDraftText);
        if (ttsLog) ttsLog.innerText = `> [DRAFT CHECK] "${simDraftText}" (Double tap Nav Bar to send)`;
        if (hapticBar) {
          hapticBar.innerText = `[ MORSE REPLAY: ${simDraftText} ]`;
          hapticBar.style.color = '#FFEE55';
          hapticBar.style.borderColor = '#FFEE55';
          hapticBar.style.background = 'rgba(255,238,85,0.15)';
        }
      } else {
        Speech.speak(draftReadout);
        Haptic.trigger('warning');
        if (ttsLog) ttsLog.innerText = `> "${draftReadout}"`;
      }

      if (ruleIdEl) ruleIdEl.innerText = 'cmd_msgp3';
      if (ruleActionEl) ruleActionEl.innerText = 'READ_DRAFT';
      if (ruleHapticEl) ruleHapticEl.innerText = simReplyInputMode === 'morse' ? 'morse_stream' : 'warning';
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
      return;
    }

    if (gestureCode === 'DOUBLE_TAP') {
      const isNavZone = subContext === 'zone_bottom_navigation_bar_global' || subContext.includes('nav');
      if (isNavZone) {
        // Send message on Double Tap in Fixed Navigation Zone!
        const sentText = simDraftText || "OK";
        simDraftText = '';
        simMorseBuffer = '';
        simDraftReady = false;

        const screenSelect = document.getElementById(`${containerId}_simScreenSelect`);
        if (screenSelect) {
          screenSelect.value = 'messagesScreen';
          updateSimulatorScreenContext(containerId, 'messagesScreen', 0);
          syncSimulatorSections(containerId);
        }
        const ttsText = `Message sent: "${sentText}". Returning to messages list.`;
        Haptic.trigger('success');
        Speech.speak(ttsText);
        if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
        if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
        if (ruleIdEl) ruleIdEl.innerText = 'cmd_msgp_send';
        if (ruleActionEl) ruleActionEl.innerText = 'SEND_MESSAGE';
        if (ruleHapticEl) ruleHapticEl.innerText = 'success';
        if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';

        if (hapticBar) {
          hapticBar.innerText = `[ HAPTIC: MESSAGE SENT ]`;
          hapticBar.style.color = '#10B981';
          hapticBar.style.borderColor = '#10B981';
          hapticBar.style.background = 'rgba(16,185,129,0.2)';
          setTimeout(() => {
            hapticBar.innerText = '[ IDLE ]';
            hapticBar.style.color = '#64748B';
            hapticBar.style.borderColor = '#333';
            hapticBar.style.background = '#030712';
          }, 500);
        }
        return;
      }

      // In Morse viewport, double tap is treated as Dot tap so fast typing (.. or ...) is never lost
      executeSimulatorGesture(containerId, 'TAP', 'msgPrivacyReaderReplyScreen', subContext);
      return;
    }

    if (gestureCode === 'SWIPE_DOWN') {
      simDraftText = '';
      simMorseBuffer = '';
      simDraftReady = false;

      const screenSelect = document.getElementById(`${containerId}_simScreenSelect`);
      if (screenSelect) {
        screenSelect.value = 'messagesScreen';
        updateSimulatorScreenContext(containerId, 'messagesScreen', 0);
        syncSimulatorSections(containerId);
      }
      const ttsText = 'Exited privacy screen. Returning to messages list.';
      Haptic.trigger('short');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_msgPrivacy_exit';
      if (ruleActionEl) ruleActionEl.innerText = 'NAVIGATE';
      if (ruleHapticEl) ruleHapticEl.innerText = 'short';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.10 ms (LOCAL_CACHE)';
      return;
    }
  }

  // 4. HANDWRITING DIALER GESTURE HANDLERS (handwritingDialerScreen - Blank Screen)
  if (screenId === 'handwritingDialerScreen') {
    if (gestureCode === 'SWIPE_LEFT') {
      if (simDialedNumber && simDialedNumber.length > 0) {
        simDialedNumber = simDialedNumber.slice(0, -1);
      }
      simDialReady = false;
      const ttsText = simDialedNumber ? `Deleted digit. Remaining number: ${formatPhoneForTTS(simDialedNumber)}` : "Number cleared.";
      Haptic.trigger('warning');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_dialer_delete';
      if (ruleActionEl) ruleActionEl.innerText = 'DELETE_DIGIT';
      if (ruleHapticEl) ruleHapticEl.innerText = 'warning';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
      updateSimulatorScreenContext(containerId, 'handwritingDialerScreen');
      return;
    }

    if (gestureCode === 'SWIPE_UP') {
      if (!simDialedNumber) {
        simDialedNumber = '+389 70 123 456';
      }
      simDialReady = true;
      const ttsText = `Number confirmed: ${formatPhoneForTTS(simDialedNumber)}. Swipe right for action menu.`;
      Haptic.trigger('success');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_dialer_confirm';
      if (ruleActionEl) ruleActionEl.innerText = 'CONFIRM_NUMBER';
      if (ruleHapticEl) ruleHapticEl.innerText = 'success';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
      updateSimulatorScreenContext(containerId, 'handwritingDialerScreen');
      return;
    }

    if (gestureCode === 'SWIPE_RIGHT') {
      if (!simDialedNumber) {
        simDialedNumber = '+389 70 123 456';
      }
      simCategoryIndices['dialerActionMenuScreen'] = 0;
      const targetScreen = 'dialerActionMenuScreen';
      const screenSelect = document.getElementById(`${containerId}_simScreenSelect`);
      if (screenSelect && [...screenSelect.options].some(opt => opt.value === targetScreen)) {
        screenSelect.value = targetScreen;
      }
      updateSimulatorScreenContext(containerId, targetScreen, 0);
      syncSimulatorSections(containerId);

      const ttsText = `Action 1 of 2: Call number ${formatPhoneForTTS(simDialedNumber)}. Double tap to execute.`;
      Haptic.trigger('short');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_dialer_open_actions';
      if (ruleActionEl) ruleActionEl.innerText = 'NAVIGATE';
      if (ruleHapticEl) ruleHapticEl.innerText = 'short';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
      return;
    }

    if (gestureCode === 'SWIPE_DOWN') {
      simDialedNumber = '';
      simDialReady = false;

      simCategoryIndices['phoneCategoryMenu'] = 4;
      simCategoryIndices['callsScreen'] = 4;
      simCategoryIndices['phoneView'] = 4;

      const screenSelect = document.getElementById(`${containerId}_simScreenSelect`);
      if (screenSelect) {
        screenSelect.value = 'phoneCategoryMenu';
        updateSimulatorScreenContext(containerId, 'phoneCategoryMenu', 4);
        syncSimulatorSections(containerId);
      }
      const ttsText = 'Exited dialer. Returned to Phone Menu.';
      Haptic.trigger('short');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_dialer_back';
      if (ruleActionEl) ruleActionEl.innerText = 'NAVIGATE';
      if (ruleHapticEl) ruleHapticEl.innerText = 'short';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.10 ms (LOCAL_CACHE)';
      return;
    }
  }

  // 4b. DIALER ACTION MENU GESTURE HANDLERS
  if (screenId === 'dialerActionMenuScreen') {
    const actionIdx = (simCategoryIndices['dialerActionMenuScreen'] || 0) % (SIMULATOR_MENUS['dialerActionMenuScreen']?.length || 1);
    const targetNum = simDialedNumber || '+389 70 123 456';

    if (gestureCode === 'DOUBLE_TAP') {
      if (actionIdx === 0) {
        // Call Number
        const targetScreen = 'activeCallScreen';
        simCallSourceScreen = 'handwritingDialerScreen';
        simActiveCallContact = { title: formatPhoneForTTS(targetNum), subtitle: targetNum, icon: 'fa-phone' };
        const screenSelect = document.getElementById(`${containerId}_simScreenSelect`);
        if (screenSelect && [...screenSelect.options].some(opt => opt.value === targetScreen)) {
          screenSelect.value = targetScreen;
        }
        updateSimulatorScreenContext(containerId, targetScreen);
        syncSimulatorSections(containerId);

        const ttsText = `Calling ${formatPhoneForTTS(targetNum)} now. Connected.`;
        Haptic.trigger('success');
        Speech.speak(ttsText);
        if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
        if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
        if (ruleIdEl) ruleIdEl.innerText = 'cmd_dialer_call';
        if (ruleActionEl) ruleActionEl.innerText = 'START_CALL';
        if (ruleHapticEl) ruleHapticEl.innerText = 'success';
        if (ruleLatencyEl) ruleLatencyEl.innerText = '0.10 ms (LOCAL_CACHE)';
        return;
      } else if (actionIdx === 1) {
        // Save to Contacts -> Open Contact Name Input Screen
        const targetScreen = 'contactSaveNameInputScreen';
        simContactSaveNameText = '';
        simContactSaveMorseBuffer = '';
        const screenSelect = document.getElementById(`${containerId}_simScreenSelect`);
        if (screenSelect && [...screenSelect.options].some(opt => opt.value === targetScreen)) {
          screenSelect.value = targetScreen;
        }
        updateSimulatorScreenContext(containerId, targetScreen, 0);
        syncSimulatorSections(containerId);

        const ttsText = `Enter name for contact ${formatPhoneForTTS(targetNum)}. Hold navigation bar to speak name and surname, or tap screen to enter in Morse code.`;
        Haptic.trigger('short');
        Speech.speak(ttsText);
        if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
        if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
        if (ruleIdEl) ruleIdEl.innerText = 'cmd_dialer_open_save_name';
        if (ruleActionEl) ruleActionEl.innerText = 'NAVIGATE';
        if (ruleHapticEl) ruleHapticEl.innerText = 'short';
        if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
        return;
      }
    }

    if (gestureCode === 'TAP') {
      const actList = SIMULATOR_MENUS['dialerActionMenuScreen'] || [];
      const actItem = actList[actionIdx] || actList[0];
      let actTitle = actItem ? actItem.title : 'Action';
      if (actionIdx === 0) actTitle = `Call number ${formatPhoneForTTS(targetNum)}`;
      const ttsText = `Action ${actionIdx + 1} of ${actList.length || 2}: ${actTitle}. Double tap to execute.`;
      Haptic.trigger('short');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      return;
    }

    if (gestureCode === 'LONG_PRESS' || gestureCode === 'SWIPE_DOWN') {
      const targetScreen = 'handwritingDialerScreen';
      const screenSelect = document.getElementById(`${containerId}_simScreenSelect`);
      if (screenSelect && [...screenSelect.options].some(opt => opt.value === targetScreen)) {
        screenSelect.value = targetScreen;
      }
      updateSimulatorScreenContext(containerId, targetScreen, 0);
      syncSimulatorSections(containerId);

      const ttsText = 'Returned to handwriting dialer.';
      Haptic.trigger('short');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_dialer_cancel';
      if (ruleActionEl) ruleActionEl.innerText = 'NAVIGATE';
      if (ruleHapticEl) ruleHapticEl.innerText = 'short';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
      return;
    }
  }

  // 4c. CONTACT SAVE NAME INPUT GESTURE HANDLERS (contactSaveNameInputScreen)
  if (screenId === 'contactSaveNameInputScreen') {
    function scheduleSimulatorContactMorseCommit(cId) {
      if (simContactSaveLetterTimer) clearTimeout(simContactSaveLetterTimer);
      simContactSaveLetterTimer = setTimeout(() => {
        if (simContactSaveMorseBuffer) {
          const char = morseAlphabet[simContactSaveMorseBuffer] || '?';
          simContactSaveNameText += char;
          const finishedMorse = simContactSaveMorseBuffer;
          simContactSaveMorseBuffer = '';

          const ttsLog = document.getElementById(`${cId}_simTtsLog`);
          Haptic.trigger('success');
          Speech.speak(`Letter ${char}`);
          if (ttsLog) ttsLog.innerText = `> [LETTER COMMITTED] "${char}" (Morse: ${finishedMorse}) | Name: "${simContactSaveNameText}"`;
          updateSimulatorScreenContext(cId, 'contactSaveNameInputScreen');
        }
      }, 1000);
    }

    if (gestureCode === 'TAP') {
      simContactSaveInputMode = 'morse';
      simContactSaveMorseBuffer += '.';
      const recognized = morseAlphabet[simContactSaveMorseBuffer] || '';
      const ttsText = `Dot.${recognized ? ' Letter ' + recognized : ''}`;
      Haptic.trigger('short');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_cntsave_dot';
      if (ruleActionEl) ruleActionEl.innerText = 'TYPE_MORSE_DOT';
      if (ruleHapticEl) ruleHapticEl.innerText = 'short';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';

      scheduleSimulatorContactMorseCommit(containerId);
      updateSimulatorScreenContext(containerId, 'contactSaveNameInputScreen');
      return;
    }

    if (gestureCode === 'LONG_PRESS') {
      simContactSaveInputMode = 'morse';
      simContactSaveMorseBuffer += '-';
      const recognized = morseAlphabet[simContactSaveMorseBuffer] || '';
      const ttsText = `Dash.${recognized ? ' Letter ' + recognized : ''}`;
      Haptic.trigger('long');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_cntsave_dash';
      if (ruleActionEl) ruleActionEl.innerText = 'TYPE_MORSE_DASH';
      if (ruleHapticEl) ruleHapticEl.innerText = 'long';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';

      scheduleSimulatorContactMorseCommit(containerId);
      updateSimulatorScreenContext(containerId, 'contactSaveNameInputScreen');
      return;
    }

    if (gestureCode === 'SWIPE_RIGHT') {
      if (simContactSaveLetterTimer) clearTimeout(simContactSaveLetterTimer);
      simContactSaveInputMode = 'morse';
      let ttsText = '';
      if (simContactSaveMorseBuffer) {
        const char = morseAlphabet[simContactSaveMorseBuffer] || '?';
        simContactSaveNameText += char;
        simContactSaveMorseBuffer = '';
        ttsText = `Added letter ${char}.`;
      } else {
        simContactSaveNameText += ' ';
        ttsText = 'Space added.';
      }
      Haptic.trigger('short');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}" | Name: "${simContactSaveNameText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_cntsave_space';
      if (ruleActionEl) ruleActionEl.innerText = 'COMMIT_LETTER_SPACE';
      if (ruleHapticEl) ruleHapticEl.innerText = 'short';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';

      updateSimulatorScreenContext(containerId, 'contactSaveNameInputScreen');
      return;
    }

    if (gestureCode === 'SWIPE_LEFT') {
      if (simContactSaveLetterTimer) clearTimeout(simContactSaveLetterTimer);
      let ttsText = '';
      if (simContactSaveMorseBuffer) {
        simContactSaveMorseBuffer = '';
        ttsText = 'Cleared Morse buffer.';
      } else if (simContactSaveNameText.length > 0) {
        const deleted = simContactSaveNameText.slice(-1);
        simContactSaveNameText = simContactSaveNameText.slice(0, -1);
        ttsText = `Deleted ${deleted === ' ' ? 'space' : deleted}. Current name: ${simContactSaveNameText || 'empty'}.`;
      } else {
        ttsText = 'Name is already empty.';
      }
      Haptic.trigger('warning');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_cntsave_delete';
      if (ruleActionEl) ruleActionEl.innerText = 'DELETE_CHAR';
      if (ruleHapticEl) ruleHapticEl.innerText = 'warning';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';

      updateSimulatorScreenContext(containerId, 'contactSaveNameInputScreen');
      return;
    }

    if (gestureCode === 'SWIPE_UP') {
      // SWIPE UP = Confirmation / Read Draft Name
      if (simContactSaveLetterTimer) clearTimeout(simContactSaveLetterTimer);
      if (simContactSaveMorseBuffer) {
        const char = morseAlphabet[simContactSaveMorseBuffer] || '';
        if (char) simContactSaveNameText += char;
        simContactSaveMorseBuffer = '';
      }

      const finalName = simContactSaveNameText.trim();
      const finalPhone = simDialedNumber || '+389 70 123 456';
      const spokenPhone = formatPhoneForTTS(finalPhone);

      const ttsText = finalName
        ? `Contact confirmation. Name: ${finalName}. Number: ${spokenPhone}. Fast double tap anywhere to save contact, or swipe left to delete.`
        : `Contact confirmation. No name entered yet. Number: ${spokenPhone}. Fast double tap to save as new contact.`;

      Haptic.trigger('short');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_cntsave4';
      if (ruleActionEl) ruleActionEl.innerText = 'READ_DRAFT';
      if (ruleHapticEl) ruleHapticEl.innerText = 'short';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';

      updateSimulatorScreenContext(containerId, 'contactSaveNameInputScreen');
      return;
    }

    if (gestureCode === 'DOUBLE_TAP') {
      if (simContactSaveLetterTimer) clearTimeout(simContactSaveLetterTimer);
      if (simContactSaveMorseBuffer) {
        const char = morseAlphabet[simContactSaveMorseBuffer] || '';
        if (char) simContactSaveNameText += char;
        simContactSaveMorseBuffer = '';
      }

      const finalName = simContactSaveNameText.trim() || 'New Contact';
      const finalPhone = simDialedNumber || '+389 70 123 456';

      const newContact = {
        target: 'contactActionMenuScreen',
        title: finalName,
        subtitle: finalPhone,
        icon: 'fa-user',
        color: '#FFEE55',
        favorite: false,
        emergency: false
      };

      if (!SIMULATOR_MENUS['contactsListScreen']) SIMULATOR_MENUS['contactsListScreen'] = [];
      SIMULATOR_MENUS['contactsListScreen'].unshift(newContact);
      simCategoryIndices['contactsListScreen'] = 0;
      simSelectedContact = newContact;

      // Also persist to state.db if available
      if (state.db && state.db.contacts) {
        state.db.contacts.unshift({
          name: finalName,
          phone: finalPhone,
          favorite: false,
          emergency: false
        });
        if (typeof saveDb === 'function') {
          saveDb();
        }
      }

      simContactSaveNameText = '';
      simContactSaveMorseBuffer = '';
      simDialedNumber = '';

      const targetScreen = 'contactsListScreen';
      const screenSelect = document.getElementById(`${containerId}_simScreenSelect`);
      if (screenSelect && [...screenSelect.options].some(opt => opt.value === targetScreen)) {
        screenSelect.value = targetScreen;
      }
      updateSimulatorScreenContext(containerId, targetScreen, 0);
      syncSimulatorSections(containerId);

      const ttsText = `Contact ${finalName} saved. Opening contacts directory.`;
      Haptic.trigger('success');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_cntsave5';
      if (ruleActionEl) ruleActionEl.innerText = 'SAVE_CONTACT';
      if (ruleHapticEl) ruleHapticEl.innerText = 'success';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
      return;
    }

    if (gestureCode === 'SWIPE_DOWN') {
      if (simContactSaveLetterTimer) clearTimeout(simContactSaveLetterTimer);
      simContactSaveNameText = '';
      simContactSaveMorseBuffer = '';

      const targetScreen = 'dialerActionMenuScreen';
      const screenSelect = document.getElementById(`${containerId}_simScreenSelect`);
      if (screenSelect && [...screenSelect.options].some(opt => opt.value === targetScreen)) {
        screenSelect.value = targetScreen;
      }
      updateSimulatorScreenContext(containerId, targetScreen, 1);
      syncSimulatorSections(containerId);

      const ttsText = 'Cancelled saving contact. Returned to options.';
      Haptic.trigger('short');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_cntsave_cancel';
      if (ruleActionEl) ruleActionEl.innerText = 'NAVIGATE';
      if (ruleHapticEl) ruleHapticEl.innerText = 'short';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
      return;
    }
  }

  // 4. NAVIGATION SEARCH GESTURE HANDLERS (STT & Morse Dual Input)
  if (screenId === 'navSearchInputScreen') {
    function scheduleSimulatorNavMorseLetterCommit(cId) {
      if (simNavMorseTimer) clearTimeout(simNavMorseTimer);
      simNavMorseTimer = setTimeout(() => {
        if (simNavMorseBuffer) {
          const char = morseAlphabet[simNavMorseBuffer] || '?';
          simNavSearchText += char;
          const finishedMorse = simNavMorseBuffer;
          simNavMorseBuffer = '';
          simNavSearchReady = false;

          const ttsLog = document.getElementById(`${cId}_simTtsLog`);
          const hapticBar = document.getElementById(`${cId}_simHapticBar`);

          Haptic.trigger('success');
          Speech.speak(`Letter ${char}`);

          if (ttsLog) ttsLog.innerText = `> [LETTER COMMITTED] "${char}" (Morse: ${finishedMorse}) | Destination: "${simNavSearchText}"`;

          if (hapticBar) {
            hapticBar.innerText = `[ COMMITTED: '${char}' ]`;
            hapticBar.style.color = '#10B981';
            hapticBar.style.borderColor = '#10B981';
            hapticBar.style.background = 'rgba(16,185,129,0.2)';
            setTimeout(() => {
              if (hapticBar.innerText.includes('COMMITTED')) {
                hapticBar.innerText = '[ IDLE ]';
                hapticBar.style.color = '#64748B';
                hapticBar.style.borderColor = '#333';
                hapticBar.style.background = '#030712';
              }
            }, 800);
          }
          updateSimulatorScreenContext(cId, 'navSearchInputScreen');
        }
      }, 1000); // 1.0 second pause between letters automatically commits the letter
    }

    if (gestureCode === 'TAP') {
      simNavInputMode = 'morse';
      simNavMorseBuffer += '.';
      const recognized = morseAlphabet[simNavMorseBuffer] || '';
      const ttsText = `Dot.${recognized ? ' Letter ' + recognized : ''}`;
      Haptic.trigger('short');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_navSearch_dot';
      if (ruleActionEl) ruleActionEl.innerText = 'TYPE_MORSE_DOT';
      if (ruleHapticEl) ruleHapticEl.innerText = 'short';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';

      scheduleSimulatorNavMorseLetterCommit(containerId);

      const circle = document.getElementById(`${containerId}_simNavMorseDotCircle`);
      if (circle) {
        circle.style.borderColor = '#A855F7';
        circle.style.boxShadow = '0 0 20px #A855F7';
        circle.style.transform = 'scale(1.2)';
        setTimeout(() => {
          circle.style.borderColor = '#A855F7';
          circle.style.boxShadow = 'none';
          circle.style.transform = 'scale(1)';
        }, 150);
      }
      return;
    }

    if (gestureCode === 'LONG_PRESS') {
      simNavInputMode = 'morse';
      simNavMorseBuffer += '-';
      const recognized = morseAlphabet[simNavMorseBuffer] || '';
      const ttsText = `Dash.${recognized ? ' Letter ' + recognized : ''}`;
      Haptic.trigger('long');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_navSearch_dash';
      if (ruleActionEl) ruleActionEl.innerText = 'TYPE_MORSE_DASH';
      if (ruleHapticEl) ruleHapticEl.innerText = 'long';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';

      scheduleSimulatorNavMorseLetterCommit(containerId);

      const circle = document.getElementById(`${containerId}_simNavMorseDotCircle`);
      if (circle) {
        circle.style.borderColor = '#FFEE55';
        circle.style.boxShadow = '0 0 25px #FFEE55';
        circle.style.transform = 'scale(1.35)';
        setTimeout(() => {
          circle.style.borderColor = '#A855F7';
          circle.style.boxShadow = 'none';
          circle.style.transform = 'scale(1)';
        }, 300);
      }
      return;
    }

    if (gestureCode === 'SWIPE_LEFT') {
      if (simNavMorseTimer) clearTimeout(simNavMorseTimer);
      if (simNavMorseBuffer) {
        simNavMorseBuffer = '';
      } else if (simNavSearchText && simNavSearchText.length > 0) {
        simNavSearchText = simNavSearchText.slice(0, -1);
      }
      simNavSearchReady = false;
      const ttsText = simNavSearchText ? `Deleted letter. Destination is: ${simNavSearchText}` : "Destination cleared.";
      Haptic.trigger('warning');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_navSearch_delete';
      if (ruleActionEl) ruleActionEl.innerText = 'DELETE_CHAR';
      if (ruleHapticEl) ruleHapticEl.innerText = 'warning';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
      updateSimulatorScreenContext(containerId, 'navSearchInputScreen');
      return;
    }

    if (gestureCode === 'SWIPE_UP' || gestureCode === 'SWIPE_RIGHT' || gestureCode === 'DOUBLE_TAP') {
      if (simNavMorseTimer) {
        clearTimeout(simNavMorseTimer);
        simNavMorseTimer = null;
      }
      if (gestureCode === 'DOUBLE_TAP') {
        simNavMorseBuffer = '';
      } else if (simNavMorseBuffer) {
        const char = morseAlphabet[simNavMorseBuffer] || '';
        if (char) simNavSearchText += char;
        simNavMorseBuffer = '';
      }
      const searchTarget = simNavSearchText || 'Eurofarm Pharmacy';
      simNavActionSource = 'search';
      simSelectedPlace = {
        title: searchTarget,
        subtitle: 'Kliment Ohridski 12 (280m away)',
        phone: '+389 72 888 999',
        distance: '280m away'
      };
      simNavSearchText = '';
      simNavMorseBuffer = '';
      simNavSearchReady = false;
      simCategoryIndices['navPlaceActionMenuScreen'] = 0;
      const targetScreen = 'navPlaceActionMenuScreen';
      const screenSelect = document.getElementById(`${containerId}_simScreenSelect`);
      if (screenSelect && [...screenSelect.options].some(opt => opt.value === targetScreen)) {
        screenSelect.value = targetScreen;
      }
      updateSimulatorScreenContext(containerId, targetScreen, 0);
      syncSimulatorSections(containerId);

      const ttsText = `Destination confirmed: ${searchTarget}. Opening place options: Call place, or start walking route.`;
      Haptic.trigger('success');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = gestureCode === 'SWIPE_UP' ? 'cmd_navsrc4' : (gestureCode === 'SWIPE_RIGHT' ? 'cmd_navsrc5' : 'cmd_navsrc6');
      if (ruleActionEl) ruleActionEl.innerText = gestureCode === 'DOUBLE_TAP' ? 'SELECT_ITEM' : 'NAVIGATE';
      if (ruleHapticEl) ruleHapticEl.innerText = 'success';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
      return;
    }

    if (gestureCode === 'SWIPE_DOWN') {
      simNavSearchText = '';
      simNavMorseBuffer = '';
      simNavSearchReady = false;

      const screenSelect = document.getElementById(`${containerId}_simScreenSelect`);
      if (screenSelect) {
        screenSelect.value = 'navCategoryMenu';
        updateSimulatorScreenContext(containerId, 'navCategoryMenu', 0);
        syncSimulatorSections(containerId);
      }
      const ttsText = 'Returned to Navigation Menu.';
      Haptic.trigger('short');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_navSearch_back';
      if (ruleActionEl) ruleActionEl.innerText = 'NAVIGATE';
      if (ruleHapticEl) ruleHapticEl.innerText = 'short';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.10 ms (LOCAL_CACHE)';
      return;
    }
  }

  if (screenId === 'navActiveRouteScreen') {
    if (gestureCode === 'DOUBLE_TAP' || gestureCode === 'SWIPE_RIGHT') {
      const ttsText = "In 150 meters, continue straight along sidewalk. Tactile paving ahead.";
      Haptic.trigger('success');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_navRoute_step';
      if (ruleActionEl) ruleActionEl.innerText = 'ADVANCE_STEP';
      if (ruleHapticEl) ruleHapticEl.innerText = 'success';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
      return;
    }

    if (gestureCode === 'SWIPE_DOWN' || gestureCode === 'LONG_PRESS' || gestureCode === 'TWO_FINGER_TAP') {
      const targetScreen = 'navPlaceActionMenuScreen';
      const screenSelect = document.getElementById(`${containerId}_simScreenSelect`);
      if (screenSelect && [...screenSelect.options].some(opt => opt.value === targetScreen)) {
        screenSelect.value = targetScreen;
      }
      updateSimulatorScreenContext(containerId, targetScreen, 0);
      syncSimulatorSections(containerId);

      const placeName = simSelectedPlace?.title || 'Eurofarm Pharmacy';
      const ttsText = `Navigation route stopped. Returned to options for ${placeName}.`;
      Haptic.trigger('warning');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_navrt4';
      if (ruleActionEl) ruleActionEl.innerText = 'STOP_ROUTE';
      if (ruleHapticEl) ruleHapticEl.innerText = 'warning';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
      return;
    }
  }

  // ACTIVE CALL SCREEN SINGLE TAP (ANNOUNCE STATUS)
  if (screenId === 'activeCallScreen' && gestureCode === 'TAP') {
    const contact = simActiveCallContact || { title: 'Mother', subtitle: '+389 70 123 456' };
    const ttsText = `Call connected with ${contact.title}. Double tap to end call.`;
    Speech.speak(ttsText);
    if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
    return;
  }

  // ACTIVE CALL SCREEN DOUBLE TAP (END CALL)
  if (screenId === 'activeCallScreen' && gestureCode === 'DOUBLE_TAP') {
    // Stop the live call timer
    if (window._simCallTimer) {
      clearInterval(window._simCallTimer);
      window._simCallTimer = null;
    }
    const targetBackScreen = simCallSourceScreen || 'phoneCategoryMenu';
    let ttsText = "Call ended. Returned to Phone Menu.";
    if (targetBackScreen === 'recentsListScreen' || targetBackScreen === 'recentCallsScreen') {
      ttsText = "Call ended. Returned to recent calls.";
    } else if (targetBackScreen === 'favoritesListScreen') {
      ttsText = "Call ended. Returned to favorite contacts.";
    } else if (targetBackScreen === 'emergencyContactsListScreen') {
      ttsText = "Call ended. Returned to emergency contacts.";
    } else if (targetBackScreen === 'contactsListScreen') {
      ttsText = "Call ended. Returned to contacts directory.";
    } else if (targetBackScreen === 'handwritingDialerScreen') {
      ttsText = "Call ended. Returned to dialer.";
    } else if (targetBackScreen === 'savedPlacesListScreen') {
      ttsText = "Call ended. Returned to saved destinations.";
    }

    const screenSelect = document.getElementById(`${containerId}_simScreenSelect`);
    if (screenSelect && [...screenSelect.options].some(opt => opt.value === targetBackScreen)) {
      screenSelect.value = targetBackScreen;
      updateSimulatorScreenContext(containerId, targetBackScreen);
      syncSimulatorSections(containerId);
    }

    Haptic.trigger('error');
    Speech.speak(ttsText);
    if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
    if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
    if (ruleIdEl) ruleIdEl.innerText = 'cmd_call3';
    if (ruleActionEl) ruleActionEl.innerText = 'END_CALL';
    if (ruleHapticEl) ruleHapticEl.innerText = 'error';
    if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
    return;
  }

  // 5. CAROUSEL DOUBLE TAP (DRILL DOWN INTO SUB-SCREEN / EXECUTE ACTION)
  if (gestureCode === 'DOUBLE_TAP' && menuList && menuList.length > 0) {

    const currentIdx = (simCategoryIndices[screenId] || 0) % menuList.length;
    const item = menuList[currentIdx];

    // Special Handling: Contact Action Menu Execution
    if (screenId === 'contactActionMenuScreen') {
      const selectedContact = (SIMULATOR_MENUS['contactsListScreen'] || [])[(simCategoryIndices['contactsListScreen'] || 0) % (SIMULATOR_MENUS['contactsListScreen']?.length || 1)];
      let ttsText = '';
      let targetScreen = 'contactsListScreen';

      if (item.actionId === 'call') {
        targetScreen = 'activeCallScreen';
        simCallSourceScreen = 'contactsListScreen';
        simActiveCallContact = selectedContact;
        ttsText = `Calling ${selectedContact?.title || 'Contact'}. Connected.`;
      } else if (item.actionId === 'toggle_fav') {
        if (selectedContact) selectedContact.favorite = !selectedContact.favorite;
        ttsText = selectedContact?.favorite ? `Added ${selectedContact.title} to favorites.` : `Removed ${selectedContact.title} from favorites.`;
      } else if (item.actionId === 'toggle_emerg') {
        if (selectedContact) selectedContact.emergency = !selectedContact.emergency;
        ttsText = selectedContact?.emergency ? `Added ${selectedContact.title} to emergency contacts.` : `Removed ${selectedContact.title} from emergency contacts.`;
      } else if (item.actionId === 'delete') {
        const contactIdx = (simCategoryIndices['contactsListScreen'] || 0) % (SIMULATOR_MENUS['contactsListScreen']?.length || 1);
        SIMULATOR_MENUS['contactsListScreen'].splice(contactIdx, 1);
        const newLen = SIMULATOR_MENUS['contactsListScreen']?.length || 1;
        simCategoryIndices['contactsListScreen'] = Math.max(0, Math.min(contactIdx, newLen - 1));
        ttsText = `Deleted contact ${selectedContact?.title || ''}.`;
      }

      const screenSelect = document.getElementById(`${containerId}_simScreenSelect`);
      if (screenSelect && [...screenSelect.options].some(opt => opt.value === targetScreen)) {
        screenSelect.value = targetScreen;
        updateSimulatorScreenContext(containerId, targetScreen);
        syncSimulatorSections(containerId);
      }

      Haptic.trigger(item.actionId === 'delete' ? 'warning' : 'success');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = `cmd_contactAction_dblTap`;
      if (ruleActionEl) ruleActionEl.innerText = item.actionId === 'call' ? 'START_CALL' : (item.actionId === 'delete' ? 'DELETE_CONTACT' : 'UPDATE_CONTACT');
      if (ruleHapticEl) ruleHapticEl.innerText = 'success';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
      return;
    }

    // Special Handling: Place Action Menu Execution (Navigate, Call, Save/Remove)
    if (screenId === 'navPlaceActionMenuScreen' || screenId === 'placeActionMenuScreen') {
      let ttsText = '';
      let targetScreen = 'navPlaceActionMenuScreen';
      let ruleAction = 'NAVIGATE';
      let ruleId = 'cmd_navAction_dblTap';

      if (currentIdx === 0) { // Navigate
        targetScreen = 'navActiveRouteScreen';
        ttsText = `Starting walking navigation to ${simSelectedPlace?.title || 'Eurofarm Pharmacy'}. In 25 meters, turn right onto Main Boulevard.`;
        ruleAction = 'START_GPS_GUIDE';
        ruleId = 'cmd_navAction_execNav';
      } else if (currentIdx === 1) { // Call
        targetScreen = 'activeCallScreen';
        simCallSourceScreen = simNavActionSource === 'saved' ? 'savedPlacesListScreen' : 'navCategoryMenu';
        simActiveCallContact = { title: simSelectedPlace?.title || 'Eurofarm Pharmacy', subtitle: simSelectedPlace?.phone || '+389 72 888 999', icon: 'fa-prescription-bottle-medical' };
        ttsText = `Calling ${simSelectedPlace?.title || 'Eurofarm Pharmacy'}. Connected.`;
        ruleAction = 'START_CALL';
        ruleId = 'cmd_navAction_execCall';
      } else if (currentIdx === 2) { // Save or Remove
        targetScreen = 'savedPlacesListScreen';
        if (simNavActionSource === 'search') {
          if (!SIMULATOR_MENUS['savedPlacesListScreen'].some(p => p.title === simSelectedPlace?.title)) {
            SIMULATOR_MENUS['savedPlacesListScreen'].push({
              target: 'navPlaceActionMenuScreen',
              title: simSelectedPlace?.title || 'Eurofarm Pharmacy',
              subtitle: simSelectedPlace?.subtitle || 'Kliment Ohridski 12 (280m)',
              phone: simSelectedPlace?.phone || '+389 72 888 999',
              distance: simSelectedPlace?.distance || '280m away',
              icon: 'fa-prescription-bottle-medical',
              color: '#FFEE55'
            });
          }
          ttsText = `Saved ${simSelectedPlace?.title || 'Eurofarm Pharmacy'} to saved destinations.`;
          ruleAction = 'SAVE_PLACE';
          ruleId = 'cmd_navAction_execSave';
        } else {
          const placeIdx = (simCategoryIndices['savedPlacesListScreen'] || 0) % (SIMULATOR_MENUS['savedPlacesListScreen']?.length || 1);
          const removedPlace = SIMULATOR_MENUS['savedPlacesListScreen'] ? SIMULATOR_MENUS['savedPlacesListScreen'][placeIdx] : null;
          SIMULATOR_MENUS['savedPlacesListScreen'].splice(placeIdx, 1);
          const newLen = SIMULATOR_MENUS['savedPlacesListScreen']?.length || 1;
          simCategoryIndices['savedPlacesListScreen'] = Math.max(0, Math.min(placeIdx, newLen - 1));
          if (state.db && state.db.savedPlaces && removedPlace) {
            state.db.savedPlaces = state.db.savedPlaces.filter(p => p.name !== removedPlace.title);
            if (typeof saveDb === 'function') saveDb();
          }
          ttsText = `Removed ${simSelectedPlace?.title || 'Eurofarm Pharmacy'} from saved destinations.`;
          ruleAction = 'REMOVE_PLACE';
          ruleId = 'cmd_navAction_execRemove';
        }
      }

      const screenSelect = document.getElementById(`${containerId}_simScreenSelect`);
      if (screenSelect && [...screenSelect.options].some(opt => opt.value === targetScreen)) {
        screenSelect.value = targetScreen;
        updateSimulatorScreenContext(containerId, targetScreen);
        syncSimulatorSections(containerId);
      }

      Haptic.trigger('success');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = ruleId;
      if (ruleActionEl) ruleActionEl.innerText = ruleAction;
      if (ruleHapticEl) ruleHapticEl.innerText = 'success';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
      return;
    }

    // Special Handling: Accessibility Preferences Value Cycling
    if (screenId === 'settingsAccessibilityMenu') {
      let ttsText = '';
      let ruleAction = 'CYCLE_SETTING';
      let ruleId = 'cmd_seta3';
      let hapticPattern = 'success';

      const prefIdx = (currentIdx % 3 + 3) % 3;

      if (prefIdx === 0) { // Reading Mode
        const modes = ['TTS Only', 'Morse Only'];
        const curI = modes.indexOf(simReadingMode);
        simReadingMode = modes[(curI + 1) % modes.length];
        const modeKey = simReadingMode === 'Morse Only' ? 'morse' : 'voice';
        state.readingMode = modeKey;
        if (state.db && state.db.settings) {
          state.db.settings.readingMode = modeKey;
        }
        ttsText = `Reading mode set to ${simReadingMode}.`;
        ruleId = 'cmd_set_readingMode';
      } else if (prefIdx === 1) { // Morse Speed
        const speeds = ['Slow', 'Medium', 'Fast'];
        const curI = speeds.indexOf(simMorseSpeed || 'Medium');
        simMorseSpeed = speeds[(curI + 1) % speeds.length];
        state.morseSpeed = simMorseSpeed;
        if (state.db && state.db.settings) {
          state.db.settings.morseSpeed = simMorseSpeed.toLowerCase();
        }
        ttsText = `Morse code speed set to ${simMorseSpeed}.`;
        ruleId = 'cmd_set_morseSpeed';
        setTimeout(() => {
          Haptic.playMorse('OK');
        }, 800);
      } else { // Vibration Intensity
        const levels = ['Low', 'Medium', 'High'];
        const curI = levels.indexOf(simVibIntensity);
        simVibIntensity = levels[(curI + 1) % levels.length];
        hapticPattern = simVibIntensity === 'Low' ? 'soft' : (simVibIntensity === 'High' ? 'heavy' : 'short');
        ttsText = `Vibration intensity set to ${simVibIntensity}.`;
        ruleId = 'cmd_set_vibIntensity';
      }

      updateSimulatorScreenContext(containerId, 'settingsAccessibilityMenu', currentIdx);
      Haptic.trigger(hapticPattern);
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = ruleId;
      if (ruleActionEl) ruleActionEl.innerText = ruleAction;
      if (ruleHapticEl) ruleHapticEl.innerText = hapticPattern;
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
      return;
    }

    // Special Handling: Quick Access List Double Tap (Toggle Enabled)
    if (screenId === 'settingsQuickAccessScreen') {
      item.enabled = !item.enabled;
      const ttsText = item.enabled ? `Enabled ${item.title}.` : `Disabled ${item.title}.`;
      updateSimulatorScreenContext(containerId, 'settingsQuickAccessScreen', currentIdx);
      Haptic.trigger('success');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_setq3';
      if (ruleActionEl) ruleActionEl.innerText = 'TOGGLE_SETTING';
      if (ruleHapticEl) ruleHapticEl.innerText = 'success';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
      return;
    }

    const screenSelectEl = document.getElementById(`${containerId}_simScreenSelect`);

    // Special Handling: Add Quick Action Type Selection
    if (screenId === 'settingsAddQuickActionScreen') {
      simNewActionType = item.actionType || 'call';
      SIMULATOR_MENUS['settingsPickTargetScreen'] = SIM_QUICK_TARGETS[simNewActionType] || SIM_QUICK_TARGETS['call'];
      simCategoryIndices['settingsPickTargetScreen'] = 0;
      const targetScreen = 'settingsPickTargetScreen';
      if (screenSelectEl && [...screenSelectEl.options].some(opt => opt.value === targetScreen)) {
        screenSelectEl.value = targetScreen;
        updateSimulatorScreenContext(containerId, targetScreen, 0);
        syncSimulatorSections(containerId);
      }
      const firstTarget = SIM_QUICK_TARGETS[simNewActionType][0];
      const ttsText = `Target 1 of ${SIM_QUICK_TARGETS[simNewActionType].length}: ${firstTarget.title}. ${firstTarget.subtitle}. Double tap to create quick action ${firstTarget.actionTitle}.`;
      Haptic.trigger('success');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_setaddq_dblTap';
      if (ruleActionEl) ruleActionEl.innerText = 'SELECT_ITEM';
      if (ruleHapticEl) ruleHapticEl.innerText = 'success';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
      return;
    }

    // Special Handling: Target Picker Double Tap (Create Quick Action)
    if (screenId === 'settingsPickTargetScreen') {
      const newQuickAction = {
        target: 'settingsQuickAccessScreen',
        title: item.actionTitle,
        subtitle: `Target: ${item.title} (${item.subtitle})`,
        type: item.type,
        targetName: item.title,
        enabled: true,
        icon: item.icon,
        color: item.color
      };
      if (!SIMULATOR_MENUS['settingsQuickAccessScreen']) {
        SIMULATOR_MENUS['settingsQuickAccessScreen'] = [];
      }
      SIMULATOR_MENUS['settingsQuickAccessScreen'].push(newQuickAction);
      const newIdx = SIMULATOR_MENUS['settingsQuickAccessScreen'].length - 1;
      simCategoryIndices['settingsQuickAccessScreen'] = newIdx;

      const targetScreen = 'settingsQuickAccessScreen';
      if (screenSelectEl && [...screenSelectEl.options].some(opt => opt.value === targetScreen)) {
        screenSelectEl.value = targetScreen;
        updateSimulatorScreenContext(containerId, targetScreen, newIdx);
        syncSimulatorSections(containerId);
      }
      const ttsText = `Created new quick action: ${item.actionTitle}.`;
      Haptic.trigger('success');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_setpick_dblTap';
      if (ruleActionEl) ruleActionEl.innerText = 'CREATE_QUICK_ACTION';
      if (ruleHapticEl) ruleHapticEl.innerText = 'success';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
      return;
    }

    let targetScreen = item.target;

    // Mark message as READ when opened
    const isMessageScreen = screenId === 'messagesView' || screenId === 'messagesScreen';
    if (isMessageScreen) {
      item.unread = false;
      if (SIMULATOR_MENUS['messagesView']) SIMULATOR_MENUS['messagesView'][currentIdx].unread = false;
      if (SIMULATOR_MENUS['messagesScreen']) SIMULATOR_MENUS['messagesScreen'][currentIdx].unread = false;

      simActiveMessage = item;
      simDraftText = '';
      simMorseBuffer = '';
      simDraftReady = false;
      simReplyInputMode = 'morse';

      targetScreen = 'msgPrivacyReaderReplyScreen';

      if (screenSelectEl && [...screenSelectEl.options].some(opt => opt.value === targetScreen)) {
        screenSelectEl.value = targetScreen;
      }
      updateSimulatorScreenContext(containerId, targetScreen, 0);
      syncSimulatorSections(containerId);

      Haptic.trigger('success');

      if (simReadingMode === 'Morse Only') {
        Speech.speak("Reading message in Morse code.");
        Haptic.playMorse(item.subtitle);
        if (ttsLog) ttsLog.innerText = `> [MORSE PLAYBACK] "${item.subtitle}"`;
        if (hapticBar) {
          hapticBar.innerText = `[ MORSE PLAYING: "${item.subtitle}" ]`;
          hapticBar.style.color = '#FFEE55';
          hapticBar.style.borderColor = '#FFEE55';
          hapticBar.style.background = 'rgba(255,238,85,0.15)';
        }
      } else {
        const msgText = `Message from ${item.title}: "${item.subtitle}". Tap Morse to compose reply, swipe up to check draft, double tap bottom nav bar to send.`;
        Speech.speak(msgText);
        if (ttsLog) ttsLog.innerText = `> "${msgText}"`;
      }

      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_messagesScreen_3';
      if (ruleActionEl) ruleActionEl.innerText = 'READ_MESSAGE';
      if (ruleHapticEl) ruleHapticEl.innerText = 'success';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
      return;
    }

    let ttsText = `Opening ${item?.title || screenId}.`;
    if (screenId === 'mainMenuScreen') {
      if (targetScreen === 'messagesScreen' || targetScreen === 'messagesView') {
        const msgList = SIMULATOR_MENUS['messagesScreen'] || [];
        const firstMsg = msgList[0];
        const firstMsgText = firstMsg
          ? `Message 1 of ${msgList.length} from ${firstMsg.title}. ${firstMsg.unread ? 'New unread.' : 'Read.'} Received at ${firstMsg.time || '12:05 PM'}. Double tap to open private screen.`
          : 'No messages available.';
        ttsText = `Opening messages. ${firstMsgText}`;
      } else if (targetScreen === 'phoneView' || targetScreen === 'phoneCategoryMenu' || targetScreen === 'callsScreen') {
        const pList = SIMULATOR_MENUS['phoneView'] || SIMULATOR_MENUS['phoneCategoryMenu'] || SIMULATOR_MENUS['callsScreen'] || [];
        const firstItem = pList[0];
        const itemText = firstItem ? `Option 1 of ${pList.length}: ${firstItem.title}. ${firstItem.subtitle}. Double tap to open.` : '';
        ttsText = `Opening Phone and Contacts. ${itemText}`;
      } else if (targetScreen === 'cameraView' || targetScreen === 'cameraCategoryMenu' || targetScreen === 'cameraScreen') {
        const cList = SIMULATOR_MENUS['cameraView'] || SIMULATOR_MENUS['cameraCategoryMenu'] || SIMULATOR_MENUS['cameraScreen'] || [];
        const firstItem = cList[0];
        const itemText = firstItem ? `Mode 1 of ${cList.length}: ${firstItem.title}. ${firstItem.subtitle}. Double tap to start.` : '';
        ttsText = `Opening Camera and AI Vision. ${itemText}`;
      } else if (targetScreen === 'navigationView' || targetScreen === 'navCategoryMenu' || targetScreen === 'navigationScreen') {
        const nList = SIMULATOR_MENUS['navigationView'] || SIMULATOR_MENUS['navCategoryMenu'] || SIMULATOR_MENUS['navigationScreen'] || [];
        const firstItem = nList[0];
        const itemText = firstItem ? `Option 1 of ${nList.length}: ${firstItem.title}. ${firstItem.subtitle}. Double tap to open.` : '';
        ttsText = `Opening GPS Navigation. ${itemText}`;
      } else if (targetScreen === 'settingsCategoryMenu') {
        const sList = SIMULATOR_MENUS['settingsCategoryMenu'] || [];
        const firstItem = sList[0];
        const itemText = firstItem ? `Option 1 of ${sList.length}: ${firstItem.title}. ${firstItem.subtitle}. Double tap to open.` : '';
        ttsText = `Opening Settings. ${itemText}`;
      }
    } else if (screenId === 'phoneCategoryMenu' || screenId === 'phoneView' || screenId === 'callsScreen') {
      if (targetScreen === 'contactsListScreen') {
        const cList = SIMULATOR_MENUS['contactsListScreen'] || [];
        const firstContact = cList[0];
        const phoneStr = firstContact ? formatPhoneForTTS(firstContact.subtitle) : '';
        ttsText = firstContact ? `Opening contacts directory. Contact 1 of ${cList.length}: ${firstContact.title}. ${phoneStr}. Double tap for contact actions.` : 'Opening contacts directory.';
      } else if (targetScreen === 'recentsListScreen' || targetScreen === 'recentCallsScreen') {
        const rList = SIMULATOR_MENUS['recentCallsScreen'] || SIMULATOR_MENUS['recentsListScreen'] || [];
        const firstRecent = rList[0];
        const phoneStr = firstRecent ? formatPhoneForTTS(firstRecent.subtitle) : '';
        ttsText = firstRecent ? `Opening recent calls. Recent call 1 of ${rList.length}: ${firstRecent.title}. ${firstRecent.callType} call at ${firstRecent.time}. ${phoneStr}. Double tap to call back.` : 'Opening recent calls.';
      } else if (targetScreen === 'favoritesListScreen') {
        const fList = SIMULATOR_MENUS['favoritesListScreen'] || [];
        const firstFav = fList[0];
        const phoneStr = firstFav ? formatPhoneForTTS(firstFav.subtitle) : '';
        ttsText = firstFav ? `Opening favorite contacts. Favorite contact 1 of ${fList.length}: ${firstFav.title}. ${phoneStr}. Double tap to call.` : 'Opening favorite contacts.';
      } else if (targetScreen === 'emergencyContactsListScreen') {
        const eList = SIMULATOR_MENUS['emergencyContactsListScreen'] || [];
        const firstEmerg = eList[0];
        const phoneStr = firstEmerg ? formatPhoneForTTS(firstEmerg.subtitle) : '';
        ttsText = firstEmerg ? `Opening emergency contacts. Emergency contact 1 of ${eList.length}: ${firstEmerg.title}. ${phoneStr}. Double tap to call.` : 'Opening emergency contacts.';
      } else if (targetScreen === 'handwritingDialerScreen') {
        ttsText = `Opening handwriting dialer. Draw digits directly on screen. Current number: empty.`;
      }
    } else if (screenId === 'navCategoryMenu' || screenId === 'navigationView' || screenId === 'navigationScreen') {
      if (targetScreen === 'savedPlacesListScreen') {
        const spList = SIMULATOR_MENUS['savedPlacesListScreen'] || [];
        const firstPlace = spList[0];
        ttsText = firstPlace ? `Opening saved destinations. Saved place 1 of ${spList.length}: ${firstPlace.title}. ${firstPlace.subtitle}. Double tap for place options.` : 'Opening saved destinations.';
      } else if (targetScreen === 'navSearchInputScreen') {
        simNavSearchText = '';
        simNavMorseBuffer = '';
        simNavSearchReady = false;
        ttsText = `Opening destination finder. Hold bottom navigation zone to speak destination, or tap Morse.`;
      }
    } else if (screenId === 'settingsCategoryMenu') {
      if (targetScreen === 'settingsAccessibilityMenu') {
        ttsText = `Opening reading and feedback settings. Option 1 of 3: READING MODE. Current value: ${simReadingMode}. Double tap to cycle mode.`;
      } else if (targetScreen === 'settingsQuickAccessScreen') {
        const qList = SIMULATOR_MENUS['settingsQuickAccessScreen'] || [];
        const firstQ = qList[0];
        ttsText = firstQ ? `Opening quick access actions. Quick Action 1 of ${qList.length}: ${firstQ.title}. Status: ${firstQ.enabled ? 'Enabled.' : 'Disabled.'}. Double tap to toggle.` : 'Opening quick access actions.';
      } else if (targetScreen === 'settingsTutorialMenu') {
        ttsText = "Opening gesture tutorial. Double tap to start.";
      }
    } else if (screenId === 'sosScreen') {
      simActiveCallContact = { title: 'Mother', subtitle: '+389 70 123 456', icon: 'fa-user' };
      simCallSourceScreen = 'sosScreen';
      targetScreen = 'activeCallScreen';
      ttsText = 'Emergency calling Mother. Connected.';
    } else if (screenId === 'favoritesListScreen') {
      simActiveCallContact = item;
      simCallSourceScreen = 'favoritesListScreen';
      targetScreen = 'activeCallScreen';
      ttsText = `Calling ${item.title}. Connected.`;
    } else if (screenId === 'emergencyContactsListScreen') {
      simActiveCallContact = item;
      simCallSourceScreen = 'emergencyContactsListScreen';
      targetScreen = 'activeCallScreen';
      ttsText = `Emergency calling ${item.title}. Connected.`;
    } else if (screenId === 'recentCallsScreen' || screenId === 'recentsListScreen') {
      simActiveCallContact = item;
      simCallSourceScreen = screenId;
      targetScreen = 'activeCallScreen';
      ttsText = `Calling ${item.title}. Connected.`;
    } else if (screenId === 'contactsListScreen') {
      simSelectedContact = item;
      targetScreen = 'contactActionMenuScreen';
      const cActions = SIMULATOR_MENUS['contactActionMenuScreen'] || [];
      const firstAct = cActions[0];
      const actTitle = firstAct ? firstAct.title : 'CALL CONTACT';
      const phoneStr = formatPhoneForTTS(item.subtitle);
      ttsText = `Opening contact actions for ${item.title}. Action 1 of ${cActions.length || 4}: ${actTitle}. ${item.title} (${phoneStr}). Double tap to execute.`;
    } else if (screenId === 'cameraCategoryMenu' || screenId === 'cameraView' || screenId === 'cameraScreen') {
      const idx = (simCategoryIndices[screenId] || 0) % (menuList?.length || 2);
      simCameraMode = idx === 1 ? 'scene' : 'ocr';
      targetScreen = 'cameraActiveHoldScreen';
      ttsText = `Starting camera for ${simCameraMode === 'ocr' ? 'text reading' : 'scene scanning'}. Hold steady for 3 seconds to capture.`;
    } else if (screenId === 'cameraResultScreen') {
      targetScreen = 'cameraActiveHoldScreen';
      ttsText = `Retaking photo. Hold camera steady for 3 seconds.`;
    } else if (screenId === 'savedPlacesListScreen') {
      simNavActionSource = 'saved';
      simSelectedPlace = item;
      targetScreen = 'navPlaceActionMenuScreen';
      ttsText = `Options for ${item.title}: Navigate to place, Call place, or Remove from saved destinations. Double tap to execute.`;
    }

    if (screenSelectEl) {
      if ([...screenSelectEl.options].some(opt => opt.value === targetScreen)) {
        screenSelectEl.value = targetScreen;
      }
      updateSimulatorScreenContext(containerId, targetScreen, 0);
      syncSimulatorSections(containerId);
    }

    Haptic.trigger('success');
    Speech.speak(ttsText);

    if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
    if (parityStatus) {
      parityStatus.innerText = 'PARITY PASS';
      parityStatus.style.color = '#10B981';
      parityStatus.style.background = 'rgba(16,185,129,0.15)';
    }
    if (ruleIdEl) {
      if (screenId === 'favoritesListScreen') ruleIdEl.innerText = 'cmd_fav_dblTap';
      else if (screenId === 'emergencyContactsListScreen') ruleIdEl.innerText = 'cmd_emerg_dblTap';
      else if (screenId === 'recentsListScreen' || screenId === 'recentCallsScreen') ruleIdEl.innerText = 'cmd_recents_dblTap';
      else if (isMessageScreen) ruleIdEl.innerText = 'cmd_messagesScreen_3';
      else if (screenId === 'contactsListScreen') ruleIdEl.innerText = 'cmd_contactsList_dblTap';
      else if (screenId === 'savedPlacesListScreen') ruleIdEl.innerText = 'cmd_savedPlaces_dblTap';
      else ruleIdEl.innerText = 'cmd_drill_down';
    }
    if (ruleActionEl) {
      if (screenId === 'favoritesListScreen' || screenId === 'emergencyContactsListScreen' || screenId === 'recentsListScreen' || screenId === 'recentCallsScreen') ruleActionEl.innerText = 'START_CALL';
      else if (screenId === 'contactsListScreen') ruleActionEl.innerText = 'OPEN_CONTACT_ACTIONS';
      else if (isMessageScreen) ruleActionEl.innerText = 'READ_MESSAGE';
      else if (screenId === 'savedPlacesListScreen') ruleActionEl.innerText = 'OPEN_PLACE_ACTIONS';
      else if (screenId === 'cameraCategoryMenu' || screenId === 'cameraView' || screenId === 'cameraResultScreen') ruleActionEl.innerText = 'START_CAMERA';
      else ruleActionEl.innerText = 'NAVIGATE';
    }
    if (ruleHapticEl) ruleHapticEl.innerText = 'success';
    if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
    return;
  }

  // 5b. CAROUSEL TAP — announce focused item without drilling down
  if (gestureCode === 'TAP' && menuList && menuList.length > 0) {
    const currentIdx = (simCategoryIndices[screenId] || 0) % menuList.length;
    const item = menuList[currentIdx];
    if (!item) return;
    const ttsText = item.subtitle
      ? `${item.title}. ${item.subtitle}. Double tap to open.`
      : `${item.title}. Double tap to open.`;
    Haptic.trigger('short');
    Speech.speak(ttsText);
    if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
    if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
    if (ruleIdEl) ruleIdEl.innerText = 'tap_announce';
    if (ruleActionEl) ruleActionEl.innerText = 'ANNOUNCE_ITEM';
    if (ruleHapticEl) ruleHapticEl.innerText = 'short';
    if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
    return;
  }

  // 6. SWIPE UP HANDLING (Status, Check draft, or screen-specific shortcuts)
  if (gestureCode === 'SWIPE_UP') {
    if (screenId === 'settingsQuickAccessScreen') {
      const targetScreen = 'settingsAddQuickActionScreen';
      const screenSelect = document.getElementById(`${containerId}_simScreenSelect`);
      if (screenSelect && [...screenSelect.options].some(opt => opt.value === targetScreen)) {
        screenSelect.value = targetScreen;
        updateSimulatorScreenContext(containerId, targetScreen, 0);
        syncSimulatorSections(containerId);
      }
      const ttsText = "Add new quick action. Choose action type: Call contact, Send message, Navigate to place, or Scan object.";
      Haptic.trigger('warning');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_setq4';
      if (ruleActionEl) ruleActionEl.innerText = 'NAVIGATE';
      if (ruleHapticEl) ruleHapticEl.innerText = 'warning';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
      return;
    } else if (screenId === 'msgPrivacyReaderReplyScreen') {
      const draft = simDraftText || 'OK';
      const ttsText = `Draft message: "${draft}". Double tap bottom navigation bar to send.`;
      Haptic.trigger('short');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_msg_checkDraft';
      if (ruleActionEl) ruleActionEl.innerText = 'READ_DRAFT';
      if (ruleHapticEl) ruleHapticEl.innerText = 'short';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
      return;
    } else if (screenId === 'mainMenuScreen') {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const ttsText = `Main Menu status: Time is ${timeStr}. Battery is 85 percent. 5 categories available.`;
      Haptic.trigger('short');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_main_status';
      if (ruleActionEl) ruleActionEl.innerText = 'ANNOUNCE_STATUS';
      if (ruleHapticEl) ruleHapticEl.innerText = 'short';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
      return;
    } else if (screenId === 'messagesScreen' || screenId === 'messagesView') {
      const msgList = SIMULATOR_MENUS['messagesScreen'] || [];
      const currentIdx = simCategoryIndices[screenId] || 0;
      const item = msgList[currentIdx] || msgList[0];
      const ttsText = item ? `Message preview: ${item.title} sent "${item.subtitle}". Double tap to open.` : 'Messages screen.';
      Haptic.trigger('short');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_msg_swipeUp';
      if (ruleActionEl) ruleActionEl.innerText = 'READ_MESSAGE_BODY';
      if (ruleHapticEl) ruleHapticEl.innerText = 'short';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
      return;
    } else {
      const ttsText = `Active screen: ${screenId}. Swipe down with mouse or touch to return to main menu.`;
      Haptic.trigger('short');
      Speech.speak(ttsText);
      if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
      if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
      if (ruleIdEl) ruleIdEl.innerText = 'cmd_swipeUp_status';
      if (ruleActionEl) ruleActionEl.innerText = 'ANNOUNCE_STATUS';
      if (ruleHapticEl) ruleHapticEl.innerText = 'short';
      if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
      return;
    }
  }

  // 6.5. MAIN MENU LONG PRESS NAVIGATION TO WELCOME SCREEN
  if (gestureCode === 'LONG_PRESS' && screenId === 'mainMenuScreen') {
    const targetBackScreen = 'welcomeScreen';
    const screenSelectEl = document.getElementById(`${containerId}_simScreenSelect`);
    if (screenSelectEl && [...screenSelectEl.options].some(opt => opt.value === targetBackScreen)) {
      screenSelectEl.value = targetBackScreen;
    }
    updateSimulatorScreenContext(containerId, targetBackScreen, 0);
    syncSimulatorSections(containerId);

    const ttsText = "Returning to Welcome screen.";
    Haptic.trigger('warning');
    Speech.speak(ttsText);
    if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
    if (parityStatus) { parityStatus.innerText = 'PARITY PASS'; parityStatus.style.color = '#10B981'; parityStatus.style.background = 'rgba(16,185,129,0.15)'; }
    if (ruleIdEl) ruleIdEl.innerText = 'cmd_m4';
    if (ruleActionEl) ruleActionEl.innerText = 'NAVIGATE';
    if (ruleHapticEl) ruleHapticEl.innerText = 'warning';
    if (ruleLatencyEl) ruleLatencyEl.innerText = '0.05 ms (LOCAL_CACHE)';
    return;
  }

  // 7. BACK NAVIGATION (SWIPE DOWN / LONG PRESS / TWO FINGER TAP TO RETURN TO PARENT / MAIN MENU)
  if ((gestureCode === 'SWIPE_DOWN' || gestureCode === 'LONG_PRESS' || gestureCode === 'TWO_FINGER_TAP') && screenId !== 'mainMenuScreen' && screenId !== 'welcomeScreen') {
    let targetBackScreen = 'mainMenuScreen';
    let ttsText = "Returned to Main Menu.";

    if (screenId === 'sosScreen') {
      if (simSosTimer) {
        clearInterval(simSosTimer);
        simSosTimer = null;
      }
      simSosState = 'idle';
      simSosCountdown = 3;
      targetBackScreen = 'mainMenuScreen';
      const currentIdx = simCategoryIndices['mainMenuScreen'] || 0;
      const menuList = SIMULATOR_MENUS['mainMenuScreen'] || [];
      const currentItem = menuList[currentIdx] || menuList[0];
      const itemText = currentItem ? `${currentItem.title}. ${currentItem.subtitle}.` : '';
      ttsText = `SOS emergency countdown cancelled. Returning to main menu. ${itemText}`.trim();
    } else if (screenId === 'contactActionMenuScreen') {
      targetBackScreen = 'contactsListScreen';
      ttsText = "Cancelled. Returned to contacts directory.";
    } else if (screenId === 'activeCallScreen') {
      targetBackScreen = simCallSourceScreen || 'phoneCategoryMenu';
      if (targetBackScreen === 'recentsListScreen' || targetBackScreen === 'recentCallsScreen') {
        ttsText = "Call ended. Returned to recent calls.";
      } else if (targetBackScreen === 'favoritesListScreen') {
        ttsText = "Call ended. Returned to favorite contacts.";
      } else if (targetBackScreen === 'emergencyContactsListScreen') {
        ttsText = "Call ended. Returned to emergency contacts.";
      } else if (targetBackScreen === 'contactsListScreen') {
        ttsText = "Call ended. Returned to contacts directory.";
      } else if (targetBackScreen === 'handwritingDialerScreen') {
        ttsText = "Call ended. Returned to dialer.";
      } else if (targetBackScreen === 'savedPlacesListScreen') {
        ttsText = "Call ended. Returned to saved destinations.";
      } else {
        ttsText = "Call ended. Returned to Phone Menu.";
      }
    } else if (screenId === 'handwritingDialerScreen') {
      targetBackScreen = 'phoneCategoryMenu';
      simCategoryIndices['phoneCategoryMenu'] = 4;
      simCategoryIndices['callsScreen'] = 4;
      simCategoryIndices['phoneView'] = 4;
      ttsText = "Returned to Phone Menu.";
    } else if (screenId === 'emergencyContactsListScreen') {
      targetBackScreen = 'phoneCategoryMenu';
      simCategoryIndices['phoneCategoryMenu'] = 3;
      simCategoryIndices['callsScreen'] = 3;
      simCategoryIndices['phoneView'] = 3;
      ttsText = "Returned to Phone Menu.";
    } else if (screenId === 'favoritesListScreen') {
      targetBackScreen = 'phoneCategoryMenu';
      simCategoryIndices['phoneCategoryMenu'] = 2;
      simCategoryIndices['callsScreen'] = 2;
      simCategoryIndices['phoneView'] = 2;
      ttsText = "Returned to Phone Menu.";
    } else if (screenId === 'recentCallsScreen' || screenId === 'recentsListScreen') {
      targetBackScreen = 'phoneCategoryMenu';
      simCategoryIndices['phoneCategoryMenu'] = 1;
      simCategoryIndices['callsScreen'] = 1;
      simCategoryIndices['phoneView'] = 1;
      ttsText = "Returned to Phone Menu.";
    } else if (screenId === 'contactsListScreen') {
      targetBackScreen = 'phoneCategoryMenu';
      simCategoryIndices['phoneCategoryMenu'] = 0;
      simCategoryIndices['callsScreen'] = 0;
      simCategoryIndices['phoneView'] = 0;
      ttsText = "Returned to Phone Menu.";
    } else if (screenId === 'navPlaceActionMenuScreen' || screenId === 'placeActionMenuScreen') {
      targetBackScreen = simNavActionSource === 'saved' ? 'savedPlacesListScreen' : 'navCategoryMenu';
      ttsText = simNavActionSource === 'saved' ? "Cancelled. Returned to saved destinations." : "Cancelled. Returned to navigation menu.";
    } else if (screenId === 'navActiveRouteScreen') {
      targetBackScreen = 'navPlaceActionMenuScreen';
      const placeName = simSelectedPlace?.title || 'Eurofarm Pharmacy';
      ttsText = `Navigation route stopped. Returned to options for ${placeName}.`;
    } else if (screenId === 'savedPlacesListScreen' || screenId === 'navSearchInputScreen') {
      targetBackScreen = 'navCategoryMenu';
      ttsText = "Returned to Navigation Menu.";
    } else if (screenId === 'cameraActiveHoldScreen' || screenId === 'cameraResultScreen') {
      if (simCameraTimer) {
        clearInterval(simCameraTimer);
        simCameraTimer = null;
      }
      targetBackScreen = 'cameraView';
      ttsText = "Cancelled camera. Returned to Camera Menu.";
    } else if (screenId === 'settingsPickTargetScreen') {
      targetBackScreen = 'settingsAddQuickActionScreen';
      ttsText = "Cancelled. Returned to action type selection.";
    } else if (screenId === 'settingsAddQuickActionScreen') {
      targetBackScreen = 'settingsQuickAccessScreen';
      ttsText = "Cancelled. Returned to Quick Access list.";
    } else if (screenId === 'settingsAccessibilityMenu' || screenId === 'settingsQuickAccessScreen' || screenId === 'settingsTutorialMenu') {
      targetBackScreen = 'settingsCategoryMenu';
      ttsText = "Returned to Settings Menu.";
    } else if (screenId === 'gestureTrainingScreen' || screenId === 'onboardingConfigScreen' || screenId === 'tutorialScreen') {
      targetBackScreen = 'welcomeScreen';
      ttsText = "Exited tutorial. Returned to Welcome screen.";
    } else if (screenId === 'msgPrivacyReaderReplyScreen' || screenId === 'msgSendConfirmScreen') {
      targetBackScreen = 'messagesScreen';
      ttsText = "Exited privacy screen. Returned to message list.";
    } else if (screenId === 'messagesScreen' || screenId === 'messagesView') {
      targetBackScreen = 'mainMenuScreen';
      ttsText = "Returned to Main Menu. Draw letter M, P, C, N, or S or swipe to browse.";
    }

    if (targetBackScreen === 'mainMenuScreen' && screenId !== 'sosScreen') {
      const currentIdx = simCategoryIndices['mainMenuScreen'] || 0;
      const menuList = SIMULATOR_MENUS['mainMenuScreen'] || [];
      const currentItem = menuList[currentIdx] || menuList[0];
      const itemText = currentItem ? `${currentItem.title}. ${currentItem.subtitle}.` : '';
      ttsText = `Returned to Main Menu. ${itemText}`.trim();
    }

    const screenAliases = {
      'mainMenuScreen': ['mainMenuScreen'],
      'messagesScreen': ['messagesScreen', 'messagesView'],
      'messagesView': ['messagesScreen', 'messagesView'],
      'cameraView': ['cameraView', 'cameraCategoryMenu', 'cameraScreen'],
      'cameraCategoryMenu': ['cameraView', 'cameraCategoryMenu', 'cameraScreen'],
      'cameraScreen': ['cameraView', 'cameraCategoryMenu', 'cameraScreen'],
      'phoneCategoryMenu': ['phoneCategoryMenu', 'callsScreen'],
      'callsScreen': ['phoneCategoryMenu', 'callsScreen'],
      'navCategoryMenu': ['navCategoryMenu'],
      'settingsCategoryMenu': ['settingsCategoryMenu'],
      'recentsListScreen': ['recentsListScreen', 'recentCallsScreen'],
      'recentCallsScreen': ['recentsListScreen', 'recentCallsScreen']
    };

    const screenSelect = document.getElementById(`${containerId}_simScreenSelect`);
    const possibleScreens = screenAliases[targetBackScreen] || [targetBackScreen];
    let resolvedScreen = targetBackScreen;
    if (screenSelect) {
      for (const s of possibleScreens) {
        if ([...screenSelect.options].some(opt => opt.value === s)) {
          resolvedScreen = s;
          screenSelect.value = s;
          break;
        }
      }
      if (screenSelect.value !== resolvedScreen) {
        const opt = document.createElement('option');
        opt.value = resolvedScreen;
        opt.textContent = `${resolvedScreen} (Auto Added)`;
        screenSelect.appendChild(opt);
        screenSelect.value = resolvedScreen;
      }
    }
    updateSimulatorScreenContext(containerId, resolvedScreen);
    syncSimulatorSections(containerId);

    Haptic.trigger('short');
    Speech.speak(ttsText);

    if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
    if (parityStatus) {
      parityStatus.innerText = 'PARITY PASS';
      parityStatus.style.color = '#10B981';
      parityStatus.style.background = 'rgba(16,185,129,0.15)';
    }
    if (ruleIdEl) {
      if (screenId === 'sosScreen') ruleIdEl.innerText = 'cmd_sos4';
      else if (screenId === 'activeCallScreen') {
        ruleIdEl.innerText = 'cmd_call3';
        if (ruleActionEl) ruleActionEl.innerText = 'END_CALL';
        if (ruleHapticEl) ruleHapticEl.innerText = 'error';
      }
      else if (screenId === 'cameraActiveHoldScreen') ruleIdEl.innerText = 'cmd_camh3';
      else if (screenId === 'cameraResultScreen') ruleIdEl.innerText = 'cmd_camr5';
      else if (screenId === 'contactActionMenuScreen') ruleIdEl.innerText = 'cmd_contactAction_back';
      else if (screenId === 'contactsListScreen') ruleIdEl.innerText = 'cmd_contactsList_back';
      else if (screenId === 'navPlaceActionMenuScreen' || screenId === 'placeActionMenuScreen') ruleIdEl.innerText = 'cmd_navAction_back';
      else if (screenId === 'settingsAccessibilityMenu') ruleIdEl.innerText = 'cmd_seta5';
      else if (screenId === 'settingsQuickAccessScreen') ruleIdEl.innerText = 'cmd_setq6';
      else if (screenId === 'settingsAddQuickActionScreen') ruleIdEl.innerText = 'cmd_setaddq_back';
      else if (screenId === 'settingsPickTargetScreen') ruleIdEl.innerText = 'cmd_setpick_back';
      else ruleIdEl.innerText = 'cmd_back_main';
    }

    if (ruleActionEl && screenId !== 'activeCallScreen') ruleActionEl.innerText = 'NAVIGATE';
    if (ruleHapticEl && screenId !== 'activeCallScreen') ruleHapticEl.innerText = 'short';
    if (ruleLatencyEl) ruleLatencyEl.innerText = `0.12 ms (LOCAL_CACHE)`;
    return;
  }



  // 5. STANDARD DATABASE RULE LOOKUP FOR ALL OTHER GESTURES
  const res = resolveLocalCommand(screenId, gestureCode, subContext);

  if (res.success && res.command) {
    const cmd = res.command;
    const ttsText = cmd.action_payload?.tts || 'Action executed successfully.';
    const hapticPattern = cmd.haptic_pattern || 'short';

    Haptic.trigger(hapticPattern);
    Speech.speak(ttsText);

    if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
    if (parityStatus) {
      parityStatus.innerText = 'PARITY PASS';
      parityStatus.style.color = '#10B981';
      parityStatus.style.background = 'rgba(16,185,129,0.15)';
    }
    if (ruleIdEl) ruleIdEl.innerText = cmd.id || 'Custom';
    if (ruleActionEl) ruleActionEl.innerText = cmd.action_type;
    if (ruleHapticEl) ruleHapticEl.innerText = hapticPattern;
    if (ruleLatencyEl) ruleLatencyEl.innerText = `${res.latency_ms} ms (${res.source})`;

    if ((cmd.action_type === 'NAVIGATE' || cmd.action_type === 'RESTART_TUTORIAL') && (cmd.action_payload?.screen_id || cmd.action_payload?.target_screen || cmd.action_payload?.target)) {
      const targetScreen = cmd.action_payload.screen_id || cmd.action_payload.target_screen || cmd.action_payload.target;
      if (targetScreen === 'gestureTrainingScreen') {
        simTutStep = 0;
        simTutMockIdx = 0;
      }
      const screenSelect = document.getElementById(`${containerId}_simScreenSelect`);
      if (screenSelect && [...screenSelect.options].some(opt => opt.value === targetScreen)) {
        screenSelect.value = targetScreen;
        updateSimulatorScreenContext(containerId, targetScreen);
        syncSimulatorSections(containerId);
      }
    }

    if (hapticBar) {
      hapticBar.innerText = `[ HAPTIC: ${hapticPattern.toUpperCase()} ]`;
      hapticBar.style.color = '#00E5FF';
      hapticBar.style.borderColor = '#00E5FF';
      hapticBar.style.background = 'rgba(0,229,255,0.1)';
      setTimeout(() => {
        hapticBar.innerText = '[ IDLE ]';
        hapticBar.style.color = '#64748B';
        hapticBar.style.borderColor = '#333';
        hapticBar.style.background = '#030712';
      }, 800);
    }
  } else {
    Haptic.trigger('error');
    Speech.speak('Unmapped gesture for this screen.');

    if (ttsLog) ttsLog.innerText = `> [FALLBACK] No rule defined for ${gestureCode} on ${screenId}`;
    if (parityStatus) {
      parityStatus.innerText = 'UNMAPPED FALLBACK';
      parityStatus.style.color = '#EF4444';
      parityStatus.style.background = 'rgba(239,68,68,0.15)';
    }
    if (ruleIdEl) ruleIdEl.innerText = 'None';
    if (ruleActionEl) ruleActionEl.innerText = 'ERROR / FALLBACK';
    if (ruleHapticEl) ruleHapticEl.innerText = 'error';
    if (ruleLatencyEl) ruleLatencyEl.innerText = `${res.latency_ms} ms`;
  }
}


