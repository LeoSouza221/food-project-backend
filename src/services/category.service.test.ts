import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  validateCategory,
  createCategory,
  getCategoryById,
  getCategories,
  updateCategory,
  deleteCategory,
} from './category.service.js';
import * as categoriesRepository from '../repositories/categories.repository.js';
import { updateCategoryRepository } from '../repositories/categories.repository.js';

vi.mock('../repositories/categories.repository.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../repositories/categories.repository.js')>();
  return {
    ...actual,
    getCategoriesRepository: vi.fn().mockResolvedValue([
      {
        id: 1,
        name: 'Lanches',
      },
    ]),
    saveCategoryRepository: vi.fn().mockImplementation(async (category) => ({
      id: 1,
      ...category,
    })),
    getCategoryByIdRepository: vi.fn().mockImplementation(async (id) => {
      if (id === 1) {
        return {
          id: 1,
          name: 'Lanches',
        };
      }
      throw new Error('Category not found');
    }),
    updateCategoryRepository: vi.fn().mockImplementation(async (id, updates) => {
      if (id === 1) {
        return {
          id: 1,
          name: updates.name ?? 'Lanches',
        };
      }
      throw new Error('Category not found');
    }),
    deleteCategoryRepository: vi.fn().mockImplementation(async (id) => {
      if (id !== 1) {
        throw new Error('Category not found');
      }
    }),
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('validateCategory', () => {
  it.each([
    [{ name: 'Lanches' }, true],
    [{ name: '' }, false],
    [{ name: '         ' }, false],
    [{ name: 123 }, false],
    [{ name: null }, false],
    [{ name: 'Lanches', description: 'Snacks' }, true],
    [{}],
    [null],
    ['Lanches'],
    [[{ name: 'Lanches' }]],
    [{ name: 'a'.repeat(101) }, false],
  ])('should validate category %#', (category, expected = false) => {
    expect(validateCategory(category)).toBe(expected);
  });
});

describe('createCategory', () => {
  it('should create a category successfully', async () => {
    const category = { name: 'Lanches' };
    const createdCategory = await createCategory(category);

    expect(createdCategory).toMatchObject(category);
    expect(createdCategory.id).toBeDefined();
  });

  it('should throw an error when category is invalid', () => {
    const category = { name: '' };

    expect(() => createCategory(category)).toThrow('Invalid category data');
  });
});

describe('getCategoryById', () => {
  it('should retrieve a category by its ID successfully', async () => {
    const category = { name: 'Lanches' };
    const createdCategory = await createCategory(category);
    const retrievedCategory = await getCategoryById(createdCategory.id);

    expect(retrievedCategory).toEqual(createdCategory);
    expect(retrievedCategory.id).toBe(createdCategory.id);
  });

  it('should throw an error for a non-existent category ID', async () => {
    const id = 2;

    await expect(getCategoryById(id)).rejects.toThrow('Category not found');
  });
});

describe('getCategories', () => {
  it('should return a list of all categories', async () => {
    const category = { name: 'Lanches', id: 1 };

    const categories = await getCategories();

    expect(categories).toEqual(expect.any(Array));
    expect(categories).toContainEqual(expect.objectContaining(category));
  });

  it('should return an empty list when there are no categories', async () => {
    vi.mocked(categoriesRepository.getCategoriesRepository).mockResolvedValue([]);

    const categories = await getCategories();

    expect(categories).toEqual(expect.any(Array));
    expect(categories).toHaveLength(0);
  });
});

describe('updateCategory', () => {
  it('should update a category successfully', async () => {
    const categoryId = 1;
    const updatedData = { name: 'Bebidas' };
    const updatedCategory = await updateCategory(categoryId, updatedData);

    expect(updatedCategory).toMatchObject(updatedData);
    expect(updatedCategory.id).toBe(categoryId);
    expect(vi.mocked(updateCategoryRepository)).toHaveBeenCalledWith(categoryId, updatedData);
  });

  it('should throw an error for a non-existent category ID', async () => {
    const id = 2;
    const updatedData = { name: 'Bebidas' };

    await expect(updateCategory(id, updatedData)).rejects.toThrow('Category not found');
  });

  it.each([
    [{ name: '' }],
    [{ name: '         ' }],
    [{ name: 123 }],
    [{ name: null }],
    [{ name: 'a'.repeat(101) }],
    [{ id: 1 }],
    [{ name: 'Bebidas', id: 2 }],
    [{ name: 'Bebidas', description: 'Drinks' }],
    [{ description: 'Drinks' }],
    [{}],
    [123],
    ['Bebidas'],
    [null],
  ])('should throw an error when the updated data is invalid', (updatedData) => {
    expect(() => updateCategory(1, updatedData)).toThrow('Invalid category update data');
  });

  it('should update just the provided fields', async () => {
    const categoryId = 1;
    const updatedData = { name: 'Bebidas' };
    const updatedCategory = await updateCategory(categoryId, updatedData);

    const expectedCategory = {
      id: categoryId,
      name: updatedData.name,
    };
    expect(updatedCategory).toEqual(expectedCategory);
  });
});

describe('deleteCategory', () => {
  it('should delete a category successfully', async () => {
    await expect(deleteCategory(1)).resolves.toBeUndefined();
    expect(vi.mocked(categoriesRepository.deleteCategoryRepository)).toHaveBeenCalledWith(1);
  });

  it('should throw an error for a non-existent category ID', async () => {
    await expect(deleteCategory(2)).rejects.toThrow('Category not found');
  });
});
