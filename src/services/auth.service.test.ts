import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InvalidCredentialsError } from '../errors/auth.errors.js';
import * as usersRepository from '../repositories/users.repository.js';
import * as sessionRepository from '../repositories/session.repository.js';
import type { Session } from '../types/session.js';
import type { User } from '../types/user.js';
import { authenticateUser, loginUser, logoutUser, refreshUserSession } from './auth.service.js';
import { generateJWT } from './jwt.js';
import { verifyPassword } from './password.js';
import { generateRefreshToken } from './refresh-token.service.js';

vi.mock('../repositories/users.repository.js', () => ({
  findUserByIdentifierRepository: vi.fn(),
  getUserByIdRepository: vi.fn(),
}));
vi.mock('../repositories/session.repository.js', () => ({
  findSessionByRefreshTokenHashRepository: vi.fn(),
  rotateSessionRepository: vi.fn(),
  saveSessionRepository: vi.fn(),
  revokeSessionByRefreshTokenHashRepository: vi.fn(),
}));
vi.mock('./password.js', () => ({ verifyPassword: vi.fn() }));
vi.mock('./jwt.js', () => ({ generateJWT: vi.fn() }));
vi.mock('./refresh-token.service.js', () => ({
  generateRefreshToken: vi.fn(),
  hashRefreshToken: vi.fn((token: string) => `hash:${token}`),
}));

const user: User = {
  id: '1',
  name: 'John Doe',
  email: 'john.doe@example.com',
  phone: '44999999999',
  role: 'customer',
  address: {
    street: 'Main St',
    number: '1',
    city: 'City',
    state: 'PR',
    neighborhood: 'Centro',
  },
};
const session: Session = {
  id: 'session-id',
  userId: user.id,
  refreshTokenHash: 'hash:old-token',
  userAgent: null,
  ipAddress: null,
  createdAt: new Date('2026-01-01'),
  expiresAt: new Date('2100-01-01'),
  lastUsedAt: null,
  revokedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(usersRepository.findUserByIdentifierRepository).mockResolvedValue({
    user,
    passwordHash: 'hashed-password',
  });
  vi.mocked(usersRepository.getUserByIdRepository).mockResolvedValue(user);
  vi.mocked(verifyPassword).mockResolvedValue(true);
  vi.mocked(generateJWT).mockResolvedValue('access-token');
  vi.mocked(generateRefreshToken).mockReturnValue('new-token');
  vi.mocked(sessionRepository.saveSessionRepository).mockResolvedValue(session);
  vi.mocked(sessionRepository.findSessionByRefreshTokenHashRepository).mockResolvedValue(session);
  vi.mocked(sessionRepository.rotateSessionRepository).mockResolvedValue(session);
  vi.mocked(sessionRepository.revokeSessionByRefreshTokenHashRepository).mockResolvedValue(session);
});

describe('authenticateUser', () => {
  it.each([
    ['', 'password', 'Identifier is required'],
    ['   ', 'password', 'Identifier is required'],
    ['identifier', '', 'Password is required'],
  ])('rejects invalid credentials input', async (identifier, password, message) => {
    await expect(authenticateUser(identifier, password)).rejects.toThrow(message);
    expect(usersRepository.findUserByIdentifierRepository).not.toHaveBeenCalled();
  });

  it.each([
    ['  JOHN.DOE@EXAMPLE.COM  ', 'john.doe@example.com'],
    ['  (11) 99999-9999  ', '(11) 99999-9999'],
  ])('normalizes identifier %s', async (identifier, normalized) => {
    await expect(authenticateUser(identifier, 'password')).resolves.toEqual(user);
    expect(usersRepository.findUserByIdentifierRepository).toHaveBeenCalledWith(normalized);
    expect(verifyPassword).toHaveBeenCalledWith('password', 'hashed-password');
  });

  it('uses the dummy hash for an unknown user', async () => {
    vi.mocked(usersRepository.findUserByIdentifierRepository).mockResolvedValueOnce(null);
    await expect(authenticateUser('missing@example.com', 'password')).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    expect(verifyPassword).toHaveBeenCalledWith('password', process.env.DUMMY_PASSWORD_HASH);
  });

  it('rejects an incorrect password', async () => {
    vi.mocked(verifyPassword).mockResolvedValueOnce(false);
    await expect(authenticateUser(user.email, 'wrong')).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
  });
});

