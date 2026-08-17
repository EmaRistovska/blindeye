import { state, logSystem } from './state.js';
import { Speech } from './speech.js';
import { Haptic } from './haptics.js';
import { renderMainMenu } from '../modules/mainMenu.js';
import { renderMessages } from '../modules/messages.js';
import { renderPhone } from '../modules/phone.js';
import { renderCamera } from '../modules/camera.js';
import { renderNavigation } from '../modules/navigation.js';
import { renderSettings } from '../modules/settings.js';
import { renderSos } from '../modules/sos.js';
import { initHandwritingTutorial } from '../modules/handwriting.js';

export function navigateTo(screenId, subScreenId = null) {
  Speech.stop();
  logSystem(`Navigating: ${screenId}${subScreenId ? ' -> ' + subScreenId : ''}`, 'action');

  const mobileContainer = document.getElementById('mobileAppContainer');
  const fullPanes = document.querySelectorAll('.full-view-pane');
  const screenViews = document.querySelectorAll('.screen-view');

  // Hide all full-view panes and screen views
  fullPanes.forEach(el => el.style.display = 'none');
  screenViews.forEach(el => el.style.display = 'none');

  // Check if screenId is a top-level developer workbench
  const isFullWorkbench = (screenId === 'programmerScreen' || screenId === 'simulatorScreen' || screenId === 'previewScreen');

  if (isFullWorkbench) {
    if (mobileContainer) mobileContainer.style.display = 'none';
    const targetEl = document.getElementById(screenId);
    if (targetEl) targetEl.style.display = 'block';
  } else {
    if (mobileContainer) mobileContainer.style.display = 'grid';
    const targetEl = document.getElementById(screenId);
    if (targetEl) targetEl.style.display = 'flex';
  }

  state.currentScreen = screenId;
  state.currentSubScreen = subScreenId;

  // Update top header active tab button
  updateActiveTabButton(screenId);

  const navArea = document.getElementById('navigationArea') || document.getElementById('fixedNavigationArea');
  if (navArea) {
    if (screenId === 'welcomeScreen' || screenId === 'tutorialScreen' || screenId === 'sosScreen' || screenId === 'activeCallScreen' || screenId === 'onboardingAuthScreen' || screenId === 'landingScreen' || isFullWorkbench) {
      navArea.style.display = 'none';
    } else {
      navArea.style.display = 'flex';
    }
  }

  onScreenLoaded(screenId, subScreenId);
}

function updateActiveTabButton(screenId) {
  const tabs = {
    'tabNavMobile': ['splashScreen', 'landingScreen', 'welcomeScreen', 'onboardingAuthScreen', 'tutorialScreen', 'mainMenuScreen', 'messagesScreen', 'callsScreen', 'cameraScreen', 'navigationScreen', 'settingsScreen', 'sosScreen'],
    'tabNavProgrammer': ['programmerScreen'],
    'tabNavSimulator': ['simulatorScreen'],
    'tabNavPreview': ['previewScreen']
  };

  Object.entries(tabs).forEach(([tabId, screens]) => {
    const btn = document.getElementById(tabId);
    if (!btn) return;
    if (screens.includes(screenId)) {
      btn.style.background = 'rgba(0, 229, 255, 0.15)';
      btn.style.borderColor = '#00E5FF';
      btn.style.color = '#00E5FF';
    } else {
      btn.style.background = '#111827';
      btn.style.borderColor = '#374151';
      btn.style.color = '#9CA3AF';
    }
  });
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
  else if (screen === 'tutorialScreen') {
    initHandwritingTutorial();
    Speech.speak("Letter calibration. Draw the letter M on the screen three times to calibrate.");
  }
  else if (screen === 'mainMenuScreen') {
    renderMainMenu();
    Speech.speak("Main Menu. Messages selected. Swipe right or left inside the navigation bar to browse categories.");
  }
  else if (screen === 'messagesScreen') {
    renderMessages();
    Speech.speak("Messages. Swipe right or left to browse incoming SMS. Double tap to open.");
  }
  else if (screen === 'callsScreen') {
    renderPhone();
    Speech.speak("Phone and Contacts. Swipe right or left to browse contacts. Double tap to call.");
  }
  else if (screen === 'cameraScreen') {
    renderCamera();
    Speech.speak("Camera and AI Vision active. Double tap to read text, or swipe up to describe scene.");
  }
  else if (screen === 'navigationScreen') {
    renderNavigation();
    Speech.speak("GPS Navigation. Swipe right or left to browse saved places. Double tap to start walking route.");
  }
  else if (screen === 'settingsScreen') {
    renderSettings();
    Speech.speak("Settings. Swipe right or left to browse options. Double tap to change.");
  }
  else if (screen === 'sosScreen') {
    renderSos();
  }
  else if (screen === 'programmerScreen') {
    Speech.speak("AI Programmer Workbench Active. Single source of truth rule authoring.");
  }
  else if (screen === 'simulatorScreen') {
    Speech.speak("Hardware Sandbox Active. Testing Programmer rules with sub-millisecond local cache.");
  }
  else if (screen === 'previewScreen') {
    Speech.speak("Split Preview Parity Test Active. Live bidirectional sync.");
  }
}
