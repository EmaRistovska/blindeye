import { initWebSocketSync, onRuleUpdated, resolveContextualCommand } from '../core/api.js';
import { Speech } from '../core/speech.js';
import { Haptic } from '../core/haptics.js';
import { navigateTo } from '../core/router.js';

export function renderSimulatorScreen() {
  const container = document.getElementById('simulatorScreen');
  if (!container) return;

  container.innerHTML = `
    <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 16px; display: flex; flex-direction: column; gap: 12px; background: #050505; color: #FFFFFF; font-family: system-ui, -apple-system, sans-serif; overflow-y: auto;">
      
      <!-- Top Title & Navigation -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #FFEE55; padding-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-mobile-screen" style="font-size: 1.6rem; color: #FFEE55;"></i>
          <div>
            <h3 style="margin: 0; font-size: 1.2rem; color: #FFEE55; font-weight: 900;">STANDALONE SIMULATOR</h3>
            <span style="font-size: 0.7rem; color: #10B981; font-weight: bold;" id="simWsStatus"><i class="fa-solid fa-circle"></i> WS LIVE SYNC: CONNECTED</span>
          </div>
        </div>
        <div style="display: flex; gap: 6px;">
          <button id="btnSimToProg" style="padding: 6px 10px; background: rgba(0, 229, 255, 0.15); border: 1px solid #00E5FF; color: #00E5FF; border-radius: 6px; font-weight: bold; font-size: 0.8rem; cursor: pointer;">
            <i class="fa-solid fa-code-branch"></i> Programmer
          </button>
          <button id="btnSimToPreview" style="padding: 6px 10px; background: rgba(255, 238, 85, 0.15); border: 1px solid #FFEE55; color: #FFEE55; border-radius: 6px; font-weight: bold; font-size: 0.8rem; cursor: pointer;">
            <i class="fa-solid fa-columns"></i> Split Preview
          </button>
        </div>
      </div>

      <!-- Active Screen Selector & Indicator -->
      <div style="display: flex; justify-content: space-between; align-items: center; background: #111; padding: 10px 14px; border-radius: 10px; border: 1px solid #333;">
        <span style="font-size: 0.85rem; color: #AAA;">Active Screen Context:</span>
        <select id="simCurrentScreenSelect" style="padding: 6px 12px; background: #222; color: #00E5FF; border: 1px solid #00E5FF; border-radius: 6px; font-weight: bold; font-size: 0.85rem;">
          <option value="welcomeScreen">welcomeScreen</option>
          <option value="mainMenuScreen">mainMenuScreen</option>
          <option value="cameraView">cameraView</option>
          <option value="messagesView">messagesView</option>
          <option value="phoneView">phoneView</option>
          <option value="settingsView">settingsView</option>
        </select>
      </div>

      <!-- Hardware Viewport & Logs Frame -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: auto 0;">
        
        <!-- Interactive Simulated Viewport -->
        <div style="border: 2px solid #FFEE55; border-radius: 16px; padding: 16px; background: #000; display: flex; flex-direction: column; justify-content: space-between; align-items: center; min-height: 220px;">
          <div style="width: 100%; text-align: center; border-bottom: 1px dashed #333; padding-bottom: 6px;">
            <span style="color: #FFEE55; font-weight: bold; font-size: 0.85rem;" id="simActiveScreenDisplay">[ welcomeScreen ]</span>
          </div>

          <div style="text-align: center; margin: 16px 0;" id="simViewportContent">
            <i class="fa-solid fa-hands-holding-child" style="font-size: 2.5rem; color: #00E5FF; margin-bottom: 8px;"></i>
            <div style="color: #FFF; font-weight: bold; font-size: 1rem;">BlindEye Simulator Active</div>
            <div style="color: #888; font-size: 0.75rem; margin-top: 4px;">Click manual gesture buttons below</div>
          </div>

          <div style="width: 100%; border: 1px solid #FFEE55; border-radius: 8px; padding: 6px; text-align: center; background: rgba(255, 238, 85, 0.05);">
            <span style="color: #FFEE55; font-size: 0.7rem; font-weight: bold;">FIXED NAVIGATION ZONE</span>
          </div>
        </div>

        <!-- Output Logs & Visual Haptics -->
        <div style="border: 1px solid #333; border-radius: 16px; padding: 14px; background: #0D0D0D; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <h5 style="margin: 0 0 8px 0; color: #00E5FF; font-size: 0.8rem;"><i class="fa-solid fa-volume-high"></i> TTS AUDIO OUTPUT LOG</h5>
            <div id="simTtsLog" style="background: #000; border: 1px solid #222; border-radius: 8px; padding: 10px; font-family: monospace; font-size: 0.8rem; color: #10B981; min-height: 70px;">
              > Ready for input.
            </div>
          </div>

          <div style="margin-top: 10px;">
            <h5 style="margin: 0 0 8px 0; color: #FFEE55; font-size: 0.8rem;"><i class="fa-solid fa-wave-square"></i> VISUAL HAPTIC FEEDBACK</h5>
            <div id="simHapticBadge" style="padding: 8px; border-radius: 8px; background: #151515; border: 1px solid #333; text-align: center; font-weight: bold; font-size: 0.8rem; color: #888;">
              [ IDLE ]
            </div>
          </div>
        </div>

      </div>

      <!-- Manual Hardware Gesture Buttons -->
      <div style="border: 1px solid #333; border-radius: 12px; padding: 12px; background: #111;">
        <h5 style="margin: 0 0 10px 0; color: #AAA; font-size: 0.8rem;"><i class="fa-solid fa-hand-pointer"></i> EXECUTE SIMULATED GESTURES</h5>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
          <button class="sim-gesture-btn" data-gesture="SWIPE_RIGHT" style="padding: 10px; background: #222; color: #FFF; border: 1px solid #444; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 0.75rem;">Swipe Right</button>
          <button class="sim-gesture-btn" data-gesture="SWIPE_LEFT" style="padding: 10px; background: #222; color: #FFF; border: 1px solid #444; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 0.75rem;">Swipe Left</button>
          <button class="sim-gesture-btn" data-gesture="SWIPE_UP" style="padding: 10px; background: #222; color: #FFF; border: 1px solid #444; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 0.75rem;">Swipe Up</button>
          <button class="sim-gesture-btn" data-gesture="SWIPE_DOWN" style="padding: 10px; background: #222; color: #FFF; border: 1px solid #444; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 0.75rem;">Swipe Down</button>
          <button class="sim-gesture-btn" data-gesture="DOUBLE_TAP" style="padding: 10px; background: #222; color: #FFF; border: 1px solid #444; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 0.75rem;">Double Tap</button>
          <button class="sim-gesture-btn" data-gesture="LONG_PRESS" style="padding: 10px; background: #222; color: #FFF; border: 1px solid #444; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 0.75rem;">Long Press</button>
          <button class="sim-gesture-btn" data-gesture="TWO_FINGER_TAP" style="padding: 10px; background: #222; color: #FFF; border: 1px solid #444; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 0.75rem;">Two-Finger Tap</button>
          <button class="sim-gesture-btn" data-gesture="SHAKE" style="padding: 10px; background: #331111; color: #FF5555; border: 1px solid #FF5555; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 0.75rem;">Shake (SOS)</button>
        </div>
      </div>

    </div>
  `;

  // Bind navigation buttons
  document.getElementById('btnSimToProg')?.addEventListener('click', () => navigateTo('programmerScreen'));
  document.getElementById('btnSimToPreview')?.addEventListener('click', () => navigateTo('previewScreen'));

  // Screen selection handler
  const screenSelect = document.getElementById('simCurrentScreenSelect');
  if (screenSelect) {
    screenSelect.addEventListener('change', (e) => {
      const screenId = e.target.value;
      const display = document.getElementById('simActiveScreenDisplay');
      if (display) display.innerText = `[ ${screenId} ]`;
    });
  }

  // Bind gesture simulation buttons
  document.querySelectorAll('.sim-gesture-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const gesture = btn.getAttribute('data-gesture');
      const activeScreen = document.getElementById('simCurrentScreenSelect')?.value || 'welcomeScreen';
      executeSimulatedGesture(gesture, activeScreen);
    });
  });

  // Initialize WebSockets for live sync
  initWebSocketSync();
  onRuleUpdated((rule) => {
    const logEl = document.getElementById('simTtsLog');
    if (logEl) {
      logEl.innerHTML = `<span style="color: #FFEE55;">[LIVE RULE UDPATED]: ${rule.gesture_code} on ${rule.screen_id}</span>`;
    }
  });
}

