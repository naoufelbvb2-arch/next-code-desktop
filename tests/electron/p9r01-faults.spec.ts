import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test'
import { build } from 'esbuild'
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const module = resolve('.cache/p9r01-fault-main.cjs')
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
  const profile = mkdtempSync(resolve('.test-profiles', 'p9r01-fault-'))
  writeFileSync(join(profile, 'python-runtime.json'), JSON.stringify({ fileBroker: true }))
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      (p): p is [string, string] =>
        p[1] !== undefined && !/API_KEY|TOKEN|SECRET|PASSWORD/i.test(p[0])
    )
  )
  delete env.ELECTRON_RUN_AS_NODE
  delete env.ELECTRON_RENDERER_URL
  const app = await electron.launch({
    args: [resolve('out/main/index.js'), `--p1-test-profile=${profile}`],
    env
  })
  const page = await app.firstWindow()
  return { app, page, profile }
}
function call(app: ElectronApplication, method: string, args: unknown[] = []): Promise<any> {
  return app.evaluate(
    async ({}, input) => {
      const load = process.getBuiltinModule('node:module')!.createRequire(input.module)
      return await load(input.module)[input.method](...input.args)
    },
    { module, method, args }
  )
}
async function propose(page: Awaited<ReturnType<typeof launch>>['page']) {
  await page.reload()
  await page.getByRole('combobox', { name: 'Discussion model' }).selectOption('deepseek-flash')
  await page
    .getByRole('textbox', { name: 'Message' })
    .fill('Propose only an isolated synthetic task, pending explicit approval.')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByRole('button', { name: 'Run Task', exact: true })).toBeVisible()
}

test('R01-F01 native Main exit after independently readable T4 COMMIT before IPC publication; restart replays once and holds uncertain writer', async () => {
  test.setTimeout(45000)
  let current = await launch()
  try {
    await call(current.app, 'startActualCodingFixture')
    const location = await call(current.app, 'actualCrashEvidence')
    await propose(current.page)
    await call(current.app, 'armR01PostCommitCrash')
    const exited = new Promise<number | null>((done) => current.app.process().once('exit', done))
    void current.page
      .getByRole('button', { name: 'Run Task', exact: true })
      .click()
      .catch(() => {})
    expect(await exited).toBe(87)
    const marker = JSON.parse(
      readFileSync(join(location.directory, 'r01-post-commit-pre-push.json'), 'utf8')
    )
    expect(marker).toEqual({
      sequence: 1,
      name: 'task.started',
      independentReader: true,
      ipcPublicationAttempted: false
    })
    current = await launch()
    const restored = await call(current.app, 'recoverActualCodingFixture', [
      { directory: location.directory, workspace: location.workspace }
    ])
    expect(restored).toMatchObject({
      leases: 1,
      events: [{ name: 'task.started' }],
      tasks: [{ state: 'needs_reconciliation' }],
      status: { active: null }
    })
    await current.page.reload()
    await current.page.locator('.sidebar-history button').first().click()
    await current.page.getByRole('button', { name: 'Agents', exact: true }).click()
    await expect(current.page.getByRole('region', { name: 'Mission Header' })).toContainText(
      'recorded at sequence 1'
    )
    await expect(current.page.getByRole('region', { name: 'Mission Header' })).toContainText(
      'not verified or not exposed'
    )
    expect((await call(current.app, 'actualCodingSnapshot')).events).toHaveLength(1)
    writeFileSync(
      '.cache/p9r01-t4-crash-01.json',
      JSON.stringify(
        {
          nativeMainExit: 87,
          ...marker,
          restoredEvents: 1,
          duplicateExecutions: 0,
          leasesHeld: 1,
          state: 'needs_reconciliation',
          nativeCleanupClaim: false
        },
        null,
        2
      ) + '\n'
    )
  } finally {
    await call(current.app, 'stopActualCodingFixture').catch(() => {})
    await current.app.close().catch(() => {})
  }
})

