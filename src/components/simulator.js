import { resolveLocalCommand, syncLocalCommandCache, onRuleUpdated, onScreenUpdated, onSectionUpdated, fetchScreens, fetchSections } from '../core/api.js';
import { Speech } from '../core/speech.js';
import { Haptic } from '../core/haptics.js';
import { navigateTo } from '../core/router.js';
import { state } from '../core/state.js';

export function renderSimulatorScreen(containerId = 'simulatorScreen') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const isSplitPane = containerId !== 'simulatorScreen';

  container.innerHTML = `
    <div style="width: 100%; height: 100%; box-sizing: border-box; padding: ${isSplitPane ? '12px' : '16px'}; display: flex; flex-direction: column; gap: 12px; background: #030712; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; overflow-y: auto;">
      
      <!-- Top Title & Navigation -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #FFEE55; padding-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(255, 238, 85, 0.15); border: 1px solid #FFEE55; display: flex; align-items: center; justify-content: center;">
            <i class="fa-solid fa-mobile-screen" style="font-size: 1.3rem; color: #FFEE55;"></i>
          </div>
          <div>
            <h3 style="margin: 0; font-size: 1.15rem; color: #FFEE55; font-weight: 900; letter-spacing: 0.5px;">HARDWARE SIMULATOR & TESTER</h3>
            <div style="display: flex; gap: 6px; align-items: center;">
              <span style="font-size: 0.65rem; color: #10B981; font-weight: bold;" id="${containerId}_wsStatus">
                <i class="fa-solid fa-circle" style="font-size: 0.55rem;"></i> LIVE SYNC ACTIVE
              </span>
              <span style="font-size: 0.65rem; color: #94A3B8; background: #111827; padding: 1px 6px; border-radius: 4px;">LOCAL CACHE (< 1ms)</span>
            </div>
          </div>
        </div>
        ${!isSplitPane ? `
        <div style="display: flex; gap: 6px;">
          <button id="btnSimToProg" style="padding: 6px 12px; background: rgba(0, 229, 255, 0.12); border: 1px solid #00E5FF; color: #00E5FF; border-radius: 6px; font-weight: bold; font-size: 0.8rem; cursor: pointer;">
            <i class="fa-solid fa-code-branch"></i> Programmer
          </button>
          <button id="btnSimToPreview" style="padding: 6px 12px; background: rgba(255, 238, 85, 0.12); border: 1px solid #FFEE55; color: #FFEE55; border-radius: 6px; font-weight: bold; font-size: 0.8rem; cursor: pointer;">
            <i class="fa-solid fa-columns"></i> Split Preview
          </button>
        </div>` : ''}
      </div>

      <!-- Active Screen Context Switcher -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: #111827; padding: 8px 12px; border-radius: 8px; border: 1px solid #1F2937;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <i class="fa-solid fa-layer-group" style="color: #FFEE55; font-size: 0.85rem;"></i>
          <span style="font-size: 0.8rem; color: #9CA3AF; font-weight: bold;">Simulated Screen Context:</span>
        </div>
        <select id="${containerId}_simScreenSelect" style="padding: 5px 10px; background: #1F2937; color: #00E5FF; border: 1.5px solid #00E5FF; border-radius: 6px; font-weight: bold; font-size: 0.8rem; cursor: pointer;">
          <!-- Dynamically populated -->
        </select>
        <div style="display:flex;align-items:center;gap:6px;"><i class="fa-solid fa-vector-square" style="color:#EF4444;font-size:.85rem;"></i><span style="font-size:.8rem;color:#9CA3AF;font-weight:bold;">Phone section:</span></div>
        <select id="${containerId}_simSectionSelect" style="padding: 5px 10px; background: #1F2937; color: #FCA5A5; border: 1.5px dashed #EF4444; border-radius: 6px; font-weight: bold; font-size: 0.8rem; cursor: pointer;"><option value="DEFAULT">General / no section</option></select>
      </div>

      <!-- Device Viewport & Parity Inspector Grid -->
      <div style="display: grid; grid-template-columns: ${isSplitPane ? '1fr' : '1.1fr 1fr'}; gap: 10px;">
        
        <!-- Left: Realistic Simulated Phone Frame -->
        <div style="border: 2px solid #FFEE55; border-radius: 14px; padding: 12px; background: #000000; display: flex; flex-direction: column; justify-content: space-between; min-height: 220px; box-shadow: 0 0 15px rgba(255, 238, 85, 0.08);">
          
          <!-- Phone Status Bar -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #333; padding-bottom: 4px; font-size: 0.7rem; color: #9CA3AF;">
            <span id="${containerId}_phoneTime">12:00</span>
            <span style="color: #FFEE55; font-weight: bold;" id="${containerId}_activeContextDisplay">[ welcomeScreen ]</span>
            <div style="display: flex; gap: 4px; align-items: center;">
              <i class="fa-solid fa-wifi"></i>
              <i class="fa-solid fa-battery-three-quarters" style="color: #10B981;"></i>
            </div>
          </div>

          <!-- Dynamic Viewport Visual -->
          <div style="text-align: center; margin: 14px 0;" id="${containerId}_viewportContent">
            <div id="${containerId}_screenIcon" style="font-size: 2.2rem; color: #00E5FF; margin-bottom: 6px;">
              <i class="fa-solid fa-hands-holding-child"></i>
            </div>
            <div id="${containerId}_screenTitle" style="color: #FFFFFF; font-weight: 800; font-size: 0.95rem;">Welcome & Orientation</div>
            <div id="${containerId}_screenSubtitle" style="color: #9CA3AF; font-size: 0.75rem; margin-top: 4px;">Swipe or tap navigation zone to trigger rules</div>
          </div>

          <!-- 120px Navigation Zone Touch Bar -->
          <div id="${containerId}_touchNavZone" style="border: 2px solid #FFEE55; border-radius: 8px; padding: 10px; text-align: center; background: rgba(255, 238, 85, 0.08); cursor: pointer; transition: background 0.15s ease;" title="Click/Tap Navigation Area">
            <div style="color: #FFEE55; font-size: 0.75rem; font-weight: 900; letter-spacing: 0.5px;">
              <i class="fa-solid fa-hand-pointer"></i> 120px HIGH-TOUCH NAVIGATION ZONE
            </div>
            <div style="color: #9CA3AF; font-size: 0.65rem; margin-top: 2px;">(Simulates blind finger touch area)</div>
          </div>
        </div>

        <!-- Right: Parity Inspector & Sensory Logs -->
        <div style="display: flex; flex-direction: column; gap: 8px;">
          
          <!-- Parity Verification Badge Panel -->
          <div style="border: 1px solid #1F2937; border-radius: 10px; padding: 10px; background: #0B0F19;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <h5 style="margin: 0; color: #00E5FF; font-size: 0.75rem; font-weight: bold; text-transform: uppercase;">
                <i class="fa-solid fa-magnifying-glass-chart"></i> Parity Rule Inspector
              </h5>
              <span id="${containerId}_parityStatus" style="font-size: 0.65rem; color: #10B981; font-weight: bold; background: rgba(16,185,129,0.15); padding: 1px 6px; border-radius: 4px;">MATCHED</span>
            </div>
            <div id="${containerId}_parityDetails" style="font-size: 0.7rem; color: #CBD5E1; display: flex; flex-direction: column; gap: 3px; background: #030712; padding: 6px 8px; border-radius: 6px; border: 1px solid #1E293B;">
              <div>Rule ID: <span id="${containerId}_ruleId" style="color: #FFEE55;">cmd_w1</span></div>
              <div>Action: <span id="${containerId}_ruleAction" style="color: #00E5FF;">NAVIGATE</span></div>
              <div>Haptic Pattern: <span id="${containerId}_ruleHaptic" style="color: #10B981;">success</span></div>
              <div>Resolution Latency: <span id="${containerId}_ruleLatency" style="color: #38BDF8;">0.12 ms</span></div>
            </div>
          </div>

          <!-- TTS Spoken Log -->
          <div style="border: 1px solid #1F2937; border-radius: 10px; padding: 10px; background: #0B0F19;">
            <h5 style="margin: 0 0 4px 0; color: #00E5FF; font-size: 0.75rem; font-weight: bold;">
              <i class="fa-solid fa-volume-high"></i> Spoken Audio Transcript
            </h5>
            <div id="${containerId}_simTtsLog" style="background: #030712; border: 1px solid #1E293B; border-radius: 6px; padding: 6px 8px; font-family: monospace; font-size: 0.75rem; color: #10B981; min-height: 38px;">
              > Ready. Listening for gestures.
            </div>
          </div>

          <!-- Visual Haptic Pulse Visualizer -->
          <div style="border: 1px solid #1F2937; border-radius: 10px; padding: 10px; background: #0B0F19;">
            <h5 style="margin: 0 0 4px 0; color: #FFEE55; font-size: 0.75rem; font-weight: bold;">
              <i class="fa-solid fa-wave-square"></i> Tactile Haptic Vibration Bar
            </h5>
            <div id="${containerId}_hapticBar" style="padding: 6px; border-radius: 6px; background: #030712; border: 1px solid #333; text-align: center; font-weight: bold; font-size: 0.75rem; color: #64748B; transition: all 0.2s ease;">
              [ IDLE ]
            </div>
          </div>

        </div>

      </div>

      <!-- Simulated Gestures Trigger Grid -->
      <div style="border: 1px solid #1F2937; border-radius: 10px; padding: 10px; background: #0B0F19;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <h5 style="margin: 0; color: #9CA3AF; font-size: 0.75rem; font-weight: bold; text-transform: uppercase;">
            <i class="fa-solid fa-gamepad"></i> Execute Programmed Gesture Tests
          </h5>
          <span style="font-size: 0.65rem; color: #64748B;">Evaluates against active ruleset</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
          <button class="sim-test-btn" data-gesture="SWIPE_RIGHT" style="padding: 8px; background: #1E293B; color: #FFF; border: 1px solid #334155; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.75rem;">Swipe Right ➔</button>
          <button class="sim-test-btn" data-gesture="SWIPE_LEFT" style="padding: 8px; background: #1E293B; color: #FFF; border: 1px solid #334155; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.75rem;">⬅ Swipe Left</button>
          <button class="sim-test-btn" data-gesture="SWIPE_UP" style="padding: 8px; background: #1E293B; color: #FFF; border: 1px solid #334155; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.75rem;">⬆ Swipe Up</button>
          <button class="sim-test-btn" data-gesture="SWIPE_DOWN" style="padding: 8px; background: #1E293B; color: #FFF; border: 1px solid #334155; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.75rem;">⬇ Swipe Down</button>
          <button class="sim-test-btn" data-gesture="TAP" style="padding: 8px; background: #1E293B; color: #FCA5A5; border: 1px dashed #EF4444; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.75rem;">Tap Section</button>
          <button class="sim-test-btn" data-gesture="DOUBLE_TAP" style="padding: 8px; background: #1E293B; color: #00E5FF; border: 1px solid #00E5FF; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.75rem;">Double Tap</button>
          <button class="sim-test-btn" data-gesture="LONG_PRESS" style="padding: 8px; background: #1E293B; color: #FFEE55; border: 1px solid #FFEE55; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.75rem;">Long Press (600ms)</button>
          <button class="sim-test-btn" data-gesture="TWO_FINGER_TAP" style="padding: 8px; background: #1E293B; color: #10B981; border: 1px solid #10B981; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.75rem;">Two-Finger Tap</button>
          <button class="sim-sensor-btn" data-sensor="SHAKE" style="padding: 8px; background: #3B1212; color: #EF4444; border: 1px solid #EF4444; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.75rem;">Shake (SOS)</button>
        </div>
      </div>

    </div>
  `;

  // Bind top navigation buttons if present
  if (!isSplitPane) {
    document.getElementById('btnSimToProg')?.addEventListener('click', () => navigateTo('programmerScreen'));
    document.getElementById('btnSimToPreview')?.addEventListener('click', () => navigateTo('previewScreen'));
  }

  // Update clock
  const timeEl = document.getElementById(`${containerId}_phoneTime`);
  if (timeEl) timeEl.innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Screen selection change handler
  const screenSelect = document.getElementById(`${containerId}_simScreenSelect`);
  if (screenSelect) {
    screenSelect.addEventListener('change', (e) => {
      const selectedScreen = e.target.value;
      updateSimulatorScreenContext(containerId, selectedScreen);
      syncSimulatorSections(containerId);
    });
  }

  // Bind gesture test buttons
  container.querySelectorAll('.sim-test-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const gesture = btn.getAttribute('data-gesture');
      const activeScreen = document.getElementById(`${containerId}_simScreenSelect`)?.value || 'welcomeScreen';
      const activeSection = document.getElementById(`${containerId}_simSectionSelect`)?.value || 'DEFAULT';
      executeSimulatorGesture(containerId, gesture, activeScreen, activeSection);
    });
  });

  // Bind hardware sensor triggers
  container.querySelectorAll('.sim-sensor-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sensor = btn.getAttribute('data-sensor');
      if (sensor === 'SHAKE') {
        executeSimulatorGesture(containerId, 'DOUBLE_TAP', 'sosScreen');
      }
    });
  });

  // Touch Navigation Zone Click Handler
  document.getElementById(`${containerId}_touchNavZone`)?.addEventListener('click', () => {
    const activeScreen = document.getElementById(`${containerId}_simScreenSelect`)?.value || 'welcomeScreen';
    const activeSection = document.getElementById(`${containerId}_simSectionSelect`)?.value || 'DEFAULT';
    executeSimulatorGesture(containerId, 'DOUBLE_TAP', activeScreen, activeSection);
  });

  // Sync screens and listen to rule updates
  syncSimulatorScreens(containerId);
  onRuleUpdated(() => {
    const wsStatus = document.getElementById(`${containerId}_wsStatus`);
    if (wsStatus) {
      wsStatus.innerHTML = `<i class="fa-solid fa-circle" style="font-size: 0.55rem; color: #FFEE55;"></i> LIVE SYNC UPDATED`;
      setTimeout(() => {
        wsStatus.innerHTML = `<i class="fa-solid fa-circle" style="font-size: 0.55rem; color: #10B981;"></i> LIVE SYNC ACTIVE`;
      }, 1500);
    }
  });

  onScreenUpdated(() => { syncSimulatorScreens(containerId); syncSimulatorSections(containerId); });
  onSectionUpdated(() => syncSimulatorSections(containerId));
  syncSimulatorSections(containerId);
}

