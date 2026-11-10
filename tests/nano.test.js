import { describe, it, expect } from 'vitest';
import { probeNano, chooseExtractionEngine } from '../src/lib/nano.js';

describe('probeNano', () => {
  it('returns unsupported in Node (no window.LanguageModel)', async () => {
    const r = await probeNano();
    expect(r.status).toBe('unsupported');
  });
});

describe('chooseExtractionEngine', () => {
  it('prefer-on-device: Nano when available', () => {
    expect(
      chooseExtractionEngine({ nanoStatus: 'available', online: true }),
    ).toEqual({ engine: 'on-device' });
    expect(
      chooseExtractionEngine({ nanoStatus: 'available', online: false }),
    ).toEqual({ engine: 'on-device' });
  });

  it('prefer-on-device: cloud fallback when Nano is not ready but online', () => {
    const r = chooseExtractionEngine({ nanoStatus: 'unavailable', online: true });
    expect(r.engine).toBe('cloud');
    expect(r.reason).toMatch(/falling back to cloud/);
  });

  it('prefer-on-device: error when offline and Nano is not ready', () => {
    const r = chooseExtractionEngine({ nanoStatus: 'unavailable', online: false });
    expect(r.engine).toBe('error');
    expect(r.reason).toMatch(/Offline/);
  });

  it('prefer-on-device: error when unsupported and offline', () => {
    const r = chooseExtractionEngine({ nanoStatus: 'unsupported', online: false });
    expect(r.engine).toBe('error');
  });

  it('on-device-only: Nano or an honest error, never silent cloud', () => {
    expect(
      chooseExtractionEngine({ nanoStatus: 'available', online: true, mode: 'on-device-only' }),
    ).toEqual({ engine: 'on-device' });
    const r = chooseExtractionEngine({ nanoStatus: 'downloadable', online: true, mode: 'on-device-only' });
    expect(r.engine).toBe('error');
    expect(r.reason).toMatch(/not ready/);
  });

  it('cloud-only: cloud when online, error when offline', () => {
    expect(
      chooseExtractionEngine({ nanoStatus: 'available', online: true, mode: 'cloud-only' }),
    ).toEqual({ engine: 'cloud' });
    expect(
      chooseExtractionEngine({ nanoStatus: 'available', online: false, mode: 'cloud-only' }).engine,
    ).toBe('error');
  });
});
