import {
  test,
  expect,
  _electron as electron,
  type ElectronApplication,
  type CDPSession,
  type Page
} from '@playwright/test'
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
// Regression reruns must not overwrite accepted P1 evidence.
const screenshots = resolve('test-results/p1-regression-screenshots')
const viewportSessions = new WeakMap<Page, CDPSession>()
mkdirSync(screenshots, { recursive: true })

async function launch(scale?: number): Promise<{ app: ElectronApplication; page: Page }> {
  const profile = resolve('.test-profiles', randomUUID())
  mkdirSync(profile, { recursive: true })
  const env: Record<string, string> = Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
  )
  delete env.ELECTRON_RUN_AS_NODE
  delete env.ELECTRON_RENDERER_URL
  const app = await electron.launch({
    args: [
      resolve('out/main/index.js'),
      `--p1-test-profile=${profile}`,
      ...(scale ? [`--force-device-scale-factor=${scale}`] : [])
    ],
    env
  })
  const page = await app.firstWindow()
  await expect(page.getByRole('textbox', { name: 'Message' })).toBeVisible()
  await expect
    .poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isVisible()))
    .toBe(true)
  return { app, page }
}

async function contentSize(app: ElectronApplication, page: Page, width: number, height: number) {
  let cdp = viewportSessions.get(page)
  if (!cdp) {
    cdp = await page.context().newCDPSession(page)
    viewportSessions.set(page, cdp)
  }
  await cdp.send('Emulation.clearDeviceMetricsOverride')
  await app.evaluate(async ({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0]
    if (window.isMaximized())
      await new Promise<void>((done) => {
        window.once('unmaximize', done)
        window.unmaximize()
      })
  })
  await app.evaluate(
    ({ BrowserWindow }, size) => {
      const window = BrowserWindow.getAllWindows()[0]
      window.setContentSize(size.width, size.height)
    },
    { width, height }
  )
  await page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
  )
  const native = await page.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    devicePixelRatio
  }))
  // Windows rounds fractional-DPI sizes and constrains windows larger than the
  // physical display. The exact CSS targets use DevTools in the real Electron
  // renderer; native measurements and every override are recorded separately.
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: native.devicePixelRatio,
    mobile: false
  })
  appendFileSync(
    'test-results/viewport-observed.jsonl',
    JSON.stringify({
      requested: { width, height },
      native,
      exactCssOverride: native.width !== width || native.height !== height
    }) + '\n'
  )
  await expect.poll(() => page.evaluate(() => [innerWidth, innerHeight])).toEqual([width, height])
}

test('P1-WIN: actual Windows startup, maximized window, isolated renderer and restricted preload', async () => {
  const { app, page } = await launch()
  try {
    expect(await app.evaluate(() => process.platform)).toBe('win32')
    expect(
      await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isMaximized())
    ).toBe(true)
    const preferences = await app.evaluate(({ BrowserWindow }) => {
      const p = (
        BrowserWindow.getAllWindows()[0].webContents as unknown as {
          getLastWebPreferences(): Electron.WebPreferences
        }
      ).getLastWebPreferences()
      return {
        contextIsolation: p.contextIsolation,
        sandbox: p.sandbox,
        nodeIntegration: p.nodeIntegration,
        webSecurity: p.webSecurity,
        webviewTag: p.webviewTag
      }
    })
    expect(preferences).toEqual({
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      webviewTag: false
    })
    expect(
      await page.evaluate(() => ({
        require: typeof (window as any).require,
        process: typeof (window as any).process,
        nextCode: typeof (window as any).nextCode,
        ipcRenderer: typeof (window as any).ipcRenderer
      }))
    ).toEqual({
      require: 'undefined',
      process: 'undefined',
      nextCode: 'object',
      ipcRenderer: 'undefined'
    })
    const versions = await app.evaluate(({ screen }) => ({
      electron: process.versions.electron,
      chromium: process.versions.chrome,
      embeddedNode: process.versions.node,
      platform: process.platform,
      arch: process.arch,
      displays: screen
        .getAllDisplays()
        .map((d) => ({ width: d.size.width, height: d.size.height, scaleFactor: d.scaleFactor }))
    }))
    writeFileSync('test-results/runtime-observed.json', JSON.stringify(versions, null, 2))
    await page.screenshot({ path: join(screenshots, 'native-maximized.png') })
    await contentSize(app, page, 1366, 768)
    await page.screenshot({ path: join(screenshots, 'home-1366.png') })
  } finally {
    await app.close()
  }
})

