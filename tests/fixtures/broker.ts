import { mkdirSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { randomBytes } from 'node:crypto'
import { build } from 'esbuild'
import { DiscussionService } from '../../electron/main/discussion/service'
import { BrokerPool } from '../../electron/main/broker/pool'
import type { SupervisedChild } from '../../electron/main/supervisor/child'
import { validateWire } from '../../contracts/jsonl'
import { BrokerError } from '../../electron/main/broker/policy'

let compiled: Promise<URL> | undefined
export function workerFixture() {
  return (compiled ??= (async () => {
    mkdirSync('.cache', { recursive: true })
    const output = resolve('.cache', `p6-worker-${randomBytes(8).toString('hex')}.mjs`)
    await build({
      entryPoints: ['electron/main/broker/worker.ts'],
      bundle: true,
      platform: 'node',
      format: 'esm',
      external: ['koffi'],
      outfile: output
    })
    return pathToFileURL(output)
  })())
}
export async function brokerFixture(
  options: {
    failWrite?: boolean | ((result: unknown) => boolean)
    beforeWrite?: (result: unknown, code: string | null) => Promise<void>
    afterWrite?: () => void
    fault?: (name: string) => void
    reuseDirectory?: string
    databaseName?: string
  } = {}
) {
  mkdirSync('.test-profiles', { recursive: true })
  const directory = options.reuseDirectory ?? mkdtempSync(resolve('.test-profiles', 'p6-broker-')),
    workspace = join(directory, 'Project')
  if (!resolve(directory).startsWith(resolve('.test-profiles') + sep))
    throw new Error('Fixture outside isolated root')
  if (!existsSync(workspace)) {
    mkdirSync(workspace)
    writeFileSync(join(workspace, 'notes.custom'), 'Atlas\nsecond safe line\n')
    writeFileSync(join(workspace, 'settings.json'), '{"theme":"dark"}\n')
    writeFileSync(join(workspace, '.env.local'), 'synthetic sensitive fixture\n')
  }
  const pool = new BrokerPool(await workerFixture())
  let finish!: (value: unknown) => void,
    started!: () => void,
    parentWire = '',
    next = 0
  const begun = new Promise<void>((resolve) => {
    started = resolve
  })
  const waiters = new Map<string, (value: { result: unknown; code: string | null }) => void>()
  const writes: { result: unknown; code: string | null }[] = []
  const peer = {
    sessionId: 'p6_fixture_session',
    identity: { role: 'discussion' },
    connection: { state: { ready: true } },
    request: async (
      _action: string,
      _input: Record<string, unknown>,
      issued: (id: string) => void
    ) => {
      parentWire = 'parent_' + randomBytes(8).toString('hex')
      issued(parentWire)
      started()
      return new Promise((resolve) => {
        finish = resolve
      })
    },
    replyBroker: async (
      id: string,
      result: unknown,
      code: string | null = null,
      before = () => {}
    ) => {
      if (options.beforeWrite) await options.beforeWrite(result, code)
      if (!code)
        try {
          before()
        } catch (error) {
          code = error instanceof BrokerError ? error.code : 'NOT_AUTHORIZED'
          result = null
        }
      if (typeof options.failWrite === 'function' ? options.failWrite(result) : options.failWrite)
        throw new Error('Synthetic pipe failure')
      const reply = { result, code }
      writes.push(reply)
      waiters.get(id)?.(reply)
      waiters.delete(id)
      options.afterWrite?.()
      return !code
    }
  } as unknown as SupervisedChild
  let chosenRoot = workspace
  const service = new DiscussionService({
    path: join(directory, options.databaseName ?? 'state.sqlite3'),
    enabled: true,
    available: () => true,
    ensure: async () => peer,
    choose: async () => chosenRoot,
    brokerDirectory: directory,
    brokerPool: pool,
    database: { fault: options.fault }
  })
  const chosen = await service.dispatch('projects.choose', null)
  if (!chosen.ok) throw new Error('Native fixture registration failed')
  const accepted = await service.dispatch('conversations.sendMessage', {
    draftId: 'fixture',
    text: 'Synthetic source inspection request',
    modelId: 'deepseek-flash',
    clientMutationId: 'start_' + randomBytes(8).toString('hex')
  })
  if (!accepted.ok) throw new Error('Fixture T1 failed')
  await begun
  const conversationId = (accepted.data as { conversationId: string }).conversationId
  const call = (
    action: 'project.discover' | 'project.read',
    input: Record<string, unknown> = {},
    parent = parentWire
  ) => {
    const id = 'broker_' + ++next,
      promise = new Promise<{ result: unknown; code: string | null }>((resolve) => {
        waiters.set(id, resolve)
      })
    const defaults =
      action === 'project.discover'
        ? { directory: '.', max_depth: 1, limit: 100, cursor: null }
        : {
            path: 'notes.custom',
            start_line: 1,
            end_line: 1,
            max_chars: 16384,
            expected_mtime_ns: null
          }
    service.broker!.frame(
      peer,
      validateWire({
        version: 1,
        type: 'request',
        message_id: id,
        correlation_id: null,
        payload: { action, input: { discussion_request_id: parent, ...defaults, ...input } }
      })
    )
    return promise
  }
  const read = async () => {
    const result = await service.dispatch('conversations.read', { conversationId })
    if (!result.ok) throw new Error('Fixture scoped read failed')
    return result.data as import('../../contracts/ipc').Output<'conversations.read'>
  }
  const grant = async () => {
    await call('project.read')
    const challenge = (await read()).disclosureChallenges[0]
    if (!challenge) throw new Error('No actual Main source challenge')
    const result = await service.dispatch('disclosures.respond', {
      challengeId: challenge.challengeId,
      decision: 'approve',
      clientMutationId: 'grant_' + ++next
    })
    if (!result.ok) throw new Error('Fixture T6 failed')
  }
  return {
    service,
    pool,
    directory,
    workspace,
    peer,
    writes,
    call,
    read,
    grant,
    conversationId,
    choose: async (root: string) => {
      chosenRoot = root
      return service.dispatch('projects.choose', null)
    },
    get parentWire() {
      return parentWire
    },
    close: async () => {
      finish({
        version: 1,
        type: 'response',
        message_id: 'final',
        correlation_id: parentWire,
        payload: {
          status: 'completed',
          reason: null,
          result: {
            answer: 'Synthetic fixture final answer',
            task_proposal: null,
            summary_candidates: [],
            decision_candidates: []
          }
        }
      })
      await service.idle()
      service.close()
    }
  }
}
