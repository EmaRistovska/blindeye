import { state, logSystem } from './state.js';
import { Speech } from './speech.js';
import { Haptic } from './haptics.js';

export function navigateTo(screenId, subScreenId = null) {
  Speech.stop();
  logSystem(`Navigating: ${screenId}${subScreenId ? ' -> ' + subScreenId : ''}`, 'action');

  document.querySelectorAll('.screen-view').forEach(el => {
    el.style.display = 'none';
  });

  const targetEl = document.getElementById(screenId);
  if (targetEl) {
    targetEl.style.display = 'flex';
  }

  state.currentScreen = screenId;
  state.currentSubScreen = subScreenId;

  const navArea = document.getElementById('navigationArea') || document.getElementById('fixedNavigationArea');
  if (navArea) {
    if (screenId === 'welcomeScreen' || screenId === 'tutorialScreen' || screenId === 'sosScreen' || screenId === 'activeCallScreen' || screenId === 'onboardingAuthScreen' || screenId === 'landingScreen' || screenId === 'programmerScreen' || screenId === 'simulatorScreen' || screenId === 'previewScreen') {
      navArea.style.display = 'none';
    } else {
      navArea.style.display = 'flex';
    }
  }

  onScreenLoaded(screenId, subScreenId);
}

export function onScreenLoaded(screen, subScreen) {
  if (screen === 'landingScreen') {
    Speech.speak("Welcome to BlindEye Platform Landing Page. Press Double Tap or Swipe Right to access the Admin Portal and Login.");
  }
  else if (screen === 'welcomeScreen') {
    Speech.speak("Welcome to BlindEye. Double tap or swipe right to start interactive setup, or click skip onboarding.");
  }
  else if (screen === 'onboardingAuthScreen') {
    Speech.speak("Device locked. Biometric authentication required. Tap anywhere on the screen to scan fingerprint.");
  }
  else if (screen === 'programmerScreen') {
    Speech.speak("AI Programmer Engine Active. Configure contextual gesture rules and state machine nodes.");
  }
  else if (screen === 'simulatorScreen') {
    Speech.speak("Standalone Hardware Simulator Active. Listening for live real-time rule updates.");
  }
  else if (screen === 'previewScreen') {
    Speech.speak("Split Preview Mode Active. Side-by-side AI Programmer and Simulator parity test.");
  }
  else if (screen === 'mainMenuScreen') {
    Speech.speak("Main Menu. Messages focused. Swipe right or left inside the navigation bar to browse categories.");
  }
}
