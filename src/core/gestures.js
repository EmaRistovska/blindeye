import { state, logSystem } from './state.js';
import { Speech } from './speech.js';
import { Haptic } from './haptics.js';
import { navigateTo } from './router.js';

export const GestureManager = {
  isTwoFingerGesture: false,
  longPressTimer: null,
  touchStartTime: 0,
  minSwipeDist: 40,

  init: function () {
    const phoneEl = document.getElementById('phoneScreen');
    if (!phoneEl) return;

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
    logSystem(`Gesture: ${gesture} at (${x}, ${y})`, 'input');
    if (gesture === 'tap') Haptic.playSound('short');

    if (state.currentScreen === 'onboardingAuthScreen') {
      if (gesture === 'tap' || gesture === 'doubleTap') {
        window.handleBiometricAuthOnboarding ? window.handleBiometricAuthOnboarding() : null;
      }
      return;
    }

    if (state.onboardingActive && (state.currentScreen === 'gestureTrainingScreen' || state.currentScreen === 'onboardingConfigScreen')) {
      if (window.handleOnboardingGesture) window.handleOnboardingGesture(gesture, x, y);
      return;
    }

    if (gesture === 'twoFingerTap') {
      Haptic.trigger('success');
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      let announceBatteryStr = '85 percent';
      if ('getBattery' in navigator) {
        navigator.getBattery().then(battery => {
          const level = Math.round(battery.level * 100);
          Speech.speak(`Status. Time is ${timeStr}. Battery is ${level} percent. Connection is stable.`);
        }).catch(() => {
          Speech.speak(`Status. Time is ${timeStr}. Battery is ${announceBatteryStr}. Connection is stable.`);
        });
      } else {
        Speech.speak(`Status. Time is ${timeStr}. Battery is ${announceBatteryStr}. Connection is stable.`);
      }
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
