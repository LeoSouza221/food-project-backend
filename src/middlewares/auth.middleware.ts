import type { IncomingMessage, ServerResponse } from 'node:http';
import { sendJson } from '../http/json.js';
import { verifyJWT } from '../services/jwt.js';
import type { AuthenticatedRequest } from '../types/authenticated-request.js';

export const authMiddleware = async (
  req: IncomingMessage,
  res: ServerResponse,
): Promise<AuthenticatedRequest | null> => {
  const authenticatedReq = req as AuthenticatedRequest;
  if (!req.headers || !req.headers.authorization) {
    sendJson(res, 401, { error: 'Unauthorized' });
    return null;
  }

  const token = req.headers.authorization.split(' ')[1];

  if (!token) {
    sendJson(res, 401, { error: 'Unauthorized' });
    return null;
  }

  try {
    const { role, sub: userId } = await verifyJWT(token);

    if (!role || !userId) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return null;
    }

    authenticatedReq.auth = {
      userId: userId,
      role: role,
    };

    return authenticatedReq;
  } catch (error) {
    sendJson(res, 401, { error: 'Unauthorized' });
    return null;
  }
};
