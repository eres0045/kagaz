# Kagaz — Day 1 progress notes (2026-11-10, evening IST)

## Done today

1. **Devpost re-check** (19:10 IST): page still pre-launch. Full rules +
   bonus challenges land Nov 11. Submissions Nov 11 → Nov 30, 2:00 PM PT.
   Prize conflict ($30k under "This is a test." vs $10k aggregators) still
   unresolved — quoted as neither. Re-check Nov 11 before locking scope.
2. **Scaffold**: Vite + React 19 + Tailwind v4, firebase 13.2.0 (spike-
   verified version). SDK surface re-verified from the installed package:
   `InferenceMode` (prefer/only on-device/in-cloud), `InferenceSource`
   (`on_device`/`in_cloud` on `response.inferenceSource`), `Schema`
   helpers, `GenerativeModel.initializeDeviceModel()`,
   `generationConfig.responseSchema`.
3. **Redaction engine** (`src/lib/redact.js`): email, URL, IPv4, UPI,
   Aadhaar (Verhoeff), card (Luhn), PAN (entity letter), Indian + intl
   phones, labelled passport/DOB/name. Priority-ordered, overlap-safe,
   per-type placeholders. Free-text names deliberately NOT detected.
4. **Nano extraction** (`src/lib/extract.js` + `nano.js`): structured
   JSON schema, prompt rules, response validation, PII re-scan of model
   output, availability probe, engine-choice logic
   (prefer/on-device-only/cloud-only).
5. **Cloud tailoring** (`src/lib/dossier.js`): redacted-only prompt,
   dossier validation. Firebase wiring (`firebase.js`, `providers.js`):
   hybrid model `PREFER_ON_DEVICE` + cloud-only Flash model.
6. **Pipeline** (`src/lib/pipeline.js`): redact → engine choice →
   extract → leak guard → tailor → leak guard. Aborts if any PII reaches
   a cloud-bound string.
7. **UI** (`src/App.jsx`): paste/upload, sample docs, purpose/tone/
   engine selectors, redaction view with Original/Redacted toggle,
   extraction + dossier views with engine chips, online/offline + Nano
   status chips, demo-mode banner, Wi-Fi-off demo instructions.
8. **Tests: 50/50 pass** (`npm test`): 22 redaction, 9 extraction, 7
   dossier, 7 nano, 6 pipeline (incl. leak-guard abort test), 3 App
   (jsdom mount + full demo-mode run). Production build clean.
9. **Real-browser smoke test** (`scripts/smoke-browser.py`, Playwright
   Chromium): app mounts, demo banner, sample doc → 9 items redacted,
   demo chips, secret absent from redacted view, restore toggle works,
   on-device-only fails honestly ("Extraction unavailable"). 0 page errors.

## NOT done / not claimed

- **Nano NOT verified on this VM** — by design (spike §2: Chromium is an
  echo stub; official Chrome 157 "service is not running"). The code
  follows the documented API contract exactly; the real run must happen
  on Ronit's laptop Chrome. See the checklist below.
- **Firebase project NOT created** — needs a console sign-in (007).
  `FIREBASE_SETUP.md` has the exact steps (~15 min). Until then the app
  runs in demo mode (labelled, no model calls).
- **Devpost registration NOT done** — registration is open now; Ronit (or
  the main agent's browser) should register at
  https://firebasehybridaihackathon.devpost.com/ before submitting.
- **Nothing submitted.** Pre-submit checkpoint comes later, per the rules.

## Bugs found & fixed during Day 1 (for the record)

- Phone regex initially redacted only the 10 digits, leaving "+91"/"0"
  visible, and ate the space before a bare number. Fixed by moving the
  separator inside the prefix group.
- NAME detector was case-sensitive and missed "Name:". Fixed with the
  `i` flag.
- Sample PAN `ABCDE1234F` failed the entity-letter check (4th char `D`
  is not a PAN holder type). Replaced with a valid `BQXPK1234A`.
- A leak-guard test initially echoed text that contained no PII; the
  guard correctly did not fire. Test now echoes a real email.

## Laptop verification checklist (Ronit — critical path, Days 1–3)

Do this on your **own laptop Chrome** (Desktop, v139+). The demo video
depends on it.

1. Open Chrome → `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`
   → set to **Enabled** → restart Chrome.
2. Open the Kagaz app (dev server or deployed link) **while online**.
   The header should show Nano: `downloadable` (first run) or `available`.
3. Press **"Test on-device extraction"** once while online — the first
   run downloads Gemini Nano in the background (needs network + disk
   space; watch the progress, then wait for it to finish).
4. Confirm the extraction chip reads **"On-device · Gemini Nano"**.
   If it reads "Cloud · Gemini Flash", Nano is not ready yet — wait for
   the download, then retry.
5. **Turn Wi-Fi off** and press "Test on-device extraction" again:
   extraction must still work on-device. Dossier tailoring should report
   honestly that it needs network.
6. Check `chrome://on-device-internals` — the model should show as
   downloaded/available.
7. Tell Muse the result: Nano status shown, whether the on-device chip
   appeared, and whether the Wi-Fi-off run worked. If Nano never becomes
   available on the laptop either, the entry leans on the cloud leg +
   `PREFER_ON_DEVICE` fallback, and the demo must be shot accordingly —
   do not fake the offline claim.

## Next (Day 2+)

- Re-check Devpost Nov 11 for full rules + bonus challenges; adjust scope.
- Firebase project + `.env` (human gate) → live-mode end-to-end test.
- Laptop Nano verification (checklist above).
- Deploy the demo (Firebase Hosting or Vercel — static Vite build; no
  backend needed, all calls are client-side to Firebase AI Logic).
- Demo video (90s): Wi-Fi-off extraction on the laptop, redaction view,
  engine chips, dossier. Record only after Nano is verified.
- Pre-submit checkpoint → submit by Nov 30, 2:00 PM PT.
