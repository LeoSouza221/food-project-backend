import {
  saveCategoryRepository,
  getCategoriesRepository,
  getCategoryByIdRepository,
  updateCategoryRepository,
  deleteCategoryRepository,
} from '../repositories/categories.repository.js';
import { InvalidCategoryDataError, InvalidCategoryUpdateError } from '../errors/category.errors.js';
import type { CreateCategoryInput, Category } from '../types/category.js';

const allowedCategoryKeys = ['name'];

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasOnlyAllowedKeys = (value: Record<string, unknown>): boolean =>
  Object.keys(value).every((key) => allowedCategoryKeys.includes(key));

const isValidCategoryName = (name: unknown): name is string =>
  typeof name === 'string' && name.trim() !== '' && Array.from(name).length <= 100;

export const validateCategory = (category: unknown): category is CreateCategoryInput =>
  isPlainObject(category) && hasOnlyAllowedKeys(category) && isValidCategoryName(category.name);

export const createCategory = (category: unknown): Promise<Category> => {
  if (!validateCategory(category)) {
    throw new InvalidCategoryDataError();
  }

  return saveCategoryRepository(category);
};

export const getCategories = (): Promise<Category[]> => {
  return getCategoriesRepository();
};

export const getCategoryById = (id: number): Promise<Category> => {
  return getCategoryByIdRepository(id);
};

const validateCategoryUpdate = (updates: unknown): updates is Partial<CreateCategoryInput> =>
  isPlainObject(updates) &&
  Object.keys(updates).length > 0 &&
  hasOnlyAllowedKeys(updates) &&
  (updates.name === undefined || isValidCategoryName(updates.name));

export const updateCategory = (id: number, updates: unknown): Promise<Category> => {
  if (!validateCategoryUpdate(updates)) {
    throw new InvalidCategoryUpdateError();
  }

  return updateCategoryRepository(id, updates);
};

export const deleteCategory = (id: number): Promise<void> => {
  return deleteCategoryRepository(id);
};
