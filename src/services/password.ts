import { randomBytes, scrypt } from 'node:crypto';

const KEY_LENGTH = 64;

const deriveKey = (password: string, salt: Buffer): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (error, key) => (error ? reject(error) : resolve(key)));
  });

// Formato: scrypt$<salt hex>$<hash hex>
export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);

  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
};
