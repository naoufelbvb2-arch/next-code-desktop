import { z } from 'zod'
import { readFileSync, realpathSync, statSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'

// Private Main-owned local configuration. Never accepted from Renderer/IPC.
export const codingConfig = z
  .object({
    engineRoot: z.string().min(1).max(1024),
    sitePackages: z.string().min(1).max(1024),
    provider: z.literal('deepseek_official_v1'),
    baseUrl: z.literal('https://api.deepseek.com'),
    model: z.literal('deepseek-flash'),
    secretFile: z.string().min(1).max(1024),
    budgetFile: z.string().min(1).max(1024),
    workspaceRoot: z.string().min(1).max(1024),
    writableFiles: z
      .array(z.string().regex(/^[a-zA-Z0-9_-]+\.py$/))
      .min(1)
      .max(4),
    verificationFile: z.string().regex(/^[a-zA-Z0-9_-]+\.py$/),
    verificationSha256: z.string().regex(/^[a-f0-9]{64}$/),
    command: z.string().min(1).max(1024),
    policy: z.literal('pure-python-functions-v1')
  })
  .strict()
export type CodingConfiguration = z.infer<typeof codingConfig>
export function codingKey(file: string): string {
  if (!isAbsolute(file) || statSync(file).size > 1024) throw new Error('CODING_NOT_READY')
  const key = /^DEEPSEEK_API_KEY=(sk-[A-Za-z0-9_-]+)\r?\n?$/.exec(readFileSync(file, 'utf8'))?.[1]
  if (!key) throw new Error('CODING_NOT_READY')
  return key
}
export function codingBudget(file: string): void {
  if (!isAbsolute(file) || statSync(file).size > 65536) throw new Error('CODING_NOT_READY')
  const data = JSON.parse(readFileSync(file, 'utf8'))
  if (
    data.version !== 1 ||
    data.requestLimit !== 12 ||
    data.tokenLimit !== 60000 ||
    data.outputLimit !== 2048 ||
    !Array.isArray(data.requests) ||
    data.requests.length >= 12 ||
    data.taskId !== null ||
    data.requests.some((r: { status: string }) => r.status !== 'completed')
  )
    throw new Error('CODING_NOT_READY')
}
export function codingScope(config: CodingConfiguration, root: string): void {
  if (realpathSync(root).toLowerCase() !== realpathSync(config.workspaceRoot).toLowerCase())
    throw new Error('CODING_SCOPE_DENIED')
  if (
    !isAbsolute(config.workspaceRoot) ||
    !isAbsolute(config.budgetFile) ||
    !isAbsolute(config.secretFile) ||
    config.writableFiles.includes(config.verificationFile) ||
    !statSync(join(root, config.verificationFile)).isFile()
  )
    throw new Error('CODING_SCOPE_DENIED')
}
