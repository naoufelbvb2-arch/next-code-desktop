// @vitest-environment node
import { it, expect } from 'vitest'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { wireVectors } from '../fixtures/wire'
import { decodeLine } from '../../contracts/jsonl'

it('independent Python fixture peer and TypeScript agree on every positive/negative schema vector', async () => {
  const child = spawn('python', ['-I', '-B', resolve('tests/fixtures/protocol_peer.py')], {
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true
  })
  let output = '',
    diagnostic = ''
  child.stdout.setEncoding('utf8')
  child.stdout.on('data', (chunk) => {
    output += chunk
    if (output.length > 65536) child.kill()
  })
  child.stderr.setEncoding('utf8')
  child.stderr.on('data', (chunk) => {
    diagnostic += chunk
    if (diagnostic.length > 4096) child.kill()
  })
  const completion = new Promise<void>((done, reject) => {
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error('Isolated schema peer deadline'))
    }, 10000)
    child.once('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.once('exit', (code) => {
      clearTimeout(timer)
      code === 0 ? done() : reject(new Error('Isolated schema peer failed'))
    })
  })
  child.stdin.end(
    wireVectors.map((v) => JSON.stringify({ hex: v.bytes.toString('hex') })).join('\n') + '\n'
  )
  await completion
  expect(diagnostic).toBe('')
  const results = output
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line).valid)
  expect(results).toHaveLength(wireVectors.length)
  wireVectors.forEach((v, i) => {
    let ts = true
    try {
      decodeLine(v.bytes)
    } catch {
      ts = false
    }
    expect({ ts, python: results[i] }, v.name).toEqual({ ts: v.valid, python: v.valid })
  })
}, 15000)