test('P1-SEC: external navigation, popup, provider network, local-file reads and inline code are blocked', async () => {
  const { app, page } = await launch()
  let requests = 0
  const server = createServer((_request, response) => {
    requests++
    response.end('not allowed')
  })
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))
  const port = (server.address() as { port: number }).port
  try {
    const initialUrl = page.url()
    await page.evaluate(() => {
      const link = document.createElement('a')
      link.href = 'https://example.com'
      document.body.append(link)
      link.click()
      link.remove()
    })
    await expect.poll(() => page.evaluate(() => location.href)).toBe(initialUrl)
    expect(
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0].webContents.getURL()
      )
    ).toBe(initialUrl)
    expect(await page.evaluate(() => window.open('https://example.com'))).toBeNull()
    expect(app.windows()).toHaveLength(1)
    expect(
      await page.evaluate(async (url) => {
        try {
          await fetch(url)
          return 'ALLOWED'
        } catch {
          return 'BLOCKED'
        }
      }, `http://127.0.0.1:${port}/probe`)
    ).toBe('BLOCKED')
    expect(requests).toBe(0)
    expect(
      await page.evaluate(async () => {
        try {
          await fetch('../../../package.json')
          return 'ALLOWED'
        } catch {
          return 'BLOCKED'
        }
      })
    ).toBe('BLOCKED')
    expect(
      await page.evaluate(() => {
        const script = document.createElement('script')
        script.textContent = 'window.__inlineExecuted = true'
        document.body.append(script)
        return (window as any).__inlineExecuted === true
      })
    ).toBe(false)
    await page.evaluate(() => {
      const frame = document.createElement('iframe')
      frame.src = 'https://example.com'
      document.body.append(frame)
    })
    expect(
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0].webContents.session.getStoragePath()
      )
    ).toBeNull()
    // The page itself cannot request privileges through preload or a Node API.
    expect(await page.evaluate(() => 'ipcRenderer' in window || 'require' in window)).toBe(false)
    expect(await page.evaluate(() => Notification.requestPermission())).toBe('denied')
  } finally {
    server.close()
    await app.close()
  }
})

test('P1-NAV: all pages, recoverable drafts and no fictitious history/task', async () => {
  const { app, page } = await launch()
  try {
    await page
      .getByRole('textbox', { name: 'Message' })
      .fill('A synthetic unsent idea for UI verification')
    expect(await page.getByRole('button', { name: 'Send message' }).isDisabled()).toBe(true)
    for (const name of ['Projects', 'Agents', 'Settings']) {
      await page.getByRole('button', { name, exact: true }).click()
      await expect(page.getByRole('heading', { level: 1, name, exact: true })).toBeVisible()
    }
    await page.getByRole('button', { name: /Open draft:/ }).click()
    await expect(page.getByRole('textbox')).toHaveValue(
      'A synthetic unsent idea for UI verification'
    )
    await page.getByRole('button', { name: 'New Conversation' }).click()
    await expect(page.getByRole('textbox')).toHaveValue('')
    await page.getByRole('button', { name: /Open draft:/ }).click()
    await expect(page.getByRole('textbox')).toHaveValue(
      'A synthetic unsent idea for UI verification'
    )
    await expect(page.getByText('No saved conversations yet')).toBeVisible()
    await expect(page.getByText('Unsent draft')).toBeVisible()
    expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1)
  } finally {
    await app.close()
  }
})

