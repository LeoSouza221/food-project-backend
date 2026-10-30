import {
  saveUserRepository,
  getUsersRepository,
  getUserByIdRepository,
  updateUserRepository,
  deleteUserRepository,
} from '../repositories/users.repository.js';
import { BRAZILIAN_STATES } from '../types/user.js';
import type { Address, BrazilianState, CreateUserInput, User } from '../types/user.js';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonEmptyText = (value: unknown, maxLength: number): value is string =>
  typeof value === 'string' && value.trim() !== '' && Array.from(value).length <= maxLength;

const isValidUserName = (name: unknown): name is string => isNonEmptyText(name, 100);

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
    isValidState(address.state) &&
    isNonEmptyText(address.neighborhood, 100)
  );
};

export const validateUser = (user: unknown): user is CreateUserInput => {
  if (!isPlainObject(user)) return false;
  if (Object.keys(user).some((key) => !['name', 'phone', 'address'].includes(key))) return false;

  return isValidUserName(user.name) && isValidPhone(user.phone) && isValidAddress(user.address);
};

export const createUser = (user: unknown): Promise<User> => {
  if (!validateUser(user)) {
    throw new Error('Invalid user data');
  }

  return saveUserRepository(user);
};

export const getUsers = (): Promise<User[]> => {
  return getUsersRepository();
};

export const getUserById = (id: string): Promise<User> => {
  return getUserByIdRepository(id);
};

const validateUserUpdate = (updates: unknown): updates is Partial<CreateUserInput> => {
  if (!isPlainObject(updates) || Object.keys(updates).length === 0) return false;
  if (Object.keys(updates).some((key) => !['name', 'phone', 'address'].includes(key))) return false;

  const { name, phone, address } = updates;

  if (name !== undefined && !isValidUserName(name)) return false;
  if (phone !== undefined && !isValidPhone(phone)) return false;
  if (address !== undefined && !isValidAddress(address)) return false;

  return true;
};

export const updateUser = (id: string, updates: unknown): Promise<User> => {
  if (!validateUserUpdate(updates)) {
    throw new Error('Invalid user update data');
  }

  return updateUserRepository(id, updates);
};

export const deleteUser = (id: string): Promise<void> => {
  return deleteUserRepository(id);
};
