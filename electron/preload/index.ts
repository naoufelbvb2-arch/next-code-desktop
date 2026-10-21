import { contextBridge, ipcRenderer } from 'electron'
import { createFacade } from './facade'

const { api, dispose } = createFacade(ipcRenderer)
contextBridge.exposeInMainWorld('nextCode', api)
window.addEventListener('unload', dispose, { once: true })
