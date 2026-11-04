import type {
  NewUserRecord,
  UpdateUserInput,
  User,
  UserAuthRecord,
  UserPublicRow,
  UserRow,
} from '../types/user.js';
import {
  EmailAlreadyInUseError,
  PhoneAlreadyInUseError,
  UserNotFoundError,
} from '../errors/user.errors.js';
import { pool } from '../database/pool.js';

const columns =
  'id, name, email, phone, role, address_street, address_number, address_city, address_state, address_neighborhood, created_at';

const toUser = (row: UserPublicRow): User => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  role: row.role,
  address: {
    street: row.address_street,
    number: row.address_number,
    city: row.address_city,
    state: row.address_state,
    neighborhood: row.address_neighborhood,
  },
});

const translateUniqueViolation = (error: unknown): unknown => {
  const { code, constraint } = (error ?? {}) as { code?: string; constraint?: string };

  if (code !== '23505') return error;
  if (constraint === 'users_email_key') return new EmailAlreadyInUseError();
  if (constraint === 'users_phone_key') return new PhoneAlreadyInUseError();

  return error;
};

export const clearUsers = async (): Promise<void> => {
  await pool.query('DELETE FROM users');
};

export const saveUserRepository = async (user: NewUserRecord): Promise<User> => {
  const query = `
    INSERT INTO users (name, email, phone, password_hash, address_street, address_number, address_city, address_state, address_neighborhood)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING ${columns};
  `;
  const { address } = user;
  const values = [
    user.name,
    user.email,
    user.phone,
    user.passwordHash,
    address.street,
    address.number,
    address.city,
    address.state,
    address.neighborhood,
  ];
  const { rows } = await pool.query<UserPublicRow>(query, values).catch((error: unknown) => {
    throw translateUniqueViolation(error);
  });
  const createdUser = rows[0];

  if (!createdUser) {
    throw new Error('It was not possible to save the user.');
  }

  return toUser(createdUser);
};

export const getUsersRepository = async (): Promise<User[]> => {
  const result = await pool.query<UserPublicRow>(`SELECT ${columns} FROM users`);

  return result.rows.map(toUser);
};

export const getUserByIdRepository = async (id: string): Promise<User> => {
  const result = await pool.query<UserPublicRow>(`SELECT ${columns} FROM users WHERE id = $1`, [
    id,
  ]);
  const row = result.rows[0];

  if (!row) {
    throw new UserNotFoundError();
  }

  return toUser(row);
};

export const updateUserRepository = async (id: string, updates: UpdateUserInput): Promise<User> => {
  const query = `
    UPDATE users
    SET name = COALESCE($1, name),
        email = COALESCE($2, email),
        phone = COALESCE($3, phone),
        address_street = COALESCE($4, address_street),
        address_number = COALESCE($5, address_number),
        address_city = COALESCE($6, address_city),
        address_state = COALESCE($7, address_state),
        address_neighborhood = COALESCE($8, address_neighborhood)
    WHERE id = $9
    RETURNING ${columns};
  `;
  const { address } = updates;
  const values = [
    updates.name,
    updates.email,
    updates.phone,
    address?.street,
    address?.number,
    address?.city,
    address?.state,
    address?.neighborhood,
    id,
  ];
  const { rows } = await pool.query<UserPublicRow>(query, values).catch((error: unknown) => {
    throw translateUniqueViolation(error);
  });
  const updatedUser = rows[0];

  if (!updatedUser) {
    throw new UserNotFoundError();
  }

  return toUser(updatedUser);
};

export const deleteUserRepository = async (id: string): Promise<void> => {
  const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);

  if (!result.rowCount) {
    throw new UserNotFoundError();
  }
};

export const findUserByIdentifierRepository = async (
  identifier: string,
): Promise<UserAuthRecord> => {
  const query = `SELECT ${columns}, password_hash FROM users WHERE email = $1 OR phone = $1`;
  const result = await pool.query<UserRow>(query, [identifier]);
  const row = result.rows[0];

  if (!row) {
    throw new UserNotFoundError();
  }

  return {
    user: toUser(row),
    passwordHash: row.password_hash,
  };
};
