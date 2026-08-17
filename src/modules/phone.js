import { state, saveDb, logSystem } from '../core/state.js';
import { Speech } from '../core/speech.js';
import { Haptic } from '../core/haptics.js';
import { navigateTo } from '../core/router.js';

// Phone Sub-Navigation Modes
const PHONE_CATEGORIES = [
  { id: 'contacts', title: 'CONTACTS', subtitle: 'Browse all contacts & actions', icon: 'fa-address-book', color: '#FFEE55' },
  { id: 'favorites', title: 'FAVORITES', subtitle: 'Quick access favorite contacts', icon: 'fa-star', color: '#00E5FF' },
  { id: 'emergency', title: 'EMERGENCY CONTACTS', subtitle: 'Designated emergency speed dial', icon: 'fa-shield-heart', color: '#EF4444' },
  { id: 'dialer', title: 'HANDWRITING DIALER', subtitle: 'Draw numbers on screen to call', icon: 'fa-keyboard', color: '#10B981' }
];

let currentCategoryIdx = 0;
let phoneViewMode = 'categoryMenu'; // 'categoryMenu', 'contactsList', 'contactActions', 'favoritesList', 'emergencyList', 'dialer', 'dialerConfirm', 'activeCall'

let selectedContactIdx = 0;
let currentActionIdx = 0;
let dialedNumber = '';
let callDuration = 0;
let callTimer = null;

const CONTACT_ACTIONS = [
  { id: 'call', title: 'CALL CONTACT', icon: 'fa-phone', color: '#10B981' },
  { id: 'toggle_fav', title: 'TOGGLE FAVORITE', icon: 'fa-star', color: '#FFEE55' },
  { id: 'toggle_emerg', title: 'TOGGLE EMERGENCY', icon: 'fa-shield-heart', color: '#EF4444' },
  { id: 'delete', title: 'DELETE CONTACT', icon: 'fa-trash-can', color: '#94A3B8' }
];

