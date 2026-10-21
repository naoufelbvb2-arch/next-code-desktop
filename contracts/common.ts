import { z } from 'zod'

export const ID = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/)
export const Cursor = z.string().regex(/^[\x21-\x7e]{1,128}$/)
export const Timestamp = z.iso.datetime({ offset: true })
export const UInt = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER)
export const PositiveInt = UInt.min(1)
export const object = z.strictObject
export const bytes = (text: string) => new TextEncoder().encode(text).byteLength

export function validUnicode(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const n = text.charCodeAt(i)
    if (n >= 0xd800 && n <= 0xdbff) {
      const next = text.charCodeAt(++i)
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false
    } else if (n >= 0xdc00 && n <= 0xdfff) return false
  }
  return true
}

export function text(max: number, min = 0) {
  return z
    .string()
    .max(max * 2)
    .refine(validUnicode)
    .refine((value) => {
      let length = 0
      for (const _point of value) {
        void _point
        if (++length > max) return false
      }
      return length >= min
    })
}

// Bound before schema traversal; reject classes, getters, cycles and exotic
// structured-clone objects. No validation detail is returned to an untrusted UI.
export function assertJsonValue(value: unknown, maxBytes = 262144): void {
  let nodes = 0
  let measuredBytes = 0
  const measure = (amount: number) => {
    measuredBytes += amount
    if (measuredBytes > maxBytes) throw new Error('RESOURCE_LIMIT')
  }
  const ancestors = new Set<object>()
  const walk = (item: unknown, depth: number): void => {
    if (++nodes > 20000 || depth > 32) throw new Error('RESOURCE_LIMIT')
    if (item === null || typeof item === 'boolean') {
      measure(bytes(JSON.stringify(item)))
      return
    }
    if (typeof item === 'string') {
      if (item.length > maxBytes || !validUnicode(item)) throw new Error('BAD_INPUT')
      measure(bytes(JSON.stringify(item)))
      return
    }
    if (typeof item === 'number' && Number.isFinite(item)) {
      measure(bytes(JSON.stringify(item)))
      return
    }
    if (typeof item !== 'object' || ancestors.has(item)) throw new Error('BAD_INPUT')
    const proto = Object.getPrototypeOf(item)
    if (!Array.isArray(item) && proto !== null && Object.getPrototypeOf(proto) !== null)
      throw new Error('BAD_INPUT')
    if (
      Array.isArray(item) &&
      (!Array.isArray(proto) || Object.getPrototypeOf(Object.getPrototypeOf(proto)) !== null)
    )
      throw new Error('BAD_INPUT')
    ancestors.add(item)
    measure(2)
    const descriptors = Object.getOwnPropertyDescriptors(item)
    let fields = 0
    for (const key of Reflect.ownKeys(descriptors)) {
      if (typeof key !== 'string') throw new Error('BAD_INPUT')
      const descriptor = descriptors[key]
      if (!('value' in descriptor)) throw new Error('BAD_INPUT')
      if (Array.isArray(item) && key === 'length') continue
      if (!descriptor.enumerable || !validUnicode(key)) throw new Error('BAD_INPUT')
      if (Array.isArray(item) && !/^(0|[1-9][0-9]*)$/.test(key)) throw new Error('BAD_INPUT')
      if (key.length > maxBytes) throw new Error('RESOURCE_LIMIT')
      if (fields++) measure(1)
      if (!Array.isArray(item)) measure(bytes(JSON.stringify(key)) + 1)
      walk(descriptor.value, depth + 1)
    }
    if (Array.isArray(item))
      for (let i = 0; i < item.length; i++) if (!(i in item)) throw new Error('BAD_INPUT')
    ancestors.delete(item)
  }
  walk(value, 0)
}

export const RelativePath = text(1024, 1).refine((value) => {
  if (value === '.') return true
  return (
    !/^[\\/]|[\\:\x00-\x1f]|[<>"|?*]/.test(value) &&
    value
      .split('/')
      .every((part) => part !== '..' && part !== '.' && part !== '' && !/[ .]$/.test(part))
  )
})
export const FilePath = RelativePath.refine((value) => value !== '.')
export const WindowsWorkspace = text(1024, 1).refine(
  (value) =>
    /^[A-Za-z]:[\\/]/.test(value) &&
    !/[\x00-\x1f]/.test(value) &&
    !value.split(/[\\/]/).includes('..')
)
