import type { IncomingMessage, ServerResponse } from 'node:http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createCategoryController,
  deleteCategoryController,
  getCategoryByIdController,
  listCategoriesController,
  updateCategoryController,
} from '../controllers/category.controller.js';
import { categoriesRoutes } from './categories.routes.js';

vi.mock('../controllers/category.controller.js', () => ({
  createCategoryController: vi.fn(),
  deleteCategoryController: vi.fn(),
  getCategoryByIdController: vi.fn(),
  listCategoriesController: vi.fn(),
  updateCategoryController: vi.fn(),
}));

const createRequest = (method: string) => ({ method }) as IncomingMessage;
const createResponse = () =>
  ({
    writeHead: vi.fn(),
    end: vi.fn(),
  }) as unknown as ServerResponse;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('categoriesRoutes', () => {
  it('dispatches GET /categories to the list controller', () => {
    const req = createRequest('GET');
    const res = createResponse();

    categoriesRoutes(req, res, ['categories']);

    expect(listCategoriesController).toHaveBeenCalledOnce();
    expect(listCategoriesController).toHaveBeenCalledWith(res);
  });

  it('dispatches GET /categories/:id to the detail controller', () => {
    const req = createRequest('GET');
    const res = createResponse();

    categoriesRoutes(req, res, ['categories', '123']);

    expect(getCategoryByIdController).toHaveBeenCalledOnce();
    expect(getCategoryByIdController).toHaveBeenCalledWith(res, '123');
  });

  it('dispatches POST /categories to the create controller', () => {
    const req = createRequest('POST');
    const res = createResponse();

    categoriesRoutes(req, res, ['categories']);

    expect(createCategoryController).toHaveBeenCalledOnce();
    expect(createCategoryController).toHaveBeenCalledWith(req, res);
  });

  it('dispatches PATCH /categories/:id to the update controller', () => {
    const req = createRequest('PATCH');
    const res = createResponse();

    categoriesRoutes(req, res, ['categories', '123']);

    expect(updateCategoryController).toHaveBeenCalledOnce();
    expect(updateCategoryController).toHaveBeenCalledWith(req, res, '123');
  });

  it('dispatches DELETE /categories/:id to the delete controller', () => {
    const req = createRequest('DELETE');
    const res = createResponse();

    categoriesRoutes(req, res, ['categories', '123']);

    expect(deleteCategoryController).toHaveBeenCalledOnce();
    expect(deleteCategoryController).toHaveBeenCalledWith(res, '123');
  });

  it.each([
    ['GET', ['categories', '123', 'extra']],
    ['POST', ['categories', '123']],
    ['PATCH', ['categories']],
    ['PATCH', ['categories', '123', 'extra']],
    ['DELETE', ['categories']],
    ['DELETE', ['categories', '123', 'extra']],
  ])('returns 400 for malformed %s route', (method, segments) => {
    const req = createRequest(method);
    const res = createResponse();

    categoriesRoutes(req, res, segments);

    expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Bad Request' }));
    expect(createCategoryController).not.toHaveBeenCalled();
    expect(deleteCategoryController).not.toHaveBeenCalled();
    expect(getCategoryByIdController).not.toHaveBeenCalled();
    expect(listCategoriesController).not.toHaveBeenCalled();
    expect(updateCategoryController).not.toHaveBeenCalled();
  });

  it('returns 405 for unsupported methods', () => {
    const req = createRequest('PUT');
    const res = createResponse();

    categoriesRoutes(req, res, ['categories', '123']);

    expect(res.writeHead).toHaveBeenCalledWith(405, {
      'Content-Type': 'application/json',
      Allow: 'GET, POST, PATCH, DELETE',
    });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Method Not Allowed' }));
  });
});
