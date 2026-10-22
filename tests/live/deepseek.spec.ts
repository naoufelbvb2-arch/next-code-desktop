import { test, expect, _electron as electron } from '@playwright/test'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'

// EXPLICIT LIVE SUITE: never included by ordinary unit/Electron regression runs.
// All requests share the durable ten-request owner budget, including failures.
test('P5-LIVE: actual Desktop -> T1 -> Python -> original ModelGateway -> DeepSeek, two-turn Atlas memory and restart persistence', async () => {
  mkdirSync('.test-profiles', { recursive: true })
  const profile = mkdtempSync(resolve('.test-profiles', 'p5-live-')),
    workspace = join(profile, 'Atlas synthetic project')
  mkdirSync(workspace)
  const config = JSON.parse(readFileSync('.cache/p5-runtime.json', 'utf8'))
  writeFileSync(join(profile, 'python-runtime.json'), JSON.stringify(config))
  const spent = () =>
    existsSync(config.discussion.budgetFile)
      ? JSON.parse(readFileSync(config.discussion.budgetFile, 'utf8')).requests.length
      : 0
  const before = spent()
  expect(before).toBeLessThanOrEqual(8)
  const env = Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
  )
  delete env.ELECTRON_RUN_AS_NODE
  delete env.ELECTRON_RENDERER_URL
  delete env.DEEPSEEK_API_KEY
  const launch = async () => {
    const app = await electron.launch({
      args: [resolve('out/main/index.js'), `--p1-test-profile=${profile}`],
      env
    })
    const page = await app.firstWindow()
    await expect(page.getByRole('textbox', { name: 'Message' })).toBeVisible()
    return { app, page }
  }
  let current = await launch()
  try {
    await current.app.evaluate(({ dialog }, directory) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [directory] })
    }, workspace)
    await current.page.getByRole('button', { name: 'Projects', exact: true }).click()
    await current.page.getByRole('button', { name: 'Open project', exact: true }).click()
    await expect(current.page.locator('.project-copy strong')).toHaveText('Atlas synthetic project')
    await current.page.getByRole('button', { name: 'New Conversation', exact: true }).click()
    await expect(
      current.page
        .getByRole('combobox', { name: 'Discussion model' })
        .locator('option[value="deepseek-flash"]')
    ).toBeEnabled({ timeout: 20000 })
    await current.page
      .getByRole('combobox', { name: 'Discussion model' })
      .selectOption('deepseek-flash')
    await current.page
      .getByRole('textbox', { name: 'Message' })
      .fill('Remember that the synthetic project name is Atlas. Reply briefly.')
    await current.page.getByRole('button', { name: 'Send message' }).dblclick()
    await expect(current.page.locator('.conversation-message.assistant')).toHaveCount(1, {
      timeout: 70000
    })
    expect(spent() - before).toBe(1)
    await current.page.reload()
    await current.page.locator('.sidebar-history button').first().click()
    await expect(current.page.locator('.conversation-message.assistant')).toHaveCount(1)
    expect(spent() - before).toBe(1)
    await current.page
      .getByRole('textbox', { name: 'Message' })
      .fill('What synthetic project name did I mention? Answer only the name.')
    await current.page.getByRole('button', { name: 'Send message' }).click()
    await expect(current.page.locator('.conversation-message.assistant')).toHaveCount(2, {
      timeout: 70000
    })
    await expect(current.page.locator('.conversation-message.assistant').last()).toContainText(
      'Atlas'
    )
    expect(spent() - before).toBe(2)
    await current.app.close()
    current = await launch()
    await current.page.locator('.sidebar-history button').first().click()
    await expect(current.page.locator('.conversation-message.assistant')).toHaveCount(2)
    await expect(current.page.locator('.conversation-message.assistant').last()).toContainText(
      'Atlas'
    )
    expect(spent() - before).toBe(2)
    const files = await current.app.evaluate(({ app }) => {
      const { DatabaseSync } = process.getBuiltinModule('node:sqlite')!,
        { join } = process.getBuiltinModule('node:path')!
      const db = new DatabaseSync(join(app.getPath('userData'), 'desktop-state.sqlite3'), {
        readOnly: true
      })
      try {
        return {
          messages: db.prepare('SELECT count(*) n FROM messages').get()!.n,
          attempts: db
            .prepare('SELECT model_id,effective_provider_key,status FROM discussion_attempts')
            .all(),
          tasks: db.prepare('SELECT count(*) n FROM tasks').get()!.n,
          events: db.prepare('SELECT count(*) n FROM task_events').get()!.n
        }
      } finally {
        db.close()
      }
    })
    expect(files.messages).toBe(4)
    expect(files.tasks).toBe(0)
    expect(files.events).toBe(0)
    expect(files.attempts).toHaveLength(2)
    expect(
      files.attempts.every(
        (a) =>
          a.model_id === 'deepseek-flash' &&
          a.effective_provider_key === 'deepseek_official_v1' &&
          a.status === 'completed'
      )
    ).toBe(true)
    mkdirSync('docs/implementation/P5/screenshots', { recursive: true })
    await current.page.screenshot({
      path: 'docs/implementation/P5/screenshots/live-discussion.png'
    })
    const usage = JSON.parse(readFileSync(config.discussion.budgetFile, 'utf8'))
    writeFileSync(
      '.cache/p5-live-evidence.json',
      JSON.stringify(
        {
          status: 'PASS',
          requestsThisTest: spent() - before,
          totalRequests: spent(),
          requests: usage.requests,
          database: files
        },
        null,
        2
      )
    )
  } finally {
    await current.app.close()
  }
})
