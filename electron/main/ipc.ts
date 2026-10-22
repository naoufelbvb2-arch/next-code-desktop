import { ipcMain, type BrowserWindow } from 'electron'
import { IPC, PUSH, type Method, type PushKind } from '../../contracts/ipc'
import { isAllowedDocument } from './window-security'
import { IpcBoundary, type Caller } from './ipc-boundary'
import { dispatchStorage, authorizedConversation } from './storage/runtime'

const windows = new Map<number, { window: BrowserWindow; entry: string }>()
export const ipcBoundary = new IpcBoundary(
  (event) => {
    const allowed = windows.get(event.sender.id)
    if (!allowed || allowed.window.isDestroyed() || event.sender.isDestroyed()) return false
    const contents = allowed.window.webContents
    return (
      contents === event.sender &&
      event.senderFrame === contents.mainFrame &&
      !contents.mainFrame.detached &&
      isAllowedDocument(contents.getURL(), allowed.entry) &&
      isAllowedDocument(contents.mainFrame.url, allowed.entry)
    )
  },
  (_event, kind, id) =>
    (kind === 'runtime' && id === null) ||
    (kind === 'conversation' && !!id && authorizedConversation(id)),
  dispatchStorage
)

export function registerIpc(): void {
  for (const method of Object.keys(IPC) as Method[]) {
    ipcMain.handle(IPC[method].channel, (event, ...args: unknown[]) =>
      ipcBoundary.invoke(IPC[method].channel, event as Caller, args)
    )
  }
  // The same three frozen push channels carry private subscription registration
  // controls in the other direction; no extra channel or public method is added.
  for (const kind of Object.keys(PUSH) as PushKind[]) {
    ipcMain.on(PUSH[kind].channel, (event, ...args: unknown[]) =>
      ipcBoundary.control(kind, event as Caller, args)
    )
  }
}
export function allowIpcWindow(window: BrowserWindow, entry: string): void {
  windows.set(window.webContents.id, { window, entry })
  const id = window.webContents.id
  window.webContents.on('did-start-navigation', (details) => {
    if (details.isMainFrame && !details.isSameDocument) ipcBoundary.removeSender(id)
  })
  window.webContents.once('destroyed', () => {
    windows.delete(id)
    ipcBoundary.removeSender(id)
  })
}
