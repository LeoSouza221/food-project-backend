import type { AuthenticatedRequest } from '../types/authenticated-request.js';
import type { ServerResponse } from 'node:http';
import type { UserRole } from '../types/user.js';
import { sendJson } from '../http/json.js';

export const authorizationMiddleware = (
  req: AuthenticatedRequest,
  res: ServerResponse,
  allowedRoles: UserRole[],
): boolean => {
  if (!req.auth.role || !allowedRoles.includes(req.auth.role)) {
    res.statusCode = 403;
    sendJson(res, 403, { error: 'Forbidden' });
    return false;
  }
  return true;
};
