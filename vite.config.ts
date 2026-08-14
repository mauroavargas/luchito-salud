import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: la app se sirve desde https://<usuario>.github.io/luchito-salud/
export default defineConfig({
  plugins: [react()],
  base: '/luchito-salud/',
})
