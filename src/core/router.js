import { state, logSystem } from './state.js';
import { Speech } from './speech.js';
import { Haptic } from './haptics.js';
import { renderProgrammerScreen } from '../components/programmer.js';
import { renderSimulatorScreen } from '../components/simulator.js';
import { renderPreviewScreen } from '../components/preview.js';
import { renderWelcome } from '../modules/welcome.js';
import { renderMainMenu } from '../modules/mainMenu.js';
import { renderMessages } from '../modules/messages.js';
import { renderPhone } from '../modules/phone.js';
import { renderCamera } from '../modules/camera.js';
import { renderNavigation } from '../modules/navigation.js';
import { renderSettings } from '../modules/settings.js';
import { renderSos } from '../modules/sos.js';
import { renderGestureTraining, renderOnboardingConfig, initLetterCalibration } from '../modules/tutorial.js';

export function navigateTo(screenId, subScreenId = null) {

  Speech.stop();

  // Screen Alias Map for unified developer and runtime names
  const screenAliasMap = {
    'messagesView': 'messagesScreen',
    'phoneView': 'phoneCategoryMenu',
    'callsScreen': 'phoneCategoryMenu',
    'cameraView': 'cameraCategoryMenu',
    'cameraScreen': 'cameraCategoryMenu',
    'navigationView': 'navCategoryMenu',
    'navigationScreen': 'navCategoryMenu',
    'settingsScreen': 'settingsCategoryMenu',
    'settingsView': 'settingsCategoryMenu'
  };

  const targetScreen = screenAliasMap[screenId] || screenId;

  logSystem(`Navigating: ${screenId}${subScreenId ? ' -> ' + subScreenId : ''} (resolved: ${targetScreen})`, 'action');

  const mobileContainer = document.getElementById('mobileAppContainer');
  const fullPanes = document.querySelectorAll('.full-view-pane');
  const screenViews = document.querySelectorAll('.screen-view');

  // Hide all full-view panes and screen views
  fullPanes.forEach(el => el.style.display = 'none');
  screenViews.forEach(el => el.style.display = 'none');

  // Ensure overlays never block normal screen views
  const privOverlay = document.getElementById('privacyOverlay');
  if (privOverlay) privOverlay.style.display = 'none';
  const bioOverlay = document.getElementById('biometricOverlay');
  if (bioOverlay) bioOverlay.style.display = 'none';
  const qaOverlay = document.getElementById('quickAccessOverlay');
  if (qaOverlay) qaOverlay.style.display = 'none';

  // Check if targetScreen is a top-level developer workbench
  const isFullWorkbench = (targetScreen === 'programmerScreen' || targetScreen === 'simulatorScreen' || targetScreen === 'previewScreen');
  document.body.classList.toggle('landing-mode', targetScreen === 'landingScreen');

  if (isFullWorkbench) {
    if (mobileContainer) mobileContainer.style.display = 'none';
    const targetEl = document.getElementById(targetScreen);
    if (targetEl) targetEl.style.display = 'block';
  } else {
    if (mobileContainer) mobileContainer.style.display = 'grid';
    const targetEl = document.getElementById(targetScreen);
    if (targetEl) {
      targetEl.style.display = 'flex';
      targetEl.style.width = '100%';
      targetEl.style.height = '100%';
    }
  }


  state.currentScreen = targetScreen;
  state.currentSubScreen = subScreenId;

  // Update URL history to reflect active workbench tab
  if (typeof history !== 'undefined' && history.replaceState) {
    if (targetScreen === 'programmerScreen') history.replaceState(null, '', '/programmer');
    else if (targetScreen === 'simulatorScreen') history.replaceState(null, '', '/simulator');
    else if (targetScreen === 'previewScreen') history.replaceState(null, '', '/preview');
    else history.replaceState(null, '', '/');
  }

  // Update top header active tab button
  updateActiveTabButton(targetScreen);


  const navArea = document.getElementById('navigationArea') || document.getElementById('fixedNavigationArea');
  if (navArea) {
    // NOTE: gestureTrainingScreen is NOT in the hide list intentionally.
    // The gesture tutorial requires the nav bar to be visible at all times —
    // Step 0 of the tutorial is for the user to locate and tap the nav bar.
    // tutorial.js::highlightNavBar() adds a glowing border to draw attention to it.
    if (targetScreen === 'welcomeScreen' || targetScreen === 'tutorialScreen' || targetScreen === 'sosScreen' || targetScreen === 'activeCallScreen' || targetScreen === 'onboardingAuthScreen' || targetScreen === 'landingScreen' || isFullWorkbench) {
      navArea.style.display = 'none';
    } else {
      navArea.style.display = 'flex';
    }
  }

  onScreenLoaded(targetScreen, subScreenId);
}

