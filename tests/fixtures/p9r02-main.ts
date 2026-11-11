// Test-only adapters. No product entry imports this module or its injection hook.
import { app, dialog, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { writeFileSync } from 'node:fs'
import { Worker } from 'node:worker_threads'
import koffi from 'koffi'
import * as coding from './coding-main'
import { DurableStore } from '../../electron/main/storage/store'
import { fixturePolicy, proof, inspect, sendInput } from './storage'
import { IpcBoundary, type Caller } from '../../electron/main/ipc-boundary'
import { IPC, PUSH, type Method, type PushKind } from '../../contracts/ipc'
import { isAllowedDocument } from '../../electron/main/window-security'

export {
  startActualCodingFixture,
  recoverActualCodingFixture,
  actualCodingSnapshot,
  actualCrashEvidence,
  actualR01Metrics,
  stopActualCodingFixture
} from './coding-main'

// R03 manual QA attachment deliberately leaves native dialogs untouched.
// Only the isolated test-built Main exposes this hook; never imported in production.
export function attachSessionQa() {
  const actual = coding.r02ActualFixture()
  const attach = (globalThis as any).__r02AttachSupervisor
  if (typeof attach !== 'function') throw new Error('No isolated Main injection hook')
  actual.supervisor.discussion = actual.discussion
  attach(actual.supervisor)
  return { originalBeforeQuitHandlers: app.listenerCount('before-quit'), nativeDialogs: true }
}

export function attachQuit(choice: number) {
  const actual = coding.r02ActualFixture()
  // The test-built original application module exports only into this disposable
  // Main global. Its production hasActiveCodingTask/closeSupervisor/before-quit
  // implementations are unchanged, with an actual owned fixture supervisor.
  const attach = (globalThis as any).__r02AttachSupervisor
  if (typeof attach !== 'function') throw new Error('No isolated Main injection hook')
  actual.supervisor.discussion = actual.discussion
  attach(actual.supervisor)
  const log: unknown[] = []
  dialog.showMessageBoxSync = ((options: Electron.MessageBoxSyncOptions) => {
    log.push({
      title: options.title,
      buttons: options.buttons,
      defaultId: options.defaultId,
      choice
    })
    writeFileSync(join(actual.directory, 'r02-dialog.json'), JSON.stringify(log))
    return options.title === 'Active coding task' ? choice : 0
  }) as typeof dialog.showMessageBoxSync
  return { originalBeforeQuitHandlers: app.listenerCount('before-quit') }
}
export function quit(closeWindow = false) {
  setImmediate(() => (closeWindow ? BrowserWindow.getAllWindows()[0].close() : app.quit()))
}
export function ownedHandles() {
  const a = coding.r02ActualFixture()
  const child = (a.supervisor as any).coding.child
  return {
    main: process.pid,
    coding: child.process.pid,
    creation: child.process.creationIdentity,
    job: koffi.address(child.process.jobHandle).toString()
  }
}

let history: DurableStore | undefined
let historyTask = ''
let historyWorker: Worker | undefined
let boundary: IpcBoundary | undefined
let progress = { committed: 0, batches: 0, elapsedMs: 0, complete: false, failure: '' }
const reads: { afterSequence: number; limit: number; rows: number }[] = []
export function startHistory(workerPath: string) {
  const a = coding.r02ActualFixture(),
    path = join(a.directory, 'r02-SYNTHETIC-history.sqlite3')
  history = new DurableStore(path, { policy: fixturePolicy })
  const db = inspect(history),
    project = a.db.prepare('SELECT * FROM projects LIMIT 1').get()!
  db.prepare('INSERT INTO projects VALUES(?,?,?,?,?,?)').run(...Object.values(project))
  const message = history.sendMessage(a.scope, sendInput('r02_history_message'))
  const proposalId = history.createProposal(
    a.scope,
    message.conversationId,
    'R02 SYNTHETIC HISTORY - NOT ENGINE EVIDENCE',
    proof
  )
  historyTask = history.admit(
    a.scope,
    { proposalId, clientMutationId: 'r02_history_admit' },
    proof
  ).taskId
  db.prepare("UPDATE tasks SET state='running' WHERE task_id=?").run(historyTask)
  const window = BrowserWindow.getAllWindows()[0],
    entry = window.webContents.getURL()
  boundary = new IpcBoundary(
    (e) =>
      e.sender === window.webContents &&
      e.senderFrame === window.webContents.mainFrame &&
      isAllowedDocument(e.sender.getURL(), entry),
    (_e, kind, id) =>
      (kind === 'runtime' && id === null) ||
      (kind === 'task' && (id === historyTask || (!!id && a.service.coding.authorized(id)))) ||
      (kind === 'conversation' && !!id && a.service.authorizedConversation(id)),
    async (method, input, e) => {
      const v = input as any
      if (method === 'tasks.list') {
        const original = await a.service.dispatch(method, input, e.sender.id)
        if (!original.ok) return original
        const page = original.data as any
        const { taskId, conversationId, projectId, state } = history!.readTask(a.scope, historyTask)
        return {
          ok: true,
          data: { ...page, tasks: [...page.tasks, { taskId, conversationId, projectId, state }] }
        }
      }
      if (v?.taskId === historyTask && method === 'tasks.read')
        return { ok: true, data: history!.readTask(a.scope, historyTask) }
      if (v?.taskId === historyTask && method === 'tasks.readEvents') {
        const page = history!.readEvents(a.scope, v)
        if (reads.length < 2000)
          reads.push({ afterSequence: v.afterSequence, limit: v.limit, rows: page.events.length })
        return { ok: true, data: page }
      }
      return a.service.dispatch(method, input, e.sender.id)
    }
  )
  for (const method of Object.keys(IPC) as Method[]) {
    ipcMain.removeHandler(IPC[method].channel)
    ipcMain.handle(IPC[method].channel, (e, ...args) =>
      boundary!.invoke(IPC[method].channel, e as Caller, args)
    )
  }
  for (const kind of Object.keys(PUSH) as PushKind[]) {
    ipcMain.removeAllListeners(PUSH[kind].channel)
    ipcMain.on(PUSH[kind].channel, (e, ...args) => boundary!.control(kind, e as Caller, args))
  }
  coding.r02UseBoundary(boundary)
  historyWorker = new Worker(workerPath, {
    workerData: {
      path,
      taskId: historyTask,
      seed: 10000,
      batches: 150,
      batchSize: 200,
      intervalMs: 200
    }
  })
  historyWorker.on('message', (m) => {
    progress = { ...progress, ...m }
    // Hints only after the separate writer's real SQLite COMMIT. This synthetic
    // database never supplies an event to the actual AgentOS task's ledger.
    if (m.from)
      for (let sequence = m.from; sequence <= m.committed; sequence++)
        boundary!.publish('task', historyTask, {
          type: 'TaskEventCommitted',
          taskId: historyTask,
          sequence
        })
  })
  historyWorker.on('error', (e) => {
    progress.failure = e instanceof Error ? e.name : 'UnknownWorkerError'
  })
  return { taskId: historyTask, seed: 10000, configuredNewRows: 30000, synthetic: true }
}
export function historyStatus() {
  const a = coding.r02ActualFixture()
  return {
    ...progress,
    reads,
    subscriberCount: boundary?.subscriberCount,
    rowCount: Number(inspect(history!).prepare('SELECT count(*) n FROM task_events').get()!.n),
    integrity: inspect(history!).prepare('PRAGMA integrity_check').get(),
    actualEvents: a.db.prepare('SELECT name FROM task_events ORDER BY sequence').all()
  }
}
export async function stopHistory() {
  await historyWorker?.terminate()
  history?.close()
}
