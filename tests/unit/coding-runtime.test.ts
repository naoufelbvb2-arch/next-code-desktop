// @vitest-environment node
import { test, expect } from 'vitest'
import {
  mkdirSync,
  mkdtempSync,
  copyFileSync,
  readFileSync,
  appendFileSync,
  writeFileSync
} from 'node:fs'
import { resolve, join } from 'node:path'
import { runtimeFixture } from '../fixtures/supervision'
import {
  verifyCodingRuntime,
  requireVerifiedCoding,
  TESTED_ENGINE_COMMIT,
  type VerifiedCodingRuntime
} from '../../electron/main/coding/gate'

test('P7-G01 exact tested engine is verified with pinned sources/Git and a credential-free narrow environment', async () => {
  const runtime = await runtimeFixture()
  const coding = await verifyCodingRuntime(runtime, resolve('bridge'), {
    engineRoot: resolve('../next code'),
    sitePackages: resolve('../next code/.venv/Lib/site-packages')
  })
  expect(coding.engineCommit).toBe(TESTED_ENGINE_COMMIT)
  expect(() => requireVerifiedCoding(coding)).not.toThrow()
  const launch = coding.launch()
  expect(launch.env.DEEPSEEK_API_KEY).toBeUndefined()
  expect(launch.env.PYTHONPATH).toBeUndefined()
  expect(launch.env.PATH.split(';')).toHaveLength(2)
  expect(() => requireVerifiedCoding({ ...coding } as VerifiedCodingRuntime)).toThrow(
    'RUNTIME_NOT_READY'
  )
}, 10000)

test('P7-G02 changed Desktop bridge bytes cannot launch after verification; original sources stay untouched', async () => {
  mkdirSync('.test-profiles', { recursive: true })
  const directory = mkdtempSync(resolve('.test-profiles', 'p7-runtime-'))
  const manifest = JSON.parse(readFileSync('bridge/coding-compatibility.json', 'utf8'))
  for (const file of ['coding-compatibility.json', ...Object.keys(manifest.bridgeFiles)])
    copyFileSync(resolve('bridge', file), join(directory, file))
  const coding = await verifyCodingRuntime(await runtimeFixture(), directory, {
    engineRoot: resolve('../next code'),
    sitePackages: resolve('../next code/.venv/Lib/site-packages')
  })
  appendFileSync(join(directory, 'coding_bridge.py'), '\n# Synthetic tamper test\n')
  expect(() => coding.launch()).toThrow('RUNTIME_NOT_READY')
}, 10000)

test('P7-G03 wrong Git identity and a fabricated source-only capability cannot enable coding', async () => {
  mkdirSync('.test-profiles', { recursive: true })
  const directory = mkdtempSync(resolve('.test-profiles', 'p7-untrusted-engine-'))
  mkdirSync(join(directory, '.git'))
  writeFileSync(join(directory, '.git/HEAD'), '0'.repeat(40))
  await expect(
    verifyCodingRuntime(await runtimeFixture(), resolve('bridge'), {
      engineRoot: directory,
      sitePackages: resolve('../next code/.venv/Lib/site-packages')
    })
  ).rejects.toThrow()
}, 10000)

test('P8-G01 missing verified observer capability denies event integration before launch', async () => {
  mkdirSync('.test-profiles', { recursive: true })
  const directory = mkdtempSync(resolve('.test-profiles', 'p8-no-observer-'))
  const manifest = JSON.parse(readFileSync('bridge/coding-compatibility.json', 'utf8'))
  delete manifest.verifiedObserver
  writeFileSync(join(directory, 'coding-compatibility.json'), JSON.stringify(manifest))
  await expect(
    verifyCodingRuntime(await runtimeFixture(), directory, {
      engineRoot: resolve('../next code'),
      sitePackages: resolve('../next code/.venv/Lib/site-packages')
    })
  ).rejects.toThrow('RUNTIME_NOT_READY')
}, 10000)
