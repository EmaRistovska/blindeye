# New Development Plan 2: Complete Phase-by-Phase Execution & Deployment Plan (Capacitor Mobile & Server Architecture)

## 1. Overview & Core Philosophy

This document serves as the master execution and deployment plan for **BlindEye**, expanding upon the architectural foundation in `New_Dev_Plan.md`. BlindEye is an accessible, server-driven multi-sensory platform designed for blind and visually impaired users, utilizing a **web-first hybrid architecture powered by Capacitor**.

The platform decouples into four primary operational pillars:
1. **Public Landing & Authentication:** User overview, splash experience, and secure login portal.
2. **Programmer Engine (AI Builder):** Administrative portal (`/admin/programmer`) where gesture rules, screen states, haptic signatures, and TTS outputs are mapped in the database.
3. **Simulator / Tester Environment:** Web-based hardware sandbox (`/admin/simulator`) where all gestures, speech, haptics, and views are tested under real-time simulated conditions.
4. **Mobile Client (Capacitor Native Shell):** Cross-platform Android (APK/AAB) and iOS wrapper delivering native performance, low-level hardware access, and Over-The-Air (OTA) server-driven rule updates without requiring re-installation.

> **CRITICAL MANDATE: PROGRAMMER vs. SIMULATOR/TESTER PARITY**
> The **AI Programmer Engine** must match the **Simulator/Tester Environment** with 100% precision. The Simulator/Tester serves as the single source of truth for UI layouts, navigation hierarchies, gesture detection thresholds, speech synthesis parameters, haptic feedback patterns, accessibility DOM trees, and contextual rules. Every phase includes a dedicated **Parity Comparison Step** to guarantee zero divergence between what the Programmer configures and what the Simulator/Mobile Client executes.

---

## 2. Platform Architecture Overview

```
                                  ┌────────────────────────┐
                                  │      Public Landing    │
                                  │   & Splash / Auth UI   │
                                  └───────────┬────────────┘
                                              │ Admin Auth
                                              ▼
                                  ┌────────────────────────┐
                                  │  Admin Portal Router   │
                                  └─────┬────────────┬─────┘
                                        │            │
                   ┌────────────────────┘            └────────────────────┐
                   ▼                                                      ▼
┌──────────────────────────────────────┐                ┌──────────────────────────────────────┐
│       Programmer Engine (AI)         │                │        Simulator / Tester View       │
│  - Configures contextual commands    │                │  - Simulates device conditions       │
│  - Sets screen/state mapping logic   │◄── Sync via ──►│  - Tests haptics, TTS, gestures      │
│  - Generates state transition graph  │    Database    │  - Evaluates Programmer output       │
└──────────────────┬───────────────────┘                └──────────────────┬───────────────────┘
                   │                                                       │
                   └────────────────────┬──────────────────────────────────┘
                                        ▼
                        ┌──────────────────────────────┐
                        │   Fast API Server & Database │
                        │  (Express/Next.js + SQLite/  │
                        │   PostgreSQL + WebSockets)   │
                        └──────────────┬───────────────┘
                                       │ Real-time API / WebSocket / OTA Sync
                                       ▼
                        ┌──────────────────────────────┐
                        │     Mobile Client (APK/IPA)  │
                        │   (Capacitor Hybrid Native   │
                        │    Shell with Live Sync)     │
                        └──────────────────────────────┘
```

---

## 3. Phase-by-Phase Execution & Deployment Plan

---

### Phase 1: Local Environment Setup, Modular Refactoring & Core UI Foundation

#### Goal
Establish a modern, modular web-first project foundation using Vite, refactor monolithic legacy code (`app.js`) into clean ES modules, and implement the initial public landing page, splash screen, and authentication shell.

#### Main Tasks
1. **Toolchain Initialization:**
   - Initialize Vite + ESNext build setup for instantaneous HMR and bundle optimization.
   - Configure directory structure: `src/core/`, `src/modules/`, `src/components/`, `src/assets/`.
