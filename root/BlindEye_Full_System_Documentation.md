# BlindEye Mobile Accessibility Platform — Complete System & Architecture Documentation

**Project:** BlindEye Mobile Accessibility Simulator & Platform  
**Version:** 4.0 (Handwriting Surface & Letter Calibration Architecture)  
**Target Audience:** Lead Mobile Accessibility Architects, Frontend Engineers, UX Researchers, System Integrators  
**Date:** July 2026  

---

## 1. Executive Summary & Application Overview

**BlindEye** (formerly BlindTouch) is an advanced, multi-modal mobile accessibility simulator designed for blind, visually impaired, and deaf-blind users. Unlike standard smartphone operating systems that rely on 2D visual layouts, icons, touch targets, and visual inspection trees, BlindEye implements a **haptic-first, auditory-confirmed, non-visual interaction framework**.

The platform unifies all core mobile functions into one consistent, low-density interface. Through spatial touch gestures, handwriting stroke recognition, synthetic Speech-to-Text (STT) / Text-to-Speech (TTS), Morse vibration code, and physical motion sensing, users can operate the smartphone independently without visual feedback.

### 1.1 Core Modules
1. **Handwriting Main Menu**: Full-screen gesture drawing surface launching modules by letter strokes (**M** = Messages, **P** = Phone, **C** = Camera, **N** = Navigation, **S** = Settings).
2. **Messages Module**: Single-focus message inbox cards, buttonless Privacy Mode blackout screen, inline voice dictation, and Morse surface tapping.
3. **Phone Module**: Single-focus phone hero cards, contact management, recents/favorites list, and a full-screen handwriting numeric dialer.
4. **Camera & Vision Assistance**: AI-powered text recognition (OCR), object identification, medication reader, currency detection, and color/light scanning.
5. **GPS Navigation**: Voice destination search, single-focus saved places carousel, cardinal compass heading, and tactile direction guidance.
6. **Settings & Accessibility**: 3-card accessibility controls (Reading Mode, Privacy Mode, Vibration Intensity), dynamic Quick Access shortcuts, and calibration restart.
7. **SOS Emergency System**: Acceleration sensor detection triggering instant emergency SMS dispatch and high-frequency tactile alarms upon double shaking.

---

## 2. Core Philosophy & Multi-Modal Design Principles

### 2.1 Haptic-First Tactile Language
BlindEye uses structured motor vibration sequences as a primary language for state feedback. Each major functional module and interaction result has a distinct vibration signature:

- **Messages (`•`)**: Single short pulse (100ms)
- **Phone (`••`)**: Two short pulses (100ms on, 50ms off, 100ms on)
- **Camera (`•━━`)**: One short pulse followed by one long pulse (100ms on, 100ms off, 300ms on)
- **Navigation (`━━•`)**: One long pulse followed by one short pulse (300ms on, 100ms off, 100ms on)
- **Settings (`━━━`)**: One heavy long pulse (400ms)
- **Success Outcome (`••`)**: Dual light confirmation pulse
- **Error Outcome (`•••`)**: Triple rapid warning pulse
- **SOS Emergency (`━━━ ━━━ ━━━`)**: Repeating heavy warning rumble

### 2.2 Auditory Feedback & Speech Synthesis
Synthetic speech prompts via Web Speech API (`window.speechSynthesis`) provide clear audio readout. All announcements follow structured guidelines:
- Immediate state description upon screen load.
- Item name and contextual index on carousel focus (e.g., `[ 1 / 3 ]`).
- Auditory warning prompts on input mismatch or gesture errors.

### 2.3 Single-Focus Hero Card Paradigm
To avoid spatial clutter and visual confusion, viewports display **one focus element at a time**. Users navigate linearly along a single horizontal axis (`swipeRight` to advance, `swipeLeft` to return), eliminating the need to explore 2D screen coordinates.

### 2.4 Fixed Bottom Navigation Surface & Handwriting Canvas
- **Fixed Navigation Surface (`#fixedSwipeArea`)**: A persistent 30% lower-screen touch region providing guaranteed tactile location anchors for global swipe and tap commands.
- **Full-Screen Drawing Surface (`#handwritingMenuCanvas`)**: Converts screens like the Main Menu and Dialer into direct drawing canvases over pure black (`#000000`), allowing users to write letters or numbers directly anywhere on the screen.

---

## 3. Technical System Architecture & Technology Stack

