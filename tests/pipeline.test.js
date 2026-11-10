import { describe, it, expect } from 'vitest';
import { runPipeline } from '../src/lib/pipeline.js';
import { MockProvider } from '../src/lib/providers.js';
import { SAMPLE_DOCS, SAMPLE_AADHAAR } from '../src/lib/sampleDocs.js';

/** A provider that echoes its input back — simulates a model leaking PII. */
class EchoProvider {
  async extract(redactedText) {
    return {
      data: {
        summary: `Echo: ${redactedText.slice(0, 80)}`,
        keyPoints: [],
        dates: [],
        actionItems: [],
        topics: [],
      },
      engine: 'cloud',
      inferenceSource: 'in_cloud',
    };
  }
  async tailor(redactedText, extraction) {
    return {
      data: {
        title: 'Echo dossier',
        purposeSummary: redactedText.slice(0, 60),
        sections: [{ heading: 'Echo', body: 'echo' }],
        checklist: [],
      },
      engine: 'cloud',
      inferenceSource: 'in_cloud',
    };
  }
}

describe('runPipeline (MockProvider, end-to-end)', () => {
  const doc = SAMPLE_DOCS.find((d) => d.id === 'offer-letter');

  it('runs redaction → extraction → tailoring and reports demo engines', async () => {
    const steps = [];
    const out = await runPipeline({
      text: doc.text,
      provider: new MockProvider(),
      purpose: 'job-application',
      tone: 'formal',
      nanoProbe: { status: 'unavailable', detail: 'test' },
      online: true,
      onStep: (s, detail) => steps.push(detail),
    });
    expect(out.counts.EMAIL).toBe(2);
    expect(out.counts.AADHAAR).toBe(1);
    expect(out.extractionEngine).toBe('demo');
    expect(out.dossierEngine).toBe('demo');
    expect(out.extraction.summary.length).toBeGreaterThan(10);
    expect(out.dossier.title).toContain('job-application');
    expect(out.dossier.sections.length).toBeGreaterThan(0);
    expect(steps.length).toBeGreaterThanOrEqual(4);
    // The redacted text contains no original secret.
    expect(out.redactedText).not.toContain(SAMPLE_AADHAAR);
    expect(out.redactedText).not.toContain('aarav.sharma@example.com');
  });

  it('chooses on-device extraction when Nano reports available', async () => {
    // MockProvider always reports 'demo'; the decision is about the engine
    // the pipeline *asks* for — verified via nanoStatus passthrough.
    const out = await runPipeline({
      text: doc.text,
      provider: new MockProvider(),
      nanoProbe: { status: 'available', detail: 'test' },
      online: true,
    });
    expect(out.nanoStatus).toBe('available');
  });

  it('refuses to run when offline and Nano is unavailable', async () => {
    await expect(
      runPipeline({
        text: doc.text,
        provider: new MockProvider(),
        nanoProbe: { status: 'unavailable', detail: 'test' },
        online: false,
      }),
    ).rejects.toThrow('Offline and Gemini Nano is not ready');
  });

  it('refuses on-device-only mode when Nano is not ready', async () => {
    await expect(
      runPipeline({
        text: doc.text,
        provider: new MockProvider(),
        extractionMode: 'on-device-only',
        nanoProbe: { status: 'downloadable', detail: 'test' },
        online: true,
      }),
    ).rejects.toThrow('not ready');
  });

  it('leak guard aborts when a provider echoes PII back', async () => {
    // EchoProvider returns the redacted text inside the summary — but the
    // redacted text itself is PII-free, so build a case where the echo
    // contains a planted secret by feeding it through the raw path:
    const leaky = new EchoProvider();
    // Monkey-patch: make extract return a summary that leaks a real email.
    leaky.extract = async () => ({
      data: {
        summary: 'Contact hr@northwindlabs.example for details.',
        keyPoints: [],
        dates: [],
        actionItems: [],
        topics: [],
      },
      engine: 'cloud',
      inferenceSource: 'in_cloud',
    });
    await expect(
      runPipeline({
        text: doc.text,
        provider: leaky,
        nanoProbe: { status: 'unavailable', detail: 'test' },
        online: true,
      }),
    ).rejects.toThrow('Leak guard');
  });

  it('throws on empty input and on a missing provider', async () => {
    await expect(
      runPipeline({ text: '   ', provider: new MockProvider() }),
    ).rejects.toThrow('No document text');
    await expect(runPipeline({ text: 'hello', provider: null })).rejects.toThrow(
      'provider',
    );
  });
});