2. **Monolithic Code Refactoring:**
   - Extract core runtime modules out of `app.js`:
     - `src/core/speech.js`: Web Speech TTS wrapper, speech queue, and callback handler.
     - `src/core/haptics.js`: Web Vibration API wrapper & custom Morse vibration patterns.
     - `src/core/gestures.js`: Pointer and touch gesture engine (Swipe, Tap, Double-Tap, Long-Press, Shake).
     - `src/core/db.js`: Local storage and offline database interface.
     - `src/modules/*.js`: Specific screen controllers (`welcome.js`, `messages.js`, `phone.js`, `camera.js`, `navigation.js`, `settings.js`).
3. **Public Landing & Splash Experience:**
   - Build accessible Landing Page (`/`) with product overview, tactile features list, and high-contrast styling.
   - Implement animated Splash Screen (`/splash`) with brand identity and spoken audio greeting.
4. **Login & Authentication Shell:**
   - Create Admin Login Modal and Auth route handler (`/login`) with biometric/PIN prompt simulation.
   - Store secure session tokens in local storage / HTTP-only cookies.
5. **Main Category Shell Setup:**
   - Implement root navigation layout for the 5 main categories: **Messages, Phone, Camera, Navigation, Settings**.

#### Technologies
- **Build Tool:** Vite
- **Languages/Core:** HTML5, Modern Vanilla JavaScript (ES Modules), Vanilla CSS (Custom Design System, Dark Mode, Glassmorphism)
- **APIs:** Web Speech Synthesis, Vibration API, Web Storage API

#### Testing & Verification (Programmer vs. Simulator Parity Check)
- **Local Unit Testing:** Verify that refactored `speech.js`, `haptics.js`, and `gestures.js` retain exact parity with legacy `app.js` behavior.
- **Simulator Parity Check:** Ensure gesture thresholds (e.g. 300ms double-tap, 600ms long-press, nav-bar y-coordinate bounds) in `gestures.js` operate identically between the Simulator UI and the core engine.
- **Visual & Audio Verification:** Verify splash audio playback, high-contrast DOM rendering, and ARIA live region mirror synchronization.

#### Completion Criteria Before Phase 2
- Vite build passes cleanly without console errors or unhandled promises.
- `app.js` fully refactored into modular ES files.
- Landing page, Splash screen, Login modal, and Category navigation shell operational locally.

---

### Phase 2: Backend API, Database Architecture & Contextual Command Engine

#### Goal
Design and deploy the local backend API server and database schema to store screens, states, contextual commands, and user settings, supporting low-latency queries and real-time WebSocket synchronization.

#### Main Tasks
1. **Backend Server Setup:**
   - Initialize Node.js / Express (or Next.js API Routes) backend server in `server/`.
   - Set up REST API endpoints for screen registration, gesture lookup, and user profile management.
   - Integrate WebSocket (`ws` / `socket.io`) server for instant state & rule propagation.
2. **Contextual Database Architecture:**
   - Implement SQLite (via Drizzle ORM / Prisma) for local dev, structured for easy migration to PostgreSQL.
   - Create schema for `screens` and `contextual_commands`:
     ```sql
     CREATE TABLE screens (
         id TEXT PRIMARY KEY,
         name TEXT NOT NULL,
         parent_screen_id TEXT REFERENCES screens(id)
     );

     CREATE TABLE contextual_commands (
         id TEXT PRIMARY KEY,
         screen_id TEXT NOT NULL REFERENCES screens(id),
         gesture_code TEXT NOT NULL,
         sub_context TEXT,
         action_type TEXT NOT NULL,
         action_payload JSONB,
         haptic_pattern TEXT,
         created_by TEXT DEFAULT 'AI_PROGRAMMER',
         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
         CONSTRAINT unique_contextual_gesture UNIQUE (screen_id, gesture_code, sub_context)
     );
     ```