function updateActiveTabButton(screenId) {
  const tabs = {
    'tabNavMobile': ['splashScreen', 'landingScreen', 'welcomeScreen', 'onboardingAuthScreen', 'gestureTrainingScreen', 'onboardingConfigScreen', 'tutorialScreen', 'mainMenuScreen', 'messagesScreen', 'phoneCategoryMenu', 'cameraCategoryMenu', 'navCategoryMenu', 'settingsCategoryMenu', 'sosScreen'],
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
    renderWelcome();
    Speech.speak("Welcome to blindeye, swipe right to start");
  }
  else if (screen === 'onboardingAuthScreen') {
    Speech.speak("Device locked. Biometric authentication required. Tap anywhere on the screen to scan fingerprint.");
  }
  else if (screen === 'gestureTrainingScreen') {
    renderGestureTraining();
  }
  else if (screen === 'onboardingConfigScreen') {
    renderOnboardingConfig();
  }
  else if (screen === 'tutorialScreen') {
    initLetterCalibration();
  }
  else if (screen === 'mainMenuScreen') {
    renderMainMenu();
    import('../modules/mainMenu.js').then(({ getMainMenuIndex, categories }) => {
      const idx = getMainMenuIndex ? getMainMenuIndex() : 0;
      const current = (categories && categories[idx]) ? categories[idx] : { title: 'MESSAGES', subtitle: 'View unread SMS & conversations' };
      Speech.speak(`Main Menu. Item ${idx + 1} of ${categories ? categories.length : 5}: ${current.title}. ${current.subtitle}.`);
    });
  }
  else if (screen === 'messagesScreen') {
    renderMessages(subScreen || 'list');
    const messages = (state.db && state.db.messages) || [];
    const firstMsg = messages[0];
    const firstMsgText = firstMsg
      ? `Message 1 of ${messages.length} from ${firstMsg.from || firstMsg.senderName || 'Mother'}. ${firstMsg.unread ? 'New unread.' : 'Read.'} Received at ${firstMsg.time || '12:05 PM'}. Double tap to open private screen.`
      : 'No messages available.';
    Speech.speak(`Opening messages. ${firstMsgText}`);
  }
  else if (screen === 'phoneCategoryMenu' || screen === 'callsScreen' || screen === 'phoneView') {
    renderPhone(subScreen || 'categoryMenu');
    Speech.speak("Opening Phone and Contacts. Option 1 of 5: CONTACTS DIRECTORY. Browse all contacts directory. Double tap to open.");
  }
  else if (screen === 'cameraCategoryMenu' || screen === 'cameraScreen' || screen === 'cameraView') {
    renderCamera(subScreen || 'categoryMenu');
    Speech.speak("Opening Camera and AI Vision. Mode 1 of 2: READ PRINTED TEXT (OCR). Point camera at letters, medicine or menus. Double tap to start.");
  }
  else if (screen === 'navCategoryMenu' || screen === 'navigationScreen') {
    renderNavigation(subScreen || 'categoryMenu');
    Speech.speak("Opening GPS Navigation. Option 1 of 4: SAVED DESTINATIONS. Quick access to home, clinic & favorite places. Double tap to open.");
  }
  else if (screen === 'settingsView' || screen === 'settingsCategoryMenu' || screen === 'settingsScreen') {
    renderSettings(subScreen || 'categoryMenu');
    Speech.speak("Opening Settings. Option 1 of 3: READING & FEEDBACK MODE. Reading mode, vibration & privacy. Double tap to open.");
  }
  else if (screen === 'sosScreen') {
    renderSos();
  }
  else if (screen === 'activeCallScreen') {
    import('../modules/phone.js').then(({ renderPhone }) => {
      renderPhone('activeCall');
    });
  }
  else if (screen === 'programmerScreen') {
    renderProgrammerScreen('programmerScreen');
    Speech.speak("AI Programmer Workbench Active. Single source of truth rule authoring.");
  }
  else if (screen === 'simulatorScreen') {
    renderSimulatorScreen('simulatorScreen');
    Speech.speak("Hardware Sandbox Active. Testing Programmer rules with sub-millisecond local cache.");
  }
  else if (screen === 'previewScreen') {
    renderPreviewScreen();
    Speech.speak("Split Preview Parity Test Active. Live bidirectional sync.");
  }
}

