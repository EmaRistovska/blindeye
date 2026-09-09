import { state, logSystem } from './state.js';
import { Speech } from './speech.js';
import { Haptic } from './haptics.js';
import { navigateTo } from './router.js';
import { handleWelcomeGesture } from '../modules/welcome.js';
import { executeSimulatorGesture } from '../components/simulator.js';
import { handleMainMenuGesture } from '../modules/mainMenu.js';
import { handleMessagesGesture, getMessageSubState } from '../modules/messages.js';
import { handlePhoneGesture, getPhoneViewMode } from '../modules/phone.js';
import { handleCameraGesture } from '../modules/camera.js';
import { handleNavigationGesture, startNavVoiceRecording, stopNavVoiceRecording, getNavViewMode } from '../modules/navigation.js';
import { handleSettingsGesture } from '../modules/settings.js';
import { handleSosGesture } from '../modules/sos.js';
import { handleGestureTrainingGesture, handleOnboardingConfigGesture, handleTutorialCalibrationGesture } from '../modules/tutorial.js';

export const GestureManager = {
  isTwoFingerGesture: false,
  longPressTimer: null,
  touchStartTime: 0,
  minSwipeDist: 20, // Responsive threshold for desktop mouse and mobile touch
  lastTapTime: 0,
  lastStartNavZone: false,

  init: function () {
    const phoneEl = document.getElementById('phoneScreen');
    if (phoneEl) {
      phoneEl.style.touchAction = 'none';
      phoneEl.style.userSelect = 'none';

      // Unified Pointer Events (handles Mouse, Touch, Stylus)
      phoneEl.addEventListener('pointerdown', (e) => {
        // Left click (0) or touch/pen (0) or Right click (2 for two-finger simulation)
        if (e.button !== 0 && e.button !== 2) return;
        this.isTwoFingerGesture = e.shiftKey || e.button === 2;
        try {
          phoneEl.setPointerCapture(e.pointerId);
        } catch (err) {}
        this.start(e.clientX, e.clientY);
      });

      phoneEl.addEventListener('pointermove', (e) => {
        if (state.gestureStart && this.longPressTimer) {
          if (Math.hypot(e.clientX - state.gestureStart.x, e.clientY - state.gestureStart.y) > 15) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
          }
        }
      });

      phoneEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.longPressTimer) clearTimeout(this.longPressTimer);
        const navZone = document.getElementById('navigationArea') || document.getElementById('fixedNavigationArea');
        let isInNav = false;
        if (navZone && typeof e.clientY === 'number' && typeof e.clientX === 'number') {
          const rect = navZone.getBoundingClientRect();
          isInNav = (e.clientY >= rect.top && e.clientY <= rect.bottom && e.clientX >= rect.left && e.clientX <= rect.right);
        }
        this.handleGesture('longPress', e.clientX, e.clientY, isInNav);
      });

      phoneEl.addEventListener('pointerup', (e) => {
        try {
          phoneEl.releasePointerCapture(e.pointerId);
        } catch (err) {}
        this.end(e.clientX, e.clientY);
      });

      phoneEl.addEventListener('pointercancel', () => {
        state.gestureStart = null;
        if (this.longPressTimer) clearTimeout(this.longPressTimer);
      });

      // Multi-touch gestures (two-finger tap)
      phoneEl.addEventListener('touchstart', (e) => {
        this.isTwoFingerGesture = e.touches.length >= 2;
        const touch = e.touches[0];
        if (touch) this.start(touch.clientX, touch.clientY);
      }, { passive: true });

      phoneEl.addEventListener('touchend', (e) => {
        if (e.changedTouches && e.changedTouches.length > 0) {
          const touch = e.changedTouches[0];
          this.end(touch.clientX, touch.clientY);
        }
      }, { passive: true });
    }

    // High-touch Navigation Bar Zone
    const navZone = document.getElementById('navigationArea') || document.getElementById('fixedNavigationArea');
    if (navZone) {
      navZone.style.cursor = 'pointer';
      let navHoldStartTime = 0;
      let isNavVoiceHolding = false;

      navZone.addEventListener('pointerdown', (e) => {
        navHoldStartTime = Date.now();
        if ((state.currentScreen === 'navigationScreen' || state.currentScreen === 'navCategoryMenu') && typeof getNavViewMode === 'function' && getNavViewMode() === 'searchInput') {
          isNavVoiceHolding = true;
          startNavVoiceRecording();
          e.stopPropagation();
        }
      });

      navZone.addEventListener('pointerup', (e) => {
        if (isNavVoiceHolding) {
          isNavVoiceHolding = false;
          stopNavVoiceRecording();
          e.stopPropagation();
          return;
        }
      });

      navZone.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleGesture('longPress');
      });
    }

    // Safety fallback for pointer release anywhere in window
    window.addEventListener('pointerup', (e) => {
      if (state.gestureStart) {
        this.end(e.clientX, e.clientY);
      }
    });

    this.bindSimulatorButtons();
  },

  start: function (x, y) {
    const navZone = document.getElementById('navigationArea') || document.getElementById('fixedNavigationArea');
    let isInNavZone = false;
    if (navZone && typeof y === 'number' && typeof x === 'number') {
      const rect = navZone.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        isInNavZone = (y >= rect.top && y <= rect.bottom && x >= rect.left && x <= rect.right);
      }
    }
    const phoneEl = document.getElementById('phoneScreen');
    if (!isInNavZone && phoneEl && typeof y === 'number' && typeof x === 'number') {
      const pRect = phoneEl.getBoundingClientRect();
      if (y >= pRect.bottom - 130 && y <= pRect.bottom && x >= pRect.left && x <= pRect.right) {
        isInNavZone = true;
      }
    }
    state.gestureStart = { x, y, time: Date.now(), isInNavZone };
    this.touchStartTime = Date.now();
    this.lastStartNavZone = isInNavZone;

    if (this.longPressTimer) clearTimeout(this.longPressTimer);
    // Don't set longPressTimer if in messages privacyReply mode, dialer, or saveContactName on screen surface
    const isPrivacyMorse = (state.currentScreen === 'messagesScreen' || state.currentScreen === 'messagesView') && (typeof getMessageSubState === 'function' && getMessageSubState() === 'privacyReply') && !isInNavZone;
    const isPhoneDialer = (state.currentScreen === 'phoneScreen' || state.currentScreen === 'phoneView') && (typeof getPhoneViewMode === 'function' && getPhoneViewMode() === 'dialer') && !isInNavZone;
    const isPhoneSaveContact = (state.currentScreen === 'phoneScreen' || state.currentScreen === 'phoneView') && (typeof getPhoneViewMode === 'function' && getPhoneViewMode() === 'saveContactName') && !isInNavZone;
    if (!isPrivacyMorse && !isPhoneDialer && !isPhoneSaveContact) {
      this.longPressTimer = setTimeout(() => {
        if (state.gestureStart) {
          this.handleGesture('longPress', x, y, isInNavZone);
          state.gestureStart = null;
        }
      }, 550);
    }
  },

  end: function (x, y) {
    if (this.longPressTimer) clearTimeout(this.longPressTimer);
    const deltaX = x - state.gestureStart.x;
    const deltaY = y - state.gestureStart.y;
    const duration = Date.now() - this.touchStartTime;

    let gesture = null;

    if (Math.abs(deltaX) >= Math.abs(deltaY)) {
      if (Math.abs(deltaX) >= this.minSwipeDist) {
        gesture = deltaX > 0 ? 'swipeRight' : 'swipeLeft';
        this.lastTapTime = 0; // Reset tap debounce on swipe
      }
    } else {
      if (Math.abs(deltaY) >= this.minSwipeDist) {
        gesture = deltaY > 0 ? 'swipeDown' : 'swipeUp';
        this.lastTapTime = 0;
      }
    }

    const isPrivacyMorse = (state.currentScreen === 'messagesScreen' || state.currentScreen === 'messagesView') && (typeof getMessageSubState === 'function' && getMessageSubState() === 'privacyReply') && !state.gestureStart.isInNavZone;
    if (isPrivacyMorse) {
      if (gesture) {
        this.handleGesture(gesture, x, y, state.gestureStart?.isInNavZone || false);
      }
      state.gestureStart = null;
      return;
    }

    if (!gesture && duration < 450) {
      const now = Date.now();
      if (this.lastTapTime && (now - this.lastTapTime < 450)) {
        gesture = 'doubleTap';
        this.lastTapTime = 0;
      } else {
        this.lastTapTime = now;
        gesture = 'tap';
      }
    }

    const isInNavZone = state.gestureStart?.isInNavZone || this.lastStartNavZone || false;
    state.gestureStart = null;
    if (gesture) {
      if (this.isTwoFingerGesture && gesture === 'tap') gesture = 'twoFingerTap';
      this.handleGesture(gesture, x, y, isInNavZone);
    }
    this.isTwoFingerGesture = false;
  },

  handleGesture: function (gesture, x, y, isInNavZone = true) {
    logSystem(`Gesture: ${gesture} at (${x || 0}, ${y || 0}) on [${state.currentScreen}] (navZone: ${isInNavZone})`, 'input');
    if (gesture === 'tap') Haptic.playSound('short');


    // 1. Global Two-Finger Tap Status Check
    if (gesture === 'twoFingerTap') {
      Haptic.trigger('success');
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      let batteryStr = '85 percent';
      if ('getBattery' in navigator) {
        navigator.getBattery().then(battery => {
          const level = Math.round(battery.level * 100);
          Speech.speak(`Status: Time is ${timeStr}. Battery is ${level} percent. Active screen: ${state.currentScreen}. Connection is stable.`);
        }).catch(() => {
          Speech.speak(`Status: Time is ${timeStr}. Battery is ${batteryStr}. Active screen: ${state.currentScreen}. Connection is stable.`);
        });
      } else {
        Speech.speak(`Status: Time is ${timeStr}. Battery is ${batteryStr}. Active screen: ${state.currentScreen}. Connection is stable.`);
      }
      return;
    }

    // 2. Landing Screen Navigation
    if (state.currentScreen === 'landingScreen') {
      if (gesture === 'swipeRight' || gesture === 'doubleTap') {
        Haptic.trigger('success');
        Speech.speak("Entering Welcome screen.");
        navigateTo('welcomeScreen');
      } else if (gesture === 'swipeLeft') {
        Haptic.trigger('short');
        Speech.speak("Opening Biometric Device Login.");
        navigateTo('onboardingAuthScreen');
      }
      return;
    }

    // 3. Welcome Screen Navigation
    if (state.currentScreen === 'welcomeScreen') {
      handleWelcomeGesture(gesture);
      return;
    }

    // 3b. Gesture Training Screen (Locate Nav Bar & Gestures Practice)
    if (state.currentScreen === 'gestureTrainingScreen') {
      handleGestureTrainingGesture(gesture, x, y, isInNavZone);
      return;
    }

    // 3c. Onboarding Permissions & Config Screen
    if (state.currentScreen === 'onboardingConfigScreen') {
      handleOnboardingConfigGesture(gesture, x, y, isInNavZone);
      return;
    }

    // 3d. Tutorial Letter Calibration Screen (M, P, C, N, S)
    if (state.currentScreen === 'tutorialScreen') {
      handleTutorialCalibrationGesture(gesture);
      return;
    }

    // 4. Biometric Authentication Screen
    if (state.currentScreen === 'onboardingAuthScreen') {
      if (gesture === 'tap' || gesture === 'doubleTap') {
        window.handleBiometricAuthOnboarding ? window.handleBiometricAuthOnboarding() : null;
      }
      return;
    }

    // 5. Main Menu Category Navigation
    if (state.currentScreen === 'mainMenuScreen') {
      handleMainMenuGesture(gesture, isInNavZone, x, y);
      return;
    }

    // 6. Messages Module
    if (state.currentScreen === 'messagesScreen' || state.currentScreen === 'messagesView') {
      handleMessagesGesture(gesture, isInNavZone);
      return;
    }

    // 7. Phone Module
    if (['callsScreen', 'phoneView', 'phoneCategoryMenu', 'contactsListScreen', 'favoritesListScreen', 'recentCallsScreen', 'recentsListScreen', 'emergencyContactsListScreen', 'contactActionMenuScreen', 'handwritingDialerScreen', 'dialerActionMenuScreen', 'contactSaveNameInputScreen', 'activeCallScreen'].includes(state.currentScreen)) {
      handlePhoneGesture(gesture, isInNavZone);
      return;
    }

    // 8. Camera Module
    if (state.currentScreen === 'cameraScreen' || state.currentScreen === 'cameraView' || state.currentScreen === 'cameraCategoryMenu') {
      handleCameraGesture(gesture);
      return;
    }

    // 9. Navigation Module
    if (state.currentScreen === 'navigationScreen' || state.currentScreen === 'navigationView' || state.currentScreen === 'navCategoryMenu' || state.currentScreen === 'savedPlacesListScreen' || state.currentScreen === 'navPlaceActionMenuScreen' || state.currentScreen === 'navSearchInputScreen' || state.currentScreen === 'navActiveRouteScreen') {
      handleNavigationGesture(gesture);
      return;
    }

    // 10. Settings Module
    if (state.currentScreen === 'settingsScreen' || state.currentScreen === 'settingsView' || state.currentScreen === 'settingsCategoryMenu' || state.currentScreen === 'settingsAccessibilityMenu' || state.currentScreen === 'settingsQuickAccessScreen' || state.currentScreen === 'settingsTutorialMenu') {
      handleSettingsGesture(gesture);
      return;
    }

    // 11. SOS Screen
    if (state.currentScreen === 'sosScreen') {
      handleSosGesture(gesture);
      return;
    }


    // 12. Simulator Screen Evaluation
    if (state.currentScreen === 'simulatorScreen') {
      const gestureCodeMap = {
        'swipeRight': 'SWIPE_RIGHT',
        'swipeLeft': 'SWIPE_LEFT',
        'swipeUp': 'SWIPE_UP',
        'swipeDown': 'SWIPE_DOWN',
        'doubleTap': 'DOUBLE_TAP',
        'longPress': 'LONG_PRESS',
        'twoFingerTap': 'TWO_FINGER_TAP',
        'tap': 'TAP'
      };
      const gestureCode = gestureCodeMap[gesture] || 'TAP';
      const activeScreen = document.getElementById('simulatorScreen_simScreenSelect')?.value || 'welcomeScreen';
      const subCtx = isInNavZone ? 'zone_bottom_navigation_bar_global' : 'zone_main_viewport_content';
      executeSimulatorGesture('simulatorScreen', gestureCode, activeScreen, subCtx);
      return;
    }

    // 13. Split Preview Screen Evaluation
    if (state.currentScreen === 'previewScreen') {
      const gestureCodeMap = {
        'swipeRight': 'SWIPE_RIGHT',
        'swipeLeft': 'SWIPE_LEFT',
        'swipeUp': 'SWIPE_UP',
        'swipeDown': 'SWIPE_DOWN',
        'doubleTap': 'DOUBLE_TAP',
        'longPress': 'LONG_PRESS',
        'twoFingerTap': 'TWO_FINGER_TAP',
        'tap': 'TAP'
      };
      const gestureCode = gestureCodeMap[gesture] || 'TAP';
      const activeScreen = document.getElementById('previewSimContainer_simScreenSelect')?.value || 'welcomeScreen';
      executeSimulatorGesture('previewSimContainer', gestureCode, activeScreen);
      return;
    }
  },

  bindSimulatorButtons: function () {
    const bindBtn = (id, gesture) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.isTwoFingerGesture = (gesture === 'twoFingerTap');
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
    bindBtn('btnSimulateTwoFingerTap', 'twoFingerTap');

    document.getElementById('btnSimulateShake')?.addEventListener('click', () => {
      import('../modules/sos.js').then(({ triggerSosEmergency }) => {
        triggerSosEmergency();
      });
    });

    document.getElementById('btnSimulateBioLock')?.addEventListener('click', () => {
      navigateTo('onboardingAuthScreen');
    });
  }
};

