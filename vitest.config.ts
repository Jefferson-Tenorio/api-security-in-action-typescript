import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node', 
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'dist/'],
        thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
    },
    },
  }
});

