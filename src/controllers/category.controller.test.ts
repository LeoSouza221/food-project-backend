import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createCategoryController,
  deleteCategoryController,
  getCategoryByIdController,
  listCategoriesController,
  updateCategoryController,
} from './category.controller.js';
import * as categoryService from '../services/category.service.js';

vi.mock('../services/category.service.js', () => ({
  createCategory: vi.fn(),
  getCategories: vi.fn(),
  getCategoryById: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}));

const category = { id: 1, name: 'Lanches' };

const createResponse = () => {
  let resolveResponse!: () => void;
  const responseEnded = new Promise<void>((resolve) => {
    resolveResponse = resolve;
  });
  const res = {
    writeHead: vi.fn(),
    end: vi.fn(() => resolveResponse()),
  } as unknown as ServerResponse;

  return { res, responseEnded };
};

const createRequest = () => new EventEmitter() as IncomingMessage;

const sendBody = async (
  controller: (req: IncomingMessage, res: ServerResponse) => unknown,
  body: string,
) => {
  const req = createRequest();
  const { res, responseEnded } = createResponse();
  controller(req, res);
  req.emit('data', Buffer.from(body));
  req.emit('end');
  await responseEnded;
  return res;
};

beforeEach(() => {
  vi.mocked(categoryService.createCategory).mockResolvedValue(category);
  vi.mocked(categoryService.getCategories).mockResolvedValue([category]);
  vi.mocked(categoryService.getCategoryById).mockResolvedValue(category);
  vi.mocked(categoryService.updateCategory).mockResolvedValue(category);
  vi.mocked(categoryService.deleteCategory).mockResolvedValue();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('listCategoriesController', () => {
  it('returns all categories', async () => {
    const { res } = createResponse();

    await listCategoriesController(res);

    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ categories: [category] }));
  });

  it('returns an empty list when there are no categories', async () => {
    vi.mocked(categoryService.getCategories).mockResolvedValue([]);
    const { res } = createResponse();

    await listCategoriesController(res);

    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ categories: [] }));
  });

  it('returns 500 when the service fails', async () => {
    vi.mocked(categoryService.getCategories).mockRejectedValue(new Error('Database unavailable'));
    const { res } = createResponse();

    await listCategoriesController(res);

    expect(res.writeHead).toHaveBeenCalledWith(500, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Internal Server Error' }));
  });
});

describe('getCategoryByIdController', () => {
  it('returns a category by ID', async () => {
    const { res } = createResponse();

    await getCategoryByIdController(res, '1');

    expect(categoryService.getCategoryById).toHaveBeenCalledWith(1);
    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ category }));
  });

  it('returns 400 when the ID is missing', async () => {
    const { res } = createResponse();

    await getCategoryByIdController(res, '');

    expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Category ID is required' }));
    expect(categoryService.getCategoryById).not.toHaveBeenCalled();
  });

  it.each(['abc', '0', '-1', '1.5', '2147483648'])('returns 400 for invalid ID %s', async (id) => {
    const { res } = createResponse();

    await getCategoryByIdController(res, id);

    expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Invalid category ID' }));
    expect(categoryService.getCategoryById).not.toHaveBeenCalled();
  });

  it('returns 404 when the category does not exist', async () => {
    vi.mocked(categoryService.getCategoryById).mockRejectedValue(new Error('Category not found.'));
    const { res } = createResponse();

    await getCategoryByIdController(res, '99');

    expect(res.writeHead).toHaveBeenCalledWith(404, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Category not found' }));
  });

  it('returns 500 for unexpected service errors', async () => {
    vi.mocked(categoryService.getCategoryById).mockRejectedValue(new Error('Database unavailable'));
    const { res } = createResponse();

    await getCategoryByIdController(res, '1');

    expect(res.writeHead).toHaveBeenCalledWith(500, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Internal Server Error' }));
  });
});

