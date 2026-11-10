import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// Mismos alias que "paths" de tsconfig.json: vitest no los lee solo.
// Falta @types a propósito: TypeScript no permite importar con ese prefijo.
const ruta = (relativa: string): string => resolve(__dirname, relativa);

export default defineConfig({
  resolve: {
    alias: {
      '@services': ruta('./src/services'),
      '@controllers': ruta('./src/controllers'),
      '@repositories': ruta('./src/infrastructure/repositories'),
      '@config': ruta('./src/config'),
      // Solo enums: '@prisma' completo taparía @prisma/adapter-pg y otros.
      '@prisma/enums': ruta('./src/infrastructure/database/prisma/enums.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/**/*.test.ts',
      'src/**/*.spec.ts',
      'tests/**/*.test.ts',
      'tests/**/*.spec.ts',
    ],
  },
});
