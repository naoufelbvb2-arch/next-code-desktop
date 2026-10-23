import { Worker } from 'node:worker_threads'
import { BrokerError } from './policy'
import type { Job, WorkResult } from './work'
import { verifyHandleProofs } from './windows-files'

interface Item {
  parent: string
  job: Job
  deadline: number
  cancel: Int32Array
  timer: ReturnType<typeof setTimeout>
  execute: (result: WorkResult, verify: () => void) => Promise<unknown> | unknown
  resolve: (value: unknown) => void
  reject: (error: unknown) => void
  onScanned: (bytes: number) => void
  settled: boolean
  worker?: Worker
  beforeStart?: () => Job
}
export class BrokerPool {
  private queue: Item[] = []
  private active = new Set<Item>()
  private closed = false
  constructor(private readonly workerUrl = new URL('./broker-worker.js', import.meta.url)) {}
  run<T>(
    parent: string,
    job: Job,
    execute: (value: WorkResult, verify: () => void) => Promise<T> | T,
    onScanned: (bytes: number) => void = () => {},
    maxMs = 30000,
    beforeStart?: () => Job
  ): Promise<T> {
    if (
      this.closed ||
      !Number.isFinite(maxMs) ||
      maxMs <= 0 ||
      this.queue.length >= 16 ||
      this.queue.filter((i) => i.parent === parent).length >= 4
    )
      return Promise.reject(new BrokerError('RESOURCE_LIMIT'))
    return new Promise<T>((resolve, reject) => {
      const cancel = new Int32Array(new SharedArrayBuffer(4)),
        deadline = performance.now() + Math.min(30000, maxMs)
      const item: Item = {
        parent,
        job,
        deadline,
        cancel,
        execute,
        beforeStart,
        resolve: (v) => resolve(v as T),
        reject,
        onScanned,
        settled: false,
        timer: setTimeout(
          () => {
            Atomics.store(cancel, 0, 1)
            if (!item.settled) {
              item.settled = true
              reject(new BrokerError('RESOURCE_LIMIT'))
            }
            const index = this.queue.indexOf(item)
            if (index >= 0) {
              this.queue.splice(index, 1)
              this.pump()
            } else item.worker?.postMessage('release')
          },
          Math.max(0, deadline - performance.now())
        )
      }
      this.queue.push(item)
      this.pump()
    })
  }
  private pump() {
    while (!this.closed && this.active.size < 2) {
      const index = this.queue.findIndex(
        (item) => ![...this.active].some((active) => active.parent === item.parent)
      )
      if (index < 0) return
      const item = this.queue.splice(index, 1)[0]
      this.active.add(item)
      try {
        const job = item.beforeStart?.() ?? item.job
        const worker = (item.worker = new Worker(this.workerUrl, {
          workerData: { job, deadline: item.deadline, cancel: item.cancel.buffer },
          resourceLimits: {
            maxOldGenerationSizeMb: 128,
            maxYoungGenerationSizeMb: 16,
            stackSizeMb: 4
          }
        }))
        let received = false
        worker.once(
          'message',
          async (reply: { ok: boolean; data: WorkResult; code?: string; scannedBytes: number }) => {
            received = true
            item.onScanned(reply.scannedBytes)
            try {
              if (item.settled) return
              if (!reply.ok)
                throw new BrokerError((reply.code ?? 'BROKER_IO_ERROR') as BrokerError['code'])
              const verify = () =>
                verifyHandleProofs(reply.data.proofs ?? [], () => {
                  if (
                    item.settled ||
                    this.closed ||
                    Atomics.load(item.cancel, 0) !== 0 ||
                    performance.now() >= item.deadline
                  )
                    throw new BrokerError('RESOURCE_LIMIT')
                })
              verify()
              const value = await item.execute(reply.data, verify)
              if (!item.settled) {
                item.settled = true
                item.resolve(value)
              }
            } catch (error) {
              if (!item.settled) {
                item.settled = true
                item.reject(error)
              }
            } finally {
              clearTimeout(item.timer)
              Atomics.store(item.cancel, 0, 1)
              worker.postMessage('release')
            }
          }
        )
        worker.once('error', () => {
          Atomics.store(item.cancel, 0, 1)
          if (!received) item.onScanned(8 * 1024 * 1024) // Unknown capture cannot refund its reservation.
          if (!item.settled) {
            item.settled = true
            item.reject(new BrokerError('BROKER_IO_ERROR'))
          }
          // Unexpected native worker death has no proven handle cleanup. Keep
          // capacity closed until application restart, rather than replace it
          // or guess which process-wide handle numbers might have been reused.
          this.closed = true
          this.abortQueued()
        })
        worker.once('exit', () => {
          Atomics.store(item.cancel, 0, 1)
          clearTimeout(item.timer)
          if (!item.settled) {
            item.settled = true
            item.reject(new BrokerError('BROKER_IO_ERROR'))
          }
          this.active.delete(item)
          this.pump()
        })
      } catch (error) {
        clearTimeout(item.timer)
        this.active.delete(item)
        item.settled = true
        item.reject(error)
      }
    }
  }
  abort(parent: string) {
    for (const item of [...this.queue, ...this.active])
      if (item.parent === parent) {
        Atomics.store(item.cancel, 0, 1)
        if (!item.settled) {
          item.settled = true
          item.reject(new BrokerError('NOT_AUTHORIZED'))
        }
        clearTimeout(item.timer)
        const index = this.queue.indexOf(item)
        if (index >= 0) this.queue.splice(index, 1)
        else item.worker?.postMessage('release')
      }
    this.pump()
  }
  private abortQueued() {
    for (const item of this.queue) {
      clearTimeout(item.timer)
      item.settled = true
      item.reject(new BrokerError('BROKER_IO_ERROR'))
    }
    this.queue = []
  }
  close() {
    this.closed = true
    this.abortQueued()
    for (const item of this.active) {
      Atomics.store(item.cancel, 0, 1)
      item.worker?.postMessage('release')
    }
  }
  get counts() {
    return { active: this.active.size, queued: this.queue.length }
  }
}
