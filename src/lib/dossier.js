/**
 * Kagaz — dossier tailoring (cloud leg, Gemini Flash via Firebase AI Logic).
 *
 * The cloud leg NEVER receives original text. Its only inputs are the
 * redacted document text and the redacted extraction JSON. The pipeline
 * enforces that with a leak guard before any cloud call (see pipeline.js).
 */

export const DOSSIER_PURPOSES = {
  'job-application': 'a job application',
  'visa-travel': 'a visa / travel application',
  'loan-finance': 'a loan / finance application',
  general: 'general review',
};

export const DOSSIER_TONES = {
  formal: 'formal and precise',
  concise: 'concise and direct',
  detailed: 'thorough and detailed',
};

/**
 * Build the tailoring prompt from REDACTED inputs only.
 * Throws if the inputs still contain PII (defence in depth — the pipeline
 * already guarantees this, but the prompt builder refuses to be the leak).
 */
export function buildDossierPrompt({ redactedText, extraction, purpose, tone }) {
  if (!redactedText || typeof redactedText !== 'string') {
    throw new Error('Dossier prompt needs redacted document text.');
  }
  const purposeLabel = DOSSIER_PURPOSES[purpose] ?? DOSSIER_PURPOSES.general;
  const toneLabel = DOSSIER_TONES[tone] ?? DOSSIER_TONES.formal;
  return [
    'You are Kagaz, a document copilot. You are given a REDACTED document',
    '(all personal data replaced with placeholders like [EMAIL_1]) and a',
    'structured extraction of that same redacted document.',
    '',
    'Task: tailor a dossier for ' + purposeLabel + ', in a ' + toneLabel + ' tone.',
    'Rules:',
    '- Work ONLY with the redacted text and extraction below.',
    '- NEVER invent, guess, or restore personal data (names, emails, phones,',
    '  IDs, addresses). If a field is redacted, say so or leave it blank.',
    '- NEVER output a placeholder as if it were a real value.',
    '- Return JSON only, matching the schema: { "title": string,',
    '  "purposeSummary": string, "sections": [{ "heading": string,',
    '  "body": string }], "checklist": [string] }.',
    '',
    'REDACTED DOCUMENT:',
    redactedText,
    '',
    'EXTRACTION:',
    JSON.stringify(extraction),
  ].join('\n');
}

/** Validate a dossier object returned by the model. Returns error or null. */
export function validateDossier(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return 'Dossier must be a JSON object.';
  }
  if (typeof obj.title !== 'string' || obj.title.trim() === '') {
    return 'Dossier needs a non-empty "title" string.';
  }
  if (typeof obj.purposeSummary !== 'string' || obj.purposeSummary.trim() === '') {
    return 'Dossier needs a non-empty "purposeSummary" string.';
  }
  if (!Array.isArray(obj.sections) || obj.sections.length === 0) {
    return 'Dossier needs a non-empty "sections" array.';
  }
  for (const s of obj.sections) {
    if (!s || typeof s.heading !== 'string' || typeof s.body !== 'string') {
      return 'Every dossier section needs string "heading" and "body".';
    }
  }
  if (!Array.isArray(obj.checklist)) {
    return 'Dossier needs a "checklist" array.';
  }
  for (const item of obj.checklist) {
    if (typeof item !== 'string') return 'Every checklist item must be a string.';
  }
  return null;
}

/** Parse + validate raw model text into a dossier. Throws on any problem. */
export function parseDossier(rawText) {
  let obj;
  try {
    obj = JSON.parse(rawText);
  } catch {
    throw new Error('Dossier response was not valid JSON.');
  }
  const err = validateDossier(obj);
  if (err) throw new Error('Invalid dossier: ' + err);
  return obj;
}
