import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createUserController,
  deleteUserController,
  getUserByIdController,
  listUsersController,
  updateUserController,
} from './user.controller.js';
import * as userService from '../services/user.service.js';

vi.mock('../services/user.service.js', () => ({
  createUser: vi.fn(),
  getUsers: vi.fn(),
  getUserById: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
}));

const id = '123e4567-e89b-42d3-a456-426614174000';
const user = {
  id,
  name: 'Leonardo',
  phone: '44999999999',
  address: { street: 'Rua A', number: '12B', city: 'Maringá', state: 'PR', neighborhood: 'Centro' },
} as const;

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
  controller: (req: IncomingMessage, res: ServerResponse) => unknown,
  body: string,
) => {
  const req = new EventEmitter() as IncomingMessage;
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
  vi.mocked(userService.createUser).mockResolvedValue(user);
  vi.mocked(userService.getUsers).mockResolvedValue([user]);
  vi.mocked(userService.getUserById).mockResolvedValue(user);
  vi.mocked(userService.updateUser).mockResolvedValue(user);
  vi.mocked(userService.deleteUser).mockResolvedValue();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('listUsersController', () => {
  it('returns all users', async () => {
    const { res } = createResponse();
    await listUsersController(res);
    expectJson(res, 200, { users: [user] });
  });

  it('returns 500 on failure', async () => {
    vi.mocked(userService.getUsers).mockRejectedValue(new Error('db'));
    const { res } = createResponse();
    await listUsersController(res);
    expectJson(res, 500, { error: 'Internal Server Error' });
  });
});

describe('getUserByIdController', () => {
  it('returns the user', async () => {
    const { res } = createResponse();
    await getUserByIdController(res, id);
    expectJson(res, 200, { user });
  });

  it('rejects an empty or invalid ID', async () => {
    const empty = createResponse();
    await getUserByIdController(empty.res, '');
    expectJson(empty.res, 400, { error: 'User ID is required' });

    const invalid = createResponse();
    await getUserByIdController(invalid.res, 'abc');
    expectJson(invalid.res, 400, { error: 'Invalid user ID' });
    expect(userService.getUserById).not.toHaveBeenCalled();
  });

  it('returns 404 when not found', async () => {
    vi.mocked(userService.getUserById).mockRejectedValue(new Error('User not found.'));
    const { res } = createResponse();
    await getUserByIdController(res, id);
    expectJson(res, 404, { error: 'User not found' });
  });

  it('returns 500 on unexpected errors', async () => {
    vi.mocked(userService.getUserById).mockRejectedValue(new Error('db'));
    const { res } = createResponse();
    await getUserByIdController(res, id);
    expectJson(res, 500, { error: 'Internal Server Error' });
  });
});

describe('createUserController', () => {
  it('creates a user', async () => {
    const res = await sendBody(createUserController, JSON.stringify(user));
    expect(userService.createUser).toHaveBeenCalledWith(user);
    expectJson(res, 201, { message: 'User created', user });
  });

  it('returns 400 on invalid JSON', async () => {
    const res = await sendBody(createUserController, '{ nope');
    expectJson(res, 400, { error: 'Invalid JSON' });
  });

  it('returns 400 on invalid data', async () => {
    vi.mocked(userService.createUser).mockRejectedValue(new Error('Invalid user data'));
    const res = await sendBody(createUserController, '{}');
    expectJson(res, 400, { error: 'Invalid user data' });
  });

  it('returns 500 on unexpected errors', async () => {
    vi.mocked(userService.createUser).mockRejectedValue(new Error('db'));
    const res = await sendBody(createUserController, '{}');
    expectJson(res, 500, { error: 'Internal Server Error' });
  });
});

describe('updateUserController', () => {
  const update = (body: string, userId = id) =>
    sendBody((req, res) => updateUserController(req, res, userId), body);

  it('updates a user', async () => {
    const res = await update('{"name":"Leonardo"}');
    expect(userService.updateUser).toHaveBeenCalledWith(id, { name: 'Leonardo' });
    expectJson(res, 200, { message: 'User updated', user });
  });

  it('rejects an invalid ID', async () => {
    const { res } = createResponse();
    await updateUserController({} as IncomingMessage, res, 'abc');
    expectJson(res, 400, { error: 'Invalid user ID' });
  });

  it('returns 400 on invalid JSON', async () => {
    expectJson(await update('{ nope'), 400, { error: 'Invalid JSON' });
  });

  it('returns 400 on invalid update data', async () => {
    vi.mocked(userService.updateUser).mockRejectedValue(new Error('Invalid user update data'));
    expectJson(await update('{}'), 400, { error: 'Invalid user data or update failed' });
  });

  it('returns 404 when not found', async () => {
    vi.mocked(userService.updateUser).mockRejectedValue(new Error('User not found.'));
    expectJson(await update('{"name":"A"}'), 404, { error: 'User not found' });
  });

  it('returns 500 on unexpected errors', async () => {
    vi.mocked(userService.updateUser).mockRejectedValue(new Error('db'));
    expectJson(await update('{"name":"A"}'), 500, { error: 'Internal Server Error' });
  });
});

describe('deleteUserController', () => {
  it('deletes a user', async () => {
    const { res } = createResponse();
    await deleteUserController(res, id);
    expectJson(res, 200, { message: 'User deleted' });
  });

  it('rejects an invalid ID', async () => {
    const { res } = createResponse();
    await deleteUserController(res, 'abc');
    expectJson(res, 400, { error: 'Invalid user ID' });
  });

  it('returns 404 when not found', async () => {
    vi.mocked(userService.deleteUser).mockRejectedValue(new Error('User not found.'));
    const { res } = createResponse();
    await deleteUserController(res, id);
    expectJson(res, 404, { error: 'User not found' });
  });

  it('returns 500 on unexpected errors', async () => {
    vi.mocked(userService.deleteUser).mockRejectedValue(new Error('db'));
    const { res } = createResponse();
    await deleteUserController(res, id);
    expectJson(res, 500, { error: 'Internal Server Error' });
  });
});
