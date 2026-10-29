import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Product } from '../types/product.js';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
} from '../services/product.service.js';

export const listProductsController = async (res: ServerResponse) => {
  try {
    const products: Product[] = await getProducts();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ products }));
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
};

export const listProductByIdController = async (res: ServerResponse, productId: string) => {
  if (!productId) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Product ID is required' }));
  }

  try {
    const product: Product = await getProductById(productId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ product }));
  } catch (error) {
    if (error instanceof Error && error.message === 'Product not found.') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Product not found' }));
    }

    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
};

export const createProductController = async (req: IncomingMessage, res: ServerResponse) => {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk.toString();
  });
  let parsedBody: unknown;

  req.on('end', async () => {
    try {
      parsedBody = JSON.parse(body);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid JSON' }));
    }

    try {
      const product = await createProduct(parsedBody);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ message: 'Product created', product }));
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

  req.on('end', async () => {
    try {
      parsedBody = JSON.parse(body);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid JSON' }));
    }

    try {
      const updatedProduct = await updateProduct(productId, parsedBody);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ message: 'Product updated', product: updatedProduct }));
    } catch (error) {
      if (error instanceof Error && error.message === 'Product not found.') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Product not found' }));
      }

      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid product data or update failed' }));
    }
  });
};
