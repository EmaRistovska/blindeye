import { logSystem } from './state.js';

const API_BASE = 'http://localhost:5000/api';
const WS_BASE = 'ws://localhost:5000';

let socket = null;
let ruleUpdateListeners = [];

export function initWebSocketSync() {
  try {
    socket = new WebSocket(WS_BASE);

    socket.onopen = () => {
      logSystem('[WS Client] Connected to live backend server sync channel.', 'system');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'RULE_UPDATED') {
          logSystem(`[WS Client] Live rule update received: ${data.payload.gesture_code} on ${data.payload.screen_id}`, 'action');
          ruleUpdateListeners.forEach(listener => listener(data.payload));
        }
      } catch (e) {
        console.error('[WS Client] Failed to parse message:', e);
      }
    };

    socket.onclose = () => {
      logSystem('[WS Client] Disconnected from server. Reconnecting in 3s...', 'warning');
      setTimeout(initWebSocketSync, 3000);
    };
  } catch (e) {
    console.error('[WS Client] Error initializing WebSocket:', e);
  }
}

export function onRuleUpdated(callback) {
  ruleUpdateListeners.push(callback);
}

export async function resolveContextualCommand(screenId, gestureCode, subContext = 'DEFAULT') {
  try {
    const response = await fetch(`${API_BASE}/commands/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ screen_id: screenId, gesture_code: gestureCode, sub_context: subContext })
    });
    return await response.json();
  } catch (e) {
    console.error('[API] Failed to resolve command:', e);
    return { success: false, error: e.message };
  }
}

export async function saveProgrammerCommand(commandData) {
  try {
    const response = await fetch(`${API_BASE}/commands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(commandData)
    });
    return await response.json();
  } catch (e) {
    console.error('[API] Failed to save programmer command:', e);
    return { success: false, error: e.message };
  }
}
