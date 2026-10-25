import { randomBytes, createHash } from 'node:crypto'
import { assertJsonValue, validUnicode } from './common'
import {
  WireMessage,
  responseResults,
  type WireAction,
  type WireErrorCode,
  type ProcessRole
} from './wire-schema'

export const WIRE_LIMITS = Object.freeze({
  recordBytes: 262144,
  partialMs: 15000,
  readyMs: 30000,
  brokerMs: 30000,
  discussionMs: 300000,
  inFlight: 16,
  queueRecords: 256,
  queueBytes: 8388608,
  saturationMs: 30000,
  historyIds: 65536
})
export class ProtocolError extends Error {
  constructor(readonly code: WireErrorCode) {
    super(code)
    this.name = 'ProtocolError'
  }
}
const fail = (code: WireErrorCode): never => {
  throw new ProtocolError(code)
}
export const newMessageId = () => randomBytes(24).toString('hex')
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']'
  if (value !== null && typeof value === 'object')
    return (
      '{' +
      Object.keys(value)
        .sort()
        .map(
          (key) =>
            JSON.stringify(key) + ':' + canonicalJson((value as Record<string, unknown>)[key])
        )
        .join(',') +
      '}'
    )
  return JSON.stringify(value)
}

export function parseStrictJson(source: string): unknown {
  let i = 0,
    nodes = 0
  const space = () => {
    while (source[i] === ' ' || source[i] === '\t') i++
  }
  const string = (): string => {
    const start = i++
    while (i < source.length) {
      const ch = source[i++]
      if (ch === '\\') {
        i++
        continue
      }
      if (ch === '"') {
        let value: unknown
        try {
          value = JSON.parse(source.slice(start, i))
        } catch {
          return fail('BAD_FRAME')
        }
        if (typeof value !== 'string' || !validUnicode(value)) return fail('BAD_FRAME')
        return value
      }
    }
    return fail('BAD_FRAME')
  }
  const value = (depth: number): unknown => {
    if (++nodes > 20000 || depth > 32) return fail('RESOURCE_LIMIT')
    space()
    const ch = source[i]
    if (ch === '"') return string()
    if (ch === '{') {
      i++
      space()
      const result: Record<string, unknown> = Object.create(null)
      const seen = new Set<string>()
      if (source[i] === '}') {
        i++
        return result
      }
      while (i < source.length) {
        if (source[i] !== '"') return fail('BAD_FRAME')
        const key = string()
        if (seen.has(key)) return fail('BAD_FRAME')
        seen.add(key)
        space()
        if (source[i++] !== ':') return fail('BAD_FRAME')
        result[key] = value(depth + 1)
        space()
        if (source[i] === '}') {
          i++
          return result
        }
        if (source[i++] !== ',') return fail('BAD_FRAME')
        space()
      }
      return fail('BAD_FRAME')
    }
    if (ch === '[') {
      i++
      space()
      const result: unknown[] = []
      if (source[i] === ']') {
        i++
        return result
      }
      while (i < source.length) {
        result.push(value(depth + 1))
        space()
        if (source[i] === ']') {
          i++
          return result
        }
        if (source[i++] !== ',') return fail('BAD_FRAME')
      }
      return fail('BAD_FRAME')
    }
    for (const [token, literal] of [
      ['true', true],
      ['false', false],
      ['null', null]
    ] as const) {
      if (source.startsWith(token, i)) {
        i += token.length
        return literal
      }
    }
    const token = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/.exec(source.slice(i))?.[0]
    if (!token) return fail('BAD_FRAME')
    i += token.length
    // Every v1 numeric wire field is an integer. Preserve lexeme distinction
    // instead of accepting 1.0 / 1e0 as an integer after JSON.parse coercion.
    if (/[.eE]/.test(token) || !Number.isSafeInteger(Number(token))) return fail('BAD_SCHEMA')
    return Number(token)
  }
  const result = value(0)
  space()
  if (i !== source.length) return fail('BAD_FRAME')
  return result
}

export function validateWire(input: unknown): WireMessage {
  try {
    assertJsonValue(input, WIRE_LIMITS.recordBytes)
  } catch {
    return fail('BAD_SCHEMA')
  }
  if (
    input &&
    typeof input === 'object' &&
    'version' in input &&
    input.version !== 1 &&
    typeof input.version === 'number'
  )
    return fail('UNSUPPORTED_VERSION')
  const result = WireMessage.safeParse(input)
  if (!result.success) return fail('BAD_SCHEMA')
  const frame = result.data
  if (frame.type === 'event') {
    const payload = frame.payload as EventBody
    if (
      payload.data.event_id === frame.message_id ||
      ('outcome' in payload.data &&
        (payload.data.outcome as { task_id: string }).task_id !== payload.data.task_id)
    )
      return fail('BAD_SCHEMA')
  }
  return frame
}

