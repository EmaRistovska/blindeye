import { state, saveDb, logSystem } from '../core/state.js';
import { Speech } from '../core/speech.js';
import { Haptic } from '../core/haptics.js';
import { navigateTo } from '../core/router.js';
import { resamplePoints } from '../core/recognition.js';

// Tutorial Steps
const GESTURE_STEPS = {
  NAV_BAR: 0,
  SWIPE_R: 1,
  SWIPE_L: 2,
  DBL_TAP: 3,
  LONG_PRESS: 4,
  TWO_FINGER_TAP: 5
};

const PERM_STEPS = {
  CAMERA: 0,
  MIC: 1
};

export const CALIBRATION_LETTERS = ['M', 'P', 'C', 'N', 'S'];

let currentGestureStep = 0;
let currentPermStep = 0;
let tutorialMenuIndex = 0;
const tutorialMockItems = ['MESSAGES', 'PHONE', 'SETTINGS'];

let calibrationState = {
  letterIdx: 0,
  count: 1,
  samples: [],
  failCount: 0
};

let isDrawing = false;
let currentStrokePts = [];

// ----------------------------------------------------
// 1. START TUTORIAL FLOW
// ----------------------------------------------------
export function startTutorialFlow() {
  currentGestureStep = GESTURE_STEPS.NAV_BAR;
  currentPermStep = PERM_STEPS.CAMERA;
  tutorialMenuIndex = 0;
  state.onboardingActive = true;
  state.onboardingStep = 0;

  navigateTo('gestureTrainingScreen');
}

// ----------------------------------------------------
// 2. PHASE 1 & 2: GESTURE TRAINING SCREEN
// ----------------------------------------------------
export function renderGestureTraining() {
  const container = document.getElementById('gestureTrainingScreen');
  if (!container) return;

  container.style.display = 'flex';
  updateGestureTrainingUI();

  // Announce current step voice
  if (currentGestureStep === GESTURE_STEPS.NAV_BAR) {
    highlightNavBar(true);
    Speech.speak(
      "Welcome to the gesture tutorial. Let's find the Navigation Bar. It is a dedicated touch strip running horizontally along the bottom of the screen. Tap the bottom section of your screen to locate it."
    );
  } else if (currentGestureStep === GESTURE_STEPS.SWIPE_R) {
    Speech.speak("Let's learn navigation. Swipe right inside the navigation bar to focus the next item.");
  } else if (currentGestureStep === GESTURE_STEPS.SWIPE_L) {
    Speech.speak("Settings focused. Perfect! Let's learn to go backward. Swipe left inside the navigation bar to focus Phone.");
  } else if (currentGestureStep === GESTURE_STEPS.DBL_TAP) {
    Speech.speak("Messages focused. Wonderful! You've mastered browsing menus. Next, let's learn how to select an option. Double tap inside the navigation bar to select Messages.");
  } else if (currentGestureStep === GESTURE_STEPS.LONG_PRESS) {
    Speech.speak("Messages selected! This confirms your selection. In a real screen, this lets you reply or read details. Now, let's learn how to go back. Swipe down inside the navigation bar to go back.");
  } else if (currentGestureStep === GESTURE_STEPS.TWO_FINGER_TAP) {
    Speech.speak("Correct! Swipe down goes back. Finally, tap the navigation bar with two fingers simultaneously to hear your battery and time status.");
  }
}

function highlightNavBar(active) {
  const navArea = document.getElementById('navigationArea') || document.getElementById('fixedNavigationArea');
  if (!navArea) return;

  if (active) {
    navArea.style.display = 'flex';
    navArea.style.border = '2px dashed #00E5FF';
    navArea.style.boxShadow = '0 0 25px rgba(0, 229, 255, 0.4)';
    navArea.style.animation = 'pulse 1.5s infinite';
  } else {
    navArea.style.border = '';
    navArea.style.boxShadow = '';
    navArea.style.animation = '';
  }
}

