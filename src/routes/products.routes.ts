import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  createProductController,
  listProductByIdController,
  listProductsController,
  updateProductController,
} from '../controllers/products.controller.js';
import { sendJson } from '../http/json.js';

export const productsRoutes = (req: IncomingMessage, res: ServerResponse, segments: string[]) => {
  if (req.method === 'POST' && segments.length === 1) {
    return createProductController(req, res);
  } else if (req.method === 'POST' && segments.length !== 1) {
    return sendJson(res, 400, { error: 'Bad Request' });
  }

  if (req.method === 'GET') {
    if (segments[1] && segments.length === 2) {
      const productId = segments[1];
      return listProductByIdController(res, productId);
    } else if (segments.length === 1) {
      return listProductsController(res);
    }

    return sendJson(res, 400, { error: 'Bad Request' });
  }

  if (req.method === 'PATCH' && segments[1] && segments.length === 2) {
    return updateProductController(req, res, segments[1]);
  } else if (req.method === 'PATCH' && (!segments[1] || segments.length !== 2)) {
    return sendJson(res, 400, { error: 'Bad Request' });
  }

  return sendJson(
    res,
    405,
    {
      error: 'Method Not Allowed',
    },
    {
      Allow: 'GET, POST, PATCH',
    },
  );
};