3. **Contextual Resolution Engine:**
   - Implement fast SQL query resolver: `SELECT * FROM contextual_commands WHERE screen_id = ? AND gesture_code = ? AND sub_context = ?`.
   - Enable multi-level fallback: If specific `sub_context` match is missing, fall back to default `screen_id` gesture rule.

#### Technologies
- **Backend:** Node.js, Express / Next.js
- **Database / ORM:** SQLite (dev) / PostgreSQL (prod), Drizzle ORM / Prisma
- **Real-Time:** WebSockets (ws / Socket.io)

#### Testing & Verification (Programmer vs. Simulator Parity Check)
- **Database Query Latency Test:** Ensure query resolution executes in `< 10ms` to avoid audio/haptic delay during swiping.
- **Contextual Parity Verification:** Verify that identical gestures (`SWIPE_RIGHT`, `DOUBLE_TAP`) return distinct payloads in the Simulator depending on `screen_id` (`messages` vs `phone`) and match the exact records written by the backend API.
- **WebSocket Broadcast Test:** Verify that updating a row in `contextual_commands` immediately pushes the change to connected Simulator clients.

#### Completion Criteria Before Phase 3
- Backend server running locally on port 3000/5000.
- Database tables initialized and seeded with baseline screen and gesture rules.
- REST endpoints and WebSocket channels passing automated integration tests.

---

### Phase 3: AI Programmer Engine & Decoupled Simulator Parity Alignment

#### Goal
Build the administrative portal containing both the **AI Programmer Engine** (`/admin/programmer`) and the **Standalone Simulator** (`/admin/simulator`), ensuring full bidirectional parity between rule creation and live gesture execution.

#### Main Tasks
1. **Admin Router Setup:**
   - Implement client-side routing for `/admin/programmer` and `/admin/simulator`.
   - Protect routes behind authentication middleware established in Phase 1.
2. **AI Programmer Engine (`/admin/programmer`):**
   - Build visual/JSON state transition graph editor allowing AI agents or admins to configure screen flows.
   - Build Contextual Command Form: Select `screen_id`, define `gesture_code`, enter `action_payload` (TTS prompt, haptic pattern, navigation target).
   - Integrate automated rule generator that writes directly to `contextual_commands` DB via REST/WebSocket API.
3. **Decoupled Simulator Web View (`/admin/simulator`):**
   - Render isolated hardware simulator frame (phone screen enclosure, navigation zone, visual haptic indicator, TTS output log, physical button controls).
   - Subscribe Simulator to live WebSocket feed from Backend DB so gesture mappings update without page reload.
4. **Programmer vs. Simulator Synchronization Pipeline:**
   - Build live side-by-side split screen view mode (`/admin/preview`) where altering a rule in the Programmer instantaneously updates the active Simulator frame.

#### Technologies
- **Frontend:** Vanilla JS Modules / Vite, Canvas / SVG State Graph Renderer
- **Communication:** WebSockets, REST APIs
- **Design System:** Custom dark mode UI with interactive visual feedback badges

#### Testing & Verification (Programmer vs. Simulator Parity Check)
- **Mandatory Parity Audit Step:**
  1. Open `/admin/programmer` and create a new gesture mapping for `screen_id: "camera"`, `gesture: "SWIPE_DOWN"`, `action: "TOGGLE_FLASH"`, `haptic: "DOUBLE_SHORT"`, `tts: "Flash enabled"`.
  2. Perform `SWIPE_DOWN` in `/admin/simulator` while on Camera view.
  3. Verify that the Simulator reads *"Flash enabled"*, triggers the double-short haptic pattern, and updates the status log **with zero latency or behavioral discrepancy**.
- **Edge Case Parity Test:** Test fallback behavior when `sub_context` is undefined in both Programmer and Simulator to ensure identical default handling.

#### Completion Criteria Before Phase 4
- `/admin/programmer` and `/admin/simulator` fully functional and accessible via admin portal.
- AI Programmer successfully creates, updates, and deletes contextual commands in DB.
- 100% behavioral parity verified between Programmer configurations and Simulator execution.

