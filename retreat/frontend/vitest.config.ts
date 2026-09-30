import { defineConfig } from 'vitest/config'

// Vitest deckt nur reine Logik ab (src/lib). Bewusst getrennt von
// vite.config.ts, damit der Produktions-Build nicht an Vitest hängt.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
