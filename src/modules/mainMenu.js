import { state, logSystem } from '../core/state.js';
import { Speech } from '../core/speech.js';
import { Haptic } from '../core/haptics.js';
import { navigateTo } from '../core/router.js';
import { recognizeMainMenuLetter } from '../core/recognition.js';

export const categories = [
  { id: 'messagesScreen', title: 'MESSAGES', letter: 'M', subtitle: 'View unread SMS & conversations', icon: 'fa-comment-sms', color: '#FFCC00', haptic: 'short' },
  { id: 'phoneCategoryMenu', title: 'PHONE & CONTACTS', letter: 'P', subtitle: 'Call favorites & dial numbers', icon: 'fa-phone', color: '#FFCC00', haptic: 'short' },
  { id: 'cameraCategoryMenu', title: 'CAMERA & AI OCR', letter: 'C', subtitle: 'Read printed text & describe scenes', icon: 'fa-camera', color: '#FFCC00', haptic: 'short' },
  { id: 'navCategoryMenu', title: 'GPS NAVIGATION', letter: 'N', subtitle: 'Turn-by-turn walking guidance', icon: 'fa-location-dot', color: '#FFCC00', haptic: 'short' },
  { id: 'settingsCategoryMenu', title: 'SETTINGS', letter: 'S', subtitle: 'Reading mode, haptics & privacy', icon: 'fa-gear', color: '#FFCC00', haptic: 'short' }
];

let currentCategoryIndex = 0;
let isMenuDrawing = false;
let menuStrokePoints = [];
let menuRecognitionTimeout = null;

export function getMainMenuIndex() {
  return currentCategoryIndex;
}

export function setMainMenuIndex(idx) {
  if (idx >= 0 && idx < categories.length) {
    currentCategoryIndex = idx;
  }
}

export function renderMainMenu() {
  const container = document.getElementById('mainMenuScreen');
  if (!container) return;

  const current = categories[currentCategoryIndex];

  // Carousel indicator dots HTML
  const dotsHtml = categories.map((cat, idx) => {
    const isActive = idx === currentCategoryIndex;
    return `
      <span style="
        width: ${isActive ? '24px' : '8px'};
        height: 8px;
        background: ${isActive ? '#FFCC00' : '#334155'};
        border-radius: ${isActive ? '4px' : '50%'};
        transition: all 0.25s ease;
        display: inline-block;
      "></span>
    `;
  }).join('');

  container.innerHTML = `
    <div style="position: relative; width: 100%; height: 100%; box-sizing: border-box; padding: 42px 14px 175px 14px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; user-select: none; overflow: hidden;">
      
      <!-- Expansive Tactile Slate Surface -->
      <div style="width: 100%; height: 100%; border: 2.5px solid #FFCC00; border-radius: 20px; position: relative; background: #05070B; display: flex; flex-direction: column; overflow: hidden; box-shadow: inset 0 0 35px rgba(255, 204, 0, 0.05), 0 0 30px rgba(0, 0, 0, 0.9); box-sizing: border-box;">
        
        <!-- Subtle Tactile Watermark (Behind Canvas) -->
        <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; opacity: 0.22; gap: 12px;">
          <i class="fa-solid fa-signature" style="font-size: 4.5rem; color: #FFCC00;"></i>
          <span style="font-size: 0.9rem; letter-spacing: 2.5px; color: #FFFFFF; font-weight: 800; text-transform: uppercase;">
            Draw M • P • C • N • S
          </span>
        </div>

        <!-- Expansive Responsive Ink Canvas -->
        <canvas id="handwritingMenuCanvas" style="position: absolute; inset: 0; width: 100%; height: 100%; cursor: crosshair; touch-action: none; z-index: 2; background: transparent;"></canvas>
      </div>

    </div>
  `;

  initMenuCanvas();
}

