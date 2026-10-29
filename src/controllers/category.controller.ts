import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from '../services/category.service.js';

export const listCategoriesController = async (res: ServerResponse) => {
  try {
    const categories = await getCategories();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ categories }));
  } catch {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
};

export const getCategoryByIdController = async (res: ServerResponse, categoryId: string) => {
  if (!categoryId) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Category ID is required' }));
  }

  const id = Number(categoryId);
  if (!Number.isInteger(id) || id <= 0) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Invalid category ID' }));
  }

  try {
    const category = await getCategoryById(id);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ category }));
  } catch (error) {
    if (error instanceof Error && error.message === 'Category not found.') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Category not found' }));
    }

    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
};

export const createCategoryController = async (req: IncomingMessage, res: ServerResponse) => {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(body);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid JSON' }));
    }

    try {
      const category = await createCategory(parsedBody);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ message: 'Category created', category }));
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid category data' }));
    }
  });
};

export const updateCategoryController = (
  req: IncomingMessage,
  res: ServerResponse,
  categoryId: string,
) => {
  if (!categoryId) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Category ID is required' }));
  }

  const id = Number(categoryId);
  if (!Number.isInteger(id) || id <= 0) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Invalid category ID' }));
  }

  let body = '';
  req.on('data', (chunk) => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(body);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid JSON' }));
    }

    try {
      const category = await updateCategory(id, parsedBody);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ message: 'Category updated', category }));
    } catch (error) {
      if (error instanceof Error && error.message === 'Category not found.') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Category not found' }));
      }

      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid category data or update failed' }));
    }
  });
};

export const deleteCategoryController = async (res: ServerResponse, categoryId: string) => {
  if (!categoryId) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Category ID is required' }));
  }

  const id = Number(categoryId);
  if (!Number.isInteger(id) || id <= 0) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Invalid category ID' }));
  }

  try {
    await deleteCategory(id);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ message: 'Category deleted' }));
  } catch (error) {
    if (error instanceof Error && error.message === 'Category not found.') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Category not found' }));
    }

    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
};