---

### Phase 4: Advanced Features & Real Cloud Service Integrations

#### Goal
Replace all simulated mockups with real browser and cloud service integrations, including live AI Camera OCR/Object Recognition, real-time GPS audio navigation, and interactive onboarding sandbox modules.

#### Main Tasks
1. **Live AI Camera OCR & Object Detection:**
   - Replace static camera image mockups with live web camera feed via `navigator.mediaDevices.getUserMedia()`.
   - Integrate browser-based Tesseract.js / TensorFlow Lite for offline OCR, and cloud vision API (OpenAI GPT-4o Vision / Google Cloud Vision API) for scene description.
   - Bind capture trigger to `DOUBLE_TAP` or `SWIPE_UP` in camera view.
2. **Real-Time GPS Navigation Engine:**
   - Integrate Web Geolocation API (`navigator.geolocation.watchPosition()`) for precise coordinate tracking.
   - Connect OpenStreetMap / Nominatim / Mapbox Routing APIs to compute walking routes.
   - Implement spoken audio turn-by-turn guidance engine (e.g. *"In 20 meters, turn left onto Main Street"*).
3. **Interactive Onboarding & Tutorial Sandbox:**
   - Integrate full onboarding tutorial flow:
     - **Step 0:** Screen Orientation (Navigation Zone vs Content Area explanation).
     - **Steps 1–5:** Mock Menu browsing (Messages, Phone, Settings) with interactive card updates and full speech end-callback timing to eliminate audio cutoffs.
     - **Morse Typing Sandbox:** Full-screen touch/hold Morse input with swipe-right (Space), swipe-left (Delete), swipe-up (Draft/Send).
     - **Global Shortcuts Training:** Two-finger swipe down for Quick Access, long press to complete.
     - **Handwriting Calibration:** Interactive letter drawing canvas with 3-stroke calibration.

#### Technologies
- **Camera & AI:** WebRTC MediaStreams, OpenAI Vision API / Google Cloud Vision, Tesseract.js
- **Location:** Web Geolocation API, OpenStreetMap / Mapbox API
- **Audio/Speech:** Web Speech Synthesis API, Web Audio API (Chimes/Tones)

#### Testing & Verification (Programmer vs. Simulator Parity Check)
- **Live Camera Verification:** Test physical webcam feed in Simulator. Ensure spoken OCR output matches camera capture text.
- **GPS Navigation Verification:** Mock GPS coordinates in browser DevTools and verify that spoken navigation instructions fire at correct distance thresholds.
- **Onboarding Parity Verification:** Verify that gesture tutorial steps in Simulator behave identically to rules defined in the Programmer DB.

#### Completion Criteria Before Phase 5
- Live webcam feed captures real text and speaks AI OCR results.
- GPS engine streams real coordinates and outputs turn-by-turn TTS guidance.
- Interactive onboarding, Morse typing sandbox, and handwriting calibration operational.

---

### Phase 5: Capacitor Mobile Packaging & Native Device Integrations (Android & iOS)

#### Goal
Wrap the web-first codebase in a native Capacitor hybrid container, install native plugins for hardware features, and build native test binaries for Android (APK) and iOS (Xcode project).

#### Main Tasks
1. **Capacitor Core Installation & Setup:**
   - Install `@capacitor/core` and `@capacitor/cli` into local project root.
   - Initialize Capacitor configuration (`capacitor.config.json` / `capacitor.config.ts`):
     ```json
     {
       "appId": "com.blindeye.accessibility",
       "appName": "BlindEye",
       "webDir": "dist",
       "server": {
         "androidScheme": "https",
         "cleartext": true
       }
     }
     ```
