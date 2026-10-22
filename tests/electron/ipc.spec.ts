import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test'
import { resolve } from 'node:path'
import { mkdirSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { ipcInputs } from '../fixtures/ipc'

async function launch() {
  const profile = resolve('.test-profiles', randomUUID())
  mkdirSync(profile, { recursive: true })
  const env = Object.fromEntries(
    Object.entries(process.env).filter((e): e is [string, string] => e[1] !== undefined)
  )
  delete env.ELECTRON_RUN_AS_NODE
  delete env.ELECTRON_RENDERER_URL
  const app = await electron.launch({
    args: [resolve('out/main/index.js'), `--p1-test-profile=${profile}`],
    env
  })
  const page = await app.firstWindow()
  await expect(page.getByRole('textbox', { name: 'Message' })).toBeVisible()
  return { app, page }
}

test('P2-WIN: exact 23+3 facade; P3-backed methods and remaining fail-closed methods use real IPC', async () => {
  const { app, page } = await launch()
  try {
    const methods = Object.keys(ipcInputs).sort()
    expect(
      await page.evaluate(() =>
        Object.entries(window.nextCode)
          .flatMap(([group, entries]) => Object.keys(entries).map((key) => `${group}.${key}`))
          .sort()
      )
    ).toEqual(
      [
        ...methods,
        'tasks.subscribeTask',
        'conversations.subscribeConversation',
        'runtime.subscribeStatus'
      ].sort()
    )
    const results = await page.evaluate(async (inputs) => {
      const positional: Record<string, string[]> = {
        'projects.select': ['projectId'],
        'projects.listFiles': ['projectId', 'relativeDir', 'cursor', 'limit'],
        'projects.previewFile': ['projectId', 'relativePath', 'range'],
        'conversations.list': ['projectId', 'cursor', 'limit'],
        'conversations.read': ['conversationId', 'cursor', 'limit'],
        'models.setDiscussionPreference': ['modelId'],
        'disclosures.list': ['projectId'],
        'tasks.read': ['taskId'],
        'tasks.list': ['conversationId', 'cursor', 'limit'],
        'tasks.cancel': ['taskId']
      }
      const results: unknown[] = []
      for (const [method, input] of Object.entries(inputs)) {
        const [group, name] = method.split('.')
        const args =
          input === null
            ? []
            : positional[method]
              ? positional[method].map((key) => (input as Record<string, unknown>)[key])
              : [input]
        results.push(await (window.nextCode as any)[group][name](...args))
      }
      return results
    }, ipcInputs)
    expect(results).toHaveLength(23)
    const backed = new Set([
      'app.bootstrap',
      'projects.listRecent',
      'preferences.get',
      'preferences.update'
    ])
    const ordered = Object.keys(ipcInputs)
    for (const [index, result] of results.entries()) {
      if (backed.has(ordered[index])) {
        expect(result).toMatchObject({ ok: true })
        continue
      }
      expect(result).toEqual({
        ok: false,
        error: {
          code: 'RUNTIME_NOT_READY',
          message: 'This operation is not available yet.',
          retryable: false
        }
      })
    }
    expect(
      await page.evaluate(async () => ({
        invalid: await window.nextCode.tasks.read('../escape'),
        extra: await (window.nextCode.app.bootstrap as any)('unexpected'),
        globals: [
          'require',
          'process',
          'ipcRenderer',
          'Buffer',
          'Python',
          'fs',
          'child_process'
        ].filter((key) => key in window)
      }))
    ).toEqual({
      invalid: {
        ok: false,
        error: { code: 'BAD_INPUT', message: 'The request is invalid.', retryable: false }
      },
      extra: {
        ok: false,
        error: { code: 'BAD_INPUT', message: 'The request is invalid.', retryable: false }
      },
      globals: []
    })
  } finally {
    await app.close()
  }
})

async function attacker(app: ElectronApplication) {
  const pagePromise = app.waitForEvent('window')
  await app.evaluate(async ({ BrowserWindow }, preload) => {
    const window = new BrowserWindow({
      show: false,
      webPreferences: { preload, contextIsolation: true, sandbox: true, nodeIntegration: false }
    })
    await window.loadURL(
      'data:text/html,<title>Isolated adversarial fixture</title><iframe src="about:blank"></iframe>'
    )
  }, resolve('tests/fixtures/attacker-preload.cjs'))
  const page = await pagePromise
  await expect.poll(() => page.evaluate(() => typeof (window as any).testAttack)).toBe('object')
  return page
}

test('P2-WIN: real unregistered webContents and unknown channel are rejected', async () => {
  const { app } = await launch()
  try {
    const page = await attacker(app)
    expect(
      await page.evaluate(() => (window as any).testAttack.invoke('ncd:ipc:v1:app.bootstrap', null))
    ).toEqual({
      ok: false,
      error: { code: 'NOT_AUTHORIZED', message: 'The caller is not authorized.', retryable: false }
    })
    expect(
      await page.evaluate(async () => {
        try {
          await (window as any).testAttack.invoke('ncd:ipc:v1:arbitrary', null)
          return 'ALLOWED'
        } catch {
          return 'REJECTED'
        }
      })
    ).toBe('REJECTED')
    // Invoke the registered handler with actual Electron objects: a trusted
    // sender paired with a real foreign subframe must still be rejected.
    const result = await app.evaluate(async ({ BrowserWindow, ipcMain }) => {
      const windows = BrowserWindow.getAllWindows()
      const trusted = windows.find((w) => w.webContents.getURL().startsWith('file:'))!.webContents
      const foreign = windows.find((w) => w.webContents.getURL().startsWith('data:'))!.webContents
        .mainFrame.frames[0]
      if (!foreign) throw new Error('No actual foreign frame')
      const handlers = (ipcMain as unknown as { _invokeHandlers: Map<string, Function> })
        ._invokeHandlers
      return handlers.get('ncd:ipc:v1:app.bootstrap')!(
        { sender: trusted, senderFrame: foreign },
        null
      )
    })
    expect(result).toEqual({
      ok: false,
      error: { code: 'NOT_AUTHORIZED', message: 'The caller is not authorized.', retryable: false }
    })
  } finally {
    await app.close()
  }
})

test('P2-WIN: typed subscriptions filter invalid updates, isolate callbacks and safely unsubscribe/reload', async () => {
  const { app, page } = await launch()
  try {
    await page.evaluate(() => {
      const state = window as any
      state.received = []
      state.offA = window.nextCode.runtime.subscribeStatus(() => {
        throw new Error('fixture callback')
      })
      state.offB = window.nextCode.runtime.subscribeStatus((update) => state.received.push(update))
      state.offTask = window.nextCode.tasks.subscribeTask('task_fixture', (update) =>
        state.received.push(update)
      )
      state.offConversation = window.nextCode.conversations.subscribeConversation(
        'conversation_fixture',
        (update) => state.received.push(update)
      )
    })
    await app.evaluate(({ BrowserWindow }) => {
      const wc = BrowserWindow.getAllWindows()[0].webContents
      // Test-only delivery probes; no production event source or user ledger.
      wc.send('ncd:ipc:v1:push.runtime', {
        subscriptionId: 'sub_2',
        update: { type: 'RuntimeStatusChanged', runtimeStatus: 'invented' }
      })
      wc.send('ncd:ipc:v1:push.runtime', {
        subscriptionId: 'foreign',
        update: { type: 'RuntimeStatusChanged', runtimeStatus: 'not_ready' }
      })
      for (const subscriptionId of ['sub_1', 'sub_2'])
        wc.send('ncd:ipc:v1:push.runtime', {
          subscriptionId,
          update: { type: 'RuntimeStatusChanged', runtimeStatus: 'not_ready' }
        })
      wc.send('ncd:ipc:v1:push.task', {
        subscriptionId: 'sub_3',
        update: { type: 'TaskEventCommitted', taskId: 'foreign', sequence: 1 }
      })
    })
    await expect
      .poll(() => page.evaluate(() => (window as any).received))
      .toEqual([{ type: 'RuntimeStatusChanged', runtimeStatus: 'not_ready' }])
    await page.evaluate(() => {
      for (const key of ['offA', 'offB', 'offTask', 'offConversation']) {
        ;(window as any)[key]()
        ;(window as any)[key]()
      }
    })
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].webContents.send('ncd:ipc:v1:push.runtime', {
        subscriptionId: 'sub_2',
        update: { type: 'RuntimeStatusChanged', runtimeStatus: 'unavailable' }
      })
    )
    // Same-process round trip fences the preceding event delivery.
    await page.evaluate(() => window.nextCode.app.bootstrap())
    expect(await page.evaluate(() => (window as any).received)).toHaveLength(1)
    await page.reload()
    await expect(page.getByRole('textbox', { name: 'Message' })).toBeVisible()
    expect((await page.evaluate(() => window.nextCode.app.bootstrap())).ok).toBe(true)
    expect(await page.evaluate(() => typeof (window as any).received)).toBe('undefined')
  } finally {
    await app.close()
  }
})
