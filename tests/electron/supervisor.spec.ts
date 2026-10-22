import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test'
import { build } from 'esbuild'
import { resolve } from 'node:path'
import koffi from 'koffi'
import { configFixture } from '../fixtures/supervision'

const fixtureModule = resolve('.cache/p4-electron-fixture.cjs')
test.beforeAll(async () => {
  await build({
    entryPoints: ['tests/fixtures/supervision.ts'],
    outfile: fixtureModule,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    external: ['koffi'],
    logLevel: 'silent'
  })
})
async function launch(profile: string) {
  const env = Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
  )
  delete env.ELECTRON_RUN_AS_NODE
  delete env.ELECTRON_RENDERER_URL
  const app = await electron.launch({
    args: [resolve('out/main/index.js'), `--p1-test-profile=${profile}`],
    env
  })
  const page = await app.firstWindow()
  await expect(page.getByRole('textbox', { name: 'Message' })).toBeVisible()
  return { app, page }
}
async function call(app: ElectronApplication, method: string, args: unknown[] = []) {
  return app.evaluate(
    async ({}, input) => {
      const load = process.getBuiltinModule('node:module')!.createRequire(input.module)
      return load(input.module)[input.method](...input.args)
    },
    { module: fixtureModule, method, args }
  )
}
// Observation handles only. Termination always uses the actual test-owned
// Electron ChildProcess handle or the supervisor's non-inheritable Job handle.
function observeOwnedProcess(pid: number, expectedCreation?: string) {
  const lib = koffi.load('kernel32.dll')
  const open = lib.func('void * OpenProcess(uint32 rights,int32 inherit,uint32 pid)')
  const wait = lib.func('uint32 WaitForSingleObject(void *h,uint32 ms)')
  const close = lib.func('int32 CloseHandle(void *h)')
  const terminate = lib.func('int32 TerminateProcess(void *h,uint32 code)')
  const times = lib.func(
    'int32 GetProcessTimes(void *h,_Out_ void *created,_Out_ void *exit,_Out_ void *kernel,_Out_ void *user)'
  )
  const handle = open(expectedCreation ? 0x101001 : 0x101000, 0, pid),
    created = Buffer.alloc(8)
  expect(handle).toBeTruthy()
  expect(times(handle, created, Buffer.alloc(8), Buffer.alloc(8), Buffer.alloc(8))).toBe(1)
  if (expectedCreation) expect(created.readBigUInt64LE().toString()).toBe(expectedCreation)
  return {
    exited: () => wait(handle, 0) === 0,
    close: () => close(handle),
    creation: created.readBigUInt64LE().toString(),
    terminateOwnedMain: () => {
      if (!expectedCreation) throw new Error('No Main termination authority')
      return terminate(handle, 23)
    }
  }
}

test('P4-WIN01: real Electron Main Node-API/Job/Discussion bridge, Renderer reload keeps the same owned session and has no process authority', async () => {
  const { directory } = configFixture(),
    { app, page } = await launch(directory)
  try {
    const before = await call(app, 'startElectronDiscussion')
    expect(before.state).toBe('READY')
    expect(before.creation).toMatch(/^\d+$/)
    await page.reload()
    expect(await call(app, 'electronSnapshot')).toEqual(before)
    expect(await call(app, 'electronDiscussionRequest')).toMatchObject({
      type: 'error',
      payload: { code: 'PROVIDER_UNAVAILABLE', retryable: false }
    })
    expect(
      await page.evaluate(() =>
        ['require', 'process', 'spawn', 'ipcRenderer', 'DatabaseSync'].filter(
          (key) => key in window
        )
      )
    ).toEqual([])
    expect(await page.evaluate(() => window.nextCode.app.bootstrap())).toMatchObject({
      ok: true,
      data: { runtimeStatus: 'not_ready' }
    })
    expect(await call(app, 'stopElectronFixture')).toBe(true)
  } finally {
    await app.close()
  }
})

