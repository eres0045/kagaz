import { describe, it, expect } from 'vitest';
import {
  buildExtractionPrompt,
  buildExtractionSchema,
  validateExtraction,
  parseExtraction,
} from '../src/lib/extract.js';
import { Schema } from 'firebase/ai';

const GOOD = JSON.stringify({
  summary: 'Offer letter for a developer role.',
  keyPoints: ['Starts 15 December 2026', 'Salary Rs 12,00,000'],
  dates: ['15 December 2026', '01 December 2026'],
  actionItems: ['Reply by 01 December 2026'],
  topics: ['employment', 'onboarding'],
});

describe('buildExtractionPrompt', () => {
  it('includes the redacted text and the no-personal-data rule', () => {
    const prompt = buildExtractionPrompt('Offer for [NAME_1], reply to [EMAIL_1].');
    expect(prompt).toContain('Offer for [NAME_1]');
    expect(prompt).toContain('NEVER output personal data');
    expect(prompt).toContain('Return JSON only');
  });

  it('throws on empty input', () => {
    expect(() => buildExtractionPrompt('   ')).toThrow('non-empty redacted text');
    expect(() => buildExtractionPrompt('')).toThrow();
  });
});

describe('buildExtractionSchema', () => {
  it('builds a valid object schema with all five required fields', () => {
    const schema = buildExtractionSchema(Schema);
    expect(schema.type).toBe('object');
    expect(schema.required).toEqual(['summary', 'keyPoints', 'dates', 'actionItems', 'topics']);
    expect(schema.properties.summary.type).toBe('string');
    expect(schema.properties.keyPoints.type).toBe('array');
  });
});

describe('parseExtraction', () => {
  it('accepts well-formed extraction JSON', () => {
    expect(parseExtraction(GOOD).summary).toBe('Offer letter for a developer role.');
  });

  it('rejects non-JSON text', () => {
    expect(() => parseExtraction('not json')).toThrow('not valid JSON');
  });

  it('rejects wrong shapes (missing summary, non-array fields)', () => {
    expect(() => parseExtraction(JSON.stringify({ keyPoints: [] }))).toThrow('summary');
    expect(() =>
      parseExtraction(JSON.stringify({ summary: 'x', keyPoints: 'nope', dates: [], actionItems: [], topics: [] })),
    ).toThrow('keyPoints');
  });

  it('rejects output that smuggles personal data back in', () => {
    const leaked = JSON.stringify({
      summary: 'Contact aarav.sharma@example.com for details.',
      keyPoints: [],
      dates: [],
      actionItems: [],
      topics: [],
    });
    expect(() => parseExtraction(leaked)).toThrow('personal data');
  });

  it('rejects output that smuggles a phone number back in', () => {
    const leaked = JSON.stringify({
      summary: 'Call 9876543210 to confirm.',
      keyPoints: [],
      dates: [],
      actionItems: [],
      topics: [],
    });
    expect(() => parseExtraction(leaked)).toThrow('personal data');
  });

  it('validateExtraction returns null for good data and a message for bad', () => {
    expect(validateExtraction(JSON.parse(GOOD))).toBeNull();
    expect(validateExtraction(null)).toMatch(/object/);
    expect(validateExtraction([])).toMatch(/object/);
  });
});
