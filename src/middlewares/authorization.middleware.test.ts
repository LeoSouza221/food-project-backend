import type { ServerResponse } from 'node:http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendJson } from '../http/json.js';
import type { AuthenticatedRequest } from '../types/authenticated-request.js';
import type { UserRole } from '../types/user.js';
import { authorizationMiddleware } from './authorization.middleware.js';

vi.mock('../http/json.js', () => ({ sendJson: vi.fn() }));

const createAuthenticatedRequest = (role: UserRole) =>
  ({
    auth: { userId: 'user-123', role },
  }) as AuthenticatedRequest;

const createResponse = () => ({ statusCode: 200 }) as ServerResponse;

describe('authorizationMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('role authorization', () => {
    it('returns true when role is in allowed roles', () => {
      const req = createAuthenticatedRequest('customer');
      const res = createResponse();

      const result = authorizationMiddleware(req, res, ['customer']);

      expect(result).toBe(true);
      expect(sendJson).not.toHaveBeenCalled();
    });

    it('returns true when role is one of multiple allowed roles', () => {
      const req = createAuthenticatedRequest('admin');
      const res = createResponse();

      const result = authorizationMiddleware(req, res, ['customer', 'admin']);

      expect(result).toBe(true);
      expect(sendJson).not.toHaveBeenCalled();
    });

    it('returns false when role is not in allowed roles', () => {
      const req = createAuthenticatedRequest('customer');
      const res = createResponse();

      const result = authorizationMiddleware(req, res, ['admin']);

      expect(result).toBe(false);
      expect(sendJson).toHaveBeenCalledOnce();
      expect(sendJson).toHaveBeenCalledWith(res, 403, { error: 'Forbidden' });
    });

    it('sets status code to 403 when authorization fails', () => {
      const req = createAuthenticatedRequest('customer');
      const res = createResponse();

      authorizationMiddleware(req, res, ['admin']);

      expect(res.statusCode).toBe(403);
    });
  });

  describe('empty allowed roles', () => {
    it('returns false when allowed roles list is empty', () => {
      const req = createAuthenticatedRequest('customer');
      const res = createResponse();

      const result = authorizationMiddleware(req, res, []);

      expect(result).toBe(false);
      expect(sendJson).toHaveBeenCalledWith(res, 403, { error: 'Forbidden' });
    });

    it('returns false regardless of user role when allowed roles list is empty', () => {
      const reqAdmin = createAuthenticatedRequest('admin');
      const reqCustomer = createAuthenticatedRequest('customer');
      const res = createResponse();

      expect(authorizationMiddleware(reqAdmin, res, [])).toBe(false);
      expect(authorizationMiddleware(reqCustomer, res, [])).toBe(false);
    });
  });

  describe('all role types', () => {
    it.each<{ role: UserRole }>([{ role: 'customer' }, { role: 'admin' }])(
      'authorizes $role when allowed',
      ({ role }) => {
        const req = createAuthenticatedRequest(role);
        const res = createResponse();

        const result = authorizationMiddleware(req, res, [role]);

        expect(result).toBe(true);
      },
    );

    it.each<{ userRole: UserRole; allowedRoles: UserRole[] }>([
      { userRole: 'customer', allowedRoles: ['admin'] },
      { userRole: 'admin', allowedRoles: ['customer'] },
    ])('denies $userRole when only $allowedRoles are allowed', ({ userRole, allowedRoles }) => {
      const req = createAuthenticatedRequest(userRole);
      const res = createResponse();

      const result = authorizationMiddleware(req, res, allowedRoles);

      expect(result).toBe(false);
    });
  });

  describe('missing or invalid role', () => {
    it('returns false when user role is missing', () => {
      const req = {
        auth: { userId: 'user-123', role: undefined },
      } as unknown as AuthenticatedRequest;
      const res = createResponse();

      const result = authorizationMiddleware(req, res, ['customer', 'admin']);

      expect(result).toBe(false);
      expect(sendJson).toHaveBeenCalledWith(res, 403, { error: 'Forbidden' });
    });

    it('returns false when user role is null', () => {
      const req = {
        auth: { userId: 'user-123', role: null },
      } as unknown as AuthenticatedRequest;
      const res = createResponse();

      const result = authorizationMiddleware(req, res, ['customer']);

      expect(result).toBe(false);
    });

    it('returns false when user role is not in allowed roles (including invalid roles)', () => {
      const req = {
        auth: { userId: 'user-123', role: 'moderator' },
      } as unknown as AuthenticatedRequest;
      const res = createResponse();

      const result = authorizationMiddleware(req, res, ['customer', 'admin']);

      expect(result).toBe(false);
    });
  });

  describe('response handling', () => {
    it('calls sendJson with correct status and message on authorization failure', () => {
      const req = createAuthenticatedRequest('customer');
      const res = createResponse();

      authorizationMiddleware(req, res, ['admin']);

      expect(sendJson).toHaveBeenCalledOnce();
      expect(sendJson).toHaveBeenCalledWith(res, 403, { error: 'Forbidden' });
    });

    it('does not call sendJson on authorization success', () => {
      const req = createAuthenticatedRequest('admin');
      const res = createResponse();

      authorizationMiddleware(req, res, ['admin']);

      expect(sendJson).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles single role in allowed roles array', () => {
      const req = createAuthenticatedRequest('admin');
      const res = createResponse();

      const result = authorizationMiddleware(req, res, ['admin']);

      expect(result).toBe(true);
    });

    it('handles multiple same roles in allowed roles array (no duplicates filtered)', () => {
      const req = createAuthenticatedRequest('admin');
      const res = createResponse();

      const result = authorizationMiddleware(req, res, ['admin', 'admin']);

      expect(result).toBe(true);
    });

    it('returns correct result regardless of response initial state', () => {
      const req = createAuthenticatedRequest('customer');
      const res = { statusCode: 999 } as ServerResponse;

      authorizationMiddleware(req, res, ['admin']);

      expect(res.statusCode).toBe(403);
    });
  });
});
