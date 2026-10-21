import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/electron',
  timeout: 45000,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'test-results/electron-results.json' }]],
  use: { trace: 'retain-on-failure' }
})