```
+-----------------------------------------------------------------------+
|                             USER INTERFACE                            |
|    HTML5 DOM Viewports • High-Contrast CSS3 • Dynamic Viewports       |
+-----------------------------------------------------------------------+
                                    |
+-----------------------------------------------------------------------+
|                        GESTURE & CANVAS LAYER                         |
|   Handwriting Canvas Engine • Gesture Recognizer • Touch Listeners     |
+-----------------------------------------------------------------------+
                                    |
+-----------------------------------------------------------------------+
|                    APPLICATION CONTROLLER & ROUTER                    |
|   State Manager (`state.db`) • Navigation Router (`navigateTo()`)     |
+-----------------------------------------------------------------------+
                                    |
+-----------------------------------------------------------------------+
|                      ACCESSIBILITY & FEEDBACK LAYER                   |
|   Speech Engine (`Speech.speak`) • Haptic Controller (`Haptic`)       |
+-----------------------------------------------------------------------+
                                    |
+-----------------------------------------------------------------------+
|                         NATIVE SIMULATION APIs                        |
|  LocalStorage Persistence • Web Audio API • Accelerometer Sensor      |
+-----------------------------------------------------------------------+
```

### 3.1 Technology Stack
- **Structure**: HTML5 Semantic DOM Views (`index.html`)
- **Styling**: Vanilla CSS3 (`style.css`) utilizing HSL custom properties, high-contrast yellow borders (`#FFCC00`), glassmorphism cards, and pure black screens (`#000000`)
- **Application Logic**: Vanilla JavaScript ES6 (`app.js`)
- **Storage**: Browser LocalStorage (`state.db` JSON schema)
- **Audio & Haptics**: Web Speech API (`SpeechSynthesisUtterance`), Web Audio API (`AudioContext`), and Web Vibration API (`navigator.vibrate`)

### 3.2 Modular State Management (`state`)
```javascript
const state = {
  currentScreen: 'mainMenuScreen',
  currentSubScreen: null,
  focusedIndex: 0,
  focusedItems: [],
  isMuted: false,
  handwritingPoints: [],
  handwritingTimeout: null,
  dialedNumber: '',
  db: {
    messages: [...],
    contacts: [...],
    savedPlaces: [...],
    letterProfiles: {},
    tutorialCompleted: false,
    settings: {
      readingMode: 'voice',
      privacyMode: true,
      vibrationIntensity: 'high',
      quickAccess: [...]
    }
  }
};
```

---

## 4. Detailed Screen & Sub-Screen Directory

### 4.1 Onboarding & Tutorial Calibration (`#tutorialScreen`)
- **Purpose**: Calibrates the user's personal handwriting style during initial setup.
- **Workflow**:
  1. Prompts user to draw target letters (**M**, **P**, **C**, **N**, **S**) 3 times each.
  2. Canvas captures stroke aspect ratio, resampled coordinates (20 points), and stroke trajectory.
  3. Computes mathematical average stroke profiles and saves them to `state.db.letterProfiles`.
  4. Announces completion via TTS and launches the Main Menu.

### 4.2 Handwriting Main Menu (`#mainMenuScreen`)
- **Purpose**: Full-screen blank canvas over pure black (`#000000`).
- **Interaction**: User draws letter stroke anywhere on canvas:
  - **M** -> Messages (`#messagesScreen`, `#msgThreadsView`)
  - **P** -> Phone (`#callsScreen`, `#callsMenuView`)
  - **C** -> Camera (`#cameraScreen`, `#cameraMenuView`)
  - **N** -> Navigation (`#navigationScreen`, `#navMenuView`)
  - **S** -> Settings (`#settingsScreen`, `#settingsMenuView`)
- **Feedback**: Success haptic (`••`) and TTS *"Opening [Category Name]"* on match. Error haptic (`•••`) and TTS *"Letter not recognized. Draw M, P, C, N, or S."* on mismatch.

### 4.3 Messages Module (`#messagesScreen`)
- **Sub-Screen 1: Thread List (`#msgThreadsView`)**: Renders single-focus message cards displaying sender, timestamp, unread tag, and snippet.
- **Sub-Screen 2: Privacy Detail View (`#msgDetailView`)**: Screen blackout privacy mode protecting text secrecy. Contains inline speech dictation (STT) and screen surface Morse tapping. Swipe Right sends reply; Long Press returns to thread list.

