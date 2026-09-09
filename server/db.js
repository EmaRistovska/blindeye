import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.BLINDEYE_DB_PATH || path.join(__dirname, 'blindeye.db');
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

    CREATE TABLE IF NOT EXISTS interface_sections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      screen_id TEXT DEFAULT 'GLOBAL',
      x REAL NOT NULL,
      y REAL NOT NULL,
      width REAL NOT NULL,
      height REAL NOT NULL,
      color TEXT DEFAULT '#EF4444',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    db.exec(`ALTER TABLE interface_sections ADD COLUMN screen_id TEXT DEFAULT 'GLOBAL'`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE interface_sections ADD COLUMN color TEXT DEFAULT '#EF4444'`);
  } catch (e) {}

  // Migrate / unify duplicate messagesView into messagesScreen & bind fixed nav zone
  try {
    db.prepare(`UPDATE screens SET parent_screen_id = 'messagesScreen' WHERE parent_screen_id = 'messagesView'`).run();
    db.prepare(`UPDATE contextual_commands SET screen_id = 'messagesScreen' WHERE screen_id = 'messagesView'`).run();
    db.prepare(`UPDATE contextual_commands SET action_payload = REPLACE(action_payload, '"target":"messagesView"', '"target":"messagesScreen"') WHERE action_payload LIKE '%messagesView%'`).run();
    db.prepare(`DELETE FROM contextual_commands WHERE id LIKE 'cmd_messagesView_%'`).run();
    db.prepare(`DELETE FROM screens WHERE id = 'messagesView'`).run();
    db.prepare(`UPDATE contextual_commands SET sub_context = 'zone_bottom_navigation_bar_global' WHERE screen_id = 'messagesScreen' AND gesture_code IN ('SWIPE_RIGHT', 'SWIPE_LEFT', 'DOUBLE_TAP')`).run();
  } catch (e) {}

  // Migrate / unify duplicate phoneView and callsScreen into phoneCategoryMenu
  try {
    db.prepare(`UPDATE screens SET parent_screen_id = 'phoneCategoryMenu' WHERE parent_screen_id IN ('phoneView', 'callsScreen')`).run();
    db.prepare(`DELETE FROM contextual_commands WHERE screen_id IN ('phoneView', 'callsScreen') OR id LIKE 'cmd_callsScreen_%' OR id LIKE 'cmd_phoneView_%'`).run();
    db.prepare(`UPDATE contextual_commands SET action_payload = REPLACE(action_payload, '"target":"callsScreen"', '"target":"phoneCategoryMenu"') WHERE action_payload LIKE '%callsScreen%'`).run();
    db.prepare(`UPDATE contextual_commands SET action_payload = REPLACE(action_payload, '"target":"phoneView"', '"target":"phoneCategoryMenu"') WHERE action_payload LIKE '%phoneView%'`).run();
    db.prepare(`DELETE FROM screens WHERE id IN ('callsScreen', 'phoneView')`).run();
  } catch (e) {}

  // Migrate / unify duplicate cameraView and cameraScreen into cameraCategoryMenu
  try {
    db.prepare(`INSERT OR IGNORE INTO screens (id, name, parent_screen_id) VALUES ('cameraCategoryMenu', 'Camera Categories Menu', 'mainMenuScreen')`).run();
    db.prepare(`UPDATE screens SET parent_screen_id = 'cameraCategoryMenu' WHERE parent_screen_id IN ('cameraView', 'cameraScreen')`).run();
    db.prepare(`UPDATE contextual_commands SET screen_id = 'cameraCategoryMenu', id = REPLACE(id, 'cmd_cameraView_', 'cmd_cameraCategoryMenu_') WHERE screen_id = 'cameraView'`).run();
    db.prepare(`DELETE FROM contextual_commands WHERE screen_id IN ('cameraView', 'cameraScreen') OR id LIKE 'cmd_cameraScreen_%'`).run();
    db.prepare(`UPDATE contextual_commands SET action_payload = REPLACE(action_payload, '"target":"cameraView"', '"target":"cameraCategoryMenu"') WHERE action_payload LIKE '%cameraView%'`).run();
    db.prepare(`UPDATE contextual_commands SET action_payload = REPLACE(action_payload, '"target":"cameraScreen"', '"target":"cameraCategoryMenu"') WHERE action_payload LIKE '%cameraScreen%'`).run();
    db.prepare(`DELETE FROM screens WHERE id IN ('cameraView', 'cameraScreen')`).run();
  } catch (e) {}

  // Migrate / unify duplicate navigationView and navigationScreen into navCategoryMenu
  try {
    db.prepare(`UPDATE screens SET parent_screen_id = 'navCategoryMenu' WHERE parent_screen_id IN ('navigationView', 'navigationScreen')`).run();
    db.prepare(`DELETE FROM contextual_commands WHERE screen_id IN ('navigationView', 'navigationScreen') OR id LIKE 'cmd_navigationView_%' OR id LIKE 'cmd_navigationScreen_%'`).run();
    db.prepare(`UPDATE contextual_commands SET action_payload = REPLACE(action_payload, '"target":"navigationView"', '"target":"navCategoryMenu"') WHERE action_payload LIKE '%navigationView%'`).run();
    db.prepare(`UPDATE contextual_commands SET action_payload = REPLACE(action_payload, '"target":"navigationScreen"', '"target":"navCategoryMenu"') WHERE action_payload LIKE '%navigationScreen%'`).run();
    db.prepare(`DELETE FROM screens WHERE id IN ('navigationView', 'navigationScreen')`).run();
  } catch (e) {}

  // Migrate / unify duplicate settingsView and settingsScreen into settingsCategoryMenu
  try {
    db.prepare(`UPDATE screens SET parent_screen_id = 'settingsCategoryMenu' WHERE parent_screen_id IN ('settingsView', 'settingsScreen')`).run();
    db.prepare(`DELETE FROM contextual_commands WHERE screen_id IN ('settingsView', 'settingsScreen') OR id LIKE 'cmd_settingsView_%' OR id LIKE 'cmd_settingsScreen_%'`).run();
    db.prepare(`UPDATE contextual_commands SET action_payload = REPLACE(action_payload, '"target":"settingsView"', '"target":"settingsCategoryMenu"') WHERE action_payload LIKE '%settingsView%'`).run();
    db.prepare(`UPDATE contextual_commands SET action_payload = REPLACE(action_payload, '"target":"settingsScreen"', '"target":"settingsCategoryMenu"') WHERE action_payload LIKE '%settingsScreen%'`).run();
    db.prepare(`DELETE FROM screens WHERE id IN ('settingsView', 'settingsScreen')`).run();
  } catch (e) {}

  // Seed default interface sections (Fixed zones)
  const insertSection = db.prepare(`INSERT OR REPLACE INTO interface_sections (id, name, screen_id, x, y, width, height, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  insertSection.run('zone_bottom_navigation_bar_global', 'Bottom Navigation Bar', 'GLOBAL', 0, 75, 100, 25, '#00E5FF');
  insertSection.run('zone_top_status_bar_global', 'Top Status Bar', 'GLOBAL', 0, 0, 100, 20, '#00E5FF');

  // Seed default screens
  const insertScreen = db.prepare(`INSERT OR REPLACE INTO screens (id, name, parent_screen_id) VALUES (?, ?, ?)`);
  
  insertScreen.run('landingScreen', 'Landing & Mode Select', null);
  insertScreen.run('welcomeScreen', 'Welcome & Orientation', null);
  insertScreen.run('gestureTrainingScreen', 'Gesture Orientation & Training', 'welcomeScreen');
  insertScreen.run('onboardingConfigScreen', 'System Permissions & Setup', 'gestureTrainingScreen');
  insertScreen.run('onboardingAuthScreen', 'Biometric Device Login', null);
  insertScreen.run('tutorialScreen', 'Letter Calibration & Tutorial', null);
  insertScreen.run('mainMenuScreen', 'Main Menu Categories', null);
  
  // Messages Hierarchy (messagesView unified as messagesScreen)
  insertScreen.run('messagesScreen', 'Messages Screen & Detail', 'mainMenuScreen');
  insertScreen.run('msgPrivacyReaderReplyScreen', 'Message Privacy Reader & Morse Reply', 'messagesScreen');
  
  // Phone Hierarchy (phoneCategoryMenu as canonical root)
  insertScreen.run('phoneCategoryMenu', 'Phone Categories Menu', 'mainMenuScreen');
  insertScreen.run('contactsListScreen', 'Contacts Directory', 'phoneCategoryMenu');
  insertScreen.run('recentsListScreen', 'Recent Calls (Incoming, Missed, Outgoing)', 'phoneCategoryMenu');
  insertScreen.run('recentCallsScreen', 'Recent Calls List', 'phoneCategoryMenu');
  insertScreen.run('contactActionMenuScreen', 'Contact Actions Menu', 'contactsListScreen');
  insertScreen.run('favoritesListScreen', 'Favorite Contacts', 'phoneCategoryMenu');
  insertScreen.run('emergencyContactsListScreen', 'Emergency Contacts List', 'phoneCategoryMenu');
  insertScreen.run('handwritingDialerScreen', 'Handwriting Keypad Dialer', 'phoneCategoryMenu');
  insertScreen.run('dialerActionMenuScreen', 'Dialer Action Menu', 'handwritingDialerScreen');
  insertScreen.run('dialerCallConfirmScreen', 'Dialer Call Confirmation', 'handwritingDialerScreen');
  insertScreen.run('contactSaveNameInputScreen', 'Save Contact Name (Morse / Voice STT)', 'dialerActionMenuScreen');
  insertScreen.run('activeCallScreen', 'Active Connected Call', null);
  
  // Camera Hierarchy (cameraCategoryMenu as canonical root)
  insertScreen.run('cameraCategoryMenu', 'Camera Categories Menu', 'mainMenuScreen');
  insertScreen.run('cameraActiveHoldScreen', 'Camera Hold & Auto Capture', 'cameraCategoryMenu');
  insertScreen.run('cameraResultScreen', 'Camera OCR / Scene Result', 'cameraCategoryMenu');
  
  // Navigation Hierarchy (navCategoryMenu as canonical root)
  insertScreen.run('navCategoryMenu', 'Navigation Categories Menu', 'mainMenuScreen');
  insertScreen.run('navSearchInputScreen', 'Place Search Input', 'navCategoryMenu');
  insertScreen.run('savedPlacesListScreen', 'Saved Destinations', 'navCategoryMenu');
  insertScreen.run('navPlaceActionMenuScreen', 'Place Actions Menu', 'navCategoryMenu');
  insertScreen.run('navActiveRouteScreen', 'GPS Walking Route Active', 'navCategoryMenu');
  
  // Settings Hierarchy (settingsCategoryMenu as canonical root)
  insertScreen.run('settingsCategoryMenu', 'Settings Categories Menu', 'mainMenuScreen');
  insertScreen.run('settingsAccessibilityMenu', 'Accessibility Preferences', 'settingsCategoryMenu');
  insertScreen.run('settingsQuickAccessScreen', 'Quick Actions Manager', 'settingsCategoryMenu');
  insertScreen.run('settingsAddQuickActionScreen', 'Create Quick Action', 'settingsQuickAccessScreen');
  insertScreen.run('settingsPickTargetScreen', 'Select Quick Action Target', 'settingsAddQuickActionScreen');
  insertScreen.run('settingsTutorialMenu', 'Tutorial Mode Menu', 'settingsCategoryMenu');
  
  insertScreen.run('sosScreen', 'Emergency SOS Countdown & Dispatch', null);

  // Seed default contextual gesture commands
  const insertCmd = db.prepare(`
    INSERT OR REPLACE INTO contextual_commands 
    (id, screen_id, gesture_code, sub_context, action_type, action_payload, haptic_pattern, created_by) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // 1. Landing Screen Commands
  insertCmd.run('cmd_land1', 'landingScreen', 'SWIPE_RIGHT', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'welcomeScreen', tts: 'Entering Welcome screen.' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run('cmd_land2', 'landingScreen', 'DOUBLE_TAP', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'welcomeScreen', tts: 'Entering Welcome screen.' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run('cmd_land3', 'landingScreen', 'SWIPE_LEFT', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'onboardingAuthScreen', tts: 'Opening Biometric Device Login.' }), 'short', 'AI_PROGRAMMER');

  // 2. Welcome & Onboarding Screen Commands
  insertCmd.run('cmd_w1', 'welcomeScreen', 'SWIPE_RIGHT', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'mainMenuScreen', tts: 'Entering Main Menu. Messages focused.' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run('cmd_w2', 'welcomeScreen', 'DOUBLE_TAP', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'mainMenuScreen', tts: 'Entering Main Menu. Messages focused.' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run('cmd_w3', 'welcomeScreen', 'SWIPE_LEFT', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'gestureTrainingScreen', tts: 'Welcome to the gesture tutorial. Starting gesture training and orientation.' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run('cmd_tut_tap_confirm', 'gestureTrainingScreen', 'TAP', 'zone_bottom_navigation_bar_global', 'CONFIRM_STEP', JSON.stringify({ tts: 'Step confirmed.' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run('cmd_tut_long_press_exit', 'gestureTrainingScreen', 'LONG_PRESS', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'welcomeScreen', tts: 'Exited tutorial. Returned to Welcome screen.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_tut_swipe_down_exit', 'gestureTrainingScreen', 'SWIPE_DOWN', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'welcomeScreen', tts: 'Exited tutorial. Returned to Welcome screen.' }), 'short', 'AI_PROGRAMMER');
  
  insertCmd.run('cmd_onb_cfg_next', 'onboardingConfigScreen', 'SWIPE_RIGHT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_NEXT', JSON.stringify({ tts: 'Next configuration option.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_onb_cfg_prev', 'onboardingConfigScreen', 'SWIPE_LEFT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_PREV', JSON.stringify({ tts: 'Previous configuration option.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_onb_cfg_select', 'onboardingConfigScreen', 'DOUBLE_TAP', 'zone_bottom_navigation_bar_global', 'SELECT_ITEM', JSON.stringify({ target: 'mainMenuScreen', tts: 'Configuration saved. Entering Main Menu.' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run('cmd_onb_cfg_back', 'onboardingConfigScreen', 'SWIPE_DOWN', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'welcomeScreen', tts: 'Returned to Welcome Screen.' }), 'short', 'AI_PROGRAMMER');

  // 3. Main Menu Commands (5 Categories Cycle in Fixed Navigation Zone, Long Press returns to Welcome)
  insertCmd.run('cmd_m1', 'mainMenuScreen', 'SWIPE_RIGHT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_NEXT', JSON.stringify({ tts: 'Phone and Contacts. Call favorites and dial numbers. Double tap to open.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_m2', 'mainMenuScreen', 'SWIPE_LEFT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_PREV', JSON.stringify({ tts: 'Settings. Reading mode, haptics and privacy. Double tap to open.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_m3', 'mainMenuScreen', 'DOUBLE_TAP', 'zone_bottom_navigation_bar_global', 'SELECT_ITEM', JSON.stringify({ target: 'messagesScreen', tts: 'Opening Messages.' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run('cmd_m4', 'mainMenuScreen', 'LONG_PRESS', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'welcomeScreen', tts: 'Returning to Welcome screen.' }), 'warning', 'AI_PROGRAMMER');
  insertCmd.run('cmd_m5', 'mainMenuScreen', 'TWO_FINGER_TAP', 'DEFAULT', 'TRIGGER_TTS', JSON.stringify({ tts: 'Status check: Time is 12:00, Battery 85%, Connection is stable.' }), 'success', 'AI_PROGRAMMER');

  // 4. Messages Screen Commands (SWIPE_RIGHT, SWIPE_LEFT, DOUBLE_TAP restricted to Fixed Navigation Zone)
  const msgScreens = ['messagesScreen'];
  for (const sId of msgScreens) {
    insertCmd.run(`cmd_${sId}_1`, sId, 'SWIPE_RIGHT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_NEXT', JSON.stringify({ tts: 'Next message from Doctor Office: Your prescription is ready for pickup.' }), 'short', 'AI_PROGRAMMER');
    insertCmd.run(`cmd_${sId}_2`, sId, 'SWIPE_LEFT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_PREV', JSON.stringify({ tts: 'Previous message from Mother: Where are you? When are you coming home?' }), 'short', 'AI_PROGRAMMER');
    insertCmd.run(`cmd_${sId}_3`, sId, 'DOUBLE_TAP', 'zone_bottom_navigation_bar_global', 'READ_MESSAGE', JSON.stringify({ target: 'msgPrivacyReaderReplyScreen', tts: 'Opening Private Message Reader.' }), 'success', 'AI_PROGRAMMER');
    insertCmd.run(`cmd_${sId}_5`, sId, 'SWIPE_DOWN', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'mainMenuScreen', tts: 'Returning to Main Menu.' }), 'short', 'AI_PROGRAMMER');
  }

  // Privacy Reader & Composer Commands
  insertCmd.run('cmd_msgp1', 'msgPrivacyReaderReplyScreen', 'SWIPE_RIGHT', 'DEFAULT', 'COMMIT_MORSE_SPACE', JSON.stringify({ tts: 'Space' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_msgp2', 'msgPrivacyReaderReplyScreen', 'SWIPE_LEFT', 'DEFAULT', 'DELETE_CHAR', JSON.stringify({ tts: 'Delete character' }), 'warning', 'AI_PROGRAMMER');
  insertCmd.run('cmd_msgp3', 'msgPrivacyReaderReplyScreen', 'SWIPE_UP', 'DEFAULT', 'READ_DRAFT', JSON.stringify({ tts: 'Draft message: I will be home in 10 minutes. Double tap bottom navigation bar to send.' }), 'warning', 'AI_PROGRAMMER');
  insertCmd.run('cmd_msgp_send', 'msgPrivacyReaderReplyScreen', 'DOUBLE_TAP', 'zone_bottom_navigation_bar_global', 'SEND_MESSAGE', JSON.stringify({ target: 'messagesScreen', tts: 'Reply message sent successfully. Returning to messages list.' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run('cmd_msgp5', 'msgPrivacyReaderReplyScreen', 'SWIPE_DOWN', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'messagesScreen', tts: 'Exited privacy screen. Returned to message list.' }), 'short', 'AI_PROGRAMMER');

  // 5. Phone Category Menu Commands (SWIPE_RIGHT, SWIPE_LEFT, DOUBLE_TAP restricted to Fixed Navigation Zone)
  const sId = 'phoneCategoryMenu';
  insertCmd.run(`cmd_${sId}_1`, sId, 'SWIPE_RIGHT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_NEXT', JSON.stringify({ tts: 'Favorites. Quick access favorite contacts. Double tap to open.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run(`cmd_${sId}_2`, sId, 'SWIPE_LEFT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_PREV', JSON.stringify({ tts: 'Handwriting Dialer. Draw numbers on screen to call. Double tap to open.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run(`cmd_${sId}_3`, sId, 'DOUBLE_TAP', 'zone_bottom_navigation_bar_global', 'SELECT_ITEM', JSON.stringify({ target: 'contactsListScreen', tts: 'Opening Contacts Directory.' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run(`cmd_${sId}_5`, sId, 'SWIPE_DOWN', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'mainMenuScreen', tts: 'Returning to Main Menu.' }), 'short', 'AI_PROGRAMMER');

  insertCmd.run('cmd_cnt1', 'contactsListScreen', 'SWIPE_RIGHT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_NEXT', JSON.stringify({ tts: 'Doctor Office. Phone: +389 72 555 112. Double tap for action menu.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_cnt2', 'contactsListScreen', 'SWIPE_LEFT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_PREV', JSON.stringify({ tts: 'Mother. Phone: +389 70 123 456. Double tap for action menu.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_cnt3', 'contactsListScreen', 'DOUBLE_TAP', 'zone_bottom_navigation_bar_global', 'SELECT_ITEM', JSON.stringify({ target: 'contactActionMenuScreen', tts: 'Opening contact actions menu.' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run('cmd_cnt5', 'contactsListScreen', 'SWIPE_DOWN', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'phoneCategoryMenu', tts: 'Returned to Phone Menu.' }), 'short', 'AI_PROGRAMMER');

  insertCmd.run('cmd_fav1', 'favoritesListScreen', 'SWIPE_RIGHT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_NEXT', JSON.stringify({ tts: 'Favorite contact: Caregiver Elena. Phone: +389 75 999 888. Double tap to call.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_fav2', 'favoritesListScreen', 'SWIPE_LEFT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_PREV', JSON.stringify({ tts: 'Favorite contact: Mother. Phone: +389 70 123 456. Double tap to call.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_fav3', 'favoritesListScreen', 'DOUBLE_TAP', 'zone_bottom_navigation_bar_global', 'CALL_CONTACT', JSON.stringify({ target: 'activeCallScreen', tts: 'Calling Mother now.' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run('cmd_fav5', 'favoritesListScreen', 'SWIPE_DOWN', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'phoneCategoryMenu', tts: 'Returned to Phone Menu.' }), 'short', 'AI_PROGRAMMER');

  insertCmd.run('cmd_emg1', 'emergencyContactsListScreen', 'SWIPE_RIGHT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_NEXT', JSON.stringify({ tts: 'Emergency service: 112 Police & Ambulance. Double tap to call.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_emg2', 'emergencyContactsListScreen', 'SWIPE_LEFT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_PREV', JSON.stringify({ tts: 'Emergency contact: Mother. Phone: +389 70 123 456. Double tap to call.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_emg3', 'emergencyContactsListScreen', 'DOUBLE_TAP', 'zone_bottom_navigation_bar_global', 'CALL_CONTACT', JSON.stringify({ target: 'activeCallScreen', tts: 'Speed dial: Calling Mother immediately.' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run('cmd_emg5', 'emergencyContactsListScreen', 'SWIPE_DOWN', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'phoneCategoryMenu', tts: 'Returned to Phone Menu.' }), 'short', 'AI_PROGRAMMER');

  insertCmd.run('cmd_dlr1', 'handwritingDialerScreen', 'SWIPE_LEFT', 'zone_bottom_navigation_bar_global', 'DELETE_DIGIT', JSON.stringify({ tts: 'Deleted last dialed digit.' }), 'warning', 'AI_PROGRAMMER');
  insertCmd.run('cmd_dlr2', 'handwritingDialerScreen', 'SWIPE_UP', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'dialerActionMenuScreen', tts: 'Number ready. Opening action menu: Call number or save to contacts.' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run('cmd_dlr3', 'handwritingDialerScreen', 'SWIPE_RIGHT', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'dialerActionMenuScreen', tts: 'Action menu: Call number or save to contacts.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_dlr5', 'handwritingDialerScreen', 'SWIPE_DOWN', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'phoneCategoryMenu', tts: 'Returned to Phone Menu.' }), 'short', 'AI_PROGRAMMER');

  insertCmd.run('cmd_dlract1', 'dialerActionMenuScreen', 'SWIPE_RIGHT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_NEXT', JSON.stringify({ tts: 'Next dialer action.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_dlract2', 'dialerActionMenuScreen', 'SWIPE_LEFT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_PREV', JSON.stringify({ tts: 'Previous dialer action.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_dlract3', 'dialerActionMenuScreen', 'DOUBLE_TAP', 'zone_bottom_navigation_bar_global', 'EXECUTE_ACTION', JSON.stringify({ tts: 'Executing dialer action.' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run('cmd_dlract5', 'dialerActionMenuScreen', 'SWIPE_DOWN', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'handwritingDialerScreen', tts: 'Returned to dialer.' }), 'short', 'AI_PROGRAMMER');

  // contactSaveNameInputScreen commands
  insertCmd.run('cmd_cntsave1', 'contactSaveNameInputScreen', 'TAP', 'DEFAULT', 'TYPE_MORSE_DOT', JSON.stringify({ tts: 'Dot' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_cntsave2', 'contactSaveNameInputScreen', 'LONG_PRESS', 'DEFAULT', 'TYPE_MORSE_DASH', JSON.stringify({ tts: 'Dash' }), 'long', 'AI_PROGRAMMER');
  insertCmd.run('cmd_cntsave3', 'contactSaveNameInputScreen', 'SWIPE_LEFT', 'zone_bottom_navigation_bar_global', 'DELETE_CHAR', JSON.stringify({ tts: 'Deleted character.' }), 'warning', 'AI_PROGRAMMER');
  insertCmd.run('cmd_cntsave4', 'contactSaveNameInputScreen', 'SWIPE_UP', 'DEFAULT', 'READ_DRAFT', JSON.stringify({ tts: 'Draft name confirmation.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_cntsave_space', 'contactSaveNameInputScreen', 'SWIPE_RIGHT', 'zone_bottom_navigation_bar_global', 'COMMIT_MORSE_SPACE', JSON.stringify({ tts: 'Space added.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_cntsave5', 'contactSaveNameInputScreen', 'DOUBLE_TAP', 'zone_bottom_navigation_bar_global', 'SAVE_CONTACT', JSON.stringify({ target: 'contactsListScreen', tts: 'Contact saved.' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run('cmd_cntsave6', 'contactSaveNameInputScreen', 'SWIPE_DOWN', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'dialerActionMenuScreen', tts: 'Cancelled saving contact.' }), 'short', 'AI_PROGRAMMER');

  // recentsListScreen commands (mirror of recentCallsScreen)
  insertCmd.run('cmd_rec1', 'recentsListScreen', 'SWIPE_RIGHT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_NEXT', JSON.stringify({ tts: 'Next recent call.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_rec2', 'recentsListScreen', 'SWIPE_LEFT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_PREV', JSON.stringify({ tts: 'Previous recent call.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_rec3', 'recentsListScreen', 'DOUBLE_TAP', 'zone_bottom_navigation_bar_global', 'CALL_CONTACT', JSON.stringify({ target: 'activeCallScreen', tts: 'Calling contact now.' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run('cmd_rec5', 'recentsListScreen', 'SWIPE_DOWN', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'phoneCategoryMenu', tts: 'Returned to Phone Menu.' }), 'short', 'AI_PROGRAMMER');

  // navActiveRouteScreen commands
  insertCmd.run('cmd_navrt1', 'navActiveRouteScreen', 'SWIPE_RIGHT', 'DEFAULT', 'ADVANCE_STEP', JSON.stringify({ tts: 'Next navigation step.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_navrt2', 'navActiveRouteScreen', 'DOUBLE_TAP', 'DEFAULT', 'ADVANCE_STEP', JSON.stringify({ tts: 'Step confirmed. Continuing route.' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run('cmd_navrt4', 'navActiveRouteScreen', 'SWIPE_DOWN', 'DEFAULT', 'STOP_ROUTE', JSON.stringify({ target: 'navPlaceActionMenuScreen', tts: 'Navigation route stopped. Returned to place options.' }), 'warning', 'AI_PROGRAMMER');

  insertCmd.run('cmd_call1', 'activeCallScreen', 'DOUBLE_TAP', 'DEFAULT', 'END_CALL', JSON.stringify({ target: 'phoneCategoryMenu', tts: 'Call ended. Returned to phone menu.' }), 'error', 'AI_PROGRAMMER');
  insertCmd.run('cmd_call3', 'activeCallScreen', 'SWIPE_DOWN', 'DEFAULT', 'END_CALL', JSON.stringify({ target: 'phoneCategoryMenu', tts: 'Call ended. Returned to phone menu.' }), 'error', 'AI_PROGRAMMER');

  // 6. Camera Category Menu Commands
  insertCmd.run('cmd_cameraCategoryMenu_1', 'cameraCategoryMenu', 'SWIPE_RIGHT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_NEXT', JSON.stringify({ tts: 'Scan Objects. Hold camera for 3s to describe scene and obstacles. Double tap to start.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_cameraCategoryMenu_2', 'cameraCategoryMenu', 'SWIPE_LEFT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_PREV', JSON.stringify({ tts: 'Read Text OCR. Hold camera for 3s to read printed text. Double tap to start.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_cameraCategoryMenu_3', 'cameraCategoryMenu', 'DOUBLE_TAP', 'zone_bottom_navigation_bar_global', 'SELECT_ITEM', JSON.stringify({ target: 'cameraActiveHoldScreen', tts: 'Starting camera. Hold steady for 3 seconds to capture.' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run('cmd_cameraCategoryMenu_5', 'cameraCategoryMenu', 'SWIPE_DOWN', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'mainMenuScreen', tts: 'Returning to Main Menu.' }), 'short', 'AI_PROGRAMMER');

  insertCmd.run('cmd_camh1', 'cameraActiveHoldScreen', 'DOUBLE_TAP', 'DEFAULT', 'AI_OCR_SCAN', JSON.stringify({ target: 'cameraResultScreen', tts: 'Capturing photo and scanning text with AI vision...' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run('cmd_camh3', 'cameraActiveHoldScreen', 'SWIPE_DOWN', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'cameraCategoryMenu', tts: 'Returned to Camera Menu.' }), 'short', 'AI_PROGRAMMER');

  insertCmd.run('cmd_camr1', 'cameraResultScreen', 'DOUBLE_TAP', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'cameraActiveHoldScreen', tts: 'Retaking photo. Hold camera steady.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_camr2', 'cameraResultScreen', 'SWIPE_RIGHT', 'DEFAULT', 'TRIGGER_TTS', JSON.stringify({ tts: 'Replaying recognized text.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_camr3', 'cameraResultScreen', 'SWIPE_LEFT', 'DEFAULT', 'PLAY_MORSE', JSON.stringify({ tts: 'Playing Morse vibration sequence.' }), 'warning', 'AI_PROGRAMMER');
  insertCmd.run('cmd_camr5', 'cameraResultScreen', 'SWIPE_DOWN', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'cameraCategoryMenu', tts: 'Returned to Camera Menu.' }), 'short', 'AI_PROGRAMMER');

  // 7. Navigation Category Menu Commands (SWIPE_RIGHT, SWIPE_LEFT, DOUBLE_TAP restricted to Fixed Navigation Zone)
  insertCmd.run('cmd_navCategoryMenu_1', 'navCategoryMenu', 'SWIPE_RIGHT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_NEXT', JSON.stringify({ tts: 'Saved Places. Quick access saved destinations. Double tap to open.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_navCategoryMenu_2', 'navCategoryMenu', 'SWIPE_LEFT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_PREV', JSON.stringify({ tts: 'Navigate to Place. Enter or speak a destination. Double tap to open.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_navCategoryMenu_3', 'navCategoryMenu', 'DOUBLE_TAP', 'zone_bottom_navigation_bar_global', 'SELECT_ITEM', JSON.stringify({ target: 'navSearchInputScreen', tts: 'Opening Place Finder.' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run('cmd_navCategoryMenu_5', 'navCategoryMenu', 'SWIPE_DOWN', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'mainMenuScreen', tts: 'Returning to Main Menu.' }), 'short', 'AI_PROGRAMMER');

  insertCmd.run('cmd_navs1', 'savedPlacesListScreen', 'SWIPE_RIGHT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_NEXT', JSON.stringify({ tts: 'Doctor Office: Mother Teresa Clinic Center. 1.2 km away. Double tap for actions.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_navs2', 'savedPlacesListScreen', 'SWIPE_LEFT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_PREV', JSON.stringify({ tts: 'Home: Partizanska 45. 450m away. Double tap for actions.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_navs3', 'savedPlacesListScreen', 'DOUBLE_TAP', 'zone_bottom_navigation_bar_global', 'SELECT_ITEM', JSON.stringify({ target: 'navPlaceActionMenuScreen', tts: 'Opening place actions menu.' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run('cmd_navs5', 'savedPlacesListScreen', 'SWIPE_DOWN', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'navCategoryMenu', tts: 'Returned to Navigation Menu.' }), 'short', 'AI_PROGRAMMER');

  insertCmd.run('cmd_navsrc1', 'navSearchInputScreen', 'TAP', 'zone_main_viewport_content', 'TYPE_MORSE_DOT', JSON.stringify({ tts: 'Dot.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_navsrc2_lp', 'navSearchInputScreen', 'LONG_PRESS', 'DEFAULT', 'TYPE_MORSE_DASH', JSON.stringify({ tts: 'Dash.' }), 'long', 'AI_PROGRAMMER');
  insertCmd.run('cmd_navsrc3', 'navSearchInputScreen', 'SWIPE_LEFT', 'DEFAULT', 'DELETE_CHAR', JSON.stringify({ tts: 'Deleted last character.' }), 'warning', 'AI_PROGRAMMER');
  insertCmd.run('cmd_navsrc4', 'navSearchInputScreen', 'SWIPE_UP', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'navPlaceActionMenuScreen', tts: 'Destination confirmed. Opening place options.' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run('cmd_navsrc5', 'navSearchInputScreen', 'SWIPE_RIGHT', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'navPlaceActionMenuScreen', tts: 'Destination confirmed. Opening place options.' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run('cmd_navsrc6', 'navSearchInputScreen', 'DOUBLE_TAP', 'DEFAULT', 'SELECT_ITEM', JSON.stringify({ target: 'navPlaceActionMenuScreen', tts: 'Opening place options.' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run('cmd_navsrc7', 'navSearchInputScreen', 'SWIPE_DOWN', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'navCategoryMenu', tts: 'Returned to Navigation Menu.' }), 'short', 'AI_PROGRAMMER');

  insertCmd.run('cmd_navp1', 'navPlaceActionMenuScreen', 'SWIPE_RIGHT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_NEXT', JSON.stringify({ tts: 'Next place action: Call Place, Start GPS Guide, or Share Location.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_navp2', 'navPlaceActionMenuScreen', 'SWIPE_LEFT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_PREV', JSON.stringify({ tts: 'Previous place action.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_navp3', 'navPlaceActionMenuScreen', 'DOUBLE_TAP', 'zone_bottom_navigation_bar_global', 'START_GPS_GUIDE', JSON.stringify({ target: 'navActiveRouteScreen', tts: 'GPS navigation started. In 25 meters, turn right.' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run('cmd_navp5', 'navPlaceActionMenuScreen', 'SWIPE_DOWN', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'savedPlacesListScreen', tts: 'Cancelled. Returned to saved places.' }), 'short', 'AI_PROGRAMMER');

  // 8. Settings Category Menu Commands (SWIPE_RIGHT, SWIPE_LEFT, DOUBLE_TAP on Fixed Nav Bar)
  insertCmd.run('cmd_settingsCategoryMenu_1', 'settingsCategoryMenu', 'SWIPE_RIGHT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_NEXT', JSON.stringify({ tts: 'Accessibility Preferences. Customize reading modes, high contrast, and haptic feedback. Double tap to open.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_settingsCategoryMenu_2', 'settingsCategoryMenu', 'SWIPE_LEFT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_PREV', JSON.stringify({ tts: 'Tutorial Mode. Replay gestures and system guide. Double tap to open.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_settingsCategoryMenu_3', 'settingsCategoryMenu', 'DOUBLE_TAP', 'zone_bottom_navigation_bar_global', 'SELECT_ITEM', JSON.stringify({ target: 'settingsAccessibilityMenu', tts: 'Opening Accessibility Preferences.' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run('cmd_settingsCategoryMenu_5', 'settingsCategoryMenu', 'SWIPE_DOWN', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'mainMenuScreen', tts: 'Returning to Main Menu.' }), 'short', 'AI_PROGRAMMER');

  insertCmd.run('cmd_seta1', 'settingsAccessibilityMenu', 'SWIPE_RIGHT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_NEXT', JSON.stringify({ tts: 'Next preference: Morse Code Speed (Slow, Medium, Fast) or Vibration Intensity.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_seta2', 'settingsAccessibilityMenu', 'SWIPE_LEFT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_PREV', JSON.stringify({ tts: 'Previous preference: Reading Mode (TTS Only or Morse Only).' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_seta3', 'settingsAccessibilityMenu', 'DOUBLE_TAP', 'zone_bottom_navigation_bar_global', 'CYCLE_SETTING', JSON.stringify({ tts: 'Setting value changed.' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run('cmd_seta5', 'settingsAccessibilityMenu', 'SWIPE_DOWN', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'settingsCategoryMenu', tts: 'Returned to Settings Menu.' }), 'short', 'AI_PROGRAMMER');

  insertCmd.run('cmd_setq1', 'settingsQuickAccessScreen', 'SWIPE_RIGHT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_NEXT', JSON.stringify({ tts: 'Quick Action 2 of 4: Route to Home. Status: Enabled.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_setq2', 'settingsQuickAccessScreen', 'SWIPE_LEFT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_PREV', JSON.stringify({ tts: 'Quick Action 1 of 4: Speed Dial Mother. Status: Enabled.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_setq3', 'settingsQuickAccessScreen', 'DOUBLE_TAP', 'DEFAULT', 'TOGGLE_SETTING', JSON.stringify({ tts: 'Quick action status toggled.' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run('cmd_setq4', 'settingsQuickAccessScreen', 'SWIPE_UP', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'settingsAddQuickActionScreen', tts: 'Add new quick action. Choose action type.' }), 'warning', 'AI_PROGRAMMER');
  insertCmd.run('cmd_setq6', 'settingsQuickAccessScreen', 'SWIPE_DOWN', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'settingsCategoryMenu', tts: 'Returned to Settings Menu.' }), 'short', 'AI_PROGRAMMER');

  // settingsAddQuickActionScreen commands
  insertCmd.run('cmd_setaddq_next', 'settingsAddQuickActionScreen', 'SWIPE_RIGHT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_NEXT', JSON.stringify({ tts: 'Next action type.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_setaddq_prev', 'settingsAddQuickActionScreen', 'SWIPE_LEFT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_PREV', JSON.stringify({ tts: 'Previous action type.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_setaddq_dblTap', 'settingsAddQuickActionScreen', 'DOUBLE_TAP', 'zone_bottom_navigation_bar_global', 'SELECT_ITEM', JSON.stringify({ target: 'settingsPickTargetScreen', tts: 'Selected action type. Choose target.' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run('cmd_setaddq_back', 'settingsAddQuickActionScreen', 'SWIPE_DOWN', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'settingsQuickAccessScreen', tts: 'Cancelled. Returned to Quick Access list.' }), 'short', 'AI_PROGRAMMER');

  // settingsPickTargetScreen commands
  insertCmd.run('cmd_setpick_next', 'settingsPickTargetScreen', 'SWIPE_RIGHT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_NEXT', JSON.stringify({ tts: 'Next target.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_setpick_prev', 'settingsPickTargetScreen', 'SWIPE_LEFT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_PREV', JSON.stringify({ tts: 'Previous target.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_setpick_dblTap', 'settingsPickTargetScreen', 'DOUBLE_TAP', 'zone_bottom_navigation_bar_global', 'CREATE_QUICK_ACTION', JSON.stringify({ target: 'settingsQuickAccessScreen', tts: 'Quick action created successfully.' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run('cmd_setpick_back', 'settingsPickTargetScreen', 'SWIPE_DOWN', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'settingsAddQuickActionScreen', tts: 'Cancelled. Returned to action types.' }), 'short', 'AI_PROGRAMMER');

  // settingsTutorialMenu commands
  insertCmd.run('cmd_sett_next', 'settingsTutorialMenu', 'SWIPE_RIGHT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_NEXT', JSON.stringify({ tts: 'Tutorial Mode. Double tap to restart orientation.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_sett_prev', 'settingsTutorialMenu', 'SWIPE_LEFT', 'zone_bottom_navigation_bar_global', 'NAVIGATE_PREV', JSON.stringify({ tts: 'Tutorial Mode. Double tap to restart orientation.' }), 'short', 'AI_PROGRAMMER');
  insertCmd.run('cmd_sett1', 'settingsTutorialMenu', 'DOUBLE_TAP', 'zone_bottom_navigation_bar_global', 'RESTART_TUTORIAL', JSON.stringify({ target: 'gestureTrainingScreen', tts: 'Restarting tutorial. Locate Navigation Bar.' }), 'success', 'AI_PROGRAMMER');
  insertCmd.run('cmd_sett3', 'settingsTutorialMenu', 'SWIPE_DOWN', 'DEFAULT', 'NAVIGATE', JSON.stringify({ target: 'settingsCategoryMenu', tts: 'Returned to Settings Menu.' }), 'short', 'AI_PROGRAMMER');

  // 9. SOS Emergency Commands
  // DOUBLE_TAP on dispatched screen = call emergency contact (Mother)
  insertCmd.run('cmd_sos1', 'sosScreen', 'DOUBLE_TAP', 'DEFAULT', 'CALL_CONTACT', JSON.stringify({ target: 'activeCallScreen', tts: 'Emergency calling Mother on +389 70 123 456.' }), 'sos', 'AI_PROGRAMMER');
  // LONG_PRESS = cancel countdown / dismiss alert
  insertCmd.run('cmd_sos2', 'sosScreen', 'LONG_PRESS', 'DEFAULT', 'CANCEL_SOS', JSON.stringify({ target: 'mainMenuScreen', tts: 'SOS emergency countdown cancelled. Returning to safety.' }), 'warning', 'AI_PROGRAMMER');

  console.log('[DB] Database tables initialized and seeded successfully.');
}

