import { CategoryHasProductsError, CategoryNotFoundError } from '../errors/category.errors.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  saveCategoryRepository,
  getCategoriesRepository,
  getCategoryByIdRepository,
  updateCategoryRepository,
  deleteCategoryRepository,
} from './categories.repository.js';
import { pool } from '../database/pool.js';
import type { CategoryRow } from '../types/category.js';
import type { QueryResult } from 'pg';

const emptyResult: QueryResult<CategoryRow> = {
  command: 'SELECT',
  rowCount: 0,
  oid: 0,
  fields: [],
  rows: [],
};

vi.mock('../database/pool.js', () => {
  return {
    pool: {
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            id: 1,
            name: 'Lanches',
            created_at: new Date().toISOString(),
          },
        ],
      }),
    },
  };
});
const mockQuery = vi.mocked(pool.query);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('saveCategoryRepository', () => {
  it('should save a category successfully', async () => {
    const category = { name: 'Lanches' };
    const savedCategory = await saveCategoryRepository(category);
    expect(savedCategory).toMatchObject(category);
    expect(savedCategory.id).toBeDefined();
    expect(savedCategory.id).toBeGreaterThan(0);
  });

  it('should throw an error when saving a category fails', async () => {
    mockQuery.mockImplementationOnce(async () => emptyResult);
    const category = { name: 'Lanches' };
    await expect(saveCategoryRepository(category)).rejects.toThrow(
      'It was not possible to save the category.',
    );
  });
});

describe('getCategoriesRepository', () => {
  it('should retrieve all categories successfully', async () => {
    const category = { name: 'Lanches', id: 1 };
    const categories = await getCategoriesRepository();

    expect(Array.isArray(categories)).toBe(true);
    expect(categories).toContainEqual(category);
    expect(pool.query).toHaveBeenCalledWith('SELECT id, name, created_at FROM categories');
  });

  it('should return an empty array when no categories exist', async () => {
    mockQuery.mockImplementationOnce(async () => emptyResult);
    const categories = await getCategoriesRepository();
    expect(categories).toEqual([]);
  });
});

describe('getCategoryByIdRepository', () => {
  it('should retrieve a category by its ID successfully', async () => {
    const category = { id: 1, name: 'Lanches', created_at: new Date().toISOString() };
    const expectedCategory = { id: category.id, name: category.name };

    mockQuery.mockImplementationOnce(async () => ({ rows: [category] }));

    const retrievedCategory = await getCategoryByIdRepository(category.id);

    expect(retrievedCategory).toEqual(expectedCategory);
    expect(retrievedCategory.id).toBe(category.id);
    expect(pool.query).toHaveBeenCalledWith(
      'SELECT id, name, created_at FROM categories WHERE id = $1',
      [category.id],
    );
  });

  it('should throw an error for a non-existent category ID', async () => {
    mockQuery.mockImplementationOnce(async () => ({ rows: [] }));
    await expect(getCategoryByIdRepository(99)).rejects.toThrow(CategoryNotFoundError);
  });
});

describe('updateCategoryRepository', () => {
  const updateQuery =
    'UPDATE categories SET name = COALESCE($1, name) WHERE id = $2 RETURNING id, name, created_at;';

  it('should update a category successfully', async () => {
    const created_at = new Date().toISOString();
    mockQuery.mockImplementationOnce(async () => ({
      rows: [{ id: 1, name: 'Bebidas', created_at }],
    }));

    const updatedCategory = await updateCategoryRepository(1, { name: 'Bebidas' });

    expect(updatedCategory).toEqual({ id: 1, name: 'Bebidas' });
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(pool.query).toHaveBeenCalledWith(updateQuery, ['Bebidas', 1]);
  });

  it('should keep the existing name when no name is provided', async () => {
    const created_at = new Date().toISOString();
    mockQuery.mockImplementationOnce(async () => ({
      rows: [{ id: 1, name: 'Lanches', created_at }],
    }));

    const updatedCategory = await updateCategoryRepository(1, {});

    expect(updatedCategory).toEqual({ id: 1, name: 'Lanches' });
    expect(pool.query).toHaveBeenCalledWith(updateQuery, [undefined, 1]);
  });

  it('should throw an error for a non-existent category ID', async () => {
    mockQuery.mockImplementationOnce(async () => ({ rows: [] }));
    await expect(updateCategoryRepository(99, { name: 'Bebidas' })).rejects.toThrow(
      CategoryNotFoundError,
    );
  });
});

describe('deleteCategoryRepository', () => {
  it('should delete a category successfully', async () => {
    mockQuery.mockImplementationOnce(async () => ({ rows: [], rowCount: 1 }));

    await expect(deleteCategoryRepository(1)).resolves.toBeUndefined();
    expect(pool.query).toHaveBeenCalledWith('DELETE FROM categories WHERE id = $1', [1]);
  });

  it('should throw an error for a non-existent category ID', async () => {
    mockQuery.mockImplementationOnce(async () => ({ rows: [], rowCount: 0 }));
    await expect(deleteCategoryRepository(99)).rejects.toThrow(CategoryNotFoundError);
  });

  it('should throw a linked products error on foreign key violation', async () => {
    const fkError = Object.assign(new Error('fk'), { code: '23503' });
    mockQuery.mockImplementationOnce(async () => {
      throw fkError;
    });

    const error = await deleteCategoryRepository(1).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(CategoryHasProductsError);
    expect((error as Error).cause).toBe(fkError);
  });

  it('should rethrow unexpected database errors', async () => {
    mockQuery.mockImplementationOnce(async () => {
      throw new Error('Database unavailable');
    });

    await expect(deleteCategoryRepository(1)).rejects.toThrow('Database unavailable');
  });
});
