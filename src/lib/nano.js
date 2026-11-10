/**
 * Kagaz — on-device (Gemini Nano / Prompt API) availability probing.
 *
 * The Prompt API is exposed as `window.LanguageModel` in Chrome Desktop
 * v139+ (secure contexts only). This module never assumes it exists:
 * every function degrades to an explicit status string, and the pipeline
 * uses that status to choose on-device, cloud, or an honest error.
 *
 * Statuses:
 *   'available'    — Nano is downloaded and ready.
 *   'downloading'  — Nano is downloading; progress callback reports 0..1.
 *   'downloadable' — Nano can be downloaded on demand.
 *   'unavailable'  — API present but the model service is not running
 *                      (this is what official Chrome 157 reports on this
 *                      dev VM — the service cannot start here).
 *   'unsupported'  — no LanguageModel API (non-Chrome browser, or Node).
 */

/** Probe the Prompt API. Safe to call in Node (returns 'unsupported'). */
export async function probeNano() {
  if (typeof window === 'undefined' || typeof window.LanguageModel === 'undefined') {
    return { status: 'unsupported', detail: 'LanguageModel API not present in this browser.' };
  }
  try {
    const availability = await window.LanguageModel.availability({
      expectedInputs: [{ type: 'text' }],
    });
    if (availability === 'available') {
      return { status: 'available', detail: 'Gemini Nano is downloaded and ready.' };
    }
    if (availability === 'downloading') {
      return { status: 'downloading', detail: 'Gemini Nano is downloading.' };
    }
    if (availability === 'downloadable') {
      return { status: 'downloadable', detail: 'Gemini Nano can be downloaded on demand.' };
    }
    return {
      status: 'unavailable',
      detail: `Prompt API reports "${availability}". The on-device model service is not running.`,
    };
  } catch (err) {
    return { status: 'unavailable', detail: `Availability check failed: ${err.message}` };
  }
}

/**
 * Start (or await) the Nano download. Resolves when the model is ready.
 * `onProgress` receives 0..1. Throws if the API is absent or the service
 * cannot start — callers must surface that honestly, not silently fall back
 * when the user explicitly asked for on-device-only.
 */
export async function ensureNanoDownload(onProgress) {
  if (typeof window === 'undefined' || typeof window.LanguageModel === 'undefined') {
    throw new Error('LanguageModel API not present in this browser.');
  }
  const session = await window.LanguageModel.create({
    monitor: (m) => {
      if (onProgress && typeof m.loaded === 'number') onProgress(m.loaded);
    },
  });
  // Keep the session warm for the caller; destroy is the caller's job.
  return session;
}

/**
 * Decide which engine should run extraction, given Nano status and
 * connectivity. Pure function — unit-tested.
 *
 *   mode 'prefer-on-device' (default): Nano when available, else cloud when
 *     online, else an explicit error.
 *   mode 'on-device-only': Nano or an explicit error (never silent cloud).
 *   mode 'cloud-only': cloud when online, else an explicit error.
 */
export function chooseExtractionEngine({ nanoStatus, online, mode = 'prefer-on-device' }) {
  if (mode === 'on-device-only') {
    if (nanoStatus === 'available') return { engine: 'on-device' };
    return {
      engine: 'error',
      reason:
        nanoStatus === 'unsupported'
          ? 'On-device extraction needs Chrome Desktop 139+ with the Prompt API flag enabled.'
          : 'Gemini Nano is not ready on this machine (status: ' + nanoStatus + '). Enable chrome://flags/#prompt-api-for-gemini-nano-multimodal-input and pre-download the model first.',
    };
  }
  if (mode === 'cloud-only') {
    if (online) return { engine: 'cloud' };
    return { engine: 'error', reason: 'Cloud extraction needs network access, and this device is offline.' };
  }
  // prefer-on-device
  if (nanoStatus === 'available') return { engine: 'on-device' };
  if (online) {
    return {
      engine: 'cloud',
      reason:
        nanoStatus === 'unsupported'
          ? 'Nano unavailable in this browser — falling back to cloud.'
          : 'Nano not ready (status: ' + nanoStatus + ') — falling back to cloud.',
    };
  }
  return {
    engine: 'error',
    reason:
      'Offline and Gemini Nano is not ready (status: ' +
      nanoStatus +
      '). Turn Wi-Fi on once to download the model, or go online for cloud extraction.',
  };
}
