import { InvalidCredentialsError } from '../errors/auth.errors.js';
import {
  findUserByIdentifierRepository,
  getUserByIdRepository,
} from '../repositories/users.repository.js';
import {
  findSessionByRefreshTokenHashRepository,
  rotateSessionRepository,
  saveSessionRepository,
  revokeSessionByRefreshTokenHashRepository,
} from '../repositories/session.repository.js';
import type { User } from '../types/user.js';
import type { SessionMetadata } from '../types/session.js';
import { verifyPassword } from './password.js';
import { generateJWT } from './jwt.js';
import { generateRefreshToken, hashRefreshToken } from './refresh-token.service.js';

const dummyHash = process.env.DUMMY_PASSWORD_HASH;

if (typeof dummyHash !== 'string' || dummyHash.length === 0) {
  throw new Error('DUMMY_PASSWORD_HASH é obrigatória');
}

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const isInvalidIdentifier = (identifier: string) =>
  typeof identifier !== 'string' || identifier.trim() === '';

const isInvalidPassword = (password: string) =>
  typeof password !== 'string' || password.length === 0;

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
  metadata: SessionMetadata = {},
): Promise<{ user: User; accessToken: string; refreshToken: string }> => {
  const user = await authenticateUser(identifier, password);

  const accessToken = await generateJWT(user.id, user.role);
  const refreshToken = generateRefreshToken();

  await saveSessionRepository({
    userId: user.id,
    refreshTokenHash: hashRefreshToken(refreshToken),
    ...(metadata.userAgent !== undefined && { userAgent: metadata.userAgent }),
    ...(metadata.ipAddress !== undefined && { ipAddress: metadata.ipAddress }),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

  return { user, accessToken, refreshToken };
};

export const refreshUserSession = async (
  currentRefreshToken: string,
): Promise<{ accessToken: string; refreshToken: string }> => {
  if (!currentRefreshToken || typeof currentRefreshToken !== 'string') {
    throw new InvalidCredentialsError();
  }

  const currentHash = hashRefreshToken(currentRefreshToken);
  const session = await findSessionByRefreshTokenHashRepository(currentHash);

  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    throw new InvalidCredentialsError();
  }

  const user = await getUserByIdRepository(session.userId);

  const newRefreshToken = generateRefreshToken();
  const newRefreshTokenHash = hashRefreshToken(newRefreshToken);

  const rotatedSession = await rotateSessionRepository(currentHash, newRefreshTokenHash);

  if (!rotatedSession) {
    throw new InvalidCredentialsError();
  }

  const accessToken = await generateJWT(user.id, user.role);

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
};

export const logoutUser = async (refreshToken: string): Promise<void> => {
  if (!refreshToken || typeof refreshToken !== 'string') {
    return;
  }

  await revokeSessionByRefreshTokenHashRepository(hashRefreshToken(refreshToken));
};
