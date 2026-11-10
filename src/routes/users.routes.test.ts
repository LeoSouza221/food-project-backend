import type { IncomingMessage, ServerResponse } from 'node:http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createUserController,
  deleteUserController,
  getUserByIdController,
  listUsersController,
  updateUserController,
} from '../controllers/user.controller.js';
import { verifyJWT } from '../services/jwt.js';
import { usersRoutes } from './users.routes.js';

vi.mock('../controllers/user.controller.js', () => ({
  createUserController: vi.fn(),
  deleteUserController: vi.fn(),
  getUserByIdController: vi.fn(),
  listUsersController: vi.fn(),
  updateUserController: vi.fn(),
}));

vi.mock('../services/jwt.js', () => ({ verifyJWT: vi.fn() }));

const createRequest = (method: string, authorization?: string) =>
  ({ method, headers: authorization ? { authorization } : {} }) as IncomingMessage;
const createResponse = () =>
  ({
    writeHead: vi.fn(),
    end: vi.fn(),
  }) as unknown as ServerResponse;

const expectNoControllerCalls = () => {
  expect(createUserController).not.toHaveBeenCalled();
  expect(deleteUserController).not.toHaveBeenCalled();
  expect(getUserByIdController).not.toHaveBeenCalled();
  expect(listUsersController).not.toHaveBeenCalled();
  expect(updateUserController).not.toHaveBeenCalled();
};

const expectError = (res: ServerResponse, status: number, error: string) => {
  expect(res.writeHead).toHaveBeenCalledOnce();
  expect(res.writeHead).toHaveBeenCalledWith(status, { 'Content-Type': 'application/json' });
  expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error }));
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(verifyJWT).mockReset();
  vi.mocked(verifyJWT).mockResolvedValue({ sub: 'user-id', role: 'customer' });
});

