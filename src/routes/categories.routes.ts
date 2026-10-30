import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  createCategoryController,
  deleteCategoryController,
  getCategoryByIdController,
  listCategoriesController,
  updateCategoryController,
} from '../controllers/category.controller.js';

export const categoriesRoutes = (req: IncomingMessage, res: ServerResponse, segments: string[]) => {
  if (req.method === 'POST') {
    if (segments.length !== 1) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Bad Request' }));
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

    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Bad Request' }));
  }

  if (req.method === 'PATCH' || req.method === 'DELETE') {
    if (segments.length !== 2 || !segments[1]) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Bad Request' }));
    }

    if (req.method === 'PATCH') {
      return updateCategoryController(req, res, segments[1]);
    }

    return deleteCategoryController(res, segments[1]);
  }

  res.writeHead(405, {
    'Content-Type': 'application/json',
    Allow: 'GET, POST, PATCH, DELETE',
  });

  return res.end(JSON.stringify({ error: 'Method Not Allowed' }));
};
