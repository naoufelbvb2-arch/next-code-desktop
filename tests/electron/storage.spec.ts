import { test, expect, _electron as electron } from '@playwright/test'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { build } from 'esbuild'

const fixtureModule = resolve('.cache/p3-main-fixture.cjs')
test.beforeAll(async () => {
  mkdirSync('.cache', { recursive: true })
  await build({
    entryPoints: ['tests/fixtures/storage.ts'],
    outfile: fixtureModule,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    logLevel: 'silent'
  })
})
function profile() {
  mkdirSync('.test-profiles', { recursive: true })
  return mkdtempSync(resolve('.test-profiles', 'p3-electron-'))
}
async function launch(path: string) {
  const env = Object.fromEntries(
    Object.entries(process.env).filter((p): p is [string, string] => p[1] !== undefined)
  )
  delete env.ELECTRON_RUN_AS_NODE
  delete env.ELECTRON_RENDERER_URL
  const app = await electron.launch({
    args: [resolve('out/main/index.js'), `--p1-test-profile=${path}`],
    env
  })
  const page = await app.firstWindow()
  await expect(page.getByRole('textbox', { name: 'Message' })).toBeVisible()
  return { app, page }
}

test('P3-WIN: actual Electron Main uses built-in SQLite, 22-table production schema and durable safe preferences across restart', async () => {
  const path = profile()
  let current = await launch(path)
  try {
    expect(await current.app.evaluate(() => process.platform)).toBe('win32')
    const evidence = await current.app.evaluate(({ app }) => {
      const { DatabaseSync } = process.getBuiltinModule('node:sqlite')!
      const join = process.getBuiltinModule('node:path')!.join
      const db = new DatabaseSync(join(app.getPath('userData'), 'desktop-state.sqlite3'), {
        readOnly: true
      })
      try {
        return {
          node: process.versions.node,
          sqlite: db.prepare('SELECT sqlite_version() AS v').get()!.v,
          tables: db
            .prepare(
              "SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            )
            .all().length,
          messages: db.prepare('SELECT count(*) AS n FROM messages').get()!.n,
          journal: db.prepare('PRAGMA journal_mode').get()!.journal_mode
        }
      } finally {
        db.close()
      }
    })
    expect(evidence).toEqual({
      node: '24.22.0',
      sqlite: '3.53.4',
      tables: 22,
      messages: 0,
      journal: 'wal'
    })
    const update = await current.page.evaluate(() =>
      window.nextCode.preferences.update({ savedDockWidth: 416, reducedMotion: true })
    )
    expect(update).toMatchObject({ ok: true, data: { savedDockWidth: 416, reducedMotion: true } })
    await current.page.reload()
    expect(await current.page.evaluate(() => window.nextCode.preferences.get())).toEqual(update)
    expect(
      await current.page.evaluate(() =>
        window.nextCode.conversations.sendMessage({
          draftId: 'fixture',
          text: 'Do not accept without a real model',
          modelId: 'fixture',
          clientMutationId: 'fixture'
        })
      )
    ).toMatchObject({ ok: false, error: { code: 'RUNTIME_NOT_READY' } })
    await current.app.close()
    current = await launch(path)
    expect(await current.page.evaluate(() => window.nextCode.preferences.get())).toEqual(update)
    expect(await current.page.evaluate(() => window.nextCode.app.bootstrap())).toMatchObject({
      ok: true,
      data: {
        runtimeStatus: 'not_ready',
        selectedProject: null,
        activeTaskSummaries: [],
        uiPreferences: { savedDockWidth: 416 }
      }
    })
    expect(
      await current.page.evaluate(() =>
        ['require', 'process', 'ipcRenderer', 'DatabaseSync'].filter((k) => k in window)
      )
    ).toEqual([])
  } finally {
    await current.app.close()
  }
})

test('P3-WIN: corrupt user-profile database fails closed without reset while the P1 interface opens', async () => {
  const path = profile(),
    dbPath = join(path, 'desktop-state.sqlite3'),
    bytes = Buffer.from('Synthetic corrupt DB in disposable profile only')
  writeFileSync(dbPath, bytes)
  const { app, page } = await launch(path)
  try {
    expect(await page.evaluate(() => window.nextCode.app.bootstrap())).toMatchObject({
      ok: false,
      error: { code: 'DATABASE_UNAVAILABLE' }
    })
    expect(
      await page.evaluate(() => window.nextCode.preferences.update({ savedDockWidth: 400 }))
    ).toMatchObject({ ok: false, error: { code: 'DATABASE_UNAVAILABLE' } })
    await expect(page.getByRole('textbox', { name: 'Message' })).toBeVisible()
  } finally {
    await app.close()
  }
  expect(readFileSync(dbPath)).toEqual(bytes)
})

test('P3-WIN: isolated Main-only T1-T6 fixture, C01 read projection and native WAL backup/restore; no Renderer fixture records', async () => {
  const { app, page } = await launch(profile())
  try {
    const result = await app.evaluate(async ({}, modulePath) => {
      const load = process.getBuiltinModule('node:module')!.createRequire(modulePath)
      const { fixture, proof, sendInput, event, session } = load(modulePath)
      const f = fixture(),
        { store, scope } = f
      try {
        const message = store.sendMessage(scope, sendInput()),
          same = store.sendMessage(scope, sendInput())
        const proposalId = store.createProposal(
          scope,
          message.conversationId,
          'Synthetic only - no engine',
          proof
        )
        const admitted = store.admit(scope, { proposalId, clientMutationId: 'run' }, proof)
        store.cancel(scope, admitted.taskId, proof)
        store.commitEvent(
          scope,
          event(admitted.taskId, 'task.started', 1, { phase: 'INITIALIZING' }),
          session(admitted.taskId)
        )
        const attempt = store.issueAttempt(
          scope,
          message.messageId,
          {
            providerKey: 'provider_fixture',
            processSessionRef: 'discussion_fixture',
            retryOf: null
          },
          proof
        )
        store.finishAttempt(
          scope,
          attempt,
          'discussion_fixture',
          { ok: false, code: 'PROVIDER_FAILED', ambiguous: true },
          proof
        )
        const binding = { providerKey: 'provider_fixture', disclosureClass: 'ordinary_text' }
        const challengeId = store.createChallenge(
          scope,
          { ...binding, scopeDescription: 'Synthetic fixture' },
          proof
        )
        const grant = store.respondDisclosure(
          scope,
          { challengeId, decision: 'approve', clientMutationId: 'grant' },
          binding,
          proof
        )
        store.revokeDisclosure(
          scope,
          { consentId: grant.consentId, clientMutationId: 'revoke' },
          proof
        )
        const original = store.readConversation(scope, message.conversationId)
        const target = f.path + '.backup',
          restored = f.path + '.restored'
        await store.backupTo(target)
        await Object.getPrototypeOf(Object.getPrototypeOf(store)).constructor.restoreTo(
          target,
          restored
        )
        const copy = new store.constructor(restored, { policy: { workspace: () => true } })
        try {
          const read = copy.readConversation(scope, message.conversationId)
          return {
            sameReceipt: JSON.stringify(message) === JSON.stringify(same),
            messages: read.messages.length,
            turnStatus: read.discussionTurns[0].status,
            requiredNull: read.discussionTurns[0].lastErrorCode,
            proposalConsumed: read.availableProposals.length === 0,
            revoked: !store.hasConsent(scope, binding.providerKey, binding.disclosureClass),
            backupEqual: JSON.stringify(original) === JSON.stringify(read),
            events: copy.readEvents(scope, { taskId: admitted.taskId, afterSequence: 0, limit: 40 })
              .events.length
          }
        } finally {
          copy.close()
        }
      } finally {
        store.close()
      }
    }, fixtureModule)
    expect(result).toEqual({
      sameReceipt: true,
      messages: 1,
      turnStatus: 'unknown',
      requiredNull: 'PROVIDER_FAILED',
      proposalConsumed: true,
      revoked: true,
      backupEqual: true,
      events: 1
    })
    await page.reload()
    expect(await page.evaluate(() => window.nextCode.projects.listRecent())).toEqual({
      ok: true,
      data: []
    })
    await expect(page.getByText('No saved conversations yet')).toBeVisible()
  } finally {
    await app.close()
  }
})