export function updateGestureTrainingUI() {
  const tutTitle = document.getElementById('tutTitle');
  const counter = document.getElementById('tutStepCounter');
  const animBox = document.getElementById('tutAnimationBox');
  const header = document.getElementById('gestureTrainingHeader');

  let titleText = "Locate Navigation Bar";
  let stepNum = currentGestureStep + 1;

  if (counter) counter.innerText = `[ ${stepNum} / 6 ]`;

  if (currentGestureStep === GESTURE_STEPS.NAV_BAR) {
    titleText = "Locate Navigation Bar";
    if (animBox) {
      animBox.style.width = '84px';
      animBox.style.height = '84px';
      animBox.style.borderRadius = '50%';
      animBox.style.border = '2.5px solid #00E5FF';
      animBox.style.background = 'rgba(255, 255, 255, 0.03)';
      animBox.style.boxShadow = '0 0 25px rgba(0,0,0,0.8)';
      animBox.innerHTML = `<i class="fa-solid fa-hand-pointer tut-hand-icon" style="font-size: 2.6rem; color: #00E5FF;"></i>`;
    }
  } else if (currentGestureStep === GESTURE_STEPS.SWIPE_R) {
    titleText = "Swipe Right";
    renderMockMenuIcon(animBox);
  } else if (currentGestureStep === GESTURE_STEPS.SWIPE_L) {
    titleText = "Swipe Left";
    renderMockMenuIcon(animBox);
  } else if (currentGestureStep === GESTURE_STEPS.DBL_TAP) {
    titleText = "Double Tap";
    renderMockMenuIcon(animBox);
  } else if (currentGestureStep === GESTURE_STEPS.LONG_PRESS) {
    titleText = "Swipe Down (Back)";
    if (animBox) {
      animBox.style.width = '84px';
      animBox.style.height = '84px';
      animBox.style.borderRadius = '50%';
      animBox.style.border = '2.5px solid #00E5FF';
      animBox.style.background = 'rgba(255, 255, 255, 0.03)';
      animBox.style.boxShadow = '0 0 25px rgba(0,0,0,0.8)';
      animBox.innerHTML = `<i class="fa-solid fa-arrow-down tut-hand-icon" style="font-size: 2.6rem; color: #00E5FF;"></i>`;
    }
  } else if (currentGestureStep === GESTURE_STEPS.TWO_FINGER_TAP) {
    titleText = "Two-Finger Tap";
    if (animBox) {
      animBox.style.width = '84px';
      animBox.style.height = '84px';
      animBox.style.borderRadius = '50%';
      animBox.style.border = '2.5px solid #00E5FF';
      animBox.style.background = 'rgba(255, 255, 255, 0.03)';
      animBox.style.boxShadow = '0 0 25px rgba(0,0,0,0.8)';
      animBox.innerHTML = `
        <div style="display: flex; gap: 10px; align-items: center; justify-content: center;">
          <i class="fa-solid fa-hand-peace" style="font-size: 2.6rem; color: #00E5FF;"></i>
        </div>
      `;
    }
  }

  if (tutTitle) {
    tutTitle.innerText = titleText;
    tutTitle.style.color = '#00E5FF';
  }

  if (header) {
    const dots = header.querySelectorAll('.tut-step-dot');
    dots.forEach((dot, idx) => {
      if (idx === currentGestureStep) {
        dot.className = 'tut-step-dot active';
        dot.style.width = '24px';
        dot.style.height = '7px';
        dot.style.borderRadius = '4px';
        dot.style.backgroundColor = '#00E5FF';
        dot.style.boxShadow = '0 0 8px #00E5FF';
      } else {
        dot.className = 'tut-step-dot';
        dot.style.width = '7px';
        dot.style.height = '7px';
        dot.style.borderRadius = '50%';
        dot.style.backgroundColor = idx < currentGestureStep ? '#10B981' : '#334155';
        dot.style.boxShadow = '';
      }
    });
  }
}

function renderMockMenuIcon(animBox) {
  if (!animBox) return;
  const currentCategory = tutorialMockItems[tutorialMenuIndex] || 'MESSAGES';
  let icon = 'fa-comment-sms';
  if (currentCategory === 'PHONE') icon = 'fa-phone';
  if (currentCategory === 'SETTINGS') icon = 'fa-sliders';

  animBox.style.width = '84px';
  animBox.style.height = '84px';
  animBox.style.borderRadius = '50%';
  animBox.style.border = '2.5px solid #00E5FF';
  animBox.style.background = 'rgba(255, 255, 255, 0.03)';
  animBox.style.boxShadow = '0 0 25px rgba(0,0,0,0.8)';
  animBox.style.display = 'flex';
  animBox.style.flexDirection = 'column';
  animBox.style.alignItems = 'center';
  animBox.style.justifyContent = 'center';
  animBox.innerHTML = `
    <i class="fa-solid ${icon}" style="font-size: 2.6rem; color: #00E5FF;"></i>
  `;
}

