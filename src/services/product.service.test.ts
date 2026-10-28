import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  validateProduct,
  createProduct,
  getProductById,
  getProducts,
  updateProduct,
} from './product.service.js';
import * as productsRepository from '../repositories/products.repository.js';
import { updateProductRepository } from '../repositories/products.repository.js';

vi.mock('../repositories/products.repository.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../repositories/products.repository.js')>();
  return {
    ...actual,
    getProductsRepository: vi.fn().mockResolvedValue([
      {
        id: '1',
        name: 'Hambúrguer',
        price: 25.9,
        category: 1,
      },
    ]),
    saveProductRepository: vi.fn().mockImplementation(async (product) => ({
      id: '1',
      ...product,
    })),
    getProductByIdRepository: vi.fn().mockImplementation(async (id) => {
      if (id === '1') {
        return {
          id: '1',
          name: 'Hambúrguer',
          price: 25.9,
          category: 1,
        };
      }
      throw new Error('Product not found');
    }),
    updateProductRepository: vi.fn().mockImplementation(async (id, updates) => {
      if (id === '1') {
        return {
          id: '1',
          name: updates.name ?? 'Hambúrguer',
          price: updates.price ?? 25.9,
          category: updates.category ?? 1,
        };
      }
      throw new Error('Product not found');
    }),
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('validateProduct', () => {
  it.each([
    [{ name: 'Hambúrguer', price: 25.9, category: 1 }, true],
    [{ name: '', price: 25.9, category: 1 }, false],
    [{ name: '         ', price: 25.9, category: 1 }, false],
    [{ name: 'Hambúrguer', price: 25.9, category: null }, false],
    [{ name: 'Hambúrguer', price: 0, category: 1 }, false],
    [{ name: 'Hambúrguer', price: -5, category: 1 }, false],
    [{ name: 'Hambúrguer', price: NaN, category: 1 }, false],
    [{ name: 'Hambúrguer', price: 25.9, category: 0 }, false],
    [{ name: 'Hambúrguer', price: 25.9, category: 0.1 }, false],
    [{ name: 'Hambúrguer', price: 25.9, category: 'string' }, false],
  ])('should validate product %#', (product, expected) => {
    expect(validateProduct(product)).toBe(expected);
  });
});

describe('createProduct', () => {
  it('should create a product successfully', async () => {
    const product = { name: 'Hambúrguer', price: 25.9, category: 1 };
    const createdProduct = await createProduct(product);

    expect(createdProduct).toMatchObject(product);
    expect(createdProduct.id).toBeDefined();
  });

  it('should throw an error when product is invalid', () => {
    const product = { name: '', price: 25.9, category: 1 };

    expect(() => createProduct(product)).toThrow('Invalid product data');
  });
});

describe('getProductById', () => {
  it('should retrieve a product by its ID successfully', async () => {
    const product = { name: 'Hambúrguer', price: 25.9, category: 1 };
    const createdProduct = await createProduct(product);
    const retrievedProduct = await getProductById(createdProduct.id);

    expect(retrievedProduct).toEqual(createdProduct);
    expect(retrievedProduct.id).toBe(createdProduct.id);
  });

  it('should throw an error for a non-existent product ID', async () => {
    const id = 'non-existent-id';

    await expect(getProductById(id)).rejects.toThrow('Product not found');
  });
});

describe('getProducts', () => {
  it('should return a list of all products', async () => {
    const product = { name: 'Hambúrguer', price: 25.9, category: 1, id: '1' };

    const products = await getProducts();

    expect(products).toEqual(expect.any(Array));
    expect(products).toContainEqual(expect.objectContaining(product));
  });

  it('should return an empty list when there are no products', async () => {
    vi.mocked(productsRepository.getProductsRepository).mockResolvedValue([]);

    const products = await getProducts();

    expect(products).toEqual(expect.any(Array));
    expect(products).toHaveLength(0);
  });
});

describe('updateProduct', () => {
  it('should update a product successfully', async () => {
    const productId = '1';
    const updatedData = { name: 'X-Salada', price: 10.0, category: 1 };
    const updatedProduct = await updateProduct(productId, updatedData);

    expect(updatedProduct).toMatchObject(updatedData);
    expect(updatedProduct.id).toBe(productId);
    expect(vi.mocked(updateProductRepository)).toHaveBeenCalledWith(productId, updatedData);
  });

  it('should throw an error for a non-existent product ID', async () => {
    const id = 'non-existent-id';
    const updatedData = { name: 'X-Salada', price: 10.0, category: 1 };

    await expect(updateProduct(id, updatedData)).rejects.toThrow('Product not found');
  });

  it.each([
    [{ name: '', price: 25.9, category: 1 }],
    [{ name: '         ', price: 25.9, category: 1 }],
    [{ name: 'Hambúrguer', price: 25.9, category: null }],
    [{ name: 'Hambúrguer', price: 0, category: 1 }],
    [{ name: 'Hambúrguer', price: -5, category: 1 }],
    [{ name: 'Hambúrguer', price: NaN, category: 1 }],
    [{ name: 'Hambúrguer', price: 25.9, category: 0 }],
    [{ name: 'Hambúrguer', price: 25.9, category: 0.1 }],
    [{ name: 'Hambúrguer', price: 25.9, category: 'string' }],
    [{ price: '25.9' }],
    [{ category: NaN }],
    [{ name: '         ' }],
  ])('should throw an error when the updated data is invalid', (updatedData) => {
    expect(() => updateProduct('1', updatedData)).toThrow('Invalid product update data');
  });

  it.each([[{ price: 39.9 }], [{ category: 2 }], [{ name: 'Hambúrguer' }]])(
    'should update just the provided fields',
    async (updatedData: { name?: string; price?: number; category?: number }) => {
      const productId = '1';
      const updatedProduct = await updateProduct(productId, updatedData);

      const expectedProduct = {
        id: productId,
        name: updatedData.name ?? 'Hambúrguer',
        price: updatedData.price ?? 25.9,
        category: updatedData.category ?? 1,
      };
      expect(updatedProduct).toEqual(expectedProduct);
    },
  );
});
