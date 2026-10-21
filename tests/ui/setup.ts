import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

beforeEach(() => vi.stubGlobal('innerWidth', 1366))
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
