import { navigateTo } from '../core/router.js';

export function renderLandingScreen() {
  const container = document.getElementById('landingScreen');
  if (!container) return;

  container.innerHTML = `
    <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 20px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif;">
      
      <div style="width: 100%; display: flex; flex-direction: column; align-items: center; gap: 8px; margin-top: 12px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <i class="fa-solid fa-eye-slash" style="font-size: 2rem; color: #00E5FF;"></i>
          <h1 style="font-size: 2rem; margin: 0; font-weight: 900; letter-spacing: 1px; color: #00E5FF;">BLINDEYE</h1>
        </div>
        <span style="font-size: 0.8rem; font-weight: bold; color: #FFEE55; text-transform: uppercase; letter-spacing: 1px;">Choose a workspace</span>
      </div>

      <div style="width: 100%; display: grid; gap: 14px; margin: auto 0;">
        <button id="btnLandingProgrammer" style="width: 100%; min-height: 160px; padding: 22px; border-radius: 16px; background: rgba(0, 229, 255, 0.10); color: #FFFFFF; border: 2px solid #00E5FF; cursor: pointer; text-align: left;">
          <i class="fa-solid fa-code-branch" style="display: block; font-size: 2rem; color: #00E5FF; margin-bottom: 12px;"></i>
          <strong style="display: block; font-size: 1.1rem; color: #00E5FF;">PROGRAMMER</strong>
          <span style="display: block; margin-top: 6px; font-size: 0.8rem; color: #CBD5E1; line-height: 1.4;">Create, edit, save, export, and publish gesture rules. This is the source of truth.</span>
        </button>
        <button id="btnLandingSimulator" style="width: 100%; min-height: 160px; padding: 22px; border-radius: 16px; background: rgba(255, 238, 85, 0.08); color: #FFFFFF; border: 2px solid #FFEE55; cursor: pointer; text-align: left;">
          <i class="fa-solid fa-mobile-screen" style="display: block; font-size: 2rem; color: #FFEE55; margin-bottom: 12px;"></i>
          <strong style="display: block; font-size: 1.1rem; color: #FFEE55;">SIMULATOR</strong>
          <span style="display: block; margin-top: 6px; font-size: 0.8rem; color: #CBD5E1; line-height: 1.4;">Test saved rules immediately with live TTS, haptic output, and a local rule cache.</span>
        </button>
      </div>

    </div>
  `;

  document.getElementById('btnLandingProgrammer')?.addEventListener('click', () => {
    navigateTo('programmerScreen');
  });

  document.getElementById('btnLandingSimulator')?.addEventListener('click', () => {
    navigateTo('simulatorScreen');
  });
}