2. **Native Plugin Integrations:**
   - `@capacitor/haptics`: Provide low-level tactile vibration feedback for Android/iOS.
   - `@capacitor/geolocation`: Access native high-accuracy GPS hardware.
   - `@capacitor/camera`: Access native camera hardware with fallback to WebRTC.
   - `@capacitor/splash-screen`: Control native application launch splash screen.
   - `@capacitor/status-bar`: Style native status bar for high-contrast dark mode.
   - `@capacitor/keyboard`: Control soft keyboard behaviors during input.
3. **Android Project Setup:**
   - Run `npx cap add android`.
   - Configure `AndroidManifest.xml` with required native permissions: `CAMERA`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `VIBRATE`, `RECORD_AUDIO`, `INTERNET`.
   - Customize launcher icons and native splash background in `android/app/src/main/res/`.
4. **iOS Project Setup:**
   - Run `npx cap add ios`.
   - Configure `Info.plist` with permission usage strings (`NSCameraUsageDescription`, `NSLocationWhenInUseUsageDescription`, `NSMicrophoneUsageDescription`).
   - Configure Xcode build settings, bundle identifier, and signing capabilities.

#### Technologies
- **Framework:** Capacitor 6.x
- **Build Tools:** Android Studio / Gradle (Android), Xcode (iOS)
- **Native Plugins:** `@capacitor/haptics`, `@capacitor/camera`, `@capacitor/geolocation`, `@capacitor/splash-screen`, `@capacitor/status-bar`

#### Testing & Verification (Programmer vs. Simulator Parity Check)
- **Mobile vs. Simulator Parity Audit:**
  - Build Android APK (`npx cap build android`) and install on physical Android device or emulator.
  - Run identical test script on **Mobile APK** and **Web Simulator**:
    1. Swipe Right 3 times, Double-Tap, Long-Press.
    2. Trigger Two-Finger Tap status check.
    3. Open Morse typing sandbox and enter `. . . - - - . . .` (SOS).
  - Verify that **audio speech, haptic intensity, gesture detection accuracy, and UI layouts match 1-to-1** between Mobile Client and Web Simulator.
- **Native Haptic Verification:** Verify physical motor vibration via `@capacitor/haptics` on hardware device matches Web Vibration API in Simulator.

#### Completion Criteria Before Phase 6
- `npx cap sync` executes without errors.
- Android APK builds successfully and runs on device/emulator.
- iOS Xcode project builds cleanly without missing symbol errors.
- 100% parity verified between Mobile App and Web Simulator.

---

### Phase 6: Accessibility Hardening, ARIA Mirroring & System Testing

#### Goal
Perform rigorous accessibility audit and end-to-end testing to ensure blind users can operate 100% of app capabilities through voice, haptics, and native screen readers (TalkBack / VoiceOver).

#### Main Tasks
1. **Accessibility Infrastructure Hardening:**
   - Ensure visually hidden ARIA live region (`#accessibilityAnnouncer`) mirrors all spoken TTS text in real-time.
   - Enforce high-contrast color scheme (Pure Black `#000000` background, Cyan `#00E5FF` high-visibility borders, Yellow `#FFEE55` navigation outlines).
   - Ensure all touch targets in navigation zone cover full width and minimum 120px height for easy blind finger placement.
2. **Multi-Sensory Audio & Haptic Feedback Audit:**
   - Verify speech synthesis callbacks (`onEndCallback`) eliminate audio truncation across all screen transitions.
   - Verify audio chimes (success tone, error buzz, item focus tick) execute cleanly without distortion.
   - Audit Morse code haptic feedback engine for message reading and input.
3. **Automated & Manual Testing Suite:**
   - Write end-to-end integration tests (Playwright / Cypress) covering:
     - Biometric authentication bypass & full login flow.
     - Category switching and action menu selection.
     - Camera capture and TTS OCR output.
     - Onboarding tutorial completion.
     - WebSocket live command updates.

#### Technologies
- **Accessibility:** ARIA Live Regions (`aria-live="assertive"`), WCAG 2.1 AAA Contrast Guidelines
- **Testing:** Playwright / Cypress, Web Speech API Mock Testing

