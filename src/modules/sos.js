import { state, logSystem } from '../core/state.js';
import { Speech, formatPhoneForTTS } from '../core/speech.js';
import { Haptic } from '../core/haptics.js';
import { navigateTo } from '../core/router.js';

let sosTimer = null;
let countdownSeconds = 3;
let sosDispatched = false;

export function renderSos() {
  const container = document.getElementById('sosScreen');
  if (!container) return;

  if (sosDispatched) {
    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 22px 14px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: radial-gradient(circle at 50% 0%, #1e0508 0%, #050102 70%, #000000 100%); color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; text-align: center; border: 2.5px solid #EF4444; border-radius: 20px; box-shadow: 0 0 45px rgba(239,68,68,0.7), inset 0 0 30px rgba(239,68,68,0.25);">
        
        <!-- Top Emergency Badge -->
        <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(239,68,68,0.2); border: 1.5px solid #EF4444; border-radius: 999px; padding: 6px 18px; color: #EF4444; font-weight: 900; font-size: 0.78rem; letter-spacing: 1.2px; box-shadow: 0 0 18px rgba(239,68,68,0.5);">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #EF4444; box-shadow: 0 0 10px #EF4444; display: inline-block;"></span>
          <i class="fa-solid fa-triangle-exclamation"></i> EMERGENCY SOS BROADCAST
        </div>

        <!-- High-Impact Neon Medical/Help Statement -->
        <div style="margin: auto 0; padding: 12px 0;">
          <h1 style="margin: 0; font-size: 2.1rem; font-weight: 900; color: #FFFFFF; text-shadow: 0 0 12px rgba(255,255,255,0.9), 0 0 30px rgba(239,68,68,0.9); letter-spacing: 1.5px; line-height: 1.25; text-transform: uppercase;">
            I AM VISUALLY IMPAIRED<br><span style="color: #FF4D4D; text-shadow: 0 0 22px #FF4D4D;">I NEED IMMEDIATE HELP</span>
          </h1>
        </div>

        <!-- Glassmorphic Emergency Contact Card for Bystanders -->
        <div style="width: 100%;">
          <div style="background: linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(20,20,30,0.85) 100%); border: 1.5px solid rgba(239,68,68,0.5); border-radius: 16px; padding: 16px 14px; text-align: center; box-shadow: 0 0 25px rgba(239,68,68,0.25), inset 0 0 15px rgba(239,68,68,0.12); backdrop-filter: blur(12px);">
            <div style="display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 0.72rem; color: #FFEE55; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px;">
              <i class="fa-solid fa-phone-volume"></i> PRIMARY EMERGENCY CONTACT
            </div>
            <div style="font-size: 1.35rem; font-weight: 900; color: #FFFFFF; letter-spacing: 0.5px; margin: 2px 0;">
              Mother
            </div>
            <div style="font-size: 1.45rem; font-family: monospace; font-weight: 900; color: #FFEE55; text-shadow: 0 0 16px rgba(255,238,85,0.7); margin: 4px 0 10px 0; letter-spacing: 1.5px;">
              +389 70 123 456
            </div>
            <div style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); color: #FFFFFF; font-size: 0.76rem; font-weight: 900; padding: 8px 18px; border-radius: 999px; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 0 18px rgba(239,68,68,0.7); letter-spacing: 0.8px; border: 1px solid rgba(255,255,255,0.25); text-transform: uppercase;">
              <i class="fa-solid fa-phone"></i> DOUBLE TAP TO CALL DIRECTLY
            </div>
          </div>
        </div>

      </div>
    `;

    let _sosDispatchedClickCount = 0;
    let _sosDispatchedClickTimer = null;
    container.onclick = (e) => {
      e.stopPropagation();
      _sosDispatchedClickCount++;
      if (_sosDispatchedClickCount === 1) {
        _sosDispatchedClickTimer = setTimeout(() => {
          _sosDispatchedClickCount = 0;
          const spokenPhone = formatPhoneForTTS('+389 70 123 456');
          Speech.speak(`SOS dispatched. Emergency contact: Mother, ${spokenPhone}. Double tap to call Mother directly. Long press to dismiss.`);
        }, 350);
      } else if (_sosDispatchedClickCount >= 2) {
        clearTimeout(_sosDispatchedClickTimer);
        _sosDispatchedClickCount = 0;
        callEmergencyContact();
      }
    };
    return;
  }

  // COUNTDOWN STATE
  container.innerHTML = `
    <div id="sosCountdownSurface" style="width: 100%; height: 100%; box-sizing: border-box; padding: 24px 16px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: radial-gradient(circle at 50% 30%, #2a080d 0%, #080102 70%, #000000 100%); color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; text-align: center; cursor: pointer; user-select: none; border: 2.5px solid #EF4444; border-radius: 20px; box-shadow: 0 0 45px rgba(239,68,68,0.7), inset 0 0 30px rgba(239,68,68,0.25);">
      
      <div style="width: 100%; display: flex; flex-direction: column; align-items: center; gap: 4px;">
        <span style="background: rgba(239,68,68,0.25); border: 1.5px solid #EF4444; color: #EF4444; font-size: 0.78rem; font-weight: 900; padding: 5px 18px; border-radius: 999px; letter-spacing: 1.2px; box-shadow: 0 0 18px rgba(239,68,68,0.6);">
          <i class="fa-solid fa-bell"></i> EMERGENCY TRIGGERED
        </span>
        <h2 style="margin: 10px 0 0 0; font-size: 1.35rem; font-weight: 900; color: #FFFFFF; letter-spacing: 0.5px;">
          Broadcasting SOS Alert In...
        </h2>
      </div>

      <!-- 3-Second Pulsing Radar Ring -->
      <div style="width: 140px; height: 140px; border-radius: 50%; border: 5px solid #EF4444; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle, rgba(239,68,68,0.3) 0%, rgba(239,68,68,0.05) 70%); box-shadow: 0 0 50px rgba(239,68,68,0.9), inset 0 0 25px rgba(239,68,68,0.5); margin: auto 0;">
        <span id="sosCountdownNumber" style="font-size: 4.8rem; font-weight: 900; color: #FFFFFF; font-family: monospace; text-shadow: 0 0 25px #EF4444;">
          ${countdownSeconds}
        </span>
      </div>

    </div>
  `;

  const cdSurface = document.getElementById('sosCountdownSurface');
  if (cdSurface) {
    let holdTimer = null;
    let downTime = 0;

    cdSurface.onpointerdown = (e) => {
      e.stopPropagation();
      downTime = Date.now();
      Haptic.trigger('short');
      if (holdTimer) clearTimeout(holdTimer);
      holdTimer = setTimeout(() => {
        holdTimer = null;
        cancelSos();
      }, 450);
    };

    const cancelHold = (e) => {
      e.stopPropagation();
      if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
        const elapsed = Date.now() - downTime;
        if (elapsed < 450) {
          Speech.speak("Hold down to cancel emergency alert.");
          Haptic.trigger('warning');
        }
      }
      downTime = 0;
    };

    cdSurface.onpointerup = cancelHold;
    cdSurface.onpointercancel = cancelHold;
  }
}

export function startSosCountdown() {
  sosDispatched = false;
  countdownSeconds = 3;
  renderSos();

  Haptic.trigger('warning');
  Speech.speak("3");

  if (sosTimer) clearInterval(sosTimer);
  sosTimer = setInterval(() => {
    countdownSeconds--;
    const numEl = document.getElementById('sosCountdownNumber');
    if (numEl) numEl.innerText = countdownSeconds;

    if (countdownSeconds > 0) {
      Haptic.trigger('warning');
      Speech.speak(`${countdownSeconds}`);
    } else {
      clearInterval(sosTimer);
      sosTimer = null;
      dispatchSos();
    }
  }, 1000);
}

export function cancelSos() {
  if (sosTimer) {
    clearInterval(sosTimer);
    sosTimer = null;
  }
  sosDispatched = false;
  countdownSeconds = 3;
  Haptic.trigger('success');
  import('./mainMenu.js').then(({ getMainMenuIndex, categories }) => {
    const mainIdx = getMainMenuIndex ? getMainMenuIndex() : 0;
    const current = (categories && categories[mainIdx]) ? categories[mainIdx] : { title: 'MESSAGES', subtitle: 'View unread SMS & conversations' };
    Speech.speak(`Emergency SOS cancelled. Returning to main menu. ${current.title}. ${current.subtitle}.`);
  });
  navigateTo('mainMenuScreen');
}

export function dispatchSos() {
  sosDispatched = true;
  Haptic.trigger('sos');
  const spokenPhone = formatPhoneForTTS('+389 70 123 456');
  Speech.speak(`Emergency SOS alert dispatched. Showing help screen: I am visually impaired, I need immediate help. Emergency contact: Mother, ${spokenPhone}. Double tap to call Mother directly.`);
  renderSos();
}

export function callEmergencyContact() {
  Haptic.trigger('success');
  const spokenPhone = formatPhoneForTTS('+389 70 123 456');
  Speech.speak(`Calling Mother on ${spokenPhone}. Please stay calm. Help is on the way.`);
  // In production this will use Capacitor Phone plugin: Plugins.Phone.call({ number: '+38970123456' })
  // For now, navigate to active call screen as simulation
  import('../core/router.js').then(({ navigateTo }) => {
    sosDispatched = false;
    navigateTo('activeCallScreen');
  });
}

export function dismissSos() {
  sosDispatched = false;
  Haptic.trigger('short');
  import('./mainMenu.js').then(({ getMainMenuIndex, categories }) => {
    const mainIdx = getMainMenuIndex ? getMainMenuIndex() : 0;
    const current = (categories && categories[mainIdx]) ? categories[mainIdx] : { title: 'MESSAGES', subtitle: 'View unread SMS & conversations' };
    Speech.speak(`Emergency alert dismissed. Returning to main menu. ${current.title}. ${current.subtitle}.`);
  });
  navigateTo('mainMenuScreen');
}

export function triggerSosEmergency() {
  navigateTo('sosScreen');
  startSosCountdown();
}

export function handleSosGesture(gesture) {
  if (!sosDispatched) {
    if (gesture === 'longPress') {
      cancelSos();
      return;
    }
    if (gesture === 'tap' || gesture === 'doubleTap' || gesture === 'twoFingerTap' || gesture === 'swipeDown') {
      Speech.speak("Hold down or long press to cancel emergency alert.");
      Haptic.trigger('warning');
      return;
    }
    return;
  }

  if (gesture === 'longPress') {
    dismissSos();
  } else if (gesture === 'doubleTap') {
    // Double tap on dispatched screen = call the emergency contact
    callEmergencyContact();
  } else if (gesture === 'tap') {
    // Single tap on dispatched screen = read status aloud
    const spokenPhone = formatPhoneForTTS('+389 70 123 456');
    Speech.speak(`SOS dispatched. Emergency contact: Mother, ${spokenPhone}. Double tap to call Mother directly. Long press to dismiss.`);
  }
}
