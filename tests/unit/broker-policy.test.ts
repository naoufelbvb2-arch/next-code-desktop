// @vitest-environment node
import { test, expect } from 'vitest'
import { selector, sensitivePath, screen, excerpt, digest } from '../../electron/main/broker/policy'
import { validateWire } from '../../contracts/jsonl'

test.each([
  '../a',
  'a/../b',
  'a/./b',
  'a//b',
  '/absolute',
  'C:/a',
  'C:a',
  '\\\\server\\share',
  '\\\\?\\C:\\a',
  '\\Device\\Harddisk',
  'a\\b',
  'a:b',
  'file:stream',
  'con',
  'CON.txt',
  'aux',
  'nul.json',
  'COM1.ts',
  'LPT9.log',
  'com¹.txt',
  'a.',
  'a ',
  'a*',
  'a?',
  'a\0b',
  'a\u0001b',
  'a\u202eb',
  '\ud800',
  'e\u0301.txt',
  'a'.repeat(256),
  Array(33).fill('a').join('/'),
  'a'.repeat(250) + '/b'.repeat(400)
])('P6-PATH rejects unsafe selector %#', (value) => expect(() => selector(value)).toThrow())
test.each([
  'src/file.custom',
  'src/ملف.txt',
  'src/😀.txt',
  '%2e%2e/literal',
  Array(32).fill('a').join('/')
])('P6-PATH accepts literal bounded selector %#', (value) =>
  expect(selector(value).join('/')).toBe(value)
)
test('P6-PATH root marker only belongs to directory enumeration', () => {
  expect(selector('.', true)).toEqual([])
  expect(() => selector('.')).toThrow()
})
test.each([
  '.env',
  '.ENV.local',
  'nested/.git/config',
  'id_rsa',
  'id_ed25519',
  '.aws/credentials',
  'vault/secret.key',
  'config.pfx',
  'cert.pem',
  'jump.lnk',
  'browser/Cookies',
  'db/login data',
  'tokens/value',
  'keychains/keys',
  'file.p12'
])('P6-S1 denies sensitive path category %#', (value) => expect(sensitivePath(value)).toBe(true))
test('P6-S1 ordinary settings and unknown source extension remain eligible', () => {
  expect(sensitivePath('settings.json')).toBe(false)
  expect(sensitivePath('hello.unknown')).toBe(false)
})
test.each([
  () => Buffer.from('const key = "sk-' + 'A'.repeat(32) + '"'),
  () => Buffer.from('-----BEGIN OPENSSH PRIVATE KEY-----'),
  () => Buffer.from('Authorization: Bearer ' + 'aB09'.repeat(10)),
  () => Buffer.from('AWS key: ' + 'AKIA' + 'A'.repeat(16)),
  () => Buffer.from('const token = "ghp_' + 'a'.repeat(30) + '"'),
  () => Buffer.from('const api_key = "synthetic-credential-value"'),
  () => Buffer.from('{"password":"synthetic-password"}'),
  () => Buffer.from('postgres://user:synthetic-password@server/database'),
  () => Buffer.from('{"api\\u005fkey":"synthetic-credential-value"}'),
  () => Buffer.from('auth credential ' + 'A9bC3dE4fG5hJ6kL7mN8pQ2rS0tU1vW'),
  () => Buffer.from('safe\n' + ' '.repeat(65525) + 'api_key="synthetic-credential-value"\n')
])(
  'P6-S3 denies complete sensitive content, including escaped and cross-buffer material %#',
  (make) => expect(() => screen(make())).toThrow('SENSITIVE_CONTENT')
)
test.each([
  Buffer.from([0xff, 0xfe, 0x00]),
  Buffer.from([0xc0, 0xaf]),
  Buffer.from([0xff, 0xfe, 0x00, 0xd8]),
  Buffer.from('a\0b'),
  Buffer.from('hello\x1bdata')
])('P6-DECODE malformed/ambiguous/binary input fails closed %#', (bytes) =>
  expect(() => screen(bytes)).toThrow('SENSITIVE_CONTENT')
)
test('P6-DECODE strict UTF8 BOM and UTF16 LE/BE share the same normalized excerpt hash', () => {
  const text = 'Atlas\r\n😀\rsafe\n',
    expected = 'Atlas\n😀\nsafe\n'
  const le = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')]),
    be = Buffer.from(le).swap16()
  for (const bytes of [
    Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(text)]),
    le,
    be
  ]) {
    const decoded = screen(bytes),
      result = excerpt(decoded, 1, 3)
    expect(decoded).toBe(expected)
    expect(result.excerpt_sha256).toBe(digest(Buffer.from(expected)))
  }
})
test('P6-SCAN ordinary source/hash text is not a secret by entropy alone', () =>
  expect(screen(Buffer.from('const checksum = "' + '0123456789abcdef'.repeat(4) + '";'))).toContain(
    'checksum'
  ))
test('P6-LINES empty and wholly past EOF are denied; partial EOF reports real emitted bounds', () => {
  expect(() => excerpt('', 1, 1)).toThrow('RESOURCE_LIMIT')
  expect(() => excerpt('a\n', 2, 2)).toThrow('RESOURCE_LIMIT')
  expect(excerpt('a\nb\n', 1, 5)).toMatchObject({
    start_line: 1,
    end_line: 2,
    content: 'a\nb\n',
    truncated: true
  })
})
test('P6-LINES character limits retain whole non-BMP scalar lines', () => {
  expect(() => excerpt('abcd\n', 1, 1, 4)).toThrow('RESOURCE_LIMIT')
  expect(excerpt('😀\n😀\n', 1, 2, 3)).toMatchObject({
    content: '😀\n',
    end_line: 1,
    truncated: true
  })
  expect(() => excerpt('a\n', 1, 201)).toThrow('RESOURCE_LIMIT')
})
test('P6-SIZE bounded complete scanner accepts the exact 8MiB edge and denies overflow', () => {
  const text = screen(Buffer.alloc(8388608, 97))
  expect(text.length).toBe(8388608)
  expect(() => excerpt(text, 1, 1)).toThrow('RESOURCE_LIMIT')
  expect(() => screen(Buffer.alloc(8388609, 97))).toThrow('RESOURCE_LIMIT')
})

test('P6-WIRE numeric broker ranges and cursor lengths are rejected at the closed wire boundary', () => {
  const discover = {
    discussion_request_id: 'parent',
    directory: '.',
    max_depth: 1,
    limit: 100,
    cursor: null
  }
  const read = {
    discussion_request_id: 'parent',
    path: 'notes.custom',
    start_line: 1,
    end_line: 200,
    max_chars: 16384,
    expected_mtime_ns: null
  }
  const frame = (action: string, input: unknown) => ({
    version: 1,
    type: 'request',
    message_id: 'broker',
    correlation_id: null,
    payload: { action, input }
  })
  expect(() => validateWire(frame('project.discover', discover))).not.toThrow()
  expect(() => validateWire(frame('project.read', read))).not.toThrow()
  for (const change of [
    { max_depth: 0 },
    { max_depth: 4 },
    { limit: 0 },
    { limit: 101 },
    { cursor: 'a'.repeat(129) }
  ])
    expect(() => validateWire(frame('project.discover', { ...discover, ...change }))).toThrow()
  for (const change of [{ start_line: 0 }, { end_line: 201 }, { max_chars: 16385 }])
    expect(() => validateWire(frame('project.read', { ...read, ...change }))).toThrow()
})
