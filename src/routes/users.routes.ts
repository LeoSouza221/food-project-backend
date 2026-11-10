import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  createUserController,
  deleteUserController,
  getUserByIdController,
  listUsersController,
  updateUserController,
} from '../controllers/user.controller.js';
import { sendJson } from '../http/json.js';
import { requireAuth } from '../middlewares/require-auth.js';

export const usersRoutes = async (
  req: IncomingMessage,
  res: ServerResponse,
  segments: string[],
) => {
  if (req.method === 'POST') {
    if (segments.length !== 1) {
      return sendJson(res, 400, { error: 'Bad Request' });
    }

    return createUserController(req, res);
  }

  if (req.method === 'GET') {
    if (segments.length === 1) {
      const authenticatedReq = await requireAuth(req, res, ['admin']);
      if (!authenticatedReq) {
        return;
      }
      return listUsersController(res);
    }

    if (segments.length === 2 && segments[1]) {
      if (segments[1] === 'me') {
        const authenticatedReq = await requireAuth(req, res, ['admin', 'customer']);
        if (!authenticatedReq) {
          return;
        }

        return getUserByIdController(res, authenticatedReq.auth.userId);
      }

      const authenticatedReq = await requireAuth(req, res, ['admin', 'customer']);
      if (!authenticatedReq) {
        return;
      }

      if (authenticatedReq.auth.role !== 'admin' && authenticatedReq.auth.userId !== segments[1]) {
        return sendJson(res, 403, { error: 'Forbidden' });
      }

      return getUserByIdController(res, segments[1]);
    }

    return sendJson(res, 400, { error: 'Bad Request' });
  }

  if (req.method === 'PATCH' || req.method === 'DELETE') {
    if (segments.length !== 2 || !segments[1]) {
      return sendJson(res, 400, { error: 'Bad Request' });
    }

    if (req.method === 'PATCH') {
      const authenticatedReq = await requireAuth(req, res, ['admin', 'customer']);
      if (!authenticatedReq) {
        return;
      }

      if (authenticatedReq.auth.role !== 'admin' && authenticatedReq.auth.userId !== segments[1]) {
        return sendJson(res, 403, { error: 'Forbidden' });
      }
      return updateUserController(req, res, segments[1]);
    }

    const authenticatedReq = await requireAuth(req, res, ['admin']);
    if (!authenticatedReq) {
      return;
    }

    return deleteUserController(res, segments[1]);
  }

  return sendJson(
    res,
    405,
    { error: 'Method Not Allowed' },
    {
      Allow: 'GET, POST, PATCH, DELETE',
    },
  );
};
