import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { pool } from '../src/database/pool.js';

const app = createApp();
const userIds: string[] = [];
let baseUrl: string;

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
  userIds.push(data.user.id);
  return { ...(data.user as { id: string }), payload };
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
});

afterAll(async () => {
  try {
    if (userIds.length > 0) {
      await pool.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [userIds]);
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

describe('Users API integration', () => {
  it('creates a user with a nested address', async () => {
    const { payload, ...user } = await createUser();

    expect(user).toEqual({ id: expect.any(String), role: 'customer', ...payload });
    expect(user).not.toHaveProperty('password');
    expect(user).not.toHaveProperty('password_hash');
  });

  it('stores the password only as a hash', async () => {
    const created = await createUser();
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [
      created.id,
    ]);

    expect(rows[0].password_hash).toMatch(/^scrypt\$/);
    expect(rows[0].password_hash).not.toContain(password);
  });

  it('normalizes the email to lowercase', async () => {
    const payload = buildPayload();
    const response = await post({
      ...payload,
      email: payload.email.toUpperCase(),
      password,
    });
    const data = await response.json();
    userIds.push(data.user.id);

    expect(response.status).toBe(201);
    expect(data.user.email).toBe(payload.email);
  });

  it('normalizes extra spaces and lowercase state before saving', async () => {
    const payload = buildPayload();
    const response = await post({
      ...payload,
      name: '  Maria   da   Silva ',
      email: `  ${payload.email.toUpperCase()}  `,
      password,
      address: {
        street: '  Rua   das   Flores ',
        number: ' 12   B ',
        city: ' Foz   do  Iguaçu ',
        state: 'pr',
        neighborhood: '  Vila   Nova ',
      },
    });
    const data = await response.json();
    userIds.push(data.user.id);

    expect(response.status).toBe(201);
    expect(data.user).toEqual({
      id: expect.any(String),
      role: 'customer',
      name: 'Maria da Silva',
      email: payload.email,
      phone: payload.phone,
      address: {
        street: 'Rua das Flores',
        number: '12 B',
        city: 'Foz do Iguaçu',
        state: 'PR',
        neighborhood: 'Vila Nova',
      },
    });
  });

  it('rejects duplicate email and phone with 409', async () => {
    const { payload } = await createUser();

    const sameEmail = await post({ ...buildPayload(), email: payload.email, password });
    expect(sameEmail.status).toBe(409);
    expect(await sameEmail.json()).toEqual({ error: 'Email already in use' });

    const samePhone = await post({ ...buildPayload(), phone: payload.phone, password });
    expect(samePhone.status).toBe(409);
    expect(await samePhone.json()).toEqual({ error: 'Phone already in use' });
  });

  it('rejects role, missing or weak password', async () => {
    const base = { ...buildPayload(), password };

    expect((await post({ ...base, role: 'admin' })).status).toBe(400);
    expect((await post({ ...base, password: undefined })).status).toBe(400);
    expect((await post({ ...base, password: '123' })).status).toBe(400);
    expect((await post({ ...base, email: 'invalid' })).status).toBe(400);
  });

  it('rejects invalid data and malformed JSON', async () => {
    const payload = { ...buildPayload(), password };
    const invalidState = await post({ ...payload, address: { ...address, state: 'XX' } });
    expect(invalidState.status).toBe(400);
    expect(await invalidState.json()).toEqual({ error: 'Invalid user data' });

    const invalidPhone = await post({ ...payload, phone: '(44) 99999-9999' });
    expect(invalidPhone.status).toBe(400);

    const invalidJson = await fetch(`${baseUrl}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ name: }',
    });
    expect(invalidJson.status).toBe(400);
    expect(await invalidJson.json()).toEqual({ error: 'Invalid JSON' });
  });

  it('lists users and retrieves one by ID', async () => {
    const { payload, ...created } = await createUser();

    const listResponse = await fetch(`${baseUrl}/users`);
    expect(listResponse.status).toBe(200);
    expect(await listResponse.json()).toEqual({
      users: expect.arrayContaining([expect.objectContaining({ id: created.id })]),
    });

    const getResponse = await fetch(`${baseUrl}/users/${created.id}`);
    expect(getResponse.status).toBe(200);
    expect(await getResponse.json()).toEqual({
      user: { id: created.id, role: 'customer', ...payload },
    });
  });

  it('returns 400 for invalid IDs and 404 for unknown users', async () => {
    const invalid = await fetch(`${baseUrl}/users/abc`);
    expect(invalid.status).toBe(400);

    const missing = await fetch(`${baseUrl}/users/123e4567-e89b-42d3-a456-426614174999`);
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: 'User not found' });
  });

  it('updates a user', async () => {
    const { payload, ...created } = await createUser();
    const newAddress = { ...address, city: 'Londrina', state: 'SP' };

    const response = await fetch(`${baseUrl}/users/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '4433334444', address: newAddress }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: 'User updated',
      user: {
        id: created.id,
        role: 'customer',
        ...payload,
        phone: '4433334444',
        address: newAddress,
      },
    });

    const invalid = await fetch(`${baseUrl}/users/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: { ...address, state: 'ZZ' } }),
    });
    expect(invalid.status).toBe(400);
  });

  it('deletes a user', async () => {
    const created = await createUser();

    const response = await fetch(`${baseUrl}/users/${created.id}`, { method: 'DELETE' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: 'User deleted' });

    const again = await fetch(`${baseUrl}/users/${created.id}`, { method: 'DELETE' });
    expect(again.status).toBe(404);
  });
});
