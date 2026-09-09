import { state, saveDb, logSystem } from '../core/state.js';
import { Speech } from '../core/speech.js';
import { Haptic } from '../core/haptics.js';
import { navigateTo } from '../core/router.js';

const NAV_CATEGORIES = [
  { id: 'search', title: 'NAVIGATE TO PLACE', subtitle: 'Enter or speak a destination', icon: 'fa-magnifying-glass-location', color: '#FFEE55' },
  { id: 'saved', title: 'SAVED PLACES', subtitle: 'Quick access saved destinations', icon: 'fa-map-pin', color: '#FFEE55' }
];

let currentCatIdx = 0;
let navViewMode = 'categoryMenu'; // 'categoryMenu', 'searchInput', 'savedPlaces', 'placeActionMenu', 'activeRouting'
let actionMenuSource = 'search'; // 'search' or 'saved'

export function getNavViewMode() {
  return navViewMode;
}

const morseAlphabet = {
  '.-': 'A', '-...': 'B', '-.-.': 'C', '-..': 'D', '.': 'E', '..-.': 'F',
  '--.': 'G', '....': 'H', '..': 'I', '.---': 'J', '-.-': 'K', '.-..': 'L',
  '--': 'M', '-.': 'N', '---': 'O', '.--.': 'P', '--.-': 'Q', '.-.': 'R',
  '...': 'S', '-': 'T', '..-': 'U', '...-': 'V', '.--': 'W', '-..-': 'X',
  '-.--': 'Y', '--..': 'Z', '.----': '1', '..---': '2', '...--': '3',
  '....-': '4', '.....': '5', '-....': '6', '--...': '7', '---..': '8',
  '----.': '9', '-----': '0'
};

let currentNavSearchText = '';
let currentNavMorseSymbols = '';
let navSearchInputMode = 'morse'; // 'morse' or 'stt'
let isNavSearchReady = false;
let navMorseLetterTimer = null;
let navTapDownTime = 0;
let isNavHoldingVoice = false;
let navVoiceRecogInstance = null;
let navVoiceInterimText = '';

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

export function getPlaceActions() {
  if (actionMenuSource === 'saved') {
    return [
      { id: 'navigate', title: 'NAVIGATE TO PLACE', subtitle: 'Start turn-by-turn walking guidance', icon: 'fa-location-arrow', color: '#FFEE55' },
      { id: 'call', title: 'CALL PLACE', subtitle: `Place voice call to ${currentPlaceTarget.name}`, icon: 'fa-phone', color: '#FFEE55' },
      { id: 'remove', title: 'REMOVE FROM SAVED DESTINATIONS', subtitle: 'Remove from saved destinations list', icon: 'fa-trash-can', color: '#EF4444' }
    ];
  }
  return [
    { id: 'navigate', title: 'NAVIGATE TO PLACE', subtitle: 'Start turn-by-turn walking guidance', icon: 'fa-location-arrow', color: '#FFEE55' },
    { id: 'call', title: 'CALL PLACE', subtitle: `Place voice call to ${currentPlaceTarget.name}`, icon: 'fa-phone', color: '#FFEE55' },
    { id: 'save', title: 'SAVE PLACE', subtitle: 'Save to saved destinations list', icon: 'fa-bookmark', color: '#FFEE55' }
  ];
}

const navigationSteps = [
  "In 25 meters, turn right onto Main Boulevard.",
  "Continue straight along the sidewalk for 150 meters.",
  "Approaching pedestrian crosswalk with tactile warning paving.",
  "Turn left. You have arrived at your destination."
];

export function setNavViewMode(mode) {
  navViewMode = mode;
  if (mode === 'searchInput') {
    currentNavSearchText = '';
    currentNavMorseSymbols = '';
    isNavSearchReady = false;
  }
}

