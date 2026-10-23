import { parentPort, workerData } from 'node:worker_threads'
import { prepare } from './work'
import { BrokerError } from './policy'

// Main-owned worker thread only; this is not a public service/IPC capability.
const { job, deadline, cancel } = workerData
const flag = new Int32Array(cancel)
let scannedBytes = 0,
  release: (() => void) | undefined
parentPort!.on('message', () => {
  release?.()
  release = undefined
  parentPort!.close()
})
try {
  const prepared = prepare(
    job,
    deadline,
    () => Atomics.load(flag, 0) !== 0,
    (n) => {
      scannedBytes += n
    }
  )
  release = prepared.close
  if (Atomics.load(flag, 0) !== 0) {
    release()
    parentPort!.close()
  } else parentPort!.postMessage({ ok: true, data: prepared.result, scannedBytes })
} catch (error) {
  parentPort!.postMessage({
    ok: false,
    code: error instanceof BrokerError ? error.code : 'BROKER_IO_ERROR',
    scannedBytes
  })
  parentPort!.close()
}