test('R01-N01 actual Windows app-owned TCP/service inventory separates Playwright debugging from private-stdio Python roles', async () => {
  test.setTimeout(45000)
  const current = await launch()
  try {
    await call(current.app, 'startActualCodingFixture', ['worker'])
    await propose(current.page)
    await current.page.getByRole('button', { name: 'Run Task', exact: true }).click()
    await expect(current.page.getByText(/Task .+: running/)).toBeVisible()
    const ids = (await call(current.app, 'actualR01ProcessIds')) as Record<string, number>
    for (const pid of Object.values(ids)) expect(Number.isSafeInteger(pid) && pid > 0).toBe(true)
    const tcpFilter = Object.values(ids)
      .map((pid) => 'OwningProcess=' + pid)
      .join(' OR ')
    const serviceFilter = Object.values(ids)
      .map((pid) => 'ProcessId=' + pid)
      .join(' OR ')
    const script =
      "$ErrorActionPreference='Stop';$t=@(Get-CimInstance -Namespace root/StandardCimv2 -ClassName MSFT_NetTCPConnection -Filter '" +
      tcpFilter +
      "' | Select-Object OwningProcess,LocalPort,LocalAddress,RemotePort,RemoteAddress,State);$s=@(Get-CimInstance Win32_Service -Filter '" +
      serviceFilter +
      "' | Select-Object ProcessId);ConvertTo-Json -Depth 4 -Compress -InputObject @{Tcp=$t;Services=$s}"
    const { stdout } = await promisify(execFile)(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true, timeout: 15000 }
    )
    const observed = JSON.parse(stdout)
    const debug = await current.app.evaluate(({ app }) => ({
      inspector: process.getBuiltinModule('node:inspector')!.url(),
      remotePort: app.commandLine.getSwitchValue('remote-debugging-port')
    }))
    const allowed = new Set<number>()
    if (debug.inspector) allowed.add(Number(new URL(debug.inspector).port))
    if (Number(debug.remotePort) > 0) allowed.add(Number(debug.remotePort))
    const devTools = join(current.profile, 'DevToolsActivePort')
    if (existsSync(devTools)) allowed.add(Number(readFileSync(devTools, 'utf8').split('\n')[0]))
    const audit = await call(current.app, 'actualR01LoopPorts')
    expect(audit?.source).toBe('Actual CPython ProactorEventLoop socketpair')
    const selfPorts = new Set<number>(audit.ports)
    const loopback = (address: string) =>
      address === '::1' || address.startsWith('127.') || address.startsWith('::ffff:127.')
    const roles = Object.entries(ids).map(([role, pid]) => {
      const tcp = observed.Tcp.filter((r: any) => r.OwningProcess === pid)
      const listeners = tcp.filter((r: any) => r.State === 2)
      const selfSockets = tcp.filter(
        (r: any) =>
          role === 'coding' &&
          r.State !== 2 &&
          selfPorts.has(r.LocalPort) &&
          ((loopback(r.LocalAddress) && selfPorts.has(r.RemotePort) && loopback(r.RemoteAddress)) ||
            // Windows exposes a non-listening BOUND reservation for the same
            // exact runtime socketpair port, sometimes with wildcard address.
            (r.State === 100 &&
              r.RemotePort === 0 &&
              (loopback(r.LocalAddress) ||
                r.LocalAddress === '0.0.0.0' ||
                r.LocalAddress === '::')))
      )
      return {
        role,
        tcpConnections: tcp.length,
        states: tcp.map((r: any) => r.State),
        classifiedRuntimeSelfSockets: selfSockets.length,
        unclassifiedConnections:
          role === 'main'
            ? tcp.filter((r: any) => !allowed.has(r.LocalPort)).length
            : tcp.length - selfSockets.length,
        listeners: listeners.length,
        unclassifiedListeners: listeners.filter((r: any) => !allowed.has(r.LocalPort)).length,
        services: observed.Services.filter((r: any) => r.ProcessId === pid).length
      }
    })
    writeFileSync(
      '.cache/p9r01-topology-03.json',
      JSON.stringify(
        {
          roles,
          querySucceeded: true,
          scope:
            'Only actual app-owned Main/Discussion/Coding PIDs; no addresses, PIDs, service names or unrelated machine inventory published',
          debugging:
            'Playwright Node inspector/Chromium debug ports and actual CPython Proactor self-socketpair classified explicitly; not a production Python bridge'
        },
        null,
        2
      ) + '\n'
    )
    for (const r of roles) {
      expect(r.services).toBe(0)
      expect(r.unclassifiedListeners).toBe(0)
      expect(r.unclassifiedConnections).toBe(0)
    }
    await current.page.getByRole('button', { name: 'Request cancellation' }).click()
    await expect(current.page.getByText(/Task .+: cancelled/)).toBeVisible()
  } finally {
    await call(current.app, 'stopActualCodingFixture').catch(() => {})
    await current.app.close()
  }
})
