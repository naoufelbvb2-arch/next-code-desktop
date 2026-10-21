import type { BrowserWindow, Session } from 'electron'
import { dirname, isAbsolute, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export function isAllowedLocalAsset(candidate: string, entry: string): boolean {
  try {
    const target = new URL(candidate)
    if (target.protocol !== 'file:' || target.search) return false
    const path = fileURLToPath(target)
    if (path.includes('\0')) return false
    const within = relative(dirname(fileURLToPath(entry)), path)
    return within !== '..' && !within.startsWith(`..${sep}`) && !isAbsolute(within)
  } catch {
    return false
  }
}

export function isAllowedDocument(candidate: string, entry: string): boolean {
  try {
    const url = new URL(candidate)
    const allowed = new URL(entry)
    return (
      url.origin === allowed.origin &&
      url.protocol === allowed.protocol &&
      url.host === allowed.host &&
      url.pathname === allowed.pathname &&
      url.search === allowed.search
    )
  } catch {
    return false
  }
}

export function protectSession(session: Session, entry: string, developmentOrigin?: string): void {
  session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false))
  session.setPermissionCheckHandler(() => false)
  session.on('will-download', (event) => event.preventDefault())
  session.webRequest.onBeforeRequest((details, callback) => {
    let allowed = false
    try {
      const url = new URL(details.url)
      allowed = !developmentOrigin && isAllowedLocalAsset(details.url, entry)
      if (developmentOrigin) {
        const origin = new URL(developmentOrigin)
        allowed ||=
          url.origin === origin.origin || (url.protocol === 'ws:' && url.host === origin.host)
      }
    } catch {
      /* Reject malformed and unsupported requests. */
    }
    callback({ cancel: !allowed })
  })
}

export function protectWindow(window: BrowserWindow, entry: string): void {
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event) => {
    if (!isAllowedDocument(event.url, entry)) event.preventDefault()
  })
  window.webContents.on('will-frame-navigate', (event) => {
    if (!isAllowedDocument(event.url, entry)) event.preventDefault()
  })
  window.webContents.on('will-redirect', (event) => event.preventDefault())
  window.webContents.on('will-attach-webview', (event) => event.preventDefault())
}
