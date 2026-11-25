import { describe, expect, it } from 'vitest';
import { generateRefreshToken, hashRefreshToken } from './refresh-token.service.js';

describe('generateRefreshToken', () => {
  it('generates distinct URL-safe tokens containing 32 random bytes', () => {
    const first = generateRefreshToken();
    const second = generateRefreshToken();

    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(first, 'base64url')).toHaveLength(32);
    expect(second).not.toBe(first);
  });
});

describe('hashRefreshToken', () => {
  it('returns the SHA-256 hash of the token as hexadecimal text', () => {
    expect(hashRefreshToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('produces a consistent hash for a generated token and a different hash for another token', () => {
    const token = generateRefreshToken();
    const hash = hashRefreshToken(token);

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hashRefreshToken(token)).toBe(hash);
    expect(hashRefreshToken(`${token}a`)).not.toBe(hash);
  });
});
