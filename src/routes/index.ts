import type { IncomingMessage, ServerResponse } from 'node:http';
import { categoriesRoutes } from './categories.routes.js';
import { productsRoutes } from './products.routes.js';

export const routes = (req: IncomingMessage, res: ServerResponse) => {
  const baseUrl = `http://${req.headers.host}`;
  const parsedUrl = new URL(req.url || '', baseUrl);
  const pathname = parsedUrl.pathname;
  const segments = parsedUrl.pathname.split('/').filter(Boolean);

  if (pathname === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ message: 'aqui' }));
  }

  if (pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok' }));
  }

  if (pathname === '/hello') {
    if (req.method === 'GET') {
      const name = parsedUrl.searchParams.get('name');

      res.writeHead(200, { 'Content-Type': 'application/json' });

      if (name && name.length > 0) {
        return res.end(JSON.stringify({ message: `Hello, ${name}!` }));
      }

      return res.end(JSON.stringify({ message: 'Hello visitor' }));
    } else if (req.method === 'POST') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ message: 'Hello via POST' }));
    }
  }

  if (pathname === '/headers' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
    });

    return res.end(
      JSON.stringify({
        headers: {
          'x-test': req.headers['x-test'] || '',
          'user-agent': req.headers['user-agent'] || '',
        },
      }),
    );
  }

  if (segments[0] === 'products') {
    return productsRoutes(req, res, segments);
  }

  if (segments[0] === 'categories') {
    return categoriesRoutes(req, res, segments);
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
};
