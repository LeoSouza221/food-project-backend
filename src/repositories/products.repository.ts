import type { CreateProductInput, Product, ProductRow } from '../types/product.js';
import { pool } from '../database/pool.js';

const products: Product[] = [];

export const clearProducts = () => {
  products.length = 0;
};

export const saveProductRepository = async (product: CreateProductInput): Promise<Product> => {
  const query = `
    INSERT INTO products (name, price, category_id) 
    VALUES ($1, $2, $3) 
    RETURNING id, name, price, category_id, created_at;
  `;
  const values = [product.name, product.price, product.category];
  const { rows } = await pool.query<ProductRow>(query, values);
  const createdProduct = rows[0];

  if (!createdProduct) {
    throw new Error('It was not possible to save the product.');
  }

  return {
    id: createdProduct.id,
    name: createdProduct.name,
    price: Number(createdProduct.price),
    category: createdProduct.category_id,
  };
};

export const getProductsRepository = async (): Promise<Product[]> => {
  const query = 'SELECT id, name, price, category_id, created_at FROM products';
  const result = await pool.query<ProductRow>(query);

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    price: Number(row.price),
    category: row.category_id,
  }));
};

export const getProductByIdRepository = async (id: string): Promise<Product> => {
  const query = 'SELECT id, name, price, category_id, created_at FROM products WHERE id = $1';
  const result = await pool.query<ProductRow>(query, [id]);
  const row = result.rows[0];

  if (row) {
    return {
      id: row.id,
      name: row.name,
      price: Number(row.price),
      category: row.category_id,
    };
  }

  throw new Error('Product not found.');
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
