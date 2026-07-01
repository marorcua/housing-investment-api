import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['dist/**', 'node_modules/**', 'src/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/infrastructure/**',
        'src/**/domain/ports/**',
        'src/**/application/services/**',
        'src/**/domain/entities/**',
        'dist/**',
        'src/**/*.test.ts',
        'src/index.ts',
        'src/auth/domain/**',
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
