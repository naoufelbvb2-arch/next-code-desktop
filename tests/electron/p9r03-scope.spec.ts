import { test, expect, _electron as electron } from '@playwright/test'
import { build } from 'esbuild'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

test('R03-V02 I06-T44 V1 actual Main/Python/original-Gateway multi-turn memory, exact consent/revoke and real source transport failure cannot admit a task', async () => {
  test.setTimeout(60000)
  const run = process.env.NCD_R03_RUN_ID ?? 'manual-' + Date.now(),
    module = resolve('.cache/p9r03-scope-' + run + '.cjs')
  await build({
    entryPoints: ['tests/fixtures/broker-main.ts'],
    outfile: module,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    external: ['koffi'],
    logLevel: 'silent'
  })
  mkdirSync('.test-profiles', { recursive: true })
  const profile = mkdtempSync(resolve('.test-profiles', 'p9r03-scope-'))
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      (e): e is [string, string] => e[1] !== undefined && !/KEY|TOKEN|SECRET|PASSWORD/i.test(e[0])
    )
  )
  delete env.ELECTRON_RUN_AS_NODE
  delete env.ELECTRON_RENDERER_URL
  const app = await electron.launch({
    args: [resolve('out/main/index.js'), `--p1-test-profile=${profile}`],
    env
  })
  const call = (method: string, args: unknown[] = []): Promise<any> =>
    app.evaluate(
      async ({}, v) =>
        process
          .getBuiltinModule('node:module')!
          .createRequire(v.module)(v.module)
          [v.method](...v.args),
      { module, method, args }
    )
  try {
    await app.firstWindow()
    await call('startBrokerPeer', [profile])
    await call('submitBrokerPeer', ['Remember synthetic name Atlas.'])
    await call('submitBrokerPeer', ['What was the synthetic name?'])
    const memory = await call('r01MemoryState')
    expect(memory.metrics).toMatchObject({
      mockProviderCalls: 2,
      historyCount: 2,
      currentInputOccurrences: 1
    })
    expect(memory.lastAssistant).toBe('Fixture provider remembered Atlas.')
    const denied = await call('submitBrokerPeer')
    expect(denied).toMatchObject({
      tasks: 0,
      events: 0,
      readObservations: 0,
      metrics: { mockProviderCalls: 2 }
    })
    await call('grantBrokerPeer')
    const shared = await call('submitBrokerPeer')
    expect(shared).toMatchObject({
      tasks: 0,
      events: 0,
      readObservations: 1,
      metrics: { mockProviderCalls: 3, approvedSources: 1, lowerTrustAndNoTools: true }
    })
    await call('revokeR01BrokerPeer')
    expect(await call('submitBrokerPeer')).toMatchObject({
      tasks: 0,
      events: 0,
      readObservations: 1,
      metrics: { mockProviderCalls: 3 }
    })
    const providerFailure = await call('submitBrokerPeer', ['R03 synthetic HTTP401 failure'])
    expect(providerFailure).toMatchObject({
      tasks: 0,
      events: 0,
      readObservations: 1,
      metrics: { mockProviderCalls: 4 }
    })
    // Main preserves post-dispatch uncertainty; captured HTTP failure is not a
    // proof that every external effect was absent.
    expect((await call('r01MemoryState')).statuses.at(-1)).toBe('unknown')
    await call('grantBrokerPeer')
    await call('armR01BrokenSourcePipe')
    const failed = await call('submitBrokerPeer'),
      pipe = await call('r01BrokenPipeEvidence')
    expect(pipe).toMatchObject({ prepared: true, attempts: 1 })
    expect(pipe.callbackError).toMatch(/ERR_STREAM_DESTROYED|EPIPE/)
    expect(failed).toMatchObject({
      tasks: 0,
      events: 0,
      readObservations: 1,
      metrics: { mockProviderCalls: 4 }
    })
    writeFileSync(
      `.cache/p9r03-v1-journey-${run}.json`,
      JSON.stringify(
        {
          originalGateway: true,
          transport: 'Captured HTTP only, no external/provider-paid call',
          multiTurn: true,
          contextRevision: memory.contextRevision,
          capturedCalls: 4,
          providerHttp401:
            'Actual original Gateway; unknown turn conservatively retained, one captured call, no automatic retry or task',
          successfulMainReadObservations: 1,
          revocationStopsFutureRelease: true,
          realPipeFailure: pipe.callbackError,
          failedWriteAttempts: 1,
          taskAdmissions: 0,
          taskEvents: 0,
          limits:
            'Current V1 route, exact consent, captured HTTP401 and transport failure journey; timeout cases are separate Python evidence. No arbitrary future provider, native file-containment or external receipt claim.'
        },
        null,
        2
      ) + '\n'
    )
  } finally {
    await call('closeBrokerPeer').catch(() => {})
    await app.close().catch(() => {})
  }
})
