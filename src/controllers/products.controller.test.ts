import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import {
  listProductByIdController,
  listProductsController,
  updateProductController,
} from './products.controller.js';
import { createProduct, updateProduct } from '../services/product.service.js';
import * as productService from '../services/product.service.js';

vi.mock('../services/product.service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/product.service.js')>();
  return {
    ...actual,
    getProducts: vi
      .fn()
      .mockResolvedValue([{ name: 'Hambúrguer', price: 25.9, category: 1, id: '1' }]),
    getProductById: vi.fn().mockImplementation(async (id) => {
      if (id === '1') {
        return { name: 'Hambúrguer', price: 25.9, category: 1, id: '1' };
      }
      throw new Error('Product not found');
    }),
    updateProduct: vi.fn().mockImplementation(async (id, updates) => {
      if (id === '1') {
        return {
          id: '1',
          name: updates.name ?? 'Hambúrguer',
          price: updates.price ?? 25.9,
          category: updates.category ?? 1,
        };
      }
      throw new Error('Product not found.');
    }),
  };
});

let resolveResponse!: () => void;
let responseEnded: Promise<void>;

beforeEach(() => {
  responseEnded = new Promise<void>((resolve) => {
    resolveResponse = resolve;
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('listProductByIdController', () => {
  it('should return the product when it exists', async () => {
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;
    const product = { name: 'Hambúrguer', price: 25.9, category: 1, id: '1' };

    await listProductByIdController(res, product.id);
    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalled(); // optionally check if the response ended
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ product }));
  });

  it('should return 404 when the product does not exist', async () => {
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;

    vi.mocked(productService.getProductById).mockRejectedValueOnce(new Error('Product not found.'));
    await listProductByIdController(res, '00000000-0000-0000-0000-000000000000');

    expect(res.writeHead).toHaveBeenCalledWith(404, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Product not found' }));
  });

  it('should return 500 when there is an internal server error', async () => {
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;

    vi.mocked(productService.getProductById).mockRejectedValueOnce(
      new Error('Internal Server Error'),
    );
    await listProductByIdController(res, 'non-existing-id');

    expect(res.writeHead).toHaveBeenCalledWith(500, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Internal Server Error' }));
  });

  it('should return 400 when the product ID is invalid', async () => {
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;

    await listProductByIdController(res, '');

    expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Product ID is required' }));
  });

  it('should return 500 when there is an internal server error', async () => {
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;

    vi.mocked(productService.getProductById).mockRejectedValueOnce(
      new Error('Internal Server Error'),
    );
    await listProductByIdController(res, '1');

    expect(res.writeHead).toHaveBeenCalledWith(500, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Internal Server Error' }));
  });
});

describe('listProductsController', () => {
  it('should return a list of products', async () => {
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;
    const product = { name: 'Hambúrguer', price: 25.9, category: 1, id: '1' };

    await listProductsController(res);
    const responseBody = res.end.mock.calls[0][0];
    const parsedResponse = JSON.parse(responseBody);

    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' });
    expect(parsedResponse).toEqual({
      products: expect.arrayContaining([expect.objectContaining(product)]),
    });
  });

  it('should return an empty list when there are no products', async () => {
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;

    vi.mocked(productService.getProducts).mockResolvedValue([]);
    await listProductsController(res);

    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ products: [] }));
  });

  it('should return 500 when there is an internal server error', async () => {
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;

    vi.mocked(productService.getProducts).mockRejectedValueOnce(new Error('Internal Server Error'));
    await listProductsController(res);

    expect(res.writeHead).toHaveBeenCalledWith(500, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Internal Server Error' }));
  });
});

describe('updateProductController', () => {
  it('should update a product successfully', async () => {
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(() => resolveResponse()),
    } as unknown as ServerResponse;
    const productId = '1';
    const req = new EventEmitter() as IncomingMessage;
    const updatedData = { name: 'X-Salada', price: 10.0, category: 1 };

    await updateProductController(req, res, productId);

    req.emit('data', Buffer.from(JSON.stringify(updatedData)));
    req.emit('end');
    await responseEnded;

    const responseBody = res.end.mock.calls[0][0];
    const parsedResponse = JSON.parse(responseBody);

    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' });
    expect(parsedResponse).toEqual({
      message: 'Product updated',
      product: expect.objectContaining(updatedData),
    });
    expect(vi.mocked(updateProduct)).toHaveBeenCalledWith(productId, updatedData);
  });

  it('should update a product partially', async () => {
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(() => resolveResponse()),
    } as unknown as ServerResponse;
    const product = { name: 'Hambúrguer', price: 25.9, category: 1 };
    const productId = '1';
    const req = new EventEmitter() as IncomingMessage;
    const updatedData = { price: 15.0 };

    await updateProductController(req, res, productId);

    req.emit('data', Buffer.from(JSON.stringify(updatedData)));
    req.emit('end');
    await responseEnded;

    const responseBody = res.end.mock.calls[0][0];
    const parsedResponse = JSON.parse(responseBody);

    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' });
    expect(parsedResponse).toEqual({
      message: 'Product updated',
      product: expect.objectContaining({ ...product, ...updatedData }),
    });
  });

  it('should return 400 when the product ID is missing', async () => {
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;
    const req = new EventEmitter() as IncomingMessage;
    const id = '';

    await updateProductController(req, res, id);

    expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Product ID is required' }));
  });

  it('should return 404 for a non-existent product ID', async () => {
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(() => resolveResponse()),
    } as unknown as ServerResponse;
    const id = 'non-existent-id';
    const updatedData = { name: 'X-Salada', price: 10.0, category: 1 };
    const req = new EventEmitter() as IncomingMessage;

    await updateProductController(req, res, id);

    req.emit('data', Buffer.from(JSON.stringify(updatedData)));
    req.emit('end');
    await responseEnded;

    expect(res.writeHead).toHaveBeenCalledWith(404, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Product not found' }));
  });

  it('should return 400 when the updated name is empty', async () => {
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(() => resolveResponse()),
    } as unknown as ServerResponse;
    const productId = '1';
    const updatedData = { name: '', price: 10.0, category: 1 };
    const req = new EventEmitter() as IncomingMessage;

    vi.mocked(updateProduct).mockRejectedValueOnce(
      new Error('Invalid product data or update failed'),
    );

    await updateProductController(req, res, productId);

    req.emit('data', Buffer.from(JSON.stringify(updatedData)));
    req.emit('end');
    await responseEnded;

    expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ error: 'Invalid product data or update failed' }),
    );
  });

  it('should return 400 when the updated price is negative', async () => {
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(() => resolveResponse()),
    } as unknown as ServerResponse;
    const productId = '1';
    const updatedData = { name: 'Hambúrguer', price: -10.0, category: 1 };
    const req = new EventEmitter() as IncomingMessage;

    vi.mocked(updateProduct).mockRejectedValueOnce(
      new Error('Invalid product data or update failed'),
    );

    await updateProductController(req, res, productId);

    req.emit('data', Buffer.from(JSON.stringify(updatedData)));
    req.emit('end');
    await responseEnded;

    expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ error: 'Invalid product data or update failed' }),
    );
  });

  it('should return 400 when the updated category is invalid', async () => {
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(() => resolveResponse()),
    } as unknown as ServerResponse;
    const productId = '1';
    const updatedData = { name: 'Hambúrguer', price: 10.0, category: -1 };
    const req = new EventEmitter() as IncomingMessage;
    vi.mocked(updateProduct).mockRejectedValueOnce(
      new Error('Invalid product data or update failed'),
    );
    await updateProductController(req, res, productId);

    req.emit('data', Buffer.from(JSON.stringify(updatedData)));
    req.emit('end');
    await responseEnded;

    expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ error: 'Invalid product data or update failed' }),
    );
  });

  it('should return 400 when the request body contains invalid JSON', async () => {
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(() => resolveResponse()),
    } as unknown as ServerResponse;
    const productId = '1';
    const req = new EventEmitter() as IncomingMessage;

    await updateProductController(req, res, productId);

    req.emit('data', Buffer.from('{ price: }'));
    req.emit('end');
    await responseEnded;

    expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Invalid JSON' }));
  });
});
