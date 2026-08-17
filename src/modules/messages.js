import { state, saveDb, logSystem } from '../core/state.js';
import { Speech } from '../core/speech.js';
import { Haptic } from '../core/haptics.js';
import { navigateTo } from '../core/router.js';

let currentMsgIndex = 0;
let messageSubState = 'list'; // 'list', 'privacyReply', 'sendConfirm'
let currentMorseSymbols = '';
let currentReplyText = '';
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

export function renderMessages() {
  const container = document.getElementById('messagesScreen');
  if (!container) return;

  const messages = (state.db && state.db.messages) || [];

  if (messages.length === 0) {
    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 20px; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #000; color: #FFF; text-align: center;">
        <i class="fa-solid fa-inbox" style="font-size: 3rem; color: #64748B; margin-bottom: 12px;"></i>
        <h3 style="margin: 0; color: #94A3B8;">No Messages Found</h3>
        <p style="font-size: 0.8rem; color: #64748B; margin-top: 6px;">Long press to return to Main Menu.</p>
      </div>
    `;
    return;
  }

  const msg = messages[currentMsgIndex] || messages[0];

  // ----------------------------------------------------
  // VIEW 1: MESSAGE THREAD LIST
  // ----------------------------------------------------
  if (messageSubState === 'list') {
    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 18px 14px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif;">
        
        <!-- Header -->
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-comment-sms" style="color: #00E5FF; font-size: 1.1rem;"></i>
            <span style="color: #00E5FF; font-size: 0.9rem; font-weight: 800; text-transform: uppercase;">MESSAGES</span>
          </div>
          <span style="color: #FFFFFF; font-size: 0.8rem; font-weight: bold; background: #181818; padding: 2px 8px; border-radius: 12px; border: 1px solid #333;">
            [ ${currentMsgIndex + 1} / ${messages.length} ]
          </span>
        </div>

        <!-- Single Focus Message Card -->
        <div class="msg-focus-card" style="width: 100%; border: 3px solid #00E5FF; border-radius: 20px; padding: 20px 16px; background: #07090E; display: flex; flex-direction: column; gap: 14px; margin: auto 0; box-shadow: 0 0 20px rgba(0, 229, 255, 0.12); cursor: pointer;">
          
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="background: ${msg.unread ? '#00E5FF' : '#334155'}; color: ${msg.unread ? '#000' : '#FFF'}; font-size: 0.65rem; font-weight: 900; padding: 2px 8px; border-radius: 6px; text-transform: uppercase;">
              ${msg.unread ? '● NEW UNREAD' : 'READ'}
            </span>
            <span style="font-size: 0.75rem; color: #94A3B8;">${msg.time || '12:05'}</span>
          </div>

          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 44px; height: 44px; border-radius: 50%; background: rgba(0, 229, 255, 0.15); border: 2px solid #00E5FF; display: flex; align-items: center; justify-content: center;">
              <i class="fa-solid fa-user" style="color: #00E5FF; font-size: 1.2rem;"></i>
            </div>
            <div>
              <h3 style="margin: 0; font-size: 1.2rem; color: #FFFFFF; font-weight: 800;">${msg.from || msg.senderName || 'Contact'}</h3>
              <span style="font-size: 0.75rem; color: #64748B;">Double tap to open Privacy Reader</span>
            </div>
          </div>

          <div style="background: #0D121D; border: 1px solid #1E293B; border-radius: 10px; padding: 12px; font-size: 0.95rem; color: #E2E8F0; line-height: 1.4; font-style: italic;">
            "${msg.text}"
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #222; padding-top: 8px; font-size: 0.72rem; color: #FFEE55; font-weight: bold;">
            <span>Double Tap: Open Private Screen</span>
            <span>Hold: Morse Haptic</span>
          </div>
        </div>

        <!-- Bottom Trackpad Hint -->
        <div style="width: 100%; border-top: 1px dashed #333; padding-top: 6px; text-align: center;">
          <span style="color: #64748B; font-size: 0.7rem;">Swipe Right/Left: Next/Prev SMS • Long Press: Back to Main Menu</span>
        </div>

      </div>
    `;

    container.querySelector('.msg-focus-card')?.addEventListener('click', () => {
      openPrivacyReader();
    });
    return;
  }

  // ----------------------------------------------------
  // VIEW 2: PRIVACY SCREEN & MORSE/STT REPLY
  // ----------------------------------------------------
  if (messageSubState === 'privacyReply') {
    container.innerHTML = `
      <div id="morsePrivacySurface" style="width: 100%; height: 100%; box-sizing: border-box; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; user-select: none; touch-action: none; cursor: pointer;">
        
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 6px;">
          <span style="color: #10B981; font-size: 0.75rem; font-weight: bold; background: rgba(16,185,129,0.15); padding: 2px 8px; border-radius: 8px;">
            <i class="fa-solid fa-shield-halved"></i> PRIVACY MODE ACTIVE
          </span>
          <span style="color: #94A3B8; font-size: 0.75rem;">From: ${msg.from || msg.senderName}</span>
        </div>

        <!-- Read Aloud Text Snippet -->
        <div style="background: #070A11; border: 1.5px solid #00E5FF; border-radius: 14px; padding: 14px; text-align: center;">
          <div style="font-size: 0.72rem; color: #00E5FF; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">Incoming Message:</div>
          <div style="font-size: 1rem; color: #FFFFFF; font-weight: 600; line-height: 1.4;">
            "${msg.text}"
          </div>
        </div>

        <!-- Morse Tap / Typing Surface -->
        <div style="border: 2px dashed #FFEE55; border-radius: 16px; padding: 16px; background: rgba(255,238,85,0.04); text-align: center; display: flex; flex-direction: column; gap: 8px; margin: auto 0;">
          <span style="font-size: 0.72rem; color: #FFEE55; font-weight: 900; letter-spacing: 0.5px;">
            TAP ANYWHERE TO TYPE MORSE REPLY
          </span>
          
          <div style="font-family: monospace; font-size: 1.4rem; color: #FFEE55; letter-spacing: 4px; min-height: 28px;">
            ${currentMorseSymbols || '[ . short tap / - hold ]'}
          </div>

          <div style="background: #0A0F1D; border: 1px solid #1E293B; border-radius: 8px; padding: 10px; font-size: 1.1rem; color: #FFFFFF; font-weight: bold; min-height: 26px;">
            ${currentReplyText || 'Type your message...'}
          </div>
        </div>

        <!-- Controls Guide -->
        <div style="border-top: 1px dashed #333; padding-top: 8px; font-size: 0.7rem; color: #94A3B8; text-align: center; line-height: 1.4;">
          <span style="color: #FFEE55;">Short tap: Dot (.)</span> • <span style="color: #FFEE55;">Hold: Dash (-)</span><br>
          <span style="color: #00E5FF;">Swipe Right: Space</span> • <span style="color: #10B981;">Swipe Up: Prepare to Send</span>
        </div>

      </div>
    `;

    bindMorseTapListeners();
    return;
  }

  // ----------------------------------------------------
  // VIEW 3: SEND CONFIRMATION SCREEN
  // ----------------------------------------------------
  if (messageSubState === 'sendConfirm') {
    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 22px 16px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif; text-align: center;">
        
        <div style="margin-top: 10px;">
          <span style="color: #10B981; font-size: 0.8rem; font-weight: 900; background: rgba(16,185,129,0.15); padding: 3px 12px; border-radius: 12px;">
            <i class="fa-solid fa-paper-plane"></i> SEND CONFIRMATION
          </span>
          <h2 style="margin: 14px 0 6px 0; font-size: 1.4rem; color: #FFFFFF;">Ready to Send?</h2>
          <span style="font-size: 0.85rem; color: #94A3B8;">To: ${msg.from || msg.senderName}</span>
        </div>

        <div style="border: 2px solid #10B981; border-radius: 16px; padding: 18px; background: #07090E; width: 100%; box-sizing: border-box; margin: auto 0;">
          <p style="margin: 0; font-size: 1.2rem; color: #FFEE55; font-weight: 800; font-style: italic;">
            "${currentReplyText || 'OK'}"
          </p>
        </div>

        <button id="btnConfirmSend" style="width: 100%; padding: 14px; background: #10B981; color: #000000; border: none; border-radius: 12px; font-weight: 900; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <i class="fa-solid fa-check"></i> DOUBLE TAP TO SEND MESSAGE
        </button>

      </div>
    `;

    document.getElementById('btnConfirmSend')?.addEventListener('click', dispatchReplyMessage);
    return;
  }
}

function bindMorseTapListeners() {
  const surface = document.getElementById('morsePrivacySurface');
  if (!surface) return;

  surface.addEventListener('pointerdown', (e) => {
    tapDownTime = Date.now();
  });

  surface.addEventListener('pointerup', (e) => {
    if (!tapDownTime) return;
    const duration = Date.now() - tapDownTime;
    tapDownTime = 0;

    // Distinguish short tap (dot) from long tap (dash)
    if (duration < 280) {
      currentMorseSymbols += '.';
      Haptic.trigger('short');
    } else {
      currentMorseSymbols += '-';
      Haptic.trigger('long');
    }

    renderMessages();
  });
}

function commitMorseCharacter() {
  if (!currentMorseSymbols) return;
  const char = morseAlphabet[currentMorseSymbols] || '?';
  currentReplyText += char;
  currentMorseSymbols = '';
  Haptic.trigger('success');
  Speech.speak(char);
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
  Haptic.trigger('success');
  renderMessages();

  Speech.speak(`Private message reader. Message from ${msg.from || msg.senderName}: "${msg.text}". Tap anywhere to type Morse reply, or swipe up to send.`);
}

export function prepareToSend() {
  // If there's uncommitted Morse symbol, commit it first
  if (currentMorseSymbols) {
    const char = morseAlphabet[currentMorseSymbols] || '';
    currentReplyText += char;
    currentMorseSymbols = '';
  }

  if (!currentReplyText.trim()) {
    currentReplyText = "I will be there soon."; // Default quick reply if empty
  }

  messageSubState = 'sendConfirm';
  Haptic.trigger('warning');
  renderMessages();
  Speech.speak(`Preparing to send message: "${currentReplyText}". Double tap to confirm and send.`);
}

export function dispatchReplyMessage() {
  Haptic.trigger('success');
  Speech.speak(`Reply sent: "${currentReplyText}".`);
  messageSubState = 'list';
  currentReplyText = '';
  currentMorseSymbols = '';
  renderMessages();
}

export function handleMessagesGesture(gesture) {
  const messages = (state.db && state.db.messages) || [];

  // STATE 1: List Navigation
  if (messageSubState === 'list') {
    if (gesture === 'swipeRight') {
      currentMsgIndex = (currentMsgIndex + 1) % messages.length;
      Haptic.trigger('short');
      renderMessages();
      announceCurrentMessage();
    }
    else if (gesture === 'swipeLeft') {
      currentMsgIndex = (currentMsgIndex - 1 + messages.length) % messages.length;
      Haptic.trigger('short');
      renderMessages();
      announceCurrentMessage();
    }
    else if (gesture === 'doubleTap' || gesture === 'tap') {
      openPrivacyReader();
    }
    else if (gesture === 'longPress') {
      const msg = messages[currentMsgIndex];
      if (msg) {
        Haptic.trigger('warning');
        Haptic.playMorse(msg.text);
        Speech.speak(`Playing Morse vibration for message.`);
      }
    }
    return;
  }

  // STATE 2: Privacy Reader & Morse Typing
  if (messageSubState === 'privacyReply') {
    if (gesture === 'swipeRight') {
      // Space between words or finish letter
      if (currentMorseSymbols) {
        commitMorseCharacter();
      } else {
        currentReplyText += ' ';
        Haptic.trigger('short');
        Speech.speak("Space");
        renderMessages();
      }
    }
    else if (gesture === 'swipeLeft') {
      // Delete last character
      if (currentMorseSymbols) {
        currentMorseSymbols = currentMorseSymbols.slice(0, -1);
      } else {
        currentReplyText = currentReplyText.slice(0, -1);
      }
      Haptic.trigger('warning');
      Speech.speak("Delete");
      renderMessages();
    }
    else if (gesture === 'swipeUp') {
      prepareToSend();
    }
    else if (gesture === 'longPress') {
      messageSubState = 'list';
      Haptic.trigger('short');
      Speech.speak("Exited privacy screen. Returned to message list.");
      renderMessages();
    }
    return;
  }

  // STATE 3: Send Confirmation
  if (messageSubState === 'sendConfirm') {
    if (gesture === 'doubleTap' || gesture === 'tap') {
      dispatchReplyMessage();
    }
    else if (gesture === 'swipeDown' || gesture === 'longPress') {
      messageSubState = 'privacyReply';
      Haptic.trigger('short');
      Speech.speak("Send cancelled. Returned to privacy reply screen.");
      renderMessages();
    }
  }
}

export function announceCurrentMessage() {
  const messages = (state.db && state.db.messages) || [];
  const msg = messages[currentMsgIndex];
  if (!msg) return;
  Speech.speak(`Message from ${msg.from || msg.senderName}. ${msg.text}. Double tap to open private screen.`);
}
