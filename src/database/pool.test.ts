import { afterAll, describe, expect, it } from 'vitest';
import { pool } from './pool.js';

describe('PostgreSQL connection', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('should connect to PostgreSQL and execute a query', async () => {
    const result = await pool.query('SELECT 1 AS value');

    expect(result.rows[0]).toEqual({ value: 1 });
  });
});
