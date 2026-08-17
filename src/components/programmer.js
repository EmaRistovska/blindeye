import { createScreen, deleteProgrammerCommand, deleteSection, fetchCommands, fetchScreens, fetchSections, onRuleUpdated, onScreenUpdated, onSectionUpdated, saveProgrammerCommand, saveSection } from '../core/api.js';
import { Haptic } from '../core/haptics.js';
import { navigateTo } from '../core/router.js';
import { Speech } from '../core/speech.js';

const ACTIONS = [
  'SELECT_ITEM',
  'NAVIGATE',
  'NAVIGATE_NEXT',
  'NAVIGATE_PREV',
  'TRIGGER_TTS',
  'READ_MESSAGE',
  'SEND_MESSAGE',
  'PLAY_MORSE',
  'CALL_CONTACT',
  'END_CALL',
  'AI_OCR_SCAN',
  'AI_SCENE_DESCRIBE',
  'TOGGLE_FLASH',
  'START_GPS_GUIDE',
  'CYCLE_SETTING',
  'TOGGLE_SETTING',
  'ADD_QUICK_ACTION',
  'DISPATCH_SOS',
  'CANCEL_SOS',
  'RESTART_TUTORIAL'
];

const ZONE_COLORS = ['#EF4444', '#00E5FF', '#FFEE55', '#10B981', '#A855F7', '#F97316', '#EC4899', '#38BDF8'];

const idFor = (name, type) => `${type}_${name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || Date.now()}`;