export function handleGestureTrainingGesture(gesture, x, y, isInNavZone) {
  logSystem(`GestureTraining: ${gesture} (step: ${currentGestureStep}, inNavZone: ${isInNavZone})`, 'input');

  // Long Press exits the tutorial and returns to Welcome Screen
  if (gesture === 'longPress') {
    highlightNavBar(false);
    Haptic.trigger('short');
    Speech.speak("Exited tutorial. Returned to Welcome screen.");
    navigateTo('welcomeScreen');
    return;
  }

  // STEP 0: LOCATE NAVIGATION BAR
  if (currentGestureStep === GESTURE_STEPS.NAV_BAR) {
    if (gesture === 'tap' && isInNavZone) {
      Haptic.trigger('success');
      highlightNavBar(false);
      Speech.speak(
        "Correct! You've located the navigation bar. The screen is split into two zones: the bottom is the Navigation Zone, where you swipe left and right to select menu options. The top area is the Content Area, where cards and details are displayed. Let's practice moving between mock menu items.",
        true,
        () => {
          currentGestureStep = GESTURE_STEPS.SWIPE_R;
          tutorialMenuIndex = 0;
          renderGestureTraining();
        }
      );
      return;
    }

    if (gesture === 'doubleTap') {
      Haptic.trigger('warning');
      Speech.speak("Navigation bar is located with a single tap, not a double tap. Tap once in the navigation zone.");
      return;
    }

    // Tapped anywhere other than the nav bar: provide spatial feedback (tap lower, tap higher, etc.)
    Haptic.trigger('warning');
    const navZone = document.getElementById('navigationArea') || document.getElementById('fixedNavigationArea');
    const phoneEl = document.getElementById('phoneScreen');

    let feedback = "Tap lower down toward the bottom of the screen to locate the navigation bar.";
    if (navZone && typeof y === 'number') {
      const navRect = navZone.getBoundingClientRect();
      const phoneRect = phoneEl ? phoneEl.getBoundingClientRect() : { top: 0, height: window.innerHeight };

      const distAbove = navRect.top - y;
      if (distAbove > phoneRect.height * 0.45) {
        feedback = "Too high. Tap much lower, near the bottom edge of the screen.";
      } else if (distAbove > phoneRect.height * 0.18) {
        feedback = "Tap lower down toward the bottom of the screen.";
      } else if (distAbove > 0) {
        feedback = "Almost there! Tap just slightly lower into the navigation bar.";
      } else if (y > navRect.bottom) {
        feedback = "Tap slightly higher.";
      }
    }

    Speech.speak(feedback);
    return;
  }

  // STEP 1: SWIPE RIGHT
  if (currentGestureStep === GESTURE_STEPS.SWIPE_R) {
    if (gesture === 'swipeRight') {
      if (tutorialMenuIndex === 0) {
        tutorialMenuIndex = 1;
        Haptic.trigger('success');
        updateGestureTrainingUI();
        Speech.speak("Phone focused. Excellent! Swipe right again to focus Settings.");
      } else if (tutorialMenuIndex === 1) {
        tutorialMenuIndex = 2;
        Haptic.trigger('success');
        updateGestureTrainingUI();
        currentGestureStep = GESTURE_STEPS.SWIPE_L;
        renderGestureTraining();
      }
    } else {
      Haptic.trigger('error');
      Speech.speak("Swipe right inside the navigation bar to focus next item.");
    }
    return;
  }

  // STEP 2: SWIPE LEFT
  if (currentGestureStep === GESTURE_STEPS.SWIPE_L) {
    if (gesture === 'swipeLeft') {
      if (tutorialMenuIndex === 2) {
        tutorialMenuIndex = 1;
        Haptic.trigger('success');
        updateGestureTrainingUI();
        Speech.speak("Phone focused. Great! Swipe left once more to return to Messages.");
      } else if (tutorialMenuIndex === 1) {
        tutorialMenuIndex = 0;
        Haptic.trigger('success');
        updateGestureTrainingUI();
        currentGestureStep = GESTURE_STEPS.DBL_TAP;
        renderGestureTraining();
      }
    } else {
      Haptic.trigger('error');
      Speech.speak("Swipe left inside the navigation bar to go backward.");
    }
    return;
  }

  // STEP 3: DOUBLE TAP
  if (currentGestureStep === GESTURE_STEPS.DBL_TAP) {
    if (gesture === 'doubleTap') {
      Haptic.trigger('success');
      currentGestureStep = GESTURE_STEPS.LONG_PRESS;
      renderGestureTraining();
    } else {
      Haptic.trigger('error');
      Speech.speak("Double tap inside the navigation bar to confirm selection.");
    }
    return;
  }

  // STEP 4: SWIPE DOWN (BACK)
  if (currentGestureStep === GESTURE_STEPS.LONG_PRESS) {
    if (gesture === 'swipeDown') {
      Haptic.trigger('success');
      currentGestureStep = GESTURE_STEPS.TWO_FINGER_TAP;
      renderGestureTraining();
    } else {
      Haptic.trigger('error');
      Speech.speak("Swipe down inside the navigation bar to go back.");
    }
    return;
  }

  // STEP 5: TWO-FINGER TAP
  if (currentGestureStep === GESTURE_STEPS.TWO_FINGER_TAP) {
    if (gesture === 'twoFingerTap' || gesture === 'doubleTap') {
      Haptic.trigger('success');
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      Speech.speak(
        `Correct! Two-finger tap checks status. Time is ${timeStr}. Battery is 85 percent. Connection is stable. Now, let's set up system permissions.`,
        true,
        () => {
          navigateTo('onboardingConfigScreen');
        }
      );
    } else {
      Haptic.trigger('error');
      Speech.speak("Tap with two fingers simultaneously inside the navigation bar to hear status.");
    }
    return;
  }
}

