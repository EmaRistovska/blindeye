import { state } from '../core/state.js';
import { Speech } from '../core/speech.js';
import { Haptic } from '../core/haptics.js';
import { navigateTo } from '../core/router.js';

export function handleWelcomeGesture(gesture) {
  if (state.currentScreen !== 'welcomeScreen') return;

  if (gesture === 'doubleTap' || gesture === 'swipeRight') {
    Haptic.trigger('success');
    Speech.speak("Entering Main Menu.");
    navigateTo('mainMenuScreen');
  } else if (gesture === 'swipeLeft') {
    Haptic.trigger('success');
    state.onboardingStep = 0;
    state.onboardingActive = true;
    navigateTo('gestureTrainingScreen');
  }
}
