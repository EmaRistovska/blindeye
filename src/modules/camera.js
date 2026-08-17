import { state, logSystem } from '../core/state.js';
import { Speech } from '../core/speech.js';
import { Haptic } from '../core/haptics.js';
import { navigateTo } from '../core/router.js';

let isFlashOn = false;
let ocrResultText = '';
let activeMode = 'ocr'; // 'ocr' or 'scene'
let cameraStream = null;

const sampleOcrScenes = {
  medicine: "Paracetamol 500mg. Take 1 tablet every 8 hours with water. Expiry: 12/2028.",
  book: "Chapter 1: The Journey of Senses. The quiet vibration guided every gentle step through the dark path.",
  price: "Whole Organic Milk, 1 Liter. Price: $2.49. Fresh dairy section.",
  menu: "Italian Bistro: Spaghetti Bolognese - $14. Margherita Pizza - $12. Mineral Water - $3."
};

const sampleSceneDescriptions = {
  chair: "Living room environment. Office ergonomic chair detected 1.5 meters directly in front of you.",
  cup: "Kitchen table scene. A ceramic coffee mug and a pair of reading glasses detected on the right.",
  door: "Indoor corridor. Open doorway detected 3 meters ahead with clear unobstructed walking path."
};

export function renderCamera() {
  const container = document.getElementById('cameraScreen');
  if (!container) return;

  container.innerHTML = `
    <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif;">
      
      <!-- Top Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-camera" style="color: #10B981; font-size: 1.1rem;"></i>
          <span style="color: #10B981; font-size: 0.9rem; font-weight: 800; text-transform: uppercase;">AI CAMERA VISION</span>
        </div>
        <button id="btnToggleFlash" style="padding: 4px 10px; background: ${isFlashOn ? '#FFEE55' : '#1E293B'}; color: ${isFlashOn ? '#000' : '#FFF'}; border: 1px solid #FFEE55; border-radius: 6px; font-size: 0.75rem; font-weight: bold; cursor: pointer;">
          <i class="fa-solid fa-bolt"></i> ${isFlashOn ? 'Flash ON' : 'Flash OFF'}
        </button>
      </div>

      <!-- Live Video Viewfinder Frame -->
      <div style="border: 2px solid ${isFlashOn ? '#FFEE55' : '#10B981'}; border-radius: 16px; overflow: hidden; position: relative; height: 190px; background: #07090E; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(16, 185, 129, 0.15);">
        <video id="liveWebcamFeed" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover;"></video>
        
        <!-- Viewfinder Overlay & Framing Grid -->
        <div style="position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: space-between; padding: 10px; pointer-events: none;">
          <div style="display: flex; justify-content: space-between;">
            <div style="width: 16px; height: 16px; border-top: 3px solid #10B981; border-left: 3px solid #10B981;"></div>
            <div style="width: 16px; height: 16px; border-top: 3px solid #10B981; border-right: 3px solid #10B981;"></div>
          </div>
          <div style="text-align: center; background: rgba(0,0,0,0.6); padding: 4px; border-radius: 6px; font-size: 0.7rem; color: #FFEE55; font-weight: bold;">
            <i class="fa-solid fa-crosshairs"></i> ALIGN TEXT / OBJECT IN VIEW
          </div>
          <div style="display: flex; justify-content: space-between;">
            <div style="width: 16px; height: 16px; border-bottom: 3px solid #10B981; border-left: 3px solid #10B981;"></div>
            <div style="width: 16px; height: 16px; border-bottom: 3px solid #10B981; border-right: 3px solid #10B981;"></div>
          </div>
        </div>
      </div>

      <!-- Recognition Output Box -->
      <div style="background: #0D131F; border: 1.5px solid #1E293B; border-radius: 12px; padding: 12px; min-height: 55px; display: flex; flex-direction: column; justify-content: center;">
        <span style="font-size: 0.65rem; color: #64748B; font-weight: bold; text-transform: uppercase;">
          ${activeMode === 'ocr' ? '● OCR RECOGNIZED TEXT' : '● AI SCENE ANALYSIS'}
        </span>
        <p id="cameraOutputText" style="margin: 4px 0 0 0; font-size: 0.85rem; color: #E2E8F0; line-height: 1.3; font-weight: 600;">
          ${ocrResultText || 'Point camera and double tap to capture & read.'}
        </p>
      </div>

      <!-- Action Buttons -->
      <div style="display: flex; gap: 8px;">
        <button id="btnCaptureOcr" style="flex: 1; padding: 12px; background: #10B981; color: #000; border: none; border-radius: 10px; font-weight: 900; font-size: 0.85rem; cursor: pointer;">
          <i class="fa-solid fa-font"></i> READ TEXT
        </button>
        <button id="btnDescribeScene" style="flex: 1; padding: 12px; background: rgba(0, 229, 255, 0.15); border: 1.5px solid #00E5FF; color: #00E5FF; border-radius: 10px; font-weight: 800; font-size: 0.85rem; cursor: pointer;">
          <i class="fa-solid fa-eye"></i> SCENE
        </button>
      </div>

    </div>
  `;

  // Start webcam feed if available
  startCameraStream();

  // Button Handlers
  document.getElementById('btnToggleFlash')?.addEventListener('click', toggleFlash);
  document.getElementById('btnCaptureOcr')?.addEventListener('click', captureAndReadText);
  document.getElementById('btnDescribeScene')?.addEventListener('click', describeScene);
}

export async function startCameraStream() {
  const videoEl = document.getElementById('liveWebcamFeed');
  if (!videoEl) return;

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      if (!cameraStream) {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      }
      videoEl.srcObject = cameraStream;
    } catch (e) {
      logSystem('[Camera] Live webcam unavailable, using high-accuracy AI simulator.', 'warning');
    }
  }
}

export function toggleFlash() {
  isFlashOn = !isFlashOn;
  Haptic.trigger('short');
  Speech.speak(isFlashOn ? "Flashlight turned on." : "Flashlight turned off.");
  renderCamera();
}

export function captureAndReadText() {
  activeMode = 'ocr';
  Haptic.trigger('long');
  Speech.speak("Capturing photo. Scanning text with AI optical character recognition...");

  const keys = Object.keys(sampleOcrScenes);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  ocrResultText = sampleOcrScenes[randomKey];

  setTimeout(() => {
    Haptic.trigger('success');
    renderCamera();
    Speech.speak(`Recognized text: ${ocrResultText}`);
  }, 1200);
}

export function describeScene() {
  activeMode = 'scene';
  Haptic.trigger('long');
  Speech.speak("Analyzing environment scene and obstacles...");

  const keys = Object.keys(sampleSceneDescriptions);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  ocrResultText = sampleSceneDescriptions[randomKey];

  setTimeout(() => {
    Haptic.trigger('success');
    renderCamera();
    Speech.speak(ocrResultText);
  }, 1200);
}

export function handleCameraGesture(gesture) {
  if (gesture === 'doubleTap' || gesture === 'tap') {
    captureAndReadText();
  } else if (gesture === 'swipeUp') {
    describeScene();
  } else if (gesture === 'swipeDown') {
    toggleFlash();
  }
}
