import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authRoutes } from './auth.routes.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  authController,
  logoutController,
  refreshTokenController,
} from '../controllers/auth.controller.js';

vi.mock('../controllers/auth.controller.js', () => ({
  authController: vi.fn(),
  refreshTokenController: vi.fn(),
  logoutController: vi.fn(),
}));

const createRequest = (method: string) =>
  ({ method, socket: { remoteAddress: '127.0.0.1' } }) as IncomingMessage;
const createResponse = () =>
  ({
    writeHead: vi.fn(),
    end: vi.fn(),
    setHeader: vi.fn(),
  }) as unknown as ServerResponse;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('authRoutes', () => {
  it('should return 405 for unsupported methods', () => {
    const req = createRequest('GET');
    const res = createResponse();
    const segments = ['auth', 'login'];
    authRoutes(req, res, segments);
    expect(res.writeHead).toHaveBeenCalledWith(405, {
      Allow: 'POST',
      'Content-Type': 'application/json',
    });
    expect(res.end).toHaveBeenCalled();
  });
  it('should call authController for POST /auth/login', () => {
    const req = createRequest('POST');
    const res = createResponse();

    const segments = ['auth', 'login'];
    authRoutes(req, res, segments);

    expect(authController).toHaveBeenCalledOnce();
    expect(authController).toHaveBeenCalledWith(req, res);
  });
  it('should return 404 for unknown routes', () => {
    const req = createRequest('POST');
    const res = createResponse();
    const segments = ['unknown', 'unknown'];
    authRoutes(req, res, segments);
    expect(res.writeHead).toHaveBeenCalledWith(404, {
      'Content-Type': 'application/json',
    });
    expect(res.end).toHaveBeenCalled();
  });
  it.each([
    ['refresh', refreshTokenController],
    ['logout', logoutController],
  ])('dispatches POST /auth/%s', (action, controller) => {
    const req = createRequest('POST');
    const res = createResponse();
    authRoutes(req, res, ['auth', action]);
    expect(controller).toHaveBeenCalledOnce();
    expect(controller).toHaveBeenCalledWith(req, res);
  });
  it.each(['refresh', 'logout'])('rejects unsupported methods for /auth/%s', (action) => {
    const res = createResponse();
    authRoutes(createRequest('GET'), res, ['auth', action]);
    expect(res.writeHead).toHaveBeenCalledWith(405, {
      Allow: 'POST',
      'Content-Type': 'application/json',
    });
    expect(refreshTokenController).not.toHaveBeenCalled();
    expect(logoutController).not.toHaveBeenCalled();
  });
  it('should return 429 for too many requests', () => {
    const req = createRequest('POST');
    const res = createResponse();
    const segments = ['auth', 'login'];
    // Simulate rate limiting by calling the route multiple times
    for (let i = 0; i < 10; i++) {
      authRoutes(req, res, segments);
    }

    expect(res.end).toHaveBeenCalledWith('Too Many Requests');
    expect(res.statusCode).toBe(429);
  });
});