export function renderNavigation(targetMode = null) {
  if (targetMode) navViewMode = targetMode;
  const container = document.getElementById('navCategoryMenu') || document.getElementById('navigationScreen');
  if (!container) return;

  const places = (state.db && state.db.savedPlaces) || defaultSavedPlaces;

  // ----------------------------------------------------
  // VIEW 1: ACTIVE GPS ROUTING VIEW
  // ----------------------------------------------------
  if (navViewMode === 'activeRouting') {
    const stepText = navigationSteps[routeStep] || navigationSteps[0];

    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 44px 14px 175px 14px; display: flex; flex-direction: column; justify-content: space-between; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; overflow: hidden;">
        
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

    const dotsHtml = NAV_CATEGORIES.map((c, idx) => {
      const isActive = idx === currentCatIdx;
      return `
        <span style="
          width: ${isActive ? '22px' : '7px'};
          height: 7px;
          background: ${isActive ? cat.color : '#334155'};
          border-radius: ${isActive ? '4px' : '50%'};
          transition: all 0.25s ease;
          display: inline-block;
        "></span>
      `;
    }).join('');

    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 44px 14px 175px 14px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; user-select: none; overflow: hidden;">
        
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
          <span style="color: #FFEE55; font-size: 0.82rem; font-weight: 800; letter-spacing: 1px;">GPS NAVIGATION</span>
          <span style="color: #FFEE55; font-size: 0.85rem; font-weight: bold; background: #181818; padding: 2px 8px; border-radius: 12px; border: 1px solid rgba(255, 238, 85, 0.4);">
            [ ${currentCatIdx + 1} / ${NAV_CATEGORIES.length} ]
          </span>
        </div>

        <!-- Category Hero Card -->
        <div id="cardFocusNavCat" class="nav-cat-card" style="width: 100%; border: 2.5px solid ${cat.color}; border-radius: 24px; padding: 28px 20px; background: linear-gradient(150deg, rgba(20, 20, 26, 0.96) 0%, rgba(6, 6, 8, 0.98) 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; text-align: center; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.9), 0 0 20px rgba(255, 204, 0, 0.08); margin: auto 0; box-sizing: border-box; cursor: pointer;">
          
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

    let _navCatClickCount = 0;
    let _navCatClickTimer = null;
    document.getElementById('cardFocusNavCat')?.addEventListener('click', (e) => {
      e.stopPropagation();
      _navCatClickCount++;
      if (_navCatClickCount === 1) {
        _navCatClickTimer = setTimeout(() => {
          _navCatClickCount = 0;
          Speech.speak(`${NAV_CATEGORIES[currentCatIdx].title}. ${NAV_CATEGORIES[currentCatIdx].subtitle}. Double tap to open.`);
        }, 350);
      } else if (_navCatClickCount >= 2) {
        clearTimeout(_navCatClickTimer);
        _navCatClickCount = 0;
        selectNavCategory();
      }
    });
    return;
  }

  // ----------------------------------------------------
  // VIEW 3: NAVIGATE TO PLACE (SEARCH / MORSE & STT ENTRY)
  // ----------------------------------------------------
  if (navViewMode === 'searchInput') {
    const formattedQuery = currentNavSearchText ? currentNavSearchText : (isNavHoldingVoice ? '● Listening to your voice...' : '_ _ _ _');
    const morseIndicator = currentNavMorseSymbols ? `<div style="font-family: monospace; font-size: 0.95rem; color: #00E5FF; letter-spacing: 3px; margin-top: 4px;">Morse Buffer: [ ${currentNavMorseSymbols} ]</div>` : '';

    container.innerHTML = `
      <div id="navSearchTouchSurface" style="width: 100%; height: 100%; box-sizing: border-box; padding: 44px 14px 175px 14px; display: flex; flex-direction: column; justify-content: flex-start; gap: 14px; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; user-select: none; touch-action: none; cursor: pointer; overflow: hidden;">
        
        <!-- Header Status Bar -->
        <div style="width: 100%; display: flex; justify-content: flex-start; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 6px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="color: #FFEE55; font-size: 0.82rem; font-weight: 800; letter-spacing: 1px;">PLACE FINDER</span>
          </div>
        </div>

        <!-- Live Destination Draft Box -->
        <div style="width: 100%; background: linear-gradient(150deg, rgba(20, 20, 26, 0.96) 0%, rgba(6, 6, 8, 0.98) 100%); border: 2.5px solid ${isNavSearchReady ? '#10B981' : (isNavHoldingVoice ? '#00E5FF' : '#FFEE55')}; border-radius: 20px; padding: 18px 16px; text-align: center; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.9), 0 0 20px rgba(255, 238, 85, 0.08); box-sizing: border-box;">
          <div style="font-size: 0.68rem; color: #94A3B8; font-weight: bold; margin-bottom: 2px; text-align: left;">DESTINATION QUERY:</div>
          <div id="navDraftQueryText" style="font-size: 1.35rem; color: ${isNavHoldingVoice ? '#00E5FF' : '#FFEE55'}; font-weight: 900; letter-spacing: 1px; min-height: 28px; word-break: break-word;">
            ${formattedQuery}
          </div>
          ${morseIndicator}
        </div>

        <!-- Upper Center Area: Dedicated Morse Touch Pad -->
        <div style="width: 100%; flex: 1; min-height: 250px; margin: 4px 0 0 0; border: 2px dashed #FFEE55; border-radius: 20px; background: rgba(255, 255, 255, 0.02); display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: inset 0 0 20px rgba(0,0,0,0.8); box-sizing: border-box; pointer-events: none;">
          <div style="width: 80px; height: 80px; border-radius: 50%; border: 2.5px solid #FFEE55; display: flex; align-items: center; justify-content: center; background: rgba(255, 238, 85, 0.1); box-shadow: 0 0 25px rgba(255, 238, 85, 0.2);">
            <i class="fa-solid fa-fingerprint" style="color: #FFEE55; font-size: 2.5rem;"></i>
          </div>
        </div>

      </div>
    `;

    bindNavMorseTapListeners();
    return;
  }

  // ----------------------------------------------------
  // VIEW 4: SAVED PLACES LIST (CAROUSEL VIEW)
  // ----------------------------------------------------
  if (navViewMode === 'savedPlaces') {
    const currentPlace = places[selectedPlaceIdx % places.length] || defaultSavedPlaces[0];

    const dotsHtml = places.map((p, idx) => {
      const isActive = idx === (selectedPlaceIdx % places.length);
      return `
        <span style="
          width: ${isActive ? '24px' : '7px'};
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
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 44px 14px 175px 14px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; user-select: none; overflow: hidden;">
        
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
          <span style="color: #FFEE55; font-size: 0.82rem; font-weight: 800; letter-spacing: 0.5px;">SAVED DESTINATIONS</span>
          <span style="color: #FFEE55; font-size: 0.85rem; font-weight: bold; background: #181818; padding: 2px 10px; border-radius: 12px; border: 1px solid rgba(255, 238, 85, 0.4);">
            [ ${(selectedPlaceIdx % places.length) + 1} / ${places.length} ]
          </span>
        </div>

        <!-- Single-Focus Place Card -->
        <div class="saved-place-card" style="width: 100%; border: 2.5px solid #FFEE55; border-radius: 24px; padding: 26px 20px; background: linear-gradient(150deg, rgba(20, 20, 26, 0.96) 0%, rgba(6, 6, 8, 0.98) 100%); display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; gap: 14px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.9), 0 0 20px rgba(255, 238, 85, 0.08); cursor: pointer; margin: auto 0; box-sizing: border-box;">
          <div style="width: 100%; display: flex; justify-content: space-between; align-items: center;">
            <span style="background: #FFEE55; color: #000; font-size: 0.68rem; font-weight: 900; padding: 3px 10px; border-radius: 8px; letter-spacing: 0.5px;">
              ★ SAVED DESTINATION
            </span>
            <span style="color: #FFEE55; font-size: 0.82rem; font-weight: 800; font-family: monospace;">
              ${currentPlace.distance}
            </span>
          </div>

          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; margin: 12px 0;">
            <div style="width: 80px; height: 80px; border-radius: 50%; background: rgba(255, 255, 255, 0.03); border: 2.5px solid #FFEE55; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 25px rgba(0,0,0,0.8); box-sizing: border-box;">
              <i class="fa-solid fa-map-pin" style="color: #FFEE55; font-size: 2.2rem; display: flex; align-items: center; justify-content: center; line-height: 1; width: 100%; height: 100%; margin: 0;"></i>
            </div>
            <div>
              <h2 style="margin: 0; font-size: 1.5rem; color: #FFEE55; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase;">${currentPlace.name}</h2>
              <p style="margin: 6px 0 0 0; font-size: 0.85rem; color: #94A3B8; line-height: 1.3;">${currentPlace.address}</p>
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

    let _savePlaceClickCount = 0;
    let _savePlaceClickTimer = null;
    container.querySelector('.saved-place-card')?.addEventListener('click', () => {
      _savePlaceClickCount++;
      if (_savePlaceClickCount === 1) {
        _savePlaceClickTimer = setTimeout(() => {
          _savePlaceClickCount = 0;
          announceCurrentSavedPlace();
        }, 350);
      } else if (_savePlaceClickCount >= 2) {
        clearTimeout(_savePlaceClickTimer);
        _savePlaceClickCount = 0;
        currentPlaceTarget = currentPlace;
        openPlaceActionMenu('saved');
      }
    });
    return;
  }

  // ----------------------------------------------------
  // VIEW 5: PLACE ACTION MENU (NAVIGATE, CALL, SAVE/REMOVE)
  // ----------------------------------------------------
  if (navViewMode === 'placeActionMenu') {
    const actions = getPlaceActions();
    const act = actions[currentActionIdx % actions.length];

    const dotsHtml = actions.map((a, idx) => {
      const isActive = idx === (currentActionIdx % actions.length);
      return `
        <span style="
          width: ${isActive ? '24px' : '7px'};
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
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 44px 14px 175px 14px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; user-select: none; overflow: hidden;">
        
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
          <span style="color: ${act.color}; font-size: 0.82rem; font-weight: bold; text-transform: uppercase;">OPTIONS FOR ${currentPlaceTarget.name}</span>
          <span style="color: #FFEE55; font-size: 0.85rem; font-weight: bold; background: #181818; padding: 2px 10px; border-radius: 12px; border: 1px solid rgba(255, 238, 85, 0.4);">
            [ ${(currentActionIdx % actions.length) + 1} / ${actions.length} ]
          </span>
        </div>

        <!-- Single-Focus Action Card -->
        <div class="nav-action-card" style="width: 100%; border: 2.5px solid ${act.color}; border-radius: 24px; padding: 28px 20px; background: linear-gradient(150deg, rgba(20, 20, 26, 0.96) 0%, rgba(6, 6, 8, 0.98) 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; text-align: center; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.9), 0 0 20px rgba(255, 204, 0, 0.08); cursor: pointer; margin: auto 0; box-sizing: border-box;">
          <div style="width: 84px; height: 84px; border-radius: 50%; border: 2.5px solid ${act.color}; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.03); box-shadow: 0 0 25px rgba(0,0,0,0.8); box-sizing: border-box;">
            <i class="fa-solid ${act.icon}" style="font-size: 2.6rem; color: ${act.color}; display: flex; align-items: center; justify-content: center; line-height: 1; width: 100%; height: 100%; margin: 0;"></i>
          </div>

          <div>
            <h2 style="margin: 0; font-size: 1.55rem; font-weight: 900; color: ${act.color}; letter-spacing: 1px; text-transform: uppercase;">${act.title}</h2>
            <p style="margin: 6px 0 0 0; font-size: 0.85rem; color: #94A3B8; line-height: 1.3;">${act.subtitle}</p>
          </div>

          <div style="height: 4px;"></div>
        </div>

        <!-- Indicator Dots -->
        <div style="width: 100%; display: flex; flex-direction: column; align-items: center; gap: 6px;">
          <div style="display: flex; gap: 4px; align-items: center;">
            ${dotsHtml}
          </div>
        </div>

      </div>
    `;

    let _navActionClickCount = 0;
    let _navActionClickTimer = null;
    container.querySelector('.nav-action-card')?.addEventListener('click', () => {
      _navActionClickCount++;
      if (_navActionClickCount === 1) {
        _navActionClickTimer = setTimeout(() => {
          _navActionClickCount = 0;
          announceCurrentPlaceAction();
        }, 350);
      } else if (_navActionClickCount >= 2) {
        clearTimeout(_navActionClickTimer);
        _navActionClickCount = 0;
        executePlaceAction();
      }
    });
    return;
  }
}

export function selectNavCategory() {
  const cat = NAV_CATEGORIES[currentCatIdx];
  Haptic.trigger('success');

  if (cat.id === 'search') {
    navViewMode = 'searchInput';
    currentNavSearchText = '';
    currentNavMorseSymbols = '';
    isNavSearchReady = false;
    renderNavigation();
    Speech.speak("Opening destination finder. Hold bottom navigation zone to speak destination, or tap Morse.");
  } else if (cat.id === 'saved') {
    navViewMode = 'savedPlaces';
    selectedPlaceIdx = 0;
    renderNavigation();
    const saved = (state.db && state.db.savedPlaces) || [];
    const p = saved[0];
    Speech.speak(`Opening saved destinations. Saved place 1 of ${saved.length}: ${p ? p.name : 'Home'}. ${p ? p.address : ''}. Double tap for place options.`);
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
  Speech.speak(`Found destination: ${currentPlaceTarget.name}, ${currentPlaceTarget.address}. Options: Navigate to place, Call place, or Save place.`);
  openPlaceActionMenu('search');
}

export function openPlaceActionMenu(source = 'search') {
  actionMenuSource = source;
  navViewMode = 'placeActionMenu';
  currentActionIdx = 0;
  Haptic.trigger('success');
  renderNavigation();
  announceCurrentPlaceAction();
}

export function executePlaceAction() {
  const actions = getPlaceActions();
  const act = actions[currentActionIdx % actions.length];

  if (act.id === 'navigate') {
    startNavigationRoute();
  } else if (act.id === 'call') {
    import('./phone.js').then(m => m.startCall(currentPlaceTarget.name));
  } else if (act.id === 'save') {
    const places = (state.db && state.db.savedPlaces) || defaultSavedPlaces;
    if (!places.some(p => p.name === currentPlaceTarget.name)) {
      places.push({
        id: String(Date.now()),
        name: currentPlaceTarget.name,
        address: currentPlaceTarget.address,
        phone: currentPlaceTarget.phone || '+389 72 888 999',
        distance: currentPlaceTarget.distance || '280m away'
      });
      if (state.db) {
        state.db.savedPlaces = places;
        if (typeof saveDb === 'function') saveDb();
      }
    }
    Haptic.trigger('success');
    Speech.speak(`Saved ${currentPlaceTarget.name} to saved destinations.`);
    navViewMode = 'savedPlaces';
    selectedPlaceIdx = places.length - 1;
    renderNavigation();
  } else if (act.id === 'remove') {
    const places = (state.db && state.db.savedPlaces) || defaultSavedPlaces;
    const idx = places.findIndex(p => p.name === currentPlaceTarget.name);
    if (idx !== -1) {
      places.splice(idx, 1);
      if (state.db) {
        state.db.savedPlaces = places;
        if (typeof saveDb === 'function') saveDb();
      }
    }
    Haptic.trigger('warning');
    Speech.speak(`Removed ${currentPlaceTarget.name} from saved destinations.`);
    selectedPlaceIdx = 0;
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
  Haptic.trigger('warning');
  Speech.speak(`Navigation route stopped. Returned to options for ${currentPlaceTarget.name}.`);
  navViewMode = 'placeActionMenu';
  renderNavigation();
  announceCurrentPlaceAction();
}

export function handleNavigationGesture(gesture) {
  const places = (state.db && state.db.savedPlaces) || defaultSavedPlaces;
  const actions = getPlaceActions();

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
      Speech.speak(`${NAV_CATEGORIES[currentCatIdx].title}. ${NAV_CATEGORIES[currentCatIdx].subtitle}. Double tap to open.`);
    } else if (gesture === 'swipeLeft') {
      currentCatIdx = (currentCatIdx - 1 + NAV_CATEGORIES.length) % NAV_CATEGORIES.length;
      Haptic.trigger('short');
      renderNavigation();
      Speech.speak(`${NAV_CATEGORIES[currentCatIdx].title}. ${NAV_CATEGORIES[currentCatIdx].subtitle}. Double tap to open.`);
    } else if (gesture === 'doubleTap') {
      selectNavCategory();
    } else if (gesture === 'tap') {
      Haptic.playSound('short');
      Speech.speak(`${NAV_CATEGORIES[currentCatIdx].title}. ${NAV_CATEGORIES[currentCatIdx].subtitle}. Double tap to open.`);
    } else if (gesture === 'longPress' || gesture === 'swipeDown') {
      Haptic.trigger('short');
      navigateTo('mainMenuScreen');
    }
    return;
  }

  // STATE: Saved Places List
  if (navViewMode === 'savedPlaces') {
    if (gesture === 'swipeRight') {
      if (selectedPlaceIdx >= places.length - 1) {
        Haptic.trigger('warning');
        Speech.speak("Last saved place.");
        return;
      }
      selectedPlaceIdx++;
      Haptic.trigger('short');
      renderNavigation();
      announceCurrentSavedPlace();
    } else if (gesture === 'swipeLeft') {
      if (selectedPlaceIdx <= 0) {
        Haptic.trigger('warning');
        Speech.speak("First saved place.");
        return;
      }
      selectedPlaceIdx--;
      Haptic.trigger('short');
      renderNavigation();
      announceCurrentSavedPlace();
    } else if (gesture === 'doubleTap') {
      currentPlaceTarget = places[selectedPlaceIdx];
      openPlaceActionMenu('saved');
    } else if (gesture === 'tap') {
      Haptic.playSound('short');
      announceCurrentSavedPlace();
    } else if (gesture === 'longPress' || gesture === 'swipeDown') {
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
      currentActionIdx = (currentActionIdx + 1) % actions.length;
      Haptic.trigger('short');
      renderNavigation();
      announceCurrentPlaceAction();
    } else if (gesture === 'swipeLeft') {
      currentActionIdx = (currentActionIdx - 1 + actions.length) % actions.length;
      Haptic.trigger('short');
      renderNavigation();
      announceCurrentPlaceAction();
    } else if (gesture === 'doubleTap') {
      executePlaceAction();
    } else if (gesture === 'tap') {
      Haptic.playSound('short');
      announceCurrentPlaceAction();
    } else if (gesture === 'longPress' || gesture === 'swipeDown') {
      navViewMode = actionMenuSource === 'saved' ? 'savedPlaces' : 'categoryMenu';
      Haptic.trigger('short');
      Speech.speak(actionMenuSource === 'saved' ? "Cancelled. Returned to saved destinations." : "Cancelled. Returned to navigation menu.");
      renderNavigation();
    }
    return;
  }

  // STATE: Search Input (Morse & STT Dual Input)
  if (navViewMode === 'searchInput') {
    if (gesture === 'tap') {
      navSearchInputMode = 'morse';
      currentNavMorseSymbols += '.';
      const recognized = morseAlphabet[currentNavMorseSymbols] || '';
      Haptic.trigger('short');
      Speech.speak(`Dot.${recognized ? ' Letter ' + recognized : ''}`);
      scheduleNavMorseLetterCommit();
      renderNavigation();
    } else if (gesture === 'holdMorse' || gesture === 'longPress') {
      navSearchInputMode = 'morse';
      currentNavMorseSymbols += '-';
      const recognized = morseAlphabet[currentNavMorseSymbols] || '';
      Haptic.trigger('long');
      Speech.speak(`Dash.${recognized ? ' Letter ' + recognized : ''}`);
      scheduleNavMorseLetterCommit();
      renderNavigation();
    } else if (gesture === 'swipeLeft') {
      if (navMorseLetterTimer) clearTimeout(navMorseLetterTimer);
      if (currentNavMorseSymbols) {
        currentNavMorseSymbols = '';
      } else if (currentNavSearchText && currentNavSearchText.length > 0) {
        currentNavSearchText = currentNavSearchText.slice(0, -1);
      }
      isNavSearchReady = false;
      Haptic.trigger('warning');
      const tts = currentNavSearchText ? `Deleted letter. Destination is: ${currentNavSearchText}` : "Destination cleared.";
      Speech.speak(tts);
      renderNavigation();
    } else if (gesture === 'swipeUp') {
      if (navMorseLetterTimer) clearTimeout(navMorseLetterTimer);
      if (currentNavMorseSymbols) {
        const char = morseAlphabet[currentNavMorseSymbols] || '?';
        currentNavSearchText += char;
        currentNavMorseSymbols = '';
      }
      if (!currentNavSearchText) {
        currentNavSearchText = 'Eurofarm Pharmacy';
      }
      isNavSearchReady = true;
      Haptic.trigger('success');
      Speech.speak(`Destination confirmed: ${currentNavSearchText}. Swipe right for options.`);
      renderNavigation();
    } else if (gesture === 'swipeRight' || gesture === 'doubleTap') {
      if (navMorseLetterTimer) {
        clearTimeout(navMorseLetterTimer);
        navMorseLetterTimer = null;
      }
      if (gesture === 'doubleTap') {
        currentNavMorseSymbols = '';
      } else if (currentNavMorseSymbols) {
        const char = morseAlphabet[currentNavMorseSymbols] || '';
        if (char) currentNavSearchText += char;
        currentNavMorseSymbols = '';
      }
      const searchTargetName = currentNavSearchText || 'Eurofarm Pharmacy';
      currentPlaceTarget = {
        id: 'search_result',
        name: searchTargetName,
        address: 'Bulevar Kliment Ohridski 12',
        phone: '+389 72 888 999',
        distance: '280m away'
      };
      actionMenuSource = 'search';
      navViewMode = 'placeActionMenu';
      currentActionIdx = 0;
      currentNavSearchText = '';
      currentNavMorseSymbols = '';
      isNavSearchReady = false;
      Haptic.trigger('success');
      Speech.speak(`Found destination: ${currentPlaceTarget.name}, ${currentPlaceTarget.address}. ${currentPlaceTarget.distance}. Action 1 of 3: Navigate to place. Double tap to start walking route.`);
      renderNavigation();
    } else if (gesture === 'swipeDown') {
      navViewMode = 'categoryMenu';
      currentNavSearchText = '';
      currentNavMorseSymbols = '';
      isNavSearchReady = false;
      Haptic.trigger('short');
      Speech.speak("Returned to Navigation Menu.");
      renderNavigation();
    }
    return;
  }
}

let navStartX = 0;
let navStartY = 0;
let navTapCount = 0;
let navTapTimeout = null;

function bindNavMorseTapListeners() {
  const surf = document.getElementById('navSearchTouchSurface');
  if (!surf) return;

  surf.onpointerdown = (e) => {
    e.stopPropagation();
    try { surf.setPointerCapture(e.pointerId); } catch (_) {}
    navTapDownTime = Date.now();
    navStartX = e.clientX;
    navStartY = e.clientY;
  };

  surf.onpointerup = (e) => {
    e.stopPropagation();
    try { surf.releasePointerCapture(e.pointerId); } catch (_) {}
    const elapsed = navTapDownTime ? (Date.now() - navTapDownTime) : 100;
    navTapDownTime = 0;
    const deltaX = e.clientX - navStartX;
    const deltaY = e.clientY - navStartY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX > 25 && absX > absY && elapsed < 800) {
      if (navTapTimeout) { clearTimeout(navTapTimeout); navTapCount = 0; }
      handleNavigationGesture(deltaX > 0 ? 'swipeRight' : 'swipeLeft');
      return;
    }
    if (absY > 25 && absY >= absX && elapsed < 800) {
      if (navTapTimeout) { clearTimeout(navTapTimeout); navTapCount = 0; }
      handleNavigationGesture(deltaY > 0 ? 'swipeDown' : 'swipeUp');
      return;
    }

    if (elapsed >= 260) {
      if (navTapTimeout) { clearTimeout(navTapTimeout); navTapCount = 0; }
      handleNavigationGesture('holdMorse');
    } else {
      navTapCount++;
      if (navTapCount === 1) {
        navTapTimeout = setTimeout(() => {
          navTapCount = 0;
          handleNavigationGesture('tap');
        }, 280);
      } else if (navTapCount >= 2) {
        clearTimeout(navTapTimeout);
        navTapCount = 0;
        handleNavigationGesture('doubleTap');
      }
    }
  };
}

export function startNavVoiceRecording() {
  isNavHoldingVoice = true;
  navVoiceInterimText = '';
  Haptic.trigger('short');

  if (window.SpeechRecognition || window.webkitSpeechRecognition) {
    try {
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      navVoiceRecogInstance = new SpeechRec();
      navVoiceRecogInstance.continuous = true;
      navVoiceRecogInstance.interimResults = true;
      navVoiceRecogInstance.lang = 'en-US';
      navVoiceRecogInstance.onresult = (ev) => {
        let transcript = '';
        for (let i = 0; i < ev.results.length; i++) {
          transcript += ev.results[i][0].transcript;
        }
        if (transcript) {
          navVoiceInterimText = transcript.trim();
          const draft = document.getElementById('navDraftQueryText');
          if (draft) draft.innerText = `"${navVoiceInterimText}"`;
        }
      };
      navVoiceRecogInstance.start();
    } catch (err) {}
  }
  renderNavigation();
}

export function stopNavVoiceRecording() {
  if (!isNavHoldingVoice) return;
  isNavHoldingVoice = false;

  if (navVoiceRecogInstance) {
    try { navVoiceRecogInstance.stop(); } catch(err) {}
    navVoiceRecogInstance = null;
  }

  const targetText = navVoiceInterimText || currentNavSearchText || 'Eurofarm Pharmacy';
  navSearchInputMode = 'stt';
  currentNavSearchText = targetText;
  currentNavMorseSymbols = '';
  isNavSearchReady = true;
  navVoiceInterimText = '';

  Haptic.trigger('success');
  Speech.speak(`Destination set to ${targetText}. Swipe right for place options or swipe left to clear.`);
  renderNavigation();
}

function scheduleNavMorseLetterCommit() {
  if (navMorseLetterTimer) clearTimeout(navMorseLetterTimer);
  const speed = (state.morseSpeed || (state.db && state.db.settings && state.db.settings.morseSpeed) || 'medium').toLowerCase();
  const commitDelay = speed === 'slow' ? 1400 : (speed === 'fast' ? 650 : 1000);
  navMorseLetterTimer = setTimeout(() => {
    if (currentNavMorseSymbols) {
      const char = morseAlphabet[currentNavMorseSymbols] || '?';
      currentNavSearchText += char;
      currentNavMorseSymbols = '';
      isNavSearchReady = false;
      Haptic.trigger('success');
      Speech.speak(`Letter ${char}`);
      renderNavigation();
    }
  }, commitDelay);
}

export function startNavVoiceDictation() {
  navSearchInputMode = 'stt';
  currentNavSearchText = 'Eurofarm Pharmacy';
  currentNavMorseSymbols = '';
  isNavSearchReady = true;
  Haptic.trigger('success');
  Speech.speak('Voice search recorded: Eurofarm Pharmacy. Swipe right for options.');
  renderNavigation();
}

export function announceCurrentSavedPlace() {
  const places = (state.db && state.db.savedPlaces) || defaultSavedPlaces;
  const place = places[selectedPlaceIdx % places.length];
  if (!place) return;
  Speech.speak(`${place.name}. Address: ${place.address}. Distance: ${place.distance}. Double tap for action menu.`);
}

export function announceCurrentPlaceAction() {
  const actions = getPlaceActions();
  const act = actions[currentActionIdx % actions.length];
  if (!act) return;
  Speech.speak(`Action ${(currentActionIdx % actions.length) + 1} of ${actions.length}: ${act.title}. ${act.subtitle}. Double tap to execute.`);
}

