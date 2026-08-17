import { state, saveDb, logSystem } from '../core/state.js';
import { Speech } from '../core/speech.js';
import { Haptic } from '../core/haptics.js';
import { navigateTo } from '../core/router.js';

let currentSettingIndex = 0;

export function renderSettings() {
  const container = document.getElementById('settingsScreen');
  if (!container) return;

  const currentSettings = (state.db && state.db.settings) || {
    readingMode: 'voice',
    vibeIntensity: 'medium',
    privacyMode: 'auto'
  };

  const settingItems = [
    {
      key: 'readingMode',
      title: 'READING MODE',
      value: currentSettings.readingMode.toUpperCase(),
      options: ['voice', 'morse', 'combined'],
      desc: 'Voice synthesis, Deaf-Blind Morse motor vibration, or both.',
      icon: 'fa-ear-listen',
      color: '#00E5FF'
    },
    {
      key: 'vibeIntensity',
      title: 'HAPTIC INTENSITY',
      value: currentSettings.vibeIntensity.toUpperCase(),
      options: ['low', 'medium', 'high'],
      desc: 'Physical vibration motor pulse strength.',
      icon: 'fa-wave-square',
      color: '#FFEE55'
    },
    {
      key: 'privacyMode',
      title: 'PRIVACY SCREEN',
      value: currentSettings.privacyMode.toUpperCase(),
      options: ['auto', 'off'],
      desc: 'Blacks out display in public for complete screen privacy.',
      icon: 'fa-shield-halved',
      color: '#10B981'
    }
  ];

  const active = settingItems[currentSettingIndex];

  container.innerHTML = `
    <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 18px 14px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif;">
      
      <!-- Header -->
      <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-sliders" style="color: #CBD5E1; font-size: 1.1rem;"></i>
          <span style="color: #CBD5E1; font-size: 0.9rem; font-weight: 800;">PREFERENCES</span>
        </div>
        <span style="color: #FFFFFF; font-size: 0.8rem; font-weight: bold; background: #181818; padding: 2px 8px; border-radius: 12px; border: 1px solid #333;">
          [ ${currentSettingIndex + 1} / ${settingItems.length} ]
        </span>
      </div>

      <!-- Single Focus Setting Card -->
      <div class="setting-focus-card" style="width: 100%; border: 3px solid ${active.color}; border-radius: 20px; padding: 24px 16px; background: #07090E; display: flex; flex-direction: column; gap: 14px; margin: auto 0; text-align: center; box-shadow: 0 0 20px rgba(0, 229, 255, 0.1); cursor: pointer;">
        
        <div style="width: 70px; height: 70px; border-radius: 50%; background: rgba(255,255,255,0.05); border: 2px solid ${active.color}; display: flex; align-items: center; justify-content: center; margin: 0 auto;">
          <i class="fa-solid ${active.icon}" style="font-size: 2rem; color: ${active.color};"></i>
        </div>

        <div>
          <h2 style="margin: 0; font-size: 1.3rem; color: #FFFFFF; font-weight: 900;">${active.title}</h2>
          <div style="font-size: 1.4rem; color: ${active.color}; font-weight: 900; margin-top: 8px; background: #0D131F; padding: 6px 12px; border-radius: 8px; border: 1px solid #1E293B;">
            ${active.value}
          </div>
          <p style="margin: 10px 0 0 0; font-size: 0.75rem; color: #94A3B8;">${active.desc}</p>
        </div>

        <button id="btnCycleSetting" style="width: 100%; padding: 12px; background: ${active.color}; color: #000; border: none; border-radius: 10px; font-weight: 900; font-size: 0.9rem; cursor: pointer; margin-top: 6px;">
          DOUBLE TAP TO CYCLE OPTION
        </button>
      </div>

      <!-- Hint -->
      <div style="width: 100%; border-top: 1px dashed #333; padding-top: 6px; text-align: center;">
        <span style="color: #64748B; font-size: 0.7rem;">Swipe Right/Left: Next/Prev Setting • Double Tap: Toggle</span>
      </div>

    </div>
  `;

  document.getElementById('btnCycleSetting')?.addEventListener('click', () => {
    cycleSettingValue(active);
  });
}

export function cycleSettingValue(setting) {
  if (!state.db) return;
  if (!state.db.settings) state.db.settings = {};

  const currentVal = state.db.settings[setting.key] || setting.options[0];
  const nextIdx = (setting.options.indexOf(currentVal) + 1) % setting.options.length;
  const nextVal = setting.options[nextIdx];

  state.db.settings[setting.key] = nextVal;
  saveDb();

  Haptic.trigger('success');
  Speech.speak(`${setting.title} set to ${nextVal.toUpperCase()}.`);
  renderSettings();
}

export function handleSettingsGesture(gesture) {
  const settingKeys = ['readingMode', 'vibeIntensity', 'privacyMode'];

  if (gesture === 'swipeRight') {
    currentSettingIndex = (currentSettingIndex + 1) % settingKeys.length;
    Haptic.trigger('short');
    renderSettings();
    announceCurrentSetting();
  }
  else if (gesture === 'swipeLeft') {
    currentSettingIndex = (currentSettingIndex - 1 + settingKeys.length) % settingKeys.length;
    Haptic.trigger('short');
    renderSettings();
    announceCurrentSetting();
  }
  else if (gesture === 'doubleTap' || gesture === 'tap') {
    document.getElementById('btnCycleSetting')?.click();
  }
}

export function announceCurrentSetting() {
  const currentSettings = (state.db && state.db.settings) || {};
  const settingKeys = ['readingMode', 'vibeIntensity', 'privacyMode'];
  const activeKey = settingKeys[currentSettingIndex];
  const activeVal = (currentSettings[activeKey] || 'default').toUpperCase();
  Speech.speak(`${activeKey.toUpperCase()}: Currently ${activeVal}. Double tap to change.`);
}
