import { navigateTo } from '../core/router.js';

export function renderLandingScreen() {
  const container = document.getElementById('landingScreen');
  if (!container) return;

  container.innerHTML = `
    <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 20px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif;">
      
      <div style="width: 100%; display: flex; flex-direction: column; align-items: center; gap: 8px; margin-top: 12px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <i class="fa-solid fa-eye-slash" style="font-size: 2rem; color: #FFEE55;"></i>
          <h1 style="font-size: 2rem; margin: 0; font-weight: 900; letter-spacing: 1px; color: #FFEE55;">BLINDEYE</h1>
        </div>
        <span style="font-size: 0.8rem; font-weight: bold; color: #FFEE55; text-transform: uppercase; letter-spacing: 1px;">Choose a workspace</span>
      </div>

      <div style="width: 100%; display: grid; gap: 10px; margin: auto 0;">
        <button id="btnLandingMobile" style="width: 100%; min-height: 100px; padding: 16px; border-radius: 14px; background: rgba(16, 185, 129, 0.12); color: #FFFFFF; border: 2px solid #10B981; cursor: pointer; text-align: left;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
            <i class="fa-solid fa-mobile-screen" style="font-size: 1.5rem; color: #10B981;"></i>
            <strong style="font-size: 1.05rem; color: #10B981;">MOBILE ACCESSIBILITY APP</strong>
          </div>
          <span style="display: block; font-size: 0.76rem; color: #CBD5E1; line-height: 1.3;">Experience the full 5-category gesture carousel interface with haptics & TTS.</span>
        </button>

        <button id="btnLandingProgrammer" style="width: 100%; min-height: 100px; padding: 16px; border-radius: 14px; background: rgba(0, 229, 255, 0.10); color: #FFFFFF; border: 2px solid #00E5FF; cursor: pointer; text-align: left;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
            <i class="fa-solid fa-code-branch" style="font-size: 1.5rem; color: #00E5FF;"></i>
            <strong style="font-size: 1.05rem; color: #00E5FF;">AI PROGRAMMER WORKBENCH</strong>
          </div>
          <span style="display: block; font-size: 0.76rem; color: #CBD5E1; line-height: 1.3;">Author and edit gesture rules with the visual canvas. Source of truth.</span>
        </button>

        <button id="btnLandingSimulator" style="width: 100%; min-height: 100px; padding: 16px; border-radius: 14px; background: rgba(255, 238, 85, 0.08); color: #FFFFFF; border: 2px solid #FFEE55; cursor: pointer; text-align: left;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
            <i class="fa-solid fa-gamepad" style="font-size: 1.5rem; color: #FFEE55;"></i>
            <strong style="font-size: 1.05rem; color: #FFEE55;">HARDWARE SIMULATOR</strong>
          </div>
          <span style="display: block; font-size: 0.76rem; color: #CBD5E1; line-height: 1.3;">Test gesture rules in sandbox with sub-ms local cache parity inspector.</span>
        </button>
      </div>

    </div>
  `;

  document.getElementById('btnLandingMobile')?.addEventListener('click', () => {
    navigateTo('mainMenuScreen');
  });

  document.getElementById('btnLandingProgrammer')?.addEventListener('click', () => {
    navigateTo('programmerScreen');
  });

  document.getElementById('btnLandingSimulator')?.addEventListener('click', () => {
    navigateTo('simulatorScreen');
  });
}

