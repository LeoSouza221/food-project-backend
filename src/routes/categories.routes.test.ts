import type { IncomingMessage, ServerResponse } from 'node:http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createCategoryController,
  deleteCategoryController,
  getCategoryByIdController,
  listCategoriesController,
  updateCategoryController,
} from '../controllers/category.controller.js';
import { verifyJWT } from '../services/jwt.js';
import { categoriesRoutes } from './categories.routes.js';

vi.mock('../controllers/category.controller.js', () => ({
  createCategoryController: vi.fn(),
  deleteCategoryController: vi.fn(),
  getCategoryByIdController: vi.fn(),
  listCategoriesController: vi.fn(),
  updateCategoryController: vi.fn(),
}));

vi.mock('../services/jwt.js', () => ({ verifyJWT: vi.fn() }));

const createRequest = (method: string, authorization?: string) =>
  ({ method, headers: authorization ? { authorization } : {} }) as IncomingMessage;
const createResponse = () =>
  ({
    writeHead: vi.fn(),
    end: vi.fn(),
  }) as unknown as ServerResponse;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(verifyJWT).mockReset();
  vi.mocked(verifyJWT).mockResolvedValue({ sub: 'admin-id', role: 'admin' });
});

describe('categoriesRoutes', () => {
  it.each(['customer', 'admin'] as const)(
    'dispatches GET /categories to the list controller for an authenticated %s',
    async (role) => {
      const req = createRequest('GET', 'Bearer valid-token');
      const res = createResponse();
      vi.mocked(verifyJWT).mockResolvedValueOnce({ sub: 'user-id', role });

      await categoriesRoutes(req, res, ['categories']);

      expect(listCategoriesController).toHaveBeenCalledOnce();
      expect(listCategoriesController).toHaveBeenCalledWith(res);
      expect(req).toHaveProperty('auth', { userId: 'user-id', role });
    },
  );

  it.each(['customer', 'admin'] as const)(
    'dispatches GET /categories/:id to the detail controller for an authenticated %s',
    async (role) => {
      const req = createRequest('GET', 'Bearer valid-token');
      const res = createResponse();
      vi.mocked(verifyJWT).mockResolvedValueOnce({ sub: 'user-id', role });

      await categoriesRoutes(req, res, ['categories', '123']);

      expect(getCategoryByIdController).toHaveBeenCalledOnce();
      expect(getCategoryByIdController).toHaveBeenCalledWith(res, '123');
      expect(req).toHaveProperty('auth', { userId: 'user-id', role });
    },
  );

  it('dispatches POST /categories with an authenticated admin to the create controller', async () => {
    const req = createRequest('POST', 'Bearer admin-token');
    const res = createResponse();

    await categoriesRoutes(req, res, ['categories']);

    expect(verifyJWT).toHaveBeenCalledWith('admin-token');
    expect(createCategoryController).toHaveBeenCalledOnce();
    expect(createCategoryController).toHaveBeenCalledWith(req, res);
    expect(req).toHaveProperty('auth', { userId: 'admin-id', role: 'admin' });
  });

  it.each([
    ['missing', undefined],
    ['malformed', 'Bearer'],
    ['invalid', 'Bearer invalid-token'],
  ])(
    'returns 401 for a %s token without calling the create controller',
    async (_, authorization) => {
      const req = createRequest('POST', authorization);
      const res = createResponse();
      vi.mocked(verifyJWT).mockRejectedValueOnce(new Error('Invalid token'));

      await categoriesRoutes(req, res, ['categories']);

      expect(res.writeHead).toHaveBeenCalledWith(401, { 'Content-Type': 'application/json' });
      expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Unauthorized' }));
      expect(createCategoryController).not.toHaveBeenCalled();
    },
  );

  it('returns 403 for an authenticated customer without calling the create controller', async () => {
    const req = createRequest('POST', 'Bearer customer-token');
    const res = createResponse();
    vi.mocked(verifyJWT).mockResolvedValueOnce({ sub: 'customer-id', role: 'customer' });

    await categoriesRoutes(req, res, ['categories']);

    expect(res.writeHead).toHaveBeenCalledWith(403, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Forbidden' }));
    expect(createCategoryController).not.toHaveBeenCalled();
  });

  it('dispatches PATCH /categories/:id to the update controller', async () => {
    const req = createRequest('PATCH', 'Bearer admin-token');
    const res = createResponse();

    await categoriesRoutes(req, res, ['categories', '123']);

    expect(updateCategoryController).toHaveBeenCalledOnce();
    expect(updateCategoryController).toHaveBeenCalledWith(req, res, '123');
    expect(req).toHaveProperty('auth', { userId: 'admin-id', role: 'admin' });
  });

  it('dispatches DELETE /categories/:id to the delete controller', async () => {
    const req = createRequest('DELETE', 'Bearer admin-token');
    const res = createResponse();

    await categoriesRoutes(req, res, ['categories', '123']);

    expect(deleteCategoryController).toHaveBeenCalledOnce();
    expect(deleteCategoryController).toHaveBeenCalledWith(res, '123');
    expect(req).toHaveProperty('auth', { userId: 'admin-id', role: 'admin' });
  });

  it.each([
    ['GET', ['categories']],
    ['GET', ['categories', '123']],
    ['PATCH', ['categories', '123']],
    ['DELETE', ['categories', '123']],
  ])('returns 401 for unauthenticated %s %j', async (method, segments) => {
    const res = createResponse();

    await categoriesRoutes(createRequest(method), res, segments);

    expect(res.writeHead).toHaveBeenCalledWith(401, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Unauthorized' }));
    expect(listCategoriesController).not.toHaveBeenCalled();
    expect(getCategoryByIdController).not.toHaveBeenCalled();
    expect(updateCategoryController).not.toHaveBeenCalled();
    expect(deleteCategoryController).not.toHaveBeenCalled();
  });

  it.each([
    ['GET', ['categories']],
    ['GET', ['categories', '123']],
    ['PATCH', ['categories', '123']],
    ['DELETE', ['categories', '123']],
  ])('returns 401 for an invalid token on %s %j', async (method, segments) => {
    const res = createResponse();
    vi.mocked(verifyJWT).mockRejectedValueOnce(new Error('Invalid token'));

    await categoriesRoutes(createRequest(method, 'Bearer invalid-token'), res, segments);

    expect(res.writeHead).toHaveBeenCalledWith(401, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Unauthorized' }));
    expect(listCategoriesController).not.toHaveBeenCalled();
    expect(getCategoryByIdController).not.toHaveBeenCalled();
    expect(updateCategoryController).not.toHaveBeenCalled();
    expect(deleteCategoryController).not.toHaveBeenCalled();
  });

  it.each(['PATCH', 'DELETE'])(
    'returns 403 for a customer on %s /categories/:id',
    async (method) => {
      const res = createResponse();
      vi.mocked(verifyJWT).mockResolvedValueOnce({ sub: 'customer-id', role: 'customer' });

      await categoriesRoutes(createRequest(method, 'Bearer customer-token'), res, [
        'categories',
        '123',
      ]);

      expect(res.writeHead).toHaveBeenCalledWith(403, { 'Content-Type': 'application/json' });
      expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Forbidden' }));
      expect(updateCategoryController).not.toHaveBeenCalled();
      expect(deleteCategoryController).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['POST', ['categories', '123']],
    ['PATCH', ['categories']],
    ['PATCH', ['categories', '']],
    ['PATCH', ['categories', '123', 'extra']],
    ['DELETE', ['categories']],
    ['DELETE', ['categories', '']],
    ['DELETE', ['categories', '123', 'extra']],
  ])('returns 400 for malformed %s route', async (method, segments) => {
    const req = createRequest(method);
    const res = createResponse();

    await categoriesRoutes(req, res, segments);

    expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Bad Request' }));
    expect(createCategoryController).not.toHaveBeenCalled();
    expect(deleteCategoryController).not.toHaveBeenCalled();
    expect(getCategoryByIdController).not.toHaveBeenCalled();
    expect(listCategoriesController).not.toHaveBeenCalled();
    expect(updateCategoryController).not.toHaveBeenCalled();
    expect(verifyJWT).not.toHaveBeenCalled();
  });

  it.each([
    ['categories', '123', 'extra'],
    ['categories', ''],
  ])('returns 400 for a malformed GET route after authentication: %j', async (...segments) => {
    const res = createResponse();

    await categoriesRoutes(createRequest('GET', 'Bearer admin-token'), res, segments);

    expect(verifyJWT).toHaveBeenCalledWith('admin-token');
    expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Bad Request' }));
    expect(listCategoriesController).not.toHaveBeenCalled();
    expect(getCategoryByIdController).not.toHaveBeenCalled();
  });

  it('returns 401 before validating a malformed GET route without a token', async () => {
    const res = createResponse();

    await categoriesRoutes(createRequest('GET'), res, ['categories', '123', 'extra']);

    expect(res.writeHead).toHaveBeenCalledWith(401, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Unauthorized' }));
    expect(listCategoriesController).not.toHaveBeenCalled();
    expect(getCategoryByIdController).not.toHaveBeenCalled();
  });

  it('returns 405 for unsupported methods', async () => {
    const req = createRequest('PUT');
    const res = createResponse();

    await categoriesRoutes(req, res, ['categories', '123']);

    expect(res.writeHead).toHaveBeenCalledWith(405, {
      'Content-Type': 'application/json',
      Allow: 'GET, POST, PATCH, DELETE',
    });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Method Not Allowed' }));
  });
});
