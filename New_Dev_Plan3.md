# BlindEye — Implementation Review & Master Development Plan 3 (New_Dev_Plan3)

**Document Version:** 3.0.0  
**Date:** August 16, 2026  
**Status:** Approved Architectural Blueprint & Actionable Plan  
**Target Codebase:** `BlindEye` (Web-First Modular ES6 + Express/SQLite + WebSockets + Capacitor 6)

---

## 1. Executive Summary & Codebase Health Audit

### 1.1 Current Implementation State

The BlindEye platform is transitioning from a monolithic single-file prototype (`app.js`, 6,131 lines) into a **Programmer-Driven, Server-Synced Architecture** utilizing modern ES modules, Vite, an Express backend with SQLite, and real-time WebSocket synchronization.

#### What Has Been Built Successfully:
- **Modular Core Structure:** Initial `src/core/` modules established for state management (`state.js`), routing (`router.js`), audio synthesis (`speech.js`), haptic/vibration feedback (`haptics.js`), and API/WebSocket communication (`api.js`).
- **Backend API & Fast SQLite Database:** Express server in `server/index.js` and `server/db.js` providing screen registration, contextual command lookup, low-latency gesture resolution (`/api/commands/resolve`), and WebSocket broadcast on rule updates.
- **AI Programmer Engine (`/admin/programmer`):** Dedicated UI in `src/components/programmer.js` for configuring screen state transition nodes, contextual gesture mappings, action types, haptic signatures, and TTS strings.
- **Decoupled Standalone Simulator (`/admin/simulator`):** Interactive sandbox in `src/components/simulator.js` with simulated viewport, tactile feedback badges, TTS log outputs, and real-time WebSocket listener.
- **Split Preview Parity Test (`/admin/preview`):** Side-by-side view in `src/components/preview.js` comparing Programmer source-of-truth definitions with Simulator execution.
- **Entry & Auth Shell:** High-contrast landing page (`landing.js`), splash screen (`splash.js`), and biometric authentication modal (`auth.js`).

---

### 1.2 Identified Bugs, Flaws & Architectural Gaps

An in-depth review of the active codebase revealed the following critical items requiring immediate resolution:

#### 🔴 Critical Issues

1. **Duplicate DOM IDs in Split Preview (`src/components/preview.js` vs `index.html`):**
   - `preview.js` creates nested containers with `id="programmerScreen"` and `id="simulatorScreen"`.
   - `index.html` *already* defines `#programmerScreen` and `#simulatorScreen` in the root DOM tree.
   - **Consequence:** `document.getElementById()` produces ambiguous node selections, resulting in event listeners attaching to the wrong container and broken rendering when toggling between views.
   - **Remedy:** Rename internal sub-containers in `preview.js` to `#previewProgrammerPane` and `#previewSimulatorPane`, and update `renderProgrammerScreen` / `renderSimulatorScreen` to accept custom target container selectors.

2. **Broken Touch Gesture Routing on Top-Level Screens (`src/core/gestures.js` & `src/main.js`):**
   - `GestureManager.handleGesture()` in `gestures.js` only contains handler branches for `onboardingAuthScreen`, `gestureTrainingScreen`, and `simulatorScreen`.
   - When a user touches or swipes the screen on `welcomeScreen` or `landingScreen`, `handleGesture()` logs the event but performs **no action**.
   - `handleWelcomeGesture()` is only attached to keyboard `keydown` events in `main.js`, breaking touch-based mobile interactions.
   - **Remedy:** Unify gesture routing through a centralized route-aware gesture dispatcher inside `router.js` or `gestures.js`.

3. **Per-Gesture Network Round-Trip Latency & Online-Only Dependency:**
   - In `simulator.js` and `api.js`, every gesture initiates a network HTTP `POST /api/commands/resolve`.
   - **Consequence:** Tactile and voice accessibility requires immediate sub-10ms feedback. Relying on an HTTP request per swipe introduces perceptible lag and breaks entirely when offline.
   - **Remedy:** Implement an **In-Memory & IndexedDB Local Rule Cache**. On boot or WebSocket push (`RULE_UPDATED`), the client syncs the full command table into local memory. Contextual gesture resolution then executes locally in `< 1ms`.

---

#### 🟡 Medium & Minor Discrepancies

