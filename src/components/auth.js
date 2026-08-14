import { state, logSystem } from '../core/state.js';
import { Speech } from '../core/speech.js';
import { Haptic } from '../core/haptics.js';
import { navigateTo } from '../core/router.js';

export function initAuthComponent() {
  window.handleBiometricAuthOnboarding = function () {
    Haptic.trigger('success');
    Speech.speak("Biometric authentication successful.");

    const scanner = document.querySelector('.biometric-scanner-ring');
    const statusText = document.getElementById('onboardingAuthStatus');

    if (scanner) {
      scanner.style.borderColor = '#10B981';
      scanner.style.boxShadow = '0 0 30px rgba(16, 185, 129, 0.6)';
    }

    if (statusText) {
      statusText.innerText = "AUTHENTICATION SUCCESSFUL";
      statusText.style.color = "#10B981";
    }

    setTimeout(() => {
      state.authenticated = true;
      navigateTo('welcomeScreen');
    }, 1200);
  };
}
