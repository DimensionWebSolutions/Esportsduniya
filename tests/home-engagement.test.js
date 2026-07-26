import { describe, it, expect, beforeEach, vi } from 'vitest';

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
  };
}

describe('Daily challenge helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('localStorage', createMemoryStorage());
    vi.stubGlobal('window', { gtag: undefined });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({}) }));
  });

  it('returns three challenges for today', async () => {
    const { getTodayChallenges } = await import('../src/components/DailyChallenges.js');
    const challenges = getTodayChallenges();
    expect(challenges).toHaveLength(3);
    expect(challenges[0]).toHaveProperty('trackKey');
    expect(challenges[0]).toHaveProperty('target');
  });

  it('tracks oracle and cheer progress for missions', async () => {
    const {
      getProgress,
      isDone,
      trackOracleAction,
      trackCheerAction,
    } = await import('../src/components/DailyChallenges.js');

    trackOracleAction();
    expect(getProgress('esd_oracle_count')).toBe(1);

    trackCheerAction();
    expect(getProgress('esd_cheered')).toBe(1);
    expect(isDone({ trackKey: 'esd_cheered', target: 1 })).toBe(true);
  });
});
