/**
 * Kagaz — structured extraction (on-device leg, Gemini Nano via Firebase
 * AI Logic hybrid model, PREFER_ON_DEVICE).
 *
 * The extraction prompt receives REDACTED text only. The model is asked for
 * strict JSON matching EXTRACTION_SCHEMA. Every response is validated for
 * shape AND re-scanned for PII — a model that hallucinates personal data
 * back into its output is caught here, before the result is shown or
 * forwarded anywhere.
 */

import { containsPII } from './redact.js';

/** Fields the on-device model must return. Keep it small: Nano is a small model. */
export const EXTRACTION_FIELDS = ['summary', 'keyPoints', 'dates', 'actionItems', 'topics'];

/**
 * Build the extraction prompt from REDACTED text only.
 * Throws on empty input — never send an empty prompt to the model.
 */
export function buildExtractionPrompt(redactedText) {
  if (!redactedText || typeof redactedText !== 'string' || redactedText.trim() === '') {
    throw new Error('Extraction needs non-empty redacted text.');
  }
  return [
    'You are Kagaz, an on-device document extractor. You are given a',
    'REDACTED document (personal data replaced with placeholders like',
    '[EMAIL_1]). Extract structured facts and return JSON only:',
    '{ "summary": string (one or two sentences),',
    '  "keyPoints": [string, ...] (up to 6),',
    '  "dates": [string, ...] (dates/deadlines mentioned, as written),',
    '  "actionItems": [string, ...] (things the reader must do),',
    '  "topics": [string, ...] (main topics, up to 5) }',
    '',
    'Rules:',
    '- Use ONLY the redacted text below. Do not invent facts.',
    '- NEVER output personal data. If a value is redacted, omit it or say',
    '  "redacted". Never guess a name, email, phone, or ID.',
    '- Keep each string short. Return JSON only, no markdown fences.',
    '',
    'REDACTED DOCUMENT:',
    redactedText,
  ].join('\n');
}

/**
 * Build the Firebase AI Logic structured-output schema for extraction.
 * Takes the SDK `Schema` helper (imported from 'firebase/ai') so this module
 * stays testable without the SDK: pass a compatible Schema object.
 */
export function buildExtractionSchema(Schema) {
  return Schema.object({
    properties: {
      summary: Schema.string(),
      keyPoints: Schema.array({ items: Schema.string() }),
      dates: Schema.array({ items: Schema.string() }),
      actionItems: Schema.array({ items: Schema.string() }),
      topics: Schema.array({ items: Schema.string() }),
    },
    required: ['summary', 'keyPoints', 'dates', 'actionItems', 'topics'],
  });
}

/** Validate a parsed extraction object. Returns an error string or null. */
export function validateExtraction(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return 'Extraction must be a JSON object.';
  }
  if (typeof obj.summary !== 'string' || obj.summary.trim() === '') {
    return 'Extraction needs a non-empty "summary" string.';
  }
  for (const field of ['keyPoints', 'dates', 'actionItems', 'topics']) {
    if (!Array.isArray(obj[field])) {
      return `Extraction needs "${field}" as an array.`;
    }
    for (const item of obj[field]) {
      if (typeof item !== 'string') return `Every "${field}" item must be a string.`;
    }
  }
  return null;
}

/**
 * Parse + validate raw model text into an extraction.
 * Also re-scans the parsed content for PII — if the model echoed personal
 * data back, the extraction is rejected, not shown. Throws on any problem.
 */
export function parseExtraction(rawText) {
  let obj;
  try {
    obj = JSON.parse(rawText);
  } catch {
    throw new Error('Extraction response was not valid JSON.');
  }
  const err = validateExtraction(obj);
  if (err) throw new Error('Invalid extraction: ' + err);
  const joined = [obj.summary, ...obj.keyPoints, ...obj.dates, ...obj.actionItems, ...obj.topics].join('\n');
  if (containsPII(joined)) {
    throw new Error('Extraction rejected: the model output contained personal data.');
  }
  return obj;
}
