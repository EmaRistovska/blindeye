import { state, saveDb, logSystem } from '../core/state.js';
import { Speech } from '../core/speech.js';
import { Haptic } from '../core/haptics.js';
import { navigateTo } from '../core/router.js';

const SETTINGS_CATEGORIES = [
  { id: 'accessibility', title: 'ACCESSIBILITY', subtitle: 'Reading mode, vibration, privacy', icon: 'fa-universal-access', color: '#10B981' },
  { id: 'quick_access', title: 'QUICK ACCESS', subtitle: 'Manage & create quick actions', icon: 'fa-bolt', color: '#FFEE55' },
  { id: 'tutorial', title: 'TUTORIAL MODE', subtitle: 'Restart guided voice tutorial', icon: 'fa-graduation-cap', color: '#00E5FF' }
];

let currentCatIdx = 0;
let settingsMode = 'categoryMenu'; // 'categoryMenu', 'accessibilityOptions', 'quickAccessList', 'addQuickAction', 'chooseTarget', 'tutorialMenu'

let currentSettingIdx = 0;
let currentQuickIdx = 0;
let newActionType = 'call'; // 'call', 'nav', 'msg'
let newActionTypeIdx = 0;
let targetChoiceIdx = 0;

const QUICK_ACTION_TYPES = [
  { id: 'call', title: 'CALL CONTACT', icon: 'fa-phone', desc: 'One-touch speed dial' },
  { id: 'nav', title: 'NAVIGATE TO DESTINATION', icon: 'fa-location-arrow', desc: 'Direct GPS route' },
  { id: 'msg', title: 'MESSAGE CONTACT', icon: 'fa-comment-sms', desc: 'Quick voice SMS' }
];

