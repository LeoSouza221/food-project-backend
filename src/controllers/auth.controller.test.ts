import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authController, logoutController, refreshTokenController } from './auth.controller.js';
import * as authService from '../services/auth.service.js';
import { InvalidCredentialsError } from '../errors/auth.errors.js';

vi.mock('../services/auth.service.js', () => ({
  loginUser: vi.fn(),
  refreshUserSession: vi.fn(),
  logoutUser: vi.fn(),
}));

const user = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  name: 'Leonardo',
  email: 'leonardo@example.com',
  phone: '44999999999',
  role: 'customer',
  address: { street: 'Rua A', number: '12B', city: 'Maringá', state: 'PR', neighborhood: 'Centro' },
} as const;

const accessToken = 'access-token';
const refreshToken = 'refresh-token';
const metadata = { userAgent: 'test-browser', ipAddress: '127.0.0.1' };

const createResponse = () => {
  let resolveResponse!: () => void;
  const responseEnded = new Promise<void>((resolve) => {
    resolveResponse = resolve;
  });
  const res = {
    writeHead: vi.fn(),
    end: vi.fn(() => resolveResponse()),
  } as unknown as ServerResponse;

  return { res, responseEnded };
};

const sendBody = async (
  body: string,
  controller: (req: IncomingMessage, res: ServerResponse) => unknown = authController,
) => {
  const req = Object.assign(new EventEmitter(), {
    headers: { 'user-agent': metadata.userAgent },
    socket: { remoteAddress: metadata.ipAddress },
  }) as IncomingMessage;
  const { res, responseEnded } = createResponse();
  controller(req, res);
  req.emit('data', Buffer.from(body));
  req.emit('end');
  await responseEnded;
  return res;
};

