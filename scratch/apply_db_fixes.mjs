import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const jsonPath = path.resolve(__dirname, '../contextual_commands.json');

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log('Initial command count:', data.commands.length);

// 1. Remove duplicate orphan commands for navActiveGuidanceScreen
data.commands = data.commands.filter(c => !['cmd_nava1', 'cmd_nava2', 'cmd_nava4'].includes(c.id));

// 2. Fix cmd_navp3 target to navActiveRouteScreen
const navp3 = data.commands.find(c => c.id === 'cmd_navp3');
if (navp3) {
  navp3.action_payload.target = 'navActiveRouteScreen';
}

// 3. Fix navSearchInputScreen cmd_navsrc1 sub_context
const navsrc1 = data.commands.find(c => c.id === 'cmd_navsrc1');
if (navsrc1) {
  navsrc1.sub_context = 'zone_main_viewport_content';
}

// 4. Add settingsTutorialMenu browse gestures if not present
if (!data.commands.some(c => c.id === 'cmd_sett_next')) {
  data.commands.push({
    id: 'cmd_sett_next',
    screen_id: 'settingsTutorialMenu',
    gesture_code: 'SWIPE_RIGHT',
    sub_context: 'zone_bottom_navigation_bar_global',
    action_type: 'NAVIGATE_NEXT',
    action_payload: {
      tts: 'Tutorial Mode. Double tap to restart orientation.'
    },
    haptic_pattern: 'short',
    created_by: 'AI_PROGRAMMER',
    updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
  });
}

if (!data.commands.some(c => c.id === 'cmd_sett_prev')) {
  data.commands.push({
    id: 'cmd_sett_prev',
    screen_id: 'settingsTutorialMenu',
    gesture_code: 'SWIPE_LEFT',
    sub_context: 'zone_bottom_navigation_bar_global',
    action_type: 'NAVIGATE_PREV',
    action_payload: {
      tts: 'Tutorial Mode. Double tap to restart orientation.'
    },
    haptic_pattern: 'short',
    created_by: 'AI_PROGRAMMER',
    updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
  });
}

// 5. Add gestureTrainingScreen commands
const trainingCommands = [
  {
    id: 'cmd_tut_tap_confirm',
    screen_id: 'gestureTrainingScreen',
    gesture_code: 'TAP',
    sub_context: 'zone_bottom_navigation_bar_global',
    action_type: 'CONFIRM_STEP',
    action_payload: { tts: 'Step confirmed.' },
    haptic_pattern: 'success'
  },
  {
    id: 'cmd_tut_long_press_exit',
    screen_id: 'gestureTrainingScreen',
    gesture_code: 'LONG_PRESS',
    sub_context: 'DEFAULT',
    action_type: 'NAVIGATE',
    action_payload: { target: 'welcomeScreen', tts: 'Exited tutorial. Returned to Welcome screen.' },
    haptic_pattern: 'short'
  },
  {
    id: 'cmd_tut_swipe_down_exit',
    screen_id: 'gestureTrainingScreen',
    gesture_code: 'SWIPE_DOWN',
    sub_context: 'DEFAULT',
    action_type: 'NAVIGATE',
    action_payload: { target: 'welcomeScreen', tts: 'Exited tutorial. Returned to Welcome screen.' },
    haptic_pattern: 'short'
  }
];

for (const tc of trainingCommands) {
  if (!data.commands.some(c => c.id === tc.id)) {
    data.commands.push({
      ...tc,
      created_by: 'AI_PROGRAMMER',
      updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
    });
  }
}

// 6. Add onboardingConfigScreen commands
const onboardingCommands = [
  {
    id: 'cmd_onb_cfg_next',
    screen_id: 'onboardingConfigScreen',
    gesture_code: 'SWIPE_RIGHT',
    sub_context: 'zone_bottom_navigation_bar_global',
    action_type: 'NAVIGATE_NEXT',
    action_payload: { tts: 'Next configuration option.' },
    haptic_pattern: 'short'
  },
  {
    id: 'cmd_onb_cfg_prev',
    screen_id: 'onboardingConfigScreen',
    gesture_code: 'SWIPE_LEFT',
    sub_context: 'zone_bottom_navigation_bar_global',
    action_type: 'NAVIGATE_PREV',
    action_payload: { tts: 'Previous configuration option.' },
    haptic_pattern: 'short'
  },
  {
    id: 'cmd_onb_cfg_select',
    screen_id: 'onboardingConfigScreen',
    gesture_code: 'DOUBLE_TAP',
    sub_context: 'zone_bottom_navigation_bar_global',
    action_type: 'SELECT_ITEM',
    action_payload: { target: 'mainMenuScreen', tts: 'Configuration saved. Entering Main Menu.' },
    haptic_pattern: 'success'
  },
  {
    id: 'cmd_onb_cfg_back',
    screen_id: 'onboardingConfigScreen',
    gesture_code: 'SWIPE_DOWN',
    sub_context: 'DEFAULT',
    action_type: 'NAVIGATE',
    action_payload: { target: 'welcomeScreen', tts: 'Returned to Welcome Screen.' },
    haptic_pattern: 'short'
  }
];

for (const oc of onboardingCommands) {
  if (!data.commands.some(c => c.id === oc.id)) {
    data.commands.push({
      ...oc,
      created_by: 'AI_PROGRAMMER',
      updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
    });
  }
}

// Sort commands alphabetically by screen_id then id for clean readability
data.commands.sort((a, b) => {
  if (a.screen_id === b.screen_id) {
    return a.id.localeCompare(b.id);
  }
  return a.screen_id.localeCompare(b.screen_id);
});

// Update root count
data.count = data.commands.length;

fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
console.log('Updated command count in JSON:', data.count);
