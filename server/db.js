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
  insertScreen.run('sosScreen', 'Emergency SOS Dispatch', null);

  // Seed default contextual gesture commands
  const insertCmd = db.prepare(`
    INSERT OR REPLACE INTO contextual_commands 
    (id, screen_id, gesture_code, sub_context, action_type, action_payload, haptic_pattern, created_by) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Welcome Screen Commands
  insertCmd.run('cmd_w1', 'welcomeScreen', 'SWIPE_RIGHT', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'mainMenuScreen', tts: 'Entering Main Menu. Messages focused.' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run('cmd_w2', 'welcomeScreen', 'DOUBLE_TAP', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'mainMenuScreen', tts: 'Entering Main Menu. Messages focused.' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run('cmd_w3', 'welcomeScreen', 'SWIPE_LEFT', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'onboardingAuthScreen', tts: 'Starting device authentication and setup.' }), 'short', 'AI_PROGRAMMER');

  // Main Menu Commands
  insertCmd.run('cmd_m1', 'mainMenuScreen', 'SWIPE_RIGHT', 'DEFAULT', 'NAVIGATE_NEXT', JSON.stringify({ tts: 'Next category: Phone and Contacts.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_m2', 'mainMenuScreen', 'SWIPE_LEFT', 'DEFAULT', 'NAVIGATE_PREV', JSON.stringify({ tts: 'Previous category: Settings and Preferences.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_m3', 'mainMenuScreen', 'DOUBLE_TAP', 'DEFAULT', 'SELECT_ITEM', JSON.stringify({ target: 'messagesView', tts: 'Opening Messages.' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run('cmd_m4', 'mainMenuScreen', 'LONG_PRESS', 'DEFAULT', 'TRIGGER_TTS', JSON.stringify({ tts: 'Main Menu Help: Swipe right or left inside navigation bar to browse categories, double tap to open.' }), 'long', 'AI_PROGRAMMER');

  // Camera View Commands
  insertCmd.run('cmd_c1', 'cameraView', 'DOUBLE_TAP', 'DEFAULT', 'AI_OCR_SCAN', JSON.stringify({ tts: 'Capturing photo and scanning text with AI vision...' }), 'long', 'AI_PROGRAMMER');
  insertCmd.run('cmd_c2', 'cameraView', 'SWIPE_UP', 'DEFAULT', 'AI_SCENE_DESCRIBE', JSON.stringify({ tts: 'Analyzing environment scene and obstacles in front.' }), 'long', 'AI_PROGRAMMER');
  insertCmd.run('cmd_c3', 'cameraView', 'SWIPE_DOWN', 'DEFAULT', 'TOGGLE_FLASH', JSON.stringify({ tts: 'Camera flashlight toggled.' }), 'short', 'AI_PROGRAMMER');

  // Phone View Commands
  insertCmd.run('cmd_p1', 'phoneView', 'SWIPE_RIGHT', 'DEFAULT', 'NAVIGATE_NEXT', JSON.stringify({ tts: 'Mother: +389 70 123 456. Emergency favorite.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_p2', 'phoneView', 'SWIPE_LEFT', 'DEFAULT', 'NAVIGATE_PREV', JSON.stringify({ tts: 'Doctor Office: +389 72 555 112.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_p3', 'phoneView', 'DOUBLE_TAP', 'DEFAULT', 'CALL_CONTACT', JSON.stringify({ tts: 'Calling Mother now.' }), 'success', 'AI_PROGRAMMER');

  // Messages View Commands
  insertCmd.run('cmd_msg1', 'messagesView', 'SWIPE_RIGHT', 'DEFAULT', 'NAVIGATE_NEXT', JSON.stringify({ tts: 'Message from Mother: Where are you? When are you coming home?' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_msg2', 'messagesView', 'DOUBLE_TAP', 'DEFAULT', 'READ_MESSAGE', JSON.stringify({ tts: 'Reading full message and preparing voice reply.' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run('cmd_msg3', 'messagesView', 'LONG_PRESS', 'DEFAULT', 'PLAY_MORSE', JSON.stringify({ tts: 'Playing Morse haptic vibration for message text.' }), 'warning', 'AI_PROGRAMMER');

  // Navigation View Commands
  insertCmd.run('cmd_nav1', 'navigationView', 'SWIPE_RIGHT', 'DEFAULT', 'NAVIGATE_NEXT', JSON.stringify({ tts: 'Destination: Home (Partizanska 45). 450 meters away.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_nav2', 'navigationView', 'DOUBLE_TAP', 'DEFAULT', 'START_GPS_GUIDE', JSON.stringify({ tts: 'GPS navigation started. In 30 meters, turn right onto Main Street.' }), 'success', 'AI_PROGRAMMER');

  // Settings View Commands
  insertCmd.run('cmd_s1', 'settingsView', 'SWIPE_RIGHT', 'DEFAULT', 'CYCLE_SETTING', JSON.stringify({ tts: 'Reading mode changed to Combined Voice and Morse.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_s2', 'settingsView', 'DOUBLE_TAP', 'DEFAULT', 'TOGGLE_SETTING', JSON.stringify({ tts: 'Haptic vibration intensity set to High.' }), 'success', 'AI_PROGRAMMER');

  // SOS Emergency Commands
  insertCmd.run('cmd_sos1', 'sosScreen', 'DOUBLE_TAP', 'DEFAULT', 'CANCEL_SOS', JSON.stringify({ tts: 'SOS emergency alert cancelled.' }), 'warning', 'AI_PROGRAMMER');
  insertCmd.run('cmd_sos2', 'sosScreen', 'LONG_PRESS', 'DEFAULT', 'DISPATCH_SOS', JSON.stringify({ tts: 'Emergency alert dispatched immediately to Mother and Emergency Services with current GPS coordinates.' }), 'sos', 'AI_PROGRAMMER');

  console.log('[DB] Database tables initialized and seeded successfully.');
}