### 4.4 Phone Module (`#callsScreen`)
- **Sub-Screen 1: Phone Sub-Menu (`#callsMenuView`)**: Hero cards for Contacts, Keypad Dialer, Recents, and Favorites.
- **Sub-Screen 2: Contacts List (`#contactsView`)**: Single-focus hero cards detailing contact name, phone number, favorite status, and emergency badge. Double tap places instant call.
- **Sub-Screen 3: Handwriting Dialer (`#handwritingDialerView`)**: Canvas allowing direct numeric digit drawing (0–9). Digits append to `state.dialedNumber` with instant voice readout. Double tap bottom places call.

### 4.5 Camera & AI Vision Module (`#cameraScreen`)
- **Sub-Screen 1: Camera Menu (`#cameraMenuView`)**: Options for Document OCR, Object Identification, Currency Reader, and Light/Color Detector.
- **Sub-Screen 2: Camera Viewport (`#cameraActiveView`)**: Simulated camera viewfinder with tactile alignment frame.
- **Sub-Screen 3: AI Results View (`#cameraResultsView`)**: Single-focus card delivering TTS text readouts of recognized documents or identified items.

### 4.6 Navigation Module (`#navigationScreen`)
- **Sub-Screen 1: Navigation Menu (`#navMenuView`)**: Options for Destination Search, Saved Places, and Current Address Readout.
- **Sub-Screen 2: Saved Places (`#navResultsView`)**: Single-focus hero cards showing saved locations (e.g., Home, Doctor Office). Displays empty state hero card *"NO SAVED PLACES"* if list is empty.
- **Sub-Screen 3: Active Routing (`#navActiveRoutingView`)**: Audio-tactile guidance generating directional audio tones and vibration pulses as turn checkpoints are reached.

### 4.7 Settings & Accessibility Module (`#settingsScreen`)
- **Sub-Screen 1: Accessibility Controls (`#accessibilitySettingsView`)**: 3 Single-Focus Hero Cards (`[ 1 / 3 ]` Reading Mode, `[ 2 / 3 ]` Privacy Mode, `[ 3 / 3 ]` Vibration Intensity). Double tap toggles settings.
- **Sub-Screen 2: Quick Access Shortcuts (`#quickAccessSettingsView`)**: Carousel of custom user shortcuts. Swipe Up opens `#quickActionTypeView` to create new shortcuts (Call Contact, Message Contact, Open Navigation). Triple tap deletes active shortcut card.

### 4.8 Emergency SOS System (`Double Shake`)
- **Trigger**: Accelerometer motion detection sensing rapid double shake movement (>18 m/s²).
- **Execution**: Triggers continuous emergency vibration pulse, plays siren tone, dispatches simulated GPS location SMS to emergency contacts, and opens emergency screen.

---

## 5. Gesture Recognition & Handwriting Profiling Engine

### 5.1 Gesture Matrix

| Gesture | Screen Context | Action Performed | Haptic Feedback | TTS Announcement |
| :--- | :--- | :--- | :--- | :--- |
| **Swipe Right** | Carousels / Lists | Move to next card | Short (`•`) | Speaks focused item |
| **Swipe Left** | Carousels / Lists | Move to previous card | Short (`•`) | Speaks focused item |
| **Double Tap** | Cards / Options | Confirm selection / Open details | Success (`••`) | Speaks confirmation |
| **Long Press** | Sub-screens | Universal Back to parent screen | Heavy (`━━━`) | Speaks back navigation |
| **Swipe Up** | Quick Access View | Open Quick Action creation menu | Success (`••`) | *"Opening action type menu."* |
| **Triple Tap** | Quick Access View | Delete focused shortcut card | Warning (`•••`) | *"Shortcut deleted."* |
| **Double Shake** | Global (Any screen) | Activate Emergency SOS | Alarm (`━━━ ━━━`) | *"Emergency SOS activated."* |

### 5.2 Handwriting Letter Recognition Algorithm
The handwriting recognizer (`Handwriting.recognizeMainMenuLetter()`) utilizes a dual-layer strategy:

1. **Profile Comparison Layer (Primary)**:
   - Resamples drawn points into 20 equidistant normalized coordinates `(x_i, y_i)`.
   - Computes Euclidean distance and aspect ratio variance against stored calibration profiles (`state.db.letterProfiles`).
   - If distance score `< 1.8`, selects best matching letter profile.

2. **Heuristic Rule Layer (Fallback)**:
   - Analyzes aspect ratio ($AR = h / w$), start/end point coordinates, and vertical/horizontal turning extrema ($y_{extrema}, x_{extrema}$).
   - **M**: Multi-peak stroke pattern with top extrema $y < 0.45$.
   - **N**: Single peak stroke pattern starting low and ending high.
   - **P**: Downward stroke with right-hand upper loop.
   - **C**: Smooth single-curve stroke with right-facing open arc.
   - **S**: Multi-curve stroke with double horizontal direction changes.

