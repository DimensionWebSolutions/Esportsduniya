import { beforeEach, describe, expect, it } from 'vitest';
import { safeReadStorageJson, safeStorageGet, safeStorageRemove } from '../src/lib/utils.js';

describe('storage safety helpers', () => {
  beforeEach(() => {
    const storage = new Map();
    globalThis.window = {
      localStorage: {
        getItem: (key) => (storage.has(key) ? storage.get(key) : null),
        setItem: (key, value) => storage.set(key, String(value)),
        removeItem: (key) => storage.delete(key),
        clear: () => storage.clear(),
      },
    };
  });

  it('returns a safe fallback for invalid JSON payloads', () => {
    globalThis.window.localStorage.setItem('user', '{broken json');

    expect(safeReadStorageJson('user', null)).toBeNull();
    expect(safeReadStorageJson('missing-key', { isAdmin: false })).toEqual({ isAdmin: false });
  });

  it('treats missing values and removal as non-fatal', () => {
    expect(safeStorageGet('missing-key', 'fallback')).toBe('fallback');

    expect(() => safeStorageRemove('missing-key')).not.toThrow();
  });
});
