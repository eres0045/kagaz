/**
 * Kagaz — deterministic PII redaction engine.
 *
 * Pure functions, no network, no model. Every detector is a regex plus an
 * optional checksum validator (Verhoeff for Aadhaar, Luhn for cards, PAN
 * entity-letter check). Detectors run in priority order; the first detector
 * to claim a character span wins, so a 12-digit Aadhaar is never split into
 * a phone number and a card fragment.
 *
 * Deliberate limit: free-text person names are NOT detected. Only names
 * after an explicit label ("Name:", "Candidate:", "Applicant:") are
 * redacted. Guessing names in prose would both miss real names and redact
 * innocent words; the UI says so plainly.
 *
 * The redaction map (placeholder -> original value) lives only in memory on
 * the user's device. It is NEVER sent to any model — the cloud leg receives
 * only redacted text, and the pipeline's leak guard re-scans every
 * cloud-bound string before it leaves.
 */

// ---------------------------------------------------------------------------
// Checksums
// ---------------------------------------------------------------------------

// Verhoeff (Aadhaar). Standard multiplication table d, permutation p, inverse.
const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 0, 1, 3, 2, 4, 9, 6, 7, 5],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];
const VERHOEFF_INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

/** True when the 12-digit string passes the Verhoeff checksum. */
export function verhoeffValid(digits) {
  if (!/^\d{12}$/.test(digits)) return false;
  let c = 0;
  for (let i = 0; i < 12; i++) {
    const digit = Number(digits[11 - i]);
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][digit]];
  }
  return c === 0;
}

/** Compute the Verhoeff check digit for an 11-digit base. Used by tests. */
export function verhoeffCheckDigit(base11) {
  let c = 0;
  for (let i = 0; i < 11; i++) {
    const digit = Number(base11[10 - i]);
    c = VERHOEFF_D[c][VERHOEFF_P[(i + 1) % 8][digit]];
  }
  return String(VERHOEFF_INV[c]);
}

/** True when the digit string (spaces/dashes stripped) passes Luhn. */
export function luhnValid(digits) {
  const d = digits.replace(/[\s-]/g, '');
  if (!/^\d{13,19}$/.test(d)) return false;
  let sum = 0;
  let dbl = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i]);
    if (dbl) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

// ---------------------------------------------------------------------------
// Detectors (priority order = array order)
// ---------------------------------------------------------------------------

const PAN_ENTITY_LETTERS = new Set(['P', 'C', 'H', 'F', 'A', 'T', 'B', 'L', 'J', 'G']);

/**
 * Each detector: { type, regex (global), validate?, group? }.
 * `group` is the capture-group index holding the value to redact; the rest
 * of the match (e.g. a "Passport No:" label) is left in place.
 */
const DETECTORS = [
  { type: 'EMAIL', regex: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  { type: 'URL', regex: /https?:\/\/[^\s<>"']+|www\.[^\s<>"']+/g },
  {
    type: 'IP',
    regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    validate: (v) => v.split('.').every((o) => Number(o) <= 255),
  },
  { type: 'UPI', regex: /\b[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}\b/g },
  {
    type: 'AADHAAR',
    regex: /(?<!\d)\d{4}[\s-]?\d{4}[\s-]?\d{4}(?!\d)/g,
    validate: (v) => verhoeffValid(v.replace(/[\s-]/g, '')),
  },
  {
    type: 'CARD',
    regex: /(?<!\d)(?:\d[ -]?){13,19}(?!\d)/g,
    validate: (v) => luhnValid(v),
  },
  {
    type: 'PAN',
    regex: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g,
    validate: (v) => PAN_ENTITY_LETTERS.has(v[3]),
  },
  // Indian mobile: optional +91/91/0 prefix, 10 digits starting 6-9.
  // The whole match (prefix included) is redacted. The separator after the
  // prefix is part of the prefix group, so a bare number never eats the
  // space before it.
  {
    type: 'PHONE',
    regex: /(?<!\d)(?:(?:\+91|91|0)[\s-]?)?[6-9]\d{4}[\s-]?\d{5}(?!\d)/g,
  },
  // Other international numbers: +CC ... (loose, requires a leading +).
  { type: 'PHONE', regex: /\+\d{1,3}[\s-]?\(?\d{1,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}\b/g },
  {
    type: 'PASSPORT',
    regex: /passport\s*(?:no\.?|number|#)?\s*[:\-]?\s*([A-Z][0-9]{7})/gi,
    group: 1,
  },
  {
    type: 'DOB',
    regex: /(?:date of birth|dob)\s*[:\-]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/gi,
    group: 1,
  },
  {
    type: 'NAME',
    regex: /(?<![A-Za-z])(?:name|candidate|applicant)\s*[:\-]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/gi,
    group: 1,
  },
];

export const PII_TYPES = [...new Set(DETECTORS.map((d) => d.type))];

/**
 * Find all PII spans in `text`, honouring detector priority and overlap.
 * Returns findings sorted by position: { type, value, start, end }.
 */
export function findPII(text) {
  const claimed = []; // { start, end } spans already taken
  const findings = [];

  const overlaps = (s, e) => claimed.some((c) => s < c.end && e > c.start);

  for (const det of DETECTORS) {
    det.regex.lastIndex = 0;
    let m;
    while ((m = det.regex.exec(text)) !== null) {
      const groupIndex = det.group ?? 0;
      const value = m[groupIndex];
      if (!value) continue;
      // Absolute start of the captured group. For group 0 the whole match
      // is the value; for labelled detectors the label text precedes the
      // value inside the match and never contains the value itself, so
      // indexOf within the match is exact.
      const start = groupIndex === 0 ? m.index : m.index + m[0].indexOf(value);
      const end = start + value.length;
      if (overlaps(start, end)) continue;
      if (det.validate && !det.validate(value)) continue;
      claimed.push({ start, end });
      findings.push({ type: det.type, value, start, end });
    }
  }

  findings.sort((a, b) => a.start - b.start);
  return findings;
}

/** True when `text` contains any detectable PII. */
export function containsPII(text) {
  return findPII(text).length > 0;
}

/**
 * Redact all detected PII. Returns:
 *   { redactedText, findings: [{ type, placeholder, value, start, end }],
 *     counts: { EMAIL: n, ... } }
 * Placeholders are stable per type in document order: [EMAIL_1], [PHONE_1]…
 * The returned findings carry the original values — keep them client-side
 * only; never send them to any model or server.
 */
export function redact(text) {
  const raw = findPII(text);
  const counters = {};
  const findings = raw.map((f) => {
    counters[f.type] = (counters[f.type] ?? 0) + 1;
    return { ...f, placeholder: `[${f.type}_${counters[f.type]}]` };
  });

  let out = '';
  let cursor = 0;
  for (const f of findings) {
    out += text.slice(cursor, f.start) + f.placeholder;
    cursor = f.end;
  }
  out += text.slice(cursor);

  return { redactedText: out, findings, counts: counters };
}

/** Restore original values into redacted text (client-side display only). */
export function restoreRedacted(redactedText, findings) {
  let out = redactedText;
  for (const f of findings) {
    out = out.split(f.placeholder).join(f.value);
  }
  return out;
}
