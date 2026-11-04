import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticateUser } from './auth.service.js';
import { UserNotFoundError } from '../errors/user.errors.js';
import { verifyPassword } from './password.js';
import { InvalidCredentialsError } from '../errors/auth.errors.js';
import { findUserByIdentifierRepository } from '../repositories/users.repository.js';

vi.mock('./password.js', () => ({
  verifyPassword: vi.fn().mockResolvedValue(true),
}));

const password = 'hashedpassword';

vi.mock('../repositories/users.repository.js', () => ({
  findUserByIdentifierRepository: vi.fn().mockImplementation(async (identifier: string) => {
    if (identifier === 'john.doe@example.com') {
      return {
        user: {
          id: '1',
          name: 'John Doe',
          email: 'john.doe@example.com',
          phone: '1234567890',
          role: 'user',
          address: {
            street: '123 Main St',
            number: '1',
            city: 'City',
            state: 'State',
            neighborhood: 'Neighborhood',
          },
        },
        passwordHash: 'hashedpassword',
      };
    }
    throw new UserNotFoundError();
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('authenticateUser', () => {
  it('should throw an error if identifier is invalid', async () => {
    await expect(authenticateUser('', 'password')).rejects.toThrow('Identifier is required');
    expect(findUserByIdentifierRepository).not.toHaveBeenCalled();
  });
  it('should throw an error if password is invalid', async () => {
    await expect(authenticateUser('identifier', '')).rejects.toThrow('Password is required');
  });
  it('should throw an error if both identifier and password are invalid', async () => {
    await expect(authenticateUser('', '')).rejects.toThrow('Identifier is required');
  });

  it('should authenticate user with valid identifier and password', async () => {
    const result = await authenticateUser('john.doe@example.com', password);

    expect(result).toHaveProperty('id', '1');
    expect(verifyPassword).toHaveBeenCalledWith(password, 'hashedpassword');
    expect(findUserByIdentifierRepository).toHaveBeenCalledWith('john.doe@example.com');
  });
  it('should throw InvalidCredentialsError if user does not exist', async () => {
    await expect(authenticateUser('nonexistent@example.com', password)).rejects.toThrow(
      InvalidCredentialsError,
    );
    expect(verifyPassword).not.toHaveBeenCalled();
  });
  it('should throw InvalidCredentialsError if password is incorrect', async () => {
    vi.mocked(verifyPassword).mockResolvedValueOnce(false);
    await expect(authenticateUser('john.doe@example.com', 'wrongpassword')).rejects.toThrow(
      InvalidCredentialsError,
    );
  });
});
