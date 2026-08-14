import { Speech } from '../core/speech.js';
import { navigateTo } from '../core/router.js';

export function renderLandingScreen() {
  const container = document.getElementById('landingScreen');
  if (!container) return;

  container.innerHTML = `
    <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 24px 20px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: system-ui, -apple-system, sans-serif;">
      
      <!-- Landing Header -->
      <div style="width: 100%; display: flex; flex-direction: column; align-items: center; gap: 8px; margin-top: 10px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <i class="fa-solid fa-eye-slash" style="font-size: 2.2rem; color: #00E5FF;"></i>
          <h1 style="font-size: 2.2rem; margin: 0; font-weight: 900; letter-spacing: 1px; color: #00E5FF;">BLINDEYE</h1>
        </div>
        <span style="font-size: 0.85rem; font-weight: bold; color: #FFEE55; text-transform: uppercase; letter-spacing: 1px;">Accessible Multi-Sensory Platform</span>
      </div>

      <!-- Feature Grid -->
      <div style="width: 100%; display: flex; flex-direction: column; gap: 12px; margin: auto 0;">
        <div style="border: 2px solid #00E5FF; border-radius: 14px; padding: 12px 16px; background: rgba(0, 229, 255, 0.05);">
          <h3 style="margin: 0 0 4px 0; color: #00E5FF; font-size: 1rem;"><i class="fa-solid fa-hand-pointer"></i> Gesture Navigation</h3>
          <p style="margin: 0; font-size: 0.8rem; color: #CCCCCC;">Contextual swipe, double-tap, and long-press navigation zone.</p>
        </div>

        <div style="border: 2px solid #FFEE55; border-radius: 14px; padding: 12px 16px; background: rgba(255, 238, 85, 0.05);">
          <h3 style="margin: 0 0 4px 0; color: #FFEE55; font-size: 1rem;"><i class="fa-solid fa-camera"></i> AI Vision & OCR</h3>
          <p style="margin: 0; font-size: 0.8rem; color: #CCCCCC;">Real-time camera object recognition and instant text reading.</p>
        </div>

        <div style="border: 2px solid #10B981; border-radius: 14px; padding: 12px 16px; background: rgba(16, 185, 129, 0.05);">
          <h3 style="margin: 0 0 4px 0; color: #10B981; font-size: 1rem;"><i class="fa-solid fa-wave-square"></i> Morse & Haptics</h3>
          <p style="margin: 0; font-size: 0.8rem; color: #CCCCCC;">Tactile vibration feedback and full Morse typing sandbox.</p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div style="width: 100%; display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px;">
        <button id="btnLandingStart" style="width: 100%; padding: 14px; border-radius: 12px; background: #00E5FF; color: #000000; font-weight: 900; font-size: 1rem; border: none; cursor: pointer;">
          ENTER PLATFORM SIMULATOR
        </button>
        <button id="btnLandingLogin" style="width: 100%; padding: 12px; border-radius: 12px; background: transparent; color: #FFEE55; font-weight: 800; font-size: 0.9rem; border: 2px solid #FFEE55; cursor: pointer;">
          ADMIN PORTAL LOGIN
        </button>
      </div>

    </div>
  `;

  document.getElementById('btnLandingStart')?.addEventListener('click', () => {
    navigateTo('welcomeScreen');
  });

  document.getElementById('btnLandingLogin')?.addEventListener('click', () => {
    navigateTo('onboardingAuthScreen');
  });
}
