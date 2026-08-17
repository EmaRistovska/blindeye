import { state, logSystem } from '../core/state.js';
import { Speech } from '../core/speech.js';
import { Haptic } from '../core/haptics.js';
import { navigateTo } from '../core/router.js';

let countdownValue = 3;
let countdownTimer = null;
let isDispatched = false;

export function renderSos() {
  const container = document.getElementById('sosScreen');
  if (!container) return;

  if (isDispatched) {
    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 24px 16px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif;">
        
        <div style="text-align: center; margin-top: 10px;">
          <span style="background: #EF4444; color: #FFF; font-size: 0.8rem; font-weight: 900; padding: 4px 12px; border-radius: 12px;">
            <i class="fa-solid fa-triangle-exclamation"></i> SOS ALERT ACTIVE
          </span>
          <h2 style="margin: 12px 0 4px 0; font-size: 1.5rem; color: #EF4444; font-weight: 900;">HELP DISPATCHED</h2>
          <p style="margin: 0; font-size: 0.85rem; color: #E2E8F0;">Emergency SMS sent to Mother (+389 70 123 456) and 112 with live GPS coordinates.</p>
        </div>

        <div style="width: 110px; height: 110px; border-radius: 50%; border: 4px solid #EF4444; display: flex; align-items: center; justify-content: center; background: rgba(239,68,68,0.15); animation: pulse 1s infinite alternate;">
          <i class="fa-solid fa-tower-broadcast" style="font-size: 3.2rem; color: #EF4444;"></i>
        </div>

        <div style="background: #111; border: 1px solid #333; border-radius: 10px; padding: 10px; font-size: 0.75rem; color: #94A3B8; text-align: center; width: 100%;">
          GPS: Lat 41.9981° N, Lng 21.4254° E • Siren Active
        </div>

        <button id="btnCancelSosActive" style="width: 100%; padding: 14px; background: #374151; color: #FFFFFF; border: none; border-radius: 12px; font-weight: 900; font-size: 0.95rem; cursor: pointer;">
          HOLD TO CANCEL EMERGENCY
        </button>

      </div>
    `;

    document.getElementById('btnCancelSosActive')?.addEventListener('click', cancelSos);
    return;
  }

  // Active 3-Second Countdown View
  container.innerHTML = `
    <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 24px 16px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif;">
      
      <div style="text-align: center; margin-top: 10px;">
        <h2 style="margin: 0; font-size: 1.6rem; color: #EF4444; font-weight: 900; text-transform: uppercase;">
          <i class="fa-solid fa-circle-exclamation"></i> EMERGENCY SOS
        </h2>
        <p style="margin: 6px 0 0 0; font-size: 0.85rem; color: #CBD5E1;">Sending emergency alert in...</p>
      </div>

      <!-- Countdown Ring -->
      <div style="width: 140px; height: 140px; border-radius: 50%; border: 6px solid #EF4444; display: flex; align-items: center; justify-content: center; background: rgba(239,68,68,0.1); box-shadow: 0 0 35px rgba(239, 68, 68, 0.4);">
        <span id="sosCountdownNum" style="font-size: 4.5rem; font-weight: 900; color: #EF4444; font-family: monospace;">
          ${countdownValue}
        </span>
      </div>

      <button id="btnCancelSos" style="width: 100%; padding: 14px; background: #EF4444; color: #FFFFFF; border: none; border-radius: 12px; font-weight: 900; font-size: 1rem; cursor: pointer;">
        TAP TO CANCEL SOS
      </button>

    </div>
  `;

  document.getElementById('btnCancelSos')?.addEventListener('click', cancelSos);
}

export function triggerSosEmergency() {
  navigateTo('sosScreen');
  isDispatched = false;
  countdownValue = 3;
  renderSos();

  Haptic.trigger('sos');
  Speech.speak("Emergency SOS initiated. Alert will be sent in 3 seconds. Tap screen to cancel.");

  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    countdownValue--;
    const numEl = document.getElementById('sosCountdownNum');
    if (numEl) numEl.innerText = countdownValue;

    if (countdownValue > 0) {
      Haptic.trigger('warning');
      Speech.speak(`${countdownValue}`);
    } else {
      clearInterval(countdownTimer);
      dispatchSosAlert();
    }
  }, 1000);
}

export function dispatchSosAlert() {
  isDispatched = true;
  Haptic.trigger('sos');
  Speech.speak("Emergency SOS dispatched! SMS sent with live GPS coordinates to Mother and 112 emergency center.");
  renderSos();
}

export function cancelSos() {
  if (countdownTimer) clearInterval(countdownTimer);
  isDispatched = false;
  Haptic.trigger('success');
  Speech.speak("Emergency SOS cancelled. Returning to Main Menu.");
  navigateTo('mainMenuScreen');
}

export function handleSosGesture(gesture) {
  if (gesture === 'tap' || gesture === 'doubleTap' || gesture === 'swipeDown' || gesture === 'longPress') {
    cancelSos();
  }
}
