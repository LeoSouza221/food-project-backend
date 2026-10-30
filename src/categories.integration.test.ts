import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { pool } from './database/pool.js';

const app = createApp();
const categoryIds: number[] = [];
let baseUrl: string;

const createCategory = async (name: string) => {
  const response = await fetch(`${baseUrl}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
});

afterAll(async () => {
  try {
    if (categoryIds.length > 0) {
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: ' ' }),
    });
    expect(invalidCategory.status).toBe(400);
    expect(await invalidCategory.json()).toEqual({ error: 'Invalid category data' });

    const invalidJson = await fetch(`${baseUrl}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ name: }',
    });
    expect(invalidJson.status).toBe(400);
    expect(await invalidJson.json()).toEqual({ error: 'Invalid JSON' });
  });

  it('lists categories and retrieves one by ID', async () => {
    const category = await createCategory('Bebidas integração');

    const listResponse = await fetch(`${baseUrl}/categories`);
    expect(listResponse.status).toBe(200);
    expect(await listResponse.json()).toEqual({
      categories: expect.arrayContaining([category]),
    });

    const detailResponse = await fetch(`${baseUrl}/categories/${category.id}`);
    expect(detailResponse.status).toBe(200);
    expect(await detailResponse.json()).toEqual({ category });
  });

  it('returns 400 for an invalid ID and 404 for a missing category', async () => {
    const invalidIdResponse = await fetch(`${baseUrl}/categories/not-an-id`);
    expect(invalidIdResponse.status).toBe(400);
    expect(await invalidIdResponse.json()).toEqual({ error: 'Invalid category ID' });

    const missingResponse = await fetch(`${baseUrl}/categories/2147483647`);
    expect(missingResponse.status).toBe(404);
    expect(await missingResponse.json()).toEqual({ error: 'Category not found' });
  });

  it('updates a category and rejects invalid updates', async () => {
    const category = await createCategory('Categoria antes');

    const updateResponse = await fetch(`${baseUrl}/categories/${category.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Categoria depois' }),
    });
    expect(updateResponse.status).toBe(200);
    expect(await updateResponse.json()).toEqual({
      message: 'Category updated',
      category: { id: category.id, name: 'Categoria depois' },
    });

    const invalidUpdateResponse = await fetch(`${baseUrl}/categories/${category.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
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
    });
    expect(deleteResponse.status).toBe(200);
    expect(await deleteResponse.json()).toEqual({ message: 'Category deleted' });

    const detailResponse = await fetch(`${baseUrl}/categories/${category.id}`);
    expect(detailResponse.status).toBe(404);
    expect(await detailResponse.json()).toEqual({ error: 'Category not found' });
  });
});
