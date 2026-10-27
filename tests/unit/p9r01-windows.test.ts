// @vitest-environment node
import { test, expect, vi } from 'vitest'
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import koffi from 'koffi'
import { WindowsTree } from '../../electron/main/broker/windows-files'
import { prepare } from '../../electron/main/broker/work'
import { screen } from '../../electron/main/broker/policy'

const results: unknown[] = []
const run = process.env.NCD_R01_RUN_ID ?? 'manual-' + Date.now()
function record(value: unknown) {
  results.push(value)
  writeFileSync(`.cache/p9r01-native-${run}.json`, JSON.stringify(results, null, 2) + '\n')
}
function fixture() {
  mkdirSync('.test-profiles', { recursive: true })
  mkdirSync('.cache', { recursive: true })
  const base = mkdtempSync(resolve('.test-profiles', 'p9r01-native-'))
  const root = join(base, 'project')
  mkdirSync(root)
  writeFileSync(join(root, 'note.custom'), 'R01 safe capture\n')
  return { base, root }
}
const k = koffi.load('kernel32.dll')
const close = k.func('int32 __stdcall CloseHandle(void *handle)')
const error = k.func('uint32 __stdcall GetLastError()')
const open = k.func(
  'void * __stdcall CreateFileW(str16 name,uint32 access,uint32 share,void *security,uint32 creation,uint32 flags,void *template)'
)
const valid = (h: unknown) => !!h && koffi.address(h) !== 0xffffffffffffffffn

test('R01-W01 read-only native token privilege/elevation inventory contains no identities or account data', () => {
  const a = koffi.load('advapi32.dll')
  const current = k.func('void * __stdcall GetCurrentProcess()')
  const token = a.func(
    'int32 __stdcall OpenProcessToken(void *process,uint32 access,_Out_ void **token)'
  )
  const info = a.func(
    'int32 __stdcall GetTokenInformation(void *token,int32 kind,_Out_ void *buffer,uint32 length,_Out_ uint32 *needed)'
  )
  const lookup = a.func(
    'int32 __stdcall LookupPrivilegeValueW(str16 system,str16 name,_Out_ void *luid)'
  )
  const handles = [null]
  expect(token(current(), 8, handles)).toBe(1)
  try {
    const data = Buffer.alloc(16384),
      needed = [0],
      elevation = Buffer.alloc(4)
    expect(info(handles[0], 3, data, data.length, needed)).toBe(1)
    expect(info(handles[0], 20, elevation, 4, needed)).toBe(1)
    const privileges: Record<string, { present: boolean; enabled: boolean }> = {}
    for (const name of ['SeCreateSymbolicLinkPrivilege', 'SeManageVolumePrivilege']) {
      const luid = Buffer.alloc(8)
      expect(lookup(null, name, luid)).toBe(1)
      let present = false,
        enabled = false
      for (let i = 0; i < data.readUInt32LE(0); i++)
        if (data.subarray(4 + 12 * i, 12 + 12 * i).equals(luid)) {
          present = true
          enabled = !!(data.readUInt32LE(12 + 12 * i) & 2)
        }
      privileges[name] = { present, enabled }
    }
    record({
      case: 'native-token-readonly',
      elevated: !!elevation.readUInt32LE(0),
      privileges,
      changed: false
    })
  } finally {
    close(handles[0])
  }
})

for (const directory of [false, true])
  test(`R01-W02 actual ${directory ? 'directory' : 'file'} symlink containment or explicit unavailable native privilege`, (context) => {
    const f = fixture()
    const create = k.func(
      'uint8 __stdcall CreateSymbolicLinkW(str16 link,str16 target,uint32 flags)'
    )
    const name = directory ? 'linkdir' : 'link.custom'
    const made = create(
      join(f.root, name),
      directory ? f.root : join(f.root, 'note.custom'),
      (directory ? 1 : 0) | 2
    )
    if (!made) {
      const windowsError = error()
      record({
        case: 'symlink',
        directory,
        created: false,
        windowsError,
        status: 'NOT_RUN',
        osChanges: false
      })
      context.skip(
        true,
        `Native symlink unavailable, Windows error ${windowsError}; no elevation/settings change`
      )
      return
    }
    const tree = new WindowsTree(f.root)
    try {
      expect(() => tree.capture(directory ? name + '/note.custom' : name)).toThrow()
      record({ case: 'symlink', directory, created: true, status: 'PASS', bytesReleased: 0 })
    } finally {
      tree.close()
    }
  })

