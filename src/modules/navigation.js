import { state, logSystem } from '../core/state.js';
import { Speech } from '../core/speech.js';
import { Haptic } from '../core/haptics.js';
import { navigateTo } from '../core/router.js';

const NAV_CATEGORIES = [
  { id: 'search', title: 'NAVIGATE TO PLACE', subtitle: 'Enter or speak a destination', icon: 'fa-magnifying-glass-location', color: '#A855F7' },
  { id: 'saved', title: 'SAVED PLACES', subtitle: 'Quick access saved destinations', icon: 'fa-map-pin', color: '#00E5FF' }
];

let currentCatIdx = 0;
let navViewMode = 'categoryMenu'; // 'categoryMenu', 'searchInput', 'savedPlaces', 'placeActionMenu', 'activeRouting'

let selectedPlaceIdx = 0;
let currentActionIdx = 0;
let isNavigating = false;
let routeStep = 0;

let currentPlaceTarget = { name: 'Eurofarm Pharmacy', address: 'Bulevar Kliment Ohridski 12', phone: '+389 72 888 999', distance: '280m away' };

const defaultSavedPlaces = [
  { id: '1', name: 'Home', address: 'Partizanska 45, Skopje', phone: '+389 70 123 456', distance: '450m away' },
  { id: '2', name: 'Doctor Office', address: 'Mother Teresa Clinic Center', phone: '+389 72 555 112', distance: '1.2 km away' },
  { id: '3', name: 'Eurofarm Pharmacy', address: 'Bulevar Kliment Ohridski 12', phone: '+389 72 888 999', distance: '280m away' }
];

