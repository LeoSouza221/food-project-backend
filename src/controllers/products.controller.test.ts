import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  listProductByIdController,
  listProductsController,
  updateProductController,
} from './products.controller.js';
import { createProduct } from '../services/product.service.js';
import * as productService from '../services/product.service.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('listProductByIdController', () => {
  it('should return the product when it exists', () => {
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;
    const product = { name: 'Hambúrguer', price: 25.9, category: 1 };
    const createdProduct = createProduct(product);

    listProductByIdController(res, createdProduct.id);

    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalled(); // optionally check if the response ended
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ product: createdProduct }));
  });

  it('should return 404 when the product does not exist', () => {
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;

    listProductByIdController(res, 'non-existing-id');

    expect(res.writeHead).toHaveBeenCalledWith(404, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Product not found' }));
  });

  it('should return 400 when the product ID is invalid', () => {
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;

    listProductByIdController(res, '');

    expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Product ID is required' }));
  });
});

describe('listProductsController', () => {
  it('should return a list of products', () => {
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;
    const product = { name: 'Hambúrguer', price: 25.9, category: 1 };
    createProduct(product);

    listProductsController(res);
    const responseBody = res.end.mock.calls[0][0];
    const parsedResponse = JSON.parse(responseBody);

    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' });
    expect(parsedResponse).toEqual({
      products: expect.arrayContaining([expect.objectContaining(product)]),
    });
  });

  it('should return an empty list when there are no products', () => {
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;

    vi.spyOn(productService, 'getProducts').mockReturnValue([]);
    listProductsController(res);

    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ products: [] }));
  });
});

describe('updateProductController', () => {
  it('should update a product successfully', () => {
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;
    const product = { name: 'Hambúrguer', price: 25.9, category: 1 };
    const createdProduct = createProduct(product);
    const req = new EventEmitter() as IncomingMessage;
    const updatedData = { name: 'X-Salada', price: 10.0, category: 1 };

    updateProductController(req, res, createdProduct.id);

    req.emit('data', Buffer.from(JSON.stringify(updatedData)));
    req.emit('end');

    const responseBody = res.end.mock.calls[0][0];
    const parsedResponse = JSON.parse(responseBody);

    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' });
    expect(parsedResponse).toEqual({
      message: 'Product updated',
      body: expect.objectContaining(updatedData),
    });
  });

  it('should update a product partially', () => {
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;
    const product = { name: 'Hambúrguer', price: 25.9, category: 1 };
    const createdProduct = createProduct(product);
    const req = new EventEmitter() as IncomingMessage;
    const updatedData = { price: 15.0 };

    updateProductController(req, res, createdProduct.id);

    req.emit('data', Buffer.from(JSON.stringify(updatedData)));
    req.emit('end');

    const responseBody = res.end.mock.calls[0][0];
    const parsedResponse = JSON.parse(responseBody);

    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' });
    expect(parsedResponse).toEqual({
      message: 'Product updated',
      body: expect.objectContaining({ ...product, ...updatedData }),
    });
  });

  it('should return 400 when the product ID is missing', () => {
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;
    const req = new EventEmitter() as IncomingMessage;
    const id = '';

    updateProductController(req, res, id);

    expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Product ID is required' }));
  });

  it('should return 404 for a non-existent product ID', () => {
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;
    const id = 'non-existent-id';
    const updatedData = { name: 'X-Salada', price: 10.0, category: 1 };
    const req = new EventEmitter() as IncomingMessage;

    updateProductController(req, res, id);

    req.emit('data', Buffer.from(JSON.stringify(updatedData)));
    req.emit('end');

    expect(res.writeHead).toHaveBeenCalledWith(404, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ error: 'Product not found or update failed' }),
    );
  });

  it('should return 400 when the updated name is empty', () => {
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;
    const product = { name: 'Hambúrguer', price: 25.9, category: 1 };
    const createdProduct = createProduct(product);
    const updatedData = { name: '', price: 10.0, category: 1 };
    const req = new EventEmitter() as IncomingMessage;

    updateProductController(req, res, createdProduct.id);

    req.emit('data', Buffer.from(JSON.stringify(updatedData)));
    req.emit('end');

    expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ error: 'Invalid product data or update failed' }),
    );
  });

  it('should return 400 when the updated price is negative', () => {
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;
    const product = { name: 'Hambúrguer', price: 25.9, category: 1 };
    const createdProduct = createProduct(product);
    const updatedData = { name: 'Hambúrguer', price: -10.0, category: 1 };
    const req = new EventEmitter() as IncomingMessage;

    updateProductController(req, res, createdProduct.id);

    req.emit('data', Buffer.from(JSON.stringify(updatedData)));
    req.emit('end');

    expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ error: 'Invalid product data or update failed' }),
    );
  });

  it('should return 400 when the updated category is invalid', () => {
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;
    const product = { name: 'Hambúrguer', price: 25.9, category: 1 };
    const createdProduct = createProduct(product);
    const updatedData = { name: 'Hambúrguer', price: 10.0, category: -1 };
    const req = new EventEmitter() as IncomingMessage;

    updateProductController(req, res, createdProduct.id);

    req.emit('data', Buffer.from(JSON.stringify(updatedData)));
    req.emit('end');

    expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ error: 'Invalid product data or update failed' }),
    );
  });

  it('should return 400 when the request body contains invalid JSON', () => {
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;
    const product = { name: 'Hambúrguer', price: 25.9, category: 1 };
    const createdProduct = createProduct(product);
    const req = new EventEmitter() as IncomingMessage;

    updateProductController(req, res, createdProduct.id);

    req.emit('data', Buffer.from('{ price: }'));
    req.emit('end');

    expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Invalid JSON' }));
  });
});
