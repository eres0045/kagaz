import { describe, it, expect } from 'vitest';
import {
  buildDossierPrompt,
  validateDossier,
  parseDossier,
  DOSSIER_PURPOSES,
  DOSSIER_TONES,
} from '../src/lib/dossier.js';

const EXTRACTION = {
  summary: 'Offer letter for a developer role starting 15 December 2026.',
  keyPoints: ['Starts 15 December 2026'],
  dates: ['15 December 2026'],
  actionItems: ['Reply by 01 December 2026'],
  topics: ['employment'],
};

describe('buildDossierPrompt', () => {
  it('builds a prompt from redacted inputs only, naming purpose and tone', () => {
    const prompt = buildDossierPrompt({
      redactedText: 'Offer for [NAME_1].',
      extraction: EXTRACTION,
      purpose: 'job-application',
      tone: 'concise',
    });
    expect(prompt).toContain('Offer for [NAME_1]');
    expect(prompt).toContain('job application');
    expect(prompt).toContain('concise and direct');
    expect(prompt).toContain('NEVER invent, guess, or restore personal data');
    expect(prompt).toContain(JSON.stringify(EXTRACTION));
  });

  it('falls back to general/formal for unknown purpose or tone keys', () => {
    const prompt = buildDossierPrompt({
      redactedText: 'Doc.',
      extraction: EXTRACTION,
      purpose: 'nope',
      tone: 'nope',
    });
    expect(prompt).toContain('general review');
    expect(prompt).toContain('formal and precise');
  });

  it('throws when redacted text is missing', () => {
    expect(() =>
      buildDossierPrompt({ redactedText: '', extraction: EXTRACTION }),
    ).toThrow('redacted document text');
  });

  it('purpose and tone vocabularies are non-empty', () => {
    expect(Object.keys(DOSSIER_PURPOSES).length).toBeGreaterThanOrEqual(4);
    expect(Object.keys(DOSSIER_TONES).length).toBeGreaterThanOrEqual(3);
  });
});

describe('parseDossier', () => {
  const GOOD = JSON.stringify({
    title: 'Job application dossier',
    purposeSummary: 'Ready to submit.',
    sections: [{ heading: 'Role', body: 'Developer role.' }],
    checklist: ['Sign the offer'],
  });

  it('accepts a well-formed dossier', () => {
    expect(parseDossier(GOOD).title).toBe('Job application dossier');
  });

  it('rejects non-JSON and wrong shapes', () => {
    expect(() => parseDossier('nope')).toThrow('not valid JSON');
    expect(() => parseDossier(JSON.stringify({ title: 'x' }))).toThrow('purposeSummary');
    expect(() =>
      parseDossier(
        JSON.stringify({ title: 'x', purposeSummary: 'y', sections: [], checklist: [] }),
      ),
    ).toThrow('sections');
    expect(() =>
      parseDossier(
        JSON.stringify({
          title: 'x',
          purposeSummary: 'y',
          sections: [{ heading: 'h' }],
          checklist: [],
        }),
      ),
    ).toThrow('section');
  });

  it('validateDossier returns null for good data', () => {
    expect(validateDossier(JSON.parse(GOOD))).toBeNull();
  });
});
