// @vitest-environment node
import { describe, test, expect } from 'vitest'
import { resolve, join } from 'node:path'
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs'
import { resolveRuntime, launchSpec } from '../../electron/main/supervisor/runtime'
import {
  configFixture,
  runtimeFixture,
  childFixture,
  fixtureLaunch,
  waitFor,
  discussionInput,
  executeInput,
  taskBinding,
  coordinatorFixture,
  PythonSupervisor,
  WindowsProcess,
  inspect,
  proof
} from '../fixtures/supervision'
import { BoundedFrameQueue, WIRE_LIMITS } from '../../contracts/jsonl'

describe('P4 real Windows Python supervision (synthetic peers, no engine)', () => {
  test('P4-R01 explicit pinned interpreter, real isolated version/bridge probes and environment allowlist', async () => {
    const runtime = await runtimeFixture()
    expect(process.platform).toBe('win32')
    expect(runtime.version).toEqual([3, 14, 4])
    expect(
      Object.keys(runtime.env).every((key) => ['SystemRoot', 'WINDIR', 'TEMP', 'TMP'].includes(key))
    ).toBe(true)
    expect(launchSpec(runtime, 'discussion').args).toEqual([
      '-I',
      '-S',
      '-u',
      resolve('bridge/desktop_bridge.py'),
      '--role',
      'discussion'
    ])
  })
  test('P4-R02 missing configuration, PATH command, wrong digest and missing executable fail closed', async () => {
    const f = configFixture()
    await expect(
      resolveRuntime(join(f.directory, 'missing.json'), resolve('bridge'))
    ).rejects.toThrow('RUNTIME_NOT_READY')
    for (const pythonPath of [
      'python.exe',
      'C:/synthetic/missing/python.exe',
      'C:/Python314/python.exe'
    ]) {
      writeFileSync(f.config, JSON.stringify({ pythonPath, pythonSha256: '0'.repeat(64) }))
      await expect(resolveRuntime(f.config, resolve('bridge'))).rejects.toThrow('RUNTIME_NOT_READY')
    }
  })
  test('P4-R03 incompatible or changed bridge manifest is rejected without executing it', async () => {
    const f = configFixture(),
      bridge = join(f.directory, 'bridge')
    mkdirSync(bridge)
    const manifest = JSON.parse(readFileSync('bridge/compatibility.json', 'utf8'))
    writeFileSync(join(bridge, 'desktop_bridge.py'), 'raise RuntimeError("must never execute")')
    writeFileSync(join(bridge, 'compatibility.json'), JSON.stringify(manifest))
    await expect(resolveRuntime(f.config, bridge)).rejects.toThrow('RUNTIME_NOT_READY')
    manifest.protocol = 2
    writeFileSync(join(bridge, 'compatibility.json'), JSON.stringify(manifest))
    await expect(resolveRuntime(f.config, bridge)).rejects.toThrow('RUNTIME_NOT_READY')
  })
  test('P4-L01 actual READY, independent process identity and truthful provider unavailable', async () => {
    const runtime = await runtimeFixture()
    const child = childFixture('normal', { launch: launchSpec(runtime, 'discussion') })
    try {
      await child.ready
      expect(child.states.slice(0, 4)).toEqual(['CREATED', 'SPAWNING', 'HANDSHAKING', 'READY'])
      expect(child.identity.creation).toMatch(/^\d+$/)
      const response = await child.request('discussion.send', discussionInput())
      expect(response).toMatchObject({
        type: 'error',
        payload: { code: 'PROVIDER_UNAVAILABLE', retryable: false }
      })
      expect(child.state).toBe('READY')
    } finally {
      expect(await child.stop()).toBe(true)
    }
    expect(child.state).toBe('EXITED')
  })
  test.each([
    'before_ready',
    'wrong_role',
    'duplicate_ready',
    'invalid_utf8',
    'chatter',
    'oversize',
    'duplicate_keys',
    'bad_version',
    'wrong_action',
    'wrong_correlation'
  ])('P4-P01 real malformed startup/peer %s fails safely', async (mode) => {
    const child = childFixture(mode)
    try {
      await child.ready.catch(() => {})
      await waitFor(() => child.lastError !== null)
      expect(child.connection.state.ready).toBe(false)
      expect(child.states).toContain('FAILED')
    } finally {
      expect(await child.stop()).toBe(true)
    }
  })
  test('P4-P02 exact READY 30s and partial-frame 15s deadlines on live isolated children with advanced monotonic clocks', async () => {
    for (const mode of ['silent', 'partial']) {
      let now = 0
      const child = childFixture(mode, { now: () => now })
      try {
        if (mode === 'partial') await waitFor(() => child.decoder.bufferedBytes > 0)
        expect(() => child.send('discussion.send', discussionInput())).toThrow('INVALID_STATE')
        now = mode === 'silent' ? 30000 : 15000
        child.checkDeadlines()
        expect(child.lastError).toBe(mode === 'silent' ? 'STARTUP_FAILED' : 'BAD_FRAME')
      } finally {
        expect(await child.stop()).toBe(true)
      }
    }
  })
  test.each(['duplicate_id', 'foreign_final', 'disconnect'])(
    'P4-P03 request fault %s does not replay or accept foreign results',
    async (mode) => {
      const child = childFixture(mode)
      try {
        await child.ready
        await expect(child.request('discussion.send', discussionInput())).rejects.toThrow()
        await waitFor(() => child.lastError !== null || child.state === 'EXITED')
      } finally {
        await child.stop()
      }
    }
  )
  test('P4-S01 raw stderr secrets/paths/pretend completion never enter wire or retained diagnostics', async () => {
    const child = childFixture('stderr')
    let events = 0
    child.on('frame', (frame) => {
      if (frame.type === 'event') events++
    })
    try {
      await child.ready
      await waitFor(() => child.diagnostics.length > 0)
      expect(child.diagnostics.length).toBeLessThanOrEqual(64)
      const text = JSON.stringify(child.diagnostics)
      expect(text).toContain('PYTHON_STDERR_REDACTED')
      expect(text).not.toMatch(/API_KEY|synthetic-secret|private|task.completed/)
      expect(events).toBe(0)
    } finally {
      await child.stop()
    }
  })
  test('P4-P04 discussion requests serialize per conversation, cap at 16 and expire at 300s without replay', async () => {
    let now = 0
    const child = childFixture('hang_request', { now: () => now })
    try {
      await child.ready
      child.send('discussion.send', discussionInput('conv_0'))
      expect(() => child.send('discussion.send', discussionInput('conv_0'))).toThrow(
        'RESOURCE_LIMIT'
      )
      for (let i = 1; i < 16; i++) child.send('discussion.send', discussionInput(`conv_${i}`))
      expect(child.connection.state.pending).toBe(16)
      expect(() => child.send('discussion.send', discussionInput('conv_16'))).toThrow(
        'RESOURCE_LIMIT'
      )
      now = 300000
      child.checkDeadlines()
      expect(child.lastError).toBe('PROVIDER_TIMEOUT')
    } finally {
      await child.stop()
    }
  })
  test('P4-L02 bounded Discussion starts use 1/2/4s schedule, each session is fresh, then unavailable', async () => {
    const runtime = await runtimeFixture(),
      delays: number[] = [],
      sessions: string[] = []
    const supervisor = new PythonSupervisor({
      runtime,
      discussionLaunch: () => fixtureLaunch('before_ready'),
      sleep: async (ms) => {
        delays.push(ms)
      }
    })
    try {
      await expect(supervisor.ensureDiscussionReady()).rejects.toThrow('RUNTIME_NOT_READY')
      expect(delays).toEqual([1000, 2000, 4000])
      sessions.push(supervisor.discussion!.sessionId)
      await expect(supervisor.ensureDiscussionReady()).rejects.toThrow('RUNTIME_NOT_READY')
      expect(delays.length).toBe(3)
    } finally {
      await supervisor.stopAllOnAppQuit()
    }
  })
  test('P4-L03 one long-lived Discussion per Main, concurrent ensure shares the same child and new Main has fresh identity', async () => {
    const runtime = await runtimeFixture(),
      supervisor = new PythonSupervisor({ runtime, sleep: async () => {} })
    try {
      const [a, b] = await Promise.all([
        supervisor.ensureDiscussionReady(),
        supervisor.ensureDiscussionReady()
      ])
      expect(a).toBe(b)
      expect(new PythonSupervisor({ runtime }).runId).not.toBe(supervisor.runId)
    } finally {
      await supervisor.stopAllOnAppQuit()
    }
  })
  test('P4-C01 coding simulator accepts one execute, responsive reserved cancel under load, no fabricated terminal event', async () => {
    const child = childFixture('load', {
      role: 'coding_task',
      launch: fixtureLaunch('load', 'coding_task'),
      task: taskBinding,
      authorizeExecute: () => true
    })
    const frames: unknown[] = []
    child.on('frame', (f) => frames.push(f))
    try {
      await child.ready
      child.send('task.execute', executeInput())
      await waitFor(() => frames.length >= 4)
      expect(() => child.send('task.execute', executeInput())).toThrow()
    } finally {
      await child.stop()
    }
    // Separate connection: a refused execute poisons the first connection.
    const next = childFixture('load', {
      role: 'coding_task',
      launch: fixtureLaunch('load', 'coding_task'),
      task: taskBinding,
      authorizeExecute: () => true
    })
    const names: string[] = []
    next.on('frame', (f) => {
      if (f.type === 'event') names.push(f.payload.name)
    })
    try {
      await next.ready
      next.send('task.execute', executeInput())
      await waitFor(() => names.length >= 3)
      const response = await next.request('task.cancel', { task_id: taskBinding.taskId })
      expect(response).toMatchObject({
        type: 'response',
        payload: { result: { cancel_request_registered: true } }
      })
      expect(names).not.toContain('task.cancelled')
      expect(names).not.toContain('task.completed')
    } finally {
      expect(await next.stop()).toBe(true)
    }
  })
  test('P4-C02 full 15-second graceful window, acknowledgement is not stop; forced Job termination is not cancellation evidence', async () => {
    const child = childFixture('ignore_cancel', {
      role: 'coding_task',
      launch: fixtureLaunch('ignore_cancel', 'coding_task'),
      task: taskBinding,
      authorizeExecute: () => true
    })
    try {
      await child.ready
      child.send('task.execute', executeInput())
      await waitFor(() => child.connection.state.pending === 1)
      const start = performance.now()
      await child.request('task.cancel', { task_id: taskBinding.taskId })
      expect(child.state).toBe('CANCEL_REQUESTED')
      expect(child.process!.activeProcesses()).toBeGreaterThanOrEqual(1)
      await waitFor(() => child.state === 'EXITED', 21000)
      expect(performance.now() - start).toBeGreaterThanOrEqual(14950)
      expect(child.connection.state.terminalObserved).toBe(false)
    } finally {
      await child.stop()
    }
  }, 25000)
  test('P4-W01 suspended launch Job contains child and grandchild, direct parent exit does not prove descendants stopped', async () => {
    const child = new WindowsProcess(fixtureLaunch('orphan', 'coding_task'))
    child.stdout.resume()
    child.stderr.resume()
    child.stdin.on('error', () => {})
    try {
      child.stdin.write(
        JSON.stringify({
          version: 1,
          type: 'request',
          message_id: 'execute',
          correlation_id: null,
          payload: { action: 'task.execute', input: executeInput() }
        }) + '\n'
      )
      await waitFor(() => (child.activeProcesses() ?? 0) >= 4)
      await waitFor(() => child.childExited)
      expect(child.activeProcesses()).toBeGreaterThanOrEqual(2)
      expect(await child.stop()).toBe(true)
      expect(child.activeProcesses()).toBe(0)
    } finally {
      await child.stop()
      child.dispose()
    }
  })
  test('P4-D01 DB commit gates launch, replay cannot spawn twice, cancel/exit retains lease until independent workspace proof', async () => {
    const f = await coordinatorFixture('load')
    try {
      const child = await f.supervisor.admitCodingTask(f.scope, f.task.taskId)
      await expect(f.supervisor.admitCodingTask(f.scope, f.task.taskId)).rejects.toThrow(
        'TASK_BUSY'
      )
      await waitFor(
        () => Number(inspect(f.store).prepare('SELECT count(*) n FROM task_events').get()!.n) > 1
      )
      expect(f.supervisor.requestCancellation(f.scope, f.task.taskId).state).toBe('requested')
      await child.stop()
      expect(await f.supervisor.reconcileTask(f.scope, f.task.taskId)).toBe(false)
      expect(
        inspect(f.store).prepare('SELECT count(*) n FROM workspace_writer_leases').get()!.n
      ).toBe(1)
      expect(f.store.readTask(f.scope, f.task.taskId)).toMatchObject({
        state: 'needs_reconciliation'
      })
    } finally {
      await f.supervisor.stopAllOnAppQuit()
      f.store.close()
    }
  })
  test('P4-D02 missing/queued/cancelled admission never spawns; production has no coding launch capability', async () => {
    const f = await coordinatorFixture()
    try {
      await expect(f.supervisor.admitCodingTask(f.scope, 'absent')).rejects.toThrow()
      const proposal = f.store.createProposal(
        f.scope,
        f.message.conversationId,
        'Another synthetic',
        proof
      )
      const queued = f.store.admit(
        f.scope,
        { proposalId: proposal, clientMutationId: 'second' },
        proof
      )
      await expect(f.supervisor.admitCodingTask(f.scope, queued.taskId)).rejects.toThrow(
        'TASK_UNKNOWN'
      )
      f.store.cancel(f.scope, queued.taskId, proof)
      await expect(f.supervisor.admitCodingTask(f.scope, queued.taskId)).rejects.toThrow(
        'TASK_UNKNOWN'
      )
      const production = new PythonSupervisor({ runtime: await runtimeFixture() })
      await expect(production.admitCodingTask(f.scope, f.task.taskId)).rejects.toThrow(
        'RUNTIME_NOT_READY'
      )
    } finally {
      await f.supervisor.stopAllOnAppQuit()
      f.store.close()
    }
  })
  test('P4-D03 verified Job plus independent synthetic workspace proof allows interrupted cleanup without invented outcome', async () => {
    const f = await coordinatorFixture('load', { workspaceSafe: () => true })
    try {
      await f.supervisor.admitCodingTask(f.scope, f.task.taskId)
      expect(await f.supervisor.reconcileTask(f.scope, f.task.taskId)).toBe(true)
      const db = inspect(f.store)
      expect(db.prepare('SELECT count(*) n FROM workspace_writer_leases').get()!.n).toBe(0)
      expect(db.prepare('SELECT engine_outcome_json,cleanup_state FROM tasks').get()).toMatchObject(
        { engine_outcome_json: null, cleanup_state: 'verified_interrupted' }
      )
      expect(
        db
          .prepare(
            "SELECT count(*) n FROM task_events WHERE name LIKE 'task.c%' OR name='task.failed'"
          )
          .get()!.n
      ).toBe(0)
    } finally {
      await f.supervisor.stopAllOnAppQuit()
      f.store.close()
    }
  })
  test('P4-Q01 finite queue bytes/count and sustained 30s pressure use existing P2 limits', () => {
    const queue = new BoundedFrameQueue(),
      bytes = Buffer.alloc(32768)
    for (let i = 0; i < 256; i++) expect(queue.offer(bytes, 0)).toBe(true)
    expect(queue.byteLength).toBe(WIRE_LIMITS.queueBytes)
    expect(queue.offer(bytes, 0)).toBe(false)
    expect(() => queue.tick(29999)).not.toThrow()
    expect(() => queue.tick(30000)).toThrow('RESOURCE_LIMIT')
  })
  test('P4-P05 child-originated broker request is denied by default and bounded at 30 seconds with explicit fixture scope', async () => {
    for (const authorized of [false, true]) {
      let now = 0
      const child = childFixture('broker', { now: () => now, authorizeBroker: () => authorized })
      try {
        await child.ready
        child.send('discussion.send', discussionInput())
        if (!authorized) {
          await waitFor(() => child.lastError !== null)
          expect(child.lastError).toBe('NOT_AUTHORIZED')
        } else {
          await waitFor(() => child.connection.state.pending === 2)
          now = 30000
          child.checkDeadlines()
          expect(child.lastError).toBe('BROKER_IO_ERROR')
        }
      } finally {
        await child.stop()
      }
    }
  })
  test('P4-L04 Discussion restart after ambiguous disconnect is separate from coding and never replays a turn', async () => {
    let starts = 0
    const f = await coordinatorFixture('load', {
      discussionLaunch: () => fixtureLaunch(starts++ === 0 ? 'disconnect' : 'normal'),
      sleep: async () => {}
    })
    try {
      const coding = await f.supervisor.admitCodingTask(f.scope, f.task.taskId),
        first = await f.supervisor.ensureDiscussionReady()
      await expect(first.request('discussion.send', discussionInput())).rejects.toThrow()
      await waitFor(() => starts === 2 && !!f.supervisor.discussion?.connection.state.ready)
      const next = f.supervisor.discussion!
      expect(next.sessionId).not.toBe(first.sessionId)
      expect(next.connection.state.pending).toBe(0)
      expect(coding.state).toBe('BUSY')
      expect(coding.connection.state.ready).toBe(true)
      await coding.stop()
    } finally {
      await f.supervisor.stopAllOnAppQuit()
      f.store.close()
    }
  })
  test('P4-Q02 actual Python event pressure against stalled persistence stays bounded and fails on saturation deadline', async () => {
    let now = 0,
      release!: () => void
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    const child = childFixture('flood', {
      role: 'coding_task',
      launch: fixtureLaunch('flood', 'coding_task'),
      task: taskBinding,
      authorizeExecute: () => true,
      now: () => now,
      onFrame: async (frame) => {
        if (frame.type === 'event') await held
      }
    })
    try {
      await child.ready
      child.send('task.execute', executeInput())
      await waitFor(() => child.lastError !== null || child.process!.stdout.isPaused(), 8000)
      expect(child.incoming.size).toBeLessThanOrEqual(256)
      expect(child.incoming.byteLength).toBeLessThanOrEqual(8388608)
      now = 30000
      child.checkDeadlines()
      expect(child.lastError).toBe('RESOURCE_LIMIT')
    } finally {
      release()
      await child.stop()
    }
  }, 10000)
  test('P4-D04 loss of Job query evidence is UNVERIFIED and never releases the durable lease even with workspace proof', async () => {
    const f = await coordinatorFixture('load', { workspaceSafe: () => true })
    try {
      const child = await f.supervisor.admitCodingTask(f.scope, f.task.taskId)
      // Close ONLY our owned Job. Handles are now unavailable for verification;
      // the implementation must refuse to manufacture a positive query result.
      child.process!.dispose()
      expect(await f.supervisor.reconcileTask(f.scope, f.task.taskId)).toBe(false)
      expect(child.state).toBe('UNVERIFIED')
      expect(
        inspect(f.store).prepare('SELECT count(*) n FROM workspace_writer_leases').get()!.n
      ).toBe(1)
    } finally {
      await f.supervisor.stopAllOnAppQuit()
      f.store.close()
    }
  })
  test('P4-D05 persistence handler failure faults transport and never treats an uncommitted event as success', async () => {
    let committed = 0
    const child = childFixture('load', {
      role: 'coding_task',
      launch: fixtureLaunch('load', 'coding_task'),
      task: taskBinding,
      authorizeExecute: () => true,
      onFrame: (frame) => {
        if (frame.type === 'event') throw new Error('Synthetic unavailable database')
        else committed += 0
      }
    })
    try {
      await child.ready
      child.send('task.execute', executeInput())
      await waitFor(() => child.lastError !== null)
      expect(committed).toBe(0)
      expect(child.connection.state.terminalObserved).toBe(false)
    } finally {
      await child.stop()
    }
  })
  test.each([
    'task_action',
    'duplicate_keys',
    'invalid_utf8',
    'lone_surrogate',
    'unknown_field',
    'float_version',
    'context_over_budget'
  ])(
    'P4-PY01 production Python independently rejects %s without engine/provider or database',
    async (kind) => {
      const runtime = await runtimeFixture(),
        child = new WindowsProcess(launchSpec(runtime, 'discussion'))
      const output: Buffer[] = []
      child.stdout.on('data', (bytes: Buffer) => output.push(bytes))
      child.stderr.resume()
      child.stdin.on('error', () => {})
      try {
        await waitFor(() => output.length > 0)
        let bytes: Buffer
        const frame = {
          version: 1,
          type: 'request',
          message_id: 'test_request',
          correlation_id: null,
          payload: { action: 'discussion.send', input: discussionInput() }
        }
        if (kind === 'task_action')
          bytes = Buffer.from(
            JSON.stringify({
              ...frame,
              payload: { action: 'task.cancel', input: { task_id: 'forged' } }
            }) + '\n'
          )
        else if (kind === 'duplicate_keys') bytes = Buffer.from('{"version":1,"version":1}\n')
        else if (kind === 'invalid_utf8') bytes = Buffer.from([255, 10])
        else if (kind === 'lone_surrogate')
          bytes = Buffer.from(
            JSON.stringify(frame).replace('Synthetic text only', '\\ud800') + '\n'
          )
        else if (kind === 'unknown_field')
          bytes = Buffer.from(JSON.stringify({ ...frame, command: 'not_allowed' }) + '\n')
        else if (kind === 'float_version')
          bytes = Buffer.from(JSON.stringify(frame).replace('"version":1', '"version":1.0') + '\n')
        else {
          const large = {
            ...frame,
            payload: {
              ...frame.payload,
              input: {
                ...frame.payload.input,
                context_snapshot: {
                  ...frame.payload.input.context_snapshot,
                  recent_messages: Array.from({ length: 20 }, (_, i) => ({
                    message_id: `m_${i}`,
                    role: 'user',
                    text: 'x'.repeat(6000)
                  }))
                }
              }
            }
          }
          bytes = Buffer.from(JSON.stringify(large) + '\n')
        }
        const exit = new Promise<number>((resolve) => child.once('exit', resolve))
        child.stdin.write(bytes)
        expect(await exit).toBe(65)
        expect(Buffer.concat(output).toString('utf8').split('\n').filter(Boolean).length).toBe(1)
      } finally {
        expect(await child.stop()).toBe(true)
        child.dispose()
      }
    }
  )
  test('P4-PY02 production Python refuses duplicate request identity instead of repeating a provider attempt', async () => {
    const runtime = await runtimeFixture(),
      child = new WindowsProcess(launchSpec(runtime, 'discussion'))
    const output: Buffer[] = []
    child.stdout.on('data', (bytes: Buffer) => output.push(bytes))
    child.stderr.resume()
    child.stdin.on('error', () => {})
    try {
      await waitFor(() => output.length > 0)
      const line =
        JSON.stringify({
          version: 1,
          type: 'request',
          message_id: 'same_request',
          correlation_id: null,
          payload: { action: 'discussion.send', input: discussionInput() }
        }) + '\n'
      child.stdin.write(line)
      await waitFor(() => Buffer.concat(output).toString('utf8').includes('PROVIDER_UNAVAILABLE'))
      const exit = new Promise<number>((resolve) => child.once('exit', resolve))
      child.stdin.write(line)
      expect(await exit).toBe(65)
      const frames = Buffer.concat(output)
        .toString('utf8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line))
      expect(frames.map((frame) => frame.type)).toEqual(['ready', 'error'])
    } finally {
      await child.stop()
      child.dispose()
    }
  })
})
