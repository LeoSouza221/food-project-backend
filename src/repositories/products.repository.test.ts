import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  saveProduct,
  getProductsRepository,
  getProductByIdRepository,
  updateProductRepository,
} from './products.repository.js';
import crypto from 'node:crypto';
import { pool } from '../database/pool.js';
import type { ProductRow } from '../types/product.js';
import type { QueryResult } from 'pg';

const emptyResult: QueryResult<ProductRow> = {
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
            id: '1',
            name: 'Hambúrguer',
            price: '25.9',
            category_id: 1,
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
  it('should retrieve all products successfully', async () => {
    const product = { name: 'Hambúrguer', price: 25.9, category: 1, id: '1' };
    const products = await getProductsRepository();

    expect(Array.isArray(products)).toBe(true);
    expect(products).toContainEqual(product);
    expect(pool.query).toHaveBeenCalledWith(
      'SELECT id, name, price, category_id, created_at FROM products',
    );
  });

  it('should not affect subsequent query results when the returned array changes', async () => {
    const product = { name: 'Hambúrguer', price: 25.9, category: 1, id: '1' };
    const products = await getProductsRepository();

    expect(products).toContainEqual(product);

    const id = crypto.randomUUID();
    const fakeProduct = { id, name: 'X-Salada', price: 10.0, category: 1 };
    products.push(fakeProduct);

    const newProducts = await getProductsRepository();
    expect(newProducts).not.toContainEqual(fakeProduct);
  });

  it('should return an empty array when no products exist', async () => {
    mockQuery.mockImplementationOnce(async () => emptyResult);
    const products = await getProductsRepository();
    expect(products).toEqual([]);
  });
});

describe('getProductByIdRepository', () => {
  it('should retrieve a product by its ID successfully', () => {
    const product = { name: 'Hambúrguer', price: 25.9, category: 1, id: '1' };
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
