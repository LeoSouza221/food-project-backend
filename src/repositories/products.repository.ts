import type { CreateProductInput, Product, ProductRow } from '../types/product.js';
import crypto from 'node:crypto';
import { pool } from '../database/pool.js';

const products: Product[] = [];

export const clearProducts = () => {
  products.length = 0;
};

export const saveProduct = (product: CreateProductInput): Product => {
  const newProduct = { ...product, id: crypto.randomUUID() };
  products.push(newProduct);
  return newProduct;
};

export const getProductsRepository = async (): Promise<Product[]> => {
  const result = await pool.query<ProductRow>(
    'SELECT id, name, price, category_id, created_at FROM products',
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    price: Number(row.price),
    category: row.category_id,
  }));
};

export const getProductByIdRepository = (id: string): Product | undefined => {
  return products.find((product) => product.id === id);
};

export const updateProductRepository = (
  id: string,
  updates: Partial<CreateProductInput>,
): Product | undefined => {
  const productIndex = products.findIndex((product) => product.id === id);
  const existingProduct = products[productIndex];

  if (productIndex === -1 || !existingProduct) {
    return undefined;
  }

  const updatedProduct: Product = { ...existingProduct, ...updates };
  products[productIndex] = updatedProduct;
  return updatedProduct;
};
