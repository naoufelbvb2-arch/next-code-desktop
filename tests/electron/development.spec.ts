import { test, expect, _electron as electron } from '@playwright/test'
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'

test('P1-DEV: development assets, nonce CSP and React load in an actual sandboxed Electron window', async () => {
  const env: Record<string, string> = Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
  )
  delete env.ELECTRON_RUN_AS_NODE
  delete env.ELECTRON_RENDERER_URL
  // A developer may already be running this app. Reuse only a Vite endpoint
  // whose entry source matches this checkout; never stop an unrelated process.
  let reuse = false
  try {
    const response = await fetch('http://127.0.0.1:5173/main.tsx', {
      signal: AbortSignal.timeout(1000)
    })
    const module = await response.text()
    const map = module.match(/sourceMappingURL=data:application\/json;base64,([^\s]+)/)
    const sources = map ? JSON.parse(Buffer.from(map[1], 'base64').toString()).sourcesContent : []
    if (!response.ok || !sources.includes(readFileSync('renderer/main.tsx', 'utf8')))
      throw new Error('Occupied development port does not match this checkout')
    reuse = true
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Occupied')) throw error
  }
  const server = reuse
    ? undefined
    : spawn(process.execPath, [resolve('electron/run.mjs'), '--rendererOnly'], {
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true
      })
  let diagnostic = ''
  server?.stderr.on('data', (data) => {
    diagnostic = (diagnostic + data.toString()).slice(-4096)
  })
  const ready = !server
    ? Promise.resolve()
    : new Promise<void>((done, reject) => {
        const timer = setTimeout(
          () => reject(new Error('Development asset server did not become ready')),
          15000
        )
        server.stdout.on('data', (data) => {
          if (data.toString().includes('http://127.0.0.1:5173/')) {
            clearTimeout(timer)
            done()
          }
        })
        server.once('error', reject)
        server.once('exit', (code) => {
          clearTimeout(timer)
          if (code !== null) reject(new Error(`Development server exited: ${code}\n${diagnostic}`))
        })
      })
  try {
    await ready
    mkdirSync('test-results', { recursive: true })
    writeFileSync(
      'test-results/development-source.json',
      JSON.stringify({ reusedExistingServer: reuse, entrySourceVerified: reuse })
    )
    const profile = resolve('.test-profiles', randomUUID())
    mkdirSync(profile, { recursive: true })
    const app = await electron.launch({
      args: [resolve('out/main/index.js'), `--p1-test-profile=${profile}`],
      env: { ...env, ELECTRON_RENDERER_URL: 'http://127.0.0.1:5173/' }
    })
    try {
      const page = await app.firstWindow()
      const failures: string[] = []
      page.on('pageerror', (error) => failures.push(error.message))
      await expect(page.getByRole('textbox', { name: 'Message' })).toBeVisible()
      await page.getByRole('textbox').fill('Synthetic development-mode draft')
      await page.getByRole('button', { name: 'Settings', exact: true }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible()
      expect(
        await page.evaluate(() =>
          document
            .querySelector('meta[http-equiv="Content-Security-Policy"]')!
            .getAttribute('content')
        )
      ).toContain("'nonce-")
      expect(
        await page.evaluate(() =>
          document.querySelector('script[type="module"]')?.getAttribute('nonce')
        )
      ).toBeTruthy()
      expect(await page.evaluate(() => typeof (window as any).require)).toBe('undefined')
      expect(failures).toEqual([])
      mkdirSync('test-results/p1-regression-screenshots', { recursive: true })
      await page.screenshot({
        path: 'test-results/p1-regression-screenshots/development-settings.png'
      })
    } finally {
      await app.close()
    }
  } finally {
    server?.kill()
    if (server && server.exitCode === null)
      await new Promise<void>((done) => {
        server.once('exit', () => done())
        setTimeout(done, 3000).unref()
      })
  }
})