describe('loginUser', () => {
  it('creates a session with a hashed token and metadata', async () => {
    const now = Date.now();
    const metadata = { userAgent: 'browser', ipAddress: '127.0.0.1' };
    await expect(loginUser(user.email, 'password', metadata)).resolves.toEqual({
      user,
      accessToken: 'access-token',
      refreshToken: 'new-token',
    });
    expect(generateJWT).toHaveBeenCalledWith(user.id, user.role);
    const saved = vi.mocked(sessionRepository.saveSessionRepository).mock.calls[0]?.[0];
    expect(saved).toEqual({
      userId: user.id,
      refreshTokenHash: 'hash:new-token',
      ...metadata,
      expiresAt: expect.any(Date),
    });
    expect(saved!.expiresAt.getTime()).toBeGreaterThanOrEqual(now + 7 * 24 * 60 * 60 * 1000);
    expect(saved!.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 7 * 24 * 60 * 60 * 1000);
  });

  it('does not save a session when authentication fails', async () => {
    vi.mocked(verifyPassword).mockResolvedValueOnce(false);
    await expect(loginUser(user.email, 'wrong')).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(sessionRepository.saveSessionRepository).not.toHaveBeenCalled();
  });
});

describe('refreshUserSession', () => {
  it('rotates the token and creates a new access token', async () => {
    await expect(refreshUserSession('old-token')).resolves.toEqual({
      accessToken: 'access-token',
      refreshToken: 'new-token',
    });
    expect(sessionRepository.findSessionByRefreshTokenHashRepository).toHaveBeenCalledWith(
      'hash:old-token',
    );
    expect(usersRepository.getUserByIdRepository).toHaveBeenCalledWith(user.id);
    expect(sessionRepository.rotateSessionRepository).toHaveBeenCalledWith(
      'hash:old-token',
      'hash:new-token',
    );
    expect(generateJWT).toHaveBeenCalledWith(user.id, user.role);
  });

  it.each([
    ['missing', null],
    ['revoked', { ...session, revokedAt: new Date() }],
    ['expired', { ...session, expiresAt: new Date(0) }],
  ])('rejects a %s session', async (_label, record) => {
    vi.mocked(sessionRepository.findSessionByRefreshTokenHashRepository).mockResolvedValueOnce(
      record,
    );
    await expect(refreshUserSession('old-token')).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(sessionRepository.rotateSessionRepository).not.toHaveBeenCalled();
    expect(generateJWT).not.toHaveBeenCalled();
  });

  it('rejects an empty token without looking up a session', async () => {
    await expect(refreshUserSession('')).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(sessionRepository.findSessionByRefreshTokenHashRepository).not.toHaveBeenCalled();
  });

  it('rejects a token already rotated by another request', async () => {
    vi.mocked(sessionRepository.rotateSessionRepository).mockResolvedValueOnce(null);
    await expect(refreshUserSession('old-token')).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(generateJWT).not.toHaveBeenCalled();
  });
});

describe('logoutUser', () => {
  it('revokes the session by token hash', async () => {
    await logoutUser('old-token');
    expect(sessionRepository.revokeSessionByRefreshTokenHashRepository).toHaveBeenCalledWith(
      'hash:old-token',
    );
  });

  it('does not query the repository for an empty token', async () => {
    await logoutUser('');
    expect(sessionRepository.revokeSessionByRefreshTokenHashRepository).not.toHaveBeenCalled();
  });
});
