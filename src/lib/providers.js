/**
 * Kagaz — model providers.
 *
 * A provider exposes two methods, both taking REDACTED text only:
 *   extract(redactedText, { onProgress }) -> { data, engine, inferenceSource }
 *   tailor(redactedText, extraction, { purpose, tone }) -> { data, engine }
 *
 * `engine` is always one of 'on-device' | 'cloud' | 'demo'. The UI shows
 * that as a chip on every AI result, and the pipeline records it.
 *
 * FirebaseAIProvider — the real leg, via Firebase AI Logic (see
 * firebase.js). Extraction uses the hybrid model (PREFER_ON_DEVICE) with a
 * structured-output schema; tailoring uses the cloud-only Flash model.
 *
 * MockProvider — deterministic, offline, no network. Used by the test
 * suite and by the app's demo mode when no Firebase config is present.
 * Its outputs are rule-based (sentence splitting, heading detection) and
 * are labelled 'demo' everywhere, so demo output can never be mistaken
 * for a model result.
 */

import { buildExtractionPrompt, buildExtractionSchema, parseExtraction } from './extract.js';
import { buildDossierPrompt, parseDossier } from './dossier.js';
import { containsPII } from './redact.js';

// ---------------------------------------------------------------------------
// Real provider — Firebase AI Logic
// ---------------------------------------------------------------------------

export class FirebaseAIProvider {
  constructor({ getHybridModel, getCloudModel, Schema }) {
    this.getHybridModel = getHybridModel;
    this.getCloudModel = getCloudModel;
    this.Schema = Schema;
    this.deviceModelInitialised = false;
  }

  async ensureDeviceModel(onProgress) {
    if (this.deviceModelInitialised) return;
    const model = this.getHybridModel();
    await model.initializeDeviceModel(onProgress);
    this.deviceModelInitialised = true;
  }

  async extract(redactedText, { onProgress } = {}) {
    if (containsPII(redactedText)) {
      throw new Error('Refusing to send text containing personal data to the model.');
    }
    const model = this.getHybridModel();
    await this.ensureDeviceModel(onProgress);
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: buildExtractionPrompt(redactedText) }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: buildExtractionSchema(this.Schema),
      },
    });
    const data = parseExtraction(result.response.text());
    const source = result.response.inferenceSource; // 'on_device' | 'in_cloud' | undefined
    return {
      data,
      engine: source === 'on_device' ? 'on-device' : 'cloud',
      inferenceSource: source ?? 'unknown',
    };
  }

  async tailor(redactedText, extraction, { purpose, tone } = {}) {
    if (containsPII(redactedText)) {
      throw new Error('Refusing to send text containing personal data to the model.');
    }
    const model = this.getCloudModel();
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: buildDossierPrompt({ redactedText, extraction, purpose, tone }) }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });
    const data = parseDossier(result.response.text());
    return { data, engine: 'cloud', inferenceSource: result.response.inferenceSource ?? 'in_cloud' };
  }
}

// ---------------------------------------------------------------------------
// Mock provider — deterministic demo / tests
// ---------------------------------------------------------------------------

function splitSentences(text) {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export class MockProvider {
  async extract(redactedText) {
    const sentences = splitSentences(redactedText);
    const lines = redactedText.split('\n').map((l) => l.trim()).filter(Boolean);
    const data = {
      summary: sentences.slice(0, 2).join(' ') || 'No readable content found.',
      keyPoints: lines
        .filter((l) => l.length > 20 && l.length < 160)
        .slice(0, 6),
      dates: [...redactedText.matchAll(/\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b/g)].map((m) => m[0]),
      actionItems: lines
        .filter((l) => /^(please|ensure|submit|complete|review|attach|provide|note)\b/i.test(l))
        .slice(0, 5),
      topics: [...new Set(lines.map((l) => l.split(':')[0].trim()).filter((h) => h.length > 2 && h.length < 40))].slice(0, 5),
    };
    // Same validation as the real path — a mock that skips validation proves nothing.
    const checked = parseExtraction(JSON.stringify(data));
    return { data: checked, engine: 'demo', inferenceSource: 'demo' };
  }

  async tailor(redactedText, extraction, { purpose = 'general', tone = 'formal' } = {}) {
    const data = {
      title: `Kagaz dossier — ${purpose} (${tone})`,
      purposeSummary:
        'Demo dossier prepared from the redacted document. ' +
        (extraction.summary || ''),
      sections: [
        { heading: 'What this document is', body: extraction.summary || 'No summary available.' },
        {
          heading: 'Key points',
          body: extraction.keyPoints.length ? extraction.keyPoints.join('\n- ') : 'No key points extracted.',
        },
        {
          heading: 'Dates and deadlines',
          body: extraction.dates.length ? extraction.dates.join(', ') : 'No dates found in the document.',
        },
      ],
      checklist: extraction.actionItems.length
        ? extraction.actionItems
        : ['Review the redacted document and confirm nothing sensitive remains.'],
    };
    const checked = parseDossier(JSON.stringify(data));
    return { data: checked, engine: 'demo', inferenceSource: 'demo' };
  }
}
