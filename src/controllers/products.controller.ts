import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Product } from '../types/product.js';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
} from '../services/product.service.js';

export const listProductsController = (res: ServerResponse) => {
  try {
    const products: Product[] = getProducts();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ products }));
  } catch {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
};

export const listProductByIdController = (res: ServerResponse, productId: string) => {
  if (!productId) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Product ID is required' }));
  }

  try {
    const product: Product = getProductById(productId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ product }));
  } catch {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Product not found' }));
  }
};

export const createProductController = (req: IncomingMessage, res: ServerResponse) => {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk.toString();
  });
  let parsedBody: unknown;

  req.on('end', () => {
    try {
      parsedBody = JSON.parse(body);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid JSON' }));
    }

    try {
      const product = createProduct(parsedBody);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ message: 'Product received', body: product }));
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid product data' }));
    }
  });
};

export const updateProductController = (
  req: IncomingMessage,
  res: ServerResponse,
  productId: string,
) => {
  if (!productId) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Product ID is required' }));
  }

  let body = '';
  req.on('data', (chunk) => {
    body += chunk.toString();
  });
  let parsedBody: unknown;

  req.on('end', () => {
    try {
      parsedBody = JSON.parse(body);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid JSON' }));
    }

    try {
      const updatedProduct = updateProduct(productId, parsedBody);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ message: 'Product updated', body: updatedProduct }));
    } catch (error) {
      if (error instanceof Error && error.message === 'Product not found or update failed') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Product not found or update failed' }));
      }

      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid product data or update failed' }));
    }
  });
};
