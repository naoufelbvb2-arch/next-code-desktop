import { test, expect, _electron as electron } from '@playwright/test'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'

test('P1-DEV: development assets, nonce CSP and React load in an actual sandboxed Electron window', async () => {
  const env: Record<string, string> = Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
  )
  delete env.ELECTRON_RUN_AS_NODE
  delete env.ELECTRON_RENDERER_URL
  const server = spawn(process.execPath, [resolve('electron/run.mjs'), '--rendererOnly'], {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  })
  const ready = new Promise<void>((done, reject) => {
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
      if (code !== null) reject(new Error(`Development server exited: ${code}`))
    })
  })
  try {
    await ready
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
      await page.screenshot({ path: 'docs/implementation/P1/screenshots/development-settings.png' })
    } finally {
      await app.close()
    }
  } finally {
    server.kill()
    if (server.exitCode === null)
      await new Promise<void>((done) => {
        server.once('exit', () => done())
        setTimeout(done, 3000).unref()
      })
  }
})