export function decodeLine(data: Uint8Array): WireMessage {
  if (data.byteLength > WIRE_LIMITS.recordBytes) return fail('RESOURCE_LIMIT')
  if (
    data.length === 0 ||
    data[data.length - 1] !== 10 ||
    data.subarray(0, -1).includes(10) ||
    data.includes(13)
  )
    return fail('BAD_FRAME')
  let source: string
  try {
    source = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(data.subarray(0, -1))
  } catch {
    return fail('BAD_FRAME')
  }
  if (source.charCodeAt(0) === 0xfeff) return fail('BAD_FRAME')
  return validateWire(parseStrictJson(source))
}
export function serializeWire(input: unknown): Buffer {
  const frame = validateWire(input)
  const data = Buffer.from(JSON.stringify(frame) + '\n', 'utf8')
  if (data.length > WIRE_LIMITS.recordBytes) return fail('RESOURCE_LIMIT')
  return data
}

export class JsonlDecoder {
  private readonly buffer = Buffer.alloc(WIRE_LIMITS.recordBytes)
  private length = 0
  private firstByteAt: number | null = null
  private failed = false
  push(chunk: Uint8Array, now: number): WireMessage[] {
    if (this.failed) return fail('INVALID_STATE')
    try {
      this.tick(now)
      const output: WireMessage[] = []
      for (const byte of chunk) {
        if (this.firstByteAt === null) this.firstByteAt = now
        if (this.length >= this.buffer.length) return fail('RESOURCE_LIMIT')
        this.buffer[this.length++] = byte
        if (byte === 10) {
          if (output.length >= WIRE_LIMITS.queueRecords) return fail('RESOURCE_LIMIT')
          output.push(decodeLine(this.buffer.subarray(0, this.length)))
          this.length = 0
          this.firstByteAt = null
        }
      }
      return output
    } catch (error) {
      this.failed = true
      this.length = 0
      throw error
    }
  }
  tick(now: number): void {
    if (this.firstByteAt !== null && now - this.firstByteAt >= WIRE_LIMITS.partialMs) {
      this.failed = true
      this.length = 0
      fail('BAD_FRAME')
    }
  }
  end(): void {
    if (this.length) {
      this.failed = true
      this.length = 0
      fail('BAD_FRAME')
    }
  }
  get bufferedBytes(): number {
    return this.length
  }
}

export class BoundedFrameQueue {
  private readonly records: Buffer[] = []
  private total = 0
  private saturatedAt: number | null = null
  offer(record: Buffer, now: number): boolean {
    this.tick(now)
    if (record.length > WIRE_LIMITS.recordBytes) return fail('RESOURCE_LIMIT')
    if (
      this.records.length >= WIRE_LIMITS.queueRecords ||
      this.total + record.length > WIRE_LIMITS.queueBytes
    ) {
      this.saturatedAt ??= now
      return false
    }
    this.records.push(Buffer.from(record))
    this.total += record.length
    if (this.records.length >= WIRE_LIMITS.queueRecords || this.total >= WIRE_LIMITS.queueBytes)
      this.saturatedAt ??= now
    return true
  }
  take(): Buffer | undefined {
    const value = this.records.shift()
    if (value) this.total -= value.length
    this.saturatedAt = null
    return value
  }
  tick(now: number): void {
    if (this.saturatedAt !== null && now - this.saturatedAt >= WIRE_LIMITS.saturationMs)
      fail('RESOURCE_LIMIT')
  }
  get size(): number {
    return this.records.length
  }
  get byteLength(): number {
    return this.total
  }
}

