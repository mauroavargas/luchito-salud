import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // La app se usa en Colombia. Fijar la zona evita que los tests de fechas
    // pasen aquí y fallen en CI (o al revés).
    env: { TZ: 'America/Bogota' },
    coverage: {
      provider: 'v8',
      include: ['src/lib/**'],
      exclude: ['src/lib/supabase.ts', 'src/lib/store.tsx', 'src/lib/data.ts'],
    },
  },
})
