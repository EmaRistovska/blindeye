import { Speech } from '../core/speech.js';
import { navigateTo } from '../core/router.js';

export function renderLandingScreen() {
  const container = document.getElementById('landingScreen');
  if (!container) return;

  container.innerHTML = `
    <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 20px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif;">
      
      <!-- Landing Header -->
      <div style="width: 100%; display: flex; flex-direction: column; align-items: center; gap: 6px; margin-top: 6px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <i class="fa-solid fa-eye-slash" style="font-size: 2rem; color: #00E5FF;"></i>
          <h1 style="font-size: 2rem; margin: 0; font-weight: 900; letter-spacing: 1px; color: #00E5FF;">BLINDEYE</h1>
        </div>
        <span style="font-size: 0.8rem; font-weight: bold; color: #FFEE55; text-transform: uppercase; letter-spacing: 1px;">Accessible Multi-Sensory Platform</span>
      </div>

      <!-- Feature Grid -->
      <div style="width: 100%; display: flex; flex-direction: column; gap: 10px; margin: auto 0;">
        <div style="border: 1.5px solid #00E5FF; border-radius: 12px; padding: 10px 14px; background: rgba(0, 229, 255, 0.06);">
          <h3 style="margin: 0 0 2px 0; color: #00E5FF; font-size: 0.9rem;"><i class="fa-solid fa-code-branch"></i> AI Programmer Engine</h3>
          <p style="margin: 0; font-size: 0.75rem; color: #CBD5E1;">Single source-of-truth rule configurator & state machine graph.</p>
        </div>

        <div style="border: 1.5px solid #FFEE55; border-radius: 12px; padding: 10px 14px; background: rgba(255, 238, 85, 0.06);">
          <h3 style="margin: 0 0 2px 0; color: #FFEE55; font-size: 0.9rem;"><i class="fa-solid fa-mobile-screen"></i> Hardware Simulator & Tester</h3>
          <p style="margin: 0; font-size: 0.75rem; color: #CBD5E1;">Evaluates Programmer commands in real-time with sub-1ms local cache.</p>
        </div>

        <div style="border: 1.5px solid #10B981; border-radius: 12px; padding: 10px 14px; background: rgba(16, 185, 129, 0.06);">
          <h3 style="margin: 0 0 2px 0; color: #10B981; font-size: 0.9rem;"><i class="fa-solid fa-wave-square"></i> Multi-Modal Voice & Haptics</h3>
          <p style="margin: 0; font-size: 0.75rem; color: #CBD5E1;">Tactile motor vibration sequences, speech synthesis, & camera OCR.</p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div style="width: 100%; display: flex; flex-direction: column; gap: 8px; margin-bottom: 6px;">
        <button id="btnLandingStart" style="width: 100%; padding: 12px; border-radius: 10px; background: #00E5FF; color: #000000; font-weight: 900; font-size: 0.95rem; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <i class="fa-solid fa-play"></i> LAUNCH SIMULATOR SANDBOX
        </button>
        <button id="btnLandingProgrammer" style="width: 100%; padding: 10px; border-radius: 10px; background: rgba(0, 229, 255, 0.12); color: #00E5FF; font-weight: 800; font-size: 0.85rem; border: 1.5px solid #00E5FF; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <i class="fa-solid fa-code-branch"></i> AI PROGRAMMER (SOURCE OF TRUTH)
        </button>
        <button id="btnLandingPreview" style="width: 100%; padding: 10px; border-radius: 10px; background: transparent; color: #FFEE55; font-weight: 800; font-size: 0.85rem; border: 1.5px solid #FFEE55; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <i class="fa-solid fa-columns"></i> SPLIT PREVIEW (PARITY TEST)
        </button>
      </div>

    </div>
  `;

  document.getElementById('btnLandingStart')?.addEventListener('click', () => {
    navigateTo('simulatorScreen');
  });

  document.getElementById('btnLandingProgrammer')?.addEventListener('click', () => {
    navigateTo('programmerScreen');
  });

  document.getElementById('btnLandingPreview')?.addEventListener('click', () => {
    navigateTo('previewScreen');
  });
}
