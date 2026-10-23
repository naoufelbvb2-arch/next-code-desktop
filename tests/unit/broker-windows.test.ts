// @vitest-environment node
import { test, expect } from 'vitest'
import {
  mkdirSync,
  mkdtempSync,
  writeFileSync,
  renameSync,
  openSync,
  closeSync,
  symlinkSync,
  readFileSync,
  linkSync,
  utimesSync
} from 'node:fs'
import { resolve, join } from 'node:path'
import koffi from 'koffi'
import { WindowsTree } from '../../electron/main/broker/windows-files'
import { screen, excerpt } from '../../electron/main/broker/policy'
import { BrokerPool } from '../../electron/main/broker/pool'
import { workerFixture } from '../fixtures/broker'

function fixture() {
  mkdirSync('.test-profiles', { recursive: true })
  const base = mkdtempSync(resolve('.test-profiles', 'p6-native-')),
    root = join(base, 'project')
  mkdirSync(root)
  mkdirSync(join(root, 'src'))
  writeFileSync(join(root, 'src', 'note.custom'), 'Atlas\r\nsafe text\n')
  return { base, root, file: join(root, 'src', 'note.custom') }
}
test('P6-W01 actual NTFS handle chain, identity, capture and same-byte normalized excerpt', () => {
  const f = fixture(),
    tree = new WindowsTree(f.root)
  try {
    expect(tree.key).toMatch(/^win32-v1_[a-f\d]{64}$/)
    const value = tree.capture('src/note.custom')
    expect(value.identity.mtimeNs).toMatch(/^\d{16,}$/)
    expect(excerpt(screen(value.bytes), 1, 2)).toMatchObject({
      content: 'Atlas\nsafe text\n',
      end_line: 2,
      truncated: false
    })
    expect(tree.entries('src').entries.map((e) => e.name)).toEqual(['note.custom'])
  } finally {
    tree.close()
  }
})
test('P6-W02 held native ancestor and leaf reject rename/replacement and new writers', () => {
  const f = fixture(),
    tree = new WindowsTree(f.root)
  try {
    tree.capture('src/note.custom')
    expect(() => renameSync(join(f.root, 'src'), join(f.root, 'moved'))).toThrow()
    expect(() => renameSync(f.root, join(f.base, 'replaced'))).toThrow()
    expect(() => writeFileSync(f.file, 'changed')).toThrow()
  } finally {
    tree.close()
  }
  expect(readFileSync(f.file, 'utf8')).toContain('Atlas')
})
test('P6-W03 pre-existing writable handle makes native capture fail closed', () => {
  const f = fixture(),
    writer = openSync(f.file, 'r+'),
    tree = new WindowsTree(f.root)
  try {
    expect(() => tree.capture('src/note.custom')).toThrow()
  } finally {
    tree.close()
    closeSync(writer)
  }
})
test('P6-W04 real junction is refused, including a target inside the same project', () => {
  const f = fixture()
  symlinkSync(join(f.root, 'src'), join(f.root, 'redirect'), 'junction')
  const tree = new WindowsTree(f.root)
  try {
    expect(() => tree.capture('redirect/note.custom')).toThrow()
  } finally {
    tree.close()
  }
})
test('P6-W05 strict native registration identity rejects a replaced project directory', () => {
  const f = fixture(),
    tree = new WindowsTree(f.root),
    key = tree.key
  tree.close()
  renameSync(f.root, join(f.base, 'original'))
  mkdirSync(f.root)
  expect(() => new WindowsTree(f.root, key)).toThrow('WORKSPACE_MISMATCH')
})
test('P6-W06 previously writable mapped view after original handle closes must not permit a capture', () => {
  const f = fixture(),
    k = koffi.load('kernel32.dll')
  const open = k.func(
    'void * __stdcall CreateFileW(str16 path,uint32 access,uint32 share,void *sa,uint32 disposition,uint32 flags,void *templateFile)'
  )
  const close = k.func('int32 __stdcall CloseHandle(void *h)')
  const mapping = k.func(
    'void * __stdcall CreateFileMappingW(void *file,void *sa,uint32 protect,uint32 maxHigh,uint32 maxLow,void *name)'
  )
  const view = k.func(
    'void * __stdcall MapViewOfFile(void *mapping,uint32 access,uint32 high,uint32 low,size_t length)'
  )
  const unmap = k.func('int32 __stdcall UnmapViewOfFile(void *address)')
  const file = open(f.file, 0xc0000000, 7, null, 3, 0, null)
  const section = mapping(file, null, 4, 0, 0, null),
    address = view(section, 2, 0, 0, 0)
  expect(address).toBeTruthy()
  close(file)
  const tree = new WindowsTree(f.root)
  try {
    expect(() => tree.capture('src/note.custom')).toThrow()
  } finally {
    tree.close()
    unmap(address)
    close(section)
  }
})
test('P6-W07 outside-root junction and ordinary hard-link alias never release bytes', () => {
  const f = fixture(),
    outside = join(f.base, 'outside')
  mkdirSync(outside)
  writeFileSync(join(outside, 'canary.txt'), 'Outside synthetic canary')
  symlinkSync(outside, join(f.root, 'redirect'), 'junction')
  linkSync(f.file, join(f.root, 'alias.txt'))
  const tree = new WindowsTree(f.root)
  try {
    expect(() => tree.capture('redirect/canary.txt')).toThrow()
    expect(() => tree.capture('alias.txt')).toThrow()
  } finally {
    tree.close()
  }
})
test('P6-W08 full precise expected mtime and post-capture metadata mutation are rejected', () => {
  const f = fixture(),
    tree = new WindowsTree(f.root)
  try {
    const captured = tree.capture('src/note.custom')
    expect(() =>
      tree.capture('src/note.custom', (BigInt(captured.identity.mtimeNs) + 1n).toString())
    ).toThrow('STALE_SOURCE')
    try {
      utimesSync(f.file, new Date(), new Date(1000000000000))
    } catch {}
    // Attribute-only writes can be allowed by Windows sharing rules. If one is
    // possible, the exact same production metadata check must invalidate it.
    const changed = (() => {
      try {
        tree.verify(captured.handle, captured.identity)
        return false
      } catch {
        return true
      }
    })()
    if (changed)
      expect(() => tree.verify(captured.handle, captured.identity)).toThrow('STALE_SOURCE')
    else expect(() => writeFileSync(f.file, 'changed')).toThrow()
  } finally {
    tree.close()
  }
})

