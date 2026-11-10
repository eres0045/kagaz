/**
 * Kagaz — Firebase initialisation (lazy, config-driven).
 *
 * No config is hard-coded. The app reads VITE_FIREBASE_* from the
 * environment (see .env.example). When the config is absent the app runs in
 * demo mode with the MockProvider (providers.js) and says so in the UI.
 * Creating the Firebase project and enabling AI Logic is a console step —
 * see FIREBASE_SETUP.md. That step needs a Google sign-in and is the one
 * human gate for the live cloud leg.
 */

import { initializeApp, getApps } from 'firebase/app';
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode } from 'firebase/ai';

export function hasFirebaseConfig() {
  return Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID,
  );
}

export function getFirebaseConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
}

let app = null;
let ai = null;

function ensureAI() {
  if (!hasFirebaseConfig()) {
    throw new Error('Firebase is not configured. Copy .env.example to .env and fill in the Firebase web-app config (see FIREBASE_SETUP.md).');
  }
  if (!app) {
    app = getApps().length ? getApps()[0] : initializeApp(getFirebaseConfig());
  }
  if (!ai) {
    ai = getAI(app, { backend: new GoogleAIBackend() });
  }
  return ai;
}

export function getCloudModelName() {
  return import.meta.env.VITE_GEMINI_CLOUD_MODEL || 'gemini-2.5-flash';
}

/**
 * Hybrid model for extraction: prefers Gemini Nano on-device, falls back to
 * the cloud model when Nano is unavailable. Call initializeDeviceModel()
 * after a user interaction and before the first prompt so the model
 * download can start (see Firebase AI Logic hybrid docs).
 */
export function getHybridModel() {
  const aiService = ensureAI();
  return getGenerativeModel(aiService, {
    model: getCloudModelName(),
    mode: InferenceMode.PREFER_ON_DEVICE,
  });
}

/** Cloud-only model for dossier tailoring (Gemini Flash). */
export function getCloudModel() {
  const aiService = ensureAI();
  return getGenerativeModel(aiService, {
    model: getCloudModelName(),
    mode: InferenceMode.ONLY_IN_CLOUD,
  });
}

export { InferenceMode };
