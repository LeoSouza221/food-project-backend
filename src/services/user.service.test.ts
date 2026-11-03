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
import { InvalidUserDataError, InvalidUserUpdateError } from '../errors/user.errors.js';

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
const id = '123e4567-e89b-42d3-a456-426614174000';
const validUser = {
  name: 'Leonardo',
  email: 'leonardo@example.com',
  phone: '44999999999',
  password: 'senha-segura-123',
  address,
};
const { password: _password, ...publicUser } = validUser; // eslint-disable-line @typescript-eslint/no-unused-vars
const savedUser = { id, ...publicUser, role: 'customer' } as never;

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
    ['missing name', { ...validUser, name: undefined }],
    ['missing email', { ...validUser, email: undefined }],
    ['email without @', { ...validUser, email: 'leonardo.example.com' }],
    ['long email', { ...validUser, email: `${'a'.repeat(250)}@a.com` }],
    ['missing password', { ...validUser, password: undefined }],
    ['short password', { ...validUser, password: '1234567' }],
    ['long password', { ...validUser, password: 'a'.repeat(73) }],
    ['role in payload', { ...validUser, role: 'admin' }],
    ['password_hash in payload', { ...validUser, passwordHash: 'x' }],
    ['blank name', { ...validUser, name: ' ' }],
    ['long name', { ...validUser, name: 'a'.repeat(101) }],
    ['missing phone', { ...validUser, phone: undefined }],
    ['phone with symbols', { ...validUser, phone: '(44) 99999-9999' }],
    ['short phone', { ...validUser, phone: '449999999' }],
    ['long phone', { ...validUser, phone: '449999999999' }],
    ['numeric phone', { ...validUser, phone: 44999999999 }],
    ['missing address', { ...validUser, address: undefined }],
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
    vi.mocked(usersRepository.saveUserRepository).mockResolvedValue(savedUser);
    await expect(createUser(validUser)).resolves.toEqual(savedUser);
    expect(usersRepository.saveUserRepository).toHaveBeenCalledWith({
      ...publicUser,
      passwordHash: expect.stringMatching(/^scrypt\$[0-9a-f]+\$[0-9a-f]+$/),
    });
  });

  it('normalizes the email and never forwards the plain password', async () => {
    vi.mocked(usersRepository.saveUserRepository).mockResolvedValue(savedUser);
    await createUser({ ...validUser, email: '  Leonardo@Example.COM ' });
    const saved = vi.mocked(usersRepository.saveUserRepository).mock.calls[0]?.[0];
    expect(saved?.email).toBe('leonardo@example.com');
    expect(saved).not.toHaveProperty('password');
    expect(JSON.stringify(saved)).not.toContain(validUser.password);
  });

  it('trims and collapses extra spaces in name and address', async () => {
    vi.mocked(usersRepository.saveUserRepository).mockResolvedValue(savedUser);
    await createUser({
      ...validUser,
      name: '  Leonardo   de   Souza  ',
      address: {
        street: '  Rua   das    Flores ',
        number: ' 12   B ',
        city: ' São   Paulo ',
        state: 'SP',
        neighborhood: '  Vila   Nova   Conceição ',
      },
    });
    const saved = vi.mocked(usersRepository.saveUserRepository).mock.calls[0]?.[0];
    expect(saved?.name).toBe('Leonardo de Souza');
    expect(saved?.address).toEqual({
      street: 'Rua das Flores',
      number: '12 B',
      city: 'São Paulo',
      state: 'SP',
      neighborhood: 'Vila Nova Conceição',
    });
  });

  it('trims extra spaces around the email', async () => {
    vi.mocked(usersRepository.saveUserRepository).mockResolvedValue(savedUser);
    await createUser({ ...validUser, email: '   leonardo@example.com   ' });
    expect(vi.mocked(usersRepository.saveUserRepository).mock.calls[0]?.[0].email).toBe(
      'leonardo@example.com',
    );
  });

  it.each(['pr', 'Pr', ' pr '])('normalizes the lowercase state %j to uppercase', async (state) => {
    vi.mocked(usersRepository.saveUserRepository).mockResolvedValue(savedUser);
    await createUser({ ...validUser, address: { ...address, state } });
    expect(vi.mocked(usersRepository.saveUserRepository).mock.calls[0]?.[0].address.state).toBe(
      'PR',
    );
  });

  it('rejects names and address fields made only of spaces', async () => {
    await expect(createUser({ ...validUser, name: '     ' })).rejects.toThrow(InvalidUserDataError);
    await expect(
      createUser({ ...validUser, address: { ...address, street: '     ' } }),
    ).rejects.toThrow(InvalidUserDataError);
    expect(usersRepository.saveUserRepository).not.toHaveBeenCalled();
  });

  it('throws on invalid data without hitting the repository', async () => {
    await expect(createUser({})).rejects.toThrow(InvalidUserDataError);
    expect(usersRepository.saveUserRepository).not.toHaveBeenCalled();
  });
});

describe('getUsers / getUserById / deleteUser', () => {
  it('delegates to the repository', async () => {
    vi.mocked(usersRepository.getUsersRepository).mockResolvedValue([]);
    vi.mocked(usersRepository.getUserByIdRepository).mockResolvedValue({
      id,
      ...publicUser,
    } as never);
    vi.mocked(usersRepository.deleteUserRepository).mockResolvedValue();

    await expect(getUsers()).resolves.toEqual([]);
    await expect(getUserById(id)).resolves.toEqual({ id, ...publicUser });
    await expect(deleteUser(id)).resolves.toBeUndefined();
  });
});

describe('updateUser', () => {
  it('accepts partial updates', async () => {
    vi.mocked(usersRepository.updateUserRepository).mockResolvedValue(savedUser);
    await updateUser(id, { phone: '44888888888' });
    expect(usersRepository.updateUserRepository).toHaveBeenCalledWith(id, {
      phone: '44888888888',
    });
  });

  it('normalizes the email on update', async () => {
    vi.mocked(usersRepository.updateUserRepository).mockResolvedValue(savedUser);
    await updateUser(id, { email: 'New@Example.com' });
    expect(usersRepository.updateUserRepository).toHaveBeenCalledWith(id, {
      email: 'new@example.com',
    });
  });

  it('normalizes name, email and address on update', async () => {
    vi.mocked(usersRepository.updateUserRepository).mockResolvedValue(savedUser);
    await updateUser(id, {
      name: '  Maria   Silva ',
      email: '  Maria@Example.com ',
      address: { ...address, street: '  Rua   B ', city: ' Foz   do  Iguaçu ', state: 'pr' },
    });
    expect(usersRepository.updateUserRepository).toHaveBeenCalledWith(id, {
      name: 'Maria Silva',
      email: 'maria@example.com',
      address: { ...address, street: 'Rua B', city: 'Foz do Iguaçu', state: 'PR' },
    });
  });

  it.each([
    ['empty object', {}],
    ['array', []],
    ['id', { id }],
    ['password', { password: 'senha-segura-123' }],
    ['role', { role: 'admin' }],
    ['invalid email', { email: 'nope' }],
    ['invalid name', { name: '' }],
    ['invalid phone', { phone: 'abc' }],
    ['invalid state', { address: { ...address, state: 'XX' } }],
    ['partial address', { address: { street: 'Rua B' } }],
  ])('rejects %s', (_label, updates) => {
    expect(() => updateUser(id, updates)).toThrow(InvalidUserUpdateError);
    expect(usersRepository.updateUserRepository).not.toHaveBeenCalled();
  });
});
