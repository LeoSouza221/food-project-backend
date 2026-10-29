import {
  saveCategoryRepository,
  getCategoriesRepository,
  getCategoryByIdRepository,
  updateCategoryRepository,
  deleteCategoryRepository,
} from '../repositories/categories.repository.js';
import type { CreateCategoryInput, Category } from '../types/category.js';

export const validateCategory = (category: unknown): category is CreateCategoryInput => {
  if (typeof category !== 'object' || category === null) return false;

  if (!('name' in category) || typeof category.name !== 'string') return false;

  return category.name.trim() !== '';
};

export const createCategory = (category: unknown): Promise<Category> => {
  if (!validateCategory(category)) {
    throw new Error('Invalid category data');
  }

  return saveCategoryRepository(category);
};

export const getCategories = (): Promise<Category[]> => {
  return getCategoriesRepository();
};

export const getCategoryById = (id: number): Promise<Category> => {
  return getCategoryByIdRepository(id);
};

const isUpdateObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const hasValidUpdateStructure = (category: unknown): category is Record<string, unknown> => {
  if (!isUpdateObject(category) || 'id' in category || Object.keys(category).length === 0)
    return false;

  return true;
};

const hasInvalidUpdates = (updates: Record<string, unknown>): boolean => {
  return Object.keys(updates).some((key) => !['name'].includes(key));
};

const validateCategoryUpdate = (updates: unknown): updates is Partial<CreateCategoryInput> => {
  if (!hasValidUpdateStructure(updates)) return false;
  if (hasInvalidUpdates(updates)) return false;

  const { name } = updates;

  if (name !== undefined && (typeof name !== 'string' || !name.trim())) return false;

  return true;
};

export const updateCategory = (id: number, updates: unknown): Promise<Category> => {
  if (!validateCategoryUpdate(updates)) {
    throw new Error('Invalid category update data');
  }

  return updateCategoryRepository(id, updates);
};

export const deleteCategory = (id: number): Promise<void> => {
  return deleteCategoryRepository(id);
};
