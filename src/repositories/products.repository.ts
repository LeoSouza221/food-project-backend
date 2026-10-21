import type { CreateProductInput, Product } from '../types/product.js';
import crypto from 'node:crypto';

const products: Product[] = [];

export const saveProduct = (product: CreateProductInput): Product => {
  const newProduct = { ...product, id: crypto.randomUUID() };
  products.push(newProduct);
  return newProduct;
};

export const getProductsRepository = (): Product[] => {
  return [...products];
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