#### Testing & Verification (Programmer vs. Simulator Parity Check)
- **TalkBack & VoiceOver Compatibility Test:** Enable TalkBack on Android device and VoiceOver on iOS device. Operate Mobile App and Simulator in parallel to verify screen reader compatibility.
- **Full Parity Audit Matrix:**
  | Feature | Programmer Config | Web Simulator | Native Mobile (Capacitor) | Parity Status |
  | :--- | :--- | :--- | :--- | :--- |
  | Contextual Swipe | `SWIPE_RIGHT` -> Next | Matches | Matches | PASS |
  | Double Tap | `DOUBLE_TAP` -> Confirm | Matches | Matches | PASS |
  | Haptic Output | Custom Morse | Web Vibration | Native Haptics | PASS |
  | TTS Speech | `Speech.speak()` | Web Speech | Native/Web Speech | PASS |
  | Live Status Check | Two-Finger Tap | Battery/Time TTS | Native Battery/Time | PASS |

#### Completion Criteria Before Phase 7
- 0 accessibility violations under WCAG 2.1 AAA automated audit.
- Full screen reader compatibility verified on TalkBack (Android) and VoiceOver (iOS).
- All automated integration tests passing cleanly.

---

### Phase 7: Production Build Preparation, Bundling & Security Hardening

#### Goal
Optimize web assets, configure environment variables, secure API endpoints, and create production-ready deployment packages for both the web server and mobile apps.

#### Main Tasks
1. **Production Web Asset Bundling:**
   - Configure Vite production build (`vite build`):
     - Minify JavaScript & CSS bundles.
     - Enable tree-shaking to eliminate unused code.
     - Generate optimized PWA Service Worker assets and cache manifest.
2. **Security Hardening & Environment Configuration:**
   - Implement `Helmet` middleware for Express to inject security headers: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`.
   - Store sensitive keys (Cloud Vision API keys, JWT secrets, database connection strings) in `.env.production`.
   - Enforce rate limiting on API endpoints to protect against brute-force attacks.
3. **Capacitor Production Sync:**
   - Copy production `dist/` web assets into Capacitor native projects (`npx cap copy`).
   - Generate signed Android Application Bundle (`.aab`) for Google Play Store.
   - Archive iOS build (`.ipa`) in Xcode for Apple TestFlight / App Store submission.

#### Technologies
- **Bundler:** Vite
- **Security:** Helmet, CORS, Rate Limiting, JWT
- **Mobile Signing:** Android Keytool / Gradle signing, Apple Developer Certificates & Provisioning Profiles

#### Testing & Verification (Programmer vs. Simulator Parity Check)
- **Production Asset Parity Test:** Test minified production web bundle (`dist/`) inside local preview server (`vite preview`) and verify identical functionality with dev build.
- **Mobile Production Build Verification:** Install signed production APK on mobile device and verify connection to production server endpoints.

#### Completion Criteria Before Phase 8
- Production build `dist/` compiles cleanly with optimal asset sizing.
- Security headers and environment variables validated.
- Signed Android AAB/APK and iOS archive packages compiled and ready.

---

### Phase 8: VPS Deployment & Production Server Provisioning

#### Goal
Deploy the server backend, database, admin portal, and web application onto a live virtual private server (VPS) with SSL encryption, process management, and automated startup.

#### Main Tasks
1. **VPS Server Provisioning:**
   - Provision Linux VPS (Ubuntu 22.04 LTS) on provider (DigitalOcean, Hetzner, AWS, or Vultr).
   - Configure basic server security: Update packages, configure UFW firewall (allow SSH `22`, HTTP `80`, HTTPS `443`), disable root password login, create dedicated deploy user.
2. **Database & Environment Setup on VPS:**
   - Install PostgreSQL (or configure production SQLite persistent volume).
   - Run database migrations (`drizzle-kit push` / `prisma migrate deploy`) to create production tables (`screens`, `contextual_commands`, `users`).
   - Populate `.env` file on VPS with production secrets and HTTPS domain hostnames.
3. **Backend Service Deployment & Process Management:**
   - Install Node.js LTS and PM2 process manager on VPS.
   - Start backend server using PM2 with automatic restart on crash and server reboot:
     ```bash
     pm2 start server/index.js --name "blindeye-backend"
     pm2 save
     pm2 startup
     ```
4. **Nginx Reverse Proxy & SSL Certificate Configuration:**
   - Install Nginx web server.
   - Configure Nginx server block for domain (e.g. `blindeye.yourdomain.com`):
     - Proxy standard HTTP requests to `http://localhost:3000`.
     - Proxy WebSocket connections (`/socket.io/` or `/ws`) with `Upgrade` and `Connection` headers.
   - Install Certbot and generate free SSL certificate via Let's Encrypt:
     ```bash
     sudo certbot --nginx -d blindeye.yourdomain.com
     ```

