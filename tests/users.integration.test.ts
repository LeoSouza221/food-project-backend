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
const payload = { name: 'Usuário integração', phone: '44999999999', address };

const post = (body: unknown) =>
  fetch(`${baseUrl}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const createUser = async () => {
  const response = await post(payload);
  expect(response.status).toBe(201);
  const data = await response.json();
  userIds.push(data.user.id);
  return data.user as { id: string };
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
    const user = await createUser();

    expect(user).toEqual({ id: expect.any(String), ...payload });
  });

  it('rejects invalid data and malformed JSON', async () => {
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
    const created = await createUser();

    const listResponse = await fetch(`${baseUrl}/users`);
    expect(listResponse.status).toBe(200);
    expect(await listResponse.json()).toEqual({
      users: expect.arrayContaining([expect.objectContaining({ id: created.id })]),
    });

    const getResponse = await fetch(`${baseUrl}/users/${created.id}`);
    expect(getResponse.status).toBe(200);
    expect(await getResponse.json()).toEqual({ user: { id: created.id, ...payload } });
  });

  it('returns 400 for invalid IDs and 404 for unknown users', async () => {
    const invalid = await fetch(`${baseUrl}/users/abc`);
    expect(invalid.status).toBe(400);

    const missing = await fetch(`${baseUrl}/users/123e4567-e89b-42d3-a456-426614174999`);
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: 'User not found' });
  });

  it('updates a user', async () => {
    const created = await createUser();
    const newAddress = { ...address, city: 'Londrina', state: 'SP' };

    const response = await fetch(`${baseUrl}/users/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '4433334444', address: newAddress }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: 'User updated',
      user: { id: created.id, ...payload, phone: '4433334444', address: newAddress },
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
