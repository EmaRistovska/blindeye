import { state, saveDb, logSystem } from '../core/state.js';
import { Speech } from '../core/speech.js';
import { Haptic } from '../core/haptics.js';
import { navigateTo } from '../core/router.js';

let currentMsgIndex = 0;
let messageSubState = 'list'; // 'list', 'privacyReply'
let currentMorseSymbols = '';
let currentReplyText = '';
let replyInputMode = 'morse'; // 'morse' or 'stt'
let isDraftReadyToSend = false;
let tapDownTime = 0;

const morseAlphabet = {
  '.-': 'A', '-...': 'B', '-.-.': 'C', '-..': 'D', '.': 'E', '..-.': 'F',
  '--.': 'G', '....': 'H', '..': 'I', '.---': 'J', '-.-': 'K', '.-..': 'L',
  '--': 'M', '-.': 'N', '---': 'O', '.--.': 'P', '--.-': 'Q', '.-.': 'R',
  '...': 'S', '-': 'T', '..-': 'U', '...-': 'V', '.--': 'W', '-..-': 'X',
  '-.--': 'Y', '--..': 'Z', '.----': '1', '..---': '2', '...--': '3',
  '....-': '4', '.....': '5', '-....': '6', '--...': '7', '---..': '8',
  '----.': '9', '-----': '0'
};

export function getMessageSubState() {
  return messageSubState;
}

export function setMessageSubState(mode) {
  messageSubState = mode;
}

