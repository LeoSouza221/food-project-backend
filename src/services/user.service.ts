import {
  saveUserRepository,
  getUsersRepository,
  getUserByIdRepository,
  updateUserRepository,
  deleteUserRepository,
} from '../repositories/users.repository.js';
import { InvalidUserDataError, InvalidUserUpdateError } from '../errors/user.errors.js';
import { BRAZILIAN_STATES } from '../types/user.js';
import { hashPassword } from './password.js';
import type {
  Address,
  BrazilianState,
  CreateUserInput,
  UpdateUserInput,
  User,
} from '../types/user.js';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonEmptyText = (value: unknown, maxLength: number): value is string =>
  typeof value === 'string' && value.trim() !== '' && Array.from(value).length <= maxLength;

const isValidUserName = (name: unknown): name is string => isNonEmptyText(name, 100);

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const isValidEmail = (email: unknown): email is string =>
  typeof email === 'string' && email.trim().length <= 254 && EMAIL_PATTERN.test(email.trim());

// Política de senha: entre 8 e 72 caracteres.
const isValidPassword = (password: unknown): password is string =>
  typeof password === 'string' && password.length >= 8 && password.length <= 72;

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const normalizeText = (value: string): string => {
  return value.trim().replace(/\s+/g, ' ');
};
const normalizeAddress = (address: Address): Address => ({
  street: normalizeText(address.street),
  number: normalizeText(address.number),
  city: normalizeText(address.city),
  state: address.state.trim().toUpperCase() as BrazilianState,
  neighborhood: normalizeText(address.neighborhood),
});

// Apenas dígitos com DDD: 10 (fixo) ou 11 (celular) dígitos.
const isValidPhone = (phone: unknown): phone is string =>
  typeof phone === 'string' && /^[0-9]{10,11}$/.test(phone);

export const isValidState = (state: unknown): state is BrazilianState =>
  typeof state === 'string' && (BRAZILIAN_STATES as readonly string[]).includes(state);

const ADDRESS_KEYS = ['street', 'number', 'city', 'state', 'neighborhood'];

const isValidAddress = (address: unknown): address is Address => {
  if (!isPlainObject(address)) return false;
  if (Object.keys(address).some((key) => !ADDRESS_KEYS.includes(key))) return false;

  return (
    isNonEmptyText(address.street, 150) &&
    isNonEmptyText(address.number, 20) &&
    isNonEmptyText(address.city, 100) &&
    typeof address.state === 'string' &&
    isValidState(address.state.trim().toUpperCase()) &&
    isNonEmptyText(address.neighborhood, 100)
  );
};

const CREATE_KEYS = ['name', 'email', 'phone', 'password', 'address'];
const UPDATE_KEYS = ['name', 'email', 'phone', 'address'];

type RawAddress = Partial<Record<keyof Address, string>>;
type RawCreateUserInput = Partial<
  Pick<CreateUserInput, 'name' | 'email' | 'phone' | 'password'>
> & {
  address?: RawAddress;
};

const hasValidCreateUserStructure = (user: unknown): user is RawCreateUserInput => {
  if (!isPlainObject(user)) return false;
  if (Object.keys(user).some((key) => !CREATE_KEYS.includes(key))) return false;

  const scalarKeys = CREATE_KEYS.filter((key) => key !== 'address');
  if (scalarKeys.some((key) => key in user && typeof user[key] !== 'string')) return false;

  if (!('address' in user)) return true;
  if (!isPlainObject(user.address)) return false;
  if (Object.keys(user.address).some((key) => !ADDRESS_KEYS.includes(key))) return false;

  return Object.values(user.address).every((value) => typeof value === 'string');
};

const normalizeCreateUserInput = (user: RawCreateUserInput): RawCreateUserInput => {
  const normalized: RawCreateUserInput = { ...user };

  if (user.name !== undefined) normalized.name = normalizeText(user.name);
  if (user.email !== undefined) normalized.email = normalizeEmail(user.email);

  if (user.address !== undefined) {
    const address: RawAddress = { ...user.address };
    for (const field of ['street', 'number', 'city', 'neighborhood'] as const) {
      if (address[field] !== undefined) address[field] = normalizeText(address[field]);
    }
    if (address.state !== undefined) address.state = address.state.trim().toUpperCase();
    normalized.address = address;
  }

  return normalized;
};

const isValidNormalizedCreateUser = (user: RawCreateUserInput): user is CreateUserInput =>
  isValidUserName(user.name) &&
  isValidEmail(user.email) &&
  isValidPhone(user.phone) &&
  isValidPassword(user.password) &&
  isValidAddress(user.address);

const getNormalizedCreateUserInput = (user: unknown): CreateUserInput | undefined => {
  if (!hasValidCreateUserStructure(user)) return undefined;

  const normalized = normalizeCreateUserInput(user);
  if (!isValidNormalizedCreateUser(normalized)) return undefined;

  return normalized;
};

export const validateUser = (user: unknown): user is CreateUserInput => {
  return getNormalizedCreateUserInput(user) !== undefined;
};

export const createUser = async (user: unknown): Promise<User> => {
  const normalizedInput = getNormalizedCreateUserInput(user);
  if (!normalizedInput) {
    throw new InvalidUserDataError();
  }

  const { password, ...userData } = normalizedInput;
  return saveUserRepository({
    ...userData,
    passwordHash: await hashPassword(password),
  });
};

export const getUsers = (): Promise<User[]> => {
  return getUsersRepository();
};

export const getUserById = (id: string): Promise<User> => {
  return getUserByIdRepository(id);
};

const validateUserUpdate = (updates: unknown): updates is UpdateUserInput => {
  if (!isPlainObject(updates) || Object.keys(updates).length === 0) return false;
  if (Object.keys(updates).some((key) => !UPDATE_KEYS.includes(key))) return false;

  const { name, email, phone, address } = updates;

  if (name !== undefined && !isValidUserName(name)) return false;
  if (email !== undefined && !isValidEmail(email)) return false;
  if (phone !== undefined && !isValidPhone(phone)) return false;
  if (address !== undefined && !isValidAddress(address)) return false;

  return true;
};

export const updateUser = (id: string, updates: unknown): Promise<User> => {
  if (!validateUserUpdate(updates)) {
    throw new InvalidUserUpdateError();
  }

  return updateUserRepository(id, {
    ...updates,
    ...(typeof updates.email === 'string' && { email: normalizeEmail(updates.email) }),
    ...(typeof updates.address === 'object' && { address: normalizeAddress(updates.address) }),
    ...(typeof updates.name === 'string' && { name: normalizeText(updates.name) }),
  });
};

export const deleteUser = (id: string): Promise<void> => {
  return deleteUserRepository(id);
};
