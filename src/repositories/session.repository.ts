import { pool } from '../database/pool.js';
import { UserNotFoundError } from '../errors/user.errors.js';
import type { CreateSessionInput, Session, SessionRow } from '../types/session.js';

export type { CreateSessionInput, Session } from '../types/session.js';

const columns =
  'id, user_id, refresh_token_hash, user_agent, ip_address, created_at, expires_at, last_used_at, revoked_at';

const toSession = (row: SessionRow): Session => ({
  id: row.id,
  userId: row.user_id,
  refreshTokenHash: row.refresh_token_hash,
  userAgent: row.user_agent,
  ipAddress: row.ip_address,
  createdAt: row.created_at,
  expiresAt: row.expires_at,
  lastUsedAt: row.last_used_at,
  revokedAt: row.revoked_at,
});

export const saveSessionRepository = async (session: CreateSessionInput): Promise<Session> => {
  const query = `
    INSERT INTO sessions (
      user_id,
      refresh_token_hash,
      user_agent,
      ip_address,
      expires_at
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING ${columns};
  `;

  const values = [
    session.userId,
    session.refreshTokenHash,
    session.userAgent ?? null,
    session.ipAddress ?? null,
    session.expiresAt,
  ];

  let rows: SessionRow[];

  try {
    ({ rows } = await pool.query<SessionRow>(query, values));
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23503') {
      throw new UserNotFoundError({ cause: error });
    }

    throw error;
  }

  if (!rows[0]) {
    throw new Error('It was not possible to save the session.');
  }

  return toSession(rows[0]);
};

export const findSessionByRefreshTokenHashRepository = async (
  refreshTokenHash: string,
): Promise<Session | null> => {
  const { rows } = await pool.query<SessionRow>(
    `SELECT ${columns} FROM sessions WHERE refresh_token_hash = $1`,
    [refreshTokenHash],
  );

  return rows[0] ? toSession(rows[0]) : null;
};

export const rotateSessionRepository = async (
  currentRefreshTokenHash: string,
  newRefreshTokenHash: string,
): Promise<Session | null> => {
  const query = `
    UPDATE sessions
    SET refresh_token_hash = $2,
        last_used_at = NOW()
    WHERE refresh_token_hash = $1
      AND revoked_at IS NULL
      AND expires_at > NOW()
    RETURNING ${columns};
  `;

  const { rows } = await pool.query<SessionRow>(query, [
    currentRefreshTokenHash,
    newRefreshTokenHash,
  ]);

  return rows[0] ? toSession(rows[0]) : null;
};

export const revokeSessionRepository = async (id: string): Promise<Session | null> => {
  const query = `
    UPDATE sessions
    SET revoked_at = NOW()
    WHERE id = $1
      AND revoked_at IS NULL
    RETURNING ${columns};
  `;

  const { rows } = await pool.query<SessionRow>(query, [id]);

  return rows[0] ? toSession(rows[0]) : null;
};

export const revokeSessionByRefreshTokenHashRepository = async (
  refreshTokenHash: string,
): Promise<Session | null> => {
  const query = `
    UPDATE sessions
    SET revoked_at = NOW()
    WHERE refresh_token_hash = $1
      AND revoked_at IS NULL
    RETURNING ${columns};
  `;

  const { rows } = await pool.query<SessionRow>(query, [refreshTokenHash]);

  return rows[0] ? toSession(rows[0]) : null;
};

export const revokeAllSessionsByUserIdRepository = async (userId: string): Promise<number> => {
  const query = `
    UPDATE sessions
    SET revoked_at = NOW()
    WHERE user_id = $1
      AND revoked_at IS NULL;
  `;

  const { rowCount } = await pool.query(query, [userId]);

  return rowCount ?? 0;
};