async function syncSimulatorScreens(containerId) {
  const screenSelect = document.getElementById(`${containerId}_simScreenSelect`);
  if (!screenSelect) return;

  const res = await fetchScreens();
  if (res.success && res.screens) {
    const currentVal = screenSelect.value;
    screenSelect.innerHTML = res.screens.map(s => `
      <option value="${s.id}">${s.id} (${s.name})</option>
    `).join('');
    if (currentVal && res.screens.some(s => s.id === currentVal)) {
      screenSelect.value = currentVal;
    }
    updateSimulatorScreenContext(containerId, screenSelect.value || 'welcomeScreen');
  }
}

async function syncSimulatorSections(containerId) {
  const sectionSelect = document.getElementById(`${containerId}_simSectionSelect`);
  if (!sectionSelect) return;
  const activeScreen = document.getElementById(`${containerId}_simScreenSelect`)?.value || 'ALL';
  const res = await fetchSections(activeScreen);
  if (res.success && res.sections) {
    const current = sectionSelect.value;
    sectionSelect.innerHTML = '<option value="DEFAULT">DEFAULT (Full Screen / No Zone)</option>' + res.sections.map(section => `<option value="${section.id}">${section.name} (${section.screen_id || 'GLOBAL'})</option>`).join('');
    if ([...sectionSelect.options].some(option => option.value === current)) sectionSelect.value = current;
  }
}