export async function executeSimulatedGesture(gestureCode, screenId) {
  window.executeSimulatedGesture = executeSimulatedGesture;
  const ttsLog = document.getElementById('simTtsLog');
  const hapticBadge = document.getElementById('simHapticBadge');

  // Resolve against master DB API
  const res = await resolveContextualCommand(screenId, gestureCode);

  if (res.success && res.command) {
    const cmd = res.command;
    const ttsText = cmd.action_payload?.tts || 'Command executed.';
    const hapticPattern = cmd.haptic_pattern || 'short';

    Haptic.trigger(hapticPattern);
    Speech.speak(ttsText);

    if (ttsLog) ttsLog.innerText = `> "${ttsText}" (${res.latency_ms}ms)`;
    if (hapticBadge) {
      hapticBadge.innerText = `[ HAPTIC: ${hapticPattern.toUpperCase()} ]`;
      hapticBadge.style.color = '#00E5FF';
      hapticBadge.style.borderColor = '#00E5FF';
      setTimeout(() => {
        hapticBadge.innerText = '[ IDLE ]';
        hapticBadge.style.color = '#888';
        hapticBadge.style.borderColor = '#333';
      }, 1000);
    }
  } else {
    Haptic.trigger('error');
    Speech.speak('Invalid gesture for this screen context.');
    if (ttsLog) ttsLog.innerText = `> Invalid gesture for ${screenId}`;
  }
}
