import { defineConfig } from 'vitest/config'

/**
 * Config aparte: estas pruebas hablan con el proyecto Supabase real, crean
 * cuentas y suben archivos. No deben correr en el ciclo rápido de `npm test`.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['seguridad/**/*.test.ts', 'pruebas/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
})
