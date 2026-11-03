import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

const deriveKey = (password: string, salt: Buffer): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (error, key) => (error ? reject(error) : resolve(key)));
  });

// Formato: scrypt$<salt hex>$<hash hex>
export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(SALT_LENGTH);
  const key = await deriveKey(password, salt);

  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
};

const isHex = (value: string): boolean => /^[0-9a-fA-F]+$/.test(value);

export const verifyPassword = async (
  password: string,
  hashedPassword: string,
): Promise<boolean> => {
  const parts = hashedPassword.split('$');
  if (parts.length !== 3) {
    return false;
  }

  const [algorithm, saltHex, keyHex] = parts;

  if (
    algorithm !== 'scrypt' ||
    saltHex?.length !== SALT_LENGTH * 2 ||
    keyHex?.length !== KEY_LENGTH * 2 ||
    !isHex(saltHex) ||
    !isHex(keyHex)
  ) {
    return false;
  }

  const salt = Buffer.from(saltHex, 'hex');
  const key = Buffer.from(keyHex, 'hex');
  const derivedKey = await deriveKey(password, salt);

  return timingSafeEqual(derivedKey, key);
};
