import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve('server/blindeye.db');
const db = new Database(dbPath);

const insertCmd = db.prepare(`
  INSERT OR REPLACE INTO contextual_commands (id, screen_id, gesture_code, sub_context, action_type, action_payload, haptic_pattern, created_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

insertCmd.run('cmd_tut_swipe_down', 'gestureTrainingScreen', 'SWIPE_DOWN', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'welcomeScreen', tts: 'Exited tutorial. Returned to Welcome screen.' }), 'short', 'AI_PROGRAMMER');
console.log('Successfully inserted cmd_tut_swipe_down into blindeye.db');
db.close();
