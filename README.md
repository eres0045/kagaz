# Kagaz — offline-first document copilot

**Team FORTEC · #BuildHybridAI 2026** (Google Firebase hackathon, Devpost)

Kagaz turns a document into a tailored dossier — but the personal data in
it never leaves the user's device. PII is redacted deterministically
on-device first; Gemini Nano (on-device, via Firebase AI Logic hybrid
inference) extracts structured facts from the *redacted* text; Gemini
Flash (cloud) tailors the dossier from the redacted text + extraction.
Every AI result carries an engine chip — **On-device · Gemini Nano**,
**Cloud · Gemini Flash**, or **Demo · local stub** — so it is always
visible where the work ran.

## The privacy story (the whole point)

1. **Redact first, locally.** Email, phone, Aadhaar (Verhoeff-checked),
   PAN (entity-letter-checked), passport, DOB, labelled names, UPI IDs,
   URLs, IPs, Luhn-valid cards — replaced with placeholders like
   `[EMAIL_1]`. The placeholder map stays in memory on the device only.
2. **Extract on-device.** Gemini Nano reads the redacted text only, with a
   strict JSON schema. Its output is re-scanned for PII before use.
3. **Tailor in the cloud.** Gemini Flash receives redacted text +
   redacted extraction only. A leak guard re-scans every cloud-bound
   string and aborts the pipeline if personal data is found.
4. **Wi-Fi-off demo.** With Nano downloaded, extraction works with the
   network off; tailoring honestly reports that it needs network.

## Status — Day 1 (2026-11-10)

- ✅ Vite + React + Tailwind app, full pipeline working end-to-end.
- ✅ Deterministic redaction engine + leak guard (see `src/lib/redact.js`).
- ✅ Nano extraction code (Firebase AI Logic, `PREFER_ON_DEVICE`, JSON
  schema, `inferenceSource` chip) and cloud Flash tailoring code.
- ✅ **50/50 tests pass** (`npm test`); production build clean
  (`npm run build`); real-Chromium smoke test green
  (`scripts/smoke-browser.py`).
- ✅ Devpost page re-checked 2026-11-10 19:10 IST: **still pre-launch**.
  Full rules, prize split, and bonus challenges land **Nov 11**.
  Submissions: **Nov 11 → Nov 30, 2026, 2:00 PM PT**.
  Prize text still conflicted ($30,000 under a literal "This is a test."
  heading vs $10,000 on aggregators) — **neither figure is quoted as
  fact here**. Re-check the live page on Nov 11 before locking scope.
- ⏳ **One human gate:** the Firebase project + AI Logic setup needs a
  console sign-in (see `FIREBASE_SETUP.md`). Until then the app runs in
  **demo mode** — deterministic local stubs, clearly labelled, no model
  called, no data leaves the page.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # vitest, 50 tests
npm run build      # production build
```

To go live: copy `.env.example` to `.env`, follow `FIREBASE_SETUP.md`,
fill in the Firebase web-app config, restart.

## Honest limits

- **Nano is unverified on the dev VM** (Playwright Chromium is an echo
  stub; official Chrome 157 reports "service is not running" — see the
  spike notes). The on-device leg MUST be verified on a real laptop
  Chrome before the demo video is recorded. See `DAY1_NOTES.md` for the
  laptop checklist.
- **Free-text person names are not redacted** unless labelled
  ("Name:", "Candidate:", "Applicant:"). Guessing names in prose would
  both miss real names and redact innocent words. The UI says so.
- **Demo mode is not a model.** Its extraction is rule-based sentence /
  heading splitting; its dossier is a template. It exists so the pipeline
  can be tested end-to-end before Firebase is connected.
- The cloud model is Gemini Flash via the Gemini Developer API (free tier,
  no card — see `FIREBASE_SETUP.md`).

## Layout

```
src/
  App.jsx                 — the whole UI (upload/paste, redaction view,
                            extraction view, dossier, offline panel)
  lib/
    redact.js             — deterministic PII redaction (Verhoeff/Luhn)
    extract.js            — Nano extraction prompt, schema, validation
    dossier.js            — Flash dossier prompt + validation
    nano.js               — Prompt API availability probe + engine choice
    firebase.js           — Firebase init, hybrid + cloud models
    providers.js          — FirebaseAIProvider + MockProvider
    pipeline.js           — upload → redact → extract → tailor + leak guard
    sampleDocs.js         — 2 synthetic sample docs (all PII fake)
tests/                    — vitest suite (50 tests)
scripts/smoke-browser.py  — real-Chromium end-to-end smoke test
```

## Rules & judging (from the live Devpost page, 2026-11-10)

- Judging criteria: Technological Implementation (how effectively Firebase
  AI Logic hybrid inference is used), Design, Potential Impact, Quality
  of the Idea.
- Solo or team. Do **not** clone the official "Friendly Meals" sample app.