function initMenuCanvas() {
  const canvas = document.getElementById('handwritingMenuCanvas');
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = rect.width || (canvas.parentElement ? canvas.parentElement.clientWidth : 320);
  const h = rect.height || (canvas.parentElement ? canvas.parentElement.clientHeight : 400);

  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';

  const ctx = canvas.getContext('2d');
  if (ctx.resetTransform) ctx.resetTransform();
  else ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  function getPoint(e) {
    const r = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    return {
      x: clientX - r.left,
      y: clientY - r.top
    };
  }

  function start(x, y) {
    isMenuDrawing = true;
    if (menuRecognitionTimeout) {
      clearTimeout(menuRecognitionTimeout);
      menuRecognitionTimeout = null;
    } else {
      menuStrokePoints = [];
      ctx.clearRect(0, 0, w, h);
    }
    menuStrokePoints.push({ x, y });
    ctx.strokeStyle = '#FFEE55';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#FFEE55';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(x, y) {
    if (!isMenuDrawing) return;
    menuStrokePoints.push({ x, y });
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function end() {
    if (!isMenuDrawing) return;
    isMenuDrawing = false;
    if (menuStrokePoints.length < 4) {
      ctx.clearRect(0, 0, w, h);
      menuStrokePoints = [];
      return;
    }

    if (menuRecognitionTimeout) clearTimeout(menuRecognitionTimeout);
    menuRecognitionTimeout = setTimeout(() => {
      const ptsToProcess = [...menuStrokePoints];
      menuStrokePoints = [];
      menuRecognitionTimeout = null;
      processMenuLetterStroke(ptsToProcess, ctx, w, h);
    }, 450);
  }

  let canvasLongPressTimer = null;
  let canvasStartPos = { x: 0, y: 0 };

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (canvasLongPressTimer) clearTimeout(canvasLongPressTimer);
    handleMainMenuGesture('longPress');
  });

  canvas.onpointerdown = (e) => {
    if (e.button === 2) {
      e.preventDefault();
      e.stopPropagation();
      handleMainMenuGesture('longPress');
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    const p = getPoint(e);
    canvasStartPos = { x: p.x, y: p.y };

    if (canvasLongPressTimer) clearTimeout(canvasLongPressTimer);
    canvasLongPressTimer = setTimeout(() => {
      isMenuDrawing = false;
      ctx.clearRect(0, 0, w, h);
      handleMainMenuGesture('longPress');
    }, 500);

    start(p.x, p.y);
  };

  canvas.onpointermove = (e) => {
    if (!isMenuDrawing) return;
    e.preventDefault();
    e.stopPropagation();
    const p = getPoint(e);
    if (Math.hypot(p.x - canvasStartPos.x, p.y - canvasStartPos.y) > 15) {
      if (canvasLongPressTimer) {
        clearTimeout(canvasLongPressTimer);
        canvasLongPressTimer = null;
      }
    }
    move(p.x, p.y);
  };

  canvas.onpointerup = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (canvasLongPressTimer) clearTimeout(canvasLongPressTimer);
    try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
    end();
  };

  canvas.onpointercancel = (e) => {
    if (canvasLongPressTimer) clearTimeout(canvasLongPressTimer);
    try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
    end();
  };
}

function processMenuLetterStroke(pts, ctx, w, h) {
  const recognizedLetter = recognizeMainMenuLetter(pts);

  const categoryMap = {
    'M': { name: 'Messages', target: 'messagesScreen' },
    'P': { name: 'Phone and Contacts', target: 'phoneCategoryMenu' },
    'C': { name: 'Camera and AI Vision', target: 'cameraCategoryMenu' },
    'N': { name: 'GPS Navigation', target: 'navCategoryMenu' },
    'S': { name: 'Settings', target: 'settingsCategoryMenu' }
  };

  if (recognizedLetter && categoryMap[recognizedLetter]) {
    const target = categoryMap[recognizedLetter];
    Haptic.trigger('success');
    Speech.speak(`Letter ${recognizedLetter} recognized. Opening ${target.name}.`);
    setTimeout(() => {
      ctx.clearRect(0, 0, w, h);
      navigateTo(target.target);
    }, 350);
  } else {
    Haptic.trigger('error');
    Speech.speak("Letter not recognized. Draw M for Messages, P for Phone, C for Camera, N for Navigation, or S for Settings.");
    setTimeout(() => {
      ctx.clearRect(0, 0, w, h);
    }, 650);
  }
}

