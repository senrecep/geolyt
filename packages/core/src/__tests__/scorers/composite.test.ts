import { describe, expect, it } from 'bun:test'
import { computeCompositeScore } from '../../scorers/composite.js'

describe('computeCompositeScore', () => {
  it('computes a weighted composite between 0 and 100', () => {
    const result = computeCompositeScore({
      aiCitability: 80,
      technicalFoundation: 70,
      structuredData: 60,
      platformOptimization: 50,
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.composite).toBeGreaterThan(0)
      expect(result.value.composite).toBeLessThanOrEqual(100)
    }
  })

  it('treats missing brandAuthority and contentQuality as zero', () => {
    const result = computeCompositeScore({
      aiCitability: 100,
      technicalFoundation: 100,
      structuredData: 100,
      platformOptimization: 100,
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.brandAuthority).toBe(0)
      expect(result.value.contentQuality).toBe(0)
    }
  })
})
