import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test'
import { build } from 'esbuild'
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import koffi from 'koffi'

const run = process.env.NCD_R02_RUN_ID ?? 'manual-' + Date.now()
const module = resolve('.cache/p9r02-main-' + run + '.cjs')
const main = resolve('out/main/p9r02-isolated-' + run + '.js')
const worker = resolve('.cache/p9r02-history-' + run + '.mjs')
function save(name: string, data: unknown) {
  writeFileSync(`.cache/p9r02-${name}-${run}.json`, JSON.stringify(data, null, 2) + '\n')
}
test.beforeAll(async () => {
  await build({
    entryPoints: ['tests/fixtures/p9r02-main.ts'],
    outfile: module,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    external: ['electron', 'koffi', 'esbuild'],
    logLevel: 'silent'
  })
  await build({
    entryPoints: ['tests/fixtures/p9r02-history-worker.ts'],
    outfile: worker,
    bundle: true,
    platform: 'node',
    format: 'esm',
    logLevel: 'silent'
  })
  await build({
    entryPoints: ['electron/main/index.ts'],
    outfile: main,
    bundle: true,
    platform: 'node',
    format: 'esm',
    external: ['electron', 'koffi'],
    logLevel: 'silent',
    banner: {
      js: "import { createRequire as r02CreateRequire } from 'node:module'; const require = r02CreateRequire(import.meta.url);"
    },
    plugins: [
      {
        name: 'isolated-owned-supervisor-injection',
        setup(b) {
          b.onLoad({ filter: /[\\/]supervisor[\\/]application\.ts$/ }, async (args) => ({
            loader: 'ts',
            contents:
              readFileSync(args.path, 'utf8') +
              `\n;(globalThis as any).__r02AttachSupervisor = (value: PythonSupervisor) => { supervisor = value; startup = Promise.resolve(); stopping = false };\n`
          }))
        }
      }
    ]
  })
})
async function launch(injected = true) {
  mkdirSync('.test-profiles', { recursive: true })
  const profile = mkdtempSync(resolve('.test-profiles', 'p9r02-'))
  writeFileSync(join(profile, 'python-runtime.json'), JSON.stringify({ fileBroker: true }))
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      (e): e is [string, string] =>
        e[1] !== undefined && !/API_KEY|TOKEN|SECRET|PASSWORD/i.test(e[0])
    )
  )
  delete env.ELECTRON_RUN_AS_NODE
  delete env.ELECTRON_RENDERER_URL
  const app = await electron.launch({
    args: [injected ? main : resolve('out/main/index.js'), `--p1-test-profile=${profile}`],
    env
  })
  return { app, page: await app.firstWindow(), profile }
}
function call(app: ElectronApplication, method: string, args: unknown[] = []): Promise<any> {
  return app.evaluate(
    async ({}, v) =>
      process
        .getBuiltinModule('node:module')!
        .createRequire(v.module)(v.module)
        [v.method](...v.args),
    { module, method, args }
  )
}
async function propose(page: Awaited<ReturnType<typeof launch>>['page']) {
  await page.reload()
  await page.getByRole('combobox', { name: 'Discussion model' }).selectOption('deepseek-flash')
  await page
    .getByRole('textbox', { name: 'Message' })
    .fill('Propose only the isolated synthetic task; explicit approval required.')
  await page.getByRole('button', { name: 'Send message' }).click()
  await page.getByRole('button', { name: 'Run Task', exact: true }).click()
  await expect(page.getByText(/Task .+: running/)).toBeVisible()
}
function nativeWatch(pid: number, creation?: string) {
  const k = koffi.load('kernel32.dll'),
    open = k.func('void * __stdcall OpenProcess(uint32 a,int32 i,uint32 p)'),
    close = k.func('int32 __stdcall CloseHandle(void *h)'),
    wait = k.func('uint32 __stdcall WaitForSingleObject(void *h,uint32 t)'),
    times = k.func(
      'int32 __stdcall GetProcessTimes(void *h,_Out_ void *c,_Out_ void *e,_Out_ void *k,_Out_ void *u)'
    )
  const h = open(0x101000, 0, pid),
    created = Buffer.alloc(8)
  expect(h).toBeTruthy()
  expect(times(h, created, Buffer.alloc(8), Buffer.alloc(8), Buffer.alloc(8))).toBe(1)
  if (creation) expect(created.readBigUInt64LE().toString()).toBe(creation)
  return { exited: () => wait(h, 0) === 0, close: () => close(h) }
}
function watchJob(mainPid: number, job: string) {
  const k = koffi.load('kernel32.dll'),
    open = k.func('void * __stdcall OpenProcess(uint32 a,int32 i,uint32 p)'),
    current = k.func('void * __stdcall GetCurrentProcess()'),
    close = k.func('int32 __stdcall CloseHandle(void *h)'),
    dup = k.func(
      'int32 __stdcall DuplicateHandle(void *source,intptr_t handle,void *target,_Out_ void **copy,uint32 access,int32 inherit,uint32 options)'
    ),
    query = k.func(
      'int32 __stdcall QueryInformationJobObject(void *h,int32 kind,_Out_ void *data,uint32 size,void *length)'
    )
  const p = open(0x40, 0, mainPid),
    result = [null]
  expect(p).toBeTruthy()
  try {
    expect(dup(p, BigInt(job), current(), result, 4, 0, 0)).toBe(1)
  } finally {
    close(p)
  }
  return {
    active: () => {
      const b = Buffer.alloc(48)
      expect(query(result[0], 1, b, b.length, null)).toBe(1)
      return b.readUInt32LE(40)
    },
    close: () => close(result[0])
  }
}

