# New Development Plan 2: Complete Phase-by-Phase Execution & Deployment Plan (Programmer-Driven Capacitor Architecture)

## 1. Overview & Core Philosophy

This document serves as the master execution and deployment plan for **BlindEye**, expanding upon the architectural foundation in `New_Dev_Plan.md`. BlindEye is an accessible, server-driven multi-sensory platform designed for blind and visually impaired users, utilizing a **web-first hybrid architecture powered by Capacitor**.

The platform decouples into four primary operational pillars:
1. **Public Landing & Authentication:** User overview, splash experience, and secure login portal.
2. **Programmer Engine (AI Builder & Source of Truth):** The primary administrative portal (`/admin/programmer`) where the AI agent configures state transition graphs, contextual gesture rules, screen states, haptic signatures, and TTS outputs in the database.
3. **Simulator / Tester Environment:** Web-based hardware sandbox (`/admin/simulator`) that ingests and evaluates the Programmer's source-of-truth configuration under real-time simulated conditions.
4. **Mobile Client (Capacitor Native Shell):** Cross-platform Android (APK/AAB) and iOS container executing the Programmer's server-driven configuration with low-level device hardware access and Over-The-Air (OTA) updates.

> **CRITICAL MANDATE: PROGRAMMER ENGINE AS THE SOURCE OF TRUTH**
> The **Programmer Engine (AI Builder)** is the **Single Source of Truth** for all screen hierarchies, navigation states, gesture mapping rules, speech synthesis strings, haptic vibration patterns, and accessibility DOM structures. The **Simulator/Tester** and **Mobile Client** must match the Programmer Engine with 100% precision. Every phase includes a dedicated **Parity Verification Step** to guarantee that the Simulator and Native Mobile Client execute the Programmer's master definitions without divergence.

---

## 2. Platform Architecture Overview

```
                        ┌──────────────────────────────────────┐
                        │    Programmer Engine (AI Builder)    │
                        │       ★ SOURCE OF TRUTH ★            │
                        │  - Configures contextual commands    │
                        │  - Sets screen & navigation logic    │
                        │  - Generates state transition graph  │
                        └──────────────────┬───────────────────┘
                                           │
                                           │ Writes Master Config
                                           ▼
                        ┌──────────────────────────────────────┐
                        │      Fast API Server & Database      │
                        │  (Express/Next.js + SQLite/Postgres) │
                        └──────────┬────────────────┬──────────┘
                                   │                │
             Reads Master Config   │                │   Reads Master Config
             & Syncs Real-time     │                │   & Syncs Real-time
                                   ▼                ▼
        ┌──────────────────────────────┐        ┌──────────────────────────────┐
        │    Simulator / Tester View   │        │     Mobile Client (APK/IPA)  │
        │  - Hardware & sensor sandbox │        │   - Native Capacitor shell   │
        │  - Validates Programmer rules│        │   - Executes live DB rules   │
        └──────────────────────────────┘        └──────────────────────────────┘
```

---

## 3. Phase-by-Phase Execution & Deployment Plan

---

### Phase 1: Local Environment Setup, Modular Refactoring & Core UI Foundation

#### Goal
Establish a modern, modular web-first project foundation using Vite, refactor monolithic legacy code (`app.js`) into clean ES modules, and build the initial frontpage landing view, splash screen, and login/auth shell matching the Programmer configuration schema.

#### Main Tasks
1. **Toolchain & Workspace Initialization:**
   - Initialize Vite + ESNext build setup for instantaneous HMR and optimized bundling.
   - Standardize project directory structure: `src/core/`, `src/modules/`, `src/components/`, `src/assets/`.
2. **Monolithic Code Refactoring:**
   - Extract core runtime modules out of `app.js`:
     - `src/core/speech.js`: Web Speech TTS wrapper, speech queue, and callback handler.
     - `src/core/haptics.js`: Web Vibration API wrapper & custom Morse vibration patterns.
     - `src/core/gestures.js`: Pointer and touch gesture engine (Swipe, Tap, Double-Tap, Long-Press, Shake).
     - `src/core/db.js`: Local storage and offline database interface.
     - `src/modules/*.js`: Screen controllers (`welcome.js`, `messages.js`, `phone.js`, `camera.js`, `navigation.js`, `settings.js`).