#### Technologies
- **OS / Hosting:** Ubuntu 22.04 LTS, VPS
- **Process Manager:** PM2
- **Web Server & Reverse Proxy:** Nginx
- **SSL / Security:** Certbot / Let's Encrypt, UFW Firewall
- **Database:** PostgreSQL / SQLite

#### Testing & Verification (Programmer vs. Simulator Parity Check)
- **Live Server Parity Test:**
  1. Access `https://blindeye.yourdomain.com` from desktop browser.
  2. Log in as admin and open `/admin/programmer` and `/admin/simulator` on the live VPS domain.
  3. Verify that changes saved in live Programmer DB instantly update live Simulator views over secure WebSockets (`wss://`).
  4. Launch Mobile Client APK on physical device, point connection to live server domain `https://blindeye.yourdomain.com`, and verify 100% operational parity.

#### Completion Criteria Before Phase 9
- Live domain active with valid HTTPS SSL green padlock.
- Nginx, PM2, and Database running smoothly on VPS with 99.9% uptime configuration.
- Mobile client communicating cleanly with live VPS backend.

---

### Phase 9: Future Live VPS Updates & Over-The-Air (OTA) Pipeline

#### Goal
Establish an automated Continuous Integration / Continuous Deployment (CI/CD) and Over-The-Air (OTA) live update pipeline, allowing instantaneous gesture rule updates and web bundle patches on the live VPS without forcing users to re-download the mobile APK.

#### Main Tasks
1. **Live OTA Dynamic Rule Sync Engine:**
   - When the AI Programmer updates gesture rules or screen states in `/admin/programmer` on the live VPS, the backend automatically broadcasts a JSON payload to all connected mobile clients over WebSockets.
   - Mobile clients immediately update their internal `contextual_commands` lookup table in memory and cache it locally in IndexedDB/SQLite for offline use.
2. **Capacitor Live Web Bundle Updates (Capacitor Live Updates / Ionic Deploy):**
   - Integrate Capacitor Live Updates plugin (or custom web bundle fetcher).
   - When new web features or bugfixes are deployed to the VPS, mobile app checks server manifest on launch (`GET /api/v1/app-version`).
   - If newer web bundle is available, app downloads the updated zip in background and swaps the local Web View directory **instantly without Play Store / App Store re-submission**.
3. **Automated CI/CD Deployment Pipeline (GitHub Actions):**
   - Create GitHub Actions workflow (`.github/workflows/deploy.yml`):
     - Run linter, automated tests, and build check on git push to `master` / `main`.
     - SSH into VPS, pull latest code, install dependencies, run DB migrations, rebuild production web assets, and restart PM2 process (`pm2 reload blindeye-backend`).
4. **Zero-Downtime Database Migrations:**
   - Enforce backward-compatible schema changes (adding optional columns, non-breaking tables) to ensure older mobile clients continue operating during VPS schema updates.

#### Technologies
- **CI/CD:** GitHub Actions, SSH, Git
- **OTA Updates:** WebSockets, Capacitor Live Updates / Custom Web Bundle Downloader
- **Database:** Drizzle Migrations / Prisma Migrations

