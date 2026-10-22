import { test, expect, _electron as electron } from '@playwright/test'
import { readdirSync, statSync, readFileSync, mkdirSync } from 'node:fs'
import { resolve, join } from 'node:path'

// Read-only verification of the already-created isolated live-test ledger.
// No Send action, new turn, provider request or credentials in test output.
test('P5-RESTORE: current Desktop restores the actual live conversation and model readiness without another API request', async () => {
  const directory = readdirSync('.test-profiles')
    .filter((name) => name.startsWith('p5-live-'))
    .map((name) => resolve('.test-profiles', name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0]
  expect(directory).toBeTruthy()
  const config = JSON.parse(readFileSync(join(directory, 'python-runtime.json'), 'utf8'))
  const count = () => JSON.parse(readFileSync(config.discussion.budgetFile, 'utf8')).requests.length
  const before = count()
  const env = Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
  )
  delete env.ELECTRON_RUN_AS_NODE
  delete env.ELECTRON_RENDERER_URL
  delete env.DEEPSEEK_API_KEY
  const app = await electron.launch({
    args: [resolve('out/main/index.js'), `--p1-test-profile=${directory}`],
    env
  })
  try {
    const page = await app.firstWindow()
    await expect(page.getByRole('textbox', { name: 'Message' })).toBeVisible()
    await expect(
      page
        .getByRole('combobox', { name: 'Discussion model' })
        .locator('option[value="deepseek-flash"]')
    ).toBeEnabled({ timeout: 20000 })
    await page.locator('.sidebar-history button').first().click()
    await expect(page.locator('.conversation-message.assistant')).toHaveCount(2)
    await expect(page.locator('.conversation-message.assistant').last()).toContainText('Atlas')
    expect(await page.evaluate(() => window.nextCode.app.bootstrap())).toMatchObject({
      ok: true,
      data: { runtimeStatus: 'ready', discussionModelId: 'deepseek-flash' }
    })
    expect(count()).toBe(before)
    mkdirSync('docs/implementation/P5/screenshots', { recursive: true })
    await page.screenshot({ path: 'docs/implementation/P5/screenshots/live-discussion.png' })
  } finally {
    await app.close()
  }
})
