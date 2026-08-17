import { state, logSystem } from '../core/state.js';
import { Speech } from '../core/speech.js';
import { Haptic } from '../core/haptics.js';
import { navigateTo } from '../core/router.js';

let isDrawing = false;
let currentStroke = [];
let calibrationStep = 1;
const calibrationLetter = 'M';

export function initHandwritingTutorial() {
  const canvas = document.getElementById('tutorialCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  resizeCanvas(canvas);

  canvas.addEventListener('mousedown', (e) => startDraw(e.offsetX, e.offsetY, ctx));
  canvas.addEventListener('mousemove', (e) => draw(e.offsetX, e.offsetY, ctx));
  canvas.addEventListener('mouseup', () => endDraw(ctx));

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    startDraw(touch.clientX - rect.left, touch.clientY - rect.top, ctx);
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    draw(touch.clientX - rect.left, touch.clientY - rect.top, ctx);
  }, { passive: false });

  canvas.addEventListener('touchend', () => endDraw(ctx));
}

function resizeCanvas(canvas) {
  canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : 300;
  canvas.height = canvas.parentElement ? canvas.parentElement.clientHeight - 80 : 300;
}

function startDraw(x, y, ctx) {
  isDrawing = true;
  currentStroke = [{ x, y }];
  ctx.strokeStyle = '#FFEE55';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
}

function draw(x, y, ctx) {
  if (!isDrawing) return;
  currentStroke.push({ x, y });
  ctx.lineTo(x, y);
  ctx.stroke();
}

function endDraw(ctx) {
  if (!isDrawing) return;
  isDrawing = false;

  Haptic.trigger('success');
  calibrationStep++;

  const counterEl = document.getElementById('tutorialLetterCounter');
  if (calibrationStep <= 3) {
    if (counterEl) counterEl.innerText = `Draw letter ${calibrationLetter} [ ${calibrationStep} / 3 ]`;
    Speech.speak(`Stroke ${calibrationStep - 1} recorded. Draw letter ${calibrationLetter} again.`);
    setTimeout(() => {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }, 500);
  } else {
    Speech.speak("Letter M calibration complete. Proceeding to Main Menu.");
    setTimeout(() => {
      navigateTo('mainMenuScreen');
    }, 1000);
  }
}
