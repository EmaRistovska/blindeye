import { state, saveDb, logSystem } from '../core/state.js';
import { Speech, formatPhoneForTTS } from '../core/speech.js';
import { Haptic } from '../core/haptics.js';
import { navigateTo } from '../core/router.js';
import { recognizeDigit } from '../core/recognition.js';

// Phone Sub-Navigation Modes (5 Categories)
const PHONE_CATEGORIES = [
  { id: 'contacts', title: 'CONTACTS', subtitle: 'Browse all contacts & actions', icon: 'fa-address-book', color: '#FFEE55' },
  { id: 'recents', title: 'RECENTS', subtitle: 'Recent incoming & outgoing calls', icon: 'fa-clock-rotate-left', color: '#FFEE55' },
  { id: 'favorites', title: 'FAVORITES', subtitle: 'Quick access favorite contacts', icon: 'fa-star', color: '#FFEE55' },
  { id: 'emergency', title: 'EMERGENCY CONTACTS', subtitle: 'Designated emergency speed dial', icon: 'fa-shield-heart', color: '#EF4444' },
  { id: 'dialer', title: 'HANDWRITING DIALER', subtitle: 'Draw numbers on screen to call', icon: 'fa-keyboard', color: '#FFEE55' }
];

let currentCategoryIdx = 0;
let phoneViewMode = 'categoryMenu'; // 'categoryMenu', 'recentsList', 'contactsList', 'contactActions', 'favoritesList', 'emergencyList', 'dialer', 'dialerConfirm', 'activeCall'

let selectedRecentIdx = 0;
const DEFAULT_RECENTS = [
  { name: 'Mother', phone: '+389 70 123 456', type: 'Incoming', time: '12:05 PM', icon: 'fa-arrow-down-left', color: '#10B981' },
  { name: 'Doctor Office', phone: '+389 71 234 567', type: 'Outgoing', time: '10:15 AM', icon: 'fa-arrow-up-right', color: '#00E5FF' },
  { name: 'Brother', phone: '+389 71 987 654', type: 'Missed', time: '09:30 AM', icon: 'fa-phone-slash', color: '#EF4444' },
  { name: 'Central Pharmacy', phone: '+389 78 555 666', type: 'Incoming', time: 'Yesterday', icon: 'fa-arrow-down-left', color: '#10B981' }
];


let selectedContactIdx = 0;
let currentActionIdx = 0;
let dialedNumber = '';
let dialerConfirmed = false;
let currentDialerActionIdx = 0;
let callDuration = 0;
let callTimer = null;
let callerSourceMode = 'categoryMenu';

let contactSaveNameText = '';
let contactSaveMorseBuffer = '';
let contactSaveLetterTimer = null;
let contactSaveDashTimer = null;
let contactSaveIsDash = false;
let contactSaveDownTime = 0;
let contactSaveStartX = 0;
let contactSaveStartY = 0;

const morseAlphabet = {
  '.-': 'A', '-...': 'B', '-.-.': 'C', '-..': 'D', '.': 'E', '..-.': 'F',
  '--.': 'G', '....': 'H', '..': 'I', '.---': 'J', '-.-': 'K', '.-..': 'L',
  '--': 'M', '-.': 'N', '---': 'O', '.--.': 'P', '--.-': 'Q', '.-.': 'R',
  '...': 'S', '-': 'T', '..-': 'U', '...-': 'V', '.--': 'W', '-..-': 'X',
  '-.--': 'Y', '--..': 'Z', '.----': '1', '..---': '2', '...--': '3',
  '....-': '4', '.....': '5', '-....': '6', '--...': '7', '---..': '8',
  '----.': '9', '-----': '0'
};

const DIALER_ACTIONS = [
  { id: 'call', title: 'CALL NUMBER', subtitle: 'Place voice call to dialed number', icon: 'fa-phone', color: '#FFEE55' },
  { id: 'save', title: 'SAVE TO CONTACTS', subtitle: 'Add number as new contact in directory', icon: 'fa-user-plus', color: '#FFEE55' }
];

const CONTACT_ACTIONS = [
  { id: 'call', title: 'CALL CONTACT', icon: 'fa-phone', color: '#FFEE55' },
  { id: 'toggle_fav', title: 'TOGGLE FAVORITE', icon: 'fa-star', color: '#FFEE55' },
  { id: 'toggle_emerg', title: 'TOGGLE EMERGENCY', icon: 'fa-shield-heart', color: '#EF4444' },
  { id: 'delete', title: 'DELETE CONTACT', icon: 'fa-trash-can', color: '#FFEE55' }
];

export function getPhoneViewMode() {
  return phoneViewMode;
}

export function setPhoneViewMode(mode) {
  phoneViewMode = mode;
}

