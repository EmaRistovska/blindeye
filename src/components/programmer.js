import { saveProgrammerCommand } from '../core/api.js';
import { Speech } from '../core/speech.js';
import { Haptic } from '../core/haptics.js';
import { navigateTo } from '../core/router.js';

export function renderProgrammerScreen() {
  const container = document.getElementById('programmerScreen');
  if (!container) return;

  container.innerHTML = `
    <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 20px; display: flex; flex-direction: column; gap: 16px; background: #080808; color: #FFFFFF; font-family: system-ui, -apple-system, sans-serif; overflow-y: auto;">
      
      <!-- Top Title & Navigation Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #00E5FF; padding-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <i class="fa-solid fa-code-branch" style="font-size: 1.8rem; color: #00E5FF;"></i>
          <div>
            <h2 style="margin: 0; font-size: 1.4rem; color: #00E5FF; font-weight: 900;">AI PROGRAMMER ENGINE</h2>
            <span style="font-size: 0.75rem; color: #FFEE55; font-weight: bold;">★ SINGLE SOURCE OF TRUTH ★</span>
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="btnProgToSim" style="padding: 8px 12px; background: rgba(0, 229, 255, 0.15); border: 1px solid #00E5FF; color: #00E5FF; border-radius: 8px; font-weight: bold; cursor: pointer;">
            <i class="fa-solid fa-mobile-screen"></i> Simulator
          </button>
          <button id="btnProgToPreview" style="padding: 8px 12px; background: rgba(255, 238, 85, 0.15); border: 1px solid #FFEE55; color: #FFEE55; border-radius: 8px; font-weight: bold; cursor: pointer;">
            <i class="fa-solid fa-columns"></i> Split Preview
          </button>
        </div>
      </div>

      <!-- State Machine Visual Graph -->
      <div style="border: 1px solid #333; border-radius: 12px; padding: 14px; background: #111111;">
        <h4 style="margin: 0 0 10px 0; color: #00E5FF; font-size: 0.9rem;"><i class="fa-solid fa-diagram-project"></i> ACTIVE SCREEN STATE GRAPH</h4>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;" id="progStateNodes">
          <span class="state-node" style="padding: 6px 12px; border-radius: 20px; background: #00E5FF; color: #000; font-weight: 800; font-size: 0.8rem;">welcomeScreen</span>
          <span class="state-node" style="padding: 6px 12px; border-radius: 20px; background: #222; border: 1px solid #555; color: #EEE; font-size: 0.8rem;">mainMenuScreen</span>
          <span class="state-node" style="padding: 6px 12px; border-radius: 20px; background: #222; border: 1px solid #555; color: #EEE; font-size: 0.8rem;">cameraView</span>
          <span class="state-node" style="padding: 6px 12px; border-radius: 20px; background: #222; border: 1px solid #555; color: #EEE; font-size: 0.8rem;">messagesView</span>
          <span class="state-node" style="padding: 6px 12px; border-radius: 20px; background: #222; border: 1px solid #555; color: #EEE; font-size: 0.8rem;">phoneView</span>
          <span class="state-node" style="padding: 6px 12px; border-radius: 20px; background: #222; border: 1px solid #555; color: #EEE; font-size: 0.8rem;">settingsView</span>
        </div>
      </div>

      <!-- Contextual Command Rule Form -->
      <div style="border: 1.5px solid #00E5FF; border-radius: 14px; padding: 16px; background: #101010; display: flex; flex-direction: column; gap: 12px;">
        <h4 style="margin: 0; color: #00E5FF; font-size: 1rem;"><i class="fa-solid fa-sliders"></i> CONTEXTUAL RULE CONFIGURATOR</h4>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div>
            <label style="font-size: 0.75rem; color: #AAA; display: block; margin-bottom: 4px;">TARGET SCREEN ID</label>
            <select id="progScreenSelect" style="width: 100%; padding: 8px; background: #222; color: #FFF; border: 1px solid #444; border-radius: 6px;">
              <option value="welcomeScreen">welcomeScreen</option>
              <option value="mainMenuScreen">mainMenuScreen</option>
              <option value="cameraView">cameraView</option>
              <option value="messagesView">messagesView</option>
              <option value="phoneView">phoneView</option>
              <option value="settingsView">settingsView</option>
            </select>
          </div>

          <div>
            <label style="font-size: 0.75rem; color: #AAA; display: block; margin-bottom: 4px;">GESTURE CODE</label>
            <select id="progGestureSelect" style="width: 100%; padding: 8px; background: #222; color: #FFF; border: 1px solid #444; border-radius: 6px;">
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

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div>
            <label style="font-size: 0.75rem; color: #AAA; display: block; margin-bottom: 4px;">ACTION TYPE</label>
            <select id="progActionSelect" style="width: 100%; padding: 8px; background: #222; color: #FFF; border: 1px solid #444; border-radius: 6px;">
              <option value="NAVIGATE">NAVIGATE</option>
              <option value="TRIGGER_TTS">TRIGGER_TTS</option>
              <option value="AI_OCR_SCAN">AI_OCR_SCAN</option>
              <option value="TOGGLE_FLASH">TOGGLE_FLASH</option>
              <option value="SELECT_ITEM">SELECT_ITEM</option>
            </select>
          </div>

          <div>
            <label style="font-size: 0.75rem; color: #AAA; display: block; margin-bottom: 4px;">HAPTIC PATTERN</label>
            <select id="progHapticSelect" style="width: 100%; padding: 8px; background: #222; color: #FFF; border: 1px solid #444; border-radius: 6px;">
              <option value="short">Short Pulse</option>
              <option value="long">Long Pulse</option>
              <option value="success">Success Chime</option>
              <option value="error">Error Vibration</option>
              <option value="warning">Warning Vibration</option>
            </select>
          </div>
        </div>

        <div>
          <label style="font-size: 0.75rem; color: #AAA; display: block; margin-bottom: 4px;">SPOKEN TTS PROMPT</label>
          <input type="text" id="progTtsInput" placeholder="e.g. Camera flash enabled." style="width: 100%; padding: 8px; background: #222; color: #FFF; border: 1px solid #444; border-radius: 6px; box-sizing: border-box;">
        </div>

        <button id="btnProgSaveRule" style="width: 100%; padding: 12px; background: #00E5FF; color: #000; font-weight: 900; border: none; border-radius: 8px; cursor: pointer; margin-top: 4px;">
          <i class="fa-solid fa-floppy-disk"></i> SAVE RULE & BROADCAST TO SIMULATOR
        </button>
      </div>

      <!-- Active Database Rules Grid -->
      <div style="border: 1px solid #333; border-radius: 12px; padding: 14px; background: #111111;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h4 style="margin: 0; color: #FFEE55; font-size: 0.9rem;"><i class="fa-solid fa-database"></i> ACTIVE MASTER DATABASE RULES</h4>
          <button id="btnProgRefreshRules" style="padding: 4px 10px; background: #222; color: #FFF; border: 1px solid #555; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">Refresh</button>
        </div>
        <div id="progRulesList" style="max-height: 180px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px;">
          <!-- Dynamically populated rules -->
        </div>
      </div>

    </div>
  `;

  // Bind navigation buttons
  document.getElementById('btnProgToSim')?.addEventListener('click', () => navigateTo('simulatorScreen'));
  document.getElementById('btnProgToPreview')?.addEventListener('click', () => navigateTo('previewScreen'));

  // Bind Save Rule button
  document.getElementById('btnProgSaveRule')?.addEventListener('click', async () => {
    const screenId = document.getElementById('progScreenSelect').value;
    const gestureCode = document.getElementById('progGestureSelect').value;
    const actionType = document.getElementById('progActionSelect').value;
    const hapticPattern = document.getElementById('progHapticSelect').value;
    const ttsPrompt = document.getElementById('progTtsInput').value || 'Action executed.';

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
    Speech.speak("Saving rule to master database and broadcasting via WebSockets.");

    const res = await saveProgrammerCommand(ruleData);
    if (res.success) {
      loadProgrammerRules();
      Speech.speak("Rule broadcast successful.");
    } else {
      Haptic.trigger('error');
      Speech.speak("Failed to save rule.");
    }
  });

  // Refresh rules table
  document.getElementById('btnProgRefreshRules')?.addEventListener('click', loadProgrammerRules);

  loadProgrammerRules();
}

async function loadProgrammerRules() {
  const container = document.getElementById('progRulesList');
  if (!container) return;

  try {
    const res = await fetch('http://localhost:5000/api/commands');
    const data = await res.json();

    if (data.success && data.commands) {
      container.innerHTML = data.commands.map(cmd => {
        const payload = typeof cmd.action_payload === 'string' ? JSON.parse(cmd.action_payload) : cmd.action_payload;
        return `
          <div style="border: 1px solid #333; border-radius: 6px; padding: 8px 10px; background: #181818; display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem;">
            <div>
              <span style="color: #00E5FF; font-weight: bold;">[${cmd.screen_id}]</span>
              <span style="color: #FFEE55; font-weight: bold; margin-left: 6px;">${cmd.gesture_code}</span>
              <span style="color: #AAA; margin-left: 8px;">➔ ${cmd.action_type}</span>
            </div>
            <div style="color: #888; font-size: 0.75rem;">"${payload.tts || ''}"</div>
          </div>
        `;
      }).join('');
    }
  } catch (e) {
    container.innerHTML = `<span style="color: #FF5555; font-size: 0.8rem;">Failed to connect to backend server.</span>`;
  }
}