export function renderSettings() {
  const container = document.getElementById('settingsScreen');
  if (!container) return;

  // ----------------------------------------------------
  // VIEW 1: SETTINGS 3-CATEGORY MENU
  // ----------------------------------------------------
  if (settingsMode === 'categoryMenu') {
    const cat = SETTINGS_CATEGORIES[currentCatIdx];

    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 18px 14px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif;">
        
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
          <span style="color: #10B981; font-size: 0.8rem; font-weight: 800; letter-spacing: 1px;">[ SETTINGS MENU ]</span>
          <span style="color: #FFFFFF; font-size: 0.85rem; font-weight: bold; background: #181818; padding: 2px 8px; border-radius: 12px;">
            [ ${currentCatIdx + 1} / ${SETTINGS_CATEGORIES.length} ]
          </span>
        </div>

        <div class="settings-cat-card" style="width: 100%; border: 3px solid ${cat.color}; border-radius: 20px; padding: 26px 16px; background: rgba(0,0,0,0.9); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; text-align: center; box-shadow: 0 0 25px rgba(16, 185, 129, 0.15); margin: auto 0; cursor: pointer;">
          
          <div style="width: 85px; height: 85px; border-radius: 50%; border: 3px solid ${cat.color}; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.03);">
            <i class="fa-solid ${cat.icon}" style="font-size: 2.6rem; color: ${cat.color};"></i>
          </div>

          <div>
            <h2 style="margin: 0; font-size: 1.5rem; font-weight: 900; color: ${cat.color};">${cat.title}</h2>
            <p style="margin: 6px 0 0 0; font-size: 0.8rem; color: #94A3B8;">${cat.subtitle}</p>
          </div>

          <div style="margin-top: 4px; padding: 4px 12px; background: rgba(255,255,255,0.08); border-radius: 14px; font-size: 0.72rem; color: #FFEE55; font-weight: bold;">
            Double Tap to Open
          </div>
        </div>

        <div style="width: 100%; border-top: 1px dashed #333; padding-top: 8px; text-align: center;">
          <span style="color: #64748B; font-size: 0.7rem;">Swipe Right/Left: Next/Prev Category • Long Press: Back to Main Menu</span>
        </div>

      </div>
    `;

    container.querySelector('.settings-cat-card')?.addEventListener('click', selectSettingsCategory);
    return;
  }

  // ----------------------------------------------------
  // VIEW 2: ACCESSIBILITY PREFERENCES (READING MODE, VIB, PRIVACY)
  // ----------------------------------------------------
  if (settingsMode === 'accessibilityOptions') {
    const readingModes = ['Voice Only', 'Morse Only', 'Combined'];
    const vibLevels = ['Low', 'Medium', 'High'];
    const privacyStates = ['ON', 'OFF'];

    const currentReading = state.readingMode || 'Voice Only';
    const currentVib = state.vibStrength || 'Medium';
    const currentPrivacy = state.privacyMode ? 'ON' : 'OFF';

    const options = [
      { id: 'reading', title: 'READING MODE', val: currentReading, icon: 'fa-book-open', desc: 'Tap to cycle: Voice / Morse / Combined' },
      { id: 'vib', title: 'VIBRATION INTENSITY', val: currentVib, icon: 'fa-wave-square', desc: 'Tap to cycle: Low / Medium / High' },
      { id: 'privacy', title: 'PRIVACY MODE', val: currentPrivacy, icon: 'fa-shield-halved', desc: 'Tap to toggle: On / Off' }
    ];

    const opt = options[currentSettingIdx % options.length];

    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 18px 14px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif;">
        
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
          <span style="color: #10B981; font-size: 0.9rem; font-weight: 800;">ACCESSIBILITY OPTIONS</span>
          <span style="color: #FFFFFF; font-size: 0.8rem; font-weight: bold; background: #181818; padding: 2px 8px; border-radius: 12px;">
            [ ${(currentSettingIdx % options.length) + 1} / 3 ]
          </span>
        </div>

        <div class="pref-card" style="width: 100%; border: 3px solid #10B981; border-radius: 20px; padding: 24px 16px; background: #07090E; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; text-align: center; margin: auto 0; box-shadow: 0 0 20px rgba(16, 185, 129, 0.15); cursor: pointer;">
          <div style="width: 70px; height: 70px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); border: 2px solid #10B981; display: flex; align-items: center; justify-content: center;">
            <i class="fa-solid ${opt.icon}" style="font-size: 2.2rem; color: #10B981;"></i>
          </div>

          <div>
            <h2 style="margin: 0; font-size: 1.3rem; font-weight: 900; color: #FFFFFF;">${opt.title}</h2>
            <div style="margin-top: 8px; font-size: 1.6rem; color: #FFEE55; font-weight: 900; font-family: monospace;">
              [ ${opt.val} ]
            </div>
            <p style="margin: 6px 0 0 0; font-size: 0.75rem; color: #94A3B8;">${opt.desc}</p>
          </div>

          <button id="btnCycleOption" style="width: 100%; padding: 12px; background: #10B981; color: #000; border: none; border-radius: 10px; font-weight: 900; font-size: 0.9rem; cursor: pointer;">
            DOUBLE TAP TO CYCLE VALUE
          </button>
        </div>

        <div style="width: 100%; border-top: 1px dashed #333; padding-top: 6px; text-align: center;">
          <span style="color: #64748B; font-size: 0.7rem;">Swipe Right/Left: Next/Prev Option • Double Tap: Cycle Value</span>
        </div>

      </div>
    `;

    document.getElementById('btnCycleOption')?.addEventListener('click', cycleCurrentAccessibilityOption);
    return;
  }

  // ----------------------------------------------------
  // VIEW 3: QUICK ACCESS LIST (ENABLE / DISABLE)
  // ----------------------------------------------------
  if (settingsMode === 'quickAccessList') {
    const quickActions = state.quickActions || [
      { id: '1', title: 'Speed Dial Mother', type: 'call', target: 'Mother', enabled: true },
      { id: '2', title: 'Route to Home', type: 'nav', target: 'Home', enabled: true },
      { id: '3', title: 'Message Caregiver', type: 'msg', target: 'Caregiver', enabled: false }
    ];

    const act = quickActions[currentQuickIdx % quickActions.length];

    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 18px 14px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif;">
        
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
          <span style="color: #FFEE55; font-size: 0.9rem; font-weight: 800;"><i class="fa-solid fa-bolt"></i> QUICK ACTIONS</span>
          <span style="color: #FFFFFF; font-size: 0.8rem; font-weight: bold; background: #181818; padding: 2px 8px; border-radius: 12px;">
            [ ${(currentQuickIdx % quickActions.length) + 1} / ${quickActions.length} ]
          </span>
        </div>

        <div class="quick-act-card" style="width: 100%; border: 3px solid ${act.enabled ? '#10B981' : '#475569'}; border-radius: 20px; padding: 24px 16px; background: #07090E; display: flex; flex-direction: column; gap: 12px; margin: auto 0; box-shadow: 0 0 20px rgba(255, 238, 85, 0.12); cursor: pointer;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="background: ${act.enabled ? '#10B981' : '#334155'}; color: ${act.enabled ? '#000' : '#FFF'}; font-size: 0.65rem; font-weight: 900; padding: 2px 8px; border-radius: 6px;">
              ${act.enabled ? 'ENABLED' : 'DISABLED'}
            </span>
            <span style="font-size: 0.72rem; color: #94A3B8;">Double tap to toggle</span>
          </div>

          <h2 style="margin: 0; font-size: 1.35rem; color: #FFFFFF; font-weight: 900;">${act.title}</h2>
          <span style="font-size: 0.85rem; color: #00E5FF;">Target: ${act.target}</span>

          <button id="btnToggleQuickAct" style="width: 100%; padding: 12px; background: ${act.enabled ? '#EF4444' : '#10B981'}; color: #FFF; border: none; border-radius: 10px; font-weight: 900; font-size: 0.9rem; cursor: pointer;">
            ${act.enabled ? 'TAP TO DISABLE' : 'TAP TO ENABLE'}
          </button>
        </div>

        <div style="width: 100%; border-top: 1px dashed #333; padding-top: 6px; text-align: center;">
          <span style="color: #FFEE55; font-size: 0.72rem; font-weight: bold;">Swipe Up: Add New Quick Action • Long Press: Back</span>
        </div>

      </div>
    `;

    document.getElementById('btnToggleQuickAct')?.addEventListener('click', () => {
      act.enabled = !act.enabled;
      state.quickActions = quickActions;
      Haptic.trigger('success');
      Speech.speak(act.enabled ? `Enabled ${act.title}.` : `Disabled ${act.title}.`);
      renderSettings();
    });
    return;
  }

  // ----------------------------------------------------
  // VIEW 4: ADD NEW QUICK ACTION (SWIPE UP BUILDER)
  // ----------------------------------------------------
  if (settingsMode === 'addQuickAction') {
    const actType = QUICK_ACTION_TYPES[newActionTypeIdx % QUICK_ACTION_TYPES.length];

    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 18px 14px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif;">
        
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
          <span style="color: #FFEE55; font-size: 0.85rem; font-weight: bold;">+ CREATE QUICK ACTION</span>
          <span style="color: #FFFFFF; font-size: 0.8rem; font-weight: bold; background: #181818; padding: 2px 8px; border-radius: 12px;">
            [ ${(newActionTypeIdx % 3) + 1} / 3 ]
          </span>
        </div>

        <div class="add-act-card" style="width: 100%; border: 3px solid #FFEE55; border-radius: 20px; padding: 26px 16px; background: rgba(0,0,0,0.9); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; text-align: center; margin: auto 0; cursor: pointer;">
          <div style="width: 75px; height: 75px; border-radius: 50%; border: 3px solid #FFEE55; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.04);">
            <i class="fa-solid ${actType.icon}" style="font-size: 2.2rem; color: #FFEE55;"></i>
          </div>

          <div>
            <h2 style="margin: 0; font-size: 1.35rem; font-weight: 900; color: #FFEE55;">${actType.title}</h2>
            <p style="margin: 4px 0 0 0; font-size: 0.8rem; color: #94A3B8;">${actType.desc}</p>
          </div>

          <button id="btnPickTarget" style="width: 100%; padding: 12px; background: #FFEE55; color: #000; border: none; border-radius: 10px; font-weight: 900; font-size: 0.9rem; cursor: pointer;">
            DOUBLE TAP TO CHOOSE TARGET
          </button>
        </div>

        <div style="width: 100%; border-top: 1px dashed #333; padding-top: 6px; text-align: center;">
          <span style="color: #64748B; font-size: 0.7rem;">Swipe Right/Left: Next/Prev Action Type • Double Tap: Choose Target</span>
        </div>

      </div>
    `;

    document.getElementById('btnPickTarget')?.addEventListener('click', proceedToPickTarget);
    return;
  }

  // ----------------------------------------------------
  // VIEW 5: CHOOSE TARGET (CONTACT OR PLACE)
  // ----------------------------------------------------
  if (settingsMode === 'chooseTarget') {
    const actType = QUICK_ACTION_TYPES[newActionTypeIdx % 3];
    const targets = actType.id === 'nav'
      ? ['Home (Partizanska 45)', 'Doctor Office (Mother Teresa)', 'Eurofarm Pharmacy']
      : ['Mother (+389 70 123 456)', 'Doctor (+389 72 555 112)', 'Emergency Support (112)'];

    const targetName = targets[targetChoiceIdx % targets.length];

    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 18px 14px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif;">
        
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
          <span style="color: #00E5FF; font-size: 0.85rem; font-weight: bold;">Select Target for ${actType.title}</span>
          <span style="color: #FFFFFF; font-size: 0.8rem; font-weight: bold; background: #181818; padding: 2px 8px; border-radius: 12px;">
            [ ${(targetChoiceIdx % targets.length) + 1} / ${targets.length} ]
          </span>
        </div>

        <div class="target-card" style="width: 100%; border: 3px solid #00E5FF; border-radius: 20px; padding: 24px 16px; background: #07090E; display: flex; flex-direction: column; gap: 14px; margin: auto 0; text-align: center; cursor: pointer;">
          <h2 style="margin: 0; font-size: 1.35rem; color: #FFFFFF; font-weight: 900;">${targetName}</h2>
          <span style="font-size: 0.8rem; color: #94A3B8;">Double tap to save as new quick action</span>

          <button id="btnSaveQuickActionFinal" style="width: 100%; padding: 12px; background: #00E5FF; color: #000; border: none; border-radius: 10px; font-weight: 900; font-size: 0.9rem; cursor: pointer;">
            DOUBLE TAP TO SAVE QUICK ACTION
          </button>
        </div>

        <div style="width: 100%; border-top: 1px dashed #333; padding-top: 6px; text-align: center;">
          <span style="color: #64748B; font-size: 0.7rem;">Swipe Right/Left: Next/Prev Target • Double Tap: Save</span>
        </div>

      </div>
    `;

    document.getElementById('btnSaveQuickActionFinal')?.addEventListener('click', saveNewQuickAction);
    return;
  }

  // ----------------------------------------------------
  // VIEW 6: TUTORIAL MODE MENU
  // ----------------------------------------------------
  if (settingsMode === 'tutorialMenu') {
    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 22px 16px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; text-align: center;">
        
        <div>
          <span style="color: #00E5FF; font-size: 0.8rem; font-weight: 900; background: rgba(0,229,255,0.15); padding: 3px 12px; border-radius: 12px;">
            <i class="fa-solid fa-graduation-cap"></i> TUTORIAL MODE
          </span>
          <h2 style="margin: 14px 0 6px 0; font-size: 1.4rem; color: #FFFFFF;">Interactive Voice Tutorial</h2>
          <p style="font-size: 0.8rem; color: #94A3B8;">Learn gestures, handwriting, Morse typing, and touch zones.</p>
        </div>

        <div style="width: 90px; height: 90px; border-radius: 50%; border: 3px solid #00E5FF; display: flex; align-items: center; justify-content: center; background: rgba(0,229,255,0.08); margin: auto 0;">
          <i class="fa-solid fa-hands-holding-child" style="font-size: 2.8rem; color: #00E5FF;"></i>
        </div>

        <button id="btnRestartTutorialNow" style="width: 100%; padding: 14px; background: #00E5FF; color: #000; border: none; border-radius: 12px; font-weight: 900; font-size: 1rem; cursor: pointer;">
          <i class="fa-solid fa-rotate-right"></i> DOUBLE TAP TO RESTART TUTORIAL
        </button>

      </div>
    `;

    document.getElementById('btnRestartTutorialNow')?.addEventListener('click', restartTutorial);
    return;
  }
}

