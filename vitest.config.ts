import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Default environment for React hook tests
    environment: 'jsdom',
    // Route pure utility tests to Node.js — no DOM globals
    environmentMatchGlobs: [
      ['src/render-tracker/__tests__/shallowDiff.test.ts', 'node'],
      ['src/render-tracker/__tests__/store.test.ts', 'node'],
      ['src/render-tracker-ui/__tests__/formatPropValue.test.ts', 'node'],
      ['src/render-tracker-ui/__tests__/computeSummaries.test.ts', 'node'],
      ['src/render-tracker-ui/__tests__/computeEventRows.test.ts', 'node'],
    ],
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/render-tracker/**', 'src/render-tracker-ui/**'],
      exclude: [
        'src/render-tracker/__tests__/**',
        'src/render-tracker-ui/__tests__/**',
      ],
      thresholds: { lines: 80 },
    },
  },
});
