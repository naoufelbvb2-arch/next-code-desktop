import { test, expect, _electron as electron } from '@playwright/test'
import { mkdirSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { build } from 'esbuild'

const modulePath = resolve('.cache/p6-main-fixture.cjs')
test.beforeAll(async () => {
  await build({
    entryPoints: ['tests/fixtures/broker-main.ts'],
    outfile: modulePath,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    external: ['koffi'],
    logLevel: 'silent'
  })
})
function fixture() {
  mkdirSync('.test-profiles', { recursive: true })
  return mkdtempSync(resolve('.test-profiles', 'p6-electron-'))
}
async function launch(profile: string) {
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
  const page = await app.firstWindow()
  await expect(page.getByRole('textbox', { name: 'Message' })).toBeVisible()
  return { app, page }
}
test('P6-E01 actual Windows Main worker -> closed Preload -> local Files preview, sensitive denial and zero discussion evidence', async () => {
  const profile = fixture(),
    project = join(profile, 'Atlas browser project')
  mkdirSync(project)
  writeFileSync(join(profile, 'python-runtime.json'), JSON.stringify({ fileBroker: true }))
  writeFileSync(join(project, 'notes.custom'), 'Atlas safe local preview\n')
  writeFileSync(join(project, '.env.local'), 'synthetic sensitive fixture')
  writeFileSync(join(project, 'config.ts'), 'const api_key="synthetic-credential-value"\n')
  const { app, page } = await launch(profile)
  try {
    await app.evaluate(({ dialog }, path) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] })
    }, project)
    await page.getByRole('button', { name: 'Projects', exact: true }).click()
    await page.getByRole('button', { name: 'Open project', exact: true }).click()
    await expect(page.locator('.project-copy strong')).toHaveText('Atlas browser project')
    await page.getByRole('button', { name: 'Open Files panel' }).click()
    await expect(page.getByRole('button', { name: 'File: notes.custom' })).toBeVisible()
    await expect(page.getByRole('button', { name: /\.env/ })).toHaveCount(0)
    await page.getByRole('button', { name: 'File: notes.custom' }).click()
    await expect(page.getByRole('region', { name: 'Safe file preview' })).toContainText(
      'Atlas safe local preview'
    )
    await page.getByRole('button', { name: 'File: config.ts' }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Safe file preview' })).toHaveCount(0)
    const proof = await app.evaluate(({ app }) => {
      const { DatabaseSync } = process.getBuiltinModule('node:sqlite')!,
        { join } = process.getBuiltinModule('node:path')!
      const db = new DatabaseSync(join(app.getPath('userData'), 'desktop-state.sqlite3'), {
        readOnly: true
      })
      try {
        return {
          observations: db.prepare('SELECT count(*) n FROM inspection_observations').get()!.n,
          tasks: db.prepare('SELECT count(*) n FROM tasks').get()!.n,
          messages: db.prepare('SELECT count(*) n FROM messages').get()!.n
        }
      } finally {
        db.close()
      }
    })
    expect(proof).toEqual({ observations: 0, tasks: 0, messages: 0 })
  } finally {
    await app.close()
  }
})
test('P6-E02 actual Windows Main/Job/production Discussion broker and original Gateway with MockTransport, consent then source handoff/T5', async () => {
  const profile = fixture(),
    { app } = await launch(profile)
  const call = (method: string, args: unknown[] = []) =>
    app.evaluate(
      async ({}, input) => {
        const load = process.getBuiltinModule('node:module')!.createRequire(input.module)
        return load(input.module)[input.method](...input.args)
      },
      { module: modulePath, method, args }
    )
  try {
    expect(await call('startBrokerPeer', [profile])).toMatchObject({
      ready: true,
      role: 'discussion',
      platform: 'win32'
    })
    const denied = await call('submitBrokerPeer')
    expect(denied).toMatchObject({
      ready: true,
      metrics: { mockProviderCalls: 0 },
      readObservations: 0,
      events: 0,
      tasks: 0,
      conversation: {
        disclosureChallenges: [{ providerLabel: 'DeepSeek' }],
        messages: [{ role: 'user' }]
      }
    })
    await call('grantBrokerPeer')
    const permitted = await call('submitBrokerPeer', ['/inspect project'])
    expect(permitted).toMatchObject({
      ready: true,
      lastError: null,
      metrics: { mockProviderCalls: 1, approvedSources: 1, lowerTrustAndNoTools: true },
      readObservations: 1,
      tasks: 0,
      events: 0,
      conversation: {
        messages: [
          { role: 'user' },
          { role: 'user' },
          { role: 'assistant', text: 'Fixture provider saw Atlas in an approved excerpt.' }
        ]
      }
    })
  } finally {
    await call('closeBrokerPeer').catch(() => {})
    await app.close()
  }
})

