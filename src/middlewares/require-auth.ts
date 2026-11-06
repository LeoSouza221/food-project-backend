import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AuthenticatedRequest } from '../types/authenticated-request.js';
import type { UserRole } from '../types/user.js';
import { authMiddleware } from './auth.middleware.js';
import { authorizationMiddleware } from './authorization.middleware.js';

export const requireAuth = async (
  req: IncomingMessage,
  res: ServerResponse,
  allowedRoles?: UserRole[],
): Promise<AuthenticatedRequest | null> => {
  const authenticatedReq = await authMiddleware(req, res);
  if (!authenticatedReq) {
    return null;
  }

  if (allowedRoles && !authorizationMiddleware(authenticatedReq, res, allowedRoles)) {
    return null;
  }

  return authenticatedReq;
};
