import type { IncomingMessage, ServerResponse } from 'node:http';
import { InvalidJsonBodyError, readJsonBody, sendJson } from '../http/json.js';
import { loginUser } from '../services/auth.service.js';
import { InvalidCredentialsError } from '../errors/auth.errors.js';

export const authController = async (req: IncomingMessage, res: ServerResponse) => {
  let parsedBody: unknown;
  try {
    parsedBody = await readJsonBody(req);
  } catch (error) {
    if (error instanceof InvalidJsonBodyError) {
      return sendJson(res, 400, { error: 'Invalid JSON' });
    }

    return sendJson(res, 500, { error: 'Internal Server Error' });
  }
  if (
    typeof parsedBody !== 'object' ||
    parsedBody === null ||
    !('identifier' in parsedBody) ||
    !('password' in parsedBody) ||
    typeof parsedBody.identifier !== 'string' ||
    typeof parsedBody.password !== 'string' ||
    parsedBody.password.length === 0 ||
    parsedBody.identifier.trim() === ''
  ) {
    return sendJson(res, 400, { error: 'Invalid request body' });
  }

  try {
    const result = await loginUser(parsedBody.identifier, parsedBody.password);
    return sendJson(res, 200, {
      success: true,
      data: {
        user: result.user,
        token: result.token,
      },
    });
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      return sendJson(res, 401, { error: 'Invalid credentials' });
    }
    return sendJson(res, 500, { error: 'Internal Server Error' });
  }
};
