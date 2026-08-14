import { renderProgrammerScreen } from './programmer.js';
import { renderSimulatorScreen } from './simulator.js';
import { navigateTo } from '../core/router.js';

export function renderPreviewScreen() {
  const container = document.getElementById('previewScreen');
  if (!container) return;

  container.innerHTML = `
    <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 12px; display: flex; flex-direction: column; gap: 8px; background: #000000; color: #FFFFFF; font-family: system-ui, -apple-system, sans-serif; overflow: hidden;">
      
      <!-- Top Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #00E5FF; padding-bottom: 8px; flex-shrink: 0;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-columns" style="font-size: 1.5rem; color: #FFEE55;"></i>
          <h3 style="margin: 0; font-size: 1.1rem; color: #FFEE55; font-weight: 900;">SPLIT PREVIEW: PROGRAMMER vs SIMULATOR PARITY TEST</h3>
        </div>
        <div style="display: flex; gap: 6px;">
          <button id="btnPrevToProg" style="padding: 6px 10px; background: #222; color: #00E5FF; border: 1px solid #00E5FF; border-radius: 6px; font-size: 0.75rem; font-weight: bold; cursor: pointer;">
            Full Programmer
          </button>
          <button id="btnPrevToSim" style="padding: 6px 10px; background: #222; color: #FFEE55; border: 1px solid #FFEE55; border-radius: 6px; font-size: 0.75rem; font-weight: bold; cursor: pointer;">
            Full Simulator
          </button>
        </div>
      </div>

      <!-- Split Pane Wrapper -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; height: calc(100% - 45px); width: 100%; overflow: hidden;">
        
        <!-- Left Pane: AI Programmer Engine -->
        <div id="previewLeftPane" style="border: 1.5px solid #00E5FF; border-radius: 12px; overflow: hidden; height: 100%;">
          <div id="programmerScreen" class="screen-view" style="display: flex; height: 100%;"></div>
        </div>

        <!-- Right Pane: Standalone Simulator -->
        <div id="previewRightPane" style="border: 1.5px solid #FFEE55; border-radius: 12px; overflow: hidden; height: 100%;">
          <div id="simulatorScreen" class="screen-view" style="display: flex; height: 100%;"></div>
        </div>

      </div>

    </div>
  `;

  // Bind top bar buttons
  document.getElementById('btnPrevToProg')?.addEventListener('click', () => navigateTo('programmerScreen'));
  document.getElementById('btnPrevToSim')?.addEventListener('click', () => navigateTo('simulatorScreen'));

  // Render sub-components inside panes
  renderProgrammerScreen();
  renderSimulatorScreen();
}
