# Revised Design Document: ScamShield AI Android Mobile Application & Notification Shield

## 1. Executive Summary & Design Audit
ScamShield AI is a sophisticated cybersecurity web application built with Next.js 16, React 19, TypeScript, and Tailwind CSS. Its visual identity is defined by an **obsidian dark atmospheric glassmorphism** aesthetic, **purple and blue gradient accents**, rounded frosted cards (`bg-slate-900/80 backdrop-blur-xl border border-slate-800/80`), pill-shaped interactive controls, smooth animated risk meters, and clean, high-contrast typography.

This design document outlines the architecture to transform ScamShield AI into a standalone Android mobile application using **Capacitor 7** and native Kotlin **`NotificationListenerService`**, while preserving 100% of the existing web application codebase and backend `/api/analyze` intelligence engine.

---

## 2. Visual Identity & Mobile Layout Mapping
To ensure the mobile app feels like a native extension of ScamShield AI rather than a generic admin panel, we maintain the exact design tokens:
- **Background**: Deep obsidian (`#090a0f` / `bg-slate-950`).
- **Gradients**: Purple (`from-purple-600 to-indigo-600`) and blue (`from-cyan-500 to-blue-600`) glowing accents.
- **Cards**: Glassmorphic frosted panels with subtle borders (`border-slate-800/80 shadow-2xl shadow-purple-950/20`).
- **Navigation**: Bottom navigation bar featuring 5 distinct native-feeling tabs with Lucide icons and active state glows:
  1. **Home**: Overall protection status, recent scam detections, quick scan launcher, monitoring health indicator.
  2. **Scanner**: Full desktop scanner functionality adapted for vertical stacking (scenario presets, categories, English/Hindi selector, message composer, screenshot upload, and live analysis cards).
  3. **Notification Shield**: Dedicated real-time monitoring dashboard with permission toggle, inspected counts, recent alert stream, and app allowlists.
  4. **History**: Persistent local log of manual scans and intercepted notification alerts with timestamps and risk scores.
  5. **Settings**: Language preferences, privacy controls, data retention limits, clear history, and app info.

---

## 3. Capacitor Deployment & Architecture
### 3.1 Next.js Hosting & Export Strategy
- **Client/Server Model**: Next.js uses server-side API routes (`/api/analyze`) and dynamic features. For Android deployment via Capacitor:
  - **Option A (Hosted Backend / Hybrid Mode)**: The Capacitor web view loads the production or development URL of the ScamShield AI backend (e.g. `https://scamshield-ai.netlify.app` or local server IP during development). This ensures all API keys (Gemini API key) remain securely on the server and never exposed in the APK.
  - **Option B (Static Export with Remote API)**: Static HTML/JS export bundled into the APK assets pointing to the remote `/api/analyze` endpoint.
- **Recommendation**: Hybrid Capacitor configuration where the web view points to the deployed backend server URL, guaranteeing full server-side rate limiting, caching, and Gemini API key security.

---

## 4. Native Notification Processing Architecture
### 4.1 Kotlin `NotificationListenerService`
A native Kotlin service (`ScamShieldNotificationService.kt`) runs in the Android background to inspect notifications:
1. **Interception**: Captures incoming `StatusBarNotification` objects.
2. **Package Filtering**: Filters notifications against user-selected applications (WhatsApp, Telegram, SMS apps).
3. **Sensitive Data & OTP Filtering**:
   - Regex check to filter out and redact potential OTPs, passwords, PINs, and banking credentials before any analysis.
4. **Deduplication**: Uses content hashing + a 30-second sliding time window (`HashMap` cache) to prevent duplicate analysis of rapid consecutive updates or notification grouping updates.
5. **Background Execution**: Managed via Android WorkManager or foreground service notification channel to ensure reliable background health.
6. **Backend Communication**: Submits sanitized notification content securely over HTTPS to `/api/analyze`.
7. **Local Warning Trigger**: If the returned risk score ≥ 70, triggers a high-priority Android local notification (`NotificationCompat.Builder`) alerting the user with risk breakdown and a deep link to open ScamShield AI.

---

## 5. Privacy & Threat Model
- **Explicit Consent**: Notification monitoring is disabled by default. The user must manually navigate to Android Notification Access settings via an in-app setup wizard.
- **Immediate Toggle**: A prominent kill-switch pause toggle allows users to halt notification inspection instantly.
- **Data Minimization**: Raw notification bodies are never permanently stored on device disk beyond recent ephemeral history, and sensitive secrets (OTPs/PINs) are redacted at the native layer.
- **No Client Secrets**: Gemini API keys reside exclusively on the Next.js server environment variables (`GEMINI_API_KEY`), never inside the APK.

---

## 6. Android Permissions & Flow
- `android.permission.BIND_NOTIFICATION_LISTENER_SERVICE`
- `android.permission.POST_NOTIFICATIONS` (Android 13+)
- `android.permission.INTERNET`
- `android.permission.ACCESS_NETWORK_STATE`

---

## 7. Testing Strategy
- **Unit & Integration Tests**: Existing Vitest unit tests and Playwright e2e tests for frontend and API routes.
- **Android Emulator / Device Testing**: Verify notification listener registration, permission grant prompt, background interception, and local warning push notifications.

---

## 8. APK Build & Distribution Strategy
- Capacitor Android build pipeline (`npx cap add android`, `npx cap sync android`, `cd android && ./gradlew assembleDebug`).
- Outputs a signed debug/release APK ready for sideloading and testing.
