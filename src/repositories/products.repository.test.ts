import { describe, it, expect } from 'vitest';
import {
  saveProduct,
  getProductsRepository,
  getProductByIdRepository,
  updateProductRepository,
} from './products.repository.js';
import crypto from 'node:crypto';

describe('saveProduct', () => {
  it('should save a product successfully', () => {
    const product = { name: 'Hambúrguer', price: 25.9, category: 1 };
    const savedProduct = saveProduct(product);
    expect(savedProduct).toMatchObject(product);
    expect(savedProduct.id).toBeDefined();
    expect(savedProduct.id).not.toHaveLength(0);
  });
});

describe('getProductsRepository', () => {
  it('should retrieve all products successfully', () => {
    const product = { name: 'Hambúrguer', price: 25.9, category: 1 };
    const savedProduct = saveProduct(product);
    const products = getProductsRepository();

    expect(Array.isArray(products)).toBe(true);
    expect(products).toContainEqual(savedProduct);
  });

  it('should not modify the internal collection when the returned array changes', () => {
    const product = { name: 'Hambúrguer', price: 25.9, category: 1 };

    const savedProduct = saveProduct(product);
    const products = getProductsRepository();

    expect(products).toContainEqual(savedProduct);

    const id = crypto.randomUUID();
    const fakeProduct = { id, name: 'X-Salada', price: 10.0, category: 1 };
    products.push(fakeProduct);

    const newProducts = getProductsRepository();
    expect(newProducts).not.toContainEqual(fakeProduct);
  });
});

describe('getProductByIdRepository', () => {
  it('should retrieve a product by its ID successfully', () => {
    const product = { name: 'Hambúrguer', price: 25.9, category: 1 };
    const savedProduct = saveProduct(product);
    const retrievedProduct = getProductByIdRepository(savedProduct.id);

    expect(retrievedProduct).toEqual(savedProduct);
    expect(retrievedProduct?.id).toBe(savedProduct.id);
  });

  it('should return undefined for a non-existent product ID', () => {
    const id = crypto.randomUUID();
    const retrievedProduct = getProductByIdRepository(id);
    expect(retrievedProduct).toBeUndefined();
  });
});

describe('updateProductRepository', () => {
  it('should update a product successfully', () => {
    const product = { name: 'Hambúrguer', price: 25.9, category: 1 };
    const savedProduct = saveProduct(product);
    const updatedData = { name: 'X-Salada', price: 10.0, category: 1 };
    const updatedProduct = updateProductRepository(savedProduct.id, updatedData);

    expect(updatedProduct).toMatchObject(updatedData);
    expect(updatedProduct?.id).toBe(savedProduct.id);

    const retrievedProduct = getProductByIdRepository(savedProduct.id);
    expect(retrievedProduct).toEqual(updatedProduct);
  });

  it.each([[{ price: 35.9 }], [{ category: 2 }], [{ name: 'Hambúrguer' }]])(
    'should update just the provided fields %1',
    (updatedData: { name?: string; price?: number; category?: number }) => {
      const product = { name: 'Hambúrguer', price: 25.9, category: 1 };
      const savedProduct = saveProduct(product);
      const updatedProduct = updateProductRepository(savedProduct.id, updatedData);

      const expectedProduct = { ...savedProduct, ...updatedData };
      expect(updatedProduct).toEqual(expectedProduct);
    },
  );

  it('should return undefined for a non-existent product ID', () => {
    const id = crypto.randomUUID();
    const updatedData = { name: 'X-Salada', price: 10.0, category: 1 };
    const updatedProduct = updateProductRepository(id, updatedData);
    expect(updatedProduct).toBeUndefined();
  });
});
