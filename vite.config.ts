import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts', 'tests/smoke.js', 'tests/visual-structure.js'],
  },
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: false,
  },
  preview: {
    host: '127.0.0.1',
    port: 4174,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
