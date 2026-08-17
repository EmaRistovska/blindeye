# BlindEye Backend & Online Application Plan

**Status:** Proposed after repository audit on 2026-08-17

**Scope:** Preserve the current localhost simulator while creating a safe path to an independent online service, then a Capacitor Android APK. Flutter remains a deliberate alternative, not a parallel implementation.

## 1. Executive assessment

BlindEye has a promising and unusually well-focused prototype: it is a Vite browser application with a modular ES-module client, a small Express + SQLite configuration server, WebSocket rule notifications, and a strong haptic/voice-first interaction concept. The current project runs as a **local simulator and configuration proof-of-concept**, not yet as a secure end-user accessibility product.

The correct next step is not microservices or an immediate Flutter rewrite. Keep a modular monolith, make the local configuration cache truly offline-first, then place the same API behind a secure online deployment. Build the Capacitor client from that web app once the local user experience is reliable on real Android devices.

### What is good

- The repository has a clear Vite entry point, ES modules under `src/`, and a successful production build.
- The recent extraction of Messages, Phone, Camera, Navigation, Settings, SOS, handwriting, and menu modules greatly reduces dependence on the legacy 260 KB `app.js`.
- The server uses prepared SQLite statements, transactions for import, foreign keys, and normalized command payload responses. This is a solid local prototype foundation.
- The contextual-command model—screen + gesture + sub-context -> action, haptic, speech—is the right abstraction for a configurable accessibility platform.
- The in-memory command cache and WebSocket deltas are appropriate for fast gesture feedback.
- The UI has intentional accessibility strengths: high contrast, single-focus flows, keyboard gesture shortcuts, TTS, vibration, and a dedicated SOS path.
- `npm run build` completed successfully on this revision. The resulting production bundle is small (about 105 kB JavaScript before gzip).

### What blocks an online release

| Priority | Finding | Why it matters | Required outcome |
|---|---|---|---|
| P0 | All REST mutations, export/import, and WebSockets are public; `cors()` accepts any origin. | Anyone who can reach the service can alter or erase rule configurations and read exports. | Authentication, roles, origin allow-list, rate limits, audit trail. |
| P0 | The biometric flow only changes browser state. | It is a simulator, not authentication; it protects neither the API nor administrator functions. | Real server session for admin; native biometric only unlocks a local credential. |
| P0 | Untrusted screen IDs, names, rule fields, and TTS strings are placed into `innerHTML` in the Programmer UI. | An attacker who can save/import a rule can execute script in an administrator's browser. | Schema validation and text-only DOM rendering/escaping. |
| P0 | SOS, calls, SMS, AI scene description, and route guidance are predominantly simulated. | The UI claims actions that are not actually delivered; this is unsafe for an accessibility/emergency product. | Clearly label simulation now; implement verified providers and delivery receipts later. |
| P1 | The rule cache is memory-only and startup depends on the network. | A cold offline start has no cached rules. Local access must remain usable offline. | Versioned IndexedDB snapshot plus queued, conflict-safe sync. |
| P1 | Rules do not yet drive all real client behavior. | The simulator resolves a rule, but module actions remain mostly hard-coded. The configuration database is not the sole source of truth. | Typed action dispatcher used by both simulator and mobile UI. |
| P1 | `server/blindeye.db` is tracked and seeds use `INSERT OR REPLACE`. | Runtime data can be committed; restart can overwrite standard rule changes and delete conflicting rows. | Ignore runtime DB; migrations and idempotent, versioned seed data. |
| P1 | No automated tests, linting, CI, health route, request limits, structured logs, or error tracking. | Regressions in gestures and emergency paths are too easy to ship. | A minimum quality gate before every release. |
| P2 | Current server does not serve `dist`, and local URLs/proxy behavior differs from deployed behavior. | A production host needs a unified HTTPS origin and WebSocket proxy. | Container/reverse proxy deployment architecture. |
| P2 | Vite 5 chain has one high and one moderate development-server advisory in `npm audit`. Production dependencies audit clean. | Do not expose the Vite dev server; upgrade Vite deliberately. | Upgrade and test the build before shared-network development. |

### Functional gaps to treat honestly

