# Kagaz — 90-second demo video script (draft, Day 2)

**Status: SCRIPT ONLY — do not record yet.** Recording needs two human
gates first: (1) Nano verified on Ronit's laptop (checklist in
DAY1_NOTES.md), (2) Firebase project + `.env` so the app runs in live
mode. Record on Ronit's laptop Chrome (v139+), 1080p screen capture,
English narration, no background music.

**Target:** ≤90 seconds (Devpost allows up to 3 minutes; 90s keeps it
tight). ~220 words of narration at ~150 wpm. Every on-screen claim must
be true in the take — no faked offline state, no staged chips.

## Scene 1 — Hook (0:00–0:08)

**On screen:** Kagaz open at the live demo URL, header chip reads
`Live · Firebase AI Logic`. Cursor pastes the sample job offer letter
into the input box.
**Narration:** "Your documents carry your identity — name, email,
Aadhaar, bank details. Kagaz reads them without ever sending them."

## Scene 2 — Redaction (0:08–0:25)

**On screen:** Click `Redact & analyse`. The counter ticks to
`9 items redacted`. Toggle `Show original` → `Show redacted`: the
email becomes `[EMAIL_1]`, Aadhaar, PAN and phone become placeholders.
The real values never appear in the redacted view.
**Narration:** "First, deterministic redaction strips every piece of
personal data — email, Aadhaar, PAN, phone — before anything else
happens. What leaves the device is already clean."

## Scene 3 — On-device extraction (0:25–0:48)

**On screen:** Extraction view. Engine chip reads
`On-device · Gemini Nano`. Structured fields appear: role, company,
salary, start date. Then the OS Wi-Fi icon is visibly switched OFF;
press `Test on-device extraction` again — extraction still runs, chip
still reads `On-device · Gemini Nano`.
**Narration:** "Extraction runs on your device with Gemini Nano — no
network, no upload. Wi-Fi off, it still works, because the model lives
on the laptop."

## Scene 4 — Cloud dossier, honestly (0:48–1:08)

**On screen:** Wi-Fi back on. Dossier view builds: purpose summary,
checklist. Engine chip reads `Cloud · Gemini Flash`. A caption (or the
narration) states the guard: only the redacted text was sent to the
cloud; the leak guard aborts the call if any personal data slips
through.
**Narration:** "Only the redacted text ever reaches the cloud, where
Gemini Flash tailors the dossier. If any personal data slips through,
the leak guard kills the call before it leaves."

## Scene 5 — Why it matters + close (1:08–1:30)

**On screen:** Quick montage of the three engine chips
(`Demo · local stub` is NOT shown — this take is live mode):
`On-device · Gemini Nano`, `Cloud · Gemini Flash`, redaction view.
End card: live demo URL + GitHub repo URL.
**Narration:** "Private by construction, hybrid by design — on-device
when it can, cloud when it must, with Firebase AI Logic deciding.
Kagaz. Try the live demo — link below."

## Recording notes (read before shooting)

- If Nano is NOT verified on the laptop by shoot day, do NOT shoot
  Scene 3 as written. Shoot the honest fallback: the on-device test
  failing with `Extraction unavailable` and the app falling back to
  `Cloud · Gemini Flash` via `PREFER_ON_DEVICE` — and say so in the
  narration. Never fake the Wi-Fi-off claim.
- If Firebase is not configured yet, the header reads `Demo mode · no
  Firebase config` and the chip reads `Demo · local stub`. Do NOT
  record a demo-mode take and present it as live. Wait for the gate.
- Keep the OS Wi-Fi indicator visible in Scene 3; the offline claim
  must be visible, not just narrated.
- Show the real sample document (job offer letter) — no invented data.
- End card URLs: demo https://eres0045.github.io/kagaz/ ,
  repo https://github.com/eres0045/kagaz