export function renderMessages(targetMode = null) {
  if (targetMode) messageSubState = targetMode;
  const container = document.getElementById('messagesScreen');
  if (!container) return;

  const messages = (state.db && state.db.messages) || [];

  if (messages.length === 0) {
    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 20px; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #000; color: #FFF; text-align: center;">
        <i class="fa-solid fa-inbox" style="font-size: 3rem; color: #64748B; margin-bottom: 12px;"></i>
        <h3 style="margin: 0; color: #94A3B8;">No Messages Found</h3>
        <p style="font-size: 0.8rem; color: #64748B; margin-top: 6px;">Swipe down or long press to return to Main Menu.</p>
      </div>
    `;
    return;
  }

  const msg = messages[currentMsgIndex] || messages[0];

  // ----------------------------------------------------
  // VIEW 1: MESSAGE THREAD LIST (PRIVACY PROTECTED)
  // ----------------------------------------------------
  if (messageSubState === 'list') {
    const dotsHtml = messages.map((m, idx) => {
      const isActive = idx === currentMsgIndex;
      return `
        <span style="
          width: ${isActive ? '22px' : '7px'};
          height: 7px;
          background: ${isActive ? '#FFEE55' : '#334155'};
          border-radius: ${isActive ? '4px' : '50%'};
          transition: all 0.25s ease;
          display: inline-block;
        "></span>
      `;
    }).join('');

    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 44px 14px 175px 14px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; user-select: none; overflow: hidden;">
        
        <!-- Header -->
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
          <span style="color: #FFEE55; font-size: 0.88rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">MESSAGES</span>
          <span style="color: #FFEE55; font-size: 0.85rem; font-weight: bold; background: #181818; padding: 2px 8px; border-radius: 12px; border: 1px solid rgba(255, 238, 85, 0.4);">
            [ ${currentMsgIndex + 1} / ${messages.length} ]
          </span>
        </div>

        <!-- Single Focus Message Card -->
        <div id="cardFocusMsg" class="msg-focus-card" style="width: 100%; border: 2.5px solid #FFEE55; border-radius: 24px; padding: 26px 20px; background: linear-gradient(150deg, rgba(20, 20, 26, 0.96) 0%, rgba(6, 6, 8, 0.98) 100%); display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.9), 0 0 20px rgba(255, 238, 85, 0.08); cursor: pointer; margin: auto 0; box-sizing: border-box;">
          
          <div style="width: 100%; display: flex; justify-content: space-between; align-items: center;">
            <span style="background: ${msg.unread ? '#FFEE55' : '#334155'}; color: ${msg.unread ? '#000' : '#FFF'}; font-size: 0.68rem; font-weight: 900; padding: 3px 10px; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
              ${msg.unread ? '● NEW UNREAD' : 'READ'}
            </span>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 0.82rem; color: #94A3B8; font-weight: bold;">${msg.time || '10:30 AM'}</span>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; margin: 16px 0;">
            <div style="width: 80px; height: 80px; border-radius: 50%; background: rgba(255, 255, 255, 0.03); border: 2.5px solid #FFEE55; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 25px rgba(0,0,0,0.8); box-sizing: border-box;">
              <i class="fa-solid fa-user" style="color: #FFEE55; font-size: 2.2rem; display: flex; align-items: center; justify-content: center; line-height: 1; width: 100%; height: 100%; margin: 0;"></i>
            </div>
            <div>
              <h2 style="margin: 0; font-size: 1.55rem; color: #FFEE55; font-weight: 900; letter-spacing: 0.8px; text-transform: uppercase;">${msg.from || msg.senderName || 'Contact'}</h2>
              <p style="margin: 6px 0 0 0; font-size: 0.85rem; color: #94A3B8; line-height: 1.3;">Tap to hear snippet • Double tap to open</p>
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

    let _cardClickCount = 0;
    let _cardClickTimer = null;
    document.getElementById('cardFocusMsg')?.addEventListener('click', (e) => {
      e.stopPropagation();
      _cardClickCount++;
      if (_cardClickCount === 1) {
        _cardClickTimer = setTimeout(() => {
          _cardClickCount = 0;
          announceCurrentMessage();
        }, 350);
      } else if (_cardClickCount >= 2) {
        clearTimeout(_cardClickTimer);
        _cardClickCount = 0;
        openPrivacyReader();
      }
    });
    return;
  }

  // ----------------------------------------------------
  // VIEW 2: PRIVACY SCREEN (COMPLETELY BLANK SCREEN & MORSE/STT REPLY)
  // ----------------------------------------------------
  if (messageSubState === 'privacyReply') {
    container.innerHTML = `
      <div id="morsePrivacySurface" style="width: 100%; height: 100%; box-sizing: border-box; padding: 44px 14px 175px 14px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; user-select: none; touch-action: none; cursor: pointer; overflow: hidden;">
        
        <!-- Marked Morse Tapping Space -->
        <div id="morseTappingSpace" style="width: 100%; flex: 1; min-height: 240px; margin: 4px 0 14px 0; border: 2px dashed rgba(255, 238, 85, 0.45); border-radius: 20px; background: rgba(255, 255, 255, 0.02); display: flex; align-items: center; justify-content: center; text-align: center; box-sizing: border-box; box-shadow: inset 0 0 25px rgba(0, 0, 0, 0.8);">
          
          <div id="morseCircleIcon" style="width: 80px; height: 80px; border-radius: 50%; border: 2.5px solid #FFEE55; display: flex; align-items: center; justify-content: center; background: rgba(255, 238, 85, 0.1); box-shadow: 0 0 25px rgba(255, 238, 85, 0.2);">
            <i class="fa-solid fa-fingerprint" style="color: #FFEE55; font-size: 2.2rem;"></i>
          </div>

        </div>

        <!-- Touch Controls Guide -->
        <div style="width: 100%; border-top: 1px dashed #222; padding-top: 8px; font-size: 0.72rem; color: #94A3B8; text-align: center; line-height: 1.5;">
          <span style="color: #FFEE55;">Tap: Dot</span> • <span style="color: #FFEE55;">Hold: Dash</span> • <span style="color: #00E5FF;">Swipe Left: Delete</span> • <span style="color: #FFEE55; font-weight: 800;">Swipe Right: Space</span><br>
          <span style="color: #EF4444; font-weight: 800;">▼ Swipe Down: Back to List</span> • <span style="color: #10B981; font-weight: 800;">Double Tap Nav: Send</span>
        </div>

      </div>
    `;

    bindMorseTapListeners();
    const navZone = document.getElementById('navigationArea') || document.getElementById('fixedNavigationArea');
    if (navZone) {
      let _navClickCount = 0;
      let _navClickTimer = null;
      navZone.onclick = (e) => {
        if (messageSubState !== 'privacyReply') return;
        _navClickCount++;
        if (_navClickCount === 1) {
          _navClickTimer = setTimeout(() => {
            _navClickCount = 0;
            Haptic.playSound('short');
            Speech.speak("Navigation bar. Double tap here to send message.");
          }, 320);
        } else if (_navClickCount >= 2) {
          clearTimeout(_navClickTimer);
          _navClickCount = 0;
          e.stopPropagation();
          dispatchReplyMessage();
        }
      };
    }
    return;
  }


}

let morseLetterTimer = null;
let morseDashTimer = null;
let isDashCommitted = false;
let pointerStartX = 0;
let pointerStartY = 0;
let pointerDownTime = 0;

function updateMorseDisplay() {
  const symbolEl = document.getElementById('morseSymbolDisplay');
  const letterEl = document.getElementById('morseLetterDisplay');
  const textEl = document.getElementById('morseTextDisplay');

  if (symbolEl) {
    symbolEl.textContent = currentMorseSymbols ? currentMorseSymbols.replace(/\./g, ' • ').replace(/-/g, ' — ') : '';
  }

  if (letterEl) {
    if (currentMorseSymbols) {
      const char = morseAlphabet[currentMorseSymbols];
      letterEl.textContent = char ? `[ Letter: ${char} ]` : '[ Typing Morse... ]';
      letterEl.style.color = char ? '#FFEE55' : '#64748B';
    } else {
      letterEl.textContent = '';
    }
  }

  if (textEl) {
    if (currentReplyText) {
      textEl.innerHTML = `<span style="background: rgba(255, 238, 85, 0.1); border: 1.5px solid #FFEE55; color: #FFEE55; font-size: 1.15rem; font-weight: 800; padding: 6px 18px; border-radius: 12px; font-style: italic;">"${currentReplyText}"</span>`;
    } else {
      textEl.innerHTML = '';
    }
  }
}

function scheduleMorseLetterCommit() {
  if (morseLetterTimer) clearTimeout(morseLetterTimer);
  morseLetterTimer = setTimeout(() => {
    commitMorseCharacter();
  }, 900); // 900ms pause automatically commits the letter
}

function commitMorseCharacter() {
  if (morseLetterTimer) clearTimeout(morseLetterTimer);
  if (!currentMorseSymbols) return;
  const char = morseAlphabet[currentMorseSymbols];
  if (char) {
    currentReplyText += char;
    Haptic.trigger('success');
    Speech.speak(`Letter ${char}`);
  } else {
    Speech.speak("Unknown Morse symbol");
  }
  currentMorseSymbols = '';
  replyInputMode = 'morse';
  updateMorseDisplay();
}

function bindMorseTapListeners() {
  const surface = document.getElementById('morsePrivacySurface');
  if (!surface) return;

  surface.addEventListener('pointerdown', (e) => {
    try { surface.setPointerCapture(e.pointerId); } catch (err) {}
    e.stopPropagation();
    pointerDownTime = Date.now();
    pointerStartX = e.clientX;
    pointerStartY = e.clientY;
    isDashCommitted = false;

    if (morseDashTimer) clearTimeout(morseDashTimer);

    // Holding for 260ms immediately registers a DASH with instant tactile feedback
    morseDashTimer = setTimeout(() => {
      isDashCommitted = true;
      replyInputMode = 'morse';
      currentMorseSymbols += '-';
      Haptic.trigger('long');
      Speech.speak("Dash");
      updateMorseDisplay();
      scheduleMorseLetterCommit();
    }, 260);
  });

  surface.addEventListener('pointermove', (e) => {
    if (!pointerDownTime) return;
    const dx = e.clientX - pointerStartX;
    const dy = e.clientY - pointerStartY;
    if (Math.hypot(dx, dy) > 10) {
      // Swiping movement, cancel dash timer immediately
      if (morseDashTimer) {
        clearTimeout(morseDashTimer);
        morseDashTimer = null;
      }
    }
  });

  surface.addEventListener('pointerup', (e) => {
    try { surface.releasePointerCapture(e.pointerId); } catch (err) {}
    e.stopPropagation();
    if (morseDashTimer) {
      clearTimeout(morseDashTimer);
      morseDashTimer = null;
    }
    if (!pointerDownTime) return;

    const duration = Date.now() - pointerDownTime;
    const deltaX = e.clientX - pointerStartX;
    const deltaY = e.clientY - pointerStartY;
    const dist = Math.hypot(deltaX, deltaY);
    pointerDownTime = 0;

    // 1. Check for horizontal swipe (Right: Space, Left: Delete)
    const minSwipe = 12;
    if (Math.abs(deltaX) >= minSwipe && Math.abs(deltaX) >= Math.abs(deltaY)) {
      if (deltaX > 0) {
        handleMessagesGesture('swipeRight');
      } else {
        handleMessagesGesture('swipeLeft');
      }
      return;
    }

    // 2. Check for vertical swipe (Up: Prepare to send, Down: Return to list)
    if (Math.abs(deltaY) >= minSwipe && Math.abs(deltaY) > Math.abs(deltaX)) {
      if (deltaY < 0) {
        handleMessagesGesture('swipeUp');
      } else {
        handleMessagesGesture('swipeDown');
      }
      return;
    }

    // If Dash already committed at 260ms during hold, release does nothing
    if (isDashCommitted) {
      isDashCommitted = false;
      return;
    }

    // 3. Stationary tap (< 260ms AND dist < 15) -> DOT!
    if (duration < 260 && dist < 15) {
      replyInputMode = 'morse';
      currentMorseSymbols += '.';
      Haptic.trigger('short');
      Speech.speak("Dot");
      updateMorseDisplay();
      scheduleMorseLetterCommit();
    }
  });

  surface.addEventListener('pointercancel', () => {
    if (morseDashTimer) clearTimeout(morseDashTimer);
    pointerDownTime = 0;
    isDashCommitted = false;
  });
}

export function startVoiceDictation() {
  replyInputMode = 'stt';
  Haptic.trigger('short');
  Speech.speak("Listening for voice reply. Speak now.");

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        currentReplyText = transcript;
        replyInputMode = 'stt';
        Haptic.trigger('success');
        Speech.speak(`Voice recorded: "${transcript}". Swipe up to confirm, or swipe right to send.`);
        renderMessages();
      };
      recognition.onerror = () => {
        currentReplyText = "I will be home in 10 minutes.";
        replyInputMode = 'stt';
        Haptic.trigger('success');
        Speech.speak(`Voice recorded. Swipe up to confirm, or swipe right to send.`);
        renderMessages();
      };
      recognition.start();
      return;
    } catch (e) { }
  }

  // Fallback demo STT
  currentReplyText = "I will be home in 10 minutes.";
  replyInputMode = 'stt';
  Haptic.trigger('success');
  Speech.speak(`Voice recorded. Swipe up to confirm, or swipe right to send.`);
  renderMessages();
}

export function openPrivacyReader() {
  const messages = (state.db && state.db.messages) || [];
  const msg = messages[currentMsgIndex];
  if (!msg) return;

  msg.unread = false;
  saveDb();

  messageSubState = 'privacyReply';
  currentMorseSymbols = '';
  currentReplyText = '';
  replyInputMode = 'morse';
  isDraftReadyToSend = false;
  Haptic.trigger('success');
  renderMessages();

  const readingMode = (state.db && state.db.settings && state.db.settings.readingMode) || state.readingMode || 'tts';

  if (readingMode === 'morse' || readingMode === 'morse only') {
    Speech.speak("Reading message in Morse code.");
    Haptic.playMorse(msg.text);
  } else {
    Speech.speak(`Message from ${msg.from || msg.senderName}: "${msg.text}". Screen is blank for privacy. Tap for dot, hold for dash. Swipe right for space. Double tap in the navigation zone to send.`);
  }
}

export function prepareToSend() {
  if (morseLetterTimer) clearTimeout(morseLetterTimer);
  if (currentMorseSymbols) {
    const char = morseAlphabet[currentMorseSymbols] || '';
    if (char) currentReplyText += char;
    currentMorseSymbols = '';
  }

  const draft = currentReplyText.trim() || (replyInputMode === 'stt' ? "I will be home soon." : "OK");
  Haptic.trigger('success');
  Speech.speak(`Draft confirmed: "${draft}". Double tap in the navigation bar to send, or continue typing.`);
}

export function dispatchReplyMessage() {
  if (morseLetterTimer) clearTimeout(morseLetterTimer);
  if (currentMorseSymbols) {
    const char = morseAlphabet[currentMorseSymbols] || '';
    if (char) currentReplyText += char;
    currentMorseSymbols = '';
  }

  const sentText = currentReplyText.trim() || (replyInputMode === 'stt' ? "I will be home soon." : "OK");
  Haptic.trigger('success');
  const messages = (state.db && state.db.messages) || [];
  const msg = messages[currentMsgIndex];
  const recipient = msg ? (msg.from || msg.senderName) : 'Contact';
  Speech.speak(`Message sent to ${recipient}: "${sentText}". Returning to message list.`);
  messageSubState = 'list';
  currentReplyText = '';
  currentMorseSymbols = '';
  isDraftReadyToSend = false;
  renderMessages();
}

export function announceCurrentMessage() {
  const messages = (state.db && state.db.messages) || [];
  const msg = messages[currentMsgIndex];
  if (!msg) return;
  Speech.speak(`Message ${currentMsgIndex + 1} of ${messages.length} from ${msg.from || msg.senderName}. ${msg.unread ? 'New unread.' : 'Read.'} Received at ${msg.time || '12:00'}. Double tap to open.`);
}

export function handleMessagesGesture(gesture, isInNavZone = true) {
  const messages = (state.db && state.db.messages) || [];

  // STATE 1: List Navigation
  if (messageSubState === 'list') {
    if (gesture === 'swipeRight') {
      if (!isInNavZone) {
        Haptic.trigger('warning');
        Speech.speak("Swipe in the bottom navigation bar to browse messages.");
        return;
      }
      if (currentMsgIndex < messages.length - 1) {
        currentMsgIndex++;
        Haptic.trigger('short');
        renderMessages();
        announceCurrentMessage();
      } else {
        Haptic.trigger('warning');
        Speech.speak("Last message.");
      }
    }
    else if (gesture === 'swipeLeft') {
      if (!isInNavZone) {
        Haptic.trigger('warning');
        Speech.speak("Swipe in the bottom navigation bar to browse messages.");
        return;
      }
      if (currentMsgIndex > 0) {
        currentMsgIndex--;
        Haptic.trigger('short');
        renderMessages();
        announceCurrentMessage();
      } else {
        Haptic.trigger('warning');
        Speech.speak("First message.");
      }
    }
    else if (gesture === 'doubleTap') {
      if (!isInNavZone) {
        Haptic.trigger('warning');
        Speech.speak("Double tap in the bottom navigation bar to open message.");
        return;
      }
      openPrivacyReader();
    }
    else if (gesture === 'tap') {
      Haptic.playSound('short');
      announceCurrentMessage();
    }
    else if (gesture === 'swipeDown') {
      Haptic.trigger('short');
      navigateTo('mainMenuScreen');
    }
    return;
  }

  // STATE 2: Privacy Reader & Morse Typing
  if (messageSubState === 'privacyReply') {
    if (gesture === 'swipeRight') {
      if (morseLetterTimer) clearTimeout(morseLetterTimer);
      if (currentMorseSymbols) {
        const char = morseAlphabet[currentMorseSymbols] || '';
        if (char) currentReplyText += char;
        currentMorseSymbols = '';
        Haptic.trigger('short');
        Speech.speak(`Letter ${char}`);
      } else {
        currentReplyText += ' ';
        Haptic.trigger('short');
        Speech.speak("Space");
      }
      updateMorseDisplay();
      return;
    }
    if (gesture === 'doubleTap') {
      if (isInNavZone) {
        dispatchReplyMessage();
      } else {
        Haptic.trigger('warning');
        Speech.speak("Double tap in the bottom navigation zone to send message.");
      }
      return;
    }
    if (gesture === 'swipeUp') {
      prepareToSend();
      return;
    }
    if (gesture === 'swipeLeft') {
      if (currentMorseSymbols) {
        currentMorseSymbols = currentMorseSymbols.slice(0, -1);
        Haptic.trigger('short');
        Speech.speak("Delete symbol");
        updateMorseDisplay();
        if (currentMorseSymbols) scheduleMorseLetterCommit();
        else if (morseLetterTimer) clearTimeout(morseLetterTimer);
      } else if (currentReplyText) {
        if (morseLetterTimer) clearTimeout(morseLetterTimer);
        currentReplyText = currentReplyText.slice(0, -1);
        Haptic.trigger('warning');
        Speech.speak("Delete character");
        updateMorseDisplay();
      } else {
        Haptic.trigger('warning');
        Speech.speak("Nothing to delete");
      }
      return;
    }
    if (gesture === 'swipeDown') {
      messageSubState = 'list';
      isDraftReadyToSend = false;
      Haptic.trigger('short');
      Speech.speak("Exited privacy screen. Returned to message list.");
      renderMessages();
      return;
    }
    return;
  }


}