// ----------------------------------------------------
// 3. PHASE 3: PERMISSIONS SCREEN
// ----------------------------------------------------
export function renderOnboardingConfig() {
  const screen = document.getElementById('onboardingConfigScreen');
  const container = document.getElementById('onboardingConfigContainer');
  if (!screen || !container) return;

  screen.style.display = 'flex';

  const isCamera = currentPermStep === PERM_STEPS.CAMERA;
  const icon = isCamera ? 'fa-camera' : 'fa-microphone';
  const title = isCamera ? 'CAMERA ACCESS' : 'MICROPHONE';
  const desc = isCamera
    ? 'Used for AI object detection and reading printed text.'
    : 'Used for voice replies and speaking search destinations.';
  const stepText = isCamera ? '1 / 2' : '2 / 2';

  container.innerHTML = `
    <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 44px 14px 175px 14px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; position: relative; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; user-select: none;">
      
      <!-- Top Screen Header -->
      <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px; flex-shrink: 0;">
        <span style="color: #00E5FF; font-size: 0.82rem; font-weight: 800; letter-spacing: 0.5px;">SYSTEM ACCESS</span>
        <span style="color: #00E5FF; font-size: 0.85rem; font-weight: bold; background: #181818; padding: 2px 10px; border-radius: 12px; border: 1px solid rgba(255, 238, 85, 0.4);">
          [ ${stepText} ]
        </span>
      </div>

      <!-- Center Hero Card -->
      <div id="onboardingConfigCard" class="hero-card" style="width: 100%; border: 2.5px solid #00E5FF; border-radius: 24px; box-sizing: border-box; display: flex; flex-direction: column; gap: 16px; align-items: center; padding: 28px 20px; background: linear-gradient(150deg, rgba(20, 20, 26, 0.96) 0%, rgba(6, 6, 8, 0.98) 100%); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.9), 0 0 20px rgba(255, 204, 0, 0.08); margin: auto 0; text-align: center; cursor: pointer;">
        <div style="width: 84px; height: 84px; border-radius: 50%; border: 2.5px solid #00E5FF; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.03); box-shadow: 0 0 25px rgba(0,0,0,0.8); box-sizing: border-box;">
          <i class="fa-solid ${icon}" style="font-size: 2.6rem; color: #00E5FF; display: flex; align-items: center; justify-content: center; line-height: 1; width: 100%; height: 100%; margin: 0;"></i>
        </div>
        <h2 style="color: #00E5FF; font-size: 1.55rem; margin: 0; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">${title}</h2>
        <p style="color: #94A3B8; font-size: 0.85rem; margin: 0; max-width: 260px; line-height: 1.3;">${desc}</p>
        <div style="height: 4px;"></div>
      </div>

      <div style="height: 1px;"></div>
    </div>
  `;

  if (isCamera) {
    Speech.speak("Let's set up system permissions. The camera is used to read labels and recognize objects. Double tap to grant camera permission, or swipe right to skip.");
  } else {
    Speech.speak("The microphone is used to dictate text replies. Double tap to grant microphone permission, or swipe right to skip.");
  }

  const card = document.getElementById('onboardingConfigCard');
  if (card) {
    let clickCount = 0;
    let clickTimer = null;
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      clickCount++;
      if (clickCount === 1) {
        clickTimer = setTimeout(() => {
          clickCount = 0;
          handleOnboardingConfigGesture('tap');
        }, 320);
      } else if (clickCount >= 2) {
        clearTimeout(clickTimer);
        clickCount = 0;
        handleOnboardingConfigGesture('doubleTap');
      }
    });
  }
}

