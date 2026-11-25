import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('dotenv', () => ({ default: { config: vi.fn() } }));

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('DUMMY_PASSWORD_HASH', 'hash');
  vi.stubEnv('DB_HOST', 'localhost');
  vi.stubEnv('DB_PORT', '5432');
  vi.stubEnv('DB_NAME', 'test');
  vi.stubEnv('DB_USER', 'test');
  vi.stubEnv('DB_PASSWORD', 'test');
  vi.stubEnv('JWT_SECRET', 'a'.repeat(32));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('JWT secret configuration', () => {
  it.each(['a'.repeat(31), 'é'.repeat(15) + 'a', ''])(
    'rejects secrets shorter than 32 UTF-8 bytes',
    async (secret) => {
      vi.stubEnv('JWT_SECRET', secret);
      await expect(import('./config.js')).rejects.toThrow('Invalid JWT_SECRET');
    },
  );

  it('rejects a missing secret', async () => {
    vi.stubEnv('JWT_SECRET', undefined);
    await expect(import('./config.js')).rejects.toThrow('Invalid JWT_SECRET');
  });

  it.each(['a'.repeat(32), 'é'.repeat(16)])(
    'accepts secrets of at least 32 UTF-8 bytes',
    async (secret) => {
      vi.stubEnv('JWT_SECRET', secret);
      const { config } = await import('./config.js');
      expect(config.jwtSecret).toBe(secret);
    },
  );
});

describe('database port configuration', () => {
  it.each(['5e3', '0x1388', ' 5000', '5000\n', '+5000', '5000.0', ''])(
    'rejects non-decimal port %j',
    async (value) => {
      vi.stubEnv('DB_PORT', value);
      await expect(import('./config.js')).rejects.toThrow('Invalid DB_PORT');
    },
  );

  it.each(['5000', '05000'])('accepts a decimal port %s', async (value) => {
    vi.stubEnv('DB_PORT', value);
    const { config } = await import('./config.js');
    expect(config.database.port).toBe(5000);
  });
});
