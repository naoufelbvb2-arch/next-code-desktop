import koffi from 'koffi'
import { BrokerError, deny, digest, POLICY, selector, sensitivePath } from './policy'

let loaded: ReturnType<typeof load> | undefined
function load() {
  if (process.platform !== 'win32' || process.arch !== 'x64') deny('WORKSPACE_MISMATCH')
  const k = koffi.load('kernel32.dll')
  return {
    open: k.func(
      'void * __stdcall CreateFileW(str16 path, uint32 access, uint32 share, void *sa, uint32 disposition, uint32 flags, void *templateFile)'
    ),
    close: k.func('int32 __stdcall CloseHandle(void *h)'),
    info: k.func(
      'int32 __stdcall GetFileInformationByHandleEx(void *h, int32 cls, _Out_ void *buffer, uint32 size)'
    ),
    name: k.func(
      'uint32 __stdcall GetFinalPathNameByHandleW(void *h, _Out_ void *buffer, uint32 chars, uint32 flags)'
    ),
    volume: k.func(
      'int32 __stdcall GetVolumeInformationByHandleW(void *h, void *label, uint32 labelChars, void *serial, void *maxComponent, void *flags, _Out_ void *fs, uint32 fsChars)'
    ),
    type: k.func('uint32 __stdcall GetFileType(void *h)'),
    read: k.func(
      'int32 __stdcall ReadFile(void *h, _Out_ void *data, uint32 size, _Out_ uint32 *read, void *overlapped)'
    ),
    error: k.func('uint32 __stdcall GetLastError()')
  }
}
function api() {
  return (loaded ??= load())
}
export interface Identity {
  id: string
  volume: string
  canonical: string
  size: string
  mtimeNs: string
  revision: string
  directory: boolean
  links: number
}
// Private Main/worker descriptor only. Windows HANDLE values are process-wide;
// the worker remains the sole closer. No descriptor crosses public IPC/JSONL.
export interface HandleProof {
  address: bigint
  identity: Identity
  revision: boolean
}
export function verifyHandleProofs(proofs: HandleProof[], check: () => void) {
  if (!proofs.length || proofs.length > 1100) deny('RESOURCE_LIMIT')
  for (const proof of proofs) {
    check()
    const actual = inspect(proof.address),
      before = proof.identity
    if (
      actual.id !== before.id ||
      actual.volume !== before.volume ||
      actual.canonical !== before.canonical
    )
      deny('WORKSPACE_MISMATCH')
    if (proof.revision && actual.revision !== before.revision) deny('STALE_SOURCE')
  }
}
function name(handle: unknown, flags = 0) {
  const bytes = Buffer.alloc(8192),
    n = api().name(handle, bytes, 4096, flags)
  if (!n || n >= 4096) deny('WORKSPACE_MISMATCH')
  return bytes.subarray(0, n * 2).toString('utf16le')
}
export function inspect(handle: unknown): Identity {
  const n = api(),
    id = Buffer.alloc(24),
    basic = Buffer.alloc(40),
    standard = Buffer.alloc(24),
    tag = Buffer.alloc(8)
  if (
    n.type(handle) !== 1 ||
    !n.info(handle, 18, id, 24) ||
    !n.info(handle, 0, basic, 40) ||
    !n.info(handle, 1, standard, 24) ||
    !n.info(handle, 9, tag, 8)
  )
    deny('WORKSPACE_MISMATCH')
  if (tag.readUInt32LE(0) & (0x400 | 0x40 | 0x1000 | 0x4000) || standard[20]) deny('NOT_AUTHORIZED')
  if (standard[21]) {
    const flags = Buffer.alloc(4)
    if (!n.info(handle, 23, flags, 4) || flags.readUInt32LE(0) !== 0) deny('WORKSPACE_MISMATCH')
  }
  const canonical = name(handle).replace(/^\\\\\?\\/, '')
  const guid = name(handle, 1).match(/^\\\\\?\\(Volume\{[a-f\d-]+\})\\/i)?.[1]
  if (!guid || !/^[A-Za-z]:\\/.test(canonical)) deny('WORKSPACE_MISMATCH')
  const size = standard.readBigInt64LE(8),
    mtime = basic.readBigInt64LE(16)
  if (size < 0n || mtime < 116444736000000000n) deny('WORKSPACE_MISMATCH')
  const stable = Buffer.concat([
    id,
    basic.subarray(0, 8),
    basic.subarray(16, 32),
    standard.subarray(8, 20),
    tag
  ])
  return {
    id: id.toString('hex'),
    volume: guid.toLowerCase(),
    canonical,
    size: size.toString(),
    mtimeNs: ((mtime - 116444736000000000n) * 100n).toString(),
    revision: digest(stable),
    directory: !!standard[21],
    links: standard.readUInt32LE(16)
  }
}
function samePath(a: string, b: string) {
  // ASCII case variants are identities, never new authority. Non-ASCII spelling
  // must be exact; normalized long name must match (short aliases are refused).
  const fold = (s: string) => s.replace(/[A-Z]/g, (c) => c.toLowerCase())
  return fold(a) === fold(b)
}
export class WindowsTree {
  private handles: unknown[] = []
  private witnessed: { handle: unknown; info: Identity }[] = []
  private dirs = new Map<string, { handle: unknown; info: Identity }>()
  readonly root: Identity
  readonly key: string
  readonly path: string
  readonly deadline: number
  constructor(
    root: string,
    expectedKey?: string,
    deadline = performance.now() + 30000,
    private readonly aborted = () => false
  ) {
    this.deadline = deadline
    if (!/^[A-Za-z]:[\\/]/.test(root) || /[\x00-\x1f]/.test(root)) deny('WORKSPACE_MISMATCH')
    this.path = root.replace(/\//g, '\\').replace(/\\$/, '')
    if (
      /^[A-Za-z]:\\(?:Windows|ProgramData|Program Files(?: \(x86\))?)(?:\\|$)/i.test(this.path) ||
      /\\AppData(?:\\|$)/i.test(this.path)
    )
      deny('SENSITIVE_CONTENT')
    const parts = this.path.slice(3).split('\\').filter(Boolean)
    selector(parts.join('/') || '.', true)
    if (sensitivePath(parts.join('/'))) deny('SENSITIVE_CONTENT')
    try {
      let current = this.path.slice(0, 3)
      this.openDirectory(current)
      for (const part of parts) {
        current = current.replace(/\\$/, '') + '\\' + part
        this.openDirectory(current)
      }
      this.root = this.dirs.get(current)!.info
      const fs = Buffer.alloc(64)
      if (
        !api().volume(this.dirs.get(current)!.handle, null, 0, null, null, null, fs, 32) ||
        fs.toString('utf16le').split('\0')[0] !== 'NTFS'
      )
        deny('WORKSPACE_MISMATCH')
      this.key =
        'win32-v1_' + digest(`${POLICY}|${this.root.volume}|${this.root.id}|${this.root.canonical}`)
      if (expectedKey && expectedKey !== this.key) deny('WORKSPACE_MISMATCH')
    } catch (error) {
      this.close()
      if (expectedKey && error instanceof BrokerError && error.code === 'BROKER_IO_ERROR')
        deny('WORKSPACE_MISMATCH')
      throw error
    }
  }
  check() {
    if (this.aborted() || performance.now() > this.deadline) deny('RESOURCE_LIMIT')
  }
  private open(path: string, directory: boolean) {
    this.check()
    // Retain every ancestor without WRITE/DELETE sharing before opening its
    // next child; no reparse is followed, even within the workspace. This is
    // a pinned-ancestry equivalent, not a claim that name lookup is relative.
    const h = api().open(path, directory ? 0x81 : 0x80000000, 1, null, 3, 0x02200000, null)
    if (!h || koffi.address(h) === 0xffffffffffffffffn) throw new BrokerError('BROKER_IO_ERROR')
    this.handles.push(h)
    const info = inspect(h)
    if (
      info.directory !== directory ||
      !samePath(info.canonical, path) ||
      (!directory && info.links !== 1)
    )
      deny('NOT_AUTHORIZED')
    if (this.root && info.volume !== this.root.volume) deny('WORKSPACE_MISMATCH')
    this.witnessed.push({ handle: h, info })
    return { handle: h, info }
  }
  private openDirectory(path: string) {
    let entry = this.dirs.get(path)
    if (!entry) {
      entry = this.open(path, true)
      this.dirs.set(path, entry)
    }
    return entry
  }
  target(relative: string, directory = false) {
    const parts = selector(relative, directory)
    if (sensitivePath(relative)) deny('SENSITIVE_CONTENT')
    let path = this.path
    if (!parts.length) return this.dirs.get(path)!
    for (const part of parts.slice(0, -1)) {
      path += '\\' + part
      this.openDirectory(path)
    }
    path += '\\' + parts[parts.length - 1]
    return directory ? this.openDirectory(path) : this.open(path, false)
  }
  capture(
    relative: string,
    expectedMtime: string | null = null,
    onBytes?: (count: number) => void,
    beforeRead?: (identity: Identity) => void
  ) {
    const leaf = this.target(relative),
      before = leaf.info
    if (BigInt(before.size) > 8388608n) deny('RESOURCE_LIMIT')
    if (expectedMtime !== null && expectedMtime !== before.mtimeNs) deny('STALE_SOURCE')
    beforeRead?.(before)
    const bytes = Buffer.alloc(Number(before.size)),
      count = [0]
    let offset = 0
    while (offset < bytes.length) {
      this.check()
      if (
        !api().read(
          leaf.handle,
          bytes.subarray(offset, Math.min(offset + 65536, bytes.length)),
          Math.min(65536, bytes.length - offset),
          count,
          null
        ) ||
        !count[0]
      )
        deny('BROKER_IO_ERROR')
      offset += count[0]
      onBytes?.(count[0])
    }
    if (inspect(leaf.handle).revision !== before.revision) {
      bytes.fill(0)
      deny('STALE_SOURCE')
    }
    return { bytes, identity: before, handle: leaf.handle }
  }
  verify(handle: unknown, identity: Identity) {
    this.check()
    if (inspect(handle).revision !== identity.revision) deny('STALE_SOURCE')
    for (const entry of this.dirs.values()) {
      const actual = inspect(entry.handle)
      if (
        actual.id !== entry.info.id ||
        actual.volume !== entry.info.volume ||
        actual.canonical !== entry.info.canonical
      )
        deny('WORKSPACE_MISMATCH')
    }
  }
  entries(relative: string) {
    const dir = this.target(relative, true),
      before = inspect(dir.handle),
      n = api(),
      buffer = Buffer.alloc(65536)
    const entries: {
      name: string
      id: string
      size: string
      mtime: string
      attrs: number
      tag: number
    }[] = []
    let first = true
    for (;;) {
      this.check()
      if (!n.info(dir.handle, first ? 20 : 19, buffer, buffer.length)) {
        if (n.error() === 18) break
        deny('BROKER_IO_ERROR')
      }
      first = false
      let offset = 0
      for (;;) {
        const next = buffer.readUInt32LE(offset),
          length = buffer.readUInt32LE(offset + 60)
        if (length % 2 || offset + 88 + length > buffer.length) deny('BROKER_IO_ERROR')
        const entryName = buffer.subarray(offset + 88, offset + 88 + length).toString('utf16le')
        if (entryName !== '.' && entryName !== '..')
          entries.push({
            name: entryName,
            id: buffer.subarray(offset + 72, offset + 88).toString('hex'),
            size: buffer.readBigInt64LE(offset + 40).toString(),
            mtime: buffer.readBigInt64LE(offset + 24).toString(),
            attrs: buffer.readUInt32LE(offset + 56),
            tag: buffer.readUInt32LE(offset + 68)
          })
        if (entries.length > 4096) deny('RESOURCE_LIMIT')
        if (!next) break
        if (next < 88 || offset + next >= buffer.length) deny('BROKER_IO_ERROR')
        offset += next
      }
    }
    if (inspect(dir.handle).revision !== before.revision) deny('STALE_SOURCE')
    return { identity: before, entries }
  }
  close() {
    for (const h of this.handles.reverse()) api().close(h)
    this.handles = []
    this.dirs.clear()
    this.witnessed = []
  }
  proofs(discovery = false): HandleProof[] {
    return this.witnessed.map(({ handle, info }) => ({
      address: koffi.address(handle),
      identity: info,
      revision:
        !info.directory ||
        (discovery &&
          (info.canonical === this.root.canonical ||
            info.canonical.startsWith(this.root.canonical + '\\')))
    }))
  }
}
