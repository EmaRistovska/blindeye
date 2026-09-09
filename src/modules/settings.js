import { state, saveDb, logSystem } from '../core/state.js';
import { Speech } from '../core/speech.js';
import { Haptic } from '../core/haptics.js';
import { navigateTo } from '../core/router.js';
import { startTutorialFlow } from './tutorial.js';

const SETTINGS_CATEGORIES = [
  { id: 'accessibility', title: 'ACCESSIBILITY', subtitle: 'Reading mode, vibration, privacy', icon: 'fa-universal-access', color: '#FFEE55' },
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
  { id: 'call', title: 'CALL CONTACT', icon: 'fa-phone', color: '#FFEE55', desc: 'One-touch speed dial to contact' },
  { id: 'msg', title: 'SEND MESSAGE', icon: 'fa-comment-sms', color: '#FFEE55', desc: 'Quick voice or Morse SMS' },
  { id: 'nav', title: 'NAVIGATE TO PLACE', icon: 'fa-location-arrow', color: '#FFEE55', desc: 'Direct GPS walking route' },
  { id: 'camera', title: 'SCAN OBJECT', icon: 'fa-camera', color: '#FFEE55', desc: 'AI camera obstacle & scene description' }
];

const QUICK_ACTION_TARGETS = {
  call: [
    { name: 'Brother', detail: '+389 71 234 567', icon: 'fa-user', actionTitle: 'Call Brother' },
    { name: 'Mother', detail: '+389 70 123 456', icon: 'fa-user', actionTitle: 'Call Mother' },
    { name: 'Caregiver Elena', detail: '+389 75 999 888', icon: 'fa-user-nurse', actionTitle: 'Call Caregiver Elena' },
    { name: 'Doctor Office', detail: '+389 72 555 112', icon: 'fa-user-doctor', actionTitle: 'Call Doctor Office' }
  ],
  msg: [
    { name: 'Brother', detail: '+389 71 234 567', icon: 'fa-user', actionTitle: 'Message Brother' },
    { name: 'Mother', detail: '+389 70 123 456', icon: 'fa-user', actionTitle: 'Message Mother' },
    { name: 'Caregiver Elena', detail: '+389 75 999 888', icon: 'fa-user-nurse', actionTitle: 'Message Caregiver Elena' },
    { name: 'Doctor Office', detail: '+389 72 555 112', icon: 'fa-user-doctor', actionTitle: 'Message Doctor Office' }
  ],
  nav: [
    { name: 'Home', detail: 'Partizanska 45 (450m away)', icon: 'fa-house', actionTitle: 'Navigate to Home' },
    { name: 'Doctor Office', detail: 'Mother Teresa Clinic (1.2 km away)', icon: 'fa-hospital', actionTitle: 'Navigate to Doctor Office' },
    { name: 'Eurofarm Pharmacy', detail: 'Kliment Ohridski 12 (280m away)', icon: 'fa-prescription-bottle-medical', actionTitle: 'Navigate to Eurofarm Pharmacy' },
    { name: 'Supermarket Tinex', detail: 'Ilindenska 80 (600m away)', icon: 'fa-cart-shopping', actionTitle: 'Navigate to Supermarket Tinex' }
  ],
  camera: [
    { name: 'Scene & Obstacles', detail: 'AI room & path navigation description', icon: 'fa-eye', actionTitle: 'Scan: Scene & Obstacles' },
    { name: 'Text & Document', detail: 'Live OCR text reader', icon: 'fa-file-lines', actionTitle: 'Scan: Text & Document' },
    { name: 'Color & Light', detail: 'Ambient lighting and clothing tones', icon: 'fa-palette', actionTitle: 'Scan: Color & Light' },
    { name: 'Currency & Cash', detail: 'Banknote identifier', icon: 'fa-money-bill', actionTitle: 'Scan: Currency & Cash' }
  ]
};


export function getSettingsMode() {
  return settingsMode;
}

export function setSettingsMode(mode) {
  settingsMode = mode;
}