test('P4-WIN02: missing Python configuration leaves actual local preferences and interface available; no simulator in production history', async () => {
  const { directory, config } = configFixture()
  // Explicit incompatible local config; no fallback to installed PATH Python.
  const fs = await import('node:fs')
  fs.writeFileSync(
    config,
    JSON.stringify({ pythonPath: 'python.exe', pythonSha256: '0'.repeat(64) })
  )
  const { app, page } = await launch(directory)
  try {
    expect(await page.evaluate(() => window.nextCode.preferences.get())).toMatchObject({ ok: true })
    expect(await page.evaluate(() => window.nextCode.app.bootstrap())).toMatchObject({
      ok: true,
      data: { runtimeStatus: 'not_ready', activeTaskSummaries: [] }
    })
    await expect(page.getByRole('textbox', { name: 'Message' })).toBeVisible()
    expect(await page.evaluate(() => window.nextCode.tasks.list())).toMatchObject({
      ok: false,
      error: { code: 'RUNTIME_NOT_READY' }
    })
  } finally {
    await app.close()
  }
})

test('P4-WIN03: forced real Main death closes its Job, stops child/grandchild, and next Main recovers durable uncertainty without replay or lease release', async () => {
  const { directory } = configFixture()
  let current = await launch(directory),
    watch: ReturnType<typeof observeOwnedProcess> | undefined,
    grandchild: ReturnType<typeof observeOwnedProcess> | undefined,
    main: ReturnType<typeof observeOwnedProcess> | undefined
  try {
    const fixture = await call(current.app, 'startElectronTree', [directory])
    expect(fixture.active).toBeGreaterThanOrEqual(3)
    watch = observeOwnedProcess(fixture.descendant)
    grandchild = observeOwnedProcess(fixture.grandchild)
    expect(watch.exited()).toBe(false)
    const identity = await call(current.app, 'mainProcessIdentity')
    main = observeOwnedProcess(identity.pid, identity.creation)
    expect(main.terminateOwnedMain()).toBe(1)
    await expect.poll(() => main!.exited(), { timeout: 8000 }).toBe(true)
    await expect.poll(() => watch!.exited(), { timeout: 8000 }).toBe(true)
    await expect.poll(() => grandchild!.exited(), { timeout: 8000 }).toBe(true)
    // The Main was intentionally killed; do not send a close RPC to a dead peer.
    current = await launch(directory)
    const snapshot = await current.page.evaluate(() => window.nextCode.app.bootstrap())
    expect(snapshot).toMatchObject({
      ok: true,
      data: { activeTaskSummaries: [{ taskId: fixture.taskId, state: 'needs_reconciliation' }] }
    })
    const facts = await current.app.evaluate(({ app }) => {
      const { DatabaseSync } = process.getBuiltinModule('node:sqlite')!,
        { join } = process.getBuiltinModule('node:path')!
      const db = new DatabaseSync(join(app.getPath('userData'), 'desktop-state.sqlite3'), {
        readOnly: true
      })
      try {
        return {
          leases: db.prepare('SELECT count(*) n FROM workspace_writer_leases').get()!.n,
          outcomes: db
            .prepare('SELECT count(*) n FROM tasks WHERE engine_outcome_json IS NOT NULL')
            .get()!.n,
          terminal: db
            .prepare(
              "SELECT count(*) n FROM task_events WHERE name IN ('task.completed','task.failed','task.cancelled')"
            )
            .get()!.n,
          tasks: db.prepare('SELECT count(*) n FROM tasks').get()!.n
        }
      } finally {
        db.close()
      }
    })
    expect(facts).toEqual({ leases: 1, outcomes: 0, terminal: 0, tasks: 1 })
    expect(await call(current.app, 'electronSnapshot')).toBe(null)
  } finally {
    watch?.close()
    grandchild?.close()
    main?.close()
    if (current.app.process().exitCode === null) {
      await call(current.app, 'stopElectronFixture').catch(() => {})
      await current.app.close().catch(() => {})
    }
  }
})
