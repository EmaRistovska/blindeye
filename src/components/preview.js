import { renderProgrammerScreen } from './programmer.js';
import { renderSimulatorScreen } from './simulator.js';
import { navigateTo } from '../core/router.js';

export function renderPreviewScreen() {
  const container = document.getElementById('previewScreen');
  if (!container) return;

  container.innerHTML = `
    <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 10px; display: flex; flex-direction: column; gap: 8px; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; overflow: hidden;">
      
      <!-- Top Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #00E5FF; padding-bottom: 6px; flex-shrink: 0;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-columns" style="font-size: 1.3rem; color: #FFEE55;"></i>
          <div>
            <h3 style="margin: 0; font-size: 1rem; color: #FFEE55; font-weight: 900; letter-spacing: 0.5px;">SPLIT PREVIEW: AI PROGRAMMER vs SIMULATOR PARITY</h3>
            <span style="font-size: 0.65rem; color: #10B981; font-weight: bold;">LIVE BIDIRECTIONAL SYNC ACTIVE</span>
          </div>
        </div>
        <div style="display: flex; gap: 6px;">
          <button id="btnPrevToProg" style="padding: 5px 10px; background: #111827; color: #00E5FF; border: 1px solid #00E5FF; border-radius: 6px; font-size: 0.75rem; font-weight: bold; cursor: pointer;">
            <i class="fa-solid fa-code-branch"></i> Full Programmer
          </button>
          <button id="btnPrevToSim" style="padding: 5px 10px; background: #111827; color: #FFEE55; border: 1px solid #FFEE55; border-radius: 6px; font-size: 0.75rem; font-weight: bold; cursor: pointer;">
            <i class="fa-solid fa-mobile-screen"></i> Full Simulator
          </button>
        </div>
      </div>

      <!-- Split Pane Container Grid (Left: Programmer, Right: Simulator) -->
      <div style="display: grid; grid-template-columns: 1.15fr 1fr; gap: 10px; height: calc(100% - 46px); width: 100%; overflow: hidden;">
        
        <!-- Left Pane: AI Programmer Engine -->
        <div style="border: 1.5px solid #00E5FF; border-radius: 10px; overflow: hidden; height: 100%; background: #07090E; display: flex; flex-direction: column;">
          <div id="previewProgContainer" style="width: 100%; height: 100%; overflow-y: auto;"></div>
        </div>

        <!-- Right Pane: Standalone Simulator -->
        <div style="border: 1.5px solid #FFEE55; border-radius: 10px; overflow: hidden; height: 100%; background: #030712; display: flex; flex-direction: column;">
          <div id="previewSimContainer" style="width: 100%; height: 100%; overflow-y: auto;"></div>
        </div>

      </div>

    </div>
  `;

  // Bind top bar buttons
  document.getElementById('btnPrevToProg')?.addEventListener('click', () => navigateTo('programmerScreen'));
  document.getElementById('btnPrevToSim')?.addEventListener('click', () => navigateTo('simulatorScreen'));

  // Render isolated sub-components inside distinct pane IDs (no duplicate DOM IDs)
  renderProgrammerScreen('previewProgContainer');
  renderSimulatorScreen('previewSimContainer');
}
