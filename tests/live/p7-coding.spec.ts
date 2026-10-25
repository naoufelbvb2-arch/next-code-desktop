import { test, expect, _electron as electron } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { build } from 'esbuild'

// Explicit owner-authorized live entry, excluded from ordinary Electron/unit QA.
// Never retries the consumed task. All HTTP attempts use the production journal.
test('P7-LIVE production Main/IPC/SQLite/Supervisor/AgentOS/DeepSeek performs one approved synthetic fix and verified cleanup', async () => {
  const plan = JSON.parse(readFileSync('.cache/p7-final-live-plan.json', 'utf8')),
    spent = () => JSON.parse(readFileSync(plan.budgetFile, 'utf8')),
    helper = resolve('.cache/p7-owner-proposal.cjs')
  expect(spent().requests).toHaveLength(0)
  expect(spent().taskId).toBeNull()
  await build({
    entryPoints: ['tests/fixtures/coding-owner-proposal.ts'],
    outfile: helper,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    external: ['koffi', 'electron'],
    logLevel: 'silent'
  })
  const env = Object.fromEntries(
    Object.entries(process.env).filter((p): p is [string, string] => p[1] !== undefined)
  )
  delete env.ELECTRON_RUN_AS_NODE
  delete env.ELECTRON_RENDERER_URL
  delete env.DEEPSEEK_API_KEY
  const launch = () =>
    electron.launch({
      args: [resolve('out/main/index.js'), `--p1-test-profile=${plan.profile}`],
      env
    })
  let app = await launch()
  try {
    let page = await app.firstWindow()
    await expect(page.getByRole('textbox', { name: 'Message' })).toBeVisible()
    await app.evaluate(({ dialog }, workspace) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [workspace] })
    }, plan.workspace)
    await page.getByRole('button', { name: 'Projects', exact: true }).click()
    await page.getByRole('button', { name: 'Open project', exact: true }).click()
    await expect
      .poll(async () => {
        const value = await page.evaluate(() => window.nextCode.app.bootstrap())
        return value.ok && !!value.data.selectedProject
      })
      .toBe(true)
    const bootstrap = await page.evaluate(() => window.nextCode.app.bootstrap())
    if (!bootstrap.ok || !bootstrap.data.selectedProject)
      throw new Error('Native project selection failed')
    const prepared = await app.evaluate(
      async ({}, input) => {
        const load = process.getBuiltinModule('node:module')!.createRequire(input.helper)
        return load(input.helper).prepare(input.profile, input.projectId, input.goal)
      },
      {
        helper,
        profile: plan.profile,
        projectId: bootstrap.data.selectedProject.projectId,
        goal: plan.goal
      }
    )
    expect(prepared.providerVerified).toBe(true)
    await page.reload()
    await page.locator('.sidebar-history button').first().click()
    await expect(page.locator('section[aria-label="Task proposals and status"] pre')).toHaveText(
      plan.goal
    )
    expect(spent().requests).toHaveLength(0)
    // The normal app resolves runtime/probes asynchronously and denies an early
    // click before T2. Allow its bounded startup to settle while reviewing the
    // complete goal; this never retries a paid request or a consumed task.
    await page.waitForTimeout(5000)
    // This is the sole explicit production Run Task click in this mission.
    await page.getByRole('button', { name: 'Run Task', exact: true }).click()
    await expect(page.getByText(/Task .+: running/)).toBeVisible({ timeout: 30000 })
    await expect(page.getByText(/Task .+: completed/)).toBeVisible({ timeout: 540000 })
    await expect(page.getByText('Main reports reconciled task evidence.')).toBeVisible({
      timeout: 15000
    })
    // Main-only read-only inspection; no production fixture route or raw DB IPC.
    const evidence = await app.evaluate(({ app }) => {
      const { DatabaseSync } = process.getBuiltinModule('node:sqlite')!,
        { join } = process.getBuiltinModule('node:path')!
      const db = new DatabaseSync(join(app.getPath('userData'), 'desktop-state.sqlite3'), {
        readOnly: true
      })
      try {
        return {
          tasks: db
            .prepare('SELECT task_id,state,cleanup_state,engine_outcome_json FROM tasks')
            .all(),
          events: db.prepare('SELECT name,sequence FROM task_events ORDER BY sequence').all(),
          leases: db.prepare('SELECT count(*) n FROM workspace_writer_leases').get()!.n,
          consumed: db
            .prepare("SELECT count(*) n FROM task_proposals WHERE state='consumed'")
            .get()!.n
        }
      } finally {
        db.close()
      }
    })
    expect(evidence.tasks).toHaveLength(1)
    expect(evidence.tasks[0]).toMatchObject({
      state: 'completed',
      cleanup_state: 'verified_completed'
    })
    expect(JSON.parse(evidence.tasks[0].engine_outcome_json as string)).toMatchObject({
      success: true,
      final_phase: 'COMPLETED'
    })
    expect(evidence.events.map((e) => e.name)).toEqual(['task.started', 'task.completed'])
    expect(evidence.leases).toBe(0)
    expect(evidence.consumed).toBe(1)
    const independent = execFileSync('C:/Python314/python.exe', ['-B', 'check.py'], {
      cwd: plan.workspace,
      env: Object.fromEntries(
        Object.entries(env).filter(([k]) => ['SystemRoot', 'WINDIR', 'TEMP', 'TMP'].includes(k))
      )
    }).toString()
    expect(independent.trim()).toBe('SYNTHETIC_ADD_TEST_PASS')
    expect(readFileSync(join(plan.workspace, 'sample.py'), 'utf8')).toMatch(/return a \+ b/)
    expect(spent().requests.length).toBeLessThanOrEqual(12)
    const tokens = spent().requests.reduce(
      (n: number, r: { total_tokens: number }) => n + r.total_tokens,
      0
    )
    expect(tokens).toBeLessThanOrEqual(60000)
    expect(spent().requests.every((r: { status: string }) => r.status === 'completed')).toBe(true)
    await page.screenshot({ path: '.cache/p7-live-deepseek-success.png' })
    writeFileSync(
      '.cache/p7-live-summary.json',
      JSON.stringify(
        {
          status: 'LIVE_DEEPSEEK_PASS',
          evidence,
          requests: spent().requests.length,
          tokens,
          independentTest: 'PASS',
          sourceChanged: 'sample.py',
          noReplay: false
        },
        null,
        2
      ) + '\n'
    )
    const before = spent().requests.length
    await app.close()
    app = await launch()
    page = await app.firstWindow()
    await page.locator('.sidebar-history button').first().click()
    await expect(page.getByText(/Task .+: completed/)).toBeVisible()
    expect(spent().requests.length).toBe(before)
    expect(await page.getByRole('button', { name: 'Run Task', exact: true }).count()).toBe(0)
    const summary = JSON.parse(readFileSync('.cache/p7-live-summary.json', 'utf8'))
    summary.noReplay = true
    writeFileSync('.cache/p7-live-summary.json', JSON.stringify(summary, null, 2) + '\n')
  } finally {
    await app.close()
  }
})
