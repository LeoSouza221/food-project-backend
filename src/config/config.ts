import dotenv from 'dotenv';

dotenv.config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
});

const getValidDummyPasswordHash = () => {
  const hash = process.env.DUMMY_PASSWORD_HASH;
  if (typeof hash === 'string' && hash.trim().length > 0) {
    return hash.trim();
  }

  throw new Error('Invalid DUMMY_PASSWORD_HASH');
};

const getValidDbHost = () => {
  const host = process.env.DB_HOST;
  if (typeof host === 'string' && host.trim().length > 0) {
    return host.trim();
  }

  throw new Error('Invalid DB_HOST');
};

const getValidDbPort = () => {
  const value = process.env.DB_PORT;
  const port = Number(value);
  if (
    typeof value === 'string' &&
    value.length > 0 &&
    !/[^0-9]/.test(value) &&
    Number.isInteger(port) &&
    port >= 1 &&
    port <= 65535
  ) {
    return port;
  }

  throw new Error('Invalid DB_PORT');
};

const getValidDbName = () => {
  const name = process.env.DB_NAME;
  if (typeof name === 'string' && name.trim().length > 0) {
    return name.trim();
  }

  throw new Error('Invalid DB_NAME');
};

const getValidDbUser = () => {
  const user = process.env.DB_USER;
  if (typeof user === 'string' && user.trim().length > 0) {
    return user.trim();
  }

  throw new Error('Invalid DB_USER');
};

const getValidDbPassword = () => {
  const password = process.env.DB_PASSWORD;
  if (typeof password === 'string' && password.length > 0) {
    return password;
  }

  throw new Error('Invalid DB_PASSWORD');
};

const getValidJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (
    typeof secret === 'string' &&
    Buffer.byteLength(secret, 'utf8') >= 32 &&
    secret.trim().length > 0
  ) {
    return secret.trim();
  }

  throw new Error('Invalid JWT_SECRET');
};

export const config = {
  dummyPasswordHash: getValidDummyPasswordHash(),
  database: {
    host: getValidDbHost(),
    port: getValidDbPort(),
    name: getValidDbName(),
    user: getValidDbUser(),
    password: getValidDbPassword(),
  },
  jwtSecret: getValidJwtSecret(),
};
