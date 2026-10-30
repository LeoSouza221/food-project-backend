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

export type CreateUserInput = {
  name: string;
  phone: string;
  address: Address;
};

export type User = CreateUserInput & {
  id: string;
};

export type UserRow = {
  id: string;
  name: string;
  phone: string;
  address_street: string;
  address_number: string;
  address_city: string;
  address_state: BrazilianState;
  address_neighborhood: string;
  created_at: string;
};
