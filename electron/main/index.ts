import { app, BrowserWindow, Menu, screen, session } from 'electron'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { protectSession, protectWindow } from './window-security'

app.enableSandbox()

// An optional isolated profile is used by the Electron test runner only.
const profile = process.argv.find((arg) => arg.startsWith('--p1-test-profile='))
if (profile) app.setPath('userData', profile.slice('--p1-test-profile='.length))

async function createWindow(): Promise<void> {
  const developmentUrl = process.env.ELECTRON_RENDERER_URL
  if (developmentUrl && !/^http:\/\/127\.0\.0\.1:5173\/?$/.test(developmentUrl)) {
    throw new Error('Unexpected development asset origin')
  }
  const entry =
    developmentUrl ?? pathToFileURL(join(import.meta.dirname, '../renderer/index.html')).href
  const isolatedSession = session.fromPartition('next-code-ui')
  protectSession(isolatedSession, entry, developmentUrl)
  const window = new BrowserWindow({
    title: 'Next Code Desktop',
    width: 1280,
    height: 820,
    backgroundColor: '#090D18',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.cjs'),
      session: isolatedSession,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      navigateOnDragDrop: false
    }
  })
  protectWindow(window, entry)
  window.once('ready-to-show', () => {
    // The 1000×600 CSS floor passed P1 viewport QA. Measure native chrome rather
    // than assuming physical pixels equal CSS pixels at fractional Windows DPI.
    const bounds = window.getBounds()
    const content = window.getContentBounds()
    const workArea = screen.getDisplayMatching(bounds).workAreaSize
    window.setMinimumSize(
      Math.min(1000 + bounds.width - content.width, workArea.width),
      Math.min(600 + bounds.height - content.height, workArea.height)
    )
    window.maximize()
    window.show()
  })
  await window.loadURL(entry)
}

app
  .whenReady()
  .then(async () => {
    Menu.setApplicationMenu(null)
    await createWindow()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) void createWindow()
    })
  })
  .catch(() => {
    console.error('Next Code Desktop could not open its local interface.')
    app.exit(1)
  })

app.on('window-all-closed', () => app.quit())
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-attach-webview', (event) => event.preventDefault())
})
