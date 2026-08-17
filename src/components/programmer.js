import { saveProgrammerCommand, deleteProgrammerCommand, fetchCommands, fetchScreens, createScreen, deleteScreen, exportConfig, importConfig, onRuleUpdated, onScreenUpdated } from '../core/api.js';
import { Speech } from '../core/speech.js';
import { Haptic } from '../core/haptics.js';
import { navigateTo } from '../core/router.js';

export function renderProgrammerScreen(containerId = 'programmerScreen') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const isSplitPane = containerId !== 'programmerScreen';

  container.innerHTML = `
    <div style="width: 100%; height: 100%; box-sizing: border-box; padding: ${isSplitPane ? '12px' : '20px'}; display: flex; flex-direction: column; gap: 14px; background: #07090E; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; overflow-y: auto;">
      
      <!-- Top Title & Navigation Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #00E5FF; padding-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 38px; height: 38px; border-radius: 8px; background: rgba(0, 229, 255, 0.15); border: 1px solid #00E5FF; display: flex; align-items: center; justify-content: center;">
            <i class="fa-solid fa-code-branch" style="font-size: 1.4rem; color: #00E5FF;"></i>
          </div>
          <div>
            <h2 style="margin: 0; font-size: 1.25rem; color: #00E5FF; font-weight: 900; letter-spacing: 0.5px;">AI PROGRAMMER WORKBENCH</h2>
            <div style="display: flex; gap: 8px; align-items: center;">
              <span style="font-size: 0.7rem; color: #FFEE55; font-weight: bold;">★ SOURCE OF TRUTH ★</span>
              <span style="font-size: 0.65rem; color: #10B981; background: rgba(16,185,129,0.15); padding: 1px 6px; border-radius: 4px; border: 1px solid #10B981;">RULE AUTHORING ACTIVE</span>
            </div>
          </div>
        </div>
        ${!isSplitPane ? `
        <div style="display: flex; gap: 8px;">
          <button id="btnProgToSim" style="padding: 7px 12px; background: rgba(0, 229, 255, 0.12); border: 1px solid #00E5FF; color: #00E5FF; border-radius: 6px; font-weight: bold; font-size: 0.8rem; cursor: pointer;">
            <i class="fa-solid fa-mobile-screen"></i> Simulator
          </button>
          <button id="btnProgToPreview" style="padding: 7px 12px; background: rgba(255, 238, 85, 0.12); border: 1px solid #FFEE55; color: #FFEE55; border-radius: 6px; font-weight: bold; font-size: 0.8rem; cursor: pointer;">
            <i class="fa-solid fa-columns"></i> Split Preview
          </button>
        </div>` : ''}
      </div>

      <!-- Quick Preset & Profile Loader Bar -->
      <div style="display: flex; flex-wrap: wrap; gap: 8px; background: #0D121D; padding: 10px; border-radius: 10px; border: 1px solid #1F293D; align-items: center;">
        <span style="font-size: 0.75rem; color: #94A3B8; font-weight: bold; text-transform: uppercase;"><i class="fa-solid fa-wand-magic-sparkles"></i> Profiles:</span>
        <button class="prog-preset-btn" data-profile="standard" style="padding: 4px 10px; background: #1E293B; color: #00E5FF; border: 1px solid #00E5FF; border-radius: 6px; font-size: 0.75rem; font-weight: bold; cursor: pointer;">Standard Blind</button>
        <button class="prog-preset-btn" data-profile="deafblind" style="padding: 4px 10px; background: #1E293B; color: #FFEE55; border: 1px solid #FFEE55; border-radius: 6px; font-size: 0.75rem; font-weight: bold; cursor: pointer;">Deaf-Blind Morse</button>
        <button class="prog-preset-btn" data-profile="simple" style="padding: 4px 10px; background: #1E293B; color: #10B981; border: 1px solid #10B981; border-radius: 6px; font-size: 0.75rem; font-weight: bold; cursor: pointer;">Motor-Simplified</button>
        
        <div style="margin-left: auto; display: flex; gap: 6px;">
          <button id="${containerId}_btnExport" style="padding: 4px 10px; background: #1E293B; color: #CBD5E1; border: 1px solid #475569; border-radius: 6px; font-size: 0.75rem; cursor: pointer;">
            <i class="fa-solid fa-download"></i> Export JSON
          </button>
          <button id="${containerId}_btnImport" style="padding: 4px 10px; background: #1E293B; color: #CBD5E1; border: 1px solid #475569; border-radius: 6px; font-size: 0.75rem; cursor: pointer;">
            <i class="fa-solid fa-upload"></i> Import JSON
          </button>
        </div>
      </div>

      <!-- State Machine Visual Screen Registry -->
      <div style="border: 1px solid #1E293D; border-radius: 12px; padding: 12px; background: #0B0F17;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <h4 style="margin: 0; color: #00E5FF; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px;">
            <i class="fa-solid fa-diagram-project"></i> Screen State Nodes
          </h4>
          <div style="display: flex; gap: 6px;">
            <input type="text" id="${containerId}_newScreenId" placeholder="New screenId..." style="padding: 3px 8px; background: #151D2C; color: #FFF; border: 1px solid #334155; border-radius: 4px; font-size: 0.75rem; width: 110px;">
            <button id="${containerId}_btnAddScreen" style="padding: 3px 8px; background: #00E5FF; color: #000; border: none; border-radius: 4px; font-weight: bold; font-size: 0.75rem; cursor: pointer;">+ Add</button>
          </div>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 6px;" id="${containerId}_progStateNodes">
          <!-- Populated dynamically -->
        </div>
      </div>

      <!-- Contextual Command Rule Authoring Form -->
      <div style="border: 1.5px solid #00E5FF; border-radius: 12px; padding: 14px; background: #0D131F; display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h4 style="margin: 0; color: #00E5FF; font-size: 0.95rem; font-weight: 800;">
            <i class="fa-solid fa-sliders"></i> CONTEXTUAL COMMAND BUILDER
          </h4>
          <span style="font-size: 0.7rem; color: #94A3B8;">Define rule ➔ Broadcasts live</span>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div>
            <label style="font-size: 0.7rem; color: #94A3B8; display: block; margin-bottom: 3px; font-weight: bold;">TARGET SCREEN ID</label>
            <select id="${containerId}_progScreenSelect" style="width: 100%; padding: 7px; background: #151D2C; color: #00E5FF; border: 1px solid #334155; border-radius: 6px; font-weight: bold; font-size: 0.8rem;">
              <!-- Populated dynamically -->
            </select>
          </div>

          <div>
            <label style="font-size: 0.7rem; color: #94A3B8; display: block; margin-bottom: 3px; font-weight: bold;">GESTURE CODE</label>
            <select id="${containerId}_progGestureSelect" style="width: 100%; padding: 7px; background: #151D2C; color: #FFEE55; border: 1px solid #334155; border-radius: 6px; font-weight: bold; font-size: 0.8rem;">
              <option value="SWIPE_RIGHT">SWIPE_RIGHT</option>
              <option value="SWIPE_LEFT">SWIPE_LEFT</option>
              <option value="SWIPE_UP">SWIPE_UP</option>
              <option value="SWIPE_DOWN">SWIPE_DOWN</option>
              <option value="DOUBLE_TAP">DOUBLE_TAP</option>
              <option value="LONG_PRESS">LONG_PRESS</option>
              <option value="TWO_FINGER_TAP">TWO_FINGER_TAP</option>
            </select>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div>
            <label style="font-size: 0.7rem; color: #94A3B8; display: block; margin-bottom: 3px; font-weight: bold;">ACTION TYPE</label>
            <select id="${containerId}_progActionSelect" style="width: 100%; padding: 7px; background: #151D2C; color: #FFF; border: 1px solid #334155; border-radius: 6px; font-size: 0.8rem;">
              <option value="NAVIGATE">NAVIGATE</option>
              <option value="NAVIGATE_NEXT">NAVIGATE_NEXT</option>
              <option value="NAVIGATE_PREV">NAVIGATE_PREV</option>
              <option value="SELECT_ITEM">SELECT_ITEM</option>
              <option value="TRIGGER_TTS">TRIGGER_TTS</option>
              <option value="AI_OCR_SCAN">AI_OCR_SCAN</option>
              <option value="AI_SCENE_DESCRIBE">AI_SCENE_DESCRIBE</option>
              <option value="TOGGLE_FLASH">TOGGLE_FLASH</option>
              <option value="CALL_CONTACT">CALL_CONTACT</option>
              <option value="READ_MESSAGE">READ_MESSAGE</option>
              <option value="PLAY_MORSE">PLAY_MORSE</option>
              <option value="START_GPS_GUIDE">START_GPS_GUIDE</option>
              <option value="CYCLE_SETTING">CYCLE_SETTING</option>
              <option value="DISPATCH_SOS">DISPATCH_SOS</option>
            </select>
          </div>

          <div>
            <label style="font-size: 0.7rem; color: #94A3B8; display: block; margin-bottom: 3px; font-weight: bold;">HAPTIC SIGNATURE</label>
            <select id="${containerId}_progHapticSelect" style="width: 100%; padding: 7px; background: #151D2C; color: #FFF; border: 1px solid #334155; border-radius: 6px; font-size: 0.8rem;">
              <option value="short">Short Pulse (40ms)</option>
              <option value="long">Long Pulse (150ms)</option>
              <option value="success">Success Chime Pattern</option>
              <option value="error">Error Alert Pattern</option>
              <option value="warning">Warning Pulse</option>
              <option value="sos">SOS Emergency Morse</option>
            </select>
          </div>
        </div>

        <div>
          <label style="font-size: 0.7rem; color: #94A3B8; display: block; margin-bottom: 3px; font-weight: bold;">SPOKEN TTS OUTPUT STRING</label>
          <input type="text" id="${containerId}_progTtsInput" placeholder="e.g. Flashlight toggled on." style="width: 100%; padding: 8px; background: #151D2C; color: #FFF; border: 1px solid #334155; border-radius: 6px; box-sizing: border-box; font-size: 0.85rem;">
        </div>

        <button id="${containerId}_btnSaveRule" style="width: 100%; padding: 10px; background: #00E5FF; color: #000; font-weight: 900; border: none; border-radius: 8px; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <i class="fa-solid fa-floppy-disk"></i> COMMIT RULE & BROADCAST LIVE
        </button>
      </div>

      <!-- Master Database Rules Explorer -->
      <div style="border: 1px solid #1E293D; border-radius: 12px; padding: 12px; background: #0B0F17; flex: 1; display: flex; flex-direction: column; min-height: 180px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <h4 style="margin: 0; color: #FFEE55; font-size: 0.85rem; text-transform: uppercase;">
              <i class="fa-solid fa-database"></i> Master Command Registry
            </h4>
            <span id="${containerId}_rulesCount" style="font-size: 0.7rem; color: #94A3B8; background: #151D2C; padding: 2px 6px; border-radius: 10px;">0 rules</span>
          </div>
          <div style="display: flex; gap: 6px; align-items: center;">
            <select id="${containerId}_filterScreen" style="padding: 3px 8px; background: #151D2C; color: #CBD5E1; border: 1px solid #334155; border-radius: 4px; font-size: 0.75rem;">
              <option value="ALL">All Screens</option>
            </select>
            <button id="${containerId}_btnRefresh" style="padding: 3px 8px; background: #1E293B; color: #FFF; border: 1px solid #334155; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">
              <i class="fa-solid fa-arrows-rotate"></i>
            </button>
          </div>
        </div>
        <div id="${containerId}_progRulesList" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; max-height: 240px;">
          <!-- Dynamically populated rules -->
        </div>
      </div>

    </div>
  `;

  // Bind top navigation buttons if present
  if (!isSplitPane) {
    document.getElementById('btnProgToSim')?.addEventListener('click', () => navigateTo('simulatorScreen'));
    document.getElementById('btnProgToPreview')?.addEventListener('click', () => navigateTo('previewScreen'));
  }

  // Save Rule Handler
  document.getElementById(`${containerId}_btnSaveRule`)?.addEventListener('click', async () => {
    const screenId = document.getElementById(`${containerId}_progScreenSelect`).value;
    const gestureCode = document.getElementById(`${containerId}_progGestureSelect`).value;
    const actionType = document.getElementById(`${containerId}_progActionSelect`).value;
    const hapticPattern = document.getElementById(`${containerId}_progHapticSelect`).value;
    const ttsPrompt = document.getElementById(`${containerId}_progTtsInput`).value.trim() || 'Action executed.';

    const ruleData = {
      screen_id: screenId,
      gesture_code: gestureCode,
      sub_context: 'DEFAULT',
      action_type: actionType,
      haptic_pattern: hapticPattern,
      action_payload: { tts: ttsPrompt, target: screenId },
      created_by: 'AI_PROGRAMMER_ENGINE'
    };

    Haptic.trigger('success');
    Speech.speak(`Rule saved for ${gestureCode} on ${screenId}`);

    const res = await saveProgrammerCommand(ruleData);
    if (res.success) {
      loadProgrammerData(containerId);
    } else {
      Haptic.trigger('error');
      Speech.speak("Failed to save rule.");
    }
  });

  // Add Screen Handler
  document.getElementById(`${containerId}_btnAddScreen`)?.addEventListener('click', async () => {
    const input = document.getElementById(`${containerId}_newScreenId`);
    const newId = input.value.trim();
    if (!newId) return;

    const res = await createScreen({ id: newId, name: newId, parent_screen_id: 'mainMenuScreen' });
    if (res.success) {
      input.value = '';
      Haptic.trigger('success');
      loadProgrammerData(containerId);
    }
  });

  // Export & Import Handlers
  document.getElementById(`${containerId}_btnExport`)?.addEventListener('click', async () => {
    const res = await exportConfig();
    if (res.success) {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `blindeye_rules_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      Speech.speak("Rules exported to JSON.");
    }
  });

  document.getElementById(`${containerId}_btnImport`)?.addEventListener('click', () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const config = JSON.parse(evt.target.result);
          const res = await importConfig(config, false);
          if (res.success) {
            Haptic.trigger('success');
            Speech.speak("Configuration imported successfully.");
            loadProgrammerData(containerId);
          }
        } catch (err) {
          Haptic.trigger('error');
          Speech.speak("Invalid JSON file.");
        }
      };
      reader.readAsText(file);
    };
    fileInput.click();
  });

  // Filter change handler
  document.getElementById(`${containerId}_filterScreen`)?.addEventListener('change', () => {
    loadProgrammerData(containerId);
  });

  // Refresh button
  document.getElementById(`${containerId}_btnRefresh`)?.addEventListener('click', () => {
    loadProgrammerData(containerId);
  });

  // Presets profile buttons
  container.querySelectorAll('.prog-preset-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const profile = btn.getAttribute('data-profile');
      Haptic.trigger('success');
      Speech.speak(`Loading ${profile} profile preset.`);
      // Profile specific logic
      if (profile === 'deafblind') {
        await saveProgrammerCommand({
          screen_id: 'messagesView',
          gesture_code: 'DOUBLE_TAP',
          sub_context: 'DEFAULT',
          action_type: 'PLAY_MORSE',
          haptic_pattern: 'sos',
          action_payload: { tts: 'Morse output sequence active.' }
        });
      }
      loadProgrammerData(containerId);
    });
  });

  // Real-time synchronization hooks
  onRuleUpdated(() => loadProgrammerData(containerId));
  onScreenUpdated(() => loadProgrammerData(containerId));

  loadProgrammerData(containerId);
}

async function loadProgrammerData(containerId) {
  const nodesContainer = document.getElementById(`${containerId}_progStateNodes`);
  const screenSelect = document.getElementById(`${containerId}_progScreenSelect`);
  const filterSelect = document.getElementById(`${containerId}_filterScreen`);
  const rulesContainer = document.getElementById(`${containerId}_progRulesList`);
  const rulesCountEl = document.getElementById(`${containerId}_rulesCount`);

  if (!rulesContainer) return;

  try {
    const [screensRes, commandsRes] = await Promise.all([
      fetchScreens(),
      fetchCommands()
    ]);

    // Populate screens list & state nodes
    if (screensRes.success && screensRes.screens) {
      const currentSelected = screenSelect ? screenSelect.value : null;
      const currentFilter = filterSelect ? filterSelect.value : 'ALL';

      if (nodesContainer) {
        nodesContainer.innerHTML = screensRes.screens.map(s => `
          <div style="padding: 4px 8px; border-radius: 16px; background: #151D2C; border: 1px solid #334155; color: #E2E8F0; font-size: 0.75rem; display: flex; align-items: center; gap: 4px;">
            <span style="font-weight: bold;">${s.id}</span>
            <i class="fa-solid fa-xmark prog-delete-screen" data-id="${s.id}" style="color: #64748B; cursor: pointer; font-size: 0.7rem;" title="Delete screen"></i>
          </div>
        `).join('');

        // Bind delete screen buttons
        nodesContainer.querySelectorAll('.prog-delete-screen').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            if (confirm(`Delete screen "${id}" and all its rules?`)) {
              await deleteScreen(id);
              loadProgrammerData(containerId);
            }
          });
        });
      }

      if (screenSelect) {
        screenSelect.innerHTML = screensRes.screens.map(s => `
          <option value="${s.id}">${s.id} (${s.name})</option>
        `).join('');
        if (currentSelected) screenSelect.value = currentSelected;
      }

      if (filterSelect) {
        filterSelect.innerHTML = `<option value="ALL">All Screens</option>` + screensRes.screens.map(s => `
          <option value="${s.id}">${s.id}</option>
        `).join('');
        if (currentFilter) filterSelect.value = currentFilter;
      }
    }

    // Populate rules table
    if (commandsRes.success && commandsRes.commands) {
      const filterVal = filterSelect ? filterSelect.value : 'ALL';
      const filtered = filterVal === 'ALL' ? commandsRes.commands : commandsRes.commands.filter(c => c.screen_id === filterVal);

      if (rulesCountEl) rulesCountEl.innerText = `${filtered.length} rules`;

      if (filtered.length === 0) {
        rulesContainer.innerHTML = `<div style="text-align: center; color: #64748B; font-size: 0.75rem; padding: 12px;">No rules found for this screen. Add one above!</div>`;
      } else {
        rulesContainer.innerHTML = filtered.map(cmd => {
          const payload = typeof cmd.action_payload === 'string' ? JSON.parse(cmd.action_payload) : cmd.action_payload;
          return `
            <div style="border: 1px solid #1E293B; border-radius: 8px; padding: 8px 10px; background: #131926; display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem;">
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="color: #00E5FF; font-weight: bold;">[${cmd.screen_id}]</span>
                  <span style="color: #FFEE55; font-weight: bold; background: rgba(255,238,85,0.1); padding: 1px 4px; border-radius: 3px;">${cmd.gesture_code}</span>
                  <span style="color: #94A3B8;">➔ ${cmd.action_type}</span>
                  <span style="color: #10B981; font-size: 0.65rem;">(${cmd.haptic_pattern})</span>
                </div>
                <div style="color: #CBD5E1; font-size: 0.7rem; font-style: italic;">"${payload.tts || ''}"</div>
              </div>
              <button class="prog-delete-rule-btn" data-id="${cmd.id}" style="background: rgba(239,68,68,0.15); border: 1px solid #EF4444; color: #EF4444; border-radius: 4px; padding: 3px 6px; cursor: pointer; font-size: 0.7rem;" title="Delete Rule">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          `;
        }).join('');

        // Bind delete rule buttons
        rulesContainer.querySelectorAll('.prog-delete-rule-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const ruleId = btn.getAttribute('data-id');
            Haptic.trigger('error');
            await deleteProgrammerCommand(ruleId);
            loadProgrammerData(containerId);
          });
        });
      }
    }
  } catch (e) {
    if (rulesContainer) {
      rulesContainer.innerHTML = `<span style="color: #FF5555; font-size: 0.75rem;">Failed to connect to backend server.</span>`;
    }
  }
}