---

## 6. Data Schema & Developer State Reset

### 6.1 `state.db` LocalStorage Schema
```json
{
  "messages": [
    {
      "id": "m1",
      "senderName": "Mother",
      "phone": "+38970123456",
      "timestamp": "14:25",
      "unread": true,
      "text": "Zdravo, kade si? Dojdi si doma."
    }
  ],
  "contacts": [
    {
      "id": "c1",
      "name": "Mother",
      "phone": "+38970123456",
      "favorite": true,
      "emergency": true
    }
  ],
  "savedPlaces": [
    {
      "id": "sp1",
      "name": "Home",
      "address": "Ul. Partizanska 12, Skopje",
      "category": "Home"
    }
  ],
  "letterProfiles": {
    "M": { "ar": 1.1, "resampledPts": [...] },
    "P": { "ar": 1.8, "resampledPts": [...] },
    "C": { "ar": 1.2, "resampledPts": [...] },
    "N": { "ar": 1.4, "resampledPts": [...] },
    "S": { "ar": 1.5, "resampledPts": [...] }
  },
  "tutorialCompleted": true,
  "settings": {
    "readingMode": "voice",
    "privacyMode": true,
    "vibrationIntensity": "high",
    "quickAccess": [
      { "id": "qa_call_mom", "name": "Call Mother", "type": "call", "target": "c1", "enabled": true }
    ]
  }
}
```

### 6.2 Developer State Reset Helper
To reset state, clear LocalStorage, and re-trigger onboarding calibration from the browser console, execute:
```javascript
window.resetAppOnboarding();
```

---

## 7. 50 Most Used Mobile Commands Accessibility Blueprint

Below is the comparative analysis mapping standard mobile commands into BlindEye's accessible interface:

| ID | Command | Blind Utility | BlindEye Implementation | Status |
|---|---|---|---|---|
| 1 | Make Phone Call | **CRITICAL** | Single-focus contact card double tap | Implemented |
| 2 | Read SMS Message | **CRITICAL** | Inline Privacy Mode blackout screen | Implemented |
| 3 | Voice Reply (STT) | **CRITICAL** | Inline microphone speech capture | Implemented |
| 4 | Morse Tactile Reply | **CRITICAL** | Screen surface tap/hold Morse input | Implemented |
| 5 | View Recent Calls | High | Single-focus recents carousel | Implemented |
| 6 | Emergency SOS | **CRITICAL** | Physical Accelerometer Double Shake | Implemented |
| 7 | Check Time & Date | **CRITICAL** | System status announcement prompt | Implemented |
| 8 | Check Battery Level | **CRITICAL** | System status announcement prompt | Implemented |
| 9 | Document OCR Scan | **CRITICAL** | Camera cameraResultsView TTS readout | Implemented |
| 10 | GPS Navigation Home | **CRITICAL** | Saved Places single-focus routing | Implemented |
| 11 | Letter Launch Category | **CRITICAL** | Main Menu blank handwriting surface | Implemented |
| 12 | Letter Calibration | **CRITICAL** | 3-stroke tutorial setup flow | Implemented |
| 13 | Shortcut Creation | High | Quick Access Swipe Up action menu | Implemented |
| 14 | Shortcut Deletion | High | Contextual Triple Tap gesture | Implemented |
| 15 | System Reset | High | `resetAppOnboarding()` developer helper | Implemented |

---

## 8. Directory & File Reference Map

- **`index.html`**: Core DOM viewports, handwriting canvases (`#handwritingMenuCanvas`, `#tutorialCanvas`), single-focus hero card containers, and fixed touch navigation region (`#fixedSwipeArea`).
- **`app.js`**: Core state machine, event listeners, gesture recognizer, handwriting profiling engine, speech/haptic controllers, and screen modules.
- **`style.css`**: Design system tokens, high-contrast yellow borders (`#FFCC00`), glassmorphism cards, single-focus carousel animations, and blackout privacy screen styles.
- **`root/BlindEye_Accessibility_Analysis_Report.md`**: Structural gap analysis comparing code implementation with UX research.
- **`root/BlindEye_Tactile_Blueprint_50_Commands_Analysis.md`**: Complete evaluation of the 50 most used mobile commands tactile blueprint.
- **`root/BlindEye_Full_System_Documentation.md`**: Complete system documentation file.