describe('usersRoutes', () => {
  it('dispatches public POST /users without authentication', async () => {
    const req = createRequest('POST');
    const res = createResponse();

    await usersRoutes(req, res, ['users']);

    expect(verifyJWT).not.toHaveBeenCalled();
    expect(createUserController).toHaveBeenCalledOnce();
    expect(createUserController).toHaveBeenCalledWith(req, res);
  });

  it('dispatches GET /users for an admin', async () => {
    const req = createRequest('GET', 'Bearer test-token');
    const res = createResponse();
    vi.mocked(verifyJWT).mockResolvedValueOnce({ sub: 'admin-id', role: 'admin' });

    await usersRoutes(req, res, ['users']);

    expect(verifyJWT).toHaveBeenCalledWith('test-token');
    expect(req).toHaveProperty('auth', { userId: 'admin-id', role: 'admin' });
    expect(listUsersController).toHaveBeenCalledOnce();
    expect(listUsersController).toHaveBeenCalledWith(res);
  });

  it.each(['customer', 'admin'] as const)(
    'dispatches GET /users/me with the authenticated %s id',
    async (role) => {
      const req = createRequest('GET', 'Bearer test-token');
      const res = createResponse();
      vi.mocked(verifyJWT).mockResolvedValueOnce({ sub: 'user-id', role });

      await usersRoutes(req, res, ['users', 'me']);

      expect(req).toHaveProperty('auth', { userId: 'user-id', role });
      expect(getUserByIdController).toHaveBeenCalledOnce();
      expect(getUserByIdController).toHaveBeenCalledWith(res, 'user-id');
    },
  );

  it.each([
    ['customer', 'user-id'],
    ['admin', 'other-id'],
  ] as const)('dispatches GET /users/:id for %s accessing %s', async (role, targetId) => {
    const req = createRequest('GET', 'Bearer test-token');
    const res = createResponse();
    vi.mocked(verifyJWT).mockResolvedValueOnce({ sub: 'user-id', role });

    await usersRoutes(req, res, ['users', targetId]);

    expect(req).toHaveProperty('auth', { userId: 'user-id', role });
    expect(getUserByIdController).toHaveBeenCalledOnce();
    expect(getUserByIdController).toHaveBeenCalledWith(res, targetId);
  });

  it.each([
    ['customer', 'user-id'],
    ['admin', 'other-id'],
  ] as const)('dispatches PATCH /users/:id for %s accessing %s', async (role, targetId) => {
    const req = createRequest('PATCH', 'Bearer test-token');
    const res = createResponse();
    vi.mocked(verifyJWT).mockResolvedValueOnce({ sub: 'user-id', role });

    await usersRoutes(req, res, ['users', targetId]);

    expect(req).toHaveProperty('auth', { userId: 'user-id', role });
    expect(updateUserController).toHaveBeenCalledOnce();
    expect(updateUserController).toHaveBeenCalledWith(req, res, targetId);
  });

  it('dispatches DELETE /users/:id for an admin', async () => {
    const req = createRequest('DELETE', 'Bearer test-token');
    const res = createResponse();
    vi.mocked(verifyJWT).mockResolvedValueOnce({ sub: 'admin-id', role: 'admin' });

    await usersRoutes(req, res, ['users', 'other-id']);

    expect(req).toHaveProperty('auth', { userId: 'admin-id', role: 'admin' });
    expect(deleteUserController).toHaveBeenCalledOnce();
    expect(deleteUserController).toHaveBeenCalledWith(res, 'other-id');
  });

  it.each([
    ['GET', ['users']],
    ['GET', ['users', 'me']],
    ['GET', ['users', 'user-id']],
    ['PATCH', ['users', 'user-id']],
    ['DELETE', ['users', 'user-id']],
  ])('returns 401 for unauthenticated %s %j', async (method, segments) => {
    const res = createResponse();

    await usersRoutes(createRequest(method), res, segments);

    expect(verifyJWT).not.toHaveBeenCalled();
    expectError(res, 401, 'Unauthorized');
    expectNoControllerCalls();
  });

  it.each([
    ['GET', ['users']],
    ['GET', ['users', 'me']],
    ['GET', ['users', 'user-id']],
    ['PATCH', ['users', 'user-id']],
    ['DELETE', ['users', 'user-id']],
  ])('returns 401 for an invalid token on %s %j', async (method, segments) => {
    const res = createResponse();
    vi.mocked(verifyJWT).mockRejectedValueOnce(new Error('Invalid token'));

    await usersRoutes(createRequest(method, 'Bearer invalid-token'), res, segments);

    expect(verifyJWT).toHaveBeenCalledWith('invalid-token');
    expectError(res, 401, 'Unauthorized');
    expectNoControllerCalls();
  });

  it.each([
    ['GET', ['users']],
    ['DELETE', ['users', 'user-id']],
    ['GET', ['users', 'other-id']],
    ['PATCH', ['users', 'other-id']],
  ])('returns 403 for a customer on %s %j', async (method, segments) => {
    const req = createRequest(method, 'Bearer test-token');
    const res = createResponse();

    await usersRoutes(req, res, segments);

    expect(req).toHaveProperty('auth', { userId: 'user-id', role: 'customer' });
    expectError(res, 403, 'Forbidden');
    expectNoControllerCalls();
  });

  it.each([
    ['POST', ['users', 'user-id']],
    ['GET', ['users', 'user-id', 'extra']],
    ['GET', ['users', '']],
    ['PATCH', ['users']],
    ['PATCH', ['users', '']],
    ['PATCH', ['users', 'user-id', 'extra']],
    ['DELETE', ['users']],
    ['DELETE', ['users', '']],
    ['DELETE', ['users', 'user-id', 'extra']],
  ])('returns 400 before authentication for %s %j', async (method, segments) => {
    const res = createResponse();

    await usersRoutes(createRequest(method), res, segments);

    expectError(res, 400, 'Bad Request');
    expect(verifyJWT).not.toHaveBeenCalled();
    expectNoControllerCalls();
  });

  it('returns 405 for unsupported methods', async () => {
    const res = createResponse();

    await usersRoutes(createRequest('PUT'), res, ['users']);

    expect(res.writeHead).toHaveBeenCalledWith(405, {
      'Content-Type': 'application/json',
      Allow: 'GET, POST, PATCH, DELETE',
    });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Method Not Allowed' }));
    expect(verifyJWT).not.toHaveBeenCalled();
    expectNoControllerCalls();
  });

  it('allows an admin to access their own profile by id', async () => {
    const req = createRequest('GET', 'Bearer test-token');
    const res = createResponse();

    vi.mocked(verifyJWT).mockResolvedValueOnce({
      sub: 'admin-id',
      role: 'admin',
    });

    await usersRoutes(req, res, ['users', 'admin-id']);

    expect(getUserByIdController).toHaveBeenCalledWith(res, 'admin-id');
  });

  it('allows to change their own profile by an admin', async () => {
    const req = createRequest('PATCH', 'Bearer test-token');
    const res = createResponse();

    vi.mocked(verifyJWT).mockResolvedValueOnce({
      sub: 'admin-id',
      role: 'admin',
    });

    await usersRoutes(req, res, ['users', 'admin-id']);

    expect(updateUserController).toHaveBeenCalledWith(req, res, 'admin-id');
  });
});
