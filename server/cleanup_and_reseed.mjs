/**
 * cleanup_and_reseed.mjs
 * Deletes all AI_PROGRAMMER-seeded commands from the live DB and re-imports
 * from the canonical contextual_commands.json. User-created rules are preserved.
 * 
 * Run this WHILE the server is NOT running (to avoid DB lock conflicts).
 * Usage: node server/cleanup_and_reseed.mjs
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, 'blindeye.db');
const jsonPath = path.resolve(__dirname, '../contextual_commands.json');

if (!fs.existsSync(dbPath)) {
  console.error('❌ DB not found at', dbPath);
  process.exit(1);
}
if (!fs.existsSync(jsonPath)) {
  console.error('❌ contextual_commands.json not found at', jsonPath);
  process.exit(1);
}

const db = new Database(dbPath);
db.pragma('foreign_keys = OFF');

// Count before
const before = db.prepare('SELECT COUNT(*) as n FROM contextual_commands').get().n;
const userRules = db.prepare("SELECT COUNT(*) as n FROM contextual_commands WHERE created_by != 'AI_PROGRAMMER'").get().n;

console.log(`[DB] Before cleanup: ${before} total commands, ${userRules} user-created rules preserved.`);

// Step 1: Delete all AI_PROGRAMMER-seeded commands
const deleted = db.prepare("DELETE FROM contextual_commands WHERE created_by = 'AI_PROGRAMMER'").run();
console.log(`[DB] Deleted ${deleted.changes} AI-seeded commands.`);

// Step 2: Re-import from clean JSON
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

const insertScreen = db.prepare(`INSERT OR REPLACE INTO screens (id, name, parent_screen_id) VALUES (?, ?, ?)`);
const insertCmd = db.prepare(`
  INSERT OR REPLACE INTO contextual_commands 
  (id, screen_id, gesture_code, sub_context, action_type, action_payload, haptic_pattern, created_by) 
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const tx = db.transaction(() => {
  let screenCount = 0, cmdCount = 0;

  if (data.screens && Array.isArray(data.screens)) {
    for (const s of data.screens) {
      insertScreen.run(s.id, s.name, s.parent_screen_id || null);
      screenCount++;
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
        c.created_by || 'AI_PROGRAMMER'
      );
      cmdCount++;
    }
  }

  return { screenCount, cmdCount };
});

const { screenCount, cmdCount } = tx();

const after = db.prepare('SELECT COUNT(*) as n FROM contextual_commands').get().n;
console.log(`[DB] Re-seeded ${screenCount} screens and ${cmdCount} AI commands.`);
console.log(`[DB] After cleanup: ${after} total commands (${userRules} user-created preserved).`);
console.log('');
console.log('✅ Done. Restart the server to load the clean rule cache.');

db.close();
