export const BRAZILIAN_STATES = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const;

export type BrazilianState = (typeof BRAZILIAN_STATES)[number];

export type Address = {
  street: string;
  number: string;
  city: string;
  state: BrazilianState;
  neighborhood: string;
};

export const USER_ROLES = ['customer', 'admin'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type CreateUserInput = {
  name: string;
  email: string;
  phone: string;
  password: string;
  address: Address;
};

export type UpdateUserInput = Partial<Omit<CreateUserInput, 'password'>>;

export type NewUserRecord = Omit<CreateUserInput, 'password'> & {
  passwordHash: string;
};

export type User = Omit<CreateUserInput, 'password'> & {
  id: string;
  role: UserRole;
};

export type UserRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  password_hash: string;
  role: UserRole;
  address_street: string;
  address_number: string;
  address_city: string;
  address_state: BrazilianState;
  address_neighborhood: string;
  created_at: string;
};
