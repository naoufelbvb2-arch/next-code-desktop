import type { NextCode } from '../contracts/ipc'
declare global {
  interface Window {
    readonly nextCode: NextCode
  }
}
export {}
