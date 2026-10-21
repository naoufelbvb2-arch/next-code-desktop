import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

// Some developer tools inherit this flag. Restrict the fix to this child
// command; never change the user's global environment or Electron sandbox.
delete process.env.ELECTRON_RUN_AS_NODE
const require = createRequire(import.meta.url)
const cli = join(dirname(require.resolve('electron-vite/package.json')), 'bin/electron-vite.js')
process.argv = [process.execPath, cli, ...process.argv.slice(2)]
await import(pathToFileURL(cli).href)
