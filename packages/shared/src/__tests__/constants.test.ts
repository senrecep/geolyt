import { describe, expect, it } from 'bun:test'
import { AI_CRAWLERS, CRAWLER_TIER_WEIGHTS } from '../constants/crawlers.js'
import { CITABILITY_WEIGHTS, GEO_COMPOSITE_WEIGHTS } from '../constants/weights.js'

function sum(values: Record<string, number>): number {
  return Object.values(values).reduce((a, b) => a + b, 0)
}

describe('crawler constants', () => {
  it('defines 14 AI crawlers', () => {
    expect(AI_CRAWLERS).toHaveLength(14)
  })

  it('uses only tiers 1, 2 and 3', () => {
    for (const crawler of AI_CRAWLERS) {
      expect([1, 2, 3]).toContain(crawler.tier)
    }
  })

  it('tier weights sum to 1', () => {
    expect(sum(CRAWLER_TIER_WEIGHTS)).toBeCloseTo(1, 6)
  })
})

describe('weight constants', () => {
  it('citability weights sum to 1', () => {
    expect(sum(CITABILITY_WEIGHTS)).toBeCloseTo(1, 6)
  })

  it('GEO composite weights sum to 1', () => {
    expect(sum(GEO_COMPOSITE_WEIGHTS)).toBeCloseTo(1, 6)
  })
})