export function renderPhone() {
  const container = document.getElementById('callsScreen');
  if (!container) return;

  const allContacts = (state.db && state.db.contacts) || [];

  // ----------------------------------------------------
  // VIEW 1: ACTIVE CALL SCREEN
  // ----------------------------------------------------
  if (phoneViewMode === 'activeCall') {
    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 24px 16px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif;">
        
        <div style="text-align: center; margin-top: 16px;">
          <span style="font-size: 0.8rem; color: #10B981; font-weight: bold; background: rgba(16,185,129,0.15); padding: 3px 10px; border-radius: 12px;">
            <i class="fa-solid fa-circle" style="font-size: 0.55rem;"></i> CALL CONNECTED
          </span>
          <h2 style="margin: 12px 0 4px 0; font-size: 1.8rem; color: #FFFFFF; font-weight: 900;">${state.activeCallContact || 'Mother'}</h2>
          <span id="callTimerDisplay" style="font-size: 1.1rem; color: #94A3B8; font-family: monospace;">00:00</span>
        </div>

        <div style="width: 110px; height: 110px; border-radius: 50%; border: 3px solid #10B981; display: flex; align-items: center; justify-content: center; background: rgba(16,185,129,0.08); animation: pulse 2s infinite alternate;">
          <i class="fa-solid fa-phone-volume" style="font-size: 3.5rem; color: #10B981;"></i>
        </div>

        <button id="btnEndCall" style="width: 100%; padding: 14px; background: #EF4444; color: #FFFFFF; border: none; border-radius: 12px; font-weight: 900; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <i class="fa-solid fa-phone-slash"></i> DOUBLE TAP TO END CALL
        </button>

      </div>
    `;

    document.getElementById('btnEndCall')?.addEventListener('click', endCall);
    return;
  }

  // ----------------------------------------------------
  // VIEW 2: PHONE 4-CATEGORY SUB-MENU
  // ----------------------------------------------------
  if (phoneViewMode === 'categoryMenu') {
    const cat = PHONE_CATEGORIES[currentCategoryIdx];

    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 18px 14px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif;">
        
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
          <span style="color: #FFEE55; font-size: 0.8rem; font-weight: 800; letter-spacing: 1px;">[ PHONE MENU ]</span>
          <span style="color: #FFFFFF; font-size: 0.85rem; font-weight: bold; background: #181818; padding: 2px 8px; border-radius: 12px; border: 1px solid #333;">
            [ ${currentCategoryIdx + 1} / ${PHONE_CATEGORIES.length} ]
          </span>
        </div>

        <!-- Single Focus Hero Category Card -->
        <div class="phone-cat-card" style="width: 100%; border: 3px solid ${cat.color}; border-radius: 20px; padding: 24px 16px; background: rgba(0,0,0,0.9); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; text-align: center; box-shadow: 0 0 25px rgba(255, 238, 85, 0.15); margin: auto 0; cursor: pointer;">
          
          <div style="width: 85px; height: 85px; border-radius: 50%; border: 3px solid ${cat.color}; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.03);">
            <i class="fa-solid ${cat.icon}" style="font-size: 2.6rem; color: ${cat.color};"></i>
          </div>

          <div>
            <h2 style="margin: 0; font-size: 1.5rem; font-weight: 900; color: ${cat.color}; letter-spacing: 1px;">${cat.title}</h2>
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

    container.querySelector('.phone-cat-card')?.addEventListener('click', selectPhoneCategory);
    return;
  }

  // ----------------------------------------------------
  // VIEW 3: CONTACTS LIST (ALL CONTACTS)
  // ----------------------------------------------------
  if (phoneViewMode === 'contactsList') {
    const contact = allContacts[selectedContactIdx] || { name: 'Mother', phone: '+389 70 123 456' };

    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 18px 14px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif;">
        
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-address-book" style="color: #FFEE55; font-size: 1.1rem;"></i>
            <span style="color: #FFEE55; font-size: 0.9rem; font-weight: 800;">ALL CONTACTS</span>
          </div>
          <span style="color: #FFFFFF; font-size: 0.8rem; font-weight: bold; background: #181818; padding: 2px 8px; border-radius: 12px; border: 1px solid #333;">
            [ ${selectedContactIdx + 1} / ${allContacts.length} ]
          </span>
        </div>

        <!-- Contact Focus Card -->
        <div class="contact-focus-card" style="width: 100%; border: 3px solid #FFEE55; border-radius: 20px; padding: 22px 16px; background: #07090E; display: flex; flex-direction: column; gap: 14px; margin: auto 0; box-shadow: 0 0 20px rgba(255, 238, 85, 0.12); cursor: pointer;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; gap: 6px;">
              ${contact.favorite ? `<span style="background: #00E5FF; color: #000; font-size: 0.62rem; font-weight: 900; padding: 2px 6px; border-radius: 4px;">★ FAVORITE</span>` : ''}
              ${contact.emergency ? `<span style="background: #EF4444; color: #FFF; font-size: 0.62rem; font-weight: 900; padding: 2px 6px; border-radius: 4px;">EMERGENCY</span>` : ''}
            </div>
            <span style="font-size: 0.72rem; color: #94A3B8;">Double tap for options</span>
          </div>

          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(255, 238, 85, 0.15); border: 2px solid #FFEE55; display: flex; align-items: center; justify-content: center;">
              <i class="fa-solid fa-user-large" style="color: #FFEE55; font-size: 1.3rem;"></i>
            </div>
            <div>
              <h2 style="margin: 0; font-size: 1.4rem; color: #FFFFFF; font-weight: 900;">${contact.name}</h2>
              <span style="font-size: 0.85rem; color: #00E5FF; font-family: monospace;">${contact.phone}</span>
            </div>
          </div>

          <button id="btnOpenContactActions" style="width: 100%; padding: 12px; background: #FFEE55; color: #000; border: none; border-radius: 10px; font-weight: 900; font-size: 0.9rem; cursor: pointer;">
            DOUBLE TAP FOR CONTACT ACTION MENU
          </button>
        </div>

        <div style="width: 100%; border-top: 1px dashed #333; padding-top: 6px; text-align: center;">
          <span style="color: #64748B; font-size: 0.7rem;">Swipe Right/Left: Next/Prev Contact • Long Press: Back to Phone Menu</span>
        </div>

      </div>
    `;

    document.getElementById('btnOpenContactActions')?.addEventListener('click', openContactActions);
    return;
  }

  // ----------------------------------------------------
  // VIEW 4: CONTACT ACTION MENU (4 OPTIONS)
  // ----------------------------------------------------
  if (phoneViewMode === 'contactActions') {
    const contact = allContacts[selectedContactIdx];
    const act = CONTACT_ACTIONS[currentActionIdx];

    // Dynamic title for toggles
    let actionLabel = act.title;
    if (act.id === 'toggle_fav') {
      actionLabel = contact.favorite ? 'REMOVE FROM FAVORITES' : 'ADD TO FAVORITES';
    } else if (act.id === 'toggle_emerg') {
      actionLabel = contact.emergency ? 'REMOVE FROM EMERGENCY' : 'ADD TO EMERGENCY';
    }

    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 18px 14px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif;">
        
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
          <span style="color: #FFEE55; font-size: 0.8rem; font-weight: bold;">Options for ${contact.name}</span>
          <span style="color: #FFFFFF; font-size: 0.85rem; font-weight: bold; background: #181818; padding: 2px 8px; border-radius: 12px; border: 1px solid #333;">
            [ ${currentActionIdx + 1} / 4 ]
          </span>
        </div>

        <div class="action-card" style="width: 100%; border: 3px solid ${act.color}; border-radius: 20px; padding: 26px 16px; background: rgba(0,0,0,0.9); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; text-align: center; margin: auto 0; cursor: pointer;">
          <div style="width: 75px; height: 75px; border-radius: 50%; border: 3px solid ${act.color}; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.04);">
            <i class="fa-solid ${act.icon}" style="font-size: 2.2rem; color: ${act.color};"></i>
          </div>

          <div>
            <h2 style="margin: 0; font-size: 1.3rem; font-weight: 900; color: ${act.color};">${actionLabel}</h2>
            <p style="margin: 4px 0 0 0; font-size: 0.8rem; color: #94A3B8;">Contact: ${contact.name} (${contact.phone})</p>
          </div>

          <div style="margin-top: 4px; padding: 4px 12px; background: rgba(255,255,255,0.08); border-radius: 14px; font-size: 0.72rem; color: #FFEE55; font-weight: bold;">
            Double Tap to Execute
          </div>
        </div>

        <div style="width: 100%; border-top: 1px dashed #333; padding-top: 6px; text-align: center;">
          <span style="color: #64748B; font-size: 0.7rem;">Swipe Right/Left: Next/Prev Action • Long Press: Cancel & Back</span>
        </div>

      </div>
    `;

    container.querySelector('.action-card')?.addEventListener('click', executeContactAction);
    return;
  }

  // ----------------------------------------------------
  // VIEW 5: FAVORITES LIST SCREEN
  // ----------------------------------------------------
  if (phoneViewMode === 'favoritesList') {
    const favorites = allContacts.filter(c => c.favorite);

    if (favorites.length === 0) {
      container.innerHTML = `
        <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 20px; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #000; color: #FFF; text-align: center;">
          <i class="fa-solid fa-star" style="font-size: 3rem; color: #64748B; margin-bottom: 12px;"></i>
          <h3 style="margin: 0; color: #94A3B8;">No Favorite Contacts Saved</h3>
          <p style="font-size: 0.8rem; color: #64748B; margin-top: 6px;">Add favorites from Contacts list. Long press to return.</p>
        </div>
      `;
      return;
    }

    const contact = favorites[selectedContactIdx % favorites.length];

    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 18px 14px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif;">
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
          <span style="color: #00E5FF; font-size: 0.9rem; font-weight: 800;">★ FAVORITE CONTACTS</span>
          <span style="color: #FFFFFF; font-size: 0.8rem; font-weight: bold; background: #181818; padding: 2px 8px; border-radius: 12px;">
            [ ${(selectedContactIdx % favorites.length) + 1} / ${favorites.length} ]
          </span>
        </div>

        <div class="fav-contact-card" style="width: 100%; border: 3px solid #00E5FF; border-radius: 20px; padding: 22px 16px; background: #07090E; display: flex; flex-direction: column; gap: 14px; margin: auto 0; box-shadow: 0 0 20px rgba(0, 229, 255, 0.12); cursor: pointer;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 50px; height: 50px; border-radius: 50%; background: rgba(0, 229, 255, 0.15); border: 2px solid #00E5FF; display: flex; align-items: center; justify-content: center;">
              <i class="fa-solid fa-star" style="color: #00E5FF; font-size: 1.4rem;"></i>
            </div>
            <div>
              <h2 style="margin: 0; font-size: 1.4rem; color: #FFFFFF; font-weight: 900;">${contact.name}</h2>
              <span style="font-size: 0.85rem; color: #00E5FF; font-family: monospace;">${contact.phone}</span>
            </div>
          </div>

          <button id="btnCallFav" style="width: 100%; padding: 12px; background: #00E5FF; color: #000; border: none; border-radius: 10px; font-weight: 900; font-size: 0.95rem; cursor: pointer;">
            DOUBLE TAP TO CALL
          </button>
        </div>

        <div style="width: 100%; border-top: 1px dashed #333; padding-top: 6px; text-align: center;">
          <span style="color: #64748B; font-size: 0.7rem;">Swipe Right/Left: Next/Prev Favorite • Double Tap: Call</span>
        </div>
      </div>
    `;

    document.getElementById('btnCallFav')?.addEventListener('click', () => startCall(contact.name));
    return;
  }

  // ----------------------------------------------------
  // VIEW 6: EMERGENCY CONTACTS LIST SCREEN
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

    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 18px 14px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif;">
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
          <span style="color: #EF4444; font-size: 0.9rem; font-weight: 800;"><i class="fa-solid fa-shield-heart"></i> EMERGENCY CONTACTS</span>
          <span style="color: #FFFFFF; font-size: 0.8rem; font-weight: bold; background: #181818; padding: 2px 8px; border-radius: 12px;">
            [ ${(selectedContactIdx % emerg.length) + 1} / ${emerg.length} ]
          </span>
        </div>

        <div class="emerg-contact-card" style="width: 100%; border: 3px solid #EF4444; border-radius: 20px; padding: 22px 16px; background: #07090E; display: flex; flex-direction: column; gap: 14px; margin: auto 0; box-shadow: 0 0 20px rgba(239, 68, 68, 0.15); cursor: pointer;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 50px; height: 50px; border-radius: 50%; background: rgba(239, 68, 68, 0.15); border: 2px solid #EF4444; display: flex; align-items: center; justify-content: center;">
              <i class="fa-solid fa-phone" style="color: #EF4444; font-size: 1.4rem;"></i>
            </div>
            <div>
              <h2 style="margin: 0; font-size: 1.4rem; color: #FFFFFF; font-weight: 900;">${contact.name}</h2>
              <span style="font-size: 0.85rem; color: #EF4444; font-family: monospace;">${contact.phone}</span>
            </div>
          </div>

          <button id="btnCallEmerg" style="width: 100%; padding: 12px; background: #EF4444; color: #FFF; border: none; border-radius: 10px; font-weight: 900; font-size: 0.95rem; cursor: pointer;">
            DOUBLE TAP TO EMERGENCY CALL
          </button>
        </div>

        <div style="width: 100%; border-top: 1px dashed #333; padding-top: 6px; text-align: center;">
          <span style="color: #64748B; font-size: 0.7rem;">Swipe Right/Left: Next/Prev • Double Tap: Speed Dial</span>
        </div>
      </div>
    `;

    document.getElementById('btnCallEmerg')?.addEventListener('click', () => startCall(contact.name));
    return;
  }

  // ----------------------------------------------------
  // VIEW 7: HANDWRITING DIALER SCREEN
  // ----------------------------------------------------
  if (phoneViewMode === 'dialer') {
    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif;">
        
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 6px;">
          <span style="color: #10B981; font-size: 0.85rem; font-weight: bold;"><i class="fa-solid fa-keyboard"></i> HANDWRITING DIALER</span>
          <span style="font-size: 0.7rem; color: #94A3B8;">Swipe Left: Delete • Swipe Up: Prepare Call</span>
        </div>

        <!-- Number Display Box -->
        <div style="background: #0B0F19; border: 2px solid #10B981; border-radius: 12px; padding: 10px; text-align: center; font-size: 1.5rem; color: #10B981; font-family: monospace; min-height: 28px; letter-spacing: 2px;">
          ${dialedNumber || 'Draw / tap digits...'}
        </div>

        <!-- Keypad Buttons -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin: 4px 0;">
          ${['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(k => `
            <button class="dial-key" data-key="${k}" style="padding: 10px; background: #151D2C; color: #FFF; border: 1px solid #334155; border-radius: 8px; font-size: 1.15rem; font-weight: 800; cursor: pointer;">
              ${k}
            </button>
          `).join('')}
        </div>

        <div style="display: flex; gap: 8px;">
          <button id="btnPrepareDialerCall" style="flex: 2; padding: 11px; background: #10B981; color: #000; border: none; border-radius: 8px; font-weight: 900; font-size: 0.85rem; cursor: pointer;">
            <i class="fa-solid fa-arrow-up"></i> SWIPE UP TO PREPARE CALL
          </button>
          <button id="btnDeleteDigit" style="flex: 1; padding: 11px; background: #374151; color: #FFF; border: none; border-radius: 8px; font-weight: bold; font-size: 0.8rem; cursor: pointer;">
            Delete
          </button>
        </div>

      </div>
    `;

    document.getElementById('btnPrepareDialerCall')?.addEventListener('click', prepareDialerCall);
    document.getElementById('btnDeleteDigit')?.addEventListener('click', deleteDialedDigit);

    container.querySelectorAll('.dial-key').forEach(btn => {
      btn.addEventListener('click', () => {
        const k = btn.dataset.key;
        dialedNumber += k;
        Haptic.trigger('short');
        Speech.speak(k);
        renderPhone();
      });
    });
    return;
  }

  // ----------------------------------------------------
  // VIEW 8: DIALER CALL CONFIRMATION SCREEN
  // ----------------------------------------------------
  if (phoneViewMode === 'dialerConfirm') {
    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 22px 16px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; text-align: center;">
        
        <div style="margin-top: 10px;">
          <span style="color: #10B981; font-size: 0.8rem; font-weight: 900; background: rgba(16,185,129,0.15); padding: 3px 12px; border-radius: 12px;">
            <i class="fa-solid fa-phone"></i> CALL CONFIRMATION
          </span>
          <h2 style="margin: 14px 0 6px 0; font-size: 1.4rem; color: #FFFFFF;">Ready to Call Number?</h2>
        </div>

        <div style="border: 2px solid #10B981; border-radius: 16px; padding: 18px; background: #07090E; width: 100%; box-sizing: border-box; margin: auto 0;">
          <p style="margin: 0; font-size: 1.6rem; color: #FFEE55; font-weight: 900; font-family: monospace;">
            ${dialedNumber}
          </p>
        </div>

        <button id="btnApproveCall" style="width: 100%; padding: 14px; background: #10B981; color: #000000; border: none; border-radius: 12px; font-weight: 900; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <i class="fa-solid fa-phone"></i> DOUBLE TAP TO APPROVE & CALL
        </button>

      </div>
    `;

    document.getElementById('btnApproveCall')?.addEventListener('click', () => startCall(dialedNumber));
    return;
  }
}

export function selectPhoneCategory() {
  const cat = PHONE_CATEGORIES[currentCategoryIdx];
  Haptic.trigger('success');
  Speech.speak(`Opening ${cat.title}.`);

  if (cat.id === 'contacts') {
    phoneViewMode = 'contactsList';
    selectedContactIdx = 0;
    renderPhone();
    announceCurrentContact();
  } else if (cat.id === 'favorites') {
    phoneViewMode = 'favoritesList';
    selectedContactIdx = 0;
    renderPhone();
    announceCurrentFavorite();
  } else if (cat.id === 'emergency') {
    phoneViewMode = 'emergencyList';
    selectedContactIdx = 0;
    renderPhone();
    announceCurrentEmergency();
  } else if (cat.id === 'dialer') {
    phoneViewMode = 'dialer';
    dialedNumber = '';
    renderPhone();
    Speech.speak("Handwriting dialer active. Draw or tap numbers. Swipe left to delete, swipe up to prepare call.");
  }
}

export function openContactActions() {
  phoneViewMode = 'contactActions';
  currentActionIdx = 0;
  Haptic.trigger('success');
  renderPhone();
  announceCurrentContactAction();
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
    selectedContactIdx = 0;
    phoneViewMode = 'contactsList';
    renderPhone();
  }
}

export function prepareDialerCall() {
  if (!dialedNumber) {
    Speech.speak("Please enter a phone number first.");
    return;
  }
  phoneViewMode = 'dialerConfirm';
  Haptic.trigger('warning');
  renderPhone();
  Speech.speak(`Preparing to call ${dialedNumber}. Double tap to approve and call.`);
}

export function deleteDialedDigit() {
  if (dialedNumber) {
    dialedNumber = dialedNumber.slice(0, -1);
    Haptic.trigger('warning');
    Speech.speak(dialedNumber ? `Deleted digit. Remaining: ${dialedNumber}` : "Number cleared.");
    renderPhone();
  }
}

export function startCall(nameOrNumber) {
  state.activeCallContact = nameOrNumber;
  phoneViewMode = 'activeCall';
  callDuration = 0;

  Haptic.trigger('success');
  Speech.speak(`Calling ${nameOrNumber} now. Connected.`);

  if (callTimer) clearInterval(callTimer);
  callTimer = setInterval(() => {
    callDuration++;
    const mins = String(Math.floor(callDuration / 60)).padStart(2, '0');
    const secs = String(callDuration % 60).padStart(2, '0');
    const display = document.getElementById('callTimerDisplay');
    if (display) display.innerText = `${mins}:${secs}`;
  }, 1000);

  renderPhone();
}

export function endCall() {
  if (callTimer) clearInterval(callTimer);
  Haptic.trigger('error');
  Speech.speak("Call ended. Returned to phone menu.");
  phoneViewMode = 'categoryMenu';
  renderPhone();
}

export function handlePhoneGesture(gesture) {
  const allContacts = (state.db && state.db.contacts) || [];

  // STATE: Active Connected Call
  if (phoneViewMode === 'activeCall') {
    if (gesture === 'doubleTap' || gesture === 'longPress') {
      endCall();
    }
    return;
  }

  // STATE: Category Menu
  if (phoneViewMode === 'categoryMenu') {
    if (gesture === 'swipeRight') {
      currentCategoryIdx = (currentCategoryIdx + 1) % PHONE_CATEGORIES.length;
      Haptic.trigger('short');
      renderPhone();
      Speech.speak(PHONE_CATEGORIES[currentCategoryIdx].title);
    } else if (gesture === 'swipeLeft') {
      currentCategoryIdx = (currentCategoryIdx - 1 + PHONE_CATEGORIES.length) % PHONE_CATEGORIES.length;
      Haptic.trigger('short');
      renderPhone();
      Speech.speak(PHONE_CATEGORIES[currentCategoryIdx].title);
    } else if (gesture === 'doubleTap' || gesture === 'tap') {
      selectPhoneCategory();
    }
    return;
  }

  // STATE: All Contacts List
  if (phoneViewMode === 'contactsList') {
    if (gesture === 'swipeRight') {
      selectedContactIdx = (selectedContactIdx + 1) % allContacts.length;
      Haptic.trigger('short');
      renderPhone();
      announceCurrentContact();
    } else if (gesture === 'swipeLeft') {
      selectedContactIdx = (selectedContactIdx - 1 + allContacts.length) % allContacts.length;
      Haptic.trigger('short');
      renderPhone();
      announceCurrentContact();
    } else if (gesture === 'doubleTap' || gesture === 'tap') {
      openContactActions();
    } else if (gesture === 'longPress') {
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
    } else if (gesture === 'doubleTap' || gesture === 'tap') {
      executeContactAction();
    } else if (gesture === 'longPress') {
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
      selectedContactIdx = (selectedContactIdx + 1) % favs.length;
      Haptic.trigger('short');
      renderPhone();
      announceCurrentFavorite();
    } else if (gesture === 'swipeLeft' && favs.length > 0) {
      selectedContactIdx = (selectedContactIdx - 1 + favs.length) % favs.length;
      Haptic.trigger('short');
      renderPhone();
      announceCurrentFavorite();
    } else if (gesture === 'doubleTap' && favs.length > 0) {
      startCall(favs[selectedContactIdx % favs.length].name);
    } else if (gesture === 'longPress') {
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
      selectedContactIdx = (selectedContactIdx + 1) % emerg.length;
      Haptic.trigger('short');
      renderPhone();
      announceCurrentEmergency();
    } else if (gesture === 'swipeLeft' && emerg.length > 0) {
      selectedContactIdx = (selectedContactIdx - 1 + emerg.length) % emerg.length;
      Haptic.trigger('short');
      renderPhone();
      announceCurrentEmergency();
    } else if (gesture === 'doubleTap' && emerg.length > 0) {
      startCall(emerg[selectedContactIdx % emerg.length].name);
    } else if (gesture === 'longPress') {
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
      deleteDialedDigit();
    } else if (gesture === 'swipeUp') {
      prepareDialerCall();
    } else if (gesture === 'longPress') {
      phoneViewMode = 'categoryMenu';
      Haptic.trigger('short');
      Speech.speak("Returned to Phone Menu.");
      renderPhone();
    }
    return;
  }

  // STATE: Dialer Call Confirmation
  if (phoneViewMode === 'dialerConfirm') {
    if (gesture === 'doubleTap' || gesture === 'tap') {
      startCall(dialedNumber);
    } else if (gesture === 'swipeDown' || gesture === 'longPress') {
      phoneViewMode = 'dialer';
      Haptic.trigger('short');
      Speech.speak("Call cancelled. Returned to dialer.");
      renderPhone();
    }
  }
}

export function announceCurrentContact() {
  const allContacts = (state.db && state.db.contacts) || [];
  const contact = allContacts[selectedContactIdx];
  if (!contact) return;
  Speech.speak(`${contact.name}. Phone: ${contact.phone}. Double tap for action menu.`);
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
  const contact = favs[selectedContactIdx % favs.length];
  if (!contact) return;
  Speech.speak(`Favorite contact: ${contact.name}. Phone: ${contact.phone}. Double tap to call.`);
}

export function announceCurrentEmergency() {
  const emerg = ((state.db && state.db.contacts) || []).filter(c => c.emergency);
  const contact = emerg[selectedContactIdx % emerg.length];
  if (!contact) return;
  Speech.speak(`Emergency contact: ${contact.name}. Phone: ${contact.phone}. Double tap to call.`);
}
