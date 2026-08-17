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
function broadcastEvent(type, payload) {
  const msg = JSON.stringify({ type, payload });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

// Helper to safely parse action_payload
function parsePayload(cmd) {
  if (!cmd) return cmd;
  let payload = cmd.action_payload;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch (e) {
      payload = { tts: payload };
    }
  }
  return { ...cmd, action_payload: payload };
}

// ----------------------------------------------------
// REST API ENDPOINTS
// ----------------------------------------------------

// 1. Screens Management
app.get('/api/screens', (req, res) => {
  try {
    const screens = db.prepare('SELECT * FROM screens ORDER BY name ASC').all();
    res.json({ success: true, count: screens.length, screens });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/screens', (req, res) => {
  try {
    const { id, name, parent_screen_id = null } = req.body;
    if (!id || !name) {
      return res.status(400).json({ success: false, error: 'id and name are required' });
    }
    db.prepare(`
      INSERT OR REPLACE INTO screens (id, name, parent_screen_id)
      VALUES (?, ?, ?)
    `).run(id, name, parent_screen_id);

    const screen = db.prepare('SELECT * FROM screens WHERE id = ?').get(id);
    broadcastEvent('SCREEN_UPDATED', screen);
    res.json({ success: true, screen });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/screens/:id', (req, res) => {
  try {
    const { id } = req.params;
    // Delete associated contextual commands first
    db.prepare('DELETE FROM contextual_commands WHERE screen_id = ?').run(id);
    db.prepare('DELETE FROM screens WHERE id = ?').run(id);
    broadcastEvent('SCREEN_DELETED', { id });
    res.json({ success: true, deleted_id: id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 1b. Visual phone sections. Coordinates are percentages of the phone canvas.
app.get('/api/sections', (req, res) => {
  try {
    const sections = db.prepare('SELECT * FROM interface_sections ORDER BY name ASC').all();
    res.json({ success: true, count: sections.length, sections });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/sections', (req, res) => {
  try {
    const { id, name, x, y, width, height } = req.body;
    if (!id || !name || [x, y, width, height].some(value => !Number.isFinite(Number(value)))) {
      return res.status(400).json({ success: false, error: 'id, name, x, y, width, and height are required.' });
    }
    db.prepare(`
      INSERT OR REPLACE INTO interface_sections (id, name, x, y, width, height, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(id, name, Number(x), Number(y), Number(width), Number(height));
    const section = db.prepare('SELECT * FROM interface_sections WHERE id = ?').get(id);
    broadcastEvent('SECTION_UPDATED', section);
    res.json({ success: true, section });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/sections/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM interface_sections WHERE id = ?').run(id);
    broadcastEvent('SECTION_DELETED', { id });
    res.json({ success: true, deleted_id: id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Query contextual commands (Normalized JSON payloads)
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

    const rawCommands = db.prepare(query).all(...params);
    const commands = rawCommands.map(parsePayload);
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
        command: parsePayload(cmd)
      });
    } else {
      res.json({
        success: false,
        latency_ms: parseFloat(latencyMs),
        message: `No contextual rule found for ${gesture_code} on ${screen_id}`,
        fallback: { action_type: 'ERROR', haptic_pattern: 'error', tts: 'Action not mapped.' }
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
    const resultPayload = parsePayload(savedCmd);

    // Broadcast to WebSocket subscribers
    broadcastEvent('RULE_UPDATED', resultPayload);

    res.json({ success: true, command: resultPayload });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Delete contextual command
app.delete('/api/commands/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM contextual_commands WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Command not found.' });
    }
    db.prepare('DELETE FROM contextual_commands WHERE id = ?').run(id);
    broadcastEvent('RULE_DELETED', { id, screen_id: existing.screen_id, gesture_code: existing.gesture_code });
    res.json({ success: true, deleted_id: id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Export all configuration (Preset / Backup)
app.get('/api/export', (req, res) => {
  try {
    const screens = db.prepare('SELECT * FROM screens ORDER BY name ASC').all();
    const rawCommands = db.prepare('SELECT * FROM contextual_commands ORDER BY screen_id ASC').all();
    const commands = rawCommands.map(parsePayload);
    const sections = db.prepare('SELECT * FROM interface_sections ORDER BY name ASC').all();
    res.json({
      success: true,
      version: '3.0.0',
      exported_at: new Date().toISOString(),
      screens,
      sections,
      commands
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Import configuration
app.post('/api/import', (req, res) => {
  try {
    const { screens = [], sections = [], commands = [], clear_existing = false } = req.body;

    const importTx = db.transaction(() => {
      if (clear_existing) {
        db.prepare('DELETE FROM contextual_commands').run();
        db.prepare('DELETE FROM screens').run();
        db.prepare('DELETE FROM interface_sections').run();
      }

      const insertScreen = db.prepare(`
        INSERT OR REPLACE INTO screens (id, name, parent_screen_id)
        VALUES (?, ?, ?)
      `);
      for (const s of screens) {
        insertScreen.run(s.id, s.name, s.parent_screen_id || null);
      }

      const insertSection = db.prepare(`
        INSERT OR REPLACE INTO interface_sections (id, name, x, y, width, height, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      for (const section of sections) {
        insertSection.run(section.id, section.name, section.x, section.y, section.width, section.height);
      }

      const insertCmd = db.prepare(`
        INSERT OR REPLACE INTO contextual_commands 
        (id, screen_id, gesture_code, sub_context, action_type, action_payload, haptic_pattern, created_by, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      for (const c of commands) {
        const payloadStr = typeof c.action_payload === 'string' ? c.action_payload : JSON.stringify(c.action_payload);
        insertCmd.run(
          c.id || `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          c.screen_id,
          c.gesture_code,
          c.sub_context || 'DEFAULT',
          c.action_type,
          payloadStr,
          c.haptic_pattern || 'short',
          c.created_by || 'IMPORT'
        );
      }
    });

    importTx();
    broadcastEvent('CONFIG_IMPORTED', { screens_count: screens.length, sections_count: sections.length, commands_count: commands.length });
    res.json({ success: true, message: 'Configuration imported successfully.' });
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
