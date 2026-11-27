import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  authController,
  logoutController,
  refreshTokenController,
} from '../controllers/auth.controller.js';
import { sendJson } from '../http/json.js';
import { rateLimitMiddleware } from '../middlewares/rate-limit.middleware.js';

export const authRoutes = (req: IncomingMessage, res: ServerResponse, segments: string[]) => {
  const action = segments[1];

  if (
    segments.length !== 2 ||
    segments[0] !== 'auth' ||
    (action !== 'login' && action !== 'refresh' && action !== 'logout')
  ) {
    return sendJson(res, 404, { error: 'Not Found' });
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' }, { Allow: 'POST' });
  }

  if (action === 'login') {
    return rateLimitMiddleware(req, res, () => authController(req, res));
  }

  return action === 'refresh' ? refreshTokenController(req, res) : logoutController(req, res);
};
