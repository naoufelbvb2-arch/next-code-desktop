import { test, expect, _electron as electron } from '@playwright/test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { build } from 'esbuild'

test('P7-WIN01 actual Main/Job/Discussion/Gateway mock issues a proposal, explicit Renderer Run Task hits the closed engine gate without admission/spawn/replay', async () => {
  mkdirSync('.test-profiles', { recursive: true })
  const profile = mkdtempSync(resolve('.test-profiles', 'p7-coding-')),
    module = resolve('.cache/p7-coding-main.cjs')
  await build({
    entryPoints: ['tests/fixtures/coding-main.ts'],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: module,
    external: ['koffi', 'electron', 'esbuild'],
    logLevel: 'silent'
  })
  writeFileSync(join(profile, 'python-runtime.json'), JSON.stringify({ fileBroker: true }))
  const env = Object.fromEntries(
    Object.entries(process.env).filter((p): p is [string, string] => p[1] !== undefined)
  )
  delete env.ELECTRON_RUN_AS_NODE
  delete env.ELECTRON_RENDERER_URL
  delete env.DEEPSEEK_API_KEY
  const app = await electron.launch({
    args: [resolve('out/main/index.js'), `--p1-test-profile=${profile}`],
    env
  })
  const call = (method: string, args: unknown[] = []) =>
    app.evaluate(
      async ({}, input) => {
        const load = process.getBuiltinModule('node:module')!.createRequire(input.module)
        return load(input.module)[input.method](...input.args)
      },
      { module, method, args }
    )
  try {
    const page = await app.firstWindow()
    await expect(page.getByRole('textbox', { name: 'Message' })).toBeVisible()
    expect(await call('startCodingFixture', [profile])).toEqual({ ready: true, role: 'discussion' })
    await page.reload()
    await expect(
      page
        .getByRole('combobox', { name: 'Discussion model' })
        .locator('option[value="deepseek-flash"]')
    ).toBeEnabled()
    await page.getByRole('combobox', { name: 'Discussion model' }).selectOption('deepseek-flash')
    await page
      .getByRole('textbox', { name: 'Message' })
      .fill('Propose a tiny synthetic change. Do not run it.')
    await page.getByRole('button', { name: 'Send message' }).click()
    await expect(page.getByRole('button', { name: 'Run Task' })).toBeVisible()
    expect(await call('codingSnapshot')).toMatchObject({
      tasks: 0,
      leases: 0,
      events: 0,
      proposals: [{ state: 'available' }],
      attempts: [{ status: 'completed' }]
    })
    await page.getByRole('button', { name: 'Run Task' }).click()
    await expect(page.getByRole('alert')).toContainText(
      'engine lifecycle and cooperative cancellation'
    )
    expect(await call('codingSnapshot')).toMatchObject({
      tasks: 0,
      events: 0,
      leases: 0,
      slot: null,
      proposals: [{ state: 'available' }]
    })
    await page.reload()
    await page.locator('.sidebar-history button').first().click()
    await expect(page.getByRole('button', { name: 'Run Task' })).toBeVisible()
    expect(await call('codingSnapshot')).toMatchObject({ tasks: 0, events: 0, leases: 0 })
    await page.screenshot({ path: '.cache/p7-proposal-gate.png' })
  } finally {
    await call('stopCodingFixture').catch(() => {})
    await app.close()
  }
})
