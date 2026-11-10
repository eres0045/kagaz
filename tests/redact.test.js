import { describe, it, expect } from 'vitest';
import {
  redact,
  findPII,
  containsPII,
  restoreRedacted,
  verhoeffValid,
  verhoeffCheckDigit,
  luhnValid,
} from '../src/lib/redact.js';
import { SAMPLE_DOCS, SAMPLE_AADHAAR } from '../src/lib/sampleDocs.js';

// Build a Verhoeff-valid Aadhaar from a known base (independent of the sample).
const aadhaar = '34567890123' + verhoeffCheckDigit('34567890123');

describe('checksum helpers', () => {
  it('verhoeffValid accepts a generated check digit and rejects a wrong one', () => {
    expect(verhoeffValid(aadhaar)).toBe(true);
    const wrong = aadhaar.slice(0, 11) + (aadhaar[11] === '0' ? '1' : '0');
    expect(verhoeffValid(wrong)).toBe(false);
    expect(verhoeffValid('123456789012')).toBe(false);
  });

  it('luhnValid accepts the Visa test number and rejects a bad one', () => {
    expect(luhnValid('4111111111111111')).toBe(true);
    expect(luhnValid('4111 1111 1111 1112')).toBe(false);
    expect(luhnValid('1234567890123456')).toBe(false);
  });
});

describe('redact()', () => {
  it('redacts an email and a UPI id with distinct placeholders', () => {
    const { redactedText, findings } = redact(
      'Write to aarav.sharma@example.com or pay aarav@okhdfcbank.',
    );
    expect(redactedText).toBe('Write to [EMAIL_1] or pay [UPI_1].');
    expect(findings.map((f) => f.type)).toEqual(['EMAIL', 'UPI']);
    expect(redactedText).not.toContain('aarav.sharma@example.com');
    expect(redactedText).not.toContain('aarav@okhdfcbank');
  });

  it('redacts Indian mobiles in +91, 0-prefixed and bare forms', () => {
    const { redactedText, counts } = redact(
      'Call +91 98765 43210, 09876543210, or 9876543210.',
    );
    expect(redactedText).toBe('Call [PHONE_1], [PHONE_2], or [PHONE_3].');
    expect(counts.PHONE).toBe(3);
  });

  it('does not redact ordinary numbers that are not phone numbers', () => {
    const { redactedText, findings } = redact(
      'Order 12345 shipped in 2026. Ref 5551234. Pin 440002.',
    );
    expect(redactedText).toBe('Order 12345 shipped in 2026. Ref 5551234. Pin 440002.');
    expect(findings).toEqual([]);
  });

  it('redacts a Verhoeff-valid Aadhaar (spaced and unspaced) and never splits it', () => {
    const spaced = `${aadhaar.slice(0, 4)} ${aadhaar.slice(4, 8)} ${aadhaar.slice(8)}`;
    const { redactedText, counts } = redact(`Aadhaar ${aadhaar} and ${spaced}.`);
    expect(redactedText).toBe('Aadhaar [AADHAAR_1] and [AADHAAR_2].');
    expect(counts.AADHAAR).toBe(2);
    expect(counts.PHONE ?? 0).toBe(0); // no 10-digit slice of it became a phone
  });

  it('does not redact a 12-digit number that fails Verhoeff', () => {
    const { redactedText, findings } = redact('Reference 123456789012 please.');
    expect(redactedText).toBe('Reference 123456789012 please.');
    expect(findings).toEqual([]);
  });

  it('redacts a PAN with a valid entity letter and skips one without', () => {
    const { redactedText, counts } = redact('PAN BQXPK1234A and ABCDE1234F on file.');
    expect(redactedText).toBe('PAN [PAN_1] and ABCDE1234F on file.');
    expect(counts.PAN).toBe(1);
  });

  it('redacts a Luhn-valid card and skips a Luhn-invalid one', () => {
    const { redactedText, counts } = redact('Card 4111 1111 1111 1111, not 1234 5678 9012 3456.');
    expect(redactedText).toBe('Card [CARD_1], not 1234 5678 9012 3456.');
    expect(counts.CARD).toBe(1);
  });

  it('redacts labelled passport, DOB and name values but keeps the labels', () => {
    const { redactedText } = redact(
      'Passport No: J1234567. Date of Birth: 17 April 2003. Name: Aarav Sharma.',
    );
    expect(redactedText).toBe(
      'Passport No: [PASSPORT_1]. Date of Birth: [DOB_1]. Name: [NAME_1].',
    );
  });

  it('does NOT redact free-text person names (documented limit)', () => {
    const { redactedText } = redact('Dear Aarav Sharma, welcome aboard.');
    expect(redactedText).toBe('Dear Aarav Sharma, welcome aboard.');
  });

  it('redacts URLs and IPv4 addresses', () => {
    const { redactedText } = redact('See https://example.com/docs and server 192.168.0.12.');
    expect(redactedText).toBe('See [URL_1] and server [IP_1].');
    expect(redact('Bad IP 999.999.999.999 stays.').redactedText).toBe(
      'Bad IP 999.999.999.999 stays.',
    );
  });

  it('is stable: placeholders are numbered per type in document order', () => {
    const { redactedText } = redact('a@b.com then c@d.org then a@b.com again.');
    expect(redactedText).toBe('[EMAIL_1] then [EMAIL_2] then [EMAIL_3] again.');
  });

  it('restoreRedacted brings originals back from the findings map', () => {
    const original = 'Mail aarav@example.com or call 9876543210.';
    const { redactedText, findings } = redact(original);
    expect(restoreRedacted(redactedText, findings)).toBe(original);
  });
});

describe('containsPII / findPII', () => {
  it('containsPII is false for clean text and true for PII text', () => {
    expect(containsPII('A sunny day in Nagpur.')).toBe(false);
    expect(containsPII('Mail me at a@b.com.')).toBe(true);
  });

  it('findPII returns spans in document order', () => {
    const found = findPII('Call 9876543210 or mail a@b.com.');
    expect(found.map((f) => f.type)).toEqual(['PHONE', 'EMAIL']);
    expect(found[0].value).toBe('9876543210');
  });
});

describe('sample documents', () => {
  it('the offer letter redacts every planted PII value', () => {
    const doc = SAMPLE_DOCS.find((d) => d.id === 'offer-letter');
    const { redactedText, counts } = redact(doc.text);
    expect(counts.EMAIL).toBe(2);
    expect(counts.PHONE).toBe(2);
    expect(counts.AADHAAR).toBe(1);
    expect(counts.PAN).toBe(1);
    expect(counts.UPI).toBe(1);
    expect(counts.DOB).toBe(1);
    expect(counts.NAME).toBe(1);
    // No original value survives in the redacted text.
    for (const secret of [
      'aarav.sharma@example.com',
      'hr@northwindlabs.example',
      '9876543210',
      SAMPLE_AADHAAR,
      'BQXPK1234A',
      'aarav@okhdfcbank',
      '17 April 2003',
    ]) {
      expect(redactedText).not.toContain(secret);
    }
  });

  it('the visa letter redacts passport, emails, phone and card', () => {
    const doc = SAMPLE_DOCS.find((d) => d.id === 'visa-letter');
    const { counts } = redact(doc.text);
    expect(counts.PASSPORT).toBe(1);
    expect(counts.EMAIL).toBe(2);
    expect(counts.PHONE).toBe(1);
    expect(counts.CARD).toBe(1);
  });
});
