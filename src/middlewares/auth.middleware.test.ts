import type { IncomingMessage, ServerResponse } from 'node:http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendJson } from '../http/json.js';
import { verifyJWT } from '../services/jwt.js';
import type { UserRole } from '../types/user.js';
import { authMiddleware } from './auth.middleware.js';

vi.mock('../services/jwt.js', () => ({ verifyJWT: vi.fn() }));
vi.mock('../http/json.js', () => ({ sendJson: vi.fn() }));

const createRequest = (authorization?: string) =>
  ({ headers: authorization ? { authorization } : {} }) as IncomingMessage;

const createResponse = () => ({ statusCode: 200 }) as ServerResponse;

describe('authMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyJWT).mockResolvedValue({
      sub: 'user-123',
      role: 'customer' as UserRole,
    });
  });

  describe('missing authorization header', () => {
    it('returns null when authorization header is missing', async () => {
      const req = createRequest();
      const res = createResponse();

      const result = await authMiddleware(req, res);

      expect(result).toBeNull();
      expect(sendJson).toHaveBeenCalledOnce();
      expect(sendJson).toHaveBeenCalledWith(res, 401, { error: 'Unauthorized' });
    });

    it('returns null when headers object is missing', async () => {
      const req = { headers: null } as unknown as IncomingMessage;
      const res = createResponse();

      const result = await authMiddleware(req, res);

      expect(result).toBeNull();
      expect(sendJson).toHaveBeenCalledWith(res, 401, { error: 'Unauthorized' });
    });

    it('returns null when authorization header is empty string', async () => {
      const req = createRequest('');
      const res = createResponse();

      const result = await authMiddleware(req, res);

      expect(result).toBeNull();
      expect(sendJson).toHaveBeenCalledWith(res, 401, { error: 'Unauthorized' });
    });
  });

  describe('invalid token format', () => {
    it('returns null when token is not provided after Bearer', async () => {
      const req = createRequest('Bearer ');
      const res = createResponse();

      const result = await authMiddleware(req, res);

      expect(result).toBeNull();
      expect(sendJson).toHaveBeenCalledWith(res, 401, { error: 'Unauthorized' });
      expect(verifyJWT).not.toHaveBeenCalled();
    });

    it('returns null when authorization header has no Bearer prefix', async () => {
      const req = createRequest('invalid-token');
      const res = createResponse();

      const result = await authMiddleware(req, res);

      expect(result).toBeNull();
      expect(sendJson).toHaveBeenCalledWith(res, 401, { error: 'Unauthorized' });
      expect(verifyJWT).not.toHaveBeenCalled();
    });

    it('returns null when authorization header uses Basic instead of Bearer', async () => {
      const req = createRequest('Basic valid-token');
      const res = createResponse();

      const result = await authMiddleware(req, res);

      expect(result).toBeNull();
      expect(sendJson).toHaveBeenCalledWith(res, 401, { error: 'Unauthorized' });
      expect(verifyJWT).not.toHaveBeenCalled();
    });

    it('returns null when authorization header is only Bearer', async () => {
      const req = createRequest('Bearer');
      const res = createResponse();

      const result = await authMiddleware(req, res);

      expect(result).toBeNull();
      expect(sendJson).toHaveBeenCalledWith(res, 401, { error: 'Unauthorized' });
      expect(verifyJWT).not.toHaveBeenCalled();
    });

    it('returns null when authorization header has extra content after token', async () => {
      const req = createRequest('Bearer token extra');
      const res = createResponse();

      const result = await authMiddleware(req, res);

      expect(result).toBeNull();
      expect(sendJson).toHaveBeenCalledWith(res, 401, { error: 'Unauthorized' });
      expect(verifyJWT).not.toHaveBeenCalled();
    });
  });

  describe('token verification', () => {
    it('extracts and verifies the token', async () => {
      const req = createRequest('Bearer valid-token-123');
      const res = createResponse();

      await authMiddleware(req, res);

      expect(verifyJWT).toHaveBeenCalledOnce();
      expect(verifyJWT).toHaveBeenCalledWith('valid-token-123');
    });

    it('returns null when verifyJWT throws an error', async () => {
      const req = createRequest('Bearer expired-token');
      const res = createResponse();
      vi.mocked(verifyJWT).mockRejectedValueOnce(new Error('Token expired'));

      const result = await authMiddleware(req, res);

      expect(result).toBeNull();
      expect(sendJson).toHaveBeenCalledWith(res, 401, { error: 'Unauthorized' });
    });
  });

  describe('token payload validation', () => {
    it('returns null when token has missing role', async () => {
      const req = createRequest('Bearer valid-token');
      const res = createResponse();
      vi.mocked(verifyJWT).mockResolvedValueOnce({
        sub: 'user-123',
        role: undefined as unknown as UserRole,
      });

      const result = await authMiddleware(req, res);

      expect(result).toBeNull();
      expect(sendJson).toHaveBeenCalledWith(res, 401, { error: 'Unauthorized' });
    });

    it('returns null when token has missing userId (sub)', async () => {
      const req = createRequest('Bearer valid-token');
      const res = createResponse();
      vi.mocked(verifyJWT).mockResolvedValueOnce({
        sub: undefined as unknown as string,
        role: 'customer',
      });

      const result = await authMiddleware(req, res);

      expect(result).toBeNull();
      expect(sendJson).toHaveBeenCalledWith(res, 401, { error: 'Unauthorized' });
    });

    it('returns null when token has empty userId (sub)', async () => {
      const req = createRequest('Bearer valid-token');
      const res = createResponse();
      vi.mocked(verifyJWT).mockResolvedValueOnce({
        sub: '',
        role: 'customer',
      });

      const result = await authMiddleware(req, res);

      expect(result).toBeNull();
      expect(sendJson).toHaveBeenCalledWith(res, 401, { error: 'Unauthorized' });
    });
  });

  describe('successful authentication', () => {
    it('attaches auth context to request on success', async () => {
      const req = createRequest('Bearer valid-token-123');
      const res = createResponse();
      vi.mocked(verifyJWT).mockResolvedValueOnce({
        sub: 'user-456',
        role: 'admin',
      });

      const result = await authMiddleware(req, res);

      expect(result).toBe(req);
      expect((result as unknown as { auth: { userId: string; role: UserRole } }).auth).toEqual({
        userId: 'user-456',
        role: 'admin',
      });
      expect(sendJson).not.toHaveBeenCalled();
    });

    it.each<{ role: UserRole }>([{ role: 'customer' }, { role: 'admin' }])(
      'attaches auth context with role $role',
      async ({ role }) => {
        const req = createRequest('Bearer valid-token');
        const res = createResponse();
        vi.mocked(verifyJWT).mockResolvedValueOnce({
          sub: 'user-id',
          role,
        });

        const result = await authMiddleware(req, res);

        expect((result as unknown as { auth: { role: UserRole } }).auth.role).toBe(role);
      },
    );

    it('preserves request identity', async () => {
      const req = createRequest('Bearer valid-token');
      const res = createResponse();

      const result = await authMiddleware(req, res);

      expect(result).toBe(req);
    });
  });

  describe('authorization header parsing', () => {
    it('accepts Bearer with correct casing', async () => {
      const req = createRequest('Bearer valid-token');
      const res = createResponse();

      const result = await authMiddleware(req, res);

      expect(result).toBe(req);
      expect(verifyJWT).toHaveBeenCalledWith('valid-token');
    });

    it('accepts bearer with lowercase casing', async () => {
      const req = createRequest('bearer valid-token');
      const res = createResponse();

      const result = await authMiddleware(req, res);

      expect(result).toBe(req);
      expect(verifyJWT).toHaveBeenCalledWith('valid-token');
    });

    it('handles token with special characters', async () => {
      const specialToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      const req = createRequest(`Bearer ${specialToken}`);
      const res = createResponse();

      await authMiddleware(req, res);

      expect(verifyJWT).toHaveBeenCalledWith(specialToken);
    });

    it('rejects authorization header with multiple spaces (empty token after split)', async () => {
      const req = createRequest('Bearer   ');
      const res = createResponse();

      const result = await authMiddleware(req, res);

      expect(result).toBeNull();
      expect(sendJson).toHaveBeenCalledWith(res, 401, { error: 'Unauthorized' });
      expect(verifyJWT).not.toHaveBeenCalled();
    });
  });
});
