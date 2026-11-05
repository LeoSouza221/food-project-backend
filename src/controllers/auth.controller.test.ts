import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authController } from './auth.controller.js';
import * as authService from '../services/auth.service.js';
import { InvalidCredentialsError } from '../errors/auth.errors.js';

vi.mock('../services/auth.service.js', () => ({
  loginUser: vi.fn(),
}));

const user = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  name: 'Leonardo',
  email: 'leonardo@example.com',
  phone: '44999999999',
  role: 'customer',
  address: { street: 'Rua A', number: '12B', city: 'Maringá', state: 'PR', neighborhood: 'Centro' },
} as const;

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';

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

const sendBody = async (body: string) => {
  const req = new EventEmitter() as IncomingMessage;
  const { res, responseEnded } = createResponse();
  authController(req, res);
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
  vi.mocked(authService.loginUser).mockResolvedValue({ user, token });
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('authController', () => {
  describe('success', () => {
    it('returns 200 with user and token on successful login', async () => {
      const payload = { identifier: 'leonardo@example.com', password: 'senha-segura-123' };
      const res = await sendBody(JSON.stringify(payload));
      expect(authService.loginUser).toHaveBeenCalledWith(
        'leonardo@example.com',
        'senha-segura-123',
      );
      expectJson(res, 200, {
        success: true,
        data: {
          user,
          token,
        },
      });
    });

    it('accepts identifier as email', async () => {
      const res = await sendBody(
        JSON.stringify({ identifier: 'test@example.com', password: 'pass' }),
      );
      expect(authService.loginUser).toHaveBeenCalledWith('test@example.com', 'pass');
      expectJson(res, 200, {
        success: true,
        data: { user, token },
      });
    });

    it('accepts identifier as phone number', async () => {
      const res = await sendBody(JSON.stringify({ identifier: '44999999999', password: 'pass' }));
      expect(authService.loginUser).toHaveBeenCalledWith('44999999999', 'pass');
      expectJson(res, 200, {
        success: true,
        data: { user, token },
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
      [null, 'null body'],
      [{}, 'missing identifier and password'],
      [{ identifier: 'test@example.com' }, 'missing password'],
      [{ password: 'senha123' }, 'missing identifier'],
      [{ identifier: 123, password: 'senha123' }, 'non-string identifier'],
      [{ identifier: 'test@example.com', password: 123 }, 'non-string password'],
      [{ identifier: '', password: 'senha123' }, 'empty identifier string'],
      [{ identifier: '   ', password: 'senha123' }, 'whitespace-only identifier'],
      [{ identifier: 'test@example.com', password: '' }, 'empty password string'],
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
      );
      expectJson(res, 200, {
        success: true,
        data: { user, token },
      });
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
