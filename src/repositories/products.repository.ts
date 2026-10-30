import type { CreateProductInput, Product, ProductRow } from '../types/product.js';
import { pool } from '../database/pool.js';

const isForeignKeyViolation = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === '23503';

export const clearProducts = async (): Promise<void> => {
  await pool.query('DELETE FROM products');
};

export const saveProductRepository = async (product: CreateProductInput): Promise<Product> => {
  const query = `
    INSERT INTO products (name, price, category_id) 
    VALUES ($1, $2, $3) 
    RETURNING id, name, price, category_id, created_at;
  `;
  const values = [product.name, product.price, product.category];
  let rows: ProductRow[];
  try {
    ({ rows } = await pool.query<ProductRow>(query, values));
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new Error('Category not found.', { cause: error });
    }

    throw error;
  }
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

export const updateProductRepository = async (
  id: string,
  updates: Partial<CreateProductInput>,
): Promise<Product> => {
  const query = `
    UPDATE products
    SET name = COALESCE($1, name),
        price = COALESCE($2, price),
        category_id = COALESCE($3, category_id)
    WHERE id = $4
    RETURNING id, name, price, category_id, created_at;
  `;
  const values = [updates.name, updates.price, updates.category, id];
  let rows: ProductRow[];
  try {
    ({ rows } = await pool.query<ProductRow>(query, values));
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new Error('Category not found.', { cause: error });
    }

    throw error;
  }
  const updatedProduct = rows[0];

  if (!updatedProduct) {
    throw new Error('Product not found.');
  }

  return {
    id: updatedProduct.id,
    name: updatedProduct.name,
    price: Number(updatedProduct.price),
    category: updatedProduct.category_id,
  };
};
