import { mkdirSync, writeFileSync } from 'node:fs'
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

let child: SupervisedChild, directory: string, service: DiscussionService
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
    (method, input, event) => service.dispatch(method, input, event.sender.id)
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
  const chosen = await service.dispatch('projects.choose', null)
  if (!chosen.ok) throw new Error('Native fixture registration failed')
  return { ready: child.connection.state.ready, role: child.identity.role }
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
