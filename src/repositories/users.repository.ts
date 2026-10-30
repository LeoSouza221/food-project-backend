import type { CreateUserInput, User, UserRow } from '../types/user.js';
import { pool } from '../database/pool.js';

const columns =
  'id, name, phone, address_street, address_number, address_city, address_state, address_neighborhood, created_at';

const toUser = (row: UserRow): User => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  address: {
    street: row.address_street,
    number: row.address_number,
    city: row.address_city,
    state: row.address_state,
    neighborhood: row.address_neighborhood,
  },
});

export const clearUsers = async (): Promise<void> => {
  await pool.query('DELETE FROM users');
};

export const saveUserRepository = async (user: CreateUserInput): Promise<User> => {
  const query = `
    INSERT INTO users (name, phone, address_street, address_number, address_city, address_state, address_neighborhood)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING ${columns};
  `;
  const { address } = user;
  const values = [
    user.name,
    user.phone,
    address.street,
    address.number,
    address.city,
    address.state,
    address.neighborhood,
  ];
  const { rows } = await pool.query<UserRow>(query, values);
  const createdUser = rows[0];

  if (!createdUser) {
    throw new Error('It was not possible to save the user.');
  }

  return toUser(createdUser);
};

export const getUsersRepository = async (): Promise<User[]> => {
  const result = await pool.query<UserRow>(`SELECT ${columns} FROM users`);

  return result.rows.map(toUser);
};

export const getUserByIdRepository = async (id: string): Promise<User> => {
  const result = await pool.query<UserRow>(`SELECT ${columns} FROM users WHERE id = $1`, [id]);
  const row = result.rows[0];

  if (!row) {
    throw new Error('User not found.');
  }

  return toUser(row);
};

export const updateUserRepository = async (
  id: string,
  updates: Partial<CreateUserInput>,
): Promise<User> => {
  const query = `
    UPDATE users
    SET name = COALESCE($1, name),
        phone = COALESCE($2, phone),
        address_street = COALESCE($3, address_street),
        address_number = COALESCE($4, address_number),
        address_city = COALESCE($5, address_city),
        address_state = COALESCE($6, address_state),
        address_neighborhood = COALESCE($7, address_neighborhood)
    WHERE id = $8
    RETURNING ${columns};
  `;
  const { address } = updates;
  const values = [
    updates.name,
    updates.phone,
    address?.street,
    address?.number,
    address?.city,
    address?.state,
    address?.neighborhood,
    id,
  ];
  const { rows } = await pool.query<UserRow>(query, values);
  const updatedUser = rows[0];

  if (!updatedUser) {
    throw new Error('User not found.');
  }

  return toUser(updatedUser);
};

export const deleteUserRepository = async (id: string): Promise<void> => {
  const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);

  if (!result.rowCount) {
    throw new Error('User not found.');
  }
};
