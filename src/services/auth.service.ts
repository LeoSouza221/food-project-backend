import { UserNotFoundError } from '../errors/user.errors.js';
import { InvalidCredentialsError } from '../errors/auth.errors.js';
import { findUserByIdentifierRepository } from '../repositories/users.repository.js';
import type { User } from '../types/user.js';
import { verifyPassword } from './password.js';
import { generateJWT } from './jwt.js';

const dummyHash = process.env.DUMMY_PASSWORD_HASH;
const isValidDummyHash = typeof dummyHash === 'string' && dummyHash.length > 0;

if (!isValidDummyHash) {
  throw new Error('DUMMY_PASSWORD_HASH é obrigatória');
}

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

  const normalizedIdentifier = identifier.trim();
  const userRecord = await findUserByIdentifierRepository(
    normalizedIdentifier.includes('@') ? normalizedIdentifier.toLowerCase() : normalizedIdentifier,
  );

  if (!userRecord) {
    await verifyPassword(password, dummyHash);
    throw new InvalidCredentialsError();
  }

  const isPasswordValid = await verifyPassword(password, userRecord.passwordHash);

  if (!isPasswordValid) {
    throw new InvalidCredentialsError();
  }

  return userRecord.user;
};

export const loginUser = async (
  identifier: string,
  password: string,
): Promise<{ user: User; token: string }> => {
  const user = await authenticateUser(identifier, password);

  const token = await generateJWT(user.id, user.role);

  return { user, token };
};