for (const mode of ['worker', 'stubborn'] as const)
  test(`R02-Q-${mode} original Electron before-quit wait/confirm uses actual AgentOS, bounded Windows Job cleanup and durable conservative recovery`, async () => {
    test.setTimeout(70000)
    let current = await launch()
    const watches: ReturnType<typeof nativeWatch>[] = []
    let job: ReturnType<typeof watchJob> | undefined
    try {
      await call(current.app, 'startActualCodingFixture', [mode])
      await propose(current.page)
      const location = await call(current.app, 'actualCrashEvidence')
      if (mode === 'stubborn')
        await expect
          .poll(
            async () => {
              location.descendants = (await call(current.app, 'actualCrashEvidence')).descendants
              return location.descendants.length
            },
            { timeout: 15000 }
          )
          .toBe(2)
      const handles = await call(current.app, 'ownedHandles')
      watches.push(nativeWatch(handles.coding, handles.creation))
      for (const pid of location.descendants) watches.push(nativeWatch(pid))
      job = watchJob(handles.main, handles.job)
      expect(job.active()).toBeGreaterThanOrEqual(mode === 'stubborn' ? 3 : 1)
      expect(await call(current.app, 'attachQuit', [0])).toMatchObject({
        originalBeforeQuitHandlers: 1
      })
      await call(current.app, 'quit', [mode === 'worker'])
      await expect(current.page.getByText(/Task .+: running/)).toBeVisible()
      expect(
        (await call(current.app, 'actualCodingSnapshot')).events.map((e: any) => e.name)
      ).not.toContain('task.cancelled')
      expect(job.active()).toBeGreaterThan(0)
      const waited = JSON.parse(readFileSync(join(location.directory, 'r02-dialog.json'), 'utf8'))
      expect(waited[0]).toMatchObject({
        title: 'Active coding task',
        buttons: ['Wait', 'Cancel task and quit'],
        choice: 0
      })
      await call(current.app, 'attachQuit', [1])
      const exit = new Promise<number | null>((done) => current.app.process().once('exit', done)),
        start = performance.now()
      await call(current.app, 'quit').catch(() => {})
      expect(await exit).toBe(0)
      const elapsedMs = performance.now() - start
      const confirmed = JSON.parse(
        readFileSync(join(location.directory, 'r02-dialog.json'), 'utf8')
      )
      if (mode === 'stubborn')
        expect(confirmed.some((d: any) => d.title === 'Cleanup unverified')).toBe(true)
      for (const w of watches) await expect.poll(w.exited, { timeout: 8000 }).toBe(true)
      expect(job.active()).toBe(0)
      if (mode === 'stubborn') expect(elapsedMs).toBeGreaterThanOrEqual(14950)
      current = await launch(false)
      const restored = await call(current.app, 'recoverActualCodingFixture', [
        { directory: location.directory, workspace: location.workspace }
      ])
      expect(restored.tasks).toHaveLength(1)
      expect(restored.status.active).toBeNull()
      const names = restored.events.map((e: any) => e.name)
      if (mode === 'worker') {
        expect(names).toContain('task.cancelled')
        expect(restored.leases).toBe(0)
      } else {
        expect(names).not.toContain('task.cancelled')
        expect(restored.leases).toBe(1)
        expect(restored.tasks[0].state).toBe('needs_reconciliation')
      }
      const { DatabaseSync } = await import('node:sqlite'),
        db = new DatabaseSync(join(location.directory, 'state.sqlite3'), { readOnly: true })
      let integrity: unknown, cancelCount: unknown
      try {
        integrity = db.prepare('PRAGMA integrity_check').get()
        cancelCount = db
          .prepare('SELECT count(*) n FROM tasks WHERE cancel_request_ref IS NOT NULL')
          .get()?.n
      } finally {
        db.close()
      }
      save('quit-' + mode, {
        mode,
        originalHandler: true,
        testOnlySupervisorBinding: true,
        nativeDialogChoiceAutomated: true,
        humanSignoff: false,
        unverifiedWarningShown: confirmed.some((d: any) => d.title === 'Cleanup unverified'),
        waitPreservedTask: true,
        waitPreservedWindow: true,
        firstQuitViaWindowClose: mode === 'worker',
        elapsedMs,
        descendantsObserved: location.descendants.length,
        heldNativeProcessesSignaled: watches.length,
        retainedJobActiveProcesses: job.active(),
        cancellationRows: cancelCount,
        integrity,
        restoredTasks: restored.tasks.map((t: any) => ({ state: t.state })),
        leases: restored.leases,
        eventNames: names,
        noAutomaticRestart: restored.status.active === null,
        duplicateJobNote:
          'Independent QUERY handle retained across app exit; extends handle lifetime, cleanup established before final handle close, not kill-on-close assumption.'
      })
    } finally {
      watches.forEach((w) => w.close())
      job?.close()
      await call(current.app, 'stopActualCodingFixture').catch(() => {})
      await current.app.close().catch(() => {})
    }
  })