function updateSimulatorScreenContext(containerId, screenId) {
  const display = document.getElementById(`${containerId}_activeContextDisplay`);
  const title = document.getElementById(`${containerId}_screenTitle`);
  const icon = document.getElementById(`${containerId}_screenIcon`);

  if (display) display.innerText = `[ ${screenId} ]`;

  const meta = {
    'welcomeScreen': { title: 'Welcome & Orientation', icon: 'fa-hands-holding-child', color: '#00E5FF' },
    'mainMenuScreen': { title: 'Main Menu Categories', icon: 'fa-table-cells', color: '#FFEE55' },
    'messagesView': { title: 'Messages & SMS Reading', icon: 'fa-comment-sms', color: '#10B981' },
    'phoneView': { title: 'Phone & Contacts Dialer', icon: 'fa-phone', color: '#38BDF8' },
    'cameraView': { title: 'Camera & AI Scene OCR', icon: 'fa-camera', color: '#F43F5E' },
    'navigationView': { title: 'GPS Turn-by-Turn Guide', icon: 'fa-location-dot', color: '#A855F7' },
    'settingsView': { title: 'Settings & Preferences', icon: 'fa-gear', color: '#CBD5E1' },
    'sosScreen': { title: 'Emergency SOS Alert', icon: 'fa-triangle-exclamation', color: '#EF4444' }
  };

  const currentMeta = meta[screenId] || { title: screenId, icon: 'fa-layer-group', color: '#00E5FF' };
  if (title) title.innerText = currentMeta.title;
  if (icon) icon.innerHTML = `<i class="fa-solid ${currentMeta.icon}" style="color: ${currentMeta.color};"></i>`;
}