3. **Public Landing Page & Splash Experience:**
   - Build accessible Landing Page (`/`) detailing BlindEye features and high-contrast design system.
   - Implement Splash Screen (`/splash`) with brand identity and spoken audio greeting.
4. **Login & Authentication Shell:**
   - Create Admin Login Modal and Auth route handler (`/login`) with simulated biometric/PIN verification.
   - Store secure session tokens in local storage / HTTP-only cookies.
5. **Main Screen & Category Shell:**
   - Construct main category view containing the 5 core sections: **Messages, Phone, Camera, Navigation, Settings**.

#### Technologies
- **Build Tool:** Vite
- **Languages/Core:** HTML5, Modern Vanilla JavaScript (ES Modules), Vanilla CSS (Custom Design System, Dark Mode, Glassmorphism)
- **APIs:** Web Speech Synthesis, Vibration API, Web Storage API

#### Testing & Verification (Programmer Parity Verification Step)
- **Local Unit Testing:** Verify refactored ES modules (`speech.js`, `haptics.js`, `gestures.js`) maintain complete functional parity with legacy `app.js`.
- **Programmer Alignment Check:** Verify gesture threshold constants (300ms double-tap, 600ms long-press, nav-bar y-coordinate bounds) in `gestures.js` conform exactly to the Programmer Engine's target configuration schema.
- **Audio & Visual Verification:** Verify splash audio playback, high-contrast DOM rendering, and ARIA live region mirror synchronization.

#### Completion Criteria Before Phase 2
- Vite build compiles without console errors or unhandled promises.
- `app.js` refactored into modular ES component files.
- Landing page, Splash screen, Login modal, and Category shell operational locally.

---

### Phase 2: Backend API, Database Architecture & Contextual Command Engine

#### Goal
Build the local backend server and database architecture to persist the Programmer's master state definitions, screens, contextual commands, and user preferences with low query latency and real-time WebSocket propagation.

#### Main Tasks
1. **Backend Server Setup:**
   - Initialize Node.js / Express (or Next.js API Routes) backend server in `server/`.
   - Implement REST API endpoints for screen registration, command lookup, and configuration updates.
   - Integrate WebSocket (`ws` / `socket.io`) server for broadcasting real-time Programmer updates.
