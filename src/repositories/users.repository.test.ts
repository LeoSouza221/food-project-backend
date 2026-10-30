import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  saveUserRepository,
  getUsersRepository,
  getUserByIdRepository,
  updateUserRepository,
  deleteUserRepository,
} from './users.repository.js';
import { pool } from '../database/pool.js';

vi.mock('../database/pool.js', () => ({
  pool: { query: vi.fn() },
}));
const mockQuery = vi.mocked(pool.query) as unknown as ReturnType<typeof vi.fn>;

const id = '123e4567-e89b-42d3-a456-426614174000';
const row = {
  id,
  name: 'Leonardo',
  phone: '44999999999',
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
  phone: '44999999999',
  address: {
    street: 'Rua A',
    number: '12B',
    city: 'Maringá',
    state: 'PR',
    neighborhood: 'Centro',
  },
};
const input = { name: user.name, phone: user.phone, address: user.address };

beforeEach(() => {
  mockQuery.mockResolvedValue({ rows: [row], rowCount: 1 });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('saveUserRepository', () => {
  it('saves a user and maps the address', async () => {
    await expect(saveUserRepository(input as never)).resolves.toEqual(user);
    expect(mockQuery.mock.calls[0]?.[1]).toEqual([
      'Leonardo',
      '44999999999',
      'Rua A',
      '12B',
      'Maringá',
      'PR',
      'Centro',
    ]);
  });

  it('throws when nothing is returned', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(saveUserRepository(input as never)).rejects.toThrow(
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
    await expect(getUserByIdRepository(id)).rejects.toThrow('User not found.');
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
      id,
    ]);
  });

  it('throws when the user does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(updateUserRepository(id, { name: 'X' })).rejects.toThrow('User not found.');
  });
});

describe('deleteUserRepository', () => {
  it('deletes the user', async () => {
    await expect(deleteUserRepository(id)).resolves.toBeUndefined();
  });

  it('throws when the user does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(deleteUserRepository(id)).rejects.toThrow('User not found.');
  });
});
