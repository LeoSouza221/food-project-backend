import { hashPassword, verifyPassword } from './password.js';
import { describe, it, expect } from 'vitest';

describe('Password Service', () => {
  it('should hash and verify a password correctly', async () => {
    const password = 'mySecurePassword123!';
    const hashedPassword = await hashPassword(password);
    const isValid = await verifyPassword(password, hashedPassword);
    expect(isValid).toBe(true);
  });
  it('should return false for incorrect password', async () => {
    const password = 'mySecurePassword123!';
    const hashedPassword = await hashPassword(password);
    const isValid = await verifyPassword('wrongPassword', hashedPassword);
    expect(isValid).toBe(false);
  });
  it('should return false for invalid hashed password format', async () => {
    const invalidHashedPassword = 'invalidFormat';
    const isValid = await verifyPassword('password', invalidHashedPassword);
    expect(isValid).toBe(false);
  });
  it('should fail when salt hexadecimal is invalid', async () => {
    const invalidSaltHashedPassword = 'scrypt$invalidSalt$abcdef';
    await expect(verifyPassword('password', invalidSaltHashedPassword)).resolves.toBe(false);
  });

  describe('malformed stored hashes', () => {
    const password = 'mySecurePassword123!';
    const parse = async (): Promise<[string, string]> => {
      const [, salt, hash] = (await hashPassword(password)).split('$');
      return [salt, hash];
    };

    it('should return false for an algorithm other than scrypt', async () => {
      const [salt, hash] = await parse();
      await expect(verifyPassword(password, `bcrypt$${salt}$${hash}`)).resolves.toBe(false);
    });

    it('should return false for a salt with incorrect length', async () => {
      const [salt, hash] = await parse();
      await expect(verifyPassword(password, `scrypt$${salt.slice(0, -2)}$${hash}`)).resolves.toBe(
        false,
      );
    });

    it('should return false for a hash with incorrect length', async () => {
      const [salt, hash] = await parse();
      await expect(verifyPassword(password, `scrypt$${salt}$${hash.slice(0, -2)}`)).resolves.toBe(
        false,
      );
    });

    it('should return false for a hash with non-hexadecimal characters', async () => {
      const [salt, hash] = await parse();
      const nonHexHash = `zz${hash.slice(2)}`;
      await expect(verifyPassword(password, `scrypt$${salt}$${nonHexHash}`)).resolves.toBe(false);
    });

    it('should return false when there are extra segments after the hash', async () => {
      const [salt, hash] = await parse();
      await expect(verifyPassword(password, `scrypt$${salt}$${hash}$extra`)).resolves.toBe(false);
    });
  });
});
