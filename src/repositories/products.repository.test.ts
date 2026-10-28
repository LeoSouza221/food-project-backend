import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  saveProductRepository,
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
  it('should save a product successfully', async () => {
    const product = { name: 'Hambúrguer', price: 25.9, category: 1 };
    const savedProduct = await saveProductRepository(product);
    expect(savedProduct).toMatchObject(product);
    expect(savedProduct.id).toBeDefined();
    expect(savedProduct.id).not.toHaveLength(0);
  });
  it('should throw an error when saving a product fails', async () => {
    mockQuery.mockImplementationOnce(async () => ({ rows: [] }));
    const product = { name: 'Hambúrguer', price: 25.9, category: 1 };
    await expect(saveProductRepository(product)).rejects.toThrow(
      'It was not possible to save the product.',
    );
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
  it('should retrieve a product by its ID successfully', async () => {
    const product = { name: 'Hambúrguer', price: '25.9', category_id: 1, id: '1' };
    const expectedProduct = {
      id: product.id,
      category: product.category_id,
      name: product.name,
      price: Number(product.price),
    };
    mockQuery.mockImplementationOnce(async () => ({ rows: [product] }));

    const retrievedProduct = await getProductByIdRepository(product.id);

    expect(retrievedProduct).toEqual(expectedProduct);
    expect(retrievedProduct.id).toBe(product.id);
    expect(pool.query).toHaveBeenCalledWith(
      'SELECT id, name, price, category_id, created_at FROM products WHERE id = $1',
      [product.id],
    );
  });

  it('should throw an error for a non-existent product ID', async () => {
    const id = crypto.randomUUID();

    mockQuery.mockImplementationOnce(async () => ({ rows: [] }));
    await expect(getProductByIdRepository(id)).rejects.toThrow('Product not found.');
  });
});

describe('updateProductRepository', () => {
  it('should update a product successfully', async () => {
    const productId = '1';
    const updatedData = { name: 'X-Salada', price: 10.0, category: 1 };

    mockQuery.mockImplementationOnce(async () => ({
      rows: [
        {
          id: productId,
          name: updatedData.name,
          price: String(updatedData.price),
          category_id: updatedData.category,
          created_at: new Date().toISOString(),
        },
      ],
    }));
    const updatedProduct = await updateProductRepository(productId, updatedData);

    expect(updatedProduct).toMatchObject(updatedData);
    expect(updatedProduct?.id).toBe(productId);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringMatching(
        /UPDATE products[\s\S]*RETURNING id, name, price, category_id, created_at/,
      ),
      ['X-Salada', 10, 1, productId],
    );
  });

  it.each([[{ price: 35.9 }], [{ category: 2 }], [{ name: 'Hambúrguer' }]])(
    'should update just the provided fields %1',
    async (updatedData: { name?: string; price?: number; category?: number }) => {
      const productId = '1';
      const savedProduct = {
        id: productId,
        name: updatedData.name ?? 'Hambúrguer',
        price: updatedData.price ?? 25.9,
        category_id: updatedData.category ?? 1,
        created_at: new Date().toISOString(),
      };
      mockQuery.mockImplementationOnce(async () => ({
        rows: [savedProduct],
      }));
      const updatedProduct = await updateProductRepository(productId, updatedData);
      const expectedProduct = {
        id: productId,
        name: updatedData.name ?? 'Hambúrguer',
        price: updatedData.price ?? Number(String(25.9)),
        category: updatedData.category ?? 1,
      };

      expect(updatedProduct).toEqual(expectedProduct);
    },
  );

  it('should throw an error for a non-existent product ID', async () => {
    const id = crypto.randomUUID();
    const updatedData = { name: 'X-Salada', price: 10.0, category: 1 };
    mockQuery.mockImplementationOnce(async () => ({ rows: [] }));
    await expect(updateProductRepository(id, updatedData)).rejects.toThrow('Product not found.');
  });
});