export function renderProgrammerScreen(containerId = 'programmerScreen') {
  const root = document.getElementById(containerId);
  if (!root) return;

  const key = name => `${containerId}_${name}`;
  const isSplitPane = containerId !== 'programmerScreen';

  root.innerHTML = `
    <div style="height: 100%; box-sizing: border-box; overflow-y: auto; padding: ${isSplitPane ? '10px' : '18px'}; background: #07090E; color: #FFFFFF; font-family: 'Outfit', system-ui, sans-serif;">
      
      <!-- Top Header -->
      <header style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 12px; border-bottom: 2px solid #00E5FF;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 38px; height: 38px; border-radius: 8px; background: rgba(0, 229, 255, 0.15); border: 1.5px solid #00E5FF; display: flex; align-items: center; justify-content: center;">
            <i class="fa-solid fa-code-branch" style="color: #00E5FF; font-size: 1.2rem;"></i>
          </div>
          <div>
            <h2 style="margin: 0; color: #00E5FF; font-size: 1.25rem; font-weight: 900; letter-spacing: 0.5px;">AI PROGRAMMER WORKBENCH</h2>
            <span style="font-size: 0.72rem; color: #94A3B8;">Draw multi-zone phone maps → bind gesture scenarios → live sync</span>
          </div>
        </div>
        ${!isSplitPane ? `
        <button id="btnProgToSim" style="padding: 8px 14px; border: 0; border-radius: 8px; background: #FFEE55; color: #111827; font-weight: 900; font-size: 0.82rem; cursor: pointer; display: flex; align-items: center; gap: 6px;">
          <i class="fa-solid fa-mobile-screen"></i> Test in Simulator
        </button>` : ''}
      </header>

      <!-- Main Workbench Grid -->
      <div style="display: grid; grid-template-columns: minmax(290px, 0.95fr) minmax(360px, 1.35fr); gap: 16px; margin-top: 14px; align-items: start;">
        
        <!-- ==========================================
             COLUMN 1: MULTI-ZONE INTERACTION MAPPER
             ========================================== -->
        <section style="padding: 14px; border: 1.5px solid #334155; border-radius: 14px; background: #0B1220; display: flex; flex-direction: column; gap: 10px;">
          
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong style="color: #FFEE55; font-size: 0.95rem;">1. MULTI-ZONE PHONE MAP</strong>
              <p style="margin: 3px 0 0 0; color: #94A3B8; font-size: 0.72rem;">Click and drag on the phone to create interaction zones.</p>
            </div>
            <button id="${key('btnDrawMode')}" style="padding: 6px 12px; border: 1.5px dashed #EF4444; border-radius: 6px; background: rgba(239,68,68,0.15); color: #FCA5A5; font-weight: bold; font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-draw-polygon"></i> Draw Zone
            </button>
          </div>

          <!-- Screen Filter for Zones -->
          <div style="display: flex; align-items: center; gap: 8px; background: #111827; padding: 6px 10px; border-radius: 8px; border: 1px solid #1E293B;">
            <span style="font-size: 0.72rem; color: #CBD5E1; font-weight: bold; white-space: nowrap;">Screen:</span>
            <select id="${key('zoneScreenFilter')}" style="flex: 1; padding: 5px 8px; background: #1E293B; color: #00E5FF; border: 1px solid #334155; border-radius: 6px; font-size: 0.75rem; font-weight: bold; cursor: pointer;">
              <option value="ALL">All Screens (Global)</option>
            </select>
          </div>

          <!-- Phone Mockup Canvas Wrapper -->
          <div style="position: relative; width: 230px; height: 460px; margin: 6px auto; border: 10px solid #111827; border-radius: 34px; background: linear-gradient(#111827 0 9%, #020617 9%); box-shadow: 0 0 0 2px #475569, 0 10px 25px rgba(0,0,0,0.6); overflow: hidden;">
            
            <!-- Phone Top Notch -->
            <div style="position: absolute; top: 14px; left: 28%; width: 44%; height: 5px; border-radius: 5px; background: #334155; pointer-events: none; z-index: 10;"></div>
            
            <!-- Canvas Gesture Layer -->
            <div id="${key('canvas')}" style="position: absolute; inset: 0; touch-action: none; cursor: crosshair; user-select: none;">
              <!-- Dynamic zone boxes rendered here -->
              <div id="${key('canvasHint')}" style="position: absolute; top: 48%; left: 0; right: 0; text-align: center; color: #334155; font-size: 0.72rem; pointer-events: none; padding: 0 12px; line-height: 1.4;">
                PHONE MOCKUP<br>
                <span style="font-size: 0.65rem; color: #475569;">Click & drag anywhere to draw a zone</span>
              </div>
            </div>

          </div>

          <!-- Zone Save & Details Form -->
          <div style="background: #111827; padding: 10px; border-radius: 10px; border: 1px solid #1E293B; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: grid; grid-template-columns: 1fr auto; gap: 8px;">
              <input id="${key('sectionName')}" placeholder="Zone name (e.g. Top Header, Bottom Nav, Center Body)" style="min-width: 0; padding: 8px 10px; background: #07090E; color: #FFFFFF; border: 1px solid #475569; border-radius: 6px; font-size: 0.8rem;">
              <button id="${key('saveSection')}" style="padding: 8px 14px; background: #EF4444; color: #FFFFFF; border: 0; border-radius: 6px; font-weight: 900; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                <i class="fa-solid fa-plus"></i> Save zone
              </button>
            </div>
            
            <div id="${key('sectionHelp')}" style="min-height: 16px; color: #94A3B8; font-size: 0.7rem; line-height: 1.3;">
              Drag on phone to create a zone. Multiple zones can exist on the same screen.
            </div>

            <!-- Saved Zones List / Chips -->
            <div style="border-top: 1px dashed #334155; padding-top: 8px; margin-top: 4px;">
              <span style="font-size: 0.7rem; color: #CBD5E1; font-weight: bold; display: block; margin-bottom: 6px;">Active Screen Zones:</span>
              <div id="${key('sectionChips')}" style="display: flex; flex-wrap: wrap; gap: 6px; max-height: 90px; overflow-y: auto;"></div>
            </div>
          </div>

        </section>

        <!-- ==========================================
             COLUMN 2: SCENARIO BUILDER & RULES
             ========================================== -->
        <section style="display: flex; flex-direction: column; gap: 14px;">
          
          <!-- Scenario Builder -->
          <div style="padding: 14px; border: 1.5px solid #00E5FF; border-radius: 14px; background: #0D1726;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <div>
                <strong style="color: #00E5FF; font-size: 0.95rem;">2. CONTEXTUAL SCENARIO BUILDER</strong>
                <p style="margin: 3px 0 0 0; color: #94A3B8; font-size: 0.72rem;">IF user performs gesture on this Zone on this Screen, THEN trigger action & voice.</p>
              </div>
              <span id="${key('mode')}" style="color: #10B981; font-size: 0.72rem; font-weight: bold; background: rgba(16,185,129,0.15); padding: 2px 8px; border-radius: 4px;">New scenario</span>
            </div>

            <!-- 4-Grid Configuration -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <label style="font-size: 0.72rem; color: #CBD5E1; font-weight: bold;">
                WHEN ON SCREEN
                <select id="${key('screen')}" style="width: 100%; margin-top: 4px; padding: 8px; background: #111827; color: #00E5FF; border: 1.5px solid #334155; border-radius: 6px; font-weight: bold; font-size: 0.8rem; cursor: pointer;"></select>
              </label>

              <label style="font-size: 0.72rem; color: #CBD5E1; font-weight: bold;">
                TOUCHED ZONE
                <select id="${key('section')}" style="width: 100%; margin-top: 4px; padding: 8px; background: #111827; color: #FCA5A5; border: 1.5px solid #EF4444; border-radius: 6px; font-weight: bold; font-size: 0.8rem; cursor: pointer;"></select>
              </label>

              <label style="font-size: 0.72rem; color: #CBD5E1; font-weight: bold;">
                GESTURE CODE
                <select id="${key('gesture')}" style="width: 100%; margin-top: 4px; padding: 8px; background: #111827; color: #FFEE55; border: 1.5px solid #334155; border-radius: 6px; font-weight: bold; font-size: 0.8rem; cursor: pointer;">
                  <option value="TAP">Tap</option>
                  <option value="DOUBLE_TAP">Double Tap</option>
                  <option value="LONG_PRESS">Long Press</option>
                  <option value="SWIPE_RIGHT">Swipe Right</option>
                  <option value="SWIPE_LEFT">Swipe Left</option>
                  <option value="SWIPE_UP">Swipe Up</option>
                  <option value="SWIPE_DOWN">Swipe Down</option>
                  <option value="TWO_FINGER_TAP">Two-Finger Tap</option>
                </select>
              </label>

              <label style="font-size: 0.72rem; color: #CBD5E1; font-weight: bold;">
                FUNCTION / ACTION
                <select id="${key('action')}" style="width: 100%; margin-top: 4px; padding: 8px; background: #111827; color: #10B981; border: 1.5px solid #334155; border-radius: 6px; font-weight: bold; font-size: 0.8rem; cursor: pointer;">
                  ${ACTIONS.map(action => `<option value="${action}">${action}</option>`).join('')}
                </select>
              </label>
            </div>

            <!-- Custom Action & Spoken TTS Input -->
            <label style="display: block; margin-top: 10px; font-size: 0.72rem; color: #CBD5E1; font-weight: bold;">
              SPOKEN TTS PROMPT / SPEECH OUTPUT
              <input id="${key('tts')}" placeholder="e.g. Battery is 85 percent. Connection is stable." style="box-sizing: border-box; width: 100%; margin-top: 4px; padding: 8px 10px; background: #111827; color: #FFFFFF; border: 1px solid #475569; border-radius: 6px; font-size: 0.82rem;">
            </label>

            <div style="display: flex; gap: 8px; margin-top: 12px;">
              <button id="${key('saveScenario')}" style="flex: 1; padding: 11px; border: 0; border-radius: 8px; background: #00E5FF; color: #000000; font-weight: 900; font-size: 0.88rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                <i class="fa-solid fa-cloud-arrow-up"></i> SAVE SCENARIO & BROADCAST LIVE
              </button>
              <button id="${key('cancel')}" style="display: none; padding: 11px 16px; border: 1px solid #475569; border-radius: 8px; background: #1E293B; color: #FFFFFF; font-weight: bold; font-size: 0.82rem; cursor: pointer;">
                Cancel
              </button>
            </div>
          </div>

          <!-- Master Saved Rules Registry -->
          <div style="padding: 14px; border: 1.5px solid #334155; border-radius: 14px; background: #0B1220;">
            <div style="display: flex; justify-content: space-between; gap: 8px; align-items: center; border-bottom: 1px dashed #334155; padding-bottom: 8px;">
              <div>
                <strong style="color: #FFEE55; font-size: 0.95rem;">3. MASTER RULES REGISTRY</strong>
                <span id="${key('rulesCount')}" style="font-size: 0.72rem; color: #94A3B8; margin-left: 6px;">(0 rules)</span>
              </div>
              <div style="display: flex; gap: 6px;">
                <input id="${key('newScreen')}" placeholder="new screen name" style="width: 120px; padding: 5px 8px; background: #111827; color: #FFFFFF; border: 1px solid #475569; border-radius: 5px; font-size: 0.75rem;">
                <button id="${key('addScreen')}" style="padding: 5px 10px; background: #10B981; color: #052E16; border: 0; border-radius: 5px; font-weight: bold; font-size: 0.75rem; cursor: pointer;">
                  + Add
                </button>
              </div>
            </div>

            <div id="${key('feedback')}" style="min-height: 18px; margin: 8px 0; color: #10B981; font-size: 0.75rem; font-weight: bold;"></div>
            <div id="${key('rules')}" style="display: flex; flex-direction: column; gap: 8px; max-height: 240px; overflow-y: auto;"></div>
          </div>

        </section>

      </div>
    </div>
  `;

  if (!isSplitPane) {
    document.getElementById('btnProgToSim')?.addEventListener('click', () => navigateTo('simulatorScreen'));
  }

  const el = name => document.getElementById(key(name));
  const data = {
    sections: [],
    screens: [],
    rules: [],
    selected: null,
    drawing: false,
    draft: null,
    dragStart: null,
    moving: null,
    edit: null,
    activeScreenFilter: 'ALL'
  };

  const notify = msg => { el('feedback').innerText = msg; setTimeout(() => { if (el('feedback')) el('feedback').innerText = ''; }, 4000); };
  const sectionHelp = msg => { el('sectionHelp').innerText = msg; };
  
  // Point calculator relative to canvas in percentages (0 to 100)
  const getCanvasPoint = event => {
    const rect = el('canvas').getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100))
    };
  };

  const parsePayload = rule => (typeof rule.action_payload === 'string' ? JSON.parse(rule.action_payload) : rule.action_payload);

  // Render all active zones onto the phone mockup canvas
  const renderCanvas = () => {
    const canvas = el('canvas');
    if (!canvas) return;

    // Remove existing zone DOM nodes
    canvas.querySelectorAll('.program-zone-box').forEach(node => node.remove());

    const hint = el('canvasHint');
    const filteredSections = data.activeScreenFilter === 'ALL'
      ? data.sections
      : data.sections.filter(s => s.screen_id === data.activeScreenFilter || s.screen_id === 'GLOBAL' || !s.screen_id);

    const allToRender = [
      ...filteredSections,
      ...(data.draft ? [{ ...data.draft, id: 'draft', name: 'New zone...', color: '#EF4444' }] : [])
    ];

    if (hint) {
      hint.style.display = allToRender.length > 0 ? 'none' : 'block';
    }

    allToRender.forEach((section, idx) => {
      const isSelected = section.id === data.selected;
      const isDraft = section.id === 'draft';
      const color = section.color || ZONE_COLORS[idx % ZONE_COLORS.length];

      const box = document.createElement('div');
      box.className = 'program-zone-box';
      Object.assign(box.style, {
        position: 'absolute',
        left: `${section.x}%`,
        top: `${section.y}%`,
        width: `${section.width}%`,
        height: `${section.height}%`,
        border: `2px dashed ${color}`,
        borderRadius: '6px',
        background: isSelected ? `${color}44` : `${color}18`,
        boxShadow: isSelected ? `0 0 14px ${color}88` : 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '3px 4px',
        boxSizing: 'border-box',
        cursor: isDraft ? 'crosshair' : 'move',
        userSelect: 'none',
        overflow: 'hidden',
        zIndex: isSelected ? '5' : '2'
      });

      box.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; pointer-events: none;">
          <span style="font-size: 0.62rem; font-weight: 900; color: ${color}; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">
            ${section.name}
          </span>
          ${!isDraft ? `
            <button data-del-zone="${section.id}" style="pointer-events: auto; padding: 0 3px; background: #7F1D1D; color: #FFF; border: 0; border-radius: 3px; font-size: 0.55rem; cursor: pointer; line-height: 1;">
              ×
            </button>` : ''}
        </div>
        ${isSelected && !isDraft ? `
          <div style="font-size: 0.52rem; color: #CBD5E1; text-align: right; pointer-events: none;">
            ${Math.round(section.width)}% × ${Math.round(section.height)}%
          </div>` : ''}
      `;

      canvas.appendChild(box);

      // Handle zone click / select / drag move
      box.addEventListener('pointerdown', event => {
        if (isDraft) return;
        if (event.target.tagName === 'BUTTON') return;
        event.stopPropagation();

        const p = getCanvasPoint(event);
        data.selected = section.id;
        data.moving = {
          id: section.id,
          x: section.x,
          y: section.y,
          origin: p
        };
        renderCanvas();
        updateDropdowns();
        sectionHelp(`Selected “${section.name}”. Drag on phone to reposition.`);
      });

      // Handle quick delete button directly on the box
      box.querySelector('[data-del-zone]')?.addEventListener('click', async e => {
        e.stopPropagation();
        if (confirm(`Delete zone “${section.name}”?`)) {
          await deleteSection(section.id);
          data.selected = null;
          await loadAll();
        }
      });
    });

    // Render Section Chips List
    const chipsContainer = el('sectionChips');
    if (chipsContainer) {
      chipsContainer.innerHTML = filteredSections.length
        ? filteredSections.map((sec, idx) => {
            const color = sec.color || ZONE_COLORS[idx % ZONE_COLORS.length];
            const isSel = sec.id === data.selected;
            return `
              <button data-chip="${sec.id}" style="padding: 4px 8px; border: 1.5px solid ${color}; border-radius: 6px; background: ${isSel ? color : '#151D2C'}; color: ${isSel ? '#000' : '#FFF'}; font-size: 0.72rem; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                ${sec.name} <span style="font-size: 0.6rem; opacity: 0.8;">(${sec.screen_id || 'GLOBAL'})</span>
              </button>
            `;
          }).join('')
        : '<span style="font-size: 0.7rem; color: #64748B;">No zones created for this screen. Drag on phone to create one.</span>';

      chipsContainer.querySelectorAll('[data-chip]').forEach(btn => {
        btn.addEventListener('click', () => {
          data.selected = btn.dataset.chip;
          renderCanvas();
          updateDropdowns();
          const sec = data.sections.find(s => s.id === data.selected);
          if (sec) sectionHelp(`Selected zone “${sec.name}”. Select action below.`);
        });
      });
    }
  };

  const updateDropdowns = () => {
    // Screen dropdown in scenario builder
    el('screen').innerHTML = data.screens.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

    // Zone dropdown in scenario builder
    const availableSections = data.sections.length
      ? data.sections.map(s => `<option value="${s.id}">${s.name} (${s.screen_id || 'GLOBAL'})</option>`).join('')
      : '<option value="DEFAULT">DEFAULT (Full Screen)</option>';

    el('section').innerHTML = availableSections;
    if (data.selected) el('section').value = data.selected;

    // Filter dropdown in mapper
    el('zoneScreenFilter').innerHTML = `
      <option value="ALL" ${data.activeScreenFilter === 'ALL' ? 'selected' : ''}>All Screens (Global View)</option>
      ${data.screens.map(s => `<option value="${s.id}" ${data.activeScreenFilter === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
    `;
  };

  const renderRules = () => {
    const rulesList = el('rules');
    const countEl = el('rulesCount');
    if (countEl) countEl.innerText = `(${data.rules.length} rules)`;

    if (!rulesList) return;

    if (data.rules.length === 0) {
      rulesList.innerHTML = '<span style="font-size: 0.75rem; color: #64748B;">No scenarios saved yet. Draw a zone and click Save Scenario.</span>';
      return;
    }

    rulesList.innerHTML = data.rules.map(rule => {
      const payload = parsePayload(rule);
      const zoneName = data.sections.find(s => s.id === rule.sub_context)?.name || rule.sub_context || 'Full Screen';
      const screenName = data.screens.find(s => s.id === rule.screen_id)?.name || rule.screen_id;

      return `
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 10px; border: 1px solid #334155; border-radius: 8px; background: #111827; font-size: 0.75rem;">
          <div style="min-width: 0;">
            <span style="color: #00E5FF; font-weight: 800;">${screenName}</span>
            <span style="color: #64748B;">•</span>
            <span style="color: #EF4444; font-weight: bold;">[ ${zoneName} ]</span>
            <br>
            <span style="color: #FFEE55; font-weight: bold;">${rule.gesture_code}</span>
            <span style="color: #94A3B8;">→</span>
            <span style="color: #10B981; font-weight: bold;">${rule.action_type}</span>
            <div style="color: #CBD5E1; font-style: italic; font-size: 0.7rem; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              "${payload?.tts || 'No prompt'}"
            </div>
          </div>
          <div style="display: flex; gap: 4px; flex-shrink: 0;">
            <button data-edit-rule="${rule.id}" style="padding: 4px 8px; background: #0E7490; color: #FFF; border: 0; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 0.7rem;">
              Edit
            </button>
            <button data-del-rule="${rule.id}" style="padding: 4px 8px; background: #7F1D1D; color: #FFF; border: 0; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 0.7rem;">
              Delete
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Bind rule action buttons
    rulesList.querySelectorAll('[data-edit-rule]').forEach(btn => {
      btn.addEventListener('click', () => {
        const rule = data.rules.find(r => r.id === btn.dataset.editRule);
        if (!rule) return;
        const payload = parsePayload(rule);
        data.edit = rule.id;
        data.selected = rule.sub_context;
        updateDropdowns();
        el('screen').value = rule.screen_id;
        el('section').value = rule.sub_context;
        el('gesture').value = rule.gesture_code;
        el('action').value = ACTIONS.includes(rule.action_type) ? rule.action_type : 'TRIGGER_TTS';
        el('tts').value = payload?.tts || '';
        el('mode').innerText = `Editing rule (${rule.id})`;
        el('cancel').style.display = 'block';
        renderCanvas();
      });
    });

    rulesList.querySelectorAll('[data-del-rule]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await deleteProgrammerCommand(btn.dataset.delRule);
        notify('Rule deleted.');
      });
    });
  };

  const loadAll = async () => {
    const [sectionsRes, screensRes, commandsRes] = await Promise.all([
      fetchSections(),
      fetchScreens(),
      fetchCommands()
    ]);

    data.sections = sectionsRes.sections || [];
    data.screens = screensRes.screens || [];
    data.rules = commandsRes.commands || [];

    if (!data.selected && data.sections.length > 0) {
      data.selected = data.sections[0].id;
    }

    updateDropdowns();
    renderCanvas();
    renderRules();
  };

  const resetBuilder = () => {
    data.edit = null;
    el('mode').innerText = 'New scenario';
    el('cancel').style.display = 'none';
    el('tts').value = '';
  };

  // ====================================================
  // DRAG-TO-DRAW (POINTER DOWN -> DRAG -> POINTER UP)
  // ====================================================

  el('btnDrawMode')?.addEventListener('click', () => {
    data.drawing = !data.drawing;
    data.draft = null;
    el('btnDrawMode').style.background = data.drawing ? '#EF4444' : 'rgba(239,68,68,0.15)';
    el('btnDrawMode').style.color = data.drawing ? '#FFFFFF' : '#FCA5A5';
    sectionHelp(data.drawing ? 'Draw mode active: Press and drag on the phone to draw a zone box.' : 'Draw mode idle.');
    renderCanvas();
  });

  const canvasEl = el('canvas');

  // 1. Pointer Down: Start Drag-to-Draw
  canvasEl.addEventListener('pointerdown', event => {
    if (event.target.closest('.program-zone-box')) return;
    const p = getCanvasPoint(event);
    data.dragStart = p;
    data.draft = {
      x: p.x,
      y: p.y,
      width: 2,
      height: 2,
      screen_id: data.activeScreenFilter === 'ALL' ? 'GLOBAL' : data.activeScreenFilter
    };
    sectionHelp('Dragging zone... release pointer to set final boundaries.');
    renderCanvas();
  });

  // 2. Pointer Move: Update Live Rectangle while Dragging (or Repositioning)
  canvasEl.addEventListener('pointermove', event => {
    const p = getCanvasPoint(event);

    // Case A: Dragging to draw a new zone
    if (data.dragStart && data.draft) {
      const start = data.dragStart;
      data.draft = {
        ...data.draft,
        x: Math.min(start.x, p.x),
        y: Math.min(start.y, p.y),
        width: Math.max(3, Math.abs(p.x - start.x)),
        height: Math.max(3, Math.abs(p.y - start.y))
      };
      renderCanvas();
      return;
    }

    // Case B: Moving an existing zone
    if (data.moving) {
      const sec = data.sections.find(s => s.id === data.moving.id);
      if (sec) {
        sec.x = Math.max(0, Math.min(100 - sec.width, data.moving.x + p.x - data.moving.origin.x));
        sec.y = Math.max(0, Math.min(100 - sec.height, data.moving.y + p.y - data.moving.origin.y));
        renderCanvas();
      }
    }
  });

  // 3. Pointer Up: Finalize Drawn Zone (or Save Repositioned Zone)
  window.addEventListener('pointerup', async () => {
    // If finished drawing a new zone
    if (data.dragStart && data.draft) {
      data.dragStart = null;

      // Suggest intelligent default zone name based on zone count and position
      const count = data.sections.length + 1;
      let defaultName = `Zone ${count}`;
      if (data.draft.y < 25) defaultName = 'Top Header Zone';
      else if (data.draft.y > 70) defaultName = 'Bottom Nav Zone';
      else if (data.draft.x < 30) defaultName = 'Left Edge Zone';
      else if (data.draft.x > 70) defaultName = 'Right Action Zone';
      else defaultName = 'Center Main Zone';

      el('sectionName').value = defaultName;
      el('sectionName').focus();
      sectionHelp(`Zone drawn (${Math.round(data.draft.width)}% × ${Math.round(data.draft.height)}%). Click "Save zone" or press Enter.`);
      renderCanvas();
      return;
    }

    // If finished moving an existing zone, save updated position to backend
    if (data.moving) {
      const sec = data.sections.find(s => s.id === data.moving.id);
      data.moving = null;
      if (sec) {
        await saveSection(sec);
      }
    }
  });

  // Save Zone Button Click
  el('saveSection').addEventListener('click', async () => {
    const name = el('sectionName').value.trim();
    if (!data.draft) {
      sectionHelp('Please drag on the phone to draw a zone box first.');
      return;
    }
    if (!name) {
      sectionHelp('Please enter a name for this zone.');
      return;
    }

    const assignedScreen = data.activeScreenFilter === 'ALL' ? 'GLOBAL' : data.activeScreenFilter;
    const colorIdx = data.sections.length % ZONE_COLORS.length;

    const newSection = {
      ...data.draft,
      id: idFor(`${name}_${assignedScreen}`, 'zone'),
      name,
      screen_id: assignedScreen,
      color: ZONE_COLORS[colorIdx]
    };

    const result = await saveSection(newSection);
    if (result.success !== false) {
      data.draft = null;
      data.selected = newSection.id;
      el('sectionName').value = '';
      sectionHelp(`Saved zone “${name}”. Configure its scenario in Step 2.`);
      Haptic.trigger('success');
      await loadAll();
    } else {
      sectionHelp(result.error || 'Failed to save zone.');
    }
  });

  // Screen Filter Change
  el('zoneScreenFilter').addEventListener('change', e => {
    data.activeScreenFilter = e.target.value;
    renderCanvas();
  });

  // Scenario Builder Screen Change
  el('screen').addEventListener('change', e => {
    const screenId = e.target.value;
    // Auto-update mapper screen filter to match
    data.activeScreenFilter = screenId;
    el('zoneScreenFilter').value = screenId;
    renderCanvas();
  });

  // Scenario Builder Section Change
  el('section').addEventListener('change', e => {
    data.selected = e.target.value;
    renderCanvas();
  });

  // Save Scenario & Broadcast Button
  el('saveScenario').addEventListener('click', async () => {
    const section = el('section').value;
    const screenId = el('screen').value;
    const gesture = el('gesture').value;
    const action = el('action').value;
    const ttsText = el('tts').value.trim() || `${action} triggered on ${section}.`;

    const commandData = {
      ...(data.edit ? { id: data.edit } : {}),
      screen_id: screenId,
      gesture_code: gesture,
      sub_context: section || 'DEFAULT',
      action_type: action,
      action_payload: { tts: ttsText, target: section },
      haptic_pattern: action === 'DISPATCH_SOS' ? 'sos' : 'success',
      created_by: 'AI_PROGRAMMER_WORKBENCH'
    };

    const result = await saveProgrammerCommand(commandData);
    if (result.success !== false) {
      notify('Scenario saved and broadcast live to Simulator!');
      Haptic.trigger('success');
      Speech.speak('Scenario saved.');
      resetBuilder();
      await loadAll();
    } else {
      notify(result.error || 'Failed to save scenario.');
    }
  });

  el('cancel').addEventListener('click', resetBuilder);

  // Add New Screen Button
  el('addScreen').addEventListener('click', async () => {
    const input = el('newScreen');
    const name = input.value.trim();
    if (!name) return notify('Please enter a screen name.');

    const result = await createScreen({
      id: idFor(name, 'screen'),
      name,
      parent_screen_id: null
    });

    if (result.success !== false) {
      input.value = '';
      notify(`Screen “${name}” added.`);
      await loadAll();
    } else {
      notify(result.error || 'Failed to add screen.');
    }
  });

  // WebSocket Live Listeners
  onRuleUpdated(loadAll);
  onScreenUpdated(loadAll);
  onSectionUpdated(loadAll);

  // Initial Load
  loadAll();
}
