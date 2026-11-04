import { UserNotFoundError } from '../errors/user.errors.js';
import { InvalidCredentialsError } from '../errors/auth.errors.js';
import { findUserByIdentifierRepository } from '../repositories/users.repository.js';
import type { User } from '../types/user.js';
import { verifyPassword } from './password.js';
import { generateJWT } from './jwt.js';

const isInvalidIdentifier = (identifier: string) => {
  return typeof identifier !== 'string' || identifier.trim() === '';
};

const isInvalidPassword = (password: string) => {
  return typeof password !== 'string' || password.length === 0;
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

export const loginUser = async (
  identifier: string,
  password: string,
): Promise<{ user: User; token: string }> => {
  const user = await authenticateUser(identifier, password);

  const token = await generateJWT(user.id, user.role);

  return { user, token };
};
