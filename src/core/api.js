import { state, logSystem } from './state.js';

const API_BASE = '/api';
const WS_BASE = (location.protocol === 'https:' ? 'wss://' : 'ws://') + (location.host || 'localhost:3000') + '/ws';

let socket = null;
let ruleUpdateListeners = [];
let screenUpdateListeners = [];
let sectionUpdateListeners = [];

// Generate cache key
export function getCacheKey(screenId, gestureCode, subContext = 'DEFAULT') {
  return `${screenId}::${gestureCode}::${subContext}`;
}

// Synchronous local command resolver (<1ms latency)
export function resolveLocalCommand(screenId, gestureCode, subContext = 'DEFAULT') {
  const startTime = performance.now();
  
  // 1. Direct contextual match
  const directKey = getCacheKey(screenId, gestureCode, subContext);
  let cmd = state.commandCache.get(directKey);

  // 2. Fallback to DEFAULT sub-context
  if (!cmd && subContext !== 'DEFAULT') {
    const fallbackKey = getCacheKey(screenId, gestureCode, 'DEFAULT');
    cmd = state.commandCache.get(fallbackKey);
  }

  const latencyMs = (performance.now() - startTime).toFixed(2);

  if (cmd) {
    return {
      success: true,
      latency_ms: parseFloat(latencyMs),
      command: cmd,
      source: 'LOCAL_CACHE'
    };
  }

  return {
    success: false,
    latency_ms: parseFloat(latencyMs),
    message: `No contextual rule found for ${gesture_code} on ${screen_id}`,
    fallback: { action_type: 'ERROR', haptic_pattern: 'error', tts: 'Action not mapped.' },
    source: 'LOCAL_CACHE'
  };
}

// Populate / sync local command cache
export async function syncLocalCommandCache() {
  try {
    const [screensRes, commandsRes] = await Promise.all([
      fetchScreens(),
      fetchCommands()
    ]);

    if (screensRes.success && screensRes.screens) {
      state.screensCache = screensRes.screens;
    }

    if (commandsRes.success && commandsRes.commands) {
      state.commandCache.clear();
      commandsRes.commands.forEach(cmd => {
        const key = getCacheKey(cmd.screen_id, cmd.gesture_code, cmd.sub_context || 'DEFAULT');
        state.commandCache.set(key, cmd);
      });
      logSystem(`[Cache] Loaded ${state.commandCache.size} contextual rules and ${state.screensCache.length} screens into in-memory cache.`, 'system');
    }
  } catch (e) {
    console.error('[Cache] Failed to sync cache from server:', e);
  }
}

// WebSocket real-time synchronization
export function initWebSocketSync() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  try {
    const wsUrl = location.port === '3000' ? 'ws://localhost:5000' : WS_BASE;
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      logSystem('[WS Client] Connected to real-time rule synchronization channel.', 'system');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'RULE_UPDATED') {
          const cmd = data.payload;
          const key = getCacheKey(cmd.screen_id, cmd.gesture_code, cmd.sub_context || 'DEFAULT');
          state.commandCache.set(key, cmd);
          logSystem(`[WS Client] Rule updated in cache: ${cmd.gesture_code} on ${cmd.screen_id}`, 'action');
          ruleUpdateListeners.forEach(listener => listener(cmd, 'UPDATE'));
        } 
        else if (data.type === 'RULE_DELETED') {
          const { id, screen_id, gesture_code } = data.payload;
          // Delete from cache
          for (let [key, val] of state.commandCache.entries()) {
            if (val.id === id || (val.screen_id === screen_id && val.gesture_code === gesture_code)) {
              state.commandCache.delete(key);
            }
          }
          logSystem(`[WS Client] Rule deleted from cache: ${gesture_code} on ${screen_id}`, 'action');
          ruleUpdateListeners.forEach(listener => listener(data.payload, 'DELETE'));
        }
        else if (data.type === 'SECTION_UPDATED' || data.type === 'SECTION_DELETED') {
          sectionUpdateListeners.forEach(listener => listener(data));
        }
        else if (data.type === 'SCREEN_UPDATED' || data.type === 'SCREEN_DELETED' || data.type === 'CONFIG_IMPORTED') {
          syncLocalCommandCache().then(() => {
            screenUpdateListeners.forEach(listener => listener(data));
          });
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

export function onScreenUpdated(callback) {
  screenUpdateListeners.push(callback);
}

export function onSectionUpdated(callback) {
  sectionUpdateListeners.push(callback);
}

async function apiFetch(path, options = {}) {
  try {
    let url = `${API_BASE}${path}`;
    let res = await fetch(url, options);

    // If proxy failed or returned non-JSON html 404, fallback to direct port 5000
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json') || !res.ok) {
      if (location.port === '3000') {
        const directUrl = `http://localhost:5000${API_BASE}${path}`;
        res = await fetch(directUrl, options);
      }
    }
    const data = await res.json();
    return data;
  } catch (err) {
    console.error(`[API Error on ${path}]:`, err);
    return { success: false, error: err.message };
  }
}

// ----------------------------------------------------
// REST API HELPERS
// ----------------------------------------------------

export async function fetchScreens() {
  const result = await apiFetch('/screens');
  return { success: result.success !== false, screens: result.screens || [] };
}

export async function createScreen(screenData) {
  return await apiFetch('/screens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(screenData)
  });
}

export async function deleteScreen(screenId) {
  return await apiFetch(`/screens/${encodeURIComponent(screenId)}`, {
    method: 'DELETE'
  });
}

export async function fetchSections(screenId = null) {
  const url = screenId ? `/sections?screen_id=${encodeURIComponent(screenId)}` : '/sections';
  const result = await apiFetch(url);
  return { success: result.success !== false, sections: result.sections || [] };
}

export async function saveSection(sectionData) {
  return await apiFetch('/sections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sectionData)
  });
}

export async function deleteSection(sectionId) {
  return await apiFetch(`/sections/${encodeURIComponent(sectionId)}`, {
    method: 'DELETE'
  });
}

export async function fetchCommands(screenId = null) {
  try {
    const url = screenId ? `${API_BASE}/commands?screen_id=${encodeURIComponent(screenId)}` : `${API_BASE}/commands`;
    const res = await fetch(url);
    return await res.json();
  } catch (e) {
    return { success: false, error: e.message, commands: [] };
  }
}

export async function saveProgrammerCommand(commandData) {
  try {
    const res = await fetch(`${API_BASE}/commands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(commandData)
    });
    const result = await res.json();
    if (result.success && result.command) {
      const key = getCacheKey(result.command.screen_id, result.command.gesture_code, result.command.sub_context || 'DEFAULT');
      state.commandCache.set(key, result.command);
    }
    return result;
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function deleteProgrammerCommand(commandId) {
  try {
    const res = await fetch(`${API_BASE}/commands/${commandId}`, {
      method: 'DELETE'
    });
    const result = await res.json();
    if (result.success) {
      for (let [key, val] of state.commandCache.entries()) {
        if (val.id === commandId) {
          state.commandCache.delete(key);
        }
      }
    }
    return result;
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function exportConfig() {
  try {
    const res = await fetch(`${API_BASE}/export`);
    return await res.json();
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function importConfig(configData, clearExisting = false) {
  try {
    const res = await fetch(`${API_BASE}/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...configData, clear_existing: clearExisting })
    });
    const result = await res.json();
    if (result.success) {
      await syncLocalCommandCache();
    }
    return result;
  } catch (e) {
    return { success: false, error: e.message };
  }
}