2. **Contextual Database Architecture:**
   - Setup SQLite (via Drizzle ORM / Prisma) for dev, configured for frictionless production deployment to PostgreSQL.
   - Create schema for `screens` and `contextual_commands` (storing the Programmer's master rules):
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
3. **Contextual Query Engine:**
   - Implement low-latency query resolver: `SELECT * FROM contextual_commands WHERE screen_id = ? AND gesture_code = ? AND sub_context = ?`.
   - Implement fallback hierarchy: If sub-context match is missing, fall back to default screen gesture rule defined by the Programmer.

#### Technologies
- **Backend:** Node.js, Express / Next.js
- **Database / ORM:** SQLite (dev) / PostgreSQL (prod), Drizzle ORM / Prisma
- **Real-Time:** WebSockets (ws / Socket.io)

#### Testing & Verification (Programmer Parity Verification Step)
- **Database Latency Test:** Ensure query resolution completes in `< 10ms` to prevent swipe latency.
- **Programmer Rule Resolution Test:** Verify that identical gestures (`SWIPE_RIGHT`, `DOUBLE_TAP`) queried against distinct `screen_id` values return the exact contextual payloads defined by the Programmer.
- **WebSocket Push Test:** Verify that creating or updating a command in `contextual_commands` immediately broadcasts the update to listening clients.

#### Completion Criteria Before Phase 3
- Backend API running locally on port 3000/5000.
- Database tables populated with master screen and command definitions.
- REST endpoints and WebSocket sync channels passing automated integration tests.

---

### Phase 3: AI Programmer Engine & Decoupled Simulator Parity Alignment

#### Goal
Develop the administrative portal housing the **AI Programmer Engine (Source of Truth)** at `/admin/programmer` and the **Standalone Simulator** at `/admin/simulator`, ensuring the Simulator executes the Programmer's master rules with 100% fidelity.

#### Main Tasks
1. **Admin Router Setup:**
   - Implement routing for `/admin/programmer` and `/admin/simulator`.
   - Restrict access via authentication middleware built in Phase 1.
2. **AI Programmer Engine (`/admin/programmer` - Source of Truth):**
   - Build visual/JSON state transition editor where AI agents or admins configure screen states and flow graphs.
   - Build Contextual Command Form: Define `screen_id`, `gesture_code`, `action_type`, `action_payload` (TTS string, haptic signature, target view).
   - Write new and updated rules directly to `contextual_commands` DB via REST/WebSocket API.
3. **Decoupled Simulator Web View (`/admin/simulator`):**
   - Render hardware simulator frame (phone viewport, bottom navigation zone, haptic visualizer, TTS output log, simulator buttons).
   - Subscribe Simulator to backend WebSocket feed so changes made in the Programmer apply live in the Simulator without reloading.
4. **Side-by-Side Programmer vs. Simulator Alignment:**
   - Build live preview mode (`/admin/preview`) rendering the Programmer UI and Simulator UI in parallel.

#### Technologies
- **Frontend:** Vanilla JS Modules / Vite, Canvas / SVG State Graph Renderer
- **Communication:** WebSockets, REST APIs
- **UI System:** High-contrast dark theme with visual state badges

#### Testing & Verification (Programmer Parity Verification Step)
- **Mandatory Programmer vs. Simulator Parity Test:**
  1. Open `/admin/programmer` and define a new rule: `screen_id: "camera"`, `gesture: "SWIPE_DOWN"`, `action: "TOGGLE_FLASH"`, `haptic: "DOUBLE_SHORT"`, `tts: "Flash enabled"`.
  2. Perform `SWIPE_DOWN` in `/admin/simulator` on the Camera screen.
  3. Confirm the Simulator outputs *"Flash enabled"*, triggers the double-short haptic visualizer, and logs the action **matching the Programmer's source of truth exactly**.
- **Edge Case Parity Audit:** Verify that missing sub-contexts or unmapped gestures trigger identical fallback responses in both the Programmer definition test and Simulator runtime.

#### Completion Criteria Before Phase 4
- `/admin/programmer` and `/admin/simulator` fully operational.
- AI Programmer Engine writes master configurations to database seamlessly.
- 100% behavioral parity verified between Programmer master definitions and Simulator execution.

---

### Phase 4: Advanced Features & Cloud API Integration

#### Goal
Integrate real browser and cloud APIs—including AI Camera OCR/Object Recognition, real-time GPS audio navigation, and interactive onboarding sandbox modules—configured through the Programmer Engine's master rules.

#### Main Tasks
1. **Live AI Camera OCR & Scene Detection:**
   - Connect live webcam stream via `navigator.mediaDevices.getUserMedia()`.
   - Integrate browser Tesseract.js / TensorFlow Lite for offline OCR, and cloud vision API (OpenAI GPT-4o Vision / Google Cloud Vision API) for scene description.
   - Map capture trigger to Programmer's master gesture rule (`DOUBLE_TAP` or `SWIPE_UP` in Camera context).
2. **Real-Time GPS Audio Navigation Engine:**
   - Connect Web Geolocation API (`navigator.geolocation.watchPosition()`) for coordinate tracking.
   - Connect OpenStreetMap / Mapbox APIs for walking route calculation.
   - Implement spoken audio turn-by-turn guidance engine (e.g. *"In 20 meters, turn left onto Main Street"*).
3. **Interactive Onboarding & Tutorial Modules:**
   - Implement full onboarding tutorial flow defined by Programmer master rules:
     - **Step 0:** Screen Orientation (Navigation Zone vs Content Area).
     - **Steps 1–5:** Mock Menu browsing (Messages, Phone, Settings) with dynamic category cards and speech end-callbacks (`onEndCallback`) to prevent audio truncation.
     - **Morse Sandbox:** Full-screen touch/hold Morse input with swipe-right (Space), swipe-left (Delete), swipe-up (Draft/Send).
     - **Global Shortcuts Training:** Two-finger swipe down for Quick Access, long press to complete.
     - **Handwriting Calibration:** Interactive letter drawing canvas with 3-stroke calibration.

#### Technologies
- **Camera & AI:** WebRTC MediaStreams, OpenAI Vision API / Google Cloud Vision, Tesseract.js
- **Location:** Web Geolocation API, OpenStreetMap / Mapbox API
- **Audio/Speech:** Web Speech Synthesis API, Web Audio API

#### Testing & Verification (Programmer Parity Verification Step)
- **Live Camera OCR Test:** Capture text via webcam in Simulator and verify spoken OCR output matches camera text and Programmer prompt definitions.
- **GPS Guidance Test:** Simulate GPS coordinates in DevTools and verify turn-by-turn TTS instructions trigger at exact programmed thresholds.
- **Onboarding Parity Test:** Confirm all tutorial screens, Morse sandbox inputs, and handwriting steps run strictly according to the Programmer's master state machine.

#### Completion Criteria Before Phase 5
- Live camera captures real text and speaks AI OCR results.
- Real-time GPS streams coordinates and outputs turn-by-turn audio guidance.
- Interactive onboarding, Morse typing sandbox, and handwriting calibration fully operational.

---

### Phase 5: Capacitor Mobile Integration (Android & iOS)

#### Goal
Package the web-first application into a native Capacitor hybrid wrapper, integrate native hardware plugins, and compile native Android (APK/AAB) and iOS (Xcode) packages executing the Programmer's source-of-truth rules.

#### Main Tasks
1. **Capacitor Core Installation & Setup:**
   - Install `@capacitor/core` and `@capacitor/cli` into project root.
   - Configure `capacitor.config.json` / `capacitor.config.ts`:
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
   - `@capacitor/haptics`: Low-level tactile vibration feedback for Android/iOS.
   - `@capacitor/geolocation`: High-accuracy native GPS hardware access.
   - `@capacitor/camera`: Native camera hardware access with WebRTC fallback.
   - `@capacitor/splash-screen`: Native application launch splash screen.
   - `@capacitor/status-bar`: Dark mode high-contrast status bar styling.
   - `@capacitor/keyboard`: Soft keyboard management during input.
3. **Android Target Project Setup:**
   - Execute `npx cap add android`.
   - Update `AndroidManifest.xml` with permissions: `CAMERA`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `VIBRATE`, `RECORD_AUDIO`, `INTERNET`.
   - Customize launcher icons and native splash screens in `android/app/src/main/res/`.
4. **iOS Target Project Setup:**
   - Execute `npx cap add ios`.
   - Update `Info.plist` with permission keys (`NSCameraUsageDescription`, `NSLocationWhenInUseUsageDescription`, `NSMicrophoneUsageDescription`).
   - Configure Xcode build target, signing capabilities, and bundle ID.

#### Technologies
- **Framework:** Capacitor 6.x
- **Build Systems:** Android Studio / Gradle (Android), Xcode (iOS)
- **Native Plugins:** `@capacitor/haptics`, `@capacitor/camera`, `@capacitor/geolocation`, `@capacitor/splash-screen`, `@capacitor/status-bar`

#### Testing & Verification (Programmer Parity Verification Step)
- **Mobile vs. Programmer Parity Audit:**
  - Build Android APK (`npx cap build android`) and install on Android test device/emulator.
  - Run identical test sequence on **Mobile APK**, **Web Simulator**, and **Programmer DB Specs**:
    1. Perform Swipe Right 3 times, Double-Tap, Long-Press.
    2. Perform Two-Finger Tap status check.
    3. Enter Morse typing sandbox and input `. . . - - - . . .` (SOS).
  - Verify **Mobile APK executes the Programmer's master rules with 100% parity to the Web Simulator**.
- **Native Haptic Test:** Verify physical vibration via `@capacitor/haptics` matches Programmer's pattern specs.

#### Completion Criteria Before Phase 6
- `npx cap sync` runs cleanly.
- Android APK builds and runs on device/emulator.
- iOS Xcode project builds without missing symbol errors.
- 100% parity verified between Mobile Client execution and Programmer master rules.

---

### Phase 6: Accessibility Hardening, ARIA Mirroring & System Testing

#### Goal
Audit and harden the application for accessibility compliance, ensuring blind users can navigate and operate every feature through voice, haptics, and native screen readers (TalkBack / VoiceOver).

#### Main Tasks
1. **Accessibility Infrastructure Hardening:**
   - Ensure visually hidden ARIA live region (`#accessibilityAnnouncer`) mirrors all spoken TTS strings in real-time.
   - Enforce high-contrast visual layout (Pure Black `#000000` background, Cyan `#00E5FF` high-visibility borders, Yellow `#FFEE55` navigation outlines).
   - Ensure touch targets in navigation bar cover full width and minimum 120px height for reliable blind touch placement.
2. **Multi-Sensory Audio & Haptic Feedback Audit:**
   - Verify speech synthesis callbacks (`onEndCallback`) prevent speech truncation across all view transitions.
   - Verify audio chimes (success tone, error buzz, item focus tick) execute cleanly without distortion.
   - Audit Morse code haptic feedback engine for message reading and input.
3. **Automated & Manual Test Suites:**
   - Create end-to-end integration tests (Playwright / Cypress) covering:
     - Biometric authentication bypass & login flow.
     - Category switching and action menu selection.
     - Camera capture and TTS OCR output.
     - Onboarding tutorial completion.
     - WebSocket live command updates.

#### Technologies
- **Accessibility:** ARIA Live Regions (`aria-live="assertive"`), WCAG 2.1 AAA Guidelines
- **Testing:** Playwright / Cypress, Web Speech API Mocks

#### Testing & Verification (Programmer Parity Verification Step)
- **TalkBack & VoiceOver Compatibility Test:** Enable TalkBack (Android) and VoiceOver (iOS). Execute app flows and verify screen reader behavior matches Programmer specifications.
- **Full Parity Audit Matrix:**
  | Feature | Programmer Master Spec | Web Simulator | Native Mobile (Capacitor) | Parity Status |
  | :--- | :--- | :--- | :--- | :--- |
  | Contextual Swipe | `SWIPE_RIGHT` -> Next | Matches | Matches | PASS |
  | Double Tap | `DOUBLE_TAP` -> Confirm | Matches | Matches | PASS |
  | Haptic Output | Custom Morse Pattern | Web Vibration | Native Haptics | PASS |
  | TTS Speech | `Speech.speak()` String | Web Speech | Native/Web Speech | PASS |
  | Live Status Check | Two-Finger Tap | Battery/Time TTS | Native Battery/Time | PASS |

#### Completion Criteria Before Phase 7
- 0 accessibility violations under WCAG 2.1 AAA automated evaluation.
- Complete compatibility verified on TalkBack (Android) and VoiceOver (iOS).
- All automated integration tests passing cleanly.

---

### Phase 7: Production Build Preparation, Bundling & Security Hardening

#### Goal
Optimize web assets, set up environment variables, secure server endpoints, and create production-ready packages for web deployment and mobile release.

#### Main Tasks
1. **Production Web Asset Bundling:**
   - Configure Vite production build (`vite build`):
     - Minify JavaScript & CSS bundles.
     - Tree-shake unused code.
     - Generate optimized PWA Service Worker assets and cache manifest.
2. **Security Hardening & Environment Configuration:**
   - Implement `Helmet` middleware for Express to enforce security headers: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`.
   - Store sensitive keys (Cloud Vision API keys, JWT secrets, database credentials) in `.env.production`.
   - Apply rate limiting on API routes to protect against brute-force attacks.
3. **Capacitor Production Sync:**
   - Copy production `dist/` web assets into Capacitor projects (`npx cap copy`).
   - Generate signed Android Application Bundle (`.aab`) for Google Play Store.
   - Archive iOS build (`.ipa`) in Xcode for Apple TestFlight / App Store submission.

#### Technologies
- **Bundler:** Vite
- **Security:** Helmet, CORS, Rate Limiting, JWT
- **Mobile Signing:** Android Keytool / Gradle signing, Apple Developer Certificates & Provisioning Profiles

#### Testing & Verification (Programmer Parity Verification Step)
- **Production Asset Parity Test:** Test minified production web bundle (`dist/`) in preview server (`vite preview`) and verify identical functionality with dev build.
- **Mobile Production Build Test:** Install signed production APK on physical device and verify connection to production server endpoints.

#### Completion Criteria Before Phase 8
- Production build `dist/` compiles cleanly with optimized file sizes.
- Security headers and environment variables validated.
- Signed Android AAB/APK and iOS archive packages compiled and ready.

---

### Phase 8: VPS Deployment & Production Server Provisioning

#### Goal
Deploy the backend API server, database, AI Programmer Engine, and web platform onto a live virtual private server (VPS) with SSL encryption, process management, and automated startup.

#### Main Tasks
1. **VPS Server Provisioning:**
   - Provision Linux VPS (Ubuntu 22.04 LTS) on provider (DigitalOcean, Hetzner, AWS, or Vultr).
   - Configure server security: Update system packages, configure UFW firewall (allow SSH `22`, HTTP `80`, HTTPS `443`), disable root password login, create dedicated deploy user.
2. **Database & Environment Setup on VPS:**
   - Install PostgreSQL (or configure production SQLite persistent storage).
   - Run database migrations (`drizzle-kit push` / `prisma migrate deploy`) to build production tables (`screens`, `contextual_commands`, `users`).
   - Create `.env` file on VPS containing production secrets and HTTPS domain hostnames.
3. **Backend Service Deployment & Process Management:**
   - Install Node.js LTS and PM2 process manager on VPS.
   - Launch backend server using PM2 with automatic restart on failure and system reboot:
     ```bash
     pm2 start server/index.js --name "blindeye-backend"
     pm2 save
     pm2 startup
     ```
4. **Nginx Reverse Proxy & SSL Certificate Configuration:**
   - Install Nginx web server.
   - Configure Nginx server block for domain (`blindeye.yourdomain.com`):
     - Reverse proxy HTTP traffic to `http://localhost:3000`.
     - Reverse proxy WebSocket connections (`/socket.io/` or `/ws`) with `Upgrade` and `Connection` headers.
   - Install Certbot and generate SSL certificate via Let's Encrypt:
     ```bash
     sudo certbot --nginx -d blindeye.yourdomain.com
     ```

#### Technologies
- **OS / Hosting:** Ubuntu 22.04 LTS, VPS
- **Process Manager:** PM2
- **Web Server & Reverse Proxy:** Nginx
- **SSL / Security:** Certbot / Let's Encrypt, UFW Firewall
- **Database:** PostgreSQL / SQLite

#### Testing & Verification (Programmer Parity Verification Step)
- **Live VPS Programmer Parity Test:**
  1. Access `https://blindeye.yourdomain.com` from desktop browser.
  2. Log in as admin and open `/admin/programmer` and `/admin/simulator` on the live VPS domain.
  3. Modify a gesture rule in the live Programmer Engine; verify the change broadcasts instantly to live Simulator views over secure WebSockets (`wss://`).
  4. Launch Mobile Client APK on physical device, point connection to live domain `https://blindeye.yourdomain.com`, and verify 100% operational parity.

#### Completion Criteria Before Phase 9
- Live domain active with HTTPS SSL encryption.
- Nginx, PM2, and Database running smoothly on VPS with 99.9% uptime configuration.
- Mobile client communicating cleanly with live VPS backend.

---

### Phase 9: Future Live VPS Updates & Over-The-Air (OTA) Pipeline

#### Goal
Establish an automated Continuous Integration / Continuous Deployment (CI/CD) and Over-The-Air (OTA) live update pipeline, allowing instantaneous gesture rule updates and web bundle patches on the live VPS without requiring users to re-download the mobile APK.

#### Main Tasks
1. **Live OTA Dynamic Rule Sync Engine:**
   - When the AI Programmer updates gesture rules or screen states in `/admin/programmer` on the live VPS, the backend automatically broadcasts a JSON payload to connected mobile clients over WebSockets.
   - Mobile clients update their internal `contextual_commands` lookup table in memory and cache it locally in IndexedDB/SQLite for offline execution.
2. **Capacitor Live Web Bundle Updates (Capacitor Live Updates / Ionic Deploy):**
   - Integrate Capacitor Live Updates plugin (or custom web bundle fetcher).
   - When new web features or bugfixes deploy to the VPS, mobile apps check server manifest on launch (`GET /api/v1/app-version`).
   - If newer web bundle is available, app downloads the updated package in background and swaps the local Web View directory **instantly without Play Store / App Store re-submission**.
3. **Automated CI/CD Deployment Pipeline (GitHub Actions):**
   - Create GitHub Actions workflow (`.github/workflows/deploy.yml`):
     - Run linter, automated tests, and build checks on push to `master` / `main`.
     - SSH into VPS, pull latest code, install dependencies, run DB migrations, rebuild production web assets, and reload PM2 process (`pm2 reload blindeye-backend`).
4. **Zero-Downtime Database Migrations:**
   - Enforce backward-compatible schema changes (adding optional columns, non-breaking tables) so existing mobile clients remain functional during VPS schema updates.

#### Technologies
- **CI/CD:** GitHub Actions, SSH, Git
- **OTA Updates:** WebSockets, Capacitor Live Updates / Custom Web Bundle Downloader
- **Database:** Drizzle Migrations / Prisma Migrations

#### Testing & Verification (Programmer Parity Verification Step)
- **End-to-End Live OTA Update Verification Test:**
  1. Modify a TTS prompt or gesture mapping in the Programmer UI on the live VPS.
  2. Observe live mobile app on physical device without closing or reinstalling the app.
  3. Perform the gesture on the physical device.
  4. Verify that the mobile app executes the **new rule instantly** via WebSocket push.
  5. Deploy a web bundle patch via GitHub Actions CI/CD and verify VPS reloads within 5 seconds with zero dropped connections.

#### Completion Criteria (Final Plan Milestone)
- Automated CI/CD pipeline deploys master branch updates to VPS in `< 2 minutes`.
- Live OTA rule updates function seamlessly across Web Simulator and Native Mobile APK.
- Platform fully deployed, documented, and operational end-to-end with Programmer Engine as Source of Truth.

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
│ Phase 3: AI Programmer Engine    │ Admin router, AI Programmer UI  │ Programmer (Source of Truth)│
│          & Simulator Alignment   │ Decoupled Simulator Web View    │ vs Simulator 100% parity    │
├──────────────────────────────────┼─────────────────────────────────┼─────────────────────────────┤
│ Phase 4: Advanced Features & AI  │ Live AI Camera OCR, GPS engine, │ Camera OCR & GPS TTS        │
│                                  │ Onboarding sandbox & Morse pad  │ audio guide verification    │
├──────────────────────────────────┼─────────────────────────────────┼─────────────────────────────┤
│ Phase 5: Capacitor Mobile        │ Capacitor 6 setup, Native Plugins│ Mobile APK/IPA vs Programmer│
│          Packaging               │ Android (APK) & iOS (Xcode)     │ Source of Truth audit       │
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
