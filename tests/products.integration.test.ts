import { createApp } from '../src/app.js';
import { beforeAll, beforeEach, afterAll, expect, it, describe } from 'vitest';
import { clearProducts } from '../src/repositories/products.repository.js';
import { pool } from '../src/database/pool.js';
import { generateJWT } from '../src/services/jwt.js';

let adminToken: string;
let customerToken: string;

beforeEach(async () => {
  await clearProducts();
});

const app = createApp();
let port: number;
let baseUrl: string;

let categoryId: number;

beforeAll(async () => {
  const result = await pool.query(
    `INSERT INTO categories (name)
     VALUES ($1)
     RETURNING id`,
    ['Categoria de teste'],
  );

  const category = result.rows[0];
  if (!category) {
    throw new Error('Could not create the product test category.');
  }
  categoryId = category.id;

  await new Promise<void>((resolve) => {
    app.listen(0, resolve);
  });

  const address = app.address();

  if (address && typeof address !== 'string') {
    port = address.port;
  } else {
    throw new Error('Could not determine the test server address.');
  }

  baseUrl = `http://127.0.0.1:${port}`;
  adminToken = await generateJWT('product-test-admin', 'admin');
  customerToken = await generateJWT('product-test-customer', 'customer');
});

afterAll(async () => {
  try {
    await clearProducts();
    await pool.query('DELETE FROM categories WHERE id = $1', [categoryId]);
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

describe('Products API integration', () => {
  it('should fetch /health', async () => {
    const response = await fetch(`${baseUrl}/health`);

    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);

    const data = await response.json();

    expect(data).toBeDefined();
    expect(data.status).toBe('ok');
  });

  it.each([
    ['missing', undefined, 401, 'Unauthorized'],
    ['invalid', 'invalid-token', 401, 'Unauthorized'],
    ['customer', () => `Bearer ${customerToken}`, 403, 'Forbidden'],
  ])('rejects product creation with %s credentials', async (_, authorization, status, error) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authorization) {
      headers.Authorization = typeof authorization === 'function' ? authorization() : authorization;
    }

    const response = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'Unauthorized product', price: 10, category: categoryId }),
    });

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error });
  });

  it.each([
    ['GET', '/products'],
    ['GET', '/products/550e8400-e29b-41d4-a716-446655440000'],
    ['PATCH', '/products/550e8400-e29b-41d4-a716-446655440000'],
    ['DELETE', '/products/550e8400-e29b-41d4-a716-446655440000'],
  ])('rejects %s %s without a valid token', async (method, path) => {
    for (const headers of [{}, { Authorization: 'invalid' }]) {
      const response = await fetch(`${baseUrl}${path}`, { method, headers });

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'Unauthorized' });
    }
  });

  it('should create /products', async () => {
    const product = { name: 'Test Product', price: 10, category: categoryId };
    const response = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(product),
    });

    expect(response.status).toBe(201);

    const data = await response.json();

    expect(data.product.id).toEqual(expect.any(String));
    expect(data).toEqual({
      message: 'Product created',
      product: expect.objectContaining(product),
    });
  });

  it('should fail to create a product with invalid name', async () => {
    const product = {
      name: '',
      price: 10,
      category: categoryId,
    };
    const response = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(product),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toEqual({
      error: 'Invalid product data',
    });
  });

  it('should reject a product with a missing category', async () => {
    const response = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ name: 'Orphan product', price: 10, category: 2_147_483_647 }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid product data' });
  });

  it.each([
    [{ name: 'a'.repeat(101), price: 10, category: categoryId }],
    [{ name: 'Valid name', price: 100_000_000, category: categoryId }],
    [{ name: 'Valid name', price: 10.001, category: categoryId }],
  ])('should reject product values outside database limits', async (product) => {
    const response = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(product),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid product data' });
  });

  it('should fetch a product by id', async () => {
    const product = { name: 'Test Product', price: 10, category: categoryId };
    const createResponse = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(product),
    });

    expect(createResponse.status).toBe(201);

    const createdData = await createResponse.json();
    const productId = createdData.product.id;

    const response = await fetch(`${baseUrl}/products/${productId}`, {
      headers: {
        Authorization: `Bearer ${customerToken}`,
      },
    });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toEqual({
      product: expect.objectContaining(product),
    });
    expect(data.product.id).toEqual(productId);
  });

  it('should fail to fetch a product with invalid id', async () => {
    const invalidId = '00000000-0000-0000-0000-000000000000';
    const response = await fetch(`${baseUrl}/products/${invalidId}`, {
      headers: {
        Authorization: `Bearer ${customerToken}`,
      },
    });

    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data).toEqual({
      error: 'Product not found',
    });
  });

  it('should reject a malformed product UUID', async () => {
    const response = await fetch(`${baseUrl}/products/invalid-id`, {
      headers: {
        Authorization: `Bearer ${customerToken}`,
      },
    });

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data).toEqual({
      error: 'Invalid product ID',
    });
  });

  it('should update a product by id', async () => {
    const product = { name: 'Test Product', price: 10, category: categoryId };
    const createResponse = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(product),
    });

    expect(createResponse.status).toBe(201);

    const createdData = await createResponse.json();
    const productId = createdData.product.id;

    const updatedProduct = { name: 'Updated Product' };
    const updateResponse = await fetch(`${baseUrl}/products/${productId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(updatedProduct),
    });

    expect(updateResponse.status).toBe(200);

    const data = await updateResponse.json();
    expect(data).toEqual({
      message: 'Product updated',
      product: expect.objectContaining(updatedProduct),
    });
    expect(data.product.id).toEqual(productId);

    const productUpdated = await fetch(`${baseUrl}/products/${productId}`, {
      headers: {
        Authorization: `Bearer ${customerToken}`,
      },
    });
    const productUpdatedData = await productUpdated.json();
    expect(productUpdated.status).toBe(200);
    expect(productUpdatedData).toEqual({
      product: {
        name: 'Updated Product',
        price: 10,
        category: categoryId,
        id: productId,
      },
    });
  });

  it('should fail to update a product with invalid id', async () => {
    const updatedProduct = { name: 'Updated Product' };
    const invalidId = '00000000-0000-0000-0000-000000000000';
    const response = await fetch(`${baseUrl}/products/${invalidId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(updatedProduct),
    });

    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data).toEqual({
      error: 'Product not found',
    });
  });

  it('should reject a malformed product UUID when updating', async () => {
    const response = await fetch(`${baseUrl}/products/not-a-uuid`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ name: 'Updated Product' }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid product ID' });
  });

  it('should fail to update a product with invalid data', async () => {
    const product = { name: 'Test Product', price: 10, category: categoryId };
    const createResponse = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(product),
    });

    expect(createResponse.status).toBe(201);

    const createdData = await createResponse.json();
    const productId = createdData.product.id;

    const invalidUpdate = { price: -10 };
    const response = await fetch(`${baseUrl}/products/${productId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(invalidUpdate),
    });

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data).toEqual({
      error: 'Invalid product data or update failed',
    });
  });

  it('should fail to create product with invalid JSON', async () => {
    const response = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: '{ price: }',
    });

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data).toEqual({
      error: 'Invalid JSON',
    });
  });

  it('should return a list of products', async () => {
    const product = { name: 'Test Product', price: 10, category: categoryId };
    const createResponse = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(product),
    });
    expect(createResponse.status).toBe(201);

    const anotherProduct = { name: 'Another Test Product', price: 20, category: categoryId };
    const anotherCreateResponse = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(anotherProduct),
    });
    expect(anotherCreateResponse.status).toBe(201);

    const response = await fetch(`${baseUrl}/products`, {
      headers: {
        Authorization: `Bearer ${customerToken}`,
      },
    });
    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.products.length).toBeGreaterThanOrEqual(2);
    expect(data.products).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Test Product', price: 10, category: categoryId }),
        expect.objectContaining({ name: 'Another Test Product', price: 20, category: categoryId }),
      ]),
    );
  });
});
