import dotenv from 'dotenv';
import { defineConfig } from 'vitest/config';

dotenv.config({ path: '.env.test' });

export default defineConfig({
  test: {
    // Integration tests share one Postgres database and clean tables.
    fileParallelism: false,
  },
});
