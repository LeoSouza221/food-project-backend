import { createApp } from './app.js';
import { beforeAll, afterAll, expect, it, describe } from 'vitest';

const app = createApp();
let port: number;

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    app.listen(0, resolve);
  });

  const address = app.address();

  if (address && typeof address !== 'string') {
    port = address.port;
  }
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    app.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
});

describe('App', () => {
  it('should fetch /health', async () => {
    const response = await fetch(`http://localhost:${port}/health`);

    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);

    const data = await response.json();

    expect(data).toBeDefined();
    expect(data.status).toBe('ok');
  });

  it('should create /products', async () => {
    const product = { name: 'Test Product', price: 10, category: 1 };
    const response = await fetch(`http://localhost:${port}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(product),
    });

    expect(response.status).toBe(201);

    const data = await response.json();

    expect(data.body.id).toEqual(expect.any(String));
    expect(data).toEqual({
      message: 'Product received',
      body: expect.objectContaining(product),
    });
  });

  it('should fail to create a product with invalid name', async () => {
    const product = {
      name: '',
      price: 10,
      category: 1,
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

  it('should fetch a product by id', async () => {
    const product = { name: 'Test Product', price: 10, category: 1 };
    const createResponse = await fetch(`http://localhost:${port}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(product),
    });

    expect(createResponse.status).toBe(201);

    const createdData = await createResponse.json();
    const productId = createdData.body.id;

    const response = await fetch(`http://localhost:${port}/products/${productId}`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toEqual({
      product: expect.objectContaining(product),
    });
    expect(data.product.id).toEqual(productId);
  });

  it('should fail to fetch a product with invalid id', async () => {
    const response = await fetch(`http://localhost:${port}/products/invalid-id`);
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data).toEqual({
      error: 'Product not found',
    });
  });

  it('should update a product by id', async () => {
    const product = { name: 'Test Product', price: 10, category: 1 };
    const createResponse = await fetch(`http://localhost:${port}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(product),
    });

    expect(createResponse.status).toBe(201);

    const createdData = await createResponse.json();
    const productId = createdData.body.id;

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
      body: expect.objectContaining(updatedProduct),
    });
    expect(data.body.id).toEqual(productId);

    const productUpdated = await fetch(`http://localhost:${port}/products/${productId}`);
    const productUpdatedData = await productUpdated.json();
    expect(productUpdated.status).toBe(200);
    expect(productUpdatedData).toEqual({
      product: {
        name: 'Updated Product',
        price: 10,
        category: 1,
        id: productId,
      },
    });
  });

  it('should fail to update a product with invalid id', async () => {
    const updatedProduct = { name: 'Updated Product' };
    const response = await fetch(`http://localhost:${port}/products/invalid-id`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedProduct),
    });

    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data).toEqual({
      error: 'Product not found or update failed',
    });
  });

  it('should fail to update a product with invalid data', async () => {
    const product = { name: 'Test Product', price: 10, category: 1 };
    const createResponse = await fetch(`http://localhost:${port}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(product),
    });

    expect(createResponse.status).toBe(201);

    const createdData = await createResponse.json();
    const productId = createdData.body.id;

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
    const product = { name: 'Test Product', price: 10, category: 1 };
    const createResponse = await fetch(`http://localhost:${port}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(product),
    });
    expect(createResponse.status).toBe(201);

    const anotherProduct = { name: 'Another Test Product', price: 20, category: 2 };
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
        expect.objectContaining({ name: 'Test Product', price: 10, category: 1 }),
        expect.objectContaining({ name: 'Another Test Product', price: 20, category: 2 }),
      ]),
    );
  });
});
