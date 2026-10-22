import { parentPort, workerData } from 'node:worker_threads'
import { readFileSync } from 'node:fs'
import { DurableStore } from '../../electron/main/storage/store'
import { fixturePolicy, proof } from './storage'

// Disposable SQLite fault/concurrency peer only; no engine or product wire.
const { path, scope, action, input, gate, exitBeforeCommit, exitAfterCommit } = parentPort
  ? workerData
  : JSON.parse(readFileSync(0, 'utf8'))
const send = (message: unknown) =>
  parentPort
    ? parentPort.postMessage(message)
    : process.stdout.write(JSON.stringify(message) + '\n')
let store: DurableStore | undefined
try {
  store = new DurableStore(path, {
    now: () => Date.parse('2026-10-21T12:00:00Z'),
    policy: fixturePolicy,
    fault: (operation) => {
      if (exitBeforeCommit && operation === 'T1') process.exit(23)
    }
  })
  send({ ready: true })
  if (gate) Atomics.wait(new Int32Array(gate), 0, 0, 15000)
  let value: unknown
  switch (action) {
    case 'send':
      value = store.sendMessage(scope, input)
      break
    case 'admit':
      value = store.admit(scope, input, proof)
      break
    case 'cancel':
      value = store.cancel(scope, input.taskId, proof)
      break
    case 'schedule':
      value = store.schedule(proof)
      break
    default:
      throw new Error('Invalid isolated fixture action')
  }
  send({ ok: true, value })
  if (exitAfterCommit) process.exit(24)
} catch (error) {
  send({ ok: false, code: error instanceof Error ? error.message : 'INTERNAL_ERROR' })
} finally {
  store?.close()
}
