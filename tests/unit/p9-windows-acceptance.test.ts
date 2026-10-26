// @vitest-environment node
import { test, expect } from 'vitest'
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { Worker } from 'node:worker_threads'
import koffi from 'koffi'
import { WindowsTree } from '../../electron/main/broker/windows-files'
import { screen } from '../../electron/main/broker/policy'

const run = process.env.NCD_P9_RUN_ID ?? 'native-01'
if (!/^[a-zA-Z0-9_-]{1,64}$/.test(run)) throw new Error('Invalid test run identity')
const evidence: Record<string, unknown>[] = []
function record(value: Record<string, unknown>) {
  evidence.push(value)
  mkdirSync('.cache', { recursive: true })
  writeFileSync(`.cache/p9-native-${run}.json`, JSON.stringify({ run, evidence }, null, 2) + '\n')
}
function fixture() {
  mkdirSync('.test-profiles', { recursive: true })
  const directory = mkdtempSync(resolve('.test-profiles', 'p9-native-'))
  const root = join(directory, 'project'),
    file = join(root, 'ordinary.custom')
  mkdirSync(root)
  writeFileSync(file, 'P9 safe synthetic capture\n')
  return { directory, root, file }
}

for (const directory of [false, true])
  test(`P9-G6-01 native ${directory ? 'directory' : 'file'} symlink is never followed; missing OS privilege is NOT_RUN`, (context) => {
    const f = fixture(),
      lib = koffi.load('kernel32.dll')
    const create = lib.func(
      'uint8 __stdcall CreateSymbolicLinkW(str16 link,str16 target,uint32 flags)'
    )
    const lastError = lib.func('uint32 __stdcall GetLastError()')
    const name = directory ? 'linked-directory' : 'linked-file.custom'
    const created = create(join(f.root, name), directory ? f.root : f.file, (directory ? 1 : 0) | 2)
    const code = created ? 0 : lastError()
    if (!created) {
      record({
        case: 'symlink',
        kind: directory ? 'directory' : 'file',
        created: false,
        windowsError: code,
        verdict: 'NOT_RUN',
        reason: 'Actual link fixture unavailable; no Developer Mode/user-right/admin change made'
      })
      context.skip(
        true,
        `Native CreateSymbolicLinkW fixture unavailable (Windows error ${code}); not a containment PASS`
      )
      return
    }
    const tree = new WindowsTree(f.root)
    try {
      expect(() => tree.capture(directory ? name + '/ordinary.custom' : name)).toThrow()
      record({
        case: 'symlink',
        kind: directory ? 'directory' : 'file',
        created: true,
        verdict: 'PASS',
        bytesReleased: 0
      })
    } finally {
      tree.close()
    }
  })

test('P9-G6-02 actual NTFS ADS exists but production selector denies it without revealing its bytes', () => {
  const f = fixture(),
    canary = 'P9 synthetic ADS canary'
  writeFileSync(f.file + ':p9canary', canary)
  expect(readFileSync(f.file + ':p9canary', 'utf8')).toBe(canary)
  const tree = new WindowsTree(f.root)
  try {
    expect(() => tree.capture('ordinary.custom:p9canary')).toThrow()
    expect(screen(tree.capture('ordinary.custom').bytes)).toBe('P9 safe synthetic capture\n')
    record({ case: 'ADS', actualStreamCreated: true, verdict: 'PASS', forbiddenBytesReleased: 0 })
  } finally {
    tree.close()
  }
})

test('P9-G6-03 concurrent native writer/ancestor-swap thread cannot alter held captured bytes or redirect the root', async () => {
  const f = fixture(),
    tree = new WindowsTree(f.root)
  const captured = tree.capture('ordinary.custom')
  const start = performance.now()
  const worker = new Worker(
    `
    const { parentPort,workerData } = require('node:worker_threads')
    const fs = require('node:fs')
    let writeAccepted=0,swapAccepted=0,denied=0
    for(let n=0;n<200;n++) {
      try { fs.writeFileSync(workerData.file,'XXXXXXXXXXXXXXXXXXXXXXXXX'); writeAccepted++ } catch { denied++ }
      try { fs.renameSync(workerData.root,workerData.root+'-swapped');swapAccepted++ } catch { denied++ }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,1)
    }
    parentPort.postMessage({ writeAccepted,swapAccepted,denied })
  `,
    { eval: true, workerData: { file: f.file, root: f.root } }
  )
  try {
    const result = await new Promise<{
      writeAccepted: number
      swapAccepted: number
      denied: number
    }>((resolve, reject) => {
      worker.once('message', resolve)
      worker.once('error', reject)
    })
    tree.verify(captured.handle, captured.identity)
    expect(result).toEqual({ writeAccepted: 0, swapAccepted: 0, denied: 400 })
    expect(screen(captured.bytes)).toBe('P9 safe synthetic capture\n')
    record({
      case: 'concurrent-writer-root-swap',
      verdict: 'PASS',
      attempts: 400,
      ...result,
      elapsedMs: performance.now() - start
    })
  } finally {
    await worker.terminate()
    tree.close()
  }
}, 15000)
