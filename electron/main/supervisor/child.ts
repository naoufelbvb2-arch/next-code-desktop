import { EventEmitter } from 'node:events'
import { randomBytes } from 'node:crypto'
import {
  BoundedFrameQueue,
  JsonlDecoder,
  ProtocolConnection,
  ProtocolError,
  WIRE_LIMITS,
  decodeLine,
  serializeWire,
  newMessageId,
  type ConnectionOptions
} from '../../../contracts/jsonl'
import type { WireMessage, WireAction } from '../../../contracts/wire-schema'
import { WindowsProcess, WindowsLaunchError, type LaunchSpec } from './windows-process'

export type ChildState =
  | 'CREATED'
  | 'SPAWNING'
  | 'HANDSHAKING'
  | 'READY'
  | 'BUSY'
  | 'CANCEL_REQUESTED'
  | 'TERMINATING'
  | 'EXITED'
  | 'FAILED'
  | 'UNVERIFIED'
export interface ChildOptions extends Omit<ConnectionOptions, 'openedAt'> {
  runId: string
  launch: LaunchSpec
  onFrame?: (frame: WireMessage, sessionId: string) => Promise<void> | void
  onFault?: (sessionId: string) => void
  now?: () => number
}
// Internal only. Test clocks may advance deadlines, never change frozen limits.
export class SupervisedChild extends EventEmitter {
  readonly sessionId = randomBytes(24).toString('hex')
  readonly states: ChildState[] = ['CREATED']
  readonly decoder = new JsonlDecoder()
  readonly incoming = new BoundedFrameQueue()
  readonly outgoing = new BoundedFrameQueue()
  readonly connection: ProtocolConnection
  readonly diagnostics: { code: 'PYTHON_STDERR_REDACTED'; bytes: number }[] = []
  state: ChildState = 'CREATED'
  lastError: string | null = null
  cleanupVerified: boolean | null = null
  process?: WindowsProcess
  private readonly now: () => number
  private timer?: ReturnType<typeof setInterval>
  private draining = false
  private writing = false
  private stopped = false
  private shutdownPromise?: Promise<boolean>
  private cancelAt: number | null = null
  private fullAt: number | null = null
  private stdoutEnded = false
  private exitObservedAt: number | null = null
  private launchCleanupVerified = false
  private readonly turns = new Map<string, string>()
  private readonly waiters = new Map<
    string,
    { resolve: (frame: WireMessage) => void; reject: (error: Error) => void }
  >()
  private readyResolve!: () => void
  private readyReject!: (error: Error) => void
  readonly ready: Promise<void>
  constructor(readonly options: ChildOptions) {
    super()
    this.now = options.now ?? (() => performance.now())
    this.connection = new ProtocolConnection({ ...options, openedAt: this.now() })
    this.ready = new Promise((resolve, reject) => {
      this.readyResolve = resolve
      this.readyReject = reject
    })
    // A caller may await READY after an observed startup failure.
    void this.ready.catch(() => {})
  }
  private transition(state: ChildState) {
    this.state = state
    this.states.push(state)
    this.emit('state', state)
  }
  start(): this {
    if (this.state !== 'CREATED') throw new ProtocolError('INVALID_STATE')
    this.transition('SPAWNING')
    try {
      const p = (this.process = new WindowsProcess(this.options.launch))
      this.transition('HANDSHAKING')
      p.stdout.on('data', (chunk: Buffer) => this.receive(chunk))
      p.stdout.on('end', () => {
        this.stdoutEnded = true
        try {
          this.decoder.end()
        } catch (error) {
          this.fault(error)
        }
        this.finishEof()
      })
      p.stderr.on('data', (chunk: Buffer) => {
        if (this.diagnostics.length === 64) this.diagnostics.shift()
        this.diagnostics.push({ code: 'PYTHON_STDERR_REDACTED', bytes: chunk.length })
      })
      p.stdout.on('error', (error) => this.fault(error))
      p.stderr.on('error', (error) => this.fault(error))
      p.stdin.on('error', (error) => {
        if (!this.stopped) this.fault(error)
      })
      p.on('exit', () => {
        // OS exit may precede the last pipe callback. Drain validated frames
        // before closing correlation state; a live descendant may hold EOF.
        this.exitObservedAt = this.now()
        this.finishEof()
        this.emit('exit')
      })
      this.timer = setInterval(() => this.checkDeadlines(), 50)
    } catch (error) {
      this.launchCleanupVerified = error instanceof WindowsLaunchError && error.cleanupVerified
      this.fault(error)
    }
    return this
  }
  private receive(chunk: Buffer) {
    if (this.stopped || this.lastError) return
    try {
      // Native reads are <=64KiB. Leave headroom for one already-read chunk,
      // so pausing stdout never loses an unqueued record at either queue cap.
      for (const frame of this.decoder.push(chunk, this.now())) {
        if (!this.incoming.offer(serializeWire(frame), this.now()))
          throw new ProtocolError('RESOURCE_LIMIT')
      }
      if (this.incoming.size >= 255 || this.incoming.byteLength >= WIRE_LIMITS.queueBytes - 65536) {
        this.fullAt ??= this.now()
        this.process?.stdout.pause()
      }
      void this.drain()
    } catch (error) {
      this.fault(error)
    }
  }
  private async drain() {
    if (this.draining) return
    this.draining = true
    try {
      let record: Buffer | undefined
      while (!this.stopped && !this.lastError && (record = this.incoming.take())) {
        const frame = decodeLine(record)
        const observed = this.connection.observe('child-to-main', frame, this.now())
        if (frame.type === 'ready') {
          this.transition('READY')
          this.readyResolve()
        }
        if ((frame.type === 'response' || frame.type === 'error') && frame.correlation_id) {
          const accepted = frame.type === 'response' && frame.payload.status === 'accepted'
          if (!accepted) {
            this.turns.delete(frame.correlation_id)
            const waiter = this.waiters.get(frame.correlation_id)
            this.waiters.delete(frame.correlation_id)
            waiter?.resolve(frame)
            if (this.options.role === 'discussion' && !this.turns.size) this.transition('READY')
          }
        }
        if (!observed.duplicateEvent) await this.options.onFrame?.(frame, this.sessionId)
        this.emit('frame', frame)
        if (this.connection.state.closed && !this.stopped)
          throw new ProtocolError('INTERNAL_FAILURE')
      }
      if (
        this.incoming.size < 128 &&
        this.incoming.byteLength < WIRE_LIMITS.queueBytes / 2 &&
        !this.lastError
      ) {
        this.fullAt = null
        this.process?.stdout.resume()
      }
    } catch (error) {
      this.fault(error)
    } finally {
      this.draining = false
      this.finishEof()
    }
  }
  private finishEof() {
    if (this.stdoutEnded && !this.draining && !this.incoming.size && !this.stopped) {
      // EOF is an operational disconnect, never a new task outcome. stop()
      // verifies the entire Job, including descendants, before disposal.
      this.fault(new ProtocolError('INTERNAL_FAILURE'))
    }
  }
  send(action: WireAction, input: Record<string, unknown>): string {
    if (
      !this.connection.state.ready ||
      this.stopped ||
      this.lastError ||
      (this.cancelAt !== null && action !== 'task.cancel')
    )
      throw new ProtocolError('INVALID_STATE')
    if (
      action === 'discussion.send' &&
      [...this.turns.values()].includes(input.conversation_id as string)
    )
      throw new ProtocolError('RESOURCE_LIMIT')
    if (this.options.role === 'discussion' && this.connection.state.pending >= WIRE_LIMITS.inFlight)
      throw new ProtocolError('RESOURCE_LIMIT')
    // The reserved cancel does not share a full ordinary pending queue.
    if (this.outgoing.size >= (action === 'task.cancel' ? 256 : 255))
      throw new ProtocolError('RESOURCE_LIMIT')
    const id = newMessageId(),
      frame = {
        version: 1,
        type: 'request',
        message_id: id,
        correlation_id: null,
        payload: { action, input }
      }
    const bytes = serializeWire(frame)
    try {
      this.connection.observe('main-to-child', frame, this.now())
    } catch (error) {
      this.fault(error)
      throw error
    }
    if (!this.outgoing.offer(bytes, this.now())) {
      this.fault(new ProtocolError('RESOURCE_LIMIT'))
      throw new ProtocolError('RESOURCE_LIMIT')
    }
    if (action === 'discussion.send') this.turns.set(id, input.conversation_id as string)
    if (action === 'task.cancel') {
      this.cancelAt = this.now()
      this.transition('CANCEL_REQUESTED')
    } else this.transition('BUSY')
    this.flush()
    return id
  }
  request(action: WireAction, input: Record<string, unknown>): Promise<WireMessage> {
    // Native reads complete asynchronously, after this waiter is installed.
    const id = this.send(action, input)
    return new Promise((resolve, reject) => this.waiters.set(id, { resolve, reject }))
  }
  private flush() {
    if (this.writing || this.stopped || this.lastError) return
    const bytes = this.outgoing.take()
    if (!bytes) return
    this.writing = true
    this.process?.stdin.write(bytes, (error) => {
      this.writing = false
      if (error) this.fault(error)
      else this.flush()
    })
  }
  checkDeadlines(): void {
    if (this.stopped || this.lastError) return
    try {
      const now = this.now()
      this.decoder.tick(now)
      this.connection.tick(now)
      this.incoming.tick(now)
      this.outgoing.tick(now)
      if (this.exitObservedAt !== null && now - this.exitObservedAt >= 5000)
        throw new ProtocolError('INTERNAL_FAILURE')
      if (this.fullAt !== null && now - this.fullAt >= WIRE_LIMITS.saturationMs)
        throw new ProtocolError('RESOURCE_LIMIT')
      if (this.cancelAt !== null && now - this.cancelAt >= 15000) void this.stop()
    } catch (error) {
      this.fault(error)
    }
  }
  private rejectPending() {
    for (const waiter of this.waiters.values()) waiter.reject(new ProtocolError('INTERNAL_FAILURE'))
    this.waiters.clear()
    this.turns.clear()
  }
  private fault(error: unknown) {
    if (this.lastError || this.stopped) return
    this.lastError = error instanceof ProtocolError ? error.code : 'INTERNAL_FAILURE'
    this.transition('FAILED')
    this.connection.close()
    this.readyReject(new ProtocolError('STARTUP_FAILED'))
    this.rejectPending()
    try {
      this.options.onFault?.(this.sessionId)
    } catch {}
    this.emit('fault', this.lastError)
    void this.stop()
  }
  stop(): Promise<boolean> {
    return (this.shutdownPromise ??= this.shutdown())
  }
  private async shutdown(): Promise<boolean> {
    this.stopped = true
    clearInterval(this.timer)
    this.connection.close()
    this.rejectPending()
    this.readyReject(new ProtocolError('STARTUP_FAILED'))
    const failed = this.lastError !== null
    if (!failed) this.transition('TERMINATING')
    const verified = this.process ? await this.process.stop() : this.launchCleanupVerified
    this.cleanupVerified = verified
    if (!verified) this.transition('UNVERIFIED')
    else if (!failed) this.transition('EXITED')
    this.process?.dispose()
    this.emit('stopped', verified)
    return verified
  }
  get identity() {
    return {
      runId: this.options.runId,
      sessionId: this.sessionId,
      role: this.options.role,
      creation: this.process?.creationIdentity ?? null
    }
  }
  hasVerifiedCleanup(): boolean {
    return this.cleanupVerified === true
  }
}
