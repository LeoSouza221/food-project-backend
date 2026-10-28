import type { Category, CategoryRow, CreateCategoryInput } from '../types/category.js';
import { pool } from '../database/pool.js';

export const saveCategoryRepository = async (category: CreateCategoryInput): Promise<Category> => {
  const query = 'INSERT INTO categories (name) VALUES ($1) RETURNING id, name, created_at;';
  const { rows } = await pool.query<CategoryRow>(query, [category.name]);
  const createdCategory = rows[0];

  if (!createdCategory) {
    throw new Error('It was not possible to save the category.');
  }

  return {
    id: createdCategory.id,
    name: createdCategory.name,
  };
};

export const getCategoriesRepository = async (): Promise<Category[]> => {
  const query = 'SELECT id, name, created_at FROM categories';
  const result = await pool.query<CategoryRow>(query);

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
  }));
};

export const getCategoryByIdRepository = async (id: number): Promise<Category> => {
  const query = 'SELECT id, name, created_at FROM categories WHERE id = $1';
  const result = await pool.query<CategoryRow>(query, [id]);
  const row = result.rows[0];

  if (row) {
    return {
      id: row.id,
      name: row.name,
    };
  }

  throw new Error('Category not found.');
};

export const updateCategoryRepository = async (
  id: number,
  updates: Partial<CreateCategoryInput>,
): Promise<Category> => {
  const existing = await getCategoryByIdRepository(id);

  const query = 'UPDATE categories SET name = $1 WHERE id = $2 RETURNING id, name, created_at;';
  const { rows } = await pool.query<CategoryRow>(query, [updates.name ?? existing.name, id]);
  const row = rows[0];

  if (!row) {
    throw new Error('Category not found.');
  }

  return {
    id: row.id,
    name: row.name,
  };
};

export const deleteCategoryRepository = async (id: number): Promise<void> => {
  const query = 'DELETE FROM categories WHERE id = $1';
  const result = await pool.query(query, [id]);

  if (!result.rowCount) {
    throw new Error('Category not found.');
  }
};
