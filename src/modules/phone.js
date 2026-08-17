import { state, saveDb, logSystem } from '../core/state.js';
import { Speech } from '../core/speech.js';
import { Haptic } from '../core/haptics.js';
import { navigateTo } from '../core/router.js';

let currentContactIndex = 0;
let currentView = 'contacts'; // 'contacts', 'dialer', 'activeCall'
let dialedNumber = '';
let callDuration = 0;
let callTimer = null;

export function renderPhone() {
  const container = document.getElementById('callsScreen');
  if (!container) return;

  const contacts = (state.db && state.db.contacts) || [];

  if (currentView === 'activeCall') {
    // Active Call Connected View
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

  if (currentView === 'dialer') {
    // Tactile Keypad Dialer View
    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif;">
        
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 6px;">
          <span style="color: #FFEE55; font-size: 0.85rem; font-weight: bold;">KEYPAD DIALER</span>
          <button id="btnBackToContacts" style="padding: 3px 8px; background: #1E293B; color: #FFF; border: 1px solid #475569; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">
            Contacts
          </button>
        </div>

        <!-- Number Display -->
        <div style="background: #0B0F19; border: 2px solid #FFEE55; border-radius: 12px; padding: 12px; text-align: center; font-size: 1.4rem; color: #FFEE55; font-family: monospace; min-height: 28px;">
          ${dialedNumber || 'Enter number...'}
        </div>

        <!-- Keypad Grid -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin: 6px 0;">
          ${['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(k => `
            <button class="dial-key" data-key="${k}" style="padding: 12px; background: #151D2C; color: #FFF; border: 1px solid #334155; border-radius: 8px; font-size: 1.2rem; font-weight: 800; cursor: pointer;">
              ${k}
            </button>
          `).join('')}
        </div>

        <!-- Dial Action Buttons -->
        <div style="display: flex; gap: 8px;">
          <button id="btnCallDialed" style="flex: 2; padding: 12px; background: #10B981; color: #000; border: none; border-radius: 8px; font-weight: 900; font-size: 0.9rem; cursor: pointer;">
            <i class="fa-solid fa-phone"></i> CALL
          </button>
          <button id="btnClearDialed" style="flex: 1; padding: 12px; background: #374151; color: #FFF; border: none; border-radius: 8px; font-weight: bold; font-size: 0.85rem; cursor: pointer;">
            Clear
          </button>
        </div>

      </div>
    `;

    document.getElementById('btnBackToContacts')?.addEventListener('click', () => {
      currentView = 'contacts';
      renderPhone();
      announceCurrentContact();
    });

    document.getElementById('btnCallDialed')?.addEventListener('click', () => {
      if (!dialedNumber) return;
      startCall(dialedNumber);
    });

    document.getElementById('btnClearDialed')?.addEventListener('click', () => {
      dialedNumber = '';
      Haptic.trigger('short');
      renderPhone();
      Speech.speak("Number cleared.");
    });

    container.querySelectorAll('.dial-key').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        dialedNumber += key;
        Haptic.trigger('short');
        renderPhone();
        Speech.speak(key);
      });
    });

    return;
  }

  // Default: Contacts List View
  const contact = contacts[currentContactIndex] || { name: 'Mother', phone: '+389 70 123 456', favorite: true, emergency: true };

  container.innerHTML = `
    <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 18px 14px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif;">
      
      <!-- Header -->
      <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-address-book" style="color: #FFEE55; font-size: 1.1rem;"></i>
          <span style="color: #FFEE55; font-size: 0.9rem; font-weight: 800;">CONTACTS</span>
        </div>
        <div style="display: flex; gap: 6px; align-items: center;">
          <button id="btnOpenDialer" style="padding: 3px 8px; background: #1E293B; color: #FFEE55; border: 1px solid #FFEE55; border-radius: 4px; font-size: 0.75rem; font-weight: bold; cursor: pointer;">
            Keypad
          </button>
          <span style="color: #FFFFFF; font-size: 0.8rem; font-weight: bold; background: #181818; padding: 2px 8px; border-radius: 12px; border: 1px solid #333;">
            [ ${currentContactIndex + 1} / ${contacts.length} ]
          </span>
        </div>
      </div>

      <!-- Single Focus Contact Card -->
      <div class="contact-focus-card" style="width: 100%; border: 3px solid #FFEE55; border-radius: 20px; padding: 22px 16px; background: #07090E; display: flex; flex-direction: column; gap: 14px; margin: auto 0; box-shadow: 0 0 20px rgba(255, 238, 85, 0.12); cursor: pointer;">
        
        <div style="display: flex; justify-content: space-between; align-items: center;">
          ${contact.emergency ? `
            <span style="background: #EF4444; color: #FFF; font-size: 0.65rem; font-weight: 900; padding: 2px 8px; border-radius: 6px;">
              <i class="fa-solid fa-star"></i> EMERGENCY FAVORITE
            </span>
          ` : contact.favorite ? `
            <span style="background: #FFEE55; color: #000; font-size: 0.65rem; font-weight: 900; padding: 2px 8px; border-radius: 6px;">
              ★ FAVORITE
            </span>
          ` : `<span></span>`}
          <span style="font-size: 0.75rem; color: #94A3B8;">Contact</span>
        </div>

        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 50px; height: 50px; border-radius: 50%; background: rgba(255, 238, 85, 0.15); border: 2px solid #FFEE55; display: flex; align-items: center; justify-content: center;">
            <i class="fa-solid fa-user-large" style="color: #FFEE55; font-size: 1.4rem;"></i>
          </div>
          <div>
            <h2 style="margin: 0; font-size: 1.4rem; color: #FFFFFF; font-weight: 900;">${contact.name}</h2>
            <span style="font-size: 0.85rem; color: #00E5FF; font-family: monospace;">${contact.phone}</span>
          </div>
        </div>

        <button id="btnCallCurrentContact" style="width: 100%; padding: 12px; background: #10B981; color: #000; border: none; border-radius: 10px; font-weight: 900; font-size: 0.95rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 4px;">
          <i class="fa-solid fa-phone"></i> DOUBLE TAP TO CALL
        </button>
      </div>

      <!-- Hint -->
      <div style="width: 100%; border-top: 1px dashed #333; padding-top: 6px; text-align: center;">
        <span style="color: #64748B; font-size: 0.7rem;">Swipe Right/Left: Next/Prev Contact • Long Press (Nav Bar): Back</span>
      </div>

    </div>
  `;

  document.getElementById('btnOpenDialer')?.addEventListener('click', () => {
    currentView = 'dialer';
    dialedNumber = '';
    Haptic.trigger('short');
    renderPhone();
    Speech.speak("Keypad dialer active. Tap numbers to dial.");
  });

  document.getElementById('btnCallCurrentContact')?.addEventListener('click', () => {
    startCall(contact.name);
  });
}