type Direction = 'main-to-child' | 'child-to-main'
type RequestBody = { action: WireAction; input: Record<string, unknown> }
type EventBody = {
  name: string
  data: { task_id: string; event_id: string; sequence: number; [key: string]: unknown }
}
interface Pending {
  action: WireAction
  direction: Direction
  input: Record<string, unknown>
  accepted: boolean
  terminalObserved: boolean
  issuedAt: number
}
export interface ConnectionOptions {
  role: ProcessRole
  openedAt: number
  task?: { taskId: string; conversationId: string; workspaceRoot: string }
  // Trusted Main admission/broker checks, never supplied on the wire. Both deny
  // by default; P2 has no real ledger, process supervisor or file broker.
  authorizeExecute?: (input: Record<string, unknown>) => boolean
  authorizeBroker?: (input: Record<string, unknown>) => boolean
}
export class ProtocolConnection {
  private readonly seen = new Set<string>()
  private readonly pending = new Map<string, Pending>()
  private readonly events = new Map<number, { id: string; digest: string }>()
  private readonly eventIds = new Map<string, number>()
  private ready = false
  private closed = false
  private issuedExecute = false
  private started = false
  private terminal = false
  private incomplete = false
  private conflict = false
  private terminalSequence: number | null = null
  constructor(private readonly options: ConnectionOptions) {}
  observe(
    direction: Direction,
    input: unknown,
    now: number
  ): { duplicateEvent: boolean; historyIncomplete: boolean } {
    try {
      return this.accept(direction, validateWire(input), now)
    } catch (error) {
      this.closed = true
      this.ready = false
      this.pending.clear()
      if (this.issuedExecute && !this.terminal) this.incomplete = true
      throw error instanceof ProtocolError ? error : new ProtocolError('INTERNAL_FAILURE')
    }
  }
  private accept(direction: Direction, frame: WireMessage, now: number) {
    if (this.closed) return fail('INVALID_STATE')
    this.tick(now)
    if (this.seen.has(frame.message_id)) return fail('DUPLICATE_MESSAGE_ID')
    if (this.seen.size >= WIRE_LIMITS.historyIds) return fail('RESOURCE_LIMIT')
    this.seen.add(frame.message_id)
    if (frame.type === 'ready') {
      if (
        this.ready ||
        direction !== 'child-to-main' ||
        frame.payload.process_role !== this.options.role
      )
        return fail('INVALID_STATE')
      this.ready = true
    } else if (!this.ready) {
      if (frame.type !== 'error' || frame.correlation_id !== null) return fail('INVALID_STATE')
      this.closed = true
    } else if (frame.type === 'request') {
      const p = frame.payload as RequestBody
      const broker = p.action === 'project.read' || p.action === 'project.discover'
      if (this.options.role === 'discussion') {
        if (
          (broker && direction !== 'child-to-main') ||
          (!broker && (p.action !== 'discussion.send' || direction !== 'main-to-child'))
        )
          return fail('NOT_AUTHORIZED')
        if (broker) {
          const parent = this.pending.get(p.input.discussion_request_id as string)
          if (
            !parent ||
            parent.action !== 'discussion.send' ||
            parent.direction !== 'main-to-child' ||
            !this.options.authorizeBroker?.(p.input)
          )
            return fail('NOT_AUTHORIZED')
        }
        if (this.pending.size >= WIRE_LIMITS.inFlight) return fail('RESOURCE_LIMIT')
      } else {
        if (
          direction !== 'main-to-child' ||
          (p.action !== 'task.execute' && p.action !== 'task.cancel')
        )
          return fail('NOT_AUTHORIZED')
        const task = this.options.task
        if (!task || p.input.task_id !== task.taskId) return fail('WORKSPACE_MISMATCH')
        if (p.action === 'task.execute') {
          if (
            this.issuedExecute ||
            p.input.conversation_id !== task.conversationId ||
            p.input.workspace_root !== task.workspaceRoot ||
            !this.options.authorizeExecute?.(p.input)
          )
            return fail('NOT_AUTHORIZED')
          this.issuedExecute = true
        } else if (
          !this.issuedExecute ||
          this.terminal ||
          [...this.pending.values()].some((v) => v.action === 'task.cancel')
        )
          return fail('INVALID_STATE')
      }
      this.pending.set(frame.message_id, {
        action: p.action,
        direction,
        input: p.input,
        accepted: false,
        terminalObserved: false,
        issuedAt: now
      })
    } else if (frame.type === 'response' || frame.type === 'error') {
      if (frame.correlation_id === null) {
        this.closed = true
        this.ready = false
        this.incomplete ||= this.issuedExecute && !this.terminal
      } else {
        const request = this.pending.get(frame.correlation_id)
        if (!request || request.direction === direction || request.terminalObserved)
          return fail('INVALID_CORRELATION')
        if (frame.type === 'error') {
          if (request.action === 'task.execute' && frame.payload.retryable)
            return fail('BAD_SCHEMA')
          this.pending.delete(frame.correlation_id)
          this.incomplete ||= request.action === 'task.execute'
        } else if (frame.payload.status === 'accepted') {
          if (request.action !== 'task.execute' || request.accepted) return fail('INVALID_STATE')
          request.accepted = true
        } else if (frame.payload.status === 'completed') {
          if (request.action === 'task.execute') return fail('INVALID_STATE')
          const result = responseResults[request.action].safeParse(frame.payload.result)
          if (!result.success) return fail('BAD_SCHEMA')
          if (request.action === 'project.read') {
            const output = result.data as {
              path: string
              start_line: number
              end_line: number
              content: string
              truncated: boolean
              excerpt_sha256: string
            }
            if (
              output.path !== request.input.path ||
              output.start_line !== request.input.start_line ||
              output.end_line > (request.input.end_line as number) ||
              [...output.content].length > (request.input.max_chars as number) ||
              (output.end_line < (request.input.end_line as number) && !output.truncated) ||
              createHash('sha256').update(output.content, 'utf8').digest('hex') !==
                output.excerpt_sha256
            )
              return fail('BAD_SCHEMA')
          }
          if (
            request.action === 'project.discover' &&
            (result.data as { directory: string }).directory !== request.input.directory
          )
            return fail('BAD_SCHEMA')
          this.pending.delete(frame.correlation_id)
        } else {
          if (request.accepted) return fail('INVALID_STATE')
          this.pending.delete(frame.correlation_id)
        }
      }
    } else if (frame.type === 'event') {
      const p = frame.payload as EventBody
      if (
        this.options.role !== 'coding_task' ||
        direction !== 'child-to-main' ||
        !this.options.task ||
        p.data.task_id !== this.options.task.taskId
      )
        return fail('NOT_AUTHORIZED')
      const request = [...this.pending.values()].find((v) => v.action === 'task.execute')
      if (!request?.accepted) return fail('INVALID_STATE')
      const digest = createHash('sha256').update(canonicalJson(p)).digest('hex')
      const previous = this.events.get(p.data.sequence)
      if (previous || this.eventIds.has(p.data.event_id)) {
        if (previous?.id === p.data.event_id && previous.digest === digest)
          return { duplicateEvent: true, historyIncomplete: this.incomplete }
        this.conflict = true
        return fail('INVALID_STATE')
      }
      // A genuinely earlier emitted row may fill a durable hole after receipt
      // of a terminal. New post-terminal lifecycle facts remain forbidden.
      if (
        this.terminal &&
        (p.data.sequence > this.terminalSequence! ||
          ['task.completed', 'task.failed', 'task.cancelled'].includes(p.name))
      )
        return fail('INVALID_STATE')
      if (p.name === 'task.started') {
        if (this.started || p.data.sequence !== 1) return fail('INVALID_STATE')
        this.started = true
      } else if (!this.started && p.data.sequence === 1) return fail('INVALID_STATE')
      if (p.data.sequence !== this.events.size + 1) this.incomplete = true
      this.events.set(p.data.sequence, { id: p.data.event_id, digest })
      this.eventIds.set(p.data.event_id, p.data.sequence)
      if (['task.completed', 'task.failed', 'task.cancelled'].includes(p.name)) {
        this.terminal = true
        this.terminalSequence = p.data.sequence
        request.terminalObserved = true
        // Retain a bounded transport receipt. No DB commit, terminal task state,
        // writer release or cancellation cleanup is claimed by this class.
      }
    }
    return { duplicateEvent: false, historyIncomplete: this.incomplete }
  }
  tick(now: number): void {
    if (!this.ready && !this.closed && now - this.options.openedAt >= WIRE_LIMITS.readyMs) {
      this.closed = true
      fail('STARTUP_FAILED')
    }
    for (const request of this.pending.values()) {
      const broker = request.action === 'project.read' || request.action === 'project.discover'
      const limit = broker
        ? WIRE_LIMITS.brokerMs
        : request.action === 'discussion.send'
          ? WIRE_LIMITS.discussionMs
          : null
      if (limit !== null && now - request.issuedAt >= limit) {
        this.close()
        fail(broker ? 'BROKER_IO_ERROR' : 'PROVIDER_TIMEOUT')
      }
    }
  }
  close(): void {
    this.closed = true
    this.ready = false
    this.pending.clear()
    this.incomplete ||= this.issuedExecute && !this.terminal
  }
  get state() {
    return {
      ready: this.ready && !this.closed,
      closed: this.closed,
      pending: this.pending.size,
      historyIncomplete: this.incomplete,
      integrityConflict: this.conflict,
      terminalObserved: this.terminal
    }
  }
}

export function acceptProtocolStream(
  stream: 'stdout' | 'stderr',
  decoder: JsonlDecoder,
  chunk: Uint8Array,
  now: number
): WireMessage[] {
  // Diagnostic storage/redaction belongs to P4. Stderr is never fed to a wire
  // parser, event ingestion, READY gate or subscription publisher in P2.
  return stream === 'stdout' ? decoder.push(chunk, now) : []
}
