export type CreateProductInput = {
  name: string;
  price: number;
  category: number;
};

export type Product = CreateProductInput & {
  id: string;
};

export type ProductRow = {
  id: string;
  name: string;
  price: string;
  category_id: number;
  created_at: string;
};
