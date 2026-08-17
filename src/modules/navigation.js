import { state, logSystem } from '../core/state.js';
import { Speech } from '../core/speech.js';
import { Haptic } from '../core/haptics.js';
import { navigateTo } from '../core/router.js';

let currentPlaceIndex = 0;
let isNavigating = false;
let routeStep = 0;
let gpsWatchId = null;
let currentCoords = { lat: 41.9981, lng: 21.4254, accuracy: 5 }; // Skopje default / live

const savedPlaces = [
  { id: '1', name: 'Home', address: 'Partizanska 45, Skopje', distance: '450m away', eta: '5 mins walking' },
  { id: '2', name: 'Doctor Office', address: 'Mother Teresa Clinic Center', distance: '1.2 km away', eta: '14 mins walking' },
  { id: '3', name: 'Eurofarm Pharmacy', address: 'Bulevar Kliment Ohridski 12', distance: '280m away', eta: '3 mins walking' }
];

const navigationSteps = [
  "In 25 meters, turn right onto Main Boulevard.",
  "Continue straight along the sidewalk for 150 meters.",
  "Approaching pedestrian crosswalk with tactile warning paving.",
  "Turn left. You have arrived at your destination."
];

export function renderNavigation() {
  const container = document.getElementById('navigationScreen');
  if (!container) return;

  // Start GPS tracker if available
  startGpsTracker();

  if (isNavigating) {
    // Active Turn-by-Turn Guidance View
    const stepText = navigationSteps[routeStep] || navigationSteps[0];
    const destination = savedPlaces[currentPlaceIndex];

    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 18px 14px; display: flex; flex-direction: column; justify-content: space-between; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif;">
        
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 6px;">
          <span style="font-size: 0.75rem; color: #10B981; font-weight: bold; background: rgba(16,185,129,0.15); padding: 2px 8px; border-radius: 10px;">
            <i class="fa-solid fa-location-arrow"></i> GPS ROUTE ACTIVE
          </span>
          <span style="font-size: 0.75rem; color: #94A3B8;">${destination.name}</span>
        </div>

        <!-- Step Directive Hero -->
        <div style="border: 2.5px solid #A855F7; border-radius: 18px; padding: 20px 16px; background: #07090E; margin: auto 0; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px; box-shadow: 0 0 25px rgba(168, 85, 247, 0.15);">
          <div style="width: 70px; height: 70px; border-radius: 50%; background: rgba(168, 85, 247, 0.15); border: 2px solid #A855F7; display: flex; align-items: center; justify-content: center;">
            <i class="fa-solid fa-arrow-up" style="font-size: 2rem; color: #A855F7;"></i>
          </div>

          <h3 style="margin: 0; font-size: 1.25rem; line-height: 1.4; color: #FFFFFF; font-weight: 800;">
            ${stepText}
          </h3>

          <div style="font-size: 0.75rem; color: #FFEE55; font-weight: bold;">
            Step [ ${routeStep + 1} / ${navigationSteps.length} ]
          </div>
        </div>

        <!-- Guidance Actions -->
        <div style="display: flex; gap: 8px;">
          <button id="btnNextStep" style="flex: 2; padding: 12px; background: #A855F7; color: #FFF; border: none; border-radius: 10px; font-weight: 900; font-size: 0.85rem; cursor: pointer;">
            NEXT STEP
          </button>
          <button id="btnEndNav" style="flex: 1; padding: 12px; background: #EF4444; color: #FFF; border: none; border-radius: 10px; font-weight: bold; font-size: 0.8rem; cursor: pointer;">
            Stop
          </button>
        </div>

      </div>
    `;

    document.getElementById('btnNextStep')?.addEventListener('click', advanceRouteStep);
    document.getElementById('btnEndNav')?.addEventListener('click', stopNavigation);
    return;
  }

  // Saved Places List View
  const place = savedPlaces[currentPlaceIndex];

  container.innerHTML = `
    <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 18px 14px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif;">
      
      <!-- Header -->
      <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-location-dot" style="color: #A855F7; font-size: 1.1rem;"></i>
          <span style="color: #A855F7; font-size: 0.9rem; font-weight: 800;">GPS PLACES</span>
        </div>
        <span style="color: #FFFFFF; font-size: 0.8rem; font-weight: bold; background: #181818; padding: 2px 8px; border-radius: 12px; border: 1px solid #333;">
          [ ${currentPlaceIndex + 1} / ${savedPlaces.length} ]
        </span>
      </div>

      <!-- Single Focus Saved Place Card -->
      <div class="nav-focus-card" style="width: 100%; border: 3px solid #A855F7; border-radius: 20px; padding: 22px 16px; background: #07090E; display: flex; flex-direction: column; gap: 14px; margin: auto 0; box-shadow: 0 0 20px rgba(168, 85, 247, 0.12); cursor: pointer;">
        
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="background: rgba(168, 85, 247, 0.2); color: #A855F7; font-size: 0.65rem; font-weight: 900; padding: 2px 8px; border-radius: 6px; border: 1px solid #A855F7;">
            ${place.distance}
          </span>
          <span style="font-size: 0.75rem; color: #94A3B8;">${place.eta}</span>
        </div>

        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(168, 85, 247, 0.15); border: 2px solid #A855F7; display: flex; align-items: center; justify-content: center;">
            <i class="fa-solid fa-map-pin" style="color: #A855F7; font-size: 1.3rem;"></i>
          </div>
          <div>
            <h2 style="margin: 0; font-size: 1.4rem; color: #FFFFFF; font-weight: 900;">${place.name}</h2>
            <span style="font-size: 0.8rem; color: #94A3B8;">${place.address}</span>
          </div>
        </div>

        <button id="btnStartNav" style="width: 100%; padding: 12px; background: #A855F7; color: #FFFFFF; border: none; border-radius: 10px; font-weight: 900; font-size: 0.95rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 4px;">
          <i class="fa-solid fa-location-arrow"></i> DOUBLE TAP TO NAVIGATE
        </button>
      </div>

      <!-- Hint -->
      <div style="width: 100%; border-top: 1px dashed #333; padding-top: 6px; text-align: center;">
        <span style="color: #64748B; font-size: 0.7rem;">Swipe Right/Left: Next/Prev Place • Long Press: Back</span>
      </div>

    </div>
  `;

  document.getElementById('btnStartNav')?.addEventListener('click', () => {
    startNavigation();
  });
}

export function startGpsTracker() {
  if (navigator.geolocation && !gpsWatchId) {
    try {
      gpsWatchId = navigator.geolocation.watchPosition((pos) => {
        currentCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        };
      }, (err) => {
        logSystem(`[GPS] Geolocation update error: ${err.message}`, 'warning');
      }, { enableHighAccuracy: true });
    } catch (e) {}
  }
}

export function startNavigation() {
  const place = savedPlaces[currentPlaceIndex];
  isNavigating = true;
  routeStep = 0;
  Haptic.trigger('success');
  Speech.speak(`GPS route started for ${place.name}. ${navigationSteps[0]}`);
  renderNavigation();
}

export function advanceRouteStep() {
  routeStep++;
  if (routeStep >= navigationSteps.length) {
    Haptic.trigger('success');
    Speech.speak("You have arrived at your destination.");
    stopNavigation();
    return;
  }
  Haptic.trigger('short');
  Speech.speak(navigationSteps[routeStep]);
  renderNavigation();
}

export function stopNavigation() {
  isNavigating = false;
  routeStep = 0;
  Haptic.trigger('short');
  Speech.speak("GPS navigation ended.");
  renderNavigation();
  announceCurrentPlace();
}

export function handleNavigationGesture(gesture) {
  if (isNavigating) {
    if (gesture === 'doubleTap' || gesture === 'swipeRight') {
      advanceRouteStep();
    } else if (gesture === 'longPress' || gesture === 'swipeDown') {
      stopNavigation();
    }
    return;
  }

  if (gesture === 'swipeRight') {
    currentPlaceIndex = (currentPlaceIndex + 1) % savedPlaces.length;
    Haptic.trigger('short');
    renderNavigation();
    announceCurrentPlace();
  }
  else if (gesture === 'swipeLeft') {
    currentPlaceIndex = (currentPlaceIndex - 1 + savedPlaces.length) % savedPlaces.length;
    Haptic.trigger('short');
    renderNavigation();
    announceCurrentPlace();
  }
  else if (gesture === 'doubleTap' || gesture === 'tap') {
    startNavigation();
  }
}

export function announceCurrentPlace() {
  const place = savedPlaces[currentPlaceIndex];
  if (!place) return;
  Speech.speak(`${place.name}. ${place.address}. ${place.distance}. Double tap to start walking route.`);
}
