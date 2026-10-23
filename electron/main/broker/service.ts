import { createHmac, randomBytes } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { BrokerPool } from './pool'
import { BrokerError, deny, digest, POLICY, selector } from './policy'
import type { WorkResult, Job, Entry } from './work'
import type { DurableStore, Scope } from '../storage/store'
import type { SupervisedChild } from '../supervisor/child'
import type { WireMessage } from '../../../contracts/wire-schema'

export const SOURCE_CLASS = 'project_source_v1'
export const SOURCE_PROVIDER = 'deepseek_official_v1'
export const SOURCE_DESTINATION = 'https://api.deepseek.com/chat/completions'
interface Parent {
  session: string
  wire: string
  conversation: string
  scope: Scope
  root: string
  model: string
  provider: string
  destination: string
  attempt: string
  child: SupervisedChild
  active: boolean
  firstOperation: number | null
  discoverCalls: number
  readCalls: number
  entries: number
  scanned: number
  scanReserved: number
  excerpts: number
  excerptReserved: number
  subjects: Set<string>
  inspection?: string
  readPaths: Map<string, { identity: string; revision: string }>
  pendingPaths: Map<string, number>
}
interface Snapshot {
  entries: Entry[]
  excluded: number
  partial: boolean
  bytes: number
}
interface Page {
  binding: string
  generation: string
  position: number
  expires: number
  snapshot: Snapshot
}
interface Options {
  directory: string
  store: DurableStore
  proof: unknown
  pool?: BrokerPool
  verified: <T>(key: string, operation: () => T) => T
}
export class FileBroker {
  private readonly pool: BrokerPool
  private readonly parents = new Map<string, Parent>()
  private readonly pages = new Map<string, Page>()
  private key: Buffer
  private readonly keyPath: string
  private healthy = true
  constructor(private readonly options: Options) {
    this.pool = options.pool ?? new BrokerPool()
    this.keyPath = join(options.directory, 'broker-hmac.key')
    // This per-installation secret never enters SQL, project paths, Renderer,
    // Python, logs or Git. No historical inspection is resumed across startup.
    if (!existsSync(this.keyPath))
      writeFileSync(this.keyPath, randomBytes(32), { flag: 'wx', mode: 0o600 })
    this.key = readFileSync(this.keyPath)
    if (this.key.length !== 32) deny('NOT_AUTHORIZED')
    options.store.closeHistoricalInspections(options.proof)
  }
  private hmac(value: unknown) {
    return createHmac('sha256', this.key)
      .update(JSON.stringify([POLICY, value]))
      .digest('hex')
  }
  private keyCheck() {
    let current: Buffer | undefined
    try {
      current = readFileSync(this.keyPath)
    } catch {}
    if (!current || current.length !== 32 || !current.equals(this.key)) {
      this.healthy = false
      for (const p of this.parents.values()) this.end(p.wire)
      this.options.store.closeHistoricalInspections(this.options.proof)
      deny('NOT_AUTHORIZED')
    }
    if (!this.healthy) deny('NOT_AUTHORIZED')
  }
  register(root: string) {
    return this.pool.run('registration', { action: 'register', root, path: '.' }, (data) => ({
      root: data.root,
      key: data.key
    }))
  }
  withRoot<T>(
    scope: Scope,
    operation: () => T,
    parent = 'root:' + scope.projectId,
    maxMs = 30000
  ): Promise<T> {
    const binding = this.options.store.projectBinding(scope.projectId)
    if (!this.options.store.workspaceAvailable(scope))
      return Promise.reject(new BrokerError('WORKSPACE_MISMATCH'))
    return this.pool
      .run(
        parent,
        { action: 'register', root: binding.root, workspaceKey: scope.workspaceKey, path: '.' },
        () => this.options.verified(scope.workspaceKey, operation),
        () => {},
        maxMs
      )
      .catch((error) => this.workspaceFailure(scope, error))
  }
  private workspaceFailure(scope: Scope, error: unknown): never {
    if (error instanceof BrokerError && error.code === 'WORKSPACE_MISMATCH') {
      this.options.store.markWorkspaceUnavailable(scope, this.options.proof)
      for (const p of this.parents.values())
        if (p.scope.projectId === scope.projectId) this.end(p.wire)
    }
    throw error
  }
  bind(
    input: Omit<
      Parent,
      | 'active'
      | 'firstOperation'
      | 'discoverCalls'
      | 'readCalls'
      | 'entries'
      | 'scanned'
      | 'scanReserved'
      | 'excerpts'
      | 'excerptReserved'
      | 'subjects'
      | 'readPaths'
      | 'pendingPaths'
    >
  ) {
    this.keyCheck()
    if (
      this.parents.size >= 256 ||
      this.parents.has(input.wire) ||
      input.child.sessionId !== input.session ||
      input.child.identity.role !== 'discussion' ||
      !input.child.connection.state.ready
    )
      deny('NOT_AUTHORIZED')
    this.parents.set(input.wire, {
      ...input,
      active: true,
      firstOperation: null,
      discoverCalls: 0,
      readCalls: 0,
      entries: 0,
      scanned: 0,
      scanReserved: 0,
      excerpts: 0,
      excerptReserved: 0,
      subjects: new Set(),
      readPaths: new Map(),
      pendingPaths: new Map()
    })
  }
  allows(session: string, input: Record<string, unknown>) {
    const p = this.parents.get(input.discussion_request_id as string)
    return (
      !!p &&
      p.active &&
      p.session === session &&
      p.child.connection.state.ready &&
      p.child.identity.role === 'discussion'
    )
  }
  private active(p: Parent) {
    this.keyCheck()
    if (
      !p.active ||
      this.parents.get(p.wire) !== p ||
      !p.child.connection.state.ready ||
      p.child.sessionId !== p.session
    )
      deny('NOT_AUTHORIZED')
    if (
      !this.options.store.activeDiscussionBinding(
        p.scope,
        p.attempt,
        p.conversation,
        p.session,
        p.model,
        p.provider
      )
    )
      deny('NOT_AUTHORIZED')
    if (!p.scope.workspaceKey.startsWith('win32-v1_')) deny('WORKSPACE_MISMATCH')
    if (!this.options.store.workspaceAvailable(p.scope)) deny('WORKSPACE_MISMATCH')
    if (p.firstOperation !== null && performance.now() - p.firstOperation >= 90000)
      deny('RESOURCE_LIMIT')
  }
  frame(child: SupervisedChild, frame: WireMessage) {
    if ((frame.type === 'response' || frame.type === 'error') && frame.correlation_id) {
      this.end(frame.correlation_id)
      return
    }
    if (
      frame.type === 'request' &&
      (frame.payload.action === 'project.discover' || frame.payload.action === 'project.read')
    )
      void this.handle(child, frame).catch(() => {})
  }
  endedSession(session: string) {
    for (const p of this.parents.values()) if (p.session === session) this.end(p.wire)
  }
  end(wire: string) {
    const p = this.parents.get(wire)
    if (!p) return
    p.active = false
    this.pool.abort(wire)
    this.parents.delete(wire)
    for (const [token, page] of this.pages)
      if (page.binding.startsWith(wire + '|')) this.pages.delete(token)
    if (p.inspection)
      try {
        this.options.store.inspectionState(
          p.scope,
          p.inspection,
          'partial',
          'Partial project coverage. Counts prove enumeration and local Discussion handoff only; provider receipt is not observable.',
          this.options.proof
        )
      } catch {}
  }
  private inspection(p: Parent) {
    return (p.inspection ??= this.options.store.createInspection(
      p.scope,
      p.conversation,
      this.options.proof
    ))
  }
  private observation(
    p: Parent,
    kind: 'discovered_file' | 'read_file' | 'excluded_page',
    subject: string | null,
    provenance: unknown,
    count = 1
  ) {
    const changed = this.options.store.observeInspection(
      p.scope,
      this.inspection(p),
      {
        observationKey: this.hmac([p.inspection, kind, subject, provenance]),
        kind,
        subjectKey: subject,
        evidenceDigest: digest(JSON.stringify(provenance)),
        countDelta: count,
        discoveryCountKnown: kind !== 'read_file',
        state: kind === 'read_file' ? 'reading' : 'discovering',
        coverageNote:
          'Partial project coverage. A discovered file is not a content read; a local handoff is not provider receipt.'
      },
      this.options.proof
    )
    if (changed) this.options.store.conversationHint(p.conversation)
  }
  private subject(p: Parent, entry: { path: string; identity: string }) {
    return this.hmac([p.scope.workspaceKey, entry.path.toLowerCase(), entry.identity])
  }
  private page(binding: string, data: WorkResult, limit: number, cursor?: string | null) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) deny('RESOURCE_LIMIT')
    for (const [token, record] of this.pages)
      if (record.expires < performance.now()) this.pages.delete(token)
    let entries = data.entries!,
      snapshot: Snapshot | undefined
    let position = 0
    if (cursor) {
      const page = this.pages.get(cursor)
      if (
        !page ||
        page.binding !== binding ||
        page.expires < performance.now() ||
        page.generation !== data.generation
      )
        deny('STALE_SOURCE')
      position = page.position
      snapshot = page.snapshot
      entries = snapshot.entries
    }
    const selected = entries.slice(position, position + limit),
      nextPosition = position + selected.length
    let next: string | null = null
    if (nextPosition < entries.length) {
      if (this.pages.size >= 256) deny('RESOURCE_LIMIT')
      snapshot ??= [...this.pages.values()].find(
        (page) => page.binding === binding && page.generation === data.generation
      )?.snapshot
      if (!snapshot) {
        const bytes = Buffer.byteLength(JSON.stringify(entries)),
          snapshots = new Set([...this.pages.values()].map((page) => page.snapshot))
        if (
          snapshots.size >= 16 ||
          bytes > 2 * 1024 * 1024 ||
          [...snapshots].reduce((sum, item) => sum + item.bytes, 0) + bytes > 8 * 1024 * 1024
        )
          deny('RESOURCE_LIMIT')
        snapshot = {
          entries: entries.map((entry) => ({ ...entry })),
          excluded: data.excluded ?? 0,
          partial: !!data.partial,
          bytes
        }
      }
      next = randomBytes(24).toString('base64url')
      this.pages.set(next, {
        binding,
        generation: data.generation,
        position: nextPosition,
        expires: performance.now() + 90000,
        snapshot
      })
    }
    return {
      selected,
      next,
      excluded: position === 0 ? (snapshot?.excluded ?? data.excluded ?? 0) : 0,
      complete: next === null && !(snapshot?.partial ?? data.partial)
    }
  }
  async local(
    projectId: string,
    path: string,
    cursor: string | undefined,
    limit: number | undefined,
    range?: { startLine: number; endLine: number },
    sender = 0
  ) {
    const { scope, root } = this.options.store.projectBinding(projectId)
    selector(path, !range)
    if (!scope.workspaceKey.startsWith('win32-v1_')) deny('WORKSPACE_MISMATCH')
    if (!this.options.store.workspaceAvailable(scope)) deny('WORKSPACE_MISMATCH')
    const job: Job = range
      ? {
          action: 'read',
          root,
          workspaceKey: scope.workspaceKey,
          path,
          start: range.startLine,
          end: range.endLine
        }
      : { action: 'discover', root, workspaceKey: scope.workspaceKey, path, depth: 1 }
    return this.pool
      .run('ui:' + sender, job, (data) => {
        if (range)
          return {
            projectId,
            relativePath: path,
            text: data.excerpt!.content,
            truncated: data.excerpt!.truncated,
            sourceRevisionLabel: `sha256:${data.identity!.revision}`
          }
        const page = this.page(
          `ui|${sender}|${projectId}|${scope.workspaceKey}|${path}|${POLICY}`,
          data,
          limit ?? 40,
          cursor
        )
        return {
          projectId,
          relativeDir: path,
          entries: page.selected.map((e) => ({
            relativePath: e.path,
            kind: e.kind,
            sizeBytes: e.size_bytes
          })),
          nextCursor: page.next
        }
      })
      .catch((error) => this.workspaceFailure(scope, error))
  }
  disclosures(projectId: string) {
    return this.options.store.listDisclosures(this.options.store.projectBinding(projectId).scope)
  }
  respond(input: Parameters<DurableStore['respondDisclosure']>[1]) {
    const binding = this.options.store.challengeBinding(input.challengeId)
    return this.withRoot(binding.scope, () =>
      this.options.store.respondDisclosure(
        binding.scope,
        input,
        { providerKey: SOURCE_PROVIDER, disclosureClass: SOURCE_CLASS },
        this.options.proof
      )
    )
  }
  revoke(input: Parameters<DurableStore['revokeDisclosure']>[1]) {
    const binding = this.options.store.consentBinding(input.consentId)
    const result = this.options.store.revokeDisclosure(binding.scope, input, this.options.proof)
    for (const p of this.parents.values())
      if (p.scope.projectId === binding.scope.projectId) this.end(p.wire)
    return result
  }
  private consent(p: Parent, challenge = false) {
    if (
      p.model !== 'deepseek-flash' ||
      p.provider !== SOURCE_PROVIDER ||
      p.destination !== SOURCE_DESTINATION
    )
      deny('NOT_AUTHORIZED')
    if (!this.options.store.hasConsent(p.scope, p.provider, SOURCE_CLASS)) {
      if (challenge) {
        this.options.store.ensureSourceChallenge(
          p.scope,
          p.provider,
          SOURCE_CLASS,
          this.options.proof
        )
        this.options.store.conversationHint(p.conversation)
      }
      deny('NOT_AUTHORIZED')
    }
  }
  private async handle(child: SupervisedChild, frame: Extract<WireMessage, { type: 'request' }>) {
    const operationDeadline = performance.now() + 30000
    let responded = false,
      p: Parent | undefined,
      read = false,
      reserved = false,
      charged = false,
      excerptReserved = false,
      pathReservation: string | undefined,
      excerptCapacity = 0
    try {
      const action = frame.payload.action,
        input = frame.payload.input as Record<string, unknown>
      if (!this.allows(child.sessionId, input)) deny('NOT_AUTHORIZED')
      p = this.parents.get(input.discussion_request_id as string)!
      this.active(p)
      p.firstOperation ??= performance.now()
      read = action === 'project.read'
      const path = read ? (input.path as string) : (input.directory as string)
      selector(path, !read)
      if (read) {
        if (++p.readCalls > 40) deny('RESOURCE_LIMIT')
        if (!this.options.store.hasConsent(p.scope, p.provider, SOURCE_CLASS))
          await this.withRoot(
            p.scope,
            () => {
              this.active(p!)
              this.consent(p!, true)
            },
            p.wire,
            operationDeadline - performance.now()
          )
        this.consent(p)
        const normalized = path.toLowerCase(),
          all = new Set([...p.readPaths.keys(), ...p.pendingPaths.keys()])
        if (!all.has(normalized) && all.size >= 24) deny('RESOURCE_LIMIT')
        p.pendingPaths.set(normalized, (p.pendingPaths.get(normalized) ?? 0) + 1)
        pathReservation = normalized
      } else if (++p.discoverCalls > 30) deny('RESOURCE_LIMIT')
      if (read) {
        excerptCapacity = Math.min(65536, (input.max_chars as number) * 4)
        if (
          p.scanned + p.scanReserved + 8388608 > 67108864 ||
          p.excerpts + p.excerptReserved + excerptCapacity > 262144
        )
          deny('RESOURCE_LIMIT')
        p.scanReserved += 8388608
        p.excerptReserved += excerptCapacity
        reserved = true
        excerptReserved = true
      }
      const job: Job = read
        ? {
            action: 'read',
            root: p.root,
            workspaceKey: p.scope.workspaceKey,
            path,
            start: input.start_line as number,
            end: input.end_line as number,
            maxChars: input.max_chars as number,
            expectedMtime: input.expected_mtime_ns as string | null,
            knownFiles: [...p.readPaths].map(([path, info]) => ({ path, ...info }))
          }
        : {
            action: 'discover',
            root: p.root,
            workspaceKey: p.scope.workspaceKey,
            path,
            depth: input.max_depth as number
          }
      const parent = p
      this.options.store.inspectionState(
        p.scope,
        this.inspection(p),
        read ? 'reading' : 'discovering',
        'Partial coverage; a bounded broker operation is in progress.',
        this.options.proof
      )
      await this.pool.run(
        p.wire,
        job,
        async (data, verify) => {
          this.active(parent)
          let result: unknown, subject: string | undefined
          if (read) {
            subject = this.subject(parent, { path, identity: data.identity!.id })
            if (!parent.subjects.has(subject) && parent.subjects.size >= 24) deny('RESOURCE_LIMIT')
            const bytes = Buffer.byteLength(data.excerpt!.content)
            if (parent.excerpts + bytes > 262144) deny('RESOURCE_LIMIT')
            this.options.store.checkInspectionSubject(
              parent.scope,
              this.inspection(parent),
              subject,
              data.identity!.revision,
              this.options.proof,
              data.identity!.id
            )
            result = data.excerpt
          } else {
            const page = this.page(
              `${parent.wire}|${parent.session}|${parent.conversation}|${parent.scope.workspaceKey}|${path}|${input.max_depth}|${POLICY}`,
              data,
              input.limit as number,
              input.cursor as string | null
            )
            if (parent.entries + page.selected.length > 1000) deny('RESOURCE_LIMIT')
            parent.entries += page.selected.length
            for (const entry of page.selected)
              if (entry.kind === 'file')
                this.observation(parent, 'discovered_file', this.subject(parent, entry), {
                  identity: entry.identity,
                  revision: entry.revision
                })
            for (let offset = 0; offset < page.excluded; offset += 100)
              this.observation(
                parent,
                'excluded_page',
                null,
                { page: this.hmac([data.generation, input.cursor ?? null]), offset },
                Math.min(100, page.excluded - offset)
              )
            result = {
              directory: path,
              entries: page.selected.map(({ path, kind, size_bytes }) => ({
                path,
                kind,
                size_bytes
              })),
              next_cursor: page.next,
              complete: page.complete,
              excluded_count: page.excluded
            }
          }
          responded = true
          const delivered = await child.replyBroker(frame.message_id, result, null, () => {
            if (performance.now() >= operationDeadline) deny('RESOURCE_LIMIT')
            this.active(parent)
            if (read) {
              this.consent(parent)
              this.keyCheck()
            }
            verify()
          })
          if (!delivered) {
            this.options.store.inspectionState(
              parent.scope,
              parent.inspection!,
              'partial',
              'Prepared evidence was denied at the final release check; no successful content handoff is inferred.',
              this.options.proof
            )
            return
          }
          if (read && delivered) {
            parent.excerpts += Buffer.byteLength(data.excerpt!.content)
            if (performance.now() >= operationDeadline) {
              this.options.store.inspectionState(
                parent.scope,
                parent.inspection!,
                'partial',
                'A local handoff may have completed after its deadline; no durable read count is inferred.',
                this.options.proof
              )
              return
            }
            parent.subjects.add(subject!)
            parent.readPaths.set(path.toLowerCase(), {
              identity: data.identity!.id,
              revision: data.identity!.revision
            })
            // Only the successful actual local pipe write precedes this commit.
            try {
              this.observation(parent, 'read_file', subject!, {
                identity: data.identity!.id,
                revision: data.identity!.revision
              })
            } catch (error) {
              this.healthy = false
              this.end(parent.wire)
              throw error
            }
            if (!parent.active)
              this.options.store.inspectionState(
                parent.scope,
                parent.inspection!,
                'partial',
                'Historical partial coverage; a verified local handoff is not proof of provider receipt.',
                this.options.proof
              )
          }
        },
        (bytes) => {
          if (read && !charged) {
            charged = true
            parent.scanned += bytes
            if (reserved) {
              parent.scanReserved -= 8388608
              reserved = false
            }
          }
        },
        Math.min(
          operationDeadline - performance.now(),
          90000 - (performance.now() - p.firstOperation)
        ),
        () => {
          this.active(parent)
          return {
            ...job,
            knownFiles: [...parent.readPaths].map(([path, info]) => ({ path, ...info }))
          }
        }
      )
    } catch (error) {
      if (p && error instanceof BrokerError && error.code === 'WORKSPACE_MISMATCH')
        try {
          this.workspaceFailure(p.scope, error)
        } catch {}
      if (p?.inspection)
        try {
          this.options.store.inspectionState(
            p.scope,
            p.inspection,
            'partial',
            'Partial or denied inspection; no unverified read is counted.',
            this.options.proof
          )
        } catch {}
      if (!responded)
        await child
          .replyBroker(
            frame.message_id,
            null,
            error instanceof BrokerError ? error.code : 'BROKER_IO_ERROR'
          )
          .catch(() => {})
    } finally {
      if (p && read) {
        if (reserved) {
          p.scanReserved -= 8388608
          reserved = false
          if (!charged) {
            p.scanned += 8388608
            charged = true
          }
        }
        if (excerptReserved) p.excerptReserved -= excerptCapacity
        if (pathReservation) {
          const n = p.pendingPaths.get(pathReservation) ?? 1
          if (n <= 1) p.pendingPaths.delete(pathReservation)
          else p.pendingPaths.set(pathReservation, n - 1)
        }
      }
    }
  }
  close() {
    for (const p of this.parents.values()) this.end(p.wire)
    this.pool.close()
    this.key.fill(0)
  }
}
