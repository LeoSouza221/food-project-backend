import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { pool } from '../src/database/pool.js';
import { createApp } from '../src/app.js';
import type { User } from '../src/types/user.js';

const app = createApp();
let baseUrl: string;
let userId: string;
let user: User;

const address = {
  street: 'Rua das Flores',
  number: '12B',
  city: 'Maringá',
  state: 'PR',
  neighborhood: 'Centro',
};
const password = 'senha-segura-123';
let sequence = 0;

// Telefone e e-mail são únicos, então cada usuário criado recebe valores próprios.
const buildPayload = () => {
  sequence += 1;
  const suffix = `${Date.now()}${sequence}`;

  return {
    name: 'Usuário integração',
    email: `integration-${suffix}@example.com`,
    phone: `449${suffix.slice(-8).padStart(8, '0')}`,
    address,
  };
};

const post = (body: unknown) =>
  fetch(`${baseUrl}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const createUser = async () => {
  const payload = buildPayload();
  const response = await post({ ...payload, password });
  expect(response.status).toBe(201);
  const data = await response.json();
  userId = data.user.id;
  return { ...data.user };
};

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    app.listen(0, resolve);
  });

  const serverAddress = app.address();
  if (!serverAddress || typeof serverAddress === 'string') {
    throw new Error('Could not determine the test server address.');
  }

  baseUrl = `http://127.0.0.1:${serverAddress.port}`;

  user = await createUser();
});

afterAll(async () => {
  try {
    if (userId) {
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    }
  } finally {
    await new Promise<void>((resolve, reject) => {
      app.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
});

describe('authRoutes integration', () => {
  it('should return 405 for unsupported methods', async () => {
    const response = await fetch(`${baseUrl}/auth/login`, { method: 'GET' });

    expect(response.status).toBe(405);
  });
  it('should return 200 for supported methods', async () => {
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: user.email,
        password,
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data).toHaveProperty('token');
    expect(data.data).toHaveProperty('user');
    expect(data.data.user).toEqual(
      expect.objectContaining({
        ...user,
      }),
    );
    expect(data.data.user).not.toHaveProperty('password_hash');
    expect(data.data.user).not.toHaveProperty('password');
    expect(typeof data.data.token).toBe('string');
    expect(data.data.token.length).toBeGreaterThan(0);
  });
  it('should return 200 with phone identifier', async () => {
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: user.phone,
        password,
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data).toHaveProperty('token');
    expect(data.data).toHaveProperty('user');
    expect(data.data.user).toEqual(
      expect.objectContaining({
        ...user,
      }),
    );
    expect(data.data.user).not.toHaveProperty('password_hash');
    expect(data.data.user).not.toHaveProperty('password');
    expect(typeof data.data.token).toBe('string');
    expect(data.data.token.length).toBeGreaterThan(0);
  });
  it('should return 401 for password having spaces', async () => {
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: user.email,
        password: `  ${password}  `,
      }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toBe('Invalid credentials');
  });
  it('should return 404 for non-existent route', async () => {
    const response = await fetch(`${baseUrl}/auth/non-existent-route`, {
      method: 'GET',
    });

    expect(response.status).toBe(404);
  });
  it('should return 401 for invalid credentials', async () => {
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: user.email,
        password: 'wrong-password',
      }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toBe('Invalid credentials');
  });
  it('should return 400 for missing credentials', async () => {
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: user.email,
      }),
    });

    expect(response.status).toBe(400);
  });
  it('should return 400 for missing identifier', async () => {
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password,
      }),
    });

    expect(response.status).toBe(400);
  });
  it('should return 401 for non-existent user', async () => {
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'non-existent-user@example.com',
        password: 'some-password',
      }),
    });

    expect(response.status).toBe(401);
  });
  it('should return 400 for empty identifier', async () => {
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: '',
        password,
      }),
    });

    expect(response.status).toBe(400);
  });
  it('should return 400 for empty password', async () => {
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: user.email,
        password: '',
      }),
    });

    expect(response.status).toBe(400);
  });
  it('should return 400 for invalid JSON', async () => {
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ identifier: ',
    });

    expect(response.status).toBe(400);
  });
});
