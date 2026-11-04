import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  saveUserRepository,
  getUsersRepository,
  getUserByIdRepository,
  updateUserRepository,
  deleteUserRepository,
  findUserByIdentifierRepository,
} from './users.repository.js';
import { pool } from '../database/pool.js';
import {
  EmailAlreadyInUseError,
  PhoneAlreadyInUseError,
  UserNotFoundError,
} from '../errors/user.errors.js';

vi.mock('../database/pool.js', () => ({
  pool: { query: vi.fn() },
}));
const mockQuery = vi.mocked(pool.query) as unknown as ReturnType<typeof vi.fn>;

const id = '123e4567-e89b-42d3-a456-426614174000';
const row = {
  id,
  name: 'Leonardo',
  email: 'leonardo@example.com',
  phone: '44999999999',
  password_hash: 'scrypt$salt$hash',
  role: 'customer',
  address_street: 'Rua A',
  address_number: '12B',
  address_city: 'Maringá',
  address_state: 'PR',
  address_neighborhood: 'Centro',
  created_at: new Date().toISOString(),
};
const user = {
  id,
  name: 'Leonardo',
  email: 'leonardo@example.com',
  phone: '44999999999',
  role: 'customer',
  address: {
    street: 'Rua A',
    number: '12B',
    city: 'Maringá',
    state: 'PR',
    neighborhood: 'Centro',
  },
};
const input = {
  name: user.name,
  email: user.email,
  phone: user.phone,
  passwordHash: 'scrypt$salt$hash',
  address: { ...user.address, state: 'PR' as const },
};

beforeEach(() => {
  mockQuery.mockResolvedValue({ rows: [row], rowCount: 1 });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('saveUserRepository', () => {
  it('saves a user, maps the address and never returns the hash', async () => {
    const saved = await saveUserRepository(input);
    expect(saved).toEqual(user);
    expect(saved).not.toHaveProperty('password_hash');
    expect(saved).not.toHaveProperty('passwordHash');
    expect(mockQuery.mock.calls[0]?.[0]).not.toMatch(/RETURNING[^;]*password_hash/);
    expect(mockQuery.mock.calls[0]?.[1]).toEqual([
      'Leonardo',
      'leonardo@example.com',
      '44999999999',
      'scrypt$salt$hash',
      'Rua A',
      '12B',
      'Maringá',
      'PR',
      'Centro',
    ]);
  });

  it.each([
    ['users_email_key', EmailAlreadyInUseError],
    ['users_phone_key', PhoneAlreadyInUseError],
  ])('translates a %s violation', async (constraint, ErrorClass) => {
    mockQuery.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: '23505', constraint }));
    await expect(saveUserRepository(input)).rejects.toThrow(ErrorClass);
  });

  it('rethrows other database errors untouched', async () => {
    const error = new Error('db');
    mockQuery.mockRejectedValueOnce(error);
    await expect(saveUserRepository(input)).rejects.toBe(error);
  });

  it('throws when nothing is returned', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(saveUserRepository(input)).rejects.toThrow(
      'It was not possible to save the user.',
    );
  });
});

describe('getUsersRepository', () => {
  it('returns all users', async () => {
    await expect(getUsersRepository()).resolves.toEqual([user]);
  });

  it('returns an empty array when there are no users', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(getUsersRepository()).resolves.toEqual([]);
  });
});

describe('getUserByIdRepository', () => {
  it('returns the user', async () => {
    await expect(getUserByIdRepository(id)).resolves.toEqual(user);
    expect(mockQuery.mock.calls[0]?.[1]).toEqual([id]);
  });

  it('throws when the user does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(getUserByIdRepository(id)).rejects.toThrow(UserNotFoundError);
  });
});

describe('updateUserRepository', () => {
  it('updates only the provided fields', async () => {
    await expect(updateUserRepository(id, { name: 'Leonardo' })).resolves.toEqual(user);
    expect(mockQuery.mock.calls[0]?.[1]).toEqual([
      'Leonardo',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      id,
    ]);
  });

  it('translates unique violations on update', async () => {
    mockQuery.mockRejectedValueOnce(
      Object.assign(new Error('dup'), { code: '23505', constraint: 'users_email_key' }),
    );
    await expect(updateUserRepository(id, { email: 'a@a.com' })).rejects.toThrow(
      EmailAlreadyInUseError,
    );
  });

  it('throws when the user does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(updateUserRepository(id, { name: 'X' })).rejects.toThrow(UserNotFoundError);
  });
});

describe('deleteUserRepository', () => {
  it('deletes the user', async () => {
    await expect(deleteUserRepository(id)).resolves.toBeUndefined();
  });

  it('throws when the user does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(deleteUserRepository(id)).rejects.toThrow(UserNotFoundError);
  });
});

describe('findUserByIdentifierRepository', () => {
  it('returns the user with password hash', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          ...row,
          password_hash: 'hashed',
        },
      ],
      rowCount: 1,
    });
    await expect(findUserByIdentifierRepository('a@a.com')).resolves.toEqual({
      user,
      passwordHash: 'hashed',
    });
  });

  it('throws when the user does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(findUserByIdentifierRepository('a@a.com')).rejects.toThrow(UserNotFoundError);
  });
});
