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

---

# Kagaz — Day 2 progress notes (2026-11-16, IST)

## 1. Devpost rules re-check (live, 2026-11-16 ~10:15 UTC)

Page https://firebasehybridaihackathon.devpost.com/ is now fully live
(no longer pre-launch). What changed vs the Nov 12 summary:

- **Prize conflict RESOLVED — $30,000 confirmed** on the official page:
  Grand $10,000 · 1st Runner Up $7,000 · 2nd Runner Up $4,000 ·
  Best iOS $3,000 · Best Android $3,000 · Best Web/Chrome $3,000.
  Winners also get a Firebase-team interview + featured blog post
  (Grand + 1st Runner Up) and social mentions.
- **Judging criteria (as published — supersedes the Nov 12 summary):**
  (1) Technological Implementation — how well the project uses Firebase
  AI Logic hybrid inference; (2) Design — a complete, coherent product
  experience, not just a proof of concept; (3) Potential Impact —
  credible, specific case for a real problem for a real audience;
  (4) Quality of the Idea — creative, non-obvious use of Firebase AI
  Logic. No separate "architectural rationale" criterion is listed.
- **Deliverables confirmed:** working app (hosted URL strongly
  encouraged) + public repo with an open-source license detectable at
  the top of the repo (MIT LICENSE now committed — see below) + demo
  video ≤3 min, public on YouTube + text description covering Firebase
  AI Logic use, features, value proposition. Repo must demonstrate
  Firebase AI Logic **at runtime** (imported and actually called, not
  just named in the README). Multiple platforms get "strong
  consideration" for Grand Prize; an outstanding single-platform app
  can still win. Firebase AI Logic requires App Check; debug tokens
  are accepted in submissions.
- **Deadline confirmed:** submissions close Mon Nov 30, 2:00 PM PT
  (event window ends Nov 30, 5:00 PM ET) = **Tue Dec 1, 03:30 IST**.
- **Quota Sprints:** Sprint 2 request by Wed Nov 18, 10:00 AM PT,
  account sent Thu Nov 19; Sprint 3 (final) request by Wed Nov 25,
  10:00 AM PT, account sent Fri Nov 27. Free tier already covers
  Kagaz's models — a quota account is only needed for billed
  image-generation models, which Kagaz does not use.
- **No "bonus challenges" section** appears on the live page; the Nov 11
  expectation of separate bonus challenges did not materialise. Nothing
  to adjust for.

## 2. Day 1 build re-verified — still green

- `npm test`: **50/50 pass** (6 files), ~3s. No breakage, no fixes
  needed, coverage not lowered.
- Correction to the Day 1 notes: the per-file breakdown there sums to
  54, not 50. Actual counts: redact 18 (not 22), extract 9, pipeline
  6, dossier 7, nano 7, App 3 = 50. Total 50/50 was and is correct;
  only the redaction count in the notes was wrong.
- `npm run build`: clean (35 modules, 504ms). Built with
  `--base=/kagaz/` for the GitHub Pages project-site path.

## 3. Live demo DEPLOYED — GitHub Pages

- URL: **https://eres0045.github.io/kagaz/**
- Method: `dist/` pushed to orphan `gh-pages` branch (`.nojekyll`
  included); Pages enabled from that branch, HTTPS enforced.
  Firebase Hosting was NOT used — it needs a Firebase project, which
  is a human gate (see below).
- **Live verification (real Chromium, Playwright, 2026-11-16):**
  `scripts/smoke-live.py` → **LIVE SMOKE OK, page errors: []**.
  Verified on the deployed URL: app mounts, demo banner visible,
  Nano status chip present, sample job offer letter → 9 items
  redacted, `Demo · local stub` engine chip, `[EMAIL_1]`
  placeholder shown, real email absent from redacted view, dossier
  section + checklist present, Original/Redacted toggle restores
  correctly, on-device-only test fails honestly with
  `Extraction unavailable`. The deployed demo runs in labelled demo
  mode (no Firebase config yet) — no live model calls are claimed.
- Repo: MIT LICENSE committed to master (commit a06f3cb) so the
  license is detectable at the top of the repo, as Devpost requires.
  Repo https://github.com/eres0045/kagaz remains public.

## 4. Demo video — script drafted, NOT recorded

- `VIDEO_SCRIPT.md`: 90-second script (5 scenes) — hook, redaction
  view, Wi-Fi-off on-device extraction, cloud dossier + leak guard,
  close with demo + repo links. Script only; recording waits for the
  Nano laptop verification + Firebase live mode (see gates). The
  script includes an honest fallback: if Nano is not verified by
  shoot day, film the `Extraction unavailable` + cloud-fallback path
  and narrate it as such — never fake the offline claim.

## Open human gates (Ronit — nothing else blocks Day 3)

1. **Firebase project + `.env` (~15 min, 007 Google sign-in):**
   follow `FIREBASE_SETUP.md` — create project `kagaz`, enable AI
   Logic with the Gemini Developer API (NOT Vertex/billing), register
   Web app `kagaz-web`, paste config into `.env`, register the App
   Check debug token, verify the header chip reads
   `Live · Firebase AI Logic`. Until then the app stays in labelled
   demo mode and the video cannot be shot as live.
2. **Laptop Nano verification** (checklist in the Day 1 section
   above): Chrome v139+ on his own laptop, enable the Prompt API
   flag, download Nano, confirm the `On-device · Gemini Nano` chip,
   Wi-Fi-off extraction run. The demo video depends on this.
3. **Devpost registration** (not done yet): register at
   https://firebasehybridaihackathon.devpost.com/ before submitting.
   Nothing submitted; pre-submit checkpoint comes later.

## Next (Day 3+)

- After gate 1: live-mode end-to-end test (extraction + dossier with
  real models), re-run `smoke-live.py` against the live-mode build.
- After gate 2: record the 90s demo video per `VIDEO_SCRIPT.md`,
  upload Unlisted/public to YouTube (007 channel).
- Pre-submit checkpoint → submit by Nov 30, 2:00 PM PT
  (Dec 1, 03:30 IST).