4. **Hardcoded URLs & Port Mismatch:**
   - `programmer.js` line 170 hardcodes `fetch('http://localhost:5000/api/commands')` rather than using `api.js` helpers.
   - Vite is configured for port 3000, while the backend runs on port 5000.
   - **Remedy:** Route all API requests through `src/core/api.js` with relative paths and configure Vite proxying in dev (`/api` -> `http://localhost:5000`).

5. **API Response Serialization Inconsistency (`action_payload`):**
   - `GET /api/commands` returns `action_payload` as a raw JSON string from SQLite, whereas `POST /api/commands/resolve` and `POST /api/commands` return parsed JSON objects.
   - **Remedy:** Normalize all backend endpoints to parse `action_payload` consistently before returning JSON.

6. **Incomplete Migration of Legacy Modules from `app.js`:**
   - The unreferenced `app.js` (6,131 lines) contains rich domain logic for:
     - Messages list, single-focus thread cards, and SMS reading.
     - Phone dialer, contacts, recent calls, and active call simulation.
     - Live Camera OCR and scene description fallbacks.
     - GPS Turn-by-Turn Audio Navigation engine.
     - Morse code sandbox and 3-stroke handwriting letter recognition.
     - Emergency SOS double-shake and 3-second countdown dispatch.
   - These modules have not yet been extracted into `src/modules/`.

---

## 2. Platform Architecture: Source of Truth & Offline-First Sync

```
                         ┌─────────────────────────────────────────┐
                         │      AI Programmer Engine (Admin)       │
                         │          ★ SOURCE OF TRUTH ★            │
                         │  - Contextual gesture & action mapping  │
                         │  - State machine graph editor           │
                         │  - TTS prompt & haptic signature builder│
                         └────────────────────┬────────────────────┘
                                              │ Writes Master Config
                                              ▼
                         ┌─────────────────────────────────────────┐
                         │        Express Backend & Database       │
                         │           (SQLite / PostgreSQL)         │
                         │  - Low-latency REST API                 │
                         │  - WebSocket rule change broadcaster    │
                         └──────────────┬──────────────────┬───────┘
                                        │                  │
               Real-time WebSocket Push │                  │ Real-time WebSocket Push
               & Initial DB Fetch       │                  │ & Initial DB Fetch
                                        ▼                  ▼
                         ┌───────────────────────┐ ┌───────────────────────┐
                         │   Web Simulator       │ │ Mobile Client (APK)   │
                         │ (In-Memory Rule Cache)│ │ (Capacitor Container) │
                         │                       │ │ (Local IndexedDB/Mem) │
                         │ Local lookup: < 1ms   │ │ Local lookup: < 1ms   │
                         │ Instant Haptics & TTS │ │ Instant Haptics & TTS │
                         └───────────────────────┘ └───────────────────────┘
```

---

## 3. Master Phase-by-Phase Execution Plan (New_Dev_Plan3)

---

### Phase 1: Modular Core Refactoring & Legacy Code Migration

#### Goal
Complete the extraction of all domain modules from legacy `app.js` into clean, testable ES modules in `src/modules/`, fix DOM ID collisions, and unify the centralized gesture routing engine.

#### Main Tasks
1. **Fix DOM ID Collisions & Modular Mounting:**
   - Refactor `src/components/preview.js` to eliminate duplicate `#programmerScreen` and `#simulatorScreen` IDs.
   - Parameterize `renderProgrammerScreen(containerId)` and `renderSimulatorScreen(containerId)`.
2. **Unify Centralized Gesture Dispatcher:**
   - Update `src/core/gestures.js` to dispatch gestures dynamically based on `state.currentScreen`.
   - Wire touch and keyboard gestures seamlessly across all top-level views (`landingScreen`, `welcomeScreen`, `onboardingAuthScreen`, `simulatorScreen`).
3. **Migrate Domain Modules from `app.js` to `src/modules/`:**
   - `src/modules/messages.js`: Thread navigation, message reading, and composition.
   - `src/modules/phone.js`: Contacts browser, keypad dialer, incoming/active call simulation.
   - `src/modules/camera.js`: Camera preview container and OCR trigger.
   - `src/modules/navigation.js`: Saved places list and turn-by-turn guidance view.
   - `src/modules/settings.js`: Reading mode (voice/morse/combined), haptic intensity, privacy mode.
   - `src/modules/sos.js`: Double-shake sensor listener, SOS countdown, dispatch notification.
   - `src/modules/handwriting.js`: Canvas drawing engine and letter calibration.
   - `src/modules/onboarding.js`: 5-step tutorial walkthrough and Morse sandbox.

