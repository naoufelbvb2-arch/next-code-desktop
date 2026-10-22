import { createHash } from 'node:crypto'
import { readFileSync, statSync, realpathSync } from 'node:fs'
import { dirname, isAbsolute, join } from 'node:path'
import { z } from 'zod'
import { WindowsProcess, type LaunchSpec } from './windows-process'

export class RuntimeError extends Error {
  constructor(readonly code = 'RUNTIME_NOT_READY') {
    super(code)
  }
}
const sha = z.string().regex(/^[a-f0-9]{64}$/)
const configSchema = z
  .object({ pythonPath: z.string().min(1).max(1024), pythonSha256: sha })
  .strict()
const manifestSchema = z
  .object({
    protocol: z.literal(1),
    pythonMinimum: z.tuple([z.literal(3), z.literal(11)]),
    bridgeFile: z.literal('desktop_bridge.py'),
    bridgeSha256: sha,
    mode: z.literal('discussion_no_provider'),
    engine: z
      .object({
        required: z.literal(false),
        compatibleRevision: z.string().regex(/^[a-f0-9]{40}$/)
      })
      .strict()
  })
  .strict()
export interface VerifiedRuntime {
  readonly executable: string
  readonly executableSha256: string
  readonly bridge: string
  readonly bridgeSha256: string
  readonly version: readonly number[]
  readonly env: Record<string, string>
}
export function digestFile(path: string): string {
  const size = statSync(path).size
  if (size > 64 * 1024 * 1024 || !statSync(path).isFile()) throw new RuntimeError()
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}
export function baselineEnvironment(): Record<string, string> {
  const env: Record<string, string> = {}
  for (const key of ['SystemRoot', 'WINDIR', 'TEMP', 'TMP']) {
    const value = process.env[key]
    if (value && !value.includes('\0')) env[key] = value
  }
  return env
}
export async function probe(spec: LaunchSpec): Promise<Buffer> {
  const child = new WindowsProcess(spec),
    chunks: Buffer[] = []
  let size = 0,
    invalid = false
  const failed = () => {
    invalid = true
    child.terminate()
  }
  child.stdout.on('error', failed)
  child.stderr.on('error', failed)
  child.stderr.resume() // No raw probe diagnostics retained or published.
  child.stdout.on('data', (chunk: Buffer) => {
    size += chunk.length
    if (size > 4096) {
      invalid = true
      child.terminate()
    } else chunks.push(chunk)
  })
  try {
    const ok = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        invalid = true
        child.terminate()
        resolve(false)
      }, 5000)
      let exit: number | undefined,
        ended = false
      const settle = () => {
        if (exit !== undefined && ended) {
          clearTimeout(timer)
          resolve(exit === 0)
        }
      }
      child.once('exit', (code: number) => {
        exit = code
        settle()
      })
      child.stdout.once('end', () => {
        ended = true
        settle()
      })
    })
    if (!ok || invalid) throw new RuntimeError()
    return Buffer.concat(chunks)
  } finally {
    await child.stop()
    child.dispose()
  }
}
// Called only by Main with application-owned bridge directory and explicit local
// owner configuration. Neither path is accepted by any Renderer method.
export async function resolveRuntime(
  configPath: string,
  bridgeDirectory: string
): Promise<VerifiedRuntime> {
  try {
    if (!isAbsolute(configPath) || !isAbsolute(bridgeDirectory)) throw new RuntimeError()
    if (statSync(configPath).size > 4096) throw new RuntimeError()
    const config = configSchema.parse(JSON.parse(readFileSync(configPath, 'utf8')))
    if (!isAbsolute(config.pythonPath) || !/\.exe$/i.test(config.pythonPath))
      throw new RuntimeError()
    const executable = realpathSync(config.pythonPath)
    if (digestFile(executable) !== config.pythonSha256) throw new RuntimeError()
    const manifestPath = join(bridgeDirectory, 'compatibility.json')
    if (statSync(manifestPath).size > 4096) throw new RuntimeError()
    const manifest = manifestSchema.parse(JSON.parse(readFileSync(manifestPath, 'utf8')))
    const bridge = realpathSync(join(bridgeDirectory, manifest.bridgeFile))
    if (
      dirname(bridge) !== realpathSync(bridgeDirectory) ||
      digestFile(bridge) !== manifest.bridgeSha256
    )
      throw new RuntimeError()
    const env = baselineEnvironment(),
      cwd = dirname(bridge)
    const version = JSON.parse(
      (
        await probe({
          executable,
          cwd,
          env,
          args: ['-I', '-S', '-c', 'import sys,json;print(json.dumps(list(sys.version_info[:3])))']
        })
      ).toString('utf8')
    )
    if (
      !Array.isArray(version) ||
      version.length !== 3 ||
      !version.every(Number.isInteger) ||
      version[0] !== 3 ||
      version[1] < 11
    )
      throw new RuntimeError()
    const description = JSON.parse(
      (
        await probe({ executable, cwd, env, args: ['-I', '-S', '-u', bridge, '--describe'] })
      ).toString('utf8')
    )
    if (
      JSON.stringify(description) !==
      JSON.stringify({ protocol: 1, roles: ['discussion'], provider: false, engine: false })
    )
      throw new RuntimeError()
    return Object.freeze({
      executable,
      executableSha256: config.pythonSha256,
      bridge,
      bridgeSha256: manifest.bridgeSha256,
      version: Object.freeze(version),
      env: Object.freeze(env)
    })
  } catch {
    throw new RuntimeError()
  }
}
export function launchSpec(
  runtime: VerifiedRuntime,
  role: 'discussion' | 'coding_task'
): LaunchSpec {
  // Recheck launch bytes; no inherited PATH, PYTHONPATH, credentials or shell.
  if (
    digestFile(runtime.executable) !== runtime.executableSha256 ||
    digestFile(runtime.bridge) !== runtime.bridgeSha256
  )
    throw new RuntimeError()
  return {
    executable: runtime.executable,
    cwd: dirname(runtime.bridge),
    env: runtime.env,
    args: ['-I', '-S', '-u', runtime.bridge, '--role', role]
  }
}
