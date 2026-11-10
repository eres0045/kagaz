# Firebase setup for Kagaz (the one human gate)

The app is fully coded, but the live cloud leg needs a Firebase project
with AI Logic enabled. That requires a Google sign-in in the Firebase
console — it cannot be done from the dev VM. Estimated time: ~15 minutes.

**Sign in with the 007 Google account** (`ronitshrimankar007@gmail.com`)
throughout, so the project belongs to the same account as everything else.

## Steps

1. **Firebase console** — https://console.firebase.google.com → *Add project*
   → name it `kagaz` → **decline Google Analytics** (not needed for AI Logic)
   → Create project.
2. **Enable AI Logic** — in the project, go to **AI Services → AI Logic**
   → *Get started* → choose **Gemini Developer API** (no cost to start).
   Do **NOT** pick Vertex AI / Agent Platform — that needs billing.
   Let the guided workflow enable the required APIs. App Check is
   auto-enforced by this workflow.
3. **Register the Web app** — Project settings → *Your apps* → Web app
   (`</>`) → nickname `kagaz-web` → copy the `firebaseConfig` object.
4. **API key** — the config's `apiKey` is the Gemini Developer API key.
   (If the console asks, the key can also be created at
   https://aistudio.google.com/api-keys. Free Tier needs **no billing
   account**; paid tiers need a billing account + $5 prepay. Some projects
   need verification for Free Tier — if it asks, that is a console step.)
5. **Local config** — in the project dir, copy `.env.example` to `.env`
   and paste the config values:
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
   `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`,
   `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
   Leave `VITE_GEMINI_CLOUD_MODEL=gemini-2.5-flash` unless the console
   shows a different model name. **Never commit `.env`** (it is
   git-ignored; `.env.example` is the template).
6. **App Check debug token (localhost only)** — in the app, before the
   first cloud call, the debug provider is enabled automatically in dev:
   `self.FIREBASE_APPCHECK_DEBUG_TOKEN = true` is set before
   `initializeAppCheck`. The debug token prints in the DevTools console —
   copy it and register it at **Security → App Check → Apps → Manage
   debug tokens**. Without this, cloud calls from localhost fail under
   App Check enforcement.
7. **Verify** — `npm run dev`, open the app, confirm the header chip says
   **Live · Firebase AI Logic** (not Demo mode). Paste the offer-letter
   sample, run it, and confirm the extraction chip reads
   **On-device · Gemini Nano** or **Cloud · Gemini Flash** (not Demo).

## If the cloud call fails

- "App Check" error → the debug token is not registered (step 6).
- "API key not valid" → the key in `.env` does not match the project.
- "Model not found" → the cloud model name differs; check the console
  and update `VITE_GEMINI_CLOUD_MODEL`.
- Quota/rate-limit → the Gemini free tier has per-minute limits; wait
  and retry. Do not add a billing account without asking Ronit first.