const expectJson = (res: ServerResponse, status: number, body: unknown) => {
  expect(res.writeHead).toHaveBeenCalledWith(status, { 'Content-Type': 'application/json' });
  expect(res.end).toHaveBeenCalledWith(JSON.stringify(body));
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authService.loginUser).mockResolvedValue({ user, accessToken, refreshToken });
  vi.mocked(authService.refreshUserSession).mockResolvedValue({ accessToken, refreshToken });
  vi.mocked(authService.logoutUser).mockResolvedValue();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('authController', () => {
  describe('success', () => {
    it('returns 200 with user and tokens on successful login', async () => {
      const payload = { identifier: 'leonardo@example.com', password: 'senha-segura-123' };
      const res = await sendBody(JSON.stringify(payload));
      expect(authService.loginUser).toHaveBeenCalledWith(
        'leonardo@example.com',
        'senha-segura-123',
        metadata,
      );
      expectJson(res, 200, {
        success: true,
        data: {
          user,
          accessToken,
          refreshToken,
        },
      });
    });

    it('accepts identifier as email', async () => {
      const res = await sendBody(
        JSON.stringify({ identifier: 'test@example.com', password: 'pass' }),
      );
      expect(authService.loginUser).toHaveBeenCalledWith('test@example.com', 'pass', metadata);
      expectJson(res, 200, {
        success: true,
        data: { user, accessToken, refreshToken },
      });
    });

    it('accepts identifier as phone number', async () => {
      const res = await sendBody(JSON.stringify({ identifier: '44999999999', password: 'pass' }));
      expect(authService.loginUser).toHaveBeenCalledWith('44999999999', 'pass', metadata);
      expectJson(res, 200, {
        success: true,
        data: { user, accessToken, refreshToken },
      });
    });
  });

  describe('invalid JSON', () => {
    it('returns 400 on malformed JSON', async () => {
      const res = await sendBody('{ invalid json');
      expectJson(res, 400, { error: 'Invalid JSON' });
      expect(authService.loginUser).not.toHaveBeenCalled();
    });

    it('returns 500 on other JSON parsing errors', async () => {
      const req = new EventEmitter() as IncomingMessage;
      const { res, responseEnded } = createResponse();
      authController(req, res);
      // Simulate an error other than InvalidJsonBodyError
      req.emit('error', new Error('unexpected error'));
      req.emit('end');
      await responseEnded;
      expectJson(res, 500, { error: 'Internal Server Error' });
    });
  });

  describe('invalid request body', () => {
    it.each([
      [null],
      [{}],
      [{ identifier: 'test@example.com' }],
      [{ password: 'senha123' }],
      [{ identifier: 123, password: 'senha123' }],
      [{ identifier: 'test@example.com', password: 123 }],
      [{ identifier: '', password: 'senha123' }],
      [{ identifier: '   ', password: 'senha123' }],
      [{ identifier: 'test@example.com', password: '' }],
    ])('returns 400 for %s', async (body) => {
      const res = await sendBody(JSON.stringify(body));
      expectJson(res, 400, { error: 'Invalid request body' });
      expect(authService.loginUser).not.toHaveBeenCalled();
    });

    it('returns 400 when body is a string instead of object', async () => {
      const res = await sendBody(JSON.stringify('not an object'));
      expectJson(res, 400, { error: 'Invalid request body' });
      expect(authService.loginUser).not.toHaveBeenCalled();
    });

    it('returns 400 when body is an array', async () => {
      const res = await sendBody(JSON.stringify(['identifier', 'password']));
      expectJson(res, 400, { error: 'Invalid request body' });
      expect(authService.loginUser).not.toHaveBeenCalled();
    });

    it('ignores unknown properties in the request body', async () => {
      const payload = {
        identifier: 'leonardo@example.com',
        password: 'senha-segura-123',
        unknownField: 'should be ignored',
      };
      const res = await sendBody(JSON.stringify(payload));
      expect(authService.loginUser).toHaveBeenCalledWith(
        'leonardo@example.com',
        'senha-segura-123',
        metadata,
      );
      expectJson(res, 200, {
        success: true,
        data: { user, accessToken, refreshToken },
      });
    });

    describe.each([
      ['refresh', refreshTokenController, authService.refreshUserSession],
      ['logout', logoutController, authService.logoutUser],
    ] as const)('%s controller', (action, controller, service) => {
      it('rejects invalid tokens and malformed JSON', async () => {
        for (const body of [null, {}, { refreshToken: '' }, { refreshToken: 1 }]) {
          const res = await sendBody(JSON.stringify(body), controller);
          expectJson(res, 400, { error: 'Invalid request body' });
        }
        expectJson(await sendBody('{', controller), 400, { error: 'Invalid JSON' });
        expect(service).not.toHaveBeenCalled();
      });

      it('calls the service and returns the result', async () => {
        const res = await sendBody(JSON.stringify({ refreshToken }), controller);
        expect(service).toHaveBeenCalledWith(refreshToken);
        expectJson(
          res,
          200,
          action === 'refresh'
            ? { success: true, data: { accessToken, refreshToken } }
            : { success: true, message: 'Session revoked' },
        );
      });

      it('returns 500 on unexpected service errors', async () => {
        vi.mocked(service).mockRejectedValueOnce(new Error('database error'));
        const res = await sendBody(JSON.stringify({ refreshToken }), controller);
        expectJson(res, 500, { error: 'Internal Server Error' });
      });
    });

    it('returns 401 for an invalid refresh token', async () => {
      vi.mocked(authService.refreshUserSession).mockRejectedValueOnce(
        new InvalidCredentialsError(),
      );
      const res = await sendBody(JSON.stringify({ refreshToken }), refreshTokenController);
      expectJson(res, 401, { error: 'Invalid refresh token' });
    });
  });

  describe('authentication errors', () => {
    it('returns 401 on InvalidCredentialsError', async () => {
      vi.mocked(authService.loginUser).mockRejectedValueOnce(new InvalidCredentialsError());
      const res = await sendBody(
        JSON.stringify({ identifier: 'test@example.com', password: 'wrong' }),
      );
      expectJson(res, 401, { error: 'Invalid credentials' });
    });

    it('returns 500 on unexpected errors', async () => {
      vi.mocked(authService.loginUser).mockRejectedValueOnce(new Error('database error'));
      const res = await sendBody(
        JSON.stringify({ identifier: 'test@example.com', password: 'pass' }),
      );
      expectJson(res, 500, { error: 'Internal Server Error' });
    });
  });
});