test('R02-H01 high-rate isolated SQLite history with actual AgentOS workers, Mission Control navigation/reload, bounded reads and real cancellation', async () => {
  test.setTimeout(100000)
  const current = await launch(false),
    samples: unknown[] = []
  try {
    await call(current.app, 'startActualCodingFixture', ['soak'])
    await propose(current.page)
    const synthetic = await call(current.app, 'startHistory', [worker])
    await expect
      .poll(async () => (await call(current.app, 'historyStatus')).rowCount, { timeout: 15000 })
      .toBeGreaterThanOrEqual(10000)
    const start = performance.now()
    let cycles = 0,
      reloads = 0,
      cancellationLatencyMs = 0,
      cancellationAtBatch = 0
    while (!(await call(current.app, 'historyStatus')).complete) {
      await current.page.getByRole('button', { name: 'Agents', exact: true }).click()
      await current.page.getByRole('combobox', { name: 'Mission' }).selectOption(synthetic.taskId)
      await expect(current.page.getByRole('region', { name: 'Mission Header' })).toContainText(
        'SYNTHETIC HISTORY'
      )
      await expect(current.page.getByRole('region', { name: 'Mission Header' })).toContainText(
        'no gap reported'
      )
      expect(
        await current.page.getByRole('region', { name: 'Execution Timeline' }).locator('li').count()
      ).toBeLessThanOrEqual(100)
      const before = performance.now(),
        metrics = await call(current.app, 'actualR01Metrics')
      expect(metrics.incomingRecords).toBeLessThanOrEqual(256)
      expect(metrics.incomingBytes).toBeLessThanOrEqual(8 * 1024 * 1024)
      expect(metrics.outgoingRecords).toBeLessThanOrEqual(256)
      expect(metrics.outgoingBytes).toBeLessThanOrEqual(8 * 1024 * 1024)
      const renderer = await current.page.evaluate(async () => {
        const t = performance.now()
        await new Promise((r) => requestAnimationFrame(r))
        return {
          frameMs: performance.now() - t,
          dom: document.querySelectorAll('*').length,
          heap: (performance as any).memory?.usedJSHeapSize ?? null
        }
      })
      samples.push({
        elapsedMs: performance.now() - start,
        mainRoundTripMs: performance.now() - before,
        metrics,
        renderer
      })
      await current.page.getByRole('button', { name: 'Projects', exact: true }).click()
      await current.page.getByRole('button', { name: 'Settings', exact: true }).click()
      if (cycles % 3 === 0) {
        await current.page.reload()
        reloads++
      }
      await current.page.locator('.sidebar-history button').first().click()
      const live = await call(current.app, 'historyStatus')
      if (!cancellationAtBatch && live.batches >= 75) {
        expect(live.complete).toBe(false)
        cancellationAtBatch = live.batches
        const cancel = performance.now()
        await current.page.getByRole('button', { name: 'Request cancellation' }).click()
        await expect(current.page.getByText(/Task .+: cancelled/)).toBeVisible({ timeout: 20000 })
        cancellationLatencyMs = performance.now() - cancel
        expect((await call(current.app, 'historyStatus')).complete).toBe(false)
      }
      cycles++
    }
    const status = await call(current.app, 'historyStatus')
    expect(status.failure).toBe('')
    expect(status.rowCount).toBe(40000)
    expect(status.reads.length).toBeGreaterThan(4)
    expect(status.reads.every((r: any) => r.limit === 40 && r.rows <= 40)).toBe(true)
    expect(
      status.actualEvents.filter((e: any) => e.name === 'worker.completed').length
    ).toBeGreaterThan(1)
    expect(cancellationAtBatch).toBeGreaterThanOrEqual(75)
    const final = await call(current.app, 'actualCodingSnapshot')
    expect(final.leases).toBe(0)
    const finalMetrics = await call(current.app, 'actualR01Metrics')
    save('high-rate', {
      synthetic: true,
      seedRows: 10000,
      newSyntheticRows: 30000,
      configuredIntervalMs: 200,
      batchSize: 200,
      measuredWriterMs: status.elapsedMs,
      committedRows: status.rowCount,
      cycles,
      reloads,
      samples,
      cancellationLatencyMs,
      cancellationAtBatch,
      cancelledWhileWriterActive: true,
      pageReads: status.reads,
      subscribers: status.subscriberCount,
      integrity: status.integrity,
      actualEventNames: status.actualEvents.map((e: any) => e.name),
      finalActualEventNames: final.events.map((e: any) => e.name),
      leases: final.leases,
      cleanupState: finalMetrics.cleanupState,
      claim:
        'Synthetic history load through real SQLite/IPC/React, concurrent genuine AgentOS workers separately counted; bounded measured run, no infinite/peak/novel-SLA guarantee.'
    })
    await current.page.getByRole('button', { name: 'Agents', exact: true }).click()
    await current.page.screenshot({ path: `.cache/p9r02-mission-${run}.png` })
  } catch (error) {
    save('high-rate-failure', {
      history: await call(current.app, 'historyStatus').catch(() => null),
      actual: await call(current.app, 'actualR01Metrics').catch(() => null),
      samples
    })
    throw error
  } finally {
    await call(current.app, 'stopHistory').catch(() => {})
    await call(current.app, 'stopActualCodingFixture').catch(() => {})
    await current.app.close().catch(() => {})
  }
})
