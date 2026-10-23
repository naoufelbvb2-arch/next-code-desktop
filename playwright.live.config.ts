import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: 'tests/live',
  outputDir: '.cache/p5-live-output',
  workers: 1,
  timeout: 90000,
  reporter: [['list'], ['json', { outputFile: '.cache/p5-live-results.json' }]],
  use: { trace: 'off' }
})
