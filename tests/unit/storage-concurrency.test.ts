// @vitest-environment node
import { beforeAll, afterEach, describe, expect, it } from 'vitest'
import { Worker } from 'node:worker_threads'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { mkdirSync } from 'node:fs'
import { build } from 'esbuild'
import { DurableStore } from '../../electron/main/storage/store'
import { fixture, taskFixture, sendInput, proof, fixturePolicy, inspect } from '../fixtures/storage'

const compiled = resolve('.cache/p3-storage-peer.cjs')
const open: DurableStore[] = []
const use = <T extends { store: DurableStore }>(f: T) => {
  open.push(f.store)
  return f
}
afterEach(() => {
  for (const s of open.splice(0)) {
    try {
      s.close()
    } catch {}
  }
})
beforeAll(async () => {
  mkdirSync('.cache', { recursive: true })
  await build({
    entryPoints: ['tests/fixtures/storage-peer.ts'],
    outfile: compiled,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    logLevel: 'silent'
  })
})
type Outcome = { ok: boolean; value?: any; code?: string; exit?: number }
function peer(data: Record<string, unknown>, gate: SharedArrayBuffer) {
  const worker = new Worker(compiled, { workerData: { ...data, gate } })
  let markReady!: () => void
  const ready = new Promise<void>((done) => {
    markReady = done
  })
  const done = new Promise<Outcome>((resolve, reject) => {
    const timer = setTimeout(() => {
      void worker.terminate()
      reject(new Error('Isolated SQLite peer deadline'))
    }, 20000)
    worker.on('message', (m) => {
      if (m.ready) markReady()
      else {
        clearTimeout(timer)
        resolve(m)
      }
    })
    worker.once('error', (e) => {
      clearTimeout(timer)
      markReady()
      reject(e)
    })
    worker.once('exit', (code) => {
      clearTimeout(timer)
      markReady()
      if (code !== 0) resolve({ ok: false, exit: code })
    })
  })
  return { ready, done, worker }
}
async function compete(data: Record<string, unknown>[]) {
  const gate = new SharedArrayBuffer(4),
    peers = data.map((d) => peer(d, gate))
  await Promise.all(peers.map((p) => p.ready))
  Atomics.store(new Int32Array(gate), 0, 1)
  Atomics.notify(new Int32Array(gate), 0)
  return Promise.all(peers.map((p) => p.done))
}
describe('P3 real competing SQLite connections and transaction interruption', () => {
  it('six simultaneous identical first-send clicks produce one original result', async () => {
    const f = use(fixture())
    const results = await compete(
      Array.from({ length: 6 }, () => ({
        path: f.path,
        scope: f.scope,
        action: 'send',
        input: sendInput()
      }))
    )
    expect(results.every((r) => r.ok)).toBe(true)
    expect(new Set(results.map((r) => r.value.messageId)).size).toBe(1)
    expect(inspect(f.store).prepare('SELECT count(*) AS n FROM messages').get()!.n).toBe(1)
  }, 20000)
  it('a racing changed payload under one mutation ID is rejected without a duplicate', async () => {
    const f = use(fixture())
    const result = await compete(
      ['first', 'changed'].map((text) => ({
        path: f.path,
        scope: f.scope,
        action: 'send',
        input: sendInput('same', text)
      }))
    )
    expect(result.filter((r) => r.ok)).toHaveLength(1)
    expect(result.find((r) => !r.ok)?.code).toBe('BAD_INPUT')
    expect(inspect(f.store).prepare('SELECT count(*) AS n FROM messages').get()!.n).toBe(1)
  }, 20000)
  it('competing Run requests consume one proposal and reserve one global writer', async () => {
    const f = use(fixture())
    const m = f.store.sendMessage(f.scope, sendInput()),
      pid = f.store.createProposal(f.scope, m.conversationId, 'Synthetic only', proof)
    const results = await compete(
      Array.from({ length: 6 }, (_, n) => ({
        path: f.path,
        scope: f.scope,
        action: 'admit',
        input: { proposalId: pid, clientMutationId: 'run_' + n }
      }))
    )
    expect(results.filter((r) => r.ok)).toHaveLength(1)
    expect(results.filter((r) => !r.ok).every((r) => r.code === 'PROPOSAL_ALREADY_USED')).toBe(true)
    expect(
      inspect(f.store).prepare('SELECT count(*) AS n FROM workspace_writer_leases').get()!.n
    ).toBe(1)
    expect(
      inspect(f.store).prepare("SELECT count(*) AS n FROM tasks WHERE state='starting'").get()!.n
    ).toBe(1)
  }, 20000)
  it('concurrent distinct admissions preserve 1+20 capacity and do not consume the rejected proposal', async () => {
    const f = use(fixture())
    const m = f.store.sendMessage(f.scope, sendInput())
    const inputs = Array.from({ length: 22 }, (_, n) => ({
      proposalId: f.store.createProposal(f.scope, m.conversationId, 'Synthetic ' + n, proof),
      clientMutationId: 'capacity_' + n
    }))
    const results: Outcome[] = []
    for (let start = 0; start < 22; start += 6)
      results.push(
        ...(await compete(
          inputs
            .slice(start, start + 6)
            .map((input) => ({ path: f.path, scope: f.scope, action: 'admit', input }))
        ))
      )
    expect(results.filter((r) => r.ok)).toHaveLength(21)
    expect(results.filter((r) => !r.ok)).toEqual([{ ok: false, code: 'TASK_BUSY' }])
    expect(
      inspect(f.store).prepare("SELECT count(*) AS n FROM tasks WHERE state='queued'").get()!.n
    ).toBe(20)
    expect(
      inspect(f.store)
        .prepare("SELECT count(*) AS n FROM task_proposals WHERE state='available'")
        .get()!.n
    ).toBe(1)
  }, 30000)
  it('queued cancel racing reservation cannot become a never-started cancelled task with a writer lease', async () => {
    const f = use(taskFixture())
    const pid = f.store.createProposal(f.scope, f.message.conversationId, 'Queued fixture', proof),
      task = f.store.admit(f.scope, { proposalId: pid, clientMutationId: 'queued' }, proof)
    f.store.reconcile(f.scope, f.task.taskId, {
      ...proof,
      taskId: f.task.taskId,
      workspaceKey: f.scope.workspaceKey,
      childStopped: true,
      descendantsStopped: true,
      workspaceSafe: true,
      reason: 'interrupted'
    })
    const results = await compete([
      { path: f.path, scope: f.scope, action: 'cancel', input: { taskId: task.taskId } },
      { path: f.path, scope: f.scope, action: 'schedule' }
    ])
    expect(results.every((r) => r.ok)).toBe(true)
    const state = f.store.readTask(f.scope, task.taskId).state
    const lease = inspect(f.store)
      .prepare('SELECT task_id FROM workspace_writer_leases WHERE task_id=?')
      .get(task.taskId)
    if (state === 'cancelled') expect(lease).toBeUndefined()
    else {
      expect(state).toBe('cancel_requested')
      expect(lease?.task_id).toBe(task.taskId)
    }
    expect(inspect(f.store).prepare('SELECT count(*) AS n FROM task_events').get()!.n).toBe(0)
  }, 20000)
  it('real SQLITE_BUSY waits the bounded 5000ms then fails without an accepted mutation', async () => {
    const f = use(fixture()),
      gate = new SharedArrayBuffer(4),
      p = peer({ path: f.path, scope: f.scope, action: 'send', input: sendInput() }, gate)
    await p.ready
    inspect(f.store).exec('BEGIN IMMEDIATE')
    const started = Date.now()
    try {
      Atomics.store(new Int32Array(gate), 0, 1)
      Atomics.notify(new Int32Array(gate), 0)
      expect(await p.done).toEqual({ ok: false, code: 'DATABASE_UNAVAILABLE' })
      expect(Date.now() - started).toBeGreaterThanOrEqual(4900)
      expect(Date.now() - started).toBeLessThan(15000)
    } finally {
      inspect(f.store).exec('ROLLBACK')
    }
    expect(inspect(f.store).prepare('SELECT count(*) AS n FROM mutation_receipts').get()!.n).toBe(0)
  }, 20000)
  it('isolated connection exit before COMMIT rolls back, while post-COMMIT restart preserves original receipt', async () => {
    const f = use(fixture())
    const results = await compete([
      { path: f.path, scope: f.scope, action: 'send', input: sendInput(), exitBeforeCommit: true }
    ])
    expect(results[0]).toEqual({ ok: false, exit: 23 })
    expect(inspect(f.store).prepare('SELECT count(*) AS n FROM messages').get()!.n).toBe(0)
    const committed = await compete([
      { path: f.path, scope: f.scope, action: 'send', input: sendInput() }
    ])
    expect(committed[0].ok).toBe(true)
    f.store.close()
    const restored = new DurableStore(f.path, { policy: fixturePolicy })
    open.push(restored)
    expect(restored.sendMessage(f.scope, sendInput())).toEqual(committed[0].value)
  }, 20000)
  it('actual isolated Node process exits before/after COMMIT preserve rollback versus original durable acceptance', () => {
    const f = use(fixture())
    const run = (extra: object) =>
      spawnSync(process.execPath, [compiled], {
        input: JSON.stringify({
          path: f.path,
          scope: f.scope,
          action: 'send',
          input: sendInput(),
          ...extra
        }),
        encoding: 'utf8',
        windowsHide: true,
        timeout: 10000
      })
    expect(run({ exitBeforeCommit: true }).status).toBe(23)
    expect(inspect(f.store).prepare('SELECT count(*) AS n FROM messages').get()!.n).toBe(0)
    const done = run({ exitAfterCommit: true })
    expect(done.status).toBe(24)
    const accepted = JSON.parse(done.stdout.trim().split('\n').at(-1)!).value
    expect(f.store.sendMessage(f.scope, sendInput())).toEqual(accepted)
    expect(inspect(f.store).prepare('SELECT count(*) AS n FROM messages').get()!.n).toBe(1)
  }, 20000)
})