#### Parity Verification Step
- Execute manual touch gestures across every screen. Confirm 100% of screens transition without console warnings or unhandled rejections.

---

### Phase 2: Backend API Polish, Database Engine & Client-Side Local Cache

#### Goal
Polish the Express backend, add complete CRUD operations, normalize JSON responses, and implement an in-memory/IndexedDB client rule cache for sub-1ms local gesture resolution.

#### Main Tasks
1. **Backend REST API Enhancements:**
   - Implement `DELETE /api/commands/:id` for rule deletion.
   - Implement `POST /api/screens` and `DELETE /api/screens/:id` for dynamic screen registration.
   - Normalize `action_payload` in all endpoints using `JSON.parse()`.
   - Add schema validation middleware for command payloads.
2. **Client-Side In-Memory Rule Cache:**
   - In `src/core/api.js` and `src/core/state.js`, maintain a local `state.contextualCommands` lookup map:
     `lookupKey = "${screen_id}::${gesture_code}::${sub_context}"`.
   - On application startup, fetch all commands (`GET /api/commands`) and populate the cache.
   - When a WebSocket `RULE_UPDATED` message arrives, instantly update the in-memory cache and persist to `localStorage` / `IndexedDB`.
3. **Sub-1ms Gesture Resolver:**
   - Resolve gestures synchronously against the local cache with immediate fallback to `'DEFAULT'` sub-context, eliminating network delay entirely during user navigation.

#### Parity Verification Step
- Disconnect network in browser DevTools (Offline mode). Perform gesture navigation across screens. Verify that all programmed gestures execute with 0ms network latency.

---

### Phase 3: AI Programmer Engine & Parity Validation Suite

#### Goal
Elevate `/admin/programmer` with full visual state graph editing, rule preset export/import, and an automated Parity Verification matrix that validates behavioral parity between Programmer rules and Simulator execution.

#### Main Tasks
1. **AI Programmer State Graph & Rule Configurator:**
   - Visual SVG/Canvas state machine rendering active screens and directed transition arrows.
   - Interactive rule editor allowing instant creation/modification of gesture rules.
   - Configuration for Morse vibration signatures, TTS voice prompts, and target screen routes.
2. **Rule Presets & Export/Import:**
   - Provide pre-built configuration profiles:
     - *Default Blind Profile* (High Voice + Standard Haptics)
     - *Deaf-Blind Profile* (True Morse Motor Vibration + Muted Speech)
     - *Motor-Impaired Profile* (Simple Tap & Long-Press Only)
   - Export/Import rule graph JSON backups.
3. **Automated Programmer vs. Simulator Parity Suite:**
   - Dedicated validation tool at `/admin/preview` that iterates over all registered rules and executes synthetic test gestures, verifying 100% execution parity.

#### Parity Verification Step
- Define a new rule in the Programmer UI. Confirm that the Simulator immediately reflects the change via WebSocket push without page reload and produces the exact specified TTS and haptic outputs.

---

### Phase 4: Hardware APIs & AI Cloud Services Integration

#### Goal
Integrate live browser and cloud services for real-time camera OCR, GPS turn-by-turn guidance, and true motor-driven Morse vibration sequences for deaf-blind users.

#### Main Tasks
1. **Live Camera & AI OCR / Vision:**
   - Access device video stream via `navigator.mediaDevices.getUserMedia()`.
   - Integrate Tesseract.js / TensorFlow Lite for local offline text extraction.
   - Provide OpenAI GPT-4o Vision / Google Cloud Vision API integration for comprehensive scene and obstacle description.
2. **GPS Geolocation & Spoken Audio Guide:**
   - Connect Web Geolocation API (`navigator.geolocation.watchPosition()`) with high accuracy enabled.
   - Calculate distance and bearing to destination points (Home, Doctor, Pharmacy).
   - Generate turn-by-turn spoken audio guidance triggers based on distance thresholds.
3. **True Motor Vibration Engine for Deaf-Blind Users:**
   - Update `Haptic.trigger()` and `playMorseString()` to execute genuine non-blocking motor pulse trains via `navigator.vibrate([duration, gap, ...])`.
   - Ensure Morse vibration patterns convey full character sequences accurately without relying on audio tones.

