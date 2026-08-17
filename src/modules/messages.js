import { state, saveDb, logSystem } from '../core/state.js';
import { Speech } from '../core/speech.js';
import { Haptic } from '../core/haptics.js';
import { navigateTo } from '../core/router.js';

let currentMsgIndex = 0;
let isViewingDetail = false;

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

  if (!isViewingDetail) {
    // Thread List View (Single Focus Large Card)
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
              <span style="font-size: 0.75rem; color: #64748B;">Tap to open & listen</span>
            </div>
          </div>

          <div style="background: #0D121D; border: 1px solid #1E293B; border-radius: 10px; padding: 12px; font-size: 0.95rem; color: #E2E8F0; line-height: 1.4; font-style: italic;">
            "${msg.text}"
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #222; padding-top: 8px; font-size: 0.72rem; color: #FFEE55; font-weight: bold;">
            <span>Double Tap: Open</span>
            <span>Hold: Play Morse Vibration</span>
          </div>
        </div>

        <!-- Hint -->
        <div style="width: 100%; border-top: 1px dashed #333; padding-top: 6px; text-align: center;">
          <span style="color: #64748B; font-size: 0.7rem;">Swipe Right/Left: Next/Prev Message • Long Press (Nav Bar): Back</span>
        </div>

      </div>
    `;

    container.querySelector('.msg-focus-card')?.addEventListener('click', () => {
      openMessageDetail();
    });
  } else {
    // Detail & Reply View
    container.innerHTML = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 18px 14px; display: flex; flex-direction: column; justify-content: space-between; background: #000000; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif;">
        
        <!-- Header -->
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px;">
          <span style="color: #00E5FF; font-size: 0.85rem; font-weight: bold;">From: ${msg.from || msg.senderName}</span>
          <button id="btnBackToMsgList" style="padding: 3px 8px; background: #1E293B; color: #FFF; border: 1px solid #475569; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">
            <i class="fa-solid fa-arrow-left"></i> List
          </button>
        </div>

        <!-- Full Text Card -->
        <div style="border: 2px solid #00E5FF; border-radius: 16px; padding: 18px; background: #07090E; margin: auto 0; display: flex; flex-direction: column; gap: 12px;">
          <p style="margin: 0; font-size: 1.15rem; line-height: 1.5; color: #FFFFFF; font-weight: 600;">
            "${msg.text}"
          </p>
          <div style="display: flex; gap: 8px; margin-top: 8px;">
            <button id="btnPlayVoice" style="flex: 1; padding: 10px; background: #00E5FF; color: #000; border: none; border-radius: 8px; font-weight: bold; font-size: 0.8rem; cursor: pointer;">
              <i class="fa-solid fa-volume-high"></i> Replay Voice
            </button>
            <button id="btnPlayMorse" style="flex: 1; padding: 10px; background: rgba(255, 238, 85, 0.15); border: 1px solid #FFEE55; color: #FFEE55; border-radius: 8px; font-weight: bold; font-size: 0.8rem; cursor: pointer;">
              <i class="fa-solid fa-wave-square"></i> Morse Haptic
            </button>
          </div>
        </div>

        <!-- Voice Reply Button -->
        <button id="btnQuickReply" style="width: 100%; padding: 12px; background: #10B981; color: #000; border: none; border-radius: 10px; font-weight: 900; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <i class="fa-solid fa-microphone"></i> DOUBLE TAP TO VOICE REPLY
        </button>

      </div>
    `;

    document.getElementById('btnBackToMsgList')?.addEventListener('click', () => {
      isViewingDetail = false;
      renderMessages();
      announceCurrentMessage();
    });

    document.getElementById('btnPlayVoice')?.addEventListener('click', () => {
      Speech.speak(`Message from ${msg.from || msg.senderName}. ${msg.text}`);
    });

    document.getElementById('btnPlayMorse')?.addEventListener('click', () => {
      Haptic.playMorse(msg.text);
      Speech.speak("Playing Morse vibration sequence.");
    });

    document.getElementById('btnQuickReply')?.addEventListener('click', () => {
      Haptic.trigger('success');
      Speech.speak("Recording voice reply... Speak now. Double tap when finished.");
      setTimeout(() => {
        Speech.speak("Reply sent: 'I will be there in 10 minutes.'");
        isViewingDetail = false;
        renderMessages();
      }, 3500);
    });
  }
}

export function handleMessagesGesture(gesture) {
  const messages = (state.db && state.db.messages) || [];
  if (messages.length === 0) return;

  if (!isViewingDetail) {
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
      openMessageDetail();
    }
    else if (gesture === 'longPress') {
      const msg = messages[currentMsgIndex];
      Haptic.trigger('warning');
      Haptic.playMorse(msg.text);
      Speech.speak(`Playing Morse code vibration for message from ${msg.from || msg.senderName}.`);
    }
  } else {
    if (gesture === 'doubleTap') {
      document.getElementById('btnQuickReply')?.click();
    } else if (gesture === 'longPress' || gesture === 'swipeDown') {
      isViewingDetail = false;
      Haptic.trigger('short');
      renderMessages();
      announceCurrentMessage();
    }
  }
}

export function openMessageDetail() {
  const messages = (state.db && state.db.messages) || [];
  const msg = messages[currentMsgIndex];
  if (!msg) return;

  msg.unread = false;
  saveDb();
  isViewingDetail = true;
  Haptic.trigger('success');
  renderMessages();
  Speech.speak(`Message from ${msg.from || msg.senderName}. ${msg.text}. Double tap to reply, or hold to return.`);
}

export function announceCurrentMessage() {
  const messages = (state.db && state.db.messages) || [];
  const msg = messages[currentMsgIndex];
  if (!msg) return;
  Speech.speak(`Message from ${msg.from || msg.senderName}. ${msg.text}. Double tap to open.`);
}