test('R01-W03 real case-sensitive directory rejects ambiguous folded names or records unavailable native flag', (context) => {
  const f = fixture(),
    empty = join(f.base, 'empty-case-root')
  mkdirSync(empty)
  const h = open(empty, 0x100, 7, null, 3, 0x02000000, null)
  expect(valid(h)).toBe(true)
  const set = k.func(
    'int32 __stdcall SetFileInformationByHandle(void *h,int32 kind,void *data,uint32 size)'
  )
  const flags = Buffer.alloc(4)
  flags.writeUInt32LE(1)
  const enabled = set(h, 23, flags, 4),
    windowsError = enabled ? 0 : error()
  close(h)
  if (!enabled) {
    record({
      case: 'case-sensitive-directory',
      enabled: false,
      windowsError,
      status: 'NOT_RUN',
      scope: 'new synthetic directory only'
    })
    context.skip(
      true,
      `Native per-directory case flag unavailable (${windowsError}); no WSL/global/admin changes`
    )
    return
  }
  writeFileSync(join(empty, 'Case.custom'), 'first\n')
  writeFileSync(join(empty, 'case.custom'), 'second\n')
  expect(statSync(join(empty, 'Case.custom'), { bigint: true }).ino).not.toBe(
    statSync(join(empty, 'case.custom'), { bigint: true }).ino
  )
  expect(() =>
    prepare(
      { action: 'discover', root: empty, path: '.', depth: 1 },
      Infinity,
      () => false,
      () => {}
    )
  ).toThrow('WORKSPACE_MISMATCH')
  record({
    case: 'case-sensitive-directory',
    enabled: true,
    distinctNativeObjects: true,
    ambiguousEnumerationDenied: true,
    status: 'PASS'
  })
})

test('R01-W04 native NFC/NFD objects remain distinct; decomposed selector is denied rather than normalized to another file', () => {
  const f = fixture(),
    nfc = 'caf\u00e9.custom',
    nfd = 'cafe\u0301.custom'
  writeFileSync(join(f.root, nfc), 'composed safe\n')
  writeFileSync(join(f.root, nfd), 'decomposed synthetic canary\n')
  expect(statSync(join(f.root, nfc), { bigint: true }).ino).not.toBe(
    statSync(join(f.root, nfd), { bigint: true }).ino
  )
  const tree = new WindowsTree(f.root)
  try {
    expect(screen(tree.capture(nfc).bytes)).toBe('composed safe\n')
    expect(() => tree.capture(nfd)).toThrow('NOT_AUTHORIZED')
    record({
      case: 'native-unicode-normalization',
      distinctNativeObjects: true,
      nfcRead: true,
      nfdDenied: true,
      wrongSubjectBytes: 0,
      status: 'PASS'
    })
  } finally {
    tree.close()
  }
})

test('R01-W05 actual native named pipe and NUL character device cannot be admitted as project selectors', () => {
  const f = fixture(),
    name = '\\\\.\\pipe\\ncd-r01-' + randomUUID()
  const pipe = k.func(
    'void * __stdcall CreateNamedPipeW(str16 name,uint32 mode,uint32 flags,uint32 instances,uint32 outSize,uint32 inSize,uint32 timeout,void *security)'
  )
  const type = k.func('uint32 __stdcall GetFileType(void *handle)')
  const ph = pipe(name, 3, 9, 1, 1024, 1024, 0, null),
    dh = open('NUL', 0x80000000, 3, null, 3, 0, null)
  expect(valid(ph)).toBe(true)
  expect(valid(dh)).toBe(true)
  const tree = new WindowsTree(f.root)
  try {
    expect(type(ph)).toBe(3)
    expect(type(dh)).toBe(2)
    expect(() => tree.capture(name)).toThrow('NOT_AUTHORIZED')
    expect(() => tree.capture('NUL')).toThrow('NOT_AUTHORIZED')
    record({
      case: 'native-pipe-device',
      pipeType: 3,
      deviceType: 2,
      selectorsDenied: true,
      bytesReleased: 0,
      status: 'PASS'
    })
  } finally {
    tree.close()
    close(ph)
    close(dh)
  }
})