- Camera access exists, but OCR/scene understanding needs a local OCR engine or a protected server-side vision integration.
- Geolocation exists, but routing uses local demonstration logic; it needs a geocoding/routing provider, consent, and a safe fallback.
- Browser `navigator.vibrate` and Web Speech are best-effort. Device/browser support varies; native adapters and graceful fallbacks are mandatory.
- Contacts, messages, settings, and history are browser-local prototype data. There is no user model, encrypted device store, server-side privacy model, or sync conflict policy.
- The server accepts arbitrary action types and JSON payloads. There is no action allow-list, payload versioning, size limit, or rule validation.
- Public admin workbench views are ordinary DOM states, not protected server routes.

## 2. Target architecture

Use one codebase and a **modular monolith** initially:

```text
Browser / Capacitor client
  UI + accessibility adapters
  -> typed action dispatcher
  -> IndexedDB local store + outbox
  -> HTTPS REST + secure WebSocket

Online API (one Node service)
  authentication + RBAC + validation + audit log
  -> PostgreSQL (production) / SQLite (local development)
  -> object storage only for explicit backups/media
  -> provider adapters: SMS, maps, vision, push notifications
```

### Boundaries

1. **Client domain layer**: gesture recognition must emit domain gestures, not invoke view-specific code directly.
2. **Action dispatcher**: validates `action_type` and payload; executes `NAVIGATE`, `SPEAK`, `HAPTIC`, `CALL`, `SOS`, `CAMERA_SCAN`, etc. Both the simulator and real client call this same dispatcher.
3. **Local repository**: indexed rules, profiles, user preferences, queued mutations, and sync cursor. It must operate while offline.
4. **API service**: validation, authentication, authorization, command/version publishing, audit events. It does not trust browser state.
5. **Provider adapters**: only server-side code has provider credentials. Each adapter has timeouts, retries, idempotency keys, and a mock implementation for localhost.

## 3. Technology decisions

### Client and mobile shell

