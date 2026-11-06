import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { pool } from '../src/database/pool.js';
import { generateJWT } from '../src/services/jwt.js';

const app = createApp();
const categoryIds: number[] = [];
let baseUrl: string;
let adminToken: string;
let customerToken: string;

const createCategory = async (name: string) => {
  const response = await fetch(`${baseUrl}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ name }),
  });

  expect(response.status).toBe(201);
  const data = await response.json();
  categoryIds.push(data.category.id);
  return data.category as { id: number; name: string };
};

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    app.listen(0, resolve);
  });

  const address = app.address();
  if (!address || typeof address === 'string') {
    throw new Error('Could not determine the test server address.');
  }

  baseUrl = `http://127.0.0.1:${address.port}`;
  adminToken = await generateJWT('category-test-admin', 'admin');
  customerToken = await generateJWT('category-test-customer', 'customer');
});

afterAll(async () => {
  try {
    if (categoryIds.length > 0) {
      await pool.query('DELETE FROM products WHERE category_id = ANY($1::int[])', [categoryIds]);

      await pool.query('DELETE FROM categories WHERE id = ANY($1::int[])', [categoryIds]);
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

describe('Categories API integration', () => {
  it.each([
    ['missing', undefined, 401, 'Unauthorized'],
    ['invalid', 'Bearer invalid-token', 401, 'Unauthorized'],
    ['customer', () => `Bearer ${customerToken}`, 403, 'Forbidden'],
  ])('rejects category creation with %s credentials', async (_, authorization, status, error) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authorization) {
      headers.Authorization = typeof authorization === 'function' ? authorization() : authorization;
    }

    const response = await fetch(`${baseUrl}/categories`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'Unauthorized category' }),
    });

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error });
  });

  it.each([
    ['GET', '/categories'],
    ['GET', '/categories/1'],
    ['PATCH', '/categories/1'],
    ['DELETE', '/categories/1'],
  ])('rejects %s %s without a valid token', async (method, path) => {
    for (const headers of [{}, { Authorization: 'Bearer invalid-token' }]) {
      const response = await fetch(`${baseUrl}${path}`, { method, headers });

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'Unauthorized' });
    }
  });

  it.each(['PATCH', 'DELETE'])(
    'rejects %s for a customer without changing the category',
    async (method) => {
      const category = await createCategory(`Categoria protegida ${method}`);
      const response = await fetch(`${baseUrl}/categories/${category.id}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        ...(method === 'PATCH' ? { body: JSON.stringify({ name: 'Alteração proibida' }) } : {}),
      });

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: 'Forbidden' });

      const detail = await fetch(`${baseUrl}/categories/${category.id}`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      expect(detail.status).toBe(200);
      expect(await detail.json()).toEqual({ category });
    },
  );

  it('creates a category', async () => {
    const category = await createCategory('Lanches integração');

    expect(category).toEqual({
      id: expect.any(Number),
      name: 'Lanches integração',
    });
  });

  it('rejects invalid category data and malformed JSON', async () => {
    const invalidCategory = await fetch(`${baseUrl}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: ' ' }),
    });
    expect(invalidCategory.status).toBe(400);
    expect(await invalidCategory.json()).toEqual({ error: 'Invalid category data' });

    const invalidJson = await fetch(`${baseUrl}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: '{ name: }',
    });
    expect(invalidJson.status).toBe(400);
    expect(await invalidJson.json()).toEqual({ error: 'Invalid JSON' });
  });

  it.each(['customer', 'admin'] as const)(
    'lists categories and retrieves one by ID as %s',
    async (role) => {
      const category = await createCategory('Bebidas integração');
      const token = role === 'admin' ? adminToken : customerToken;

      const listResponse = await fetch(`${baseUrl}/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(listResponse.status).toBe(200);
      expect(await listResponse.json()).toEqual({
        categories: expect.arrayContaining([category]),
      });

      const detailResponse = await fetch(`${baseUrl}/categories/${category.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(detailResponse.status).toBe(200);
      expect(await detailResponse.json()).toEqual({ category });
    },
  );

  it('authenticates before rejecting a malformed GET path', async () => {
    const path = `${baseUrl}/categories/1/extra`;
    const unauthenticated = await fetch(path);
    expect(unauthenticated.status).toBe(401);
    expect(await unauthenticated.json()).toEqual({ error: 'Unauthorized' });

    const authenticated = await fetch(path, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    expect(authenticated.status).toBe(400);
    expect(await authenticated.json()).toEqual({ error: 'Bad Request' });
  });

  it('returns 400 for an invalid ID and 404 for a missing category', async () => {
    const invalidIdResponse = await fetch(`${baseUrl}/categories/not-an-id`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    expect(invalidIdResponse.status).toBe(400);
    expect(await invalidIdResponse.json()).toEqual({ error: 'Invalid category ID' });

    const missingResponse = await fetch(`${baseUrl}/categories/2147483647`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    expect(missingResponse.status).toBe(404);
    expect(await missingResponse.json()).toEqual({ error: 'Category not found' });
  });

  it('updates a category and rejects invalid updates', async () => {
    const category = await createCategory('Categoria antes');

    const updateResponse = await fetch(`${baseUrl}/categories/${category.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'Categoria depois' }),
    });
    expect(updateResponse.status).toBe(200);
    expect(await updateResponse.json()).toEqual({
      message: 'Category updated',
      category: { id: category.id, name: 'Categoria depois' },
    });

    const invalidUpdateResponse = await fetch(`${baseUrl}/categories/${category.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: '' }),
    });
    expect(invalidUpdateResponse.status).toBe(400);
    expect(await invalidUpdateResponse.json()).toEqual({
      error: 'Invalid category data or update failed',
    });
  });

  it('deletes a category and returns 404 when it does not exist', async () => {
    const category = await createCategory('Categoria para excluir');

    const deleteResponse = await fetch(`${baseUrl}/categories/${category.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(deleteResponse.status).toBe(200);
    expect(await deleteResponse.json()).toEqual({ message: 'Category deleted' });

    const detailResponse = await fetch(`${baseUrl}/categories/${category.id}`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    expect(detailResponse.status).toBe(404);
    expect(await detailResponse.json()).toEqual({ error: 'Category not found' });
  });

  it('does not delete a category that has linked products', async () => {
    const category = await createCategory('Categoria com produto');
    const productResponse = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Produto vinculado', price: 10, category: category.id }),
    });
    expect(productResponse.status).toBe(201);
    const { product } = (await productResponse.json()) as { product: { id: string } };

    try {
      const blockedResponse = await fetch(`${baseUrl}/categories/${category.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(blockedResponse.status).toBe(409);
      expect(await blockedResponse.json()).toEqual({ error: 'Category has linked products' });

      const detailResponse = await fetch(`${baseUrl}/categories/${category.id}`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      expect(detailResponse.status).toBe(200);
    } finally {
      await pool.query('DELETE FROM products WHERE id = $1', [product.id]);
    }

    const deleteResponse = await fetch(`${baseUrl}/categories/${category.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(deleteResponse.status).toBe(200);
  });

  it('accepts a name with 100 characters and rejects one with 101', async () => {
    const category = await createCategory('a'.repeat(100));
    expect(category.name).toHaveLength(100);

    const tooLongCreate = await fetch(`${baseUrl}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'a'.repeat(101) }),
    });
    expect(tooLongCreate.status).toBe(400);
    expect(await tooLongCreate.json()).toEqual({ error: 'Invalid category data' });

    const tooLongUpdate = await fetch(`${baseUrl}/categories/${category.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'b'.repeat(101) }),
    });
    expect(tooLongUpdate.status).toBe(400);

    const detail = await fetch(`${baseUrl}/categories/${category.id}`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    expect(await detail.json()).toEqual({ category });
  });

  it('rejects unknown properties on create and update', async () => {
    const createResponse = await fetch(`${baseUrl}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'Com extra', description: 'não permitido' }),
    });
    expect(createResponse.status).toBe(400);
    expect(await createResponse.json()).toEqual({ error: 'Invalid category data' });

    const category = await createCategory('Sem extra');
    const updateResponse = await fetch(`${baseUrl}/categories/${category.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'Novo', description: 'não permitido' }),
    });
    expect(updateResponse.status).toBe(400);
  });

  it.each([
    ['PUT', '/categories'],
    ['DELETE', '/categories'],
    ['PATCH', '/categories'],
    ['PUT', '/categories/1'],
    ['POST', '/categories/1'],
  ])('returns an error for %s %s', async (method, path) => {
    const response = await fetch(`${baseUrl}${path}`, { method });
    const expectedStatus = method === 'PUT' ? 405 : 400;

    expect(response.status).toBe(expectedStatus);
    if (expectedStatus === 405) {
      expect(response.headers.get('allow')).toBe('GET, POST, PATCH, DELETE');
      expect(await response.json()).toEqual({ error: 'Method Not Allowed' });
    }
  });
});