#### Testing & Verification (Programmer vs. Simulator Parity Check)
- **End-to-End Live OTA Update Verification Test:**
  1. Modify a TTS voice prompt or gesture mapping in `New_Dev_Plan2.md` / Programmer UI on live VPS.
  2. Observe live mobile app on physical phone without closing or reinstalling the app.
  3. Perform the gesture on the physical phone.
  4. Verify that the mobile app executes the **new rule instantly** via WebSocket push.
  5. Deploy a web bundle patch via GitHub Actions CI/CD and verify VPS reloads within 5 seconds with zero dropped connections.

#### Completion Criteria (Final Plan Milestone)
- Automated CI/CD pipeline successfully deploys master branch updates to VPS in `< 2 minutes`.
- Live OTA rule updates function seamlessly across Web Simulator and Native Mobile APK.
- Platform fully deployed, documented, and operational end-to-end.

---

## 4. Master Deployment Roadmap Summary

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    BLINDEYE EXECUTION ROADMAP                                    │
├──────────────────────────────────┬─────────────────────────────────┬─────────────────────────────┤
│ Phase                            │ Key Deliverables                │ Parity & Verification       │
├──────────────────────────────────┼─────────────────────────────────┼─────────────────────────────┤
│ Phase 1: Local & Modular Setup   │ Vite setup, app.js ES Modules,  │ Local unit & gesture        │
│                                  │ Landing page, Splash, Auth UI   │ threshold parity check      │
├──────────────────────────────────┼─────────────────────────────────┼─────────────────────────────┤
│ Phase 2: Backend API & DB        │ Node/Express server, DB schema, │ Query latency < 10ms &      │
│                                  │ REST & WebSocket APIs           │ WebSocket sync verification │
├──────────────────────────────────┼─────────────────────────────────┼─────────────────────────────┤
│ Phase 3: AI Programmer & Sim     │ Admin router, AI Programmer UI, │ Programmer vs Simulator     │
│                                  │ Decoupled Simulator Web View    │ 100% parity verification    │
├──────────────────────────────────┼─────────────────────────────────┼─────────────────────────────┤
│ Phase 4: Advanced Features & AI  │ Live AI Camera OCR, GPS engine, │ Camera OCR & GPS TTS        │
│                                  │ Onboarding sandbox & Morse pad  │ audio guide verification    │
├──────────────────────────────────┼─────────────────────────────────┼─────────────────────────────┤
│ Phase 5: Capacitor Mobile Packaging│ Capacitor 6 setup, Native Plugins│ Mobile APK/IPA vs           │
│                                  │ Android (APK) & iOS (Xcode)     │ Simulator parity audit      │
├──────────────────────────────────┼─────────────────────────────────┼─────────────────────────────┤
│ Phase 6: Accessibility & Audit   │ ARIA Live mirror, high-contrast,│ TalkBack / VoiceOver        │
│                                  │ End-to-end integration tests    │ full screen reader matrix   │
├──────────────────────────────────┼─────────────────────────────────┼─────────────────────────────┤
│ Phase 7: Production Build        │ Vite bundle minification, asset │ Minified preview & signed   │
│                                  │ optimization, security headers  │ APK / AAB validation        │
├──────────────────────────────────┼─────────────────────────────────┼─────────────────────────────┤
│ Phase 8: VPS Live Deployment     │ Ubuntu VPS, Nginx, Certbot SSL, │ Live domain SSL & VPS       │
│                                  │ PM2 process manager, DB deploy  │ Web/Mobile sync test        │
├──────────────────────────────────┼─────────────────────────────────┼─────────────────────────────┤
│ Phase 9: Live VPS Updates & OTA  │ GitHub Actions CI/CD pipeline,  │ Zero-downtime deployment &  │
│                                  │ OTA instant WebSocket rule sync │ real-time OTA push test     │
└──────────────────────────────────┴─────────────────────────────────┴─────────────────────────────┘
```
