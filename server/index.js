import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { db, initDatabase } from './db.js';

initDatabase();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// WebSocket broadcasting helper
function broadcastRuleUpdate(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'RULE_UPDATED', payload: data }));
    }
  });
}

// ----------------------------------------------------
// REST API ENDPOINTS
// ----------------------------------------------------

// 1. Get all registered screens
app.get('/api/screens', (req, res) => {
  try {
    const screens = db.prepare('SELECT * FROM screens ORDER BY name ASC').all();
    res.json({ success: true, count: screens.length, screens });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Query contextual commands
app.get('/api/commands', (req, res) => {
  try {
    const { screen_id, gesture_code, sub_context } = req.query;
    let query = 'SELECT * FROM contextual_commands WHERE 1=1';
    const params = [];

    if (screen_id) {
      query += ' AND screen_id = ?';
      params.push(screen_id);
    }
    if (gesture_code) {
      query += ' AND gesture_code = ?';
      params.push(gesture_code);
    }
    if (sub_context) {
      query += ' AND sub_context = ?';
      params.push(sub_context);
    }

    query += ' ORDER BY updated_at DESC';

    const commands = db.prepare(query).all(...params);
    res.json({ success: true, count: commands.length, commands });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Resolve contextual gesture command (Low Latency Engine)
app.post('/api/commands/resolve', (req, res) => {
  const startTime = process.hrtime();
  try {
    const { screen_id, gesture_code, sub_context = 'DEFAULT' } = req.body;

    if (!screen_id || !gesture_code) {
      return res.status(400).json({ success: false, error: 'screen_id and gesture_code are required.' });
    }

    // Direct contextual lookup
    let cmd = db.prepare(`
      SELECT * FROM contextual_commands 
      WHERE screen_id = ? AND gesture_code = ? AND sub_context = ?
    `).get(screen_id, gesture_code, sub_context);

    // Fallback lookup if specific sub_context missed
    if (!cmd && sub_context !== 'DEFAULT') {
      cmd = db.prepare(`
        SELECT * FROM contextual_commands 
        WHERE screen_id = ? AND gesture_code = ? AND sub_context = 'DEFAULT'
      `).get(screen_id, gesture_code);
    }

    const elapsed = process.hrtime(startTime);
    const latencyMs = (elapsed[0] * 1000 + elapsed[1] / 1e6).toFixed(2);

    if (cmd) {
      res.json({
        success: true,
        latency_ms: parseFloat(latencyMs),
        command: {
          ...cmd,
          action_payload: JSON.parse(cmd.action_payload)
        }
      });
    } else {
      res.json({
        success: false,
        latency_ms: parseFloat(latencyMs),
        message: 'No contextual rule found for gesture.',
        fallback: { action_type: 'ERROR', haptic_pattern: 'error', tts: 'Invalid action.' }
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Create or update contextual command (AI Programmer Engine)
app.post('/api/commands', (req, res) => {
  try {
    const { id, screen_id, gesture_code, sub_context = 'DEFAULT', action_type, action_payload, haptic_pattern = 'short', created_by = 'AI_PROGRAMMER' } = req.body;

    if (!screen_id || !gesture_code || !action_type || !action_payload) {
      return res.status(400).json({ success: false, error: 'Missing required parameters.' });
    }

    const commandId = id || `cmd_${Date.now()}`;
    const payloadStr = typeof action_payload === 'string' ? action_payload : JSON.stringify(action_payload);

    db.prepare(`
      INSERT OR REPLACE INTO contextual_commands 
      (id, screen_id, gesture_code, sub_context, action_type, action_payload, haptic_pattern, created_by, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(commandId, screen_id, gesture_code, sub_context, action_type, payloadStr, haptic_pattern, created_by);

    const savedCmd = db.prepare('SELECT * FROM contextual_commands WHERE id = ?').get(commandId);
    const resultPayload = {
      ...savedCmd,
      action_payload: JSON.parse(savedCmd.action_payload)
    };

    // Broadcast to WebSocket subscribers
    broadcastRuleUpdate(resultPayload);

    res.json({ success: true, command: resultPayload });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// WEBSOCKET SYNC CONNECTION
// ----------------------------------------------------
wss.on('connection', (socket) => {
  console.log('[WS] New client connected to live rule sync channel.');

  socket.send(JSON.stringify({ type: 'CONNECTED', message: 'BlindEye Live Real-time Sync Active' }));

  socket.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === 'PING') {
        socket.send(JSON.stringify({ type: 'PONG' }));
      }
    } catch (e) {}
  });

  socket.on('close', () => {
    console.log('[WS] Client disconnected.');
  });
});

server.listen(PORT, () => {
  console.log(`[SERVER] Express API and WebSockets running on http://localhost:${PORT}`);
});
