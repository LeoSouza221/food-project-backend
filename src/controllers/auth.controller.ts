import type { IncomingMessage, ServerResponse } from 'node:http';
import { InvalidJsonBodyError, readJsonBody, sendJson } from '../http/json.js';
import { loginUser, logoutUser, refreshUserSession } from '../services/auth.service.js';
import { InvalidCredentialsError } from '../errors/auth.errors.js';

const readBody = async (
  req: IncomingMessage,
  res: ServerResponse,
): Promise<Record<string, unknown> | null> => {
  let body: unknown;

  try {
    body = await readJsonBody(req);
  } catch (error) {
    if (error instanceof InvalidJsonBodyError) {
      sendJson(res, 400, { error: 'Invalid JSON' });
      return null;
    }

    sendJson(res, 500, { error: 'Internal Server Error' });
    return null;
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    sendJson(res, 400, { error: 'Invalid request body' });
    return null;
  }

  return body as Record<string, unknown>;
};

export const authController = async (req: IncomingMessage, res: ServerResponse) => {
  const body = await readBody(req, res);
  if (!body) return;

  if (
    typeof body.identifier !== 'string' ||
    typeof body.password !== 'string' ||
    body.identifier.trim() === '' ||
    body.password.length === 0
  ) {
    return sendJson(res, 400, { error: 'Invalid request body' });
  }

  try {
    const result = await loginUser(body.identifier, body.password, {
      userAgent: req.headers['user-agent'] ?? null,
      ipAddress: req.socket.remoteAddress ?? null,
    });

    return sendJson(res, 200, {
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      return sendJson(res, 401, { error: 'Invalid credentials' });
    }

    return sendJson(res, 500, { error: 'Internal Server Error' });
  }
};

export const refreshTokenController = async (req: IncomingMessage, res: ServerResponse) => {
  const body = await readBody(req, res);
  if (!body) return;

  if (typeof body.refreshToken !== 'string' || body.refreshToken.length === 0) {
    return sendJson(res, 400, { error: 'Invalid request body' });
  }

  try {
    const result = await refreshUserSession(body.refreshToken);

    return sendJson(res, 200, {
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      return sendJson(res, 401, { error: 'Invalid refresh token' });
    }

    return sendJson(res, 500, { error: 'Internal Server Error' });
  }
};

export const logoutController = async (req: IncomingMessage, res: ServerResponse) => {
  const body = await readBody(req, res);
  if (!body) return;

  if (typeof body.refreshToken !== 'string' || body.refreshToken.length === 0) {
    return sendJson(res, 400, { error: 'Invalid request body' });
  }

  try {
    await logoutUser(body.refreshToken);

    return sendJson(res, 200, {
      success: true,
      message: 'Session revoked',
    });
  } catch {
    return sendJson(res, 500, { error: 'Internal Server Error' });
  }
};