export function renderSettings(targetMode = null) {
  if (targetMode) settingsMode = targetMode;
  const container = document.getElementById('settingsCategoryMenu') || document.getElementById('settingsView') || document.getElementById('settingsScreen');
  if (!container) return;

  // ----------------------------------------------------
  // VIEW 1: SETTINGS 3-CATEGORY MENU
  // ----------------------------------------------------
  if (settingsMode === 'categoryMenu') {
    const cat = SETTINGS_CATEGORIES[currentCatIdx];

    const dotsHtml = SETTINGS_CATEGORIES.map((c, idx) => {
      const isActive = idx === currentCatIdx;
      return `
        <span style="
          width: ${isActive ? '22px' : '7px'};
          height: 7px;
          background: ${isActive ? cat.color : '#334155'};
          border-radius: ${isActive ? '4px' : '50%'};
          transition: all 0.25s ease;
          display: inline-block;
        "></span>
      `;
    }).join('');

    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 44px 14px 175px 14px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; user-select: none; overflow: hidden;">
        
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
          <span style="color: #FFEE55; font-size: 0.82rem; font-weight: 800; letter-spacing: 1px;">SETTINGS MENU</span>
          <span style="color: #FFEE55; font-size: 0.85rem; font-weight: bold; background: #181818; padding: 2px 8px; border-radius: 12px; border: 1px solid rgba(255, 238, 85, 0.4);">
            [ ${currentCatIdx + 1} / ${SETTINGS_CATEGORIES.length} ]
          </span>
        </div>

        <!-- Category Hero Card (Centered, Clean, No Side Arrows) -->
        <div id="cardFocusSettingsCat" class="settings-cat-card" style="width: 100%; border: 2.5px solid ${cat.color}; border-radius: 24px; padding: 28px 20px; background: linear-gradient(150deg, rgba(20, 20, 26, 0.96) 0%, rgba(6, 6, 8, 0.98) 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; text-align: center; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.9), 0 0 20px rgba(255, 204, 0, 0.08); margin: auto 0; box-sizing: border-box; cursor: pointer;">
          
          <div style="width: 84px; height: 84px; border-radius: 50%; border: 2.5px solid ${cat.color}; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.03); box-shadow: 0 0 25px rgba(0,0,0,0.8); box-sizing: border-box;">
            <i class="fa-solid ${cat.icon}" style="font-size: 2.6rem; color: ${cat.color}; display: flex; align-items: center; justify-content: center; line-height: 1; width: 100%; height: 100%; margin: 0;"></i>
          </div>

          <div>
            <h2 style="margin: 0; font-size: 1.55rem; font-weight: 900; color: ${cat.color}; letter-spacing: 1px; text-transform: uppercase;">${cat.title}</h2>
            <p style="margin: 6px 0 0 0; font-size: 0.85rem; color: #94A3B8; line-height: 1.3;">${cat.subtitle}</p>
          </div>

          <div style="height: 4px;"></div>
        </div>

        <!-- Carousel Dots -->
        <div style="width: 100%; display: flex; flex-direction: column; align-items: center; gap: 6px;">
          <div style="display: flex; gap: 6px; align-items: center;">
            ${dotsHtml}
          </div>
        </div>

      </div>
    `;

    let _settCatClickCount = 0;
    let _settCatClickTimer = null;
    document.getElementById('cardFocusSettingsCat')?.addEventListener('click', (e) => {
      e.stopPropagation();
      _settCatClickCount++;
      if (_settCatClickCount === 1) {
        _settCatClickTimer = setTimeout(() => {
          _settCatClickCount = 0;
          Speech.speak(`${SETTINGS_CATEGORIES[currentCatIdx].title}. ${SETTINGS_CATEGORIES[currentCatIdx].subtitle}. Double tap to open.`);
        }, 350);
      } else if (_settCatClickCount >= 2) {
        clearTimeout(_settCatClickTimer);
        _settCatClickCount = 0;
        selectSettingsCategory();
      }
    });
    return;
  }



  // ----------------------------------------------------
  // VIEW 2: ACCESSIBILITY PREFERENCES (READING MODE, VIB, PRIVACY)
  // ----------------------------------------------------
  if (settingsMode === 'accessibilityOptions') {
    const currentReading = state.readingMode || 'TTS Only';
    const currentMorseSpeed = state.morseSpeed || 'Medium';
    const currentVib = state.vibStrength || 'Medium';
    const currentPrivacy = state.privacyMode ? 'ON' : 'OFF';

    let badgeHtml = '';
    let optSubtitle = '';
    const optColor = '#FFEE55';
    let optIcon = 'fa-book-open';
    let optTitle = 'READING MODE';

    const prefIdx = (currentSettingIdx % 3 + 3) % 3;

    if (prefIdx === 0) { // Reading mode
      optTitle = 'READING MODE';
      if (currentReading === 'TTS Only') {
        optIcon = 'fa-volume-high';
        optSubtitle = 'Spoken voice synthesis for all menus and messages';
        badgeHtml = `
          <div style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: rgba(255,238,85,0.15); border: 2px solid #FFEE55; border-radius: 24px; padding: 10px 18px; color: #FFEE55; font-weight: 900; font-size: 1.15rem; box-shadow: 0 0 16px rgba(255,238,85,0.25);">
            <i class="fa-solid fa-volume-high"></i> TTS VOICE ONLY
          </div>
        `;
      } else {
        optIcon = 'fa-wave-square';
        optSubtitle = 'Audio beeps and haptic vibration pulses';
        badgeHtml = `
          <div style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: rgba(255,238,85,0.15); border: 2px solid #FFEE55; border-radius: 24px; padding: 10px 18px; color: #FFEE55; font-weight: 900; font-size: 1.15rem; box-shadow: 0 0 16px rgba(255,238,85,0.25);">
            <i class="fa-solid fa-wave-square"></i> MORSE CODE ONLY
          </div>
        `;
      }
    } else if (prefIdx === 1) { // Morse Speed / Tempo
      optTitle = 'MORSE CODE SPEED';
      if (currentMorseSpeed === 'Slow') {
        optIcon = 'fa-gauge-simple';
        optSubtitle = 'Slow training tempo (~8 WPM) • Double Tap to cycle';
        badgeHtml = `
          <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
            <div style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: rgba(255,238,85,0.15); border: 2px solid #FFEE55; border-radius: 24px; padding: 10px 18px; color: #FFEE55; font-weight: 900; font-size: 1.15rem; box-shadow: 0 0 16px rgba(255,238,85,0.25);">
              <i class="fa-solid fa-gauge-simple"></i> SLOW (~8 WPM)
            </div>
            <div style="display: flex; gap: 6px; align-items: center;">
              <span style="width: 32px; height: 6px; background: #FFEE55; border-radius: 3px; box-shadow: 0 0 8px #FFEE55;"></span>
              <span style="width: 32px; height: 6px; background: #1E293B; border-radius: 3px;"></span>
              <span style="width: 32px; height: 6px; background: #1E293B; border-radius: 3px;"></span>
            </div>
          </div>
        `;
      } else if (currentMorseSpeed === 'Fast') {
        optIcon = 'fa-gauge-high';
        optSubtitle = 'Fast advanced tempo (~20 WPM) • Double Tap to cycle';
        badgeHtml = `
          <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
            <div style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: rgba(255,238,85,0.15); border: 2px solid #FFEE55; border-radius: 24px; padding: 10px 18px; color: #FFEE55; font-weight: 900; font-size: 1.15rem; box-shadow: 0 0 16px rgba(255,238,85,0.25);">
              <i class="fa-solid fa-gauge-high"></i> FAST (~20 WPM)
            </div>
            <div style="display: flex; gap: 6px; align-items: center;">
              <span style="width: 32px; height: 6px; background: #FFEE55; border-radius: 3px; box-shadow: 0 0 8px #FFEE55;"></span>
              <span style="width: 32px; height: 6px; background: #FFEE55; border-radius: 3px; box-shadow: 0 0 8px #FFEE55;"></span>
              <span style="width: 32px; height: 6px; background: #FFEE55; border-radius: 3px; box-shadow: 0 0 8px #FFEE55;"></span>
            </div>
          </div>
        `;
      } else {
        optIcon = 'fa-gauge-med';
        optSubtitle = 'Medium standard tempo (~14 WPM) • Double Tap to cycle';
        badgeHtml = `
          <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
            <div style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: rgba(255,238,85,0.15); border: 2px solid #FFEE55; border-radius: 24px; padding: 10px 18px; color: #FFEE55; font-weight: 900; font-size: 1.15rem; box-shadow: 0 0 16px rgba(255,238,85,0.25);">
              <i class="fa-solid fa-gauge-med"></i> MEDIUM (~14 WPM)
            </div>
            <div style="display: flex; gap: 6px; align-items: center;">
              <span style="width: 32px; height: 6px; background: #FFEE55; border-radius: 3px; box-shadow: 0 0 8px #FFEE55;"></span>
              <span style="width: 32px; height: 6px; background: #FFEE55; border-radius: 3px; box-shadow: 0 0 8px #FFEE55;"></span>
              <span style="width: 32px; height: 6px; background: #1E293B; border-radius: 3px;"></span>
            </div>
          </div>
        `;
      }
    } else { // Vibration Intensity
      optTitle = 'VIBRATION INTENSITY';
      if (currentVib === 'Low') {
        optIcon = 'fa-feather';
        optSubtitle = 'Soft gentle vibrations (Level 1 of 3) • Double Tap to change';
        badgeHtml = `
          <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
            <div style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: rgba(255,238,85,0.15); border: 2px solid #FFEE55; border-radius: 24px; padding: 10px 18px; color: #FFEE55; font-weight: 900; font-size: 1.15rem; box-shadow: 0 0 16px rgba(255,238,85,0.25);">
              <i class="fa-solid fa-feather"></i> LOW INTENSITY (GENTLE)
            </div>
            <div style="display: flex; gap: 6px; align-items: center;">
              <span style="width: 32px; height: 6px; background: #FFEE55; border-radius: 3px; box-shadow: 0 0 8px #FFEE55;"></span>
              <span style="width: 32px; height: 6px; background: #1E293B; border-radius: 3px;"></span>
              <span style="width: 32px; height: 6px; background: #1E293B; border-radius: 3px;"></span>
            </div>
          </div>
        `;
      } else if (currentVib === 'High') {
        optIcon = 'fa-bolt-lightning';
        optSubtitle = 'Maximum strong vibrations (Level 3 of 3) • Double Tap to change';
        badgeHtml = `
          <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
            <div style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: rgba(255,238,85,0.15); border: 2px solid #FFEE55; border-radius: 24px; padding: 10px 18px; color: #FFEE55; font-weight: 900; font-size: 1.15rem; box-shadow: 0 0 16px rgba(255,238,85,0.25);">
              <i class="fa-solid fa-bolt-lightning"></i> HIGH INTENSITY (STRONG)
            </div>
            <div style="display: flex; gap: 6px; align-items: center;">
              <span style="width: 32px; height: 6px; background: #FFEE55; border-radius: 3px; box-shadow: 0 0 8px #FFEE55;"></span>
              <span style="width: 32px; height: 6px; background: #FFEE55; border-radius: 3px; box-shadow: 0 0 8px #FFEE55;"></span>
              <span style="width: 32px; height: 6px; background: #FFEE55; border-radius: 3px; box-shadow: 0 0 8px #FFEE55;"></span>
            </div>
          </div>
        `;
      } else {
        optIcon = 'fa-wave-square';
        optSubtitle = 'Standard balanced vibrations (Level 2 of 3) • Double Tap to change';
        badgeHtml = `
          <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
            <div style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: rgba(255,238,85,0.15); border: 2px solid #FFEE55; border-radius: 24px; padding: 10px 18px; color: #FFEE55; font-weight: 900; font-size: 1.15rem; box-shadow: 0 0 16px rgba(255,238,85,0.25);">
              <i class="fa-solid fa-wave-square"></i> MEDIUM INTENSITY (BALANCED)
            </div>
            <div style="display: flex; gap: 6px; align-items: center;">
              <span style="width: 32px; height: 6px; background: #FFEE55; border-radius: 3px; box-shadow: 0 0 8px #FFEE55;"></span>
              <span style="width: 32px; height: 6px; background: #FFEE55; border-radius: 3px; box-shadow: 0 0 8px #FFEE55;"></span>
              <span style="width: 32px; height: 6px; background: #1E293B; border-radius: 3px;"></span>
            </div>
          </div>
        `;
      }
    }

    const dotsHtml = [0, 1, 2].map((idx) => {
      const isActive = idx === prefIdx;
      return `
        <span style="
          width: ${isActive ? '20px' : '6px'};
          height: 6px;
          background: ${isActive ? '#FFEE55' : '#334155'};
          border-radius: ${isActive ? '3px' : '50%'};
          transition: all 0.25s ease;
          display: inline-block;
        "></span>
      `;
    }).join('');

    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 44px 14px 175px 14px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; user-select: none; overflow: hidden;">
        
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
          <span style="color: #FFEE55; font-size: 0.82rem; font-weight: 800; letter-spacing: 0.5px;">ACCESSIBILITY PREFERENCES</span>
          <span style="color: #FFEE55; font-size: 0.85rem; font-weight: bold; background: #181818; padding: 2px 8px; border-radius: 12px; border: 1px solid rgba(255, 238, 85, 0.4);">
            [ ${prefIdx + 1} / 3 ]
          </span>
        </div>

        <!-- Single-Focus Option Card (Centered Layout, No Side Arrows) -->
        <div class="pref-card" style="width: 100%; border: 2.5px solid #FFEE55; border-radius: 24px; padding: 26px 20px; background: linear-gradient(150deg, rgba(20, 20, 26, 0.96) 0%, rgba(6, 6, 8, 0.98) 100%); display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; gap: 16px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.9), 0 0 20px rgba(255, 238, 85, 0.08); cursor: pointer; margin: auto 0; box-sizing: border-box;">
          
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; margin: auto 0; width: 100%;">
            <div style="width: 80px; height: 80px; border-radius: 50%; border: 2.5px solid #FFEE55; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.03); box-shadow: 0 0 25px rgba(0,0,0,0.8); box-sizing: border-box;">
              <i class="fa-solid ${optIcon}" style="font-size: 2.4rem; color: #FFEE55; display: flex; align-items: center; justify-content: center; line-height: 1; width: 100%; height: 100%; margin: 0;"></i>
            </div>

            <div>
              <h2 style="margin: 0 0 8px 0; font-size: 1.5rem; font-weight: 900; color: #FFEE55; letter-spacing: 0.8px; text-transform: uppercase;">${optTitle}</h2>
              ${badgeHtml}
              <p style="margin: 8px 0 0 0; font-size: 0.85rem; color: #94A3B8; line-height: 1.3;">${optSubtitle}</p>
            </div>
          </div>

          <div style="height: 4px;"></div>
        </div>

        <!-- Indicator Dots -->
        <div style="width: 100%; display: flex; flex-direction: column; align-items: center; gap: 6px;">
          <div style="display: flex; gap: 6px; align-items: center;">
            ${dotsHtml}
          </div>
        </div>

      </div>
    `;
    return;
  }


  // ----------------------------------------------------
  // VIEW 3: QUICK ACCESS LIST (ENABLE / DISABLE)
  // ----------------------------------------------------
  if (settingsMode === 'quickAccessList') {
    const quickActions = state.quickActions && state.quickActions.length > 0 ? state.quickActions : [
      { id: '1', title: 'Call Brother', type: 'call', target: 'Brother (+389 71 234 567)', enabled: true, icon: 'fa-phone', color: '#10B981' },
      { id: '2', title: 'Navigate to Home', type: 'nav', target: 'Home (Partizanska 45)', enabled: true, icon: 'fa-location-arrow', color: '#A855F7' },
      { id: '3', title: 'Message Caregiver Elena', type: 'msg', target: 'Caregiver Elena (+389 75 999 888)', enabled: false, icon: 'fa-comment-sms', color: '#00E5FF' },
      { id: '4', title: 'Scan: Scene & Obstacles', type: 'camera', target: 'Scene & Obstacles', enabled: true, icon: 'fa-camera', color: '#FFEE55' }
    ];

    if (!state.quickActions) state.quickActions = quickActions;
    const act = quickActions[currentQuickIdx % quickActions.length];
    const actColor = act.color || (act.type === 'call' ? '#10B981' : (act.type === 'msg' ? '#00E5FF' : (act.type === 'nav' ? '#A855F7' : '#FFEE55')));
    const actIcon = act.icon || (act.type === 'call' ? 'fa-phone' : (act.type === 'msg' ? 'fa-comment-sms' : (act.type === 'nav' ? 'fa-location-arrow' : 'fa-camera')));

    const dotsHtml = quickActions.map((a, idx) => {
      const isActive = idx === (currentQuickIdx % quickActions.length);
      return `
        <span style="
          width: ${isActive ? '24px' : '7px'};
          height: 7px;
          background: ${isActive ? actColor : '#334155'};
          border-radius: ${isActive ? '4px' : '50%'};
          transition: all 0.25s ease;
          display: inline-block;
          box-shadow: ${isActive ? `0 0 8px ${actColor}` : 'none'};
        "></span>
      `;
    }).join('');

    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 44px 14px 175px 14px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; user-select: none; overflow: hidden;">
        
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
          <span style="color: #FFEE55; font-size: 0.82rem; font-weight: 800; letter-spacing: 0.5px;">
            QUICK ACCESS ACTIONS
          </span>
          <span style="color: #FFEE55; font-size: 0.85rem; font-weight: bold; background: #181818; padding: 2px 10px; border-radius: 12px; border: 1px solid rgba(255, 238, 85, 0.4);">
            [ ${(currentQuickIdx % quickActions.length) + 1} / ${quickActions.length} ]
          </span>
        </div>

        <!-- Single-Focus Quick Action Card (Centered, No Side Arrows) -->
        <div class="quick-act-card" style="width: 100%; border: 2.5px solid ${act.enabled ? '#10B981' : '#EF4444'}; border-radius: 24px; padding: 26px 20px; background: linear-gradient(150deg, rgba(20, 20, 26, 0.96) 0%, rgba(6, 6, 8, 0.98) 100%); display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; gap: 14px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.9), 0 0 20px ${act.enabled ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}; cursor: pointer; margin: auto 0; box-sizing: border-box;">
          
          <div style="width: 100%; display: flex; justify-content: flex-start; align-items: center; min-height: 20px;">
            <span style="background: ${act.enabled ? '#10B981' : '#EF4444'}; color: ${act.enabled ? '#000000' : '#FFFFFF'}; font-size: 0.72rem; font-weight: 900; padding: 4px 12px; border-radius: 8px; letter-spacing: 0.5px;">
              ${act.enabled ? 'ENABLED' : 'DISABLED'}
            </span>
          </div>

          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; margin: 12px 0;">
            <div style="width: 80px; height: 80px; border-radius: 50%; border: 2.5px solid ${act.enabled ? '#10B981' : '#EF4444'}; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.03); box-shadow: 0 0 25px rgba(0,0,0,0.8); box-sizing: border-box;">
              <i class="fa-solid ${actIcon}" style="font-size: 2.4rem; color: ${act.enabled ? '#10B981' : '#EF4444'}; display: flex; align-items: center; justify-content: center; line-height: 1; width: 100%; height: 100%; margin: 0;"></i>
            </div>

            <div>
              <h2 style="margin: 0; font-size: 1.5rem; font-weight: 900; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">${act.title}</h2>
              <p style="margin: 6px 0 0 0; font-size: 0.85rem; color: #94A3B8; line-height: 1.3;">${act.target}</p>
            </div>
          </div>

          <div style="height: 4px;"></div>
        </div>

        <!-- Indicator Dots -->
        <div style="width: 100%; display: flex; flex-direction: column; align-items: center; gap: 6px;">
          <div style="display: flex; gap: 6px; align-items: center;">
            ${dotsHtml}
          </div>
        </div>

      </div>
    `;

    document.getElementById('btnToggleQuickAct')?.addEventListener('click', (e) => {
      e.stopPropagation();
      act.enabled = !act.enabled;
      state.quickActions = quickActions;
      saveDb();
      Haptic.trigger('success');
      Speech.speak(act.enabled ? `Enabled ${act.title}.` : `Disabled ${act.title}.`);
      renderSettings();
    });

    document.getElementById('btnOpenAddAction')?.addEventListener('click', (e) => {
      e.stopPropagation();
      handleSettingsGesture('swipeUp');
    });
    return;
  }

  // ----------------------------------------------------
  // VIEW 4: ADD NEW QUICK ACTION (4 ACTION TYPES)
  // ----------------------------------------------------
  if (settingsMode === 'addQuickAction') {
    const actType = QUICK_ACTION_TYPES[newActionTypeIdx % QUICK_ACTION_TYPES.length];

    const dotsHtml = QUICK_ACTION_TYPES.map((a, idx) => {
      const isActive = idx === (newActionTypeIdx % QUICK_ACTION_TYPES.length);
      return `
        <span style="
          width: ${isActive ? '24px' : '7px'};
          height: 7px;
          background: ${isActive ? actType.color : '#334155'};
          border-radius: ${isActive ? '4px' : '50%'};
          transition: all 0.25s ease;
          display: inline-block;
          box-shadow: ${isActive ? `0 0 8px ${actType.color}` : 'none'};
        "></span>
      `;
    }).join('');

    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 44px 14px 175px 14px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; user-select: none; overflow: hidden;">
        
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
          <span style="color: ${actType.color}; font-size: 0.82rem; font-weight: 800; letter-spacing: 0.5px;">ADD QUICK ACTION TYPE</span>
          <span style="color: #FFEE55; font-size: 0.85rem; font-weight: bold; background: #181818; padding: 2px 10px; border-radius: 12px; border: 1px solid rgba(255, 238, 85, 0.4);">
            [ ${(newActionTypeIdx % QUICK_ACTION_TYPES.length) + 1} / 4 ]
          </span>
        </div>

        <!-- Single-Focus Action Type Card (Centered, No Side Arrows) -->
        <div id="cardFocusAddAct" class="add-act-card" style="width: 100%; border: 2.5px solid ${actType.color}; border-radius: 24px; padding: 28px 20px; background: linear-gradient(150deg, rgba(20, 20, 26, 0.96) 0%, rgba(6, 6, 8, 0.98) 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; text-align: center; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.9), 0 0 20px rgba(255, 204, 0, 0.08); cursor: pointer; margin: auto 0; box-sizing: border-box;">
          
          <div style="width: 84px; height: 84px; border-radius: 50%; border: 2.5px solid ${actType.color}; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.03); box-shadow: 0 0 25px rgba(0,0,0,0.8); box-sizing: border-box;">
            <i class="fa-solid ${actType.icon}" style="font-size: 2.6rem; color: ${actType.color}; display: flex; align-items: center; justify-content: center; line-height: 1; width: 100%; height: 100%; margin: 0;"></i>
          </div>

          <div>
            <h2 style="margin: 0; font-size: 1.55rem; font-weight: 900; color: ${actType.color}; letter-spacing: 1px; text-transform: uppercase;">${actType.title}</h2>
            <p style="margin: 6px 0 0 0; font-size: 0.85rem; color: #94A3B8; line-height: 1.3;">${actType.desc}</p>
          </div>

          <div style="height: 4px;"></div>
        </div>

        <!-- Indicator Dots -->
        <div style="width: 100%; display: flex; flex-direction: column; align-items: center; gap: 6px;">
          <div style="display: flex; gap: 4px; align-items: center;">
            ${dotsHtml}
          </div>
        </div>

      </div>
    `;

    document.getElementById('cardFocusAddAct')?.addEventListener('click', proceedToPickTarget);
    return;
  }

  // ----------------------------------------------------
  // VIEW 5: CHOOSE TARGET (CONTACTS, PLACES, OR CAMERA MODES)
  // ----------------------------------------------------
  if (settingsMode === 'chooseTarget') {
    const actType = QUICK_ACTION_TYPES[newActionTypeIdx % QUICK_ACTION_TYPES.length];
    const targets = QUICK_ACTION_TARGETS[actType.id] || QUICK_ACTION_TARGETS['call'];
    const targetObj = targets[targetChoiceIdx % targets.length];

    const dotsHtml = targets.map((t, idx) => {
      const isActive = idx === (targetChoiceIdx % targets.length);
      return `
        <span style="
          width: ${isActive ? '20px' : '6px'};
          height: 6px;
          background: ${isActive ? actType.color : '#334155'};
          border-radius: ${isActive ? '3px' : '50%'};
          transition: all 0.25s ease;
          display: inline-block;
        "></span>
      `;
    }).join('');

    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 44px 14px 175px 14px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; user-select: none; overflow: hidden;">
        
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
          <span style="color: ${actType.color}; font-size: 0.82rem; font-weight: 800; letter-spacing: 0.5px;">
            SELECT FOR: ${actType.title}
          </span>
          <span style="color: #FFEE55; font-size: 0.85rem; font-weight: bold; background: #181818; padding: 2px 8px; border-radius: 12px; border: 1px solid rgba(255, 238, 85, 0.4);">
            [ ${(targetChoiceIdx % targets.length) + 1} / ${targets.length} ]
          </span>
        </div>

        <!-- Single-Focus Target Card (Centered, No Side Arrows) -->
        <div id="cardFocusTarget" class="target-card" style="width: 100%; border: 2.5px solid ${actType.color}; border-radius: 24px; padding: 26px 20px; background: linear-gradient(150deg, rgba(20, 20, 26, 0.96) 0%, rgba(6, 6, 8, 0.98) 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; text-align: center; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.9), 0 0 20px rgba(255, 204, 0, 0.08); cursor: pointer; margin: auto 0; box-sizing: border-box;">
          
          <div style="width: 80px; height: 80px; border-radius: 50%; border: 2.5px solid ${actType.color}; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.03); box-shadow: 0 0 25px rgba(0,0,0,0.8); box-sizing: border-box;">
            <i class="fa-solid ${targetObj.icon}" style="font-size: 2.4rem; color: ${actType.color}; display: flex; align-items: center; justify-content: center; line-height: 1; width: 100%; height: 100%; margin: 0;"></i>
          </div>

          <div>
            <h2 style="margin: 0; font-size: 1.5rem; font-weight: 900; color: #FFFFFF; letter-spacing: 0.5px;">${targetObj.name}</h2>
            <span style="font-size: 0.85rem; color: #94A3B8; display: block; margin-top: 4px;">${targetObj.detail}</span>
          </div>

          <div style="background: rgba(255,255,255,0.04); border: 1.5px dashed ${actType.color}; border-radius: 8px; padding: 6px 14px; font-size: 0.78rem; color: ${actType.color}; font-weight: bold;">
            Creates: "${targetObj.actionTitle}"
          </div>

          <div style="height: 4px;"></div>
        </div>

        <!-- Indicator Dots -->
        <div style="width: 100%; display: flex; flex-direction: column; align-items: center; gap: 6px;">
          <div style="display: flex; gap: 4px; align-items: center;">
            ${dotsHtml}
          </div>
        </div>

      </div>
    `;

    document.getElementById('cardFocusTarget')?.addEventListener('click', saveNewQuickAction);
    return;
  }

  // ----------------------------------------------------
  // VIEW 6: TUTORIAL MODE MENU
  // ----------------------------------------------------
  if (settingsMode === 'tutorialMenu') {
    container.innerHTML = `
      <div id="tutorialMenuSurface" style="width: 100%; height: 100%; box-sizing: border-box; padding: 44px 14px 175px 14px; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; text-align: center; user-select: none; overflow: hidden; cursor: pointer;">
        
        <!-- Tutorial Mode Hero Card -->
        <div style="width: 100%; border: 2.5px solid #00E5FF; border-radius: 24px; padding: 28px 20px; background: linear-gradient(150deg, rgba(20, 20, 26, 0.96) 0%, rgba(6, 6, 8, 0.98) 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; text-align: center; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.9), 0 0 20px rgba(0, 229, 255, 0.08); margin: auto 0; box-sizing: border-box;">
          
          <div style="width: 84px; height: 84px; border-radius: 50%; border: 2.5px solid #00E5FF; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.03); box-shadow: 0 0 25px rgba(0,0,0,0.8); box-sizing: border-box;">
            <i class="fa-solid fa-graduation-cap" style="font-size: 2.6rem; color: #00E5FF; display: flex; align-items: center; justify-content: center; line-height: 1; width: 100%; height: 100%; margin: 0;"></i>
          </div>

          <div>
            <span style="color: #00E5FF; font-size: 0.75rem; font-weight: 900; background: rgba(0,229,255,0.12); padding: 3px 12px; border-radius: 10px; border: 1px solid #00E5FF; letter-spacing: 0.5px; display: inline-block; margin-bottom: 6px;">
              TUTORIAL MODE
            </span>
            <h2 style="margin: 0; font-size: 1.55rem; color: #FFFFFF; font-weight: 900; letter-spacing: 0.5px;">Interactive Voice Tutorial</h2>
            <p style="margin: 6px 0 0 0; font-size: 0.85rem; color: #94A3B8; line-height: 1.4;">Learn gestures, handwriting, Morse typing, and touch zones.</p>
          </div>

          <div style="height: 4px;"></div>
        </div>

      </div>
    `;

    let _tutorialSurfaceClickCount = 0;
    let _tutorialSurfaceClickTimer = null;
    const surf = document.getElementById('tutorialMenuSurface') || container;
    surf.onclick = (e) => {
      e.stopPropagation();
      _tutorialSurfaceClickCount++;
      if (_tutorialSurfaceClickCount === 1) {
        _tutorialSurfaceClickTimer = setTimeout(() => {
          _tutorialSurfaceClickCount = 0;
          Speech.speak("Interactive voice tutorial. Double tap to restart the gesture tutorial.");
        }, 350);
      } else if (_tutorialSurfaceClickCount >= 2) {
        clearTimeout(_tutorialSurfaceClickTimer);
        _tutorialSurfaceClickCount = 0;
        restartTutorial();
      }
    };
    return;
  }
}

export function selectSettingsCategory() {
  const cat = SETTINGS_CATEGORIES[currentCatIdx];
  Haptic.trigger('success');

  if (cat.id === 'accessibility') {
    settingsMode = 'accessibilityOptions';
    currentSettingIdx = 0;
    renderSettings();
    Speech.speak(`Opening reading and feedback settings. Option 1 of 3: READING MODE. Current value: ${state.readingMode || 'TTS Only'}. Double tap to change.`);
  } else if (cat.id === 'quick_access') {
    settingsMode = 'quickAccessList';
    currentQuickIdx = 0;
    renderSettings();
    const actions = (state.db && state.db.quickActions) || [];
    const a = actions[0];
    Speech.speak(`Opening quick access actions. Quick Action 1 of ${actions.length}: ${a ? a.name : 'Call Mother'}. Status: ${a && a.enabled ? 'Enabled.' : 'Disabled.'}. Double tap to toggle.`);
  } else if (cat.id === 'tutorial') {
    settingsMode = 'tutorialMenu';
    renderSettings();
    Speech.speak("Opening gesture tutorial. Double tap to start.");
  }
}

export function setVibrationStrength(level) {
  state.vibStrength = level;
  const hapticMap = { 'Low': 'soft', 'Medium': 'short', 'High': 'heavy' };
  Haptic.trigger(hapticMap[level] || 'short');
  Speech.speak(`Vibration intensity set to ${level}.`);
  saveDb();
  renderSettings();
}

export function setReadingMode(mode) {
  state.readingMode = mode;
  const modeKey = mode === 'Morse Only' ? 'morse' : 'voice';
  if (state.db && state.db.settings) {
    state.db.settings.readingMode = modeKey;
  }
  Haptic.trigger('success');
  Speech.speak(`Reading mode set to ${mode}.`);
  saveDb();
  renderSettings();
}

export function setPrivacyMode(onOff) {
  state.privacyMode = onOff;
  Haptic.trigger('success');
  Speech.speak(onOff ? "Privacy mode turned ON." : "Privacy mode turned OFF.");
  saveDb();
  renderSettings();
}

export function setMorseSpeed(speed) {
  state.morseSpeed = speed;
  if (state.db && state.db.settings) {
    state.db.settings.morseSpeed = speed.toLowerCase();
  }
  Haptic.trigger('success');
  Speech.speak(`Morse code tempo set to ${speed}.`);
  saveDb();
  renderSettings();
  setTimeout(() => {
    Haptic.playMorse('OK');
  }, 900);
}

export function cycleCurrentAccessibilityOption() {
  const readingModes = ['TTS Only', 'Morse Only'];
  const morseSpeeds = ['Slow', 'Medium', 'Fast'];
  const vibLevels = ['Low', 'Medium', 'High'];

  const prefIdx = (currentSettingIdx % 3 + 3) % 3;

  if (prefIdx === 0) {
    // Reading Mode
    const curIdx = readingModes.indexOf(state.readingMode || 'TTS Only');
    const nextMode = readingModes[(curIdx + 1) % readingModes.length];
    setReadingMode(nextMode);
  } else if (prefIdx === 1) {
    // Morse Speed
    const curIdx = morseSpeeds.indexOf(state.morseSpeed || 'Medium');
    const nextSpeed = morseSpeeds[(curIdx + 1) % morseSpeeds.length];
    setMorseSpeed(nextSpeed);
  } else {
    // Vibration Intensity
    const curIdx = vibLevels.indexOf(state.vibStrength || 'Medium');
    const nextVib = vibLevels[(curIdx + 1) % vibLevels.length];
    setVibrationStrength(nextVib);
  }
}


export function proceedToPickTarget() {
  settingsMode = 'chooseTarget';
  targetChoiceIdx = 0;
  Haptic.trigger('success');
  renderSettings();
  announceCurrentTargetChoice();
}

export function saveNewQuickAction() {
  const actType = QUICK_ACTION_TYPES[newActionTypeIdx % QUICK_ACTION_TYPES.length];
  const targets = QUICK_ACTION_TARGETS[actType.id] || QUICK_ACTION_TARGETS['call'];
  const targetObj = targets[targetChoiceIdx % targets.length];

  const newAction = {
    id: String(Date.now()),
    title: targetObj.actionTitle,
    type: actType.id,
    target: `${targetObj.name} (${targetObj.detail})`,
    enabled: true,
    icon: actType.icon,
    color: actType.color
  };

  state.quickActions = [...(state.quickActions || []), newAction];
  saveDb();
  currentQuickIdx = state.quickActions.length - 1;
  settingsMode = 'quickAccessList';
  Haptic.trigger('success');
  Speech.speak(`Created new quick action: ${newAction.title}.`);
  renderSettings();
}

export function restartTutorial() {
  Haptic.trigger('success');
  startTutorialFlow();
}

export function handleSettingsGesture(gesture) {
  // STATE: Category Menu
  if (settingsMode === 'categoryMenu') {
    if (gesture === 'swipeRight') {
      currentCatIdx = (currentCatIdx + 1) % SETTINGS_CATEGORIES.length;
      Haptic.trigger('short');
      renderSettings();
      Speech.speak(`${SETTINGS_CATEGORIES[currentCatIdx].title}. ${SETTINGS_CATEGORIES[currentCatIdx].subtitle}. Double tap to open.`);
    } else if (gesture === 'swipeLeft') {
      currentCatIdx = (currentCatIdx - 1 + SETTINGS_CATEGORIES.length) % SETTINGS_CATEGORIES.length;
      Haptic.trigger('short');
      renderSettings();
      Speech.speak(`${SETTINGS_CATEGORIES[currentCatIdx].title}. ${SETTINGS_CATEGORIES[currentCatIdx].subtitle}. Double tap to open.`);
    } else if (gesture === 'doubleTap') {
      selectSettingsCategory();
    } else if (gesture === 'tap') {
      Haptic.playSound('short');
      Speech.speak(`${SETTINGS_CATEGORIES[currentCatIdx].title}. ${SETTINGS_CATEGORIES[currentCatIdx].subtitle}. Double tap to open.`);
    } else if (gesture === 'longPress' || gesture === 'swipeDown') {
      Haptic.trigger('short');
      navigateTo('mainMenuScreen');
    }
    return;
  }

  // STATE: Accessibility Options
  if (settingsMode === 'accessibilityOptions') {
    if (gesture === 'swipeRight') {
      if (currentSettingIdx >= 2) {
        Haptic.trigger('warning');
        Speech.speak("Last accessibility preference.");
        return;
      }
      currentSettingIdx++;
      Haptic.trigger('short');
      renderSettings();
      announceCurrentAccessibilityOption();
    } else if (gesture === 'swipeLeft') {
      if (currentSettingIdx <= 0) {
        Haptic.trigger('warning');
        Speech.speak("First accessibility preference.");
        return;
      }
      currentSettingIdx--;
      Haptic.trigger('short');
      renderSettings();
      announceCurrentAccessibilityOption();
    } else if (gesture === 'doubleTap') {
      cycleCurrentAccessibilityOption();
    } else if (gesture === 'tap') {
      Haptic.playSound('short');
      announceCurrentAccessibilityOption();
    } else if (gesture === 'longPress' || gesture === 'swipeDown') {
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
      if (currentQuickIdx >= list.length - 1) {
        Haptic.trigger('warning');
        Speech.speak("Last quick action.");
        return;
      }
      currentQuickIdx++;
      Haptic.trigger('short');
      renderSettings();
      announceCurrentQuickAction();
    } else if (gesture === 'swipeLeft' && list.length > 0) {
      if (currentQuickIdx <= 0) {
        Haptic.trigger('warning');
        Speech.speak("First quick action.");
        return;
      }
      currentQuickIdx--;
      Haptic.trigger('short');
      renderSettings();
      announceCurrentQuickAction();
    } else if (gesture === 'doubleTap') {
      const act = list[currentQuickIdx % list.length];
      if (act) {
        act.enabled = !act.enabled;
        saveDb();
        Haptic.trigger('success');
        Speech.speak(act.enabled ? `Enabled ${act.title}.` : `Disabled ${act.title}.`);
        renderSettings();
      }
    } else if (gesture === 'tap') {
      Haptic.playSound('short');
      announceCurrentQuickAction();
    } else if (gesture === 'swipeUp') {
      settingsMode = 'addQuickAction';
      newActionTypeIdx = 0;
      Haptic.trigger('warning');
      renderSettings();
      Speech.speak("Add new quick action. Choose action type: Call contact, Send message, Navigate to place, or Scan object.");
    } else if (gesture === 'longPress' || gesture === 'swipeDown') {
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
      newActionTypeIdx = (newActionTypeIdx + 1) % QUICK_ACTION_TYPES.length;
      Haptic.trigger('short');
      renderSettings();
      announceCurrentAddActionType();
    } else if (gesture === 'swipeLeft') {
      newActionTypeIdx = (newActionTypeIdx - 1 + QUICK_ACTION_TYPES.length) % QUICK_ACTION_TYPES.length;
      Haptic.trigger('short');
      renderSettings();
      announceCurrentAddActionType();
    } else if (gesture === 'doubleTap') {
      proceedToPickTarget();
    } else if (gesture === 'tap') {
      Haptic.playSound('short');
      announceCurrentAddActionType();
    } else if (gesture === 'longPress' || gesture === 'swipeDown') {
      settingsMode = 'quickAccessList';
      Haptic.trigger('short');
      Speech.speak("Cancelled. Returned to Quick Access list.");
      renderSettings();
    }
    return;
  }

  // STATE: Choose Target
  if (settingsMode === 'chooseTarget') {
    const actType = QUICK_ACTION_TYPES[newActionTypeIdx % QUICK_ACTION_TYPES.length];
    const targets = QUICK_ACTION_TARGETS[actType.id] || QUICK_ACTION_TARGETS['call'];

    if (gesture === 'swipeRight') {
      targetChoiceIdx = (targetChoiceIdx + 1) % targets.length;
      Haptic.trigger('short');
      renderSettings();
      announceCurrentTargetChoice();
    } else if (gesture === 'swipeLeft') {
      targetChoiceIdx = (targetChoiceIdx - 1 + targets.length) % targets.length;
      Haptic.trigger('short');
      renderSettings();
      announceCurrentTargetChoice();
    } else if (gesture === 'doubleTap') {
      saveNewQuickAction();
    } else if (gesture === 'tap') {
      Haptic.playSound('short');
      announceCurrentTargetChoice();
    } else if (gesture === 'longPress' || gesture === 'swipeDown') {
      settingsMode = 'addQuickAction';
      Haptic.trigger('short');
      Speech.speak("Cancelled. Returned to action type selection.");
      renderSettings();
    }
    return;
  }

  // STATE: Tutorial Menu
  if (settingsMode === 'tutorialMenu') {
    if (gesture === 'doubleTap') {
      restartTutorial();
    } else if (gesture === 'tap') {
      Haptic.playSound('short');
      Speech.speak("Double tap to restart the gesture tutorial.");
    } else if (gesture === 'longPress' || gesture === 'swipeDown') {
      settingsMode = 'categoryMenu';
      Haptic.trigger('short');
      Speech.speak("Returned to Settings Menu.");
      renderSettings();
    }
  }
}

export function announceCurrentAccessibilityOption() {
  const options = ['Reading Mode', 'Morse Code Speed', 'Vibration Intensity'];
  const values = [state.readingMode || 'TTS Only', state.morseSpeed || 'Medium', state.vibStrength || 'Medium'];
  const idx = (currentSettingIdx % 3 + 3) % 3;
  Speech.speak(`Option ${idx + 1} of 3: ${options[idx]}. Current value: ${values[idx]}.`);
}

export function announceCurrentQuickAction() {
  const list = state.quickActions || [];
  const act = list[currentQuickIdx % list.length];
  if (!act) return;
  Speech.speak(`Quick Action ${(currentQuickIdx % list.length) + 1} of ${list.length}: ${act.title}. Status: ${act.enabled ? 'Enabled.' : 'Disabled.'}`);
}

export function announceCurrentAddActionType() {
  const actType = QUICK_ACTION_TYPES[newActionTypeIdx % QUICK_ACTION_TYPES.length];
  Speech.speak(`Action type ${(newActionTypeIdx % QUICK_ACTION_TYPES.length) + 1} of 4: ${actType.title}. ${actType.desc}. Double tap to select.`);
}

export function announceCurrentTargetChoice() {
  const actType = QUICK_ACTION_TYPES[newActionTypeIdx % QUICK_ACTION_TYPES.length];
  const targets = QUICK_ACTION_TARGETS[actType.id] || QUICK_ACTION_TARGETS['call'];
  const targetObj = targets[targetChoiceIdx % targets.length];
  Speech.speak(`Target ${(targetChoiceIdx % targets.length) + 1} of ${targets.length}: ${targetObj.name}. ${targetObj.detail}. Double tap to create quick action ${targetObj.actionTitle}.`);
}

