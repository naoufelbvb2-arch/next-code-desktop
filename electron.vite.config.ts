import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { randomBytes } from 'node:crypto'

export default defineConfig(({ command }) => {
  const nonce = randomBytes(24).toString('base64')
  return {
    main: {
      build: {
        rollupOptions: {
          input: {
            index: resolve('electron/main/index.ts'),
            'broker-worker': resolve('electron/main/broker/worker.ts')
          }
        }
      }
    },
    preload: {
      build: {
        externalizeDeps: false,
        rollupOptions: {
          input: resolve('electron/preload/index.ts'),
          output: { format: 'cjs', entryFileNames: 'index.cjs' }
        }
      }
    },
    renderer: {
      root: 'renderer',
      html: command === 'serve' ? { cspNonce: nonce } : {},
      plugins: [
        react(),
        {
          name: 'development-csp-nonce',
          apply: 'serve',
          transformIndexHtml: {
            order: 'pre',
            handler: (html) =>
              html
                .replace("script-src 'self'", `script-src 'self' 'nonce-${nonce}'`)
                .replace("connect-src 'none'", "connect-src 'self' ws://127.0.0.1:5173")
          }
        }
      ],
      server: { host: '127.0.0.1', port: 5173, strictPort: true },
      build: { rollupOptions: { input: resolve('renderer/index.html') } }
    }
  }
})
