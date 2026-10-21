import { productsRoutes } from './products.routes.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  listProductByIdController,
  listProductsController,
  createProductController,
  updateProductController,
} from '../controllers/products.controller.js';

vi.mock('../controllers/products.controller.js', () => ({
  listProductsController: vi.fn(),
  listProductByIdController: vi.fn(),
  createProductController: vi.fn(),
  updateProductController: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('productsRoutes', () => {
  it('should call the get products controller', () => {
    const req = {
      method: 'GET',
    } as IncomingMessage;
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;

    const segments = ['products'];

    productsRoutes(req, res, segments);
    expect(listProductsController).toHaveBeenCalled();
    expect(listProductsController).toHaveBeenCalledTimes(1);
    expect(listProductsController).toHaveBeenCalledWith(res);
  });

  it('should call the get product by id controller', () => {
    const req = {
      method: 'GET',
    } as IncomingMessage;
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;

    const segments = ['products', '123'];

    productsRoutes(req, res, segments);
    expect(listProductByIdController).toHaveBeenCalled();
    expect(listProductByIdController).toHaveBeenCalledTimes(1);
    expect(listProductByIdController).toHaveBeenCalledWith(res, '123');
  });

  it('should fail to call any controller for unsupported method', () => {
    const req = {
      method: 'DELETE',
    } as IncomingMessage;
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;

    const segments = ['products', '123'];

    productsRoutes(req, res, segments);
    expect(listProductsController).not.toHaveBeenCalled();
    expect(listProductByIdController).not.toHaveBeenCalled();
    expect(createProductController).not.toHaveBeenCalled();
    expect(updateProductController).not.toHaveBeenCalled();
    expect(res.writeHead).toHaveBeenCalledWith(405, {
      Allow: 'GET, POST, PATCH',
      'Content-Type': 'application/json',
    });
  });

  it('should fail to call a malformed route', () => {
    const req = {
      method: 'GET',
    } as IncomingMessage;
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;

    const segments = ['products', '123', 'extra'];

    productsRoutes(req, res, segments);
    expect(listProductsController).not.toHaveBeenCalled();
    expect(listProductByIdController).not.toHaveBeenCalled();
    expect(createProductController).not.toHaveBeenCalled();
    expect(updateProductController).not.toHaveBeenCalled();
    expect(res.writeHead).toHaveBeenCalledWith(400, {
      'Content-Type': 'application/json',
    });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Bad Request' }));
  });

  it('should call the create product controller', () => {
    const req = {
      method: 'POST',
    } as IncomingMessage;
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;

    const segments = ['products'];

    productsRoutes(req, res, segments);
    expect(createProductController).toHaveBeenCalled();
    expect(createProductController).toHaveBeenCalledTimes(1);
    expect(createProductController).toHaveBeenCalledWith(req, res);
  });

  it('should call the update product controller', () => {
    const req = {
      method: 'PATCH',
    } as IncomingMessage;
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;

    const segments = ['products', '123'];

    productsRoutes(req, res, segments);
    expect(updateProductController).toHaveBeenCalled();
    expect(updateProductController).toHaveBeenCalledTimes(1);
    expect(updateProductController).toHaveBeenCalledWith(req, res, '123');
  });

  it('should fail to call update product controller with malformed route', () => {
    const req = {
      method: 'PATCH',
    } as IncomingMessage;
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;

    const segments = ['products', '123', 'extra'];

    productsRoutes(req, res, segments);
    expect(updateProductController).not.toHaveBeenCalled();
    expect(res.writeHead).toHaveBeenCalledWith(400, {
      'Content-Type': 'application/json',
    });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Bad Request' }));
  });

  it('should fail to call the create product controller with malformed route', () => {
    const req = {
      method: 'POST',
    } as IncomingMessage;
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;

    const segments = ['products', 'extra'];

    productsRoutes(req, res, segments);
    expect(createProductController).not.toHaveBeenCalled();
    expect(res.writeHead).toHaveBeenCalledWith(400, {
      'Content-Type': 'application/json',
    });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Bad Request' }));
  });
});
