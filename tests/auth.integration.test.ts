import { describe, it, expect, afterAll, beforeAll, vi, beforeEach, afterEach } from 'vitest';
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
const initialTime = Date.now();
let testNumber = 0;

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

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(initialTime + ++testNumber * 60_000);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('authRoutes integration', () => {
  it('should return 405 for unsupported methods', async () => {
    const response = await fetch(`${baseUrl}/auth/login`, { method: 'GET' });

    expect(response.status).toBe(405);
  });
  it('should return 200 for email identifier', async () => {
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
    expect(data.data).toHaveProperty('accessToken');
    expect(data.data).toHaveProperty('refreshToken');
    expect(data.data).toHaveProperty('user');
    expect(data.data.user).toEqual(
      expect.objectContaining({
        ...user,
      }),
    );
    expect(data.data.user).not.toHaveProperty('password_hash');
    expect(data.data.user).not.toHaveProperty('password');
    expect(typeof data.data.accessToken).toBe('string');
    expect(data.data.accessToken.length).toBeGreaterThan(0);
    expect(typeof data.data.refreshToken).toBe('string');
    expect(data.data.refreshToken.length).toBeGreaterThan(0);
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
    expect(data.data).toHaveProperty('accessToken');
    expect(data.data).toHaveProperty('refreshToken');
    expect(data.data).toHaveProperty('user');
    expect(data.data.user).toEqual(
      expect.objectContaining({
        ...user,
      }),
    );
    expect(data.data.user).not.toHaveProperty('password_hash');
    expect(data.data.user).not.toHaveProperty('password');
    expect(typeof data.data.accessToken).toBe('string');
    expect(data.data.accessToken.length).toBeGreaterThan(0);
    expect(typeof data.data.refreshToken).toBe('string');
    expect(data.data.refreshToken.length).toBeGreaterThan(0);
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
  it('should return 429 for too many requests', async () => {
    for (let i = 0; i < 5; i++) {
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: user.email,
          password: 'wrong-password',
        }),
      });

      expect(response.status).toBe(401);
    }

    const response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: user.email,
        password: 'wrong-password',
      }),
    });

    expect(response.status).toBe(429);
  });

  it('should rotate refresh token', async () => {
    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: user.email, password }),
    });

    expect(loginResponse.status).toBe(200);
    const loginData = await loginResponse.json();
    const oldRefreshToken = loginData.data.refreshToken;

    const refreshResponse = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: oldRefreshToken }),
    });

    expect(refreshResponse.status).toBe(200);

    const refreshData = await refreshResponse.json();

    expect(refreshData.data.accessToken).toBeTruthy();
    expect(refreshData.data.refreshToken).toBeTruthy();
    expect(refreshData.data.refreshToken).not.toBe(oldRefreshToken);

    const oldTokenResponse = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: oldRefreshToken }),
    });

    expect(oldTokenResponse.status).toBe(401);
  });

  it('should revoke session on logout', async () => {
    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: user.email, password }),
    });

    expect(loginResponse.status).toBe(200);
    const loginData = await loginResponse.json();

    const logoutResponse = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refreshToken: loginData.data.refreshToken,
      }),
    });

    expect(logoutResponse.status).toBe(200);

    const refreshResponse = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refreshToken: loginData.data.refreshToken,
      }),
    });

    expect(refreshResponse.status).toBe(401);
  });
});
