import type { IncomingMessage, ServerResponse } from 'node:http';
import { categoriesRoutes } from './categories.routes.js';
import { productsRoutes } from './products.routes.js';
import { sendJson } from '../http/json.js';

export const routes = (req: IncomingMessage, res: ServerResponse) => {
  const baseUrl = `http://${req.headers.host}`;
  const parsedUrl = new URL(req.url || '', baseUrl);
  const pathname = parsedUrl.pathname;
  const segments = parsedUrl.pathname.split('/').filter(Boolean);

  if (pathname === '/' && req.method === 'GET') {
    return sendJson(res, 200, { message: 'aqui' });
  }

  if (pathname === '/health' && req.method === 'GET') {
    return sendJson(res, 200, { status: 'ok' });
  }

  if (pathname === '/hello') {
    if (req.method === 'GET') {
      const name = parsedUrl.searchParams.get('name');

      if (name && name.length > 0) {
        return sendJson(res, 200, { message: `Hello, ${name}!` });
      }

      return sendJson(res, 200, { message: 'Hello visitor' });
    } else if (req.method === 'POST') {
      return sendJson(res, 200, { message: 'Hello via POST' });
    }
  }

  if (pathname === '/headers' && req.method === 'GET') {
    return sendJson(res, 200, {
      headers: {
        'x-test': req.headers['x-test'] || '',
        'user-agent': req.headers['user-agent'] || '',
      },
    });
  }

  if (segments[0] === 'products') {
    return productsRoutes(req, res, segments);
  }

  if (segments[0] === 'categories') {
    return categoriesRoutes(req, res, segments);
  }

  return sendJson(res, 404, { error: 'Not Found' });
};