export function selectSettingsCategory() {
  const cat = SETTINGS_CATEGORIES[currentCatIdx];
  Haptic.trigger('success');
  Speech.speak(`Opening ${cat.title}.`);

  if (cat.id === 'accessibility') {
    settingsMode = 'accessibilityOptions';
    currentSettingIdx = 0;
    renderSettings();
    announceCurrentAccessibilityOption();
  } else if (cat.id === 'quick_access') {
    settingsMode = 'quickAccessList';
    currentQuickIdx = 0;
    renderSettings();
    announceCurrentQuickAction();
  } else if (cat.id === 'tutorial') {
    settingsMode = 'tutorialMenu';
    renderSettings();
    Speech.speak("Tutorial mode menu. Double tap to restart tutorial.");
  }
}

export function cycleCurrentAccessibilityOption() {
  const readingModes = ['Voice Only', 'Morse Only', 'Combined'];
  const vibLevels = ['Low', 'Medium', 'High'];

  if (currentSettingIdx % 3 === 0) {
    // Reading Mode
    const curIdx = readingModes.indexOf(state.readingMode || 'Voice Only');
    state.readingMode = readingModes[(curIdx + 1) % readingModes.length];
    Haptic.trigger('success');
    Speech.speak(`Reading mode set to ${state.readingMode}.`);
  } else if (currentSettingIdx % 3 === 1) {
    // Vibration Intensity
    const curIdx = vibLevels.indexOf(state.vibStrength || 'Medium');
    state.vibStrength = vibLevels[(curIdx + 1) % vibLevels.length];
    Haptic.trigger('success');
    Speech.speak(`Vibration intensity set to ${state.vibStrength}.`);
  } else if (currentSettingIdx % 3 === 2) {
    // Privacy Mode
    state.privacyMode = !state.privacyMode;
    Haptic.trigger('success');
    Speech.speak(state.privacyMode ? "Privacy mode turned ON." : "Privacy mode turned OFF.");
  }
  saveDb();
  renderSettings();
}

