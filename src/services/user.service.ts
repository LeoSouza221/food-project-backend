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
  typeof email === 'string' && email.length <= 254 && EMAIL_PATTERN.test(email.trim());

// Entre 8 e 72 caracteres (limita o custo do hash).
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

export const validateUser = (user: unknown): user is CreateUserInput => {
  if (!isPlainObject(user)) return false;
  if (Object.keys(user).some((key) => !CREATE_KEYS.includes(key))) return false;

  return (
    isValidUserName(user.name) &&
    isValidEmail(user.email) &&
    isValidPhone(user.phone) &&
    isValidPassword(user.password) &&
    isValidAddress(user.address)
  );
};

export const createUser = async (user: unknown): Promise<User> => {
  if (!validateUser(user)) {
    throw new InvalidUserDataError();
  }

  const { password, email, name, address, ...rest } = user;

  const normalizedInput = {
    ...rest,
    name: normalizeText(name),
    email: normalizeEmail(email),
    passwordHash: await hashPassword(password),
    address: normalizeAddress(address),
  };

  return saveUserRepository(normalizedInput);
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
