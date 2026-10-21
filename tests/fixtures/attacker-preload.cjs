// Isolated adversarial test window only. Never bundled into the application.
const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('testAttack', {
  invoke: (channel, value) => ipcRenderer.invoke(channel, value)
})
