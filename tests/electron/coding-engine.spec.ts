import {
  test,
  expect,
  _electron as electron,
  type ElectronApplication,
  type Page
} from '@playwright/test'
import { build } from 'esbuild'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import koffi from 'koffi'

const module = resolve('.cache/p7-engine-main.cjs')
const successEvents = [
  'task.started',
  'task.progress',
  'worker.started',
  'worker.completed',
  'worker.started',
  'worker.completed',
  'task.progress',
  'task.completed'
].map((name) => ({ name }))
test.beforeAll(async () => {
  await build({
    entryPoints: ['tests/fixtures/coding-main.ts'],
    outfile: module,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    external: ['koffi', 'electron', 'esbuild'],
    logLevel: 'silent'
  })
})
async function launch() {
  mkdirSync('.test-profiles', { recursive: true })
  const profile = mkdtempSync(resolve('.test-profiles', 'p7-actual-electron-'))
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
  const page = await app.firstWindow()
  await expect(page.getByRole('textbox', { name: 'Message' })).toBeVisible()
  return { app, page }
}
function call(app: ElectronApplication, method: string, args: unknown[] = []): Promise<any> {
  return app.evaluate(
    async ({}, input) => {
      const load = process.getBuiltinModule('node:module')!.createRequire(input.module)
      return load(input.module)[input.method](...input.args)
    },
    { module, method, args }
  )
}
async function propose(page: Page) {
  await page.reload()
  await expect(
    page
      .getByRole('combobox', { name: 'Discussion model' })
      .locator('option[value="deepseek-flash"]')
  ).toBeEnabled()
  await page.getByRole('combobox', { name: 'Discussion model' }).selectOption('deepseek-flash')
  await page
    .getByRole('textbox', { name: 'Message' })
    .fill('Propose only the synthetic sample.py change and await my approval.')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByRole('button', { name: 'Run Task', exact: true })).toBeVisible()
}

test('P7-WIN02 actual Windows Electron explicit Run Task reaches real AgentOS, committed outcome, cleanup and reload without replay', async () => {
  const { app, page } = await launch()
  try {
    expect(await call(app, 'startActualCodingFixture')).toMatchObject({
      engineCommit: '99e00e13f8a39fa6730f3d3de773ac937b5ac915',
      outsideProductionRepos: true
    })
    await propose(page)
    expect((await call(app, 'actualCodingSnapshot')).tasks).toHaveLength(0)
    await page.getByRole('button', { name: 'Run Task', exact: true }).click()
    await expect(page.getByText(/Task .+: completed/)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Main reports reconciled task evidence.')).toBeVisible()
    expect(await call(app, 'actualCodingSnapshot')).toMatchObject({
      leases: 0,
      source: 'def value(): return 2\n',
      events: successEvents
    })
    await page.screenshot({ path: '.cache/p7-actual-success.png' })
    await page.reload()
    await page.locator('.sidebar-history button').first().click()
    await expect(page.getByText(/Task .+: completed/)).toBeVisible()
    expect((await call(app, 'actualCodingSnapshot')).tasks).toHaveLength(1)
  } finally {
    await call(app, 'stopActualCodingFixture').catch(() => {})
    await app.close()
  }
})

test('P7-WIN03 real worker task survives navigation/reload; Renderer cancellation reaches engine and independently reconciles', async () => {
  const { app, page } = await launch()
  try {
    await call(app, 'startActualCodingFixture', ['worker'])
    await propose(page)
    await page.getByRole('button', { name: 'Run Task', exact: true }).click()
    await expect(page.getByText(/Task .+: running/)).toBeVisible()
    await page.getByRole('button', { name: 'Agents', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Agents', exact: true })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Mission Header' })).toContainText('running')
    await expect(
      page.getByRole('button', { name: /SURGEON \/ .+ — started; live status unverified/ })
    ).toBeVisible()
    expect((await call(app, 'actualCodingSnapshot')).status.active).toBeTruthy()
    await page.reload()
    await page.locator('.sidebar-history button').first().click()
    await expect(page.getByText(/Task .+: running/)).toBeVisible()
    await page.getByRole('button', { name: 'Request cancellation' }).click()
    await expect(page.getByText(/Task .+: cancelled/)).toBeVisible()
    await expect(page.getByText('Main reports reconciled task evidence.')).toBeVisible()
    expect(await call(app, 'actualCodingSnapshot')).toMatchObject({
      leases: 0,
      events: ['task.started', 'task.progress', 'worker.started', 'task.cancelled'].map((name) => ({
        name
      }))
    })
    await page.screenshot({ path: '.cache/p7-actual-cancelled.png' })
  } finally {
    await call(app, 'stopActualCodingFixture').catch(() => {})
    await app.close()
  }
})

