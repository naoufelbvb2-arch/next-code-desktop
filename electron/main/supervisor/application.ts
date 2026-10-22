import { join } from 'node:path'
import { resolveRuntime } from './runtime'
import { PythonSupervisor } from './supervisor'

let supervisor: PythonSupervisor | undefined
let stopping = false
let startup: Promise<void> | undefined
// No runtime configuration is created automatically. This local Main-owned
// file is deliberately outside preferences IPC and contains no provider keys.
export function openSupervisor(profileDirectory: string, bridgeDirectory: string): void {
  startup = (async () => {
    try {
      const runtime = await resolveRuntime(
        join(profileDirectory, 'python-runtime.json'),
        bridgeDirectory
      )
      if (stopping) return
      supervisor = new PythonSupervisor({ runtime })
      await supervisor.ensureDiscussionReady()
    } catch {
      // Local UI/data remain usable. Transport readiness is not model readiness;
      // the existing bootstrap stays not_ready until P5 supplies a real route.
    }
  })()
}
export function hasActiveCodingTask(): boolean {
  return !!supervisor?.activeCodingTask
}
export async function closeSupervisor(): Promise<boolean> {
  stopping = true
  const result = (await supervisor?.stopAllOnAppQuit()) ?? true
  // An in-progress resolver probe is itself contained, capped at five seconds.
  await startup
  supervisor = undefined
  return result
}
