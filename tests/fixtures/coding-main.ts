import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { SupervisedChild } from '../../electron/main/supervisor/child'
import { baselineEnvironment } from '../../electron/main/supervisor/runtime'
import { DiscussionService } from '../../electron/main/discussion/service'
import { BrokerPool } from '../../electron/main/broker/pool'
import { pathToFileURL } from 'node:url'
import { IpcBoundary, type Caller } from '../../electron/main/ipc-boundary'
import { IPC, PUSH, type Method, type PushKind } from '../../contracts/ipc'
import { BrowserWindow, ipcMain } from 'electron'
import { isAllowedDocument } from '../../electron/main/window-security'
import { DatabaseSync } from 'node:sqlite'
import { codingEngineFixture } from './coding-engine'
import { mainProcessIdentity } from './supervision'
import koffi from 'koffi'

let child: SupervisedChild, directory: string, service: DiscussionService
let actual: Awaited<ReturnType<typeof codingEngineFixture>> | undefined
let r01CrashAfterCommit = false
export async function startCodingFixture(profile: string) {
  directory = profile
  const workspace = join(profile, 'Synthetic P7 project')
  mkdirSync(workspace)
  writeFileSync(join(workspace, 'note.txt'), 'Unchanged synthetic note\n')
  child = new SupervisedChild({
    runId: 'p7_fixture',
    role: 'discussion',
    launch: {
      executable: 'C:/Python314/python.exe',
      cwd: resolve('bridge'),
      env: {
        ...baselineEnvironment(),
        DEEPSEEK_API_KEY: 'offline-p7-fixture-credential',
        NCD_DISCUSSION_CONFIG: JSON.stringify({
          engineRoot: resolve('../next code'),
          sitePackages: resolve('.venv/Lib/site-packages'),
          budgetFile: 'unused_mock_budget'
        })
      },
      args: [
        '-I',
        '-S',
        '-u',
        resolve('tests/fixtures/discussion_proposal_peer.py'),
        '--role',
        'discussion'
      ]
    }
  }).start()
  await child.ready
  service = new DiscussionService({
    path: join(profile, 'p7-fixture.sqlite3'),
    enabled: true,
    brokerDirectory: profile,
    brokerPool: new BrokerPool(pathToFileURL(resolve('out/main/broker-worker.js'))),
    available: () => child.connection.state.ready,
    ensure: async () => child,
    choose: async () => workspace,
    notify: (kind, id, update) => {
      boundary.publish(kind, id, update)
    }
  })
  boundary = installBoundary(service)
  const chosen = await service.dispatch('projects.choose', null)
  if (!chosen.ok) throw new Error('Native fixture registration failed')
  return { ready: child.connection.state.ready, role: child.identity.role }
}
let boundary: IpcBoundary
function installBoundary(service: DiscussionService) {
  // Fixture-owned routing for this disposable test window only; all messages
  // still pass the production closed IpcBoundary and typed Preload. No test
  // installer or provider transport is imported by the product launcher.
  const window = BrowserWindow.getAllWindows()[0],
    entry = window.webContents.getURL()
  const boundary = new IpcBoundary(
    (event) =>
      event.sender === window.webContents &&
      event.senderFrame === window.webContents.mainFrame &&
      isAllowedDocument(window.webContents.getURL(), entry),
    (_event, kind, id) =>
      (kind === 'runtime' && id === null) ||
      (kind === 'conversation' && !!id && service.authorizedConversation(id)) ||
      (kind === 'task' && !!id && service.coding.authorized(id)),
    async (method, input, event) => {
      const result = await service.dispatch(method, input, event.sender.id)
      return result
    }
  )
  for (const method of Object.keys(IPC) as Method[]) {
    ipcMain.removeHandler(IPC[method].channel)
    ipcMain.handle(IPC[method].channel, (event, ...args: unknown[]) =>
      boundary.invoke(IPC[method].channel, event as Caller, args)
    )
  }
  for (const kind of Object.keys(PUSH) as PushKind[])
    ipcMain.on(PUSH[kind].channel, (event, ...args: unknown[]) =>
      boundary.control(kind, event as Caller, args)
    )
  return boundary
}
export async function startActualCodingFixture(mode = 'success') {
  actual = await codingEngineFixture(mode, undefined, (kind, id, update) => {
    const hint = update as { type?: string; sequence?: number }
    if (r01CrashAfterCommit && kind === 'task' && hint.type === 'TaskEventCommitted') {
      const db = new DatabaseSync(join(actual!.directory, 'state.sqlite3'), { readOnly: true })
      try {
        const row = db
          .prepare('SELECT sequence,name FROM task_events WHERE task_id=? AND sequence=?')
          .get(id, hint.sequence!)
        if (!row) throw new Error('No committed row; cannot claim post-COMMIT crash')
        writeFileSync(
          join(actual!.directory, 'r01-post-commit-pre-push.json'),
          JSON.stringify({
            sequence: row.sequence,
            name: row.name,
            independentReader: true,
            ipcPublicationAttempted: false
          })
        )
      } finally {
        db.close()
      }
      const k = koffi.load('kernel32.dll')
      const current = k.func('void * __stdcall GetCurrentProcess()')
      const terminate = k.func('int32 __stdcall TerminateProcess(void *process,uint32 code)')
      terminate(current(), 87)
      throw new Error('Post-COMMIT injection must not publish')
    }
    boundary?.publish(kind, id, update)
  })
  boundary = installBoundary(actual.service)
  return { engineCommit: actual.runtime.engineCommit, outsideProductionRepos: true }
}
export function armR01PostCommitCrash() {
  r01CrashAfterCommit = true
}
export function actualR01ProcessIds() {
  return actual!.processIds()
}
export function actualR01LoopPorts() {
  if (!actual) throw new Error('No actual fixture')
  const path = join(actual.directory, 'r01-loop-audit.json')
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null
}
export function actualBeforeStartEvidence() {
  if (!actual) throw new Error('No actual fixture')
  if (!existsSync(join(actual.workspace, 'before-start.txt'))) return { ready: false }
  const marker = readFileSync(join(actual.workspace, 'before-start.txt'), 'utf8')
  const child = (actual.supervisor as unknown as { coding: { child: SupervisedChild } }).coding
    .child
  return {
    ready: marker.length > 0,
    main: mainProcessIdentity(),
    child: child.process!.pid,
    directory: actual.directory,
    workspace: actual.workspace
  }
}
export function actualAliasEvidence() {
  if (!actual) throw new Error('No actual fixture')
  return {
    projects: actual.service.store.projects().length,
    canonicalRootMatches:
      actual.service.store
        .projectBinding(actual.service.store.projects()[0].projectId)
        .root.toLowerCase() === actual.workspace.toLowerCase()
  }
}
export function actualCodingSnapshot() {
  if (!actual) return null
  return {
    tasks: actual.db.prepare('SELECT task_id,state FROM tasks ORDER BY admission_order').all(),
    events: actual.db.prepare('SELECT name FROM task_events ORDER BY sequence').all(),
    leases: actual.db.prepare('SELECT count(*) n FROM workspace_writer_leases').get()!.n,
    source: actual.source(),
    status: actual.status()
  }
}
export function actualR01Metrics() {
  if (!actual) throw new Error('No actual fixture')
  const child = (actual.supervisor as unknown as { coding?: { child: SupervisedChild } }).coding
    ?.child
  return {
    cleanupState:
      actual.db
        .prepare('SELECT cleanup_state FROM tasks ORDER BY admission_order DESC LIMIT 1')
        .get()?.cleanup_state ?? null,
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    eventCount: Number(actual.db.prepare('SELECT count(*) n FROM task_events').get()!.n),
    maxSequence: Number(
      actual.db.prepare('SELECT coalesce(max(sequence),0) n FROM task_events').get()!.n
    ),
    workersStarted: Number(
      actual.db.prepare("SELECT count(*) n FROM task_events WHERE name='worker.started'").get()!.n
    ),
    workersCompleted: Number(
      actual.db.prepare("SELECT count(*) n FROM task_events WHERE name='worker.completed'").get()!.n
    ),
    incomingRecords: child?.incoming.size ?? 0,
    incomingBytes: child?.incoming.byteLength ?? 0,
    outgoingRecords: child?.outgoing.size ?? 0,
    outgoingBytes: child?.outgoing.byteLength ?? 0,
    partialFrameBytes: child?.decoder.bufferedBytes ?? 0,
    activeProcesses: child?.process?.activeProcesses() ?? null,
    cleanupVerified: child?.hasVerifiedCleanup() ?? null,
    state: actual.status().state
  }
}
export function actualR01ProcessProof() {
  const child = (actual?.supervisor as unknown as { coding?: { child: SupervisedChild } }).coding
    ?.child
  if (!child?.process) throw new Error('No current actual Coding process')
  return { pid: child.process.pid, creation: child.process.creationIdentity }
}
export async function stopActualCodingFixture() {
  await actual?.close()
}
export function actualCodingDatabasePath() {
  return actual ? join(actual.directory, 'state.sqlite3') : null
}
export function actualDockSnapshot() {
  if (!actual) throw new Error('No actual fixture')
  return (
    actual.db
      .prepare('SELECT visible,primary_tab,explicitly_hidden FROM conversation_dock_state LIMIT 1')
      .get() ?? null
  )
}
export function actualCrashEvidence() {
  if (!actual) throw new Error('No actual fixture')
  let descendants: number[] = []
  try {
    const record = readFileSync(join(actual.workspace, 'owned.json'), 'utf8')
    if (record) descendants = JSON.parse(record) as number[]
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  return {
    directory: actual.directory,
    workspace: actual.workspace,
    main: mainProcessIdentity(),
    descendants
  }
}
export async function recoverActualCodingFixture(existing: {
  directory: string
  workspace: string
}) {
  actual = await codingEngineFixture(
    'success',
    undefined,
    (kind, id, update) => boundary?.publish(kind, id, update),
    existing
  )
  boundary = installBoundary(actual.service)
  return actualCodingSnapshot()
}
export function codingSnapshot() {
  const db = new DatabaseSync(join(directory, 'p7-fixture.sqlite3'), { readOnly: true })
  try {
    return {
      tasks: db.prepare('SELECT count(*) n FROM tasks').get()!.n,
      events: db.prepare('SELECT count(*) n FROM task_events').get()!.n,
      leases: db.prepare('SELECT count(*) n FROM workspace_writer_leases').get()!.n,
      slot: db.prepare('SELECT task_id FROM active_coding_slot').get()!.task_id,
      proposals: db.prepare('SELECT state FROM task_proposals').all(),
      attempts: db.prepare('SELECT status FROM discussion_attempts').all()
    }
  } finally {
    db.close()
  }
}
export async function stopCodingFixture() {
  await child.stop()
  service?.close()
}
