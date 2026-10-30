import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  createCategoryController,
  deleteCategoryController,
  getCategoryByIdController,
  listCategoriesController,
  updateCategoryController,
} from '../controllers/category.controller.js';
import { sendJson } from '../http/json.js';

export const categoriesRoutes = (req: IncomingMessage, res: ServerResponse, segments: string[]) => {
  if (req.method === 'POST') {
    if (segments.length !== 1) {
      return sendJson(res, 400, { error: 'Bad Request' });
    }

    return createCategoryController(req, res);
  }

  if (req.method === 'GET') {
    if (segments.length === 1) {
      return listCategoriesController(res);
    }

    if (segments.length === 2 && segments[1]) {
      return getCategoryByIdController(res, segments[1]);
    }

    return sendJson(res, 400, { error: 'Bad Request' });
  }

  if (req.method === 'PATCH' || req.method === 'DELETE') {
    if (segments.length !== 2 || !segments[1]) {
      return sendJson(res, 400, { error: 'Bad Request' });
    }

    if (req.method === 'PATCH') {
      return updateCategoryController(req, res, segments[1]);
    }

    return deleteCategoryController(res, segments[1]);
  }

  return sendJson(
    res,
    405,
    { error: 'Method Not Allowed' },
    {
      Allow: 'GET, POST, PATCH, DELETE',
    },
  );
};