#### Parity Verification Step
- Hold text in front of webcam in Camera view. Perform programmed capture gesture. Confirm spoken TTS reads recognized text accurately.

---

### Phase 5: Capacitor 6 Mobile Shell & Native Hardware Bridge

#### Goal
Wrap the web-first application in a native Capacitor 6 container for Android and iOS, integrating native plugins for hardware haptics, camera, GPS, and status bar styling.

#### Main Tasks
1. **Capacitor Core Setup:**
   - Install `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`.
   - Configure `capacitor.config.json` with app ID `com.blindeye.accessibility` and `webDir: "dist"`.
2. **Native Plugin Integrations:**
   - `@capacitor/haptics`: Low-level physical tactile vibration motors.
   - `@capacitor/camera`: Native camera capture with hardware flash control.
   - `@capacitor/geolocation`: High-accuracy background GPS location tracking.
   - `@capacitor/status-bar` & `@capacitor/splash-screen`: Dark theme high-contrast native shell.
3. **Android & iOS Native Projects:**
   - Run `npx cap add android` and `npx cap add ios`.
   - Configure Android permissions in `AndroidManifest.xml` (`CAMERA`, `ACCESS_FINE_LOCATION`, `VIBRATE`, `INTERNET`).
   - Configure iOS permissions in `Info.plist` (`NSCameraUsageDescription`, `NSLocationWhenInUseUsageDescription`).

#### Parity Verification Step
- Build Android APK (`npx cap build android`). Install on physical test device. Verify that native `@capacitor/haptics` triggers exact programmed vibration patterns and speech synthesis operates cleanly.

---

### Phase 6: Accessibility Hardening (WCAG 2.1 AAA) & ARIA Mirroring

#### Goal
Harden the entire platform for accessibility compliance, ensuring full compatibility with screen readers (TalkBack on Android, VoiceOver on iOS) and zero accessibility barriers.

#### Main Tasks
1. **ARIA Live Region Synchronization:**
   - Ensure all speech outputs mirror in real time to `#accessibilityAnnouncer` (`aria-live="assertive"`) and `#statusAnnouncer` (`aria-live="polite"`).
   - Verify `role="application"` bounds properly isolate custom touch gestures from conflicting screen reader gestures.
2. **Visual Ergonomics & High Contrast:**
   - Enforce WCAG 2.1 AAA contrast ratios across all views (Pure Black `#000000`, High-Vis Cyan `#00E5FF`, Safety Yellow `#FFEE55`, Emerald `#10B981`).
   - Ensure all touch targets in the bottom navigation zone maintain a minimum 120px height and 100% container width.
3. **Speech Truncation Prevention:**
   - Enforce strict `onEndCallback` sequence management in `src/core/speech.js` to ensure long descriptions finish speaking before chained transition cues execute.

#### Parity Verification Step
- Enable TalkBack (Android) / VoiceOver (iOS) on test device. Navigate through all menus and confirm screen reader announcements match the voice interface seamlessly.

---

### Phase 7: Production Bundling, Security & Performance Hardening

#### Goal
Optimize frontend assets with Vite, secure backend Express endpoints with Helmet and rate limiting, and generate production-ready signed packages.

#### Main Tasks
1. **Vite Production Bundling:**
   - Configure `vite build` with code minification, CSS purging, and sourcemap generation.
   - Set up Service Worker manifest for full PWA offline operation.
2. **Express Server Security Hardening:**
   - Implement `helmet` for Content Security Policy, XSS filtering, and strict transport headers.
   - Implement rate limiting (`express-rate-limit`) on API endpoints.
   - Enforce JWT authentication on administrative rule mutation routes (`POST /api/commands`, `POST /api/screens`).
3. **Mobile Release Signing:**
   - Generate production Android App Bundle (`.aab`) and signed `.apk` using Android release keystore.
   - Configure Xcode archive build for iOS TestFlight distribution.

#### Parity Verification Step
- Launch `npm run preview` and execute production build smoke tests. Confirm 0 security warnings and 0 asset loading failures.

---

### Phase 8: Live VPS Deployment & SSL Reverse Proxy

#### Goal
Deploy the BlindEye backend, database, AI Programmer Engine, and web portal to a live Linux VPS with SSL certificates, automated process management, and 99.9% uptime.

