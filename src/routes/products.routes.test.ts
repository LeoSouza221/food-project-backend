import { productsRoutes } from './products.routes.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  listProductByIdController,
  listProductsController,
  createProductController,
  updateProductController,
  deleteProductController,
} from '../controllers/products.controller.js';
import * as requireAuthModule from '../middlewares/require-auth.js';

vi.mock('../controllers/products.controller.js', () => ({
  listProductsController: vi.fn(),
  listProductByIdController: vi.fn(),
  createProductController: vi.fn(),
  updateProductController: vi.fn(),
  deleteProductController: vi.fn(),
}));

vi.mock('../middlewares/require-auth.js', () => ({
  requireAuth: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('productsRoutes', () => {
  describe('GET /products - list all products', () => {
    it('should authenticate customer and call list controller', async () => {
      const customerReq = {
        auth: {
          userId: 'customer-id',
          role: 'customer',
        },
      };
      const req = { method: 'GET' } as IncomingMessage;
      const res = {
        writeHead: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse;
      const segments = ['products'];

      vi.mocked(requireAuthModule.requireAuth).mockResolvedValue(customerReq as never);

      await productsRoutes(req, res, segments);

      expect(requireAuthModule.requireAuth).toHaveBeenCalledWith(req, res, ['admin', 'customer']);
      expect(listProductsController).toHaveBeenCalledWith(res);
    });

    it('should authenticate admin and call list controller', async () => {
      const adminReq = {
        auth: {
          userId: 'admin-id',
          role: 'admin',
        },
      };
      const req = { method: 'GET' } as IncomingMessage;
      const res = {
        writeHead: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse;
      const segments = ['products'];

      vi.mocked(requireAuthModule.requireAuth).mockResolvedValue(adminReq as never);

      await productsRoutes(req, res, segments);

      expect(listProductsController).toHaveBeenCalledWith(res);
    });

    it('should return 401 if not authenticated', async () => {
      const req = { method: 'GET' } as IncomingMessage;
      const res = {
        writeHead: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse;
      const segments = ['products'];

      vi.mocked(requireAuthModule.requireAuth).mockResolvedValue(null);

      await productsRoutes(req, res, segments);

      expect(listProductsController).not.toHaveBeenCalled();
    });

    it('should return 400 for malformed route', async () => {
      const req = { method: 'GET' } as IncomingMessage;
      const res = {
        writeHead: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse;
      const segments = ['products', '123', 'extra'];

      await productsRoutes(req, res, segments);

      expect(requireAuthModule.requireAuth).not.toHaveBeenCalled();
      expect(res.writeHead).toHaveBeenCalledWith(400, {
        'Content-Type': 'application/json',
      });
      expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Bad Request' }));
    });
  });

  describe('GET /products/:id - get product by id', () => {
    it('should authenticate customer and call get by id controller', async () => {
      const customerReq = {
        auth: {
          userId: 'customer-id',
          role: 'customer',
        },
      };
      const req = { method: 'GET' } as IncomingMessage;
      const res = {
        writeHead: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse;
      const segments = ['products', '123'];

      vi.mocked(requireAuthModule.requireAuth).mockResolvedValue(customerReq as never);

      await productsRoutes(req, res, segments);

      expect(requireAuthModule.requireAuth).toHaveBeenCalledWith(req, res, ['admin', 'customer']);
      expect(listProductByIdController).toHaveBeenCalledWith(res, '123');
    });

    it('should authenticate admin and call get by id controller', async () => {
      const adminReq = {
        auth: {
          userId: 'admin-id',
          role: 'admin',
        },
      };
      const req = { method: 'GET' } as IncomingMessage;
      const res = {
        writeHead: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse;
      const segments = ['products', '456'];

      vi.mocked(requireAuthModule.requireAuth).mockResolvedValue(adminReq as never);

      await productsRoutes(req, res, segments);

      expect(listProductByIdController).toHaveBeenCalledWith(res, '456');
    });

    it('should return 401 if not authenticated', async () => {
      const req = { method: 'GET' } as IncomingMessage;
      const res = {
        writeHead: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse;
      const segments = ['products', '123'];

      vi.mocked(requireAuthModule.requireAuth).mockResolvedValue(null);

      await productsRoutes(req, res, segments);

      expect(listProductByIdController).not.toHaveBeenCalled();
    });

    it('should return 400 for malformed route with extra segments', async () => {
      const req = { method: 'GET' } as IncomingMessage;
      const res = {
        writeHead: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse;
      const segments = ['products', '123', 'extra'];

      await productsRoutes(req, res, segments);

      expect(requireAuthModule.requireAuth).not.toHaveBeenCalled();
      expect(res.writeHead).toHaveBeenCalledWith(400, {
        'Content-Type': 'application/json',
      });
    });
  });

  describe('POST /products - create product', () => {
    it('should authenticate and only allow admin', async () => {
      const adminReq = {
        auth: {
          userId: 'admin-id',
          role: 'admin',
        },
      };
      const req = { method: 'POST' } as IncomingMessage;
      const res = {
        writeHead: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse;
      const segments = ['products'];

      vi.mocked(requireAuthModule.requireAuth).mockResolvedValue(adminReq as never);

      await productsRoutes(req, res, segments);

      expect(requireAuthModule.requireAuth).toHaveBeenCalledWith(req, res, ['admin']);
      expect(createProductController).toHaveBeenCalledWith(adminReq, res);
    });

    it('should not call controller if not authenticated', async () => {
      const req = { method: 'POST' } as IncomingMessage;
      const res = {
        writeHead: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse;
      const segments = ['products'];

      vi.mocked(requireAuthModule.requireAuth).mockResolvedValue(null);

      await productsRoutes(req, res, segments);

      expect(createProductController).not.toHaveBeenCalled();
    });

    it('should return 400 for malformed route before authentication', async () => {
      const req = { method: 'POST' } as IncomingMessage;
      const res = {
        writeHead: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse;
      const segments = ['products', 'extra'];

      await productsRoutes(req, res, segments);

      expect(requireAuthModule.requireAuth).not.toHaveBeenCalled();
      expect(createProductController).not.toHaveBeenCalled();
      expect(res.writeHead).toHaveBeenCalledWith(400, {
        'Content-Type': 'application/json',
      });
    });
  });

  describe('PATCH /products/:id - update product', () => {
    it('should authenticate and only allow admin', async () => {
      const adminReq = {
        auth: {
          userId: 'admin-id',
          role: 'admin',
        },
      };
      const req = { method: 'PATCH' } as IncomingMessage;
      const res = {
        writeHead: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse;
      const segments = ['products', '123'];

      vi.mocked(requireAuthModule.requireAuth).mockResolvedValue(adminReq as never);

      await productsRoutes(req, res, segments);

      expect(requireAuthModule.requireAuth).toHaveBeenCalledWith(req, res, ['admin']);
      expect(updateProductController).toHaveBeenCalledWith(adminReq, res, '123');
    });

    it('should not call controller if not authenticated', async () => {
      const req = { method: 'PATCH' } as IncomingMessage;
      const res = {
        writeHead: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse;
      const segments = ['products', '123'];

      vi.mocked(requireAuthModule.requireAuth).mockResolvedValue(null);

      await productsRoutes(req, res, segments);

      expect(updateProductController).not.toHaveBeenCalled();
    });

    it('should return 400 for malformed route before authentication', async () => {
      const req = { method: 'PATCH' } as IncomingMessage;
      const res = {
        writeHead: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse;
      const segments = ['products', '123', 'extra'];

      await productsRoutes(req, res, segments);

      expect(requireAuthModule.requireAuth).not.toHaveBeenCalled();
      expect(updateProductController).not.toHaveBeenCalled();
      expect(res.writeHead).toHaveBeenCalledWith(400, {
        'Content-Type': 'application/json',
      });
    });

    it('should return 400 when id is missing', async () => {
      const req = { method: 'PATCH' } as IncomingMessage;
      const res = {
        writeHead: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse;
      const segments = ['products'];

      await productsRoutes(req, res, segments);

      expect(requireAuthModule.requireAuth).not.toHaveBeenCalled();
      expect(updateProductController).not.toHaveBeenCalled();
      expect(res.writeHead).toHaveBeenCalledWith(400, {
        'Content-Type': 'application/json',
      });
    });
  });

  describe('DELETE /products/:id - delete product', () => {
    it('should authenticate and only allow admin', async () => {
      const adminReq = {
        auth: {
          userId: 'admin-id',
          role: 'admin',
        },
      };
      const req = { method: 'DELETE' } as IncomingMessage;
      const res = {
        writeHead: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse;
      const segments = ['products', '123'];

      vi.mocked(requireAuthModule.requireAuth).mockResolvedValue(adminReq as never);

      await productsRoutes(req, res, segments);

      expect(requireAuthModule.requireAuth).toHaveBeenCalledWith(req, res, ['admin']);
      expect(deleteProductController).toHaveBeenCalledWith(res, '123');
    });

    it('should not call controller if not authenticated', async () => {
      const req = { method: 'DELETE' } as IncomingMessage;
      const res = {
        writeHead: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse;
      const segments = ['products', '123'];

      vi.mocked(requireAuthModule.requireAuth).mockResolvedValue(null);

      await productsRoutes(req, res, segments);

      expect(deleteProductController).not.toHaveBeenCalled();
    });

    it('should return 400 for malformed route before authentication', async () => {
      const req = { method: 'DELETE' } as IncomingMessage;
      const res = {
        writeHead: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse;
      const segments = ['products', '123', 'extra'];

      await productsRoutes(req, res, segments);

      expect(requireAuthModule.requireAuth).not.toHaveBeenCalled();
      expect(deleteProductController).not.toHaveBeenCalled();
      expect(res.writeHead).toHaveBeenCalledWith(400, {
        'Content-Type': 'application/json',
      });
    });

    it('should return 400 when id is missing', async () => {
      const req = { method: 'DELETE' } as IncomingMessage;
      const res = {
        writeHead: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse;
      const segments = ['products'];

      await productsRoutes(req, res, segments);

      expect(requireAuthModule.requireAuth).not.toHaveBeenCalled();
      expect(deleteProductController).not.toHaveBeenCalled();
      expect(res.writeHead).toHaveBeenCalledWith(400, {
        'Content-Type': 'application/json',
      });
    });
  });

  describe('Unsupported methods', () => {
    it('should fail to call any controller for unsupported method', async () => {
      const req = { method: 'PUT' } as IncomingMessage;
      const res = {
        writeHead: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse;
      const segments = ['products', '123'];

      await productsRoutes(req, res, segments);

      expect(listProductsController).not.toHaveBeenCalled();
      expect(listProductByIdController).not.toHaveBeenCalled();
      expect(createProductController).not.toHaveBeenCalled();
      expect(updateProductController).not.toHaveBeenCalled();
      expect(deleteProductController).not.toHaveBeenCalled();
      expect(res.writeHead).toHaveBeenCalledWith(405, {
        Allow: 'GET, POST, PATCH, DELETE',
        'Content-Type': 'application/json',
      });
    });
  });
});
