import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  createUser,
  deleteUser,
  getUserById,
  getUsers,
  updateUser,
} from '../services/user.service.js';
import { InvalidJsonBodyError, readJsonBody, sendJson } from '../http/json.js';

const isValidUserId = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

const validateUserId = (res: ServerResponse, userId: string): boolean => {
  if (!userId) {
    sendJson(res, 400, { error: 'User ID is required' });
    return false;
  }

  if (!isValidUserId(userId)) {
    sendJson(res, 400, { error: 'Invalid user ID' });
    return false;
  }

  return true;
};

export const listUsersController = async (res: ServerResponse) => {
  try {
    const users = await getUsers();
    return sendJson(res, 200, { users });
  } catch {
    return sendJson(res, 500, { error: 'Internal Server Error' });
  }
};

export const getUserByIdController = async (res: ServerResponse, userId: string) => {
  if (!validateUserId(res, userId)) return;

  try {
    const user = await getUserById(userId);
    return sendJson(res, 200, { user });
  } catch (error) {
    if (error instanceof Error && error.message === 'User not found.') {
      return sendJson(res, 404, { error: 'User not found' });
    }

    return sendJson(res, 500, { error: 'Internal Server Error' });
  }
};

export const createUserController = async (req: IncomingMessage, res: ServerResponse) => {
  let parsedBody: unknown;
  try {
    parsedBody = await readJsonBody(req);
  } catch (error) {
    if (error instanceof InvalidJsonBodyError) {
      return sendJson(res, 400, { error: 'Invalid JSON' });
    }

    return sendJson(res, 500, { error: 'Internal Server Error' });
  }

  try {
    const user = await createUser(parsedBody);
    return sendJson(res, 201, { message: 'User created', user });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid user data') {
      return sendJson(res, 400, { error: 'Invalid user data' });
    }

    return sendJson(res, 500, { error: 'Internal Server Error' });
  }
};

export const updateUserController = async (
  req: IncomingMessage,
  res: ServerResponse,
  userId: string,
) => {
  if (!validateUserId(res, userId)) return;

  let parsedBody: unknown;
  try {
    parsedBody = await readJsonBody(req);
  } catch (error) {
    if (error instanceof InvalidJsonBodyError) {
      return sendJson(res, 400, { error: 'Invalid JSON' });
    }

    return sendJson(res, 500, { error: 'Internal Server Error' });
  }

  try {
    const user = await updateUser(userId, parsedBody);
    return sendJson(res, 200, { message: 'User updated', user });
  } catch (error) {
    if (error instanceof Error && error.message === 'User not found.') {
      return sendJson(res, 404, { error: 'User not found' });
    }

    if (error instanceof Error && error.message === 'Invalid user update data') {
      return sendJson(res, 400, { error: 'Invalid user data or update failed' });
    }

    return sendJson(res, 500, { error: 'Internal Server Error' });
  }
};

export const deleteUserController = async (res: ServerResponse, userId: string) => {
  if (!validateUserId(res, userId)) return;

  try {
    await deleteUser(userId);
    return sendJson(res, 200, { message: 'User deleted' });
  } catch (error) {
    if (error instanceof Error && error.message === 'User not found.') {
      return sendJson(res, 404, { error: 'User not found' });
    }

    return sendJson(res, 500, { error: 'Internal Server Error' });
  }
};