let isPermTransitioning = false;

export function handleOnboardingConfigGesture(gesture, x, y, isInNavZone) {
  if (isPermTransitioning) return;
  logSystem(`OnboardingConfig: ${gesture} (step: ${currentPermStep})`, 'input');

  if (gesture === 'longPress') {
    Haptic.trigger('short');
    Speech.speak("Exited tutorial. Returned to Welcome screen.");
    navigateTo('welcomeScreen');
    return;
  }

  if (currentPermStep === PERM_STEPS.CAMERA) {
    if (gesture === 'doubleTap') {
      isPermTransitioning = true;
      Haptic.trigger('success');
      Speech.speak("Camera permission granted successfully. Moving to microphone.");

      const container = document.getElementById('onboardingConfigContainer');
      if (container) {
        container.innerHTML = `
          <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 44px 14px 175px 14px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
            <div class="hero-card" style="width: 100%; border: 2px solid #10B981; border-radius: 24px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 36px 20px; background: #030712; margin: auto 0; text-align: center; gap: 16px; box-shadow: 0 0 25px rgba(16, 185, 129, 0.25);">
              <div style="width: 84px; height: 84px; border-radius: 50%; border: 2px solid #10B981; display: flex; align-items: center; justify-content: center; background: rgba(16, 185, 129, 0.1); box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);">
                <i class="fa-solid fa-check" style="font-size: 2.6rem; color: #10B981;"></i>
              </div>
              <h2 style="color: #10B981; font-size: 1.45rem; margin: 0; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">CAMERA GRANTED</h2>
              <p style="color: #94A3B8; font-size: 0.88rem; margin: 0; max-width: 260px; line-height: 1.4;">Moving to microphone permission...</p>
            </div>
          </div>
        `;
      }

      setTimeout(() => {
        currentPermStep = PERM_STEPS.MIC;
        renderOnboardingConfig();
        isPermTransitioning = false;
      }, 900);
    } else if (gesture === 'tap') {
      Haptic.trigger('warning');
      Speech.speak("Camera permission requires a double tap. Double tap to allow, or swipe right to skip.");
    } else if (gesture === 'swipeRight') {
      isPermTransitioning = true;
      Haptic.trigger('short');
      Speech.speak("Camera permission skipped. Moving to microphone.");
      setTimeout(() => {
        currentPermStep = PERM_STEPS.MIC;
        renderOnboardingConfig();
        isPermTransitioning = false;
      }, 700);
    }
    return;
  }

  if (currentPermStep === PERM_STEPS.MIC) {
    if (gesture === 'doubleTap') {
      isPermTransitioning = true;
      Haptic.trigger('success');
      Speech.speak("Microphone permission granted successfully. Moving to handwriting calibration.");

      const container = document.getElementById('onboardingConfigContainer');
      if (container) {
        container.innerHTML = `
          <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 44px 14px 175px 14px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
            <div class="hero-card" style="width: 100%; border: 2px solid #10B981; border-radius: 24px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 36px 20px; background: #030712; margin: auto 0; text-align: center; gap: 16px; box-shadow: 0 0 25px rgba(16, 185, 129, 0.25);">
              <div style="width: 84px; height: 84px; border-radius: 50%; border: 2px solid #10B981; display: flex; align-items: center; justify-content: center; background: rgba(16, 185, 129, 0.1); box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);">
                <i class="fa-solid fa-check" style="font-size: 2.6rem; color: #10B981;"></i>
              </div>
              <h2 style="color: #10B981; font-size: 1.45rem; margin: 0; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">MICROPHONE GRANTED</h2>
              <p style="color: #94A3B8; font-size: 0.88rem; margin: 0; max-width: 260px; line-height: 1.4;">Opening handwriting calibration...</p>
            </div>
          </div>
        `;
      }

      setTimeout(() => {
        isPermTransitioning = false;
        navigateTo('tutorialScreen');
      }, 900);
    } else if (gesture === 'tap') {
      Haptic.trigger('warning');
      Speech.speak("Microphone permission requires a double tap. Double tap to allow, or swipe right to skip.");
    } else if (gesture === 'swipeRight') {
      isPermTransitioning = true;
      Haptic.trigger('short');
      Speech.speak("Microphone permission skipped. Moving to handwriting calibration.");
      setTimeout(() => {
        isPermTransitioning = false;
        navigateTo('tutorialScreen');
      }, 700);
    }
    return;
  }
}

