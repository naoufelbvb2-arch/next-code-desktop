import { describe, expect, it } from 'vitest'
import { fitLayout } from '../../renderer/state/layout'

describe('NCD-01 protected-center fit policy', () => {
  it('protects the center at a fractional Windows DPI viewport width', () => {
    const result = fitLayout(999.6, false, true, 360)
    expect(result.dock).toBe(323)
    expect(999.6 - result.sidebar - result.dock - 32).toBeGreaterThanOrEqual(580)
  })
  it.each([
    [1920, 256, 360, 1272],
    [1366, 256, 360, 718],
    [1100, 64, 360, 644],
    [1000, 64, 324, 580]
  ])('fits %ipx viewport without reducing center below 580', (viewport, sidebar, dock, center) => {
    const result = fitLayout(viewport, false, true, 360)
    expect(result).toMatchObject({ sidebar, dock, dockVisible: true })
    expect(viewport - sidebar - dock - 32).toBe(center)
  })
  it('restores the actual Sidebar preference after closing Dock', () => {
    expect(fitLayout(1100, false, true, 360).compact).toBe(true)
    expect(fitLayout(1100, false, false, 360).sidebar).toBe(256)
    expect(fitLayout(1920, true, false, 360).sidebar).toBe(64)
  })
  it('hides panels when even the rail and minimum panel cannot fit', () => {
    expect(fitLayout(980, false, true, 360)).toMatchObject({
      dockVisible: false,
      sidebar: 256,
      dock: 0
    })
  })
  it('clamps global preference to 320–480 without rewriting it', () => {
    expect(fitLayout(1920, false, true, 900).dock).toBe(480)
    expect(fitLayout(1920, false, true, 100).dock).toBe(320)
  })
})
