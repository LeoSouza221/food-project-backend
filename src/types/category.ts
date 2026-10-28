export type CreateCategoryInput = {
  name: string;
};

export type Category = CreateCategoryInput & {
  id: number;
};

export type CategoryRow = {
  id: number;
  name: string;
  created_at: string;
};
