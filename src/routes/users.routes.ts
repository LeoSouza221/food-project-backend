import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  createUserController,
  deleteUserController,
  getUserByIdController,
  listUsersController,
  updateUserController,
} from '../controllers/user.controller.js';
import { sendJson } from '../http/json.js';

export const usersRoutes = (req: IncomingMessage, res: ServerResponse, segments: string[]) => {
  if (req.method === 'POST') {
    if (segments.length !== 1) {
      return sendJson(res, 400, { error: 'Bad Request' });
    }

    return createUserController(req, res);
  }

  if (req.method === 'GET') {
    if (segments.length === 1) {
      return listUsersController(res);
    }

    if (segments.length === 2 && segments[1]) {
      return getUserByIdController(res, segments[1]);
    }

    return sendJson(res, 400, { error: 'Bad Request' });
  }

  if (req.method === 'PATCH' || req.method === 'DELETE') {
    if (segments.length !== 2 || !segments[1]) {
      return sendJson(res, 400, { error: 'Bad Request' });
    }

    if (req.method === 'PATCH') {
      return updateUserController(req, res, segments[1]);
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
