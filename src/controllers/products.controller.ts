import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Product } from '../types/product.js';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
} from '../services/product.service.js';
import { InvalidJsonBodyError, readJsonBody, sendJson } from '../http/json.js';

const isValidProductId = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export const listProductsController = async (res: ServerResponse) => {
  try {
    const products: Product[] = await getProducts();

    return sendJson(res, 200, { products });
  } catch {
    return sendJson(res, 500, { error: 'Internal Server Error' });
  }
};

export const listProductByIdController = async (res: ServerResponse, productId: string) => {
  if (!productId) {
    return sendJson(res, 400, { error: 'Product ID is required' });
  }

  if (!isValidProductId(productId)) {
    return sendJson(res, 400, { error: 'Invalid product ID' });
  }

  try {
    const product: Product = await getProductById(productId);
    return sendJson(res, 200, { product });
  } catch (error) {
    if (error instanceof Error && error.message === 'Product not found.') {
      return sendJson(res, 404, { error: 'Product not found' });
    }

    return sendJson(res, 500, { error: 'Internal Server Error' });
  }
};

export const createProductController = async (req: IncomingMessage, res: ServerResponse) => {
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
    const product = await createProduct(parsedBody);
    return sendJson(res, 201, { message: 'Product created', product });
  } catch (error) {
    if (
      error instanceof Error &&
      ['Invalid product data', 'Category not found.'].includes(error.message)
    ) {
      return sendJson(res, 400, { error: 'Invalid product data' });
    }

    return sendJson(res, 500, { error: 'Internal Server Error' });
  }
};

export const updateProductController = async (
  req: IncomingMessage,
  res: ServerResponse,
  productId: string,
) => {
  if (!productId) {
    return sendJson(res, 400, { error: 'Product ID is required' });
  }

  if (!isValidProductId(productId)) {
    return sendJson(res, 400, { error: 'Invalid product ID' });
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
    const updatedProduct = await updateProduct(productId, parsedBody);
    return sendJson(res, 200, { message: 'Product updated', product: updatedProduct });
  } catch (error) {
    if (error instanceof Error && error.message === 'Product not found.') {
      return sendJson(res, 404, { error: 'Product not found' });
    }

    if (
      error instanceof Error &&
      ['Category not found.', 'Invalid product update data'].includes(error.message)
    ) {
      return sendJson(res, 400, { error: 'Invalid product data or update failed' });
    }

    return sendJson(res, 500, { error: 'Internal Server Error' });
  }
};
