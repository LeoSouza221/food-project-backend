import { UserNotFoundError } from '../errors/user.errors.js';
import { InvalidCredentialsError } from '../errors/auth.errors.js';
import { findUserByIdentifierRepository } from '../repositories/users.repository.js';
import type { User } from '../types/user.js';
import { verifyPassword } from './password.js';

const isInvalidIdentifier = (identifier: string) => {
  return typeof identifier !== 'string' || identifier.trim() === '';
};

const isInvalidPassword = (password: string) => {
  return !password || typeof password !== 'string';
};

export const authenticateUser = async (identifier: string, password: string): Promise<User> => {
  if (isInvalidIdentifier(identifier)) {
    throw new Error('Identifier is required');
  }
  if (isInvalidPassword(password)) {
    throw new Error('Password is required');
  }

  try {
    const userRecord = await findUserByIdentifierRepository(identifier);
    const isPasswordValid = await verifyPassword(password, userRecord.passwordHash);

    if (!isPasswordValid) {
      throw new InvalidCredentialsError();
    }

    return userRecord.user;
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      throw new InvalidCredentialsError();
    }
    throw error;
  }
};
