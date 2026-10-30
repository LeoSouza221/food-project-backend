import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from '../services/category.service.js';
import { InvalidJsonBodyError, readJsonBody, sendJson } from '../http/json.js';

const isValidCategoryId = (id: number) => Number.isInteger(id) && id > 0 && id <= 2_147_483_647;

export const listCategoriesController = async (res: ServerResponse) => {
  try {
    const categories = await getCategories();
    return sendJson(res, 200, { categories });
  } catch {
    return sendJson(res, 500, { error: 'Internal Server Error' });
  }
};

export const getCategoryByIdController = async (res: ServerResponse, categoryId: string) => {
  if (!categoryId) {
    return sendJson(res, 400, { error: 'Category ID is required' });
  }

  const id = Number(categoryId);
  if (!isValidCategoryId(id)) {
    return sendJson(res, 400, { error: 'Invalid category ID' });
  }

  try {
    const category = await getCategoryById(id);
    return sendJson(res, 200, { category });
  } catch (error) {
    if (error instanceof Error && error.message === 'Category not found.') {
      return sendJson(res, 404, { error: 'Category not found' });
    }

    return sendJson(res, 500, { error: 'Internal Server Error' });
  }
};

export const createCategoryController = async (req: IncomingMessage, res: ServerResponse) => {
  let parsedBody: unknown;
  try {
    parsedBody = await readJsonBody(req);
  } catch (error) {
    if (error instanceof InvalidJsonBodyError) {
      return sendJson(res, 400, { error: 'Invalid JSON' });
    }

    return sendJson(res, 500, { error: 'Internal Server Error' });
  }

  try {
    const category = await createCategory(parsedBody);
    return sendJson(res, 201, { message: 'Category created', category });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid category data') {
      return sendJson(res, 400, { error: 'Invalid category data' });
    }

    return sendJson(res, 500, { error: 'Internal Server Error' });
  }
};

export const updateCategoryController = async (
  req: IncomingMessage,
  res: ServerResponse,
  categoryId: string,
) => {
  if (!categoryId) {
    return sendJson(res, 400, { error: 'Category ID is required' });
  }

  const id = Number(categoryId);
  if (!isValidCategoryId(id)) {
    return sendJson(res, 400, { error: 'Invalid category ID' });
  }

  let parsedBody: unknown;
  try {
    parsedBody = await readJsonBody(req);
  } catch (error) {
    if (error instanceof InvalidJsonBodyError) {
      return sendJson(res, 400, { error: 'Invalid JSON' });
    }

    return sendJson(res, 500, { error: 'Internal Server Error' });
  }

  try {
    const category = await updateCategory(id, parsedBody);
    return sendJson(res, 200, { message: 'Category updated', category });
  } catch (error) {
    if (error instanceof Error && error.message === 'Category not found.') {
      return sendJson(res, 404, { error: 'Category not found' });
    }

    if (error instanceof Error && error.message === 'Invalid category update data') {
      return sendJson(res, 400, { error: 'Invalid category data or update failed' });
    }

    return sendJson(res, 500, { error: 'Internal Server Error' });
  }
};

export const deleteCategoryController = async (res: ServerResponse, categoryId: string) => {
  if (!categoryId) {
    return sendJson(res, 400, { error: 'Category ID is required' });
  }

  const id = Number(categoryId);
  if (!isValidCategoryId(id)) {
    return sendJson(res, 400, { error: 'Invalid category ID' });
  }

  try {
    await deleteCategory(id);
    return sendJson(res, 200, { message: 'Category deleted' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Category not found.') {
      return sendJson(res, 404, { error: 'Category not found' });
    }

    if (error instanceof Error && error.message === 'Category has linked products.') {
      return sendJson(res, 409, { error: 'Category has linked products' });
    }

    return sendJson(res, 500, { error: 'Internal Server Error' });
  }
};
