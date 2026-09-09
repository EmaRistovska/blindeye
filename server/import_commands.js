import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, 'blindeye.db');
const jsonPath = path.resolve(__dirname, '../contextual_commands.json');

function importCommands() {
  if (!fs.existsSync(jsonPath)) {
    console.error('File not found:', jsonPath);
    return;
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const db = new Database(dbPath);

  const insertScreen = db.prepare(`
    INSERT OR REPLACE INTO screens (id, name, parent_screen_id) 
    VALUES (?, ?, ?)
  `);

  const insertCmd = db.prepare(`
    INSERT OR REPLACE INTO contextual_commands 
    (id, screen_id, gesture_code, sub_context, action_type, action_payload, haptic_pattern, created_by) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    if (data.screens && Array.isArray(data.screens)) {
      for (const s of data.screens) {
        insertScreen.run(s.id, s.name, s.parent_screen_id || null);
      }
    }

    if (data.commands && Array.isArray(data.commands)) {
      for (const c of data.commands) {
        const payloadStr = typeof c.action_payload === 'string'
          ? c.action_payload
          : JSON.stringify(c.action_payload || {});

        insertCmd.run(
          c.id,
          c.screen_id,
          c.gesture_code,
          c.sub_context || 'DEFAULT',
          c.action_type,
          payloadStr,
          c.haptic_pattern || 'short',
          c.created_by || 'USER'
        );
      }
    }
  });

  tx();
  console.log(`Successfully imported ${data.screens?.length || 0} screens and ${data.commands?.length || 0} commands into blindeye.db!`);
}

importCommands();
