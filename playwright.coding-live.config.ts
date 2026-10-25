import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: 'tests/live',
  testMatch: 'p7-coding.spec.ts',
  outputDir: '.cache/p7-live-output',
  timeout: 600000,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: '.cache/p7-final-live-results.json' }]],
  use: { trace: 'off' }
})
