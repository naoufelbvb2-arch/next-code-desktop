import { test, expect, _electron as electron } from '@playwright/test'
import { build } from 'esbuild'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import koffi from 'koffi'

const module = resolve('.cache/p9r01-soak-main.cjs')
test('R01-S01 actual Windows AgentOS workers, committed event stream, Mission Control, navigation/reload, resources and cancellation in one 60-second run', async () => {
  test.setTimeout(150000)
  await build({
    entryPoints: ['tests/fixtures/coding-main.ts'],
    outfile: module,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    external: ['koffi', 'electron', 'esbuild'],
    logLevel: 'silent'
  })
  mkdirSync('.test-profiles', { recursive: true })
  const profile = mkdtempSync(resolve('.test-profiles', 'p9r01-soak-'))
  writeFileSync(join(profile, 'python-runtime.json'), JSON.stringify({ fileBroker: true }))
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      (p): p is [string, string] =>
        p[1] !== undefined && !/API_KEY|TOKEN|SECRET|PASSWORD/.test(p[0])
    )
  )
  delete env.ELECTRON_RUN_AS_NODE
  delete env.ELECTRON_RENDERER_URL
  const app = await electron.launch({
    args: [resolve('out/main/index.js'), `--p1-test-profile=${profile}`],
    env
  })
  const page = await app.firstWindow()
  const call = (method: string) =>
    app.evaluate(
      async ({}, input) => {
        const load = process.getBuiltinModule('node:module')!.createRequire(input.module)
        return await load(input.module)[input.method](
          ...(input.method === 'startActualCodingFixture' ? ['soak'] : [])
        )
      },
      { module, method }
    )
  const samples: unknown[] = []
  let observedProcess: unknown
  const k = koffi.load('kernel32.dll')
  const openProcess = k.func('void * __stdcall OpenProcess(uint32 access,int32 inherit,uint32 pid)')
  const times = k.func(
    'int32 __stdcall GetProcessTimes(void *h,_Out_ void *created,_Out_ void *exit,_Out_ void *kernel,_Out_ void *user)'
  )
  const wait = k.func('uint32 __stdcall WaitForSingleObject(void *h,uint32 ms)')
  const close = k.func('int32 __stdcall CloseHandle(void *h)')
  try {
    await call('startActualCodingFixture')
    await page.reload()
    await page.getByRole('combobox', { name: 'Discussion model' }).selectOption('deepseek-flash')
    await page
      .getByRole('textbox', { name: 'Message' })
      .fill('Propose the isolated synthetic task; wait for explicit approval.')
    await page.getByRole('button', { name: 'Send message' }).click()
    await page.getByRole('button', { name: 'Run Task', exact: true }).click()
    await expect(page.getByText(/Task .+: running/)).toBeVisible()
    const initial = await call('actualCodingSnapshot')
    const processProof = await call('actualR01ProcessProof')
    observedProcess = openProcess(0x101000, 0, processProof.pid)
    expect(observedProcess).toBeTruthy()
    const creation = Buffer.alloc(8)
    expect(
      times(observedProcess, creation, Buffer.alloc(8), Buffer.alloc(8), Buffer.alloc(8))
    ).toBe(1)
    expect(creation.readBigUInt64LE().toString()).toBe(processProof.creation)
    const started = performance.now()
    let cycles = 0,
      reloads = 0
    while (performance.now() - started < 60000) {
      const before = performance.now()
      await page.getByRole('button', { name: 'Agents', exact: true }).click()
      await expect(page.getByRole('region', { name: 'Mission Header' })).toContainText('running')
      await expect(page.getByRole('region', { name: 'Mission Header' })).toContainText(
        'no gap reported'
      )
      const metrics = await call('actualR01Metrics')
      expect(metrics.incomingRecords).toBeLessThanOrEqual(256)
      expect(metrics.outgoingRecords).toBeLessThanOrEqual(256)
      expect(metrics.incomingBytes).toBeLessThanOrEqual(8 * 1024 * 1024)
      expect(metrics.outgoingBytes).toBeLessThanOrEqual(8 * 1024 * 1024)
      expect(metrics.partialFrameBytes).toBeLessThanOrEqual(262144)
      expect(metrics.eventCount).toBe(metrics.maxSequence)
      expect(metrics.state).toBe('BUSY')
      const renderer = await page.evaluate(async () => {
        const before = performance.now()
        await new Promise<void>((done) => requestAnimationFrame(() => done()))
        return {
          frameLatencyMs: performance.now() - before,
          domElements: document.querySelectorAll('*').length,
          heap: (performance as any).memory?.usedJSHeapSize ?? null
        }
      })
      const resources = await app.evaluate(({ app }) =>
        app.getAppMetrics().map((m) => ({
          type: m.type,
          cpuPercent: m.cpu.percentCPUUsage,
          workingSetKiB: m.memory.workingSetSize
        }))
      )
      const measured = performance.now() - before
      await page.getByRole('button', { name: 'Projects', exact: true }).click()
      await page.getByRole('button', { name: 'Open Files panel' }).click()
      await page.getByRole('button', { name: 'Settings', exact: true }).click()
      if (cycles % 4 === 0) {
        await page.reload()
        reloads++
      }
      await page.locator('.sidebar-history button').first().click()
      expect((await call('actualCodingSnapshot')).tasks).toEqual(initial.tasks)
      samples.push({
        elapsedMs: performance.now() - started,
        mainRoundTripAndMissionReadMs: measured,
        metrics,
        renderer,
        resources
      })
      cycles++
      await new Promise((done) => setTimeout(done, 750))
    }
    const last = await call('actualR01Metrics')
    expect(last.workersStarted).toBeGreaterThan(1)
    expect(last.workersCompleted).toBeGreaterThan(1)
    const cancel = performance.now()
    await page.getByRole('button', { name: 'Request cancellation' }).click()
    await expect(page.getByText(/Task .+: cancelled/)).toBeVisible({ timeout: 20000 })
    const cancellationLatencyMs = performance.now() - cancel
    const final = await call('actualCodingSnapshot')
    expect(final.leases).toBe(0)
    expect(final.events.at(-1).name).toBe('task.cancelled')
    await page.getByRole('button', { name: 'Agents', exact: true }).click()
    await expect(page.getByRole('region', { name: 'Mission Header' })).toContainText(
      'cooperative cancellation recorded'
    )
    await expect(page.getByRole('region', { name: 'Mission Header' })).toContainText(
      'no gap reported'
    )
    const cleanup = await call('actualR01Metrics')
    expect(cleanup.cleanupState).toMatch(/^verified_/)
    await expect.poll(() => wait(observedProcess, 0)).toBe(0)
    mkdirSync('.cache', { recursive: true })
    writeFileSync(
      '.cache/p9r01-soak-03.json',
      JSON.stringify(
        {
          durationMs: performance.now() - started,
          configuredDurationMs: 60000,
          cycles,
          reloads,
          samples,
          cancellationLatencyMs,
          final: cleanup,
          nativeHeldProcessHandleSignaled: true,
          processCreationIdentityMatched: true,
          actualAgentOS: true,
          providerTransport: 'httpx.MockTransport only; 0 external requests',
          eventsInjected: 0,
          limits:
            'Only existing queue/record limits asserted; CPU/RSS/latencies are observations, not new SLA',
          streamShape:
            'Original 15-tick AgentOS, repeated actual SCOUT reports with bounded read tools, 0.5s offline HTTP wait; no claim of arbitrary-rate saturation'
        },
        null,
        2
      ) + '\n'
    )
    await page.screenshot({ path: '.cache/p9r01-soak-03.png' })
  } catch (failure) {
    writeFileSync(
      '.cache/p9r01-soak-diagnostic-03.json',
      JSON.stringify(
        {
          samples,
          snapshot: await call('actualCodingSnapshot').catch(() => null),
          metrics: await call('actualR01Metrics').catch(() => null)
        },
        null,
        2
      ) + '\n'
    )
    throw failure
  } finally {
    if (observedProcess) close(observedProcess)
    await call('stopActualCodingFixture').catch(() => {})
    await app.close()
  }
})
