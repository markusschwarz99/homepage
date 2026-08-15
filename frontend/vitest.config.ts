import { defineConfig } from 'vitest/config';

// Vitest deckt nur die reine Spiellogik ab (§13). UI-, Geheimhaltungs- und
// Bedien-ACs laufen über Playwright (e2e/). Bewusst getrennt von vite.config.ts,
// damit der Produktions-Build nicht an Vitest gekoppelt ist.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
