import { state, logSystem } from '../core/state.js';
import { Speech } from '../core/speech.js';
import { Haptic } from '../core/haptics.js';
import { navigateTo } from '../core/router.js';

const CAMERA_CATEGORIES = [
  { id: 'ocr', title: 'READ TEXT & OCR', subtitle: 'Hold camera for 3s to read printed text', icon: 'fa-file-lines', color: '#FFEE55' },
  { id: 'objects', title: 'SCAN OBJECTS', subtitle: 'Hold camera for 3s to describe scene & obstacles', icon: 'fa-cubes', color: '#FFEE55' }
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

export function getCameraMode() {
  return cameraMode;
}

export function setCameraMode(mode) {
  cameraMode = mode;
}

export function renderCamera(targetMode = null) {
  if (targetMode) cameraMode = targetMode;
  const container = document.getElementById('cameraCategoryMenu') || document.getElementById('cameraScreen');
  if (!container) return;

  // ----------------------------------------------------
  // VIEW 1: CAMERA 2-CATEGORY MENU
  // ----------------------------------------------------
  if (cameraMode === 'categoryMenu') {
    stopHoldTimer();
    const cat = CAMERA_CATEGORIES[currentCatIdx];

    const dotsHtml = CAMERA_CATEGORIES.map((c, idx) => {
      const isActive = idx === currentCatIdx;
      return `
        <span style="
          width: ${isActive ? '22px' : '7px'};
          height: 7px;
          background: ${isActive ? cat.color : '#334155'};
          border-radius: ${isActive ? '4px' : '50%'};
          transition: all 0.25s ease;
          display: inline-block;
        "></span>
      `;
    }).join('');

    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 44px 14px 175px 14px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; user-select: none; overflow: hidden;">
        
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
          <span style="color: #FFEE55; font-size: 0.82rem; font-weight: 800; letter-spacing: 1px;">CAMERA MODES</span>
          <span style="color: #FFEE55; font-size: 0.85rem; font-weight: bold; background: #181818; padding: 2px 8px; border-radius: 12px; border: 1px solid rgba(255, 238, 85, 0.4);">
            [ ${currentCatIdx + 1} / ${CAMERA_CATEGORIES.length} ]
          </span>
        </div>

        <!-- Category Hero Card (Centered Layout, No Side Arrows) -->
        <div id="cardFocusCamCat" class="cam-cat-card" style="width: 100%; border: 2.5px solid ${cat.color}; border-radius: 24px; padding: 28px 20px; background: linear-gradient(150deg, rgba(20, 20, 26, 0.96) 0%, rgba(6, 6, 8, 0.98) 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; text-align: center; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.9), 0 0 20px rgba(255, 204, 0, 0.08); margin: auto 0; box-sizing: border-box; cursor: pointer;">
          
          <div style="width: 84px; height: 84px; border-radius: 50%; border: 2.5px solid ${cat.color}; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.03); box-shadow: 0 0 25px rgba(0,0,0,0.8); box-sizing: border-box;">
            <i class="fa-solid ${cat.icon}" style="font-size: 2.6rem; color: ${cat.color}; display: flex; align-items: center; justify-content: center; line-height: 1; width: 100%; height: 100%; margin: 0;"></i>
          </div>

          <div>
            <h2 style="margin: 0; font-size: 1.55rem; font-weight: 900; color: ${cat.color}; letter-spacing: 1px; text-transform: uppercase;">${cat.title}</h2>
            <p style="margin: 6px 0 0 0; font-size: 0.85rem; color: #94A3B8; line-height: 1.3;">${cat.subtitle}</p>
          </div>

          <div style="height: 4px;"></div>
        </div>

        <!-- Carousel Dots -->
        <div style="width: 100%; display: flex; flex-direction: column; align-items: center; gap: 6px;">
          <div style="display: flex; gap: 6px; align-items: center;">
            ${dotsHtml}
          </div>
        </div>

      </div>
    `;

    let _camCatClickCount = 0;
    let _camCatClickTimer = null;
    document.getElementById('cardFocusCamCat')?.addEventListener('click', (e) => {
      e.stopPropagation();
      _camCatClickCount++;
      if (_camCatClickCount === 1) {
        _camCatClickTimer = setTimeout(() => {
          _camCatClickCount = 0;
          Speech.speak(`${CAMERA_CATEGORIES[currentCatIdx].title}. ${CAMERA_CATEGORIES[currentCatIdx].subtitle}. Double tap to start.`);
        }, 350);
      } else if (_camCatClickCount >= 2) {
        clearTimeout(_camCatClickTimer);
        _camCatClickCount = 0;
        selectCameraCategory();
      }
    });
    return;
  }



  // ----------------------------------------------------
  // VIEW 2: ACTIVE 3-SECOND AUTO-HOLD CAPTURE SCREEN
  // ----------------------------------------------------
  if (cameraMode === 'activeHold') {
    const cat = CAMERA_CATEGORIES[currentCatIdx];

    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 44px 14px 175px 14px; display: flex; flex-direction: column; justify-content: space-between; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; overflow: hidden;">
        
        <div style="display: flex; justify-content: flex-start; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 6px;">
          <span style="color: ${cat.color}; font-size: 0.85rem; font-weight: 800;">${cat.title}</span>
        </div>

        <!-- Live Viewfinder with Countdown Overlay -->
        <div style="border: none; border-radius: 20px; overflow: hidden; position: relative; height: 240px; background: transparent; display: flex; align-items: center; justify-content: center; margin: auto 0;">
          <video id="cameraWebcamFeed" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover; opacity: 0.15; position: absolute; inset: 0;"></video>
          
          <!-- Auto Hold Countdown Circle -->
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; z-index: 2;">
            <div style="width: 80px; height: 80px; border-radius: 50%; border: 4px solid #FFEE55; display: flex; align-items: center; justify-content: center; background: rgba(255,238,85,0.06); animation: pulse 1s infinite alternate; box-shadow: 0 0 25px rgba(255,238,85,0.35);">
              <span id="holdCountdownNum" style="font-size: 2.5rem; font-weight: 900; color: #FFEE55; font-family: monospace;">
                ${holdSecondsLeft}
              </span>
            </div>
            <span style="font-size: 0.85rem; color: #FFFFFF; font-weight: 800; letter-spacing: 0.5px;">
              HOLD CAMERA STEADY...
            </span>
          </div>
        </div>

      </div>
    `;

    startCameraFeed();
    startHoldCountdown();
    return;
  }

  // ----------------------------------------------------
  // VIEW 3: SCAN RESULT (TTS + MORSE PLAYBACK)
  // ----------------------------------------------------
  if (cameraMode === 'result') {
    stopHoldTimer();
    const cat = CAMERA_CATEGORIES[currentCatIdx];

    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 44px 14px 175px 14px; display: flex; flex-direction: column; justify-content: space-between; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; overflow: hidden;">
        
        <div style="display: flex; justify-content: flex-start; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
          <span style="color: #10B981; font-size: 0.85rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">
            SCAN COMPLETED
          </span>
        </div>

        <!-- Recognized Text Output Box -->
        <div style="border: 2.5px solid #10B981; border-radius: 24px; padding: 26px 20px; background: linear-gradient(150deg, rgba(20, 20, 26, 0.96) 0%, rgba(6, 6, 8, 0.98) 100%); margin: auto 0; display: flex; flex-direction: column; gap: 14px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.9), 0 0 20px rgba(16, 185, 129, 0.12);">
          <div style="font-size: 0.76rem; color: #00E5FF; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
            ${cat.id === 'ocr' ? '● RECOGNIZED PRINTED TEXT' : '● SCENE OBJECT ANALYSIS'}
          </div>
          <p style="margin: 0; font-size: 1.25rem; line-height: 1.45; color: #FFFFFF; font-weight: 700;">
            "${currentResultText}"
          </p>
        </div>

      </div>
    `;
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
      Speech.speak(`${CAMERA_CATEGORIES[currentCatIdx].title}. ${CAMERA_CATEGORIES[currentCatIdx].subtitle}. Double tap to start.`);
    } else if (gesture === 'swipeLeft') {
      currentCatIdx = (currentCatIdx - 1 + CAMERA_CATEGORIES.length) % CAMERA_CATEGORIES.length;
      Haptic.trigger('short');
      renderCamera();
      Speech.speak(`${CAMERA_CATEGORIES[currentCatIdx].title}. ${CAMERA_CATEGORIES[currentCatIdx].subtitle}. Double tap to start.`);
    } else if (gesture === 'doubleTap') {
      selectCameraCategory();
    } else if (gesture === 'tap') {
      Haptic.playSound('short');
      Speech.speak(`${CAMERA_CATEGORIES[currentCatIdx].title}. ${CAMERA_CATEGORIES[currentCatIdx].subtitle}. Double tap to start.`);
    } else if (gesture === 'longPress' || gesture === 'swipeDown') {
      Haptic.trigger('short');
      navigateTo('mainMenuScreen');
    }
    return;
  }

  // STATE: Active Hold Viewfinder
  if (cameraMode === 'activeHold') {
    if (gesture === 'doubleTap') {
      executeSnapshotCapture();
    } else if (gesture === 'tap') {
      Haptic.playSound('short');
      Speech.speak("Hold camera steady. Double tap to capture now.");
    } else if (gesture === 'swipeDown' || gesture === 'longPress') {
      stopHoldTimer();
      cameraMode = 'categoryMenu';
      Haptic.trigger('short');
      Speech.speak("Cancelled. Returned to Camera Menu.");
      renderCamera();
    }
    return;
  }

  // STATE: Result Screen
  if (cameraMode === 'result') {
    if (gesture === 'doubleTap') {
      cameraMode = 'activeHold';
      renderCamera();
    } else if (gesture === 'swipeRight') {
      Speech.speak(currentResultText);
    } else if (gesture === 'swipeLeft') {
      Haptic.playMorse(currentResultText);
      Speech.speak("Playing Morse vibration sequence.");
    } else if (gesture === 'longPress' || gesture === 'swipeDown') {
      cameraMode = 'categoryMenu';
      Haptic.trigger('short');
      Speech.speak("Returned to Camera Menu.");
      renderCamera();
    }
  }
}

