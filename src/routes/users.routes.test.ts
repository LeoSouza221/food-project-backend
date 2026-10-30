import type { IncomingMessage, ServerResponse } from 'node:http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createUserController,
  deleteUserController,
  getUserByIdController,
  listUsersController,
  updateUserController,
} from '../controllers/user.controller.js';
import { usersRoutes } from './users.routes.js';

vi.mock('../controllers/user.controller.js', () => ({
  createUserController: vi.fn(),
  deleteUserController: vi.fn(),
  getUserByIdController: vi.fn(),
  listUsersController: vi.fn(),
  updateUserController: vi.fn(),
}));

const createRequest = (method: string) => ({ method }) as IncomingMessage;
const createResponse = () =>
  ({
    writeHead: vi.fn(),
    end: vi.fn(),
  }) as unknown as ServerResponse;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('usersRoutes', () => {
  it('dispatches GET /users to the list controller', () => {
    const res = createResponse();
    usersRoutes(createRequest('GET'), res, ['users']);
    expect(listUsersController).toHaveBeenCalledWith(res);
  });

  it('dispatches GET /users/:id to the detail controller', () => {
    const res = createResponse();
    usersRoutes(createRequest('GET'), res, ['users', 'abc']);
    expect(getUserByIdController).toHaveBeenCalledWith(res, 'abc');
  });

  it('dispatches POST /users to the create controller', () => {
    const req = createRequest('POST');
    const res = createResponse();
    usersRoutes(req, res, ['users']);
    expect(createUserController).toHaveBeenCalledWith(req, res);
  });

  it('dispatches PATCH /users/:id to the update controller', () => {
    const req = createRequest('PATCH');
    const res = createResponse();
    usersRoutes(req, res, ['users', 'abc']);
    expect(updateUserController).toHaveBeenCalledWith(req, res, 'abc');
  });

  it('dispatches DELETE /users/:id to the delete controller', () => {
    const res = createResponse();
    usersRoutes(createRequest('DELETE'), res, ['users', 'abc']);
    expect(deleteUserController).toHaveBeenCalledWith(res, 'abc');
  });

  it.each([
    ['POST', ['users', 'abc']],
    ['GET', ['users', 'abc', 'x']],
    ['PATCH', ['users']],
    ['DELETE', ['users']],
  ])('returns 400 for %s %j', (method, segments) => {
    const res = createResponse();
    usersRoutes(createRequest(method), res, segments);
    expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Bad Request' }));
  });

  it('returns 405 for unsupported methods', () => {
    const res = createResponse();
    usersRoutes(createRequest('PUT'), res, ['users']);
    expect(res.writeHead).toHaveBeenCalledWith(405, {
      'Content-Type': 'application/json',
      Allow: 'GET, POST, PATCH, DELETE',
    });
  });
});