describe('createCategoryController', () => {
  it('creates a category', async () => {
    const res = await sendBody(
      (req, response) => createCategoryController(req, response),
      JSON.stringify({ name: 'Lanches' }),
    );

    expect(categoryService.createCategory).toHaveBeenCalledWith({ name: 'Lanches' });
    expect(res.writeHead).toHaveBeenCalledWith(201, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ message: 'Category created', category }));
  });

  it('returns 400 for invalid JSON', async () => {
    const res = await sendBody(
      (req, response) => createCategoryController(req, response),
      '{ name: }',
    );

    expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Invalid JSON' }));
    expect(categoryService.createCategory).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid category data', async () => {
    vi.mocked(categoryService.createCategory).mockRejectedValue(new Error('Invalid category data'));
    const res = await sendBody(
      (req, response) => createCategoryController(req, response),
      JSON.stringify({ name: '' }),
    );

    expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Invalid category data' }));
  });

  it('returns 500 when category persistence fails', async () => {
    vi.mocked(categoryService.createCategory).mockRejectedValue(new Error('Database unavailable'));
    const res = await sendBody(
      (req, response) => createCategoryController(req, response),
      JSON.stringify({ name: 'Lanches' }),
    );

    expect(res.writeHead).toHaveBeenCalledWith(500, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Internal Server Error' }));
  });
});

describe('updateCategoryController', () => {
  it('updates a category', async () => {
    const res = await sendBody(
      (req, response) => updateCategoryController(req, response, '1'),
      JSON.stringify({ name: 'Bebidas' }),
    );

    expect(categoryService.updateCategory).toHaveBeenCalledWith(1, { name: 'Bebidas' });
    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ message: 'Category updated', category }));
  });

  it('returns 400 for a missing ID', () => {
    const req = createRequest();
    const { res } = createResponse();

    updateCategoryController(req, res, '');

    expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Category ID is required' }));
  });

  it.each(['abc', '0', '-1', '1.5', '2147483648'])('returns 400 for invalid ID %s', (id) => {
    const req = createRequest();
    const { res } = createResponse();

    updateCategoryController(req, res, id);

    expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Invalid category ID' }));
    expect(categoryService.updateCategory).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid JSON', async () => {
    const res = await sendBody(
      (req, response) => updateCategoryController(req, response, '1'),
      '{ name: }',
    );

    expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Invalid JSON' }));
    expect(categoryService.updateCategory).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid update data', async () => {
    vi.mocked(categoryService.updateCategory).mockRejectedValue(
      new Error('Invalid category update data'),
    );
    const res = await sendBody(
      (req, response) => updateCategoryController(req, response, '1'),
      JSON.stringify({ name: '' }),
    );

    expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ error: 'Invalid category data or update failed' }),
    );
  });

  it('returns 404 when the category does not exist', async () => {
    vi.mocked(categoryService.updateCategory).mockRejectedValue(new Error('Category not found.'));
    const res = await sendBody(
      (req, response) => updateCategoryController(req, response, '99'),
      JSON.stringify({ name: 'Bebidas' }),
    );

    expect(res.writeHead).toHaveBeenCalledWith(404, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Category not found' }));
  });

  it('returns 500 for unexpected update errors', async () => {
    vi.mocked(categoryService.updateCategory).mockRejectedValue(new Error('Database unavailable'));
    const res = await sendBody(
      (req, response) => updateCategoryController(req, response, '1'),
      JSON.stringify({ name: 'Bebidas' }),
    );

    expect(res.writeHead).toHaveBeenCalledWith(500, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Internal Server Error' }));
  });
});

describe('deleteCategoryController', () => {
  it('deletes a category', async () => {
    const { res } = createResponse();

    await deleteCategoryController(res, '1');

    expect(categoryService.deleteCategory).toHaveBeenCalledWith(1);
    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ message: 'Category deleted' }));
  });

  it('returns 400 for a missing ID', async () => {
    const { res } = createResponse();

    await deleteCategoryController(res, '');

    expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Category ID is required' }));
  });

  it.each(['abc', '0', '-1', '1.5', '2147483648'])('returns 400 for invalid ID %s', async (id) => {
    const { res } = createResponse();

    await deleteCategoryController(res, id);

    expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Invalid category ID' }));
    expect(categoryService.deleteCategory).not.toHaveBeenCalled();
  });

  it('returns 404 when the category does not exist', async () => {
    vi.mocked(categoryService.deleteCategory).mockRejectedValue(new Error('Category not found.'));
    const { res } = createResponse();

    await deleteCategoryController(res, '99');

    expect(res.writeHead).toHaveBeenCalledWith(404, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Category not found' }));
  });

  it('returns 500 for unexpected service errors', async () => {
    vi.mocked(categoryService.deleteCategory).mockRejectedValue(new Error('Database unavailable'));
    const { res } = createResponse();

    await deleteCategoryController(res, '1');

    expect(res.writeHead).toHaveBeenCalledWith(500, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Internal Server Error' }));
  });
});
