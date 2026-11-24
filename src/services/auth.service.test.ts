import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticateUser } from './auth.service.js';
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
          role: 'customer',
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
    return null;
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

  it.only('should authenticate user with valid identifier and password', async () => {
    const result = await authenticateUser('john.doe@example.com', password);

    expect(result).toHaveProperty('id', '1');
    expect(verifyPassword).toHaveBeenCalledWith(password, 'hashedpassword');
    expect(findUserByIdentifierRepository).toHaveBeenCalledWith('john.doe@example.com');
  });

  describe('identifier normalization', () => {
    it.each([
      ['JOHN.DOE@EXAMPLE.COM', 'john.doe@example.com'],
      ['John.Doe@Example.Com', 'john.doe@example.com'],
      ['  john.doe@example.com  ', 'john.doe@example.com'],
      ['  JOHN.DOE@EXAMPLE.COM  ', 'john.doe@example.com'],
      ['JOHN.DOE@EXAMPLE.COM ', 'john.doe@example.com'],
      ['John.Doe@Example.Com', 'john.doe@example.com'],
    ])('should normalize email to lowercase', async (input, expected) => {
      await authenticateUser(input, password);

      expect(findUserByIdentifierRepository).toHaveBeenCalledWith(expected);
    });

    it('should trim whitespace from phone without converting to lowercase', async () => {
      vi.mocked(findUserByIdentifierRepository).mockImplementation(async (identifier: string) => {
        if (identifier === '1234567890') {
          return {
            user: {
              id: '2',
              name: 'Test User',
              email: 'test@example.com',
              phone: '1234567890',
              role: 'customer',
              address: {
                street: '123 Main St',
                number: '1',
                city: 'City',
                state: 'State',
                neighborhood: 'Neighborhood',
              },
            },
            passwordHash: password,
          };
        }
        return null;
      });

      await authenticateUser('  1234567890  ', password);

      expect(findUserByIdentifierRepository).toHaveBeenCalledWith('1234567890');
    });

    it('should preserve phone format after trimming spaces', async () => {
      vi.mocked(findUserByIdentifierRepository).mockImplementation(async (identifier: string) => {
        if (identifier === '(11) 99999-9999') {
          return {
            user: {
              id: '3',
              name: 'Test User',
              email: 'test@example.com',
              phone: '(11) 99999-9999',
              role: 'customer',
              address: {
                street: '123 Main St',
                number: '1',
                city: 'City',
                state: 'State',
                neighborhood: 'Neighborhood',
              },
            },
            passwordHash: password,
          };
        }

        return null;
      });

      await authenticateUser('  (11) 99999-9999  ', password);

      expect(findUserByIdentifierRepository).toHaveBeenCalledWith('(11) 99999-9999');
    });
  });
  it('should throw InvalidCredentialsError if user does not exist', async () => {
    await expect(authenticateUser('nonexistent@example.com', password)).rejects.toThrow(
      InvalidCredentialsError,
    );
    expect(verifyPassword).toHaveBeenCalledWith(password, process.env.DUMMY_PASSWORD_HASH);
  });
  it('should throw InvalidCredentialsError if password is incorrect', async () => {
    vi.mocked(verifyPassword).mockResolvedValueOnce(false);
    await expect(authenticateUser('john.doe@example.com', 'wrongpassword')).rejects.toThrow(
      InvalidCredentialsError,
    );
    expect(verifyPassword).toHaveBeenCalled();
  });
});
