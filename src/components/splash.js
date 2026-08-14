import { Speech } from '../core/speech.js';
import { navigateTo } from '../core/router.js';

export function renderSplashScreen() {
  const container = document.getElementById('splashScreen');
  if (!container) return;

  container.innerHTML = `
    <div style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #000000; color: #00E5FF; font-family: system-ui, -apple-system, sans-serif;">
      <i class="fa-solid fa-eye-slash" style="font-size: 4rem; color: #00E5FF; margin-bottom: 16px; animation: pulse 1.5s infinite alternate;"></i>
      <h1 style="font-size: 2.8rem; font-weight: 900; margin: 0; letter-spacing: 2px;">BLINDEYE</h1>
      <span style="color: #FFEE55; font-weight: bold; margin-top: 8px; letter-spacing: 1px;">ACCESSIBLE OS</span>
    </div>
  `;

  Speech.speak("BlindEye Accessible Platform Loading...", true, () => {
    setTimeout(() => {
      navigateTo('landingScreen');
    }, 800);
  });
}
