import { describe, expect, it } from 'vitest'
import { isAllowedDocument, isAllowedLocalAsset } from '../../electron/main/window-security'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

describe('document navigation boundary', () => {
  it('limits local assets to the decoded renderer root, rejecting traversal and encoded separators', () => {
    const entry = pathToFileURL(resolve('out/renderer/index.html')).href
    const inside = new URL('./assets/app.js', entry).href
    expect(isAllowedLocalAsset(inside, entry)).toBe(true)
    for (const candidate of [
      new URL('../package.json', entry).href,
      new URL('./%2e%2e/private.txt', entry).href,
      new URL('./assets/%2f..%2fprivate.txt', entry).href,
      inside + '?path=outside',
      'file://other-host/private.txt',
      'https://example.com'
    ])
      expect(isAllowedLocalAsset(candidate, entry)).toBe(false)
  })
  it('permits only the same entry document and local anchor', () => {
    const entry = 'file:///C:/example/out/renderer/index.html'
    expect(isAllowedDocument(entry + '#workspace', entry)).toBe(true)
    for (const url of [
      'https://example.com',
      'file:///C:/example/private.txt',
      'javascript:alert(1)',
      entry + '?fixture=true',
      'invalid'
    ])
      expect(isAllowedDocument(url, entry)).toBe(false)
  })
  it('does not admit another localhost origin or path in development', () => {
    const entry = 'http://127.0.0.1:5173/'
    expect(isAllowedDocument(entry, entry)).toBe(true)
    expect(isAllowedDocument('http://127.0.0.1:5174/', entry)).toBe(false)
    expect(isAllowedDocument('http://127.0.0.1:5173/other', entry)).toBe(false)
  })
})