function observeOwned(pid: number, expectedCreation?: string) {
  const lib = koffi.load('kernel32.dll'),
    open = lib.func('void * OpenProcess(uint32 rights,int32 inherit,uint32 pid)'),
    wait = lib.func('uint32 WaitForSingleObject(void *h,uint32 ms)'),
    close = lib.func('int32 CloseHandle(void *h)'),
    terminate = lib.func('int32 TerminateProcess(void *h,uint32 code)'),
    times = lib.func(
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
    terminateMain: () => {
      if (!expectedCreation) throw new Error('No bound Main authority')
      return terminate(handle, 23)
    }
  }
}

test('P7-WIN04 actual AgentOS Main crash stops owned descendants and reopens actual SQLite with blocked lease and zero replay', async () => {
  let current = await launch()
  const watches: ReturnType<typeof observeOwned>[] = []
  try {
    await call(current.app, 'startActualCodingFixture', ['shell'])
    await propose(current.page)
    await current.page.getByRole('button', { name: 'Run Task', exact: true }).click()
    await expect(current.page.getByText(/Task .+: running/)).toBeVisible()
    let evidence:
      | {
          directory: string
          workspace: string
          main: { pid: number; creation: string }
          descendants: number[]
        }
      | undefined
    await expect
      .poll(
        async () => {
          evidence = await call(current.app, 'actualCrashEvidence')
          return evidence!.descendants.length
        },
        { timeout: 15000 }
      )
      .toBe(2)
    for (const pid of evidence!.descendants) watches.push(observeOwned(pid))
    const main = observeOwned(evidence!.main.pid, evidence!.main.creation)
    watches.push(main)
    expect(main.terminateMain()).toBe(1)
    for (const watch of watches) await expect.poll(watch.exited, { timeout: 8000 }).toBe(true)
    current = await launch()
    const recovered = await call(current.app, 'recoverActualCodingFixture', [
      { directory: evidence!.directory, workspace: evidence!.workspace }
    ])
    expect(recovered).toMatchObject({
      leases: 1,
      source: 'def value(): return 1\n',
      tasks: [{ state: 'needs_reconciliation' }],
      status: { active: null }
    })
    await current.page.reload()
    await current.page.locator('.sidebar-history button').first().click()
    await expect(current.page.getByText(/Task .+: needs_reconciliation/)).toBeVisible()
    expect((await call(current.app, 'actualCodingSnapshot')).tasks).toHaveLength(1)
    expect((await call(current.app, 'actualCodingSnapshot')).status.active).toBeNull()
    await current.page.getByRole('button', { name: 'Agents', exact: true }).click()
    await expect(current.page.getByRole('region', { name: 'Mission Header' })).toContainText(
      'needs_reconciliation'
    )
    await expect(
      current.page.getByText(
        'Windows cleanup / Writer Lease: not verified or not exposed by this view.'
      )
    ).toBeVisible()
    await expect(current.page.getByRole('list', { name: 'Committed events' })).toContainText(
      'task.started'
    )
  } finally {
    for (const watch of watches) watch.close()
    await call(current.app, 'stopActualCodingFixture').catch(() => {})
    await current.app.close().catch(() => {})
  }
})

