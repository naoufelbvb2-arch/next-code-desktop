import { createHash } from 'node:crypto'
import { validUnicode } from '../../../contracts/common'

export const POLICY = 'iis07-win32-v1'
export type BrokerCode =
  | 'NOT_AUTHORIZED'
  | 'WORKSPACE_MISMATCH'
  | 'SENSITIVE_CONTENT'
  | 'STALE_SOURCE'
  | 'RESOURCE_LIMIT'
  | 'BROKER_IO_ERROR'
export class BrokerError extends Error {
  constructor(readonly code: BrokerCode) {
    super(code)
  }
}
export function deny(code: BrokerCode): never {
  throw new BrokerError(code)
}
export const digest = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex')
export function selector(value: string, directory = false): string[] {
  if (directory && value === '.') return []
  if (
    !value ||
    !validUnicode(value) ||
    Buffer.byteLength(value) > 1024 ||
    value.normalize('NFC') !== value ||
    /[\\:\p{Cc}\p{Cf}<>"|?*]/u.test(value) ||
    /^[~/]/.test(value)
  )
    deny('NOT_AUTHORIZED')
  const parts = value.split('/')
  if (
    parts.length > 32 ||
    parts.some(
      (p) =>
        !p ||
        p === '.' ||
        p === '..' ||
        /[ .]$/.test(p) ||
        Buffer.byteLength(p) > 255 ||
        /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(p)
    )
  )
    deny('NOT_AUTHORIZED')
  return parts
}
const protectedNames = new Set([
  '.git',
  '.ssh',
  '.aws',
  '.azure',
  '.gnupg',
  '.kube',
  '.docker',
  '.codex',
  'credentials',
  'credential-store',
  'keychains',
  'keychain',
  'tokens',
  '.tokens',
  'secrets',
  '.secrets',
  'login data',
  'cookies',
  'web data',
  'local state',
  'ntuser.dat',
  'security',
  'sam',
  'system32',
  'syswow64'
])
const generated = new Set([
  'node_modules',
  'vendor',
  '.venv',
  '__pycache__',
  'dist',
  'out',
  '.cache'
])
export function sensitivePath(value: string, discovery = false): boolean {
  return value.split(/[\\/]/).some((part) => {
    const p = part.toLowerCase()
    return (
      protectedNames.has(p) ||
      /sk-[a-z\d_-]{16,}|(?:api[-_]?key|auth[-_]?token|password)[-_=]/i.test(p) ||
      (discovery && generated.has(p)) ||
      /^\.env(?:\.|$)/.test(p) ||
      /\.(?:pem|p12|pfx|key|lnk|url|sqlite|sqlite3|db)$/i.test(p) ||
      /^(?:id_rsa|id_ed25519|id_dsa|id_ecdsa)(?:\.|$)/.test(p) ||
      /^(?:credentials|service[-_]?account|application_default_credentials)(?:\.|$)/.test(p)
    )
  })
}
export function screen(bytes: Buffer): string {
  if (bytes.length > 8 * 1024 * 1024) deny('RESOURCE_LIMIT')
  let content: string
  try {
    const encoding =
      bytes[0] === 0xff && bytes[1] === 0xfe
        ? 'utf-16le'
        : bytes[0] === 0xfe && bytes[1] === 0xff
          ? 'utf-16be'
          : 'utf-8'
    content = new TextDecoder(encoding, { fatal: true }).decode(bytes)
  } catch {
    deny('SENSITIVE_CONTENT')
  }
  if (!validUnicode(content) || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(content))
    deny('SENSITIVE_CONTENT')
  const decoded = content
    .replace(/\\u([a-f\d]{4})/gi, (_, h: string) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\x([a-f\d]{2})/gi, (_, h: string) => String.fromCharCode(parseInt(h, 16)))
  for (const view of [content, decoded]) {
    if (
      /-----BEGIN (?:[A-Z ]{0,64}PRIVATE KEY|OPENSSH PRIVATE KEY)-----|\b(?:sk-[A-Za-z0-9_-]{16}|(?:AKIA|ASIA)[A-Z\d]{16}|gh[pousr]_[A-Za-z\d]{20}|github_pat_[A-Za-z\d_]{20}|xox[baprs]-[A-Za-z\d-]{12})|\bBearer\s+[A-Za-z\d._~+\/-]{8}|\b[a-z][a-z\d+.-]{0,20}:\/\/[^\s:/]{1,256}:[^\s@/]{3,512}@/i.test(
        view
      )
    )
      deny('SENSITIVE_CONTENT')
    if (
      /["']?(?:api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|secret[_-]?key|password|passwd|private[_-]?key|aws_secret_access_key)["']?\s*[:=]\s*["']?[^\s"'`,;}{]{4}/i.test(
        view
      )
    )
      deny('SENSITIVE_CONTENT')
    for (const match of view.matchAll(/[A-Za-z\d+/_=-]{24,256}/g)) {
      const near = view.slice(Math.max(0, match.index! - 100), match.index!)
      if (!/(?:secret|credential|auth|token|password)/i.test(near)) continue
      const token = match[0],
        counts = new Map<string, number>()
      for (const ch of token) counts.set(ch, (counts.get(ch) ?? 0) + 1)
      let entropy = 0
      for (const n of counts.values()) {
        const p = n / token.length
        entropy -= p * Math.log2(p)
      }
      if (entropy >= 3.5) deny('SENSITIVE_CONTENT')
    }
  }
  return content.replace(/\r\n?/g, '\n')
}
export function excerpt(text: string, start: number, end: number, maxChars = 16384) {
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 1 ||
    end < start ||
    end - start >= 200 ||
    !Number.isSafeInteger(maxChars) ||
    maxChars < 1 ||
    maxChars > 16384
  )
    deny('RESOURCE_LIMIT')
  let offset = 0,
    line = 1,
    content = '',
    emitted = 0,
    count = 0
  while (line < start && offset < text.length) {
    const newline = text.indexOf('\n', offset)
    if (newline < 0) {
      offset = text.length
      break
    }
    offset = newline + 1
    line++
  }
  if (line !== start || offset >= text.length) deny('RESOURCE_LIMIT')
  while (line <= end && offset < text.length) {
    const newline = text.indexOf('\n', offset),
      stop = newline < 0 ? text.length : newline + 1
    const segment = text.slice(offset, stop)
    let chars = 0
    for (const _point of segment) {
      void _point
      if (count + ++chars > maxChars) break
    }
    if (count + chars > maxChars) break
    content += segment
    count += chars
    emitted++
    line++
    offset = stop
  }
  if (!emitted || !content) deny('RESOURCE_LIMIT')
  return {
    start_line: start,
    end_line: start + emitted - 1,
    content,
    truncated: start + emitted - 1 < end,
    excerpt_sha256: digest(Buffer.from(content))
  }
}
