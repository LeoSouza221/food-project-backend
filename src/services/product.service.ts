import {
  saveProductRepository,
  getProductsRepository,
  getProductByIdRepository,
  updateProductRepository,
} from '../repositories/products.repository.js';
import type { CreateProductInput, Product } from '../types/product.js';

export const validateProduct = (product: unknown): product is CreateProductInput => {
  if (typeof product !== 'object' || product === null) return false;

  if (
    !('name' in product) ||
    typeof product.name !== 'string' ||
    !('price' in product) ||
    typeof product.price !== 'number' ||
    !('category' in product) ||
    typeof product.category !== 'number'
  )
    return false;

  const { name, price, category } = product;
  const nameTrimmed = name.trim();

  if (
    !nameTrimmed ||
    !Number.isFinite(price) ||
    price <= 0 ||
    !Number.isFinite(category) ||
    category <= 0 ||
    !Number.isInteger(category)
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

  if (name !== undefined && (typeof name !== 'string' || !name.trim())) return false;
  if (price !== undefined && (typeof price !== 'number' || !Number.isFinite(price) || price <= 0))
    return false;
  if (
    category !== undefined &&
    (typeof category !== 'number' ||
      !Number.isFinite(category) ||
      category <= 0 ||
      !Number.isInteger(category))
  )
    return false;

  return true;
};

export const updateProduct = (id: string, updates: unknown): Product => {
  if (!validateProductUpdate(updates)) {
    throw new Error('Invalid product update data');
  }

  const updatedProduct = updateProductRepository(id, updates);

  if (!updatedProduct) {
    throw new Error('Product not found or update failed');
  }

  return updatedProduct;
};