test('P6-W09 actual separate worker pins ancestors and exact capture against same-length writer/mtime restoration and directory replacement', async () => {
  const f = fixture(),
    pool = new BrokerPool(await workerFixture())
  try {
    await pool.run(
      'race',
      { action: 'read', root: f.root, path: 'src/note.custom', start: 1, end: 2 },
      async (result) => {
        const attempts = await Promise.allSettled(
          Array.from({ length: 10 }, async () => {
            expect(() => renameSync(join(f.root, 'src'), join(f.root, 'swapped'))).toThrow()
            expect(() => writeFileSync(f.file, 'XXXXXXXXXXXXXXXXX')).toThrow()
            expect(() => {
              const h = openSync(f.file, 'r+')
              try {
                utimesSync(f.file, new Date(), new Date())
              } finally {
                closeSync(h)
              }
            }).toThrow()
          })
        )
        expect(attempts.every((a) => a.status === 'fulfilled')).toBe(true)
        expect(result.excerpt?.content).toBe('Atlas\nsafe text\n')
      }
    )
  } finally {
    pool.close()
  }
})

test('P6-W10 actual symbolic link is denied when unprivileged Windows link creation is available', (context) => {
  const f = fixture()
  try {
    symlinkSync(f.file, join(f.root, 'link.txt'), 'file')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EPERM')
      context.skip(true, 'Unprivileged file symlink creation unavailable; no Administrator changes')
    throw error
  }
  const tree = new WindowsTree(f.root)
  try {
    expect(() => tree.capture('link.txt')).toThrow()
  } finally {
    tree.close()
  }
})

test('P6-W11 actual long-name identity accepts ASCII case and refuses an available Windows short alias', (context) => {
  const f = fixture(),
    filename = join(f.root, 'Long ordinary filename.custom')
  writeFileSync(filename, 'safe\n')
  const tree = new WindowsTree(f.root)
  try {
    expect(screen(tree.capture('LONG ORDINARY FILENAME.CUSTOM').bytes)).toBe('safe\n')
    const k = koffi.load('kernel32.dll'),
      short = k.func(
        'uint32 __stdcall GetShortPathNameW(str16 path,_Out_ void *buffer,uint32 length)'
      ),
      buffer = Buffer.alloc(8192)
    const n = short(filename, buffer, 4096),
      alias = buffer
        .subarray(0, n * 2)
        .toString('utf16le')
        .split('\\')
        .at(-1)!
    if (!n || alias.toLowerCase() === 'long ordinary filename.custom')
      context.skip(true, 'NTFS 8.3 alias not generated on this volume')
    expect(() => tree.capture(alias)).toThrow()
  } finally {
    tree.close()
  }
})

test('P6-W12 borrowed Main verification uses real worker-owned handles and cannot outlive their native lease', async () => {
  const f = fixture(),
    pool = new BrokerPool(await workerFixture())
  let retained!: () => void
  try {
    await pool.run(
      'lease',
      { action: 'read', root: f.root, path: 'src/note.custom', start: 1, end: 1 },
      (result, verify) => {
        verify()
        retained = verify
        expect(result.proofs?.every((proof) => typeof proof.address === 'bigint')).toBe(true)
        expect(result.excerpt?.content).toBe('Atlas\n')
      }
    )
    expect(retained).toThrow('RESOURCE_LIMIT')
  } finally {
    pool.close()
  }
})
