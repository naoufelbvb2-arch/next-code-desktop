import { mkdirSync, mkdtempSync, writeFileSync, readFileSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'
import { execFileSync } from 'node:child_process'
import { DiscussionService } from '../../electron/main/discussion/service'
import { PythonSupervisor } from '../../electron/main/supervisor/supervisor'
import { SupervisedChild } from '../../electron/main/supervisor/child'
import { baselineEnvironment } from '../../electron/main/supervisor/runtime'
import { verifyCodingRuntime } from '../../electron/main/coding/gate'
import { BrokerPool } from '../../electron/main/broker/pool'
import { workerFixture } from './broker'
import { runtimeFixture, waitFor } from './supervision'
import { inspect } from './storage'

export async function codingEngineFixture(
  mode = 'success',
  fault?: (name: string) => void,
  notify?: (kind: 'task' | 'conversation', id: string, update: unknown) => void,
  existing?: { directory: string; workspace: string }
) {
  mkdirSync('.test-profiles', { recursive: true })
  const externalFixtures = resolve('../next-code-p7-fixtures')
  mkdirSync(externalFixtures, { recursive: true })
  const directory = existing?.directory ?? mkdtempSync(resolve('.test-profiles', 'p7-engine-')),
    workspace = existing?.workspace ?? mkdtempSync(join(externalFixtures, 'task-'))
  for (const repo of [resolve('.'), resolve('../next code')])
    if (!relative(repo, workspace).startsWith('..'))
      throw new Error('Task must be outside both production repositories')
  if (!existing) {
    writeFileSync(join(workspace, 'sample.py'), 'def value(): return 1\n')
    writeFileSync(join(workspace, 'check.py'), 'from sample import value\nassert value() == 2\n')
    writeFileSync(join(workspace, 'sleeper.py'), 'import time\ntime.sleep(60)\n')
    writeFileSync(
      join(workspace, 'parent.py'),
      "import subprocess,sys,time,os,json\np=subprocess.Popen([sys.executable,'sleeper.py'])\nopen('owned.json','w').write(json.dumps([os.getpid(),p.pid]))\np.wait()\n"
    )
  }
  const git = (args: string[]) =>
    execFileSync(
      'git',
      ['-c', `safe.directory=${workspace.replaceAll('\\', '/')}`, '-C', workspace, ...args],
      { stdio: 'pipe' }
    )
  if (!existing) {
    git(['init'])
    git(['config', 'user.name', 'Synthetic Test'])
    git(['config', 'user.email', 'synthetic@example.invalid'])
    git(['add', 'sample.py', 'check.py', 'sleeper.py', 'parent.py'])
    git(['commit', '-m', 'Synthetic task baseline'])
  }
  const baseline = git(['rev-parse', 'HEAD']).toString().trim(),
    runtime = await runtimeFixture(),
    settings = {
      engineRoot: resolve('../next code'),
      sitePackages: resolve('../next code/.venv/Lib/site-packages')
    },
    coding = await verifyCodingRuntime(runtime, resolve('bridge'), settings)
  const discussion = new SupervisedChild({
    runId: 'offline_p7_discussion',
    role: 'discussion',
    launch: {
      executable: runtime.executable,
      cwd: resolve('bridge'),
      env: {
        ...baselineEnvironment(),
        DEEPSEEK_API_KEY: 'offline-p7-fixture-credential',
        NCD_DISCUSSION_CONFIG: JSON.stringify({ ...settings, budgetFile: 'unused_mock_budget' })
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
  await discussion.ready
  const supervisor = new PythonSupervisor({ runtime }),
    service = new DiscussionService({
      path: join(directory, 'state.sqlite3'),
      enabled: true,
      ensure: async () => discussion,
      available: () => discussion.connection.state.ready,
      choose: async () => workspace,
      brokerDirectory: directory,
      brokerPool: new BrokerPool(await workerFixture()),
      database: { fault },
      notify
    })
  const selected = await service.dispatch('projects.choose', null)
  if (!selected.ok) {
    await discussion.stop()
    service.close()
    throw new Error('Native fixture registration failed: ' + selected.error.code)
  }
  const project = service.store.projects()[0],
    scope = service.store.projectBinding(project.projectId).scope
  let nextCase = mode
  service.installCoding(
    supervisor,
    coding,
    mode === 'production'
      ? undefined
      : () => ({
          ...coding.launch(),
          env: { ...coding.launch().env, P7_FIXTURE_CASE: nextCase },
          args: ['-I', '-S', '-u', resolve('tests/fixtures/coding_engine_peer.py')]
        })
  )
  let next = 0
  const errors: string[] = []
  const propose = async () => {
    const sent = await service.dispatch('conversations.sendMessage', {
      draftId: 'draft_' + next,
      text: 'Propose a change to sample.py. Exact C01 fixture message.',
      modelId: 'deepseek-flash',
      clientMutationId: 'send_' + next++
    })
    if (!sent.ok) throw new Error('Synthetic proposal send failed')
    await service.idle()
    const conversationId = (sent.data as { conversationId: string }).conversationId
    const page = service.store.readConversation(scope, conversationId)
    if (!page.availableProposals.length) throw new Error('Actual Discussion returned no proposal')
    return { proposalId: page.availableProposals[0].proposalId, conversationId }
  }
  return {
    directory,
    workspace,
    baseline,
    service,
    scope,
    supervisor,
    runtime: coding,
    propose,
    setCase: (value: string) => {
      nextCase = value
    },
    db: inspect(service.store),
    status: () => {
      const child = (supervisor as unknown as { coding?: { child: SupervisedChild } }).coding?.child
      return {
        active: supervisor.activeCodingTask,
        state: child?.state,
        error: child?.lastError,
        states: child?.states,
        connection: child?.connection.state,
        stderr: child?.diagnostics,
        errors,
        activeProcesses: child?.process?.activeProcesses(),
        cleanupVerified: child?.hasVerifiedCleanup()
      }
    },
    run: async () => {
      const p = await propose(),
        input = { proposalId: p.proposalId, clientMutationId: 'run_' + next }
      const result = await service.dispatch('proposals.confirmRun', input)
      if (!result.ok) throw new Error('Fixture admission rejected: ' + result.error.code)
      await service.coding.idle()
      const child = (supervisor as unknown as { coding?: { child: SupervisedChild } }).coding?.child
      child?.on('frame', (frame) => {
        if (frame.type === 'error') errors.push(frame.payload.message)
      })
      return { ...p, input, task: result.data as { taskId: string; state: string } }
    },
    wait: (taskId: string, state: string, ms = 10000) =>
      waitFor(() => service.store.readTask(scope, taskId).state === state, ms),
    close: async () => {
      await supervisor.stopAllOnAppQuit()
      await discussion.stop()
      service.close()
    },
    source: () => readFileSync(join(workspace, 'sample.py'), 'utf8')
  }
}
