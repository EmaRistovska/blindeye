import { state, logSystem } from '../core/state.js';
import { Speech } from '../core/speech.js';
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
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 24px 16px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #3B0000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; text-align: center;">
        
        <div>
          <div style="width: 70px; height: 70px; border-radius: 50%; background: #EF4444; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto; animation: pulse 1s infinite alternate;">
            <i class="fa-solid fa-triangle-exclamation" style="font-size: 2.5rem; color: #FFFFFF;"></i>
          </div>
          <h2 style="margin: 0; font-size: 1.6rem; color: #FFFFFF; font-weight: 900;">EMERGENCY SOS DISPATCHED</h2>
          <p style="margin: 6px 0 0 0; font-size: 0.85rem; color: #FCA5A5;">Live GPS coordinates broadcasted.</p>
        </div>

        <div style="background: rgba(0,0,0,0.6); border: 2px solid #EF4444; border-radius: 16px; padding: 18px; width: 100%; box-sizing: border-box; text-align: left; font-size: 0.85rem; line-height: 1.5; color: #FFFFFF;">
          <div style="color: #FFEE55; font-weight: bold; margin-bottom: 6px;">● Emergency SMS Sent To:</div>
          <div>• Mother (+389 70 123 456)</div>
          <div>• Emergency Dispatch Services (112)</div>
          <div style="margin-top: 8px; font-family: monospace; color: #00E5FF; font-size: 0.8rem;">
            GPS Fix: 41.9981° N, 21.4254° E (Accuracy ±3m)
          </div>
        </div>

        <button id="btnDismissSos" style="width: 100%; padding: 14px; background: #FFFFFF; color: #000000; border: none; border-radius: 12px; font-weight: 900; font-size: 1rem; cursor: pointer;">
          DOUBLE TAP TO DISMISS
        </button>

      </div>
    `;

    document.getElementById('btnDismissSos')?.addEventListener('click', dismissSos);
    return;
  }

  // COUNTDOWN STATE
  container.innerHTML = `
    <div id="sosCountdownSurface" style="width: 100%; height: 100%; box-sizing: border-box; padding: 24px 16px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; text-align: center; cursor: pointer; user-select: none;">
      
      <div>
        <span style="background: #EF4444; color: #FFFFFF; font-size: 0.8rem; font-weight: 900; padding: 4px 14px; border-radius: 12px; letter-spacing: 1px;">
          <i class="fa-solid fa-bell"></i> EMERGENCY ALERT
        </span>
        <h2 style="margin: 14px 0 4px 0; font-size: 1.5rem; color: #FFFFFF;">Sending SOS in...</h2>
      </div>

      <!-- 3-Second Pulsing Ring -->
      <div style="width: 150px; height: 150px; border-radius: 50%; border: 6px solid #EF4444; display: flex; align-items: center; justify-content: center; background: rgba(239, 68, 68, 0.15); animation: pulse 0.8s infinite alternate; box-shadow: 0 0 40px rgba(239,68,68,0.4);">
        <span id="sosCountdownNumber" style="font-size: 4.8rem; font-weight: 900; color: #FFFFFF; font-family: monospace;">
          ${countdownSeconds}
        </span>
      </div>

      <div style="width: 100%;">
        <div style="background: #181818; border: 1.5px solid #EF4444; border-radius: 12px; padding: 12px; margin-bottom: 8px;">
          <span style="color: #FFEE55; font-weight: bold; font-size: 0.85rem;">
            LONG PRESS ANYWHERE TO CANCEL
          </span>
        </div>
        <button id="btnCancelSosImmediate" style="width: 100%; padding: 14px; background: #374151; color: #FFFFFF; border: none; border-radius: 12px; font-weight: bold; font-size: 0.95rem; cursor: pointer;">
          Cancel Emergency
        </button>
      </div>

    </div>
  `;

  document.getElementById('btnCancelSosImmediate')?.addEventListener('click', cancelSos);
  document.getElementById('sosCountdownSurface')?.addEventListener('pointerdown', handleSosSurfaceDown);
}

let sosPressTime = 0;
function handleSosSurfaceDown(e) {
  sosPressTime = Date.now();
  const checkLongPress = setTimeout(() => {
    if (sosPressTime && (Date.now() - sosPressTime >= 500)) {
      cancelSos();
    }
  }, 500);

  window.addEventListener('pointerup', () => {
    clearTimeout(checkLongPress);
    sosPressTime = 0;
  }, { once: true });
}

export function startSosCountdown() {
  sosDispatched = false;
  countdownSeconds = 3;
  renderSos();

  Haptic.trigger('sos');
  Speech.speak("Emergency SOS activated. Sending in 3 seconds. Long press anywhere to cancel.");

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
  Haptic.trigger('success');
  Speech.speak("Emergency SOS cancelled. Returning to main menu.");
  navigateTo('mainMenuScreen');
}

export function dispatchSos() {
  sosDispatched = true;
  Haptic.trigger('sos');
  Speech.speak("Emergency SOS alert dispatched with live GPS coordinates to Mother and 112.");
  renderSos();
}

export function dismissSos() {
  sosDispatched = false;
  Haptic.trigger('short');
  Speech.speak("Emergency alert dismissed. Returning to main menu.");
  navigateTo('mainMenuScreen');
}

export function triggerSosEmergency() {
  navigateTo('sosScreen');
  startSosCountdown();
}

export function handleSosGesture(gesture) {
  if (gesture === 'longPress' || gesture === 'swipeDown') {
    cancelSos();
  } else if (sosDispatched && (gesture === 'doubleTap' || gesture === 'tap')) {
    dismissSos();
  }
}