export function executeSimulatorGesture(containerId, gestureCode, screenId, subContext = 'DEFAULT') {
  const ttsLog = document.getElementById(`${containerId}_simTtsLog`);
  const hapticBar = document.getElementById(`${containerId}_hapticBar`);
  const parityStatus = document.getElementById(`${containerId}_parityStatus`);
  const ruleIdEl = document.getElementById(`${containerId}_ruleId`);
  const ruleActionEl = document.getElementById(`${containerId}_ruleAction`);
  const ruleHapticEl = document.getElementById(`${containerId}_ruleHaptic`);
  const ruleLatencyEl = document.getElementById(`${containerId}_ruleLatency`);

  // Instant local rule cache lookup (<1ms)
  const res = resolveLocalCommand(screenId, gestureCode, subContext);

  if (res.success && res.command) {
    const cmd = res.command;
    const ttsText = cmd.action_payload?.tts || 'Action executed successfully.';
    const hapticPattern = cmd.haptic_pattern || 'short';

    Haptic.trigger(hapticPattern);
    Speech.speak(ttsText);

    if (ttsLog) ttsLog.innerText = `> "${ttsText}"`;
    if (parityStatus) {
      parityStatus.innerText = 'PARITY PASS';
      parityStatus.style.color = '#10B981';
      parityStatus.style.background = 'rgba(16,185,129,0.15)';
    }
    if (ruleIdEl) ruleIdEl.innerText = cmd.id || 'Custom';
    if (ruleActionEl) ruleActionEl.innerText = cmd.action_type;
    if (ruleHapticEl) ruleHapticEl.innerText = hapticPattern;
    if (ruleLatencyEl) ruleLatencyEl.innerText = `${res.latency_ms} ms (${res.source})`;

    if (hapticBar) {
      hapticBar.innerText = `[ HAPTIC: ${hapticPattern.toUpperCase()} ]`;
      hapticBar.style.color = '#00E5FF';
      hapticBar.style.borderColor = '#00E5FF';
      hapticBar.style.background = 'rgba(0,229,255,0.1)';
      setTimeout(() => {
        hapticBar.innerText = '[ IDLE ]';
        hapticBar.style.color = '#64748B';
        hapticBar.style.borderColor = '#333';
        hapticBar.style.background = '#030712';
      }, 800);
    }
  } else {
    Haptic.trigger('error');
    Speech.speak('Unmapped gesture for this screen.');

    if (ttsLog) ttsLog.innerText = `> [FALLBACK] No rule defined for ${gestureCode} on ${screenId}`;
    if (parityStatus) {
      parityStatus.innerText = 'UNMAPPED FALLBACK';
      parityStatus.style.color = '#EF4444';
      parityStatus.style.background = 'rgba(239,68,68,0.15)';
    }
    if (ruleIdEl) ruleIdEl.innerText = 'None';
    if (ruleActionEl) ruleActionEl.innerText = 'ERROR / FALLBACK';
    if (ruleHapticEl) ruleHapticEl.innerText = 'error';
    if (ruleLatencyEl) ruleLatencyEl.innerText = `${res.latency_ms} ms`;
  }
}

