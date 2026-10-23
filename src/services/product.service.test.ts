import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  validateProduct,
  createProduct,
  getProductById,
  getProducts,
  updateProduct,
} from './product.service.js';
import * as productsRepository from '../repositories/products.repository.js';

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
  };
});

// afterEach(() => {
//   vi.restoreAllMocks();
// });

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
  it('should create a product successfully', () => {
    const product = { name: 'Hambúrguer', price: 25.9, category: 1 };
    const createdProduct = createProduct(product);

    expect(createdProduct).toMatchObject(product);
    expect(createdProduct.id).toBeDefined();
  });

  it('should throw an error when product is invalid', () => {
    const product = { name: '', price: 25.9, category: 1 };

    expect(() => createProduct(product)).toThrow('Invalid product data');
  });
});

describe('getProductById', () => {
  it('should retrieve a product by its ID successfully', () => {
    const product = { name: 'Hambúrguer', price: 25.9, category: 1 };
    const createdProduct = createProduct(product);
    const retrievedProduct = getProductById(createdProduct.id);

    expect(retrievedProduct).toEqual(createdProduct);
    expect(retrievedProduct?.id).toBe(createdProduct.id);
  });

  it('should return undefined for a non-existent product ID', () => {
    const id = 'non-existent-id';

    expect(() => getProductById(id)).toThrow('Product not found');
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
    vi.spyOn(productsRepository, 'getProductsRepository').mockResolvedValue([]);

    const products = await getProducts();

    expect(products).toEqual(expect.any(Array));
    expect(products).toHaveLength(0);
  });
});

describe('updateProduct', () => {
  it('should update a product successfully', () => {
    const product = { name: 'Hambúrguer', price: 25.9, category: 1 };
    const createdProduct = createProduct(product);
    const updatedData = { name: 'X-Salada', price: 10.0, category: 1 };
    const updatedProduct = updateProduct(createdProduct.id, updatedData);

    expect(updatedProduct).toMatchObject(updatedData);
    expect(updatedProduct?.id).toBe(createdProduct.id);
  });

  it('should throw an error for a non-existent product ID', () => {
    const id = 'non-existent-id';
    const updatedData = { name: 'X-Salada', price: 10.0, category: 1 };

    expect(() => updateProduct(id, updatedData)).toThrow('Product not found or update failed');
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
    const product = { name: 'Hambúrguer', price: 25.9, category: 1 };
    const createdProduct = createProduct(product);

    expect(() => updateProduct(createdProduct.id, updatedData)).toThrow(
      'Invalid product update data',
    );
  });

  it.each([[{ price: 39.9 }], [{ category: 2 }], [{ name: 'Hambúrguer' }]])(
    'should update just the provided fields',
    (updatedData) => {
      const product = { name: 'Hambúrguer', price: 25.9, category: 1 };
      const createdProduct = createProduct(product);
      const updatedProduct = updateProduct(createdProduct.id, updatedData);

      const expectedProduct = { ...createdProduct, ...updatedData };
      expect(updatedProduct).toEqual(expectedProduct);
    },
  );
});