export function proceedToPickTarget() {
  settingsMode = 'chooseTarget';
  targetChoiceIdx = 0;
  Haptic.trigger('success');
  renderSettings();
  Speech.speak("Select target contact or destination. Swipe right or left, double tap to save.");
}

export function saveNewQuickAction() {
  const actType = QUICK_ACTION_TYPES[newActionTypeIdx % 3];
  const targets = actType.id === 'nav'
    ? ['Home', 'Doctor Office', 'Eurofarm Pharmacy']
    : ['Mother', 'Doctor', 'Emergency 112'];

  const targetName = targets[targetChoiceIdx % targets.length];
  const newAction = {
    id: String(Date.now()),
    title: `${actType.title}: ${targetName}`,
    type: actType.id,
    target: targetName,
    enabled: true
  };

  state.quickActions = [...(state.quickActions || []), newAction];
  Haptic.trigger('success');
  Speech.speak(`Saved new quick action: ${newAction.title}.`);
  settingsMode = 'quickAccessList';
  renderSettings();
}

export function restartTutorial() {
  Haptic.trigger('success');
  Speech.speak("Restarting tutorial. Welcome to BlindEye accessibility orientation.");
  navigateTo('welcomeScreen');
}

export function handleSettingsGesture(gesture) {
  // STATE: Category Menu
  if (settingsMode === 'categoryMenu') {
    if (gesture === 'swipeRight') {
      currentCatIdx = (currentCatIdx + 1) % SETTINGS_CATEGORIES.length;
      Haptic.trigger('short');
      renderSettings();
      Speech.speak(SETTINGS_CATEGORIES[currentCatIdx].title);
    } else if (gesture === 'swipeLeft') {
      currentCatIdx = (currentCatIdx - 1 + SETTINGS_CATEGORIES.length) % SETTINGS_CATEGORIES.length;
      Haptic.trigger('short');
      renderSettings();
      Speech.speak(SETTINGS_CATEGORIES[currentCatIdx].title);
    } else if (gesture === 'doubleTap' || gesture === 'tap') {
      selectSettingsCategory();
    }
    return;
  }

  // STATE: Accessibility Options
  if (settingsMode === 'accessibilityOptions') {
    if (gesture === 'swipeRight') {
      currentSettingIdx = (currentSettingIdx + 1) % 3;
      Haptic.trigger('short');
      renderSettings();
      announceCurrentAccessibilityOption();
    } else if (gesture === 'swipeLeft') {
      currentSettingIdx = (currentSettingIdx - 1 + 3) % 3;
      Haptic.trigger('short');
      renderSettings();
      announceCurrentAccessibilityOption();
    } else if (gesture === 'doubleTap' || gesture === 'tap') {
      cycleCurrentAccessibilityOption();
    } else if (gesture === 'longPress') {
      settingsMode = 'categoryMenu';
      Haptic.trigger('short');
      Speech.speak("Returned to Settings Menu.");
      renderSettings();
    }
    return;
  }

  // STATE: Quick Access List
  if (settingsMode === 'quickAccessList') {
    const list = state.quickActions || [];
    if (gesture === 'swipeRight' && list.length > 0) {
      currentQuickIdx = (currentQuickIdx + 1) % list.length;
      Haptic.trigger('short');
      renderSettings();
      announceCurrentQuickAction();
    } else if (gesture === 'swipeLeft' && list.length > 0) {
      currentQuickIdx = (currentQuickIdx - 1 + list.length) % list.length;
      Haptic.trigger('short');
      renderSettings();
      announceCurrentQuickAction();
    } else if (gesture === 'swipeUp') {
      settingsMode = 'addQuickAction';
      newActionTypeIdx = 0;
      Haptic.trigger('warning');
      renderSettings();
      Speech.speak("Add new quick action. Choose action type: Call contact, Navigate to destination, or Message contact.");
    } else if (gesture === 'longPress') {
      settingsMode = 'categoryMenu';
      Haptic.trigger('short');
      Speech.speak("Returned to Settings Menu.");
      renderSettings();
    }
    return;
  }

  // STATE: Add Quick Action Type Selection
  if (settingsMode === 'addQuickAction') {
    if (gesture === 'swipeRight') {
      newActionTypeIdx = (newActionTypeIdx + 1) % 3;
      Haptic.trigger('short');
      renderSettings();
      Speech.speak(QUICK_ACTION_TYPES[newActionTypeIdx].title);
    } else if (gesture === 'swipeLeft') {
      newActionTypeIdx = (newActionTypeIdx - 1 + 3) % 3;
      Haptic.trigger('short');
      renderSettings();
      Speech.speak(QUICK_ACTION_TYPES[newActionTypeIdx].title);
    } else if (gesture === 'doubleTap' || gesture === 'tap') {
      proceedToPickTarget();
    } else if (gesture === 'longPress') {
      settingsMode = 'quickAccessList';
      Haptic.trigger('short');
      Speech.speak("Cancelled. Returned to Quick Access list.");
      renderSettings();
    }
    return;
  }

  // STATE: Choose Target
  if (settingsMode === 'chooseTarget') {
    if (gesture === 'swipeRight') {
      targetChoiceIdx = (targetChoiceIdx + 1) % 3;
      Haptic.trigger('short');
      renderSettings();
      announceCurrentTargetChoice();
    } else if (gesture === 'swipeLeft') {
      targetChoiceIdx = (targetChoiceIdx - 1 + 3) % 3;
      Haptic.trigger('short');
      renderSettings();
      announceCurrentTargetChoice();
    } else if (gesture === 'doubleTap' || gesture === 'tap') {
      saveNewQuickAction();
    } else if (gesture === 'longPress') {
      settingsMode = 'addQuickAction';
      Haptic.trigger('short');
      Speech.speak("Cancelled. Returned to action type selection.");
      renderSettings();
    }
    return;
  }

  // STATE: Tutorial Menu
  if (settingsMode === 'tutorialMenu') {
    if (gesture === 'doubleTap' || gesture === 'tap') {
      restartTutorial();
    } else if (gesture === 'longPress') {
      settingsMode = 'categoryMenu';
      Haptic.trigger('short');
      Speech.speak("Returned to Settings Menu.");
      renderSettings();
    }
  }
}

export function announceCurrentAccessibilityOption() {
  const options = ['Reading Mode', 'Vibration Intensity', 'Privacy Mode'];
  const values = [state.readingMode || 'Voice Only', state.vibStrength || 'Medium', state.privacyMode ? 'ON' : 'OFF'];
  Speech.speak(`${options[currentSettingIdx % 3]}. Current value: ${values[currentSettingIdx % 3]}. Double tap to cycle.`);
}

export function announceCurrentQuickAction() {
  const list = state.quickActions || [];
  const act = list[currentQuickIdx % list.length];
  if (!act) return;
  Speech.speak(`Quick Action: ${act.title}. Status: ${act.enabled ? 'Enabled' : 'Disabled'}. Double tap to toggle, swipe up to add new action.`);
}

export function announceCurrentTargetChoice() {
  const actType = QUICK_ACTION_TYPES[newActionTypeIdx % 3];
  const targets = actType.id === 'nav'
    ? ['Home', 'Doctor Office', 'Eurofarm Pharmacy']
    : ['Mother', 'Doctor', 'Emergency 112'];
  Speech.speak(`Target: ${targets[targetChoiceIdx % 3]}. Double tap to save as quick action.`);
}