const PLACE_ACTIONS = [
  { id: 'navigate', title: 'NAVIGATE TO PLACE', icon: 'fa-location-arrow', color: '#A855F7' },
  { id: 'call', title: 'CALL PLACE', icon: 'fa-phone', color: '#10B981' },
  { id: 'toggle_save', title: 'SAVE / REMOVE PLACE', icon: 'fa-bookmark', color: '#FFEE55' }
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

  const places = (state.db && state.db.savedPlaces) || defaultSavedPlaces;

  // ----------------------------------------------------
  // VIEW 1: ACTIVE GPS ROUTING VIEW
  // ----------------------------------------------------
  if (navViewMode === 'activeRouting') {
    const stepText = navigationSteps[routeStep] || navigationSteps[0];

    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 18px 14px; display: flex; flex-direction: column; justify-content: space-between; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif;">
        
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 6px;">
          <span style="font-size: 0.75rem; color: #10B981; font-weight: bold; background: rgba(16,185,129,0.15); padding: 2px 8px; border-radius: 10px;">
            <i class="fa-solid fa-location-arrow"></i> WALKING ROUTE ACTIVE
          </span>
          <span style="font-size: 0.75rem; color: #94A3B8;">${currentPlaceTarget.name}</span>
        </div>

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

        <div style="display: flex; gap: 8px;">
          <button id="btnNextNavStep" style="flex: 2; padding: 12px; background: #A855F7; color: #FFF; border: none; border-radius: 10px; font-weight: 900; font-size: 0.85rem; cursor: pointer;">
            NEXT STEP
          </button>
          <button id="btnStopNavRoute" style="flex: 1; padding: 12px; background: #EF4444; color: #FFF; border: none; border-radius: 10px; font-weight: bold; font-size: 0.8rem; cursor: pointer;">
            Stop
          </button>
        </div>

      </div>
    `;

    document.getElementById('btnNextNavStep')?.addEventListener('click', advanceNavStep);
    document.getElementById('btnStopNavRoute')?.addEventListener('click', stopNavRoute);
    return;
  }

  // ----------------------------------------------------
  // VIEW 2: NAVIGATION 2-CATEGORY MENU
  // ----------------------------------------------------
  if (navViewMode === 'categoryMenu') {
    const cat = NAV_CATEGORIES[currentCatIdx];

    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 18px 14px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif;">
        
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
          <span style="color: #A855F7; font-size: 0.8rem; font-weight: 800; letter-spacing: 1px;">[ GPS NAVIGATION ]</span>
          <span style="color: #FFFFFF; font-size: 0.85rem; font-weight: bold; background: #181818; padding: 2px 8px; border-radius: 12px;">
            [ ${currentCatIdx + 1} / ${NAV_CATEGORIES.length} ]
          </span>
        </div>

        <div class="nav-cat-card" style="width: 100%; border: 3px solid ${cat.color}; border-radius: 20px; padding: 26px 16px; background: rgba(0,0,0,0.9); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; text-align: center; box-shadow: 0 0 25px rgba(168, 85, 247, 0.15); margin: auto 0; cursor: pointer;">
          
          <div style="width: 85px; height: 85px; border-radius: 50%; border: 3px solid ${cat.color}; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.03);">
            <i class="fa-solid ${cat.icon}" style="font-size: 2.6rem; color: ${cat.color};"></i>
          </div>

          <div>
            <h2 style="margin: 0; font-size: 1.5rem; font-weight: 900; color: ${cat.color};">${cat.title}</h2>
            <p style="margin: 6px 0 0 0; font-size: 0.8rem; color: #94A3B8;">${cat.subtitle}</p>
          </div>

          <div style="margin-top: 4px; padding: 4px 12px; background: rgba(255,255,255,0.08); border-radius: 14px; font-size: 0.72rem; color: #FFEE55; font-weight: bold;">
            Double Tap to Open
          </div>
        </div>

        <div style="width: 100%; border-top: 1px dashed #333; padding-top: 8px; text-align: center;">
          <span style="color: #64748B; font-size: 0.7rem;">Swipe Right/Left: Next/Prev Mode • Double Tap: Select</span>
        </div>

      </div>
    `;

    container.querySelector('.nav-cat-card')?.addEventListener('click', selectNavCategory);
    return;
  }

  // ----------------------------------------------------
  // VIEW 3: NAVIGATE TO PLACE (SEARCH / VOICE ENTRY)
  // ----------------------------------------------------
  if (navViewMode === 'searchInput') {
    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 20px 16px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; text-align: center;">
        
        <div>
          <span style="color: #A855F7; font-size: 0.8rem; font-weight: 900; background: rgba(168,85,247,0.15); padding: 3px 12px; border-radius: 12px;">
            <i class="fa-solid fa-magnifying-glass"></i> PLACE FINDER
          </span>
          <h2 style="margin: 12px 0 4px 0; font-size: 1.4rem; color: #FFFFFF;">Speak Destination</h2>
        </div>

        <div id="btnStartVoiceSearch" style="width: 110px; height: 110px; border-radius: 50%; border: 3px solid #A855F7; display: flex; align-items: center; justify-content: center; background: rgba(168,85,247,0.08); cursor: pointer; animation: pulse 2s infinite alternate;">
          <i class="fa-solid fa-microphone" style="font-size: 3.2rem; color: #A855F7;"></i>
        </div>

        <div style="background: #0A0F1D; border: 1px solid #1E293B; border-radius: 10px; padding: 12px; width: 100%; box-sizing: border-box;">
          <span style="font-size: 0.75rem; color: #94A3B8;">Double tap to speak destination (e.g. Pharmacy, Clinic, Supermarket).</span>
        </div>

        <button id="btnFoundPlaceDemo" style="width: 100%; padding: 12px; background: #A855F7; color: #FFF; border: none; border-radius: 10px; font-weight: 900; font-size: 0.9rem; cursor: pointer;">
          DOUBLE TAP: FIND "EUROFARM PHARMACY"
        </button>

      </div>
    `;

    document.getElementById('btnStartVoiceSearch')?.addEventListener('click', simulateFoundPlace);
    document.getElementById('btnFoundPlaceDemo')?.addEventListener('click', simulateFoundPlace);
    return;
  }

  // ----------------------------------------------------
  // VIEW 4: SAVED PLACES LIST
  // ----------------------------------------------------
  if (navViewMode === 'savedPlaces') {
    const place = places[selectedPlaceIdx % places.length];

    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 18px 14px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif;">
        
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
          <span style="color: #00E5FF; font-size: 0.9rem; font-weight: 800;"><i class="fa-solid fa-bookmark"></i> SAVED PLACES</span>
          <span style="color: #FFFFFF; font-size: 0.8rem; font-weight: bold; background: #181818; padding: 2px 8px; border-radius: 12px;">
            [ ${(selectedPlaceIdx % places.length) + 1} / ${places.length} ]
          </span>
        </div>

        <div class="saved-place-card" style="width: 100%; border: 3px solid #00E5FF; border-radius: 20px; padding: 22px 16px; background: #07090E; display: flex; flex-direction: column; gap: 14px; margin: auto 0; box-shadow: 0 0 20px rgba(0, 229, 255, 0.12); cursor: pointer;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="background: rgba(0,229,255,0.15); color: #00E5FF; font-size: 0.65rem; font-weight: 900; padding: 2px 8px; border-radius: 6px;">
              ${place.distance}
            </span>
            <span style="font-size: 0.72rem; color: #94A3B8;">Double tap for options</span>
          </div>

          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 50px; height: 50px; border-radius: 50%; background: rgba(0, 229, 255, 0.15); border: 2px solid #00E5FF; display: flex; align-items: center; justify-content: center;">
              <i class="fa-solid fa-map-pin" style="color: #00E5FF; font-size: 1.4rem;"></i>
            </div>
            <div>
              <h2 style="margin: 0; font-size: 1.35rem; color: #FFFFFF; font-weight: 900;">${place.name}</h2>
              <span style="font-size: 0.8rem; color: #94A3B8;">${place.address}</span>
            </div>
          </div>

          <button id="btnOpenPlaceActions" style="width: 100%; padding: 12px; background: #00E5FF; color: #000; border: none; border-radius: 10px; font-weight: 900; font-size: 0.9rem; cursor: pointer;">
            DOUBLE TAP FOR PLACE ACTION MENU
          </button>
        </div>

        <div style="width: 100%; border-top: 1px dashed #333; padding-top: 6px; text-align: center;">
          <span style="color: #64748B; font-size: 0.7rem;">Swipe Right/Left: Next/Prev Place • Long Press: Back to Nav Menu</span>
        </div>

      </div>
    `;

    document.getElementById('btnOpenPlaceActions')?.addEventListener('click', () => {
      currentPlaceTarget = place;
      openPlaceActionMenu();
    });
    return;
  }

  // ----------------------------------------------------
  // VIEW 5: PLACE ACTION MENU (NAVIGATE, CALL, SAVE/REMOVE)
  // ----------------------------------------------------
  if (navViewMode === 'placeActionMenu') {
    const act = PLACE_ACTIONS[currentActionIdx];

    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 18px 14px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif;">
        
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
          <span style="color: #A855F7; font-size: 0.8rem; font-weight: bold;">Options for ${currentPlaceTarget.name}</span>
          <span style="color: #FFFFFF; font-size: 0.85rem; font-weight: bold; background: #181818; padding: 2px 8px; border-radius: 12px;">
            [ ${currentActionIdx + 1} / 3 ]
          </span>
        </div>

        <div class="nav-action-card" style="width: 100%; border: 3px solid ${act.color}; border-radius: 20px; padding: 26px 16px; background: rgba(0,0,0,0.9); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; text-align: center; margin: auto 0; cursor: pointer;">
          <div style="width: 75px; height: 75px; border-radius: 50%; border: 3px solid ${act.color}; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.04);">
            <i class="fa-solid ${act.icon}" style="font-size: 2.2rem; color: ${act.color};"></i>
          </div>

          <div>
            <h2 style="margin: 0; font-size: 1.3rem; font-weight: 900; color: ${act.color};">${act.title}</h2>
            <p style="margin: 4px 0 0 0; font-size: 0.8rem; color: #94A3B8;">${currentPlaceTarget.name} (${currentPlaceTarget.address})</p>
          </div>

          <div style="margin-top: 4px; padding: 4px 12px; background: rgba(255,255,255,0.08); border-radius: 14px; font-size: 0.72rem; color: #FFEE55; font-weight: bold;">
            Double Tap to Execute
          </div>
        </div>

        <div style="width: 100%; border-top: 1px dashed #333; padding-top: 6px; text-align: center;">
          <span style="color: #64748B; font-size: 0.7rem;">Swipe Right/Left: Next/Prev Action • Long Press: Cancel</span>
        </div>

      </div>
    `;

    container.querySelector('.nav-action-card')?.addEventListener('click', executePlaceAction);
    return;
  }
}

export function selectNavCategory() {
  const cat = NAV_CATEGORIES[currentCatIdx];
  Haptic.trigger('success');
  Speech.speak(`Opening ${cat.title}.`);

  if (cat.id === 'search') {
    navViewMode = 'searchInput';
    renderNavigation();
    Speech.speak("Navigate to place. Speak or double tap to search destination.");
  } else if (cat.id === 'saved') {
    navViewMode = 'savedPlaces';
    selectedPlaceIdx = 0;
    renderNavigation();
    announceCurrentSavedPlace();
  }
}

export function simulateFoundPlace() {
  currentPlaceTarget = {
    name: 'Eurofarm Pharmacy',
    address: 'Bulevar Kliment Ohridski 12',
    phone: '+389 72 888 999',
    distance: '280m away'
  };
  Haptic.trigger('success');
  Speech.speak(`Found destination: ${currentPlaceTarget.name}, ${currentPlaceTarget.address}.`);
  openPlaceActionMenu();
}

export function openPlaceActionMenu() {
  navViewMode = 'placeActionMenu';
  currentActionIdx = 0;
  Haptic.trigger('success');
  renderNavigation();
  announceCurrentPlaceAction();
}

export function executePlaceAction() {
  const act = PLACE_ACTIONS[currentActionIdx];

  if (act.id === 'navigate') {
    startNavigationRoute();
  } else if (act.id === 'call') {
    import('./phone.js').then(m => m.startCall(currentPlaceTarget.name));
  } else if (act.id === 'toggle_save') {
    Haptic.trigger('success');
    Speech.speak(`Place ${currentPlaceTarget.name} updated in saved places.`);
    navViewMode = 'savedPlaces';
    renderNavigation();
  }
}

export function startNavigationRoute() {
  navViewMode = 'activeRouting';
  isNavigating = true;
  routeStep = 0;
  Haptic.trigger('success');
  Speech.speak(`GPS route started for ${currentPlaceTarget.name}. ${navigationSteps[0]}`);
  renderNavigation();
}

export function advanceNavStep() {
  routeStep++;
  if (routeStep >= navigationSteps.length) {
    Haptic.trigger('success');
    Speech.speak("You have arrived at your destination.");
    stopNavRoute();
    return;
  }
  Haptic.trigger('short');
  Speech.speak(navigationSteps[routeStep]);
  renderNavigation();
}

export function stopNavRoute() {
  isNavigating = false;
  routeStep = 0;
  Haptic.trigger('short');
  Speech.speak("GPS route ended. Returned to navigation menu.");
  navViewMode = 'categoryMenu';
  renderNavigation();
}

export function handleNavigationGesture(gesture) {
  const places = (state.db && state.db.savedPlaces) || defaultSavedPlaces;

  // STATE: Active Routing
  if (navViewMode === 'activeRouting') {
    if (gesture === 'doubleTap' || gesture === 'swipeRight') {
      advanceNavStep();
    } else if (gesture === 'longPress' || gesture === 'swipeDown') {
      stopNavRoute();
    }
    return;
  }

  // STATE: Category Menu
  if (navViewMode === 'categoryMenu') {
    if (gesture === 'swipeRight') {
      currentCatIdx = (currentCatIdx + 1) % NAV_CATEGORIES.length;
      Haptic.trigger('short');
      renderNavigation();
      Speech.speak(NAV_CATEGORIES[currentCatIdx].title);
    } else if (gesture === 'swipeLeft') {
      currentCatIdx = (currentCatIdx - 1 + NAV_CATEGORIES.length) % NAV_CATEGORIES.length;
      Haptic.trigger('short');
      renderNavigation();
      Speech.speak(NAV_CATEGORIES[currentCatIdx].title);
    } else if (gesture === 'doubleTap' || gesture === 'tap') {
      selectNavCategory();
    }
    return;
  }

  // STATE: Saved Places List
  if (navViewMode === 'savedPlaces') {
    if (gesture === 'swipeRight') {
      selectedPlaceIdx = (selectedPlaceIdx + 1) % places.length;
      Haptic.trigger('short');
      renderNavigation();
      announceCurrentSavedPlace();
    } else if (gesture === 'swipeLeft') {
      selectedPlaceIdx = (selectedPlaceIdx - 1 + places.length) % places.length;
      Haptic.trigger('short');
      renderNavigation();
      announceCurrentSavedPlace();
    } else if (gesture === 'doubleTap' || gesture === 'tap') {
      currentPlaceTarget = places[selectedPlaceIdx % places.length];
      openPlaceActionMenu();
    } else if (gesture === 'longPress') {
      navViewMode = 'categoryMenu';
      Haptic.trigger('short');
      Speech.speak("Returned to Navigation Menu.");
      renderNavigation();
    }
    return;
  }

  // STATE: Place Action Menu
  if (navViewMode === 'placeActionMenu') {
    if (gesture === 'swipeRight') {
      currentActionIdx = (currentActionIdx + 1) % PLACE_ACTIONS.length;
      Haptic.trigger('short');
      renderNavigation();
      announceCurrentPlaceAction();
    } else if (gesture === 'swipeLeft') {
      currentActionIdx = (currentActionIdx - 1 + PLACE_ACTIONS.length) % PLACE_ACTIONS.length;
      Haptic.trigger('short');
      renderNavigation();
      announceCurrentPlaceAction();
    } else if (gesture === 'doubleTap' || gesture === 'tap') {
      executePlaceAction();
    } else if (gesture === 'longPress') {
      navViewMode = 'savedPlaces';
      Haptic.trigger('short');
      Speech.speak("Cancelled. Returned to saved places.");
      renderNavigation();
    }
    return;
  }

  // STATE: Search Input
  if (navViewMode === 'searchInput') {
    if (gesture === 'doubleTap' || gesture === 'tap') {
      simulateFoundPlace();
    } else if (gesture === 'longPress') {
      navViewMode = 'categoryMenu';
      Haptic.trigger('short');
      Speech.speak("Returned to Navigation Menu.");
      renderNavigation();
    }
  }
}

export function announceCurrentSavedPlace() {
  const places = (state.db && state.db.savedPlaces) || defaultSavedPlaces;
  const place = places[selectedPlaceIdx % places.length];
  if (!place) return;
  Speech.speak(`${place.name}. Address: ${place.address}. Distance: ${place.distance}. Double tap for action menu.`);
}

export function announceCurrentPlaceAction() {
  const act = PLACE_ACTIONS[currentActionIdx];
  if (!act) return;
  Speech.speak(`${act.title} for ${currentPlaceTarget.name}. Double tap to execute.`);
}
