import {
  saveProductRepository,
  getProductsRepository,
  getProductByIdRepository,
  updateProductRepository,
} from '../repositories/products.repository.js';
import type { CreateProductInput, Product } from '../types/product.js';

const isValidProductName = (name: unknown): name is string =>
  typeof name === 'string' && name.trim() !== '' && Array.from(name).length <= 100;

const hasAtMostTwoDecimalPlaces = (price: number): boolean => {
  const [significand = '', exponent = '0'] = price.toString().toLowerCase().split('e');
  const decimalPlaces = (significand.split('.')[1]?.length ?? 0) - Number(exponent);
  return decimalPlaces <= 2;
};

const isValidProductPrice = (price: unknown): price is number =>
  typeof price === 'number' &&
  Number.isFinite(price) &&
  price > 0 &&
  price <= 99_999_999.99 &&
  hasAtMostTwoDecimalPlaces(price);

const isValidCategoryId = (category: unknown): category is number =>
  typeof category === 'number' &&
  Number.isInteger(category) &&
  category > 0 &&
  category <= 2_147_483_647;

export const validateProduct = (product: unknown): product is CreateProductInput => {
  if (typeof product !== 'object' || product === null || Array.isArray(product)) return false;

  if (
    !('name' in product) ||
    !('price' in product) ||
    !('category' in product) ||
    !isValidProductName(product.name) ||
    !isValidProductPrice(product.price) ||
    !isValidCategoryId(product.category)
  )
    return false;

  return true;
};

export const createProduct = (product: unknown): Promise<Product> => {
  if (!validateProduct(product)) {
    throw new Error('Invalid product data');
  }

  return saveProductRepository(product);
};

export const getProducts = (): Promise<Product[]> => {
  return getProductsRepository();
};

export const getProductById = (id: string): Promise<Product> => {
  return getProductByIdRepository(id);
};

const isUpdateObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const hasValidUpdateStructure = (product: unknown): product is Record<string, unknown> => {
  if (!isUpdateObject(product) || 'id' in product || Object.keys(product).length === 0)
    return false;

  return true;
};

const hasInvalidUpdates = (updates: Record<string, unknown>): boolean => {
  return Object.keys(updates).some((key) => !['name', 'price', 'category'].includes(key));
};

const validateProductUpdate = (updates: unknown): updates is Partial<CreateProductInput> => {
  if (!hasValidUpdateStructure(updates)) return false;
  if (hasInvalidUpdates(updates)) return false;

  const { name, price, category } = updates;

  if (name !== undefined && !isValidProductName(name)) return false;
  if (price !== undefined && !isValidProductPrice(price)) return false;
  if (category !== undefined && !isValidCategoryId(category)) return false;

  return true;
};

export const updateProduct = (id: string, updates: unknown): Promise<Product> => {
  if (!validateProductUpdate(updates)) {
    throw new Error('Invalid product update data');
  }

  return updateProductRepository(id, updates);
};
