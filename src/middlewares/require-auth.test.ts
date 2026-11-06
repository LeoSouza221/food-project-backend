import type { IncomingMessage, ServerResponse } from 'node:http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyJWT } from '../services/jwt.js';
import type { UserRole } from '../types/user.js';
import { requireAuth } from './require-auth.js';

vi.mock('../services/jwt.js', () => ({ verifyJWT: vi.fn() }));

const createRequest = (authorization?: string) =>
  ({ headers: authorization ? { authorization } : {} }) as IncomingMessage;
const createResponse = () => ({ writeHead: vi.fn(), end: vi.fn() }) as unknown as ServerResponse;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(verifyJWT).mockReset();
  vi.mocked(verifyJWT).mockResolvedValue({ sub: 'user-id', role: 'customer' });
});

describe('requireAuth', () => {
  it('returns the authenticated request when no roles are required', async () => {
    const req = createRequest('Bearer token');
    const res = createResponse();

    const result = await requireAuth(req, res);

    expect(result).toBe(req);
    expect(result?.auth).toEqual({ userId: 'user-id', role: 'customer' });
    expect(res.end).not.toHaveBeenCalled();
  });

  it('returns the authenticated request when its role is allowed', async () => {
    const req = createRequest('Bearer token');
    const res = createResponse();

    expect(await requireAuth(req, res, ['admin', 'customer'])).toBe(req);
    expect(res.end).not.toHaveBeenCalled();
  });

  it('stops after authentication fails', async () => {
    const res = createResponse();

    expect(await requireAuth(createRequest(), res, ['admin'])).toBeNull();
    expect(verifyJWT).not.toHaveBeenCalled();
    expect(res.writeHead).toHaveBeenCalledOnce();
    expect(res.writeHead).toHaveBeenCalledWith(401, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Unauthorized' }));
  });

  it.each([{ roles: ['admin'] as UserRole[] }, { roles: [] as UserRole[] }])(
    'rejects roles not in the allowed list $roles',
    async ({ roles }) => {
      const res = createResponse();

      expect(await requireAuth(createRequest('Bearer token'), res, roles)).toBeNull();
      expect(res.writeHead).toHaveBeenCalledWith(403, { 'Content-Type': 'application/json' });
      expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Forbidden' }));
    },
  );
});
