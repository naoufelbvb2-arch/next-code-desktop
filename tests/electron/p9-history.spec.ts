import { test, expect, _electron as electron } from '@playwright/test'
import {
  readdirSync,
  mkdirSync,
  mkdtempSync,
  existsSync,
  writeFileSync,
  readFileSync
} from 'node:fs'
import { statSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { DatabaseSync, backup } from 'node:sqlite'
import { createHash } from 'node:crypto'

test('P9-E2E01 historical accepted real-provider answers restore in current Windows app without credentials, new network or mutation of the original test ledger', async () => {
  test.setTimeout(45000)
  const histories = readdirSync('.test-profiles')
    .filter((name) => name.startsWith('p5-live-'))
    .sort()
  let source: string | undefined
  for (const name of histories) {
    const path = resolve('.test-profiles', name, 'desktop-state.sqlite3')
    if (!existsSync(path)) continue
    const db = new DatabaseSync(path, { readOnly: true })
    try {
      if (
        Number(db.prepare("SELECT count(*) n FROM messages WHERE role='assistant'").get()!.n) === 2
      )
        source = path
    } finally {
      db.close()
    }
  }
  expect(source).toBeTruthy()
  const profile = mkdtempSync(resolve('.test-profiles', 'p9-carried-live-'))
  const original = new DatabaseSync(source!, { readOnly: true })
  try {
    await backup(original, join(profile, 'desktop-state.sqlite3'))
  } finally {
    original.close()
  }
  // Isolated profiles opt out of all services by default. Enable only the same
  // local Broker/history service enabled by a normal production launch.
  writeFileSync(join(profile, 'python-runtime.json'), JSON.stringify({ fileBroker: true }))
  // Deliberately no model runtime/credential configuration: this is historical
  // restoration proof, never a claim of a fresh paid answer or current readiness.
  const budget = '.cache/p5-live-budget.json'
  const digest = () => createHash('sha256').update(readFileSync(budget)).digest('hex')
  const before = digest()
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      (p): p is [string, string] =>
        p[1] !== undefined && !/API_KEY|TOKEN|SECRET|PASSWORD/i.test(p[0])
    )
  )
  delete env.ELECTRON_RUN_AS_NODE
  delete env.ELECTRON_RENDERER_URL
  const app = await electron.launch({
    args: [resolve('out/main/index.js'), `--p1-test-profile=${profile}`],
    env
  })
  try {
    const page = await app.firstWindow()
    await expect(page.getByRole('textbox', { name: 'Message' })).toBeVisible()
    await page.locator('.sidebar-history button').first().click()
    await expect(page.locator('.conversation-message.assistant')).toHaveCount(2)
    await expect(page.locator('.conversation-message.assistant').last()).toContainText('Atlas')
    expect(digest()).toBe(before)
    const snapshot = await app.evaluate(({ app }) => {
      const { DatabaseSync } = process.getBuiltinModule('node:sqlite')!
      const { join } = process.getBuiltinModule('node:path')!
      const db = new DatabaseSync(join(app.getPath('userData'), 'desktop-state.sqlite3'), {
        readOnly: true
      })
      try {
        return {
          messages: db.prepare('SELECT role,count(*) n FROM messages GROUP BY role').all(),
          tasks: db.prepare('SELECT count(*) n FROM tasks').get()!.n
        }
      } finally {
        db.close()
      }
    })
    expect(snapshot.tasks).toBe(0)
    mkdirSync('.cache', { recursive: true })
    writeFileSync(
      '.cache/p9-historical-provider-restore-01.json',
      JSON.stringify(
        {
          ...snapshot,
          source:
            'Accepted P5 isolated live test ledger, WAL-consistent backup, never a user database',
          freshPaidRequests: 0,
          historicalProviderEvidence: 'P5-LIVE, 2026-10-22, 2 accepted requests',
          budgetBefore: before,
          budgetAfter: digest(),
          modelReadinessClaim: false
        },
        null,
        2
      ) + '\n'
    )
  } finally {
    await app.close()
  }
})

test('P9-E2E05 actual Renderer reopens the post-stdio/pre-evidence-COMMIT crash ledger as partial with zero fabricated delivered reads', async () => {
  const histories = readdirSync('.test-profiles')
    .filter(
      (name) =>
        name.startsWith('p6-electron-') &&
        existsSync(resolve('.test-profiles', name, 'post-write-pre-commit.marker'))
    )
    .sort(
      (a, b) =>
        statSync(resolve('.test-profiles', b, 'post-write-pre-commit.marker')).mtimeMs -
        statSync(resolve('.test-profiles', a, 'post-write-pre-commit.marker')).mtimeMs
    )
  expect(histories.length).toBeGreaterThan(0)
  const source = resolve('.test-profiles', histories[0], 'peer-state.sqlite3')
  const sourceDigest = () => createHash('sha256').update(readFileSync(source)).digest('hex')
  const sourceBefore = sourceDigest()
  const profile = mkdtempSync(resolve('.test-profiles', 'p9-carried-crash-'))
  const original = new DatabaseSync(source, { readOnly: true })
  try {
    expect(
      original
        .prepare(
          "SELECT count(*) n FROM inspection_observations WHERE observation_kind='read_file'"
        )
        .get()!.n
    ).toBe(0)
    expect(original.prepare('SELECT count(*) n FROM messages').get()!.n).toBe(2)
    await backup(original, join(profile, 'desktop-state.sqlite3'))
  } finally {
    original.close()
  }
  writeFileSync(join(profile, 'python-runtime.json'), JSON.stringify({ fileBroker: true }))
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      (p): p is [string, string] =>
        p[1] !== undefined && !/API_KEY|TOKEN|SECRET|PASSWORD/i.test(p[0])
    )
  )
  delete env.ELECTRON_RUN_AS_NODE
  delete env.ELECTRON_RENDERER_URL
  const app = await electron.launch({
    args: [resolve('out/main/index.js'), `--p1-test-profile=${profile}`],
    env
  })
  try {
    const page = await app.firstWindow()
    await page.locator('.sidebar-history button').first().click()
    const inspection = page.getByRole('region', { name: 'Project source permissions' })
    await expect(inspection).toContainText('partial')
    await expect(inspection).toContainText('Handed to Discussion: 0')
    expect(sourceDigest()).toBe(sourceBefore)
    await expect(page.locator('.conversation-message.user')).toHaveCount(2)
    await expect(page.locator('.conversation-message.assistant')).toHaveCount(0)
    await page.reload()
    await page.locator('.sidebar-history button').first().click()
    await expect(inspection).toContainText('partial')
    await expect(inspection).toContainText('Handed to Discussion: 0')
    await page.screenshot({ path: '.cache/p9-partial-inspection-05.png' })
    writeFileSync(
      '.cache/p9-inspection-restore-05.json',
      JSON.stringify(
        {
          source: 'Most recent isolated P6-E03 native Main termination marker and WAL ledger',
          nativeMainExit: 86,
          boundary: 'Actual local stdio handoff before inspection observation COMMIT',
          originalReadObservations: 0,
          restoredRendererState: 'partial',
          restoredRendererHandedToDiscussion: 0,
          userMessages: 2,
          assistantMessages: 0,
          rendererReload: true,
          sourceDatabaseUnmodified: true,
          sourceDatabaseSha256: sourceBefore,
          providerRequests: 0,
          inference:
            'Possible local handoff undercount; no claim of Python/provider receipt or full scan'
        },
        null,
        2
      ) + '\n'
    )
  } finally {
    await app.close()
  }
})