#### Main Tasks
1. **VPS Provisioning & Security:**
   - Provision Ubuntu 22.04 LTS VPS instance (DigitalOcean, Hetzner, AWS, or Vultr).
   - Configure UFW firewall (allow SSH `22`, HTTP `80`, HTTPS `443`), create dedicated deployment user.
2. **Process Management & Backend Deployment:**
   - Deploy backend using PM2 process manager (`pm2 start server/index.js --name blindeye-backend`).
   - Configure PM2 startup hook (`pm2 startup`) for automatic reboot recovery.
3. **Nginx Reverse Proxy & SSL Let's Encrypt:**
   - Configure Nginx server block for `blindeye.yourdomain.com`:
     - Proxy HTTP requests to `http://localhost:5000`.
     - Proxy WebSocket connections (`/ws` or `/socket.io`) with `Upgrade` and `Connection` headers.
   - Generate Let's Encrypt SSL certificate via `certbot --nginx`.

#### Parity Verification Step
- Access live HTTPS domain in browser and point mobile client APK to live domain. Verify secure WebSockets (`wss://`) sync updates instantaneously.

---

### Phase 9: Over-The-Air (OTA) Updates & CI/CD Pipeline

#### Goal
Implement zero-downtime Continuous Integration / Continuous Deployment (CI/CD) and dynamic Over-The-Air (OTA) rule synchronization, allowing instant gesture and UI updates on deployed mobile devices without requiring app store re-installation.

#### Main Tasks
1. **Live OTA Dynamic Rule Sync:**
   - When rules are modified in `/admin/programmer` on the live VPS, broadcast delta JSON over WebSockets to all connected mobile clients.
   - Mobile clients update their local in-memory and IndexedDB cache immediately.
2. **Capacitor Live Web Bundle Updates:**
   - Integrate Capacitor Live Updates plugin to allow instant OTA web bundle patches over HTTPS.
3. **GitHub Actions CI/CD Pipeline:**
   - Create `.github/workflows/deploy.yml` to automatically run tests, build production bundles, SSH into VPS, and reload PM2 on push to `master`.

#### Parity Verification Step
- Modify a gesture mapping in the live Programmer Engine. Confirm that a running mobile device executes the new rule within 500ms without app restart.

---

## 4. Master Deployment & Verification Roadmap Matrix

| Phase | Core Deliverable | Key Tech Stack | Parity & Quality Gate |
| :--- | :--- | :--- | :--- |
| **Phase 1** | Modular ES Migration & Gesture Dispatch Fix | Vite, ES Modules, Vanilla CSS | All touch & keyboard gestures pass |
| **Phase 2** | Backend Polish & Client Local Rule Cache | Express, SQLite, WebSockets | Sub-1ms local offline rule resolution |
| **Phase 3** | AI Programmer & Standalone Simulator | Canvas Graph, Admin Forms | 100% Programmer vs Simulator parity |
| **Phase 4** | Camera OCR, GPS Audio & True Haptics | WebRTC, Tesseract, Geolocation | Live OCR text & Turn-by-Turn TTS |
| **Phase 5** | Capacitor 6 Native Shell (Android/iOS) | Capacitor 6, Android Studio, Xcode | Physical device native vibration & APK |
| **Phase 6** | WCAG AAA Hardening & ARIA Sync | ARIA Live, TalkBack, VoiceOver | 0 WCAG AAA violations |
| **Phase 7** | Production Build & Security Hardening | Vite, Helmet, JWT, Rate-Limit | Clean production minified build |
| **Phase 8** | Live VPS Deployment & SSL Proxy | Ubuntu 22.04, Nginx, Certbot, PM2 | Live HTTPS & WSS sync verified |
| **Phase 9** | OTA Live Sync & CI/CD Pipeline | GitHub Actions, Live Updates | Instant real-time rule push to APK |

---

## 5. Summary of Immediate Action Items

1. **Fix DOM IDs:** Update `src/components/preview.js` to avoid duplicate `#programmerScreen` and `#simulatorScreen` IDs.
2. **Fix Touch Gestures:** Unify touch gesture handling in `src/core/gestures.js` for all screens.
3. **Local Rule Caching:** Sync rules on boot in `src/core/api.js` to eliminate per-gesture HTTP round-trips.
4. **Modularize Remaining Code:** Extract the remaining domain features (`messages`, `phone`, `camera`, `navigation`, `settings`, `sos`, `handwriting`, `onboarding`) from `app.js` into `src/modules/`.
