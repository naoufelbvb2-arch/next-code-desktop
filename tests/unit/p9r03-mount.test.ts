// @vitest-environment node
import { test, expect } from 'vitest'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import koffi from 'koffi'
import { WindowsTree } from '../../electron/main/broker/windows-files'

test('R03-W01 authorized QA VM actual volume mount reparse is refused without releasing mounted bytes', (context) => {
  if (process.env.NCD_R03_AUTHORIZED_QA_VM !== 'disposable-volume-fixture') {
    context.skip(
      true,
      'Requires explicitly authorized disposable Windows QA VM and prepared NTFS volume'
    )
    return
  }
  const root = resolve('.test-profiles/p9r03-vm-security/project'),
    mount = resolve(root, 'volume-alias')
  expect(readFileSync(resolve(root, '../authorization.txt'), 'utf8').trim()).toBe(
    'OWNER AUTHORIZED DISPOSABLE WINDOWS QA VM'
  )
  const k = koffi.load('kernel32.dll'),
    open = k.func(
      'void * __stdcall CreateFileW(str16 n,uint32 a,uint32 s,void *p,uint32 c,uint32 f,void *t)'
    ),
    close = k.func('int32 __stdcall CloseHandle(void *h)'),
    ioctl = k.func(
      'int32 __stdcall DeviceIoControl(void *h,uint32 c,void *i,uint32 il,_Out_ void *o,uint32 ol,_Out_ uint32 *r,void *v)'
    )
  const h = open(mount, 0, 7, null, 3, 0x02200000, null)
  expect(!!h && koffi.address(h) !== 0xffffffffffffffffn).toBe(true)
  try {
    const b = Buffer.alloc(16384),
      returned = [0]
    expect(ioctl(h, 0x900a8, null, 0, b, b.length, returned, null)).toBe(1)
    expect(returned[0]).toBeGreaterThanOrEqual(16)
    expect(b.readUInt32LE(0)).toBe(0xa0000003)
    const offset = b.readUInt16LE(8),
      length = b.readUInt16LE(10)
    expect(16 + offset + length).toBeLessThanOrEqual(returned[0])
    // An ordinary directory junction has the same tag: require a real volume target.
    expect(b.subarray(16 + offset, 16 + offset + length).toString('utf16le')).toMatch(
      /^\\\?\?\\Volume\{[0-9a-f-]+\}\\$/i
    )
  } finally {
    close(h)
  }
  // Operator provisioned only this synthetic canary on the disposable volume.
  expect(readFileSync(resolve(mount, 'r03-canary.custom'), 'utf8')).toBe(
    'R03 SYNTHETIC VOLUME CANARY\n'
  )
  const tree = new WindowsTree(root)
  try {
    expect(() => tree.capture('volume-alias/r03-canary.custom')).toThrow()
  } finally {
    tree.close()
  }
  const run = process.env.NCD_R03_RUN_ID ?? 'manual-' + Date.now()
  expect(run).toMatch(/^[a-z0-9-]+$/i)
  writeFileSync(
    `.cache/p9r03-mount-${run}.json`,
    JSON.stringify(
      {
        status: 'PASS',
        nativeVolumeMountTag: true,
        nativeVolumeTarget: true,
        evidenceKind: 'ACTUAL_WINDOWS_NATIVE_MOUNT',
        brokerBytesReleased: 0,
        limitation:
          'Mounted descendant only; root identity/alias/TOCTOU are separate original tests'
      },
      null,
      2
    ) + '\n',
    { flag: 'wx' }
  )
})
