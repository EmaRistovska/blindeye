import { state, logSystem } from '../core/state.js';
import { Speech } from '../core/speech.js';
import { Haptic } from '../core/haptics.js';
import { navigateTo } from '../core/router.js';

const CAMERA_CATEGORIES = [
  { id: 'ocr', title: 'READ TEXT & OCR', subtitle: 'Hold camera for 3s to read printed text', icon: 'fa-file-lines', color: '#10B981' },
  { id: 'objects', title: 'SCAN OBJECTS', subtitle: 'Hold camera for 3s to describe scene & obstacles', icon: 'fa-cubes', color: '#00E5FF' }
];

let currentCatIdx = 0;
let cameraMode = 'categoryMenu'; // 'categoryMenu', 'activeHold', 'result'
let holdTimer = null;
let holdSecondsLeft = 3;
let isHoldingSteady = false;
let isFlashOn = false;
let cameraStream = null;
let currentResultText = '';

const sampleOcrTexts = [
  "Paracetamol 500mg. Take 1 tablet every 8 hours with water. Expiry date: 12/2028.",
  "Bus Schedule: Line 2 to Centar arriving in 4 minutes. Line 15 arriving in 11 minutes.",
  "Restaurant Menu: Chicken Soup $4.50. Greek Salad $6.00. Fresh Orange Juice $3.00.",
  "Door Sign: Room 204 - Clinic Examination Room. Please knock before entering."
];

const sampleObjectScenes = [
  "Living room environment. Low coffee table 1 meter ahead on the right. Wooden door open 3 meters ahead.",
  "Outdoor sidewalk. Clear pathway for 5 meters. Pedestrian tactile paving detected on left.",
  "Desk setting. Ceramic coffee mug and laptop detected directly in front of you."
];

