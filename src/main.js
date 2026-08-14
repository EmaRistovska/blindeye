import { state, loadDb, logSystem } from './core/state.js';
import { Speech } from './core/speech.js';
import { Haptic } from './core/haptics.js';
import { GestureManager } from './core/gestures.js';
import { navigateTo } from './core/router.js';
import { renderLandingScreen } from './components/landing.js';
import { renderSplashScreen } from './components/splash.js';
import { initAuthComponent } from './components/auth.js';
import { handleWelcomeGesture } from './modules/welcome.js';

window.addEventListener('DOMContentLoaded', () => {
  logSystem('Initializing BlindEye Modular System...', 'system');
  loadDb();
  GestureManager.init();
  initAuthComponent();

  // Render components
  renderLandingScreen();
  renderSplashScreen();

  // Handle welcome gestures globally
  window.addEventListener('keydown', (e) => {
    if (state.currentScreen === 'welcomeScreen') {
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleWelcomeGesture('swipeRight');
      if (e.key === 'ArrowLeft') handleWelcomeGesture('swipeLeft');
    }
  });

  // Start on Splash screen
  navigateTo('splashScreen');
});