**Choose Capacitor first.** It preserves the current Vite/JavaScript work, supports Android/iOS native integrations, and can be added to an existing web project. It is the lowest-risk route to a physical APK. Capacitor’s official documentation describes it as a native runtime that can be added to an existing modern web application and exposes native APIs through plugins. [Capacitor documentation](https://capacitorjs.com/docs)

Do not claim unrestricted code OTA updates. Keep native permission, security, and critical SOS behavior in approved native releases. Use normal API configuration updates for gesture rules, and only introduce a carefully governed live-update mechanism after store-policy and rollback requirements are defined.

**Revisit Flutter only if** native background execution, sensor processing, Bluetooth hardware, offline computer vision, or platform-specific accessibility behavior cannot meet requirements through Capacitor. Flutter is viable, but it would require a separate UI and state-management implementation. Flutter’s current guidance also supports a layered UI/domain/data model with a single source of truth and SQLite for complex offline data. [Flutter architecture](https://docs.flutter.dev/app-architecture/concepts), [Flutter SQL storage](https://docs.flutter.dev/app-architecture/design-patterns/sql)

### Server and data

- **Localhost:** retain Express + SQLite. Provide a `.env.example`, use a local `data/` directory ignored by Git, and preserve the existing fast setup.
- **Online:** use PostgreSQL. It is a better fit for concurrent users, reliable backups, row-level ownership, migrations, JSON payload validation, and operational monitoring.
- Keep Express initially rather than rewriting to a larger framework. Add a validation library, authentication middleware, security headers, request IDs, rate limiting, and a migration tool.
- Keep REST plus WebSockets. Use REST for commands/configuration and WebSocket notifications for configuration version deltas; do not send sensitive user data through broad broadcasts.

## 4. Data model and API contract

### Core entities

| Entity | Purpose | Key fields |
|---|---|---|
| `users` | Account and role identity | `id`, `email`, `role`, `status`, timestamps |
| `devices` | Registered client installations | `id`, `user_id`, `platform`, `public_key/device_token`, `last_seen_at` |
| `profiles` | Accessibility configuration ownership | `id`, `owner_id`, `name`, `version`, `published_at` |
| `screens` | Named states in a profile | `id`, `profile_id`, `key`, `name`, `parent_key` |
| `command_rules` | Gesture mapping | `id`, `profile_id`, `screen_key`, `gesture`, `sub_context`, `action_type`, `action_payload`, `version` |
| `profile_releases` | Immutable published snapshots | `id`, `profile_id`, `version`, `checksum`, `created_by` |
| `audit_events` | Admin traceability | actor, operation, entity, before/after metadata, timestamp |
| `outbox_events` | Reliable broadcast/provider work | type, payload, state, retry count, idempotency key |
| `emergency_contacts` | Protected emergency configuration | user/profile owner, contact, confirmation status |
| `emergency_events` | SOS lifecycle | device, location consent/result, provider result, delivery state |

Use string enum allow-lists for gestures, action types, haptic patterns, and roles. Do not let the client invent executable actions. Every profile release is immutable and versioned; a client syncs a complete snapshot or a delta from its last version.

### Endpoint shape

```text
GET    /healthz                         public health probe
POST   /v1/auth/login                   admin identity/session creation
POST   /v1/auth/refresh                 refresh an HTTP-only session
POST   /v1/auth/logout
GET    /v1/profiles/:id/release         authenticated client snapshot
GET    /v1/profiles/:id/changes?since=  authenticated delta sync
POST   /v1/profiles/:id/rules           admin only, validated draft change
PATCH  /v1/profiles/:id/rules/:ruleId   admin only
DELETE /v1/profiles/:id/rules/:ruleId   admin only
POST   /v1/profiles/:id/publish         admin only, creates immutable version
POST   /v1/emergency-events             authenticated device, idempotent
GET    /v1/admin/audit-events           admin only
WS     /v1/realtime                     authenticated, profile-scoped deltas
```

Keep the current local endpoints temporarily behind `/api` as a compatibility layer, but do not expose them publicly once `/v1` is ready.

## 5. Security and privacy baseline

1. Use HTTPS/WSS only online; terminate TLS at the reverse proxy and enforce secure cookies.
2. Restrict CORS to configured application origins. Never use unrestricted `cors()` in deployment.
3. Authenticate every WebSocket handshake and authorize every REST resource by user/profile ownership and role.
4. Validate request and response schemas, reject unknown fields, set body-size limits, and escape or render all user/configuration text via `textContent` rather than `innerHTML`.
5. Add Helmet/CSP, rate limiting, CSRF protection for cookie-authenticated mutations, request IDs, safe error responses, and dependency scanning.
6. Store no provider secret, emergency contact, access token, or full location history in localStorage. Use encrypted native secure storage in Capacitor and platform keystore/keychain abstractions.
7. Collect location only with explicit, revocable consent and only for the purpose the user invokes. Retain emergency/location records for a documented minimum period and provide deletion/export controls.
8. Treat SOS delivery as a state machine: `initiated -> confirmed -> queued -> provider_accepted -> delivered/failed`. Announce the truthful result, not a simulated success.

These controls address the authorization, authentication, resource-consumption, validation, and CORS concerns emphasized by the [OWASP API Security Top 10](https://devguide.owasp.org/en/07-training-education/07-api-top-ten/) and [REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html).

## 6. Offline-first behavior

At install/first authenticated sync, download the current signed profile release into IndexedDB. The app resolves every gesture from memory synchronously. IndexedDB holds the durable copy; the server is used for sync, publishing, provider actions, and cross-device updates.

```text
Launch -> load last valid IndexedDB release -> resolve gestures locally
       -> network available? fetch delta -> validate -> atomic local replace
       -> WebSocket delta arrives? validate version -> atomically apply
       -> offline mutation? add to outbox -> sync when connected
```

If a release is invalid or incomplete, retain the previous known-good version. Do not make an accessibility interface unusable because a network request failed.

## 7. Delivery roadmap

### Phase A — Make localhost trustworthy (1–2 iterations)

- Add `.env.example`, `data/` path configuration, `.gitignore` rules for `*.db`, backups, and local environment files.
- Replace destructive seeds with migrations plus `INSERT OR IGNORE`; give seed data an explicit version.
- Add `GET /healthz`, API schemas, request size limits, error middleware, and unit tests for rule resolution/import.
- Replace dynamic text `innerHTML` rendering with safe DOM nodes/text content.
- Add IndexedDB rules/profile cache and an offline-start test.
- Clearly mark phone, SMS, SOS, OCR, and navigation as simulated until delivery is actually confirmed.

**Exit gate:** localhost starts with one documented command, `npm run build` passes, core API tests pass, an offline reload resolves a cached rule, and no tracked runtime DB changes.

### Phase B — Make configuration genuinely authoritative

- Introduce a typed action registry and execute published rules in both simulator and real mobile views.
- Separate draft configuration from published profile releases.
- Add rule validation, deletion safety checks, import preview/dry run, export signatures/checksums, and audit events.
- Build the parity suite: every published rule must resolve and execute a testable action contract.

**Exit gate:** simulator/mobile action behavior is derived from the same release, with an automated parity report.

### Phase C — Secure online beta

- Move to PostgreSQL with schema migrations and automated backups.
- Implement admin login, roles (`admin`, `editor`, `viewer`, `device`), device registration, HTTP-only session/refresh flow, and authenticated WebSockets.
- Containerize API and reverse proxy; deploy to a staging domain with TLS, logs, metrics, backups, and a rollback path.
- Integrate one provider at a time: begin with maps/geocoding or SMS in sandbox mode; use mocks in local development.

**Exit gate:** security review passes, unauthorized mutation attempts fail, audited changes are traceable, and a device can sync one profile securely.

### Phase D — Capacitor Android beta

- Add Capacitor to the built Vite application; set `webDir: dist`.
- Implement adapters for Haptics, Camera, Geolocation, Network, Secure Storage, local notifications, and share/send intents as necessary.
- Request permissions just in time with accessible explanations and a usable denial path.
- Test TalkBack, Android accessibility shortcuts, vibration behavior, camera, offline restart, and real device battery/network transitions.

**Exit gate:** signed internal APK, physical-device test matrix, no false claims of emergency delivery, and defined incident/support process.

### Phase E — Production readiness

- Add CI: install, lint, unit/API/integration tests, accessibility checks, production build, dependency audit, migration validation, container scan.
- Add monitoring: uptime, error reporting, database backup verification, WebSocket connection health, provider failure alerts.
- Complete privacy policy, consent text, data retention, recovery process, accessibility research validation, and emergency-use disclaimers.

## 8. Recommended product features, in order

1. **Reliable offline accessibility profile:** local command release, user-selectable voice/haptic modes, and a safe fallback profile.
2. **Emergency confidence layer:** configurable contacts, test-SOS mode, delivery status, cancellation window, location freshness, and clear failure announcements.
3. **Profile/preset system:** blind, deaf-blind, low-vision, motor-impaired, and caregiver-managed presets; publish/rollback rather than editing live state.
4. **Caregiver/admin console:** profile assignment, remote configuration approval, audit log, device health—not unrestricted access to private message data.
5. **Safe vision assistance:** on-device OCR first; opt-in cloud scene description with a privacy notice and redaction/retention controls.
6. **Navigation assistance:** saved places, consented location, route replay, “where am I?” and offline-safe orientation—not a claim of guaranteed emergency navigation.
7. **Accessibility telemetry (opt-in):** anonymous failure/latency events to improve gestures, never raw speech, camera frames, or contact/message contents by default.

Web Speech should remain an adapter with alternatives and clear unsupported-state UX; it is a browser API with separate synthesis and recognition capabilities and browser-dependent behavior. [MDN Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)

## 9. Verification matrix

| Area | Automated check | Human/device check |
|---|---|---|
| Rule engine | Unit tests: direct/default lookup, action schema, import transaction, rollback | Change a rule and verify the exact haptic/TTS/action |
| Offline | IndexedDB recovery and stale-release tests | Airplane-mode cold launch on Android |
| Security | Auth/RBAC, CORS, validation, rate-limit, CSP tests | Attempt unauthenticated/other-user admin actions |
| SOS | State-machine and provider-mock tests | Test mode only; confirm all spoken status is truthful |
| Accessibility | axe/semantic checks, keyboard flow tests | TalkBack and VoiceOver sessions with target users |
| Deployment | build, migration, health, backup-restore test | Staging release and rollback rehearsal |

## 10. Explicit non-goals for the next implementation step

- No Flutter rewrite before the Capacitor device trial establishes a specific limitation.
- No microservices, Kafka, Redis, or graph database until observed scale requires them.
- No production SMS, emergency-service integration, or cloud vision key in the browser.
- No live web-bundle updater before native release/rollback policy and store requirements are agreed.

## 11. Immediate backlog

1. Stop tracking the SQLite runtime database; create migrations and safe seeds.
2. Add schemas and safe rendering; remove unrestricted CORS and public mutations before any external exposure.
3. Add IndexedDB persistence and an action dispatcher so configuration actually controls behavior.
4. Add tests, linting, CI, and update Vite after validating its major-version migration.
5. Add a local provider-mock layer and label simulated functionality in the UI.
6. Only then build the authenticated PostgreSQL-backed online beta and Capacitor Android package.