export function renderCamera() {
  const container = document.getElementById('cameraScreen');
  if (!container) return;

  // ----------------------------------------------------
  // VIEW 1: CAMERA 2-CATEGORY MENU
  // ----------------------------------------------------
  if (cameraMode === 'categoryMenu') {
    stopHoldTimer();
    const cat = CAMERA_CATEGORIES[currentCatIdx];

    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 18px 14px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif;">
        
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
          <span style="color: #10B981; font-size: 0.8rem; font-weight: 800; letter-spacing: 1px;">[ CAMERA MODES ]</span>
          <span style="color: #FFFFFF; font-size: 0.85rem; font-weight: bold; background: #181818; padding: 2px 8px; border-radius: 12px;">
            [ ${currentCatIdx + 1} / ${CAMERA_CATEGORIES.length} ]
          </span>
        </div>

        <!-- Category Hero Card -->
        <div class="cam-cat-card" style="width: 100%; border: 3px solid ${cat.color}; border-radius: 20px; padding: 26px 16px; background: rgba(0,0,0,0.9); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; text-align: center; box-shadow: 0 0 25px rgba(16, 185, 129, 0.15); margin: auto 0; cursor: pointer;">
          
          <div style="width: 85px; height: 85px; border-radius: 50%; border: 3px solid ${cat.color}; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.03);">
            <i class="fa-solid ${cat.icon}" style="font-size: 2.6rem; color: ${cat.color};"></i>
          </div>

          <div>
            <h2 style="margin: 0; font-size: 1.5rem; font-weight: 900; color: ${cat.color};">${cat.title}</h2>
            <p style="margin: 6px 0 0 0; font-size: 0.8rem; color: #94A3B8;">${cat.subtitle}</p>
          </div>

          <div style="margin-top: 4px; padding: 4px 12px; background: rgba(255,255,255,0.08); border-radius: 14px; font-size: 0.72rem; color: #FFEE55; font-weight: bold;">
            Double Tap to Start Camera
          </div>
        </div>

        <div style="width: 100%; border-top: 1px dashed #333; padding-top: 8px; text-align: center;">
          <span style="color: #64748B; font-size: 0.7rem;">Swipe Right/Left: Next/Prev Mode • Double Tap: Start</span>
        </div>

      </div>
    `;

    container.querySelector('.cam-cat-card')?.addEventListener('click', selectCameraCategory);
    return;
  }

  // ----------------------------------------------------
  // VIEW 2: ACTIVE 3-SECOND AUTO-HOLD CAPTURE SCREEN
  // ----------------------------------------------------
  if (cameraMode === 'activeHold') {
    const cat = CAMERA_CATEGORIES[currentCatIdx];

    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif;">
        
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 6px;">
          <span style="color: ${cat.color}; font-size: 0.85rem; font-weight: 800;"><i class="fa-solid ${cat.icon}"></i> ${cat.title}</span>
          <button id="btnCamToggleFlash" style="padding: 3px 8px; background: ${isFlashOn ? '#FFEE55' : '#1E293B'}; color: ${isFlashOn ? '#000' : '#FFF'}; border: 1px solid #FFEE55; border-radius: 4px; font-size: 0.72rem; font-weight: bold; cursor: pointer;">
            ${isFlashOn ? 'Flash ON' : 'Flash OFF'}
          </button>
        </div>

        <!-- Live Viewfinder with Countdown Overlay -->
        <div style="border: 2.5px solid ${cat.color}; border-radius: 16px; overflow: hidden; position: relative; height: 210px; background: #07090E; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(16,185,129,0.15);">
          <video id="cameraWebcamFeed" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover;"></video>
          
          <!-- Auto Hold Countdown Circle -->
          <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;">
            <div style="width: 70px; height: 70px; border-radius: 50%; border: 4px solid #FFEE55; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.7); animation: pulse 1s infinite alternate;">
              <span id="holdCountdownNum" style="font-size: 2.2rem; font-weight: 900; color: #FFEE55; font-family: monospace;">
                ${holdSecondsLeft}
              </span>
            </div>
            <span style="font-size: 0.8rem; color: #FFFFFF; font-weight: bold; text-shadow: 0 0 6px #000;">
              HOLD CAMERA STEADY...
            </span>
          </div>
        </div>

        <!-- Manual Capture Fallback Button -->
        <button id="btnManualCapture" style="width: 100%; padding: 12px; background: ${cat.color}; color: #000; border: none; border-radius: 10px; font-weight: 900; font-size: 0.9rem; cursor: pointer;">
          <i class="fa-solid fa-camera"></i> DOUBLE TAP TO SNAPSHOT NOW
        </button>

      </div>
    `;

    startCameraFeed();
    startHoldCountdown();

    document.getElementById('btnCamToggleFlash')?.addEventListener('click', toggleFlash);
    document.getElementById('btnManualCapture')?.addEventListener('click', executeSnapshotCapture);
    return;
  }

  // ----------------------------------------------------
  // VIEW 3: SCAN RESULT (TTS + MORSE PLAYBACK)
  // ----------------------------------------------------
  if (cameraMode === 'result') {
    stopHoldTimer();
    const cat = CAMERA_CATEGORIES[currentCatIdx];

    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 18px 14px; display: flex; flex-direction: column; justify-content: space-between; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif;">
        
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
          <span style="color: #10B981; font-size: 0.85rem; font-weight: 900;">
            <i class="fa-solid fa-check"></i> SCAN COMPLETED
          </span>
          <button id="btnBackToCamMenu" style="padding: 3px 8px; background: #1E293B; color: #FFF; border: 1px solid #475569; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">
            Retake
          </button>
        </div>

        <!-- Recognized Text Output Box -->
        <div style="border: 2px solid #10B981; border-radius: 16px; padding: 18px; background: #07090E; margin: auto 0; display: flex; flex-direction: column; gap: 12px;">
          <div style="font-size: 0.72rem; color: #00E5FF; font-weight: bold; text-transform: uppercase;">
            ${cat.id === 'ocr' ? '● RECOGNIZED PRINTED TEXT' : '● SCENE OBJECT ANALYSIS'}
          </div>
          <p style="margin: 0; font-size: 1.15rem; line-height: 1.4; color: #FFFFFF; font-weight: 600;">
            "${currentResultText}"
          </p>

          <div style="display: flex; gap: 8px; margin-top: 6px;">
            <button id="btnReplayVoice" style="flex: 1; padding: 10px; background: #10B981; color: #000; border: none; border-radius: 8px; font-weight: bold; font-size: 0.8rem; cursor: pointer;">
              <i class="fa-solid fa-volume-high"></i> Replay Voice
            </button>
            <button id="btnPlayCamMorse" style="flex: 1; padding: 10px; background: rgba(255,238,85,0.15); border: 1px solid #FFEE55; color: #FFEE55; border-radius: 8px; font-weight: bold; font-size: 0.8rem; cursor: pointer;">
              <i class="fa-solid fa-wave-square"></i> Morse Haptic
            </button>
          </div>
        </div>

        <div style="border-top: 1px dashed #333; padding-top: 6px; text-align: center;">
          <span style="color: #64748B; font-size: 0.7rem;">Double Tap: Retake • Long Press: Back to Camera Menu</span>
        </div>

      </div>
    `;

    document.getElementById('btnBackToCamMenu')?.addEventListener('click', () => {
      cameraMode = 'categoryMenu';
      renderCamera();
    });

    document.getElementById('btnReplayVoice')?.addEventListener('click', () => {
      Speech.speak(currentResultText);
    });

    document.getElementById('btnPlayCamMorse')?.addEventListener('click', () => {
      Haptic.playMorse(currentResultText);
      Speech.speak("Playing Morse vibration sequence.");
    });
    return;
  }
}

export async function startCameraFeed() {
  const videoEl = document.getElementById('cameraWebcamFeed');
  if (!videoEl) return;

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      if (!cameraStream) {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      }
      videoEl.srcObject = cameraStream;
    } catch (e) {
      logSystem('[Camera] Live feed simulator active.', 'warning');
    }
  }
}

export function startHoldCountdown() {
  stopHoldTimer();
  holdSecondsLeft = 3;
  isHoldingSteady = true;

  holdTimer = setInterval(() => {
    holdSecondsLeft--;
    const numEl = document.getElementById('holdCountdownNum');
    if (numEl) numEl.innerText = holdSecondsLeft;

    if (holdSecondsLeft > 0) {
      Haptic.trigger('short');
      Speech.speak(`${holdSecondsLeft}`);
    } else {
      stopHoldTimer();
      executeSnapshotCapture();
    }
  }, 1000);
}

export function stopHoldTimer() {
  if (holdTimer) {
    clearInterval(holdTimer);
    holdTimer = null;
  }
  isHoldingSteady = false;
}

export function executeSnapshotCapture() {
  stopHoldTimer();
  Haptic.trigger('success');

  const cat = CAMERA_CATEGORIES[currentCatIdx];
  Speech.speak(cat.id === 'ocr' ? "Picture captured. Scanning printed text with AI OCR..." : "Picture captured. Scanning objects and environment scene...");

  if (cat.id === 'ocr') {
    const rand = sampleOcrTexts[Math.floor(Math.random() * sampleOcrTexts.length)];
    currentResultText = rand;
  } else {
    const rand = sampleObjectScenes[Math.floor(Math.random() * sampleObjectScenes.length)];
    currentResultText = rand;
  }

  setTimeout(() => {
    cameraMode = 'result';
    renderCamera();
    Haptic.trigger('success');
    Speech.speak(`Result: ${currentResultText}`);
  }, 1200);
}

export function selectCameraCategory() {
  const cat = CAMERA_CATEGORIES[currentCatIdx];
  cameraMode = 'activeHold';
  Haptic.trigger('success');
  Speech.speak(`Starting ${cat.title}. Hold camera steady for 3 seconds to capture.`);
  renderCamera();
}

export function toggleFlash() {
  isFlashOn = !isFlashOn;
  Haptic.trigger('short');
  Speech.speak(isFlashOn ? "Flashlight turned on." : "Flashlight turned off.");
  renderCamera();
}

export function handleCameraGesture(gesture) {
  // STATE: Category Menu
  if (cameraMode === 'categoryMenu') {
    if (gesture === 'swipeRight') {
      currentCatIdx = (currentCatIdx + 1) % CAMERA_CATEGORIES.length;
      Haptic.trigger('short');
      renderCamera();
      Speech.speak(CAMERA_CATEGORIES[currentCatIdx].title);
    } else if (gesture === 'swipeLeft') {
      currentCatIdx = (currentCatIdx - 1 + CAMERA_CATEGORIES.length) % CAMERA_CATEGORIES.length;
      Haptic.trigger('short');
      renderCamera();
      Speech.speak(CAMERA_CATEGORIES[currentCatIdx].title);
    } else if (gesture === 'doubleTap' || gesture === 'tap') {
      selectCameraCategory();
    }
    return;
  }

  // STATE: Active Hold Viewfinder
  if (cameraMode === 'activeHold') {
    if (gesture === 'doubleTap' || gesture === 'tap') {
      executeSnapshotCapture();
    } else if (gesture === 'swipeDown' || gesture === 'longPress') {
      stopHoldTimer();
      cameraMode = 'categoryMenu';
      Haptic.trigger('short');
      Speech.speak("Returned to Camera Menu.");
      renderCamera();
    }
    return;
  }

  // STATE: Result Screen
  if (cameraMode === 'result') {
    if (gesture === 'doubleTap') {
      cameraMode = 'activeHold';
      renderCamera();
    } else if (gesture === 'longPress') {
      cameraMode = 'categoryMenu';
      Haptic.trigger('short');
      Speech.speak("Returned to Camera Menu.");
      renderCamera();
    }
  }
}
