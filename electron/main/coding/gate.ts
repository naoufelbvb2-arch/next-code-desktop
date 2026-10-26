import { StoreError } from '../storage/database'
import { readFileSync, realpathSync, readdirSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { baselineEnvironment, digestFile, probe, type VerifiedRuntime } from '../supervisor/runtime'
import type { LaunchSpec } from '../supervisor/windows-process'
import { codingBudget, codingKey, codingScope, codingConfig } from './config'

export const CODING_BLOCKED_MESSAGE =
  'Real coding is unavailable: a verified engine lifecycle and cooperative cancellation runtime and an authorized coding model route are required. No task was admitted or started.'
export class CodingUnavailable extends StoreError {
  constructor(readonly explanation = CODING_BLOCKED_MESSAGE) {
    super('RUNTIME_NOT_READY')
  }
}
export function requireCodingEngine(): never {
  throw new CodingUnavailable()
}

export const TESTED_ENGINE_COMMIT = '99e00e13f8a39fa6730f3d3de773ac937b5ac915'
export interface VerifiedCodingRuntime {
  readonly engineRoot: string
  readonly engineCommit: typeof TESTED_ENGINE_COMMIT
  readonly launch: () => LaunchSpec
  readonly verify: () => void
  readonly requireProvider: (root: string) => void
}
const verified = new WeakSet<VerifiedCodingRuntime>()
export function requireVerifiedCoding(runtime: VerifiedCodingRuntime): void {
  if (!verified.has(runtime)) throw new CodingUnavailable()
  runtime.verify()
}
// Main-owned local settings only. The exact tested version plus complete Python
// source inventory is required again at launch; no Renderer/config boolean opens it.
export async function verifyCodingRuntime(
  runtime: VerifiedRuntime,
  bridgeDirectory: string,
  settings: { engineRoot: string; sitePackages: string; gitPath?: string }
): Promise<VerifiedCodingRuntime> {
  const engineRoot = realpathSync(settings.engineRoot),
    directory = realpathSync(bridgeDirectory),
    bridge = join(directory, 'coding_bridge.py'),
    manifestPath = join(directory, 'coding-compatibility.json'),
    manifestHash = digestFile(manifestPath),
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      protocol: number
      engineCommit: string
      executionControl: number
      verifiedObserver: number
      engineFiles: Record<string, string>
      bridgeFiles: Record<string, string>
      gitExecutableSha256: string
    }
  if (
    manifest.protocol !== 1 ||
    manifest.engineCommit !== TESTED_ENGINE_COMMIT ||
    manifest.executionControl !== 1 ||
    manifest.verifiedObserver !== 1
  )
    throw new CodingUnavailable()
  const gitExecutable = realpathSync(settings.gitPath ?? 'C:/Program Files/Git/cmd/git.exe')
  const verify = () => {
    if (
      digestFile(manifestPath) !== manifestHash ||
      digestFile(runtime.executable) !== runtime.executableSha256 ||
      digestFile(gitExecutable) !== manifest.gitExecutableSha256
    )
      throw new CodingUnavailable()
    let head = readFileSync(join(engineRoot, '.git', 'HEAD'), 'ascii').trim()
    if (head.startsWith('ref: ')) {
      const ref = head.slice(5)
      if (!/^refs\/heads\/[A-Za-z0-9_/-]+$/.test(ref) || ref.includes('..'))
        throw new CodingUnavailable()
      try {
        head = readFileSync(join(engineRoot, '.git', ref), 'ascii').trim()
      } catch {
        head =
          readFileSync(join(engineRoot, '.git', 'packed-refs'), 'ascii')
            .split('\n')
            .find((line) => line.endsWith(' ' + ref))
            ?.split(' ')[0] ?? ''
      }
    }
    if (head !== TESTED_ENGINE_COMMIT) throw new CodingUnavailable()
    const actual: string[] = []
    const walk = (folder: string) => {
      for (const entry of readdirSync(folder, { withFileTypes: true })) {
        if (entry.isSymbolicLink()) throw new CodingUnavailable()
        if (entry.isDirectory() && entry.name !== '__pycache__') walk(join(folder, entry.name))
        else if (entry.isFile() && entry.name.endsWith('.py'))
          actual.push(relative(engineRoot, join(folder, entry.name)).replaceAll('\\', '/'))
      }
    }
    for (const folder of ['kernel', 'brain', 'architect', 'squad']) walk(join(engineRoot, folder))
    actual.push(...readdirSync(engineRoot).filter((name) => name.endsWith('.py')))
    if (JSON.stringify(actual.sort()) !== JSON.stringify(Object.keys(manifest.engineFiles).sort()))
      throw new CodingUnavailable()
    for (const [path, hash] of Object.entries(manifest.engineFiles)) {
      const file = realpathSync(join(engineRoot, path))
      if (
        !/^(?:[a-z_]+\/)*[a-z_]+\.py$/.test(path) ||
        !resolve(file).startsWith(engineRoot + '\\') ||
        digestFile(file) !== hash
      )
        throw new CodingUnavailable()
    }
    for (const [path, hash] of Object.entries(manifest.bridgeFiles))
      if (
        !/^[a-z_]+\.py$/.test(path) ||
        dirname(realpathSync(join(directory, path))) !== directory ||
        digestFile(join(directory, path)) !== hash
      )
        throw new CodingUnavailable()
  }
  verify()
  const route = runtime.coding ? codingConfig.parse(runtime.coding) : undefined
  const requireProvider = (root: string) => {
    verify()
    if (!route)
      throw new CodingUnavailable(
        'The coding model route is not configured. No task was admitted or started.'
      )
    try {
      codingScope(route, root)
      for (const protectedRoot of [engineRoot, dirname(directory)]) {
        const rel = relative(protectedRoot, realpathSync(root))
        if (!rel || (!isAbsolute(rel) && rel !== '..' && !rel.startsWith('..' + sep)))
          throw new Error('CODING_SCOPE_DENIED')
      }
      if (
        route.command !==
        `"${runtime.executable.replaceAll('\\', '/')}" -B ${route.verificationFile}`
      )
        throw new Error('CODING_COMMAND_DENIED')
      codingKey(route.secretFile)
      codingBudget(route.budgetFile)
      if (
        digestFile(join(route.workspaceRoot, route.verificationFile)) !== route.verificationSha256
      )
        throw new Error('CODING_SCOPE_DENIED')
    } catch {
      throw new CodingUnavailable(
        'The coding model route, authorized workspace or mission budget is unavailable. No task was admitted or started.'
      )
    }
  }
  const spec: LaunchSpec = {
    executable: runtime.executable,
    cwd: directory,
    env: {
      ...baselineEnvironment(),
      PATH: [dirname(gitExecutable), dirname(runtime.executable)].join(';'),
      NCD_CODING_CONFIG: JSON.stringify({
        engineRoot,
        sitePackages: realpathSync(settings.sitePackages)
      })
    },
    args: ['-I', '-S', '-u', bridge, '--role', 'coding_task']
  }
  const description = JSON.parse(
    (await probe({ ...spec, args: ['-I', '-S', '-u', bridge, '--describe'] })).toString('utf8')
  )
  if (
    JSON.stringify(description) !==
    JSON.stringify({
      protocol: 1,
      roles: ['coding_task'],
      provider: false,
      engine: true,
      executionControl: 1,
      verifiedObserver: 1
    })
  )
    throw new CodingUnavailable()
  const result = Object.freeze({
    engineRoot,
    engineCommit: TESTED_ENGINE_COMMIT,
    verify,
    requireProvider,
    launch: () => {
      verify()
      if (!route) return spec
      requireProvider(route.workspaceRoot)
      const { secretFile, engineRoot: _engine, sitePackages: _site, ...routeSettings } = route
      return {
        ...spec,
        env: {
          ...spec.env,
          DEEPSEEK_API_KEY: codingKey(secretFile),
          NCD_CODING_CONFIG: JSON.stringify({
            engineRoot,
            sitePackages: realpathSync(settings.sitePackages),
            route: routeSettings
          })
        }
      }
    }
  })
  verified.add(result)
  return result
}