export function renderPhone(targetMode = null) {
  if (targetMode) phoneViewMode = targetMode;
  const container = document.getElementById('phoneCategoryMenu') || document.getElementById('callsScreen');
  if (!container) return;

  const allContacts = (state.db && state.db.contacts) || [];

  // ----------------------------------------------------
  // VIEW 1: ACTIVE CALL SCREEN
  // ----------------------------------------------------
  if (phoneViewMode === 'activeCall') {
    container.innerHTML = `
      <div id="activeCallSurface" class="active-call-container" style="width: 100%; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 24px; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; cursor: pointer; user-select: none;">
        
        <div class="caller-photo-avatar">
          <i class="fa-solid fa-user-large"></i>
        </div>

        <div style="text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px;">
          <h2 class="caller-name" id="activeCallName">${state.activeCallContact || 'Mother'}</h2>
          <div class="call-duration" id="callTimerDisplay">00:00</div>
        </div>

        <div class="call-status" id="activeCallStatus">
          <span class="call-status-dot"></span> Active Call
        </div>

      </div>
    `;

    let _activeCallClickCount = 0;
    let _activeCallClickTimer = null;
    const callSurf = document.getElementById('activeCallSurface') || container;
    callSurf.onclick = (e) => {
      e.stopPropagation();
      _activeCallClickCount++;
      if (_activeCallClickCount === 1) {
        _activeCallClickTimer = setTimeout(() => {
          _activeCallClickCount = 0;
          Speech.speak(`Call connected with ${state.activeCallContact || 'Mother'}. Double tap to end call.`);
        }, 350);
      } else if (_activeCallClickCount >= 2) {
        clearTimeout(_activeCallClickTimer);
        _activeCallClickCount = 0;
        endCall();
      }
    };
    return;
  }

  // ----------------------------------------------------
  // VIEW 2: PHONE 5-CATEGORY SUB-MENU
  // ----------------------------------------------------
  if (phoneViewMode === 'categoryMenu') {
    const cat = PHONE_CATEGORIES[currentCategoryIdx];

    const dotsHtml = PHONE_CATEGORIES.map((c, idx) => {
      const isActive = idx === currentCategoryIdx;
      return `
        <span style="
          width: ${isActive ? '24px' : '7px'};
          height: 7px;
          background: ${isActive ? cat.color : '#334155'};
          border-radius: ${isActive ? '4px' : '50%'};
          transition: all 0.25s ease;
          display: inline-block;
          box-shadow: ${isActive ? `0 0 8px ${cat.color}` : 'none'};
        "></span>
      `;
    }).join('');

    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 40px 16px 165px 16px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; user-select: none; overflow: hidden;">
        
        <!-- Header Bar -->
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
          <span style="color: ${cat.color}; font-size: 0.82rem; font-weight: 800; letter-spacing: 1px;">PHONE MENU</span>
          <span style="color: #FFEE55; font-size: 0.85rem; font-weight: bold; background: #181818; padding: 2px 10px; border-radius: 12px; border: 1px solid rgba(255, 238, 85, 0.4);">
            [ ${currentCategoryIdx + 1} / ${PHONE_CATEGORIES.length} ]
          </span>
        </div>

        <!-- Single Focus Hero Category Card (Centered, Clean, No Overlap) -->
        <div id="cardFocusPhoneCat" class="phone-cat-card" style="width: 100%; border: 2.5px solid ${cat.color}; border-radius: 24px; padding: 28px 20px; background: linear-gradient(150deg, rgba(20, 20, 26, 0.96) 0%, rgba(6, 6, 8, 0.98) 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; text-align: center; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.9), 0 0 20px rgba(255, 204, 0, 0.08); margin: auto 0; box-sizing: border-box; cursor: pointer;">
          
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

    let _phoneCatClickCount = 0;
    let _phoneCatClickTimer = null;
    document.getElementById('cardFocusPhoneCat')?.addEventListener('click', (e) => {
      e.stopPropagation();
      _phoneCatClickCount++;
      if (_phoneCatClickCount === 1) {
        _phoneCatClickTimer = setTimeout(() => {
          _phoneCatClickCount = 0;
          announceCurrentCategory();
        }, 350);
      } else if (_phoneCatClickCount >= 2) {
        clearTimeout(_phoneCatClickTimer);
        _phoneCatClickCount = 0;
        selectPhoneCategory();
      }
    });
    return;
  }



  // ----------------------------------------------------
  // VIEW 3: CONTACTS LIST (ALL CONTACTS)
  // ----------------------------------------------------
  if (phoneViewMode === 'contactsList') {
    const contact = allContacts[selectedContactIdx] || { name: 'Mother', phone: '+389 70 123 456' };

    const dotsHtml = allContacts.map((c, idx) => {
      const isActive = idx === selectedContactIdx;
      return `
        <span style="
          width: ${isActive ? '22px' : '7px'};
          height: 7px;
          background: ${isActive ? '#FFEE55' : '#334155'};
          border-radius: ${isActive ? '4px' : '50%'};
          transition: all 0.25s ease;
          display: inline-block;
          box-shadow: ${isActive ? '0 0 8px #FFEE55' : 'none'};
        "></span>
      `;
    }).join('');

    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 40px 16px 165px 16px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; user-select: none; overflow: hidden;">
        
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
          <span style="color: #FFEE55; font-size: 0.88rem; font-weight: 800; text-transform: uppercase;">CONTACTS DIRECTORY</span>
          <span style="color: #FFEE55; font-size: 0.85rem; font-weight: bold; background: #181818; padding: 2px 10px; border-radius: 12px; border: 1px solid rgba(255, 238, 85, 0.4);">
            [ ${selectedContactIdx + 1} / ${allContacts.length} ]
          </span>
        </div>

        <!-- Contact Focus Card (Centered, No Side Arrows) -->
        <div id="cardFocusContact" class="contact-focus-card" style="width: 100%; border: 2.5px solid #FFEE55; border-radius: 24px; padding: 24px 18px; background: linear-gradient(150deg, rgba(20, 20, 26, 0.96) 0%, rgba(6, 6, 8, 0.98) 100%); display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.9), 0 0 20px rgba(255, 238, 85, 0.1); cursor: pointer; margin: auto 0; box-sizing: border-box;">
          <div style="width: 100%; display: flex; justify-content: flex-start; align-items: center; min-height: 20px;">
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              ${contact.favorite ? `<span style="background: #00E5FF; color: #000; font-size: 0.65rem; font-weight: 900; padding: 2px 8px; border-radius: 6px;">★ FAVORITE</span>` : ''}
              ${contact.emergency ? `<span style="background: #EF4444; color: #FFF; font-size: 0.65rem; font-weight: 900; padding: 2px 8px; border-radius: 6px;">🚨 EMERGENCY</span>` : ''}
            </div>
          </div>

          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; margin: 14px 0;">
            <div style="width: 76px; height: 76px; border-radius: 50%; background: rgba(255, 238, 85, 0.1); border: 2.5px solid #FFEE55; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(255, 238, 85, 0.2); box-sizing: border-box;">
              <i class="fa-solid fa-user-large" style="color: #FFEE55; font-size: 1.8rem; display: flex; align-items: center; justify-content: center; line-height: 1; width: 100%; height: 100%; margin: 0;"></i>
            </div>
            <div>
              <h2 style="margin: 0; font-size: 1.55rem; color: #FFFFFF; font-weight: 900; letter-spacing: 0.5px;">${contact.name}</h2>
              <span style="font-size: 1rem; color: #FFEE55; font-family: monospace; letter-spacing: 0.5px; font-weight: 800;">${contact.phone}</span>
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

    let _contactCardClickCount = 0;
    let _contactCardClickTimer = null;
    document.getElementById('cardFocusContact')?.addEventListener('click', (e) => {
      e.stopPropagation();
      _contactCardClickCount++;
      if (_contactCardClickCount === 1) {
        _contactCardClickTimer = setTimeout(() => {
          _contactCardClickCount = 0;
          announceCurrentContact();
        }, 350);
      } else if (_contactCardClickCount >= 2) {
        clearTimeout(_contactCardClickTimer);
        _contactCardClickCount = 0;
        openContactActions();
      }
    });
    return;
  }

  // ----------------------------------------------------
  // VIEW 4: CONTACT ACTION MENU (4 CATEGORIES)
  // ----------------------------------------------------
  if (phoneViewMode === 'contactActions') {
    const contact = allContacts[selectedContactIdx] || { name: 'Mother', phone: '+389 70 123 456' };
    const act = CONTACT_ACTIONS[currentActionIdx];

    // Dynamic title for toggles
    let actionLabel = act.title;
    if (act.id === 'toggle_fav') {
      actionLabel = contact.favorite ? 'REMOVE FROM FAVORITES' : 'ADD TO FAVORITES';
    } else if (act.id === 'toggle_emerg') {
      actionLabel = contact.emergency ? 'REMOVE FROM EMERGENCY' : 'ADD TO EMERGENCY';
    }

    const actionDotsHtml = CONTACT_ACTIONS.map((a, idx) => {
      const isActive = idx === currentActionIdx;
      return `
        <span style="
          width: ${isActive ? '22px' : '7px'};
          height: 7px;
          background: ${isActive ? act.color : '#334155'};
          border-radius: ${isActive ? '4px' : '50%'};
          transition: all 0.25s ease;
          display: inline-block;
          box-shadow: ${isActive ? `0 0 8px ${act.color}` : 'none'};
        "></span>
      `;
    }).join('');

    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 40px 16px 165px 16px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; user-select: none; overflow: hidden;">
        
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
          <span style="color: #FFEE55; font-size: 0.82rem; font-weight: bold;">Actions for ${contact.name}</span>
          <span style="color: #FFEE55; font-size: 0.85rem; font-weight: bold; background: #181818; padding: 2px 10px; border-radius: 12px; border: 1px solid rgba(255, 238, 85, 0.4);">
            [ ${currentActionIdx + 1} / ${CONTACT_ACTIONS.length} ]
          </span>
        </div>

        <!-- Single Focus Action Card (Centered, No Side Arrows) -->
        <div id="cardFocusContactAction" class="action-card" style="width: 100%; border: 2.5px solid ${act.color}; border-radius: 24px; padding: 26px 18px; background: linear-gradient(150deg, rgba(20, 20, 26, 0.96) 0%, rgba(6, 6, 8, 0.98) 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; text-align: center; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.9), 0 0 20px rgba(255, 238, 85, 0.08); cursor: pointer; margin: auto 0; box-sizing: border-box;">
          <div style="width: 80px; height: 80px; border-radius: 50%; border: 2.5px solid ${act.color}; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.04); box-shadow: 0 0 20px rgba(0,0,0,0.6); box-sizing: border-box;">
            <i class="fa-solid ${act.icon}" style="font-size: 2.4rem; color: ${act.color}; display: flex; align-items: center; justify-content: center; line-height: 1; width: 100%; height: 100%; margin: 0;"></i>
          </div>

          <div>
            <h2 style="margin: 0; font-size: 1.4rem; font-weight: 900; color: ${act.color}; letter-spacing: 0.5px;">${actionLabel}</h2>
            <p style="margin: 6px 0 0 0; font-size: 0.85rem; color: #94A3B8;">${contact.name} (${contact.phone})</p>
          </div>

          <div style="height: 4px;"></div>
        </div>

        <!-- Indicator Dots -->
        <div style="width: 100%; display: flex; flex-direction: column; align-items: center; gap: 6px;">
          <div style="display: flex; gap: 6px; align-items: center;">
            ${actionDotsHtml}
          </div>
        </div>

      </div>
    `;

    let _actionCardClickCount = 0;
    let _actionCardClickTimer = null;
    document.getElementById('cardFocusContactAction')?.addEventListener('click', (e) => {
      e.stopPropagation();
      _actionCardClickCount++;
      if (_actionCardClickCount === 1) {
        _actionCardClickTimer = setTimeout(() => {
          _actionCardClickCount = 0;
          announceCurrentContactAction();
        }, 350);
      } else if (_actionCardClickCount >= 2) {
        clearTimeout(_actionCardClickTimer);
        _actionCardClickCount = 0;
        executeContactAction();
      }
    });
    return;
  }

  // ----------------------------------------------------
  // VIEW 5: RECENTS LIST SCREEN
  // ----------------------------------------------------
  if (phoneViewMode === 'recentsList') {

    const recents = (state.db && state.db.recents) || DEFAULT_RECENTS;
    const rec = recents[selectedRecentIdx % recents.length];

    const dotsHtml = recents.map((r, idx) => {
      const isActive = idx === (selectedRecentIdx % recents.length);
      return `
        <span style="
          width: ${isActive ? '22px' : '7px'};
          height: 7px;
          background: ${isActive ? '#FFEE55' : '#334155'};
          border-radius: ${isActive ? '4px' : '50%'};
          transition: all 0.25s ease;
          display: inline-block;
          box-shadow: ${isActive ? '0 0 8px #FFEE55' : 'none'};
        "></span>
      `;
    }).join('');

    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 40px 16px 165px 16px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; user-select: none; overflow: hidden;">
        
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
          <span style="color: #FFEE55; font-size: 0.88rem; font-weight: 800; text-transform: uppercase;">RECENT CALLS</span>
          <span style="color: #FFEE55; font-size: 0.85rem; font-weight: bold; background: #181818; padding: 2px 10px; border-radius: 12px; border: 1px solid rgba(255, 238, 85, 0.4);">
            [ ${(selectedRecentIdx % recents.length) + 1} / ${recents.length} ]
          </span>
        </div>

        <!-- Single Focus Recent Call Card (Centered, No Side Arrows) -->
        <div id="cardFocusRecent" class="recent-focus-card" style="width: 100%; border: 2.5px solid #FFEE55; border-radius: 24px; padding: 24px 18px; background: linear-gradient(150deg, rgba(20, 20, 26, 0.96) 0%, rgba(6, 6, 8, 0.98) 100%); display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.9), 0 0 20px rgba(255, 238, 85, 0.1); cursor: pointer; margin: auto 0; box-sizing: border-box;">
          <div style="width: 100%; display: flex; justify-content: space-between; align-items: center;">
            <span style="background: #FFEE55; color: #000; font-size: 0.65rem; font-weight: 900; padding: 2px 8px; border-radius: 6px;">
              <i class="fa-solid ${rec.icon || 'fa-phone'}"></i> ${rec.type.toUpperCase()}
            </span>
            <span style="font-size: 0.75rem; color: #FFEE55; font-weight: bold; background: #181818; padding: 2px 8px; border-radius: 8px;">${rec.time}</span>
          </div>

          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; margin: 14px 0;">
            <div style="width: 72px; height: 72px; border-radius: 50%; background: rgba(255, 238, 85, 0.1); border: 2.5px solid #FFEE55; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(255, 238, 85, 0.2);">
              <i class="fa-solid fa-user" style="color: #FFEE55; font-size: 1.8rem;"></i>
            </div>
            <div>
              <h2 style="margin: 0; font-size: 1.55rem; color: #FFFFFF; font-weight: 900; letter-spacing: 0.5px;">${rec.name}</h2>
              <span style="font-size: 1rem; color: #FFEE55; font-family: monospace; letter-spacing: 0.5px; font-weight: 800;">${rec.phone}</span>
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

    let _recentCardClickCount = 0;
    let _recentCardClickTimer = null;
    document.getElementById('cardFocusRecent')?.addEventListener('click', (e) => {
      e.stopPropagation();
      _recentCardClickCount++;
      if (_recentCardClickCount === 1) {
        _recentCardClickTimer = setTimeout(() => {
          _recentCardClickCount = 0;
          announceCurrentRecent();
        }, 350);
      } else if (_recentCardClickCount >= 2) {
        clearTimeout(_recentCardClickTimer);
        _recentCardClickCount = 0;
        startCall(rec.name);
      }
    });
    return;
  }

  // ----------------------------------------------------
  // VIEW 6: FAVORITES LIST SCREEN
  // ----------------------------------------------------
  if (phoneViewMode === 'favoritesList') {
    const favorites = allContacts.filter(c => c.favorite);

    if (favorites.length === 0) {
      container.innerHTML = `
        <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 20px; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #000; color: #FFF; text-align: center;">
          <i class="fa-solid fa-star" style="font-size: 3rem; color: #64748B; margin-bottom: 12px;"></i>
          <h3 style="margin: 0; color: #FFEE55;">No Favorite Contacts Saved</h3>
          <p style="font-size: 0.8rem; color: #64748B; margin-top: 6px;">Add favorites from Contacts list. Long press to return.</p>
        </div>
      `;
      return;
    }

    const contact = favorites[selectedContactIdx % favorites.length];

    const dotsHtml = favorites.map((c, idx) => {
      const isActive = idx === (selectedContactIdx % favorites.length);
      return `
        <span style="
          width: ${isActive ? '22px' : '7px'};
          height: 7px;
          background: ${isActive ? '#FFEE55' : '#334155'};
          border-radius: ${isActive ? '4px' : '50%'};
          transition: all 0.25s ease;
          display: inline-block;
          box-shadow: ${isActive ? '0 0 8px #FFEE55' : 'none'};
        "></span>
      `;
    }).join('');

    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 40px 16px 165px 16px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; user-select: none; overflow: hidden;">
        
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
          <span style="color: #FFEE55; font-size: 0.88rem; font-weight: 800; text-transform: uppercase;">FAVORITE CONTACTS</span>
          <span style="color: #FFEE55; font-size: 0.85rem; font-weight: bold; background: #181818; padding: 2px 10px; border-radius: 12px; border: 1px solid rgba(255, 238, 85, 0.4);">
            [ ${(selectedContactIdx % favorites.length) + 1} / ${favorites.length} ]
          </span>
        </div>

        <!-- Single Focus Favorite Card (Centered, No Side Arrows) -->
        <div id="cardFocusFav" class="fav-focus-card" style="width: 100%; border: 2.5px solid #FFEE55; border-radius: 24px; padding: 24px 18px; background: linear-gradient(150deg, rgba(20, 20, 26, 0.96) 0%, rgba(6, 6, 8, 0.98) 100%); display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.9), 0 0 20px rgba(255, 238, 85, 0.1); cursor: pointer; margin: auto 0; box-sizing: border-box;">
          <div style="width: 100%; display: flex; justify-content: flex-start; align-items: center; min-height: 20px;">
            <span style="background: #FFEE55; color: #000; font-size: 0.65rem; font-weight: 900; padding: 2px 8px; border-radius: 6px;">
              ★ SPEED DIAL
            </span>
          </div>

          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; margin: 14px 0;">
            <div style="width: 72px; height: 72px; border-radius: 50%; background: rgba(255, 238, 85, 0.1); border: 2.5px solid #FFEE55; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(255, 238, 85, 0.2);">
              <i class="fa-solid fa-star" style="color: #FFEE55; font-size: 1.8rem;"></i>
            </div>
            <div>
              <h2 style="margin: 0; font-size: 1.55rem; color: #FFFFFF; font-weight: 900; letter-spacing: 0.5px;">${contact.name}</h2>
              <span style="font-size: 1rem; color: #FFEE55; font-family: monospace; letter-spacing: 0.5px; font-weight: 800;">${contact.phone}</span>
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

    let _favCardClickCount = 0;
    let _favCardClickTimer = null;
    document.getElementById('cardFocusFav')?.addEventListener('click', (e) => {
      e.stopPropagation();
      _favCardClickCount++;
      if (_favCardClickCount === 1) {
        _favCardClickTimer = setTimeout(() => {
          _favCardClickCount = 0;
          announceCurrentFavorite();
        }, 350);
      } else if (_favCardClickCount >= 2) {
        clearTimeout(_favCardClickTimer);
        _favCardClickCount = 0;
        startCall(contact.name);
      }
    });
    return;
  }

  // ----------------------------------------------------
  // VIEW 7: EMERGENCY CONTACTS LIST SCREEN
  // ----------------------------------------------------
  if (phoneViewMode === 'emergencyList') {
    const emerg = allContacts.filter(c => c.emergency);

    if (emerg.length === 0) {
      container.innerHTML = `
        <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 20px; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #000; color: #FFF; text-align: center;">
          <i class="fa-solid fa-shield-heart" style="font-size: 3rem; color: #EF4444; margin-bottom: 12px;"></i>
          <h3 style="margin: 0; color: #EF4444;">No Emergency Contacts Assigned</h3>
          <p style="font-size: 0.8rem; color: #64748B; margin-top: 6px;">Designate emergency contacts from Contacts list.</p>
        </div>
      `;
      return;
    }

    const contact = emerg[selectedContactIdx % emerg.length];

    const dotsHtml = emerg.map((c, idx) => {
      const isActive = idx === (selectedContactIdx % emerg.length);
      return `
        <span style="
          width: ${isActive ? '22px' : '7px'};
          height: 7px;
          background: ${isActive ? '#EF4444' : '#334155'};
          border-radius: ${isActive ? '4px' : '50%'};
          transition: all 0.25s ease;
          display: inline-block;
          box-shadow: ${isActive ? '0 0 8px #EF4444' : 'none'};
        "></span>
      `;
    }).join('');

    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 40px 16px 165px 16px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; user-select: none; overflow: hidden;">
        
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
          <span style="color: #EF4444; font-size: 0.88rem; font-weight: 800; text-transform: uppercase;">EMERGENCY SPEED DIAL</span>
          <span style="color: #FFEE55; font-size: 0.85rem; font-weight: bold; background: #181818; padding: 2px 10px; border-radius: 12px; border: 1px solid rgba(255, 238, 85, 0.4);">
            [ ${(selectedContactIdx % emerg.length) + 1} / ${emerg.length} ]
          </span>
        </div>

        <!-- Single Focus Emergency Contact Card (Centered, No Side Arrows) -->
        <div id="cardFocusEmerg" class="emerg-focus-card" style="width: 100%; border: 2.5px solid #EF4444; border-radius: 24px; padding: 24px 18px; background: linear-gradient(150deg, rgba(20, 20, 26, 0.96) 0%, rgba(6, 6, 8, 0.98) 100%); display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.9), 0 0 20px rgba(239, 68, 68, 0.15); cursor: pointer; margin: auto 0; box-sizing: border-box;">
          <div style="width: 100%; display: flex; justify-content: flex-start; align-items: center; min-height: 20px;">
            <span style="background: #EF4444; color: #FFF; font-size: 0.65rem; font-weight: 900; padding: 2px 8px; border-radius: 6px;">
              🚨 EMERGENCY SOS
            </span>
          </div>

          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; margin: 14px 0;">
            <div style="width: 72px; height: 72px; border-radius: 50%; background: rgba(239, 68, 68, 0.12); border: 2.5px solid #EF4444; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(239, 68, 68, 0.25);">
              <i class="fa-solid fa-shield-heart" style="color: #EF4444; font-size: 1.8rem;"></i>
            </div>
            <div>
              <h2 style="margin: 0; font-size: 1.55rem; color: #FFFFFF; font-weight: 900; letter-spacing: 0.5px;">${contact.name}</h2>
              <span style="font-size: 1rem; color: #EF4444; font-family: monospace; letter-spacing: 0.5px; font-weight: 800;">${contact.phone}</span>
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

    let _emergCardClickCount = 0;
    let _emergCardClickTimer = null;
    document.getElementById('cardFocusEmerg')?.addEventListener('click', (e) => {
      e.stopPropagation();
      _emergCardClickCount++;
      if (_emergCardClickCount === 1) {
        _emergCardClickTimer = setTimeout(() => {
          _emergCardClickCount = 0;
          announceCurrentEmergency();
        }, 350);
      } else if (_emergCardClickCount >= 2) {
        clearTimeout(_emergCardClickTimer);
        _emergCardClickCount = 0;
        startCall(contact.name);
      }
    });
    return;
  }

  // ----------------------------------------------------
  // VIEW 8: HANDWRITING DIALER SCREEN (BLANK CANVAS)
  // ----------------------------------------------------
  if (phoneViewMode === 'dialer') {
    const formattedDisplay = dialedNumber ? dialedNumber : '_ _ _ _ _ _ _ _ _';
    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 40px 16px 165px 16px; display: flex; flex-direction: column; justify-content: flex-start; gap: 14px; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; user-select: none; overflow: hidden;">
        
        <!-- Header Bar (Safely below notch) -->
        <div style="display: flex; justify-content: flex-start; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-keyboard" style="color: #10B981; font-size: 1rem;"></i>
            <span style="color: #10B981; font-size: 0.9rem; font-weight: 800; letter-spacing: 0.5px;">HANDWRITING DIALER</span>
          </div>
        </div>

        <!-- Live Number Draft Box -->
        <div style="background: #070D18; border: 2px solid ${dialerConfirmed ? '#10B981' : '#10B981'}; border-radius: 16px; padding: 10px 14px; text-align: center; box-shadow: 0 0 16px rgba(16, 185, 129, 0.15);">
          <div style="font-size: 0.68rem; color: #94A3B8; font-weight: bold; margin-bottom: 2px; text-align: left;">DIALED NUMBER:</div>
          <div id="dialerNumberDisplay" style="font-size: 1.5rem; color: #FFEE55; font-family: monospace; font-weight: 900; letter-spacing: 3px; min-height: 30px; word-break: break-all;">
            ${formattedDisplay}
          </div>
        </div>

        <!-- Pitch-Black Handwriting Touch Canvas Area (Extended with Solid Border) -->
        <div id="dialerTouchArea" style="flex: 1; width: 100%; min-height: 260px; border: 2px solid #1E293B; border-radius: 18px; background: #020408; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: crosshair; touch-action: none; box-shadow: inset 0 0 20px rgba(0,0,0,0.8); box-sizing: border-box;">
          <canvas id="handwritingCanvas" style="width: 100%; height: 100%; display: block; touch-action: none;"></canvas>
          
          <!-- Recognized Digit Toast Overlay -->
          <div id="canvasToast" style="position: absolute; top: 14px; background: rgba(16, 185, 129, 0.2); border: 1.5px solid #10B981; color: #10B981; padding: 6px 18px; border-radius: 20px; font-weight: 800; font-size: 0.95rem; display: none; z-index: 10; pointer-events: none;"></div>

          <div id="canvasPlaceholder" style="position: absolute; pointer-events: none; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: #334155;">
            <i class="fa-solid fa-pen-fancy" style="font-size: 2.5rem; color: #334155;"></i>
            <span style="font-size: 0.85rem; color: #475569; font-weight: 600;">Draw digits (0-9) here</span>
          </div>
        </div>

      </div>
    `;

    // Canvas Stroke Drawing & Recognition Engine
    const canvas = document.getElementById('handwritingCanvas');
    const placeholder = document.getElementById('canvasPlaceholder');
    const toastEl = document.getElementById('canvasToast');

    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width || canvas.clientWidth || 300;
      canvas.height = rect.height || canvas.clientHeight || 220;
      const ctx = canvas.getContext('2d');
      let isDrawing = false;
      let strokePoints = [];
      let strokeStartTime = 0;

      const getPos = (e) => {
        const b = canvas.getBoundingClientRect();
        return {
          x: e.clientX - b.left,
          y: e.clientY - b.top
        };
      };

      canvas.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        try { canvas.setPointerCapture(e.pointerId); } catch (_) {}

        isDrawing = true;
        strokeStartTime = Date.now();
        if (placeholder) placeholder.style.display = 'none';
        strokePoints = [];

        const pos = getPos(e);
        strokePoints.push(pos);

        ctx.strokeStyle = '#00E5FF';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = '#00E5FF';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
      });

      canvas.addEventListener('pointermove', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (!isDrawing) return;

        const pos = getPos(e);
        strokePoints.push(pos);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      });

      const finishStroke = (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (!isDrawing) return;
        isDrawing = false;
        try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}

        if (strokePoints.length < 2) return;

        // Detect quick horizontal flick left (< 220ms, dx < -40px) as quick delete gesture
        const duration = Date.now() - strokeStartTime;
        const dx = strokePoints[strokePoints.length - 1].x - strokePoints[0].x;
        const dy = strokePoints[strokePoints.length - 1].y - strokePoints[0].y;
        if (duration < 220 && dx < -40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          handlePhoneGesture('swipeLeft');
          return;
        }

        // Recognize digit using canonical model & geometric engine
        const digit = recognizeDigit(strokePoints);
        if (digit !== null && digit !== undefined) {
          dialedNumber += digit;
          dialerConfirmed = false;
          Haptic.trigger('short');
          Speech.speak(digit);

          if (toastEl) {
            toastEl.innerHTML = `<i class="fa-solid fa-check"></i> DIGIT: [ <strong>${digit}</strong> ]`;
            toastEl.style.display = 'block';
          }

          const displayEl = document.getElementById('dialerNumberDisplay');
          if (displayEl) {
            displayEl.textContent = dialedNumber;
          }

          setTimeout(() => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (toastEl) toastEl.style.display = 'none';
            if (placeholder && !dialedNumber) placeholder.style.display = 'flex';
          }, 350);
        }
      };

      canvas.addEventListener('pointerup', finishStroke);
      canvas.addEventListener('pointercancel', finishStroke);
    }

    document.getElementById('btnDialerDelete')?.addEventListener('click', (e) => {
      e.stopPropagation();
      handlePhoneGesture('swipeLeft');
    });

    document.getElementById('btnDialerCall')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!dialedNumber) dialedNumber = '+389 70 123 456';
      startCall(dialedNumber);
    });
    return;
  }

  // ----------------------------------------------------
  // VIEW 8: DIALER ACTION MENU SCREEN
  // ----------------------------------------------------
  if (phoneViewMode === 'dialerActions') {
    const currentAction = DIALER_ACTIONS[currentDialerActionIdx];
    const targetNum = dialedNumber || '+389 70 123 456';
    const displayTitle = currentAction.id === 'call' ? `CALL NUMBER` : currentAction.title;
    const displaySub = currentAction.id === 'call' ? `Place call to ${targetNum}` : currentAction.subtitle;

    const dotsHtml = DIALER_ACTIONS.map((a, idx) => {
      const isActive = idx === currentDialerActionIdx;
      return `
        <span style="
          width: ${isActive ? '22px' : '7px'};
          height: 7px;
          background: ${isActive ? currentAction.color : '#334155'};
          border-radius: ${isActive ? '4px' : '50%'};
          transition: all 0.25s ease;
          display: inline-block;
          box-shadow: ${isActive ? `0 0 8px ${currentAction.color}` : 'none'};
        "></span>
      `;
    }).join('');

    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 40px 16px 165px 16px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; user-select: none; overflow: hidden;">
        
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: ${currentAction.color}; font-size: 0.88rem; font-weight: 800; text-transform: uppercase;">DIALER ACTIONS</span>
          </div>
          <span style="color: #FFEE55; font-size: 0.85rem; font-weight: bold; background: #181818; padding: 2px 10px; border-radius: 12px; border: 1px solid rgba(255, 238, 85, 0.4);">
            [ ${currentDialerActionIdx + 1} / ${DIALER_ACTIONS.length} ]
          </span>
        </div>

        <!-- Focus Action Card (Centered, No Side Arrows) -->
        <div id="cardFocusDialerAction" style="width: 100%; border: 2.5px solid ${currentAction.color}; border-radius: 24px; padding: 26px 18px; background: linear-gradient(150deg, rgba(20, 20, 26, 0.96) 0%, rgba(6, 6, 8, 0.98) 100%); display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.9), 0 0 20px rgba(255, 238, 85, 0.08); cursor: pointer; margin: auto 0; box-sizing: border-box;">
          <div style="font-size: 0.75rem; color: #94A3B8; background: #181818; padding: 2px 10px; border-radius: 10px; border: 1px solid #333;">
            Target: ${targetNum}
          </div>

          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; margin: 14px 0;">
            <div style="width: 76px; height: 76px; border-radius: 50%; background: rgba(255, 255, 255, 0.04); border: 2.5px solid ${currentAction.color}; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(0,0,0,0.6); box-sizing: border-box;">
              <i class="fa-solid ${currentAction.icon}" style="color: ${currentAction.color}; font-size: 2.2rem; display: flex; align-items: center; justify-content: center; line-height: 1; width: 100%; height: 100%; margin: 0;"></i>
            </div>
            <div>
              <h2 style="margin: 0; font-size: 1.4rem; color: #FFFFFF; font-weight: 900; letter-spacing: 0.5px;">${displayTitle}</h2>
              <span style="font-size: 0.85rem; color: #94A3B8; line-height: 1.3;">${displaySub}</span>
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

    let _dialerActionClickCount = 0;
    let _dialerActionClickTimer = null;
    document.getElementById('cardFocusDialerAction')?.addEventListener('click', (e) => {
      e.stopPropagation();
      _dialerActionClickCount++;
      if (_dialerActionClickCount === 1) {
        _dialerActionClickTimer = setTimeout(() => {
          _dialerActionClickCount = 0;
          announceCurrentDialerAction();
        }, 350);
      } else if (_dialerActionClickCount >= 2) {
        clearTimeout(_dialerActionClickTimer);
        _dialerActionClickCount = 0;
        executeDialerAction();
      }
    });
    return;
  }

  // ----------------------------------------------------
  // VIEW 10: SAVE CONTACT NAME INPUT SCREEN
  // ----------------------------------------------------
  if (phoneViewMode === 'saveContactName') {
    const targetNum = dialedNumber || '+389 70 123 456';
    const formattedName = contactSaveNameText ? contactSaveNameText : '_ _ _ _';
    const morseIndicator = contactSaveMorseBuffer ? contactSaveMorseBuffer.replace(/\./g, ' • ').replace(/-/g, ' — ') : '';

    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 40px 16px 165px 16px; display: flex; flex-direction: column; justify-content: flex-start; gap: 12px; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; user-select: none; overflow: hidden;">
        
        <!-- Header Bar (Safely below notch) -->
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: #FFEE55; font-size: 0.88rem; font-weight: 800; text-transform: uppercase;">SAVE CONTACT</span>
          </div>
          <span style="color: #00E5FF; font-size: 0.78rem; font-family: monospace; font-weight: bold; background: #181818; padding: 2px 10px; border-radius: 12px; border: 1px solid #333;">
            ${targetNum}
          </span>
        </div>

        <!-- Live Name & Surname Draft Box -->
        <div style="width: 100%; background: #070D18; border: 2px solid #FFEE55; border-radius: 16px; padding: 12px 14px; text-align: center; box-shadow: 0 0 16px rgba(255, 238, 85, 0.15); box-sizing: border-box; margin: 4px 0;">
          <div style="font-size: 0.68rem; color: #94A3B8; font-weight: bold; margin-bottom: 2px; text-align: left;">NAME & SURNAME:</div>
          <div id="contactSaveDraftName" style="font-size: 1.35rem; color: #FFFFFF; font-weight: 900; letter-spacing: 1px; min-height: 28px; word-break: break-word;">
            ${formattedName}
          </div>
          <div id="contactSaveMorseBufferDisplay" style="font-family: monospace; font-size: 0.9rem; color: #FFEE55; letter-spacing: 4px; min-height: 18px; font-weight: 800; margin-top: 2px;">
            ${morseIndicator ? `[ ${morseIndicator} ]` : ''}
          </div>
        </div>

        <!-- Expanded Morse Tapping / Input Surface -->
        <div id="contactSaveMorseSurface" style="width: 100%; flex: 1; min-height: 250px; margin: 6px 0 0 0; border: 2px dashed #FFEE55; border-radius: 18px; background: #020408; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; touch-action: none; box-shadow: inset 0 0 20px rgba(0,0,0,0.8); box-sizing: border-box;">
          <div id="contactSaveDotCircle" style="width: 80px; height: 80px; border-radius: 50%; border: 2.5px solid #FFEE55; display: flex; align-items: center; justify-content: center; background: rgba(255,238,85,0.12); box-shadow: 0 0 25px rgba(255,238,85,0.25);">
            <i class="fa-solid fa-fingerprint" style="color: #FFEE55; font-size: 2.5rem;"></i>
          </div>
        </div>

      </div>
    `;

    bindContactSaveListeners();
    return;
  }
}

function updateContactSaveDisplay() {
  const nameEl = document.getElementById('contactSaveDraftName');
  const bufferEl = document.getElementById('contactSaveMorseBufferDisplay');
  if (nameEl) {
    nameEl.textContent = contactSaveNameText ? contactSaveNameText : '_ _ _ _';
  }
  if (bufferEl) {
    if (contactSaveMorseBuffer) {
      const symbols = contactSaveMorseBuffer.replace(/\./g, ' • ').replace(/-/g, ' — ');
      const letter = morseAlphabet[contactSaveMorseBuffer] || '...';
      bufferEl.textContent = `[ ${symbols} ] → ${letter}`;
    } else {
      bufferEl.textContent = '';
    }
  }
}

function scheduleContactMorseCommit() {
  if (contactSaveLetterTimer) clearTimeout(contactSaveLetterTimer);
  contactSaveLetterTimer = setTimeout(() => {
    if (contactSaveMorseBuffer) {
      const char = morseAlphabet[contactSaveMorseBuffer];
      if (char) {
        contactSaveNameText += char;
        Haptic.trigger('success');
        Speech.speak(`Letter ${char}`);
      } else {
        Speech.speak("Unknown Morse symbol");
      }
      contactSaveMorseBuffer = '';
      updateContactSaveDisplay();
    }
  }, 900);
}

function bindContactSaveListeners() {
  const surf = document.getElementById('contactSaveMorseSurface');
  if (surf) {
    surf.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      contactSaveDownTime = Date.now();
      contactSaveStartX = e.clientX;
      contactSaveStartY = e.clientY;
      contactSaveIsDash = false;

      if (contactSaveDashTimer) clearTimeout(contactSaveDashTimer);
      contactSaveDashTimer = setTimeout(() => {
        contactSaveIsDash = true;
        contactSaveMorseBuffer += '-';
        Haptic.trigger('long');
        Speech.speak("Dash");
        updateContactSaveDisplay();
        scheduleContactMorseCommit();
      }, 260);
    });

    surf.addEventListener('pointermove', (e) => {
      if (!contactSaveDownTime) return;
      const dx = e.clientX - contactSaveStartX;
      const dy = e.clientY - contactSaveStartY;
      if (Math.hypot(dx, dy) > 22) {
        if (contactSaveDashTimer) {
          clearTimeout(contactSaveDashTimer);
          contactSaveDashTimer = null;
        }
      }
    });

    surf.addEventListener('pointerup', (e) => {
      e.stopPropagation();
      if (contactSaveDashTimer) {
        clearTimeout(contactSaveDashTimer);
        contactSaveDashTimer = null;
      }
      if (!contactSaveDownTime) return;

      const duration = Date.now() - contactSaveDownTime;
      const dx = e.clientX - contactSaveStartX;
      const dy = e.clientY - contactSaveStartY;
      contactSaveDownTime = 0;

      // Swipes
      const minSwipe = 28;
      if (Math.abs(dy) >= minSwipe && Math.abs(dy) >= Math.abs(dx)) {
        if (dy < 0) {
          handlePhoneGesture('swipeUp');
        } else {
          handlePhoneGesture('swipeDown');
        }
        return;
      }

      if (Math.abs(dx) >= minSwipe && Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) {
          handlePhoneGesture('swipeRight');
        } else {
          handlePhoneGesture('swipeLeft');
        }
        return;
      }

      if (contactSaveIsDash) {
        contactSaveIsDash = false;
        return;
      }

      if (duration < 260) {
        contactSaveMorseBuffer += '.';
        Haptic.trigger('short');
        Speech.speak("Dot");
        updateContactSaveDisplay();
        scheduleContactMorseCommit();
      }
    });
  }

  document.getElementById('btnContactVoiceDictate')?.addEventListener('click', (e) => {
    e.stopPropagation();
    startContactVoiceDictate();
  });

  document.getElementById('btnContactDelete')?.addEventListener('click', (e) => {
    e.stopPropagation();
    handlePhoneGesture('swipeLeft');
  });

  document.getElementById('btnContactSave')?.addEventListener('click', (e) => {
    e.stopPropagation();
    doSaveContact();
  });
}

export function startContactVoiceDictate() {
  Haptic.trigger('short');
  Speech.speak("Listening for contact name. Speak now.");

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        contactSaveNameText = transcript;
        Haptic.trigger('success');
        Speech.speak(`Name recorded: "${transcript}". Double tap or swipe right to save.`);
        renderPhone();
      };
      recognition.onerror = () => {
        contactSaveNameText = "Jane Doe";
        Haptic.trigger('success');
        Speech.speak(`Name recorded: "Jane Doe". Double tap or swipe right to save.`);
        renderPhone();
      };
      recognition.start();
      return;
    } catch (e) {}
  }

  contactSaveNameText = "Jane Doe";
  Haptic.trigger('success');
  Speech.speak(`Name recorded: "Jane Doe". Double tap or swipe right to save.`);
  renderPhone();
}

export function doSaveContact() {
  if (contactSaveLetterTimer) clearTimeout(contactSaveLetterTimer);
  if (contactSaveMorseBuffer) {
    const char = morseAlphabet[contactSaveMorseBuffer];
    if (char) contactSaveNameText += char;
    contactSaveMorseBuffer = '';
  }

  const finalName = contactSaveNameText.trim() || 'New Contact';
  const finalPhone = dialedNumber || '+389 70 123 456';

  if (!state.db) state.db = {};
  if (!state.db.contacts) state.db.contacts = [];

  const newContact = {
    name: finalName,
    phone: finalPhone,
    favorite: false,
    emergency: false
  };

  state.db.contacts.unshift(newContact);
  saveDb();

  Haptic.trigger('success');
  Speech.speak(`Contact ${finalName} saved. Opening contacts directory.`);

  contactSaveNameText = '';
  contactSaveMorseBuffer = '';
  dialedNumber = '';
  selectedContactIdx = 0;
  phoneViewMode = 'contactsList';
  renderPhone();
}

export function selectPhoneCategory() {
  const cat = PHONE_CATEGORIES[currentCategoryIdx];
  Haptic.trigger('success');

  if (cat.id === 'recents') {
    phoneViewMode = 'recentsList';
    selectedRecentIdx = 0;
    renderPhone();
    const recents = (state.db && state.db.recents) || DEFAULT_RECENTS;
    const r = recents[0];
    const phoneStr = r ? formatPhoneForTTS(r.phone) : '';
    Speech.speak(`Opening recent calls. Recent call 1 of ${recents.length}: ${r.name}. ${r.type} call at ${r.time}. ${phoneStr}. Double tap to call back.`);
  } else if (cat.id === 'contacts') {
    phoneViewMode = 'contactsList';
    selectedContactIdx = 0;
    renderPhone();
    const allContacts = (state.db && state.db.contacts) || [];
    const c = allContacts[0];
    const phoneStr = c ? formatPhoneForTTS(c.phone) : '';
    Speech.speak(`Opening contacts directory. Contact 1 of ${allContacts.length}: ${c.name}. ${phoneStr}. Double tap for contact actions.`);
  } else if (cat.id === 'favorites') {
    phoneViewMode = 'favoritesList';
    selectedContactIdx = 0;
    renderPhone();
    const allContacts = (state.db && state.db.contacts) || [];
    const favs = allContacts.filter(c => c.favorite);
    const f = favs[0];
    const phoneStr = f ? formatPhoneForTTS(f.phone) : '';
    Speech.speak(`Opening favorite contacts. Favorite contact 1 of ${favs.length}: ${f ? f.name : 'None'}. ${phoneStr}. Double tap to call.`);
  } else if (cat.id === 'emergency') {
    phoneViewMode = 'emergencyList';
    selectedContactIdx = 0;
    renderPhone();
    const allContacts = (state.db && state.db.contacts) || [];
    const emergs = allContacts.filter(c => c.emergency);
    const e = emergs[0];
    const phoneStr = e ? formatPhoneForTTS(e.phone) : '';
    Speech.speak(`Opening emergency contacts. Emergency contact 1 of ${emergs.length}: ${e ? e.name : 'None'}. ${phoneStr}. Double tap to call.`);
  } else if (cat.id === 'dialer') {
    phoneViewMode = 'dialer';
    dialedNumber = '';
    renderPhone();
    Speech.speak("Opening handwriting dialer. Draw numbers on screen. Swipe left to delete, swipe up to prepare call.");
  }
}

export function openContactActions() {
  phoneViewMode = 'contactActions';
  currentActionIdx = 0;
  Haptic.trigger('success');
  renderPhone();
  const allContacts = (state.db && state.db.contacts) || [];
  const contact = allContacts[selectedContactIdx] || { name: 'Contact', phone: '+389 70 123 456' };
  const phoneStr = formatPhoneForTTS(contact.phone);
  Speech.speak(`Opening contact actions for ${contact.name}. Action 1 of ${CONTACT_ACTIONS.length}: CALL CONTACT. ${contact.name} (${phoneStr}). Double tap to execute.`);
}

export function executeContactAction() {
  const allContacts = (state.db && state.db.contacts) || [];
  const contact = allContacts[selectedContactIdx];
  const act = CONTACT_ACTIONS[currentActionIdx];

  if (!contact) return;

  if (act.id === 'call') {
    startCall(contact.name);
  } else if (act.id === 'toggle_fav') {
    contact.favorite = !contact.favorite;
    saveDb();
    Haptic.trigger('success');
    Speech.speak(contact.favorite ? `Added ${contact.name} to favorites.` : `Removed ${contact.name} from favorites.`);
    phoneViewMode = 'contactsList';
    renderPhone();
  } else if (act.id === 'toggle_emerg') {
    contact.emergency = !contact.emergency;
    saveDb();
    Haptic.trigger('success');
    Speech.speak(contact.emergency ? `Added ${contact.name} to emergency contacts.` : `Removed ${contact.name} from emergency contacts.`);
    phoneViewMode = 'contactsList';
    renderPhone();
  } else if (act.id === 'delete') {
    state.db.contacts = allContacts.filter((_, idx) => idx !== selectedContactIdx);
    saveDb();
    Haptic.trigger('warning');
    Speech.speak(`Deleted contact ${contact.name}.`);
    selectedContactIdx = Math.max(0, Math.min(selectedContactIdx, (state.db.contacts || []).length - 1));
    phoneViewMode = 'contactsList';
    renderPhone();
  }
}

export function prepareDialerCall() {
  const targetNum = dialedNumber || '+389 70 123 456';
  Haptic.trigger('warning');
  Speech.speak(`Draft number: ${targetNum}. Double tap to place call.`);
}


export function deleteDialedDigit() {
  if (dialedNumber) {
    dialedNumber = dialedNumber.slice(0, -1);
    Haptic.trigger('warning');
    Speech.speak(dialedNumber ? `Deleted digit. Remaining: ${dialedNumber}` : "Number cleared.");
    renderPhone();
  }
}

export function renderActiveCall() {
  const contactName = state.activeCallContact || 'Mother';
  const nameEl = document.getElementById('activeCallName');
  if (nameEl) nameEl.innerText = contactName;

  const timerEl = document.getElementById('activeCallTimer') || document.getElementById('callTimerDisplay');
  if (timerEl) timerEl.innerText = '00:00';

  if (callTimer) clearInterval(callTimer);
  callDuration = 0;
  callTimer = setInterval(() => {
    callDuration++;
    const mins = String(Math.floor(callDuration / 60)).padStart(2, '0');
    const secs = String(callDuration % 60).padStart(2, '0');
    const display = document.getElementById('activeCallTimer') || document.getElementById('callTimerDisplay');
    if (display) display.innerText = `${mins}:${secs}`;
  }, 1000);

  // Bind double-tap to end call on #activeCallScreen and #btnEndCall
  const activeScreen = document.getElementById('activeCallScreen');
  if (activeScreen) {
    let _activeScreenClickCount = 0;
    let _activeScreenClickTimer = null;
    activeScreen.onclick = (e) => {
      e.stopPropagation();
      _activeScreenClickCount++;
      if (_activeScreenClickCount === 1) {
        _activeScreenClickTimer = setTimeout(() => {
          _activeScreenClickCount = 0;
          Speech.speak(`Call connected with ${contactName}. Double tap to end call.`);
        }, 350);
      } else if (_activeScreenClickCount >= 2) {
        clearTimeout(_activeScreenClickTimer);
        _activeScreenClickCount = 0;
        endCall();
      }
    };
  }
}

export function startCall(nameOrNumber) {
  state.activeCallContact = nameOrNumber;
  callerSourceMode = phoneViewMode;
  phoneViewMode = 'activeCall';
  callDuration = 0;

  Haptic.trigger('success');
  Speech.speak(`Calling ${nameOrNumber} now. Connected.`);

  navigateTo('activeCallScreen');
  renderActiveCall();
}

export function endCall() {
  if (callTimer) clearInterval(callTimer);
  Haptic.trigger('error');
  if (callerSourceMode === 'recentsList') {
    Speech.speak("Call ended. Returned to recent calls.");
    phoneViewMode = 'recentsList';
    navigateTo('phoneCategoryMenu');
  } else if (callerSourceMode === 'favoritesList') {
    Speech.speak("Call ended. Returned to favorite contacts.");
    phoneViewMode = 'favoritesList';
    navigateTo('phoneCategoryMenu');
  } else if (callerSourceMode === 'emergencyList') {
    Speech.speak("Call ended. Returned to emergency contacts.");
    phoneViewMode = 'emergencyList';
    navigateTo('phoneCategoryMenu');
  } else if (callerSourceMode === 'contactsList' || callerSourceMode === 'contactActions') {
    Speech.speak("Call ended. Returned to contacts list.");
    phoneViewMode = 'contactsList';
    navigateTo('phoneCategoryMenu');
  } else if (callerSourceMode === 'dialer' || callerSourceMode === 'dialerConfirm') {
    Speech.speak("Call ended. Returned to dialer.");
    phoneViewMode = 'dialer';
    navigateTo('phoneCategoryMenu');
  } else if (callerSourceMode === 'sosScreen' || state.currentScreen === 'activeCallScreen') {
    Speech.speak("Call ended. Returning to Main Menu.");
    navigateTo('mainMenuScreen');
  } else {
    Speech.speak("Call ended. Returned to phone menu.");
    phoneViewMode = 'categoryMenu';
    navigateTo('phoneCategoryMenu');
  }
  renderPhone();
}

export function handlePhoneGesture(gesture, isInNavZone = false) {
  const allContacts = (state.db && state.db.contacts) || [];

  // STATE: Active Connected Call
  if (phoneViewMode === 'activeCall' || state.currentScreen === 'activeCallScreen') {
    if (gesture === 'doubleTap') {
      endCall();
    } else if (gesture === 'tap') {
      Speech.speak(`Call connected with ${state.activeCallContact || 'Mother'}. Double tap to end call.`);
    }
    return;
  }

  // STATE: Category Menu
  if (phoneViewMode === 'categoryMenu') {
    if (gesture === 'swipeRight') {
      currentCategoryIdx = (currentCategoryIdx + 1) % PHONE_CATEGORIES.length;
      Haptic.trigger('short');
      renderPhone();
      Speech.speak(`${PHONE_CATEGORIES[currentCategoryIdx].title}. ${PHONE_CATEGORIES[currentCategoryIdx].subtitle}. Double tap to open.`);
    } else if (gesture === 'swipeLeft') {
      currentCategoryIdx = (currentCategoryIdx - 1 + PHONE_CATEGORIES.length) % PHONE_CATEGORIES.length;
      Haptic.trigger('short');
      renderPhone();
      Speech.speak(`${PHONE_CATEGORIES[currentCategoryIdx].title}. ${PHONE_CATEGORIES[currentCategoryIdx].subtitle}. Double tap to open.`);
    } else if (gesture === 'doubleTap') {
      selectPhoneCategory();
    } else if (gesture === 'tap') {
      Haptic.playSound('short');
      Speech.speak(`${PHONE_CATEGORIES[currentCategoryIdx].title}. ${PHONE_CATEGORIES[currentCategoryIdx].subtitle}. Double tap to open.`);
    } else if (gesture === 'longPress' || gesture === 'swipeDown') {
      Haptic.trigger('short');
      navigateTo('mainMenuScreen');
    }
    return;
  }

  // STATE: Recents List
  if (phoneViewMode === 'recentsList') {
    const recents = (state.db && state.db.recents) || DEFAULT_RECENTS;
    if (gesture === 'swipeRight' && recents.length > 0) {
      if (selectedRecentIdx < recents.length - 1) {
        selectedRecentIdx++;
        Haptic.trigger('short');
        renderPhone();
        announceCurrentRecent();
      } else {
        Haptic.trigger('warning');
        Speech.speak("Last recent call.");
      }
    } else if (gesture === 'swipeLeft' && recents.length > 0) {
      if (selectedRecentIdx > 0) {
        selectedRecentIdx--;
        Haptic.trigger('short');
        renderPhone();
        announceCurrentRecent();
      } else {
        Haptic.trigger('warning');
        Speech.speak("First recent call.");
      }
    } else if (gesture === 'doubleTap' && recents.length > 0) {
      startCall(recents[selectedRecentIdx % recents.length].name);
    } else if (gesture === 'longPress' || gesture === 'swipeDown') {
      currentCategoryIdx = 1;
      phoneViewMode = 'categoryMenu';
      Haptic.trigger('short');
      Speech.speak("Returned to Phone Menu.");
      renderPhone();
    }
    return;
  }

  // STATE: All Contacts List
  if (phoneViewMode === 'contactsList') {
    if (gesture === 'swipeRight') {
      if (selectedContactIdx < allContacts.length - 1) {
        selectedContactIdx++;
        Haptic.trigger('short');
        renderPhone();
        announceCurrentContact();
      } else {
        Haptic.trigger('warning');
        Speech.speak("Last contact.");
      }
    } else if (gesture === 'swipeLeft') {
      if (selectedContactIdx > 0) {
        selectedContactIdx--;
        Haptic.trigger('short');
        renderPhone();
        announceCurrentContact();
      } else {
        Haptic.trigger('warning');
        Speech.speak("First contact.");
      }
    } else if (gesture === 'doubleTap') {
      openContactActions();
    } else if (gesture === 'tap') {
      Haptic.playSound('short');
      announceCurrentContact();
    } else if (gesture === 'longPress' || gesture === 'swipeDown') {
      currentCategoryIdx = 0;
      phoneViewMode = 'categoryMenu';
      Haptic.trigger('short');
      Speech.speak("Returned to Phone Menu.");
      renderPhone();
    }
    return;
  }

  // STATE: Contact Action Menu
  if (phoneViewMode === 'contactActions') {
    if (gesture === 'swipeRight') {
      currentActionIdx = (currentActionIdx + 1) % CONTACT_ACTIONS.length;
      Haptic.trigger('short');
      renderPhone();
      announceCurrentContactAction();
    } else if (gesture === 'swipeLeft') {
      currentActionIdx = (currentActionIdx - 1 + CONTACT_ACTIONS.length) % CONTACT_ACTIONS.length;
      Haptic.trigger('short');
      renderPhone();
      announceCurrentContactAction();
    } else if (gesture === 'doubleTap') {
      executeContactAction();
    } else if (gesture === 'tap') {
      Haptic.playSound('short');
      announceCurrentContactAction();
    } else if (gesture === 'longPress' || gesture === 'swipeDown') {
      phoneViewMode = 'contactsList';
      Haptic.trigger('short');
      Speech.speak("Cancelled. Returned to contacts list.");
      renderPhone();
    }
    return;
  }

  // STATE: Favorites List
  if (phoneViewMode === 'favoritesList') {
    const favs = allContacts.filter(c => c.favorite);
    if (gesture === 'swipeRight' && favs.length > 0) {
      if (selectedContactIdx < favs.length - 1) {
        selectedContactIdx++;
        Haptic.trigger('short');
        renderPhone();
        announceCurrentFavorite();
      } else {
        Haptic.trigger('warning');
        Speech.speak("Last favorite contact.");
      }
    } else if (gesture === 'swipeLeft' && favs.length > 0) {
      if (selectedContactIdx > 0) {
        selectedContactIdx--;
        Haptic.trigger('short');
        renderPhone();
        announceCurrentFavorite();
      } else {
        Haptic.trigger('warning');
        Speech.speak("First favorite contact.");
      }
    } else if (gesture === 'doubleTap' && favs.length > 0) {
      startCall(favs[selectedContactIdx % favs.length].name);
    } else if (gesture === 'longPress' || gesture === 'swipeDown') {
      currentCategoryIdx = 2;
      phoneViewMode = 'categoryMenu';
      Haptic.trigger('short');
      Speech.speak("Returned to Phone Menu.");
      renderPhone();
    }
    return;
  }

  // STATE: Emergency Contacts List
  if (phoneViewMode === 'emergencyList') {
    const emerg = allContacts.filter(c => c.emergency);
    if (gesture === 'swipeRight' && emerg.length > 0) {
      if (selectedContactIdx < emerg.length - 1) {
        selectedContactIdx++;
        Haptic.trigger('short');
        renderPhone();
        announceCurrentEmergency();
      } else {
        Haptic.trigger('warning');
        Speech.speak("Last emergency contact.");
      }
    } else if (gesture === 'swipeLeft' && emerg.length > 0) {
      if (selectedContactIdx > 0) {
        selectedContactIdx--;
        Haptic.trigger('short');
        renderPhone();
        announceCurrentEmergency();
      } else {
        Haptic.trigger('warning');
        Speech.speak("First emergency contact.");
      }
    } else if (gesture === 'doubleTap' && emerg.length > 0) {
      startCall(emerg[selectedContactIdx % emerg.length].name);
    } else if (gesture === 'longPress' || gesture === 'swipeDown') {
      currentCategoryIdx = 3;
      phoneViewMode = 'categoryMenu';
      Haptic.trigger('short');
      Speech.speak("Returned to Phone Menu.");
      renderPhone();
    }
    return;
  }

  // STATE: Handwriting Dialer
  if (phoneViewMode === 'dialer') {
    if (gesture === 'swipeLeft') {
      if (dialedNumber && dialedNumber.length > 0) {
        dialedNumber = dialedNumber.slice(0, -1);
      }
      dialerConfirmed = false;
      Haptic.trigger('warning');
      const tts = dialedNumber ? `Deleted digit. Remaining number: ${formatPhoneForTTS(dialedNumber)}` : "Number cleared.";
      Speech.speak(tts);
      renderPhone();
    } else if (gesture === 'swipeUp') {
      if (!dialedNumber) {
        dialedNumber = '+389 70 123 456';
      }
      dialerConfirmed = true;
      Haptic.trigger('success');
      Speech.speak(`Number confirmed: ${formatPhoneForTTS(dialedNumber)}. Swipe right for action menu.`);
      renderPhone();
    } else if (gesture === 'swipeRight') {
      if (!dialedNumber) {
        dialedNumber = '+389 70 123 456';
      }
      phoneViewMode = 'dialerActions';
      currentDialerActionIdx = 0;
      Haptic.trigger('short');
      Speech.speak(`Action 1 of 2: Call number ${formatPhoneForTTS(dialedNumber)}. Double tap to execute.`);
      renderPhone();
    } else if (gesture === 'longPress' || gesture === 'swipeDown') {
      currentCategoryIdx = 4;
      phoneViewMode = 'categoryMenu';
      dialedNumber = '';
      dialerConfirmed = false;
      Haptic.trigger('short');
      Speech.speak("Returned to Phone Menu.");
      renderPhone();
    }
    return;
  }

  // STATE: Dialer Action Menu
  if (phoneViewMode === 'dialerActions') {
    if (gesture === 'swipeRight') {
      if (currentDialerActionIdx < DIALER_ACTIONS.length - 1) {
        currentDialerActionIdx++;
        Haptic.trigger('short');
        renderPhone();
        announceCurrentDialerAction();
      } else {
        Haptic.trigger('warning');
        Speech.speak("Last action.");
      }
    } else if (gesture === 'swipeLeft') {
      if (currentDialerActionIdx > 0) {
        currentDialerActionIdx--;
        Haptic.trigger('short');
        renderPhone();
        announceCurrentDialerAction();
      } else {
        Haptic.trigger('warning');
        Speech.speak("First action.");
      }
    } else if (gesture === 'doubleTap') {
      executeDialerAction();
    } else if (gesture === 'tap') {
      Haptic.playSound('short');
      announceCurrentDialerAction();
    } else if (gesture === 'longPress' || gesture === 'swipeDown') {
      phoneViewMode = 'dialer';
      Haptic.trigger('short');
      Speech.speak("Returned to handwriting dialer.");
      renderPhone();
    }
    return;
  }

  // STATE: Save Contact Name
  if (phoneViewMode === 'saveContactName') {
    if (gesture === 'swipeUp') {
      if (contactSaveLetterTimer) clearTimeout(contactSaveLetterTimer);
      if (contactSaveMorseBuffer) {
        const char = morseAlphabet[contactSaveMorseBuffer];
        if (char) contactSaveNameText += char;
        contactSaveMorseBuffer = '';
      }
      const finalName = contactSaveNameText.trim();
      const finalPhone = dialedNumber || '+389 70 123 456';
      const spokenPhone = formatPhoneForTTS(finalPhone);
      const tts = finalName
        ? `Contact confirmation. Name: ${finalName}. Number: ${spokenPhone}. Double tap in the navigation zone to save contact, or swipe left to delete.`
        : `Contact confirmation. No name entered yet. Number: ${spokenPhone}. Double tap in the navigation zone to save.`;
      Haptic.trigger('short');
      Speech.speak(tts);
      renderPhone();
      return;
    }
    if (gesture === 'swipeRight') {
      if (contactSaveLetterTimer) clearTimeout(contactSaveLetterTimer);
      if (contactSaveMorseBuffer) {
        const char = morseAlphabet[contactSaveMorseBuffer] || '';
        contactSaveNameText += char;
        contactSaveMorseBuffer = '';
        Haptic.trigger('short');
        Speech.speak(`Letter ${char}`);
      } else {
        contactSaveNameText += ' ';
        Haptic.trigger('short');
        Speech.speak("Space added");
      }
      updateContactSaveDisplay();
      return;
    }
    if (gesture === 'doubleTap') {
      if (!isInNavZone) {
        // Double tap on the screen/Morse surface must NOT save contact
        return;
      }
      doSaveContact();
      return;
    }
    if (gesture === 'swipeLeft') {
      if (contactSaveLetterTimer) clearTimeout(contactSaveLetterTimer);
      if (contactSaveMorseBuffer) {
        contactSaveMorseBuffer = contactSaveMorseBuffer.slice(0, -1);
        Haptic.trigger('short');
        Speech.speak("Delete symbol");
      } else if (contactSaveNameText.length > 0) {
        contactSaveNameText = contactSaveNameText.slice(0, -1);
        Haptic.trigger('warning');
        Speech.speak("Delete character");
      } else {
        Speech.speak("Name is empty.");
      }
      updateContactSaveDisplay();
      return;
    }
    if (gesture === 'swipeDown' || gesture === 'longPress') {
      if (contactSaveLetterTimer) clearTimeout(contactSaveLetterTimer);
      contactSaveNameText = '';
      contactSaveMorseBuffer = '';
      phoneViewMode = 'dialerActions';
      Haptic.trigger('short');
      Speech.speak("Cancelled saving contact. Returned to dialer options.");
      renderPhone();
      return;
    }
    return;
  }
}


export function executeDialerAction() {
  const act = DIALER_ACTIONS[currentDialerActionIdx];
  if (!act) return;

  if (act.id === 'call') {
    startCall(dialedNumber || '+389 70 123 456');
  } else if (act.id === 'save') {
    contactSaveNameText = '';
    contactSaveMorseBuffer = '';
    phoneViewMode = 'saveContactName';
    Haptic.trigger('short');
    const targetNum = dialedNumber || '+389 70 123 456';
    Speech.speak(`Save new contact for ${formatPhoneForTTS(targetNum)}. Tap or hold for Morse letters, swipe right for space, then double tap to save.`);
    renderPhone();
  } else if (act.id === 'cancel') {
    phoneViewMode = 'dialer';
    Haptic.trigger('short');
    Speech.speak("Returned to handwriting dialer.");
    renderPhone();
  }
}

export function announceCurrentDialerAction() {
  const act = DIALER_ACTIONS[currentDialerActionIdx];
  if (!act) return;
  let title = act.title;
  if (act.id === 'call') title = `Call number ${formatPhoneForTTS(dialedNumber || '+389 70 123 456')}`;
  Speech.speak(`Action ${currentDialerActionIdx + 1} of 3: ${title}. ${act.subtitle}. Double tap to execute.`);
}

export function announceCurrentRecent() {
  const recents = (state.db && state.db.recents) || DEFAULT_RECENTS;
  const rec = recents[selectedRecentIdx % recents.length];
  if (!rec) return;
  const spokenPhone = formatPhoneForTTS(rec.phone);
  Speech.speak(`Recent call ${(selectedRecentIdx % recents.length) + 1} of ${recents.length}: ${rec.name}. ${rec.type} call at ${rec.time}. ${spokenPhone}. Double tap to call back.`);
}

export function announceCurrentContact() {
  const allContacts = (state.db && state.db.contacts) || [];
  const contact = allContacts[selectedContactIdx];
  if (!contact) return;
  const spokenPhone = formatPhoneForTTS(contact.phone);
  Speech.speak(`Contact ${selectedContactIdx + 1} of ${allContacts.length}: ${contact.name}. ${spokenPhone}. Double tap for contact actions.`);
}

export function announceCurrentContactAction() {
  const allContacts = (state.db && state.db.contacts) || [];
  const contact = allContacts[selectedContactIdx];
  const act = CONTACT_ACTIONS[currentActionIdx];
  if (!contact || !act) return;

  let title = act.title;
  if (act.id === 'toggle_fav') title = contact.favorite ? 'Remove from favorites' : 'Add to favorites';
  if (act.id === 'toggle_emerg') title = contact.emergency ? 'Remove from emergency' : 'Add to emergency';

  Speech.speak(`${title}. Double tap to execute.`);
}

export function announceCurrentFavorite() {
  const favs = ((state.db && state.db.contacts) || []).filter(c => c.favorite);
  const contact = favs[selectedContactIdx % (favs.length || 1)];
  if (!contact) return;
  const spokenPhone = formatPhoneForTTS(contact.phone);
  Speech.speak(`Favorite contact ${(selectedContactIdx % (favs.length || 1)) + 1} of ${favs.length}: ${contact.name}. ${spokenPhone}. Double tap to call.`);
}

export function announceCurrentEmergency() {
  const emerg = ((state.db && state.db.contacts) || []).filter(c => c.emergency);
  const contact = emerg[selectedContactIdx % (emerg.length || 1)];
  if (!contact) return;
  const spokenPhone = formatPhoneForTTS(contact.phone);
  Speech.speak(`Emergency contact ${(selectedContactIdx % (emerg.length || 1)) + 1} of ${emerg.length}: ${contact.name}. ${spokenPhone}. Double tap to call.`);
}

