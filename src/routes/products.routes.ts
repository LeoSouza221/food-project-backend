import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  createProductController,
  listProductByIdController,
  listProductsController,
  updateProductController,
  deleteProductController,
} from '../controllers/products.controller.js';
import { sendJson } from '../http/json.js';
import { requireAuth } from '../middlewares/require-auth.js';

export const productsRoutes = async (
  req: IncomingMessage,
  res: ServerResponse,
  segments: string[],
) => {
  if (req.method === 'POST') {
    if (segments.length !== 1) {
      return sendJson(res, 400, { error: 'Bad Request' });
    }

    const authenticatedReq = await requireAuth(req, res, ['admin']);

    if (!authenticatedReq) {
      return;
    }

    return createProductController(authenticatedReq, res);
  }

  if (req.method === 'GET') {
    if (segments.length === 1) {
      const authenticatedReq = await requireAuth(req, res, ['admin', 'customer']);

      if (!authenticatedReq) {
        return;
      }
      return listProductsController(res);
    }

    if (segments.length === 2 && segments[1]) {
      const authenticatedReq = await requireAuth(req, res, ['admin', 'customer']);

      if (!authenticatedReq) {
        return;
      }
      return listProductByIdController(res, segments[1]);
    }

    return sendJson(res, 400, { error: 'Bad Request' });
  }

  if (req.method === 'PATCH' || req.method === 'DELETE') {
    if (segments.length !== 2 || !segments[1]) {
      return sendJson(res, 400, { error: 'Bad Request' });
    }

    const authenticatedReq = await requireAuth(req, res, ['admin']);

    if (!authenticatedReq) {
      return;
    }

    if (req.method === 'PATCH') {
      return updateProductController(authenticatedReq, res, segments[1]);
    }

    return deleteProductController(res, segments[1]);
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
