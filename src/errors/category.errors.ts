export class CategoryNotFoundError extends Error {
  constructor(options?: ErrorOptions) {
    super('Category not found.', options);
    this.name = 'CategoryNotFoundError';
  }
}

export class CategoryHasProductsError extends Error {
  constructor(options?: ErrorOptions) {
    super('Category has linked products.', options);
    this.name = 'CategoryHasProductsError';
  }
}

export class InvalidCategoryDataError extends Error {
  constructor() {
    super('Invalid category data');
    this.name = 'InvalidCategoryDataError';
  }
}

export class InvalidCategoryUpdateError extends Error {
  constructor() {
    super('Invalid category update data');
    this.name = 'InvalidCategoryUpdateError';
  }
}
