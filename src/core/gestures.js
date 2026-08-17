import { state, logSystem } from './state.js';
import { Speech } from './speech.js';
import { Haptic } from './haptics.js';
import { navigateTo } from './router.js';
import { handleWelcomeGesture } from '../modules/welcome.js';
import { executeSimulatorGesture } from '../components/simulator.js';
import { handleMainMenuGesture } from '../modules/mainMenu.js';
import { handleMessagesGesture } from '../modules/messages.js';
import { handlePhoneGesture } from '../modules/phone.js';
import { handleCameraGesture } from '../modules/camera.js';
import { handleNavigationGesture } from '../modules/navigation.js';
import { handleSettingsGesture } from '../modules/settings.js';
import { handleSosGesture } from '../modules/sos.js';

export const GestureManager = {
  isTwoFingerGesture: false,
  longPressTimer: null,
  touchStartTime: 0,
  minSwipeDist: 35,

  init: function () {
    const phoneEl = document.getElementById('phoneScreen');
    if (phoneEl) {
      phoneEl.addEventListener('touchstart', (e) => {
        this.isTwoFingerGesture = e.touches.length >= 2;
        const touch = e.touches[0];
        this.start(touch.clientX, touch.clientY);
      }, { passive: false });

      phoneEl.addEventListener('touchend', (e) => {
        const touch = e.changedTouches[0];
        this.end(touch.clientX, touch.clientY);
      }, { passive: false });

      phoneEl.addEventListener('mousedown', (e) => {
        this.isTwoFingerGesture = e.shiftKey || e.button === 2;
        this.start(e.clientX, e.clientY);
      });

      phoneEl.addEventListener('mouseup', (e) => {
        this.end(e.clientX, e.clientY);
      });
    }

    // High-touch Navigation Bar Zone
    const navZone = document.getElementById('navigationArea') || document.getElementById('fixedNavigationArea');
    if (navZone) {
      navZone.addEventListener('click', () => {
        this.handleGesture('swipeRight');
      });
      navZone.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.handleGesture('longPress');
      });
    }

    this.bindSimulatorButtons();
  },

  start: function (x, y) {
    state.gestureStart = { x, y, time: Date.now() };
    this.touchStartTime = Date.now();

    if (this.longPressTimer) clearTimeout(this.longPressTimer);
    this.longPressTimer = setTimeout(() => {
      if (state.gestureStart) {
        this.handleGesture('longPress', x, y);
        state.gestureStart = null;
      }
    }, 600);
  },

  end: function (x, y) {
    if (this.longPressTimer) clearTimeout(this.longPressTimer);
    if (!state.gestureStart) return;

    const deltaX = x - state.gestureStart.x;
    const deltaY = y - state.gestureStart.y;
    const duration = Date.now() - this.touchStartTime;

    let gesture = null;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > this.minSwipeDist) {
        gesture = deltaX > 0 ? 'swipeRight' : 'swipeLeft';
      }
    } else {
      if (Math.abs(deltaY) > this.minSwipeDist) {
        gesture = deltaY > 0 ? 'swipeDown' : 'swipeUp';
      }
    }

    if (!gesture && duration < 300) {
      const now = Date.now();
      if (this.lastTapTime && (now - this.lastTapTime < 350)) {
        gesture = 'doubleTap';
        this.lastTapTime = 0;
      } else {
        this.lastTapTime = now;
        gesture = 'tap';
      }
    }

    state.gestureStart = null;
    if (gesture) {
      if (this.isTwoFingerGesture && gesture === 'tap') gesture = 'twoFingerTap';
      this.handleGesture(gesture, x, y);
    }
    this.isTwoFingerGesture = false;
  },

  handleGesture: function (gesture, x, y) {
    logSystem(`Gesture: ${gesture} at (${x || 0}, ${y || 0}) on [${state.currentScreen}]`, 'input');
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

    // 4. Biometric Authentication Screen
    if (state.currentScreen === 'onboardingAuthScreen') {
      if (gesture === 'tap' || gesture === 'doubleTap') {
        window.handleBiometricAuthOnboarding ? window.handleBiometricAuthOnboarding() : null;
      }
      return;
    }

    // 5. Main Menu Category Navigation
    if (state.currentScreen === 'mainMenuScreen') {
      handleMainMenuGesture(gesture);
      return;
    }

    // 6. Messages Module
    if (state.currentScreen === 'messagesScreen') {
      if (gesture === 'longPress') {
        Haptic.trigger('short');
        Speech.speak("Returning to Main Menu.");
        navigateTo('mainMenuScreen');
        return;
      }
      handleMessagesGesture(gesture);
      return;
    }

    // 7. Phone Module
    if (state.currentScreen === 'callsScreen') {
      if (gesture === 'longPress' && !state.activeCallContact) {
        Haptic.trigger('short');
        Speech.speak("Returning to Main Menu.");
        navigateTo('mainMenuScreen');
        return;
      }
      handlePhoneGesture(gesture);
      return;
    }

    // 8. Camera Module
    if (state.currentScreen === 'cameraScreen') {
      if (gesture === 'longPress') {
        Haptic.trigger('short');
        Speech.speak("Returning to Main Menu.");
        navigateTo('mainMenuScreen');
        return;
      }
      handleCameraGesture(gesture);
      return;
    }

    // 9. Navigation Module
    if (state.currentScreen === 'navigationScreen') {
      if (gesture === 'longPress') {
        Haptic.trigger('short');
        Speech.speak("Returning to Main Menu.");
        navigateTo('mainMenuScreen');
        return;
      }
      handleNavigationGesture(gesture);
      return;
    }

    // 10. Settings Module
    if (state.currentScreen === 'settingsScreen') {
      if (gesture === 'longPress') {
        Haptic.trigger('short');
        Speech.speak("Returning to Main Menu.");
        navigateTo('mainMenuScreen');
        return;
      }
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
        'tap': 'DOUBLE_TAP'
      };
      const gestureCode = gestureCodeMap[gesture] || 'DOUBLE_TAP';
      const activeScreen = document.getElementById('simulatorScreen_simScreenSelect')?.value || 'welcomeScreen';
      executeSimulatorGesture('simulatorScreen', gestureCode, activeScreen);
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
        'tap': 'DOUBLE_TAP'
      };
      const gestureCode = gestureCodeMap[gesture] || 'DOUBLE_TAP';
      const activeScreen = document.getElementById('previewSimContainer_simScreenSelect')?.value || 'welcomeScreen';
      executeSimulatorGesture('previewSimContainer', gestureCode, activeScreen);
      return;
    }
  },

  bindSimulatorButtons: function () {
    const bindBtn = (id, gesture) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', () => {
          this.isTwoFingerGesture = (gesture === 'swipeDown' || gesture === 'twoFingerTap');
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
  }
};
