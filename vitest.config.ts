import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Integration tests share one Postgres database and clean tables.
    fileParallelism: false,
  },
});
