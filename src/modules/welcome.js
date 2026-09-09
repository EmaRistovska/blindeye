import { state } from '../core/state.js';
import { Speech } from '../core/speech.js';
import { Haptic } from '../core/haptics.js';
import { navigateTo } from '../core/router.js';
import { startTutorialFlow } from './tutorial.js';

export function renderWelcome() {
  const container = document.getElementById('welcomeScreen');
  if (!container) return;

  container.innerHTML = `
    <div style="position: relative; width: 100%; height: 100%; box-sizing: border-box; padding: 34px 7px 18px 7px; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #000000; overflow: hidden;">
      
      <!-- Inner Framed Slate with Crisp Yellow Border (No Ambient Glow/Gradient Around Border) -->
      <div style="background: #000000; width: 100%; height: 100%; box-sizing: border-box; padding: 28px 16px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; color: #FFFFFF; font-family: 'Outfit', sans-serif; border: 2.5px solid #FFEE55; border-radius: 22px; box-shadow: none; position: relative;">
        
        <!-- Central Animated Eye & Hero Branding -->
        <div style="display: flex; flex-direction: column; align-items: center; gap: 20px; animation: floatElement 3.5s ease-in-out infinite; width: 100%;">
          
          <!-- Unified High-Contrast Icon Orb (Cleanly Contained) -->
          <div style="position: relative; width: 96px; height: 96px; display: flex; align-items: center; justify-content: center;">
            <!-- Pulsing Halo Aura (Contained) -->
            <div style="position: absolute; inset: -4px; border-radius: 50%; background: radial-gradient(circle, rgba(255, 238, 85, 0.25) 0%, rgba(255, 183, 3, 0.08) 70%); animation: blindEyePulse 2.8s ease-in-out infinite;"></div>
            <!-- Core Icon Circle -->
            <div style="width: 86px; height: 86px; border-radius: 50%; border: 3px solid #FFEE55; background: radial-gradient(circle, #332800 0%, #000000 100%); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 25px rgba(255, 238, 85, 0.65), inset 0 0 15px rgba(255, 238, 85, 0.35); z-index: 2;">
              <i class="fa-solid fa-eye-low-vision" style="font-size: 2.6rem; color: #FFEE55; filter: drop-shadow(0 0 8px #FFEE55);"></i>
            </div>
          </div>

          <!-- BlindEye Hero Text (Centered & Fully Contained) -->
          <div style="width: 100%; display: flex; justify-content: center; align-items: center; padding: 0 10px; box-sizing: border-box;">
            <h1 style="margin: 0; font-size: 1.95rem; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; white-space: nowrap; background: linear-gradient(135deg, #FFEE55 0%, #FFFFFF 50%, #FFB703 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: blindEyeGlowText 3s ease-in-out infinite;">
              BlindEye
            </h1>
          </div>

        </div>

      </div>

    </div>
  `;
}

export function handleWelcomeGesture(gesture) {
  if (state.currentScreen !== 'welcomeScreen') return;

  if (gesture === 'doubleTap' || gesture === 'swipeRight') {
    Haptic.trigger('success');
    Speech.speak("Entering Main Menu.");
    navigateTo('mainMenuScreen');
  } else if (gesture === 'swipeLeft') {
    Haptic.trigger('success');
    startTutorialFlow();
  } else if (gesture === 'tap') {
    Haptic.playSound('short');
    Speech.speak("Welcome to BlindEye. Swipe right or double tap to open Main Menu. Swipe left to start tutorial.");
  }
}
