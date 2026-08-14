import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'blindeye.db');
export const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

export function initDatabase() {
  console.log(`[DB] Initializing database at ${dbPath}...`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS screens (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_screen_id TEXT REFERENCES screens(id)
    );

    CREATE TABLE IF NOT EXISTS contextual_commands (
      id TEXT PRIMARY KEY,
      screen_id TEXT NOT NULL REFERENCES screens(id),
      gesture_code TEXT NOT NULL,
      sub_context TEXT DEFAULT 'DEFAULT',
      action_type TEXT NOT NULL,
      action_payload TEXT NOT NULL,
      haptic_pattern TEXT DEFAULT 'short',
      created_by TEXT DEFAULT 'AI_PROGRAMMER',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_contextual_gesture UNIQUE (screen_id, gesture_code, sub_context)
    );
  `);

  // Seed default screens
  const insertScreen = db.prepare(`INSERT OR IGNORE INTO screens (id, name, parent_screen_id) VALUES (?, ?, ?)`);
  
  insertScreen.run('welcomeScreen', 'Welcome & Orientation', null);
  insertScreen.run('mainMenuScreen', 'Main Menu Categories', null);
  insertScreen.run('messagesView', 'Messages List & Detail', 'mainMenuScreen');
  insertScreen.run('phoneView', 'Phone & Contacts', 'mainMenuScreen');
  insertScreen.run('cameraView', 'Camera & AI Scene OCR', 'mainMenuScreen');
  insertScreen.run('navigationView', 'GPS & Turn-by-Turn Guidance', 'mainMenuScreen');
  insertScreen.run('settingsView', 'Settings & System Preferences', 'mainMenuScreen');

  // Seed default contextual gesture commands
  const insertCmd = db.prepare(`
    INSERT OR REPLACE INTO contextual_commands 
    (id, screen_id, gesture_code, sub_context, action_type, action_payload, haptic_pattern, created_by) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertCmd.run('cmd_w1', 'welcomeScreen', 'SWIPE_RIGHT', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'mainMenuScreen', tts: 'Entering Main Menu.' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run('cmd_w2', 'welcomeScreen', 'DOUBLE_TAP', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'mainMenuScreen', tts: 'Entering Main Menu.' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run('cmd_w3', 'welcomeScreen', 'SWIPE_LEFT', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'gestureTrainingScreen', tts: 'Starting interactive onboarding setup.' }), 'success', 'AI_PROGRAMMER');

  insertCmd.run('cmd_m1', 'mainMenuScreen', 'SWIPE_RIGHT', 'DEFAULT', 'NAVIGATE_NEXT', JSON.stringify({ tts: 'Phone focused.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_m2', 'mainMenuScreen', 'SWIPE_LEFT', 'DEFAULT', 'NAVIGATE_PREV', JSON.stringify({ tts: 'Settings focused.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_m3', 'mainMenuScreen', 'DOUBLE_TAP', 'DEFAULT', 'SELECT_ITEM', JSON.stringify({ tts: 'Category selected.' }), 'success', 'AI_PROGRAMMER');

  insertCmd.run('cmd_c1', 'cameraView', 'DOUBLE_TAP', 'DEFAULT', 'AI_OCR_SCAN', JSON.stringify({ tts: 'Scanning scene with AI vision...' }), 'long', 'AI_PROGRAMMER');
  insertCmd.run('cmd_c2', 'cameraView', 'SWIPE_UP', 'DEFAULT', 'AI_OCR_SCAN', JSON.stringify({ tts: 'Capturing photo for detailed description...' }), 'long', 'AI_PROGRAMMER');

  console.log('[DB] Database tables initialized and seeded successfully.');
}
