import type { IncomingMessage, ServerResponse } from 'node:http';
import { authController } from '../controllers/auth.controller.js';
import { sendJson } from '../http/json.js';

export const authRoutes = (req: IncomingMessage, res: ServerResponse, segments: string[]) => {
  const isLoginRoute = segments.length === 2 && segments[0] === 'auth' && segments[1] === 'login';

  if (!isLoginRoute) {
    return sendJson(res, 404, { error: 'Not Found' });
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' }, { Allow: 'POST' });
  }

  return authController(req, res);
};
