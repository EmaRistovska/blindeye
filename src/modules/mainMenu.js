import { state, logSystem } from '../core/state.js';
import { Speech } from '../core/speech.js';
import { Haptic } from '../core/haptics.js';
import { navigateTo } from '../core/router.js';

export const categories = [
  { id: 'messagesScreen', title: 'MESSAGES', subtitle: 'View unread SMS & conversations', icon: 'fa-comment-sms', color: '#00E5FF' },
  { id: 'callsScreen', title: 'PHONE & CONTACTS', subtitle: 'Call favorites & dial numbers', icon: 'fa-phone', color: '#FFEE55' },
  { id: 'cameraScreen', title: 'CAMERA & AI OCR', subtitle: 'Read text & describe scenes', icon: 'fa-camera', color: '#10B981' },
  { id: 'navigationScreen', title: 'GPS NAVIGATION', subtitle: 'Turn-by-turn walking guidance', icon: 'fa-location-dot', color: '#A855F7' },
  { id: 'settingsScreen', title: 'SETTINGS', subtitle: 'Reading mode, haptics & privacy', icon: 'fa-gear', color: '#CBD5E1' }
];

let currentCategoryIndex = 0;

export function renderMainMenu() {
  const container = document.getElementById('mainMenuScreen');
  if (!container) return;

  const current = categories[currentCategoryIndex];

  container.innerHTML = `
    <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 18px 14px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif;">
      
      <!-- Top Card Header -->
      <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
        <span style="color: #FFEE55; font-size: 0.8rem; font-weight: 800; letter-spacing: 1px;">[ MAIN MENU ]</span>
        <span style="color: #FFFFFF; font-size: 0.85rem; font-weight: bold; background: #181818; padding: 2px 8px; border-radius: 12px; border: 1px solid #333;">
          [ ${currentCategoryIndex + 1} / ${categories.length} ]
        </span>
      </div>

      <!-- Single Focus Hero Category Card -->
      <div class="main-category-card" style="width: 100%; border: 3px solid ${current.color}; border-radius: 20px; padding: 24px 16px; background: rgba(0,0,0,0.9); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; text-align: center; box-shadow: 0 0 25px rgba(0, 229, 255, 0.15); margin: auto 0; cursor: pointer;">
        
        <div style="width: 90px; height: 90px; border-radius: 50%; border: 3px solid ${current.color}; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.03);">
          <i class="fa-solid ${current.icon}" style="font-size: 2.8rem; color: ${current.color};"></i>
        </div>

        <div>
          <h2 style="margin: 0; font-size: 1.6rem; font-weight: 900; color: ${current.color}; letter-spacing: 1px;">${current.title}</h2>
          
        </div>

        <div style="margin-top: 4px; padding: 4px 12px; background: rgba(255,255,255,0.08); border-radius: 14px; font-size: 0.72rem; color: #FFEE55; font-weight: bold;">
          Double Tap to Open
        </div>
      </div>

      <!-- Bottom Hint Bar -->
      <div style="width: 100%; border-top: 1px dashed #333; padding-top: 8px; text-align: center;">
        <span style="color: #64748B; font-size: 0.7rem;">Swipe Right: Next • Swipe Left: Previous • Long Press: Help</span>
      </div>

    </div>
  `;

  // Bind click on card to select
  container.querySelector('.main-category-card')?.addEventListener('click', () => {
    selectCurrentCategory();
  });
}

export function handleMainMenuGesture(gesture) {
  if (gesture === 'swipeRight') {
    currentCategoryIndex = (currentCategoryIndex + 1) % categories.length;
    Haptic.trigger('short');
    renderMainMenu();
    announceCurrentCategory();
  }
  else if (gesture === 'swipeLeft') {
    currentCategoryIndex = (currentCategoryIndex - 1 + categories.length) % categories.length;
    Haptic.trigger('short');
    renderMainMenu();
    announceCurrentCategory();
  }
  else if (gesture === 'doubleTap' || gesture === 'tap') {
    selectCurrentCategory();
  }
  else if (gesture === 'longPress') {
    Haptic.trigger('long');
    Speech.speak("Main Menu Help: Swipe right or left inside the navigation bar to browse categories. Double tap to select.");
  }
}

export function announceCurrentCategory() {
  const current = categories[currentCategoryIndex];
  Speech.speak(`${current.title}. ${current.subtitle}. Double tap to open.`);
}

export function selectCurrentCategory() {
  const current = categories[currentCategoryIndex];
  Haptic.trigger('success');
  Speech.speak(`Opening ${current.title}.`);
  navigateTo(current.id);
}
