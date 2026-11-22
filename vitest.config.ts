import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/test/**/*.test.ts', 'packages/client/src/**/*.test.{ts,tsx}'],
    testTimeout: 120_000,
  },
});
