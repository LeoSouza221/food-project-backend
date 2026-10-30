import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createUser,
  deleteUser,
  getUserById,
  getUsers,
  isValidState,
  updateUser,
  validateUser,
} from './user.service.js';
import * as usersRepository from '../repositories/users.repository.js';
import { BRAZILIAN_STATES } from '../types/user.js';

vi.mock('../repositories/users.repository.js', () => ({
  saveUserRepository: vi.fn(),
  getUsersRepository: vi.fn(),
  getUserByIdRepository: vi.fn(),
  updateUserRepository: vi.fn(),
  deleteUserRepository: vi.fn(),
}));

const address = {
  street: 'Rua A',
  number: '12B',
  city: 'Maringá',
  state: 'PR',
  neighborhood: 'Centro',
};
const validUser = { name: 'Leonardo', phone: '44999999999', address };
const id = '123e4567-e89b-42d3-a456-426614174000';

afterEach(() => {
  vi.clearAllMocks();
});

describe('isValidState', () => {
  it('accepts all 27 Brazilian states', () => {
    expect(BRAZILIAN_STATES).toHaveLength(27);
    BRAZILIAN_STATES.forEach((state) => expect(isValidState(state)).toBe(true));
  });

  it.each(['XX', 'pr', 'Paraná', '', 'P', 1, null, undefined])('rejects %s', (state) => {
    expect(isValidState(state)).toBe(false);
  });
});

describe('validateUser', () => {
  it('accepts valid data with 10 or 11 digit phones', () => {
    expect(validateUser(validUser)).toBe(true);
    expect(validateUser({ ...validUser, phone: '4433334444' })).toBe(true);
  });

  it.each([
    ['null', null],
    ['array', []],
    ['missing name', { phone: validUser.phone, address }],
    ['blank name', { ...validUser, name: ' ' }],
    ['long name', { ...validUser, name: 'a'.repeat(101) }],
    ['missing phone', { name: 'A', address }],
    ['phone with symbols', { ...validUser, phone: '(44) 99999-9999' }],
    ['short phone', { ...validUser, phone: '449999999' }],
    ['long phone', { ...validUser, phone: '449999999999' }],
    ['numeric phone', { ...validUser, phone: 44999999999 }],
    ['missing address', { name: 'A', phone: validUser.phone }],
    ['address not object', { ...validUser, address: 'Rua A' }],
    ['invalid state', { ...validUser, address: { ...address, state: 'XX' } }],
    ['blank street', { ...validUser, address: { ...address, street: ' ' } }],
    ['numeric number', { ...validUser, address: { ...address, number: 12 } }],
    ['missing city', { ...validUser, address: { ...address, city: undefined } }],
    ['missing neighborhood', { ...validUser, address: { ...address, neighborhood: '' } }],
    ['extra address key', { ...validUser, address: { ...address, zip: '1' } }],
    ['extra user key', { ...validUser, id }],
  ])('rejects %s', (_label, user) => {
    expect(validateUser(user)).toBe(false);
  });
});

describe('createUser', () => {
  it('saves a valid user', async () => {
    vi.mocked(usersRepository.saveUserRepository).mockResolvedValue({ id, ...validUser } as never);
    await expect(createUser(validUser)).resolves.toEqual({ id, ...validUser });
    expect(usersRepository.saveUserRepository).toHaveBeenCalledWith(validUser);
  });

  it('throws on invalid data without hitting the repository', () => {
    expect(() => createUser({})).toThrow('Invalid user data');
    expect(usersRepository.saveUserRepository).not.toHaveBeenCalled();
  });
});

describe('getUsers / getUserById / deleteUser', () => {
  it('delegates to the repository', async () => {
    vi.mocked(usersRepository.getUsersRepository).mockResolvedValue([]);
    vi.mocked(usersRepository.getUserByIdRepository).mockResolvedValue({
      id,
      ...validUser,
    } as never);
    vi.mocked(usersRepository.deleteUserRepository).mockResolvedValue();

    await expect(getUsers()).resolves.toEqual([]);
    await expect(getUserById(id)).resolves.toEqual({ id, ...validUser });
    await expect(deleteUser(id)).resolves.toBeUndefined();
  });
});

describe('updateUser', () => {
  it('accepts partial updates', async () => {
    vi.mocked(usersRepository.updateUserRepository).mockResolvedValue({
      id,
      ...validUser,
    } as never);
    await updateUser(id, { phone: '44888888888' });
    expect(usersRepository.updateUserRepository).toHaveBeenCalledWith(id, {
      phone: '44888888888',
    });
  });

  it.each([
    ['empty object', {}],
    ['array', []],
    ['id', { id }],
    ['unknown field', { email: 'a@a.com' }],
    ['invalid name', { name: '' }],
    ['invalid phone', { phone: 'abc' }],
    ['invalid state', { address: { ...address, state: 'XX' } }],
    ['partial address', { address: { street: 'Rua B' } }],
  ])('rejects %s', (_label, updates) => {
    expect(() => updateUser(id, updates)).toThrow('Invalid user update data');
    expect(usersRepository.updateUserRepository).not.toHaveBeenCalled();
  });
});
