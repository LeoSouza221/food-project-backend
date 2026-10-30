import { createApp } from '../src/app.js';
import { beforeAll, beforeEach, afterAll, expect, it, describe } from 'vitest';
import { clearProducts } from '../src/repositories/products.repository.js';
import { pool } from '../src/database/pool.js';

beforeEach(async () => {
  await clearProducts();
});

const app = createApp();
let port: number;

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
  }
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
    const response = await fetch(`http://localhost:${port}/health`);

    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);

    const data = await response.json();

    expect(data).toBeDefined();
    expect(data.status).toBe('ok');
  });

  it('should create /products', async () => {
    const product = { name: 'Test Product', price: 10, category: categoryId };
    const response = await fetch(`http://localhost:${port}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
    const response = await fetch(`http://localhost:${port}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
    const response = await fetch(`http://localhost:${port}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const response = await fetch(`http://localhost:${port}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid product data' });
  });

  it('should fetch a product by id', async () => {
    const product = { name: 'Test Product', price: 10, category: categoryId };
    const createResponse = await fetch(`http://localhost:${port}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(product),
    });

    expect(createResponse.status).toBe(201);

    const createdData = await createResponse.json();
    const productId = createdData.product.id;

    const response = await fetch(`http://localhost:${port}/products/${productId}`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toEqual({
      product: expect.objectContaining(product),
    });
    expect(data.product.id).toEqual(productId);
  });

  it('should fail to fetch a product with invalid id', async () => {
    const invalidId = '00000000-0000-0000-0000-000000000000';
    const response = await fetch(`http://localhost:${port}/products/${invalidId}`);

    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data).toEqual({
      error: 'Product not found',
    });
  });

  it('should reject a malformed product UUID', async () => {
    const response = await fetch(`http://localhost:${port}/products/invalid-id`);

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data).toEqual({
      error: 'Invalid product ID',
    });
  });

  it('should update a product by id', async () => {
    const product = { name: 'Test Product', price: 10, category: categoryId };
    const createResponse = await fetch(`http://localhost:${port}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(product),
    });

    expect(createResponse.status).toBe(201);

    const createdData = await createResponse.json();
    const productId = createdData.product.id;

    const updatedProduct = { name: 'Updated Product' };
    const updateResponse = await fetch(`http://localhost:${port}/products/${productId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
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

    const productUpdated = await fetch(`http://localhost:${port}/products/${productId}`);
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
    const response = await fetch(`http://localhost:${port}/products/${invalidId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
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
    const response = await fetch(`http://localhost:${port}/products/not-a-uuid`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Product' }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid product ID' });
  });

  it('should fail to update a product with invalid data', async () => {
    const product = { name: 'Test Product', price: 10, category: categoryId };
    const createResponse = await fetch(`http://localhost:${port}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(product),
    });

    expect(createResponse.status).toBe(201);

    const createdData = await createResponse.json();
    const productId = createdData.product.id;

    const invalidUpdate = { price: -10 };
    const response = await fetch(`http://localhost:${port}/products/${productId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
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
    const response = await fetch(`http://localhost:${port}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
    const createResponse = await fetch(`http://localhost:${port}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(product),
    });
    expect(createResponse.status).toBe(201);

    const anotherProduct = { name: 'Another Test Product', price: 20, category: categoryId };
    const anotherCreateResponse = await fetch(`http://localhost:${port}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(anotherProduct),
    });
    expect(anotherCreateResponse.status).toBe(201);

    const response = await fetch(`http://localhost:${port}/products`);
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