test('P6-E03 actual Electron Main exits after successful pipe callback before evidence COMMIT; reopen preserves partial undercount and never replays', async () => {
  const profile = fixture(),
    first = await launch(profile)
  const firstProcess = first.app.process()
  const call = (app: typeof first.app, method: string, args: unknown[] = []) =>
    app.evaluate(
      async ({}, input) => {
        const load = process.getBuiltinModule('node:module')!.createRequire(input.module)
        return load(input.module)[input.method](...input.args)
      },
      { module: modulePath, method, args }
    )
  try {
    await call(first.app, 'startBrokerPeer', [profile])
    await call(first.app, 'submitBrokerPeer')
    await call(first.app, 'grantBrokerPeer')
    await call(first.app, 'armBrokerCrash')
    const exited = new Promise<number | null>((resolve) => firstProcess.once('exit', resolve))
    void call(first.app, 'submitBrokerPeer').catch(() => {})
    expect(await exited).toBe(86)
    expect(existsSync(join(profile, 'post-write-pre-commit.marker'))).toBe(true)
    const second = await launch(profile)
    try {
      expect(await call(second.app, 'recoverBrokerPeer', [profile])).toMatchObject({
        readObservations: 0,
        tasks: 0,
        events: 0,
        view: {
          ok: true,
          data: {
            inspectionStatus: { state: 'partial', actuallyReadCount: 0 },
            messages: [{ role: 'user' }, { role: 'user' }]
          }
        }
      })
    } finally {
      await second.app.close()
    }
  } finally {
    if (firstProcess.exitCode === null) await first.app.close().catch(() => {})
  }
})

test('P6-E04 P5 two-turn discussion regression through actual Windows Main/Job/bridge/Gateway with MockTransport and no broker reads', async () => {
  const profile = fixture(),
    { app } = await launch(profile)
  const call = (method: string, args: unknown[] = []) =>
    app.evaluate(
      async ({}, input) => {
        const load = process.getBuiltinModule('node:module')!.createRequire(input.module)
        return load(input.module)[input.method](...input.args)
      },
      { module: modulePath, method, args }
    )
  try {
    await call('startBrokerPeer', [profile])
    expect(await call('submitBrokerPeer', ['Remember synthetic name Atlas.'])).toMatchObject({
      metrics: { mockProviderCalls: 1, approvedSources: 0 },
      readObservations: 0
    })
    expect(await call('submitBrokerPeer', ['What synthetic name did I give you?'])).toMatchObject({
      ready: true,
      lastError: null,
      metrics: { mockProviderCalls: 2, approvedSources: 0 },
      readObservations: 0,
      tasks: 0,
      events: 0,
      conversation: {
        inspectionStatus: null,
        messages: [
          { role: 'user' },
          { role: 'assistant', text: 'Fixture provider remembered Atlas.' },
          { role: 'user' },
          { role: 'assistant', text: 'Fixture provider remembered Atlas.' }
        ]
      }
    })
  } finally {
    await call('closeBrokerPeer').catch(() => {})
    await app.close()
  }
})