test('R01-W06 actual AF_UNIX filesystem socket is denied while its owner remains alive', (context) => {
  const f = fixture(),
    path = join(f.root, 'fixture.sock')
  const w = koffi.load('ws2_32.dll')
  const start = w.func('int32 __stdcall WSAStartup(uint16 version,void *data)')
  const cleanup = w.func('int32 __stdcall WSACleanup()')
  const socket = w.func('intptr_t __stdcall socket(int32 af,int32 type,int32 protocol)')
  const bind = w.func('int32 __stdcall bind(intptr_t socket,void *address,int32 length)')
  const listen = w.func('int32 __stdcall listen(intptr_t socket,int32 backlog)')
  const end = w.func('int32 __stdcall closesocket(intptr_t socket)')
  const last = w.func('int32 __stdcall WSAGetLastError()')
  expect(start(0x202, Buffer.alloc(512))).toBe(0)
  const sock = socket(1, 1, 0)
  try {
    if (BigInt(sock) === -1n || BigInt(sock) === 0xffffffffffffffffn) {
      const windowsError = last()
      record({ case: 'native-af-unix', status: 'NOT_RUN', windowsError })
      context.skip(true, `Native Winsock AF_UNIX unavailable (${windowsError})`)
      return
    }
    const address = Buffer.alloc(110)
    expect(Buffer.byteLength(path)).toBeLessThan(108)
    address.writeUInt16LE(1)
    address.write(path, 2, 'utf8')
    expect(bind(sock, address, address.length)).toBe(0)
    expect(listen(sock, 1)).toBe(0)
    const tree = new WindowsTree(f.root)
    try {
      expect(() => tree.capture('fixture.sock')).toThrow()
    } finally {
      tree.close()
    }
    record({ case: 'native-af-unix', ownerAlive: true, status: 'PASS', bytesReleased: 0 })
  } finally {
    if (BigInt(sock) !== -1n && BigInt(sock) !== 0xffffffffffffffffn) end(sock)
    cleanup()
  }
})

test('R01-W07 production discover BigInt metadata boundary returns exact safe integers or null; UNIT fixture not native huge file', () => {
  const f = fixture(),
    target = WindowsTree.prototype.target
  for (const size of [
    0n,
    BigInt(Number.MAX_SAFE_INTEGER) - 1n,
    BigInt(Number.MAX_SAFE_INTEGER),
    BigInt(Number.MAX_SAFE_INTEGER) + 1n,
    18446744073709551615n
  ]) {
    const spy = vi.spyOn(WindowsTree.prototype, 'target').mockImplementation(function (
      this: WindowsTree,
      path,
      directory
    ) {
      const result = target.call(this, path, directory)
      if (!directory) result.info = { ...result.info, size: size.toString() }
      return result
    })
    try {
      const work = prepare(
        { action: 'discover', root: f.root, path: '.', depth: 1 },
        Infinity,
        () => false,
        () => {}
      )
      try {
        expect(work.result.entries?.[0].size_bytes).toBe(
          size > BigInt(Number.MAX_SAFE_INTEGER) ? null : Number(size)
        )
      } finally {
        work.close()
      }
    } finally {
      spy.mockRestore()
    }
  }
  expect(readFileSync(join(f.root, 'note.custom'), 'utf8')).toBe('R01 safe capture\n')
  record({
    case: 'BigInt-size-boundary',
    status: 'PASS',
    evidenceKind: 'UNIT_INJECTED_METADATA_WITH_REAL_DISCOVER_LOGIC',
    hugeFileCreated: false,
    nativeSizeClaim: false
  })
})

test('R01-W08 real Windows Shell Link targets a synthetic outside file but cannot release that target through the broker', () => {
  const f = fixture(),
    target = join(f.base, 'outside.custom'),
    shortcut = join(f.root, 'alias.lnk')
  writeFileSync(target, 'R01 outside link target canary\n')
  const literal = (value: string) => "'" + value.replaceAll("'", "''") + "'"
  const script =
    '$w=New-Object -ComObject WScript.Shell; $s=$w.CreateShortcut(' +
    literal(shortcut) +
    '); $s.TargetPath=' +
    literal(target) +
    '; $s.Save()'
  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    windowsHide: true,
    timeout: 10000,
    stdio: 'pipe'
  })
  expect(readFileSync(shortcut).readUInt32LE(0)).toBe(0x4c)
  const tree = new WindowsTree(f.root)
  try {
    expect(() => tree.capture('alias.lnk')).toThrow('SENSITIVE_CONTENT')
  } finally {
    tree.close()
  }
  record({
    case: 'native-shell-link',
    actualBinaryHeader: 76,
    targetOutsideSyntheticRoot: true,
    targetBytesReleased: 0,
    status: 'PASS'
  })
}, 15000)
