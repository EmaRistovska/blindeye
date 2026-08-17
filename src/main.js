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
  loadDb();
  await syncLocalCommandCache();
  initWebSocketSync();

  GestureManager.init();
  initAuthComponent();

  // Render initial components
  renderLandingScreen();
  renderSplashScreen();
  renderProgrammerScreen('programmerScreen');
  renderSimulatorScreen('simulatorScreen');
  renderPreviewScreen();

  // Bind top header navigation tabs
  document.getElementById('tabNavMobile')?.addEventListener('click', () => navigateTo('landingScreen'));
  document.getElementById('tabNavProgrammer')?.addEventListener('click', () => navigateTo('programmerScreen'));
  document.getElementById('tabNavSimulator')?.addEventListener('click', () => navigateTo('simulatorScreen'));
  document.getElementById('tabNavPreview')?.addEventListener('click', () => navigateTo('previewScreen'));

  // Global Keyboard Accessibility & Testing Shortcuts
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

  // Start directly on the workspace choice screen.
  navigateTo('landingScreen');
});