test('P1-DOCK: per-draft restoration, page-local resets, tabs, keyboard/pointer sizing and manual hide', async () => {
  const { app, page } = await launch()
  try {
    await contentSize(app, page, 1366, 768)
    await page.getByRole('textbox').fill('Dock state draft')
    await page.getByRole('button', { name: 'Open Right Dock' }).click()
    await page.getByRole('tab', { name: 'Files', exact: true }).click()
    const separator = page.getByRole('separator', { name: 'Resize Right Dock' })
    await separator.focus()
    await page.keyboard.press('Home')
    await expect(separator).toHaveAttribute('aria-valuenow', '320')
    await page.keyboard.press('ArrowLeft')
    await expect(separator).toHaveAttribute('aria-valuenow', '336')
    const box = (await separator.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + 30)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 - 40, box.y + 30)
    await page.mouse.up()
    const resizedWidth = Number(await separator.getAttribute('aria-valuenow'))
    expect(resizedWidth).toBeGreaterThanOrEqual(375)
    expect(resizedWidth).toBeLessThanOrEqual(377)
    await page.getByRole('button', { name: 'Agents', exact: true }).click()
    await expect(page.getByRole('complementary', { name: 'Right Dock' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Open Right Dock' }).click()
    await page.getByRole('button', { name: /Open draft:/ }).click()
    await expect(page.getByRole('tab', { name: 'Files' })).toHaveAttribute('aria-selected', 'true')
    await expect(separator).toHaveAttribute('aria-valuenow', String(resizedWidth))
    await page.getByRole('button', { name: 'Close Right Dock' }).click()
    await page.getByRole('button', { name: 'Projects', exact: true }).click()
    await page.getByRole('button', { name: 'Open Files panel' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Files' })).toHaveAttribute('aria-selected', 'true')
    await page.getByRole('button', { name: /Open draft:/ }).click()
    await expect(page.getByRole('complementary', { name: 'Right Dock' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Open Right Dock' }).click()
    await page.getByRole('tab', { name: 'Terminal', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Interactive Shell' })).toBeDisabled()
    await page.screenshot({ path: join(screenshots, 'home-agent-logs.png') })
  } finally {
    await app.close()
  }
})

test('P1-FIT: actual Electron viewport fit at all approved CSS sizes and safe constrained fallback', async () => {
  const { app, page } = await launch()
  try {
    for (const [width, height, sidebar] of [
      [1920, 1080, 256],
      [1366, 768, 256],
      [1100, 700, 64],
      [1000, 600, 64]
    ]) {
      await contentSize(app, page, width, height)
      if (!(await page.getByRole('complementary', { name: 'Right Dock' }).count()))
        await page.getByRole('button', { name: 'Open Right Dock' }).click()
      const center = (await page.locator('main').boundingBox())!
      const sidebarBox = (await page.getByRole('complementary', { name: 'Sidebar' }).boundingBox())!
      expect(sidebarBox.width).toBe(sidebar)
      expect(center.width).toBeGreaterThanOrEqual(580)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      )
      const composer = (await page.getByRole('textbox').boundingBox())!
      expect(composer.x).toBeGreaterThanOrEqual(center.x)
      expect(composer.x + composer.width).toBeLessThanOrEqual(center.x + center.width)
      expect(composer.y + composer.height).toBeLessThanOrEqual(height)
      await page.screenshot({ path: join(screenshots, `layout-${width}x${height}.png`) })
    }
    await page.getByRole('button', { name: 'Expand sidebar' }).click()
    await expect(page.getByRole('complementary', { name: 'Right Dock' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Collapse sidebar' })).toBeVisible()
    await contentSize(app, page, 980, 600)
    await page.getByRole('button', { name: 'Open Right Dock' }).click()
    await expect(page.getByRole('status')).toContainText('Make the window wider')
    await expect(page.getByRole('complementary', { name: 'Right Dock' })).toHaveCount(0)
  } finally {
    await app.close()
  }
})

test('P1-A11Y: keyboard navigation, focus, reduced motion and automated accessibility on every page', async () => {
  const { app, page } = await launch()
  try {
    await contentSize(app, page, 1366, 768)
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Skip to workspace' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('main')).toBeFocused()
    const axe = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
    // Playwright evaluation is a test-only isolated action; production CSP is unchanged.
    await page.evaluate(axe)
    for (const name of ['Home', 'Projects', 'Agents', 'Settings']) {
      if (name !== 'Home') {
        await page.getByRole('button', { name, exact: true }).focus()
        await page.keyboard.press('Enter')
        await expect(page.getByRole('heading', { level: 2 }).first()).toBeFocused()
      }
      const violations = await page.evaluate(async () =>
        (window as any).axe
          .run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })
          .then((r: any) =>
            r.violations.map((v: any) => ({
              id: v.id,
              impact: v.impact,
              targets: v.nodes.map((n: any) => n.target)
            }))
          )
      )
      expect(violations, `${name} accessibility`).toEqual([])
      await page.screenshot({ path: join(screenshots, `${name.toLowerCase()}-page.png`) })
    }
    await page.getByRole('switch', { name: 'Reduce motion' }).focus()
    await page.keyboard.press('Space')
    await expect(page.locator('.app')).toHaveClass(/reduce-motion/)
    expect(
      await page
        .locator('.wave')
        .first()
        .evaluate((el) => getComputedStyle(el).animationName)
    ).toBe('none')
    await page.getByRole('switch', { name: 'Ambient light' }).click()
    expect(
      await page.locator('.ambient-waves').evaluate((el) => getComputedStyle(el).visibility)
    ).toBe('hidden')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.getByRole('switch', { name: 'Reduce motion' }).click()
    expect(
      await page
        .locator('.wave')
        .first()
        .evaluate((el) => getComputedStyle(el).animationName)
    ).toBe('none')
    await page.getByRole('button', { name: 'Open Right Dock' }).click()
    await page.getByRole('tab', { name: 'Terminal', exact: true }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('tab', { name: 'Files' })).toBeFocused()
  } finally {
    await app.close()
  }
})

for (const scale of [1, 1.25, 1.5]) {
  test(`P1-DPI: Windows Electron forced device scale ${scale} with usable effective viewport`, async () => {
    const { app, page } = await launch(scale)
    try {
      await contentSize(app, page, 1100, 700)
      expect(await page.evaluate(() => devicePixelRatio)).toBeCloseTo(scale, 1)
      await page.getByRole('button', { name: 'Open Right Dock' }).click()
      expect((await page.locator('main').boundingBox())!.width).toBeGreaterThanOrEqual(580)
      await expect(page.getByRole('textbox')).toBeVisible()
      await page.getByRole('textbox').fill('DPI verification draft')
      await page.getByRole('button', { name: 'Agents', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Agents', level: 1 })).toBeVisible()
    } finally {
      await app.close()
    }
  })
}

test('P1-RELOAD: renderer reload does not claim restored messages, model or task execution', async () => {
  const { app, page } = await launch()
  try {
    await page.getByRole('textbox').fill('Transient text, not durable history')
    await page.reload()
    await expect(page.getByRole('textbox')).toHaveValue('')
    await expect(page.getByText('No saved conversations yet')).toBeVisible()
    await expect(page.getByText('Engine not connected')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Send message' })).toBeDisabled()
    await expect(page.getByRole('button', { name: /Model unavailable/ })).toBeDisabled()
  } finally {
    await app.close()
  }
})
