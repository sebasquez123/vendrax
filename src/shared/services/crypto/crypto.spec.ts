import { describe, expect, it } from '@jest/globals';
import { API_KEY_PREFIX, generateApiKey, hashApiKey, isApiKey } from './crypto';

describe('API key crypto', () => {
  it('generates a prefixed key whose hash is the one stored', () => {
    const { apiKey, apiKeyHash } = generateApiKey();
    expect(apiKey.startsWith(API_KEY_PREFIX)).toBe(true);
    expect(isApiKey(apiKey)).toBe(true);
    expect(apiKeyHash).toBe(hashApiKey(apiKey));
    expect(apiKeyHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('never repeats a key', () => {
    const keys = new Set(Array.from({ length: 100 }, () => generateApiKey().apiKey));
    expect(keys.size).toBe(100);
  });

  it('rejects values that are not shaped like a generated key', () => {
    expect(isApiKey(undefined)).toBe(false);
    expect(isApiKey('mbk_short')).toBe(false);
    expect(isApiKey(`xyz_${'a'.repeat(43)}`)).toBe(false);
    expect(isApiKey(`${API_KEY_PREFIX}${'a'.repeat(42)}!`)).toBe(false);
  });
});
