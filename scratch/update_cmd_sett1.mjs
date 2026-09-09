import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve('server/blindeye.db');
const db = new Database(dbPath);

const updateCmd = db.prepare(`
  UPDATE contextual_commands 
  SET action_payload = ? 
  WHERE id = 'cmd_sett1'
`);

updateCmd.run(JSON.stringify({ target: 'gestureTrainingScreen', tts: 'Restarting tutorial. Locate Navigation Bar.' }));
console.log('Successfully updated cmd_sett1 in contextual_commands table in blindeye.db');
db.close();
