import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  createProductController,
  listProductByIdController,
  listProductsController,
  updateProductController,
} from '../controllers/products.controller.js';

export const productsRoutes = (req: IncomingMessage, res: ServerResponse, segments: string[]) => {
  if (req.method === 'POST' && segments.length === 1) {
    return createProductController(req, res);
  } else if (req.method === 'POST' && segments.length !== 1) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Bad Request' }));
  }

  if (req.method === 'GET') {
    if (segments[1] && segments.length === 2) {
      const productId = segments[1];
      return listProductByIdController(res, productId);
    } else if (segments.length === 1) {
      return listProductsController(res);
    }

    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Bad Request' }));
  }

  if (req.method === 'PATCH' && segments[1] && segments.length === 2) {
    return updateProductController(req, res, segments[1]);
  } else if (req.method === 'PATCH' && (!segments[1] || segments.length !== 2)) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Bad Request' }));
  }

  res.writeHead(405, {
    'Content-Type': 'application/json',
    Allow: 'GET, POST, PATCH',
  });

  return res.end(
    JSON.stringify({
      error: 'Method Not Allowed',
    }),
  );
};
