import { describe, expect, it } from 'bun:test'
import { calculateCacheHitRate, estimateCost } from '../usage.js'

describe('estimateCost', () => {
  it('costs less than $0.10 for a typical cached audit synthesis', () => {
    const usage = {
      promptTokens: 6_000,
      completionTokens: 800,
      cachedPromptTokens: 5_500,
    }

    expect(estimateCost(usage)).toBeLessThan(0.1)
  })

  it('returns zero when no tokens are used', () => {
    const usage = {
      promptTokens: 0,
      completionTokens: 0,
      cachedPromptTokens: 0,
    }

    expect(estimateCost(usage)).toBe(0)
  })

  it('treats cached tokens as cheaper than uncached tokens', () => {
    const cached = {
      promptTokens: 10_000,
      completionTokens: 0,
      cachedPromptTokens: 10_000,
    }
    const uncached = {
      promptTokens: 10_000,
      completionTokens: 0,
      cachedPromptTokens: 0,
    }

    expect(estimateCost(cached)).toBeLessThan(estimateCost(uncached))
  })
})

describe('calculateCacheHitRate', () => {
  it('returns 0 when there are no prompt tokens', () => {
    expect(
      calculateCacheHitRate({
        promptTokens: 0,
        completionTokens: 100,
        cachedPromptTokens: 0,
      }),
    ).toBe(0)
  })

  it('returns 1 when all prompt tokens are cached', () => {
    expect(
      calculateCacheHitRate({
        promptTokens: 1_000,
        completionTokens: 100,
        cachedPromptTokens: 1_000,
      }),
    ).toBe(1)
  })

  it('returns the cached ratio for partial cache hits', () => {
    expect(
      calculateCacheHitRate({
        promptTokens: 1_000,
        completionTokens: 100,
        cachedPromptTokens: 800,
      }),
    ).toBe(0.8)
  })
})