// ----------------------------------------------------
// 4. PHASE 4: LETTER CALIBRATION (M, P, C, N, S)
// ----------------------------------------------------
export function initLetterCalibration() {
  calibrationState = {
    letterIdx: 0,
    count: 1,
    samples: [],
    failCount: 0
  };

  // Lock drawing for 1 second on screen transition to reject leftover clicks
  isCalibrationProcessing = true;
  setTimeout(() => {
    isCalibrationProcessing = false;
  }, 1000);

  const canvas = document.getElementById('tutorialCanvas');
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = rect.width || (canvas.parentElement ? canvas.parentElement.clientWidth : 320);
  const h = rect.height || ((canvas.parentElement ? canvas.parentElement.clientHeight : 480) - 130);

  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';

  const ctx = canvas.getContext('2d');
  if (ctx.resetTransform) ctx.resetTransform();
  else ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  function getPoint(e) {
    const r = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    return {
      x: clientX - r.left,
      y: clientY - r.top
    };
  }

  // Setup drawing listeners with pointer capture
  canvas.onpointerdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    try { canvas.setPointerCapture(e.pointerId); } catch(err) {}
    const p = getPoint(e);
    startCalibrationStroke(p.x, p.y, ctx);
  };

  canvas.onpointermove = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const p = getPoint(e);
    drawCalibrationStroke(p.x, p.y, ctx);
  };

  canvas.onpointerup = (e) => {
    e.preventDefault();
    e.stopPropagation();
    try { canvas.releasePointerCapture(e.pointerId); } catch(err) {}
    endCalibrationStroke(ctx);
  };

  canvas.onpointercancel = (e) => {
    try { canvas.releasePointerCapture(e.pointerId); } catch(err) {}
    endCalibrationStroke(ctx);
  };

  updateCalibrationUI(true);
}

function updateCalibrationUI(announceSpeech = false) {
  const currentLetter = CALIBRATION_LETTERS[calibrationState.letterIdx] || 'M';
  const count = calibrationState.count;

  const counterEl = document.getElementById('tutorialLetterCounter');
  const instructionEl = document.getElementById('tutorialInstructionText');

  if (counterEl) counterEl.innerText = `Draw letter ${currentLetter} [ ${count} / 3 ]`;
  if (instructionEl) instructionEl.innerText = `Draw letter ${currentLetter} on the screen to teach the system your style`;

  if (announceSpeech) {
    if (calibrationState.letterIdx === 0 && count === 1) {
      Speech.speak(
        `Welcome to handwriting calibration. Please draw the letter ${currentLetter} on the screen 3 times to calibrate your style, or press and hold the screen to skip.`
      );
    } else {
      Speech.speak(`Letter ${currentLetter}, ${count} of 3. Draw letter ${currentLetter}.`);
    }
  }
}

let isCalibrationProcessing = false;

