import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PoolClient } from 'pg';
import { pool } from './pool.js';

const migrationsDirectory = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

const migrationTable = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const runMigration = async (client: PoolClient, name: string, sql: string): Promise<void> => {
  await client.query('BEGIN');

  try {
    await client.query(sql);

    await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name]);

    await client.query('COMMIT');

    console.log(`Migration executed: ${name}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
};

const migrate = async (): Promise<void> => {
  const client = await pool.connect();

  try {
    // Prevent two migration runners from executing concurrently.
    await client.query('SELECT pg_advisory_lock(726381)');

    await client.query(migrationTable);

    const files = (await readdir(migrationsDirectory))
      .filter((file) => /^\d+_.+\.sql$/.test(file))
      .sort();

    const { rows: executedMigrations } = await client.query<{
      name: string;
    }>('SELECT name FROM schema_migrations');

    const executedNames = new Set(executedMigrations.map((migration) => migration.name));

    for (const file of files) {
      if (executedNames.has(file)) {
        console.log(`Migration already executed: ${file}`);
        continue;
      }

      const sql = await readFile(join(migrationsDirectory, file), 'utf8');

      await runMigration(client, file, sql);
    }

    console.log('Migrations completed.');
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock(726381)');
    } finally {
      client.release();
    }
  }
};

migrate()
  .catch((error: unknown) => {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
