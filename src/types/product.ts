export type CreateProductInput = {
  name: string;
  price: number;
  category: number;
};

export type Product = CreateProductInput & {
  id: string;
};
