import { afterEach, describe, expect, it, vi } from 'vitest';
import { UserNotFoundError } from '../errors/user.errors.js';
import {
  findSessionByRefreshTokenHashRepository,
  revokeSessionRepository,
  saveSessionRepository,
} from './session.repository.js';

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('../database/pool.js', () => ({ pool: { query } }));

const row = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  user_id: '123e4567-e89b-42d3-a456-426614174001',
  refresh_token_hash: 'token-hash',
  user_agent: null,
  ip_address: null,
  created_at: new Date('2026-01-01T00:00:00Z'),
  expires_at: new Date('2026-02-01T00:00:00Z'),
  last_used_at: null,
  revoked_at: null,
};

const input = {
  id: row.id,
  userId: row.user_id,
  refreshTokenHash: row.refresh_token_hash,
  expiresAt: row.expires_at,
};

const session = {
  id: row.id,
  userId: row.user_id,
  refreshTokenHash: row.refresh_token_hash,
  userAgent: row.user_agent,
  ipAddress: row.ip_address,
  createdAt: row.created_at,
  expiresAt: row.expires_at,
  lastUsedAt: row.last_used_at,
  revokedAt: row.revoked_at,
};

afterEach(() => {
  vi.resetAllMocks();
});

describe('saveSessionRepository', () => {
  it('stores the hash and maps all session fields', async () => {
    query.mockResolvedValueOnce({ rows: [row] });
    await expect(saveSessionRepository(input)).resolves.toEqual(session);
    expect(query.mock.calls[0]?.[1]).toEqual([
      input.id,
      input.userId,
      input.refreshTokenHash,
      null,
      null,
      input.expiresAt,
    ]);
  });

  it('stores optional metadata when provided', async () => {
    query.mockResolvedValueOnce({
      rows: [{ ...row, user_agent: 'browser', ip_address: '127.0.0.1' }],
    });
    await expect(
      saveSessionRepository({ ...input, userAgent: 'browser', ipAddress: '127.0.0.1' }),
    ).resolves.toMatchObject({ userAgent: 'browser', ipAddress: '127.0.0.1' });
    expect(query.mock.calls[0]?.[1]).toEqual([
      input.id,
      input.userId,
      input.refreshTokenHash,
      'browser',
      '127.0.0.1',
      input.expiresAt,
    ]);
  });

  it('translates a user foreign key violation and propagates other errors', async () => {
    const foreignKeyError = Object.assign(new Error('foreign key'), { code: '23503' });
    query.mockRejectedValueOnce(foreignKeyError);
    await expect(saveSessionRepository(input)).rejects.toMatchObject({
      name: 'UserNotFoundError',
      cause: foreignKeyError,
    } satisfies Partial<UserNotFoundError>);

    const error = new Error('database error');
    query.mockRejectedValueOnce(error);
    await expect(saveSessionRepository(input)).rejects.toBe(error);
  });

  it('fails if the database returns no inserted row', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    await expect(saveSessionRepository(input)).rejects.toThrow(
      'It was not possible to save the session.',
    );
  });
});

describe('findSessionByRefreshTokenHashRepository', () => {
  it('finds a session by its hash, including revoked sessions', async () => {
    const revokedAt = new Date('2026-01-02T00:00:00Z');
    query.mockResolvedValueOnce({ rows: [{ ...row, revoked_at: revokedAt }] });
    await expect(findSessionByRefreshTokenHashRepository(input.refreshTokenHash)).resolves.toEqual({
      ...session,
      revokedAt,
    });
    expect(query.mock.calls[0]?.[1]).toEqual([input.refreshTokenHash]);
  });

  it('returns null when the hash is absent', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    await expect(findSessionByRefreshTokenHashRepository('missing')).resolves.toBeNull();
  });
});

describe('revokeSessionRepository', () => {
  it('revokes an unrevoked session', async () => {
    const revokedAt = new Date('2026-01-02T00:00:00Z');
    query.mockResolvedValueOnce({ rows: [{ ...row, revoked_at: revokedAt }] });
    await expect(revokeSessionRepository(input.id)).resolves.toEqual({ ...session, revokedAt });
    expect(query.mock.calls[0]?.[0]).toMatch(/WHERE id = \$1 AND revoked_at IS NULL/);
    expect(query.mock.calls[0]?.[1]).toEqual([input.id]);
  });

  it('returns null when the session is missing or already revoked', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    await expect(revokeSessionRepository(input.id)).resolves.toBeNull();
  });
});
