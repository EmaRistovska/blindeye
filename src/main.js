import { state, loadDb, logSystem } from './core/state.js';
import { Speech } from './core/speech.js';
import { Haptic } from './core/haptics.js';
import { GestureManager } from './core/gestures.js';
import { navigateTo } from './core/router.js';
import { syncLocalCommandCache, initWebSocketSync } from './core/api.js';
import { renderLandingScreen } from './components/landing.js';
import { renderSplashScreen } from './components/splash.js';
import { initAuthComponent } from './components/auth.js';
import { renderProgrammerScreen } from './components/programmer.js';
import { renderSimulatorScreen } from './components/simulator.js';
import { renderPreviewScreen } from './components/preview.js';
import { handleWelcomeGesture } from './modules/welcome.js';
import { triggerSosEmergency } from './modules/sos.js';

window.addEventListener('DOMContentLoaded', async () => {
  logSystem('Initializing BlindEye Modular Accessibility Architecture v3.0...', 'system');

  // 1. Immediately bind top header navigation tabs
  document.getElementById('tabNavMobile')?.addEventListener('click', () => {
    const target = (state.currentScreen && !['programmerScreen', 'simulatorScreen', 'previewScreen', 'landingScreen'].includes(state.currentScreen))
      ? state.currentScreen
      : 'welcomeScreen';
    navigateTo(target);
  });
  document.getElementById('tabNavProgrammer')?.addEventListener('click', () => navigateTo('programmerScreen'));
  document.getElementById('tabNavSimulator')?.addEventListener('click', () => navigateTo('simulatorScreen'));
  document.getElementById('tabNavPreview')?.addEventListener('click', () => navigateTo('previewScreen'));

  // 2. Global Keyboard Accessibility & Testing Shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === 'ArrowRight') GestureManager.handleGesture('swipeRight');
    else if (e.key === 'ArrowLeft') GestureManager.handleGesture('swipeLeft');
    else if (e.key === 'ArrowUp') GestureManager.handleGesture('swipeUp');
    else if (e.key === 'ArrowDown') GestureManager.handleGesture('swipeDown');
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      GestureManager.handleGesture('doubleTap');
    }
    else if (e.key === 'Escape' || e.key === 'Backspace') {
      GestureManager.handleGesture('longPress');
    }
    else if (e.key === 's' || e.key === 'S') {
      triggerSosEmergency();
    }
  });

  // 3. Load DB & Sync
  try {
    loadDb();
    await syncLocalCommandCache();
    initWebSocketSync();
  } catch (err) {
    logSystem(`[Init Sync Error] ${err.message}`, 'warning');
  }

  // 4. Initialize Gestures & Auth
  try {
    GestureManager.init();
    initAuthComponent();
  } catch (err) {
    logSystem(`[Init Component Error] ${err.message}`, 'warning');
  }

  // 5. Render initial static screens
  try {
    renderLandingScreen();
    renderSplashScreen();
  } catch (err) {
    logSystem(`[Init Render Error] ${err.message}`, 'warning');
  }

  // 6. Initial URL Routing based on path or hash
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  const hash = window.location.hash.replace(/^#+/, '').toLowerCase();

  if (path === 'programmer' || hash === 'programmer') {
    navigateTo('programmerScreen');
  } else if (path === 'simulator' || hash === 'simulator') {
    navigateTo('simulatorScreen');
  } else if (path === 'preview' || hash === 'preview') {
    navigateTo('previewScreen');
  } else {
    navigateTo('welcomeScreen');
  }
});