test('P8-WIN01 actual offline AgentOS tools -> T4 -> closed IPC -> Mission Control survives Renderer reload without execute replay', async () => {
  const { app, page } = await launch()
  try {
    await call(app, 'startActualCodingFixture', ['production_mock'])
    await propose(page)
    await page.getByRole('button', { name: 'Run Task', exact: true }).click()
    await expect(page.getByText(/Task .+: completed/)).toBeVisible({ timeout: 20000 })
    await expect(page.getByText('Main reports reconciled task evidence.')).toBeVisible()
    await page.getByRole('button', { name: 'Agents', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Open Right Dock' })).toHaveAttribute(
      'aria-expanded',
      'false'
    )
    await expect(page.getByRole('list', { name: 'Committed events' }).locator('li')).toHaveCount(11)
    await expect(page.getByRole('list', { name: 'Committed events' })).toContainText(
      'file.changed: modified sample.py (task-level)'
    )
    await expect(page.getByRole('list', { name: 'Committed events' })).toContainText(
      'test.result: passed'
    )
    await expect(page.getByRole('region', { name: 'Mission Header' })).toContainText(
      'complete through 11'
    )
    await expect(page.getByRole('region', { name: 'Mission Header' })).toContainText(
      'Last verified phase: COMPLETED'
    )
    await expect(page.getByRole('button', { name: /SURGEON \/ .+ — SUCCESS/ })).toBeVisible()
    await page.getByRole('button', { name: /SURGEON \/ .+ — SUCCESS/ }).click()
    await expect(page.getByRole('region', { name: 'Agent Inspector' })).toContainText(
      'Synthetic worker completed'
    )
    await expect(page.getByRole('region', { name: 'Mission Header' })).toContainText(
      'Change only sample.py so value() returns 2 and verify with check.py.'
    )
    await page.screenshot({ path: '.cache/p8-corrections-mission-control.png' })
    await page.reload()
    await page.getByRole('button', { name: 'Agents', exact: true }).click()
    await expect(page.getByRole('list', { name: 'Committed events' }).locator('li')).toHaveCount(11)
    await expect(page.getByRole('region', { name: 'Mission Header' })).toContainText(
      'Change only sample.py so value() returns 2 and verify with check.py.'
    )
    expect((await call(app, 'actualCodingSnapshot')).tasks).toHaveLength(1)
    expect((await call(app, 'actualCodingSnapshot')).leases).toBe(0)
    expect((await call(app, 'actualCodingSnapshot')).status.active).toBeNull()
    await expect(page.getByRole('button', { name: 'Open Right Dock' })).toHaveAttribute(
      'aria-expanded',
      'false'
    )
  } finally {
    await call(app, 'stopActualCodingFixture').catch(() => {})
    await app.close()
  }
})

test('P7-WIN05 actual GUI opens an ASCII case alias, preserves canonical project identity and completes real AgentOS safely', async () => {
  const { app, page } = await launch()
  try {
    await call(app, 'startActualCodingFixture', ['alias'])
    await page.reload()
    await page.getByRole('button', { name: 'Projects', exact: true }).click()
    await page.getByRole('button', { name: 'Open project', exact: true }).click()
    await expect
      .poll(() => call(app, 'actualAliasEvidence'))
      .toEqual({ projects: 1, canonicalRootMatches: true })
    await page.getByRole('button', { name: 'New Conversation', exact: true }).click()
    await propose(page)
    await page.getByRole('button', { name: 'Run Task', exact: true }).click()
    await expect(page.getByText(/Task .+: completed/)).toBeVisible({ timeout: 20000 })
    await expect(page.getByText('Main reports reconciled task evidence.')).toBeVisible()
    expect(await call(app, 'actualCodingSnapshot')).toMatchObject({
      leases: 0,
      source: 'def value(): return 2\n',
      events: successEvents
    })
    expect(await call(app, 'actualAliasEvidence')).toEqual({
      projects: 1,
      canonicalRootMatches: true
    })
  } finally {
    await call(app, 'stopActualCodingFixture').catch(() => {})
    await app.close()
  }
})

test('P7-WIN06 actual Main crash before AgentOS start stops the real Coding child; restart retains lease and never executes/replays', async () => {
  let current = await launch()
  const watches: ReturnType<typeof observeOwned>[] = []
  try {
    await call(current.app, 'startActualCodingFixture', ['before_start'])
    await propose(current.page)
    await current.page.getByRole('button', { name: 'Run Task', exact: true }).click()
    let evidence: any
    await expect
      .poll(
        async () => {
          evidence = await call(current.app, 'actualBeforeStartEvidence')
          return evidence.ready
        },
        { timeout: 15000 }
      )
      .toBe(true)
    expect(await call(current.app, 'actualCodingSnapshot')).toMatchObject({
      events: [],
      leases: 1,
      tasks: [{ state: 'starting' }]
    })
    const child = observeOwned(evidence.child),
      main = observeOwned(evidence.main.pid, evidence.main.creation)
    watches.push(child, main)
    expect(main.terminateMain()).toBe(1)
    for (const watch of watches) await expect.poll(watch.exited, { timeout: 8000 }).toBe(true)
    current = await launch()
    expect(
      await call(current.app, 'recoverActualCodingFixture', [
        { directory: evidence.directory, workspace: evidence.workspace }
      ])
    ).toMatchObject({
      events: [],
      leases: 1,
      source: 'def value(): return 1\n',
      tasks: [{ state: 'needs_reconciliation' }],
      status: { active: null }
    })
    await current.page.reload()
    await current.page.locator('.sidebar-history button').first().click()
    await expect(current.page.getByText(/Task .+: needs_reconciliation/)).toBeVisible()
    expect((await call(current.app, 'actualCodingSnapshot')).events).toEqual([])
  } finally {
    for (const watch of watches) watch.close()
    await call(current.app, 'stopActualCodingFixture').catch(() => {})
    await current.app.close().catch(() => {})
  }
})

test('P8-WIN02 real repeated worker roles retain separate Inspector reports after reload', async () => {
  const { app, page } = await launch()
  try {
    await call(app, 'startActualCodingFixture', ['repeated_workers'])
    await propose(page)
    await page.getByRole('button', { name: 'Run Task', exact: true }).click()
    await expect(page.getByText(/Task .+: completed/)).toBeVisible({ timeout: 20000 })
    await page.getByRole('button', { name: 'Agents', exact: true }).click()
    const scouts = page.getByRole('button', { name: /SCOUT \/ .+ — SUCCESS/ })
    await expect(scouts).toHaveCount(2)
    const labels = await scouts.allTextContents()
    expect(labels[0]).not.toBe(labels[1])
    await expect(page.getByRole('button', { name: /INQUISITOR \/ .+ — SUCCESS/ })).toHaveCount(1)
    await scouts.first().click()
    await expect(page.getByRole('region', { name: 'Agent Inspector' })).toContainText(
      'Synthetic worker completed'
    )
    await expect(
      page.getByRole('region', { name: 'Agent Inspector' }).locator('dd').nth(3)
    ).toHaveText(/^sequence \d+$/)
    await page.reload()
    await page.getByRole('button', { name: 'Agents', exact: true }).click()
    await expect(page.getByRole('button', { name: /SCOUT \/ .+ — SUCCESS/ })).toHaveCount(2)
    expect((await call(app, 'actualCodingSnapshot')).tasks).toHaveLength(1)
    expect((await call(app, 'actualCodingSnapshot')).status.active).toBeNull()
  } finally {
    await call(app, 'stopActualCodingFixture').catch(() => {})
    await app.close()
  }
})

for (const visible of [false, true])
  test(`P8-WIN03 CP-001 saved Dock visible=${visible} survives Renderer reload and actual Main crash without Coding replay`, async () => {
    let current = await launch()
    const watches: ReturnType<typeof observeOwned>[] = []
    try {
      await call(current.app, 'startActualCodingFixture', ['shell'])
      await propose(current.page)
      await current.page.getByRole('button', { name: 'Open Right Dock' }).click()
      await current.page.getByRole('tab', { name: 'Files', exact: true }).click()
      if (!visible) await current.page.getByRole('button', { name: 'Close Right Dock' }).click()
      await expect
        .poll(() => call(current.app, 'actualDockSnapshot'))
        .toMatchObject({
          visible: Number(visible),
          primary_tab: 'Files',
          explicitly_hidden: Number(!visible)
        })
      await current.page.reload()
      await current.page.locator('.sidebar-history button').first().click()
      await expect(
        current.page.getByRole('button', { name: visible ? 'Hide Right Dock' : 'Open Right Dock' })
      ).toHaveAttribute('aria-expanded', String(visible))
      await current.page.getByRole('button', { name: 'Run Task', exact: true }).click()
      let evidence: any
      await expect
        .poll(
          async () => {
            evidence = await call(current.app, 'actualCrashEvidence')
            return evidence.descendants.length
          },
          { timeout: 15000 }
        )
        .toBe(2)
      for (const pid of evidence.descendants) watches.push(observeOwned(pid))
      const main = observeOwned(evidence.main.pid, evidence.main.creation)
      watches.push(main)
      expect(main.terminateMain()).toBe(1)
      for (const watch of watches) await expect.poll(watch.exited, { timeout: 8000 }).toBe(true)
      current = await launch()
      await call(current.app, 'recoverActualCodingFixture', [
        { directory: evidence.directory, workspace: evidence.workspace }
      ])
      await current.page.reload()
      await current.page.locator('.sidebar-history button').first().click()
      await expect(
        current.page.getByRole('button', { name: visible ? 'Hide Right Dock' : 'Open Right Dock' })
      ).toHaveAttribute('aria-expanded', String(visible))
      if (visible)
        await expect(current.page.getByRole('tab', { name: 'Files', exact: true })).toHaveAttribute(
          'aria-selected',
          'true'
        )
      expect(await call(current.app, 'actualDockSnapshot')).toMatchObject({
        visible: Number(visible),
        primary_tab: 'Files',
        explicitly_hidden: Number(!visible)
      })
      expect((await call(current.app, 'actualCodingSnapshot')).tasks).toHaveLength(1)
      expect((await call(current.app, 'actualCodingSnapshot')).leases).toBe(1)
      expect((await call(current.app, 'actualCodingSnapshot')).status.active).toBeNull()
      await current.page.getByRole('button', { name: 'Agents', exact: true }).click()
      await expect(current.page.getByRole('region', { name: 'Mission Header' })).toContainText(
        'Change only sample.py so value() returns 2 and verify with check.py.'
      )
      await expect(current.page.getByRole('region', { name: 'Mission Header' })).toContainText(
        'not verified or not exposed'
      )
      await expect(
        current.page.getByRole('button', {
          name: /SURGEON \/ .+ — started; live status unverified/
        })
      ).toBeVisible()
      await expect(current.page.getByRole('button', { name: 'Open Right Dock' })).toHaveAttribute(
        'aria-expanded',
        'false'
      )
    } finally {
      for (const watch of watches) watch.close()
      await call(current.app, 'stopActualCodingFixture').catch(() => {})
      await current.app.close().catch(() => {})
    }
  })
