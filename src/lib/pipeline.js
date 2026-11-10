/**
 * Kagaz — end-to-end pipeline: upload → redact → extract → tailor.
 *
 * The one invariant this module exists to enforce: NOTHING containing
 * personal data ever reaches a model. The flow is:
 *
 *   1. redact() the raw document (deterministic, local).
 *   2. chooseExtractionEngine() from Nano status + connectivity.
 *   3. extract() on REDACTED text only.
 *   4. leak-guard: re-scan the extraction input AND output for PII.
 *      If anything is found, abort — do not call the cloud leg.
 *   5. tailor() on REDACTED text + redacted extraction only.
 *   6. leak-guard the dossier the same way before returning it.
 *
 * The redaction map (placeholder -> original value) is returned to the
 * caller for local display only (Original/Redacted toggle). It is never
 * passed to a provider and never leaves the device.
 */

import { redact, findPII, containsPII } from './redact.js';
import { chooseExtractionEngine, probeNano } from './nano.js';

/**
 * Run the full pipeline.
 *
 * @param {Object} args
 * @param {string} args.text — raw document text (may contain PII).
 * @param {Object} args.provider — extract()/tailor() provider.
 * @param {string} [args.purpose] — dossier purpose key (see dossier.js).
 * @param {string} [args.tone] — dossier tone key.
 * @param {string} [args.extractionMode] — 'prefer-on-device' | 'on-device-only' | 'cloud-only'.
 * @param {Object} [args.nanoProbe] — pre-computed probeNano() result (tests / UI can inject).
 * @param {boolean} [args.online] — navigator.onLine (defaults to true in Node).
 * @param {Function} [args.onStep] — (step, detail) progress callback.
 */
export async function runPipeline({
  text,
  provider,
  purpose = 'general',
  tone = 'formal',
  extractionMode = 'prefer-on-device',
  nanoProbe = null,
  online = typeof navigator !== 'undefined' ? navigator.onLine : true,
  onStep = () => {},
}) {
  if (!text || typeof text !== 'string' || text.trim() === '') {
    throw new Error('No document text to process.');
  }
  if (!provider || typeof provider.extract !== 'function' || typeof provider.tailor !== 'function') {
    throw new Error('Pipeline needs a provider with extract() and tailor().');
  }

  // 1. Redact locally.
  onStep('redact', 'Redacting personal data on-device…');
  const { redactedText, findings, counts } = redact(text);

  // 2. Decide the extraction engine.
  onStep('engine', 'Checking on-device model availability…');
  const probe = nanoProbe ?? (await probeNano());
  const decision = chooseExtractionEngine({ nanoStatus: probe.status, online, mode: extractionMode });
  if (decision.engine === 'error') {
    throw new Error('Extraction unavailable: ' + decision.reason);
  }

  // 3. Extract from REDACTED text only.
  onStep('extract', `Extracting with ${decision.engine === 'on-device' ? 'Gemini Nano (on-device)' : decision.engine}…`);
  const extraction = await provider.extract(redactedText, {});

  // 4. Leak guard on extraction input + output.
  const leakedInExtraction = [
    ...findPII(redactedText),
    ...findPII(JSON.stringify(extraction.data)),
  ];
  if (leakedInExtraction.length > 0) {
    throw new Error(
      'Leak guard stopped the pipeline: personal data was found in the extraction input/output ' +
        `(${leakedInExtraction.map((f) => f.type).join(', ')}). Nothing was sent to the cloud.`,
    );
  }

  // 5. Tailor the dossier (cloud leg) from REDACTED inputs only.
  onStep('tailor', 'Tailoring the dossier…');
  const dossier = await provider.tailor(redactedText, extraction.data, { purpose, tone });

  // 6. Leak guard on the dossier.
  if (containsPII(JSON.stringify(dossier.data))) {
    throw new Error('Leak guard stopped the pipeline: the dossier contained personal data. It was discarded.');
  }

  onStep('done', 'Done.');
  return {
    redactedText,
    findings,
    counts,
    nanoStatus: probe.status,
    extractionEngine: extraction.engine,
    extractionInferenceSource: extraction.inferenceSource,
    extraction: extraction.data,
    dossierEngine: dossier.engine,
    dossier: dossier.data,
    // NOTE: `findings` carry original values. Callers must keep them
    // client-side only (display toggle) and never send them anywhere.
  };
}