export function startCall(name) {
  state.activeCallContact = name;
  currentView = 'activeCall';
  callDuration = 0;

  Haptic.trigger('success');
  Speech.speak(`Calling ${name} now. Connected.`);

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
  Speech.speak("Call ended.");
  currentView = 'contacts';
  renderPhone();
  announceCurrentContact();
}

export function handlePhoneGesture(gesture) {
  const contacts = (state.db && state.db.contacts) || [];

  if (currentView === 'activeCall') {
    if (gesture === 'doubleTap' || gesture === 'longPress') {
      endCall();
    }
    return;
  }

  if (currentView === 'dialer') {
    if (gesture === 'swipeDown' || gesture === 'longPress') {
      currentView = 'contacts';
      Haptic.trigger('short');
      renderPhone();
      announceCurrentContact();
    } else if (gesture === 'doubleTap') {
      if (dialedNumber) startCall(dialedNumber);
    }
    return;
  }

  if (currentView === 'contacts') {
    if (gesture === 'swipeRight') {
      currentContactIndex = (currentContactIndex + 1) % contacts.length;
      Haptic.trigger('short');
      renderPhone();
      announceCurrentContact();
    }
    else if (gesture === 'swipeLeft') {
      currentContactIndex = (currentContactIndex - 1 + contacts.length) % contacts.length;
      Haptic.trigger('short');
      renderPhone();
      announceCurrentContact();
    }
    else if (gesture === 'doubleTap' || gesture === 'tap') {
      const contact = contacts[currentContactIndex];
      if (contact) startCall(contact.name);
    }
  }
}

export function announceCurrentContact() {
  const contacts = (state.db && state.db.contacts) || [];
  const contact = contacts[currentContactIndex];
  if (!contact) return;
  Speech.speak(`${contact.name}. Phone number: ${contact.phone}. Double tap to call.`);
}