export function handleMainMenuGesture(gesture, isInNavZone = true, x = null, y = null) {
  if (!isInNavZone) {
    if (gesture === 'swipeRight' || gesture === 'swipeLeft' || gesture === 'doubleTap' || gesture === 'tap') {
      Haptic.trigger('warning');
      const navZone = document.getElementById('navigationArea') || document.getElementById('fixedNavigationArea');
      const phoneEl = document.getElementById('phoneScreen');
      let spatialMsg = "Tap lower down into the navigation zone.";
      if (navZone && typeof y === 'number') {
        const navRect = navZone.getBoundingClientRect();
        const phoneRect = phoneEl ? phoneEl.getBoundingClientRect() : { top: 0, height: window.innerHeight };
        const distAbove = navRect.top - y;
        if (distAbove > phoneRect.height * 0.45) {
          spatialMsg = "Too high. Tap much lower, near the bottom of the screen.";
        } else if (distAbove > phoneRect.height * 0.18) {
          spatialMsg = "Tap lower down toward the navigation bar.";
        } else if (distAbove > 0) {
          spatialMsg = "Almost there! Tap just slightly lower into the navigation bar.";
        } else if (y > navRect.bottom) {
          spatialMsg = "Tap slightly higher.";
        }
      }
      Speech.speak(spatialMsg);
      return;
    }
    return;
  }

  if (gesture === 'swipeRight') {
    if (!isInNavZone) {
      Haptic.trigger('warning');
      Speech.speak("Swipe in the bottom navigation bar to browse categories.");
      return;
    }
    currentCategoryIndex = (currentCategoryIndex + 1) % categories.length;
    const current = categories[currentCategoryIndex];
    Haptic.trigger(current.haptic || 'short');
    renderMainMenu();
    announceCurrentCategory();
  }
  else if (gesture === 'swipeLeft') {
    if (!isInNavZone) {
      Haptic.trigger('warning');
      Speech.speak("Swipe in the bottom navigation bar to browse categories.");
      return;
    }
    currentCategoryIndex = (currentCategoryIndex - 1 + categories.length) % categories.length;
    const current = categories[currentCategoryIndex];
    Haptic.trigger(current.haptic || 'short');
    renderMainMenu();
    announceCurrentCategory();
  }
  else if (gesture === 'doubleTap') {
    if (!isInNavZone) {
      Haptic.trigger('warning');
      Speech.speak("Double tap in the bottom navigation bar to open category.");
      return;
    }
    selectCurrentCategory();
  }
  else if (gesture === 'tap') {
    Haptic.playSound('short');
    announceCurrentCategory();
  }
  else if (gesture === 'swipeDown') {
    Haptic.trigger('short');
    Speech.speak("Main Menu active. Long press anywhere to return to Welcome screen.");
  }
  else if (gesture === 'swipeUp') {
    Haptic.trigger('short');
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    Speech.speak(`Main Menu status: Time is ${timeStr}. Battery is 85 percent. 5 categories available.`);
  }
  else if (gesture === 'longPress') {
    Haptic.trigger('warning');
    Speech.speak("Returning to Welcome screen.");
    navigateTo('welcomeScreen');
  }
  else if (gesture === 'twoFingerTap') {
    Haptic.trigger('success');
    Speech.speak("Main Menu Active. 5 categories available. Draw letter or swipe in navigation bar to browse.");
  }
}

export function announceCurrentCategory() {
  const current = categories[currentCategoryIndex];
  Speech.speak(`Category ${currentCategoryIndex + 1} of ${categories.length}: ${current.title}. ${current.subtitle}. Double tap to open.`);
}

export function selectCurrentCategory() {
  const current = categories[currentCategoryIndex];
  Haptic.trigger('success');
  navigateTo(current.id);
}
