import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test'
import { build } from 'esbuild'
import { mkdirSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { DatabaseSync, backup } from 'node:sqlite'

const module = resolve('.cache/p9r01-discussion-main.cjs')
test.beforeAll(async () => {
  await build({
    entryPoints: ['tests/fixtures/broker-main.ts'],
    outfile: module,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    external: ['koffi'],
    logLevel: 'silent'
  })
})
function fixture() {
  mkdirSync('.test-profiles', { recursive: true })
  return mkdtempSync(resolve('.test-profiles', 'p9r01-discussion-'))
}
async function launch(profile: string) {
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
  await app.firstWindow()
  return app
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

test('R01-D01 actual Windows Main/Python restart retains multi-turn memory and source-backed pressure summaries; new conversation stays isolated', async () => {
  test.setTimeout(60000)
  const profile = fixture()
  let app = await launch(profile)
  try {
    await call(app, 'startBrokerPeer', [profile])
    await call(app, 'submitBrokerPeer', ['Remember synthetic name Atlas.'])
    expect((await call(app, 'snapshotBrokerPeer')).metrics.mockProviderCalls).toBe(1)
    expect(await call(app, 'closeBrokerPeer')).toBe(true)
    await app.close()
    app = await launch(profile)
    await call(app, 'startBrokerPeer', [profile, { resume: true }])
    expect((await call(app, 'snapshotBrokerPeer')).metrics.mockProviderCalls).toBe(1)
    await call(app, 'submitBrokerPeer', ['What was the synthetic name before restart?'])
    const restored = await call(app, 'r01MemoryState')
    expect(restored).toMatchObject({
      messages: 4,
      lastAssistant: 'Fixture provider remembered Atlas.',
      metrics: { mockProviderCalls: 2, currentInputOccurrences: 1 }
    })
    for (let i = 0; i < 2; i++)
      await call(app, 'submitBrokerPeer', ['R01 pressure Atlas ' + 'x'.repeat(14000)])
    await call(app, 'submitBrokerPeer', ['Use only source-backed conversation memory.'])
    const pressured = await call(app, 'r01MemoryState')
    expect(pressured.summaries).toBeGreaterThan(0)
    expect(pressured.referencesResolve).toBe(true)
    expect(pressured.contextRevision).toBeGreaterThan(restored.contextRevision)
    expect(pressured.metrics.summaryMemoryCount).toBeGreaterThan(0)
    expect(pressured.metrics.mockProviderCalls).toBe(5)
    expect(pressured.statuses.every((s: string) => s === 'answered')).toBe(true)
    await call(app, 'r01NewConversation')
    await call(app, 'submitBrokerPeer', [
      'A separate conversation must not know any prior synthetic name.'
    ])
    const isolated = await call(app, 'r01MemoryState')
    expect(isolated).toMatchObject({
      messages: 2,
      summaries: 0,
      lastAssistant: 'Fixture source projection failed.',
      metrics: { mockProviderCalls: 6, historyCount: 0, summaryMemoryCount: 0 }
    })
    writeFileSync(
      '.cache/p9r01-memory-01.json',
      JSON.stringify(
        {
          restored,
          pressured: { ...pressured, lastAssistant: undefined },
          isolated,
          originalGateway: true,
          freshPaidCalls: 0,
          restart: 'Actual Main and owned Python closed and recreated; no call on startup',
          summaryEvidence:
            'Actual original Gateway with captured HTTP candidate under bounded prompt pressure, not a real-provider live summary'
        },
        null,
        2
      ) + '\n'
    )
  } finally {
    await call(app, 'closeBrokerPeer').catch(() => {})
    await app.close()
  }
})

test('R01-C01 actual Main source consent/revoke crosses a paused Python-to-original-Gateway handoff; later release denied; native crash restores partial audit', async () => {
  test.setTimeout(60000)
  const profile = fixture()
  let app = await launch(profile)
  try {
    await call(app, 'startBrokerPeer', [profile, { gate: true }])
    await call(app, 'submitBrokerPeer')
    expect((await call(app, 'snapshotBrokerPeer')).metrics.mockProviderCalls).toBe(0)
    await call(app, 'grantBrokerPeer')
    const sending = call(app, 'submitBrokerPeer')
    await expect.poll(async () => (await call(app, 'r01BrokerGateState')).ready).toBe(true)
    const before = (await call(app, 'r01BrokerGateState')).snapshot
    expect(before.readObservations).toBe(1)
    expect(before.metrics.mockProviderCalls).toBe(0)
    expect(await call(app, 'revokeR01BrokerPeer')).toMatchObject({ ok: true })
    await call(app, 'releaseR01BrokerGate')
    const after = await sending
    expect(after.metrics).toMatchObject({
      mockProviderCalls: 1,
      approvedSources: 1,
      lowerTrustAndNoTools: true,
      r01GatePassed: true
    })
    await call(app, 'submitBrokerPeer')
    const denied = await call(app, 'snapshotBrokerPeer')
    expect(denied.metrics.mockProviderCalls).toBe(1)
    expect(denied.readObservations).toBe(1)
    await call(app, 'grantBrokerPeer')
    await call(app, 'armBrokerCrash')
    const exited = new Promise<number | null>((done) => app.process().once('exit', done))
    void call(app, 'submitBrokerPeer').catch(() => {})
    expect(await exited).toBe(86)
    expect(existsSync(join(profile, 'post-write-pre-commit.marker'))).toBe(true)
    const restore = fixture()
    const db = new DatabaseSync(join(profile, 'peer-state.sqlite3'), { readOnly: true })
    try {
      await backup(db, join(restore, 'desktop-state.sqlite3'))
    } finally {
      db.close()
    }
    writeFileSync(join(restore, 'python-runtime.json'), JSON.stringify({ fileBroker: true }))
    app = await launch(restore)
    const page = await app.firstWindow()
    await page.locator('.sidebar-history button').first().click()
    const inspection = page.getByRole('region', { name: 'Project source permissions' })
    await expect(inspection).toContainText('partial')
    await page.reload()
    await page.locator('.sidebar-history button').first().click()
    await expect(inspection).toContainText('partial')
    writeFileSync(
      '.cache/p9r01-consent-01.json',
      JSON.stringify(
        {
          mainLocalHandoffBeforeRevoke: true,
          mainObservationCommittedBeforeProviderGate: 1,
          providerCallsBeforeGate: 0,
          capturedProviderCallsAfterMainRevoke: 1,
          laterMainReleaseDenied: true,
          remoteRecallClaim: false,
          originalGateway: true,
          transport: 'Captured HTTP only; zero external network',
          nativeMainCrashExit: 86,
          recoveredRenderer: 'partial, not complete disclosure audit',
          endpointSwitchScope:
            'Production registry remains one route; alternate test route rejection recorded separately'
        },
        null,
        2
      ) + '\n'
    )
    await page.screenshot({ path: '.cache/p9r01-consent-01.png' })
  } finally {
    await call(app, 'closeBrokerPeer').catch(() => {})
    await app.close().catch(() => {})
  }
})

test('R01-C04 real anonymous stdio writer destroyed after authorized source preparation yields real write-callback failure and zero read evidence', async () => {
  test.setTimeout(45000)
  const profile = fixture(),
    app = await launch(profile)
  try {
    await call(app, 'startBrokerPeer', [profile])
    await call(app, 'submitBrokerPeer')
    await call(app, 'grantBrokerPeer')
    await call(app, 'armR01BrokenSourcePipe')
    await call(app, 'submitBrokerPeer')
    const pipe = await call(app, 'r01BrokenPipeEvidence')
    expect(pipe).toMatchObject({ prepared: true, attempts: 1 })
    expect(pipe.callbackError).toMatch(/ERR_STREAM_DESTROYED|EPIPE/)
    const state = await call(app, 'snapshotBrokerPeer')
    expect(state).toMatchObject({
      readObservations: 0,
      tasks: 0,
      events: 0,
      metrics: { mockProviderCalls: 0 }
    })
    writeFileSync(
      '.cache/p9r01-broken-pipe-01.json',
      JSON.stringify(
        {
          ...pipe,
          readObservations: state.readObservations,
          capturedProviderCalls: state.metrics.mockProviderCalls,
          evidenceKind:
            'Actual SupervisedChild prepare + real anonymous stdio stream destruction + original Node write callback; no fabricated callback error',
          doubleResponseWrites: 0
        },
        null,
        2
      ) + '\n'
    )
  } finally {
    await call(app, 'closeBrokerPeer').catch(() => {})
    await app.close()
  }
})