function startCalibrationStroke(x, y, ctx) {
  if (isCalibrationProcessing) return;
  isDrawing = true;
  currentStrokePts = [{ x, y }];
  ctx.strokeStyle = '#00E5FF';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = '#00E5FF';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(x, y);
}

function drawCalibrationStroke(x, y, ctx) {
  if (!isDrawing || isCalibrationProcessing) return;
  currentStrokePts.push({ x, y });
  ctx.lineTo(x, y);
  ctx.stroke();
}

function endCalibrationStroke(ctx) {
  if (!isDrawing || isCalibrationProcessing) return;
  isDrawing = false;

  const currentLetter = CALIBRATION_LETTERS[calibrationState.letterIdx] || 'M';
  const pts = currentStrokePts;

  // 1. Measure stroke bounding box and trajectory distance
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let pathDist = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
    if (i > 0) {
      pathDist += Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y);
    }
  }

  const w = maxX - minX;
  const h = maxY - minY;

  // 2. Reject clicks, accidental taps, and micro-touches
  if (pts.length < 8 || pathDist < 40 || (w < 20 && h < 20)) {
    Haptic.trigger('warning');
    Speech.speak(`Tap detected. Please draw the shape of letter ${currentLetter} across the screen.`);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    return;
  }

  isCalibrationProcessing = true;

  const ar = h / (w || 1);
  const normPts = pts.map(p => ({
    x: (p.x - minX) / (w || 1),
    y: (p.y - minY) / (h || 1)
  }));
  const resampled = resamplePoints(normPts, 20);
  calibrationState.samples.push({ ar, resampledPts: resampled });

  Haptic.trigger('success');

  if (calibrationState.count < 3) {
    Speech.speak(`${currentLetter}, ${calibrationState.count} of 3 recorded.`);
    calibrationState.count++;
    setTimeout(() => {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      updateCalibrationUI(false);
      isCalibrationProcessing = false;
    }, 600);
  } else {
    // 3 strokes complete for current letter: average them into a calibrated profile
    const avgAr = calibrationState.samples.reduce((sum, s) => sum + s.ar, 0) / 3;
    const avgResampled = [];
    for (let i = 0; i < 20; i++) {
      const avgX = (calibrationState.samples[0].resampledPts[i].x + calibrationState.samples[1].resampledPts[i].x + calibrationState.samples[2].resampledPts[i].x) / 3;
      const avgY = (calibrationState.samples[0].resampledPts[i].y + calibrationState.samples[1].resampledPts[i].y + calibrationState.samples[2].resampledPts[i].y) / 3;
      avgResampled.push({ x: avgX, y: avgY });
    }

    if (!state.db) state.db = {};
    if (!state.db.letterProfiles) state.db.letterProfiles = {};
    state.db.letterProfiles[currentLetter] = { ar: avgAr, resampledPts: avgResampled };
    saveDb();

    if (calibrationState.letterIdx < CALIBRATION_LETTERS.length - 1) {
      calibrationState.letterIdx++;
      calibrationState.count = 1;
      calibrationState.samples = [];
      const nextLetter = CALIBRATION_LETTERS[calibrationState.letterIdx];

      Speech.speak(`Letter ${currentLetter} calibrated successfully. Now draw letter ${nextLetter}.`);
      setTimeout(() => {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        updateCalibrationUI(false);
        isCalibrationProcessing = false;
      }, 650);
    } else {
      // All letters M, P, C, N, S calibrated!
      state.db.tutorialCompleted = true;
      localStorage.setItem('blindEye_tutorialCompleted', 'true');
      saveDb();

      Haptic.trigger('success');
      Speech.speak("All letters M, P, C, N, and S calibrated! Tutorial complete. Opening Welcome screen.");
      setTimeout(() => {
        isCalibrationProcessing = false;
        navigateTo('welcomeScreen');
      }, 1800);
    }
  }
}

export function handleTutorialCalibrationGesture(gesture) {
  if (gesture === 'longPress') {
    skipCalibration();
  }
}

export function skipCalibration() {
  Haptic.trigger('success');
  Speech.speak("Handwriting calibration skipped. Opening Welcome screen.");
  if (!state.db) state.db = {};
  state.db.tutorialCompleted = true;
  localStorage.setItem('blindEye_tutorialCompleted', 'true');
  saveDb();

  setTimeout(() => {
    navigateTo('welcomeScreen');
  }, 1200);
}
