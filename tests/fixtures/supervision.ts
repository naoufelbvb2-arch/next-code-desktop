import { resolve, join } from 'node:path'
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, existsSync } from 'node:fs'
import { SupervisedChild, type ChildOptions } from '../../electron/main/supervisor/child'
import { PythonSupervisor, type SupervisorOptions } from '../../electron/main/supervisor/supervisor'
import {
  resolveRuntime,
  digestFile,
  baselineEnvironment,
  type VerifiedRuntime
} from '../../electron/main/supervisor/runtime'
import { WindowsProcess } from '../../electron/main/supervisor/windows-process'
import { taskFixture, proof, inspect } from './storage'
import { fixturePolicy, sendInput } from './storage'
import { DurableStore } from '../../electron/main/storage/store'
import koffi from 'koffi'

// Selected explicitly by the test runner; never a production PATH fallback.
const pythonPath = 'C:/Python314/python.exe'
export function configFixture() {
  mkdirSync('.test-profiles', { recursive: true })
  const directory = mkdtempSync(resolve('.test-profiles', 'p4-'))
  const config = join(directory, 'python-runtime.json')
  writeFileSync(config, JSON.stringify({ pythonPath, pythonSha256: digestFile(pythonPath) }))
  return { directory, config }
}
export async function runtimeFixture() {
  const { config } = configFixture()
  return resolveRuntime(config, resolve('bridge'))
}
export function fixtureLaunch(mode = 'normal', role = 'discussion') {
  return {
    executable: pythonPath,
    cwd: resolve('tests/fixtures'),
    env: baselineEnvironment(),
    args: [
      '-I',
      '-S',
      '-u',
      resolve('tests/fixtures/supervisor_peer.py'),
      '--role',
      role,
      '--mode',
      mode
    ]
  }
}
export function childFixture(mode = 'normal', options: Partial<ChildOptions> = {}) {
  return new SupervisedChild({
    runId: 'fixture_run',
    role: 'discussion',
    launch: fixtureLaunch(mode, options.role),
    ...options
  }).start()
}
export const discussionInput = (conversation = 'conversation_fixture') => ({
  conversation_id: conversation,
  user_message_id: 'user_fixture',
  text: 'Synthetic text only',
  model_id: 'model_fixture',
  context_snapshot: { recent_messages: [], summaries: [], decisions: [], context_revision: 0 },
  project_ref: null
})
export const executeInput = (taskId = 'task_fixture') => ({
  task_id: taskId,
  conversation_id: 'conversation_fixture',
  task_goal: 'Synthetic non-engine test',
  workspace_root: 'C:/synthetic/workspace',
  conversation_context: null
})
export const taskBinding = {
  taskId: 'task_fixture',
  conversationId: 'conversation_fixture',
  workspaceRoot: 'C:/synthetic/workspace'
}
export async function waitFor(check: () => boolean, milliseconds = 5000) {
  const deadline = performance.now() + milliseconds
  while (!check()) {
    if (performance.now() > deadline) throw new Error('Fixture observation timed out')
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}
export async function coordinatorFixture(mode = 'load', extra: Partial<SupervisorOptions> = {}) {
  const f = taskFixture(),
    runtime = await runtimeFixture()
  const supervisor = new PythonSupervisor({
    runtime,
    store: f.store,
    codingLaunch: () => fixtureLaunch(mode, 'coding_task'),
    proof: (kind, binding) => (kind === 'event' ? { ...proof, ...binding } : proof),
    ...extra
  })
  return { ...f, supervisor }
}
export { SupervisedChild, PythonSupervisor, WindowsProcess, inspect, proof, readFileSync }
export type { VerifiedRuntime }

// Loaded by Playwright only into an isolated Electron Main. No production
// import, IPC endpoint, global Renderer hook, or simulator selection exists.
let electronChild: SupervisedChild | undefined
let electronCoordinator: PythonSupervisor | undefined
let electronStore: DurableStore | undefined
export async function startElectronDiscussion() {
  const runtime = await runtimeFixture()
  electronChild = new SupervisedChild({
    runId: 'electron_fixture',
    role: 'discussion',
    launch: { ...fixtureLaunch(), args: ['-I', '-S', '-u', runtime.bridge, '--role', 'discussion'] }
  }).start()
  await electronChild.ready
  return electronSnapshot()
}
export function electronSnapshot() {
  return electronChild
    ? {
        state: electronChild.state,
        session: electronChild.sessionId,
        pid: electronChild.process!.pid,
        creation: electronChild.process!.creationIdentity
      }
    : null
}
export async function electronDiscussionRequest() {
  return electronChild!.request('discussion.send', discussionInput())
}
export async function stopElectronFixture() {
  const verified = (await electronChild?.stop()) ?? true
  await electronCoordinator?.stopAllOnAppQuit()
  electronStore?.close()
  return verified
}
export async function startElectronTree(profileDirectory: string) {
  const store = (electronStore = new DurableStore(join(profileDirectory, 'desktop-state.sqlite3'), {
    policy: fixturePolicy
  }))
  const projectId = store.registerProject(
    {
      workspaceKey: 'workspace_fixture',
      canonicalRoot: 'C:/synthetic/workspace',
      displayName: 'Synthetic P4 test project'
    },
    proof
  )
  const scope = { projectId, workspaceKey: 'workspace_fixture' },
    message = store.sendMessage(scope, sendInput())
  const proposalId = store.createProposal(
    scope,
    message.conversationId,
    'Synthetic P4 tree only',
    proof
  )
  const admitted = store.admit(scope, { proposalId, clientMutationId: 'electron_tree' }, proof)
  const marker = join(profileDirectory, 'owned-descendant.json')
  const supervisor = (electronCoordinator = new PythonSupervisor({
    runtime: await runtimeFixture(),
    store,
    codingLaunch: () => ({
      ...fixtureLaunch('tree', 'coding_task'),
      env: { ...baselineEnvironment(), P4_FIXTURE_CHILD_FILE: marker }
    }),
    proof: (kind, binding) => (kind === 'event' ? { ...proof, ...binding } : proof)
  }))
  const child = (electronChild = await supervisor.admitCodingTask(scope, admitted.taskId))
  await waitFor(() => {
    try {
      return existsSync(marker) && !!JSON.parse(readFileSync(marker, 'utf8')).grandchild
    } catch {
      return false
    }
  })
  const { pid: descendant, grandchild } = JSON.parse(readFileSync(marker, 'utf8')) as {
    pid: number
    grandchild: number
  }
  return {
    taskId: admitted.taskId,
    descendant,
    grandchild,
    primary: child.process!.pid,
    active: child.process!.activeProcesses()
  }
}
export function mainProcessIdentity() {
  const lib = koffi.load('kernel32.dll'),
    current = lib.func('void * GetCurrentProcess()')
  const times = lib.func(
    'int32 GetProcessTimes(void *,_Out_ void *,_Out_ void *,_Out_ void *,_Out_ void *)'
  )
  const created = Buffer.alloc(8)
  if (!times(current(), created, Buffer.alloc(8), Buffer.alloc(8), Buffer.alloc(8)))
    throw new Error('Fixture Main identity unavailable')
  return { pid: process.pid, creation: created.readBigUInt64LE().toString() }
}
